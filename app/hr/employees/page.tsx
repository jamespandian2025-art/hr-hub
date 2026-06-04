'use client'

import { Fragment, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  ChevronDown, ChevronLeft, ChevronRight,
  Download, Eye, FileText, Grid3X3, List,
  MoreHorizontal, Pencil, Plus, Search, Settings2, Trash2,
  Upload, UserMinus, UserPlus, Users,
} from 'lucide-react'
import { AnalyticsToggleButton, CollapsibleAnalytics, useAnalyticsDisclosure } from '@/components/AnalyticsDisclosure'
import { deleteHrRecord, listHrRecords } from '@/lib/hrms/client'

// â”€â”€â”€ Types â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

interface Employee {
  id: string; employeeId: string
  firstName: string; middleName?: string; lastName: string
  email: string; phone: string
  dateOfBirth?: string; gender?: string
  photo?: string
  employeeType: string; employeeRole?: string; employmentStatus: string
  dateOfJoining: string
  department: string; team: string; jobTitle: string
  reportsTo?: string; workLocation?: string; workType?: string
  basicSalary?: number; allowances?: number; deductions?: number
  attendanceStatus?: string; payrollStatus?: string
  createdAt: string; updatedAt: string
}

type FloatingMenuPosition = { top: number; left: number }
type EmployeeColumnKey = 'employee' | 'employeeId' | 'position' | 'department' | 'team' | 'email' | 'phone' | 'status' | 'attendance' | 'payroll' | 'actions'

type ExitReason = 'Resigned' | 'AWOL' | 'Terminated' | 'Retired' | 'End of contract' | 'Other'
const EXIT_REASONS: ExitReason[] = ['Resigned', 'AWOL', 'Terminated', 'Retired', 'End of contract', 'Other']

const EMPLOYEE_COLUMNS: Array<{ key: EmployeeColumnKey; label: string; locked?: boolean }> = [
  { key: 'employee', label: 'Employee', locked: true },
  { key: 'employeeId', label: 'Employee ID' },
  { key: 'position', label: 'Position' },
  { key: 'department', label: 'Department' },
  { key: 'team', label: 'Team' },
  { key: 'email', label: 'Email' },
  { key: 'phone', label: 'Phone' },
  { key: 'status', label: 'Status' },
  { key: 'attendance', label: 'Attendance' },
  { key: 'payroll', label: 'Payroll' },
  { key: 'actions', label: 'Actions', locked: true },
]

const DEFAULT_EMPLOYEE_COLUMNS = EMPLOYEE_COLUMNS.map(column => column.key)

// â”€â”€â”€ Helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const font = "var(--font-body)"
const employeesKey = 'flowsys-hr-employees'
const deletedEmployeesKey = 'flowsys-hr-deleted-employees'
const employeeWorkspaceKeys = [
  employeesKey,
  deletedEmployeesKey,
  'flowsys-hr-attendance',
  'flowsys-hr-attendance-corrections',
  'flowsys-hr-payroll-records',
  'flowsys-hr-payroll-reports',
  'flowsys-hr-documents',
  'flowsys-hr-deleted-documents',
  'flowsys-hr-document-versions',
  'flowsys-hr-leave-requests',
  'wiseflow-employee-leave-request-outbox',
  'flowsys-employee-leave-drafts',
  'flowsys-hr-deleted-approvals',
  'flowsys-hr-loan-requests',
  'flowsys-hr-allowance-requests',
  'flowsys-hr-performance-goals',
  'flowsys-hr-performance-reviews',
  'flowsys-hr-performance-feedback',
  'flowsys-hr-credential-email-outbox',
]
const employeeWorkspaceKeyPrefixes = [
  'flowsys-hr-leave-requests:',
  'flowsys-employee-leave-drafts:',
  'wiseflow-employee-leave-request-outbox:',
]

function loadStored<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback
  try { const r = window.localStorage.getItem(key); return r ? (JSON.parse(r) as T) : fallback } catch { return fallback }
}

// Merge server + local employees by id, keeping whichever was updated last so an
// edit made on another device wins while unsynced local edits are preserved.
function mergeEmployeesById(rows: Employee[]) {
  const map = new Map<string, Employee>()
  for (const row of rows) {
    if (!row?.id) continue
    const stamp = (employee: Employee) => new Date(employee.updatedAt || employee.createdAt || 0).getTime()
    const existing = map.get(row.id)
    if (!existing || stamp(row) >= stamp(existing)) map.set(row.id, row)
  }
  return Array.from(map.values())
}

function fullName(e: Employee) { return [e.firstName, e.lastName].filter(Boolean).join(' ') }

function initials(name: string) {
  return name.split(' ').filter(Boolean).map(w => w[0]).join('').toUpperCase().slice(0, 2)
}

function deptColor(dept: string): { bg: string; text: string } {
  const map: Record<string, { bg: string; text: string }> = {
    'Engineering':      { bg: '#dbeafe', text: '#1d4ed8' },
    'Human Resources':  { bg: '#d1fae5', text: '#059669' },
    'Finance':          { bg: '#ede9fe', text: '#7c3aed' },
    'Design':           { bg: '#fef3c7', text: '#d97706' },
    'Operations':       { bg: '#ffedd5', text: '#ea580c' },
    'Marketing':        { bg: '#fce7f3', text: '#db2777' },
    'Sales':            { bg: '#dcfce7', text: '#16a34a' },
    'IT':               { bg: '#e0f2fe', text: '#0284c7' },
    'Product':          { bg: '#fffbeb', text: '#b45309' },
    'Legal':            { bg: '#fdf4ff', text: '#a21caf' },
  }
  return map[dept] || { bg: '#f3f4f6', text: '#000000' }
}

function statusBadge(status: string): { bg: string; text: string } {
  switch (status?.toLowerCase()) {
    case 'active':      return { bg: '#dcfce7', text: '#15803d' }
    case 'on leave':    return { bg: '#dbeafe', text: '#1d4ed8' }
    case 'inactive':    return { bg: '#f3f4f6', text: '#000000' }
    case 'resigned':    return { bg: '#fee2e2', text: '#dc2626' }
    case 'terminated':  return { bg: '#fee2e2', text: '#dc2626' }
    default:            return { bg: '#f3f4f6', text: '#000000' }
  }
}

function attBadge(status?: string): { dot: string; label: string } {
  switch (status?.toLowerCase()) {
    case 'present':   return { dot: '#22c55e', label: 'Present' }
    case 'late':      return { dot: '#f59e0b', label: 'Late' }
    case 'absent':    return { dot: '#ef4444', label: 'Absent' }
    case 'on leave':  return { dot: '#3b82f6', label: 'On Leave' }
    default:          return { dot: '#9ca3af', label: '-' }
  }
}

function payBadge(status?: string): { dot: string; label: string } {
  switch (status?.toLowerCase()) {
    case 'paid':      return { dot: '#22c55e', label: 'Paid' }
    case 'pending':   return { dot: '#f59e0b', label: 'Pending' }
    case 'on hold':   return { dot: '#9ca3af', label: 'On Hold' }
    default:          return { dot: '#9ca3af', label: '-' }
  }
}

// â”€â”€â”€ Employees page â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function parseCsvRows(text: string) {
  const rows: string[][] = []
  let current = ''
  let row: string[] = []
  let quoted = false

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index]
    const next = text[index + 1]
    if (char === '"' && quoted && next === '"') {
      current += '"'
      index += 1
    } else if (char === '"') {
      quoted = !quoted
    } else if (char === ',' && !quoted) {
      row.push(current.trim())
      current = ''
    } else if ((char === '\n' || char === '\r') && !quoted) {
      if (char === '\r' && next === '\n') index += 1
      row.push(current.trim())
      if (row.some(Boolean)) rows.push(row)
      row = []
      current = ''
    } else {
      current += char
    }
  }

  row.push(current.trim())
  if (row.some(Boolean)) rows.push(row)
  return rows
}

function valueFrom(row: Record<string, string>, keys: string[], fallback = '') {
  const normalized = Object.entries(row).reduce<Record<string, string>>((map, [key, value]) => {
    map[key.toLowerCase().replace(/[^a-z0-9]/g, '')] = value
    return map
  }, {})
  for (const key of keys) {
    const match = normalized[key.toLowerCase().replace(/[^a-z0-9]/g, '')]
    if (match) return match
  }
  return fallback
}

function nextEmployeeId(existingIds: string[], index: number) {
  const max = existingIds.reduce((highest, id) => {
    const number = Number(String(id).match(/\d+/)?.[0] || 0)
    return Number.isFinite(number) ? Math.max(highest, number) : highest
  }, 0)
  return `EMP-${String(max + index + 1).padStart(4, '0')}`
}

function recordsFromCsv(text: string, existing: Employee[]): Employee[] {
  const rows = parseCsvRows(text)
  if (rows.length < 2) return []
  const headers = rows[0].map(header => header.trim())
  const existingIds = existing.map(employee => employee.employeeId).filter(Boolean)
  const now = new Date().toISOString()

  return rows.slice(1).map((cells, index) => {
    const row = headers.reduce<Record<string, string>>((record, header, cellIndex) => {
      record[header] = cells[cellIndex] || ''
      return record
    }, {})
    const name = valueFrom(row, ['name', 'fullName'])
    const [firstFromName, ...restFromName] = name.split(' ').filter(Boolean)
    const employeeId = valueFrom(row, ['employeeId', 'employee ID', 'id']) || nextEmployeeId(existingIds, index)
    return {
      id: `emp_import_${Date.now()}_${index}`,
      employeeId,
      firstName: valueFrom(row, ['firstName', 'first name'], firstFromName || 'Employee'),
      middleName: valueFrom(row, ['middleName', 'middle name']),
      lastName: valueFrom(row, ['lastName', 'last name'], restFromName.join(' ') || `Imported ${index + 1}`),
      email: valueFrom(row, ['email', 'emailAddress']),
      phone: valueFrom(row, ['phone', 'mobile', 'contactNumber']),
      employeeType: valueFrom(row, ['employeeType', 'type'], 'Full Time'),
      employeeRole: valueFrom(row, ['employeeRole', 'role'], 'Employee'),
      employmentStatus: valueFrom(row, ['status', 'employmentStatus'], 'Active'),
      dateOfJoining: valueFrom(row, ['dateOfJoining', 'date joined', 'joined'], new Date().toISOString().slice(0, 10)),
      department: valueFrom(row, ['department'], 'Human Resources'),
      team: valueFrom(row, ['team'], 'HR Team'),
      jobTitle: valueFrom(row, ['jobTitle', 'position', 'title'], 'Team Member'),
      basicSalary: Number(valueFrom(row, ['basicSalary', 'salary'], '0')) || 0,
      allowances: Number(valueFrom(row, ['allowances', 'allowance'], '0')) || 0,
      deductions: Number(valueFrom(row, ['deductions', 'deduction'], '0')) || 0,
      attendanceStatus: valueFrom(row, ['attendanceStatus', 'attendance'], 'Present'),
      payrollStatus: valueFrom(row, ['payrollStatus', 'payroll'], 'Pending'),
      createdAt: now,
      updatedAt: now,
    }
  }).filter(employee => employee.firstName.trim() || employee.email.trim())
}

function csvEscape(value: unknown) {
  const text = String(value ?? '')
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100]

export default function EmployeesPage() {
  const router = useRouter()
  const [employees, setEmployees] = useState<Employee[]>([])
  const [search,    setSearch]    = useState('')
  const [deptFilter, setDeptFilter] = useState('All Departments')
  const [teamFilter, setTeamFilter] = useState('All Teams')
  const [statusFilter, setStatusFilter] = useState('All Status')
  const [typeFilter,  setTypeFilter]  = useState('All Types')
  const [page, setPage]         = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [sortLabel, setSortLabel] = useState('Newest First')
  const [openMenu, setOpenMenu] = useState<string | null>(null)
  const [menuPosition, setMenuPosition] = useState<FloatingMenuPosition>({ top: 0, left: 0 })
  const [deptOpen,  setDeptOpen]   = useState(false)
  const [teamOpen,  setTeamOpen]   = useState(false)
  const [statOpen,  setStatOpen]   = useState(false)
  const [typeOpen,  setTypeOpen]   = useState(false)
  const [sortOpen,  setSortOpen]   = useState(false)
  const [psOpen,    setPsOpen]     = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const columnsRef = useRef<HTMLDivElement>(null)
  const importInputRef = useRef<HTMLInputElement>(null)
  const [importMessage, setImportMessage] = useState<{ tone: 'success' | 'error'; text: string } | null>(null)
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list')
  const [columnsOpen, setColumnsOpen] = useState(false)
  const [visibleColumns, setVisibleColumns] = useState<Set<EmployeeColumnKey>>(() => new Set(DEFAULT_EMPLOYEE_COLUMNS))
  const [exitPrompt, setExitPrompt] = useState<{ employee: Employee; reason: ExitReason; notes: string } | null>(null)
  const analytics = useAnalyticsDisclosure('wiseflow:analytics:hr-employees')

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      const local = loadStored<Employee[]>(employeesKey, [])
      const archivedIds = new Set(
        loadStored<Array<{ id?: string }>>(deletedEmployeesKey, []).map(item => item.id).filter(Boolean) as string[],
      )
      try {
        const server = await listHrRecords<Employee>('employees', { 'x-hr-role': 'HR' })
        const merged = mergeEmployeesById([...server, ...local]).filter(employee => !archivedIds.has(employee.id))
        if (cancelled) return
        setEmployees(merged)
        // Mirror the merged roster to localStorage so the other HR pages that read
        // the employee list (attendance, payroll, teams) also see server employees.
        if (JSON.stringify(merged) !== JSON.stringify(local)) window.localStorage.setItem(employeesKey, JSON.stringify(merged))
      } catch {
        if (!cancelled) setEmployees(local)
      }
    }
    load()
    window.addEventListener('storage', load)
    window.addEventListener('focus', load)
    window.addEventListener('wiseflow:hr-data-changed', load)
    const timer = window.setInterval(load, 4000)
    return () => {
      cancelled = true
      window.removeEventListener('storage', load)
      window.removeEventListener('focus', load)
      window.removeEventListener('wiseflow:hr-data-changed', load)
      window.clearInterval(timer)
    }
  }, [])

  // Close dropdowns on outside click
  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpenMenu(null)
      if (columnsRef.current && !columnsRef.current.contains(e.target as Node)) setColumnsOpen(false)
    }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  // â”€â”€ Unique filter options â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const depts = useMemo(() => ['All Departments', ...Array.from(new Set(employees.map(e => e.department).filter(Boolean)))], [employees])
  const teams = useMemo(() => ['All Teams',       ...Array.from(new Set(employees.map(e => e.team).filter(Boolean)))],       [employees])
  const types = useMemo(() => ['All Types',       ...Array.from(new Set(employees.map(e => e.employeeType).filter(Boolean)))], [employees])

  // â”€â”€ KPIs â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const kpis = useMemo(() => {
    const now = new Date()
    const thisMonth = (d: string) => { const dt = new Date(d); return dt.getMonth() === now.getMonth() && dt.getFullYear() === now.getFullYear() }
    return {
      total:    employees.length,
      active:   employees.filter(e => e.employmentStatus === 'Active').length,
      onLeave:  employees.filter(e => e.employmentStatus === 'On Leave').length,
      newHires: employees.filter(e => thisMonth(e.dateOfJoining || e.createdAt)).length,
      exits:    0, // track separately if needed
    }
  }, [employees])

  // â”€â”€ Filtered + sorted employees â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const filtered = useMemo(() => {
    let list = employees
    if (search)                          list = list.filter(e => `${fullName(e)} ${e.employeeId} ${e.email}`.toLowerCase().includes(search.toLowerCase()))
    if (deptFilter !== 'All Departments') list = list.filter(e => e.department === deptFilter)
    if (teamFilter !== 'All Teams')       list = list.filter(e => e.team === teamFilter)
    if (statusFilter !== 'All Status')    list = list.filter(e => e.employmentStatus === statusFilter)
    if (typeFilter !== 'All Types')       list = list.filter(e => e.employeeType === typeFilter)
    switch (sortLabel) {
      case 'Newest First': list = [...list].sort((a, b) => new Date(b.dateOfJoining || b.createdAt).getTime() - new Date(a.dateOfJoining || a.createdAt).getTime()); break
      case 'Oldest First': list = [...list].sort((a, b) => new Date(a.dateOfJoining || a.createdAt).getTime() - new Date(b.dateOfJoining || b.createdAt).getTime()); break
      case 'Name A-Z':     list = [...list].sort((a, b) => fullName(a).localeCompare(fullName(b))); break
      case 'Name Z-A':     list = [...list].sort((a, b) => fullName(b).localeCompare(fullName(a))); break
    }
    return list
  }, [employees, search, deptFilter, teamFilter, statusFilter, typeFilter, sortLabel])

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const paginated  = filtered.slice((page - 1) * pageSize, page * pageSize)

  const allChecked  = paginated.length > 0 && paginated.every(e => selected.has(e.id))
  const someChecked = paginated.some(e => selected.has(e.id))
  const visibleEmployeeColumns = EMPLOYEE_COLUMNS.filter(column => visibleColumns.has(column.key))

  function toggleAll() {
    if (allChecked) setSelected(prev => { const s = new Set(prev); paginated.forEach(e => s.delete(e.id)); return s })
    else            setSelected(prev => { const s = new Set(prev); paginated.forEach(e => s.add(e.id)); return s })
  }
  function toggleOne(id: string) {
    setSelected(prev => { const s = new Set(prev); if (s.has(id)) s.delete(id); else s.add(id); return s })
  }

  function openExitPrompt(id: string) {
    const employee = employees.find(item => item.id === id)
    if (!employee) return
    setExitPrompt({ employee, reason: 'Resigned', notes: '' })
    setOpenMenu(null)
  }

  function confirmExit() {
    if (!exitPrompt) return
    const { employee, reason, notes } = exitPrompt
    const exitRecord: Employee & { deletedAt: string; exitReason: ExitReason; exitNotes?: string } = {
      ...employee,
      deletedAt: new Date().toISOString(),
      exitReason: reason,
      exitNotes: notes.trim() || undefined,
    }
    setEmployees(prev => {
      const updated = prev.filter(e => e.id !== employee.id)
      const archive = loadStored<Array<Employee & { deletedAt?: string; exitReason?: ExitReason; exitNotes?: string }>>(deletedEmployeesKey, [])
      window.localStorage.setItem(deletedEmployeesKey, JSON.stringify([exitRecord, ...archive.filter(item => item.id !== employee.id)]))
      window.localStorage.setItem(employeesKey, JSON.stringify(updated))
      return updated
    })
    setExitPrompt(null)
    window.dispatchEvent(new Event('wiseflow:hr-data-changed'))
    // Remove from the shared HR store so the exit propagates cross-device; the
    // local archive in deletedEmployeesKey also guards against a sync resurrecting it.
    void deleteHrRecord('employees', employee.id).catch(() => undefined)
  }

  function clearAllEmployeeData() {
    const confirmed = window.confirm('Clear all employees and employee-linked HR demo records? This removes employee profiles, attendance, payroll, leave, loan, allowance, document, and performance records from this browser.')
    if (!confirmed) return

    // Also clear the shared HR store, otherwise the server sync re-populates the
    // roster within seconds and the local clear appears to do nothing.
    void Promise.allSettled(employees.map(employee => deleteHrRecord('employees', employee.id)))

    employeeWorkspaceKeys.forEach(key => {
      window.localStorage.setItem(key, '[]')
    })

    const scopedKeys: string[] = []
    for (let index = 0; index < window.localStorage.length; index += 1) {
      const key = window.localStorage.key(index)
      if (key && employeeWorkspaceKeyPrefixes.some(prefix => key.startsWith(prefix))) scopedKeys.push(key)
    }
    scopedKeys.forEach(key => window.localStorage.removeItem(key))

    const warningKeys: string[] = []
    for (let index = 0; index < window.sessionStorage.length; index += 1) {
      const key = window.sessionStorage.key(index)
      if (key?.startsWith('flowsys-hr-employee-warning-')) warningKeys.push(key)
    }
    warningKeys.forEach(key => window.sessionStorage.removeItem(key))

    setEmployees([])
    setSelected(new Set())
    setOpenMenu(null)
    setPage(1)
    setSearch('')
    setDeptFilter('All Departments')
    setTeamFilter('All Teams')
    setStatusFilter('All Status')
    setTypeFilter('All Types')
    setImportMessage({ tone: 'success', text: 'All employee records and employee-linked HR demo records have been cleared.' })
    window.dispatchEvent(new Event('wiseflow:hr-data-changed'))
    window.dispatchEvent(new Event('storage'))
  }

  function toggleColumn(key: EmployeeColumnKey) {
    const column = EMPLOYEE_COLUMNS.find(item => item.key === key)
    if (column?.locked) return
    setVisibleColumns(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  function exportEmployees() {
    const headers = ['Employee ID', 'Name', 'Email', 'Phone', 'Position', 'Department', 'Team', 'Status', 'Attendance', 'Payroll', 'Date Joined']
    const rows = filtered.map(employee => [
      employee.employeeId,
      fullName(employee),
      employee.email,
      employee.phone,
      employee.jobTitle,
      employee.department,
      employee.team,
      employee.employmentStatus,
      attBadge(employee.attendanceStatus).label,
      payBadge(employee.payrollStatus).label,
      employee.dateOfJoining || employee.createdAt,
    ])
    const csv = [headers, ...rows].map(row => row.map(csvEscape).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `employees-${new Date().toISOString().slice(0, 10)}.csv`
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
    setImportMessage({ tone: 'success', text: `${filtered.length} employee${filtered.length === 1 ? '' : 's'} exported to CSV.` })
  }

  async function importEmployees(file?: File) {
    if (!file) return
    try {
      const text = await file.text()
      const imported = file.name.toLowerCase().endsWith('.json')
        ? (JSON.parse(text) as Employee[])
        : recordsFromCsv(text, employees)
      const clean = imported.filter(employee => employee.employeeId || employee.email || fullName(employee))
      if (!clean.length) {
        setImportMessage({ tone: 'error', text: 'No employee rows were found. Use CSV headers like firstName, lastName, email, department, team, and jobTitle.' })
        return
      }
      const existingByKey = new Set(employees.flatMap(employee => [employee.id, employee.employeeId, employee.email].filter(Boolean).map(String)))
      const uniqueRows = clean.filter(employee => ![employee.id, employee.employeeId, employee.email].filter(Boolean).some(key => existingByKey.has(String(key))))
      if (!uniqueRows.length) {
        setImportMessage({ tone: 'error', text: 'Those employees already exist in HR.' })
        return
      }
      const next = [...uniqueRows, ...employees]
      setEmployees(next)
      window.localStorage.setItem(employeesKey, JSON.stringify(next))
      window.dispatchEvent(new Event('wiseflow:hr-data-changed'))
      setPage(1)
      setImportMessage({ tone: 'success', text: `${uniqueRows.length} employee${uniqueRows.length === 1 ? '' : 's'} imported from ${file.name}.` })
    } catch {
      setImportMessage({ tone: 'error', text: 'Import failed. Please use a valid CSV or JSON employee file.' })
    } finally {
      if (importInputRef.current) importInputRef.current.value = ''
    }
  }

  function toggleActionMenu(id: string, event: React.MouseEvent<HTMLButtonElement>) {
    if (openMenu === id) {
      setOpenMenu(null)
      return
    }
    const rect = event.currentTarget.getBoundingClientRect()
    const menuWidth = 190
    const menuHeight = 238
    setMenuPosition({
      top: Math.max(12, Math.min(rect.bottom + 8, window.innerHeight - menuHeight - 12)),
      left: Math.max(12, Math.min(rect.right - menuWidth, window.innerWidth - menuWidth - 12)),
    })
    setOpenMenu(id)
  }

  function renderEmployeeAvatar(emp: Employee, size = 34) {
    return (
      <div style={{ width: size, height: size, borderRadius: '50%', background: '#22c55e', display: 'grid', placeItems: 'center', flexShrink: 0, fontSize: size > 36 ? 14 : 12, fontWeight: 700, color: '#fff', overflow: 'hidden' }}>
        {emp.photo ? (
          <span
            role="img"
            aria-label={fullName(emp)}
            style={{ width: '100%', height: '100%', backgroundImage: `url(${emp.photo})`, backgroundSize: 'cover', backgroundPosition: 'center' }}
          />
        ) : (
          initials(fullName(emp))
        )}
      </div>
    )
  }

  function renderActionsMenu(emp: Employee) {
    return openMenu === emp.id ? (
      <div ref={menuRef} style={{ position: 'fixed', top: menuPosition.top, left: menuPosition.left, width: 190, background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, boxShadow: '0 18px 48px rgba(15,23,42,0.18)', zIndex: 300, overflow: 'hidden', padding: 6 }}>
        {[
          { label: 'View Profile', Icon: Eye,      action: () => router.push(`/hr/employees/${emp.id}`) },
          { label: 'Edit',         Icon: Pencil,   action: () => router.push(`/hr/employees/${emp.id}`) },
          { label: 'Documents',    Icon: FileText, action: () => setOpenMenu(null) },
          { label: 'Payroll',      Icon: FileText, action: () => setOpenMenu(null) },
        ].map(item => (
          <button key={item.label} onClick={item.action} style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', border: 'none', background: 'transparent', padding: '10px 12px', borderRadius: 8, fontSize: 13, color: '#374151', cursor: 'pointer', fontFamily: font, textAlign: 'left' }}>
            <item.Icon size={13} color="#000000" /> {item.label}
          </button>
        ))}
        <div style={{ height: 1, background: '#f3f4f6', margin: '4px 0' }} />
        <button onClick={() => openExitPrompt(emp.id)} style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', border: 'none', background: 'transparent', padding: '10px 12px', borderRadius: 8, fontSize: 13, color: '#ef4444', cursor: 'pointer', fontFamily: font }}>
          <UserMinus size={13} /> Mark as ex-employee
        </button>
      </div>
    ) : null
  }

  function renderEmployeeCell(emp: Employee, key: EmployeeColumnKey) {
    const att = attBadge(emp.attendanceStatus)
    const pay = payBadge(emp.payrollStatus)
    const sb = statusBadge(emp.employmentStatus)
    const dc = deptColor(emp.department)

    switch (key) {
      case 'employee':
        return (
          <td style={{ padding: '11px 12px', minWidth: 180 }}>
            <Link href={`/hr/employees/${emp.id}`} style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 10 }}>
              {renderEmployeeAvatar(emp)}
              <div>
                <div style={{ fontSize: 13, fontWeight: 500, color: '#111827' }}>{fullName(emp)}</div>
                <div style={{ fontSize: 11, color: '#000000' }}>Joined {new Date(emp.dateOfJoining || emp.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</div>
              </div>
            </Link>
          </td>
        )
      case 'employeeId':
        return <td style={{ padding: '11px 12px', whiteSpace: 'nowrap', color: '#000000' }}>{emp.employeeId}</td>
      case 'position':
        return <td style={{ padding: '11px 12px', whiteSpace: 'nowrap' }}>{emp.jobTitle || '-'}</td>
      case 'department':
        return (
          <td style={{ padding: '11px 12px' }}>
            <span style={{ fontSize: 12, fontWeight: 600, padding: '3px 10px', borderRadius: 99, background: dc.bg, color: dc.text, whiteSpace: 'nowrap' }}>{emp.department || '-'}</span>
          </td>
        )
      case 'team':
        return <td style={{ padding: '11px 12px', whiteSpace: 'nowrap', color: '#374151' }}>{emp.team || '-'}</td>
      case 'email':
        return <td style={{ padding: '11px 12px', whiteSpace: 'nowrap', color: '#374151', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis' }}>{emp.email}</td>
      case 'phone':
        return <td style={{ padding: '11px 12px', whiteSpace: 'nowrap', color: '#374151' }}>{emp.phone || '-'}</td>
      case 'status':
        return (
          <td style={{ padding: '11px 12px' }}>
            <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 99, background: sb.bg, color: sb.text, whiteSpace: 'nowrap' }}>{emp.employmentStatus}</span>
          </td>
        )
      case 'attendance':
        return (
          <td style={{ padding: '11px 12px', whiteSpace: 'nowrap' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12 }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: att.dot, flexShrink: 0 }} />{att.label}
            </span>
          </td>
        )
      case 'payroll':
        return (
          <td style={{ padding: '11px 12px', whiteSpace: 'nowrap' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12 }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: pay.dot, flexShrink: 0 }} />{pay.label}
            </span>
          </td>
        )
      case 'actions':
        return (
          <td style={{ padding: '11px 12px' }}>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button onClick={event => toggleActionMenu(emp.id, event)} style={{ border: '1px solid #e5e7eb', background: '#fff', cursor: 'pointer', width: 34, height: 34, borderRadius: 9, color: '#000000', display: 'grid', placeItems: 'center' }} aria-label={`Open actions for ${fullName(emp)}`}>
                <MoreHorizontal size={16} />
              </button>
              {renderActionsMenu(emp)}
            </div>
          </td>
        )
    }
  }

  const inputStyle = { border: '1px solid #e5e7eb', background: '#fff', borderRadius: 8, padding: '7px 12px', minHeight: 40, fontSize: 13, color: '#374151', fontFamily: font, outline: 'none', width: '100%' }
  const dropBtnStyle = (active: boolean): React.CSSProperties => ({ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, border: '1px solid #e5e7eb', background: active ? '#f0fdf4' : '#fff', borderRadius: 8, padding: '0 12px', minHeight: 40, width: '100%', fontSize: 13, color: active ? '#15803d' : '#374151', cursor: 'pointer', fontFamily: font, fontWeight: active ? 500 : 400, whiteSpace: 'nowrap' })
  const dropMenuStyle: React.CSSProperties = { position: 'absolute', top: 'calc(100% + 6px)', left: 0, minWidth: 180, background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, boxShadow: '0 8px 24px rgba(0,0,0,0.1)', zIndex: 60, overflow: 'hidden' }
  const dropItemStyle = (active: boolean): React.CSSProperties => ({ display: 'block', width: '100%', border: 'none', background: active ? '#f0fdf4' : 'transparent', padding: '8px 14px', fontSize: 13, color: active ? '#15803d' : '#374151', fontWeight: active ? 600 : 400, cursor: 'pointer', textAlign: 'left', fontFamily: font })
  const filterWrapStyle: React.CSSProperties = { position: 'relative', flex: '0 0 154px', minWidth: 154 }
  const filterTextStyle: React.CSSProperties = { minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }
  const toolbarButtonStyle: React.CSSProperties = { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, border: '1px solid #e5e7eb', background: '#fff', borderRadius: 7, padding: '0 12px', minHeight: 38, fontSize: 12, color: '#374151', cursor: 'pointer', fontFamily: font, whiteSpace: 'nowrap', flexShrink: 0 }
  const viewToggleButtonStyle = (active: boolean): React.CSSProperties => ({ display: 'grid', placeItems: 'center', width: 34, height: 34, border: 'none', borderRadius: 7, background: active ? '#dcfce7' : 'transparent', color: active ? '#15803d' : '#000000', cursor: 'pointer', flexShrink: 0 })
  const headerActionButtonStyle: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 6, border: '1px solid #e5e7eb', background: '#fff', borderRadius: 8, padding: '7px 14px', fontSize: 13, fontWeight: 500, color: '#374151', cursor: 'pointer', fontFamily: font }

  // â”€â”€â”€ Render â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  return (
    <main style={{ fontFamily: font, padding: '0 20px 32px', minHeight: '100vh' }}>

      {/* Page header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', paddingTop: 20, marginBottom: 18, flexWrap: 'wrap', gap: 10 }}>
        <div>
          <h1 style={{ margin: 0, color: '#0f172a', fontSize: 28, fontWeight: 900 }}>Employees</h1>
          <p style={{ margin: '6px 0 0', color: '#000000', fontSize: 14 }}>Manage employee records, profiles, roles, and work information across your organization.</p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end', rowGap: 8 }}>
          <input
            ref={importInputRef}
            type="file"
            accept=".csv,.json,text/csv,application/json"
            onChange={event => void importEmployees(event.target.files?.[0])}
            style={{ display: 'none' }}
          />
          <AnalyticsToggleButton open={analytics.open} onToggle={analytics.toggle} panelId={analytics.panelId} style={headerActionButtonStyle} />
          <button
            type="button"
            onClick={() => importInputRef.current?.click()}
            style={{ display: 'flex', alignItems: 'center', gap: 6, border: '1px solid #e5e7eb', background: '#fff', borderRadius: 8, padding: '7px 14px', fontSize: 13, fontWeight: 500, color: '#374151', cursor: 'pointer' }}
          >
            <Upload size={14} /> Import Employees
          </button>
          <button
            type="button"
            onClick={clearAllEmployeeData}
            style={{ display: 'flex', alignItems: 'center', gap: 6, border: '1px solid #fecaca', background: '#fff', borderRadius: 8, padding: '7px 14px', fontSize: 13, fontWeight: 600, color: '#dc2626', cursor: 'pointer' }}
          >
            <Trash2 size={14} /> Clear Employees
          </button>
          <Link href="/hr/employees/new">
            <button style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#22c55e', border: 'none', borderRadius: 8, padding: '7px 14px', fontSize: 13, fontWeight: 600, color: '#fff', cursor: 'pointer' }}>
              <Plus size={14} /> Add Employee <ChevronDown size={12} />
            </button>
          </Link>
          <Link href="/hr/employees/deleted">
            <button style={{ display: 'flex', alignItems: 'center', gap: 6, border: '1px solid #cbd5e1', background: '#fff', borderRadius: 8, padding: '7px 14px', fontSize: 13, fontWeight: 600, color: '#0f172a', cursor: 'pointer' }}>
              <UserMinus size={14} /> Ex Employees
            </button>
          </Link>
        </div>
      </div>

      {importMessage && (
        <div style={{
          marginBottom: 12,
          border: `1px solid ${importMessage.tone === 'success' ? '#bbf7d0' : '#fecaca'}`,
          background: importMessage.tone === 'success' ? '#f0fdf4' : '#fef2f2',
          color: importMessage.tone === 'success' ? '#166534' : '#b91c1c',
          borderRadius: 10,
          padding: '10px 12px',
          fontSize: 13,
          fontWeight: 700,
        }}>
          {importMessage.text}
        </div>
      )}

      {/* KPI cards */}
      <CollapsibleAnalytics open={analytics.open} id={analytics.panelId}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, minmax(0, 1fr))', gap: 10, marginBottom: 16 }}>
          {[
            { label: 'Total Employees',       value: kpis.total,    sub: `${kpis.newHires} this month`,            subColor: '#22c55e', iconBg: '#dcfce7', iconColor: '#22c55e', Icon: Users },
            { label: 'Active Employees',      value: kpis.active,   sub: `${kpis.total > 0 ? Math.round(kpis.active/kpis.total*100) : 0}% of total`, subColor: '#22c55e', iconBg: '#dbeafe', iconColor: '#3b82f6', Icon: UserPlus },
            { label: 'On Leave',              value: kpis.onLeave,  sub: `${kpis.total > 0 ? Math.round(kpis.onLeave/kpis.total*100) : 0}% of total`, subColor: '#000000', iconBg: '#ffedd5', iconColor: '#f97316', Icon: UserMinus },
            { label: 'New Hires (This Month)',value: kpis.newHires, sub: kpis.newHires ? `+${kpis.newHires} this month` : '0 this month', subColor: '#22c55e', iconBg: '#ede9fe', iconColor: '#8b5cf6', Icon: UserPlus },
            { label: 'Exits (This Month)',    value: kpis.exits,    sub: kpis.exits ? `-${kpis.exits} this month` : '0 this month',       subColor: '#ef4444', iconBg: '#fee2e2', iconColor: '#ef4444', Icon: UserMinus },
          ].map(k => {
            const KIcon = k.Icon
            return (
              <div key={k.label} style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: '14px 16px', boxShadow: '0 1px 4px rgba(0,0,0,0.05)', display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: k.iconBg, display: 'grid', placeItems: 'center', flexShrink: 0 }}>
                  <KIcon size={18} color={k.iconColor} />
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 11, color: '#000000', fontWeight: 500, marginBottom: 2 }}>{k.label}</div>
                  <div style={{ fontSize: 22, fontWeight: 700, color: '#111827', letterSpacing: '-0.5px' }}>{k.value}</div>
                  <div style={{ fontSize: 11, color: k.subColor, marginTop: 2 }}>{k.sub}</div>
                </div>
              </div>
            )
          })}
        </div>
      </CollapsibleAnalytics>

      {/* Filters */}
      <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: '14px 16px', marginBottom: 12, display: 'flex', gap: 10, alignItems: 'stretch', flexWrap: 'wrap' }}>
        {/* Search */}
        <div style={{ position: 'relative', flex: '1 1 360px', minWidth: 280 }}>
          <Search size={14} color="#000000" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)' }} />
          <input value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} placeholder="Search by name, employee ID, email..." style={{ ...inputStyle, paddingLeft: 32 }} />
        </div>
        {/* Department */}
        <div style={filterWrapStyle}>
          <button onClick={() => { setDeptOpen(v => !v); setTeamOpen(false); setStatOpen(false); setTypeOpen(false) }} style={dropBtnStyle(deptFilter !== 'All Departments')}>
            <span style={filterTextStyle}>{deptFilter}</span> <ChevronDown size={13} style={{ flexShrink: 0 }} />
          </button>
          {deptOpen && <div style={dropMenuStyle}>{depts.map(o => <button key={o} onClick={() => { setDeptFilter(o); setDeptOpen(false); setPage(1) }} style={dropItemStyle(deptFilter === o)}>{o}</button>)}</div>}
        </div>
        {/* Team */}
        <div style={filterWrapStyle}>
          <button onClick={() => { setTeamOpen(v => !v); setDeptOpen(false); setStatOpen(false); setTypeOpen(false) }} style={dropBtnStyle(teamFilter !== 'All Teams')}>
            <span style={filterTextStyle}>{teamFilter}</span> <ChevronDown size={13} style={{ flexShrink: 0 }} />
          </button>
          {teamOpen && <div style={dropMenuStyle}>{teams.map(o => <button key={o} onClick={() => { setTeamFilter(o); setTeamOpen(false); setPage(1) }} style={dropItemStyle(teamFilter === o)}>{o}</button>)}</div>}
        </div>
        {/* Status */}
        <div style={filterWrapStyle}>
          <button onClick={() => { setStatOpen(v => !v); setDeptOpen(false); setTeamOpen(false); setTypeOpen(false) }} style={dropBtnStyle(statusFilter !== 'All Status')}>
            <span style={filterTextStyle}>{statusFilter}</span> <ChevronDown size={13} style={{ flexShrink: 0 }} />
          </button>
          {statOpen && <div style={dropMenuStyle}>{['All Status','Active','On Leave','Inactive','Resigned','Terminated'].map(o => <button key={o} onClick={() => { setStatusFilter(o); setStatOpen(false); setPage(1) }} style={dropItemStyle(statusFilter === o)}>{o}</button>)}</div>}
        </div>
        {/* Job Type */}
        <div style={filterWrapStyle}>
          <button onClick={() => { setTypeOpen(v => !v); setDeptOpen(false); setTeamOpen(false); setStatOpen(false) }} style={dropBtnStyle(typeFilter !== 'All Types')}>
            <span style={filterTextStyle}>{typeFilter}</span> <ChevronDown size={13} style={{ flexShrink: 0 }} />
          </button>
          {typeOpen && <div style={dropMenuStyle}>{types.map(o => <button key={o} onClick={() => { setTypeFilter(o); setTypeOpen(false); setPage(1) }} style={dropItemStyle(typeFilter === o)}>{o}</button>)}</div>}
        </div>
      </div>

      {/* Table card */}
      <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, boxShadow: '0 1px 4px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
        {/* Table toolbar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap', padding: '12px 16px', borderBottom: '1px solid #f3f4f6' }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: '#111827', flex: '1 1 150px' }}>{filtered.length} Employee{filtered.length !== 1 ? 's' : ''}</span>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'flex-end', rowGap: 8, flex: '1 1 540px' }}>
            <div role="group" aria-label="Employee view mode" style={{ display: 'inline-flex', alignItems: 'center', gap: 2, border: '1px solid #e5e7eb', borderRadius: 9, padding: 2, background: '#fff', minHeight: 40, flexShrink: 0 }}>
              <button type="button" aria-label="List view" title="List view" onClick={() => setViewMode('list')} style={viewToggleButtonStyle(viewMode === 'list')}>
                <List size={16} />
              </button>
              <button type="button" aria-label="Grid view" title="Grid view" onClick={() => setViewMode('grid')} style={viewToggleButtonStyle(viewMode === 'grid')}>
                <Grid3X3 size={15} />
              </button>
            </div>
            <div ref={columnsRef} style={{ position: 'relative' }}>
              <button type="button" onClick={() => setColumnsOpen(value => !value)} style={toolbarButtonStyle}>
                <Settings2 size={13} /> Columns
              </button>
              {columnsOpen && (
                <div style={{ ...dropMenuStyle, left: 'auto', right: 0, width: 220, padding: 8 }}>
                  {EMPLOYEE_COLUMNS.map(column => (
                    <label key={column.key} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', borderRadius: 8, fontSize: 13, color: column.locked ? '#000000' : '#334155', cursor: column.locked ? 'not-allowed' : 'pointer', fontFamily: font }}>
                      <input
                        type="checkbox"
                        checked={visibleColumns.has(column.key)}
                        disabled={column.locked}
                        onChange={() => toggleColumn(column.key)}
                      />
                      {column.label}
                    </label>
                  ))}
                  <button type="button" onClick={() => setVisibleColumns(new Set(DEFAULT_EMPLOYEE_COLUMNS))} style={{ width: '100%', border: '1px solid #e5e7eb', background: '#f8fafc', borderRadius: 8, padding: '8px 10px', marginTop: 6, fontSize: 12, fontWeight: 700, color: '#334155', cursor: 'pointer', fontFamily: font }}>
                    Reset columns
                  </button>
                </div>
              )}
            </div>
            <button type="button" onClick={exportEmployees} style={toolbarButtonStyle}>
              <Download size={13} /> Export
            </button>
            <span style={{ fontSize: 12, color: '#000000', flexShrink: 0 }}>Sort:</span>
            <div style={{ position: 'relative' }}>
              <button onClick={() => setSortOpen(v => !v)} style={{ ...toolbarButtonStyle, justifyContent: 'space-between', minWidth: 126 }}>
                {sortLabel} <ChevronDown size={11} />
              </button>
              {sortOpen && (
                <div style={{ ...dropMenuStyle, left: 'auto', right: 0, minWidth: 160 }}>
                  {['Newest First','Oldest First','Name A-Z','Name Z-A'].map(o => (
                    <button key={o} onClick={() => { setSortLabel(o); setSortOpen(false) }} style={dropItemStyle(sortLabel === o)}>{o}</button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {viewMode === 'list' ? (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, color: '#374151' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #f3f4f6', background: '#fafafa' }}>
                  <th style={{ padding: '10px 12px', textAlign: 'left', width: 36 }}>
                    <input type="checkbox" checked={allChecked} ref={el => { if (el) el.indeterminate = someChecked && !allChecked }} onChange={toggleAll} style={{ cursor: 'pointer' }} />
                  </th>
                  {visibleEmployeeColumns.map(column => (
                    <th key={column.key} style={{ padding: '10px 12px', textAlign: column.key === 'actions' ? 'right' : 'left', fontSize: 11, fontWeight: 600, color: '#000000', textTransform: 'uppercase', letterSpacing: '0.04em', whiteSpace: 'nowrap' }}>{column.label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {paginated.length === 0 ? (
                  <tr><td colSpan={visibleEmployeeColumns.length + 1} style={{ padding: '48px 20px', textAlign: 'center' }}>
                    <Users size={36} color="#d1d5db" style={{ marginBottom: 12 }} />
                    <div style={{ fontSize: 14, fontWeight: 500, color: '#000000', marginBottom: 8 }}>No employees found</div>
                    <div style={{ fontSize: 13, color: '#000000', marginBottom: 16 }}>
                      {search || deptFilter !== 'All Departments' ? 'Try adjusting your filters.' : 'Get started by adding your first employee.'}
                    </div>
                    {!search && deptFilter === 'All Departments' && (
                      <Link href="/hr/employees/new">
                        <button style={{ background: '#22c55e', border: 'none', borderRadius: 8, padding: '8px 18px', fontSize: 13, fontWeight: 600, color: '#fff', cursor: 'pointer' }}>Add Employee</button>
                      </Link>
                    )}
                  </td></tr>
                ) : paginated.map((emp, idx) => {
                  const isSelected = selected.has(emp.id)
                  return (
                    <tr key={emp.id} style={{ borderBottom: '1px solid #f9fafb', background: isSelected ? '#f0fdf4' : idx % 2 === 0 ? '#fff' : '#fafafa', transition: 'background 100ms' }}>
                      <td style={{ padding: '11px 12px' }}>
                        <input type="checkbox" checked={isSelected} onChange={() => toggleOne(emp.id)} style={{ cursor: 'pointer' }} />
                      </td>
                      {visibleEmployeeColumns.map(column => (
                        <Fragment key={column.key}>{renderEmployeeCell(emp, column.key)}</Fragment>
                      ))}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={{ padding: 16, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 12 }}>
            {paginated.length === 0 ? (
              <div style={{ gridColumn: '1 / -1', border: '1px dashed #cbd5e1', borderRadius: 14, padding: '42px 20px', textAlign: 'center', color: '#000000' }}>
                <Users size={36} color="#000000" style={{ marginBottom: 12 }} />
                <div style={{ fontSize: 14, fontWeight: 800, color: '#334155', marginBottom: 6 }}>No employees found</div>
                <div style={{ fontSize: 13 }}>Try adjusting your search or filters.</div>
              </div>
            ) : paginated.map(emp => {
              const sb = statusBadge(emp.employmentStatus)
              const dc = deptColor(emp.department)
              const att = attBadge(emp.attendanceStatus)
              const pay = payBadge(emp.payrollStatus)
              return (
                <article key={emp.id} style={{ border: '1px solid #e5e7eb', borderRadius: 14, background: '#fff', padding: 14, boxShadow: '0 1px 3px rgba(15,23,42,0.05)' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                    <Link href={`/hr/employees/${emp.id}`} style={{ display: 'flex', gap: 12, minWidth: 0, textDecoration: 'none' }}>
                      {renderEmployeeAvatar(emp, 44)}
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 14, fontWeight: 800, color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{fullName(emp)}</div>
                        <div style={{ fontSize: 12, color: '#000000', marginTop: 2 }}>{emp.employeeId} · {emp.jobTitle || 'No position'}</div>
                      </div>
                    </Link>
                    <button onClick={event => toggleActionMenu(emp.id, event)} style={{ border: '1px solid #e5e7eb', background: '#fff', cursor: 'pointer', width: 34, height: 34, borderRadius: 9, color: '#000000', display: 'grid', placeItems: 'center', flexShrink: 0 }} aria-label={`Open actions for ${fullName(emp)}`}>
                      <MoreHorizontal size={16} />
                    </button>
                    {renderActionsMenu(emp)}
                  </div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 14 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, padding: '4px 9px', borderRadius: 999, background: sb.bg, color: sb.text }}>{emp.employmentStatus}</span>
                    <span style={{ fontSize: 11, fontWeight: 700, padding: '4px 9px', borderRadius: 999, background: dc.bg, color: dc.text }}>{emp.department || 'No department'}</span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 14, fontSize: 12, color: '#000000' }}>
                    <div><strong style={{ color: '#0f172a' }}>Team</strong><br />{emp.team || '-'}</div>
                    <div><strong style={{ color: '#0f172a' }}>Phone</strong><br />{emp.phone || '-'}</div>
                    <div style={{ minWidth: 0 }}><strong style={{ color: '#0f172a' }}>Email</strong><br /><span style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{emp.email || '-'}</span></div>
                    <div><strong style={{ color: '#0f172a' }}>Joined</strong><br />{new Date(emp.dateOfJoining || emp.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</div>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, marginTop: 14, paddingTop: 12, borderTop: '1px solid #f1f5f9', fontSize: 12 }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><span style={{ width: 7, height: 7, borderRadius: '50%', background: att.dot }} />{att.label}</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><span style={{ width: 7, height: 7, borderRadius: '50%', background: pay.dot }} />{pay.label}</span>
                  </div>
                </article>
              )
            })}
          </div>
        )}

        {/* Pagination */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderTop: '1px solid #f3f4f6', flexWrap: 'wrap', gap: 8 }}>
          <span style={{ fontSize: 12, color: '#000000' }}>
            Showing {filtered.length === 0 ? 0 : (page - 1) * pageSize + 1} to {Math.min(page * pageSize, filtered.length)} of {filtered.length} results
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} style={{ width: 30, height: 30, border: '1px solid #e5e7eb', background: '#fff', borderRadius: 7, cursor: page === 1 ? 'not-allowed' : 'pointer', display: 'grid', placeItems: 'center', color: page === 1 ? '#d1d5db' : '#374151' }}>
              <ChevronLeft size={14} />
            </button>
            {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
              let p = i + 1
              if (totalPages > 5 && page > 3) p = page - 2 + i
              if (p > totalPages) return null
              return (
                <button key={p} onClick={() => setPage(p)} style={{ width: 30, height: 30, border: '1px solid #e5e7eb', background: page === p ? '#22c55e' : '#fff', borderRadius: 7, cursor: 'pointer', fontSize: 13, fontWeight: page === p ? 700 : 400, color: page === p ? '#fff' : '#374151' }}>
                  {p}
                </button>
              )
            })}
            {totalPages > 5 && <span style={{ fontSize: 13, color: '#000000' }}>...</span>}
            {totalPages > 5 && (
              <button onClick={() => setPage(totalPages)} style={{ width: 30, height: 30, border: '1px solid #e5e7eb', background: page === totalPages ? '#22c55e' : '#fff', borderRadius: 7, cursor: 'pointer', fontSize: 13, fontWeight: page === totalPages ? 700 : 400, color: page === totalPages ? '#fff' : '#374151' }}>
                {totalPages}
              </button>
            )}
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} style={{ width: 30, height: 30, border: '1px solid #e5e7eb', background: '#fff', borderRadius: 7, cursor: page === totalPages ? 'not-allowed' : 'pointer', display: 'grid', placeItems: 'center', color: page === totalPages ? '#d1d5db' : '#374151' }}>
              <ChevronRight size={14} />
            </button>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#000000' }}>
            <span>Rows per page</span>
            <div style={{ position: 'relative' }}>
              <button onClick={() => setPsOpen(v => !v)} style={{ display: 'flex', alignItems: 'center', gap: 4, border: '1px solid #e5e7eb', background: '#fff', borderRadius: 7, padding: '4px 10px', fontSize: 12, color: '#374151', cursor: 'pointer' }}>
                {pageSize} <ChevronDown size={11} />
              </button>
              {psOpen && (
                <div style={{ position: 'absolute', bottom: 'calc(100% + 6px)', right: 0, width: 80, background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, boxShadow: '0 6px 20px rgba(0,0,0,0.1)', zIndex: 60, overflow: 'hidden' }}>
                  {PAGE_SIZE_OPTIONS.map(n => (
                    <button key={n} onClick={() => { setPageSize(n); setPsOpen(false); setPage(1) }} style={{ display: 'block', width: '100%', border: 'none', background: pageSize === n ? '#f0fdf4' : 'transparent', padding: '7px 12px', fontSize: 12, color: pageSize === n ? '#15803d' : '#374151', cursor: 'pointer', textAlign: 'left', fontFamily: font }}>
                      {n}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {exitPrompt && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="exit-prompt-title"
          onClick={() => setExitPrompt(null)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.5)', zIndex: 200, display: 'grid', placeItems: 'center', padding: 16 }}
        >
          <div
            onClick={event => event.stopPropagation()}
            style={{ width: 'min(440px, 100%)', background: '#fff', borderRadius: 14, boxShadow: '0 24px 60px rgba(15,23,42,0.2)', padding: 22, fontFamily: font }}
          >
            <h2 id="exit-prompt-title" style={{ margin: 0, color: '#0f172a', fontSize: 18, fontWeight: 800 }}>Mark as ex-employee</h2>
            <p style={{ margin: '6px 0 18px', color: '#000000', fontSize: 13 }}>
              <strong style={{ color: '#0f172a' }}>{[exitPrompt.employee.firstName, exitPrompt.employee.middleName, exitPrompt.employee.lastName].filter(Boolean).join(' ')}</strong>
              {' '}will move to Ex Employees. Pick a reason so HR has a record of why they left.
            </p>

            <label style={{ display: 'block', color: '#0f172a', fontSize: 12, fontWeight: 700, marginBottom: 6 }}>Reason</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0,1fr))', gap: 8, marginBottom: 16 }}>
              {EXIT_REASONS.map(reason => {
                const active = exitPrompt.reason === reason
                return (
                  <button
                    key={reason}
                    type="button"
                    onClick={() => setExitPrompt(prev => prev ? { ...prev, reason } : prev)}
                    style={{
                      minHeight: 36,
                      border: `1px solid ${active ? '#0f172a' : '#e2e8f0'}`,
                      background: active ? '#0f172a' : '#fff',
                      color: active ? '#fff' : '#0f172a',
                      borderRadius: 8,
                      padding: '0 10px',
                      fontSize: 12,
                      fontWeight: 700,
                      cursor: 'pointer',
                      fontFamily: font,
                    }}
                  >
                    {reason}
                  </button>
                )
              })}
            </div>

            <label style={{ display: 'block', color: '#0f172a', fontSize: 12, fontWeight: 700, marginBottom: 6 }}>Notes <span style={{ color: '#000000', fontWeight: 500 }}>(optional)</span></label>
            <textarea
              value={exitPrompt.notes}
              onChange={event => setExitPrompt(prev => prev ? { ...prev, notes: event.target.value } : prev)}
              placeholder={
                exitPrompt.reason === 'AWOL' ? 'Last day reported, attempts to contact, etc.'
                : exitPrompt.reason === 'Terminated' ? 'Reference the termination memo or case number.'
                : exitPrompt.reason === 'Resigned' ? 'Effective date, handover notes, or rehire eligibility.'
                : 'Any context HR should keep on file.'
              }
              rows={3}
              style={{ width: '100%', border: '1px solid #e2e8f0', borderRadius: 8, padding: '10px 12px', fontSize: 13, color: '#0f172a', fontFamily: font, resize: 'vertical', outline: 'none' }}
            />

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 18 }}>
              <button
                type="button"
                onClick={() => setExitPrompt(null)}
                style={{ minHeight: 38, border: '1px solid #e2e8f0', background: '#fff', color: '#0f172a', borderRadius: 8, padding: '0 16px', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: font }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmExit}
                style={{ minHeight: 38, border: 0, background: '#dc2626', color: '#fff', borderRadius: 8, padding: '0 18px', fontSize: 13, fontWeight: 800, cursor: 'pointer', fontFamily: font }}
              >
                Move to Ex Employees
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
