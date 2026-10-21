// Loads the prepared data files of one city. A missing file means "no data yet", not an error.

async function getJson(path) {
  try {
    const res = await fetch(path);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

/** The cities that have data (data/index.json, built by scripts/build-index.js). */
export const loadIndex = () => getJson('/data/index.json');

export async function loadCityData({ state, slug }) {
  const [boundary, photos, states, city] = await Promise.all([
    getJson(`/data/boundaries/${state}/${slug}.geojson`),
    getJson(`/data/photos/${state}/${slug}.json`),
    getJson('/data/reference/states.json'),
    getJson(`/data/cities/${state}/${slug}.json`),
  ]);
  return { boundary, photos, city, state: states?.states.find((s) => s.code === state) ?? null };
}
