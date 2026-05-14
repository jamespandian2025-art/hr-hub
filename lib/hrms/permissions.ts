export type HrRoleBucket = 'admin' | 'finance' | 'hr' | 'manager' | 'employee'

export type HrCollection =
  | 'employees'
  | 'attendance'
  | 'leave-requests'
  | 'loan-requests'
  | 'allowance-requests'
  | 'payroll-records'
  | 'audit-logs'
  | 'notifications'

export type HrAction = 'read' | 'create' | 'update' | 'delete'

const collectionAccess: Record<HrCollection, Partial<Record<HrAction, HrRoleBucket[]>>> = {
  employees: {
    read: ['admin', 'hr', 'finance', 'manager'],
    create: ['admin', 'hr'],
    update: ['admin', 'hr'],
    delete: ['admin', 'hr'],
  },
  attendance: {
    read: ['admin', 'hr', 'manager', 'employee'],
    create: ['admin', 'hr', 'employee'],
    update: ['admin', 'hr'],
    delete: ['admin', 'hr'],
  },
  'leave-requests': {
    read: ['admin', 'hr', 'manager', 'employee'],
    create: ['admin', 'hr', 'employee'],
    update: ['admin', 'hr'],
    delete: ['admin', 'hr'],
  },
  'loan-requests': {
    read: ['admin', 'finance', 'hr', 'employee'],
    create: ['admin', 'finance', 'employee'],
    update: ['admin', 'finance'],
    delete: ['admin', 'finance'],
  },
  'allowance-requests': {
    read: ['admin', 'finance', 'hr', 'manager', 'employee'],
    create: ['admin', 'finance', 'employee'],
    update: ['admin', 'finance'],
    delete: ['admin', 'finance'],
  },
  'payroll-records': {
    read: ['admin', 'finance', 'hr', 'employee'],
    create: ['admin', 'finance'],
    update: ['admin', 'finance'],
    delete: ['admin', 'finance'],
  },
  'audit-logs': {
    read: ['admin', 'finance', 'hr'],
  },
  notifications: {
    read: ['admin', 'finance', 'hr', 'manager', 'employee'],
    create: ['admin', 'finance', 'hr'],
    update: ['admin', 'finance', 'hr', 'manager', 'employee'],
    delete: ['admin'],
  },
}

export const hrCollections = Object.keys(collectionAccess) as HrCollection[]

export function roleBucket(role?: string): HrRoleBucket {
  const normalized = String(role || '').toLowerCase()
  if (/\b(admin|owner|superuser)\b/.test(normalized)) return 'admin'
  if (/\b(finance|accounting|accountant|payroll|treasury)\b/.test(normalized)) return 'finance'
  if (/\b(hr|human resources|people operations)\b/.test(normalized)) return 'hr'
  if (/\b(manager|supervisor|lead|head|director)\b/.test(normalized)) return 'manager'
  return 'employee'
}

export function isHrCollection(input: string): input is HrCollection {
  return hrCollections.includes(input as HrCollection)
}

export function canAccessCollection(role: string | undefined, collection: HrCollection, action: HrAction) {
  const bucket = roleBucket(role)
  return Boolean(collectionAccess[collection][action]?.includes(bucket))
}

export function sensitiveAuditAction(collection: HrCollection, action: HrAction) {
  if (collection === 'payroll-records') return `payroll.${action}`
  if (collection === 'loan-requests') return `loan.${action}`
  if (collection === 'allowance-requests') return `allowance.${action}`
  if (collection === 'employees') return `employee.${action}`
  if (collection === 'attendance') return `attendance.${action}`
  if (collection === 'leave-requests') return `leave.${action}`
  return `${collection}.${action}`
}
