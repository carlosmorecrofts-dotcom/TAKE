-- TAKE Canggu: D1 schema. Apply: npx wrangler d1 execute take --remote --file schema.sql
CREATE TABLE IF NOT EXISTS bikes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  model TEXT NOT NULL,           -- must match a scooter id in data/catalogue.json
  plate TEXT,
  status TEXT NOT NULL DEFAULT 'available',  -- available | out | service
  km INTEGER DEFAULT 0,
  service_every INTEGER DEFAULT 2000,       -- oil change interval in km
  last_service_km INTEGER DEFAULT 0,
  notes TEXT
);
CREATE TABLE IF NOT EXISTS members (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL UNIQUE,
  name TEXT, wa TEXT,
  terms_version TEXT, terms_at TEXT,       -- the terms they accepted, and when
  created TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS login_tokens (   -- email sign-in links, stored hashed
  hash TEXT PRIMARY KEY, email TEXT NOT NULL, next TEXT,
  expires TEXT NOT NULL, used INTEGER DEFAULT 0,
  created TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS sessions (       -- signed-in browsers, stored hashed
  hash TEXT PRIMARY KEY, member_id INTEGER NOT NULL, expires TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS documents (      -- passport, driving licence: only the member and staff can open them
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  member_id INTEGER NOT NULL, kind TEXT NOT NULL, mime TEXT NOT NULL,
  data TEXT NOT NULL,                       -- base64, compressed on the phone first
  created TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS documents_m ON documents(member_id);
CREATE TABLE IF NOT EXISTS points_log (     -- the points balance is the sum of this
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  member_id INTEGER NOT NULL, delta INTEGER NOT NULL, reason TEXT,
  ref TEXT UNIQUE,                          -- 'earn:order:12' etc: never counted twice
  at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS points_m ON points_log(member_id);
CREATE TABLE IF NOT EXISTS bookings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  token TEXT NOT NULL,
  kind TEXT NOT NULL DEFAULT 'rent', -- rent | transport
  member_id INTEGER,
  name TEXT, wa TEXT, hotel TEXT,
  model TEXT,                        -- scooter id, or transport destination
  bike_id INTEGER,
  start TEXT, end TEXT,              -- rent: pick-up date, return date (YYYY-MM-DD). transport: date + time
  people INTEGER,
  status TEXT NOT NULL DEFAULT 'request', -- pending (awaiting payment) | request | confirmed | out | returned | cancelled
  hold_until TEXT,                   -- a pending booking holds a bike until then
  price INTEGER, discount INTEGER DEFAULT 0, points_used INTEGER DEFAULT 0,
  deposit INTEGER, paid INTEGER DEFAULT 0, pay TEXT, invoice_id TEXT, invoice_url TEXT,
  km_out INTEGER, km_in INTEGER, fuel_out TEXT, fuel_in TEXT,
  note TEXT, staff_note TEXT,
  created TEXT NOT NULL DEFAULT (datetime('now')),
  out_at TEXT, in_at TEXT
);
CREATE INDEX IF NOT EXISTS bookings_m ON bookings(model, start, end);
CREATE TABLE IF NOT EXISTS orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  token TEXT NOT NULL,
  member_id INTEGER,
  name TEXT, wa TEXT,
  mode TEXT,                 -- dine | pickup | delivery
  address TEXT, tbl TEXT,
  items TEXT NOT NULL,       -- JSON [{id,name,price,qty}]
  total INTEGER NOT NULL, discount INTEGER DEFAULT 0, points_used INTEGER DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'new', -- new | cooking | ready | done | cancelled
  paid INTEGER DEFAULT 0, pay TEXT, invoice_id TEXT, invoice_url TEXT,
  note TEXT,
  created TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS pings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  booking_id INTEGER NOT NULL,
  lat REAL NOT NULL, lng REAL NOT NULL, acc REAL,
  at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS pings_b ON pings(booking_id, at);
CREATE TABLE IF NOT EXISTS maintenance (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  bike_id INTEGER NOT NULL,
  km INTEGER, what TEXT, cost INTEGER,
  at TEXT NOT NULL DEFAULT (datetime('now'))
);
