// Light / dark switch. The choice is kept in this browser only.
(function () {
  var b = document.getElementById('themeBtn'); if (!b) return;
  function set(t) { document.documentElement.dataset.theme = t; b.setAttribute('aria-pressed', t === 'light'); try { localStorage.setItem('take_theme', t); } catch (e) {} }
  b.addEventListener('click', function () { set(document.documentElement.dataset.theme === 'light' ? 'dark' : 'light'); });
  b.setAttribute('aria-pressed', document.documentElement.dataset.theme === 'light');
})();
