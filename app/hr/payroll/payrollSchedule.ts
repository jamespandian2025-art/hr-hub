export type PayrollFrequency = 'monthly' | 'semi-monthly' | 'bi-weekly' | 'weekly'

export type PayrollScheduleSettings = {
  frequency: PayrollFrequency
  firstCutoffDay: number
  secondCutoffDay: number
  payDelayDays: number
  scheduleStartDate: string
  runDate: string
}

export type PayrollPeriod = {
  label: string
  range: string
  payDate: Date
  startDate: string
  endDate: string
  runDate: string
}

export const payrollScheduleKey = 'flowsys-hr-payroll-schedule'

export const defaultPayrollSchedule: PayrollScheduleSettings = {
  frequency: 'semi-monthly',
  firstCutoffDay: 15,
  secondCutoffDay: 31,
  payDelayDays: 5,
  scheduleStartDate: '',
  runDate: '',
}

export function clampDay(value: number) {
  return Math.min(31, Math.max(1, Number.isFinite(value) ? value : 1))
}

export function clampDelay(value: number) {
  return Math.min(31, Math.max(0, Number.isFinite(value) ? value : 0))
}

export function payrollDateInput(date = new Date()) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function dateFromPayrollInput(value?: string, fallback = new Date()) {
  if (!value) return fallback
  const date = new Date(`${value}T00:00:00`)
  return Number.isNaN(date.getTime()) ? fallback : date
}

export function payrollRunDateInput(settings: Pick<PayrollScheduleSettings, 'runDate'>, fallback = new Date()) {
  return settings.runDate || payrollDateInput(fallback)
}

function formatPeriodDate(date: Date) {
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function currentPeriod(date = new Date()) {
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
}

export function getPayrollPeriod(settings: PayrollScheduleSettings, date = dateFromPayrollInput(settings.runDate)): PayrollPeriod {
  const safeDate = Number.isNaN(date.getTime()) ? new Date() : date
  const year = safeDate.getFullYear()
  const month = safeDate.getMonth()
  const day = safeDate.getDate()
  const monthName = safeDate.toLocaleDateString('en-US', { month: 'long' })
  const monthShort = safeDate.toLocaleDateString('en-US', { month: 'short' })
  const monthEnd = new Date(year, month + 1, 0).getDate()
  const firstCutoff = Math.min(clampDay(settings.firstCutoffDay), monthEnd)
  const secondCutoff = Math.min(Math.max(clampDay(settings.secondCutoffDay), firstCutoff + 1), monthEnd)
  const runDate = payrollDateInput(safeDate)

  if (settings.frequency === 'semi-monthly') {
    const isFirstHalf = day <= firstCutoff
    const start = isFirstHalf ? 1 : firstCutoff + 1
    const end = isFirstHalf ? firstCutoff : secondCutoff
    const startDate = new Date(year, month, start)
    const endDate = new Date(year, month, end)
    return {
      label: `${monthName} ${start}-${end}, ${year}`,
      range: `${monthShort} ${start} - ${monthShort} ${end}, ${year}`,
      payDate: new Date(year, month, end + clampDelay(settings.payDelayDays)),
      startDate: payrollDateInput(startDate),
      endDate: payrollDateInput(endDate),
      runDate,
    }
  }

  if (settings.frequency === 'weekly') {
    const weekStart = new Date(safeDate)
    weekStart.setDate(day - weekStart.getDay())
    const weekEnd = new Date(weekStart)
    weekEnd.setDate(weekStart.getDate() + 6)
    const payDate = new Date(weekEnd)
    payDate.setDate(weekEnd.getDate() + clampDelay(settings.payDelayDays))
    return {
      label: `Week of ${formatPeriodDate(weekStart)}`,
      range: `${formatPeriodDate(weekStart)} - ${formatPeriodDate(weekEnd)}`,
      payDate,
      startDate: payrollDateInput(weekStart),
      endDate: payrollDateInput(weekEnd),
      runDate,
    }
  }

  if (settings.frequency === 'bi-weekly') {
    const anchor = dateFromPayrollInput(settings.scheduleStartDate, new Date(year, 0, 1))
    const days = Math.max(0, Math.floor((safeDate.getTime() - anchor.getTime()) / 86400000))
    const start = new Date(anchor)
    start.setDate(anchor.getDate() + Math.floor(days / 14) * 14)
    const end = new Date(start)
    end.setDate(start.getDate() + 13)
    const payDate = new Date(end)
    payDate.setDate(end.getDate() + clampDelay(settings.payDelayDays))
    return {
      label: `${formatPeriodDate(start)} - ${formatPeriodDate(end)}`,
      range: `${formatPeriodDate(start)} - ${formatPeriodDate(end)}`,
      payDate,
      startDate: payrollDateInput(start),
      endDate: payrollDateInput(end),
      runDate,
    }
  }

  const monthEndDate = new Date(year, month + 1, 0)
  const payDate = new Date(monthEndDate)
  payDate.setDate(monthEndDate.getDate() + clampDelay(settings.payDelayDays))
  return {
    label: currentPeriod(safeDate),
    range: `${monthShort} 1 - ${monthShort} ${monthEnd}, ${year}`,
    payDate,
    startDate: payrollDateInput(new Date(year, month, 1)),
    endDate: payrollDateInput(monthEndDate),
    runDate,
  }
}
