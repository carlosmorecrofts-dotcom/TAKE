// Scroll transitions: sections and cards slide and fade in as they arrive,
// story images glide in from their side and drift a little with the scroll,
// and a small scooter rides along the progress bar at the top of the page.
(function () {
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Everything below the hero takes part, without tagging every page by hand.
  var auto = document.querySelectorAll('main .section-head, main .card, main .cta, main .facts > div, main .story-copy > *, main .post-img, main .list li');
  for (var i = 0; i < auto.length; i++) {
    var el = auto[i];
    if (el.closest('.hero')) continue;
    if (!el.classList.contains('reveal-l') && !el.classList.contains('reveal-r')) el.classList.add('reveal');
    // siblings arrive one after another
    var idx = Array.prototype.indexOf.call(el.parentNode.children, el);
    el.style.transitionDelay = Math.min(idx, 6) * 70 + 'ms';
  }
  var els = document.querySelectorAll('.reveal, .reveal-l, .reveal-r');
  if (reduce || !('IntersectionObserver' in window)) {
    for (var j = 0; j < els.length; j++) els[j].classList.add('in');
  } else {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
    for (var k = 0; k < els.length; k++) io.observe(els[k]);
  }

  // progress bar with a plane at its tip
  var bar = document.createElement('div');
  bar.className = 'scroll-progress';
  bar.setAttribute('aria-hidden', 'true');
  bar.innerHTML = '<span class="sp-fill"></span><span class="sp-plane"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="5" cy="17" r="3"/><circle cx="19" cy="17" r="3"/><path d="M8 17h6l3-7h-3M17 10l-2-5h-3M5 14l3-4h5"/></svg></span>';
  document.body.appendChild(bar);
  var fill = bar.firstChild, plane = bar.lastChild;
  var drift = document.querySelectorAll('[data-speed]');

  function onScroll() {
    var max = document.documentElement.scrollHeight - window.innerHeight;
    var p = max > 0 ? Math.min(1, (window.scrollY || 0) / max) : 0;
    fill.style.transform = 'scaleX(' + p + ')';
    plane.style.left = 'calc(' + (p * 100) + '% - 14px)';
    if (reduce) return;
    for (var i = 0; i < drift.length; i++) {
      var r = drift[i].getBoundingClientRect();
      var mid = r.top + r.height / 2 - window.innerHeight / 2;
      drift[i].style.setProperty('--drift', (-mid * +drift[i].getAttribute('data-speed')).toFixed(1) + 'px');
    }
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
  onScroll();
})();
