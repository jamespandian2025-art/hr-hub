'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import {
  AlertCircle, ChevronDown,
  ChevronRight, Clock, Download, FileText, LogOut,
  Megaphone, PartyPopper,
  UserCheck, UserPlus, Users,
  Wallet, Zap,
} from 'lucide-react'
import { Cell, Pie, PieChart, ResponsiveContainer } from 'recharts'
import { listHrRecords } from '@/lib/hrms/client'
import { loadLeaveRequests } from '@/app/hr/leave-requests/leaveData'

// â”€â”€â”€ Types â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

interface Employee {
  id: string; employeeId: string
  firstName: string; middleName?: string; lastName: string
  email: string; phone: string
  dateOfBirth?: string; gender?: string; maritalStatus?: string
  nationality?: string; languages?: string[]; address?: string
  photo?: string
  employeeType: string; employmentStatus: string
  dateOfJoining: string; probationPeriod?: number
  department: string; team: string; jobTitle: string
  reportsTo?: string; workLocation?: string; workType?: string
  shift?: string; employeeGrade?: string
  basicSalary?: number; allowances?: number; deductions?: number
  attendanceStatus?: string; payrollStatus?: string
  createdAt: string; updatedAt: string
}

interface LeaveRequest {
  id: string; employeeId: string; employeeName: string; jobTitle?: string
  leaveType: string; startDate: string; endDate: string
  days: number; reason?: string; status: string
  createdAt: string
}

interface HRAnnouncement {
  id: string; title: string; body: string
  icon?: string; createdAt: string
}

// â”€â”€â”€ Helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const font = "var(--font-body)"

function loadStored<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback
  try { const r = window.localStorage.getItem(key); return r ? (JSON.parse(r) as T) : fallback } catch { return fallback }
}

function uniqueLeaveRequests(rows: LeaveRequest[]) {
  const map = new Map<string, LeaveRequest>()
  rows.forEach((row, index) => {
    const key = row.id || `leave-${index}`
    map.set(key, { ...map.get(key), ...row })
  })
  return Array.from(map.values())
}

function money(v: number) { return `PHP ${v.toLocaleString('en-PH', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}` }

function fullName(e?: Partial<Employee>) {
  return [e?.firstName, e?.lastName].filter(Boolean).join(' ').trim()
}

function initials(name?: string) {
  const cleanName = name?.trim() || 'Unknown User'
  return cleanName.split(' ').filter(Boolean).map(w => w[0]).join('').toUpperCase().slice(0, 2)
}

function leaveEmployeeName(leave: LeaveRequest, employees: Employee[]) {
  return leave.employeeName || fullName(employees.find(employee => employee.id === leave.employeeId)) || 'Unknown Employee'
}

function findLeaveEmployee(leave: LeaveRequest, employees: Employee[]) {
  const requestedName = leave.employeeName?.trim().toLowerCase()
  return employees.find(employee =>
    employee.id === leave.employeeId ||
    employee.employeeId === leave.employeeId ||
    fullName(employee).toLowerCase() === requestedName
  )
}

function EmployeeAvatar({ employee, name, tone = 'green' }: { employee?: Employee; name?: string; tone?: 'green' | 'amber' }) {
  const bg = tone === 'amber' ? '#fef3c7' : '#22c55e'
  const text = tone === 'amber' ? '#d97706' : '#fff'
  const displayName = employee ? fullName(employee) : name || 'Employee'

  return (
    <div
      aria-label={displayName}
      style={{
        width: 36,
        height: 36,
        borderRadius: '50%',
        background: employee?.photo ? '#e5e7eb' : bg,
        backgroundImage: employee?.photo ? `url(${employee.photo})` : undefined,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        display: 'grid',
        placeItems: 'center',
        flexShrink: 0,
        overflow: 'hidden',
        fontSize: 13,
        fontWeight: 700,
        color: text,
      }}
    >
      {!employee?.photo && initials(displayName)}
    </div>
  )
}

function timeAgo(d: Date) {
  const diff = Date.now() - d.getTime()
  const mins = Math.floor(diff / 60000), hrs = Math.floor(diff / 3600000), days = Math.floor(diff / 86400000)
  if (days >= 1) return `${days} day${days > 1 ? 's' : ''} ago`
  if (hrs >= 1) return `${hrs} hour${hrs > 1 ? 's' : ''} ago`
  if (mins >= 1) return `${mins} min ago`
  return 'just now'
}

function leaveTypeBadge(type: string): { bg: string; text: string } {
  switch (type.toLowerCase()) {
    case 'vacation leave': return { bg: '#dbeafe', text: '#1d4ed8' }
    case 'sick leave':     return { bg: '#fee2e2', text: '#dc2626' }
    case 'emergency leave':return { bg: '#ffedd5', text: '#c2410c' }
    case 'maternity leave':return { bg: '#fce7f3', text: '#be185d' }
    case 'paternity leave':return { bg: '#ede9fe', text: '#7c3aed' }
    default:               return { bg: '#f3f4f6', text: '#6b7280' }
  }
}

function announcementIcon(icon?: string) {
  switch (icon) {
    case 'alert':   return { Icon: AlertCircle, bg: '#fee2e2',  color: '#dc2626' }
    case 'survey':  return { Icon: FileText,    bg: '#ede9fe',  color: '#7c3aed' }
    case 'party':   return { Icon: PartyPopper, bg: '#fef3c7',  color: '#d97706' }
    default:        return { Icon: Megaphone,   bg: '#d1fae5',  color: '#059669' }
  }
}

// â”€â”€â”€ Overview page â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export default function HROverview() {
  const [employees, setEmployees]       = useState<Employee[]>([])
  const [leaveRequests, setLeaves]      = useState<LeaveRequest[]>([])
  const [announcements, setAnnouncements] = useState<HRAnnouncement[]>([])
  const [exportOpen, setExportOpen]     = useState(false)
  const [attPeriod, setAttPeriod]       = useState('This Month')
  const [payPeriod, setPayPeriod]       = useState('This Month')
  const exportRef = useRef<HTMLDivElement>(null)
  const attRef    = useRef<HTMLDivElement>(null)
  const payRef    = useRef<HTMLDivElement>(null)
  const [attOpen, setAttOpen] = useState(false)
  const [payOpen, setPayOpen] = useState(false)

  useEffect(() => {
    let cancelled = false
    const loadOverview = async () => {
      setEmployees(loadStored('flowsys-hr-employees', []))
      const localLeaves = loadLeaveRequests() as LeaveRequest[]
      try {
        const serverLeaves = await listHrRecords<LeaveRequest>('leave-requests')
        if (!cancelled) setLeaves(uniqueLeaveRequests([...serverLeaves, ...localLeaves]))
      } catch {
        if (!cancelled) setLeaves(localLeaves)
      }
      setAnnouncements(loadStored('flowsys-hr-announcements', []))
    }
    loadOverview()
    window.addEventListener('storage', loadOverview)
    window.addEventListener('focus', loadOverview)
    window.addEventListener('wiseflow:hr-data-changed', loadOverview)
    const timer = window.setInterval(loadOverview, 2500)
    return () => {
      cancelled = true
      window.removeEventListener('storage', loadOverview)
      window.removeEventListener('focus', loadOverview)
      window.removeEventListener('wiseflow:hr-data-changed', loadOverview)
      window.clearInterval(timer)
    }
  }, [])

  // Close dropdowns on outside click
  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (exportRef.current && !exportRef.current.contains(e.target as Node)) setExportOpen(false)
      if (attRef.current   && !attRef.current.contains(e.target as Node))    setAttOpen(false)
      if (payRef.current   && !payRef.current.contains(e.target as Node))    setPayOpen(false)
    }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  // â”€â”€ KPIs â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const kpis = useMemo(() => {
    const now = new Date()
    const thisMonth = (d: string) => {
      const dt = new Date(d); return dt.getMonth() === now.getMonth() && dt.getFullYear() === now.getFullYear()
    }
    const total      = employees.length
    const active     = employees.filter(e => e.employmentStatus === 'Active').length
    const onLeave    = employees.filter(e => e.employmentStatus === 'On Leave').length
    const pending    = leaveRequests.filter(l => l.status === 'Pending').length
    const leaveToday = leaveRequests.filter(l => { const d = new Date(l.startDate); return d.toDateString() === now.toDateString() && l.status === 'Approved' }).length
    const newThisMonth = employees.filter(e => thisMonth(e.dateOfJoining || e.createdAt)).length
    const payroll = employees.reduce((s, e) => s + (e.basicSalary || 0) + (e.allowances || 0) - (e.deductions || 0), 0)
    const present  = employees.filter(e => e.attendanceStatus === 'Present').length
    const late     = employees.filter(e => e.attendanceStatus === 'Late').length
    const attRate  = active > 0 ? +(((present + late) / active) * 100).toFixed(1) : 0
    return { total, active, onLeave, pending, leaveToday, newThisMonth, payroll, attRate }
  }, [employees, leaveRequests])

  // â”€â”€ Attendance donut â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const attData = useMemo(() => {
    const present  = employees.filter(e => e.attendanceStatus === 'Present').length
    const late     = employees.filter(e => e.attendanceStatus === 'Late').length
    const absent   = employees.filter(e => e.attendanceStatus === 'Absent').length
    const onLeave  = employees.filter(e => e.attendanceStatus === 'On Leave').length
    return [
      { name: 'Present',  value: present,  color: '#22c55e' },
      { name: 'Late',     value: late,     color: '#f59e0b' },
      { name: 'Absent',   value: absent,   color: '#ef4444' },
      { name: 'On Leave', value: onLeave,  color: '#3b82f6' },
    ].filter(d => d.value > 0)
  }, [employees])

  // â”€â”€ Payroll summary â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const paySummary = useMemo(() => {
    const total      = employees.reduce((s, e) => s + (e.basicSalary || 0) + (e.allowances || 0), 0)
    const deductions = employees.reduce((s, e) => s + (e.deductions || 0), 0)
    const net        = total - deductions
    const paid       = employees.filter(e => e.payrollStatus === 'Paid').length
    return { total, deductions, net, paid, total_count: employees.length }
  }, [employees])

  // â”€â”€ Upcoming birthdays â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const birthdays = useMemo(() => {
    const now = new Date()
    return employees
      .filter(e => {
        if (!e.dateOfBirth) return false
        const dob = new Date(e.dateOfBirth)
        const next = new Date(now.getFullYear(), dob.getMonth(), dob.getDate())
        if (next < now) next.setFullYear(now.getFullYear() + 1)
        const days = Math.ceil((next.getTime() - now.getTime()) / 86400000)
        return days >= 0 && days <= 30
      })
      .map(e => {
        const dob  = new Date(e.dateOfBirth!)
        const next = new Date(now.getFullYear(), dob.getMonth(), dob.getDate())
        if (next < now) next.setFullYear(now.getFullYear() + 1)
        const age  = now.getFullYear() - dob.getFullYear()
        return { ...e, nextBday: next, age }
      })
      .sort((a, b) => a.nextBday.getTime() - b.nextBday.getTime())
      .slice(0, 3)
  }, [employees])

  // â”€â”€ New employees â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const newEmployees = useMemo(() => {
    const now = new Date()
    return employees
      .filter(e => {
        const d = new Date(e.dateOfJoining || e.createdAt)
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
      })
      .slice(0, 3)
  }, [employees])

  // â”€â”€ Pending leaves â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const pendingLeaves = useMemo(() =>
    leaveRequests.filter(l => l.status === 'Pending').slice(0, 4),
  [leaveRequests])

  // â”€â”€ Recent activity â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const recentActivity = useMemo(() => {
    const acts: { icon: string; title: string; desc: string; time: string }[] = []
    leaveRequests.filter(l => l.status !== 'Pending').slice(0, 2).forEach(l => {
      acts.push({ icon: 'leave', title: `Leave request ${l.status.toLowerCase()}`, desc: `${l.employeeName} - ${l.leaveType}`, time: timeAgo(new Date(l.createdAt)) })
    })
    employees.slice(-2).forEach(e => {
      acts.push({ icon: 'employee', title: 'New employee added', desc: `${fullName(e)} joined the company`, time: timeAgo(new Date(e.createdAt)) })
    })
    return acts.slice(0, 4)
  }, [employees, leaveRequests])

  const cardStyle = { background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: '16px 18px', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }

  // â”€â”€â”€ Render â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  return (
    <main style={{ fontFamily: font, padding: '0 20px 32px', minHeight: '100vh', background: '#f8fafc' }}>

      {/* Page header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20, paddingTop: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ margin: 0, color: '#0f172a', fontSize: 28, fontWeight: 900 }}>HR Overview</h1>
          <p style={{ margin: '6px 0 0', color: '#475569', fontSize: 14 }}>Monitor your people, approvals, attendance, payroll, and HR activity in one place.</p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <Link href="/hr/employees/new" style={{ textDecoration: 'none' }}>
            <button style={{ display: 'flex', alignItems: 'center', gap: 6, border: '1px solid #e5e7eb', background: '#fff', borderRadius: 8, padding: '7px 14px', fontSize: 13, fontWeight: 500, color: '#374151', cursor: 'pointer' }}>
              <UserPlus size={14} /> Add Employee
            </button>
          </Link>
          <Link href="/hr/payroll" style={{ textDecoration: 'none' }}>
            <button style={{ display: 'flex', alignItems: 'center', gap: 6, border: '1px solid #e5e7eb', background: '#fff', borderRadius: 8, padding: '7px 14px', fontSize: 13, fontWeight: 500, color: '#374151', cursor: 'pointer' }}>
              <Wallet size={14} /> Run Payroll
            </button>
          </Link>
          <Link href="/hr/approvals" style={{ textDecoration: 'none' }}>
            <button style={{ display: 'flex', alignItems: 'center', gap: 6, border: '1px solid #e5e7eb', background: '#fff', borderRadius: 8, padding: '7px 14px', fontSize: 13, fontWeight: 500, color: '#374151', cursor: 'pointer' }}>
              <UserCheck size={14} /> Approve Requests
            </button>
          </Link>
          <div ref={exportRef} style={{ position: 'relative' }}>
            <button onClick={() => setExportOpen(v => !v)} style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#22c55e', border: 'none', borderRadius: 8, padding: '7px 14px', fontSize: 13, fontWeight: 600, color: '#fff', cursor: 'pointer' }}>
              <Download size={14} /> Export Report <ChevronDown size={12} />
            </button>
            {exportOpen && (
              <div style={{ position: 'absolute', top: 'calc(100% + 6px)', right: 0, width: 180, background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, boxShadow: '0 8px 24px rgba(0,0,0,0.1)', zIndex: 60, overflow: 'hidden' }}>
                {['Employees Report', 'Attendance Report', 'Payroll Report', 'Leave Report'].map(o => (
                  <button key={o} onClick={() => setExportOpen(false)} style={{ display: 'block', width: '100%', border: 'none', background: 'transparent', padding: '9px 14px', textAlign: 'left', fontSize: 13, color: '#374151', cursor: 'pointer', fontFamily: font }}>
                    {o}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* KPI cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, minmax(0, 1fr))', gap: 10, marginBottom: 18 }}>
        {[
          { label: 'Total Employees',    value: kpis.total,   sub: `+${kpis.newThisMonth} this month`,      subColor: '#22c55e', icon: Users,     iconBg: '#dcfce7', iconColor: '#22c55e' },
          { label: 'Active Employees',   value: kpis.active,  sub: `+${kpis.newThisMonth} this month`,      subColor: '#22c55e', icon: UserCheck, iconBg: '#dbeafe', iconColor: '#3b82f6' },
          { label: 'Employees on Leave', value: kpis.onLeave, sub: `${kpis.leaveToday} today`,            subColor: '#f59e0b', icon: LogOut,    iconBg: '#ffedd5', iconColor: '#f97316' },
          { label: 'Pending Approvals',  value: kpis.pending, sub: `${kpis.pending} leave + other`,       subColor: '#f59e0b', icon: Clock,     iconBg: '#ede9fe', iconColor: '#8b5cf6' },
          { label: 'Payroll This Month', value: money(kpis.payroll), sub: new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' }), subColor: '#22c55e', icon: Wallet, iconBg: '#d1fae5', iconColor: '#10b981', isMoney: true },
          { label: 'Attendance Rate',    value: `${kpis.attRate}%`, sub: '+3.2% vs last month',             subColor: '#22c55e', icon: Zap,       iconBg: '#fee2e2', iconColor: '#ef4444', isText: true },
        ].map(kpi => {
          const KIcon = kpi.icon
          return (
            <div key={kpi.label} style={{ ...cardStyle, padding: '14px 16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                <div style={{ fontSize: 12, color: '#6b7280', fontWeight: 500 }}>{kpi.label}</div>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: kpi.iconBg, display: 'grid', placeItems: 'center', flexShrink: 0 }}>
                  <KIcon size={15} color={kpi.iconColor} />
                </div>
              </div>
              <div style={{ fontSize: 22, fontWeight: 700, color: '#111827', letterSpacing: '-0.5px', marginBottom: 4 }}>{kpi.value}</div>
              <div style={{ fontSize: 12, color: kpi.subColor }}>{kpi.sub}</div>
            </div>
          )
        })}
      </div>

      {/* Middle row: Leave Requests | Attendance | Payroll */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 14, marginBottom: 14 }}>

        {/* Pending Leave Requests */}
        <div style={cardStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <span style={{ fontSize: 14, fontWeight: 600, color: '#111827' }}>Pending Leave Requests</span>
            <Link href="/hr/leave-requests" style={{ fontSize: 12, color: '#22c55e', fontWeight: 500, textDecoration: 'none' }}>View all</Link>
          </div>
          {pendingLeaves.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '20px 0', color: '#9ca3af', fontSize: 13 }}>No pending requests</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {pendingLeaves.map(l => {
                const ltb = leaveTypeBadge(l.leaveType)
                const employee = findLeaveEmployee(l, employees)
                const employeeName = leaveEmployeeName(l, employees)
                return (
                  <div key={l.id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <EmployeeAvatar employee={employee} name={employeeName} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 500, color: '#111827' }}>{employeeName}</div>
                      <div style={{ fontSize: 11, color: '#9ca3af' }}>{l.jobTitle || 'Employee'}</div>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{ marginBottom: 2 }}>
                        <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 99, background: ltb.bg, color: ltb.text }}>{l.leaveType}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontSize: 11, color: '#9ca3af' }}>{new Date(l.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                        <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 99, background: '#fef3c7', color: '#d97706' }}>Pending</span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
          <Link href="/hr/leave-requests" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, fontSize: 12, color: '#6b7280', fontWeight: 500, textDecoration: 'none', marginTop: 16, padding: '8px 0', borderTop: '1px solid #f3f4f6' }}>
            View all requests <ChevronRight size={13} />
          </Link>
        </div>

        {/* Attendance Summary */}
        <div style={cardStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <span style={{ fontSize: 14, fontWeight: 600, color: '#111827' }}>Attendance Summary</span>
            <div ref={attRef} style={{ position: 'relative' }}>
              <button onClick={() => setAttOpen(v => !v)} style={{ display: 'flex', alignItems: 'center', gap: 4, border: '1px solid #e5e7eb', background: '#f9fafb', borderRadius: 6, padding: '3px 10px', fontSize: 11, color: '#374151', cursor: 'pointer', fontWeight: 500 }}>
                {attPeriod} <ChevronDown size={11} />
              </button>
              {attOpen && (
                <div style={{ position: 'absolute', top: 'calc(100% + 6px)', right: 0, width: 150, background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, boxShadow: '0 6px 20px rgba(0,0,0,0.1)', zIndex: 50, overflow: 'hidden' }}>
                  {['This Week', 'This Month', 'This Quarter'].map(o => (
                    <button key={o} onClick={() => { setAttPeriod(o); setAttOpen(false) }} style={{ display: 'block', width: '100%', border: 'none', background: attPeriod === o ? '#f0fdf4' : 'transparent', padding: '8px 13px', fontSize: 12, color: attPeriod === o ? '#16a34a' : '#374151', fontWeight: attPeriod === o ? 600 : 400, cursor: 'pointer', textAlign: 'left', fontFamily: font }}>
                      {o}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ position: 'relative', width: 120, height: 120, flexShrink: 0 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={attData.length ? attData : [{ name: 'None', value: 1, color: '#e5e7eb' }]} innerRadius={36} outerRadius={56} dataKey="value" strokeWidth={0}>
                    {(attData.length ? attData : [{ color: '#e5e7eb' }]).map((d, i) => <Cell key={i} fill={d.color} />)}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', textAlign: 'center' }}>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: '#111827' }}>{kpis.attRate}%</div>
                  <div style={{ fontSize: 9, color: '#9ca3af', fontWeight: 500 }}>Attendance</div>
                </div>
              </div>
            </div>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[
                { label: 'Present',  count: employees.filter(e => e.attendanceStatus === 'Present').length,  pct: employees.length ? Math.round(employees.filter(e => e.attendanceStatus === 'Present').length / Math.max(kpis.active, 1) * 100) : 0,  color: '#22c55e' },
                { label: 'Late',     count: employees.filter(e => e.attendanceStatus === 'Late').length,     pct: employees.length ? Math.round(employees.filter(e => e.attendanceStatus === 'Late').length / Math.max(kpis.active, 1) * 100) : 0,     color: '#f59e0b' },
                { label: 'Absent',   count: employees.filter(e => e.attendanceStatus === 'Absent').length,   pct: employees.length ? Math.round(employees.filter(e => e.attendanceStatus === 'Absent').length / Math.max(kpis.active, 1) * 100) : 0,   color: '#ef4444' },
                { label: 'On Leave', count: employees.filter(e => e.attendanceStatus === 'On Leave').length, pct: employees.length ? Math.round(employees.filter(e => e.attendanceStatus === 'On Leave').length / Math.max(kpis.active, 1) * 100) : 0, color: '#3b82f6' },
              ].map(row => (
                <div key={row.label} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
                  <span style={{ width: 7, height: 7, borderRadius: '50%', background: row.color, flexShrink: 0 }} />
                  <span style={{ flex: 1, color: '#374151' }}>{row.label}</span>
                  <span style={{ fontWeight: 600, color: '#111827' }}>{row.count}</span>
                  <span style={{ color: '#9ca3af', minWidth: 36, textAlign: 'right' }}>({row.pct}%)</span>
                </div>
              ))}
            </div>
          </div>
          <Link href="/hr/attendance" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, fontSize: 12, color: '#6b7280', fontWeight: 500, textDecoration: 'none', marginTop: 14, padding: '8px 0', borderTop: '1px solid #f3f4f6' }}>
            View attendance report <ChevronRight size={13} />
          </Link>
        </div>

        {/* Payroll Summary */}
        <div style={cardStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <span style={{ fontSize: 14, fontWeight: 600, color: '#111827' }}>Payroll Summary</span>
            <div ref={payRef} style={{ position: 'relative' }}>
              <button onClick={() => setPayOpen(v => !v)} style={{ display: 'flex', alignItems: 'center', gap: 4, border: '1px solid #e5e7eb', background: '#f9fafb', borderRadius: 6, padding: '3px 10px', fontSize: 11, color: '#374151', cursor: 'pointer', fontWeight: 500 }}>
                {payPeriod} <ChevronDown size={11} />
              </button>
              {payOpen && (
                <div style={{ position: 'absolute', top: 'calc(100% + 6px)', right: 0, width: 150, background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, boxShadow: '0 6px 20px rgba(0,0,0,0.1)', zIndex: 50, overflow: 'hidden' }}>
                  {['This Month', 'Last Month', 'This Quarter', 'This Year'].map(o => (
                    <button key={o} onClick={() => { setPayPeriod(o); setPayOpen(false) }} style={{ display: 'block', width: '100%', border: 'none', background: payPeriod === o ? '#f0fdf4' : 'transparent', padding: '8px 13px', fontSize: 12, color: payPeriod === o ? '#16a34a' : '#374151', fontWeight: payPeriod === o ? 600 : 400, cursor: 'pointer', textAlign: 'left', fontFamily: font }}>
                      {o}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[
              { label: 'Total Payroll',     value: money(paySummary.total),      color: '#111827' },
              { label: 'Total Deductions',  value: `- ${money(paySummary.deductions)}`, color: '#ef4444' },
              { label: 'Net Payroll',       value: money(paySummary.net),        color: '#22c55e', bold: true },
            ].map(row => (
              <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: '1px solid #f3f4f6' }}>
                <span style={{ fontSize: 13, color: '#6b7280' }}>{row.label}</span>
                <span style={{ fontSize: 14, fontWeight: row.bold ? 700 : 500, color: row.color }}>{row.value}</span>
              </div>
            ))}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
              <span style={{ fontSize: 13, color: '#6b7280' }}>Paid Employees</span>
              <span style={{ fontSize: 13, fontWeight: 600, color: '#111827' }}>
                {paySummary.paid} / {paySummary.total_count}
                <span style={{ fontSize: 12, color: '#22c55e', marginLeft: 6 }}>
                  {paySummary.total_count > 0 ? Math.round((paySummary.paid / paySummary.total_count) * 100) : 0}%
                </span>
              </span>
            </div>
          </div>
          <Link href="/hr/payroll" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, fontSize: 12, color: '#6b7280', fontWeight: 500, textDecoration: 'none', marginTop: 14, padding: '8px 0', borderTop: '1px solid #f3f4f6' }}>
            Go to Payroll <ChevronRight size={13} />
          </Link>
        </div>
      </div>

      {/* Bottom row: New Employees | Birthdays | Announcements */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 14, marginBottom: 14 }}>

        {/* New Employees */}
        <div style={cardStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <span style={{ fontSize: 14, fontWeight: 600, color: '#111827' }}>New Employees</span>
            <Link href="/hr/employees" style={{ fontSize: 12, color: '#22c55e', fontWeight: 500, textDecoration: 'none' }}>View all</Link>
          </div>
          {newEmployees.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <Users size={28} color="#d1d5db" style={{ marginBottom: 8 }} />
              <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 4 }}>No new employees this month</div>
              <Link href="/hr/employees/new" style={{ fontSize: 12, color: '#22c55e', fontWeight: 500, textDecoration: 'none' }}>Add Employee -&gt;</Link>
            </div>
          ) : newEmployees.map(e => (
            <div key={e.id} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <EmployeeAvatar employee={e} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 500, color: '#111827' }}>{fullName(e)}</div>
                <div style={{ fontSize: 11, color: '#9ca3af' }}>{e.jobTitle}</div>
              </div>
              <div style={{ width: 82, flexShrink: 0, textAlign: 'right' }}>
                <div style={{ fontSize: 11, color: '#6b7280', lineHeight: 1.25 }}>Joined {new Date(e.dateOfJoining).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</div>
                <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginTop: 4, minWidth: 44, fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 99, background: '#d1fae5', color: '#059669' }}>New</span>
              </div>
            </div>
          ))}
          <Link href="/hr/employees" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, fontSize: 12, color: '#6b7280', fontWeight: 500, textDecoration: 'none', marginTop: 4, padding: '8px 0', borderTop: '1px solid #f3f4f6' }}>
            View all employees <ChevronRight size={13} />
          </Link>
        </div>

        {/* Upcoming Birthdays */}
        <div style={cardStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <span style={{ fontSize: 14, fontWeight: 600, color: '#111827' }}>Upcoming Birthdays</span>
            <Link href="/hr/employees" style={{ fontSize: 12, color: '#22c55e', fontWeight: 500, textDecoration: 'none' }}>View all</Link>
          </div>
          {birthdays.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <PartyPopper size={28} color="#d1d5db" style={{ marginBottom: 8 }} />
              <div style={{ fontSize: 13, color: '#6b7280' }}>No upcoming birthdays</div>
            </div>
          ) : birthdays.map(e => (
            <div key={e.id} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <EmployeeAvatar employee={e} tone="amber" />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 500, color: '#111827' }}>{fullName(e)}</div>
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <div style={{ fontSize: 12, color: '#374151', fontWeight: 500 }}>
                  {e.nextBday.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </div>
                <div style={{ fontSize: 11, color: '#9ca3af' }}>{e.age} years old</div>
              </div>
            </div>
          ))}
          <button style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, width: '100%', border: 'none', background: 'transparent', fontSize: 12, color: '#22c55e', fontWeight: 500, cursor: 'pointer', marginTop: 4, padding: '8px 0', borderTop: '1px solid #f3f4f6', fontFamily: font }}>
            <PartyPopper size={12} /> Send birthday wishes
          </button>
        </div>

        {/* HR Announcements */}
        <div style={cardStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <span style={{ fontSize: 14, fontWeight: 600, color: '#111827' }}>HR Announcements</span>
            <Link href="/hr/documents" style={{ fontSize: 12, color: '#22c55e', fontWeight: 500, textDecoration: 'none' }}>View all</Link>
          </div>
          {announcements.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <Megaphone size={28} color="#d1d5db" style={{ marginBottom: 8 }} />
              <div style={{ fontSize: 13, color: '#6b7280' }}>No announcements yet</div>
            </div>
          ) : announcements.slice(0, 3).map(a => {
            const cfg = announcementIcon(a.icon)
            const AIcon = cfg.Icon
            return (
              <div key={a.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 12 }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: cfg.bg, display: 'grid', placeItems: 'center', flexShrink: 0 }}>
                  <AIcon size={14} color={cfg.color} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#111827', marginBottom: 2 }}>{a.title}</div>
                  <div style={{ fontSize: 11, color: '#6b7280', lineHeight: 1.4 }}>{a.body}</div>
                  <div style={{ fontSize: 10, color: '#9ca3af', marginTop: 3 }}>{new Date(a.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</div>
                </div>
              </div>
            )
          })}
          <Link href="/hr/documents" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, fontSize: 12, color: '#6b7280', fontWeight: 500, textDecoration: 'none', marginTop: 4, padding: '8px 0', borderTop: '1px solid #f3f4f6' }}>
            View all announcements <ChevronRight size={13} />
          </Link>
        </div>
      </div>

      {/* Recent HR Activity */}
      <div style={cardStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: '#111827' }}>Recent HR Activity</span>
          <Link href="/hr/reports" style={{ fontSize: 12, color: '#22c55e', fontWeight: 500, textDecoration: 'none' }}>View all</Link>
        </div>
        {recentActivity.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '16px 0', color: '#9ca3af', fontSize: 13 }}>No recent activity. Add employees or manage leave requests to see activity here.</div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 14 }}>
            {recentActivity.map((a, i) => {
              const cfg = a.icon === 'leave'
                ? { bg: '#dcfce7', color: '#22c55e', Icon: UserCheck }
                : { bg: '#dbeafe', color: '#3b82f6', Icon: UserPlus }
              const AIcon = cfg.Icon
              return (
                <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: '12px 14px', border: '1px solid #f3f4f6', borderRadius: 10 }}>
                  <div style={{ width: 30, height: 30, borderRadius: 8, background: cfg.bg, display: 'grid', placeItems: 'center', flexShrink: 0 }}>
                    <AIcon size={14} color={cfg.color} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: '#111827', marginBottom: 2 }}>{a.title}</div>
                    <div style={{ fontSize: 11, color: '#6b7280' }}>{a.desc}</div>
                    <div style={{ fontSize: 10, color: '#9ca3af', marginTop: 4 }}>{a.time}</div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </main>
  )
}
