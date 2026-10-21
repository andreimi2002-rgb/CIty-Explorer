import { el } from '../dom.js';
import { icon } from '../icons.js';

/** Sidebar links, one per section, with icons. */
export function renderNav(container, sections, t) {
  container.replaceChildren(
    ...sections.map((s) => el('a', { href: `#${s.id}`, 'data-section': s.id }, icon(s.icon), el('span', {}, t(s.nav)))),
  );
}

/** Sticky tab bar, one short label per section. */
export function renderTabs(container, sections, t) {
  container.replaceChildren(...sections.map((s) => el('a', { href: `#${s.id}`, 'data-section': s.id }, t(s.tab))));
}

/** Highlights the section currently in view in every given container (sidebar and tabs). */
export function watchSections(sections, containers) {
  const links = containers.flatMap((c) => [...c.querySelectorAll('a[data-section]')]);
  const mark = (id) => {
    for (const a of links) {
      const on = a.dataset.section === id;
      a.classList.toggle('on', on);
      if (on) a.setAttribute('aria-current', 'location');
      else a.removeAttribute('aria-current');
    }
  };
  mark(sections[0].id);
  if (!('IntersectionObserver' in window)) return;
  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) if (e.isIntersecting) mark(e.target.id);
    },
    { rootMargin: '-45% 0px -50% 0px' },
  );
  for (const s of sections) {
    const node = document.getElementById(s.id);
    if (node) io.observe(node);
  }
}
