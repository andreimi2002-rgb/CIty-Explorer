// Reads secrets for offline scripts from the local .env file (ignored by git) or the environment.
// Never print the values.
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT } from './files.js';

/** Parses KEY=value lines; ignores blank lines and # comments; strips optional quotes. */
export function parseEnv(text) {
  const out = {};
  for (const line of String(text).split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (!m || line.trim().startsWith('#')) continue;
    out[m[1]] = m[2].replace(/^(['"])(.*)\1$/, '$2');
  }
  return out;
}

export function requireSecret(name) {
  const path = join(ROOT, '.env');
  const fromFile = existsSync(path) ? parseEnv(readFileSync(path, 'utf8'))[name] : undefined;
  const value = process.env[name] || fromFile;
  if (!value) {
    console.error(`Missing ${name}. Put a line "${name}=..." in the .env file at the project root (it is ignored by git).`);
    process.exit(1);
  }
  return value;
}
