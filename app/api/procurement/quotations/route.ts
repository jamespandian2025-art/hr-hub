import { listProcurementNotifications, listQuotations } from '@/lib/procurement/server'
import { jsonError } from '@/lib/hrms/serverStore'
import { requireVerifiedSession } from '@/lib/security/session'
import { resolveCompanyId, assertCompanyAccess } from '@/lib/tenant/serverStore'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const actor = await requireVerifiedSession(request, 'general')
    const companyId = await resolveCompanyId(request)
    await assertCompanyAccess(actor, companyId)
    const rfqId = new URL(request.url).searchParams.get('rfqId') || undefined
    const [quotations, notifications] = await Promise.all([
      listQuotations(companyId, rfqId),
      listProcurementNotifications(companyId),
    ])
    return Response.json({ ok: true, quotations, notifications })
  } catch (error) {
    return jsonError(error)
  }
}
