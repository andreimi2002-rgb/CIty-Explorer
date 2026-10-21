import { el } from '../dom.js';

const PROVENANCE_KEYS = { sourced: 'provenance.sourced', computed: 'provenance.computed' };
const tag = (level, t) => el('span', { class: `tag ${level}` }, t(PROVENANCE_KEYS[level]));
const link = (href, text) => el('a', { href, rel: 'noopener', target: '_blank' }, text);

function fmtDate(iso, locale) {
  return new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${iso}T00:00:00Z`));
}

/** "Data & sources": where every value and photo on the page comes from. */
export function renderSources(container, { boundary, photos, hasWeather, t, locale = 'en-US' }) {
  const items = [];

  if (boundary) {
    const s = boundary.properties.source;
    const [lon, lat] = boundary.properties.internalPoint;
    items.push(
      el('li', {}, tag('sourced', t), ' ', t('sources.boundary', { vintage: fmtDate(s.vintage, locale), retrieved: fmtDate(s.retrieved, locale) }), ' ', link(s.url, t('sources.census')), ` · ${s.licence}`),
      el('li', {}, tag('sourced', t), ' ', t('sources.point', { lat: lat.toFixed(5), lon: lon.toFixed(5) })),
    );
  }

  if (photos) {
    const w = photos.source.wikidata;
    items.push(el('li', {}, tag('sourced', t), ' ', t('sources.wikidata', { retrieved: fmtDate(w.retrieved, locale) }), ' ', link(w.url, t('sources.wikidataName')), ` · ${w.licence}`));
    const list = [
      photos.hero && [t('sources.heroPhoto'), photos.hero],
      ...photos.highlights.map((h) => [h.label, h.photo]),
    ].filter(Boolean);
    for (const [what, p] of list) {
      items.push(
        el(
          'li',
          {},
          tag('sourced', t),
          ' ',
          t('sources.photo', { what, author: p.author }),
          ' ',
          link(p.page, p.file),
          ' · ',
          p.licenceUrl ? link(p.licenceUrl, p.licence) : p.licence,
        ),
      );
    }
  }

  if (boundary) {
    items.push(el('li', {}, tag('sourced', t), ' ', t('sources.mapTiles'), ' ', link('https://openfreemap.org/', 'OpenFreeMap'), ' · ', link('https://www.openstreetmap.org/copyright', t('sources.osm'))));
  }
  if (hasWeather) {
    items.push(
      el('li', {}, tag('sourced', t), ' ', t('sources.weather'), ' ', link('https://api.met.no/weatherapi/locationforecast/2.0/documentation', t('sources.metName')), ' · CC BY 4.0'),
      el('li', {}, tag('computed', t), ' ', t('sources.weatherConverted')),
    );
  }

  if (!items.length) return;
  container.replaceChildren(el('ul', { class: 'sources' }, items), el('p', { class: 'notes' }, t('sources.notYet')));
}
