import {
  actorFromBusinessRequest,
  assertBusinessCompanyAccess,
  assertBusinessPayload,
  companyIdFromRequest,
  deleteBusinessRecord,
  getBusinessRecord,
  jsonError,
  upsertBusinessRecord,
} from '@/lib/business/serverStore'
import { assertBusinessCollection } from '@/lib/business/collections'
import { requireCsrf } from '@/lib/security/requestGuards'
import { enforceRateLimit, rateLimitPolicies } from '@/lib/security/rateLimit'
import { appendAuditLog } from '@/lib/hrms/serverStore'
import { requestIp } from '@/lib/security/session'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type RouteContext = {
  params: Promise<{ collection: string; id: string }>
}

function auditActor(actor: { userId: string; email?: string; name?: string; role: string }) {
  return {
    id: actor.userId,
    email: actor.email,
    name: actor.name || actor.email || 'System User',
    role: actor.role,
  }
}

export async function GET(request: Request, context: RouteContext) {
  try {
    const { collection: collectionParam, id } = await context.params
    const collection = assertBusinessCollection(collectionParam)
    const actor = await actorFromBusinessRequest(request, collection)
    const companyId = companyIdFromRequest(request)
    await assertBusinessCompanyAccess(actor, companyId)
    const record = await getBusinessRecord(collection, companyId, id)
    if (!record) return Response.json({ ok: false, error: 'Record not found.' }, { status: 404 })
    return Response.json({ ok: true, record: record.payload })
  } catch (error) {
    return jsonError(error)
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    requireCsrf(request)
    const { collection: collectionParam, id } = await context.params
    const collection = assertBusinessCollection(collectionParam)
    const actor = await actorFromBusinessRequest(request, collection)
    const companyId = companyIdFromRequest(request)
    await assertBusinessCompanyAccess(actor, companyId)
    await enforceRateLimit(request, rateLimitPolicies.businessMutation, actor.userId, actor.email, companyId, collection, 'patch')
    const before = await getBusinessRecord(collection, companyId, id)
    if (!before) return Response.json({ ok: false, error: 'Record not found.' }, { status: 404 })
    const patch = assertBusinessPayload(await request.json())
    const record = await upsertBusinessRecord(collection, companyId, { ...before.payload, ...patch, id })
    await appendAuditLog({
      action: `business.${collection}.update`,
      actor: auditActor(actor),
      collection: 'audit-logs',
      targetId: id,
      summary: `Updated ${collection} business record.`,
      before: before.payload,
      after: record.payload,
      companyId,
      ip: requestIp(request),
    }).catch(() => undefined)
    return Response.json({ ok: true, record: record.payload })
  } catch (error) {
    return jsonError(error)
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  try {
    requireCsrf(request)
    const { collection: collectionParam, id } = await context.params
    const collection = assertBusinessCollection(collectionParam)
    const actor = await actorFromBusinessRequest(request, collection)
    const companyId = companyIdFromRequest(request)
    await assertBusinessCompanyAccess(actor, companyId)
    await enforceRateLimit(request, rateLimitPolicies.businessMutation, actor.userId, actor.email, companyId, collection, 'delete')
    const confirmation = new URL(request.url).searchParams.get('confirm') || request.headers.get('x-wiseflow-confirm-delete') || ''
    if (confirmation !== `DELETE ${id}`) {
      return Response.json({ ok: false, error: `Type DELETE ${id} to confirm this deletion.` }, { status: 400 })
    }
    const before = await getBusinessRecord(collection, companyId, id)
    const deleted = await deleteBusinessRecord(collection, companyId, id)
    if (deleted) {
      await appendAuditLog({
        action: `business.${collection}.delete`,
        actor: auditActor(actor),
        collection: 'audit-logs',
        targetId: id,
        summary: `Deleted ${collection} business record.`,
        before: before?.payload,
        companyId,
        ip: requestIp(request),
      }).catch(() => undefined)
    }
    return Response.json({ ok: true, deleted })
  } catch (error) {
    return jsonError(error)
  }
}
