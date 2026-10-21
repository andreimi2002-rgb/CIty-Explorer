import { el } from '../dom.js';
import { icon } from '../icons.js';
import { photoFallback } from './highlights.js';

/** "Photo: author · licence · Wikimedia Commons", each part linked to its source. */
export function photoCredit(photo, t, className = 'credit') {
  return el(
    'p',
    { class: className },
    t('photo.creditBy', { author: photo.author }),
    ' · ',
    photo.licenceUrl ? el('a', { href: photo.licenceUrl, rel: 'license noopener', target: '_blank' }, photo.licence) : photo.licence,
    ' · ',
    el('a', { href: photo.page, rel: 'noopener', target: '_blank' }, t('photo.commons')),
  );
}

/** An <img> that swaps itself for the fallback panel if it fails to load. */
function photoImg(photo, { alt, className, eager = false, focus }) {
  const img = el('img', {
    src: photo.src,
    alt,
    width: photo.width,
    height: photo.height,
    class: className,
    loading: eager ? 'eager' : 'lazy',
    decoding: 'async',
    fetchpriority: eager ? 'high' : null,
    referrerpolicy: 'no-referrer',
  });
  if (focus) img.style.objectPosition = `${focus[0] * 100}% ${focus[1] * 100}%`;
  img.addEventListener('error', () => img.replaceWith(photoFallback(className)), { once: true });
  return img;
}

/** Hero photo over the fallback panel; the credit sits above the hero content so its links stay clickable. */
export function renderHeroPhoto(heroBg, photo, { name, t }) {
  heroBg.replaceChildren(photoImg(photo, { alt: t('photo.heroAlt', { name }), className: 'hero-img', eager: true, focus: photo.focus }));
  heroBg.after(photoCredit(photo, t, 'credit hero-credit'));
}

/** Highlight cards: Wikidata label and description, Commons photo, numbered like the map pins. */
export function renderHighlightCards(container, highlights, t) {
  container.replaceChildren(
    ...highlights.map((h, i) =>
      el(
        'article',
        { class: 'card', id: `highlight-${i + 1}` },
        el(
          'div',
          { class: 'card-photo' },
          photoImg(h.photo, { alt: h.label, className: 'card-img' }),
          el('span', { class: 'pin-badge', 'aria-hidden': 'true' }, String(i + 1)),
        ),
        el(
          'div',
          { class: 'b' },
          el('h3', {}, h.label),
          el('p', { class: 'desc' }, h.description),
          photoCredit(h.photo, t, 'credit card-credit'),
        ),
      ),
    ),
  );
}

/** Small note shown in the hero when a city has no photo yet. */
export function heroPhotoMissing(heroBg, t) {
  heroBg.replaceChildren(el('span', { class: 'photo-note' }, icon('photo'), el('span', {}, t('photo.missing'))));
}
