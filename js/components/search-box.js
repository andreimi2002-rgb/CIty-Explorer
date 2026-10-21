// City search box (ARIA combobox). The list (data/search.json) loads on first focus.
// onPick(city) handles a choice; by default the page goes to the city.
import { el } from '../dom.js';
import { formatNumber } from '../units.js';
import { searchCities } from '../search.js';

let listPromise;
export function loadSearchList() {
  listPromise ??= fetch('/data/search.json')
    .then((r) => (r.ok ? r.json() : []))
    .catch(() => []);
  return listPromise;
}

let uid = 0;

export function initSearchBox(input, { t, onPick = (c) => location.assign(`/city/${c.s}`), exclude = () => [] }) {
  const listId = `search-list-${++uid}`;
  const list = el('ul', { class: 'search-results', id: listId, role: 'listbox', hidden: true, 'aria-label': t('search.results') });
  input.closest('.search').append(list);
  input.setAttribute('role', 'combobox');
  input.setAttribute('aria-autocomplete', 'list');
  input.setAttribute('aria-expanded', 'false');
  input.setAttribute('aria-controls', listId);
  input.disabled = false;

  let results = [];
  let active = -1;

  const close = () => {
    list.hidden = true;
    input.setAttribute('aria-expanded', 'false');
    input.removeAttribute('aria-activedescendant');
    active = -1;
  };
  const pick = (city) => {
    close();
    input.value = '';
    onPick(city);
  };
  const paint = () => {
    list.replaceChildren(
      ...(results.length
        ? results.map((c, i) => {
            const li = el(
              'li',
              { id: `${listId}-${i}`, role: 'option', 'aria-selected': String(i === active), class: i === active ? 'on' : '' },
              el('b', {}, c.n),
              el('span', {}, [c.c, c.p ? t('search.population', { n: formatNumber(c.p) }) : null].filter(Boolean).join(' · ')),
            );
            li.addEventListener('mousedown', (e) => e.preventDefault()); // keep focus in the input
            li.addEventListener('click', () => pick(c));
            return li;
          })
        : [el('li', { class: 'none', role: 'option', 'aria-disabled': 'true' }, t('search.none'))]),
    );
    list.hidden = false;
    input.setAttribute('aria-expanded', 'true');
    if (active >= 0) input.setAttribute('aria-activedescendant', `${listId}-${active}`);
    else input.removeAttribute('aria-activedescendant');
  };
  const update = async () => {
    const q = input.value;
    if (!q.trim()) return close();
    const all = await loadSearchList();
    const skip = new Set(exclude());
    results = searchCities(all.filter((c) => !skip.has(c.s)), q, 8);
    active = results.length ? 0 : -1;
    paint();
  };

  input.addEventListener('focus', () => loadSearchList());
  input.addEventListener('input', update);
  input.addEventListener('blur', () => setTimeout(close, 100));
  input.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown' && results.length) {
      e.preventDefault();
      active = (active + 1) % results.length;
      paint();
    } else if (e.key === 'ArrowUp' && results.length) {
      e.preventDefault();
      active = (active - 1 + results.length) % results.length;
      paint();
    } else if (e.key === 'Enter' && results[active]) {
      e.preventDefault();
      pick(results[active]);
    } else if (e.key === 'Escape') {
      close();
    }
  });
}

/** "/" focuses the main search when not typing elsewhere; Ctrl+K / Cmd+K from anywhere. */
export function initSearchShortcuts(input) {
  addEventListener('keydown', (e) => {
    const typing = /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement?.tagName) || document.activeElement?.isContentEditable;
    if ((e.key === 'k' || e.key === 'K') && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      input.focus();
      input.select();
    } else if (e.key === '/' && !typing && !e.ctrlKey && !e.metaKey && !e.altKey) {
      e.preventDefault();
      input.focus();
    }
  });
}
