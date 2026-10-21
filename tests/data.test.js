// The committed data files: every curated city has a valid boundary and photo file,
// every photo has author, allowed licence, Commons page and a Wikimedia thumbnail.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT, read, listFiles } from './helpers.js';
import { validStates } from './helpers-data.js';
import { licenceCheck, validFocus } from '../scripts/lib/commons.js';
import { polygons, countPoints, pointInGeometry, bbox, bboxContains } from '../js/geo.js';

const json = (p) => JSON.parse(read(p));
const states = json('data/reference/states.json');
const curation = listFiles('data/curation', '.json');

test('states reference is complete and sourced', () => {
  assert.ok(validStates(states.states));
  assert.match(states.source.url, /^https:\/\/tigerweb\.geo\.census\.gov\//);
  assert.match(states.source.retrieved, /^\d{4}-\d{2}-\d{2}$/);
});

test('there is at least one curated city', () => {
  assert.ok(curation.length >= 1);
});

for (const file of curation) {
  const [, , stateCode, name] = file.split('/');
  const slug = name.slice(0, -5);
  const state = states.states.find((s) => s.code === stateCode);
  const c = json(file);

  test(`${stateCode}/${slug}: curation file`, () => {
    assert.ok(state, `state ${stateCode} exists in data/reference/states.json`);
    assert.match(slug, /^[a-z0-9]+(?:-[a-z0-9]+)*$/);
    assert.match(c.geoid, new RegExp(`^${state.fips}\\d{5}$`));
    assert.match(c.wikidata, /^Q\d+$/);
    for (const q of c.highlights || []) assert.match(q, /^Q\d+$/);
    if (c.hero) {
      assert.ok(c.hero.file && validFocus(c.hero.focus), 'hero file and focus');
      assert.match(c.hero.chosenOn, /^\d{4}-\d{2}-\d{2}$/);
    }
  });

  test(`${stateCode}/${slug}: boundary`, () => {
    const path = `data/boundaries/${stateCode}/${slug}.geojson`;
    assert.ok(existsSync(join(ROOT, path)), `${path} exists (run scripts/fetch-boundary.js ${stateCode})`);
    const b = json(path);
    assert.equal(b.properties.geoid, c.geoid);
    assert.ok(b.properties.basename);
    assert.ok(polygons(b.geometry).length >= 1);
    assert.ok(countPoints(b.geometry) >= 4);
    assert.ok(bboxContains(state.bbox, bbox(b.geometry), 0.05));
    assert.ok(pointInGeometry(b.properties.internalPoint, b.geometry));
    assert.match(b.properties.source.retrieved, /^\d{4}-\d{2}-\d{2}$/);
  });

  test(`${stateCode}/${slug}: photos`, () => {
    const path = `data/photos/${stateCode}/${slug}.json`;
    assert.ok(existsSync(join(ROOT, path)), `${path} exists (run scripts/fetch-photos.js ${stateCode})`);
    const p = json(path);
    assert.equal(p.city.qid, c.wikidata);
    const photos = [p.hero, ...p.highlights.map((h) => h.photo)].filter(Boolean);
    for (const ph of photos) {
      assert.ok(ph.author, `${ph.file}: author`);
      assert.ok(licenceCheck({ License: { value: ph.licenceCode } }).ok, `${ph.file}: licence ${ph.licenceCode}`);
      assert.match(ph.page, /^https:\/\/commons\.wikimedia\.org\/wiki\/File:/, `${ph.file}: Commons page`);
      assert.match(ph.src, /^https:\/\/(upload|thumb)\.wikimedia\.org\//, `${ph.file}: thumbnail host`);
      assert.doesNotMatch(ph.src, /utm_/);
      assert.ok(ph.width > 0 && ph.height > 0);
    }
    if (c.hero) {
      assert.equal(p.hero.file, c.hero.file, 'hero is the curated file');
      assert.deepEqual(p.hero.focus, c.hero.focus);
    }
    assert.deepEqual(p.highlights.map((h) => h.qid), c.highlights || []);
    for (const h of p.highlights) assert.ok(h.label && h.description, `${h.qid}: label and description`);
  });
}
