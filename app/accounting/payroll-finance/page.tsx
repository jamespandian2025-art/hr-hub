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

const font = 'var(--font-body)'

type PayrollRun = {
  period: string
  payDate: string
  employees: number
  grossPay: number
  deductions: number
  netPay: number
  status: 'Completed' | 'In Progress'
}

type PayrollTask = {
  month: string
  day: string
  title: string
  detail: string
  status: 'Completed' | 'In Progress' | 'Pending' | 'Upcoming'
}

type ComplianceItem = {
  title: string
  period: string
  amount: number
  paidDate: string
  icon: 'tax' | 'sss' | 'health' | 'housing'
}

type PayrollStatus = 'Paid' | 'Pending' | 'Processing' | 'Approved'

type PayrollRecord = {
  id: string
  employeeId: string
  period: string
  gross: number
  deductions: number
  net: number
  status: PayrollStatus
  source?: 'payroll-run'
  paidAt?: string
  createdAt: string
}

const payrollRuns: PayrollRun[] = [
  { period: 'May 1 - May 31, 2024', payDate: 'May 31, 2024', employees: 72, grossPay: 198450, deductions: 28650, netPay: 169800, status: 'In Progress' },
  { period: 'Apr 1 - Apr 30, 2024', payDate: 'Apr 30, 2024', employees: 70, grossPay: 187250, deductions: 27150, netPay: 160100, status: 'Completed' },
  { period: 'Mar 1 - Mar 31, 2024', payDate: 'Mar 31, 2024', employees: 69, grossPay: 182400, deductions: 26650, netPay: 155750, status: 'Completed' },
  { period: 'Feb 1 - Feb 29, 2024', payDate: 'Feb 29, 2024', employees: 68, grossPay: 178300, deductions: 25900, netPay: 152400, status: 'Completed' },
  { period: 'Jan 1 - Jan 31, 2024', payDate: 'Jan 31, 2024', employees: 67, grossPay: 175100, deductions: 25200, netPay: 149900, status: 'Completed' },
]

const payrollTasks: PayrollTask[] = [
  { month: 'MAY', day: '28', title: 'Review Attendance', detail: 'Review employee attendance and exceptions', status: 'Completed' },
  { month: 'MAY', day: '29', title: 'Process Payroll', detail: 'Calculate salaries, deductions and taxes', status: 'In Progress' },
  { month: 'MAY', day: '30', title: 'Management Approval', detail: 'Review and approve payroll summary', status: 'Pending' },
  { month: 'MAY', day: '31', title: 'Disburse Payments', detail: 'Disburse salary payments to employees', status: 'Upcoming' },
  { month: 'JUN', day: '01', title: 'File Government Reports', detail: 'Submit statutory reports and remittances', status: 'Upcoming' },
]

const complianceItems: ComplianceItem[] = [
  { title: 'Tax Withholding (BIR)', period: 'May 2024', amount: 18450, paidDate: 'May 20, 2024', icon: 'tax' },
  { title: 'SSS Contribution', period: 'May 2024', amount: 9850, paidDate: 'May 20, 2024', icon: 'sss' },
  { title: 'PhilHealth Contribution', period: 'May 2024', amount: 4250, paidDate: 'May 20, 2024', icon: 'health' },
  { title: 'Pag-IBIG Contribution', period: 'May 2024', amount: 3150, paidDate: 'May 20, 2024', icon: 'housing' },
]

const monthlyPayroll = [
  { label: "Dec '23", gross: 210000, net: 151000 },
  { label: "Jan '24", gross: 208000, net: 165000 },
  { label: "Feb '24", gross: 198000, net: 151000 },
  { label: "Mar '24", gross: 190000, net: 148000 },
  { label: "Apr '24", gross: 198000, net: 156000 },
  { label: "May '24", gross: 218000, net: 176000 },
]

const payrollRecordKey = 'flowsys-hr-payroll-records'

function money(value: number) {
  return `$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function StatusPill({ value }: { value: string }) {
  return <span className={`payroll-pill ${value.toLowerCase().replaceAll(' ', '-')}`}>{value}</span>
}

export default function PayrollFinancePage() {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loanRequests, setLoanRequests] = useState<LoanRequest[]>([])
  const [payrollRecords, setPayrollRecords] = useState<PayrollRecord[]>([])
  const [notice, setNotice] = useState('')

  useEffect(() => {
    const loadFinanceData = () => {
      setEmployees(loadStored<Employee[]>(employeeKey, []))
      setLoanRequests(loadStored<LoanRequest[]>(loanRequestKey, []))
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

  const current = payrollRuns[0]
  const pendingFinanceLoans = useMemo(() => loanRequests.filter(request => request.status === 'Pending' && loanApprovalState(request).canFinanceDecide), [loanRequests])
  const payrollReadyLoans = useMemo(() => loanRequests.filter(request => request.status === 'Approved' && request.approvalStep === 'payroll'), [loanRequests])
  const finalPayrollQueue = useMemo(() => payrollRecords.filter(record => record.source === 'payroll-run' && record.status !== 'Paid'), [payrollRecords])
  const payrollNetPending = finalPayrollQueue.reduce((sum, record) => sum + Number(record.net || 0), 0)
  const employerContributions = complianceItems.reduce((sum, item) => sum + item.amount, 0) - 6050
  const totalPayrollCost = current.grossPay + employerContributions
  const totalDeductions = current.deductions
  const costPerEmployee = totalPayrollCost / current.employees
  const avgDepartmentCost = totalPayrollCost / 12
  const metrics = [
    { title: 'Total Payroll Cost', value: money(totalPayrollCost), detail: '8.6% vs last pay period', icon: Banknote, tone: '#16a34a', up: true },
    { title: 'Gross Pay', value: money(current.grossPay), detail: `${current.employees} Employees`, icon: UserRound, tone: '#2563eb' },
    { title: 'Deductions', value: money(totalDeductions), detail: `${((totalDeductions / current.grossPay) * 100).toFixed(1)}% of gross pay`, icon: Coins, tone: '#7c3aed' },
    { title: 'Employer Contributions', value: money(employerContributions), detail: `${((employerContributions / totalPayrollCost) * 100).toFixed(1)}% of gross pay`, icon: Landmark, tone: '#f59e0b' },
    { title: 'Net Pay', value: money(current.netPay), detail: `${((current.netPay / current.grossPay) * 100).toFixed(1)}% of gross pay`, icon: FileText, tone: '#ef4444' },
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
          <button type="button"><CalendarDays size={15} /> May 1 - May 31, 2024 <ChevronDown size={14} /></button>
          <button type="button"><Filter size={15} /> Filters</button>
          <button type="button" className="is-primary"><Play size={15} /> Run Payroll <ChevronDown size={13} /></button>
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
            <div className="payroll-bars">
              {monthlyPayroll.map((month, index) => (
                <div key={month.label} className="payroll-month">
                  <div>
                    <span className="bar gross" style={{ height: `${(month.gross / 260000) * 100}%` }} />
                    <span className="bar net" style={{ height: `${(month.net / 260000) * 100}%` }} />
                    <i style={{ bottom: `${Math.min(92, 58 + index * 6)}%` }} />
                  </div>
                  <small>{month.label}</small>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="payroll-card">
          <h2>Payroll Cost Breakdown</h2>
          <div className="payroll-breakdown">
            <div className="payroll-donut" style={{ background: `conic-gradient(#16a34a 0 ${(current.grossPay / totalPayrollCost) * 100}%, #2563eb ${(current.grossPay / totalPayrollCost) * 100}% ${((current.grossPay + employerContributions) / totalPayrollCost) * 100}%, #7c3aed ${((current.grossPay + employerContributions) / totalPayrollCost) * 100}% 100%)` }}>
              <span><strong>{money(totalPayrollCost).replace('.00', '')}</strong><small>Total Cost</small></span>
            </div>
            <div className="payroll-breakdown-list">
              <p><span style={{ background: '#16a34a' }} /> Gross Pay <strong>{money(current.grossPay)} ({((current.grossPay / totalPayrollCost) * 100).toFixed(1)}%)</strong></p>
              <p><span style={{ background: '#2563eb' }} /> Employer Contributions <strong>{money(employerContributions)} ({((employerContributions / totalPayrollCost) * 100).toFixed(1)}%)</strong></p>
              <p><span style={{ background: '#7c3aed' }} /> Deductions <strong>{money(totalDeductions)} ({((totalDeductions / totalPayrollCost) * 100).toFixed(1)}%)</strong></p>
            </div>
          </div>
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
              <div key={`${task.month}-${task.day}-${task.title}`}>
                <time><small>{task.month}</small><strong>{task.day}</strong></time>
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
            ['1', 'Employee Requests', `${loanRequests.length} total`],
            ['2', 'Finance Approves', `${pendingFinanceLoans.length} waiting`],
            ['3', 'HR Final Payroll', `${payrollReadyLoans.length} ready for payroll`],
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
            <RequestList
              requests={loanRequests}
              employees={employees}
              onApprove={request => saveLoanDecision(request, 'Approved')}
              onReject={request => saveLoanDecision(request, 'Rejected')}
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
                {payrollRuns.map(run => (
                  <tr key={run.period}>
                    <td data-label="Pay Period">{run.period}</td>
                    <td data-label="Pay Date">{run.payDate}</td>
                    <td data-label="Employees">{run.employees}</td>
                    <td data-label="Gross Pay">{money(run.grossPay)}</td>
                    <td data-label="Deductions">{money(run.deductions)}</td>
                    <td data-label="Net Pay">{money(run.netPay)}</td>
                    <td data-label="Total Cost">{money(run.grossPay + employerContributions)}</td>
                    <td data-label="Status"><StatusPill value={run.status} /></td>
                    <td data-label="Actions"><button type="button" className="payroll-icon-button"><MoreHorizontal size={15} /></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="payroll-pagination"><strong>Showing 1 to {payrollRuns.length} of 12 payroll runs</strong><div>{['‹', '1', '2', '3', '...', '12', '›'].map((p, i) => <button key={`${p}-${i}`} className={p === '1' ? 'is-active' : undefined}>{p}</button>)}<button>5 / page <ChevronDown size={14} /></button></div></div>
        </div>

        <div className="payroll-card">
          <div className="payroll-panel-header">
            <h2>Statutory & Compliance</h2>
            <Link href="/accounting/tax-compliance">View All</Link>
          </div>
          <div className="payroll-compliance-list">
            {complianceItems.map(item => (
              <div key={item.title}>
                <span className={`compliance-icon ${item.icon}`}><ShieldCheck size={17} /></span>
                <span><strong>{item.title}</strong><small>{item.period}</small></span>
                <span><strong>{money(item.amount)}</strong><small>Paid on {item.paidDate}</small></span>
                <StatusPill value="Paid" />
              </div>
            ))}
          </div>
          <Link className="payroll-calendar-link" href="/accounting/tax-compliance"><CalendarDays size={15} /> View Compliance Calendar <ChevronDown size={15} /></Link>
        </div>
      </section>
    </div>
  )
}

function RequestList({ requests, employees, onApprove, onReject }: { requests: LoanRequest[]; employees: Employee[]; onApprove: (request: LoanRequest) => void; onReject: (request: LoanRequest) => void }) {
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
.payroll-actions button, .payroll-panel-header button, .payroll-pagination button { min-height: 38px; border-radius: 8px; border: 1px solid #e8edf4; background: #fff; color: #0f172a; display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 0 12px; font-size: 12.5px; font-weight: 850; cursor: pointer; }
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
