// Shared server logic for the TAKE API: responses, sessions, availability,
// prices, points and the Xendit payment page. Prices and rules come only from
// _catalogue.js (generated from data/catalogue.json), never from the browser.
import { MENU, BIKES, LOYALTY, RENTAL } from './_catalogue.js';
export { MENU, BIKES, LOYALTY, RENTAL };

export const J = (data, status = 200, headers = {}) => new Response(JSON.stringify(data), {
  status, headers: Object.assign({ 'content-type': 'application/json', 'cache-control': 'no-store' }, headers),
});
export const bad = (msg, status = 400, extra) => J(Object.assign({ error: msg }, extra || {}), status);
export const rnd = (n = 16) => [...crypto.getRandomValues(new Uint8Array(n))].map((b) => b.toString(16).padStart(2, '0')).join('');
export const str = (v, n = 200) => (v == null ? null : String(v).slice(0, n).trim() || null);
export const int = (v) => (v === '' || v == null || isNaN(+v) ? null : Math.round(+v));
export async function body(req) { try { return await req.json(); } catch { return {}; } }
export async function sha(s) {
  const d = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
  return [...new Uint8Array(d)].map((b) => b.toString(16).padStart(2, '0')).join('');
}
export function same(a, b) {
  if (!a || !b || a.length !== b.length) return false;
  let d = 0; for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}
// A cross-site page cannot send a JSON body without asking first, so writes
// from the member area must carry it: that closes the cookie CSRF gap.
export const isJson = (req) => (req.headers.get('content-type') || '').includes('application/json');

// ---------------- dates (YYYY-MM-DD strings, Bali time)
export const today = () => new Date(Date.now() + 8 * 3600e3).toISOString().slice(0, 10);
export const addDays = (d, n) => new Date(Date.parse(d + 'T00:00:00Z') + n * 864e5).toISOString().slice(0, 10);
export const days = (a, b) => Math.round((Date.parse(b + 'T00:00:00Z') - Date.parse(a + 'T00:00:00Z')) / 864e5);
export const isDate = (s) => /^\d{4}-\d{2}-\d{2}$/.test(s || '') && !isNaN(Date.parse(s + 'T00:00:00Z'));

// ---------------- members
const COOKIE = 'take_s';
export async function member(req, db) {
  const m = (req.headers.get('cookie') || '').match(/(?:^|;\s*)take_s=([a-f0-9]{64})/);
  if (!m) return null;
  return db.prepare("SELECT m.* FROM sessions s JOIN members m ON m.id = s.member_id WHERE s.hash = ? AND s.expires > datetime('now')")
    .bind(await sha(m[1])).first();
}
export async function startSession(db, memberId) {
  const t = rnd(32);
  await db.prepare("INSERT INTO sessions (hash, member_id, expires) VALUES (?, ?, datetime('now', '+30 days'))").bind(await sha(t), memberId).run();
  return `${COOKIE}=${t}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=2592000`;
}
export const endSession = () => `${COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`;
export async function balance(db, memberId) {
  const r = await db.prepare('SELECT COALESCE(SUM(delta), 0) AS p FROM points_log WHERE member_id = ?').bind(memberId).first();
  return r ? r.p : 0;
}
// What still stands between a member and booking a scooter.
export async function riderCheck(db, m) {
  const { results } = await db.prepare('SELECT kind FROM documents WHERE member_id = ?').bind(m.id).all();
  const have = new Set(results.map((r) => r.kind));
  return {
    missingDocs: RENTAL.requiredDocs.filter((d) => !have.has(d.id)).map((d) => d.id),
    termsOk: m.terms_version === RENTAL.termsVersion,
    profileOk: !!(m.name && m.wa),
  };
}

// ---------------- points: earned only when money is actually received
export const pointsFor = (idr) => Math.floor(Math.max(0, idr || 0) / LOYALTY.perIDR);
export async function award(db, memberId, amount, ref, reason) {
  const p = pointsFor(amount);
  if (!memberId || p <= 0) return 0;
  const r = await db.prepare('INSERT OR IGNORE INTO points_log (member_id, delta, reason, ref) VALUES (?, ?, ?, ?)').bind(memberId, p, reason, ref).run();
  return r.meta.changes ? p : 0;
}

// ---------------- scooter availability, per model and per day
// A booking holds a bike from its pick-up date up to (not including) its return
// date. A bike still out after its return date holds it until today + 1.
const HOLDING = "(status IN ('request','confirmed','out') OR (status = 'pending' AND hold_until > datetime('now')))";
export async function fleetSize(db, model) {
  const r = await db.prepare("SELECT COUNT(*) AS n FROM bikes WHERE model = ? AND status IN ('available','out')").bind(model).first();
  return r ? r.n : 0;
}
export async function calendar(db, model, from, n, exceptId) {
  const to = addDays(from, n), t = today();
  const total = await fleetSize(db, model);
  const { results } = await db.prepare(`SELECT id, start, end, status FROM bookings WHERE kind = 'rent' AND model = ? AND ${HOLDING}
    AND start < ? AND (end > ? OR status = 'out') AND id != ?`).bind(model, to, from, exceptId || 0).all();
  const out = [];
  for (let i = 0; i < n; i++) {
    const d = addDays(from, i);
    let used = 0;
    for (const b of results) {
      const end = b.status === 'out' && b.end <= t ? addDays(t, 1) : b.end;
      if (b.start <= d && d < end) used++;
    }
    out.push({ date: d, free: Math.max(0, total - used), past: d < t });
  }
  return { model, total, days: out };
}
export async function rangeFree(db, model, start, end, exceptId) {
  const c = await calendar(db, model, start, days(start, end), exceptId);
  const full = c.days.find((d) => d.free < 1);
  return { ok: c.total > 0 && !full, total: c.total, fullOn: full ? full.date : null };
}
// Rental price: day rate x days; from 7 days, full weeks at the week rate plus the
// extra days at the day rate, never more than one more full week. book.js uses the same rule.
export function rentPrice(model, n) {
  const b = BIKES[model];
  if (!b || !b.day) return null;
  if (!b.week || n < 7) return b.day * n;
  return Math.min(Math.floor(n / 7) * b.week + (n % 7) * b.day, Math.ceil(n / 7) * b.week);
}

// ---------------- payments (Xendit hosted invoice page)
export const payOn = (env) => !!(env.XENDIT_SECRET_KEY && env.XENDIT_CALLBACK_TOKEN);
const xAuth = (env) => 'Basic ' + btoa(env.XENDIT_SECRET_KEY + ':');
export async function createInvoice(env, { ref, amount, email, description, back }) {
  const r = await fetch('https://api.xendit.co/v2/invoices', {
    method: 'POST', headers: { Authorization: xAuth(env), 'content-type': 'application/json' },
    body: JSON.stringify({ external_id: ref, amount, currency: 'IDR', description, payer_email: email || undefined,
      invoice_duration: RENTAL.holdMinutes * 60, success_redirect_url: back, failure_redirect_url: back }),
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || !j.invoice_url) throw new Error('payment page could not be opened: ' + (j.message || r.status));
  return { id: j.id, url: j.invoice_url };
}
export async function invoiceStatus(env, id) {
  const r = await fetch('https://api.xendit.co/v2/invoices/' + encodeURIComponent(id), { headers: { Authorization: xAuth(env) } });
  const j = await r.json().catch(() => ({}));
  return r.ok ? { status: j.status, amount: j.amount, paid: j.paid_amount } : null;
}
// One place that turns a received payment into a paid order or booking (and points).
export async function markPaid(db, kind, id, amountReceived, via) {
  if (kind === 'order') {
    const o = await db.prepare('SELECT * FROM orders WHERE id = ?').bind(id).first();
    if (!o) return false;
    const due = o.total - (o.discount || 0);
    if (amountReceived != null && amountReceived < due) return false;
    await db.prepare('UPDATE orders SET paid = 1, pay = ? WHERE id = ?').bind(via, id).run();
    await award(db, o.member_id, due, 'earn:order:' + id, 'Order #' + id);
    return true;
  }
  const b = await db.prepare('SELECT * FROM bookings WHERE id = ?').bind(id).first();
  if (!b) return false;
  const due = (b.price || 0) - (b.discount || 0);
  if (amountReceived != null && amountReceived < due) return false;
  await db.prepare("UPDATE bookings SET paid = 1, pay = ?, status = CASE WHEN status IN ('pending','request') THEN 'confirmed' ELSE status END, hold_until = NULL WHERE id = ?").bind(via, id).run();
  await award(db, b.member_id, due, 'earn:booking:' + id, 'Booking #' + id);
  return true;
}

// ---------------- email
export const mailOn = (env) => !!(env.RESEND_API_KEY && env.MAIL_FROM);
export async function sendMail(env, to, subject, html) {
  const r = await fetch('https://api.resend.com/emails', {
    method: 'POST', headers: { Authorization: 'Bearer ' + env.RESEND_API_KEY, 'content-type': 'application/json' },
    body: JSON.stringify({ from: env.MAIL_FROM, to: [to], subject, html }),
  });
  if (!r.ok) throw new Error('email could not be sent (' + r.status + ')');
}
