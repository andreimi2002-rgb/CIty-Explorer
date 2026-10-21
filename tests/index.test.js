// Home-page index: built from the data files, and the committed data/index.json matches them.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { read, listFiles } from './helpers.js';
import { buildIndex } from '../scripts/lib/index.js';
import { parseCityPath } from '../js/route.js';

const states = [
  { code: 'ca', name: 'California' },
  { code: 'nv', name: 'Nevada' },
];
const boundary = (basename) => ({ properties: { basename } });
const photos = { city: { description: 'a city' }, hero: { src: 'big', srcSmall: 'small', width: 1920, height: 800, widthSmall: 960, heightSmall: 400, focus: [0.5, 0.5], author: 'A', licence: 'CC0', licenceUrl: null, page: 'p' } };

test('index groups cities by state, sorted by name, using the small hero photo', () => {
  const { index, problems } = buildIndex(
    [
      { state: 'nv', slug: 'reno', boundary: boundary('Reno'), photos: null },
      { state: 'ca', slug: 'san-jose', boundary: boundary('San Jose'), photos },
      { state: 'ca', slug: 'oakland', boundary: boundary('Oakland'), photos: null },
    ],
    states,
  );
  assert.deepEqual(problems, []);
  assert.deepEqual(index.states.map((s) => s.code), ['ca', 'nv']);
  assert.deepEqual(index.states[0].cities.map((c) => c.slug), ['oakland', 'san-jose']);
  const sj = index.states[0].cities[1];
  assert.equal(sj.path, '/city/ca/san-jose');
  assert.equal(sj.photo.src, 'small');
  assert.equal(sj.photo.width, 960);
  assert.equal(index.states[0].cities[0].photo, null);
});

test('index reports unknown states and missing names', () => {
  const { problems } = buildIndex(
    [
      { state: 'zz', slug: 'x', boundary: boundary('X'), photos: null },
      { state: 'ca', slug: 'y', boundary: { properties: {} }, photos: null },
    ],
    states,
  );
  assert.equal(problems.length, 2);
});

test('committed data/index.json lists exactly the cities that have a boundary file', () => {
  const index = JSON.parse(read('data/index.json'));
  const fromIndex = index.states.flatMap((s) => s.cities.map((c) => `${s.code}/${c.slug}`)).sort();
  const fromFiles = listFiles('data/boundaries', '.geojson').map((f) => f.replace('data/boundaries/', '').replace('.geojson', '')).sort();
  assert.deepEqual(fromIndex, fromFiles, 'run node scripts/build-index.js');
  for (const s of index.states) {
    for (const c of s.cities) {
      assert.deepEqual(parseCityPath(c.path), { state: s.code, slug: c.slug });
      const b = JSON.parse(read(`data/boundaries/${s.code}/${c.slug}.geojson`));
      assert.equal(c.name, b.properties.basename);
      if (c.photo) assert.match(c.photo.src, /^https:\/\/(upload|thumb)\.wikimedia\.org\//);
    }
  }
});
