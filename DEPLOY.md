# Deploying CubaRemesa

The Node server serves **both** the static frontend (from `public/`) and the API,
so the whole app deploys to **one platform**. It needs a host with:

- a **persistent disk** (the SQLite database must survive restarts), and
- a long-running process (for the daily exchange-rate scheduler).

That rules out serverless hosts (Vercel/Netlify) for the backend, so we use
**Render** (Railway and Fly.io work too). One service, one URL, no proxy.

```
Browser ──► Render (Express serves frontend + API, SQLite on a persistent disk)
```

---

## 1. Push the code to GitHub

Render deploys from a Git repo. Easiest with the GitHub CLI (handles login):

```bash
cd "/Users/cristianortizsuarez/Documents/Claude/Projects/Cuba Money"
brew install gh          # if not already installed
gh auth login            # GitHub.com → HTTPS → login with web browser
gh repo create cuba-money --private --source=. --remote=origin --push
```

That creates the repo under your account and pushes everything in one step.

> Manual alternative: create an empty repo at github.com/new named `cuba-money`,
> then `git remote set-url origin https://github.com/<your-handle>/cuba-money.git`
> and `git push -u origin main` (use a Personal Access Token at the password prompt).

---

## 2. Deploy on Render

1. Go to <https://render.com> → **New → Blueprint**, and select your repo.
   Render reads `render.yaml` and proposes a Web Service with a 1 GB disk mounted at `/data`.
   - *Manual alternative:* New → Web Service → Build `npm install`, Start `npm start`,
     Health check `/api/rates`, and add a **Disk** mounted at `/data`.
2. The persistent disk requires a paid instance type (Starter); the blueprint sets `plan: starter`.
3. Fill in the environment variables (the blueprint marks these `sync:false`):
   - `DB_PATH=/data/data.sqlite` — already set in the blueprint
   - `NODE_ENV=production` — already set
   - `ADMIN_EMAIL`, `ADMIN_PASSWORD` — your admin login
   - `BANK_BENEFICIARY`, `BANK_NAME`, `BANK_IBAN`, `BANK_BIC` — your IBAN details
   - `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET`, `PAYPAL_ENV` — optional (demo mode if blank)
   - `RATE_API_TOKEN` — optional (elTOQUE auto-rates; manual if blank)
4. Deploy. You'll get a URL like `https://cubaremesa.onrender.com` — that's the full site.

> **Railway alternative (no GitHub needed):**
> ```bash
> npm install -g @railway/cli
> railway login
> railway init
> railway up
> ```
> Then in the dashboard add a **Volume** mounted at `/data`, set `DB_PATH=/data/data.sqlite`
> and `NODE_ENV=production` plus the same env vars, and redeploy.

---

## 3. Verify

- Open the Render URL → landing page loads and the calculator updates (frontend + API both live).
- Register an account, send a demo transfer, see it in the dashboard.
- Log in as admin (`ADMIN_EMAIL` / `ADMIN_PASSWORD`) → `/admin.html`.

### Custom domain
Add it in Render (Settings → Custom Domains). Update `APP_URL` to match.

---

## Notes

- **Auto-rate scheduler** runs in-process on boot and every 24h. Render keeps the service
  running, so this works. If you move to a host that sleeps idle instances, run
  `npm run rates:update` from a scheduled job (e.g. Render Cron) instead.
- `vercel.json` and `netlify.toml` are kept only if you later want to split the frontend
  onto a CDN; they are **not used** in this single-platform setup.
- Before going live, review the compliance checklist in `README.md` (licensing, KYC/AML,
  PayPal webhooks, real payout integration).
