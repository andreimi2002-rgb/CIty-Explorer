import { store } from './storage.js';

/** Light/dark toggle. Starts from the system theme; an explicit choice is remembered. */
export function initThemeToggle(button) {
  button.addEventListener('click', () => {
    const root = document.documentElement;
    const dark = root.dataset.theme
      ? root.dataset.theme === 'dark'
      : matchMedia('(prefers-color-scheme: dark)').matches;
    root.dataset.theme = dark ? 'light' : 'dark';
    store.set('ce-theme', root.dataset.theme);
  });
}
