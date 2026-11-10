# Backup & restore (Supabase Free: no automatic backups)
**What is backed up:** data of schema `public` + `auth.users`/`auth.identities`, AES-256 encrypted, with checksum + per-table row counts. **Schema is not in the backup** — it is rebuilt from `supabase/migrations` (manifest lists the migration set and git SHA).
**Daily:** `.github/workflows/backup.yml` (03:00 WIB) → encrypted artifact, 30 days. Local/manual: `scripts/backup/backup.sh`. Retention helper keeps 14 daily + 8 weekly when run against a persistent folder.
**Restore (drill monthly; production only with owner approval):**
1. New (or scratch) Supabase project → run `supabase/dist/pas-one-0001-0003.sql`.
2. `TARGET_DATABASE_URL=… BACKUP_PASSPHRASE=… scripts/backup/restore.sh pas-<time>.tar.enc` → must print `RESTORE VERIFIED`.
3. Point `js/config.js` to the restored project (URL + anon key) and redeploy Pages.
**Safeguards:** refuses a non-empty target, aborts on checksum mismatch / wrong passphrase. Keep the passphrase in a password manager *outside* GitHub too — without it backups are unreadable.
**Verified locally (Postgres 16):** backup → restore into empty DB → all 14 tables match counts, new orders continue numbering, wrong passphrase / tampered file / non-empty target all refused. **Not yet verified on real Supabase:** `alter table auth.users disable trigger` permission for the `postgres` role (if denied, restore auth users via SQL editor first) and password-hash compatibility across projects (same JWT secret not required for users to log in; hashes are portable).
**Paid dependency note:** Supabase Pro adds daily backups/PITR (not activated; needs owner approval).
