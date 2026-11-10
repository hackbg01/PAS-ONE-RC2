# FEATURE MATRIX — PHASE 0 AUDIT (actual state)
(Named `-AUDIT` because the original `docs/FEATURE-MATRIX.md` exists and is preserved untouched under J1.)
Legend: REAL = logic implemented in code · UI = screen/JS exists · STUB = hard-coded/empty response · TODO = comment only · NONE = absent

| # | Module | Feature | Frontend | Backend (GAS) | Reality check | Claimed in docs |
|---|---|---|---|---|---|---|
| 1 | Auth | Register | UI (`handleRegister`) | REAL (`registerUser`) | Unsalted SHA-256; reachability broken (C1); error msg read from `.message` but backend sends `.error` | Complete |
| 1 | Auth | Login/logout/me | UI | REAL | Forgeable token (C2); no expiry | Complete |
| 1 | Auth | Role gating (admin/mechanic/manager) | UI (client-only) | partial (catalog/orders only) | Enforcement absent elsewhere | Complete |
| 2 | Customer & vehicle | Profile, vehicle CRUD, service history | NONE | NONE (no Vehicles sheet) | Not implemented; `customerData` is a JSON blob in Orders | Partial |
| 3 | Catalog | List/browse | UI | REAL (active only) | Works logically | Complete |
| 3 | Catalog | Admin CRUD | UI ×2 duplicate (`catalog-management` loaded, `admin-catalog` not) | REAL (hard delete) | Soft-delete needed | Complete |
| 3 | Cart | Add/qty/remove/total | UI | n/a | Not restored on reload (H8); stock not validated | Complete |
| 4 | Orders | Create | NONE (checkout → missing `#/payment`) | REAL (client price trusted) | Flow incomplete; `api.createOrder` never called by UI | Complete |
| 4 | Orders | List/detail/status update | UI ×2 duplicates | REAL | No state machine / pagination | Complete |
| 5 | Payments | QRIS display, proof, verify/reject | UI (verify modal) | **STUB** `handlePayments` | No persistence; `Payments` sheet never written | Partial/Backend ready |
| 6 | Emergency | Panic button + ticket | UI | **STUB** (fake id, no write) | Request lost (H9) | Complete |
| 6 | Emergency | Cost calculator | JS (unloaded) | NONE | Client-side only | Complete |
| 6 | Emergency | Live location/map | NONE (`#mechanic-map` empty div) | **STUB** | Not implemented | Partial |
| 7 | Mechanic assignment | Assign/accept/progress | NONE (`#mechanic-assignments` empty) | NONE (`assignedTo` column only) | Not implemented | Partial |
| 8 | Inventory | List | UI | **STUB** (returns `{success:true}`, no items) | Renders empty | Complete |
| 8 | Inventory | Add part / mutation / CSV import | UI forms | **TODO** | Not implemented | 80% UI |
| 9 | Discount approval | Request/approve | API method only; `#discount-list` empty | **STUB** | Not implemented | Partial |
| 10 | Dashboard | Admin/mechanic/management KPIs | UI | **STUB with fake numbers** | Mock data | Complete |
| 11 | Reports | Export to Sheets / reports | NONE | NONE | Not implemented (Sheets is currently the DB) | Partial |
| 12 | Audit logs | Write | n/a | REAL (but logs passwords, C6) | Unsafe | Complete |
| 12 | Audit logs | View | NONE | **STUB** (`logs: []`) | Not implemented | Partial |
| — | Theming | One token file, no theme switch | `design-tokens.css` | — | Phase 4 greenfield | — |
| — | Mobile | Hamburger menu | JS | — | Unverified in browser | Complete |

Summary: of 12 modules, **0 are fully working end-to-end**; 3 have real backend logic (auth, catalog, orders-read/update); 7 are stubs or absent.
