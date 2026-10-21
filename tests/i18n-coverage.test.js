// Every visible string comes from i18n/en.json: keys used exist, keys defined are used,
// and the pages and components contain no literal text.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { read, listFiles, PAGES } from './helpers.js';
import { parseAttrSpec } from '../js/i18n.js';

const dict = JSON.parse(read('i18n/en.json'));
const jsFiles = listFiles('js', '.js');

function keysInHtml(html) {
  const keys = [...html.matchAll(/data-i18n="([^"]+)"/g)].map((m) => m[1]);
  for (const m of html.matchAll(/data-i18n-attr="([^"]+)"/g)) keys.push(...parseAttrSpec(m[1]).map(([, k]) => k));
  return keys;
}

// String literals in JS that look like i18n keys ("nav.overview", 'unit.mi2'). Only namespaces
// that exist in en.json count, so strings like the map event 'style.load' are not keys.
const namespaces = new Set(Object.keys(dict).map((k) => k.split('.')[0]));
function keysInJs(src) {
  return [...src.matchAll(/['"`]([a-z][a-zA-Z0-9]*(?:\.[a-zA-Z0-9]+)+)['"`]/g)]
    .map((m) => m[1])
    .filter((k) => !/\.(js|mjs|json|css|html|woff2|svg)$/.test(k) && namespaces.has(k.split('.')[0]));
}

const used = new Set([...PAGES.flatMap((p) => keysInHtml(read(p))), ...jsFiles.flatMap((f) => keysInJs(read(f)))]);

test('en.json is a flat map of non-empty strings', () => {
  for (const [k, v] of Object.entries(dict)) {
    assert.equal(typeof v, 'string', k);
    assert.ok(v.trim().length > 0, k);
  }
});

test('every key used in pages and scripts exists in en.json', () => {
  const missing = [...used].filter((k) => !Object.hasOwn(dict, k));
  assert.deepEqual(missing, []);
});

test('every key in en.json is used', () => {
  const unused = Object.keys(dict).filter((k) => !used.has(k));
  assert.deepEqual(unused, []);
});

test('pages contain no literal visible text', () => {
  for (const page of PAGES) {
    const text = read(page)
      .replace(/<!--[\s\S]*?-->/g, '')
      .replace(/<(script|style)\b[\s\S]*?<\/\1>/g, '')
      .replace(/<svg\b[\s\S]*?<\/svg>/g, '')
      .replace(/<!doctype[^>]*>/i, '')
      .replace(/<[^>]+>/g, '')
      .trim();
    assert.equal(text, '', `${page} has literal text: ${text.slice(0, 80)}`);
    for (const attr of ['aria-label', 'placeholder', 'title', 'alt']) {
      assert.doesNotMatch(read(page), new RegExp(`\\s${attr}="[^"]`), `${page}: literal ${attr}`);
    }
  }
});

test('components do not assign literal text', () => {
  for (const f of jsFiles) {
    const src = read(f);
    assert.doesNotMatch(src, /\.(textContent|innerText|title|placeholder)\s*=\s*['"`][A-Za-z]/, f);
    assert.doesNotMatch(src, /setAttribute\(\s*['"](aria-label|title|placeholder|alt)['"]\s*,\s*['"`][A-Za-z]/, f);
  }
});
