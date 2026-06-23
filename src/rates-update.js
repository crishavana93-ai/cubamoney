// Auto exchange-rate updater for the Cuba corridor.
//
// Pulls the informal market rate (TRMI) from elTOQUE's public API and updates
// the CUP- and MLC-based payout products, applying a configurable margin that
// is the platform's spread. USD cash delivery is left untouched (it is not a
// CUP-denominated product).
//
// elTOQUE API: https://tasas.eltoque.com/docs/  (requires a free Bearer token).
// Configure via .env:  RATE_API_URL, RATE_API_TOKEN
// Without a token the updater is a no-op and existing rates are kept.

import db from './db.js';

const API_URL = process.env.RATE_API_URL || 'https://tasas.eltoque.com/v1/trmi';
const API_TOKEN = process.env.RATE_API_TOKEN || '';

export function getSetting(key, fallback = null) {
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key);
  return row ? row.value : fallback;
}
export function setSetting(key, value) {
  db.prepare('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value')
    .run(key, String(value));
}

export function getMarginPct() {
  return Number(getSetting('rate_margin_pct', '3')) || 0;
}

// Fetch median informal rates. Returns { usd, mlc } in CUP, or null on failure.
export async function fetchInformalRates() {
  if (!API_TOKEN) return { skipped: true, reason: 'no_token' };
  try {
    const res = await fetch(API_URL, {
      headers: { Authorization: `Bearer ${API_TOKEN}`, 'Content-Type': 'application/json' },
    });
    if (!res.ok) return { error: `HTTP ${res.status}` };
    const data = await res.json();
    // elTOQUE shape: { tasas: { USD: <cup>, ECU: ..., MLC: <cup>, ... }, date, hash }
    const tasas = data.tasas || data.rates || {};
    const usd = Number(tasas.USD);
    const mlc = Number(tasas.MLC);
    if (!Number.isFinite(usd)) return { error: 'no_usd_in_response' };
    return { usd, mlc: Number.isFinite(mlc) ? mlc : null, date: data.date };
  } catch (e) {
    return { error: e.message };
  }
}

// Compute and apply new payout rates from an informal USD/MLC (CUP) reading.
export function applyRates({ usd, mlc }) {
  const margin = getMarginPct();
  const factor = 1 - margin / 100; // platform spread
  const updates = [];

  // CUP payouts: customer receives CUP at informal USD rate minus margin.
  if (Number.isFinite(usd)) {
    const cupRate = round2(usd * factor);
    for (const m of ['cup_cash', 'cubacel']) {
      db.prepare("UPDATE rates SET rate = ?, updated_at = datetime('now') WHERE payout_method = ?").run(cupRate, m);
      updates.push({ method: m, rate: cupRate });
    }
  }

  // MLC payouts: MLC per 1 USD = (CUP per USD) / (CUP per MLC), minus margin.
  if (Number.isFinite(usd) && Number.isFinite(mlc) && mlc > 0) {
    const mlcRate = round4((usd / mlc) * factor);
    for (const m of ['mlc_bank', 'mlc_card']) {
      db.prepare("UPDATE rates SET rate = ?, updated_at = datetime('now') WHERE payout_method = ?").run(mlcRate, m);
      updates.push({ method: m, rate: mlcRate });
    }
  }

  setSetting('informal_usd_cup', usd ?? '');
  if (Number.isFinite(mlc)) setSetting('informal_mlc_cup', mlc);
  setSetting('rates_updated_at', new Date().toISOString());
  return updates;
}

// Full cycle: fetch + apply. Returns a status object.
export async function updateRates() {
  const r = await fetchInformalRates();
  if (r.skipped) return { ok: false, skipped: true, reason: r.reason };
  if (r.error) return { ok: false, error: r.error };
  const updates = applyRates(r);
  return { ok: true, source: { usd: r.usd, mlc: r.mlc, date: r.date }, margin: getMarginPct(), updates };
}

function round2(n) { return Math.round((n + Number.EPSILON) * 100) / 100; }
function round4(n) { return Math.round((n + Number.EPSILON) * 10000) / 10000; }

// CLI: `npm run rates:update`
if (import.meta.url === `file://${process.argv[1]}`) {
  updateRates().then((r) => { console.log(JSON.stringify(r, null, 2)); process.exit(0); });
}
