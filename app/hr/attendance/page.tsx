'use client'

import { ChangeEvent, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import {
  CalendarDays, CheckCircle2, Clock3, Download, FileText, Filter,
  MoreHorizontal, Plane, Search, Upload, Users, Wifi, XCircle,
} from 'lucide-react'
import {
  AttendanceRecord, AttendanceRow, AttendanceStatus, attendanceHours, attendanceKey,
  buildRows, downloadText, employeeKey, Employee, formatClock, formatDate, fullName,
  initials, loadStored, monthRangeLabel, normalizeStatus, saveStored, statusTone,
  todayInput, upsertRecord,
} from './attendanceData'
import { secureId } from '@/lib/security/random'

const font = "var(--font-body)"
const card = { background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, boxShadow: '0 1px 4px rgba(15,23,42,0.05)' }
const inputStyle = { border: '1px solid #e5e7eb', borderRadius: 8, padding: '10px 12px', outline: 'none', fontFamily: font, fontSize: 13, color: '#111827', background: '#fff' }
const statuses: AttendanceStatus[] = ['Present', 'Late', 'Absent', 'On Leave', 'Rest day']
const tabs = ['Attendance Records', 'Daily Summary', 'Clock In/Out Activity', 'Exceptions']

type ImportedAttendanceRow = Partial<AttendanceRecord>
type FloatingMenuPosition = { top: number; left: number }

export default function HrAttendancePage() {
  const importRef = useRef<HTMLInputElement>(null)
  const [employees, setEmployees] = useState<Employee[]>([])
  const [records, setRecords] = useState<AttendanceRecord[]>([])
  const [query, setQuery] = useState('')
  const [department, setDepartment] = useState('All Departments')
  const [status, setStatus] = useState('All Status')
  const [activeTab, setActiveTab] = useState(tabs[0])
  const [markOpen, setMarkOpen] = useState(false)
  const [policyOpen, setPolicyOpen] = useState(false)
  const [rowMenuId, setRowMenuId] = useState<string | null>(null)
  const [rowMenuPosition, setRowMenuPosition] = useState<FloatingMenuPosition>({ top: 0, left: 0 })
  const [editingRecord, setEditingRecord] = useState<AttendanceRow | null>(null)
  const [deletingRecord, setDeletingRecord] = useState<AttendanceRow | null>(null)
  const [notice, setNotice] = useState('')
  const [draft, setDraft] = useState({
    employeeId: '',
    date: todayInput(),
    status: 'Present' as AttendanceStatus,
    clockIn: '09:00',
    clockOut: '18:00',
    breakMinutes: '60',
    workLocation: 'Office' as 'Office' | 'Remote' | 'Hybrid' | 'Field',
    attendanceRemarks: '',
    notes: '',
  })

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setEmployees(loadStored<Employee[]>(employeeKey, []))
      setRecords(loadStored<AttendanceRecord[]>(attendanceKey, []))
    }, 0)
    return () => window.clearTimeout(timer)
  }, [])

  const allRows = useMemo(() => buildRows(employees, records), [employees, records])
  const todayRows = useMemo(() => allRows.filter(row => row.date === todayInput()), [allRows])
  const monthRows = useMemo(() => {
    const now = new Date()
    return allRows.filter(row => {
      const date = new Date(`${row.date}T00:00:00`)
      return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth()
    }).sort((a, b) => b.date.localeCompare(a.date) || a.employeeName.localeCompare(b.employeeName))
  }, [allRows])

  const departments = useMemo(() => ['All Departments', ...Array.from(new Set(employees.map(employee => employee.department || 'Unassigned')))], [employees])

  const filteredRows = useMemo(() => {
    return monthRows.filter(row => {
      const haystack = `${row.employeeName} ${row.employeeCode} ${row.department} ${row.position}`.toLowerCase()
      return haystack.includes(query.toLowerCase())
        && (department === 'All Departments' || row.department === department)
        && (status === 'All Status' || row.status === status)
    })
  }, [department, monthRows, query, status])

  const stats = useMemo(() => {
    const total = employees.length
    const present = todayRows.filter(row => row.status === 'Present').length
    const late = todayRows.filter(row => row.status === 'Late').length
    const absent = todayRows.filter(row => row.status === 'Absent').length
    const onLeave = todayRows.filter(row => row.status === 'On Leave').length
    const rate = total ? Math.round(((present + late) / total) * 1000) / 10 : 0
    return { total, present, late, absent, onLeave, rate }
  }, [employees.length, todayRows])

  const departmentRows = useMemo(() => {
    const names = Array.from(new Set(employees.map(employee => employee.department || 'Unassigned')))
    return names.map(name => {
      const rows = todayRows.filter(row => row.department === name)
      const present = rows.filter(row => row.status === 'Present').length
      const late = rows.filter(row => row.status === 'Late').length
      const absent = rows.filter(row => row.status === 'Absent').length
      const total = rows.length
      return { name, present, late, absent, rate: total ? Math.round(((present + late) / total) * 1000) / 10 : 0 }
    })
  }, [employees, todayRows])

  function openMarkAttendance(row?: AttendanceRow) {
    setNotice('')
    setRowMenuId(null)
    if (row) {
      setEditingRecord(row)
      setDraft({
        employeeId: row.employeeId,
        date: row.date,
        status: row.status,
        clockIn: row.clockIn || '',
        clockOut: row.clockOut || '',
        breakMinutes: String(row.breakMinutes || 0),
        workLocation: row.workLocation || 'Office',
        attendanceRemarks: row.attendanceRemarks || '',
        notes: row.notes || '',
      })
    } else {
      setEditingRecord(null)
      setDraft({
        employeeId: employees[0]?.id || '',
        date: todayInput(),
        status: 'Present',
        clockIn: '09:00',
        clockOut: '18:00',
        breakMinutes: '60',
        workLocation: 'Office',
        attendanceRemarks: '',
        notes: '',
      })
    }
    setMarkOpen(true)
  }

  function saveAttendance() {
    if (!draft.employeeId || !draft.date || !draft.status) {
      setNotice('Employee, date, and status are required.')
      return
    }
    const needsClock = draft.status === 'Present' || draft.status === 'Late'
    if (needsClock && (!draft.clockIn || !draft.clockOut)) {
      setNotice('Clock in and clock out are required for present or late records.')
      return
    }
    const next: AttendanceRecord = {
      id: editingRecord && !editingRecord.isVirtual ? editingRecord.id : `att_${Date.now()}`,
      employeeId: draft.employeeId,
      date: draft.date,
      status: draft.status,
      clockIn: needsClock ? draft.clockIn : '',
      clockOut: needsClock ? draft.clockOut : '',
      breakMinutes: needsClock ? Number(draft.breakMinutes || 0) : 0,
      workLocation: draft.workLocation,
      attendanceRemarks: draft.attendanceRemarks,
      remoteLog: draft.workLocation === 'Remote' || draft.workLocation === 'Hybrid',
      notes: draft.notes,
      createdAt: editingRecord?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    const nextRecords = upsertRecord(records, next)
    setRecords(nextRecords)
    saveStored(attendanceKey, nextRecords)
    if (draft.date === todayInput()) {
      const nextEmployees = employees.map(employee => employee.id === draft.employeeId ? { ...employee, attendanceStatus: draft.status, updatedAt: new Date().toISOString() } : employee)
      setEmployees(nextEmployees)
      saveStored(employeeKey, nextEmployees)
    }
    setMarkOpen(false)
  }

  function deleteRecord() {
    if (!deletingRecord || deletingRecord.isVirtual) {
      setDeletingRecord(null)
      return
    }
    const nextRecords = records.filter(record => record.id !== deletingRecord.id)
    setRecords(nextRecords)
    saveStored(attendanceKey, nextRecords)
    setDeletingRecord(null)
  }

  function exportReport() {
    const header = ['Employee ID', 'Employee', 'Department', 'Date', 'Status', 'Work Location', 'Clock In', 'Clock Out', 'Work Hours', 'Attendance Remarks', 'Notes']
    const lines = filteredRows.map(row => [
      row.employeeCode,
      row.employeeName,
      row.department,
      row.date,
      row.status,
      row.workLocation || '',
      row.clockIn || '',
      row.clockOut || '',
      attendanceHours(row),
      row.attendanceRemarks || '',
      row.notes || '',
    ].map(value => `"${String(value).replaceAll('"', '""')}"`).join(','))
    downloadText(`attendance-${todayInput()}.csv`, [header.join(','), ...lines].join('\n'))
  }

  async function importAttendance(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return
    try {
      const text = await file.text()
      const imported: ImportedAttendanceRow[] = text.trim().startsWith('[')
        ? JSON.parse(text) as Partial<AttendanceRecord>[]
        : parseCsv(text, employees)
      const cleaned = imported
        .filter(row => row.employeeId && row.date && row.status)
        .map(row => ({
          id: row.id || secureId('att', 5),
          employeeId: String(row.employeeId),
          date: String(row.date),
          status: normalizeStatus(row.status),
          clockIn: row.clockIn || '',
          clockOut: row.clockOut || '',
          breakMinutes: Number(row.breakMinutes || 0),
          notes: row.notes || '',
          createdAt: row.createdAt || new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }))
      const nextRecords = cleaned.reduce((current, row) => upsertRecord(current, row), records)
      setRecords(nextRecords)
      saveStored(attendanceKey, nextRecords)
      setNotice(`${cleaned.length} attendance record${cleaned.length === 1 ? '' : 's'} imported.`)
    } catch {
      setNotice('Could not import that file. Use CSV or JSON attendance data.')
    } finally {
      if (importRef.current) importRef.current.value = ''
    }
  }

  return (
    <main style={{ fontFamily: font, padding: '0 20px 36px', minHeight: '100vh' }}>
      <input ref={importRef} type="file" accept=".csv,.json" onChange={importAttendance} style={{ display: 'none' }} />

      <PageHeader onImport={() => importRef.current?.click()} onExport={exportReport} />
      {notice && <div style={{ ...card, padding: '10px 14px', marginBottom: 14, color: notice.startsWith('Could') ? '#b91c1c' : '#15803d', fontSize: 12, fontWeight: 800 }}>{notice}</div>}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 12, marginBottom: 16 }}>
        <Metric label="Attendance Rate" value={`${stats.rate}%`} sub="Based on today's employees" icon={<CheckCircle2 />} color="#16a34a" bg="#dcfce7" />
        <Metric label="Present" value={stats.present} sub="Checked in today" icon={<CalendarDays />} color="#16a34a" bg="#dcfce7" />
        <Metric label="Late" value={stats.late} sub="After shift start" icon={<Clock3 />} color="#f59e0b" bg="#fef3c7" />
        <Metric label="Absent" value={stats.absent} sub="No attendance" icon={<XCircle />} color="#ef4444" bg="#fee2e2" />
        <Metric label="On Leave" value={stats.onLeave} sub="Approved leave" icon={<Plane />} color="#3b82f6" bg="#dbeafe" />
        <Metric label="Total Employees" value={stats.total} sub="Active HR records" icon={<Users />} color="#7c3aed" bg="#ede9fe" />
        <Metric label="Remote Logs" value={todayRows.filter(row => row.remoteLog || row.workLocation === 'Remote').length} sub="Tagged WFH / remote" icon={<Wifi />} color="#0891b2" bg="#cffafe" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.25fr) minmax(420px, 1fr)', gap: 16, marginBottom: 16 }}>
        <section style={{ ...card, padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 18 }}>
            <strong style={{ color: '#111827', fontSize: 15 }}>Attendance Overview</strong>
            <select style={inputStyle} defaultValue="This Month"><option>This Month</option></select>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 16 }}>
            <MiniLegend label="Present" value={`${stats.rate}%`} color="#16a34a" />
            <MiniLegend label="Late" value={`${stats.total ? Math.round((stats.late / stats.total) * 1000) / 10 : 0}%`} color="#f59e0b" />
            <MiniLegend label="Absent" value={`${stats.total ? Math.round((stats.absent / stats.total) * 1000) / 10 : 0}%`} color="#ef4444" />
          </div>
          <LineOverview rows={monthRows} />
        </section>

        <section style={{ ...card, padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 18 }}>
            <strong style={{ color: '#111827', fontSize: 15 }}>Attendance by Department</strong>
            <button type="button" style={{ border: 'none', background: 'transparent', color: '#16a34a', fontSize: 12, fontWeight: 800 }}>View All</button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: 20, alignItems: 'center' }}>
            <Donut value={stats.total} />
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead><tr style={{ color: '#6b7280' }}>{['Department', 'Present', 'Late', 'Absent', 'Rate'].map(header => <th key={header} style={{ textAlign: 'left', padding: '8px 6px' }}>{header}</th>)}</tr></thead>
              <tbody>{departmentRows.map((row, index) => (
                <tr key={row.name}>
                  <td style={{ padding: '8px 6px', color: '#111827', fontWeight: 700 }}><span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: chartColors[index % chartColors.length], marginRight: 8 }} />{row.name}</td>
                  <td style={{ padding: '8px 6px' }}>{row.present}</td>
                  <td style={{ padding: '8px 6px' }}>{row.late}</td>
                  <td style={{ padding: '8px 6px' }}>{row.absent}</td>
                  <td style={{ padding: '8px 6px', fontWeight: 800 }}>{row.rate}%</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        </section>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 360px', gap: 16 }}>
        <section style={{ ...card, overflow: 'hidden' }}>
          <div style={{ display: 'flex', gap: 24, borderBottom: '1px solid #e5e7eb', padding: '0 18px' }}>
            {tabs.map(tab => <button key={tab} type="button" onClick={() => setActiveTab(tab)} style={{ border: 'none', borderBottom: `2px solid ${activeTab === tab ? '#16a34a' : 'transparent'}`, background: 'transparent', color: activeTab === tab ? '#16a34a' : '#374151', padding: '14px 0', fontSize: 13, fontWeight: 800, cursor: 'pointer' }}>{tab}</button>)}
          </div>
          {activeTab === 'Attendance Records' ? (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: '180px 1fr 1fr minmax(220px, 1.2fr) 40px', gap: 10, padding: 18 }}>
                <div style={{ ...inputStyle, color: '#374151' }}>{monthRangeLabel()}</div>
                <select value={department} onChange={event => setDepartment(event.target.value)} style={inputStyle}>{departments.map(item => <option key={item}>{item}</option>)}</select>
                <select value={status} onChange={event => setStatus(event.target.value)} style={inputStyle}><option>All Status</option>{statuses.map(item => <option key={item}>{item}</option>)}</select>
                <label style={{ ...inputStyle, display: 'flex', alignItems: 'center', gap: 8 }}><Search size={15} color="#9ca3af" /><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search employee..." style={{ border: 'none', outline: 'none', width: '100%' }} /></label>
                <button type="button" style={{ border: '1px solid #e5e7eb', background: '#fff', borderRadius: 8, display: 'grid', placeItems: 'center' }}><Filter size={15} /></button>
              </div>
              <AttendanceTable rows={filteredRows} rowMenuId={rowMenuId} setRowMenuId={setRowMenuId} menuPosition={rowMenuPosition} setMenuPosition={setRowMenuPosition} onEdit={openMarkAttendance} onDelete={setDeletingRecord} />
            </>
          ) : (
            <TabSummary tab={activeTab} rows={filteredRows} onMark={() => openMarkAttendance()} />
          )}
        </section>

        <aside style={{ display: 'grid', gap: 16, alignSelf: 'start' }}>
          <SummaryCard stats={stats} />
          <section style={{ ...card, padding: 18 }}>
            <strong style={{ color: '#111827', fontSize: 15 }}>Quick Actions</strong>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 14 }}>
              <QuickButton label="Mark Attendance" icon={<CheckCircle2 size={15} />} onClick={() => openMarkAttendance()} />
              <QuickButton label="Bulk Upload" icon={<Upload size={15} />} onClick={() => importRef.current?.click()} />
              <QuickButton label="Attendance Policy" icon={<FileText size={15} />} onClick={() => setPolicyOpen(true)} />
              <QuickButton label="Generate Report" icon={<Download size={15} />} onClick={exportReport} />
            </div>
          </section>
        </aside>
      </div>

      {markOpen && (
        <AttendanceModal title={editingRecord ? 'Edit Attendance' : 'Mark Attendance'} onClose={() => setMarkOpen(false)} onSave={saveAttendance} notice={notice}>
          <label style={fieldWrap}>Employee<select value={draft.employeeId} onChange={event => setDraft(previous => ({ ...previous, employeeId: event.target.value }))} style={inputStyle}>{employees.map(employee => <option key={employee.id} value={employee.id}>{fullName(employee) || employee.email || employee.id}</option>)}</select></label>
          <label style={fieldWrap}>Date<input type="date" value={draft.date} onChange={event => setDraft(previous => ({ ...previous, date: event.target.value }))} style={inputStyle} /></label>
          <label style={fieldWrap}>Status<select value={draft.status} onChange={event => setDraft(previous => ({ ...previous, status: event.target.value as AttendanceStatus }))} style={inputStyle}>{statuses.map(item => <option key={item}>{item}</option>)}</select></label>
          <label style={fieldWrap}>Clock in<input type="time" value={draft.clockIn} onChange={event => setDraft(previous => ({ ...previous, clockIn: event.target.value }))} style={inputStyle} /></label>
          <label style={fieldWrap}>Clock out<input type="time" value={draft.clockOut} onChange={event => setDraft(previous => ({ ...previous, clockOut: event.target.value }))} style={inputStyle} /></label>
          <label style={fieldWrap}>Break minutes<input type="number" min="0" value={draft.breakMinutes} onChange={event => setDraft(previous => ({ ...previous, breakMinutes: event.target.value }))} style={inputStyle} /></label>
          <label style={fieldWrap}>Work location<select value={draft.workLocation} onChange={event => setDraft(previous => ({ ...previous, workLocation: event.target.value as typeof draft.workLocation }))} style={inputStyle}><option>Office</option><option>Remote</option><option>Hybrid</option><option>Field</option></select></label>
          <label style={fieldWrap}>Attendance remarks<input value={draft.attendanceRemarks} onChange={event => setDraft(previous => ({ ...previous, attendanceRemarks: event.target.value }))} placeholder="Remote work output, location note, or exception" style={inputStyle} /></label>
          <label style={{ ...fieldWrap, gridColumn: '1 / -1' }}>Notes<input value={draft.notes} onChange={event => setDraft(previous => ({ ...previous, notes: event.target.value }))} placeholder="Optional remarks" style={inputStyle} /></label>
        </AttendanceModal>
      )}

      {policyOpen && (
        <InfoModal title="Attendance Policy" onClose={() => setPolicyOpen(false)}>
          <PolicyContent />
        </InfoModal>
      )}

      {deletingRecord && (
        <InfoModal title="Delete Attendance Record" onClose={() => setDeletingRecord(null)}>
          <p style={{ margin: 0, color: '#374151', fontSize: 13, lineHeight: 1.6 }}>Delete the {formatDate(deletingRecord.date)} attendance record for <strong>{deletingRecord.employeeName}</strong>?</p>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 16 }}>
            <button type="button" onClick={() => setDeletingRecord(null)} style={secondaryButton}>Cancel</button>
            <button type="button" onClick={deleteRecord} style={{ ...primaryButton, background: '#dc2626' }}>Delete</button>
          </div>
        </InfoModal>
      )}
    </main>
  )
}

function parseCsv(text: string, employees: Employee[]) {
  const entries: [string, string][] = employees.flatMap(employee => {
    const pairs: [string, string][] = [[employee.id, employee.id]]
    if (employee.employeeId) pairs.push([employee.employeeId, employee.id])
    return pairs
  })
  const employeeByCode = new Map<string, string>(entries)
  const lines = text.split(/\r?\n/).map(line => line.trim()).filter(Boolean)
  const [, ...rows] = lines
  return rows.map(line => {
    const [employeeCode, date, status, clockIn, clockOut, breakMinutes, notes] = line.split(',').map(cell => cell.replace(/^"|"$/g, '').trim())
    return { employeeId: employeeByCode.get(employeeCode) || employeeCode, date, status: normalizeStatus(status), clockIn, clockOut, breakMinutes: Number(breakMinutes || 0), notes } satisfies ImportedAttendanceRow
  })
}

function PageHeader({ onImport, onExport }: { onImport: () => void; onExport: () => void }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '20px 0 18px', gap: 16, flexWrap: 'wrap' }}>
      <div>
        <h1 style={{ margin: 0, color: '#0f172a', fontSize: 28, fontWeight: 900 }}>Attendance</h1>
        <p style={{ margin: '6px 0 0', color: '#475569', fontSize: 14 }}>Track and manage employee attendance, clock-ins, work hours, and exceptions.</p>
      </div>
      <div style={{ display: 'flex', gap: 10 }}>
        <button type="button" onClick={onImport} style={secondaryButton}><Upload size={14} /> Import Attendance</button>
        <button type="button" onClick={onExport} style={primaryButton}><Download size={14} /> Export Report</button>
      </div>
    </div>
  )
}

function Metric({ label, value, sub, icon, color, bg }: { label: string; value: string | number; sub: string; icon: React.ReactNode; color: string; bg: string }) {
  return (
    <div style={{ ...card, padding: 18, display: 'flex', gap: 14, alignItems: 'center' }}>
      <div style={{ width: 48, height: 48, borderRadius: '50%', background: bg, color, display: 'grid', placeItems: 'center' }}>{icon}</div>
      <div>
        <div style={{ color: '#6b7280', fontSize: 12, marginBottom: 4 }}>{label}</div>
        <div style={{ color: '#111827', fontSize: 24, fontWeight: 900 }}>{value}</div>
        <div style={{ color, fontSize: 11, fontWeight: 800, marginTop: 4 }}>{sub}</div>
      </div>
    </div>
  )
}

const chartColors = ['#16a34a', '#3b82f6', '#8b5cf6', '#f59e0b', '#14b8a6', '#ef4444']

function MiniLegend({ label, value, color }: { label: string; value: string; color: string }) {
  return <div><span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: color, marginRight: 8 }} /><span style={{ color: '#6b7280', fontSize: 12 }}>{label}</span><strong style={{ display: 'block', marginLeft: 16, color: '#111827' }}>{value}</strong></div>
}

function LineOverview({ rows }: { rows: AttendanceRow[] }) {
  const days = Array.from({ length: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate() }, (_, index) => index + 1)
  const points = days.map((day, index) => {
    const date = `${todayInput().slice(0, 8)}${String(day).padStart(2, '0')}`
    const dayRows = rows.filter(row => row.date === date)
    const rate = dayRows.length ? ((dayRows.filter(row => row.status === 'Present' || row.status === 'Late').length / dayRows.length) * 100) : 0
    return `${(index / Math.max(days.length - 1, 1)) * 100},${100 - rate}`
  }).join(' ')
  return (
    <svg viewBox="0 0 100 100" preserveAspectRatio="none" style={{ width: '100%', height: 210, background: 'linear-gradient(180deg,#f0fdf4,#fff)', borderRadius: 10 }}>
      {[0, 25, 50, 75, 100].map(y => <line key={y} x1="0" x2="100" y1={y} y2={y} stroke="#e5e7eb" strokeWidth="0.4" />)}
      <polyline fill="none" stroke="#16a34a" strokeWidth="1.3" points={points} />
    </svg>
  )
}

function Donut({ value }: { value: number }) {
  return <div style={{ width: 190, height: 190, borderRadius: '50%', background: 'conic-gradient(#16a34a 0 38%, #14b8a6 38% 56%, #f59e0b 56% 74%, #3b82f6 74% 88%, #8b5cf6 88% 100%)', display: 'grid', placeItems: 'center' }}><div style={{ width: 118, height: 118, borderRadius: '50%', background: '#fff', display: 'grid', placeItems: 'center', textAlign: 'center' }}><strong style={{ fontSize: 25, color: '#111827' }}>{value}</strong><span style={{ color: '#6b7280', fontSize: 12 }}>Employees</span></div></div>
}

function AttendanceTable({ rows, rowMenuId, setRowMenuId, menuPosition, setMenuPosition, onEdit, onDelete }: { rows: AttendanceRow[]; rowMenuId: string | null; setRowMenuId: (id: string | null) => void; menuPosition: FloatingMenuPosition; setMenuPosition: (position: FloatingMenuPosition) => void; onEdit: (row: AttendanceRow) => void; onDelete: (row: AttendanceRow) => void }) {
  function toggleMenu(rowId: string, event: React.MouseEvent<HTMLButtonElement>) {
    if (rowMenuId === rowId) {
      setRowMenuId(null)
      return
    }
    const rect = event.currentTarget.getBoundingClientRect()
    const menuWidth = 170
    const menuHeight = 142
    setMenuPosition({
      top: Math.max(12, Math.min(rect.bottom + 8, window.innerHeight - menuHeight - 12)),
      left: Math.max(12, Math.min(rect.right - menuWidth, window.innerWidth - menuWidth - 12)),
    })
    setRowMenuId(rowId)
  }
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', minWidth: 860, borderCollapse: 'collapse', fontSize: 12 }}>
        <thead><tr style={{ color: '#6b7280', background: '#f9fafb' }}>{['Employee', 'Department', 'Date', 'Status', 'Location', 'Check In', 'Check Out', 'Work Hours', 'Actions'].map(header => <th key={header} style={{ textAlign: 'left', padding: '10px 16px' }}>{header}</th>)}</tr></thead>
        <tbody>
          {rows.length === 0 ? <tr><td colSpan={9} style={{ padding: 40, textAlign: 'center', color: '#6b7280' }}>No attendance records found.</td></tr> : rows.slice(0, 10).map(row => {
            const tone = statusTone(row.status)
            return (
              <tr key={row.id} style={{ borderTop: '1px solid #f3f4f6' }}>
                <td style={{ padding: '12px 16px' }}><Link href={`/hr/attendance/${row.employeeId}`} style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}><Avatar name={row.employeeName} photo={row.photo} /><span><strong style={{ display: 'block', color: '#111827' }}>{row.employeeName}</strong><span style={{ color: '#6b7280' }}>{row.employeeCode}</span></span></Link></td>
                <td style={{ padding: '12px 16px', color: '#374151' }}>{row.department}</td>
                <td style={{ padding: '12px 16px', color: '#374151' }}>{formatDate(row.date)}</td>
                <td style={{ padding: '12px 16px' }}><span style={{ borderRadius: 999, background: tone.bg, color: tone.text, padding: '4px 8px', fontWeight: 800 }}>{row.status}</span></td>
                <td style={{ padding: '12px 16px', color: '#374151' }}>{row.workLocation || 'Office'}</td>
                <td style={{ padding: '12px 16px', color: '#111827' }}>{formatClock(row.clockIn)}</td>
                <td style={{ padding: '12px 16px', color: '#111827' }}>{formatClock(row.clockOut)}</td>
                <td style={{ padding: '12px 16px', color: '#111827', fontWeight: 800 }}>{attendanceHours(row)}</td>
                <td style={{ padding: '12px 16px', position: 'relative' }}><button type="button" onClick={event => toggleMenu(row.id, event)} style={iconButton}><MoreHorizontal size={15} /></button>{rowMenuId === row.id && <div style={{ ...menuStyle, top: menuPosition.top, left: menuPosition.left }}><Link href={`/hr/attendance/${row.employeeId}`} style={menuLink}>View employee</Link><button type="button" onClick={() => onEdit(row)} style={menuButton}>Edit record</button><button type="button" onClick={() => onDelete(row)} style={{ ...menuButton, color: '#dc2626' }}>Delete record</button></div>}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
      <div style={{ padding: '12px 16px', color: '#6b7280', fontSize: 12 }}>Showing {Math.min(rows.length, 10)} of {rows.length} results</div>
    </div>
  )
}

function SummaryCard({ stats }: { stats: { present: number; late: number; absent: number; onLeave: number; total: number } }) {
  const items = [['Present', stats.present, '#16a34a'], ['Late', stats.late, '#f59e0b'], ['Absent', stats.absent, '#ef4444'], ['On Leave', stats.onLeave, '#3b82f6'], ['Total Employees', stats.total, '#6b7280']]
  return <section style={{ ...card, padding: 18 }}><strong style={{ color: '#111827', fontSize: 15 }}>Today Summary</strong><div style={{ display: 'grid', gap: 12, marginTop: 14 }}>{items.map(([label, value, color]) => <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13 }}><span style={{ color: '#374151' }}><span style={{ display: 'inline-block', width: 9, height: 9, borderRadius: '50%', background: color, marginRight: 9 }} />{label}</span><strong>{value}</strong></div>)}</div></section>
}

function QuickButton({ label, icon, onClick }: { label: string; icon: React.ReactNode; onClick: () => void }) {
  return <button type="button" onClick={onClick} style={{ border: '1px solid #e5e7eb', background: '#fff', borderRadius: 8, padding: 12, display: 'flex', gap: 8, alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 800, cursor: 'pointer', color: '#111827' }}>{icon}{label}</button>
}

function TabSummary({ tab, rows, onMark }: { tab: string; rows: AttendanceRow[]; onMark: () => void }) {
  return <div style={{ padding: 22, minHeight: 260 }}><h2 style={{ margin: '0 0 8px', color: '#111827', fontSize: 18 }}>{tab}</h2><p style={{ margin: '0 0 18px', color: '#6b7280', fontSize: 13 }}>This view is calculated from the same attendance records table.</p><AttendanceTable rows={rows} rowMenuId={null} setRowMenuId={() => undefined} menuPosition={{ top: 0, left: 0 }} setMenuPosition={() => undefined} onEdit={() => onMark()} onDelete={() => undefined} /></div>
}

const fieldWrap = { display: 'grid', gap: 7, fontSize: 12, fontWeight: 800, color: '#374151' }
const primaryButton = { border: 'none', background: '#16a34a', color: '#fff', borderRadius: 8, padding: '10px 14px', fontSize: 12, fontWeight: 900, cursor: 'pointer', display: 'inline-flex', gap: 8, alignItems: 'center' }
const secondaryButton = { border: '1px solid #e5e7eb', background: '#fff', color: '#111827', borderRadius: 8, padding: '10px 14px', fontSize: 12, fontWeight: 800, cursor: 'pointer', display: 'inline-flex', gap: 8, alignItems: 'center' }
const iconButton = { border: '1px solid #e5e7eb', background: '#fff', borderRadius: 8, width: 32, height: 32, display: 'grid', placeItems: 'center', cursor: 'pointer' }
const menuStyle = { position: 'fixed' as const, width: 170, background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, boxShadow: '0 16px 40px rgba(15,23,42,0.14)', zIndex: 260, overflow: 'hidden' }
const menuButton = { width: '100%', border: 'none', background: '#fff', padding: '10px 12px', textAlign: 'left' as const, cursor: 'pointer', fontSize: 12, fontWeight: 800, color: '#374151' }
const menuLink = { display: 'block', padding: '10px 12px', textDecoration: 'none', color: '#374151', fontSize: 12, fontWeight: 800 }

function AttendanceModal({ title, children, notice, onClose, onSave }: { title: string; children: React.ReactNode; notice: string; onClose: () => void; onSave: () => void }) {
  return <InfoModal title={title} onClose={onClose}>{notice && <div style={{ color: '#b91c1c', background: '#fee2e2', padding: 10, borderRadius: 8, fontSize: 12, fontWeight: 800 }}>{notice}</div>}<div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>{children}</div><div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 16 }}><button type="button" onClick={onClose} style={secondaryButton}>Cancel</button><button type="button" onClick={onSave} style={primaryButton}>Save attendance</button></div></InfoModal>
}

function InfoModal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return <div role="dialog" aria-modal="true" style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.42)', zIndex: 100, display: 'grid', placeItems: 'center', padding: 20 }}><section style={{ width: 'min(680px, 100%)', background: '#fff', borderRadius: 14, border: '1px solid #e5e7eb', boxShadow: '0 30px 90px rgba(15,23,42,0.24)' }}><div style={{ display: 'flex', justifyContent: 'space-between', padding: '18px 20px', borderBottom: '1px solid #f3f4f6' }}><h2 style={{ margin: 0, color: '#111827', fontSize: 18 }}>{title}</h2><button type="button" onClick={onClose} style={iconButton}><XCircle size={16} /></button></div><div style={{ padding: 20 }}>{children}</div></section></div>
}

function PolicyContent() {
  return <div style={{ display: 'grid', gap: 10, color: '#374151', fontSize: 13, lineHeight: 1.6 }}><p style={{ margin: 0 }}><strong>Shift time:</strong> 9:00 AM - 6:00 PM</p><p style={{ margin: 0 }}><strong>Late threshold:</strong> 15 minutes after shift start</p><p style={{ margin: 0 }}><strong>Break:</strong> 60 minutes by default</p><p style={{ margin: 0 }}><strong>Weekly off:</strong> Saturday and Sunday</p></div>
}

function Avatar({ name, photo }: { name: string; photo?: string }) {
  return <span style={{ width: 34, height: 34, borderRadius: '50%', background: photo ? `url(${photo}) center/cover` : '#dcfce7', color: '#15803d', display: 'grid', placeItems: 'center', fontSize: 11, fontWeight: 900, flexShrink: 0 }}>{photo ? '' : initials(name)}</span>
}
