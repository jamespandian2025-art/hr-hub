'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import {
  Calculator,
  Download,
  ReceiptText,
  RefreshCcw,
  ShieldCheck,
  WalletCards,
} from 'lucide-react'
import {
  calculateWithholdingTaxCalculator,
  roundCalculatorMoney,
  type SalaryType,
  type WageType,
} from './calculatorRules'

const font = 'var(--font-body)'

type FieldKey =
  | 'representationAllowance'
  | 'transportationAllowance'
  | 'costOfLivingAllowance'
  | 'fixedHousingAllowance'
  | 'otherTaxableRegularCompensation'
  | 'commission'
  | 'fees'
  | 'hazardPay'
  | 'overtimePay'
  | 'otherTaxableSupplementaryCompensation'
  | 'holidayPayMwe'
  | 'overtimePayMwe'
  | 'nightShiftDifferentialMwe'
  | 'hazardPayMwe'
  | 'thirteenthMonthAndOtherBenefits'
  | 'deMinimisBenefits'
  | 'statutoryEmployeeShare'
  | 'salariesAndOtherCompensation'
  | 'otherNonTaxableCompensation'

type FieldDefinition = {
  key: FieldKey
  label: string
}

const salaryTypes: Array<{ value: SalaryType; label: string }> = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'yearly', label: 'Yearly' },
]

const wageTypes: Array<{ value: WageType; label: string }> = [
  { value: 'mwe', label: 'Minimum Wage Earner (MWE)' },
  { value: 'amwe', label: 'Above Minimum Wage Earner' },
]

const regularTaxableFields: FieldDefinition[] = [
  { key: 'representationAllowance', label: 'Representation Allowance' },
  { key: 'transportationAllowance', label: 'Transportation Allowance' },
  { key: 'costOfLivingAllowance', label: 'Cost of Living Allowance' },
  { key: 'fixedHousingAllowance', label: 'Fixed Housing Allowance' },
  { key: 'otherTaxableRegularCompensation', label: 'Other Taxable Regular Compensation' },
]

const taxableSupplementaryFields: FieldDefinition[] = [
  { key: 'commission', label: 'Commission' },
  { key: 'fees', label: "Fees including Director's Fee" },
  { key: 'hazardPay', label: 'Hazard Pay' },
  { key: 'overtimePay', label: 'Overtime Pay' },
  { key: 'otherTaxableSupplementaryCompensation', label: 'Other Taxable Supplementary Compensation' },
]

const mweTaxableSupplementaryFields: FieldDefinition[] = [
  { key: 'commission', label: 'Commission' },
  { key: 'fees', label: "Fees including Director's Fee" },
  { key: 'otherTaxableSupplementaryCompensation', label: 'Other Taxable Supplementary Compensation' },
]

const commonNonTaxableFields: FieldDefinition[] = [
  { key: 'thirteenthMonthAndOtherBenefits', label: '13th Month Pay & Other Benefits' },
  { key: 'deMinimisBenefits', label: 'De Minimis Benefits' },
  { key: 'statutoryEmployeeShare', label: "SSS, GSIS, PAG-IBIG and Union Dues (Employee's Share Only)" },
  { key: 'salariesAndOtherCompensation', label: 'Salaries and Other Forms of Compensation' },
  { key: 'otherNonTaxableCompensation', label: 'Other Non-Taxable/Exempt Compensation Income' },
]

const mweNonTaxableFields: FieldDefinition[] = [
  { key: 'holidayPayMwe', label: 'Holiday Pay (MWE)' },
  { key: 'overtimePayMwe', label: 'Overtime Pay (MWE)' },
  { key: 'nightShiftDifferentialMwe', label: 'Night Shift Differential (MWE)' },
  { key: 'hazardPayMwe', label: 'Hazard Pay (MWE)' },
  ...commonNonTaxableFields,
]

const emptyFields = Object.fromEntries([
  ...regularTaxableFields,
  ...taxableSupplementaryFields,
  ...mweNonTaxableFields,
].map(field => [field.key, ''])) as Record<FieldKey, string>

function numberValue(value: string) {
  return Math.max(0, Number(value || 0))
}

function money(value: number) {
  return `PHP ${roundCalculatorMoney(value).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function percent(value: number) {
  return `${roundCalculatorMoney(value * 100).toLocaleString('en-PH', { maximumFractionDigits: 2 })}%`
}

function sumFields(fields: Record<FieldKey, string>, definitions: FieldDefinition[]) {
  return definitions.reduce((sum, field) => sum + numberValue(fields[field.key]), 0)
}

export default function WithholdingTaxCalculatorPage() {
  const [salaryType, setSalaryType] = useState<SalaryType>('daily')
  const [wageType, setWageType] = useState<WageType>('mwe')
  const [basicSalary, setBasicSalary] = useState('')
  const [fields, setFields] = useState<Record<FieldKey, string>>(emptyFields)

  const supplementaryFields = wageType === 'mwe' ? mweTaxableSupplementaryFields : taxableSupplementaryFields
  const nonTaxableFields = wageType === 'mwe' ? mweNonTaxableFields : commonNonTaxableFields
  const regularTaxableCompensation = sumFields(fields, regularTaxableFields)
  const supplementaryTaxableCompensation = sumFields(fields, supplementaryFields)
  const nonTaxableCompensation = sumFields(fields, nonTaxableFields)

  const calculation = useMemo(() => calculateWithholdingTaxCalculator({
    salaryType,
    wageType,
    basicSalary: numberValue(basicSalary),
    regularTaxableCompensation,
    supplementaryTaxableCompensation,
    nonTaxableCompensation,
  }), [basicSalary, nonTaxableCompensation, regularTaxableCompensation, salaryType, supplementaryTaxableCompensation, wageType])

  const updateField = (key: FieldKey, value: string) => setFields(current => ({ ...current, [key]: value }))

  const resetCalculator = () => {
    setSalaryType('daily')
    setWageType('mwe')
    setBasicSalary('')
    setFields(emptyFields)
  }

  const exportCalculation = () => {
    downloadCsv('withholding-tax-calculation.csv', [
      ['Salary Type', salaryLabel(salaryType)],
      ['Wage Type', wageLabel(wageType)],
      ['Basic Salary', money(numberValue(basicSalary))],
      ['Regular Taxable Compensation', money(regularTaxableCompensation)],
      ['Supplementary Taxable Compensation', money(supplementaryTaxableCompensation)],
      ['Non-Taxable/Exempt Compensation Income', money(nonTaxableCompensation)],
      ['Gross Compensation Income', money(calculation.grossCompensationIncome)],
      ['Total Taxable Compensation Income', money(calculation.totalTaxableCompensationIncome)],
      ['Total Non-Taxable/Exempt Compensation Income', money(calculation.totalNonTaxableCompensationIncome)],
      ['Estimated Withholding Tax', money(calculation.estimatedWithholdingTax)],
    ])
  }

  return (
    <main className="withholding-page" style={{ fontFamily: font }}>
      <style>{withholdingTaxCss}</style>

      <header className="withholding-header">
        <div>
          <h1>Withholding Tax Calculator</h1>
          <p>BIR withholding tax calculation for compensation income.</p>
        </div>
        <div className="withholding-actions">
          <button type="button" onClick={resetCalculator}><RefreshCcw size={15} /> Reset</button>
          <button type="button" onClick={exportCalculation} className="withholding-export"><Download size={15} /> Export</button>
        </div>
      </header>

      <section className="withholding-metrics" aria-label="Withholding tax result">
        <Metric title="Gross Compensation Income" value={money(calculation.grossCompensationIncome)} icon={WalletCards} tone="#16a34a" />
        <Metric title="Total Taxable Compensation Income" value={money(calculation.totalTaxableCompensationIncome)} icon={Calculator} tone="#2563eb" />
        <Metric title="Total Non-Taxable/Exempt Compensation Income" value={money(calculation.totalNonTaxableCompensationIncome)} icon={ShieldCheck} tone="#f59e0b" />
        <Metric title="Estimated Withholding Tax" value={money(calculation.estimatedWithholdingTax)} icon={ReceiptText} tone="#7c3aed" />
      </section>

      <section className="withholding-grid">
        <form className="withholding-card withholding-form" onSubmit={event => event.preventDefault()}>
          <div className="withholding-card-head">
            <h2>Employee Compensation</h2>
            <Link href="/accounting/tax-compliance">Tax Compliance</Link>
          </div>

          <div className="withholding-two-col">
            <label>
              <span>Salary Type</span>
              <select value={salaryType} onChange={event => setSalaryType(event.target.value as SalaryType)}>
                {salaryTypes.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
            </label>

            <label>
              <span>Wage Type</span>
              <select value={wageType} onChange={event => setWageType(event.target.value as WageType)}>
                {wageTypes.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
            </label>
          </div>

          <FieldInput label="Basic Salary" value={basicSalary} onChange={setBasicSalary} />

          <FieldGroup title="Taxable Compensation Income" subtitle="Regular">
            {regularTaxableFields.map(field => <FieldInput key={field.key} label={field.label} value={fields[field.key]} onChange={value => updateField(field.key, value)} />)}
          </FieldGroup>

          <FieldGroup title="Supplementary">
            {supplementaryFields.map(field => <FieldInput key={field.key} label={field.label} value={fields[field.key]} onChange={value => updateField(field.key, value)} />)}
          </FieldGroup>

          <FieldGroup title="Non-Taxable/Exempt Compensation Income">
            {nonTaxableFields.map(field => <FieldInput key={field.key} label={field.label} value={fields[field.key]} onChange={value => updateField(field.key, value)} />)}
          </FieldGroup>
        </form>

        <section className="withholding-card withholding-results">
          <div className="withholding-card-head">
            <h2>Result</h2>
            <span>{salaryLabel(salaryType)}</span>
          </div>

          <AmountLine label="Gross Compensation Income" value={calculation.grossCompensationIncome} large />
          <AmountLine label="Total Taxable Compensation Income" value={calculation.totalTaxableCompensationIncome} large />
          <AmountLine label="Total Non-Taxable/Exempt Compensation Income" value={calculation.totalNonTaxableCompensationIncome} large />
          <AmountLine label="Estimated Withholding Tax" value={calculation.estimatedWithholdingTax} large highlight />
        </section>

        <section className="withholding-card withholding-breakdown">
          <div className="withholding-card-head">
            <h2>Bracket Breakdown</h2>
            <span>{calculation.bracket ? 'BIR table' : 'No tax'}</span>
          </div>

          <AmountLine label="Taxable basic salary" value={calculation.taxableBasicSalary} />
          <AmountLine label="Exempt basic salary" value={calculation.exemptBasicSalary} />
          <AmountLine label="Regular taxable compensation" value={regularTaxableCompensation} />
          <AmountLine label="Supplementary taxable compensation" value={supplementaryTaxableCompensation} />
          <AmountLine label="Other non-taxable/exempt compensation" value={nonTaxableCompensation} />

          {calculation.bracket && (
            <div className="withholding-facts">
              <Fact label="Fixed tax" value={money(calculation.bracket.baseTax)} />
              <Fact label="Excess over" value={money(calculation.bracket.excessOver)} />
              <Fact label="Rate on excess" value={percent(calculation.bracket.rate)} />
              <Fact label="Upper limit" value={Number.isFinite(calculation.bracket.upper) ? money(calculation.bracket.upper) : 'No ceiling'} />
            </div>
          )}
        </section>
      </section>
    </main>
  )
}

function FieldGroup({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  return (
    <section className="withholding-field-group">
      <div>
        <h3>{title}</h3>
        {subtitle && <strong>{subtitle}</strong>}
      </div>
      {children}
    </section>
  )
}

function FieldInput({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label>
      <span>{label}</span>
      <input type="number" min="0" step="0.01" value={value} onChange={event => onChange(event.target.value)} />
    </label>
  )
}

function Metric({ title, value, icon: Icon, tone }: { title: string; value: string; icon: LucideIcon; tone: string }) {
  return (
    <div className="withholding-card withholding-metric">
      <span className="withholding-metric-icon" style={{ background: `${tone}14`, color: tone }}><Icon size={23} /></span>
      <span>
        <span>{title}</span>
        <strong>{value}</strong>
      </span>
    </div>
  )
}

function AmountLine({ label, value, large, highlight }: { label: string; value: number; large?: boolean; highlight?: boolean }) {
  const className = [
    large ? 'withholding-amount is-large' : 'withholding-amount',
    highlight ? 'is-tax-due' : '',
  ].filter(Boolean).join(' ')

  return (
    <div className={className}>
      <span>{label}</span>
      <strong className={highlight ? 'is-highlight' : undefined}>{money(value)}</strong>
    </div>
  )
}

function Fact({ label, value }: { label: string; value: string }) {
  return <div className="withholding-fact"><span>{label}</span><strong>{value}</strong></div>
}

function salaryLabel(value: SalaryType) {
  return salaryTypes.find(option => option.value === value)?.label || value
}

function wageLabel(value: WageType) {
  return wageTypes.find(option => option.value === value)?.label || value
}

function downloadCsv(filename: string, rows: string[][]) {
  if (typeof document === 'undefined') return
  const csv = rows.map(row => row.map(cell => `"${String(cell).replaceAll('"', '""')}"`).join(',')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

const withholdingTaxCss = `
.withholding-page { min-height: calc(100dvh - 76px); padding: 28px 28px 42px; background: transparent; color: #0f172a; }
.withholding-header { display: flex; justify-content: space-between; align-items: flex-start; gap: 18px; margin-bottom: 20px; }
.withholding-header h1 { margin: 0; color: #0f172a; font-size: 28px; line-height: 1.08; font-weight: 950; letter-spacing: 0; }
.withholding-header p { margin: 8px 0 0; color: #000000; font-size: 13.5px; font-weight: 750; }
.withholding-actions { display: flex; gap: 10px; flex-wrap: wrap; justify-content: flex-end; }
.withholding-actions button { min-height: 38px; border-radius: 8px; border: 1px solid #e8edf4; background: #fff; color: #0f172a; display: inline-flex; align-items: center; justify-content: center; gap: 8px; padding: 0 12px; font-size: 12.5px; font-weight: 900; cursor: pointer; box-shadow: 0 1px 2px rgba(15, 23, 42, .03); }
.withholding-actions button:hover { border-color: #cbd5e1; background: #f8fafc; }
.withholding-actions .withholding-export { background: #16a34a !important; border-color: #16a34a !important; color: #fff !important; }
.withholding-actions .withholding-export:hover { background: #15803d !important; border-color: #15803d !important; color: #fff !important; }
.withholding-metrics { display: grid; grid-template-columns: repeat(4, minmax(190px, 1fr)); gap: 14px; margin-bottom: 16px; }
.withholding-card { background: #fff; border: 1px solid #e8edf4; border-radius: 8px; padding: 18px; box-shadow: 0 1px 2px rgba(15, 23, 42, .03); color: #0f172a; min-width: 0; }
.withholding-metric { min-height: 100px; display: flex; align-items: center; gap: 13px; }
.withholding-metric-icon { width: 44px; height: 44px; border-radius: 8px; display: grid; place-items: center; flex: 0 0 auto; }
.withholding-metric span span { display: block; color: #000000; font-size: 12px; font-weight: 850; line-height: 1.25; }
.withholding-metric strong { display: block; margin-top: 8px; color: #111827; font-size: clamp(18px, 1.12vw, 22px); line-height: 1.08; white-space: normal; overflow-wrap: anywhere; }
.withholding-grid { display: grid; grid-template-columns: minmax(420px, 1fr) minmax(300px, .62fr); gap: 16px; align-items: start; }
.withholding-breakdown { grid-column: 1 / -1; }
.withholding-card-head { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; margin-bottom: 16px; }
.withholding-card-head h2 { margin: 0; font-size: 16px; font-weight: 950; color: #111827; letter-spacing: 0; }
.withholding-card-head a, .withholding-card-head span { min-height: 26px; border-radius: 6px; display: inline-flex; align-items: center; border: 1px solid #dcfce7; background: #f0fdf4; color: #15803d; font-size: 12px; font-weight: 900; text-decoration: none; padding: 0 8px; white-space: nowrap; }
.withholding-form, .withholding-field-group { display: grid; gap: 12px; }
.withholding-two-col { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
.withholding-form label { display: grid; gap: 7px; min-width: 0; }
.withholding-form label span { color: #334155; font-size: 12px; font-weight: 850; line-height: 1.35; }
.withholding-form input, .withholding-form select { width: 100%; min-height: 40px; border: 1px solid #cbd5e1; border-radius: 8px; background: #fff; color: #0f172a; font: inherit; font-size: 13px; font-weight: 800; padding: 0 11px; outline: none; box-shadow: inset 0 1px 1px rgba(15, 23, 42, .02); }
.withholding-form input::placeholder { color: #000000; }
.withholding-form input:focus, .withholding-form select:focus { border-color: #16a34a; box-shadow: 0 0 0 3px rgba(22, 163, 74, .14); }
.withholding-field-group { border-top: 1px solid #eef2f7; padding-top: 15px; margin-top: 2px; }
.withholding-field-group > div { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.withholding-field-group h3 { margin: 0; color: #111827; font-size: 14px; font-weight: 950; letter-spacing: 0; }
.withholding-field-group strong { display: inline-flex; align-items: center; min-height: 22px; border-radius: 6px; background: #ecfdf3; color: #15803d; padding: 0 8px; font-size: 11.5px; font-weight: 900; white-space: nowrap; }
.withholding-results, .withholding-breakdown { display: grid; gap: 0; }
.withholding-amount, .withholding-fact { display: flex; justify-content: space-between; gap: 16px; align-items: center; border-top: 1px solid #eef2f7; padding: 11px 0; color: #000000; font-size: 13px; line-height: 1.35; }
.withholding-amount:first-of-type, .withholding-fact:first-child { border-top: 0; }
.withholding-amount strong, .withholding-fact strong { color: #111827; text-align: right; white-space: nowrap; }
.withholding-amount.is-large { min-height: 68px; align-items: flex-start; flex-direction: column; gap: 7px; border: 1px solid #eef2f7; border-radius: 8px; padding: 13px 14px; margin-bottom: 10px; background: #f8fafc; }
.withholding-amount.is-large strong { color: #111827; font-size: clamp(20px, 1.35vw, 24px); line-height: 1.08; white-space: normal; overflow-wrap: anywhere; text-align: left; }
.withholding-amount.is-tax-due { background: #0f3f25; border-color: #0f3f25; color: #dcfce7; }
.withholding-amount.is-tax-due span { color: #dcfce7; }
.withholding-amount .is-highlight { color: #fff !important; }
html[data-theme] .accounting-scroll-content .withholding-amount.is-tax-due strong.is-highlight { color: #fff !important; }
.withholding-facts { margin-top: 14px; border-top: 1px solid #eef2f7; padding-top: 6px; }
.accounting-theme-dark .withholding-page,
html[data-theme='dark'] .withholding-page { min-height: calc(100dvh - 76px); background: #101010 !important; color: #fafafa !important; }
.accounting-theme-dark .withholding-card,
html[data-theme='dark'] .withholding-card { background: #101010 !important; border-color: #333 !important; box-shadow: none !important; color: #fafafa !important; }
.accounting-theme-dark .withholding-header h1,
html[data-theme='dark'] .withholding-header h1,
.accounting-theme-dark .withholding-card-head h2,
html[data-theme='dark'] .withholding-card-head h2,
.accounting-theme-dark .withholding-field-group h3,
html[data-theme='dark'] .withholding-field-group h3,
.accounting-theme-dark .withholding-metric strong,
html[data-theme='dark'] .withholding-metric strong,
.accounting-theme-dark .withholding-amount strong,
html[data-theme='dark'] .withholding-amount strong,
.accounting-theme-dark .withholding-fact strong,
html[data-theme='dark'] .withholding-fact strong { color: #fafafa !important; }
.accounting-theme-dark .withholding-header p,
html[data-theme='dark'] .withholding-header p,
.accounting-theme-dark .withholding-metric span span,
html[data-theme='dark'] .withholding-metric span span,
.accounting-theme-dark .withholding-form label span,
html[data-theme='dark'] .withholding-form label span,
.accounting-theme-dark .withholding-amount,
html[data-theme='dark'] .withholding-amount,
.accounting-theme-dark .withholding-fact,
html[data-theme='dark'] .withholding-fact { color: #c7c7cf !important; }
.accounting-theme-dark .withholding-actions button,
html[data-theme='dark'] .withholding-actions button,
.accounting-theme-dark .withholding-form input,
html[data-theme='dark'] .withholding-form input,
.accounting-theme-dark .withholding-form select,
html[data-theme='dark'] .withholding-form select { background: #161616 !important; border-color: #333 !important; color: #fafafa !important; }
.accounting-theme-dark .withholding-actions .withholding-export,
html[data-theme='dark'] .withholding-actions .withholding-export { background: #16a34a !important; border-color: #16a34a !important; color: #fff !important; }
.accounting-theme-dark .withholding-field-group,
html[data-theme='dark'] .withholding-field-group,
.accounting-theme-dark .withholding-amount,
html[data-theme='dark'] .withholding-amount,
.accounting-theme-dark .withholding-fact,
html[data-theme='dark'] .withholding-fact,
.accounting-theme-dark .withholding-facts,
html[data-theme='dark'] .withholding-facts { border-color: #262626 !important; }
.accounting-theme-dark .withholding-amount.is-large,
html[data-theme='dark'] .withholding-amount.is-large { background: #161616 !important; border-color: #262626 !important; }
.accounting-theme-dark .withholding-amount.is-tax-due,
html[data-theme='dark'] .withholding-amount.is-tax-due { background: #0f3f25 !important; border-color: #0f3f25 !important; }
@media (min-width: 1500px) {
  .withholding-grid { grid-template-columns: minmax(420px, .95fr) minmax(300px, .62fr) minmax(320px, .72fr); }
  .withholding-breakdown { grid-column: auto; }
}
@media (max-width: 1180px) {
  .withholding-metrics { grid-template-columns: repeat(2, minmax(180px, 1fr)); }
  .withholding-grid { grid-template-columns: 1fr; }
  .withholding-breakdown { grid-column: auto; }
}
@media (max-width: 640px) {
  .withholding-page { padding: 16px; }
  .withholding-header { flex-direction: column; }
  .withholding-actions, .withholding-metrics, .withholding-two-col { display: grid; grid-template-columns: 1fr; width: 100%; }
  .withholding-actions button { width: 100%; }
  .withholding-card { padding: 16px; }
  .withholding-card-head, .withholding-field-group > div { display: grid; }
  .withholding-metric strong, .withholding-amount.is-large strong { font-size: 19px; }
}
`
