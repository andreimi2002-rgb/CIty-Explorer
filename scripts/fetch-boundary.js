// Writes data/boundaries/<state>/<slug>.geojson for every place of a state (or only the slugs given).
// Usage: node scripts/fetch-boundary.js ca [slug ...]
import { getJson } from './lib/http.js';
import { stateFromArg, citiesFor, writeJson, today, refuse } from './lib/files.js';
import { PLACES_LAYER, layerUrl, placeQueryUrl, validatePlace, buildBoundary } from './lib/census.js';

const state = stateFromArg(process.argv[2]);
const cities = citiesFor(state.code, process.argv.slice(3));

const meta = await getJson(`${layerUrl(PLACES_LAYER)}?f=json`);
if (meta.name !== PLACES_LAYER.name) refuse(state.code, [`layer ${PLACES_LAYER.id} is "${meta.name}", expected "${PLACES_LAYER.name}"`]);

const results = [];
const problems = [];
for (const [i, city] of cities.entries()) {
  const url = placeQueryUrl(city.geoid);
  const geo = await getJson(url, { delayMs: 500 });
  const feature = geo.features?.[0];
  const p = validatePlace(feature, { geoid: city.geoid, state });
  if (p.length) problems.push(...p.map((x) => `${city.slug}: ${x}`));
  else results.push([city.slug, buildBoundary(feature, { url, retrieved: today() })]);
  if ((i + 1) % 50 === 0) console.log(`  ${i + 1}/${cities.length}`);
}

// Written only after every city passed.
if (problems.length) refuse(`${state.code} boundaries`, problems);
for (const [slug, boundary] of results) writeJson(`data/boundaries/${state.code}/${slug}.geojson`, boundary);
console.log(`Wrote ${results.length} boundaries to data/boundaries/${state.code}/`);
