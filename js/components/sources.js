import { el } from '../dom.js';
import { FACT_LABEL_KEYS, formatPeriod } from '../fact-labels.js';

const PROVENANCE_KEYS = { sourced: 'provenance.sourced', computed: 'provenance.computed' };
const tag = (level, t) => el('span', { class: `tag ${level}` }, t(PROVENANCE_KEYS[level]));
const link = (href, text) => el('a', { href, rel: 'noopener', target: '_blank' }, text);

/** Sourced datasets used by the city's facts, each with the facts that use it. */
function datasetItems(city, t, locale) {
  const users = new Map();
  for (const [key, f] of Object.entries(city.facts)) {
    if (f.level !== 'sourced') continue;
    if (!users.has(f.source)) users.set(f.source, []);
    users.get(f.source).push(t(FACT_LABEL_KEYS[key]));
  }
  if (city.referencePoint) users.set(city.referencePoint.source, [...(users.get(city.referencePoint.source) || []), t(FACT_LABEL_KEYS.referencePoint)]);
  return [...users.entries()].map(([id, labels]) => {
    const s = city.sources[id];
    return el(
      'li',
      {},
      tag('sourced', t),
      ' ',
      link(s.url, s.name),
      s.period ? ` · ${formatPeriod(s.period, locale)}` : '',
      s.vintage ? ` · ${t('sources.vintage', { date: formatPeriod(s.vintage, locale) })}` : '',
      s.retrieved ? ` · ${t('provenance.retrieved', { date: formatPeriod(s.retrieved, locale) })}` : '',
      ` · ${s.licence}`,
      el('span', { class: 'uses' }, t('sources.usedFor', { list: labels.join(', ') })),
    );
  });
}

function computedItems(city, t) {
  return Object.entries(city.facts)
    .filter(([, f]) => f.level === 'computed')
    .map(([key, f]) => el('li', {}, tag('computed', t), ' ', el('b', {}, t(FACT_LABEL_KEYS[key])), `: ${f.formula}`));
}

/** "Data & sources": where every value and photo on the page comes from. */
export function renderSources(container, { boundary, photos, city, hasWeather, t, locale = 'en-US' }) {
  const items = [];

  if (city) items.push(...datasetItems(city, t, locale));

  if (boundary) {
    const s = boundary.properties.source;
    items.push(el('li', {}, tag('sourced', t), ' ', t('sources.boundary', { vintage: formatPeriod(s.vintage, locale), retrieved: formatPeriod(s.retrieved, locale) }), ' ', link(s.url, t('sources.census')), ` · ${s.licence}`));
  }

  if (photos) {
    const w = photos.source.wikidata;
    items.push(el('li', {}, tag('sourced', t), ' ', t('sources.wikidata', { retrieved: formatPeriod(w.retrieved, locale) }), ' ', link(w.url, t('sources.wikidataName')), ` · ${w.licence}`));
    const list = [photos.hero && [t('sources.heroPhoto'), photos.hero], ...photos.highlights.map((h) => [h.label, h.photo])].filter(Boolean);
    for (const [what, p] of list) {
      items.push(el('li', {}, tag('sourced', t), ' ', t('sources.photo', { what, author: p.author }), ' ', link(p.page, p.file), ' · ', p.licenceUrl ? link(p.licenceUrl, p.licence) : p.licence));
    }
  }

  if (boundary) {
    items.push(el('li', {}, tag('sourced', t), ' ', t('sources.mapTiles'), ' ', link('https://openfreemap.org/', 'OpenFreeMap'), ' · ', link('https://www.openstreetmap.org/copyright', t('sources.osm'))));
  }
  if (hasWeather) {
    items.push(el('li', {}, tag('sourced', t), ' ', t('sources.weather'), ' ', link('https://api.met.no/weatherapi/locationforecast/2.0/documentation', t('sources.metName')), ' · CC BY 4.0'));
  }
  if (city) items.push(...computedItems(city, t));
  items.push(el('li', {}, tag('computed', t), ' ', t('sources.conversions')));

  if (!boundary && !city) return;
  container.replaceChildren(
    ...[
      el('ul', { class: 'sources' }, items),
      city?.conflicts?.length && el('div', {}, el('h3', {}, t('sources.conflicts')), el('ul', { class: 'notes' }, city.conflicts.map((c) => el('li', {}, c.text)))),
    ].filter(Boolean),
  );
}
