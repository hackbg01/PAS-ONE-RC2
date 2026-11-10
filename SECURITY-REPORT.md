# SECURITY REPORT — Phase 0 (static review)

| # | Sev | Finding | Evidence | Fix (phase) |
|---|---|---|---|---|
| S1 | Critical | Unsigned, non-expiring bearer token; role taken from client-supplied JSON | `app.gs` generateToken/verifyToken; `SECRET_KEY` unused | Supabase JWT (P2) |
| S2 | Critical | Passwords hashed with plain SHA-256, no salt | `registerUser`, `loginUser` | Supabase Auth; forced reset (P2) |
| S3 | Critical | Default credentials admin123 / mechanic123 / manager123, printed to logs | `init-sheets.gs` | Remove from deploy path; owner created manually (P1/P2) |
| S4 | Critical | **Passwords written to AuditLog** for every login/register request | `doPost` → `logAudit('API_REQUEST', endpoint, payload)` | Redact; stop blanket logging (P2). **If this script was ever live, existing AuditLog rows contain plaintext passwords → purge sheet and treat those passwords as compromised.** |
| S5 | Critical | Client controls price/quantity → free/negative orders | `createOrder` | Server pricing (P5) |
| S6 | High | IDOR on `orders/get`; stub handlers have no auth at all | `getOrder`, `handle*` stubs | RLS + RPC checks (P2) |
| S7 | High | Stored/DOM XSS via `innerHTML` + inline handlers with unescaped data; tokens in `localStorage` | `app.js`, `order-management.js`, `catalog-management.js`, etc. | Escape helper, delegated events, CSP header via Cloudflare `_headers` (P3) |
| S8 | High | No rate limiting / lockout on login or registration; no email verification; no input validation (email format, name length, qty ints) | `registerUser` | Supabase Auth limits + CAPTCHA option; DB CHECK constraints (P2) |
| S9 | High | Web App deployed "Anyone", Execute as Me → every call runs with owner's Google authority over the Sheet | `app.gs` header | Retire as transaction backend (P1–P5); keep GAS only for reporting with restricted access |
| S10 | Medium | No CSRF concerns today (token in param) but token appears in URL query (`token=`) → logged/leaked | `doPost` | Authorization header via Supabase |
| S11 | Medium | Spreadsheet ID and deployment URL shipped in frontend config | `config.js` | Remove ID from frontend; URL not needed after migration |
| S12 | Medium | Payment proof is a free-text URL (could be javascript:/phishing) | `admin-payments.js` | R2 upload + signed URLs, validate MIME/size (P6) |
| S13 | Medium | Audit actor is `Session.getActiveUser()` = script owner, not the user | `logAudit` | Record `auth.uid()` (P2) |
| S14 | Low | `.gitignore` is adequate; no secrets were found in the package (placeholders only) | grep of config/.env.example | Keep; add secret scanning in GitHub (P9) |
| S15 | Info | Docs (`docs/SECURITY.md`) acknowledge SHA-256 and non-expiring tokens as "acceptable for low scale" — not acceptable for a payments/PII system | docs/SECURITY.md | — |

Secrets scan: no real keys/tokens/passwords other than the seed credentials above. R2/Supabase keys do not exist yet; rule for later: only `anon` key in frontend, `service_role` only in Edge Functions/Workers secrets.
