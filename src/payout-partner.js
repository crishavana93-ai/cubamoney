// Mock Cuba payout partner. Simulates a real payout provider's lifecycle:
//   queued → sent → delivered   (or failed)
// A background worker advances payouts on a timer so a demo shows live
// progression; admins can also step a payout manually.

import db from './db.js';
import { setOrderStatus } from './orders.js';

db.exec(`
CREATE TABLE IF NOT EXISTS payouts (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  ref          TEXT UNIQUE NOT NULL,
  order_id     INTEGER NOT NULL UNIQUE REFERENCES orders(id),
  provider     TEXT NOT NULL DEFAULT 'cuba_mock',
  method       TEXT NOT NULL,
  amount       REAL NOT NULL,
  currency     TEXT NOT NULL,
  status       TEXT NOT NULL DEFAULT 'queued',   -- queued | sent | delivered | failed
  partner_ref  TEXT,
  next_at      TEXT,                               -- when the worker should advance it
  sent_at      TEXT,
  delivered_at TEXT,
  error        TEXT,
  created_at   TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at   TEXT NOT NULL DEFAULT (datetime('now'))
);
`);

// Demo timings (ms). Short by default so a live demo shows movement.
const SENT_MS = Number(process.env.PAYOUT_SIM_SENT_MS || 8_000);
const DELIVERED_MS = Number(process.env.PAYOUT_SIM_DELIVERED_MS || 20_000);

const iso = (ms) => new Date(Date.now() + ms).toISOString();
function makeRef() {
  return `PO-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
}

// Called when an order is paid. Creates the payout and moves the order to processing.
export function enqueuePayout(order) {
  const existing = db.prepare('SELECT * FROM payouts WHERE order_id = ?').get(order.id);
  if (existing) return existing;
  const ref = makeRef();
  db.prepare(
    `INSERT INTO payouts (ref, order_id, method, amount, currency, status, next_at)
     VALUES (?,?,?,?,?,'queued',?)`
  ).run(ref, order.id, order.payout_method, order.payout_amount, order.payout_currency, iso(SENT_MS));
  db.prepare("UPDATE orders SET status = 'processing', updated_at = datetime('now') WHERE id = ?").run(order.id);
  return db.prepare('SELECT * FROM payouts WHERE ref = ?').get(ref);
}

// Advance one step in the partner lifecycle.
export function advancePayout(payoutId) {
  const p = db.prepare('SELECT * FROM payouts WHERE id = ?').get(payoutId);
  if (!p) return null;
  if (p.status === 'queued') {
    db.prepare(`UPDATE payouts SET status='sent', partner_ref=?, sent_at=datetime('now'),
                next_at=?, updated_at=datetime('now') WHERE id=?`)
      .run(`CUBA-${Math.random().toString(36).slice(2, 10).toUpperCase()}`, iso(DELIVERED_MS), p.id);
  } else if (p.status === 'sent') {
    db.prepare(`UPDATE payouts SET status='delivered', delivered_at=datetime('now'),
                next_at=NULL, updated_at=datetime('now') WHERE id=?`).run(p.id);
    setOrderStatus(p.order_id, 'completed');   // books the payout in the ledger
  }
  return db.prepare('SELECT * FROM payouts WHERE id = ?').get(p.id);
}

export function failPayout(payoutId, reason) {
  db.prepare(`UPDATE payouts SET status='failed', error=?, next_at=NULL, updated_at=datetime('now') WHERE id=?`)
    .run(reason || 'Partner rejected', payoutId);
  const p = db.prepare('SELECT * FROM payouts WHERE id = ?').get(payoutId);
  if (p) setOrderStatus(p.order_id, 'failed');
  return p;
}

export function listPayouts(limit = 50) {
  return db.prepare(
    `SELECT p.*, o.ref AS order_ref, o.status AS order_status
     FROM payouts p JOIN orders o ON o.id = p.order_id ORDER BY p.id DESC LIMIT ?`
  ).all(limit);
}

export function getPayoutByRef(ref) {
  return db.prepare('SELECT * FROM payouts WHERE ref = ?').get(ref);
}

// Background worker: advance any payout whose next_at has passed.
export function startPayoutWorker(intervalMs = 3_000) {
  setInterval(() => {
    const due = db.prepare("SELECT id FROM payouts WHERE status IN ('queued','sent') AND next_at <= ?")
      .all(new Date().toISOString());
    for (const { id } of due) {
      try { advancePayout(id); } catch (e) { console.error('[payout] advance error:', e.message); }
    }
  }, intervalMs);
  console.log(`  Payout partner (mock): worker running, sent +${SENT_MS / 1000}s, delivered +${DELIVERED_MS / 1000}s`);
}
