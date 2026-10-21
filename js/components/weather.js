import { el } from '../dom.js';
import { formatQuantity, UNIT_KEYS } from '../units.js';
import { weatherSymbol } from '../weather-symbols.js';

async function fetchOnce(url) {
  try {
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) return null;
    const data = await res.json();
    return Number.isFinite(data.temperatureC) ? data : null;
  } catch {
    return null;
  }
}

/**
 * Fetches current weather for a point through our Netlify function; one more try after a short
 * pause if the first fails (the forecast service is sometimes slow). Returns null on failure.
 */
export async function fetchWeather([lon, lat], { retryDelayMs = 4000 } = {}) {
  const url = `/api/weather?lat=${lat.toFixed(4)}&lon=${lon.toFixed(4)}`;
  const first = await fetchOnce(url);
  if (first || retryDelayMs === null) return first;
  await new Promise((r) => setTimeout(r, retryDelayMs));
  return fetchOnce(url);
}

const withUnit = (q, t) => t('value.withUnit', { n: q.text, unit: t(UNIT_KEYS[q.unit]) });

function minutesAgo(iso, now = Date.now()) {
  const m = Math.max(0, Math.round((now - Date.parse(iso)) / 60000));
  return Number.isFinite(m) ? m : null;
}

/** The "Weather now" block of the hero card. data === null shows why it is missing. */
export function renderWeather(container, data, { t, system, locale = 'en-US' }) {
  if (!data) {
    container.replaceChildren(
      el('div', { class: 'label' }, t('weather.now')),
      el('div', { class: 'wx-na' }, t('weather.unavailable')),
      el('small', {}, t('weather.unavailableReason')),
    );
    return;
  }
  const sym = weatherSymbol(data.symbol);
  const temp = formatQuantity(data.temperatureC, 'degC', 'temperature', system, { locale });
  const wind = data.windSpeedMs === null ? null : formatQuantity(data.windSpeedMs, 'ms', 'speed', system, { locale });
  const rain = data.precipitationMm === null ? null : formatQuantity(data.precipitationMm, 'mm', 'precipitation', system, { locale, digits: system === 'us' ? 2 : 1 });
  const ago = data.updatedAt ? minutesAgo(data.updatedAt) : null;
  const rel = ago === null ? null : new Intl.RelativeTimeFormat(locale, { numeric: 'auto' }).format(-ago, 'minute');

  // A wrapper element skips missing parts (null/false), like every el() call.
  const parts = el(
    'div',
    {},
    el('div', { class: 'label' }, t('weather.now')),
    el(
      'div',
      { class: 'wx-now' },
      sym && el('img', { src: sym.icon, alt: t(sym.key), width: 44, height: 44, class: 'wx-icon' }),
      el('span', { class: 'wx-temp' }, withUnit(temp, t)),
    ),
    sym && el('div', { class: 'wx-sym' }, t(sym.key)),
    el(
      'ul',
      { class: 'wx-list' },
      wind && el('li', {}, t('weather.wind', { value: withUnit(wind, t) })),
      rain && el('li', {}, t('weather.precipNextHour', { value: withUnit(rain, t) })),
    ),
    el(
      'small',
      {},
      rel && t('weather.updated', { when: rel }),
      rel && ' · ',
      el('a', { href: data.source.url, rel: 'noopener', target: '_blank' }, t('weather.sourceShort')),
      temp.computed && ` · ${t('weather.converted')}`,
    ),
  );
  container.replaceChildren(...parts.childNodes);
}
