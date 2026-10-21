// Writes data/boundaries/<state>/<slug>.geojson for every curated city of a state.
// Usage: node scripts/fetch-boundary.js ca
import { getJson } from './lib/http.js';
import { stateFromArg, curationFor, writeJson, today, refuse } from './lib/files.js';
import { PLACES_LAYER, layerUrl, placeQueryUrl, validatePlace, buildBoundary } from './lib/census.js';

const state = stateFromArg(process.argv[2]);
const cities = curationFor(state.code);
if (!cities.length) refuse(state.code, [`no curation files in data/curation/${state.code}/`]);

const meta = await getJson(`${layerUrl(PLACES_LAYER)}?f=json`);
if (meta.name !== PLACES_LAYER.name) refuse(state.code, [`layer ${PLACES_LAYER.id} is "${meta.name}", expected "${PLACES_LAYER.name}"`]);

const results = [];
for (const city of cities) {
  const url = placeQueryUrl(city.geoid);
  const geo = await getJson(url);
  const feature = geo.features?.[0];
  const problems = validatePlace(feature, { geoid: city.geoid, state });
  if (problems.length) refuse(`${state.code}/${city.slug}`, problems);
  results.push([city.slug, buildBoundary(feature, { url, retrieved: today() })]);
}

// Written only after every city passed.
for (const [slug, boundary] of results) {
  writeJson(`data/boundaries/${state.code}/${slug}.geojson`, boundary);
  console.log(`Wrote data/boundaries/${state.code}/${slug}.geojson (${boundary.properties.name})`);
}
