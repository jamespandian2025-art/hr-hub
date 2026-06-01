'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { FormEvent, useEffect, useState } from 'react'
import { BriefcaseBusiness, Building2, ExternalLink, Eye, EyeOff, Lock, Mail, Users } from 'lucide-react'
import { getSupabaseBrowserClient, hasSupabaseConfig } from '@/lib/auth/supabaseClient'
import { checkLoginAllowed, establishServerSession, recordLoginAttempt } from '@/lib/auth/sessionClient'
import { activeCompanyKey, bootstrapCompanyOnServer } from '@/lib/tenant/company'
import {
  accountKey,
  type AccountRole,
  type AuthUser,
  createPasswordFields,
  isGmailAddress,
  loadAuthUsers,
  logoutIntentKey,
  onboardingKey,
  publicUser,
  saveAuthUsers,
  sessionKey,
  verifyPassword,
} from '@/lib/auth/localAuth'

interface AccountState {
  email?: string
  fullName?: string
  name?: string
  theme?: string
  company?: string
  companyId?: string
  role?: AccountRole
  roleLocked?: boolean
  onboardingComplete?: boolean
}

type SupabaseLoginUser = {
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

const accountRoles = new Set(['Admin', 'Finance', 'HR', 'Employee', 'Team Manager', 'Project Manager', 'Support', 'Client'])

const loginStats = [
  { icon: Building2, value: '\u20b112.5M', label: 'Total Managed Budget' },
  { icon: BriefcaseBusiness, value: '48', label: 'Active Projects' },
  { icon: Users, value: '126', label: 'Team Members' },
]

function invitedRole(input: unknown): AccountState['role'] | null {
  if (typeof input !== 'string') return null
  if (accountRoles.has(input)) return input as AccountState['role']
  if (['Member', 'Sales', 'Warehouse', 'Procurement'].includes(input)) return 'Support'
  return null
}

function metadataText(input: unknown) {
  return typeof input === 'string' ? input.trim() : ''
}

function authProviderForSupabaseUser(user: SupabaseLoginUser): AuthUser['provider'] {
  const provider = user.app_metadata?.provider || user.app_metadata?.providers?.[0]
  return provider === 'email' ? 'email' : 'gmail'
}

function existingSessionRoute() {
  try {
    if (window.localStorage.getItem(logoutIntentKey)) return null
    if (new URLSearchParams(window.location.search).has('next')) {
      window.localStorage.removeItem(sessionKey)
      return null
    }

    const sessionRaw = window.localStorage.getItem(sessionKey)
    if (!sessionRaw) return null

    const accountRaw = window.localStorage.getItem(accountKey)
    const account = accountRaw ? (JSON.parse(accountRaw) as AccountState) : {}
    const stored = window.localStorage.getItem(onboardingKey)
    const onboarding = stored ? JSON.parse(stored) as { complete?: boolean } : null

    if (!onboarding?.complete && !account.onboardingComplete) return '/onboarding'
    return '/choose-account'
  } catch {
    return null
  }
}

export default function LoginPage() {
  const router = useRouter()
  const [users, setUsers] = useState<AuthUser[]>(loadAuthUsers)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const route = existingSessionRoute()
    if (route) router.replace(route)
  }, [router])

  useEffect(() => {
    const supabase = getSupabaseBrowserClient()
    if (!supabase) return

    let mounted = true
    const completeGoogleLogin = async (sessionUser: SupabaseLoginUser) => {
      if (!mounted) return
      if (window.localStorage.getItem(logoutIntentKey)) return

      const userEmail = (sessionUser.email || '').trim().toLowerCase()
      const registeredUsers = loadAuthUsers()
      let registeredUser = registeredUsers.find(user => user.email.toLowerCase() === userEmail)
      const metadata = sessionUser.user_metadata || {}
      const roleFromInvite = invitedRole(metadata.role)
      const provider = authProviderForSupabaseUser(sessionUser)
      const accountRaw = window.localStorage.getItem(accountKey)
      const account = accountRaw ? (JSON.parse(accountRaw) as AccountState) : {}

      if (!registeredUser && roleFromInvite) {
        registeredUser = {
          id: registeredUsers.reduce((max, user) => Math.max(max, user.id), 0) + 1,
          name: metadataText(metadata.full_name) || metadataText(metadata.name) || userEmail.split('@')[0] || 'Invited User',
          email: userEmail,
          provider,
          role: roleFromInvite,
        }
        saveAuthUsers([...registeredUsers, registeredUser])
      }

      if (!registeredUser && account.role === 'Admin' && account.roleLocked === true && account.email?.toLowerCase() === userEmail) {
        registeredUser = {
          id: registeredUsers.reduce((max, user) => Math.max(max, user.id), 0) + 1,
          name: account.fullName || account.name || metadataText(metadata.full_name) || metadataText(metadata.name) || userEmail.split('@')[0] || 'Admin Owner',
          email: userEmail,
          provider,
          role: 'Admin',
        }
        saveAuthUsers([...registeredUsers, registeredUser])
      }

      if (!registeredUser) {
        setError('No HR HUB account exists for this Gmail. Please create the first Admin account or ask your Admin to invite you.')
        await supabase.auth.signOut()
        return
      }

      const userName = registeredUser.name || metadataText(metadata.full_name) || metadataText(metadata.name) || userEmail.split('@')[0] || 'WiseFlow User'
      const role = registeredUser.role || account.role || 'Admin'
      const companyName = metadataText(metadata.company_name) || account.company || userName || 'WiseFlow Company'
      await supabase.auth.updateUser({
        data: {
          role,
          full_name: userName,
          name: userName,
          company_name: companyName,
        },
      }).catch(() => undefined)
      window.localStorage.setItem(sessionKey, JSON.stringify({ userId: registeredUser.id, email: userEmail, provider: registeredUser.provider, role }))
      window.localStorage.setItem(accountKey, JSON.stringify({
        ...account,
        user: publicUser({ ...registeredUser, name: userName, role }),
        name: userName,
        fullName: userName,
        company: companyName,
        email: userEmail,
        role,
        theme: account.theme || 'Bright',
      }))
      await establishServerSession({ userId: registeredUser.id, email: userEmail, name: userName, provider: registeredUser.provider, role })
      const bootstrappedCompany = await bootstrapCompanyOnServer({
        companyName,
        companyId: account.companyId,
        companyType: 'Operating Company',
      })
      const accountAfterBootstrapRaw = window.localStorage.getItem(accountKey)
      const accountAfterBootstrap = accountAfterBootstrapRaw ? JSON.parse(accountAfterBootstrapRaw) as AccountState : {}
      window.localStorage.setItem(accountKey, JSON.stringify({
        ...accountAfterBootstrap,
        company: bootstrappedCompany.name,
        companyId: bootstrappedCompany.id,
      }))
      window.localStorage.setItem(activeCompanyKey, bootstrappedCompany.id)
      const stored = window.localStorage.getItem(onboardingKey)
      const onboarding = stored ? JSON.parse(stored) as { complete?: boolean } : null
      router.replace(!onboarding?.complete && !account.onboardingComplete ? '/onboarding' : '/choose-account')
    }

    supabase.auth.getSession().then(({ data }) => {
      if (!data.session?.user) return
      void completeGoogleLogin(data.session.user)
    })

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session?.user) return
      void completeGoogleLogin(session.user)
    })

    return () => {
      mounted = false
      listener.subscription.unsubscribe()
    }
  }, [router])

  const saveSession = async (user: AuthUser) => {
    const accountRaw = window.localStorage.getItem(accountKey)
    const account = accountRaw ? (JSON.parse(accountRaw) as AccountState) : {}
    const role = user.role || account.role || 'Admin'
    window.localStorage.setItem(sessionKey, JSON.stringify({ userId: user.id, email: user.email, provider: user.provider, role }))
    window.localStorage.setItem(accountKey, JSON.stringify({ ...account, user: publicUser(user), email: user.email, role }))
    await establishServerSession({ userId: user.id, email: user.email, name: user.name, provider: user.provider, role })
    const stored = window.localStorage.getItem(onboardingKey)
    const onboarding = stored ? JSON.parse(stored) as { complete?: boolean } : null
    if (!onboarding?.complete && !account.onboardingComplete) {
      router.push('/onboarding')
      return
    }

    router.push('/choose-account')
  }

  const login = async (event: FormEvent) => {
    event.preventDefault()
    const trimmedEmail = email.trim().toLowerCase()
    try {
      await checkLoginAllowed(trimmedEmail)
    } catch (rateError) {
      setError(rateError instanceof Error ? rateError.message : 'Too many failed login attempts. Try again later.')
      return
    }
    if (!isGmailAddress(trimmedEmail)) {
      setError('Use the Gmail address registered for this workspace.')
      await recordLoginAttempt(trimmedEmail, false)
      return
    }

    const user = users.find(item => item.email.toLowerCase() === trimmedEmail)
    const passwordMatches = user ? await verifyPassword(user, password) : false

    if (user && passwordMatches) {
      if ((user.password && !user.passwordHash) || (user.passwordHash && !user.passwordAlgorithm)) {
        const passwordFields = await createPasswordFields(password)
        const migrated = { ...user, ...passwordFields, password: undefined }
        const nextUsers = users.map(item => item.id === user.id ? migrated : item)
        setUsers(nextUsers)
        saveAuthUsers(nextUsers)
        await recordLoginAttempt(trimmedEmail, true)
        await saveSession(migrated)
        return
      }

      await recordLoginAttempt(trimmedEmail, true)
      await saveSession(user)
      return
    }

    const supabase = getSupabaseBrowserClient()
    if (supabase && hasSupabaseConfig()) {
      const { data, error: supabaseError } = await supabase.auth.signInWithPassword({
        email: trimmedEmail,
        password,
      })

      if (supabaseError || !data.user) {
        setError('Email or password is incorrect.')
        await recordLoginAttempt(trimmedEmail, false)
        return
      }

      const metadata = data.user.user_metadata || {}
      const existingLocalUser = users.find(item => item.email.toLowerCase() === trimmedEmail)
      const role = invitedRole(metadata.role) || existingLocalUser?.role || 'Employee'
      const userName = metadata.full_name || metadata.name || trimmedEmail.split('@')[0] || 'WiseFlow User'
      const companyName = metadata.company_name || userName || 'WiseFlow Company'
      const user: AuthUser = {
        id: users.reduce((max, item) => Math.max(max, item.id), 0) + 1,
        name: userName,
        email: trimmedEmail,
        provider: 'email',
        role,
      }

      try {
        window.localStorage.setItem(sessionKey, JSON.stringify({ userId: user.id, email: trimmedEmail, provider: user.provider, role }))
        window.localStorage.setItem(accountKey, JSON.stringify({
          user: publicUser(user),
          name: userName,
          fullName: userName,
          email: trimmedEmail,
          role,
          theme: 'Bright',
        }))
        await recordLoginAttempt(trimmedEmail, true)
        await establishServerSession({ userId: user.id, email: trimmedEmail, name: userName, provider: user.provider, role })
        const bootstrappedCompany = await bootstrapCompanyOnServer({
          companyName,
          companyType: 'Operating Company',
        })
        const accountRaw = window.localStorage.getItem(accountKey)
        const account = accountRaw ? JSON.parse(accountRaw) as AccountState : {}
        window.localStorage.setItem(accountKey, JSON.stringify({
          ...account,
          company: bootstrappedCompany.name,
          companyId: bootstrappedCompany.id,
        }))
        window.localStorage.setItem(activeCompanyKey, bootstrappedCompany.id)
        const stored = window.localStorage.getItem(onboardingKey)
        const onboarding = stored ? JSON.parse(stored) as { complete?: boolean } : null
        router.push(!onboarding?.complete ? '/onboarding' : '/choose-account')
      } catch (setupError) {
        setError(setupError instanceof Error ? setupError.message : 'Workspace setup could not be completed.')
        await supabase.auth.signOut()
      }
      return
    }

    setError('Email or password is incorrect.')
    await recordLoginAttempt(trimmedEmail, false)
  }

  const socialLogin = (provider: 'gmail' | 'microsoft') => {
    if (provider !== 'gmail') {
      setError('Microsoft login is not configured yet. Use your registered Gmail and password.')
      return
    }

    const supabase = getSupabaseBrowserClient()
    if (!supabase || !hasSupabaseConfig()) {
      setError('Google login is not configured yet. Add the Supabase URL and anon key in Vercel environment variables.')
      return
    }

    window.localStorage.removeItem(logoutIntentKey)

    void supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/login`,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    })
  }

  return (
    <AuthShell>
      <form onSubmit={login} className="login-form">
        {error && <div className="login-alert">{error}</div>}

        <label className="login-field">
          <span>Email</span>
          <div className="login-input-wrap">
            <Mail size={18} aria-hidden="true" />
            <input className="login-control" value={email} onChange={event => setEmail(event.target.value)} type="email" placeholder="wiseflow.demo@gmail.com" autoComplete="email" required />
          </div>
        </label>

        <div className="login-field">
          <div className="login-field-row">
            <span>Password</span>
            <Link href="/account-recovery" className="login-accent-link">Forgot password?</Link>
          </div>
          <div className="login-input-wrap">
            <Lock size={18} aria-hidden="true" />
            <input className="login-control" aria-label="Password" value={password} onChange={event => setPassword(event.target.value)} type={showPassword ? 'text' : 'password'} placeholder="Enter password" autoComplete="current-password" required />
            <button type="button" className="login-password-toggle" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? 'Hide password' : 'Show password'}>
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>

        <button type="submit" className="login-primary-button">Log in</button>
      </form>

      <SocialButtons onSocial={socialLogin} />

      <div className="employee-login-panel">
        <div>Logging in as an employee?</div>
        <Link href="/employee/login" className="employee-login-link">
          <ExternalLink size={17} aria-hidden="true" />
          Open Employee Self-Service Portal
        </Link>
      </div>

      <div className="login-create-line">
        No account yet? <Link href="/signup" className="login-accent-link">Create one</Link>
      </div>
    </AuthShell>
  )
}

function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <main className="login-shell">
      <style>{loginCss}</style>
      <video className="login-bg-video login-bg-video-mobile" autoPlay muted loop playsInline preload="auto" aria-hidden="true">
        <source src="/videos/mobile.mp4" type="video/mp4" />
      </video>
      <section className="login-visual" aria-label="WiseFlow business management platform">
        <video className="login-bg-video login-bg-video-desktop" autoPlay muted loop playsInline preload="auto" aria-hidden="true">
          <source src="/videos/desktop-video.mp4" type="video/mp4" />
        </video>
        <div className="login-brand">
          <div className="login-logo-mark">W</div>
          <div className="login-wordmark">WiseFlow</div>
        </div>

        <div className="login-hero-copy">
          <h1 className="login-hero-title">Run your entire<br />business in <span>one place</span>.</h1>
          <p className="login-hero-subtitle">Track projects, clients, budgets, bills, inventory, suppliers, and team messages with a focused business workspace.</p>
        </div>

        <div className="login-stats" aria-label="WiseFlow project metrics">
          {loginStats.map(stat => {
            const StatIcon = stat.icon
            return (
              <div className="login-stat" key={stat.label}>
                <StatIcon size={28} aria-hidden="true" />
                <strong>{stat.value}</strong>
                <span>{stat.label}</span>
              </div>
            )
          })}
        </div>

        <div className="login-footer-line">
          <span>{'\u00a9 2026 WiseFlow. All rights reserved.'}</span>
        </div>
      </section>

      <section className="login-form-panel" aria-label="WiseFlow login form">
        <div className="login-auth-panel">
          <div className="login-panel-header">
            <div className="login-panel-title">Welcome back</div>
            <div className="login-panel-subtitle">Log in to manage projects, finances, resources, and conversations.</div>
          </div>
          {children}
        </div>
      </section>
    </main>
  )
}

function SocialButtons({ onSocial }: { onSocial: (provider: 'gmail' | 'microsoft') => void }) {
  return (
    <>
      <div className="login-divider">
        <span />
        <div>OR</div>
        <span />
      </div>
      <div className="login-social-grid">
        <button type="button" className="login-social-button" onClick={() => onSocial('gmail')}>
          <span className="google-mark" aria-hidden="true">G</span>
          Continue with Google
        </button>
        <button type="button" className="login-social-button" onClick={() => onSocial('microsoft')}>
          <span className="microsoft-mark" aria-hidden="true">
            <i />
            <i />
            <i />
            <i />
          </span>
          Continue with Microsoft
        </button>
      </div>
    </>
  )
}

const loginCss = `
.login-shell,
.login-shell * {
  box-sizing: border-box;
}

.login-shell {
  position: relative;
  isolation: isolate;
  min-height: 100vh;
  min-height: 100svh;
  width: 100%;
  max-width: 100vw;
  overflow-x: hidden;
  background:
    radial-gradient(circle at 77% 19%, rgba(24, 198, 96, 0.12), transparent 26%),
    linear-gradient(135deg, #060a0e 0%, #090d11 47%, #05070a 100%);
  color: #f8fafc;
  display: grid;
  font-family: var(--font-body), "Geist Sans", sans-serif;
}

.login-shell button:hover {
  transform: none;
}

.login-bg-video {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  border: 0;
  pointer-events: none;
  z-index: -2;
}

.login-bg-video-mobile {
  display: none;
}

.login-visual {
  min-height: 100svh;
  min-width: 0;
  position: relative;
  isolation: isolate;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  padding: clamp(28px, 5vw, 56px);
  border-right: 1px solid rgba(148, 163, 184, 0.18);
  background: #05080b;
}

.login-visual::after {
  content: "";
  position: absolute;
  inset: 0;
  z-index: -1;
  pointer-events: none;
  background:
    linear-gradient(90deg, rgba(5, 10, 14, 0.92) 0%, rgba(5, 10, 14, 0.62) 42%, rgba(5, 10, 14, 0.40) 100%),
    linear-gradient(180deg, rgba(0, 0, 0, 0.08) 52%, rgba(0, 0, 0, 0.52) 100%),
    radial-gradient(circle at 55% 50%, rgba(33, 197, 94, 0.12), transparent 31%);
}

.login-brand {
  display: flex;
  align-items: center;
  gap: 14px;
  align-self: start;
}

.login-logo-mark {
  width: 48px;
  height: 48px;
  border-radius: 10px;
  background: linear-gradient(135deg, #31e977 0%, #16a34a 100%);
  color: #ffffff;
  display: grid;
  place-items: center;
  font-size: 22px;
  font-weight: 850;
  flex: 0 0 auto;
}

.login-wordmark {
  color: #ffffff;
  font-size: clamp(20px, 2vw, 26px);
  font-weight: 760;
  letter-spacing: 0;
}

.login-hero-copy {
  align-self: start;
  max-width: min(730px, 94%);
  margin-top: clamp(48px, 7vh, 72px);
}

.login-shell .login-hero-title {
  margin: 0;
  color: #ffffff !important;
  font-size: clamp(44px, 3.8vw, 56px) !important;
  line-height: 1.22 !important;
  font-weight: 760 !important;
  letter-spacing: 0 !important;
  text-wrap: balance;
}

.login-hero-title span {
  color: #22c55e;
}

.login-hero-subtitle {
  max-width: 570px;
  margin: 24px 0 0;
  color: #b8c0cc;
  font-size: clamp(18px, 1.7vw, 22px);
  line-height: 1.65;
  font-weight: 430;
}

.login-stats {
  position: absolute;
  left: clamp(28px, 5vw, 56px);
  top: calc(100svh - 334px);
  width: min(540px, calc(100% - 112px));
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 20px;
  max-width: 540px;
}

.login-stat {
  min-height: 150px;
  display: grid;
  align-content: center;
  gap: 16px;
  padding: 28px;
  border: 1px solid rgba(148, 163, 184, 0.18);
  border-radius: 12px;
  background: linear-gradient(145deg, rgba(15, 23, 42, 0.64), rgba(8, 13, 18, 0.48));
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.04);
  backdrop-filter: blur(18px);
}

.login-stat svg {
  color: #22c55e;
  stroke-width: 2;
}

.login-stat strong {
  color: #ffffff !important;
  font-size: clamp(28px, 2.7vw, 38px);
  line-height: 1;
  font-weight: 760;
  letter-spacing: 0;
}

.login-stat span {
  color: #aeb7c4;
  font-size: 16px;
  line-height: 1.45;
}

.login-footer-line {
  position: absolute;
  left: clamp(28px, 5vw, 56px);
  top: calc(100svh - 92px);
  display: flex;
  align-items: center;
  gap: 18px;
  color: #aeb7c4;
  font-size: 15px;
}

.login-footer-line span {
  color: #aeb7c4 !important;
}

.login-form-panel {
  min-height: 100svh;
  min-width: 0;
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: clamp(28px, 4.8vw, 64px);
  background:
    radial-gradient(circle at 38% 18%, rgba(148, 163, 184, 0.08), transparent 24%),
    linear-gradient(135deg, rgba(6, 9, 13, 0.95), rgba(5, 7, 10, 0.98));
}

.login-auth-panel {
  width: min(100%, 520px);
  min-width: 0;
  max-width: 100%;
  border: 1px solid rgba(148, 163, 184, 0.2);
  border-radius: 14px;
  padding: clamp(30px, 4.4vw, 54px) clamp(28px, 5vw, 64px);
  background: linear-gradient(145deg, rgba(12, 18, 24, 0.72), rgba(6, 9, 13, 0.58));
  box-shadow: 0 30px 90px rgba(0, 0, 0, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.04);
  backdrop-filter: blur(22px);
}

.login-panel-header {
  margin-bottom: 26px;
}

.login-panel-title {
  color: #ffffff !important;
  font-size: clamp(30px, 3vw, 39px);
  font-weight: 760;
  line-height: 1.15;
  margin-bottom: 14px;
  letter-spacing: 0;
}

.login-panel-subtitle {
  max-width: 420px;
  color: #aeb7c4 !important;
  font-size: 15px;
  line-height: 1.6;
  font-weight: 400 !important;
}

html[data-theme='dark'] body .login-shell .login-panel-subtitle.login-panel-subtitle,
html[data-theme='light'] body .login-shell .login-panel-subtitle.login-panel-subtitle {
  color: #aeb7c4 !important;
  font-weight: 400 !important;
}

.login-form {
  display: grid;
  gap: 18px;
}

.login-alert {
  padding: 12px 14px;
  border: 1px solid rgba(248, 113, 113, 0.32);
  border-radius: 10px;
  background: rgba(127, 29, 29, 0.28);
  color: #fecaca;
  font-size: 14px;
  line-height: 1.45;
  font-weight: 620;
}

.login-field {
  display: grid;
  gap: 12px;
}

.login-field,
.login-field-row,
.login-input-wrap,
.login-shell input,
.login-shell button,
.login-shell a {
  max-width: 100%;
}

.login-field > span,
.login-field-row > span {
  color: #d6dce5;
  font-size: 15px;
  font-weight: 650;
}

.login-field-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.login-input-wrap {
  min-height: 50px;
  width: 100%;
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 0 16px;
  border: 1px solid rgba(148, 163, 184, 0.2);
  border-radius: 8px;
  background: rgba(5, 9, 13, 0.46);
  color: #94a3b8;
  box-shadow: inset 0 1px 12px rgba(0, 0, 0, 0.12);
}

.login-shell .login-control {
  width: 100%;
  min-width: 0;
  min-height: 0;
  height: auto;
  flex: 1;
  border: 0 !important;
  outline: none !important;
  box-shadow: none !important;
  background: transparent !important;
  color: #eef2f7 !important;
  font-size: 15px;
  font-weight: 500;
  padding: 0;
}

.login-shell .login-control::placeholder {
  color: #aab3bf !important;
  opacity: 0.92;
}

.login-input-wrap:focus-within {
  border-color: rgba(34, 197, 94, 0.66);
  box-shadow: 0 0 0 3px rgba(34, 197, 94, 0.13), inset 0 1px 12px rgba(0, 0, 0, 0.12);
}

.login-password-toggle {
  width: 34px;
  height: 34px;
  border: 0;
  background: transparent;
  color: #b4bdca;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0;
}

.login-primary-button {
  min-height: 52px;
  width: 100%;
  border: 0;
  border-radius: 8px;
  background: linear-gradient(135deg, #21d566 0%, #16a34a 100%);
  color: #ffffff;
  font-size: 16px;
  font-weight: 760;
  cursor: pointer;
  box-shadow: 0 18px 38px rgba(22, 163, 74, 0.22);
}

html[data-theme='dark'] .login-shell .login-primary-button,
html[data-theme='light'] .login-shell .login-primary-button,
.login-shell .login-primary-button {
  background: linear-gradient(135deg, #21d566 0%, #16a34a 100%) !important;
  border-color: transparent !important;
  color: #ffffff !important;
  box-shadow: 0 18px 38px rgba(22, 163, 74, 0.22) !important;
}

html[data-theme='dark'] body .login-shell .login-primary-button.login-primary-button.login-primary-button.login-primary-button,
html[data-theme='light'] body .login-shell .login-primary-button.login-primary-button.login-primary-button.login-primary-button {
  background: linear-gradient(135deg, #21d566 0%, #16a34a 100%) !important;
  border-color: transparent !important;
  color: #ffffff !important;
  box-shadow: 0 18px 38px rgba(22, 163, 74, 0.22) !important;
}

.login-primary-button:hover,
.login-primary-button:focus-visible {
  background: linear-gradient(135deg, #2be872 0%, #19b955 100%);
}

html[data-theme='dark'] .login-shell .login-primary-button:hover,
html[data-theme='dark'] .login-shell .login-primary-button:focus-visible,
html[data-theme='light'] .login-shell .login-primary-button:hover,
html[data-theme='light'] .login-shell .login-primary-button:focus-visible {
  background: linear-gradient(135deg, #2be872 0%, #19b955 100%) !important;
}

html[data-theme='dark'] body .login-shell .login-primary-button.login-primary-button.login-primary-button.login-primary-button:hover,
html[data-theme='dark'] body .login-shell .login-primary-button.login-primary-button.login-primary-button.login-primary-button:focus-visible,
html[data-theme='light'] body .login-shell .login-primary-button.login-primary-button.login-primary-button.login-primary-button:hover,
html[data-theme='light'] body .login-shell .login-primary-button.login-primary-button.login-primary-button.login-primary-button:focus-visible {
  background: linear-gradient(135deg, #2be872 0%, #19b955 100%) !important;
}

.login-primary-button:focus-visible,
.login-social-button:focus-visible,
.employee-login-link:focus-visible,
.login-accent-link:focus-visible,
.login-password-toggle:focus-visible,
.login-shell input:focus-visible {
  outline: 2px solid #22c55e;
  outline-offset: 2px;
}

.login-accent-link {
  color: #22c55e;
  font-size: 14px;
  font-weight: 650;
  text-decoration: none;
  white-space: nowrap;
}

.login-divider {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  gap: 18px;
  align-items: center;
  margin: 26px 0 18px;
  color: #9aa3b0;
  font-size: 14px;
  font-weight: 600;
  text-align: center;
}

.login-divider span {
  height: 1px;
  background: rgba(148, 163, 184, 0.18);
}

.login-social-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 12px;
}

.login-social-button {
  width: 100%;
  min-height: 50px;
  border: 1px solid rgba(148, 163, 184, 0.2);
  border-radius: 8px;
  background: rgba(5, 9, 13, 0.34);
  color: #ffffff;
  font-size: 16px;
  font-weight: 680;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 14px;
}

html[data-theme='dark'] .login-shell .login-social-button,
html[data-theme='light'] .login-shell .login-social-button,
.login-shell .login-social-button {
  background: rgba(5, 9, 13, 0.34) !important;
  border-color: rgba(148, 163, 184, 0.2) !important;
  color: #ffffff !important;
  box-shadow: none !important;
}

.login-social-button:hover {
  border-color: rgba(148, 163, 184, 0.34);
  background: rgba(15, 23, 42, 0.44);
}

html[data-theme='dark'] .login-shell .login-social-button:hover,
html[data-theme='light'] .login-shell .login-social-button:hover {
  background: rgba(15, 23, 42, 0.44) !important;
  border-color: rgba(148, 163, 184, 0.34) !important;
}

html[data-theme='dark'] .login-shell .login-input-wrap button.login-password-toggle.login-password-toggle.login-password-toggle,
html[data-theme='light'] .login-shell .login-input-wrap button.login-password-toggle.login-password-toggle.login-password-toggle {
  background: transparent !important;
  border-color: transparent !important;
  box-shadow: none !important;
  color: #b4bdca !important;
}

.google-mark {
  font-size: 22px;
  line-height: 1;
  font-weight: 850;
  background: conic-gradient(from -35deg, #4285f4 0 28%, #34a853 28% 45%, #fbbc05 45% 64%, #ea4335 64% 84%, #4285f4 84% 100%);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}

.microsoft-mark {
  width: 18px;
  height: 18px;
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  grid-template-rows: repeat(2, 1fr);
  gap: 2px;
}

.microsoft-mark i {
  display: block;
}

.microsoft-mark i:nth-child(1) { background: #f35325; }
.microsoft-mark i:nth-child(2) { background: #81bc06; }
.microsoft-mark i:nth-child(3) { background: #05a6f0; }
.microsoft-mark i:nth-child(4) { background: #ffba08; }

.employee-login-panel {
  margin-top: 22px;
  padding: 16px;
  border: 1px solid rgba(34, 197, 94, 0.24);
  border-radius: 8px;
  display: grid;
  gap: 16px;
  background: rgba(8, 23, 15, 0.46);
  color: #22c55e;
  font-size: 15px;
  font-weight: 560;
}

.employee-login-link {
  min-height: 48px;
  width: 100%;
  border: 1px solid #22c55e;
  border-radius: 8px;
  color: #22c55e;
  background: rgba(34, 197, 94, 0.04);
  text-decoration: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  font-size: 15px;
  font-weight: 760;
  text-align: center;
  padding: 0 14px;
}

html[data-theme='dark'] .login-shell .employee-login-link,
html[data-theme='light'] .login-shell .employee-login-link,
.login-shell .employee-login-link {
  background: rgba(34, 197, 94, 0.04) !important;
  border-color: #22c55e !important;
  color: #22c55e !important;
  box-shadow: none !important;
}

.employee-login-link:hover {
  background: rgba(34, 197, 94, 0.12);
}

html[data-theme='dark'] .login-shell .employee-login-link:hover,
html[data-theme='light'] .login-shell .employee-login-link:hover {
  background: rgba(34, 197, 94, 0.12) !important;
}

.login-create-line {
  margin-top: 18px;
  color: #aab3bf;
  font-size: 15px;
  text-align: center;
}

@media (min-width: 1060px) {
  .login-shell {
    grid-template-columns: minmax(0, 1.05fr) minmax(480px, 0.95fr);
    height: 100vh;
    height: 100svh;
    overflow: hidden;
  }
}

@media (min-width: 1060px) and (max-height: 1000px) {
  .login-visual {
    padding: 36px 48px;
  }

  .login-logo-mark {
    width: 46px;
    height: 46px;
  }

  .login-hero-copy {
    margin-top: 42px;
    max-width: 680px;
  }

  .login-shell .login-hero-title {
    font-size: 50px !important;
    line-height: 1.18 !important;
  }

  .login-hero-subtitle {
    margin-top: 18px;
    max-width: 530px;
    font-size: 18px;
    line-height: 1.52;
  }

  .login-stats {
    left: 48px;
    top: calc(100svh - 260px);
    width: min(520px, calc(100% - 96px));
    gap: 16px;
  }

  .login-stat {
    min-height: 126px;
    gap: 10px;
    padding: 20px 22px;
  }

  .login-stat strong {
    font-size: 30px;
  }

  .login-stat span {
    font-size: 14px;
    line-height: 1.35;
  }

  .login-footer-line {
    left: 48px;
    top: calc(100svh - 66px);
    gap: 16px;
    font-size: 14px;
  }

  .login-form-panel {
    padding: 28px 44px;
  }

  .login-auth-panel {
    width: min(100%, 520px);
    padding: 30px 48px;
  }

  .login-panel-header {
    margin-bottom: 18px;
  }

  .login-panel-title {
    font-size: 32px;
    margin-bottom: 8px;
  }

  .login-panel-subtitle {
    font-size: 14px;
    line-height: 1.45;
  }

  .login-form {
    gap: 12px;
  }

  .login-alert {
    padding: 8px 12px;
    font-size: 13px;
    line-height: 1.35;
  }

  .login-field {
    gap: 8px;
  }

  .login-field > span,
  .login-field-row > span {
    font-size: 14px;
  }

  .login-input-wrap {
    min-height: 44px;
    padding: 0 14px;
  }

  .login-primary-button {
    min-height: 46px;
    font-size: 15px;
  }

  .login-divider {
    margin: 18px 0 14px;
  }

  .login-social-grid {
    gap: 10px;
  }

  .login-social-button {
    min-height: 44px;
    font-size: 15px;
  }

  .employee-login-panel {
    margin-top: 16px;
    padding: 12px;
    gap: 10px;
    font-size: 14px;
  }

  .employee-login-link {
    min-height: 42px;
    font-size: 14px;
  }

  .login-create-line {
    margin-top: 14px;
    font-size: 14px;
  }
}

@media (max-width: 1059px) {
  .login-shell {
    grid-template-columns: 1fr;
  }

  .login-visual {
    min-height: auto;
    border-right: 0;
    border-bottom: 1px solid rgba(148, 163, 184, 0.18);
  }

  .login-form-panel {
    min-height: auto;
  }

  .login-hero-copy {
    margin-top: 34px;
  }

  .login-stats {
    position: static;
    width: auto;
    max-width: none;
    margin-top: 34px;
    margin-bottom: 0;
  }

  .login-footer-line {
    position: static;
    margin-top: 26px;
  }
}

@media (max-width: 760px) {
  .login-shell {
    display: flex;
    flex-direction: column;
    background: #05080b;
  }

  .login-shell::before {
    content: "";
    position: absolute;
    inset: 0;
    z-index: -1;
    pointer-events: none;
    background: linear-gradient(180deg, rgba(0, 0, 0, 0.8) 0%, rgba(0, 0, 0, 0.84) 55%, rgba(0, 0, 0, 0.9) 100%);
  }

  .login-bg-video-desktop {
    display: none;
  }

  .login-bg-video-mobile {
    display: block;
  }

  .login-visual {
    flex: 0 0 auto;
    width: 100%;
    max-width: 100vw;
    min-height: 0;
    padding: 0;
    border: 0;
    background: none;
    align-items: center;
  }

  .login-visual::after {
    display: none;
  }

  .login-brand {
    align-self: center;
    justify-content: center;
    gap: 10px;
    width: 100%;
    padding: 32px 0 0;
  }

  .login-logo-mark {
    width: 38px;
    height: 38px;
    border-radius: 9px;
    font-size: 18px;
  }

  .login-wordmark {
    font-size: 19px;
  }

  .login-hero-copy,
  .login-stats,
  .login-footer-line {
    display: none;
  }

  .login-form-panel {
    flex: 1 1 auto;
    width: 100%;
    max-width: 100vw;
    flex-direction: column;
    align-items: stretch;
    justify-content: flex-end;
    background: none;
    padding: 0 14px 18px;
  }

  .login-auth-panel {
    width: 100%;
    max-width: 100%;
    border: 1px solid rgba(148, 163, 184, 0.22);
    border-radius: 16px;
    padding: 20px 18px;
    background: none;
    box-shadow: none;
    backdrop-filter: none;
  }

  html[data-theme='dark'] .login-shell .login-form-panel,
  html[data-theme='light'] .login-shell .login-form-panel,
  html[data-theme='dark'] .login-shell .login-auth-panel,
  html[data-theme='light'] .login-shell .login-auth-panel,
  html[data-theme='dark'] .login-shell .employee-login-panel,
  html[data-theme='light'] .login-shell .employee-login-panel,
  html[data-theme='dark'] .login-shell .login-panel-title,
  html[data-theme='light'] .login-shell .login-panel-title,
  html[data-theme='dark'] .login-shell .login-panel-subtitle,
  html[data-theme='light'] .login-shell .login-panel-subtitle {
    background: none !important;
    box-shadow: none !important;
    backdrop-filter: none !important;
  }

  html[data-theme='dark'] .login-shell .login-panel-header.login-panel-header.login-panel-header.login-panel-header,
  html[data-theme='light'] .login-shell .login-panel-header.login-panel-header.login-panel-header.login-panel-header {
    background: none !important;
    box-shadow: none !important;
  }

  .login-panel-header {
    margin-bottom: 16px;
  }

  .login-shell .login-panel-title {
    font-size: 24px;
    margin-bottom: 8px;
  }

  .login-panel-subtitle {
    font-size: 13px;
    line-height: 1.45;
  }

  .login-form {
    gap: 11px;
  }

  .login-field {
    gap: 7px;
  }

  .login-field > span,
  .login-field-row > span {
    font-size: 13px;
  }

  .login-input-wrap {
    min-height: 44px;
    gap: 10px;
    padding: 0 13px;
  }

  .login-input-wrap svg {
    width: 17px;
    height: 17px;
  }

  .login-shell .login-control {
    font-size: 14px;
  }

  .login-accent-link {
    font-size: 13px;
  }

  .login-alert {
    padding: 9px 12px;
    font-size: 13px;
  }

  .login-primary-button {
    min-height: 44px;
    font-size: 15px;
  }

  .login-divider {
    margin: 14px 0 10px;
    font-size: 13px;
  }

  .login-social-grid {
    gap: 9px;
  }

  .login-social-button {
    min-height: 44px;
    font-size: 14px;
    gap: 12px;
  }

  .google-mark {
    font-size: 19px;
  }

  .microsoft-mark {
    width: 16px;
    height: 16px;
  }

  .employee-login-panel {
    margin-top: 12px;
    padding: 11px;
    gap: 9px;
    font-size: 13px;
  }

  .employee-login-link {
    min-height: 40px;
    font-size: 13px;
  }

  .login-create-line {
    margin-top: 11px;
    font-size: 13px;
  }
}

@media (max-width: 430px) {
  .login-logo-mark {
    width: 36px;
    height: 36px;
    font-size: 17px;
  }

  .login-wordmark {
    font-size: 18px;
  }
}
`
