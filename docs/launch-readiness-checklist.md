# Launch Readiness Checklist

Last scan: 2026-06-02

## Current Readiness

- Internal demo: ready with caution.
- Closed beta: ready after staging Supabase/env/PITR setup is confirmed with fake data.
- Production launch: repo-side P0 gates are complete; do not enter real customer or payroll data until the deployment notes below are completed in the real production environment.

## Scan Evidence

- Repository inventory: 280 files scanned.
- App surface: 145 generated app routes in production build.
- API surface: ai/assistant, auth/session, auth/invitations, auth/login-attempts, tenant/bootstrap, admin/backups, business records, HR records, HR credentials, employee portal login, uploads, monitoring, health.
- Persistence scan: `localStorage` appears in 70 files; `sessionStorage` appears in 5 files.
- Production build: `npm run build` passed.
- Lint: `npm run lint` passed with 0 errors and 0 warnings after cleanup.
- Security script: `npm run check:security` passed.
- HRMS business rules: `npm run check:hrms` passed.
- Role-based QA: `npm run check:roles` passed for Admin, Finance, HR, Employee, Team Manager, and Client page/API gates.
- Manual browser QA: `npm run check:manual-qa` passed 48 of 48 desktop/tablet/mobile route checks; evidence is in `docs/manual-browser-qa.md`.
- Automated smoke tests: `npm run check:smoke` passed route/auth redirects plus Accounting invoice creation, client invoice reflection, employee portal login, payroll details modal, project status dropdown, and AI assistant local-guidance flows; evidence is in `docs/automated-smoke-tests.md`.
- Monitoring smoke: `npm run check:monitoring` passed locally for `/api/health`, `/login`, and `/dashboard` uptime checks.
- Dependency audit: `npm audit --omit=dev --audit-level=moderate` reports 0 vulnerabilities.
- Route smoke: `npm run check:route-smoke` starts the built app and verifies public/protected routes.
- Production smoke on port 3100:
  - Public routes returned 200: `/`, `/why-wiseflow`, `/privacy`, `/terms`, `/refund-policy`, `/security`, `/login`, `/signup`, `/account-recovery`, `/employee/login`.
  - Protected routes redirected to login with 307: `/dashboard`, `/accounting`, `/accounting/invoices`, `/hr/employees`, `/employee/dashboard`, `/people/clients`, `/project-management`, `/warehouse`, `/workflows/my-workflows`.

## P0 - Must Fix Before Real Launch

- [x] Freeze scope and clean source control.
  - Review the large dirty worktree.
  - Separate intentional product changes from generated artifacts.
  - Commit or discard unrelated local-only files.
  - Keep `.codex-*`, `.claude/worktrees`, logs, dumps, and backups out of deploy input.
  - Completed 2026-05-27: source-control freeze documented in `docs/source-control-freeze.md`; ignore rules now exclude local agent workspaces, logs, Qwiet output, dumps, backups, and real env files. Generated tracked entries are prepared for removal from Git tracking without deleting local files.

- [x] Replace employee portal plaintext password storage.
  - Current scan found `portalPassword` stored and compared directly.
  - Store only a password hash, salt, and password metadata.
  - Send temporary passwords once, then force reset/change.
  - Never display the current employee password in HR after creation.
  - Completed 2026-05-27: new employee records and password resets now store portal password hashes; employee login verifies hashes; successful legacy logins migrate plaintext records; security checks enforce this.

- [x] Decide the production data boundary.
  - If launching with real users, move business records out of browser storage.
  - Keep browser storage for preferences only: theme, tabs, filters, drafts.
  - Move launch-critical records to Supabase or another backend:
    Accounting, Clients, HR, Projects, Procurement, Warehouse, Workflows, Datasets.
  - Completed 2026-05-27 for the production boundary and core launch data path: added authenticated business records APIs, Supabase `business_records` schema, development `.data/business` fallback, and server-backed storage for Client Database, core Accounting/Financials, Projects, Project Management, and Warehouse.
  - Launch constraint: any legacy module that still writes business records directly to browser storage must be migrated before it is enabled for real production data.

- [x] Complete Supabase production setup.
  - Run and verify SQL scripts for companies, members, clients, sales orders, HR records.
  - Confirm RLS policies isolate each `company_id`.
  - Verify first Admin creation flow without demo credentials.
  - Confirm `SUPABASE_SERVICE_ROLE_KEY` is configured server-side only.
  - Completed 2026-05-27 in repo: added tenant bootstrap API, server-side company membership checks before service-role data access, Supabase production verification SQL/RPC, `npm run check:supabase`, and first-Admin Supabase Auth bootstrap documentation in `docs/supabase-production-setup.md`.
  - Deployment note: production Supabase SQL still needs to be run against the real Supabase project, then verified with `npm run check:supabase` using real production env vars.

- [x] Update production environment documentation.
  - Add missing required envs to `.env.example`:
    `NEXT_PUBLIC_APP_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `EMAIL_FROM`, and chosen email provider keys.
  - Confirm `AUTH_SESSION_SECRET` is long and unique in production.
  - Completed 2026-05-27 for repo documentation. Real production values still need to be configured in the deployment provider.

- [x] Harden rate limiting.
  - Current login attempt tracking is in memory.
  - Move rate limits to persistent/shared storage for production deployments.
  - Cover login, employee login, invitations, credential email, and data mutation endpoints.
  - Completed 2026-05-27 in repo: added shared rate limit storage through Supabase `rate_limits` plus local `.data/rate-limits` fallback, persistent `record_rate_limit_hit` RPC, and route-level enforcement for login, server session creation, employee login, invitations, employee credential email, tenant bootstrap, HR mutations, and business-record mutations.
  - Deployment note: run `scripts/supabase-rate-limits-table.sql` in production before enabling these endpoints on real traffic.

- [x] Resolve or formally accept dependency audit finding.
  - Audit reports moderate PostCSS issue through Next.js.
  - Do not run `npm audit fix --force` because it suggests a breaking downgrade.
  - Track Next.js/PostCSS patched version and upgrade carefully when available.
  - Accepted and documented 2026-05-27 in `docs/security-advisories.md`.

- [x] Add production backup and restore.
  - Enable Supabase PITR or scheduled backups.
  - Add per-company export for critical domains.
  - Test restore into a clean environment.
  - Keep backups out of `public/` and repo history.
  - Completed 2026-05-27 in repo: added Admin-only, tenant-checked, rate-limited, audited per-company backup export and dry-run/confirmed restore APIs covering company profile, members, clients, sales orders, business records, and HR records. Backup files and `.data` are excluded by `.gitignore`.
  - Deployment note: Supabase PITR or scheduled backups still need to be enabled in the real Supabase dashboard, and a restore rehearsal should be run against staging before production launch.

- [x] Complete role-based QA.
  - Test Admin, Finance, HR, Employee, Team Manager, and Client accounts.
  - Verify protected routes redirect signed-out users.
  - Verify restricted finance/banking/payroll/HR pages reject the wrong roles.
  - Completed 2026-05-27 in repo: added `npm run check:roles`, which starts the built app with signed role sessions and verifies Admin, Finance, HR, Employee, Team Manager, and Client page gates plus key server API authorization. Evidence is documented in `docs/role-based-qa.md`.
  - Deployment note: run `ROLE_QA_REQUIRE_STORAGE=1 npm run check:roles` in staging/production with Supabase env vars to require allowed API reads to return `200`, not only "not denied by RBAC."

- [x] Manual browser QA on major modules.
  - Desktop: 1440 x 900.
  - Tablet: 768 x 1024.
  - Mobile: 390 x 844.
  - Check no overlap, broken menus, clipped dialogs, or unusable tables.
  - Completed 2026-05-28 in repo: added `npm run check:manual-qa` and verified 16 major routes across desktop, tablet, and mobile with 0 layout failures. Evidence is documented in `docs/manual-browser-qa.md`.
  - Staging note: latest local run has 6 caught API warnings for warehouse/project state reads under local QA fallback; rerun with production Supabase env vars in staging and confirm those warnings clear before real data launch.

## P1 - Required Before Closed Beta

- [x] Clean lint warnings.
  - Current warnings are unused symbols in design system, employee login, leave data, and HR settings.
  - Completed 2026-05-27: `npm run lint` reports 0 warnings.

- [x] Add automated smoke tests.
  - Add scripts for route smoke, auth redirects, and core create/edit flows.
  - Include at least Accounting invoice creation, client invoice reflection, HR employee login, payroll details modal, and project status dropdown.
  - Completed 2026-05-28: `npm run check:smoke` now runs route/auth smoke plus headless-browser flow smoke, including AI assistant local-guidance coverage. Covered flows are documented in `docs/automated-smoke-tests.md`.

- [x] Add server-side audit logs for every sensitive action.
  - Create, update, delete, archive, restore, export, login, invitation, role change, and credential send.
  - Completed 2026-05-28 in repo: business create/update/delete/replace, HR create/update/delete, backup export/restore, login success/failure, employee login success/failure, tenant bootstrap, role invitations, credential email sends, file uploads, and monitoring events now write server audit entries where the action reaches a server API.
  - Launch constraint: legacy client-only screens that remain enabled for real data must route destructive or sensitive writes through the server-backed APIs so their actions can be audited.

- [x] Add confirmation or undo for destructive actions.
  - Delete/archive operations should be confirmed, audited, and reversible where practical.
  - Completed 2026-05-28 in repo: business and HR DELETE APIs require CSRF, tenant access, rate limits, and typed `DELETE <id>` confirmation; backup restore requires `RESTORE <companyId>` confirmation and supports dry-run; existing project/archive/document trash flows retain UI confirmation or restore behavior.

- [x] Move file uploads to object storage.
  - Avoid base64 document/media payloads in browser storage.
  - Store metadata and signed URLs.
  - Add size/type validation server-side.
  - Completed 2026-05-28 in repo: added `/api/uploads` with server-side size/type validation, Supabase Storage upload support, private local fallback for development, signed/proxied download URLs, audit logging, and rate limiting. HR documents, employee documents, profile photos, leave attachments, allowance receipts, project thumbnails/files, dataset file fields, HR chat media, and warehouse photos now use `uploadFileObject` instead of new base64 `readAsDataURL` payloads.
  - Deployment note: create the `WISEFLOW_UPLOAD_BUCKET` bucket in staging/production Supabase Storage and keep it private.

- [x] Finish production email flows.
  - Verify Resend, Brevo, or SendGrid in staging.
  - Verify invitation, password reset, and employee credential emails.
  - Add branded sender/domain authentication.
  - Completed 2026-05-28 in repo: employee credential email supports Resend, Brevo, and SendGrid; invitations use Supabase Auth invitations; password reset uses Supabase recovery; `npm run check:email` validates provider env, sender domain shape, and can send a test message with `EMAIL_TEST_SEND=1`.
  - Deployment note: staging must still verify the real provider, authenticated sending domain, invitation email, recovery email, and credential email with real provider keys.

- [x] Add monitoring.
  - Capture runtime errors, API failures, and failed auth attempts.
  - Add uptime checks for login and dashboard.
  - Add deployment health check.
  - Completed 2026-05-28 in repo: added `/api/health`, `ClientMonitoring` for browser runtime errors/API failures, monitoring audit events, failed auth audit logging, and `npm run check:monitoring` uptime smoke checks.

- [x] Add staging environment.
  - Separate staging Supabase project and env vars.
  - Seed staging with fake data only.
  - Run QA there before production.
  - Completed 2026-05-28 in repo: added `.env.staging.example` and `npm run seed:staging` for fake company/client/project/HR/payroll records.
  - Deployment note: create the separate staging Supabase project, run SQL setup there, seed fake data only, then run `npm run check:supabase`, `npm run check:roles`, `npm run check:manual-qa`, `npm run check:smoke`, `npm run check:monitoring`, and `npm run check:email` against staging.

## P2 - Nice After Launch

- [ ] Add richer import/export restore tooling per domain.
- [ ] Add admin-facing backup download request flow with approval.
- [ ] Add deeper E2E coverage for every module.
- [ ] Add performance budgets for large tables and dashboards.
- [ ] Add accessibility pass for keyboard navigation and screen readers.
- [ ] Add onboarding/help documentation for each role.

## Go/No-Go Rule

Do not launch with real customer or payroll data until all P0 items are done and the deployment notes above are verified in staging/production. A private demo is acceptable now. A closed beta is acceptable after the real staging Supabase, email, upload bucket, backup, and monitoring checks pass.
