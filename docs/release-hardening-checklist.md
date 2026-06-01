# Release Hardening Checklist

Last run: 2026-05-28

## Automated Gates

- `npm run lint`: passes with 0 warnings.
- `npx tsc --noEmit --pretty false`: passes.
- `npm run build`: passes with Next.js 16.2.6 and generates 143 app routes.
- `npm run check:security`: passes.
- `npm run check:hrms`: passes.
- `npm run check:smoke`: passes route/auth smoke and core browser flow smoke.
- `npm run check:flow-smoke`: passes Accounting invoice creation, client invoice reflection, employee portal login, payroll details modal, project status dropdown, and AI assistant local-guidance flows.
- `npm run check:roles`: passes for Admin, Finance, HR, Employee, Team Manager, and Client route/API gates.
- `npm run check:manual-qa`: passes 48 of 48 desktop/tablet/mobile browser checks.
- `npm run check:monitoring`: verifies `/api/health`, `/login`, and `/dashboard` uptime/auth-gate behavior.
- `npm run check:email`: validates production email provider env and can send a staged test with `EMAIL_TEST_SEND=1`.
- `npm run seed:staging`: seeds fake-only staging company, client, invoice, project, employee, and payroll records.

Dependency note:

- `npm audit --omit=dev --audit-level=moderate` still reports a known moderate PostCSS advisory through Next.js. This is tracked in `docs/security-advisories.md`; do not use `npm audit fix --force`.

## Browser QA Matrix

Major protected modules to verify after signing in with an Admin account:

- Dashboard: `/dashboard`
- Sales / CRM: `/sales`, `/people/clients`, `/people/contacts`, `/people/vendors`, `/people/teams`
- Accounting: `/accounting`, `/accounting/invoices`, `/accounting/banking`, `/accounting/reports`, `/accounting/tax-compliance`
- HR: `/hr`, `/hr/employees`, `/hr/attendance`, `/hr/leave-requests`, `/hr/loan-requests`, `/hr/payroll`, `/hr/documents`
- Procurement: `/procurement`, `/procurement/purchase-requests`, `/procurement/rfqs`, `/procurement/quotations`, `/procurement/purchase-orders`, `/procurement/receiving`, `/procurement/approvals`
- Warehouse: `/warehouse`, `/warehouse/inventory`, `/warehouse/low-stock`, `/warehouse/stock-movements`, `/warehouse/transfers`, `/warehouse/adjustments`, `/warehouse/locations`
- Project Management: `/project-management`, `/project-management/projects`, `/project-management/tasks`, `/project-management/budget`, `/project-management/documents`, `/project-management/archived`
- Workflows / Tasks / Chat: `/workflows/all-workflows`, `/workflows/my-jobs`, `/workflows/my-to-dos`, `/tasks`, `/to-do`, `/chat`
- Datasets / Admin: `/datasets`, `/datasets/tables`, `/datasets/imports`, `/datasets/views`, `/datasets/relationships`, `/datasets/quality-rules`, `/datasets/automations`, `/datasets/access-keys`, `/datasets/history`

Viewport coverage:

- Desktop: 1440 x 900
- Tablet: 768 x 1024
- Mobile: 390 x 844

Latest local run:

- Evidence: `docs/manual-browser-qa.md`.
- Artifact folder: `.data/manual-browser-qa/2026-05-27T17-20-13-333Z`.
- Browser layout failures: 0.
- Known local warnings: 6 caught 403 reads on warehouse/project state endpoints under the manual QA fallback. Verify these clear in staging with real Supabase env vars.

Latest automated smoke run:

- Evidence: `docs/automated-smoke-tests.md`.
- Artifact folder: `.data/automated-smoke/2026-05-27T17-57-08-815Z`.
- Browser flow failures: 0.

For each route, verify:

- Authenticated route loads without console errors.
- Header/sidebar remain usable.
- Primary table or dashboard content does not overlap.
- Create/edit/detail modal opens and closes.
- Destructive actions have confirmation or reversible archive/trash behavior.
- Export/print/download controls produce files where expected.

## LocalStorage Quota Audit

High localStorage usage areas:

- Auth/account/session scaffolding: `app/login/page.tsx`, `app/signup/page.tsx`, `lib/auth/localAuth.ts`, `lib/tenant/company.ts`
- Notifications and workspace header state: `components/Header.tsx`
- Sales and CRM workspace data: `app/sales/page.tsx`, `app/people/clients/clientData.ts`
- Accounting operational data: `lib/accounting/data.ts`, `app/accounting/*`
- Procurement operational data: `app/procurement/*`
- Warehouse operational data: `lib/warehouse/store.ts`, `components/warehouse/WarehouseModule.tsx`
- Datasets/admin workspace data: `components/datasets/ReworkDatasetsModule.tsx`
- Project management data: `lib/project-management/service.ts`, `components/project-management/*`
- HR documents and employee records: `app/hr/documents/*`, `app/hr/employees/*`
- Chat/messages: `app/chat/page.tsx`, `components/hr/HrMessenger.tsx`, `app/employee/chat/page.tsx`

Quota-sensitive payloads:

- Base64 `dataUrl` document uploads.
- Chat media/audio attachments.
- Project thumbnails and task evidence.
- Dataset file/evidence fields.

Current mitigations:

- Project Management compacts oversized inline attachment payloads and stores thumbnails in IndexedDB.
- Chat stores compact message windows and falls back to recent messages.
- Datasets support export, but still persist the workspace state locally.
- New user-facing upload paths use `/api/uploads`, Supabase Storage when configured, and private `.data/uploads` only for local development.
- `npm run check:security` fails if the covered upload screens reintroduce `readAsDataURL` base64 storage.

Before production data:

- Keep localStorage for preferences only: theme, sidebar state, draft filters, last active tab.
- Move business records to server storage: sales, accounting, procurement, warehouse, datasets, project management.
- Move file payloads to object storage and persist only metadata plus signed/download URLs.
- Add quota handling around every write path that still touches localStorage.

## Backend Persistence Plan

Already backend-backed or partially backend-backed:

- HR records API: `app/api/hr/records/[collection]/*`
- Server session cookie: `app/api/auth/session/route.ts`
- Auth invitations and HR credential email endpoints.

Migrate next:

- Accounting: invoices, bills, transactions, banking, reports, tax, payroll-finance.
- Sales: opportunities, clients, contacts, vendors, teams, sales-to-project conversion.
- Procurement: requests, RFQs, quotations, POs, receiving, approvals, pricebook.
- Warehouse: inventory, locations, movements, transfers, adjustments, valuation.
- Project Management: projects, tasks, evidence, budgets, schedules, reports, archive/restore.
- Datasets: tables, records, views, relationships, automations, access keys, audit history.

Recommended shape:

- Central Data Access Layer with server-only modules.
- Route handlers or server actions per domain.
- RBAC enforced server-side for every read/write.
- Audit log on create/update/delete/archive/restore/export/access-key actions.
- Object storage for uploads.

## Backup / Export / Import

Required backup strategy:

- Per-company JSON export for each domain.
- CSV export for tabular lists.
- PDF export for human-facing reports.
- Import preview with row counts, validation errors, and duplicate handling.
- Restore path tested from a clean browser profile and empty backend.
- Scheduled backend backups once server persistence lands.

Critical exports before deploy:

- Accounting reports, transactions, invoices.
- Project report and task evidence manifest.
- HR employee/document metadata.
- Procurement POs, receipts, approvals.
- Warehouse inventory valuation and movements.
- Dataset tables and audit history.

## Security Review

Completed hardening:

- Production session sealing now requires `AUTH_SESSION_SECRET`, `NEXTAUTH_SECRET`, or `SUPABASE_JWT_SECRET`.
- Session cookies are HttpOnly, SameSite=Lax, and Secure in production.
- Proxy blocks unauthenticated protected pages.
- Banking pages/API are restricted to Admin and Finance.
- HR record APIs enforce collection/action permissions server-side.
- Dataset access-key tokens are masked in UI and rotatable.
- Business and HR record mutation APIs are server-audited and rate-limited.
- Business and HR DELETE APIs require typed confirmation.
- Backup export/restore is Admin-only, tenant-checked, audited, rate-limited, and restore-confirmed.
- Uploads are CSRF-protected, tenant-scoped, size/type validated, rate-limited, stored in object storage, and audited.
- Browser runtime/API failures can be posted to `/api/monitoring/client-errors`; `/api/health` supports deployment health checks.

Pre-deploy blockers:

- Replace client-local auth user storage with backend identity provider records.
- Remove demo/local password account behavior from production paths.
- Enforce server-side RBAC for every domain, not only HR/banking.
- Add CSRF strategy for cookie-authenticated mutations.
- Ensure destructive actions are either confirmed, audited, and reversible, or explicitly permanent.
- Confirm access-key tokens are hashed at rest once moved backend-side.
- Verify real staging Supabase Storage bucket, email provider, branded sender domain, and backup restore rehearsal.

## Seed / Demo Data Cleanup

Before production:

- Keep demo user/data behind `NODE_ENV !== 'production'`.
- Provide an explicit seed command for staging/demo environments.
- Remove stale `.codex-*` and `.claude/worktrees` artifacts from deployment inputs.
- Verify no generated logs or local worktrees are included in build/lint/deploy scope.
- Document how to create first Admin without shipping demo credentials.

## Final Regression Checklist

- Run `npm run lint`.
- Run `npx tsc --noEmit --pretty false`.
- Run `npm run build`.
- Start production server with `npm run start`.
- Browser QA desktop/tablet/mobile for all major modules.
- Verify protected routes redirect when signed out.
- Verify Admin, Finance, HR, Employee, Team Manager, Client route access with `npm run check:roles`.
- Verify create/edit/archive/restore/delete for each module.
- Verify upload/download/export/import workflows.
- Verify localStorage/object-storage quota behavior with large files.
- Verify logout clears local and server session.
- Verify production environment variables are set.
- Verify backup export can restore into a clean environment.
- Run `npm run check:monitoring` against staging/production.
- Run `EMAIL_TEST_SEND=1 npm run check:email` in staging with a real test recipient.
