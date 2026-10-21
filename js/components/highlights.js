import { el } from '../dom.js';
import { icon } from '../icons.js';

/** Photo slot: the styled fallback panel shown until a Commons photo exists (or if it fails to load). */
export function photoFallback(className = '') {
  return el('div', { class: `photo-fallback ${className}`.trim(), 'aria-hidden': 'true' }, icon('photo'));
}

/** Highlight cards. Without data each card is an honest placeholder. */
export function renderHighlights(container, count, t) {
  container.replaceChildren(
    ...Array.from({ length: count }, () =>
      el(
        'article',
        { class: 'card' },
        photoFallback(),
        el('div', { class: 'b' }, el('h3', {}, t('na.value')), el('p', {}, t('highlights.reason'))),
      ),
    ),
  );
}
