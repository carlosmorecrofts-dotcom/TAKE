// TAKE Canggu API (Cloudflare Pages Function, D1 binding DB, secret STAFF_PIN).
// Public:  GET bikes, POST orders, GET orders/:id?t=, POST bookings, GET bookings/:id?t=, POST ping
// Staff (header x-staff-pin): everything under /api/staff/...
const J = (data, status = 200) => new Response(JSON.stringify(data), {
  status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
});
const bad = (msg, status = 400) => J({ error: msg }, status);
const token = () => [...crypto.getRandomValues(new Uint8Array(12))].map((b) => b.toString(16).padStart(2, '0')).join('');
const str = (v, n = 200) => (v == null ? null : String(v).slice(0, n).trim() || null);
const int = (v) => (v === '' || v == null || isNaN(+v) ? null : Math.round(+v));

// Prices live in one place so a customer cannot send their own.
import { MENU } from './_menu.js';

async function body(req) { try { return await req.json(); } catch { return {}; } }

function samePin(a, b) {
  if (!a || !b || a.length !== b.length) return false;
  let d = 0; for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}

export async function onRequest({ request, env, params }) {
  const db = env.DB;
  if (!db) return bad('database not bound', 500);
  const url = new URL(request.url);
  const p = [].concat(params.path || []);
  const m = request.method;

  try {
    // ---------- public ----------
    if (p[0] === 'bikes' && m === 'GET') {
      const { results } = await db.prepare(
        "SELECT model, SUM(status='available') AS free, COUNT(*) AS total FROM bikes GROUP BY model").all();
      return J({ models: results });
    }

    if (p[0] === 'orders' && m === 'POST' && !p[1]) {
      const b = await body(request);
      const items = (Array.isArray(b.items) ? b.items : []).slice(0, 40).map((it) => {
        const item = MENU[it.id]; const qty = Math.min(20, Math.max(1, int(it.qty) || 1));
        return item ? { id: it.id, name: item.name, price: item.price, qty } : null;
      }).filter(Boolean);
      if (!items.length) return bad('empty order');
      if (!str(b.name) || !str(b.wa)) return bad('name and WhatsApp are needed');
      const mode = ['dine', 'pickup', 'delivery'].includes(b.mode) ? b.mode : 'pickup';
      if (mode === 'delivery' && !str(b.address)) return bad('delivery address is needed');
      const total = items.reduce((s, i) => s + (i.price || 0) * i.qty, 0);
      const t = token();
      const r = await db.prepare(
        'INSERT INTO orders (token,name,wa,mode,address,tbl,items,total,note) VALUES (?,?,?,?,?,?,?,?,?)')
        .bind(t, str(b.name, 80), str(b.wa, 30), mode, str(b.address, 300), str(b.tbl, 10), JSON.stringify(items), total, str(b.note, 500)).run();
      return J({ id: r.meta.last_row_id, token: t, total, items });
    }
    if (p[0] === 'orders' && p[1] && m === 'GET') {
      const o = await db.prepare('SELECT id,status,mode,items,total,created FROM orders WHERE id=? AND token=?')
        .bind(int(p[1]), url.searchParams.get('t') || '').first();
      return o ? J({ ...o, items: JSON.parse(o.items) }) : bad('not found', 404);
    }

    if (p[0] === 'bookings' && m === 'POST' && !p[1]) {
      const b = await body(request);
      const kind = b.kind === 'transport' ? 'transport' : 'rent';
      if (!str(b.name) || !str(b.wa) || !str(b.model) || !str(b.start)) return bad('please fill in name, WhatsApp, what and when');
      if (kind === 'rent' && (!str(b.end) || b.end < b.start)) return bad('return date must be after pick-up date');
      const t = token();
      const r = await db.prepare(
        'INSERT INTO bookings (token,kind,name,wa,hotel,model,start,end,people,note) VALUES (?,?,?,?,?,?,?,?,?,?)')
        .bind(t, kind, str(b.name, 80), str(b.wa, 30), str(b.hotel, 200), str(b.model, 60), str(b.start, 20), str(b.end, 20), int(b.people), str(b.note, 500)).run();
      return J({ id: r.meta.last_row_id, token: t });
    }
    if (p[0] === 'bookings' && p[1] && m === 'GET') {
      const o = await db.prepare('SELECT id,kind,model,start,end,status FROM bookings WHERE id=? AND token=?')
        .bind(int(p[1]), url.searchParams.get('t') || '').first();
      return o ? J(o) : bad('not found', 404);
    }

    // Live location from the renter's phone, only while the bike is out.
    if (p[0] === 'ping' && m === 'POST') {
      const b = await body(request);
      const bk = await db.prepare("SELECT id,status FROM bookings WHERE id=? AND token=?").bind(int(b.id), str(b.t, 40) || '').first();
      if (!bk) return bad('not found', 404);
      if (bk.status !== 'out') return bad('sharing only works while the bike is out', 409);
      const lat = +b.lat, lng = +b.lng;
      if (!(Math.abs(lat) <= 90 && Math.abs(lng) <= 180)) return bad('bad position');
      await db.prepare('INSERT INTO pings (booking_id,lat,lng,acc) VALUES (?,?,?,?)').bind(bk.id, lat, lng, +b.acc || null).run();
      return J({ ok: true });
    }

    // ---------- staff ----------
    if (p[0] !== 'staff') return bad('not found', 404);
    if (!samePin(request.headers.get('x-staff-pin') || '', env.STAFF_PIN || '')) return bad('wrong PIN', 401);
    const what = p[1], id = int(p[2]);

    if (what === 'login') return J({ ok: true });

    if (what === 'board' && m === 'GET') {
      const [orders, bookings, bikes, last] = await Promise.all([
        db.prepare("SELECT * FROM orders WHERE status NOT IN ('done','cancelled') OR created > datetime('now','-1 day') ORDER BY id DESC LIMIT 100").all(),
        db.prepare("SELECT * FROM bookings WHERE status NOT IN ('returned','cancelled') OR in_at > datetime('now','-2 day') ORDER BY start, id LIMIT 300").all(),
        db.prepare('SELECT * FROM bikes ORDER BY model, plate').all(),
        db.prepare('SELECT p.booking_id, p.lat, p.lng, p.at FROM pings p JOIN (SELECT booking_id, MAX(id) mid FROM pings GROUP BY booking_id) x ON p.id = x.mid').all(),
      ]);
      return J({ orders: orders.results.map((o) => ({ ...o, items: JSON.parse(o.items) })), bookings: bookings.results, bikes: bikes.results, last: last.results });
    }

    if (what === 'takings' && m === 'GET') {
      const day = url.searchParams.get('day') || new Date().toISOString().slice(0, 10);
      const f = await db.prepare("SELECT COUNT(*) n, COALESCE(SUM(total),0) s FROM orders WHERE status!='cancelled' AND date(created)=?").bind(day).first();
      const r = await db.prepare("SELECT COUNT(*) n, COALESCE(SUM(price),0) s FROM bookings WHERE status IN ('out','returned') AND date(out_at)=?").bind(day).first();
      return J({ day, food: f, rentals: r });
    }

    if (what === 'orders' && id && m === 'PATCH') {
      const b = await body(request);
      const st = ['new', 'cooking', 'ready', 'done', 'cancelled'].includes(b.status) ? b.status : null;
      await db.prepare('UPDATE orders SET status=COALESCE(?,status), paid=COALESCE(?,paid) WHERE id=?').bind(st, b.paid == null ? null : b.paid ? 1 : 0, id).run();
      return J({ ok: true });
    }

    if (what === 'bookings' && m === 'POST' && !id) { // walk-in booking made by staff
      const b = await body(request); const t = token();
      const r = await db.prepare('INSERT INTO bookings (token,kind,name,wa,hotel,model,start,end,status,price,deposit) VALUES (?,?,?,?,?,?,?,?,?,?,?)')
        .bind(t, b.kind === 'transport' ? 'transport' : 'rent', str(b.name, 80), str(b.wa, 30), str(b.hotel, 200), str(b.model, 60), str(b.start, 20), str(b.end, 20), 'confirmed', int(b.price), int(b.deposit)).run();
      return J({ id: r.meta.last_row_id, token: t });
    }

    if (what === 'bookings' && id && m === 'PATCH') {
      const b = await body(request);
      const bk = await db.prepare('SELECT * FROM bookings WHERE id=?').bind(id).first();
      if (!bk) return bad('not found', 404);
      const action = b.action;
      if (action === 'checkout') {
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
      if (action === 'checkin') {
        const km = int(b.km);
        await db.batch([
          db.prepare("UPDATE bookings SET status='returned', km_in=?, fuel_in=?, staff_note=?, in_at=datetime('now') WHERE id=?").bind(km, str(b.fuel, 20), str(b.note, 500), id),
          db.prepare("UPDATE bikes SET status='available', km=COALESCE(?,km) WHERE id=?").bind(km, bk.bike_id),
          db.prepare('DELETE FROM pings WHERE booking_id=?').bind(id), // privacy: forget the trail once it is back
        ]);
        return J({ ok: true });
      }
      const st = ['request', 'confirmed', 'cancelled'].includes(b.status) ? b.status : null;
      await db.prepare('UPDATE bookings SET status=COALESCE(?,status), price=COALESCE(?,price), deposit=COALESCE(?,deposit), paid=COALESCE(?,paid), end=COALESCE(?,end), staff_note=COALESCE(?,staff_note) WHERE id=?')
        .bind(st, int(b.price), int(b.deposit), b.paid == null ? null : b.paid ? 1 : 0, str(b.end, 20), str(b.staff_note, 500), id).run();
      return J({ ok: true });
    }

    if (what === 'pings' && id && m === 'GET') {
      const { results } = await db.prepare('SELECT lat,lng,at FROM pings WHERE booking_id=? ORDER BY id DESC LIMIT 300').bind(id).all();
      return J({ pings: results });
    }

    if (what === 'bikes' && m === 'POST' && !id) {
      const b = await body(request);
      if (!str(b.model)) return bad('model is needed');
      const r = await db.prepare('INSERT INTO bikes (model,plate,km,service_every,last_service_km) VALUES (?,?,?,?,?)')
        .bind(str(b.model, 40), str(b.plate, 20), int(b.km) || 0, int(b.service_every) || 2000, int(b.km) || 0).run();
      return J({ id: r.meta.last_row_id });
    }
    if (what === 'bikes' && id && m === 'PATCH') {
      const b = await body(request);
      const st = ['available', 'out', 'service'].includes(b.status) ? b.status : null;
      if (b.serviced) {
        const bike = await db.prepare('SELECT km FROM bikes WHERE id=?').bind(id).first();
        const km = int(b.km) ?? bike?.km;
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
  } catch (e) {
    return bad('server error: ' + (e && e.message ? e.message : e), 500);
  }
}
