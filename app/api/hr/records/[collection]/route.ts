import {
  actorFromRequest,
  assertCollection,
  assertPermission,
  createRecord,
  jsonError,
  listVisibleRecords,
} from '@/lib/hrms/serverStore'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type RouteContext = {
  params: Promise<{ collection: string }>
}

export async function GET(request: Request, context: RouteContext) {
  try {
    const { collection: collectionParam } = await context.params
    const collection = assertCollection(collectionParam)
    const actor = actorFromRequest(request)
    assertPermission(actor, collection, 'read')
    const records = await listVisibleRecords(collection, actor)
    return Response.json({ ok: true, records })
  } catch (error) {
    return jsonError(error)
  }
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const { collection: collectionParam } = await context.params
    const collection = assertCollection(collectionParam)
    const actor = actorFromRequest(request)
    assertPermission(actor, collection, 'create')
    const payload = await request.json()
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
      return Response.json({ ok: false, error: 'Request body must be an object.' }, { status: 400 })
    }
    const record = await createRecord(collection, payload as Record<string, unknown>, actor)
    return Response.json({ ok: true, record }, { status: 201 })
  } catch (error) {
    return jsonError(error)
  }
}
