// Supplier (beneficiary) registry + verification orchestration.
// Every supplier we pay must pass identity + bank-account checks before payout.

import db from './db.js';
import { gstinValid, panValid, gleifLookup, verifyBankAccount, nameMatchScore } from './verification/index.js';

db.exec(`
CREATE TABLE IF NOT EXISTS suppliers (
  id                 INTEGER PRIMARY KEY AUTOINCREMENT,
  name               TEXT NOT NULL,
  country            TEXT NOT NULL DEFAULT 'IN',
  category           TEXT,
  gstin              TEXT,
  pan                TEXT,
  lei                TEXT,
  beneficiary_name   TEXT NOT NULL,
  bank_name          TEXT,
  bank_account       TEXT NOT NULL,
  bank_ifsc          TEXT,
  bank_swift         TEXT,
  bank_address       TEXT,
  status             TEXT NOT NULL DEFAULT 'unverified',  -- unverified | verified | review | mismatch
  checks             TEXT,                                 -- JSON: results of the last verification run
  verified_at        TEXT,
  created_at         TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at         TEXT NOT NULL DEFAULT (datetime('now'))
);
`);

const parse = (s) => { try { return JSON.parse(s || 'null'); } catch { return null; } };
const shape = (r) => r && ({ ...r, checks: parse(r.checks) });

export function listSuppliers() {
  return db.prepare('SELECT * FROM suppliers ORDER BY id DESC').all().map(shape);
}
export function getSupplier(id) {
  return shape(db.prepare('SELECT * FROM suppliers WHERE id = ?').get(id));
}

export function createSupplier(d) {
  const info = db.prepare(
    `INSERT INTO suppliers (name, country, category, gstin, pan, lei, beneficiary_name, bank_name,
       bank_account, bank_ifsc, bank_swift, bank_address)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`
  ).run(
    d.name, d.country || 'IN', d.category || null, up(d.gstin), up(d.pan), up(d.lei),
    d.beneficiary_name || d.name, d.bank_name || null, String(d.bank_account || '').replace(/\s+/g, ''),
    up(d.bank_ifsc), up(d.bank_swift), d.bank_address || null
  );
  return getSupplier(info.lastInsertRowid);
}
const up = (v) => (v ? String(v).toUpperCase().trim() : null);

// Run every applicable check and store a structured result + overall status.
export async function verifySupplier(id) {
  const s = getSupplier(id);
  if (!s) return null;
  const checks = [];
  const add = (key, ok, detail, weight = 1) => checks.push({ key, ok, detail, weight });

  // 1) Tax identity (India)
  if (s.gstin) {
    const g = gstinValid(s.gstin);
    add('gstin', g.valid, g.valid ? `GSTIN valid (state ${g.state_code}, PAN ${g.pan})` : `GSTIN invalid (${g.reason})`);
    if (g.valid && s.pan && g.pan !== s.pan) add('gstin_pan_link', false, `GSTIN embeds PAN ${g.pan} but supplier PAN is ${s.pan}`);
    else if (g.valid && s.pan) add('gstin_pan_link', true, 'GSTIN and PAN agree');
  }
  if (s.pan) {
    const p = panValid(s.pan);
    add('pan', p.valid, p.valid ? `PAN format valid — ${p.holder_type}` : 'PAN format invalid');
  }

  // 2) Legal entity (LEI via GLEIF)
  if (s.lei) {
    const l = await gleifLookup(s.lei);
    if (!l.found) add('lei', false, `LEI not found (${l.reason})`, 2);
    else {
      const nameOk = nameMatchScore(l.legal_name, s.name) >= 0.8;
      add('lei', l.status === 'ACTIVE' && nameOk,
        `${l.legal_name} · ${l.category} · ${l.status} · ${l.corroboration} · ${l.address}`, 2);
      if (l.registered_as && s.pan && l.registered_as !== s.pan) add('lei_pan_link', false, `LEI registered as ${l.registered_as}, supplier PAN ${s.pan}`);
      const gstFromLei = (l.other_ids || []).find((x) => /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]/.test(x));
      if (gstFromLei && s.gstin) add('lei_gst_link', gstFromLei === s.gstin, `LEI record lists GSTIN ${gstFromLei}`);
    }
  }

  // 3) Bank-account holder name
  const b = await verifyBankAccount({ account: s.bank_account, ifsc: s.bank_ifsc, expectedName: s.beneficiary_name });
  add('bank_holder', b.status === 'verified',
    `${b.provider}: registered holder "${b.registeredName}" — match ${(b.score * 100).toFixed(0)}% (${b.status})`, 3);

  // Overall
  const critical = checks.filter((c) => c.weight >= 2);
  const status = checks.every((c) => c.ok) ? 'verified'
    : critical.some((c) => !c.ok && c.key === 'bank_holder') ? 'mismatch'
    : 'review';

  db.prepare(`UPDATE suppliers SET status = ?, checks = ?, verified_at = CASE WHEN ? = 'verified' THEN datetime('now') ELSE verified_at END,
              updated_at = datetime('now') WHERE id = ?`)
    .run(status, JSON.stringify({ ran_at: new Date().toISOString(), bank: { provider: b.provider, ref: b.ref }, checks }), status, id);
  return getSupplier(id);
}

// Demo seed: the real, publicly-verifiable supplier from the bank-details image.
export function ensureSupplierSeed() {
  const n = db.prepare('SELECT COUNT(*) AS n FROM suppliers').get().n;
  if (n > 0) return;
  createSupplier({
    name: 'Cleon Powertech Solution',
    country: 'IN',
    category: 'Solar / batteries',
    gstin: '09AITPG1183F1Z3',
    pan: 'AITPG1183F',
    lei: '984500748CA46089SM32',
    beneficiary_name: 'Cleon Powertech Solution',
    bank_name: 'YES BANK LIMITED',
    bank_account: '047073800000022',
    bank_ifsc: 'YESB0000470',
    bank_swift: 'YESBINBBDEL',
    bank_address: 'GF-1, Mahalaxmi Plaza, Plot VC-2, Sector-3, Vaishali, Ghaziabad, UP 201010, India',
  });
}
