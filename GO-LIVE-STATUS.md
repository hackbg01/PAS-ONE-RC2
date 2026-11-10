# GO-LIVE STATUS vs. your Definition of Done (2026-11-07)
**Verdict: NOT production-ready.** Everything buildable offline is built and tested on a local stack. Items marked ⛔ need your Supabase/Cloudflare/GitHub accounts and cannot be proven by me before then.

| Definition of Done | Status | Evidence |
|---|---|---|
| Frontend ↔ backend connected | ✅ local / ⛔ real project | Adapter e2e 56/56, browser UI 10/10 against Postgres+PostgREST |
| Database running | ⛔ | Migrations 0001–0006 apply cleanly to an empty DB; not yet on Supabase |
| Authentication works | ⛔ | JWT/RLS paths tested with minted tokens; **real Supabase Auth (signup, email, anonymous sign-in) untested** |
| Roles & RLS tested | ✅ local | 81 SQL assertions: customer isolation, escalation blocked, anon has no RPC access, RLS on 14/14 tables |
| Main modules end-to-end | ✅ local | auth, catalog, cart, orders, payments(+R2 proof), emergency, mechanic assignment, inventory, discount, dashboard, audit, reports |
| No dummy data in operations | ✅ | dashboard is SQL aggregates; stubs removed; no mock responses |
| Transactions & validation | ✅ local | server pricing, idempotency, stock locks; 30-buyer/10-stock race → exactly 10 sold; deadlock guard; 10 parallel verifications → 1 payment |
| File storage | ✅ local / ⛔ real R2 | Worker 25/25 (magic bytes, size, ACL via RLS, signed links, CORS) on simulated R2 |
| Reporting | ✅ local / ⛔ real Sheets | Apps Script run against real stack with mocked Google APIs 7/7 |
| Backup & restore tested | ✅ local / ⛔ real | drill: 14 tables match, tamper/wrong key/non-empty refused; Supabase permission for auth restore unverified |
| Security & performance tests | ◐ | CSP/headers verified in browser; **load (local, 2 vCPU)**: 50 VUs p95 ≤19 ms, 100 VUs p95 ≤64 ms, 0 errors, 9.6k orders consistent. **No penetration test; not measured on Supabase Free or over the internet** |
| Deployed & usable | ⛔ | `docs/DEPLOY-PRODUCTION.md` |

## Known gaps (not hidden)
- CSP keeps `script-src 'unsafe-inline'`: 58 inline `onclick` handlers remain (rewriting = regression risk). Mitigated by output escaping + restricted `connect-src`/`frame-ancestors`. Follow-up task.
- No admin UI to create/promote staff accounts (role changes via `admin_set_role` RPC / SQL). Not built (J4).
- Mechanic live-map is not drawn (data and RPC exist).
- Payment is manual-verification (QRIS/transfer proof). No payment gateway callbacks exist, so "duplicate callback" protection is covered by idempotent verify only.
- Default theme prices (gold on white) are 2.1:1 contrast — original design, left unchanged (J5); Light theme is AA.
- Capacity numbers are test results on a local machine, not guarantees for Supabase Free (shared CPU, connection limits, auto-pause after inactivity).
- Storage estimate from load test: ~1.74 KB per complete order (orders+items+payments+audit incl. indexes) → ~320 MB/yr at 500 orders/day; Supabase Free DB is 500 MB (verify current limit). Plan: export + prune `audit_logs` older than 90 days after backup, or budget Pro.

## Owner decisions recorded 2026-11-09
Tax 11%; emergency fee Rp10.000/km beyond 30 km; Fleet visit 250k all hours; Retail visit 250k (06:00–22:00) / 300k (22:00–06:00); dashboard revenue = verified payments. Assumption to confirm: a customer is Fleet only when an admin marks the account Fleet; everyone else (incl. guests) is Retail.
