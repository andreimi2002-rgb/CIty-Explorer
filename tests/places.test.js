import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT, read } from './helpers.js';
import {
  slugify, nameKey, parseGazetteer, isIncorporated, baseName, placeType, parseGnis, alternateNames, populatedPlaceFor, gnisByName, buildPlaces,
} from '../scripts/lib/places.js';
import { zipEntries, zipRead } from '../scripts/lib/zip.js';
import { parseEnv } from '../scripts/lib/env.js';

test('slugs', () => {
  assert.equal(slugify('San Francisco'), 'san-francisco');
  assert.equal(slugify('La Cañada Flintridge'), 'la-canada-flintridge');
  assert.equal(slugify('St. Helena'), 'st-helena');
  assert.equal(slugify("Rancho Palos Verdes's"), 'rancho-palos-verdes-s');
  assert.equal(nameKey('Saint  Helena!'), 'saint helena');
});

test('gazetteer files with "|" (2025) and tabs with padding (2020)', () => {
  const g25 = parseGazetteer('USPS|GEOID|ANSICODE|NAME|LSAD|FUNCSTAT|ALAND_SQMI\nCA|0667000|02411786|San Francisco city|25|A|46.685\nCA|0600135|02582926|Acalanes Ridge CDP|57|S|0.461\n');
  assert.equal(g25.length, 2);
  assert.ok(isIncorporated(g25[0]));
  assert.ok(!isIncorporated(g25[1]));
  assert.equal(baseName(g25[0]), 'San Francisco');
  assert.equal(placeType(g25[0]), 'city');
  const g20 = parseGazetteer('USPS\tGEOID\tNAME\tLSAD\tALAND_SQMI   \nCA\t0600884\tAmador City city\t25\t0.311   \n');
  assert.equal(g20[0].ALAND_SQMI, '0.311');
  assert.equal(baseName(g20[0]), 'Amador City');
  assert.equal(baseName({ NAME: 'Apple Valley town', LSAD: '43' }), 'Apple Valley');
});

test('alternate names for GNIS matching', () => {
  assert.deepEqual(alternateNames('San Buenaventura (Ventura)'), ['San Buenaventura (Ventura)', 'Ventura', 'San Buenaventura']);
  assert.ok(alternateNames('St. Helena').includes('Saint Helena'));
  assert.ok(alternateNames('Suisun City').includes('Suisun'));
  assert.deepEqual(alternateNames('Oakland'), ['Oakland']);
});

const GNIS = [
  'feature_id|feature_name|feature_class|state_name|state_numeric|county_name|county_numeric|map_name|date_created|date_edited|bgn_type|bgn_authority|bgn_date|prim_lat_dms|prim_long_dms|prim_lat_dec|prim_long_dec',
  '2411786|City of San Francisco|Civil|California|06|San Francisco|075|x||||||||37.7782|-122.4425',
  '277593|San Francisco|Populated Place|California|06|San Francisco|075|x||||||||37.775|-122.4194',
  '999|San Francisco|Populated Place|California|06|Other|001|x||||||||36|-120',
  '2411779|City of San Buenaventura|Civil|California|06|Ventura|111|x||||||||34.27|-119.25',
  '1667934|Ventura|Populated Place|California|06|Ventura|111|x||||||||34.278|-119.293',
  '2354017|Ventura|Populated Place|California|06|Monterey|085|x||||||||36|-121',
].join('\n');

test('GNIS: populated place with the same name in the same county', () => {
  const gnis = parseGnis(GNIS);
  const byName = gnisByName(gnis);
  assert.equal(populatedPlaceFor(gnis.get('2411786'), 'San Francisco', byName).id, '277593');
  assert.equal(populatedPlaceFor(gnis.get('2411779'), 'San Buenaventura (Ventura)', byName).id, '1667934');
  assert.equal(populatedPlaceFor(undefined, 'X', byName), null);
});

test('buildPlaces: Wikidata by Civil GNIS first, then by Populated Place; slug uses the common name', () => {
  const rows = parseGazetteer('USPS|GEOID|ANSICODE|NAME|LSAD|FUNCSTAT\nCA|0667000|02411786|San Francisco city|25|A\nCA|0665042|02411779|San Buenaventura (Ventura) city|25|A\nCA|0600001|00000001|Nowhere CDP|57|S\n');
  const gnis = parseGnis(GNIS);
  const wd = new Map([['2411786', ['Q62']], ['1667934', ['Q490434']]]);
  const { places, problems, notes } = buildPlaces(rows, gnis, wd, 'ca');
  assert.deepEqual(problems, []);
  assert.deepEqual(places.map((p) => p.slug), ['san-francisco', 'ventura']);
  const sf = places[0];
  assert.deepEqual(sf.point, { lon: -122.4194, lat: 37.775, source: 'gnis' });
  assert.equal(sf.wikidata, 'Q62');
  assert.equal(places[1].wikidata, 'Q490434');
  assert.equal(places[1].name, 'San Buenaventura (Ventura)');
  assert.ok(notes.some((n) => /Populated Place GNIS 1667934/.test(n)));
});

test('buildPlaces refuses ambiguous Wikidata and duplicate slugs', () => {
  const rows = parseGazetteer('USPS|GEOID|ANSICODE|NAME|LSAD|FUNCSTAT\nCA|0667000|02411786|San Francisco city|25|A\nCA|0667001|02411786|San Francisco town|43|A\n');
  const { problems } = buildPlaces(rows, parseGnis(GNIS), new Map([['2411786', ['Q62', 'Q1']]]), 'ca');
  assert.ok(problems.some((p) => /several Wikidata/.test(p)));
  assert.ok(problems.some((p) => /duplicate slug/.test(p)));
});

test('zip reader: lists and inflates entries', () => {
  const buf = readFileSync(join(ROOT, 'tests/fixtures/sample.zip'));
  assert.deepEqual(zipEntries(buf).map((e) => e.name).sort(), ['hello.txt', 'other.csv']);
  assert.equal(zipRead(buf, /\.txt$/).toString(), 'feature_id|feature_name\n1|Test');
  assert.equal(zipRead(buf, 'other.csv').toString(), 'a,b\n'.repeat(200));
  assert.throws(() => zipRead(buf, 'missing'), /no entry/);
  assert.throws(() => zipEntries(Buffer.from('not a zip at all, definitely not')), /not a zip/);
});

test('.env parsing and git ignore', () => {
  assert.deepEqual(parseEnv('# c\nCENSUS_API_KEY=abc123\nQUOTED="x y"\n\nbad line'), { CENSUS_API_KEY: 'abc123', QUOTED: 'x y' });
  const ignore = read('.gitignore').split(/\r?\n/);
  assert.ok(ignore.includes('.env') && ignore.includes('.env.*'), '.env must be ignored by git');
});

test('committed place list: every place linked, unique slugs and GEOIDs', () => {
  const { places } = JSON.parse(read('data/reference/places-ca.json'));
  assert.ok(places.length >= 480);
  assert.equal(new Set(places.map((p) => p.slug)).size, places.length);
  assert.equal(new Set(places.map((p) => p.geoid)).size, places.length);
  for (const p of places) {
    assert.match(p.geoid, /^06\d{5}$/, p.slug);
    assert.match(p.wikidata, /^Q\d+$/, p.slug);
    assert.match(p.slug, /^[a-z0-9]+(?:-[a-z0-9]+)*$/);
    if (p.point) assert.ok(p.point.lat > 32 && p.point.lat < 42.1 && p.point.lon > -124.5 && p.point.lon < -114, p.slug);
  }
  assert.ok(places.filter((p) => p.point).length / places.length > 0.98);
});
