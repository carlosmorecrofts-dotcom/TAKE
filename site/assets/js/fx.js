// Scroll transitions: blocks rise into place once as they arrive, pictures
// slide in from alternating sides, and the THEME marker (a scooter) rides
// along a progress bar across the top as you scroll. Needs space.js loaded first for THEME.
// Menus (dishes, scooters, trips) are 3D: each card flips up into place when its
// menu is drawn or filtered, tilts toward the pointer, and a light follows it.
(function () {
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var fine = window.matchMedia && matchMedia('(hover: hover) and (pointer: fine)').matches;
  var M3D = '#menuGrid .dish, #fleetGrid .bike, #transport .list li';
  function mark3d(root) {
    if (root.matches && root.matches(M3D)) root.classList.add('m3d');
    if (root.querySelectorAll) root.querySelectorAll(M3D).forEach(function (el) { el.classList.add('m3d'); });
  }
  mark3d(document);

  var side = 0;
  document.querySelectorAll('main img, main iframe, main .photo').forEach(function (el) {
    // pictures inside a 3D card arrive with their card
    if (el.closest('.hero') || el.closest('.m3d')) return;
    el.classList.add(side++ % 2 ? 'reveal-r' : 'reveal-l');
  });
  document.querySelectorAll('main .section-head, main .card, main .facts > div, main .list li, main .ticks li, main .cats, main .menu-sep').forEach(function (el) {
    if (el.closest('.hero') || el.classList.contains('reveal-l') || el.classList.contains('reveal-r')) return;
    el.classList.add('reveal');
    var idx = Array.prototype.indexOf.call(el.parentNode.children, el);
    el.style.transitionDelay = Math.min(idx, 6) * 70 + 'ms';
  });
  // a 3D card arrives with a keyframe flip, staggered by the delay it was given
  function pop(el) {
    el.style.animationDelay = el.style.transitionDelay || '0ms';
    el.style.transitionDelay = '0s'; // or every hover would lag by the stagger
    el.classList.add('m3d-pop');
  }
  document.addEventListener('animationend', function (e) {
    if (e.animationName !== 'm3dIn') return;
    e.target.classList.remove('m3d-pop'); e.target.style.animationDelay = '';
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
      if (r.top < line && r.bottom > 0 || r.bottom <= 0) { if (el.classList.contains('m3d') && r.bottom > 0) pop(el); el.classList.add('in'); return false; }
      return true;
    });
  }
  function soon() { if (!queued) { queued = true; requestAnimationFrame(check); } }
  if (reduce) { pending.forEach(function (el) { el.classList.add('in'); }); pending = []; }
  else {
    addEventListener('scroll', soon, { passive: true }); addEventListener('resize', soon); addEventListener('load', soon);
    check(); setTimeout(check, 300);
    // grids main.js drew before this script ran count as shown already
    document.querySelectorAll('#menuGrid, #fleetGrid').forEach(function (g) { if (g.children.length) g.dataset.shown = '1'; });
    var item = function (n) { return n.nodeType === 1 && (n.classList.contains('card') || n.classList.contains('menu-sep')); };
    // menu cards and scooters are drawn later by main.js: they join in too
    new MutationObserver(function (ms) {
      ms.forEach(function (m) {
        // what the redraw replaced, in order: a card that had arrived stays arrived
        var was = Array.prototype.filter.call(m.removedNodes, item).map(function (n) { return n.classList.contains('in'); }), j = 0;
        m.addedNodes.forEach(function (n) {
          if (!item(n) || n.closest('#statusCard')) return;
          var before = was[j++];
          if (!n.parentNode) return; // already replaced by a redraw
          mark3d(n);
          var p = n.parentNode;
          // a grid redrawn after a tap (+ on a dish) must not animate again (cards still
          // waiting below the screen keep waiting); a grid redrawn for a new filter
          // (main.js sets data-fresh) flips in
          if (p.dataset.shown && !p.dataset.fresh && before !== false) { n.classList.add('reveal', 'in'); return; }
          n.classList.add('reveal');
          n.style.transitionDelay = Math.min(Array.prototype.indexOf.call(p.children, n), 10) * 45 + 'ms';
          pending.push(n);
          if (!p.dataset.shown) setTimeout(function (g) { g.dataset.shown = '1'; }, 1500, p);
        });
      });
      soon(); retarget();
    }).observe(document.querySelector('main'), { childList: true, subtree: true });
  }

  // ---------------- 3D tilt toward the pointer, with a light and a lit edge that follow it
  var cur = null, last = null, raf = 0;
  function setVars(el, e) {
    var r = el.getBoundingClientRect(); if (!r.width) return;
    var px = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)), py = Math.max(0, Math.min(1, (e.clientY - r.top) / r.height));
    var max = el.tagName === 'LI' ? 3 : 10; // wide rows lean less than cards
    el.style.setProperty('--rx', ((.5 - py) * max).toFixed(2) + 'deg');
    el.style.setProperty('--ry', ((px - .5) * max).toFixed(2) + 'deg');
    el.style.setProperty('--px', (px - .5).toFixed(3));
    el.style.setProperty('--py', (py - .5).toFixed(3));
    el.style.setProperty('--mx', (px * 100).toFixed(1) + '%');
    el.style.setProperty('--my', (py * 100).toFixed(1) + '%');
  }
  function release(el) {
    el.classList.remove('tilt');
    ['--rx', '--ry', '--px', '--py'].forEach(function (v) { el.style.removeProperty(v); });
  }
  function hold(el, instant) {
    if (cur && cur !== el) release(cur);
    cur = el; if (!el) return;
    el.style.transitionDelay = '0s';
    if (instant) { el.classList.add('tilt-now'); requestAnimationFrame(function () { requestAnimationFrame(function () { el.classList.remove('tilt-now'); }); }); }
    el.classList.add('tilt');
    if (last) setVars(el, last);
  }
  // a card redrawn under a still pointer (+ on a dish) keeps its tilt, without a jump
  function retarget() {
    if (!fine || reduce || !last) return;
    var under = document.elementFromPoint(last.clientX, last.clientY);
    var el = under && under.closest && under.closest('.m3d');
    if (el && el !== cur && el.classList.contains('in')) hold(el, true);
  }
  if (fine && !reduce) {
    document.addEventListener('pointermove', function (e) {
      last = { clientX: e.clientX, clientY: e.clientY };
      var el = e.target.closest && e.target.closest('.m3d');
      if (el && !el.classList.contains('in')) el = null; // not arrived yet
      if (el !== cur) hold(el, false);
      if (cur && !raf) raf = requestAnimationFrame(function () { raf = 0; if (cur && last) setVars(cur, last); });
    }, { passive: true });
    document.documentElement.addEventListener('mouseleave', function () { if (cur) release(cur); cur = null; last = null; });
    addEventListener('scroll', function () { if (cur && last) { var el = document.elementFromPoint(last.clientX, last.clientY); if (!el || !el.closest('.m3d')) { release(cur); cur = null; } } }, { passive: true });
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
