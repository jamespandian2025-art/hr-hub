'use client'

import Link from 'next/link'

const font = "var(--font-body)"

const settings = [
  {
    title: 'Company Profile',
    description: 'Manage business details, branding, and contact information.',
    href: null,
  },
  {
    title: 'Users & Roles',
    description: 'Invite teammates and control who can access each workspace area.',
    href: null,
  },
  {
    title: 'Notifications',
    description: 'Choose alerts for project updates, invoices, budgets, and chat.',
    href: null,
  },
  {
    title: 'Preferences',
    description: 'Set currency, date formats, and default workflow behavior.',
    href: null,
  },
  {
    title: 'Appearance',
    description: 'Choose your workspace theme. Switch between light, dark, and enterprise color schemes.',
    href: '/settings/appearance',
  },
]

export default function SettingsPage() {
  return (
    <div style={{ fontFamily: font }}>
      <div style={{ marginBottom: '8px' }}>
        <div style={{ fontSize: '24px', fontWeight: 600, color: '#111827' }}>Settings</div>
      </div>

      <div
        style={{
          fontSize: '13px',
          color: '#000000',
          marginBottom: '24px',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
        }}
      >
        <span style={{ color: '#6c63ff', fontWeight: 500 }}>WiseFlow</span>
        <span>•</span>
        <span>Settings</span>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '16px',
        }}
      >
        {settings.map(item => {
          const card = (
            <div
              key={item.title}
              style={{
                background: '#fff',
                border: '1px solid #e5e7eb',
                borderRadius: '12px',
                padding: '20px',
                cursor: item.href ? 'pointer' : 'default',
                transition: 'border-color 150ms ease, box-shadow 150ms ease',
              }}
            >
              <div style={{ fontSize: '15px', fontWeight: 600, color: '#111827', marginBottom: '8px' }}>
                {item.title}
              </div>
              <div style={{ fontSize: '13px', color: '#000000', lineHeight: 1.6 }}>
                {item.description}
              </div>
            </div>
          )
          return item.href
            ? <Link key={item.title} href={item.href} style={{ textDecoration: 'none' }}>{card}</Link>
            : <div key={item.title}>{card}</div>
        })}
      </div>
    </div>
  )
}
