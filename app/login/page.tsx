'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { FormEvent, useState } from 'react'
import { Eye, EyeOff, Lock, Mail } from 'lucide-react'

const usersKey = 'flowsys-auth-users'
const sessionKey = 'flowsys-auth-session'
const onboardingKey = 'flowsys-onboarding'
const accountKey = 'flowsys-account'

interface AuthUser {
  id: number
  name: string
  email: string
  password: string
  provider: 'email' | 'gmail' | 'facebook'
}

interface AccountState {
  role?: 'Admin' | 'Project Manager' | 'Support' | 'Client'
  onboardingComplete?: boolean
}

const loadUsers = () => {
  if (typeof window === 'undefined') return []

  try {
    const stored = window.localStorage.getItem(usersKey)
    return stored ? (JSON.parse(stored) as AuthUser[]) : []
  } catch {
    return []
  }
}

export default function LoginPage() {
  const router = useRouter()
  const [users, setUsers] = useState<AuthUser[]>(loadUsers)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')

  const saveSession = (user: AuthUser) => {
    const accountRaw = window.localStorage.getItem(accountKey)
    const account = accountRaw ? (JSON.parse(accountRaw) as AccountState) : {}
    window.localStorage.setItem(sessionKey, JSON.stringify({ userId: user.id, email: user.email, provider: user.provider, role: account.role || 'Admin' }))
    const stored = window.localStorage.getItem(onboardingKey)
    const onboarding = stored ? JSON.parse(stored) as { complete?: boolean } : null
    if (!onboarding?.complete && !account.onboardingComplete) {
      router.push('/onboarding')
      return
    }

    router.push(account.role === 'Client' ? '/client-portal' : '/dashboard')
  }

  const login = (event: FormEvent) => {
    event.preventDefault()
    const user = users.find(item => item.email.toLowerCase() === email.trim().toLowerCase() && item.password === password)

    if (!user) {
      setError('Email or password is incorrect.')
      return
    }

    saveSession(user)
  }

  const socialLogin = (provider: 'gmail' | 'facebook') => {
    const emailAddress = provider === 'gmail' ? 'gmail.user@example.com' : 'facebook.user@example.com'
    const existing = users.find(user => user.email === emailAddress)
    const user =
      existing ||
      {
        id: users.reduce((max, item) => Math.max(max, item.id), 0) + 1,
        name: provider === 'gmail' ? 'Gmail User' : 'Facebook User',
        email: emailAddress,
        password: '',
        provider,
      }

    if (!existing) {
      const nextUsers = [...users, user]
      setUsers(nextUsers)
      window.localStorage.setItem(usersKey, JSON.stringify(nextUsers))
    }

    saveSession(user)
  }

  return (
    <AuthShell title="Welcome back" subtitle="Log in to manage projects, finances, resources, and conversations.">
      <form onSubmit={login} style={{ display: 'grid', gap: 14 }}>
        {error && <div style={alertStyle}>{error}</div>}

        <label style={fieldGroupStyle}>
          <span style={labelStyle}>Email</span>
          <div style={inputWrapStyle}>
            <Mail size={17} color="#64748b" />
            <input value={email} onChange={event => setEmail(event.target.value)} type="email" placeholder="you@example.com" required style={inputStyle} />
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

      <div style={{ textAlign: 'center', fontSize: 13, color: '#64748b', marginTop: 18 }}>
        No account yet? <Link href="/signup" style={{ color: '#111827', fontWeight: 600, textDecoration: 'none' }}>Create one</Link>
      </div>
    </AuthShell>
  )
}

function AuthShell({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <main style={{ minHeight: '100vh', background: '#eef2f7', display: 'grid', gridTemplateColumns: 'minmax(320px, 0.9fr) minmax(360px, 1fr)', fontFamily: "'DM Sans', sans-serif" }}>
      <section style={{ background: '#111827', color: '#fff', padding: '56px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 80 }}>
            <div style={{ width: 40, height: 40, borderRadius: 11, background: '#1db954', color: '#191414', display: 'grid', placeItems: 'center', fontWeight: 600 }}>W</div>
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
const socialButtonStyle = { height: 42, border: '1px solid #e5e7eb', borderRadius: 10, background: '#fff', color: '#111827', fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8 }
const ghostIconButtonStyle = { border: 'none', background: 'transparent', color: '#64748b', cursor: 'pointer', display: 'inline-flex', padding: 0 }
const alertStyle = { padding: '10px 12px', borderRadius: 10, background: '#fef2f2', color: '#dc2626', fontSize: 13, fontWeight: 600 }
