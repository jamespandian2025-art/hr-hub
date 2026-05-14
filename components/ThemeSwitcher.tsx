'use client'

import { useEffect, useRef, useState } from 'react'
import { ChevronDown, Palette } from 'lucide-react'

const storageKey = 'flowsys-account'

type ThemeName = 'WiseFlow Light' | 'WiseFlow Dark' | 'Google Blue' | 'Google Green' | 'Graphite Pro'

const THEMES: { name: ThemeName; accent: string; bg: string; surface: string }[] = [
  { name: 'WiseFlow Light', accent: '#1A73E8', bg: '#F8FAFD', surface: '#FFFFFF' },
  { name: 'WiseFlow Dark',  accent: '#4285F4', bg: '#0F172A', surface: '#111827' },
  { name: 'Google Blue',    accent: '#4285F4', bg: '#F6F9FE', surface: '#FFFFFF' },
  { name: 'Google Green',   accent: '#34A853', bg: '#F4FBF6', surface: '#FFFFFF' },
  { name: 'Graphite Pro',   accent: '#8B5CF6', bg: '#111111', surface: '#1A1A1A' },
]

const THEME_MAP: Record<string, string> = {
  'WiseFlow Light': 'light',
  'WiseFlow Dark': 'dark',
  'Google Blue': 'google-blue',
  'Google Green': 'google-green',
  'Graphite Pro': 'graphite',
}

function applyThemeToDOM(preference: string) {
  const mapped = THEME_MAP[preference]
  if (mapped) {
    document.documentElement.dataset.theme = mapped
    document.documentElement.dataset.themePreference = preference
  }
  window.dispatchEvent(new Event('flowsys-theme-change'))
}

export default function ThemeSwitcher() {
  const [open, setOpen] = useState(false)
  const [current, setCurrent] = useState<string>(() => {
    if (typeof window === 'undefined') return 'Google Green'
    try {
      const stored = window.localStorage.getItem(storageKey)
      const account = stored ? JSON.parse(stored) as { theme?: string } : null
      return account?.theme && THEME_MAP[account.theme] ? account.theme : 'Google Green'
    } catch {
      return 'Google Green'
    }
  })
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    if (open) document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  const selectTheme = (name: string) => {
    setCurrent(name)
    setOpen(false)
    try {
      const stored = window.localStorage.getItem(storageKey)
      const account = stored ? JSON.parse(stored) : {}
      account.theme = name
      window.localStorage.setItem(storageKey, JSON.stringify(account))
    } catch { /* ignore */ }
    applyThemeToDOM(name)
  }

  const themeData = THEMES.find(t => t.name === current) || THEMES[0]

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(!open)}
        title={`Theme: ${current}`}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 5,
          border: '1px solid #e5e7eb',
          background: '#f9fafb',
          borderRadius: 7,
          padding: '5px 9px',
          cursor: 'pointer',
          color: '#374151',
          fontSize: 11,
          fontWeight: 500,
          fontFamily: "var(--font-body)",
        }}
      >
        <span style={{ width: 10, height: 10, borderRadius: '50%', background: themeData.accent, flexShrink: 0 }} />
        <span className="theme-switcher-label" style={{ maxWidth: 80, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{current}</span>
        <ChevronDown size={11} />
      </button>

      {open && (
        <div style={{
          position: 'absolute',
          top: 'calc(100% + 8px)',
          right: 0,
          width: 220,
          background: '#fff',
          border: '1px solid #e5e7eb',
          borderRadius: 10,
          boxShadow: '0 8px 32px rgba(15,23,42,0.14)',
          zIndex: 200,
          overflow: 'hidden',
        }}>
          <div style={{ padding: '10px 14px 6px', display: 'flex', alignItems: 'center', gap: 6, borderBottom: '1px solid #f3f4f6' }}>
            <Palette size={13} color="#6b7280" />
            <span style={{ fontSize: 11, fontWeight: 600, color: '#6b7280', fontFamily: "var(--font-body)", letterSpacing: '0.04em', textTransform: 'uppercase' }}>Theme</span>
          </div>
          {THEMES.map(theme => (
            <button
              key={theme.name}
              onClick={() => selectTheme(theme.name)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                width: '100%',
                border: 'none',
                background: current === theme.name ? '#f0f4ff' : 'transparent',
                padding: '9px 14px',
                cursor: 'pointer',
                textAlign: 'left',
                fontFamily: "var(--font-body)",
              }}
            >
              {/* Mini theme preview */}
              <div style={{
                width: 34,
                height: 24,
                borderRadius: 5,
                background: theme.bg,
                border: `1px solid ${current === theme.name ? theme.accent : '#e5e7eb'}`,
                flexShrink: 0,
                overflow: 'hidden',
                position: 'relative',
              }}>
                <div style={{ width: 10, height: '100%', background: theme.surface, borderRight: `1px solid #e5e7eb`, position: 'absolute', left: 0 }} />
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: theme.accent, position: 'absolute', top: 4, right: 6 }} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, fontWeight: current === theme.name ? 600 : 400, color: current === theme.name ? '#111827' : '#374151' }}>{theme.name}</div>
              </div>
              {current === theme.name && (
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: theme.accent, flexShrink: 0 }} />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
