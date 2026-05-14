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
        theme: account.theme || 'Google Green',
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
      <form onSubmit={login} style={{ display: 'grid', gap: 14 }}>
        {error && <div style={alertStyle}>{error}</div>}

        <label style={fieldGroupStyle}>
          <span style={labelStyle}>Email</span>
          <div style={inputWrapStyle}>
            <Mail size={17} color="#64748b" />
            <input value={email} onChange={event => setEmail(event.target.value)} type="email" placeholder="you@gmail.com" required style={inputStyle} />
          </div>
        </label>

        <label style={fieldGroupStyle}>
          <span style={labelStyle}>Password</span>
          <div style={inputWrapStyle}>
            <Lock size={17} color="#64748b" />
            <input value={password} onChange={event => setPassword(event.target.value)} type={showPassword ? 'text' : 'password'} placeholder="Enter password" required style={inputStyle} />
            <button type="button" onClick={() => setShowPassword(!showPassword)} style={ghostIconButtonStyle}>
              {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
            </button>
          </div>
        </label>

        <button type="submit" style={primaryButtonStyle}>Log in</button>
      </form>

      <SocialButtons onSocial={socialLogin} label="Log in" />

      <div style={{ marginTop: 18, padding: 12, borderRadius: 12, background: '#f0fdf4', border: '1px solid #bbf7d0', display: 'grid', gap: 8 }}>
        <div style={{ color: '#14532d', fontSize: 13, fontWeight: 700 }}>Logging in as an employee?</div>
        <Link href="/employee/login" style={employeeLoginLinkStyle}>Open Employee Self-Service Portal</Link>
      </div>

      <div style={{ textAlign: 'center', fontSize: 13, color: '#64748b', marginTop: 18 }}>
        No account yet? <Link href="/signup" style={{ color: '#111827', fontWeight: 600, textDecoration: 'none' }}>Create one</Link>
      </div>
    </AuthShell>
  )
}

function AuthShell({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <main style={{ minHeight: '100vh', background: '#eef2f7', display: 'grid', gridTemplateColumns: 'minmax(320px, 0.9fr) minmax(360px, 1fr)', fontFamily: "var(--font-body)" }}>
      <section style={{ background: '#111827', color: '#fff', padding: '56px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 80 }}>
            <div style={{ width: 40, height: 40, borderRadius: 11, background: '#22c55e', color: '#191414', display: 'grid', placeItems: 'center', fontWeight: 600 }}>W</div>
            <div style={{ fontSize: 20, fontWeight: 600 }}>WiseFlow</div>
          </div>
          <h1 style={{ color: '#fff', fontSize: 42, lineHeight: 1.05, marginBottom: 18 }}>Run your construction workflow in one place.</h1>
          <p style={{ color: '#cbd5e1', fontSize: 15, lineHeight: 1.7, maxWidth: 470 }}>Track projects, clients, budgets, bills, inventory, suppliers, and team messages with a focused business workspace.</p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
          {['Projects', 'Financials', 'Resources'].map(item => (
            <div key={item} style={{ border: '1px solid rgba(255,255,255,0.14)', borderRadius: 12, padding: 14, color: '#e5e7eb', fontSize: 13, fontWeight: 600 }}>{item}</div>
          ))}
        </div>
      </section>

      <section style={{ display: 'grid', placeItems: 'center', padding: '40px 24px' }}>
        <div style={{ width: 'min(430px, 100%)', background: '#fff', border: '1px solid #e5e7eb', borderRadius: 18, padding: 28, boxShadow: '0 24px 70px rgba(15,23,42,0.12)' }}>
          <div style={{ marginBottom: 22 }}>
            <div style={{ fontSize: 26, color: '#111827', fontWeight: 600, marginBottom: 8 }}>{title}</div>
            <div style={{ fontSize: 13, color: '#64748b', lineHeight: 1.6 }}>{subtitle}</div>
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
      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: 12, alignItems: 'center', margin: '20px 0', color: '#94a3b8', fontSize: 12, fontWeight: 600 }}>
        <span style={{ height: 1, background: '#e5e7eb' }} />
        OR
        <span style={{ height: 1, background: '#e5e7eb' }} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <button type="button" onClick={() => onSocial('gmail')} style={socialButtonStyle}><span style={{ color: '#dc2626', fontWeight: 600 }}>G</span>{label} with Gmail</button>
        <button type="button" onClick={() => onSocial('facebook')} style={socialButtonStyle}><span style={{ color: '#2563eb', fontWeight: 600 }}>f</span>{label} with Facebook</button>
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
