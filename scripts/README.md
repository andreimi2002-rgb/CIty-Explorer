# scripts/

Offline data preparation (Node 20+, no dependencies, run by hand). Each script takes a state code, writes to `data/`, and refuses to write anything if a result looks broken. Requests identify the project with a User-Agent and are sent one at a time.

| Script | Writes | Source |
|---|---|---|
| `node scripts/fetch-states.js` | `data/reference/states.json` | Census TIGERweb, States 500K |
| `node scripts/fetch-boundary.js <state>` | `data/boundaries/<state>/<slug>.geojson` | Census TIGERweb, Incorporated Places 500K (vintage 1 Jan 2025) |
| `node scripts/fetch-photos.js <state>` | `data/photos/<state>/<slug>.json` | Wikidata (CC0) + Wikimedia Commons |
| `node scripts/build-index.js` | `data/index.json` | The boundary and photo files above (run last) |
| `node scripts/suggest-hero.js <state> <slug>` | `tmp/hero-candidates/<state>-<slug>.html` (not committed) | Wikimedia Commons skyline/downtown categories |

Which cities are processed: one curation file per city in `data/curation/<state>/<slug>.json` (Census GEOID, Wikidata item, chosen hero file and focus point, highlight items). `suggest-hero.js` only proposes; a person writes the chosen file into the curation file.

Pure functions live in `scripts/lib/` and `js/geo.js` and are tested in `tests/`.
