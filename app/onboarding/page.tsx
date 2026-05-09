'use client'

import { useRouter } from 'next/navigation'
import type { CSSProperties } from 'react'
import { useEffect, useMemo, useState } from 'react'
import { ArrowRight, Building2, Check, FolderKanban, Mail, Sparkles, UserRound, Users } from 'lucide-react'

const onboardingKey = 'flowsys-onboarding'
const accountKey = 'flowsys-account'
const projectsKey = 'flowsys-projects'

type Role = 'Admin' | 'Project Manager' | 'Support' | 'Client'

interface Invite {
  email: string
  role: Role
}

interface OnboardingState {
  complete: boolean
  step: number
  personal: { fullName: string; role: Role; phone: string }
  company: { name: string; size: string; years: string; type: string }
  invites: Invite[]
  project: { name: string; client: string; location: string; budget: number }
}

const initialState: OnboardingState = {
  complete: false,
  step: 0,
  personal: { fullName: '', role: 'Admin', phone: '' },
  company: { name: '', size: '2-10', years: '1-3 years', type: 'Contractor' },
  invites: [],
  project: { name: '', client: '', location: '', budget: 0 },
}

const roleDescriptions: Record<Role, string> = {
  Admin: 'Full setup for company, team, and first project.',
  'Project Manager': 'Personal setup with quick access to assigned projects.',
  Support: 'Personal setup focused on team chat and support work.',
  Client: 'A simple client portal setup for viewing project updates.',
}

const stepDetails: Record<string, { eyebrow: string; title: string; body: string; icon: typeof UserRound }> = {
  'Personal Info': {
    eyebrow: 'Your account',
    title: 'Start with the person using the workspace.',
    body: 'Pick the role first. The setup adapts so every user only sees what matters for their work.',
    icon: UserRound,
  },
  Company: {
    eyebrow: 'Company profile',
    title: 'Tell us what kind of business this workspace supports.',
    body: 'Friendly choices keep this fast. You can edit all company details later in settings.',
    icon: Building2,
  },
  'Team Members': {
    eyebrow: 'Invite team',
    title: 'Bring the right people in without leaving setup.',
    body: 'Invites are saved to the account so admins can send or review them after onboarding.',
    icon: Users,
  },
  'Team Setup': {
    eyebrow: 'Support setup',
    title: 'Invite teammates who help with messages and coordination.',
    body: 'This step is optional. Support users can still finish and join team chat later.',
    icon: Users,
  },
  'First Project': {
    eyebrow: 'First project',
    title: 'Create one real project so the dashboard has useful data.',
    body: 'This creates a starter project record. You can add budgets, bills, tasks, and files afterward.',
    icon: FolderKanban,
  },
  'Assigned Projects': {
    eyebrow: 'Project work',
    title: 'Note the first project you are assigned to.',
    body: 'Project managers can skip this if assignments will be added by an admin later.',
    icon: FolderKanban,
  },
  'Client Portal': {
    eyebrow: 'Client portal',
    title: 'Keep client access clear and simple.',
    body: 'Clients see their own projects, invoices, attachments, and messages without internal company data.',
    icon: UserRound,
  },
  Finish: {
    eyebrow: 'Ready',
    title: 'Your workspace is ready to use.',
    body: 'When you finish, onboarding is marked complete and will not appear again for this browser profile.',
    icon: Check,
  },
}

const loadOnboarding = () => {
  if (typeof window === 'undefined') return initialState

  try {
    const stored = window.localStorage.getItem(onboardingKey)
    return stored ? ({ ...initialState, ...JSON.parse(stored) } as OnboardingState) : initialState
  } catch {
    return initialState
  }
}

export default function OnboardingPage() {
  const router = useRouter()
  const [data, setData] = useState<OnboardingState>(loadOnboarding)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<Role>('Project Manager')

  const steps = useMemo(() => {
    if (data.personal.role === 'Client') return ['Personal Info', 'Client Portal', 'Finish']
    if (data.personal.role === 'Support') return ['Personal Info', 'Team Setup', 'Finish']
    if (data.personal.role === 'Project Manager') return ['Personal Info', 'Assigned Projects', 'Finish']
    return ['Personal Info', 'Company', 'Team Members', 'First Project', 'Finish']
  }, [data.personal.role])

  const currentStep = Math.min(data.step, steps.length - 1)
  const stepName = steps[currentStep]
  const detail = stepDetails[stepName]
  const DetailIcon = detail.icon
  const progress = ((currentStep + 1) / steps.length) * 100

  useEffect(() => {
    window.localStorage.setItem(onboardingKey, JSON.stringify({ ...data, step: currentStep }))
  }, [data, currentStep])

  const update = (next: Partial<OnboardingState>) => setData(previous => ({ ...previous, ...next }))
  const next = () => setData(previous => ({ ...previous, step: Math.min(currentStep + 1, steps.length - 1) }))
  const back = () => setData(previous => ({ ...previous, step: Math.max(currentStep - 1, 0) }))
  const skip = () => next()

  const addInvite = () => {
    const email = inviteEmail.trim()
    if (!email) return
    setData(previous => ({ ...previous, invites: [...previous.invites, { email, role: inviteRole }] }))
    setInviteEmail('')
  }

  const finish = () => {
    const accountRaw = window.localStorage.getItem(accountKey)
    const account = accountRaw ? JSON.parse(accountRaw) : {}
    window.localStorage.setItem(accountKey, JSON.stringify({
      ...account,
      company: data.company.name || account.company || 'WiseFlow Company',
      onboardingComplete: true,
      role: data.personal.role,
      fullName: data.personal.fullName,
      phone: data.personal.phone,
      invitations: data.invites.map((invite, index) => ({ id: index + 1, email: invite.email, role: invite.role, status: 'Pending' })),
    }))

    if (data.project.name.trim() && data.personal.role === 'Admin') {
      const existing = JSON.parse(window.localStorage.getItem(projectsKey) || '[]')
      const nextId = existing.reduce((max: number, project: { id: number }) => Math.max(max, project.id), 0) + 1
      window.localStorage.setItem(projectsKey, JSON.stringify([...existing, {
        id: nextId,
        name: data.project.name.trim(),
        client: data.project.client.trim() || '-',
        location: data.project.location.trim() || '-',
        projectCost: data.project.budget,
        startDate: new Date().toISOString().slice(0, 10),
        endDate: new Date().toISOString().slice(0, 10),
        status: 'Pending',
        materialCost: 0,
        laborCost: 0,
        overheadProfit: 0,
        generalExpense: 0,
        paidAmount: 0,
        unpaidAmount: data.project.budget,
        notes: 'Created during onboarding.',
      }]))
    }

    window.localStorage.setItem(onboardingKey, JSON.stringify({ ...data, complete: true, step: currentStep }))
    router.push(data.personal.role === 'Client' ? '/client-portal' : '/dashboard')
  }

  return (
    <main style={shellStyle}>
      <aside style={railStyle}>
        <div>
          <div style={brandStyle}>
            <span style={brandIconStyle}><Sparkles size={20} /></span>
            <span>WiseFlow setup</span>
          </div>

          <div style={railTitleStyle}>Set up a workspace that fits your role.</div>
          <p style={railTextStyle}>This is a short first-run guide. Progress saves automatically, and optional steps can be skipped.</p>

          <div style={progressLabelStyle}>
            <span>Step {currentStep + 1} of {steps.length}</span>
            <strong>{Math.round(progress)}%</strong>
          </div>
          <div style={progressTrackStyle}><div style={{ ...progressFillStyle, width: `${progress}%` }} /></div>

          <div style={stepListStyle}>
            {steps.map((step, index) => {
              const isDone = index < currentStep
              const isActive = index === currentStep
              return (
                <div key={step} style={{ ...stepRowStyle, color: index <= currentStep ? '#fff' : '#94a3b8', background: isActive ? 'rgba(255,255,255,.08)' : 'transparent' }}>
                  <span style={{ ...stepBubbleStyle, background: isDone ? '#20c997' : isActive ? '#6c63ff' : '#334155', boxShadow: isActive ? '0 10px 22px rgba(108,99,255,.32)' : 'none' }}>
                    {isDone ? <Check size={14} /> : index + 1}
                  </span>
                  <span>{step}</span>
                </div>
              )
            })}
          </div>
        </div>

        <div style={railFootStyle}>
          <strong>{data.personal.role}</strong>
          <span>{roleDescriptions[data.personal.role]}</span>
        </div>
      </aside>

      <section style={contentStyle}>
        <div style={contentInnerStyle}>
          <header style={topBarStyle}>
            <div>
              <div style={pillStyle}>{detail.eyebrow}</div>
              <h1 style={titleStyle}>{detail.title}</h1>
              <p style={subtitleStyle}>{detail.body}</p>
            </div>
            <div style={heroIconStyle}><DetailIcon size={30} /></div>
          </header>

          <div style={panelStyle}>
            {stepName === 'Personal Info' && (
              <div style={formGridStyle}>
                <label style={fieldGroupStyle}>
                  <span style={labelStyle}>Full name</span>
                  <input style={fieldStyle} value={data.personal.fullName} onChange={event => update({ personal: { ...data.personal, fullName: event.target.value } })} placeholder="Example: James Pandian" />
                </label>

                <div>
                  <div style={labelStyle}>Choose your role</div>
                  <div style={roleGridStyle}>
                    {(['Admin', 'Project Manager', 'Support', 'Client'] as Role[]).map(role => (
                      <button key={role} onClick={() => update({ personal: { ...data.personal, role }, step: 0 })} style={choiceCardStyle(data.personal.role === role)}>
                        <span style={choiceTitleStyle}>{role}</span>
                        <span style={choiceBodyStyle}>{roleDescriptions[role]}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <label style={fieldGroupStyle}>
                  <span style={labelStyle}>Phone number <em style={optionalStyle}>optional</em></span>
                  <input style={fieldStyle} value={data.personal.phone} onChange={event => update({ personal: { ...data.personal, phone: event.target.value } })} placeholder="Add a contact number" />
                </label>
              </div>
            )}

            {stepName === 'Company' && (
              <div style={formGridStyle}>
                <label style={fieldGroupStyle}>
                  <span style={labelStyle}>Company name</span>
                  <input style={fieldStyle} value={data.company.name} onChange={event => update({ company: { ...data.company, name: event.target.value } })} placeholder="Example: Livewise Construction" />
                </label>
                <ChoiceGroup title="How big is your company?" value={data.company.size} options={['Solo', '2-10', '11-50', '51+']} onPick={value => update({ company: { ...data.company, size: value } })} />
                <ChoiceGroup title="How many years in business?" value={data.company.years} options={['New', '1-3 years', '4-10 years', '10+ years']} onPick={value => update({ company: { ...data.company, years: value } })} />
                <ChoiceGroup title="Business type" value={data.company.type} options={['Contractor', 'Supplier', 'Designer', 'Developer']} onPick={value => update({ company: { ...data.company, type: value } })} />
              </div>
            )}

            {(stepName === 'Team Members' || stepName === 'Team Setup') && (
              <div style={formGridStyle}>
                <div style={helperBoxStyle}>Invite teammates now, or skip and add them later from the account menu. These invitations are saved automatically.</div>
                <div style={inviteGridStyle}>
                  <label style={fieldGroupStyle}>
                    <span style={labelStyle}>Email address</span>
                    <input style={fieldStyle} value={inviteEmail} onChange={event => setInviteEmail(event.target.value)} placeholder="teammate@example.com" />
                  </label>
                  <label style={fieldGroupStyle}>
                    <span style={labelStyle}>Role</span>
                    <select style={fieldStyle} value={inviteRole} onChange={event => setInviteRole(event.target.value as Role)}>
                      <option>Project Manager</option>
                      <option>Support</option>
                      <option>Client</option>
                      <option>Admin</option>
                    </select>
                  </label>
                  <button onClick={addInvite} style={darkButtonStyle}><Mail size={15} /> Add Invite</button>
                </div>
                <div style={inviteListStyle}>
                  {data.invites.length === 0 ? <div style={emptyRowStyle}>No invitations added yet.</div> : data.invites.map(invite => <div key={invite.email} style={listRowStyle}><span>{invite.email}</span><strong>{invite.role}</strong></div>)}
                </div>
              </div>
            )}

            {(stepName === 'First Project' || stepName === 'Assigned Projects') && (
              <div style={formGridStyle}>
                <div style={helperBoxStyle}>{data.personal.role === 'Admin' ? 'This starter project becomes a real project on your Projects page.' : 'This is optional. Assigned projects can be linked by an admin later.'}</div>
                <label style={fieldGroupStyle}>
                  <span style={labelStyle}>Project name</span>
                  <input style={fieldStyle} value={data.project.name} onChange={event => update({ project: { ...data.project, name: event.target.value } })} placeholder="Example: Swimming Pool" />
                </label>
                <div style={twoColumnStyle}>
                  <label style={fieldGroupStyle}>
                    <span style={labelStyle}>Client</span>
                    <input style={fieldStyle} value={data.project.client} onChange={event => update({ project: { ...data.project, client: event.target.value } })} placeholder="Client name" />
                  </label>
                  <label style={fieldGroupStyle}>
                    <span style={labelStyle}>Location</span>
                    <input style={fieldStyle} value={data.project.location} onChange={event => update({ project: { ...data.project, location: event.target.value } })} placeholder="Project location" />
                  </label>
                </div>
                <label style={fieldGroupStyle}>
                  <span style={labelStyle}>Estimated project cost</span>
                  <input type="number" style={fieldStyle} value={data.project.budget} onChange={event => update({ project: { ...data.project, budget: Number(event.target.value) } })} />
                </label>
              </div>
            )}

            {stepName === 'Client Portal' && <InfoPanel title="Client portal access is ready" body="After login, clients land in a focused portal for project updates, invoices, files, and messages. Internal dashboards stay hidden from client users." />}
            {stepName === 'Finish' && <InfoPanel title="Everything is saved" body="Your role, company choices, invitations, and starter project are now stored. The next screen is the main dashboard." />}
          </div>

          <footer style={footerStyle}>
            <button onClick={back} disabled={currentStep === 0} style={{ ...lightButtonStyle, opacity: currentStep === 0 ? 0.45 : 1 }}>Back</button>
            <div style={footerActionsStyle}>
              {currentStep > 0 && currentStep < steps.length - 1 && <button onClick={skip} style={lightButtonStyle}>Skip for now</button>}
              {currentStep === steps.length - 1 ? <button onClick={finish} style={darkButtonStyle}>Go to Dashboard <ArrowRight size={16} /></button> : <button onClick={next} style={darkButtonStyle}>Continue <ArrowRight size={16} /></button>}
            </div>
          </footer>
        </div>
      </section>
    </main>
  )
}

function ChoiceGroup({ title, value, options, onPick }: { title: string; value: string; options: string[]; onPick: (value: string) => void }) {
  return (
    <div>
      <div style={labelStyle}>{title}</div>
      <div style={choiceGridStyle}>
        {options.map(option => (
          <button key={option} onClick={() => onPick(option)} style={choicePillStyle(value === option)}>
            {option}
          </button>
        ))}
      </div>
    </div>
  )
}

function InfoPanel({ title, body }: { title: string; body: string }) {
  return (
    <div style={infoPanelStyle}>
      <div style={successIconStyle}><Check size={28} /></div>
      <h2 style={infoTitleStyle}>{title}</h2>
      <p style={infoBodyStyle}>{body}</p>
    </div>
  )
}

const shellStyle: CSSProperties = { minHeight: '100vh', background: '#f5f5f5', fontFamily: "'Inter', sans-serif", display: 'grid', gridTemplateColumns: '360px minmax(0,1fr)' }
const railStyle: CSSProperties = { minHeight: '100vh', background: '#191414', color: '#fff', padding: '34px 30px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', boxShadow: '18px 0 50px rgba(25,20,20,.22)' }
const brandStyle: CSSProperties = { display: 'flex', alignItems: 'center', gap: 10, fontSize: 18, fontWeight: 600, marginBottom: 44 }
const brandIconStyle: CSSProperties = { width: 40, height: 40, borderRadius: 12, background: '#1db954', color: '#191414', display: 'grid', placeItems: 'center', boxShadow: '0 16px 32px rgba(29,185,84,.24)' }
const railTitleStyle = { fontSize: 32, lineHeight: 1.12, fontWeight: 600, marginBottom: 14 }
const railTextStyle = { color: '#cbd5e1', fontSize: 14, lineHeight: 1.6, margin: 0 }
const progressLabelStyle = { display: 'flex', justifyContent: 'space-between', color: '#cbd5e1', fontSize: 12, fontWeight: 600, marginTop: 30, marginBottom: 9 }
const progressTrackStyle = { height: 8, background: '#263244', borderRadius: 99, overflow: 'hidden' }
const progressFillStyle = { height: '100%', background: '#1db954', borderRadius: 99, transition: 'width .25s ease' }
const stepListStyle = { display: 'grid', gap: 12, marginTop: 34 }
const stepRowStyle = { display: 'flex', alignItems: 'center', gap: 12, fontWeight: 600, padding: '10px 12px', borderRadius: 14 }
const stepBubbleStyle = { width: 30, height: 30, borderRadius: '50%', display: 'grid', placeItems: 'center', fontSize: 12, flex: '0 0 auto' }
const railFootStyle = { display: 'grid', gap: 8, color: '#94a3b8', fontSize: 13, lineHeight: 1.5, borderTop: '1px solid rgba(255,255,255,.1)', paddingTop: 18 }
const contentStyle: CSSProperties = { minHeight: '100vh', padding: '54px clamp(30px, 5vw, 82px)', display: 'flex', flexDirection: 'column' }
const contentInnerStyle: CSSProperties = { maxWidth: 930, width: '100%', margin: '0 auto', display: 'flex', flexDirection: 'column', flex: 1 }
const topBarStyle = { display: 'flex', justifyContent: 'space-between', gap: 24, alignItems: 'flex-start', marginBottom: 30 }
const pillStyle = { display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#6c63ff', fontWeight: 600, marginBottom: 14, background: '#f5f4ff', border: '1px solid #ddd9ff', borderRadius: 999, padding: '7px 12px' }
const titleStyle = { fontSize: 38, color: '#111827', fontWeight: 600, lineHeight: 1.12, margin: 0, maxWidth: 720 }
const subtitleStyle = { fontSize: 15, color: '#64748b', lineHeight: 1.7, margin: '12px 0 0', maxWidth: 660 }
const heroIconStyle = { width: 72, height: 72, borderRadius: 22, color: '#111827', background: 'rgba(255,255,255,.84)', border: '1px solid #e5e7eb', display: 'grid', placeItems: 'center', boxShadow: '0 18px 45px rgba(15,23,42,.08)', flex: '0 0 auto' }
const panelStyle = { background: 'rgba(255,255,255,.9)', border: '1px solid rgba(226,232,240,.95)', borderRadius: 24, padding: 30, boxShadow: '0 24px 70px rgba(15,23,42,.09)', backdropFilter: 'blur(14px)' }
const formGridStyle = { display: 'grid', gap: 20 }
const fieldGroupStyle = { display: 'grid', gap: 8 }
const labelStyle = { fontSize: 12, color: '#374151', fontWeight: 600 }
const optionalStyle = { color: '#94a3b8', fontStyle: 'normal', fontWeight: 600 }
const fieldStyle = { width: '100%', border: '1px solid #dbe3ee', borderRadius: 12, padding: '13px 14px', fontSize: 14, color: '#111827', outline: 'none', background: '#fff', minHeight: 46 }
const roleGridStyle = { display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 12, marginTop: 9 }
const choiceTitleStyle = { fontSize: 14, color: '#111827', fontWeight: 600 }
const choiceBodyStyle = { fontSize: 12, color: '#64748b', lineHeight: 1.5, textAlign: 'left' as const }
const choiceGridStyle = { display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 10, marginTop: 9 }
const inviteGridStyle = { display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 190px auto', gap: 12, alignItems: 'end' }
const inviteListStyle = { display: 'grid', gap: 9 }
const twoColumnStyle = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }
const helperBoxStyle = { color: '#475569', fontSize: 14, lineHeight: 1.65, background: '#f8fafc', border: '1px solid #e5e7eb', borderRadius: 16, padding: '14px 16px' }
const emptyRowStyle = { border: '1px dashed #cbd5e1', borderRadius: 14, color: '#94a3b8', fontSize: 13, padding: '16px', textAlign: 'center' as const }
const listRowStyle = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, border: '1px solid #edf2f7', borderRadius: 14, padding: '13px 15px', fontSize: 13, color: '#374151', background: '#fff' }
const footerStyle = { display: 'flex', justifyContent: 'space-between', gap: 12, marginTop: 'auto', paddingTop: 28 }
const footerActionsStyle = { display: 'flex', gap: 10, flexWrap: 'wrap' as const, justifyContent: 'flex-end' }
const darkButtonStyle = { border: 'none', borderRadius: 12, background: '#111827', color: '#fff', padding: '12px 17px', fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'inline-flex', gap: 8, alignItems: 'center', justifyContent: 'center', minHeight: 46 }
const lightButtonStyle = { border: '1px solid #dbe3ee', borderRadius: 12, background: '#fff', color: '#374151', padding: '12px 17px', fontSize: 13, fontWeight: 600, cursor: 'pointer', minHeight: 46 }
const infoPanelStyle = { minHeight: 330, border: '1px solid #e5e7eb', borderRadius: 20, padding: 34, background: 'linear-gradient(180deg,#fff,#f8fafc)', display: 'grid', placeItems: 'center', textAlign: 'center' as const }
const successIconStyle = { width: 68, height: 68, borderRadius: '50%', background: '#ecfdf5', color: '#10b981', display: 'grid', placeItems: 'center' }
const infoTitleStyle = { fontSize: 24, color: '#111827', fontWeight: 600, margin: '18px 0 8px' }
const infoBodyStyle = { fontSize: 14, color: '#64748b', lineHeight: 1.7, maxWidth: 520, margin: 0 }

const choiceCardStyle = (active: boolean) => ({
  border: `1px solid ${active ? '#6c63ff' : '#e5e7eb'}`,
  borderRadius: 16,
  padding: 16,
  background: active ? '#f5f4ff' : '#fff',
  cursor: 'pointer',
  display: 'grid',
  gap: 6,
  textAlign: 'left' as const,
  boxShadow: active ? '0 14px 30px rgba(108,99,255,.12)' : 'none',
})

const choicePillStyle = (active: boolean) => ({
  border: `1px solid ${active ? '#6c63ff' : '#e5e7eb'}`,
  borderRadius: 14,
  padding: '14px 10px',
  color: '#111827',
  fontSize: 13,
  fontWeight: 600,
  cursor: 'pointer',
  background: active ? '#f5f4ff' : '#fff',
})
