'use client'

import { useEffect, useMemo, useState } from 'react'
import type { ComponentType } from 'react'
import { AlertTriangle, CheckCircle2, Clock3, FileCheck2, HandCoins, Search, ShieldCheck, WalletCards } from 'lucide-react'
import {
  decideLoanRequest,
  DeductionControlDecision,
  DeductionSchedule,
  calculateLoanScheduledDeduction,
  isTrackableLoanBalance,
  loadLoanRequests,
  loanBalanceAmount,
  LoanRequest,
  loanApprovalState,
  loanDisplayName,
  loanPaidAmount,
  loanScheduledDeduction,
  money,
  saveLoanRequests,
} from '@/app/hr/loan-requests/loanData'
import { allowanceRequestKey, AllowanceRequest, appendAuditLog, appendFinanceNotification, loadStored as loadEnterpriseStored, saveStored as saveEnterpriseStored } from '@/app/hr/enterpriseData'
import { employeeKey, Employee, loadStored } from '@/app/employee/employeeData'
import { buildEmployeeTaxBreakdown, defaultPayrollFrequency, PayrollFrequency } from '@/app/hr/payroll/taxRules'
import { resolvePayrollLoanDeduction } from '@/app/hr/payroll/loanDeductionRules'

const font = "var(--font-body)"
const payrollKey = 'flowsys-hr-payroll-records'
const payrollScheduleKey = 'flowsys-hr-payroll-schedule'

type PayrollRecord = {
  id: string
  employeeId: string
  period: string
  gross: number
  deductions?: number
  deductionBreakdown?: {
    sss: number
    philHealth: number
    pagIbig: number
    tax: number
    loanOrCashAdvance?: number
  }
  loanDeductions?: Array<{ loanId: string; type: string; amount: number }>
  net: number
  status: 'Paid' | 'Pending' | 'Processing' | 'Approved'
  allowanceLines?: Array<{ allowanceId: string; type: string; amount: number; date?: string; purpose?: string }>
  createdAt: string
  updatedAt?: string
}

export default function FinanceLoanManagementPage() {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [requests, setRequests] = useState<LoanRequest[]>([])
  const [allowances, setAllowances] = useState<AllowanceRequest[]>([])
  const [query, setQuery] = useState('')
  const [notice, setNotice] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)

  useEffect(() => {
    const load = () => {
      setEmployees(loadStored<Employee[]>(employeeKey, []))
      setRequests(loadLoanRequests())
      setAllowances(loadEnterpriseStored<AllowanceRequest[]>(allowanceRequestKey, []))
    }
    load()
    window.addEventListener('storage', load)
    return () => window.removeEventListener('storage', load)
  }, [])

  const rows = useMemo(() => requests.filter(request => {
    const term = query.trim().toLowerCase()
    return !term || `${request.employeeName} ${request.employeeCode} ${request.requestType} ${request.customLoanType || ''} ${request.status}`.toLowerCase().includes(term)
  }), [query, requests])
  const employeeBalanceRows = useMemo(() => {
    const grouped = new Map<string, { key: string; employeeName: string; employeeCode: string; loans: LoanRequest[]; totalBalance: number; totalScheduled: number }>()
    requests.filter(isTrackableLoanBalance).forEach(request => {
      const key = request.employeeId || request.employeeCode || request.employeeName || request.id
      const current = grouped.get(key) || {
        key,
        employeeName: request.employeeName || 'Employee',
        employeeCode: request.employeeCode || request.department || '-',
        loans: [],
        totalBalance: 0,
        totalScheduled: 0,
      }
      current.loans.push(request)
      current.totalBalance += loanBalanceAmount(request)
      current.totalScheduled += loanScheduledDeduction(request)
      grouped.set(key, current)
    })
    return Array.from(grouped.values()).sort((a, b) => b.totalBalance - a.totalBalance)
  }, [requests])
  const allowanceRows = allowances.filter(item => item.status === 'Pending' || item.status === 'Manager Approved')
  const payrollRiskRows = useMemo(() => {
    const grouped = new Map<string, { key: string; employeeName: string; employeeCode: string; availablePay: number; scheduled: number; loans: LoanRequest[] }>()
    requests
      .filter(request => request.status !== 'Rejected' && request.status !== 'Cancelled' && request.status !== 'Processed' && !request.deductionPaused)
      .forEach(request => {
        const employee = employees.find(item => item.id === request.employeeId || item.employeeId === request.employeeCode)
        const salaryEmployee = employee as (Employee & { basicSalary?: number; allowances?: number; deductions?: number }) | undefined
        const key = employee?.id || request.employeeId || request.employeeCode || request.employeeName || request.id
        const current = grouped.get(key) || {
          key,
          employeeName: employee ? `${employee.firstName || ''} ${employee.lastName || ''}`.trim() : request.employeeName || 'Employee',
          employeeCode: employee?.employeeId || request.employeeCode || '-',
          availablePay: Math.max(0, Number(salaryEmployee?.basicSalary || 0) + Number(salaryEmployee?.allowances || 0) - Number(salaryEmployee?.deductions || 0)),
          scheduled: 0,
          loans: [],
        }
        current.scheduled += loanScheduledDeduction(request)
        current.loans.push(request)
        grouped.set(key, current)
      })
    return Array.from(grouped.values()).filter(row => row.scheduled > row.availablePay && row.scheduled > 0)
  }, [employees, requests])

  useEffect(() => {
    payrollRiskRows.forEach(row => {
      appendFinanceNotification({
        subject: `Payroll deduction risk for ${row.employeeName}`,
        message: `${row.employeeName} has ${money(row.scheduled)} scheduled loan deductions but only ${money(row.availablePay)} estimated available pay. Finance should choose full, partial, or skip before payroll.`,
        relatedType: 'Payroll Deduction Risk',
        relatedId: `payroll-risk-${row.key}`,
        target: '/financials/loan-management',
      })
    })
  }, [payrollRiskRows])

  const totalOutstanding = employeeBalanceRows.reduce((sum, row) => sum + row.totalBalance, 0)
  const totalScheduled = employeeBalanceRows.reduce((sum, row) => sum + row.totalScheduled, 0)
  const financeQueueRows = rows.filter(request => loanApprovalState(request).canFinanceDecide)
  const payrollReadyRows = rows.filter(request => loanApprovalState(request).canPayrollDeduct)
  const activeLoanRows = rows.filter(isTrackableLoanBalance)
  const completedLoanRows = rows.filter(request => request.status === 'Rejected' || request.status === 'Processed' || request.status === 'Cancelled')
  const riskLoanIds = new Set(payrollRiskRows.flatMap(row => row.loans.map(loan => loan.id)))

  const saveRequest = (nextRequest: LoanRequest, summary: string) => {
    const next = requests.map(request => request.id === nextRequest.id ? nextRequest : request)
    setRequests(next)
    saveLoanRequests(next)
    appendAuditLog({ action: 'loan.change', targetType: 'Loan Request', targetId: nextRequest.id, summary })
    setNotice(summary)
  }

  const decideAsFinance = (request: LoanRequest, decision: 'Approved' | 'Rejected') => {
    const employee = employees.find(item => item.id === request.employeeId || item.employeeId === request.employeeCode)
    let nextRequest = decideLoanRequest(request, employee, 'finance', decision)
    let payrollMessage = ''
    if (decision === 'Approved') {
      const attached = attachLoanToOpenPayroll(nextRequest)
      if (attached.applied > 0) {
        const paidAmount = Number(nextRequest.paidAmount || 0) + attached.applied
        const fullyPaid = paidAmount >= Number(nextRequest.amount || 0)
        nextRequest = {
          ...nextRequest,
          status: fullyPaid ? 'Processed' : nextRequest.status,
          approvalStep: fullyPaid ? 'complete' : nextRequest.approvalStep,
          paidAmount,
          lastDeductedPayrollPeriod: attached.period,
          payrollRecordId: attached.payrollRecordId,
          updatedAt: new Date().toISOString(),
        }
        payrollMessage = ` ${money(attached.applied)} was added to ${attached.period} payroll.`
      }
    }
    saveRequest(nextRequest, decision === 'Approved'
      ? `${request.employeeName || 'Employee'}'s loan is finance-approved and ready for payroll.${payrollMessage}`
      : `${request.employeeName || 'Employee'}'s loan request was rejected by Finance.`)
  }

  const updateTerms = (request: LoanRequest, patch: Partial<LoanRequest>) => {
    saveRequest({ ...request, ...patch, updatedAt: new Date().toISOString() }, `${request.employeeName || 'Employee'} loan deduction terms were updated by Finance.`)
  }

  const addDeductionControl = (request: LoanRequest, decision: DeductionControlDecision, approvedAmount: number, reason: string) => {
    const now = new Date().toISOString()
    saveRequest({
      ...request,
      deductionControls: [
        { period: new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' }), decision, approvedAmount, reason, approvedAt: now },
        ...(request.deductionControls || []),
      ],
      deductionPaused: decision === 'Skip temporarily',
      deductionOverrideAmount: decision === 'Partial deduction' ? approvedAmount : request.deductionOverrideAmount,
      updatedAt: now,
    }, `${decision} recorded for ${request.employeeName || 'employee'} loan deduction.`)
    appendAuditLog({ action: 'deduction.override', targetType: 'Loan Request', targetId: request.id, summary: `${decision}: ${money(approvedAmount)}. ${reason}` })
  }

  const decideAllowance = (request: AllowanceRequest, decision: 'Approved' | 'Rejected') => {
    const now = new Date().toISOString()
    let includedPayrollPeriod = request.payrollPeriod
    if (decision === 'Approved') includedPayrollPeriod = attachAllowanceToOpenPayroll(request, now) || includedPayrollPeriod
    const next = allowances.map(item => item.id === request.id ? {
      ...item,
      status: decision === 'Approved' ? 'Finance Approved' as const : 'Rejected' as const,
      financeDecision: decision,
      payrollPeriod: includedPayrollPeriod,
      updatedAt: now,
    } : item)
    setAllowances(next)
    saveEnterpriseStored(allowanceRequestKey, next)
    appendAuditLog({ action: 'allowance.change', targetType: 'Allowance Request', targetId: request.id, summary: `Finance ${decision.toLowerCase()} ${request.customType || request.type} allowance for ${request.employeeName}.` })
    setNotice(decision === 'Approved'
      ? `${request.employeeName}'s ${request.customType || request.type} allowance was approved${includedPayrollPeriod ? ` and attached to ${includedPayrollPeriod} payroll` : ' and is ready for payroll'}.`
      : `${request.employeeName}'s ${request.customType || request.type} allowance was rejected.`)
  }

  return (
    <main className="loan-workspace">
      <style>{loanManagementCss}</style>
      <header className="loan-header">
        <div>
          <div className="loan-eyebrow">Finance Workspace</div>
          <h1>Loan Management</h1>
          <p>Review requests, approve deduction terms, and protect payroll when an employee has too many deductions.</p>
        </div>
        <label className="loan-search">
          <Search size={16} />
          <input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search employee, loan, status..." />
        </label>
      </header>

      {notice && <div style={noticeStyle}>{notice}<button onClick={() => setNotice('')} style={dismissStyle}>Dismiss</button></div>}

      <section className="loan-kpis" aria-label="Loan summary">
        <SummaryTile icon={WalletCards} label="Outstanding balance" value={money(totalOutstanding)} helper={`${employeeBalanceRows.length} employees with active balances`} tone="green" />
        <SummaryTile icon={HandCoins} label="Scheduled this cutoff" value={money(totalScheduled)} helper="Before Finance overrides" tone="blue" />
        <SummaryTile icon={Clock3} label="Needs approval" value={String(financeQueueRows.length)} helper="New loan requests" tone="amber" />
        <SummaryTile icon={AlertTriangle} label="Payroll risks" value={String(payrollRiskRows.length)} helper="Needs full, partial, or skip decision" tone={payrollRiskRows.length ? 'red' : 'green'} />
      </section>

      <section className="loan-grid">
        <div className="loan-stack">
          <Panel eyebrow="Action Center" title="Needs Finance decision" icon={ShieldCheck} tone="#2563eb">
            {payrollRiskRows.length > 0 && (
              <div className="risk-list">
                {payrollRiskRows.map(row => (
                  <article className="risk-card" key={row.key}>
                    <div>
                      <span className="risk-label">Payroll risk</span>
                      <strong>{row.employeeName}</strong>
                      <small>{row.employeeCode}</small>
                    </div>
                    <div className="risk-numbers">
                      <span><small>Available pay</small><strong>{money(row.availablePay)}</strong></span>
                      <span><small>Scheduled loans</small><strong>{money(row.scheduled)}</strong></span>
                    </div>
                    <div className="risk-loans">
                      {row.loans.map(loan => <span key={loan.id}>{loanDisplayName(loan)} <b>{money(loanScheduledDeduction(loan))}</b></span>)}
                    </div>
                  </article>
                ))}
              </div>
            )}

            <div className="queue-list">
              {financeQueueRows.length ? financeQueueRows.map(request => {
                const editing = editingId === request.id
                return (
                  <article className={`queue-card ${riskLoanIds.has(request.id) ? 'has-risk' : ''}`} key={request.id}>
                    <div className="queue-main">
                      <div>
                        <strong>{request.employeeName || '-'}</strong>
                        <small>{request.employeeCode || request.department || '-'} · {loanDisplayName(request)}</small>
                      </div>
                      <Badge value={riskLoanIds.has(request.id) ? 'Review payroll risk' : loanApprovalState(request).label} />
                    </div>
                    <div className="queue-details">
                      <span><small>Amount</small><b>{money(request.amount)}</b></span>
                      <span><small>Deduction</small><b>{money(loanScheduledDeduction(request))}</b></span>
                      <span><small>Terms</small><b>{request.repaymentMonths} · {request.deductionSchedule || 'Twice a month'}</b></span>
                    </div>
                    {request.reason && <p className="queue-reason">{request.reason}</p>}
                    {editing && <TermEditor request={request} onSave={patch => { updateTerms(request, patch); setEditingId(null) }} />}
                    <div className="queue-actions">
                      <button onClick={() => decideAsFinance(request, 'Approved')} className="btn btn-primary">Approve terms</button>
                      <button onClick={() => setEditingId(editing ? null : request.id)} className="btn btn-secondary">{editing ? 'Close terms' : 'Edit terms'}</button>
                      <button onClick={() => decideAsFinance(request, 'Rejected')} className="btn btn-danger">Reject</button>
                    </div>
                  </article>
                )
              }) : (
                <EmptyState title="No loan requests waiting for Finance" body="New employee loan and cash advance requests will appear here first." />
              )}
            </div>
          </Panel>

          <Panel eyebrow="Payroll Control" title="Approved deductions" icon={FileCheck2} tone="#16a34a">
            {payrollReadyRows.length ? (
              <div className="approved-deduction-list">
                {payrollReadyRows.map(request => {
                  const editing = editingId === request.id
                  return (
                    <article className="approved-deduction-card" key={request.id}>
                      <div className="approved-deduction-main">
                        <span>
                          <small>Employee</small>
                          <strong>{request.employeeName || '-'}</strong>
                          <em>{request.employeeCode || '-'}</em>
                        </span>
                        <span>
                          <small>Loan</small>
                          <strong>{loanDisplayName(request)}</strong>
                          <em>{request.reason || 'Approved for payroll'}</em>
                        </span>
                        <span>
                          <small>Deduction</small>
                          {editing ? (
                            <TermEditor request={request} onSave={patch => { updateTerms(request, patch); setEditingId(null) }} />
                          ) : (
                            <>
                              <strong>{money(loanScheduledDeduction(request))}</strong>
                              <em>{request.deductionPaused ? 'Paused' : request.deductionSchedule || 'Twice a month'}</em>
                            </>
                          )}
                        </span>
                      </div>
                      <div className="approved-deduction-actions">
                        <ControlButtons request={request} onApply={addDeductionControl} />
                        <button onClick={() => setEditingId(editing ? null : request.id)} className="btn btn-secondary">{editing ? 'Close' : 'Edit terms'}</button>
                      </div>
                    </article>
                  )
                })}
              </div>
            ) : (
              <EmptyState title="No approved deductions yet" body="Finance-approved loan terms will move here before payroll deduction." />
            )}
          </Panel>
        </div>

        <aside className="loan-side">
          <Panel eyebrow="Balances" title="Employee loan balances" icon={WalletCards} tone="#16a34a">
            {employeeBalanceRows.length ? (
              <>
                <div className="side-list-summary">
                  <span>{employeeBalanceRows.length} employee{employeeBalanceRows.length === 1 ? '' : 's'}</span>
                  <strong>{money(totalOutstanding)}</strong>
                </div>
                <div className="balance-list side-scroll-list">
                {employeeBalanceRows.map(row => (
                  <article className="balance-card" key={row.key}>
                    <div className="balance-top">
                      <span><strong>{row.employeeName}</strong><small>{row.employeeCode}</small></span>
                      <b>{money(row.totalBalance)}</b>
                    </div>
                    <div className="balance-meta">
                      <span>{row.loans.length} active loan{row.loans.length === 1 ? '' : 's'}</span>
                      <span>{money(row.totalScheduled)} scheduled</span>
                    </div>
                    <div className="balance-loans">
                      {row.loans.map(loan => <span key={loan.id}>{loanDisplayName(loan)} <b>{money(loanBalanceAmount(loan))}</b></span>)}
                    </div>
                  </article>
                ))}
                </div>
              </>
            ) : (
              <EmptyState title="No active balances" body="Approved loans with remaining balances will be summarized here." />
            )}
          </Panel>

          <Panel eyebrow="Allowances" title="Finance approvals" icon={CheckCircle2} tone="#16a34a">
            {allowanceRows.length ? (
              <>
                <div className="side-list-summary">
                  <span>{allowanceRows.length} request{allowanceRows.length === 1 ? '' : 's'}</span>
                  <strong>{money(allowanceRows.reduce((sum, item) => sum + Number(item.amount || 0), 0))}</strong>
                </div>
                <div className="allowance-list side-scroll-list compact">
                {allowanceRows.map(item => (
                  <article className="allowance-card" key={item.id}>
                    <div><strong>{item.employeeName}</strong><small>{item.customType || item.type} · {money(item.amount)}</small></div>
                    <div className="queue-actions">
                      <button onClick={() => decideAllowance(item, 'Approved')} className="btn btn-primary">Approve</button>
                      <button onClick={() => decideAllowance(item, 'Rejected')} className="btn btn-danger">Reject</button>
                    </div>
                  </article>
                ))}
                </div>
              </>
            ) : (
              <EmptyState title="No allowance queue" body="Fuel and meal allowance requests waiting for Finance will appear here." />
            )}
          </Panel>
        </aside>
      </section>

      <section className="register-panel">
        <Panel eyebrow="Loan Register" title="All loan and cash advance records" icon={Clock3} tone="#64748b">
          <div className="register-summary">
            <span>{activeLoanRows.length} active</span>
            <span>{completedLoanRows.length} completed or rejected</span>
            <span>{rows.length} total shown</span>
          </div>
          <div className="compact-table-wrap">
            <table className="compact-table register-table">
              <thead><tr><th>Employee</th><th>Loan</th><th>Balance</th><th>Terms</th><th>Status</th><th>Actions</th></tr></thead>
              <tbody>{rows.length ? rows.map(request => {
                const state = loanApprovalState(request)
                const editing = editingId === request.id
                return (
                  <tr key={request.id}>
                    <td><strong>{request.employeeName || '-'}</strong><small>{request.employeeCode || request.department || '-'}</small></td>
                    <td><strong>{loanDisplayName(request)}</strong><small>{request.reason || '-'}</small></td>
                    <td><strong>{money(loanBalanceAmount(request))}</strong><small>Paid {money(loanPaidAmount(request))}</small></td>
                    <td>{editing ? <TermEditor request={request} onSave={patch => { updateTerms(request, patch); setEditingId(null) }} /> : <span><strong>{money(loanScheduledDeduction(request))}</strong><small>{request.repaymentMonths} term(s) · {request.deductionSchedule || 'Twice a month'}</small></span>}</td>
                    <td><Badge value={state.label} /></td>
                    <td><div className="queue-actions"><ControlButtons request={request} onApply={addDeductionControl} /><button onClick={() => setEditingId(editing ? null : request.id)} className="btn btn-secondary">{editing ? 'Close' : 'Edit'}</button></div></td>
                  </tr>
                )
              }) : <tr><td colSpan={6}><EmptyState title="No records found" body="Try another search term or wait for employee requests." /></td></tr>}</tbody>
            </table>
          </div>
        </Panel>
      </section>
    </main>
  )
}

function attachAllowanceToOpenPayroll(request: AllowanceRequest, updatedAt: string) {
  if (typeof window === 'undefined') return undefined
  const records = loadStored<PayrollRecord[]>(payrollKey, [])
  const target = records
    .filter(record => record.employeeId === request.employeeId && record.status !== 'Paid')
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0]
  if (!target) return undefined
  if (target.allowanceLines?.some(line => line.allowanceId === request.id)) return target.period
  const amount = Number(request.amount || 0)
  const nextRecords = records.map(record => record.id === target.id ? {
    ...record,
    gross: Number(record.gross || 0) + amount,
    net: Number(record.net || 0) + amount,
    allowanceLines: [
      ...(record.allowanceLines || []),
      {
        allowanceId: request.id,
        type: request.customType || request.type,
        amount,
        date: request.date,
        purpose: request.purpose || request.reason,
      },
    ],
    updatedAt,
  } : record)
  saveEnterpriseStored(payrollKey, nextRecords)
  window.dispatchEvent(new Event('storage'))
  return target.period
}

function attachLoanToOpenPayroll(request: LoanRequest) {
  if (typeof window === 'undefined') return { applied: 0, period: '', payrollRecordId: '' }
  const records = loadStored<PayrollRecord[]>(payrollKey, [])
  const employees = loadStored<Employee[]>(employeeKey, [])
  const employee = employees.find(item => item.id === request.employeeId || item.employeeId === request.employeeCode)
  const schedule = loadStored<{ frequency?: PayrollFrequency }>(payrollScheduleKey, {})
  const target = records
    .filter(record =>
      record.status !== 'Paid' &&
      (record.employeeId === request.employeeId || record.employeeId === request.employeeCode) &&
      !record.loanDeductions?.some(line => line.loanId === request.id)
    )
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0]
  if (!target) return { applied: 0, period: '', payrollRecordId: '' }

  const available = Math.max(0, Number(target.gross || 0) - Number(target.deductions || 0))
  const scheduled = loanScheduledDeduction(request)
  const deductionDecision = resolvePayrollLoanDeduction({
    loan: request,
    period: target.period,
    scheduledAmount: scheduled,
    availablePay: available,
  })
  const applied = roundMoney(deductionDecision.applied)
  if (deductionDecision.requiresFinanceDecision || applied <= 0) {
    appendFinanceNotification({
      subject: `Payroll deduction risk for ${request.employeeName || 'Employee'}`,
      message: `${request.employeeName || 'Employee'} has ${money(scheduled)} scheduled loan deduction for ${target.period}, but Finance must choose full, partial, or skip before payroll can deduct it.`,
      relatedType: 'Payroll Deduction Risk',
      relatedId: `payroll-risk-${target.period}-${request.id}`,
      target: '/financials/loan-management',
    })
    return { applied: 0, period: target.period, payrollRecordId: target.id }
  }

  const nextRecords = records.map(record => {
    if (record.id !== target.id) return record
    const deductions = roundMoney(Number(record.deductions || 0) + applied)
    const existingBreakdown = record.deductionBreakdown || buildEmployeeTaxBreakdown(Number(record.gross || 0), Number((employee as Employee & { deductions?: number } | undefined)?.deductions || 0), schedule.frequency || defaultPayrollFrequency)
    return {
      ...record,
      deductions,
      deductionBreakdown: {
        ...existingBreakdown,
        loanOrCashAdvance: roundMoney(Number(existingBreakdown.loanOrCashAdvance || 0) + applied),
      },
      loanDeductions: [
        ...(record.loanDeductions || []),
        { loanId: request.id, type: loanDisplayName(request), amount: applied },
      ],
      net: Math.max(0, roundMoney(Number(record.net || 0) - applied)),
      updatedAt: new Date().toISOString(),
    }
  })
  saveEnterpriseStored(payrollKey, nextRecords)
  window.dispatchEvent(new Event('storage'))
  return { applied, period: target.period, payrollRecordId: target.id }
}

function roundMoney(value: number) {
  return Math.round(Number(value || 0) * 100) / 100
}

function SummaryTile({ icon: Icon, label, value, helper, tone }: { icon: ComponentType<{ size?: number }>; label: string; value: string; helper: string; tone: 'green' | 'blue' | 'amber' | 'red' }) {
  return (
    <article className={`summary-tile tone-${tone}`}>
      <span className="summary-icon"><Icon size={20} /></span>
      <span>
        <small>{label}</small>
        <strong>{value}</strong>
        <em>{helper}</em>
      </span>
    </article>
  )
}

function Panel({ eyebrow, title, icon: Icon, tone, children }: { eyebrow: string; title: string; icon: ComponentType<{ size?: number; color?: string }>; tone: string; children: React.ReactNode }) {
  return (
    <section className="finance-panel">
      <header className="panel-header">
        <span>
          <small>{eyebrow}</small>
          <strong>{title}</strong>
        </span>
        <span className="panel-icon" style={{ color: tone, backgroundColor: `${tone}16` }}><Icon size={18} color={tone} /></span>
      </header>
      <div className="panel-body">{children}</div>
    </section>
  )
}

function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="empty-state">
      <strong>{title}</strong>
      <span>{body}</span>
    </div>
  )
}

function TermEditor({ request, onSave }: { request: LoanRequest; onSave: (patch: Partial<LoanRequest>) => void }) {
  const [months, setMonths] = useState(String(request.requestType === 'Cash Advance' ? 1 : request.repaymentMonths || 1))
  const [schedule, setSchedule] = useState<DeductionSchedule>(request.requestType === 'Cash Advance' ? 'One-time' : request.deductionSchedule || 'Twice a month')
  const suggestedAmount = calculateLoanScheduledDeduction({
    ...request,
    repaymentMonths: Number(months || 1),
    deductionSchedule: schedule,
  })
  const [amount, setAmount] = useState(String(loanScheduledDeduction(request) || suggestedAmount))
  const updateMonths = (value: string) => {
    const nextMonths = Number(value || 1)
    setMonths(value)
    setAmount(calculateLoanScheduledDeduction({ ...request, repaymentMonths: nextMonths, deductionSchedule: schedule }).toFixed(2))
  }
  const updateSchedule = (value: DeductionSchedule) => {
    setSchedule(value)
    setAmount(calculateLoanScheduledDeduction({ ...request, repaymentMonths: Number(months || 1), deductionSchedule: value }).toFixed(2))
  }
  return (
    <div style={termEditorStyle}>
      <input type="number" min="1" value={months} disabled={request.requestType === 'Cash Advance'} onChange={event => updateMonths(event.target.value)} style={inputStyle} />
      <input type="number" min="0" value={amount} onChange={event => setAmount(event.target.value)} style={inputStyle} />
      <select value={schedule} disabled={request.requestType === 'Cash Advance'} onChange={event => updateSchedule(event.target.value as DeductionSchedule)} style={inputStyle}>
        <option>15th payroll</option><option>30th payroll</option><option>Twice a month</option><option>One-time</option>
      </select>
      <small style={{ color: '#64748b', gridColumn: '1 / -1' }}>Suggested: {money(suggestedAmount)} per payroll deduction</small>
      <button onClick={() => onSave({ repaymentMonths: Number(months || 1), repaymentAmount: Number(amount || 0), deductionOverrideAmount: Number(amount || 0), deductionSchedule: schedule })} style={primarySmall}>Save</button>
    </div>
  )
}

function ControlButtons({ request, onApply }: { request: LoanRequest; onApply: (request: LoanRequest, decision: DeductionControlDecision, approvedAmount: number, reason: string) => void }) {
  const amount = loanScheduledDeduction(request)
  return (
    <div className="deduction-chip-group">
      <button className="deduction-chip" onClick={() => onApply(request, 'Full deduction', amount, 'Finance approved full scheduled deduction.')}>Full</button>
      <button className="deduction-chip" onClick={() => onApply(request, 'Partial deduction', Math.max(0, Math.round(amount / 2)), 'Reduced due to low payable days or payroll exception.')}>Partial</button>
      <button className="deduction-chip" onClick={() => onApply(request, 'Skip temporarily', 0, 'Skipped temporarily by Finance control.')}>Skip</button>
    </div>
  )
}

function Badge({ value }: { value: string }) {
  const tone = value.includes('Rejected') ? { bg: '#fee2e2', text: '#dc2626' } : value.includes('Finance') ? { bg: '#fef3c7', text: '#d97706' } : value.includes('Payroll') ? { bg: '#dbeafe', text: '#1d4ed8' } : { bg: '#dcfce7', text: '#15803d' }
  return <span style={{ borderRadius: 999, padding: '4px 10px', background: tone.bg, color: tone.text, fontWeight: 900, fontSize: 12 }}>{value}</span>
}

const noticeStyle = { display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', padding: 12, borderRadius: 10, background: '#ecfdf5', color: '#047857', fontWeight: 800, fontSize: 13, marginBottom: 16 } as const
const dismissStyle = { border: 0, background: 'transparent', color: '#047857', fontWeight: 900, cursor: 'pointer' } as const
const primarySmall = { minHeight: 32, border: '1px solid #16a34a', background: '#16a34a', color: '#fff', borderRadius: 8, padding: '0 10px', fontWeight: 900, cursor: 'pointer', fontSize: 12 } as const
const inputStyle = { minHeight: 34, border: '1px solid #e2e8f0', borderRadius: 7, padding: '0 9px', font: 'inherit', minWidth: 90, background: '#fff' } as const
const termEditorStyle = { display: 'grid', gridTemplateColumns: '70px 100px 130px auto', gap: 6, alignItems: 'center' } as const

const loanManagementCss = `
.loan-workspace {
  min-height: 100vh;
  padding: 24px;
  background: #f6f8fb;
  color: #0f172a;
  font-family: ${font};
}

.loan-header {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(260px, 420px);
  gap: 20px;
  align-items: end;
  margin-bottom: 18px;
}

.loan-eyebrow {
  color: #008a3d;
  font-size: 11px;
  font-weight: 950;
  letter-spacing: .04em;
  text-transform: uppercase;
  margin-bottom: 8px;
}

.loan-header h1 {
  margin: 0;
  font-size: 30px;
  line-height: 1.08;
  letter-spacing: 0;
  font-weight: 950;
}

.loan-header p {
  margin: 8px 0 0;
  max-width: 760px;
  color: #526179;
  font-size: 14px;
  line-height: 1.45;
}

.loan-search {
  height: 46px;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 0 14px;
  border: 1px solid #d9e2ef;
  border-radius: 12px;
  background: #fff;
  color: #64748b;
  box-shadow: 0 6px 18px rgba(15, 23, 42, .04);
}

.loan-search input {
  min-width: 0;
  width: 100%;
  border: 0;
  outline: 0;
  background: transparent;
  font: inherit;
  color: #0f172a;
}

.loan-kpis {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 14px;
  margin-bottom: 18px;
}

.summary-tile {
  min-height: 118px;
  display: flex;
  align-items: flex-start;
  gap: 14px;
  padding: 16px;
  border: 1px solid #dfe7f2;
  border-radius: 14px;
  background: #fff;
  box-shadow: 0 12px 28px rgba(15, 23, 42, .05);
}

.summary-icon {
  width: 42px;
  height: 42px;
  display: grid;
  place-items: center;
  flex: 0 0 auto;
  border-radius: 12px;
}

.summary-tile small,
.summary-tile em {
  display: block;
  color: #64748b;
  font-size: 12px;
  font-style: normal;
  line-height: 1.35;
}

.summary-tile strong {
  display: block;
  margin: 4px 0;
  font-size: 22px;
  line-height: 1.15;
  font-weight: 950;
}

.tone-green .summary-icon { background: #dcfce7; color: #07883d; }
.tone-blue .summary-icon { background: #dbeafe; color: #1d4ed8; }
.tone-amber .summary-icon { background: #fef3c7; color: #b45309; }
.tone-red .summary-icon { background: #fee2e2; color: #dc2626; }

.loan-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.65fr) minmax(320px, .85fr);
  gap: 18px;
  align-items: start;
}

.loan-stack,
.loan-side {
  display: grid;
  gap: 18px;
}

.finance-panel {
  overflow: hidden;
  border: 1px solid #dfe7f2;
  border-radius: 14px;
  background: #fff;
  box-shadow: 0 14px 32px rgba(15, 23, 42, .05);
}

.panel-header {
  display: flex;
  justify-content: space-between;
  gap: 14px;
  align-items: center;
  padding: 16px 18px;
  border-bottom: 1px solid #e6edf6;
  background: #fff;
}

.panel-header small {
  display: block;
  margin-bottom: 4px;
  color: #64748b;
  font-size: 11px;
  font-weight: 950;
  text-transform: uppercase;
  letter-spacing: .04em;
}

.panel-header strong {
  display: block;
  font-size: 17px;
  font-weight: 950;
}

.panel-icon {
  width: 38px;
  height: 38px;
  border-radius: 12px;
  display: grid;
  place-items: center;
  flex: 0 0 auto;
}

.panel-body {
  padding: 16px;
}

.side-list-summary {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  align-items: center;
  margin-bottom: 12px;
  padding: 9px 11px;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  background: #f8fafc;
  color: #475569;
  font-size: 12px;
  font-weight: 900;
}

.side-list-summary strong {
  color: #047857;
  text-align: right;
}

.risk-list,
.queue-list,
.balance-list,
.allowance-list {
  display: grid;
  gap: 12px;
}

.side-scroll-list {
  max-height: 430px;
  overflow-y: auto;
  padding-right: 4px;
  scrollbar-width: thin;
}

.side-scroll-list.compact {
  max-height: 330px;
}

.side-scroll-list::-webkit-scrollbar {
  width: 8px;
}

.side-scroll-list::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 999px;
}

.risk-list {
  margin-bottom: 14px;
}

.risk-card,
.queue-card,
.balance-card,
.allowance-card {
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  background: #fff;
}

.risk-card {
  display: grid;
  grid-template-columns: minmax(160px, .9fr) minmax(220px, 1fr) minmax(180px, 1.1fr);
  gap: 14px;
  align-items: center;
  padding: 14px;
  border-color: #fed7aa;
  background: #fffaf3;
}

.risk-card strong,
.queue-card strong,
.balance-card strong,
.allowance-card strong,
.compact-table strong {
  display: block;
  font-weight: 950;
}

.risk-card small,
.queue-card small,
.balance-card small,
.allowance-card small,
.compact-table small {
  display: block;
  margin-top: 3px;
  color: #64748b;
  font-size: 12px;
}

.risk-label {
  display: inline-flex;
  margin-bottom: 7px;
  padding: 4px 8px;
  border-radius: 999px;
  background: #fee2e2;
  color: #dc2626;
  font-size: 11px;
  font-weight: 950;
}

.risk-numbers {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.risk-numbers span {
  padding: 10px;
  border-radius: 10px;
  background: #fff;
  border: 1px solid #fed7aa;
}

.risk-numbers span:last-child strong {
  color: #dc2626;
}

.risk-loans,
.balance-loans {
  display: grid;
  gap: 6px;
}

.risk-loans span,
.balance-loans span {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  color: #334155;
  font-size: 12px;
}

.queue-card {
  padding: 14px;
}

.queue-card.has-risk {
  border-color: #fed7aa;
}

.queue-main,
.balance-top {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: flex-start;
}

.queue-details {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
  margin-top: 12px;
}

.queue-details span {
  min-width: 0;
  padding: 10px;
  border-radius: 10px;
  background: #f8fafc;
  border: 1px solid #edf2f7;
}

.queue-details b {
  display: block;
  margin-top: 4px;
  font-size: 13px;
}

.queue-reason {
  margin: 12px 0 0;
  color: #475569;
  font-size: 13px;
  line-height: 1.45;
}

.queue-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  align-items: center;
  margin-top: 12px;
}

.btn {
  min-height: 34px;
  border-radius: 9px;
  padding: 0 12px;
  font: inherit;
  font-size: 12px;
  font-weight: 950;
  cursor: pointer;
}

.btn-primary {
  border: 1px solid #16a34a;
  background: #16a34a;
  color: #fff;
}

.btn-secondary {
  border: 1px solid #dbe3ef;
  background: #fff;
  color: #0f172a;
}

.btn-danger {
  border: 1px solid #fecaca;
  background: #fff;
  color: #dc2626;
}

.balance-card,
.allowance-card {
  padding: 13px;
}

.balance-top b {
  color: #047857;
  text-align: right;
}

.balance-meta {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  margin: 12px 0;
  padding-top: 10px;
  border-top: 1px solid #eef2f7;
  color: #64748b;
  font-size: 12px;
  font-weight: 800;
}

.allowance-card {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 12px;
  align-items: center;
}

.approved-deduction-list {
  display: grid;
  gap: 12px;
}

.approved-deduction-card {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 14px;
  align-items: center;
  padding: 14px;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  background: #fff;
}

.approved-deduction-main {
  display: grid;
  grid-template-columns: minmax(150px, 1.25fr) minmax(120px, .9fr) minmax(160px, 1fr);
  gap: 14px;
  min-width: 0;
}

.approved-deduction-main span {
  min-width: 0;
}

.approved-deduction-main small {
  display: block;
  margin-bottom: 4px;
  color: #64748b;
  font-size: 11px;
  font-weight: 950;
  text-transform: uppercase;
}

.approved-deduction-main strong {
  display: block;
  color: #0f172a;
  font-size: 13px;
  font-weight: 950;
  line-height: 1.25;
  overflow-wrap: anywhere;
}

.approved-deduction-main em {
  display: block;
  margin-top: 4px;
  color: #64748b;
  font-size: 12px;
  font-style: normal;
  line-height: 1.25;
  overflow-wrap: anywhere;
}

.approved-deduction-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
  flex-wrap: wrap;
  min-width: 196px;
}

.deduction-chip-group {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}

.deduction-chip {
  min-height: 32px;
  border: 1px solid #dadce0;
  border-radius: 999px;
  background: #fff;
  color: #1f1f1f;
  padding: 0 13px;
  font: inherit;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  transition: background-color .14s ease, border-color .14s ease, box-shadow .14s ease;
}

.deduction-chip:hover {
  background: #f8fafd;
  border-color: #c9d1dc;
  box-shadow: 0 1px 2px rgba(60, 64, 67, .2);
}

.deduction-chip:focus-visible {
  outline: none;
  border-color: #1a73e8;
  box-shadow: 0 0 0 3px rgba(26, 115, 232, .18);
}

.compact-table-wrap {
  overflow-x: auto;
}

.compact-table {
  width: 100%;
  min-width: 780px;
  border-collapse: collapse;
  font-size: 13px;
}

.compact-table th {
  padding: 11px 12px;
  text-align: left;
  color: #64748b;
  font-size: 11px;
  font-weight: 950;
  text-transform: uppercase;
  background: #f8fafc;
  border-bottom: 1px solid #e2e8f0;
}

.compact-table td {
  padding: 13px 12px;
  border-bottom: 1px solid #edf2f7;
  vertical-align: top;
}

.register-panel {
  margin-top: 18px;
}

.register-summary {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 12px;
}

.register-summary span {
  padding: 6px 10px;
  border: 1px solid #e2e8f0;
  border-radius: 999px;
  background: #f8fafc;
  color: #475569;
  font-size: 12px;
  font-weight: 900;
}

.register-table {
  min-width: 1050px;
}

.empty-state {
  display: grid;
  place-items: center;
  gap: 5px;
  min-height: 118px;
  padding: 20px;
  text-align: center;
  color: #64748b;
  border: 1px dashed #dbe3ef;
  border-radius: 12px;
  background: #f8fafc;
}

.empty-state strong {
  color: #0f172a;
  font-weight: 950;
}

.empty-state span {
  max-width: 340px;
  font-size: 13px;
  line-height: 1.45;
}

@media (max-width: 1180px) {
  .loan-kpis {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .loan-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 760px) {
  .loan-workspace {
    padding: 16px;
  }

  .loan-header {
    grid-template-columns: 1fr;
  }

  .loan-kpis {
    grid-template-columns: 1fr;
  }

  .summary-tile {
    min-height: auto;
  }

  .risk-card,
  .allowance-card,
  .approved-deduction-card {
    grid-template-columns: 1fr;
  }

  .risk-numbers,
  .queue-details,
  .approved-deduction-main {
    grid-template-columns: 1fr;
  }

  .approved-deduction-actions {
    justify-content: flex-start;
    min-width: 0;
  }

  .queue-main,
  .balance-top {
    display: grid;
  }

  .queue-actions .btn {
    flex: 1 1 120px;
  }
}
`
