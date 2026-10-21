import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createT, parseAttrSpec } from '../js/i18n.js';

test('t returns text and fills placeholders', () => {
  const t = createT({ 'a.b': 'Hello', 'a.c': '{name} · City Explorer', 'a.d': '{n} {unit}' });
  assert.equal(t('a.b'), 'Hello');
  assert.equal(t('a.c', { name: 'Oakland' }), 'Oakland · City Explorer');
  assert.equal(t('a.d', { n: 0, unit: 'km²' }), '0 km²');
});

test('unknown placeholders are left visible, missing keys return the key', () => {
  const t = createT({ 'a.c': '{name} and {other}' });
  assert.equal(t('a.c', { name: 'X' }), 'X and {other}');
  const warn = console.warn;
  console.warn = () => {};
  try {
    assert.equal(t('no.such.key'), 'no.such.key');
    assert.equal(t('toString'), 'toString');
  } finally {
    console.warn = warn;
  }
});

test('parses attribute specs', () => {
  assert.deepEqual(parseAttrSpec('placeholder:search.soon; aria-label : search.label'), [
    ['placeholder', 'search.soon'],
    ['aria-label', 'search.label'],
  ]);
  assert.deepEqual(parseAttrSpec(''), []);
  assert.deepEqual(parseAttrSpec('title:;:x;aria-label:a.b'), [['aria-label', 'a.b']]);
});
