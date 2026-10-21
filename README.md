# City Explorer

An interactive encyclopedia of cities: one page per city with population, geography, climate, transport, places, history and comparisons. Every number shows its source, year and definition. First scope: California.

- Rules for contributors and AI agents: [AGENTS.md](AGENTS.md)
- Development plan (Romanian): [DEVELOPMENT_PLAN.md](DEVELOPMENT_PLAN.md)
- Design reference: [docs/design/prototype-san-francisco.html](docs/design/prototype-san-francisco.html)

Status: stage 2 (version 0.3.0). All 483 California cities have a page with Census, USGS and NOAA figures, each with its source; San Francisco also has highlight cards. Data sources and licences: [DATA-LICENSES.md](DATA-LICENSES.md).

Development: `npm test` runs all tests (Node 20+, no dependencies). Data scripts: [scripts/README.md](scripts/README.md).
