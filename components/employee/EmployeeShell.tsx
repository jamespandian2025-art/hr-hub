'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import {
  Bell,
  CalendarDays,
  ChevronDown,
  FileText,
  HelpCircle,
  Home,
  Megaphone,
  HandCoins,
  MessageCircle,
  ReceiptText,
  Search,
  Settings,
  ShieldCheck,
  Wallet,
} from 'lucide-react'
import type { ReactNode } from 'react'
import { initials, useEmployeePortalData } from '@/app/employee/employeeData'
import { logoutUser } from '@/lib/auth/logout'

const nav = [
  { href: '/employee/dashboard', label: 'My Dashboard', icon: Home },
  { href: '/employee/attendance', label: 'My Attendance', icon: ShieldCheck },
  { href: '/employee/leave-requests', label: 'My Leave Requests', icon: FileText },
  { href: '/employee/leave-requests/new', label: 'Apply Leave', icon: FileText },
  { href: '/employee/loan-requests', label: 'Loans & Cash Advance', icon: HandCoins },
  { href: '/employee/allowances', label: 'Allowances', icon: ReceiptText },
  { href: '/employee/payslips', label: 'My Payslips', icon: Wallet },
  { href: '/employee/documents', label: 'My Documents', icon: FileText },
  { href: '/employee/chat', label: 'Chat with HR', icon: MessageCircle },
  { href: '/employee/announcements', label: 'Announcements', icon: Megaphone },
  { href: '/employee/calendar', label: 'Calendar', icon: CalendarDays },
  { href: '/employee/settings', label: 'Settings', icon: Settings },
]

function titleForPath(pathname: string) {
  if (pathname.includes('/leave-requests/new')) return 'Apply for Leave'
  return nav.find(item => pathname === item.href || pathname.startsWith(`${item.href}/`))?.label || 'Employee Portal'
}

export default function EmployeeShell({ children }: { children: ReactNode }) {
  const pathname = usePathname()

  if (!pathname || pathname.startsWith('/employee/login')) return <>{children}</>

  return <EmployeeWorkspace pathname={pathname}>{children}</EmployeeWorkspace>
}

function EmployeeWorkspace({ children, pathname }: { children: ReactNode; pathname: string }) {
  const router = useRouter()
  const { employee, employeeName } = useEmployeePortalData()
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const title = titleForPath(pathname)
  const employeeInitials = initials(employeeName)
  const logout = async () => {
    await logoutUser()
    setProfileOpen(false)
    router.replace('/employee/login')
  }

  return (
    <div className="employee-workspace">
      <aside className="employee-sidebar">
        <div className="employee-sidebar-brand">
          <div className="employee-brand-mark">W</div>
          <div>
            <div className="employee-brand-title">WiseFlow</div>
            <div className="employee-brand-subtitle">Employee Portal</div>
          </div>
        </div>

        <div className="employee-nav-group-label">Employee Portal</div>
        <nav className="employee-sidebar-nav employee-help-nav">
          {nav.map(item => {
            const Icon = item.icon
            const active = pathname === item.href || (item.href !== '/employee/dashboard' && pathname.startsWith(`${item.href}/`))
            return (
              <Link key={item.href} href={item.href} className={`employee-nav-item${active ? ' is-active' : ''}`}>
                <Icon size={18} />
                <span>{item.label}</span>
              </Link>
            )
          })}
        </nav>

        <div className="employee-nav-group-label">Help & Support</div>
        <nav className="employee-sidebar-nav">
          <Link href="/employee/settings" className="employee-nav-item"><HelpCircle size={18} /> Help Center</Link>
          <Link href="/employee/settings" className="employee-nav-item"><HelpCircle size={18} /> Contact Support</Link>
        </nav>

        <div className="employee-sidebar-footer">
          <Link href="/employee/dashboard" className="employee-back-link"><Home size={16} /> Back to Dashboard</Link>
          <Link href="/employee/profile" className="employee-profile-card">
            {employee.photo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={employee.photo} alt="" />
            ) : <span>{employeeInitials}</span>}
            <div>
              <strong>{employeeName}</strong>
              <small>{employee.jobTitle || 'Employee'}</small>
              <em>Online</em>
            </div>
            <ChevronDown size={16} />
          </Link>
        </div>
      </aside>

      <main className="employee-main">
        <header className="employee-topbar">
          <div className="employee-breadcrumb">
            <span>Employee Portal</span>
            <span>›</span>
            <strong>{title}</strong>
          </div>
          <label className="employee-search">
            <Search size={17} />
            <input placeholder="Search documents, requests, announcements..." />
            <kbd>Ctrl K</kbd>
          </label>
          <div className="employee-topbar-actions">
            <button type="button" className="employee-icon-button" aria-label="Notifications" onClick={() => setNotificationsOpen(open => !open)} style={{ position: 'relative' }}>
              <Bell size={18} />
            </button>
            {notificationsOpen && (
              <div className="employee-notification-panel" style={notificationPanelStyle}>
                <strong style={{ display: 'block', color: '#0f172a', marginBottom: 10 }}>Notifications</strong>
                <p style={{ margin: 0, color: '#000000', fontSize: 13 }}>No employee notifications waiting.</p>
              </div>
            )}
            <button type="button" className="employee-user-chip" aria-label="Open employee menu" onClick={() => setProfileOpen(open => !open)}>
              {employee.photo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={employee.photo} alt="" />
              ) : <span>{employeeInitials}</span>}
            </button>
            {profileOpen && (
              <div className="employee-profile-menu" style={profileMenuStyle}>
                <div style={profileMenuHeaderStyle}>
                  {employee.photo ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={employee.photo} alt="" style={profileMenuAvatarStyle} />
                  ) : <span style={profileMenuAvatarStyle}>{employeeInitials}</span>}
                  <div style={{ minWidth: 0 }}>
                    <strong style={{ display: 'block', color: '#0f172a', fontSize: 13, lineHeight: 1.25 }}>{employeeName}</strong>
                    <span style={{ display: 'block', color: '#000000', fontSize: 12, marginTop: 3 }}>{employee.jobTitle || 'Employee'}</span>
                  </div>
                </div>
                <Link href="/employee/profile" style={profileMenuItemStyle} onClick={() => setProfileOpen(false)}>View profile</Link>
                <button type="button" style={{ ...profileMenuItemStyle, color: '#dc2626', borderTop: '1px solid #eef2f7' }} onClick={logout}>Logout</button>
              </div>
            )}
          </div>
        </header>
        {children}
      </main>
    </div>
  )
}

const notificationPanelStyle = {
  position: 'absolute',
  top: 62,
  right: 118,
  zIndex: 80,
  width: 330,
  borderRadius: 14,
  border: '1px solid #dbe4ee',
  background: '#ffffff',
  boxShadow: '0 24px 70px rgba(15, 23, 42, .22)',
  padding: 14,
} as const

const profileMenuStyle = {
  position: 'absolute',
  top: 58,
  right: 20,
  zIndex: 85,
  width: 250,
  borderRadius: 12,
  border: '1px solid #dbe4ee',
  background: '#ffffff',
  boxShadow: '0 24px 70px rgba(15, 23, 42, .18)',
  overflow: 'hidden',
} as const

const profileMenuHeaderStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  padding: 12,
  borderBottom: '1px solid #eef2f7',
} as const

const profileMenuAvatarStyle = {
  width: 36,
  height: 36,
  borderRadius: '50%',
  objectFit: 'cover',
  display: 'grid',
  placeItems: 'center',
  background: '#dcfce7',
  color: '#166534',
  fontWeight: 900,
  flexShrink: 0,
} as const

const profileMenuItemStyle = {
  width: '100%',
  minHeight: 40,
  display: 'flex',
  alignItems: 'center',
  padding: '0 12px',
  border: 0,
  background: '#ffffff',
  color: '#0f172a',
  font: 'inherit',
  fontSize: 13,
  fontWeight: 800,
  textDecoration: 'none',
  cursor: 'pointer',
} as const
