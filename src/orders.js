// Central order state transitions. Every status change flows through here so
// the ledger and the payout partner react consistently.

import db from './db.js';
import { applyLedgerForStatus } from './ledger.js';
import { enqueuePayout } from './payout-partner.js';

export function getOrderById(id) {
  return db.prepare('SELECT * FROM orders WHERE id = ?').get(id);
}

// patch: extra columns to set alongside status (e.g. paypal_capture_id).
export function setOrderStatus(orderId, status, patch = {}) {
  const sets = ['status = ?', "updated_at = datetime('now')"];
  const vals = [status];
  for (const [k, v] of Object.entries(patch)) { sets.push(`${k} = ?`); vals.push(v); }
  vals.push(orderId);
  db.prepare(`UPDATE orders SET ${sets.join(', ')} WHERE id = ?`).run(...vals);

  let order = getOrderById(orderId);
  applyLedgerForStatus(order, status);          // idempotent bookkeeping

  if (status === 'paid') {                       // hand off to the payout partner
    enqueuePayout(order);
    order = getOrderById(orderId);               // now 'processing'
  }
  return order;
}
