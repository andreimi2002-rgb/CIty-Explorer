// City search over data/search.json entries { s, n, a, c, p, ll }. Pure.

/** Lower case, no accents, punctuation as spaces: "La Cañada-Flintridge" -> "la canada flintridge". */
export function normalize(text) {
  return String(text)
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

/** 0 exact name, 1 name starts with the query, 2 a word starts with it, 3 contains it; null = no match. */
function score(name, q) {
  const n = normalize(name);
  if (n === q) return 0;
  if (n.startsWith(q)) return 1;
  if (` ${n}`.includes(` ${q}`)) return 2;
  if (n.includes(q)) return 3;
  return null;
}

/** Best matches first; among equals, the larger city first. */
export function searchCities(list, query, limit = 8) {
  const q = normalize(query);
  if (!q) return [];
  const hits = [];
  for (const city of list) {
    const scores = [city.n, ...(city.a || [])].map((name) => score(name, q)).filter((x) => x !== null);
    if (scores.length) hits.push({ city, score: Math.min(...scores) });
  }
  hits.sort((x, y) => x.score - y.score || (y.city.p ?? 0) - (x.city.p ?? 0) || x.city.n.localeCompare(y.city.n));
  return hits.slice(0, limit).map((h) => h.city);
}
