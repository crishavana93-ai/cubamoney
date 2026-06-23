// Lightweight PayPal Orders API (v2) client using native fetch.
// Falls back to DEMO mode when credentials are not configured, so the
// whole flow can be exercised end-to-end without a PayPal account.

const ENV = process.env.PAYPAL_ENV || 'sandbox';
const BASE =
  ENV === 'live'
    ? 'https://api-m.paypal.com'
    : 'https://api-m.sandbox.paypal.com';

const CLIENT_ID = process.env.PAYPAL_CLIENT_ID || '';
const CLIENT_SECRET = process.env.PAYPAL_CLIENT_SECRET || '';

export const paypalConfigured = Boolean(CLIENT_ID && CLIENT_SECRET);
export const paypalClientId = CLIENT_ID;
export const paypalEnv = ENV;

async function accessToken() {
  const auth = Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64');
  const res = await fetch(`${BASE}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });
  if (!res.ok) throw new Error(`PayPal auth failed: ${res.status}`);
  const data = await res.json();
  return data.access_token;
}

// Create an order. amount is a number (USD). Returns { id }.
export async function createOrder({ amount, reference, description }) {
  if (!paypalConfigured) {
    return { id: `DEMO-${reference}`, demo: true };
  }
  const token = await accessToken();
  const res = await fetch(`${BASE}/v2/checkout/orders`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      intent: 'CAPTURE',
      purchase_units: [
        {
          reference_id: reference,
          description: description?.slice(0, 127),
          amount: { currency_code: 'USD', value: Number(amount).toFixed(2) },
        },
      ],
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`PayPal create order failed: ${JSON.stringify(data)}`);
  return data;
}

// Capture an approved order. Returns { status, captureId }.
export async function captureOrder(orderId) {
  if (!paypalConfigured || String(orderId).startsWith('DEMO-')) {
    return { status: 'COMPLETED', captureId: `DEMOCAP-${Date.now()}`, demo: true };
  }
  const token = await accessToken();
  const res = await fetch(`${BASE}/v2/checkout/orders/${orderId}/capture`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`PayPal capture failed: ${JSON.stringify(data)}`);
  const cap = data?.purchase_units?.[0]?.payments?.captures?.[0];
  return { status: data.status, captureId: cap?.id, raw: data };
}
