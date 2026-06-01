# Same-Day Closed Beta Launch Runbook

Last updated: 2026-06-02

This runbook is for a closed beta launch, not a full public paid launch. Online checkout is not active yet, so billing should be handled manually until Stripe, PayPal, or another subscription provider is added.

## Owner Tasks

1. Choose the launch domain.
2. Create or open the production Vercel project.
3. Create or open the production Supabase project.
4. Choose one email provider: Resend, Brevo, or SendGrid.
5. Choose a support email and set it as `NEXT_PUBLIC_SUPPORT_EMAIL`.
6. Confirm the legal/business name shown as `NEXT_PUBLIC_LEGAL_NAME`.
7. Decide if customers will be manually invoiced during beta.
8. Use `docs/domain-vercel-setup.md` after the domain is purchased.

## Required Production Environment Variables

Set these in Vercel or the production hosting provider:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_ENABLE_SUPABASE_AUTH=true
NEXT_PUBLIC_APP_URL=https://your-domain.com
NEXT_PUBLIC_LEGAL_NAME=WiseFlow
NEXT_PUBLIC_SUPPORT_EMAIL=support@your-domain.com
NEXT_PUBLIC_BILLING_MODE=manual
AUTH_SESSION_SECRET=
WISEFLOW_UPLOAD_BUCKET=wiseflow-uploads
MONITORING_BASE_URL=https://your-domain.com
```

Set exactly one email provider:

```bash
EMAIL_FROM=support@your-domain.com
RESEND_API_KEY=
RESEND_FROM_EMAIL=support@your-domain.com
```

or:

```bash
EMAIL_FROM=support@your-domain.com
BREVO_API_KEY=
BREVO_FROM_EMAIL=support@your-domain.com
```

or:

```bash
EMAIL_FROM=support@your-domain.com
SENDGRID_API_KEY=
SENDGRID_FROM_EMAIL=support@your-domain.com
```

Optional AI assistant:

```bash
OPENAI_API_KEY=
OPENAI_MODEL=gpt-5.4-mini
```

Generate `AUTH_SESSION_SECRET` with a password manager or:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"
```

## Supabase Setup Order

Run these SQL files in the Supabase SQL editor, in this order:

1. `scripts/supabase-multi-company.sql`
2. `scripts/supabase-clients-table.sql`
3. `scripts/supabase-sales-orders-table.sql`
4. `scripts/supabase-hr-records-table.sql`
5. `scripts/supabase-business-records-table.sql`
6. `scripts/supabase-rate-limits-table.sql`
7. `scripts/supabase-production-verify.sql`

Create a private Supabase Storage bucket named:

```bash
wiseflow-uploads
```

## Verification Commands

Run these after setting real production or staging environment values:

```bash
npm run check:supabase
npm run check:email
npm run check:launch-env
npm run check:launch-local
npm run check:security
npm run check:hrms
npm run check:roles
npm run check:smoke
npm run check:manual-qa
npm run check:monitoring
npm run build
```

For a real email send test:

```bash
EMAIL_TEST_SEND=1 EMAIL_TEST_RECIPIENT=your-test-email@your-domain.com npm run check:email
```

## Launch Rule

Closed beta can start when:

- Build passes.
- Security checks pass.
- Supabase production verification passes.
- Email dry run and one real test email pass.
- Health check reports Supabase configured, auth secret configured, email provider configured, and Supabase upload storage.
- You have reviewed the Privacy Policy, Terms, Refund Policy, and Security pages for your real business name and support email.

Do not enter real payroll, HR, customer, finance, or legal data until the production checks pass against real Supabase and email credentials.
