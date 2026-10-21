import { el } from '../dom.js';
import { formatNumber, UNIT_KEYS } from '../units.js';
import { climateSeries, formatFact } from '../facts.js';
import { pendingBox } from './panels.js';

const SVG_NS = 'http://www.w3.org/2000/svg';
const svg = (tag, attrs = {}, ...children) => {
  const n = document.createElementNS(SVG_NS, tag);
  for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, String(v));
  n.append(...children.filter(Boolean));
  return n;
};
const text = (attrs, s) => {
  const n = svg('text', attrs);
  n.textContent = s;
  return n;
};
const title = (s) => {
  const n = document.createElementNS(SVG_NS, 'title');
  n.textContent = s;
  return n;
};

const monthNames = (locale, style) => Array.from({ length: 12 }, (_, m) => new Intl.DateTimeFormat(locale, { month: style, timeZone: 'UTC' }).format(new Date(Date.UTC(2021, m, 1))));

function niceStep(range) {
  const raw = range / 5;
  const pow = 10 ** Math.floor(Math.log10(raw));
  return [1, 2, 2.5, 5, 10].map((m) => m * pow).find((s) => s >= raw);
}

/** Monthly chart: "temp" (highs and lows) or "prcp" (bars). */
function chart(series, view, { t, locale }) {
  const W = 640, H = 280, pl = 44, pr = 12, pt = 14, pb = 30;
  const iw = W - pl - pr, ih = H - pt - pb;
  const x = (i) => pl + (iw * (i + 0.5)) / 12;
  const months = monthNames(locale, 'short');
  const full = monthNames(locale, 'long');
  const unit = t(UNIT_KEYS[view === 'temp' ? series.tempUnit : series.prcpUnit]);
  const root = svg('svg', { viewBox: `0 0 ${W} ${H}`, role: 'img', 'aria-label': t(view === 'temp' ? 'climate.chartTempLabel' : 'climate.chartPrcpLabel', { unit }) });

  const values = view === 'temp' ? [...series.tmax, ...series.tmin] : series.prcp;
  let lo = view === 'temp' ? Math.min(...values) : 0;
  let hi = Math.max(...values);
  const step = niceStep(hi - lo || 1);
  lo = Math.floor(lo / step) * step;
  hi = Math.ceil(hi / step) * step;
  const y = (v) => pt + ih * (1 - (v - lo) / (hi - lo));
  for (let v = lo; v <= hi + 1e-9; v += step) {
    root.append(svg('line', { x1: pl, x2: W - pr, y1: y(v), y2: y(v), stroke: 'var(--line)' }), text({ x: pl - 8, y: y(v) + 4, 'text-anchor': 'end' }, formatNumber(v, { locale, digits: step < 1 ? 1 : 0 })));
  }
  const digits = view === 'temp' ? (series.tempUnit === 'degC' ? 1 : 0) : series.prcpUnit === 'in' ? 2 : 0;
  if (view === 'temp') {
    for (const [arr, color, key] of [[series.tmax, 'var(--hi)', 'climate.high'], [series.tmin, 'var(--lo)', 'climate.low']]) {
      root.append(svg('polyline', { points: arr.map((v, i) => `${x(i)},${y(v)}`).join(' '), fill: 'none', stroke: color, 'stroke-width': 2.5 }));
      arr.forEach((v, i) => {
        root.append(svg('circle', { cx: x(i), cy: y(v), r: 3.5, fill: 'var(--surface)', stroke: color, 'stroke-width': 2 }, title(`${full[i]}: ${t(key)} ${formatNumber(v, { locale, digits })} ${unit}`)));
      });
    }
  } else {
    const bw = (iw / 12) * 0.56;
    series.prcp.forEach((v, i) => {
      const r = svg('rect', { x: x(i) - bw / 2, y: y(v), width: bw, height: Math.max(y(0) - y(v), 1), rx: 3, fill: 'var(--lo)' });
      r.append(title(`${full[i]}: ${formatNumber(v, { locale, digits })} ${unit}`));
      root.append(r);
    });
  }
  months.forEach((m, i) => root.append(text({ x: x(i), y: H - 10, 'text-anchor': 'middle' }, m)));
  return root;
}

/** Climate: monthly normals chart, annual summary and the station used. */
export function renderClimate(container, city, ctx) {
  const { t, system, locale = 'en-US' } = ctx;
  const f = city.facts;
  if (!f['climate.monthly']?.value) return container.replaceChildren(pendingBox(t, 'section.climate.pending'));
  const series = climateSeries(f['climate.monthly'].value, system);
  const a = f['climate.annual'].value;
  const st = f['climate.station'].value;
  const dist = f['climate.stationDistance'];
  const full = monthNames(locale, 'long');
  const tUnit = t(UNIT_KEYS[series.tempUnit]);
  const fmtT = (v) => `${formatNumber(series.tempUnit === 'degC' ? ((v - 32) * 5) / 9 : v, { locale, digits: series.tempUnit === 'degC' ? 1 : 0 })} ${tUnit}`;
  const pUnit = t(UNIT_KEYS[series.prcpUnit]);
  const total = series.prcpUnit === 'mm' ? a.prcpIn * 25.4 : a.prcpIn;
  const fmtP = formatNumber(total, { locale, digits: series.prcpUnit === 'in' ? 1 : 0 });

  let view = 'temp';
  const holder = el('div', { class: 'chart' });
  const legend = el('div', { class: 'legend' });
  const chips = ['temp', 'prcp'].map((v) => el('button', { type: 'button', class: 'chip', 'aria-pressed': String(v === view), 'data-cv': v }, t(v === 'temp' ? 'climate.temperature' : 'climate.precipitation')));
  const draw = () => {
    holder.replaceChildren(chart(series, view, { t, locale }));
    legend.replaceChildren(
      ...(view === 'temp'
        ? [el('span', {}, el('i', { class: 'lg-hi' }), t('climate.avgHigh', { unit: tUnit })), el('span', {}, el('i', { class: 'lg-lo' }), t('climate.avgLow', { unit: tUnit }))]
        : [el('span', {}, el('i', { class: 'lg-lo' }), t('climate.precipUnit', { unit: pUnit }))]),
    );
    chips.forEach((c) => c.setAttribute('aria-pressed', String(c.dataset.cv === view)));
  };
  chips.forEach((c) => c.addEventListener('click', () => ((view = c.dataset.cv), draw())));
  draw();

  const far = dist.value > 25 || (f.elevation?.value !== null && f.elevation?.value !== undefined && Math.abs(st.elevationM - f.elevation.value) > 300);
  const stationBtn = el('button', { type: 'button', class: 'linklike', 'aria-haspopup': 'dialog' }, t('climate.stationLine', { name: st.name, id: st.id, distance: formatFact(dist, ctx).text }));
  stationBtn.addEventListener('click', () => ctx.onOpen('climate.stationDistance'));
  const annualBtn = el('button', { type: 'button', class: 'linklike', 'aria-haspopup': 'dialog' }, t('climate.howComputed'));
  annualBtn.addEventListener('click', () => ctx.onOpen('climate.annual'));

  container.replaceChildren(
    el('div', { class: 'chips', role: 'group', 'aria-label': t('climate.view') }, chips),
    el(
      'div',
      { class: 'climate' },
      el('div', {}, legend, holder),
      el(
        'div',
        { class: 'summary' },
        el('div', { class: 'row' }, el('div', {}, el('b', {}, `${fmtT(a.tmaxF)} / ${fmtT(a.tminF)}`), t('climate.annualHighLow'))),
        el('div', { class: 'row' }, el('div', {}, el('b', {}, `${fmtP} ${pUnit}`), t('climate.annualPrecip'))),
        el('div', { class: 'row' }, el('div', {}, el('b', {}, full[a.warmestMonth - 1]), t('climate.warmest'))),
        el('div', { class: 'row' }, el('div', {}, el('b', {}, full[a.wettestMonth - 1]), t('climate.wettest'))),
        annualBtn,
      ),
    ),
    el('p', { class: 'notes' }, stationBtn),
    far && el('p', { class: 'prov-warn' }, t('climate.farStation')),
  );
}
