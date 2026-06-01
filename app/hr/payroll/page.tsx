'use client'

import { useEffect, useMemo, useState } from 'react'
import type { ComponentType, MouseEvent, ReactNode } from 'react'
import {
  AlertTriangle, ArrowLeft, CalendarDays, CheckCircle2, ChevronRight, Download, Eye,
  FileText, Pencil, Plus, Search, Users, Wallet, X,
} from 'lucide-react'
import { loadLoanRequests, LoanRequest, loanScheduledDeduction, saveLoanRequests } from '../loan-requests/loanData'
import { allowanceRequestKey, AllowanceRequest, appendAuditLog, appendFinanceNotification, employeeExportName, loadStored as loadEnterpriseStored, numericExport, saveStored as saveEnterpriseStored } from '../enterpriseData'
import { resolvePayrollLoanDeduction } from './loanDeductionRules'
import {
  attendanceDeductionTotal,
  buildPayrollAttendanceSummary,
  formatAttendanceCount,
  paidAttendanceDays,
  type PayrollAttendanceRecord,
  type PayrollAttendanceSummary,
} from './attendanceRules'
import {
  clampDay,
  clampDelay,
  defaultPayrollSchedule,
  getPayrollPeriod,
  payrollRunDateInput,
  payrollScheduleKey,
  type PayrollFrequency,
  type PayrollScheduleSettings,
} from './payrollSchedule'
import {
  buildPhilippinePayrollBreakdown2026,
  deductionBreakdownTotal as deductionBreakdownTotalRule,
  payrollPeriodsPerMonth,
  roundPayrollMoney,
} from './taxRules'

type Employee = {
  id: string
  employeeId?: string
  firstName?: string
  middleName?: string
  lastName?: string
  photo?: string
  employeeType?: string
  employmentStatus?: string
  dateOfJoining?: string
  department?: string
  jobTitle?: string
  basicSalary?: number
  allowances?: number
  deductions?: number
  bankName?: string
  accountNumber?: string
}

type PayrollStatus = 'Paid' | 'Pending' | 'Processing' | 'Approved'

type DeductionBreakdown = {
  sss: number
  philHealth: number
  pagIbig: number
  tax: number
  loanOrCashAdvance?: number
}

type LoanDeductionLine = {
  loanId: string
  type: string
  amount: number
}

type PayrollAllowanceLine = {
  allowanceId: string
  type: string
  amount: number
  date?: string
  purpose?: string
}

type PayrollRecord = {
  id: string
  employeeId: string
  period: string
  gross: number
  deductions: number
  deductionBreakdown?: DeductionBreakdown
  allowanceLines?: PayrollAllowanceLine[]
  loanDeductions?: LoanDeductionLine[]
  attendanceSummary?: PayrollAttendanceSummary
  net: number
  status: PayrollStatus
  source?: 'payroll-run'
  paidAt?: string
  createdAt: string
}

type PayrollRow = PayrollRecord & {
  employee?: Employee
  employeeName: string
  employeeCode: string
  department: string
  jobTitle: string
  photo?: string
  basicSalary: number
  scheduledBasicSalary: number
  attendanceDeduction: number
  allowances: number
}

type CycleSummary = {
  id: string
  period: string
  count: number
  gross: number
  deductions: number
  net: number
  date?: string
  status: PayrollStatus
}

type PayrollItem = {
  id: string
  name: string
  type: string
  amount: number
  source: string
  employeeCount: number
  fieldName: string
}

type PayrollReport = {
  id: string
  name: string
  category: string
  description: string
  period: string
  generatedAt?: string
  gross: number
  deductions: number
  net: number
  employees: number
}

type PayrollView = 'cycles' | 'payslips' | 'components' | 'deductions' | 'thirteenth' | 'reports'
type DetailView =
  | null
  | { type: 'cycle'; id: string }
  | { type: 'payslip'; id: string }
  | { type: 'component'; id: string }
  | { type: 'deduction'; id: string }
  | { type: 'report'; id: string }

const font = "var(--font-body)"
const employeeKey = 'flowsys-hr-employees'
const attendanceKey = 'flowsys-hr-attendance'
const payrollKey = 'flowsys-hr-payroll-records'
const payrollReportsKey = 'flowsys-hr-payroll-reports'
const accountKey = 'flowsys-account'
const sessionKey = 'flowsys-auth-session'

type StoredAccount = {
  role?: string
}

function loadStored<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback
  try {
    const raw = window.localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

function saveStored<T>(key: string, value: T) {
  if (typeof window !== 'undefined') window.localStorage.setItem(key, JSON.stringify(value))
}

function readStoredAccount(value: string | null): StoredAccount {
  if (!value) return {}
  try {
    const parsed = JSON.parse(value)
    return parsed && typeof parsed === 'object' ? parsed as StoredAccount : {}
  } catch {
    return {}
  }
}

function currentAccountRole() {
  if (typeof window === 'undefined') return ''
  const storedSession = readStoredAccount(window.localStorage.getItem(sessionKey))
  const storedAccount = readStoredAccount(window.localStorage.getItem(accountKey))
  return String(({ ...storedSession, ...storedAccount }).role || '')
}

function canReleasePayroll(role: string) {
  return /\b(admin|owner|superuser|finance|accounting|payroll|treasury)\b/i.test(role)
}

function fullName(employee?: Employee) {
  return [employee?.firstName, employee?.middleName, employee?.lastName].filter(Boolean).join(' ').trim()
}

function isRealEmployee(employee?: Employee) {
  return Boolean(employee?.id && fullName(employee))
}

function cleanPayrollRecords(employees: Employee[], records: PayrollRecord[]) {
  const employeeIds = new Set(employees.filter(isRealEmployee).map(employee => employee.id))
  return records.filter(record => record.source === 'payroll-run' && employeeIds.has(record.employeeId))
}

function initials(name?: string) {
  return (name || 'HR').split(' ').filter(Boolean).map(part => part[0]).join('').slice(0, 2).toUpperCase() || 'HR'
}

function money(value: number) {
  return `PHP ${Number(value || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function periodRange(period: string) {
  if (period.includes(' - ') || /\w+ \d+-\d+, \d{4}/.test(period)) return period
  const parsed = new Date(`1 ${period}`)
  if (Number.isNaN(parsed.getTime())) return period
  const start = new Date(parsed.getFullYear(), parsed.getMonth(), 1)
  const end = new Date(parsed.getFullYear(), parsed.getMonth() + 1, 0)
  return `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
}

function formatDate(value?: string) {
  if (!value) return '-'
  return new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function badgeTone(status?: string) {
  if (status === 'Paid' || status === 'Active') return { bg: '#dcfce7', text: '#15803d' }
  if (status === 'Approved' || status === 'Generated') return { bg: '#dbeafe', text: '#1d4ed8' }
  if (status === 'Processing') return { bg: '#dbeafe', text: '#1d4ed8' }
  if (status === 'Pending') return { bg: '#fef3c7', text: '#d97706' }
  return { bg: '#f1f5f9', text: '#64748b' }
}

function roundPeso(value: number) {
  return roundPayrollMoney(value)
}

function deductionBreakdownTotal(breakdown: Partial<DeductionBreakdown>) {
  return deductionBreakdownTotalRule(breakdown)
}

function buildEmployeeDeductionBreakdown(periodBasicSalary: number, periodTaxableEarnings: number, periodNonTaxableAllowances: number, frequency: PayrollFrequency): DeductionBreakdown {
  return buildPhilippinePayrollBreakdown2026({
    monthlyBasicSalary: Number(periodBasicSalary || 0) * payrollPeriodsPerMonth(frequency),
    periodTaxableEarnings,
    periodNonTaxableAllowances,
    frequency,
  })
}

function buildDeductionBreakdown(total: number, existing?: Partial<DeductionBreakdown>): DeductionBreakdown {
  const savedTotal = roundPeso(Number(total || 0))
  if (savedTotal <= 0) return { sss: 0, philHealth: 0, pagIbig: 0, tax: 0, loanOrCashAdvance: 0 }

  const provided = {
    sss: roundPeso(Number(existing?.sss || 0)),
    philHealth: roundPeso(Number(existing?.philHealth || 0)),
    pagIbig: roundPeso(Number(existing?.pagIbig || 0)),
    tax: roundPeso(Number(existing?.tax || 0)),
    loanOrCashAdvance: roundPeso(Number(existing?.loanOrCashAdvance || 0)),
  }
  const providedTotal = roundPeso(provided.sss + provided.philHealth + provided.pagIbig + provided.tax + provided.loanOrCashAdvance)
  if (providedTotal > 0) {
    const difference = roundPeso(savedTotal - providedTotal)
    return { ...provided, tax: roundPeso(provided.tax + difference) }
  }

  const sss = roundPeso(savedTotal * 0.3)
  const philHealth = roundPeso(savedTotal * 0.22)
  const pagIbig = roundPeso(savedTotal * 0.1)
  const tax = roundPeso(savedTotal - sss - philHealth - pagIbig)
  return { sss, philHealth, pagIbig, tax, loanOrCashAdvance: 0 }
}

function recalculatePayrollTaxes(employees: Employee[], records: PayrollRecord[], frequency: PayrollFrequency, attendanceRecords: PayrollAttendanceRecord[] = []) {
  const byId = new Map(employees.filter(isRealEmployee).map(employee => [employee.id, employee]))
  return records.map(record => {
    const employee = byId.get(record.employeeId)
    if (!employee || record.source !== 'payroll-run') return record
    const attendanceSummary = record.attendanceSummary
      ? buildPayrollAttendanceSummary({
          attendanceRecords,
          employeeIds: [employee.id, employee.employeeId],
          periodStart: record.attendanceSummary.periodStart,
          periodEnd: record.attendanceSummary.periodEnd,
          basicSalary: Number(employee.basicSalary || 0),
        })
      : undefined
    const payrollAllowances = (record.allowanceLines || []).reduce((sum, line) => sum + Number(line.amount || 0), 0)
    const gross = attendanceSummary
      ? roundPeso(Number(attendanceSummary.earnedBasicPay || 0) + Number(employee.allowances || 0) + payrollAllowances)
      : Number(record.gross || 0)
    const loanOrCashAdvance = roundPeso(
      (record.loanDeductions || []).reduce((sum, line) => sum + Number(line.amount || 0), 0) ||
      Number(record.deductionBreakdown?.loanOrCashAdvance || 0),
    )
    const periodBasic = Number(attendanceSummary?.earnedBasicPay ?? employee.basicSalary ?? 0)
    const periodNonTaxableAllowances = Math.max(0, gross - periodBasic)
    const baseBreakdown = buildEmployeeDeductionBreakdown(periodBasic, periodBasic, periodNonTaxableAllowances, frequency)
    const baseTotal = deductionBreakdownTotal(baseBreakdown)
    const deductions = Math.min(roundPeso(baseTotal + loanOrCashAdvance), roundPeso(gross))
    return {
      ...record,
      gross,
      deductions,
      deductionBreakdown: { ...baseBreakdown, loanOrCashAdvance },
      attendanceSummary,
      net: roundPeso(gross - deductions),
    }
  })
}

function buildRows(employees: Employee[], records: PayrollRecord[]): PayrollRow[] {
  const byId = new Map(employees.filter(isRealEmployee).map(employee => [employee.id, employee]))
  return records.flatMap(record => {
    const employee = byId.get(record.employeeId)
    if (!isRealEmployee(employee)) return []
    const payrollAllowances = (record.allowanceLines || []).reduce((sum, line) => sum + Number(line.amount || 0), 0)
    const scheduledBasicSalary = Number(employee?.basicSalary || 0)
    const paidBasicSalary = Number(record.attendanceSummary?.earnedBasicPay ?? scheduledBasicSalary)
    return {
      ...record,
      employee,
      employeeName: fullName(employee) || '-',
      employeeCode: employee?.employeeId || employee?.id || record.employeeId,
      department: employee?.department || '-',
      jobTitle: employee?.jobTitle || '-',
      photo: employee?.photo,
      basicSalary: paidBasicSalary,
      scheduledBasicSalary,
      attendanceDeduction: attendanceDeductionTotal(record.attendanceSummary),
      allowances: Number(employee?.allowances || 0) + payrollAllowances,
    } satisfies PayrollRow
  })
}

function allowanceLinesForEmployee(employee: Employee, requests: AllowanceRequest[]): PayrollAllowanceLine[] {
  return requests
    .filter(request =>
      request.status === 'Finance Approved' &&
      !request.payrollPeriod &&
      (request.employeeId === employee.id || request.employeeCode === employee.employeeId),
    )
    .map(request => ({
      allowanceId: request.id,
      type: request.customType || request.type,
      amount: Number(request.amount || 0),
      date: request.date,
      purpose: request.purpose || request.reason,
    }))
}

function allowanceLineTotal(row: Pick<PayrollRecord, 'allowanceLines'>) {
  return (row.allowanceLines || []).reduce((sum, line) => sum + Number(line.amount || 0), 0)
}

function buildDeductionItemsFromRows(rows: PayrollRow[], fallbackSource = 'Saved payslip deduction breakdown'): PayrollItem[] {
  const loanTypeRows = rows.flatMap(row => (row.loanDeductions || []).map(line => ({ ...line, employeeId: row.employeeId })))
  const loanTypes = new Map<string, { amount: number; employees: Set<string> }>()
  loanTypeRows.forEach(line => {
    const key = line.type || 'Loan / Cash Advance'
    const current = loanTypes.get(key) || { amount: 0, employees: new Set<string>() }
    current.amount += Number(line.amount || 0)
    current.employees.add(line.employeeId)
    loanTypes.set(key, current)
  })
  const totals = rows.reduce((acc, row) => {
    const breakdown = buildDeductionBreakdown(row.deductions, row.deductionBreakdown)
    return {
      sss: acc.sss + breakdown.sss,
      philHealth: acc.philHealth + breakdown.philHealth,
      pagIbig: acc.pagIbig + breakdown.pagIbig,
      tax: acc.tax + breakdown.tax,
      loanOrCashAdvance: acc.loanOrCashAdvance + Number(breakdown.loanOrCashAdvance || 0),
    }
  }, { sss: 0, philHealth: 0, pagIbig: 0, tax: 0, loanOrCashAdvance: 0 })

  const counts = rows.reduce((acc, row) => {
    const breakdown = buildDeductionBreakdown(row.deductions, row.deductionBreakdown)
    return {
      sss: acc.sss + (breakdown.sss > 0 ? 1 : 0),
      philHealth: acc.philHealth + (breakdown.philHealth > 0 ? 1 : 0),
      pagIbig: acc.pagIbig + (breakdown.pagIbig > 0 ? 1 : 0),
      tax: acc.tax + (breakdown.tax > 0 ? 1 : 0),
      loanOrCashAdvance: acc.loanOrCashAdvance + (Number(breakdown.loanOrCashAdvance || 0) > 0 ? 1 : 0),
    }
  }, { sss: 0, philHealth: 0, pagIbig: 0, tax: 0, loanOrCashAdvance: 0 })

  const statutoryItems = [
    { id: 'sss', name: 'SSS', type: 'Statutory', amount: totals.sss, source: fallbackSource, employeeCount: counts.sss, fieldName: 'deductionBreakdown.sss' },
    { id: 'philHealth', name: 'PhilHealth', type: 'Statutory', amount: totals.philHealth, source: fallbackSource, employeeCount: counts.philHealth, fieldName: 'deductionBreakdown.philHealth' },
    { id: 'pagIbig', name: 'Pag-IBIG', type: 'Statutory', amount: totals.pagIbig, source: fallbackSource, employeeCount: counts.pagIbig, fieldName: 'deductionBreakdown.pagIbig' },
    { id: 'tax', name: 'Withholding Tax', type: 'Tax', amount: totals.tax, source: fallbackSource, employeeCount: counts.tax, fieldName: 'deductionBreakdown.tax' },
  ].filter(item => item.amount > 0)

  const loanItems = Array.from(loanTypes.entries()).map(([name, value]) => ({
    id: `loan_${name.toLowerCase().replace(/[^a-z0-9]+/g, '_')}`,
    name,
    type: 'Loan Deduction',
    amount: value.amount,
    source: 'Approved finance-controlled loan deductions',
    employeeCount: value.employees.size,
    fieldName: 'loanDeductions',
  })).filter(item => item.amount > 0)

  if (!loanItems.length && totals.loanOrCashAdvance > 0) {
    loanItems.push({ id: 'loanOrCashAdvance', name: 'Loan / Cash Advance', type: 'Loan Deduction', amount: totals.loanOrCashAdvance, source: 'Approved loan and cash advance requests', employeeCount: counts.loanOrCashAdvance, fieldName: 'deductionBreakdown.loanOrCashAdvance' })
  }

  return [...statutoryItems, ...loanItems]
}

function buildDeductionItemsFromEmployees(employees: Employee[], frequency: PayrollFrequency) {
  const rows = employees
    .filter(employee => Number(employee.basicSalary || 0) + Number(employee.allowances || 0) > 0)
    .map(employee => {
      const gross = Number(employee.basicSalary || 0) + Number(employee.allowances || 0)
      const periodBasic = Number(employee.basicSalary || 0)
      const periodAllowances = Number(employee.allowances || 0)
      const deductionBreakdown = buildEmployeeDeductionBreakdown(periodBasic, periodBasic, periodAllowances, frequency)
      const deductions = Math.min(deductionBreakdownTotal(deductionBreakdown), gross)
      return {
        id: `preview_${employee.id}`,
        employeeId: employee.id,
        period: 'Payroll preview',
        gross,
        deductions,
        deductionBreakdown,
        net: Math.max(0, gross - deductions),
        status: 'Pending' as PayrollStatus,
        source: 'payroll-run' as const,
        createdAt: new Date().toISOString(),
        employee,
        employeeName: fullName(employee) || '-',
        employeeCode: employee.employeeId || employee.id,
        department: employee.department || '-',
        jobTitle: employee.jobTitle || '-',
        photo: employee.photo,
        basicSalary: Number(employee.basicSalary || 0),
        scheduledBasicSalary: Number(employee.basicSalary || 0),
        attendanceDeduction: 0,
        allowances: Number(employee.allowances || 0),
      }
    })
  return buildDeductionItemsFromRows(rows, 'Employee profile deduction field')
}

function downloadCsv(filename: string, rows: string[][]) {
  const csv = rows.map(row => row.map(cell => {
    const value = String(cell)
    return /^-?\d+\.\d{2}$/.test(value) ? value : `"${value.replace(/"/g, '""')}"`
  }).join(',')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

function exportPayslips(rows: PayrollRow[], filename = 'employee-payslips.csv') {
  const loanTypes = Array.from(new Set(rows.flatMap(row => (row.loanDeductions || []).map(line => line.type))))
  const allowanceTypes = Array.from(new Set(rows.flatMap(row => (row.allowanceLines || []).map(line => line.type.toLowerCase().includes('allowance') ? line.type : `${line.type} Allowance`))))
  downloadCsv(filename, [
    ['Employee', 'Employee ID', 'Bank Account Number', 'Period', 'Pay Period', 'Scheduled Basic', 'Worked/Paid Days', 'Absent Days', 'Payable Days', 'Attendance Deduction', 'Basic Salary Earned', 'Allowances', ...allowanceTypes, 'Gross', 'SSS', 'PhilHealth', 'Pag-IBIG', ...loanTypes, 'Loan / Cash Advance Total', 'Tax', 'Deductions', 'Net', 'Status', 'Pay Date'],
    ...rows.map(row => {
      const breakdown = buildDeductionBreakdown(row.deductions, row.deductionBreakdown)
      const loanAmountByType = new Map((row.loanDeductions || []).map(line => [line.type, line.amount]))
      const allowanceAmountByType = new Map<string, number>()
      ;(row.allowanceLines || []).forEach(line => {
        const type = line.type.toLowerCase().includes('allowance') ? line.type : `${line.type} Allowance`
        allowanceAmountByType.set(type, (allowanceAmountByType.get(type) || 0) + Number(line.amount || 0))
      })
      return [
      employeeExportName(row.employee, row.employeeName),
      row.employeeCode,
      String(row.employee?.accountNumber || ''),
      row.period,
      periodRange(row.period),
      numericExport(row.scheduledBasicSalary),
      row.attendanceSummary ? formatAttendanceCount(paidAttendanceDays(row.attendanceSummary)) : '',
      row.attendanceSummary ? formatAttendanceCount(row.attendanceSummary.absentDays) : '',
      row.attendanceSummary ? formatAttendanceCount(row.attendanceSummary.payableDays) : '',
      numericExport(row.attendanceDeduction),
      numericExport(row.basicSalary),
      numericExport(row.allowances),
      ...allowanceTypes.map(type => numericExport(allowanceAmountByType.get(type) || 0)),
      numericExport(row.gross),
      numericExport(breakdown.sss),
      numericExport(breakdown.philHealth),
      numericExport(breakdown.pagIbig),
      ...loanTypes.map(type => numericExport(loanAmountByType.get(type) || 0)),
      numericExport(Number(breakdown.loanOrCashAdvance || 0)),
      numericExport(breakdown.tax),
      numericExport(row.deductions),
      numericExport(row.net),
      row.status,
      formatDate(row.paidAt || row.createdAt),
    ]}),
  ])
  appendAuditLog({ action: 'payroll.export', targetType: 'Payroll Export', targetId: filename, summary: `Exported ${rows.length} accounting-ready payslip rows without currency text.` })
}

export default function HrPayrollPage() {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [attendanceRecords, setAttendanceRecords] = useState<PayrollAttendanceRecord[]>([])
  const [records, setRecords] = useState<PayrollRecord[]>([])
  const [loanRequests, setLoanRequests] = useState<LoanRequest[]>([])
  const [allowanceRequests, setAllowanceRequests] = useState<AllowanceRequest[]>([])
  const [reports, setReports] = useState<PayrollReport[]>([])
  const [schedule, setSchedule] = useState<PayrollScheduleSettings>(defaultPayrollSchedule)
  const [showSchedule, setShowSchedule] = useState(false)
  const [showRunChecklist, setShowRunChecklist] = useState(false)
  const [view, setView] = useState<PayrollView>('cycles')
  const [query, setQuery] = useState('')
  const [detail, setDetail] = useState<DetailView>(null)
  const [notice, setNotice] = useState('')
  const [accountRole, setAccountRole] = useState('')

  useEffect(() => {
    const load = () => {
      const storedEmployees = loadStored<Employee[]>(employeeKey, [])
      const storedAttendance = loadStored<PayrollAttendanceRecord[]>(attendanceKey, [])
      const storedRecords = loadStored<PayrollRecord[]>(payrollKey, [])
      const storedSchedule = { ...defaultPayrollSchedule, ...loadStored<Partial<PayrollScheduleSettings>>(payrollScheduleKey, {}) }
      const cleanedRecords = cleanPayrollRecords(storedEmployees, storedRecords)
      const taxReadyRecords = recalculatePayrollTaxes(storedEmployees, cleanedRecords, storedSchedule.frequency, storedAttendance)
      setEmployees(storedEmployees)
      setAttendanceRecords(storedAttendance)
      setRecords(taxReadyRecords)
      setLoanRequests(loadLoanRequests())
      setAllowanceRequests(loadEnterpriseStored<AllowanceRequest[]>(allowanceRequestKey, []))
      setReports(loadStored<PayrollReport[]>(payrollReportsKey, []))
      if (JSON.stringify(taxReadyRecords) !== JSON.stringify(storedRecords)) saveStored(payrollKey, taxReadyRecords)
      setSchedule(storedSchedule)
      setAccountRole(currentAccountRole())
    }
    load()
    window.addEventListener('storage', load)
    return () => window.removeEventListener('storage', load)
  }, [])

  const activeEmployees = useMemo(
    () => employees.filter(employee => isRealEmployee(employee) && employee.employmentStatus !== 'Inactive' && employee.employmentStatus !== 'Resigned'),
    [employees],
  )

  const rows = useMemo(
    () => buildRows(employees, records).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [employees, records],
  )

  const currentRun = getPayrollPeriod(schedule)
  const periodNow = currentRun.label
  const latestPeriod = rows[0]?.period || periodNow
  const latestRows = rows.filter(row => row.period === latestPeriod)
  const canApproveOrReleasePayroll = canReleasePayroll(accountRole)
  const salaryReadyEmployees = useMemo(
    () => activeEmployees.filter(employee => Number(employee.basicSalary || 0) + Number(employee.allowances || 0) + allowanceLinesForEmployee(employee, allowanceRequests).reduce((sum, line) => sum + Number(line.amount || 0), 0) > 0),
    [activeEmployees, allowanceRequests],
  )
  const missingSalaryEmployees = useMemo(
    () => activeEmployees.filter(employee => Number(employee.basicSalary || 0) + Number(employee.allowances || 0) + allowanceLinesForEmployee(employee, allowanceRequests).reduce((sum, line) => sum + Number(line.amount || 0), 0) <= 0),
    [activeEmployees, allowanceRequests],
  )
  const currentPeriodRows = rows.filter(row => row.period === periodNow)
  const currentPeriodEmployeeIds = new Set(currentPeriodRows.map(row => row.employeeId))
  const employeesNeedingPayroll = salaryReadyEmployees.filter(employee => !currentPeriodEmployeeIds.has(employee.id))
  const pendingPayrollAllowanceRequests = useMemo(
    () => allowanceRequests.filter(request => request.status === 'Finance Approved' && !request.payrollPeriod),
    [allowanceRequests],
  )
  const approvedLoanRequests = useMemo(() => loanRequests.filter(request =>
    request.status === 'Approved' &&
    request.approvalStep === 'payroll' &&
    request.lastDeductedPayrollPeriod !== periodNow &&
    Number(request.paidAmount || 0) < Number(request.amount || 0)
  ), [loanRequests, periodNow])

  const filteredRows = rows.filter(row =>
    [row.employeeName, row.employeeCode, row.period, row.department, row.status]
      .some(value => String(value).toLowerCase().includes(query.trim().toLowerCase())),
  )

  const searchTerm = query.trim().toLowerCase()

  const cycleRows = useMemo<CycleSummary[]>(() => {
    const grouped = new Map<string, PayrollRow[]>()
    rows.forEach(row => grouped.set(row.period, [...(grouped.get(row.period) || []), row]))
    return Array.from(grouped.entries()).map(([period, items]) => {
      const gross = items.reduce((sum, row) => sum + row.gross, 0)
      const deductions = items.reduce((sum, row) => sum + row.deductions, 0)
      const net = items.reduce((sum, row) => sum + row.net, 0)
      const date = items.map(item => item.paidAt || item.createdAt).sort().at(-1)
      const status: PayrollStatus = items.every(item => item.status === 'Paid')
        ? 'Paid'
        : items.some(item => item.status === 'Pending')
          ? 'Pending'
          : items[0]?.status || 'Processing'
      return { id: period, period, count: items.length, gross, deductions, net, date, status }
    })
  }, [rows])

  const components = useMemo<PayrollItem[]>(() => {
    const basic = latestRows.length
      ? latestRows.reduce((sum, row) => sum + Number(row.basicSalary || 0), 0)
      : activeEmployees.reduce((sum, employee) => sum + Number(employee.basicSalary || 0), 0)
    const profileAllowances = latestRows.length
      ? latestRows.reduce((sum, row) => sum + Number(row.allowances || 0), 0)
      : activeEmployees.reduce((sum, employee) => sum + Number(employee.allowances || 0), 0)
    const approvedAllowances = pendingPayrollAllowanceRequests.reduce((sum, request) => sum + Number(request.amount || 0), 0)
    const includedAllowances = latestRows.reduce((sum, row) => sum + allowanceLineTotal(row), 0)
    return [
      { id: 'basicSalary', name: latestRows.length ? 'Basic Salary Earned' : 'Basic Salary', type: 'Earnings', amount: basic, source: latestRows.length ? 'Attendance-adjusted payroll records' : 'Employee basicSalary field', employeeCount: latestRows.length ? latestRows.filter(row => Number(row.basicSalary || 0) > 0).length : activeEmployees.filter(employee => Number(employee.basicSalary || 0) > 0).length, fieldName: 'basicSalary' },
      { id: 'allowances', name: 'Allowances', type: 'Earnings', amount: latestRows.length ? profileAllowances : profileAllowances + approvedAllowances + includedAllowances, source: latestRows.length ? 'Payroll allowance lines and employee allowance field' : 'Employee allowance field plus Finance-approved fuel and meal requests', employeeCount: latestRows.length ? latestRows.filter(row => Number(row.allowances || 0) > 0).length : activeEmployees.filter(employee => Number(employee.allowances || 0) > 0 || allowanceLinesForEmployee(employee, allowanceRequests).length > 0).length, fieldName: 'allowances + allowanceLines' },
    ].filter(item => item.amount > 0)
  }, [activeEmployees, allowanceRequests, latestRows, pendingPayrollAllowanceRequests])

  const deductions = useMemo<PayrollItem[]>(() => {
    const savedPayrollDeductions = buildDeductionItemsFromRows(rows)
    return savedPayrollDeductions.length ? savedPayrollDeductions : buildDeductionItemsFromEmployees(activeEmployees, schedule.frequency)
  }, [activeEmployees, rows, schedule.frequency])

  const filteredCycles = cycleRows.filter(cycle =>
    [cycle.period, cycle.status, cycle.count, cycle.net].some(value => String(value).toLowerCase().includes(searchTerm)),
  )
  const filteredComponents = components.filter(item =>
    [item.name, item.type, item.source, item.amount, item.employeeCount].some(value => String(value).toLowerCase().includes(searchTerm)),
  )
  const filteredDeductions = deductions.filter(item =>
    [item.name, item.type, item.source, item.amount, item.employeeCount].some(value => String(value).toLowerCase().includes(searchTerm)),
  )
  const filteredReports = reports.filter(report =>
    [report.name, report.category, report.description, report.period, report.net, report.employees].some(value => String(value).toLowerCase().includes(searchTerm)),
  )

  const totals = {
    net: latestRows.reduce((sum, row) => sum + row.net, 0),
    paid: latestRows.filter(row => row.status === 'Paid').length,
    pending: latestRows.filter(row => row.status === 'Pending').length,
    approved: latestRows.filter(row => row.status === 'Approved').length,
    needsAction: latestRows.filter(row => row.status !== 'Paid').length,
  }

  function runPayroll() {
    const existing = new Set(records.filter(record => record.period === periodNow).map(record => record.employeeId))
    const createdAt = new Date().toISOString()
    if (!activeEmployees.length) {
      setNotice('Add active employees before running payroll.')
      return
    }
    if (!salaryReadyEmployees.length) {
      setNotice('No employee has salary information yet. Add basic salary or allowances before running payroll.')
      return
    }
    const loanAllocations = new Map<string, number>()
    const financeRiskAlerts: Array<{ employeeName: string; employeeId: string; scheduled: number; applied: number; available: number }> = []
    const nextRecords = salaryReadyEmployees
      .filter(employee => !existing.has(employee.id))
      .map(employee => {
        const allowanceLines = allowanceLinesForEmployee(employee, allowanceRequests)
        const approvedAllowances = allowanceLines.reduce((sum, line) => sum + Number(line.amount || 0), 0)
        const attendanceSummary = buildPayrollAttendanceSummary({
          attendanceRecords,
          employeeIds: [employee.id, employee.employeeId],
          periodStart: currentRun.startDate,
          periodEnd: currentRun.endDate,
          basicSalary: Number(employee.basicSalary || 0),
        })
        const periodBasic = attendanceSummary.earnedBasicPay
        const periodAllowances = Number(employee.allowances || 0)
        const gross = periodBasic + periodAllowances
        const grossWithAllowances = gross + approvedAllowances
        const baseBreakdown = buildEmployeeDeductionBreakdown(periodBasic, periodBasic, periodAllowances + approvedAllowances, schedule.frequency)
        const profileDeduction = Math.min(deductionBreakdownTotal(baseBreakdown), grossWithAllowances)
        const employeeLoans = approvedLoanRequests
          .filter(request => request.employeeId === employee.id || request.employeeCode === employee.employeeId)
          .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
        let remainingLoanBudget = Math.max(0, grossWithAllowances - profileDeduction)
        const loanDeductions: LoanDeductionLine[] = []
        const loanDeduction = employeeLoans.reduce((sum, request) => {
          if (request.deductionPaused) return sum
          const deductionDecision = resolvePayrollLoanDeduction({
            loan: request,
            period: periodNow,
            scheduledAmount: loanScheduledDeduction(request),
            availablePay: remainingLoanBudget,
          })
          const scheduled = deductionDecision.scheduled
          const applied = deductionDecision.applied
          if (deductionDecision.requiresFinanceDecision || scheduled > applied) {
            financeRiskAlerts.push({
              employeeName: fullName(employee) || employee.employeeId || employee.id,
              employeeId: employee.employeeId || employee.id,
              scheduled,
              applied,
              available: Math.max(0, grossWithAllowances - profileDeduction),
            })
          }
          remainingLoanBudget = roundPeso(remainingLoanBudget - applied)
          if (applied > 0) {
            loanAllocations.set(request.id, roundPeso((loanAllocations.get(request.id) || 0) + applied))
            loanDeductions.push({
              loanId: request.id,
              type: request.customLoanType || request.requestType,
              amount: applied,
            })
          }
          return roundPeso(sum + applied)
        }, 0)
        const deductionValue = Math.min(profileDeduction + loanDeduction, grossWithAllowances)
        return {
          id: `payroll_${employee.id}_${createdAt}`,
          employeeId: employee.id,
          period: periodNow,
          gross: grossWithAllowances,
          deductions: deductionValue,
          deductionBreakdown: { ...baseBreakdown, loanOrCashAdvance: loanDeduction },
          allowanceLines,
          loanDeductions,
          attendanceSummary,
          net: Math.max(0, grossWithAllowances - deductionValue),
          status: 'Pending' as PayrollStatus,
          source: 'payroll-run' as const,
          createdAt,
        }
      })
    if (!nextRecords.length) {
      setNotice('Payroll is already created for every salary-ready employee in the current payroll period.')
      return
    }
    const next = [...nextRecords, ...records]
    setRecords(next)
    saveStored(payrollKey, next)
    if (loanAllocations.size) {
      const nextLoanRequests = loanRequests.map(request => {
        const paidThisRun = loanAllocations.get(request.id) || 0
        if (paidThisRun <= 0) return request
        const previousPaid = Number(request.paidAmount || 0)
        const paidAmount = roundPeso(previousPaid + paidThisRun)
        const fullyPaid = paidAmount >= Number(request.amount || 0)
        return {
          ...request,
          status: fullyPaid ? 'Processed' as const : 'Approved' as const,
          approvalStep: fullyPaid ? 'complete' as const : 'payroll' as const,
          processedAt: fullyPaid ? createdAt : request.processedAt,
          processedPayrollPeriod: fullyPaid ? periodNow : request.processedPayrollPeriod,
          paidAmount,
          lastDeductedPayrollPeriod: periodNow,
          updatedAt: createdAt,
        }
      })
      setLoanRequests(nextLoanRequests)
      saveLoanRequests(nextLoanRequests)
    }
    const generatedEmployeeIds = new Set(nextRecords.map(record => record.employeeId))
    const paidAllowanceIds = new Set(allowanceRequests.filter(request => generatedEmployeeIds.has(request.employeeId) && request.status === 'Finance Approved' && !request.payrollPeriod).map(request => request.id))
    if (paidAllowanceIds.size) {
      const nextAllowances = allowanceRequests.map(request => paidAllowanceIds.has(request.id) ? { ...request, status: 'Finance Approved' as const, payrollPeriod: periodNow, updatedAt: createdAt } : request)
      setAllowanceRequests(nextAllowances)
      saveEnterpriseStored(allowanceRequestKey, nextAllowances)
    }
    setNotice(`Created ${nextRecords.length} payslip${nextRecords.length === 1 ? '' : 's'} for ${periodNow}. Finance can review, approve, and release payment from Payroll Finance.`)
    appendAuditLog({ action: 'payroll.edit', targetType: 'Payroll Run', targetId: periodNow, summary: `Created ${nextRecords.length} payslips with finance-controlled deductions.` })
    financeRiskAlerts.forEach(alert => {
      appendFinanceNotification({
        subject: `Payroll deduction risk for ${alert.employeeName}`,
        message: `${alert.employeeName} had ${money(alert.scheduled)} scheduled loan deductions for ${periodNow}, but only ${money(alert.applied)} could be applied from ${money(alert.available)} available pay. Finance should review partial or skipped deductions.`,
        relatedType: 'Payroll Deduction Risk',
        relatedId: `payroll-risk-${periodNow}-${alert.employeeId}`,
        target: '/financials/loan-management',
      })
    })
  }

  function updateSchedule(patch: Partial<PayrollScheduleSettings>) {
    const next = { ...schedule, ...patch }
    setSchedule(next)
    saveStored(payrollScheduleKey, next)
  }

  function updateRecordStatus(row: PayrollRow, status: PayrollStatus, patch: Partial<PayrollRecord> = {}) {
    const next = records.map(record =>
      record.id === row.id ? { ...record, ...patch, status } : record,
    )
    setRecords(next)
    saveStored(payrollKey, next)
  }

  function approvePayslip(row: PayrollRow) {
    updateRecordStatus(row, 'Approved')
    setNotice(`${row.employeeName}'s payslip is approved and ready for release.`)
  }

  function markPaid(row: PayrollRow) {
    const paidAt = new Date().toISOString()
    updateRecordStatus(row, 'Paid', { paidAt })
    const allowanceIds = new Set((row.allowanceLines || []).map(line => line.allowanceId))
    if (allowanceIds.size) {
      const nextAllowances = allowanceRequests.map(request => allowanceIds.has(request.id) ? { ...request, status: 'Paid' as const, payrollPeriod: row.period, updatedAt: paidAt } : request)
      setAllowanceRequests(nextAllowances)
      saveEnterpriseStored(allowanceRequestKey, nextAllowances)
    }
    setNotice(`${row.employeeName}'s payslip has been marked paid.`)
  }

  function generateReport(cycle: CycleSummary) {
    const report: PayrollReport = {
      id: `report_${cycle.period.toLowerCase().replace(/[^a-z0-9]+/g, '_')}`,
      name: `${cycle.period} Payroll Summary`,
      category: 'Payroll Cycle',
      description: 'Generated from saved payroll records.',
      period: cycle.period,
      generatedAt: new Date().toISOString(),
      gross: cycle.gross,
      deductions: cycle.deductions,
      net: cycle.net,
      employees: cycle.count,
    }
    const next = [report, ...reports.filter(item => item.id !== report.id)]
    setReports(next)
    saveStored(payrollReportsKey, next)
    setView('reports')
    setNotice(`${report.name} is now available in Reports.`)
  }

  function exportVisible() {
    if (view === 'cycles') {
      downloadCsv('payroll-cycles.csv', [
        ['Payroll Cycle', 'Pay Period', 'Pay Date', 'Employees', 'Gross', 'Deductions', 'Net', 'Status'],
        ...filteredCycles.map(cycle => [cycle.period, periodRange(cycle.period), formatDate(cycle.date), String(cycle.count), numericExport(cycle.gross), numericExport(cycle.deductions), numericExport(cycle.net), cycle.status]),
      ])
      return
    }

    if (view === 'components' || view === 'deductions') {
      const items = view === 'components' ? filteredComponents : filteredDeductions
      downloadCsv(`payroll-${view}.csv`, [
        ['Name', 'Type', 'Employees', 'Source', 'Total Amount'],
        ...items.map(item => [item.name, item.type, String(item.employeeCount), item.source, numericExport(item.amount)]),
      ])
      return
    }

    if (view === 'reports') {
      downloadCsv('payroll-reports.csv', [
        ['Report Name', 'Category', 'Period', 'Employees', 'Gross', 'Deductions', 'Net', 'Generated On'],
        ...filteredReports.map(report => [report.name, report.category, report.period, String(report.employees), numericExport(report.gross), numericExport(report.deductions), numericExport(report.net), formatDate(report.generatedAt)]),
      ])
      return
    }

    exportPayslips(filteredRows, 'employee-payslips.csv')
  }

  function exportReport(report: PayrollReport) {
    exportPayslips(rows.filter(row => row.period === report.period), `${report.period.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-payroll-report.csv`)
  }

  if (detail) {
    return (
      <DetailContent
        detail={detail}
        rows={rows}
        cycleRows={cycleRows}
        components={components}
        deductions={deductions}
        reports={reports}
        onBack={() => setDetail(null)}
        onExport={exportVisible}
        onExportReport={exportReport}
        onGenerateReport={generateReport}
      />
    )
  }

  return (
    <div className="hr-module-page" style={payrollPageStyle}>
      <div style={payrollHeaderStyle}>
        <div>
          <h1 style={payrollTitleStyle}>Payroll</h1>
          <p style={pageSubtitleStyle}>Manage payroll cycles, employee payslips, salary fields, deductions, and reports.</p>
        </div>
        <div style={payrollHeaderActionsStyle}>
          <SearchBox value={query} onChange={setQuery} placeholder="Search employees, payroll, payslips..." />
          <button onClick={() => setShowSchedule(true)} style={secondaryButtonStyle}><CalendarDays size={15} /> Payroll Settings</button>
          <button onClick={() => setShowRunChecklist(true)} style={primaryButtonStyle}><Plus size={15} /> Run Payroll</button>
        </div>
      </div>

      <PayrollScheduleModal settings={schedule} currentRun={currentRun} open={showSchedule} onClose={() => setShowSchedule(false)} onChange={updateSchedule} />

      {showRunChecklist && (
        <PayrollReadinessPanel
          currentRun={currentRun}
          activeEmployees={activeEmployees.length}
          salaryReady={salaryReadyEmployees.length}
          missingSalary={missingSalaryEmployees.length}
          currentPayslips={currentPeriodRows.length}
          employeesNeedingPayroll={employeesNeedingPayroll.length}
          onRunPayroll={runPayroll}
        />
      )}

      {notice && (
        <div style={noticeStyle}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}><AlertTriangle size={15} /> {notice}</span>
          <button onClick={() => setNotice('')} style={{ ...iconButtonStyle, width: 28, height: 28 }} aria-label="Dismiss payroll notice"><X size={14} /></button>
        </div>
      )}

      <div style={metricGridStyle}>
        <Metric icon={Wallet} label="Total Payroll" value={money(totals.net)} sub={`${latestPeriod} · ${latestRows.length ? `${latestRows.length} payslip${latestRows.length === 1 ? '' : 's'}` : 'No payroll records'}`} color="#16a34a" bg="#dcfce7" />
        <Metric icon={Users} label="Employees Paid" value={totals.paid} sub="Paid records" color="#2563eb" bg="#dbeafe" />
        <Metric icon={CalendarDays} label="Current Payroll" value={periodNow} sub={`Run: ${formatDate(`${currentRun.runDate}T00:00:00`)} · Pay: ${formatDate(currentRun.payDate.toISOString())}`} color="#d97706" bg="#fef3c7" />
        <Metric icon={FileText} label="Needs Review / Release" value={totals.needsAction} sub={`${totals.pending} pending, ${totals.approved} approved`} color="#7c3aed" bg="#ede9fe" />
      </div>

      <div style={workspaceSurfaceStyle}>
        <div style={tabsStyle}>
          {[
            ['cycles', 'Payroll Cycles'],
            ['payslips', 'Employee Payslips'],
            ['components', 'Salary Components'],
            ['deductions', 'Deductions'],
            ['thirteenth', '13th Month'],
            ['reports', 'Reports'],
          ].map(([key, label]) => (
            <button key={key} onClick={() => setView(key as PayrollView)} style={tabStyle(view === key)}>{label}</button>
          ))}
        </div>

        <div style={tabContentStyle}>
          {view === 'cycles' && <CyclesTable cycles={filteredCycles} onOpen={id => setDetail({ type: 'cycle', id })} onGenerateReport={generateReport} />}
          {view === 'payslips' && <PayslipsTable rows={filteredRows} onOpen={id => setDetail({ type: 'payslip', id })} onApprove={canApproveOrReleasePayroll ? approvePayslip : undefined} onPaid={canApproveOrReleasePayroll ? markPaid : undefined} />}
          {view === 'components' && <ItemsTable title="Salary Components" subtitle="Generated from employee salary fields." items={filteredComponents} empty="No salary component data yet. Add employee salary or allowance amounts first." onOpen={id => setDetail({ type: 'component', id })} />}
          {view === 'deductions' && <ItemsTable title="Deductions" subtitle="Generated from employee deduction fields." items={filteredDeductions} empty="No deduction data yet. Add deduction amounts on employee profiles first." onOpen={id => setDetail({ type: 'deduction', id })} />}
          {view === 'thirteenth' && <ThirteenthMonthTable employees={salaryReadyEmployees} />}
          {view === 'reports' && <ReportsTable reports={filteredReports} onOpen={id => setDetail({ type: 'report', id })} onExport={exportVisible} onExportReport={exportReport} />}
        </div>
      </div>
    </div>
  )
}

function DetailContent({ detail, rows, cycleRows, components, deductions, reports, onBack, onExport, onExportReport, onGenerateReport }: {
  detail: NonNullable<DetailView>
  rows: PayrollRow[]
  cycleRows: CycleSummary[]
  components: PayrollItem[]
  deductions: PayrollItem[]
  reports: PayrollReport[]
  onBack: () => void
  onExport: () => void
  onExportReport: (report: PayrollReport) => void
  onGenerateReport: (cycle: CycleSummary) => void
}) {
  const row = detail.type === 'payslip' ? rows.find(item => item.id === detail.id) : undefined
  const cycle = detail.type === 'cycle' ? cycleRows.find(item => item.id === detail.id) : undefined
  const item = detail.type === 'component' ? components.find(component => component.id === detail.id) : detail.type === 'deduction' ? deductions.find(deduction => deduction.id === detail.id) : undefined
  const report = detail.type === 'report' ? reports.find(entry => entry.id === detail.id) : undefined

  return (
    <div className="hr-module-page" style={{ fontFamily: font }}>
      <div style={pageHeaderStyle}>
        <div>
          <h1 style={pageTitleStyle}>{detailTitle(detail.type)}</h1>
          <p style={pageSubtitleStyle}>{detailSubtitle(detail.type)}</p>
        </div>
        <div style={toolbarStyle}>
          <button onClick={onBack} style={secondaryButtonStyle}><ArrowLeft size={15} /> {detail.type === 'cycle' ? 'Back to Payroll Cycles' : 'Back to Payroll'}</button>
          {detail.type === 'cycle' && <button onClick={onExport} style={secondaryButtonStyle}><Download size={15} /> Download Payslips</button>}
          <button onClick={onExport} style={primaryButtonStyle}><Download size={15} /> Export</button>
        </div>
      </div>

      {row && <PayslipDetail row={row} history={rows.filter(item => item.employeeId === row.employeeId)} onExport={onExport} />}
      {cycle && <CycleDetail cycle={cycle} rows={rows.filter(item => item.period === cycle.period)} onGenerateReport={onGenerateReport} />}
      {item && <ItemDetail item={item} kind={detail.type} />}
      {report && <ReportDetail report={report} rows={rows} cycleRows={cycleRows} onExport={() => onExportReport(report)} />}
      {!row && !cycle && !item && !report && <div style={cardStyle}>No matching payroll data found.</div>}
    </div>
  )
}

function detailTitle(type: NonNullable<DetailView>['type']) {
  if (type === 'payslip') return 'Payslip'
  if (type === 'cycle') return 'Payroll Details'
  if (type === 'component') return 'Salary Component'
  if (type === 'deduction') return 'Deduction'
  return 'Report'
}

function detailSubtitle(type: NonNullable<DetailView>['type']) {
  if (type === 'cycle') return 'View payroll cycle summary and breakdown.'
  if (type === 'payslip') return 'View and download employee payslip details.'
  return 'Generated from saved payroll and employee data.'
}

function PayslipDetail({ row, history, onExport }: { row: PayrollRow; history: PayrollRow[]; onExport: () => void }) {
  const [activeTab, setActiveTab] = useState<'details' | 'history'>('details')
  const totalGross = history.reduce((sum, item) => sum + item.gross, 0)
  const totalDeductions = history.reduce((sum, item) => sum + item.deductions, 0)
  const totalNet = history.reduce((sum, item) => sum + item.net, 0)
  const deductionBreakdown = buildDeductionBreakdown(row.deductions, row.deductionBreakdown)

  return (
    <div style={{ display: 'grid', gap: 18 }}>
      <HeaderCard row={row} />

      <div style={tabsStyle}>
        <button onClick={() => setActiveTab('details')} style={tabStyle(activeTab === 'details')}>Payslip Details</button>
        <button onClick={() => setActiveTab('history')} style={tabStyle(activeTab === 'history')}>Payment History</button>
      </div>

      {activeTab === 'details' && (
        <div style={detailGridStyle}>
          <div style={{ ...cardStyle, padding: 0 }}>
            <div style={sectionHeaderStyle}>Earnings</div>
            <div style={{ padding: 18 }}>
              {row.attendanceSummary && <AmountLine label="Scheduled Basic Salary" value={row.scheduledBasicSalary} />}
              {row.attendanceDeduction > 0 && <AmountLine label="Attendance Deduction" value={row.attendanceDeduction} negative />}
              <AmountLine label={row.attendanceSummary ? 'Basic Salary Earned' : 'Basic Salary'} value={row.basicSalary} />
              <AmountLine label="Regular Allowances" value={Math.max(0, row.allowances - allowanceLineTotal(row))} />
              {row.allowanceLines?.map(line => (
                <AmountLine key={line.allowanceId} label={line.type.toLowerCase().includes('allowance') ? line.type : `${line.type} Allowance`} value={line.amount} />
              ))}
              <AmountLine label="Gross Earnings" value={row.gross} strong positive />
              <div style={{ height: 14 }} />
              <SectionTitle title="Deductions" />
              <AmountLine label="SSS" value={deductionBreakdown.sss} negative />
              <AmountLine label="PhilHealth" value={deductionBreakdown.philHealth} negative />
              <AmountLine label="Pag-IBIG" value={deductionBreakdown.pagIbig} negative />
              {row.loanDeductions?.length
                ? row.loanDeductions.map(line => <AmountLine key={line.loanId} label={line.type} value={line.amount} negative />)
                : <AmountLine label="Loan / Cash Advance" value={Number(deductionBreakdown.loanOrCashAdvance || 0)} negative />}
              <AmountLine label="Tax" value={deductionBreakdown.tax} negative />
              <AmountLine label="Total Deductions" value={row.deductions} strong negative />
              <div style={netPayBannerStyle}>
                <span>NET PAY</span>
                <strong>{money(row.net)}</strong>
              </div>
            </div>
          </div>
          <div style={{ display: 'grid', gap: 18, alignContent: 'start' }}>
            <div style={cardStyle}>
              <SectionTitle title="Payslip Summary" />
              <Fact label="Employee Name" value={row.employeeName} />
              <Fact label="Employee ID" value={row.employeeCode} />
              <Fact label="Department" value={row.department} />
              <Fact label="Designation" value={row.jobTitle} />
              {row.attendanceSummary && <Fact label="Worked/Paid Days" value={formatAttendanceCount(paidAttendanceDays(row.attendanceSummary))} />}
              {row.attendanceSummary && <Fact label="Absent Days" value={formatAttendanceCount(row.attendanceSummary.absentDays)} />}
              {row.attendanceSummary && <Fact label="Payable Days" value={`${formatAttendanceCount(paidAttendanceDays(row.attendanceSummary))} / ${formatAttendanceCount(row.attendanceSummary.payableDays)}`} />}
              {row.attendanceSummary && row.attendanceSummary.unrecordedDays > 0 && <Fact label="Unrecorded Days" value={formatAttendanceCount(row.attendanceSummary.unrecordedDays)} />}
              <Fact label="Employment Type" value={row.employee?.employeeType || '-'} />
              <Fact label="Bank Name" value={row.employee?.bankName || '-'} />
              <Fact label="Account Number" value={row.employee?.accountNumber ? mask(row.employee.accountNumber) : '-'} />
            </div>
            <div style={infoNoteStyle}>
              <FileText size={17} />
              <span>This payslip is generated from saved employee salary, attendance, and payroll records.</span>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'history' && (
        <div style={{ display: 'grid', gap: 18 }}>
          <div style={metricGridStyle}>
            <Metric icon={Wallet} label="Gross Earnings" value={money(totalGross)} sub={`${history.length} saved payslip${history.length === 1 ? '' : 's'}`} color="#16a34a" bg="#dcfce7" />
            <Metric icon={FileText} label="Total Deductions" value={money(totalDeductions)} sub="Across payment history" color="#dc2626" bg="#fee2e2" />
            <Metric icon={Wallet} label="Net Pay" value={money(totalNet)} sub="Across payment history" color="#16a34a" bg="#dcfce7" />
            <Metric icon={CalendarDays} label="Latest Pay Date" value={formatDate(history[0]?.paidAt || history[0]?.createdAt)} sub="Most recent record" color="#2563eb" bg="#dbeafe" />
          </div>
          <div style={{ ...cardStyle, padding: 0 }}>
            <div style={tableHeaderStyle}>
              <div>
                <strong style={{ display: 'block', color: '#0f172a', fontSize: 16 }}>Payment History</strong>
                <span style={{ display: 'block', color: '#64748b', fontSize: 13, marginTop: 4 }}>All saved payslips for this employee.</span>
              </div>
              <button onClick={onExport} style={secondaryButtonStyle}><Download size={15} /> Download</button>
            </div>
            <PayslipsTable rows={history} showControls={false} />
          </div>
        </div>
      )}
    </div>
  )
}

function CycleDetail({ cycle, rows, onGenerateReport }: { cycle: CycleSummary; rows: PayrollRow[]; onGenerateReport: (cycle: CycleSummary) => void }) {
  const [activeTab, setActiveTab] = useState<'overview' | 'payslips' | 'components' | 'deductions' | 'reports'>('overview')
  const [selectedPayslipId, setSelectedPayslipId] = useState<string | null>(null)
  const selectedPayslip = rows.find(row => row.id === selectedPayslipId)
  const firstCreated = rows.map(row => row.createdAt).sort()[0]
  const lastPaid = rows.map(row => row.paidAt).filter(Boolean).sort().at(-1)
  const scheduledBasicSalary = rows.reduce((sum, row) => sum + row.scheduledBasicSalary, 0)
  const basicSalary = rows.reduce((sum, row) => sum + row.basicSalary, 0)
  const allowances = rows.reduce((sum, row) => sum + row.allowances, 0)
  const attendanceDeduction = rows.reduce((sum, row) => sum + row.attendanceDeduction, 0)
  const paidDays = rows.reduce((sum, row) => sum + paidAttendanceDays(row.attendanceSummary), 0)
  const absentDays = rows.reduce((sum, row) => sum + Number(row.attendanceSummary?.absentDays || 0), 0)
  const unrecordedDays = rows.reduce((sum, row) => sum + Number(row.attendanceSummary?.unrecordedDays || 0), 0)
  const otherEarnings = Math.max(0, cycle.gross - basicSalary - allowances)
  const paidCount = rows.filter(row => row.status === 'Paid').length
  const pendingCount = rows.filter(row => row.status === 'Pending').length
  const approvedCount = rows.filter(row => row.status === 'Approved' || row.status === 'Paid').length
  const statusSteps = [
    { label: 'Payroll Created', value: firstCreated ? formatDate(firstCreated) : '-', done: rows.length > 0 },
    { label: 'Submitted for Approval', value: pendingCount || approvedCount ? `${pendingCount} pending` : '-', done: pendingCount > 0 || approvedCount > 0 },
    { label: 'Approved', value: approvedCount ? `${approvedCount} approved` : '-', done: approvedCount > 0 },
    { label: 'Released / Paid', value: paidCount === rows.length && rows.length ? formatDate(lastPaid) : `${paidCount}/${rows.length} paid`, done: paidCount === rows.length && rows.length > 0 },
  ]
  const cycleComponents = [
    { id: 'basicSalary', name: 'Basic Salary Earned', type: 'Earnings', amount: basicSalary, source: 'Attendance-adjusted payroll records', employeeCount: rows.filter(row => row.basicSalary > 0).length, fieldName: 'basicSalary' },
    { id: 'allowances', name: 'Allowances', type: 'Earnings', amount: allowances, source: 'Employee allowances field', employeeCount: rows.filter(row => row.allowances > 0).length, fieldName: 'allowances' },
  ].filter(item => item.amount > 0)
  const cycleDeductions = buildDeductionItemsFromRows(rows)
  const cycleReports: PayrollReport[] = []
  const exportCyclePayslips = () => exportPayslips(rows, `${cycle.period.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-payslips.csv`)
  const exportSelectedPayslip = (row: PayrollRow) => exportPayslips([row], `${row.employeeCode.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${row.period.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-payslip.csv`)
  const exportCycleSummary = () => downloadCsv(`${cycle.period.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-summary.csv`, [
    ['Payroll Cycle', 'Pay Period', 'Employees', 'Gross', 'Deductions', 'Net', 'Status'],
    [cycle.period, periodRange(cycle.period), String(cycle.count), numericExport(cycle.gross), numericExport(cycle.deductions), numericExport(cycle.net), cycle.status],
  ])

  return (
    <div style={{ display: 'grid', gap: 18 }}>
      <div style={cycleHeroStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <span style={cycleIconStyle}><CalendarDays size={24} color="#16a34a" /></span>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <h2 style={{ margin: 0, fontSize: 18, color: '#0f172a' }}>{cycle.period} Payroll</h2>
              <Badge value={cycle.status} />
            </div>
            <Fact label="Pay Period" value={periodRange(cycle.period)} />
            <Fact label="Pay Date" value={formatDate(cycle.date)} />
          </div>
        </div>
        <div style={cycleMetricsStyle}>
          <CycleMetric icon={Users} label="Total Employees" value={String(cycle.count)} sub="Active payslips" color="#16a34a" bg="#dcfce7" />
          <CycleMetric icon={Wallet} label="Gross Payroll" value={money(cycle.gross)} color="#16a34a" bg="#dcfce7" />
          <CycleMetric icon={FileText} label="Total Deductions" value={money(cycle.deductions)} color="#dc2626" bg="#fee2e2" />
          <CycleMetric icon={Wallet} label="Net Payroll" value={money(cycle.net)} color="#16a34a" bg="#dcfce7" />
        </div>
      </div>

      <div style={tabsStyle}>
        {[
          ['overview', 'Overview'],
          ['payslips', 'Employee Payslips'],
          ['components', 'Salary Components'],
          ['deductions', 'Deductions Summary'],
          ['reports', 'Reports'],
        ].map(([key, label]) => (
          <button key={key} onClick={() => setActiveTab(key as typeof activeTab)} style={tabStyle(activeTab === key)}>{label}</button>
        ))}
      </div>

      {activeTab === 'overview' && <div style={detailGridStyle}>
        <div style={{ display: 'grid', gap: 18 }}>
          <div style={{ ...cardStyle, padding: 0 }}>
            <div style={sectionHeaderStyle}>Payroll Summary</div>
            <div style={payrollSummaryGridStyle}>
              <div>
                <SectionTitle title="Earnings" />
                {attendanceDeduction > 0 && <AmountLine label="Scheduled Basic Salary" value={scheduledBasicSalary} />}
                {attendanceDeduction > 0 && <AmountLine label="Attendance Deduction" value={attendanceDeduction} negative />}
                <AmountLine label={attendanceDeduction > 0 ? 'Basic Salary Earned' : 'Basic Salary'} value={basicSalary} />
                <AmountLine label="Allowances" value={allowances} />
                {otherEarnings > 0 && <AmountLine label="Other Earnings" value={otherEarnings} />}
                <AmountLine label="Total Earnings" value={cycle.gross} strong positive />
              </div>
              <div>
                <SectionTitle title="Deductions" />
                <AmountLine label="SSS" value={cycleDeductions.find(item => item.id === 'sss')?.amount || 0} negative />
                <AmountLine label="PhilHealth" value={cycleDeductions.find(item => item.id === 'philHealth')?.amount || 0} negative />
                <AmountLine label="Pag-IBIG" value={cycleDeductions.find(item => item.id === 'pagIbig')?.amount || 0} negative />
                {cycleDeductions.filter(item => item.type === 'Loan Deduction').map(item => <AmountLine key={item.id} label={item.name} value={item.amount} negative />)}
                <AmountLine label="Tax" value={cycleDeductions.find(item => item.id === 'tax')?.amount || 0} negative />
                <AmountLine label="Total Deductions" value={cycle.deductions} strong negative />
              </div>
            </div>
            <div style={netPayBannerStyle}>
              <span>NET PAY (TOTAL)</span>
              <strong>{money(cycle.net)}</strong>
            </div>
          </div>

          <div style={cardStyle}>
            <SectionTitle title="Payroll Notes" />
            <p style={{ margin: 0, color: '#64748b', fontSize: 13 }}>Notes are not stored for this payroll cycle yet.</p>
            {(paidDays > 0 || absentDays > 0 || unrecordedDays > 0) && <p style={{ margin: '8px 0 0', color: '#64748b', fontSize: 13 }}>Attendance basis: {formatAttendanceCount(paidDays)} worked/paid day{paidDays === 1 ? '' : 's'}, {formatAttendanceCount(absentDays)} absent day{absentDays === 1 ? '' : 's'}, and {formatAttendanceCount(unrecordedDays)} unrecorded unpaid day{unrecordedDays === 1 ? '' : 's'}.</p>}
          </div>
        </div>

        <div style={{ display: 'grid', gap: 18, alignContent: 'start' }}>
          <div style={cardStyle}>
            <SectionTitle title="Payroll Status" />
            <div style={{ display: 'grid', gap: 0 }}>
              {statusSteps.map((step, index) => (
                <div key={step.label} style={timelineStepStyle}>
                  <span style={timelineDotStyle(step.done)}>{step.done ? <CheckCircle2 size={15} /> : index + 1}</span>
                  <span>
                    <strong style={{ display: 'block', color: '#0f172a', fontSize: 13 }}>{step.label}</strong>
                    <small style={{ display: 'block', color: '#64748b', marginTop: 4 }}>{step.value}</small>
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div style={{ ...cardStyle, padding: 0 }}>
            <div style={sectionHeaderStyle}>Quick Actions</div>
            <QuickAction label="Export employee payslips" icon={Eye} onClick={exportCyclePayslips} />
            <QuickAction label="Export payroll summary" icon={FileText} onClick={exportCycleSummary} />
            <QuickAction label="Generate payroll report" icon={FileText} onClick={() => onGenerateReport(cycle)} />
            <QuickAction label="Export bank transfer data" icon={Wallet} onClick={exportCyclePayslips} />
            <QuickAction label="Export deductions report" icon={FileText} onClick={exportCycleSummary} />
          </div>
        </div>
      </div>}

      {activeTab === 'payslips' && <PayslipsTable rows={rows} onOpen={setSelectedPayslipId} />}
      {activeTab === 'components' && <ItemsTable title="Salary Components" subtitle="Generated from payslips in this cycle." items={cycleComponents} empty="No salary components in this cycle." />}
      {activeTab === 'deductions' && <ItemsTable title="Deductions" subtitle="Generated from payslips in this cycle." items={cycleDeductions} empty="No deductions in this cycle." />}
      {activeTab === 'reports' && <ReportsTable reports={cycleReports} onExport={exportCycleSummary} onExportReport={() => exportCycleSummary()} />}
      {selectedPayslip && (
        <PayslipDetailModal
          row={selectedPayslip}
          history={rows.filter(item => item.employeeId === selectedPayslip.employeeId)}
          onClose={() => setSelectedPayslipId(null)}
          onExport={() => exportSelectedPayslip(selectedPayslip)}
        />
      )}
    </div>
  )
}

function ItemDetail({ item, kind }: { item: PayrollItem; kind: NonNullable<DetailView>['type'] }) {
  const [activeTab, setActiveTab] = useState<'details' | 'applicability'>('details')
  const isDeduction = kind === 'deduction'
  return (
    <div style={{ display: 'grid', gap: 18 }}>
      <div style={componentHeroStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <span style={cycleIconStyle}><Wallet size={24} color="#16a34a" /></span>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <h2 style={{ margin: 0, fontSize: 18, color: '#0f172a' }}>{item.name}</h2>
              <Badge value="Active" />
            </div>
            <div style={mutedLineStyle}>{item.type} - {isDeduction ? 'Deduction field' : 'Salary component field'}</div>
            <div style={mutedLineStyle}>{item.source}</div>
          </div>
        </div>
        <div style={componentHeroFactsStyle}>
          <Fact label="Component Code" value={item.fieldName} />
          <Fact label="Employees with value" value={String(item.employeeCount)} />
          <Fact label="Currency" value="PHP" />
        </div>
      </div>

      <div style={tabsStyle}>
        <button onClick={() => setActiveTab('details')} style={tabStyle(activeTab === 'details')}>{isDeduction ? 'Deduction Details' : 'Component Details'}</button>
        <button onClick={() => setActiveTab('applicability')} style={tabStyle(activeTab === 'applicability')}>Applicability</button>
      </div>

      {activeTab === 'details' && <div style={detailGridStyle}>
        <div style={{ display: 'grid', gap: 18 }}>
          <div style={cardStyle}>
            <SectionTitle title={isDeduction ? 'Deduction Information' : 'Component Information'} />
            <Fact label={isDeduction ? 'Deduction Type' : 'Component Type'} value={item.type} />
            <Fact label="Category" value={isDeduction ? 'Deductions' : 'Earnings'} />
            <Fact label="Source" value={item.source} />
            <Fact label="Total Amount" value={money(item.amount)} />
            <Fact label="Employees with value" value={String(item.employeeCount)} />
            <Fact label="Currency" value="PHP" />
            <Fact label="Status" value="Active" />
          </div>

          <div style={cardStyle}>
            <SectionTitle title="Notes" />
            <p style={{ margin: 0, color: '#64748b', fontSize: 13 }}>
              This record is derived from saved employee profile salary fields. No separate salary component table is used.
            </p>
          </div>
        </div>

        <div style={{ display: 'grid', gap: 18, alignContent: 'start' }}>
          <div style={cardStyle}>
            <SectionTitle title="Calculation & Setup" />
            <Fact label="Calculation Method" value="Saved employee field total" />
            <Fact label="Amount Source" value="Employee profile" />
            <Fact label="Included in Gross Earnings" value={isDeduction ? 'No' : 'Yes'} />
            <Fact label="Included in Net Pay" value="Yes" />
            <Fact label="Display in Payslip" value="Yes" />
            <Fact label="Rounding" value="Nearest Peso" />
          </div>

          <div style={cardStyle}>
            <SectionTitle title="Applicability Summary" />
            <Fact label="Applies To" value={item.employeeCount ? `${item.employeeCount} employee${item.employeeCount === 1 ? '' : 's'}` : '-'} />
            <Fact label="Employee Groups" value="-" />
            <Fact label="Employment Types" value="-" />
            <Fact label="Departments" value="-" />
          </div>
        </div>
      </div>}

      {activeTab === 'applicability' && <div style={cardStyle}>
        <SectionTitle title="Applicability Summary" />
        <Fact label="Applies To" value={item.employeeCount ? `${item.employeeCount} employee${item.employeeCount === 1 ? '' : 's'}` : '-'} />
        <Fact label="Source" value={item.source} />
        <Fact label="Employment Types" value="Uses saved employee profiles" />
        <Fact label="Departments" value="Calculated from every employee with a saved value" />
      </div>}

      <div style={cardStyle}>
        <SectionTitle title="Audit Trail" />
        <p style={{ margin: 0, color: '#64748b', fontSize: 13 }}>No audit trail saved for this component.</p>
      </div>
    </div>
  )
}

function PayslipDetailModal({ row, history, onClose, onExport }: { row: PayrollRow; history: PayrollRow[]; onClose: () => void; onExport: () => void }) {
  return (
    <div style={modalOverlayStyle} role="dialog" aria-modal="true" aria-label={`${row.employeeName} payslip details`} onClick={onClose}>
      <div style={payslipModalCardStyle} onClick={event => event.stopPropagation()}>
        <div style={modalHeaderStyle}>
          <div>
            <h2 style={{ margin: 0, color: '#0f172a', fontSize: 20, fontWeight: 900 }}>Payslip Details</h2>
            <p style={{ margin: '6px 0 0', color: '#64748b', fontSize: 13 }}>{row.employeeName} - {row.period}</p>
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <button type="button" onClick={onExport} style={secondaryButtonStyle}><Download size={15} /> Export</button>
            <button type="button" onClick={onClose} aria-label="Close payslip details" style={iconOnlyButtonStyle}><X size={18} /></button>
          </div>
        </div>
        <div style={{ padding: '0 18px 18px' }}>
          <PayslipDetail row={row} history={history} onExport={onExport} />
        </div>
      </div>
    </div>
  )
}

function ReportDetail({ report, rows, cycleRows, onExport }: { report: PayrollReport; rows: PayrollRow[]; cycleRows: CycleSummary[]; onExport: () => void }) {
  const reportRows = rows.filter(row => row.period === report.period)

  return (
    <div style={{ display: 'grid', gap: 18 }}>
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button onClick={onExport} style={secondaryButtonStyle}><Download size={15} /> Download Report</button>
      </div>
      <div style={componentHeroStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <span style={cycleIconStyle}><FileText size={24} color="#16a34a" /></span>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <h2 style={{ margin: 0, fontSize: 18, color: '#0f172a' }}>{report.name}</h2>
              <Badge value={reportRows.length ? 'Generated' : 'Empty'} />
            </div>
            <div style={mutedLineStyle}>{report.category}</div>
            <div style={mutedLineStyle}>{report.description}</div>
          </div>
        </div>
        <div style={componentHeroFactsStyle}>
          <Fact label="Report Period" value={report.period} />
          <Fact label="Generated On" value={formatDate(report.generatedAt)} />
          <Fact label="Payslips Included" value={String(reportRows.length)} />
        </div>
      </div>

      <div style={metricGridStyle}>
        <Metric icon={Wallet} label="Total Gross Earnings" value={money(report.gross)} sub={report.period} color="#16a34a" bg="#dcfce7" />
        <Metric icon={FileText} label="Total Deductions" value={money(report.deductions)} sub={report.period} color="#dc2626" bg="#fee2e2" />
        <Metric icon={Wallet} label="Total Net Pay" value={money(report.net)} sub={report.period} color="#16a34a" bg="#dcfce7" />
        <Metric icon={Users} label="Employees Paid" value={report.employees} sub="Saved payslips" color="#2563eb" bg="#dbeafe" />
      </div>

      <div style={detailGridStyle}>
        <div style={{ ...cardStyle, padding: 0 }}>
          <div style={sectionHeaderStyle}>Report Summary</div>
          <div style={{ padding: 18 }}>
            <AmountLine label="Total Gross Earnings" value={report.gross} />
            <AmountLine label="Total Deductions" value={report.deductions} negative />
            <AmountLine label="Total Net Pay" value={report.net} strong positive />
          </div>
        </div>
        <div style={cardStyle}>
          <SectionTitle title="Filters & Parameters" />
          <Fact label="Payroll Cycle" value={report.period} />
          <Fact label="Date Range" value={periodRange(report.period)} />
          <Fact label="Source" value="Saved payroll records" />
          <Fact label="Currency" value="PHP" />
        </div>
      </div>

      <div style={{ ...cardStyle, padding: 0 }}>
        <div style={sectionHeaderStyle}>Report Data</div>
        <PayslipsTable rows={reportRows} showControls={false} />
      </div>

      <div style={{ ...cardStyle, padding: 0 }}>
        <div style={sectionHeaderStyle}>Payroll Cycle Summary</div>
        <CyclesTable cycles={cycleRows} showControls={false} />
      </div>
    </div>
  )
}

function HeaderCard({ row }: { row: PayrollRow }) {
  return (
    <div style={{ ...cardStyle, display: 'grid', gridTemplateColumns: 'minmax(260px, 1fr) repeat(4, minmax(140px, 1fr))', gap: 18, alignItems: 'center' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <Avatar row={row} size={74} />
        <div>
          <h2 style={{ margin: 0, fontSize: 18 }}>{row.employeeName}</h2>
          <div style={mutedLineStyle}>{row.jobTitle} - {row.employeeCode}</div>
          <div style={mutedLineStyle}>{row.department}</div>
        </div>
      </div>
      <Fact label="Payroll Cycle" value={row.period} />
      <Fact label="Pay Period" value={periodRange(row.period)} />
      <Fact label="Pay Date" value={formatDate(row.paidAt || row.createdAt)} />
      <Fact label="Net Pay" value={money(row.net)} />
    </div>
  )
}

function CyclesTable({ cycles, onOpen, onGenerateReport, showControls = true }: { cycles: CycleSummary[]; onOpen?: (id: string) => void; onGenerateReport?: (cycle: CycleSummary) => void; showControls?: boolean }) {
  const [localQuery, setLocalQuery] = useState('')
  const [status, setStatus] = useState('All')
  const visibleCycles = cycles.filter(cycle => {
    const matchesStatus = status === 'All' || cycle.status === status
    const matchesSearch = [cycle.period, periodRange(cycle.period), formatDate(cycle.date), cycle.status, cycle.count, cycle.net]
      .some(value => String(value).toLowerCase().includes(localQuery.trim().toLowerCase()))
    return matchesStatus && matchesSearch
  })

  return (
    <TableShell title="Payroll Cycles" empty="No payroll cycles yet. Run payroll to create records." count={visibleCycles.length}>
      {showControls && (
        <TabFilterBar>
          <SelectFilter value={status} onChange={setStatus} options={['All', ...Array.from(new Set(cycles.map(cycle => cycle.status)))]} />
          <SearchBox value={localQuery} onChange={setLocalQuery} placeholder="Search payroll cycles..." compact />
        </TabFilterBar>
      )}
      <table style={tableStyle}>
        <thead><tr><Th>Payroll Cycle</Th><Th>Pay Period</Th><Th>Pay Date</Th><Th>Employees</Th><Th>Gross</Th><Th>Deductions</Th><Th>Net Payroll</Th><Th>Status</Th>{(onOpen || onGenerateReport) && <Th>Actions</Th>}</tr></thead>
        <tbody>{visibleCycles.map(cycle => (
          <tr key={cycle.id} style={trStyle}>
            <Td><strong>{cycle.period}</strong></Td>
            <Td>{periodRange(cycle.period)}</Td>
            <Td>{formatDate(cycle.date)}</Td>
            <Td>{cycle.count}</Td>
            <Td>{money(cycle.gross)}</Td>
            <Td>{money(cycle.deductions)}</Td>
            <Td>{money(cycle.net)}</Td>
            <Td><Badge value={cycle.status} /></Td>
            {(onOpen || onGenerateReport) && <Td><div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>{onOpen && <IconButton onClick={() => onOpen(cycle.id)} icon={Eye} />}{onGenerateReport && <button onClick={() => onGenerateReport(cycle)} style={smallButtonStyle}>Generate report</button>}</div></Td>}
          </tr>
        ))}</tbody>
      </table>
    </TableShell>
  )
}

function PayslipsTable({ rows, onOpen, onApprove, onPaid, showControls = true }: { rows: PayrollRow[]; onOpen?: (id: string) => void; onApprove?: (row: PayrollRow) => void; onPaid?: (row: PayrollRow) => void; showControls?: boolean }) {
  const [employee, setEmployee] = useState('All')
  const [period, setPeriod] = useState('All')
  const [status, setStatus] = useState('All')
  const [localQuery, setLocalQuery] = useState('')
  const hasActions = Boolean(onOpen || onApprove || onPaid)
  const employeeOptions = ['All', ...Array.from(new Set(rows.map(row => row.employeeName).filter(name => name !== '-')))]
  const periodOptions = ['All', ...Array.from(new Set(rows.map(row => row.period)))]
  const statusOptions = ['All', ...Array.from(new Set(rows.map(row => row.status)))]
  const visibleRows = rows.filter(row => {
    const matchesEmployee = employee === 'All' || row.employeeName === employee
    const matchesPeriod = period === 'All' || row.period === period
    const matchesStatus = status === 'All' || row.status === status
    const matchesSearch = [row.employeeName, row.employeeCode, row.jobTitle, row.department, row.period, row.status, row.net, row.attendanceSummary?.absentDays, paidAttendanceDays(row.attendanceSummary)]
      .some(value => String(value).toLowerCase().includes(localQuery.trim().toLowerCase()))
    return matchesEmployee && matchesPeriod && matchesStatus && matchesSearch
  })

  return (
    <TableShell title="Employee Payslips" empty="No payslips found." count={visibleRows.length}>
      {showControls && (
        <TabFilterBar>
          <SelectFilter value={employee} onChange={setEmployee} options={employeeOptions} />
          <SelectFilter value={period} onChange={setPeriod} options={periodOptions} />
          <SelectFilter value={status} onChange={setStatus} options={statusOptions} />
          <SearchBox value={localQuery} onChange={setLocalQuery} placeholder="Search payslips..." compact />
        </TabFilterBar>
      )}
      <table style={tableStyle}>
        <thead><tr><Th>Employee</Th><Th>Employee ID</Th><Th>Payroll Cycle</Th><Th>Pay Period</Th><Th>Pay Date</Th><Th>Worked/Paid</Th><Th>Absent</Th><Th>Net Pay</Th><Th>Status</Th>{hasActions && <Th>Actions</Th>}</tr></thead>
        <tbody>{visibleRows.map(row => (
          <tr
            key={row.id}
            style={onOpen ? clickableTrStyle : trStyle}
            onClick={onOpen ? () => onOpen(row.id) : undefined}
            role={onOpen ? 'button' : undefined}
            tabIndex={onOpen ? 0 : undefined}
            onKeyDown={onOpen ? event => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault()
                onOpen(row.id)
              }
            } : undefined}
          >
            <Td><div style={{ display: 'flex', alignItems: 'center', gap: 10 }}><Avatar row={row} size={34} /><span><strong style={{ display: 'block' }}>{row.employeeName}</strong><small style={{ color: '#64748b' }}>{row.jobTitle}</small></span></div></Td>
            <Td>{row.employeeCode}</Td>
            <Td>{row.period}</Td>
            <Td>{periodRange(row.period)}</Td>
            <Td>{formatDate(row.paidAt || row.createdAt)}</Td>
            <Td>{row.attendanceSummary ? formatAttendanceCount(paidAttendanceDays(row.attendanceSummary)) : '-'}</Td>
            <Td>{row.attendanceSummary ? formatAttendanceCount(row.attendanceSummary.absentDays) : '-'}</Td>
            <Td>{money(row.net)}</Td>
            <Td><Badge value={row.status} /></Td>
            {hasActions && (
              <Td>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {onOpen && <IconButton onClick={(event) => { event.stopPropagation(); onOpen(row.id) }} icon={Eye} />}
                  {onApprove && (row.status === 'Pending' || row.status === 'Processing') && <button onClick={(event) => { event.stopPropagation(); onApprove(row) }} style={smallButtonStyle}>Approve</button>}
                  {onPaid && row.status === 'Approved' && <button onClick={(event) => { event.stopPropagation(); onPaid(row) }} style={smallButtonStyle}>Release pay</button>}
                </div>
              </Td>
            )}
          </tr>
        ))}</tbody>
      </table>
    </TableShell>
  )
}

function ItemsTable({ title, subtitle, items, empty, onOpen }: { title: string; subtitle: string; items: PayrollItem[]; empty: string; onOpen?: (id: string) => void }) {
  const isSalaryComponent = title === 'Salary Components'
  const [localQuery, setLocalQuery] = useState('')
  const [type, setType] = useState('All')
  const typeOptions = ['All', ...Array.from(new Set(items.map(item => item.type)))]
  const visibleItems = items.filter(item => {
    const matchesType = type === 'All' || item.type === type
    const matchesSearch = [item.name, item.type, item.source, item.amount, item.employeeCount]
      .some(value => String(value).toLowerCase().includes(localQuery.trim().toLowerCase()))
    return matchesType && matchesSearch
  })

  return (
    <TableShell title={title} subtitle={subtitle} empty={empty} count={visibleItems.length}>
      <TabFilterBar>
        <SelectFilter value={type} onChange={setType} options={typeOptions} />
        <SearchBox value={localQuery} onChange={setLocalQuery} placeholder={`Search ${isSalaryComponent ? 'components' : 'deductions'}...`} compact />
      </TabFilterBar>
      <table style={tableStyle}>
        <thead><tr><Th>{isSalaryComponent ? 'Component Name' : 'Name'}</Th><Th>{isSalaryComponent ? 'Component Type' : 'Type'}</Th><Th>Employees</Th><Th>Source</Th><Th>Total Amount</Th><Th>Status</Th>{onOpen && <Th>Actions</Th>}</tr></thead>
        <tbody>{visibleItems.map(item => (
          <tr key={item.id} style={trStyle}>
            <Td><strong>{item.name}</strong></Td>
            <Td>{item.type}</Td>
            <Td>{item.employeeCount}</Td>
            <Td>{item.source}</Td>
            <Td>{money(item.amount)}</Td>
            <Td><Badge value="Active" /></Td>
            {onOpen && <Td><IconButton onClick={() => onOpen(item.id)} icon={Pencil} /></Td>}
          </tr>
        ))}</tbody>
      </table>
    </TableShell>
  )
}

function ReportsTable({ reports, onOpen, onExport, onExportReport }: { reports: PayrollReport[]; onOpen?: (id: string) => void; onExport: () => void; onExportReport: (report: PayrollReport) => void }) {
  const [period, setPeriod] = useState('All')
  const [localQuery, setLocalQuery] = useState('')
  const periodOptions = ['All', ...Array.from(new Set(reports.map(report => report.period)))]
  const visibleReports = reports.filter(report => {
    const matchesPeriod = period === 'All' || report.period === period
    const matchesSearch = [report.name, report.category, report.description, report.period, report.net, report.employees]
      .some(value => String(value).toLowerCase().includes(localQuery.trim().toLowerCase()))
    return matchesPeriod && matchesSearch
  })

  return (
    <TableShell title="Payroll Reports" subtitle="Generated only from saved payroll cycles." empty="No payroll reports yet. Run payroll first so reports can be generated from real payroll records." count={visibleReports.length}>
      <div style={componentToolbarStyle}>
        <SelectFilter value={period} onChange={setPeriod} options={periodOptions} />
        <SearchBox value={localQuery} onChange={setLocalQuery} placeholder="Search reports..." compact />
        <button onClick={onExport} style={secondaryButtonStyle}><Download size={15} /> Export Reports</button>
      </div>
      <table style={tableStyle}>
        <thead><tr><Th>Report Name</Th><Th>Category</Th><Th>Period</Th><Th>Employees</Th><Th>Net Pay</Th><Th>Generated On</Th><Th>Actions</Th></tr></thead>
        <tbody>{visibleReports.map(report => (
          <tr key={report.id} style={trStyle}>
            <Td><strong>{report.name}</strong></Td>
            <Td>{report.category}</Td>
            <Td>{report.period}</Td>
            <Td>{report.employees}</Td>
            <Td>{money(report.net)}</Td>
            <Td>{formatDate(report.generatedAt)}</Td>
            <Td><div style={{ display: 'flex', gap: 8 }}>{onOpen && <button onClick={() => onOpen(report.id)} style={smallButtonStyle}>View report</button>}<IconButton onClick={() => onExportReport(report)} icon={Download} /></div></Td>
          </tr>
        ))}</tbody>
      </table>
    </TableShell>
  )
}

function PayrollScheduleModal({ settings, currentRun, open, onClose, onChange }: { settings: PayrollScheduleSettings; currentRun: ReturnType<typeof getPayrollPeriod>; open: boolean; onClose: () => void; onChange: (patch: Partial<PayrollScheduleSettings>) => void }) {
  if (!open) return null

  return (
    <div style={modalOverlayStyle} role="dialog" aria-modal="true" aria-label="Payroll settings">
      <div style={modalCardStyle}>
        <div style={modalHeaderStyle}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <span style={cycleIconStyle}><CalendarDays size={22} color="#16a34a" /></span>
            <span>
              <strong style={{ display: 'block', color: '#0f172a', fontSize: 17 }}>Payroll Settings</strong>
              <small style={{ display: 'block', color: '#64748b', marginTop: 4 }}>
                Salary schedule, cutoff dates, and pay date preview.
              </small>
            </span>
          </div>
          <button onClick={onClose} style={iconButtonStyle} aria-label="Close payroll settings"><X size={16} /></button>
        </div>

        <div style={schedulePanelStyle}>
          <label style={fieldStyle}>
            <span style={labelStyle}>Payroll frequency</span>
            <select value={settings.frequency} onChange={event => onChange({ frequency: event.target.value as PayrollFrequency })} style={selectStyle}>
              <option value="monthly">Monthly</option>
              <option value="semi-monthly">Twice a month</option>
              <option value="bi-weekly">Every 2 weeks</option>
              <option value="weekly">Weekly</option>
            </select>
          </label>

          <label style={fieldStyle}>
            <span style={labelStyle}>Payroll generation date</span>
            <input type="date" value={payrollRunDateInput(settings)} onChange={event => onChange({ runDate: event.target.value })} style={selectStyle} />
          </label>

          <label style={fieldStyle}>
            <span style={labelStyle}>First cutoff day</span>
            <input type="number" min={1} max={31} value={settings.firstCutoffDay} onChange={event => onChange({ firstCutoffDay: clampDay(Number(event.target.value)) })} style={selectStyle} />
          </label>

          <label style={fieldStyle}>
            <span style={labelStyle}>Second cutoff day</span>
            <input type="number" min={1} max={31} value={settings.secondCutoffDay} onChange={event => onChange({ secondCutoffDay: clampDay(Number(event.target.value)) })} style={selectStyle} />
          </label>

          <label style={fieldStyle}>
            <span style={labelStyle}>Pay after cutoff</span>
            <input type="number" min={0} max={31} value={settings.payDelayDays} onChange={event => onChange({ payDelayDays: clampDelay(Number(event.target.value)) })} style={selectStyle} />
          </label>

          <label style={fieldStyle}>
            <span style={labelStyle}>Schedule start date</span>
            <input type="date" value={settings.scheduleStartDate} onChange={event => onChange({ scheduleStartDate: event.target.value })} style={selectStyle} />
          </label>

          <div style={schedulePreviewStyle}>
            <strong>Preview</strong>
            <span>Generation date: {formatDate(`${currentRun.runDate}T00:00:00`)}</span>
            <span>Current payroll run: {currentRun.label}</span>
            <span>Payroll range: {currentRun.range}</span>
            <span>Expected pay date: {formatDate(currentRun.payDate.toISOString())}</span>
          </div>
        </div>

        <div style={modalFooterStyle}>
          <button onClick={onClose} style={secondaryButtonStyle}>Cancel</button>
          <button onClick={onClose} style={primaryButtonStyle}>Done</button>
        </div>
      </div>
    </div>
  )
}

function TableShell({ title, subtitle, empty, count, children }: { title: string; subtitle?: string; empty: string; count: number; children: ReactNode }) {
  return (
    <div>
      <div style={tableHeaderStyle}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <strong style={{ display: 'block', color: '#0f172a', fontSize: 17 }}>{title}</strong>
            <span style={countBadgeStyle}>{count}</span>
          </div>
          {subtitle && <span style={{ display: 'block', color: '#64748b', fontSize: 13, lineHeight: 1.45, marginTop: 7, maxWidth: 980 }}>{subtitle}</span>}
        </div>
      </div>
      <div style={tableScrollStyle}>{children}</div>
      {count === 0 && <div style={{ padding: 24, color: '#64748b', fontSize: 13 }}>{empty}</div>}
    </div>
  )
}

function ThirteenthMonthTable({ employees }: { employees: Employee[] }) {
  const year = new Date().getFullYear()
  const rows = employees.map(employee => {
    const monthlyBasic = Number(employee.basicSalary || 0)
    const computation = computePhilippineThirteenthMonth(employee, year)
    return {
      employee,
      employeeName: employeeExportName(employee, fullName(employee)),
      employeeCode: employee.employeeId || employee.id,
      monthlyBasic,
      ...computation,
    }
  }).filter(row => row.monthlyBasic > 0)

  const exportRows = () => {
    downloadCsv('13th-month-pay-summary.csv', [
      ['Employee', 'Employee ID', 'Calendar Year', 'Eligible From', 'Eligible To', 'Eligible Days', 'Basic Salary Earned', '13th Month Pay', 'Review Status'],
      ...rows.map(row => [row.employeeName, row.employeeCode, String(year), row.eligibleFrom, row.eligibleTo, String(row.eligibleDays), numericExport(row.basicSalaryEarned), numericExport(row.thirteenth), 'For HR/Finance Review']),
    ])
    appendAuditLog({ action: 'payroll.export', targetType: '13th Month Pay', targetId: '13th-month-pay-summary.csv', summary: `Exported ${rows.length} 13th-month pay rows.` })
  }

  return (
    <TableShell title="13th-Month Pay Computation" subtitle="Philippine rule applied: total basic salary earned within the calendar year divided by 12. Allowances, overtime, holiday pay, premiums, and deductions are excluded unless company policy treats them as basic salary." empty="No salary-ready employees found." count={rows.length}>
      <div style={componentToolbarStyle}><button type="button" onClick={exportRows} style={secondaryButtonStyle}><Download size={15} /> Export summary</button></div>
      <table style={tableStyle}>
        <thead><tr><Th>Employee</Th><Th>Employee ID</Th><Th>Monthly Basic</Th><Th>Eligible Period</Th><Th>Basic Salary Earned</Th><Th>13th Month Pay</Th><Th>Status</Th></tr></thead>
        <tbody>{rows.map(row => (
          <tr key={row.employee.id} style={trStyle}>
            <Td>{row.employeeName}</Td>
            <Td>{row.employeeCode}</Td>
            <Td>{money(row.monthlyBasic)}</Td>
            <Td>{row.eligibleFrom} to {row.eligibleTo}<small style={mutedLineStyle}>{row.eligibleDays} eligible day{row.eligibleDays === 1 ? '' : 's'}</small></Td>
            <Td>{money(row.basicSalaryEarned)}</Td>
            <Td><strong>{money(row.thirteenth)}</strong></Td>
            <Td><Badge value="For Review" /></Td>
          </tr>
        ))}</tbody>
      </table>
    </TableShell>
  )
}

function computePhilippineThirteenthMonth(employee: Employee, year: number) {
  const monthlyBasic = Number(employee.basicSalary || 0)
  const yearStart = new Date(year, 0, 1)
  const yearEnd = new Date(year, 11, 31)
  const joined = employee.dateOfJoining ? new Date(`${employee.dateOfJoining}T00:00:00`) : yearStart
  const eligibleStart = joined > yearStart ? joined : yearStart
  const eligibleEnd = yearEnd
  const eligibleDays = Math.max(0, Math.floor((eligibleEnd.getTime() - eligibleStart.getTime()) / 86400000) + 1)
  const yearDays = Math.floor((yearEnd.getTime() - yearStart.getTime()) / 86400000) + 1
  const basicSalaryEarned = roundPeso((monthlyBasic * 12) * (eligibleDays / yearDays))
  return {
    eligibleFrom: formatDate(eligibleStart.toISOString()),
    eligibleTo: formatDate(eligibleEnd.toISOString()),
    eligibleDays,
    basicSalaryEarned,
    thirteenth: roundPeso(basicSalaryEarned / 12),
  }
}

function TabFilterBar({ children }: { children: ReactNode }) {
  return <div style={tabFilterBarStyle}>{children}</div>
}

function SelectFilter({ value, onChange, options }: { value: string; onChange: (value: string) => void; options: string[] }) {
  return (
    <select value={value} onChange={event => onChange(event.target.value)} style={filterSelectStyle}>
      {options.map(option => <option key={option} value={option}>{option}</option>)}
    </select>
  )
}

function SearchBox({ value, onChange, placeholder, compact }: { value: string; onChange: (value: string) => void; placeholder: string; compact?: boolean }) {
  return (
    <label style={{ ...inputStyle, minWidth: compact ? 260 : 330, display: 'flex', alignItems: 'center', gap: 8 }}>
      <Search size={15} color="#94a3b8" />
      <input value={value} onChange={event => onChange(event.target.value)} placeholder={placeholder} style={plainInputStyle} />
    </label>
  )
}

function PayrollReadinessPanel({ currentRun, activeEmployees, salaryReady, missingSalary, currentPayslips, employeesNeedingPayroll, onRunPayroll }: {
  currentRun: ReturnType<typeof getPayrollPeriod>
  activeEmployees: number
  salaryReady: number
  missingSalary: number
  currentPayslips: number
  employeesNeedingPayroll: number
  onRunPayroll: () => void
}) {
  const ready = activeEmployees > 0 && salaryReady > 0 && employeesNeedingPayroll > 0
  return (
    <div style={readinessPanelStyle}>
      <div>
        <span style={panelEyebrowStyle}>RUN READINESS</span>
        <strong style={{ display: 'block', color: '#0f172a', fontSize: 18, marginTop: 4 }}>Payroll run checklist</strong>
        <span style={{ display: 'block', marginTop: 5, color: '#64748b', fontSize: 13 }}>
          Current run: {currentRun.range} · Generation date: {formatDate(`${currentRun.runDate}T00:00:00`)} · Pay date: {formatDate(currentRun.payDate.toISOString())}
        </span>
        <button type="button" onClick={onRunPayroll} style={{ ...primaryButtonStyle, marginTop: 14 }}>
          <Plus size={15} /> Run payroll now
        </button>
      </div>
      <div style={readinessItemsStyle}>
        <ReadinessItem label="Active employees" value={activeEmployees} ok={activeEmployees > 0} />
        <ReadinessItem label="Salary-ready" value={salaryReady} ok={salaryReady > 0} />
        <ReadinessItem label="Missing salary" value={missingSalary} ok={missingSalary === 0} warn={missingSalary > 0} />
        <ReadinessItem label="Payslips this run" value={currentPayslips} ok={currentPayslips > 0} />
        <ReadinessItem label="Ready to create" value={employeesNeedingPayroll} ok={ready} warn={salaryReady > 0 && employeesNeedingPayroll === 0} />
      </div>
    </div>
  )
}

function ReadinessItem({ label, value, ok, warn }: { label: string; value: number; ok: boolean; warn?: boolean }) {
  const color = ok ? '#16a34a' : warn ? '#d97706' : '#64748b'
  const bg = ok ? '#dcfce7' : warn ? '#fef3c7' : '#f1f5f9'
  return (
    <div style={readinessItemStyle}>
      <span style={{ ...readinessDotStyle, background: bg, color }}>{ok ? <CheckCircle2 size={15} /> : warn ? <AlertTriangle size={15} /> : value}</span>
      <span>
        <strong style={{ display: 'block', color: '#0f172a', fontSize: 13 }}>{value}</strong>
        <small style={{ color: '#64748b', fontSize: 12 }}>{label}</small>
      </span>
    </div>
  )
}

function Metric({ icon: Icon, label, value, sub, color, bg }: { icon: ComponentType<{ size?: number; color?: string }>; label: string; value: string | number; sub: string; color: string; bg: string }) {
  return (
    <div style={metricCardStyle}>
      <span style={{ width: 52, height: 52, borderRadius: 14, background: bg, display: 'grid', placeItems: 'center', flexShrink: 0 }}><Icon size={22} color={color} /></span>
      <span style={{ minWidth: 0 }}><div style={{ color: '#475569', fontSize: 13, fontWeight: 700 }}>{label}</div><strong style={{ display: 'block', marginTop: 7, color: '#0f172a', fontSize: 21, lineHeight: 1.1 }}>{value}</strong><small style={{ display: 'block', marginTop: 7, color: '#64748b', lineHeight: 1.35 }}>{sub}</small></span>
    </div>
  )
}

function CycleMetric({ icon: Icon, label, value, sub, color, bg }: { icon: ComponentType<{ size?: number; color?: string }>; label: string; value: string; sub?: string; color: string; bg: string }) {
  return (
    <div style={cycleMetricStyle}>
      <span style={{ width: 46, height: 46, borderRadius: 14, background: bg, display: 'grid', placeItems: 'center' }}><Icon size={21} color={color} /></span>
      <span>
        <small style={{ color: '#64748b', fontSize: 12 }}>{label}</small>
        <strong style={{ display: 'block', marginTop: 6, color: '#0f172a', fontSize: 18 }}>{value}</strong>
        {sub && <small style={{ display: 'block', color: '#64748b', marginTop: 5 }}>{sub}</small>}
      </span>
    </div>
  )
}

function QuickAction({ icon: Icon, label, onClick }: { icon: ComponentType<{ size?: number }>; label: string; onClick: () => void }) {
  return (
    <button onClick={onClick} style={quickActionStyle}>
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}><Icon size={15} /> {label}</span>
      <ChevronRight size={15} />
    </button>
  )
}

function SectionTitle({ title }: { title: string }) {
  return <strong style={{ display: 'block', color: '#0f172a', fontSize: 16, marginBottom: 14 }}>{title}</strong>
}

function Fact({ label, value }: { label: string; value: string }) {
  return <div style={factStyle}><span style={{ color: '#64748b' }}>{label}</span><strong style={{ textAlign: 'right' }}>{value}</strong></div>
}

function AmountLine({ label, value, strong, large, positive, negative }: { label: string; value: number; strong?: boolean; large?: boolean; positive?: boolean; negative?: boolean }) {
  return <div style={{ ...amountLineStyle, fontSize: large ? 18 : 13, fontWeight: strong || large ? 900 : 500, color: positive ? '#15803d' : negative ? '#dc2626' : '#0f172a' }}><span>{label}</span><span>{money(value)}</span></div>
}

function Badge({ value }: { value: string }) {
  const tone = badgeTone(value)
  return <span style={{ borderRadius: 999, background: tone.bg, color: tone.text, padding: '3px 9px', fontSize: 11, fontWeight: 800 }}>{value}</span>
}

function Avatar({ row, size }: { row: PayrollRow; size: number }) {
  return <span style={{ width: size, height: size, borderRadius: '50%', background: row.photo ? `url(${row.photo}) center/cover` : '#dcfce7', color: '#15803d', display: 'grid', placeItems: 'center', fontSize: size > 50 ? 20 : 11, fontWeight: 900, flexShrink: 0 }}>{row.photo ? '' : initials(row.employeeName)}</span>
}

function Th({ children }: { children: ReactNode }) { return <th style={thStyle}>{children}</th> }
function Td({ children }: { children: ReactNode }) { return <td style={tdStyle}>{children}</td> }
function IconButton({ onClick, icon: Icon }: { onClick: (event: MouseEvent<HTMLButtonElement>) => void; icon: ComponentType<{ size?: number }> }) { return <button type="button" onClick={onClick} style={iconButtonStyle}><Icon size={15} /></button> }

function mask(value: string) {
  return value.length <= 4 ? value : `${'*'.repeat(Math.max(0, value.length - 4))}${value.slice(-4)}`
}

const payrollPageStyle = { fontFamily: font, display: 'grid', gap: 18 }
const payrollHeaderStyle = { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' as const, padding: '4px 0 0' }
const payrollHeaderActionsStyle = { display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 10, flexWrap: 'wrap' as const, marginLeft: 'auto' }
const pageHeaderStyle = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 360px), 1fr))', alignItems: 'center', gap: 18, background: '#fff', border: '1px solid #e5e7eb', borderRadius: 16, padding: '20px 22px', boxShadow: '0 14px 34px rgba(15,23,42,0.05)' }
const panelEyebrowStyle = { display: 'block', color: '#16a34a', fontSize: 11, fontWeight: 900, letterSpacing: 0 }
const payrollTitleStyle = { margin: 0, color: '#0f172a', fontSize: 28, lineHeight: 1.12, fontWeight: 900 }
const pageTitleStyle = { margin: 0, color: '#0f172a', fontSize: 30, lineHeight: 1.05, fontWeight: 900 }
const pageSubtitleStyle = { margin: '8px 0 0', color: '#475569', fontSize: 14, lineHeight: 1.5 }
const toolbarStyle = { display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 10, flexWrap: 'wrap' as const }
const metricGridStyle = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(245px, 1fr))', gap: 14 }
const metricCardStyle = { background: '#fff', border: '1px solid #e5e7eb', borderRadius: 14, boxShadow: '0 12px 30px rgba(15,23,42,0.045)', padding: 18, display: 'flex', alignItems: 'center', gap: 16, minHeight: 110 }
const readinessPanelStyle = { background: '#fff', border: '1px solid #e5e7eb', borderRadius: 16, boxShadow: '0 12px 30px rgba(15,23,42,0.045)', padding: 20, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 320px), 1fr))', gap: 20, alignItems: 'center' }
const readinessItemsStyle = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(142px, 1fr))', gap: 12 }
const readinessItemStyle = { border: '1px solid #eaf0f7', borderRadius: 12, padding: 13, display: 'flex', alignItems: 'center', gap: 11, background: '#fbfdff' }
const readinessDotStyle = { width: 30, height: 30, borderRadius: 999, display: 'grid', placeItems: 'center', fontSize: 12, fontWeight: 900, flexShrink: 0 }
const noticeStyle = { border: '1px solid #bbf7d0', background: '#f0fdf4', color: '#166534', borderRadius: 10, padding: '10px 12px', marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, fontSize: 13, fontWeight: 700 }
const workspaceSurfaceStyle = { background: '#fff', border: '1px solid #e5e7eb', borderRadius: 16, boxShadow: '0 14px 36px rgba(15,23,42,0.05)', overflow: 'hidden' }
const tabsStyle = { display: 'flex', gap: 6, borderBottom: '1px solid #e5e7eb', padding: '0 18px', overflowX: 'auto' as const, background: '#fff' }
const tabStyle = (active: boolean) => ({ border: 'none', background: 'transparent', padding: '17px 10px 14px', borderBottom: active ? '3px solid #111827' : '3px solid transparent', color: active ? '#111827' : '#334155', fontSize: 13, fontWeight: 900, cursor: 'pointer', fontFamily: font, whiteSpace: 'nowrap' as const })
const tabContentStyle = { background: '#fff' }
const detailGridStyle = { display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(280px, 420px)', gap: 18 }
const cycleHeroStyle = { background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, boxShadow: '0 8px 24px rgba(15,23,42,0.04)', padding: 18, display: 'grid', gridTemplateColumns: 'minmax(280px, 1fr) 2.2fr', gap: 24, alignItems: 'center' }
const componentHeroStyle = { background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, boxShadow: '0 8px 24px rgba(15,23,42,0.04)', padding: 18, display: 'grid', gridTemplateColumns: 'minmax(280px, 1fr) minmax(260px, 520px)', gap: 24, alignItems: 'center' }
const componentHeroFactsStyle = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 18, borderLeft: '1px solid #e5e7eb', paddingLeft: 22 }
const cycleIconStyle = { width: 58, height: 58, borderRadius: 14, background: '#dcfce7', display: 'grid', placeItems: 'center', flexShrink: 0 }
const cycleMetricsStyle = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 0, borderLeft: '1px solid #e5e7eb' }
const cycleMetricStyle = { display: 'flex', alignItems: 'center', gap: 13, padding: '10px 18px', borderRight: '1px solid #e5e7eb', minHeight: 86 }
const payrollSummaryGridStyle = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 22, padding: 18 }
const sectionHeaderStyle = { padding: '16px 18px', borderBottom: '1px solid #f1f5f9', color: '#0f172a', fontSize: 15, fontWeight: 900 }
const netPayBannerStyle = { margin: '0 18px 18px', border: '1px solid #bbf7d0', background: '#f0fdf4', borderRadius: 8, padding: '16px 18px', display: 'flex', justifyContent: 'space-between', gap: 16, color: '#15803d', fontSize: 18, fontWeight: 900 }
const infoNoteStyle = { border: '1px solid #bfdbfe', background: '#eff6ff', borderRadius: 8, padding: 16, display: 'flex', alignItems: 'flex-start', gap: 10, color: '#1d4ed8', fontSize: 13, lineHeight: 1.5 }
const timelineStepStyle = { display: 'grid', gridTemplateColumns: '34px 1fr', gap: 12, padding: '11px 0', alignItems: 'start' }
const timelineDotStyle = (done: boolean) => ({ width: 25, height: 25, borderRadius: '50%', background: done ? '#16a34a' : '#fff', border: done ? '1px solid #16a34a' : '1px solid #bbf7d0', color: done ? '#fff' : '#15803d', display: 'grid', placeItems: 'center', fontSize: 12, fontWeight: 900 })
const quickActionStyle = { width: '100%', border: 'none', borderBottom: '1px solid #f1f5f9', background: '#fff', color: '#0f172a', padding: '14px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', fontFamily: font, fontSize: 13, fontWeight: 700 }
const componentToolbarStyle = { display: 'flex', justifyContent: 'flex-end', gap: 12, padding: '16px 20px', borderBottom: '1px solid #f1f5f9', flexWrap: 'wrap' as const, background: '#fbfdff' }
const tabFilterBarStyle = { display: 'flex', justifyContent: 'flex-end', gap: 12, padding: '16px 20px', borderBottom: '1px solid #f1f5f9', flexWrap: 'wrap' as const, background: '#fbfdff' }
const cardStyle = { background: '#fff', border: '1px solid #e5e7eb', borderRadius: 14, boxShadow: '0 10px 28px rgba(15,23,42,0.045)', padding: 18 }
const inputStyle = { minHeight: 40, border: '1px solid #e5e7eb', borderRadius: 8, background: '#fff', color: '#0f172a', padding: '0 12px', fontSize: 13, fontFamily: font }
const plainInputStyle = { border: 'none', outline: 'none', background: 'transparent', width: '100%', font: 'inherit' }
const filterSelectStyle = { minHeight: 40, minWidth: 170, border: '1px solid #e5e7eb', borderRadius: 8, background: '#fff', color: '#0f172a', padding: '0 12px', fontSize: 13, fontFamily: font }
const primaryButtonStyle = { minHeight: 40, border: 'none', borderRadius: 8, background: '#16a34a', color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '0 16px', fontSize: 13, fontWeight: 900, cursor: 'pointer', fontFamily: font }
const secondaryButtonStyle = { minHeight: 38, border: '1px solid #e5e7eb', borderRadius: 8, background: '#fff', color: '#0f172a', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '0 14px', fontSize: 12, fontWeight: 900, cursor: 'pointer', fontFamily: font }
const iconOnlyButtonStyle = { width: 38, height: 38, border: '1px solid #e5e7eb', borderRadius: 8, background: '#fff', color: '#0f172a', display: 'grid', placeItems: 'center', cursor: 'pointer' }
const smallButtonStyle = { minHeight: 32, border: '1px solid #bbf7d0', borderRadius: 7, background: '#fff', color: '#15803d', padding: '0 10px', fontSize: 12, fontWeight: 800, cursor: 'pointer', fontFamily: font }
const schedulePanelStyle = { borderTop: '1px solid #f1f5f9', padding: 18, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14, alignItems: 'end' }
const modalOverlayStyle = { position: 'fixed' as const, inset: 0, zIndex: 80, background: 'rgba(15,23,42,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 18 }
const modalCardStyle = { width: 'min(760px, 100%)', maxHeight: 'calc(100vh - 36px)', overflowY: 'auto' as const, background: '#fff', border: '1px solid #e5e7eb', borderRadius: 14, boxShadow: '0 24px 70px rgba(15,23,42,0.22)' }
const payslipModalCardStyle = { width: 'min(1100px, 100%)', maxHeight: 'calc(100vh - 36px)', overflowY: 'auto' as const, background: '#fff', border: '1px solid #e5e7eb', borderRadius: 14, boxShadow: '0 24px 70px rgba(15,23,42,0.22)' }
const modalHeaderStyle = { padding: 18, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14 }
const modalFooterStyle = { borderTop: '1px solid #f1f5f9', padding: 18, display: 'flex', justifyContent: 'flex-end', gap: 10 }
const fieldStyle = { display: 'grid', gap: 7, color: '#0f172a', fontSize: 13, fontWeight: 800 }
const labelStyle = { color: '#475569', fontSize: 12, fontWeight: 800 }
const selectStyle = { width: '100%', minHeight: 40, border: '1px solid #e5e7eb', borderRadius: 8, background: '#fff', color: '#0f172a', padding: '0 12px', fontSize: 13, fontFamily: font }
const schedulePreviewStyle = { border: '1px solid #bbf7d0', background: '#f0fdf4', borderRadius: 10, padding: 14, display: 'grid', gap: 7, color: '#166534', fontSize: 12, lineHeight: 1.45 }
const iconButtonStyle = { width: 34, height: 34, border: '1px solid #e5e7eb', borderRadius: 8, background: '#fff', color: '#0f172a', display: 'inline-grid', placeItems: 'center', cursor: 'pointer' }
const tableHeaderStyle = { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 14, padding: '20px 22px', borderBottom: '1px solid #f1f5f9', flexWrap: 'wrap' as const, background: '#fff' }
const countBadgeStyle = { borderRadius: 999, background: '#f1f5f9', color: '#475569', padding: '3px 9px', fontSize: 11, fontWeight: 900 }
const tableScrollStyle = { overflowX: 'auto' as const, width: '100%' }
const tableStyle = { width: '100%', borderCollapse: 'collapse' as const, minWidth: 860 }
const thStyle = { textAlign: 'left' as const, padding: '14px 18px', color: '#475569', fontSize: 11, fontWeight: 900, background: '#f8fafc', whiteSpace: 'nowrap' as const, borderBottom: '1px solid #eaf0f7' }
const tdStyle = { padding: '15px 18px', borderTop: '1px solid #f1f5f9', color: '#0f172a', fontSize: 12, verticalAlign: 'middle' as const, lineHeight: 1.45 }
const trStyle = { background: '#fff' }
const clickableTrStyle = { ...trStyle, cursor: 'pointer' }
const mutedLineStyle = { display: 'block', color: '#64748b', fontSize: 12, marginTop: 5, lineHeight: 1.35 }
const factStyle = { display: 'flex', justifyContent: 'space-between', gap: 18, padding: '10px 0', color: '#334155', fontSize: 13 }
const amountLineStyle = { display: 'flex', justifyContent: 'space-between', padding: '11px 0', borderTop: '1px solid #f1f5f9' }
