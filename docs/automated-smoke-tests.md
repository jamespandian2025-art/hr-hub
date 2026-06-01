# Automated Smoke Tests

Last run: 2026-05-28

## Result

- Command: `npm run check:smoke`
- Route/auth smoke: passed.
- Browser flow smoke: passed.
- Flow checks: 5 of 5 passed.
- Latest artifact folder: `.data/automated-smoke/2026-05-27T19-47-03-698Z`

## What The Suite Covers

- Route smoke:
  - Public routes return `200`.
  - Protected routes redirect signed-out users to the correct login route.
- Accounting invoice creation:
  - Opens the invoice form.
  - Selects a client from the client database dropdown.
  - Verifies email and Bill to fields are auto-filled from the client record.
  - Creates an invoice with unit type, unit cost, and quantity.
- Client invoice reflection:
  - Opens the selected client profile.
  - Switches to the Invoices tab.
  - Confirms the newly created invoice appears with amount and billing email.
- Employee portal login:
  - Logs in through `/employee/login` using a seeded hashed portal password.
  - Confirms redirect to the employee dashboard.
- Payroll details modal:
  - Seeds employee and payroll records in isolated browser storage.
  - Opens a payroll cycle.
  - Opens a payslip details dialog from the cycle Employee Payslips tab.
- Project status dropdown:
  - Opens the project list.
  - Opens the styled status dropdown.
  - Confirms the menu has no duplicate `In Progress` option.
  - Changes a project status and verifies the badge updates.
- AI assistant:
  - Opens the global WiseFlow AI widget from the Dashboard.
  - Sends an invoice workflow question.
  - Confirms the assistant returns deterministic local invoice guidance when no `OPENAI_API_KEY` is configured.

## Implementation Notes

- `npm run check:smoke` now runs both `check:route-smoke` and `check:flow-smoke`.
- `check:flow-smoke` uses headless Chrome or Edge through the Chrome DevTools Protocol.
- Test records are isolated under `.data/automated-smoke-business`, `.data/automated-smoke-hrhub`, and `.data/automated-smoke-rate-limits`.
- Screenshots and reports are written under `.data/automated-smoke/<run-id>`.
- The QA proxy rewrites local `Origin` and `Referer` headers so same-origin CSRF checks behave like a real app origin during protected browser flows.
- The AI assistant flow clears `OPENAI_API_KEY` in the smoke server environment so the test does not spend API calls.
