# Closed Beta Launch Scope

Last updated: 2026-06-02

This project should launch this week as a closed beta, not a full public paid launch. A closed beta means only a small trusted group gets access while we watch for problems and fix them quickly.

## Launch Type

- Recommended launch: closed beta.
- Billing for beta: manual billing only.
- Online subscription checkout: disabled until Stripe, PayPal, or another payment provider is fully configured and tested.
- Real sensitive data: do not enter real payroll, HR, customer, finance, or legal data until production Supabase, email, storage, backups, and monitoring checks pass.

## Ready For Closed Beta After Production Setup

These areas are allowed for closed beta once the real production services are configured and checks pass:

- Public website pages.
- Signup, login, logout, and account recovery.
- Dashboard.
- Client Database.
- Financials and Accounting.
- Project Management.
- HR Hub and Employee Portal.
- Warehouse.
- Legal pages: Privacy Policy, Terms, Refund Policy, and Security.
- Health check, monitoring, backups, uploads, and audit logs.

## Marked Beta

These areas are visible, but should be used carefully in closed beta. They are not approved for real production business data until their data storage and QA are fully verified:

- Sales.
- Procurement.
- Supplier Database.
- Workflows.
- Datasets.

## Marked Internal

These areas are for the owner or development team only:

- Design System.

## Disabled Or Manual This Week

These should not be presented as finished launch features yet:

- Online subscription checkout.
- Automatic paid plan upgrades or cancellations.
- Public self-serve paid launch.
- Any module that still saves real business records directly in browser storage.

## Go/No-Go Rule

Launch closed beta only when:

- `npm run check:launch-local` passes.
- `npm run check:launch-env` passes with real production values.
- `npm run check:supabase` passes against the real Supabase project.
- `npm run check:email` passes, including one real test email.
- Production health check says Supabase, auth secret, email, and upload storage are ready.
- The owner has reviewed the legal pages and replaced placeholder business details.

