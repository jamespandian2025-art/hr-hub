import {
  actorFromRequest,
  assertCollection,
  assertPermission,
  getVisibleRecord,
  jsonError,
  updateRecord,
} from '@/lib/hrms/serverStore'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type RouteContext = {
  params: Promise<{ collection: string; id: string }>
}

export async function GET(request: Request, context: RouteContext) {
  try {
    const { collection: collectionParam, id } = await context.params
    const collection = assertCollection(collectionParam)
    const actor = actorFromRequest(request)
    assertPermission(actor, collection, 'read')
    const record = await getVisibleRecord(collection, id, actor)
    if (!record) return Response.json({ ok: false, error: 'Record not found.' }, { status: 404 })
    return Response.json({ ok: true, record })
  } catch (error) {
    return jsonError(error)
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { collection: collectionParam, id } = await context.params
    const collection = assertCollection(collectionParam)
    const actor = actorFromRequest(request)
    assertPermission(actor, collection, 'update')
    const payload = await request.json()
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
      return Response.json({ ok: false, error: 'Request body must be an object.' }, { status: 400 })
    }
    const record = await updateRecord(collection, id, payload as Record<string, unknown>, actor)
    if (!record) return Response.json({ ok: false, error: 'Record not found.' }, { status: 404 })
    return Response.json({ ok: true, record })
  } catch (error) {
    return jsonError(error)
  }
}
