import 'dotenv/config';
import bcrypt from 'bcryptjs';
import db from './db.js';

// Default payout products for the Cuba corridor.
// Rates are illustrative starting points (mid-2026 informal market context:
// USD ≈ 660–670 CUP, MLC traded near the dollar). Adjust live from the admin panel.
const DEFAULT_RATES = [
  {
    payout_method: 'mlc_bank',
    label: 'MLC bank transfer (BANDEC / BPA / Metropolitano)',
    payout_currency: 'MLC',
    rate: 0.98, fee_pct: 4.5, fee_fixed: 0, min_send: 20, max_send: 2000,
    eta: '5–7 business days',
  },
  {
    payout_method: 'mlc_card',
    label: 'MLC card top-up',
    payout_currency: 'MLC',
    rate: 0.98, fee_pct: 4.5, fee_fixed: 0, min_send: 20, max_send: 2000,
    eta: '3–5 business days',
  },
  {
    payout_method: 'usd_cash',
    label: 'USD cash delivery to the door',
    payout_currency: 'USD',
    rate: 0.95, fee_pct: 6, fee_fixed: 2, min_send: 50, max_send: 1500,
    eta: '2–5 business days',
  },
  {
    payout_method: 'cup_cash',
    label: 'Cuban peso (CUP) cash delivery',
    payout_currency: 'CUP',
    rate: 640, fee_pct: 5, fee_fixed: 0, min_send: 20, max_send: 1000,
    eta: '1–3 business days',
  },
  {
    payout_method: 'cubacel',
    label: 'Cubacel mobile top-up',
    payout_currency: 'CUP',
    rate: 660, fee_pct: 0, fee_fixed: 1, min_send: 10, max_send: 100,
    eta: 'Within minutes',
  },
];

export function ensureSeed() {
  const have = db.prepare('SELECT COUNT(*) AS n FROM rates').get().n;
  if (have === 0) {
    const ins = db.prepare(
      `INSERT INTO rates (payout_method, label, payout_currency, rate, fee_pct, fee_fixed, min_send, max_send, eta)
       VALUES (@payout_method,@label,@payout_currency,@rate,@fee_pct,@fee_fixed,@min_send,@max_send,@eta)`
    );
    const tx = db.transaction((rows) => rows.forEach((r) => ins.run(r)));
    tx(DEFAULT_RATES);
    console.log('  Seeded default payout rates.');
  }

  const adminEmail = (process.env.ADMIN_EMAIL || 'admin@cubaremesa.com').toLowerCase();
  const existingAdmin = db.prepare('SELECT id FROM users WHERE email = ?').get(adminEmail);
  if (!existingAdmin) {
    const hash = bcrypt.hashSync(process.env.ADMIN_PASSWORD || 'admin1234', 10);
    db.prepare(
      `INSERT INTO users (email, password_hash, full_name, country, kyc_status, role)
       VALUES (?,?,?,?,'verified','admin')`
    ).run(adminEmail, hash, 'Administrator', 'ES');
    console.log(`  Created admin user: ${adminEmail}`);
  }
}

// Allow `npm run seed`
if (import.meta.url === `file://${process.argv[1]}`) {
  ensureSeed();
  console.log('Seed complete.');
}
