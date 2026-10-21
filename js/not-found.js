// 404 page: Netlify's rewrite for /city/:state/:slug is case-sensitive, so "/City/CA/San-Francisco"
// lands here. If the lower-case address is a city page, go there; otherwise show "Page not found".
import { parseCityPath, cityPath } from './route.js';
import { createT, loadDict, applyI18n } from './i18n.js';

const route = parseCityPath(location.pathname);
if (route && cityPath(route) !== location.pathname) {
  location.replace(cityPath(route) + location.search + location.hash);
} else {
  const t = createT(await loadDict('en'));
  applyI18n(document, t);
  document.getElementById('nf').hidden = false;
}
