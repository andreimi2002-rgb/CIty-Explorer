# Changelog

All notable changes to City Explorer. Versions follow `package.json`.

## [0.4.0] - 2026-10-21

Stage 3: search, comparisons, City DNA and saved cities (plan: `docs/STAGE-3-PLAN.md`).

### Added
- City search on every page (ARIA combobox): `/` focuses it, Ctrl+K / Cmd+K from anywhere; accent- and case-insensitive, alternate names ("Ventura", "Saint Helena"), county and 2025 population in the results. Data: `data/search.json` (48 KB), built by `scripts/build-index.js`; county from GNIS.
- Comparison of up to 5 cities: on each city page (2 nearest cities + 2 of the closest size by default, editable) and on `/compare?cities=...` with a shareable address. Only rows with one definition (same period, unit, dollar year); mismatches are detected and marked; margins of error and low-reliability marks; every value opens its provenance.
- City DNA: bars scaled to the highest value among the cities shown (no scores or rankings).
- "Save city", "Copy link" and "Compare" in the hero; "Your saved cities" on the home page, kept only in the browser.

## [0.3.0] - 2026-10-21

Stage 2: every California city has a page with real figures (plan: `docs/STAGE-2-PLAN.md`).

### Added
- Place list of 483 incorporated places (Census Gazetteer 2025), linked to GNIS and Wikidata (`scripts/build-places.js`). City center = GNIS Populated Place point.
- City data model: one file per city (`data/cities/<state>/<slug>.json`); every fact is sourced (with source) or computed (with formula and inputs), or null with a reason.
- Census: 2020 count, July 1, 2025 estimate and change, land/water area 2020 and 2025, density (same-year population and land area only), ACS 5-year 2020–2024 (income and home value in 2024 dollars, education, foreign-born, poverty, commute) with margins of error and low-reliability marks. The Census API key stays in the local, git-ignored `.env`.
- Elevation at the city center (USGS 3DEP), time zone (timezone-boundary-builder 2026e), NOAA 1991–2020 monthly normals from the nearest complete station, with its distance and a warning when it is far.
- Page: real KPIs, local clock, People & economy, climate chart (temperature/precipitation, US/metric), a provenance dialog on every figure (source, period, formula, inputs, margin of error), Data & sources generated from the city file.
- Home: the 12 largest cities as cards and all 483 cities A–Z.
- Hero photos chosen for Los Angeles, San Diego, Sacramento, Oakland, Stockton and Berkeley; other cities use their Wikidata image (the first usable one).

### Fixed
- Mountain House (incorporated 2024): its 2020 Census GEOID described the former CDP, so the 2020 count and area are not shown as city-limits values.
- Photo checks: "Seal Beach" no longer excluded as a "seal"; collages categorized as "Montages" are excluded; TIFF originals allowed.

## [0.2.0] - 2026-10-21

Stage 1: photos, map and live weather for San Francisco (plan: `docs/STAGE-1-PLAN.md`). Figures (population, area, climate, time zone) remain "Not available yet" until stage 2.

### Added
- Offline scripts: `fetch-states.js` and `fetch-boundary.js` (Census TIGERweb, shoreline-clipped city limits), `fetch-photos.js` (Wikidata + Commons, licence, category and URL checks; refuses to write broken results), `suggest-hero.js` (ranks downtown/skyline photos, a person chooses).
- San Francisco data: city limits, official name, internal point; hero photo "View of the Ferry Building from Pier 1" (Featured picture, CC BY-SA 4.0, Dllu); highlight cards for Golden Gate Bridge, Alcatraz Island, the cable car system and the Bay Bridge.
- Hero photo with credit (author, licence, Commons link), cropped around a chosen focus point; fallback panel if it fails to load.
- City map: MapLibre GL JS 6.13.0 (self-hosted, loaded only near the map), OpenFreeMap "liberty"/"dark" following the theme, Census boundary, numbered pins matching the cards, two-finger pan on touch screens.
- Live weather: Netlify function `/api/weather` for MET Norway Locationforecast, cached on the CDN until MET's Expires time; temperature, symbol (MET icons, MIT), wind, precipitation next hour; °F/mph/in or °C/km/h/mm.
- "Data & sources" lists every source used on the page.
- `404.html`: addresses like `/City/CA/San-Francisco` go to the lower-case city page.
- Home page "Cities" section: a card (photo, name, description, credit) for every city with data, from `data/index.json` built by `scripts/build-index.js` (no city list in code).
- Rule in AGENTS.md: the hero is the best available downtown/skyline photo, ranked by script and chosen by a person.
- Tests: geometry, Census validation, Commons/Wikidata checks and hero ranking, weather function, wind units, weather symbols, committed data files (77 tests).

## [0.1.0] - 2026-10-21

Stage 0: project setup (plan: `docs/STAGE-0-PLAN.md`).

### Added
- Static site published from the repository root, no build step. `netlify.toml` rewrites `/city/<state>/<slug>` to one template, `city.html`.
- Design tokens from the prototype (light and dark theme), sidebar, hero with photo fallback panel, sticky tabs, headline figures, highlight cards, section panels.
- Self-hosted fonts: Plus Jakarta Sans and JetBrains Mono (SIL OFL 1.1).
- All interface text in `i18n/en.json`.
- US units by default with a switch to metric, remembered per browser. Theme switch, remembered per browser.
- Every value is "Not available yet" with its reason; no city data is shown in this version.
- Tests (`npm test`): address parsing, unit conversion and formatting, i18n keys and no literal text, Netlify rewrite, self-hosted assets, font licences, colour contrast in both themes.
- `DATA-LICENSES.md` registry, `data/`, `scripts/`, `netlify/functions/` folders.
