'use client'
import { useEffect, useMemo, useState } from 'react'
import { Check } from 'lucide-react'
import { type CompanyRecord, companyChangeEvent, getActiveCompany, loadAccessibleCompanies, setActiveCompanyId } from '@/lib/tenant/company'

const font = "var(--font-body)"

export default function ProfileDropdown() {
  const [companies, setCompanies] = useState<CompanyRecord[]>([])
  const [activeCompany, setActiveCompany] = useState<CompanyRecord | null>(null)
  const profileCompanies = useMemo(() => {
    if (activeCompany) return [activeCompany]
    return companies.slice(0, 1)
  }, [activeCompany, companies])

  useEffect(() => {
    const refresh = () => {
      setCompanies(loadAccessibleCompanies())
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

  const switchCompany = (companyId: string) => {
    const company = setActiveCompanyId(companyId)
    if (!company) return
    setActiveCompany(company)
    setCompanies(loadAccessibleCompanies())
  }

  return (
    <div style={{
      width: '320px',
      background: '#fff',
      borderRadius: '16px',
      boxShadow: '0 10px 30px rgba(0,0,0,0.08)',
      overflow: 'hidden',
      fontFamily: font
    }}>

      {/* HEADER */}
      <div style={{
        padding: '24px',
        textAlign: 'center',
        borderBottom: '1px solid #f3f4f6'
      }}>
        <div style={{
          width: '80px',
          height: '80px',
          borderRadius: '50%',
          border: '3px solid #f59e0b',
          margin: '0 auto',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#fff'
        }}>
          <span style={{ fontWeight: 600 }}>LW</span>
        </div>

        <div style={{ marginTop: '12px', fontWeight: 600 }}>
          {activeCompany?.name || 'WiseFlow Company'}
        </div>

        <div style={{
          fontSize: '13px',
          color: '#6b7280'
        }}>
          livewiseofficial@gmail.com
        </div>
      </div>

      {/* SWITCH */}
      <div style={{ padding: '16px 20px' }}>
        <div style={{
          fontSize: '12px',
          color: '#9ca3af',
          marginBottom: '10px'
        }}>
          Switch Settings
        </div>

        {profileCompanies.map(company => (
          <div
            key={company.id}
            onClick={() => switchCompany(company.id)}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '10px 12px',
              borderRadius: '10px',
              cursor: 'pointer',
              marginBottom: '6px',
              background:
                activeCompany?.id === company.id ? '#f9fafb' : 'transparent'
            }}
          >
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <div style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                background: '#f3f4f6',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '12px'
              }}>
                {company.name.slice(0, 2).toUpperCase()}
              </div>

              <div>
                <div style={{ fontSize: '14px', fontWeight: 500 }}>
                  {company.name}
                </div>
                <div style={{
                  fontSize: '11px',
                  color: '#9ca3af'
                }}>
                  {company.type}
                </div>
              </div>
            </div>

            <div style={{
              fontSize: '11px',
              padding: '4px 8px',
              background: '#dcfce7',
              color: '#16a34a',
              borderRadius: '6px',
              fontWeight: 600
            }}>
              <Check size={13} />
            </div>
          </div>
        ))}
      </div>

      {/* MENU */}
      <div style={{
        borderTop: '1px solid #f3f4f6',
        padding: '10px 0'
      }}>

        {[
          'Create Company',
          'Invitations',
          'Account settings',
          'Preferences'
        ].map((item, i) => (
          <div
            key={i}
            style={{
              padding: '10px 20px',
              fontSize: '14px',
              cursor: 'pointer',
              display: 'flex',
              justifyContent: 'space-between'
            }}
          >
            {item}

            {item === 'Invitations' && (
              <span style={{
                background: '#ef4444',
                color: '#fff',
                borderRadius: '999px',
                padding: '2px 8px',
                fontSize: '11px'
              }}>
                0
              </span>
            )}
          </div>
        ))}
      </div>

      {/* LOGOUT */}
      <div style={{
        borderTop: '1px solid #f3f4f6',
        padding: '12px 20px',
        color: '#ef4444',
        fontWeight: 500,
        cursor: 'pointer'
      }}>
        Logout
      </div>

    </div>
  )
}
