// Census TIGERweb (Generalized ACS2025) URLs and validation. Pure functions.
import { polygons, countPoints, bbox, bboxContains, pointInGeometry, roundGeometry } from '../../js/geo.js';

const TIGERWEB = 'https://tigerweb.geo.census.gov/arcgis/rest/services/Generalized_ACS2025';

export const STATES_LAYER = {
  service: `${TIGERWEB}/State_County/MapServer`,
  id: 7,
  name: 'States 500K',
};

// Cartographic (generalized) boundaries are clipped to the shoreline; the legal TIGER
// boundaries include water (San Francisco reaches 40 km into the ocean).
export const PLACES_LAYER = {
  service: `${TIGERWEB}/Places_CouSub_ConCity_SubMCD/MapServer`,
  id: 10,
  name: 'Incorporated Places 500K',
  vintage: '2025-01-01',
};

export const layerUrl = (layer) => `${layer.service}/${layer.id}`;

export function query(layer, params) {
  const q = new URLSearchParams({ f: 'json', ...params });
  return `${layerUrl(layer)}/query?${q}`;
}

export function placeQueryUrl(geoid) {
  if (!/^\d{7}$/.test(geoid)) throw new Error(`Invalid place GEOID: ${geoid}`);
  return query(PLACES_LAYER, { where: `GEOID='${geoid}'`, outFields: '*', returnGeometry: 'true', outSR: '4326', f: 'geojson' });
}

/** Problems with a state list from the States layer; empty means valid. */
export function validateStates(states) {
  const problems = [];
  if (states.length < 50) problems.push(`only ${states.length} states`);
  const fips = new Set();
  for (const s of states) {
    if (!/^[a-z]{2}$/.test(s.code)) problems.push(`bad code ${s.code}`);
    if (!/^\d{2}$/.test(s.fips)) problems.push(`bad FIPS for ${s.code}: ${s.fips}`);
    if (fips.has(s.fips)) problems.push(`duplicate FIPS ${s.fips}`);
    fips.add(s.fips);
    const [w, so, e, n] = s.bbox || [];
    if (!(w < e && so < n && w >= -180 && e <= 180 && so >= -90 && n <= 90)) problems.push(`bad bbox for ${s.code}`);
  }
  return problems;
}

/** Problems with one place feature from the Places layer; empty means valid. */
export function validatePlace(feature, { geoid, state }) {
  if (!feature) return [`no feature for GEOID ${geoid}`];
  const p = feature.properties || {};
  const g = feature.geometry;
  const problems = [];
  if (p.GEOID !== geoid) problems.push(`GEOID ${p.GEOID} is not ${geoid}`);
  if (p.STATE !== state.fips) problems.push(`STATE ${p.STATE} is not ${state.fips} (${state.code})`);
  if (!p.NAME || !p.BASENAME) problems.push('missing name');
  if (!g || !polygons(g).length) return [...problems, 'missing polygon geometry'];
  if (countPoints(g) < 20) problems.push(`only ${countPoints(g)} points`);
  if (!bboxContains(state.bbox, bbox(g), 0.05)) problems.push(`boundary outside ${state.name}`);
  const point = [Number(p.INTPTLON), Number(p.INTPTLAT)];
  if (!point.every(Number.isFinite)) problems.push('missing internal point');
  else if (!pointInGeometry(point, g)) problems.push('internal point is outside the boundary');
  return problems;
}

/** The boundary record written to data/boundaries/<state>/<slug>.geojson. */
export function buildBoundary(feature, { url, retrieved }) {
  const p = feature.properties;
  return {
    type: 'Feature',
    properties: {
      geoid: p.GEOID,
      name: p.NAME,
      basename: p.BASENAME,
      internalPoint: [Number(Number(p.INTPTLON).toFixed(5)), Number(Number(p.INTPTLAT).toFixed(5))],
      source: {
        name: 'U.S. Census Bureau, TIGERweb Generalized ACS2025, Incorporated Places 500K',
        vintage: PLACES_LAYER.vintage,
        url,
        retrieved,
        licence: 'Public domain (U.S. government work)',
      },
    },
    geometry: roundGeometry(feature.geometry, 5),
  };
}
