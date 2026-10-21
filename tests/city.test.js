import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildCity } from '../scripts/lib/city.js';

const sources = { acs: { period: '2020–2024' } };
const place = { slug: 'san-francisco', geoid: '0667000', name: 'San Francisco', censusName: 'San Francisco city', type: 'city', gnisCivil: '2411786', gnisPlace: '277593', wikidata: 'Q62' };
const point = { lon: -122.41944, lat: 37.775, source: 'gnis' };
const acs = {
  medianHouseholdIncome: { value: 140970, moe: 2911 },
  medianHomeValue: { value: 1394500, moe: 20000 },
  bachelorsOrHigher: { value: 60.3, moe: 0.6 },
  foreignBorn: { value: 34, moe: 0.7 },
  poverty: { value: 11.2, moe: 0.5 },
  meanCommute: { value: null, moe: null, reason: 'The American Community Survey has no estimate for this place (too few sample cases).' },
};
const months = (v) => Array(12).fill(v);
const sf = {
  c: {
    census2020: 873965,
    estimates: { base2020: 878550, estimates: { 2025: 826079 } },
    area2020: { landSqMi: 46.914, waterSqMi: 185 },
    area2025: { landSqMi: 46.685, waterSqMi: 185.214 },
    acs,
  },
  e: { point, elevation: { metres: 16.7 } },
  tz: { point, timezone: 'America/Los_Angeles' },
  cl: { point, station: { id: 'USW00023272', name: 'SAN FRANCISCO DWTN', lat: 37.7706, lon: -122.4269, elevationM: 45.7 }, distanceKm: 0.8, normals: { tmaxF: months(60), tminF: months(50), prcpIn: months(2) } },
};

test('San Francisco: sourced and computed facts with the right inputs', () => {
  const { city, problems } = buildCity('ca', place, sf, sources);
  assert.deepEqual(problems, []);
  const f = city.facts;
  assert.equal(f['population.census2020'].value, 873965);
  assert.equal(f['population.census2020'].level, 'sourced');
  assert.equal(f['population.estimate2025'].period, '2025-07-01');
  assert.equal(f['population.change'].level, 'computed');
  assert.equal(f['population.change'].value, -5.97);
  assert.deepEqual(f['population.change'].inputs, ['population.estimate2025', 'population.base2020']);
  // Density uses the land area of the same year as the population.
  assert.equal(f['density.2020'].value, 18629.1);
  assert.deepEqual(f['density.2020'].inputs, ['population.census2020', 'area.land2020']);
  assert.equal(f['density.2025'].value, 17694.7);
  assert.deepEqual(f['density.2025'].inputs, ['population.estimate2025', 'area.land2025']);
  assert.equal(f.elevation.value, 16.7);
  assert.equal(f.timezone.value, 'America/Los_Angeles');
  assert.equal(f['acs.medianHouseholdIncome'].dollarYear, 2024);
  assert.equal(f['acs.medianHouseholdIncome'].currency, 'USD');
  assert.equal(f['acs.medianHouseholdIncome'].moe, 2911);
  assert.equal(f['acs.meanCommute'].value, null);
  assert.match(f['acs.meanCommute'].reason, /no estimate/);
  assert.equal(f['climate.annual'].value.prcpIn, 24);
  assert.equal(f['climate.stationDistance'].level, 'computed');
  assert.ok(f['climate.stationDistance'].value > 0.5 && f['climate.stationDistance'].value < 1);
  assert.equal(city.referencePoint.source, 'gnis');
});

test('every fact has exactly one provenance level, or a reason when missing', () => {
  const { city } = buildCity('ca', place, sf, sources);
  for (const [k, f] of Object.entries(city.facts)) {
    if (f.value === null) {
      assert.ok(f.reason, `${k}: reason`);
      continue;
    }
    assert.ok(['sourced', 'computed', 'estimated'].includes(f.level), k);
    if (f.level === 'sourced') assert.ok(f.source && !f.formula, k);
    if (f.level === 'computed') assert.ok(f.formula && f.inputs?.length && !f.source, k);
  }
});

test('a city incorporated after 2020 (like Mountain House): no 2020 count, no 2020 density, still a 2025 density', () => {
  const mh = { ...sf, c: { ...sf.c, census2020: null, area2020: null } };
  const { city, problems } = buildCity('ca', { ...place, slug: 'mountain-house' }, mh, sources);
  assert.deepEqual(problems, []);
  assert.equal(city.facts['population.census2020'].value, null);
  assert.match(city.facts['population.census2020'].reason, /not an incorporated place on April 1, 2020/);
  assert.equal(city.facts['density.2020'].value, null);
  assert.ok(city.facts['density.2025'].value > 0);
});

test('broken inputs are reported', () => {
  const bad = { ...sf, c: { ...sf.c, estimates: null, area2025: null }, e: null, tz: null, cl: null };
  const { problems } = buildCity('ca', place, bad, sources);
  assert.ok(problems.includes('no 2025 population'));
  assert.ok(problems.includes('no land area'));
  assert.ok(problems.includes('no reference point'));
  const dense = { ...sf, c: { ...sf.c, area2025: { landSqMi: 1, waterSqMi: 0 } } };
  assert.ok(buildCity('ca', place, dense, sources).problems.some((p) => /implausible density/.test(p)));
});
