import { el } from '../dom.js';
import { formatNumber } from '../units.js';
import { photoCredit } from './photo.js';
import { photoFallback } from './highlights.js';

const TOP = 12;

function cityCard(city, t) {
  let media = photoFallback('city-card-img');
  if (city.photo) {
    media = el('img', { src: city.photo.src, alt: '', width: city.photo.width, height: city.photo.height, class: 'city-card-img', loading: 'lazy', decoding: 'async', referrerpolicy: 'no-referrer' });
    media.style.objectPosition = `${city.photo.focus[0] * 100}% ${city.photo.focus[1] * 100}%`;
    media.addEventListener('error', () => media.replaceWith(photoFallback('city-card-img')), { once: true });
  }
  return el(
    'article',
    { class: 'card city-card' },
    el('div', { class: 'card-photo' }, media),
    el(
      'div',
      { class: 'b' },
      el('h3', {}, el('a', { href: city.path, class: 'stretched' }, city.name)),
      city.population && el('p', { class: 'pop' }, t('home.population', { n: formatNumber(city.population) })),
      city.description && el('p', { class: 'desc' }, city.description),
      city.photo && photoCredit(city.photo, t, 'credit card-credit'),
    ),
  );
}

/** Home page: per state, the largest cities as cards and every city in an A–Z list. */
export function renderCityIndex(container, index, t) {
  const states = (index?.states ?? []).filter((s) => s.cities.length);
  if (!states.length) {
    container.replaceChildren(el('div', { class: 'empty' }, el('b', {}, t('na.value')), el('p', {}, t('home.citiesNone'))));
    return;
  }
  container.replaceChildren(
    ...states.map((s) => {
      const largest = [...s.cities].filter((c) => c.population).sort((a, b) => b.population - a.population).slice(0, TOP);
      const shown = largest.length ? largest : s.cities.slice(0, TOP);
      return el(
        'div',
        { class: 'state-group' },
        el('h3', { class: 'state-name' }, s.cities.length > TOP ? t('home.largest', { state: s.name, n: shown.length }) : s.name),
        el('div', { class: 'hl city-grid' }, shown.map((c) => cityCard(c, t))),
        s.cities.length > TOP &&
          el(
            'details',
            { class: 'az' },
            el('summary', {}, t('home.allCities', { state: s.name, n: s.cities.length })),
            el('ul', { class: 'az-list' }, s.cities.map((c) => el('li', {}, el('a', { href: c.path }, c.name)))),
          ),
      );
    }),
  );
}
