// Pay-in orchestration. Every funding method implements the same interface:
//   create(order)  → { providerRef, status, client?, instructions? }
//   confirm(order, payload) → { status: 'paid' | 'pending', providerRef? }
// Adding cards / open banking later = add a provider file, register it here.

import * as paypal from '../paypal.js';

const bankDetails = () => ({
  beneficiary: process.env.BANK_BENEFICIARY || 'CubaRemesa S.L.',
  bank: process.env.BANK_NAME || 'Example Bank',
  iban: process.env.BANK_IBAN || 'ES00 0000 0000 0000 0000 0000',
  bic: process.env.BANK_BIC || 'EXAMPLEXXX',
});

const paypalProvider = {
  id: 'paypal',
  label: 'PayPal',
  kind: 'instant',                       // funds confirmed synchronously on capture
  async create(order) {
    const pp = await paypal.createOrder({
      amount: order.total_charge,
      reference: order.ref,
      description: `CubaRemesa ${order.ref} → ${order.payout_method}`,
    });
    return { providerRef: pp.id, status: 'pending_payment', demo: Boolean(pp.demo), client: { id: pp.id } };
  },
  async confirm(order) {
    if (!order.paypal_order_id) throw new Error('No PayPal order to capture.');
    const r = await paypal.captureOrder(order.paypal_order_id);
    return r.status === 'COMPLETED'
      ? { status: 'paid', providerRef: r.captureId }
      : { status: 'pending', raw: r.status };
  },
};

const bankTransferProvider = {
  id: 'bank_transfer',
  label: 'Bank transfer (IBAN / SEPA)',
  kind: 'async',                          // confirmed later by reconciliation / admin
  async create(order) {
    return {
      providerRef: order.ref,
      status: 'awaiting_transfer',
      instructions: { ...bankDetails(), amount: order.total_charge, reference: order.ref },
    };
  },
  async confirm() {
    // In production this is driven by bank-statement reconciliation (matching the
    // reference). For the demo an admin confirms receipt.
    return { status: 'paid', providerRef: 'BANK-MANUAL' };
  },
};

const providers = { paypal: paypalProvider, bank_transfer: bankTransferProvider };

export function getProvider(id) { return providers[id] || null; }
export function listProviders() {
  return Object.values(providers).map((p) => ({ id: p.id, label: p.label, kind: p.kind }));
}
