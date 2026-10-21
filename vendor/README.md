# vendor/

Third-party code, self-hosted and pinned. No CDN at runtime, no npm dependency.

| Folder | Library | Version | Licence | Source |
|---|---|---|---|---|
| `maplibre-gl-6.13.0/` | MapLibre GL JS | 6.13.0 (released 6 October 2026) | BSD-3-Clause, `LICENSE.txt` | npm package `maplibre-gl@6.13.0`, files `dist/maplibre-gl.mjs`, `dist/maplibre-gl-worker.mjs`, `dist/maplibre-gl.css`, `LICENSE.txt`, downloaded 21 October 2026 from cdn.jsdelivr.net |

MapLibre 6 ships as ES modules. `maplibre-gl.mjs` loads its worker from `./maplibre-gl-worker.mjs` next to itself, so both files stay in the same folder. Source maps are not included (the browser may report them missing in developer tools only).

To update: download the new version into a new folder `maplibre-gl-<version>/`, change the import path in `js/components/map.js`, delete the old folder.
