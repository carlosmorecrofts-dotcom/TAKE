// TAKE payments on the page: the method picker (food order and scooter booking),
// what to do after choosing one, and "I have paid" for QRIS and bank transfer.
// The list of methods comes from /api/config, so the page only offers what works.
(function () {
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
  var rp = function (n) { return 'Rp ' + Number(n || 0).toLocaleString('id-ID'); };
  var icon = { cash: '💵', qris: '▦', transfer: '🏦', online: '💳', test: '🧪' };
  var P = window.TAKE_PAY = { methods: [], details: {} };

  P.load = function (cfg) { P.methods = (cfg && cfg.methods) || []; P.details = (cfg && cfg.payDetails) || {}; };
  P.find = function (id) { return P.methods.filter(function (m) { return m.id === id; })[0] || null; };

  // Radio cards. name="pay" so FormData picks the choice up.
  P.picker = function (host, selected) {
    if (!host) return;
    if (!P.methods.length) { host.innerHTML = ''; host.hidden = true; return; }
    var sel = P.find(selected) ? selected : P.methods[0].id;
    host.hidden = false;
    host.innerHTML = '<p class="label">How do you want to pay?</p>' + P.methods.map(function (m) {
      return '<label class="pay-opt"><input type="radio" name="pay" value="' + m.id + '"' + (m.id === sel ? ' checked' : '') + '>' +
        '<span><b><i aria-hidden="true">' + (icon[m.id] || '•') + '</i>' + esc(m.name) + (m.id === 'test' ? ' <em class="add">[test only]</em>' : '') + '</b><small>' + esc(m.note) + '</small></span></label>';
    }).join('');
  };
  P.chosen = function (host) { var c = host && host.querySelector('input[name=pay]:checked'); return c ? c.value : null; };

  // What the customer sees on the order or booking page while it is not paid yet.
  P.instructions = function (o) { // o: { kind, id, t, amount, pay, paid, claimed, invoice_url, canPay }
    if (o.paid) return '<p class="chip-paid">Paid' + (o.pay ? ' · ' + esc(({ cash: 'cash', qris: 'QRIS', transfer: 'bank transfer', online: 'online', test: 'test payment', card: 'card' })[o.pay] || o.pay) : '') + '</p>';
    var d = P.details || {}, amt = o.amount ? ' <b>' + rp(o.amount) + '</b>' : '';
    if (o.pay === 'online' || o.pay === 'test') {
      return o.invoice_url ? '<a class="btn btn-green" href="' + esc(o.invoice_url) + '">Pay' + (o.amount ? ' ' + rp(o.amount) : '') + ' now</a>' : '';
    }
    var claimed = o.claimed ? '<p class="note">You told us you paid on ' + esc(String(o.claimed).slice(0, 16)) + '. We are checking it.</p>' : '';
    var claimBtn = o.claimed ? '' : '<button class="btn btn-ghost" type="button" data-pay-claim="' + o.kind + '|' + o.id + '|' + o.t + '|' + o.pay + '">I have paid</button><p class="form-note" data-pay-note></p>';
    if (o.pay === 'qris') {
      return '<div class="pay-box"><b>Pay' + amt + ' with QRIS</b>' +
        (d.qris ? '<img class="pay-qr" src="' + esc(d.qris) + '" alt="TAKE QRIS code" width="260" height="260">' : '<p class="add">[ADD: TAKE QRIS code image]</p><p class="mute">Or scan the QRIS at the counter.</p>') +
        '<p class="mute">Open your bank or e-wallet app, scan, check the amount, pay.</p>' + claimed + claimBtn + '</div>';
    }
    if (o.pay === 'transfer') {
      var b = d.bank;
      return '<div class="pay-box"><b>Transfer' + amt + '</b>' +
        (b ? '<ul class="list"><li>Bank<em>' + esc(b.bank) + '</em></li><li>Account name<em>' + esc(b.holder) + '</em></li><li>Account number<em>' + esc(b.account) + '</em></li></ul>'
           : '<p class="add">[ADD: TAKE bank name, account name and number]</p>') +
        '<p class="mute">Write #' + esc(o.id) + ' in the transfer note, then send the receipt on WhatsApp.</p>' + claimed + claimBtn + '</div>';
    }
    // cash
    var where = o.kind === 'order' ? 'at the counter, or to the driver when it arrives' : 'at the shop when you pick up the scooter';
    return '<div class="pay-box"><b>Pay' + amt + ' in cash</b><p class="mute">Pay ' + where + '. Rupiah only.</p>' +
      (o.canPay ? '<button class="btn btn-ghost" type="button" data-pay-online="' + o.kind + '|' + o.id + '|' + o.t + '">Pay online instead</button><p class="form-note" data-pay-note></p>' : '') + '</div>';
  };

  // One listener for the buttons above, wherever they are drawn.
  document.addEventListener('click', function (e) {
    var c = e.target.closest('[data-pay-claim]'), on = e.target.closest('[data-pay-online]');
    if (!c && !on) return;
    var btn = c || on, a = btn.getAttribute(c ? 'data-pay-claim' : 'data-pay-online').split('|'), note = btn.parentNode.querySelector('[data-pay-note]');
    btn.disabled = true;
    var send = function (path, body) {
      return fetch('/api/' + path, { method: 'POST', credentials: 'same-origin', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) })
        .then(function (r) { return r.json().then(function (j) { if (!r.ok) throw new Error(j.error || r.status); return j; }); });
    };
    (c ? send('pay/claim', { kind: a[0], id: a[1], t: a[2], method: a[3] }).then(function () { if (note) note.textContent = 'Thank you. We check and confirm on WhatsApp.'; btn.remove(); })
       : send('pay', { kind: a[0], id: a[1], t: a[2] }).then(function (r) { location.href = r.pay_url; })
    ).catch(function (err) { if (note) note.textContent = err.message; btn.disabled = false; });
  });
})();
