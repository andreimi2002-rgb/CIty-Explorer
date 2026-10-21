import { el } from '../dom.js';

/** One panel per data section, each showing why its content is not available yet. */
export function renderPanels(container, sections, t) {
  container.replaceChildren(
    ...sections
      .filter((s) => s.title)
      .map((s) =>
        el(
          'section',
          { class: 'panel', id: s.id, 'aria-labelledby': `${s.id}-h` },
          el('div', { class: 'ph' }, el('div', {}, el('h2', { id: `${s.id}-h` }, t(s.title)), el('p', {}, t(s.desc)))),
          el('div', { class: 'empty' }, el('b', {}, t('na.value')), el('p', {}, t(s.pending))),
        ),
      ),
  );
}
