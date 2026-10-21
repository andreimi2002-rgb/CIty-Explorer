import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT, read } from './helpers.js';
import { WEATHER_SYMBOL_KEYS, weatherSymbol } from '../js/weather-symbols.js';

const dict = JSON.parse(read('i18n/en.json'));
const icons = readdirSync(join(ROOT, 'icons/weather')).filter((f) => f.endsWith('.svg'));
const legend = read('icons/weather/legend.csv').trim().split(/\r?\n/).slice(1).map((l) => l.split(',')[0].trim());

test('every MET symbol in the legend has an i18n key with text', () => {
  assert.equal(legend.length, 41);
  for (const code of legend) {
    assert.ok(WEATHER_SYMBOL_KEYS[code], code);
    assert.ok(dict[WEATHER_SYMBOL_KEYS[code]], WEATHER_SYMBOL_KEYS[code]);
  }
  assert.equal(Object.keys(WEATHER_SYMBOL_KEYS).length, legend.length);
});

test('every icon file maps to a known symbol, and every symbol has an icon', () => {
  for (const f of icons) assert.ok(weatherSymbol(f.slice(0, -4)), f);
  for (const code of legend) {
    assert.ok(icons.includes(`${code}.svg`) || icons.includes(`${code}_day.svg`), code);
  }
});

test('weatherSymbol parses MET codes and rejects anything else', () => {
  assert.deepEqual(weatherSymbol('partlycloudy_night'), { code: 'partlycloudy', key: 'weather.symbol.partlycloudy', icon: '/icons/weather/partlycloudy_night.svg' });
  assert.equal(weatherSymbol('fog').icon, '/icons/weather/fog.svg');
  assert.equal(weatherSymbol('sunny'), null);
  assert.equal(weatherSymbol('../../etc/passwd'), null);
  assert.equal(weatherSymbol(null), null);
});
