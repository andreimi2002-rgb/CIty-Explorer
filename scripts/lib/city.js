// Builds one city file (data/cities/<state>/<slug>.json) from the prepared sources. Pure.
// Every fact has exactly one level: sourced (with source), computed (with formula and inputs),
// or estimated (with basis). A missing value is null with a reason.
import { ACS_VARS } from './census-data.js';
import { annual } from './noaa.js';
import { distanceKm } from '../../js/geo.js';
import { PLACES_LAYER, layerUrl } from './census.js';

const round = (v, d) => Math.round(v * 10 ** d) / 10 ** d;
const missing = (reason, extra = {}) => ({ value: null, reason, ...extra });

/** Source registry entries, keyed by id, from the source files' metadata. */
export function sourcesFrom({ census, elevation, timezone, climate, places }) {
  return {
    census2020: census.source.decennial,
    pep2025: census.source.pep,
    acs: census.source.acs,
    gaz2020: census.source.gaz2020,
    gaz2025: census.source.gaz2025,
    gnis: places.source.gnis,
    wikidata: places.source.wikidata,
    usgs3dep: elevation.source,
    tz: timezone.source,
    noaa: climate.source,
    tigerweb: {
      name: 'U.S. Census Bureau, TIGERweb Generalized ACS2025, Incorporated Places 500K (internal point)',
      url: layerUrl(PLACES_LAYER),
      vintage: PLACES_LAYER.vintage,
      licence: 'Public domain (U.S. government work)',
    },
  };
}

/**
 * place: entry of places-<state>.json; c: census.places[slug]; e: elevation.places[slug];
 * tz: timezone.places[slug]; cl: climate.places[slug]. Returns { city, problems }.
 */
export function buildCity(state, place, { c, e, tz, cl }, sources) {
  const problems = [];
  const facts = {};
  const point = e?.point ?? tz?.point ?? cl?.point ?? null;

  // Population
  facts['population.census2020'] =
    c?.census2020 != null
      ? { value: c.census2020, unit: 'people', level: 'sourced', source: 'census2020', period: '2020-04-01' }
      : missing('There is no 2020 Census count for this city: it was not an incorporated place on April 1, 2020.', { unit: 'people', period: '2020-04-01' });
  const est = c?.estimates;
  facts['population.estimate2025'] =
    est?.estimates?.[2025] > 0
      ? { value: est.estimates[2025], unit: 'people', level: 'sourced', source: 'pep2025', period: '2025-07-01' }
      : missing('No Census Bureau population estimate for July 1, 2025.', { unit: 'people', period: '2025-07-01' });
  facts['population.base2020'] =
    est?.base2020 > 0
      ? { value: est.base2020, unit: 'people', level: 'sourced', source: 'pep2025', period: '2020-04-01', note: 'Estimates base (the starting point of the Census Bureau estimates series), not the Census count.' }
      : missing('No estimates base for 2020.', { unit: 'people', period: '2020-04-01' });
  facts['population.change'] =
    facts['population.estimate2025'].value && facts['population.base2020'].value
      ? {
          value: round(((est.estimates[2025] - est.base2020) / est.base2020) * 100, 2),
          unit: '%',
          level: 'computed',
          formula: '(estimate 2025 − estimates base 2020) ÷ estimates base 2020 × 100',
          inputs: ['population.estimate2025', 'population.base2020'],
          period: '2020-04-01/2025-07-01',
        }
      : missing('Needs both the 2025 estimate and the 2020 estimates base.', { unit: '%' });

  // Area (land and water, square miles as published)
  const a25 = c?.area2025;
  const a20 = c?.area2020;
  facts['area.land2025'] = a25 ? { value: a25.landSqMi, unit: 'mi2', level: 'sourced', source: 'gaz2025', period: '2025-01-01' } : missing('Not in the 2025 Gazetteer.', { unit: 'mi2' });
  facts['area.water2025'] = a25 ? { value: a25.waterSqMi, unit: 'mi2', level: 'sourced', source: 'gaz2025', period: '2025-01-01' } : missing('Not in the 2025 Gazetteer.', { unit: 'mi2' });
  facts['area.land2020'] = a20 ? { value: a20.landSqMi, unit: 'mi2', level: 'sourced', source: 'gaz2020', period: '2020-01-01' } : missing('Not in the 2020 Gazetteer: the city did not exist as an incorporated place in 2020.', { unit: 'mi2' });

  // Density: population and land area of the same year only.
  const density = (popKey, landKey, period) =>
    facts[popKey].value && facts[landKey].value
      ? {
          value: round(facts[popKey].value / facts[landKey].value, 1),
          unit: 'people/mi2',
          level: 'computed',
          formula: `${popKey === 'population.census2020' ? 'Census 2020 population' : 'population estimate 2025'} ÷ land area ${period}`,
          inputs: [popKey, landKey],
          period,
        }
      : missing(`Needs the ${period} population and the ${period} land area.`, { unit: 'people/mi2', period });
  facts['density.2020'] = density('population.census2020', 'area.land2020', '2020');
  facts['density.2025'] = density('population.estimate2025', 'area.land2025', '2025');

  // Elevation and time zone at the reference point
  facts.elevation = e?.elevation
    ? { value: e.elevation.metres, unit: 'm', level: 'sourced', source: 'usgs3dep', note: 'Ground elevation at the city reference point.' }
    : missing('The USGS elevation service has no value at the reference point.', { unit: 'm' });
  facts.timezone = tz?.timezone ? { value: tz.timezone, level: 'sourced', source: 'tz' } : missing('No time zone found for the reference point.');

  // ACS 5-year 2020–2024
  for (const [key, def] of Object.entries(ACS_VARS)) {
    const v = c?.acs?.[key];
    const base = { unit: def.unit, period: sources.acs.period, ...(def.dollarYear ? { dollarYear: def.dollarYear, currency: 'USD' } : {}) };
    facts[`acs.${key}`] =
      v && v.value !== null
        ? { value: v.value, ...base, level: 'sourced', source: 'acs', moe: v.moe, ...(v.qualifier ? { qualifier: v.qualifier } : {}), ...(v.reliability ? { reliability: v.reliability } : {}) }
        : missing(v?.reason ?? 'No American Community Survey estimate for this place.', base);
  }

  // Climate normals 1991–2020 from the nearest complete NOAA station
  if (cl?.normals) {
    facts['climate.monthly'] = {
      value: { tmaxF: cl.normals.tmaxF, tminF: cl.normals.tminF, prcpIn: cl.normals.prcpIn },
      unit: { tmaxF: 'degF', tminF: 'degF', prcpIn: 'in' },
      level: 'sourced',
      source: 'noaa',
      period: '1991–2020',
    };
    facts['climate.annual'] = {
      value: annual(cl.normals),
      unit: { tmaxF: 'degF', tminF: 'degF', prcpIn: 'in' },
      level: 'computed',
      formula: 'average of the 12 monthly normal highs and lows; sum of the 12 monthly precipitation normals',
      inputs: ['climate.monthly'],
      period: '1991–2020',
    };
    facts['climate.station'] = { value: cl.station, level: 'sourced', source: 'noaa' };
    facts['climate.stationDistance'] = {
      value: point ? round(distanceKm([point.lon, point.lat], [cl.station.lon, cl.station.lat]), 1) : cl.distanceKm,
      unit: 'km',
      level: 'computed',
      formula: 'great-circle distance from the city reference point to the station',
      inputs: ['referencePoint', 'climate.station'],
    };
  } else {
    facts['climate.monthly'] = missing('No NOAA station with complete 1991–2020 normals within 150 km.');
  }

  // Checks
  const pop = facts['population.estimate2025'].value;
  if (!(pop > 0)) problems.push('no 2025 population');
  if (!(facts['area.land2025'].value > 0)) problems.push('no land area');
  const d = facts['density.2025'].value;
  if (d !== null && (d <= 0 || d > 60000)) problems.push(`implausible density ${d}`);
  if (!point) problems.push('no reference point');

  const city = {
    id: { state, slug: place.slug, geoid: place.geoid, gnisCivil: place.gnisCivil, gnisPlace: place.gnisPlace, wikidata: place.wikidata },
    name: place.name,
    censusName: place.censusName,
    type: place.type,
    referencePoint: point ? { ...point, level: 'sourced', source: point.source === 'gnis' ? 'gnis' : 'tigerweb' } : null,
    facts,
    sources,
    conflicts: [],
  };
  return { city, problems };
}
