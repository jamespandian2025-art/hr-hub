'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Eye, Lock, Mail } from 'lucide-react'
import { employeeKey, type Employee, loadStored, saveStored } from '../employeeData'
import { checkLoginAllowed, recordLoginAttempt } from '@/lib/auth/sessionClient'
import { withCsrfHeaders } from '@/lib/security/csrfClient'

const DEMO_EMAIL = 'demo@wiseflow.employee'
const DEMO_PASSWORD = 'demo12345'

function uniqueEmployees(rows: Employee[]) {
  const map = new Map<string, Employee>()
  rows.forEach(employee => {
    const key = employee.id || employee.employeeId || employee.portalEmail || employee.email
    if (!key) return
    map.set(String(key), { ...map.get(String(key)), ...employee })
  })
  return Array.from(map.values())
}

function rememberEmployeeForPortal(employee: Employee) {
  const current = loadStored<Employee[]>(employeeKey, [])
  const next = uniqueEmployees([...(Array.isArray(current) ? current : []), employee])
  saveStored(employeeKey, next)
}

export default function EmployeeLoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [notice, setNotice] = useState('')
  const [signingIn, setSigningIn] = useState(false)

  const signIn = async () => {
    setNotice('')
    if (!email.trim()) {
      setNotice('Please enter your email address.')
      return
    }
    if (!password.trim()) {
      setNotice('Please enter your temporary password.')
      return
    }
    setSigningIn(true)
    try {
      const loginEmail = email.trim().toLowerCase()
      await checkLoginAllowed(loginEmail)
      const remoteResponse = await fetch('/api/hr/employee-portal-login', {
        method: 'POST',
        headers: withCsrfHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ email: loginEmail, password }),
      })
      const remotePayload = await remoteResponse.json().catch(() => null) as { ok?: boolean; employee?: Employee; account?: Record<string, unknown> } | null
      if (remoteResponse.ok && remotePayload?.ok && remotePayload.employee && remotePayload.account) {
        rememberEmployeeForPortal(remotePayload.employee)
        saveStored('flowsys-auth-session', remotePayload.account)
        saveStored('flowsys-account', remotePayload.account)
        saveStored('flowsys-employee-session', remotePayload.account)
        await recordLoginAttempt(loginEmail, true)
        router.push('/employee/dashboard')
        return
      }

      setNotice(remotePayload?.ok === false ? 'Email or password is incorrect.' : 'Employee portal sign-in is only available through the secure HR records service.')
      await recordLoginAttempt(loginEmail, false)
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Sign in failed. Please try again.')
    } finally {
      setSigningIn(false)
    }
  }

  return (
    <main style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 24, background: 'linear-gradient(135deg, rgba(15,61,42,0.18), rgba(255,255,255,0.72)), radial-gradient(circle at 20% 30%, rgba(34,197,94,0.18), transparent 30%), #eef4f1' }}>
      <section style={{ width: 'min(100%, 520px)', borderRadius: 20, background: 'rgba(255,255,255,0.9)', border: '1px solid rgba(226,232,240,0.9)', boxShadow: '0 24px 70px rgba(15,23,42,0.16)', padding: '42px 44px' }}>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <h1 style={{ margin: 0, fontSize: 32, color: '#0f172a' }}>Welcome Back</h1>
          <p style={{ margin: '10px 0 0', color: '#000000' }}>Sign in to your employee portal account.</p>
        </div>
        {notice && <div style={{ padding: 12, borderRadius: 8, background: '#fef2f2', color: '#dc2626', fontWeight: 800, fontSize: 13, marginBottom: 14 }}>{notice}</div>}
        <label style={labelStyle}>Email Address
          <span style={fieldStyle}><Mail size={18} /><input value={email} onChange={event => setEmail(event.target.value)} placeholder="Enter your email" style={inputStyle} /></span>
        </label>
        <label style={{ ...labelStyle, marginTop: 18 }}>Password
          <span style={fieldStyle}><Lock size={18} /><input value={password} onChange={event => setPassword(event.target.value)} type="password" placeholder="Enter your password" style={inputStyle} /><Eye size={18} /></span>
        </label>
        <button type="button" onClick={signIn} disabled={signingIn} style={{ width: '100%', height: 52, border: 0, borderRadius: 8, marginTop: 26, background: signingIn ? '#15803d' : '#16a34a', color: '#ffffff', fontWeight: 900, fontSize: 15, cursor: signingIn ? 'wait' : 'pointer', opacity: signingIn ? 0.86 : 1 }}>{signingIn ? 'Signing In...' : 'Sign In'}</button>
        <div style={{ marginTop: 16, padding: 14, borderRadius: 10, background: '#f0fdf4', border: '1px solid #bbf7d0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
            <strong style={{ fontSize: 12.5, color: '#14532d' }}>Try the demo account</strong>
            <button type="button" onClick={() => { setEmail(DEMO_EMAIL); setPassword(DEMO_PASSWORD); setNotice('') }} style={{ border: '1px solid #16a34a', background: '#fff', color: '#15803d', fontWeight: 800, fontSize: 12, borderRadius: 6, padding: '6px 10px', cursor: 'pointer' }}>Use demo</button>
          </div>
          <p style={{ margin: '8px 0 0', color: '#166534', fontSize: 12, lineHeight: 1.5 }}>Email: <strong>{DEMO_EMAIL}</strong><br />Password: <strong>{DEMO_PASSWORD}</strong></p>
        </div>
        <p style={{ textAlign: 'center', margin: '18px 0 0', color: '#000000', fontSize: 13 }}>Use the login email and password generated by HR.</p>
        <p style={{ textAlign: 'center', margin: '10px 0 0', color: '#000000', fontSize: 13 }}>
          <Link href="/account-recovery?type=employee" style={{ color: '#14532d', fontWeight: 900, textDecoration: 'none' }}>Forgot password?</Link>
        </p>
      </section>
    </main>
  )
}

const labelStyle = { display: 'grid', gap: 8, color: '#0f172a', fontSize: 13, fontWeight: 850 } as const
const fieldStyle = {
  height: 52,
  border: '1px solid #e2e8f0',
  borderRadius: 8,
  display: 'flex',
  alignItems: 'center',
  gap: 12,
  padding: '0 14px',
  color: '#16a34a',
} as const
const inputStyle = { width: '100%', border: 0, outline: 0, background: 'transparent', color: '#0f172a', font: 'inherit' } as const
