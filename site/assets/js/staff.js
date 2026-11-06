// TAKE staff app: kitchen board, rentals (check-out / check-in), fleet and
// service, live map, daily takings. Talks to /api/staff with the PIN header.
(function () {
  var T = window.TAKE, $ = function (s, r) { return (r || document).querySelector(s); };
  var pin = '', data = { orders: [], bookings: [], bikes: [], last: [] }, seen = null, tab = 'kitchen', map, layer;
  try { pin = localStorage.getItem('take_pin') || ''; } catch (e) {}
  // What this device is for: 'till' (everything) or 'kitchen' (orders only, big, always on).
  // Chosen once per device and remembered; /staff?mode=kitchen sets it too.
  var MODE = 'till';
  try { MODE = new URLSearchParams(location.search).get('mode') || localStorage.getItem('take_mode') || 'till'; } catch (e) {}
  if (MODE !== 'kitchen') MODE = 'till';
  var SOUND = true; try { SOUND = localStorage.getItem('take_sound') !== 'off'; } catch (e) {}
  var actx = null, timer = null;
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
  var rp = function (n) { return n == null ? '-' : 'Rp ' + Number(n).toLocaleString('id-ID'); };
  var bikeName = function (id) { var b = T.bikes.filter(function (x) { return x.id === id; })[0]; return b ? b.name : id; };
  var today = function () { return new Date().toISOString().slice(0, 10); };
  var ago = function (iso) { var m = Math.round((Date.now() - new Date(iso.replace(' ', 'T') + 'Z')) / 60000); return m < 60 ? m + ' min' : Math.round(m / 60) + ' h'; };
  var telWa = function (n) { var d = String(n || '').replace(/\D/g, ''); if (d.indexOf('0') === 0) d = '62' + d.slice(1); return 'https://wa.me/' + d; };

  function api(path, method, body) {
    return fetch('/api/staff/' + path, { method: method || 'GET', headers: { 'content-type': 'application/json', 'x-staff-pin': pin }, body: body ? JSON.stringify(body) : undefined })
      .then(function (r) { return r.json().then(function (j) { if (r.status === 401) logout(); if (!r.ok) throw new Error(j.error || r.status); return j; }); });
  }
  function toast(t) { var d = document.createElement('div'); d.className = 'toast'; d.textContent = t; document.body.appendChild(d); setTimeout(function () { d.remove(); }, 3500); }
  // Tablets only allow sound after a tap, so the sound is switched on by the first tap anywhere.
  function audio() { if (!actx) { try { actx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) {} } if (actx && actx.state === 'suspended') actx.resume(); return actx; }
  document.addEventListener('pointerdown', function () { audio(); devBar(); }, { once: true });
  // ---- the app talks: new orders and bookings read out, reminders every few minutes
  var TALK = true; try { TALK = localStorage.getItem('take_talk') !== 'off'; } catch (e) {}
  var said = {};
  function say(text) {
    if (!TALK || !window.speechSynthesis) return;
    var u = new SpeechSynthesisUtterance(text); u.lang = 'en-GB'; u.rate = 0.95; u.volume = 1;
    var v = speechSynthesis.getVoices().filter(function (x) { return /^en/i.test(x.lang); })[0]; if (v) u.voice = v;
    speechSynthesis.speak(u);
  }
  function remind(key, everyMin, text) {
    var t = Date.now(); if (said[key] && t - said[key] < everyMin * 60000) return false;
    said[key] = t; toast(text); say(text); return true;
  }
  var mins = function (iso) { return iso ? Math.round((Date.now() - new Date(String(iso).replace(' ', 'T') + 'Z')) / 60000) : 0; };
  function reminders() {
    if (!data || !data.orders) return;
    var t = today(), food = data.orders, bk = data.bookings || [], n = 0;
    food.forEach(function (o) {
      if (n > 2) return;
      if (o.status === 'new' && mins(o.created) >= 10 && remind('on' + o.id, 10, 'Order ' + o.id + ' for ' + o.name + ' is waiting ' + mins(o.created) + ' minutes. Please start cooking.')) n++;
      else if (o.status === 'ready' && mins(o.updated || o.created) >= 10 && remind('or' + o.id, 10, 'Order ' + o.id + ' for ' + o.name + ' is ready and not collected yet.')) n++;
    });
    if (MODE === 'kitchen') return;
    bk.forEach(function (b) {
      if (n > 3) return;
      var who = 'booking ' + b.id + ' for ' + b.name;
      if (b.status === 'request' && remind('br' + b.id, 15, 'New request, ' + who + ', is waiting for an answer.')) n++;
      else if (b.pay_claimed && !b.paid && remind('bp' + b.id, 30, 'Please check the payment for ' + who + '.')) n++;
      else if (b.status === 'confirmed' && b.start && b.start <= t && remind('bh' + b.id, 60, 'Hand over today: ' + who + '.')) n++;
      else if (b.status === 'out' && b.kind === 'rent' && b.end && b.end < t && remind('bl' + b.id, 60, 'Late return: ' + who + ' was due back on ' + b.end + '. Please message them.')) n++;
      else if (b.status === 'out' && b.kind === 'rent' && b.end === t && remind('bd' + b.id, 180, 'Due back today: ' + who + '.')) n++;
    });
  }
  setInterval(reminders, 60000);
  function talkBtn() { $('#talkBtn').textContent = TALK ? 'Voice on' : 'Voice off'; $('#talkBtn').classList.toggle('warn', !TALK); }
  $('#talkBtn').onclick = function () { TALK = !TALK; try { localStorage.setItem('take_talk', TALK ? 'on' : 'off'); } catch (e) {} talkBtn(); if (TALK) say('Voice on. I will read new orders and remind you.'); else speechSynthesis.cancel(); };
  talkBtn();

  function beep(loud) {
    var a = actx; if (!SOUND || !a || a.state !== 'running') return;
    [[880, 0], [1175, .3]].concat(loud ? [[1480, .6]] : []).forEach(function (n) {
      var o = a.createOscillator(), g = a.createGain(); o.connect(g); g.connect(a.destination);
      o.frequency.value = n[0]; g.gain.value = loud ? .35 : .2; o.start(a.currentTime + n[1]); o.stop(a.currentTime + n[1] + .25);
    });
  }

  // ---- login
  function logout() { pin = ''; try { localStorage.removeItem('take_pin'); } catch (e) {} $('#app').hidden = true; $('#login').hidden = false; }
  $('#loginForm').addEventListener('submit', function (e) {
    e.preventDefault(); pin = this.pin.value.trim();
    api('login').then(function () { try { localStorage.setItem('take_pin', pin); } catch (x) {} start(); })
      .catch(function (err) { $('#loginNote').textContent = err.message; });
  });
  function start() {
    $('#login').hidden = true; $('#app').hidden = false;
    setMode(MODE); refresh();
    if (!timer) timer = setInterval(refresh, MODE === 'kitchen' ? 5000 : 10000);
    // a new order nobody has started yet rings again every 30 seconds on the kitchen screen
    setInterval(function () { if (MODE === 'kitchen' && data.orders.some(function (o) { return o.status === 'new'; })) beep(true); }, 30000);
    keepAwake();
  }

  // ---- this device: kitchen screen or till, sound, full screen, install, always on
  function setMode(m) {
    MODE = m; try { localStorage.setItem('take_mode', m); } catch (e) {}
    document.body.classList.toggle('kds', m === 'kitchen');
    if (m === 'kitchen' && tab !== 'kitchen') $('[data-tab=kitchen]').click();
    if (timer) { clearInterval(timer); timer = setInterval(refresh, m === 'kitchen' ? 5000 : 10000); }
    if (data.orders) kitchen();
    devBar();
  }
  function devBar() {
    $('#modeBtn').textContent = MODE === 'kitchen' ? 'Kitchen screen ▾' : 'Till ▾';
    var on = SOUND && actx && actx.state === 'running';
    $('#soundBtn').textContent = !SOUND ? 'Sound off' : on ? 'Sound on' : 'Tap to turn sound on';
    $('#soundBtn').classList.toggle('warn', !on);
    $('#fsBtn').hidden = !document.documentElement.requestFullscreen || standalone();
  }
  $('#modeBtn').onclick = function () {
    dialog('What is this screen for?', [['mode', 'This device', 'select', MODE, [['till', 'Till: orders, bookings, fleet, takings'], ['kitchen', 'Kitchen screen: food orders only, big, always on']]]],
      function (v) { setMode(v.mode); return Promise.resolve(); });
  };
  $('#soundBtn').onclick = function () {
    var a = audio();
    if (SOUND && a && a.state === 'running' && this.textContent === 'Sound on') SOUND = false; else SOUND = true;
    try { localStorage.setItem('take_sound', SOUND ? 'on' : 'off'); } catch (e) {}
    setTimeout(function () { devBar(); beep(); }, 150);
  };
  $('#fsBtn').onclick = function () { if (document.fullscreenElement) document.exitFullscreen(); else document.documentElement.requestFullscreen().catch(function () {}); };
  function standalone() { return (window.matchMedia && matchMedia('(display-mode: standalone)').matches) || navigator.standalone === true; }
  var installEv = null;
  window.addEventListener('beforeinstallprompt', function (e) { e.preventDefault(); installEv = e; $('#installBtn').hidden = false; });
  window.addEventListener('appinstalled', function () { $('#installBtn').hidden = true; toast('Installed. Open "TAKE staff" from the home screen.'); });
  $('#installBtn').hidden = standalone();
  $('#installBtn').onclick = function () {
    if (installEv) { installEv.prompt(); installEv = null; return; }
    var ios = /iPad|iPhone|Macintosh/.test(navigator.userAgent) && 'ontouchend' in document;
    dialog('Install TAKE staff', [['x', ios
      ? 'On the iPad, in Safari: tap the Share button (square with an arrow), then "Add to Home Screen", then Add.'
      : 'In Chrome: open the menu (three dots), then "Cast, save and share", then "Install page as app". On an Android tablet: menu, then "Add to home screen", then Install.', 'note', '']],
      function () { return Promise.resolve(); });
  };
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('/staff-sw.js', { scope: '/staff' }).catch(function () {});
  // the screen never goes dark while the app is open
  var lock = null;
  function keepAwake() {
    if (!('wakeLock' in navigator) || lock) return;
    navigator.wakeLock.request('screen').then(function (l) { lock = l; l.addEventListener('release', function () { lock = null; }); }).catch(function () {});
  }
  document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'visible') { keepAwake(); if (pin) refresh(); } });
  function tick() { var d = new Date(); $('#clock').textContent = ('0' + d.getHours()).slice(-2) + ':' + ('0' + d.getMinutes()).slice(-2); }
  tick(); setInterval(tick, 10000);
  devBar();

  // ---- tabs
  document.querySelectorAll('[data-tab]').forEach(function (b) {
    b.onclick = function () {
      tab = b.getAttribute('data-tab');
      document.querySelectorAll('[data-tab]').forEach(function (x) { x.setAttribute('aria-selected', x === b); });
      document.querySelectorAll('[data-pane]').forEach(function (p) { p.hidden = p.getAttribute('data-pane') !== tab; });
      if (tab === 'map') drawMap(); if (tab === 'today') takings(); if (tab === 'fleet') svcLog(); if (tab === 'calendar') gantt(); if (tab === 'members') members();
    };
  });

  function refresh() {
    api('board').then(function (d) {
      data = d;
      var ids = d.orders.filter(function (o) { return o.status === 'new'; }).map(function (o) { return o.id; });
      var req = d.bookings.filter(function (b) { return ['request', 'pending', 'confirmed'].indexOf(b.status) >= 0; }).map(function (b) { return 'b' + b.id + (b.paid ? 'p' : ''); });
      var now = ids.concat(req);
      // the kitchen screen rings for food only; the till for food and bookings
      var fresh = seen ? now.filter(function (x) { return seen.indexOf(x) < 0 && (MODE !== 'kitchen' || typeof x === 'number'); }) : [];
      if (fresh.length) {
        beep(true); toast(MODE === 'kitchen' ? 'New order' : 'New order or booking');
        setTimeout(function () {
          fresh.forEach(function (x) {
            if (typeof x === 'number') { var o = d.orders.filter(function (y) { return y.id === x; })[0]; if (o) say('New order ' + o.id + ' for ' + o.name + '. ' + o.items.map(function (i) { return i.qty + ' ' + i.name; }).join(', ') + '.'); }
            else { var b = d.bookings.filter(function (y) { return 'b' + y.id === String(x).replace(/p$/, ''); })[0]; if (b) say(String(x).slice(-1) === 'p' ? 'Booking ' + b.id + ' for ' + b.name + ' is paid.' : 'New booking ' + b.id + ' from ' + b.name + '.'); }
          });
        }, 1200);
      }
      seen = now; $('#offline').hidden = true;
      kitchen(); rentals(); fleet(); if (tab === 'map') drawMap(); if (tab === 'calendar') gantt();
    }).catch(function () { $('#offline').hidden = false; });
  }

  // ---- kitchen
  function kitchen() {
    var cols = [['new', 'New'], ['cooking', 'Cooking'], ['ready', 'Ready / on the way']].concat(MODE === 'kitchen' ? [] : [['done', 'Done today']]);
    var mins = function (iso) { return Math.round((Date.now() - new Date(iso.replace(' ', 'T') + 'Z')) / 60000); };
    var next = { new: ['cooking', 'Start cooking'], cooking: ['ready', 'Ready'], ready: ['done', 'Handed over'] };
    var prev = { cooking: ['new', 'New'], ready: ['cooking', 'Cooking'], done: ['ready', 'Ready'] }; // Back: undo the last step
    var nNew = data.orders.filter(function (o) { return o.status === 'new'; }).length;
    $('#bKitchen').hidden = !nNew; $('#bKitchen').textContent = nNew;
    $('#kitchen').innerHTML = cols.map(function (c) {
      var list = data.orders.filter(function (o) { return o.status === c[0]; });
      return '<div class="col"><h3>' + c[1] + ' (' + list.length + ')</h3>' + list.map(function (o) {
        var mode = { dine: 'Eat here' + (o.tbl ? ' · table ' + esc(o.tbl) : ''), pickup: 'Pick up', delivery: 'Delivery' }[o.mode];
        var age = c[0] === 'done' ? 0 : mins(o.created);
        return '<div class="tk' + (age >= 20 ? ' late' : age >= 10 ? ' soon' : '') + '"><header><span>#' + o.id + ' ' + esc(o.name) + '</span><span>' + ago(o.created) + '</span></header>' +
          '<div class="meta">' + mode + (o.address ? ': ' + esc(o.address) : '') + '</div><ul>' + o.items.map(function (i) { return '<li><b>' + i.qty + '×</b> ' + esc(i.name) + '</li>'; }).join('') + '</ul>' +
          (o.note ? '<div class="meta">Note: ' + esc(o.note) + '</div>' : '') + '<div class="meta">' + rp(o.total - (o.discount || 0)) + (o.discount ? ' (points used)' : '') + (o.paid ? ' · <b class="ok">paid · ' + esc(o.pay || '') + '</b>' : o.pay_claimed ? ' · <b class="wait">customer says paid by ' + esc(o.pay) + ': check</b>' : o.pay === 'online' || o.pay === 'test' ? ' · <b class="wait">paying online...</b>' : ' · will pay by ' + esc(o.pay || 'cash')) + (o.member_email ? ' · ★ member' : '') + '</div>' +
          '<div class="acts">' + (next[o.status] ? '<button class="sb go" data-o="' + o.id + '" data-s="' + next[o.status][0] + '">' + next[o.status][1] + '</button>' : '') +
          (o.paid ? (MODE === 'kitchen' ? '' : '<button class="sb back" data-o="' + o.id + '" data-unpaid="1">Not paid</button>') : '<button class="sb" data-o="' + o.id + '" data-paid="1">Paid</button>') +
          '<a class="sb" href="' + telWa(o.wa) + '" target="_blank" rel="noopener">WhatsApp</a>' +
          (o.status === 'new' ? '<button class="sb warn" data-o="' + o.id + '" data-s="cancelled">Cancel</button>' : '') +
          (prev[o.status] ? '<button class="sb back" data-o="' + o.id + '" data-s="' + prev[o.status][0] + '" data-back="' + prev[o.status][1] + '" title="Undo: back to ' + prev[o.status][1] + '">↩ Back</button>' : '') + '</div></div>';
      }).join('') + '</div>';
    }).join('');
    $('#kitchen').querySelectorAll('[data-o]').forEach(function (b) {
      b.onclick = function () {
        var body = b.dataset.paid ? { paid: true, method: askMethod() } : b.dataset.unpaid ? { unpaid: true } : { status: b.dataset.s };
        if (body.paid && !body.method) return;
        if (body.unpaid && !confirm('Order #' + b.dataset.o + ' is marked paid. Undo that?')) return;
        if (b.dataset.back) toast('Order #' + b.dataset.o + ' moved back to ' + b.dataset.back);
        if (body.status === 'cancelled' && !confirm('Cancel this order?')) return;
        api('orders/' + b.dataset.o, 'PATCH', body).then(refresh);
      };
    });
  }

  // ---- rentals
  function rentals() {
    var t = today(), bk = data.bookings;
    var late = function (b) { return b.status === 'out' && b.kind === 'rent' && b.end && b.end < t; };
    var groups = [
      ['Requests and awaiting payment', bk.filter(function (b) { return b.status === 'request' || b.status === 'pending'; })],
      ['Confirmed, to hand over', bk.filter(function (b) { return b.status === 'confirmed'; }).sort(function (a, b) { return (a.start || '').localeCompare(b.start || ''); })],
      ['Out now', bk.filter(function (b) { return b.status === 'out'; }).sort(function (a, b) { return (a.end || '').localeCompare(b.end || ''); })],
      ['Back recently', bk.filter(function (b) { return b.status === 'returned'; })],
    ];
    var nLate = bk.filter(late).length, nReq = bk.filter(function (b) { return b.status === 'request'; }).length;
    $('#bRentals').hidden = !(nLate + nReq); $('#bRentals').textContent = nLate + nReq;
    $('#rentals').innerHTML = groups.map(function (g) {
      return '<div class="col"><h3>' + g[0] + ' (' + g[1].length + ')</h3>' + g[1].map(function (b) {
        var bike = data.bikes.filter(function (x) { return x.id === b.bike_id; })[0];
        var what = b.kind === 'rent' ? bikeName(b.model) : '🚐 ' + esc(b.model);
        var cls = late(b) ? ' late' : (b.status === 'out' && b.end === t) || (b.status === 'confirmed' && b.start <= t) ? ' soon' : '';
        return '<div class="tk' + cls + '"><header><span>#' + b.id + ' ' + esc(b.name) + '</span><span class="pill">' + b.kind + '</span></header>' +
          '<div><b>' + what + '</b>' + (bike ? ' · ' + esc(bike.plate || 'bike ' + bike.id) : '') + '</div>' +
          '<div class="meta">' + esc(b.start) + (b.end ? ' → ' + esc(b.end) : '') + (b.people ? ' · ' + b.people + ' people' : '') + (late(b) ? ' · <b style="color:#ff8a96">OVERDUE</b>' : '') + '</div>' +
          (b.hotel ? '<div class="meta">' + esc(b.hotel) + '</div>' : '') + (b.note ? '<div class="meta">"' + esc(b.note) + '"</div>' : '') +
          '<div class="meta">' + (b.price ? rp(b.price - (b.discount || 0)) : 'no price yet') + (b.deposit ? ' · deposit ' + rp(b.deposit) : '') + (b.paid ? ' · <b class="ok">paid · ' + esc(b.pay || '') + '</b>' : b.pay_claimed ? ' · <b class="wait">customer says paid by ' + esc(b.pay) + ': check</b>' : b.status === 'pending' ? ' · <b class="wait">paying online...</b>' : b.price ? ' · <b class="wait">not paid · ' + esc(b.pay || 'cash') + '</b>' : '') + (b.km_out != null ? ' · km out ' + b.km_out : '') + (b.km_in != null ? ' · in ' + b.km_in : '') + '</div>' +
          (b.kind === 'rent' ? '<div class="meta">' + (b.member_email ? esc(b.member_email) + ' · ' : 'walk-in · ') + (b.docs.length ? b.docs.map(function (d) { return '<button type="button" class="sb" data-doc="' + d.id + '">' + (d.kind === 'passport' ? 'Passport' : 'Licence') + '</button>'; }).join(' ') : (b.member_email ? '<b class="wait">no documents</b>' : 'check documents at the desk')) + '</div>' : '') +
          '<div class="acts">' + acts(b) + '<a class="sb" href="' + telWa(b.wa) + '" target="_blank" rel="noopener">WhatsApp</a></div></div>';
      }).join('') + '</div>';
    }).join('');
    $('#rentals').querySelectorAll('[data-b]').forEach(function (el) { el.onclick = function () { doBooking(+el.dataset.b, el.dataset.a); }; });
    $('#rentals').querySelectorAll('[data-doc]').forEach(function (el) { el.onclick = function () { showDoc(+el.dataset.doc); }; });
  }
  function acts(b) {
    var a = function (act, label, cls) { return '<button type="button" class="sb ' + (cls || '') + '" data-b="' + b.id + '" data-a="' + act + '">' + label + '</button>'; };
    if (b.status === 'pending') return a('cancel', 'Cancel', 'warn');
    if (b.status === 'request') return a('confirm', 'Confirm', 'go') + a('cancel', 'Decline', 'warn');
    var undoPaid = b.paid ? a('unpaid', 'Not paid', 'back') : a('paid', 'Paid');
    if (b.status === 'confirmed') return (b.kind === 'rent' ? a('checkout', 'Hand over bike', 'go') : a('done', 'Trip done', 'go')) + undoPaid + a('cancel', 'Cancel', 'warn') + a('back', '↩ Back', 'back');
    if (b.status === 'out') return (b.kind === 'rent' ? a('checkin', 'Check in', 'go') + a('extend', 'Extend') + a('track', 'Map') : a('done', 'Trip done', 'go')) + undoPaid + a('back', '↩ Back', 'back');
    if (b.status === 'returned') return (b.paid ? a('unpaid', 'Not paid', 'back') : '') + a('back', '↩ Back', 'back');
    return '';
  }
  function doBooking(id, act) {
    var b = data.bookings.filter(function (x) { return x.id === id; })[0];
    var link = location.origin + '/ride?booking=' + b.id + '&t=' + b.token;
    if (act === 'confirm') return dialog('Confirm #' + id, [['price', 'Price (Rp)', 'number', b.price], ['deposit', 'Deposit (Rp)', 'number', b.deposit]], function (v) {
      return api('bookings/' + id, 'PATCH', { status: 'confirmed', price: v.price, deposit: v.deposit }).then(function () {
        window.open(telWa(b.wa) + '?text=' + encodeURIComponent('Hi ' + b.name + ', your TAKE booking #' + id + ' is confirmed' + (v.price ? ': Rp ' + Number(v.price).toLocaleString('id-ID') : '') + '. Your booking: ' + link), '_blank');
      });
    });
    if (act === 'cancel') { if (confirm('Cancel booking #' + id + '?')) api('bookings/' + id, 'PATCH', { status: 'cancelled' }).then(refresh); return; }
    if (act === 'paid') { var pm = askMethod(); if (!pm) return; return api('bookings/' + id, 'PATCH', { paid: true, method: pm }).then(refresh); }
    if (act === 'done') return api('bookings/' + id, 'PATCH', { action: 'checkin' }).then(refresh);
    if (act === 'unpaid') { if (confirm('Booking #' + id + ' is marked paid. Undo that?')) api('bookings/' + id, 'PATCH', { unpaid: true }).then(refresh); return; }
    if (act === 'back') {
      var undo = { confirmed: 'Undo the confirmation? It goes back to Requests.', out: 'Undo the hand-over? The bike becomes available again.', returned: b.kind === 'rent' ? 'Undo the check-in? The bike goes back out with ' + b.name + '.' : 'Undo "trip done"?' }[b.status];
      if (!undo || !confirm('Booking #' + id + ': ' + undo)) return;
      return api('bookings/' + id, 'PATCH', { action: 'back' }).then(function () { toast('Booking #' + id + ' moved back one step'); refresh(); }).catch(function (e) { toast(e.message); });
    }
    if (act === 'extend') return dialog('Extend #' + id, [['end', 'New return date', 'date', b.end], ['price', 'New total price (Rp)', 'number', b.price]], function (v) { return api('bookings/' + id, 'PATCH', { end: v.end, price: v.price }); });
    if (act === 'track') { $('[data-tab=map]').click(); setTimeout(function () { track(id); }, 300); return; }
    if (act === 'checkout') {
      var free = data.bikes.filter(function (x) { return x.status === 'available'; }).sort(function (x, y) { return (x.model === b.model ? 0 : 1) - (y.model === b.model ? 0 : 1); });
      if (!free.length) return toast('No bike is available. Check in or free one in Fleet first.');
      if (!b.paid && !confirm('Booking #' + id + ' is not paid yet. Hand the bike over anyway?')) return;
      return dialog('Hand over #' + id + ': ' + bikeName(b.model), [
        ['bike_id', 'Bike', 'select', free[0].id, free.map(function (x) { return [x.id, bikeName(x.model) + ' · ' + (x.plate || 'no plate') + ' · ' + x.km + ' km']; })],
        ['km', 'Odometer km', 'number', free[0].km], ['fuel', 'Fuel', 'select', 'Full', [['Full', 'Full'], ['3/4', '3/4'], ['1/2', '1/2'], ['1/4', '1/4']]],
        ['price', 'Price (Rp)', 'number', b.price], ['deposit', 'Deposit taken (Rp)', 'number', b.deposit]],
      function (v) { v.action = 'checkout'; return api('bookings/' + id, 'PATCH', v).then(function () { toast('Bike out. Send the renter their link so they can share location if needed.'); }); });
    }
    if (act === 'checkin') {
      var bike = data.bikes.filter(function (x) { return x.id === b.bike_id; })[0] || {};
      return dialog('Check in #' + id, [['km', 'Odometer km', 'number', bike.km], ['fuel', 'Fuel', 'select', 'Full', [['Full', 'Full'], ['3/4', '3/4'], ['1/2', '1/2'], ['1/4', '1/4']]], ['note', 'Damage / notes', 'text', '']],
        function (v) { v.action = 'checkin'; return api('bookings/' + id, 'PATCH', v).then(function () { toast('Checked in' + (b.deposit ? '. Return deposit ' + rp(b.deposit) : '')); }); });
    }
  }
  $('#walkIn').onclick = function () {
    dialog('Walk-in', [['kind', 'Type', 'select', 'rent', [['rent', 'Scooter'], ['transport', 'Driver / tour']]], ['model', 'Scooter model (or destination)', 'select', T.bikes[0].id, T.bikes.map(function (b) { return [b.id, b.name]; }).concat(T.trips.map(function (t) { return [t.name, '🚐 ' + t.name]; }))],
      ['name', 'Name', 'text', ''], ['wa', 'WhatsApp', 'tel', ''], ['hotel', 'Staying at', 'text', ''], ['start', 'From', 'date', today()], ['end', 'Until', 'date', ''], ['price', 'Price (Rp)', 'number', ''], ['deposit', 'Deposit (Rp)', 'number', '']],
    function (v) { return api('bookings', 'POST', v); });
  };

  // ---- fleet
  function fleet() {
    var due = function (x) { return x.km - x.last_service_km >= x.service_every; };
    var n = data.bikes.filter(function (x) { return due(x) || x.status === 'service'; }).length;
    $('#bFleet').hidden = !n; $('#bFleet').textContent = n;
    var out = data.bookings.filter(function (b) { return b.status === 'out'; });
    $('#fleet').innerHTML = '<tr><th>Bike</th><th>Plate</th><th>Status</th><th>Km</th><th>Next service</th><th>With</th><th></th></tr>' + data.bikes.map(function (x) {
      var bk = out.filter(function (b) { return b.bike_id === x.id; })[0];
      var left = x.service_every - (x.km - x.last_service_km);
      return '<tr><td><b>' + bikeName(x.model) + '</b></td><td>' + esc(x.plate || '-') + '</td><td><span class="pill ' + x.status + '">' + x.status + '</span></td><td>' + x.km + '</td>' +
        '<td' + (left <= 0 ? ' style="color:#ff8a96;font-weight:700"' : left < 300 ? ' style="color:var(--gold)"' : '') + '>' + (left <= 0 ? 'DUE now' : 'in ' + left + ' km') + '</td>' +
        '<td>' + (bk ? '#' + bk.id + ' ' + esc(bk.name) + ' until ' + esc(bk.end || '?') : '') + '</td><td><div class="acts">' +
        '<button class="sb" data-k="' + x.id + '" data-a="serviced">Serviced</button>' +
        (x.status === 'available' ? '<button class="sb" data-k="' + x.id + '" data-a="service">To workshop</button>' : x.status === 'service' ? '<button class="sb go" data-k="' + x.id + '" data-a="available">Back on road</button>' : '') +
        '<button class="sb" data-k="' + x.id + '" data-a="edit">Edit</button></div></td></tr>';
    }).join('');
    $('#fleet').querySelectorAll('[data-k]').forEach(function (el) {
      el.onclick = function () {
        var id = +el.dataset.k, x = data.bikes.filter(function (b) { return b.id === id; })[0], a = el.dataset.a;
        if (a === 'service' || a === 'available') return api('bikes/' + id, 'PATCH', { status: a }).then(refresh);
        if (a === 'serviced') return dialog('Service: ' + bikeName(x.model) + ' ' + (x.plate || ''), [['km', 'Odometer km', 'number', x.km], ['what', 'What was done', 'text', 'Oil change'], ['cost', 'Cost (Rp)', 'number', '']], function (v) { v.serviced = true; return api('bikes/' + id, 'PATCH', v).then(svcLog); });
        if (a === 'edit') return dialog('Edit bike', [['plate', 'Plate', 'text', x.plate], ['km', 'Km', 'number', x.km], ['notes', 'Notes', 'text', x.notes || '']], function (v) { return api('bikes/' + id, 'PATCH', v); });
      };
    });
  }
  $('#addBike').onclick = function () {
    dialog('Add bike', [['model', 'Model', 'select', T.bikes[0].id, T.bikes.map(function (b) { return [b.id, b.name]; })], ['plate', 'Plate (DK ...)', 'text', ''], ['km', 'Odometer km', 'number', 0], ['service_every', 'Oil change every (km)', 'number', 2000]],
      function (v) { return api('bikes', 'POST', v); });
  };
  function svcLog() {
    api('maintenance').then(function (r) {
      $('#svc').innerHTML = '<tr><th>Date</th><th>Bike</th><th>Km</th><th>What</th><th>Cost</th></tr>' + r.log.map(function (m) {
        return '<tr><td>' + esc(m.at.slice(0, 10)) + '</td><td>' + bikeName(m.model) + ' ' + esc(m.plate || '') + '</td><td>' + (m.km || '') + '</td><td>' + esc(m.what) + '</td><td>' + rp(m.cost) + '</td></tr>';
      }).join('');
    });
  }

  // ---- documents: fetched with the PIN header, shown in the page, never in a link
  function showDoc(id) {
    fetch('/api/staff/docs/' + id, { headers: { 'x-staff-pin': pin } }).then(function (r) { if (!r.ok) throw new Error(r.status); return r.blob(); }).then(function (bl) {
      var u = URL.createObjectURL(bl), f = $('#dlgForm');
      f.innerHTML = (bl.type === 'application/pdf' ? '<iframe src="' + u + '" style="width:100%;height:70vh;border:0"></iframe>' : '<img src="' + u + '" alt="Document" style="width:100%;border-radius:12px">') +
        '<div class="row"><button class="btn btn-ghost" type="button" id="dlgX">Close</button></div>';
      $('#dlg').hidden = false;
      $('#dlgX').onclick = function () { $('#dlg').hidden = true; URL.revokeObjectURL(u); };
    }).catch(function () { toast('Could not open the document.'); });
  }

  // ---- fleet calendar: one row of free counts per model, then its bookings as bars
  var calFrom = null;
  function gantt() {
    if (!calFrom) { var d0 = new Date(); d0.setDate(d0.getDate() - 2); calFrom = d0.toISOString().slice(0, 10); }
    api('calendar?from=' + calFrom + '&days=21').then(function (c) {
      var days = c.models[Object.keys(c.models)[0]] ? c.models[Object.keys(c.models)[0]].days.map(function (d) { return d.date; }) : [];
      if (!days.length) { $('#gantt').innerHTML = '<tr><td>Add bikes in Fleet first.</td></tr>'; return; }
      var head = '<tr><th>Scooter</th>' + days.map(function (d) { var dt = new Date(d + 'T00:00:00Z'); return '<th class="' + (d === c.today ? 'is-today' : '') + '">' + ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'][dt.getUTCDay()] + '<br>' + dt.getUTCDate() + '</th>'; }).join('') + '</tr>';
      var rows = Object.keys(c.models).map(function (mid) {
        var m = c.models[mid];
        var top = '<tr class="g-model"><th>' + esc(bikeName(mid)) + ' <small>' + m.total + ' bike' + (m.total === 1 ? '' : 's') + '</small></th>' + m.days.map(function (d) {
          return '<td class="' + (d.free < 1 ? 'g-full' : d.free === 1 ? 'g-last' : 'g-free') + (d.date === c.today ? ' is-today' : '') + '">' + d.free + '</td>';
        }).join('') + '</tr>';
        var bars = c.bookings.filter(function (b) { return b.model === mid; }).map(function (b) {
          var bike = c.bikes.filter(function (x) { return x.id === b.bike_id; })[0];
          var cells = '', i = 0;
          while (i < days.length) {
            var d = days[i], on = b.start <= d && (d < b.end || (b.status === 'out' && b.end <= c.today && d <= c.today));
            if (!on) { cells += '<td' + (d === c.today ? ' class="is-today"' : '') + '></td>'; i++; continue; }
            var span = 0; while (i + span < days.length && (b.start <= days[i + span] && (days[i + span] < b.end || (b.status === 'out' && b.end <= c.today && days[i + span] <= c.today)))) span++;
            var late = b.status === 'out' && b.end <= c.today;
            cells += '<td colspan="' + span + '"><button type="button" class="g-bar s-' + (late ? 'late' : b.status) + (b.paid ? ' paid' : '') + '" data-gb="' + b.id + '">#' + b.id + ' ' + esc(b.name || '') + (bike ? ' · ' + esc(bike.plate || '') : '') + (late ? ' · LATE' : '') + '</button></td>';
            i += span;
          }
          return '<tr class="g-row"><th></th>' + cells + '</tr>';
        }).join('');
        return top + bars;
      }).join('');
      $('#gantt').innerHTML = head + rows;
      $('#gantt').querySelectorAll('[data-gb]').forEach(function (el) {
        el.onclick = function () { $('[data-tab=rentals]').click(); setTimeout(function () { var t = document.querySelector('[data-b="' + el.dataset.gb + '"]'); if (t) { t.closest('.tk').scrollIntoView({ block: 'center' }); t.closest('.tk').classList.add('flash'); } }, 200); };
      });
    }).catch(function (e) { toast(e.message); });
  }
  var shiftCal = function (n) { var d = new Date(calFrom + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + n); calFrom = d.toISOString().slice(0, 10); gantt(); };
  $('#calPrev').onclick = function () { shiftCal(-14); };
  $('#calNext').onclick = function () { shiftCal(14); };
  $('#calToday').onclick = function () { calFrom = null; gantt(); };

  // ---- members and points
  function members() {
    api('members').then(function (r) {
      $('#members').innerHTML = '<tr><th>Member</th><th>WhatsApp</th><th>Points</th><th>Rider details</th><th>Since</th><th></th></tr>' + r.members.map(function (m) {
        var ok = m.docs >= r.required && m.terms_version === r.termsVersion;
        return '<tr><td><b>' + esc(m.name || '-') + '</b><br><small class="mute">' + esc(m.email) + '</small></td><td>' + (m.wa ? '<a href="' + telWa(m.wa) + '" target="_blank" rel="noopener">' + esc(m.wa) + '</a>' : '-') + '</td>' +
          '<td><b>' + m.points + '</b></td><td>' + (ok ? '<span class="pill available">ready</span>' : '<span class="pill">' + m.docs + '/' + r.required + ' docs' + (m.terms_version === r.termsVersion ? '' : ', terms') + '</span>') + '</td>' +
          '<td>' + esc(m.created.slice(0, 10)) + '</td><td><button class="sb" type="button" data-pts="' + m.id + '">Points</button></td></tr>';
      }).join('');
      $('#members').querySelectorAll('[data-pts]').forEach(function (el) {
        el.onclick = function () { dialog('Add or take away points', [['delta', 'Points (e.g. 20 or -20)', 'number', ''], ['reason', 'Reason', 'text', '']], function (v) { return api('members/' + el.dataset.pts + '/points', 'POST', v).then(members); }); };
      });
    }).catch(function (e) { toast(e.message); });
  }

  // ---- map
  function drawMap() {
    if (!window.L) return;
    if (!map) {
      map = L.map('map').setView([-8.6481, 115.1481], 13);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '&copy; OpenStreetMap' }).addTo(map);
      L.marker([-8.6481201, 115.1481354]).addTo(map).bindPopup('TAKE shop');
      layer = L.layerGroup().addTo(map);
    }
    setTimeout(function () { map.invalidateSize(); }, 50);
    layer.clearLayers();
    data.last.forEach(function (p) {
      var b = data.bookings.filter(function (x) { return x.id === p.booking_id; })[0]; if (!b) return;
      L.circleMarker([p.lat, p.lng], { radius: 9, color: '#ff5a6e', fillOpacity: .9 }).addTo(layer)
        .bindPopup('<b>#' + b.id + ' ' + esc(b.name) + '</b><br>' + bikeName(b.model) + '<br>' + ago(p.at) + ' ago<br><a href="https://maps.google.com/?q=' + p.lat + ',' + p.lng + '" target="_blank">Directions</a>');
    });
  }
  function track(id) {
    api('pings/' + id).then(function (r) {
      if (!r.pings.length) return toast('This renter has not shared a location.');
      var pts = r.pings.map(function (p) { return [p.lat, p.lng]; });
      L.polyline(pts, { color: '#f2c14e' }).addTo(layer); map.fitBounds(pts, { maxZoom: 16, padding: [30, 30] });
    });
  }

  // ---- today
  $('#day').value = today(); $('#day').onchange = takings;
  function takings() {
    api('takings?day=' + $('#day').value).then(function (r) {
      var out = data.bookings.filter(function (b) { return b.status === 'out'; }).length;
      var free = data.bikes.filter(function (b) { return b.status === 'available'; }).length;
      $('#kpis').innerHTML = '<div><b>' + rp(r.food.s) + '</b><span>Food · ' + r.food.n + ' orders</span></div><div><b>' + rp(r.rentals.s) + '</b><span>Rentals handed over · ' + r.rentals.n + '</span></div>' +
        '<div><b>' + out + '</b><span>Bikes out now</span></div><div><b>' + free + ' / ' + data.bikes.length + '</b><span>Bikes free now</span></div>';
    });
  }

  // ---- generic dialog
  function dialog(title, fields, submit) {
    var f = $('#dlgForm');
    f.innerHTML = '<h3>' + esc(title) + '</h3>' + fields.map(function (x) {
      var v = x[3] == null ? '' : x[3];
      if (x[2] === 'note') return '<p class="mute" style="font-size:16px;line-height:1.5">' + esc(x[1]) + '</p>';
      return '<label>' + x[1] + (x[2] === 'select' ? '<select name="' + x[0] + '">' + x[4].map(function (o) { return '<option value="' + esc(o[0]) + '"' + (String(o[0]) === String(v) ? ' selected' : '') + '>' + esc(o[1]) + '</option>'; }).join('') + '</select>'
        : '<input name="' + x[0] + '" type="' + x[2] + '" value="' + esc(v) + '">') + '</label>';
    }).join('') + '<div class="row"><button class="btn btn-green" type="submit">Save</button><button class="btn btn-ghost" type="button" id="dlgX">Close</button></div><p class="form-note" id="dlgNote"></p>';
    $('#dlg').hidden = false;
    $('#dlgX').onclick = function () { $('#dlg').hidden = true; };
    f.onsubmit = function (e) {
      e.preventDefault();
      var v = Object.fromEntries(new FormData(f));
      Promise.resolve(submit(v)).then(function () { $('#dlg').hidden = true; refresh(); }).catch(function (err) { $('#dlgNote').textContent = err.message; });
    };
  }

  if (pin) api('login').then(start).catch(function () {});
  // Which way did the money come? Kept per order, and summed in the takings.
  function askMethod() {
    var a = prompt('Paid how? Type 1, 2, 3 or 4\n1 Cash\n2 QRIS\n3 Bank transfer\n4 Card at the counter', '1');
    return a == null ? null : ({ 1: 'cash', 2: 'qris', 3: 'transfer', 4: 'card' })[String(a).trim()] || 'cash';
  }
})();
