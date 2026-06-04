'use client'

import Link from 'next/link'
import { ArrowLeft, Check } from 'lucide-react'

const font = "var(--font-body)"

const THEMES: {
  name: 'light'
  label: string
  description: string
  accent: string
  bg: string
  surface: string
  sidebar: string
  sidebarText: string
  border: string
  text: string
}[] = [
  {
    name: 'light',
    label: 'Light',
    description: 'Clean bright workspace.',
    accent: '#16a34a',
    bg: '#FFFFFF',
    surface: '#FFFFFF',
    sidebar: '#000000',
    sidebarText: '#EDEDED',
    border: '#D4D4D4',
    text: '#000000',
  },
]

function ThemePreviewCard({
  theme,
  active,
}: {
  theme: typeof THEMES[0]
  active: boolean
}) {
  return (
    <div
      style={{
        border: `2px solid ${active ? theme.accent : theme.border}`,
        borderRadius: 14,
        overflow: 'hidden',
        cursor: 'default',
        transition: 'border-color 180ms ease, box-shadow 180ms ease',
        boxShadow: active
          ? `0 0 0 3px ${theme.accent}22, 0 4px 18px rgba(0,0,0,0.1)`
          : '0 1px 4px rgba(0,0,0,0.05)',
        background: theme.bg,
        fontFamily: font,
      }}
    >
      {/* Mini UI mockup */}
      <div style={{ display: 'flex', height: 110, overflow: 'hidden' }}>
        {/* Sidebar mockup */}
        <div style={{ width: 42, background: theme.sidebar, borderRight: `1px solid ${theme.border}`, padding: '8px 6px', display: 'flex', flexDirection: 'column', gap: 5 }}>
          <div style={{ width: 22, height: 22, borderRadius: 6, background: theme.accent, marginBottom: 4 }} />
          {[1, 2, 3, 4].map(i => (
            <div key={i} style={{ height: 6, borderRadius: 3, background: i === 1 ? theme.accent + '30' : theme.border, width: i === 1 ? '90%' : `${60 + i * 5}%` }} />
          ))}
        </div>
        {/* Main area mockup */}
        <div style={{ flex: 1, background: theme.bg, padding: '10px 10px 8px' }}>
          {/* Top bar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 8 }}>
            <div style={{ flex: 1, height: 7, borderRadius: 3, background: theme.border }} />
            <div style={{ width: 20, height: 7, borderRadius: 3, background: theme.accent }} />
          </div>
          {/* KPI cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 4, marginBottom: 6 }}>
            {[theme.accent, '#f97316', '#8b5cf6'].map((c, i) => (
              <div key={i} style={{ height: 20, borderRadius: 5, background: theme.surface, border: `1px solid ${theme.border}`, padding: '4px 5px', display: 'flex', alignItems: 'center', gap: 3 }}>
                <div style={{ width: 8, height: 8, borderRadius: 2, background: c + '30' }} />
                <div style={{ flex: 1, height: 4, borderRadius: 2, background: theme.border }} />
              </div>
            ))}
          </div>
          {/* Chart area */}
          <div style={{ height: 30, borderRadius: 6, background: theme.surface, border: `1px solid ${theme.border}`, padding: '5px 7px', display: 'flex', alignItems: 'flex-end', gap: 2 }}>
            {[0.4, 0.7, 0.5, 0.9, 0.6, 0.8, 0.55].map((h, i) => (
              <div key={i} style={{ flex: 1, height: `${h * 100}%`, borderRadius: 2, background: i === 3 ? theme.accent : theme.accent + '40' }} />
            ))}
          </div>
        </div>
      </div>

      {/* Label */}
      <div style={{ padding: '10px 14px 12px', background: theme.surface, borderTop: `1px solid ${theme.border}` }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: theme.text, marginBottom: 2 }}>{theme.label}</div>
            <div style={{ fontSize: 11, color: theme.text + '88' }}>{theme.description}</div>
          </div>
          {active && (
            <div style={{ width: 20, height: 20, borderRadius: '50%', background: theme.accent, display: 'grid', placeItems: 'center', flexShrink: 0 }}>
              <Check size={11} color="#fff" />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function AppearancePage() {
  const current = 'light'

  return (
    <div style={{ fontFamily: font, maxWidth: 900 }}>
      {/* Breadcrumb */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
        <Link href="/settings" style={{ display: 'inline-flex', alignItems: 'center', gap: 5, color: '#000000', textDecoration: 'none', fontSize: 13 }}>
          <ArrowLeft size={14} />
          Settings
        </Link>
        <span style={{ color: '#d1d5db', fontSize: 13 }}>/</span>
        <span style={{ fontSize: 13, color: '#111827', fontWeight: 500 }}>Appearance</span>
      </div>

      <div style={{ marginBottom: 6 }}>
        <div style={{ fontSize: 22, fontWeight: 700, color: '#111827' }}>Appearance</div>
      </div>
      <div style={{ fontSize: 13, color: '#000000', marginBottom: 28 }}>
        Theme switching is paused while the workspace flow is being finalized.
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16 }}>
        {THEMES.map(theme => (
          <ThemePreviewCard
            key={theme.name}
            theme={theme}
            active={current === theme.name}
          />
        ))}
      </div>

      <div style={{ marginTop: 32, padding: '16px 20px', background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 10, fontSize: 12, color: '#000000' }}>
        <strong style={{ color: '#374151' }}>Current theme:</strong> Light is locked in for now.
      </div>
    </div>
  )
}
