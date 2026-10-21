// Writes data/index.json: every city that has data, grouped by state, for the home page.
// Built only from the data files (no city or state list in code).
// Usage: node scripts/build-index.js   (run after fetch-boundary.js and fetch-photos.js)
import { readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT, readJson, writeJson, refuse } from './lib/files.js';
import { buildIndex, buildSearch } from './lib/index.js';
import { alternateNames } from './lib/places.js';

const { states } = readJson('data/reference/states.json');
const dir = join(ROOT, 'data/boundaries');
const entries = [];
for (const code of existsSync(dir) ? readdirSync(dir).sort() : []) {
  for (const f of readdirSync(join(dir, code)).filter((n) => n.endsWith('.geojson')).sort()) {
    const slug = f.slice(0, -'.geojson'.length);
    const photosPath = `data/photos/${code}/${slug}.json`;
    const cityPath = `data/cities/${code}/${slug}.json`;
    entries.push({
      state: code,
      slug,
      boundary: readJson(`data/boundaries/${code}/${f}`),
      photos: existsSync(join(ROOT, photosPath)) ? readJson(photosPath) : null,
      city: existsSync(join(ROOT, cityPath)) ? readJson(cityPath) : null,
    });
  }
}

const { index, problems } = buildIndex(entries, states);
if (problems.length) refuse('data/index.json', problems);
writeJson('data/index.json', index);
// Search list: places of every state that has a place list and city files.
const searchEntries = [];
for (const code of [...new Set(entries.map((e) => e.state))]) {
  const places = new Map(readJson(`data/reference/places-${code}.json`).places.map((p) => [p.slug, p]));
  for (const e of entries.filter((x) => x.state === code)) if (places.has(e.slug)) searchEntries.push({ state: code, place: places.get(e.slug), city: e.city });
}
const search = buildSearch(searchEntries, alternateNames);
writeJson('data/search.json', search, { compact: true });
console.log(`Wrote data/search.json: ${search.length} cities`);
console.log(`Wrote data/index.json: ${index.states.map((s) => `${s.name} (${s.cities.length})`).join(', ') || 'no cities'}`);
