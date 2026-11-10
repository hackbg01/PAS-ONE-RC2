# DATABASE MAP — Google Sheets today → PostgreSQL target
Source: `scripts/init-sheets.gs` (10 sheets). `database/` folder is empty. No Vehicles/Mechanics/Customers sheets exist.

## 1. Current sheets
| Sheet | Columns (in order — code uses numeric indexes) | Used by code | Issues |
|---|---|---|---|
| Users | userId, email, passwordHash, name, role, createdAt, active | register/login | unsalted hash; no phone; `active` not checked at login |
| Catalog | itemId, name, category, description, price, stock, active, createdAt | catalog CRUD | `stock` on catalog AND Inventory (duplicate); price float; hard delete |
| Orders | orderId, customerId, customerData(JSON), items(JSON), subtotal, tax, total, orderStatus, paymentStatus, createdAt, createdBy | orders | JSON blobs; not normalized; no line-item price snapshot guarantee |
| Payments | paymentId, orderId, amount, status, method, proofUrl, verifiedBy, verifiedAt, createdAt | **never written** | — |
| Emergency | ticketId, customerId, customerName, customerPhone, lat, lng, complaint, status, assignedTo, estimatedCost, actualCost, createdAt, completedAt | **never written** | — |
| Inventory | partId, name, category, unit, quantity, minStock, price, supplier, createdAt | **never read** | — |
| InventoryMutations | mutationId, partId, type, quantity, reason, referenceId, createdBy, createdAt | **never used** | — |
| DiscountRequests | requestId, orderId, originalAmount, discountAmount, finalAmount, reason, requestedBy, approvedBy, status, createdAt, decidedAt | **never used** | — |
| AuditLog | logId, timestamp, action, resource, details(JSON), user | append only | contains passwords (C6); `Session.getActiveUser()` = script owner, not the actor |
| Settings | key, value, type, description | seeded only; **never read** | TAX_PERCENTAGE etc. ignored |

Seed data (test only): 1 admin, 5 catalog items (Ganti Oli 10W-40 150k, Service Rutin A 200k, Ban Michelin 800k, Air Filter 75k, Busi NGK 45k), 7 settings. No evidence of real production data in the package; **real data, if any, lives in your live Sheet and was not provided.** Parts-stock master work (separate Excel project) is not part of this package.

## 2. Target schema (Phase 1 proposal — for approval, nothing created yet)
| Domain | Tables |
|---|---|
| identity | `profiles` (id → auth.users, name, phone, role enum, active), `staff_roles` if finer permissions needed |
| customers/vehicles | `customers`, `vehicles` (plate, make, model, year, customer_id) — **new** (no source data) |
| catalog | `catalog_categories`, `catalog_items` (price numeric(12,2), active, kind: service/part) |
| orders | `orders` (status enum, idempotency_key unique, totals), `order_items` (price snapshot) |
| payments | `payments` (unique per provider ref/idempotency), `payment_proofs` (R2 key) |
| emergency | `emergency_tickets`, `mechanic_locations` |
| workshop | `mechanics`, `assignments`, `work_status_log` |
| inventory | `parts`, `inventory_mutations` (append-only), stock via trigger/RPC `FOR UPDATE` |
| discounts | `discount_requests` |
| system | `audit_logs` (redacted), `settings`, `media_assets` (R2 metadata), `schema_migrations` |

Mapping rules: userId/itemId etc. → `uuid` (legacy `ORD-<ts>` kept in `legacy_ref` column); `Settings` → `settings` table and actually read by RPCs; `Catalog.stock` folded into `parts`/inventory to remove duplication; JSON `customerData` → columns; JSON `items` → `order_items`.
Constraints to enforce: price ≥ 0, qty > 0, stock ≥ 0, status transitions, one verified payment per order, FK everywhere, indexes on (customer_id, created_at), (status, created_at), vehicle plate, etc.

## 3. Estimated size (for quota planning)
500 orders/day × ~4 lines ≈ 2k rows/day ≈ 0.7M rows/yr; ≈ 150–300 MB/yr including indexes and audit → ~1–2 years inside Supabase Free 500 MB, **provided media stays in R2 and audit logs are pruned/exported**. Estimate, not measured.
