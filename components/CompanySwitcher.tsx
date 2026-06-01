'use client'

import { useEffect, useRef, useState } from 'react'
import { Building2, Check, ChevronDown } from 'lucide-react'
import {
  acceptCompanyInvitation,
  type CompanyRecord,
  companyChangeEvent,
  ensureDefaultCompany,
  findPendingCompanyInvitation,
  getActiveCompany,
  getCurrentActor,
  loadAccessibleCompanies,
  setActiveCompanyId,
} from '@/lib/tenant/company'

type CompanySwitcherProps = {
  variant?: 'dark' | 'light'
  compact?: boolean
  className?: string
}

export default function CompanySwitcher({ variant = 'light', compact = false, className }: CompanySwitcherProps) {
  const [open, setOpen] = useState(false)
  const [companies, setCompanies] = useState<CompanyRecord[]>([])
  const [activeCompany, setActiveCompany] = useState<CompanyRecord | null>(null)
  const ref = useRef<HTMLDivElement>(null)
  const isDark = variant === 'dark'

  useEffect(() => {
    const refresh = () => {
      const actor = getCurrentActor()
      const pendingInvite = actor.email ? findPendingCompanyInvitation(actor.email) : null
      if (pendingInvite && actor.email) acceptCompanyInvitation(actor.email, actor.fullName || actor.name)
      ensureDefaultCompany(actor)
      setCompanies(loadAccessibleCompanies(actor))
      setActiveCompany(getActiveCompany())
    }
    const id = window.setTimeout(refresh, 0)
    window.addEventListener(companyChangeEvent, refresh)
    window.addEventListener('storage', refresh)
    return () => {
      window.clearTimeout(id)
      window.removeEventListener(companyChangeEvent, refresh)
      window.removeEventListener('storage', refresh)
    }
  }, [])

  useEffect(() => {
    const close = (event: MouseEvent) => {
      if (!ref.current?.contains(event.target as Node)) setOpen(false)
    }
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', close)
    window.addEventListener('keydown', closeOnEscape)
    return () => {
      document.removeEventListener('mousedown', close)
      window.removeEventListener('keydown', closeOnEscape)
    }
  }, [])

  const switchCompany = (companyId: string) => {
    const previousCompanyId = activeCompany?.id
    const company = setActiveCompanyId(companyId)
    if (!company) return
    setActiveCompany(company)
    setCompanies(loadAccessibleCompanies())
    setOpen(false)
    if (company.id !== previousCompanyId) window.setTimeout(() => window.location.reload(), 80)
  }

  const label = activeCompany?.name || 'Select company'
  const initials = label.slice(0, 2).toUpperCase()

  return (
    <div ref={ref} className={className} style={{ position: 'relative', minWidth: compact ? 0 : 190 }}>
      <button
        type="button"
        aria-label="Company switcher"
        aria-expanded={open}
        onClick={() => setOpen(value => !value)}
        style={{
          minHeight: 40,
          width: compact ? 44 : '100%',
          border: `1px solid ${isDark ? 'rgba(148, 163, 184, .28)' : '#e5e7eb'}`,
          borderRadius: 8,
          background: isDark ? 'rgba(255,255,255,.04)' : '#fff',
          color: isDark ? '#f8fafc' : '#111827',
          display: 'grid',
          gridTemplateColumns: compact ? '1fr' : '28px minmax(0, 1fr) 16px',
          alignItems: 'center',
          gap: 9,
          padding: compact ? 0 : '0 11px 0 9px',
          cursor: 'pointer',
          fontFamily: 'var(--font-body)',
          fontSize: 13,
          fontWeight: 850,
        }}
      >
        <span
          style={{
            width: 28,
            height: 28,
            borderRadius: 7,
            display: 'grid',
            placeItems: 'center',
            background: isDark ? '#16a34a' : '#ecfdf5',
            color: isDark ? '#052e16' : '#15803d',
            fontSize: 11,
            fontWeight: 950,
            justifySelf: 'center',
          }}
        >
          {activeCompany ? initials : <Building2 size={15} />}
        </span>
        {!compact && (
          <>
            <span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textAlign: 'left' }}>{label}</span>
            <ChevronDown size={15} />
          </>
        )}
      </button>

      {open && (
        <div
          role="menu"
          aria-label="Switch company"
          style={{
            position: 'absolute',
            top: 'calc(100% + 8px)',
            right: 0,
            zIndex: 120,
            width: 320,
            maxWidth: 'min(320px, calc(100vw - 24px))',
            border: `1px solid ${isDark ? 'rgba(148, 163, 184, .22)' : '#e5e7eb'}`,
            borderRadius: 8,
            background: isDark ? '#050505' : '#fff',
            boxShadow: isDark ? '0 24px 70px rgba(0,0,0,.5)' : '0 24px 70px rgba(15,23,42,.18)',
            overflow: 'hidden',
            color: isDark ? '#f8fafc' : '#111827',
            fontFamily: 'var(--font-body)',
          }}
        >
          <div style={{ padding: '13px 14px', borderBottom: `1px solid ${isDark ? 'rgba(148, 163, 184, .16)' : '#eef2f7'}` }}>
            <strong style={{ display: 'block', fontSize: 13 }}>Switch company</strong>
            <span style={{ display: 'block', marginTop: 3, color: isDark ? '#94a3b8' : '#64748b', fontSize: 12 }}>{companies.length} workspace{companies.length === 1 ? '' : 's'} available</span>
          </div>
          <div style={{ maxHeight: 320, overflowY: 'auto', padding: 6 }}>
            {companies.map(company => {
              const active = company.id === activeCompany?.id
              return (
                <button
                  key={company.id}
                  type="button"
                  role="menuitem"
                  onClick={() => switchCompany(company.id)}
                  style={{
                    width: '100%',
                    minHeight: 54,
                    border: 0,
                    borderRadius: 7,
                    background: active ? (isDark ? 'rgba(34,197,94,.14)' : '#ecfdf5') : 'transparent',
                    color: isDark ? '#f8fafc' : '#111827',
                    display: 'grid',
                    gridTemplateColumns: '34px minmax(0, 1fr) 20px',
                    alignItems: 'center',
                    gap: 10,
                    padding: '8px 9px',
                    textAlign: 'left',
                    cursor: 'pointer',
                  }}
                >
                  <span style={{ width: 32, height: 32, borderRadius: 8, display: 'grid', placeItems: 'center', background: isDark ? '#111827' : '#f1f5f9', color: isDark ? '#e5e7eb' : '#334155', fontSize: 11, fontWeight: 950 }}>{company.name.slice(0, 2).toUpperCase()}</span>
                  <span style={{ minWidth: 0 }}>
                    <strong style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 13 }}>{company.name}</strong>
                    <small style={{ display: 'block', marginTop: 3, color: isDark ? '#94a3b8' : '#64748b', fontSize: 11 }}>{company.type}</small>
                  </span>
                  {active && <Check size={16} color="#16a34a" />}
                </button>
              )
            })}
            {companies.length === 0 && (
              <div style={{ padding: 14, color: isDark ? '#94a3b8' : '#64748b', fontSize: 12 }}>No company workspaces available.</div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
