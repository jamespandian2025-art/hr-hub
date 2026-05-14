'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { FormEvent, useState } from 'react'
import { Building2, Eye, EyeOff, Lock, Mail, ShieldCheck, User } from 'lucide-react'
import {
  accountKey,
  type AccountRole,
  type AuthUser,
  createPasswordFields,
  isGmailAddress,
  loadAuthUsers,
  publicUser,
  saveAuthUsers,
  sessionKey,
  validatePasswordStrength,
} from '@/lib/auth/localAuth'

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

  const saveUser = (user: AuthUser, companyName: string, accountRole: AccountRole) => {
    const nextUsers = [...users.filter(item => item.email.toLowerCase() !== user.email.toLowerCase()), user]
    setUsers(nextUsers)
    saveAuthUsers(nextUsers)
    window.localStorage.setItem(sessionKey, JSON.stringify({ userId: user.id, email: user.email, provider: user.provider, role: accountRole }))
    window.localStorage.setItem(
      accountKey,
      JSON.stringify({
        user: publicUser(user),
        company: companyName || user.name || 'WiseFlow Company',
        email: user.email,
        role: accountRole,
        roleLocked: true,
        theme: 'Google Green',
        density: 'Comfortable',
        emailNotifications: true,
        desktopNotifications: false,
        invitations: [],
      })
    )
    window.localStorage.removeItem('flowsys-onboarding')
    router.push('/onboarding')
  }

  const signup = async (event: FormEvent) => {
    event.preventDefault()
    const trimmedEmail = email.trim().toLowerCase()
    if (!isGmailAddress(trimmedEmail)) {
      setError('Use a Gmail address for workspace signup.')
      return
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    const strength = validatePasswordStrength(password, { email: trimmedEmail, name })
    if (!strength.ok) {
      setError(strength.issues[0] || 'Use a stronger password.')
      return
    }

    if (users.some(user => user.email.toLowerCase() === trimmedEmail)) {
      setError('An account with this email already exists. Please log in instead.')
      return
    }

    const passwordFields = await createPasswordFields(password)
    saveUser(
      {
        id: users.reduce((max, user) => Math.max(max, user.id), 0) + 1,
        name: name.trim() || company.trim() || 'WiseFlow User',
        email: trimmedEmail,
        ...passwordFields,
        provider: 'email',
        role,
      },
      company.trim(),
      role,
    )
  }

  const socialSignup = (provider: 'gmail' | 'facebook') => {
    setError(provider === 'gmail'
      ? 'Use your Gmail address with a protected password. Google OAuth can be connected after deployment.'
      : 'Facebook signup is disabled for HR HUB.')
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
            <div style={{ fontSize: 26, color: '#111827', fontWeight: 600, marginBottom: 8 }}>Create account</div>
            <div style={{ fontSize: 13, color: '#64748b', lineHeight: 1.6 }}>Create the secure Admin owner account first. HR and Finance accounts should be invited or assigned by Admin.</div>
          </div>

          <form onSubmit={signup} style={{ display: 'grid', gap: 14 }}>
            {error && <div style={alertStyle}>{error}</div>}
            <Field icon={<User size={17} color="#64748b" />} label="Name"><input value={name} onChange={event => setName(event.target.value)} placeholder="Your name" required style={inputStyle} /></Field>
            <Field icon={<Building2 size={17} color="#64748b" />} label="Company"><input value={company} onChange={event => setCompany(event.target.value)} placeholder="Company name" required style={inputStyle} /></Field>
            <Field icon={<Mail size={17} color="#64748b" />} label="Gmail address"><input value={email} onChange={event => setEmail(event.target.value)} type="email" placeholder="you@gmail.com" required style={inputStyle} /></Field>
            <label style={fieldGroupStyle}>
              <span style={labelStyle}>Workspace role</span>
              <div style={inputWrapStyle}>
                <ShieldCheck size={17} color="#64748b" />
                <input value="Admin owner" readOnly style={inputStyle} />
              </div>
              <span style={hintStyle}>Finance and HR are sensitive roles. Admin assigns them after workspace setup.</span>
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
            <button type="submit" style={primaryButtonStyle}>Create account</button>
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
