'use client'

import Link from 'next/link'
import { CheckCircle2, Clock3, HandCoins, Plus, Wallet, XCircle } from 'lucide-react'
import type { ComponentType } from 'react'
import {
  Employee,
  formatDateTime,
  fullName,
  initials,
  useEmployeePortalData,
} from '../employeeData'
import {
  isTrackableLoanBalance,
  loanBalanceAmount,
  loanApprovalState,
  loanDisplayName,
  loanPaidAmount,
  loanRemainingTerms,
  loanScheduledDeduction,
  LoanRequest,
  money,
  resolveLoanEmployee,
} from '@/app/hr/loan-requests/loanData'

export default function EmployeeLoanRequestsPage() {
  const { employees, myLoanRequests } = useEmployeePortalData()

  const stats = [
    { label: 'Total Requests', value: myLoanRequests.length, icon: HandCoins, color: '#2563eb', bg: '#dbeafe' },
    { label: 'Pending', value: myLoanRequests.filter(item => item.status === 'Pending').length, icon: Clock3, color: '#d97706', bg: '#fef3c7' },
    { label: 'Approved', value: myLoanRequests.filter(item => item.status === 'Approved' || item.status === 'Processed').length, icon: CheckCircle2, color: '#16a34a', bg: '#dcfce7' },
    { label: 'Rejected', value: myLoanRequests.filter(item => item.status === 'Rejected').length, icon: XCircle, color: '#dc2626', bg: '#fee2e2' },
  ]

  const activeBalances = myLoanRequests.filter(isTrackableLoanBalance)
  return (
    <div className="employee-page">
      <div className="employee-page-header">
        <div>
          <h1>Loans & Cash Advance</h1>
          <p>Request a company loan or cash advance and track Finance approval and payroll deductions.</p>
        </div>
        <Link href="/employee/loan-requests/new" className="employee-primary-button"><Plus size={16} /> New Request</Link>
      </div>

      <div style={metricGrid}>{stats.map(item => <Metric key={item.label} {...item} />)}</div>

      <section className="employee-panel" style={{ padding: 0, marginTop: 18 }}>
        <div style={panelHeader}>
          <div>
            <h2 style={panelTitle}>My Requests</h2>
            <p style={panelSubtitle}>These are generated from your submitted loan and cash advance requests.</p>
          </div>
        </div>
        <LoanTable requests={myLoanRequests} empty="No loan or cash advance requests yet." employees={employees} />
      </section>

      <section className="employee-panel" style={{ padding: 0, marginTop: 18 }}>
        <div style={panelHeader}>
          <div>
            <h2 style={panelTitle}>Loan Balances & Deductions</h2>
            <p style={panelSubtitle}>Active balances, payment history, and remaining terms from approved payroll deductions.</p>
          </div>
        </div>
        <LoanBalanceTable requests={activeBalances} />
      </section>
    </div>
  )
}

function Metric({ label, value, icon: Icon, color, bg }: { label: string; value: number; icon: ComponentType<{ size?: number }>; color: string; bg: string }) {
  return <div className="employee-panel" style={metricCardStyle}><span style={{ ...metricIcon, color, background: bg }}><Icon size={21} /></span><span><small style={muted}>{label}</small><strong style={{ display: 'block', fontSize: 24, color: '#0f172a', lineHeight: 1.1 }}>{value}</strong></span></div>
}

function LoanTable({ requests, empty, employees, onApprove, onReject }: { requests: LoanRequest[]; empty: string; employees: Employee[]; onApprove?: (request: LoanRequest) => void; onReject?: (request: LoanRequest) => void }) {
  if (!requests.length) return <EmptyState text={empty} />
  return (
    <div style={requestListStyle}>
      {requests.map(request => {
          const employee = resolveLoanEmployee(request, employees)
          const state = loanApprovalState(request)
          return (
            <article key={request.id} style={requestCardStyle}>
              <div style={requestTopStyle}>
                <EmployeeCell employee={employee} fallback={request.employeeName} />
                <Badge value={request.status} />
              </div>
              <div style={requestBodyStyle}>
                <InfoBlock label="Loan type" value={loanDisplayName(request)} />
                <InfoBlock label="Amount" value={money(request.amount)} strong />
                <InfoBlock label="Repayment" value={`${money(loanScheduledDeduction(request))} x ${request.repaymentMonths}`} hint={request.deductionSchedule || 'Twice a month'} />
                <InfoBlock label="Workflow" value={state.label} />
                <InfoBlock label="Submitted" value={formatDateTime(request.createdAt)} />
              </div>
              {(onApprove || onReject) && <div style={cardActionsStyle}>{onApprove && <button className="employee-primary-button" onClick={() => onApprove(request)}>Approve</button>}{onReject && <button className="employee-secondary-button" onClick={() => onReject(request)}>Reject</button>}</div>}
            </article>
          )
        })}
    </div>
  )
}

function LoanBalanceTable({ requests }: { requests: LoanRequest[] }) {
  if (!requests.length) return <EmptyState text="No active loan balances yet." />
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={tableStyle}>
        <thead><tr><th>Loan</th><th>Original Amount</th><th>Paid</th><th>Balance</th><th>Remaining Terms</th><th>Last Deducted</th></tr></thead>
        <tbody>{requests.map(request => {
          return <tr key={request.id}><td>{loanDisplayName(request)}</td><td>{money(request.amount)}</td><td>{money(loanPaidAmount(request))}</td><td><strong>{money(loanBalanceAmount(request))}</strong></td><td>{loanRemainingTerms(request)}</td><td>{request.lastDeductedPayrollPeriod || '-'}</td></tr>
        })}</tbody>
      </table>
    </div>
  )
}

function EmployeeCell({ employee, fallback }: { employee?: Employee; fallback?: string }) {
  const name = fullName(employee) || fallback || '-'
  return <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>{employee?.photo ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={employee.photo} alt="" style={avatarStyle} />
  ) : <span style={avatarFallback}>{initials(name)}</span>}<span><strong style={{ display: 'block' }}>{name}</strong><small style={muted}>{employee?.employeeId || employee?.jobTitle || '-'}</small></span></div>
}

function InfoBlock({ label, value, hint, strong }: { label: string; value: string; hint?: string; strong?: boolean }) {
  return <div style={infoBlockStyle}><span style={muted}>{label}</span><strong style={{ color: '#0f172a', fontSize: 13, fontWeight: strong ? 900 : 750 }}>{value}</strong>{hint && <small style={muted}>{hint}</small>}</div>
}

function EmptyState({ text }: { text: string }) {
  return <div style={emptyStateStyle}><Wallet size={24} color="#94a3b8" /><span>{text}</span></div>
}

function Badge({ value }: { value: string }) {
  const tone = value === 'Approved' || value === 'Processed' ? { bg: '#dcfce7', text: '#15803d' } : value === 'Rejected' ? { bg: '#fee2e2', text: '#dc2626' } : { bg: '#fef3c7', text: '#d97706' }
  return <span style={{ borderRadius: 999, padding: '4px 10px', background: tone.bg, color: tone.text, fontWeight: 900, fontSize: 12 }}>{value}</span>
}

const metricGrid = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 14 } as const
const metricCardStyle = { display: 'flex', alignItems: 'center', gap: 14, padding: 18, minHeight: 86 }
const metricIcon = { width: 48, height: 48, borderRadius: 14, display: 'grid', placeItems: 'center' } as const
const panelHeader = { display: 'flex', justifyContent: 'space-between', padding: '18px 20px', borderBottom: '1px solid #e2e8f0' } as const
const panelTitle = { margin: 0, fontSize: 18, color: '#0f172a' } as const
const panelSubtitle = { margin: '4px 0 0', color: '#64748b', fontSize: 13 } as const
const muted = { color: '#64748b', fontSize: 12 } as const
const requestListStyle = { display: 'grid', gap: 12, padding: 16 }
const requestCardStyle = { border: '1px solid #e2e8f0', borderRadius: 12, background: '#fff', padding: 14, display: 'grid', gap: 14 }
const requestTopStyle = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' as const }
const requestBodyStyle = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12, paddingTop: 12, borderTop: '1px solid #f1f5f9' }
const infoBlockStyle = { display: 'grid', gap: 4, minWidth: 0 }
const cardActionsStyle = { display: 'flex', gap: 8, justifyContent: 'flex-end', borderTop: '1px solid #f1f5f9', paddingTop: 12 }
const tableStyle = { width: '100%', borderCollapse: 'collapse', fontSize: 13 } as const
const emptyStateStyle = { display: 'grid', placeItems: 'center', gap: 8, minHeight: 180, color: '#64748b', fontSize: 14, textAlign: 'center' as const }
const avatarStyle = { width: 36, height: 36, borderRadius: '50%', objectFit: 'cover' } as const
const avatarFallback = { width: 36, height: 36, borderRadius: '50%', display: 'grid', placeItems: 'center', background: '#dcfce7', color: '#15803d', fontWeight: 900 } as const
