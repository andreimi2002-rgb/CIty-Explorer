// City page addresses: /city/<state>/<slug>, e.g. /city/ca/san-francisco.
// Pure functions, no DOM, so they run under node --test.

const STATE_RE = /^[a-z]{2}$/;
const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const PATH_RE = /^\/city\/([^/]+)\/([^/]+)\/?$/;

/** Returns { state, slug } for a valid city path, otherwise null. Case-insensitive. */
export function parseCityPath(pathname) {
  if (typeof pathname !== 'string') return null;
  let decoded;
  try {
    decoded = decodeURIComponent(pathname);
  } catch {
    return null;
  }
  const m = decoded.toLowerCase().match(PATH_RE);
  if (!m) return null;
  const [, state, slug] = m;
  if (!STATE_RE.test(state) || !SLUG_RE.test(slug)) return null;
  return { state, slug };
}

/** The canonical path for a city: lower case, no trailing slash. */
export function cityPath({ state, slug }) {
  return `/city/${state}/${slug}`;
}

/**
 * A provisional display name built from the slug ("san-francisco" -> "San Francisco").
 * Used only until the city's data file supplies the official Census name;
 * the page labels it as coming from the address.
 */
export function titleFromSlug(slug) {
  return slug
    .split('-')
    .filter(Boolean)
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join(' ');
}
