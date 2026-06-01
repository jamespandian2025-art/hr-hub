export type SalaryType = 'daily' | 'weekly' | 'monthly' | 'yearly'
export type WageType = 'mwe' | 'amwe'

export type WithholdingTaxBracket = {
  upper: number
  baseTax: number
  excessOver: number
  rate: number
}

export type WithholdingTaxCalculatorValues = {
  salaryType: SalaryType
  wageType: WageType
  basicSalary: number
  regularTaxableCompensation: number
  supplementaryTaxableCompensation: number
  nonTaxableCompensation: number
}

export type WithholdingTaxCalculatorResult = {
  grossCompensationIncome: number
  totalTaxableCompensationIncome: number
  totalNonTaxableCompensationIncome: number
  estimatedWithholdingTax: number
  bracket: WithholdingTaxBracket | null
  taxableBasicSalary: number
  exemptBasicSalary: number
}

export const dailyWithholdingTaxTable2023Onward: WithholdingTaxBracket[] = [
  { upper: 685, baseTax: 0, excessOver: 0, rate: 0 },
  { upper: 1095, baseTax: 0, excessOver: 685, rate: 0.15 },
  { upper: 2191, baseTax: 61.65, excessOver: 1096, rate: 0.2 },
  { upper: 5478, baseTax: 280.85, excessOver: 2192, rate: 0.25 },
  { upper: 21917, baseTax: 1102.6, excessOver: 5479, rate: 0.3 },
  { upper: Number.POSITIVE_INFINITY, baseTax: 6034.3, excessOver: 21918, rate: 0.35 },
]

export const weeklyWithholdingTaxTable2023Onward: WithholdingTaxBracket[] = [
  { upper: 4808, baseTax: 0, excessOver: 0, rate: 0 },
  { upper: 7691, baseTax: 0, excessOver: 4808, rate: 0.15 },
  { upper: 15384, baseTax: 432.6, excessOver: 7692, rate: 0.2 },
  { upper: 38461, baseTax: 1971.2, excessOver: 15385, rate: 0.25 },
  { upper: 153845, baseTax: 7740.45, excessOver: 38462, rate: 0.3 },
  { upper: Number.POSITIVE_INFINITY, baseTax: 42355.65, excessOver: 153846, rate: 0.35 },
]

export const monthlyWithholdingTaxTable2023Onward: WithholdingTaxBracket[] = [
  { upper: 20833, baseTax: 0, excessOver: 0, rate: 0 },
  { upper: 33332, baseTax: 0, excessOver: 20833, rate: 0.15 },
  { upper: 66666, baseTax: 1875, excessOver: 33333, rate: 0.2 },
  { upper: 166666, baseTax: 8541.8, excessOver: 66667, rate: 0.25 },
  { upper: 666666, baseTax: 33541.8, excessOver: 166667, rate: 0.3 },
  { upper: Number.POSITIVE_INFINITY, baseTax: 183541.8, excessOver: 666667, rate: 0.35 },
]

export const annualWithholdingTaxTable2023Onward: WithholdingTaxBracket[] = [
  { upper: 250000, baseTax: 0, excessOver: 0, rate: 0 },
  { upper: 400000, baseTax: 0, excessOver: 250000, rate: 0.15 },
  { upper: 800000, baseTax: 22500, excessOver: 400000, rate: 0.2 },
  { upper: 2000000, baseTax: 102500, excessOver: 800000, rate: 0.25 },
  { upper: 8000000, baseTax: 402500, excessOver: 2000000, rate: 0.3 },
  { upper: Number.POSITIVE_INFINITY, baseTax: 2202500, excessOver: 8000000, rate: 0.35 },
]

export function roundCalculatorMoney(value: number) {
  return Math.max(0, Math.round(Number(value || 0) * 100) / 100)
}

export function withholdingTaxBracketForSalaryType(taxableCompensation: number, salaryType: SalaryType) {
  const taxable = roundCalculatorMoney(taxableCompensation)
  const table = salaryType === 'daily'
    ? dailyWithholdingTaxTable2023Onward
    : salaryType === 'yearly'
      ? annualWithholdingTaxTable2023Onward
      : salaryType === 'weekly'
        ? weeklyWithholdingTaxTable2023Onward
        : monthlyWithholdingTaxTable2023Onward
  return table?.find(item => taxable <= item.upper) || table?.[table.length - 1] || null
}

export function calculateWithholdingTaxForSalaryType(taxableCompensation: number, salaryType: SalaryType) {
  const bracket = withholdingTaxBracketForSalaryType(taxableCompensation, salaryType)
  return bracket ? roundCalculatorMoney(bracket.baseTax + Math.max(0, roundCalculatorMoney(taxableCompensation) - bracket.excessOver) * bracket.rate) : 0
}

export function calculateWithholdingTaxCalculator(values: WithholdingTaxCalculatorValues): WithholdingTaxCalculatorResult {
  const basicSalary = roundCalculatorMoney(values.basicSalary)
  const taxableBasicSalary = values.wageType === 'amwe' ? basicSalary : 0
  const exemptBasicSalary = values.wageType === 'mwe' ? basicSalary : 0
  const regularTaxableCompensation = roundCalculatorMoney(values.regularTaxableCompensation)
  const supplementaryTaxableCompensation = roundCalculatorMoney(values.supplementaryTaxableCompensation)
  const nonTaxableCompensation = roundCalculatorMoney(values.nonTaxableCompensation)
  const totalTaxableCompensationIncome = roundCalculatorMoney(taxableBasicSalary + regularTaxableCompensation + supplementaryTaxableCompensation)
  const totalNonTaxableCompensationIncome = roundCalculatorMoney(exemptBasicSalary + nonTaxableCompensation)
  const grossCompensationIncome = roundCalculatorMoney(totalTaxableCompensationIncome + totalNonTaxableCompensationIncome)

  return {
    grossCompensationIncome,
    totalTaxableCompensationIncome,
    totalNonTaxableCompensationIncome,
    estimatedWithholdingTax: calculateWithholdingTaxForSalaryType(totalTaxableCompensationIncome, values.salaryType),
    bracket: withholdingTaxBracketForSalaryType(totalTaxableCompensationIncome, values.salaryType),
    taxableBasicSalary,
    exemptBasicSalary,
  }
}
