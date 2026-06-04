# WiseFlow Production Audit - 2026-06-02

## Executive Summary

Verdict: **not production-ready yet**.

Estimated readiness score: **68/100**.

WiseFlow has a stronger baseline than a typical prototype: HMAC-sealed HttpOnly sessions, CSRF origin checks, rate-limit helpers, page-level proxy authorization, server-side company membership checks, RLS-enabled Supabase scripts, security headers, audit logging, typed validation in sensitive HR flows, and automated RBAC/smoke/security scripts.

The production blocker is the trust boundary for the main application role. A Supabase-authenticated user can receive a server session role derived from `user_metadata`, while login/signup client code writes role into that metadata. Supabase `user_metadata` is not a safe source of authorization truth. Because many routes then trust the sealed WiseFlow cookie role, one active company member can potentially turn themselves into Admin/Finance/HR for app authorization.

A second blocker is environment readiness: the local launch check reports required production secrets and providers missing. This is expected in local development, but it means the currently inspected configuration is not launch-ready.

## Safe Fixes Applied In This Pass

1. Workflow empty-state badge mismatch:
   - Added shared workflow storage helpers in `lib/workflows/data.ts`.
   - Updated workflow pages to derive counts from the same records as the table.
   - Updated `components/workflows/WorkflowWorkspaceShell.tsx` so zero badges are hidden.
   - Verified `/workflows/my-jobs` showed zero metrics and no stale sidebar badge.

2. Dataset lint failure:
   - Updated `components/datasets/ReworkDatasetsModule.tsx` to derive active selected dataset IDs with `useMemo` instead of calling state setters from effects.
   - Bulk actions now operate only on selected IDs still present in the filtered result set.

## Production Blockers

| Severity | Issue | Evidence | Impact | Recommendation |
|---|---|---|---|---|
| Critical | Server session role is derived from mutable Supabase `user_metadata` | `app/api/auth/session/route.ts:57-58`; `app/login/page.tsx:161-168`; `app/signup/page.tsx:233-240` | Active members can potentially mint elevated WiseFlow roles and pass page/API authorization. | Derive session role only from server-owned `company_members.role` or Supabase `app_metadata` set with service-role authority. |
| Critical | Company membership and session role are not reconciled | `lib/tenant/serverStore.ts:184-199` returns membership but most callers continue using the cookie role; `lib/security/session.ts:51-60` seals whatever role session creation supplies. | A valid company member with a forged/elevated session role can pass tenant checks and role checks independently. | Make the membership lookup the source of role/permissions for each company request, and seal company-scoped role claims only after server lookup. |
| High | Production environment not configured | `npm run check:launch-env` failed for service-role key, auth secret, production URL/auth mode, legal/support fields, upload bucket, and email provider secrets. | Production boot/deploy would either fail or run with missing security and operations controls. | Complete launch env checklist before any public deployment. |

## High-Risk Findings

| Severity | Issue | Evidence | Impact | Recommendation |
|---|---|---|---|---|
| High | Main login-attempt limiter can be reset by unauthenticated client report | `app/api/auth/login-attempts/route.ts:43-45` resets on `{ outcome: "success" }`. | This rate limiter is advisory for the main Supabase login flow and can be bypassed by non-browser clients. | Move password/auth verification and limiter updates into the same trusted server endpoint, or only reset after verifying a server-side auth event. |
| High | Broad `general` access maps many business modules to the same permission area | `lib/business/collections.ts:59-66`; `lib/business/serverStore.ts:187-196` | Support/HR/Finance/Project Manager roles can access broad non-finance business collections once they are non-Employee/non-Client company members. | Add module-level permissions for clients, CRM, projects, procurement, warehouse, workflows, datasets, and support. |
| High | HR manager and finance visibility may be broader than expected | `lib/hrms/permissions.ts:20-98`; `lib/hrms/serverStore.ts:459-466` | Managers can read many HR records not scoped to their own team; finance can read employee/team/department records for several collections. | Scope managers by reporting hierarchy/team membership; restrict finance to payroll/loan/allowance fields required for finance work. |
| High | Admin-sensitive endpoints inherit the role-source blocker | `/api/admin/backups`, `/api/admin/backups/restore`, `/api/auth/invitations`, `/api/tenant/bootstrap` | These routes have good local guards, but a forged Admin session role would make them dangerous. | Fix session role authority before relying on these controls. |

## Medium-Risk Findings

| Severity | Issue | Evidence | Impact | Recommendation |
|---|---|---|---|---|
| Medium | HR table primary key is global `id`, not tenant-scoped | `scripts/supabase-hr-records-table.sql:1-8`; app upsert uses `onConflict: 'id'` at `lib/hrms/serverStore.ts:290` | Record ID collisions across tenants can overwrite or block records. | Use `(company_id, collection, id)` as the HR primary key, matching business records. |
| Medium | Database RLS enforces membership, not role/module authorization | `scripts/supabase-business-records-table.sql:23-42`; `scripts/supabase-hr-records-table.sql:25-44` | App bugs or service-role misuse can bypass intended module permissions. | Add database-level permission functions/policies for highly sensitive tables where feasible. |
| Medium | Dataset workspace is an opaque JSON blob with client-side validation | `lib/datasets/serverStore.ts:10-15`; `lib/datasets/serverStore.ts:116-122` | Invalid or malicious workspace structure can be persisted and affect every company member. | Add schema versioning and server-side validation for dataset state. |
| Medium | Uploads allow zip/octet-stream and have no malware scanning | `app/api/uploads/route.ts:32-44`; `app/api/uploads/route.ts:73-82` | Authenticated users can upload opaque or archive content without scanning/DLP. | Remove `application/octet-stream` unless required; add malware scanning and quarantine workflow. |
| Medium | Health endpoint exposes deployment capability posture | `app/api/health/route.ts:18-29` | Public callers can learn which services are configured. | Keep `/api/health` minimal publicly; move detailed readiness to authenticated admin or internal monitor endpoint. |
| Medium | CSP permits inline scripts/styles | `next.config.ts:4-16` | XSS blast radius is reduced by other controls but CSP is not strict. | Move toward nonce/hash CSP and remove production `unsafe-inline` where possible. |
| Medium | Employee portal login searches all employee records before company context | `app/api/hr/employee-portal-login/route.ts:109-117` | Password protection limits exposure, but cross-tenant lookup by email/ID is broader than ideal. | Include company selection, unique portal namespace, or tenant-scoped employee login identifiers. |

## Low-Risk / Operational Findings

| Severity | Issue | Evidence | Recommendation |
|---|---|---|---|
| Low | Temporary employee credentials are emailed as plaintext setup passwords | `app/api/hr/employee-credentials/route.ts` | Prefer expiring reset links or one-time setup links. |
| Low | Monitoring smoke depends on a running base URL | `npm run check:monitoring` passes once a local server is listening on port 3000. | Run against a known deployed URL or start a local server inside the script. |
| Low | Docs/checklists are partly stale | Current build reports 146 routes; some docs still reference earlier counts/results. | Refresh launch docs after hardening changes. |
| Low | HRMS script emits Node module type warning | `npm run check:hrms` passes with `MODULE_TYPELESS_PACKAGE_JSON` warning. | Add `"type": "module"` or adjust script/module format if desired. |

## API Surface Review

| Endpoint | Methods | Current controls | Residual risk |
|---|---:|---|---|
| `/api/auth/session` | POST, DELETE | CSRF, rate limit, Supabase bearer verification, HMAC cookie | Critical role-source issue from `user_metadata`. |
| `/api/auth/login-attempts` | POST | CSRF, IP/email rate-limit storage, audit log | Client can report success/reset. |
| `/api/auth/invitations` | POST | Session, CSRF, company access, rate limit | High impact if Admin role can be forged. |
| `/api/tenant/bootstrap` | POST | Session, CSRF, rate limit, tenant store | High impact; first-admin/onboarding contract needs server-owned role model. |
| `/api/business-records/[collection]` | GET, POST, PUT | Session area gate, company access, CSRF for writes, rate limit, audit log | Module permissions are too broad under `general`. |
| `/api/business-records/[collection]/[id]` | GET, PATCH, DELETE | Session area gate, company access, CSRF for writes, rate limit, delete confirmation, audit log | Same broad module permission risk. |
| `/api/hr/records/[collection]` | GET, POST | Session, HR collection permission, company access, CSRF for writes, rate limit | Manager/finance visibility scope should be tightened. |
| `/api/hr/records/[collection]/[id]` | GET, PATCH, DELETE | Session, HR collection permission, company access, CSRF for writes, rate limit, delete confirmation | Same HR visibility scope risk. |
| `/api/hr/employee-credentials` | POST | Session/HR permission, CSRF, rate limit, mail escaping | Plaintext temporary-password delivery. |
| `/api/hr/employee-portal-login` | POST | CSRF, server-side password verification, rate limit, HMAC cookie | Cross-tenant employee search before company context. |
| `/api/datasets/workspace` | GET, PUT | Session, general area gate, company access, CSRF for PUT, rate limit | Opaque JSON state and broad `general` access. |
| `/api/uploads` | POST, GET | Session, company access, CSRF for POST, size/type allowlist, path traversal guard, signed URLs | No malware scanning; broad file types. |
| `/api/ai/assistant` | POST | Session, CSRF, rate limit | No direct data access found; keep prompt/data boundaries documented. |
| `/api/monitoring/client-errors` | POST | CSRF, rate limit, sanitization, optional session | Guest log spam possible from non-browser clients. |
| `/api/health` | GET | No auth, no secret values returned, no-store | Public config-status disclosure. |
| `/api/admin/backups` and `/restore` | GET, POST | Admin-sensitive route family | Needs re-review after role-source fix; high blast radius. |

## Access Control Matrix

| Role | Expected access | Observed access | Gap |
|---|---|---|---|
| Admin / Owner | Full workspace and admin operations | `normalizeRole` maps owner/admin-like labels to Admin; page/API checks allow Admin broadly. | Unsafe if role is client-mutable. |
| HR | HR operations; no finance/banking | RBAC script passed expected page/API denials; HR can create payroll only Pending/Processing. | HR also gets broad `general` module access. |
| Finance | Finance, payroll/loan/allowance support; banking | RBAC script passed expected finance access. | Finance can read broader HR employee/team/department data in the HR permission table. |
| Employee | Employee portal and own HR records | Employee portal uses its own server password login and employee-scoped visibility. | Main app role-source issue could bypass this if using Supabase app session. |
| Team Manager | Employee/dashboard plus manager workflows | Manager can read many HR collections and all non-payroll/non-loan visible records. | Not scoped to direct reports/team. |
| Project Manager / Support | General workspace areas only | `general` area allows all non-Employee/non-Client roles. | Too broad for procurement, warehouse, clients, datasets, workflows. |
| Client | Client portal only | RBAC script passed expected denials. | Same role-source caveat if a client can modify metadata before server session creation. |

## Database / Storage Review

Positive:

- Business records use `(company_id, collection, id)` as composite primary key.
- Business and HR RLS policies require `public.is_company_member(company_id)`.
- Tenant SQL uses security-definer helper functions with `search_path` constrained.
- Server stores use service-role clients only on the server.
- File-store fallbacks are disabled in hosted production unless explicit directories are configured.

Gaps:

- HR records should be keyed by tenant and collection, not global `id`.
- RLS is membership-only; app logic handles role permissions.
- Dataset state needs server-side schema validation and versioning.
- Upload metadata/local fallback should be treated as development-only for production launch.

## Frontend / UX / Data Boundary Review

Positive:

- The workflow badge empty-state issue has been fixed.
- The app already documents production data boundaries in `docs/production-data-boundary.md`.
- The proxy protects pages and redirects role-inappropriate page access.
- Client components generally use server APIs for production-critical business data that has been migrated.

Gaps:

- Local storage still participates in signup/login/account bootstrap flows and several UI state areas.
- Role and company bootstrap behavior is too coupled to client-side metadata.
- Dataset state is durable but still effectively client-defined.

## DevOps / Security Headers

Positive:

- `poweredByHeader: false`.
- HSTS, `nosniff`, `Referrer-Policy`, `Permissions-Policy`, `X-Frame-Options`, and CSP are configured.
- Production session secret is required by `lib/security/session.ts`.
- Secret scan did not print or find obvious committed credential values.
- `npm audit --audit-level=moderate` found zero vulnerabilities.

Gaps:

- Launch env check failed required production values.
- CSP still allows inline script/style.
- Health/readiness should be split into public liveness and private readiness.

## Commands Run

| Command | Result |
|---|---|
| `npm run check:types` | Pass |
| `npm run lint` | Initially failed on dataset hook state-in-effect; pass after safe fix |
| `npm run build --debug` | Pass |
| `npm audit --audit-level=moderate` | Pass, 0 vulnerabilities |
| `npm run check:security` | Pass |
| `npm run check:hrms` | Pass, with Node module-type warning |
| `npm run check:roles` | Pass |
| `npm run check:smoke` | Pass |
| `npm run check:launch-env` | Fail, production env not configured |
| `npm run check:monitoring` | Pass after starting local dev server on `http://127.0.0.1:3000` |

## Recommended Fix Plan

### Immediate Production Blockers

1. Replace role derivation in `/api/auth/session`:
   - Accept/resolve company context.
   - Verify Supabase bearer token.
   - Load active `company_members` row by `user_id` or email.
   - Seal session with `companyId`, membership `role`, and server-owned permissions.
   - Ignore `user_metadata.role` for authorization.

2. Rework first-admin/bootstrap:
   - Create first company/admin through a trusted server path.
   - Store role in `company_members`.
   - Never require client-written auth metadata to establish Admin authority.

3. Complete production env:
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `AUTH_SESSION_SECRET` or equivalent
   - production app URL/auth flags
   - support/legal identity
   - upload bucket
   - email provider sender and API key

### Next 7 Days

1. Add module-level permissions for business collections.
2. Scope manager HR visibility to team/direct reports.
3. Move login-attempt enforcement into the trusted auth server path.
4. Change HR table key to `(company_id, collection, id)`.
5. Split `/api/health` into public liveness and private readiness.

### Next 30 Days

1. Normalize dataset state or add strict server-side schema validation.
2. Add upload malware scanning/quarantine.
3. Tighten CSP with nonces/hashes and remove production inline allowances.
4. Add API tests for role escalation, cross-tenant reads/writes, manager scope, and business module permissions.
5. Refresh launch hardening docs to match current route count and checks.

## Final Launch Decision

Do not ship to production until the session role source is server-owned and production environment checks pass.

After those two blockers are resolved, the app should be re-tested with:

- role escalation attempts against `/api/auth/session`
- cross-company access attempts for HR/business/datasets/uploads
- Admin backup/restore authorization tests
- manager team-scope tests
- launch env check against the real deployment
- monitoring smoke against the real deployment URL
