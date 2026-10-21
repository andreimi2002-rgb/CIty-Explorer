// Parsers and rules for the stage 2 sources: Census API/files, USGS elevation, time zones, NOAA normals.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { apiRows, acsValue, csvLine, parsePep, gazetteerAreas, wasCdpIn2020, ACS_VARS } from '../scripts/lib/census-data.js';
import { parseGazetteer } from '../scripts/lib/places.js';
import { parseEpqs, epqsUrl } from '../scripts/lib/elevation.js';
import { zonesIn, zoneAt } from '../scripts/lib/timezone.js';
import { parseInventory, nearestStations, parseStationNormals, annual } from '../scripts/lib/noaa.js';
import { redact } from '../scripts/lib/http.js';
import { distanceKm, bboxIntersects } from '../js/geo.js';

test('API keys never appear in messages', () => {
  assert.equal(redact('https://api.census.gov/data?get=X&for=place:*&key=SECRET123'), 'https://api.census.gov/data?get=X&for=place:*&key=***');
  assert.equal(redact('https://x.test/?key=abc&b=1'), 'https://x.test/?key=***&b=1');
});

test('Census API rows', () => {
  assert.deepEqual(apiRows([['NAME', 'P1_001N', 'state', 'place'], ['San Francisco city, California', '873965', '06', '67000']]), [
    { NAME: 'San Francisco city, California', P1_001N: '873965', state: '06', place: '67000' },
  ]);
  assert.throws(() => apiRows({ error: 'x' }));
});

test('ACS values: margins, jam values, top codes, reliability', () => {
  assert.deepEqual(acsValue('140970', '2911', 'DP03_0062'), { value: 140970, moe: 2911 });
  assert.equal(acsValue('-666666666', '-222222222', 'DP03_0062').value, null);
  assert.match(acsValue('-666666666', '-222222222', 'DP03_0062').reason, /no estimate/);
  assert.deepEqual(acsValue('2000001', '-333333333', 'DP04_0089'), { value: 2000000, moe: null, qualifier: 'or more' });
  assert.deepEqual(acsValue('250001', '-333333333', 'DP03_0062'), { value: 250000, moe: null, qualifier: 'or more' });
  assert.equal(acsValue('10.0', '5.0', 'DP03_0128P').reliability, 'low');
  assert.equal(acsValue('10.0', '4.0', 'DP03_0128P').reliability, undefined);
  assert.equal(acsValue('5', '-555555555', 'DP03_0025').moe, 0);
  assert.equal(acsValue(null, null, 'DP03_0025').value, null);
  assert.equal(Object.keys(ACS_VARS).length, 6);
});

test('CSV lines with quotes', () => {
  assert.deepEqual(csvLine('a,"b, c","d ""e"""'), ['a', 'b, c', 'd "e"']);
  assert.deepEqual(csvLine('"USW00023272","01"," 37.7706"'), ['USW00023272', '01', ' 37.7706']);
});

test('Population Estimates: incorporated places of the state only', () => {
  const csv = [
    'SUMLEV,STATE,COUNTY,PLACE,COUSUB,CONCIT,PRIMGEO_FLAG,FUNCSTAT,NAME,STNAME,ESTIMATESBASE2020,POPESTIMATE2020,POPESTIMATE2025',
    '162,06,000,67000,00000,00000,0,A,San Francisco city,California,878550,875139,826079',
    '050,06,075,00000,00000,00000,0,C,San Francisco County,California,878550,875139,826079',
    '162,32,000,60600,00000,00000,0,A,Reno city,Nevada,264165,265000,280000',
  ].join('\n');
  const pep = parsePep(csv, '06');
  assert.equal(pep.size, 1);
  assert.deepEqual(pep.get('0667000'), { base2020: 878550, estimates: { 2020: 875139, 2025: 826079 } });
});

test('Gazetteer areas', () => {
  const m = gazetteerAreas(parseGazetteer('GEOID|ALAND_SQMI|AWATER_SQMI\n0667000|46.685|185.214\n'));
  assert.deepEqual(m.get('0667000'), { landSqMi: 46.685, waterSqMi: 185.214, lsad: undefined });
  const g20 = gazetteerAreas(parseGazetteer('GEOID\tLSAD\tALAND_SQMI\tAWATER_SQMI\n0649582\t57\t4.558\t0.\n0667000\t25\t46.914\t185.\n'));
  assert.ok(wasCdpIn2020(g20.get('0649582')));
  assert.ok(!wasCdpIn2020(g20.get('0667000')));
  assert.ok(!wasCdpIn2020(undefined));
});

test('USGS elevation responses', () => {
  assert.deepEqual(parseEpqs({ value: '16.661026001', resolution: 1 }), { metres: 16.7, resolutionM: 1 });
  assert.equal(parseEpqs({ value: '-1000000' }), null);
  assert.equal(parseEpqs({ value: 'abc' }), null);
  assert.equal(parseEpqs(null), null);
  assert.equal(epqsUrl({ lon: -122.4, lat: 37.7 }), 'https://epqs.nationalmap.gov/v1/json?x=-122.4&y=37.7&wkid=4326&units=Meters&includeDate=false');
});

test('time zone by point in polygon, filtered by area', () => {
  const sq = (x, y, s) => ({ type: 'Polygon', coordinates: [[[x, y], [x + s, y], [x + s, y + s], [x, y + s], [x, y]]] });
  const fc = { features: [
    { properties: { tzid: 'America/Los_Angeles' }, geometry: sq(-125, 32, 10) },
    { properties: { tzid: 'America/Denver' }, geometry: sq(-115, 32, 10) },
    { properties: { tzid: 'Europe/Bucharest' }, geometry: sq(20, 43, 10) },
  ] };
  const zones = zonesIn(fc, [-124.4, 32.5, -114.1, 42]);
  assert.deepEqual(zones.map((z) => z.tzid), ['America/Los_Angeles', 'America/Denver']);
  assert.equal(zoneAt(zones, [-122.4, 37.8]), 'America/Los_Angeles');
  assert.equal(zoneAt(zones, [-114.5, 35]), 'America/Denver');
  assert.equal(zoneAt(zones, [-130, 35]), null);
  assert.ok(bboxIntersects([0, 0, 2, 2], [1, 1, 3, 3]));
  assert.ok(!bboxIntersects([0, 0, 1, 1], [2, 2, 3, 3]));
});

test('distance: San Francisco to Los Angeles is about 559 km', () => {
  const d = distanceKm([-122.4194, 37.775], [-118.2437, 34.0522]);
  assert.ok(d > 555 && d < 562, String(d));
  assert.equal(distanceKm([0, 0], [0, 0]), 0);
});

const INVENTORY = [
  'USW00023272  37.7706 -122.4269   45.7 CA SAN FRANCISCO DWTN                          ',
  'US1CASF0004  37.7650 -122.4348   59.1 CA SAN FRANCISCO 1.1 SW                        ',
  'USW00023234  37.6197 -122.3647    2.4 CA SAN FRANCISCO INTL AP                  72494',
].join('\n');

test('NOAA inventory and nearest stations', () => {
  const st = parseInventory(INVENTORY);
  assert.equal(st.length, 3);
  assert.deepEqual(st[0], { id: 'USW00023272', lat: 37.7706, lon: -122.4269, elevationM: 45.7, state: 'CA', name: 'SAN FRANCISCO DWTN' });
  const near = nearestStations(st, [-122.4194, 37.775]);
  assert.deepEqual(near.map((s) => s.id), ['USW00023272', 'US1CASF0004', 'USW00023234']);
  assert.ok(near[0].distanceKm < 1);
  assert.equal(nearestStations(st, [-118, 34], 50).length, 0);
});

const header = '"STATION","DATE","MLY-TMAX-NORMAL","comp_flag_MLY-TMAX-NORMAL","MLY-TMIN-NORMAL","comp_flag_MLY-TMIN-NORMAL","MLY-PRCP-NORMAL","comp_flag_MLY-PRCP-NORMAL"';
const month = (m, tmax, tmin, prcp) => `"X","${String(m).padStart(2, '0')}","${tmax}","S","${tmin}","S","${prcp}","S"`;
const SF_TMAX = [57.8, 60.4, 62.1, 63.0, 64.1, 66.5, 66.3, 67.9, 70.2, 69.8, 63.7, 57.9];
const SF_TMIN = [46.6, 47.9, 48.9, 49.7, 51.4, 53.0, 54.4, 55.5, 55.6, 54.4, 50.7, 47.0];
const SF_PRCP = [4.40, 4.37, 3.15, 1.60, 0.70, 0.20, 0.01, 0.06, 0.10, 0.94, 2.60, 4.76];

test('NOAA station normals: complete files only', () => {
  const ok = [header, ...SF_TMAX.map((_, i) => month(i + 1, SF_TMAX[i], SF_TMIN[i], SF_PRCP[i]))].join('\n');
  const n = parseStationNormals(ok);
  assert.deepEqual(n.tmaxF, SF_TMAX);
  assert.deepEqual(n.prcpIn, SF_PRCP);
  assert.equal(n.tmaxFFlags[0], 'S');
  const missingMonth = [header, ...SF_TMAX.slice(0, 11).map((_, i) => month(i + 1, SF_TMAX[i], SF_TMIN[i], SF_PRCP[i]))].join('\n');
  assert.equal(parseStationNormals(missingMonth), null);
  const blank = ok.replace('"57.8"', '""');
  assert.equal(parseStationNormals(blank), null);
  const jam = ok.replace('"57.8"', '"-7777"');
  assert.equal(parseStationNormals(jam), null);
  const precipOnly = ['"STATION","DATE","MLY-PRCP-NORMAL"', ...SF_PRCP.map((p, i) => `"X","${i + 1}","${p}"`)].join('\n');
  assert.equal(parseStationNormals(precipOnly), null);
});

test('annual climate values for San Francisco downtown', () => {
  const a = annual({ tmaxF: SF_TMAX, tminF: SF_TMIN, prcpIn: SF_PRCP });
  assert.equal(a.prcpIn, 22.89);
  assert.equal(a.warmestMonth, 9);
  assert.equal(a.wettestMonth, 12);
  assert.equal(a.tmaxF, 64.1);
  assert.equal(a.tminF, 51.3);
});
