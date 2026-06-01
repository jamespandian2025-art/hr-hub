# Role-Based QA

Last run: 2026-05-28

## Automated Gate

Run:

```bash
npm run check:roles
```

The script starts the built app with `next start`, creates signed test sessions for each launch role, and verifies page/API authorization using real HTTP requests.

Roles covered:

- Admin
- Finance
- HR
- Employee
- Team Manager
- Client

## Page Access Matrix

Verified by `scripts/role-based-qa.mjs`:

- Admin can open dashboard, clients, projects, accounting, banking, HR, payroll, employee, and client areas.
- Finance can open dashboard, accounting, banking, loan management, and payroll-finance areas.
- HR can open dashboard and HR operational pages, but is redirected away from payroll/finance and blocked from banking.
- Employee can open employee self-service pages only.
- Team Manager can open dashboard and employee self-service pages, but is redirected away from accounting, HR, and client-only pages.
- Client can open only the client portal and is redirected away from internal workspaces.

Banking page access returns `403` for non-Admin/non-Finance roles.

## API Access Checks

Verified by `scripts/role-based-qa.mjs`:

- Signed-out business API reads return `401`.
- HR, Employee, and Client roles are denied from finance business records where expected.
- Employee and Client roles are denied from internal business APIs.
- Employee is denied from the employee directory API.
- HR is denied from payroll records API.
- Backup export is denied to Finance, HR, and Client; Admin is not denied by RBAC.

Local note:

- Without production Supabase tenant storage configured, allowed API reads may return `500` after RBAC passes because tenant storage is intentionally unavailable under `next start`.
- Set `ROLE_QA_REQUIRE_STORAGE=1` with `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` to require allowed API reads to return `200` in staging/production.

## Current Result

`npm run check:roles` passed on 2026-05-28.
