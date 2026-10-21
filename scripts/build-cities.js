// Writes data/cities/<state>/<slug>.json for every place of a state from data/sources/<state>/*.json.
// Usage: node scripts/build-cities.js ca
import { stateFromArg, readJson, writeJson, refuse } from './lib/files.js';
import { buildCity, sourcesFrom } from './lib/city.js';

const state = stateFromArg(process.argv[2]);
const read = (name) => readJson(`data/sources/${state.code}/${name}.json`);
const places = readJson(`data/reference/places-${state.code}.json`);
const census = read('census');
const elevation = read('elevation');
const timezone = read('timezone');
const climate = read('climate');
const sources = sourcesFrom({ census, elevation, timezone, climate, places });

const results = [];
const problems = [];
for (const place of places.places) {
  const s = place.slug;
  const { city, problems: p } = buildCity(
    state.code,
    place,
    { c: census.places[s], e: elevation.places[s], tz: timezone.places[s], cl: climate.places[s] },
    sources,
  );
  problems.push(...p.map((x) => `${s}: ${x}`));
  results.push(city);
}
if (problems.length) refuse(`${state.code} cities`, problems);
for (const city of results) writeJson(`data/cities/${state.code}/${city.id.slug}.json`, city);
console.log(`Wrote ${results.length} city files to data/cities/${state.code}/`);
