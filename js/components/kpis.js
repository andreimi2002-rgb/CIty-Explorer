import { el } from '../dom.js';
import { icon } from '../icons.js';
import { unitFor, UNIT_KEYS } from '../units.js';
import { formatFact, zoneLabel } from '../facts.js';

// The headline figures of a city: which fact each card shows.
export const KPIS = [
  { id: 'population', label: 'kpi.population', icon: 'kpiPeople', tone: 'violet', fact: 'population.estimate2025' },
  { id: 'area', label: 'kpi.area', icon: 'kpiArea', tone: 'green', fact: 'area.land2025', quantity: 'area' },
  { id: 'density', label: 'kpi.density', icon: 'kpiDensity', tone: 'amber', fact: 'density.2025', quantity: 'area', per: true },
  { id: 'elevation', label: 'kpi.elevation', icon: 'kpiElevation', tone: 'blue', fact: 'elevation', quantity: 'elevation' },
  { id: 'timezone', label: 'kpi.timezone', icon: 'kpiClock', tone: 'teal', fact: 'timezone' },
];

/** The small line under a value. */
function noteFor(kpi, city, ctx) {
  const { t } = ctx;
  const f = city.facts;
  switch (kpi.id) {
    case 'population': {
      const census = formatFact(f['population.census2020'], ctx);
      return census ? t('kpi.populationNote', { census: census.text }) : t('kpi.populationNoteNoCensus');
    }
    case 'area': {
      const water = formatFact(f['area.water2025'], ctx);
      return water ? t('kpi.areaNote', { water: water.text }) : null;
    }
    case 'density':
      return t('kpi.densityNote');
    case 'elevation':
      return t('kpi.elevationNote');
    case 'timezone':
      return f.timezone.value ? `${zoneLabel(f.timezone.value).offset} · ${f.timezone.value}` : null;
    default:
      return null;
  }
}

function valueFor(kpi, city, ctx) {
  const fact = city.facts[kpi.fact];
  if (kpi.id === 'timezone') return fact.value ? zoneLabel(fact.value).short : null;
  return formatFact(fact, ctx)?.text ?? null;
}

function unitNote(kpi, { t, system }) {
  if (!kpi.quantity) return null;
  const unit = t(UNIT_KEYS[unitFor(kpi.quantity, system)]);
  return t(kpi.per ? 'kpi.perUnitNote' : 'kpi.unitNote', { unit });
}

/**
 * city: the city file, or null when the city has no data yet (every card then says why).
 * onOpen(factKey) opens the provenance dialog.
 */
export function renderKpis(container, city, { t, system, onOpen }) {
  const ctx = { t, system };
  container.replaceChildren(
    ...KPIS.map((k) => {
      const value = city ? valueFor(k, city, ctx) : null;
      const fact = city?.facts[k.fact];
      const body = el(
        'div',
        { class: 'body' },
        el('div', { class: 'l' }, t(k.label)),
        value !== null ? el('div', { class: 'v' }, value) : el('div', { class: 'v na' }, t('na.value')),
        city
          ? el('div', { class: 'n' }, value !== null ? noteFor(k, city, ctx) : fact?.reason)
          : [unitNote(k, ctx) && el('div', { class: 'n' }, unitNote(k, ctx)), el('div', { class: 'n' }, t('na.reason.data'))],
      );
      const inner = [el('div', { class: 'ic' }, icon(k.icon, 1.6)), body];
      if (!city) return el('div', { class: `kpi tone-${k.tone}`, 'data-kpi': k.id }, inner);
      const button = el('button', { type: 'button', class: `kpi kpi-btn tone-${k.tone}`, 'data-kpi': k.id, 'aria-haspopup': 'dialog', title: t('provenance.open') }, inner);
      button.addEventListener('click', () => onOpen(k.fact));
      return button;
    }),
  );
}
