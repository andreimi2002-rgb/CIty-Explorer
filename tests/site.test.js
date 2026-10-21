// Site configuration: Netlify rewrite, page basics, self-hosted assets only, fonts and licences.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT, read, listFiles, PAGES } from './helpers.js';

test('netlify.toml publishes the root and rewrites city pages to city.html (status 200)', () => {
  const toml = read('netlify.toml');
  assert.match(toml, /publish\s*=\s*"\."/);
  assert.doesNotMatch(toml, /^\s*command\s*=/m, 'no build command');
  const block = toml.split('[[redirects]]').slice(1).find((b) => /from\s*=\s*"\/city\/:state\/:slug"/.test(b));
  assert.ok(block, 'redirect for /city/:state/:slug');
  assert.match(block, /to\s*=\s*"\/city\.html"/);
  assert.match(block, /status\s*=\s*200\b/);
});

test('netlify.toml serves the comparison page at /compare', () => {
  const block = read('netlify.toml').split('[[redirects]]').slice(1).find((b) => /from\s*=\s*"\/compare"/.test(b));
  assert.ok(block, 'redirect for /compare');
  assert.match(block, /to\s*=\s*"\/compare\.html"/);
  assert.match(block, /status\s*=\s*200\b/);
});

test('pages declare language, charset and viewport', () => {
  for (const page of PAGES) {
    const html = read(page);
    assert.match(html, /<html lang="en">/, page);
    assert.match(html, /<meta charset="utf-8">/, page);
    assert.match(html, /<meta name="viewport" content="width=device-width,initial-scale=1/, page);
  }
});

test('local assets use absolute paths (city pages live at /city/<state>/<slug>)', () => {
  for (const page of PAGES) {
    for (const m of read(page).matchAll(/\s(?:src|href)="([^"#]+)"/g)) {
      assert.ok(m[1].startsWith('/'), `${page}: ${m[1]} must start with /`);
    }
  }
  for (const m of read('styles.css').matchAll(/url\("?([^")]+)"?\)/g)) {
    assert.ok(m[1].startsWith('/'), `styles.css: ${m[1]}`);
  }
  for (const f of listFiles('js', '.js')) {
    for (const m of read(f).matchAll(/from\s+['"]([^'"]+)['"]/g)) {
      assert.ok(m[1].startsWith('./') || m[1].startsWith('../'), `${f}: import ${m[1]}`);
    }
  }
});

// The only external addresses allowed in site code: the SVG namespace, the OpenFreeMap map styles
// (tiles cannot be self-hosted), and plain links to source and licence pages.
// Photos come from data files (Wikimedia URLs checked by scripts/fetch-photos.js).
const ALLOWED_EXTERNAL = new Set([
  'http://www.w3.org/2000/svg',
  'https://tiles.openfreemap.org/styles/liberty',
  'https://tiles.openfreemap.org/styles/dark',
  'https://openfreemap.org/',
  'https://www.openstreetmap.org/copyright',
  'https://api.met.no/weatherapi/locationforecast/2.0/documentation',
]);

test('no external resources (fonts, CDNs, APIs) in pages, styles or scripts except the allowed list', () => {
  const files = [...PAGES, 'styles.css', ...listFiles('js', '.js')];
  for (const f of files) {
    const urls = [...read(f).matchAll(/https?:\/\/[^\s"'`)]+/g)].map((m) => m[0]);
    const external = urls.filter((u) => !ALLOWED_EXTERNAL.has(u));
    assert.deepEqual(external, [], f);
  }
});

test('the browser never calls MET Norway, Census or Wikidata directly', () => {
  for (const f of listFiles('js', '.js')) {
    assert.doesNotMatch(read(f), /locationforecast\/2\.0\/compact|tigerweb|wikidata\.org\/w\/api/, f);
  }
});

test('every referenced file exists', () => {
  const refs = new Set();
  for (const page of PAGES) for (const m of read(page).matchAll(/\s(?:src|href)="(\/[^"#]+)"/g)) refs.add(m[1]);
  for (const m of read('styles.css').matchAll(/url\("?(\/[^")]+)"?\)/g)) refs.add(m[1]);
  refs.delete('/');
  refs.add('/i18n/en.json');
  for (const r of refs) assert.ok(existsSync(join(ROOT, r)), r);
});

test('every self-hosted font has a licence file and is registered in DATA-LICENSES.md', () => {
  const css = read('styles.css');
  const families = [...css.matchAll(/@font-face\s*{[^}]*font-family:\s*"([^"]+)"/g)].map((m) => m[1]);
  assert.deepEqual(families.sort(), ['JetBrains Mono', 'Plus Jakarta Sans']);
  const registry = read('DATA-LICENSES.md');
  for (const family of families) {
    const slug = family.toLowerCase().replaceAll(' ', '-');
    assert.ok(existsSync(join(ROOT, `fonts/OFL-${slug}.txt`)), `licence for ${family}`);
    assert.match(read(`fonts/OFL-${slug}.txt`), /SIL Open Font License, Version 1\.1/);
    assert.ok(registry.includes(family), `${family} in DATA-LICENSES.md`);
  }
  for (const woff of listFiles('fonts', '.woff2')) {
    assert.ok(css.includes(`/${woff}`), `${woff} is used in styles.css`);
  }
});

test('version in package.json has a CHANGELOG entry', () => {
  const { version } = JSON.parse(read('package.json'));
  assert.match(read('CHANGELOG.md'), new RegExp(`## \\[?${version.replaceAll('.', '\\.')}\\]?`));
});
