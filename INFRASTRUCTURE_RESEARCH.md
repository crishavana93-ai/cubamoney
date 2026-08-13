# Building a Digital Remittance Platform (Cuba Corridor): Architecture & Build-vs-Buy Research

*Educational / architecture-planning research. Not legal advice. The Cuba corridor is subject to active, recently-changed U.S. sanctions — validate every decision with qualified sanctions counsel before any money moves (see §9).*

## Executive summary
Modern remittance companies are ~80% **assembled from vendors** and ~20% **built**. Across Wise, Remitly, WorldRemit and Sendwave the pattern is: own the app, the ledger, the FX/pricing engine, compliance decisioning, and corridor relationships — buy/partner for pay-in processing, identity verification, sanctions data, fraud signals, and most payout endpoints.

The five hard parts you must own:
1. A correct **double-entry ledger** with idempotency + reconciliation (buy the engine, own the money model).
2. A **compliance program** (KYC/AML/sanctions/OFAC) — orchestrate vendors, own the policy and filings.
3. **Licensing** — the biggest gate; most launch as an *agent of a licensed money transmitter* or on a *BaaS/sponsor-bank*.
4. **FX pricing** (mid-market source + margin).
5. **Payout delivery** in the destination country.

For **Cuba** the generic playbook partly breaks: mainstream rails (Wise, PayPal, Western Union) don't serve Cuba, and the historical on-island processor sits under **GAESA**, freshly **OFAC-designated on 7 May 2026**. This is a specialist, relationship-driven corridor, not a plug-in-an-aggregator one.

## 1) Pay-in rails
- Cards + Apple/Google Pay: Stripe, Adyen, Checkout.com, Braintree (PayPal), Nuvei.
- PayPal: via PayPal Commerce Platform / Braintree (has Chargeback Protection + Payouts API).
- Bank / open banking / ACH / SEPA: Plaid+Dwolla or Stripe (US ACH); TrueLayer, Tink, GoCardless, Yapily (UK/EU). Much cheaper than cards.
- Orchestration: Payrails, Spreedly, Modern Treasury route across multiple PSPs.
- Risk: cards/PayPal carry chargeback/friendly-fraud risk on irreversible payouts → prefer bank debit for larger amounts, stage payout until pay-in clears, step-up KYC on first card/PayPal transfer.
- **For our MVP (PayPal + bank/IBAN): Buy** — Braintree/PayPal Commerce + an open-banking/ACH provider.

## 2) KYC / AML / sanctions
- IDV (document+biometric): Sumsub (broadest), Veriff (fast), Onfido (Entrust), Persona (most configurable), Jumio, Stripe Identity, Trulioo.
- Sanctions/PEP/adverse-media: **ComplyAdvantage** (OFAC/UN/EU/HMT + PEP + adverse media), Refinitiv World-Check, Dow Jones, ComplyCube.
- Orchestration: Alloy (route/fallback between KYC providers).
- Transaction monitoring/case mgmt: Unit21, Sardine, ComplyAdvantage, Feedzai, Hawk:AI, NICE Actimize.
- Indicative pricing: Stripe Identity ~$1.50/verif, Sumsub ~$1.35–1.50, Persona ~$2–5.
- **Own:** the AML program — risk rating, screen **sender AND recipient** vs OFAC SDN + State Dept. **Cuba Restricted List**, thresholds, monitoring, SAR/CTR, a designated BSA/AML officer.

## 3) Core money ledger
- Transaction DB: **TigerBeetle** (open-source, high-throughput, double-entry enforced in the DB).
- Programmable ledger-as-a-service: **Formance**, Fragment.
- Full-stack payment ops: Modern Treasury, Moov, Column.
- Non-negotiables: balanced debit+credit, append-only immutable log, balance limits in the DB, **idempotency keys**, atomicity, reconciliation vs PSP/payout statements.
- **Buy the engine** (TigerBeetle for control/perf, Formance for speed), **own the chart of accounts**. Never hand-roll on a generic SQL table (see Synapse, §6).

## 4) FX / rate engine
- Source mid-market rate from an FX feed (or the payout aggregator/settlement bank), refresh on a schedule, **lock at quote time**.
- Margin models: transparent (mid-market + visible fee, like Wise) vs baked-in (hidden 3–5% spread).
- Rate-hold + bulk hedging between quote and settlement.
- **Build:** a small pricing service → quote object with locked rate + expiry; write the FX spread to the ledger.

## 5) Payout rails to recipients
- Bank deposit: Thunes, Nium, dLocal, TerraPay.
- Mobile wallets: TerraPay, Thunes, Onafriq (MFS Africa), dLocal.
- Cash pickup: aggregator + local agent networks.
- Push-to-card: **Visa Direct**, **Mastercard Send** (via Cross River, VoPay, Runa, or direct).
- Global aggregation: **Thunes** (130+), **Nium** (190+), **dLocal**, **TerraPay**, Onafriq.
- **Cuba caveat:** these aggregators generally **do not serve Cuba**. Payout is via specialist providers with direct Cuban-bank/card relationships (§9).

## 6) Licensing & compliance (and the shortcuts)
- US: register with **FinCEN as an MSB** (not permission alone) + **state MTLs** (net worth, surety bond, safeguarding). 50-state coverage = 12–24+ months, $1M+. Safeguarding = permissible investments ≥ 100% of customer funds.
- **Agent exemption:** an MSB solely acting as agent of another MSB need not register — the classic shortcut.
- EU/UK: **EMI** or **PI** license; must safeguard/segregate customer money.
- Three shortcuts: (1) **agent of a licensed MT/EMI** (fastest legit path), (2) **BaaS/sponsor-bank** (Unit, Treasury Prime, Synctera; sponsor banks Cross River, Column), (3) get your own licenses over time (Wise holds 80+).
- **Cautionary tale — Synapse (2024):** middleware ledger between banks and depositors collapsed with $85M+ unaccounted. **Your ledger must reconcile to real, segregated bank balances at all times.**

## 7) Fraud prevention
- Onboarding: device fingerprinting + behavioral biometrics + IDV (Sardine, SEON, + KYC vendors).
- Transaction/AML monitoring: **Sardine**, **Unit21** (no-code rules, real-time scoring, SAR case mgmt); Feedzai/NICE/Hawk:AI at enterprise scale.
- Remittance tactics: stage payout until pay-in settles, step-up KYC on first card/PayPal transfer, per-sender/recipient velocity limits, structuring detection (per-recipient caps).
- **Buy the engine, own the rules and analyst workflow.**

## 8) Reference architecture (publicly known)
**Wise:** 1,000+ microservices, 700+ Java repos, 850+ engineers, AWS. Key trick: **local-in / local-out** — holds its own local bank accounts per country and pays out locally, netting/rebalancing in bulk instead of wiring cross-border. 80+ licenses, direct access to 8 domestic payment systems, 65% instant.
**Remitly/WorldRemit/Sendwave:** same shape — owned app + ledger + compliance + pricing, partnered payout networks; Sendwave pioneered mobile-money-first payouts.

Common stack:
```
App → API gateway → KYC/screening → Quote/FX → PSP router (pay-in) +
Payout router → Double-entry ledger (source of truth) → Fraud/AML →
Reconciliation → Compliance back-office (case mgmt, SAR/CTR)
```

## 9) Cuba corridor specifics (the decisive constraint)
- **Legality:** family remittances to close relatives authorized under **31 CFR §515.570** (CACR). 2022 removed the $1,000/quarter cap, but restrictions tightened since; 2026 consumer guides still describe a working ~$1,000/quarter per-recipient limit — **confirm with counsel.** Cuba Restricted List entities are excluded.
- **CRITICAL 2026:** **E.O. 14404 (1 May 2026)** + **GAESA designation (7 May 2026)**. OFAC issued **Cuba GL 1** authorizing E.O. 14404-prohibited transactions **where already authorized under the CACR** — CACR family remittances aren't automatically cut off, but GL 1 doesn't expand authorization. The historical processor **FINCIMEX/Orbit S.A. sits under GAESA** (why Western Union suspended Cuba in Nov 2020). **Corridor design must route around GAESA-controlled infrastructure while staying inside GL 1 / §515.570.**
- **How money reaches the island today** (Fonmoney, Sendvalu, Cuballama, Tropipay, DUCApp, etc.):
  - MLC card top-up (BPA/BANDEC/Banco Metropolitano) — 5–7 days
  - Bank/card deposit (AIS, Clásica, MLC) — 1–5 days
  - USD/EUR cash home delivery via local agents — 24–72h
  - Cubacel/ETECSA mobile top-up — <1 min
  - Goods/groceries (Supermarket23, Katapulk) — hours–24h
  - Pay-in via card, bank transfer, sometimes Apple/Google Pay, Bizum, TropiPay. **PayPal and Wise do NOT operate the corridor.**
- **Implication:** on the Cuba side you **partner with an existing licensed Cuba-corridor delivery operator** (or build on-island agent relationships) — not Thunes/Nium — and document the CACR basis + GAESA/CRL-clean routing for every payout type.

## 10) Recommended architecture for our Cuba app
```
Sender app (web + mobile) → API gateway/BFF
 ├─ Onboarding KYC (Persona/Sumsub) + sanctions screening (ComplyAdvantage: OFAC SDN + Cuba Restricted List)
 ├─ Quote/FX engine (mid-market feed + margin + fixed fee, rate lock, FX spread → ledger)
 ├─ Pay-in orchestration: PayPal (Braintree/Commerce), cards + Apple/Google Pay, bank/IBAN (open banking SEPA / Plaid+Dwolla ACH)
 ├─ DOUBLE-ENTRY LEDGER (TigerBeetle/Formance) — source of truth: user wallet, in-flight, settlement, fee, FX, payout-partner accounts; idempotency + immutable log
 ├─ Cuba payout (NOT Thunes/Nium): partner operator for MLC top-up, bank/card deposit, USD cash home delivery, Cubacel — routed clear of GAESA/CRL
 ├─ Reconciliation (PSP + bank + payout partner)
 └─ Compliance back-office: case mgmt, SAR/CTR, recipient re-screening, recordkeeping
```
Regulatory wrapper to start: **agent of an existing licensed US money transmitter covering Cuba**, or a BaaS/sponsor-bank willing to take the corridor risk. Own MTLs later.

## 11) Build vs Buy vs Partner checklist
**Phase 0 (before product code):** sanctions counsel opinion (§515.570 + E.O. 14404 + GL 1) · regulatory wrapper (agent-of-licensed-MT) · BSA/AML program + officer · Cuba payout partner verified GAESA/CRL-clean.
**Phase 1 (MVP US/EU→Cuba):** pay-in PayPal+cards (Braintree) · bank/IBAN (TrueLayer/GoCardless/Plaid+Dwolla) · KYC (Persona/Sumsub) · screening (ComplyAdvantage) · ledger (Formance/TigerBeetle) · FX engine (build) · fraud (Sardine/Unit21) · Cuba payout (partner) · reconciliation (build) · app + back-office (build).
**Phase 2 (scale):** PSP orchestration (Payrails/Spreedly) · KYC orchestration (Alloy) · own MTLs + MSB/EMI · safeguarding reconciled daily (avoid Synapse) · recipient re-screening + structuring detection · more corridors (aggregators) · SAR/CTR automation (Unit21).

**The five things you must own:** the money model on the ledger · the compliance program & filings · FX pricing/margin · reconciliation proving ledger = segregated bank balances · corridor routing that stays inside GL 1/§515.570 and clear of GAESA/Cuba Restricted List.

## Key sources
Wise: bytebytego.com/p/the-tech-stack-powering-wise · fintechwrapup.com · medium.com/wise-engineering. Ledger: formance.com · interledger.org (TigerBeetle) · sdk.finance. KYC/AML: idenfy.com · emphasoft.com · unit21.ai. Payouts: airwallex.com (Thunes) · mpdocs.nium.com · runa.io (Visa Direct). Licensing/BaaS: innreg.com · treasuryprime.com. FX: wise.com/mid-market-rate · monito.com. Cuba/sanctions: ofac.treasury.gov/faqs/1253 & /1258 · cubasbest.com/how-to-send-money-to-cuba · fonmoney.com/send-money-to-cuba.
