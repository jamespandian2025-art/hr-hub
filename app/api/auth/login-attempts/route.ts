import { requestIp } from '@/lib/security/session'
import { appendAuditLog } from '@/lib/hrms/serverStore'
import { requireCsrf } from '@/lib/security/requestGuards'
import {
  checkRateLimit,
  hitRateLimit,
  rateLimitIdentifier,
  rateLimitPolicies,
  resetRateLimit,
} from '@/lib/security/rateLimit'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    requireCsrf(request)
  } catch (error) {
    const status = typeof error === 'object' && error && 'status' in error ? Number(error.status) : 403
    const message = error instanceof Error ? error.message : 'Request blocked.'
    return Response.json({ ok: false, error: message }, { status: Number.isFinite(status) ? status : 403 })
  }

  let payload: { email?: unknown; outcome?: unknown }
  try {
    payload = await request.json()
  } catch {
    return Response.json({ ok: false, error: 'Invalid request body.' }, { status: 400 })
  }

  const email = typeof payload.email === 'string' ? payload.email.trim().toLowerCase() : ''
  const identifier = rateLimitIdentifier(request, email)

  if (payload.outcome === 'check') {
    const result = await checkRateLimit(rateLimitPolicies.login, identifier)
    return Response.json({
      ok: result.allowed,
      blocked: result.blocked,
      retryAfterSeconds: result.retryAfterSeconds,
      remaining: result.remaining,
    }, { status: result.allowed ? 200 : 429 })
  }
  if (payload.outcome === 'success') {
    await resetRateLimit(rateLimitPolicies.login, identifier)
    return Response.json({ ok: true })
  }
  if (payload.outcome !== 'failure') {
    return Response.json({ ok: false, error: 'Invalid login attempt outcome.' }, { status: 400 })
  }

  const result = await hitRateLimit(rateLimitPolicies.login, identifier)
  await appendAuditLog({
    action: 'login.failure',
    actor: { name: 'Anonymous', role: 'Guest' },
    collection: 'audit-logs',
    targetId: email || undefined,
    summary: result.blocked ? 'Failed login blocked temporarily.' : 'Failed login attempt.',
    ip: requestIp(request),
  }).catch(() => undefined)
  return Response.json({
    ok: result.allowed,
    blocked: result.blocked,
    remaining: result.remaining,
    retryAfterSeconds: result.retryAfterSeconds,
  }, { status: result.allowed ? 200 : 429 })
}
