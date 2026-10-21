// localStorage for per-viewer preferences only (theme, units). It can be blocked; the page works without it.
export const store = {
  get(key) {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  set(key, value) {
    try {
      localStorage.setItem(key, value);
    } catch {
      // Private mode or blocked storage: the choice simply is not remembered.
    }
  },
};
