'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  ChevronDown, ChevronLeft, ChevronRight,
  Download, Eye, FileText, MoreHorizontal,
  Pencil, Plus, Search, Settings2, Trash2,
  UserMinus, UserPlus, Users,
} from 'lucide-react'

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

// â”€â”€â”€ Helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const font = "var(--font-body)"
const employeesKey = 'flowsys-hr-employees'
const deletedEmployeesKey = 'flowsys-hr-deleted-employees'

function loadStored<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback
  try { const r = window.localStorage.getItem(key); return r ? (JSON.parse(r) as T) : fallback } catch { return fallback }
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
  return map[dept] || { bg: '#f3f4f6', text: '#6b7280' }
}

function statusBadge(status: string): { bg: string; text: string } {
  switch (status?.toLowerCase()) {
    case 'active':      return { bg: '#dcfce7', text: '#15803d' }
    case 'on leave':    return { bg: '#dbeafe', text: '#1d4ed8' }
    case 'inactive':    return { bg: '#f3f4f6', text: '#6b7280' }
    case 'resigned':    return { bg: '#fee2e2', text: '#dc2626' }
    case 'terminated':  return { bg: '#fee2e2', text: '#dc2626' }
    default:            return { bg: '#f3f4f6', text: '#6b7280' }
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

  useEffect(() => {
    const id = window.setTimeout(() => {
      setEmployees(loadStored(employeesKey, []))
    }, 0)
    return () => window.clearTimeout(id)
  }, [])

  // Close dropdowns on outside click
  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpenMenu(null)
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

  function toggleAll() {
    if (allChecked) setSelected(prev => { const s = new Set(prev); paginated.forEach(e => s.delete(e.id)); return s })
    else            setSelected(prev => { const s = new Set(prev); paginated.forEach(e => s.add(e.id)); return s })
  }
  function toggleOne(id: string) {
    setSelected(prev => { const s = new Set(prev); if (s.has(id)) s.delete(id); else s.add(id); return s })
  }

  function deleteEmployee(id: string) {
    setEmployees(prev => {
      const employee = prev.find(e => e.id === id)
      const updated = prev.filter(e => e.id !== id)
      if (employee) {
        const deleted = loadStored<Array<Employee & { deletedAt?: string }>>(deletedEmployeesKey, [])
        window.localStorage.setItem(deletedEmployeesKey, JSON.stringify([{ ...employee, deletedAt: new Date().toISOString() }, ...deleted.filter(item => item.id !== id)]))
      }
      window.localStorage.setItem(employeesKey, JSON.stringify(updated))
      return updated
    })
    setOpenMenu(null)
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

  const inputStyle = { border: '1px solid #e5e7eb', background: '#fff', borderRadius: 8, padding: '7px 12px', fontSize: 13, color: '#374151', fontFamily: font, outline: 'none', width: '100%' }
  const dropBtnStyle = (active: boolean): React.CSSProperties => ({ display: 'flex', alignItems: 'center', gap: 6, border: '1px solid #e5e7eb', background: active ? '#f0fdf4' : '#fff', borderRadius: 8, padding: '7px 12px', fontSize: 13, color: active ? '#15803d' : '#374151', cursor: 'pointer', fontFamily: font, fontWeight: active ? 500 : 400, whiteSpace: 'nowrap' })
  const dropMenuStyle: React.CSSProperties = { position: 'absolute', top: 'calc(100% + 6px)', left: 0, minWidth: 180, background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, boxShadow: '0 8px 24px rgba(0,0,0,0.1)', zIndex: 60, overflow: 'hidden' }
  const dropItemStyle = (active: boolean): React.CSSProperties => ({ display: 'block', width: '100%', border: 'none', background: active ? '#f0fdf4' : 'transparent', padding: '8px 14px', fontSize: 13, color: active ? '#15803d' : '#374151', fontWeight: active ? 600 : 400, cursor: 'pointer', textAlign: 'left', fontFamily: font })

  // â”€â”€â”€ Render â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  return (
    <main style={{ fontFamily: font, padding: '0 20px 32px', minHeight: '100vh', background: '#f8fafc' }}>

      {/* Page header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', paddingTop: 20, marginBottom: 18, flexWrap: 'wrap', gap: 10 }}>
        <div>
          <h1 style={{ margin: 0, color: '#0f172a', fontSize: 28, fontWeight: 900 }}>Employees</h1>
          <p style={{ margin: '6px 0 0', color: '#475569', fontSize: 14 }}>Manage employee records, profiles, roles, and work information across your organization.</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button style={{ display: 'flex', alignItems: 'center', gap: 6, border: '1px solid #e5e7eb', background: '#fff', borderRadius: 8, padding: '7px 14px', fontSize: 13, fontWeight: 500, color: '#374151', cursor: 'pointer' }}>
            <Download size={14} /> Import Employees
          </button>
          <Link href="/hr/employees/new">
            <button style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#22c55e', border: 'none', borderRadius: 8, padding: '7px 14px', fontSize: 13, fontWeight: 600, color: '#fff', cursor: 'pointer' }}>
              <Plus size={14} /> Add Employee <ChevronDown size={12} />
            </button>
          </Link>
          <Link href="/hr/employees/deleted">
            <button style={{ display: 'flex', alignItems: 'center', gap: 6, border: '1px solid #fecaca', background: '#fff', borderRadius: 8, padding: '7px 14px', fontSize: 13, fontWeight: 600, color: '#dc2626', cursor: 'pointer' }}>
              <Trash2 size={14} /> Deleted Employees
            </button>
          </Link>
        </div>
      </div>

      {/* KPI cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, minmax(0, 1fr))', gap: 10, marginBottom: 16 }}>
        {[
          { label: 'Total Employees',       value: kpis.total,    sub: `${kpis.newHires} this month`,            subColor: '#22c55e', iconBg: '#dcfce7', iconColor: '#22c55e', Icon: Users },
          { label: 'Active Employees',      value: kpis.active,   sub: `${kpis.total > 0 ? Math.round(kpis.active/kpis.total*100) : 0}% of total`, subColor: '#22c55e', iconBg: '#dbeafe', iconColor: '#3b82f6', Icon: UserPlus },
          { label: 'On Leave',              value: kpis.onLeave,  sub: `${kpis.total > 0 ? Math.round(kpis.onLeave/kpis.total*100) : 0}% of total`, subColor: '#6b7280', iconBg: '#ffedd5', iconColor: '#f97316', Icon: UserMinus },
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
                <div style={{ fontSize: 11, color: '#6b7280', fontWeight: 500, marginBottom: 2 }}>{k.label}</div>
                <div style={{ fontSize: 22, fontWeight: 700, color: '#111827', letterSpacing: '-0.5px' }}>{k.value}</div>
                <div style={{ fontSize: 11, color: k.subColor, marginTop: 2 }}>{k.sub}</div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Filters */}
      <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: '14px 16px', marginBottom: 12, display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
        {/* Search */}
        <div style={{ position: 'relative', flex: '1 1 220px', minWidth: 180 }}>
          <Search size={14} color="#9ca3af" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)' }} />
          <input value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} placeholder="Search by name, employee ID, email..." style={{ ...inputStyle, paddingLeft: 32 }} />
        </div>
        {/* Department */}
        <div style={{ position: 'relative' }}>
          <button onClick={() => { setDeptOpen(v => !v); setTeamOpen(false); setStatOpen(false); setTypeOpen(false) }} style={dropBtnStyle(deptFilter !== 'All Departments')}>
            {deptFilter} <ChevronDown size={13} />
          </button>
          {deptOpen && <div style={dropMenuStyle}>{depts.map(o => <button key={o} onClick={() => { setDeptFilter(o); setDeptOpen(false); setPage(1) }} style={dropItemStyle(deptFilter === o)}>{o}</button>)}</div>}
        </div>
        {/* Team */}
        <div style={{ position: 'relative' }}>
          <button onClick={() => { setTeamOpen(v => !v); setDeptOpen(false); setStatOpen(false); setTypeOpen(false) }} style={dropBtnStyle(teamFilter !== 'All Teams')}>
            {teamFilter} <ChevronDown size={13} />
          </button>
          {teamOpen && <div style={dropMenuStyle}>{teams.map(o => <button key={o} onClick={() => { setTeamFilter(o); setTeamOpen(false); setPage(1) }} style={dropItemStyle(teamFilter === o)}>{o}</button>)}</div>}
        </div>
        {/* Status */}
        <div style={{ position: 'relative' }}>
          <button onClick={() => { setStatOpen(v => !v); setDeptOpen(false); setTeamOpen(false); setTypeOpen(false) }} style={dropBtnStyle(statusFilter !== 'All Status')}>
            {statusFilter} <ChevronDown size={13} />
          </button>
          {statOpen && <div style={dropMenuStyle}>{['All Status','Active','On Leave','Inactive','Resigned','Terminated'].map(o => <button key={o} onClick={() => { setStatusFilter(o); setStatOpen(false); setPage(1) }} style={dropItemStyle(statusFilter === o)}>{o}</button>)}</div>}
        </div>
        {/* Job Type */}
        <div style={{ position: 'relative' }}>
          <button onClick={() => { setTypeOpen(v => !v); setDeptOpen(false); setTeamOpen(false); setStatOpen(false) }} style={dropBtnStyle(typeFilter !== 'All Types')}>
            {typeFilter} <ChevronDown size={13} />
          </button>
          {typeOpen && <div style={dropMenuStyle}>{types.map(o => <button key={o} onClick={() => { setTypeFilter(o); setTypeOpen(false); setPage(1) }} style={dropItemStyle(typeFilter === o)}>{o}</button>)}</div>}
        </div>
        <button style={{ display: 'flex', alignItems: 'center', gap: 6, border: '1px solid #e5e7eb', background: '#fff', borderRadius: 8, padding: '7px 12px', fontSize: 13, color: '#374151', cursor: 'pointer', marginLeft: 'auto' }}>
          <Settings2 size={14} /> More Filters
        </button>
      </div>

      {/* Table card */}
      <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, boxShadow: '0 1px 4px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
        {/* Table toolbar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderBottom: '1px solid #f3f4f6' }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: '#111827' }}>{filtered.length} Employee{filtered.length !== 1 ? 's' : ''}</span>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <button style={{ display: 'flex', alignItems: 'center', gap: 6, border: '1px solid #e5e7eb', background: '#fff', borderRadius: 7, padding: '5px 12px', fontSize: 12, color: '#374151', cursor: 'pointer' }}>
              <Settings2 size={13} /> Columns
            </button>
            <button style={{ display: 'flex', alignItems: 'center', gap: 6, border: '1px solid #e5e7eb', background: '#fff', borderRadius: 7, padding: '5px 12px', fontSize: 12, color: '#374151', cursor: 'pointer' }}>
              <Download size={13} /> Export
            </button>
            <span style={{ fontSize: 12, color: '#9ca3af' }}>Sort:</span>
            <div style={{ position: 'relative' }}>
              <button onClick={() => setSortOpen(v => !v)} style={{ display: 'flex', alignItems: 'center', gap: 4, border: '1px solid #e5e7eb', background: '#fff', borderRadius: 7, padding: '5px 12px', fontSize: 12, color: '#374151', cursor: 'pointer' }}>
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

        {/* Table */}
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, color: '#374151' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #f3f4f6', background: '#fafafa' }}>
                <th style={{ padding: '10px 12px', textAlign: 'left', width: 36 }}>
                  <input type="checkbox" checked={allChecked} ref={el => { if (el) el.indeterminate = someChecked && !allChecked }} onChange={toggleAll} style={{ cursor: 'pointer' }} />
                </th>
                {['Employee','Employee ID','Position','Department','Team','Email','Phone','Status','Attendance','Payroll','Actions'].map(h => (
                  <th key={h} style={{ padding: '10px 12px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.04em', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paginated.length === 0 ? (
                <tr><td colSpan={12} style={{ padding: '48px 20px', textAlign: 'center' }}>
                  <Users size={36} color="#d1d5db" style={{ marginBottom: 12 }} />
                  <div style={{ fontSize: 14, fontWeight: 500, color: '#6b7280', marginBottom: 8 }}>No employees found</div>
                  <div style={{ fontSize: 13, color: '#9ca3af', marginBottom: 16 }}>
                    {search || deptFilter !== 'All Departments' ? 'Try adjusting your filters.' : 'Get started by adding your first employee.'}
                  </div>
                  {!search && deptFilter === 'All Departments' && (
                    <Link href="/hr/employees/new">
                      <button style={{ background: '#22c55e', border: 'none', borderRadius: 8, padding: '8px 18px', fontSize: 13, fontWeight: 600, color: '#fff', cursor: 'pointer' }}>Add Employee</button>
                    </Link>
                  )}
                </td></tr>
              ) : paginated.map((emp, idx) => {
                const att = attBadge(emp.attendanceStatus)
                const pay = payBadge(emp.payrollStatus)
                const sb  = statusBadge(emp.employmentStatus)
                const dc  = deptColor(emp.department)
                const isSelected = selected.has(emp.id)
                return (
                  <tr key={emp.id} style={{ borderBottom: '1px solid #f9fafb', background: isSelected ? '#f0fdf4' : idx % 2 === 0 ? '#fff' : '#fafafa', transition: 'background 100ms' }}>
                    <td style={{ padding: '11px 12px' }}>
                      <input type="checkbox" checked={isSelected} onChange={() => toggleOne(emp.id)} style={{ cursor: 'pointer' }} />
                    </td>
                    <td style={{ padding: '11px 12px', minWidth: 180 }}>
                      <Link href={`/hr/employees/${emp.id}`} style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 34, height: 34, borderRadius: '50%', background: '#22c55e', display: 'grid', placeItems: 'center', flexShrink: 0, fontSize: 12, fontWeight: 700, color: '#fff', overflow: 'hidden' }}>
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
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 500, color: '#111827' }}>{fullName(emp)}</div>
                          <div style={{ fontSize: 11, color: '#9ca3af' }}>Joined {new Date(emp.dateOfJoining || emp.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</div>
                        </div>
                      </Link>
                    </td>
                    <td style={{ padding: '11px 12px', whiteSpace: 'nowrap', color: '#6b7280' }}>{emp.employeeId}</td>
                    <td style={{ padding: '11px 12px', whiteSpace: 'nowrap' }}>{emp.jobTitle || '-'}</td>
                    <td style={{ padding: '11px 12px' }}>
                      <span style={{ fontSize: 12, fontWeight: 600, padding: '3px 10px', borderRadius: 99, background: dc.bg, color: dc.text, whiteSpace: 'nowrap' }}>{emp.department || '-'}</span>
                    </td>
                    <td style={{ padding: '11px 12px', whiteSpace: 'nowrap', color: '#374151' }}>{emp.team || '-'}</td>
                    <td style={{ padding: '11px 12px', whiteSpace: 'nowrap', color: '#374151', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis' }}>{emp.email}</td>
                    <td style={{ padding: '11px 12px', whiteSpace: 'nowrap', color: '#374151' }}>{emp.phone || '-'}</td>
                    <td style={{ padding: '11px 12px' }}>
                      <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 99, background: sb.bg, color: sb.text, whiteSpace: 'nowrap' }}>{emp.employmentStatus}</span>
                    </td>
                    <td style={{ padding: '11px 12px', whiteSpace: 'nowrap' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12 }}>
                        <span style={{ width: 7, height: 7, borderRadius: '50%', background: att.dot, flexShrink: 0 }} />{att.label}
                      </span>
                    </td>
                    <td style={{ padding: '11px 12px', whiteSpace: 'nowrap' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12 }}>
                        <span style={{ width: 7, height: 7, borderRadius: '50%', background: pay.dot, flexShrink: 0 }} />{pay.label}
                      </span>
                    </td>
                    <td style={{ padding: '11px 12px' }}>
                      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                        <button onClick={event => toggleActionMenu(emp.id, event)} style={{ border: '1px solid #e5e7eb', background: '#fff', cursor: 'pointer', width: 34, height: 34, borderRadius: 9, color: '#64748b', display: 'grid', placeItems: 'center' }} aria-label={`Open actions for ${fullName(emp)}`}>
                          <MoreHorizontal size={16} />
                        </button>
                        {openMenu === emp.id && (
                          <div ref={menuRef} style={{ position: 'fixed', top: menuPosition.top, left: menuPosition.left, width: 190, background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, boxShadow: '0 18px 48px rgba(15,23,42,0.18)', zIndex: 300, overflow: 'hidden', padding: 6 }}>
                            {[
                              { label: 'View Profile', Icon: Eye,      action: () => router.push(`/hr/employees/${emp.id}`) },
                              { label: 'Edit',         Icon: Pencil,   action: () => router.push(`/hr/employees/${emp.id}`) },
                              { label: 'Documents',    Icon: FileText, action: () => setOpenMenu(null) },
                              { label: 'Payroll',      Icon: FileText, action: () => setOpenMenu(null) },
                            ].map(item => (
                              <button key={item.label} onClick={item.action} style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', border: 'none', background: 'transparent', padding: '10px 12px', borderRadius: 8, fontSize: 13, color: '#374151', cursor: 'pointer', fontFamily: font, textAlign: 'left' }}>
                                <item.Icon size={13} color="#9ca3af" /> {item.label}
                              </button>
                            ))}
                            <div style={{ height: 1, background: '#f3f4f6', margin: '4px 0' }} />
                            <button onClick={() => deleteEmployee(emp.id)} style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', border: 'none', background: 'transparent', padding: '10px 12px', borderRadius: 8, fontSize: 13, color: '#ef4444', cursor: 'pointer', fontFamily: font }}>
                              <Trash2 size={13} /> Delete
                            </button>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderTop: '1px solid #f3f4f6', flexWrap: 'wrap', gap: 8 }}>
          <span style={{ fontSize: 12, color: '#6b7280' }}>
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
            {totalPages > 5 && <span style={{ fontSize: 13, color: '#9ca3af' }}>...</span>}
            {totalPages > 5 && (
              <button onClick={() => setPage(totalPages)} style={{ width: 30, height: 30, border: '1px solid #e5e7eb', background: page === totalPages ? '#22c55e' : '#fff', borderRadius: 7, cursor: 'pointer', fontSize: 13, fontWeight: page === totalPages ? 700 : 400, color: page === totalPages ? '#fff' : '#374151' }}>
                {totalPages}
              </button>
            )}
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} style={{ width: 30, height: 30, border: '1px solid #e5e7eb', background: '#fff', borderRadius: 7, cursor: page === totalPages ? 'not-allowed' : 'pointer', display: 'grid', placeItems: 'center', color: page === totalPages ? '#d1d5db' : '#374151' }}>
              <ChevronRight size={14} />
            </button>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#6b7280' }}>
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
    </main>
  )
}
