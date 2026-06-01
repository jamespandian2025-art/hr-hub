import {
  Activity,
  BarChart3,
  CheckCircle2,
  ClipboardCheck,
  FileText,
  LayoutDashboard,
  Settings,
  ShieldCheck,
  UsersRound,
  Wallet,
} from 'lucide-react'
import type { ComponentType } from 'react'

export type HrNavItem = {
  label: string
  href: string
  description: string
  icon: ComponentType<{ size?: number }>
}

export const HR_NAV_ITEMS: HrNavItem[] = [
  {
    label: 'Overview',
    href: '/hr/overview',
    description: 'Company HR snapshot and activity',
    icon: LayoutDashboard,
  },
  {
    label: 'Employees',
    href: '/hr/employees',
    description: 'Employee records and profile management',
    icon: UsersRound,
  },
  {
    label: 'Teams',
    href: '/hr/teams',
    description: 'Departments, teams, and reporting lines',
    icon: ShieldCheck,
  },
  {
    label: 'Attendance',
    href: '/hr/attendance',
    description: 'Daily attendance and time tracking',
    icon: Activity,
  },
  {
    label: 'Leave Requests',
    href: '/hr/leave-requests',
    description: 'Time off requests and balances',
    icon: ClipboardCheck,
  },
  {
    label: 'Approvals',
    href: '/hr/approvals',
    description: 'Pending HR approvals',
    icon: CheckCircle2,
  },
  {
    label: 'Payroll',
    href: '/hr/payroll',
    description: 'Payroll runs and payslip status',
    icon: Wallet,
  },
  {
    label: 'Documents',
    href: '/hr/documents',
    description: 'Employee files and HR documents',
    icon: FileText,
  },
  {
    label: 'Performance',
    href: '/hr/performance',
    description: 'Reviews and growth tracking',
    icon: BarChart3,
  },
  {
    label: 'Reports',
    href: '/hr/reports',
    description: 'HR analytics and exports',
    icon: BarChart3,
  },
  {
    label: 'HR Settings',
    href: '/hr/settings',
    description: 'HR roles, policies, and workspace setup',
    icon: Settings,
  },
]

export function isHrRouteActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`)
}

export function getHrRouteMeta(pathname: string) {
  return HR_NAV_ITEMS.find(item => isHrRouteActive(pathname, item.href)) ?? HR_NAV_ITEMS[0]
}
