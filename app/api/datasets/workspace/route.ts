import {
  actorFromDatasetsRequest,
  assertDatasetsCompanyAccess,
  assertWorkspaceState,
  companyIdFromRequest,
  jsonError,
  readDatasetWorkspace,
  writeDatasetWorkspace,
} from '@/lib/datasets/serverStore'
import { requireCsrf } from '@/lib/security/requestGuards'
import { enforceRateLimit, rateLimitPolicies } from '@/lib/security/rateLimit'
import { appendAuditLog } from '@/lib/hrms/serverStore'
import { requestIp } from '@/lib/security/session'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function auditActor(actor: { userId: string; email?: string; name?: string; role: string }) {
  return {
    id: actor.userId,
    email: actor.email,
    name: actor.name || actor.email || 'System User',
    role: actor.role,
  }
}

export async function GET(request: Request) {
  try {
    const actor = await actorFromDatasetsRequest(request)
    const companyId = companyIdFromRequest(request)
    await assertDatasetsCompanyAccess(actor, companyId)
    const state = await readDatasetWorkspace(companyId)
    return Response.json({ ok: true, state })
  } catch (error) {
    return jsonError(error)
  }
}

export async function PUT(request: Request) {
  try {
    requireCsrf(request)
    const actor = await actorFromDatasetsRequest(request)
    const companyId = companyIdFromRequest(request)
    await assertDatasetsCompanyAccess(actor, companyId)
    await enforceRateLimit(request, rateLimitPolicies.businessMutation, actor.userId, actor.email, companyId, 'datasets-workspace', 'put')
    const state = assertWorkspaceState(await request.json())
    const saved = await writeDatasetWorkspace(companyId, state)
    await appendAuditLog({
      action: 'datasets.workspace.save',
      actor: auditActor(actor),
      collection: 'audit-logs',
      targetId: companyId,
      summary: 'Saved datasets workspace.',
      companyId,
      ip: requestIp(request),
    }).catch(() => undefined)
    return Response.json({ ok: true, state: saved })
  } catch (error) {
    return jsonError(error)
  }
}
