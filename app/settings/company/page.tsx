'use client'

import { useEffect, useState } from 'react'
import { Building2, Check, Mail, ShieldCheck, UsersRound } from 'lucide-react'
import {
  type CompanyRecord,
  type CompanyRole,
  companyChangeEvent,
  inviteCompanyMember,
  loadCompanies,
  rolePermissions,
  setActiveCompanyId,
  updateCompanySettings,
  getActiveCompany,
} from '@/lib/tenant/company'

const roles: CompanyRole[] = ['Member', 'Sales', 'Project Manager', 'Finance', 'HR', 'Warehouse', 'Procurement', 'Admin']

export default function CompanySettingsPage() {
  const [companies, setCompanies] = useState<CompanyRecord[]>([])
  const [activeCompany, setActiveCompany] = useState<CompanyRecord | null>(null)
  const [draft, setDraft] = useState({ name: '', type: '', currency: 'USD', timezone: 'UTC', fiscalYearStart: 'January' })
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<CompanyRole>('Member')
  const [notice, setNotice] = useState('')

  const refresh = () => {
    const company = getActiveCompany()
    setCompanies(loadCompanies())
    setActiveCompany(company)
    if (company) {
      setDraft({
        name: company.name,
        type: company.type,
        currency: company.settings.currency,
        timezone: company.settings.timezone,
        fiscalYearStart: company.settings.fiscalYearStart,
      })
    }
  }

  useEffect(() => {
    const id = window.setTimeout(refresh, 0)
    window.addEventListener(companyChangeEvent, refresh)
    window.addEventListener('storage', refresh)
    return () => {
      window.clearTimeout(id)
      window.removeEventListener(companyChangeEvent, refresh)
      window.removeEventListener('storage', refresh)
    }
  }, [])

  const saveSettings = () => {
    if (!activeCompany) return
    updateCompanySettings(activeCompany.id, draft)
    refresh()
    setNotice('Company settings saved.')
  }

  const inviteMember = () => {
    if (!activeCompany || !inviteEmail.trim()) return
    inviteCompanyMember(activeCompany.id, inviteEmail, inviteRole)
    setInviteEmail('')
    refresh()
    setNotice(`Invitation added for ${inviteEmail}.`)
  }

  return (
    <main style={{ display: 'grid', gap: 22, color: '#0f172a', fontFamily: 'var(--font-body)' }}>
      <section style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 32, letterSpacing: 0 }}>Company Settings</h1>
          <p style={{ margin: '6px 0 0', color: '#475569', maxWidth: 760 }}>Manage company workspaces, members, roles, and permissions. Every module reads the selected company id before loading data.</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', border: '1px solid #e5e7eb', borderRadius: 12, background: '#fff' }}>
          <Building2 size={18} />
          <strong>{activeCompany?.name || 'No company selected'}</strong>
        </div>
      </section>

      {notice ? <div style={noticeStyle}><Check size={16} />{notice}</div> : null}

      <section style={{ display: 'grid', gridTemplateColumns: 'minmax(240px, 320px) minmax(0, 1fr)', gap: 18 }}>
        <aside style={cardStyle}>
          <div style={sectionTitleStyle}><Building2 size={18} />Company Switcher</div>
          <div style={{ display: 'grid', gap: 10 }}>
            {companies.map(company => (
              <button key={company.id} onClick={() => { setActiveCompanyId(company.id); refresh() }} style={{ ...switchButtonStyle, borderColor: activeCompany?.id === company.id ? '#16a34a' : '#e5e7eb', background: activeCompany?.id === company.id ? '#ecfdf5' : '#fff' }}>
                <span>
                  <strong>{company.name}</strong>
                  <small>{company.type}</small>
                </span>
                {activeCompany?.id === company.id ? <Check size={16} color="#16a34a" /> : null}
              </button>
            ))}
          </div>
        </aside>

        <section style={{ display: 'grid', gap: 18 }}>
          <div style={cardStyle}>
            <div style={sectionTitleStyle}><ShieldCheck size={18} />Workspace Profile</div>
            <div style={formGridStyle}>
              <label style={fieldStyle}>Company name<input value={draft.name} onChange={event => setDraft(previous => ({ ...previous, name: event.target.value }))} /></label>
              <label style={fieldStyle}>Company type<input value={draft.type} onChange={event => setDraft(previous => ({ ...previous, type: event.target.value }))} /></label>
              <label style={fieldStyle}>Currency<select value={draft.currency} onChange={event => setDraft(previous => ({ ...previous, currency: event.target.value }))}><option>USD</option><option>PHP</option><option>EUR</option><option>GBP</option></select></label>
              <label style={fieldStyle}>Fiscal year starts<select value={draft.fiscalYearStart} onChange={event => setDraft(previous => ({ ...previous, fiscalYearStart: event.target.value }))}><option>January</option><option>April</option><option>July</option><option>October</option></select></label>
              <label style={fieldStyle}>Timezone<input value={draft.timezone} onChange={event => setDraft(previous => ({ ...previous, timezone: event.target.value }))} /></label>
            </div>
            <button onClick={saveSettings} style={primaryButtonStyle}>Save company settings</button>
          </div>

          <div style={cardStyle}>
            <div style={sectionTitleStyle}><Mail size={18} />Invite Members</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 180px auto', gap: 10, alignItems: 'end' }}>
              <label style={fieldStyle}>Email<input value={inviteEmail} onChange={event => setInviteEmail(event.target.value)} placeholder="teammate@example.com" /></label>
              <label style={fieldStyle}>Role<select value={inviteRole} onChange={event => setInviteRole(event.target.value as CompanyRole)}>{roles.map(role => <option key={role}>{role}</option>)}</select></label>
              <button onClick={inviteMember} disabled={!inviteEmail.trim()} style={{ ...primaryButtonStyle, opacity: inviteEmail.trim() ? 1 : 0.5 }}>Invite</button>
            </div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 12 }}>{rolePermissions(inviteRole).map(permission => <span key={permission} style={pillStyle}>{permission}</span>)}</div>
          </div>

          <div style={cardStyle}>
            <div style={sectionTitleStyle}><UsersRound size={18} />Members and Roles</div>
            <div style={{ display: 'grid', gap: 10 }}>
              {(activeCompany?.members || []).map(member => (
                <div key={member.id} style={memberRowStyle}>
                  <div>
                    <strong>{member.name || member.email}</strong>
                    <small>{member.email}</small>
                  </div>
                  <span style={pillStyle}>{member.role}</span>
                  <span style={{ ...pillStyle, background: member.status === 'Active' ? '#ecfdf5' : '#fef3c7', color: member.status === 'Active' ? '#047857' : '#92400e' }}>{member.status}</span>
                </div>
              ))}
            </div>
          </div>
        </section>
      </section>
    </main>
  )
}

const cardStyle = { background: '#fff', border: '1px solid #e5e7eb', borderRadius: 14, padding: 18, boxShadow: '0 18px 45px rgba(15,23,42,0.05)' }
const sectionTitleStyle = { display: 'flex', alignItems: 'center', gap: 8, fontSize: 16, fontWeight: 800, marginBottom: 16 }
const formGridStyle = { display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 12, marginBottom: 14 }
const fieldStyle = { display: 'grid', gap: 7, color: '#475569', fontSize: 12, fontWeight: 700 }
const primaryButtonStyle = { height: 40, border: 'none', borderRadius: 10, background: '#16a34a', color: '#fff', fontWeight: 800, padding: '0 14px', cursor: 'pointer' }
const switchButtonStyle = { width: '100%', border: '1px solid #e5e7eb', borderRadius: 12, padding: 12, display: 'flex', justifyContent: 'space-between', gap: 10, background: '#fff', textAlign: 'left' as const, cursor: 'pointer' }
const pillStyle = { display: 'inline-flex', alignItems: 'center', borderRadius: 999, background: '#f1f5f9', color: '#334155', padding: '5px 9px', fontSize: 11, fontWeight: 800 }
const memberRowStyle = { display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto auto', gap: 10, alignItems: 'center', border: '1px solid #eef2f7', borderRadius: 12, padding: 12 }
const noticeStyle = { display: 'flex', alignItems: 'center', gap: 8, background: '#ecfdf5', color: '#047857', borderRadius: 12, padding: '11px 14px', fontWeight: 800 }
