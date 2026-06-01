# Staging Environment

Last updated: 2026-05-28

## Setup

1. Create a separate Supabase staging project.
2. Copy `.env.staging.example` into the staging deployment provider and fill real staging values.
3. Run the Supabase SQL setup scripts against staging.
4. Create a private Supabase Storage bucket matching `WISEFLOW_UPLOAD_BUCKET`.
5. Configure one email provider with a staging sender domain or subdomain.

## Seed Fake Data

Run:

```bash
npm run seed:staging
```

The seed writes fake company, member, client, invoice, project-management, employee, and payroll records. Do not seed real customer or payroll data into staging.

## Required Staging Gates

Run these against staging before production:

- `npm run check:supabase`
- `npm run check:roles`
- `npm run check:manual-qa`
- `npm run check:smoke`
- `npm run check:monitoring`
- `EMAIL_TEST_SEND=1 npm run check:email`

Then perform a backup export and restore rehearsal into a clean staging workspace.
