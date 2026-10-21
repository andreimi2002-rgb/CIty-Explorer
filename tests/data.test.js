// The committed data files: every place of a state has a boundary, a photo file and a city file;
// every fact follows the provenance rules; every photo has author, allowed licence and Commons page.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT, read, listFiles } from './helpers.js';
import { validStates } from './helpers-data.js';
import { licenceCheck, validFocus } from '../scripts/lib/commons.js';
import { polygons, countPoints, bbox, bboxContains } from '../js/geo.js';
import { FACT_LABEL_KEYS } from '../js/fact-labels.js';

const json = (p) => JSON.parse(read(p));
const states = json('data/reference/states.json');
const placeFiles = readdirSync(join(ROOT, 'data/reference')).filter((f) => /^places-[a-z]{2}\.json$/.test(f));

test('states reference is complete and sourced', () => {
  assert.ok(validStates(states.states));
  assert.match(states.source.url, /^https:\/\/tigerweb\.geo\.census\.gov\//);
});

test('curation files belong to known places and have valid manual choices', () => {
  for (const file of listFiles('data/curation', '.json')) {
    const [, , code, name] = file.split('/');
    const places = json(`data/reference/places-${code}.json`).places;
    const slug = name.slice(0, -5);
    assert.ok(places.some((p) => p.slug === slug), `${file}: unknown city`);
    const c = json(file);
    if (c.hero) {
      assert.ok(c.hero.file && validFocus(c.hero.focus), `${file}: hero file and focus`);
      assert.match(c.hero.chosenOn, /^\d{4}-\d{2}-\d{2}$/);
    }
    for (const q of c.highlights || []) assert.match(q, /^Q\d+$/);
  }
});

function checkPhoto(ph, where) {
  assert.ok(ph.author, `${where}: author`);
  assert.ok(licenceCheck({ License: { value: ph.licenceCode } }).ok, `${where}: licence ${ph.licenceCode}`);
  assert.match(ph.page, /^https:\/\/commons\.wikimedia\.org\/wiki\/File:/, `${where}: Commons page`);
  assert.match(ph.src, /^https:\/\/(upload|thumb)\.wikimedia\.org\//, `${where}: thumbnail host`);
  assert.doesNotMatch(ph.src, /utm_/);
}

function checkFacts(city, where) {
  for (const [key, f] of Object.entries(city.facts)) {
    assert.ok(FACT_LABEL_KEYS[key], `${where}: ${key} has a label`);
    if (f.value === null) {
      assert.ok(f.reason, `${where}: ${key} missing without reason`);
      continue;
    }
    assert.ok(['sourced', 'computed', 'estimated'].includes(f.level), `${where}: ${key} level`);
    if (f.level === 'sourced') assert.ok(city.sources[f.source], `${where}: ${key} source ${f.source}`);
    if (f.level === 'computed') {
      assert.ok(f.formula && f.inputs.length, `${where}: ${key} formula`);
      for (const i of f.inputs) assert.ok(i === 'referencePoint' || city.facts[i], `${where}: ${key} input ${i}`);
    }
    if (f.unit === 'USD') assert.ok(f.dollarYear && f.currency === 'USD', `${where}: ${key} dollar year`);
  }
  // Density only from population and land area of the same year.
  if (city.facts['density.2020'].inputs) assert.deepEqual(city.facts['density.2020'].inputs, ['population.census2020', 'area.land2020']);
  assert.deepEqual(city.facts['density.2025'].inputs, ['population.estimate2025', 'area.land2025']);
}

for (const pf of placeFiles) {
  const code = pf.slice(7, 9);
  const state = states.states.find((s) => s.code === code);
  const { places } = json(`data/reference/${pf}`);

  test(`${code}: every place has a valid boundary`, () => {
    for (const p of places) {
      const path = `data/boundaries/${code}/${p.slug}.geojson`;
      assert.ok(existsSync(join(ROOT, path)), `${path} (run scripts/fetch-boundary.js ${code})`);
      const b = json(path);
      assert.equal(b.properties.geoid, p.geoid, p.slug);
      assert.ok(polygons(b.geometry).length >= 1 && countPoints(b.geometry) >= 4, p.slug);
      assert.ok(bboxContains(state.bbox, bbox(b.geometry), 0.05), `${p.slug}: inside ${state.name}`);
    }
  });

  test(`${code}: photo files (where present) only hold checked photos`, () => {
    for (const p of places) {
      const path = `data/photos/${code}/${p.slug}.json`;
      if (!existsSync(join(ROOT, path))) continue;
      const ph = json(path);
      assert.equal(ph.city.qid, p.wikidata, p.slug);
      if (ph.hero) checkPhoto(ph.hero, `${p.slug} hero`);
      for (const h of ph.highlights) {
        checkPhoto(h.photo, `${p.slug} ${h.qid}`);
        assert.ok(h.label && h.description, `${p.slug} ${h.qid}: label and description`);
      }
    }
  });

  test(`${code}: city files follow the provenance rules`, () => {
    if (!existsSync(join(ROOT, `data/cities/${code}`))) return;
    for (const p of places) {
      const path = `data/cities/${code}/${p.slug}.json`;
      assert.ok(existsSync(join(ROOT, path)), `${path} (run scripts/build-cities.js ${code})`);
      const city = json(path);
      assert.equal(city.id.geoid, p.geoid);
      checkFacts(city, p.slug);
    }
  });
}
