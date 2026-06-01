'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { FormEvent, useEffect, useMemo, useState } from 'react'
import { Building2, Eye, EyeOff, Lock, Mail, ShieldCheck, User } from 'lucide-react'
import { getSupabaseBrowserClient, hasSupabaseConfig } from '@/lib/auth/supabaseClient'
import { establishServerSession } from '@/lib/auth/sessionClient'
import { constantTimeEqual } from '@/lib/security/constantTime'
import {
  accountKey,
  type AccountRole,
  type AuthProvider,
  type AuthUser,
  createPasswordFields,
  isGmailAddress,
  loadAuthUsers,
  logoutIntentKey,
  publicUser,
  saveAuthUsers,
  onboardingKey,
  sessionKey,
  validatePasswordStrength,
  verifyPassword,
} from '@/lib/auth/localAuth'
import {
  acceptCompanyInvitation,
  activeCompanyKey,
  authRoleForCompanyRole,
  bootstrapCompanyOnServer,
  findPendingCompanyInvitation,
} from '@/lib/tenant/company'

const devDemoAdminEmail = 'wiseflow.demo@gmail.com'
const signupEmailCooldownKey = 'wiseflow-signup-email-cooldowns'
const signupEmailCooldownMs = 60_000

type SupabaseSignupUser = {
  id: string
  email?: string
  app_metadata?: {
    provider?: string
    providers?: string[]
  }
  user_metadata?: {
    company_name?: string
    full_name?: string
    name?: string
    role?: string
  }
}

function initialInviteEmail() {
  if (typeof window === 'undefined') return ''
  return new URLSearchParams(window.location.search).get('invite')?.trim().toLowerCase() || ''
}

function hasAdminOwner(authUsers: AuthUser[]) {
  if (authUsers.some(user => user.role === 'Admin' && user.email.toLowerCase() !== devDemoAdminEmail)) return true

  try {
    const accountRaw = window.localStorage.getItem(accountKey)
    const account = accountRaw ? (JSON.parse(accountRaw) as { email?: string; role?: AccountRole; roleLocked?: boolean }) : null
    return account?.role === 'Admin' && account.roleLocked === true && account.email?.toLowerCase() !== devDemoAdminEmail
  } catch {
    return false
  }
}

function metadataText(input: unknown) {
  return typeof input === 'string' ? input.trim() : ''
}

function roleFromMetadata(input: unknown) {
  return typeof input === 'string' ? authRoleForCompanyRole(input) as AccountRole : null
}

function authProviderForSupabaseUser(user: SupabaseSignupUser): AuthProvider {
  const provider = user.app_metadata?.provider || user.app_metadata?.providers?.[0]
  return provider === 'email' ? 'email' : 'gmail'
}

function signupEmailRedirectTo() {
  return typeof window === 'undefined' ? undefined : `${window.location.origin}/login`
}

function signupEmailCooldownMessage(waitMs?: number) {
  if (!waitMs) {
    return 'Supabase is temporarily limiting confirmation emails. Wait before trying again; if the hourly email limit was reached, use Sign up with Gmail or try again later.'
  }

  const waitSeconds = Math.max(1, Math.ceil(waitMs / 1000))
  return `Supabase is temporarily limiting confirmation emails. Try again in about ${waitSeconds} seconds. If it still shows this, use Sign up with Gmail or try again later.`
}

function isSupabaseEmailRateLimit(error: unknown) {
  return error instanceof Error && /rate limit|too many|over email send rate/i.test(error.message)
}

function readSignupEmailCooldown(email: string) {
  if (typeof window === 'undefined') return 0
  try {
    const cooldowns = JSON.parse(window.localStorage.getItem(signupEmailCooldownKey) || '{}') as Record<string, number>
    const until = Number(cooldowns[email] || 0)
    return Number.isFinite(until) ? until : 0
  } catch {
    return 0
  }
}

function saveSignupEmailCooldown(email: string, waitMs = signupEmailCooldownMs) {
  if (typeof window === 'undefined') return
  try {
    const cooldowns = JSON.parse(window.localStorage.getItem(signupEmailCooldownKey) || '{}') as Record<string, number>
    cooldowns[email] = Date.now() + waitMs
    window.localStorage.setItem(signupEmailCooldownKey, JSON.stringify(cooldowns))
  } catch {
    // Cooldown storage is only a UX guard; Supabase remains the source of truth.
  }
}

export default function SignupPage() {
  const router = useRouter()
  const [users, setUsers] = useState<AuthUser[]>(loadAuthUsers)
  const [name, setName] = useState('')
  const [company, setCompany] = useState('')
  const [email, setEmail] = useState('')
  const [role] = useState<AccountRole>('Admin')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const pendingInvite = useMemo(() => findPendingCompanyInvitation(email), [email])
  const accountRole = (pendingInvite ? authRoleForCompanyRole(pendingInvite.member.role) : role) as AccountRole
  const targetCompanyName = pendingInvite?.company.name || company

  useEffect(() => {
    const invitedEmail = initialInviteEmail()
    if (!invitedEmail) return
    const id = window.setTimeout(() => setEmail(invitedEmail), 0)
    return () => window.clearTimeout(id)
  }, [])

  const saveUser = async (user: AuthUser, companyName: string, nextAccountRole: AccountRole, invited = false) => {
    const nextUsers = [...users.filter(item => item.email.toLowerCase() !== user.email.toLowerCase()), user]
    setUsers(nextUsers)
    saveAuthUsers(nextUsers)
    const acceptedInvite = invited ? acceptCompanyInvitation(user.email, user.name) : null
    const accountCompany = acceptedInvite?.company.name || companyName || user.name || 'WiseFlow Company'
    const accountCompanyId = acceptedInvite?.company.id
    window.localStorage.setItem(sessionKey, JSON.stringify({ userId: user.id, email: user.email, provider: user.provider, role: nextAccountRole }))
    window.localStorage.setItem(
      accountKey,
      JSON.stringify({
        user: publicUser(user),
        company: accountCompany,
        companyId: accountCompanyId,
        email: user.email,
        role: nextAccountRole,
        roleLocked: !invited && nextAccountRole === 'Admin',
        onboardingComplete: invited,
        theme: 'Bright',
        density: 'Comfortable',
        emailNotifications: true,
        desktopNotifications: false,
        invitations: [],
      })
    )
    if (invited) {
      window.localStorage.setItem(onboardingKey, JSON.stringify({ complete: true, step: 4 }))
    } else {
      window.localStorage.removeItem(onboardingKey)
    }
    await establishServerSession({ userId: user.id, email: user.email, name: user.name, provider: user.provider, role: nextAccountRole })
    const bootstrappedCompany = await bootstrapCompanyOnServer({
      companyName: accountCompany,
      companyId: accountCompanyId,
      companyType: 'Operating Company',
    })
    const accountRaw = window.localStorage.getItem(accountKey)
    const account = accountRaw ? JSON.parse(accountRaw) as Record<string, unknown> : {}
    window.localStorage.setItem(accountKey, JSON.stringify({
      ...account,
      company: bootstrappedCompany.name,
      companyId: bootstrappedCompany.id,
    }))
    window.localStorage.setItem(activeCompanyKey, bootstrappedCompany.id)
    router.push(invited ? '/choose-account' : '/onboarding')
  }

  useEffect(() => {
    const supabase = getSupabaseBrowserClient()
    if (!supabase) return

    let mounted = true
    const finishSupabaseSignup = async () => {
      if (window.localStorage.getItem(logoutIntentKey)) return

      const { data } = await supabase.auth.getSession()
      const supabaseUser = data.session?.user as SupabaseSignupUser | undefined
      if (!mounted || !supabaseUser) return

      const currentUsers = loadAuthUsers()
      const userEmail = (supabaseUser.email || '').trim().toLowerCase()
      const metadata = supabaseUser.user_metadata || {}
      const userName = metadataText(metadata.full_name) || metadataText(metadata.name) || userEmail.split('@')[0] || 'WiseFlow User'
      const provider = authProviderForSupabaseUser(supabaseUser)

      if (!isGmailAddress(userEmail)) {
        setError('Use a Gmail account for workspace signup.')
        await supabase.auth.signOut()
        return
      }

      if (currentUsers.some(user => user.email.toLowerCase() === userEmail)) {
        setError('Account already exists. Please log in.')
        await supabase.auth.signOut()
        return
      }

      const supabaseInvite = findPendingCompanyInvitation(userEmail)
      const supabaseRole = (supabaseInvite
        ? authRoleForCompanyRole(supabaseInvite.member.role)
        : roleFromMetadata(metadata.role) || 'Admin') as AccountRole
      const supabaseCompanyName = supabaseInvite?.company.name || metadataText(metadata.company_name) || userName || 'WiseFlow Company'

      if (hasAdminOwner(currentUsers) && !supabaseInvite) {
        setError('An Admin owner already exists. Please log in or ask the Admin to invite you.')
        await supabase.auth.signOut()
        return
      }

      await supabase.auth.updateUser({
        data: {
          role: supabaseRole,
          full_name: userName,
          name: userName,
          company_name: supabaseCompanyName,
        },
      }).catch(() => undefined)

      const supabaseAuthUser: AuthUser = {
        id: currentUsers.reduce((max, user) => Math.max(max, user.id), 0) + 1,
        name: userName,
        email: userEmail,
        provider,
        role: supabaseRole,
      }
      const nextUsers = [...currentUsers, supabaseAuthUser]
      setUsers(nextUsers)
      saveAuthUsers(nextUsers)
      const acceptedInvite = supabaseInvite ? acceptCompanyInvitation(userEmail, userName) : null
      window.localStorage.setItem(sessionKey, JSON.stringify({ userId: supabaseAuthUser.id, email: supabaseAuthUser.email, provider: supabaseAuthUser.provider, role: supabaseRole }))
      window.localStorage.setItem(
        accountKey,
        JSON.stringify({
          user: publicUser(supabaseAuthUser),
          company: acceptedInvite?.company.name || supabaseCompanyName,
          companyId: acceptedInvite?.company.id,
          email: supabaseAuthUser.email,
          role: supabaseRole,
          roleLocked: !supabaseInvite && supabaseRole === 'Admin',
          onboardingComplete: Boolean(supabaseInvite),
          theme: 'Bright',
          density: 'Comfortable',
          emailNotifications: true,
          desktopNotifications: false,
          invitations: [],
        })
      )
      if (supabaseInvite) {
        window.localStorage.setItem(onboardingKey, JSON.stringify({ complete: true, step: 4 }))
      } else {
        window.localStorage.removeItem(onboardingKey)
      }
      await establishServerSession({ userId: supabaseAuthUser.id, email: supabaseAuthUser.email, name: supabaseAuthUser.name, provider: supabaseAuthUser.provider, role: supabaseRole })
      const bootstrappedCompany = await bootstrapCompanyOnServer({
        companyName: acceptedInvite?.company.name || supabaseCompanyName,
        companyId: acceptedInvite?.company.id,
        companyType: 'Operating Company',
      })
      const accountRawAfterBootstrap = window.localStorage.getItem(accountKey)
      const accountAfterBootstrap = accountRawAfterBootstrap ? JSON.parse(accountRawAfterBootstrap) as Record<string, unknown> : {}
      window.localStorage.setItem(accountKey, JSON.stringify({
        ...accountAfterBootstrap,
        company: bootstrappedCompany.name,
        companyId: bootstrappedCompany.id,
      }))
      window.localStorage.setItem(activeCompanyKey, bootstrappedCompany.id)
      router.push(supabaseInvite ? '/choose-account' : '/onboarding')
    }

    void finishSupabaseSignup()

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) void finishSupabaseSignup()
    })

    return () => {
      mounted = false
      listener.subscription.unsubscribe()
    }
  }, [router])

  const signup = async (event: FormEvent) => {
    event.preventDefault()
    const trimmedEmail = email.trim().toLowerCase()
    if (!isGmailAddress(trimmedEmail)) {
      setError('Use a Gmail address for workspace signup.')
      return
    }

    if (!constantTimeEqual(password, confirmPassword)) {
      setError('Passwords do not match.')
      return
    }

    const strength = validatePasswordStrength(password, { email: trimmedEmail, name })
    if (!strength.ok) {
      setError(strength.issues[0] || 'Use a stronger password.')
      return
    }

    const existingUser = users.find(user => user.email.toLowerCase() === trimmedEmail)
    if (existingUser) {
      const existingPasswordMatches = await verifyPassword(existingUser, password)
      setError(existingPasswordMatches
        ? 'This account already exists. Use Log in with this password.'
        : 'An account with this email already exists. Try logging in or use account recovery.')
      return
    }

    if (hasAdminOwner(users) && !pendingInvite) {
      setError('An Admin owner already exists. Please log in or ask the Admin to invite you.')
      return
    }

    const cooldownUntil = readSignupEmailCooldown(trimmedEmail)
    if (cooldownUntil > Date.now()) {
      setError(signupEmailCooldownMessage(cooldownUntil - Date.now()))
      return
    }

    try {
      const supabase = getSupabaseBrowserClient()
      if (supabase && hasSupabaseConfig()) {
        const { data, error: signupError } = await supabase.auth.signUp({
          email: trimmedEmail,
          password,
          options: {
            emailRedirectTo: signupEmailRedirectTo(),
            data: {
              role: accountRole,
              full_name: name.trim() || company.trim() || 'WiseFlow User',
              name: name.trim() || company.trim() || 'WiseFlow User',
              company_name: targetCompanyName.trim() || 'WiseFlow Company',
            },
          },
        })

        if (signupError) {
          if (isSupabaseEmailRateLimit(signupError)) {
            saveSignupEmailCooldown(trimmedEmail)
            setError(signupEmailCooldownMessage())
          } else {
            setError(signupError.message || 'Supabase could not create this account.')
          }
          return
        }

        if (!data.session) {
          saveSignupEmailCooldown(trimmedEmail)
          setError('Supabase sent a confirmation email. Open it, then log in to finish workspace setup.')
          return
        }
      }

      const passwordFields = await createPasswordFields(password)
      await saveUser(
        {
          id: users.reduce((max, user) => Math.max(max, user.id), 0) + 1,
          name: name.trim() || company.trim() || 'WiseFlow User',
          email: trimmedEmail,
          ...passwordFields,
          provider: 'email',
          role: accountRole,
        },
        targetCompanyName.trim(),
        accountRole,
        Boolean(pendingInvite),
      )
    } catch (signupError) {
      setError(signupError instanceof Error ? signupError.message : 'Account setup could not be completed.')
    }
  }

  const socialSignup = (provider: 'gmail' | 'facebook') => {
    if (provider !== 'gmail') {
      setError('Facebook signup is disabled for HR HUB.')
      return
    }

    if (hasAdminOwner(users) && !pendingInvite) {
      setError('An Admin owner already exists. Please log in or ask the Admin to invite you.')
      return
    }

    const supabase = getSupabaseBrowserClient()
    if (!supabase || !hasSupabaseConfig()) {
      setError('Google signup is not configured yet. Add the Supabase URL and anon key in Vercel environment variables.')
      return
    }

    window.localStorage.removeItem(logoutIntentKey)

    void supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/signup`,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    })
  }

  return (
    <main style={{ minHeight: '100vh', background: '#eef2f7', display: 'grid', gridTemplateColumns: 'minmax(320px, 0.9fr) minmax(360px, 1fr)', fontFamily: "var(--font-body)" }}>
      <section style={{ background: '#111827', color: '#fff', padding: '56px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 80 }}>
            <div style={{ width: 40, height: 40, borderRadius: 11, background: '#22c55e', color: '#191414', display: 'grid', placeItems: 'center', fontWeight: 600 }}>W</div>
            <div style={{ fontSize: 20, fontWeight: 600 }}>WiseFlow</div>
          </div>
          <h1 style={{ color: '#fff', fontSize: 42, lineHeight: 1.05, marginBottom: 18 }}>Create your construction command center.</h1>
          <p style={{ color: '#cbd5e1', fontSize: 15, lineHeight: 1.7, maxWidth: 470 }}>Start with projects, opportunities, bills, inventory, suppliers, and team chat in one focused workspace.</p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
          {['Clients', 'Budgets', 'Chat'].map(item => (
            <div key={item} style={{ border: '1px solid rgba(255,255,255,0.14)', borderRadius: 12, padding: 14, color: '#e5e7eb', fontSize: 13, fontWeight: 600 }}>{item}</div>
          ))}
        </div>
      </section>

      <section style={{ display: 'grid', placeItems: 'center', padding: '40px 24px' }}>
        <div style={{ width: 'min(460px, 100%)', background: '#fff', border: '1px solid #e5e7eb', borderRadius: 18, padding: 28, boxShadow: '0 24px 70px rgba(15,23,42,0.12)' }}>
          <div style={{ marginBottom: 22 }}>
            <div style={{ fontSize: 26, color: '#111827', fontWeight: 600, marginBottom: 8 }}>{pendingInvite ? 'Accept invitation' : 'Create account'}</div>
            <div style={{ fontSize: 13, color: '#64748b', lineHeight: 1.6 }}>{pendingInvite ? `Join ${pendingInvite.company.name} as ${pendingInvite.member.role}.` : 'Create the secure Admin owner account first. HR and Finance accounts should be invited or assigned by Admin.'}</div>
          </div>

          <form onSubmit={signup} style={{ display: 'grid', gap: 14 }}>
            {error && <div style={alertStyle}>{error}</div>}
            <Field icon={<User size={17} color="#64748b" />} label="Name"><input value={name} onChange={event => setName(event.target.value)} placeholder="Your name" required style={inputStyle} /></Field>
            <Field icon={<Building2 size={17} color="#64748b" />} label="Company"><input value={pendingInvite?.company.name || company} onChange={event => setCompany(event.target.value)} placeholder="Company name" required={!pendingInvite} readOnly={Boolean(pendingInvite)} style={inputStyle} /></Field>
            <Field icon={<Mail size={17} color="#64748b" />} label="Gmail address"><input value={email} onChange={event => setEmail(event.target.value)} type="email" placeholder="you@gmail.com" required style={inputStyle} /></Field>
            <label style={fieldGroupStyle}>
              <span style={labelStyle}>Workspace role</span>
              <div style={inputWrapStyle}>
                <ShieldCheck size={17} color="#64748b" />
                <input value={pendingInvite ? pendingInvite.member.role : 'Admin owner'} readOnly style={inputStyle} />
              </div>
              <span style={hintStyle}>{pendingInvite ? 'This role comes from your pending invitation.' : 'Finance and HR are sensitive roles. Admin assigns them after workspace setup.'}</span>
            </label>
            <label style={fieldGroupStyle}>
              <span style={labelStyle}>Password</span>
              <div style={inputWrapStyle}>
                <Lock size={17} color="#64748b" />
                <input value={password} onChange={event => setPassword(event.target.value)} type={showPassword ? 'text' : 'password'} placeholder="12+ chars, Aa, 1, symbol" required style={inputStyle} />
                <button type="button" onClick={() => setShowPassword(!showPassword)} style={ghostIconButtonStyle}>{showPassword ? <EyeOff size={17} /> : <Eye size={17} />}</button>
              </div>
              <span style={hintStyle}>Use uppercase, lowercase, number, and symbol. Do not use your name or email.</span>
            </label>
            <Field icon={<Lock size={17} color="#64748b" />} label="Confirm password"><input value={confirmPassword} onChange={event => setConfirmPassword(event.target.value)} type={showPassword ? 'text' : 'password'} placeholder="Repeat password" required style={inputStyle} /></Field>
            <button type="submit" style={primaryButtonStyle}>{pendingInvite ? 'Accept invitation' : 'Create account'}</button>
          </form>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: 12, alignItems: 'center', margin: '20px 0', color: '#94a3b8', fontSize: 12, fontWeight: 600 }}>
            <span style={{ height: 1, background: '#e5e7eb' }} /> OR <span style={{ height: 1, background: '#e5e7eb' }} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <button type="button" onClick={() => socialSignup('gmail')} style={socialButtonStyle}><span style={{ color: '#dc2626', fontWeight: 600 }}>G</span>Sign up with Gmail</button>
            <button type="button" onClick={() => socialSignup('facebook')} style={socialButtonStyle}><span style={{ color: '#2563eb', fontWeight: 600 }}>f</span>Facebook disabled</button>
          </div>

          <div style={{ textAlign: 'center', fontSize: 13, color: '#64748b', marginTop: 18 }}>
            Already have an account? <Link href="/login" style={{ color: '#111827', fontWeight: 600, textDecoration: 'none' }}>Log in</Link>
          </div>
        </div>
      </section>
    </main>
  )
}

function Field({ label, icon, children }: { label: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <label style={fieldGroupStyle}>
      <span style={labelStyle}>{label}</span>
      <div style={inputWrapStyle}>{icon}{children}</div>
    </label>
  )
}

const fieldGroupStyle = { display: 'grid', gap: 7 }
const labelStyle = { fontSize: 12, color: '#374151', fontWeight: 600 }
const inputWrapStyle = { height: 44, border: '1px solid #e5e7eb', borderRadius: 10, display: 'flex', alignItems: 'center', gap: 9, padding: '0 12px', background: '#fff' }
const inputStyle = { border: 'none', outline: 'none', flex: 1, minWidth: 0, fontSize: 14, color: '#111827', background: 'transparent' }
const hintStyle = { color: '#64748b', fontSize: 11, lineHeight: 1.45 }
const primaryButtonStyle = { border: 'none', borderRadius: 10, background: '#111827', color: '#fff', height: 44, fontSize: 14, fontWeight: 600, cursor: 'pointer' }
const socialButtonStyle = { height: 42, border: '1px solid #e5e7eb', borderRadius: 10, background: '#fff', color: '#111827', fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8 }
const ghostIconButtonStyle = { border: 'none', background: 'transparent', color: '#64748b', cursor: 'pointer', display: 'inline-flex', padding: 0 }
const alertStyle = { padding: '10px 12px', borderRadius: 10, background: '#fef2f2', color: '#dc2626', fontSize: 13, fontWeight: 600 }
