// Entry point for every page. <body data-page="home|city"> picks what to render.
import { createT, loadDict, applyI18n } from './i18n.js';
import { parseCityPath, cityPath, titleFromSlug } from './route.js';
import { DEFAULT_SYSTEM, isSystem } from './units.js';
import { store } from './storage.js';
import { initThemeToggle } from './theme.js';
import { SECTIONS } from './sections.js';
import { el } from './dom.js';
import { loadCityData, loadIndex } from './city-data.js';
import { renderCityIndex } from './components/city-cards.js';
import { renderNav, renderTabs, watchSections } from './components/nav.js';
import { renderKpis, KPIS } from './components/kpis.js';
import { renderHighlights } from './components/highlights.js';
import { renderPanels } from './components/panels.js';
import { renderHeroPhoto, renderHighlightCards, heroPhotoMissing } from './components/photo.js';
import { fetchWeather, renderWeather } from './components/weather.js';
import { renderMap } from './components/map.js';
import { renderSources } from './components/sources.js';

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

async function renderCity(t, system) {
  const route = parseCityPath(location.pathname);
  if (!route) {
    $('cityContent').hidden = true;
    $('notFound').hidden = false;
    document.title = t('title.notFound');
    return;
  }
  const canonical = cityPath(route);
  if (location.pathname !== canonical) history.replaceState(null, '', canonical + location.search + location.hash);

  renderNav($('nav'), SECTIONS, t);
  renderTabs($('tabs'), SECTIONS, t);
  const bodies = renderPanels($('panels'), SECTIONS, t);
  watchSections(SECTIONS, [$('nav'), $('tabs')]);

  const { boundary, photos, state } = await loadCityData(route);

  // Name: official Census name when the city has data, otherwise the provisional name from the address.
  const name = boundary?.properties.basename ?? titleFromSlug(route.slug);
  document.title = t('title.city', { name });
  $('cityName').textContent = name;
  $('overview').setAttribute('aria-label', name);
  $('crumbs').replaceChildren(el('span', {}, state?.name ?? route.state.toUpperCase()));
  if (boundary) $('heroSub').textContent = t('hero.sub', { state: state?.name ?? route.state.toUpperCase() });
  // The Wikidata description ("city and county in California, United States") replaces the
  // shorter subtitle so the hero does not repeat itself.
  if (photos?.city.description) {
    $('heroLede').textContent = photos.city.description;
    $('heroLede').hidden = false;
    $('heroSub').hidden = true;
  }

  if (photos?.hero) renderHeroPhoto($('heroBg'), photos.hero, { name, t });
  else heroPhotoMissing($('heroBg'), t);

  if (photos?.highlights.length) renderHighlightCards($('highlights'), photos.highlights, t);
  else renderHighlights($('highlights'), 4, t);

  if (boundary) {
    renderMap(bodies.map, { boundary, places: photos?.highlights ?? [], name, t });
    renderSources(bodies.sources, { boundary, photos, hasWeather: true, t });
  }

  let weather;
  const drawWeather = (s) => weather !== undefined && renderWeather($('weather'), weather, { t, system: s });
  const drawKpis = (s) => renderKpis($('kpis'), KPIS, { t, system: s });
  redraw = (s) => {
    drawKpis(s);
    drawWeather(s);
  };
  drawKpis(system);

  if (boundary) {
    $('weather').replaceChildren(el('div', { class: 'label' }, t('weather.now')), el('div', { class: 'wx-na' }, t('weather.loading')));
    weather = await fetchWeather(boundary.properties.internalPoint);
    drawWeather(currentSystem);
  } else {
    $('weather').hidden = true;
    $('weather').nextElementSibling.hidden = true;
  }
}

let currentSystem = DEFAULT_SYSTEM;
let redraw = null;

async function main() {
  const t = createT(await loadDict('en'));
  applyI18n(document, t);
  initThemeToggle($('theme'));

  const saved = store.get(UNITS_KEY);
  currentSystem = isSystem(saved) ? saved : DEFAULT_SYSTEM;

  initUnitsToggle(currentSystem, (s) => {
    currentSystem = s;
    if (redraw) redraw(s);
  });
  if (document.body.dataset.page === 'city') await renderCity(t, currentSystem);
  if (document.body.dataset.page === 'home') renderCityIndex($('cityIndex'), await loadIndex(), t);

  const hash = location.hash.slice(1);
  if (hash && document.getElementById(hash)) document.getElementById(hash).scrollIntoView();
}

main().catch((err) => console.error(err));
