-- TAKE Canggu: D1 schema. Apply: npx wrangler d1 execute take --remote --file schema.sql
CREATE TABLE IF NOT EXISTS bikes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  model TEXT NOT NULL,           -- must match a model id in site/assets/js/data.js
  plate TEXT,
  status TEXT NOT NULL DEFAULT 'available',  -- available | out | service
  km INTEGER DEFAULT 0,
  service_every INTEGER DEFAULT 2000,       -- oil change interval in km
  last_service_km INTEGER DEFAULT 0,
  notes TEXT
);
CREATE TABLE IF NOT EXISTS bookings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  token TEXT NOT NULL,
  kind TEXT NOT NULL DEFAULT 'rent', -- rent | transport
  name TEXT, wa TEXT, hotel TEXT,
  model TEXT,                        -- requested bike model, or transport destination
  bike_id INTEGER,
  start TEXT, end TEXT,              -- ISO dates (rent) or date+time (transport)
  people INTEGER,
  status TEXT NOT NULL DEFAULT 'request', -- request | confirmed | out | returned | cancelled
  price INTEGER, deposit INTEGER, paid INTEGER DEFAULT 0,
  km_out INTEGER, km_in INTEGER, fuel_out TEXT, fuel_in TEXT,
  note TEXT, staff_note TEXT,
  created TEXT NOT NULL DEFAULT (datetime('now')),
  out_at TEXT, in_at TEXT
);
CREATE TABLE IF NOT EXISTS orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  token TEXT NOT NULL,
  name TEXT, wa TEXT,
  mode TEXT,                 -- dine | pickup | delivery
  address TEXT, tbl TEXT,
  items TEXT NOT NULL,       -- JSON [{id,name,price,qty}]
  total INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'new', -- new | cooking | ready | done | cancelled
  paid INTEGER DEFAULT 0,
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
