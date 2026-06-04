# HR Module — Live-Readiness Audit

_Audited 2026-06-02 against branch `project-management-ui-polish`. Read-only trace of every HR workflow end-to-end._

---

## UPDATE 2026-06-02 — P0 data-layer migration COMPLETE & verified

All P0 items below are now implemented and (where testable against the live server) verified end-to-end with the seeded demo employee.

**Two cross-cutting bugs found during implementation (these also silently broke the "working" leave/loan flows):**
1. **Ownership** — the server scopes record ownership by `session.employeeId`, so portal records written with `employee.id` were rejected on write (403) **and** invisible on read. Fixed: portal writes now use `employee.employeeId || employee.id` (attendance, leave, loan, allowance); payroll carries `employeeCode` so employees can read their own payslip.
2. **Company scoping** — the portal never set an active company, so writes defaulted to `default-company` while HR reads the real company. Fixed server-side: new `resolveCompanyId()` falls back to the **authenticated session's** companyId (one place, fixes every portal write).

**Modules migrated to the shared server store (read-merge poll + write-through):**
- ✅ **Attendance** — portal clock-in/out → server (idempotent upsert); HR reads + marks/edits/deletes through the server. _Verified: punch lands in `pandian` as `Late`; employee delete correctly 403s._
- ✅ **Payroll** — run → server (`Pending`); Finance approve/release → server. _Verified: employee reads own payslip; employee create 403s. No calculations changed._
- ✅ **Employees** — list reads server-merged; archive/clear propagate as server deletes.
- ✅ **Leave approval + cancel** — HR decisions PATCH the server; employees may cancel their own **pending** request via a bounded server rule. _Verified: cancel ok; self-approve 403; field-tamper 403._
- ✅ **Teams + Documents** — read-merged; create/delete (and document upload/restore) write through.

**Demo login:** `demo@wiseflow.employee` / `demo12345` (seeded via `scripts/seed-demo-employee.mjs`).

Remaining for full live-readiness: P1 RBAC reconcile (#30), P2 features (announcements #31, leave balances/checklists #32), P3 QA polish (#33), and the orphaned `.tmp` cleanup (flagged separately). Department-rename propagation for teams is still local-only (minor).

---

## Verdict

**Not yet live-ready for multi-user use.** The screens and feature surface are largely complete and the in-app logic is mostly correct, but the **persistence layer is fragmented**: authentication and two request types use the server, while everything else lives in per-browser `localStorage`. In a real deployment (HR on one device, employees on others) most data never crosses devices. This is a correctness/architecture blocker, not cosmetics.

---

## 1. Architecture finding — the persistence split

Each HR surface was traced for server calls (`/api/hr/records`, `listHrRecords`, `fetch`) vs `localStorage` (`loadStored`/`saveStored`).

| Surface | Server-aware? | Source of truth | Live-ready |
|---|---|---|---|
| Portal **login** (`/api/hr/employee-portal-login`) | ✅ | Server store (`.data/hrhub`) | ✅ |
| HR **Leave Requests** (`/hr/leave-requests`) | ✅ (3 calls) | Server + local merge | ⚠️ partial |
| HR **Loan Requests** (`/hr/loan-requests`) | ✅ | Server + local merge | ⚠️ partial |
| HR **Employee detail / new** (`/hr/employees/[id]`, `/new`) | ✅ | Server (write) | ⚠️ partial |
| HR **Overview** | ✅ | Server (read) | ⚠️ partial |
| Portal leave/loan/allowance **submit** | ✅ | Server POST + local | ⚠️ partial |
| HR **Employees LIST** (`/hr/employees`) | ❌ (`page.tsx:275`) | localStorage only | ❌ |
| HR **Approvals** (`/hr/approvals`) | ❌ (0 calls) | localStorage only | ❌ |
| HR **Attendance** (`/hr/attendance`) | ❌ (0 calls) | localStorage only | ❌ |
| HR **Payroll** (`/hr/payroll`) | ❌ (0 calls) | localStorage only | ❌ |
| HR **Teams** (`/hr/teams`) | ❌ (0 calls) | localStorage only | ❌ |
| HR **Documents** (`/hr/documents`) | ❌ (0 calls) | localStorage only | ❌ |
| HR **Performance** (`/hr/performance`) | ❌ (0 calls) | localStorage only | ❌ |
| Portal **dashboard/attendance/payslips/documents/announcements** | ❌ | localStorage only (`employeeData.ts:384-391`) | ❌ |

**Why this fails in production:** `localStorage` is per-browser/per-device. The HR manager and an employee on different machines do not share data. Clearing the browser, switching device, or incognito loses everything. The demo login I seeded authenticates server-side, but once in, the portal reads `localStorage`, so a fresh device shows an empty portal.

---

## 2. Workflow-by-workflow trace

### Employees
- Create/edit (`/hr/employees/new`, `/[id]`) **does** POST to the server. Good.
- But the **list** (`app/hr/employees/page.tsx:275`) reads `localStorage` only — never pulls the server. → On a second device, HR sees no employees even though they exist server-side. **Broken for live.**

### Attendance ⛔
- Portal clock-in writes `flowsys-hr-attendance` in `localStorage` and now correctly computes **Late vs Present** from shift start (just wired).
- HR Attendance page (`/hr/attendance`) reads the **same localStorage** — so it only works **within one browser**. Cross-device, HR never sees an employee's clock-in. The late-tracking is real but device-local. **Broken for live.**

### Payroll ⛔
- Generated client-side as `status: 'Pending'`, `source: 'payroll-run'` (`payroll/page.tsx:439-440`), persisted to `localStorage` (`:532-544`). **Zero server calls.**
- The server **does** enforce the correct workflow (`serverStore.ts:373-380`: HR may only create `Pending`/`Processing`; Finance approves/releases) — but because payroll never POSTs, **that guard is never exercised** and payroll never crosses devices. **Broken for live.**

### Leave requests ⚠️ (works, but with two correctness bugs — see §3)
- Submit → server POST + notification to HR (`records/[collection]/route.ts:51-64`). Good.
- Portal syncs every 2.5s, merging `[...local, ...server]` server-wins (`employeeData.ts:412`, `uniqueRecordsById:354-361`). Good pattern.
- Two competing HR surfaces: `/hr/leave-requests` (server-aware) **and** `/hr/approvals` (localStorage-only). See bug #1.

### Loan / Allowance requests
- Same solid submit→notify→sync pattern as leave (Finance audience). These are the **reference implementation** the rest of the module should follow.

### Teams / Documents / Performance ⛔
- All three: **zero server calls**, `localStorage` only. Demo-only. **Broken for live.**

### Announcements / Holidays ⛔
- Portal reads them from `localStorage` (`employeeData.ts:390-391`); there is **no HR surface that creates them server-side**. Effectively non-functional across devices.

### Auth / Portal session ✅
- Server-side: CSRF, rate limiting, pbkdf2-sha256 (210k iters) portal password, sealed session cookie, company scoping. This part is genuinely production-grade.

---

## 3. Specific correctness bugs (verified, with locations)

1. **Approvals don't reach employees.** `/hr/approvals` `updateStatus` writes `localStorage` only (`approvals/page.tsx:80`, 0 server calls). An HR approval made here never PATCHes the server, so the employee's portal (which syncs server-wins) never sees it — and stale server `Pending` would overwrite it. Use `/hr/leave-requests` instead, or wire approvals to the server. **Duplicate/divergent surfaces.**

2. **Local cancel silently reverts.** Employee cancel (`leave-requests/page.tsx` `cancelRequest`, ~`:38-43`) writes `localStorage` only — no server PATCH. On the next 2.5s sync the server's `Pending` (server-wins merge) overwrites the local `Cancelled`, so the cancellation appears to undo itself.

3. **Attendance is device-local** (see §2). The late-detection just added is correct logic but only visible in the browser that recorded it.

4. **Payroll guard never runs** (see §2) — the well-designed server RBAC for payroll is dead code as long as the page is localStorage-only.

5. **Orphaned temp files.** `.data/hrhub/` holds 150+ `audit-logs.json.*.tmp` files (~150 MB). The atomic temp+rename write (`serverStore.ts:153-158`) is leaving temps behind — likely a Windows `rename` race/permission issue. Disk + reliability risk. (Flagged separately.)

---

## 4. Missing features (not built yet)

- **Leave balances/policies**: entitlements are derived from past requests, not configurable allocations per employee/type/year.
- **Onboarding / offboarding checklists**: none.
- **Announcements management UI** feeding the Overview/portal (server-backed).
- **RBAC reconcile**: `collectionAccess` (`permissions.ts:20+`) is solid, but route-level header trust (`x-hr-role`/`x-hr-user-id` used by the client) vs sealed-session role should be reconciled so a client can't assert a role.

---

## 5. What's already solid (keep)

- Server API: CSRF, RBAC (`canAccessCollection`), company scoping, rate limiting, audit logging, auto-notifications on request create.
- Corruption-resilient JSON store (`salvageLeadingJsonArray`).
- Payroll PH statutory math + attendance-adjusted earnings + server workflow guard.
- The leave/loan **submit → notify → 2.5s merge-sync** pattern — this is the template for everything else.

---

## 6. Prioritized roadmap to "live"

**P0 — data layer (the actual blocker):**
1. Make HR **Employees list** read the server (mirror `/hr/leave-requests`). [#28]
2. Move **Attendance** onto the server API with the leave/loan merge-sync pattern. (Highest user impact — clock-in must be shared.)
3. Move **Payroll** onto the server so the existing workflow guard actually runs.
4. Move **Teams** and **Documents** onto the server. [#29]
5. Fix the two sync bugs: PATCH server on **approve/reject** and on **cancel** (bugs #1, #2). Consolidate `/hr/approvals` and `/hr/leave-requests` into one server-backed surface.

**P1:**
6. Reconcile route RBAC vs sealed-session role (stop trusting client `x-hr-*` headers). [#30]
7. Clean up orphaned `.tmp` files + harden the atomic write for Windows.

**P2 (feature completeness):**
8. Server-backed **Announcements** management feeding Overview/portal. [#31]
9. **Leave balances/policies** + **onboarding/offboarding checklists**. [#32]
10. QA polish: loading/error states, a11y, validation, responsive. [#33]

**Recommended first move:** P0 #2 (Attendance → server). It's the single change that turns the most-used daily workflow from "demo-only" into "actually shared," and the leave/loan pattern is already proven to copy from.
