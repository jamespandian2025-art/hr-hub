'use client'

import { withCsrfHeaders } from '@/lib/security/csrfClient'
import { getSupabaseBrowserClient } from './supabaseClient'

type ClientSessionInput = {
  userId?: string | number
  id?: string | number
  email?: string
  name?: string
  fullName?: string
  role?: string
  provider?: string
  employeeId?: string
}

async function authorizationHeader(): Promise<Record<string, string>> {
  const supabase = getSupabaseBrowserClient()
  if (!supabase) return {}
  try {
    const { data } = await supabase.auth.getSession()
    const token = data.session?.access_token
    return token ? { Authorization: `Bearer ${token}` } : {}
  } catch {
    return {}
  }
}

export async function establishServerSession(input: ClientSessionInput) {
  const authHeader = await authorizationHeader()
  const response = await fetch('/api/auth/session', {
    method: 'POST',
    headers: withCsrfHeaders({ 'Content-Type': 'application/json', ...authHeader }),
    body: JSON.stringify(input),
  })
  const payload = await response.json().catch(() => null)
  if (!response.ok || !payload?.ok) {
    throw new Error(payload?.error || 'Could not start a secure session.')
  }
}

export async function checkLoginAllowed(email: string) {
  const response = await fetch('/api/auth/login-attempts', {
    method: 'POST',
    headers: withCsrfHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ email, outcome: 'check' }),
  })
  const payload = await response.json().catch(() => null)
  if (response.status === 429) {
    throw new Error(`Too many failed login attempts. Try again in ${payload?.retryAfterSeconds || 900} seconds.`)
  }
}

export async function recordLoginAttempt(email: string, success: boolean) {
  await fetch('/api/auth/login-attempts', {
    method: 'POST',
    headers: withCsrfHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ email, outcome: success ? 'success' : 'failure' }),
  }).catch(() => undefined)
}
