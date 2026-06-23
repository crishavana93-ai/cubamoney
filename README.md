# CubaRemesa — money transfers to Cuba

A full-stack remittance MVP for the **Cuba corridor**, modeled on the structure of
platforms like sendvalu. Senders abroad fund a transfer with **PayPal** or
**bank transfer (IBAN/SEPA)**, and recipients in Cuba receive money via MLC,
USD cash delivery, Cuban pesos, or Cubacel mobile top-up.

## What's included

- **Marketing landing page** — hero, live fee/exchange-rate calculator, payout methods, how-it-works, fees table, FAQ.
- **Accounts** — register / login (JWT in an httpOnly cookie), bcrypt-hashed passwords.
- **Send-money wizard** — amount → recipient → review → pay, with method-specific recipient fields.
- **Payments**
  - PayPal Orders API v2, server-side **create** + **capture** (the recommended secure pattern). Runs in **demo mode** automatically when no PayPal keys are set, so you can test the whole flow.
  - IBAN/SEPA bank transfer — generates a unique payment reference and shows your company bank details; the order moves to *awaiting transfer* until reconciled.
- **User dashboard** — transfer history with live status, saved recipients.
- **Admin panel** — all orders, manual status workflow, live editing of rates/fees per payout method, exchange-rate automation controls, and KPIs (volume, fee revenue, users).
- **Bilingual (Spanish default + English toggle)** — full UI i18n; language switch in the header, persisted per visitor.
- **Auto exchange rate** — pulls the informal USD→CUP / MLC rate from the elTOQUE TRMI API daily and applies an admin-set margin to CUP and MLC payouts.

## Payout methods (Cuba)

| Method | Receives in | Default delivery |
|---|---|---|
| MLC bank transfer (BANDEC / BPA / Metropolitano) | MLC | 5–7 business days |
| MLC card top-up | MLC | 3–5 business days |
| USD cash delivery to the door | USD | 2–5 business days |
| Cuban peso (CUP) cash delivery | CUP | 1–3 business days |
| Cubacel mobile top-up | CUP | Within minutes |

Rates seeded reflect mid-2026 market context (USD ≈ 660–670 CUP informal; MLC near the dollar). **All rates and fees are editable live in the admin panel** — treat the seeds as starting points.

## Tech stack

- **Backend:** Node.js + Express, SQLite (better-sqlite3), JWT auth, bcrypt.
- **Frontend:** static HTML/CSS + vanilla ES modules (no build step).
- **Payments:** PayPal REST Orders API via native `fetch`.

## Setup

```bash
npm install
cp .env.example .env      # then edit values
npm start                 # → http://localhost:3000
```

On first run the database is created and seeded with default rates and an admin user.

### Default admin

Set in `.env` (`ADMIN_EMAIL` / `ADMIN_PASSWORD`). Defaults:
`admin@cubaremesa.com` / `admin1234` — **change these before any real deployment.**

### Enabling real PayPal

1. Create a sandbox app at <https://developer.paypal.com/dashboard/applications>.
2. Put the client ID/secret in `.env` (`PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET`, `PAYPAL_ENV=sandbox`).
3. Restart. The site auto-detects credentials and renders real PayPal buttons; with no keys it stays in demo mode.

### Bank (IBAN) details

Set `BANK_BENEFICIARY`, `BANK_NAME`, `BANK_IBAN`, `BANK_BIC` in `.env`. These are shown to senders who choose bank transfer.

### Language

Spanish is the default; visitors can switch to English with the ES/EN toggle in the header (choice persists in `localStorage`). All copy lives in `public/js/i18n.js` — add a language by adding a dictionary there.

### Auto exchange rate (elTOQUE)

1. Register for a free API token at <https://eltoque.com> (API *Tasas*).
2. Put it in `.env` as `RATE_API_TOKEN` (and optionally `RATE_API_URL`).
3. The server then refreshes rates on boot (if stale) and once every 24h. You can also trigger it manually from the admin panel ("Update rates now") or via `npm run rates:update`.

The **margin** (platform spread, default 3%) is set in the admin panel and applied to CUP payouts (`cup_cash`, `cubacel`) and MLC payouts (`mlc_bank`, `mlc_card`): `CUP rate = informal_USD × (1 − margin)`, `MLC rate = (informal_USD ÷ informal_MLC) × (1 − margin)`. USD cash delivery is left untouched. Without a token, rates simply stay manual.

## Project structure

```
server.js            Express app + all API routes
src/
  db.js              SQLite schema
  seed.js            Default rates + admin user
  auth.js            JWT sign / verify / guards
  quote.js           Fee + FX quote engine
  paypal.js          PayPal Orders API client (+ demo fallback)
public/
  index.html         Landing page
  send.html          Send-money wizard
  login/register.html
  dashboard.html     User transfers + recipients
  admin.html         Admin panel
  css/styles.css     Design system
  js/app.js          Shared frontend helpers
```

## Order lifecycle

`pending_payment` → (`paid` via PayPal capture **or** `awaiting_transfer` via IBAN) → `processing` → `completed`
(plus `cancelled` / `failed`). PayPal orders are only marked paid when capture status is `COMPLETED`.

## Production / compliance notes

This is a working MVP, not a launch-ready regulated service. Before going live you must add:

- **Licensing** — money transmission is regulated; you need the appropriate licence(s) in every jurisdiction you serve.
- **KYC/AML & sanctions screening** — verify sender identity and screen against sanctions lists (a `kyc_status` field is stubbed in).
- **PayPal webhooks** — verify webhooks server-side to confirm payments asynchronously rather than trusting only the browser callback.
- **Payout integration** — connect real Cuba payout partners/APIs; payouts are currently advanced manually from the admin panel.
- **Hardening** — HTTPS, rate limiting, CSRF protection, secrets management, audit logging, and DB backups.
```
