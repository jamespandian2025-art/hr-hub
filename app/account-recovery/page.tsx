'use client'

import Link from 'next/link'
import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ArrowLeft, CheckCircle2, Eye, EyeOff, KeyRound, Lock, Mail, ShieldCheck, UserRound } from 'lucide-react'
import { employeeKey, type Employee, fullName, loadStored, saveStored } from '@/app/employee/employeeData'
import {
  type AuthUser,
  createPasswordFields,
  isGmailAddress,
  loadAuthUsers,
  saveAuthUsers,
  validatePasswordStrength,
} from '@/lib/auth/localAuth'
import { getSupabaseBrowserClient, hasSupabaseConfig } from '@/lib/auth/supabaseClient'
import { constantTimeEqual } from '@/lib/security/constantTime'
import { createPortalPasswordFields } from '@/lib/security/password'

type RecoveryMode = 'workspace' | 'employee'
type RecoveryStep = 'request' | 'verify' | 'provider-reset' | 'done'

type Challenge = {
  code: string
  email: string
  expiresAt: number
  mode: RecoveryMode
  subjectId: string
}

const challengeKey = 'wiseflow-account-recovery-challenge'
const challengeMinutes = 15
const clientOnlyRecoveryEnabled = process.env.NODE_ENV !== 'production'

function text(value: unknown) {
  if (value === null || value === undefined) return ''
  if (typeof value === 'string') return value.trim()
  if (typeof value === 'number' || typeof value === 'boolean') return String(value).trim()
  return ''
}

function normalizedEmail(value: unknown) {
  return text(value).toLowerCase()
}

function generateCode() {
  const values = new Uint32Array(1)
  window.crypto.getRandomValues(values)
  return String(values[0] % 1000000).padStart(6, '0')
}

function readChallenge(): Challenge | null {
  try {
    const raw = window.sessionStorage.getItem(challengeKey)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Challenge
    if (!parsed.code || !parsed.email || !parsed.subjectId || !parsed.mode || Number(parsed.expiresAt) <= Date.now()) {
      window.sessionStorage.removeItem(challengeKey)
      return null
    }
    return parsed
  } catch {
    return null
  }
}

function saveChallenge(challenge: Challenge) {
  window.sessionStorage.setItem(challengeKey, JSON.stringify(challenge))
}

function clearChallenge() {
  window.sessionStorage.removeItem(challengeKey)
}

function findWorkspaceUser(users: AuthUser[], email: string) {
  return users.find(user => normalizedEmail(user.email) === email)
}

function employeeIdentity(employee: Employee) {
  return employee.id || employee.employeeId || employee.portalEmail || employee.email || fullName(employee)
}

function findEmployee(employees: Employee[], email: string) {
  return employees.find(employee => [employee.portalEmail, employee.email].some(value => normalizedEmail(value) === email))
}

function codeExpiryLabel(expiresAt: number) {
  const minutes = Math.max(1, Math.ceil((expiresAt - Date.now()) / 60000))
  return `${minutes} minute${minutes === 1 ? '' : 's'}`
}

function initialRecoveryState() {
  if (typeof window === 'undefined') {
    return { mode: 'workspace' as RecoveryMode, step: 'request' as RecoveryStep, email: '', challenge: null as Challenge | null }
  }
  const activeChallenge = clientOnlyRecoveryEnabled ? readChallenge() : null
  if (activeChallenge) {
    return { mode: activeChallenge.mode, step: 'verify' as RecoveryStep, email: activeChallenge.email, challenge: activeChallenge }
  }
  const params = new URLSearchParams(window.location.search)
  return {
    mode: params.get('type') === 'employee' ? 'employee' as RecoveryMode : 'workspace' as RecoveryMode,
    step: 'request' as RecoveryStep,
    email: '',
    challenge: null as Challenge | null,
  }
}

export default function AccountRecoveryPage() {
  const [initialState] = useState(initialRecoveryState)
  const [mode, setMode] = useState<RecoveryMode>(initialState.mode)
  const [step, setStep] = useState<RecoveryStep>(initialState.step)
  const [email, setEmail] = useState(initialState.email)
  const [code, setCode] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')
  const [challenge, setChallenge] = useState<Challenge | null>(initialState.challenge)
  const [doneMessageOverride, setDoneMessageOverride] = useState('')
  const recoverySupabaseRef = useRef<ReturnType<typeof getSupabaseBrowserClient>>(null)

  const providerRecoveryEnabled = !clientOnlyRecoveryEnabled
  const title = mode === 'employee' ? 'Recover Employee Portal' : 'Reset Workspace Password'
  const subtitle = providerRecoveryEnabled
    ? mode === 'employee'
      ? 'Employee portal recovery is handled by HR or a workspace administrator.'
      : 'Use your registered Gmail to receive a secure Supabase reset email.'
    : mode === 'employee'
      ? 'Use your employee portal email to create a new portal password.'
      : 'Use your registered Gmail to reset your WiseFlow workspace password.'
  const backHref = mode === 'employee' ? '/employee/login' : '/login'
  const doneTitle = providerRecoveryEnabled && !doneMessageOverride.startsWith('Your Supabase password was updated')
    ? 'Recovery Request Sent'
    : 'Password Updated'
  const doneMessage = providerRecoveryEnabled
    ? doneMessageOverride || (mode === 'employee'
      ? 'Ask HR or a workspace administrator to reissue your employee portal credentials.'
      : 'If that workspace account exists, secure reset instructions will be sent by Supabase.')
    : 'You can now sign in with the new password.'
  const requestButtonLabel = providerRecoveryEnabled
    ? mode === 'employee'
      ? 'Show Recovery Instructions'
      : 'Send Reset Email'
    : 'Generate Recovery Code'

  const targetLabel = useMemo(() => {
    if (!challenge) return ''
    return mode === 'employee' ? 'employee portal account' : 'workspace account'
  }, [challenge, mode])

  const getRecoverySupabase = useCallback(() => {
    if (!providerRecoveryEnabled) return null
    if (!recoverySupabaseRef.current) {
      recoverySupabaseRef.current = getSupabaseBrowserClient({ persistSession: false })
    }
    return recoverySupabaseRef.current
  }, [providerRecoveryEnabled])

  useEffect(() => {
    if (!providerRecoveryEnabled || mode !== 'workspace') return

    const recoveryUrl = new URL(window.location.href)
    const hasRecoveryLink =
      recoveryUrl.searchParams.has('code') ||
      recoveryUrl.searchParams.has('token_hash') ||
      recoveryUrl.searchParams.has('error_code') ||
      recoveryUrl.searchParams.get('type') === 'recovery' ||
      recoveryUrl.hash.includes('type=recovery') ||
      recoveryUrl.hash.includes('access_token=') ||
      recoveryUrl.hash.includes('token_hash=') ||
      recoveryUrl.hash.includes('error_code=')

    if (!hasRecoveryLink) return

    let mounted = true
    const completeRecoveryLink = async () => {
      const recoverySupabase = getRecoverySupabase()
      if (!recoverySupabase) {
        if (!mounted) return
        setError('Supabase Auth recovery is not available right now.')
        return
      }

      setError('')
      setNotice('Checking secure recovery link...')

      const codeParam = recoveryUrl.searchParams.get('code')
      if (codeParam) {
        const { error: exchangeError } = await recoverySupabase.auth.exchangeCodeForSession(codeParam)
        if (exchangeError) {
          if (!mounted) return
          setNotice('')
          setError('This recovery link is expired or invalid. Request a new reset email.')
          return
        }
      }

      const { data, error: userError } = await recoverySupabase.auth.getUser()
      if (!mounted) return

      if (userError || !data.user) {
        setNotice('')
        setError('This recovery link is expired or invalid. Request a new reset email.')
        return
      }

      setEmail(data.user.email || '')
      setCode('')
      setNewPassword('')
      setConfirmPassword('')
      setDoneMessageOverride('')
      clearChallenge()
      setChallenge(null)
      setStep('provider-reset')
      setNotice('Secure recovery link verified. Enter a new password to complete the reset.')
      window.history.replaceState({}, document.title, '/account-recovery')
    }

    void completeRecoveryLink()

    return () => {
      mounted = false
    }
  }, [getRecoverySupabase, mode, providerRecoveryEnabled])

  async function requestProviderRecovery(lookupEmail: string) {
    if (mode === 'employee') {
      clearChallenge()
      setChallenge(null)
      setDoneMessageOverride('Ask HR or a workspace administrator to reissue your employee portal credentials.')
      setStep('done')
      setNotice('Employee portal password recovery is handled by HR or a workspace administrator.')
      return
    }

    if (!hasSupabaseConfig()) {
      setError('Supabase Auth recovery is not configured for this deployment.')
      return
    }

    const recoverySupabase = getRecoverySupabase()
    if (!recoverySupabase) {
      setError('Supabase Auth recovery is not available right now.')
      return
    }

    const { error: resetError } = await recoverySupabase.auth.resetPasswordForEmail(lookupEmail, {
      redirectTo: `${window.location.origin}/account-recovery`,
    })

    if (resetError) {
      setError('Secure reset email could not be sent right now. Please contact your workspace administrator.')
      return
    }

    clearChallenge()
    setChallenge(null)
    setDoneMessageOverride('If that workspace account exists, secure reset instructions will be sent by Supabase.')
    setStep('done')
    setNotice('If that workspace account exists, Supabase will send secure reset instructions.')
  }

  async function startChallenge(event: FormEvent) {
    event.preventDefault()
    setError('')
    setNotice('')
    setCode('')
    setNewPassword('')
    setConfirmPassword('')
    setDoneMessageOverride('')

    const lookupEmail = normalizedEmail(email)
    if (!lookupEmail) {
      setError('Enter the email address for the account.')
      return
    }

    if (mode === 'workspace' && !isGmailAddress(lookupEmail)) {
      setError('Workspace recovery uses the Gmail address registered for this workspace.')
      return
    }

    if (!clientOnlyRecoveryEnabled) {
      await requestProviderRecovery(lookupEmail)
      return
    }

    const expiresAt = Date.now() + challengeMinutes * 60 * 1000
    if (mode === 'workspace') {
      const user = findWorkspaceUser(loadAuthUsers(), lookupEmail)
      if (!user) {
        setError('No workspace account was found in this browser for that Gmail.')
        return
      }
      const nextChallenge = { code: generateCode(), email: lookupEmail, expiresAt, mode, subjectId: String(user.id) }
      saveChallenge(nextChallenge)
      setChallenge(nextChallenge)
      setStep('verify')
      setNotice('Recovery code generated for this browser session.')
      return
    }

    const employee = findEmployee(loadStored<Employee[]>(employeeKey, []), lookupEmail)
    if (!employee) {
      setError('No employee portal account was found in this browser for that email.')
      return
    }
    const nextChallenge = { code: generateCode(), email: lookupEmail, expiresAt, mode, subjectId: String(employeeIdentity(employee)) }
    saveChallenge(nextChallenge)
    setChallenge(nextChallenge)
    setStep('verify')
    setNotice('Recovery code generated for this browser session.')
  }

  async function resetProviderPassword(event: FormEvent) {
    event.preventDefault()
    setError('')
    setNotice('')

    if (!providerRecoveryEnabled || mode !== 'workspace') {
      setError('Use the active Supabase recovery link to reset this password.')
      return
    }

    const recoverySupabase = getRecoverySupabase()
    if (!recoverySupabase) {
      setError('Supabase Auth recovery is not available right now.')
      return
    }

    if (!constantTimeEqual(newPassword, confirmPassword)) {
      setError('Passwords do not match.')
      return
    }

    const strength = validatePasswordStrength(newPassword, { email: normalizedEmail(email) })
    if (!strength.ok) {
      setError(strength.issues[0] || 'Use a stronger password.')
      return
    }

    const { error: updateError } = await recoverySupabase.auth.updateUser({ password: newPassword })
    if (updateError) {
      setError('The secure recovery session expired. Request a new reset email.')
      return
    }

    await recoverySupabase.auth.signOut()
    clearChallenge()
    setChallenge(null)
    setNewPassword('')
    setConfirmPassword('')
    setDoneMessageOverride('Your Supabase password was updated. Sign in with the new password.')
    setStep('done')
    setNotice('Password updated through Supabase Auth.')
  }

  async function resetPassword(event: FormEvent) {
    event.preventDefault()
    setError('')
    setNotice('')

    if (!clientOnlyRecoveryEnabled) {
      setError('Password recovery must be completed through Supabase Auth or by your workspace administrator.')
      setStep('request')
      setChallenge(null)
      return
    }

    const activeChallenge = readChallenge()
    if (!activeChallenge || activeChallenge.mode !== mode || activeChallenge.email !== normalizedEmail(email)) {
      setError('The recovery code has expired. Start again to generate a new one.')
      setStep('request')
      setChallenge(null)
      return
    }

    if (!constantTimeEqual(activeChallenge.code, code.trim())) {
      setError('Recovery code is incorrect.')
      return
    }

    if (!constantTimeEqual(newPassword, confirmPassword)) {
      setError('Passwords do not match.')
      return
    }

    const strength = validatePasswordStrength(newPassword, { email: activeChallenge.email })
    if (!strength.ok) {
      setError(strength.issues[0] || 'Use a stronger password.')
      return
    }

    if (mode === 'workspace') {
      const users = loadAuthUsers()
      const user = users.find(item => String(item.id) === activeChallenge.subjectId && normalizedEmail(item.email) === activeChallenge.email)
      if (!user) {
        setError('The workspace account could not be found. Start recovery again.')
        return
      }
      const passwordFields = await createPasswordFields(newPassword)
      saveAuthUsers(users.map(item => item.id === user.id ? { ...item, ...passwordFields, password: undefined, provider: item.provider || 'email' } : item))
    } else {
      const employees = loadStored<Employee[]>(employeeKey, [])
      const portalPasswordFields = await createPortalPasswordFields(newPassword)
      const nextEmployees = employees.map(employee => {
        const identity = String(employeeIdentity(employee))
        if (identity !== activeChallenge.subjectId) return employee
        return { ...employee, ...portalPasswordFields, portalPassword: undefined, mustChangePassword: false }
      })
      saveStored(employeeKey, nextEmployees)
    }

    clearChallenge()
    setChallenge(null)
    setStep('done')
    setNotice('Password reset complete.')
  }

  return (
    <main className="recovery-shell">
      <style>{recoveryCss}</style>
      <section className="recovery-hero">
        <div>
          <div className="recovery-brand">
            <div className="recovery-logo">W</div>
            <div>WiseFlow</div>
          </div>
          <div className="recovery-hero-copy">
            <p>Account Recovery</p>
            <h1>{title}</h1>
            <span>{subtitle}</span>
          </div>
        </div>
        <div className="recovery-assurance">
          <ShieldCheck size={18} />
          <span>{providerRecoveryEnabled ? 'Production recovery uses provider-issued reset links.' : `Codes expire after ${challengeMinutes} minutes.`}</span>
        </div>
      </section>

      <section className="recovery-panel">
        <div className="recovery-card">
          <Link href={backHref} className="recovery-back"><ArrowLeft size={16} /> Back to login</Link>

          <div className="recovery-mode-tabs" role="tablist" aria-label="Recovery type">
            <button type="button" className={mode === 'workspace' ? 'active' : ''} onClick={() => { setMode('workspace'); setStep('request'); setError(''); setNotice(''); setDoneMessageOverride(''); clearChallenge(); setChallenge(null) }}>Workspace</button>
            <button type="button" className={mode === 'employee' ? 'active' : ''} onClick={() => { setMode('employee'); setStep('request'); setError(''); setNotice(''); setDoneMessageOverride(''); clearChallenge(); setChallenge(null) }}>Employee</button>
          </div>

          <div className="recovery-heading">
            <div className="recovery-icon"><KeyRound size={20} /></div>
            <div>
              <h2>{step === 'done' ? doneTitle : step === 'provider-reset' ? 'Set New Password' : title}</h2>
              <p>{step === 'done' ? doneMessage : step === 'provider-reset' ? 'Complete the verified Supabase recovery before returning to login.' : subtitle}</p>
            </div>
          </div>

          {error && <div className="recovery-alert error">{error}</div>}
          {notice && <div className="recovery-alert success">{notice}</div>}

          {step === 'request' && (
            <form onSubmit={startChallenge} className="recovery-form">
              <label>
                <span>{mode === 'employee' ? 'Employee portal email' : 'Workspace Gmail'}</span>
                <div className="recovery-input">
                  <Mail size={17} />
                  <input type="email" value={email} onChange={event => setEmail(event.target.value)} placeholder={mode === 'employee' ? 'name@company.com' : 'you@gmail.com'} required />
                </div>
              </label>
              <button type="submit" className="recovery-primary">{requestButtonLabel}</button>
            </form>
          )}

          {step === 'provider-reset' && (
            <form onSubmit={resetProviderPassword} className="recovery-form">
              <label>
                <span>New password</span>
                <div className="recovery-input">
                  <Lock size={17} />
                  <input type={showPassword ? 'text' : 'password'} value={newPassword} onChange={event => setNewPassword(event.target.value)} placeholder="12+ chars, Aa, 1, symbol" required />
                  <button type="button" className="recovery-eye" onClick={() => setShowPassword(value => !value)} aria-label={showPassword ? 'Hide password' : 'Show password'}>
                    {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                  </button>
                </div>
              </label>

              <label>
                <span>Confirm password</span>
                <div className="recovery-input">
                  <Lock size={17} />
                  <input type={showPassword ? 'text' : 'password'} value={confirmPassword} onChange={event => setConfirmPassword(event.target.value)} placeholder="Repeat password" required />
                </div>
              </label>

              <button type="submit" className="recovery-primary">Update Supabase Password</button>
              <button type="button" className="recovery-secondary" onClick={() => { setStep('request'); setNotice(''); setError(''); setNewPassword(''); setConfirmPassword('') }}>Request New Link</button>
            </form>
          )}

          {step === 'verify' && challenge && (
            <form onSubmit={resetPassword} className="recovery-form">
              <div className="recovery-code-panel">
                <span>Recovery code</span>
                <strong>{challenge.code}</strong>
                <small>Use this code for the {targetLabel}. It expires in {codeExpiryLabel(challenge.expiresAt)}.</small>
              </div>

              <label>
                <span>Enter recovery code</span>
                <div className="recovery-input">
                  <KeyRound size={17} />
                  <input value={code} onChange={event => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))} inputMode="numeric" placeholder="000000" required />
                </div>
              </label>

              <label>
                <span>New password</span>
                <div className="recovery-input">
                  <Lock size={17} />
                  <input type={showPassword ? 'text' : 'password'} value={newPassword} onChange={event => setNewPassword(event.target.value)} placeholder="12+ chars, Aa, 1, symbol" required />
                  <button type="button" className="recovery-eye" onClick={() => setShowPassword(value => !value)} aria-label={showPassword ? 'Hide password' : 'Show password'}>
                    {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                  </button>
                </div>
              </label>

              <label>
                <span>Confirm password</span>
                <div className="recovery-input">
                  <Lock size={17} />
                  <input type={showPassword ? 'text' : 'password'} value={confirmPassword} onChange={event => setConfirmPassword(event.target.value)} placeholder="Repeat password" required />
                </div>
              </label>

              <button type="submit" className="recovery-primary">Save New Password</button>
              <button type="button" className="recovery-secondary" onClick={() => { clearChallenge(); setChallenge(null); setStep('request'); setNotice(''); setError('') }}>Start Over</button>
            </form>
          )}

          {step === 'done' && (
            <div className="recovery-done">
              <CheckCircle2 size={42} />
              <Link href={backHref} className="recovery-primary">{mode === 'employee' ? 'Return to Employee Login' : 'Return to Login'}</Link>
            </div>
          )}

          <div className="recovery-footer">
            <UserRound size={15} />
            <span>{mode === 'employee' ? 'Workspace admin or HR can still reissue employee portal credentials.' : 'Admin can invite Finance, HR, Employee, Project Manager, Support, and Client accounts.'}</span>
          </div>
        </div>
      </section>
    </main>
  )
}

const recoveryCss = `
.recovery-shell,
.recovery-shell * {
  box-sizing: border-box;
}

.recovery-shell {
  min-height: 100svh;
  background: #eef2f7;
  color: #111827;
  display: grid;
  grid-template-columns: minmax(320px, 0.95fr) minmax(360px, 1fr);
  font-family: var(--font-body);
}

.recovery-hero {
  background: #111827;
  color: #fff;
  padding: clamp(32px, 4vw, 56px);
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  gap: 48px;
}

.recovery-brand {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 20px;
  font-weight: 700;
}

.recovery-logo {
  width: 40px;
  height: 40px;
  border-radius: 11px;
  background: #22c55e;
  color: #111827;
  display: grid;
  place-items: center;
  font-weight: 800;
}

.recovery-hero-copy {
  margin-top: clamp(58px, 12vh, 120px);
}

.recovery-hero-copy p {
  margin: 0 0 12px;
  color: #86efac;
  font-size: 13px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: .08em;
}

.recovery-hero-copy h1 {
  margin: 0;
  max-width: 560px;
  color: #fff;
  font-size: clamp(34px, 4vw, 48px);
  line-height: 1.05;
}

.recovery-hero-copy span {
  display: block;
  max-width: 520px;
  margin-top: 18px;
  color: #000000;
  font-size: 15px;
  line-height: 1.7;
}

.recovery-assurance {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  width: fit-content;
  border: 1px solid rgba(255,255,255,.14);
  border-radius: 12px;
  padding: 12px 14px;
  color: #d1fae5;
  font-size: 13px;
  font-weight: 700;
}

.recovery-panel {
  display: grid;
  place-items: center;
  padding: clamp(22px, 5vw, 56px);
}

.recovery-card {
  width: min(100%, 500px);
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 18px;
  padding: clamp(20px, 4vw, 30px);
  box-shadow: 0 24px 70px rgba(15,23,42,.12);
}

.recovery-back {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: #111827;
  font-size: 13px;
  font-weight: 800;
  text-decoration: none;
}

.recovery-mode-tabs {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
  margin: 22px 0;
  padding: 4px;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  background: #f8fafc;
}

.recovery-mode-tabs button {
  height: 38px;
  border: 0;
  border-radius: 9px;
  background: transparent;
  color: #000000;
  font-weight: 800;
  cursor: pointer;
}

.recovery-mode-tabs button.active {
  background: #111827;
  color: #fff;
}

.recovery-heading {
  display: flex;
  align-items: flex-start;
  gap: 14px;
  margin-bottom: 18px;
}

.recovery-icon {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  background: #dcfce7;
  color: #15803d;
  display: grid;
  place-items: center;
  flex: 0 0 auto;
}

.recovery-heading h2 {
  margin: 0;
  color: #111827;
  font-size: 24px;
  line-height: 1.15;
}

.recovery-heading p {
  margin: 7px 0 0;
  color: #000000;
  font-size: 13px;
  line-height: 1.6;
}

.recovery-alert {
  padding: 10px 12px;
  border-radius: 10px;
  font-size: 13px;
  font-weight: 700;
  margin-bottom: 14px;
}

.recovery-alert.error {
  background: #fef2f2;
  color: #dc2626;
}

.recovery-alert.success {
  background: #f0fdf4;
  color: #166534;
}

.recovery-form {
  display: grid;
  gap: 14px;
}

.recovery-form label {
  display: grid;
  gap: 7px;
}

.recovery-form label > span {
  color: #374151;
  font-size: 12px;
  font-weight: 800;
}

.recovery-input {
  height: 46px;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 0 12px;
  background: #fff;
  color: #000000;
}

.recovery-input input {
  width: 100%;
  min-width: 0;
  border: 0;
  outline: 0;
  background: transparent;
  color: #111827;
  font: inherit;
  font-size: 14px;
}

.recovery-eye {
  border: 0;
  background: transparent;
  color: #000000;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 30px;
  height: 30px;
  cursor: pointer;
}

.recovery-primary,
.recovery-secondary {
  min-height: 44px;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 800;
  cursor: pointer;
  text-decoration: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.recovery-primary {
  border: 1px solid #111827;
  background: #111827;
  color: #fff;
}

.recovery-secondary {
  border: 1px solid #e5e7eb;
  background: #fff;
  color: #111827;
}

.recovery-code-panel {
  border: 1px dashed #86efac;
  border-radius: 14px;
  padding: 16px;
  background: #f0fdf4;
  display: grid;
  gap: 6px;
}

.recovery-code-panel span {
  color: #166534;
  font-size: 12px;
  font-weight: 800;
}

.recovery-code-panel strong {
  color: #111827;
  font-size: 30px;
  letter-spacing: .2em;
  line-height: 1;
}

.recovery-code-panel small {
  color: #166534;
  font-size: 12px;
  line-height: 1.5;
}

.recovery-done {
  display: grid;
  justify-items: center;
  gap: 18px;
  color: #16a34a;
  padding: 18px 0 4px;
}

.recovery-done .recovery-primary {
  width: 100%;
}

.recovery-footer {
  margin-top: 20px;
  display: flex;
  gap: 8px;
  color: #000000;
  font-size: 12px;
  line-height: 1.5;
}

.recovery-back:focus-visible,
.recovery-mode-tabs button:focus-visible,
.recovery-eye:focus-visible,
.recovery-primary:focus-visible,
.recovery-secondary:focus-visible,
.recovery-input input:focus-visible {
  outline: 2px solid #2563eb;
  outline-offset: 2px;
}

@media (max-width: 860px) {
  .recovery-shell {
    grid-template-columns: 1fr;
  }

  .recovery-hero {
    min-height: auto;
    padding: 24px 20px;
  }

  .recovery-hero-copy {
    margin-top: 36px;
  }

  .recovery-assurance {
    display: none;
  }

  .recovery-panel {
    padding: 18px;
  }
}

@media (max-width: 420px) {
  .recovery-card {
    border-radius: 16px;
    padding: 18px;
  }

  .recovery-heading {
    align-items: center;
  }

  .recovery-heading h2 {
    font-size: 21px;
  }
}
`
