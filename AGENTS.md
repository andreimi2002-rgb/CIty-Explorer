# AGENTS.md — permanent project rules

## Product
City Explorer is an interactive, visual encyclopedia of cities: one page per city with population, geography, climate, transport, places, history and comparisons, every number with its source. It is not a travel guide and not an AI content site. First scope: the cities of **California** (Census "incorporated places"). More US states come later as data packages. The long-term goal is a high-quality product that can be monetized (reports, comparisons, exports); the basic city profile stays free.

Plain HTML/CSS/ES modules, no build step, Netlify publishes the repository root, Netlify Functions for anything that needs a server, tests with `node --test`. Same stack and habits as the owner's other projects (Airport Live, FOS).

## Provenance (every displayed fact has exactly one level)
- **sourced**: from a named public dataset or service (name, URL, vintage or retrieval date, licence).
- **computed**: derived from other values (formula and inputs viewable), e.g. density = population / land area.
- **estimated**: a reasoned approximation; it must state its basis.

Never present a computed or estimated value as sourced. Never invent numbers, dates, names or descriptions. A value without a source is `null` and the page shows "Not available yet" with the reason. Every fact shows its year or period.

## Comparability (the core rule of the product)
- A comparison row only mixes values with the same definition, geography and period. City population means **city limits** (Census incorporated place); metro population is a separate, labelled indicator and is never compared with city-limits values.
- Density uses **land area**, never total area with water.
- Money values state the currency and the dollar year (e.g. "2024 dollars"). Never put different currencies in one comparison row.
- When two sources disagree (e.g. an elevation of 283 m vs 285 m), show the value from the primary source and list the conflict on the city's "Data & sources" section.

## Data and services
- No paid APIs in core features. Preferred sources: U.S. Census Bureau (Decennial Census, ACS, population estimates, TIGER/cartographic boundaries; public domain), NOAA NCEI climate normals 1991–2020 (public domain), USGS/GNIS, Wikidata (CC0), Wikipedia (CC BY-SA, with attribution), Wikimedia Commons (free licences only), OpenStreetMap (ODbL), public GTFS feeds of transit agencies (check each licence), MET Norway Locationforecast (CC BY 4.0) for live weather, MapLibre + OpenFreeMap for maps.
- Large datasets are prepared **offline** by scripts in `scripts/`, written to `data/`, committed, and refused if the result looks broken (same pattern as FOS and Airport Live). The live site does not call Census or NOAA.
- No API keys in client code or git (Netlify environment variables only).
- Every dataset is documented in `DATA-LICENSES.md`. Fonts are self-hosted with their licences in `fonts/`.
- States are data, not code: no hard-coded state or city lists in the UI or scripts. Adding a state means running the scripts with its code.

## Images
- No AI-generated images, ever. Photos only from Wikimedia Commons with a free licence (public domain, CC0, CC BY, CC BY-SA), each with author, licence and link to the file page, and with a checked URL. Maps, flags, seals, logos and collages are excluded.
- A city's main (hero) photo is the best available photo of its downtown or skyline: a script ranks Commons candidates (Featured picture > Quality image > Valued image, then resolution, then recency; landscape, at least 2400 px wide), a person chooses, and the choice is recorded with its focus point in the city's curation file. Without candidates, the Wikidata image (P18) is used.
- Every photo has a styled fallback panel when it is missing or fails to load.
- No satellite layer until the imagery licence is verified (USDA NAIP is public domain and is the first candidate).

## Interface
- Design reference: `docs/design/prototype-san-francisco.html` (structure and look) and the owner's AI mockup (inspiration only, not a specification; its numbers are not to be copied). Keep the visual system consistent once tokens exist in `styles.css`.
- Interface in English (US audience); all UI text in `i18n/en.json`, components contain no literal text. Numbers and dates via `Intl`. Metric and US units both supported; the city's own convention is the default.
- Works equally well on desktop and phone: no horizontal scroll at 400 px, keyboard and touch, contrast at least 4.5:1, `prefers-reduced-motion` respected, light and dark theme.
- Every city has its own URL: `/city/<state>/<slug>` (e.g. `/city/ca/san-francisco`).

## Working mode
- One branch and one PR per logical task; never work on `main`. Small commits with clear messages.
- Before each stage, write its plan in `docs/` (Romanian) and wait for the owner's approval.
- Nothing is merged or reaches production without the owner's explicit approval and a reviewed Deploy Preview. With each preview, say what to check on desktop and on phone.
- Ask the owner before important decisions: a new data source, library, dependency, anything that needs an account or costs money, design changes. Offer 2–3 options with a recommendation. Small reversible details: decide, say so, continue.
- Tests for every data script and pure function. Update `CHANGELOG.md` and the version with every change.
- Say what was tested and what could not be tested. Never claim something works without running it.
- The owner has no programming background: explain in plain words what changed and why.
- Plans and reports for the owner are written in Romanian; this file, code and comments are in English.
