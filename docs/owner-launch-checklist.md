# Owner Launch Checklist

Last updated: 2026-06-02

Use this as the simple launch list. You do not need to understand the code to follow it.

## Your Part

- [ ] Buy or confirm the domain.
- [ ] Confirm the final business/legal name for the app.
- [ ] Confirm the support email address customers should see.
- [ ] Create or confirm the production Vercel account.
- [ ] Create or confirm the production Supabase account.
- [ ] Choose one email provider: Resend, Brevo, or SendGrid.
- [ ] Decide whether beta customers are manually billed this week.
- [ ] Review the Privacy Policy, Terms, Refund Policy, and Security pages.
- [ ] Approve the final public wording on the homepage and legal pages.
- [ ] Choose the small beta test group.
- [ ] Test signup, login, logout, dashboard, HR, employee portal, accounting, project management, and warehouse as the owner.

## Developer And QA Part

- [x] Add legal pages.
- [x] Change launch messaging to closed beta/manual billing.
- [x] Add production environment template.
- [x] Add launch readiness checks.
- [x] Add visible beta/internal labels for modules that should not be treated as finished public launch features.
- [ ] Add the real production environment values in Vercel after the owner creates the accounts.
- [ ] Run Supabase SQL setup in the real Supabase project.
- [ ] Create the private upload bucket in Supabase Storage.
- [ ] Run staging checks with real Supabase, email, and storage.
- [ ] Run production checks after deployment.
- [ ] Fix any failed launch blocker found in staging or production QA.

## Production Values Needed

These values must be created in the real services and entered in Vercel:

- Supabase project URL.
- Supabase anon key.
- Supabase service role key.
- App URL using the final domain.
- Auth session secret.
- Legal/business name.
- Support email.
- Private upload bucket name.
- Email sender address.
- Email provider API key.

## Same-Day Order

1. Buy or confirm the domain.
2. Create production Supabase.
3. Run the SQL files listed in `docs/same-day-launch-runbook.md`.
4. Create a private Supabase Storage bucket named `wiseflow-uploads`.
5. Create production Vercel project.
6. Add all production environment variables from `.env.production.example`.
7. Configure the domain in Vercel.
8. Run production checks.
9. Fix blockers.
10. Invite a small beta group.

## Final Rule

Do not use real payroll, HR, finance, or customer data until the production checks pass with real production accounts and the legal pages are approved.

