import {
  actorFromRequest,
  assertCollection,
  assertPermission,
  createNotification,
  createRecord,
  jsonError,
  listVisibleRecords,
} from '@/lib/hrms/serverStore'
import { requireCsrf } from '@/lib/security/requestGuards'
import { assertCompanyAccess, resolveCompanyId } from '@/lib/tenant/serverStore'
import { enforceRateLimit, rateLimitPolicies } from '@/lib/security/rateLimit'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type RouteContext = {
  params: Promise<{ collection: string }>
}

export async function GET(request: Request, context: RouteContext) {
  try {
    const { collection: collectionParam } = await context.params
    const collection = assertCollection(collectionParam)
    const actor = await actorFromRequest(request)
    assertPermission(actor, collection, 'read')
    const companyId = await resolveCompanyId(request)
    await assertCompanyAccess({ userId: actor.id || '', email: actor.email, role: actor.role }, companyId)
    const records = await listVisibleRecords(collection, actor, companyId)
    return Response.json({ ok: true, records })
  } catch (error) {
    return jsonError(error)
  }
}

export async function POST(request: Request, context: RouteContext) {
  try {
    requireCsrf(request)
    const { collection: collectionParam } = await context.params
    const collection = assertCollection(collectionParam)
    const actor = await actorFromRequest(request)
    assertPermission(actor, collection, 'create')
    const companyId = await resolveCompanyId(request)
    await assertCompanyAccess({ userId: actor.id || '', email: actor.email, role: actor.role }, companyId)
    await enforceRateLimit(request, rateLimitPolicies.hrMutation, actor.id, actor.email, companyId, collection, 'post')
    const payload = await request.json()
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
      return Response.json({ ok: false, error: 'Request body must be an object.' }, { status: 400 })
    }
    const record = await createRecord(collection, payload as Record<string, unknown>, actor, companyId)
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
      }, actor, companyId)
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
      }, actor, companyId)
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
      }, actor, companyId)
    }
    return Response.json({ ok: true, record }, { status: 201 })
  } catch (error) {
    return jsonError(error)
  }
}
