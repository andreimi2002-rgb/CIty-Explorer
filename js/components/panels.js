import { el } from '../dom.js';

/** The "Not available yet" box with the reason. */
export function pendingBox(t, reasonKey) {
  return el('div', { class: 'empty' }, el('b', {}, t('na.value')), el('p', {}, t(reasonKey)));
}

/**
 * One panel per data section. Each starts with the reason its content is not available yet;
 * returns { [sectionId]: bodyElement } so features can replace that body when they have data.
 */
export function renderPanels(container, sections, t) {
  const bodies = {};
  container.replaceChildren(
    ...sections
      .filter((s) => s.title)
      .map((s) => {
        bodies[s.id] = el('div', { class: 'panel-body' }, pendingBox(t, s.pending));
        return el(
          'section',
          { class: 'panel', id: s.id, 'aria-labelledby': `${s.id}-h` },
          el('div', { class: 'ph' }, el('div', {}, el('h2', { id: `${s.id}-h` }, t(s.title)), el('p', {}, t(s.desc)))),
          bodies[s.id],
        );
      }),
  );
  return bodies;
}
