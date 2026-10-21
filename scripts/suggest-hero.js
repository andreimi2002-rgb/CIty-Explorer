// Suggests hero photos (downtown / skyline) for one city and writes a local preview page
// to tmp/hero-candidates/<state>-<slug>.html. It never edits the curation file: a person
// chooses and records the file and focus point there.
// Usage: node scripts/suggest-hero.js ca san-francisco
import { getJson } from './lib/http.js';
import { stateFromArg, citiesFor, writeText, refuse } from './lib/files.js';
import { COMMONS_API, rankHeroCandidates, stripHtml, cleanThumbUrl } from './lib/commons.js';
import { entitiesUrl, parseEntity } from './lib/wikidata.js';

const MAX_CATEGORIES = 8;
const SHOW = 12;

const commons = (params) => getJson(`${COMMONS_API}?${new URLSearchParams({ format: 'json', ...params })}`);

const state = stateFromArg(process.argv[2]);
const slug = process.argv[3];
const city = citiesFor(state.code).find((c) => c.slug === slug);
if (!city) refuse(`${state.code}/${slug}`, [`unknown city ${slug}`]);

const entity = parseEntity((await getJson(entitiesUrl([city.wikidata]))).entities[city.wikidata]);
const base = entity?.commonsCategory;
if (!base) refuse(`${state.code}/${slug}`, [`${city.wikidata} has no Commons category (P373)`]);

// Skyline and downtown categories that name the city, as Commons itself names them.
const categories = new Set();
for (const word of ['skyline', 'skylines', 'downtown']) {
  const res = await commons({ action: 'query', list: 'search', srnamespace: '14', srlimit: '20', srsearch: `intitle:"${base}" intitle:${word}` });
  for (const r of res.query.search) {
    const t = r.title.replace(/^Category:/, '');
    if (t.toLowerCase().includes(base.toLowerCase()) && /skyline|downtown/i.test(t)) categories.add(t);
  }
}
// General categories ("San Francisco skylines") before narrow ones ("... in the 2000s").
const picked = [...categories].sort((a, b) => a.length - b.length || a.localeCompare(b)).slice(0, MAX_CATEGORIES);
console.log(`Categories: ${picked.join(' | ') || 'none'}`);

const titles = new Set();
for (const cat of picked) {
  const res = await commons({ action: 'query', list: 'categorymembers', cmtitle: `Category:${cat}`, cmtype: 'file', cmlimit: '500' });
  for (const m of res.query.categorymembers) titles.add(m.title);
}

const items = [];
const all = [...titles];
for (let i = 0; i < all.length; i += 50) {
  const res = await commons({ action: 'query', prop: 'imageinfo', iiprop: 'url|size|mime|extmetadata', iiurlwidth: '640', titles: all.slice(i, i + 50).join('|') });
  for (const page of Object.values(res.query.pages)) items.push({ title: page.title, info: page.imageinfo?.[0] });
}

const ranked = rankHeroCandidates(items).slice(0, SHOW);
console.log(`${titles.size} files checked, ${ranked.length} candidates shown.`);
for (const c of ranked.slice(0, 5)) console.log(`  ${c.assessment || '-'} ${c.info.width}x${c.info.height} ${c.year || '?'}  ${c.title}`);

const esc = (s) => String(s).replace(/[&<>"]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[ch]);
const cards = ranked
  .map(
    (c, i) => `<figure><img src="${esc(cleanThumbUrl(c.info.thumburl))}" alt="" loading="lazy">
<figcaption><b>${i + 1}. ${esc(c.assessment || 'not assessed')}</b> · ${c.info.width}×${c.info.height} · ${c.year || '?'}<br>
${esc(stripHtml(c.info.extmetadata.Artist.value))} · ${esc(stripHtml(c.info.extmetadata.LicenseShortName.value))}<br>
<a href="${esc(c.info.descriptionurl)}">${esc(c.title)}</a></figcaption></figure>`,
  )
  .join('\n');
writeText(
  `tmp/hero-candidates/${state.code}-${slug}.html`,
  `<!doctype html><meta charset="utf-8"><title>Hero candidates: ${esc(entity.label)}</title>
<style>body{font:14px system-ui;margin:20px}main{display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));gap:16px}img{width:100%;aspect-ratio:16/9;object-fit:cover;border-radius:8px}</style>
<h1>Hero candidates: ${esc(entity.label)}</h1><p>Categories: ${esc(picked.join(', '))}. Ranked: featured &gt; quality &gt; valued, then resolution, then year.</p>
<main>${cards}</main>`,
);
writeText(
  `tmp/hero-candidates/${state.code}-${slug}.json`,
  JSON.stringify(
    ranked.map((c) => ({ title: c.title, assessment: c.assessment, width: c.info.width, height: c.info.height, year: c.year, thumb: cleanThumbUrl(c.info.thumburl), page: c.info.descriptionurl, author: stripHtml(c.info.extmetadata.Artist.value), licence: stripHtml(c.info.extmetadata.LicenseShortName.value) })),
    null,
    2,
  ),
);
console.log(`Preview: tmp/hero-candidates/${state.code}-${slug}.html`);
