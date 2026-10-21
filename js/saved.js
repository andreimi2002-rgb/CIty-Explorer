// "My cities": a list of city ids kept in the browser only. Storage is injected so it can be tested;
// blocked storage simply means nothing is remembered.
const KEY = 'ce-saved';
const ID_RE = /^[a-z]{2}\/[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function readSaved(store) {
  try {
    const list = JSON.parse(store.get(KEY) || '[]');
    return Array.isArray(list) ? list.filter((x) => typeof x === 'string' && ID_RE.test(x)) : [];
  } catch {
    return [];
  }
}

export function isSaved(store, id) {
  return readSaved(store).includes(id);
}

/** Adds or removes a city; newest first. Returns true when the city is now saved. */
export function toggleSaved(store, id) {
  const list = readSaved(store);
  const next = list.includes(id) ? list.filter((x) => x !== id) : [id, ...list];
  store.set(KEY, JSON.stringify(next));
  return next.includes(id);
}
