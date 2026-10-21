// Entry point for every page. <body data-page="home|city"> picks what to render.
import { createT, loadDict, applyI18n } from './i18n.js';
import { parseCityPath, cityPath, titleFromSlug } from './route.js';
import { DEFAULT_SYSTEM, isSystem } from './units.js';
import { store } from './storage.js';
import { initThemeToggle } from './theme.js';
import { SECTIONS } from './sections.js';
import { el } from './dom.js';
import { icon } from './icons.js';
import { renderNav, renderTabs, watchSections } from './components/nav.js';
import { renderKpis, KPIS } from './components/kpis.js';
import { renderHighlights } from './components/highlights.js';
import { renderPanels } from './components/panels.js';

const UNITS_KEY = 'ce-units';
const $ = (id) => document.getElementById(id);

function initUnitsToggle(initial, onChange) {
  let system = initial;
  const buttons = [...document.querySelectorAll('[data-units]')];
  const paint = () => buttons.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.units === system)));
  paint();
  for (const b of buttons) {
    b.addEventListener('click', () => {
      if (b.dataset.units === system) return;
      system = b.dataset.units;
      store.set(UNITS_KEY, system);
      paint();
      onChange(system);
    });
  }
}

function renderCity(t, system) {
  const route = parseCityPath(location.pathname);
  if (!route) {
    $('cityContent').hidden = true;
    $('notFound').hidden = false;
    document.title = t('title.notFound');
    return null;
  }
  const canonical = cityPath(route);
  if (location.pathname !== canonical) history.replaceState(null, '', canonical + location.search + location.hash);

  const name = titleFromSlug(route.slug);
  document.title = t('title.city', { name });
  $('cityName').textContent = name;
  $('overview').setAttribute('aria-label', name);
  $('crumbs').replaceChildren(el('span', {}, route.state.toUpperCase()));
  $('heroNote').prepend(icon('photo'));

  renderNav($('nav'), SECTIONS, t);
  renderTabs($('tabs'), SECTIONS, t);
  renderHighlights($('highlights'), 4, t);
  renderPanels($('panels'), SECTIONS, t);
  watchSections(SECTIONS, [$('nav'), $('tabs')]);

  const drawKpis = (s) => renderKpis($('kpis'), KPIS, { t, system: s });
  drawKpis(system);
  return drawKpis;
}

async function main() {
  const t = createT(await loadDict('en'));
  applyI18n(document, t);
  initThemeToggle($('theme'));

  const saved = store.get(UNITS_KEY);
  const system = isSystem(saved) ? saved : DEFAULT_SYSTEM;

  let redraw = null;
  if (document.body.dataset.page === 'city') redraw = renderCity(t, system);
  initUnitsToggle(system, (s) => redraw && redraw(s));

  const hash = location.hash.slice(1);
  if (hash && document.getElementById(hash)) document.getElementById(hash).scrollIntoView();
}

main().catch((err) => console.error(err));
