import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  convert, convertPer, formatNumber, formatQuantity, unitFor, isSystem,
  SYSTEMS, DEFAULT_SYSTEM, UNIT_FOR, UNIT_KEYS, DIGITS,
} from '../js/units.js';

const close = (a, b, eps = 1e-9) => assert.ok(Math.abs(a - b) <= eps, `${a} != ${b}`);

test('default system is US and both systems exist', () => {
  assert.equal(DEFAULT_SYSTEM, 'us');
  assert.deepEqual(SYSTEMS, ['us', 'metric']);
  assert.ok(isSystem('metric'));
  assert.ok(!isSystem('imperial'));
  assert.ok(!isSystem(null));
});

test('area: square miles to square kilometres (exact definition)', () => {
  close(convert(1, 'mi2', 'km2'), 2.589988110336);
  close(convert(2.589988110336, 'km2', 'mi2'), 1);
  close(convert(46.91, 'mi2', 'km2'), 121.49634225586, 1e-9);
});

test('length conversions', () => {
  close(convert(1000, 'ft', 'm'), 304.8);
  close(convert(1, 'mi', 'km'), 1.609344);
  close(convert(1, 'in', 'mm'), 25.4);
  close(convert(304.8, 'm', 'ft'), 1000);
});

test('speed conversions (wind from MET in m/s)', () => {
  close(convert(10, 'ms', 'mph'), 22.369362920544024);
  close(convert(10, 'ms', 'kmh'), 36);
  close(convert(1, 'mph', 'kmh'), 1.609344);
  assert.deepEqual(formatQuantity(4, 'ms', 'speed', 'us'), { text: '9', unit: 'mph', computed: true });
  assert.deepEqual(formatQuantity(4, 'ms', 'speed', 'metric'), { text: '14', unit: 'kmh', computed: true });
  assert.throws(() => convert(1, 'ms', 'm'));
});

test('temperature conversions', () => {
  close(convert(32, 'degF', 'degC'), 0);
  close(convert(212, 'degF', 'degC'), 100);
  close(convert(-40, 'degF', 'degC'), -40);
  close(convert(21.2, 'degC', 'degF'), 70.16);
  assert.equal(convert(50, 'degF', 'degF'), 50);
});

test('missing values stay missing, never zero', () => {
  assert.equal(convert(null, 'mi2', 'km2'), null);
  assert.equal(convert(undefined, 'ft', 'm'), null);
  assert.equal(convert(NaN, 'ft', 'm'), null);
  assert.equal(convert(Infinity, 'ft', 'm'), null);
  assert.equal(formatQuantity(null, 'mi2', 'area', 'metric'), null);
  assert.equal(convertPer(null, 'mi2', 'km2'), null);
});

test('refuses to mix dimensions or unknown units', () => {
  assert.throws(() => convert(1, 'mi2', 'km'));
  assert.throws(() => convert(1, 'degF', 'm'));
  assert.throws(() => convert(1, 'acre', 'km2'));
  assert.throws(() => unitFor('area', 'imperial'));
  assert.throws(() => unitFor('pressure', 'us'));
});

test('per-unit values convert the other way', () => {
  // 1 person per mi² is fewer people per km².
  close(convertPer(2.589988110336, 'mi2', 'km2'), 1);
});

test('formatNumber uses Intl and never shows -0', () => {
  assert.equal(formatNumber(873965), '873,965');
  assert.equal(formatNumber(121.4963, { digits: 1 }), '121.5');
  assert.equal(formatNumber(-0.04, { digits: 1 }), '0.0');
  assert.equal(formatNumber(-0.4), '0');
  assert.equal(formatNumber(1234.5, { locale: 'de-DE', digits: 1 }), '1.234,5');
});

test('formatQuantity marks conversions as computed', () => {
  assert.deepEqual(formatQuantity(46.91, 'mi2', 'area', 'us'), { text: '46.9', unit: 'mi2', computed: false });
  assert.deepEqual(formatQuantity(46.91, 'mi2', 'area', 'metric'), { text: '121.5', unit: 'km2', computed: true });
  assert.deepEqual(formatQuantity(925, 'ft', 'elevation', 'metric'), { text: '282', unit: 'm', computed: true });
  assert.deepEqual(formatQuantity(18620, 'mi2', 'area', 'metric', { per: true }), { text: '7,189', unit: 'km2', computed: true });
});

test('every display unit has an i18n key and a default precision', () => {
  for (const q of Object.values(UNIT_FOR)) {
    for (const u of Object.values(q)) {
      assert.ok(UNIT_KEYS[u], `UNIT_KEYS.${u}`);
      assert.ok(Number.isInteger(DIGITS[u]), `DIGITS.${u}`);
    }
  }
});
