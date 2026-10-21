import { test } from 'node:test';
import assert from 'node:assert/strict';
import { formatFact, formatMoe, zoneLabel, localTime, climateSeries } from '../js/facts.js';
import { createT } from '../js/i18n.js';
import { read } from './helpers.js';

const t = createT(JSON.parse(read('i18n/en.json')));
const us = { t, system: 'us' };
const metric = { t, system: 'metric' };

test('people, area and density in both systems; conversions are flagged', () => {
  assert.deepEqual(formatFact({ value: 826079, unit: 'people' }, us), { text: '826,079', converted: false });
  assert.deepEqual(formatFact({ value: 46.685, unit: 'mi2' }, us), { text: '46.7 mi²', converted: false });
  assert.deepEqual(formatFact({ value: 46.685, unit: 'mi2' }, metric), { text: '120.9 km²', converted: true });
  // Formula inputs keep the precision of the source, so the computation can be redone by hand.
  assert.deepEqual(formatFact({ value: 46.685, unit: 'mi2' }, { ...us, exact: true }), { text: '46.685 mi²', converted: false });
  assert.deepEqual(formatFact({ value: 17694.7, unit: 'people/mi2' }, us), { text: '17,695 per mi²', converted: false });
  assert.deepEqual(formatFact({ value: 17694.7, unit: 'people/mi2' }, metric), { text: '6,832 per km²', converted: true });
});

test('elevation: metres from USGS, feet in US units', () => {
  assert.deepEqual(formatFact({ value: 16.7, unit: 'm' }, metric), { text: '17 m', converted: false });
  assert.deepEqual(formatFact({ value: 16.7, unit: 'm' }, us), { text: '55 ft', converted: true });
});

test('money with dollar qualifier, percent, minutes, margins of error', () => {
  assert.equal(formatFact({ value: 140970, unit: 'USD' }, us).text, '$140,970');
  assert.equal(formatFact({ value: 2000000, unit: 'USD', qualifier: 'or more' }, us).text, '$2,000,000 or more');
  assert.equal(formatFact({ value: 60.3, unit: '%' }, us).text, '60.3%');
  assert.equal(formatFact({ value: 30.4, unit: 'min' }, us).text, '30.4 min');
  assert.equal(formatMoe({ value: 140970, moe: 2911, unit: 'USD' }, us), '± $2,911');
  assert.equal(formatMoe({ value: 60.3, moe: 0.6, unit: '%' }, us), '± 0.6%');
  assert.equal(formatMoe({ value: 5, moe: null, unit: '%' }, us), null);
});

test('missing values are null, never zero', () => {
  assert.equal(formatFact({ value: null, unit: 'people', reason: 'x' }, us), null);
  assert.equal(formatFact(undefined, us), null);
});

test('time zone labels and local time', () => {
  const summer = new Date('2026-07-01T19:00:00Z');
  const winter = new Date('2026-01-15T19:00:00Z');
  assert.deepEqual(zoneLabel('America/Los_Angeles', summer), { short: 'PDT', offset: 'UTC−7' });
  assert.deepEqual(zoneLabel('America/Los_Angeles', winter), { short: 'PST', offset: 'UTC−8' });
  assert.equal(localTime('America/Los_Angeles', summer), '12:00');
});

test('climate series conversion', () => {
  const m = { tmaxF: Array(12).fill(68), tminF: Array(12).fill(50), prcpIn: Array(12).fill(1) };
  const u = climateSeries(m, 'us');
  assert.equal(u.tmax[0], 68);
  assert.equal(u.tempUnit, 'degF');
  const c = climateSeries(m, 'metric');
  assert.equal(c.tmax[0], 20);
  assert.equal(c.tmin[0], 10);
  assert.equal(c.prcp[0], 25.4);
  assert.equal(c.prcpUnit, 'mm');
  assert.ok(c.converted);
});
