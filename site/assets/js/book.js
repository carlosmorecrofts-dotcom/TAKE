// TAKE scooter booking: pick a model, see the days it is free on a calendar,
// tap pick-up and return days, then book. Signed-in members with their rider
// details done pay in advance (or send a request while online payment is off).
(function () {
  var host = document.getElementById('bookApp');
  if (!host) return;
  var T = window.TAKE, M = function () { return window.TAKE_MEMBER || {}; };
  var $ = function (s, r) { return (r || host).querySelector(s); };
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
  var k = function (n) { return n == null ? '?' : n / 1000 + 'K'; };
  var rp = function (n) { return 'Rp ' + Number(n || 0).toLocaleString('id-ID'); };
  var DAY = 864e5;
  var iso = function (d) { return new Date(d.getTime() - d.getTimezoneOffset() * 6e4).toISOString().slice(0, 10); };
  var parse = function (s) { var p = s.split('-'); return new Date(+p[0], +p[1] - 1, +p[2]); };
  var nights = function (a, b) { return Math.round((parse(b) - parse(a)) / DAY); };
  var MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

  var S = { pay: 'cash', model: (T.bikes.filter(function (b) { return b.day; })[0] || T.bikes[0]).id, month: null, avail: {}, total: null, start: null, end: null, msg: '', busy: false, usePoints: false };
  var now = new Date(); S.month = new Date(now.getFullYear(), now.getMonth(), 1);
  var two = function () { return window.innerWidth >= 900; };

  function load() {
    var from = iso(S.month), n = two() ? 62 : 31;
    $('.cal-wrap') && $('.cal-wrap').classList.add('loading');
    return fetch('/api/availability?model=' + encodeURIComponent(S.model) + '&from=' + from + '&days=' + n)
      .then(function (r) { return r.json().then(function (d) { if (!r.ok || !d.days) throw new Error(d.error || r.status); return d; }); })
      .then(function (d) { S.total = d.total; d.days.forEach(function (x) { S.avail[S.model + x.date] = x; }); draw(); })
      .catch(function (e) { if (/database not bound/.test(e.message)) return offline(); S.msg = 'Could not load the calendar. Check your connection and try again.'; draw(); });
  }
  var day = function (date) { return S.avail[S.model + date]; };

  function bike() { return T.bikes.filter(function (b) { return b.id === S.model; })[0]; }
  // same rule as the server (functions/api/_lib.js rentPrice)
  function price() {
    var b = bike(); if (!(S.start && S.end && b.day)) return null;
    var n = nights(S.start, S.end);
    if (!b.week || n < 7) return b.day * n;
    return Math.min(Math.floor(n / 7) * b.week + (n % 7) * b.day, Math.ceil(n / 7) * b.week);
  }

  function monthHtml(first) {
    var y = first.getFullYear(), mo = first.getMonth(), lead = (first.getDay() + 6) % 7, len = new Date(y, mo + 1, 0).getDate();
    var cells = '';
    for (var i = 0; i < lead; i++) cells += '<span class="cd empty"></span>';
    for (var d = 1; d <= len; d++) {
      var date = iso(new Date(y, mo, d)), a = day(date), cls = 'cd', label = '', attrs = '';
      if (!a) { cls += ' unknown'; }
      else if (a.past) { cls += ' past'; }
      else if (a.free < 1) { cls += ' full'; label = 'Booked'; }
      else { cls += a.free === 1 ? ' last' : ' free'; label = a.free === 1 ? 'Last one' : a.free + ' left'; attrs = ' data-d="' + date + '"'; }
      if (S.start && date === S.start) cls += ' sel start';
      if (S.end && date === S.end) cls += ' sel end';
      if (S.start && S.end && date > S.start && date < S.end) cls += ' in-range';
      // the return day may be fully booked from that day on: the bike comes back that morning
      if (S.start && !S.end && a && !a.past && a.free < 1 && date > S.start && rangeOk(S.start, date)) { cls += ' can-return'; attrs = ' data-d="' + date + '"'; label = 'Return'; }
      cells += '<button type="button" class="' + cls + '"' + attrs + (attrs ? '' : ' disabled') + ' aria-label="' + date + (label ? ', ' + label : '') + '"><b>' + d + '</b>' + (label ? '<small>' + label + '</small>' : '') + '</button>';
    }
    return '<div class="cal-month"><h4>' + MONTHS[mo] + ' ' + y + '</h4><div class="cal-week"><span>Mo</span><span>Tu</span><span>We</span><span>Th</span><span>Fr</span><span>Sa</span><span>Su</span></div><div class="cal-grid">' + cells + '</div></div>';
  }
  // every night from pick-up to the night before return needs a free bike
  // before the booking system is switched on: say so, and book on WhatsApp
  function offline() {
    host.innerHTML = '<h3>Online booking opens soon</h3><p class="mute">Until then, WhatsApp us the scooter and dates you want and we confirm straight away.</p>' +
      '<div class="row" style="margin-top:16px"><a class="btn btn-green" href="https://wa.me/' + T.wa.ride + '?text=' + encodeURIComponent('Hi TAKE, I would like to rent a scooter.') + '" target="_blank" rel="noopener">Book on WhatsApp</a><a class="btn btn-ghost" href="/terms">Rental terms</a></div>';
  }
  function rangeOk(a, b) {
    for (var t = parse(a).getTime(); t < parse(b).getTime(); t += DAY) { var x = day(iso(new Date(t))); if (!x || x.free < 1 || x.past) return false; }
    return true;
  }

  function draw() {
    var b = bike(), me = M().data, cfg = M().config || {}, p = price(), n = S.start && S.end ? nights(S.start, S.end) : 0;
    var L = T.loyalty, canPts = me && me.points >= L.redeemPoints && p;
    var second = new Date(S.month.getFullYear(), S.month.getMonth() + 1, 1);
    var prevOk = S.month > new Date(now.getFullYear(), now.getMonth(), 1);
    var none = S.total === 0;
    host.innerHTML =
      '<div class="bk-models" role="radiogroup" aria-label="Scooter">' + T.bikes.map(function (x) {
        return '<button type="button" role="radio" aria-checked="' + (x.id === S.model) + '" data-m="' + x.id + '"><b>' + esc(x.name.replace(/^(Honda|Yamaha) /, '')) + '</b><small>' + x.cc + 'cc · ' + k(x.day) + '</small></button>';
      }).join('') + '</div>' +
      '<div class="cal-nav"><button type="button" class="sb" data-nav="-1"' + (prevOk ? '' : ' disabled') + ' aria-label="Earlier month">&larr;</button><b>' + esc(b.name) + '</b><button type="button" class="sb" data-nav="1" aria-label="Later month">&rarr;</button></div>' +
      (none ? '<p class="m-msg">This model is not in the fleet right now. Try another one.</p>' : '') +
      '<div class="cal-wrap">' + monthHtml(S.month) + (two() ? monthHtml(second) : '') + '</div>' +
      '<div class="cal-legend"><span class="lg free"></span>Free <span class="lg last"></span>Last one <span class="lg full"></span>Booked <span class="lg sel"></span>Your dates</div>' +
      '<p class="cal-hint">' + esc(S.msg || (!S.start ? 'Tap your pick-up day.' : !S.end ? 'Now tap your return day.' : '')) + '</p>' +
      '<div class="bk-sum' + (S.end ? ' ready' : '') + '">' +
        '<div><b>' + (S.end ? esc(S.start) + ' to ' + esc(S.end) : 'Choose dates') + '</b><small>' + (n ? n + ' day' + (n > 1 ? 's' : '') + (b.week && n >= 7 ? ', week rate ' + k(b.week) : ' × ' + k(b.day)) : 'Pick-up and return at the shop, 7am to 8pm') + '</small></div>' +
        '<div class="bk-price">' + (p ? rp(p - (S.usePoints && canPts ? Math.min(L.redeemValue, p) : 0)) : n ? 'Price on WhatsApp' : '') + '</div>' +
      '</div>' +
      (canPts && S.end ? '<label class="m-agree"><input type="checkbox" id="bkPts"' + (S.usePoints ? ' checked' : '') + '> Use ' + L.redeemPoints + ' points (Rp ' + k(L.redeemValue) + ' off). You have ' + me.points + '.</label>' : '') +
      (S.end ? '<label class="bk-field">Where are you staying? (optional)<input id="bkHotel" placeholder="Villa name or area"></label><div class="pay-pick" id="bkPay"></div>' : '') +
      '<button type="button" class="btn btn-green bk-go" id="bkGo"' + (S.end && !S.busy ? '' : ' disabled') + '>' +
        (S.busy ? 'One moment...' : !me ? 'Sign in to book' : !M().ready() ? 'Add rider details to book' : S.payOnline && p ? 'Book and pay ' + rp(p - (S.usePoints && canPts ? Math.min(L.redeemValue, p) : 0)) : 'Send booking request') + '</button>' +
      '<p class="form-note">' + (S.payOnline ? 'We hold the scooter for 30 minutes while you pay. ' : 'We confirm on WhatsApp; you pay as you chose above. ') + '<a href="/terms">Rental terms</a></p>';
    host.querySelectorAll('[data-m]').forEach(function (x) { x.onclick = function () { S.model = x.dataset.m; S.start = S.end = null; S.msg = ''; load(); }; });
    host.querySelectorAll('[data-nav]').forEach(function (x) { x.onclick = function () { S.month = new Date(S.month.getFullYear(), S.month.getMonth() + +x.dataset.nav, 1); load(); }; });
    host.querySelectorAll('[data-d]').forEach(function (x) { x.onclick = function () { pick(x.dataset.d); }; });
    var pts = $('#bkPts'); if (pts) pts.onchange = function () { S.usePoints = pts.checked; draw(); };
    var bp = $('#bkPay');
    if (bp && window.TAKE_PAY) {
      if (!TAKE_PAY.methods.length) TAKE_PAY.load(cfg);
      TAKE_PAY.picker(bp, S.pay);
      bp.onchange = function () { S.pay = TAKE_PAY.chosen(bp); var m = TAKE_PAY.find(S.pay); S.payOnline = !!(m && m.online); draw(); };
    }
    $('#bkGo').onclick = go;
  }

  function pick(date) {
    S.msg = '';
    if (!S.start || S.end || date <= S.start) { S.start = date; S.end = null; }
    else if (!rangeOk(S.start, date)) { S.msg = 'Sorry, it is booked on a day in between. Choose a shorter stay or another scooter.'; }
    else S.end = date;
    draw();
  }

  function save() { try { localStorage.setItem('take_pending_booking', JSON.stringify({ model: S.model, start: S.start, end: S.end, at: Date.now() })); } catch (e) {} }
  function forget() { try { localStorage.removeItem('take_pending_booking'); } catch (e) {} }

  function go() {
    var m = M();
    if (!m.data) { save(); m.open(null, { next: '/ride', message: 'Sign in to book your scooter. Your dates are kept.' }); return; }
    if (!m.ready()) { save(); m.open('rider', { onDone: go, message: 'Before your first rental we need a few rider details.' }); return; }
    S.busy = true; draw();
    var hotel = $('#bkHotel') ? $('#bkHotel').value : '';
    fetch('/api/bookings', { method: 'POST', credentials: 'same-origin', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ kind: 'rent', model: S.model, start: S.start, end: S.end, hotel: hotel, usePoints: S.usePoints, pay: S.pay }) })
      .then(function (r) { return r.json().then(function (j) { return { ok: r.ok, j: j }; }); })
      .then(function (x) {
        S.busy = false;
        if (!x.ok) {
          if (x.j.need === 'signin') { m.data = null; return go(); }
          if (x.j.need === 'rider') return m.refresh().then(go);
          S.msg = x.j.error || 'Something went wrong.'; S.start = S.end = null; return load();
        }
        forget();
        try { localStorage.setItem('take_last_booking', location.origin + '/ride?booking=' + x.j.id + '&t=' + x.j.token); } catch (e) {}
        if (x.j.pay_url) location.href = x.j.pay_url;
        else location.href = '/ride?booking=' + x.j.id + '&t=' + x.j.token;
      })
      .catch(function () { S.busy = false; S.msg = 'Could not reach us. Check your connection and try again.'; draw(); });
  }

  // "Book this one" on a scooter card
  document.addEventListener('take:pick', function (e) { S.model = e.detail; S.start = S.end = null; load(); });
  // back from the email sign-in with dates chosen before: carry on
  document.addEventListener('take:member-ready', function () {
    var pb = null; try { pb = JSON.parse(localStorage.getItem('take_pending_booking') || 'null'); } catch (e) {}
    if (pb && Date.now() - pb.at < 3600e3 && M().data) {
      S.model = pb.model; S.start = pb.start; S.end = pb.end; S.month = new Date(parse(pb.start).getFullYear(), parse(pb.start).getMonth(), 1);
      load().then(function () { document.getElementById('book').scrollIntoView(); if (!M().ready()) M().open('rider', { onDone: go, message: 'You are signed in. A few rider details and your scooter is booked.' }); });
    } else draw();
  });
  var w = two(); window.addEventListener('resize', function () { if (two() !== w) { w = two(); load(); } });
  load();
})();
