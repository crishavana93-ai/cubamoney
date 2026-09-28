// Supplier / beneficiary verification toolkit.
//  - GSTIN checksum + format (India)          → offline, real algorithm
//  - PAN format (India)                        → offline
//  - LEI lookup                                → live, public GLEIF API (no key needed)
//  - Bank-account holder name verification     → provider interface ("penny drop")
//        mock     : demo provider (no network)
//        cashfree : real API, enabled when CASHFREE_CLIENT_ID/SECRET are set
//  - Name matching                             → normalised token similarity

/* ───────── India: GSTIN & PAN ───────── */
const B36 = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';

export function gstinValid(gstin) {
  const g = String(gstin || '').toUpperCase().trim();
  if (!/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/.test(g)) return { valid: false, reason: 'format' };
  // checksum: alternate factors 1,2 over first 14 chars in base-36
  let sum = 0;
  for (let i = 0; i < 14; i++) {
    const v = B36.indexOf(g[i]);
    const p = v * (i % 2 === 0 ? 1 : 2);
    sum += Math.floor(p / 36) + (p % 36);
  }
  const check = B36[(36 - (sum % 36)) % 36];
  if (check !== g[14]) return { valid: false, reason: 'checksum' };
  return { valid: true, state_code: g.slice(0, 2), pan: g.slice(2, 12) };
}

export function panValid(pan) {
  const p = String(pan || '').toUpperCase().trim();
  if (!/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(p)) return { valid: false };
  const typeMap = { P: 'individual / proprietor', C: 'company', H: 'HUF', F: 'firm', A: 'AOP', T: 'trust', B: 'BOI', L: 'local authority', J: 'artificial juridical person', G: 'government' };
  return { valid: true, holder_type: typeMap[p[3]] || 'unknown' };
}

/* ───────── LEI (GLEIF public API) ───────── */
export async function gleifLookup(lei) {
  const id = String(lei || '').trim().toUpperCase();
  if (!/^[A-Z0-9]{20}$/.test(id)) return { found: false, reason: 'format' };
  try {
    const res = await fetch(`https://api.gleif.org/api/v1/lei-records/${id}`, { headers: { Accept: 'application/vnd.api+json' } });
    if (!res.ok) return { found: false, reason: `HTTP ${res.status}` };
    const j = await res.json();
    const a = j.data?.attributes || {};
    const e = a.entity || {};
    const addr = e.legalAddress || {};
    return {
      found: true,
      legal_name: e.legalName?.name,
      category: e.category,
      status: e.status,
      registered_as: e.registeredAs,
      address: [...(addr.addressLines || []), addr.city, addr.region, addr.postalCode, addr.country].filter(Boolean).join(', '),
      registration_status: a.registration?.status,
      corroboration: a.registration?.corroborationLevel,
      next_renewal: a.registration?.nextRenewalDate,
      other_ids: (a.registration?.otherValidationAuthorities || []).map((o) => o.validatedAs),
    };
  } catch (err) {
    return { found: false, reason: err.message };
  }
}

/* ───────── name matching ───────── */
const STOP = new Set(['LTD', 'LIMITED', 'PVT', 'PRIVATE', 'LLP', 'INC', 'LLC', 'CO', 'COMPANY', 'THE', 'AND', '&',
  'SL', 'SLU', 'SA', 'SAU', 'SRL', 'SAS', 'AB', 'GMBH', 'BV', 'NV', 'OU', 'UAB', 'LTDA', 'CIA', 'SPA', 'OY', 'AS', 'APS']);
export function normaliseName(s) {
  return String(s || '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')   // strip accents: Pérez → Perez (banks often drop them)
    .replace(/\./g, '')                                  // S.L. → SL, S.R.L. → SRL
    .toUpperCase().replace(/[^A-Z0-9 ]+/g, ' ').split(/\s+/).filter((t) => t && !STOP.has(t));
}
export function nameMatchScore(a, b) {
  const A = new Set(normaliseName(a)), B = new Set(normaliseName(b));
  if (!A.size || !B.size) return 0;
  let inter = 0; for (const t of A) if (B.has(t)) inter++;
  return inter / Math.max(A.size, B.size);
}

/* ───────── bank-account holder verification providers ───────── */
const mockProvider = {
  id: 'mock',
  label: 'Demo verifier (no network)',
  async verify({ account, ifsc, expectedName }) {
    // Demo rule: known demo accounts resolve to their real holder; accounts ending in
    // "999" simulate a mismatch; anything else echoes the expected name.
    const KNOWN = { '047073800000022|YESB0000470': 'CLEON POWERTECH SOLUTION' };
    const key = `${account}|${String(ifsc || '').toUpperCase()}`;
    let registeredName = KNOWN[key];
    if (!registeredName) registeredName = String(account).endsWith('999') ? 'UNRELATED ACCOUNT HOLDER' : expectedName;
    return { provider: 'mock', ref: `MOCK-${Date.now().toString(36).toUpperCase()}`, registeredName, bank: ifsc ? ifsc.slice(0, 4) : null };
  },
};

const cashfreeProvider = {
  id: 'cashfree',
  label: 'Cashfree Bank Account Verification',
  async verify({ account, ifsc, expectedName }) {
    const base = process.env.CASHFREE_ENV === 'production' ? 'https://api.cashfree.com' : 'https://sandbox.cashfree.com';
    const res = await fetch(`${base}/verification/bank-account/sync`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-client-id': process.env.CASHFREE_CLIENT_ID,
        'x-client-secret': process.env.CASHFREE_CLIENT_SECRET,
      },
      body: JSON.stringify({ bank_account: account, ifsc, name: expectedName }),
    });
    const j = await res.json();
    if (!res.ok) throw new Error(`Cashfree ${res.status}: ${j.message || JSON.stringify(j)}`);
    return { provider: 'cashfree', ref: j.reference_id || j.ref_id, registeredName: j.name_at_bank || j.name, bank: j.bank_name, raw: j };
  },
};

export function getBankVerifier() {
  if (process.env.CASHFREE_CLIENT_ID && process.env.CASHFREE_CLIENT_SECRET) return cashfreeProvider;
  return mockProvider;
}

// Runs the holder-name check and scores it against the expected beneficiary.
export async function verifyBankAccount({ account, ifsc, expectedName }) {
  const p = getBankVerifier();
  const r = await p.verify({ account, ifsc, expectedName });
  const score = nameMatchScore(r.registeredName, expectedName);
  return { ...r, score, status: score >= 0.8 ? 'verified' : score >= 0.5 ? 'partial' : 'mismatch' };
}
