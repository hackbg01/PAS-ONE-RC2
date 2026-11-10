# PAS-ONE — PHASE 0 AUDIT REPORT
Date: 2026-11-06 · Mode: read-only · Baseline: `935b0cce-pas-one-complete.zip` (sha256 prefix `6f8cb2d3face3d3d`; tree hash `62a673ccf99b1023`)
Not a git repository (no history, no rollback point) → see MIGRATION-PLAN §0.

## 1. Executive summary
The delivered package is a **UI prototype with a thin Google Apps Script (GAS) stub backend**, not the "production-ready, 100% tested" system claimed in `DELIVERY-FINAL.md` / `CHANGELOG.md`.
Real source is ~2,700 lines (app.gs 473, init-sheets.gs 188, frontend JS ~1,900, CSS ~990, HTML 182). The other ~6,600 lines are Markdown claims.

| Area | Real state |
|---|---|
| Real backend logic | Auth (register/login/me), Catalog CRUD, Orders (create/list/get/update-status), audit append |
| Stub backend (hard-coded return) | Payments, Emergency, Inventory, Discount, Location, Dashboard (fake numbers 5/2/3/1/5,000,000/2), Audit list (`logs: []`) |
| Frontend ↔ backend transport | **Broken** (see C1) — the app cannot reach GAS as written |
| Security | **Critical** — forgeable tokens, unsalted SHA-256, default admin password, open audit/endpoints |
| Tests | 1 browser-console smoke script (DOM/config presence). No backend, RLS, concurrency, or load tests. "56 tests 100% pass" is **unverified/unsupported** |
| Scale target (500 tx/day, 50–100 concurrent) | GAS+Sheets will not meet it (full-sheet scans on every call, no locking, ~6 min/exec & quota limits) |

**Recommendation:** treat existing code as the *functional specification + UI baseline* (J1–J5), and implement real behavior in Supabase per phases 1–5. Nothing can be "preserved working" where it never worked; items marked STUB/BROKEN are preserved as requirements.

## 2. Findings (file · function · behavior · issue · impact · priority · solution)

### Critical (P0)
| ID | Where | Current behavior | Issue / Impact | Solution |
|---|---|---|---|---|
| C1 | `client.js:request` vs `app.gs:doPost` | Client builds `?endpoint=catalog/list?x=y`, uses GET/PUT/PATCH/DELETE, sends `Authorization` + JSON content-type header | GAS web apps only route POST to `doPost`; GET returns static text (`doGet`). Custom headers/JSON content-type trigger a CORS preflight GAS doesn't answer. Second `?` corrupts the endpoint param. Token is read from `e.parameter` not headers. **Every API call fails** in a browser | Replaced by Supabase client (`supabase-js`/RPC) in Phase 3/5. Interim: none needed |
| C2 | `app.gs:generateToken/verifyToken` | Token = Base64 of JSON `{userId,email,role,iat}`; `SECRET_KEY` read but **never used**; no signature, no expiry check | Anyone can forge `{"role":"admin"}` → full admin. Total auth bypass | Supabase Auth JWT + RLS (Phase 2) |
| C3 | `app.gs:registerUser/loginUser` | `SHA-256(password)`, no salt, no work factor; non-constant compare; no rate limit | Rainbow-table crackable if sheet leaks | Supabase Auth (bcrypt/argon). Force reset on migration |
| C4 | `init-sheets.gs:seedTestData` | Seeds `admin@pasone.local/admin123`, mechanic123, manager123; logs the passwords | Known default admin creds; if run in production = open admin | Never seed creds in prod; create owner via Supabase dashboard |
| C5 | `app.gs:createOrder/calculateSubtotal` | Trusts client-sent `price`/`quantity`; no stock check/decrement; tax hard-coded 10% (Settings has TAX_PERCENTAGE, unused); `'ORD-'+Date.now()` | Customer can order at Rp 1; negative qty; ID collisions; overselling | Server-side pricing RPC, transaction, sequence IDs, idempotency key (Phase 5) |
| C6 | `app.gs:doPost` → `logAudit` | Logs **entire payload** of every request (incl. `password` on login/register) into AuditLog sheet, before auth | Plaintext passwords stored in audit sheet; sheet write on every request (quota/latency) | Redact; log only security-relevant events (Phase 2) |
| C7 | `app.gs:getOrder` | Returns any order by id to any authenticated user (no ownership check) | IDOR: customer data/PII exposure | RLS ownership policy |
| C8 | `app.gs` Web App config ("Anyone") + `handleAudit/Dashboard/Payments/Discount/Inventory/Emergency/Location` | These handlers perform **no** auth/role check | Unauthenticated callers reach them; dashboard/audit currently return fake/empty but are structurally open | Role checks via RLS/RPC |

### High (P1)
| ID | Where | Issue | Solution |
|---|---|---|---|
| H1 | `app.gs` every function | Opens spreadsheet + `getDataRange().getValues()` and linear-scans per call; whole-sheet `setValues` on update | O(n) per request, 6 min/exec & 30 concurrent exec limits; lost updates (no `LockService`). Cannot reach 500 tx/day with concurrency. → PostgreSQL |
| H2 | `app.gs:updateOrderStatus` | Any string accepted as status; no state machine; writes whole sheet back | Invalid states, race overwrites. → enum + transition function |
| H3 | `app.gs:handleCatalog` + `deleteCatalogItem` | Hard `deleteRow`; violates J1 spirit & breaks historical orders. `updateCatalogItem` cannot blank description (falsy check) | Soft-delete (`active=false`) |
| H4 | `app.js`, `order-management.js`, `catalog-*`, etc. | Server/user data interpolated into `innerHTML` and inline `onclick="...('${id}')"` | Stored XSS (item name, customer name, order data). Token in `localStorage` makes theft trivial. → escape/`textContent`, event delegation, CSP |
| H5 | `app.js:handleRoute` | Role gating is client-only (`isAdmin()` from localStorage user) | Cosmetic only; enforcement must be DB-side |
| H6 | `index.html` | Loads only 4 of 8 page modules; `admin-orders.js`, `admin-payments.js`, `admin-catalog.js`, `emergency-calculator.js` are **never loaded**; they duplicate `order-management`, `payment-verification`, `catalog-management` | Dead/duplicate code. **Do not delete (J1/J2)**; consolidate under Phase 3 with parity check |
| H7 | `index.html`/`app.js` | Routes `#/payment` and `#/emergency/:id` are navigated to but have **no page/handler** (falls through to catalog). Checkout, QRIS display, proof upload, live emergency status, mechanic map have no UI | Core purchase flow cannot complete |
| H8 | `app.js` | `cart` initialised `[]`; `localStorage.cart` is written but **never read back** → cart lost on reload despite "persistent cart" claim | Restore on init |
| H9 | `app.js:triggerEmergency` | No geolocation error callback; backend returns fake `EMG-<ts>` and **stores nothing**; phone `'N/A'`; cost calculator unused | A panic request is silently lost → safety/business risk |
| H10 | `emergency-calculator.js` (+ config) | Fee logic is client-side (spoofable); uses device clock/timezone for "normal hours"; straight-line (haversine) distance | Move to server; use Asia/Jakarta explicitly. Business rule values preserved: free radius 30 km, +Rp10,000/km, guest visit Rp250,000, off-hours Rp250,000, hours 06–18 |
| H11 | `config.js` / `.env.example` | `APPS_SCRIPT_URL` placeholder is a malformed pattern; `SPREADSHEET_ID` placed in frontend config | Spreadsheet ID shouldn't ship to browser; `.env.example` is not consumed by any build (no build step) |
| H12 | `inventory-management.js` | Add/mutate/CSV-import are `// TODO` (lines ~269–286); backend inventory stub | Module is display-only. J4: implement only existing intended features |

### Medium (P2)
- M1 `payment-verification.js` rejects payment via `updateOrderStatus(...,'payment_rejected')` — status not in `ORDER_STATUS`/`PAYMENT_STATUS` config; `admin-payments.js` sends client-supplied `verifiedAt`.
- M2 Payments/proof: `proofUrl` is a free-text URL; no upload; no amount reconciliation; no idempotency for callbacks.
- M3 `listOrders` returns *all* rows (no pagination) and `JSON.parse` per row may throw on corrupt cell.
- M4 `admin-orders.js:115` uses `alert()` for filter output; mixed `confirm()`/`alert()` UX.
- M5 `mobile-menu.js` builds hamburger only if width ≤768 at load (no rebuild on rotate besides `handleResize` – not verified in browser).
- M6 `tab` handling in `app.js:attachEventListeners` parses `onclick` attribute text with regex; fragile.
- M7 Dashboard counts/revenue are literals — **mock data in production path** (violates "no production mock data").
- M8 Status vocab mismatch: orders `pending_payment` stored in *both* orderStatus and used as paymentStatus filter value (`paymentStatus:'pending_payment'`) while payment enum is `pending|verified|failed`; Orders sheet writes paymentStatus `'pending'`.
- M9 Tax 10% PPN applied to everything incl. parts & services, rate hard-coded in two places (client display + server).
- M10 Timezone: `new Date()` stored in Sheets cells (spreadsheet TZ dependent).

### Low (P3)
- Documentation inflation/contradiction (DELIVERY-SUMMARY vs DELIVERY-FINAL vs FEATURE-MATRIX statuses); emoji-heavy console output; `.gitignore` OK (excludes `.env`, credentials).
- No `package.json`, lint, CSP, `<meta>` hardening, accessibility audit, i18n file (UI is Bahasa Indonesia).
- Missing `database/` content: directory exists but is **empty** (docs reference schemas there).

## 3. What exists that is worth preserving (spec value)
Role model (admin/mechanic/manager/customer/guest), status vocabularies, emergency pricing rules, Sheets column schema (10 sheets), 3-portal IA, Bahasa Indonesia copy, design tokens (`design-tokens.css`), page/UI structure.

## 4. Verification limits
Audit is static reading. No code was executed against GAS/Sheets (no deployment/credentials supplied). Browser behavior (e.g., C1 CORS failure) is derived from documented GAS web-app behavior and should be confirmed with one live request before Phase 1 if you want evidence.
