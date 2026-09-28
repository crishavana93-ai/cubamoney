// B2B trade engine — merchant-of-record supplier payments.
//
// The flow:  client (Cuban MIPYME) orders goods → we issue a payment order →
// the payer NAMED IN THE CONTRACT pays by bank, in EUR, exactly the total, with
// the order reference → we match it 1:1 → we pay the verified supplier → goods ship.
//
// The four rules are enforced here, not just written down:
//   1. No cash      — only bank transfers are accepted.
//   2. No pooling   — one payment ↔ one order, exact amount, per-client ledger bucket.
//   3. No USD       — EUR only.
//   4. Known payers — the payer must be named on the order and approved.

import db from './db.js';
import { post, ensureAccount, clientFundsAccount } from './ledger.js';
import { nameMatchScore } from './verification/index.js';

db.exec(`
CREATE TABLE IF NOT EXISTS trade_clients (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  name           TEXT NOT NULL,
  country        TEXT NOT NULL DEFAULT 'CU',
  registration   TEXT,
  contact_name   TEXT,
  contact_email  TEXT,
  kyc_status     TEXT NOT NULL DEFAULT 'pending',   -- pending | approved | rejected
  kyc_docs       TEXT,                               -- JSON checklist
  created_at     TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS trade_payers (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  client_id        INTEGER NOT NULL REFERENCES trade_clients(id),
  full_name        TEXT NOT NULL,
  relationship     TEXT,                             -- e.g. "cousin of the owner", "EU partner company"
  country          TEXT,
  iban             TEXT,
  source_of_funds  TEXT,
  kyc_status       TEXT NOT NULL DEFAULT 'pending',
  created_at       TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS trade_orders (
  id                 INTEGER PRIMARY KEY AUTOINCREMENT,
  ref                TEXT UNIQUE NOT NULL,
  client_id          INTEGER NOT NULL REFERENCES trade_clients(id),
  supplier_id        INTEGER NOT NULL REFERENCES suppliers(id),
  payer_id           INTEGER NOT NULL REFERENCES trade_payers(id),
  description        TEXT NOT NULL,
  proforma_ref       TEXT,
  currency           TEXT NOT NULL DEFAULT 'EUR',
  goods_amount       REAL NOT NULL,
  commission_pct     REAL NOT NULL,
  commission_amount  REAL NOT NULL,
  total_due          REAL NOT NULL,
  status             TEXT NOT NULL DEFAULT 'awaiting_payment',
                     -- awaiting_payment | funded | supplier_paid | shipped | delivered | cancelled
  funded_at          TEXT, supplier_paid_at TEXT, shipped_at TEXT, delivered_at TEXT,
  created_at         TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS trade_payments (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id    INTEGER REFERENCES trade_orders(id),
  payer_name  TEXT,
  payer_iban  TEXT,
  amount      REAL NOT NULL,
  currency    TEXT NOT NULL,
  method      TEXT NOT NULL,
  reference   TEXT,
  status      TEXT NOT NULL,          -- matched | rejected
  reason      TEXT,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);
`);

const r2 = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;
const makeRef = () => `TO-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;

export const RULES = [
  { key: 'no_cash',    title: 'No cash — ever',  text: 'Only bank transfers are accepted, in and out.' },
  { key: 'no_pooling', title: 'No pooling',      text: 'One payment matches exactly one order, for the exact amount. Each client has its own ledger bucket.' },
  { key: 'no_usd',     title: 'No USD',          text: 'EUR only. USD clears through US banks and OFAC jurisdiction.' },
  { key: 'known_payer',title: 'Known payers',    text: 'The payer must be named on the order and approved before money moves.' },
];

/* ───────── clients & payers ───────── */
export function createClient(d) {
  const info = db.prepare(
    'INSERT INTO trade_clients (name, country, registration, contact_name, contact_email, kyc_docs) VALUES (?,?,?,?,?,?)'
  ).run(d.name, d.country || 'CU', d.registration || null, d.contact_name || null, d.contact_email || null,
        JSON.stringify(d.kyc_docs || { company_docs: false, owner_id: false, mediation_agreement: false }));
  const c = db.prepare('SELECT * FROM trade_clients WHERE id = ?').get(info.lastInsertRowid);
  clientFundsAccount(c.id, c.name);
  return c;
}
export function setClientKyc(id, status) {
  db.prepare('UPDATE trade_clients SET kyc_status = ? WHERE id = ?').run(status, id);
  return db.prepare('SELECT * FROM trade_clients WHERE id = ?').get(id);
}
export function createPayer(d) {
  const info = db.prepare(
    'INSERT INTO trade_payers (client_id, full_name, relationship, country, iban, source_of_funds) VALUES (?,?,?,?,?,?)'
  ).run(d.client_id, d.full_name, d.relationship || null, d.country || null,
        d.iban ? String(d.iban).replace(/\s+/g, '').toUpperCase() : null, d.source_of_funds || null);
  return db.prepare('SELECT * FROM trade_payers WHERE id = ?').get(info.lastInsertRowid);
}
export function setPayerKyc(id, status) {
  db.prepare('UPDATE trade_payers SET kyc_status = ? WHERE id = ?').run(status, id);
  return db.prepare('SELECT * FROM trade_payers WHERE id = ?').get(id);
}

/* ───────── orders ───────── */
export function createOrder(d) {
  const client = db.prepare('SELECT * FROM trade_clients WHERE id = ?').get(d.client_id);
  if (!client) throw new Error('Client not found.');
  const payer = db.prepare('SELECT * FROM trade_payers WHERE id = ? AND client_id = ?').get(d.payer_id, d.client_id);
  if (!payer) throw new Error('The payer must belong to this client (named in the contract).');
  const supplier = db.prepare('SELECT * FROM suppliers WHERE id = ?').get(d.supplier_id);
  if (!supplier) throw new Error('Supplier not found.');
  const goods = r2(d.goods_amount);
  if (!(goods > 0)) throw new Error('Goods amount must be positive.');
  const pct = Number(d.commission_pct ?? 5);
  const commission = r2(goods * pct / 100);
  const ref = makeRef();
  db.prepare(
    `INSERT INTO trade_orders (ref, client_id, supplier_id, payer_id, description, proforma_ref,
       goods_amount, commission_pct, commission_amount, total_due)
     VALUES (?,?,?,?,?,?,?,?,?,?)`
  ).run(ref, client.id, supplier.id, payer.id, d.description, d.proforma_ref || null, goods, pct, commission, r2(goods + commission));
  return getOrder(ref);
}

export function getOrder(ref) {
  return db.prepare(
    `SELECT o.*, c.name AS client_name, c.kyc_status AS client_kyc,
            p.full_name AS payer_name, p.relationship AS payer_relationship, p.kyc_status AS payer_kyc,
            s.name AS supplier_name, s.status AS supplier_status, s.country AS supplier_country
     FROM trade_orders o
     JOIN trade_clients c ON c.id = o.client_id
     JOIN trade_payers  p ON p.id = o.payer_id
     JOIN suppliers     s ON s.id = o.supplier_id
     WHERE o.ref = ?`
  ).get(ref);
}

export function listOrders() {
  return db.prepare('SELECT ref FROM trade_orders ORDER BY id DESC').all().map((r) => getOrder(r.ref));
}

/* ───────── incoming payment: the gatekeeper ───────── */
function reject(p, reason, orderId = null) {
  db.prepare(
    `INSERT INTO trade_payments (order_id, payer_name, payer_iban, amount, currency, method, reference, status, reason)
     VALUES (?,?,?,?,?,?,?, 'rejected', ?)`
  ).run(orderId, p.payer_name || null, p.payer_iban || null, r2(p.amount), String(p.currency || '').toUpperCase(),
        p.method || 'unknown', p.reference || null, reason);
  return { matched: false, reason };
}

export function recordIncomingPayment(p) {
  const currency = String(p.currency || '').toUpperCase();
  const method = p.method || 'bank_transfer';

  if (method !== 'bank_transfer') return reject(p, 'Rule "No cash": only bank transfers are accepted. Returned to sender.');
  if (currency !== 'EUR')         return reject(p, `Rule "No USD": ${currency || 'unknown currency'} not accepted — EUR only. Returned to sender.`);

  const order = p.reference ? getOrder(String(p.reference).trim().toUpperCase()) : null;
  if (!order) return reject(p, 'No order matches this payment reference. Returned to sender.');
  if (order.status !== 'awaiting_payment') return reject(p, `Order ${order.ref} is not awaiting payment (status: ${order.status}). Returned.`, order.id);
  if (order.client_kyc !== 'approved') return reject(p, `Client KYC not approved (${order.client_kyc}). Returned.`, order.id);
  if (order.payer_kyc !== 'approved')  return reject(p, `Named payer KYC not approved (${order.payer_kyc}). Returned.`, order.id);

  const nameScore = nameMatchScore(p.payer_name, order.payer_name);
  if (nameScore < 0.8)
    return reject(p, `Rule "Known payers": sender "${p.payer_name}" is not the payer named on the order ("${order.payer_name}"). Returned.`, order.id);

  if (r2(p.amount) !== r2(order.total_due))
    return reject(p, `Rule "No pooling": amount €${r2(p.amount)} does not equal the order total €${order.total_due}. Partial or combined payments are not accepted. Returned.`, order.id);

  // Matched — book it into this client's own bucket.
  const account = clientFundsAccount(order.client_id, order.client_name);
  post(`trade-in:${order.ref}`, order.ref, `Funds in ${order.ref} from ${order.payer_name}`, [
    { account: 'bank_eur', direction: 'debit',  amount: order.total_due },
    { account,             direction: 'credit', amount: order.total_due },
  ]);
  db.prepare(
    `INSERT INTO trade_payments (order_id, payer_name, payer_iban, amount, currency, method, reference, status, reason)
     VALUES (?,?,?,?,?,?,?, 'matched', 'Matched 1:1 to order')`
  ).run(order.id, p.payer_name, p.payer_iban || null, r2(p.amount), currency, method, order.ref);
  db.prepare("UPDATE trade_orders SET status = 'funded', funded_at = datetime('now') WHERE id = ?").run(order.id);
  return { matched: true, order: getOrder(order.ref) };
}

/* ───────── release to supplier ───────── */
export function releaseToSupplier(ref) {
  const order = getOrder(ref);
  if (!order) throw new Error('Order not found.');
  if (order.status !== 'funded') throw new Error(`Order must be funded before release (status: ${order.status}).`);
  if (order.supplier_status !== 'verified')
    throw new Error(`Supplier "${order.supplier_name}" is not verified (${order.supplier_status}). Run verification first.`);

  const account = clientFundsAccount(order.client_id, order.client_name);
  post(`trade-out:${order.ref}`, order.ref, `Paid supplier ${order.supplier_name} for ${order.ref}`, [
    { account,                  direction: 'debit',  amount: order.goods_amount },
    { account: 'bank_eur',      direction: 'credit', amount: order.goods_amount },
  ]);
  post(`trade-fee:${order.ref}`, order.ref, `Commission ${order.commission_pct}% on ${order.ref}`, [
    { account,                          direction: 'debit',  amount: order.commission_amount },
    { account: 'commission_revenue_eur', direction: 'credit', amount: order.commission_amount },
  ]);
  db.prepare("UPDATE trade_orders SET status = 'supplier_paid', supplier_paid_at = datetime('now') WHERE id = ?").run(order.id);
  return getOrder(ref);
}

const NEXT = { supplier_paid: ['shipped', 'shipped_at'], shipped: ['delivered', 'delivered_at'] };
export function advanceShipment(ref) {
  const order = getOrder(ref);
  if (!order) throw new Error('Order not found.');
  const n = NEXT[order.status];
  if (!n) throw new Error(`Nothing to advance from status "${order.status}".`);
  db.prepare(`UPDATE trade_orders SET status = ?, ${n[1]} = datetime('now') WHERE id = ?`).run(n[0], order.id);
  return getOrder(ref);
}

/* ───────── read models ───────── */
export function overview() {
  return {
    rules: RULES,
    clients: db.prepare('SELECT * FROM trade_clients ORDER BY id DESC').all(),
    payers: db.prepare(
      'SELECT p.*, c.name AS client_name FROM trade_payers p JOIN trade_clients c ON c.id = p.client_id ORDER BY p.id DESC'
    ).all(),
    orders: listOrders(),
    payments: db.prepare(
      'SELECT tp.*, o.ref AS order_ref FROM trade_payments tp LEFT JOIN trade_orders o ON o.id = tp.order_id ORDER BY tp.id DESC LIMIT 50'
    ).all(),
    suppliers: db.prepare('SELECT id, name, country, category, status FROM suppliers ORDER BY id').all(),
  };
}

// What the payer sees: exact instructions to pay one order.
export function paymentInstructions(ref) {
  const o = getOrder(String(ref || '').toUpperCase());
  if (!o) return null;
  return {
    ref: o.ref, status: o.status, description: o.description, proforma_ref: o.proforma_ref,
    client_name: o.client_name, payer_name: o.payer_name, supplier_name: o.supplier_name,
    currency: o.currency, goods_amount: o.goods_amount, commission_pct: o.commission_pct,
    commission_amount: o.commission_amount, total_due: o.total_due,
    bank: {
      beneficiary: process.env.BANK_BENEFICIARY || 'Cuba Money AB',
      bank: process.env.BANK_NAME || 'Example Bank',
      iban: process.env.BANK_IBAN || 'SE00 0000 0000 0000 0000 0000',
      bic: process.env.BANK_BIC || 'EXAMPLEXXX',
    },
  };
}

/* ───────── demo seed ───────── */
export function ensureTradeSeed() {
  ensureAccount('bank_eur', 'EUR bank account (client money)', 'asset', 'debit', 'EUR');
  ensureAccount('commission_revenue_eur', 'Commission revenue', 'revenue', 'credit', 'EUR');
  if (db.prepare('SELECT COUNT(*) AS n FROM trade_clients').get().n > 0) return;

  const client = createClient({
    name: 'Sol Caribe MIPYME S.R.L. (demo)', country: 'CU', registration: 'MIPYME-DEMO-0001',
    contact_name: 'Demo Owner', contact_email: 'owner@example.com',
    kyc_docs: { company_docs: true, owner_id: true, mediation_agreement: true },
  });
  setClientKyc(client.id, 'approved');
  const payer = createPayer({
    client_id: client.id, full_name: 'Laura Pérez Gómez', relationship: 'Cousin of the owner (named in contract)',
    country: 'ES', iban: 'ES91 2100 0418 4502 0005 1332', source_of_funds: 'Salary + savings (demo)',
  });
  setPayerKyc(payer.id, 'approved');

  const cleon = db.prepare("SELECT id FROM suppliers WHERE name LIKE 'Cleon%'").get();
  if (cleon) {
    createOrder({
      client_id: client.id, supplier_id: cleon.id, payer_id: payer.id,
      description: 'Solar batteries — 1 × 40ft container', proforma_ref: 'PI-CLEON-2026-114',
      goods_amount: 47500, commission_pct: 5,
    });
  }
}
