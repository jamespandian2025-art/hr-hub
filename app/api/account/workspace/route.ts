import { mutateAccountWorkspace, getAccountWorkspaceForActor } from '@/lib/account/serverStore'
import type { AccountMutationAction, AccountWorkspace } from '@/lib/account/types'
import { sendTransactionalEmail } from '@/lib/email/server'
import { appendAuditLog, jsonError } from '@/lib/hrms/serverStore'
import { requireCsrf } from '@/lib/security/requestGuards'
import { enforceRateLimit, rateLimitPolicies } from '@/lib/security/rateLimit'
import { requireVerifiedSession, requestIp } from '@/lib/security/session'
import { resolveCompanyId } from '@/lib/tenant/serverStore'
import { escapeHtml, validateObject } from '@/lib/security/validation'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const actions = new Set<AccountMutationAction>([
  'update-company',
  'update-profile',
  'set-two-factor',
  'revoke-session',
  'create-user',
  'create-guest',
  'create-group',
  'create-office',
  'create-role',
  'update-application',
  'update-customizations',
  'update-system-settings',
])

function auditActor(actor: { userId: string; email?: string; name?: string; role: string }) {
  return {
    id: actor.userId,
    email: actor.email,
    name: actor.name || actor.email || 'System User',
    role: actor.role,
  }
}

function dataRecord(input: unknown) {
  return input && typeof input === 'object' && !Array.isArray(input) ? input as Record<string, unknown> : {}
}

function text(input: unknown, fallback = '', maxLength = 200) {
  const value = typeof input === 'string' ? input.trim() : ''
  return (value || fallback).slice(0, maxLength)
}

function cleanEmail(input: unknown) {
  return text(input, '', 200).toLowerCase()
}

function appOrigin(request: Request) {
  const forwardedHost = request.headers.get('x-forwarded-host')
  const host = forwardedHost || request.headers.get('host') || 'localhost:3000'
  const proto = request.headers.get('x-forwarded-proto') || (host.includes('localhost') ? 'http' : 'https')
  return `${proto}://${host}`
}

type SetupEmailDelivery = {
  sent: boolean
  setupUrl: string
  provider?: string
  warning?: string
}

async function sendUserSetupEmail(request: Request, workspace: AccountWorkspace, payload: Record<string, unknown>, email: string): Promise<SetupEmailDelivery> {
  const user = workspace.users.find(person => person.email === email)
  const name = text(payload.name, user?.name || email.split('@')[0] || 'there', 160)
  const role = text(payload.role, user?.role || 'Member', 100)
  const companyName = text(workspace.company.name, 'WiseFlow', 160)
  const setupUrl = `${appOrigin(request)}/signup?invite=${encodeURIComponent(email)}`
  const subject = `Set up your ${companyName} account`
  const textBody = [
    `Hello ${name},`,
    '',
    `${companyName} created an account for you in WiseFlow.`,
    '',
    `Role: ${role}`,
    `Setup link: ${setupUrl}`,
    '',
    'Use the link above to finish setting up your login. If you were not expecting this invitation, you can ignore this email.',
    '',
    'Thank you,',
    'WiseFlow Account Team',
  ].join('\n')

  const safeName = escapeHtml(name)
  const safeCompany = escapeHtml(companyName)
  const safeRole = escapeHtml(role)
  const safeSetupUrl = escapeHtml(setupUrl)
  const html = `
    <div style="font-family: Arial, sans-serif; color: #0f172a; line-height: 1.5;">
      <h2 style="margin:0 0 12px;">Set up your ${safeCompany} account</h2>
      <p>Hello ${safeName},</p>
      <p>${safeCompany} created an account for you in WiseFlow.</p>
      <div style="border:1px solid #e2e8f0; border-radius:10px; padding:14px; background:#f8fafc;">
        <p><strong>Role:</strong> ${safeRole}</p>
        <p><strong>Setup link:</strong> <a href="${safeSetupUrl}">${safeSetupUrl}</a></p>
      </div>
      <p>Use the link above to finish setting up your login. If you were not expecting this invitation, you can ignore this email.</p>
      <p>Thank you,<br />WiseFlow Account Team</p>
    </div>
  `

  const delivery = await sendTransactionalEmail({
    recipient: email,
    recipientName: name,
    subject,
    text: textBody,
    html,
    fromName: 'WiseFlow Account',
  })

  if (delivery.ok) return { sent: true, provider: delivery.provider, setupUrl }

  return {
    sent: false,
    setupUrl,
    warning: delivery.configurationRequired
      ? `${delivery.error} The user was created and the setup link is ready once email delivery is configured.`
      : `Setup email could not be sent. ${delivery.error}`,
  }
}

export async function GET(request: Request) {
  try {
    const actor = await requireVerifiedSession(request, 'general')
    const companyId = await resolveCompanyId(request)
    const workspace = await getAccountWorkspaceForActor(actor, companyId)
    return Response.json({ ok: true, workspace })
  } catch (error) {
    return jsonError(error)
  }
}

export async function POST(request: Request) {
  try {
    requireCsrf(request)
    const actor = await requireVerifiedSession(request, 'general')
    const companyId = await resolveCompanyId(request)
    await enforceRateLimit(request, rateLimitPolicies.businessMutation, actor.userId, actor.email, companyId, 'account-workspace')

    const body = await request.json().catch(() => ({}))
    const validation = validateObject(body as Record<string, unknown>, {
      action: { required: true, type: 'string', maxLength: 80 },
    })
    if (!validation.ok) return Response.json({ ok: false, error: validation.errors[0] }, { status: 400 })

    const action = String(validation.value.action || '') as AccountMutationAction
    if (!actions.has(action)) {
      return Response.json({ ok: false, error: 'Unknown account action.' }, { status: 400 })
    }

    const data = body && typeof body === 'object' && 'data' in body ? (body as { data?: unknown }).data : {}
    const accountPayload = dataRecord(data)
    if (action === 'create-user') {
      await enforceRateLimit(request, rateLimitPolicies.invitationCreate, actor.userId, actor.email, companyId, cleanEmail(accountPayload.email) || 'unknown-user')
    }

    const workspace = await mutateAccountWorkspace(actor, companyId, action, data)
    const emailDelivery = action === 'create-user'
      ? await sendUserSetupEmail(request, workspace, accountPayload, cleanEmail(accountPayload.email))
      : undefined

    await appendAuditLog({
      action: `account.${action}`,
      actor: auditActor(actor),
      collection: 'audit-logs',
      targetId: workspace.company.id,
      summary: `Updated account workspace via ${action}.`,
      after: {
        action,
        companyId: workspace.company.id,
        ...(emailDelivery ? { setupEmailSent: emailDelivery.sent, setupEmailProvider: emailDelivery.provider || null } : {}),
      },
      companyId: workspace.company.id,
      ip: requestIp(request),
    }).catch(() => undefined)

    return Response.json({ ok: true, workspace, ...(emailDelivery ? { emailDelivery } : {}) })
  } catch (error) {
    return jsonError(error)
  }
}
