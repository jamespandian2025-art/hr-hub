import { bootstrapCompanyForActor } from '@/lib/tenant/serverStore'
import { requireVerifiedSession } from '@/lib/security/session'
import { requireCsrf } from '@/lib/security/requestGuards'
import { validateObject } from '@/lib/security/validation'
import { enforceRateLimit, rateLimitPolicies } from '@/lib/security/rateLimit'
import { appendAuditLog } from '@/lib/hrms/serverStore'
import { requestIp } from '@/lib/security/session'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function jsonError(error: unknown) {
  const status = typeof error === 'object' && error && 'status' in error ? Number(error.status) : 500
  const message = error instanceof Error ? error.message : 'Unexpected server error.'
  return Response.json({ ok: false, error: message }, { status: Number.isFinite(status) ? status : 500 })
}

export async function POST(request: Request) {
  try {
    requireCsrf(request)
    const actor = await requireVerifiedSession(request)
    await enforceRateLimit(request, rateLimitPolicies.tenantBootstrap, actor.userId, actor.email)
    const payload = await request.json().catch(() => ({}))
    const validation = validateObject(payload as Record<string, unknown>, {
      companyName: { type: 'string', maxLength: 180 },
      companyId: { type: 'string', maxLength: 120 },
      companyType: { type: 'string', maxLength: 120 },
    })
    if (!validation.ok) {
      return Response.json({ ok: false, error: validation.errors[0] }, { status: 400 })
    }

    const company = await bootstrapCompanyForActor(actor, validation.value)
    await appendAuditLog({
      action: 'company.bootstrap',
      actor: { id: actor.userId, email: actor.email, name: actor.name || actor.email || 'System User', role: actor.role },
      collection: 'audit-logs',
      targetId: company.id,
      summary: `Bootstrapped company workspace ${company.name}.`,
      after: company,
      companyId: company.id,
      ip: requestIp(request),
    }).catch(() => undefined)
    return Response.json({ ok: true, company })
  } catch (error) {
    return jsonError(error)
  }
}
