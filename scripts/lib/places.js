// The list of a state's incorporated places: Census Gazetteer rows linked to GNIS and Wikidata. Pure.

/** URL-safe slug from a place name: "La Cañada Flintridge" -> "la-canada-flintridge". */
export function slugify(name) {
  return String(name)
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** Name comparison key: no accents, no case, no punctuation. */
export const nameKey = (s) => slugify(s).replace(/-/g, ' ');

/** Parses a Gazetteer place file (2020 uses tabs, 2025 uses "|"); trims padded fields. */
export function parseGazetteer(text) {
  const lines = String(text).replace(/^﻿/, '').trim().split(/\r?\n/);
  const sep = lines[0].includes('|') ? '|' : '\t';
  const head = lines[0].split(sep).map((h) => h.trim());
  return lines.slice(1).map((l) => Object.fromEntries(l.split(sep).map((v, i) => [head[i], v.trim()])));
}

// LSAD codes for incorporated places in Gazetteer files: 25 city, 43 town (57 = CDP, not incorporated).
const LSAD_TYPES = { 25: 'city', 43: 'town', 47: 'village', 21: 'borough', 37: 'municipality' };

export const isIncorporated = (row) => row.LSAD !== '57' && row.FUNCSTAT !== 'S';

/** "San Francisco city" -> "San Francisco" (the LSAD word is the suffix). */
export function baseName(row) {
  const type = LSAD_TYPES[Number(row.LSAD)];
  return type && row.NAME.endsWith(` ${type}`) ? row.NAME.slice(0, -type.length - 1) : row.NAME;
}

export const placeType = (row) => LSAD_TYPES[Number(row.LSAD)] ?? null;

/** Parses the GNIS DomesticNames text file into a Map feature_id -> record. */
export function parseGnis(text) {
  const lines = String(text).replace(/^﻿/, '').trim().split(/\r?\n/);
  const head = lines[0].split('|');
  const idx = (k) => head.indexOf(k);
  const [id, name, cls, county, countyName, lat, lon] = ['feature_id', 'feature_name', 'feature_class', 'county_numeric', 'county_name', 'prim_lat_dec', 'prim_long_dec'].map(idx);
  const map = new Map();
  for (const l of lines.slice(1)) {
    const f = l.split('|');
    map.set(String(Number(f[id])), { id: String(Number(f[id])), name: f[name], cls: f[cls], county: f[county], countyName: f[countyName], lat: Number(f[lat]), lon: Number(f[lon]) });
  }
  return map;
}

/**
 * Names GNIS may use for a Census place name: "San Buenaventura (Ventura)" -> also "Ventura" and
 * "San Buenaventura"; "St. Helena" -> also "Saint Helena"; "Suisun City" -> also "Suisun".
 */
export function alternateNames(name) {
  const out = [name];
  const paren = name.match(/^(.*?)\s*\(([^)]+)\)\s*$/);
  if (paren) out.push(paren[2], paren[1]);
  for (const n of [...out]) {
    if (/^St\.?\s/.test(n)) out.push(n.replace(/^St\.?\s/, 'Saint '));
    if (/\sCity$/.test(n)) out.push(n.replace(/\sCity$/, ''));
  }
  return [...new Set(out)];
}

const dist2 =(a, b) => (a.lat - b.lat) ** 2 + ((a.lon - b.lon) * Math.cos((a.lat * Math.PI) / 180)) ** 2;

/**
 * The GNIS "Populated Place" for a city: same name, same county as the city's Civil record;
 * if several, the closest to the Civil point. Returns the record or null.
 */
export function populatedPlaceFor(civil, name, byName) {
  if (!civil) return null;
  const keys = new Set(alternateNames(name).map(nameKey));
  const candidates = [...keys]
    .flatMap((k) => byName.get(k) || [])
    .filter((r) => r.cls === 'Populated Place' && r.county === civil.county);
  if (!candidates.length) return null;
  return candidates.reduce((a, b) => (dist2(b, civil) < dist2(a, civil) ? b : a));
}

/** Index of GNIS records by name key (only the classes we need). */
export function gnisByName(gnis) {
  const m = new Map();
  for (const r of gnis.values()) {
    if (r.cls !== 'Populated Place') continue;
    const k = nameKey(r.name);
    if (!m.has(k)) m.set(k, []);
    m.get(k).push(r);
  }
  return m;
}

/**
 * Builds the place list. wikidataByGnis: Map gnisId -> [qid]. Returns { places, problems, notes }.
 * Wikidata is found by the Civil GNIS id first, then by the Populated Place GNIS id.
 */
export function buildPlaces(rows, gnis, wikidataByGnis, state) {
  const byName = gnisByName(gnis);
  const places = [];
  const problems = [];
  const notes = [];
  const slugs = new Set();
  for (const row of rows.filter(isIncorporated)) {
    const name = baseName(row);
    // "San Buenaventura (Ventura)": the address uses the common name in parentheses.
    const slug = slugify(name.match(/\(([^)]+)\)\s*$/)?.[1] ?? name);
    if (slugs.has(slug)) problems.push(`duplicate slug ${slug}`);
    slugs.add(slug);
    const civilId = String(Number(row.ANSICODE));
    const civil = gnis.get(civilId);
    if (!civil) notes.push(`${name}: Civil GNIS ${civilId} not in the GNIS file`);
    const place = populatedPlaceFor(civil, name, byName);
    if (!place) notes.push(`${name}: no GNIS Populated Place; using the Census internal point`);
    const viaCivil = wikidataByGnis.get(civilId) || [];
    const viaPlace = place ? wikidataByGnis.get(place.id) || [] : [];
    const qids = viaCivil.length ? viaCivil : viaPlace;
    if (!viaCivil.length && viaPlace.length) notes.push(`${name}: Wikidata found through the Populated Place GNIS ${place.id}`);
    if (qids.length > 1) problems.push(`${name}: several Wikidata items ${qids.join(', ')}`);
    if (!qids.length) notes.push(`${name}: no Wikidata item`);
    places.push({
      slug,
      geoid: row.GEOID,
      name,
      censusName: row.NAME,
      type: placeType(row),
      // County of the city's GNIS Civil record (the seat of its government for multi-county cities).
      county: civil?.countyName ? `${civil.countyName} County` : null,
      gnisCivil: civilId,
      gnisPlace: place?.id ?? null,
      wikidata: qids.length === 1 ? qids[0] : null,
      point: place
        ? { lon: Number(place.lon.toFixed(5)), lat: Number(place.lat.toFixed(5)), source: 'gnis' }
        : null,
    });
  }
  if (!places.length) problems.push(`no incorporated places for ${state}`);
  places.sort((a, b) => a.slug.localeCompare(b.slug));
  return { places, problems, notes };
}
