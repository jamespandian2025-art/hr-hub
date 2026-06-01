export type AppRole =
  | 'Admin'
  | 'HR'
  | 'Finance'
  | 'Employee'
  | 'Team Manager'
  | 'Project Manager'
  | 'Support'
  | 'Client'

export type PermissionArea = 'admin' | 'hr' | 'finance' | 'employee' | 'client' | 'general'

export const allowedRoles = new Set<AppRole>([
  'Admin',
  'HR',
  'Finance',
  'Employee',
  'Team Manager',
  'Project Manager',
  'Support',
  'Client',
])

export function normalizeRole(input?: unknown): AppRole {
  const value = typeof input === 'string' ? input.trim() : ''
  if (allowedRoles.has(value as AppRole)) return value as AppRole
  if (/\b(admin|owner|superuser)\b/i.test(value)) return 'Admin'
  if (/human resources|people operations/i.test(value)) return 'HR'
  if (/accounting|payroll|treasury/i.test(value)) return 'Finance'
  if (/manager|supervisor|lead/i.test(value)) return 'Team Manager'
  return 'Employee'
}

export function areaForPath(pathname: string): PermissionArea {
  if (pathname === '/client-portal' || pathname.startsWith('/client-portal/')) return 'client'
  if (pathname === '/employee' || pathname.startsWith('/employee/')) return 'employee'
  if (
    pathname === '/financial'
    || pathname.startsWith('/financial/')
    || pathname === '/financials'
    || pathname.startsWith('/financials/')
    || pathname === '/accounting'
    || pathname.startsWith('/accounting/')
    || pathname === '/hr/loan-requests'
    || pathname.startsWith('/hr/loan-requests/')
  ) return 'finance'
  if (pathname === '/hr' || pathname.startsWith('/hr/')) return 'hr'
  return 'general'
}

export function isBankingPath(pathname: string) {
  return pathname === '/accounting/banking' || pathname.startsWith('/accounting/banking/')
}

export function canAccessArea(roleInput: unknown, area: PermissionArea) {
  const role = normalizeRole(roleInput)
  if (role === 'Admin') return true
  if (area === 'general') return role !== 'Employee' && role !== 'Client'
  if (area === 'client') return role === 'Client'
  if (area === 'employee') return role === 'Employee' || role === 'Team Manager'
  if (area === 'hr') return role === 'HR'
  if (area === 'finance') return role === 'Finance'
  return false
}

export function canAccessBanking(roleInput: unknown) {
  const role = normalizeRole(roleInput)
  return role === 'Admin' || role === 'Finance'
}

export function homeForRole(roleInput: unknown) {
  const role = normalizeRole(roleInput)
  if (role === 'Employee' || role === 'Team Manager') return '/employee/dashboard'
  if (role === 'Client') return '/client-portal'
  if (role === 'Finance') return '/financials/loan-management'
  if (role === 'HR') return '/hr/overview'
  return '/dashboard'
}
