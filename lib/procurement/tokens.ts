import 'server-only'

import { constantTimeEqual } from '@/lib/security/constantTime'

// A supplier RFQ-response link carries no session — the signed token IS the
// capability. It identifies exactly one (company, rfq, supplier) and expires.
// HMAC-signed (same secret strategy as the auth session) so it can be validated
// without a database lookup; tampering or expiry is rejected.
export type RfqResponseToken = {
  companyId: string
  rfqId: string
  supplierId: string
  supplierName: string
  issuedAt: number
  expiresAt: number
}

function tokenSecret() {
  const secret = process.env.AUTH_SESSION_SECRET || process.env.NEXTAUTH_SECRET || process.env.SUPABASE_JWT_SECRET
  if (!secret && process.env.NODE_ENV === 'production') {
    throw new Error('AUTH_SESSION_SECRET (or NEXTAUTH_SECRET / SUPABASE_JWT_SECRET) must be configured in production.')
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
    new TextEncoder().encode(tokenSecret()),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(input))
  return bytesToBase64Url(new Uint8Array(signature))
}

export async function sealRfqResponseToken(input: Omit<RfqResponseToken, 'issuedAt' | 'expiresAt'> & { ttlMs?: number }) {
  const now = Date.now()
  const token: RfqResponseToken = {
    companyId: input.companyId,
    rfqId: input.rfqId,
    supplierId: input.supplierId,
    supplierName: input.supplierName,
    issuedAt: now,
    expiresAt: now + (input.ttlMs ?? 1000 * 60 * 60 * 24 * 45),
  }
  const payload = bytesToBase64Url(new TextEncoder().encode(JSON.stringify(token)))
  return `${payload}.${await hmac(payload)}`
}

export async function openRfqResponseToken(value?: string | null): Promise<RfqResponseToken | null> {
  if (!value || !value.includes('.')) return null
  const [payload, signature] = value.split('.', 2)
  if (!payload || !signature) return null
  const expected = await hmac(payload)
  if (!constantTimeEqual(signature, expected)) return null
  try {
    const token = JSON.parse(new TextDecoder().decode(base64UrlToBytes(payload))) as RfqResponseToken
    if (!token.rfqId || !token.supplierId || !token.companyId) return null
    if (Date.now() > Number(token.expiresAt || 0)) return null
    return token
  } catch {
    return null
  }
}
