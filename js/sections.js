// The sections of a city page, in order. Drives the sidebar, the tab bar and the panels.
// Every text is an i18n key.
export const SECTIONS = [
  { id: 'overview', nav: 'nav.overview', tab: 'tab.overview', icon: 'grid' },
  { id: 'map', nav: 'nav.map', tab: 'tab.map', icon: 'map', title: 'section.map.title', desc: 'section.map.desc', pending: 'section.map.pending' },
  { id: 'people', nav: 'nav.people', tab: 'tab.people', icon: 'people', title: 'section.people.title', desc: 'section.people.desc', pending: 'section.people.pending' },
  { id: 'climate', nav: 'nav.climate', tab: 'tab.climate', icon: 'cloud', title: 'section.climate.title', desc: 'section.climate.desc', pending: 'section.climate.pending' },
  { id: 'transport', nav: 'nav.transport', tab: 'tab.transport', icon: 'train', title: 'section.transport.title', desc: 'section.transport.desc', pending: 'section.transport.pending' },
  { id: 'history', nav: 'nav.history', tab: 'tab.history', icon: 'clock', title: 'section.history.title', desc: 'section.history.desc', pending: 'section.history.pending' },
  { id: 'compare', nav: 'nav.compare', tab: 'tab.compare', icon: 'bars', title: 'section.compare.title', desc: 'section.compare.desc', pending: 'section.compare.pending' },
  { id: 'sources', nav: 'nav.sources', tab: 'tab.sources', icon: 'database', title: 'section.sources.title', desc: 'section.sources.desc', pending: 'section.sources.pending' },
];
