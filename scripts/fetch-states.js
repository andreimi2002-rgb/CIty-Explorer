// Writes data/reference/states.json: code, FIPS, name and bounding box of every state
// from the Census TIGERweb States layer. Usage: node scripts/fetch-states.js
import { getJson } from './lib/http.js';
import { writeJson, today, refuse } from './lib/files.js';
import { STATES_LAYER, layerUrl, query, validateStates } from './lib/census.js';

const meta = await getJson(`${layerUrl(STATES_LAYER)}?f=json`);
if (meta.name !== STATES_LAYER.name) refuse('states', [`layer ${STATES_LAYER.id} is "${meta.name}", expected "${STATES_LAYER.name}"`]);

const list = await getJson(query(STATES_LAYER, { where: '1=1', outFields: 'STUSAB,STATE,NAME', returnGeometry: 'false' }));
const states = [];
for (const { attributes: a } of list.features) {
  const ext = await getJson(query(STATES_LAYER, { where: `STATE='${a.STATE}'`, returnExtentOnly: 'true', outSR: '4326' }), { delayMs: 300 });
  const e = ext.extent;
  states.push({
    code: a.STUSAB.toLowerCase(),
    fips: a.STATE,
    name: a.NAME,
    bbox: [e.xmin, e.ymin, e.xmax, e.ymax].map((v) => Number(v.toFixed(4))),
  });
}
states.sort((x, y) => x.code.localeCompare(y.code));

const problems = validateStates(states);
if (problems.length) refuse('states', problems);

writeJson('data/reference/states.json', {
  source: {
    name: 'U.S. Census Bureau, TIGERweb Generalized ACS2025, States 500K',
    url: layerUrl(STATES_LAYER),
    retrieved: today(),
    licence: 'Public domain (U.S. government work)',
  },
  states,
});
console.log(`Wrote data/reference/states.json (${states.length} states and territories).`);
