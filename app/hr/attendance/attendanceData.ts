'use client'

export type AttendanceStatus = 'Present' | 'Late' | 'Absent' | 'On Leave' | 'Rest day'

export interface Employee {
  id: string
  employeeId?: string
  firstName?: string
  middleName?: string
  lastName?: string
  email?: string
  phone?: string
  address?: string
  photo?: string
  employeeType?: string
  employmentStatus?: string
  dateOfJoining?: string
  department?: string
  team?: string
  jobTitle?: string
  reportsTo?: string
  workLocation?: string
  shift?: string
  attendanceStatus?: string
  createdAt?: string
  updatedAt?: string
}

export interface AttendanceRecord {
  id: string
  employeeId: string
  date: string
  status: AttendanceStatus
  clockIn?: string
  clockOut?: string
  breakMinutes?: number
  workLocation?: 'Office' | 'Remote' | 'Hybrid' | 'Field'
  attendanceRemarks?: string
  remoteLog?: boolean
  notes?: string
  createdAt: string
  updatedAt: string
}

export interface AttendanceRow extends AttendanceRecord {
  employee?: Employee
  employeeName: string
  employeeCode: string
  department: string
  position: string
  photo?: string
  isVirtual?: boolean
}

export const employeeKey = 'flowsys-hr-employees'
export const attendanceKey = 'flowsys-hr-attendance'

export function loadStored<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback
  try {
    const raw = window.localStorage.getItem(key)
    return raw ? JSON.parse(raw) as T : fallback
  } catch {
    return fallback
  }
}

export function saveStored<T>(key: string, value: T) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(key, JSON.stringify(value))
}

export function fullName(employee?: Employee) {
  return [employee?.firstName, employee?.middleName, employee?.lastName].filter(Boolean).join(' ').trim()
}

export function initials(name?: string) {
  return (name || 'HR')
    .split(' ')
    .filter(Boolean)
    .map(part => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || 'HR'
}

export function todayInput() {
  return new Date().toISOString().slice(0, 10)
}

export function monthRangeLabel(date = new Date()) {
  const start = new Date(date.getFullYear(), date.getMonth(), 1)
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 0)
  return `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
}

export function formatDate(value?: string) {
  if (!value) return '-'
  return new Date(`${value}T00:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export function formatDay(value?: string) {
  if (!value) return '-'
  return new Date(`${value}T00:00:00`).toLocaleDateString('en-US', { weekday: 'short' })
}

export function clockToMinutes(value?: string) {
  if (!value) return null
  const [hours, minutes] = value.split(':').map(Number)
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return null
  return hours * 60 + minutes
}

export function formatClock(value?: string) {
  if (!value) return '-'
  const [hours, minutes] = value.split(':').map(Number)
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return value
  const date = new Date()
  date.setHours(hours, minutes, 0, 0)
  return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
}

export function attendanceMinutes(record: AttendanceRecord) {
  const start = clockToMinutes(record.clockIn)
  const end = clockToMinutes(record.clockOut)
  if (start === null || end === null || end <= start) return 0
  return Math.max(0, end - start - (record.breakMinutes || 0))
}

export function formatMinutes(minutes: number) {
  if (minutes <= 0) return '0h 00m'
  return `${Math.floor(minutes / 60)}h ${String(minutes % 60).padStart(2, '0')}m`
}

export function attendanceHours(record: AttendanceRecord) {
  const minutes = attendanceMinutes(record)
  return minutes ? formatMinutes(minutes) : '-'
}

export function normalizeStatus(value?: string): AttendanceStatus {
  if (value === 'Late' || value === 'Absent' || value === 'On Leave' || value === 'Rest day') return value
  return 'Present'
}

export function statusTone(status: string) {
  switch (status) {
    case 'Present': return { bg: '#dcfce7', text: '#15803d', dot: '#16a34a' }
    case 'Late': return { bg: '#fef3c7', text: '#d97706', dot: '#f59e0b' }
    case 'Absent': return { bg: '#fee2e2', text: '#dc2626', dot: '#ef4444' }
    case 'On Leave': return { bg: '#dbeafe', text: '#1d4ed8', dot: '#3b82f6' }
    default: return { bg: '#f3f4f6', text: '#6b7280', dot: '#9ca3af' }
  }
}

export function buildRows(employees: Employee[], records: AttendanceRecord[], includeTodayFallback = true): AttendanceRow[] {
  const employeeById = new Map(employees.map(employee => [employee.id, employee]))
  const rows = records.map(record => {
    const employee = employeeById.get(record.employeeId)
    const name = fullName(employee) || employee?.email || 'Employee'
    return {
      ...record,
      employee,
      employeeName: name,
      employeeCode: employee?.employeeId || employee?.id || record.employeeId,
      department: employee?.department || 'Unassigned',
      position: employee?.jobTitle || 'Team member',
      photo: employee?.photo,
    }
  })

  if (!includeTodayFallback) return rows
  const today = todayInput()
  const existingToday = new Set(records.filter(record => record.date === today).map(record => record.employeeId))
  const fallbackRows = employees
    .filter(employee => !existingToday.has(employee.id))
    .map(employee => {
      const status = normalizeStatus(employee.attendanceStatus)
      return {
        id: `virtual_${employee.id}_${today}`,
        employeeId: employee.id,
        date: today,
        status,
        clockIn: status === 'Present' ? '09:00' : status === 'Late' ? '09:20' : '',
        clockOut: status === 'Present' || status === 'Late' ? '18:00' : '',
        breakMinutes: status === 'Present' || status === 'Late' ? 60 : 0,
        notes: '',
        workLocation: employee.workLocation?.toLowerCase().includes('remote') ? 'Remote' : 'Office',
        attendanceRemarks: '',
        remoteLog: employee.workLocation?.toLowerCase().includes('remote'),
        createdAt: employee.createdAt || new Date().toISOString(),
        updatedAt: employee.updatedAt || new Date().toISOString(),
        employee,
        employeeName: fullName(employee) || employee.email || 'Employee',
        employeeCode: employee.employeeId || employee.id,
        department: employee.department || 'Unassigned',
        position: employee.jobTitle || 'Team member',
        photo: employee.photo,
        isVirtual: true,
      } satisfies AttendanceRow
    })
  return [...rows, ...fallbackRows]
}

export function upsertRecord(records: AttendanceRecord[], next: AttendanceRecord) {
  const withoutSameDay = records.filter(record => !(record.employeeId === next.employeeId && record.date === next.date))
  return [next, ...withoutSameDay]
}

export function downloadText(filename: string, content: string, mime = 'text/csv') {
  const blob = new Blob([content], { type: mime })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}
