// Wikidata (CC0): labels, descriptions, image (P18), coordinates (P625), Commons category (P373). Pure.

export const WIKIDATA_API = 'https://www.wikidata.org/w/api.php';

export function entitiesUrl(ids) {
  if (!ids.length || ids.length > 50 || !ids.every((id) => /^Q\d+$/.test(id))) throw new Error(`Invalid Wikidata ids: ${ids}`);
  const q = new URLSearchParams({ action: 'wbgetentities', format: 'json', ids: ids.join('|'), props: 'labels|descriptions|claims', languages: 'en|mul' });
  return `${WIKIDATA_API}?${q}`;
}

/** Claim values, preferred first, without deprecated ones. */
function claimValues(entity, prop) {
  const claims = (entity.claims?.[prop] || []).filter((c) => c.rank !== 'deprecated' && c.mainsnak?.datavalue);
  return [...claims.filter((c) => c.rank === 'preferred'), ...claims.filter((c) => c.rank !== 'preferred')].map((c) => c.mainsnak.datavalue.value);
}
const claimValue = (entity, prop) => claimValues(entity, prop)[0] ?? null;

export function parseEntity(entity) {
  if (!entity || entity.missing !== undefined) return null;
  const coord = claimValue(entity, 'P625');
  return {
    qid: entity.id,
    // "mul" is Wikidata's label shared by many languages; some items only have that one.
    label: entity.labels?.en?.value ?? entity.labels?.mul?.value ?? null,
    description: entity.descriptions?.en?.value ?? null,
    image: claimValue(entity, 'P18'),
    images: claimValues(entity, 'P18'),
    coords: coord ? [Number(coord.longitude.toFixed(5)), Number(coord.latitude.toFixed(5))] : null,
    commonsCategory: claimValue(entity, 'P373'),
  };
}
