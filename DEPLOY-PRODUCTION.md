# PAS-One — deploy to production (owner steps, in order)
Do ONE batch, confirm to Claude, then continue. Nothing here activates a paid service. Never paste a `service_role` key anywhere.

## Batch A — Supabase (database + auth)
1. supabase.com → New project `PAS-One` (Free), region Singapore. Save the DB password in a password manager.
2. SQL Editor → paste `supabase/dist/pas-one-all.sql` → Run (expect "Success").
3. Authentication → Sign In / Providers: Email ON; **Anonymous sign-ins ON**. Authentication → Attack Protection: enable CAPTCHA (Cloudflare Turnstile, free) — protects anonymous sign-ins from abuse.
4. Authentication → URL Configuration: Site URL = your Pages URL (after Batch D).
5. Settings → API: copy **Project URL** and **anon key** (public). Send both to Claude.
6. Open the app, register your own account, then SQL Editor: `update public.profiles set role='admin' where email='mgrsrvpas@gmail.com';`
7. Create the reporting account (Batch F) the same way and set `role='manager'`.
8. Settings table: confirm TAX_PERCENTAGE and the emergency fee values (Table Editor → settings).

## Batch B — GitHub
Create a **private** repo `pas-one`; push this repository (`git remote add origin …; git push -u origin --all --tags`). Settings → Secrets → Actions: `SUPABASE_DB_URL` (Settings → Database → connection string, **session pooler / direct**, not transaction pooler), `BACKUP_PASSPHRASE` (long random; also store it OUTSIDE GitHub).

## Batch C — Cloudflare R2 + media Worker
1. Cloudflare → R2 → create bucket `pas-media` (keep **public access OFF**).
2. `cd worker && npm i && npx wrangler login` → edit `wrangler.toml`: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `ALLOWED_ORIGIN` (exact Pages origin, https, no trailing slash).
3. `npx wrangler secret put SIGNING_SECRET` (random 32+ chars) → `npx wrangler deploy`. Send Claude the `*.workers.dev` URL.

## Batch D — Cloudflare Pages
Pages → Connect to Git → repo `pas-one`; build command: none; output directory: `frontend`. Claude fills `frontend/js/config.js` (SUPABASE_URL, SUPABASE_ANON_KEY, MEDIA_WORKER_URL) and tightens `frontend/_headers` to the exact hosts; commit → Pages redeploys.

## Batch E — Backups
GitHub → Actions → `db-backup` → Run workflow once. Download the artifact. Do the restore drill into a scratch Supabase project (`docs/BACKUP-RESTORE.md`). Repeat monthly.

## Batch F — Google Sheets reporting
Create the Sheet → Extensions → Apps Script → paste `reporting/sheets-sync.gs`. Script properties: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `REPORT_EMAIL`, `REPORT_PASSWORD` (the manager-role reporting account). Run `syncReports` once (authorize), then `installDailyTrigger`.

## Batch G — Smoke test with real data (you + Claude)
Customer: register → catalog → cart → checkout → upload payment proof. Staff: verify payment → assign mechanic → complete. Guest: panic button. Inventory: add part, stock-out. Discount: request → approve. Check dashboard, Sheets sync, audit log. Only then announce.

## Rollback
Frontend: Pages → Deployments → roll back to the previous deployment. Worker: `wrangler rollback`. Database: migrations are forward-only; restore from backup into a fresh project (`docs/BACKUP-RESTORE.md`) and repoint `config.js`.
