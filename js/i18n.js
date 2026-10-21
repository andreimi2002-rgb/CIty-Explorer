// Interface text. Every visible string lives in /i18n/<lang>.json; components only use keys.

/** Builds t(key, params). "{name}" placeholders are filled from params; a missing key returns the key itself. */
export function createT(dict) {
  return function t(key, params) {
    if (!Object.hasOwn(dict, key)) {
      if (typeof console !== 'undefined') console.warn(`Missing i18n key: ${key}`);
      return key;
    }
    const text = dict[key];
    if (!params) return text;
    return text.replace(/\{(\w+)\}/g, (match, name) => (Object.hasOwn(params, name) ? String(params[name]) : match));
  };
}

/** Parses data-i18n-attr="placeholder:search.soon;aria-label:search.label" into [[attr, key], ...]. */
export function parseAttrSpec(spec) {
  return String(spec)
    .split(';')
    .map((pair) => pair.split(':').map((s) => s.trim()))
    .filter(([attr, key]) => attr && key);
}

export async function loadDict(lang) {
  const res = await fetch(`/i18n/${lang}.json`);
  if (!res.ok) throw new Error(`Could not load /i18n/${lang}.json (${res.status})`);
  return res.json();
}

/** Fills [data-i18n] text and [data-i18n-attr] attributes under root. */
export function applyI18n(root, t) {
  for (const el of root.querySelectorAll('[data-i18n]')) el.textContent = t(el.dataset.i18n);
  for (const el of root.querySelectorAll('[data-i18n-attr]')) {
    for (const [attr, key] of parseAttrSpec(el.dataset.i18nAttr)) el.setAttribute(attr, t(key));
  }
}
