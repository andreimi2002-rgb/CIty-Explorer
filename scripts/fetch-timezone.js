// Writes data/sources/<state>/timezone.json: the IANA time zone of each city's reference point.
// Downloads timezone-boundary-builder once into tmp/ (not committed).
// Usage: node scripts/fetch-timezone.js ca
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { getBuffer } from './lib/http.js';
import { ROOT, stateFromArg, citiesFor, writeJson, today, refuse } from './lib/files.js';
import { referencePoint } from './lib/points.js';
import { zipRead } from './lib/zip.js';
import { TZ_RELEASE, TZ_URL, zonesIn, zoneAt } from './lib/timezone.js';

const state = stateFromArg(process.argv[2]);
const cache = join(ROOT, `tmp/timezones-${TZ_RELEASE}.geojson.zip`);
if (!existsSync(cache)) {
  console.log(`Downloading ${TZ_URL} ...`);
  mkdirSync(join(ROOT, 'tmp'), { recursive: true });
  writeFileSync(cache, await getBuffer(TZ_URL));
}
const zones = zonesIn(JSON.parse(zipRead(readFileSync(cache), /\.json$|\.geojson$/).toString('utf8')), state.bbox);
console.log(`${zones.length} time zones overlap ${state.name}: ${zones.map((z) => z.tzid).join(', ')}`);

const places = {};
const problems = [];
for (const c of citiesFor(state.code)) {
  const point = referencePoint(state.code, c);
  const tz = point ? zoneAt(zones, [point.lon, point.lat]) : null;
  if (!tz) problems.push(`${c.slug}: no time zone at ${point ? `${point.lat}, ${point.lon}` : 'missing point'}`);
  places[c.slug] = { point, timezone: tz };
}
if (problems.length) refuse(`${state.code} time zones`, problems);

writeJson(`data/sources/${state.code}/timezone.json`, {
  source: {
    name: `timezone-boundary-builder ${TZ_RELEASE} (time zone boundaries from OpenStreetMap)`,
    url: TZ_URL,
    retrieved: today(),
    licence: 'ODbL 1.0 (© OpenStreetMap contributors)',
  },
  places,
});
const counts = {};
for (const v of Object.values(places)) counts[v.timezone] = (counts[v.timezone] || 0) + 1;
console.log(`Wrote data/sources/${state.code}/timezone.json: ${JSON.stringify(counts)}`);
