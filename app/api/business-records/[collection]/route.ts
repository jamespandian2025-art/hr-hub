import {
  actorFromBusinessRequest,
  assertBusinessCompanyAccess,
  assertBusinessPayload,
  companyIdFromRequest,
  jsonError,
  listBusinessRecords,
  replaceBusinessRecords,
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
  params: Promise<{ collection: string }>
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
    const { collection: collectionParam } = await context.params
    const collection = assertBusinessCollection(collectionParam)
    const actor = await actorFromBusinessRequest(request, collection)
    const companyId = companyIdFromRequest(request)
    await assertBusinessCompanyAccess(actor, companyId)
    const records = await listBusinessRecords(collection, companyId)
    return Response.json({ ok: true, records: records.map(record => record.payload) })
  } catch (error) {
    return jsonError(error)
  }
}

export async function POST(request: Request, context: RouteContext) {
  try {
    requireCsrf(request)
    const { collection: collectionParam } = await context.params
    const collection = assertBusinessCollection(collectionParam)
    const actor = await actorFromBusinessRequest(request, collection)
    const companyId = companyIdFromRequest(request)
    await assertBusinessCompanyAccess(actor, companyId)
    await enforceRateLimit(request, rateLimitPolicies.businessMutation, actor.userId, actor.email, companyId, collection, 'post')
    const payload = assertBusinessPayload(await request.json())
    const record = await upsertBusinessRecord(collection, companyId, payload)
    await appendAuditLog({
      action: `business.${collection}.create`,
      actor: auditActor(actor),
      collection: 'audit-logs',
      targetId: record.id,
      summary: `Created ${collection} business record.`,
      after: record.payload,
      companyId,
      ip: requestIp(request),
    }).catch(() => undefined)
    return Response.json({ ok: true, record: record.payload }, { status: 201 })
  } catch (error) {
    return jsonError(error)
  }
}

export async function PUT(request: Request, context: RouteContext) {
  try {
    requireCsrf(request)
    const { collection: collectionParam } = await context.params
    const collection = assertBusinessCollection(collectionParam)
    const actor = await actorFromBusinessRequest(request, collection)
    const companyId = companyIdFromRequest(request)
    await assertBusinessCompanyAccess(actor, companyId)
    await enforceRateLimit(request, rateLimitPolicies.businessMutation, actor.userId, actor.email, companyId, collection, 'put')
    const payload = await request.json()
    const records = Array.isArray(payload)
      ? payload
      : payload && typeof payload === 'object' && Array.isArray(payload.records)
        ? payload.records
        : null
    if (!records) {
      return Response.json({ ok: false, error: 'Request body must be an array or { records: [] }.' }, { status: 400 })
    }
    const replaced = await replaceBusinessRecords(collection, companyId, records.map(assertBusinessPayload))
    await appendAuditLog({
      action: `business.${collection}.replace`,
      actor: auditActor(actor),
      collection: 'audit-logs',
      targetId: collection,
      summary: `Replaced ${collection} business collection with ${replaced.length} records.`,
      after: { count: replaced.length, ids: replaced.slice(0, 50).map(record => record.id) },
      companyId,
      ip: requestIp(request),
    }).catch(() => undefined)
    return Response.json({ ok: true, records: replaced.map(record => record.payload) })
  } catch (error) {
    return jsonError(error)
  }
}
