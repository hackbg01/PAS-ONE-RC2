# ERD — PAS-One (Supabase PostgreSQL, schema `public`)
```mermaid
erDiagram
  auth_users ||--|| profiles : "id"
  profiles ||--o{ vehicles : owns
  profiles ||--o{ orders : "customer_id / created_by"
  profiles ||--o{ orders : "mechanic_id"
  orders ||--|{ order_items : has
  catalog_items ||--o{ order_items : "snapshot of"
  orders ||--o{ payments : has
  orders ||--o{ discount_requests : has
  profiles ||--o{ emergency_tickets : "customer_id / assigned_to"
  emergency_tickets ||--o| mechanic_locations : "latest position"
  parts ||--o{ inventory_mutations : "append-only"
  catalog_items ||--o| parts : "optional link"
  profiles ||--o{ media_assets : owns
```
Standalone: `settings` (business parameters), `audit_logs` (append-only, written only by `_audit()`).
Write path: clients have **SELECT only** on orders/items/payments/emergency/inventory/discounts; every mutation is an RPC (`supabase/migrations/0003_rpc.sql`).
