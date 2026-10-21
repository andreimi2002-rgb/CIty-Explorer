import { el } from '../dom.js';
import { formatFact, formatMoe } from '../facts.js';
import { FACT_LABEL_KEYS } from '../fact-labels.js';
import { pendingBox } from './panels.js';

const ACS = ['acs.medianHouseholdIncome', 'acs.medianHomeValue', 'acs.bachelorsOrHigher', 'acs.foreignBorn', 'acs.poverty', 'acs.meanCommute'];

function statButton(city, key, ctx) {
  const fact = city.facts[key];
  const v = formatFact(fact, ctx);
  const moe = formatMoe(fact, ctx);
  const b = el(
    'button',
    { type: 'button', class: 'stat', 'aria-haspopup': 'dialog', title: ctx.t('provenance.open') },
    el('div', { class: v ? 'v' : 'v na' }, v ? v.text : ctx.t('na.value')),
    el('div', { class: 'l' }, ctx.t(FACT_LABEL_KEYS[key])),
    moe && el('div', { class: 'moe' }, moe),
    fact.reliability === 'low' && el('div', { class: 'badge-warn' }, ctx.t('people.lowReliability')),
    !v && el('div', { class: 'moe' }, fact.reason),
  );
  b.addEventListener('click', () => ctx.onOpen(key));
  return b;
}

function bar(label, value, max, cls, ctx) {
  const text = formatFact(value, ctx)?.text;
  return el(
    'div',
    { class: `bar ${cls}` },
    el('span', {}, label),
    el('span', { class: 't' }, el('i', { style: `width:${((value.value / max) * 100).toFixed(1)}%` })),
    el('span', { class: 'val' }, text),
  );
}

/** People & economy: ACS 5-year values with margins, and the population trend in one series. */
export function renderPeople(container, city, ctx) {
  const { t } = ctx;
  const f = city.facts;
  const base = f['population.base2020'];
  const est = f['population.estimate2025'];
  const change = f['population.change'];
  const census = formatFact(f['population.census2020'], ctx);

  const trend = [];
  if (base.value && est.value) {
    const max = Math.max(base.value, est.value);
    const changeBtn = el('button', { type: 'button', class: 'linklike', 'aria-haspopup': 'dialog' }, t('people.change', { change: formatFact(change, ctx).text }));
    changeBtn.addEventListener('click', () => ctx.onOpen('population.change'));
    trend.push(
      el(
        'div',
        { class: 'trend' },
        el('div', {}, el('h3', {}, t('people.trendTitle')), el('p', { class: 'notes' }, t('people.trendNote'))),
        el('div', {}, bar(t('people.base2020'), base, max, '', ctx), bar(t('people.est2025'), est, max, 'cur', ctx), changeBtn),
      ),
    );
  }
  container.replaceChildren(
    el('div', { class: 'stats' }, ACS.map((k) => statButton(city, k, ctx))),
    el('p', { class: 'notes' }, t('people.acsNote')),
    ...trend,
    el('p', { class: 'notes' }, census ? t('people.censusCount', { n: census.text }) : f['population.census2020'].reason),
  );
}

export { pendingBox };
