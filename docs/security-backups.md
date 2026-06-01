# WiseFlow Database Backup Process

Use provider-managed backups for production data. For Supabase, enable Point-in-Time Recovery or scheduled daily backups in the Supabase project dashboard. Keep backups private to database administrators only.

For the local file fallback store, back up the `.data/hrhub` directory from the server filesystem into a private encrypted storage location. Never place `.data`, exported backups, or database dumps under `public/`.

## Production Backup Layers

1. Supabase managed recovery:
   - Enable Point-in-Time Recovery when the project plan supports it.
   - If PITR is not available, enable scheduled daily database backups.
   - Test a restore into a separate staging Supabase project before launch and at least quarterly.

2. WiseFlow per-company export:
   - `GET /api/admin/backups?companyId=<company-id>` exports one company JSON backup.
   - The route is Admin-only, tenant checked, rate limited, audited, and returns a downloadable JSON file.
   - The export includes company profile, members, clients, sales orders, business records, and HR records.

3. WiseFlow restore:
   - `POST /api/admin/backups/restore?companyId=<company-id>` runs restore validation by default.
   - Send `{ "backup": <backup-json>, "dryRun": true }` first and review the returned counts.
   - To actually restore, send `{ "backup": <backup-json>, "dryRun": false, "confirm": "RESTORE <company-id>" }`.
   - Restore replaces app-managed records for the selected company. It does not replace the need for Supabase PITR for full database rollback.

Recommended deployment checklist:

- Set `AUTH_SESSION_SECRET` to a long random value in production.
- Store backup archives in private object storage with encryption at rest.
- Restrict restore/download permissions to Admin/IT operators.
- Do not email backup files or expose them through application routes.
- Rotate backup access credentials after staff changes.
- Test restore procedures at least quarterly.
- Keep backup files, `.data`, SQL dumps, and generated archives out of `public/` and Git history.
