// Writes data/photos/<state>/<slug>.json for every curated city of a state:
// hero photo (curated file, otherwise Wikidata P18) and highlight cards (Wikidata label,
// description, coordinates and P18 image), each photo with author, licence and a checked URL.
// Usage: node scripts/fetch-photos.js ca
import { getJson, checkUrl } from './lib/http.js';
import { stateFromArg, curationFor, writeJson, today, refuse } from './lib/files.js';
import { COMMONS_API, photoProblems, photoRecord, validFocus } from './lib/commons.js';
import { entitiesUrl, parseEntity } from './lib/wikidata.js';

const HERO_WIDTH = 1920;
const CARD_WIDTH = 960;

async function imageInfo(files, width) {
  const q = new URLSearchParams({
    action: 'query',
    format: 'json',
    prop: 'imageinfo',
    iiprop: 'url|size|mime|extmetadata',
    iiurlwidth: String(width),
    titles: files.map((f) => `File:${f}`).join('|'),
  });
  const res = await getJson(`${COMMONS_API}?${q}`);
  const renamed = Object.fromEntries((res.query.normalized || []).map((n) => [n.to, n.from]));
  const out = {};
  for (const page of Object.values(res.query.pages)) {
    const asked = (renamed[page.title] || page.title).replace(/^File:/, '');
    out[asked] = page.imageinfo?.[0] ? { title: page.title, info: page.imageinfo[0] } : null;
  }
  return out;
}

async function checkedPhoto(found, label, problems) {
  if (!found) return problems.push(`${label}: file not found on Commons`), null;
  const p = photoProblems(found.info);
  if (p.length) return problems.push(...p.map((x) => `${label}: ${x}`)), null;
  const record = photoRecord(found.title, found.info);
  const check = await checkUrl(record.src, 'image/');
  if (!check.ok) return problems.push(`${label}: thumbnail answered ${check.status} ${check.type}`), null;
  return record;
}

const state = stateFromArg(process.argv[2]);
const cities = curationFor(state.code);
if (!cities.length) refuse(state.code, [`no curation files in data/curation/${state.code}/`]);

const results = [];
for (const city of cities) {
  const problems = [];
  const ids = [city.wikidata, ...(city.highlights || [])];
  const entities = (await getJson(entitiesUrl(ids))).entities;
  const parsed = Object.fromEntries(ids.map((id) => [id, parseEntity(entities[id])]));
  const main = parsed[city.wikidata];
  if (!main?.label) problems.push(`${city.wikidata}: no English label`);

  // Hero
  const heroFile = city.hero?.file || main?.image;
  const focus = city.hero?.focus ?? [0.5, 0.5];
  if (!validFocus(focus)) problems.push(`hero focus ${JSON.stringify(focus)} must be two numbers between 0 and 1`);
  let hero = null;
  if (heroFile) {
    const found = (await imageInfo([heroFile], HERO_WIDTH))[heroFile];
    const photo = await checkedPhoto(found, `hero "${heroFile}"`, problems);
    // A smaller copy of the same photo for city cards (home page).
    const small = photo && (await checkedPhoto((await imageInfo([heroFile], CARD_WIDTH))[heroFile], `hero "${heroFile}" (small)`, problems));
    if (photo && small) {
      hero = {
        ...photo,
        srcSmall: small.src,
        widthSmall: small.width,
        heightSmall: small.height,
        focus,
        chosenBy: city.hero ? city.hero.chosenBy : 'wikidata-p18',
        chosenOn: city.hero?.chosenOn ?? null,
      };
    }
  }

  // Highlights
  const highlights = [];
  const cardFiles = (city.highlights || []).map((id) => parsed[id]?.image).filter(Boolean);
  const cardInfo = cardFiles.length ? await imageInfo(cardFiles, CARD_WIDTH) : {};
  for (const id of city.highlights || []) {
    const e = parsed[id];
    if (!e?.label || !e.description) {
      problems.push(`${id}: missing English label or description`);
      continue;
    }
    if (!e.image) {
      problems.push(`${id} (${e.label}): no image (P18)`);
      continue;
    }
    const photo = await checkedPhoto(cardInfo[e.image], `${id} (${e.label})`, problems);
    if (photo) highlights.push({ qid: id, label: e.label, description: e.description, coords: e.coords, photo });
  }

  if (problems.length) refuse(`${state.code}/${city.slug}`, problems);
  results.push([
    city.slug,
    {
      city: { qid: main.qid, label: main.label, description: main.description },
      hero,
      highlights,
      source: {
        wikidata: { name: 'Wikidata', licence: 'CC0 1.0', url: 'https://www.wikidata.org/', retrieved: today() },
        commons: { name: 'Wikimedia Commons', licence: 'per file (see each photo)', url: 'https://commons.wikimedia.org/', retrieved: today() },
      },
    },
  ]);
}

for (const [slug, data] of results) {
  writeJson(`data/photos/${state.code}/${slug}.json`, data);
  console.log(`Wrote data/photos/${state.code}/${slug}.json: hero ${data.hero ? data.hero.file : 'none'}, ${data.highlights.length} highlights`);
}
