import { el } from '../dom.js';
import { photoCredit } from './photo.js';
import { photoFallback } from './highlights.js';

function cityCard(city, t) {
  let media = photoFallback('city-card-img');
  if (city.photo) {
    media = el('img', {
      src: city.photo.src,
      alt: '',
      width: city.photo.width,
      height: city.photo.height,
      class: 'city-card-img',
      loading: 'lazy',
      decoding: 'async',
      referrerpolicy: 'no-referrer',
    });
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
      city.description && el('p', { class: 'desc' }, city.description),
      city.photo && photoCredit(city.photo, t, 'credit card-credit'),
    ),
  );
}

/** Home page: the cities that have data, grouped by state (from data/index.json). */
export function renderCityIndex(container, index, t) {
  const states = index?.states ?? [];
  if (!states.some((s) => s.cities.length)) {
    container.replaceChildren(el('div', { class: 'empty' }, el('b', {}, t('na.value')), el('p', {}, t('home.citiesNone'))));
    return;
  }
  container.replaceChildren(
    ...states.map((s) =>
      el('div', { class: 'state-group' }, el('h3', { class: 'state-name' }, s.name), el('div', { class: 'hl city-grid' }, s.cities.map((c) => cityCard(c, t)))),
    ),
  );
}
