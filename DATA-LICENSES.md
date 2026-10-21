# Data and asset licences

Every dataset, image source and font used by City Explorer is listed here with its licence, its source and how it is used. Nothing is displayed that is not listed.

## Fonts

| Asset | Licence | Source | Used for |
|---|---|---|---|
| Plus Jakarta Sans | SIL Open Font License 1.1, text in `fonts/OFL-plus-jakarta-sans.txt` | https://github.com/tokotype/PlusJakartaSans (via `@fontsource-variable/plus-jakarta-sans@5.2.5`) | All interface text |
| JetBrains Mono | SIL Open Font License 1.1, text in `fonts/OFL-jetbrains-mono.txt` | https://github.com/JetBrains/JetBrainsMono (via `@fontsource-variable/jetbrains-mono@5.2.5`) | Clock, provenance tags, codes |

Details: [`fonts/README.md`](fonts/README.md).

## Datasets (prepared offline, committed in `data/`)

| Dataset | Licence | Source | Vintage / retrieved | Script | Used for |
|---|---|---|---|---|---|
| State codes, FIPS, names, bounding boxes | Public domain (U.S. government work) | U.S. Census Bureau, TIGERweb Generalized ACS2025, States 500K (`.../Generalized_ACS2025/State_County/MapServer/7`) | retrieved 21 Oct 2026 | `scripts/fetch-states.js` | `data/reference/states.json`: checking that boundaries lie in their state |
| City limits (cartographic, clipped to the shoreline), official name, internal point | Public domain (U.S. government work) | U.S. Census Bureau, TIGERweb Generalized ACS2025, Incorporated Places 500K (`.../Generalized_ACS2025/Places_CouSub_ConCity_SubMCD/MapServer/10`) | vintage 1 Jan 2025, retrieved 21 Oct 2026 | `scripts/fetch-boundary.js` | Map boundary, page name, weather point |
| City and place labels, descriptions, coordinates, main image (P18) | CC0 1.0 | Wikidata, https://www.wikidata.org/ | retrieved 21 Oct 2026 | `scripts/fetch-photos.js` | Hero text, highlight cards, map pins |
| Photos | Per file: public domain, CC0, CC BY or CC BY-SA only; author, licence and file page stored with each photo and shown on the page | Wikimedia Commons, https://commons.wikimedia.org/ | retrieved 21 Oct 2026 | `scripts/fetch-photos.js` (choice of hero: `scripts/suggest-hero.js` + a person) | Hero and highlight photos, loaded from Wikimedia's servers |

Curation (which city uses which Census GEOID, Wikidata item, hero file and highlights) is in `data/curation/<state>/<slug>.json`.

## Live services (called while the page is open)

| Service | Licence / terms | Called from | Used for |
|---|---|---|---|
| MET Norway Locationforecast 2.0 (compact) | Data CC BY 4.0 (and NLOD 2.0); terms https://api.met.no/doc/TermsOfService: identifying User-Agent, max 4 decimals, respect Expires | `netlify/functions/weather.js` only (never the browser); cached on Netlify's CDN until MET's Expires time | Weather card |
| OpenFreeMap map styles and tiles (`liberty`, `dark`) | Free service, no key. Map data © OpenStreetMap contributors (ODbL 1.0), tiles OpenMapTiles; attribution shown on the map | Browser (`js/components/map.js`) | City map |

## Software and icons (self-hosted)

| Asset | Licence | Source | Used for |
|---|---|---|---|
| MapLibre GL JS 6.13.0 | BSD-3-Clause, `vendor/maplibre-gl-6.13.0/LICENSE.txt` | npm `maplibre-gl@6.13.0` | Map rendering |
| MET Norway weather icons | MIT, `icons/weather/LICENSE` | https://github.com/metno/weathericons (commit 89e3173) | Weather symbol |

Details: [`vendor/README.md`](vendor/README.md), [`icons/weather/README.md`](icons/weather/README.md).
