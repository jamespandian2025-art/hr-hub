import { canAccessArea, type PermissionArea, normalizeRole } from './rbac'
import { constantTimeEqual } from './constantTime'

export const authCookieName = 'wiseflow_session'

export type ServerSession = {
  userId: string
  email?: string
  name?: string
  role: string
  provider?: string
  employeeId?: string
  companyId?: string
  issuedAt: number
}

const maxAgeSeconds = 60 * 60 * 12

function authSecret() {
  const secret = process.env.AUTH_SESSION_SECRET || process.env.NEXTAUTH_SECRET || process.env.SUPABASE_JWT_SECRET
  if (!secret && process.env.NODE_ENV === 'production') {
    throw new Error('AUTH_SESSION_SECRET, NEXTAUTH_SECRET, or SUPABASE_JWT_SECRET must be configured in production.')
  }
  return secret || 'dev-only-change-me'
}

function bytesToBase64Url(bytes: Uint8Array) {
  let binary = ''
  bytes.forEach(byte => { binary += String.fromCharCode(byte) })
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
}

function base64UrlToBytes(value: string) {
  const base64 = value.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(value.length / 4) * 4, '=')
  const binary = atob(base64)
  return Uint8Array.from(binary, char => char.charCodeAt(0))
}

async function hmac(input: string) {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(authSecret()),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(input))
  return bytesToBase64Url(new Uint8Array(signature))
}

export async function sealSession(input: Omit<ServerSession, 'issuedAt'> & { issuedAt?: number }) {
  const session: ServerSession = {
    ...input,
    userId: String(input.userId || input.employeeId || input.email || ''),
    role: normalizeRole(input.role),
    issuedAt: input.issuedAt || Date.now(),
  }
  const payload = bytesToBase64Url(new TextEncoder().encode(JSON.stringify(session)))
  return `${payload}.${await hmac(payload)}`
}

export async function openSession(cookieValue?: string | null) {
  if (!cookieValue || !cookieValue.includes('.')) return null
  const [payload, signature] = cookieValue.split('.', 2)
  if (!payload || !signature) return null
  const expected = await hmac(payload)
  if (!constantTimeEqual(signature, expected)) return null

  try {
    const session = JSON.parse(new TextDecoder().decode(base64UrlToBytes(payload))) as ServerSession
    if (!session.userId || !session.role || Date.now() - Number(session.issuedAt || 0) > maxAgeSeconds * 1000) return null
    return { ...session, role: normalizeRole(session.role) }
  } catch {
    return null
  }
}

export function sessionCookieHeader(value: string) {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : ''
  return `${authCookieName}=${value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAgeSeconds}${secure}`
}

export function clearSessionCookieHeader() {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : ''
  return `${authCookieName}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure}`
}

export function requestIp(request: Request) {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || request.headers.get('x-real-ip')
    || undefined
}

export async function sessionFromRequest(request: Request) {
  const requestUrl = new URL(request.url)
  if (requestUrl.hostname === '127.0.0.1' || requestUrl.hostname === 'localhost') {
    const qaSession = request.headers.get('x-wiseflow-qa-session')?.trim()
    if (qaSession) return openSession(qaSession)
  }

  const cookieHeader = request.headers.get('cookie') || ''
  const cookie = cookieHeader
    .split(';')
    .map(part => part.trim())
    .find(part => part.startsWith(`${authCookieName}=`))
    ?.slice(authCookieName.length + 1)
  return openSession(cookie)
}

export async function requireSession(request: Request, area?: PermissionArea) {
  const session = await sessionFromRequest(request)
  if (!session) throw Object.assign(new Error('Authentication required.'), { status: 401 })
  if (area && !canAccessArea(session.role, area)) {
    throw Object.assign(new Error('You are not allowed to access this resource.'), { status: 403 })
  }
  return session
}

export async function requireVerifiedSession(request: Request, area?: PermissionArea) {
  return requireSession(request, area)
}
