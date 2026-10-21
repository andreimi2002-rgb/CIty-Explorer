// Line icons from the design prototype. Each entry: [viewBox, inner SVG markup].
const SVG_NS = 'http://www.w3.org/2000/svg';

const ICONS = {
  grid: ['0 0 16 16', '<rect x="2" y="2" width="5" height="5" rx="1"/><rect x="9" y="2" width="5" height="5" rx="1"/><rect x="2" y="9" width="5" height="5" rx="1"/><rect x="9" y="9" width="5" height="5" rx="1"/>'],
  map: ['0 0 16 16', '<path d="M1.5 3.5l4-1.5 5 2 4-1.5v10l-4 1.5-5-2-4 1.5z"/><path d="M5.5 2v10M10.5 4v10"/>'],
  people: ['0 0 16 16', '<circle cx="6" cy="5" r="2.5"/><path d="M1.5 14c.5-3 2.3-4.5 4.5-4.5S10 11 10.5 14"/><circle cx="11.5" cy="5.5" r="2"/><path d="M11 9.5c2 0 3.2 1.5 3.5 4"/>'],
  cloud: ['0 0 16 16', '<path d="M4 11a3 3 0 0 1 .5-6A4 4 0 0 1 12 6a2.5 2.5 0 0 1 0 5z"/><path d="M5 13.5l-.5 1.5M8 13.5l-.5 1.5M11 13.5l-.5 1.5"/>'],
  train: ['0 0 16 16', '<rect x="3" y="1.5" width="10" height="10" rx="2.5"/><path d="M3 7h10M5.5 14l1-2.5M10.5 14l-1-2.5"/><circle cx="5.7" cy="9.3" r=".6" fill="currentColor"/><circle cx="10.3" cy="9.3" r=".6" fill="currentColor"/>'],
  clock: ['0 0 16 16', '<circle cx="8" cy="8" r="6"/><path d="M8 4.5V8l2.5 1.5"/>'],
  bars: ['0 0 16 16', '<path d="M2.5 14V8M6.5 14V3M10.5 14V6M14 14V10"/>'],
  database: ['0 0 16 16', '<ellipse cx="8" cy="3.5" rx="5.5" ry="2"/><path d="M2.5 3.5v9c0 1.1 2.5 2 5.5 2s5.5-.9 5.5-2v-9M2.5 8c0 1.1 2.5 2 5.5 2s5.5-.9 5.5-2"/>'],
  search: ['0 0 16 16', '<circle cx="7" cy="7" r="5"/><path d="M11 11l3.5 3.5"/>'],
  sun: ['0 0 16 16', '<circle cx="8" cy="8" r="3"/><path d="M8 1v1.6M8 13.4V15M1 8h1.6M13.4 8H15M3 3l1.1 1.1M11.9 11.9L13 13M3 13l1.1-1.1M11.9 4.1L13 3"/>'],
  photo: ['0 0 16 16', '<rect x="1.5" y="3" width="13" height="10" rx="2"/><circle cx="5.5" cy="6.5" r="1.3"/><path d="M1.5 11.5l4-3.5 3 2.5 2-1.5 4 3"/>'],
  kpiPeople: ['0 0 18 18', '<circle cx="7" cy="6" r="2.6"/><path d="M2 15c.4-3 2.4-4.6 5-4.6s4.6 1.6 5 4.6"/><circle cx="13" cy="6.5" r="2"/><path d="M12.5 10.6c2 .2 3.2 1.8 3.5 4"/>'],
  kpiArea: ['0 0 18 18', '<path d="M2 4l4.5-1.5 5 2 4.5-1.5v11l-4.5 1.5-5-2L2 15z"/><path d="M6.5 2.5v11M11.5 4.5v11"/>'],
  kpiDensity: ['0 0 18 18', '<rect x="2.5" y="9" width="4" height="6.5"/><rect x="7" y="4" width="4" height="11.5"/><rect x="11.5" y="7" width="4" height="8.5"/>'],
  kpiElevation: ['0 0 18 18', '<path d="M1.5 15l5-8 3 4.5 2-3 5 6.5z"/>'],
  kpiClock: ['0 0 18 18', '<circle cx="9" cy="9" r="6.5"/><path d="M9 5v4l2.8 1.6"/>'],
};

/** Returns a decorative <svg> element (aria-hidden) for the named icon. */
export function icon(name, strokeWidth = 1.5) {
  const [viewBox, body] = ICONS[name];
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', viewBox);
  svg.setAttribute('fill', 'none');
  svg.setAttribute('stroke', 'currentColor');
  svg.setAttribute('stroke-width', String(strokeWidth));
  svg.setAttribute('aria-hidden', 'true');
  svg.innerHTML = body;
  return svg;
}
