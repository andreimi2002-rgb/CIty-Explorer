// NOAA NCEI U.S. Climate Normals 1991–2020 (monthly). Pure helpers.
import { csvLine } from './census-data.js';
import { distanceKm } from '../../js/geo.js';

export const NORMALS_BASE = 'https://www.ncei.noaa.gov/data/normals-monthly/1991-2020';
export const INVENTORY_URL = `${NORMALS_BASE}/doc/inventory_30yr.txt`;
export const stationUrl = (id) => `${NORMALS_BASE}/access/${id}.csv`;

/** Fixed-width inventory: ID, LAT, LON, ELEV(m), STATE, NAME. */
export function parseInventory(text) {
  return String(text)
    .split(/\r?\n/)
    .filter((l) => l.trim())
    .map((l) => ({
      id: l.slice(0, 11).trim(),
      lat: Number(l.slice(12, 20)),
      lon: Number(l.slice(21, 30)),
      elevationM: Number(l.slice(31, 37)),
      state: l.slice(38, 40).trim(),
      name: l.slice(41, 71).trim(),
    }))
    .filter((s) => s.id && Number.isFinite(s.lat) && Number.isFinite(s.lon));
}

/** Stations sorted by distance from [lon, lat], within maxKm. */
export function nearestStations(stations, point, maxKm = 150) {
  return stations
    .map((s) => ({ ...s, distanceKm: distanceKm(point, [s.lon, s.lat]) }))
    .filter((s) => s.distanceKm <= maxKm)
    .sort((a, b) => a.distanceKm - b.distanceKm);
}

const VARS = { tmaxF: 'MLY-TMAX-NORMAL', tminF: 'MLY-TMIN-NORMAL', prcpIn: 'MLY-PRCP-NORMAL' };

/**
 * Monthly normals from a station CSV. Returns null unless max, min and precipitation exist for all
 * 12 months. Missing values in NCEI files are blank or below -7000 (e.g. -7777, -9999).
 */
export function parseStationNormals(text) {
  const lines = String(text).trim().split(/\r?\n/);
  const head = csvLine(lines[0]);
  const rows = lines.slice(1).map(csvLine);
  if (rows.length !== 12) return null;
  const out = {};
  for (const [key, col] of Object.entries(VARS)) {
    const i = head.indexOf(col);
    if (i < 0) return null;
    const values = rows.map((r) => (r[i] === undefined || r[i].trim() === '' ? NaN : Number(r[i])));
    if (values.some((v) => !Number.isFinite(v) || v < -7000)) return null;
    out[key] = values;
    const flag = head.indexOf(`comp_flag_${col}`);
    out[`${key}Flags`] = flag >= 0 ? rows.map((r) => r[flag].trim()) : null;
  }
  return out;
}

const round = (v, d) => Math.round(v * 10 ** d) / 10 ** d;

/** Annual values computed from monthly normals: mean of highs and lows (°F), total precipitation (in). */
export function annual({ tmaxF, tminF, prcpIn }) {
  const mean = (a) => a.reduce((s, v) => s + v, 0) / a.length;
  return {
    tmaxF: round(mean(tmaxF), 1),
    tminF: round(mean(tminF), 1),
    prcpIn: round(prcpIn.reduce((s, v) => s + v, 0), 2),
    warmestMonth: tmaxF.indexOf(Math.max(...tmaxF)) + 1,
    wettestMonth: prcpIn.indexOf(Math.max(...prcpIn)) + 1,
  };
}
