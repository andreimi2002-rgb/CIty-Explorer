// File helpers for offline scripts. Paths are relative to the repository root.
import { readFileSync, writeFileSync, mkdirSync, readdirSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = fileURLToPath(new URL('../..', import.meta.url));

export function readJson(path) {
  return JSON.parse(readFileSync(join(ROOT, path), 'utf8'));
}

export function writeJson(path, value) {
  const abs = join(ROOT, path);
  mkdirSync(dirname(abs), { recursive: true });
  writeFileSync(abs, JSON.stringify(value, null, 2) + '\n');
}

export function writeText(path, text) {
  const abs = join(ROOT, path);
  mkdirSync(dirname(abs), { recursive: true });
  writeFileSync(abs, text);
}

/** The state record from data/reference/states.json, or an error naming the valid codes. */
export function stateFromArg(code) {
  if (!/^[a-z]{2}$/.test(code || '')) throw new Error('Usage: node scripts/<script>.js <state code, e.g. ca>');
  const { states } = readJson('data/reference/states.json');
  const state = states.find((s) => s.code === code);
  if (!state) throw new Error(`Unknown state "${code}". Run scripts/fetch-states.js first.`);
  return state;
}

/** Curation files of a state: data/curation/<state>/<slug>.json, as [{ slug, ...content }]. */
export function curationFor(state) {
  const dir = join(ROOT, 'data/curation', state);
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((f) => f.endsWith('.json'))
    .sort()
    .map((f) => ({ slug: f.slice(0, -5), ...readJson(`data/curation/${state}/${f}`) }));
}

/**
 * Every place of a state (data/reference/places-<state>.json) merged with its curation file,
 * if any (manual choices: hero photo, highlights, or a corrected Wikidata item).
 * An optional list of slugs limits the result.
 */
export function citiesFor(state, onlySlugs = []) {
  const path = join(ROOT, `data/reference/places-${state}.json`);
  if (!existsSync(path)) throw new Error(`Missing data/reference/places-${state}.json. Run scripts/build-places.js ${state} first.`);
  const curated = new Map(curationFor(state).map((c) => [c.slug, c]));
  const all = readJson(`data/reference/places-${state}.json`).places.map((p) => ({ ...p, ...(curated.get(p.slug) || {}) }));
  if (!onlySlugs.length) return all;
  const unknown = onlySlugs.filter((s) => !all.some((c) => c.slug === s));
  if (unknown.length) throw new Error(`Unknown city: ${unknown.join(', ')}`);
  return all.filter((c) => onlySlugs.includes(c.slug));
}

export const today =() => new Date().toISOString().slice(0, 10);

/** Prints problems and exits with an error; nothing is written. */
export function refuse(what, problems) {
  console.error(`REFUSED ${what}: nothing written.`);
  for (const p of problems) console.error(`  - ${p}`);
  process.exit(1);
}
