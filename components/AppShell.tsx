'use client'

// Install the company-scoped localStorage shim as early as possible —
// importing this side-effect-only module here means every page and
// component rendered under AppShell reads/writes data through the
// active company's namespace automatically.
import '@/lib/tenant/storageScope'

import { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import AIAssistant from './AIAssistant'
import ClientMonitoring from './ClientMonitoring'
import VoiceCommand from './VoiceCommand'
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
  const isPublicPage = pathname === '/'
    || pathname === '/why-wiseflow'
    || pathname === '/platform-solutions'
    || pathname === '/industries'
    || pathname === '/resource-center'
    || pathname.startsWith('/rfq-response')
  const isAuthPage = pathname === '/login' || pathname === '/account-recovery' || pathname === '/signup' || pathname === '/onboarding' || pathname === '/choose-account' || pathname === '/employee/login'
  const isClientPortal = pathname.startsWith('/client-portal')
  const isHrWorkspace = pathname === '/hr' || pathname.startsWith('/hr/')
  const isFinancialWorkspace = pathname === '/financial'
    || pathname.startsWith('/financials')
    || pathname === '/accounting'
    || pathname.startsWith('/accounting/')
    || pathname === '/hr/payroll'
    || pathname.startsWith('/hr/payroll/')
    || pathname === '/hr/loan-requests'
    || pathname.startsWith('/hr/loan-requests/')
  const isEmployeePortal = pathname === '/employee' || pathname.startsWith('/employee/')
  const isProcurementWorkspace = pathname === '/procurement' || pathname.startsWith('/procurement/')
  const isSupplierDatabaseWorkspace = pathname === '/supplier-database' || pathname.startsWith('/supplier-database/')
  const isWarehouseWorkspace = pathname === '/warehouse' || pathname.startsWith('/warehouse/')
  const isWorkflowsWorkspace = pathname === '/workflows' || pathname.startsWith('/workflows/')
  const isDatasetsWorkspace = pathname === '/datasets' || pathname.startsWith('/datasets/')
  const isAccountWorkspace = pathname === '/account' || pathname.startsWith('/account/')
  const isWorkspacePage =
    pathname === '/project-management' ||
    pathname.startsWith('/project-management/')
  const isApplicationsPage = false

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
    if (isPublicPage || isAuthPage) return
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
      if ((role === 'Employee' || role === 'Team Manager') && !isEmployeePortal) {
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
  }, [isPublicPage, isAuthPage, isClientPortal, isEmployeePortal, isFinancialWorkspace, isHrWorkspace, router])

  if (isPublicPage) return <>{children}</>
  if (isAuthPage) return <>{children}</>
  if (!authChecked) {
    return (
      <div className="app-auth-loading" role="status" aria-live="polite">
        <span>Loading WiseFlow...</span>
      </div>
    )
  }
  const assistant = <><ClientMonitoring /><AIAssistant /><VoiceCommand /></>
  if (isClientPortal) return <><main className="client-portal-shell">{children}</main>{assistant}</>
  if (isHrWorkspace) return <>{children}{assistant}</>
  if (isEmployeePortal) return <>{children}{assistant}</>
  if (isProcurementWorkspace) return <>{children}{assistant}</>
  if (isSupplierDatabaseWorkspace) return <>{children}{assistant}</>
  if (isWarehouseWorkspace) return <>{children}{assistant}</>
  if (isWorkflowsWorkspace) return <>{children}{assistant}</>
  if (isDatasetsWorkspace) return <>{children}{assistant}</>
  if (isAccountWorkspace) return <>{children}</>
  if (pathname === '/accounting' || pathname.startsWith('/accounting/')) return <>{children}{assistant}</>

  const sidebarWidth = sidebarCollapsed ? 60 : 252

  return (
    <div className={isApplicationsPage ? 'app-shell applications-shell' : 'app-shell'} style={{ display: 'flex', minHeight: '100vh', width: '100%', background: isApplicationsPage ? '#000' : undefined }}>
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

      {mobileNavOpen && (
        <>
          <div
            className="mobile-nav-backdrop is-open"
            onClick={() => setMobileNavOpen(false)}
          />

          <div className="mobile-nav-drawer is-open">
            <Sidebar collapsed={false} onToggle={() => {}} />
          </div>
        </>
      )}

      {/* Main content — flex: 1 so it fills whatever space the sidebar leaves */}
      <div className={isApplicationsPage ? 'app-main applications-main' : 'app-main'} style={{ flex: 1, minWidth: 0, transition: 'margin-left 0.22s ease', position: 'relative', background: isApplicationsPage ? '#000' : undefined }}>
        <Header onMenuClick={() => setMobileNavOpen(true)} compactWorkspace />
        <main className={isApplicationsPage ? 'main-content applications-content' : (isWorkspacePage ? 'main-content workspace-content' : 'main-content')} style={isApplicationsPage ? { background: '#000', padding: 0 } : undefined}>{children}</main>
      </div>
      {assistant}
    </div>
  )
}
