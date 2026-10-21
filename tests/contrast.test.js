// Colour tokens: the dark theme is defined identically in both places, and text/background
// pairs reach WCAG AA contrast (4.5:1) in the light and the dark theme.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { read } from './helpers.js';

const css = read('styles.css');

function block(selectorRe) {
  const m = css.match(new RegExp(`${selectorRe}\\s*{([^{}]*)}`));
  assert.ok(m, `block ${selectorRe}`);
  return Object.fromEntries([...m[1].matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)].map((x) => [x[1], x[2].trim()]));
}

const light = block('(?<![\\w\\]\\)-]):root');
const darkMedia = block(':root:not\\(\\[data-theme="light"\\]\\)');
const darkAttr = block(':root\\[data-theme="dark"\\]');
const dark = { ...light, ...darkMedia };

function luminance(hex) {
  const n = hex.replace('#', '');
  const full = n.length === 3 ? [...n].map((c) => c + c).join('') : n;
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16) / 255);
  const lin = (c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}
export function contrast(a, b) {
  const [x, y] = [luminance(a), luminance(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
}

// [text token, background token]
const PAIRS = [
  ['--ink', '--bg'], ['--ink', '--surface'], ['--ink', '--surface-2'],
  ['--muted', '--bg'], ['--muted', '--surface'], ['--muted', '--surface-2'],
  ['--accent', '--surface'], ['--accent', '--accent-soft'], ['--accent-ink', '--accent'],
  ['--green', '--surface'], ['--amber', '--surface'], ['--green', '--surface-2'], ['--amber', '--surface-2'],
  ['--side-ink', '--side'], ['--side-ink', '--side-2'], ['--side-strong', '--side-3'],
  ['--side-mute', '--side'], ['--side-mute', '--side-2'],
  ['--photo-ink', '--photo-a'], ['--photo-ink', '--photo-b'],
];

test('dark theme tokens are identical in the media query and in [data-theme="dark"]', () => {
  assert.deepEqual(darkAttr, darkMedia);
});

test('contrast test helper matches known values', () => {
  assert.ok(Math.abs(contrast('#000000', '#ffffff') - 21) < 1e-9);
  assert.ok(Math.abs(contrast('#777777', '#ffffff') - 4.48) < 0.01);
});

for (const [name, tokens] of [['light', light], ['dark', dark]]) {
  test(`text contrast is at least 4.5:1 in the ${name} theme`, () => {
    const failures = [];
    for (const [fg, bg] of PAIRS) {
      assert.ok(tokens[fg] && tokens[bg], `${fg} / ${bg} defined`);
      const ratio = contrast(tokens[fg], tokens[bg]);
      if (ratio < 4.5) failures.push(`${fg} ${tokens[fg]} on ${bg} ${tokens[bg]}: ${ratio.toFixed(2)}`);
    }
    assert.deepEqual(failures, []);
  });
}
