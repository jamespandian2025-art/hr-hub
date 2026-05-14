'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  ArrowLeft,
  Bell,
  CalendarCheck,
  ChevronDown,
  CreditCard,
  FileText,
  Menu,
  Plus,
  Search,
  Settings,
  UserPlus,
  X,
} from 'lucide-react'
import HrMessenger from './HrMessenger'
import { getHrRouteMeta, HR_NAV_ITEMS, isHrRouteActive } from './hrNav'
import { loadStored } from '@/app/employee/employeeData'
import { allowanceRequestKey, AllowanceRequest } from '@/app/hr/enterpriseData'
import { logoutUser } from '@/lib/auth/logout'

type StoredAccount = {
  company?: string
  fullName?: string
  name?: string
  email?: string
  role?: string
}

const accountKey = 'flowsys-account'
const sessionKey = 'flowsys-auth-session'
const leaveRequestKey = 'flowsys-hr-leave-requests'

type LeaveNotification = {
  id: string
  employeeName?: string
  leaveType: string
  days: number
  status: string
  approvalStep?: string
  hrApprovalStatus?: string
  createdAt: string
}

function parseStoredObject(value: string | null): StoredAccount {
  if (!value) return {}
  try {
    const parsed = JSON.parse(value)
    return parsed && typeof parsed === 'object' ? parsed as StoredAccount : {}
  } catch {
    return {}
  }
}

function initials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .map(part => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || 'HR'
}

function formatNotificationTime(value?: string) {
  if (!value) return 'Just now'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Just now'
  const diff = Date.now() - date.getTime()
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)
  if (minutes < 1) return 'Just now'
  if (minutes < 60) return `${minutes}m ago`
  if (hours < 24) return `${hours}h ago`
  if (days < 7) return `${days}d ago`
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export default function HrShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [account, setAccount] = useState<StoredAccount>({})
  const [loanNotificationsOpen, setLoanNotificationsOpen] = useState(false)
  const [createMenuOpen, setCreateMenuOpen] = useState(false)
  const [accountMenuOpen, setAccountMenuOpen] = useState(false)
  const [leaveNotifications, setLeaveNotifications] = useState<LeaveNotification[]>([])
  const [allowanceNotifications, setAllowanceNotifications] = useState<AllowanceRequest[]>([])
  const activeMeta = getHrRouteMeta(pathname)
  const ActiveIcon = activeMeta.icon

  useEffect(() => {
    const loadAccount = () => {
      const storedAccount = parseStoredObject(window.localStorage.getItem(accountKey))
      const storedSession = parseStoredObject(window.localStorage.getItem(sessionKey))
      setAccount({ ...storedSession, ...storedAccount })
      setLeaveNotifications(loadStored<LeaveNotification[]>(leaveRequestKey, []))
      setAllowanceNotifications(loadStored<AllowanceRequest[]>(allowanceRequestKey, []))
    }
    loadAccount()
    window.addEventListener('storage', loadAccount)
    return () => window.removeEventListener('storage', loadAccount)
  }, [])

  const displayName = account.fullName || account.name || 'HR User'
  const company = account.company || 'WiseFlow Company'
  const role = account.role || 'Team member'
  const pendingHrLeaveRequests = leaveNotifications.filter(request =>
    request.status === 'Pending' && (request.approvalStep === 'hr' || request.hrApprovalStatus === 'Pending')
  )
  const approvedAllowanceUpdates = allowanceNotifications.filter(request =>
    request.status === 'Finance Approved'
  )
  const openHrRoute = (target: string) => {
    setLoanNotificationsOpen(false)
    setCreateMenuOpen(false)
    setAccountMenuOpen(false)
    router.push(target)
  }
  const logout = async () => {
    await logoutUser()
    setAccountMenuOpen(false)
    router.replace('/login')
  }
  const hrNotificationItems = [
    ...pendingHrLeaveRequests.map(request => ({
      id: `leave-${request.id}`,
      title: `${request.employeeName || 'Employee'} requested ${request.leaveType}`,
      detail: `${request.days} day${Number(request.days || 0) === 1 ? '' : 's'} needs HR review`,
      type: 'Leave request',
      time: request.createdAt,
      tone: '#1a73e8',
      target: '/hr/leave-requests',
    })),
    ...approvedAllowanceUpdates.map(request => ({
      id: `allowance-${request.id}`,
      title: `${request.employeeName} ${request.type.toLowerCase()} allowance approved`,
      detail: 'Finance approved and ready for payroll reporting',
      type: 'Allowance',
      time: request.updatedAt || request.createdAt,
      tone: '#34a853',
      target: '/hr/payroll',
    })),
  ].sort((a, b) => new Date(b.time || '').getTime() - new Date(a.time || '').getTime())

  const renderNavContent = () => (
    <>
      <div className="hr-sidebar-brand">
        <div className="hr-brand-mark">HR</div>
        <div>
          <div className="hr-brand-title">HR Hub</div>
          <div className="hr-brand-subtitle">People workspace</div>
        </div>
      </div>

      <Link href="/dashboard" className="hr-back-link">
        <ArrowLeft size={15} />
        Back to WiseFlow
      </Link>

      <div className="hr-nav-group-label">Workspace</div>
      <nav className="hr-sidebar-nav" aria-label="HR workspace navigation">
        {HR_NAV_ITEMS.map(item => {
          const Icon = item.icon
          const active = isHrRouteActive(pathname, item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              className={active ? 'hr-nav-item is-active' : 'hr-nav-item'}
              onClick={() => setMobileOpen(false)}
            >
              <Icon size={16} />
              <span>{item.label}</span>
            </Link>
          )
        })}
      </nav>
    </>
  )

  return (
    <div className="hr-workspace">
      <aside className="hr-sidebar">{renderNavContent()}</aside>

      <button
        type="button"
        className={mobileOpen ? 'hr-mobile-backdrop is-open' : 'hr-mobile-backdrop'}
        aria-label="Close HR navigation"
        onClick={() => setMobileOpen(false)}
      />
      <aside className={mobileOpen ? 'hr-mobile-sidebar is-open' : 'hr-mobile-sidebar'}>
        <button type="button" className="hr-mobile-close" onClick={() => setMobileOpen(false)} aria-label="Close HR navigation">
          <X size={16} />
        </button>
        {renderNavContent()}
      </aside>

      <div className="hr-main">
        <header className="hr-topbar">
          <div className="hr-topbar-left">
            <button type="button" className="hr-menu-button" onClick={() => setMobileOpen(true)} aria-label="Open HR navigation">
              <Menu size={18} />
            </button>
            <div className="hr-page-icon">
              <ActiveIcon size={18} />
            </div>
            <div>
              <div className="hr-page-title">{activeMeta.label}</div>
              <div className="hr-page-subtitle">{activeMeta.description}</div>
            </div>
          </div>

          <label className="hr-search">
            <Search size={15} />
            <input type="search" placeholder="Search HR" aria-label="Search HR" />
          </label>

          <div className="hr-topbar-actions">
            <button type="button" className="hr-icon-button" aria-label="Notifications" onClick={() => { setLoanNotificationsOpen(open => !open); setCreateMenuOpen(false); setAccountMenuOpen(false) }} style={{ position: 'relative' }}>
              <Bell size={17} />
              {hrNotificationItems.length > 0 && <span style={notificationBadgeStyle}>{hrNotificationItems.length}</span>}
            </button>
            {loanNotificationsOpen && (
              <div style={notificationPanelStyle}>
                <div style={notificationHeaderStyle}>
                  <div>
                    <strong style={{ display: 'block', color: '#202124', fontSize: 18, lineHeight: 1.2 }}>Notifications</strong>
                    <span style={{ color: '#5f6368', fontSize: 12 }}>{hrNotificationItems.length ? `${hrNotificationItems.length} update${hrNotificationItems.length === 1 ? '' : 's'} waiting` : 'You are all caught up'}</span>
                  </div>
                  <button type="button" onClick={() => setLoanNotificationsOpen(false)} style={notificationTextButtonStyle}>Done</button>
                </div>
                <div style={notificationListStyle}>
                  {hrNotificationItems.length ? hrNotificationItems.slice(0, 8).map(item => (
                    <button key={item.id} type="button" onClick={() => { setLoanNotificationsOpen(false); router.push(item.target) }} style={notificationItemStyle}>
                      <span style={{ ...notificationDotStyle, background: item.tone }} />
                      <span style={{ minWidth: 0 }}>
                        <span style={notificationItemMetaStyle}>{item.type} · {formatNotificationTime(item.time)}</span>
                        <span style={notificationItemTitleStyle}>{item.title}</span>
                        <span style={notificationItemDetailStyle}>{item.detail}</span>
                      </span>
                    </button>
                  )) : (
                    <div style={notificationEmptyStyle}>
                      <Bell size={20} />
                      <strong>No HR requests waiting</strong>
                      <span>New leave, allowance, and payroll updates will appear here.</span>
                    </div>
                  )}
                </div>
                {hrNotificationItems.length > 0 && (
                  <button type="button" onClick={() => { setLoanNotificationsOpen(false); router.push('/hr/approvals') }} style={notificationFooterButtonStyle}>
                    View all HR approvals
                  </button>
                )}
              </div>
            )}
            <button type="button" className="hr-primary-button" onClick={() => router.push('/hr/employees/new')}>
              <UserPlus size={15} />
              Add employee
            </button>
            <div style={{ position: 'relative' }}>
              <button type="button" className="hr-icon-button" aria-label="Create HR item" onClick={() => { setCreateMenuOpen(open => !open); setLoanNotificationsOpen(false); setAccountMenuOpen(false) }}>
                <Plus size={17} />
              </button>
              {createMenuOpen && (
                <div style={quickMenuStyle}>
                  <button type="button" style={quickMenuItemStyle} onClick={() => openHrRoute('/hr/employees/new')}><UserPlus size={15} /> New employee</button>
                  <button type="button" style={quickMenuItemStyle} onClick={() => openHrRoute('/hr/leave-requests')}><CalendarCheck size={15} /> Leave request</button>
                  <button type="button" style={quickMenuItemStyle} onClick={() => openHrRoute('/hr/payroll')}><CreditCard size={15} /> Payroll run</button>
                  <button type="button" style={quickMenuItemStyle} onClick={() => openHrRoute('/hr/documents')}><FileText size={15} /> Document</button>
                </div>
              )}
            </div>
            <div style={{ position: 'relative' }}>
              <button type="button" className="hr-user-button" aria-label="HR account menu" onClick={() => { setAccountMenuOpen(open => !open); setLoanNotificationsOpen(false); setCreateMenuOpen(false) }}>
                <span className="hr-user-avatar">{initials(displayName)}</span>
                <span className="hr-user-copy">
                  <strong>{displayName}</strong>
                  <small>{company} - {role}</small>
                </span>
                <ChevronDown size={14} />
              </button>
              {accountMenuOpen && (
                <div style={accountMenuStyle}>
                  <div style={accountMenuHeaderStyle}>
                    <span className="hr-user-avatar">{initials(displayName)}</span>
                    <span style={{ minWidth: 0 }}>
                      <strong style={{ display: 'block', color: '#0f172a', fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{displayName}</strong>
                      <small style={{ display: 'block', color: '#64748b', fontSize: 12, marginTop: 2 }}>{company} - {role}</small>
                    </span>
                  </div>
                  <button type="button" style={quickMenuItemStyle} onClick={() => openHrRoute('/hr/settings')}><Settings size={15} /> HR settings</button>
                  <button type="button" style={quickMenuItemStyle} onClick={() => openHrRoute('/employee/profile')}><UserPlus size={15} /> My profile</button>
                  <button type="button" style={{ ...quickMenuItemStyle, color: '#dc2626', borderTop: '1px solid #edf2f7' }} onClick={logout}>Logout</button>
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="hr-content">{children}</main>
      </div>
      <HrMessenger />
    </div>
  )
}

const notificationBadgeStyle = {
  position: 'absolute',
  top: -4,
  right: -4,
  minWidth: 18,
  height: 18,
  borderRadius: 999,
  display: 'grid',
  placeItems: 'center',
  background: '#ef4444',
  color: '#fff',
  fontSize: 11,
  fontWeight: 900,
  border: '2px solid #0f3d2a',
} as const

const notificationPanelStyle = {
  position: 'absolute',
  top: 'calc(100% + 10px)',
  right: 148,
  zIndex: 80,
  width: 380,
  borderRadius: 18,
  border: '1px solid #dadce0',
  background: '#ffffff',
  boxShadow: '0 12px 34px rgba(60, 64, 67, .24), 0 3px 10px rgba(60, 64, 67, .12)',
  padding: 0,
  overflow: 'hidden',
} as const

const notificationHeaderStyle = {
  padding: '16px 18px 12px',
  borderBottom: '1px solid #f1f3f4',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 12,
} as const

const notificationTextButtonStyle = {
  border: 'none',
  background: 'transparent',
  color: '#1a73e8',
  cursor: 'pointer',
  fontSize: 13,
  fontWeight: 700,
  padding: '6px 8px',
  borderRadius: 999,
} as const

const notificationListStyle = {
  maxHeight: 390,
  overflowY: 'auto',
  padding: '6px 0',
} as const

const notificationItemStyle = {
  width: '100%',
  border: 0,
  background: '#fff',
  color: '#202124',
  display: 'grid',
  gridTemplateColumns: '10px minmax(0, 1fr)',
  gap: 12,
  textAlign: 'left',
  padding: '12px 18px',
  cursor: 'pointer',
  borderBottom: '1px solid #f1f3f4',
} as const

const notificationDotStyle = {
  width: 8,
  height: 8,
  borderRadius: 999,
  marginTop: 7,
} as const

const notificationItemMetaStyle = {
  display: 'block',
  color: '#5f6368',
  fontSize: 11,
  fontWeight: 700,
  marginBottom: 3,
  textTransform: 'uppercase',
  letterSpacing: .3,
} as const

const notificationItemTitleStyle = {
  display: 'block',
  color: '#202124',
  fontSize: 14,
  fontWeight: 800,
  lineHeight: 1.25,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
} as const

const notificationItemDetailStyle = {
  display: 'block',
  color: '#5f6368',
  fontSize: 12,
  lineHeight: 1.35,
  marginTop: 4,
} as const

const notificationEmptyStyle = {
  minHeight: 150,
  display: 'grid',
  placeItems: 'center',
  textAlign: 'center',
  gap: 7,
  color: '#5f6368',
  padding: 24,
  fontSize: 12,
} as const

const notificationFooterButtonStyle = {
  width: '100%',
  border: 'none',
  borderTop: '1px solid #f1f3f4',
  background: '#fff',
  color: '#1a73e8',
  cursor: 'pointer',
  fontSize: 13,
  fontWeight: 800,
  padding: '13px 16px',
} as const

const quickMenuStyle = {
  position: 'absolute',
  top: 'calc(100% + 10px)',
  right: 0,
  zIndex: 85,
  width: 220,
  borderRadius: 14,
  border: '1px solid #dbe3ef',
  background: '#fff',
  boxShadow: '0 18px 50px rgba(15, 23, 42, .22)',
  padding: 6,
  overflow: 'hidden',
} as const

const quickMenuItemStyle = {
  width: '100%',
  minHeight: 38,
  border: 'none',
  borderRadius: 9,
  background: '#fff',
  color: '#0f172a',
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  padding: '0 11px',
  textAlign: 'left',
  cursor: 'pointer',
  fontFamily: 'var(--font-body)',
  fontSize: 13,
  fontWeight: 800,
} as const

const accountMenuStyle = {
  ...quickMenuStyle,
  width: 270,
} as const

const accountMenuHeaderStyle = {
  display: 'grid',
  gridTemplateColumns: '36px minmax(0, 1fr)',
  gap: 10,
  alignItems: 'center',
  padding: '10px 10px 12px',
  borderBottom: '1px solid #edf2f7',
  marginBottom: 6,
} as const
