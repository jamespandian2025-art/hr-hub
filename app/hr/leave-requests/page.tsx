'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  CalendarDays, CheckCircle2, Download, Filter, MoreHorizontal,
  Plane, Plus, Search, XCircle,
} from 'lucide-react'
import { Cell, Pie, PieChart, ResponsiveContainer } from 'recharts'
import {
  approvalState, buildRows, dateSpan, daysBetweenInclusive, decideLeaveRequest, downloadCsv, employeeKey,
  formatDateTime, formatDay, initials, leaveRequestKey, leaveTypeTone,
  loadLeaveRequests, loadStored, monthRangeLabel, normalizeStatus, saveStored, statusTone,
  todayInput, type Employee, type LeaveRequest, type LeaveRow, type LeaveStatus,
} from './leaveData'
import { createHrRecord, listHrRecords, updateHrRecord } from '@/lib/hrms/client'

const font = "var(--font-body)"
const statuses: Array<LeaveStatus | 'All'> = ['All', 'Pending', 'Approved', 'Rejected', 'Cancelled']
type FloatingMenuPosition = { top: number; left: number }

type FormState = {
  employeeId: string
  leaveType: string
  startDate: string
  endDate: string
  reason: string
}

const defaultForm = (): FormState => ({
  employeeId: '',
  leaveType: '',
  startDate: todayInput(),
  endDate: todayInput(),
  reason: '',
})

function uniqueRequests(rows: LeaveRequest[]) {
  const map = new Map<string, LeaveRequest>()
  rows.forEach((row, index) => {
    const key = row.id || `leave-${index}`
    map.set(key, { ...map.get(key), ...row })
  })
  return Array.from(map.values())
}

export default function HrLeaveRequestsPage() {
  const router = useRouter()
  const [employees, setEmployees] = useState<Employee[]>([])
  const [requests, setRequests] = useState<LeaveRequest[]>([])
  const [statusFilter, setStatusFilter] = useState<LeaveStatus | 'All'>('All')
  const [departmentFilter, setDepartmentFilter] = useState('All')
  const [typeFilter, setTypeFilter] = useState('All')
  const [query, setQuery] = useState('')
  const [menuId, setMenuId] = useState<string | null>(null)
  const [menuPosition, setMenuPosition] = useState<FloatingMenuPosition>({ top: 0, left: 0 })
  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState<FormState>(defaultForm)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      setEmployees(loadStored<Employee[]>(employeeKey, []))
      const localRequests = loadLeaveRequests()
      try {
        const serverRequests = await listHrRecords<LeaveRequest>('leave-requests', {
          'x-hr-role': 'HR',
          'x-hr-user-name': 'HR Leave Requests',
        })
        const nextRequests = uniqueRequests([...serverRequests, ...localRequests])
        if (!cancelled) setRequests(current => nextRequests.length > 0 || current.length === 0 ? nextRequests : current)
      } catch {
        if (!cancelled) setRequests(current => localRequests.length > 0 || current.length === 0 ? localRequests : current)
      }
    }
    load()
    window.addEventListener('storage', load)
    window.addEventListener('focus', load)
    window.addEventListener('wiseflow:hr-data-changed', load)
    const timer = window.setInterval(load, 2500)
    return () => {
      cancelled = true
      window.removeEventListener('storage', load)
      window.removeEventListener('focus', load)
      window.removeEventListener('wiseflow:hr-data-changed', load)
      window.clearInterval(timer)
    }
  }, [])

  useEffect(() => {
    const close = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) setMenuId(null)
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [])

  const rows = useMemo(() => buildRows(employees, requests).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()), [employees, requests])
  const departments = useMemo(() => ['All', ...Array.from(new Set(rows.map(row => row.department).filter(Boolean)))], [rows])
  const leaveTypes = useMemo(() => Array.from(new Set(rows.map(row => row.leaveType).filter(Boolean))).sort(), [rows])

  const filteredRows = useMemo(() => {
    const cleanQuery = query.trim().toLowerCase()
    return rows.filter(row => {
      const matchesStatus = statusFilter === 'All' || normalizeStatus(row.status) === statusFilter
      const matchesDepartment = departmentFilter === 'All' || row.department === departmentFilter
      const matchesType = typeFilter === 'All' || row.leaveType === typeFilter
      const matchesQuery = !cleanQuery || [row.employeeName, row.employeeCode, row.leaveType, row.reason, row.department].some(value => String(value || '').toLowerCase().includes(cleanQuery))
      return matchesStatus && matchesDepartment && matchesType && matchesQuery
    })
  }, [departmentFilter, query, rows, statusFilter, typeFilter])

  const stats = useMemo(() => {
    const total = rows.length
    const pending = rows.filter(row => normalizeStatus(row.status) === 'Pending').length
    const approved = rows.filter(row => normalizeStatus(row.status) === 'Approved').length
    const rejected = rows.filter(row => normalizeStatus(row.status) === 'Rejected').length
    const today = todayInput()
    const onLeaveToday = rows.filter(row => normalizeStatus(row.status) === 'Approved' && row.startDate <= today && row.endDate >= today).length
    const nextWeek = new Date()
    nextWeek.setDate(nextWeek.getDate() + 7)
    const upcoming = rows.filter(row => normalizeStatus(row.status) === 'Approved' && new Date(`${row.startDate}T00:00:00`) <= nextWeek && row.startDate >= today).length
    return { total, pending, approved, rejected, onLeaveToday, upcoming }
  }, [rows])

  const approvedLeaveTotals = useMemo(() => {
    const totals = new Map<string, number>()
    rows.filter(row => normalizeStatus(row.status) === 'Approved').forEach(row => {
      totals.set(row.leaveType, (totals.get(row.leaveType) || 0) + Number(row.days || 0))
    })
    return Array.from(totals.entries()).map(([type, used]) => ({ type, used, tone: leaveTypeTone(type) }))
  }, [rows])

  const distribution = useMemo(() => {
    const counts = new Map<string, number>()
    rows.forEach(row => counts.set(row.leaveType, (counts.get(row.leaveType) || 0) + 1))
    return Array.from(counts.entries()).map(([name, value]) => ({ name, value, color: leaveTypeTone(name).color }))
  }, [rows])

  function persist(next: LeaveRequest[]) {
    setRequests(next)
    saveStored(leaveRequestKey, next)
    window.dispatchEvent(new Event('storage'))
    window.dispatchEvent(new Event('wiseflow:hr-data-changed'))
  }

  async function updateStatus(row: LeaveRow, status: LeaveStatus) {
    const next = requests.map(request => {
      if (request.id !== row.id) return request
      if (status === 'Cancelled') return { ...request, status, approvalStep: 'complete' as const, updatedAt: new Date().toISOString() }
      if (status === 'Pending') return { ...request, status, updatedAt: new Date().toISOString() }
      return decideLeaveRequest(request, row.employee, 'hr', status)
    })
    persist(next)
    const changed = next.find(request => request.id === row.id)
    if (changed) {
      try {
        await updateHrRecord<LeaveRequest>('leave-requests', changed.id, changed as unknown as Record<string, unknown>)
      } catch (error) {
        console.error('Could not sync leave request decision', error)
      }
    }
    setMenuId(null)
  }

  async function submitRequest() {
    const employee = employees.find(item => item.id === form.employeeId)
    if (!employee) return
    const next: LeaveRequest = {
      id: `leave_${Date.now()}`,
      employeeId: employee.id,
      employeeName: [employee.firstName, employee.middleName, employee.lastName].filter(Boolean).join(' '),
      jobTitle: employee.jobTitle || '',
      leaveType: form.leaveType,
      startDate: form.startDate,
      endDate: form.endDate,
      days: daysBetweenInclusive(form.startDate, form.endDate),
      reason: form.reason,
      status: 'Pending',
      approvalStep: 'hr',
      managerApprovalStatus: 'Skipped',
      hrApprovalStatus: 'Pending',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    persist([next, ...requests])
    try {
      await createHrRecord<LeaveRequest>('leave-requests', next as unknown as Record<string, unknown>)
    } catch (error) {
      console.error('Could not sync HR-created leave request', error)
    }
    setForm(defaultForm())
    setModalOpen(false)
  }

  function exportRows() {
    downloadCsv('leave-requests.csv', [
      ['Employee', 'Employee ID', 'Department', 'Leave Type', 'Duration', 'Dates', 'Status', 'Applied On', 'Reason'],
      ...filteredRows.map(row => [row.employeeName, row.employeeCode, row.department, row.leaveType, `${row.days} day${row.days === 1 ? '' : 's'}`, dateSpan(row), normalizeStatus(row.status), formatDateTime(row.createdAt), row.reason || '']),
    ])
  }

  return (
    <div className="hr-module-page" style={{ fontFamily: font }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, marginBottom: 18 }}>
        <div>
          <div style={{ fontSize: 12, color: '#64748b', marginBottom: 20 }}>HR Hub&nbsp;&nbsp;&gt;&nbsp;&nbsp;Leave Requests</div>
          <h1 style={{ margin: 0, color: '#0f172a', fontSize: 28, fontWeight: 900 }}>Leave Requests</h1>
          <p style={{ margin: '6px 0 0', color: '#475569', fontSize: 14 }}>Manage and review employee leave requests, balances, and approval status.</p>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button onClick={exportRows} style={secondaryButtonStyle}><Download size={15} /> Export Report</button>
          <button onClick={() => setModalOpen(true)} style={primaryButtonStyle}><Plus size={15} /> New Leave Request</button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, minmax(0, 1fr))', gap: 12, marginBottom: 18 }}>
        <StatCard icon={CalendarDays} label="Total Requests" value={stats.total} sub={monthRangeLabel()} tone="#3b82f6" bg="#dbeafe" />
        <StatCard icon={CalendarDays} label="Pending" value={stats.pending} sub={`${percent(stats.pending, stats.total)}% of total`} tone="#f59e0b" bg="#fef3c7" />
        <StatCard icon={CheckCircle2} label="Approved" value={stats.approved} sub={`${percent(stats.approved, stats.total)}% of total`} tone="#16a34a" bg="#dcfce7" />
        <StatCard icon={XCircle} label="Rejected" value={stats.rejected} sub={`${percent(stats.rejected, stats.total)}% of total`} tone="#ef4444" bg="#fee2e2" />
        <StatCard icon={Plane} label="On Leave Today" value={stats.onLeaveToday} sub="Approved today" tone="#8b5cf6" bg="#ede9fe" />
        <StatCard icon={CalendarDays} label="Upcoming Leaves" value={stats.upcoming} sub="Approved next 7 days" tone="#2563eb" bg="#dbeafe" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 304px', gap: 18 }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ display: 'flex', gap: 28, borderBottom: '1px solid #e5e7eb', marginBottom: 0 }}>
            {statuses.map(status => (
              <button key={status} onClick={() => setStatusFilter(status)} style={{ border: 'none', background: 'transparent', color: statusFilter === status ? '#16a34a' : '#334155', borderBottom: statusFilter === status ? '2px solid #22c55e' : '2px solid transparent', padding: '12px 0', fontSize: 13, fontWeight: 800, cursor: 'pointer' }}>
                {status === 'All' ? 'All Requests' : status}
              </button>
            ))}
          </div>

          <div style={{ ...cardStyle, borderTopLeftRadius: 0, borderTopRightRadius: 0 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '180px 1fr 1fr 1fr 220px 42px', gap: 12, padding: '14px 18px', borderBottom: '1px solid #f1f5f9' }}>
              <div style={{ ...inputStyle, display: 'flex', alignItems: 'center' }}>{monthRangeLabel()}</div>
              <select value={departmentFilter} onChange={event => setDepartmentFilter(event.target.value)} style={inputStyle}>{departments.map(item => <option key={item}>{item}</option>)}</select>
              <select value={typeFilter} onChange={event => setTypeFilter(event.target.value)} style={inputStyle}><option>All</option>{leaveTypes.map(item => <option key={item}>{item}</option>)}</select>
              <select value={statusFilter} onChange={event => setStatusFilter(event.target.value as LeaveStatus | 'All')} style={inputStyle}>{statuses.map(item => <option key={item}>{item}</option>)}</select>
              <label style={{ ...inputStyle, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Search size={14} color="#94a3b8" />
                <input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search by employee..." style={{ border: 'none', outline: 'none', background: 'transparent', width: '100%', font: 'inherit' }} />
              </label>
              <button onClick={() => { setDepartmentFilter('All'); setTypeFilter('All'); setStatusFilter('All'); setQuery('') }} style={{ ...secondaryIconButtonStyle, width: 42 }}><Filter size={16} /></button>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 920 }}>
                <thead>
                  <tr style={{ color: '#475569', fontSize: 11 }}>
                    <th style={thStyle}>Employee</th>
                    <th style={thStyle}>Leave Type</th>
                    <th style={thStyle}>Duration</th>
                    <th style={thStyle}>Dates</th>
                    <th style={thStyle}>Reason</th>
                    <th style={thStyle}>Status</th>
                    <th style={thStyle}>Applied On</th>
                    <th style={{ ...thStyle, textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.map(row => <LeaveTableRow key={row.id} row={row} menuId={menuId} setMenuId={setMenuId} menuPosition={menuPosition} setMenuPosition={setMenuPosition} menuRef={menuRef} onStatus={updateStatus} onOpen={() => router.push(`/hr/leave-requests/${encodeURIComponent(row.employee?.id || row.employeeId)}`)} />)}
                </tbody>
              </table>
              {filteredRows.length === 0 && <div style={{ padding: 36, textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>No leave requests found.</div>}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px', color: '#475569', fontSize: 12 }}>
              <span>Showing 1 to {filteredRows.length} of {rows.length} results</span>
              <div style={{ display: 'flex', gap: 8 }}><button style={pagerStyle}>â€¹</button><button style={{ ...pagerStyle, background: '#16a34a', color: '#fff', borderColor: '#16a34a' }}>1</button><button style={pagerStyle}>2</button><button style={pagerStyle}>â€º</button></div>
            </div>
          </div>
        </div>

        <aside style={{ display: 'grid', gap: 14, alignContent: 'start' }}>
          <div style={cardStyle}>
            <SectionTitle title="Approved Leave Used" action="View All" />
            <div style={{ display: 'grid', gap: 18 }}>
              {approvedLeaveTotals.map(row => <BalanceBar key={row.type} label={row.type} used={row.used} color={row.tone.color} />)}
              {approvedLeaveTotals.length === 0 && <EmptyMiniText>No approved leave data yet.</EmptyMiniText>}
            </div>
          </div>
          <div style={cardStyle}>
            <SectionTitle title="Leave Type Distribution" />
            <div style={{ display: 'grid', gridTemplateColumns: '110px 1fr', gap: 14, alignItems: 'center' }}>
              <div style={{ width: 110, height: 110 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart><Pie data={distribution.length ? distribution : [{ name: 'None', value: 1, color: '#e5e7eb' }]} dataKey="value" innerRadius={34} outerRadius={52} paddingAngle={2}>{(distribution.length ? distribution : [{ color: '#e5e7eb' }]).map((entry, index) => <Cell key={index} fill={entry.color} />)}</Pie></PieChart>
                </ResponsiveContainer>
              </div>
              <div style={{ display: 'grid', gap: 8 }}>{distribution.slice(0, 5).map(item => <LegendRow key={item.name} item={item} total={rows.length} />)}</div>
            </div>
          </div>
          <div style={cardStyle}>
            <SectionTitle title="Quick Actions" />
            <div style={{ display: 'grid', gap: 8 }}>
              <button onClick={() => setModalOpen(true)} style={quickButtonStyle}><Plus size={15} /> New Leave Request</button>
              <button onClick={() => router.push('/hr/documents')} style={quickButtonStyle}>Leave Policy</button>
              <button onClick={() => router.push('/hr/attendance')} style={quickButtonStyle}>Holiday Calendar</button>
            </div>
          </div>
        </aside>
      </div>

      {modalOpen && (
        <div style={modalBackdropStyle}>
          <div style={modalStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '18px 20px', borderBottom: '1px solid #e5e7eb' }}>
              <strong>New Leave Request</strong>
              <button onClick={() => setModalOpen(false)} style={plainIconButtonStyle}><XCircle size={18} /></button>
            </div>
            <div style={{ padding: 20, display: 'grid', gap: 14 }}>
              <label style={fieldLabelStyle}>Employee<select value={form.employeeId} onChange={event => setForm(prev => ({ ...prev, employeeId: event.target.value }))} style={inputStyle}><option value="">Select employee</option>{employees.map(employee => <option key={employee.id} value={employee.id}>{[employee.firstName, employee.middleName, employee.lastName].filter(Boolean).join(' ')}</option>)}</select></label>
              <label style={fieldLabelStyle}>Leave Type<input list="leave-request-types" value={form.leaveType} onChange={event => setForm(prev => ({ ...prev, leaveType: event.target.value }))} placeholder="Enter leave type" style={inputStyle} /><datalist id="leave-request-types">{leaveTypes.map(item => <option key={item} value={item} />)}</datalist></label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <label style={fieldLabelStyle}>Start Date<input type="date" value={form.startDate} onChange={event => setForm(prev => ({ ...prev, startDate: event.target.value, endDate: prev.endDate < event.target.value ? event.target.value : prev.endDate }))} style={inputStyle} /></label>
                <label style={fieldLabelStyle}>End Date<input type="date" value={form.endDate} min={form.startDate} onChange={event => setForm(prev => ({ ...prev, endDate: event.target.value }))} style={inputStyle} /></label>
              </div>
              <label style={fieldLabelStyle}>Reason<textarea value={form.reason} onChange={event => setForm(prev => ({ ...prev, reason: event.target.value }))} placeholder="Reason for leave" style={{ ...inputStyle, height: 86, resize: 'vertical', paddingTop: 10 }} /></label>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, padding: 20, borderTop: '1px solid #e5e7eb' }}>
              <button onClick={() => setModalOpen(false)} style={secondaryButtonStyle}>Cancel</button>
              <button onClick={submitRequest} disabled={!form.employeeId || !form.leaveType.trim()} style={{ ...primaryButtonStyle, opacity: form.employeeId && form.leaveType.trim() ? 1 : 0.55 }}>Create Request</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function LeaveTableRow({ row, menuId, setMenuId, menuPosition, setMenuPosition, menuRef, onStatus, onOpen }: { row: LeaveRow; menuId: string | null; setMenuId: (id: string | null) => void; menuPosition: FloatingMenuPosition; setMenuPosition: (position: FloatingMenuPosition) => void; menuRef: React.RefObject<HTMLDivElement | null>; onStatus: (row: LeaveRow, status: LeaveStatus) => void; onOpen: () => void }) {
  const typeTone = leaveTypeTone(row.leaveType)
  const st = statusTone(row.status)
  const approval = approvalState(row, row.employee)
  function toggleMenu(event: React.MouseEvent<HTMLButtonElement>) {
    if (menuId === row.id) {
      setMenuId(null)
      return
    }
    const rect = event.currentTarget.getBoundingClientRect()
    const menuWidth = 178
    const menuHeight = 202
    setMenuPosition({
      top: Math.max(12, Math.min(rect.bottom + 8, window.innerHeight - menuHeight - 12)),
      left: Math.max(12, Math.min(rect.right - menuWidth, window.innerWidth - menuWidth - 12)),
    })
    setMenuId(row.id)
  }
  return (
    <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
      <td style={tdStyle}>
        <button onClick={onOpen} style={{ border: 'none', background: 'transparent', display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', padding: 0, textAlign: 'left', fontFamily: font }}>
          <Avatar row={row} />
          <span><strong style={{ display: 'block', color: '#0f172a', fontSize: 12 }}>{row.employeeName}</strong><small style={{ color: '#64748b' }}>{row.employeeCode}</small></span>
        </button>
      </td>
      <td style={tdStyle}><span style={{ ...pillStyle, background: typeTone.bg, color: typeTone.text }}>{row.leaveType}</span></td>
      <td style={tdStyle}>{row.days} Day{row.days === 1 ? '' : 's'}</td>
      <td style={tdStyle}><div>{dateSpan(row)}</div><small style={{ color: '#64748b' }}>{formatDay(row.startDate)} - {formatDay(row.endDate)}</small></td>
      <td style={tdStyle}>{row.reason || '-'}</td>
      <td style={tdStyle}><span style={{ ...pillStyle, background: st.bg, color: st.text }}>{normalizeStatus(row.status)}</span></td>
      <td style={tdStyle}>{formatDateTime(row.createdAt)}</td>
      <td style={{ ...tdStyle, textAlign: 'right', position: 'relative' }}>
        <button onClick={toggleMenu} style={secondaryIconButtonStyle}><MoreHorizontal size={16} /></button>
        {menuId === row.id && (
          <div ref={menuRef} style={{ ...menuStyle, top: menuPosition.top, left: menuPosition.left }}>
            <button onClick={onOpen} style={menuItemStyle}>View employee leaves</button>
            {approval.canHrDecide && <button onClick={() => onStatus(row, 'Approved')} style={menuItemStyle}>Approve</button>}
            {approval.canHrDecide && <button onClick={() => onStatus(row, 'Rejected')} style={menuItemStyle}>Reject</button>}
            <button onClick={() => onStatus(row, 'Cancelled')} style={menuItemStyle}>Cancel request</button>
          </div>
        )}
      </td>
    </tr>
  )
}

function Avatar({ row, size = 34 }: { row: LeaveRow; size?: number }) {
  return <span style={{ width: size, height: size, borderRadius: '50%', background: row.photo ? `url(${row.photo}) center/cover` : '#dcfce7', color: '#15803d', display: 'grid', placeItems: 'center', fontSize: 11, fontWeight: 900, flexShrink: 0 }}>{row.photo ? '' : initials(row.employeeName)}</span>
}

function StatCard({ icon: Icon, label, value, sub, tone, bg }: { icon: React.ComponentType<{ size?: number; color?: string }>; label: string; value: number; sub: string; tone: string; bg: string }) {
  return <div style={{ ...cardStyle, display: 'flex', alignItems: 'center', gap: 14 }}><div style={{ width: 48, height: 48, borderRadius: 16, background: bg, color: tone, display: 'grid', placeItems: 'center' }}><Icon size={22} color={tone} /></div><div><div style={{ fontSize: 12, color: '#64748b' }}>{label}</div><div style={{ fontSize: 24, fontWeight: 900, color: '#0f172a', marginTop: 4 }}>{value}</div><div style={{ fontSize: 11, color: sub.includes('View') ? '#16a34a' : '#64748b', marginTop: 6 }}>{sub}</div></div></div>
}

function SectionTitle({ title, action }: { title: string; action?: string }) {
  return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}><strong style={{ color: '#0f172a', fontSize: 14 }}>{title}</strong>{action && <button style={{ border: 'none', background: 'transparent', color: '#16a34a', fontSize: 12, fontWeight: 800 }}>{action}</button>}</div>
}

function BalanceBar({ label, used, color }: { label: string; used: number; color: string }) {
  return <div><div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#334155', marginBottom: 8 }}><span>{label}</span><strong>{used} Day{used === 1 ? '' : 's'}</strong></div><div style={{ height: 5, borderRadius: 99, background: '#e5e7eb', overflow: 'hidden' }}><div style={{ width: used > 0 ? '100%' : 0, height: '100%', background: color }} /></div></div>
}

function LegendRow({ item, total }: { item: { name: string; value: number; color: string }; total: number }) {
  return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, fontSize: 11 }}><span style={{ display: 'flex', alignItems: 'center', gap: 7, minWidth: 0 }}><span style={{ width: 7, height: 7, borderRadius: '50%', background: item.color }} /><span style={{ color: '#334155', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.name}</span></span><strong>{item.value} ({percent(item.value, total)}%)</strong></div>
}

function EmptyMiniText({ children }: { children: React.ReactNode }) {
  return <div style={{ color: '#94a3b8', fontSize: 12, lineHeight: 1.5 }}>{children}</div>
}

function percent(value: number, total: number) {
  return total ? Math.round((value / total) * 100) : 0
}

const cardStyle = { background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, boxShadow: '0 8px 24px rgba(15,23,42,0.04)', padding: 18 } as const
const inputStyle = { width: '100%', minHeight: 38, border: '1px solid #e5e7eb', borderRadius: 8, background: '#fff', color: '#0f172a', padding: '0 12px', fontSize: 12, fontFamily: font } as const
const thStyle = { padding: '12px 18px', textAlign: 'left' as const, fontWeight: 800, background: '#fbfdff', whiteSpace: 'nowrap' as const }
const tdStyle = { padding: '13px 18px', fontSize: 12, color: '#0f172a', verticalAlign: 'middle' as const }
const pillStyle = { display: 'inline-flex', alignItems: 'center', borderRadius: 999, padding: '3px 8px', fontSize: 11, fontWeight: 800 } as const
const primaryButtonStyle = { minHeight: 38, border: 'none', borderRadius: 8, background: '#16a34a', color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '0 15px', fontSize: 12, fontWeight: 900, cursor: 'pointer', fontFamily: font } as const
const secondaryButtonStyle = { minHeight: 38, border: '1px solid #e5e7eb', borderRadius: 8, background: '#fff', color: '#0f172a', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '0 15px', fontSize: 12, fontWeight: 900, cursor: 'pointer', fontFamily: font } as const
const secondaryIconButtonStyle = { width: 34, height: 34, border: '1px solid #e5e7eb', borderRadius: 8, background: '#fff', color: '#0f172a', display: 'inline-grid', placeItems: 'center', cursor: 'pointer' } as const
const pagerStyle = { width: 32, height: 32, border: '1px solid #e5e7eb', borderRadius: 8, background: '#fff', color: '#475569', cursor: 'pointer' } as const
const quickButtonStyle = { minHeight: 36, border: '1px solid #e5e7eb', borderRadius: 8, background: '#fff', color: '#0f172a', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontSize: 12, fontWeight: 800, cursor: 'pointer', fontFamily: font } as const
const menuStyle = { position: 'fixed' as const, width: 178, background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, boxShadow: '0 18px 50px rgba(15,23,42,0.18)', padding: 6, zIndex: 260 }
const menuItemStyle = { width: '100%', border: 'none', background: 'transparent', padding: '9px 10px', textAlign: 'left' as const, borderRadius: 7, color: '#334155', fontSize: 12, cursor: 'pointer', fontFamily: font }
const modalBackdropStyle = { position: 'fixed' as const, inset: 0, background: 'rgba(15,23,42,0.45)', display: 'grid', placeItems: 'center', zIndex: 160, padding: 20 }
const modalStyle = { width: 'min(560px, 100%)', background: '#fff', borderRadius: 12, boxShadow: '0 28px 90px rgba(15,23,42,0.25)', overflow: 'hidden' }
const plainIconButtonStyle = { border: 'none', background: 'transparent', color: '#64748b', cursor: 'pointer', display: 'grid', placeItems: 'center' } as const
const fieldLabelStyle = { display: 'grid', gap: 7, color: '#334155', fontSize: 12, fontWeight: 800 } as const
