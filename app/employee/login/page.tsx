'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Eye, Lock, Mail } from 'lucide-react'
import { employeeKey, Employee, fullName, isEmployeeTeamManager, loadStored, saveStored } from '../employeeData'

function text(value: unknown) {
  if (value === null || value === undefined) return ''
  if (typeof value === 'string') return value.trim().toLowerCase()
  if (typeof value === 'number' || typeof value === 'boolean') return String(value).trim().toLowerCase()
  return ''
}

function compact(value: unknown) {
  return text(value).replace(/[^a-z0-9]/g, '')
}

function slug(value: unknown) {
  return text(value)
    .replace(/[^a-z0-9]+/g, '.')
    .replace(/^\.+|\.+$/g, '')
}

function generatedPortalEmail(employee: Employee) {
  const namePart = [slug(employee.firstName), slug(employee.lastName)].filter(Boolean).join('.') || 'employee'
  const idPart = slug(employee.employeeId || employee.id) || 'new'
  return `${namePart}.${idPart}@wiseflow.employee`
}

function loginEmailMatches(employee: Employee, loginEmail: string) {
  const normalizedEmail = text(loginEmail)
  const exactMatches = [
    employee.portalEmail,
    employee.email,
    generatedPortalEmail(employee),
  ].some(value => text(value) === normalizedEmail)

  if (exactMatches) return true

  const localPart = compact(normalizedEmail.split('@')[0])
  const nameTokens = [employee.firstName, employee.middleName, employee.lastName]
    .flatMap(value => text(value).split(/\s+/))
    .filter(value => value.length > 1)
    .map(compact)

  return nameTokens.length >= 2 && nameTokens.every(token => localPart.includes(token))
}

function normalizePassword(value: unknown) {
  if (value === null || value === undefined) return ''
  if (typeof value === 'string') return value.replace(/[‐‑‒–—−]/g, '-').trim()
  if (typeof value === 'number' || typeof value === 'boolean') return String(value).trim()
  return ''
}

function normalizeCopiedPassword(value: unknown) {
  return normalizePassword(value).replace(/[\u2010-\u2015\u2212]/g, '-')
}

function canUseEmployeePortal(employee: Employee) {
  const status = text(employee.employmentStatus)
  return !['archived', 'deleted', 'inactive', 'terminated', 'resigned'].includes(status)
}

function personMatches(value: unknown, employee: Employee) {
  const rawCandidate = text(value)
  const candidate = compact(rawCandidate)
  const employeeName = compact(fullName(employee))
  const employeeTokens = [employee.firstName, employee.middleName, employee.lastName].map(compact).filter(Boolean)
  const candidateTokens = rawCandidate.split(/\s+/).map(compact).filter(Boolean)
  return !!candidate && !!employeeName && (
    candidate === employeeName
    || candidate.includes(employeeName)
    || employeeName.includes(candidate)
    || (candidateTokens.length >= 2 && candidateTokens.every(token => employeeTokens.includes(token)))
  )
}

function isAssignedManager(employee: Employee) {
  const teams = loadStored<Array<{ managerName?: string; leadName?: string }>>('flowsys-hr-teams', [])
  const departments = loadStored<Array<{ manager?: string }>>('flowsys-hr-departments', [])
  return teams.some(team => personMatches(team.managerName, employee) || personMatches(team.leadName, employee))
    || departments.some(department => personMatches(department.manager, employee))
}

export default function EmployeeLoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [notice, setNotice] = useState('')

  const signIn = () => {
    setNotice('')
    if (!email.trim()) {
      setNotice('Please enter your email address.')
      return
    }
    if (!password.trim()) {
      setNotice('Please enter your temporary password.')
      return
    }
    const storedEmployees = loadStored<Employee[]>(employeeKey, [])
    const employees = Array.isArray(storedEmployees) ? storedEmployees.filter(canUseEmployeePortal) : []
    if (!employees.length) {
      setNotice('No active employee portal accounts are available yet.')
      return
    }
    const loginEmail = email.trim().toLowerCase()
    const candidates = employees.filter(item => loginEmailMatches(item, loginEmail))
    if (!candidates.length) {
      setNotice('No employee portal account is connected to that email yet.')
      return
    }
    const enteredPassword = normalizeCopiedPassword(password)
    const employee = candidates.find(item => normalizeCopiedPassword(item.portalPassword) === enteredPassword) || candidates[0]
    if (!normalizeCopiedPassword(employee.portalPassword)) {
      setNotice('HR has not generated login details for this employee yet.')
      return
    }
    if (normalizeCopiedPassword(employee.portalPassword) !== enteredPassword) {
      setNotice('Email or password is incorrect.')
      return
    }
    const generatedEmail = generatedPortalEmail(employee)
    let signedInEmployee = employee
    if (!employee.portalEmail && generatedEmail) {
      const updated = employees.map(item => item.id === employee.id ? { ...item, portalEmail: generatedEmail } : item)
      saveStored(employeeKey, updated)
      signedInEmployee = { ...employee, portalEmail: generatedEmail }
    }
    const account = {
      userId: signedInEmployee.id,
      employeeId: signedInEmployee.employeeId,
      email: signedInEmployee.portalEmail || signedInEmployee.email || loginEmail,
      fullName: fullName(signedInEmployee),
      role: isEmployeeTeamManager(signedInEmployee) || isAssignedManager(signedInEmployee) ? 'Team Manager' : 'Employee',
    }
    saveStored('flowsys-auth-session', account)
    saveStored('flowsys-account', account)
    saveStored('flowsys-employee-session', account)
    router.push('/employee/dashboard')
  }

  return (
    <main style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 24, background: 'linear-gradient(135deg, rgba(15,61,42,0.18), rgba(255,255,255,0.72)), radial-gradient(circle at 20% 30%, rgba(34,197,94,0.18), transparent 30%), #eef4f1' }}>
      <section style={{ width: 'min(100%, 520px)', borderRadius: 20, background: 'rgba(255,255,255,0.9)', border: '1px solid rgba(226,232,240,0.9)', boxShadow: '0 24px 70px rgba(15,23,42,0.16)', padding: '42px 44px' }}>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <h1 style={{ margin: 0, fontSize: 32, color: '#0f172a' }}>Welcome Back</h1>
          <p style={{ margin: '10px 0 0', color: '#64748b' }}>Sign in to your employee portal account.</p>
        </div>
        {notice && <div style={{ padding: 12, borderRadius: 8, background: '#fef2f2', color: '#dc2626', fontWeight: 800, fontSize: 13, marginBottom: 14 }}>{notice}</div>}
        <label style={labelStyle}>Email Address
          <span style={fieldStyle}><Mail size={18} /><input value={email} onChange={event => setEmail(event.target.value)} placeholder="Enter your email" style={inputStyle} /></span>
        </label>
        <label style={{ ...labelStyle, marginTop: 18 }}>Password
          <span style={fieldStyle}><Lock size={18} /><input value={password} onChange={event => setPassword(event.target.value)} type="password" placeholder="Enter your password" style={inputStyle} /><Eye size={18} /></span>
        </label>
        <button type="button" onClick={signIn} style={{ width: '100%', height: 52, border: 0, borderRadius: 8, marginTop: 26, background: '#16a34a', color: '#ffffff', fontWeight: 900, fontSize: 15, cursor: 'pointer' }}>Sign In</button>
        <p style={{ textAlign: 'center', margin: '18px 0 0', color: '#64748b', fontSize: 13 }}>Use the login email and temporary password generated by HR.</p>
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
