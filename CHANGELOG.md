# Changelog

All notable changes to City Explorer. Versions follow `package.json`.

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
