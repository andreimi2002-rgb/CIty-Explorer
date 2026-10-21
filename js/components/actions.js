// Hero actions (save, copy link, compare) and the home "Your saved cities" panel.
import { el } from '../dom.js';
import { icon } from '../icons.js';
import { store } from '../storage.js';
import { isSaved, readSaved, toggleSaved } from '../saved.js';
import { compareUrl, MAX_COMPARE } from '../compare.js';
import { loadSearchList } from './search-box.js';

export function renderHeroActions(container, id, t) {
  const save = el('button', { type: 'button', class: 'btn' });
  const paint = () => {
    const on = isSaved(store, id);
    save.setAttribute('aria-pressed', String(on));
    save.classList.toggle('saved', on);
    save.replaceChildren(icon('heart', 1.6), el('span', {}, t(on ? 'actions.saved' : 'actions.save')));
  };
  save.addEventListener('click', () => {
    toggleSaved(store, id);
    paint();
  });
  paint();

  const copy = el('button', { type: 'button', class: 'btn' }, icon('share', 1.6), el('span', {}, t('actions.copy')));
  copy.addEventListener('click', async () => {
    const label = copy.querySelector('span');
    try {
      await navigator.clipboard.writeText(location.href.split('#')[0]);
      label.textContent = t('actions.copied');
    } catch {
      label.textContent = t('actions.copyFailed');
    }
    setTimeout(() => (label.textContent = t('actions.copy')), 2000);
  });

  const compare = el('a', { class: 'btn', href: '#compare' }, icon('bars', 1.6), el('span', {}, t('actions.compare')));
  container.replaceChildren(save, copy, compare);
}

/** Home: the cities saved in this browser, with a link to compare them. Hidden when empty. */
export async function renderSavedCities(section, list, t) {
  const ids = readSaved(store);
  if (!ids.length) {
    section.hidden = true;
    return;
  }
  const all = await loadSearchList();
  const known = ids.map((id) => all.find((c) => c.s === id)).filter(Boolean);
  if (!known.length) {
    section.hidden = true;
    return;
  }
  list.replaceChildren(
    el('ul', { class: 'saved-list' }, known.map((c) => el('li', {}, el('a', { href: `/city/${c.s}` }, c.n), el('span', {}, ` · ${c.c}`)))),
    known.length >= 2 ? el('a', { class: 'btn', href: compareUrl(known.slice(0, MAX_COMPARE).map((c) => c.s)) }, t('saved.compare')) : el('p', { class: 'notes' }, t('saved.addMore')),
  );
  section.hidden = false;
}
