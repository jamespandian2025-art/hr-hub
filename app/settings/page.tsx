'use client'

const font = "'DM Sans', sans-serif"

const settings = [
  {
    title: 'Company Profile',
    description: 'Manage business details, branding, and contact information.',
  },
  {
    title: 'Users & Roles',
    description: 'Invite teammates and control who can access each workspace area.',
  },
  {
    title: 'Notifications',
    description: 'Choose alerts for project updates, invoices, budgets, and chat.',
  },
  {
    title: 'Preferences',
    description: 'Set currency, date formats, and default workflow behavior.',
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
          color: '#9ca3af',
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
        {settings.map(item => (
          <div
            key={item.title}
            style={{
              background: '#fff',
              border: '1px solid #e5e7eb',
              borderRadius: '12px',
              padding: '20px',
            }}
          >
            <div style={{ fontSize: '15px', fontWeight: 600, color: '#111827', marginBottom: '8px' }}>
              {item.title}
            </div>
            <div style={{ fontSize: '13px', color: '#6b7280', lineHeight: 1.6 }}>
              {item.description}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
