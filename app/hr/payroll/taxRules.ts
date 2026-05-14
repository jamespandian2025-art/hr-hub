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

export const defaultPayrollFrequency: PayrollFrequency = 'monthly'

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
    employeeRate: 0.045,
    employerRate: 0.095,
    monthlySalaryCreditCeiling: 30000,
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
    employerRate: 0.02,
    monthlyCompensationCeiling: 10000,
    employeeMonthlyMaximum: 200,
    employerMonthlyMaximum: 200,
  },
  bonusTaxExemptionAnnualLimit: 90000,
} as const

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
  const taxable = Math.max(0, Number(monthlyTaxableIncome || 0))
  if (taxable <= 20833) return 0
  if (taxable <= 33332) return (taxable - 20833) * 0.15
  if (taxable <= 66666) return 1875 + (taxable - 33333) * 0.2
  if (taxable <= 166666) return 8541.8 + (taxable - 66667) * 0.25
  if (taxable <= 666666) return 33541.8 + (taxable - 166667) * 0.3
  return 183541.8 + (taxable - 666667) * 0.35
}

export function calculateWithholdingTax(periodTaxablePay: number, frequency: PayrollFrequency = defaultPayrollFrequency) {
  const monthlyEquivalent = Number(periodTaxablePay || 0) * payrollPeriodsPerMonth(frequency)
  return roundPayrollMoney(calculateMonthlyWithholdingTax2026(monthlyEquivalent) / payrollPeriodsPerMonth(frequency))
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
  const sssMonthly = Math.min(basic, philippinePayroll2026.sss.monthlySalaryCreditCeiling) * philippinePayroll2026.sss.employeeRate
  const philHealthBase = basic > 0
    ? Math.min(Math.max(basic, philippinePayroll2026.philHealth.monthlySalaryFloor), philippinePayroll2026.philHealth.monthlySalaryCeiling)
    : 0
  const philHealthMonthly = philHealthBase * philippinePayroll2026.philHealth.employeeShareRate
  const pagIbigMonthly = Math.min(
    Math.min(basic, philippinePayroll2026.pagIbig.monthlyCompensationCeiling) * philippinePayroll2026.pagIbig.employeeRate,
    philippinePayroll2026.pagIbig.employeeMonthlyMaximum,
  )

  return {
    sss: roundPayrollMoney(sssMonthly / divisor),
    philHealth: roundPayrollMoney(philHealthMonthly / divisor),
    pagIbig: roundPayrollMoney(pagIbigMonthly / divisor),
  }
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
  return buildPhilippinePayrollBreakdown2026({
    monthlyBasicSalary: Number(gross || 0),
    periodTaxableEarnings: Number(gross || 0),
    periodNonTaxableAllowances: 0,
    frequency,
  })
}
