import { test } from 'node:test';
import assert from 'node:assert/strict';
import { read } from './helpers.js';
import { normalize, searchCities } from '../js/search.js';
import { defaultComparison, parseCompareQuery, compareUrl, COMPARE_ROWS, cellFact, mismatches, MAX_COMPARE } from '../js/compare.js';
import { readSaved, isSaved, toggleSaved } from '../js/saved.js';
import { FACT_LABEL_KEYS } from '../js/fact-labels.js';

const LIST = [
  { s: 'ca/san-francisco', n: 'San Francisco', a: [], c: 'San Francisco County', p: 826079, ll: [37.775, -122.419] },
  { s: 'ca/south-san-francisco', n: 'South San Francisco', a: [], c: 'San Mateo County', p: 64941, ll: [37.655, -122.408] },
  { s: 'ca/oakland', n: 'Oakland', a: [], c: 'Alameda County', p: 440838, ll: [37.804, -122.271] },
  { s: 'ca/daly-city', n: 'Daly City', a: [], c: 'San Mateo County', p: 100000, ll: [37.688, -122.47] },
  { s: 'ca/fresno', n: 'Fresno', a: [], c: 'Fresno County', p: 555549, ll: [36.748, -119.772] },
  { s: 'ca/sacramento', n: 'Sacramento', a: [], c: 'Sacramento County', p: 536449, ll: [38.582, -121.494] },
  { s: 'ca/san-jose', n: 'San Jose', a: [], c: 'Santa Clara County', p: 989814, ll: [37.339, -121.894] },
  { s: 'ca/ventura', n: 'San Buenaventura (Ventura)', a: ['Ventura', 'San Buenaventura'], c: 'Ventura County', p: 109914, ll: [34.278, -119.293] },
  { s: 'ca/la-canada-flintridge', n: 'La Cañada Flintridge', a: [], c: 'Los Angeles County', p: 20000, ll: [34.199, -118.188] },
  { s: 'ca/st-helena', n: 'St. Helena', a: ['Saint Helena'], c: 'Napa County', p: 5400, ll: [38.505, -122.47] },
];

test('normalize: accents, case, punctuation', () => {
  assert.equal(normalize('La Cañada-Flintridge'), 'la canada flintridge');
  assert.equal(normalize('  St. Helena '), 'st helena');
});

test('search ranking: exact, prefix, word prefix, contains; larger city first on ties', () => {
  assert.deepEqual(searchCities(LIST, 'san').map((c) => c.s).slice(0, 3), ['ca/san-jose', 'ca/san-francisco', 'ca/ventura']);
  assert.equal(searchCities(LIST, 'san francisco')[0].s, 'ca/san-francisco');
  assert.equal(searchCities(LIST, 'san francisco')[1].s, 'ca/south-san-francisco');
  assert.equal(searchCities(LIST, 'ventura')[0].s, 'ca/ventura');
  assert.equal(searchCities(LIST, 'canada')[0].s, 'ca/la-canada-flintridge');
  assert.equal(searchCities(LIST, 'Cañada')[0].s, 'ca/la-canada-flintridge');
  assert.equal(searchCities(LIST, 'saint helena')[0].s, 'ca/st-helena');
  assert.deepEqual(searchCities(LIST, ''), []);
  assert.deepEqual(searchCities(LIST, 'zzz'), []);
  assert.equal(searchCities(LIST, 'a', 3).length, 3);
});

test('default comparison: 2 nearest + 2 closest in size, no duplicates, not the city itself', () => {
  const ids = defaultComparison('ca/san-francisco', LIST);
  assert.equal(ids.length, 4);
  assert.deepEqual(ids.slice(0, 2), ['ca/daly-city', 'ca/south-san-francisco']);
  assert.deepEqual(ids.slice(2), ['ca/san-jose', 'ca/fresno']);
  assert.ok(!ids.includes('ca/san-francisco'));
  assert.equal(new Set(ids).size, ids.length);
  assert.deepEqual(defaultComparison('ca/nowhere', LIST), []);
});

test('/compare addresses: valid ids, no duplicates, at most 5', () => {
  assert.deepEqual(parseCompareQuery('?cities=ca/san-francisco,CA/Oakland,ca/oakland,bad id,../x'), {
    ids: ['ca/san-francisco', 'ca/oakland'],
    rejected: ['bad id', '../x'],
    truncated: false,
  });
  const many = parseCompareQuery('?cities=ca/a,ca/b,ca/c,ca/d,ca/e,ca/f');
  assert.equal(many.ids.length, MAX_COMPARE);
  assert.ok(many.truncated);
  assert.deepEqual(parseCompareQuery('').ids, []);
  assert.equal(compareUrl(['ca/a', 'ca/b']), '/compare?cities=ca/a,ca/b');
});

test('comparison rows use labelled facts and one definition per row', () => {
  const dict = JSON.parse(read('i18n/en.json'));
  for (const r of COMPARE_ROWS) {
    assert.ok(FACT_LABEL_KEYS[r.fact], r.fact);
    assert.ok(dict[r.label], r.label);
    if (r.pick) assert.ok(r.unit, `${r.id} unit`);
  }
  assert.equal(new Set(COMPARE_ROWS.map((r) => r.id)).size, COMPARE_ROWS.length);
});

const city = (facts) => ({ facts });
test('cells and comparability check', () => {
  const income = COMPARE_ROWS.find((r) => r.id === 'income');
  const high = COMPARE_ROWS.find((r) => r.id === 'high');
  const a = city({ 'acs.medianHouseholdIncome': { value: 100, unit: 'USD', period: '2020–2024', dollarYear: 2024, currency: 'USD' }, 'climate.annual': { value: { tmaxF: 70 }, period: '1991–2020' } });
  const b = city({ 'acs.medianHouseholdIncome': { value: 90, unit: 'USD', period: '2020–2024', dollarYear: 2024, currency: 'USD' } });
  const c = city({ 'acs.medianHouseholdIncome': { value: 80, unit: 'USD', period: '2019–2023', dollarYear: 2023, currency: 'USD' } });
  const d = city({ 'acs.medianHouseholdIncome': { value: null, reason: 'x', unit: 'USD' } });
  assert.deepEqual(cellFact(a, high), { value: 70, period: '1991–2020', unit: 'degF' });
  assert.equal(cellFact(b, high), null);
  const ids = (list) => list.map((x, i) => ({ id: `ca/${i}`, city: x }));
  assert.deepEqual(mismatches(ids([a, b, d]), income), []);
  assert.deepEqual(mismatches(ids([a, b, c]), income), ['ca/2']);
});

test('saved cities: add, remove, newest first, blocked storage', () => {
  const mem = new Map();
  const store = { get: (k) => mem.get(k) ?? null, set: (k, v) => mem.set(k, v) };
  assert.deepEqual(readSaved(store), []);
  assert.equal(toggleSaved(store, 'ca/oakland'), true);
  assert.equal(toggleSaved(store, 'ca/fresno'), true);
  assert.deepEqual(readSaved(store), ['ca/fresno', 'ca/oakland']);
  assert.ok(isSaved(store, 'ca/oakland'));
  assert.equal(toggleSaved(store, 'ca/oakland'), false);
  assert.deepEqual(readSaved(store), ['ca/fresno']);
  mem.set('ce-saved', 'not json');
  assert.deepEqual(readSaved(store), []);
  mem.set('ce-saved', JSON.stringify(['ca/ok', '../bad', 5]));
  assert.deepEqual(readSaved(store), ['ca/ok']);
  const blocked = { get: () => null, set: () => {} };
  assert.equal(toggleSaved(blocked, 'ca/x'), true);
  assert.deepEqual(readSaved(blocked), []);
});

test('committed search list: every city once, with population and center', () => {
  const list = JSON.parse(read('data/search.json'));
  const index = JSON.parse(read('data/index.json'));
  const ids = index.states.flatMap((s) => s.cities.map((c) => `${s.code}/${c.slug}`)).sort();
  assert.deepEqual(list.map((c) => c.s).sort(), ids);
  for (const c of list) {
    assert.ok(c.n && c.c && c.p > 0, c.s);
    assert.ok(Array.isArray(c.ll) && c.ll.length === 2, c.s);
  }
});
