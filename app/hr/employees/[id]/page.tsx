'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import jsPDF from 'jspdf'
import {
  ArrowLeft, Briefcase, CalendarCheck, CheckCircle2, CreditCard,
  Download, FileText, Mail, MapPin, MessageSquare, MoreHorizontal,
  Pencil, Phone, TrendingUp, Upload, Users, X,
} from 'lucide-react'
import { Cell, Pie, PieChart, ResponsiveContainer } from 'recharts'
import {
  loadLoanRequests,
  loanDisplayName,
  loanPaidAmount,
  loanScheduledDeduction,
  LoanRequest,
} from '@/app/hr/loan-requests/loanData'
import { buildEmployeeTaxBreakdown, deductionBreakdownTotal, defaultPayrollFrequency, PayrollFrequency, roundPayrollMoney } from '@/app/hr/payroll/taxRules'
import { formatPhilippineMobileNumber, isValidPhilippineMobileNumber, philippineMobilePlaceholder } from '@/lib/hrms/philippinesPhone'

// â”€â”€â”€ Types â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

interface Employee {
  id: string; employeeId: string
  firstName: string; middleName?: string; lastName: string
  email: string; phone: string; alternatePhone?: string
  portalEmail?: string; portalPassword?: string; mustChangePassword?: boolean
  dateOfBirth?: string; gender?: string; maritalStatus?: string
  nationality?: string; religion?: string; languages?: string[]
  address?: string; photo?: string
  employeeType: string; employeeRole?: string; employmentStatus: string
  dateOfJoining: string; probationPeriod?: number
  department: string; team: string; jobTitle: string
  reportsTo?: string; workLocation?: string; workType?: string
  shift?: string; employeeGrade?: string; noticePeriod?: number; contractEndDate?: string
  basicSalary?: number; allowances?: number; deductions?: number
  paymentMethod?: string; bankName?: string; accountNumber?: string
  attendanceStatus?: string; payrollStatus?: string
  emergencyContactName?: string; emergencyContactRelationship?: string; emergencyContactPhone?: string
  bloodGroup?: string; notes?: string
  createdAt: string; updatedAt: string
}

interface Document { id: string; name: string; type: string; mimeType?: string; size?: string; dataUrl?: string; uploadedAt: string; employeeId: string }
interface LeaveRequest { id: string; employeeId: string; leaveType: string; startDate: string; endDate: string; days: number; status: string; createdAt: string }
interface PayrollDeductionBreakdown { sss: number; philHealth: number; pagIbig: number; tax: number; loanOrCashAdvance?: number }
interface PayrollAllowanceLine { allowanceId: string; type: string; amount: number; date?: string; purpose?: string }
interface LoanDeductionLine { loanId: string; type: string; amount: number }
interface PayrollRecord {
  id: string
  employeeId: string
  period: string
  gross: number
  deductions: number
  deductionBreakdown?: PayrollDeductionBreakdown
  allowanceLines?: PayrollAllowanceLine[]
  loanDeductions?: LoanDeductionLine[]
  net: number
  status: 'Paid' | 'Pending' | 'Processing' | 'Approved'
  paidAt?: string
  createdAt: string
}
interface PerformanceGoal { id: string; employeeId: string; title: string; progress: number; status: 'On Track' | 'At Risk' | 'Completed'; dueDate: string; createdAt: string }
interface PerformanceFeedback { id: string; employeeId: string; note: string; author: string; rating: number; createdAt: string }
interface AttendanceRecord {
  id: string
  employeeId: string
  date: string
  status: 'Present' | 'Late' | 'Absent' | 'On Leave' | 'Rest day'
  clockIn?: string
  clockOut?: string
  breakMinutes?: number
  notes?: string
  createdAt: string
  updatedAt: string
}

// â”€â”€â”€ Helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const font = "var(--font-body)"
const EMPLOYEE_ROLE_OPTIONS = ['Employee', 'Team Lead', 'Team Manager', 'Department Manager', 'HR Manager', 'Supervisor', 'Director']

function loadStored<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback
  try { const r = window.localStorage.getItem(key); return r ? (JSON.parse(r) as T) : fallback } catch { return fallback }
}

function fullName(e: Employee) { return [e.firstName, e.middleName, e.lastName].filter(Boolean).join(' ') }

function initials(name: string) {
  return name.split(' ').filter(Boolean).map(w => w[0]).join('').toUpperCase().slice(0, 2)
}

function money(v: number) { return `PHP ${v.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` }

function formatDate(d?: string) {
  if (!d) return 'â€”'
  return new Date(d).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
}

const credentialEmailKey = 'flowsys-hr-credential-email-outbox'
const payrollScheduleKey = 'flowsys-hr-payroll-schedule'

function slug(value?: string) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '.')
    .replace(/^\.+|\.+$/g, '')
}

function buildPortalEmail(employee: Employee) {
  const namePart = [slug(employee.firstName), slug(employee.lastName)].filter(Boolean).join('.') || 'employee'
  const idPart = slug(employee.employeeId || employee.id) || 'new'
  return `${namePart}.${idPart}@wiseflow.employee`
}

function randomToken(length: number) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789'
  if (typeof window !== 'undefined' && window.crypto?.getRandomValues) {
    const values = new Uint32Array(length)
    window.crypto.getRandomValues(values)
    return Array.from(values, value => chars[value % chars.length]).join('')
  }
  return Array.from({ length }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
}

function generatePortalPassword() {
  return `WF-${randomToken(4)}-${randomToken(4)}`
}

async function openCredentialEmail(employee: Employee) {
  const recipient = employee.email?.trim()
  if (!recipient || !employee.portalEmail || !employee.portalPassword) return false

  const loginUrl = `${window.location.origin}/employee/login`
  const subject = 'WiseFlow employee portal login details'
  const body = [
    `Hello ${fullName(employee) || 'Employee'},`,
    '',
    'Your WiseFlow Employee Self-Service portal account is ready.',
    '',
    `Login page: ${loginUrl}`,
    `Login email: ${employee.portalEmail}`,
    `Temporary password: ${employee.portalPassword}`,
    '',
    'Please sign in and change your temporary password after your first login.',
    '',
    'Thank you,',
    'WiseFlow HR',
  ].join('\n')

  let status = 'Prepared'
  try {
    const response = await fetch('/api/hr/employee-credentials', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        recipient,
        employeeName: fullName(employee) || 'Employee',
        portalEmail: employee.portalEmail,
        portalPassword: employee.portalPassword,
        loginUrl,
      }),
    })
    const result = await response.json()
    status = result?.ok ? 'Sent' : 'Prepared'
  } catch {
    status = 'Prepared'
  }

  const outbox = loadStored<object[]>(credentialEmailKey, [])
  window.localStorage.setItem(credentialEmailKey, JSON.stringify([
    ...outbox,
    {
      id: `credential_email_${Date.now()}`,
      employeeId: employee.employeeId,
      employeeName: fullName(employee),
      recipient,
      portalEmail: employee.portalEmail,
      status,
      createdAt: new Date().toISOString(),
    },
  ]))
  if (status !== 'Sent') window.open(`mailto:${encodeURIComponent(recipient)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`, '_blank')
  return true
}

function statusBadge(s: string): { bg: string; text: string } {
  switch (s?.toLowerCase()) {
    case 'active':     return { bg: '#dcfce7', text: '#15803d' }
    case 'on leave':   return { bg: '#dbeafe', text: '#1d4ed8' }
    case 'inactive':   return { bg: '#f3f4f6', text: '#6b7280' }
    case 'resigned':   return { bg: '#fee2e2', text: '#dc2626' }
    default:           return { bg: '#f3f4f6', text: '#6b7280' }
  }
}

function leaveBadge(s: string): { bg: string; text: string } {
  switch (s?.toLowerCase()) {
    case 'approved':  return { bg: '#dcfce7', text: '#15803d' }
    case 'pending':   return { bg: '#fef3c7', text: '#d97706' }
    case 'rejected':  return { bg: '#fee2e2', text: '#dc2626' }
    default:          return { bg: '#f3f4f6', text: '#6b7280' }
  }
}

function leaveTypeColor(type: string): string {
  switch (type.toLowerCase()) {
    case 'vacation leave': return '#22c55e'
    case 'sick leave':     return '#3b82f6'
    case 'personal leave': return '#8b5cf6'
    case 'unpaid leave':   return '#9ca3af'
    default:               return '#f59e0b'
  }
}

function isLegacySeedLeaveRequest(request: LeaveRequest) {
  const id = String(request.id || '')
  const leaveType = String(request.leaveType || '').toLowerCase()
  return /^leave_.+_(approved|pending)$/.test(id)
    && (leaveType === 'vacation leave' || leaveType === 'sick leave')
    && !String((request as LeaveRequest & { reason?: string }).reason || '').trim()
}

function docIcon(type: string): { bg: string; color: string } {
  if (type.toLowerCase() === 'pdf')  return { bg: '#fee2e2', color: '#dc2626' }
  if (type.toLowerCase() === 'jpg' || type.toLowerCase() === 'png') return { bg: '#dbeafe', color: '#3b82f6' }
  return { bg: '#ede9fe', color: '#7c3aed' }
}

function timeAgo(d: Date) {
  const diff = Date.now() - d.getTime()
  const mins = Math.floor(diff / 60000), hrs = Math.floor(diff / 3600000), days = Math.floor(diff / 86400000)
  if (days >= 1) return `${days}d ago`; if (hrs >= 1) return `${hrs}h ago`; if (mins >= 1) return `${mins}m ago`; return 'just now'
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result || ''))
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}

function fileExtension(name: string) {
  return name.includes('.') ? name.split('.').pop()?.toLowerCase() || 'file' : 'file'
}

function fileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function toInputDate(date: Date) {
  return date.toISOString().slice(0, 10)
}

function clockToMinutes(value?: string) {
  if (!value) return null
  const [hours, minutes] = value.split(':').map(Number)
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return null
  return hours * 60 + minutes
}

function formatClock(value?: string) {
  if (!value) return '-'
  const [hours, minutes] = value.split(':').map(Number)
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return value
  const date = new Date()
  date.setHours(hours, minutes, 0, 0)
  return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
}

function attendanceHours(record: AttendanceRecord) {
  const start = clockToMinutes(record.clockIn)
  const end = clockToMinutes(record.clockOut)
  if (start === null || end === null || end <= start) return '-'
  const total = Math.max(0, end - start - (record.breakMinutes || 0))
  const hours = Math.floor(total / 60)
  const minutes = total % 60
  return `${hours}h ${String(minutes).padStart(2, '0')}m`
}

function createDefaultAttendanceRecord(employee: Employee): AttendanceRecord {
  const status = employee.attendanceStatus === 'Late' || employee.attendanceStatus === 'Absent' || employee.attendanceStatus === 'On Leave'
    ? employee.attendanceStatus
    : 'Present'
  return {
    id: `att_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    employeeId: employee.id,
    date: toInputDate(new Date()),
    status,
    clockIn: status === 'Present' ? '08:00' : status === 'Late' ? '09:15' : '',
    clockOut: status === 'Present' || status === 'Late' ? '17:00' : '',
    breakMinutes: status === 'Present' || status === 'Late' ? 60 : 0,
    notes: 'Initial attendance record',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
}

function monthLabel(date: Date) {
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
}

function createSeedDocuments(employee: Employee): Document[] {
  const today = new Date()
  return [
    {
      id: `doc_${employee.id}_contract`,
      employeeId: employee.id,
      name: `${employee.lastName || employee.firstName}-employment-contract.pdf`,
      type: 'pdf',
      mimeType: 'application/pdf',
      size: '248 KB',
      uploadedAt: new Date(today.getTime() - 1000 * 60 * 60 * 24 * 14).toISOString(),
    },
    {
      id: `doc_${employee.id}_id`,
      employeeId: employee.id,
      name: `${employee.employeeId}-government-id.png`,
      type: 'png',
      mimeType: 'image/png',
      size: '512 KB',
      uploadedAt: new Date(today.getTime() - 1000 * 60 * 60 * 24 * 9).toISOString(),
    },
  ]
}

function createSeedPayrollRecords(employee: Employee): PayrollRecord[] {
  const today = new Date()
  const basic = employee.basicSalary || 25000
  const allowances = employee.allowances || 3500
  const deductions = employee.deductions || 1800
  return Array.from({ length: 4 }, (_, index) => {
    const periodDate = new Date(today.getFullYear(), today.getMonth() - index, 1)
    const gross = basic + allowances
    const deductionBreakdown = buildEmployeeTaxBreakdown(gross, deductions, defaultPayrollFrequency)
    const totalDeductions = Math.min(gross, deductionBreakdownTotal(deductionBreakdown))
    return {
      id: `pay_${employee.id}_${periodDate.getFullYear()}_${periodDate.getMonth() + 1}`,
      employeeId: employee.id,
      period: monthLabel(periodDate),
      gross,
      deductions: totalDeductions,
      deductionBreakdown,
      net: roundPayrollMoney(gross - totalDeductions),
      status: index === 0 ? (employee.payrollStatus === 'Paid' ? 'Paid' : 'Pending') : 'Paid',
      paidAt: index === 0 ? undefined : new Date(periodDate.getFullYear(), periodDate.getMonth(), 30).toISOString(),
      createdAt: new Date(today.getTime() - 1000 * 60 * 60 * 24 * (index * 30 + 3)).toISOString(),
    }
  })
}

function normalizeEmployeePayrollTax(record: PayrollRecord, employee: Employee, frequency: PayrollFrequency): PayrollRecord {
  const loanOrCashAdvance = roundPayrollMoney(
    (record.loanDeductions || []).reduce((sum, line) => sum + Number(line.amount || 0), 0) ||
    Number(record.deductionBreakdown?.loanOrCashAdvance || 0),
  )
  const baseBreakdown = buildEmployeeTaxBreakdown(Number(record.gross || 0), Number(employee.deductions || 0), frequency)
  const deductions = Math.min(Number(record.gross || 0), deductionBreakdownTotal(baseBreakdown) + loanOrCashAdvance)
  return {
    ...record,
    deductions,
    deductionBreakdown: { ...baseBreakdown, loanOrCashAdvance },
    net: roundPayrollMoney(Number(record.gross || 0) - deductions),
  }
}

function createSeedPerformanceGoals(employee: Employee): PerformanceGoal[] {
  const today = new Date()
  return [
    { id: `goal_${employee.id}_onboarding`, employeeId: employee.id, title: 'Complete department onboarding checklist', progress: 90, status: 'On Track', dueDate: toInputDate(new Date(today.getFullYear(), today.getMonth(), today.getDate() + 10)), createdAt: new Date(today.getTime() - 1000 * 60 * 60 * 24 * 20).toISOString() },
    { id: `goal_${employee.id}_training`, employeeId: employee.id, title: 'Finish role-based training modules', progress: 72, status: 'On Track', dueDate: toInputDate(new Date(today.getFullYear(), today.getMonth(), today.getDate() + 18)), createdAt: new Date(today.getTime() - 1000 * 60 * 60 * 24 * 16).toISOString() },
    { id: `goal_${employee.id}_report`, employeeId: employee.id, title: 'Submit monthly output report', progress: 58, status: 'At Risk', dueDate: toInputDate(new Date(today.getFullYear(), today.getMonth(), today.getDate() + 5)), createdAt: new Date(today.getTime() - 1000 * 60 * 60 * 24 * 8).toISOString() },
  ]
}

function createSeedFeedback(employee: Employee): PerformanceFeedback[] {
  const manager = employee.reportsTo || 'HR Manager'
  const today = new Date()
  return [
    { id: `feedback_${employee.id}_1`, employeeId: employee.id, note: 'Strong collaboration with the team and clear handoffs.', author: manager, rating: 5, createdAt: new Date(today.getTime() - 1000 * 60 * 60 * 24 * 6).toISOString() },
    { id: `feedback_${employee.id}_2`, employeeId: employee.id, note: 'Good attention to detail on assigned work.', author: manager, rating: 4, createdAt: new Date(today.getTime() - 1000 * 60 * 60 * 24 * 13).toISOString() },
    { id: `feedback_${employee.id}_3`, employeeId: employee.id, note: 'Keep improving timeline updates before due dates.', author: manager, rating: 4, createdAt: new Date(today.getTime() - 1000 * 60 * 60 * 24 * 21).toISOString() },
  ]
}

const TABS = ['Overview','Attendance','Leave History','Leave Balance','Payroll','Loans','Documents','Performance','Activity']

// â”€â”€â”€ Leave balance defaults â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const LEAVE_BALANCES = [
  { type: 'Vacation Leave', used: 0, total: 20, color: '#22c55e', Icon: CalendarCheck },
  { type: 'Sick Leave',     used: 0, total: 12, color: '#3b82f6', Icon: CalendarCheck },
  { type: 'Personal Leave', used: 0, total: 6,  color: '#8b5cf6', Icon: CalendarCheck },
  { type: 'Unpaid Leave',   used: 0, total: 10, color: '#9ca3af', Icon: CalendarCheck },
]

// â”€â”€â”€ Employee Profile page â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export default function EmployeeProfilePage() {
  const { id } = useParams<{ id: string }>()
  const router  = useRouter()
  const routeId = useMemo(() => {
    const raw = Array.isArray(id) ? id[0] : id
    try {
      return decodeURIComponent(String(raw || ''))
    } catch {
      return String(raw || '')
    }
  }, [id])
  const [activeTab, setActiveTab] = useState('Overview')
  const [employee, setEmployee]   = useState<Employee | null>(null)
  const [documents, setDocuments] = useState<Document[]>([])
  const [leaves, setLeaves]       = useState<LeaveRequest[]>([])
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([])
  const [payrollRecords, setPayrollRecords] = useState<PayrollRecord[]>([])
  const [loanRequests, setLoanRequests] = useState<LoanRequest[]>([])
  const [performanceGoals, setPerformanceGoals] = useState<PerformanceGoal[]>([])
  const [performanceFeedback, setPerformanceFeedback] = useState<PerformanceFeedback[]>([])
  const [notFound, setNotFound]   = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [editSection, setEditSection] = useState<'profile' | 'personal' | 'job' | 'salary'>('profile')
  const [editDraft, setEditDraft] = useState<Partial<Employee>>({})
  const [editError, setEditError] = useState('')
  const [selectedPayslipId, setSelectedPayslipId] = useState<string | null>(null)
  const [credentialNotice, setCredentialNotice] = useState('')
  const [attendanceDraft, setAttendanceDraft] = useState<Partial<AttendanceRecord>>({
    date: toInputDate(new Date()),
    status: 'Present',
    clockIn: '08:00',
    clockOut: '17:00',
    breakMinutes: 60,
  })
  const [attendanceError, setAttendanceError] = useState('')
  const [uploadError, setUploadError] = useState('')
  const [nowMs] = useState(() => Date.now())
  const documentInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const all: Employee[] = loadStored('flowsys-hr-employees', [])
      const found = all.find(e => e.id === routeId || e.employeeId === routeId)
      if (!found) {
        setEmployee(null)
        setNotFound(true)
        return
      }
      setNotFound(false)
      setEmployee(found)
      const employeeKeys = new Set([found.id, found.employeeId].filter((value): value is string => Boolean(value)))

      const profileWarning = window.sessionStorage.getItem(`flowsys-hr-employee-warning-${found.id}`)
      if (profileWarning) {
        setCredentialNotice(profileWarning)
        window.sessionStorage.removeItem(`flowsys-hr-employee-warning-${found.id}`)
      }

      const allDocs: Document[] = loadStored('flowsys-hr-documents', [])
      const employeeDocs = allDocs.filter(d => employeeKeys.has(d.employeeId))
      if (employeeDocs.length) {
        setDocuments(employeeDocs)
      } else {
        const seededDocs = createSeedDocuments(found)
        window.localStorage.setItem('flowsys-hr-documents', JSON.stringify([...allDocs, ...seededDocs]))
        setDocuments(seededDocs)
      }
      const allLeaves: LeaveRequest[] = loadStored('flowsys-hr-leave-requests', [])
      const realLeaves = allLeaves.filter(l => !isLegacySeedLeaveRequest(l))
      if (realLeaves.length !== allLeaves.length) window.localStorage.setItem('flowsys-hr-leave-requests', JSON.stringify(realLeaves))
      const employeeLeaves = realLeaves.filter(l => employeeKeys.has(l.employeeId))
      setLeaves(employeeLeaves)
      const allAttendance: AttendanceRecord[] = loadStored('flowsys-hr-attendance', [])
      const employeeAttendance = allAttendance.filter(a => employeeKeys.has(a.employeeId))
      if (employeeAttendance.length) {
        setAttendanceRecords(employeeAttendance)
      } else {
        const initialRecord = createDefaultAttendanceRecord(found)
        window.localStorage.setItem('flowsys-hr-attendance', JSON.stringify([...allAttendance, initialRecord]))
        setAttendanceRecords([initialRecord])
      }
      const allPayroll: PayrollRecord[] = loadStored('flowsys-hr-payroll-records', [])
      const payrollSchedule = loadStored<{ frequency?: PayrollFrequency }>(payrollScheduleKey, {})
      const payrollFrequency = payrollSchedule.frequency || defaultPayrollFrequency
      const employeePayroll = allPayroll
        .filter(p => employeeKeys.has(p.employeeId))
        .map(record => normalizeEmployeePayrollTax(record, found, payrollFrequency))
      if (employeePayroll.length) {
        setPayrollRecords(employeePayroll)
      } else {
        const seededPayroll = createSeedPayrollRecords(found)
        window.localStorage.setItem('flowsys-hr-payroll-records', JSON.stringify([...allPayroll, ...seededPayroll]))
        setPayrollRecords(seededPayroll)
      }
      const employeeLoans = loadLoanRequests().filter(request => {
        const requestName = String(request.employeeName || '').trim().toLowerCase()
        return employeeKeys.has(request.employeeId)
          || employeeKeys.has(request.employeeCode || '')
          || requestName === fullName(found).toLowerCase()
      })
      setLoanRequests(employeeLoans)
      const allGoals: PerformanceGoal[] = loadStored('flowsys-hr-performance-goals', [])
      const employeeGoals = allGoals.filter(g => employeeKeys.has(g.employeeId))
      if (employeeGoals.length) {
        setPerformanceGoals(employeeGoals)
      } else {
        const seededGoals = createSeedPerformanceGoals(found)
        window.localStorage.setItem('flowsys-hr-performance-goals', JSON.stringify([...allGoals, ...seededGoals]))
        setPerformanceGoals(seededGoals)
      }
      const allFeedback: PerformanceFeedback[] = loadStored('flowsys-hr-performance-feedback', [])
      const employeeFeedback = allFeedback.filter(f => employeeKeys.has(f.employeeId))
      if (employeeFeedback.length) {
        setPerformanceFeedback(employeeFeedback)
      } else {
        const seededFeedback = createSeedFeedback(found)
        window.localStorage.setItem('flowsys-hr-performance-feedback', JSON.stringify([...allFeedback, ...seededFeedback]))
        setPerformanceFeedback(seededFeedback)
      }
    }, 0)
    return () => window.clearTimeout(timer)
  }, [routeId])

  // â”€â”€ Attendance donut â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const attDonut = useMemo(() => {
    if (!employee) return []
    const present = attendanceRecords.filter(row => row.status === 'Present').length
    const late = attendanceRecords.filter(row => row.status === 'Late').length
    const absent = attendanceRecords.filter(row => row.status === 'Absent').length
    const onLeave = attendanceRecords.filter(row => row.status === 'On Leave').length
    return [
      { name: 'Present',  value: present, color: '#22c55e' },
      { name: 'Late',     value: late,    color: '#f59e0b' },
      { name: 'On Leave', value: onLeave, color: '#3b82f6' },
      { name: 'Absent',   value: absent,  color: '#ef4444' },
    ].filter(d => d.value > 0)
  }, [attendanceRecords, employee])

  // â”€â”€ Leave balances â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const leaveBalances = useMemo(() => {
    return LEAVE_BALANCES.map(lb => {
      const used = leaves.filter(l => l.leaveType.toLowerCase() === lb.type.toLowerCase() && l.status === 'Approved').reduce((s, l) => s + l.days, 0)
      return { ...lb, used, remaining: lb.total - used }
    })
  }, [leaves])

  // â”€â”€ Salary â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const salary = useMemo(() => {
    if (!employee) return { basic: 0, allowances: 0, deductions: 0, net: 0 }
    const basic      = employee.basicSalary || 0
    const allowances = employee.allowances  || 0
    const deductions = employee.deductions  || 0
    return { basic, allowances, deductions, net: basic + allowances - deductions }
  }, [employee])

  const attendanceRows = useMemo(() => {
    return [...attendanceRecords].sort((a, b) => b.date.localeCompare(a.date))
  }, [attendanceRecords])

  const attendanceStats = useMemo(() => {
    const workingDays = attendanceRecords.filter(row => row.status !== 'Rest day').length
    const present = attendanceRecords.filter(row => row.status === 'Present').length
    const late = attendanceRecords.filter(row => row.status === 'Late').length
    const onLeave = attendanceRecords.filter(row => row.status === 'On Leave').length
    const absent = attendanceRecords.filter(row => row.status === 'Absent').length
    const attendanceRate = workingDays ? Math.round(((present + late) / workingDays) * 100) : 0
    return { present, late, onLeave, absent, workingDays, attendanceRate }
  }, [attendanceRecords])

  const payrollRows = useMemo(() => {
    return [...payrollRecords].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  }, [payrollRecords])

  const selectedPayslip = useMemo(() => {
    return payrollRows.find(row => row.id === selectedPayslipId) || null
  }, [payrollRows, selectedPayslipId])

  const activeLoanBalances = useMemo(() => {
    return loanRequests.filter(loan => {
      const progress = loanPaymentProgress(loan, payrollRecords)
      return (loan.status === 'Approved' || loan.status === 'Processed') && progress.balance > 0
    })
  }, [loanRequests, payrollRecords])

  const performanceStats = useMemo(() => {
    const completedGoals = performanceGoals.filter(goal => goal.status === 'Completed' || goal.progress >= 100).length
    const overallScore = performanceFeedback.length
      ? (performanceFeedback.reduce((sum, item) => sum + item.rating, 0) / performanceFeedback.length).toFixed(1)
      : '0.0'
    const nextReview = new Date(nowMs)
    nextReview.setDate(nextReview.getDate() + 30)
    return {
      overallScore,
      completedGoals,
      totalGoals: performanceGoals.length,
      feedbackCount: performanceFeedback.length,
      nextReview: nextReview.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    }
  }, [nowMs, performanceFeedback, performanceGoals])

  const activityItems = useMemo(() => {
    const dynamic = [
      ...attendanceRecords.map(record => ({
        Icon: CheckCircle2,
        bg: '#dcfce7',
        color: '#16a34a',
        title: `Attendance marked ${record.status.toLowerCase()}`,
        desc: `${formatDate(record.date)} - ${attendanceHours(record)}`,
        time: timeAgo(new Date(record.updatedAt || record.createdAt)),
      })),
      ...leaves.map(leave => ({
        Icon: CalendarCheck,
        bg: '#dcfce7',
        color: '#22c55e',
        title: `Leave request ${leave.status.toLowerCase()}`,
        desc: `${leave.leaveType} - ${leave.days} day${leave.days === 1 ? '' : 's'}`,
        time: timeAgo(new Date(leave.createdAt)),
      })),
      ...payrollRecords.map(payroll => ({
        Icon: CreditCard,
        bg: '#fef3c7',
        color: '#d97706',
        title: `Payroll ${payroll.status.toLowerCase()}`,
        desc: `${payroll.period} - ${money(payroll.net)}`,
        time: timeAgo(new Date(payroll.paidAt || payroll.createdAt)),
      })),
      ...documents.map(doc => ({
        Icon: FileText,
        bg: '#dbeafe',
        color: '#3b82f6',
        title: 'Document uploaded',
        desc: doc.name,
        time: timeAgo(new Date(doc.uploadedAt)),
      })),
      ...performanceFeedback.map(feedback => ({
        Icon: TrendingUp,
        bg: '#ede9fe',
        color: '#8b5cf6',
        title: `Performance feedback from ${feedback.author}`,
        desc: `${feedback.rating}/5 - ${feedback.note}`,
        time: timeAgo(new Date(feedback.createdAt)),
      })),
    ]
    return dynamic
      .sort((a, b) => {
        const parseTime = (value: string) => value.endsWith('m ago') ? Number(value.split('m')[0]) : value.endsWith('h ago') ? Number(value.split('h')[0]) * 60 : value.endsWith('d ago') ? Number(value.split('d')[0]) * 1440 : 0
        return parseTime(a.time) - parseTime(b.time)
      })
      .slice(0, 8)
  }, [attendanceRecords, documents, leaves, payrollRecords, performanceFeedback])

  // â”€â”€ Probation end â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const probationEnd = useMemo(() => {
    if (!employee?.dateOfJoining || !employee?.probationPeriod) return null
    const d = new Date(employee.dateOfJoining)
    d.setMonth(d.getMonth() + (employee.probationPeriod || 0))
    const daysLeft = Math.ceil((d.getTime() - nowMs) / 86400000)
    return { date: formatDate(d.toISOString()), daysLeft }
  }, [employee, nowMs])

  function openEditor(section: typeof editSection) {
    if (!employee) return
    setEditSection(section)
    setEditDraft({ ...employee })
    setEditError('')
    setEditOpen(true)
  }

  async function sendLoginDetails() {
    if (!employee) return
    if (!employee.email?.trim()) {
      setCredentialNotice('Add a work email before sending login details.')
      return
    }

    const updatedEmployee = {
      ...employee,
      portalEmail: employee.portalEmail || buildPortalEmail(employee),
      portalPassword: employee.portalPassword || generatePortalPassword(),
      mustChangePassword: true,
      updatedAt: new Date().toISOString(),
    }

    const allEmployees = loadStored<Employee[]>('flowsys-hr-employees', [])
    window.localStorage.setItem('flowsys-hr-employees', JSON.stringify(allEmployees.map(item => {
      const isSameRecord = item.id === updatedEmployee.id || item.employeeId === updatedEmployee.employeeId
      return isSameRecord ? updatedEmployee : item
    })))
    setEmployee(updatedEmployee)
    const sent = await openCredentialEmail(updatedEmployee)
    setCredentialNotice(sent ? `Login email handled for ${updatedEmployee.email}.` : 'Could not prepare the login email.')
  }

  function saveEmployeeEdits() {
    if (!employee) return
    if (editDraft.phone && !isValidPhilippineMobileNumber(String(editDraft.phone))) {
      setEditError(`Use Philippine mobile format: ${philippineMobilePlaceholder}`)
      return
    }
    if (editDraft.alternatePhone && !isValidPhilippineMobileNumber(String(editDraft.alternatePhone))) {
      setEditError(`Use Philippine mobile format: ${philippineMobilePlaceholder}`)
      return
    }
    if (editDraft.emergencyContactPhone && !isValidPhilippineMobileNumber(String(editDraft.emergencyContactPhone))) {
      setEditError(`Use Philippine mobile format: ${philippineMobilePlaceholder}`)
      return
    }
    const numericKeys: Array<keyof Employee> = ['probationPeriod', 'noticePeriod', 'basicSalary', 'allowances', 'deductions']
    const cleaned: Employee = { ...employee, ...editDraft, updatedAt: new Date().toISOString() }
    numericKeys.forEach(key => {
      const value = cleaned[key]
      if (typeof value === 'string') {
        ;(cleaned as unknown as Record<string, number>)[key] = parseFloat(value) || 0
      }
    })
    const allEmployees = loadStored<Employee[]>('flowsys-hr-employees', [])
    window.localStorage.setItem('flowsys-hr-employees', JSON.stringify(allEmployees.map(item => item.id === employee.id ? cleaned : item)))
    setEmployee(cleaned)
    setEditOpen(false)
  }

  async function handleDocumentUpload(files?: FileList | null) {
    setUploadError('')
    if (!employee || !files?.length) return
    const nextDocs: Document[] = []
    for (const file of Array.from(files)) {
      if (file.size > 1024 * 1024) {
        setUploadError('Each document must be 1MB or smaller while using local browser storage.')
        continue
      }
      try {
        nextDocs.push({
          id: `doc_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
          name: file.name,
          type: fileExtension(file.name),
          mimeType: file.type || 'application/octet-stream',
          size: fileSize(file.size),
          dataUrl: await readFileAsDataUrl(file),
          uploadedAt: new Date().toISOString(),
          employeeId: employee.id,
        })
      } catch {
        setUploadError(`Could not read ${file.name}. Please try again.`)
      }
    }
    if (nextDocs.length) {
      const allDocs = loadStored<Document[]>('flowsys-hr-documents', [])
      window.localStorage.setItem('flowsys-hr-documents', JSON.stringify([...allDocs, ...nextDocs]))
      setDocuments(previous => [...previous, ...nextDocs])
    }
    if (documentInputRef.current) documentInputRef.current.value = ''
  }

  function saveAttendanceRecord() {
    setAttendanceError('')
    if (!employee) return
    if (!attendanceDraft.date || !attendanceDraft.status) {
      setAttendanceError('Date and status are required.')
      return
    }
    const needsClock = attendanceDraft.status === 'Present' || attendanceDraft.status === 'Late'
    if (needsClock && (!attendanceDraft.clockIn || !attendanceDraft.clockOut)) {
      setAttendanceError('Clock in and clock out are required for present or late records.')
      return
    }
    const nextRecord: AttendanceRecord = {
      id: `att_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      employeeId: employee.id,
      date: attendanceDraft.date,
      status: attendanceDraft.status,
      clockIn: needsClock ? attendanceDraft.clockIn : '',
      clockOut: needsClock ? attendanceDraft.clockOut : '',
      breakMinutes: needsClock ? Number(attendanceDraft.breakMinutes || 0) : 0,
      notes: attendanceDraft.notes || '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    const allAttendance = loadStored<AttendanceRecord[]>('flowsys-hr-attendance', [])
    const withoutSameDay = allAttendance.filter(row => !(row.employeeId === employee.id && row.date === nextRecord.date))
    window.localStorage.setItem('flowsys-hr-attendance', JSON.stringify([...withoutSameDay, nextRecord]))
    setAttendanceRecords(previous => [nextRecord, ...previous.filter(row => row.date !== nextRecord.date)])
  }

  const editFields: Record<typeof editSection, Array<{ key: keyof Employee; label: string; type?: string }>> = {
    profile: [
      { key: 'firstName', label: 'First name' },
      { key: 'middleName', label: 'Middle name' },
      { key: 'lastName', label: 'Last name' },
      { key: 'email', label: 'Email', type: 'email' },
      { key: 'phone', label: 'Phone' },
      { key: 'alternatePhone', label: 'Alternate phone' },
      { key: 'jobTitle', label: 'Job title' },
    ],
    personal: [
      { key: 'firstName', label: 'First name' },
      { key: 'middleName', label: 'Middle name' },
      { key: 'lastName', label: 'Last name' },
      { key: 'dateOfBirth', label: 'Date of birth', type: 'date' },
      { key: 'gender', label: 'Gender' },
      { key: 'maritalStatus', label: 'Marital status' },
      { key: 'nationality', label: 'Nationality' },
      { key: 'phone', label: 'Phone' },
      { key: 'alternatePhone', label: 'Alternate phone' },
      { key: 'emergencyContactName', label: 'Emergency contact name' },
      { key: 'emergencyContactRelationship', label: 'Emergency contact relationship' },
      { key: 'emergencyContactPhone', label: 'Emergency contact phone' },
    ],
    job: [
      { key: 'department', label: 'Department' },
      { key: 'team', label: 'Team' },
      { key: 'jobTitle', label: 'Position' },
      { key: 'employeeType', label: 'Employment type' },
      { key: 'employeeRole', label: 'Employee role' },
      { key: 'employmentStatus', label: 'Employment status' },
      { key: 'workLocation', label: 'Work location' },
      { key: 'workType', label: 'Work type' },
      { key: 'shift', label: 'Shift' },
      { key: 'reportsTo', label: 'Reporting manager' },
      { key: 'dateOfJoining', label: 'Date of joining', type: 'date' },
      { key: 'probationPeriod', label: 'Probation months', type: 'number' },
    ],
    salary: [
      { key: 'basicSalary', label: 'Basic salary', type: 'number' },
      { key: 'allowances', label: 'Allowances', type: 'number' },
      { key: 'deductions', label: 'Deductions', type: 'number' },
      { key: 'paymentMethod', label: 'Payment method' },
      { key: 'bankName', label: 'Bank name' },
      { key: 'accountNumber', label: 'Account number' },
      { key: 'payrollStatus', label: 'Payroll status' },
    ],
  }

  if (notFound) return (
    <main style={{ fontFamily: font, padding: '40px 20px', textAlign: 'center' }}>
      <Users size={48} color="#d1d5db" style={{ marginBottom: 16 }} />
      <div style={{ fontSize: 16, fontWeight: 500, color: '#6b7280', marginBottom: 8 }}>Employee not found</div>
      <Link href="/hr/employees"><button style={{ background: '#22c55e', border: 'none', borderRadius: 8, padding: '8px 18px', fontSize: 13, fontWeight: 600, color: '#fff', cursor: 'pointer' }}>Back to Employees</button></Link>
    </main>
  )

  if (!employee) return (
    <main style={{ fontFamily: font, padding: '40px 20px', textAlign: 'center', color: '#9ca3af', fontSize: 13 }}>Loadingâ€¦</main>
  )

  const name = fullName(employee)
  const sb   = statusBadge(employee.employmentStatus)
  const cardStyle = { background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }

  // â”€â”€â”€ Render â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  return (
    <main style={{ fontFamily: font, padding: '0 20px 40px', minHeight: '100vh', background: '#f8fafc' }}>

      {/* Top action bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 16, marginBottom: 14 }}>
        <button onClick={() => router.back()} style={{ display: 'flex', alignItems: 'center', gap: 6, border: 'none', background: 'transparent', cursor: 'pointer', color: '#6b7280', fontSize: 13, padding: '6px 0' }}>
          <ArrowLeft size={16} /> Back
        </button>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => { window.location.href = `mailto:${employee.email}` }} style={{ display: 'flex', alignItems: 'center', gap: 6, border: '1px solid #e5e7eb', background: '#fff', borderRadius: 8, padding: '7px 14px', fontSize: 13, fontWeight: 500, color: '#374151', cursor: 'pointer' }}>
            <MessageSquare size={14} /> Message
          </button>
          <button onClick={() => openEditor('profile')} style={{ display: 'flex', alignItems: 'center', gap: 6, border: '1px solid #e5e7eb', background: '#fff', borderRadius: 8, padding: '7px 14px', fontSize: 13, fontWeight: 500, color: '#374151', cursor: 'pointer' }}>
            <Pencil size={14} /> Edit
          </button>
          <button onClick={() => setActiveTab('Activity')} style={{ display: 'flex', alignItems: 'center', gap: 6, border: '1px solid #e5e7eb', background: '#fff', borderRadius: 8, padding: '7px 14px', fontSize: 13, fontWeight: 500, color: '#374151', cursor: 'pointer' }}>
            <MoreHorizontal size={14} /> More
          </button>
        </div>
      </div>

      {/* Employee header card */}
      <div style={{ ...cardStyle, padding: '20px 24px', marginBottom: 14 }}>
        <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start', flexWrap: 'wrap' }}>
          {/* Avatar */}
          <div style={{ width: 80, height: 80, borderRadius: '50%', background: '#22c55e', display: 'grid', placeItems: 'center', flexShrink: 0, fontSize: 26, fontWeight: 700, color: '#fff', overflow: 'hidden' }}>
            {employee.photo ? (
              <span
                role="img"
                aria-label={name}
                style={{ width: '100%', height: '100%', backgroundImage: `url(${employee.photo})`, backgroundSize: 'cover', backgroundPosition: 'center' }}
              />
            ) : (
              initials(name)
            )}
          </div>
          {/* Name + details */}
          <div style={{ flex: 1, minWidth: 200 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 4 }}>
              <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: '#111827' }}>{name}</h2>
              <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 99, background: sb.bg, color: sb.text }}>{employee.employmentStatus}</span>
            </div>
            <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 8 }}>
              {employee.jobTitle}
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, marginLeft: 10, background: '#dbeafe', color: '#1d4ed8', fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 99 }}>
                {employee.employeeId}
              </span>
            </div>
            <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', fontSize: 12, color: '#6b7280' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><Briefcase size={12} /> {employee.department}</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><Users size={12} /> {employee.team}</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><Mail size={12} /> {employee.email}</span>
              {employee.phone && <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><Phone size={12} /> {employee.phone}</span>}
            </div>
          </div>
          {/* Right info blocks */}
          <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', fontSize: 12, flexShrink: 0 }}>
            {employee.reportsTo && (
              <div>
                <div style={{ color: '#9ca3af', marginBottom: 4, fontWeight: 500 }}>Reporting Manager</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#e5e7eb', display: 'grid', placeItems: 'center', fontSize: 10, fontWeight: 700, color: '#374151' }}>
                    {initials(employee.reportsTo)}
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, color: '#111827', fontSize: 13 }}>{employee.reportsTo}</div>
                  </div>
                </div>
              </div>
            )}
            <div>
              <div style={{ color: '#9ca3af', marginBottom: 4, fontWeight: 500 }}>Employment Type</div>
              <div style={{ fontWeight: 600, color: '#111827', fontSize: 13 }}>{employee.employeeType}</div>
            </div>
            {employee.workLocation && (
              <div>
                <div style={{ color: '#9ca3af', marginBottom: 4, fontWeight: 500 }}>Work Location</div>
                <div style={{ fontWeight: 600, color: '#111827', fontSize: 13, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <MapPin size={12} /> {employee.workLocation}
                </div>
              </div>
            )}
            <div>
              <div style={{ color: '#9ca3af', marginBottom: 4, fontWeight: 500 }}>Date of Joining</div>
              <div style={{ fontWeight: 600, color: '#111827', fontSize: 13 }}>{formatDate(employee.dateOfJoining)}</div>
            </div>
            {probationEnd && (
              <div>
                <div style={{ color: '#9ca3af', marginBottom: 4, fontWeight: 500 }}>Probation Ends</div>
                <div style={{ fontWeight: 600, color: '#111827', fontSize: 13 }}>
                  {probationEnd.date}
                  {probationEnd.daysLeft > 0 && <span style={{ fontSize: 11, color: '#f59e0b', marginLeft: 6 }}>({probationEnd.daysLeft} days left)</span>}
                </div>
              </div>
            )}
            <div>
              <div style={{ color: '#9ca3af', marginBottom: 4, fontWeight: 500 }}>Work Email</div>
              <div style={{ fontWeight: 600, color: '#111827', fontSize: 13 }}>{employee.email || '-'}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 2, borderBottom: '1px solid #e5e7eb', marginBottom: 16, background: '#fff', padding: '0 8px', borderRadius: '12px 12px 0 0', border: '1px solid #e5e7eb', overflowX: 'auto' }}>
        {TABS.map(t => (
          <button key={t} onClick={() => setActiveTab(t)} style={{ border: 'none', borderBottom: `2px solid ${activeTab === t ? '#22c55e' : 'transparent'}`, background: 'transparent', color: activeTab === t ? '#22c55e' : '#6b7280', padding: '12px 16px', fontSize: 13, fontWeight: activeTab === t ? 600 : 400, cursor: 'pointer', transition: 'color 150ms ease', whiteSpace: 'nowrap', flexShrink: 0 }}>
            {t}
          </button>
        ))}
      </div>

      {/* Overview tab */}
      {activeTab === 'Overview' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 280px', gap: 14 }}>

          {/* Personal Info */}
          <div style={{ ...cardStyle, padding: '18px 20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <span style={{ fontSize: 14, fontWeight: 600, color: '#111827' }}>Personal Information</span>
              <div style={{ display: 'flex', gap: 6 }}>
                <button onClick={sendLoginDetails} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, border: '1px solid #bbf7d0', background: '#f0fdf4', borderRadius: 7, padding: '4px 10px', fontSize: 12, color: '#15803d', cursor: 'pointer', fontWeight: 700 }}>
                  <Mail size={12} /> Send login
                </button>
                <button onClick={() => openEditor('personal')} style={{ border: '1px solid #e5e7eb', background: '#fff', borderRadius: 7, padding: '4px 12px', fontSize: 12, color: '#374151', cursor: 'pointer' }}>Edit</button>
              </div>
            </div>
            {credentialNotice && <div style={{ padding: '8px 10px', borderRadius: 8, background: '#f0fdf4', color: '#15803d', fontSize: 12, fontWeight: 600, marginBottom: 10 }}>{credentialNotice}</div>}
            {[
              ['Full Name',         name],
              ['Employee ID',       employee.employeeId],
              ['Date of Birth',     employee.dateOfBirth ? `${formatDate(employee.dateOfBirth)} (${new Date().getFullYear() - new Date(employee.dateOfBirth).getFullYear()} years)` : 'â€”'],
              ['Gender',            employee.gender || 'â€”'],
              ['Marital Status',    employee.maritalStatus || 'â€”'],
              ['Nationality',       employee.nationality || 'â€”'],
              ['Phone Number',      employee.phone || 'â€”'],
              ['Work Email',        employee.email || '-'],
              ['Portal Login Email', employee.portalEmail || 'Not generated'],
              ['Temporary Password', employee.portalPassword || 'Not generated'],
              ['Emergency Contact', employee.emergencyContactName ? `${employee.emergencyContactName}${employee.emergencyContactRelationship ? ` (${employee.emergencyContactRelationship})` : ''}\n${employee.emergencyContactPhone || ''}` : 'â€”'],
            ].map(([label, value]) => (
              <div key={label} style={{ display: 'grid', gridTemplateColumns: '130px 1fr', gap: 8, padding: '6px 0', borderBottom: '1px solid #f9fafb' }}>
                <span style={{ fontSize: 12, color: '#9ca3af', fontWeight: 500 }}>{label}</span>
                <span style={{ fontSize: 12, color: '#374151', fontWeight: 400, whiteSpace: 'pre-line' }}>{value}</span>
              </div>
            ))}
          </div>

          {/* Job Info */}
          <div style={{ ...cardStyle, padding: '18px 20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <span style={{ fontSize: 14, fontWeight: 600, color: '#111827' }}>Job Information</span>
              <button onClick={() => openEditor('job')} style={{ border: '1px solid #e5e7eb', background: '#fff', borderRadius: 7, padding: '4px 12px', fontSize: 12, color: '#374151', cursor: 'pointer' }}>Edit</button>
            </div>
            {[
              ['Department',       employee.department],
              ['Team',             employee.team],
              ['Position',         employee.jobTitle],
              ['Employment Type',  employee.employeeType],
              ['Employee Role',    employee.employeeRole || 'Employee'],
              ['Work Location',    employee.workLocation || 'â€”'],
              ['Date of Joining',  formatDate(employee.dateOfJoining)],
              ['Reporting Manager',employee.reportsTo || 'â€”'],
              ['Probation Ends',   probationEnd?.date || 'â€”'],
              ['Employee Status',  employee.employmentStatus],
            ].map(([label, value]) => (
              <div key={label} style={{ display: 'grid', gridTemplateColumns: '140px 1fr', gap: 8, padding: '6px 0', borderBottom: '1px solid #f9fafb' }}>
                <span style={{ fontSize: 12, color: '#9ca3af', fontWeight: 500 }}>{label}</span>
                <span style={{ fontSize: 12, color: label === 'Employee Status' ? statusBadge(value || '').text : '#374151', fontWeight: label === 'Employee Status' ? 600 : 400 }}>{value}</span>
              </div>
            ))}

            {/* Salary summary */}
            <div style={{ marginTop: 18 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: '#111827' }}>Salary Information</span>
                <button onClick={() => openEditor('salary')} style={{ border: 'none', background: 'transparent', fontSize: 12, color: '#22c55e', fontWeight: 500, cursor: 'pointer' }}>Edit payroll</button>
              </div>
              <div style={{ background: '#f9fafb', borderRadius: 10, padding: '12px 14px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 10 }}>
                  {[
                    { label: 'Basic Salary',     value: money(salary.basic) },
                    { label: 'Total Allowances', value: money(salary.allowances) },
                    { label: 'Total Deductions', value: money(salary.deductions) },
                  ].map(s => (
                    <div key={s.label}>
                      <div style={{ fontSize: 11, color: '#9ca3af', marginBottom: 2 }}>{s.label}</div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>{s.value}</div>
                      <div style={{ fontSize: 10, color: '#9ca3af' }}>Monthly</div>
                    </div>
                  ))}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 10px', background: '#f0fdf4', borderRadius: 8 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#15803d' }}>Net Salary</span>
                  <span style={{ fontSize: 16, fontWeight: 700, color: '#15803d' }}>
                    {money(salary.net)} <span style={{ fontSize: 11, fontWeight: 500, color: '#22c55e' }}>Monthly</span>
                  </span>
                </div>
              </div>
            </div>

            {/* Recent documents */}
            <div style={{ marginTop: 18 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: '#111827' }}>Recent Documents</span>
                <button onClick={() => setActiveTab('Documents')} style={{ border: 'none', background: 'transparent', fontSize: 12, color: '#22c55e', fontWeight: 500, cursor: 'pointer' }}>View All</button>
              </div>
              {documents.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '14px 0', color: '#9ca3af', fontSize: 12 }}>No documents uploaded yet</div>
              ) : documents.slice(0, 4).map(doc => {
                const dic = docIcon(doc.type)
                return (
                  <div key={doc.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 0', borderBottom: '1px solid #f3f4f6' }}>
                    <div style={{ width: 28, height: 28, borderRadius: 7, background: dic.bg, display: 'grid', placeItems: 'center', flexShrink: 0 }}>
                      <FileText size={13} color={dic.color} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: 500, color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{doc.name}</div>
                      <div style={{ fontSize: 10, color: '#9ca3af' }}>{doc.type.toUpperCase()} â€¢ Uploaded on {formatDate(doc.uploadedAt)}</div>
                    </div>
                    {doc.dataUrl ? (
                      <a href={doc.dataUrl} download={doc.name} style={{ color: '#9ca3af', display: 'grid', placeItems: 'center' }} aria-label={`Download ${doc.name}`}><Download size={14} /></a>
                    ) : (
                      <button style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#9ca3af' }}><Download size={14} /></button>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Right sidebar */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {/* Leave Balance */}
            <div style={{ ...cardStyle, padding: '16px 18px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: '#111827' }}>Leave Balance</span>
                <button onClick={() => setActiveTab('Leave Balance')} style={{ border: 'none', background: 'transparent', fontSize: 11, color: '#22c55e', fontWeight: 500, cursor: 'pointer' }}>View All</button>
              </div>
              {leaveBalances.map(lb => (
                <div key={lb.type} style={{ marginBottom: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5, fontSize: 12 }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ width: 14, height: 14, borderRadius: 4, background: `${lb.color}20`, display: 'grid', placeItems: 'center' }}>
                        <CalendarCheck size={9} color={lb.color} />
                      </span>
                      <span style={{ color: '#374151' }}>{lb.type}</span>
                    </span>
                    <span style={{ color: '#6b7280' }}>{lb.remaining} / {lb.total} days</span>
                  </div>
                  <div style={{ height: 5, borderRadius: 3, background: '#f3f4f6', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${Math.min(100, (lb.remaining / lb.total) * 100)}%`, background: lb.color, borderRadius: 3 }} />
                  </div>
                </div>
              ))}
            </div>

            {/* Attendance Summary */}
            <div style={{ ...cardStyle, padding: '16px 18px' }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#111827', marginBottom: 12 }}>Attendance Summary (This Month)</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ position: 'relative', width: 80, height: 80, flexShrink: 0 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={attDonut.length ? attDonut : [{ name: 'None', value: 1, color: '#e5e7eb' }]} innerRadius={26} outerRadius={38} dataKey="value" strokeWidth={0}>
                        {(attDonut.length ? attDonut : [{ color: '#e5e7eb' }]).map((d, i) => <Cell key={i} fill={d.color} />)}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                  <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', textAlign: 'center' }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#111827' }}>{attendanceStats.attendanceRate}%</div>
                  </div>
                </div>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {[
                    { label: 'Present', value: attendanceStats.present, color: '#22c55e' },
                    { label: 'Late', value: attendanceStats.late, color: '#f59e0b' },
                    { label: 'Absent', value: attendanceStats.absent, color: '#ef4444' },
                    { label: 'On Leave', value: attendanceStats.onLeave, color: '#3b82f6' },
                  ].map(r => (
                    <div key={r.label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 5, color: '#374151' }}>
                        <span style={{ width: 6, height: 6, borderRadius: '50%', background: r.color }} />{r.label}
                      </span>
                      <span style={{ color: '#6b7280' }}>{r.value} days</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div style={{ ...cardStyle, padding: '16px 18px' }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#111827', marginBottom: 12 }}>Quick Actions</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {[
                  { label: 'Request Leave',          Icon: CalendarCheck, color: '#22c55e', action: () => setActiveTab('Leave History') },
                  { label: 'View Payslip',            Icon: CreditCard,    color: '#3b82f6', action: () => setActiveTab('Payroll') },
                  { label: 'View Loans',              Icon: Briefcase,     color: '#0891b2', action: () => setActiveTab('Loans') },
                  { label: 'Upload Document',         Icon: Upload,        color: '#8b5cf6', action: () => setActiveTab('Documents') },
                  { label: 'Request Attendance',      Icon: CheckCircle2,  color: '#f59e0b', action: () => setActiveTab('Attendance') },
                ].map(a => {
                  const AIcon = a.Icon
                  return (
                    <button key={a.label} onClick={a.action} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, padding: '10px 8px', border: '1px solid #f3f4f6', borderRadius: 10, background: '#fff', cursor: 'pointer', fontFamily: font }}>
                      <div style={{ width: 32, height: 32, borderRadius: 8, background: `${a.color}18`, display: 'grid', placeItems: 'center' }}>
                        <AIcon size={14} color={a.color} />
                      </div>
                      <span style={{ fontSize: 10, fontWeight: 500, color: '#374151', textAlign: 'center', lineHeight: 1.3 }}>{a.label}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Attendance tab */}
      {activeTab === 'Attendance' && (
        <div style={{ display: 'grid', gap: 14 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
            {[
              ['Present', `${attendanceStats.present} day${attendanceStats.present === 1 ? '' : 's'}`, '#22c55e'],
              ['Late', `${attendanceStats.late} day${attendanceStats.late === 1 ? '' : 's'}`, '#f59e0b'],
              ['On Leave', `${attendanceStats.onLeave} day${attendanceStats.onLeave === 1 ? '' : 's'}`, '#3b82f6'],
              ['Attendance Rate', `${attendanceStats.attendanceRate}%`, '#22c55e'],
            ].map(([label, value, color]) => (
              <div key={label} style={{ ...cardStyle, padding: '16px 18px' }}>
                <div style={{ fontSize: 11, color: '#9ca3af', fontWeight: 700, textTransform: 'uppercase', marginBottom: 8 }}>{label}</div>
                <div style={{ fontSize: 22, fontWeight: 800, color }}>{value}</div>
              </div>
            ))}
          </div>
          <div style={{ ...cardStyle, padding: '18px 20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', marginBottom: 14 }}>
              <div>
                <div style={{ fontSize: 15, fontWeight: 700, color: '#111827' }}>Add attendance record</div>
                <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>A saved daily attendance entry for this employee.</div>
              </div>
              <button onClick={saveAttendanceRecord} style={{ border: 'none', background: '#22c55e', color: '#fff', borderRadius: 8, padding: '9px 14px', fontSize: 12, fontWeight: 800, cursor: 'pointer' }}>Save record</button>
            </div>
            {attendanceError && <div style={{ marginBottom: 12, color: '#b91c1c', background: '#fee2e2', borderRadius: 8, padding: '8px 10px', fontSize: 12, fontWeight: 700 }}>{attendanceError}</div>}
            <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 1fr 1fr 1fr 1fr 2fr', gap: 10 }}>
              <label style={{ display: 'grid', gap: 5, fontSize: 11, color: '#6b7280', fontWeight: 700 }}>
                Date
                <input type="date" value={attendanceDraft.date || ''} onChange={event => setAttendanceDraft(previous => ({ ...previous, date: event.target.value }))} style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: '9px 10px', fontSize: 12, color: '#111827' }} />
              </label>
              <label style={{ display: 'grid', gap: 5, fontSize: 11, color: '#6b7280', fontWeight: 700 }}>
                Status
                <select value={attendanceDraft.status || 'Present'} onChange={event => setAttendanceDraft(previous => ({ ...previous, status: event.target.value as AttendanceRecord['status'] }))} style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: '9px 10px', fontSize: 12, color: '#111827', background: '#fff' }}>
                  {['Present', 'Late', 'Absent', 'On Leave', 'Rest day'].map(status => <option key={status} value={status}>{status}</option>)}
                </select>
              </label>
              <label style={{ display: 'grid', gap: 5, fontSize: 11, color: '#6b7280', fontWeight: 700 }}>
                Clock in
                <input type="time" value={attendanceDraft.clockIn || ''} onChange={event => setAttendanceDraft(previous => ({ ...previous, clockIn: event.target.value }))} style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: '9px 10px', fontSize: 12, color: '#111827' }} />
              </label>
              <label style={{ display: 'grid', gap: 5, fontSize: 11, color: '#6b7280', fontWeight: 700 }}>
                Clock out
                <input type="time" value={attendanceDraft.clockOut || ''} onChange={event => setAttendanceDraft(previous => ({ ...previous, clockOut: event.target.value }))} style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: '9px 10px', fontSize: 12, color: '#111827' }} />
              </label>
              <label style={{ display: 'grid', gap: 5, fontSize: 11, color: '#6b7280', fontWeight: 700 }}>
                Break min
                <input type="number" min="0" value={attendanceDraft.breakMinutes ?? 0} onChange={event => setAttendanceDraft(previous => ({ ...previous, breakMinutes: Number(event.target.value) }))} style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: '9px 10px', fontSize: 12, color: '#111827' }} />
              </label>
              <label style={{ display: 'grid', gap: 5, fontSize: 11, color: '#6b7280', fontWeight: 700 }}>
                Notes
                <input value={attendanceDraft.notes || ''} onChange={event => setAttendanceDraft(previous => ({ ...previous, notes: event.target.value }))} placeholder="Optional note" style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: '9px 10px', fontSize: 12, color: '#111827' }} />
              </label>
            </div>
          </div>
          <div style={{ ...cardStyle, padding: '20px 24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', marginBottom: 14 }}>
              <div>
                <div style={{ fontSize: 15, fontWeight: 700, color: '#111827' }}>Attendance records</div>
                <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>Recent attendance logs for {name}</div>
              </div>
              <button style={{ border: '1px solid #e5e7eb', background: '#fff', borderRadius: 8, padding: '8px 12px', fontSize: 12, fontWeight: 700, color: '#374151', cursor: 'pointer' }}>Request correction</button>
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #f3f4f6' }}>
                  {['Date','Status','Clock in','Clock out','Hours'].map(h => (
                    <th key={h} style={{ padding: '9px 12px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {attendanceRows.map(row => {
                  const color = row.status === 'Present' ? '#16a34a' : row.status === 'Late' ? '#d97706' : row.status === 'On Leave' ? '#2563eb' : '#6b7280'
                  return (
                    <tr key={row.date} style={{ borderBottom: '1px solid #f9fafb' }}>
                      <td style={{ padding: '11px 12px', color: '#374151', fontWeight: 600 }}>{formatDate(row.date)}</td>
                      <td style={{ padding: '11px 12px' }}><span style={{ borderRadius: 999, background: `${color}18`, color, padding: '3px 10px', fontSize: 11, fontWeight: 800 }}>{row.status}</span></td>
                      <td style={{ padding: '11px 12px', color: '#374151' }}>{formatClock(row.clockIn)}</td>
                      <td style={{ padding: '11px 12px', color: '#374151' }}>{formatClock(row.clockOut)}</td>
                      <td style={{ padding: '11px 12px', color: '#374151' }}>{attendanceHours(row)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Leave History tab */}
      {activeTab === 'Leave History' && (
        <div style={{ ...cardStyle, padding: '20px 24px' }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: '#111827', marginBottom: 14 }}>Leave History</div>
          {leaves.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '24px 0' }}>
              <CalendarCheck size={36} color="#d1d5db" style={{ marginBottom: 12 }} />
              <div style={{ fontSize: 13, color: '#6b7280' }}>No leave history yet</div>
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #f3f4f6' }}>
                  {['Leave Type','Start Date','End Date','Days','Status'].map(h => (
                    <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {leaves.map(l => {
                  const lb = leaveBadge(l.status)
                  return (
                    <tr key={l.id} style={{ borderBottom: '1px solid #f9fafb' }}>
                      <td style={{ padding: '10px 12px' }}><span style={{ fontSize: 12, fontWeight: 600, padding: '3px 10px', borderRadius: 99, background: `${leaveTypeColor(l.leaveType)}20`, color: leaveTypeColor(l.leaveType) }}>{l.leaveType}</span></td>
                      <td style={{ padding: '10px 12px', color: '#374151' }}>{formatDate(l.startDate)}</td>
                      <td style={{ padding: '10px 12px', color: '#374151' }}>{formatDate(l.endDate)}</td>
                      <td style={{ padding: '10px 12px', color: '#374151' }}>{l.days}</td>
                      <td style={{ padding: '10px 12px' }}><span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 99, background: lb.bg, color: lb.text }}>{l.status}</span></td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Leave Balance tab */}
      {activeTab === 'Leave Balance' && (
        <div style={{ display: 'grid', gap: 14 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
            {leaveBalances.map(lb => (
              <div key={lb.type} style={{ ...cardStyle, padding: '18px 20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                  <span style={{ width: 36, height: 36, borderRadius: 10, background: `${lb.color}18`, display: 'grid', placeItems: 'center' }}><CalendarCheck size={16} color={lb.color} /></span>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 800, color: '#111827' }}>{lb.type}</div>
                    <div style={{ fontSize: 11, color: '#6b7280' }}>{lb.remaining} remaining of {lb.total} days</div>
                  </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#374151', marginBottom: 7 }}>
                  <span>Used {lb.used} day{lb.used === 1 ? '' : 's'}</span>
                  <strong>{Math.max(0, Math.round((lb.remaining / lb.total) * 100))}% left</strong>
                </div>
                <div style={{ height: 8, borderRadius: 99, background: '#f3f4f6', overflow: 'hidden' }}>
                  <div style={{ width: `${Math.min(100, Math.max(0, (lb.remaining / lb.total) * 100))}%`, height: '100%', background: lb.color }} />
                </div>
              </div>
            ))}
          </div>
          <div style={{ ...cardStyle, padding: '20px 24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', marginBottom: 14 }}>
              <div>
                <div style={{ fontSize: 15, fontWeight: 800, color: '#111827' }}>Leave Balance Details</div>
                <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>HR view of available balances and approved leave usage for {name}.</div>
              </div>
              <button onClick={() => setActiveTab('Leave History')} style={{ border: '1px solid #e5e7eb', background: '#fff', borderRadius: 8, padding: '8px 12px', fontSize: 12, fontWeight: 800, color: '#374151', cursor: 'pointer' }}>View history</button>
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #f3f4f6' }}>
                  {['Leave Type','Entitlement','Used','Remaining','Status'].map(h => (
                    <th key={h} style={{ padding: '9px 12px', textAlign: 'left', fontSize: 11, fontWeight: 800, color: '#9ca3af', textTransform: 'uppercase' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {leaveBalances.map(lb => (
                  <tr key={lb.type} style={{ borderBottom: '1px solid #f9fafb' }}>
                    <td style={{ padding: '12px', color: '#111827', fontWeight: 800 }}>{lb.type}</td>
                    <td style={{ padding: '12px', color: '#374151' }}>{lb.total} days</td>
                    <td style={{ padding: '12px', color: '#374151' }}>{lb.used} days</td>
                    <td style={{ padding: '12px', color: lb.remaining <= 0 ? '#dc2626' : '#15803d', fontWeight: 900 }}>{lb.remaining} days</td>
                    <td style={{ padding: '12px' }}><span style={{ borderRadius: 999, background: lb.remaining <= 0 ? '#fee2e2' : '#dcfce7', color: lb.remaining <= 0 ? '#dc2626' : '#15803d', padding: '3px 10px', fontSize: 11, fontWeight: 900 }}>{lb.remaining <= 0 ? 'Depleted' : 'Available'}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Payroll tab */}
      {activeTab === 'Payroll' && (
        <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: 14 }}>
          <div style={{ ...cardStyle, padding: '20px 22px' }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#111827', marginBottom: 14 }}>Salary package</div>
            {[
              ['Basic Salary', money(salary.basic)],
              ['Allowances', money(salary.allowances)],
              ['Deductions', `- ${money(salary.deductions)}`],
              ['Net Pay', money(salary.net)],
              ['Payment Method', employee.paymentMethod || 'Bank Transfer'],
              ['Bank', employee.bankName || '-'],
            ].map(([label, value]) => (
              <div key={label} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: '9px 0', borderBottom: '1px solid #f3f4f6' }}>
                <span style={{ fontSize: 12, color: '#6b7280' }}>{label}</span>
                <span style={{ fontSize: 12, fontWeight: 800, color: label === 'Net Pay' ? '#16a34a' : label === 'Deductions' ? '#ef4444' : '#111827', textAlign: 'right' }}>{value}</span>
              </div>
            ))}
            <button onClick={() => openEditor('salary')} style={{ width: '100%', marginTop: 14, border: 'none', background: '#22c55e', color: '#fff', borderRadius: 8, padding: '10px 12px', fontSize: 12, fontWeight: 800, cursor: 'pointer' }}>Edit payroll details</button>
            <div style={{ marginTop: 18, paddingTop: 16, borderTop: '1px solid #f3f4f6' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, fontWeight: 800, color: '#111827', marginBottom: 10 }}>
                <CreditCard size={15} color="#16a34a" /> Loan balances
              </div>
              {activeLoanBalances.length ? activeLoanBalances.map(loan => {
                const progress = loanPaymentProgress(loan, payrollRecords)
                return (
                  <div key={loan.id} style={{ border: '1px solid #e5e7eb', borderRadius: 10, padding: '10px 12px', marginBottom: 10, background: '#fff' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'flex-start' }}>
                      <span style={{ fontSize: 12, color: '#111827', fontWeight: 900 }}>{loanDisplayName(loan)}</span>
                      <span style={{ fontSize: 12, color: loan.deductionPaused ? '#d97706' : '#16a34a', fontWeight: 900 }}>{loan.deductionPaused ? 'Paused' : loan.status}</span>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 9 }}>
                      <span style={{ fontSize: 11, color: '#6b7280' }}>Balance<strong style={{ display: 'block', fontSize: 12, color: '#111827' }}>{money(progress.balance)}</strong></span>
                      <span style={{ fontSize: 11, color: '#6b7280' }}>Paid<strong style={{ display: 'block', fontSize: 12, color: '#111827' }}>{money(progress.paid)}</strong></span>
                      <span style={{ fontSize: 11, color: '#6b7280' }}>Paid terms<strong style={{ display: 'block', fontSize: 12, color: '#111827' }}>{progress.paidTerms}</strong></span>
                      <span style={{ fontSize: 11, color: '#6b7280' }}>Terms left<strong style={{ display: 'block', fontSize: 12, color: '#111827' }}>{progress.remainingTerms}</strong></span>
                      <span style={{ fontSize: 11, color: '#6b7280' }}>Deduction<strong style={{ display: 'block', fontSize: 12, color: '#111827' }}>{money(progress.scheduled)}</strong></span>
                      <span style={{ fontSize: 11, color: '#6b7280' }}>Last paid<strong style={{ display: 'block', fontSize: 12, color: '#111827' }}>{progress.lastPaidPeriod || '-'}</strong></span>
                    </div>
                  </div>
                )
              }) : (
                <div style={{ border: '1px dashed #d1d5db', borderRadius: 10, padding: 12, color: '#6b7280', fontSize: 12, textAlign: 'center' }}>No active loan balances.</div>
              )}
            </div>
          </div>
          <div style={{ ...cardStyle, padding: '20px 24px' }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#111827', marginBottom: 14 }}>Payslip history</div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #f3f4f6' }}>
                  {['Period','Gross','Deductions','Net Pay','Status','Action'].map(h => (
                    <th key={h} style={{ padding: '9px 12px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {payrollRows.map(row => {
                  const paid = row.status.toLowerCase() === 'paid'
                  return (
                    <tr key={row.id} style={{ borderBottom: '1px solid #f9fafb' }}>
                      <td style={{ padding: '11px 12px', color: '#111827', fontWeight: 700 }}>{row.period}</td>
                      <td style={{ padding: '11px 12px', color: '#374151' }}>{money(row.gross)}</td>
                      <td style={{ padding: '11px 12px', color: '#ef4444' }}>- {money(row.deductions)}</td>
                      <td style={{ padding: '11px 12px', color: '#16a34a', fontWeight: 800 }}>{money(row.net)}</td>
                      <td style={{ padding: '11px 12px' }}><span style={{ borderRadius: 999, background: paid ? '#dcfce7' : '#fef3c7', color: paid ? '#15803d' : '#d97706', padding: '3px 10px', fontSize: 11, fontWeight: 800 }}>{row.status}</span></td>
                      <td style={{ padding: '11px 12px' }}>
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                          <button onClick={() => setSelectedPayslipId(row.id)} style={{ border: '1px solid #e5e7eb', background: '#fff', borderRadius: 7, padding: '5px 10px', fontSize: 12, cursor: 'pointer' }}>View</button>
                          <button onClick={() => employee && downloadEmployeePayslipPdf(employee, row, loanRequests)} style={{ border: '1px solid #bbf7d0', background: '#22c55e', color: '#fff', borderRadius: 7, padding: '5px 10px', fontSize: 12, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6, fontWeight: 800 }}><Download size={13} /> PDF</button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Loans tab */}
      {activeTab === 'Loans' && (
        <div style={{ display: 'grid', gap: 14 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
            {[
              ['Total Requests', String(loanRequests.length), '#2563eb'],
              ['Active Loans', String(activeLoanBalances.length), '#16a34a'],
              ['Total Balance', money(activeLoanBalances.reduce((sum, loan) => sum + loanPaymentProgress(loan, payrollRecords).balance, 0)), '#0891b2'],
              ['Payroll Deductions', money(activeLoanBalances.reduce((sum, loan) => sum + loanPaymentProgress(loan, payrollRecords).scheduled, 0)), '#f59e0b'],
            ].map(([label, value, color]) => (
              <div key={label} style={{ ...cardStyle, padding: '16px 18px' }}>
                <div style={{ fontSize: 11, color: '#9ca3af', fontWeight: 800, textTransform: 'uppercase', marginBottom: 8 }}>{label}</div>
                <div style={{ fontSize: 22, fontWeight: 900, color }}>{value}</div>
              </div>
            ))}
          </div>
          <div style={{ ...cardStyle, padding: '20px 24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', marginBottom: 14 }}>
              <div>
                <div style={{ fontSize: 15, fontWeight: 800, color: '#111827' }}>Loans & Cash Advances</div>
                <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>Read-only HR view. Finance owns approval, terms, schedules, and deduction controls.</div>
              </div>
            </div>
            {loanRequests.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '30px 0' }}>
                <CreditCard size={36} color="#d1d5db" style={{ marginBottom: 12 }} />
                <div style={{ fontSize: 13, color: '#6b7280' }}>No loan or cash advance records yet</div>
              </div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #f3f4f6' }}>
                    {['Loan Type','Original Amount','Paid','Balance','Deduction','Paid Terms','Terms Left','Status','Last Deducted'].map(h => (
                      <th key={h} style={{ padding: '9px 12px', textAlign: 'left', fontSize: 11, fontWeight: 800, color: '#9ca3af', textTransform: 'uppercase' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {loanRequests.map(loan => {
                    const progress = loanPaymentProgress(loan, payrollRecords)
                    const active = loan.status === 'Approved' || loan.status === 'Processed'
                    return (
                      <tr key={loan.id} style={{ borderBottom: '1px solid #f9fafb' }}>
                        <td style={{ padding: '12px', color: '#111827', fontWeight: 800 }}>{loanDisplayName(loan)}</td>
                        <td style={{ padding: '12px', color: '#374151' }}>{money(loan.amount)}</td>
                        <td style={{ padding: '12px', color: '#374151' }}>{money(progress.paid)}</td>
                        <td style={{ padding: '12px', color: active && progress.balance > 0 ? '#15803d' : '#374151', fontWeight: 900 }}>{money(progress.balance)}</td>
                        <td style={{ padding: '12px', color: '#374151' }}>{money(progress.scheduled)}<span style={{ display: 'block', color: '#9ca3af', fontSize: 11 }}>{loan.deductionPaused ? 'Paused' : loan.deductionSchedule || 'Twice a month'}</span></td>
                        <td style={{ padding: '12px', color: '#374151' }}>{progress.paidTerms}</td>
                        <td style={{ padding: '12px', color: '#374151' }}>{progress.remainingTerms}</td>
                        <td style={{ padding: '12px' }}><span style={{ borderRadius: 999, background: loan.status === 'Rejected' ? '#fee2e2' : active ? '#dcfce7' : '#fef3c7', color: loan.status === 'Rejected' ? '#dc2626' : active ? '#15803d' : '#d97706', padding: '3px 10px', fontSize: 11, fontWeight: 900 }}>{loan.status}</span></td>
                        <td style={{ padding: '12px', color: '#374151' }}>{progress.lastPaidPeriod || loan.lastDeductedPayrollPeriod || '-'}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* Documents tab */}
      {activeTab === 'Documents' && (
        <div style={{ ...cardStyle, padding: '20px 24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <span style={{ fontSize: 14, fontWeight: 600, color: '#111827' }}>Documents</span>
            <input ref={documentInputRef} type="file" multiple hidden onChange={event => handleDocumentUpload(event.target.files)} />
            <button onClick={() => documentInputRef.current?.click()} style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#22c55e', border: 'none', borderRadius: 8, padding: '7px 14px', fontSize: 12, fontWeight: 600, color: '#fff', cursor: 'pointer' }}>
              <Upload size={13} /> Upload Document
            </button>
          </div>
          {uploadError && <div style={{ marginBottom: 12, border: '1px solid #fecaca', background: '#fef2f2', color: '#dc2626', borderRadius: 8, padding: '8px 10px', fontSize: 12 }}>{uploadError}</div>}
          {documents.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '32px 0' }}>
              <FileText size={36} color="#d1d5db" style={{ marginBottom: 12 }} />
              <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 6 }}>No documents uploaded yet</div>
              <div style={{ fontSize: 12, color: '#9ca3af' }}>Upload contracts, IDs, certificates, and other HR documents here.</div>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
              {documents.map(doc => {
                const dic = docIcon(doc.type)
                return (
                  <div key={doc.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', border: '1px solid #f3f4f6', borderRadius: 10 }}>
                    <div style={{ width: 32, height: 32, borderRadius: 8, background: dic.bg, display: 'grid', placeItems: 'center', flexShrink: 0 }}><FileText size={15} color={dic.color} /></div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 500, color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{doc.name}</div>
                      <div style={{ fontSize: 11, color: '#9ca3af' }}>{doc.type.toUpperCase()} â€¢ {formatDate(doc.uploadedAt)}</div>
                    </div>
                    {doc.dataUrl ? (
                      <a href={doc.dataUrl} download={doc.name} style={{ color: '#9ca3af', display: 'grid', placeItems: 'center' }} aria-label={`Download ${doc.name}`}><Download size={14} /></a>
                    ) : (
                      <button style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#9ca3af' }}><Download size={14} /></button>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* Performance tab */}
      {activeTab === 'Performance' && (
        <div style={{ display: 'grid', gap: 14 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
            {[
              ['Overall Score', `${performanceStats.overallScore} / 5`, '#22c55e'],
              ['Goals Complete', `${performanceStats.completedGoals} / ${performanceStats.totalGoals}`, '#3b82f6'],
              ['Feedback Notes', String(performanceStats.feedbackCount), '#8b5cf6'],
              ['Next Review', performanceStats.nextReview, '#f59e0b'],
            ].map(([label, value, color]) => (
              <div key={label} style={{ ...cardStyle, padding: '16px 18px' }}>
                <div style={{ fontSize: 11, color: '#9ca3af', fontWeight: 700, textTransform: 'uppercase', marginBottom: 8 }}>{label}</div>
                <div style={{ fontSize: 22, fontWeight: 800, color }}>{value}</div>
              </div>
            ))}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div style={{ ...cardStyle, padding: '20px 24px' }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#111827', marginBottom: 12 }}>Active goals</div>
              {performanceGoals.map(goal => (
                <div key={goal.id} style={{ marginBottom: 14 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 12 }}>
                    <span style={{ color: '#374151', fontWeight: 700 }}>{goal.title}</span>
                    <span style={{ color: '#6b7280' }}>{goal.progress}%</span>
                  </div>
                  <div style={{ height: 7, borderRadius: 99, background: '#f3f4f6', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${goal.progress}%`, background: goal.status === 'At Risk' ? '#f59e0b' : '#22c55e' }} />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 5, fontSize: 11, color: '#9ca3af' }}>
                    <span>{goal.status}</span>
                    <span>Due {formatDate(goal.dueDate)}</span>
                  </div>
                </div>
              ))}
            </div>
            <div style={{ ...cardStyle, padding: '20px 24px' }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#111827', marginBottom: 12 }}>Recent feedback</div>
              {performanceFeedback.map(feedback => (
                <div key={feedback.id} style={{ display: 'flex', gap: 10, padding: '10px 0', borderBottom: '1px solid #f3f4f6' }}>
                  <TrendingUp size={15} color="#22c55e" />
                  <div>
                    <div style={{ fontSize: 13, color: '#374151', fontWeight: 600 }}>{feedback.note}</div>
                    <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 3 }}>By {feedback.author} - {feedback.rating}/5 - {formatDate(feedback.createdAt)}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Activity tab */}
      {activeTab === 'Activity' && (
        <div style={{ ...cardStyle, padding: '20px 24px' }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: '#111827', marginBottom: 14 }}>Recent Activity</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
            {activityItems.map((a, i) => {
              const AIcon = a.Icon
              return (
                <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: '12px 14px', border: '1px solid #f3f4f6', borderRadius: 10 }}>
                  <div style={{ width: 30, height: 30, borderRadius: 8, background: a.bg, display: 'grid', placeItems: 'center', flexShrink: 0 }}>
                    <AIcon size={14} color={a.color} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#111827', marginBottom: 2 }}>{a.title}</div>
                    <div style={{ fontSize: 12, color: '#6b7280' }}>{a.desc}</div>
                    <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 4 }}>{a.time}</div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {selectedPayslip && employee && (
        <PayslipPreviewModal
          employee={employee}
          payslip={selectedPayslip}
          loanRequests={loanRequests}
          onClose={() => setSelectedPayslipId(null)}
        />
      )}

      {editOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 120, background: 'rgba(15,23,42,0.45)', display: 'grid', placeItems: 'center', padding: 18 }}>
          <div style={{ width: 'min(720px, 100%)', maxHeight: '88vh', overflow: 'auto', background: '#fff', borderRadius: 14, boxShadow: '0 24px 80px rgba(15,23,42,0.24)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '18px 22px', borderBottom: '1px solid #e5e7eb' }}>
              <div>
                <div style={{ fontSize: 16, fontWeight: 800, color: '#111827' }}>Edit {editSection === 'profile' ? 'employee profile' : `${editSection} information`}</div>
                <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>Changes save to the employee record and update this page immediately.</div>
              </div>
              <button onClick={() => setEditOpen(false)} style={{ border: 'none', background: '#f3f4f6', width: 32, height: 32, borderRadius: '50%', cursor: 'pointer', color: '#374151' }}>x</button>
            </div>

            <div style={{ padding: 22 }}>
              {editError && <div style={{ border: '1px solid #fecaca', background: '#fef2f2', color: '#dc2626', borderRadius: 8, padding: '10px 12px', fontSize: 12, fontWeight: 700, marginBottom: 14 }}>{editError}</div>}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 12 }}>
                {editFields[editSection].map(field => (
                  <label key={String(field.key)} style={{ display: 'grid', gap: 6 }}>
                    <span style={{ fontSize: 12, color: '#374151', fontWeight: 700 }}>{field.label}</span>
                    {field.key === 'employeeRole' ? (
                      <select
                        value={String(editDraft.employeeRole ?? 'Employee')}
                        onChange={event => setEditDraft(previous => ({ ...previous, employeeRole: event.target.value }))}
                        style={{ width: '100%', border: '1px solid #e5e7eb', borderRadius: 8, padding: '10px 12px', fontSize: 13, color: '#111827', outline: 'none', fontFamily: font, background: '#fff' }}
                      >
                        {EMPLOYEE_ROLE_OPTIONS.map(option => <option key={option} value={option}>{option}</option>)}
                      </select>
                    ) : (
                      <input
                        type={field.type || 'text'}
                        value={String(editDraft[field.key] ?? '')}
                        onChange={event => {
                          const isPhoneField = field.key === 'phone' || field.key === 'alternatePhone' || field.key === 'emergencyContactPhone'
                          setEditError('')
                          setEditDraft(previous => ({ ...previous, [field.key]: isPhoneField ? formatPhilippineMobileNumber(event.target.value) : event.target.value }))
                        }}
                        placeholder={field.key === 'phone' || field.key === 'alternatePhone' || field.key === 'emergencyContactPhone' ? philippineMobilePlaceholder : undefined}
                        inputMode={field.key === 'phone' || field.key === 'alternatePhone' || field.key === 'emergencyContactPhone' ? 'tel' : undefined}
                        maxLength={field.key === 'phone' || field.key === 'alternatePhone' || field.key === 'emergencyContactPhone' ? 17 : undefined}
                        style={{ width: '100%', border: '1px solid #e5e7eb', borderRadius: 8, padding: '10px 12px', fontSize: 13, color: '#111827', outline: 'none', fontFamily: font }}
                      />
                    )}
                  </label>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, padding: '14px 22px 18px', borderTop: '1px solid #f3f4f6' }}>
              <button onClick={() => setEditOpen(false)} style={{ border: '1px solid #e5e7eb', background: '#fff', borderRadius: 8, padding: '9px 16px', fontSize: 13, fontWeight: 700, color: '#374151', cursor: 'pointer' }}>Cancel</button>
              <button onClick={saveEmployeeEdits} style={{ border: 'none', background: '#22c55e', borderRadius: 8, padding: '9px 18px', fontSize: 13, fontWeight: 800, color: '#fff', cursor: 'pointer' }}>Save changes</button>
            </div>
          </div>
        </div>
      )}

    </main>
  )
}

function downloadEmployeePayslipPdf(employee: Employee, payslip: PayrollRecord, loanRequests: LoanRequest[]) {
  const basicSalary = employee.basicSalary || Math.max(0, payslip.gross - (employee.allowances || 0))
  const regularAllowances = Math.max(0, payslip.gross - basicSalary - allowanceLinesTotal(payslip))
  const deductionBreakdown = payslip.deductionBreakdown
  const loanLines = payslipLoanDeductionLines(payslip, loanRequests)
  const visibleLoanTotal = loanLines.reduce((sum, line) => sum + Number(line.amount || 0), 0)
  const savedLoanTotal = Math.max(Number(deductionBreakdown?.loanOrCashAdvance || 0), payslip.loanDeductions?.reduce((sum, line) => sum + Number(line.amount || 0), 0) || 0)
  const missingLoanTotal = Math.max(0, visibleLoanTotal - savedLoanTotal)
  const displayedDeductions = Number(payslip.deductions || 0) + missingLoanTotal
  const displayedNet = Math.max(0, Number(payslip.net || 0) - missingLoanTotal)
  const statutoryFallback = !deductionBreakdown ? Math.max(0, Number(payslip.deductions || 0) - savedLoanTotal) : 0

  const doc = new jsPDF()
  let y = 18
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(18)
  doc.text('Employee Payslip', 14, y)
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.text(`Generated: ${formatDate(new Date().toISOString())}`, 150, y)

  y += 12
  doc.setDrawColor(22, 163, 74)
  doc.setLineWidth(0.8)
  doc.line(14, y, 196, y)

  y += 12
  pdfSectionTitle(doc, 'Employee Details', y)
  y += 8
  y = pdfDetailRow(doc, y, 'Employee Name', fullName(employee))
  y = pdfDetailRow(doc, y, 'Employee ID', employee.employeeId || employee.id)
  y = pdfDetailRow(doc, y, 'Department', employee.department || '-')
  y = pdfDetailRow(doc, y, 'Designation', employee.jobTitle || '-')
  y = pdfDetailRow(doc, y, 'Payroll Cycle', payslip.period)
  y = pdfDetailRow(doc, y, 'Pay Date', formatDate(payslip.paidAt || payslip.createdAt))
  y = pdfDetailRow(doc, y, 'Status', payslip.status)

  y += 6
  pdfSectionTitle(doc, 'Earnings', y)
  y += 8
  y = pdfMoneyRow(doc, y, 'Basic Salary', basicSalary)
  y = pdfMoneyRow(doc, y, 'Allowances', regularAllowances)
  ;(payslip.allowanceLines || []).forEach(line => {
    y = pdfMoneyRow(doc, y, line.type.toLowerCase().includes('allowance') ? line.type : `${line.type} Allowance`, line.amount)
  })
  y = pdfMoneyRow(doc, y, 'Gross Earnings', payslip.gross, true)

  y += 6
  pdfSectionTitle(doc, 'Deductions', y)
  y += 8
  if (deductionBreakdown) {
    y = pdfMoneyRow(doc, y, 'SSS', deductionBreakdown.sss)
    y = pdfMoneyRow(doc, y, 'PhilHealth', deductionBreakdown.philHealth)
    y = pdfMoneyRow(doc, y, 'Pag-IBIG', deductionBreakdown.pagIbig)
    y = pdfMoneyRow(doc, y, 'Tax', deductionBreakdown.tax)
  } else {
    y = pdfMoneyRow(doc, y, 'Payroll Deductions', statutoryFallback)
  }
  if (loanLines.length) {
    loanLines.forEach(line => {
      y = pdfMoneyRow(doc, y, line.type, line.amount)
    })
  } else {
    y = pdfMoneyRow(doc, y, 'Loan / Cash Advance', Number(deductionBreakdown?.loanOrCashAdvance || 0))
  }
  y = pdfMoneyRow(doc, y, 'Total Deductions', displayedDeductions, true)

  y += 8
  doc.setFillColor(236, 253, 245)
  doc.roundedRect(14, y, 182, 18, 2, 2, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(12)
  doc.setTextColor(4, 120, 87)
  doc.text('NET PAY', 20, y + 11)
  doc.text(money(displayedNet), 190, y + 11, { align: 'right' })
  doc.setTextColor(0, 0, 0)

  const filename = `payslip-${(employee.employeeId || employee.id || 'employee').replace(/[^a-z0-9-]+/gi, '-')}-${payslip.period.replace(/[^a-z0-9-]+/gi, '-')}.pdf`
  doc.save(filename)
}

function PayslipPreviewModal({ employee, payslip, loanRequests, onClose }: { employee: Employee; payslip: PayrollRecord; loanRequests: LoanRequest[]; onClose: () => void }) {
  const basicSalary = employee.basicSalary || Math.max(0, payslip.gross - (employee.allowances || 0))
  const regularAllowances = Math.max(0, payslip.gross - basicSalary - allowanceLinesTotal(payslip))
  const deductionBreakdown = payslip.deductionBreakdown
  const loanLines = payslipLoanDeductionLines(payslip, loanRequests)
  const visibleLoanTotal = loanLines.reduce((sum, line) => sum + Number(line.amount || 0), 0)
  const savedLoanTotal = Math.max(Number(deductionBreakdown?.loanOrCashAdvance || 0), payslip.loanDeductions?.reduce((sum, line) => sum + Number(line.amount || 0), 0) || 0)
  const missingLoanTotal = Math.max(0, visibleLoanTotal - savedLoanTotal)
  const displayedDeductions = Number(payslip.deductions || 0) + missingLoanTotal
  const displayedNet = Math.max(0, Number(payslip.net || 0) - missingLoanTotal)
  const statutoryFallback = !deductionBreakdown ? Math.max(0, Number(payslip.deductions || 0) - savedLoanTotal) : 0
  const downloadPayslipPdf = () => downloadEmployeePayslipPdf(employee, payslip, loanRequests)

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 140, background: 'rgba(15,23,42,0.52)', display: 'grid', placeItems: 'center', padding: 18 }}>
      <div style={{ width: 'min(1040px, 100%)', maxHeight: '90vh', overflow: 'auto', background: '#f8fafc', borderRadius: 16, boxShadow: '0 28px 90px rgba(15,23,42,0.28)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14, padding: '18px 22px', background: '#fff', borderBottom: '1px solid #e5e7eb' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <FileText size={20} color="#16a34a" />
              <h2 style={{ margin: 0, color: '#0f172a', fontSize: 20 }}>Payslip Preview</h2>
              <span style={{ borderRadius: 999, background: payslip.status === 'Paid' ? '#dcfce7' : '#fef3c7', color: payslip.status === 'Paid' ? '#15803d' : '#d97706', padding: '4px 10px', fontSize: 11, fontWeight: 900 }}>{payslip.status}</span>
            </div>
            <div style={{ marginTop: 5, color: '#64748b', fontSize: 13 }}>{payslip.period} - Pay date {formatDate(payslip.paidAt || payslip.createdAt)}</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button onClick={downloadPayslipPdf} style={{ border: '1px solid #bbf7d0', background: '#22c55e', color: '#fff', height: 36, borderRadius: 10, padding: '0 13px', display: 'inline-flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontWeight: 900, fontSize: 13 }}><Download size={16} /> Download PDF</button>
            <button onClick={onClose} aria-label="Close payslip preview" style={{ border: '1px solid #e5e7eb', background: '#fff', width: 36, height: 36, borderRadius: 10, display: 'grid', placeItems: 'center', cursor: 'pointer', color: '#334155' }}><X size={18} /></button>
          </div>
        </div>

        <div style={{ padding: 22, display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 310px', gap: 18 }}>
          <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 14, overflow: 'hidden' }}>
            <div style={{ padding: '16px 18px', borderBottom: '1px solid #eef2f7' }}>
              <strong style={{ display: 'block', color: '#0f172a', fontSize: 16 }}>Earnings</strong>
            </div>
            <div style={{ padding: 18 }}>
              <PayslipAmountLine label="Basic Salary" value={basicSalary} />
              <PayslipAmountLine label="Allowances" value={regularAllowances} />
              {payslip.allowanceLines?.map(line => (
                <PayslipAmountLine key={line.allowanceId} label={line.type.toLowerCase().includes('allowance') ? line.type : `${line.type} Allowance`} value={line.amount} />
              ))}
              <PayslipAmountLine label="Gross Earnings" value={payslip.gross} strong positive />

              <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid #eef2f7' }}>
                <strong style={{ display: 'block', color: '#0f172a', fontSize: 16, marginBottom: 8 }}>Deductions</strong>
                {deductionBreakdown ? (
                  <>
                    <PayslipAmountLine label="SSS" value={deductionBreakdown.sss} negative />
                    <PayslipAmountLine label="PhilHealth" value={deductionBreakdown.philHealth} negative />
                    <PayslipAmountLine label="Pag-IBIG" value={deductionBreakdown.pagIbig} negative />
                    <PayslipAmountLine label="Tax" value={deductionBreakdown.tax} negative />
                    {!loanLines.length && <PayslipAmountLine label="Loan / Cash Advance" value={Number(deductionBreakdown.loanOrCashAdvance || 0)} negative />}
                  </>
                ) : (
                  <PayslipAmountLine label="Payroll Deductions" value={statutoryFallback} negative />
                )}
                {loanLines.map(line => <PayslipAmountLine key={line.loanId} label={line.type} value={line.amount} negative />)}
                <PayslipAmountLine label="Total Deductions" value={displayedDeductions} strong negative />
              </div>

              <div style={{ marginTop: 16, display: 'flex', justifyContent: 'space-between', gap: 14, alignItems: 'center', border: '1px solid #bbf7d0', background: '#f0fdf4', borderRadius: 12, padding: '14px 16px' }}>
                <span style={{ color: '#15803d', fontSize: 15, fontWeight: 900 }}>NET PAY</span>
                <strong style={{ color: '#15803d', fontSize: 20 }}>{money(displayedNet)}</strong>
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gap: 14, alignContent: 'start' }}>
            <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 14, padding: 18 }}>
              <strong style={{ display: 'block', color: '#0f172a', fontSize: 16, marginBottom: 14 }}>Payslip Summary</strong>
              <PayslipFact label="Employee Name" value={fullName(employee)} />
              <PayslipFact label="Employee ID" value={employee.employeeId || employee.id} />
              <PayslipFact label="Department" value={employee.department || '-'} />
              <PayslipFact label="Designation" value={employee.jobTitle || '-'} />
              <PayslipFact label="Employment Type" value={employee.employeeType || '-'} />
              <PayslipFact label="Bank Name" value={employee.bankName || '-'} />
              <PayslipFact label="Account Number" value={employee.accountNumber ? maskAccount(employee.accountNumber) : '-'} />
            </div>
            <div style={{ display: 'flex', gap: 10, color: '#2563eb', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 12, padding: 14, fontSize: 13, lineHeight: 1.5 }}>
              <FileText size={17} style={{ flexShrink: 0, marginTop: 1 }} />
              <span>This payslip is generated from saved employee salary and payroll records.</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function PayslipFact({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 14, padding: '8px 0', borderBottom: '1px solid #f1f5f9' }}>
      <span style={{ color: '#64748b', fontSize: 12 }}>{label}</span>
      <strong style={{ color: '#0f172a', fontSize: 12, textAlign: 'right' }}>{value}</strong>
    </div>
  )
}

function pdfSectionTitle(doc: jsPDF, text: string, y: number) {
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(12)
  doc.setTextColor(15, 23, 42)
  doc.text(text, 14, y)
}

function pdfDetailRow(doc: jsPDF, y: number, label: string, value: string) {
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(100, 116, 139)
  doc.text(label, 14, y)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(15, 23, 42)
  doc.text(value || '-', 80, y)
  return y + 6
}

function pdfMoneyRow(doc: jsPDF, y: number, label: string, value: number, strong = false) {
  doc.setFontSize(10)
  doc.setFont('helvetica', strong ? 'bold' : 'normal')
  doc.setTextColor(15, 23, 42)
  doc.text(label, 20, y)
  doc.text(money(value), 190, y, { align: 'right' })
  return y + 6
}

function PayslipAmountLine({ label, value, strong = false, positive = false, negative = false }: { label: string; value: number; strong?: boolean; positive?: boolean; negative?: boolean }) {
  const color = positive ? '#15803d' : negative ? '#dc2626' : '#0f172a'
  const prefix = negative && value > 0 ? '- ' : ''
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 14, padding: '10px 0', borderBottom: '1px solid #f1f5f9' }}>
      <span style={{ color, fontSize: 13, fontWeight: strong ? 900 : 600 }}>{label}</span>
      <strong style={{ color, fontSize: 13 }}>{prefix}{money(value)}</strong>
    </div>
  )
}

function allowanceLinesTotal(payslip: PayrollRecord) {
  return payslip.allowanceLines?.reduce((sum, line) => sum + Number(line.amount || 0), 0) || 0
}

function payslipLoanDeductionLines(payslip: PayrollRecord, loanRequests: LoanRequest[]): LoanDeductionLine[] {
  if (payslip.loanDeductions?.length) return payslip.loanDeductions
  return loanRequests
    .filter(loan =>
      (loan.payrollRecordId === payslip.id || loan.lastDeductedPayrollPeriod === payslip.period) &&
      Number(loan.paidAmount || 0) > 0
    )
    .map(loan => ({
      loanId: loan.id,
      type: loanDisplayName(loan),
      amount: Math.min(loanScheduledDeduction(loan), Number(loan.paidAmount || 0), Number(loan.amount || 0)),
    }))
    .filter(line => line.amount > 0)
}

function loanPaymentProgress(loan: LoanRequest, payrollRecords: PayrollRecord[]) {
  const loanName = loanDisplayName(loan).trim().toLowerCase()
  const payrollLines = payrollRecords.flatMap(record =>
    (record.loanDeductions || [])
      .filter(line => line.loanId === loan.id || String(line.type || '').trim().toLowerCase() === loanName)
      .map(line => ({ amount: Number(line.amount || 0), period: record.period, createdAt: record.paidAt || record.createdAt })),
  )
  const payrollPaid = roundPayrollMoney(payrollLines.reduce((sum, line) => sum + line.amount, 0))
  const savedPaid = roundPayrollMoney(loanPaidAmount(loan))
  const paid = Math.min(Number(loan.amount || 0), Math.max(savedPaid, payrollPaid))
  const scheduled = loanScheduledDeduction(loan)
  const balance = Math.max(0, roundPayrollMoney(Number(loan.amount || 0) - paid))
  const payrollPaidTerms = payrollLines.filter(line => line.amount > 0).length
  const paidTerms = payrollPaidTerms || (scheduled > 0 ? Math.floor(paid / scheduled) : 0)
  const remainingTerms = scheduled > 0 ? Math.ceil(balance / scheduled) : Number(loan.repaymentMonths || 0)
  const lastPaidPeriod = payrollLines
    .filter(line => line.amount > 0)
    .sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')))[0]?.period
  return { paid, balance, scheduled, paidTerms, remainingTerms, lastPaidPeriod }
}

function maskAccount(value: string) {
  const clean = String(value).replace(/\s+/g, '')
  if (clean.length <= 4) return clean
  return `${'*'.repeat(Math.max(0, clean.length - 4))}${clean.slice(-4)}`
}
