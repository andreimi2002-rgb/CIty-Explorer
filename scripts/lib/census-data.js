// Census tables: Decennial 2020, ACS 5-year Data Profiles, Population Estimates, Gazetteer areas. Pure.

export const ACS_YEAR = 2024; // ACS 5-year 2020–2024
export const ACS_VARS = {
  medianHouseholdIncome: { v: 'DP03_0062', unit: 'USD', dollarYear: 2024, label: 'Median household income' },
  medianHomeValue: { v: 'DP04_0089', unit: 'USD', dollarYear: 2024, label: 'Median value, owner-occupied housing units' },
  bachelorsOrHigher: { v: 'DP02_0068P', unit: '%', label: "Bachelor's degree or higher, population 25 and over" },
  foreignBorn: { v: 'DP02_0094P', unit: '%', label: 'Foreign-born, total population' },
  poverty: { v: 'DP03_0128P', unit: '%', label: 'All people below the poverty level' },
  meanCommute: { v: 'DP03_0025', unit: 'min', label: 'Mean travel time to work, workers 16 and over' },
};

// ACS top codes: the published value means "this amount or more".
const TOP_CODED = { DP03_0062: 250001, DP04_0089: 2000001 };

/** Census API JSON (first row = header) -> array of objects. */
export function apiRows(json) {
  if (!Array.isArray(json) || !Array.isArray(json[0])) throw new Error('unexpected Census API response');
  const [head, ...rows] = json;
  return rows.map((r) => Object.fromEntries(r.map((v, i) => [head[i], v])));
}

/**
 * One ACS value with its margin of error (90%). Negative "jam values" mean no estimate.
 * Returns { value, moe, qualifier?, reliability?, reason? }.
 */
export function acsValue(estimateRaw, moeRaw, variable) {
  const est = Number(estimateRaw);
  const moe = Number(moeRaw);
  if (estimateRaw === null || estimateRaw === undefined || !Number.isFinite(est) || est < 0) {
    return { value: null, moe: null, reason: 'The American Community Survey has no estimate for this place (too few sample cases).' };
  }
  const out = { value: est, moe: null };
  if (Number.isFinite(moe) && moe >= 0) out.moe = moe;
  else if (moe === -555555555) out.moe = 0; // controlled estimate, no sampling error
  if (TOP_CODED[variable] !== undefined && est >= TOP_CODED[variable]) {
    out.value = TOP_CODED[variable] - 1;
    out.qualifier = 'or more';
  }
  // Coefficient of variation = (MOE / 1.645) / estimate; above 30% the Census Bureau advises caution.
  if (out.moe !== null && out.value > 0 && out.moe / 1.645 / out.value > 0.3) out.reliability = 'low';
  return out;
}

/** Parses a city CSV line with quoted fields. */
export function csvLine(line) {
  const out = [];
  let cur = '';
  let q = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (q) {
      if (ch === '"' && line[i + 1] === '"') (cur += '"'), i++;
      else if (ch === '"') q = false;
      else cur += ch;
    } else if (ch === '"') q = true;
    else if (ch === ',') out.push(cur), (cur = '');
    else cur += ch;
  }
  out.push(cur);
  return out;
}

/**
 * Population Estimates "sub-est" file -> Map GEOID -> { base2020, estimates: { year: n } }.
 * Uses incorporated-place rows (SUMLEV 162) of the given state.
 */
export function parsePep(text, fips) {
  const lines = String(text).replace(/^﻿/, '').trim().split(/\r?\n/);
  const head = csvLine(lines[0]);
  const col = (k) => head.indexOf(k);
  const years = head.filter((h) => /^POPESTIMATE\d{4}$/.test(h)).map((h) => Number(h.slice(-4)));
  const map = new Map();
  for (const l of lines.slice(1)) {
    const r = csvLine(l);
    if (r[col('SUMLEV')] !== '162' || r[col('STATE')] !== fips) continue;
    const geoid = fips + r[col('PLACE')];
    map.set(geoid, {
      base2020: Number(r[col('ESTIMATESBASE2020')]),
      estimates: Object.fromEntries(years.map((y) => [y, Number(r[col(`POPESTIMATE${y}`)])])),
    });
  }
  return map;
}

/** Gazetteer rows -> Map GEOID -> { landSqMi, waterSqMi, lsad }. LSAD 57 = census designated place (not incorporated). */
export function gazetteerAreas(rows) {
  return new Map(rows.map((r) => [r.GEOID, { landSqMi: Number(r.ALAND_SQMI), waterSqMi: Number(r.AWATER_SQMI), lsad: r.LSAD }]));
}

/**
 * True when a place was a census designated place (CDP) in the 2020 files: the same GEOID then
 * described another geography than today's city limits (e.g. Mountain House, incorporated in 2024).
 */
export const wasCdpIn2020 = (area2020) => area2020?.lsad === '57';
