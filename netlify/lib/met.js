// MET Norway Locationforecast 2.0 (compact): request rules and response summary. Pure functions.
// Terms: https://api.met.no/doc/TermsOfService — identify with a User-Agent, at most 4 decimals,
// respect Expires. Data licence: CC BY 4.0 (and NLOD 2.0).

export const MET_URL = 'https://api.met.no/weatherapi/locationforecast/2.0/compact';
export const USER_AGENT = 'CityExplorer/0.2 city-explorer-pro.netlify.app github.com/andreimi2002-rgb/CIty-Explorer';
export const SOURCE = {
  name: 'MET Norway, Locationforecast 2.0',
  licence: 'CC BY 4.0',
  url: 'https://api.met.no/weatherapi/locationforecast/2.0/documentation',
};

/** Reads lat/lon from the query string; returns { lat, lon } rounded to 4 decimals, or { error }. */
export function parseCoords(params) {
  const raw = { lat: params.get('lat'), lon: params.get('lon') };
  if (raw.lat === null || raw.lon === null || raw.lat.trim() === '' || raw.lon.trim() === '') return { error: 'lat and lon are required' };
  const lat = Number(raw.lat);
  const lon = Number(raw.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return { error: 'lat and lon must be numbers' };
  if (lat < -90 || lat > 90 || lon < -180 || lon > 180) return { error: 'lat or lon out of range' };
  const r = (v) => Math.round(v * 1e4) / 1e4;
  return { lat: r(lat), lon: r(lon) };
}

export function metUrl({ lat, lon }) {
  return `${MET_URL}?lat=${lat}&lon=${lon}`;
}

/** The forecast step for "now": the latest step that has started, otherwise the first one. */
function currentStep(series, now) {
  let pick = series[0];
  for (const s of series) if (Date.parse(s.time) <= now) pick = s;
  return pick;
}

/** The few values the page shows. Throws if the response is not a Locationforecast. */
export function summarize(met, now = Date.now()) {
  const series = met?.properties?.timeseries;
  if (!Array.isArray(series) || !series.length) throw new Error('no timeseries in MET response');
  const step = currentStep(series, now);
  const d = step.data?.instant?.details;
  if (!d || !Number.isFinite(d.air_temperature)) throw new Error('no air temperature in MET response');
  const next = step.data.next_1_hours || step.data.next_6_hours || null;
  const num = (v) => (Number.isFinite(v) ? v : null);
  return {
    updatedAt: met.properties.meta?.updated_at ?? null,
    time: step.time,
    temperatureC: d.air_temperature,
    windSpeedMs: num(d.wind_speed),
    windFromDeg: num(d.wind_from_direction),
    symbol: next?.summary?.symbol_code ?? null,
    precipitationMm: num(step.data.next_1_hours?.details?.precipitation_amount),
  };
}

/** Seconds until MET's Expires header, kept between 1 and 60 minutes; 10 minutes when missing. */
export function cacheSeconds(expires, now = Date.now()) {
  const t = Date.parse(expires || '');
  if (!Number.isFinite(t)) return 600;
  return Math.min(3600, Math.max(60, Math.round((t - now) / 1000)));
}
