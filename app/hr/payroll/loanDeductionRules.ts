export type PayrollLoanControl = {
  period: string
  decision: 'Full deduction' | 'Partial deduction' | 'Skip temporarily'
  approvedAmount: number
}

export type PayrollLoanInput = {
  amount?: number
  paidAmount?: number
  deductionPaused?: boolean
  deductionControls?: PayrollLoanControl[]
}

export type PayrollLoanDecision = {
  applied: number
  scheduled: number
  remaining: number
  requiresFinanceDecision: boolean
  reason?: string
}

export function roundPayrollDeduction(value: number) {
  return Math.max(0, Math.round(Number(value || 0) * 100) / 100)
}

export function remainingLoanBalance(loan: PayrollLoanInput) {
  return roundPayrollDeduction(Math.max(0, Number(loan.amount || 0) - Number(loan.paidAmount || 0)))
}

export function latestLoanControlForPeriod(loan: PayrollLoanInput, period: string) {
  return loan.deductionControls?.find(control => control.period === period)
}

export function resolvePayrollLoanDeduction({
  loan,
  period,
  scheduledAmount,
  availablePay,
}: {
  loan: PayrollLoanInput
  period: string
  scheduledAmount: number
  availablePay: number
}): PayrollLoanDecision {
  const remaining = remainingLoanBalance(loan)
  const scheduled = roundPayrollDeduction(Math.min(Math.max(0, scheduledAmount), remaining))
  const available = roundPayrollDeduction(availablePay)
  const control = latestLoanControlForPeriod(loan, period)

  if (loan.deductionPaused) {
    return { applied: 0, scheduled, remaining, requiresFinanceDecision: false, reason: 'Deduction is paused by Finance.' }
  }

  if (remaining <= 0 || scheduled <= 0) {
    return { applied: 0, scheduled: 0, remaining, requiresFinanceDecision: false, reason: 'No remaining scheduled balance.' }
  }

  if (control?.decision === 'Skip temporarily') {
    return { applied: 0, scheduled, remaining, requiresFinanceDecision: false, reason: 'Finance skipped this deduction for the period.' }
  }

  if (control) {
    const approved = roundPayrollDeduction(Math.min(control.approvedAmount, remaining, available))
    return {
      applied: approved,
      scheduled,
      remaining,
      requiresFinanceDecision: false,
      reason: control.decision,
    }
  }

  if (scheduled > available) {
    return {
      applied: 0,
      scheduled,
      remaining,
      requiresFinanceDecision: true,
      reason: 'Scheduled deduction exceeds available pay and needs Finance approval.',
    }
  }

  return {
    applied: scheduled,
    scheduled,
    remaining,
    requiresFinanceDecision: false,
    reason: 'Scheduled deduction fits available pay.',
  }
}
