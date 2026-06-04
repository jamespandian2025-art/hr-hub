import { publishRfqForSuppliers, type PublishedRfqItem } from '@/lib/procurement/server'
import { sendTransactionalEmail } from '@/lib/email/server'
import { appendAuditLog, jsonError } from '@/lib/hrms/serverStore'
import { requireCsrf } from '@/lib/security/requestGuards'
import { enforceRateLimit, rateLimitPolicies } from '@/lib/security/rateLimit'
import { requireVerifiedSession, requestIp } from '@/lib/security/session'
import { resolveCompanyId } from '@/lib/tenant/serverStore'
import { assertCompanyAccess } from '@/lib/tenant/serverStore'
import { escapeHtml } from '@/lib/security/validation'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function str(input: unknown, fallback = '', max = 500) {
  const value = typeof input === 'string' ? input.trim() : typeof input === 'number' ? String(input) : ''
  return (value || fallback).slice(0, max)
}

function num(input: unknown) {
  const value = typeof input === 'number' ? input : Number(input)
  return Number.isFinite(value) ? value : 0
}

function appOrigin(request: Request) {
  const host = request.headers.get('x-forwarded-host') || request.headers.get('host') || 'localhost:3000'
  const proto = request.headers.get('x-forwarded-proto') || (host.includes('localhost') ? 'http' : 'https')
  return `${proto}://${host}`
}

function items(input: unknown): PublishedRfqItem[] {
  return (Array.isArray(input) ? input : []).slice(0, 200).map((raw, index) => {
    const item = raw && typeof raw === 'object' ? raw as Record<string, unknown> : {}
    return {
      id: str(item.id, `item-${index + 1}`, 120),
      name: str(item.name, `Item ${index + 1}`, 200),
      quantity: num(item.quantity),
      unit: str(item.unit, '', 40),
      details: str(item.details, '', 300),
    }
  })
}

export async function POST(request: Request) {
  try {
    requireCsrf(request)
    const actor = await requireVerifiedSession(request, 'general')
    const companyId = await resolveCompanyId(request)
    await assertCompanyAccess(actor, companyId)
    await enforceRateLimit(request, rateLimitPolicies.businessMutation, actor.userId, actor.email, companyId, 'rfq-publish')

    const body = await request.json().catch(() => ({})) as Record<string, unknown>
    const rfq = body.rfq && typeof body.rfq === 'object' ? body.rfq as Record<string, unknown> : {}
    const rfqId = str(rfq.id, '', 120)
    if (!rfqId) return Response.json({ ok: false, error: 'Missing RFQ id.' }, { status: 400 })

    const suppliers = (Array.isArray(body.suppliers) ? body.suppliers : []).slice(0, 100).map(raw => {
      const supplier = raw && typeof raw === 'object' ? raw as Record<string, unknown> : {}
      return { supplierId: str(supplier.supplierId, '', 120), name: str(supplier.name, 'Supplier', 200), email: str(supplier.email, '', 200).toLowerCase() }
    }).filter(supplier => supplier.supplierId)

    const { links } = await publishRfqForSuppliers({
      companyId,
      rfqId,
      rfqNumber: str(rfq.rfqNumber, rfqId, 60),
      title: str(rfq.title, 'Request for Quotation', 200),
      currency: str(rfq.currency, 'PHP', 20),
      closingDate: str(rfq.closingDate, '', 40),
      status: str(rfq.status, 'Open', 40),
      items: items(rfq.items),
      suppliers,
      appOrigin: appOrigin(request),
    })

    const companyName = str(body.companyName, 'WiseFlow', 160)
    const rfqTitle = str(rfq.title, 'Request for Quotation', 200)
    const closingDate = str(rfq.closingDate, '', 40)

    const emailResults = await Promise.all(links.map(async link => {
      if (!link.email) return { supplierId: link.supplierId, name: link.name, sent: false, reason: 'No email on file for this supplier.', url: link.url }
      const subject = `Request for Quotation: ${rfqTitle}`
      const textBody = [
        `Hello ${link.name},`,
        '',
        `${companyName} invites you to submit a quotation for "${rfqTitle}".`,
        closingDate ? `Closing date: ${closingDate}` : '',
        '',
        `Submit your prices here: ${link.url}`,
        '',
        'Open the link, enter your unit prices, and submit. No account is needed.',
        '',
        'Thank you,',
        `${companyName} Procurement`,
      ].filter(Boolean).join('\n')
      const html = `
        <div style="font-family: Arial, sans-serif; color: #0f172a; line-height: 1.5;">
          <h2 style="margin:0 0 12px;">Request for Quotation</h2>
          <p>Hello ${escapeHtml(link.name)},</p>
          <p>${escapeHtml(companyName)} invites you to submit a quotation for <strong>${escapeHtml(rfqTitle)}</strong>.</p>
          ${closingDate ? `<p><strong>Closing date:</strong> ${escapeHtml(closingDate)}</p>` : ''}
          <p style="margin:20px 0;"><a href="${escapeHtml(link.url)}" style="background:#16a34a;color:#fff;padding:11px 18px;border-radius:8px;text-decoration:none;font-weight:700;">Submit your quotation</a></p>
          <p style="color:#475569;font-size:13px;">Or paste this link into your browser:<br />${escapeHtml(link.url)}</p>
          <p>No account is needed — enter your unit prices and submit.</p>
          <p>Thank you,<br />${escapeHtml(companyName)} Procurement</p>
        </div>`
      const delivery = await sendTransactionalEmail({ recipient: link.email, recipientName: link.name, subject, text: textBody, html, fromName: `${companyName} Procurement` })
      return { supplierId: link.supplierId, name: link.name, email: link.email, sent: delivery.ok, provider: delivery.ok ? delivery.provider : undefined, reason: delivery.ok ? undefined : delivery.error, url: delivery.ok ? undefined : link.url }
    }))

    await appendAuditLog({
      action: 'procurement.rfq.published',
      actor: { id: actor.userId, email: actor.email, name: actor.name || actor.email || 'System User', role: actor.role },
      collection: 'audit-logs',
      targetId: rfqId,
      summary: `Published RFQ ${str(rfq.rfqNumber, rfqId, 60)} to ${suppliers.length} supplier(s).`,
      after: { rfqId, suppliers: suppliers.length, emailsSent: emailResults.filter(r => r.sent).length },
      companyId,
      ip: requestIp(request),
    }).catch(() => undefined)

    return Response.json({ ok: true, invited: suppliers.length, emailResults })
  } catch (error) {
    return jsonError(error)
  }
}
