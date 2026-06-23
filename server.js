import 'dotenv/config';
import express from 'express';
import cookieParser from 'cookie-parser';
import bcrypt from 'bcryptjs';
import { fileURLToPath } from 'url';
import path from 'path';

import db from './src/db.js';
import { ensureSeed } from './src/seed.js';
import { signToken, attachUser, requireAuth, requireAdmin } from './src/auth.js';
import { quote } from './src/quote.js';
import { updateRates, getMarginPct, setSetting, getSetting } from './src/rates-update.js';
import {
  createOrder as ppCreate,
  captureOrder as ppCapture,
  paypalConfigured,
  paypalClientId,
  paypalEnv,
} from './src/paypal.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;

// Behind a hosting proxy (Render/Railway/Vercel) so secure cookies work.
app.set('trust proxy', 1);

// Optional CORS — only needed if the frontend calls this API cross-origin
// (i.e. NOT using the Vercel rewrite proxy). Set ALLOWED_ORIGIN to a
// comma-separated list of allowed site origins.
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGIN || '')
  .split(',').map((s) => s.trim()).filter(Boolean);
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    res.header('Access-Control-Allow-Origin', origin);
    res.header('Vary', 'Origin');
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Allow-Methods', 'GET,POST,DELETE,OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') return res.sendStatus(204);
  }
  next();
});

app.use(express.json());
app.use(cookieParser());
app.use(attachUser);

// Seed default rates + admin on boot.
ensureSeed();

/* ───────────────────────── helpers ───────────────────────── */
const PROVINCES = [
  'Pinar del Río', 'Artemisa', 'La Habana', 'Mayabeque', 'Matanzas',
  'Cienfuegos', 'Villa Clara', 'Sancti Spíritus', 'Ciego de Ávila',
  'Camagüey', 'Las Tunas', 'Granma', 'Holguín', 'Santiago de Cuba',
  'Guantánamo', 'Isla de la Juventud',
];

// Cookie options. Cross-site (no proxy) needs SameSite=None + Secure.
const COOKIE_CROSS_SITE = String(process.env.COOKIE_CROSS_SITE || '').toLowerCase() === 'true';
function cookieOpts() {
  const secure = COOKIE_CROSS_SITE || process.env.NODE_ENV === 'production';
  return { httpOnly: true, sameSite: COOKIE_CROSS_SITE ? 'none' : 'lax', secure, maxAge: 7 * 24 * 3600 * 1000 };
}

function makeRef() {
  const t = Date.now().toString(36).toUpperCase();
  const r = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `CR-${t}-${r}`;
}

function publicUser(u) {
  if (!u) return null;
  const { id, email, full_name, phone, country, kyc_status, role } = u;
  return { id, email, full_name, phone, country, kyc_status, role };
}

/* ───────────────────────── auth ───────────────────────── */
app.post('/api/auth/register', (req, res) => {
  const { email, password, full_name, phone, country } = req.body || {};
  if (!email || !password || !full_name)
    return res.status(400).json({ error: 'Email, password and name are required.' });
  if (String(password).length < 8)
    return res.status(400).json({ error: 'Password must be at least 8 characters.' });

  const exists = db.prepare('SELECT id FROM users WHERE email = ?').get(email.toLowerCase());
  if (exists) return res.status(409).json({ error: 'An account with this email already exists.' });

  const hash = bcrypt.hashSync(password, 10);
  const info = db
    .prepare('INSERT INTO users (email, password_hash, full_name, phone, country) VALUES (?,?,?,?,?)')
    .run(email.toLowerCase(), hash, full_name, phone || null, country || null);
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(info.lastInsertRowid);
  const token = signToken(user);
  res.cookie('token', token, cookieOpts());
  res.json({ token, user: publicUser(user) });
});

app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body || {};
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(String(email || '').toLowerCase());
  if (!user || !bcrypt.compareSync(password || '', user.password_hash))
    return res.status(401).json({ error: 'Invalid email or password.' });
  const token = signToken(user);
  res.cookie('token', token, cookieOpts());
  res.json({ token, user: publicUser(user) });
});

app.post('/api/auth/logout', (req, res) => {
  res.clearCookie('token');
  res.json({ ok: true });
});

app.get('/api/auth/me', requireAuth, (req, res) => {
  res.json({ user: publicUser(req.user) });
});

/* ───────────────────────── reference data ───────────────────────── */
app.get('/api/rates', (req, res) => {
  const rows = db.prepare('SELECT * FROM rates WHERE active = 1 ORDER BY rowid').all();
  res.json({ rates: rows });
});

app.get('/api/provinces', (req, res) => res.json({ provinces: PROVINCES }));

app.get('/api/config', (req, res) => {
  res.json({
    paypalConfigured,
    paypalClientId: paypalConfigured ? paypalClientId : null,
    paypalEnv,
    bank: {
      beneficiary: process.env.BANK_BENEFICIARY || 'CubaRemesa S.L.',
      bank: process.env.BANK_NAME || 'Example Bank',
      iban: process.env.BANK_IBAN || 'ES00 0000 0000 0000 0000 0000',
      bic: process.env.BANK_BIC || 'EXAMPLEXXX',
    },
  });
});

/* ───────────────────────── quote ───────────────────────── */
app.get('/api/quote', (req, res) => {
  const q = quote(req.query.amount, req.query.payout_method);
  if (!q) return res.status(404).json({ error: 'Unknown payout method.' });
  res.json(q);
});

/* ───────────────────────── recipients ───────────────────────── */
app.get('/api/recipients', requireAuth, (req, res) => {
  const rows = db.prepare('SELECT * FROM recipients WHERE user_id = ? ORDER BY id DESC').all(req.user.id);
  res.json({ recipients: rows.map((r) => ({ ...r, details: safeParse(r.details) })) });
});

app.post('/api/recipients', requireAuth, (req, res) => {
  const { full_name, phone, province, payout_method, details } = req.body || {};
  if (!full_name || !payout_method)
    return res.status(400).json({ error: 'Recipient name and payout method are required.' });
  const info = db
    .prepare('INSERT INTO recipients (user_id, full_name, phone, province, payout_method, details) VALUES (?,?,?,?,?,?)')
    .run(req.user.id, full_name, phone || null, province || null, payout_method, JSON.stringify(details || {}));
  const row = db.prepare('SELECT * FROM recipients WHERE id = ?').get(info.lastInsertRowid);
  res.json({ recipient: { ...row, details: safeParse(row.details) } });
});

app.delete('/api/recipients/:id', requireAuth, (req, res) => {
  db.prepare('DELETE FROM recipients WHERE id = ? AND user_id = ?').run(req.params.id, req.user.id);
  res.json({ ok: true });
});

/* ───────────────────────── orders ───────────────────────── */
app.post('/api/orders', requireAuth, (req, res) => {
  const { recipient_id, send_amount, payout_method } = req.body || {};
  const recipient = db.prepare('SELECT * FROM recipients WHERE id = ? AND user_id = ?').get(recipient_id, req.user.id);
  if (!recipient) return res.status(400).json({ error: 'Recipient not found.' });

  const q = quote(send_amount, payout_method);
  if (!q) return res.status(400).json({ error: 'Unknown payout method.' });
  if (q.errors && q.errors.length) return res.status(400).json({ error: q.errors.join(' ') });
  if (recipient.payout_method !== payout_method)
    return res.status(400).json({ error: 'Recipient payout method does not match the selected product.' });

  const ref = makeRef();
  const info = db
    .prepare(
      `INSERT INTO orders
       (ref, user_id, recipient_id, send_currency, send_amount, fee, total_charge,
        payout_method, payout_currency, fx_rate, payout_amount, status)
       VALUES (?,?,?,?,?,?,?,?,?,?,?, 'pending_payment')`
    )
    .run(
      ref, req.user.id, recipient.id, 'USD', q.send_amount, q.fee, q.total_charge,
      q.payout_method, q.payout_currency, q.fx_rate, q.payout_amount
    );
  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(info.lastInsertRowid);
  res.json({ order });
});

app.get('/api/orders', requireAuth, (req, res) => {
  const rows = db
    .prepare(
      `SELECT o.*, r.full_name AS recipient_name, r.province AS recipient_province
       FROM orders o JOIN recipients r ON r.id = o.recipient_id
       WHERE o.user_id = ? ORDER BY o.id DESC`
    )
    .all(req.user.id);
  res.json({ orders: rows });
});

app.get('/api/orders/:ref', requireAuth, (req, res) => {
  const o = db
    .prepare(
      `SELECT o.*, r.full_name AS recipient_name, r.phone AS recipient_phone,
              r.province AS recipient_province, r.details AS recipient_details
       FROM orders o JOIN recipients r ON r.id = o.recipient_id
       WHERE o.ref = ? AND o.user_id = ?`
    )
    .get(req.params.ref, req.user.id);
  if (!o) return res.status(404).json({ error: 'Order not found.' });
  o.recipient_details = safeParse(o.recipient_details);
  res.json({ order: o });
});

/* ── PayPal pay-in ── */
app.post('/api/orders/:ref/paypal/create', requireAuth, async (req, res) => {
  const order = getOwnedOrder(req.params.ref, req.user.id);
  if (!order) return res.status(404).json({ error: 'Order not found.' });
  if (order.status !== 'pending_payment')
    return res.status(400).json({ error: 'Order is not awaiting payment.' });
  try {
    const pp = await ppCreate({
      amount: order.total_charge,
      reference: order.ref,
      description: `CubaRemesa ${order.ref} → ${order.payout_method}`,
    });
    db.prepare("UPDATE orders SET paypal_order_id = ?, payin_method = 'paypal', updated_at = datetime('now') WHERE id = ?")
      .run(pp.id, order.id);
    res.json({ id: pp.id, demo: Boolean(pp.demo) });
  } catch (e) {
    res.status(502).json({ error: e.message });
  }
});

app.post('/api/orders/:ref/paypal/capture', requireAuth, async (req, res) => {
  const order = getOwnedOrder(req.params.ref, req.user.id);
  if (!order) return res.status(404).json({ error: 'Order not found.' });
  if (!order.paypal_order_id) return res.status(400).json({ error: 'No PayPal order to capture.' });
  try {
    const result = await ppCapture(order.paypal_order_id);
    if (result.status === 'COMPLETED') {
      db.prepare("UPDATE orders SET status = 'paid', paypal_capture_id = ?, updated_at = datetime('now') WHERE id = ?")
        .run(result.captureId, order.id);
      return res.json({ status: 'paid', order: getOwnedOrder(order.ref, req.user.id) });
    }
    res.status(202).json({ status: result.status });
  } catch (e) {
    res.status(502).json({ error: e.message });
  }
});

/* ── IBAN / bank transfer pay-in ── */
app.post('/api/orders/:ref/iban', requireAuth, (req, res) => {
  const order = getOwnedOrder(req.params.ref, req.user.id);
  if (!order) return res.status(404).json({ error: 'Order not found.' });
  if (order.status !== 'pending_payment')
    return res.status(400).json({ error: 'Order is not awaiting payment.' });
  db.prepare("UPDATE orders SET payin_method = 'iban', status = 'awaiting_transfer', updated_at = datetime('now') WHERE id = ?")
    .run(order.id);
  res.json({
    order: getOwnedOrder(order.ref, req.user.id),
    instructions: {
      beneficiary: process.env.BANK_BENEFICIARY || 'CubaRemesa S.L.',
      bank: process.env.BANK_NAME || 'Example Bank',
      iban: process.env.BANK_IBAN || 'ES00 0000 0000 0000 0000 0000',
      bic: process.env.BANK_BIC || 'EXAMPLEXXX',
      amount: order.total_charge,
      reference: order.ref,
    },
  });
});

/* ───────────────────────── admin ───────────────────────── */
app.get('/api/admin/orders', requireAuth, requireAdmin, (req, res) => {
  const rows = db
    .prepare(
      `SELECT o.*, u.email AS user_email, u.full_name AS user_name,
              r.full_name AS recipient_name, r.phone AS recipient_phone,
              r.province AS recipient_province, r.details AS recipient_details
       FROM orders o
       JOIN users u ON u.id = o.user_id
       JOIN recipients r ON r.id = o.recipient_id
       ORDER BY o.id DESC`
    )
    .all();
  res.json({ orders: rows.map((o) => ({ ...o, recipient_details: safeParse(o.recipient_details) })) });
});

const VALID_STATUSES = ['pending_payment', 'awaiting_transfer', 'paid', 'processing', 'completed', 'cancelled', 'failed'];
app.post('/api/admin/orders/:ref/status', requireAuth, requireAdmin, (req, res) => {
  const { status, notes } = req.body || {};
  if (!VALID_STATUSES.includes(status)) return res.status(400).json({ error: 'Invalid status.' });
  const order = db.prepare('SELECT * FROM orders WHERE ref = ?').get(req.params.ref);
  if (!order) return res.status(404).json({ error: 'Order not found.' });
  db.prepare("UPDATE orders SET status = ?, notes = COALESCE(?, notes), updated_at = datetime('now') WHERE id = ?")
    .run(status, notes ?? null, order.id);
  res.json({ order: db.prepare('SELECT * FROM orders WHERE id = ?').get(order.id) });
});

app.get('/api/admin/rates', requireAuth, requireAdmin, (req, res) => {
  res.json({ rates: db.prepare('SELECT * FROM rates ORDER BY rowid').all() });
});

app.post('/api/admin/rates/:method', requireAuth, requireAdmin, (req, res) => {
  const { rate, fee_pct, fee_fixed, min_send, max_send, eta, active } = req.body || {};
  const existing = db.prepare('SELECT * FROM rates WHERE payout_method = ?').get(req.params.method);
  if (!existing) return res.status(404).json({ error: 'Unknown payout method.' });
  db.prepare(
    `UPDATE rates SET rate = ?, fee_pct = ?, fee_fixed = ?, min_send = ?, max_send = ?,
       eta = ?, active = ?, updated_at = datetime('now') WHERE payout_method = ?`
  ).run(
    num(rate, existing.rate), num(fee_pct, existing.fee_pct), num(fee_fixed, existing.fee_fixed),
    num(min_send, existing.min_send), num(max_send, existing.max_send),
    eta ?? existing.eta, active === undefined ? existing.active : (active ? 1 : 0),
    req.params.method
  );
  res.json({ rate: db.prepare('SELECT * FROM rates WHERE payout_method = ?').get(req.params.method) });
});

// Auto exchange-rate settings + manual trigger
app.get('/api/admin/rate-settings', requireAuth, requireAdmin, (req, res) => {
  res.json({
    margin_pct: getMarginPct(),
    informal_usd_cup: getSetting('informal_usd_cup'),
    informal_mlc_cup: getSetting('informal_mlc_cup'),
    rates_updated_at: getSetting('rates_updated_at'),
    source_configured: Boolean(process.env.RATE_API_TOKEN),
  });
});

app.post('/api/admin/rate-settings', requireAuth, requireAdmin, (req, res) => {
  const { margin_pct } = req.body || {};
  const m = Number(margin_pct);
  if (!Number.isFinite(m) || m < 0 || m > 50) return res.status(400).json({ error: 'Margin must be between 0 and 50.' });
  setSetting('rate_margin_pct', m);
  res.json({ margin_pct: m });
});

app.post('/api/admin/rates-refresh', requireAuth, requireAdmin, async (req, res) => {
  const result = await updateRates();
  res.json(result);
});

app.get('/api/admin/stats', requireAuth, requireAdmin, (req, res) => {
  const totals = db
    .prepare(
      `SELECT
         COUNT(*) AS orders,
         COALESCE(SUM(CASE WHEN status IN ('paid','processing','completed') THEN send_amount ELSE 0 END),0) AS volume,
         COALESCE(SUM(CASE WHEN status IN ('paid','processing','completed') THEN fee ELSE 0 END),0) AS revenue
       FROM orders`
    )
    .get();
  const users = db.prepare('SELECT COUNT(*) AS n FROM users').get().n;
  res.json({ ...totals, users });
});

/* ───────────────────────── static + SPA fallback ───────────────────────── */
app.use(express.static(path.join(__dirname, 'public')));

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

/* ───────────────────────── utils ───────────────────────── */
function getOwnedOrder(ref, userId) {
  return db
    .prepare(
      `SELECT o.*, r.full_name AS recipient_name, r.province AS recipient_province
       FROM orders o JOIN recipients r ON r.id = o.recipient_id
       WHERE o.ref = ? AND o.user_id = ?`
    )
    .get(ref, userId);
}
function safeParse(s) { try { return JSON.parse(s || '{}'); } catch { return {}; } }
function num(v, fallback) { const n = Number(v); return Number.isFinite(n) ? n : fallback; }

app.listen(PORT, () => {
  console.log(`\n  CubaRemesa running →  http://localhost:${PORT}`);
  console.log(`  PayPal: ${paypalConfigured ? `configured (${paypalEnv})` : 'DEMO mode (no credentials)'}`);
  console.log(`  Rate source: ${process.env.RATE_API_TOKEN ? 'elTOQUE API configured' : 'not configured (rates stay manual)'}\n`);
  startRateScheduler();
});

// Refresh rates on boot (if stale) and then once a day, when a rate source is configured.
function startRateScheduler() {
  if (!process.env.RATE_API_TOKEN) return;
  const DAY = 24 * 60 * 60 * 1000;
  const run = async () => {
    try {
      const r = await updateRates();
      console.log('  [rates] update:', r.ok ? `USD≈${r.source.usd} CUP, margin ${r.margin}%` : (r.reason || r.error));
    } catch (e) { console.log('  [rates] update failed:', e.message); }
  };
  const last = getSetting('rates_updated_at');
  const stale = !last || (Date.now() - new Date(last).getTime()) > DAY;
  if (stale) run();
  setInterval(run, DAY);
}
