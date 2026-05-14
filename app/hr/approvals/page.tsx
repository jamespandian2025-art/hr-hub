'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  CalendarDays, CheckCircle2, Download, Filter, MoreVertical,
  Search, XCircle, Clock, Trash2,
} from 'lucide-react'
import {
  approvalState, buildRows, dateSpan, decideLeaveRequest, downloadCsv, employeeKey, formatDateTime,
  formatDay, initials, leaveRequestKey, leaveTypeTone, loadStored,
  loadLeaveRequests, normalizeStatus, saveStored, statusTone, todayInput,
  type Employee, type LeaveRequest, type LeaveRow, type LeaveStatus,
} from '../leave-requests/leaveData'

const font = "var(--font-body)"
const statusTabs: Array<LeaveStatus | 'All'> = ['Pending', 'Approved', 'Rejected', 'Cancelled', 'All']
const deletedApprovalsKey = 'flowsys-hr-deleted-approvals'
type FloatingMenuPosition = { top: number; left: number }

export default function HrApprovalsPage() {
  const router = useRouter()
  const [employees, setEmployees] = useState<Employee[]>([])
  const [requests, setRequests] = useState<LeaveRequest[]>([])
  const [statusFilter, setStatusFilter] = useState<LeaveStatus | 'All'>('Pending')
  const [departmentFilter, setDepartmentFilter] = useState('All')
  const [typeFilter, setTypeFilter] = useState('All')
  const [query, setQuery] = useState('')
  const [menuId, setMenuId] = useState<string | null>(null)
  const [menuPosition, setMenuPosition] = useState<FloatingMenuPosition>({ top: 0, left: 0 })
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const load = () => {
      setEmployees(loadStored<Employee[]>(employeeKey, []))
      setRequests(loadLeaveRequests())
    }
    load()
    window.addEventListener('storage', load)
    return () => window.removeEventListener('storage', load)
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
  const leaveTypes = useMemo(() => ['All', ...Array.from(new Set(rows.map(row => row.leaveType).filter(Boolean))).sort()], [rows])

  const filteredRows = useMemo(() => {
    const clean = query.trim().toLowerCase()
    return rows.filter(row => {
      const status = normalizeStatus(row.status)
      const matchesStatus = statusFilter === 'All' || status === statusFilter
      const matchesDepartment = departmentFilter === 'All' || row.department === departmentFilter
      const matchesType = typeFilter === 'All' || row.leaveType === typeFilter
      const matchesQuery = !clean || [row.id, row.employeeName, row.employeeCode, row.leaveType, row.reason, row.department].some(value => String(value || '').toLowerCase().includes(clean))
      return matchesStatus && matchesDepartment && matchesType && matchesQuery
    })
  }, [departmentFilter, query, rows, statusFilter, typeFilter])

  const stats = useMemo(() => {
    const today = todayInput()
    const thisMonth = new Date().toISOString().slice(0, 7)
    return {
      pending: rows.filter(row => normalizeStatus(row.status) === 'Pending').length,
      approvedToday: rows.filter(row => normalizeStatus(row.status) === 'Approved' && String(row.updatedAt || row.createdAt).slice(0, 10) === today).length,
      rejectedToday: rows.filter(row => normalizeStatus(row.status) === 'Rejected' && String(row.updatedAt || row.createdAt).slice(0, 10) === today).length,
      totalThisMonth: rows.filter(row => String(row.createdAt).slice(0, 7) === thisMonth).length,
    }
  }, [rows])

  function persist(next: LeaveRequest[]) {
    setRequests(next)
    saveStored(leaveRequestKey, next)
  }

  function updateStatus(row: LeaveRow, status: LeaveStatus) {
    const next = requests.map(request => {
      if (request.id !== row.id) return request
      if (status === 'Cancelled') return { ...request, status, approvalStep: 'complete' as const, updatedAt: new Date().toISOString() }
      if (status === 'Pending') return { ...request, status, updatedAt: new Date().toISOString() }
      return decideLeaveRequest(request, row.employee, 'hr', status)
    })
    persist(next)
    setMenuId(null)
  }

  function deleteApproval(row: LeaveRow) {
    const request = requests.find(item => item.id === row.id)
    if (!request) return
    const deleted = loadStored<Array<LeaveRequest & { deletedAt?: string }>>(deletedApprovalsKey, [])
    saveStored(deletedApprovalsKey, [{ ...request, deletedAt: new Date().toISOString() }, ...deleted.filter(item => item.id !== request.id)])
    persist(requests.filter(item => item.id !== request.id))
    setMenuId(null)
  }

  function exportRows() {
    downloadCsv('approvals.csv', [
      ['Request ID', 'Employee', 'Employee ID', 'Department', 'Leave Type', 'Duration', 'Dates', 'Reason', 'Status', 'Submitted On'],
      ...filteredRows.map(row => [row.id, row.employeeName, row.employeeCode, row.department, row.leaveType, `${row.days} day${row.days === 1 ? '' : 's'}`, dateSpan(row), row.reason || '', normalizeStatus(row.status), formatDateTime(row.createdAt)]),
    ])
  }

  return (
    <div className="hr-module-page" style={{ fontFamily: font }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, marginBottom: 18 }}>
        <div>
          <h1 style={{ margin: 0, color: '#0f172a', fontSize: 28, fontWeight: 900 }}>Approvals</h1>
          <p style={{ margin: '6px 0 0', color: '#475569', fontSize: 14 }}>Review and take action on employee requests that need approval.</p>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <label style={{ ...inputStyle, minWidth: 320, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Search size={15} color="#94a3b8" />
            <input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search by employee or request ID..." style={{ border: 'none', outline: 'none', background: 'transparent', width: '100%', font: 'inherit' }} />
          </label>
          <button onClick={() => { setDepartmentFilter('All'); setTypeFilter('All'); setStatusFilter('Pending'); setQuery('') }} style={secondaryButtonStyle}><Filter size={15} /> Filters</button>
          <button onClick={() => router.push('/hr/approvals/deleted')} style={{ ...secondaryButtonStyle, color: '#dc2626' }}><Trash2 size={15} /> Deleted Approvals</button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 16, marginBottom: 18 }}>
        <StatCard icon={Clock} label="Pending Approvals" value={stats.pending} sub="Waiting for HR" color="#f59e0b" bg="#fef3c7" />
        <StatCard icon={CheckCircle2} label="Approved Today" value={stats.approvedToday} sub="Requests" color="#16a34a" bg="#dcfce7" />
        <StatCard icon={XCircle} label="Rejected Today" value={stats.rejectedToday} sub="Requests" color="#dc2626" bg="#fee2e2" />
        <StatCard icon={CalendarDays} label="Total This Month" value={stats.totalThisMonth} sub="Requests" color="#64748b" bg="#f3f4f6" />
      </div>

      <div style={{ ...cardStyle, padding: 0 }}>
        <div style={{ display: 'flex', gap: 30, borderBottom: '1px solid #e5e7eb', padding: '0 18px' }}>
          {statusTabs.map(status => {
            const count = status === 'All' ? rows.length : rows.filter(row => normalizeStatus(row.status) === status).length
            return (
              <button key={status} onClick={() => setStatusFilter(status)} style={{ border: 'none', background: 'transparent', color: statusFilter === status ? '#16a34a' : '#334155', borderBottom: statusFilter === status ? '2px solid #22c55e' : '2px solid transparent', padding: '15px 0', fontSize: 13, fontWeight: 800, cursor: 'pointer' }}>
                {status === 'All' ? 'All Requests' : status} ({count})
              </button>
            )
          })}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto 42px', gap: 12, padding: 18, borderBottom: '1px solid #f1f5f9' }}>
          <select value={departmentFilter} onChange={event => setDepartmentFilter(event.target.value)} style={inputStyle}>{departments.map(item => <option key={item}>{item === 'All' ? 'All Departments' : item}</option>)}</select>
          <select value={typeFilter} onChange={event => setTypeFilter(event.target.value)} style={inputStyle}>{leaveTypes.map(item => <option key={item}>{item === 'All' ? 'All Leave Types' : item}</option>)}</select>
          <select value={statusFilter} onChange={event => setStatusFilter(event.target.value as LeaveStatus | 'All')} style={inputStyle}>{statusTabs.map(item => <option key={item}>{item === 'All' ? 'All Statuses' : item}</option>)}</select>
          <button onClick={exportRows} style={secondaryButtonStyle}><Download size={15} /> Export</button>
          <button onClick={() => { setDepartmentFilter('All'); setTypeFilter('All'); setStatusFilter('Pending'); setQuery('') }} style={secondaryIconButtonStyle}><Filter size={16} /></button>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 1060 }}>
            <thead>
              <tr>
                <th style={thStyle}>Request ID</th>
                <th style={thStyle}>Employee</th>
                <th style={thStyle}>Department</th>
                <th style={thStyle}>Leave Type</th>
                <th style={thStyle}>Duration</th>
                <th style={thStyle}>Dates</th>
                <th style={thStyle}>Reason</th>
                <th style={thStyle}>Submitted On</th>
                <th style={thStyle}>Status</th>
                <th style={thStyle}>Approval Step</th>
                <th style={{ ...thStyle, textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.map(row => <ApprovalRow key={row.id} row={row} menuId={menuId} setMenuId={setMenuId} menuPosition={menuPosition} setMenuPosition={setMenuPosition} menuRef={menuRef} onStatus={updateStatus} onDelete={deleteApproval} onOpen={() => router.push(`/hr/approvals/${encodeURIComponent(row.id)}`)} />)}
            </tbody>
          </table>
          {filteredRows.length === 0 && <div style={{ padding: 38, textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>No approvals found.</div>}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 18, color: '#64748b', fontSize: 12 }}>
          <span>Showing {filteredRows.length ? 1 : 0} to {filteredRows.length} of {rows.length} requests</span>
          <span style={{ color: '#16a34a', fontWeight: 800 }}>Page 1</span>
        </div>
      </div>
    </div>
  )
}

function ApprovalRow({ row, menuId, setMenuId, menuPosition, setMenuPosition, menuRef, onStatus, onDelete, onOpen }: { row: LeaveRow; menuId: string | null; setMenuId: (id: string | null) => void; menuPosition: FloatingMenuPosition; setMenuPosition: (position: FloatingMenuPosition) => void; menuRef: React.RefObject<HTMLDivElement | null>; onStatus: (row: LeaveRow, status: LeaveStatus) => void; onDelete: (row: LeaveRow) => void; onOpen: () => void }) {
  const typeTone = leaveTypeTone(row.leaveType)
  const st = statusTone(row.status)
  const isPending = normalizeStatus(row.status) === 'Pending'
  const approval = approvalState(row, row.employee)
  function toggleMenu(event: React.MouseEvent<HTMLButtonElement>) {
    if (menuId === row.id) {
      setMenuId(null)
      return
    }
    const rect = event.currentTarget.getBoundingClientRect()
    const menuWidth = 158
    const menuHeight = 238
    setMenuPosition({
      top: Math.max(12, Math.min(rect.bottom + 8, window.innerHeight - menuHeight - 12)),
      left: Math.max(12, Math.min(rect.right - menuWidth, window.innerWidth - menuWidth - 12)),
    })
    setMenuId(row.id)
  }
  return (
    <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
      <td style={tdStyle}><button onClick={onOpen} style={linkButtonStyle}>{row.id}</button></td>
      <td style={tdStyle}>
        <button onClick={onOpen} style={{ border: 'none', background: 'transparent', display: 'flex', alignItems: 'center', gap: 10, padding: 0, cursor: 'pointer', textAlign: 'left', fontFamily: font }}>
          <Avatar row={row} />
          <span><strong style={{ display: 'block', color: '#0f172a', fontSize: 12 }}>{row.employeeName}</strong><small style={{ color: '#64748b' }}>{row.jobTitle}</small></span>
        </button>
      </td>
      <td style={tdStyle}>{row.department}</td>
      <td style={tdStyle}><span style={{ ...pillStyle, background: typeTone.bg, color: typeTone.text }}>{row.leaveType}</span></td>
      <td style={tdStyle}>{row.days} Day{row.days === 1 ? '' : 's'}</td>
      <td style={tdStyle}><div>{dateSpan(row)}</div><small style={{ color: '#64748b' }}>{formatDay(row.startDate)} - {formatDay(row.endDate)}</small></td>
      <td style={tdStyle}>{row.reason || '-'}</td>
      <td style={tdStyle}>{formatDateTime(row.createdAt)}</td>
      <td style={tdStyle}><span style={{ ...pillStyle, background: st.bg, color: st.text }}>{normalizeStatus(row.status)}</span></td>
      <td style={tdStyle}>
        <span style={{ ...pillStyle, background: approval.canHrDecide ? '#dcfce7' : '#f3f4f6', color: approval.canHrDecide ? '#15803d' : '#475569' }}>{approval.label}</span>
      </td>
      <td style={{ ...tdStyle, textAlign: 'right', position: 'relative' }}>
        <div style={{ display: 'inline-flex', gap: 8, alignItems: 'center' }}>
          {isPending && approval.canHrDecide && <button onClick={() => onStatus(row, 'Approved')} style={approveButtonStyle}>Approve</button>}
          {isPending && approval.canHrDecide && <button onClick={() => onStatus(row, 'Rejected')} style={rejectButtonStyle}>Reject</button>}
          {isPending && !approval.canHrDecide && <span style={{ color: '#64748b', fontSize: 12, fontWeight: 800 }}>Waiting HR</span>}
          <button onClick={toggleMenu} style={secondaryIconButtonStyle}><MoreVertical size={15} /></button>
        </div>
        {menuId === row.id && (
          <div ref={menuRef} style={{ ...menuStyle, top: menuPosition.top, left: menuPosition.left }}>
            <button onClick={onOpen} style={menuItemStyle}>View details</button>
            {approval.canHrDecide && <button onClick={() => onStatus(row, 'Approved')} style={menuItemStyle}>Approve</button>}
            {approval.canHrDecide && <button onClick={() => onStatus(row, 'Rejected')} style={menuItemStyle}>Reject</button>}
            <button onClick={() => onStatus(row, 'Cancelled')} style={menuItemStyle}>Cancel</button>
            <button onClick={() => onDelete(row)} style={{ ...menuItemStyle, color: '#dc2626' }}>Delete approval</button>
          </div>
        )}
      </td>
    </tr>
  )
}

function Avatar({ row }: { row: LeaveRow }) {
  return <span style={{ width: 38, height: 38, borderRadius: '50%', background: row.photo ? `url(${row.photo}) center/cover` : '#dcfce7', color: '#15803d', display: 'grid', placeItems: 'center', fontSize: 11, fontWeight: 900, flexShrink: 0 }}>{row.photo ? '' : initials(row.employeeName)}</span>
}

function StatCard({ icon: Icon, label, value, sub, color, bg }: { icon: React.ComponentType<{ size?: number; color?: string }>; label: string; value: number; sub: string; color: string; bg: string }) {
  return <div style={{ ...cardStyle, display: 'flex', alignItems: 'center', gap: 18 }}><span style={{ width: 58, height: 58, borderRadius: '50%', background: bg, display: 'grid', placeItems: 'center' }}><Icon size={25} color={color} /></span><span><div style={{ color: '#475569', fontSize: 12 }}>{label}</div><strong style={{ display: 'block', color: '#0f172a', fontSize: 24, marginTop: 6 }}>{value}</strong><div style={{ color: '#64748b', fontSize: 12, marginTop: 8 }}>{sub}</div></span></div>
}

const cardStyle = { background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, boxShadow: '0 8px 24px rgba(15,23,42,0.04)', padding: 18 } as const
const inputStyle = { width: '100%', minHeight: 40, border: '1px solid #e5e7eb', borderRadius: 8, background: '#fff', color: '#0f172a', padding: '0 12px', fontSize: 12, fontFamily: font } as const
const thStyle = { padding: '13px 16px', textAlign: 'left' as const, color: '#475569', fontSize: 11, fontWeight: 800, background: '#fbfdff', whiteSpace: 'nowrap' as const }
const tdStyle = { padding: '13px 16px', fontSize: 12, color: '#0f172a', verticalAlign: 'middle' as const }
const pillStyle = { display: 'inline-flex', alignItems: 'center', borderRadius: 999, padding: '3px 8px', fontSize: 11, fontWeight: 800 } as const
const secondaryButtonStyle = { minHeight: 40, border: '1px solid #e5e7eb', borderRadius: 8, background: '#fff', color: '#0f172a', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '0 15px', fontSize: 12, fontWeight: 900, cursor: 'pointer', fontFamily: font } as const
const secondaryIconButtonStyle = { width: 36, height: 36, border: '1px solid #e5e7eb', borderRadius: 8, background: '#fff', color: '#0f172a', display: 'inline-grid', placeItems: 'center', cursor: 'pointer' } as const
const approveButtonStyle = { minHeight: 34, border: '1px solid #16a34a', borderRadius: 7, background: '#fff', color: '#15803d', padding: '0 12px', fontSize: 12, fontWeight: 800, cursor: 'pointer', fontFamily: font } as const
const rejectButtonStyle = { minHeight: 34, border: '1px solid #fca5a5', borderRadius: 7, background: '#fff', color: '#dc2626', padding: '0 12px', fontSize: 12, fontWeight: 800, cursor: 'pointer', fontFamily: font } as const
const linkButtonStyle = { border: 'none', background: 'transparent', color: '#16a34a', fontSize: 12, fontWeight: 900, cursor: 'pointer', fontFamily: font, padding: 0 } as const
const menuStyle = { position: 'fixed' as const, width: 158, background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, boxShadow: '0 18px 50px rgba(15,23,42,0.18)', padding: 6, zIndex: 260 }
const menuItemStyle = { width: '100%', border: 'none', background: 'transparent', padding: '9px 10px', textAlign: 'left' as const, borderRadius: 7, color: '#334155', fontSize: 12, cursor: 'pointer', fontFamily: font }
