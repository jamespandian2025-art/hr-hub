# Security Advisory Tracking

Last reviewed: 2026-05-27

## PostCSS via Next.js

- Advisory: PostCSS `<8.5.10` XSS in CSS stringify output.
- Current finding: `npm audit --omit=dev --audit-level=moderate` reports 2 moderate findings through `next`.
- Current Next.js version: `16.2.6`.
- Decision: accepted temporarily for launch hardening because `npm audit fix --force` proposes a breaking downgrade to Next.js 9.x.
- Mitigation:
  - Keep the app on the patched Next.js 16.2.x line required by `scripts/security-checks.mjs`.
  - Do not generate CSS from untrusted user input.
  - Keep CSP enabled in `next.config.ts`.
  - Re-check after each Next.js release and upgrade when a patched compatible version is available.

Review before production launch and before every dependency upgrade.
