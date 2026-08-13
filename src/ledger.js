// Minimal double-entry ledger (demo). All books kept in USD base currency.
// Every transaction is a set of balanced legs (sum of debits == sum of credits).
// Postings are idempotent via a unique idempotency_key.

import db from './db.js';

db.exec(`
CREATE TABLE IF NOT EXISTS ledger_accounts (
  code       TEXT PRIMARY KEY,
  name       TEXT NOT NULL,
  kind       TEXT NOT NULL,          -- asset | liability | revenue | equity
  normal     TEXT NOT NULL,          -- debit | credit  (side that increases the account)
  currency   TEXT NOT NULL DEFAULT 'USD'
);

CREATE TABLE IF NOT EXISTS ledger_tx (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  ref              TEXT,
  idempotency_key  TEXT UNIQUE,
  memo             TEXT,
  created_at       TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS ledger_entries (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  tx_id        INTEGER NOT NULL REFERENCES ledger_tx(id),
  account_code TEXT NOT NULL REFERENCES ledger_accounts(code),
  direction    TEXT NOT NULL,        -- debit | credit
  amount       REAL NOT NULL,
  created_at   TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_entries_account ON ledger_entries(account_code);
`);

const SYSTEM_ACCOUNTS = [
  ['cash_payin',            'Cash received (pay-in clearing)', 'asset',     'debit'],
  ['fee_revenue',           'Fee revenue',                     'revenue',   'credit'],
  ['transfers_payable',     'Transfers payable to recipients', 'liability', 'credit'],
  ['payout_partner_payable','Owed to Cuba payout partner',     'liability', 'credit'],
  ['fx_pnl',                'FX spread P&L',                   'revenue',   'credit'],
];

export function ensureLedgerSeed() {
  const has = db.prepare('SELECT COUNT(*) AS n FROM ledger_accounts').get().n;
  if (has === 0) {
    const ins = db.prepare('INSERT INTO ledger_accounts (code, name, kind, normal) VALUES (?,?,?,?)');
    const tx = db.transaction((rows) => rows.forEach((r) => ins.run(r)));
    tx(SYSTEM_ACCOUNTS);
  }
}

function round2(n) { return Math.round((n + Number.EPSILON) * 100) / 100; }

// Post a balanced transaction. legs: [{ account, direction:'debit'|'credit', amount }]
// Returns { posted:true, txId } or { posted:false, duplicate:true } if the key was already used.
export function post(idempotencyKey, ref, memo, legs) {
  const existing = db.prepare('SELECT id FROM ledger_tx WHERE idempotency_key = ?').get(idempotencyKey);
  if (existing) return { posted: false, duplicate: true, txId: existing.id };

  let debit = 0, credit = 0;
  for (const l of legs) {
    if (l.direction === 'debit') debit += l.amount; else credit += l.amount;
  }
  if (round2(debit) !== round2(credit)) {
    throw new Error(`Unbalanced transaction ${idempotencyKey}: debits ${debit} != credits ${credit}`);
  }

  const run = db.transaction(() => {
    const info = db.prepare('INSERT INTO ledger_tx (ref, idempotency_key, memo) VALUES (?,?,?)')
      .run(ref || null, idempotencyKey, memo || null);
    const insLeg = db.prepare('INSERT INTO ledger_entries (tx_id, account_code, direction, amount) VALUES (?,?,?,?)');
    for (const l of legs) insLeg.run(info.lastInsertRowid, l.account, l.direction, round2(l.amount));
    return info.lastInsertRowid;
  });
  return { posted: true, txId: run() };
}

// Signed balance per account, using its normal side.
export function balances() {
  const accounts = db.prepare('SELECT * FROM ledger_accounts ORDER BY rowid').all();
  const sums = db.prepare(
    `SELECT account_code,
            COALESCE(SUM(CASE WHEN direction='debit'  THEN amount ELSE 0 END),0) AS d,
            COALESCE(SUM(CASE WHEN direction='credit' THEN amount ELSE 0 END),0) AS c
     FROM ledger_entries GROUP BY account_code`
  ).all();
  const byCode = Object.fromEntries(sums.map((s) => [s.account_code, s]));
  return accounts.map((a) => {
    const s = byCode[a.code] || { d: 0, c: 0 };
    const bal = a.normal === 'debit' ? s.d - s.c : s.c - s.d;
    return { ...a, debit: round2(s.d), credit: round2(s.c), balance: round2(bal) };
  });
}

// Reconciliation: assets should equal liabilities + revenue (equity=0 here).
export function reconciliation() {
  const b = balances();
  const sum = (kind) => round2(b.filter((a) => a.kind === kind).reduce((t, a) => t + a.balance, 0));
  const assets = sum('asset');
  const liabilities = sum('liability');
  const revenue = sum('revenue');
  const diff = round2(assets - (liabilities + revenue));
  return { assets, liabilities, revenue, diff, reconciled: Math.abs(diff) < 0.01 };
}

export function recentTx(limit = 25) {
  const txs = db.prepare('SELECT * FROM ledger_tx ORDER BY id DESC LIMIT ?').all(limit);
  const getLegs = db.prepare('SELECT account_code, direction, amount FROM ledger_entries WHERE tx_id = ?');
  return txs.map((t) => ({ ...t, legs: getLegs.all(t.id) }));
}

/* ── order → ledger postings ── */

// Pay-in: sender funds the transfer. total_charge = send_amount + fee.
export function recordPayin(order) {
  return post(`payin:${order.ref}`, order.ref, `Pay-in ${order.ref} (${order.payin_method || 'n/a'})`, [
    { account: 'cash_payin',        direction: 'debit',  amount: order.total_charge },
    { account: 'fee_revenue',       direction: 'credit', amount: order.fee },
    { account: 'transfers_payable', direction: 'credit', amount: order.send_amount },
  ]);
}

// Payout: obligation moves from "payable to recipient" to "owed to payout partner".
export function recordPayout(order) {
  return post(`payout:${order.ref}`, order.ref, `Payout ${order.ref} → ${order.payout_method}`, [
    { account: 'transfers_payable',      direction: 'debit',  amount: order.send_amount },
    { account: 'payout_partner_payable', direction: 'credit', amount: order.send_amount },
  ]);
}

// Apply the right postings for a given order status (idempotent — safe to call repeatedly).
export function applyLedgerForStatus(order, status) {
  try {
    if (['paid', 'processing', 'completed'].includes(status)) recordPayin(order);
    if (status === 'completed') recordPayout(order);
  } catch (e) {
    console.error('[ledger] posting error:', e.message);
  }
}
