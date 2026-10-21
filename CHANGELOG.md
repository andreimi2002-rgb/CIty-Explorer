# Changelog

All notable changes to City Explorer. Versions follow `package.json`.

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
