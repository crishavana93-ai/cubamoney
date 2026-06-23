# Deploying CubaRemesa

The app has two parts:

- **Backend** — Express + SQLite. Needs a host with a **persistent disk** (the SQLite file must survive restarts) and long-running processes (for the daily rate scheduler). Vercel can't do this, so the backend goes on **Render** (or Railway / Fly.io).
- **Frontend** — the static files in `public/`. These go on **Vercel**, which proxies `/api/*` to the backend so the browser stays same-origin (cookies work, no CORS).

```
Browser ──► Vercel (static frontend)
                │  /api/* rewrite (proxy)
                ▼
            Render (Express + SQLite on a persistent disk)
```

You'll deploy the **backend first** (to get its URL), then point Vercel at it.

---

## 0. Push the code to GitHub

Both Render and Vercel deploy from a Git repo.

```bash
cd "Cuba Money"
git init
git add .
git commit -m "CubaRemesa"
# create an empty repo on github.com, then:
git remote add origin https://github.com/<you>/cuba-money.git
git push -u origin main
```

`.gitignore` already excludes `node_modules`, `.env`, and the local `data.sqlite`.

---

## 1. Backend on Render

1. Go to <https://render.com> → **New → Blueprint**, and pick your repo. Render reads `render.yaml` and proposes a **Web Service** with a 1 GB disk mounted at `/data`.
   - *Or* do it manually: **New → Web Service**, Build `npm install`, Start `npm start`, Health check `/api/rates`, and add a **Disk** mounted at `/data`.
2. The disk requires a paid instance type (Starter). The blueprint already sets `plan: starter`.
3. Set the environment variables (the blueprint marks these `sync:false` so you enter them in the dashboard):
   - `DB_PATH=/data/data.sqlite` (already in blueprint)
   - `NODE_ENV=production` (already in blueprint)
   - `ADMIN_EMAIL`, `ADMIN_PASSWORD` — your admin login
   - `BANK_BENEFICIARY`, `BANK_NAME`, `BANK_IBAN`, `BANK_BIC` — your IBAN details
   - `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET`, `PAYPAL_ENV` — optional (demo mode if blank)
   - `RATE_API_TOKEN` — optional (elTOQUE auto-rates; manual if blank)
4. Deploy. When it's live you'll get a URL like `https://cubaremesa-api.onrender.com`. Test it: open `https://<your-api>/api/rates` — you should see JSON.

> **Railway alternative:** New Project → Deploy from repo → add a **Volume** mounted at `/data`, set `DB_PATH=/data/data.sqlite` and `NODE_ENV=production`. Same env vars.

---

## 2. Frontend on Vercel

1. Edit **`vercel.json`** and replace the destination host with your backend URL from step 1:
   ```json
   "destination": "https://cubaremesa-api.onrender.com/api/:path*"
   ```
   Commit and push.
2. Go to <https://vercel.com> → **Add New → Project**, import the same repo.
3. Framework preset: **Other**. Leave the build command empty. `vercel.json` already sets the output directory to `public`.
4. Deploy. You'll get a URL like `https://cuba-money.vercel.app`.

That's it — the frontend is live and its `/api/*` calls are proxied to Render. Because the browser only ever talks to the Vercel domain, the auth cookie is same-origin and no CORS config is needed.

### Using a custom domain
Add it in Vercel (Project → Domains). The proxy keeps working unchanged.

---

## 3. Verify

- Open the Vercel URL → the landing page loads, calculator updates (proves the proxy reaches the backend).
- Register an account, send a demo transfer, and check it in the dashboard.
- Log in as admin (`ADMIN_EMAIL`/`ADMIN_PASSWORD`) → `/admin.html`.

---

## Alternative: skip the proxy (direct cross-origin)

If you'd rather have the frontend call the backend directly instead of via the Vercel rewrite, on the **backend** set:

- `ALLOWED_ORIGIN=https://your-app.vercel.app`
- `COOKIE_CROSS_SITE=true`

and change the frontend `api` base in `public/js/app.js` to the absolute backend URL. The proxy approach above is simpler and recommended.

---

## Auto-rate scheduling note

The backend refreshes exchange rates in-process on boot and every 24h. Render keeps the service running, so this works. If you ever move the backend to a platform that sleeps idle instances, trigger `npm run rates:update` from a scheduled job (e.g. Render Cron) instead.
