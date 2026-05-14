import { strict as assert } from 'node:assert'

const rules = await import('../../app/hr/payroll/loanDeductionRules.ts')
const taxRules = await import('../../app/hr/payroll/taxRules.ts')

function check(name, fn) {
  try {
    fn()
    console.log(`ok - ${name}`)
  } catch (error) {
    console.error(`not ok - ${name}`)
    throw error
  }
}

check('loan deduction fits available pay without finance override', () => {
  const decision = rules.resolvePayrollLoanDeduction({
    loan: { amount: 5000, paidAmount: 0 },
    period: 'May 2026',
    scheduledAmount: 833.33,
    availablePay: 2000,
  })
  assert.equal(decision.applied, 833.33)
  assert.equal(decision.requiresFinanceDecision, false)
})

check('loan deduction is blocked when scheduled amount exceeds available pay without finance decision', () => {
  const decision = rules.resolvePayrollLoanDeduction({
    loan: { amount: 5000, paidAmount: 0 },
    period: 'May 2026',
    scheduledAmount: 833.33,
    availablePay: 500,
  })
  assert.equal(decision.applied, 0)
  assert.equal(decision.requiresFinanceDecision, true)
})

check('finance partial override is respected within available pay', () => {
  const decision = rules.resolvePayrollLoanDeduction({
    loan: {
      amount: 5000,
      paidAmount: 0,
      deductionControls: [{ period: 'May 2026', decision: 'Partial deduction', approvedAmount: 400 }],
    },
    period: 'May 2026',
    scheduledAmount: 833.33,
    availablePay: 500,
  })
  assert.equal(decision.applied, 400)
  assert.equal(decision.requiresFinanceDecision, false)
})

check('finance skip override blocks deduction', () => {
  const decision = rules.resolvePayrollLoanDeduction({
    loan: {
      amount: 5000,
      paidAmount: 0,
      deductionControls: [{ period: 'May 2026', decision: 'Skip temporarily', approvedAmount: 0 }],
    },
    period: 'May 2026',
    scheduledAmount: 833.33,
    availablePay: 3000,
  })
  assert.equal(decision.applied, 0)
  assert.equal(decision.requiresFinanceDecision, false)
})

check('philippine payroll computes 2026 statutory deductions before tax', () => {
  const breakdown = taxRules.buildPhilippinePayrollBreakdown2026({
    monthlyBasicSalary: 50000,
    periodTaxableEarnings: 50000,
    periodNonTaxableAllowances: 8000,
    frequency: 'monthly',
  })
  assert.equal(breakdown.sss, 1350)
  assert.equal(breakdown.philHealth, 1250)
  assert.equal(breakdown.pagIbig, 200)
  assert.equal(breakdown.taxableIncome, 47200)
  assert.equal(breakdown.tax, 4648.4)
})

check('semi-monthly payroll splits monthly statutory deductions and tax table', () => {
  const breakdown = taxRules.buildPhilippinePayrollBreakdown2026({
    monthlyBasicSalary: 50000,
    periodTaxableEarnings: 25000,
    periodNonTaxableAllowances: 4000,
    frequency: 'semi-monthly',
  })
  assert.equal(breakdown.sss, 675)
  assert.equal(breakdown.philHealth, 625)
  assert.equal(breakdown.pagIbig, 100)
  assert.equal(breakdown.taxableIncome, 23600)
  assert.equal(breakdown.tax, 2324.2)
})
