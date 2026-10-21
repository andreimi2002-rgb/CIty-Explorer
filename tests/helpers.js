import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = fileURLToPath(new URL('..', import.meta.url));

export const read = (path) => readFileSync(join(ROOT, path), 'utf8');

/** Lists files under dir (relative to the repo root), recursively, matching the extension. */
export function listFiles(dir, ext) {
  const out = [];
  const walk = (abs) => {
    for (const name of readdirSync(abs)) {
      const p = join(abs, name);
      if (statSync(p).isDirectory()) walk(p);
      else if (p.endsWith(ext)) out.push(relative(ROOT, p).replaceAll('\\', '/'));
    }
  };
  walk(join(ROOT, dir));
  return out;
}

export const PAGES = ['index.html', 'city.html'];
