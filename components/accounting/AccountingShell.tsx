'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import {
  ArrowLeft,
  BadgeDollarSign,
  Banknote,
  Bell,
  BookOpenCheck,
  Calculator,
  FileBarChart,
  FileClock,
  FileText,
  Landmark,
  LayoutDashboard,
  Menu,
  PieChart,
  Plus,
  ReceiptText,
  Search,
  ShieldCheck,
  WalletCards,
  X,
} from 'lucide-react'
import { loadStored } from '@/app/employee/employeeData'
import { AllowanceRequest, allowanceRequestKey, outboundNotificationsKey } from '@/app/hr/enterpriseData'
import { LoanRequest, loanApprovalState, loanDisplayName, loanRequestKey, money as loanMoney } from '@/app/hr/loan-requests/loanData'
import CompanySwitcher from '@/components/CompanySwitcher'
import { useTheme } from '@/components/ThemeProvider'
import { listHrRecords } from '@/lib/hrms/client'

const font = 'var(--font-body)'

type FinanceOutboundNotification = {
  id?: string | number
  subject?: string
  message?: string
  recipientRole?: string
  relatedType?: string
  relatedId?: string | number
  status?: string
  target?: string
  createdAt?: string
}

type StoredAccount = {
  company?: string
  fullName?: string
  name?: string
  email?: string
  photo?: string
  profilePhoto?: string
  role?: string
}

type AccountingNotification = {
  id: string
  title: string
  detail: string
  meta: string
  target: string
  createdAt?: string
  tone: string
}

function uniqueRows<T extends { id?: string }>(rows: T[]) {
  const map = new Map<string, T>()
  rows.forEach((row, index) => {
    const key = row.id || `row-${index}`
    map.set(key, { ...map.get(key), ...row })
  })
  return Array.from(map.values())
}

export const accountingNavItems = [
  { label: 'Overview', href: '/accounting', icon: LayoutDashboard, description: 'Cash, profit, receivables, and payables' },
  { label: 'Accounting', href: '/accounting/accounting', icon: BookOpenCheck, description: 'Journal entries and chart activity' },
  { label: 'Invoices', href: '/accounting/invoices', icon: FileText, description: 'Client invoices and collections' },
  { label: 'Bills', href: '/accounting/bills', icon: ReceiptText, description: 'Vendor bills and payables' },
  { label: 'Expenses', href: '/accounting/expenses', icon: WalletCards, description: 'Expense capture and approvals' },
  { label: 'Banking', href: '/accounting/banking', icon: Landmark, description: 'Bank accounts and reconciliation' },
  { label: 'Transactions', href: '/accounting/transactions', icon: Banknote, description: 'Income, expense, and transfer ledger' },
  { label: 'Budgeting', href: '/accounting/budgeting', icon: PieChart, description: 'Budgets, forecasts, and variance' },
  { label: 'Payroll Finance', href: '/accounting/payroll-finance', icon: BadgeDollarSign, description: 'Payroll accruals and disbursements' },
  { label: 'Tax & Compliance', href: '/accounting/tax-compliance', icon: ShieldCheck, description: 'Tax calendars and filings' },
  { label: 'Withholding Tax', href: '/accounting/withholding-tax-calculator', icon: Calculator, description: 'Payroll withholding calculator' },
  { label: 'Reports', href: '/accounting/reports', icon: FileBarChart, description: 'Financial statements and analytics' },
  { label: 'Audit Logs', href: '/accounting/audit-logs', icon: FileClock, description: 'Controls and accounting history' },
]

const newAccountingActions = [
  { label: 'Invoice', description: 'Create a client invoice', href: '/accounting/invoices?new=1', icon: FileText },
  { label: 'Bill or Expense', description: 'Record a vendor bill', href: '/accounting/bills?new=1', icon: ReceiptText },
  { label: 'Transaction', description: 'Create a manual ledger transaction', href: '/accounting/transactions?new=1', icon: Banknote },
  { label: 'Budget', description: 'Create a project budget', href: '/accounting/budgeting?new=1', icon: PieChart },
  { label: 'Bank Account', description: 'Open banking setup', href: '/accounting/banking', icon: Landmark },
  { label: 'Payroll Review', description: 'Approve and release payroll', href: '/accounting/payroll-finance', icon: BadgeDollarSign },
]

export function getAccountingRouteMeta(pathname: string) {
  const exactMatch = accountingNavItems.find(item => pathname === item.href)
  if (exactMatch) return exactMatch

  return [...accountingNavItems]
    .sort((a, b) => b.href.length - a.href.length)
    .find(item => pathname.startsWith(item.href + '/')) || accountingNavItems[0]
}

export default function AccountingShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const { resolvedTheme } = useTheme()
  const activeMeta = getAccountingRouteMeta(pathname)
  const ActiveIcon = activeMeta.icon
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const [newMenuOpen, setNewMenuOpen] = useState(false)
  const [accountMenuOpen, setAccountMenuOpen] = useState(false)
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)
  const [loanRequests, setLoanRequests] = useState<LoanRequest[]>([])
  const [allowanceRequests, setAllowanceRequests] = useState<AllowanceRequest[]>([])
  const [outboundNotifications, setOutboundNotifications] = useState<FinanceOutboundNotification[]>([])
  const [account, setAccount] = useState<StoredAccount>({})

  useEffect(() => {
    const loadAccount = () => {
      const accountRaw = loadStored<StoredAccount>('flowsys-account', {})
      const sessionRaw = loadStored<StoredAccount>('flowsys-auth-session', {})
      setAccount({ ...sessionRaw, ...accountRaw })
    }
    loadAccount()
    window.addEventListener('storage', loadAccount)
    return () => window.removeEventListener('storage', loadAccount)
  }, [])

  useEffect(() => {
    const closeMenus = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      setMobileSidebarOpen(false)
      setNotificationsOpen(false)
      setNewMenuOpen(false)
      setAccountMenuOpen(false)
    }
    window.addEventListener('keydown', closeMenus)
    return () => window.removeEventListener('keydown', closeMenus)
  }, [])

  useEffect(() => {
    let cancelled = false
    const loadNotifications = async () => {
      const localLoans = loadStored<LoanRequest[]>(loanRequestKey, [])
      const localAllowances = loadStored<AllowanceRequest[]>(allowanceRequestKey, [])
      try {
        const headers = {
          'x-hr-role': 'Finance',
          'x-hr-user-name': 'Accounting Notifications',
        }
        const [serverLoans, serverAllowances] = await Promise.all([
          listHrRecords<LoanRequest>('loan-requests', headers),
          listHrRecords<AllowanceRequest>('allowance-requests', headers),
        ])
        if (!cancelled) {
          setLoanRequests(uniqueRows([...localLoans, ...serverLoans]))
          setAllowanceRequests(uniqueRows([...localAllowances, ...serverAllowances]))
        }
      } catch {
        if (!cancelled) {
          setLoanRequests(localLoans)
          setAllowanceRequests(localAllowances)
        }
      }
      setOutboundNotifications(loadStored<FinanceOutboundNotification[]>(outboundNotificationsKey, []))
    }

    void loadNotifications()
    window.addEventListener('storage', loadNotifications)
    window.addEventListener('focus', loadNotifications)
    const timer = window.setInterval(loadNotifications, 2500)
    return () => {
      cancelled = true
      window.removeEventListener('storage', loadNotifications)
      window.removeEventListener('focus', loadNotifications)
      window.clearInterval(timer)
    }
  }, [])

  const accountingNotifications = useMemo(() => {
    const loanItems: AccountingNotification[] = loanRequests
      .filter(request => request.status === 'Pending' && loanApprovalState(request).canFinanceDecide)
      .map(request => ({
        id: `loan-${request.id}`,
        title: `${request.employeeName || 'Employee'} requested ${loanDisplayName(request)}`,
        detail: `${loanMoney(request.amount)} · ${request.reason || 'Waiting for Finance approval'}`,
        meta: 'Loan request',
        target: '/accounting/payroll-finance',
        createdAt: request.createdAt,
        tone: '#16a34a',
      }))

    const allowanceItems: AccountingNotification[] = allowanceRequests
      .filter(request => ['Pending', 'Manager Approved'].includes(request.status) && request.financeDecision !== 'Rejected')
      .map(request => ({
        id: `allowance-${request.id}`,
        title: `${request.employeeName || 'Employee'} requested ${request.customType || request.type} allowance`,
        detail: `PHP ${Number(request.amount || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} · ${request.purpose || request.reason || 'Waiting for Finance review'}`,
        meta: 'Allowance request',
        target: '/accounting/payroll-finance',
        createdAt: request.createdAt,
        tone: '#2563eb',
      }))

    const requestIds = new Set([...loanItems, ...allowanceItems].map(item => item.id.replace(/^(loan|allowance)-/, '')))
    const outboundItems: AccountingNotification[] = outboundNotifications
      .filter(item => String(item.recipientRole || '').toLowerCase() === 'finance')
      .filter(item => String(item.status || '').toLowerCase() !== 'read')
      .filter(item => !requestIds.has(String(item.relatedId || '')))
      .map(item => ({
        id: `finance-${item.id || item.relatedId || item.createdAt}`,
        title: item.subject || 'Employee request needs Finance review',
        detail: item.message || item.relatedType || 'Open Payroll Finance to review this request.',
        meta: item.relatedType || 'Finance notification',
        target: item.target || '/accounting/payroll-finance',
        createdAt: item.createdAt,
        tone: '#f97316',
      }))

    return [...loanItems, ...allowanceItems, ...outboundItems]
      .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
  }, [allowanceRequests, loanRequests, outboundNotifications])

  const notificationBadgeCount = accountingNotifications.length
  const displayName = account.fullName || account.name || account.email || 'Finance User'
  const avatarText = displayName.split(/\s+/).filter(Boolean).map(part => part[0]).join('').slice(0, 2).toUpperCase() || 'FP'
  const isDarkTheme = resolvedTheme === 'dark'
  const shellStyle: React.CSSProperties = {
    minHeight: '100vh',
    height: '100dvh',
    overflow: 'hidden',
    background: isDarkTheme ? '#0a0a0a' : 'var(--acc-bg, #f7f9fc)',
    display: 'grid',
    fontFamily: font,
    color: isDarkTheme ? '#fafafa' : 'var(--acc-text, #111827)',
  }
  const sidebarStyle: React.CSSProperties = {
    minHeight: '100vh',
    height: '100dvh',
    top: 0,
    alignSelf: 'start',
    background: '#ffffff',
    color: '#0f172a',
    borderRight: '1px solid #e5e7eb',
    padding: '18px 10px',
    display: 'flex',
    flexDirection: 'column',
    gap: 14,
  }
  const headerStyle: React.CSSProperties = {
    position: 'sticky',
    top: 0,
    zIndex: 80,
    background: 'rgba(255,255,255,0.94)',
    backdropFilter: 'blur(16px)',
    borderBottom: '1px solid #e8edf4',
    display: 'grid',
  }
  const headerActionsStyle: React.CSSProperties = {
    display: 'grid',
    alignItems: 'center',
  }

  return (
    <div className={`accounting-shell${isDarkTheme ? ' accounting-theme-dark' : ' accounting-theme-light'}`} style={shellStyle}>
      <style>{accountingShellCss}</style>
      <button
        type="button"
        className={`accounting-mobile-backdrop${mobileSidebarOpen ? ' is-open' : ''}`}
        aria-label="Close accounting navigation"
        onClick={() => setMobileSidebarOpen(false)}
      />
      <aside className={`accounting-sidebar${mobileSidebarOpen ? ' is-open' : ''}`} style={sidebarStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '0 6px 4px' }}>
          <span style={{ width: 36, height: 36, borderRadius: 10, background: '#0f172a', color: '#fff', display: 'grid', placeItems: 'center', fontWeight: 700, fontSize: 16 }}>W</span>
          <span>
            <span style={{ display: 'block', fontSize: 16, fontWeight: 600, lineHeight: 1, color: '#0f172a' }}>Accounting</span>
            <span style={{ display: 'block', fontSize: 12, color: '#64748b', marginTop: 4, fontWeight: 500 }}>Finance workspace</span>
          </span>
        </div>

        <Link href="/dashboard" style={backLinkStyle} onClick={() => setMobileSidebarOpen(false)}>
          <ArrowLeft size={15} />
          Back to WiseFlow
        </Link>

        <nav className="accounting-sidebar-nav" style={{ display: 'grid', gap: 3, alignContent: 'start', flex: 1, overflowY: 'auto', paddingRight: 0 }} aria-label="Accounting workspace navigation">
          <div style={{ fontSize: 11, color: '#64748b', fontWeight: 500, padding: '0 10px 6px', textTransform: 'uppercase' }}>Workspace</div>
          {accountingNavItems.map(item => {
            const Icon = item.icon
            const active = activeMeta.href === item.href
            return (
              <Link key={item.href} href={item.href} style={{ textDecoration: 'none' }} onClick={() => setMobileSidebarOpen(false)}>
                <div className={`accounting-nav-row${active ? ' active' : ''}`}>
                  <Icon size={16} />
                  <span style={{ flex: 1 }}>{item.label}</span>
                </div>
              </Link>
            )
          })}
        </nav>
      </aside>

      <div className="accounting-content-column" style={{ minWidth: 0 }}>
        <header className="accounting-sticky-header" style={headerStyle}>
          <div className="accounting-header-title" style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
            <button
              type="button"
              className="accounting-sidebar-toggle"
              aria-label="Open accounting navigation"
              aria-expanded={mobileSidebarOpen}
              onClick={() => {
                setNotificationsOpen(false)
                setNewMenuOpen(false)
                setAccountMenuOpen(false)
                setMobileSidebarOpen(open => !open)
              }}
              style={iconButtonStyle}
            >
              <Menu size={19} />
            </button>
            <span style={{ width: 38, height: 38, borderRadius: 11, background: '#ecfdf3', color: '#16a34a', display: 'grid', placeItems: 'center', flexShrink: 0 }}><ActiveIcon size={19} /></span>
            <span style={{ minWidth: 0 }}>
              <span style={{ display: 'block', fontSize: 15, fontWeight: 900, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{activeMeta.label}</span>
              <span style={{ display: 'block', fontSize: 12, color: '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{activeMeta.description}</span>
            </span>
          </div>
          <label className="accounting-header-search" style={{ height: 40, borderRadius: 8, background: 'var(--acc-input, #fff)', display: 'flex', alignItems: 'center', gap: 10, padding: '0 14px', border: '1px solid var(--acc-input-border, #e8edf4)', boxShadow: 'none' }}>
            <Search size={16} color="currentColor" />
            <input placeholder="Search Finance" aria-label="Search Finance" style={{ flex: 1, border: 0, outline: 0, background: 'transparent', fontSize: 13, color: 'var(--acc-text, #0f172a)' }} />
          </label>
          <div className="accounting-header-actions" style={headerActionsStyle}>
            <CompanySwitcher compact />
            <button type="button" aria-label="Notifications" onClick={() => { setNewMenuOpen(false); setAccountMenuOpen(false); setNotificationsOpen(open => !open) }} style={{ ...roundButtonStyle, position: 'relative' }}>
              <Bell size={18} />
              {notificationBadgeCount > 0 && (
                <span style={{ position: 'absolute', top: 6, right: 6, minWidth: 16, height: 16, borderRadius: 999, background: '#ef4444', color: '#fff', fontSize: 10, fontWeight: 900, display: 'grid', placeItems: 'center', border: '2px solid #fff' }}>{notificationBadgeCount}</span>
              )}
            </button>
            {notificationsOpen && (
              <div style={notificationPanelStyle}>
                <div style={notificationPanelHeaderStyle}>
                  <span>
                    <strong style={{ display: 'block', color: '#0f172a', fontSize: 16 }}>Finance notifications</strong>
                    <small style={{ color: '#64748b', fontWeight: 700 }}>{notificationBadgeCount ? `${notificationBadgeCount} employee request${notificationBadgeCount === 1 ? '' : 's'} waiting` : 'No employee requests waiting'}</small>
                  </span>
                  <button type="button" aria-label="Close notifications" onClick={() => setNotificationsOpen(false)} style={smallIconButtonStyle}><X size={15} /></button>
                </div>
                <div style={notificationListStyle}>
                  {accountingNotifications.length ? accountingNotifications.slice(0, 8).map(item => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        setNotificationsOpen(false)
                        router.push(item.target)
                      }}
                      style={notificationItemStyle}
                    >
                      <span style={{ ...notificationDotStyle, background: item.tone }} />
                      <span style={{ minWidth: 0 }}>
                        <span style={notificationMetaStyle}>{item.meta} · {formatNotificationTime(item.createdAt)}</span>
                        <strong style={notificationTitleStyle}>{item.title}</strong>
                        <span style={notificationDetailStyle}>{item.detail}</span>
                      </span>
                    </button>
                  )) : (
                    <div style={notificationEmptyStyle}>
                      <Bell size={20} />
                      <strong>You are all caught up</strong>
                      <span>Employee loan, allowance, and payroll requests will appear here for Finance review.</span>
                    </div>
                  )}
                </div>
                <button type="button" onClick={() => { setNotificationsOpen(false); router.push('/accounting/payroll-finance') }} style={notificationFooterStyle}>
                  Open Payroll Finance
                </button>
              </div>
            )}
            <div className="accounting-new-record-wrap" style={{ position: 'relative' }}>
              <button
                type="button"
                className="accounting-new-record-button"
                onClick={() => {
                  setNotificationsOpen(false)
                  setAccountMenuOpen(false)
                  setNewMenuOpen(open => !open)
                }}
                aria-expanded={newMenuOpen}
                aria-haspopup="menu"
                style={employeeButtonStyle}
              >
                <Plus size={16} /> New Record
              </button>
              {newMenuOpen && (
                <div role="menu" style={newMenuStyle}>
                  {newAccountingActions.map(action => {
                    const Icon = action.icon
                    return (
                      <button
                        key={action.href}
                        type="button"
                        role="menuitem"
                        onClick={() => {
                          setNewMenuOpen(false)
                          router.push(action.href)
                        }}
                        style={newMenuItemStyle}
                      >
                        <span style={newMenuIconStyle}><Icon size={16} /></span>
                        <span>
                          <strong>{action.label}</strong>
                          <small>{action.description}</small>
                        </span>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
            <div style={{ position: 'relative' }}>
              <button
                type="button"
                aria-label="Account profile menu"
                aria-expanded={accountMenuOpen}
                aria-haspopup="menu"
                onClick={() => {
                  setNotificationsOpen(false)
                  setNewMenuOpen(false)
                  setAccountMenuOpen(open => !open)
                }}
                style={avatarButtonStyle}
              >
                {account.profilePhoto || account.photo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={account.profilePhoto || account.photo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 'inherit' }} />
                ) : avatarText}
              </button>
              {accountMenuOpen && (
                <div role="menu" style={accountMenuStyle}>
                  <div style={accountMenuHeaderStyle}>
                    <strong style={accountMenuNameStyle} title={displayName}>{displayName}</strong>
                    <small>{account.role || account.company || 'Finance workspace'}</small>
                  </div>
                  <button type="button" role="menuitem" style={accountMenuItemStyle} onClick={() => { setAccountMenuOpen(false); router.push('/settings/company') }}>Company settings</button>
                  <button type="button" role="menuitem" style={accountMenuItemStyle} onClick={() => { setAccountMenuOpen(false); router.push('/accounting/payroll-finance') }}>Payroll Finance</button>
                  <button type="button" role="menuitem" style={accountMenuItemStyle} onClick={() => { setAccountMenuOpen(false); router.push('/dashboard') }}>Back to WiseFlow</button>
                </div>
              )}
            </div>
          </div>
        </header>
        <main className="accounting-scroll-content" style={{ background: isDarkTheme ? '#0a0a0a' : 'var(--acc-bg, #f8fafc)', color: isDarkTheme ? '#fafafa' : 'var(--acc-text, #0f172a)' }}>
          {children}
          <style>{accountingThemeOverrideCss}</style>
        </main>
      </div>
    </div>
  )
}

function formatNotificationTime(value?: string) {
  if (!value) return 'Now'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Now'
  return date.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

const backLinkStyle: React.CSSProperties = {
  minHeight: 38,
  border: '1px solid #e5e7eb',
  background: '#f8fafc',
  color: '#0f172a',
  borderRadius: 10,
  padding: '0 12px',
  display: 'flex',
  alignItems: 'center',
  gap: 9,
  fontSize: 13,
  fontWeight: 750,
  textDecoration: 'none',
}

const iconButtonStyle: React.CSSProperties = {
  width: 38,
  height: 38,
  borderRadius: 10,
  border: '1px solid transparent',
  background: 'transparent',
  color: '#334155',
  display: 'grid',
  placeItems: 'center',
  cursor: 'pointer',
}

const roundButtonStyle: React.CSSProperties = {
  width: 40,
  height: 40,
  borderRadius: 10,
  border: '1px solid #e8edf4',
  background: '#fff',
  color: '#0f172a',
  display: 'grid',
  placeItems: 'center',
  cursor: 'pointer',
  flex: '0 0 auto',
  boxShadow: '0 1px 2px rgba(15,23,42,0.04)',
}

const employeeButtonStyle: React.CSSProperties = {
  minHeight: 40,
  borderRadius: 999,
  border: '1px solid #16a34a',
  background: '#16a34a',
  color: '#fff',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 8,
  padding: '0 20px',
  fontSize: 12.5,
  fontWeight: 950,
  cursor: 'pointer',
  flex: '0 0 auto',
  boxShadow: '0 1px 2px rgba(22,163,74,0.18)',
}

const avatarButtonStyle: React.CSSProperties = {
  width: 40,
  height: 40,
  borderRadius: 999,
  border: '1px solid #d7dde6',
  background: '#22c55e',
  color: '#fff',
  display: 'grid',
  placeItems: 'center',
  fontSize: 13,
  fontWeight: 950,
  cursor: 'pointer',
  overflow: 'hidden',
  flex: '0 0 auto',
  boxShadow: '0 1px 2px rgba(34,197,94,0.18)',
}

const accountMenuStyle: React.CSSProperties = {
  position: 'absolute',
  right: 0,
  top: 48,
  width: 240,
  maxWidth: 'calc(100vw - 24px)',
  background: '#fff',
  border: '1px solid #e8edf4',
  borderRadius: 8,
  boxShadow: '0 18px 45px rgba(15,23,42,0.14)',
  padding: 8,
  zIndex: 90,
  display: 'grid',
  gap: 4,
  overflow: 'hidden',
}

const accountMenuHeaderStyle: React.CSSProperties = {
  padding: '10px 10px 12px',
  borderBottom: '1px solid #eef2f7',
  marginBottom: 4,
  display: 'grid',
  gap: 4,
  color: '#0f172a',
  minWidth: 0,
}

const accountMenuNameStyle: React.CSSProperties = {
  display: 'block',
  maxWidth: '100%',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
}

const accountMenuItemStyle: React.CSSProperties = {
  width: '100%',
  minHeight: 38,
  border: 0,
  background: 'transparent',
  color: '#0f172a',
  borderRadius: 7,
  padding: '0 10px',
  textAlign: 'left',
  fontSize: 13,
  fontWeight: 850,
  cursor: 'pointer',
}

const newMenuStyle: React.CSSProperties = {
  position: 'absolute',
  right: 0,
  top: 48,
  width: 260,
  background: '#fff',
  border: '1px solid #e8edf4',
  borderRadius: 8,
  boxShadow: '0 18px 45px rgba(15,23,42,0.14)',
  padding: 8,
  zIndex: 90,
  display: 'grid',
  gap: 4,
}

const newMenuItemStyle: React.CSSProperties = {
  width: '100%',
  border: 0,
  background: 'transparent',
  color: '#0f172a',
  display: 'grid',
  gridTemplateColumns: '34px minmax(0, 1fr)',
  alignItems: 'center',
  gap: 10,
  padding: '9px 10px',
  borderRadius: 7,
  textAlign: 'left',
  cursor: 'pointer',
}

const newMenuIconStyle: React.CSSProperties = {
  width: 34,
  height: 34,
  borderRadius: 8,
  background: '#ecfdf3',
  color: '#16a34a',
  display: 'grid',
  placeItems: 'center',
}

const smallIconButtonStyle: React.CSSProperties = {
  width: 30,
  height: 30,
  borderRadius: 8,
  border: '1px solid #e2e8f0',
  background: '#fff',
  color: '#334155',
  display: 'grid',
  placeItems: 'center',
  cursor: 'pointer',
}

const notificationPanelStyle: React.CSSProperties = {
  position: 'absolute',
  top: 64,
  right: 86,
  width: 380,
  maxWidth: 'calc(100vw - 28px)',
  borderRadius: 14,
  border: '1px solid #e2e8f0',
  background: '#fff',
  boxShadow: '0 24px 70px rgba(15,23,42,0.18)',
  zIndex: 80,
  overflow: 'hidden',
}

const notificationPanelHeaderStyle: React.CSSProperties = {
  minHeight: 68,
  padding: '14px 16px',
  borderBottom: '1px solid #eef2f7',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 14,
}

const notificationListStyle: React.CSSProperties = {
  maxHeight: 390,
  overflowY: 'auto',
  padding: 8,
  display: 'grid',
  gap: 6,
}

const notificationItemStyle: React.CSSProperties = {
  width: '100%',
  border: 0,
  borderRadius: 10,
  background: '#fff',
  color: '#0f172a',
  display: 'grid',
  gridTemplateColumns: '8px minmax(0, 1fr)',
  alignItems: 'start',
  gap: 10,
  padding: 10,
  textAlign: 'left',
  cursor: 'pointer',
}

const notificationDotStyle: React.CSSProperties = {
  width: 8,
  height: 8,
  borderRadius: 999,
  marginTop: 7,
}

const notificationMetaStyle: React.CSSProperties = {
  display: 'block',
  color: '#64748b',
  fontSize: 11,
  fontWeight: 800,
  marginBottom: 3,
}

const notificationTitleStyle: React.CSSProperties = {
  display: 'block',
  color: '#0f172a',
  fontSize: 13,
  lineHeight: 1.25,
  fontWeight: 900,
}

const notificationDetailStyle: React.CSSProperties = {
  display: 'block',
  color: '#475569',
  fontSize: 12,
  lineHeight: 1.35,
  marginTop: 4,
}

const notificationEmptyStyle: React.CSSProperties = {
  minHeight: 150,
  borderRadius: 12,
  background: '#f8fafc',
  color: '#64748b',
  display: 'grid',
  placeItems: 'center',
  alignContent: 'center',
  gap: 6,
  textAlign: 'center',
  padding: 24,
  fontSize: 13,
}

const notificationFooterStyle: React.CSSProperties = {
  width: '100%',
  minHeight: 44,
  border: 0,
  borderTop: '1px solid #eef2f7',
  background: '#f8fafc',
  color: '#16a34a',
  fontWeight: 900,
  cursor: 'pointer',
}

const accountingShellCss = `
.accounting-shell {
  --acc-bg: #f8fafc;
  --acc-surface: #ffffff;
  --acc-surface-raised: #ffffff;
  --acc-hover: #f1f5f9;
  --acc-border: #d8dee6;
  --acc-border-soft: #e8edf4;
  --acc-input: #ffffff;
  --acc-input-border: #cbd5e1;
  --acc-text: #0f172a;
  --acc-muted: #475569;
  --acc-placeholder: #64748b;
  display: grid !important;
  grid-template-columns: minmax(0, 1fr) !important;
  height: 100vh;
  height: 100dvh;
  min-height: 100vh;
  max-height: 100vh;
  max-height: 100dvh;
  align-items: stretch;
  overflow: hidden;
}
.accounting-shell,
.accounting-shell *,
.accounting-shell *::before,
.accounting-shell *::after {
  box-sizing: border-box;
}
.accounting-mobile-backdrop {
  display: block;
  position: fixed;
  inset: 0;
  z-index: 990;
  min-width: 0;
  min-height: 0;
  opacity: 0;
  pointer-events: none;
  background: rgba(15, 23, 42, .42);
  transition: opacity 160ms ease;
  border: 0;
  padding: 0;
  margin: 0;
}
.accounting-mobile-backdrop.is-open {
  opacity: 1;
  pointer-events: auto;
}
.accounting-shell > .accounting-sidebar,
.accounting-sidebar {
  position: fixed !important;
  inset: 0 auto 0 0;
  top: 0 !important;
  width: min(294px, 86vw);
  height: 100vh;
  height: 100dvh;
  min-height: 100vh !important;
  max-height: 100vh;
  max-height: 100dvh;
  overflow: hidden;
  z-index: 1000;
  transform: translateX(-104%);
  transition: transform 180ms ease;
  box-shadow: 28px 0 80px rgba(15, 23, 42, .34);
}
.accounting-shell > .accounting-sidebar.is-open,
.accounting-sidebar.is-open {
  transform: translateX(0);
}
.accounting-sidebar-nav {
  min-height: 0;
  overscroll-behavior: contain;
  scrollbar-width: thin;
}
.accounting-shell > .accounting-content-column,
.accounting-content-column {
  width: 100%;
  min-width: 0;
  min-height: 0 !important;
  height: 100vh;
  height: 100dvh;
  max-height: 100vh;
  max-height: 100dvh;
  display: grid !important;
  grid-template-rows: auto minmax(0, 1fr) !important;
  overflow: hidden !important;
}
.accounting-shell .accounting-sticky-header,
.accounting-sticky-header {
  position: sticky !important;
  top: 0 !important;
  z-index: 80 !important;
  width: 100%;
  height: auto !important;
  min-height: 64px;
  grid-template-columns: 1fr !important;
  align-items: stretch !important;
  gap: 10px !important;
  padding: 10px 12px !important;
  grid-row: 1;
}
.accounting-header-title,
.accounting-header-search {
  width: 100%;
  min-height: 44px;
}
.accounting-header-actions {
  width: 100%;
  display: grid !important;
  grid-template-columns: 44px 44px minmax(0, 1fr) 44px;
  align-items: center !important;
  justify-content: stretch !important;
  gap: 8px !important;
}
.accounting-header-actions > .accounting-new-record-wrap {
  width: 100%;
}
.accounting-header-actions > div {
  display: flex;
  align-items: center;
  justify-content: center;
}
.accounting-header-actions > button,
.accounting-header-actions > div > button {
  min-height: 44px !important;
  padding: 0 !important;
}
.accounting-header-actions > button:not(.accounting-new-record-button),
.accounting-header-actions > div > button:not(.accounting-new-record-button) {
  width: 44px !important;
  height: 44px !important;
  min-width: 44px !important;
  max-width: 44px !important;
  aspect-ratio: 1 / 1;
}
.accounting-new-record-wrap > .accounting-new-record-button {
  width: 100% !important;
  min-height: 44px !important;
  height: 44px !important;
  padding: 0 18px !important;
  justify-content: center !important;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}
.accounting-shell .accounting-scroll-content,
.accounting-scroll-content {
  min-height: 0;
  width: 100%;
  height: 100%;
  grid-row: 2;
  overflow-y: auto !important;
  overflow-x: hidden !important;
  overscroll-behavior: contain;
  -webkit-overflow-scrolling: touch;
  background: var(--acc-bg) !important;
  color: var(--acc-text) !important;
  padding-inline: 0;
}
.accounting-scroll-content :where(img, svg, canvas, video) {
  max-width: 100%;
}
.accounting-scroll-content :where(table) {
  max-width: 100%;
}
.accounting-scroll-content :where(input, select, textarea, button) {
  font: inherit;
}
.accounting-scroll-content :where(.accounting-card, .live-card, .invoices-card, .banking-card, .tx-card, .tx-table-card, .budget-card, .payroll-card, .tax-card, .reports-card, .audit-card) {
  max-width: 100%;
  min-width: 0;
}
.accounting-scroll-content :where(.accounting-table-wrap, .live-table-wrap, .invoices-table-wrap, .banking-table-wrap, .tx-table-wrap, .budget-table-wrap, .payroll-table-wrap, .tax-table-wrap, .reports-table-wrap, .audit-table-wrap) {
  max-width: 100%;
  min-width: 0;
}
.accounting-nav-row {
  min-height: 36px;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 0 10px;
  border-radius: 8px;
  color: #334155;
  background: transparent;
  font-size: 14px;
  font-weight: 500;
  line-height: 20px;
  transition: background 120ms ease, color 120ms ease, box-shadow 120ms ease;
}
.accounting-nav-row svg {
  color: #64748b;
  flex-shrink: 0;
  transition: color 120ms ease;
}
.accounting-nav-row:hover {
  background: #f1f5f9;
  color: #0f172a;
}
.accounting-nav-row:hover svg {
  color: #334155;
}
.accounting-nav-row.active {
  background: #eef2f7;
  color: #0f172a;
  box-shadow: inset 2px 0 0 #0f172a;
  font-weight: 600;
}
.accounting-nav-row.active svg {
  color: #0f172a;
}
@media (min-width: 901px) {
  .accounting-shell {
    grid-template-columns: 250px minmax(0, 1fr) !important;
    height: 100vh !important;
    height: 100dvh !important;
    min-height: 100vh !important;
    min-height: 100dvh !important;
    max-height: 100vh !important;
    max-height: 100dvh !important;
    overflow: hidden !important;
  }

  .accounting-mobile-backdrop {
    display: none;
    opacity: 0;
    pointer-events: none;
  }

  .accounting-shell > .accounting-sidebar,
  .accounting-sidebar {
    position: sticky !important;
    inset: auto;
    top: 0 !important;
    width: auto;
    height: 100vh !important;
    height: 100dvh !important;
    min-height: 100vh !important;
    max-height: 100vh;
    max-height: 100dvh;
    overflow: hidden;
    z-index: 70;
    transform: translateX(0);
    transition: none;
    box-shadow: none;
  }

  .accounting-shell .accounting-sticky-header,
  .accounting-sticky-header {
    position: sticky !important;
    top: 0 !important;
    z-index: 80 !important;
    height: 76px !important;
    min-height: 76px;
    grid-template-columns: minmax(210px, .9fr) minmax(260px, 520px) max-content !important;
    align-items: center !important;
    justify-content: space-between !important;
    gap: 18px !important;
    padding: 0 28px !important;
  }

  .accounting-header-title {
    min-height: 0;
    width: auto;
  }

  .accounting-sidebar-toggle {
    display: none !important;
  }

  .accounting-header-search {
    width: auto;
    min-height: 40px;
    max-width: 520px;
    justify-self: center;
  }

  .accounting-header-actions {
    width: auto;
    display: flex !important;
    grid-template-columns: none;
    align-items: center !important;
    justify-content: flex-end !important;
    justify-self: end;
    gap: 8px !important;
    height: 40px;
    white-space: nowrap;
  }

  .accounting-header-actions > button,
  .accounting-header-actions > div > button {
    min-height: 40px !important;
    height: 40px !important;
    padding: 0 !important;
  }

  .accounting-header-actions > button:not(.accounting-new-record-button),
  .accounting-header-actions > div > button:not(.accounting-new-record-button) {
    width: 40px !important;
    height: 40px !important;
    min-width: 40px !important;
    max-width: 40px !important;
    min-height: 40px !important;
  }

  .accounting-header-actions > .accounting-new-record-wrap {
    width: auto;
  }

  .accounting-new-record-wrap > .accounting-new-record-button {
    width: auto !important;
    min-height: 40px !important;
    height: 40px !important;
    padding: 0 20px !important;
    justify-content: center;
    overflow: visible;
    white-space: nowrap;
    text-overflow: clip;
  }

  .accounting-shell > .accounting-content-column,
  .accounting-content-column {
    width: 100%;
    height: 100vh !important;
    height: 100dvh !important;
    min-height: 0 !important;
    max-height: 100vh !important;
    max-height: 100dvh !important;
    display: grid !important;
    grid-template-rows: 76px minmax(0, 1fr) !important;
    overflow: hidden !important;
  }

  .accounting-shell .accounting-scroll-content,
  .accounting-scroll-content {
    width: 100%;
    height: auto;
    overflow-y: auto !important;
    overflow-x: hidden !important;
    min-height: 0;
    -webkit-overflow-scrolling: touch;
    overscroll-behavior: contain;
  }
}

@media (max-width: 640px) {
  .accounting-sticky-header {
    padding: 8px 10px !important;
  }

  .accounting-header-title > span:nth-of-type(1) {
    width: 34px !important;
    height: 34px !important;
  }

  .accounting-header-title > span:nth-of-type(2) > span:first-child {
    font-size: 14px !important;
  }

  .accounting-header-title > span:nth-of-type(2) > span:last-child {
    font-size: 11px !important;
  }

  .accounting-header-actions {
    grid-template-columns: 44px 44px minmax(0, 1fr) 42px;
  }
}

html[data-theme='dark'] .accounting-shell {
  --acc-bg: #050505;
  --acc-surface: #101010;
  --acc-surface-raised: #151515;
  --acc-hover: #1c1c1f;
  --acc-border: #333333;
  --acc-border-soft: #242424;
  --acc-input: #121212;
  --acc-input-border: #3a3a3a;
  --acc-text: #fafafa;
  --acc-muted: #c7c7cf;
  --acc-placeholder: #9ca3af;
  --acc-sidebar: #ffffff;
  --acc-sidebar-hover: #f1f5f9;
  --acc-sidebar-active: #eef2f7;
  --acc-positive: #86efac;
  --acc-warning: #fbbf24;
  --acc-danger: #fca5a5;
}

html[data-theme='light'] .accounting-shell {
  --acc-bg: #f3f4f6;
  --acc-surface: #ffffff;
  --acc-surface-raised: #ffffff;
  --acc-hover: #f1f5f9;
  --acc-border: #d8dee6;
  --acc-border-soft: #e8edf4;
  --acc-input: #ffffff;
  --acc-input-border: #cbd5e1;
  --acc-text: #0f172a;
  --acc-muted: #475569;
  --acc-placeholder: #64748b;
  --acc-sidebar: #ffffff;
  --acc-sidebar-hover: #f1f5f9;
  --acc-sidebar-active: #eef2f7;
  --acc-positive: #15803d;
  --acc-warning: #b45309;
  --acc-danger: #b91c1c;
}

html[data-theme] .accounting-shell,
html[data-theme] .accounting-content-column,
html[data-theme] .accounting-scroll-content,
html[data-theme] .accounting-scroll-content > *,
html[data-theme] .accounting-overview-page,
html[data-theme] .live-accounting-page,
html[data-theme] .invoices-page,
html[data-theme] .banking-page,
html[data-theme] .tx-page,
html[data-theme] .budget-page,
html[data-theme] .payroll-page,
html[data-theme] .tax-page,
html[data-theme] .reports-page,
html[data-theme] .audit-page {
  background: var(--acc-bg) !important;
  color: var(--acc-text) !important;
}

html[data-theme] .accounting-sticky-header {
  background: color-mix(in srgb, var(--acc-bg) 94%, transparent) !important;
  border-bottom: 1px solid var(--acc-border) !important;
  color: var(--acc-text) !important;
  box-shadow: none !important;
}

html[data-theme] .accounting-header-title > span:first-of-type {
  background: color-mix(in srgb, var(--acc-positive) 14%, var(--acc-surface)) !important;
  color: var(--acc-positive) !important;
}

html[data-theme] .accounting-header-title > span:last-of-type > span:first-child,
html[data-theme] .accounting-header-title strong,
html[data-theme] .accounting-sticky-header strong {
  color: var(--acc-text) !important;
}

html[data-theme] .accounting-header-title > span:last-of-type > span:last-child,
html[data-theme] .accounting-sticky-header small {
  color: var(--acc-muted) !important;
}

html[data-theme] .accounting-header-search,
html[data-theme] .accounting-header-actions button,
html[data-theme] .accounting-header-actions > div > button {
  background: var(--acc-input) !important;
  border-color: var(--acc-input-border) !important;
  color: var(--acc-text) !important;
  box-shadow: none !important;
}

html[data-theme] .accounting-header-search input {
  background: transparent !important;
  color: var(--acc-text) !important;
}

html[data-theme] .accounting-header-search input::placeholder {
  color: var(--acc-placeholder) !important;
  opacity: 1 !important;
}

html[data-theme] .accounting-header-search svg,
html[data-theme] .accounting-header-actions svg {
  color: var(--acc-muted) !important;
  stroke: currentColor !important;
}

html[data-theme] .accounting-new-record-button,
html[data-theme] .accounting-scroll-content button.primary,
html[data-theme] .accounting-scroll-content a.primary,
html[data-theme] .accounting-scroll-content [class*='primary-button'] {
  background: var(--acc-text) !important;
  border-color: var(--acc-text) !important;
  color: var(--acc-bg) !important;
}

html[data-theme] .accounting-sidebar {
  background: var(--acc-sidebar) !important;
  border-color: #e5e7eb !important;
  color: #0f172a !important;
}

html[data-theme] .accounting-nav-row {
  color: #334155 !important;
  background: transparent !important;
}

html[data-theme] .accounting-nav-row svg {
  color: currentColor !important;
  stroke: currentColor !important;
}

html[data-theme] .accounting-nav-row:hover,
html[data-theme] .accounting-nav-row.active {
  background: var(--acc-sidebar-hover) !important;
  color: #0f172a !important;
}

html[data-theme] .accounting-nav-row.active {
  background: var(--acc-sidebar-active) !important;
  box-shadow: none !important;
}

html[data-theme] .accounting-scroll-content h1,
html[data-theme] .accounting-scroll-content h2,
html[data-theme] .accounting-scroll-content h3,
html[data-theme] .accounting-scroll-content h4,
html[data-theme] .accounting-scroll-content strong,
html[data-theme] .accounting-scroll-content b,
html[data-theme] .accounting-scroll-content td strong,
html[data-theme] .accounting-scroll-content [class*='value'],
html[data-theme] .accounting-scroll-content [class*='heading'] {
  color: var(--acc-text) !important;
}

html[data-theme] .accounting-scroll-content p,
html[data-theme] .accounting-scroll-content small,
html[data-theme] .accounting-scroll-content label,
html[data-theme] .accounting-scroll-content th,
html[data-theme] .accounting-scroll-content td small,
html[data-theme] .accounting-scroll-content [class*='subtitle'],
html[data-theme] .accounting-scroll-content [class*='detail'],
html[data-theme] .accounting-scroll-content [class*='label'],
html[data-theme] .accounting-scroll-content [class*='eyebrow'],
html[data-theme] .accounting-scroll-content [class*='empty'] {
  color: var(--acc-muted) !important;
}

html[data-theme] .accounting-scroll-content :is(
  .accounting-card,
  .live-card,
  .invoices-card,
  .banking-card,
  .tx-card,
  .tx-table-card,
  .budget-card,
  .payroll-card,
  .tax-card,
  .reports-card,
  .audit-card,
  .budget-filter-panel,
  .budget-create-panel,
  .invoices-create-panel,
  .banking-modal,
  .live-bill-sheet,
  .tx-create-sheet,
  .audit-filter-panel,
  .audit-row-menu,
  .tx-row-menu
) {
  background: var(--acc-surface) !important;
  border-color: var(--acc-border) !important;
  color: var(--acc-text) !important;
  box-shadow: none !important;
}

html[data-theme] .accounting-scroll-content :is(
  .accounting-table-wrap,
  .live-table-wrap,
  .invoices-table-wrap,
  .banking-table-wrap,
  .tx-table-wrap,
  .budget-table-wrap,
  .payroll-table-wrap,
  .tax-table-wrap,
  .reports-table-wrap,
  .audit-table-wrap
) {
  background: var(--acc-surface) !important;
  border-color: var(--acc-border) !important;
  color: var(--acc-text) !important;
}

html[data-theme] .accounting-scroll-content table,
html[data-theme] .accounting-scroll-content thead,
html[data-theme] .accounting-scroll-content tbody,
html[data-theme] .accounting-scroll-content tr,
html[data-theme] .accounting-scroll-content th,
html[data-theme] .accounting-scroll-content td {
  border-color: var(--acc-border) !important;
}

html[data-theme] .accounting-scroll-content thead,
html[data-theme] .accounting-scroll-content th {
  background: var(--acc-hover) !important;
  color: var(--acc-muted) !important;
}

html[data-theme] .accounting-scroll-content td {
  background: transparent !important;
  color: var(--acc-text) !important;
}

html[data-theme] .accounting-scroll-content tbody tr:hover,
html[data-theme] .accounting-scroll-content tbody tr:hover td,
html[data-theme] .accounting-scroll-content [class*='row']:hover {
  background: color-mix(in srgb, var(--acc-text) 6%, transparent) !important;
}

html[data-theme] .accounting-scroll-content :is(input, select, textarea),
html[data-theme] .accounting-scroll-content :is(.live-card-head label, .invoices-search, .banking-search, .tx-search, .budget-search, .audit-search, .audit-select, .tx-select-button, .tx-account-select label, .budget-filter-panel select, .budget-filter-panel button) {
  background: var(--acc-input) !important;
  border-color: var(--acc-input-border) !important;
  color: var(--acc-text) !important;
  box-shadow: none !important;
}

html[data-theme] .accounting-scroll-content :is(input, select, textarea)::placeholder {
  color: var(--acc-placeholder) !important;
  opacity: 1 !important;
}

html[data-theme] .accounting-scroll-content :is(button, a[class*='button'], [class*='toolbar-button'], [class*='icon-button'], [class*='link-button'], [class*='row-actions'] button, [class*='actions'] button) {
  border-color: var(--acc-border) !important;
  color: var(--acc-text) !important;
  box-shadow: none !important;
}

html[data-theme] .accounting-scroll-content :is(button, a[class*='button'], [class*='toolbar-button'], [class*='icon-button'], [class*='link-button'], [class*='row-actions'] button, [class*='actions'] button):hover {
  background: var(--acc-hover) !important;
  color: var(--acc-text) !important;
}

html[data-theme] .accounting-scroll-content :is(button.primary, a.primary, [class*='primary-button']) {
  background: var(--acc-text) !important;
  border-color: var(--acc-text) !important;
  color: var(--acc-bg) !important;
}

html[data-theme] .accounting-scroll-content :is(button.primary, a.primary, [class*='primary-button']):hover {
  background: var(--acc-text) !important;
  color: var(--acc-bg) !important;
}

html[data-theme] .accounting-scroll-content :is(.accounting-pill, [class*='pill'], [class*='status'], [class*='tag'], [class*='badge']) {
  background: var(--acc-hover) !important;
  border-color: var(--acc-border) !important;
  color: var(--acc-text) !important;
}

html[data-theme] .accounting-scroll-content :is(.amount-negative, .tx-money-out, .budget-negative, .audit-metric em.down) {
  color: var(--acc-danger) !important;
}

html[data-theme] .accounting-scroll-content :is(.amount-positive, .tx-money-in, .budget-positive, .audit-metric em.up, .accounting-metric-delta) {
  color: var(--acc-positive) !important;
}

html[data-theme] .accounting-scroll-content :is(.accounting-empty, .empty, .invoices-empty, .banking-empty, .banking-feed-empty, .budget-empty, .audit-details-empty, .reports-empty-note, .reports-empty-chart) {
  background: var(--acc-surface) !important;
  border-color: var(--acc-border) !important;
  color: var(--acc-muted) !important;
}

html[data-theme] .accounting-scroll-content svg {
  color: currentColor;
  stroke: currentColor;
}

html[data-theme] .accounting-scroll-content svg text,
html[data-theme] .accounting-scroll-content .recharts-cartesian-axis-tick text,
html[data-theme] .accounting-scroll-content .recharts-legend-item-text,
html[data-theme] .accounting-scroll-content .recharts-text {
  fill: var(--acc-muted) !important;
  color: var(--acc-muted) !important;
}

html[data-theme] .accounting-scroll-content .recharts-cartesian-grid line,
html[data-theme] .accounting-scroll-content svg [stroke='#e5e7eb'],
html[data-theme] .accounting-scroll-content svg [stroke='#E5E7EB'],
html[data-theme] .accounting-scroll-content svg [stroke='#eef2f7'],
html[data-theme] .accounting-scroll-content svg [stroke='#EEF2F7'] {
  stroke: var(--acc-border) !important;
}

/* ============================================================
   ACCOUNTING DASHBOARD POLISH
   Keeps the existing finance workflows intact while aligning the
   accounting pages with the newer operational dashboard direction.
   ============================================================ */
html[data-theme='light'] .accounting-shell {
  --acc-bg: #f3f4f6;
  --acc-surface: #ffffff;
  --acc-surface-raised: #f8fafc;
  --acc-hover: #f8fafc;
  --acc-border: #dbe2ea;
  --acc-border-soft: #e5e7eb;
  --acc-input-border: #d8dee7;
  --acc-text: #0f172a;
  --acc-muted: #64748b;
}

@media (min-width: 901px) {
  html[data-theme='light'] .accounting-shell .accounting-content-column {
    grid-template-rows: 64px minmax(0, 1fr) !important;
  }

  html[data-theme='light'] .accounting-shell .accounting-sticky-header {
    height: 64px !important;
    min-height: 64px !important;
    padding: 0 20px !important;
    grid-template-columns: minmax(210px, .82fr) minmax(260px, 520px) max-content !important;
  }
}

html[data-theme='light'] .accounting-shell .accounting-scroll-content > :is(
  .live-accounting-page,
  .invoices-page,
  .banking-page,
  .tx-page,
  .budget-page,
  .payroll-page,
  .tax-page,
  .reports-page,
  .audit-page,
  .withholding-page
) {
  min-height: 100% !important;
  padding: 24px 32px 32px !important;
  background: #f3f4f6 !important;
  color: #0f172a !important;
}

html[data-theme='light'] .accounting-shell .accounting-scroll-content :is(
  .live-header,
  .invoices-header,
  .banking-header,
  .tx-header,
  .budget-header,
  .payroll-header,
  .tax-header,
  .reports-header,
  .audit-header,
  .withholding-header
) {
  margin-bottom: 18px !important;
  background: transparent !important;
  border: 0 !important;
  box-shadow: none !important;
}

html[data-theme='light'] .accounting-shell .accounting-scroll-content :is(
  .live-header h1,
  .invoices-title,
  .banking-title,
  .tx-title,
  .budget-title,
  .payroll-title,
  .tax-title,
  .reports-title,
  .audit-header h1,
  .withholding-header h1
) {
  color: #0f172a !important;
  font-size: 28px !important;
  line-height: 1.12 !important;
  font-weight: 650 !important;
  letter-spacing: 0 !important;
}

html[data-theme='light'] .accounting-shell .accounting-scroll-content :is(
  .live-header p,
  .invoices-subtitle,
  .banking-subtitle,
  .tx-subtitle,
  .budget-subtitle,
  .payroll-subtitle,
  .tax-subtitle,
  .reports-subtitle,
  .audit-header p,
  .withholding-header p
) {
  color: #64748b !important;
  font-size: 13.5px !important;
  font-weight: 400 !important;
  line-height: 1.45 !important;
}

html[data-theme='light'] .accounting-shell .accounting-scroll-content :is(
  .live-actions,
  .invoices-header-actions,
  .banking-header-actions,
  .tx-header-actions,
  .budget-header-actions,
  .payroll-actions,
  .tax-actions,
  .reports-actions,
  .audit-actions,
  .withholding-actions
) {
  gap: 10px !important;
}

html[data-theme='light'] .accounting-shell .accounting-scroll-content :is(
  .live-actions button,
  .live-actions a,
  .invoices-header-actions button,
  .banking-header-actions button,
  .tx-header-actions button,
  .budget-header-actions button,
  .payroll-actions button,
  .payroll-actions a,
  .tax-actions button,
  .tax-actions a,
  .reports-actions button,
  .audit-actions button,
  .withholding-actions button,
  .invoices-panel-actions button,
  .budget-panel-actions button,
  .reports-panel-header button,
  .tax-filterbar button,
  .tx-filterbar button
) {
  min-height: 38px !important;
  border-radius: 6px !important;
  border-color: #d8dee7 !important;
  background: #ffffff !important;
  color: #0f172a !important;
  font-size: 12.5px !important;
  font-weight: 600 !important;
  box-shadow: none !important;
}

html[data-theme='light'] .accounting-shell .accounting-scroll-content :is(
  .live-actions .primary,
  .invoices-primary-button,
  .tx-primary-button,
  .budget-primary-button,
  .banking-primary-button,
  .payroll-actions .is-primary,
  .request-actions .approve,
  .tax-actions a[href*='withholding'],
  .withholding-export
) {
  background: #22c55e !important;
  border-color: #22c55e !important;
  color: #ffffff !important;
}

html[data-theme='light'] .accounting-shell .accounting-scroll-content :is(
  .live-card,
  .invoices-card,
  .banking-card,
  .tx-card,
  .tx-table-card,
  .budget-card,
  .payroll-card,
  .tax-card,
  .reports-card,
  .audit-card,
  .withholding-card,
  .banking-modal,
  .live-bill-sheet,
  .tx-create-sheet,
  .budget-filter-panel,
  .budget-create-panel,
  .invoices-create-panel,
  .audit-filter-panel,
  .reports-filter-panel,
  .reports-action-panel
) {
  background: #ffffff !important;
  border: 1px solid #dbe2ea !important;
  border-radius: 8px !important;
  color: #0f172a !important;
  box-shadow: 0 1px 2px rgba(15, 23, 42, .04) !important;
}

html[data-theme='light'] .accounting-shell .accounting-scroll-content :is(
  .live-metric,
  .invoices-metric-card,
  .banking-metric-card,
  .tx-metric-card,
  .budget-metric-card,
  .payroll-metric,
  .tax-metric,
  .reports-metric,
  .audit-metric,
  .withholding-metric
) {
  min-height: 100px !important;
  padding: 15px 16px !important;
}

html[data-theme='light'] .accounting-shell .accounting-scroll-content :is(
  .invoices-card-value,
  .banking-card-value,
  .tx-card-value,
  .budget-value,
  .payroll-value,
  .tax-value,
  .reports-value,
  .audit-metric strong,
  .withholding-metric strong,
  .live-metric strong
) {
  color: #0f172a !important;
  font-size: 22px !important;
  line-height: 1.12 !important;
  font-weight: 750 !important;
}

html[data-theme='light'] .accounting-shell .accounting-scroll-content :is(
  .invoices-card-label,
  .banking-card-label,
  .tx-card-label,
  .budget-label,
  .payroll-label,
  .tax-label,
  .reports-label,
  .audit-metric small,
  .withholding-metric span span,
  .live-metric small
) {
  color: #64748b !important;
  font-size: 12px !important;
  font-weight: 600 !important;
}

html[data-theme='light'] .accounting-shell .accounting-scroll-content :is(
  .invoices-tabs,
  .banking-tabs,
  .tx-tabs,
  .budget-tabs,
  .payroll-tabs,
  .tax-tabs,
  .reports-tabs,
  .audit-tabs
) {
  min-height: 48px !important;
  gap: 24px !important;
  border-bottom: 1px solid #dbe2ea !important;
  background: transparent !important;
  box-shadow: none !important;
}

html[data-theme='light'] .accounting-shell .accounting-scroll-content :is(
  .invoices-tabs button,
  .banking-tabs button,
  .tx-tabs button,
  .budget-tabs button,
  .payroll-tabs button,
  .tax-tabs button,
  .reports-tabs button,
  .audit-tabs button
) {
  min-height: 48px !important;
  padding-bottom: 12px !important;
  border-radius: 0 !important;
  background: transparent !important;
  color: #475569 !important;
  font-size: 13px !important;
  font-weight: 500 !important;
}

html[data-theme='light'] .accounting-shell .accounting-scroll-content :is(
  .invoices-tabs button.is-active,
  .banking-tabs button.is-active,
  .tx-tabs button.is-active,
  .budget-tabs button.is-active,
  .payroll-tabs button.is-active,
  .tax-tabs button.is-active,
  .reports-tabs button.is-active,
  .audit-tabs button.is-active
) {
  border-bottom-color: #0f172a !important;
  color: #0f172a !important;
  font-weight: 600 !important;
}

html[data-theme='light'] .accounting-shell .accounting-scroll-content :is(
  .invoices-search,
  .banking-search,
  .tx-search,
  .tx-filter-search,
  .budget-search,
  .audit-search,
  .reports-browser label,
  .live-card-head label,
  .banking-filter-row label,
  .banking-select-filter,
  .tx-select-button,
  .tx-account-select label,
  .tax-filterbar label,
  .reports-filter-panel input,
  .reports-filter-panel select,
  .budget-filter-panel select,
  .audit-select
) {
  border-color: #d8dee7 !important;
  border-radius: 8px !important;
  background: #ffffff !important;
  color: #0f172a !important;
  box-shadow: none !important;
}

html[data-theme='light'] .accounting-shell .accounting-scroll-content :is(
  .accounting-table-wrap,
  .live-table-wrap,
  .invoices-table-wrap,
  .banking-table-wrap,
  .tx-table-wrap,
  .budget-table-wrap,
  .payroll-table-wrap,
  .tax-table-wrap,
  .reports-table-wrap,
  .audit-table-wrap
) {
  overflow-x: auto !important;
  border: 1px solid #e5e7eb !important;
  border-radius: 8px !important;
  background: #ffffff !important;
}

html[data-theme='light'] .accounting-shell .accounting-scroll-content :is(
  .accounting-table,
  .live-table,
  .invoices-table,
  .banking-table,
  .tx-table,
  .budget-table,
  .payroll-table,
  .tax-table,
  .reports-table,
  .audit-table
) th,
html[data-theme='light'] .accounting-shell .accounting-scroll-content table th {
  background: #f8fafc !important;
  color: #475569 !important;
  font-size: 12px !important;
  font-weight: 700 !important;
  text-transform: uppercase;
}

html[data-theme='light'] .accounting-shell .accounting-scroll-content table td {
  background: #ffffff !important;
  color: #0f172a !important;
}

html[data-theme='light'] .accounting-shell .accounting-scroll-content tbody tr:hover td {
  background: #f8fafc !important;
}

html[data-theme='light'] .accounting-shell .accounting-scroll-content :is(
  .accounting-empty,
  .empty,
  .invoices-empty,
  .banking-empty,
  .banking-feed-empty,
  .budget-empty,
  .payroll-empty,
  .tax-empty,
  .tax-calendar-empty,
  .reports-empty-note,
  .reports-empty-chart,
  .reports-empty-small,
  .audit-details-empty,
  .withholding-empty
) {
  min-height: 132px;
  border: 1px dashed #dbe2ea !important;
  border-radius: 8px !important;
  background: #ffffff !important;
  color: #64748b !important;
  font-size: 13px !important;
  font-weight: 500 !important;
}

@media (max-width: 820px) {
  html[data-theme='light'] .accounting-shell .accounting-scroll-content > :is(
    .live-accounting-page,
    .invoices-page,
    .banking-page,
    .tx-page,
    .budget-page,
    .payroll-page,
    .tax-page,
    .reports-page,
    .audit-page,
    .withholding-page
  ) {
    padding: 16px !important;
  }
}

/* ============================================================
   SHARED STATUS BADGES
   The neutral pill rule above flattens every status badge to one
   monochrome tone. These rules layer finance-standard colors on
   top, keyed off the status word baked into the badge class
   (e.g. "accounting-pill status-paid", "tax-pill pending"),
   scoped to pill/badge elements so category pills stay neutral.
   Order matters: narrower fragments that overlap a broader one
   (unpaid contains paid) come last so they win.
   ============================================================ */

/* --- Light theme --- */
html[data-theme='light'] .accounting-scroll-content :is([class*='pill'], [class*='badge'], [class*='chip']):is([class*='paid'], [class*='approved'], [class*='released'], [class*='completed'], [class*='reconciled'], [class*='cleared'], [class*='collected'], [class*='posted'], [class*='settled'], [class*='success']) {
  background: #dcfce7 !important;
  border-color: #bbf7d0 !important;
  color: #15803d !important;
}
html[data-theme='light'] .accounting-scroll-content :is([class*='pill'], [class*='badge'], [class*='chip']):is([class*='pending'], [class*='partial'], [class*='processing'], [class*='awaiting'], [class*='scheduled'], [class*='submitted'], [class*='review'], [class*='sent'], [class*='unpaid']) {
  background: #fef3c7 !important;
  border-color: #fde68a !important;
  color: #b45309 !important;
}
html[data-theme='light'] .accounting-scroll-content :is([class*='pill'], [class*='badge'], [class*='chip']):is([class*='overdue'], [class*='rejected'], [class*='cancelled'], [class*='canceled'], [class*='failed'], [class*='declined'], [class*='void'], [class*='returned'], [class*='error']) {
  background: #fee2e2 !important;
  border-color: #fecaca !important;
  color: #dc2626 !important;
}
html[data-theme='light'] .accounting-scroll-content :is([class*='pill'], [class*='badge'], [class*='chip']):is([class*='draft'], [class*='recorded'], [class*='archived'], [class*='closed']) {
  background: #f1f5f9 !important;
  border-color: #e2e8f0 !important;
  color: #475569 !important;
}

/* --- Dark theme (both triggers) --- */
html[data-theme='dark'] .accounting-scroll-content :is([class*='pill'], [class*='badge'], [class*='chip']):is([class*='paid'], [class*='approved'], [class*='released'], [class*='completed'], [class*='reconciled'], [class*='cleared'], [class*='collected'], [class*='posted'], [class*='settled'], [class*='success']),
.accounting-theme-dark .accounting-scroll-content :is([class*='pill'], [class*='badge'], [class*='chip']):is([class*='paid'], [class*='approved'], [class*='released'], [class*='completed'], [class*='reconciled'], [class*='cleared'], [class*='collected'], [class*='posted'], [class*='settled'], [class*='success']) {
  background: rgba(34, 197, 94, 0.16) !important;
  border-color: rgba(74, 222, 128, 0.40) !important;
  color: #86efac !important;
}
html[data-theme='dark'] .accounting-scroll-content :is([class*='pill'], [class*='badge'], [class*='chip']):is([class*='pending'], [class*='partial'], [class*='processing'], [class*='awaiting'], [class*='scheduled'], [class*='submitted'], [class*='review'], [class*='sent'], [class*='unpaid']),
.accounting-theme-dark .accounting-scroll-content :is([class*='pill'], [class*='badge'], [class*='chip']):is([class*='pending'], [class*='partial'], [class*='processing'], [class*='awaiting'], [class*='scheduled'], [class*='submitted'], [class*='review'], [class*='sent'], [class*='unpaid']) {
  background: rgba(245, 158, 11, 0.16) !important;
  border-color: rgba(251, 191, 36, 0.40) !important;
  color: #fbbf24 !important;
}
html[data-theme='dark'] .accounting-scroll-content :is([class*='pill'], [class*='badge'], [class*='chip']):is([class*='overdue'], [class*='rejected'], [class*='cancelled'], [class*='canceled'], [class*='failed'], [class*='declined'], [class*='void'], [class*='returned'], [class*='error']),
.accounting-theme-dark .accounting-scroll-content :is([class*='pill'], [class*='badge'], [class*='chip']):is([class*='overdue'], [class*='rejected'], [class*='cancelled'], [class*='canceled'], [class*='failed'], [class*='declined'], [class*='void'], [class*='returned'], [class*='error']) {
  background: rgba(239, 68, 68, 0.16) !important;
  border-color: rgba(248, 113, 113, 0.42) !important;
  color: #fca5a5 !important;
}
html[data-theme='dark'] .accounting-scroll-content :is([class*='pill'], [class*='badge'], [class*='chip']):is([class*='draft'], [class*='recorded'], [class*='archived'], [class*='closed']),
.accounting-theme-dark .accounting-scroll-content :is([class*='pill'], [class*='badge'], [class*='chip']):is([class*='draft'], [class*='recorded'], [class*='archived'], [class*='closed']) {
  background: rgba(148, 163, 184, 0.16) !important;
  border-color: rgba(148, 163, 184, 0.30) !important;
  color: #cbd5e1 !important;
}
`

const accountingThemeOverrideCss = `
/* ============================================================
   LIGHT ACCOUNTING WORKSPACE PASS
   Applies the cleaned dashboard treatment across every Accounting
   route while preserving each page's forms, tables, and workflows.
   ============================================================ */
html[data-theme='light'] .accounting-shell .accounting-scroll-content > :is(
  .accounting-overview-page,
  .live-accounting-page,
  .invoices-page,
  .banking-page,
  .tx-page,
  .budget-page,
  .payroll-page,
  .tax-page,
  .reports-page,
  .audit-page,
  .withholding-page
) {
  width: min(100%, var(--wf-content-max, 1440px)) !important;
  min-height: 100% !important;
  margin-inline: auto !important;
  padding: 24px clamp(16px, 2vw, 32px) 32px !important;
  background: #f3f4f6 !important;
  background-color: #f3f4f6 !important;
  color: #0f172a !important;
  overflow-x: clip !important;
}

html[data-theme='light'] .accounting-shell .accounting-scroll-content :is(
  .accounting-hero-header,
  .live-header,
  .invoices-header,
  .banking-header,
  .tx-header,
  .budget-header,
  .payroll-header,
  .tax-header,
  .reports-header,
  .audit-header,
  .withholding-header
) {
  display: grid !important;
  grid-template-columns: minmax(0, 1fr) auto !important;
  align-items: start !important;
  gap: 16px !important;
  margin: 0 0 16px !important;
  padding: 0 !important;
  background: transparent !important;
  background-color: transparent !important;
  border: 0 !important;
  box-shadow: none !important;
}

html[data-theme='light'] .accounting-shell .accounting-scroll-content :is(
  .accounting-hero-actions,
  .live-actions,
  .invoices-header-actions,
  .banking-header-actions,
  .tx-header-actions,
  .budget-header-actions,
  .payroll-actions,
  .tax-actions,
  .reports-actions,
  .audit-actions,
  .withholding-actions
) {
  min-width: 0 !important;
  max-width: 100% !important;
  display: flex !important;
  align-items: center !important;
  justify-content: flex-end !important;
  gap: 10px !important;
  flex-wrap: wrap !important;
}

html[data-theme='light'] .accounting-shell .accounting-scroll-content :is(
  .accounting-hero-copy h1,
  .live-header h1,
  .invoices-title,
  .banking-title,
  .tx-title,
  .budget-title,
  .payroll-title,
  .tax-title,
  .reports-title,
  .audit-header h1,
  .withholding-header h1
) {
  margin: 0 !important;
  color: #0f172a !important;
  font-size: 30px !important;
  line-height: 1.08 !important;
  font-weight: 750 !important;
  letter-spacing: 0 !important;
}

html[data-theme='light'] .accounting-shell .accounting-scroll-content :is(
  .accounting-hero-copy p,
  .live-header p,
  .invoices-subtitle,
  .banking-subtitle,
  .tx-subtitle,
  .budget-subtitle,
  .payroll-subtitle,
  .tax-subtitle,
  .reports-subtitle,
  .audit-header p,
  .withholding-header p
) {
  margin: 8px 0 0 !important;
  color: #64748b !important;
  font-size: 14px !important;
  line-height: 1.45 !important;
  font-weight: 400 !important;
}

html[data-theme='light'] .accounting-shell .accounting-scroll-content :is(
  .accounting-metrics,
  .live-metrics,
  .invoices-metrics,
  .banking-metrics,
  .tx-metrics,
  .budget-metrics,
  .payroll-metrics,
  .tax-metrics,
  .reports-metrics,
  .audit-metrics,
  .withholding-metrics
) {
  display: grid !important;
  grid-template-columns: repeat(auto-fit, minmax(min(210px, 100%), 1fr)) !important;
  gap: 12px !important;
  margin: 0 0 16px !important;
}

html[data-theme='light'] .accounting-shell .accounting-scroll-content :is(
  .accounting-metric-card,
  .live-metric,
  .invoices-metric-card,
  .banking-metric-card,
  .tx-metric-card,
  .budget-metric-card,
  .payroll-metric-card,
  .tax-metric-card,
  .reports-metric-card,
  .audit-metric,
  .withholding-metric
) {
  min-width: 0 !important;
  min-height: 104px !important;
  display: grid !important;
  grid-template-columns: 40px minmax(0, 1fr) !important;
  align-items: start !important;
  gap: 12px !important;
  padding: 14px 15px !important;
  border: 1px solid #dbe2ea !important;
  border-radius: 8px !important;
  background: #ffffff !important;
  background-color: #ffffff !important;
  color: #0f172a !important;
  box-shadow: 0 1px 2px rgba(15, 23, 42, .04) !important;
}

html[data-theme='light'] .accounting-shell .accounting-scroll-content :is(
  .accounting-metric-icon,
  .live-metric > span:first-child,
  .invoices-metric-icon,
  .banking-metric-icon,
  .tx-metric-icon,
  .budget-metric-icon,
  .payroll-metric-icon,
  .tax-metric-icon,
  .reports-metric-icon,
  .audit-metric > span:first-child,
  .withholding-metric-icon
) {
  width: 38px !important;
  height: 38px !important;
  margin: 0 !important;
  border: 1px solid #e5e7eb !important;
  border-radius: 6px !important;
  display: grid !important;
  place-items: center !important;
  flex: 0 0 auto !important;
}

html[data-theme='light'] .accounting-shell .accounting-scroll-content :is(
  .accounting-eyebrow,
  .live-metric small,
  .invoices-card-label,
  .banking-card-label,
  .tx-card-label,
  .budget-card-label,
  .payroll-label,
  .tax-label,
  .reports-label,
  .audit-metric small,
  .withholding-metric span span
) {
  min-height: 28px !important;
  display: block !important;
  color: #64748b !important;
  font-size: 11.5px !important;
  line-height: 1.2 !important;
  font-weight: 650 !important;
  white-space: normal !important;
  overflow: visible !important;
  text-overflow: clip !important;
}

html[data-theme='light'] .accounting-shell .accounting-scroll-content :is(
  .accounting-metric-value,
  .live-metric strong,
  .invoices-card-value,
  .banking-card-value,
  .tx-card-value,
  .budget-card-value,
  .payroll-value,
  .tax-value,
  .reports-value,
  .audit-metric strong,
  .withholding-metric strong
) {
  display: block !important;
  margin-top: 4px !important;
  color: #0f172a !important;
  font-size: 21px !important;
  line-height: 1.1 !important;
  font-weight: 800 !important;
  white-space: normal !important;
  overflow-wrap: anywhere !important;
}

html[data-theme='light'] .accounting-shell .accounting-scroll-content :is(
  .accounting-metric-delta,
  .live-metric em,
  .invoices-card-detail,
  .banking-card-detail,
  .tx-card-detail,
  .budget-card-detail,
  .payroll-detail,
  .tax-detail,
  .reports-detail,
  .audit-metric em
) {
  margin-top: 5px !important;
  font-size: 12px !important;
  line-height: 1.25 !important;
  font-weight: 650 !important;
  white-space: normal !important;
  overflow-wrap: anywhere !important;
}

html[data-theme='light'] .accounting-shell .accounting-scroll-content :is(
  .accounting-card,
  .live-card,
  .invoices-card,
  .banking-card,
  .tx-card,
  .tx-table-card,
  .budget-card,
  .payroll-card,
  .tax-card,
  .reports-card,
  .audit-card,
  .withholding-card,
  .banking-modal,
  .live-bill-sheet,
  .tx-create-sheet,
  .budget-filter-panel,
  .budget-create-panel,
  .invoices-create-panel,
  .audit-filter-panel,
  .reports-filter-panel,
  .reports-action-panel
) {
  border-color: #dbe2ea !important;
  border-radius: 8px !important;
  background: #ffffff !important;
  background-color: #ffffff !important;
  color: #0f172a !important;
  box-shadow: 0 1px 2px rgba(15, 23, 42, .04) !important;
}

html[data-theme='light'] .accounting-shell .accounting-scroll-content :is(
  .invoices-tabs,
  .banking-tabs,
  .tx-tabs,
  .budget-tabs,
  .payroll-tabs,
  .tax-tabs,
  .reports-tabs,
  .audit-tabs
) {
  min-height: 48px !important;
  margin: 0 0 16px !important;
  padding-left: 0 !important;
  gap: 24px !important;
  border-bottom: 1px solid #dbe2ea !important;
  background: transparent !important;
  box-shadow: none !important;
}

html[data-theme='light'] .accounting-shell .accounting-scroll-content :is(
  .accounting-hero-action,
  .live-actions button,
  .live-actions a,
  .invoices-header-actions button,
  .banking-header-actions button,
  .tx-header-actions button,
  .budget-header-actions button,
  .payroll-actions button,
  .payroll-actions a,
  .tax-actions button,
  .tax-actions a,
  .reports-actions button,
  .audit-actions button,
  .withholding-actions button
) {
  min-height: 38px !important;
  border-radius: 6px !important;
  border: 1px solid #d8dee7 !important;
  background: #ffffff !important;
  color: #0f172a !important;
  box-shadow: none !important;
}

html[data-theme='light'] .accounting-shell .accounting-scroll-content :is(
  .accounting-hero-action.is-primary,
  .live-actions .primary,
  .invoices-primary-button,
  .banking-primary-button,
  .tx-primary-button,
  .budget-primary-button,
  .payroll-actions .is-primary,
  .request-actions .approve,
  .tax-actions a[href*='withholding'],
  .withholding-export
) {
  background: #22c55e !important;
  border-color: #22c55e !important;
  color: #ffffff !important;
}

html[data-theme='light'] .accounting-shell .accounting-scroll-content :is(
  .invoices-search,
  .banking-search,
  .tx-search,
  .tx-filter-search,
  .budget-search,
  .audit-search,
  .reports-browser label,
  .live-card-head label,
  .banking-filter-row label,
  .banking-select-filter,
  .tx-select-button,
  .tx-account-select label,
  .tax-filterbar label,
  .reports-filter-panel input,
  .reports-filter-panel select,
  .budget-filter-panel select,
  .audit-select
) {
  background: #ffffff !important;
  border-color: #d8dee7 !important;
}

@media (max-width: 960px) {
  html[data-theme='light'] .accounting-shell .accounting-scroll-content :is(
    .accounting-hero-header,
    .live-header,
    .invoices-header,
    .banking-header,
    .tx-header,
    .budget-header,
    .payroll-header,
    .tax-header,
    .reports-header,
    .audit-header,
    .withholding-header
  ) {
    grid-template-columns: 1fr !important;
  }

  html[data-theme='light'] .accounting-shell .accounting-scroll-content :is(
    .accounting-hero-actions,
    .live-actions,
    .invoices-header-actions,
    .banking-header-actions,
    .tx-header-actions,
    .budget-header-actions,
    .payroll-actions,
    .tax-actions,
    .reports-actions,
    .audit-actions,
    .withholding-actions
  ) {
    width: 100% !important;
    justify-content: flex-start !important;
  }

  html[data-theme='light'] .accounting-shell .accounting-scroll-content :is(
    .invoices-search,
    .banking-search,
    .tx-search,
    .budget-search,
    .audit-search
  ) {
    width: 100% !important;
  }
}

html .accounting-shell.accounting-theme-dark {
  --acc-bg: #101010;
  --acc-surface: #101010;
  --acc-surface-raised: #101010;
  --acc-hover: #181818;
  --acc-border: #333333;
  --acc-border-soft: #242424;
  --acc-input: #101010;
  --acc-input-border: #3a3a3a;
  --acc-text: #fafafa;
  --acc-muted: #c7c7cf;
  --acc-placeholder: #9ca3af;
  background: #101010 !important;
  background-color: #101010 !important;
  color: #fafafa !important;
}

html .accounting-shell.accounting-theme-dark .accounting-content-column,
html .accounting-shell.accounting-theme-dark .accounting-scroll-content,
html .accounting-shell.accounting-theme-dark .accounting-scroll-content > *,
html .accounting-shell.accounting-theme-dark .accounting-overview-page,
html .accounting-shell.accounting-theme-dark .live-accounting-page,
html .accounting-shell.accounting-theme-dark .invoices-page,
html .accounting-shell.accounting-theme-dark .banking-page,
html .accounting-shell.accounting-theme-dark .tx-page,
html .accounting-shell.accounting-theme-dark .budget-page,
html .accounting-shell.accounting-theme-dark .payroll-page,
html .accounting-shell.accounting-theme-dark .tax-page,
html .accounting-shell.accounting-theme-dark .reports-page,
html .accounting-shell.accounting-theme-dark .audit-page,
html .accounting-shell.accounting-theme-dark .accounting-scroll-content [class$='-page'],
html .accounting-shell.accounting-theme-dark .accounting-scroll-content [class*='-page '] {
  background: #101010 !important;
  background-color: #101010 !important;
  color: var(--acc-text) !important;
}

html .accounting-shell.accounting-theme-dark .accounting-scroll-content :is(
  .accounting-card,
  .live-card,
  .invoices-card,
  .banking-card,
  .tx-card,
  .tx-table-card,
  .budget-card,
  .payroll-card,
  .tax-card,
  .reports-card,
  .audit-card,
  .accounting-table-wrap,
  .live-table-wrap,
  .invoices-table-wrap,
  .banking-table-wrap,
  .tx-table-wrap,
  .budget-table-wrap,
  .payroll-table-wrap,
  .tax-table-wrap,
  .reports-table-wrap,
  .audit-table-wrap,
  .budget-filter-panel,
  .budget-create-panel,
  .invoices-create-panel,
  .banking-modal,
  .live-bill-sheet,
  .tx-create-sheet,
  .audit-filter-panel,
  .audit-row-menu,
  .tx-row-menu,
  .status-summary,
  .quick-actions
) {
  background: #101010 !important;
  background-color: #101010 !important;
  border-color: var(--acc-border) !important;
  color: var(--acc-text) !important;
  box-shadow: none !important;
}

html .accounting-shell.accounting-theme-dark .accounting-scroll-content [style*='background: #fff' i],
html .accounting-shell.accounting-theme-dark .accounting-scroll-content [style*='background:#fff' i],
html .accounting-shell.accounting-theme-dark .accounting-scroll-content [style*='background: white' i],
html .accounting-shell.accounting-theme-dark .accounting-scroll-content [style*='background: #ffffff' i],
html .accounting-shell.accounting-theme-dark .accounting-scroll-content [style*='background:#ffffff' i],
html .accounting-shell.accounting-theme-dark .accounting-scroll-content [style*='background: rgb(255, 255, 255)' i],
html .accounting-shell.accounting-theme-dark .accounting-scroll-content [style*='background: #f8fafc' i],
html .accounting-shell.accounting-theme-dark .accounting-scroll-content [style*='background: #f1f5f9' i],
html .accounting-shell.accounting-theme-dark .accounting-scroll-content [style*='background: #f4f4f5' i] {
  background: #101010 !important;
  background-color: #101010 !important;
  border-color: var(--acc-border) !important;
  color: var(--acc-text) !important;
}

html[data-theme='dark'] .accounting-shell {
  --acc-bg: #101010;
  --acc-surface: #101010;
  --acc-surface-raised: #101010;
  --acc-hover: #181818;
  --acc-border: #333333;
  --acc-border-soft: #242424;
  --acc-input: #101010;
  --acc-input-border: #3a3a3a;
  --acc-text: #fafafa;
  --acc-muted: #c7c7cf;
  --acc-placeholder: #9ca3af;
}

html[data-theme='dark'] body:has(.accounting-shell),
html[data-theme='dark'] body:has(.accounting-shell) #__next,
html[data-theme='dark'] body:has(.accounting-shell) main,
html[data-theme='dark'] body:has(.accounting-shell) .accounting-shell {
  background: #101010 !important;
  background-color: #101010 !important;
}

html[data-theme='dark'] .accounting-content-column,
html[data-theme='dark'] .accounting-scroll-content,
html[data-theme='dark'] .accounting-scroll-content > *,
html[data-theme='dark'] .accounting-overview-page,
html[data-theme='dark'] .live-accounting-page,
html[data-theme='dark'] .invoices-page,
html[data-theme='dark'] .banking-page,
html[data-theme='dark'] .tx-page,
html[data-theme='dark'] .budget-page,
html[data-theme='dark'] .payroll-page,
html[data-theme='dark'] .tax-page,
html[data-theme='dark'] .reports-page,
html[data-theme='dark'] .audit-page,
html[data-theme='dark'] .accounting-scroll-content [class$='-page'],
html[data-theme='dark'] .accounting-scroll-content [class*='-page '] {
  background: #101010 !important;
  background-color: #101010 !important;
  color: var(--acc-text) !important;
}

html[data-theme='dark'] .accounting-scroll-content :is(
  .accounting-card,
  .live-card,
  .invoices-card,
  .banking-card,
  .tx-card,
  .tx-table-card,
  .budget-card,
  .payroll-card,
  .tax-card,
  .reports-card,
  .audit-card,
  .accounting-table-wrap,
  .live-table-wrap,
  .invoices-table-wrap,
  .banking-table-wrap,
  .tx-table-wrap,
  .budget-table-wrap,
  .payroll-table-wrap,
  .tax-table-wrap,
  .reports-table-wrap,
  .audit-table-wrap,
  .budget-filter-panel,
  .budget-create-panel,
  .invoices-create-panel,
  .banking-modal,
  .live-bill-sheet,
  .tx-create-sheet,
  .audit-filter-panel,
  .audit-row-menu,
  .tx-row-menu,
  .status-summary,
  .quick-actions
) {
  background: #101010 !important;
  background-color: #101010 !important;
  border-color: var(--acc-border) !important;
  color: var(--acc-text) !important;
  box-shadow: none !important;
}

html[data-theme='dark'] .accounting-scroll-content [style*='background: #fff' i],
html[data-theme='dark'] .accounting-scroll-content [style*='background:#fff' i],
html[data-theme='dark'] .accounting-scroll-content [style*='background: white' i],
html[data-theme='dark'] .accounting-scroll-content [style*='background: #ffffff' i],
html[data-theme='dark'] .accounting-scroll-content [style*='background:#ffffff' i],
html[data-theme='dark'] .accounting-scroll-content [style*='background: rgb(255, 255, 255)' i],
html[data-theme='dark'] .accounting-scroll-content [style*='background: #f8fafc' i],
html[data-theme='dark'] .accounting-scroll-content [style*='background: #f1f5f9' i],
html[data-theme='dark'] .accounting-scroll-content [style*='background: #f4f4f5' i] {
  background: #101010 !important;
  background-color: #101010 !important;
  border-color: var(--acc-border) !important;
  color: var(--acc-text) !important;
}

html[data-theme='dark'] .accounting-scroll-content thead,
html[data-theme='dark'] .accounting-scroll-content th {
  background: #181818 !important;
  background-color: #181818 !important;
  color: var(--acc-muted) !important;
  border-color: var(--acc-border) !important;
}

html[data-theme='dark'] .accounting-scroll-content td {
  background: #101010 !important;
  background-color: #101010 !important;
  color: var(--acc-text) !important;
  border-color: var(--acc-border) !important;
}

html[data-theme='dark'] .accounting-scroll-content :is(input, select, textarea, button, a[class*='button']) {
  border-color: var(--acc-input-border) !important;
}

/* ============================================================
   DARK-MODE ELEVATION
   Earlier rules flatten page + cards to one #101010 tone. Here we
   give the page the darkest base and lift cards/surfaces a step
   above it so hierarchy is readable. The extra .accounting-shell
   in each selector raises specificity above the flat rules so
   these win without editing the fragile blocks above.
   ============================================================ */
html[data-theme='dark'] .accounting-shell,
.accounting-shell.accounting-theme-dark {
  --acc-bg: #0a0a0a;
  --acc-surface: #171717;
  --acc-surface-raised: #1f1f1f;
  --acc-hover: #242424;
}

/* Page canvas → darkest base */
html[data-theme='dark'] .accounting-shell .accounting-scroll-content,
html[data-theme='dark'] .accounting-shell .accounting-scroll-content > [class$='-page'],
.accounting-shell.accounting-theme-dark .accounting-scroll-content,
.accounting-shell.accounting-theme-dark .accounting-scroll-content > [class$='-page'] {
  background: var(--acc-bg) !important;
  background-color: var(--acc-bg) !important;
}

/* Cards, panels, table wraps, sheets → raised surface with soft border */
html[data-theme='dark'] .accounting-shell .accounting-scroll-content :is(.accounting-card, .live-card, .invoices-card, .banking-card, .tx-card, .tx-table-card, .budget-card, .payroll-card, .tax-card, .reports-card, .audit-card, .accounting-table-wrap, .live-table-wrap, .invoices-table-wrap, .banking-table-wrap, .tx-table-wrap, .budget-table-wrap, .payroll-table-wrap, .tax-table-wrap, .reports-table-wrap, .audit-table-wrap, .budget-filter-panel, .budget-create-panel, .invoices-create-panel, .banking-modal, .live-bill-sheet, .tx-create-sheet, .audit-filter-panel, .audit-row-menu, .tx-row-menu, .status-summary, .quick-actions),
.accounting-shell.accounting-theme-dark .accounting-scroll-content :is(.accounting-card, .live-card, .invoices-card, .banking-card, .tx-card, .tx-table-card, .budget-card, .payroll-card, .tax-card, .reports-card, .audit-card, .accounting-table-wrap, .live-table-wrap, .invoices-table-wrap, .banking-table-wrap, .tx-table-wrap, .budget-table-wrap, .payroll-table-wrap, .tax-table-wrap, .reports-table-wrap, .audit-table-wrap, .budget-filter-panel, .budget-create-panel, .invoices-create-panel, .banking-modal, .live-bill-sheet, .tx-create-sheet, .audit-filter-panel, .audit-row-menu, .tx-row-menu, .status-summary, .quick-actions) {
  background: var(--acc-surface) !important;
  background-color: var(--acc-surface) !important;
  border-color: var(--acc-border) !important;
}

/* Inline-white card-like elements → raised surface too */
html[data-theme='dark'] .accounting-shell .accounting-scroll-content [style*='background: #fff' i],
html[data-theme='dark'] .accounting-shell .accounting-scroll-content [style*='background:#fff' i],
html[data-theme='dark'] .accounting-shell .accounting-scroll-content [style*='background: #ffffff' i],
html[data-theme='dark'] .accounting-shell .accounting-scroll-content [style*='background:#ffffff' i],
html[data-theme='dark'] .accounting-shell .accounting-scroll-content [style*='background: white' i],
html[data-theme='dark'] .accounting-shell .accounting-scroll-content [style*='background: #f8fafc' i],
html[data-theme='dark'] .accounting-shell .accounting-scroll-content [style*='background: #f1f5f9' i] {
  background: var(--acc-surface) !important;
  background-color: var(--acc-surface) !important;
  border-color: var(--acc-border) !important;
}

/* Table cells sit on the card surface; headers lift one step more */
html[data-theme='dark'] .accounting-shell .accounting-scroll-content td {
  background: var(--acc-surface) !important;
  background-color: var(--acc-surface) !important;
}
html[data-theme='dark'] .accounting-shell .accounting-scroll-content :is(thead, th) {
  background: var(--acc-surface-raised) !important;
  background-color: var(--acc-surface-raised) !important;
}

/* Subtle lift so cards read as elevated, not painted-on */
html[data-theme='dark'] .accounting-shell .accounting-scroll-content :is(.accounting-card, .live-card, .invoices-card, .banking-card, .tx-card, .tx-table-card, .budget-card, .payroll-card, .tax-card, .reports-card, .audit-card) {
  box-shadow: 0 1px 0 rgba(255, 255, 255, 0.03), 0 8px 24px rgba(0, 0, 0, 0.45) !important;
}
`
