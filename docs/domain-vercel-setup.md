# Domain and Vercel Setup Guide

Use this after buying the domain. This is written for a closed beta launch.

## What the Owner Does

1. Buy the domain.
2. Choose the final production URL, for example `https://your-domain.com`.
3. Create or open the Vercel account.
4. Add Codex or the developer as needed, but do not share private passwords in chat.

## What the Developer Does in Vercel

1. Create the Vercel project from this repository.
2. Set the production environment variables from `.env.production.example`.
3. Add the custom domain in Vercel.
4. Follow the DNS records Vercel shows for the domain provider.
5. Deploy production.
6. Run the production checks.

## DNS Checklist

In Vercel, open:

```text
Project Settings > Domains
```

Add:

```text
your-domain.com
www.your-domain.com
```

Then copy the DNS records Vercel gives you into the domain provider dashboard.

Common records are:

```text
A record for @
CNAME record for www
```

Use exactly what Vercel shows, because the exact values can differ by project.

## Supabase Auth URL Checklist

In Supabase, set the production site URL to:

```text
https://your-domain.com
```

Add redirect URLs for:

```text
https://your-domain.com/login
https://your-domain.com/signup
https://your-domain.com/account-recovery
```

If staging is used, add the staging versions too.

## Production Verification

After the domain, Supabase, email, and upload bucket are configured, run:

```bash
npm run check:launch-env
npm run check:supabase
npm run check:email
npm run check:launch-local
```

Then open the production domain and test:

1. Homepage loads.
2. Signup works.
3. Login works.
4. Logout works.
5. Admin dashboard opens.
6. Employee login opens.
7. Privacy, Terms, Refund Policy, and Security pages open.

## Launch Rule

Launch as a closed beta first. Do not accept public paid customers until online payment checkout is added and tested.
