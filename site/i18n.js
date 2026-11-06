/* Language picker and translator for the MSI Global Education site.
   Copied from the djinja-c.com language pack (website/i18n.js) on 2026-10-30.
   Words live in i18n/<code>.json, built by i18n-tools/build.mjs. English needs no file. */
(function(){
  'use strict';

  var BUILD = '390ce5825f';

  // Ordered most-used first. No flag emoji: Windows draws them as two letters,
  // and a flag is a country, not a language.
  var LANGUAGES = [
    { code: 'en', label: 'English', country: 'United Kingdom & USA',    native: 'English',    rtl: false },
    { code: 'es', label: 'Spanish', country: 'Spain',    native: 'Español',    rtl: false },
    { code: 'pt', label: 'Portuguese', country: 'Portugal & Brazil', native: 'Português',  rtl: false },
    { code: 'fr', label: 'French', country: 'France',     native: 'Français',   rtl: false },
    { code: 'de', label: 'German', country: 'Germany',     native: 'Deutsch',    rtl: false },
    { code: 'it', label: 'Italian', country: 'Italy',    native: 'Italiano',   rtl: false },
    { code: 'nl', label: 'Dutch', country: 'Netherlands',      native: 'Nederlands', rtl: false },
    { code: 'pl', label: 'Polish', country: 'Poland',     native: 'Polski',     rtl: false },
    { code: 'sv', label: 'Swedish', country: 'Sweden',    native: 'Svenska',    rtl: false },
    { code: 'da', label: 'Danish', country: 'Denmark',     native: 'Dansk',      rtl: false },
    { code: 'no', label: 'Norwegian', country: 'Norway',  native: 'Norsk',      rtl: false },
    { code: 'fi', label: 'Finnish', country: 'Finland',    native: 'Suomi',      rtl: false },
    { code: 'cs', label: 'Czech', country: 'Czech Republic',      native: 'Čeština',    rtl: false },
    { code: 'ro', label: 'Romanian', country: 'Romania',   native: 'Română',     rtl: false },
    { code: 'el', label: 'Greek', country: 'Greece',      native: 'Ελληνικά',   rtl: false },
    { code: 'tr', label: 'Turkish', country: 'Turkey',    native: 'Türkçe',     rtl: false },
    { code: 'ru', label: 'Russian', country: 'Russia',    native: 'Русский',    rtl: false },
    { code: 'uk', label: 'Ukrainian', country: 'Ukraine',  native: 'Українська', rtl: false },
    { code: 'ar', label: 'Arabic', country: 'Arab countries',     native: 'العربية',    rtl: true  },
    { code: 'he', label: 'Hebrew', country: 'Israel',     native: 'עברית',      rtl: true  },
    { code: 'hi', label: 'Hindi', country: 'India',      native: 'हिन्दी',       rtl: false },
    { code: 'ja', label: 'Japanese', country: 'Japan',   native: '日本語',      rtl: false },
    { code: 'ko', label: 'Korean', country: 'South Korea',     native: '한국어',       rtl: false },
    { code: 'zh', label: 'Chinese', country: 'China',    native: '中文',         rtl: false },
    { code: 'id', label: 'Indonesian', country: 'Indonesia', native: 'Bahasa Indonesia', rtl: false },
    { code: 'ms', label: 'Malay', country: 'Malaysia',      native: 'Bahasa Melayu', rtl: false }
  ];

  // <<< I18N-CORE:BEGIN
  // Pure functions - no DOM. Run as they are by scripts/test-website-i18n.mjs
  // and by the build, so the page, the build and the test cannot disagree
  // about what a unit's id is or whether a translation is well formed.
  function norm(s){ return String(s == null ? '' : s).replace(/\s+/g, ' ').trim(); }
  function hasLetters(s){ return /[A-Za-zÀ-ɏ]{2}/.test(String(s == null ? '' : s)); }
  function hashId(s){
    var h = 0x811c9dc5;
    for(var i = 0; i < s.length; i++){ h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); }
    return '~' + (h >>> 0).toString(36);
  }
  // Only a literal "<3>" in the text could be mistaken for a placeholder.
  function esc(s){ return String(s).replace(/<(?=\/?\d+\/?>)/g, '&lt;'); }
  function unesc(s){ return String(s).replace(/&lt;/g, '<'); }
  // "a <1>b</1><2/>" -> [{t:'text',v:'a '},{t:'open',n:1},{t:'text',v:'b'},{t:'close',n:1},{t:'void',n:2}]
  function tokens(str){
    var out = [], re = /<(\/?)(\d+)(\/?)>/g, last = 0, m;
    str = String(str == null ? '' : str);
    while((m = re.exec(str))){
      if(m.index > last) out.push({ t: 'text', v: str.slice(last, m.index) });
      last = re.lastIndex;
      if(m[1] && m[3]) return null;
      out.push({ t: m[3] ? 'void' : (m[1] ? 'close' : 'open'), n: +m[2] });
    }
    if(last < str.length) out.push({ t: 'text', v: str.slice(last) });
    return out;
  }
  // { n: {form:'pair'|'void', parent:n|0} } or null when the string is malformed
  function shape(str){
    var tk = tokens(str), map = {}, stack = [0];
    if(!tk) return null;
    for(var i = 0; i < tk.length; i++){
      var k = tk[i];
      if(k.t === 'text') continue;
      if(k.t === 'close'){
        if(stack.length < 2 || stack[stack.length - 1] !== k.n) return null;
        stack.pop();
        continue;
      }
      if(map[k.n]) return null;                       // used twice
      map[k.n] = { form: k.t === 'void' ? 'void' : 'pair', parent: stack[stack.length - 1] };
      if(k.t === 'open') stack.push(k.n);
    }
    return stack.length === 1 ? map : null;
  }
  // '' when `tr` can stand in for `key`; otherwise the reason it cannot.
  // Placeholders may change ORDER (languages do) but not number, kind or parent.
  function validate(key, tr){
    if(typeof tr !== 'string' || !norm(tr)) return 'empty';
    var a = shape(key), b = shape(tr);
    if(!a) return 'the English is malformed';
    if(!b) return 'placeholders do not nest';
    var ka = Object.keys(a), kb = Object.keys(b);
    if(ka.length !== kb.length) return 'has ' + kb.length + ' placeholders, the English has ' + ka.length;
    for(var i = 0; i < ka.length; i++){
      var n = ka[i];
      if(!b[n]) return 'placeholder <' + n + '> is missing';
      if(b[n].form !== a[n].form) return 'placeholder <' + n + '> changed kind';
      if(b[n].parent !== a[n].parent) return 'placeholder <' + n + '> moved to another parent';
    }
    return '';
  }
  // >>> I18N-CORE:END

  var CORE = { norm: norm, hasLetters: hasLetters, hashId: hashId, esc: esc, unesc: unesc,
               tokens: tokens, shape: shape, validate: validate, languages: LANGUAGES, build: BUILD };

  // Node (the build and the tests) stops here.
  if(typeof window === 'undefined' || typeof document === 'undefined'){
    if(typeof module !== 'undefined' && module.exports) module.exports = CORE;
    return;
  }

  var doc = document, root = doc.documentElement;
  var SCRIPT_SRC = (doc.currentScript && doc.currentScript.src) || '';

  var SKIP   = { SCRIPT:1, STYLE:1, NOSCRIPT:1, TEMPLATE:1, SVG:1, PRE:1, TEXTAREA:1, IFRAME:1,
                 CANVAS:1, VIDEO:1, AUDIO:1, OBJECT:1, MATH:1, HEAD:1 };
  var INLINE = { A:1, B:1, STRONG:1, EM:1, I:1, U:1, S:1, SPAN:1, SMALL:1, SUP:1, SUB:1, MARK:1,
                 BR:1, WBR:1, CODE:1, KBD:1, ABBR:1, CITE:1, Q:1, FONT:1, BDI:1, BDO:1, TIME:1,
                 VAR:1, SAMP:1, DEL:1, INS:1 };
  var OPAQUE = { CODE:1, KBD:1, SAMP:1, VAR:1 };      // shown as written, never translated
  var ATTRS  = ['placeholder', 'title', 'aria-label', 'alt', 'data-tip'];

  var units = [];                                     // every translatable thing on the page
  var byNode = typeof WeakMap === 'function' ? new WeakMap() : null;
  var dict = null, current = 'en', busy = false, mo = null;
  var picker = null, menu = null, notice = null, placeTimer = 0;
  var cache = {};                                     // code -> dictionary, this page view

  function tagOf(el){ return String(el.tagName || '').toUpperCase(); }
  function skipEl(el){
    if(el.nodeType !== 1) return true;
    var t = tagOf(el);
    if(SKIP[t]) return true;
    if(el.id === 'djLang' || el.id === 'djLangMenu' || el.id === 'djLangNotice') return true;
    if(el.getAttribute('translate') === 'no') return true;
    if(el.hasAttribute('data-i18n-skip')) return true;
    if(el.classList && el.classList.contains('notranslate')) return true;
    if(el.isContentEditable) return true;
    return false;
  }
  function hasDirectText(el){
    for(var c = el.firstChild; c; c = c.nextSibling) if(c.nodeType === 3 && hasLetters(c.nodeValue)) return true;
    return false;
  }
  // true when every element below `el` is harmless inline markup
  function inlineOnly(el){
    for(var c = el.firstElementChild; c; c = c.nextElementSibling){
      var t = tagOf(c);
      if(!INLINE[t] || skipEl(c) || c.hasAttribute('data-i18n')) return false;
      if(!OPAQUE[t] && !inlineOnly(c)) return false;
    }
    return true;
  }
  // `kids` keeps each child's number for the life of the unit: a translation
  // may put the children in another order, and reading the page back must
  // still call them by the numbers the English gave them.
  function serialize(el, kids){
    var s = '';
    for(var c = el.firstChild; c; c = c.nextSibling){
      if(c.nodeType === 3){ s += esc(c.nodeValue); continue; }
      if(c.nodeType !== 1) continue;
      var at = kids.indexOf(c);
      if(at < 0){ kids.push(c); at = kids.length - 1; }
      var n = at + 1, t = tagOf(c);
      if(t === 'BR' || t === 'WBR' || OPAQUE[t] || !hasLetters(c.textContent)) s += '<' + n + '/>';
      else s += '<' + n + '>' + serialize(c, kids) + '</' + n + '>';
    }
    return s;
  }
  function remember(node, u){
    units.push(u);
    if(byNode) byNode.set(node, u);
    return u;
  }
  function known(node){ return byNode ? byNode.get(node) : null; }

  function attrUnits(el, out){
    for(var i = 0; i < ATTRS.length; i++){
      var a = ATTRS[i], v = el.getAttribute(a);
      if(!v || !hasLetters(v)) continue;
      var slot = '__dj_' + a;
      if(el[slot]) continue;
      var key = esc(norm(v));
      var u = { type: 'attr', el: el, attr: a, key: key, id: hashId(key), shown: key };
      el[slot] = u; units.push(u); out.push(u);
    }
    var t = tagOf(el);
    if(t === 'INPUT' && /^(button|submit|reset)$/i.test(el.type || '') && hasLetters(el.value) && !el.__dj_value){
      var kv = esc(norm(el.value));
      var uv = { type: 'attr', el: el, attr: 'value', key: kv, id: hashId(kv), shown: kv };
      el.__dj_value = uv; units.push(uv); out.push(uv);
    }
    // the original scheme's attribute form, e.g. data-i18n-placeholder="input.placeholder"
    var legacy = ['placeholder', 'title'];
    for(var j = 0; j < legacy.length; j++){
      var name = el.getAttribute('data-i18n-' + legacy[j]);
      if(name && el['__dj_' + legacy[j]]) el['__dj_' + legacy[j]].name = name;
    }
  }

  function collect(el, out){
    if(!el || el.nodeType !== 1 || skipEl(el)) return;
    attrUnits(el, out);
    if(known(el)) return;
    if(el.hasAttribute('data-i18n')){
      var k = esc(norm(el.textContent));
      out.push(remember(el, { type: 'key', el: el, name: el.getAttribute('data-i18n'), key: k, id: hashId(k), shown: k }));
      return;
    }
    if(OPAQUE[tagOf(el)]) return;
    if(hasDirectText(el) && inlineOnly(el)){
      var kids = [], key = norm(serialize(el, kids));
      out.push(remember(el, { type: 'unit', el: el, kids: kids, key: key, id: hashId(key), shown: key }));
      return;
    }
    for(var c = el.firstChild; c; c = c.nextSibling){
      if(c.nodeType === 1){ collect(c, out); continue; }
      if(c.nodeType !== 3 || !hasLetters(c.nodeValue) || known(c)) continue;
      var raw = c.nodeValue, tk = esc(norm(raw));
      out.push(remember(c, { type: 'text', node: c, key: tk, id: hashId(tk), shown: tk,
                             lead: /^\s/.test(raw) ? ' ' : '', trail: /\s$/.test(raw) ? ' ' : '' }));
    }
  }

  function writeUnit(u, str){
    if(validate(u.key, str)) return false;
    var tk = tokens(str), frag = doc.createDocumentFragment(), stack = [frag];
    for(var i = 0; i < tk.length; i++){
      var k = tk[i], top = stack[stack.length - 1];
      if(k.t === 'text'){ top.appendChild(doc.createTextNode(unesc(k.v))); continue; }
      if(k.t === 'close'){ stack.pop(); continue; }
      var node = u.kids[k.n - 1];
      if(!node) return false;
      if(k.t === 'open'){
        while(node.firstChild) node.removeChild(node.firstChild);
        stack.push(node);
      }
      top.appendChild(node);        // the element itself is reused: its attributes and listeners stay
    }
    while(u.el.firstChild) u.el.removeChild(u.el.firstChild);
    u.el.appendChild(frag);
    return true;
  }
  function show(u, str){
    try{
      if(u.type === 'unit'){ if(!writeUnit(u, str)) return false; }
      else if(u.type === 'text'){ u.node.nodeValue = u.lead + unesc(str) + u.trail; }
      else if(u.type === 'attr'){
        if(u.attr === 'value') u.el.value = unesc(str); else u.el.setAttribute(u.attr, unesc(str));
      }
      else if(u.type === 'key'){ u.el.textContent = unesc(str); }
      else if(u.type === 'title'){ doc.title = unesc(str); }
      u.shown = str;
      return true;
    }catch(e){ return false; }
  }
  // By what the text SAYS (its id), never by the name on the element. A name
  // says what the element said when the page was written; the web app rewrites
  // such elements ("No active session" becomes the session's name, "No steps
  // yet" becomes "Next: Step 2"), and looking up by name put the translation of
  // the old sentence back over the new one. The build gives every named
  // translation an entry under the id of its English, so nothing is lost.
  function lookup(u){
    if(!dict) return null;
    var v = dict[u.id];
    return typeof v === 'string' && v ? v : null;
  }
  function quiet(fn){
    busy = true;
    try{ fn(); }catch(e){}
    try{ if(mo) mo.takeRecords(); }catch(e){}
    busy = false;
  }
  function applyList(list){
    var done = 0;
    quiet(function(){
      for(var i = 0; i < list.length; i++){
        var u = list[i], v = current === 'en' ? null : lookup(u);
        if(v){ if(v === u.shown || show(u, v)) done++; }
        else if(u.shown !== u.key) show(u, u.key);           // back to the English
      }
    });
    return done;
  }

  function scanPage(){
    var fresh = [];
    try{
      if(!doc.__dj_title && hasLetters(doc.title)){
        var t = esc(norm(doc.title));
        var tu = { type: 'title', key: t, id: hashId(t), shown: t };
        doc.__dj_title = tu; units.push(tu); fresh.push(tu);
      }
      collect(doc.body, fresh);
    }catch(e){}
    return fresh;
  }

  // The page's own scripts change it: a button's label flips, a list is filled in.
  function reexamine(node, fresh){
    var el = node && node.nodeType === 3 ? node.parentNode : node, hops = 0, u = null;
    if(node && node.nodeType === 3) u = known(node);
    while(!u && el && el.nodeType === 1 && hops++ < 5){ u = known(el); if(!u) el = el.parentNode; }
    if(!u){ if(node && node.nodeType === 1) collect(node, fresh); else if(node && node.parentNode) collect(node.parentNode, fresh); return; }
    var now;
    if(u.type === 'unit'){
      now = norm(serialize(u.el, u.kids));
      if(now !== u.shown){ var kids = []; now = norm(serialize(u.el, kids)); u.kids = kids; }   // new content: number it afresh
    }
    else if(u.type === 'text') now = esc(norm(u.node.nodeValue));
    else if(u.type === 'key') now = esc(norm(u.el.textContent));
    else return;
    if(now === u.shown) return;
    if(!hasLetters(now)) return;
    u.key = now; u.id = hashId(now); u.shown = now;
    fresh.push(u);
  }
  function onMutations(records){
    if(busy) return;
    var fresh = [];
    try{
      for(var i = 0; i < records.length; i++){
        var r = records[i];
        if(r.type === 'characterData'){ reexamine(r.target, fresh); continue; }
        if(r.type === 'attributes'){ if(r.target && r.target.nodeType === 1){ var slot = '__dj_' + r.attributeName, u = r.target[slot];
            if(u){ var v = r.target.getAttribute(r.attributeName); var k = v && hasLetters(v) ? esc(norm(v)) : '';
              if(k && k !== u.shown){ u.key = k; u.id = hashId(k); u.shown = k; fresh.push(u); } }
            else attrUnits(r.target, fresh); }
          continue; }
        for(var j = 0; j < r.addedNodes.length; j++){
          var n = r.addedNodes[j];
          if(n.nodeType === 1){ if(!skipped(n)) collect(n, fresh); }
          else if(n.nodeType === 3 && !skipped(n.parentNode)) reexamine(n, fresh);
        }
        if(r.target && !skipped(r.target)) reexamine(r.target, fresh);
      }
    }catch(e){}
    if(fresh.length && current !== 'en' && dict) applyList(fresh);
  }
  // inside something that must not be translated?
  function skipped(el){
    for(var hops = 0; el && el.nodeType === 1 && hops < 40; el = el.parentNode, hops++) if(skipEl(el)) return true;
    return false;
  }

  // ------------------------------------------------------------------ words
  function dictUrl(code){
    try{ return new URL('i18n/' + code + '.json?v=' + BUILD, SCRIPT_SRC || location.href).href; }
    catch(e){ return 'i18n/' + code + '.json?v=' + BUILD; }
  }
  function loadDict(code){
    if(cache[code]) return Promise.resolve(cache[code]);
    // the single-file preview carries its dictionaries inside (fetch fails on file://)
    if(window.I18N_INLINE && window.I18N_INLINE[code]){ cache[code] = window.I18N_INLINE[code]; return Promise.resolve(cache[code]); }
    return fetch(dictUrl(code), { credentials: 'same-origin' })
      .then(function(r){ if(!r.ok) throw new Error('http ' + r.status); return r.json(); })
      .then(function(j){ cache[code] = j || {}; return cache[code]; });
  }
  // TAKE offers only the languages that are fully translated (the build's gate
  // checks these ten plus English), so the list stays short.
  var SHOWN = { en: 1, id: 1, ru: 1, zh: 1, ko: 1, ja: 1, de: 1, fr: 1, es: 1, pt: 1, it: 1 };
  function shown(code){ return !!SHOWN[code]; }
  // Flags drawn as small pictures: flag emoji show as two letters on Windows.
  function star(cx, cy, r, rot){
    var p = [];
    for(var i = 0; i < 10; i++){ var a = (rot || 0) - Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * .382 : r; p.push((cx + rr * Math.cos(a)).toFixed(2) + ',' + (cy + rr * Math.sin(a)).toFixed(2)); }
    return '<polygon points="' + p.join(' ') + '" fill="#FFDE00"/>';
  }
  function bars(x, y, deg){ // a trigram on the Korean flag: three short bars
    return '<g transform="rotate(' + deg + ' ' + x + ' ' + y + ')" fill="#000"><rect x="' + (x - 2.2) + '" y="' + (y - 1.6) + '" width="4.4" height=".7"/><rect x="' + (x - 2.2) + '" y="' + (y - .35) + '" width="4.4" height=".7"/><rect x="' + (x - 2.2) + '" y="' + (y + .9) + '" width="4.4" height=".7"/></g>';
  }
  var FLAG_ART = {
    en: '<rect width="30" height="20" fill="#012169"/><path d="M0 0L30 20M30 0L0 20" stroke="#fff" stroke-width="4"/><path d="M0 0L30 20M30 0L0 20" stroke="#C8102E" stroke-width="1.6"/><path d="M15 0v20M0 10h30" stroke="#fff" stroke-width="6"/><path d="M15 0v20M0 10h30" stroke="#C8102E" stroke-width="3.4"/>',
    id: '<rect width="30" height="10" fill="#CE1126"/><rect y="10" width="30" height="10" fill="#fff"/>',
    ru: '<rect width="30" height="6.7" fill="#fff"/><rect y="6.7" width="30" height="6.6" fill="#0039A6"/><rect y="13.3" width="30" height="6.7" fill="#D52B1E"/>',
    zh: '<rect width="30" height="20" fill="#DE2910"/>' + star(5, 5, 3) + star(10, 2, 1, .4) + star(12, 4, 1, .9) + star(12, 7, 1, 0) + star(10, 9, 1, .4),
    ko: '<rect width="30" height="20" fill="#fff"/><g transform="rotate(33.7 15 10)"><path d="M10 10a5 5 0 0 1 10 0z" fill="#CD2E3A"/><path d="M10 10a5 5 0 0 0 10 0z" fill="#0047A0"/><circle cx="12.5" cy="10" r="2.5" fill="#CD2E3A"/><circle cx="17.5" cy="10" r="2.5" fill="#0047A0"/></g>' + bars(6, 4.5, -56.3) + bars(24, 15.5, -56.3) + bars(24, 4.5, 56.3) + bars(6, 15.5, 56.3),
    ja: '<rect width="30" height="20" fill="#fff"/><circle cx="15" cy="10" r="6" fill="#BC002D"/>',
    de: '<rect width="30" height="6.7" fill="#000"/><rect y="6.7" width="30" height="6.6" fill="#DD0000"/><rect y="13.3" width="30" height="6.7" fill="#FFCE00"/>',
    fr: '<rect width="10" height="20" fill="#0055A4"/><rect x="10" width="10" height="20" fill="#fff"/><rect x="20" width="10" height="20" fill="#EF4135"/>',
    es: '<rect width="30" height="20" fill="#AA151B"/><rect y="5" width="30" height="10" fill="#F1BF00"/>',
    pt: '<rect width="30" height="20" fill="#FF0000"/><rect width="12" height="20" fill="#006600"/><circle cx="12" cy="10" r="3.6" fill="#FFCC00"/><circle cx="12" cy="10" r="2" fill="#FF0000"/>',
    it: '<rect width="10" height="20" fill="#009246"/><rect x="10" width="10" height="20" fill="#fff"/><rect x="20" width="10" height="20" fill="#CE2B37"/>'
  };
  function flag(code){ return FLAG_ART[code] ? '<svg class="dj-flag" viewBox="0 0 30 20" aria-hidden="true">' + FLAG_ART[code] + '</svg>' : ''; }
  function info(code){
    for(var i = 0; i < LANGUAGES.length; i++) if(LANGUAGES[i].code === code) return LANGUAGES[i];
    return null;
  }
  function stored(){
    try{ var s = localStorage.getItem('msi_lang'); if(s && info(s) && shown(s)) return s; }catch(e){}
    return '';
  }
  function firstLanguage(){
    var s = stored();
    if(s) return s;
    var list = (navigator.languages && navigator.languages.length) ? navigator.languages : [navigator.language || 'en'];
    for(var i = 0; i < list.length; i++){
      var c = String(list[i] || '').toLowerCase().split('-')[0];
      if(c === 'nb' || c === 'nn') c = 'no';
      if(info(c) && shown(c)) return c;
    }
    return 'en';
  }

  function coverage(){
    var all = 0, hit = 0;
    for(var i = 0; i < units.length; i++){
      var u = units[i];
      if(u.type === 'title' || u.type === 'attr') continue;
      if(u.el && !doc.documentElement.contains(u.el)) continue;
      if(u.node && !doc.documentElement.contains(u.node)) continue;
      all++;
      if(lookup(u)) hit++;
    }
    return { all: all, hit: hit, part: all ? hit / all : 1 };
  }

  function setLanguage(code, opts){
    opts = opts || {};
    var L = info(code) || LANGUAGES[0];
    code = L.code;
    function finish(){
      current = code;
      try{ root.lang = code; root.dir = L.rtl ? 'rtl' : 'ltr'; }catch(e){}
      if(!opts.silent){ try{ localStorage.setItem('msi_lang', code); }catch(e){} }
      scanPage();
      applyList(units);
      paintPicker();
      quiet(place);            // the words have changed length: find the picker's place again
      paintNotice();
      try{ doc.dispatchEvent(new CustomEvent('djinja:lang', { detail: { code: code, rtl: !!L.rtl, native: L.native, label: L.label } })); }catch(e){}
      return code;
    }
    if(code === 'en'){ dict = null; return Promise.resolve(finish()); }
    return loadDict(code).then(function(d){ dict = d; return finish(); })
      .catch(function(){
        // the words could not be fetched: stay readable, in English, and say nothing false
        dict = null; code = 'en'; L = LANGUAGES[0];
        return finish();
      });
  }

  // ----------------------------------------------------------------- picker
  var GLOBE = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M3 12h18"/><path d="M12 3c2.6 2.9 3.9 5.9 3.9 9s-1.3 6.1-3.9 9c-2.6-2.9-3.9-5.9-3.9-9S9.4 5.9 12 3z"/></svg>';
  var CSS = ''
    + '.dj-lang{position:relative;display:inline-flex;align-items:center;flex:0 0 auto;margin-inline-start:10px;font-family:"DM Mono",ui-monospace,"Cascadia Mono",Consolas,monospace;line-height:1;vertical-align:middle;-webkit-app-region:no-drag}'
    + '.dj-lang *{box-sizing:border-box}'
    + '.dj-lang-btn{display:inline-flex;align-items:center;gap:7px;height:34px;padding:0 12px;margin:0;border-radius:9px;border:1px solid rgba(0,200,255,.30);background:rgba(0,200,255,.08);color:#cfeaff;font:inherit;font-size:12px;font-weight:500;letter-spacing:.04em;text-transform:none;cursor:pointer;white-space:nowrap;transition:background .16s,border-color .16s,color .16s}'
    + '.dj-lang-btn:hover,.dj-lang.open .dj-lang-btn{background:rgba(0,200,255,.18);border-color:#00c8ff;color:#fff}'
    + '.dj-lang-btn:focus-visible{outline:2px solid #00c8ff;outline-offset:2px}'
    + '.dj-lang-btn svg{width:15px;height:15px;flex:0 0 auto}'
    + '.dj-lang-short{display:none;letter-spacing:.08em}'
    + '.dj-lang-caret{opacity:.7;font-size:9px}'
    // The list is NOT inside the button's bar: it is a layer of its own on the
    // page. A bar may clip what is inside it, or sit underneath the panel
    // below it (the web app's top bar did both).
    + '.dj-lang-menu{position:fixed;top:0;left:0;width:268px;max-width:calc(100vw - 16px);max-height:430px;overflow-y:auto;overscroll-behavior:contain;box-sizing:border-box;padding:6px;margin:0;border-radius:12px;border:1px solid rgba(0,200,255,.28);background:rgba(8,14,24,.98);box-shadow:0 18px 44px rgba(0,0,0,.55);display:none;z-index:2147483600;text-align:left;font-family:"DM Mono",ui-monospace,"Cascadia Mono",Consolas,monospace;line-height:1}'
    + '.dj-lang-menu *{box-sizing:border-box}'
    + '.dj-lang-menu.open{display:block}'
    + '.dj-lang-item{display:flex;align-items:center;gap:10px;width:100%;min-height:34px;padding:7px 10px;margin:0;border:0;border-radius:7px;background:transparent;color:#cfeaff;font:inherit;font-size:12px;font-weight:400;letter-spacing:0;text-transform:none;text-align:left;text-decoration:none;cursor:pointer}'
    + '.dj-lang-item:hover,.dj-lang-item:focus-visible{background:rgba(0,200,255,.14);color:#fff;outline:none}'
    + '.dj-lang-item[aria-checked="true"]{background:rgba(0,230,118,.13);color:#fff}'
    + '.dj-lang-code{flex:0 0 30px;text-align:center;font-size:10px;letter-spacing:.08em;padding:3px 0;border-radius:5px;border:1px solid rgba(0,200,255,.28);color:#8fdcff;text-transform:uppercase}'
    + '.dj-lang-native{flex:1 1 auto;font-weight:600;overflow:hidden;text-overflow:ellipsis}'
    + '.dj-lang-en{flex:0 0 auto;opacity:.55;font-size:10px}'
    + '.dj-flag{width:22px;height:15px;flex:0 0 22px;border-radius:3px;box-shadow:0 0 0 1px rgba(255,255,255,.25)}'
    + '.dj-lang-flagbox{display:inline-flex;align-items:center}.dj-lang-btn .dj-flag{width:20px;height:14px}'
    + '.dj-lang-menu--light .dj-flag{box-shadow:0 0 0 1px rgba(0,0,0,.18)}'
    + '.dj-lang-menu::-webkit-scrollbar{width:6px}.dj-lang-menu::-webkit-scrollbar-thumb{background:rgba(0,200,255,.22);border-radius:3px}'
    + '.dj-lang--float{position:fixed;top:12px;right:12px;margin:0;z-index:2147483000}'
    + '.dj-lang--float .dj-lang-btn{background:rgba(8,14,24,.82);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px)}'
    + '.dj-lang--push{margin-inline-start:auto}'
    + '.dj-lang--tight .dj-lang-name{display:none}.dj-lang--tight .dj-lang-short{display:inline}.dj-lang--tight .dj-lang-btn{padding:0 10px}'
    // a page that is short of room asks for the globe alone: <span data-lang-slot="icon"></span>
    + '.dj-lang--icon{margin:0}'
    + '.dj-lang--icon .dj-lang-btn{width:38px;height:38px;padding:0;justify-content:center;border-radius:10px}'
    + '.dj-lang--icon .dj-lang-btn svg{width:17px;height:17px}'
    + '.dj-lang--icon .dj-lang-name,.dj-lang--icon .dj-lang-short,.dj-lang--icon .dj-lang-caret{display:none!important}'
    + '.dj-lang--light .dj-lang-btn{color:#0c4660;border-color:rgba(12,70,96,.30);background:rgba(12,70,96,.06)}'
    + '.dj-lang--light .dj-lang-btn:hover,.dj-lang--light.open .dj-lang-btn{color:#06222f;border-color:#0c4660;background:rgba(12,70,96,.12)}'
    + '.dj-lang--light.dj-lang--float .dj-lang-btn{background:rgba(255,255,255,.88)}'
    + '.dj-lang-menu--light{background:rgba(250,252,254,.99);border-color:rgba(12,70,96,.22);box-shadow:0 18px 44px rgba(10,30,50,.22)}'
    + '.dj-lang-menu--light .dj-lang-item{color:#1c3346}'
    + '.dj-lang-menu--light .dj-lang-item:hover,.dj-lang-menu--light .dj-lang-item:focus-visible{background:rgba(12,70,96,.10);color:#000}'
    + '.dj-lang-menu--light .dj-lang-item[aria-checked="true"]{background:rgba(0,150,80,.14);color:#000}'
    + '.dj-lang-menu--light .dj-lang-code{color:#0c4660;border-color:rgba(12,70,96,.30)}'
    + 'html[dir="rtl"] .dj-lang-menu{text-align:right}html[dir="rtl"] .dj-lang-item{text-align:right}'
    + 'html[dir="rtl"] .dj-lang--float{right:auto;left:12px}'
    + '@media (max-width:560px){.dj-lang-name{display:none}.dj-lang-short{display:inline}.dj-lang-btn{padding:0 10px}}'
    + '#djLangNotice{position:fixed;left:50%;bottom:14px;transform:translateX(-50%);max-width:min(680px,calc(100vw - 24px));display:flex;align-items:center;gap:12px;padding:10px 12px 10px 16px;border-radius:12px;border:1px solid rgba(0,200,255,.28);background:rgba(8,14,24,.96);color:#d7ecfb;font:13px/1.45 system-ui,-apple-system,"Segoe UI",sans-serif;box-shadow:0 14px 36px rgba(0,0,0,.5);z-index:2147482000}'
    + '#djLangNotice button{flex:0 0 auto;width:28px;height:28px;border-radius:7px;border:1px solid rgba(0,200,255,.28);background:transparent;color:inherit;font-size:14px;line-height:1;cursor:pointer}'
    + '#djLangNotice button:hover{background:rgba(0,200,255,.16)}';

  function addCss(){
    if(doc.getElementById('djLangCss')) return;
    var st = doc.createElement('style');
    st.id = 'djLangCss';
    st.textContent = CSS;
    (doc.head || root).appendChild(st);
  }
  function isOpen(){ return !!(menu && menu.classList.contains('open')); }
  function closeMenu(){
    if(menu) menu.classList.remove('open');
    if(picker){ picker.classList.remove('open'); var b = picker.querySelector('.dj-lang-btn'); if(b) b.setAttribute('aria-expanded', 'false'); }
  }
  // Put the list under the button (above it when there is no room below),
  // always wholly inside the window.
  function fitMenu(){
    if(!menu || !picker) return;
    var b = picker.getBoundingClientRect(), vw = root.clientWidth || window.innerWidth, vh = window.innerHeight;
    var w = Math.min(210, vw - 16);
    var left = root.dir === 'rtl' ? b.left : b.right - w;
    left = Math.max(8, Math.min(left, vw - w - 8));
    var below = vh - b.bottom - 16, above = b.top - 16, full = Math.min(430, menu.scrollHeight || 430);
    menu.style.width = w + 'px';
    menu.style.left = Math.round(left) + 'px';
    if(below >= Math.min(full, 240) || below >= above){
      menu.style.maxHeight = Math.max(120, Math.min(430, below)) + 'px';
      menu.style.top = Math.round(b.bottom + 8) + 'px';
    } else {
      var mh = Math.max(120, Math.min(430, above));
      menu.style.maxHeight = mh + 'px';
      menu.style.top = Math.round(Math.max(8, b.top - 8 - Math.min(mh, full))) + 'px';
    }
  }
  function openMenu(){
    if(!menu || !picker) return;
    quiet(function(){ if(menu.parentNode !== doc.body) doc.body.appendChild(menu); });
    paintTheme();
    menu.classList.add('open');
    picker.classList.add('open');
    picker.querySelector('.dj-lang-btn').setAttribute('aria-expanded', 'true');
    fitMenu();
    // bring the chosen language into view INSIDE the list - never scroll the page
    var on = menu.querySelector('[aria-checked="true"]');
    if(on) menu.scrollTop = Math.max(0, on.offsetTop - 60);
  }
  function buildPicker(){
    var wrap = doc.createElement('div');
    wrap.id = 'djLang';
    wrap.className = 'dj-lang notranslate';
    wrap.setAttribute('translate', 'no');
    wrap.setAttribute('data-i18n-skip', '');
    var btn = doc.createElement('button');
    btn.type = 'button';
    btn.id = 'langPickerBtn';
    btn.className = 'dj-lang-btn';
    btn.setAttribute('aria-haspopup', 'true');
    btn.setAttribute('aria-expanded', 'false');
    btn.setAttribute('aria-label', 'Language');
    btn.innerHTML = '<span class="dj-lang-flagbox">' + GLOBE + '</span><span class="dj-lang-name"></span><span class="dj-lang-short"></span><span class="dj-lang-caret" aria-hidden="true">▾</span>';
    menu = doc.createElement('div');
    menu.id = 'djLangMenu';
    menu.className = 'dj-lang-menu notranslate';
    menu.setAttribute('role', 'menu');
    menu.setAttribute('translate', 'no');
    menu.setAttribute('data-i18n-skip', '');
    // The menu lists countries A to Z; LANGUAGES itself keeps English first (the fallback).
    LANGUAGES.filter(function(L){ return shown(L.code); }).sort(function(a, b){ return a.country.localeCompare(b.country); }).forEach(function(L){
      var it = doc.createElement('button');
      it.type = 'button';
      it.className = 'dj-lang-item';
      it.setAttribute('role', 'menuitemradio');
      it.setAttribute('data-lang', L.code);
      it.setAttribute('lang', L.code);
      it.setAttribute('aria-checked', 'false');
      it.innerHTML = flag(L.code) + '<span class="dj-lang-native"></span>';
      it.querySelector('.dj-lang-native').textContent = L.native;
      it.title = L.country;
      it.addEventListener('click', function(ev){
        ev.preventDefault(); ev.stopPropagation();
        closeMenu();
        try{ sessionStorage.removeItem('msi_lang_notice'); }catch(e){}
        setLanguage(L.code);
        btn.focus();
      });
      menu.appendChild(it);
    });
    btn.addEventListener('click', function(ev){
      ev.preventDefault(); ev.stopPropagation();
      if(isOpen()) closeMenu(); else openMenu();
    });
    function keys(ev){
      if(ev.key === 'Escape'){ if(isOpen()){ closeMenu(); btn.focus(); ev.stopPropagation(); } return; }
      if(ev.key !== 'ArrowDown' && ev.key !== 'ArrowUp' && ev.key !== 'Home' && ev.key !== 'End') return;
      var items = Array.prototype.slice.call(menu.querySelectorAll('.dj-lang-item'));
      var at = items.indexOf(doc.activeElement);
      if(!isOpen()){ openMenu(); at = items.indexOf(menu.querySelector('[aria-checked="true"]')) - 1; }
      var next = ev.key === 'Home' ? 0 : ev.key === 'End' ? items.length - 1
               : ev.key === 'ArrowDown' ? (at + 1) % items.length : (at <= 0 ? items.length - 1 : at - 1);
      try{ items[next].focus({ preventScroll: true }); }catch(e){ items[next].focus(); }
      menu.scrollTop = Math.max(0, items[next].offsetTop - 60);
      ev.preventDefault();
    }
    wrap.addEventListener('keydown', keys);
    menu.addEventListener('keydown', keys);
    doc.addEventListener('click', function(ev){ if(isOpen() && !wrap.contains(ev.target) && !menu.contains(ev.target)) closeMenu(); });
    // the list is pinned to the window: keep it under its button while the page moves
    window.addEventListener('scroll', function(ev){ if(isOpen() && !(ev.target && menu.contains(ev.target))) fitMenu(); }, true);
    wrap.appendChild(btn);
    return wrap;
  }
  function paintPicker(){
    if(!picker) return;
    var L = info(current) || LANGUAGES[0];
    var n = picker.querySelector('.dj-lang-name'), s = picker.querySelector('.dj-lang-short');
    if(n) n.textContent = L.native;
    var fb = picker.querySelector('.dj-lang-flagbox'); if(fb) fb.innerHTML = flag(L.code) || GLOBE;
    if(s) s.textContent = L.code.toUpperCase();
    var items = menu ? menu.querySelectorAll('.dj-lang-item') : [];
    for(var i = 0; i < items.length; i++) items[i].setAttribute('aria-checked', items[i].getAttribute('data-lang') === L.code ? 'true' : 'false');
  }

  // Is the page light or dark where the picker sits? Read it, do not assume it.
  function backdrop(el){
    for(var hops = 0; el && el.nodeType === 1 && hops < 30; el = el.parentNode, hops++){
      var c = getComputedStyle(el).backgroundColor, m = /rgba?\(([^)]+)\)/.exec(c || '');
      if(!m) continue;
      var p = m[1].split(',').map(function(x){ return parseFloat(x); });
      if(p.length > 3 && p[3] < 0.5) continue;
      return (0.2126 * p[0] + 0.7152 * p[1] + 0.0722 * p[2]) / 255;
    }
    var col = getComputedStyle(doc.body).color, mm = /rgba?\(([^)]+)\)/.exec(col || '');
    if(mm){ var q = mm[1].split(',').map(function(x){ return parseFloat(x); }); return 1 - (0.2126 * q[0] + 0.7152 * q[1] + 0.0722 * q[2]) / 255; }
    return 0;
  }
  function paintTheme(){
    if(!picker) return;
    try{
      var light = backdrop(picker.parentNode) > 0.6;
      // TAKE's header always sits over the dark hero: the button keeps dark colours there
      picker.classList.toggle('dj-lang--light', light && !(picker.closest && picker.closest('.nav')));
      if(menu) menu.classList.toggle('dj-lang-menu--light', light);
      if(notice){ notice.style.background = light ? 'rgba(255,255,255,.97)' : ''; notice.style.color = light ? '#16303f' : ''; }
    }catch(e){}
  }

  function visible(el){
    if(!el || !el.getBoundingClientRect) return false;
    var r = el.getBoundingClientRect(), vw = root.clientWidth || window.innerWidth;
    if(r.width < 2 || r.height < 2) return false;
    if(r.right > vw + 1 || r.left < -1) return false;
    var cs = getComputedStyle(el);
    return cs.visibility !== 'hidden' && cs.display !== 'none' && parseFloat(cs.opacity || '1') > 0.05;
  }
  // [selector, how]   in = last thing inside it;   bar = a flex child pushed to the far side
  var HOSTS = [
    ['[data-lang-slot]', 'in'],
    ['.nav-links', 'in'], ['.header-right', 'in'], ['.topbar-right', 'in'], ['.tb-right', 'in'],
    ['.nav-right', 'in'], ['.nav-actions', 'in'],
    ['nav .nav-inner', 'bar'], ['nav', 'bar'], ['header .header-inner', 'bar'], ['body > header', 'bar'],
    ['.topbar', 'bar'], ['.top-bar', 'bar'], ['.top-nav', 'bar']
  ];
  // a picker inside a link or a button would be a button inside a button
  function insideControl(el){
    for(var hops = 0; el && el.nodeType === 1 && hops < 12; el = el.parentNode, hops++) if(/^(A|BUTTON|LABEL|SUMMARY)$/.test(tagOf(el))) return true;
    return false;
  }
  function place(){
    if(!picker) return;
    closeMenu();
    unfit();
    var was = picker.parentNode;
    for(var i = 0; i < HOSTS.length; i++){
      var host = null;
      try{ host = doc.querySelector(HOSTS[i][0]); }catch(e){}
      if(!host || host === picker || picker.contains(host) || insideControl(host)) continue;
      var slot = host.hasAttribute('data-lang-slot');
      // a slot is an empty marker: judge the bar it stands in, not the marker
      var seen = slot && host.parentNode && host.parentNode.nodeType === 1 && host.firstChild !== picker ? host.parentNode : host;
      var hs = getComputedStyle(seen);
      if(hs.display === 'none' || hs.visibility === 'hidden') continue;
      var hr = seen.getBoundingClientRect();
      if(hr.width < 2 || hr.height < 2 || hr.top > 260) continue;     // not a top bar
      picker.classList.remove('dj-lang--float');
      picker.classList.toggle('dj-lang--icon', slot && host.getAttribute('data-lang-slot') === 'icon');
      var flex = /flex|grid/.test(hs.display);
      picker.classList.toggle('dj-lang--push', HOSTS[i][1] === 'bar' && flex);
      if(HOSTS[i][1] === 'bar'){
        // keep a menu button (the three lines) as the last thing in the bar
        var last = host.lastElementChild;
        while(last && (last === picker || !visible(last))) last = last.previousElementSibling;
        if(last && /^(BUTTON)$/.test(tagOf(last)) && last !== picker){ if(last.previousElementSibling !== picker) host.insertBefore(picker, last); }
        else if(host.lastElementChild !== picker) host.appendChild(picker);
      } else if(host.lastElementChild !== picker){
        host.appendChild(picker);
      }
      // make room in this bar before deciding that there is none
      fitBar();
      if(visible(picker)){ paintTheme(); return; }
      unfit();
    }
    picker.classList.remove('dj-lang--tight');
    picker.classList.remove('dj-lang--push');
    picker.classList.remove('dj-lang--icon');
    picker.classList.add('dj-lang--float');
    if(picker.parentNode !== doc.body) doc.body.appendChild(picker);
    paintTheme();
    if(was && was !== doc.body && was !== picker.parentNode){ /* moved out of a bar that went away */ }
  }
  // Translated words are often longer than the English ones, and a header
  // built for "Pricing" has no room for "Tarifs et abonnements". When the bar
  // the picker sits in no longer fits - a label wraps, two items overlap,
  // something runs off the side - it is relieved in steps, smallest first:
  //   1. the picker gives up its name and shows its two letters;
  //   2. labels are kept on one line;
  //   3. the bar's text, padding and gaps are scaled down a little at a time.
  // A bar that fits is never touched: an English page stays exactly as built.
  var fitted = [];
  function unfit(){
    for(var i = 0; i < fitted.length; i++){ try{ fitted[i].el.style.cssText = fitted[i].css; fitted[i].el.__dj_fit = 0; }catch(e){} }
    fitted = [];
  }
  function fitStyle(el, props){
    if(!el.__dj_fit){ fitted.push({ el: el, css: el.style.cssText }); el.__dj_fit = 1; }
    for(var k in props) el.style.setProperty(k, props[k], 'important');
  }
  function theBar(){
    var bar = picker && picker.parentNode;
    for(var hops = 0; bar && bar.nodeType === 1 && hops < 5 && !/^(NAV|HEADER)$/.test(tagOf(bar)); hops++) bar = bar.parentNode;
    if(!bar || bar.nodeType !== 1 || bar === doc.body || bar === root) bar = picker && picker.parentNode;
    return bar && bar.nodeType === 1 && bar !== doc.body ? bar : null;
  }
  // hidden, or part of a menu that drops down out of the bar
  function outOfBar(e, bar){
    for(var n = e; n && n !== bar && n.nodeType === 1; n = n.parentNode){
      var cs = getComputedStyle(n);
      if(cs.display === 'none' || cs.visibility === 'hidden' || parseFloat(cs.opacity || '1') < 0.05) return true;
      if(cs.position === 'absolute' || cs.position === 'fixed') return true;
    }
    return false;
  }
  function barItems(bar){
    var out = [], els = bar.querySelectorAll('a,button,span,strong,b,label,li');
    for(var i = 0; i < els.length && i < 300; i++){
      var e = els[i];
      if(picker.contains(e) || !hasDirectText(e) || outOfBar(e, bar)) continue;
      var r = e.getBoundingClientRect();
      if(r.width < 2 || r.height < 2) continue;
      out.push(e);
    }
    return out;
  }
  // Are the element's own words on more than one line? Asked of the words
  // themselves: a tall button or a logo beside the text is not a wrapped label.
  function onTwoLines(e){
    try{
      for(var c = e.firstChild; c; c = c.nextSibling){
        if(c.nodeType !== 3 || !hasLetters(c.nodeValue)) continue;
        var rg = doc.createRange();
        rg.selectNodeContents(c);
        var rs = rg.getClientRects(), top = null;
        for(var i = 0; i < rs.length; i++){
          if(rs[i].width < 1) continue;
          if(top === null) top = rs[i].top;
          else if(Math.abs(rs[i].top - top) > rs[i].height * 0.6) return true;
        }
      }
    }catch(err){}
    return false;
  }
  function barTrouble(bar, items){
    var vw = root.clientWidth || window.innerWidth, rects = [];
    var mine = picker.getBoundingClientRect();
    if(mine.width > 2 && (mine.right > vw + 1 || mine.left < -1)) return 'the picker is off the side';
    for(var i = 0; i < items.length; i++){
      var e = items[i], r = e.getBoundingClientRect(), cs = getComputedStyle(e);
      if(r.right > vw + 1 || r.left < -1) return 'off the side';
      if(cs.whiteSpace !== 'nowrap' && onTwoLines(e)) return 'a label wraps';
      rects.push(r);
    }
    rects.push(picker.getBoundingClientRect());
    for(var a = 0; a < rects.length; a++) for(var b = a + 1; b < rects.length; b++){
      var p = rects[a], q = rects[b];
      // two things on the same line that share some of their width
      if(Math.min(p.bottom, q.bottom) - Math.max(p.top, q.top) > 4 && Math.min(p.right, q.right) - Math.max(p.left, q.left) > 2){
        // one inside the other is a label in its own button, not a collision
        var inside = (p.left >= q.left - 1 && p.right <= q.right + 1) || (q.left >= p.left - 1 && q.right <= p.right + 1);
        if(!inside) return 'two items overlap';
      }
    }
    if(bar.scrollWidth > bar.clientWidth + 1 && getComputedStyle(bar).overflowX !== 'visible') return 'the bar scrolls';
    return '';
  }
  // No further than 78% (and never under 10.5px): below that the menu is no
  // longer comfortable to read, and a label on two lines is the lesser evil.
  // The gaps between items give way faster than the words do.
  var FIT_STEPS = [1, 0.94, 0.88, 0.82, 0.78];
  function fitBar(){
    if(!picker) return;
    unfit();
    picker.classList.remove('dj-lang--tight');
    if(picker.classList.contains('dj-lang--float')) return;
    var bar = theBar();
    if(!bar) return;
    var items = barItems(bar);
    if(!barTrouble(bar, items)) return;
    if(!picker.classList.contains('dj-lang--icon')){
      picker.classList.add('dj-lang--tight');
      if(!barTrouble(bar, items)) return;
    }
    // what each thing measures now, before anything is scaled
    var was = [], boxes = [], seen = [];
    for(var i = 0; i < items.length; i++){
      var cs = getComputedStyle(items[i]);
      was.push({ fs: parseFloat(cs.fontSize) || 14, ls: parseFloat(cs.letterSpacing) || 0, pl: parseFloat(cs.paddingLeft) || 0, pr: parseFloat(cs.paddingRight) || 0 });
      for(var n = items[i].parentNode; n && n.nodeType === 1; n = n.parentNode){
        if(seen.indexOf(n) < 0){
          seen.push(n);
          var ps = getComputedStyle(n), gap = parseFloat(ps.columnGap);
          if(/flex|grid/.test(ps.display) && gap > 4) boxes.push({ el: n, gap: gap });
        }
        if(n === bar) break;
      }
    }
    for(var s = 0; s < FIT_STEPS.length; s++){
      var k = FIT_STEPS[s];
      for(var j = 0; j < items.length; j++){
        // never below 10.5px, unless the page itself already set it smaller
        var w = was[j], props = { 'white-space': 'nowrap', 'font-size': Math.max(w.fs * k, Math.min(w.fs, 10.5)).toFixed(2) + 'px' };
        if(w.ls) props['letter-spacing'] = (w.ls * k).toFixed(2) + 'px';
        if(w.pl > 4) props['padding-left'] = (w.pl * k).toFixed(1) + 'px';
        if(w.pr > 4) props['padding-right'] = (w.pr * k).toFixed(1) + 'px';
        fitStyle(items[j], props);
      }
      for(var g = 0; g < boxes.length; g++) fitStyle(boxes[g].el, { 'column-gap': Math.max(6, boxes[g].gap * k * k * k).toFixed(1) + 'px' });
      if(!barTrouble(bar, items)) return;
    }
    // It does not fit on one line at a readable size. Let the labels wrap, at
    // the smallest size tried, rather than run over each other.
    for(var z = 0; z < items.length; z++) items[z].style.setProperty('white-space', 'normal', 'important');
  }
  function placeSoon(){ clearTimeout(placeTimer); placeTimer = setTimeout(function(){ quiet(function(){ place(); liftNotice(); }); }, 120); }
  // The notice sits at the foot of the window - above a cookie bar, not on it.
  function liftNotice(){
    if(!notice) return;
    try{
      notice.style.bottom = '';
      var vw = root.clientWidth || window.innerWidth, vh = window.innerHeight, lift = 0;
      var under = doc.elementsFromPoint(Math.round(vw / 2), vh - 6);
      for(var i = 0; i < under.length; i++){
        var e = under[i];
        if(e === notice || notice.contains(e) || e === doc.body || e === root) continue;
        var cs = getComputedStyle(e);
        if(cs.position !== 'fixed' && cs.position !== 'sticky') continue;
        var r = e.getBoundingClientRect();
        if(r.width >= vw * 0.6 && r.height < vh * 0.5 && r.bottom >= vh - 2) lift = Math.max(lift, vh - r.top);
      }
      if(lift) notice.style.bottom = Math.round(lift + 12) + 'px';
    }catch(e){}
  }

  // ----------------------------------------------------------------- notice
  // A page that is not translated says so, in the visitor's language, instead
  // of leaving them to wonder whether the button is broken.
  function paintNotice(){
    try{
      var policy = (doc.querySelector('meta[name="dj-i18n"]') || { content: '' }).content || '';
      var want = '';
      if(current !== 'en' && dict){
        if(/legal/.test(policy)) want = dict['i18n.notice.legal'] || '';
        else if(coverage().part < 0.5) want = dict['i18n.notice.english'] || '';
      }
      var off = ''; try{ off = sessionStorage.getItem('msi_lang_notice') || ''; }catch(e){}
      if(!want || off === current + '|' + location.pathname){ if(notice){ notice.remove(); notice = null; } return; }
      if(!notice){
        notice = doc.createElement('div');
        notice.id = 'djLangNotice';
        notice.className = 'notranslate';
        notice.setAttribute('role', 'status');
        notice.setAttribute('data-i18n-skip', '');
        notice.innerHTML = '<span></span><button type="button" aria-label="Close">✕</button>';
        notice.lastChild.addEventListener('click', function(){
          try{ sessionStorage.setItem('msi_lang_notice', current + '|' + location.pathname); }catch(e){}
          if(notice){ notice.remove(); notice = null; }
        });
      }
      notice.firstChild.textContent = want;
      if(!notice.parentNode) quiet(function(){ doc.body.appendChild(notice); });
      paintTheme();
      liftNotice();
      setTimeout(liftNotice, 900);          // a cookie bar that slides in after the page has loaded
    }catch(e){}
  }

  // ------------------------------------------------------------------- init
  function init(){
    try{
      addCss();
      picker = buildPicker();
      quiet(place);
      scanPage();
      paintPicker();
      if(typeof MutationObserver === 'function'){
        mo = new MutationObserver(onMutations);
        mo.observe(doc.body, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ATTRS });
        new MutationObserver(function(){ quiet(paintTheme); }).observe(root, { attributes: true, attributeFilter: ['class', 'data-theme', 'style'] });
        new MutationObserver(function(){ quiet(paintTheme); }).observe(doc.body, { attributes: true, attributeFilter: ['class', 'data-theme'] });
      }
      window.addEventListener('resize', placeSoon);
      window.addEventListener('load', placeSoon);
      window.addEventListener('orientationchange', placeSoon);
      // another tab changed the language: follow it
      window.addEventListener('storage', function(ev){ if(ev.key === 'msi_lang' && ev.newValue && ev.newValue !== current && info(ev.newValue) && shown(ev.newValue)) setLanguage(ev.newValue, { silent: true }); });
      var first = firstLanguage();
      if(first !== 'en') setLanguage(first, { silent: !stored() });
      else { try{ root.lang = 'en'; }catch(e){} }
    }catch(e){}
  }

  window.djinjaI18n = {
    core: CORE,
    languages: LANGUAGES,
    build: BUILD,
    get current(){ return current; },
    apply: setLanguage,
    set: setLanguage,
    // the words of the chosen language, for a page's own scripts
    t: function(english){ var k = esc(norm(english)); var v = dict && dict[hashId(k)]; return (current !== 'en' && typeof v === 'string' && v) ? unesc(v) : english; },
    // what the page holds: used by the build to gather the English
    scan: function(){ scanPage(); return units.map(function(u){ return { type: u.type, key: u.key, id: u.id, name: u.name || '', attr: u.attr || '', tag: u.el ? tagOf(u.el) : (u.node ? '#text' : 'TITLE') }; }); },
    coverage: coverage,
    // what is on this page, in the chosen language, that has no translation
    missing: function(){ var out = []; for(var i = 0; i < units.length; i++){ var u = units[i];
      if((u.el && !root.contains(u.el)) || (u.node && !root.contains(u.node))) continue;
      if(!lookup(u)) out.push({ type: u.type, key: u.key, id: u.id, name: u.name || '', attr: u.attr || '' }); } return out; },
    place: function(){ quiet(place); },
    // for scripts/test-website-i18n.mjs: the parts that read and write the page
    _test: { collect: collect, serialize: serialize, show: show, units: function(){ return units; } },
    // for the harness: what the picker's bar holds and whether it fits
    bar: function(){ var b = theBar(); if(!b) return null; var it = barItems(b);
      return { trouble: barTrouble(b, it), scaled: fitted.length, items: it.map(function(e){ var r = e.getBoundingClientRect();
        return { text: norm(e.textContent).slice(0, 28), left: Math.round(r.left), right: Math.round(r.right), top: Math.round(r.top), bottom: Math.round(r.bottom), size: getComputedStyle(e).fontSize }; }) }; }
  };

  if(doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', init);
  else init();
})();
