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
| List of incorporated places, land and water area (2020, 2025) | Public domain (U.S. government work) | U.S. Census Bureau, Gazetteer Files 2020 and 2025, places | retrieved 21 Oct 2026 | `scripts/build-places.js`, `scripts/fetch-census.js` | City list, land area, density |
| GNIS ids and city center points (Populated Place) | Public domain (U.S. government work) | USGS Geographic Names Information System, Domestic Names (state text file) | file of 29 Sep 2026, retrieved 21 Oct 2026 | `scripts/build-places.js` | Reference point for elevation, weather and climate station |
| Wikidata items by GNIS id (P590) | CC0 1.0 | Wikidata Query Service | retrieved 21 Oct 2026 | `scripts/build-places.js` | Link to photos and descriptions |
| Population, 2020 Census (P1_001N) | Public domain (U.S. government work) | U.S. Census Bureau, 2020 Census DHC, Census Data API (free key, kept in the local `.env`, never committed) | April 1, 2020 | `scripts/fetch-census.js` | Population, density 2020 |
| Population estimates, July 1, 2025 and estimates base 2020 | Public domain (U.S. government work) | U.S. Census Bureau, Population Estimates Program, Vintage 2025, `sub-est2025_<state>.csv` | July 1, 2025 | `scripts/fetch-census.js` | Population, change, density 2025 |
| Income, home value, education, foreign-born, poverty, commute (with margins of error) | Public domain (U.S. government work) | U.S. Census Bureau, American Community Survey 5-year 2020–2024, Data Profiles, Census Data API | 2020–2024, money in 2024 dollars | `scripts/fetch-census.js` | People & economy |
| Elevation at the city center | Public domain (U.S. government work) | USGS 3D Elevation Program, Elevation Point Query Service | retrieved 21 Oct 2026 | `scripts/fetch-elevation.js` | Elevation |
| Time zone boundaries | ODbL 1.0 (© OpenStreetMap contributors) | timezone-boundary-builder release 2026e (downloaded to `tmp/`, only the result is committed) | release of 11 Oct 2026 | `scripts/fetch-timezone.js` | Time zone, local time |
| Monthly climate normals (max, min, precipitation) | Public domain (U.S. government work) | NOAA NCEI U.S. Climate Normals 1991–2020, monthly, per station | 1991–2020 | `scripts/fetch-climate.js` | Climate chart and summary |

Curation (manual choices: hero file and focus point, highlights) is in `data/curation/<state>/<slug>.json`. The generated intermediate files are in `data/reference/` and `data/sources/<state>/`; the page reads `data/cities/<state>/<slug>.json`.

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
