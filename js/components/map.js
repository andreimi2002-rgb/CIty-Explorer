// City map: MapLibre (self-hosted) + OpenFreeMap tiles, the Census city boundary and the
// numbered highlight places. MapLibre (~1.6 MB) loads only when the map section nears the screen.
import { el } from '../dom.js';
import { mainPolygonBbox, extendBbox } from '../geo.js';

const MAPLIBRE = '../../vendor/maplibre-gl-6.13.0/maplibre-gl.mjs';
const MAPLIBRE_CSS = '/vendor/maplibre-gl-6.13.0/maplibre-gl.css';
const STYLES = {
  light: 'https://tiles.openfreemap.org/styles/liberty',
  dark: 'https://tiles.openfreemap.org/styles/dark',
};

const isDark = () => {
  const forced = document.documentElement.dataset.theme;
  return forced ? forced === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches;
};
const cssVar = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();

function webglAvailable() {
  try {
    const c = document.createElement('canvas');
    return !!(c.getContext('webgl2') || c.getContext('webgl'));
  } catch {
    return false;
  }
}

function addCityLayers(map, boundary) {
  if (map.getSource('city')) return;
  const accent = cssVar('--accent');
  map.addSource('city', { type: 'geojson', data: boundary });
  map.addLayer({ id: 'city-fill', type: 'fill', source: 'city', paint: { 'fill-color': accent, 'fill-opacity': 0.07 } });
  map.addLayer({ id: 'city-line', type: 'line', source: 'city', paint: { 'line-color': accent, 'line-width': 2.5 } });
}

function unavailable(container, t, reasonKey) {
  container.replaceChildren(el('div', { class: 'empty' }, el('b', {}, t('map.unavailable')), el('p', {}, t(reasonKey))));
}

/**
 * Renders the map panel body. boundary: GeoJSON Feature from data/boundaries;
 * places: [{ label, coords: [lon, lat] }] numbered in order.
 */
export function renderMap(container, { boundary, places, name, t }) {
  if (!webglAvailable()) return unavailable(container, t, 'map.noWebgl');

  const box = el('div', { class: 'map', role: 'region', 'aria-label': t('map.label', { name }) });
  const note = el('p', { class: 'map-note' }, t('map.boundaryNote'));
  container.replaceChildren(box, note);

  const start = async () => {
    let maplibregl;
    try {
      if (!document.querySelector(`link[href="${MAPLIBRE_CSS}"]`)) {
        document.head.append(el('link', { rel: 'stylesheet', href: MAPLIBRE_CSS }));
      }
      maplibregl = await import(MAPLIBRE);
    } catch {
      return unavailable(container, t, 'map.loadFailed');
    }

    // Frame the main city polygon plus the highlight places (some, like bridges, sit at the edge).
    const [w, s, e, n] = extendBbox(
      mainPolygonBbox(boundary.geometry, boundary.properties.internalPoint),
      places.map((p) => p.coords),
    );
    const touch = matchMedia('(pointer: coarse)').matches;
    const map = new maplibregl.Map({
      container: box,
      style: STYLES[isDark() ? 'dark' : 'light'],
      bounds: [[w, s], [e, n]],
      fitBoundsOptions: { padding: 40 },
      cooperativeGestures: touch,
      attributionControl: { compact: false },
      locale: {
        'CooperativeGesturesHandler.MobileHelpText': t('map.twoFingers'),
        'NavigationControl.ZoomIn': t('map.zoomIn'),
        'NavigationControl.ZoomOut': t('map.zoomOut'),
        'NavigationControl.ResetBearing': t('map.resetNorth'),
      },
    });
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');
    map.on('style.load', () => addCityLayers(map, boundary));
    map.on('error', (ev) => {
      // A failed style (tiles server down) leaves an empty map: say so instead.
      if (!map.isStyleLoaded() && ev?.error) unavailable(container, t, 'map.loadFailed');
    });

    places.forEach((p, i) => {
      if (!p.coords) return;
      const pin = el('button', { type: 'button', class: 'map-pin', 'aria-label': t('map.place', { n: i + 1, name: p.label }) }, String(i + 1));
      pin.addEventListener('click', () => document.getElementById(`highlight-${i + 1}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }));
      new maplibregl.Marker({ element: pin }).setLngLat(p.coords).addTo(map);
    });

    // Follow the page theme.
    let dark = isDark();
    const restyle = () => {
      if (isDark() === dark) return;
      dark = isDark();
      map.setStyle(STYLES[dark ? 'dark' : 'light']);
    };
    new MutationObserver(restyle).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    matchMedia('(prefers-color-scheme: dark)').addEventListener('change', restyle);
  };

  if (!('IntersectionObserver' in window)) return void start();
  const io = new IntersectionObserver(
    (entries) => {
      if (entries.some((en) => en.isIntersecting)) {
        io.disconnect();
        start();
      }
    },
    { rootMargin: '600px 0px' },
  );
  io.observe(box);
}
