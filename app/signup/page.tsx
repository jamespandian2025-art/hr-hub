'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { FormEvent, useState } from 'react'
import { Building2, Eye, EyeOff, Lock, Mail, User } from 'lucide-react'

const usersKey = 'flowsys-auth-users'
const sessionKey = 'flowsys-auth-session'
const accountKey = 'flowsys-account'

interface AuthUser {
  id: number
  name: string
  email: string
  password: string
  provider: 'email' | 'gmail' | 'facebook'
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

export default function SignupPage() {
  const router = useRouter()
  const [users, setUsers] = useState<AuthUser[]>(loadUsers)
  const [name, setName] = useState('')
  const [company, setCompany] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')

  const saveUser = (user: AuthUser, companyName: string) => {
    const nextUsers = [...users.filter(item => item.email.toLowerCase() !== user.email.toLowerCase()), user]
    setUsers(nextUsers)
    window.localStorage.setItem(usersKey, JSON.stringify(nextUsers))
    window.localStorage.setItem(sessionKey, JSON.stringify({ userId: user.id, email: user.email, provider: user.provider }))
    window.localStorage.setItem(
      accountKey,
      JSON.stringify({
        company: companyName || user.name || 'WiseFlow Company',
        email: user.email,
        theme: 'System',
        density: 'Comfortable',
        emailNotifications: true,
        desktopNotifications: false,
        invitations: [],
      })
    )
    window.localStorage.removeItem('flowsys-onboarding')
    router.push('/onboarding')
  }

  const signup = (event: FormEvent) => {
    event.preventDefault()
    const trimmedEmail = email.trim().toLowerCase()
    if (users.some(user => user.email.toLowerCase() === trimmedEmail)) {
      setError('An account with this email already exists. Please log in instead.')
      return
    }

    saveUser(
      {
        id: users.reduce((max, user) => Math.max(max, user.id), 0) + 1,
        name: name.trim() || company.trim() || 'WiseFlow User',
        email: trimmedEmail,
        password,
        provider: 'email',
      },
      company.trim()
    )
  }

  const socialSignup = (provider: 'gmail' | 'facebook') => {
    const emailAddress = provider === 'gmail' ? 'gmail.user@example.com' : 'facebook.user@example.com'
    saveUser(
      {
        id: users.reduce((max, user) => Math.max(max, user.id), 0) + 1,
        name: provider === 'gmail' ? 'Gmail User' : 'Facebook User',
        email: emailAddress,
        password: '',
        provider,
      },
      provider === 'gmail' ? 'Gmail Company' : 'Facebook Company'
    )
  }

  return (
    <main style={{ minHeight: '100vh', background: '#eef2f7', display: 'grid', gridTemplateColumns: 'minmax(320px, 0.9fr) minmax(360px, 1fr)', fontFamily: "'DM Sans', sans-serif" }}>
      <section style={{ background: '#111827', color: '#fff', padding: '56px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 80 }}>
            <div style={{ width: 40, height: 40, borderRadius: 11, background: '#1db954', color: '#191414', display: 'grid', placeItems: 'center', fontWeight: 600 }}>W</div>
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
            <div style={{ fontSize: 26, color: '#111827', fontWeight: 600, marginBottom: 8 }}>Create account</div>
            <div style={{ fontSize: 13, color: '#64748b', lineHeight: 1.6 }}>Sign up to start managing your construction workflow.</div>
          </div>

          <form onSubmit={signup} style={{ display: 'grid', gap: 14 }}>
            {error && <div style={alertStyle}>{error}</div>}
            <Field icon={<User size={17} color="#64748b" />} label="Name"><input value={name} onChange={event => setName(event.target.value)} placeholder="Your name" required style={inputStyle} /></Field>
            <Field icon={<Building2 size={17} color="#64748b" />} label="Company"><input value={company} onChange={event => setCompany(event.target.value)} placeholder="Company name" required style={inputStyle} /></Field>
            <Field icon={<Mail size={17} color="#64748b" />} label="Email"><input value={email} onChange={event => setEmail(event.target.value)} type="email" placeholder="you@example.com" required style={inputStyle} /></Field>
            <label style={fieldGroupStyle}>
              <span style={labelStyle}>Password</span>
              <div style={inputWrapStyle}>
                <Lock size={17} color="#64748b" />
                <input value={password} onChange={event => setPassword(event.target.value)} type={showPassword ? 'text' : 'password'} placeholder="Create password" minLength={6} required style={inputStyle} />
                <button type="button" onClick={() => setShowPassword(!showPassword)} style={ghostIconButtonStyle}>{showPassword ? <EyeOff size={17} /> : <Eye size={17} />}</button>
              </div>
            </label>
            <button type="submit" style={primaryButtonStyle}>Create account</button>
          </form>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: 12, alignItems: 'center', margin: '20px 0', color: '#94a3b8', fontSize: 12, fontWeight: 600 }}>
            <span style={{ height: 1, background: '#e5e7eb' }} /> OR <span style={{ height: 1, background: '#e5e7eb' }} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <button type="button" onClick={() => socialSignup('gmail')} style={socialButtonStyle}><span style={{ color: '#dc2626', fontWeight: 600 }}>G</span>Sign up with Gmail</button>
            <button type="button" onClick={() => socialSignup('facebook')} style={socialButtonStyle}><span style={{ color: '#2563eb', fontWeight: 600 }}>f</span>Sign up with Facebook</button>
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
const primaryButtonStyle = { border: 'none', borderRadius: 10, background: '#111827', color: '#fff', height: 44, fontSize: 14, fontWeight: 600, cursor: 'pointer' }
const socialButtonStyle = { height: 42, border: '1px solid #e5e7eb', borderRadius: 10, background: '#fff', color: '#111827', fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8 }
const ghostIconButtonStyle = { border: 'none', background: 'transparent', color: '#64748b', cursor: 'pointer', display: 'inline-flex', padding: 0 }
const alertStyle = { padding: '10px 12px', borderRadius: 10, background: '#fef2f2', color: '#dc2626', fontSize: 13, fontWeight: 600 }
