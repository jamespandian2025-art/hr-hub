'use client'

import { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import Header from './Header'
import Sidebar from './Sidebar'

const accountKey = 'flowsys-account'
const sessionKey = 'flowsys-auth-session'
const sidebarKey = 'wf-sidebar-collapsed'

const applyTheme = () => {
  try {
    const stored = window.localStorage.getItem(accountKey)
    const account = stored ? JSON.parse(stored) as { theme?: 'System' | 'Light' | 'Dark' } : null
    const preference = account?.theme || 'System'
    const theme = preference === 'System'
      ? window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
      : preference.toLowerCase()
    document.documentElement.dataset.theme = theme
    document.documentElement.dataset.themePreference = preference
  } catch {
    document.documentElement.dataset.theme = 'light'
  }
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const pathname = usePathname()
  const router = useRouter()
  const isAuthPage = pathname === '/login' || pathname === '/signup' || pathname === '/onboarding'
  const isClientPortal = pathname.startsWith('/client-portal')
  const isWorkspacePage = pathname === '/tasks' || pathname.startsWith('/tasks/') || pathname === '/to-do'

  useEffect(() => {
    const saved = window.localStorage.getItem(sidebarKey)
    if (saved === '1') setSidebarCollapsed(true)
  }, [])

  const toggleSidebar = () => {
    setSidebarCollapsed(prev => {
      const next = !prev
      window.localStorage.setItem(sidebarKey, next ? '1' : '0')
      return next
    })
  }

  useEffect(() => {
    applyTheme()
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const listener = () => applyTheme()
    media.addEventListener('change', listener)
    window.addEventListener('storage', applyTheme)
    window.addEventListener('flowsys-theme-change', applyTheme)
    return () => {
      media.removeEventListener('change', listener)
      window.removeEventListener('storage', applyTheme)
      window.removeEventListener('flowsys-theme-change', applyTheme)
    }
  }, [])

  useEffect(() => {
    if (isAuthPage) return
    try {
      const accountRaw = window.localStorage.getItem(accountKey)
      const sessionRaw = window.localStorage.getItem(sessionKey)
      const account = accountRaw ? (JSON.parse(accountRaw) as { role?: string }) : {}
      const session = sessionRaw ? (JSON.parse(sessionRaw) as { role?: string }) : {}
      const role = account.role || session.role
      if (role === 'Client' && !isClientPortal) router.replace('/client-portal')
    } catch {
      return
    }
  }, [isAuthPage, isClientPortal, router])

  if (isAuthPage) return <>{children}</>
  if (isClientPortal) return <main className="client-portal-shell">{children}</main>

  const sidebarWidth = sidebarCollapsed ? 60 : 252

  return (
    <div className="app-shell" style={{ display: 'flex', minHeight: '100vh', width: '100%' }}>
      {/* Desktop sidebar wrapper — width drives the layout push */}
      <div
        className="desktop-sidebar"
        style={{
          width: sidebarWidth,
          minWidth: sidebarWidth,
          maxWidth: sidebarWidth,
          flexShrink: 0,
          overflow: 'hidden',
          transition: 'width 0.22s ease, min-width 0.22s ease, max-width 0.22s ease',
        }}
      >
        <Sidebar collapsed={sidebarCollapsed} onToggle={toggleSidebar} />
      </div>

      <div
        className={mobileNavOpen ? 'mobile-nav-backdrop is-open' : 'mobile-nav-backdrop'}
        onClick={() => setMobileNavOpen(false)}
      />

      <div className={mobileNavOpen ? 'mobile-nav-drawer is-open' : 'mobile-nav-drawer'}>
        <Sidebar collapsed={false} onToggle={() => {}} />
      </div>

      {/* Main content — flex: 1 so it fills whatever space the sidebar leaves */}
      <div className="app-main" style={{ flex: 1, minWidth: 0, transition: 'margin-left 0.22s ease', position: 'relative' }}>
        <Header onMenuClick={() => setMobileNavOpen(true)} compactWorkspace />
        <main className={isWorkspacePage ? 'main-content workspace-content' : 'main-content'}>{children}</main>
      </div>
    </div>
  )
}
