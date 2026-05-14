'use client'

export const usersKey = 'flowsys-auth-users'
export const sessionKey = 'flowsys-auth-session'
export const onboardingKey = 'flowsys-onboarding'
export const accountKey = 'flowsys-account'
export const logoutIntentKey = 'flowsys-auth-logged-out'

export type AccountRole = 'Admin' | 'Finance' | 'HR' | 'Project Manager' | 'Support' | 'Client'
export type AuthProvider = 'email' | 'gmail' | 'facebook'

export interface AuthUser {
  id: number
  name: string
  email: string
  provider: AuthProvider
  password?: string
  passwordHash?: string
  passwordSalt?: string
  passwordUpdatedAt?: string
  role?: AccountRole
}

const commonPasswords = new Set([
  'password',
  'password123',
  'admin123',
  'qwerty123',
  'welcome123',
  '12345678',
  '123456789',
  'iloveyou',
  'letmein',
])

export function isGmailAddress(email: string) {
  return /^[^\s@]+@(gmail\.com|googlemail\.com)$/i.test(email.trim())
}

export function validatePasswordStrength(password: string, context: { email?: string; name?: string } = {}) {
  const issues: string[] = []
  const normalized = password.trim()
  const emailName = context.email?.split('@')[0]?.toLowerCase() || ''
  const displayName = context.name?.toLowerCase().replace(/[^a-z0-9]/g, '') || ''
  const compactPassword = normalized.toLowerCase().replace(/[^a-z0-9]/g, '')

  if (normalized.length < 12) issues.push('Use at least 12 characters.')
  if (!/[a-z]/.test(normalized)) issues.push('Add a lowercase letter.')
  if (!/[A-Z]/.test(normalized)) issues.push('Add an uppercase letter.')
  if (!/\d/.test(normalized)) issues.push('Add a number.')
  if (!/[^A-Za-z0-9]/.test(normalized)) issues.push('Add a symbol.')
  if (/\s/.test(normalized)) issues.push('Do not use spaces.')
  if (commonPasswords.has(normalized.toLowerCase())) issues.push('Avoid common passwords.')
  if (emailName && compactPassword.includes(emailName.toLowerCase())) issues.push('Do not include your email name.')
  if (displayName && displayName.length >= 4 && compactPassword.includes(displayName)) issues.push('Do not include your name.')

  return {
    ok: issues.length === 0,
    issues,
  }
}

export function createPasswordSalt() {
  const values = new Uint8Array(16)
  window.crypto.getRandomValues(values)
  return Array.from(values, value => value.toString(16).padStart(2, '0')).join('')
}

async function sha256(value: string) {
  const encoded = new TextEncoder().encode(value)
  const digest = await window.crypto.subtle.digest('SHA-256', encoded)
  return Array.from(new Uint8Array(digest), value => value.toString(16).padStart(2, '0')).join('')
}

export async function createPasswordFields(password: string, salt = createPasswordSalt()) {
  return {
    passwordHash: await sha256(`${salt}:${password}`),
    passwordSalt: salt,
    passwordUpdatedAt: new Date().toISOString(),
  }
}

export async function verifyPassword(user: AuthUser, password: string) {
  if (user.passwordHash && user.passwordSalt) {
    return await sha256(`${user.passwordSalt}:${password}`) === user.passwordHash
  }

  return Boolean(user.password) && user.password === password
}

export function loadAuthUsers() {
  if (typeof window === 'undefined') return [] as AuthUser[]

  try {
    const stored = window.localStorage.getItem(usersKey)
    return stored ? (JSON.parse(stored) as AuthUser[]) : []
  } catch {
    return [] as AuthUser[]
  }
}

export function saveAuthUsers(users: AuthUser[]) {
  window.localStorage.setItem(usersKey, JSON.stringify(users))
}

export function publicUser(user: AuthUser) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    provider: user.provider,
    passwordUpdatedAt: user.passwordUpdatedAt,
    role: user.role,
  }
}
