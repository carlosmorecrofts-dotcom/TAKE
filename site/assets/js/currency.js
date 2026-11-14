// Prices in the visitor's currency. TAKE charges in rupiah: every other currency
// is an approximate conversion, marked with ≈, and the menu says so.
// The currency follows the language (and the browser's country for English)
// until the visitor picks one in the menu next to the languages.
// Works on the page's text: any "Rp 45.000", "Rp 45K" or "45K" is converted, and
// the rupiah original is kept on the text node so switching back is exact.
(function () {
  var T = window.TAKE || {};
  var LIST = ['IDR', 'USD', 'EUR', 'GBP', 'AUD', 'NZD', 'SGD', 'CAD', 'RUB', 'CNY', 'KRW', 'JPY'];
  var SYM = { IDR: 'Rp', USD: '$', EUR: '€', GBP: '£', AUD: 'A$', NZD: 'NZ$', SGD: 'S$', CAD: 'C$', RUB: '₽', CNY: '¥', KRW: '₩', JPY: '¥' };
  var WHOLE = { IDR: 1, KRW: 1, JPY: 1, RUB: 1 }; // shown without cents
  var BY_LANG = { id: 'IDR', ru: 'RUB', zh: 'CNY', ko: 'KRW', ja: 'JPY', de: 'EUR', fr: 'EUR', es: 'EUR', it: 'EUR', pt: 'EUR' };
  var BY_REGION = { GB: 'GBP', AU: 'AUD', NZ: 'NZD', SG: 'SGD', CA: 'CAD', US: 'USD', IE: 'EUR', ID: 'IDR' };
  var NOTE = {
    en: 'Approximate. You pay in rupiah.', id: 'Perkiraan. Pembayaran dalam rupiah.', ru: 'Примерно. Оплата в рупиях.',
    zh: '仅供参考，以印尼盾付款。', ko: '대략적인 금액입니다. 결제는 루피아로 합니다.', ja: '概算です。お支払いはルピアです。',
    de: 'Ungefähr. Bezahlt wird in Rupiah.', fr: 'Approximatif. Paiement en roupies.', es: 'Aproximado. Se paga en rupias.',
    pt: 'Aproximado. O pagamento é em rupias.', it: 'Indicativo. Si paga in rupie.'
  };
  var store = {
    get: function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set: function (k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  };
  var lang = function () { return (document.documentElement.lang || 'en').slice(0, 2).toLowerCase(); };
  // rates: IDR -> currency. Baked in at build, refreshed from the web twice a day
  var rates = (T.rates && T.rates.r) || {};
  try { var c = JSON.parse(store.get('take_rates') || 'null'); if (c && c.r && c.t > (T.rates && T.rates.t || 0)) rates = c.r; } catch (e) {}

  function auto() {
    var l = lang();
    if (BY_LANG[l]) return BY_LANG[l];
    var langs = navigator.languages || [navigator.language || ''];
    for (var i = 0; i < langs.length; i++) { var m = /-([A-Z]{2})$/i.exec(langs[i] || ''); if (m && BY_REGION[m[1].toUpperCase()]) return BY_REGION[m[1].toUpperCase()]; }
    return 'USD';
  }
  function current() { var c = store.get('take_cur'); return c && LIST.indexOf(c) >= 0 ? c : auto(); }
  var cur = current();

  // ---------------- converting text
  var RX = /(Rp\s?)?(\d{1,3}(?:\.\d{3})+|\d+(?:[.,]\d+)?)(K\b)?/g;
  function fmt(idr) {
    var v = idr * (rates[cur] || 0);
    var whole = WHOLE[cur] || v >= 100;
    var n;
    try { n = new Intl.NumberFormat(lang(), { minimumFractionDigits: whole ? 0 : 2, maximumFractionDigits: whole ? 0 : 2 }).format(v); } catch (e) { n = whole ? Math.round(v) : v.toFixed(2); }
    return '≈ ' + SYM[cur] + n;
  }
  function convert(s) {
    if (cur === 'IDR' || !rates[cur]) return s;
    return s.replace(RX, function (all, rp, num, k) {
      if (!rp && !k) return all; // a plain number is not a price
      var n = rp && !k ? +num.replace(/\./g, '') : parseFloat(num.replace(',', '.')) * (k ? 1000 : 1);
      if (!isFinite(n) || n <= 0) return all;
      return fmt(n);
    });
  }
  var SKIP = { SCRIPT: 1, STYLE: 1, TEXTAREA: 1, INPUT: 1, OPTION: 1, NOSCRIPT: 1 };
  function skip(node) { var p = node.parentNode; return !p || SKIP[p.nodeName] || (p.closest && p.closest('.cur, .cur-menu, [data-cur-skip]')); }
  function paintNode(node) {
    if (skip(node)) return;
    // text written by someone else since our last write is the new rupiah original
    if (node.__curOut === undefined || node.data !== node.__curOut) {
      RX.lastIndex = 0;
      if (!/Rp\s?\d|\d+(?:[.,]\d+)?K\b/.test(node.data)) { node.__curOrig = undefined; return; }
      node.__curOrig = node.data;
    }
    var out = convert(node.__curOrig);
    node.__curOut = out;
    if (node.data !== out) node.data = out;
  }
  function paint(root) {
    if (!root) return;
    if (root.nodeType === 3) return paintNode(root);
    var w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT), n;
    while ((n = w.nextNode())) paintNode(n);
  }
  new MutationObserver(function (ms) {
    ms.forEach(function (m) {
      if (m.type === 'characterData') paintNode(m.target);
      else m.addedNodes.forEach(paint);
    });
  }).observe(document.documentElement, { childList: true, characterData: true, subtree: true });

  // ---------------- the picker, beside the languages
  var wrap, btn, menu;
  function label(c) { return SYM[c]; }
  function nameOf(c) { try { return new Intl.DisplayNames([lang()], { type: 'currency' }).of(c); } catch (e) { return c; } }
  function build() {
    if (wrap || !document.body) return;
    var slot = document.querySelector('[data-lang-slot]');
    wrap = document.createElement('div');
    wrap.className = 'cur notranslate'; wrap.setAttribute('translate', 'no'); wrap.setAttribute('data-i18n-skip', '');
    wrap.innerHTML = '<button type="button" class="cur-btn" aria-haspopup="listbox" aria-expanded="false"></button>';
    btn = wrap.firstChild;
    menu = document.createElement('div');
    menu.className = 'cur-menu notranslate'; menu.setAttribute('translate', 'no'); menu.setAttribute('data-i18n-skip', ''); menu.setAttribute('role', 'listbox'); menu.hidden = true;
    document.body.appendChild(menu);
    if (slot && slot.parentNode) slot.parentNode.insertBefore(wrap, slot); else return;
    btn.onclick = function (e) { e.stopPropagation(); menu.hidden ? open() : close(); };
    document.addEventListener('click', function (e) { if (!menu.hidden && !menu.contains(e.target)) close(); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') close(); });
    addEventListener('resize', close); addEventListener('scroll', close, { passive: true });
    show();
  }
  function show() {
    if (!btn) return;
    btn.textContent = label(cur);
    btn.title = nameOf(cur);
    btn.setAttribute('aria-label', nameOf(cur));
  }
  function open() {
    menu.innerHTML = LIST.map(function (c) {
      return '<button type="button" role="option" class="cur-item" data-c="' + c + '" aria-selected="' + (c === cur) + '"><b>' + label(c) + '</b><span>' + c + '</span><small>' + nameOf(c) + '</small></button>';
    }).join('') + '<p class="cur-note">' + (NOTE[lang()] || NOTE.en) + '</p>';
    menu.querySelectorAll('[data-c]').forEach(function (b) { b.onclick = function () { set(b.dataset.c, true); close(); }; });
    menu.hidden = false; btn.setAttribute('aria-expanded', 'true');
    var r = btn.getBoundingClientRect(), w = Math.min(260, innerWidth - 16);
    menu.style.width = w + 'px';
    menu.style.left = Math.max(8, Math.min(r.right - w, innerWidth - w - 8)) + 'px';
    menu.style.top = Math.round(r.bottom + 8) + 'px';
    menu.style.maxHeight = Math.max(200, innerHeight - r.bottom - 24) + 'px';
  }
  function close() { if (menu && !menu.hidden) { menu.hidden = true; btn.setAttribute('aria-expanded', 'false'); } }
  function set(c, chosen) {
    if (chosen) store.set('take_cur', c);
    cur = c; show(); paint(document.body);
    document.dispatchEvent(new CustomEvent('take:currency', { detail: c }));
  }
  // the language changed: follow it, unless the visitor chose a currency
  new MutationObserver(function () { var c = current(); if (c !== cur) set(c, false); else show(); })
    .observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] });

  // fresh rates twice a day (the baked-in ones are from the last build)
  var cached = null; try { cached = JSON.parse(store.get('take_rates') || 'null'); } catch (e) {}
  if (!cached || Date.now() - cached.t > 12 * 3600e3) {
    fetch('https://open.er-api.com/v6/latest/IDR').then(function (r) { return r.json(); }).then(function (j) {
      if (!j || j.result !== 'success' || !j.rates) return;
      var r = {}; LIST.forEach(function (c) { if (j.rates[c]) r[c] = j.rates[c]; });
      store.set('take_rates', JSON.stringify({ t: Date.now(), r: r }));
      rates = r; paint(document.body);
    }).catch(function () {});
  }

  window.TAKE_CURRENCY = { current: function () { return cur; }, set: function (c) { set(c, true); }, list: LIST, fmt: fmt };
  function start() { build(); paint(document.body); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
