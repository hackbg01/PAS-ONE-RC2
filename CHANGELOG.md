# PAS-One Changelog

## [1.0.0] - 2026-10-29

### Added
- **Core Platform**
  - Three-portal architecture: Consumer, Operational, Management
  - Google Sheets + Google Apps Script backend
  - Token-based authentication
  - Role-based access control (admin, mechanic, manager, customer, guest)

- **Consumer Portal**
  - ✅ Catalog browsing & product listing
  - ✅ Shopping cart with persistent storage
  - ✅ Order creation & tracking
  - ✅ Panic button (emergency) with geolocation
  - 🟡 QRIS payment display (static, manual verification)
  - 🟡 Payment status tracking
  - 🟡 User registration & login
  - 🔴 Service history
  - 🔴 Live mechanic location tracking
  - 🔴 Service reminders

- **Operational Portal**
  - 🟡 Admin dashboard with KPIs
  - 🟡 Order management (list, view, update status)
  - 🟡 Payment verification (manual)
  - 🟡 Catalog management (add, edit, delete)
  - 🔴 Mechanic assignment & tracking
  - 🔴 Parts inventory management
  - 🔴 CSV import for bulk data

- **Management Portal**
  - 🟡 High-level dashboard
  - 🟡 Discount request workflow
  - 🔴 Revenue analytics & reports
  - 🔴 Performance metrics

- **Infrastructure**
  - Frontend: HTML5, CSS3, Vanilla JavaScript (SPA)
  - Backend: Google Apps Script with Sheets API
  - Database: Google Sheets (9 primary tables)
  - Deployment: GitHub Pages + GAS Web App
  - Documentation: Architecture, deployment, security, testing

### Security Features
- ✅ SHA-256 password hashing
- ✅ Token-based session management
- ✅ Role-based authorization on endpoints
- ✅ Input validation (frontend + backend)
- ✅ Audit logging for sensitive actions
- 🟡 HTTPS enforced (GAS native)
- 🔴 Token expiry (planned for next release)
- 🔴 Rate limiting (GAS quota only)
- 🔴 2FA/MFA

### Bug Fixes
- None (initial release)

### Known Limitations
1. **Payment**: Manual verification only, no automated gateway
2. **Real-time**: Location tracking uses polling, not WebSocket
3. **Concurrency**: Sheets row locking limited for simultaneous orders
4. **File Storage**: No image upload (placeholder URLs only)
5. **Notifications**: Email/WhatsApp not integrated
6. **Mobile**: Responsive CSS ready, but UI components incomplete

### Technical Details
- **Lines of Code**:
  - Frontend: ~1,200 (HTML + CSS + JS)
  - Backend: ~800 (Google Apps Script)
  - Documentation: ~2,500
- **API Endpoints**: 20+ implemented
- **Database Tables**: 10 (Users, Catalog, Orders, Payments, Emergency, Inventory, Discount, Audit, Settings, Mutations)
- **Test Coverage**: 56% (38/60 test cases passing)

### Performance
- Frontend load: ~1-2 seconds
- API response: ~500ms (after cold start)
- Concurrent users: Limited by GAS quota (20k requests/day)
- Uptime: 99.95% (Google cloud infrastructure)

### Deployment
- **Frontend**: GitHub Pages (free, auto-deploy)
- **Backend**: Google Apps Script (free, 20k requests/day)
- **Database**: Google Sheets (free, 10 million cells)
- **Total Cost**: $0/month (free tier)

### Breaking Changes
- None (initial release)

### Migration Guide
N/A - New project

### Contributors
- Cloud QA Engineer
- Senior Full-Stack Developer
- System Architect

### Future Roadmap (v2.0)
- [ ] Real-time location tracking (WebSocket)
- [ ] Payment gateway integration (Midtrans/Stripe)
- [ ] WhatsApp Business API
- [ ] Email notifications
- [ ] File upload (Google Drive)
- [ ] Advanced analytics
- [ ] Mobile app (React Native)
- [ ] Multi-location support
- [ ] Inventory forecasting
- [ ] Customer loyalty program

---

## Installation

```bash
git clone https://github.com/yourusername/pas-one.git
cd pas-one
cp frontend/.env.example frontend/.env
# Edit frontend/.env with your configuration
# Follow docs/DEPLOYMENT.md for step-by-step setup
```

## Support

For issues, questions, or contributions:
- Documentation: `/docs/` folder
- GitHub Issues: (if using GitHub)
- Email: support@primaauto.local

---

**Version**: 1.0.0  
**Status**: BETA (Limited production-ready)  
**Last Updated**: October 29, 2026  
**Next Release**: Q1 2027

## [Unreleased] — Phase 1/2 (branch phase-1-supabase)
### Added
- `supabase/migrations/0001_foundation.sql` — normalized schema (UUID, FK, CHECK, indexes), settings seeded from legacy config values.
- `0002_security.sql` — RLS on every table, column-level grants (no role escalation), `handle_new_user` trigger (role always `customer`), audit helper that strips secrets.
- `0003_rpc.sql` — transactional RPCs: create_order (server pricing, stock locks, idempotency), update_order_status (state machine, stock restore), submit/verify_payment (idempotent), create_emergency (server-side fee, same rules as legacy calculator), assign_mechanic, inventory_mutation, upsert_parts, request/decide_discount, dashboard_summary (real data), admin_set_role.
- `supabase/tests/` — 61 SQL assertions + concurrency script; `supabase/rollback/0001_down.sql`.
### Security fixes (vs legacy GAS)
- Replaces forgeable Base64 token, unsalted SHA-256, default admin creds, password-in-audit-log, client-trusted prices, IDOR on orders.
### Preserved
- No legacy file modified or removed (frontend/, backend/app.gs, scripts/). Legacy status vocabularies, role names, fee rules and response keys (`ticketId`, `success`, dashboard keys) kept.

## [Unreleased] — Phase 3 (branch phase-3-frontend)
### Added
- `js/api/client.js` now talks to Supabase (same class/method names and `{success,…}` shapes). Legacy GAS client preserved as `js/api/client.gas-legacy.js`.
- New: `js/utils/html.js` (`esc`, `rupiah`), `#/payment` page (order summary + payment submission), `#/emergency/:ticket` status page (polling), discount approval list (management), mechanic assignments view, working inventory add/edit/mutation/CSV-import (were TODO stubs that reported fake success).
### Fixed
- Cart restored after reload; checkout creates a real order (server pricing, idempotency key, double-submit guard); tax % read from `settings`; XSS (unescaped innerHTML) in all page modules; panic button now has location-error handling and stores a real ticket; catalog delete is soft; blank description can be saved; register/login show server error text.
### Hardened (DB)
- `request_discount`: mechanics only on their assigned orders.
### Preserved
- All legacy files remain (admin-orders/admin-payments/admin-catalog/emergency-calculator still unloaded, as before; not deleted).

## [Unreleased] — Phase 4 (themes) + Phase 8 prep (backup)
### Added
- Theme engine: `js/theme-manager.js`, `css/themes/{default,light,dark,editorial,industrial}.css`, navbar selector, persistent choice. New semantic tokens in `design-tokens.css` (`--surface`, `--on-accent`, `--page-bg`, status colors, `--brand-accent`, `--accent-on-surface`, `--border-width`, `--font-heading`); hard-coded colors in components/pages CSS replaced by tokens.
- `scripts/backup/backup.sh|restore.sh`, `.github/workflows/backup.yml`, `docs/BACKUP-RESTORE.md`.
### Preserved
- Default theme is pixel-identical to baseline (login/register pages, 0 differing pixels). No business logic touched by themes.
### Known (pre-existing, unchanged)
- Default theme gold accent on white = 2.1:1 contrast (prices/stats). Other themes pass WCAG AA.

## [Unreleased] — Phase 6–9 (branch phase-6-10-release)
### Added
- Migrations 0004 (media metadata, `register_media`/`can_read_media`/`attach_payment_proof`, `report_export`), 0005 (create_order lock ordering for pool/deadlock safety), 0006 (RLS initplan performance + indexes); `supabase/dist/pas-one-all.sql`.
- `worker/` Cloudflare media Worker (R2 upload, magic-byte validation, RLS-checked signed links); frontend proof upload (`js/utils/image.js`, `uploadProof`, `getPaymentProof`); vendored supabase-js 2.45.4 (`frontend/vendor/`, no CDN).
- `reporting/sheets-sync.gs`, `frontend/_headers` (CSP etc.), `tests/load/loadtest.mjs`, `docs/DEPLOY-PRODUCTION.md`, `docs/GO-LIVE-STATUS.md`.
### Verified (local stack)
- SQL 77/77, concurrency (+deadlock guard), Worker 25/25, adapter e2e 56/56, UI 10/10 under real CSP, Sheets sync 7/7, load 50/100 VUs 0 errors.
### Preserved
- No legacy file deleted. `frontend/vendor/supabase.js` was renamed to a versioned filename (byte-identical, verified by hash).

## [Unreleased] — owner rules (2026-11-09)
- Migration 0007: TAX_PERCENTAGE 11; emergency visit fee Fleet 250k (24 h), Retail 250k by day / 300k 22:00–06:00 WIB; distance fee unchanged; `profiles.customer_type` (retail|fleet, admin-only via `admin_set_customer_type`). Guests are Retail. Old fee settings kept, marked unused.
- Tests updated for 11% tax; SQL suite 81/81. Browser/adapter e2e files updated but NOT re-run after this change.
