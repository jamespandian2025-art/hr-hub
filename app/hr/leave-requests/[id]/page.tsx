'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
  ArrowLeft, Briefcase, Calendar, ChevronLeft, ChevronRight, Download, Mail,
  MapPin, MoreHorizontal, Pencil, Phone, Search, Users, XCircle,
} from 'lucide-react'
import {
  approvalState, buildRows, dateSpan, decideLeaveRequest, downloadCsv, employeeKey, formatDateTime, formatDay,
  formatLongDate, fullName, initials, leaveRequestKey, leaveTypeTone,
  loadLeaveRequests, loadStored, normalizeStatus, saveStored, statusTone,
  type Employee, type LeaveRequest, type LeaveRow, type LeaveStatus,
} from '../leaveData'
import { listHrRecords, updateHrRecord } from '@/lib/hrms/client'

const font = "var(--font-body)"
const detailTabs = ['Overview', 'Attendance', 'Leave Requests', 'Leave Balance', 'Calendar', 'Documents', 'Activity'] as const
type DetailTab = typeof detailTabs[number]
const syncErrorStyle = { marginBottom: 16, padding: '10px 12px', border: '1px solid #fecaca', borderRadius: 10, background: '#fef2f2', color: '#b91c1c', fontSize: 13, fontWeight: 800 } as const
const leaveEntitlements = [
  { type: 'Annual Leave', total: 20, color: '#16a34a' },
  { type: 'Vacation Leave', total: 20, color: '#16a34a' },
  { type: 'Sick Leave', total: 12, color: '#f59e0b' },
  { type: 'Personal Leave', total: 6, color: '#8b5cf6' },
  { type: 'Maternity Leave', total: 105, color: '#ec4899' },
  { type: 'Paternity Leave', total: 7, color: '#7c3aed' },
  { type: 'Emergency Leave', total: 5, color: '#ef4444' },
  { type: 'Unpaid Leave', total: 10, color: '#64748b' },
]

function lookupKey(value?: string) {
  return String(value || '').toLowerCase().replace(/[^a-z0-9]/g, '')
}

function nameParts(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length <= 1) return { firstName: parts[0] || 'Employee', lastName: '' }
  return { firstName: parts.slice(0, -1).join(' '), lastName: parts[parts.length - 1] }
}

function uniqueRequests(rows: LeaveRequest[]) {
  const map = new Map<string, LeaveRequest>()
  rows.forEach((row, index) => {
    const key = row.id || `leave-${index}`
    map.set(key, { ...map.get(key), ...row })
  })
  return Array.from(map.values())
}

function employeeFromLeaveRow(row?: LeaveRow): Employee | null {
  if (!row) return null
  const parsedName = nameParts(row.employeeName || row.employeeId || 'Employee')
  return {
    id: row.employeeId,
    employeeId: row.employeeCode || row.employeeId,
    firstName: parsedName.firstName,
    lastName: parsedName.lastName,
    email: '',
    phone: '',
    employeeType: 'Employee',
    employmentStatus: 'Active',
    dateOfJoining: '',
    department: row.department && row.department !== '-' ? row.department : '',
    team: '',
    jobTitle: row.jobTitle && row.jobTitle !== '-' ? row.jobTitle : '',
    createdAt: row.createdAt,
    updatedAt: row.updatedAt || row.createdAt,
  }
}

export default function EmployeeLeaveRequestsPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const [employees, setEmployees] = useState<Employee[]>([])
  const [requests, setRequests] = useState<LeaveRequest[]>([])
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<LeaveStatus | 'All'>('All')
  const [typeFilter, setTypeFilter] = useState('All')
  const [menuId, setMenuId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<DetailTab>('Leave Requests')
  const [calendarDate, setCalendarDate] = useState(() => new Date())
  const [syncError, setSyncError] = useState('')
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      setEmployees(loadStored<Employee[]>(employeeKey, []))
      const localRequests = loadLeaveRequests()
      try {
        const serverRequests = await listHrRecords<LeaveRequest>('leave-requests', {
          'x-hr-role': 'HR',
          'x-hr-user-name': 'HR Leave Request Detail',
        })
        const merged = uniqueRequests([...serverRequests, ...localRequests])
        if (!cancelled) setRequests(current => merged.length > 0 || current.length === 0 ? merged : current)
      } catch {
        if (!cancelled) setRequests(current => localRequests.length > 0 || current.length === 0 ? localRequests : current)
      }
    }
    void load()
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

  const employee = useMemo(() => {
    const id = decodeURIComponent(String(params.id || ''))
    const cleanId = lookupKey(id)
    return employees.find(item => lookupKey(item.id) === cleanId || lookupKey(item.employeeId) === cleanId) || null
  }, [employees, params.id])

  const employeeRows = useMemo(() => {
    const id = decodeURIComponent(String(params.id || ''))
    const cleanId = lookupKey(id)
    return buildRows(employees, requests)
      .filter(row => lookupKey(row.employee?.id) === cleanId || lookupKey(row.employeeCode) === cleanId || lookupKey(row.employeeId) === cleanId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  }, [employees, params.id, requests])

  const profileEmployee = useMemo(() => employee || employeeFromLeaveRow(employeeRows[0]), [employee, employeeRows])

  const visibleRows = useMemo(() => {
    const clean = query.trim().toLowerCase()
    return employeeRows.filter(row => {
      const matchesStatus = statusFilter === 'All' || normalizeStatus(row.status) === statusFilter
      const matchesType = typeFilter === 'All' || row.leaveType === typeFilter
      const matchesQuery = !clean || [row.id, row.leaveType, row.reason, row.status].some(value => String(value || '').toLowerCase().includes(clean))
      return matchesStatus && matchesType && matchesQuery
    })
  }, [employeeRows, query, statusFilter, typeFilter])

  const leaveTypes = useMemo(() => ['All', ...Array.from(new Set(employeeRows.map(row => row.leaveType)))], [employeeRows])
  const stats = useMemo(() => {
    const total = employeeRows.length
    const approved = employeeRows.filter(row => normalizeStatus(row.status) === 'Approved').length
    const pending = employeeRows.filter(row => normalizeStatus(row.status) === 'Pending').length
    const rejected = employeeRows.filter(row => normalizeStatus(row.status) === 'Rejected').length
    const cancelled = employeeRows.filter(row => normalizeStatus(row.status) === 'Cancelled').length
    return { total, approved, pending, rejected, cancelled }
  }, [employeeRows])

  const approvedLeaveTotals = useMemo(() => {
    const totals = new Map<string, number>()
    employeeRows.filter(row => normalizeStatus(row.status) === 'Approved').forEach(row => {
      totals.set(row.leaveType, (totals.get(row.leaveType) || 0) + Number(row.days || 0))
    })
    return Array.from(totals.entries()).map(([type, used]) => ({ type, used, tone: leaveTypeTone(type) }))
  }, [employeeRows])
  const leaveBalances = useMemo(() => {
    return leaveEntitlements.map(item => {
      const used = employeeRows
        .filter(row => normalizeStatus(row.status) === 'Approved' && row.leaveType.toLowerCase() === item.type.toLowerCase())
        .reduce((sum, row) => sum + Number(row.days || 0), 0)
      return { ...item, used, remaining: Math.max(0, item.total - used) }
    }).filter(item => item.used > 0 || ['Annual Leave', 'Vacation Leave', 'Sick Leave', 'Personal Leave'].includes(item.type))
  }, [employeeRows])
  const approvedCalendarRows = employeeRows.filter(row => normalizeStatus(row.status) === 'Approved')
  const calendarDays = useMemo(() => buildCalendarDays(calendarDate), [calendarDate])
  const calendarMonthLabel = calendarDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
  const calendarMonthRows = useMemo(() => {
    return approvedCalendarRows
      .filter(row => rowIntersectsMonth(row, calendarDate))
      .sort((a, b) => dateValue(a.startDate) - dateValue(b.startDate))
  }, [approvedCalendarRows, calendarDate])
  const recentActivityRows = employeeRows.slice(0, 6)

  function persist(next: LeaveRequest[]) {
    setRequests(next)
    saveStored(leaveRequestKey, next)
  }

  async function updateStatus(row: LeaveRow, status: LeaveStatus) {
    setSyncError('')
    const next = requests.map(request => {
      if (request.id !== row.id) return request
      if (status === 'Cancelled') return { ...request, status, approvalStep: 'complete' as const, updatedAt: new Date().toISOString() }
      if (status === 'Pending') return { ...request, status, updatedAt: new Date().toISOString() }
      return decideLeaveRequest(request, row.employee, 'hr', status)
    })
    const changed = next.find(request => request.id === row.id)
    if (changed) {
      try {
        await updateHrRecord<LeaveRequest>('leave-requests', changed.id, changed as unknown as Record<string, unknown>)
      } catch (error) {
        console.error('Could not sync leave request decision', error)
        setSyncError(error instanceof Error
          ? `Could not update this leave request in HR records. ${error.message}`
          : 'Could not update this leave request in HR records. Please try again.')
        setMenuId(null)
        return
      }
    }
    persist(next)
    setMenuId(null)
  }

  function exportRows() {
    downloadCsv(`${profileEmployee ? fullName(profileEmployee) || profileEmployee.employeeId : 'employee'}-leave-requests.csv`, [
      ['Request ID', 'Leave Type', 'Duration', 'Dates', 'Reason', 'Status', 'Applied On'],
      ...visibleRows.map(row => [row.id, row.leaveType, `${row.days} day${row.days === 1 ? '' : 's'}`, dateSpan(row), row.reason || '', normalizeStatus(row.status), formatDateTime(row.createdAt)]),
    ])
  }

  if (!profileEmployee && requests.length > 0) {
    return (
      <div className="hr-module-page" style={{ fontFamily: font }}>
        <button onClick={() => router.push('/hr/leave-requests')} style={secondaryButtonStyle}><ArrowLeft size={15} /> Back to leave requests</button>
        <div style={{ ...cardStyle, marginTop: 18, textAlign: 'center', color: '#64748b' }}>Employee not found.</div>
      </div>
    )
  }

  const name = fullName(profileEmployee || undefined) || employeeRows[0]?.employeeName || '-'
  const status = profileEmployee?.employmentStatus || 'Active'

  return (
    <div className="hr-module-page" style={{ fontFamily: font }}>
      <div style={{ color: '#64748b', fontSize: 12, marginBottom: 18 }}>HR Hub&nbsp;&nbsp;&gt;&nbsp;&nbsp;Leave Requests&nbsp;&nbsp;&gt;&nbsp;&nbsp;{name}</div>
      {syncError && <div style={syncErrorStyle}>{syncError}</div>}
      <div style={{ ...cardStyle, padding: 24, marginBottom: 18 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 420px', gap: 26 }}>
          <div>
            <button onClick={() => router.push('/hr/leave-requests')} style={{ ...secondaryIconButtonStyle, marginBottom: 16 }}><ArrowLeft size={16} /></button>
            <div style={{ display: 'flex', alignItems: 'center', gap: 22 }}>
              <Avatar employee={profileEmployee || undefined} name={name} size={104} />
              <div style={{ minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                  <h1 style={{ margin: 0, color: '#0f172a', fontSize: 26 }}>{name}</h1>
                  <span style={{ ...pillStyle, background: '#dcfce7', color: '#15803d' }}>{status}</span>
                </div>
                <div style={{ marginTop: 6, color: '#475569', fontSize: 13 }}>{profileEmployee?.jobTitle || '-'} <span style={{ color: '#cbd5e1' }}>â€¢</span> <strong style={{ color: '#4f46e5' }}>{profileEmployee?.employeeId || profileEmployee?.id || '-'}</strong></div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '10px 28px', marginTop: 18, color: '#334155', fontSize: 12 }}>
                  <Info icon={Briefcase} text={profileEmployee?.department || '-'} />
                  <Info icon={Users} text={profileEmployee?.team || '-'} />
                  <Info icon={Mail} text={profileEmployee?.email || '-'} />
                  <Info icon={Phone} text={profileEmployee?.phone || '-'} />
                  <Info icon={MapPin} text={profileEmployee?.workLocation || profileEmployee?.address || '-'} />
                </div>
              </div>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18, alignContent: 'start' }}>
            <ProfileFact label="Employment Type" value={profileEmployee?.employeeType || '-'} />
            <ProfileFact label="Date of Joining" value={formatLongDate(profileEmployee?.dateOfJoining)} />
            <ProfileFact label="Reporting Manager" value={profileEmployee?.reportsTo || '-'} />
            <ProfileFact label="Work Schedule" value={profileEmployee?.shift || '-'} />
            <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button onClick={() => router.push(`/hr/employees/${profileEmployee?.id}`)} style={secondaryButtonStyle}><Pencil size={14} /> Edit</button>
              <button onClick={exportRows} style={secondaryButtonStyle}><Download size={14} /> Export</button>
            </div>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 30, borderBottom: '1px solid #e5e7eb', marginBottom: 18, overflowX: 'auto' }}>
        {detailTabs.map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)} style={{ border: 'none', background: 'transparent', color: activeTab === tab ? '#16a34a' : '#334155', borderBottom: activeTab === tab ? '2px solid #22c55e' : '2px solid transparent', padding: '12px 0', fontSize: 13, fontWeight: 800, cursor: 'pointer', whiteSpace: 'nowrap' }}>{tab}</button>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 310px', gap: 18 }}>
        <div style={{ minWidth: 0 }}>
          {activeTab === 'Overview' && (
            <div style={{ display: 'grid', gap: 16 }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, minmax(0, 1fr))', gap: 10 }}>
                <MiniStat label="Total Requests" value={stats.total} color="#3b82f6" />
                <MiniStat label="Approved" value={stats.approved} color="#16a34a" />
                <MiniStat label="Pending" value={stats.pending} color="#f59e0b" />
                <MiniStat label="Rejected" value={stats.rejected} color="#ef4444" />
                <MiniStat label="Cancelled" value={stats.cancelled} color="#64748b" />
              </div>
              <div style={cardStyle}>
                <SectionTitle title="Leave Overview" />
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 12 }}>
                  <InfoCard label="Most Recent Request" value={employeeRows[0]?.leaveType || '-'} sub={employeeRows[0] ? `${normalizeStatus(employeeRows[0].status)} - ${dateSpan(employeeRows[0])}` : 'No requests yet'} />
                  <InfoCard label="Approved Leave Used" value={`${approvedLeaveTotals.reduce((sum, item) => sum + item.used, 0)} days`} sub={`${stats.approved} approved request${stats.approved === 1 ? '' : 's'}`} />
                  <InfoCard label="Pending Review" value={`${stats.pending}`} sub="Requests waiting for HR action" />
                  <InfoCard label="Next Approved Leave" value={approvedCalendarRows[0] ? dateSpan(approvedCalendarRows[0]) : '-'} sub={approvedCalendarRows[0]?.leaveType || 'No approved leave scheduled'} />
                </div>
              </div>
            </div>
          )}

          {activeTab === 'Attendance' && (
            <div style={cardStyle}>
              <SectionTitle title="Attendance" />
              <div style={{ color: '#475569', fontSize: 13, lineHeight: 1.6, marginBottom: 16 }}>Attendance records are managed in the attendance module.</div>
              <button onClick={() => router.push(`/hr/attendance/${profileEmployee?.id}`)} style={secondaryButtonStyle}>Open Attendance Records</button>
            </div>
          )}

          {activeTab === 'Leave Requests' && (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, minmax(0, 1fr))', gap: 10, marginBottom: 16 }}>
                <MiniStat label="Total Requests" value={stats.total} color="#3b82f6" />
                <MiniStat label="Approved" value={stats.approved} color="#16a34a" />
                <MiniStat label="Pending" value={stats.pending} color="#f59e0b" />
                <MiniStat label="Rejected" value={stats.rejected} color="#ef4444" />
                <MiniStat label="Cancelled" value={stats.cancelled} color="#64748b" />
              </div>
              <div style={cardStyle}>
                <div style={{ display: 'grid', gridTemplateColumns: '180px 160px 1fr 42px', gap: 12, marginBottom: 16 }}>
                  <select value={typeFilter} onChange={event => setTypeFilter(event.target.value)} style={inputStyle}>{leaveTypes.map(type => <option key={type}>{type}</option>)}</select>
                  <select value={statusFilter} onChange={event => setStatusFilter(event.target.value as LeaveStatus | 'All')} style={inputStyle}>{['All', 'Pending', 'Approved', 'Rejected', 'Cancelled'].map(type => <option key={type}>{type}</option>)}</select>
                  <label style={{ ...inputStyle, display: 'flex', alignItems: 'center', gap: 8 }}><Search size={14} color="#94a3b8" /><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search requests..." style={{ border: 'none', outline: 'none', background: 'transparent', width: '100%', font: 'inherit' }} /></label>
                  <button onClick={() => { setTypeFilter('All'); setStatusFilter('All'); setQuery('') }} style={secondaryIconButtonStyle}><XCircle size={16} /></button>
                </div>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 860 }}>
                    <thead>
                      <tr>
                        <th style={thStyle}>Request ID</th>
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
                      {visibleRows.map(row => <RequestRow key={row.id} row={row} menuId={menuId} setMenuId={setMenuId} menuRef={menuRef} onStatus={updateStatus} />)}
                    </tbody>
                  </table>
                  {visibleRows.length === 0 && <div style={{ textAlign: 'center', padding: 36, color: '#94a3b8' }}>No leave requests for this employee.</div>}
                </div>
                <div style={{ paddingTop: 14, color: '#475569', fontSize: 12 }}>Showing {visibleRows.length ? 1 : 0} to {visibleRows.length} of {employeeRows.length} requests</div>
              </div>
            </>
          )}

          {activeTab === 'Leave Balance' && (
            <div style={cardStyle}>
              <SectionTitle title="Leave Balance" />
              <div style={{ display: 'grid', gap: 14 }}>
                {leaveBalances.map(item => (
                  <div key={item.type} style={{ border: '1px solid #eef2f7', borderRadius: 10, padding: 14 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginBottom: 8, fontSize: 13 }}>
                      <strong style={{ color: '#0f172a' }}>{item.type}</strong>
                      <span style={{ color: '#64748b' }}>{item.remaining} / {item.total} days remaining</span>
                    </div>
                    <div style={{ height: 8, borderRadius: 99, background: '#e5e7eb', overflow: 'hidden' }}><div style={{ width: `${Math.min(100, (item.remaining / item.total) * 100)}%`, height: '100%', background: item.color }} /></div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 7, fontSize: 12, color: '#64748b' }}><span>Used {item.used} day{item.used === 1 ? '' : 's'}</span><span>{item.remaining <= 0 ? 'Depleted' : 'Available'}</span></div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'Calendar' && (
            <div style={{ ...cardStyle, padding: 0, overflow: 'hidden' }}>
              <div style={calendarHeaderStyle}>
                <div>
                  <SectionTitle title="Leave Calendar" />
                  <div style={{ color: '#64748b', fontSize: 12, marginTop: -10 }}>Approved employee leaves shown by month.</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                  <button onClick={() => setCalendarDate(new Date())} style={calendarTodayButtonStyle}>Today</button>
                  <button onClick={() => setCalendarDate(date => addMonths(date, -1))} style={secondaryIconButtonStyle} aria-label="Previous month"><ChevronLeft size={16} /></button>
                  <button onClick={() => setCalendarDate(date => addMonths(date, 1))} style={secondaryIconButtonStyle} aria-label="Next month"><ChevronRight size={16} /></button>
                  <strong style={{ minWidth: 150, color: '#0f172a', fontSize: 18 }}>{calendarMonthLabel}</strong>
                  <span style={calendarViewPillStyle}>Month</span>
                </div>
              </div>
              <div style={calendarWeekHeaderStyle}>
                {weekDays.map(day => <span key={day}>{day}</span>)}
              </div>
              <div style={calendarGridStyle}>
                {calendarDays.map(day => {
                  const inMonth = day.getMonth() === calendarDate.getMonth()
                  const isToday = dateKey(day) === dateKey(new Date())
                  const dayEvents = approvedCalendarRows.filter(row => rowCoversDate(row, day))
                  return (
                    <div key={dateKey(day)} style={{ ...calendarCellStyle, background: inMonth ? '#fff' : '#f8fafc' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', minHeight: 26 }}>
                        <span style={isToday ? calendarTodayDateStyle : { ...calendarDateStyle, color: inMonth ? '#334155' : '#cbd5e1' }}>{day.getDate()}</span>
                      </div>
                      <div style={{ display: 'grid', gap: 4 }}>
                        {dayEvents.slice(0, 3).map(row => <CalendarEventChip key={`${row.id}-${dateKey(day)}`} row={row} />)}
                        {dayEvents.length > 3 && <span style={calendarMoreStyle}>+{dayEvents.length - 3} more</span>}
                      </div>
                    </div>
                  )
                })}
              </div>
              <div style={calendarAgendaStyle}>
                <strong style={{ color: '#0f172a', fontSize: 13 }}>This month</strong>
                <div style={{ display: 'grid', gap: 8 }}>
                  {calendarMonthRows.length ? calendarMonthRows.map(row => <CalendarAgendaItem key={row.id} row={row} />) : <EmptyMiniText>No approved leave dates for {calendarMonthLabel}.</EmptyMiniText>}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'Documents' && (
            <div style={cardStyle}>
              <SectionTitle title="Documents" />
              <div style={{ color: '#475569', fontSize: 13, lineHeight: 1.6, marginBottom: 16 }}>Employee documents are stored in the employee profile and HR documents module.</div>
              <button onClick={() => router.push(`/hr/employees/${profileEmployee?.id}`)} style={secondaryButtonStyle}>Open Employee Profile</button>
            </div>
          )}

          {activeTab === 'Activity' && (
            <div style={cardStyle}>
              <SectionTitle title="Activity" />
              <div style={{ display: 'grid', gap: 10 }}>
                {recentActivityRows.length ? recentActivityRows.map(row => <ActivityItem key={row.id} row={row} />) : <EmptyMiniText>No leave activity yet.</EmptyMiniText>}
              </div>
            </div>
          )}
        </div>

        <aside style={{ display: 'grid', gap: 14, alignContent: 'start' }}>
          <div style={cardStyle}>
            <SectionTitle title="Approved Leave Used" />
            <div style={{ display: 'grid', gap: 18 }}>{approvedLeaveTotals.map(row => <BalanceBar key={row.type} label={row.type} used={row.used} color={row.tone.color} />)}{approvedLeaveTotals.length === 0 && <EmptyMiniText>No approved leave data yet.</EmptyMiniText>}</div>
          </div>
          <div style={cardStyle}>
            <SectionTitle title="Quick Actions" />
            <div style={{ display: 'grid', gap: 8 }}>
              <button onClick={() => router.push('/hr/leave-requests')} style={quickButtonStyle}>New Leave Request</button>
              <button onClick={() => router.push('/hr/documents')} style={quickButtonStyle}>View Leave Policy</button>
              <button onClick={() => router.push('/hr/attendance')} style={quickButtonStyle}>Holiday Calendar</button>
            </div>
          </div>
          <div style={cardStyle}>
            <SectionTitle title="Manager" />
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <span style={{ width: 38, height: 38, borderRadius: '50%', background: '#dcfce7', color: '#15803d', display: 'grid', placeItems: 'center', fontWeight: 900 }}>{initials(profileEmployee?.reportsTo || 'HR')}</span>
              <div><strong style={{ color: '#0f172a', fontSize: 13 }}>{profileEmployee?.reportsTo || '-'}</strong><div style={{ color: '#64748b', fontSize: 12 }}>Manager</div></div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
}

function RequestRow({ row, menuId, setMenuId, menuRef, onStatus }: { row: LeaveRow; menuId: string | null; setMenuId: (id: string | null) => void; menuRef: React.RefObject<HTMLDivElement | null>; onStatus: (row: LeaveRow, status: LeaveStatus) => void }) {
  const typeTone = leaveTypeTone(row.leaveType)
  const st = statusTone(row.status)
  const approval = approvalState(row, row.employee)
  return (
    <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
      <td style={tdStyle}><strong style={{ color: '#4f46e5' }}>{row.id.replace(/^leave_/, 'LR-')}</strong></td>
      <td style={tdStyle}><span style={{ ...pillStyle, background: typeTone.bg, color: typeTone.text }}>{row.leaveType}</span></td>
      <td style={tdStyle}>{row.days} Day{row.days === 1 ? '' : 's'}</td>
      <td style={tdStyle}><div>{dateSpan(row)}</div><small style={{ color: '#64748b' }}>{formatDay(row.startDate)} - {formatDay(row.endDate)}</small></td>
      <td style={tdStyle}>{row.reason || '-'}</td>
      <td style={tdStyle}><span style={{ ...pillStyle, background: st.bg, color: st.text }}>{normalizeStatus(row.status)}</span></td>
      <td style={tdStyle}>{formatDateTime(row.createdAt)}</td>
      <td style={{ ...tdStyle, textAlign: 'right', position: 'relative' }}>
        <button onClick={() => setMenuId(menuId === row.id ? null : row.id)} style={secondaryIconButtonStyle}><MoreHorizontal size={16} /></button>
        {menuId === row.id && (
          <div ref={menuRef} style={menuStyle}>
            {approval.canHrDecide && <button onClick={() => onStatus(row, 'Approved')} style={menuItemStyle}>Approve</button>}
            {approval.canHrDecide && <button onClick={() => onStatus(row, 'Rejected')} style={menuItemStyle}>Reject</button>}
            <button onClick={() => onStatus(row, 'Cancelled')} style={menuItemStyle}>Cancel request</button>
          </div>
        )}
      </td>
    </tr>
  )
}

function Avatar({ employee, name, size }: { employee?: Employee; name: string; size: number }) {
  return <span style={{ width: size, height: size, borderRadius: '50%', background: employee?.photo ? `url(${employee.photo}) center/cover` : '#dcfce7', color: '#15803d', display: 'grid', placeItems: 'center', fontSize: size > 60 ? 26 : 12, fontWeight: 900, flexShrink: 0 }}>{employee?.photo ? '' : initials(name)}</span>
}

function Info({ icon: Icon, text }: { icon: React.ComponentType<{ size?: number; color?: string }>; text: string }) {
  return <span style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}><Icon size={14} color="#64748b" /><span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{text}</span></span>
}

function ProfileFact({ label, value }: { label: string; value: string }) {
  return <div><div style={{ color: '#64748b', fontSize: 12, marginBottom: 7 }}>{label}</div><strong style={{ color: '#0f172a', fontSize: 13 }}>{value}</strong></div>
}

function MiniStat({ label, value, color }: { label: string; value: number; color: string }) {
  return <div style={{ ...cardStyle, display: 'flex', alignItems: 'center', gap: 12 }}><span style={{ width: 40, height: 40, borderRadius: '50%', background: `${color}18`, color, display: 'grid', placeItems: 'center' }}><Calendar size={19} color={color} /></span><span><div style={{ color: '#64748b', fontSize: 12 }}>{label}</div><strong style={{ display: 'block', color: '#0f172a', fontSize: 20, marginTop: 4 }}>{value}</strong></span></div>
}

function InfoCard({ label, value, sub }: { label: string; value: string; sub: string }) {
  return <div style={{ border: '1px solid #eef2f7', borderRadius: 10, padding: 14 }}><div style={{ color: '#64748b', fontSize: 12, marginBottom: 8 }}>{label}</div><strong style={{ display: 'block', color: '#0f172a', fontSize: 16 }}>{value}</strong><small style={{ display: 'block', color: '#64748b', marginTop: 6 }}>{sub}</small></div>
}

function CalendarEventChip({ row }: { row: LeaveRow }) {
  const tone = leaveTypeTone(row.leaveType)
  return <span title={`${row.leaveType} - ${dateSpan(row)}`} style={{ display: 'block', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', borderRadius: 5, padding: '4px 6px', background: tone.bg, color: tone.text, borderLeft: `3px solid ${tone.color}`, fontSize: 11, fontWeight: 900 }}>{row.leaveType}</span>
}

function CalendarAgendaItem({ row }: { row: LeaveRow }) {
  const tone = leaveTypeTone(row.leaveType)
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '78px 1fr', gap: 12, alignItems: 'center', border: '1px solid #eef2f7', borderRadius: 10, padding: 11, background: '#fff' }}>
      <span style={{ color: tone.text, background: tone.bg, borderRadius: 8, padding: '8px 10px', textAlign: 'center', fontSize: 12, fontWeight: 900 }}>{formatDay(row.startDate)}</span>
      <span style={{ minWidth: 0 }}>
        <strong style={{ display: 'block', color: '#0f172a', fontSize: 13 }}>{row.leaveType}</strong>
        <small style={{ color: '#64748b' }}>{dateSpan(row)} - {row.days} day{row.days === 1 ? '' : 's'}</small>
      </span>
    </div>
  )
}

function ActivityItem({ row }: { row: LeaveRow }) {
  const st = statusTone(row.status)
  return <div style={{ display: 'grid', gridTemplateColumns: '10px 1fr', gap: 10, border: '1px solid #eef2f7', borderRadius: 10, padding: 12 }}><span style={{ width: 8, height: 8, borderRadius: '50%', background: st.dot, marginTop: 5 }} /><span><strong style={{ display: 'block', color: '#0f172a', fontSize: 13 }}>{row.leaveType} {normalizeStatus(row.status).toLowerCase()}</strong><small style={{ color: '#64748b' }}>{dateSpan(row)} - {formatDateTime(row.updatedAt || row.createdAt)}</small></span></div>
}

function SectionTitle({ title }: { title: string }) {
  return <strong style={{ display: 'block', color: '#0f172a', fontSize: 14, marginBottom: 18 }}>{title}</strong>
}

function BalanceBar({ label, used, color }: { label: string; used: number; color: string }) {
  return <div><div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#334155', marginBottom: 8 }}><span>{label}</span><strong>{used} Day{used === 1 ? '' : 's'}</strong></div><div style={{ height: 5, borderRadius: 99, background: '#e5e7eb', overflow: 'hidden' }}><div style={{ width: used > 0 ? '100%' : 0, height: '100%', background: color }} /></div></div>
}

function EmptyMiniText({ children }: { children: React.ReactNode }) {
  return <div style={{ color: '#94a3b8', fontSize: 12, lineHeight: 1.5 }}>{children}</div>
}

function addMonths(date: Date, months: number) {
  return new Date(date.getFullYear(), date.getMonth() + months, 1)
}

function parseDateOnly(value?: string) {
  if (!value) return null
  const [year, month, day] = String(value).slice(0, 10).split('-').map(Number)
  if (!year || !month || !day) return null
  return new Date(year, month - 1, day)
}

function dateValue(value?: string) {
  return parseDateOnly(value)?.getTime() || 0
}

function dateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function buildCalendarDays(date: Date) {
  const first = new Date(date.getFullYear(), date.getMonth(), 1)
  const start = new Date(first)
  start.setDate(first.getDate() - first.getDay())
  return Array.from({ length: 42 }, (_, index) => new Date(start.getFullYear(), start.getMonth(), start.getDate() + index))
}

function rowCoversDate(row: LeaveRow, date: Date) {
  const start = parseDateOnly(row.startDate)
  const end = parseDateOnly(row.endDate)
  if (!start || !end) return false
  const current = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime()
  return current >= start.getTime() && current <= end.getTime()
}

function rowIntersectsMonth(row: LeaveRow, date: Date) {
  const start = parseDateOnly(row.startDate)
  const end = parseDateOnly(row.endDate)
  if (!start || !end) return false
  const monthStart = new Date(date.getFullYear(), date.getMonth(), 1).getTime()
  const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0).getTime()
  return start.getTime() <= monthEnd && end.getTime() >= monthStart
}

const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const cardStyle = { background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, boxShadow: '0 8px 24px rgba(15,23,42,0.04)', padding: 18 } as const
const calendarHeaderStyle = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, padding: 18, borderBottom: '1px solid #eef2f7', flexWrap: 'wrap' as const }
const calendarTodayButtonStyle = { minHeight: 34, border: '1px solid #e5e7eb', borderRadius: 8, background: '#fff', color: '#0f172a', padding: '0 14px', fontSize: 12, fontWeight: 900, cursor: 'pointer', fontFamily: font } as const
const calendarViewPillStyle = { height: 30, borderRadius: 999, padding: '0 12px', background: '#dcfce7', color: '#15803d', display: 'inline-flex', alignItems: 'center', fontSize: 12, fontWeight: 900 } as const
const calendarWeekHeaderStyle = { display: 'grid', gridTemplateColumns: 'repeat(7, minmax(112px, 1fr))', background: '#f8fafc', borderBottom: '1px solid #e5e7eb', color: '#64748b', fontSize: 11, fontWeight: 900, textTransform: 'uppercase' as const, letterSpacing: 0 }
const calendarGridStyle = { display: 'grid', gridTemplateColumns: 'repeat(7, minmax(112px, 1fr))', overflowX: 'auto' as const }
const calendarCellStyle = { minHeight: 116, borderRight: '1px solid #eef2f7', borderBottom: '1px solid #eef2f7', padding: 8, display: 'flex', flexDirection: 'column' as const, gap: 6 }
const calendarDateStyle = { width: 26, height: 26, borderRadius: '50%', display: 'inline-grid', placeItems: 'center', color: '#334155', fontSize: 12, fontWeight: 800 } as const
const calendarTodayDateStyle = { ...calendarDateStyle, background: '#16a34a', color: '#fff' } as const
const calendarMoreStyle = { color: '#64748b', fontSize: 11, fontWeight: 800, padding: '2px 4px' } as const
const calendarAgendaStyle = { display: 'grid', gap: 10, padding: 18, background: '#fbfdff' } as const
const inputStyle = { width: '100%', minHeight: 38, border: '1px solid #e5e7eb', borderRadius: 8, background: '#fff', color: '#0f172a', padding: '0 12px', fontSize: 12, fontFamily: font } as const
const thStyle = { padding: '12px 18px', textAlign: 'left' as const, color: '#475569', fontSize: 11, fontWeight: 800, background: '#fbfdff', whiteSpace: 'nowrap' as const }
const tdStyle = { padding: '13px 18px', fontSize: 12, color: '#0f172a', verticalAlign: 'middle' as const }
const pillStyle = { display: 'inline-flex', alignItems: 'center', borderRadius: 999, padding: '3px 8px', fontSize: 11, fontWeight: 800 } as const
const secondaryButtonStyle = { minHeight: 38, border: '1px solid #e5e7eb', borderRadius: 8, background: '#fff', color: '#0f172a', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '0 15px', fontSize: 12, fontWeight: 900, cursor: 'pointer', fontFamily: font } as const
const secondaryIconButtonStyle = { width: 34, height: 34, border: '1px solid #e5e7eb', borderRadius: 8, background: '#fff', color: '#0f172a', display: 'inline-grid', placeItems: 'center', cursor: 'pointer' } as const
const quickButtonStyle = { minHeight: 36, border: '1px solid #e5e7eb', borderRadius: 8, background: '#fff', color: '#0f172a', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontSize: 12, fontWeight: 800, cursor: 'pointer', fontFamily: font } as const
const menuStyle = { position: 'absolute' as const, top: 42, right: 18, width: 150, background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, boxShadow: '0 18px 50px rgba(15,23,42,0.18)', padding: 6, zIndex: 20 }
const menuItemStyle = { width: '100%', border: 'none', background: 'transparent', padding: '9px 10px', textAlign: 'left' as const, borderRadius: 7, color: '#334155', fontSize: 12, cursor: 'pointer', fontFamily: font }
