'use client'

import { createPasswordFields, verifyPasswordHash } from '@/lib/security/password'

export { createPasswordFields }

export const usersKey = 'flowsys-auth-users'
export const sessionKey = 'flowsys-auth-session'
export const onboardingKey = 'flowsys-onboarding'
export const accountKey = 'flowsys-account'
export const logoutIntentKey = 'flowsys-auth-logged-out'

export type AccountRole = 'Admin' | 'Finance' | 'HR' | 'Employee' | 'Team Manager' | 'Project Manager' | 'Support' | 'Client'
export type AuthProvider = 'email' | 'gmail' | 'facebook'

export interface AuthUser {
  id: number
  name: string
  email: string
  provider: AuthProvider
  password?: string
  passwordHash?: string
  passwordSalt?: string
  passwordAlgorithm?: 'pbkdf2-sha256'
  passwordUpdatedAt?: string
  role?: AccountRole
}

const demoUser: AuthUser = {
  id: 100001,
  name: 'Demo Admin',
  email: 'wiseflow.demo@gmail.com',
  provider: 'email',
  password: 'DemoPass123!',
  role: 'Admin',
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

export async function verifyPassword(user: AuthUser, password: string) {
  return verifyPasswordHash(user, password, user.password)
}

export function loadAuthUsers() {
  if (typeof window === 'undefined') return [] as AuthUser[]
  if (process.env.NODE_ENV === 'production') return [] as AuthUser[]

  try {
    const stored = window.localStorage.getItem(usersKey)
    const users = stored ? (JSON.parse(stored) as AuthUser[]) : []
    return users.some(user => user.email.toLowerCase() === demoUser.email) ? users : [demoUser, ...users]
  } catch {
    return [demoUser]
  }
}

export function saveAuthUsers(users: AuthUser[]) {
  if (process.env.NODE_ENV === 'production') return
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
