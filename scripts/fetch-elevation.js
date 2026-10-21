// Writes data/sources/<state>/elevation.json: elevation (m) at each city's reference point,
// from the USGS 3DEP Elevation Point Query Service. Usage: node scripts/fetch-elevation.js ca
import { getJson } from './lib/http.js';
import { stateFromArg, citiesFor, writeJson, today, refuse } from './lib/files.js';
import { referencePoint } from './lib/points.js';
import { EPQS, epqsUrl, parseEpqs } from './lib/elevation.js';

const state = stateFromArg(process.argv[2]);
const cities = citiesFor(state.code);
const places = {};
const problems = [];
for (const [i, c] of cities.entries()) {
  const point = referencePoint(state.code, c);
  if (!point) {
    problems.push(`${c.slug}: no reference point (run fetch-boundary.js first)`);
    continue;
  }
  const e = parseEpqs(await getJson(epqsUrl(point), { delayMs: 250 }));
  places[c.slug] = { point, elevation: e };
  if ((i + 1) % 100 === 0) console.log(`  ${i + 1}/${cities.length}`);
}
const missing = Object.entries(places).filter(([, v]) => !v.elevation).map(([k]) => k);
if (missing.length > cities.length * 0.02) problems.push(`too many points without elevation: ${missing.join(', ')}`);
if (problems.length) refuse(`${state.code} elevation`, problems);

writeJson(`data/sources/${state.code}/elevation.json`, {
  source: {
    name: 'USGS 3D Elevation Program (3DEP), Elevation Point Query Service',
    url: EPQS,
    retrieved: today(),
    licence: 'Public domain (U.S. government work)',
    note: 'Elevation of the ground at the city reference point (GNIS Populated Place), not the highest or lowest point of the city.',
  },
  places,
});
console.log(`Wrote data/sources/${state.code}/elevation.json (${cities.length} places, without value: ${missing.join(', ') || 'none'})`);
