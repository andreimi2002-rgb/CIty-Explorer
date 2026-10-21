// Writes data/sources/<state>/census.json: Census 2020 counts, ACS 5-year 2020–2024 profile values
// (with margins of error), Population Estimates Vintage 2025 and Gazetteer land/water areas 2020 and 2025.
// Needs CENSUS_API_KEY in .env (Decennial and ACS); the files need no key.
// Usage: node scripts/fetch-census.js ca
import { getJson, getText } from './lib/http.js';
import { stateFromArg, citiesFor, writeJson, today, refuse } from './lib/files.js';
import { requireSecret } from './lib/env.js';
import { parseGazetteer } from './lib/places.js';
import { ACS_YEAR, ACS_VARS, apiRows, acsValue, parsePep, gazetteerAreas } from './lib/census-data.js';

const state = stateFromArg(process.argv[2]);
const key = requireSecret('CENSUS_API_KEY');
const cities = citiesFor(state.code);

const URLS = {
  decennial: `https://api.census.gov/data/2020/dec/dhc?get=NAME,P1_001N&for=place:*&in=state:${state.fips}`,
  acs: `https://api.census.gov/data/${ACS_YEAR}/acs/acs5/profile?get=NAME,${Object.values(ACS_VARS)
    .flatMap(({ v }) => [`${v}E`, `${v}M`])
    .join(',')}&for=place:*&in=state:${state.fips}`,
  pep: `https://www2.census.gov/programs-surveys/popest/datasets/2020-2025/cities/totals/sub-est2025_${Number(state.fips)}.csv`,
  gaz2020: `https://www2.census.gov/geo/docs/maps-data/data/gazetteer/2020_Gazetteer/2020_gaz_place_${state.fips}.txt`,
  gaz2025: `https://www2.census.gov/geo/docs/maps-data/data/gazetteer/2025_Gazetteer/2025_gaz_place_${state.fips}.txt`,
};
const withKey = (url) => `${url}&key=${encodeURIComponent(key)}`;

const byGeoid = (rows) => new Map(rows.map((r) => [r.state + r.place, r]));
const dec = byGeoid(apiRows(await getJson(withKey(URLS.decennial))));
const acs = byGeoid(apiRows(await getJson(withKey(URLS.acs))));
const pep = parsePep(await getText(URLS.pep), state.fips);
const gaz2020 = gazetteerAreas(parseGazetteer(await getText(URLS.gaz2020)));
const gaz2025 = gazetteerAreas(parseGazetteer(await getText(URLS.gaz2025)));

const problems = [];
const places = {};
for (const c of cities) {
  const d = dec.get(c.geoid);
  const a = acs.get(c.geoid);
  const p = pep.get(c.geoid);
  const g25 = gaz2025.get(c.geoid);
  if (!g25) problems.push(`${c.slug}: not in the 2025 Gazetteer`);
  if (!p) problems.push(`${c.slug}: no Population Estimates row`);
  places[c.slug] = {
    geoid: c.geoid,
    census2020: d ? Number(d.P1_001N) : null, // places incorporated after 2020 have no 2020 count
    estimates: p ?? null,
    area2020: gaz2020.get(c.geoid) ?? null,
    area2025: g25 ?? null,
    acs: a
      ? Object.fromEntries(Object.entries(ACS_VARS).map(([k, { v }]) => [k, acsValue(a[`${v}E`], a[`${v}M`], v)]))
      : null,
  };
  if (d && !(places[c.slug].census2020 >= 0)) problems.push(`${c.slug}: bad 2020 count ${d.P1_001N}`);
}

const missing2020 = Object.entries(places).filter(([, v]) => v.census2020 === null).map(([k]) => k);
const missingAcs = Object.entries(places).filter(([, v]) => v.acs === null).map(([k]) => k);
if (missing2020.length > 5) problems.push(`too many places without a 2020 count: ${missing2020.join(', ')}`);
if (missingAcs.length > 5) problems.push(`too many places without ACS: ${missingAcs.join(', ')}`);
if (problems.length) refuse(`${state.code} census`, problems);

// The key is never written: URLs are stored without it.
writeJson(`data/sources/${state.code}/census.json`, {
  source: {
    decennial: { name: 'U.S. Census Bureau, 2020 Census Demographic and Housing Characteristics (DHC), P1_001N', url: URLS.decennial, period: '2020-04-01', retrieved: today(), licence: 'Public domain (U.S. government work)' },
    acs: { name: `U.S. Census Bureau, American Community Survey 5-year estimates ${ACS_YEAR - 4}–${ACS_YEAR}, Data Profiles`, url: URLS.acs, period: `${ACS_YEAR - 4}–${ACS_YEAR}`, retrieved: today(), licence: 'Public domain (U.S. government work)' },
    pep: { name: 'U.S. Census Bureau, Population Estimates Program, Vintage 2025, cities and towns', url: URLS.pep, period: '2025-07-01', retrieved: today(), licence: 'Public domain (U.S. government work)' },
    gaz2020: { name: 'U.S. Census Bureau, 2020 Gazetteer Files, places', url: URLS.gaz2020, retrieved: today(), licence: 'Public domain (U.S. government work)' },
    gaz2025: { name: 'U.S. Census Bureau, 2025 Gazetteer Files, places', url: URLS.gaz2025, retrieved: today(), licence: 'Public domain (U.S. government work)' },
  },
  places,
});
console.log(`Wrote data/sources/${state.code}/census.json: ${cities.length} places; without 2020 count: ${missing2020.join(', ') || 'none'}; without ACS: ${missingAcs.join(', ') || 'none'}`);
