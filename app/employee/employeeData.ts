'use client'

import { useEffect, useMemo, useState } from 'react'
import { buildEmployeeTaxBreakdown, deductionBreakdownTotal, defaultPayrollFrequency, PayrollFrequency, roundPayrollMoney } from '@/app/hr/payroll/taxRules'

export type StoredAccount = {
  userId?: string
  email?: string
  fullName?: string
  name?: string
  role?: string
}

export type Employee = {
  id: string
  employeeId?: string
  firstName?: string
  middleName?: string
  lastName?: string
  email?: string
  portalEmail?: string
  portalPassword?: string
  mustChangePassword?: boolean
  phone?: string
  photo?: string
  department?: string
  team?: string
  jobTitle?: string
  reportsTo?: string
  employeeType?: string
  employeeRole?: string
  employmentStatus?: string
  dateOfJoining?: string
  workLocation?: string
  basicSalary?: number
  allowances?: number
  deductions?: number
}

export type LeaveStatus = 'Draft' | 'Pending' | 'Approved' | 'Rejected' | 'Cancelled'
export type ApprovalStep = 'hr' | 'complete'
export type ApprovalDecision = 'Pending' | 'Approved' | 'Rejected' | 'Skipped'

export type LeaveRequest = {
  id: string
  employeeId: string
  employeeName?: string
  jobTitle?: string
  leaveType: string
  startDate: string
  endDate: string
  days: number
  reason?: string
  status: LeaveStatus
  approvalStep?: ApprovalStep
  managerApprovalStatus?: ApprovalDecision
  managerApprovedAt?: string
  managerRejectedAt?: string
  hrApprovalStatus?: ApprovalDecision
  hrApprovedAt?: string
  hrRejectedAt?: string
  createdAt: string
  updatedAt?: string
  contactDuringLeave?: string
  attachments?: Array<{ name: string; size: number; type: string; dataUrl?: string }>
}

export type AttendanceRecord = {
  id: string
  employeeId: string
  date: string
  status: 'Present' | 'Late' | 'Absent' | 'On Leave' | 'Rest day'
  clockIn?: string
  clockOut?: string
  breakMinutes?: number
  workLocation?: 'Office' | 'Remote' | 'Hybrid' | 'Field'
  attendanceRemarks?: string
  remoteLog?: boolean
  notes?: string
  createdAt: string
  updatedAt: string
}

export type PayrollRecord = {
  id: string
  employeeId: string
  period: string
  gross: number
  deductions: number
  deductionBreakdown?: {
    sss: number
    philHealth: number
    pagIbig: number
    tax: number
    loanOrCashAdvance?: number
  }
  allowanceLines?: Array<{ allowanceId: string; type: string; amount: number; date?: string; purpose?: string }>
  loanDeductions?: Array<{ loanId: string; type: string; amount: number }>
  net: number
  status: 'Paid' | 'Pending' | 'Processing' | 'Approved'
  source?: 'payroll-run'
  paidAt?: string
  createdAt: string
}

export type LoanRequest = {
  id: string
  employeeId: string
  employeeName?: string
  employeeCode?: string
  department?: string
  team?: string
  jobTitle?: string
  requestType: 'Personal Loan' | 'Cash Loan' | 'Emergency Loan' | 'Cash Advance' | 'Loan'
  customLoanType?: string
  amount: number
  repaymentMonths: number
  repaymentAmount: number
  deductionSchedule?: '15th payroll' | '30th payroll' | 'Twice a month' | 'One-time'
  deductionPaused?: boolean
  deductionOverrideAmount?: number
  reason?: string
  rejectionReason?: string
  status: 'Pending' | 'Approved' | 'Rejected' | 'Processed' | 'Cancelled'
  approvalStep: 'finance' | 'hr' | 'payroll' | 'complete'
  hrApprovalStatus: ApprovalDecision
  hrApprovedAt?: string
  hrRejectedAt?: string
  financeApprovalStatus?: ApprovalDecision
  financeApprovedAt?: string
  financeRejectedAt?: string
  approvalLogs?: Array<{ id: string; actor: string; decision: string; reason?: string; createdAt: string }>
  processedAt?: string
  processedPayrollPeriod?: string
  paidAmount?: number
  lastDeductedPayrollPeriod?: string
  payrollRecordId?: string
  createdAt: string
  updatedAt?: string
}

export type HRDocument = {
  id: string
  employeeId?: string
  uploadedById?: string
  uploadedByEmail?: string
  uploadedByName?: string
  name: string
  type?: string
  mimeType?: string
  size?: string
  sizeBytes?: number
  dataUrl?: string
  category?: string
  uploadedAt?: string
  status?: string
}

export type Announcement = {
  id: string
  title: string
  body?: string
  createdAt?: string
  status?: string
}

export type Holiday = {
  id: string
  name: string
  date: string
}

const accountKey = 'flowsys-account'
const sessionKey = 'flowsys-auth-session'

export const employeeKey = 'flowsys-hr-employees'
export const leaveRequestKey = 'flowsys-hr-leave-requests'
export const attendanceKey = 'flowsys-hr-attendance'
export const payrollKey = 'flowsys-hr-payroll-records'
const payrollScheduleKey = 'flowsys-hr-payroll-schedule'
export const loanRequestKey = 'flowsys-hr-loan-requests'
export const documentsKey = 'flowsys-hr-documents'
export const announcementsKey = 'flowsys-hr-announcements'
export const holidaysKey = 'flowsys-hr-holidays'
export const leaveDraftsKey = 'flowsys-employee-leave-drafts'

export function loadStored<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback
  try {
    const raw = window.localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

export function saveStored<T>(key: string, value: T) {
  if (typeof window !== 'undefined') window.localStorage.setItem(key, JSON.stringify(value))
}

function parseStoredAccount(value: string | null): StoredAccount {
  if (!value) return {}
  try {
    const parsed = JSON.parse(value)
    return parsed && typeof parsed === 'object' ? parsed as StoredAccount : {}
  } catch {
    return {}
  }
}

export function readAccount() {
  if (typeof window === 'undefined') return {}
  return {
    ...parseStoredAccount(window.localStorage.getItem(sessionKey)),
    ...parseStoredAccount(window.localStorage.getItem(accountKey)),
  }
}

export function fullName(employee?: Partial<Employee>) {
  return [employee?.firstName, employee?.middleName, employee?.lastName].filter(Boolean).join(' ').trim()
}

export function initials(name?: string) {
  return (name || 'EE')
    .split(' ')
    .filter(Boolean)
    .map(part => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || 'EE'
}

function text(value: unknown) {
  if (value === null || value === undefined) return ''
  if (typeof value === 'string') return value.trim().toLowerCase()
  if (typeof value === 'number' || typeof value === 'boolean') return String(value).trim().toLowerCase()
  return ''
}

function displayText(value: unknown, fallback = '') {
  if (value === null || value === undefined) return fallback
  if (typeof value === 'string') return value.trim() || fallback
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  return fallback
}

function splitName(name?: unknown) {
  const parts = (displayText(name, 'Employee User')).trim().split(/\s+/).filter(Boolean)
  return { firstName: parts[0] || 'Employee', lastName: parts.slice(1).join(' ') || 'User' }
}

export function isSameEmployee(employee: Partial<Employee> | undefined, identity: Partial<Employee> | undefined) {
  if (!employee || !identity) return false
  const ids = [identity.id, identity.employeeId].filter(Boolean).map(String)
  const employeeIds = [employee.id, employee.employeeId].filter(Boolean).map(String)
  if (ids.some(id => employeeIds.includes(id))) return true
  if (identity.email && employee.email && text(identity.email) === text(employee.email)) return true
  return false
}

export function matchesEmployeeId(value: unknown, identity: Partial<Employee>) {
  const target = text(value)
  if (!target) return false
  return [identity.id, identity.employeeId, identity.email, identity.portalEmail, fullName(identity)]
    .filter(Boolean)
    .some(item => text(item) === target)
}

export function isEmployeeTeamManager(employee?: Partial<Employee>) {
  const haystack = [employee?.employeeRole, employee?.employeeType, employee?.jobTitle].filter(Boolean).join(' ').toLowerCase()
  return /\b(team\s*manager|department\s*manager|hr\s*manager|manager|team\s*lead|team\s*leader|lead|supervisor|head|director)\b/.test(haystack)
}

export function resolveCurrentEmployee(employees: Employee[], account: StoredAccount): Employee {
  const accountName = displayText(account.fullName || account.name)
  const found = employees.find(employee => {
    if (account.userId && [employee.id, employee.employeeId].includes(account.userId)) return true
    if (account.email && [employee.email, employee.portalEmail].filter(Boolean).some(email => text(account.email) === text(email))) return true
    return accountName && text(fullName(employee)) === text(accountName)
  })
  if (found) return found
  const name = splitName(accountName)
  return {
    id: account.userId || account.email || 'employee-self',
    employeeId: account.userId || account.email || 'employee-self',
    firstName: name.firstName,
    lastName: name.lastName,
    email: account.email,
    jobTitle: account.role || 'Employee',
    employmentStatus: 'Active',
  }
}

export function formatDate(value?: string) {
  if (!value) return '-'
  const date = value.includes('T') ? new Date(value) : new Date(`${value}T00:00:00`)
  if (Number.isNaN(date.getTime())) return '-'
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export function formatDateTime(value?: string) {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'
  return date.toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export function money(value?: number) {
  return `PHP ${Number(value || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export function daysBetweenInclusive(start?: string, end?: string) {
  if (!start || !end) return 0
  const from = new Date(`${start}T00:00:00`)
  const to = new Date(`${end}T00:00:00`)
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || to < from) return 0
  return Math.floor((to.getTime() - from.getTime()) / 86400000) + 1
}

export const leaveLimits = [
  { type: 'Annual Leave', limit: 24, color: '#16a34a' },
  { type: 'Sick Leave', limit: 12, color: '#f59e0b' },
  { type: 'Personal Leave', limit: 6, color: '#8b5cf6' },
  { type: 'Maternity Leave', limit: 90, color: '#ec4899' },
]

export function leaveBalanceFor(requests: LeaveRequest[]) {
  return leaveLimits.map(item => {
    const used = requests
      .filter(request => request.status === 'Approved' && request.leaveType === item.type)
      .reduce((sum, request) => sum + Number(request.days || 0), 0)
    return { ...item, used, remaining: Math.max(0, item.limit - used) }
  })
}

function belongsToEmployee<T extends { employeeId?: string; employeeName?: string; uploadedById?: string; uploadedByEmail?: string }>(item: T, identity: Employee) {
  return matchesEmployeeId(item.employeeId, identity)
    || matchesEmployeeId(item.employeeName, identity)
    || matchesEmployeeId(item.uploadedById, identity)
    || matchesEmployeeId(item.uploadedByEmail, identity)
}

export function useEmployeePortalData() {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([])
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([])
  const [payroll, setPayroll] = useState<PayrollRecord[]>([])
  const [loanRequests, setLoanRequests] = useState<LoanRequest[]>([])
  const [documents, setDocuments] = useState<HRDocument[]>([])
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [holidays, setHolidays] = useState<Holiday[]>([])
  const [account, setAccount] = useState<StoredAccount>({})

  useEffect(() => {
    const read = () => {
      setAccount(readAccount())
      setEmployees(loadStored<Employee[]>(employeeKey, []))
      setLeaveRequests(loadStored<LeaveRequest[]>(leaveRequestKey, []))
      setAttendance(loadStored<AttendanceRecord[]>(attendanceKey, []))
      setPayroll(loadStored<PayrollRecord[]>(payrollKey, []))
      setLoanRequests(loadStored<LoanRequest[]>(loanRequestKey, []))
      setDocuments(loadStored<HRDocument[]>(documentsKey, []))
      setAnnouncements(loadStored<Announcement[]>(announcementsKey, []))
      setHolidays(loadStored<Holiday[]>(holidaysKey, []))
    }
    read()
    window.addEventListener('storage', read)
    return () => window.removeEventListener('storage', read)
  }, [])

  const employee = useMemo(() => resolveCurrentEmployee(employees, account), [account, employees])
  const employeeName = fullName(employee) || employee.email || 'Employee'
  const myLeaveRequests = useMemo(() => leaveRequests.filter(item => belongsToEmployee(item, employee)), [employee, leaveRequests])
  const myAttendance = useMemo(() => attendance.filter(item => matchesEmployeeId(item.employeeId, employee)), [attendance, employee])
  const myPayroll = useMemo(
    () => payroll
      .filter(item => item.source === 'payroll-run' && matchesEmployeeId(item.employeeId, employee))
      .map(item => normalizePayrollTax(item, employee)),
    [employee, payroll],
  )
  const myLoanRequests = useMemo(() => loanRequests.filter(item => belongsToEmployee(item, employee)), [employee, loanRequests])
  const myDocuments = useMemo(() => documents.filter(item => belongsToEmployee(item, employee)), [documents, employee])

  return {
    account,
    employee,
    employeeName,
    employees,
    leaveRequests,
    loanRequests,
    myLeaveRequests,
    myLoanRequests,
    myAttendance,
    myPayroll,
    myDocuments,
    announcements,
    holidays,
  }
}

function normalizePayrollTax(item: PayrollRecord, employee: Employee): PayrollRecord {
  const schedule = loadStored<{ frequency?: PayrollFrequency }>(payrollScheduleKey, {})
  const frequency = schedule.frequency || defaultPayrollFrequency
  const loanOrCashAdvance = roundPayrollMoney(
    (item.loanDeductions || []).reduce((sum, line) => sum + Number(line.amount || 0), 0) ||
    Number(item.deductionBreakdown?.loanOrCashAdvance || 0),
  )
  const baseBreakdown = buildEmployeeTaxBreakdown(Number(item.gross || 0), Number(employee.deductions || 0), frequency)
  const deductions = Math.min(Number(item.gross || 0), deductionBreakdownTotal(baseBreakdown) + loanOrCashAdvance)
  return {
    ...item,
    deductions,
    deductionBreakdown: { ...baseBreakdown, loanOrCashAdvance },
    net: roundPayrollMoney(Number(item.gross || 0) - deductions),
  }
}
