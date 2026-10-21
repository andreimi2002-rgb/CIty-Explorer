// Classic script loaded in <head>: applies the saved theme before the first paint (no flash).
(function () {
  try {
    var t = localStorage.getItem('ce-theme');
    if (t === 'dark' || t === 'light') document.documentElement.dataset.theme = t;
  } catch (e) {
    // Storage blocked: follow the system theme.
  }
})();
