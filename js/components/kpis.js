import { el } from '../dom.js';
import { icon } from '../icons.js';
import { formatQuantity, unitFor, UNIT_KEYS } from '../units.js';

// The headline figures of a city. In stage 0 no value is loaded yet, so every value is null
// and is shown as "Not available yet" with its reason.
export const KPIS = [
  { id: 'population', label: 'kpi.population', icon: 'kpiPeople', tone: 'violet', value: null },
  { id: 'area', label: 'kpi.area', icon: 'kpiArea', tone: 'green', value: null, unit: 'mi2', quantity: 'area' },
  { id: 'density', label: 'kpi.density', icon: 'kpiDensity', tone: 'amber', value: null, unit: 'mi2', quantity: 'area', per: true },
  { id: 'elevation', label: 'kpi.elevation', icon: 'kpiElevation', tone: 'blue', value: null, unit: 'ft', quantity: 'elevation' },
  { id: 'timezone', label: 'kpi.timezone', icon: 'kpiClock', tone: 'teal', value: null },
];

function unitNote(kpi, system, t) {
  if (!kpi.quantity) return null;
  const unit = t(UNIT_KEYS[unitFor(kpi.quantity, system)]);
  return t(kpi.per ? 'kpi.perUnitNote' : 'kpi.unitNote', { unit });
}

function valueNode(kpi, system, t) {
  if (kpi.value === null || kpi.value === undefined) return el('div', { class: 'v na' }, t('na.value'));
  const q = kpi.quantity ? formatQuantity(kpi.value, kpi.unit, kpi.quantity, system, { per: kpi.per }) : null;
  const text = q ? (kpi.per ? q.text : t('value.withUnit', { n: q.text, unit: t(UNIT_KEYS[q.unit]) })) : String(kpi.value);
  return el('div', { class: 'v' }, text);
}

export function renderKpis(container, kpis, { t, system }) {
  container.replaceChildren(
    ...kpis.map((k) =>
      el(
        'div',
        { class: `kpi tone-${k.tone}`, 'data-kpi': k.id },
        el('div', { class: 'ic' }, icon(k.icon, 1.6)),
        el(
          'div',
          { class: 'body' },
          el('div', { class: 'l' }, t(k.label)),
          valueNode(k, system, t),
          unitNote(k, system, t) && el('div', { class: 'n' }, unitNote(k, system, t)),
          k.value === null && el('div', { class: 'n' }, t('na.reason.data')),
        ),
      ),
    ),
  );
}
