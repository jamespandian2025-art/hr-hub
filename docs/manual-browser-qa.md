# Manual Browser QA

Last run: 2026-05-28

## Result

- Command: `npm run check:manual-qa`
- Production server mode: `next start`
- Viewports checked:
  - Desktop: 1440 x 900
  - Tablet: 768 x 1024
  - Mobile: 390 x 844
- Routes checked: 16 routes x 3 viewports = 48 browser checks.
- Failures: 0.
- Artifact folder: `.data/manual-browser-qa/2026-05-27T19-50-27-217Z`

## Routes Covered

- `/dashboard`
- `/sales`
- `/people/clients`
- `/accounting`
- `/accounting/invoices`
- `/accounting/banking`
- `/hr/employees`
- `/hr/payroll`
- `/procurement`
- `/warehouse`
- `/project-management`
- `/workflows/all-workflows`
- `/datasets`
- `/employee/dashboard`
- `/employee/payslips`
- `/client-portal`

## Fixes Applied

- Fixed mobile accounting header action sizing so `New Record` no longer clips.
- Fixed accounting primary button text visibility in invoice actions.
- Fixed mobile client portal grid collapse and sticky sidebar behavior.
- Fixed HR employee KPI cards so the five-card row stacks on mobile.
- Increased client pagination button width to avoid clipped labels.
- Refined the browser QA script so closed off-canvas sidebars are not counted as visible overflow.
- Added local-only manual QA session support for the QA proxy and server session reader.
- Isolated every route in a fresh Chrome target to avoid background fetch leakage between pages.

## Notes

- The latest run still reports 6 non-blocking local API warnings from caught read attempts to `/api/business-records/warehouse-state` and `/api/business-records/project-management-state`. The pages remain usable and passed layout checks.
- Re-run this in staging with production Supabase env vars before real customer data is entered, and confirm those local-only warnings are gone there.
