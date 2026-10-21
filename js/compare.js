// Comparison rules: default cities, /compare addresses, comparable rows. Pure.
import { distanceKm } from './geo.js';

export const MAX_COMPARE = 5;
const ID_RE = /^[a-z]{2}\/[a-z0-9]+(?:-[a-z0-9]+)*$/;

/**
 * Default comparison for a city: the 2 nearest cities and the 2 with the closest 2025 population,
 * no duplicates, not the city itself. list: data/search.json entries.
 */
export function defaultComparison(id, list, { near = 2, size = 2 } = {}) {
  const me = list.find((c) => c.s === id);
  if (!me) return [];
  const others = list.filter((c) => c.s !== id);
  const chosen = [];
  if (me.ll) {
    const byDistance = others
      .filter((c) => c.ll)
      .map((c) => ({ c, d: distanceKm([me.ll[1], me.ll[0]], [c.ll[1], c.ll[0]]) }))
      .sort((a, b) => a.d - b.d);
    chosen.push(...byDistance.slice(0, near).map((x) => x.c.s));
  }
  if (me.p) {
    const bySize = others
      .filter((c) => c.p && !chosen.includes(c.s))
      .sort((a, b) => Math.abs(a.p - me.p) - Math.abs(b.p - me.p) || b.p - a.p);
    chosen.push(...bySize.slice(0, size).map((c) => c.s));
  }
  return chosen;
}

/** Reads ?cities=ca/a,ca/b: valid ids only, no duplicates, at most MAX_COMPARE. */
export function parseCompareQuery(search) {
  const raw = new URLSearchParams(search).get('cities') || '';
  const ids = [];
  const rejected = [];
  for (const part of raw.split(',').map((s) => s.trim().toLowerCase()).filter(Boolean)) {
    if (!ID_RE.test(part)) rejected.push(part);
    else if (!ids.includes(part)) ids.push(part);
  }
  return { ids: ids.slice(0, MAX_COMPARE), rejected, truncated: ids.length > MAX_COMPARE };
}

export function compareUrl(ids) {
  return `/compare?cities=${ids.slice(0, MAX_COMPARE).join(',')}`;
}

/**
 * The comparison rows, in order. `fact` is the key in data/cities files; `pick` selects a part of an
 * object value (climate annual averages). Every row compares one definition only.
 */
export const COMPARE_ROWS = [
  { id: 'pop2025', fact: 'population.estimate2025', label: 'compare.row.pop2025' },
  { id: 'pop2020', fact: 'population.census2020', label: 'compare.row.pop2020' },
  { id: 'change', fact: 'population.change', label: 'compare.row.change' },
  { id: 'land', fact: 'area.land2025', label: 'compare.row.land' },
  { id: 'density', fact: 'density.2025', label: 'compare.row.density', dna: true },
  { id: 'elevation', fact: 'elevation', label: 'compare.row.elevation' },
  { id: 'income', fact: 'acs.medianHouseholdIncome', label: 'compare.row.income', dna: true },
  { id: 'home', fact: 'acs.medianHomeValue', label: 'compare.row.home' },
  { id: 'degree', fact: 'acs.bachelorsOrHigher', label: 'compare.row.degree', dna: true },
  { id: 'foreign', fact: 'acs.foreignBorn', label: 'compare.row.foreign' },
  { id: 'poverty', fact: 'acs.poverty', label: 'compare.row.poverty' },
  { id: 'commute', fact: 'acs.meanCommute', label: 'compare.row.commute', dna: true },
  { id: 'high', fact: 'climate.annual', pick: 'tmaxF', unit: 'degF', label: 'compare.row.high', dna: true },
  { id: 'low', fact: 'climate.annual', pick: 'tminF', unit: 'degF', label: 'compare.row.low' },
  { id: 'rain', fact: 'climate.annual', pick: 'prcpIn', unit: 'in', label: 'compare.row.rain', dna: true },
  { id: 'station', fact: 'climate.stationDistance', label: 'compare.row.station' },
];

/** The fact shown in a cell: a plain fact, or one part of an object fact (with its own unit). */
export function cellFact(city, row) {
  const f = city?.facts?.[row.fact];
  if (!f) return null;
  if (!row.pick) return f;
  if (f.value === null || f.value === undefined) return { ...f, unit: row.unit };
  return { ...f, value: f.value[row.pick], unit: row.unit };
}

/**
 * Comparability check of one row across cities: same unit, period, dollar year and currency.
 * Returns the list of cities (ids) whose cell does not match the first city with a value.
 */
export function mismatches(cities, row) {
  const cells = cities.map((c) => [c.id, cellFact(c.city, row)]).filter(([, f]) => f && f.value !== null && f.value !== undefined);
  if (!cells.length) return [];
  const key = (f) => JSON.stringify([f.unit, f.period ?? null, f.dollarYear ?? null, f.currency ?? null]);
  const ref = key(cells[0][1]);
  return cells.filter(([, f]) => key(f) !== ref).map(([id]) => id);
}
