'use client'

import { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import Header from './Header'
import Sidebar from './Sidebar'

const accountKey = 'flowsys-account'
const sessionKey = 'flowsys-auth-session'
const sidebarKey = 'wf-sidebar-collapsed'

const THEME_MAP: Record<string, string> = {
  'Light': 'light',
  'Dark': 'light',
  'WiseFlow Light': 'light',
  'WiseFlow Dark': 'light',
  'Vercel Dark': 'light',
  'Google Blue': 'light',
  'Google Green': 'light',
  'Graphite Pro': 'light',
}

const applyTheme = () => {
  try {
    const stored = window.localStorage.getItem(accountKey)
    const account = stored ? JSON.parse(stored) as { theme?: string } : null
    const savedPreference = account?.theme
    const preference = savedPreference && THEME_MAP[savedPreference] ? savedPreference : 'WiseFlow Light'
    const mapped = THEME_MAP[preference]
    const theme = mapped || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
    document.documentElement.dataset.theme = theme
    document.documentElement.dataset.themePreference = preference
  } catch {
    document.documentElement.dataset.theme = 'light'
    document.documentElement.dataset.themePreference = 'WiseFlow Light'
  }
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [authChecked, setAuthChecked] = useState(false)
  const pathname = usePathname()
  const router = useRouter()
  const isAuthPage = pathname === '/login' || pathname === '/signup' || pathname === '/onboarding' || pathname === '/employee/login'
  const isClientPortal = pathname.startsWith('/client-portal')
  const isHrWorkspace = pathname === '/hr' || pathname.startsWith('/hr/')
  const isFinancialWorkspace = pathname === '/financial' || pathname.startsWith('/financials') || pathname === '/accounting' || pathname.startsWith('/accounting/')
  const isEmployeePortal = pathname === '/employee' || pathname.startsWith('/employee/')
  const isProcurementWorkspace = pathname === '/procurement' || pathname.startsWith('/procurement/')
  const isSupplierDatabaseWorkspace = pathname === '/supplier-database' || pathname.startsWith('/supplier-database/')
  const isWorkspacePage =
    pathname === '/tasks' ||
    pathname.startsWith('/tasks/') ||
    pathname === '/to-do' ||
    pathname.startsWith('/workflows/')

  useEffect(() => {
    const id = window.setTimeout(() => {
      const saved = window.localStorage.getItem(sidebarKey)
      if (saved === '1') setSidebarCollapsed(true)
    }, 0)
    return () => window.clearTimeout(id)
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
    let timer: number | undefined
    if (isAuthPage) return
    try {
      const accountRaw = window.localStorage.getItem(accountKey)
      const sessionRaw = window.localStorage.getItem(sessionKey)
      if (!sessionRaw) {
        router.replace(isEmployeePortal ? '/employee/login' : '/login')
        return
      }
      const account = accountRaw ? (JSON.parse(accountRaw) as { role?: string }) : {}
      const session = sessionRaw ? (JSON.parse(sessionRaw) as { role?: string }) : {}
      const role = session.role || account.role
      if (role === 'Employee' && !isEmployeePortal) {
        router.replace('/employee/dashboard')
        return
      }
      if (role === 'Client' && !isClientPortal) {
        router.replace('/client-portal')
        return
      }
      if (role === 'Finance' && !isFinancialWorkspace) {
        router.replace('/financials/loan-management')
        return
      }
      if (role === 'HR' && !isHrWorkspace) {
        router.replace('/hr/overview')
        return
      }
      timer = window.setTimeout(() => setAuthChecked(true), 0)
    } catch {
      router.replace(isEmployeePortal ? '/employee/login' : '/login')
    }
    return () => {
      if (timer) window.clearTimeout(timer)
    }
  }, [isAuthPage, isClientPortal, isEmployeePortal, isFinancialWorkspace, isHrWorkspace, router])

  if (isAuthPage) return <>{children}</>
  if (!authChecked) return null
  if (isClientPortal) return <main className="client-portal-shell">{children}</main>
  if (isHrWorkspace) return <>{children}</>
  if (isEmployeePortal) return <>{children}</>
  if (isProcurementWorkspace) return <>{children}</>
  if (isSupplierDatabaseWorkspace) return <>{children}</>
  if (pathname === '/accounting' || pathname.startsWith('/accounting/')) return <>{children}</>

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
          height: '100dvh',
          overflow: 'hidden',
          position: 'sticky',
          top: 0,
          alignSelf: 'flex-start',
          zIndex: 90,
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
