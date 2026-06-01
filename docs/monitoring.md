# Monitoring

Last updated: 2026-05-28

## Runtime Coverage

- `/api/health` returns deployment health metadata with `Cache-Control: no-store`.
- `ClientMonitoring` captures browser runtime errors, unhandled promise rejections, same-origin API responses `>=500`, and API network failures.
- Client monitoring events are CSRF-protected, rate-limited, and written to server audit logs as `monitoring.*`.
- Failed login and employee portal login attempts are audited through the auth endpoints.

## Smoke Check

Run:

```bash
npm run check:monitoring
```

Set `MONITORING_BASE_URL` to test staging or production. The script verifies:

- `/api/health`
- `/login`
- `/dashboard` auth-gate or load response

## Production Notes

- Point uptime monitoring at `/api/health` and `/login`.
- Alert on repeated `monitoring.api-failure`, `monitoring.api-network-error`, and `login.failure` audit entries.
- Keep monitoring payloads small; the API truncates message, URL, and stack fields before audit storage.
