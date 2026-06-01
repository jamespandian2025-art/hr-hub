export type PayrollFrequency = 'monthly' | 'semi-monthly' | 'bi-weekly' | 'weekly'

export type PayrollTaxBreakdown = {
  sss: number
  philHealth: number
  pagIbig: number
  tax: number
  loanOrCashAdvance?: number
  taxableIncome?: number
  grossTaxableEarnings?: number
  nonTaxableAllowances?: number
}

export const defaultPayrollFrequency: PayrollFrequency = 'semi-monthly'

export function roundPayrollMoney(value: number) {
  return Math.max(0, Math.round(Number(value || 0) * 100) / 100)
}

const periodsPerYear: Record<PayrollFrequency, number> = {
  monthly: 12,
  'semi-monthly': 24,
  'bi-weekly': 26,
  weekly: 52,
}

export const philippinePayroll2026 = {
  sss: {
    employeeRate: 0.05,
    employerRate: 0.1,
    monthlySalaryCreditFloor: 5000,
    monthlySalaryCreditCeiling: 35000,
    monthlySalaryCreditStep: 500,
  },
  philHealth: {
    premiumRate: 0.05,
    employeeShareRate: 0.025,
    employerShareRate: 0.025,
    monthlySalaryFloor: 10000,
    monthlySalaryCeiling: 100000,
  },
  pagIbig: {
    employeeRate: 0.02,
    employeeLowSalaryRate: 0.01,
    lowSalaryThreshold: 1500,
    employerRate: 0.02,
    monthlyCompensationCeiling: 10000,
    employeeMonthlyMaximum: 200,
    employerMonthlyMaximum: 200,
  },
  bonusTaxExemptionAnnualLimit: 90000,
} as const

export type WithholdingTaxBracket = {
  upper: number
  baseTax: number
  excessOver: number
  rate: number
}

export const philippineWithholdingTaxTables2023Onward: Partial<Record<PayrollFrequency, WithholdingTaxBracket[]>> = {
  monthly: [
    { upper: 20833, baseTax: 0, excessOver: 0, rate: 0 },
    { upper: 33332, baseTax: 0, excessOver: 20833, rate: 0.15 },
    { upper: 66666, baseTax: 1875, excessOver: 33333, rate: 0.2 },
    { upper: 166666, baseTax: 8541.8, excessOver: 66667, rate: 0.25 },
    { upper: 666666, baseTax: 33541.8, excessOver: 166667, rate: 0.3 },
    { upper: Number.POSITIVE_INFINITY, baseTax: 183541.8, excessOver: 666667, rate: 0.35 },
  ],
  'semi-monthly': [
    { upper: 10417, baseTax: 0, excessOver: 0, rate: 0 },
    { upper: 16666, baseTax: 0, excessOver: 10417, rate: 0.15 },
    { upper: 33332, baseTax: 937.5, excessOver: 16667, rate: 0.2 },
    { upper: 83332, baseTax: 4270.7, excessOver: 33333, rate: 0.25 },
    { upper: 333332, baseTax: 16770.7, excessOver: 83333, rate: 0.3 },
    { upper: Number.POSITIVE_INFINITY, baseTax: 91770.7, excessOver: 333333, rate: 0.35 },
  ],
  weekly: [
    { upper: 4808, baseTax: 0, excessOver: 0, rate: 0 },
    { upper: 7691, baseTax: 0, excessOver: 4808, rate: 0.15 },
    { upper: 15384, baseTax: 432.6, excessOver: 7692, rate: 0.2 },
    { upper: 38461, baseTax: 1971.2, excessOver: 15385, rate: 0.25 },
    { upper: 153845, baseTax: 7740.45, excessOver: 38462, rate: 0.3 },
    { upper: Number.POSITIVE_INFINITY, baseTax: 42355.65, excessOver: 153846, rate: 0.35 },
  ],
}

export function payrollPeriodsPerMonth(frequency: PayrollFrequency = defaultPayrollFrequency) {
  return (periodsPerYear[frequency] || periodsPerYear[defaultPayrollFrequency]) / 12
}

export function calculateAnnualWithholdingTax(annualTaxableIncome: number) {
  const taxable = Math.max(0, Number(annualTaxableIncome || 0))
  if (taxable <= 250000) return 0
  if (taxable <= 400000) return (taxable - 250000) * 0.15
  if (taxable <= 800000) return 22500 + (taxable - 400000) * 0.2
  if (taxable <= 2000000) return 102500 + (taxable - 800000) * 0.25
  if (taxable <= 8000000) return 402500 + (taxable - 2000000) * 0.3
  return 2202500 + (taxable - 8000000) * 0.35
}

export function calculateMonthlyWithholdingTax2026(monthlyTaxableIncome: number) {
  return calculateWithholdingTax(monthlyTaxableIncome, 'monthly')
}

export function withholdingTaxBracketFor(periodTaxablePay: number, frequency: PayrollFrequency) {
  const taxable = roundPayrollMoney(periodTaxablePay)
  const table = philippineWithholdingTaxTables2023Onward[frequency]
  if (!table) return null
  return table.find(item => taxable <= item.upper) || table[table.length - 1]
}

export function calculateWithholdingTaxFromTable(periodTaxablePay: number, frequency: PayrollFrequency) {
  const taxable = roundPayrollMoney(periodTaxablePay)
  const bracket = withholdingTaxBracketFor(taxable, frequency)
  if (!bracket) return null
  return roundPayrollMoney(bracket.baseTax + Math.max(0, taxable - bracket.excessOver) * bracket.rate)
}

export function calculateWithholdingTax(periodTaxablePay: number, frequency: PayrollFrequency = defaultPayrollFrequency) {
  const tableTax = calculateWithholdingTaxFromTable(periodTaxablePay, frequency)
  if (tableTax !== null) return tableTax
  const periodsPerYearCount = periodsPerYear[frequency] || periodsPerYear[defaultPayrollFrequency]
  return roundPayrollMoney(calculateAnnualWithholdingTax(Number(periodTaxablePay || 0) * periodsPerYearCount) / periodsPerYearCount)
}

export function deductionBreakdownTotal(breakdown: Partial<PayrollTaxBreakdown>) {
  return roundPayrollMoney(
    Number(breakdown.sss || 0) +
    Number(breakdown.philHealth || 0) +
    Number(breakdown.pagIbig || 0) +
    Number(breakdown.tax || 0) +
    Number(breakdown.loanOrCashAdvance || 0),
  )
}

export function buildProfileContributionBreakdown(profileDeduction: number) {
  const total = roundPayrollMoney(Number(profileDeduction || 0))
  if (total <= 0) return { sss: 0, philHealth: 0, pagIbig: 0 }
  const sss = roundPayrollMoney(total * 0.48)
  const philHealth = roundPayrollMoney(total * 0.35)
  const pagIbig = roundPayrollMoney(total - sss - philHealth)
  return { sss, philHealth, pagIbig }
}

export function calculateStatutoryContributions2026(monthlyBasicSalary: number, frequency: PayrollFrequency = defaultPayrollFrequency) {
  const basic = Math.max(0, Number(monthlyBasicSalary || 0))
  const divisor = payrollPeriodsPerMonth(frequency)
  const sssMonthly = monthlySalaryCreditForSssEmployee(basic) * philippinePayroll2026.sss.employeeRate
  const philHealthBase = basic > 0
    ? Math.min(Math.max(basic, philippinePayroll2026.philHealth.monthlySalaryFloor), philippinePayroll2026.philHealth.monthlySalaryCeiling)
    : 0
  const philHealthMonthly = philHealthBase * philippinePayroll2026.philHealth.employeeShareRate
  const pagIbigMonthly = calculatePagIbigEmployeeShare2026(basic)

  return {
    sss: roundPayrollMoney(sssMonthly / divisor),
    philHealth: roundPayrollMoney(philHealthMonthly / divisor),
    pagIbig: roundPayrollMoney(pagIbigMonthly / divisor),
  }
}

export function monthlySalaryCreditForSssEmployee(monthlyBasicSalary: number) {
  const basic = Math.max(0, Number(monthlyBasicSalary || 0))
  if (basic <= 0) return 0
  const { monthlySalaryCreditFloor, monthlySalaryCreditCeiling, monthlySalaryCreditStep } = philippinePayroll2026.sss
  const nearestCredit = Math.floor((basic + monthlySalaryCreditStep / 2) / monthlySalaryCreditStep) * monthlySalaryCreditStep
  return Math.min(monthlySalaryCreditCeiling, Math.max(monthlySalaryCreditFloor, nearestCredit))
}

export function calculatePagIbigEmployeeShare2026(monthlyBasicSalary: number) {
  const basic = Math.max(0, Number(monthlyBasicSalary || 0))
  if (basic <= 0) return 0
  const rate = basic <= philippinePayroll2026.pagIbig.lowSalaryThreshold
    ? philippinePayroll2026.pagIbig.employeeLowSalaryRate
    : philippinePayroll2026.pagIbig.employeeRate
  return roundPayrollMoney(Math.min(
    Math.min(basic, philippinePayroll2026.pagIbig.monthlyCompensationCeiling) * rate,
    philippinePayroll2026.pagIbig.employeeMonthlyMaximum,
  ))
}

export function calculateTaxableBonusPortion(yearToDateBonusAnd13thMonth: number, currentBonusOr13thMonth: number) {
  const previous = Math.max(0, Number(yearToDateBonusAnd13thMonth || 0))
  const current = Math.max(0, Number(currentBonusOr13thMonth || 0))
  const remainingExempt = Math.max(0, philippinePayroll2026.bonusTaxExemptionAnnualLimit - previous)
  return roundPayrollMoney(Math.max(0, current - remainingExempt))
}

export function buildPhilippinePayrollBreakdown2026({
  monthlyBasicSalary,
  periodTaxableEarnings,
  periodNonTaxableAllowances = 0,
  taxableBonus = 0,
  frequency = defaultPayrollFrequency,
}: {
  monthlyBasicSalary: number
  periodTaxableEarnings: number
  periodNonTaxableAllowances?: number
  taxableBonus?: number
  frequency?: PayrollFrequency
}): PayrollTaxBreakdown {
  const taxableEarnings = roundPayrollMoney(Number(periodTaxableEarnings || 0) + Number(taxableBonus || 0))
  const nonTaxableAllowances = roundPayrollMoney(Number(periodNonTaxableAllowances || 0))
  const contributions = calculateStatutoryContributions2026(monthlyBasicSalary, frequency)
  const contributionTotal = deductionBreakdownTotal(contributions)
  const taxableIncome = roundPayrollMoney(Math.max(0, taxableEarnings - contributionTotal))
  return {
    ...contributions,
    tax: calculateWithholdingTax(taxableIncome, frequency),
    loanOrCashAdvance: 0,
    taxableIncome,
    grossTaxableEarnings: taxableEarnings,
    nonTaxableAllowances,
  }
}

export function buildEmployeeTaxBreakdown(gross: number, _profileDeduction: number, frequency: PayrollFrequency = defaultPayrollFrequency): PayrollTaxBreakdown {
  const periodGross = Number(gross || 0)
  return buildPhilippinePayrollBreakdown2026({
    monthlyBasicSalary: periodGross * payrollPeriodsPerMonth(frequency),
    periodTaxableEarnings: periodGross,
    periodNonTaxableAllowances: 0,
    frequency,
  })
}
