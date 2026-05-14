'use client'

export type AuditAction =
  | 'payroll.edit'
  | 'payroll.export'
  | 'loan.change'
  | 'loan.approval'
  | 'deduction.override'
  | 'attendance.remote'
  | 'allowance.change'
  | 'employee.account'

export type AuditLogEntry = {
  id: string
  action: AuditAction
  actorRole: string
  actorName: string
  targetType: string
  targetId: string
  summary: string
  metadata?: Record<string, unknown>
  createdAt: string
}

export type AllowanceType = 'Fuel' | 'Meal' | 'Other'
export type AllowanceStatus = 'Pending' | 'Manager Approved' | 'Finance Approved' | 'Rejected' | 'Paid'

export type AllowanceRequest = {
  id: string
  employeeId: string
  employeeName: string
  employeeCode?: string
  department?: string
  jobTitle?: string
  type: AllowanceType
  customType?: string
  date: string
  purpose?: string
  reason?: string
  amount: number
  remarks?: string
  attachmentName?: string
  status: AllowanceStatus
  managerDecision?: 'Pending' | 'Approved' | 'Rejected'
  financeDecision?: 'Pending' | 'Approved' | 'Rejected'
  rejectionReason?: string
  payrollPeriod?: string
  createdAt: string
  updatedAt?: string
}

export const auditLogKey = 'flowsys-audit-logs'
export const allowanceRequestKey = 'flowsys-hr-allowance-requests'
export const outboundNotificationsKey = 'flowsys-outbound-notifications'

export function loadStored<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback
  try {
    const raw = window.localStorage.getItem(key)
    return raw ? JSON.parse(raw) as T : fallback
  } catch {
    return fallback
  }
}

export function saveStored<T>(key: string, value: T) {
  if (typeof window !== 'undefined') window.localStorage.setItem(key, JSON.stringify(value))
}

export function readCurrentActor() {
  if (typeof window === 'undefined') return { actorName: 'System', actorRole: 'System' }
  const parse = (key: string) => {
    try {
      const raw = window.localStorage.getItem(key)
      return raw ? JSON.parse(raw) as Record<string, string> : {}
    } catch {
      return {}
    }
  }
  const account = { ...parse('flowsys-auth-session'), ...parse('flowsys-account') }
  return {
    actorName: account.fullName || account.name || account.email || 'System User',
    actorRole: account.role || 'System',
  }
}

export function roleBucket(role?: string) {
  const normalized = String(role || '').toLowerCase()
  if (/\b(admin|owner|superuser)\b/.test(normalized)) return 'admin'
  if (/\b(finance|accounting|accountant|payroll|treasury)\b/.test(normalized)) return 'finance'
  if (/\b(manager|supervisor|lead|head|director)\b/.test(normalized)) return 'manager'
  if (/\b(hr|human resources|people operations)\b/.test(normalized)) return 'hr'
  if (/\b(employee|staff|team member)\b/.test(normalized)) return 'employee'
  return 'admin'
}

export function canManageFinance(role?: string) {
  const bucket = roleBucket(role)
  return bucket === 'admin' || bucket === 'finance'
}

export function canManageHr(role?: string) {
  const bucket = roleBucket(role)
  return bucket === 'admin' || bucket === 'hr'
}

export function canManageTeam(role?: string) {
  const bucket = roleBucket(role)
  return bucket === 'admin' || bucket === 'manager'
}

export function appendAuditLog(entry: Omit<AuditLogEntry, 'id' | 'createdAt' | 'actorName' | 'actorRole'> & { actorName?: string; actorRole?: string }) {
  if (typeof window === 'undefined') return
  const actor = readCurrentActor()
  const next: AuditLogEntry = {
    id: `AUD-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    actorName: entry.actorName || actor.actorName,
    actorRole: entry.actorRole || actor.actorRole,
    createdAt: new Date().toISOString(),
    ...entry,
  }
  const current = loadStored<AuditLogEntry[]>(auditLogKey, [])
  saveStored(auditLogKey, [next, ...current].slice(0, 1000))
  window.dispatchEvent(new Event('storage'))
}

export function appendFinanceNotification({
  subject,
  message,
  relatedType = 'Finance Alert',
  relatedId,
  target = '/financials/loan-management',
}: {
  subject: string
  message: string
  relatedType?: string
  relatedId: string
  target?: string
}) {
  if (typeof window === 'undefined') return
  const current = loadStored<Array<Record<string, unknown>>>(outboundNotificationsKey, [])
  const duplicate = current.some(item =>
    item.recipientRole === 'Finance' &&
    item.relatedType === relatedType &&
    item.relatedId === relatedId &&
    item.status === 'Queued'
  )
  if (duplicate) return
  saveStored(outboundNotificationsKey, [
    {
      id: Date.now(),
      channel: 'Email',
      recipientRole: 'Finance',
      subject,
      message,
      relatedType,
      relatedId,
      status: 'Queued',
      target,
      createdAt: new Date().toISOString(),
    },
    ...current,
  ])
  window.dispatchEvent(new Event('storage'))
}

export function numericExport(value?: number) {
  return Number(value || 0).toFixed(2)
}

export function employeeExportName(employee?: { firstName?: string; lastName?: string }, fallback?: string) {
  const first = employee?.firstName?.trim()
  const last = employee?.lastName?.trim()
  if (first || last) return [last, first].filter(Boolean).join(' ').toUpperCase()
  return String(fallback || '').trim().toUpperCase()
}

export function isFuelEligible(jobTitle?: string) {
  return /\b(driver|sales|field|messenger|logistics|delivery|operations)\b/i.test(jobTitle || '')
}
