// Display of city facts (data/cities/<state>/<slug>.json) in the chosen unit system. Pure.
// A value shown in another unit than its source is a conversion: `converted` is true and the
// page labels it as computed.
import { convert, convertPer, formatNumber, unitFor, UNIT_KEYS, DIGITS } from './units.js';

const QUANTITY = { mi2: 'area', m: 'elevation', ft: 'elevation', degF: 'temperature', in: 'precipitation' };

const decimalsOf = (n) => Math.min(3, (String(n).split('.')[1] || '').length);

/**
 * { text, converted } for a fact, or null when the value is missing.
 * exact: show the value with the precision of its source (used for formula inputs).
 */
export function formatFact(fact, { t, system, locale = 'en-US', exact = false }) {
  if (!fact || fact.value === null || fact.value === undefined) return null;
  const v = fact.value;
  const num = (n, digits = 0) => formatNumber(n, { locale, digits });
  switch (fact.unit) {
    case 'people':
      return { text: num(v), converted: false };
    case 'mi2':
    case 'm': {
      const target = unitFor(QUANTITY[fact.unit], system);
      const value = convert(v, fact.unit, target);
      const digits = exact && target === fact.unit ? decimalsOf(v) : DIGITS[target];
      return { text: t('value.withUnit', { n: num(value, digits), unit: t(UNIT_KEYS[target]) }), converted: target !== fact.unit };
    }
    case 'people/mi2': {
      const target = unitFor('area', system);
      return { text: t('value.perArea', { n: num(convertPer(v, 'mi2', target)), unit: t(UNIT_KEYS[target]) }), converted: target !== 'mi2' };
    }
    case 'USD': {
      const money = new Intl.NumberFormat(locale, { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(v);
      return { text: fact.qualifier === 'or more' ? t('value.orMore', { n: money }) : money, converted: false };
    }
    case '%':
      return { text: t('value.percent', { n: num(v, 1) }), converted: false };
    case 'min':
      return { text: t('value.minutes', { n: num(v, 1) }), converted: false };
    case 'degF':
    case 'in': {
      const target = unitFor(QUANTITY[fact.unit], system);
      const digits = target === 'degC' ? 1 : target === 'in' ? 1 : 0;
      return { text: t('value.withUnit', { n: num(convert(v, fact.unit, target), digits), unit: t(UNIT_KEYS[target]) }), converted: target !== fact.unit };
    }
    case 'km': {
      const target = unitFor('distance', system);
      return { text: t('value.withUnit', { n: num(convert(v, 'km', target), 1), unit: t(UNIT_KEYS[target]) }), converted: target !== 'km' };
    }
    default:
      return { text: String(v), converted: false };
  }
}

/** Margin of error in the same format as the value ("± $2,911"), or null. */
export function formatMoe(fact, ctx) {
  if (!fact || fact.moe === null || fact.moe === undefined || fact.value === null) return null;
  const f = formatFact({ ...fact, value: fact.moe, qualifier: undefined }, ctx);
  return f ? ctx.t('value.moe', { n: f.text }) : null;
}

/** Short time zone name ("PDT") and current UTC offset ("UTC−7") for an IANA zone at a given instant. */
export function zoneLabel(timeZone, date = new Date(), locale = 'en-US') {
  const part = (opts, type) => new Intl.DateTimeFormat(locale, { timeZone, ...opts }).formatToParts(date).find((p) => p.type === type)?.value ?? '';
  const short = part({ timeZoneName: 'short' }, 'timeZoneName');
  const offset = part({ timeZoneName: 'shortOffset' }, 'timeZoneName').replace('GMT', 'UTC').replace('-', '−') || 'UTC';
  return { short, offset };
}

/** Local time "HH:MM" in a time zone. */
export function localTime(timeZone, date = new Date(), locale = 'en-US') {
  return new Intl.DateTimeFormat(locale, { timeZone, hour: '2-digit', minute: '2-digit', hour12: false }).format(date);
}

/** Converts a monthly normals series for display. */
export function climateSeries(monthly, system) {
  const temp = unitFor('temperature', system);
  const prcp = unitFor('precipitation', system);
  return {
    tmax: monthly.tmaxF.map((v) => convert(v, 'degF', temp)),
    tmin: monthly.tminF.map((v) => convert(v, 'degF', temp)),
    prcp: monthly.prcpIn.map((v) => convert(v, 'in', prcp)),
    tempUnit: temp,
    prcpUnit: prcp,
    converted: system !== 'us',
  };
}
