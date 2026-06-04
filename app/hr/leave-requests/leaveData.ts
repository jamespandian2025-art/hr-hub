'use client'

export type LeaveStatus = 'Pending' | 'Approved' | 'Rejected' | 'Cancelled'
export type ApprovalStep = 'hr' | 'complete'
export type ApprovalDecision = 'Pending' | 'Approved' | 'Rejected' | 'Skipped'
export type ApprovalActor = 'hr'

export interface Employee {
  id: string
  employeeId?: string
  firstName?: string
  middleName?: string
  lastName?: string
  email?: string
  portalEmail?: string
  portalPasswordHash?: string
  portalPasswordSalt?: string
  portalPasswordAlgorithm?: 'pbkdf2-sha256'
  portalPasswordUpdatedAt?: string
  /** Legacy local records only. New records store portal password hashes instead. */
  portalPassword?: string
  mustChangePassword?: boolean
  phone?: string
  address?: string
  photo?: string
  employeeType?: string
  employeeRole?: string
  employmentStatus?: string
  dateOfJoining?: string
  department?: string
  team?: string
  jobTitle?: string
  reportsTo?: string
  workLocation?: string
  shift?: string
  createdAt?: string
  updatedAt?: string
}

export interface LeaveRequest {
  id: string
  employeeId: string
  employeeName?: string
  jobTitle?: string
  leaveType: string
  startDate: string
  endDate: string
  days: number
  reason?: string
  status: LeaveStatus | string
  approvalStep?: ApprovalStep
  managerApprovalStatus?: ApprovalDecision
  managerApprovedAt?: string
  managerRejectedAt?: string
  hrApprovalStatus?: ApprovalDecision
  hrApprovedAt?: string
  hrRejectedAt?: string
  createdAt: string
  updatedAt?: string
}

export interface LeaveRow extends LeaveRequest {
  employee?: Employee
  employeeName: string
  employeeCode: string
  department: string
  jobTitle: string
  photo?: string
}

export const employeeKey = 'flowsys-hr-employees'
export const leaveRequestKey = 'flowsys-hr-leave-requests'
export const employeeLeaveOutboxKey = 'wiseflow-employee-leave-request-outbox'

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
  if (typeof window === 'undefined') return
  window.localStorage.setItem(key, JSON.stringify(value))
}

function uniqueById<T extends { id?: string }>(rows: T[]) {
  const map = new Map<string, T>()
  rows.forEach((row, index) => {
    const key = row.id || `row-${index}`
    map.set(key, { ...map.get(key), ...row })
  })
  return Array.from(map.values())
}

function loadAllStoredRows<T extends { id?: string }>(key: string) {
  const baseRows = loadStored<T[]>(key, [])
  if (typeof window === 'undefined') return Array.isArray(baseRows) ? baseRows : []
  const rows = Array.isArray(baseRows) ? [...baseRows] : []
  for (let index = 0; index < window.localStorage.length; index += 1) {
    const scopedKey = window.localStorage.key(index)
    if (!scopedKey || scopedKey === key) continue
    const canContainLeaveRequests = scopedKey.startsWith(`${key}:`)
      || scopedKey === employeeLeaveOutboxKey
      || (/leave/i.test(scopedKey) && /request|outbox|hr|employee|wiseflow|flowsys/i.test(scopedKey))
    if (!canContainLeaveRequests) continue
    const scopedRows = loadStored<T[]>(scopedKey, [])
    if (Array.isArray(scopedRows)) {
      rows.push(...scopedRows.filter(row => row && typeof row === 'object' && 'leaveType' in row && 'employeeId' in row))
    }
  }
  return uniqueById(rows)
}

export function isLegacySeedLeaveRequest(request: LeaveRequest) {
  const id = String(request.id || '')
  const leaveType = String(request.leaveType || '').toLowerCase()
  const hasSeedId = /^leave_.+_(approved|pending)$/.test(id)
  const hasSeedType = leaveType === 'vacation leave' || leaveType === 'sick leave'
  return hasSeedId && hasSeedType && !String(request.reason || '').trim()
}

export function loadLeaveRequests() {
  const stored = loadAllStoredRows<LeaveRequest>(leaveRequestKey)
  const realRequests = stored.filter(request => String(request.status || '') !== 'Draft' && !isLegacySeedLeaveRequest(request))
  return realRequests
}

export function fullName(employee?: Employee) {
  return [employee?.firstName, employee?.middleName, employee?.lastName].filter(Boolean).join(' ').trim()
}

export function initials(name?: string) {
  return (name || 'HR')
    .split(' ')
    .filter(Boolean)
    .map(part => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || 'HR'
}

export function todayInput() {
  return new Date().toISOString().slice(0, 10)
}

export function monthRangeLabel(date = new Date()) {
  const start = new Date(date.getFullYear(), date.getMonth(), 1)
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 0)
  return `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
}

export function formatDate(value?: string) {
  if (!value) return '-'
  return new Date(`${value}T00:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export function formatLongDate(value?: string) {
  if (!value) return '-'
  return new Date(`${value}T00:00:00`).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
}

export function formatDay(value?: string) {
  if (!value) return '-'
  return new Date(`${value}T00:00:00`).toLocaleDateString('en-US', { weekday: 'short' })
}

export function formatDateTime(value?: string) {
  if (!value) return '-'
  return new Date(value).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export function normalizeStatus(value?: string): LeaveStatus {
  if (value === 'Approved' || value === 'Rejected' || value === 'Cancelled') return value
  return 'Pending'
}

export function isTeamManager(employee?: Partial<Employee>, request?: Partial<LeaveRequest>) {
  const haystack = [
    employee?.employeeRole,
    employee?.employeeType,
    employee?.jobTitle,
    request?.jobTitle,
  ].filter(Boolean).join(' ').toLowerCase()

  return /\b(team\s*manager|manager|team\s*lead|lead)\b/.test(haystack)
}

export function requiresTeamManagerApproval(_row: Partial<LeaveRow> | Partial<LeaveRequest>, _employee?: Partial<Employee>) {
  void _row
  void _employee
  return false
}

export function approvalState(row: Partial<LeaveRow> | Partial<LeaveRequest>, _employee?: Partial<Employee>) {
  void _employee
  const status = normalizeStatus(String(row.status || 'Pending'))
  const needsManager = false
  const managerStatus: ApprovalDecision = 'Skipped'
  const hrStatus: ApprovalDecision = row.hrApprovalStatus || (status === 'Approved' ? 'Approved' : status === 'Rejected' ? 'Rejected' : 'Pending')

  let step: ApprovalStep = row.approvalStep || 'hr'
  if (status === 'Approved' || status === 'Rejected' || status === 'Cancelled') step = 'complete'
  else step = 'hr'

  const canHrDecide = status === 'Pending' && step === 'hr'
  const label = step === 'hr' ? 'Waiting for HR' : status
  const helper = step === 'hr' ? 'Ready for HR approval.' : `Request ${status.toLowerCase()}.`

  return { status, needsManager, managerStatus, hrStatus, step, canHrDecide, label, helper }
}

export function decideLeaveRequest(request: LeaveRequest, employee: Partial<Employee> | undefined, actor: ApprovalActor, decision: 'Approved' | 'Rejected'): LeaveRequest {
  const now = new Date().toISOString()
  const state = approvalState(request, employee)

  if (!state.canHrDecide) return request

  if (decision === 'Rejected') {
    return {
      ...request,
      status: 'Rejected',
      approvalStep: 'complete',
      managerApprovalStatus: 'Skipped',
      hrApprovalStatus: 'Rejected',
      hrRejectedAt: now,
      updatedAt: now,
    }
  }

  return {
    ...request,
    status: 'Approved',
    approvalStep: 'complete',
    managerApprovalStatus: 'Skipped',
    hrApprovalStatus: 'Approved',
    hrApprovedAt: now,
    updatedAt: now,
  }
}

export function statusTone(status: string) {
  switch (normalizeStatus(status)) {
    case 'Approved': return { bg: '#dcfce7', text: '#15803d', dot: '#16a34a' }
    case 'Pending': return { bg: '#fef3c7', text: '#d97706', dot: '#f59e0b' }
    case 'Rejected': return { bg: '#fee2e2', text: '#dc2626', dot: '#ef4444' }
    case 'Cancelled': return { bg: '#f3f4f6', text: '#000000', dot: '#9ca3af' }
  }
}

export function leaveTypeTone(type: string) {
  switch (type.toLowerCase()) {
    case 'annual leave': return { bg: '#dcfce7', text: '#15803d', color: '#16a34a' }
    case 'vacation leave': return { bg: '#dcfce7', text: '#15803d', color: '#16a34a' }
    case 'sick leave': return { bg: '#fee2e2', text: '#dc2626', color: '#f59e0b' }
    case 'personal leave': return { bg: '#f3e8ff', text: '#7c3aed', color: '#8b5cf6' }
    case 'maternity leave': return { bg: '#fce7f3', text: '#be185d', color: '#ec4899' }
    case 'paternity leave': return { bg: '#ede9fe', text: '#7c3aed', color: '#8b5cf6' }
    case 'work from home': return { bg: '#dbeafe', text: '#1d4ed8', color: '#3b82f6' }
    case 'unpaid leave': return { bg: '#f3f4f6', text: '#000000', color: '#000000' }
    default: return { bg: '#f3f4f6', text: '#000000', color: '#000000' }
  }
}

export function resolveEmployee(leave: LeaveRequest, employees: Employee[]) {
  const requestedName = leave.employeeName?.trim().toLowerCase()
  return employees.find(employee =>
    employee.id === leave.employeeId ||
    employee.employeeId === leave.employeeId ||
    fullName(employee).toLowerCase() === requestedName
  )
}

export function buildRows(employees: Employee[], requests: LeaveRequest[]): LeaveRow[] {
  return requests.map(request => {
    const employee = resolveEmployee(request, employees)
    const name = request.employeeName || fullName(employee) || '-'
    return {
      ...request,
      employee,
      employeeName: name,
      employeeCode: employee?.employeeId || employee?.id || request.employeeId,
      department: employee?.department || '-',
      jobTitle: request.jobTitle || employee?.jobTitle || '-',
      photo: employee?.photo,
    }
  })
}

export function dateSpan(row: Pick<LeaveRequest, 'startDate' | 'endDate'>) {
  const start = formatDate(row.startDate)
  const end = formatDate(row.endDate)
  return start === end ? start : `${start} - ${end}`
}

export function daysBetweenInclusive(startDate: string, endDate: string) {
  const start = new Date(`${startDate}T00:00:00`).getTime()
  const end = new Date(`${endDate}T00:00:00`).getTime()
  if (Number.isNaN(start) || Number.isNaN(end) || end < start) return 1
  return Math.max(1, Math.round((end - start) / 86400000) + 1)
}

export function downloadCsv(filename: string, rows: string[][]) {
  const csv = rows.map(row => row.map(cell => {
    // Neutralize spreadsheet formula injection: a cell starting with = + - @
    // is treated as a formula by Excel/Sheets. Prefix it with an apostrophe.
    let text = String(cell ?? '').replace(/"/g, '""')
    if (/^[=+\-@]/.test(text.trimStart())) text = `'${text}`
    return `"${text}"`
  }).join(',')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}
