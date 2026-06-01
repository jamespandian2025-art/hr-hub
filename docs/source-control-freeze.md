# Source Control Freeze

Freeze date: 2026-05-27

## Scope Status

The current workspace is treated as a release-candidate worktree, not an open-ended feature branch. New product work should stop until the existing changes are reviewed, grouped, and committed or intentionally parked.

## Included In Review

- Application source under `app/`, `components/`, and `lib/`.
- Supabase and verification scripts under `scripts/`.
- Launch, security, backup, and readiness documentation under `docs/`.
- Environment documentation in `.env.example`.
- Package scripts in `package.json`.

## Excluded From Source Control

These are local/generated artifacts and should not be part of deploy input:

- `.codex-*`
- `.claude/`
- `*.log`
- `qwiet-*.json`
- `qwiet-*.log`
- `.data/`
- `*.backup`
- `*.dump`
- `*.sql.gz`
- `.next/`
- `node_modules/`
- real `.env*` files, except `.env.example`

## Commit Grouping

Use small reviewable commits instead of one broad snapshot:

1. Security and launch hardening: password hashing, auth/session checks, smoke/security scripts, env documentation, and launch readiness docs.
2. Product UI and workflow changes: invoices, client invoice reflection, payroll details modal, project dropdown styling, PHP currency display, and global background cleanup.
3. Source-control cleanup: ignore rules and removal of generated logs/tool worktrees from tracking.

## Verification Gate

Before tagging a launch candidate, run:

- `npm run lint`
- `npx tsc --noEmit`
- `npm run build`
- `npm run check:security`
- `npm run check:hrms`
- `npm run check:smoke`
- `npm audit --omit=dev --audit-level=moderate`

The audit currently has a documented Next.js/PostCSS moderate advisory in `docs/security-advisories.md`.

## Remaining Owner Review

The dirty worktree contains many intentional app changes. Do not revert them during cleanup. Review each module owner area, then commit or park the changes by grouping above.
