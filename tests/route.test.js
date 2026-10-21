import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseCityPath, cityPath, titleFromSlug } from '../js/route.js';

test('parses a city path', () => {
  assert.deepEqual(parseCityPath('/city/ca/san-francisco'), { state: 'ca', slug: 'san-francisco' });
});

test('accepts a trailing slash and upper case', () => {
  assert.deepEqual(parseCityPath('/city/ca/san-francisco/'), { state: 'ca', slug: 'san-francisco' });
  assert.deepEqual(parseCityPath('/City/CA/San-Francisco'), { state: 'ca', slug: 'san-francisco' });
});

test('accepts digits in slugs', () => {
  assert.deepEqual(parseCityPath('/city/ca/twentynine-palms'), { state: 'ca', slug: 'twentynine-palms' });
  assert.deepEqual(parseCityPath('/city/ny/area-51'), { state: 'ny', slug: 'area-51' });
});

test('rejects malformed paths', () => {
  for (const p of [
    '/',
    '/city',
    '/city/ca',
    '/city/ca/',
    '/city/ca/san-francisco/extra',
    '/city/cal/san-francisco',
    '/city/c/san-francisco',
    '/city/c1/san-francisco',
    '/city/ca/san_francisco',
    '/city/ca/-san-francisco',
    '/city/ca/san--francisco',
    '/city/ca/san-francisco-',
    '/city/ca/san%20francisco',
    '/city/ca/%E0%A4%A',
    '/city/ca/..',
    '/city/ca/<script>',
    '/cities/ca/san-francisco',
    'city/ca/san-francisco',
    '',
  ]) {
    assert.equal(parseCityPath(p), null, p);
  }
  assert.equal(parseCityPath(undefined), null);
  assert.equal(parseCityPath(42), null);
});

test('builds the canonical path', () => {
  assert.equal(cityPath({ state: 'ca', slug: 'san-francisco' }), '/city/ca/san-francisco');
  const parsed = parseCityPath('/CITY/CA/LOS-ANGELES/');
  assert.equal(cityPath(parsed), '/city/ca/los-angeles');
});

test('provisional title from slug', () => {
  assert.equal(titleFromSlug('san-francisco'), 'San Francisco');
  assert.equal(titleFromSlug('oakland'), 'Oakland');
  assert.equal(titleFromSlug('area-51'), 'Area 51');
});
