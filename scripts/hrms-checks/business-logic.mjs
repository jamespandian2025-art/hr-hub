import { strict as assert } from 'node:assert'

const rules = await import('../../app/hr/payroll/loanDeductionRules.ts')
const taxRules = await import('../../app/hr/payroll/taxRules.ts')
const attendanceRules = await import('../../app/hr/payroll/attendanceRules.ts')
const scheduleRules = await import('../../app/hr/payroll/payrollSchedule.ts')
const withholdingCalculatorRules = await import('../../app/accounting/withholding-tax-calculator/calculatorRules.ts')

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
  assert.equal(breakdown.sss, 1750)
  assert.equal(breakdown.philHealth, 1250)
  assert.equal(breakdown.pagIbig, 200)
  assert.equal(breakdown.taxableIncome, 46800)
  assert.equal(breakdown.tax, 4568.4)
})

check('sss contribution uses the 2025 onward employee MSC schedule', () => {
  assert.equal(taxRules.monthlySalaryCreditForSssEmployee(0), 0)
  assert.equal(taxRules.monthlySalaryCreditForSssEmployee(5249.99), 5000)
  assert.equal(taxRules.monthlySalaryCreditForSssEmployee(5250), 5500)
  assert.equal(taxRules.monthlySalaryCreditForSssEmployee(34749.99), 34500)
  assert.equal(taxRules.monthlySalaryCreditForSssEmployee(34750), 35000)
  assert.equal(taxRules.calculateStatutoryContributions2026(50000, 'monthly').sss, 1750)
})

check('pag-ibig contribution uses the 2024 onward employee cap and low-salary rate', () => {
  assert.equal(taxRules.calculatePagIbigEmployeeShare2026(0), 0)
  assert.equal(taxRules.calculatePagIbigEmployeeShare2026(1500), 15)
  assert.equal(taxRules.calculatePagIbigEmployeeShare2026(1500.01), 30)
  assert.equal(taxRules.calculatePagIbigEmployeeShare2026(10000), 200)
  assert.equal(taxRules.calculatePagIbigEmployeeShare2026(50000), 200)
})

check('philippine withholding tax uses BIR Annex E payroll-period tables', () => {
  assert.equal(taxRules.defaultPayrollFrequency, 'semi-monthly')
  assert.equal(taxRules.calculateWithholdingTax(28000, 'monthly'), 1075.05)
  assert.equal(taxRules.calculateWithholdingTax(25000, 'semi-monthly'), 2604.1)
  assert.equal(taxRules.calculateWithholdingTax(9500, 'weekly'), 794.2)
})

check('semi-monthly payroll uses direct BIR semi-monthly statutory deductions and tax table', () => {
  const breakdown = taxRules.buildPhilippinePayrollBreakdown2026({
    monthlyBasicSalary: 50000,
    periodTaxableEarnings: 25000,
    periodNonTaxableAllowances: 4000,
    frequency: 'semi-monthly',
  })
  assert.equal(breakdown.sss, 875)
  assert.equal(breakdown.philHealth, 625)
  assert.equal(breakdown.pagIbig, 100)
  assert.equal(breakdown.taxableIncome, 23400)
  assert.equal(breakdown.tax, 2284.1)
})

check('default payroll schedule follows twice-a-month Philippine payroll', () => {
  assert.equal(scheduleRules.defaultPayrollSchedule.frequency, 'semi-monthly')
  assert.equal(scheduleRules.defaultPayrollSchedule.firstCutoffDay, 15)
  assert.equal(scheduleRules.defaultPayrollSchedule.secondCutoffDay, 31)
})

check('payroll generation date chooses the matching semi-monthly period', () => {
  const firstHalf = scheduleRules.getPayrollPeriod(
    scheduleRules.defaultPayrollSchedule,
    scheduleRules.dateFromPayrollInput('2026-05-14'),
  )
  const secondHalf = scheduleRules.getPayrollPeriod(
    scheduleRules.defaultPayrollSchedule,
    scheduleRules.dateFromPayrollInput('2026-05-29'),
  )

  assert.equal(firstHalf.label, 'May 1-15, 2026')
  assert.equal(firstHalf.startDate, '2026-05-01')
  assert.equal(firstHalf.endDate, '2026-05-15')
  assert.equal(secondHalf.label, 'May 16-31, 2026')
  assert.equal(secondHalf.startDate, '2026-05-16')
  assert.equal(secondHalf.endDate, '2026-05-31')
})

check('withholding tax calculator matches Sprout monthly above-minimum output shape', () => {
  const result = withholdingCalculatorRules.calculateWithholdingTaxCalculator({
    salaryType: 'monthly',
    wageType: 'amwe',
    basicSalary: 28000,
    regularTaxableCompensation: 0,
    supplementaryTaxableCompensation: 0,
    nonTaxableCompensation: 0,
  })
  assert.equal(result.grossCompensationIncome, 28000)
  assert.equal(result.totalTaxableCompensationIncome, 28000)
  assert.equal(result.totalNonTaxableCompensationIncome, 0)
  assert.equal(result.estimatedWithholdingTax, 1075.05)
})

check('withholding tax calculator treats MWE basic salary as exempt like Sprout', () => {
  const result = withholdingCalculatorRules.calculateWithholdingTaxCalculator({
    salaryType: 'daily',
    wageType: 'mwe',
    basicSalary: 1000,
    regularTaxableCompensation: 0,
    supplementaryTaxableCompensation: 0,
    nonTaxableCompensation: 0,
  })
  assert.equal(result.grossCompensationIncome, 1000)
  assert.equal(result.totalTaxableCompensationIncome, 0)
  assert.equal(result.totalNonTaxableCompensationIncome, 1000)
  assert.equal(result.estimatedWithholdingTax, 0)
})

check('payroll attendance deducts marked absent weekdays from basic pay', () => {
  const summary = attendanceRules.buildPayrollAttendanceSummary({
    periodStart: '2026-05-01',
    periodEnd: '2026-05-31',
    basicSalary: 23000,
    employeeIds: ['emp-1', 'EMP-001'],
    attendanceRecords: [
      { employeeId: 'emp-1', date: '2026-05-04', status: 'Present' },
      { employeeId: 'emp-1', date: '2026-05-05', status: 'Absent' },
      { employeeId: 'emp-1', date: '2026-05-06', status: 'Late' },
      { employeeId: 'emp-1', date: '2026-05-07', status: 'On Leave' },
    ],
  })
  assert.equal(summary.payableDays, 21)
  assert.equal(summary.presentDays, 1)
  assert.equal(summary.lateDays, 1)
  assert.equal(summary.leaveDays, 1)
  assert.equal(summary.absentDays, 1)
  assert.equal(summary.unrecordedDays, 17)
  assert.equal(summary.paidDays, 3)
  assert.equal(summary.dailyBasicRate, 1095.24)
  assert.equal(summary.absenceDeduction, 19714.29)
  assert.equal(summary.earnedBasicPay, 3285.71)
})

check('payroll attendance treats unrecorded workdays as unpaid', () => {
  const summary = attendanceRules.buildPayrollAttendanceSummary({
    periodStart: '2026-05-01',
    periodEnd: '2026-05-15',
    basicSalary: 12000,
    employeeIds: ['emp-2'],
    attendanceRecords: [
      { employeeId: 'emp-2', date: '2026-05-04', status: 'Present' },
    ],
  })
  assert.equal(summary.payableDays, 11)
  assert.equal(summary.absentDays, 0)
  assert.equal(summary.unrecordedDays, 10)
  assert.equal(attendanceRules.recordedPaidAttendanceDays(summary), 1)
  assert.equal(attendanceRules.paidAttendanceDays(summary), 1)
  assert.equal(summary.absenceDeduction, 10909.09)
  assert.equal(summary.earnedBasicPay, 1090.91)
})

check('payroll attendance pays only seven worked days in a demo period', () => {
  const summary = attendanceRules.buildPayrollAttendanceSummary({
    periodStart: '2026-05-01',
    periodEnd: '2026-05-15',
    basicSalary: 11000,
    employeeIds: ['emp-demo'],
    attendanceRecords: [
      '2026-05-01',
      '2026-05-04',
      '2026-05-05',
      '2026-05-06',
      '2026-05-07',
      '2026-05-08',
      '2026-05-11',
    ].map(date => ({ employeeId: 'emp-demo', date, status: 'Present' })),
  })
  assert.equal(summary.payableDays, 11)
  assert.equal(summary.paidDays, 7)
  assert.equal(summary.unrecordedDays, 4)
  assert.equal(summary.dailyBasicRate, 1000)
  assert.equal(summary.earnedBasicPay, 7000)
  assert.equal(summary.absenceDeduction, 4000)
})
