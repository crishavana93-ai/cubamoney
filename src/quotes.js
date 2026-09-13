// FX rate-lock: turns a live quote into a persisted, locked quote object with an
// expiry. Orders created from a locked quote use its numbers verbatim (no
// re-pricing), and a quote can be used exactly once.

import db from './db.js';
import { quote } from './quote.js';

db.exec(`
CREATE TABLE IF NOT EXISTS quotes (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  ref             TEXT UNIQUE NOT NULL,
  user_id         INTEGER,
  payout_method   TEXT NOT NULL,
  send_currency   TEXT NOT NULL DEFAULT 'USD',
  send_amount     REAL NOT NULL,
  fee             REAL NOT NULL,
  total_charge    REAL NOT NULL,
  payout_currency TEXT NOT NULL,
  fx_rate         REAL NOT NULL,
  payout_amount   REAL NOT NULL,
  expires_at      TEXT NOT NULL,
  used_order_id   INTEGER,
  created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);
`);

export const QUOTE_TTL_MINUTES = Number(process.env.QUOTE_TTL_MINUTES || 15);

function makeRef() {
  return `Q-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
}

export function createLockedQuote(sendAmount, payoutMethod, userId = null) {
  const q = quote(sendAmount, payoutMethod);
  if (!q) return { error: 'Unknown payout method.' };
  if (q.error) return { error: q.error };
  if (q.errors && q.errors.length) return { error: q.errors.join(' ') };

  const ref = makeRef();
  const expires_at = new Date(Date.now() + QUOTE_TTL_MINUTES * 60_000).toISOString();
  db.prepare(
    `INSERT INTO quotes (ref, user_id, payout_method, send_currency, send_amount, fee, total_charge,
       payout_currency, fx_rate, payout_amount, expires_at)
     VALUES (?,?,?,?,?,?,?,?,?,?,?)`
  ).run(ref, userId, q.payout_method, 'USD', q.send_amount, q.fee, q.total_charge,
        q.payout_currency, q.fx_rate, q.payout_amount, expires_at);
  return { quote: { ...db.prepare('SELECT * FROM quotes WHERE ref = ?').get(ref), label: q.label, eta: q.eta, ttl_minutes: QUOTE_TTL_MINUTES } };
}

export function getValidQuote(ref) {
  const q = db.prepare('SELECT * FROM quotes WHERE ref = ?').get(ref);
  if (!q) return { error: 'Quote not found.' };
  if (q.used_order_id) return { error: 'This quote was already used.' };
  if (new Date(q.expires_at).getTime() < Date.now()) return { error: 'Rate lock expired — please refresh the quote.', expired: true };
  return { quote: q };
}

export function markQuoteUsed(ref, orderId) {
  db.prepare('UPDATE quotes SET used_order_id = ? WHERE ref = ?').run(orderId, ref);
}
