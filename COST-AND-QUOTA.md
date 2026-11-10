# COST AND QUOTA — FREE-FIRST
**Important:** free-tier limits below are from my general knowledge and change often. I did not verify them against live pricing pages in Phase 0. Confirm on the vendors' pricing pages before relying on them; thresholds 70/85/95% to be wired to these verified numbers in Phase 8/9.

| Service | Free allowance (to verify) | PAS-One expected use | Risk |
|---|---|---|---|
| Supabase Free | ~500 MB DB, ~5 GB egress, ~50k MAU, 500k Edge Function invocations, 1 GB file storage (unused: media → R2); **projects pause after ~7 days inactivity**; **no automatic daily backups / no PITR** | 5,000 accounts ≪ MAU cap; ~2k order rows/day; egress mainly JSON | Backups = **paid feature on Pro** (or self-managed exports, Phase 7); auto-pause for prod; limited connections (use pooler/RPC, avoid chatty client queries) |
| Cloudflare Pages | Unlimited static bandwidth; 500 builds/mo | static SPA | Low |
| Cloudflare Workers | ~100k requests/day free, 10 ms CPU/request | signed-URL/upload API | 500 tx/day ×(few media calls) is fine |
| Cloudflare R2 | ~10 GB storage, 1M Class A, 10M Class B ops/mo, free egress | payment proofs, PDFs | Storage grows with proofs: compress client-side, retention policy |
| GitHub Free | private repos OK, Actions minutes limited | CI tests | Low |
| Google Apps Script/Sheets | per-day quotas (URL fetch, triggers, ~6 min/execution) | reporting export only | Not on transaction path after Phase 5 |

## Known paid-dependency flags (no activation without approval)
1. **Daily DB backups** — not on Supabase Free. Plan: scheduled `pg_dump` (GitHub Actions or local) → encrypt (age/gpg) → store in a private R2 bucket / Drive; restore test monthly.
2. **Always-on production** — free projects pause when idle; a 500-tx/day shop is active daily, so likely fine, but a holiday gap can pause it. Mitigation: scheduled lightweight ping (free). Upgrade to Pro (~USD 25/mo, verify) is the clean fix — *requires your approval*.
3. **Custom SMTP** for auth emails — Supabase's built-in email is rate-limited (very low hourly cap); registrations/resets at scale need your own SMTP (free tiers exist, e.g. Brevo/Resend — verify limits).
4. **WhatsApp/SMS notifications** — not free; not in scope unless requested (J4).
5. Custom domain: domain registration is paid by nature; Cloudflare DNS/HTTPS free.

## Capacity statement
"500 transacting customers/day, 50 normal / 100 peak concurrent" is a **test target**. 500 orders/day ≈ 0.006 orders/second average (peak maybe a few/s) — well within Postgres capability *if* pricing/stock logic runs in RPC transactions with indexed queries. No capacity is claimed; Phase 8 tests (concurrent orders, stock races, duplicate payments, RLS isolation) will produce measured latency/error evidence.

## Monitoring plan (to implement later)
Daily job reading DB size (`pg_database_size`), row counts, function/Worker invocation stats; alert at 70/85/95% of verified limits via email; weekly summary in Google Sheet. Report upgrade needs; never auto-upgrade.
