'use client'

import type { Employee } from '@/app/employee/employeeData'
import {
  fullName,
  loadStored,
  matchesEmployeeId,
  saveStored,
} from '@/app/employee/employeeData'
import { appendAuditLog as logSensitiveAction } from '@/app/hr/enterpriseData'

export type LoanRequestType = 'Personal Loan' | 'Cash Loan' | 'Emergency Loan' | 'Cash Advance' | 'Loan'
export type LoanRequestStatus = 'Pending' | 'Approved' | 'Rejected' | 'Processed' | 'Cancelled'
export type LoanApprovalStep = 'finance' | 'hr' | 'payroll' | 'complete'
export type LoanApprovalDecision = 'Pending' | 'Approved' | 'Rejected' | 'Skipped'
export type LoanApprovalActor = 'finance'
export type DeductionSchedule = '15th payroll' | '30th payroll' | 'Twice a month' | 'One-time'
export type DeductionControlDecision = 'Full deduction' | 'Partial deduction' | 'Skip temporarily'
export type FinanceLoanTerms = {
  repaymentMonths: number
  deductionSchedule?: DeductionSchedule
  note?: string
}

export type LoanApprovalLog = {
  id: string
  actor: LoanApprovalActor | 'employee' | 'payroll' | string
  decision: LoanApprovalDecision | 'Submitted' | 'Modified' | string
  reason?: string
  createdAt: string
}

export type LoanDeductionControl = {
  period: string
  decision: DeductionControlDecision
  approvedAmount: number
  reason?: string
  approvedBy?: string
  approvedAt: string
}

export type LoanRequest = {
  id: string
  employeeId: string
  employeeName?: string
  employeeCode?: string
  department?: string
  team?: string
  jobTitle?: string
  requestType: LoanRequestType
  customLoanType?: string
  amount: number
  repaymentMonths: number
  repaymentAmount: number
  requestedRepaymentMonths?: number
  requestedDeductionSchedule?: DeductionSchedule
  deductionSchedule?: DeductionSchedule
  deductionPaused?: boolean
  deductionOverrideAmount?: number
  deductionControls?: LoanDeductionControl[]
  financeApprovedRepaymentMonths?: number
  financeApprovedDeductionSchedule?: DeductionSchedule
  financeApprovedRepaymentAmount?: number
  financeTermsAdjusted?: boolean
  financeTermsNote?: string
  reason?: string
  rejectionReason?: string
  status: LoanRequestStatus
  approvalStep: LoanApprovalStep
  hrApprovalStatus: LoanApprovalDecision
  hrApprovedAt?: string
  hrRejectedAt?: string
  financeApprovalStatus?: LoanApprovalDecision
  financeApprovedAt?: string
  financeRejectedAt?: string
  approvalLogs?: LoanApprovalLog[]
  processedAt?: string
  processedPayrollPeriod?: string
  paidAmount?: number
  lastDeductedPayrollPeriod?: string
  payrollRecordId?: string
  createdAt: string
  updatedAt?: string
}

export const loanRequestKey = 'flowsys-hr-loan-requests'
export const customLoanTypesKey = 'flowsys-hr-custom-loan-types'
export const outboundNotificationsKey = 'flowsys-outbound-notifications'
export const defaultLoanTypes: LoanRequestType[] = ['Personal Loan', 'Cash Loan', 'Emergency Loan', 'Cash Advance']

export function money(value?: number) {
  return `PHP ${Number(value || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export function loanDisplayName(request: LoanRequest) {
  return request.customLoanType?.trim() || request.requestType
}

export function loanPaidAmount(request: LoanRequest) {
  return Number(request.paidAmount || 0)
}

export function loanBalanceAmount(request: LoanRequest) {
  return Math.max(0, Number(request.amount || 0) - loanPaidAmount(request))
}

export function calculateLoanScheduledDeduction(request: Pick<LoanRequest, 'amount' | 'repaymentMonths' | 'deductionSchedule' | 'requestType'>) {
  const amount = Math.max(0, Number(request.amount || 0))
  if (amount <= 0) return 0
  if (request.requestType === 'Cash Advance' || request.deductionSchedule === 'One-time') return amount
  const months = Math.max(1, Number(request.repaymentMonths || 1))
  const monthly = amount / months
  return request.deductionSchedule === 'Twice a month' ? monthly / 2 : monthly
}

function isBadLegacyDeduction(request: LoanRequest, value: number, expected: number) {
  if (value <= 0) return true
  if (value <= 1 && expected > 1) return true
  return false
}

export function loanScheduledDeduction(request: LoanRequest) {
  const expected = calculateLoanScheduledDeduction(request)
  const override = Number(request.deductionOverrideAmount || 0)
  if (override > 0 && !isBadLegacyDeduction(request, override, expected)) return override
  const saved = Number(request.repaymentAmount || 0)
  if (saved > 0 && !isBadLegacyDeduction(request, saved, expected)) {
    if (request.deductionSchedule === 'Twice a month') {
      const monthly = Number(request.amount || 0) / Math.max(1, Number(request.repaymentMonths || 1))
      if (Math.abs(saved - monthly) < 0.01) return expected
    }
    return saved
  }
  return expected
}

export function applyFinanceLoanTerms(request: LoanRequest, terms: FinanceLoanTerms) {
  const requestedRepaymentMonths = Number(request.requestedRepaymentMonths || request.repaymentMonths || 1)
  const requestedDeductionSchedule = request.requestedDeductionSchedule || request.deductionSchedule
  const repaymentMonths = Math.max(1, Math.round(Number(terms.repaymentMonths || request.repaymentMonths || 1)))
  const deductionSchedule = terms.deductionSchedule || request.deductionSchedule || 'Twice a month'
  const repaymentAmount = calculateLoanScheduledDeduction({
    ...request,
    repaymentMonths,
    deductionSchedule,
  })

  return {
    ...request,
    requestedRepaymentMonths,
    requestedDeductionSchedule,
    repaymentMonths,
    deductionSchedule,
    repaymentAmount,
    deductionOverrideAmount: undefined,
    financeApprovedRepaymentMonths: repaymentMonths,
    financeApprovedDeductionSchedule: deductionSchedule,
    financeApprovedRepaymentAmount: repaymentAmount,
    financeTermsAdjusted: repaymentMonths !== requestedRepaymentMonths || deductionSchedule !== requestedDeductionSchedule,
    financeTermsNote: terms.note?.trim() || request.financeTermsNote,
  }
}

export function loanRemainingTerms(request: LoanRequest) {
  const balance = loanBalanceAmount(request)
  const scheduled = loanScheduledDeduction(request)
  return scheduled > 0 ? Math.ceil(balance / scheduled) : Number(request.repaymentMonths || 0)
}

export function isTrackableLoanBalance(request: LoanRequest) {
  return (request.status === 'Approved' || request.status === 'Processed') && loanBalanceAmount(request) > 0
}

export function formatDateTime(value?: string) {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'
  return date.toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export function loadLoanRequests() {
  const stored = loadStored<LoanRequest[]>(loanRequestKey, [])
  const normalized = stored.map(normalizeFinanceOwnedLoanRequest)
  if (JSON.stringify(stored) !== JSON.stringify(normalized)) saveStored(loanRequestKey, normalized)
  return normalized
}

function normalizeFinanceOwnedLoanRequest(request: LoanRequest): LoanRequest {
  const scheduled = calculateLoanScheduledDeduction(request)
  const repaymentAmount = isBadLegacyDeduction(request, Number(request.repaymentAmount || 0), scheduled)
    ? scheduled
    : request.repaymentAmount
  const deductionOverrideAmount = request.deductionOverrideAmount && isBadLegacyDeduction(request, Number(request.deductionOverrideAmount || 0), scheduled)
    ? undefined
    : request.deductionOverrideAmount

  const normalizedTerms = {
    ...request,
    repaymentAmount,
    deductionOverrideAmount,
  }

  if (
    normalizedTerms.status === 'Pending' &&
    normalizedTerms.financeApprovalStatus === 'Approved' &&
    (normalizedTerms.approvalStep === 'hr' || normalizedTerms.hrApprovalStatus === 'Pending')
  ) {
    return {
      ...normalizedTerms,
      status: 'Approved',
      approvalStep: 'payroll',
      hrApprovalStatus: 'Skipped',
      updatedAt: normalizedTerms.updatedAt || new Date().toISOString(),
    }
  }
  return normalizedTerms
}

export function loadLoanTypes() {
  return [...defaultLoanTypes, ...loadStored<string[]>(customLoanTypesKey, [])]
}

export function saveLoanRequests(requests: LoanRequest[]) {
  saveStored(loanRequestKey, requests)
  if (typeof window !== 'undefined') window.dispatchEvent(new Event('storage'))
}

export function resolveLoanEmployee(request: LoanRequest, employees: Employee[]) {
  const requestedName = String(request.employeeName || '').trim().toLowerCase()
  return employees.find(employee =>
    employee.id === request.employeeId ||
    employee.employeeId === request.employeeId ||
    matchesEmployeeId(request.employeeId, employee) ||
    fullName(employee).toLowerCase() === requestedName
  )
}

export function loanApprovalState(request: LoanRequest) {
  let step = request.approvalStep
  if (request.status === 'Rejected' || request.status === 'Cancelled' || request.status === 'Processed') step = 'complete'
  else if (request.status === 'Approved') step = 'payroll'
  else if (request.financeApprovalStatus !== 'Approved') step = 'finance'
  else step = 'payroll'

  return {
    step,
    canFinanceDecide: request.status === 'Pending' && step === 'finance',
    canHrDecide: false,
    canPayrollDeduct: request.status === 'Approved' && step === 'payroll',
    label: step === 'finance'
      ? 'Waiting for Finance'
      : request.status === 'Approved'
          ? 'Approved for Payroll'
          : request.status,
  }
}

export function decideLoanRequest(request: LoanRequest, employee: Employee | undefined, actor: LoanApprovalActor, decision: 'Approved' | 'Rejected') {
  const employeeName = fullName(employee) || request.employeeName || 'employee'
  const now = new Date().toISOString()
  const state = loanApprovalState(request)
  const log = (nextDecision: LoanApprovalDecision): LoanApprovalLog => ({
    id: `LOG-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    actor,
    decision: nextDecision,
    createdAt: now,
  })

  if (!state.canFinanceDecide) return request
  if (decision === 'Rejected') {
    const next = {
      ...request,
      status: 'Rejected' as const,
      approvalStep: 'complete' as const,
      financeApprovalStatus: 'Rejected' as const,
      financeRejectedAt: now,
      approvalLogs: [...(request.approvalLogs || []), log('Rejected')],
      updatedAt: now,
    }
    logSensitiveAction({ action: 'loan.approval', targetType: 'Loan Request', targetId: request.id, summary: `Finance rejected ${request.requestType} request for ${employeeName}.` })
    return next
  }
  const next = {
    ...request,
    status: 'Approved' as const,
    approvalStep: 'payroll' as const,
    financeApprovalStatus: 'Approved' as const,
    financeApprovedAt: now,
    hrApprovalStatus: 'Skipped' as const,
    approvalLogs: [...(request.approvalLogs || []), log('Approved')],
    updatedAt: now,
  }
  logSensitiveAction({ action: 'loan.approval', targetType: 'Loan Request', targetId: request.id, summary: `Finance approved ${request.requestType} request for ${employeeName} payroll deduction.` })
  return next
}

export function appendSystemNotification(subject: string, message: string, target = '/accounting/payroll-finance') {
  if (typeof window === 'undefined') return
  const current = loadStored<Array<Record<string, unknown>>>(outboundNotificationsKey, [])
  saveStored(outboundNotificationsKey, [
    {
      id: Date.now(),
      channel: 'Email',
      recipientRole: 'Finance',
      subject,
      message,
      relatedType: 'Loan Request',
      relatedId: Date.now(),
      status: 'Queued',
      target,
      createdAt: new Date().toISOString(),
    },
    ...current,
  ])
  window.dispatchEvent(new Event('storage'))
}
