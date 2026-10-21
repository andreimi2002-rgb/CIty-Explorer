// USGS 3DEP Elevation Point Query Service (EPQS). Pure helpers.

export const EPQS = 'https://epqs.nationalmap.gov/v1/json';

export function epqsUrl({ lon, lat }) {
  return `${EPQS}?x=${lon}&y=${lat}&wkid=4326&units=Meters&includeDate=false`;
}

/** Elevation in metres from an EPQS response, or null when the service has no value (e.g. over water). */
export function parseEpqs(json) {
  const v = Number(json?.value);
  if (!Number.isFinite(v) || v <= -1000 || v > 9000) return null;
  return { metres: Math.round(v * 10) / 10, resolutionM: json.resolution ?? null };
}
