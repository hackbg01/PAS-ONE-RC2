# API MAP — current GAS API → target Supabase
Transport today: `POST {WEBAPP_URL}?endpoint=<module>/<action>&token=<token>`; body JSON; response `{success, ...}`. `doGet` returns a static string.
Client (`frontend/js/api/client.js`) sends different HTTP verbs/URL shape → **mismatch (C1)**.

| Endpoint (client method) | Client verb/url | GAS handler | Auth enforced today | Behavior | Target (Phase 1–5) |
|---|---|---|---|---|---|
| auth/register (`register`) | POST | `registerUser` | none | append Users row, role=customer | Supabase Auth `signUp` + trigger creating `profiles` |
| auth/login (`login`) | POST | `loginUser` | none | SHA-256 compare → fake token | Supabase Auth `signInWithPassword` |
| auth/logout | POST | inline | none | no-op | `signOut` |
| auth/me (`getCurrentUser`) | GET | `verifyToken` | unsigned token | echo token payload | `getUser` + `profiles` |
| catalog/list (`getCatalog`) | GET `?..?..` | `listCatalog` | none (public) | active items; filters ignored | `select` on `catalog_items` (public RLS read, paginated) |
| catalog/get | GET | `getCatalogItem` | none | by id | same |
| catalog/create | POST | `createCatalogItem` | role==admin (forgeable) | append | RPC/RLS staff-admin |
| catalog/update | PUT | `updateCatalogItem` | admin (forgeable) | partial update | RLS update |
| catalog/delete | DELETE | `deleteCatalogItem` | admin (forgeable) | **hard delete** | soft delete |
| orders/create (`createOrder`) | POST | `createOrder` | logged-in (forgeable) | trusts prices; 10% tax | RPC `create_order(items, idempotency_key)` server pricing, stock lock |
| orders/list | GET | `listOrders` | owner or admin | all rows, no paging | RLS + keyset pagination |
| orders/get | GET | `getOrder` | **none on ownership** | by id | RLS |
| orders/update-status (`updateOrderStatus`) | PATCH | `updateOrderStatus` | admin | any string | RPC with transition table |
| payments/verify, payments/status | POST/GET | `handlePayments` **STUB** | none | returns `{success:true}` | RPC `verify_payment`, idempotent; proof in R2 |
| emergency/create, get, update | POST/GET/PATCH | `handleEmergency` **STUB** | none | fake ticket id | table + RPC; server-side fee |
| location/share, location/mechanic | POST/GET | `handleLocation` **STUB** | none | `{success:true}` | table + (polling, not Realtime by default) |
| inventory/list, inventory/import | GET/POST | `handleInventory` **STUB** | none | `{success:true}` | tables + RPC `inventory_mutation` (atomic) |
| discount/request, discount/approve | POST/PATCH | `handleDiscount` **STUB** | none | `{success:true}` | RPC with approver role check |
| dashboard/{admin,mechanic,management} | GET | `handleDashboard` **STUB** | none | **hard-coded numbers** | SQL views / RPC |
| audit/list | GET | `handleAudit` **STUB** | none | `logs: []` | admin-only view |

Other facts
- Token in header `Authorization: Bearer` is documented, but `getHeaderToken` reads `e.parameter.Authorization` (GAS cannot read request headers).
- Config constants consumed by frontend: `ROLES`, `ORDER_STATUS`, `EMERGENCY_STATUS`, `PAYMENT_STATUS`, `DISCOUNT_STATUS`, fees, polling (location 30 s, status 60 s), `TOKEN_EXPIRY_HOURS: 1` (**not enforced anywhere**).
- Compatibility note (5J "API compatibility"): the existing JSON shapes (`{success, items/orders/order/orderId/total/ticketId/token/user}`) should be kept by a thin `js/api` adapter so page modules keep working while the transport changes.
