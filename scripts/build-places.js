// Writes data/reference/places-<state>.json: every incorporated place of a state (Census Gazetteer
// 2025), with its slug, Census GEOID, GNIS ids, Wikidata item and reference point (GNIS Populated Place).
// Usage: node scripts/build-places.js ca
import { getText, getBuffer, getJson } from './lib/http.js';
import { stateFromArg, writeJson, today, refuse } from './lib/files.js';
import { zipRead } from './lib/zip.js';
import { parseGazetteer, parseGnis, buildPlaces, isIncorporated, gnisByName, populatedPlaceFor, baseName } from './lib/places.js';

const state = stateFromArg(process.argv[2]);
const GAZ = `https://www2.census.gov/geo/docs/maps-data/data/gazetteer/2025_Gazetteer/2025_gaz_place_${state.fips}.txt`;
const GNIS = `https://prd-tnm.s3.amazonaws.com/StagedProducts/GeographicNames/DomesticNames/DomesticNames_${state.code.toUpperCase()}_Text.zip`;
const SPARQL = 'https://query.wikidata.org/sparql';

const rows = parseGazetteer(await getText(GAZ));
const gnis = parseGnis(zipRead(await getBuffer(GNIS), /\.txt$/).toString('utf8'));
console.log(`Gazetteer: ${rows.filter(isIncorporated).length} incorporated places; GNIS: ${gnis.size} features`);

// Every GNIS id that could identify a city on Wikidata: the Civil record and its Populated Place.
const byName = gnisByName(gnis);
const ids = new Set();
for (const row of rows.filter(isIncorporated)) {
  const civilId = String(Number(row.ANSICODE));
  ids.add(civilId);
  const place = populatedPlaceFor(gnis.get(civilId), baseName(row), byName);
  if (place) ids.add(place.id);
}

const wikidataByGnis = new Map();
const all = [...ids];
for (let i = 0; i < all.length; i += 200) {
  const values = all.slice(i, i + 200).map((g) => `"${g}"`).join(' ');
  const q = `SELECT ?g ?item WHERE { VALUES ?g { ${values} } ?item wdt:P590 ?g. }`;
  const res = await getJson(`${SPARQL}?format=json&query=${encodeURIComponent(q)}`, { delayMs: 1500 });
  for (const b of res.results.bindings) {
    const qid = b.item.value.split('/').pop();
    const list = wikidataByGnis.get(b.g.value) || [];
    if (!list.includes(qid)) list.push(qid);
    wikidataByGnis.set(b.g.value, list);
  }
}

const { places, problems, notes } = buildPlaces(rows, gnis, wikidataByGnis, state.code);
for (const n of notes) console.log(`  note: ${n}`);
if (problems.length) refuse(`places-${state.code}`, problems);

writeJson(`data/reference/places-${state.code}.json`, {
  source: {
    gazetteer: { name: 'U.S. Census Bureau, 2025 Gazetteer Files, places', url: GAZ, retrieved: today(), licence: 'Public domain (U.S. government work)' },
    gnis: { name: 'USGS Geographic Names Information System (GNIS), Domestic Names', url: GNIS, retrieved: today(), licence: 'Public domain (U.S. government work)' },
    wikidata: { name: 'Wikidata (GNIS ID, P590)', url: SPARQL, retrieved: today(), licence: 'CC0 1.0' },
  },
  places,
});
const withPoint = places.filter((p) => p.point).length;
const withQid = places.filter((p) => p.wikidata).length;
console.log(`Wrote data/reference/places-${state.code}.json: ${places.length} places, ${withPoint} with a GNIS point, ${withQid} with Wikidata.`);
