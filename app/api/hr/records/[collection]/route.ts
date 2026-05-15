import {
  actorFromRequest,
  assertCollection,
  assertPermission,
  createNotification,
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
    if (collection === 'leave-requests' && String(record.status || '').toLowerCase() !== 'draft') {
      await createNotification({
        id: `notification-leave-${record.id}`,
        targetRole: 'HR',
        audience: ['HR', 'Admin'],
        type: 'Leave request',
        title: `${record.employeeName || 'Employee'} requested ${record.leaveType || 'leave'}`,
        detail: `${record.days || 0} day${Number(record.days || 0) === 1 ? '' : 's'} needs HR review`,
        relatedCollection: 'leave-requests',
        relatedId: record.id,
        employeeId: record.employeeId,
        status: 'Unread',
      }, actor)
    }
    if (collection === 'loan-requests' && String(record.status || '').toLowerCase() !== 'draft') {
      await createNotification({
        id: `notification-loan-${record.id}`,
        targetRole: 'Finance',
        audience: ['Finance', 'Admin'],
        type: 'Loan request',
        title: `${record.employeeName || 'Employee'} requested ${record.customLoanType || record.requestType || 'loan'}`,
        detail: `PHP ${Number(record.amount || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} needs Finance review`,
        relatedCollection: 'loan-requests',
        relatedId: record.id,
        employeeId: record.employeeId,
        status: 'Unread',
      }, actor)
    }
    if (collection === 'allowance-requests' && String(record.status || '').toLowerCase() !== 'draft') {
      await createNotification({
        id: `notification-allowance-${record.id}`,
        targetRole: 'Finance',
        audience: ['Finance', 'Admin'],
        type: 'Allowance request',
        title: `${record.employeeName || 'Employee'} requested ${record.customType || record.type || 'allowance'}`,
        detail: `PHP ${Number(record.amount || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} needs Finance review`,
        relatedCollection: 'allowance-requests',
        relatedId: record.id,
        employeeId: record.employeeId,
        status: 'Unread',
      }, actor)
    }
    return Response.json({ ok: true, record }, { status: 201 })
  } catch (error) {
    return jsonError(error)
  }
}
