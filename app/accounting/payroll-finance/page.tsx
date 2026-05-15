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
  decideLoanRequest,
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

function money(value: number) {
  return `PHP ${Number(value || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function StatusPill({ value }: { value: string }) {
  return <span className={`payroll-pill ${value.toLowerCase().replaceAll(' ', '-')}`}>{value}</span>
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

export default function PayrollFinancePage() {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loanRequests, setLoanRequests] = useState<LoanRequest[]>([])
  const [allowanceRequests, setAllowanceRequests] = useState<AllowanceRequest[]>([])
  const [payrollRecords, setPayrollRecords] = useState<PayrollRecord[]>([])
  const [notice, setNotice] = useState('')

  useEffect(() => {
    const loadFinanceData = () => {
      setEmployees(loadStored<Employee[]>(employeeKey, []))
      setLoanRequests(loadStored<LoanRequest[]>(loanRequestKey, []))
      setAllowanceRequests(loadEnterpriseStored<AllowanceRequest[]>(allowanceRequestKey, []))
      setPayrollRecords(loadStored<PayrollRecord[]>(payrollRecordKey, []))
    }

    loadFinanceData()
    window.addEventListener('storage', loadFinanceData)
    window.addEventListener('focus', loadFinanceData)
    return () => {
      window.removeEventListener('storage', loadFinanceData)
      window.removeEventListener('focus', loadFinanceData)
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
  const costPerEmployee = activeEmployees.length ? totalPayrollCost / activeEmployees.length : 0
  const departments = new Set(activeEmployees.map(employee => employee.department).filter(Boolean))
  const avgDepartmentCost = departments.size ? totalPayrollCost / departments.size : 0
  const monthlyPayroll = useMemo(() => buildPayrollTrend(payrollRuns), [payrollRuns])
  const maxPayrollValue = Math.max(1, ...monthlyPayroll.flatMap(month => [month.gross, month.net]))
  const complianceItems = useMemo(() => buildComplianceRows(currentPayrollRecords), [currentPayrollRecords])
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

  function saveLoanDecision(request: LoanRequest, decision: 'Approved' | 'Rejected') {
    const employee = resolveLoanEmployee(request, employees)
    const nextRequests = loanRequests.map(item => item.id === request.id ? decideLoanRequest(item, employee, 'finance', decision) : item)
    setLoanRequests(nextRequests)
    saveLoanRequests(nextRequests)
    setNotice(`${loanDisplayName(request)} for ${request.employeeName || fullName(employee) || 'employee'} ${decision.toLowerCase()} by Finance. ${decision === 'Approved' ? 'HR can now include it in final payroll.' : 'The employee request was rejected.'}`)
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

  function saveAllowanceDecision(request: AllowanceRequest, decision: 'Approved' | 'Rejected') {
    const now = new Date().toISOString()
    const next = allowanceRequests.map(item => item.id === request.id ? {
      ...item,
      status: decision === 'Approved' ? 'Finance Approved' as const : 'Rejected' as const,
      financeDecision: decision,
      updatedAt: now,
    } : item)
    setAllowanceRequests(next)
    saveEnterpriseStored(allowanceRequestKey, next)
    window.dispatchEvent(new Event('storage'))
    setNotice(`${request.customType || request.type} allowance for ${request.employeeName || 'employee'} ${decision.toLowerCase()} by Finance.`)
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
          <button type="button"><CalendarDays size={15} /> Period</button>
          <button type="button"><CalendarDays size={15} /> {periodLabel(latestPeriod)} <ChevronDown size={14} /></button>
          <button type="button"><Filter size={15} /> Filters</button>
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

      <nav className="payroll-tabs" aria-label="Payroll finance sections">
        {['Payroll Overview', 'Employees', 'Earnings', 'Deductions', 'Taxes & Contributions', 'Payments', 'Journal Entries', 'Payroll History'].map((tab, index) => <button key={tab} className={index === 0 ? 'is-active' : undefined}>{tab}</button>)}
      </nav>

      <section className="payroll-grid">
        <div className="payroll-card">
          <div className="payroll-panel-header">
            <h2>Payroll Summary</h2>
            <button type="button">By Month <ChevronDown size={14} /></button>
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

        <div className="payroll-card">
          <h2>Payroll Cost Breakdown</h2>
          {totalPayrollCost > 0 ? (
            <div className="payroll-breakdown">
              <div className="payroll-donut" style={{ background: `conic-gradient(#16a34a 0 ${(grossPay / Math.max(totalPayrollCost, 1)) * 100}%, #2563eb ${(grossPay / Math.max(totalPayrollCost, 1)) * 100}% ${((grossPay + employerContributions) / Math.max(totalPayrollCost, 1)) * 100}%, #7c3aed ${((grossPay + employerContributions) / Math.max(totalPayrollCost, 1)) * 100}% 100%)` }}>
                <span><strong>{money(totalPayrollCost).replace('.00', '')}</strong><small>Total Cost</small></span>
              </div>
              <div className="payroll-breakdown-list">
                <p><span style={{ background: '#16a34a' }} /> Gross Pay <strong>{money(grossPay)} ({((grossPay / Math.max(totalPayrollCost, 1)) * 100).toFixed(1)}%)</strong></p>
                <p><span style={{ background: '#2563eb' }} /> Employer Contributions <strong>{money(employerContributions)} ({((employerContributions / Math.max(totalPayrollCost, 1)) * 100).toFixed(1)}%)</strong></p>
                <p><span style={{ background: '#7c3aed' }} /> Deductions <strong>{money(totalDeductions)} ({((totalDeductions / Math.max(totalPayrollCost, 1)) * 100).toFixed(1)}%)</strong></p>
              </div>
            </div>
          ) : <div className="payroll-empty">No payroll cost data yet. HR payroll records will populate this breakdown.</div>}
          <div className="payroll-cost-row">
            <span>Cost per Employee <strong>{money(costPerEmployee)}</strong></span>
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
            <h3>Loan & Cash Advance Requests</h3>
            <LoanRequestList
              requests={loanRequests}
              employees={employees}
              onApprove={request => saveLoanDecision(request, 'Approved')}
              onReject={request => saveLoanDecision(request, 'Rejected')}
            />
          </section>
          <section>
            <h3>Allowance Requests</h3>
            <AllowanceRequestList
              requests={allowanceRequests}
              onApprove={request => saveAllowanceDecision(request, 'Approved')}
              onReject={request => saveAllowanceDecision(request, 'Rejected')}
            />
          </section>
          <section>
            <h3>Final Payroll Queue</h3>
            <PayrollQueue records={finalPayrollQueue} employees={employees} onApprove={approveFinalPayroll} onRelease={releasePay} />
          </section>
        </div>
      </section>

      <section className="payroll-grid payroll-lower-grid">
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
                    <td data-label="Actions"><button type="button" className="payroll-icon-button"><MoreHorizontal size={15} /></button></td>
                  </tr>
                )) : <tr><td colSpan={9}><div className="payroll-empty">No payroll runs yet. When HR sends final payroll, it will appear here for Finance approval and pay release.</div></td></tr>}
              </tbody>
            </table>
          </div>
          <div className="payroll-pagination"><strong>{payrollRuns.length ? `Showing ${payrollRuns.length} payroll run${payrollRuns.length === 1 ? '' : 's'}` : 'No payroll runs to show'}</strong></div>
        </div>

        <div className="payroll-card">
          <div className="payroll-panel-header">
            <h2>Statutory & Compliance</h2>
            <Link href="/accounting/tax-compliance">View All</Link>
          </div>
          <div className="payroll-compliance-list">
            {complianceItems.length ? complianceItems.map(item => (
              <div key={item.title}>
                <span className={`compliance-icon ${item.icon}`}><ShieldCheck size={17} /></span>
                <span><strong>{item.title}</strong><small>{periodLabel(latestPeriod)}</small></span>
                <span><strong>{money(item.amount)}</strong><small>From payroll deduction breakdown</small></span>
                <StatusPill value="Pending" />
              </div>
            )) : <div className="payroll-empty">No statutory contribution data yet. Payroll deduction breakdowns will populate this section.</div>}
          </div>
          <Link className="payroll-calendar-link" href="/accounting/tax-compliance"><CalendarDays size={15} /> View Compliance Calendar <ChevronDown size={15} /></Link>
        </div>
      </section>
    </div>
  )
}

function LoanRequestList({ requests, employees, onApprove, onReject }: { requests: LoanRequest[]; employees: Employee[]; onApprove: (request: LoanRequest) => void; onReject: (request: LoanRequest) => void }) {
  if (!requests.length) return <div className="payroll-empty">No employee loan or cash advance requests yet.</div>
  return (
    <div className="payroll-request-list">
      {requests.map(request => {
        const employee = resolveLoanEmployee(request, employees)
        const state = loanApprovalState(request)
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
              <span><small>Deduction</small><strong>{loanMoney(loanScheduledDeduction(request))}</strong></span>
              <span><small>Workflow</small><strong>{state.label}</strong></span>
            </div>
            <p>{request.reason || 'No reason provided.'}</p>
            {state.canFinanceDecide ? (
              <div className="request-actions">
                <button type="button" className="approve" onClick={() => onApprove(request)}><CheckCircle2 size={14} /> Approve for HR Payroll</button>
                <button type="button" onClick={() => onReject(request)}><XCircle size={14} /> Reject</button>
              </div>
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
.payroll-metric-card { min-height: 100px; display: flex; align-items: center; }
.payroll-metric-icon { width: 54px; height: 54px; border-radius: 9px; display: grid; place-items: center; margin-right: 16px; flex: 0 0 auto; }
.payroll-label { display: block; color: #475569; font-size: 12px; font-weight: 850; }
.payroll-value { display: block; color: #0f172a; font-size: 23px; margin-top: 8px; white-space: nowrap; }
.payroll-detail { display: block; font-size: 11.5px; font-weight: 900; margin-top: 8px; }
.payroll-tabs { display: flex; gap: 32px; border-bottom: 1px solid #e8edf4; padding-left: 14px; overflow-x: auto; }
.payroll-tabs button { border: 0; border-bottom: 2px solid transparent; background: transparent; color: #0f172a; min-height: 48px; padding: 0; font-size: 12.5px; font-weight: 900; cursor: pointer; white-space: nowrap; }
.payroll-tabs .is-active { color: #16a34a; border-bottom-color: #16a34a; }
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
.payroll-breakdown { display: grid; grid-template-columns: 180px minmax(0, 1fr); gap: 24px; align-items: center; }
.payroll-donut { width: 156px; height: 156px; border-radius: 50%; display: grid; place-items: center; }
.payroll-donut span { width: 96px; height: 96px; border-radius: 50%; background: #fff; display: grid; place-items: center; text-align: center; }
.payroll-donut strong { font-size: 20px; }
.payroll-donut small { color: #64748b; font-size: 12px; font-weight: 850; }
.payroll-breakdown-list { display: grid; gap: 18px; }
.payroll-breakdown-list p { margin: 0; display: grid; grid-template-columns: 12px minmax(0, 1fr); gap: 10px; font-size: 13px; }
.payroll-breakdown-list p span { width: 12px; height: 12px; border-radius: 4px; margin-top: 3px; }
.payroll-breakdown-list strong { display: block; margin-top: 3px; color: #334155; }
.payroll-cost-row { display: grid; grid-template-columns: 1fr 1fr; margin-top: 18px; background: #f8fafc; border-radius: 8px; overflow: hidden; }
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
.payroll-icon-button { width: 32px; height: 32px; border: 1px solid #e8edf4; border-radius: 7px; background: #fff; display: grid; place-items: center; }
.payroll-pagination { display: flex; justify-content: space-between; align-items: center; gap: 16px; padding-top: 16px; }
.payroll-pagination strong { font-size: 12.5px; }
.payroll-pagination div { display: flex; gap: 8px; flex-wrap: wrap; justify-content: flex-end; }
.payroll-pagination .is-active { background: #16a34a; color: #fff; border-color: #16a34a; }
.payroll-compliance-list div { display: grid; grid-template-columns: 42px minmax(0, 1fr) auto auto; align-items: center; gap: 12px; border-bottom: 1px solid #eef2f7; padding-bottom: 13px; }
.compliance-icon { width: 38px; height: 38px; border-radius: 9px; display: grid; place-items: center; background: #f3e8ff; color: #7c3aed; }
.compliance-icon.sss { background: #eff6ff; color: #2563eb; }
.compliance-icon.health { background: #fef2f2; color: #ef4444; }
.compliance-icon.housing { background: #dbeafe; color: #2563eb; }
.payroll-compliance-list small { display: block; color: #64748b; margin-top: 4px; }
.payroll-calendar-link { min-height: 44px; background: #f8fafc; border-radius: 8px; margin-top: 16px; display: flex; align-items: center; justify-content: center; gap: 10px; color: #2563eb; text-decoration: none; font-size: 13px; font-weight: 900; }
@media (max-width: 1280px) {
  .payroll-page { padding: 22px; }
  .payroll-header { flex-direction: column; }
  .payroll-actions { width: 100%; justify-content: flex-start; }
  .payroll-metrics { grid-template-columns: repeat(3, minmax(180px, 1fr)); }
  .payroll-grid, .payroll-lower-grid { grid-template-columns: 1fr; }
  .payroll-flow-steps, .payroll-request-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}
@media (max-width: 900px) {
  .payroll-metrics { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .payroll-breakdown, .payroll-cost-row { grid-template-columns: 1fr; }
  .payroll-compliance-list div { grid-template-columns: 42px minmax(0, 1fr); }
  .payroll-pagination { flex-direction: column; align-items: flex-start; }
  .payroll-request-grid { grid-template-columns: 1fr; }
}
@media (max-width: 640px) {
  .payroll-page { padding: 16px; }
  .payroll-title { font-size: 24px; }
  .payroll-actions, .payroll-metrics { display: grid; grid-template-columns: 1fr; }
  .payroll-value { font-size: 21px; }
  .payroll-tabs { margin-left: -16px; margin-right: -16px; padding-left: 16px; padding-right: 16px; }
  .payroll-card { padding: 14px; }
  .payroll-flow-steps { grid-template-columns: 1fr; }
  .payroll-bars { overflow-x: auto; grid-template-columns: repeat(6, 48px); }
  .payroll-task-list div { grid-template-columns: 42px minmax(0, 1fr); }
  .payroll-task-list .payroll-pill { grid-column: 2; justify-self: start; }
  .payroll-table-wrap { overflow: visible; }
  .payroll-table, .payroll-table thead, .payroll-table tbody, .payroll-table tr, .payroll-table td { display: block; width: 100%; min-width: 0; }
  .payroll-table thead { display: none; }
  .payroll-table tr { border: 1px solid #eef2f7; border-radius: 8px; margin-bottom: 12px; background: #fff; overflow: hidden; }
  .payroll-table td { border-top: 0; display: grid; grid-template-columns: 112px minmax(0, 1fr); gap: 10px; padding: 10px 12px; }
  .payroll-table td::before { content: attr(data-label); color: #64748b; font-size: 11px; font-weight: 900; text-transform: uppercase; }
}
`
