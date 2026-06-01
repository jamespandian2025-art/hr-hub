import { createClient } from '@supabase/supabase-js'
import { clearSessionCookieHeader, requestIp, sealSession, sessionCookieHeader } from '@/lib/security/session'
import { normalizeRole } from '@/lib/security/rbac'
import { requireCsrf } from '@/lib/security/requestGuards'
import { appendAuditLog } from '@/lib/hrms/serverStore'
import { enforceRateLimit, rateLimitPolicies } from '@/lib/security/rateLimit'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type SessionPayload = {
  userId?: unknown
  id?: unknown
  email?: unknown
  name?: unknown
  fullName?: unknown
  role?: unknown
  provider?: unknown
  employeeId?: unknown
}

function text(input: unknown, fallback = '') {
  return typeof input === 'string' ? input.trim() : typeof input === 'number' ? String(input) : fallback
}

function jsonError(error: unknown) {
  const status = typeof error === 'object' && error && 'status' in error ? Number(error.status) : 500
  const message = error instanceof Error ? error.message : 'Unexpected server error.'
  return Response.json({ ok: false, error: message }, { status: Number.isFinite(status) ? status : 500 })
}

function bearerToken(request: Request) {
  const authorization = request.headers.get('authorization') || ''
  const match = authorization.match(/^Bearer\s+(.+)$/i)
  return match?.[1] || ''
}

async function verifiedSupabaseSession(request: Request) {
  const token = bearerToken(request)
  if (!token) return null

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!supabaseUrl || !supabaseAnonKey) {
    throw Object.assign(new Error('Supabase auth is not configured.'), { status: 503 })
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
  const { data, error } = await supabase.auth.getUser(token)
  if (error || !data.user) return null

  const metadata = data.user.user_metadata || {}
  const role = normalizeRole(metadata.role || metadata.app_role || metadata.account_role)
  const email = (data.user.email || '').trim().toLowerCase()
  const name = text(metadata.full_name) || text(metadata.name) || email || data.user.id

  return {
    userId: data.user.id,
    email,
    name,
    role,
    provider: 'supabase',
    employeeId: '',
  }
}

function developmentSession(payload: SessionPayload) {
  const role = normalizeRole(payload.role)
  const userId = text(payload.userId) || text(payload.id) || text(payload.employeeId) || text(payload.email)
  const email = text(payload.email).toLowerCase()
  const name = text(payload.fullName) || text(payload.name) || email || userId

  if (!userId) return null

  return {
    userId,
    email,
    name,
    role,
    provider: text(payload.provider),
    employeeId: text(payload.employeeId),
  }
}

export async function POST(request: Request) {
  try {
    requireCsrf(request)
  } catch (error) {
    return jsonError(error)
  }

  let payload: SessionPayload
  try {
    payload = await request.json()
  } catch {
    return Response.json({ ok: false, error: 'Invalid session request.' }, { status: 400 })
  }

  try {
    await enforceRateLimit(request, rateLimitPolicies.sessionCreate, payload.email, payload.userId || payload.id || payload.employeeId)
  } catch (error) {
    return jsonError(error)
  }

  let verified: Awaited<ReturnType<typeof verifiedSupabaseSession>>
  try {
    verified = await verifiedSupabaseSession(request)
  } catch (error) {
    return jsonError(error)
  }
  const session = verified || (process.env.NODE_ENV === 'production' ? null : developmentSession(payload))

  if (!session) {
    return Response.json({ ok: false, error: 'A verified identity is required to create a server session.' }, { status: 401 })
  }

  const cookieValue = await sealSession({
    userId: session.userId,
    email: session.email,
    name: session.name,
    role: session.role,
    provider: session.provider,
    employeeId: session.employeeId,
  })

  await appendAuditLog({
    action: 'login.success',
    actor: { id: session.userId, name: session.name, role: session.role },
    collection: 'audit-logs',
    targetId: session.userId,
    summary: `User logged in as ${session.role}.`,
    ip: requestIp(request),
  }).catch(() => undefined)

  return Response.json(
    { ok: true, user: { userId: session.userId, email: session.email, name: session.name, role: session.role }, ip: requestIp(request) },
    { headers: { 'Set-Cookie': sessionCookieHeader(cookieValue) } },
  )
}

export async function DELETE(request: Request) {
  try {
    requireCsrf(request)
  } catch (error) {
    return jsonError(error)
  }

  return Response.json({ ok: true }, { headers: { 'Set-Cookie': clearSessionCookieHeader() } })
}
