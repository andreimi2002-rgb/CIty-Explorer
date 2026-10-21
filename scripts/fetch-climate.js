// Writes data/sources/<state>/climate.json: for each city, the nearest NOAA station with complete
// 1991–2020 monthly normals (max, min, precipitation), its distance and the monthly values.
// Station files are cached in tmp/noaa/ (not committed). Usage: node scripts/fetch-climate.js ca
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { getText } from './lib/http.js';
import { ROOT, stateFromArg, citiesFor, writeJson, today, refuse } from './lib/files.js';
import { referencePoint } from './lib/points.js';
import { INVENTORY_URL, stationUrl, parseInventory, nearestStations, parseStationNormals } from './lib/noaa.js';

const state = stateFromArg(process.argv[2]);
const dir = join(ROOT, 'tmp/noaa');
mkdirSync(dir, { recursive: true });

async function cached(name, url) {
  const path = join(dir, name);
  if (existsSync(path)) return readFileSync(path, 'utf8');
  let text;
  try {
    text = await getText(url, { delayMs: 300 });
  } catch (e) {
    if (/HTTP 404/.test(e.message)) text = ''; // no monthly normals file for this station
    else throw e;
  }
  writeFileSync(path, text);
  return text;
}

const stations = parseInventory(await cached('inventory_30yr.txt', INVENTORY_URL));
const normalsCache = new Map();
async function normalsFor(id) {
  if (!normalsCache.has(id)) {
    const text = await cached(`${id}.csv`, stationUrl(id));
    normalsCache.set(id, text ? parseStationNormals(text) : null);
  }
  return normalsCache.get(id);
}

const places = {};
const problems = [];
const cities = citiesFor(state.code);
for (const [i, c] of cities.entries()) {
  const point = referencePoint(state.code, c);
  if (!point) {
    problems.push(`${c.slug}: no reference point`);
    continue;
  }
  let found = null;
  for (const s of nearestStations(stations, [point.lon, point.lat])) {
    const normals = await normalsFor(s.id);
    if (normals) {
      found = { station: { id: s.id, name: s.name, lat: s.lat, lon: s.lon, elevationM: s.elevationM }, distanceKm: Math.round(s.distanceKm * 10) / 10, normals };
      break;
    }
  }
  if (!found) problems.push(`${c.slug}: no complete station within 150 km`);
  places[c.slug] = { point, ...(found || {}) };
  if ((i + 1) % 50 === 0) console.log(`  ${i + 1}/${cities.length}, ${normalsCache.size} station files read`);
}
if (problems.length) refuse(`${state.code} climate`, problems);

writeJson(`data/sources/${state.code}/climate.json`, {
  source: {
    name: 'NOAA National Centers for Environmental Information, U.S. Climate Normals 1991–2020, monthly',
    url: 'https://www.ncei.noaa.gov/products/land-based-station/us-climate-normals',
    period: '1991–2020',
    retrieved: today(),
    licence: 'Public domain (U.S. government work)',
  },
  places,
});
const d = Object.values(places).map((p) => p.distanceKm).sort((a, b) => a - b);
console.log(`Wrote data/sources/${state.code}/climate.json: ${normalsCache.size} station files read; distance median ${d[Math.floor(d.length / 2)]} km, max ${d.at(-1)} km`);
