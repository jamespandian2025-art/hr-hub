# Supabase Production Setup

Last updated: 2026-05-27

## Required Environment

Configure these only in the production deployment provider:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `AUTH_SESSION_SECRET`
- `NEXT_PUBLIC_APP_URL`

`SUPABASE_SERVICE_ROLE_KEY` must never be prefixed with `NEXT_PUBLIC_` and must never be used in client components.

## SQL Apply Order

Run these in the Supabase SQL editor or through a database migration runner, in this exact order:

1. `scripts/supabase-multi-company.sql`
2. `scripts/supabase-clients-table.sql`
3. `scripts/supabase-sales-orders-table.sql`
4. `scripts/supabase-hr-records-table.sql`
5. `scripts/supabase-business-records-table.sql`
6. `scripts/supabase-rate-limits-table.sql`
7. `scripts/supabase-production-verify.sql`

Then run:

```bash
npm run check:supabase
```

The verification command calls `public.verify_wiseflow_production_setup()` with the service-role key and fails if required tables, RLS, tenant functions, or tenant policies are missing.

## First Admin Flow

Production must not depend on demo credentials or local auth users.

1. Create the first account from `/signup` using Supabase email/password or Google.
2. The signup flow creates a verified server session through `/api/auth/session`.
3. The tenant bootstrap API creates the first `companies` row and an active `company_members` owner row for that verified Supabase user.
4. Subsequent business and HR APIs reject requests for a `company_id` unless the session user is an active member of that company.
5. Invited users are saved as pending `company_members` rows, then activated when the invited user signs up.

## Production Tenant Boundary

Supabase RLS protects direct client access, and server APIs additionally verify tenant membership before using the service-role key. The browser may send the active `company_id`, but it is treated only as a requested context; it is not trusted until the server confirms membership.

## Shared Rate Limits

Production rate limits are stored in `public.rate_limits` and updated through `public.record_rate_limit_hit(...)` with the server-only service-role key. This covers login checks, session creation, employee portal login, invitations, employee credential email, tenant bootstrap, HR mutations, and business-record mutations. Local development can use `RATE_LIMIT_DATA_DIR` or the default `.data/rate-limits` fallback.

## Backups

Enable Supabase Point-in-Time Recovery or scheduled daily backups in the production Supabase project. WiseFlow also provides Admin-only per-company JSON export and restore endpoints:

- `GET /api/admin/backups?companyId=<company-id>`
- `POST /api/admin/backups/restore?companyId=<company-id>`

Always run restore first with `dryRun: true`, then restore with `confirm: "RESTORE <company-id>"` only in a controlled maintenance window.
