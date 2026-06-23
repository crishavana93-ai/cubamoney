import db from './db.js';

// Compute a transfer quote for a given send amount + payout method.
// Returns null if the method is unknown/inactive.
export function quote(sendAmount, payoutMethod) {
  const r = db.prepare('SELECT * FROM rates WHERE payout_method = ? AND active = 1').get(payoutMethod);
  if (!r) return null;

  const amount = Number(sendAmount);
  if (!Number.isFinite(amount) || amount <= 0) return { error: 'Invalid amount.' };

  const errors = [];
  if (amount < r.min_send) errors.push(`Minimum send is ${r.min_send} USD.`);
  if (amount > r.max_send) errors.push(`Maximum send is ${r.max_send} USD.`);

  const fee = round2((amount * r.fee_pct) / 100 + r.fee_fixed);
  const total = round2(amount + fee);
  const payoutAmount = round2(amount * r.rate);

  return {
    payout_method: r.payout_method,
    label: r.label,
    send_currency: 'USD',
    send_amount: round2(amount),
    fee,
    total_charge: total,
    payout_currency: r.payout_currency,
    fx_rate: r.rate,
    payout_amount: payoutAmount,
    eta: r.eta,
    min_send: r.min_send,
    max_send: r.max_send,
    errors,
  };
}

function round2(n) {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}
