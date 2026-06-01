# Production Email

Last updated: 2026-05-28

## Supported Providers

- Resend: `RESEND_API_KEY`, `RESEND_FROM_EMAIL`
- Brevo: `BREVO_API_KEY` or `SENDINBLUE_API_KEY`, `BREVO_FROM_EMAIL`
- SendGrid: `SENDGRID_API_KEY`, `SENDGRID_FROM_EMAIL`

`EMAIL_FROM` is accepted as a common sender fallback.

## Verification

Run a dry check:

```bash
npm run check:email
```

Run a staged send:

```bash
EMAIL_TEST_SEND=1 EMAIL_TEST_RECIPIENT=qa@your-domain.com npm run check:email
```

The check validates that a supported provider key exists, that a sender address exists, and that the sender does not use a consumer mailbox domain.

## Flow Coverage

- Employee credential email is sent through Resend, Brevo, or SendGrid from `app/api/hr/employee-credentials/route.ts`.
- Account invitations use Supabase Auth invitation emails.
- Account recovery uses Supabase password reset emails.

Before closed beta, verify all three flows in staging with a branded, domain-authenticated sender.
