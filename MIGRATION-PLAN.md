# MIGRATION PLAN (proposal — requires owner approval; nothing executed)

## 0. Rollback point (before any change)
- Package is not under git. Baseline: zip sha256 prefix `6f8cb2d3face3d3d`, tree hash `62a673ccf99b1023`.
- Phase 1 first step: `git init`, commit the untouched tree as `baseline-phase0`, tag it, create branch `phase-1-supabase`. Push to private GitHub repo.
- Keep the live Google Sheet untouched; make a "Make a copy" snapshot before any data export.

## 1. Strategy: strangler, not rewrite
Existing UI/page modules stay. Only the transport (`js/api/client.js`) is replaced, behind the same method names (`api.getCatalog()`, `api.createOrder()`, …) and the same `{success,…}` response shape, so the 5J rules (routes, API compatibility, features) hold. GAS stays only for reporting/export.

## 2. Order of work (one phase at a time, stop for approval after each)
| Phase | Deliverable | Gate before next |
|---|---|---|
| 1 Foundation | `supabase/migrations/0001…` schema (see DATABASE-MAP), seed of *non-secret* reference data only, dev project | You approve schema; run on **dev** project |
| 2 Security | Auth, RLS policies, audit redaction, RLS test suite (customer A cannot read B) | RLS tests PASS with evidence |
| 3 Frontend modularization | Folder layout per brief; move files, don't delete; fix C1/H4/H6/H7/H8 with parity checklist (old vs new function list) | Feature parity checklist signed |
| 4 Themes | tokens → 5 themes + `theme-manager.js` | Visual check |
| 5 Modules | Implement stubs (payments, emergency, inventory, discount, dashboard, audit) with RPC + tests; build missing pages (`#/payment`, emergency status) | Per-module tests |
| 6–9 | R2/Workers, backup/Sheets reporting, load tests, deployment | per brief |

## 3. Data migration
- Unknown: whether the live Sheet holds real data. **Please supply an export (or confirm none)** before Phase 1 data work.
- Users: do not migrate password hashes (SHA-256 unsalted). Import emails/names/roles, send password-reset/invite emails (Supabase Auth). Admin/manager/mechanic accounts recreated manually.
- Orders/payments/emergency (if any): script maps legacy IDs → `legacy_ref`, runs in a transaction on dev first, reconciliation report (row counts, sum of totals).
- No production data migration without your written approval.

## 4. Risks
1. Moving auth forces all users to reset passwords (communicate beforehand).
2. Tax/fee rules currently in code (PPN 10%, fee constants) must be confirmed by you as correct business rules before they become DB settings.
3. Two Supabase Free projects (dev+prod) fit the free tier limit, but free projects **pause after 1 week of inactivity** → keep-alive or accept for dev only; prod must stay active (see COST-AND-QUOTA).

## 5. Open questions for owner (see final message)
