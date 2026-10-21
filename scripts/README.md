# scripts/

Offline data preparation (Node 20+, no dependencies, run by hand). Each script takes a state code, writes to `data/`, and refuses to write anything if a result looks broken. Requests identify the project with a User-Agent and are sent one at a time.

## Order for a state (example: `ca`)

| # | Script | Writes | Source |
|---|---|---|---|
| 0 | `node scripts/fetch-states.js` (once) | `data/reference/states.json` | Census TIGERweb, States 500K |
| 1 | `node scripts/build-places.js ca` | `data/reference/places-ca.json` | Census Gazetteer 2025, USGS GNIS, Wikidata |
| 2 | `node scripts/fetch-boundary.js ca` | `data/boundaries/ca/<slug>.geojson` | Census TIGERweb, Incorporated Places 500K |
| 3 | `node scripts/fetch-census.js ca` | `data/sources/ca/census.json` | Census API (2020 DHC, ACS 5-year; needs `CENSUS_API_KEY` in `.env`), Population Estimates, Gazetteer 2020/2025 |
| 4 | `node scripts/fetch-elevation.js ca` | `data/sources/ca/elevation.json` | USGS 3DEP Elevation Point Query |
| 5 | `node scripts/fetch-timezone.js ca` | `data/sources/ca/timezone.json` | timezone-boundary-builder (download cached in `tmp/`) |
| 6 | `node scripts/fetch-climate.js ca` | `data/sources/ca/climate.json` | NOAA NCEI Normals 1991–2020 (station files cached in `tmp/noaa/`) |
| 7 | `node scripts/build-cities.js ca` | `data/cities/ca/<slug>.json` | the files of steps 1–6 |
| 8 | `node scripts/fetch-photos.js ca` | `data/photos/ca/<slug>.json` | Wikidata + Wikimedia Commons |
| 9 | `node scripts/build-index.js` | `data/index.json` | city, boundary and photo files |
| – | `node scripts/suggest-hero.js ca <slug>` | `tmp/hero-candidates/ca-<slug>.html` and `.json` (not committed) | Commons skyline/downtown categories |

Steps 2 and 8 accept city slugs after the state code to update only those cities.

## Manual choices

`data/curation/<state>/<slug>.json` holds what a person decided: the hero photo file and its focus point, highlight items. `suggest-hero.js` only proposes; a person writes the choice there.

## Secrets

`CENSUS_API_KEY` goes in the `.env` file at the project root (ignored by git). Keys are masked in error messages and never written to `data/`.

Pure functions live in `scripts/lib/` and `js/` and are tested in `tests/`.
