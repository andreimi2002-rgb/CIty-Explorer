// Comparison of up to 5 cities: chips, "add a city", the table of comparable rows, City DNA.
import { el } from '../dom.js';
import { formatFact, formatMoe } from '../facts.js';
import { COMPARE_ROWS, cellFact, mismatches, MAX_COMPARE, compareUrl } from '../compare.js';
import { initSearchBox } from './search-box.js';
import { icon } from '../icons.js';

const cache = new Map();
export function loadCity(id) {
  if (!cache.has(id)) {
    cache.set(
      id,
      fetch(`/data/cities/${id}.json`)
        .then((r) => (r.ok ? r.json() : null))
        .catch(() => null),
    );
  }
  return cache.get(id);
}

function valueCell(entry, row, ctx, bad) {
  const fact = cellFact(entry.city, row);
  const shown = formatFact(fact, ctx);
  const b = el(
    'button',
    { type: 'button', class: `cmp-val${bad ? ' bad' : ''}`, 'aria-haspopup': 'dialog', title: bad ? ctx.t('compare.mismatch') : ctx.t('provenance.open') },
    shown ? shown.text : ctx.t('compare.na'),
    fact?.reliability === 'low' && el('span', { class: 'badge-warn' }, ' *'),
  );
  b.addEventListener('click', () => ctx.onOpen(entry.city, row.fact));
  const moe = formatMoe(fact, ctx);
  return el('td', { class: entry.current ? 'cur' : '' }, b, moe && el('div', { class: 'moe' }, moe));
}

function table(entries, ctx) {
  const { t } = ctx;
  return el(
    'div',
    { class: 'tablewrap', tabindex: '0', role: 'region', 'aria-label': t('compare.tableLabel') },
    el(
      'table',
      { class: 'cmp' },
      el('thead', {}, el('tr', {}, el('th', { scope: 'col' }, t('compare.indicator')), entries.map((e) => el('th', { scope: 'col', class: e.current ? 'cur' : '' }, el('a', { href: `/city/${e.id}` }, e.city.name))))),
      el(
        'tbody',
        {},
        COMPARE_ROWS.map((row) => {
          const bad = new Set(mismatches(entries.map((e) => ({ id: e.id, city: e.city })), row));
          return el('tr', {}, el('th', { scope: 'row' }, t(row.label)), entries.map((e) => valueCell(e, row, ctx, bad.has(e.id))));
        }),
      ),
    ),
  );
}

function dna(entries, ctx) {
  const { t } = ctx;
  const groups = COMPARE_ROWS.filter((r) => r.dna)
    .map((row) => {
      const cells = entries.map((e) => ({ e, f: cellFact(e.city, row) })).filter((x) => x.f && typeof x.f.value === 'number');
      if (cells.length < 2) return null;
      const max = Math.max(...cells.map((x) => x.f.value));
      return el(
        'div',
        { class: 'dna-group' },
        el('h4', {}, t(row.label)),
        cells.map(({ e, f }) =>
          el(
            'div',
            { class: `bar${e.current ? ' cur' : ''}` },
            el('span', { class: 'bar-name' }, e.city.name),
            el('span', { class: 't' }, el('i', { style: `width:${max > 0 ? ((f.value / max) * 100).toFixed(1) : 0}%` })),
            el('span', { class: 'val' }, formatFact(f, ctx)?.text ?? ''),
          ),
        ),
      );
    })
    .filter(Boolean);
  if (!groups.length) return null;
  return el('div', {}, el('h3', { class: 'dna-title' }, t('compare.dnaTitle')), el('p', { class: 'notes' }, t('compare.dnaNote')), el('div', { class: 'dna' }, groups));
}

/**
 * Renders the comparison into container. state: { ids, current } (current may be null on /compare).
 * onChange(ids) is called after adding or removing a city.
 */
export async function renderComparison(container, state, ctx) {
  const { t } = ctx;
  const loaded = (await Promise.all(state.ids.map(async (id) => ({ id, city: await loadCity(id), current: id === state.current })))).filter((e) => e.city);
  const missing = state.ids.filter((id) => !loaded.some((e) => e.id === id));

  const chips = el(
    'div',
    { class: 'chips cmp-chips', role: 'group', 'aria-label': t('compare.chosen') },
    loaded.map((e) => {
      if (e.current) return el('span', { class: 'chip on' }, e.city.name);
      const x = el('button', { type: 'button', class: 'chip', 'aria-label': t('compare.remove', { name: e.city.name }) }, e.city.name, ' ×');
      x.addEventListener('click', () => ctx.onChange(state.ids.filter((id) => id !== e.id)));
      return x;
    }),
  );

  const full = state.ids.length >= MAX_COMPARE;
  const addInput = el('input', { type: 'search', autocomplete: 'off', placeholder: t(full ? 'compare.full' : 'compare.add'), 'aria-label': t('compare.add'), disabled: full });
  const addBox = el('label', { class: 'search cmp-add' }, icon('search', 1.6), addInput);
  if (!full) initSearchBox(addInput, { t, exclude: () => state.ids, onPick: (c) => ctx.onChange([...state.ids, c.s].slice(0, MAX_COMPARE)) });

  container.replaceChildren(
    ...[
      el('div', { class: 'cmp-top' }, chips, addBox),
      missing.length && el('p', { class: 'prov-warn' }, t('compare.missing', { list: missing.join(', ') })),
      loaded.length >= 1 ? table(loaded, ctx) : el('div', { class: 'empty' }, el('p', {}, t('compare.empty'))),
      el('p', { class: 'notes' }, t('compare.note')),
      loaded.length >= 2 && dna(loaded, ctx),
      ctx.showOpenLink && loaded.length >= 2 && el('a', { class: 'btn', href: compareUrl(loaded.map((e) => e.id)) }, t('compare.openFull')),
    ].filter(Boolean),
  );
  return { ids: loaded.map((e) => e.id), missing };
}
