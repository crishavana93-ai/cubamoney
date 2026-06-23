import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = process.env.DB_PATH || path.join(__dirname, '..', 'data.sqlite');

const db = new Database(dbPath);
// WAL is best on normal disks; some network/virtual filesystems don't support it,
// so fall back to the default rollback journal if WAL can't be enabled.
try {
  db.pragma('journal_mode = WAL');
} catch {
  try { db.pragma('journal_mode = DELETE'); } catch { /* use default */ }
}
db.pragma('foreign_keys = ON');

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  email         TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  full_name     TEXT NOT NULL,
  phone         TEXT,
  country       TEXT,
  kyc_status    TEXT NOT NULL DEFAULT 'unverified',  -- unverified | pending | verified
  role          TEXT NOT NULL DEFAULT 'user',         -- user | admin
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS recipients (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id       INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  full_name     TEXT NOT NULL,
  phone         TEXT,
  province      TEXT,
  payout_method TEXT NOT NULL,        -- mlc_bank | mlc_card | usd_cash | cup_cash | cubacel
  details       TEXT,                 -- JSON: card number / address / bank ...
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Configurable payout products: exchange rate + fee model per method
CREATE TABLE IF NOT EXISTS rates (
  payout_method   TEXT PRIMARY KEY,   -- mlc_bank | mlc_card | usd_cash | cup_cash | cubacel
  label           TEXT NOT NULL,
  payout_currency TEXT NOT NULL,       -- MLC | USD | CUP
  rate            REAL NOT NULL,       -- payout units per 1 USD sent
  fee_pct         REAL NOT NULL DEFAULT 0,   -- % of send amount
  fee_fixed       REAL NOT NULL DEFAULT 0,   -- fixed fee in send currency
  min_send        REAL NOT NULL DEFAULT 10,
  max_send        REAL NOT NULL DEFAULT 2000,
  eta             TEXT,                -- human delivery estimate
  active          INTEGER NOT NULL DEFAULT 1,
  updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS orders (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  ref             TEXT UNIQUE NOT NULL,
  user_id         INTEGER NOT NULL REFERENCES users(id),
  recipient_id    INTEGER NOT NULL REFERENCES recipients(id),
  send_currency   TEXT NOT NULL DEFAULT 'USD',
  send_amount     REAL NOT NULL,
  fee             REAL NOT NULL,
  total_charge    REAL NOT NULL,      -- send_amount + fee
  payout_method   TEXT NOT NULL,
  payout_currency TEXT NOT NULL,
  fx_rate         REAL NOT NULL,
  payout_amount   REAL NOT NULL,
  payin_method    TEXT,               -- paypal | iban
  status          TEXT NOT NULL DEFAULT 'pending_payment',
                  -- pending_payment | awaiting_transfer | paid | processing | completed | cancelled | failed
  paypal_order_id TEXT,
  paypal_capture_id TEXT,
  notes           TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS settings (
  key   TEXT PRIMARY KEY,
  value TEXT
);
`);

export default db;
