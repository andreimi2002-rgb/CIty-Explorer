// Builds the home-page index from city data files. Pure.

/**
 * entries: [{ state, slug, boundary, photos | null }]; states: data/reference/states.json states.
 * Returns { index, problems }. Cities are sorted by name within each state, states by name.
 */
export function buildIndex(entries, states) {
  const problems = [];
  const byState = new Map();
  for (const e of entries) {
    const state = states.find((s) => s.code === e.state);
    if (!state) {
      problems.push(`${e.state}/${e.slug}: unknown state`);
      continue;
    }
    const name = e.boundary?.properties?.basename;
    if (!name) {
      problems.push(`${e.state}/${e.slug}: boundary has no name`);
      continue;
    }
    const hero = e.photos?.hero;
    const city = {
      slug: e.slug,
      path: `/city/${e.state}/${e.slug}`,
      name,
      description: e.photos?.city?.description ?? null,
      photo: hero
        ? {
            src: hero.srcSmall ?? hero.src,
            width: hero.widthSmall ?? hero.width,
            height: hero.heightSmall ?? hero.height,
            focus: hero.focus,
            author: hero.author,
            licence: hero.licence,
            licenceUrl: hero.licenceUrl,
            page: hero.page,
          }
        : null,
    };
    if (!byState.has(state.code)) byState.set(state.code, { code: state.code, name: state.name, cities: [] });
    byState.get(state.code).cities.push(city);
  }
  const list = [...byState.values()].sort((a, b) => a.name.localeCompare(b.name));
  for (const s of list) s.cities.sort((a, b) => a.name.localeCompare(b.name));
  return { index: { states: list }, problems };
}
