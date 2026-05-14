'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Check } from 'lucide-react'

const font = "var(--font-body)"
const storageKey = 'flowsys-account'

type ThemeName = 'WiseFlow Light' | 'WiseFlow Dark' | 'Google Blue' | 'Google Green' | 'Graphite Pro'

const THEMES: {
  name: ThemeName
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
    name: 'WiseFlow Light',
    description: 'Clean white workspace with a Google blue accent. Default.',
    accent: '#1A73E8',
    bg: '#F8FAFD',
    surface: '#FFFFFF',
    sidebar: '#FFFFFF',
    sidebarText: '#202124',
    border: '#E5E7EB',
    text: '#202124',
  },
  {
    name: 'WiseFlow Dark',
    description: 'Dark navy workspace for reduced eye strain at night.',
    accent: '#4285F4',
    bg: '#0F172A',
    surface: '#111827',
    sidebar: '#0F172A',
    sidebarText: '#E2E8F0',
    border: '#1E293B',
    text: '#F1F5F9',
  },
  {
    name: 'Google Blue',
    description: 'Light blue tint inspired by Google Workspace.',
    accent: '#4285F4',
    bg: '#F6F9FE',
    surface: '#FFFFFF',
    sidebar: '#FFFFFF',
    sidebarText: '#202124',
    border: '#D2E3FC',
    text: '#202124',
  },
  {
    name: 'Google Green',
    description: 'Soft green tint with a Google Sheets-inspired accent.',
    accent: '#34A853',
    bg: '#F4FBF6',
    surface: '#FFFFFF',
    sidebar: '#FFFFFF',
    sidebarText: '#202124',
    border: '#D1FAE5',
    text: '#202124',
  },
  {
    name: 'Graphite Pro',
    description: 'Deep charcoal with a purple accent for focused work.',
    accent: '#8B5CF6',
    bg: '#111111',
    surface: '#1A1A1A',
    sidebar: '#0A0A0A',
    sidebarText: '#E4E4E7',
    border: '#27272A',
    text: '#F4F4F5',
  },
]

const THEME_MAP: Record<string, string> = {
  'WiseFlow Light': 'light',
  'WiseFlow Dark': 'dark',
  'Google Blue': 'google-blue',
  'Google Green': 'google-green',
  'Graphite Pro': 'graphite',
}

function applyThemeToDOM(name: string) {
  const mapped = THEME_MAP[name]
  if (!mapped) return
  document.documentElement.dataset.theme = mapped
  document.documentElement.dataset.themePreference = name
  window.dispatchEvent(new Event('flowsys-theme-change'))
}

function ThemePreviewCard({
  theme,
  active,
  preview,
  onSelect,
  onPreview,
  onLeave,
}: {
  theme: typeof THEMES[0]
  active: boolean
  preview: boolean
  onSelect: () => void
  onPreview: () => void
  onLeave: () => void
}) {
  return (
    <div
      onMouseEnter={onPreview}
      onMouseLeave={onLeave}
      onClick={onSelect}
      style={{
        border: `2px solid ${active ? theme.accent : preview ? theme.accent + '66' : theme.border}`,
        borderRadius: 14,
        overflow: 'hidden',
        cursor: 'pointer',
        transition: 'border-color 180ms ease, box-shadow 180ms ease',
        boxShadow: active
          ? `0 0 0 3px ${theme.accent}22, 0 4px 18px rgba(0,0,0,0.1)`
          : preview
          ? `0 0 0 2px ${theme.accent}14, 0 4px 12px rgba(0,0,0,0.06)`
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
            <div style={{ fontSize: 13, fontWeight: 600, color: theme.text, marginBottom: 2 }}>{theme.name}</div>
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
  const [current, setCurrent] = useState<ThemeName>(() => {
    if (typeof window === 'undefined') return 'Google Green'
    try {
      const stored = window.localStorage.getItem(storageKey)
      const account = stored ? JSON.parse(stored) as { theme?: string } : null
      return account?.theme && THEME_MAP[account.theme] ? account.theme as ThemeName : 'Google Green'
    } catch {
      return 'Google Green'
    }
  })
  const [previewing, setPreviewing] = useState<ThemeName | null>(null)
  const [saved, setSaved] = useState(false)

  const handlePreview = (name: ThemeName) => {
    setPreviewing(name)
    applyThemeToDOM(name)
  }

  const handleLeave = () => {
    setPreviewing(null)
    applyThemeToDOM(current)
  }

  const handleSelect = (name: ThemeName) => {
    setCurrent(name)
    setPreviewing(null)
    applyThemeToDOM(name)
    try {
      const stored = window.localStorage.getItem(storageKey)
      const account = stored ? JSON.parse(stored) : {}
      account.theme = name
      window.localStorage.setItem(storageKey, JSON.stringify(account))
    } catch { /* ignore */ }
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div style={{ fontFamily: font, maxWidth: 900 }}>
      {/* Breadcrumb */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
        <Link href="/settings" style={{ display: 'inline-flex', alignItems: 'center', gap: 5, color: '#6b7280', textDecoration: 'none', fontSize: 13 }}>
          <ArrowLeft size={14} />
          Settings
        </Link>
        <span style={{ color: '#d1d5db', fontSize: 13 }}>/</span>
        <span style={{ fontSize: 13, color: '#111827', fontWeight: 500 }}>Appearance</span>
      </div>

      <div style={{ marginBottom: 6 }}>
        <div style={{ fontSize: 22, fontWeight: 700, color: '#111827' }}>Appearance</div>
      </div>
      <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 28 }}>
        Choose a theme for your workspace. Hover to preview, click to apply.
      </div>

      {saved && (
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          background: '#f0fdf4',
          border: '1px solid #86efac',
          borderRadius: 8,
          padding: '7px 14px',
          fontSize: 12,
          color: '#166534',
          fontWeight: 500,
          marginBottom: 20,
        }}>
          <Check size={13} color="#166534" />
          Theme saved â€” {current}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16 }}>
        {THEMES.map(theme => (
          <ThemePreviewCard
            key={theme.name}
            theme={theme}
            active={current === theme.name}
            preview={previewing === theme.name}
            onSelect={() => handleSelect(theme.name)}
            onPreview={() => handlePreview(theme.name)}
            onLeave={handleLeave}
          />
        ))}
      </div>

      <div style={{ marginTop: 32, padding: '16px 20px', background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 10, fontSize: 12, color: '#6b7280' }}>
        <strong style={{ color: '#374151' }}>Tip:</strong> You can also switch themes quickly using the theme picker in the top navigation bar.
      </div>
    </div>
  )
}
