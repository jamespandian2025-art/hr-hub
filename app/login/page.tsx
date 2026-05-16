'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { FormEvent, useEffect, useState } from 'react'
import { Eye, EyeOff, Lock, Mail } from 'lucide-react'
import { getSupabaseBrowserClient, hasSupabaseConfig } from '@/lib/auth/supabaseClient'
import {
  accountKey,
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
  role?: 'Admin' | 'Finance' | 'HR' | 'Project Manager' | 'Support' | 'Client'
  roleLocked?: boolean
  onboardingComplete?: boolean
}

const accountRoles = new Set(['Admin', 'Finance', 'HR', 'Project Manager', 'Support', 'Client'])

function invitedRole(input: unknown): AccountState['role'] | null {
  if (typeof input !== 'string') return null
  if (accountRoles.has(input)) return input as AccountState['role']
  if (input === 'Member') return 'Support'
  return null
}

function routeForRole(role?: AccountState['role']) {
  if (role === 'Client') return '/client-portal'
  if (role === 'Finance') return '/financials/loan-management'
  if (role === 'HR') return '/hr/overview'
  return '/dashboard'
}

function existingSessionRoute() {
  try {
    if (window.localStorage.getItem(logoutIntentKey)) return null

    const sessionRaw = window.localStorage.getItem(sessionKey)
    if (!sessionRaw) return null

    const accountRaw = window.localStorage.getItem(accountKey)
    const account = accountRaw ? (JSON.parse(accountRaw) as AccountState) : {}
    const session = JSON.parse(sessionRaw) as { role?: AccountState['role'] }
    const stored = window.localStorage.getItem(onboardingKey)
    const onboarding = stored ? JSON.parse(stored) as { complete?: boolean } : null

    if (!onboarding?.complete && !account.onboardingComplete) return '/onboarding'
    return routeForRole(session.role || account.role)
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
    const completeGoogleLogin = async (sessionUser: { id: string; email?: string; user_metadata?: { full_name?: string; name?: string; role?: string } }) => {
      if (!mounted) return
      if (window.localStorage.getItem(logoutIntentKey)) return

      const userEmail = (sessionUser.email || '').trim().toLowerCase()
      const registeredUsers = loadAuthUsers()
      let registeredUser = registeredUsers.find(user => user.email.toLowerCase() === userEmail)
      const roleFromInvite = invitedRole(sessionUser.user_metadata?.role)
      const accountRaw = window.localStorage.getItem(accountKey)
      const account = accountRaw ? (JSON.parse(accountRaw) as AccountState) : {}

      if (!registeredUser && roleFromInvite) {
        registeredUser = {
          id: registeredUsers.reduce((max, user) => Math.max(max, user.id), 0) + 1,
          name: sessionUser.user_metadata?.full_name || sessionUser.user_metadata?.name || userEmail.split('@')[0] || 'Invited User',
          email: userEmail,
          provider: 'gmail',
          role: roleFromInvite,
        }
        saveAuthUsers([...registeredUsers, registeredUser])
      }

      if (!registeredUser && account.role === 'Admin' && account.roleLocked === true && account.email?.toLowerCase() === userEmail) {
        registeredUser = {
          id: registeredUsers.reduce((max, user) => Math.max(max, user.id), 0) + 1,
          name: account.fullName || account.name || sessionUser.user_metadata?.full_name || sessionUser.user_metadata?.name || userEmail.split('@')[0] || 'Admin Owner',
          email: userEmail,
          provider: 'gmail',
          role: 'Admin',
        }
        saveAuthUsers([...registeredUsers, registeredUser])
      }

      if (!registeredUser) {
        setError('No HR HUB account exists for this Gmail. Please create the first Admin account or ask your Admin to invite you.')
        await supabase.auth.signOut()
        return
      }

      const userName = registeredUser.name || sessionUser.user_metadata?.full_name || sessionUser.user_metadata?.name || userEmail.split('@')[0] || 'Google User'
      const role = registeredUser.role || account.role || 'Admin'
      window.localStorage.setItem(sessionKey, JSON.stringify({ userId: registeredUser.id, email: userEmail, provider: registeredUser.provider, role }))
      window.localStorage.setItem(accountKey, JSON.stringify({
        ...account,
        user: publicUser({ ...registeredUser, name: userName, role }),
        name: userName,
        fullName: userName,
        email: userEmail,
        role,
        theme: account.theme || 'WiseFlow Light',
      }))
      const stored = window.localStorage.getItem(onboardingKey)
      const onboarding = stored ? JSON.parse(stored) as { complete?: boolean } : null
      router.replace(!onboarding?.complete && !account.onboardingComplete ? '/onboarding' : routeForRole(role))
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

  const saveSession = (user: AuthUser) => {
    const accountRaw = window.localStorage.getItem(accountKey)
    const account = accountRaw ? (JSON.parse(accountRaw) as AccountState) : {}
    const role = user.role || account.role || 'Admin'
    window.localStorage.setItem(sessionKey, JSON.stringify({ userId: user.id, email: user.email, provider: user.provider, role }))
    window.localStorage.setItem(accountKey, JSON.stringify({ ...account, user: publicUser(user), email: user.email, role }))
    const stored = window.localStorage.getItem(onboardingKey)
    const onboarding = stored ? JSON.parse(stored) as { complete?: boolean } : null
    if (!onboarding?.complete && !account.onboardingComplete) {
      router.push('/onboarding')
      return
    }

    router.push(routeForRole(role))
  }

  const login = async (event: FormEvent) => {
    event.preventDefault()
    const trimmedEmail = email.trim().toLowerCase()
    if (!isGmailAddress(trimmedEmail)) {
      setError('Use the Gmail address registered for this workspace.')
      return
    }

    const user = users.find(item => item.email.toLowerCase() === trimmedEmail)
    const passwordMatches = user ? await verifyPassword(user, password) : false

    if (!user || !passwordMatches) {
      setError('Email or password is incorrect.')
      return
    }

    if (user.password && !user.passwordHash) {
      const passwordFields = await createPasswordFields(password)
      const migrated = { ...user, ...passwordFields, password: undefined }
      const nextUsers = users.map(item => item.id === user.id ? migrated : item)
      setUsers(nextUsers)
      saveAuthUsers(nextUsers)
      saveSession(migrated)
      return
    }

    saveSession(user)
  }

  const socialLogin = (provider: 'gmail' | 'facebook') => {
    if (provider !== 'gmail') {
      setError('Facebook login is disabled for HR HUB. Use your registered Gmail and password.')
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
    <AuthShell title="Welcome back" subtitle="Log in to manage projects, finances, resources, and conversations.">
      <form onSubmit={login} className="login-form">
        {error && <div style={alertStyle}>{error}</div>}

        <label className="login-field" style={fieldGroupStyle}>
          <span style={labelStyle}>Email</span>
          <div className="login-input-wrap" style={inputWrapStyle}>
            <Mail size={17} color="#64748b" />
            <input value={email} onChange={event => setEmail(event.target.value)} type="email" placeholder="you@gmail.com" required style={inputStyle} />
          </div>
        </label>

        <label className="login-field" style={fieldGroupStyle}>
          <span style={labelStyle}>Password</span>
          <div className="login-input-wrap" style={inputWrapStyle}>
            <Lock size={17} color="#64748b" />
            <input value={password} onChange={event => setPassword(event.target.value)} type={showPassword ? 'text' : 'password'} placeholder="Enter password" required style={inputStyle} />
            <button type="button" className="login-password-toggle" onClick={() => setShowPassword(!showPassword)} style={ghostIconButtonStyle} aria-label={showPassword ? 'Hide password' : 'Show password'}>
              {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
            </button>
          </div>
        </label>

        <button type="submit" className="login-primary-button" style={primaryButtonStyle}>Log in</button>
      </form>

      <SocialButtons onSocial={socialLogin} label="Log in" />

      <div className="employee-login-panel" style={{ marginTop: 18, padding: 12, borderRadius: 12, background: '#f0fdf4', border: '1px solid #bbf7d0', display: 'grid', gap: 8 }}>
        <div style={{ color: '#14532d', fontSize: 13, fontWeight: 700 }}>Logging in as an employee?</div>
        <Link href="/employee/login" className="employee-login-link" style={employeeLoginLinkStyle}>Open Employee Self-Service Portal</Link>
      </div>

      <div className="login-create-line" style={{ textAlign: 'center', fontSize: 13, color: '#64748b', marginTop: 18 }}>
        No account yet? <Link href="/signup" className="login-create-link" style={{ color: '#111827', fontWeight: 600, textDecoration: 'none' }}>Create one</Link>
      </div>
    </AuthShell>
  )
}

function AuthShell({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <main className="login-page-shell" style={{ fontFamily: "var(--font-body)" }}>
      <style>{loginCss}</style>
      <section className="login-hero" style={{ background: '#111827', color: '#fff' }}>
        <div>
          <div className="login-brand">
            <div className="login-logo-mark">W</div>
            <div className="login-wordmark">WiseFlow</div>
          </div>
          <div className="login-hero-copy">
            <h1 className="login-hero-title">Run your construction workflow in one place.</h1>
            <p className="login-hero-subtitle">Track projects, clients, budgets, bills, inventory, suppliers, and team messages with a focused business workspace.</p>
          </div>
        </div>
        <div className="login-feature-pills">
          {['Projects', 'Financials', 'Resources'].map(item => (
            <div key={item} className="login-feature-pill">{item}</div>
          ))}
        </div>
      </section>

      <section className="login-form-panel">
        <div className="login-card">
          <div className="login-card-header">
            <div className="login-card-title">{title}</div>
            <div className="login-card-subtitle">{subtitle}</div>
          </div>
          {children}
        </div>
      </section>
    </main>
  )
}

function SocialButtons({ onSocial, label }: { onSocial: (provider: 'gmail' | 'facebook') => void; label: string }) {
  return (
    <>
      <div className="login-divider" style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: 12, alignItems: 'center', margin: '20px 0', color: '#94a3b8', fontSize: 12, fontWeight: 600 }}>
        <span style={{ height: 1, background: '#e5e7eb' }} />
        OR
        <span style={{ height: 1, background: '#e5e7eb' }} />
      </div>
      <div className="login-social-grid">
        <button type="button" className="login-social-button" onClick={() => onSocial('gmail')} style={socialButtonStyle}><span style={{ color: '#dc2626', fontWeight: 600 }}>G</span>{label} with Gmail</button>
        <button type="button" className="login-social-button" onClick={() => onSocial('facebook')} style={socialButtonStyle}><span style={{ color: '#2563eb', fontWeight: 600 }}>f</span>{label} with Facebook</button>
      </div>
    </>
  )
}

const fieldGroupStyle = { display: 'grid', gap: 7 }
const labelStyle = { fontSize: 12, color: '#374151', fontWeight: 600 }
const inputWrapStyle = { height: 44, border: '1px solid #e5e7eb', borderRadius: 10, display: 'flex', alignItems: 'center', gap: 9, padding: '0 12px', background: '#fff' }
const inputStyle = { border: 'none', outline: 'none', flex: 1, minWidth: 0, fontSize: 14, color: '#111827', background: 'transparent' }
const primaryButtonStyle = { border: 'none', borderRadius: 10, background: '#111827', color: '#fff', height: 44, fontSize: 14, fontWeight: 600, cursor: 'pointer' }
const employeeLoginLinkStyle = { height: 38, borderRadius: 10, background: '#16a34a', color: '#fff', fontSize: 13, fontWeight: 800, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }
const socialButtonStyle = { height: 42, border: '1px solid #e5e7eb', borderRadius: 10, background: '#fff', color: '#111827', fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8 }
const ghostIconButtonStyle = { border: 'none', background: 'transparent', color: '#64748b', cursor: 'pointer', display: 'inline-flex', padding: 0 }
const alertStyle = { padding: '10px 12px', borderRadius: 10, background: '#fef2f2', color: '#dc2626', fontSize: 13, fontWeight: 600 }

const loginCss = `
.login-page-shell,
.login-page-shell * {
  box-sizing: border-box;
}

.login-page-shell {
  min-height: 100svh;
  width: 100%;
  max-width: 100vw;
  overflow-x: hidden;
  background: #eef2f7;
  display: flex;
  flex-direction: column;
}

.login-hero {
  padding: 24px clamp(18px, 6vw, 56px) 18px;
  background: #eef2f7 !important;
  color: #111827 !important;
}

.login-brand {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
}

.login-logo-mark {
  width: 40px;
  height: 40px;
  border-radius: 11px;
  background: #22c55e;
  color: #191414;
  display: grid;
  place-items: center;
  font-weight: 600;
  flex: 0 0 auto;
}

.login-wordmark {
  color: #111827;
  font-size: clamp(18px, 4vw, 20px);
  font-weight: 600;
}

.login-hero-copy,
.login-feature-pills {
  display: none;
}

.login-form-panel {
  flex: 1;
  width: 100%;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding: clamp(16px, 5vw, 40px);
}

.login-card {
  width: min(100%, 430px);
  max-width: 100%;
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 18px;
  padding: clamp(20px, 5vw, 28px);
  box-shadow: 0 24px 70px rgba(15, 23, 42, 0.12);
}

.login-card-header {
  margin-bottom: 22px;
}

.login-card-title {
  color: #111827;
  font-size: clamp(24px, 6vw, 26px);
  font-weight: 600;
  line-height: 1.15;
  margin-bottom: 8px;
}

.login-card-subtitle {
  color: #64748b;
  font-size: 13px;
  line-height: 1.6;
}

.login-form {
  display: grid;
  gap: 14px;
}

.login-field,
.login-input-wrap,
.login-page-shell input,
.login-page-shell button,
.login-page-shell a {
  max-width: 100%;
}

.login-input-wrap {
  min-height: 46px;
  width: 100%;
}

.login-page-shell input {
  width: 100%;
}

.login-primary-button {
  background: #000000 !important;
  border-color: #000000 !important;
  color: #ffffff !important;
  min-height: 46px;
  width: 100%;
}
.login-primary-button:hover,
.login-primary-button:focus,
.login-primary-button:active {
  background: #000000 !important;
  border-color: #000000 !important;
  color: #ffffff !important;
}

.login-primary-button:focus-visible,
.login-social-button:focus-visible,
.employee-login-link:focus-visible,
.login-create-link:focus-visible,
.login-password-toggle:focus-visible,
.login-page-shell input:focus-visible {
  outline: 2px solid #2563eb;
  outline-offset: 2px;
}

.login-password-toggle {
  min-width: 32px;
  min-height: 32px;
  align-items: center;
  justify-content: center;
}

.login-divider {
  margin: 20px 0;
}

.login-social-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 10px;
}

.login-social-button {
  width: 100%;
  min-height: 44px;
  color: #111827 !important;
}

.employee-login-panel {
  margin-top: 18px;
}

.employee-login-link {
  min-height: 44px;
  width: 100%;
  background: #16a34a !important;
  color: #ffffff !important;
  text-align: center;
  padding: 0 12px;
}

.login-create-line {
  margin-top: 18px;
}

@media (max-width: 420px) {
  .login-hero {
    padding: 18px 16px 10px;
  }

  .login-form-panel {
    padding: 14px;
  }

  .login-card {
    padding: 20px 18px;
    border-radius: 16px;
  }
}

@media (min-width: 768px) {
  .login-hero {
    min-height: 320px;
    padding: 36px clamp(32px, 7vw, 56px);
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    gap: 40px;
    background: #111827 !important;
    color: #ffffff !important;
  }

  .login-brand {
    justify-content: flex-start;
  }

  .login-wordmark {
    color: #ffffff;
  }

  .login-hero-copy {
    display: block;
    margin-top: 44px;
  }

  .login-hero-title {
    color: #ffffff;
    font-size: clamp(32px, 5vw, 38px);
    line-height: 1.08;
    margin: 0 0 16px;
    max-width: 650px;
  }

  .login-hero-subtitle {
    color: #cbd5e1;
    font-size: clamp(14px, 1.6vw, 15px);
    line-height: 1.7;
    max-width: 560px;
    margin: 0;
  }

  .login-feature-pills {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 12px;
    max-width: 820px;
  }

  .login-feature-pill {
    border: 1px solid rgba(255, 255, 255, 0.14);
    border-radius: 12px;
    padding: 14px;
    color: #e5e7eb;
    font-size: 13px;
    font-weight: 600;
    min-width: 0;
  }

  .login-form-panel {
    padding: 40px 24px;
  }

  .login-card {
    width: min(430px, 100%);
  }

  .login-social-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (min-width: 1024px) {
  .login-page-shell {
    min-height: 100vh;
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  }

  .login-hero {
    min-height: 100vh;
    padding: clamp(32px, 4vw, 56px);
  }

  .login-hero-copy {
    margin-top: clamp(52px, 8vh, 80px);
  }

  .login-hero-title {
    font-size: clamp(36px, 3.1vw, 42px);
    max-width: 560px;
  }

  .login-hero-subtitle {
    max-width: 470px;
  }

  .login-form-panel {
    align-items: center;
    justify-content: center;
    padding: clamp(24px, 4vw, 56px);
  }
}
`
