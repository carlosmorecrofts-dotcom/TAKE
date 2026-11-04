ALTER TABLE members ADD COLUMN pass_hash TEXT;
ALTER TABLE members ADD COLUMN pass_salt TEXT;
ALTER TABLE orders ADD COLUMN pay_claimed TEXT;
ALTER TABLE bookings ADD COLUMN pay_claimed TEXT;
CREATE TABLE IF NOT EXISTS signin_fails (email TEXT NOT NULL, at TEXT NOT NULL DEFAULT (datetime('now')));
CREATE INDEX IF NOT EXISTS signin_fails_e ON signin_fails(email, at);
