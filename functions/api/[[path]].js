// TAKE Canggu API. Cloudflare Pages Function with D1 (binding DB).
// Secrets: STAFF_PIN; optional XENDIT_SECRET_KEY + XENDIT_CALLBACK_TOKEN (online payment);
// optional RESEND_API_KEY + MAIL_FROM (sign-in emails). DEV_LOGIN_LINKS=1 shows the
// sign-in link on screen instead of emailing it: local testing only.
//
// Public    GET config | GET bikes | GET availability?model=&from=&days=
//           POST orders | GET orders/:id?t= | POST bookings | GET bookings/:id?t= | POST pay | POST ping
// Members   POST member/login | GET member/verify?t= | GET member/me | PATCH member/me | POST member/logout
//           POST member/terms | POST member/docs | GET member/docs/:id | DELETE member/docs/:id
// Xendit    POST pay/xendit (webhook, x-callback-token)
// Staff     everything under staff/ with header x-staff-pin
import {
  J, bad, rnd, str, int, body, sha, same, isJson, today, addDays, days, isDate,
  member, startSession, endSession, balance, riderCheck, award,
  calendar, rangeFree, rentPrice, fleetSize,
  payOn, createInvoice, invoiceStatus, markPaid, mailOn, sendMail,
  MENU, BIKES, LOYALTY, RENTAL,
} from './_lib.js';

const DOC_MAX = 1000000; // bytes after the phone has compressed the photo

export async function onRequest(ctx) {
  const { request, env, params } = ctx;
  const db = env.DB;
  if (!db) return bad('database not bound', 500);
  const url = new URL(request.url);
  const p = [].concat(params.path || []);
  const m = request.method;
  try {
    if (p[0] === 'staff') return await staff(request, env, db, p, m, url);
    if (p[0] === 'member') return await members(request, env, db, p, m, url);
    if (p[0] === 'pay' && p[1] === 'xendit') return await xenditHook(request, env, db);
    return await pub(request, env, db, p, m, url);
  } catch (e) {
    return bad('server error: ' + (e && e.message ? e.message : e), 500);
  }
}

// ===================================================================== public
async function pub(request, env, db, p, m, url) {
  if (p[0] === 'config' && m === 'GET') {
    return J({ pay: payOn(env), members: mailOn(env) || env.DEV_LOGIN_LINKS === '1', loyalty: LOYALTY, rental: RENTAL });
  }
  if (p[0] === 'bikes' && m === 'GET') {
    const { results } = await db.prepare("SELECT model, SUM(status='available') AS free, SUM(status IN ('available','out')) AS total FROM bikes GROUP BY model").all();
    return J({ models: results });
  }
  if (p[0] === 'availability' && m === 'GET') {
    const model = url.searchParams.get('model');
    if (!BIKES[model]) return bad('unknown scooter');
    let from = url.searchParams.get('from'); if (!isDate(from)) from = today();
    const n = Math.min(93, Math.max(1, int(url.searchParams.get('days')) || 62));
    return J(await calendar(db, model, from, n));
  }

  if (p[0] === 'orders' && m === 'POST' && !p[1]) {
    const b = await body(request), me = await member(request, db);
    const items = (Array.isArray(b.items) ? b.items : []).slice(0, 40).map((it) => {
      const item = MENU[it.id]; const qty = Math.min(20, Math.max(1, int(it.qty) || 1));
      return item ? { id: it.id, name: item.name, price: item.price, qty } : null;
    }).filter(Boolean);
    if (!items.length) return bad('empty order');
    const name = str(b.name, 80) || (me && me.name), wa = str(b.wa, 30) || (me && me.wa);
    if (!name || !wa) return bad('name and WhatsApp are needed');
    const mode = ['dine', 'pickup', 'delivery'].includes(b.mode) ? b.mode : 'pickup';
    if (mode === 'delivery' && !str(b.address)) return bad('delivery address is needed');
    const total = items.reduce((s, i) => s + (i.price || 0) * i.qty, 0);
    const unpriced = items.some((i) => !i.price);
    const red = me && b.usePoints ? await redeem(db, me, total) : { discount: 0, points: 0 };
    const online = b.pay === 'online' && payOn(env) && !unpriced && total - red.discount > 0;
    const t = rnd(12);
    const r = await db.prepare('INSERT INTO orders (token,member_id,name,wa,mode,address,tbl,items,total,discount,points_used,pay,note) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)')
      .bind(t, me ? me.id : null, name, wa, mode, str(b.address, 300), str(b.tbl, 10), JSON.stringify(items), total, red.discount, red.points, online ? 'online' : 'counter', str(b.note, 500)).run();
    const id = r.meta.last_row_id;
    if (red.points) await db.prepare('INSERT INTO points_log (member_id, delta, reason, ref) VALUES (?,?,?,?)').bind(me.id, -red.points, 'Used on order #' + id, 'spend:order:' + id).run();
    let pay_url = null;
    if (online) pay_url = await invoiceFor(env, db, 'order', id, t, total - red.discount, me, 'TAKE Coffee order #' + id, url.origin + '/?order=' + id + '&t=' + t);
    return J({ id, token: t, total, discount: red.discount, items, pay_url });
  }
  if (p[0] === 'orders' && p[1] && m === 'GET') {
    let o = await db.prepare('SELECT * FROM orders WHERE id=? AND token=?').bind(int(p[1]), url.searchParams.get('t') || '').first();
    if (!o) return bad('not found', 404);
    if (!o.paid && o.invoice_id && payOn(env)) o = (await recheck(env, db, 'order', o)) || o;
    return J({ id: o.id, status: o.status, mode: o.mode, items: JSON.parse(o.items), total: o.total, discount: o.discount, paid: !!o.paid, pay: o.pay, invoice_url: o.paid ? null : o.invoice_url, created: o.created });
  }

  if (p[0] === 'bookings' && m === 'POST' && !p[1]) {
    const b = await body(request);
    return b.kind === 'transport' ? transportRequest(db, b, await member(request, db)) : rentBooking(request, env, db, b, url);
  }
  if (p[0] === 'bookings' && p[1] && m === 'GET') {
    let o = await db.prepare('SELECT * FROM bookings WHERE id=? AND token=?').bind(int(p[1]), url.searchParams.get('t') || '').first();
    if (!o) return bad('not found', 404);
    if (!o.paid && o.invoice_id && payOn(env)) o = (await recheck(env, db, 'booking', o)) || o;
    const held = o.status === 'pending' && o.hold_until && o.hold_until > new Date().toISOString().replace('T', ' ').slice(0, 19);
    return J({ id: o.id, kind: o.kind, model: o.model, start: o.start, end: o.end, status: o.status, price: o.price, discount: o.discount,
      paid: !!o.paid, hold: held ? o.hold_until : null, canPay: payOn(env) && !o.paid && !!o.price && ['pending', 'request', 'confirmed'].includes(o.status) });
  }

  // Pay for something that exists already: a booking whose 30 minutes ran out,
  // a request the staff priced, or an order the guest now wants to pay online.
  if (p[0] === 'pay' && m === 'POST') {
    if (!payOn(env)) return bad('online payment is not switched on yet', 409);
    const b = await body(request), kind = b.kind === 'order' ? 'order' : 'booking';
    const o = await db.prepare(`SELECT * FROM ${kind === 'order' ? 'orders' : 'bookings'} WHERE id=? AND token=?`).bind(int(b.id), str(b.t, 40) || '').first();
    if (!o) return bad('not found', 404);
    if (o.paid) return bad('already paid', 409);
    let amount;
    if (kind === 'order') {
      if (o.status === 'cancelled') return bad('this order was cancelled', 409);
      if (JSON.parse(o.items).some((i) => !i.price)) return bad('some items are priced at the counter: please pay there', 409);
      amount = o.total - (o.discount || 0);
    } else {
      if (['cancelled', 'returned'].includes(o.status) || !o.price) return bad('this booking cannot be paid online', 409);
      if (o.status === 'pending' && o.kind === 'rent') { // the hold ran out: is the scooter still free?
        const f = await rangeFree(db, o.model, o.start, o.end, o.id);
        if (!f.ok) return bad('sorry, this scooter was booked by someone else in the meantime (' + (f.fullOn || '') + '). Please pick other dates.', 409);
        await db.prepare("UPDATE bookings SET hold_until = datetime('now', ?) WHERE id = ?").bind('+' + RENTAL.holdMinutes + ' minutes', o.id).run();
      }
      amount = o.price - (o.discount || 0);
    }
    const me = o.member_id ? await db.prepare('SELECT * FROM members WHERE id=?').bind(o.member_id).first() : null;
    const back = url.origin + (kind === 'order' ? '/?order=' : '/ride?booking=') + o.id + '&t=' + o.token;
    return J({ pay_url: await invoiceFor(env, db, kind, o.id, o.token, amount, me, (kind === 'order' ? 'TAKE Coffee order #' : 'TAKE booking #') + o.id, back) });
  }

  // Live location from the renter's phone, only while the bike is out.
  if (p[0] === 'ping' && m === 'POST') {
    const b = await body(request);
    const bk = await db.prepare('SELECT id,status FROM bookings WHERE id=? AND token=?').bind(int(b.id), str(b.t, 40) || '').first();
    if (!bk) return bad('not found', 404);
    if (bk.status !== 'out') return bad('sharing only works while the bike is out', 409);
    const lat = +b.lat, lng = +b.lng;
    if (!(Math.abs(lat) <= 90 && Math.abs(lng) <= 180)) return bad('bad position');
    await db.prepare('INSERT INTO pings (booking_id,lat,lng,acc) VALUES (?,?,?,?)').bind(bk.id, lat, lng, +b.acc || null).run();
    return J({ ok: true });
  }
  return bad('not found', 404);
}

async function redeem(db, me, amount) {
  const have = await balance(db, me.id);
  if (have < LOYALTY.redeemPoints || amount <= 0) return { discount: 0, points: 0 };
  return { discount: Math.min(LOYALTY.redeemValue, amount), points: LOYALTY.redeemPoints };
}

async function invoiceFor(env, db, kind, id, token, amount, me, description, back) {
  const inv = await createInvoice(env, { ref: `take-${kind}-${id}-${rnd(3)}`, amount, email: me && me.email, description, back });
  await db.prepare(`UPDATE ${kind === 'order' ? 'orders' : 'bookings'} SET invoice_id=?, invoice_url=?, pay='online' WHERE id=?`).bind(inv.id, inv.url, id).run();
  return inv.url;
}

// If the payment message from Xendit was missed, ask Xendit directly.
async function recheck(env, db, kind, o) {
  const s = await invoiceStatus(env, o.invoice_id).catch(() => null);
  if (!s || !['PAID', 'SETTLED'].includes(s.status)) return null;
  await markPaid(db, kind, o.id, s.paid || s.amount, 'online');
  return db.prepare(`SELECT * FROM ${kind === 'order' ? 'orders' : 'bookings'} WHERE id=?`).bind(o.id).first();
}

async function transportRequest(db, b, me) {
  const name = str(b.name, 80) || (me && me.name), wa = str(b.wa, 30) || (me && me.wa);
  if (!name || !wa || !str(b.model) || !str(b.start)) return bad('please fill in name, WhatsApp, where to and when');
  const t = rnd(12);
  const r = await db.prepare('INSERT INTO bookings (token,kind,member_id,name,wa,hotel,model,start,people,note) VALUES (?,?,?,?,?,?,?,?,?,?)')
    .bind(t, 'transport', me ? me.id : null, name, wa, str(b.hotel, 200), str(b.model, 60), str(b.start, 20), int(b.people), str(b.note, 500)).run();
  return J({ id: r.meta.last_row_id, token: t });
}

// A scooter booking: signed-in member, documents and terms done, dates free,
// price from the price list, then straight to payment (held 30 minutes).
async function rentBooking(request, env, db, b, url) {
  const me = await member(request, db);
  if (!me) return bad('please sign in to book a scooter', 401, { need: 'signin' });
  const chk = await riderCheck(db, me);
  if (!chk.profileOk || chk.missingDocs.length || !chk.termsOk) return bad('your rider details are not complete yet', 409, Object.assign({ need: 'rider' }, chk));
  const model = b.model, start = b.start, end = b.end, t0 = today();
  if (!BIKES[model]) return bad('unknown scooter');
  if (!isDate(start) || !isDate(end)) return bad('choose a pick-up and a return date');
  if (start < t0) return bad('the pick-up date is in the past');
  const n = days(start, end);
  if (n < 1) return bad('the return date must be after the pick-up date');
  if (n > RENTAL.maxDays) return bad('for more than ' + RENTAL.maxDays + ' days, please WhatsApp us');
  const free = await rangeFree(db, model, start, end);
  if (!free.ok) return bad(free.total ? 'sorry, this scooter is fully booked on ' + free.fullOn : 'this scooter is not in the fleet right now', 409, { fullOn: free.fullOn });
  const price = rentPrice(model, n);
  const red = price && b.usePoints ? await redeem(db, me, price) : { discount: 0, points: 0 };
  const online = payOn(env) && price && price - red.discount > 0;
  const t = rnd(12);
  const r = await db.prepare(`INSERT INTO bookings (token,kind,member_id,name,wa,hotel,model,start,end,status,hold_until,price,discount,points_used,note)
    VALUES (?,?,?,?,?,?,?,?,?,?,${online ? "datetime('now', ?)" : '?'},?,?,?,?)`)
    .bind(t, 'rent', me.id, me.name, me.wa, str(b.hotel, 200), model, start, end, online ? 'pending' : 'request', online ? '+' + RENTAL.holdMinutes + ' minutes' : null, price, red.discount, red.points, str(b.note, 500)).run();
  const id = r.meta.last_row_id;
  if (red.points) await db.prepare('INSERT INTO points_log (member_id, delta, reason, ref) VALUES (?,?,?,?)').bind(me.id, -red.points, 'Used on booking #' + id, 'spend:booking:' + id).run();
  let pay_url = null;
  if (online) pay_url = await invoiceFor(env, db, 'booking', id, t, price - red.discount, me, `TAKE ${BIKES[model].name}, ${start} to ${end} (#${id})`, url.origin + '/ride?booking=' + id + '&t=' + t);
  return J({ id, token: t, price, discount: red.discount, days: n, pay_url, status: online ? 'pending' : 'request' });
}

// ===================================================================== Xendit
async function xenditHook(request, env, db) {
  if (!payOn(env)) return bad('payments off', 404);
  if (!same(request.headers.get('x-callback-token') || '', env.XENDIT_CALLBACK_TOKEN)) return bad('forbidden', 403);
  const b = await body(request);
  const m = /^take-(order|booking)-(\d+)-/.exec(b.external_id || '');
  if (!m) return J({ ok: true, ignored: true });
  if (!['PAID', 'SETTLED'].includes(b.status)) return J({ ok: true, status: b.status });
  const ok = await markPaid(db, m[1], +m[2], int(b.paid_amount ?? b.amount), 'online');
  return J({ ok });
}

// ===================================================================== members
async function members(request, env, db, p, m, url) {
  const what = p[1];
  if (what === 'login' && m === 'POST') {
    const b = await body(request);
    const email = (str(b.email, 120) || '').toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return bad('please enter a valid email');
    if (!mailOn(env) && env.DEV_LOGIN_LINKS !== '1') return bad('member sign-in is not switched on yet', 409);
    const recent = await db.prepare("SELECT COUNT(*) n FROM login_tokens WHERE email=? AND created > datetime('now','-15 minutes')").bind(email).first();
    if (recent.n >= 3) return bad('too many sign-in emails: please wait 15 minutes', 429);
    const t = rnd(32), next = /^\/(ride)?$/.test(b.next || '') ? b.next : '/';
    await db.prepare("INSERT INTO login_tokens (hash,email,next,expires) VALUES (?,?,?,datetime('now','+20 minutes'))").bind(await sha(t), email, next).run();
    const link = url.origin + '/api/member/verify?t=' + t;
    if (mailOn(env)) {
      await sendMail(env, email, 'Your TAKE sign-in link',
        `<p>Hi,</p><p>Tap to sign in to TAKE Canggu. The link works once, for 20 minutes.</p><p><a href="${link}" style="background:#ff5a6e;color:#2a0308;padding:12px 22px;border-radius:999px;text-decoration:none;font-weight:700">Sign in to TAKE</a></p><p style="color:#888">If you did not ask for this, ignore this email.</p>`);
      return J({ sent: true });
    }
    return J({ sent: false, devLink: link }); // local testing only
  }
  if (what === 'verify' && m === 'GET') {
    const h = await sha(url.searchParams.get('t') || '');
    const tok = await db.prepare("SELECT * FROM login_tokens WHERE hash=? AND used=0 AND expires > datetime('now')").bind(h).first();
    if (!tok) return Response.redirect(url.origin + '/?signin=expired', 302);
    await db.prepare('UPDATE login_tokens SET used=1 WHERE hash=?').bind(h).run();
    await db.prepare('INSERT OR IGNORE INTO members (email) VALUES (?)').bind(tok.email).run();
    const mem = await db.prepare('SELECT id FROM members WHERE email=?').bind(tok.email).first();
    return new Response(null, { status: 302, headers: { Location: url.origin + (tok.next || '/') + '?member=1', 'Set-Cookie': await startSession(db, mem.id) } });
  }

  const me = await member(request, db);
  if (what === 'logout' && m === 'POST') {
    const c = (request.headers.get('cookie') || '').match(/take_s=([a-f0-9]{64})/);
    if (c) await db.prepare('DELETE FROM sessions WHERE hash=?').bind(await sha(c[1])).run();
    return J({ ok: true }, 200, { 'Set-Cookie': endSession() });
  }
  if (!me) return bad('not signed in', 401);
  if (m !== 'GET' && !isJson(request)) return bad('bad request', 400);

  if (what === 'me' && m === 'GET') {
    const [pts, hist, docs, orders, bookings, chk] = await Promise.all([
      balance(db, me.id),
      db.prepare('SELECT delta, reason, at FROM points_log WHERE member_id=? ORDER BY id DESC LIMIT 30').bind(me.id).all(),
      db.prepare('SELECT id, kind, mime, created FROM documents WHERE member_id=?').bind(me.id).all(),
      db.prepare('SELECT id, token, status, total, discount, paid, created FROM orders WHERE member_id=? ORDER BY id DESC LIMIT 20').bind(me.id).all(),
      db.prepare('SELECT id, token, kind, model, start, end, status, price, discount, paid FROM bookings WHERE member_id=? ORDER BY start DESC LIMIT 20').bind(me.id).all(),
      riderCheck(db, me),
    ]);
    return J({ member: { email: me.email, name: me.name, wa: me.wa, terms_version: me.terms_version, terms_at: me.terms_at },
      points: pts, history: hist.results, docs: docs.results, orders: orders.results, bookings: bookings.results, check: chk, loyalty: LOYALTY, rental: RENTAL });
  }
  if (what === 'me' && m === 'PATCH') {
    const b = await body(request);
    await db.prepare('UPDATE members SET name=COALESCE(?,name), wa=COALESCE(?,wa) WHERE id=?').bind(str(b.name, 80), str(b.wa, 30), me.id).run();
    return J({ ok: true });
  }
  if (what === 'terms' && m === 'POST') {
    const b = await body(request);
    if (b.version !== RENTAL.termsVersion) return bad('the terms have changed: please read the new version', 409);
    await db.prepare("UPDATE members SET terms_version=?, terms_at=datetime('now') WHERE id=?").bind(RENTAL.termsVersion, me.id).run();
    return J({ ok: true });
  }
  if (what === 'docs' && m === 'POST') {
    const b = await body(request);
    if (!RENTAL.requiredDocs.some((d) => d.id === b.kind)) return bad('unknown document');
    const mm = /^data:(image\/jpeg|image\/png|image\/webp|application\/pdf);base64,([A-Za-z0-9+/=]+)$/.exec(b.data || '');
    if (!mm) return bad('please send a photo (JPG or PNG) or a PDF');
    if (mm[2].length * 0.75 > DOC_MAX) return bad('the file is too big: please send a photo under 1 MB');
    await db.batch([
      db.prepare('DELETE FROM documents WHERE member_id=? AND kind=?').bind(me.id, b.kind),
      db.prepare('INSERT INTO documents (member_id, kind, mime, data) VALUES (?,?,?,?)').bind(me.id, b.kind, mm[1], mm[2]),
    ]);
    return J({ ok: true });
  }
  if (what === 'docs' && p[2] && m === 'GET') {
    const d = await db.prepare('SELECT mime, data FROM documents WHERE id=? AND member_id=?').bind(int(p[2]), me.id).first();
    return d ? docResponse(d) : bad('not found', 404);
  }
  if (what === 'docs' && p[2] && m === 'DELETE') {
    await db.prepare('DELETE FROM documents WHERE id=? AND member_id=?').bind(int(p[2]), me.id).run();
    return J({ ok: true });
  }
  return bad('not found', 404);
}

function docResponse(d) {
  const bin = Uint8Array.from(atob(d.data), (c) => c.charCodeAt(0));
  return new Response(bin, { headers: { 'content-type': d.mime, 'cache-control': 'private, no-store', 'x-robots-tag': 'noindex' } });
}

// ===================================================================== staff
async function staff(request, env, db, p, m, url) {
  if (!same(request.headers.get('x-staff-pin') || '', env.STAFF_PIN || '')) return bad('wrong PIN', 401);
  const what = p[1], id = int(p[2]);

  if (what === 'login') return J({ ok: true, pay: payOn(env) });

  if (what === 'board' && m === 'GET') {
    const [orders, bookings, bikes, last, docs] = await Promise.all([
      db.prepare("SELECT o.*, mb.email AS member_email FROM orders o LEFT JOIN members mb ON mb.id=o.member_id WHERE o.status NOT IN ('done','cancelled') OR o.created > datetime('now','-1 day') ORDER BY o.id DESC LIMIT 100").all(),
      db.prepare("SELECT b.*, mb.email AS member_email FROM bookings b LEFT JOIN members mb ON mb.id=b.member_id WHERE (b.status NOT IN ('returned','cancelled') AND NOT (b.status='pending' AND b.hold_until < datetime('now'))) OR b.in_at > datetime('now','-2 day') ORDER BY b.start, b.id LIMIT 300").all(),
      db.prepare('SELECT * FROM bikes ORDER BY model, plate').all(),
      db.prepare('SELECT p.booking_id, p.lat, p.lng, p.at FROM pings p JOIN (SELECT booking_id, MAX(id) mid FROM pings GROUP BY booking_id) x ON p.id = x.mid').all(),
      db.prepare('SELECT id, member_id, kind, created FROM documents').all(),
    ]);
    const byMember = {};
    docs.results.forEach((d) => { (byMember[d.member_id] = byMember[d.member_id] || []).push(d); });
    return J({ orders: orders.results.map((o) => ({ ...o, items: JSON.parse(o.items) })),
      bookings: bookings.results.map((b) => ({ ...b, docs: byMember[b.member_id] || [] })), bikes: bikes.results, last: last.results, today: today() });
  }

  // Fleet calendar: every bike, every booking in the window (same data the customer calendar uses).
  if (what === 'calendar' && m === 'GET') {
    let from = url.searchParams.get('from'); if (!isDate(from)) from = addDays(today(), -3);
    const n = Math.min(62, int(url.searchParams.get('days')) || 21), to = addDays(from, n);
    const [bikes, bk] = await Promise.all([
      db.prepare('SELECT id, model, plate, status FROM bikes ORDER BY model, plate').all(),
      db.prepare("SELECT id, token, model, bike_id, name, start, end, status, paid, hold_until FROM bookings WHERE kind='rent' AND status NOT IN ('cancelled') AND NOT (status='pending' AND hold_until < datetime('now')) AND start < ? AND (end > ? OR status='out')").bind(to, from).all(),
    ]);
    const models = {};
    for (const b of bikes.results) if (!models[b.model]) models[b.model] = await calendar(db, b.model, from, n);
    return J({ from, days: n, today: today(), bikes: bikes.results, bookings: bk.results, models });
  }

  if (what === 'takings' && m === 'GET') {
    const day = url.searchParams.get('day') || today();
    const f = await db.prepare("SELECT COUNT(*) n, COALESCE(SUM(total - discount),0) s FROM orders WHERE status!='cancelled' AND date(created)=?").bind(day).first();
    const r = await db.prepare("SELECT COUNT(*) n, COALESCE(SUM(price - discount),0) s FROM bookings WHERE status IN ('out','returned') AND date(out_at)=?").bind(day).first();
    const on = await db.prepare("SELECT COALESCE(SUM(total - discount),0) s FROM orders WHERE paid=1 AND pay='online' AND date(created)=?").bind(day).first();
    return J({ day, food: f, rentals: r, online: on.s });
  }

  if (what === 'orders' && id && m === 'PATCH') {
    const b = await body(request);
    const o = await db.prepare('SELECT * FROM orders WHERE id=?').bind(id).first();
    if (!o) return bad('not found', 404);
    const st = ['new', 'cooking', 'ready', 'done', 'cancelled'].includes(b.status) ? b.status : null;
    if (st) await db.prepare('UPDATE orders SET status=? WHERE id=?').bind(st, id).run();
    if (st === 'cancelled' && o.points_used) await refundPoints(db, o.member_id, o.points_used, 'order', id);
    if (b.paid) await markPaid(db, 'order', id, null, 'counter');
    return J({ ok: true });
  }

  if (what === 'bookings' && m === 'POST' && !id) { // walk-in booking made at the desk
    const b = await body(request), t = rnd(12);
    const kind = b.kind === 'transport' ? 'transport' : 'rent';
    if (kind === 'rent') {
      if (!BIKES[b.model] || !isDate(b.start) || !isDate(b.end) || days(b.start, b.end) < 1) return bad('choose a scooter and valid dates');
      const f = await rangeFree(db, b.model, b.start, b.end);
      if (!f.ok) return bad('fully booked on ' + (f.fullOn || 'those dates'), 409);
    }
    const price = int(b.price) ?? (kind === 'rent' ? rentPrice(b.model, days(b.start, b.end)) : null);
    const r = await db.prepare('INSERT INTO bookings (token,kind,name,wa,hotel,model,start,end,status,price,deposit) VALUES (?,?,?,?,?,?,?,?,?,?,?)')
      .bind(t, kind, str(b.name, 80), str(b.wa, 30), str(b.hotel, 200), str(b.model, 60), str(b.start, 20), str(b.end, 20), 'confirmed', price, int(b.deposit)).run();
    return J({ id: r.meta.last_row_id, token: t });
  }

  if (what === 'bookings' && id && m === 'PATCH') {
    const b = await body(request);
    const bk = await db.prepare('SELECT * FROM bookings WHERE id=?').bind(id).first();
    if (!bk) return bad('not found', 404);
    if (b.action === 'checkout') {
      const bike = await db.prepare('SELECT * FROM bikes WHERE id=?').bind(int(b.bike_id)).first();
      if (!bike) return bad('choose a bike');
      if (bike.status !== 'available') return bad('that bike is not available');
      await db.batch([
        db.prepare("UPDATE bookings SET status='out', bike_id=?, km_out=?, fuel_out=?, price=COALESCE(?,price), deposit=COALESCE(?,deposit), out_at=datetime('now') WHERE id=?")
          .bind(bike.id, int(b.km) ?? bike.km, str(b.fuel, 20), int(b.price), int(b.deposit), id),
        db.prepare("UPDATE bikes SET status='out', km=COALESCE(?,km) WHERE id=?").bind(int(b.km), bike.id),
      ]);
      return J({ ok: true, token: bk.token });
    }
    if (b.action === 'checkin') {
      const km = int(b.km);
      const q = [db.prepare("UPDATE bookings SET status='returned', km_in=?, fuel_in=?, staff_note=COALESCE(?,staff_note), in_at=datetime('now') WHERE id=?").bind(km, str(b.fuel, 20), str(b.note, 500), id),
        db.prepare('DELETE FROM pings WHERE booking_id=?').bind(id)]; // privacy: the trail goes once the bike is back
      if (bk.bike_id) q.push(db.prepare("UPDATE bikes SET status='available', km=COALESCE(?,km) WHERE id=?").bind(km, bk.bike_id));
      await db.batch(q);
      return J({ ok: true });
    }
    if (b.end && bk.kind === 'rent' && b.end > bk.end) { // extension: the extra days must be free
      const f = await rangeFree(db, bk.model, bk.end, b.end, id);
      if (!f.ok) return bad('cannot extend: fully booked on ' + f.fullOn, 409);
    }
    const st = ['request', 'confirmed', 'cancelled'].includes(b.status) ? b.status : null;
    await db.prepare('UPDATE bookings SET status=COALESCE(?,status), price=COALESCE(?,price), deposit=COALESCE(?,deposit), end=COALESCE(?,end), staff_note=COALESCE(?,staff_note) WHERE id=?')
      .bind(st, int(b.price), int(b.deposit), str(b.end, 20), str(b.staff_note, 500), id).run();
    if (st === 'cancelled' && bk.points_used) await refundPoints(db, bk.member_id, bk.points_used, 'booking', id);
    if (b.paid) await markPaid(db, 'booking', id, null, 'counter');
    return J({ ok: true });
  }

  if (what === 'pings' && id && m === 'GET') {
    const { results } = await db.prepare('SELECT lat,lng,at FROM pings WHERE booking_id=? ORDER BY id DESC LIMIT 300').bind(id).all();
    return J({ pings: results });
  }
  if (what === 'docs' && id && m === 'GET') {
    const d = await db.prepare('SELECT mime, data FROM documents WHERE id=?').bind(id).first();
    return d ? docResponse(d) : bad('not found', 404);
  }

  if (what === 'members' && m === 'GET' && !id) {
    const { results } = await db.prepare(`SELECT mb.id, mb.email, mb.name, mb.wa, mb.terms_version, mb.created,
      (SELECT COALESCE(SUM(delta),0) FROM points_log WHERE member_id=mb.id) AS points,
      (SELECT COUNT(*) FROM documents WHERE member_id=mb.id) AS docs FROM members mb ORDER BY mb.id DESC LIMIT 500`).all();
    return J({ members: results, termsVersion: RENTAL.termsVersion, required: RENTAL.requiredDocs.length });
  }
  if (what === 'members' && id && p[3] === 'points' && m === 'POST') {
    const b = await body(request), d = int(b.delta);
    if (!d) return bad('enter a number of points, e.g. 20 or -20');
    await db.prepare('INSERT INTO points_log (member_id, delta, reason, ref) VALUES (?,?,?,?)').bind(id, d, str(b.reason, 120) || 'Adjusted by staff', 'staff:' + rnd(6)).run();
    return J({ ok: true });
  }

  if (what === 'bikes' && m === 'POST' && !id) {
    const b = await body(request);
    if (!BIKES[b.model]) return bad('choose a model');
    const r = await db.prepare('INSERT INTO bikes (model,plate,km,service_every,last_service_km) VALUES (?,?,?,?,?)')
      .bind(b.model, str(b.plate, 20), int(b.km) || 0, int(b.service_every) || 2000, int(b.km) || 0).run();
    return J({ id: r.meta.last_row_id });
  }
  if (what === 'bikes' && id && m === 'PATCH') {
    const b = await body(request);
    const st = ['available', 'out', 'service'].includes(b.status) ? b.status : null;
    if (b.serviced) {
      const bike = await db.prepare('SELECT km FROM bikes WHERE id=?').bind(id).first();
      const km = int(b.km) ?? (bike && bike.km);
      await db.batch([
        db.prepare("UPDATE bikes SET last_service_km=?, km=?, status=CASE WHEN status='service' THEN 'available' ELSE status END WHERE id=?").bind(km, km, id),
        db.prepare('INSERT INTO maintenance (bike_id,km,what,cost) VALUES (?,?,?,?)').bind(id, km, str(b.what, 200) || 'Oil change', int(b.cost)),
      ]);
      return J({ ok: true });
    }
    await db.prepare('UPDATE bikes SET status=COALESCE(?,status), plate=COALESCE(?,plate), km=COALESCE(?,km), notes=COALESCE(?,notes) WHERE id=?')
      .bind(st, str(b.plate, 20), int(b.km), str(b.notes, 300), id).run();
    return J({ ok: true });
  }
  if (what === 'bikes' && id && m === 'DELETE') {
    await db.prepare("DELETE FROM bikes WHERE id=? AND status!='out'").bind(id).run();
    return J({ ok: true });
  }
  if (what === 'maintenance' && m === 'GET') {
    const { results } = await db.prepare('SELECT m.*, b.model, b.plate FROM maintenance m LEFT JOIN bikes b ON b.id=m.bike_id ORDER BY m.id DESC LIMIT 100').all();
    return J({ log: results });
  }
  return bad('not found', 404);
}

async function refundPoints(db, memberId, pts, kind, id) {
  if (!memberId || !pts) return;
  await db.prepare('INSERT OR IGNORE INTO points_log (member_id, delta, reason, ref) VALUES (?,?,?,?)').bind(memberId, pts, 'Returned: ' + kind + ' #' + id + ' cancelled', 'refund:' + kind + ':' + id).run();
}
