// TAKE customer side: the two variants, menu + cart + order, scooter and driver
// booking, and the status page for an order or booking (with location sharing).
(function () {
  var T = window.TAKE, $ = function (s, r) { return (r || document).querySelector(s); };
  var root = document.documentElement;
  var rp = function (n) { return n == null ? null : 'Rp ' + n.toLocaleString('id-ID'); };
  var k = function (n) { return n == null ? null : n / 1000 + 'K'; };
  var addTag = function (w) { return '<span class="add">[ADD: ' + w + ']</span>'; };
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
  var wa = function (num, text) { window.open('https://wa.me/' + num + '?text=' + encodeURIComponent(text), '_blank', 'noopener'); };

  function api(path, opts) {
    return fetch('/api/' + path, Object.assign({ headers: { 'content-type': 'application/json' } }, opts || {}))
      .then(function (r) { return r.json().then(function (j) { if (!r.ok) throw new Error(j.error || r.status); return j; }); });
  }

  // ---- variant + menu button
  // The switch is two real links (/ and /ride, each its own page for search
  // engines). On a click we swap in place instead of reloading.
  function setVariant(v, push) {
    root.dataset.v = v;
    document.querySelectorAll('.vswitch a').forEach(function (a) {
      var on = a.getAttribute('data-to') === v;
      if (on) { a.setAttribute('aria-current', 'page'); document.title = a.getAttribute('data-title') || document.title; } else a.removeAttribute('aria-current');
      if (on && push) history.pushState({ v: v }, '', a.getAttribute('href'));
    });
  }
  window.addEventListener('popstate', function () { setVariant(location.pathname.indexOf('/ride') === 0 ? 'ride' : 'eat'); });
  document.querySelectorAll('.vswitch a').forEach(function (b) {
    b.addEventListener('click', function (e) {
      if (e.ctrlKey || e.metaKey || e.shiftKey) return;
      e.preventDefault();
      var v = b.getAttribute('data-to');
      if (root.dataset.v === v) return;
      setVariant(v, true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      window.dispatchEvent(new Event('scroll'));
    });
  });
  var nav = $('.nav'), burger = $('.burger');
  if (burger) burger.addEventListener('click', function () {
    var open = nav.classList.toggle('open'); burger.setAttribute('aria-expanded', open ? 'true' : 'false');
  });
  document.querySelectorAll('#menu a').forEach(function (a) { a.addEventListener('click', function () { nav.classList.remove('open'); }); });

  // ---- menu and cart
  var cart = {};
  try { cart = JSON.parse(localStorage.getItem('take_cart') || '{}'); } catch (e) {}
  var byId = {}; T.menu.forEach(function (i) { byId[i.id] = i; });
  var cats = [];
  T.menu.forEach(function (i) { if (cats.indexOf(i.cat) < 0) cats.push(i.cat); });
  var curCat = 'All';

  function save() { try { localStorage.setItem('take_cart', JSON.stringify(cart)); } catch (e) {} }
  function renderCats() {
    var el = $('#menuCats'); if (!el) return;
    el.innerHTML = ['All'].concat(cats).map(function (c) { return '<button type="button" aria-pressed="' + (c === curCat) + '">' + c + '</button>'; }).join('');
    el.querySelectorAll('button').forEach(function (b) { b.onclick = function () { curCat = b.textContent; renderCats(); renderMenu(); }; });
  }
  function renderMenu() {
    var el = $('#menuGrid'); if (!el) return;
    el.innerHTML = T.menu.filter(function (i) { return curCat === 'All' || i.cat === curCat; }).map(function (i) {
      var q = cart[i.id] || 0;
      return '<div class="card dish' + (i.img ? ' has-img' : '') + '"><span class="dish-no" aria-label="Number ' + i.no + '">' + i.no + '</span>' + (i.img ? '<div class="dish-pic"><img class="dish-img" src="/assets/img/' + i.img + '" alt="' + esc(i.name) + (i.ex ? ' (example photo)' : ' at TAKE') + '" loading="lazy">' + (i.ex ? (i.ex.source ? '<a class="ex-tag" href="' + i.ex.source + '" target="_blank" rel="noopener" title="Photo: ' + esc(i.ex.author) + ', ' + esc(i.ex.licence) + '">Example photo</a>' : '<span class="ex-tag" title="' + esc(i.ex.author) + '">Example photo</span>') : '') + '</div>' : '') +
        '<div class="dish-body"><span class="label">' + i.cat + '</span><h3>' + esc(i.name) + '</h3>' + (i.desc ? '<p class="dish-desc">' + esc(i.desc) + '</p>' : '') + '<span class="price">' +
        (i.price ? k(i.price) : 'Price at the counter') + '</span></div><div class="qty" data-id="' + i.id + '">' +
        (q ? '<button type="button" class="minus" aria-label="One less ' + esc(i.name) + '">&minus;</button><b>' + q + '</b>' : '') +
        '<button type="button" class="plus" aria-label="Add ' + esc(i.name) + '">+</button></div></div>';
    }).join('');
    el.querySelectorAll('.qty').forEach(function (q) {
      var id = q.getAttribute('data-id');
      q.querySelector('.plus').onclick = function () { cart[id] = (cart[id] || 0) + 1; changed(); };
      var m = q.querySelector('.minus'); if (m) m.onclick = function () { cart[id] = (cart[id] || 0) - 1; if (cart[id] <= 0) delete cart[id]; changed(); };
    });
  }
  function totals() {
    var n = 0, sum = 0, unpriced = 0;
    Object.keys(cart).forEach(function (id) { if (!byId[id]) { delete cart[id]; return; } n += cart[id]; if (byId[id].price) sum += byId[id].price * cart[id]; else unpriced++; });
    return { n: n, sum: sum, unpriced: unpriced };
  }
  function renderCart() {
    var t = totals(), list = $('#cartList'); if (!list) return;
    list.innerHTML = t.n ? Object.keys(cart).map(function (id) {
      var i = byId[id]; return '<li>' + cart[id] + ' × ' + i.no + '. ' + esc(i.name) + '<em>' + (i.price ? k(i.price * cart[id]) : 'at counter') + '</em></li>';
    }).join('') : '<li class="mute">Nothing yet. Tap a dish above.</li>';
    $('#cartSum').textContent = rp(t.sum) + (t.unpriced ? ' + drinks' : '');
    var fab = $('#cartFab'); fab.hidden = !t.n;
    $('#cartCount').textContent = t.n; $('#cartTotal').textContent = k(t.sum) || '';
  }
  function changed() { save(); renderMenu(); renderCart(); }
  var fab = $('#cartFab'); if (fab) fab.onclick = function () { $('#order').scrollIntoView({ behavior: 'smooth' }); };

  var of = $('#orderForm');
  if (of) {
    var modeSync = function () {
      var m = of.querySelector('[name=mode]:checked').value;
      of.querySelector('.if-delivery').hidden = m !== 'delivery';
      of.querySelector('.if-dine').hidden = m !== 'dine';
      of.address.required = m === 'delivery';
    };
    of.querySelectorAll('[name=mode]').forEach(function (r) { r.onchange = modeSync; }); modeSync();
    // pay online and points appear only when they can work
    document.addEventListener('take:member-ready', function () {
      var m = window.TAKE_MEMBER || {}, cfg = m.config || {}, me = m.data, L = T.loyalty;
      if (window.TAKE_PAY) { TAKE_PAY.load(cfg); TAKE_PAY.picker($('#paySeg'), 'cash'); }
      var pr = $('#ptsRow');
      if (pr && me && me.points >= L.redeemPoints) { pr.hidden = false; pr.querySelector('span').textContent = 'Use ' + L.redeemPoints + ' points (Rp ' + k(me.pointValue || L.redeemValue) + ' off). You have ' + me.points + '.'; }
      if (me) { if (!of.name.value) of.name.value = me.member.name || ''; if (!of.wa.value) of.wa.value = me.member.wa || ''; }
    });
    of.addEventListener('submit', function (e) {
      e.preventDefault();
      var t = totals(), note = $('#orderNote');
      if (!t.n) { note.textContent = 'Your order is empty. Tap + on a dish first.'; $('#menu-list').scrollIntoView({ behavior: 'smooth' }); return; }
      var d = Object.fromEntries(new FormData(of));
      d.items = Object.keys(cart).map(function (id) { return { id: id, qty: cart[id] }; });
      d.usePoints = !!(of.usePoints && of.usePoints.checked);
      d.pay = (window.TAKE_PAY && TAKE_PAY.chosen($('#paySeg'))) || 'cash';
      var label = { dine: 'Eat here' + (d.tbl ? ' (table ' + d.tbl + ')' : ''), pickup: 'Pick up', delivery: 'Delivery to: ' + d.address }[d.mode];
      var text = function (id) {
        return ['TAKE order' + (id ? ' #' + id : ''), Object.keys(cart).map(function (x) { return cart[x] + ' x ' + byId[x].name; }).join('\n'),
          'Total: ' + rp(t.sum) + (t.unpriced ? ' + drinks' : ''), label, 'Name: ' + d.name, d.note ? 'Note: ' + d.note : ''].filter(Boolean).join('\n');
      };
      var btn = of.querySelector('button[type=submit]'); btn.disabled = true; note.textContent = 'Sending...';
      api('orders', { method: 'POST', body: JSON.stringify(d) }).then(function (r) {
        var link = location.origin + '/?order=' + r.id + '&t=' + r.token;
        try { localStorage.setItem('take_last_order', link); } catch (x) {}
        cart = {}; save(); renderMenu(); renderCart(); of.reset(); modeSync();
        if (r.pay_url) { location.href = r.pay_url; return; }   // the staff app shows it at once
        wa(T.wa.eat, text(r.id) + '\nPayment: ' + ((window.TAKE_PAY && TAKE_PAY.find(d.pay)) || { name: d.pay }).name + '\nFollow: ' + link);
        location.href = link;
      }).catch(function (err) {
        note.textContent = 'Could not reach our system (' + err.message + '). We opened WhatsApp instead: just press send.';
        wa(T.wa.eat, text());
      }).then(function () { btn.disabled = false; });
    });
  }

  // ---- fleet and scooter booking
  var free = {};
  function renderFleet() {
    var el = $('#fleetGrid'); if (!el) return;
    el.innerHTML = T.bikes.map(function (b) {
      var f = free[b.id], av = f == null ? '' : f.free > 0 ? '<span class="avail ok">' + f.free + ' free now</span>' : '<span class="avail no">All out right now: book ahead</span>';
      var r = function (n, w) { return '<div><b>' + (n ? k(n) : '?') + '</b>' + w + '</div>'; };
      var ph = (T.bikePhotos || {})[b.id];
      return '<div class="card bike">' + (ph ? '<img class="bike-img" src="/assets/img/' + ph.file + '" alt="" loading="lazy">' + (ph.source ? '<a class="bike-credit" href="' + ph.source + '" target="_blank" rel="noopener" title="' + esc(ph.title) + '">Photo: ' + esc(ph.author) + ', ' + esc(ph.licence) + '</a>' : '') : '') +
        '<span class="label">' + b.cc + 'cc · ' + b.kind + '</span><h3>' + esc(b.name) + '</h3>' + av +
        '<div class="rates">' + r(b.day, 'day') + r(b.week, 'week') + r(b.month, 'month') + '</div>' +
        (b.day ? '' : '<p class="mute" style="font-size:13px">' + addTag('day, week, month price') + '</p>') +
        '<a class="more" href="#book" data-pick="' + b.id + '">Book this one →</a></div>';
    }).join('');
    el.querySelectorAll('[data-pick]').forEach(function (a) { a.onclick = function () { document.dispatchEvent(new CustomEvent('take:pick', { detail: a.getAttribute('data-pick') })); }; });
  }
  var rf = $('#rentForm');
  function quote() {
    if (!rf) return;
    var b = T.bikes.filter(function (x) { return x.id === rf.model.value; })[0], q = $('#rentQuote');
    var s = rf.start.value, e = rf.end.value;
    if (!b || !s || !e) { q.textContent = ''; return; }
    var days = Math.round((new Date(e) - new Date(s)) / 864e5);
    if (days < 1) { q.textContent = 'Return date must be after pick-up.'; return; }
    if (!b.day) { q.textContent = days + ' day' + (days > 1 ? 's' : '') + '. We confirm the price on WhatsApp.'; return; }
    var price = days >= 28 && b.month ? Math.ceil(days / 30) * b.month : days >= 7 && b.week ? Math.floor(days / 7) * b.week + (days % 7) * b.day : days * b.day;
    q.textContent = days + ' day' + (days > 1 ? 's' : '') + ': about ' + rp(price);
  }
  if (rf) {
    rf.model.innerHTML = T.bikes.map(function (b) { return '<option value="' + b.id + '">' + esc(b.name) + ' (' + b.cc + 'cc)</option>'; }).join('');
    var today = new Date().toISOString().slice(0, 10);
    rf.start.min = rf.end.min = today; rf.start.value = today;
    var tm = new Date(Date.now() + 864e5).toISOString().slice(0, 10); rf.end.value = tm;
    ['model', 'start', 'end'].forEach(function (n) { rf[n].addEventListener('change', function () { if (n === 'start' && rf.end.value <= rf.start.value) rf.end.value = new Date(new Date(rf.start.value).getTime() + 864e5).toISOString().slice(0, 10); rf.end.min = rf.start.value; quote(); }); });
    quote();
    rf.addEventListener('submit', function (e) { e.preventDefault(); book(rf, 'rent', $('#rentNote')); });
  }
  var tf = $('#tripForm');
  if (tf) {
    tf.start.min = tf.start.value = new Date().toISOString().slice(0, 10);
    tf.addEventListener('submit', function (e) { e.preventDefault(); book(tf, 'transport', $('#tripNote')); });
  }
  function book(form, kind, note) {
    var d = Object.fromEntries(new FormData(form)); d.kind = kind;
    var name = kind === 'rent' ? (T.bikes.filter(function (b) { return b.id === d.model; })[0] || {}).name : d.model;
    if (kind === 'transport') d.start = d.start + ' ' + (d.time || '');
    var text = function (id) {
      return [kind === 'rent' ? 'TAKE scooter request' : 'TAKE driver request', id ? '#' + id : '', name,
        kind === 'rent' ? d.start + ' to ' + d.end : d.start + (d.people ? ', ' + d.people + ' people' : ''),
        kind === 'rent' && $('#rentQuote').textContent ? $('#rentQuote').textContent : '',
        'Name: ' + d.name, d.hotel ? 'Staying / pick-up: ' + d.hotel : '', d.note ? 'Note: ' + d.note : ''].filter(Boolean).join('\n');
    };
    var btn = form.querySelector('button[type=submit]'); btn.disabled = true; note.textContent = 'Sending...';
    api('bookings', { method: 'POST', body: JSON.stringify(d) }).then(function (r) {
      var link = location.origin + '/ride?booking=' + r.id + '&t=' + r.token;
      try { localStorage.setItem('take_last_booking', link); } catch (x) {}
      wa(T.wa.ride, text(r.id) + '\nMy booking: ' + link);
      location.href = link;
    }).catch(function (err) {
      note.textContent = 'Could not reach our system (' + err.message + '). We opened WhatsApp instead: just press send.';
      wa(T.wa.ride, text());
    }).then(function () { btn.disabled = false; });
  }

  // ---- status page
  var qs = new URLSearchParams(location.search);
  function payCfg() { return (window.TAKE_MEMBER && window.TAKE_MEMBER.config) || {}; }
  function payBox(o) { if (!window.TAKE_PAY) return ''; if (!TAKE_PAY.methods.length) TAKE_PAY.load(payCfg()); return TAKE_PAY.instructions(o); }
  function showStatus(html) { var s = $('#status'); s.hidden = false; $('#statusCard').innerHTML = html; s.scrollIntoView(); }
  function line(steps, at) { var i = steps.indexOf(at); return '<div class="steps-line">' + steps.map(function (s, j) { return '<span class="' + (j <= i ? 'on' : '') + '">' + s + '</span>'; }).join('') + '</div>'; }
  if (qs.get('order')) {
    var poll = function () {
      api('orders/' + encodeURIComponent(qs.get('order')) + '?t=' + encodeURIComponent(qs.get('t') || '')).then(function (o) {
        var names = { new: 'Received', cooking: 'Cooking', ready: o.mode === 'delivery' ? 'On the way' : 'Ready', done: 'Done', cancelled: 'Cancelled' };
        showStatus('<p class="label">Order #' + o.id + '</p><h2>' + names[o.status] + '</h2>' +
          (o.status === 'cancelled' ? '<p>The kitchen cancelled this order. WhatsApp us if this is a surprise.</p>' : line(['Received', 'Cooking', names.ready, 'Done'], names[o.status])) +
          '<ul class="list">' + o.items.map(function (i) { return '<li>' + i.qty + ' × ' + esc(i.name) + '<em>' + (i.price ? k(i.price * i.qty) : 'at counter') + '</em></li>'; }).join('') + '</ul>' +
          '<p class="cart-sum">Total <b>' + rp(o.total - (o.discount || 0)) + '</b>' + (o.discount ? ' <small class="mute">(' + rp(o.discount) + ' off with points)</small>' : '') + '</p>' +
          (o.status === 'cancelled' ? '' : payBox({ kind: 'order', id: o.id, t: qs.get('t'), amount: o.total - (o.discount || 0), pay: o.pay, paid: o.paid, claimed: o.claimed, invoice_url: o.invoice_url, canPay: payCfg().pay })) +
          '<p class="note">This page updates by itself. Keep it open or save the link.</p>');
        if (o.status !== 'done' && o.status !== 'cancelled') setTimeout(poll, 15000);
      }).catch(function () { showStatus('<h2>Order not found</h2><p>Check the link, or WhatsApp the kitchen.</p>'); });
    };
    poll();
  }
  if (qs.get('booking')) {
    var bid = qs.get('booking'), bt = qs.get('t') || '', watching = null, last = 0;
    var load = function () {
      api('bookings/' + encodeURIComponent(bid) + '?t=' + encodeURIComponent(bt)).then(function (b) {
        var name = b.kind === 'rent' ? ((T.bikes.filter(function (x) { return x.id === b.model; })[0] || {}).name || b.model) : b.model;
        var names = { pending: 'Awaiting payment', request: 'Request sent', confirmed: b.paid ? 'Paid, see you at the shop' : 'Confirmed', out: b.kind === 'rent' ? 'Enjoy the ride' : 'On the way', returned: 'Returned, thank you', cancelled: 'Cancelled' };
        var first = b.status === 'pending' ? names.pending : 'Request sent';
        showStatus('<p class="label">Booking #' + b.id + '</p><h2>' + names[b.status] + '</h2><p><b>' + esc(name) + '</b> · ' + esc(b.start) + (b.end ? ' to ' + esc(b.end) : '') + '</p>' +
          (b.status === 'cancelled' ? '' : line([first, names.confirmed, names.out, b.kind === 'rent' ? 'Returned, thank you' : 'Done'], names[b.status])) +
          (b.price ? '<p class="cart-sum">' + (b.paid ? 'Paid ' : 'To pay ') + '<b>' + rp(b.price - (b.discount || 0)) + '</b></p>' : '') +
          (b.status === 'pending' && b.hold ? '<p class="note">We hold the scooter for you until ' + new Date(b.hold.replace(' ', 'T') + 'Z').toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Makassar' }) + ' Bali time. After that the dates may go to someone else.</p>' : '') +
          (b.status === 'pending' && !b.hold ? '<p class="note">The 30-minute hold ran out. Pay now and we check the scooter is still free.</p>' : '') +
          (b.price && ['cancelled', 'returned'].indexOf(b.status) < 0 && !(b.status === 'pending' && b.hold) ? payBox({ kind: 'booking', id: b.id, t: bt, amount: b.price - (b.discount || 0), pay: b.status === 'pending' ? 'online' : b.pay, paid: b.paid, claimed: b.claimed, canPay: b.canPay }) : '') +
          (b.status === 'pending' && b.canPay ? '<button class="btn btn-green" type="button" id="payNow">Pay now</button><p class="form-note" id="payNote"></p>' : '') +
          (b.status === 'request' ? '<p class="note">We confirm on WhatsApp during opening times, 7am to 8pm.</p>' : '') +
          (b.status === 'confirmed' && b.kind === 'rent' ? '<p class="note">Pick it up at the shop between 7am and 8pm on ' + esc(b.start) + '. Bring your passport and driving licence.</p>' : '') +
          (b.status === 'out' && b.kind === 'rent' ? '<div class="card" style="margin-top:14px"><b>Broken down, flat tyre or lost?</b><p class="mute">Share your location so we know where you are, and WhatsApp us. It is only shared while sharing is on, and deleted when the bike is back.</p><div class="row" style="margin-top:12px"><button class="btn btn-green" id="shareLoc" type="button">' + (watching ? 'Sharing my location' : 'Share my location') + '</button><a class="btn btn-ghost" href="https://wa.me/' + T.wa.ride + '?text=' + encodeURIComponent('Help, booking #' + b.id + ' ' + name) + '" target="_blank" rel="noopener">WhatsApp help</a></div><p class="form-note" id="locNote"></p></div>' : ''));
        var sb = $('#shareLoc'); if (sb) sb.onclick = share;
        var pn = $('#payNow'); if (pn) pn.onclick = function () {
          pn.disabled = true;
          api('pay', { method: 'POST', body: JSON.stringify({ kind: 'booking', id: bid, t: bt }) })
            .then(function (r) { location.href = r.pay_url; })
            .catch(function (e) { $('#payNote').textContent = e.message; pn.disabled = false; });
        };
        if (b.status !== 'returned' && b.status !== 'cancelled') setTimeout(load, 60000);
      }).catch(function () { showStatus('<h2>Booking not found</h2><p>Check the link, or WhatsApp us.</p>'); });
    };
    var share = function () {
      var n = $('#locNote');
      if (!navigator.geolocation) { n.textContent = 'This phone cannot share its location. Please WhatsApp us.'; return; }
      if (watching != null) { navigator.geolocation.clearWatch(watching); watching = null; $('#shareLoc').textContent = 'Share my location'; n.textContent = 'Stopped sharing.'; return; }
      n.textContent = 'Asking your phone...';
      watching = navigator.geolocation.watchPosition(function (p) {
        if (Date.now() - last < 30000) return; last = Date.now();
        api('ping', { method: 'POST', body: JSON.stringify({ id: bid, t: bt, lat: p.coords.latitude, lng: p.coords.longitude, acc: p.coords.accuracy }) })
          .then(function () { n.textContent = 'Location sent ' + new Date().toLocaleTimeString() + '. Keep this page open.'; $('#shareLoc').textContent = 'Stop sharing'; })
          .catch(function (e) { n.textContent = 'Could not send: ' + e.message; });
      }, function (e) { n.textContent = 'Location blocked: ' + e.message; watching = null; }, { enableHighAccuracy: true, maximumAge: 20000 });
    };
    load();
  }

  renderCats(); renderMenu(); renderCart(); renderFleet();
  api('bikes').then(function (r) { r.models.forEach(function (m) { free[m.model] = m; }); renderFleet(); }).catch(function () {});
})();
