import { createClient } from '@supabase/supabase-js'
import { appendAuditLog, jsonError } from '@/lib/hrms/serverStore'
import { requireSession, requestIp } from '@/lib/security/session'
import { requireCsrf } from '@/lib/security/requestGuards'
import { validateObject } from '@/lib/security/validation'
import { assertCompanyAccess, companyIdFromRequest } from '@/lib/tenant/serverStore'
import { enforceRateLimit, rateLimitPolicies } from '@/lib/security/rateLimit'

type InvitePayload = {
  email?: unknown
  role?: unknown
  invitedBy?: unknown
}

const allowedRoles = new Set([
  'Admin',
  'HR',
  'Finance',
  'Employee',
  'Team Manager',
  'Project Manager',
  'Support',
  'Client',
  'Member',
  'Sales',
  'Warehouse',
  'Procurement',
])

const allPermissions = [
  'dashboard',
  'clients',
  'sales',
  'projects',
  'financials',
  'hr',
  'procurement',
  'warehouse',
  'workflows',
  'datasets',
  'documents',
  'reports',
  'settings',
  'members',
]

function rolePermissions(role: string) {
  if (role === 'Admin' || role === 'Owner') return allPermissions
  if (role === 'Finance') return ['dashboard', 'clients', 'sales', 'financials', 'reports']
  if (role === 'HR') return ['dashboard', 'hr', 'workflows', 'settings']
  if (role === 'Project Manager') return ['dashboard', 'clients', 'projects', 'workflows', 'documents']
  if (role === 'Sales') return ['dashboard', 'clients', 'sales', 'workflows']
  if (role === 'Warehouse') return ['dashboard', 'warehouse', 'procurement']
  if (role === 'Procurement') return ['dashboard', 'procurement', 'warehouse']
  return ['dashboard']
}

function value(input: unknown) {
  return typeof input === 'string' ? input.trim() : ''
}

function isEmail(input: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input)
}

function appOrigin(request: Request) {
  const configured = process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_PROJECT_PRODUCTION_URL
  if (configured) return configured.startsWith('http') ? configured : `https://${configured}`

  const origin = request.headers.get('origin')
  if (origin) return origin

  const host = request.headers.get('host')
  return host ? `https://${host}` : ''
}

export async function POST(request: Request) {
  try {
    requireCsrf(request)
  } catch (error) {
    return jsonError(error)
  }

  const session = await requireSession(request, 'admin').catch(error => error)
  if (session instanceof Error) return jsonError(session)
  let companyId = ''
  try {
    companyId = companyIdFromRequest(request)
  } catch (error) {
    return jsonError(error)
  }
  const membership = await assertCompanyAccess(session, companyId).catch(error => error)
  if (membership instanceof Error) return jsonError(membership)
  let payload: InvitePayload

  try {
    payload = await request.json()
  } catch {
    return Response.json({ ok: false, error: 'Invalid request body.' }, { status: 400 })
  }

  const validation = validateObject(payload as Record<string, unknown>, {
    email: { required: true, type: 'string', maxLength: 200 },
    role: { required: true, type: 'string', maxLength: 80 },
    invitedBy: { type: 'string', maxLength: 160 },
  })
  if (!validation.ok) return Response.json({ ok: false, error: validation.errors[0] }, { status: 400 })

  const email = value(validation.value.email).toLowerCase()
  const role = value(validation.value.role) || 'Member'
  const invitedBy = value(validation.value.invitedBy) || session.name || 'HR HUB Admin'

  if (!isEmail(email)) {
    return Response.json({ ok: false, error: 'Enter a valid invitation email.' }, { status: 400 })
  }

  if (!allowedRoles.has(role)) {
    return Response.json({ ok: false, error: 'Choose a valid role for this invitation.' }, { status: 400 })
  }

  try {
    await enforceRateLimit(request, rateLimitPolicies.invitationCreate, session.userId, session.email, companyId, role)
  } catch (error) {
    return jsonError(error)
  }

  const acceptUrl = `${appOrigin(request)}/signup?invite=${encodeURIComponent(email)}`
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    await appendAuditLog({
      action: 'role.invitation.create',
      actor: { id: session.userId, name: session.name || session.email || invitedBy, role: session.role },
      collection: 'audit-logs',
      targetId: email,
      summary: `Created local invitation for ${email} as ${role}.`,
      after: { email, role, invitedBy, emailSent: false },
      companyId,
      ip: requestIp(request),
    }).catch(() => undefined)

    return Response.json({
      ok: true,
      emailSent: false,
      acceptUrl,
      warning: 'Email delivery is not configured, so the local invitation was saved without sending email.',
    }, { status: 200 })
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })

  const { error: memberError } = await supabase
    .from('company_members')
    .upsert({
      company_id: companyId,
      user_id: null,
      email,
      role,
      permissions: rolePermissions(role),
      status: 'Pending',
      invited_at: new Date().toISOString(),
      joined_at: null,
    }, { onConflict: 'company_id,email' })

  if (memberError) {
    return Response.json({ ok: false, error: memberError.message || 'Supabase could not save the company invitation.' }, { status: 500 })
  }

  const { error } = await supabase.auth.admin.inviteUserByEmail(email, {
    redirectTo: acceptUrl,
    data: {
      role,
      invitedBy,
      invitedAt: new Date().toISOString(),
    },
  })

  if (error) {
    return Response.json({ ok: false, error: error.message || 'Supabase could not send the invitation email.' }, { status: 200 })
  }

  await appendAuditLog({
    action: 'role.invitation.create',
    actor: { id: session.userId, name: session.name || session.email || invitedBy, role: session.role },
    collection: 'audit-logs',
    targetId: email,
    summary: `Invited ${email} as ${role}.`,
    after: { email, role, invitedBy },
    companyId,
    ip: requestIp(request),
  })

  return Response.json({ ok: true, emailSent: true, acceptUrl })
}
