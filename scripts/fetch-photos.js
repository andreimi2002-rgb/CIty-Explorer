// Writes data/photos/<state>/<slug>.json for every place of a state (or only the slugs given):
// hero photo (the curated file, otherwise the Wikidata image P18) and, for curated cities, highlight
// cards (Wikidata label, description, coordinates and P18 image). Every photo is checked: allowed
// licence, author, no maps/flags/logos/collages, thumbnail URL answering with an image.
// A curated photo that fails stops the script; an automatic P18 that fails is skipped (fallback panel).
// Usage: node scripts/fetch-photos.js ca [slug ...]
import { getJson, checkUrl } from './lib/http.js';
import { stateFromArg, citiesFor, writeJson, today, refuse } from './lib/files.js';
import { COMMONS_API, photoProblems, photoRecord, validFocus } from './lib/commons.js';
import { entitiesUrl, parseEntity } from './lib/wikidata.js';

const HERO_WIDTH = 1920;
const CARD_WIDTH = 960;
const chunks = (a, n) => Array.from({ length: Math.ceil(a.length / n) }, (_, i) => a.slice(i * n, i * n + n));

async function entities(ids) {
  const out = {};
  for (const part of chunks([...new Set(ids)], 50)) {
    const res = await getJson(entitiesUrl(part));
    for (const id of part) out[id] = parseEntity(res.entities[id]);
  }
  return out;
}

async function imageInfo(files, width) {
  const out = {};
  for (const part of chunks([...new Set(files)], 50)) {
    const q = new URLSearchParams({ action: 'query', format: 'json', prop: 'imageinfo', iiprop: 'url|size|mime|extmetadata', iiurlwidth: String(width), titles: part.map((f) => `File:${f}`).join('|') });
    const res = await getJson(`${COMMONS_API}?${q}`);
    const renamed = Object.fromEntries((res.query.normalized || []).map((n) => [n.to, n.from]));
    for (const page of Object.values(res.query.pages)) {
      const asked = (renamed[page.title] || page.title).replace(/^File:/, '');
      out[asked] = page.imageinfo?.[0] ? { title: page.title, info: page.imageinfo[0] } : null;
    }
  }
  return out;
}

/** A checked photo record, or { problems }. */
async function checked(found, label) {
  if (!found) return { problems: [`${label}: file not found on Commons`] };
  const p = photoProblems(found.info);
  if (p.length) return { problems: p.map((x) => `${label}: ${x}`) };
  const record = photoRecord(found.title, found.info);
  const check = await checkUrl(record.src, 'image/', { delayMs: 300 });
  return check.ok ? { record } : { problems: [`${label}: thumbnail answered ${check.status} ${check.type}`] };
}

const state = stateFromArg(process.argv[2]);
const cities = citiesFor(state.code, process.argv.slice(3));
const ents = await entities(cities.flatMap((c) => [c.wikidata, ...(c.highlights || [])]).filter(Boolean));

const heroFile = (c) => c.hero?.file || ents[c.wikidata]?.image || null;
const heroFiles = cities.map(heroFile).filter(Boolean);
const big = await imageInfo(heroFiles, HERO_WIDTH);
const small = await imageInfo(heroFiles, CARD_WIDTH);
const cardFiles = cities.flatMap((c) => (c.highlights || []).map((id) => ents[id]?.image)).filter(Boolean);
const cards = cardFiles.length ? await imageInfo(cardFiles, CARD_WIDTH) : {};

const problems = [];
const skipped = [];
const results = [];
for (const [i, c] of cities.entries()) {
  const main = ents[c.wikidata];
  if (!main?.label) {
    problems.push(`${c.slug}: Wikidata ${c.wikidata} has no English label`);
    continue;
  }
  const curated = !!c.hero?.file;
  const focus = c.hero?.focus ?? [0.5, 0.5];
  if (!validFocus(focus)) problems.push(`${c.slug}: hero focus must be two numbers between 0 and 1`);

  let hero = null;
  const file = heroFile(c);
  if (file) {
    const a = await checked(big[file], `${c.slug} hero "${file}"`);
    const b = a.record ? await checked(small[file], `${c.slug} hero "${file}" (small)`) : a;
    if (a.record && b.record) {
      hero = { ...a.record, srcSmall: b.record.src, widthSmall: b.record.width, heightSmall: b.record.height, focus, chosenBy: curated ? c.hero.chosenBy : 'wikidata-p18', chosenOn: curated ? c.hero.chosenOn ?? null : null };
    } else if (curated) problems.push(...(b.problems || a.problems));
    else skipped.push(...(b.problems || a.problems));
  }

  const highlights = [];
  for (const id of c.highlights || []) {
    const e = ents[id];
    if (!e?.label || !e.description || !e.image) {
      problems.push(`${c.slug}: highlight ${id} needs an English label, description and image`);
      continue;
    }
    const r = await checked(cards[e.image], `${c.slug} highlight ${id} (${e.label})`);
    if (r.record) highlights.push({ qid: id, label: e.label, description: e.description, coords: e.coords, photo: r.record });
    else problems.push(...r.problems);
  }

  results.push([
    c.slug,
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
  if ((i + 1) % 50 === 0) console.log(`  ${i + 1}/${cities.length}`);
}

if (problems.length) refuse(`${state.code} photos`, problems);
for (const [slug, data] of results) writeJson(`data/photos/${state.code}/${slug}.json`, data);
const withHero = results.filter(([, d]) => d.hero).length;
console.log(`Wrote ${results.length} photo files: ${withHero} with a hero photo, ${results.length - withHero} without.`);
for (const s of skipped) console.log(`  skipped (automatic image): ${s}`);
