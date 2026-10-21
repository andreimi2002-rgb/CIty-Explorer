// Writes data/index.json: every city that has data, grouped by state, for the home page.
// Built only from the data files (no city or state list in code).
// Usage: node scripts/build-index.js   (run after fetch-boundary.js and fetch-photos.js)
import { readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT, readJson, writeJson, refuse } from './lib/files.js';
import { buildIndex } from './lib/index.js';

const { states } = readJson('data/reference/states.json');
const dir = join(ROOT, 'data/boundaries');
const entries = [];
for (const code of existsSync(dir) ? readdirSync(dir).sort() : []) {
  for (const f of readdirSync(join(dir, code)).filter((n) => n.endsWith('.geojson')).sort()) {
    const slug = f.slice(0, -'.geojson'.length);
    const photosPath = `data/photos/${code}/${slug}.json`;
    entries.push({
      state: code,
      slug,
      boundary: readJson(`data/boundaries/${code}/${f}`),
      photos: existsSync(join(ROOT, photosPath)) ? readJson(photosPath) : null,
    });
  }
}

const { index, problems } = buildIndex(entries, states);
if (problems.length) refuse('data/index.json', problems);
writeJson('data/index.json', index);
console.log(`Wrote data/index.json: ${index.states.map((s) => `${s.name} (${s.cities.length})`).join(', ') || 'no cities'}`);
