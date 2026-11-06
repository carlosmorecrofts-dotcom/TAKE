// Scroll transitions: blocks rise into place once as they arrive, pictures
// slide in from alternating sides, and the THEME marker (a scooter) rides
// along a progress bar across the top as you scroll. Needs space.js loaded first for THEME.
(function () {
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var side = 0;
  document.querySelectorAll('main img, main iframe, main .photo').forEach(function (el) {
    if (el.closest('.hero')) return;
    el.classList.add(side++ % 2 ? 'reveal-r' : 'reveal-l');
  });
  document.querySelectorAll('main .section-head, main .card, main .facts > div, main .list li, main .ticks li, main .cats').forEach(function (el) {
    if (el.closest('.hero') || el.classList.contains('reveal-l') || el.classList.contains('reveal-r')) return;
    el.classList.add('reveal');
    var idx = Array.prototype.indexOf.call(el.parentNode.children, el);
    el.style.transitionDelay = Math.min(idx, 6) * 70 + 'ms';
  });
  // Each block is shown once, when its top comes into the lower part of the screen.
  // A plain position check on scroll: works in every browser and webview.
  var pending = Array.prototype.slice.call(document.querySelectorAll('.reveal, .reveal-l, .reveal-r'));
  var queued = false;
  function check() {
    queued = false;
    var line = innerHeight * .94;
    pending = pending.filter(function (el) {
      if (!el.isConnected) return false;
      var r = el.getBoundingClientRect();
      if (r.top < line && r.bottom > 0 || r.bottom <= 0) { el.classList.add('in'); return false; }
      return true;
    });
  }
  function soon() { if (!queued) { queued = true; requestAnimationFrame(check); } }
  if (reduce) { pending.forEach(function (el) { el.classList.add('in'); }); pending = []; }
  else {
    addEventListener('scroll', soon, { passive: true }); addEventListener('resize', soon); addEventListener('load', soon);
    check(); setTimeout(check, 300);
    // menu cards and scooters are drawn later by main.js: they join in too
    new MutationObserver(function (ms) {
      ms.forEach(function (m) { m.addedNodes.forEach(function (n) {
        if (n.nodeType !== 1 || !n.classList.contains('card') || n.closest('#statusCard')) return;
        // a grid redrawn after a tap (+ on a dish) must not fade in again
        if (!n.parentNode) return; // already replaced by a redraw
        if (n.parentNode.dataset.shown) { n.classList.add('reveal', 'in'); return; }
        n.classList.add('reveal'); pending.push(n);
        setTimeout(function (p) { p.dataset.shown = '1'; }, 1500, n.parentNode);
      }); });
      soon();
    }).observe(document.querySelector('main'), { childList: true, subtree: true });
  }

  // progress rail down the right edge with the THEME marker on it
  var mk = (window.THEME && THEME.paths[document.body.classList.contains('page-ride') ? THEME.marker : (THEME.markerEat || THEME.marker)]) || 'M12 4v16';
  var rail = document.createElement('div');
  rail.className = 'scroll-rail'; rail.setAttribute('aria-hidden', 'true');
  rail.innerHTML = '<span class="sr-fill"></span><span class="sr-mark"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="' + mk + '"/></svg></span>';
  document.body.appendChild(rail);
  var fill = rail.firstChild, mark = rail.lastChild;
  function onScroll() {
    var max = document.documentElement.scrollHeight - innerHeight;
    var p = max > 0 ? Math.min(1, scrollY / max) : 0;
    fill.style.transform = 'scaleX(' + p + ')';
    mark.style.left = 'calc(' + (p * 100) + '% - ' + (p * 24) + 'px)';
  }
  addEventListener('scroll', onScroll, { passive: true }); addEventListener('resize', onScroll); onScroll();
})();
