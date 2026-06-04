import { getRfqResponseView, submitQuotation } from '@/lib/procurement/server'
import { enforceRateLimit, rateLimitPolicies } from '@/lib/security/rateLimit'
import { jsonError } from '@/lib/hrms/serverStore'
import { requestIp } from '@/lib/security/session'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// PUBLIC endpoint: suppliers responding to an RFQ are not WiseFlow users.
// There is no session/CSRF here — the signed token in the URL/body is the only
// capability, and it scopes everything to one (company, rfq, supplier). All
// reads are limited to that RFQ; writes are validated and rate-limited.

export async function GET(request: Request) {
  try {
    const token = new URL(request.url).searchParams.get('token') || ''
    const view = await getRfqResponseView(token)
    return Response.json({ ok: true, view })
  } catch (error) {
    return jsonError(error)
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({})) as Record<string, unknown>
    const token = typeof body.token === 'string' ? body.token : ''
    await enforceRateLimit(request, rateLimitPolicies.businessMutation, requestIp(request) || 'anon', token.slice(0, 24), 'rfq-response')
    const result = await submitQuotation(token, body)
    return Response.json(result)
  } catch (error) {
    return jsonError(error)
  }
}
