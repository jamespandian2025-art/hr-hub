import {
  actorFromRequest,
  assertCollection,
  assertPermission,
  getVisibleRecord,
  jsonError,
  deleteRecord,
  updateRecord,
} from '@/lib/hrms/serverStore'
import { requireCsrf } from '@/lib/security/requestGuards'
import { assertCompanyAccess, companyIdFromRequest } from '@/lib/tenant/serverStore'
import { enforceRateLimit, rateLimitPolicies } from '@/lib/security/rateLimit'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type RouteContext = {
  params: Promise<{ collection: string; id: string }>
}

export async function GET(request: Request, context: RouteContext) {
  try {
    const { collection: collectionParam, id } = await context.params
    const collection = assertCollection(collectionParam)
    const actor = await actorFromRequest(request)
    assertPermission(actor, collection, 'read')
    const companyId = companyIdFromRequest(request)
    await assertCompanyAccess({ userId: actor.id || '', email: actor.email, role: actor.role }, companyId)
    const record = await getVisibleRecord(collection, id, actor, companyId)
    if (!record) return Response.json({ ok: false, error: 'Record not found.' }, { status: 404 })
    return Response.json({ ok: true, record })
  } catch (error) {
    return jsonError(error)
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    requireCsrf(request)
    const { collection: collectionParam, id } = await context.params
    const collection = assertCollection(collectionParam)
    const actor = await actorFromRequest(request)
    assertPermission(actor, collection, 'update')
    const companyId = companyIdFromRequest(request)
    await assertCompanyAccess({ userId: actor.id || '', email: actor.email, role: actor.role }, companyId)
    await enforceRateLimit(request, rateLimitPolicies.hrMutation, actor.id, actor.email, companyId, collection, 'patch')
    const payload = await request.json()
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
      return Response.json({ ok: false, error: 'Request body must be an object.' }, { status: 400 })
    }
    const record = await updateRecord(collection, id, payload as Record<string, unknown>, actor, companyId)
    if (!record) return Response.json({ ok: false, error: 'Record not found.' }, { status: 404 })
    return Response.json({ ok: true, record })
  } catch (error) {
    return jsonError(error)
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  try {
    requireCsrf(request)
    const { collection: collectionParam, id } = await context.params
    const collection = assertCollection(collectionParam)
    const actor = await actorFromRequest(request)
    assertPermission(actor, collection, 'delete')
    const companyId = companyIdFromRequest(request)
    await assertCompanyAccess({ userId: actor.id || '', email: actor.email, role: actor.role }, companyId)
    await enforceRateLimit(request, rateLimitPolicies.hrMutation, actor.id, actor.email, companyId, collection, 'delete')
    const confirmation = new URL(request.url).searchParams.get('confirm') || request.headers.get('x-wiseflow-confirm-delete') || ''
    if (confirmation !== `DELETE ${id}`) {
      return Response.json({ ok: false, error: `Type DELETE ${id} to confirm this deletion.` }, { status: 400 })
    }
    const deleted = await deleteRecord(collection, id, actor, companyId)
    return Response.json({ ok: true, deleted })
  } catch (error) {
    return jsonError(error)
  }
}
