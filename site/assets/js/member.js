// TAKE member area: sign in by email link, points, bookings and orders, rider
// details (profile, passport and licence photos, rental terms). Opens as a
// drawer from the header. Other scripts use window.TAKE_MEMBER.
(function () {
  var T = window.TAKE, $ = function (s, r) { return (r || document).querySelector(s); };
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
  var k = function (n) { return n == null ? '' : n / 1000 + 'K'; };
  var rp = function (n) { return 'Rp ' + Number(n || 0).toLocaleString('id-ID'); };
  var bikeName = function (id) { var b = T.bikes.filter(function (x) { return x.id === id; })[0]; return b ? b.name : id; };
  function api(path, opts) {
    return fetch('/api/' + path, Object.assign({ credentials: 'same-origin', headers: { 'content-type': 'application/json' } }, opts || {}))
      .then(function (r) { return r.json().then(function (j) { if (!r.ok) { var e = new Error(j.error || r.status); e.status = r.status; e.data = j; throw e; } return j; }); });
  }

  var M = window.TAKE_MEMBER = { config: null, data: null, onDone: null, next: null };
  var tab = 'points';

  // ---- drawer shell
  var dr = document.createElement('div');
  dr.className = 'drawer'; dr.id = 'memberDrawer'; dr.hidden = true;
  dr.setAttribute('role', 'dialog'); dr.setAttribute('aria-modal', 'true'); dr.setAttribute('aria-label', 'TAKE member area');
  dr.innerHTML = '<div class="drawer-bg" data-close></div><div class="drawer-panel"><div class="drawer-head"><b>TAKE <span>Member</span></b><button type="button" class="drawer-x" data-close aria-label="Close">&times;</button></div><div class="drawer-body" id="mBody"></div></div>';
  document.body.appendChild(dr);
  dr.addEventListener('click', function (e) { if (e.target.hasAttribute('data-close')) M.close(); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !dr.hidden) M.close(); });
  var body = $('#mBody', dr);

  M.open = function (want, opts) {
    opts = opts || {};
    M.onDone = opts.onDone || null; M.next = opts.next || location.pathname;
    if (want) tab = want;
    dr.hidden = false; document.body.classList.add('drawer-open');
    render(opts.message);
    var f = dr.querySelector('input, button:not(.drawer-x)'); if (f) setTimeout(function () { f.focus(); }, 50);
  };
  M.close = function () { dr.hidden = true; document.body.classList.remove('drawer-open'); };
  M.refresh = function () {
    return api('member/me').then(function (d) { M.data = d; }, function () { M.data = null; }).then(function () { headerBadge(); if (!dr.hidden) render(); return M.data; });
  };
  M.ready = function () { return !!(M.data && M.data.check.profileOk && !M.data.check.missingDocs.length && M.data.check.termsOk); };

  function headerBadge() {
    var b = $('#memberBtn'); if (!b) return;
    b.querySelector('span').textContent = M.data ? (M.data.points + ' pts') : 'Member';
    b.classList.toggle('in', !!M.data);
  }

  // ---- views
  function render(message) {
    if (!M.data) return renderSignIn(message);
    var d = M.data, ready = M.ready();
    var tabs = [['points', 'Points'], ['bookings', 'Bookings'], ['rider', 'Rider details' + (ready ? '' : ' !')], ['profile', 'Profile']];
    body.innerHTML = (message ? '<p class="m-msg">' + esc(message) + '</p>' : '') +
      '<div class="m-tabs" role="tablist">' + tabs.map(function (t) { return '<button type="button" role="tab" data-tab="' + t[0] + '" aria-selected="' + (tab === t[0]) + '">' + t[1] + '</button>'; }).join('') + '</div>' +
      '<div class="m-pane">' + ({ points: paneP, bookings: paneB, rider: paneR, profile: paneProfile }[tab] || paneP)(d) + '</div>';
    body.querySelectorAll('[data-tab]').forEach(function (b) { b.onclick = function () { tab = b.dataset.tab; render(); }; });
    wire();
  }

  function renderSignIn(message) {
    var L = T.loyalty;
    var off = M.config && !M.config.members;
    body.innerHTML = (message ? '<p class="m-msg">' + esc(message) + '</p>' : '') +
      '<h2>Join TAKE</h2><p class="mute">One account for the café and the scooters. Earn 1 point for every Rp ' + k(L.perIDR) + ' you pay; ' + L.redeemPoints + ' points = Rp ' + k(L.redeemValue) + ' off.</p>' +
      (off ? '<p class="m-msg">Member sign-in opens soon. <span class="add">[ADD: switches on with the TAKE email account]</span></p>' :
      '<form class="form" id="mLogin"><label>Your email<input type="email" name="email" required autocomplete="email" placeholder="you@example.com"></label>' +
      '<button class="btn btn-green" type="submit">Send me a sign-in link</button><p class="form-note" id="mLoginNote">No password. We email you a link that signs you in.</p></form>');
    var f = $('#mLogin', body); if (!f) return;
    f.onsubmit = function (e) {
      e.preventDefault();
      var email = f.email.value.trim(), note = $('#mLoginNote', body), btn = f.querySelector('button');
      btn.disabled = true; note.textContent = 'Sending...';
      api('member/login', { method: 'POST', body: JSON.stringify({ email: email, next: /^\/ride/.test(M.next || '') ? '/ride' : '/' }) }).then(function (r) {
        body.innerHTML = '<h2>Check your email</h2><p>We sent a sign-in link to <b>' + esc(email) + '</b>. It works once, for 20 minutes. Open it on this phone.</p>' +
          (r.devLink ? '<p class="m-msg">Test mode: no email is sent. <a class="btn btn-ghost" href="' + esc(r.devLink) + '">Open the sign-in link</a></p>' : '') +
          '<button class="btn btn-ghost" type="button" id="mAgain">Use another email</button>';
        $('#mAgain', body).onclick = function () { renderSignIn(); };
      }).catch(function (err) { note.textContent = err.message; btn.disabled = false; });
    };
  }

  function paneP(d) {
    var L = d.loyalty, have = d.points, step = L.redeemPoints, pct = Math.min(100, Math.round(have % step / step * 100)), rewards = Math.floor(have / step);
    return '<div class="m-points"><b>' + have + '</b><span>points</span></div>' +
      '<p class="mute">' + (rewards ? 'You can take Rp ' + k(L.redeemValue) + ' off ' + (rewards > 1 ? rewards + ' times' : 'your next order or rental') + '.' : (step - have % step) + ' more points to Rp ' + k(L.redeemValue) + ' off.') + '</p>' +
      '<div class="m-bar"><span style="width:' + (rewards ? 100 : pct) + '%"></span></div>' +
      '<p class="note">1 point for every Rp ' + k(L.perIDR) + ' paid on food and scooters. Points arrive when the payment does.' + (L.confirmed ? '' : ' <span class="add">[ADD: owner to confirm]</span>') + '</p>' +
      '<h3>History</h3><ul class="list">' + (d.history.length ? d.history.map(function (h) { return '<li>' + esc(h.reason || '') + '<em>' + (h.delta > 0 ? '+' : '') + h.delta + '</em></li>'; }).join('') : '<li class="mute">No points yet.</li>') + '</ul>';
  }

  function paneB(d) {
    var names = { pending: 'Awaiting payment', request: 'Waiting for us', confirmed: 'Confirmed', out: 'Riding', returned: 'Returned', cancelled: 'Cancelled' };
    var bk = d.bookings.map(function (b) {
      var what = b.kind === 'rent' ? bikeName(b.model) : b.model;
      return '<li><a href="/ride?booking=' + b.id + '&t=' + b.token + '">' + esc(what) + ' · ' + esc(b.start) + (b.end ? ' to ' + esc(b.end) : '') + '</a><em class="chip s-' + b.status + '">' + (b.status === 'confirmed' && b.paid ? 'Paid' : names[b.status] || b.status) + '</em></li>';
    }).join('');
    var or = d.orders.map(function (o) {
      return '<li><a href="/?order=' + o.id + '&t=' + o.token + '">Order #' + o.id + ' · ' + esc(o.created.slice(0, 10)) + '</a><em>' + rp(o.total - o.discount) + (o.paid ? ' · paid' : '') + '</em></li>';
    }).join('');
    return '<h3>Scooters and drivers</h3><ul class="list">' + (bk || '<li class="mute">No bookings yet. <a href="/ride#book">Book a scooter</a></li>') + '</ul>' +
      '<h3>Food orders</h3><ul class="list">' + (or || '<li class="mute">No orders yet.</li>') + '</ul>';
  }

  function paneR(d) {
    var c = d.check, req = d.rental.requiredDocs;
    var docs = req.map(function (r) {
      var have = d.docs.filter(function (x) { return x.kind === r.id; })[0];
      return '<div class="m-doc' + (have ? ' ok' : '') + '"><div><b>' + esc(r.name) + '</b><small>' + (have ? 'Added ' + esc(have.created.slice(0, 10)) : 'Needed before your first rental') + '</small></div>' +
        '<div class="row">' + (have ? '<button type="button" class="sb" data-view="' + have.id + '">View</button>' : '') +
        '<label class="sb go">' + (have ? 'Replace' : 'Take photo') + '<input type="file" accept="image/*" capture="environment" data-up="' + r.id + '" hidden></label>' +
        '<label class="sb">' + (have ? 'File' : 'Choose file') + '<input type="file" accept="image/*,application/pdf" data-up="' + r.id + '" hidden></label>' +
        (have ? '<button type="button" class="sb warn" data-del="' + have.id + '">Delete</button>' : '') + '</div></div>';
    }).join('');
    var stepOk = function (ok) { return '<span class="m-tick' + (ok ? ' ok' : '') + '">' + (ok ? '✓' : '') + '</span>'; };
    return '<p class="mute">Needed once, before your first scooter. Only you and TAKE staff can see your documents, and you can delete them any time.</p>' +
      '<h3>' + stepOk(c.profileOk) + '1. Your details</h3><form class="form" id="mProfile"><div class="two"><label>Name<input name="name" required value="' + esc(d.member.name || '') + '" autocomplete="name"></label>' +
      '<label>WhatsApp<input name="wa" required inputmode="tel" value="' + esc(d.member.wa || '') + '" autocomplete="tel" placeholder="+62 ..."></label></div><button class="btn btn-ghost" type="submit">Save details</button></form>' +
      '<h3>' + stepOk(!c.missingDocs.length) + '2. Documents</h3>' + docs + '<p class="form-note" id="mDocNote"></p>' +
      '<h3>' + stepOk(c.termsOk) + '3. Rental terms</h3>' +
      (c.termsOk ? '<p>You accepted version ' + esc(d.member.terms_version) + ' on ' + esc((d.member.terms_at || '').slice(0, 10)) + '. <a href="/terms" target="_blank">Read again</a></p>'
        : (d.member.terms_version ? '<p class="m-msg">The terms have changed. Please read and accept the new version.</p>' : '') +
          '<div class="m-terms" id="mTerms">Loading the terms...</div><label class="m-agree"><input type="checkbox" id="mAgree"> I have read and agree to the rental terms, version ' + esc(d.rental.termsVersion) + '</label>' +
          '<button class="btn btn-green" type="button" id="mAccept" disabled>Accept the terms</button>') +
      (M.ready() && M.onDone ? '<div class="m-done"><b>All set.</b><button class="btn btn-green" type="button" id="mContinue">Continue with my booking</button></div>' : '');
  }

  function paneProfile(d) {
    return '<p>Signed in as <b>' + esc(d.member.email) + '</b></p><p class="mute">Name and WhatsApp are under Rider details.</p>' +
      '<button class="btn btn-ghost" type="button" id="mOut">Sign out</button>';
  }

  function wire() {
    var pf = $('#mProfile', body);
    if (pf) pf.onsubmit = function (e) {
      e.preventDefault();
      api('member/me', { method: 'PATCH', body: JSON.stringify({ name: pf.name.value, wa: pf.wa.value }) }).then(M.refresh);
    };
    body.querySelectorAll('[data-up]').forEach(function (inp) { inp.onchange = function () { if (inp.files[0]) upload(inp.dataset.up, inp.files[0]); }; });
    body.querySelectorAll('[data-del]').forEach(function (b) {
      b.onclick = function () { if (confirm('Delete this document? You will need it again before your next rental.')) api('member/docs/' + b.dataset.del, { method: 'DELETE' }).then(M.refresh); };
    });
    body.querySelectorAll('[data-view]').forEach(function (b) {
      b.onclick = function () { fetch('/api/member/docs/' + b.dataset.view, { credentials: 'same-origin' }).then(function (r) { return r.blob(); }).then(function (bl) { window.open(URL.createObjectURL(bl), '_blank', 'noopener'); }); };
    });
    var tbox = $('#mTerms', body);
    if (tbox) fetch('/terms').then(function (r) { return r.text(); }).then(function (h) {
      var a = new DOMParser().parseFromString(h, 'text/html').getElementById('terms-text');
      tbox.innerHTML = a ? a.innerHTML : '<a href="/terms" target="_blank">Read the terms</a>';
      var nav = tbox.querySelector('.toc'); if (nav) nav.remove();
    });
    var agree = $('#mAgree', body), acc = $('#mAccept', body);
    if (agree) agree.onchange = function () { acc.disabled = !agree.checked; };
    if (acc) acc.onclick = function () {
      acc.disabled = true;
      api('member/terms', { method: 'POST', body: JSON.stringify({ version: M.data.rental.termsVersion }) }).then(M.refresh).catch(function (e) { alert(e.message); acc.disabled = false; });
    };
    var cont = $('#mContinue', body);
    if (cont) cont.onclick = function () { var f = M.onDone; M.onDone = null; M.close(); f(); };
    var out = $('#mOut', body);
    if (out) out.onclick = function () { api('member/logout', { method: 'POST' }).then(function () { M.data = null; headerBadge(); render(); }); };
  }

  // Phone photos are big: shrink to 1600 px JPEG before sending (well under the 1 MB limit).
  function upload(kind, file) {
    var note = $('#mDocNote', body);
    note.textContent = 'Uploading...';
    var send = function (dataUrl) {
      return api('member/docs', { method: 'POST', body: JSON.stringify({ kind: kind, data: dataUrl }) }).then(function () { note.textContent = 'Saved.'; return M.refresh(); });
    };
    var fail = function (e) { note.textContent = 'Could not upload: ' + e.message; };
    if (file.type === 'application/pdf') {
      if (file.size > 1000000) { note.textContent = 'This PDF is over 1 MB. Please take a photo instead.'; return; }
      var fr = new FileReader(); fr.onload = function () { send(fr.result).catch(fail); }; fr.readAsDataURL(file); return;
    }
    var img = new Image(), url = URL.createObjectURL(file);
    img.onload = function () {
      var s = Math.min(1, 1600 / Math.max(img.width, img.height)), c = document.createElement('canvas');
      c.width = Math.round(img.width * s); c.height = Math.round(img.height * s);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      var q = 0.82, out = c.toDataURL('image/jpeg', q);
      while (out.length * 0.75 > 900000 && q > 0.4) { q -= 0.12; out = c.toDataURL('image/jpeg', q); }
      send(out).catch(fail);
    };
    img.onerror = function () { note.textContent = 'That file is not a photo we can read. Try a JPG or PNG.'; };
    img.src = url;
  }

  // ---- start
  document.addEventListener('click', function (e) {
    var t = e.target.closest('#memberBtn, [data-member-open]');
    if (t) { e.preventDefault(); M.open(); }
  });
  var qs = new URLSearchParams(location.search);
  Promise.all([
    api('config').then(function (c) { M.config = c; }, function () { M.config = { members: false, pay: false }; }),
    M.refresh(),
  ]).then(function () {
    if (qs.get('member')) {
      history.replaceState(null, '', location.pathname + location.hash);
      var waiting = false;
      try { var pb = JSON.parse(localStorage.getItem('take_pending_booking') || 'null'); waiting = !!(pb && Date.now() - pb.at < 3600e3); } catch (e) {}
      // a booking started before signing in is picked up by book.js; otherwise show the member area
      if (M.data && !waiting) M.open(M.ready() ? 'points' : 'rider', { message: 'You are signed in.' });
    }
    if (qs.get('signin') === 'expired') { history.replaceState(null, '', location.pathname); M.open(null, { message: 'That sign-in link has expired or was already used. Send yourself a new one.' }); }
    document.dispatchEvent(new CustomEvent('take:member-ready'));
  });
})();
