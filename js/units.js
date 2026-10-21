// Unit systems, conversions and number formatting. Pure functions, no DOM.
// Values are stored in the unit of their source (Census areas in mi², NOAA normals in °F and inches).
// A converted value is "computed" provenance; formatQuantity reports that.

export const SYSTEMS = ['us', 'metric'];
export const DEFAULT_SYSTEM = 'us';

/** Display unit for each kind of quantity in each system. */
export const UNIT_FOR = {
  area: { us: 'mi2', metric: 'km2' },
  elevation: { us: 'ft', metric: 'm' },
  distance: { us: 'mi', metric: 'km' },
  temperature: { us: 'degF', metric: 'degC' },
  precipitation: { us: 'in', metric: 'mm' },
};

/** i18n keys for unit symbols, spelled out so tests can check every key exists. */
export const UNIT_KEYS = {
  mi2: 'unit.mi2',
  km2: 'unit.km2',
  ft: 'unit.ft',
  m: 'unit.m',
  mi: 'unit.mi',
  km: 'unit.km',
  in: 'unit.in',
  mm: 'unit.mm',
  degF: 'unit.degF',
  degC: 'unit.degC',
};

// Exact factors to a base unit (km² for area, metres for length).
const LINEAR = {
  mi2: { dim: 'area', toBase: 2.589988110336 },
  km2: { dim: 'area', toBase: 1 },
  ft: { dim: 'length', toBase: 0.3048 },
  m: { dim: 'length', toBase: 1 },
  mi: { dim: 'length', toBase: 1609.344 },
  km: { dim: 'length', toBase: 1000 },
  in: { dim: 'length', toBase: 0.0254 },
  mm: { dim: 'length', toBase: 0.001 },
};
const TEMPERATURE = new Set(['degF', 'degC']);

/** Default decimals per display unit. */
export const DIGITS = { mi2: 1, km2: 1, ft: 0, m: 0, mi: 1, km: 1, in: 1, mm: 0, degF: 0, degC: 1 };

export function isSystem(value) {
  return SYSTEMS.includes(value);
}

export function unitFor(quantity, system) {
  const units = UNIT_FOR[quantity];
  if (!units) throw new Error(`Unknown quantity: ${quantity}`);
  if (!isSystem(system)) throw new Error(`Unknown unit system: ${system}`);
  return units[system];
}

/** Converts between units of the same dimension. null and non-finite values give null. */
export function convert(value, from, to) {
  if (value === null || value === undefined || !Number.isFinite(value)) return null;
  if (TEMPERATURE.has(from) || TEMPERATURE.has(to)) {
    if (!TEMPERATURE.has(from) || !TEMPERATURE.has(to)) throw new Error(`Cannot convert ${from} to ${to}`);
    if (from === to) return value;
    return from === 'degF' ? ((value - 32) * 5) / 9 : (value * 9) / 5 + 32;
  }
  const a = LINEAR[from];
  const b = LINEAR[to];
  if (!a || !b) throw new Error(`Unknown unit: ${!a ? from : to}`);
  if (a.dim !== b.dim) throw new Error(`Cannot convert ${from} to ${to}`);
  if (from === to) return value;
  return (value * a.toBase) / b.toBase;
}

/** Converts a "per unit" value, e.g. people per mi² to people per km². */
export function convertPer(value, fromUnit, toUnit) {
  const one = convert(1, fromUnit, toUnit);
  return one === null || value === null || value === undefined || !Number.isFinite(value) ? null : value / one;
}

/** Formats a number with Intl; never shows "-0". */
export function formatNumber(value, { locale = 'en-US', digits = 0 } = {}) {
  const factor = 10 ** digits;
  let rounded = Math.round(value * factor) / factor;
  if (Object.is(rounded, -0)) rounded = 0;
  return new Intl.NumberFormat(locale, { minimumFractionDigits: digits, maximumFractionDigits: digits }).format(rounded);
}

/**
 * Prepares a stored value for display in the chosen system.
 * Returns null when the value is missing (the page then shows "Not available yet"), otherwise
 * { text, unit, computed } where computed is true when a conversion was applied.
 */
export function formatQuantity(value, fromUnit, quantity, system, { locale = 'en-US', digits, per = false } = {}) {
  if (value === null || value === undefined || !Number.isFinite(value)) return null;
  const unit = unitFor(quantity, system);
  const converted = per ? convertPer(value, fromUnit, unit) : convert(value, fromUnit, unit);
  const d = digits ?? (per ? 0 : DIGITS[unit]);
  return { text: formatNumber(converted, { locale, digits: d }), unit, computed: unit !== fromUnit };
}
