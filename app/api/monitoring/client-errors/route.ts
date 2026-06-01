import { appendAuditLog, jsonError } from '@/lib/hrms/serverStore'
import { requireCsrf } from '@/lib/security/requestGuards'
import { enforceRateLimit, rateLimitPolicies } from '@/lib/security/rateLimit'
import { requestIp, sessionFromRequest } from '@/lib/security/session'
import { companyIdFromRequest } from '@/lib/tenant/serverStore'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type MonitoringPayload = {
  type?: unknown
  message?: unknown
  path?: unknown
  url?: unknown
  status?: unknown
  method?: unknown
  stack?: unknown
}

function text(value: unknown, maxLength: number) {
  return typeof value === 'string' ? value.replace(/\s+/g, ' ').trim().slice(0, maxLength) : ''
}

export async function POST(request: Request) {
  try {
    requireCsrf(request)
    const session = await sessionFromRequest(request)
    const companyId = companyIdFromRequest(request)
    await enforceRateLimit(request, rateLimitPolicies.monitoringEvent, session?.userId || 'anonymous', companyId)
    const payload = await request.json().catch(() => null) as MonitoringPayload | null
    if (!payload || typeof payload !== 'object') {
      return Response.json({ ok: false, error: 'Invalid monitoring event.' }, { status: 400 })
    }

    await appendAuditLog({
      action: `monitoring.${text(payload.type, 80) || 'client-event'}`,
      actor: {
        id: session?.userId,
        email: session?.email,
        name: session?.name || session?.email || 'Browser Client',
        role: session?.role || 'Guest',
      },
      collection: 'audit-logs',
      targetId: text(payload.path, 180) || text(payload.url, 180) || undefined,
      summary: text(payload.message, 240) || 'Client monitoring event captured.',
      after: {
        type: text(payload.type, 80),
        message: text(payload.message, 500),
        path: text(payload.path, 240),
        url: text(payload.url, 300),
        status: typeof payload.status === 'number' ? payload.status : undefined,
        method: text(payload.method, 20),
        stack: text(payload.stack, 1200),
      },
      companyId,
      ip: requestIp(request),
    }).catch(() => undefined)

    return Response.json({ ok: true })
  } catch (error) {
    return jsonError(error)
  }
}
