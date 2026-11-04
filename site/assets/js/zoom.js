// Any photo on the page opens full size on a tap. Tap, X or Escape closes;
// arrows (or a swipe) move through the photos of the same section.
(function () {
  var SKIP = '.hero-logo, .chat-buddy img, .chat-panel img, header img, .brand img';
  var box = document.createElement('div');
  box.className = 'zoom'; box.hidden = true;
  box.innerHTML = '<button class="zoom-x" aria-label="Close">&times;</button><button class="zoom-p" aria-label="Previous">&#8249;</button><figure><img alt=""><figcaption></figcaption></figure><button class="zoom-n" aria-label="Next">&#8250;</button>';
  document.body.appendChild(box);
  var img = box.querySelector('img'), cap = box.querySelector('figcaption'), set = [], at = 0;
  function zoomable(el) { return el && el.tagName === 'IMG' && !el.closest(SKIP) && !el.closest('.zoom'); }
  function show(i) {
    at = (i + set.length) % set.length;
    var s = set[at], f = s.closest('figure'), c = f && f.querySelector('figcaption');
    img.src = s.currentSrc || s.src; img.alt = s.alt;
    cap.textContent = c ? c.textContent : s.alt;
    box.querySelector('.zoom-p').hidden = box.querySelector('.zoom-n').hidden = set.length < 2;
  }
  function open(el) {
    var sec = el.closest('section') || document.body;
    set = [].filter.call(sec.querySelectorAll('img'), function (x) { return zoomable(x) && x.offsetParent; });
    if (set.indexOf(el) < 0) set = [el];
    show(set.indexOf(el)); box.hidden = false; document.body.style.overflow = 'hidden';
  }
  function close() { box.hidden = true; img.src = ''; document.body.style.overflow = ''; }
  document.addEventListener('click', function (e) {
    var t = e.target;
    if (box.contains(t)) {
      if (t.closest('.zoom-p')) show(at - 1); else if (t.closest('.zoom-n')) show(at + 1); else close();
      return;
    }
    if (zoomable(t) && !t.closest('a, button')) { e.preventDefault(); open(t); }
  });
  document.addEventListener('keydown', function (e) {
    if (box.hidden) return;
    if (e.key === 'Escape') close(); else if (e.key === 'ArrowLeft') show(at - 1); else if (e.key === 'ArrowRight') show(at + 1);
  });
  var x0 = null;
  box.addEventListener('touchstart', function (e) { x0 = e.touches[0].clientX; }, { passive: true });
  box.addEventListener('touchend', function (e) {
    if (x0 === null) return; var d = e.changedTouches[0].clientX - x0; x0 = null;
    if (Math.abs(d) > 50) { show(at + (d < 0 ? 1 : -1)); }
  });
})();
