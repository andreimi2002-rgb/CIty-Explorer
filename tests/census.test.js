import { test } from 'node:test';
import assert from 'node:assert/strict';
import { placeQueryUrl, validatePlace, validateStates, buildBoundary, PLACES_LAYER } from '../scripts/lib/census.js';

const state = { code: 'ca', fips: '06', name: 'California', bbox: [-124.41, 32.53, -114.13, 42.01] };

// A small ring inside California with more than 20 points.
const ring = Array.from({ length: 24 }, (_, i) => {
  const a = (i / 24) * 2 * Math.PI;
  return [-122.45 + 0.05 * Math.cos(a), 37.75 + 0.05 * Math.sin(a)];
});
ring.push(ring[0]);
const feature = (props = {}, geometry = { type: 'Polygon', coordinates: [ring] }) => ({
  type: 'Feature',
  properties: { GEOID: '0667000', STATE: '06', NAME: 'Test city', BASENAME: 'Test', INTPTLON: '-122.45', INTPTLAT: '+37.75', ...props },
  geometry,
});

test('query URL uses the generalized places layer and refuses bad GEOIDs', () => {
  const url = placeQueryUrl('0667000');
  assert.ok(url.includes(`/MapServer/${PLACES_LAYER.id}/query?`));
  const params = new URL(url).searchParams;
  assert.equal(params.get('f'), 'geojson');
  assert.equal(params.get('where'), "GEOID='0667000'");
  assert.equal(params.get('outSR'), '4326');
  assert.throws(() => placeQueryUrl("06' OR 1=1"));
  assert.throws(() => placeQueryUrl('667000'));
});

test('a valid place passes', () => {
  assert.deepEqual(validatePlace(feature(), { geoid: '0667000', state }), []);
});

test('place problems are reported', () => {
  const v = (f) => validatePlace(f, { geoid: '0667000', state });
  assert.match(v(null)[0], /no feature/);
  assert.match(v(feature({ GEOID: '0644000' })).join(), /GEOID/);
  assert.match(v(feature({ STATE: '32' })).join(), /STATE/);
  assert.match(v(feature({ NAME: '' })).join(), /name/);
  assert.match(v(feature({}, null)).join(), /geometry/);
  assert.match(v(feature({}, { type: 'Polygon', coordinates: [ring.slice(0, 5)] })).join(), /points/);
  const far = ring.map(([x, y]) => [x - 10, y]);
  assert.match(v(feature({ INTPTLON: '-132.45' }, { type: 'Polygon', coordinates: [far] })).join(), /outside California/);
  assert.match(v(feature({ INTPTLON: '-121' })).join(), /internal point is outside/);
  assert.match(v(feature({ INTPTLAT: 'x' })).join(), /missing internal point/);
});

test('boundary record keeps name, internal point and source', () => {
  const b = buildBoundary(feature(), { url: 'https://example.test/q', retrieved: '2026-10-21' });
  assert.equal(b.properties.geoid, '0667000');
  assert.equal(b.properties.basename, 'Test');
  assert.deepEqual(b.properties.internalPoint, [-122.45, 37.75]);
  assert.equal(b.properties.source.vintage, '2025-01-01');
  assert.equal(b.properties.source.retrieved, '2026-10-21');
  assert.match(b.properties.source.licence, /Public domain/);
  assert.equal(b.geometry.type, 'Polygon');
});

test('state list validation', () => {
  const states = Array.from({ length: 50 }, (_, i) => ({ code: `a${String.fromCharCode(97 + (i % 26))}`.slice(0, 2), fips: String(i + 1).padStart(2, '0'), bbox: [-100, 30, -90, 40] }));
  states.forEach((s, i) => (s.code = String.fromCharCode(97 + Math.floor(i / 26)) + String.fromCharCode(97 + (i % 26))));
  assert.deepEqual(validateStates(states), []);
  assert.match(validateStates(states.slice(0, 10)).join(), /only 10/);
  assert.match(validateStates([...states, { ...states[0] }]).join(), /duplicate FIPS/);
  assert.match(validateStates([...states.slice(1), { ...states[0], bbox: [10, 0, 5, 1] }]).join(), /bad bbox/);
});
