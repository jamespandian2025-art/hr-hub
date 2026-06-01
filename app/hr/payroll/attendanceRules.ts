export type PayrollAttendanceStatus = 'Present' | 'Late' | 'Absent' | 'On Leave' | 'Rest day'

export type PayrollAttendanceRecord = {
  employeeId: string
  date: string
  status?: PayrollAttendanceStatus | string
  createdAt?: string
  updatedAt?: string
}

export type PayrollAttendanceSummary = {
  periodStart: string
  periodEnd: string
  payableDays: number
  paidDays: number
  presentDays: number
  lateDays: number
  leaveDays: number
  restDays: number
  absentDays: number
  recordedDays: number
  unrecordedDays: number
  attendanceRate: number
  dailyBasicRate: number
  scheduledBasicPay: number
  earnedBasicPay: number
  absenceDeduction: number
}

export function roundPayrollAttendanceMoney(value: number) {
  return Math.max(0, Math.round(Number(value || 0) * 100) / 100)
}

export function localDateKey(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function parseLocalDate(value?: string) {
  if (!value) return null
  const date = new Date(value.includes('T') ? value : `${value}T00:00:00`)
  return Number.isNaN(date.getTime()) ? null : date
}

function isWeekday(value: string) {
  const date = parseLocalDate(value)
  if (!date) return false
  const day = date.getDay()
  return day >= 1 && day <= 5
}

function countWeekdays(startDate: string, endDate: string) {
  const start = parseLocalDate(startDate)
  const end = parseLocalDate(endDate)
  if (!start || !end || start > end) return 0
  let count = 0
  const cursor = new Date(start)
  while (cursor <= end) {
    const day = cursor.getDay()
    if (day >= 1 && day <= 5) count += 1
    cursor.setDate(cursor.getDate() + 1)
  }
  return count
}

function isInsideRange(dateValue: string, startDate: string, endDate: string) {
  return dateValue >= startDate && dateValue <= endDate
}

function normalizedStatus(value?: string): PayrollAttendanceStatus {
  if (value === 'Late' || value === 'Absent' || value === 'On Leave' || value === 'Rest day') return value
  return 'Present'
}

export function paidAttendanceDays(summary?: PayrollAttendanceSummary) {
  return recordedPaidAttendanceDays(summary)
}

export function recordedPaidAttendanceDays(summary?: PayrollAttendanceSummary) {
  return summary ? summary.presentDays + summary.lateDays + summary.leaveDays : 0
}

export function attendanceDeductionTotal(summary?: PayrollAttendanceSummary) {
  return Number(summary?.absenceDeduction || 0)
}

export function formatAttendanceCount(value: number) {
  return Number(value || 0).toLocaleString('en-PH', { maximumFractionDigits: 2 })
}

export function buildPayrollAttendanceSummary({
  attendanceRecords,
  employeeIds,
  periodStart,
  periodEnd,
  basicSalary,
}: {
  attendanceRecords: PayrollAttendanceRecord[]
  employeeIds: Array<string | undefined>
  periodStart: string
  periodEnd: string
  basicSalary: number
}): PayrollAttendanceSummary {
  const ids = new Set(employeeIds.filter(Boolean) as string[])
  const recordsByDate = new Map<string, PayrollAttendanceRecord>()

  attendanceRecords
    .filter(record => ids.has(record.employeeId) && isInsideRange(record.date, periodStart, periodEnd))
    .sort((a, b) => new Date(a.updatedAt || a.createdAt || 0).getTime() - new Date(b.updatedAt || b.createdAt || 0).getTime())
    .forEach(record => recordsByDate.set(record.date, record))

  const records = Array.from(recordsByDate.values())
  const scheduledWeekdays = countWeekdays(periodStart, periodEnd)

  // No attendance records for this employee in the period → assume the period
  // was fully worked: full basic pay, no absence deduction. This ONLY triggers
  // when there is zero attendance data; the moment any record exists, the normal
  // present/late/leave/absent math below runs unchanged. Without this guard a
  // workspace that does not log daily attendance would have every payslip net
  // to ₱0 (paidDays = 0 → earnedBasicPay = 0 → full-salary absence deduction).
  if (records.length === 0) {
    const fullScheduledPay = roundPayrollAttendanceMoney(basicSalary)
    const fullPayableDays = Math.max(1, scheduledWeekdays)
    return {
      periodStart,
      periodEnd,
      payableDays: fullPayableDays,
      paidDays: fullPayableDays,
      presentDays: fullPayableDays,
      lateDays: 0,
      leaveDays: 0,
      restDays: 0,
      absentDays: 0,
      recordedDays: fullPayableDays,
      unrecordedDays: 0,
      attendanceRate: 100,
      dailyBasicRate: roundPayrollAttendanceMoney(fullScheduledPay / fullPayableDays),
      scheduledBasicPay: fullScheduledPay,
      earnedBasicPay: fullScheduledPay,
      absenceDeduction: 0,
    }
  }

  const weekdayRestDays = records.filter(record => normalizedStatus(record.status) === 'Rest day' && isWeekday(record.date)).length
  const payableDays = Math.max(1, scheduledWeekdays - weekdayRestDays)
  const presentDays = records.filter(record => normalizedStatus(record.status) === 'Present' && isWeekday(record.date)).length
  const lateDays = records.filter(record => normalizedStatus(record.status) === 'Late' && isWeekday(record.date)).length
  const leaveDays = records.filter(record => normalizedStatus(record.status) === 'On Leave' && isWeekday(record.date)).length
  const absentDays = records.filter(record => normalizedStatus(record.status) === 'Absent' && isWeekday(record.date)).length
  const restDays = records.filter(record => normalizedStatus(record.status) === 'Rest day').length
  const recordedDays = Math.min(payableDays, presentDays + lateDays + leaveDays + absentDays)
  const unrecordedDays = Math.max(0, payableDays - recordedDays)
  const paidDays = Math.min(payableDays, presentDays + lateDays + leaveDays)
  const scheduledBasicPay = roundPayrollAttendanceMoney(basicSalary)
  const dailyBasicRate = roundPayrollAttendanceMoney(scheduledBasicPay / payableDays)
  const earnedBasicPay = roundPayrollAttendanceMoney(Math.min(scheduledBasicPay, scheduledBasicPay * (paidDays / payableDays)))
  const absenceDeduction = roundPayrollAttendanceMoney(scheduledBasicPay - earnedBasicPay)

  return {
    periodStart,
    periodEnd,
    payableDays,
    paidDays,
    presentDays,
    lateDays,
    leaveDays,
    restDays,
    absentDays,
    recordedDays,
    unrecordedDays,
    attendanceRate: Math.round(((presentDays + lateDays + leaveDays) / payableDays) * 1000) / 10,
    dailyBasicRate,
    scheduledBasicPay,
    earnedBasicPay,
    absenceDeduction,
  }
}
