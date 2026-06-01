'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  ArrowLeft,
  Bell,
  Menu,
  Search,
  Settings,
  UserPlus,
  X,
} from 'lucide-react'
import HrMessenger from './HrMessenger'
import { getHrRouteMeta, HR_NAV_ITEMS, isHrRouteActive } from './hrNav'
import { loadStored } from '@/app/employee/employeeData'
import { allowanceRequestKey, AllowanceRequest } from '@/app/hr/enterpriseData'
import { loadLeaveRequests } from '@/app/hr/leave-requests/leaveData'
import CompanySwitcher from '@/components/CompanySwitcher'
import { logoutUser } from '@/lib/auth/logout'
import { listHrRecords } from '@/lib/hrms/client'

type StoredAccount = {
  company?: string
  fullName?: string
  name?: string
  email?: string
  photo?: string
  profilePhoto?: string
  role?: string
}

const accountKey = 'flowsys-account'
const sessionKey = 'flowsys-auth-session'

type LeaveNotification = {
  id: string
  employeeId?: string
  employeeName?: string
  leaveType: string
  days: number
  status: string
  approvalStep?: string
  hrApprovalStatus?: string
  createdAt: string
  updatedAt?: string
}

type HrSystemNotification = {
  id: string
  title?: string
  detail?: string
  type?: string
  status?: string
  employeeId?: string
  relatedCollection?: string
  relatedId?: string
  createdAt: string
  updatedAt?: string
}

function notificationTarget(notification: HrSystemNotification) {
  const collection = String(notification.relatedCollection || '').toLowerCase()
  const type = String(notification.type || '').toLowerCase()
  if (collection === 'loan-requests' || type.includes('loan')) {
    return notification.relatedId ? `/hr/loan-requests/${encodeURIComponent(notification.relatedId)}` : '/hr/loan-requests'
  }
  if (collection === 'allowance-requests' || type.includes('allowance')) return '/hr/payroll'
  if (collection === 'payroll-records' || type.includes('payroll')) return '/hr/payroll'
  if (collection === 'leave-requests' || type.includes('leave')) {
    return notification.employeeId ? `/hr/leave-requests/${encodeURIComponent(notification.employeeId)}` : '/hr/leave-requests'
  }
  return '/hr/approvals'
}

function uniqueLeaveNotifications(rows: LeaveNotification[]) {
  const map = new Map<string, LeaveNotification>()
  rows.forEach((row, index) => {
    const key = row.id || `leave-${index}`
    map.set(key, { ...map.get(key), ...row })
  })
  return Array.from(map.values())
}

function notificationTone(status: string) {
  const normalized = status.toLowerCase()
  if (normalized === 'approved') return '#34a853'
  if (normalized === 'rejected') return '#ea4335'
  if (normalized === 'cancelled') return '#64748b'
  return '#1a73e8'
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
  const [accountMenuOpen, setAccountMenuOpen] = useState(false)
  const [leaveNotifications, setLeaveNotifications] = useState<LeaveNotification[]>([])
  const [systemNotifications, setSystemNotifications] = useState<HrSystemNotification[]>([])
  const [allowanceNotifications, setAllowanceNotifications] = useState<AllowanceRequest[]>([])
  const activeMeta = getHrRouteMeta(pathname)
  const ActiveIcon = activeMeta.icon

  useEffect(() => {
    let cancelled = false
    const loadAccount = async () => {
      const storedAccount = parseStoredObject(window.localStorage.getItem(accountKey))
      const storedSession = parseStoredObject(window.localStorage.getItem(sessionKey))
      setAccount({ ...storedSession, ...storedAccount })
      const localLeaves = loadLeaveRequests()
      try {
        const actorName = storedAccount.fullName || storedSession.fullName || storedAccount.name || storedSession.name || storedAccount.email || storedSession.email || 'HR User'
        const hrHeaders = {
          'x-hr-role': 'HR',
          'x-hr-user-name': actorName,
        }
        const [serverLeaves, serverNotifications] = await Promise.all([
          listHrRecords<LeaveNotification>('leave-requests', hrHeaders),
          listHrRecords<HrSystemNotification>('notifications', hrHeaders),
        ])
        const nextLeaves = uniqueLeaveNotifications([...serverLeaves, ...localLeaves])
        if (!cancelled) setLeaveNotifications(current => nextLeaves.length > 0 || current.length === 0 ? nextLeaves : current)
        if (!cancelled) setSystemNotifications(current => serverNotifications.length > 0 || current.length === 0 ? serverNotifications : current)
      } catch {
        if (!cancelled) setLeaveNotifications(current => localLeaves.length > 0 || current.length === 0 ? localLeaves : current)
      }
      setAllowanceNotifications(loadStored<AllowanceRequest[]>(allowanceRequestKey, []))
    }
    void loadAccount()
    window.addEventListener('storage', loadAccount)
    window.addEventListener('focus', loadAccount)
    window.addEventListener('wiseflow:hr-data-changed', loadAccount)
    const timer = window.setInterval(loadAccount, 2500)
    return () => {
      cancelled = true
      window.removeEventListener('storage', loadAccount)
      window.removeEventListener('focus', loadAccount)
      window.removeEventListener('wiseflow:hr-data-changed', loadAccount)
      window.clearInterval(timer)
    }
  }, [])

  const displayName = account.fullName || account.name || 'HR User'
  const company = account.company || 'WiseFlow Company'
  const role = account.role || 'Team member'
  const accountPhoto = account.profilePhoto || account.photo || ''
  const pendingHrLeaveRequests = leaveNotifications.filter(request =>
    String(request.status || '').toLowerCase() === 'pending'
    && !['approved', 'rejected'].includes(String(request.hrApprovalStatus || '').toLowerCase())
    && (!request.approvalStep || request.approvalStep === 'hr')
  )
  const approvedAllowanceUpdates = allowanceNotifications.filter(request =>
    request.status === 'Finance Approved'
  )
  const openHrRoute = (target: string) => {
    setLoanNotificationsOpen(false)
    setAccountMenuOpen(false)
    router.push(target)
  }
  const logout = async () => {
    await logoutUser()
    setAccountMenuOpen(false)
    router.replace('/login')
  }
  const notifiedLeaveIds = new Set(systemNotifications
    .filter(notification => notification.relatedCollection === 'leave-requests' && notification.relatedId)
    .map(notification => String(notification.relatedId)))
  const hrNotificationItems = [
    ...systemNotifications
      .filter(notification => String(notification.status || '').toLowerCase() !== 'archived')
      .map(notification => ({
        id: `system-${notification.id}`,
        title: notification.title || 'HR notification',
        detail: notification.detail || 'Open this HR update for details',
        type: notification.type || 'Notification',
        time: notification.updatedAt || notification.createdAt,
        tone: '#1a73e8',
        target: notificationTarget(notification),
      })),
    ...leaveNotifications
      .filter(request => String(request.status || '').toLowerCase() !== 'draft' && !notifiedLeaveIds.has(request.id))
      .map(request => {
        const isPending = pendingHrLeaveRequests.some(item => item.id === request.id)
        const status = String(request.status || 'Pending')
        return {
      id: `leave-${request.id}`,
      title: isPending
        ? `${request.employeeName || 'Employee'} requested ${request.leaveType}`
        : `${request.employeeName || 'Employee'} ${status.toLowerCase()} ${request.leaveType}`,
      detail: isPending
        ? `${request.days} day${Number(request.days || 0) === 1 ? '' : 's'} needs HR review`
        : `${request.days} day${Number(request.days || 0) === 1 ? '' : 's'} - ${status}`,
      type: 'Leave request',
      time: request.updatedAt || request.createdAt,
      tone: notificationTone(status),
      target: request.employeeId ? `/hr/leave-requests/${encodeURIComponent(request.employeeId)}` : '/hr/leave-requests',
        }
      }),
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
            <CompanySwitcher className="hr-company-switcher" compact />
            <button type="button" className="hr-icon-button" aria-label="Notifications" onClick={() => { setLoanNotificationsOpen(open => !open); setAccountMenuOpen(false) }} style={{ position: 'relative' }}>
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
              <button type="button" className="hr-user-button" aria-label="HR account menu" onClick={() => { setAccountMenuOpen(open => !open); setLoanNotificationsOpen(false) }}>
                <span className="hr-user-avatar">{accountPhoto ? <span style={{ backgroundImage: `url(${accountPhoto})` }} /> : initials(displayName)}</span>
              </button>
              {accountMenuOpen && (
                <div style={accountMenuStyle}>
                  <div style={accountMenuHeaderStyle}>
                    <span className="hr-user-avatar">{accountPhoto ? <span style={{ backgroundImage: `url(${accountPhoto})` }} /> : initials(displayName)}</span>
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
