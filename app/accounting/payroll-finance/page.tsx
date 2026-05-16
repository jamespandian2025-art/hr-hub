'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import {
  Banknote,
  CalendarDays,
  ChevronDown,
  CheckCircle2,
  Coins,
  FileText,
  Filter,
  Landmark,
  MoreHorizontal,
  Play,
  ShieldCheck,
  UserRound,
  XCircle,
} from 'lucide-react'
import { Employee, employeeKey, fullName, loadStored, saveStored } from '@/app/employee/employeeData'
import {
  applyFinanceLoanTerms,
  calculateLoanScheduledDeduction,
  decideLoanRequest,
  DeductionSchedule,
  FinanceLoanTerms,
  loanApprovalState,
  LoanRequest,
  loanDisplayName,
  loanRequestKey,
  loanScheduledDeduction,
  money as loanMoney,
  resolveLoanEmployee,
  saveLoanRequests,
} from '@/app/hr/loan-requests/loanData'
import { AllowanceRequest, allowanceRequestKey, loadStored as loadEnterpriseStored, saveStored as saveEnterpriseStored } from '@/app/hr/enterpriseData'
import { listHrRecords, updateHrRecord } from '@/lib/hrms/client'

const font = 'var(--font-body)'

type PayrollTask = {
  title: string
  detail: string
  status: 'Completed' | 'In Progress' | 'Pending' | 'Upcoming'
}

type PayrollStatus = 'Paid' | 'Pending' | 'Processing' | 'Approved'

type PayrollRecord = {
  id: string
  employeeId: string
  period: string
  gross: number
  deductions: number
  deductionBreakdown?: {
    sss?: number
    philHealth?: number
    pagIbig?: number
    tax?: number
    loanOrCashAdvance?: number
  }
  allowanceLines?: Array<{ allowanceId: string; type: string; amount: number; date?: string; purpose?: string }>
  loanDeductions?: Array<{ loanId: string; type: string; amount: number }>
  net: number
  status: PayrollStatus
  source?: 'payroll-run'
  paidAt?: string
  createdAt: string
}

const payrollRecordKey = 'flowsys-hr-payroll-records'
const financeRefreshEvent = 'wiseflow:finance-requests-changed'
const payrollTabs = ['Payroll Overview', 'Employees', 'Earnings', 'Deductions', 'Taxes & Contributions', 'Payments', 'Journal Entries', 'Payroll History'] as const
type PayrollTab = typeof payrollTabs[number]

function money(value: number) {
  return `PHP ${Number(value || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function StatusPill({ value }: { value: string }) {
  return <span className={`payroll-pill ${value.toLowerCase().replaceAll(' ', '-')}`}>{value}</span>
}

function uniqueRows<T extends { id?: string }>(rows: T[]) {
  const map = new Map<string, T>()
  rows.forEach((row, index) => {
    const key = row.id || `row-${index}`
    map.set(key, { ...map.get(key), ...row })
  })
  return Array.from(map.values())
}

function loadAllStoredRows<T extends { id?: string }>(baseKey: string, loader: <V>(key: string, fallback: V) => V) {
  const baseRows = loader<T[]>(baseKey, [])
  if (typeof window === 'undefined') return Array.isArray(baseRows) ? baseRows : []
  const rows = Array.isArray(baseRows) ? [...baseRows] : []
  for (let index = 0; index < window.localStorage.length; index += 1) {
    const key = window.localStorage.key(index)
    if (!key || key === baseKey || !key.startsWith(`${baseKey}:`)) continue
    const scopedRows = loader<T[]>(key, [])
    if (Array.isArray(scopedRows)) rows.push(...scopedRows)
  }
  return uniqueRows(rows)
}

function isActiveEmployee(employee: Employee) {
  return !['archived', 'deleted', 'inactive', 'terminated', 'resigned'].includes(String(employee.employmentStatus || '').trim().toLowerCase())
}

function latestFirst<T extends { createdAt?: string; paidAt?: string }>(rows: T[]) {
  return [...rows].sort((a, b) => new Date(b.createdAt || b.paidAt || 0).getTime() - new Date(a.createdAt || a.paidAt || 0).getTime())
}

function groupPayrollRuns(records: PayrollRecord[]) {
  const map = new Map<string, { period: string; payDate: string; employees: number; grossPay: number; deductions: number; netPay: number; status: PayrollStatus; createdAt: string }>()
  records.forEach(record => {
    const period = record.period || 'Unassigned period'
    const current = map.get(period) || {
      period,
      payDate: record.paidAt || record.createdAt || '',
      employees: 0,
      grossPay: 0,
      deductions: 0,
      netPay: 0,
      status: 'Paid' as PayrollStatus,
      createdAt: record.createdAt || '',
    }
    const nextStatus: PayrollStatus = current.status === 'Paid' && record.status === 'Paid' ? 'Paid' : record.status === 'Approved' ? 'Approved' : record.status === 'Processing' ? 'Processing' : 'Pending'
    map.set(period, {
      ...current,
      payDate: record.paidAt || current.payDate || record.createdAt || '',
      employees: current.employees + 1,
      grossPay: current.grossPay + Number(record.gross || 0),
      deductions: current.deductions + Number(record.deductions || 0),
      netPay: current.netPay + Number(record.net || 0),
      status: nextStatus,
      createdAt: record.createdAt || current.createdAt,
    })
  })
  return latestFirst(Array.from(map.values()))
}

function formatDate(value?: string) {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function periodLabel(value?: string) {
  return value || 'No payroll period yet'
}

function buildPayrollTrend(runs: ReturnType<typeof groupPayrollRuns>) {
  return runs.slice(0, 6).reverse().map(run => ({
    label: run.period.split('-').at(0)?.trim().slice(0, 8) || run.period.slice(0, 8),
    gross: run.grossPay,
    net: run.netPay,
  }))
}

function buildComplianceRows(records: PayrollRecord[]) {
  const totals = records.reduce((sum, record) => {
    sum.sss += Number(record.deductionBreakdown?.sss || 0)
    sum.philHealth += Number(record.deductionBreakdown?.philHealth || 0)
    sum.pagIbig += Number(record.deductionBreakdown?.pagIbig || 0)
    sum.tax += Number(record.deductionBreakdown?.tax || 0)
    return sum
  }, { sss: 0, philHealth: 0, pagIbig: 0, tax: 0 })
  return [
    { title: 'Tax Withholding (BIR)', amount: totals.tax, icon: 'tax' },
    { title: 'SSS Contribution', amount: totals.sss, icon: 'sss' },
    { title: 'PhilHealth Contribution', amount: totals.philHealth, icon: 'health' },
    { title: 'Pag-IBIG Contribution', amount: totals.pagIbig, icon: 'housing' },
  ].filter(item => item.amount > 0)
}

function employeeMatchesId(employee: Employee | undefined, id?: string) {
  if (!employee || !id) return false
  return employee.id === id || employee.employeeId === id
}

function employeeNameFor(employees: Employee[], employeeId: string) {
  const employee = employees.find(item => employeeMatchesId(item, employeeId))
  return fullName(employee) || employeeId
}

export default function PayrollFinancePage() {
  const [activeTab, setActiveTab] = useState<PayrollTab>('Payroll Overview')
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loanRequests, setLoanRequests] = useState<LoanRequest[]>([])
  const [allowanceRequests, setAllowanceRequests] = useState<AllowanceRequest[]>([])
  const [payrollRecords, setPayrollRecords] = useState<PayrollRecord[]>([])
  const [notice, setNotice] = useState('')

  useEffect(() => {
    let cancelled = false
    const loadFinanceData = async () => {
      setEmployees(loadStored<Employee[]>(employeeKey, []))
      const localLoans = loadAllStoredRows<LoanRequest>(loanRequestKey, loadStored)
      try {
        const serverLoans = await listHrRecords<LoanRequest>('loan-requests', {
          'x-hr-role': 'Finance',
          'x-hr-user-name': 'Payroll Finance',
        })
        const nextLoans = uniqueRows([...localLoans, ...serverLoans])
        if (!cancelled) setLoanRequests(current => nextLoans.length > 0 || current.length === 0 ? nextLoans : current)
      } catch {
        if (!cancelled) setLoanRequests(current => localLoans.length > 0 || current.length === 0 ? localLoans : current)
      }
      const localAllowances = loadAllStoredRows<AllowanceRequest>(allowanceRequestKey, loadEnterpriseStored)
      try {
        const serverAllowances = await listHrRecords<AllowanceRequest>('allowance-requests', {
          'x-hr-role': 'Finance',
          'x-hr-user-name': 'Payroll Finance',
        })
        const nextAllowances = uniqueRows([...localAllowances, ...serverAllowances])
        if (!cancelled) setAllowanceRequests(current => nextAllowances.length > 0 || current.length === 0 ? nextAllowances : current)
      } catch {
        if (!cancelled) setAllowanceRequests(current => localAllowances.length > 0 || current.length === 0 ? localAllowances : current)
      }
      setPayrollRecords(loadAllStoredRows<PayrollRecord>(payrollRecordKey, loadStored))
    }

    loadFinanceData()
    window.addEventListener('storage', loadFinanceData)
    window.addEventListener('focus', loadFinanceData)
    window.addEventListener(financeRefreshEvent, loadFinanceData)
    const timer = window.setInterval(loadFinanceData, 2500)
    return () => {
      cancelled = true
      window.removeEventListener('storage', loadFinanceData)
      window.removeEventListener('focus', loadFinanceData)
      window.removeEventListener(financeRefreshEvent, loadFinanceData)
      window.clearInterval(timer)
    }
  }, [])

  const activeEmployees = useMemo(() => employees.filter(isActiveEmployee), [employees])
  const payrollRows = useMemo(() => latestFirst(payrollRecords.filter(record => record.source === 'payroll-run')), [payrollRecords])
  const payrollRuns = useMemo(() => groupPayrollRuns(payrollRows), [payrollRows])
  const latestPeriod = payrollRuns[0]?.period || ''
  const currentPayrollRecords = useMemo(() => latestPeriod ? payrollRows.filter(record => record.period === latestPeriod) : [], [latestPeriod, payrollRows])
  const pendingFinanceLoans = useMemo(() => loanRequests.filter(request => request.status === 'Pending' && loanApprovalState(request).canFinanceDecide), [loanRequests])
  const pendingFinanceAllowances = useMemo(() => allowanceRequests.filter(request => ['Pending', 'Manager Approved'].includes(request.status) && request.financeDecision !== 'Rejected'), [allowanceRequests])
  const payrollReadyLoans = useMemo(() => loanRequests.filter(request => request.status === 'Approved' && request.approvalStep === 'payroll'), [loanRequests])
  const payrollReadyAllowances = useMemo(() => allowanceRequests.filter(request => request.status === 'Finance Approved' && !request.payrollPeriod), [allowanceRequests])
  const finalPayrollQueue = useMemo(() => payrollRecords.filter(record => record.source === 'payroll-run' && record.status !== 'Paid'), [payrollRecords])
  const payrollNetPending = finalPayrollQueue.reduce((sum, record) => sum + Number(record.net || 0), 0)
  const grossPay = currentPayrollRecords.reduce((sum, record) => sum + Number(record.gross || 0), 0)
  const totalDeductions = currentPayrollRecords.reduce((sum, record) => sum + Number(record.deductions || 0), 0)
  const netPay = currentPayrollRecords.reduce((sum, record) => sum + Number(record.net || 0), 0)
  const employerContributions = 0
  const totalPayrollCost = grossPay + employerContributions
  const payrollEmployeeIds = new Set(currentPayrollRecords.map(record => record.employeeId).filter(Boolean))
  const payrollEmployeeCount = payrollEmployeeIds.size || currentPayrollRecords.length
  const currentPayrollDepartments = new Set(currentPayrollRecords.map(record => employees.find(employee => employeeMatchesId(employee, record.employeeId))?.department).filter(Boolean))
  const costPerEmployee = payrollEmployeeCount ? totalPayrollCost / payrollEmployeeCount : 0
  const avgDepartmentCost = currentPayrollDepartments.size ? totalPayrollCost / currentPayrollDepartments.size : 0
  const grossCostPercent = totalPayrollCost ? (grossPay / totalPayrollCost) * 100 : 0
  const employerCostPercent = totalPayrollCost ? (employerContributions / totalPayrollCost) * 100 : 0
  const netPayPercent = grossPay ? (netPay / grossPay) * 100 : 0
  const deductionPercent = grossPay ? (totalDeductions / grossPay) * 100 : 0
  const monthlyPayroll = useMemo(() => buildPayrollTrend(payrollRuns), [payrollRuns])
  const maxPayrollValue = Math.max(1, ...monthlyPayroll.flatMap(month => [month.gross, month.net]))
  const complianceItems = useMemo(() => buildComplianceRows(currentPayrollRecords), [currentPayrollRecords])
  const employeePayrollRows = useMemo(() => activeEmployees.map(employee => {
    const record = currentPayrollRecords.find(item => employeeMatchesId(employee, item.employeeId))
    const employeeLoans = loanRequests.filter(request => employeeMatchesId(employee, request.employeeId))
    const employeeAllowances = allowanceRequests.filter(request => employeeMatchesId(employee, request.employeeId))
    return {
      employee,
      record,
      name: fullName(employee) || employee.email || employee.employeeId || employee.id,
      code: employee.employeeId || employee.id,
      department: employee.department || '-',
      jobTitle: employee.jobTitle || '-',
      gross: Number(record?.gross || 0),
      deductions: Number(record?.deductions || 0),
      net: Number(record?.net || 0),
      status: record?.status || 'Pending',
      requestCount: employeeLoans.length + employeeAllowances.length,
    }
  }), [activeEmployees, allowanceRequests, currentPayrollRecords, loanRequests])
  const earningRows = useMemo(() => payrollRows.map(record => {
    const allowanceTotal = (record.allowanceLines || []).reduce((sum, line) => sum + Number(line.amount || 0), 0)
    return {
      id: record.id,
      employeeName: employeeNameFor(employees, record.employeeId),
      period: record.period,
      basePay: Math.max(0, Number(record.gross || 0) - allowanceTotal),
      allowanceTotal,
      gross: Number(record.gross || 0),
      status: record.status,
    }
  }), [employees, payrollRows])
  const deductionRows = useMemo(() => payrollRows.map(record => {
    const statutory = ['sss', 'philHealth', 'pagIbig', 'tax']
      .reduce((sum, key) => sum + Number(record.deductionBreakdown?.[key as keyof NonNullable<PayrollRecord['deductionBreakdown']>] || 0), 0)
    const loanTotal = Number(record.deductionBreakdown?.loanOrCashAdvance || 0) || (record.loanDeductions || []).reduce((sum, line) => sum + Number(line.amount || 0), 0)
    return {
      id: record.id,
      employeeName: employeeNameFor(employees, record.employeeId),
      period: record.period,
      statutory,
      loanTotal,
      other: Math.max(0, Number(record.deductions || 0) - statutory - loanTotal),
      total: Number(record.deductions || 0),
      status: record.status,
    }
  }), [employees, payrollRows])
  const paymentRows = useMemo(() => payrollRows.map(record => ({
    id: record.id,
    employeeName: employeeNameFor(employees, record.employeeId),
    period: record.period,
    net: Number(record.net || 0),
    status: record.status,
    paidAt: record.paidAt,
    record,
  })), [employees, payrollRows])
  const journalRows = useMemo(() => payrollRuns.flatMap(run => [
    { id: `${run.period}-gross`, period: run.period, account: 'Payroll Expense', debit: run.grossPay, credit: 0, status: run.status },
    { id: `${run.period}-deductions`, period: run.period, account: 'Payroll Deductions Payable', debit: 0, credit: run.deductions, status: run.status },
    { id: `${run.period}-net`, period: run.period, account: 'Salary Payable', debit: 0, credit: run.netPay, status: run.status },
  ]), [payrollRuns])
  const payrollTasks: PayrollTask[] = [
    { title: 'Review Employee Requests', detail: `${pendingFinanceLoans.length + pendingFinanceAllowances.length} loan, cash advance, or allowance request${pendingFinanceLoans.length + pendingFinanceAllowances.length === 1 ? '' : 's'} waiting for Finance`, status: pendingFinanceLoans.length + pendingFinanceAllowances.length ? 'In Progress' : 'Completed' },
    { title: 'HR Final Payroll Review', detail: `${payrollReadyLoans.length + payrollReadyAllowances.length} approved request${payrollReadyLoans.length + payrollReadyAllowances.length === 1 ? '' : 's'} ready for HR payroll`, status: payrollReadyLoans.length + payrollReadyAllowances.length ? 'Pending' : 'Upcoming' },
    { title: 'Finance Approval & Pay Release', detail: `${finalPayrollQueue.length} payroll record${finalPayrollQueue.length === 1 ? '' : 's'} waiting for approval or release`, status: finalPayrollQueue.length ? 'Pending' : 'Upcoming' },
  ]
  const metrics = [
    { title: 'Total Payroll Cost', value: money(totalPayrollCost), detail: periodLabel(latestPeriod), icon: Banknote, tone: '#16a34a', up: totalPayrollCost > 0 },
    { title: 'Gross Pay', value: money(grossPay), detail: `${currentPayrollRecords.length || activeEmployees.length} employee${(currentPayrollRecords.length || activeEmployees.length) === 1 ? '' : 's'}`, icon: UserRound, tone: '#2563eb' },
    { title: 'Deductions', value: money(totalDeductions), detail: grossPay ? `${((totalDeductions / grossPay) * 100).toFixed(1)}% of gross pay` : 'No payroll deductions yet', icon: Coins, tone: '#7c3aed' },
    { title: 'Requests Waiting', value: String(pendingFinanceLoans.length + pendingFinanceAllowances.length), detail: 'Employee requests for Finance review', icon: Landmark, tone: '#f59e0b' },
    { title: 'Net Pay', value: money(netPay), detail: grossPay ? `${((netPay / grossPay) * 100).toFixed(1)}% of gross pay` : 'No final payroll yet', icon: FileText, tone: '#ef4444' },
  ]

  const showPeriodSummary = () => {
    setNotice(latestPeriod ? `Showing payroll finance records for ${periodLabel(latestPeriod)}.` : 'No payroll period has been created yet.')
  }

  const showFinanceFilters = () => {
    setActiveTab('Payments')
    setNotice('Use the Payments tab to approve or release payroll records by status.')
  }

  const inspectPayrollRun = (period: string) => {
    setActiveTab('Payments')
    setNotice(`Opened payroll payment records for ${period}.`)
  }

  async function saveLoanDecision(request: LoanRequest, decision: 'Approved' | 'Rejected', financeTerms?: FinanceLoanTerms) {
    const employee = resolveLoanEmployee(request, employees)
    const reviewedRequest = decision === 'Approved' && financeTerms ? applyFinanceLoanTerms(request, financeTerms) : request
    const decided = decideLoanRequest(reviewedRequest, employee, 'finance', decision)
    const nextRequests = loanRequests.map(item => item.id === request.id ? decided : item)
    setLoanRequests(nextRequests)
    saveLoanRequests(nextRequests)
    try {
      await updateHrRecord<LoanRequest>('loan-requests', request.id, decided as unknown as Record<string, unknown>)
    } catch (error) {
      console.error('Could not sync Finance loan decision', error)
    }
    window.dispatchEvent(new Event(financeRefreshEvent))
    const approvedTerms = decision === 'Approved'
      ? ` Approved terms: ${decided.repaymentMonths} month${decided.repaymentMonths === 1 ? '' : 's'}, ${loanMoney(loanScheduledDeduction(decided))} per ${decided.deductionSchedule || 'payroll'}. HR can now include it in final payroll.`
      : ' The employee request was rejected.'
    setNotice(`${loanDisplayName(request)} for ${request.employeeName || fullName(employee) || 'employee'} ${decision.toLowerCase()} by Finance.${approvedTerms}`)
  }

  function updatePayrollRecord(record: PayrollRecord, status: PayrollStatus, patch: Partial<PayrollRecord> = {}) {
    const next = payrollRecords.map(item => item.id === record.id ? { ...item, ...patch, status } : item)
    setPayrollRecords(next)
    saveStored(payrollRecordKey, next)
    window.dispatchEvent(new Event('storage'))
  }

  function approveFinalPayroll(record: PayrollRecord) {
    updatePayrollRecord(record, 'Approved')
    setNotice('Final payroll approved by Finance and ready for pay release.')
  }

  function releasePay(record: PayrollRecord) {
    updatePayrollRecord(record, 'Paid', { paidAt: new Date().toISOString() })
    setNotice('Payroll released and marked paid by Finance.')
  }

  async function saveAllowanceDecision(request: AllowanceRequest, decision: 'Approved' | 'Rejected') {
    const now = new Date().toISOString()
    const next = allowanceRequests.map(item => item.id === request.id ? {
      ...item,
      status: decision === 'Approved' ? 'Finance Approved' as const : 'Rejected' as const,
      financeDecision: decision,
      updatedAt: now,
    } : item)
    setAllowanceRequests(next)
    saveEnterpriseStored(allowanceRequestKey, next)
    const changed = next.find(item => item.id === request.id)
    if (changed) {
      try {
        await updateHrRecord<AllowanceRequest>('allowance-requests', request.id, changed as unknown as Record<string, unknown>)
      } catch (error) {
        console.error('Could not sync Finance allowance decision', error)
      }
    }
    window.dispatchEvent(new Event('storage'))
    window.dispatchEvent(new Event(financeRefreshEvent))
    setNotice(`${request.customType || request.type} allowance for ${request.employeeName || 'employee'} ${decision.toLowerCase()} by Finance.`)
  }

  function renderTabContent() {
    if (activeTab === 'Employees') {
      return (
        <section className="payroll-card payroll-tab-card">
          <h2>Employees</h2>
          <div className="payroll-table-wrap">
            <table className="payroll-table">
              <thead><tr>{['Employee', 'Department', 'Position', 'Gross Pay', 'Deductions', 'Net Pay', 'Requests', 'Status'].map(col => <th key={col}>{col}</th>)}</tr></thead>
              <tbody>{employeePayrollRows.length ? employeePayrollRows.map(row => (
                <tr key={row.employee.id}>
                  <td data-label="Employee"><strong>{row.name}</strong><small>{row.code}</small></td>
                  <td data-label="Department">{row.department}</td>
                  <td data-label="Position">{row.jobTitle}</td>
                  <td data-label="Gross Pay">{money(row.gross)}</td>
                  <td data-label="Deductions">{money(row.deductions)}</td>
                  <td data-label="Net Pay">{money(row.net)}</td>
                  <td data-label="Requests">{row.requestCount}</td>
                  <td data-label="Status"><StatusPill value={row.status} /></td>
                </tr>
              )) : <tr><td colSpan={8}><div className="payroll-empty">No employee records available yet.</div></td></tr>}</tbody>
            </table>
          </div>
        </section>
      )
    }

    if (activeTab === 'Earnings') {
      return (
        <section className="payroll-card payroll-tab-card">
          <h2>Earnings</h2>
          <div className="payroll-table-wrap">
            <table className="payroll-table">
              <thead><tr>{['Employee', 'Period', 'Base Pay', 'Allowances', 'Gross Pay', 'Status'].map(col => <th key={col}>{col}</th>)}</tr></thead>
              <tbody>{earningRows.length ? earningRows.map(row => (
                <tr key={row.id}>
                  <td data-label="Employee">{row.employeeName}</td>
                  <td data-label="Period">{row.period}</td>
                  <td data-label="Base Pay">{money(row.basePay)}</td>
                  <td data-label="Allowances">{money(row.allowanceTotal)}</td>
                  <td data-label="Gross Pay">{money(row.gross)}</td>
                  <td data-label="Status"><StatusPill value={row.status} /></td>
                </tr>
              )) : <tr><td colSpan={6}><div className="payroll-empty">No earnings data yet. HR payroll records will populate this tab.</div></td></tr>}</tbody>
            </table>
          </div>
        </section>
      )
    }

    if (activeTab === 'Deductions') {
      return (
        <section className="payroll-card payroll-tab-card">
          <h2>Deductions</h2>
          <div className="payroll-table-wrap">
            <table className="payroll-table">
              <thead><tr>{['Employee', 'Period', 'Statutory', 'Loan / Cash Advance', 'Other', 'Total Deductions', 'Status'].map(col => <th key={col}>{col}</th>)}</tr></thead>
              <tbody>{deductionRows.length ? deductionRows.map(row => (
                <tr key={row.id}>
                  <td data-label="Employee">{row.employeeName}</td>
                  <td data-label="Period">{row.period}</td>
                  <td data-label="Statutory">{money(row.statutory)}</td>
                  <td data-label="Loan / Cash Advance">{money(row.loanTotal)}</td>
                  <td data-label="Other">{money(row.other)}</td>
                  <td data-label="Total Deductions">{money(row.total)}</td>
                  <td data-label="Status"><StatusPill value={row.status} /></td>
                </tr>
              )) : <tr><td colSpan={7}><div className="payroll-empty">No deduction data yet.</div></td></tr>}</tbody>
            </table>
          </div>
        </section>
      )
    }

    if (activeTab === 'Taxes & Contributions') {
      return (
        <section className="payroll-card payroll-tab-card">
          <h2>Taxes & Contributions</h2>
          <div className="payroll-compliance-list">
            {complianceItems.length ? complianceItems.map(item => (
              <div key={item.title}>
                <span className={`compliance-icon ${item.icon}`}><ShieldCheck size={17} /></span>
                <span><strong>{item.title}</strong><small>{periodLabel(latestPeriod)}</small></span>
                <span><strong>{money(item.amount)}</strong><small>From payroll deduction breakdown</small></span>
                <StatusPill value="Pending" />
              </div>
            )) : <div className="payroll-empty">No tax or contribution data yet.</div>}
          </div>
        </section>
      )
    }

    if (activeTab === 'Payments') {
      return (
        <section className="payroll-card payroll-tab-card">
          <h2>Payments</h2>
          <div className="payroll-table-wrap">
            <table className="payroll-table">
              <thead><tr>{['Employee', 'Period', 'Net Pay', 'Paid Date', 'Status', 'Actions'].map(col => <th key={col}>{col}</th>)}</tr></thead>
              <tbody>{paymentRows.length ? paymentRows.map(row => (
                <tr key={row.id}>
                  <td data-label="Employee">{row.employeeName}</td>
                  <td data-label="Period">{row.period}</td>
                  <td data-label="Net Pay">{money(row.net)}</td>
                  <td data-label="Paid Date">{formatDate(row.paidAt)}</td>
                  <td data-label="Status"><StatusPill value={row.status} /></td>
                  <td data-label="Actions">
                    {row.status === 'Pending' || row.status === 'Processing' ? <button type="button" className="payroll-inline-action" onClick={() => approveFinalPayroll(row.record)}>Approve</button> : null}
                    {row.status === 'Approved' ? <button type="button" className="payroll-inline-action" onClick={() => releasePay(row.record)}>Release Pay</button> : null}
                  </td>
                </tr>
              )) : <tr><td colSpan={6}><div className="payroll-empty">No payment records yet.</div></td></tr>}</tbody>
            </table>
          </div>
        </section>
      )
    }

    if (activeTab === 'Journal Entries') {
      return (
        <section className="payroll-card payroll-tab-card">
          <h2>Journal Entries</h2>
          <div className="payroll-table-wrap">
            <table className="payroll-table">
              <thead><tr>{['Period', 'Account', 'Debit', 'Credit', 'Status'].map(col => <th key={col}>{col}</th>)}</tr></thead>
              <tbody>{journalRows.length ? journalRows.map(row => (
                <tr key={row.id}>
                  <td data-label="Period">{row.period}</td>
                  <td data-label="Account">{row.account}</td>
                  <td data-label="Debit">{money(row.debit)}</td>
                  <td data-label="Credit">{money(row.credit)}</td>
                  <td data-label="Status"><StatusPill value={row.status} /></td>
                </tr>
              )) : <tr><td colSpan={5}><div className="payroll-empty">No journal entries yet. Payroll runs will generate payroll expense and payable entries.</div></td></tr>}</tbody>
            </table>
          </div>
        </section>
      )
    }

    if (activeTab === 'Payroll History') {
      return (
        <section className="payroll-grid payroll-lower-grid">
          <RecentPayrollRuns payrollRuns={payrollRuns} onInspect={inspectPayrollRun} />
          <CompliancePanel complianceItems={complianceItems} latestPeriod={latestPeriod} />
        </section>
      )
    }

    return null
  }

  return (
    <div className="payroll-page" style={{ fontFamily: font }}>
      <style>{payrollCss}</style>
      <div className="payroll-header">
        <div>
          <h1 className="payroll-title">Payroll Finance</h1>
          <p className="payroll-subtitle">Manage payroll processing, salary expenses, deductions, and compliance.</p>
        </div>
        <div className="payroll-actions">
          <button type="button" onClick={showPeriodSummary}><CalendarDays size={15} /> Period</button>
          <button type="button" onClick={showPeriodSummary}><CalendarDays size={15} /> {periodLabel(latestPeriod)} <ChevronDown size={14} /></button>
          <button type="button" onClick={showFinanceFilters}><Filter size={15} /> Filters</button>
          <Link href="/hr/payroll" className="is-primary"><Play size={15} /> Open HR Payroll <ChevronDown size={13} /></Link>
        </div>
      </div>

      <section className="payroll-metrics">
        {metrics.map(metric => {
          const Icon = metric.icon
          return (
            <div key={metric.title} className="payroll-card payroll-metric-card">
              <span className="payroll-metric-icon" style={{ background: `${metric.tone}12`, color: metric.tone }}><Icon size={23} /></span>
              <span>
                <span className="payroll-label">{metric.title}</span>
                <strong className="payroll-value">{metric.value}</strong>
                <small className="payroll-detail" style={{ color: metric.up ? '#16a34a' : '#334155' }}>{metric.up ? 'Up ' : ''}{metric.detail}</small>
              </span>
            </div>
          )
        })}
      </section>

      {notice && <div className="payroll-notice"><span>{notice}</span><button type="button" onClick={() => setNotice('')}>Dismiss</button></div>}

      <section className="payroll-card payroll-inbox-card">
        <div className="payroll-panel-header">
          <div>
            <h2>Employee Request Inbox</h2>
            <p className="payroll-section-subtitle">Live requests submitted from the Employee portal for Finance review.</p>
          </div>
          <strong className="payroll-inbox-count">{pendingFinanceLoans.length + pendingFinanceAllowances.length} waiting</strong>
        </div>
        <div className="payroll-request-grid payroll-request-grid-top">
          <section>
            <h3>Loans & Cash Advances</h3>
            <LoanRequestList
              requests={loanRequests}
              employees={employees}
              onApprove={(request, financeTerms) => saveLoanDecision(request, 'Approved', financeTerms)}
              onReject={request => saveLoanDecision(request, 'Rejected')}
            />
          </section>
          <section>
            <h3>Allowances</h3>
            <AllowanceRequestList
              requests={allowanceRequests}
              onApprove={request => saveAllowanceDecision(request, 'Approved')}
              onReject={request => saveAllowanceDecision(request, 'Rejected')}
            />
          </section>
        </div>
      </section>

      <nav className="payroll-tabs" aria-label="Payroll finance sections">
        {payrollTabs.map(tab => <button key={tab} type="button" onClick={() => setActiveTab(tab)} className={activeTab === tab ? 'is-active' : undefined}>{tab}</button>)}
      </nav>

      {activeTab === 'Payroll Overview' ? (
        <>
      <section className="payroll-grid">
        <div className="payroll-card">
          <div className="payroll-panel-header">
            <h2>Payroll Summary</h2>
            <button type="button" onClick={showPeriodSummary}>By Month <ChevronDown size={14} /></button>
          </div>
          <div className="payroll-chart">
            <div className="payroll-chart-legend"><span className="gross" /> Gross Pay <span className="net" /> Net Pay <span className="total" /> Total Payroll Cost</div>
            {monthlyPayroll.length ? (
              <div className="payroll-bars">
                {monthlyPayroll.map((month, index) => (
                  <div key={`${month.label}-${index}`} className="payroll-month">
                    <div>
                      <span className="bar gross" style={{ height: `${(month.gross / maxPayrollValue) * 100}%` }} />
                      <span className="bar net" style={{ height: `${(month.net / maxPayrollValue) * 100}%` }} />
                      <i style={{ bottom: `${Math.min(92, ((month.gross + month.net) / 2 / maxPayrollValue) * 100)}%` }} />
                    </div>
                    <small>{month.label}</small>
                  </div>
                ))}
              </div>
            ) : <div className="payroll-empty">Payroll chart will appear after HR sends payroll records to Finance.</div>}
          </div>
        </div>

        <div className="payroll-card payroll-cost-card">
          <h2>Payroll Cost & Pay Distribution</h2>
          {totalPayrollCost > 0 ? (
            <div className="payroll-breakdown">
              <div className="payroll-donut" style={{ background: `conic-gradient(#16a34a 0 ${grossCostPercent}%, #2563eb ${grossCostPercent}% 100%)` }}>
                <span><strong>{money(totalPayrollCost).replace('.00', '')}</strong><small>Employer Cost</small></span>
              </div>
              <div className="payroll-breakdown-list">
                <p><span style={{ background: '#16a34a' }} /> Gross Pay <strong>{money(grossPay)} ({grossCostPercent.toFixed(1)}% of employer cost)</strong></p>
                <p><span style={{ background: '#2563eb' }} /> Employer Contributions <strong>{money(employerContributions)} ({employerCostPercent.toFixed(1)}% of employer cost)</strong></p>
                <p className="is-muted"><span style={{ background: '#7c3aed' }} /> Employee Deductions <strong>{money(totalDeductions)} ({deductionPercent.toFixed(1)}% of gross pay)</strong></p>
                <p className="is-muted"><span style={{ background: '#0ea5e9' }} /> Net Pay <strong>{money(netPay)} ({netPayPercent.toFixed(1)}% of gross pay)</strong></p>
              </div>
            </div>
          ) : <div className="payroll-empty">No payroll cost data yet. HR payroll records will populate this breakdown.</div>}
          <div className="payroll-cost-row">
            <span>Employees in Payroll <strong>{payrollEmployeeCount}</strong></span>
            <span>Cost per Employee <strong>{money(costPerEmployee)}</strong></span>
            <span>Departments in Payroll <strong>{currentPayrollDepartments.size}</strong></span>
            <span>Cost per Department (Avg.) <strong>{money(avgDepartmentCost)}</strong></span>
          </div>
        </div>

        <div className="payroll-card">
          <div className="payroll-panel-header">
            <h2>Upcoming Payroll Tasks</h2>
            <Link href="/accounting/payroll-finance">View All</Link>
          </div>
          <div className="payroll-task-list">
            {payrollTasks.map(task => (
              <div key={task.title}>
                <time><small>LIVE</small><strong>{task.status === 'Completed' ? '✓' : '•'}</strong></time>
                <span><strong>{task.title}</strong><small>{task.detail}</small></span>
                <StatusPill value={task.status} />
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="payroll-card payroll-flow-card">
        <div className="payroll-panel-header">
          <div>
            <h2>Employee Requests & Finance Approval</h2>
            <p className="payroll-section-subtitle">Employee request → Finance approval → HR final payroll review → Finance approval and pay release.</p>
          </div>
          <Link href="/hr/payroll">Open HR Payroll</Link>
        </div>
        <div className="payroll-flow-steps">
          {[
            ['1', 'Employee Requests', `${loanRequests.length + allowanceRequests.length} total`],
            ['2', 'Finance Approves', `${pendingFinanceLoans.length + pendingFinanceAllowances.length} waiting`],
            ['3', 'HR Final Payroll', `${payrollReadyLoans.length + payrollReadyAllowances.length} ready for payroll`],
            ['4', 'Finance Release Pay', money(payrollNetPending)],
          ].map(([step, title, detail]) => (
            <div key={step}>
              <b>{step}</b>
              <strong>{title}</strong>
              <small>{detail}</small>
            </div>
          ))}
        </div>
        <div className="payroll-request-grid">
          <section>
            <h3>Final Payroll Queue</h3>
            <PayrollQueue records={finalPayrollQueue} employees={employees} onApprove={approveFinalPayroll} onRelease={releasePay} />
          </section>
        </div>
      </section>

      <section className="payroll-grid payroll-lower-grid">
        <RecentPayrollRuns payrollRuns={payrollRuns} onInspect={inspectPayrollRun} />
        <CompliancePanel complianceItems={complianceItems} latestPeriod={latestPeriod} />
      </section>
        </>
      ) : renderTabContent()}
    </div>
  )
}

const deductionSchedules: DeductionSchedule[] = ['15th payroll', '30th payroll', 'Twice a month', 'One-time']

function LoanRequestList({ requests, employees, onApprove, onReject }: { requests: LoanRequest[]; employees: Employee[]; onApprove: (request: LoanRequest, financeTerms: FinanceLoanTerms) => void; onReject: (request: LoanRequest) => void }) {
  const [termsByRequest, setTermsByRequest] = useState<Record<string, FinanceLoanTerms>>({})
  if (!requests.length) return <div className="payroll-empty">No employee loan or cash advance requests yet.</div>

  const defaultTerms = (request: LoanRequest): FinanceLoanTerms => ({
    repaymentMonths: Math.max(1, Number(request.financeApprovedRepaymentMonths || request.repaymentMonths || 1)),
    deductionSchedule: request.financeApprovedDeductionSchedule || request.deductionSchedule || 'Twice a month',
  })

  const updateTerms = (request: LoanRequest, patch: Partial<FinanceLoanTerms>) => {
    setTermsByRequest(current => ({
      ...current,
      [request.id]: {
        ...defaultTerms(request),
        ...(current[request.id] || {}),
        ...patch,
      },
    }))
  }

  return (
    <div className="payroll-request-list">
      {requests.map(request => {
        const employee = resolveLoanEmployee(request, employees)
        const state = loanApprovalState(request)
        const financeTerms = termsByRequest[request.id] || defaultTerms(request)
        const approvedDeduction = calculateLoanScheduledDeduction({
          ...request,
          repaymentMonths: financeTerms.repaymentMonths,
          deductionSchedule: financeTerms.deductionSchedule,
        })
        const originalMonths = Number(request.requestedRepaymentMonths || request.repaymentMonths || 1)
        const originalSchedule = request.requestedDeductionSchedule || request.deductionSchedule || 'Twice a month'
        const termsAdjusted = financeTerms.repaymentMonths !== originalMonths || financeTerms.deductionSchedule !== originalSchedule
        return (
          <article key={request.id}>
            <div className="request-card-head">
              <span>
                <strong>{request.employeeName || fullName(employee) || 'Employee'}</strong>
                <small>{request.employeeCode || employee?.employeeId || request.department || '-'}</small>
              </span>
              <StatusPill value={request.status === 'Approved' ? 'Completed' : request.status === 'Rejected' ? 'Pending' : 'In Progress'} />
            </div>
            <div className="request-card-body">
              <span><small>Request</small><strong>{loanDisplayName(request)}</strong></span>
              <span><small>Amount</small><strong>{loanMoney(request.amount)}</strong></span>
              <span><small>Employee Requested</small><strong>{originalMonths} month{originalMonths === 1 ? '' : 's'}</strong><small>{originalSchedule}</small></span>
              {request.financeApprovedRepaymentMonths ? <span><small>Finance Approved</small><strong>{request.financeApprovedRepaymentMonths} month{request.financeApprovedRepaymentMonths === 1 ? '' : 's'}</strong><small>{request.financeApprovedDeductionSchedule || request.deductionSchedule || 'Twice a month'}</small></span> : null}
              <span><small>Deduction</small><strong>{loanMoney(loanScheduledDeduction(request))}</strong></span>
              <span><small>Workflow</small><strong>{state.label}</strong></span>
            </div>
            <p>{request.reason || 'No reason provided.'}</p>
            {state.canFinanceDecide ? (
              <>
              <div className="loan-term-review">
                <div className="loan-term-review-copy">
                  <strong>Finance approved terms</strong>
                  <small>Adjust the repayment months if the employee request is not applicable for this amount.</small>
                </div>
                <label>
                  <span>Terms</span>
                  <input
                    type="number"
                    min={1}
                    max={60}
                    value={financeTerms.repaymentMonths}
                    onChange={event => updateTerms(request, { repaymentMonths: Math.max(1, Math.round(Number(event.target.value || 1))) })}
                  />
                </label>
                <label>
                  <span>Schedule</span>
                  <select value={financeTerms.deductionSchedule} onChange={event => updateTerms(request, { deductionSchedule: event.target.value as DeductionSchedule })}>
                    {deductionSchedules.map(schedule => <option key={schedule}>{schedule}</option>)}
                  </select>
                </label>
                <span>
                  <small>Approved deduction</small>
                  <strong>{loanMoney(approvedDeduction)}</strong>
                  {termsAdjusted ? <em>Terms adjusted by Finance</em> : <em>Matches employee request</em>}
                </span>
              </div>
              <div className="request-actions">
                <button type="button" className="approve" onClick={() => onApprove(request, financeTerms)}><CheckCircle2 size={14} /> Approve for HR Payroll</button>
                <button type="button" onClick={() => onReject(request)}><XCircle size={14} /> Reject</button>
              </div>
              </>
            ) : null}
          </article>
        )
      })}
    </div>
  )
}

function AllowanceRequestList({ requests, onApprove, onReject }: { requests: AllowanceRequest[]; onApprove: (request: AllowanceRequest) => void; onReject: (request: AllowanceRequest) => void }) {
  if (!requests.length) return <div className="payroll-empty">No employee allowance requests yet.</div>
  return (
    <div className="payroll-request-list">
      {requests.map(request => {
        const waitingFinance = ['Pending', 'Manager Approved'].includes(request.status) && request.financeDecision !== 'Rejected'
        return (
          <article key={request.id}>
            <div className="request-card-head">
              <span>
                <strong>{request.employeeName || 'Employee'}</strong>
                <small>{request.employeeCode || request.department || '-'}</small>
              </span>
              <StatusPill value={request.status === 'Finance Approved' ? 'Completed' : request.status === 'Rejected' ? 'Rejected' : 'In Progress'} />
            </div>
            <div className="request-card-body">
              <span><small>Request</small><strong>{request.customType || request.type} Allowance</strong></span>
              <span><small>Amount</small><strong>{money(request.amount)}</strong></span>
              <span><small>Date</small><strong>{request.date || '-'}</strong></span>
              <span><small>Finance</small><strong>{request.financeDecision || 'Pending'}</strong></span>
            </div>
            <p>{request.purpose || request.reason || request.remarks || 'No reason provided.'}</p>
            {waitingFinance ? (
              <div className="request-actions">
                <button type="button" className="approve" onClick={() => onApprove(request)}><CheckCircle2 size={14} /> Approve for Payroll</button>
                <button type="button" onClick={() => onReject(request)}><XCircle size={14} /> Reject</button>
              </div>
            ) : null}
          </article>
        )
      })}
    </div>
  )
}

function PayrollQueue({ records, employees, onApprove, onRelease }: { records: PayrollRecord[]; employees: Employee[]; onApprove: (record: PayrollRecord) => void; onRelease: (record: PayrollRecord) => void }) {
  if (!records.length) return <div className="payroll-empty">No HR payroll records waiting for Finance approval.</div>
  return (
    <div className="payroll-request-list">
      {records.map(record => {
        const employee = employees.find(item => item.id === record.employeeId || item.employeeId === record.employeeId)
        const name = fullName(employee) || record.employeeId
        return (
          <article key={record.id}>
            <div className="request-card-head">
              <span>
                <strong>{name}</strong>
                <small>{record.period}</small>
              </span>
              <StatusPill value={record.status === 'Approved' ? 'Pending' : record.status === 'Pending' ? 'In Progress' : record.status} />
            </div>
            <div className="request-card-body">
              <span><small>Gross</small><strong>{money(record.gross)}</strong></span>
              <span><small>Deductions</small><strong>{money(record.deductions)}</strong></span>
              <span><small>Net Pay</small><strong>{money(record.net)}</strong></span>
              <span><small>Status</small><strong>{record.status}</strong></span>
            </div>
            <div className="request-actions">
              {record.status === 'Pending' || record.status === 'Processing' ? <button type="button" className="approve" onClick={() => onApprove(record)}><ShieldCheck size={14} /> Approve final payroll</button> : null}
              {record.status === 'Approved' ? <button type="button" className="approve" onClick={() => onRelease(record)}><Banknote size={14} /> Release pay</button> : null}
            </div>
          </article>
        )
      })}
    </div>
  )
}

function RecentPayrollRuns({ payrollRuns, onInspect }: { payrollRuns: ReturnType<typeof groupPayrollRuns>; onInspect: (period: string) => void }) {
  return (
    <div className="payroll-card">
      <h2>Recent Payroll Runs</h2>
      <div className="payroll-table-wrap">
        <table className="payroll-table">
          <thead><tr>{['Pay Period', 'Pay Date', 'Employees', 'Gross Pay', 'Deductions', 'Net Pay', 'Total Cost', 'Status', 'Actions'].map(col => <th key={col}>{col}</th>)}</tr></thead>
          <tbody>
            {payrollRuns.length ? payrollRuns.map(run => (
              <tr key={run.period}>
                <td data-label="Pay Period">{run.period}</td>
                <td data-label="Pay Date">{formatDate(run.payDate)}</td>
                <td data-label="Employees">{run.employees}</td>
                <td data-label="Gross Pay">{money(run.grossPay)}</td>
                <td data-label="Deductions">{money(run.deductions)}</td>
                <td data-label="Net Pay">{money(run.netPay)}</td>
                <td data-label="Total Cost">{money(run.grossPay)}</td>
                <td data-label="Status"><StatusPill value={run.status} /></td>
                <td data-label="Actions"><button type="button" className="payroll-icon-button" aria-label={`Inspect payroll run ${run.period}`} onClick={() => onInspect(run.period)}><MoreHorizontal size={15} /></button></td>
              </tr>
            )) : <tr><td colSpan={9}><div className="payroll-empty">No payroll runs yet. When HR sends final payroll, it will appear here for Finance approval and pay release.</div></td></tr>}
          </tbody>
        </table>
      </div>
      <div className="payroll-pagination"><strong>{payrollRuns.length ? `Showing ${payrollRuns.length} payroll run${payrollRuns.length === 1 ? '' : 's'}` : 'No payroll runs to show'}</strong></div>
    </div>
  )
}

function CompliancePanel({ complianceItems, latestPeriod }: { complianceItems: Array<{ title: string; amount: number; icon: string }>; latestPeriod: string }) {
  return (
    <div className="payroll-card">
      <div className="payroll-panel-header">
        <h2>Statutory & Compliance</h2>
        <Link href="/accounting/tax-compliance">View All</Link>
      </div>
      <div className="payroll-compliance-list">
        {complianceItems.length ? complianceItems.map(item => (
          <div key={item.title}>
            <span className={`compliance-icon ${item.icon}`}><ShieldCheck size={17} /></span>
            <span className="compliance-main"><strong>{item.title}</strong><small>{periodLabel(latestPeriod)}</small></span>
            <span className="compliance-amount"><strong>{money(item.amount)}</strong><small>From payroll deduction breakdown</small></span>
            <span className="compliance-status"><StatusPill value="Pending" /></span>
          </div>
        )) : <div className="payroll-empty">No statutory contribution data yet. Payroll deduction breakdowns will populate this section.</div>}
      </div>
      <Link className="payroll-calendar-link" href="/accounting/tax-compliance"><CalendarDays size={15} /> View Compliance Calendar <ChevronDown size={15} /></Link>
    </div>
  )
}

const payrollCss = `
.payroll-page { padding: 26px 28px 40px; color: #0f172a; }
.payroll-header { display: flex; justify-content: space-between; align-items: flex-start; gap: 18px; margin-bottom: 24px; }
.payroll-title { margin: 0; font-size: 28px; line-height: 1.1; font-weight: 950; }
.payroll-subtitle { margin: 8px 0 0; color: #334155; font-size: 13.5px; }
.payroll-actions { display: flex; gap: 12px; flex-wrap: wrap; justify-content: flex-end; }
.payroll-actions button, .payroll-actions a, .payroll-panel-header button, .payroll-pagination button { min-height: 38px; border-radius: 8px; border: 1px solid #e8edf4; background: #fff; color: #0f172a; display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 0 12px; font-size: 12.5px; font-weight: 850; cursor: pointer; text-decoration: none; }
.payroll-actions .is-primary { border-color: #16a34a; background: #16a34a; color: #fff; font-weight: 950; }
.payroll-metrics { display: grid; grid-template-columns: repeat(5, minmax(170px, 1fr)); gap: 18px; margin-bottom: 18px; }
.payroll-card { background: #fff; border: 1px solid #e8edf4; border-radius: 8px; padding: 18px; box-shadow: 0 1px 2px rgba(15, 23, 42, .03); }
.payroll-notice { display: flex; justify-content: space-between; gap: 12px; align-items: center; border: 1px solid #bbf7d0; background: #f0fdf4; color: #166534; border-radius: 8px; padding: 12px 14px; margin-bottom: 16px; font-size: 13px; font-weight: 900; }
.payroll-notice button { border: 0; background: transparent; color: #166534; font-weight: 900; cursor: pointer; }
.payroll-inbox-card { margin-bottom: 16px; }
.payroll-inbox-count { min-height: 30px; border-radius: 999px; background: #dcfce7; color: #15803d; display: inline-flex; align-items: center; padding: 0 12px; font-size: 12px; font-weight: 950; white-space: nowrap; }
.payroll-request-grid-top { grid-template-columns: repeat(2, minmax(0, 1fr)) !important; }
.payroll-metric-card { min-height: 100px; display: flex; align-items: center; }
.payroll-metric-icon { width: 54px; height: 54px; border-radius: 9px; display: grid; place-items: center; margin-right: 16px; flex: 0 0 auto; }
.payroll-label { display: block; color: #475569; font-size: 12px; font-weight: 850; }
.payroll-value { display: block; color: #0f172a; font-size: 23px; margin-top: 8px; white-space: nowrap; }
.payroll-detail { display: block; font-size: 11.5px; font-weight: 900; margin-top: 8px; }
.payroll-tabs { display: flex; gap: 32px; border-bottom: 1px solid #e8edf4; padding-left: 14px; overflow-x: auto; }
.payroll-tabs button { border: 0; border-bottom: 2px solid transparent; background: transparent; color: #0f172a; min-height: 48px; padding: 0; font-size: 12.5px; font-weight: 900; cursor: pointer; white-space: nowrap; }
.payroll-tabs .is-active { color: #16a34a; border-bottom-color: #16a34a; }
.payroll-tab-card { margin-top: 16px; }
.payroll-grid { display: grid; grid-template-columns: minmax(0, 1.2fr) minmax(360px, .9fr) minmax(330px, .8fr); gap: 16px; margin-top: 16px; }
.payroll-lower-grid { grid-template-columns: minmax(0, 1fr) 420px; }
.payroll-flow-card { margin-top: 16px; }
.payroll-section-subtitle { margin: 6px 0 0; color: #64748b; font-size: 12.5px; font-weight: 650; }
.payroll-flow-steps { display: grid; grid-template-columns: repeat(4, minmax(160px, 1fr)); gap: 12px; margin-bottom: 16px; }
.payroll-flow-steps div { border: 1px solid #e8edf4; background: #f8fafc; border-radius: 8px; padding: 13px; display: grid; grid-template-columns: 30px minmax(0, 1fr); gap: 4px 10px; align-items: center; }
.payroll-flow-steps b { width: 30px; height: 30px; border-radius: 999px; background: #dcfce7; color: #15803d; display: grid; place-items: center; grid-row: span 2; font-size: 12px; }
.payroll-flow-steps strong { color: #0f172a; font-size: 13px; }
.payroll-flow-steps small { color: #64748b; font-size: 12px; font-weight: 800; }
.payroll-request-grid { display: grid; grid-template-columns: minmax(0, 1.15fr) minmax(320px, .85fr); gap: 16px; }
.payroll-request-grid section { border: 1px solid #e8edf4; border-radius: 8px; overflow: hidden; min-width: 0; }
.payroll-request-grid h3 { margin: 0; padding: 14px 16px; border-bottom: 1px solid #eef2f7; font-size: 15px; font-weight: 950; }
.payroll-request-list { display: grid; gap: 12px; padding: 14px; max-height: 520px; overflow: auto; }
.payroll-request-list article { border: 1px solid #e8edf4; border-radius: 8px; background: #fff; padding: 14px; display: grid; gap: 12px; }
.request-card-head { display: flex; justify-content: space-between; gap: 12px; align-items: flex-start; }
.request-card-head strong { display: block; color: #0f172a; font-size: 13.5px; }
.request-card-head small, .request-card-body small { display: block; color: #64748b; font-size: 11px; font-weight: 850; margin-top: 3px; }
.request-card-body { display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 10px; border-top: 1px solid #f1f5f9; padding-top: 12px; }
.request-card-body strong { display: block; color: #0f172a; font-size: 12.5px; margin-top: 4px; }
.payroll-request-list p { margin: 0; color: #475569; font-size: 12.5px; line-height: 1.45; }
.loan-term-review { display: grid; grid-template-columns: minmax(180px, 1fr) 104px 150px minmax(150px, .9fr); gap: 10px; align-items: end; border: 1px solid #dbeafe; background: #f8fbff; border-radius: 8px; padding: 12px; }
.loan-term-review-copy strong { display: block; color: #0f172a; font-size: 13px; font-weight: 950; }
.loan-term-review-copy small, .loan-term-review span small, .loan-term-review label span { display: block; color: #64748b; font-size: 11px; font-weight: 850; line-height: 1.35; }
.loan-term-review label { display: grid; gap: 6px; min-width: 0; }
.loan-term-review input, .loan-term-review select { width: 100%; min-height: 36px; border: 1px solid #cbd5e1; border-radius: 8px; background: #fff; color: #0f172a; font: inherit; font-size: 12.5px; font-weight: 850; padding: 0 10px; }
.loan-term-review span strong { display: block; color: #0f172a; font-size: 13px; margin-top: 4px; }
.loan-term-review em { display: block; color: #16a34a; font-size: 11px; font-style: normal; font-weight: 900; margin-top: 4px; }
.request-actions { display: flex; justify-content: flex-end; gap: 8px; flex-wrap: wrap; border-top: 1px solid #f1f5f9; padding-top: 12px; }
.request-actions button { min-height: 34px; border: 1px solid #e8edf4; border-radius: 8px; background: #fff; color: #0f172a; display: inline-flex; align-items: center; gap: 7px; padding: 0 11px; font-size: 12px; font-weight: 900; cursor: pointer; }
.request-actions .approve { border-color: #16a34a; background: #16a34a; color: #fff; }
.payroll-empty { min-height: 170px; display: grid; place-items: center; color: #64748b; font-size: 13px; text-align: center; padding: 18px; }
.payroll-panel-header { display: flex; justify-content: space-between; align-items: center; gap: 12px; margin-bottom: 16px; }
.payroll-panel-header h2, .payroll-card h2 { margin: 0; font-size: 16px; font-weight: 950; }
.payroll-panel-header a { color: #2563eb; font-size: 12px; font-weight: 900; text-decoration: none; }
.payroll-chart { min-height: 292px; display: grid; grid-template-rows: auto 1fr; gap: 12px; }
.payroll-chart-legend { display: flex; justify-content: center; gap: 24px; font-size: 12px; font-weight: 850; }
.payroll-chart-legend span { width: 18px; height: 8px; border-radius: 999px; display: inline-block; margin-right: -16px; }
.payroll-chart-legend .gross { background: #16a34a; }
.payroll-chart-legend .net { background: #2563eb; }
.payroll-chart-legend .total { background: #f59e0b; height: 3px; }
.payroll-bars { min-height: 230px; display: grid; grid-template-columns: repeat(6, 1fr); gap: 16px; align-items: end; border-left: 1px solid #eef2f7; border-bottom: 1px solid #eef2f7; padding: 20px 8px 0; }
.payroll-month { height: 100%; display: grid; grid-template-rows: 1fr 24px; align-items: end; text-align: center; }
.payroll-month > div { height: 100%; position: relative; display: flex; align-items: end; justify-content: center; gap: 10px; }
.bar { width: 18px; border-radius: 3px 3px 0 0; }
.bar.gross { background: #16a34a; }
.bar.net { background: #2563eb; }
.payroll-month i { position: absolute; width: 8px; height: 8px; border-radius: 999px; background: #f59e0b; }
.payroll-month small { color: #334155; font-size: 11px; }
.payroll-cost-card { display: flex; flex-direction: column; }
.payroll-breakdown { display: grid; grid-template-columns: 172px minmax(0, 1fr); gap: 22px; align-items: center; }
.payroll-donut { width: 156px; height: 156px; border-radius: 50%; display: grid; place-items: center; }
.payroll-donut span { width: 96px; height: 96px; border-radius: 50%; background: #fff; display: grid; place-items: center; text-align: center; }
.payroll-donut strong { font-size: 20px; }
.payroll-donut small { color: #64748b; font-size: 12px; font-weight: 850; }
.payroll-breakdown-list { display: grid; gap: 12px; }
.payroll-breakdown-list p { margin: 0; display: grid; grid-template-columns: 12px minmax(0, 1fr); gap: 10px; font-size: 13px; }
.payroll-breakdown-list p span { width: 12px; height: 12px; border-radius: 4px; margin-top: 3px; }
.payroll-breakdown-list strong { display: block; margin-top: 3px; color: #334155; line-height: 1.35; }
.payroll-breakdown-list .is-muted { color: #475569; }
.payroll-cost-row { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); margin-top: auto; background: #f8fafc; border-radius: 8px; overflow: hidden; }
.payroll-cost-row span { padding: 14px; color: #334155; font-size: 12.5px; }
.payroll-cost-row strong { display: block; color: #0f172a; font-size: 16px; margin-top: 6px; }
.payroll-task-list, .payroll-compliance-list { display: grid; gap: 14px; }
.payroll-task-list div { display: grid; grid-template-columns: 48px minmax(0, 1fr) auto; gap: 12px; align-items: center; border-bottom: 1px solid #eef2f7; padding-bottom: 13px; }
.payroll-task-list time small { display: block; color: #16a34a; font-size: 10px; font-weight: 950; }
.payroll-task-list time strong { display: block; font-size: 22px; }
.payroll-task-list span small { display: block; color: #64748b; margin-top: 4px; }
.payroll-pill { display: inline-flex; min-height: 24px; border-radius: 6px; align-items: center; padding: 0 9px; font-size: 11.5px; font-weight: 900; }
.payroll-pill.completed, .payroll-pill.paid { background: #dcfce7; color: #15803d; }
.payroll-pill.in-progress { background: #dbeafe; color: #2563eb; }
.payroll-pill.pending, .payroll-pill.approved { background: #fff7ed; color: #d97706; }
.payroll-pill.upcoming { background: #f1f5f9; color: #475569; }
.payroll-table-wrap { overflow-x: auto; }
.payroll-table { width: 100%; min-width: 880px; border-collapse: collapse; }
.payroll-table th { text-align: left; padding: 12px 10px; color: #64748b; font-size: 11px; font-weight: 900; }
.payroll-table td { padding: 12px 10px; border-top: 1px solid #eef2f7; color: #0f172a; font-size: 12.5px; }
.payroll-icon-button { width: 32px; height: 32px; border: 1px solid #e8edf4; border-radius: 7px; background: #fff; display: grid; place-items: center; cursor: pointer; }
.payroll-inline-action { min-height: 30px; border: 1px solid #16a34a; border-radius: 7px; background: #16a34a; color: #fff; padding: 0 10px; font-size: 11.5px; font-weight: 900; cursor: pointer; }
.payroll-pagination { display: flex; justify-content: space-between; align-items: center; gap: 16px; padding-top: 16px; }
.payroll-pagination strong { font-size: 12.5px; }
.payroll-pagination div { display: flex; gap: 8px; flex-wrap: wrap; justify-content: flex-end; }
.payroll-pagination .is-active { background: #16a34a; color: #fff; border-color: #16a34a; }
.payroll-compliance-list div { display: grid; grid-template-columns: 42px minmax(0, 1fr) minmax(120px, auto); align-items: center; gap: 12px; border-bottom: 1px solid #eef2f7; padding-bottom: 13px; }
.compliance-icon { width: 38px; height: 38px; border-radius: 9px; display: grid; place-items: center; background: #f3e8ff; color: #7c3aed; }
.compliance-icon.sss { background: #eff6ff; color: #2563eb; }
.compliance-icon.health { background: #fef2f2; color: #ef4444; }
.compliance-icon.housing { background: #dbeafe; color: #2563eb; }
.compliance-main, .compliance-amount { min-width: 0; }
.compliance-main strong, .compliance-amount strong { display: block; overflow-wrap: anywhere; line-height: 1.25; }
.compliance-amount { text-align: right; justify-self: end; }
.compliance-status { grid-column: 3; justify-self: end; margin-top: -4px; }
.payroll-compliance-list small { display: block; color: #64748b; margin-top: 4px; }
.payroll-calendar-link { min-height: 44px; background: #f8fafc; border-radius: 8px; margin-top: 16px; display: flex; align-items: center; justify-content: center; gap: 10px; color: #2563eb; text-decoration: none; font-size: 13px; font-weight: 900; }
@media (max-width: 1280px) {
  .payroll-page { padding: 22px; }
  .payroll-header { flex-direction: column; }
  .payroll-actions { width: 100%; justify-content: flex-start; }
  .payroll-metrics { grid-template-columns: repeat(3, minmax(180px, 1fr)); }
  .payroll-grid, .payroll-lower-grid { grid-template-columns: 1fr; }
  .payroll-flow-steps, .payroll-request-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .loan-term-review { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}
@media (max-width: 900px) {
  .payroll-metrics { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .payroll-breakdown, .payroll-cost-row { grid-template-columns: 1fr; }
  .payroll-compliance-list div { grid-template-columns: 42px minmax(0, 1fr) auto; }
  .payroll-pagination { flex-direction: column; align-items: flex-start; }
  .payroll-request-grid { grid-template-columns: 1fr; }
  .loan-term-review { grid-template-columns: minmax(180px, 1fr) minmax(110px, .55fr); }
}
@media (max-width: 640px) {
  .payroll-page { padding: 16px; }
  .payroll-title { font-size: 24px; }
  .payroll-actions, .payroll-metrics { display: grid; grid-template-columns: 1fr; }
  .payroll-value { font-size: 21px; }
  .payroll-tabs { margin-left: -16px; margin-right: -16px; padding-left: 16px; padding-right: 16px; }
  .payroll-card { padding: 14px; }
  .payroll-flow-steps { grid-template-columns: 1fr; }
  .loan-term-review { grid-template-columns: 1fr; }
  .payroll-bars { overflow-x: auto; grid-template-columns: repeat(6, 48px); }
  .payroll-task-list div { grid-template-columns: 42px minmax(0, 1fr); }
  .payroll-task-list .payroll-pill { grid-column: 2; justify-self: start; }
  .payroll-compliance-list div { grid-template-columns: 38px minmax(0, 1fr); align-items: start; }
  .compliance-amount { grid-column: 2; justify-self: start; text-align: left; margin-top: 6px; }
  .compliance-status { grid-column: 2; justify-self: start; margin-top: 8px; }
  .payroll-table-wrap { overflow: visible; }
  .payroll-table, .payroll-table thead, .payroll-table tbody, .payroll-table tr, .payroll-table td { display: block; width: 100%; min-width: 0; }
  .payroll-table thead { display: none; }
  .payroll-table tr { border: 1px solid #eef2f7; border-radius: 8px; margin-bottom: 12px; background: #fff; overflow: hidden; }
  .payroll-table td { border-top: 0; display: grid; grid-template-columns: 112px minmax(0, 1fr); gap: 10px; padding: 10px 12px; }
  .payroll-table td::before { content: attr(data-label); color: #64748b; font-size: 11px; font-weight: 900; text-transform: uppercase; }
}
`
