// "Where does this number come from?" — a dialog with the source, period, formula and inputs of a fact.
import { el } from '../dom.js';
import { formatFact, formatMoe } from '../facts.js';
import { FACT_LABEL_KEYS, formatPeriod } from '../fact-labels.js';

const LEVEL_KEYS = { sourced: 'provenance.sourced', computed: 'provenance.computed', estimated: 'provenance.estimated' };
let dialog;

function ensureDialog(t) {
  if (dialog) return dialog;
  const body = el('div', { class: 'prov-body' });
  const close = el('button', { type: 'button', class: 'btn prov-close', 'aria-label': t('provenance.close') }, '×');
  dialog = el('dialog', { class: 'prov', 'aria-labelledby': 'prov-title' }, close, body);
  close.addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', (e) => e.target === dialog && dialog.close()); // click on the backdrop
  document.body.append(dialog);
  return dialog;
}

function sourceLine(source, t, locale) {
  if (!source) return null;
  return el(
    'p',
    {},
    el('a', { href: source.url, rel: 'noopener', target: '_blank' }, source.name),
    source.retrieved ? ` · ${t('provenance.retrieved', { date: formatPeriod(source.retrieved, locale) })}` : '',
    source.licence ? ` · ${source.licence}` : '',
  );
}

/** Opens the dialog for facts[key] of a city. */
export function showProvenance(city, key, { t, system, locale = 'en-US' }) {
  const d = ensureDialog(t);
  const fact = city.facts[key];
  const ctx = { t, system, locale };
  const shown = formatFact(fact, ctx);
  const rows = [
    el('h2', { id: 'prov-title' }, t(FACT_LABEL_KEYS[key])),
    el('p', { class: 'prov-value' }, shown ? shown.text : t('na.value'), fact?.level ? el('span', { class: `tag ${fact.level}` }, t(LEVEL_KEYS[fact.level])) : null),
  ];
  if (fact?.value === null) rows.push(el('p', {}, fact.reason));
  if (fact?.period) rows.push(el('p', {}, t('provenance.period', { period: formatPeriod(fact.period, locale) })));
  if (fact?.dollarYear) rows.push(el('p', {}, t('provenance.dollars', { year: fact.dollarYear })));
  const moe = formatMoe(fact, ctx);
  if (moe) rows.push(el('p', {}, t('provenance.moe', { moe })));
  if (fact?.reliability === 'low') rows.push(el('p', { class: 'prov-warn' }, t('provenance.lowReliability')));
  if (fact?.level === 'sourced') rows.push(el('h3', {}, t('provenance.source')), sourceLine(city.sources[fact.source], t, locale));
  if (fact?.level === 'computed') {
    rows.push(el('h3', {}, t('provenance.formula')), el('p', { class: 'prov-formula' }, fact.formula));
    rows.push(
      el('h3', {}, t('provenance.inputs')),
      el(
        'ul',
        {},
        fact.inputs.map((k) => {
          const input = city.facts[k];
          const v = input ? formatFact(input, { ...ctx, system: 'us' }) : null;
          return el('li', {}, `${t(FACT_LABEL_KEYS[k])}: `, v ? v.text : t('provenance.seeSection'), input?.source ? ` (${city.sources[input.source]?.name ?? input.source})` : '');
        }),
      ),
    );
  }
  if (shown?.converted) rows.push(el('p', { class: 'notes' }, t('provenance.converted')));
  if (fact?.note) rows.push(el('p', { class: 'notes' }, fact.note));
  d.querySelector('.prov-body').replaceChildren(...rows.filter(Boolean));
  d.showModal();
}
