'use client'
import { useState } from 'react'

const font = "var(--font-body)"

const companies = [
  {
    id: 1,
    name: 'Livewise Construction',
    type: 'CONSTRUCTION',
    role: 'Admin',
  },
  {
    id: 2,
    name: 'Livewise Ergo Furniture',
    type: 'CONSTRUCTION',
    role: 'Admin',
  },
]

export default function ProfileDropdown() {
  const [activeCompany, setActiveCompany] = useState(1)

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
          Livewise Construction
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

        {companies.map(company => (
          <div
            key={company.id}
            onClick={() => setActiveCompany(company.id)}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '10px 12px',
              borderRadius: '10px',
              cursor: 'pointer',
              marginBottom: '6px',
              background:
                activeCompany === company.id ? '#f9fafb' : 'transparent'
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
                ??
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
              {company.role}
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