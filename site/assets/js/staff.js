// TAKE staff app: kitchen board, rentals (check-out / check-in), fleet and
// service, live map, daily takings. Talks to /api/staff with the PIN header.
(function () {
  var T = window.TAKE, $ = function (s, r) { return (r || document).querySelector(s); };
  var pin = '', data = { orders: [], bookings: [], bikes: [], last: [] }, seen = null, tab = 'kitchen', map, layer;
  try { pin = localStorage.getItem('take_pin') || ''; } catch (e) {}
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
  function beep() { try { var a = new (window.AudioContext || window.webkitAudioContext)(), o = a.createOscillator(), g = a.createGain(); o.connect(g); g.connect(a.destination); o.frequency.value = 880; g.gain.value = .2; o.start(); o.stop(a.currentTime + .25); setTimeout(function () { var o2 = a.createOscillator(); o2.connect(g); o2.frequency.value = 1175; o2.start(); o2.stop(a.currentTime + .25); }, 300); } catch (e) {} }

  // ---- login
  function logout() { pin = ''; try { localStorage.removeItem('take_pin'); } catch (e) {} $('#app').hidden = true; $('#login').hidden = false; }
  $('#loginForm').addEventListener('submit', function (e) {
    e.preventDefault(); pin = this.pin.value.trim();
    api('login').then(function () { try { localStorage.setItem('take_pin', pin); } catch (x) {} start(); })
      .catch(function (err) { $('#loginNote').textContent = err.message; });
  });
  function start() { $('#login').hidden = true; $('#app').hidden = false; refresh(); setInterval(refresh, 15000); }

  // ---- tabs
  document.querySelectorAll('[data-tab]').forEach(function (b) {
    b.onclick = function () {
      tab = b.getAttribute('data-tab');
      document.querySelectorAll('[data-tab]').forEach(function (x) { x.setAttribute('aria-selected', x === b); });
      document.querySelectorAll('[data-pane]').forEach(function (p) { p.hidden = p.getAttribute('data-pane') !== tab; });
      if (tab === 'map') drawMap(); if (tab === 'today') takings(); if (tab === 'fleet') svcLog();
    };
  });

  function refresh() {
    api('board').then(function (d) {
      data = d;
      var ids = d.orders.filter(function (o) { return o.status === 'new'; }).map(function (o) { return o.id; });
      var req = d.bookings.filter(function (b) { return b.status === 'request'; }).map(function (b) { return 'b' + b.id; });
      var now = ids.concat(req);
      if (seen && now.some(function (x) { return seen.indexOf(x) < 0; })) { beep(); toast('New order or booking'); }
      seen = now;
      kitchen(); rentals(); fleet(); if (tab === 'map') drawMap();
    }).catch(function (e) { toast('Offline: ' + e.message); });
  }

  // ---- kitchen
  function kitchen() {
    var cols = [['new', 'New'], ['cooking', 'Cooking'], ['ready', 'Ready / on the way'], ['done', 'Done today']];
    var next = { new: ['cooking', 'Start cooking'], cooking: ['ready', 'Ready'], ready: ['done', 'Handed over'] };
    var nNew = data.orders.filter(function (o) { return o.status === 'new'; }).length;
    $('#bKitchen').hidden = !nNew; $('#bKitchen').textContent = nNew;
    $('#kitchen').innerHTML = cols.map(function (c) {
      var list = data.orders.filter(function (o) { return o.status === c[0]; });
      return '<div class="col"><h3>' + c[1] + ' (' + list.length + ')</h3>' + list.map(function (o) {
        var mode = { dine: 'Eat here' + (o.tbl ? ' · table ' + esc(o.tbl) : ''), pickup: 'Pick up', delivery: 'Delivery' }[o.mode];
        return '<div class="tk' + (c[0] === 'new' && ago(o.created).indexOf('h') > 0 ? ' late' : '') + '"><header><span>#' + o.id + ' ' + esc(o.name) + '</span><span>' + ago(o.created) + '</span></header>' +
          '<div class="meta">' + mode + (o.address ? ': ' + esc(o.address) : '') + '</div><ul>' + o.items.map(function (i) { return '<li><b>' + i.qty + '×</b> ' + esc(i.name) + '</li>'; }).join('') + '</ul>' +
          (o.note ? '<div class="meta">Note: ' + esc(o.note) + '</div>' : '') + '<div class="meta">' + rp(o.total) + (o.paid ? ' · <b>paid</b>' : ' · not paid') + '</div>' +
          '<div class="acts">' + (next[o.status] ? '<button class="sb go" data-o="' + o.id + '" data-s="' + next[o.status][0] + '">' + next[o.status][1] + '</button>' : '') +
          (o.paid ? '' : '<button class="sb" data-o="' + o.id + '" data-paid="1">Paid</button>') +
          '<a class="sb" href="' + telWa(o.wa) + '" target="_blank" rel="noopener">WhatsApp</a>' +
          (o.status === 'new' ? '<button class="sb warn" data-o="' + o.id + '" data-s="cancelled">Cancel</button>' : '') + '</div></div>';
      }).join('') + '</div>';
    }).join('');
    $('#kitchen').querySelectorAll('[data-o]').forEach(function (b) {
      b.onclick = function () {
        var body = b.dataset.paid ? { paid: true } : { status: b.dataset.s };
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
      ['New requests', bk.filter(function (b) { return b.status === 'request'; })],
      ['Confirmed, to hand over', bk.filter(function (b) { return b.status === 'confirmed'; })],
      ['Out now', bk.filter(function (b) { return b.status === 'out'; }).sort(function (a, b) { return (a.end || '').localeCompare(b.end || ''); })],
      ['Back recently', bk.filter(function (b) { return b.status === 'returned'; })],
    ];
    var nLate = bk.filter(late).length, nReq = groups[0][1].length;
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
          '<div class="meta">' + (b.price ? rp(b.price) : 'no price yet') + (b.deposit ? ' · deposit ' + rp(b.deposit) : '') + (b.paid ? ' · paid' : '') + (b.km_out != null ? ' · km out ' + b.km_out : '') + (b.km_in != null ? ' · in ' + b.km_in : '') + '</div>' +
          '<div class="acts">' + acts(b) + '<a class="sb" href="' + telWa(b.wa) + '" target="_blank" rel="noopener">WhatsApp</a></div></div>';
      }).join('') + '</div>';
    }).join('');
    $('#rentals').querySelectorAll('[data-b]').forEach(function (el) { el.onclick = function () { doBooking(+el.dataset.b, el.dataset.a); }; });
  }
  function acts(b) {
    var a = function (act, label, cls) { return '<button type="button" class="sb ' + (cls || '') + '" data-b="' + b.id + '" data-a="' + act + '">' + label + '</button>'; };
    if (b.status === 'request') return a('confirm', 'Confirm', 'go') + a('cancel', 'Decline', 'warn');
    if (b.status === 'confirmed') return (b.kind === 'rent' ? a('checkout', 'Hand over bike', 'go') : a('done', 'Trip done', 'go')) + a('cancel', 'Cancel', 'warn');
    if (b.status === 'out') return (b.kind === 'rent' ? a('checkin', 'Check in', 'go') + a('extend', 'Extend') + a('track', 'Map') : a('done', 'Trip done', 'go')) + (b.paid ? '' : a('paid', 'Paid'));
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
    if (act === 'paid') return api('bookings/' + id, 'PATCH', { paid: true }).then(refresh);
    if (act === 'done') return api('bookings/' + id, 'PATCH', { action: 'checkin' }).then(refresh);
    if (act === 'extend') return dialog('Extend #' + id, [['end', 'New return date', 'date', b.end], ['price', 'New total price (Rp)', 'number', b.price]], function (v) { return api('bookings/' + id, 'PATCH', { end: v.end, price: v.price }); });
    if (act === 'track') { $('[data-tab=map]').click(); setTimeout(function () { track(id); }, 300); return; }
    if (act === 'checkout') {
      var free = data.bikes.filter(function (x) { return x.status === 'available'; }).sort(function (x, y) { return (x.model === b.model ? 0 : 1) - (y.model === b.model ? 0 : 1); });
      if (!free.length) return toast('No bike is available. Check in or free one in Fleet first.');
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
})();
