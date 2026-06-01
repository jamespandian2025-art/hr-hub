'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import {
  ArrowLeft, Download,
  MoreHorizontal, Search, Send, XCircle,
} from 'lucide-react'
import {
  AttendanceRecord, AttendanceRow, AttendanceStatus, attendanceHours, attendanceKey,
  attendanceMinutes, buildRows, downloadText, employeeKey, Employee, formatClock,
  formatDate, formatDay, formatMinutes, fullName, initials, loadStored, monthRangeLabel,
  saveStored, statusTone, todayInput, upsertRecord,
} from '../attendanceData'

const font = "var(--font-body)"
const card = { background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, boxShadow: '0 1px 4px rgba(15,23,42,0.05)' }
const inputStyle = { border: '1px solid #e5e7eb', borderRadius: 8, padding: '10px 12px', outline: 'none', fontFamily: font, fontSize: 13, color: '#111827', background: '#fff' }
const statuses: AttendanceStatus[] = ['Present', 'Late', 'Absent', 'On Leave', 'Rest day']
const tabs = ['Overview', 'Attendance', 'Leave History', 'Calendar', 'Clock In/Out Activity', 'Exceptions', 'Reports']
type FloatingMenuPosition = { top: number; left: number }

export default function EmployeeAttendancePage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [employees, setEmployees] = useState<Employee[]>([])
  const [records, setRecords] = useState<AttendanceRecord[]>([])
  const [activeTab, setActiveTab] = useState('Attendance')
  const [rowMenuId, setRowMenuId] = useState<string | null>(null)
  const [rowMenuPosition, setRowMenuPosition] = useState<FloatingMenuPosition>({ top: 0, left: 0 })
  const [editRow, setEditRow] = useState<AttendanceRow | null>(null)
  const [correctionOpen, setCorrectionOpen] = useState(false)
  const [correctionText, setCorrectionText] = useState('')
  const [notice, setNotice] = useState('')
  const [draft, setDraft] = useState({ date: todayInput(), status: 'Present' as AttendanceStatus, clockIn: '09:00', clockOut: '18:00', breakMinutes: '60', notes: '' })

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setEmployees(loadStored<Employee[]>(employeeKey, []))
      setRecords(loadStored<AttendanceRecord[]>(attendanceKey, []))
    }, 0)
    return () => window.clearTimeout(timer)
  }, [])

  const employee = employees.find(item => item.id === id)
  const employeeRows = useMemo(() => buildRows(employee ? [employee] : [], records.filter(record => record.employeeId === id)), [employee, id, records])
    .sort((a, b) => b.date.localeCompare(a.date))
  const monthRows = useMemo(() => {
    const now = new Date()
    return employeeRows.filter(row => {
      const date = new Date(`${row.date}T00:00:00`)
      return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth()
    })
  }, [employeeRows])

  const stats = useMemo(() => {
    const working = monthRows.filter(row => row.status !== 'Rest day')
    const present = monthRows.filter(row => row.status === 'Present').length
    const late = monthRows.filter(row => row.status === 'Late').length
    const absent = monthRows.filter(row => row.status === 'Absent').length
    const onLeave = monthRows.filter(row => row.status === 'On Leave').length
    const rest = monthRows.filter(row => row.status === 'Rest day').length
    const minutes = monthRows.reduce((sum, row) => sum + attendanceMinutes(row), 0)
    return {
      present,
      late,
      absent,
      onLeave,
      rest,
      rate: working.length ? Math.round(((present + late) / working.length) * 1000) / 10 : 0,
      totalHours: formatMinutes(minutes),
      averageHours: formatMinutes(working.length ? Math.round(minutes / working.length) : 0),
      overtime: formatMinutes(monthRows.reduce((sum, row) => Math.max(0, attendanceMinutes(row) - 480) + sum, 0)),
      breakHours: formatMinutes(monthRows.reduce((sum, row) => sum + (row.breakMinutes || 0), 0)),
    }
  }, [monthRows])

  function openEdit(row?: AttendanceRow) {
    setNotice('')
    if (row) {
      setEditRow(row)
      setDraft({ date: row.date, status: row.status, clockIn: row.clockIn || '', clockOut: row.clockOut || '', breakMinutes: String(row.breakMinutes || 0), notes: row.notes || '' })
    } else {
      setEditRow(null)
      setDraft({ date: todayInput(), status: 'Present', clockIn: '09:00', clockOut: '18:00', breakMinutes: '60', notes: '' })
    }
  }

  function saveAttendance() {
    if (!employee || !draft.date || !draft.status) return
    const needsClock = draft.status === 'Present' || draft.status === 'Late'
    if (needsClock && (!draft.clockIn || !draft.clockOut)) {
      setNotice('Clock in and clock out are required for present or late records.')
      return
    }
    const next: AttendanceRecord = {
      id: editRow && !editRow.isVirtual ? editRow.id : `att_${Date.now()}`,
      employeeId: employee.id,
      date: draft.date,
      status: draft.status,
      clockIn: needsClock ? draft.clockIn : '',
      clockOut: needsClock ? draft.clockOut : '',
      breakMinutes: needsClock ? Number(draft.breakMinutes || 0) : 0,
      notes: draft.notes,
      createdAt: editRow?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    const nextRecords = upsertRecord(records, next)
    setRecords(nextRecords)
    saveStored(attendanceKey, nextRecords)
    if (draft.date === todayInput()) {
      const nextEmployees = employees.map(item => item.id === employee.id ? { ...item, attendanceStatus: draft.status, updatedAt: new Date().toISOString() } : item)
      setEmployees(nextEmployees)
      saveStored(employeeKey, nextEmployees)
    }
    setEditRow(null)
  }

  function exportEmployeeReport() {
    const header = ['Date', 'Day', 'Status', 'Clock In', 'Clock Out', 'Work Hours', 'Break', 'Remarks']
    const lines = employeeRows.map(row => [row.date, formatDay(row.date), row.status, row.clockIn || '', row.clockOut || '', attendanceHours(row), row.breakMinutes || 0, row.notes || ''].map(value => `"${String(value).replaceAll('"', '""')}"`).join(','))
    downloadText(`attendance-${employee?.employeeId || id}.csv`, [header.join(','), ...lines].join('\n'))
  }

  function saveCorrection() {
    if (!employee || !correctionText.trim()) return
    const requests = loadStored<object[]>('flowsys-hr-attendance-corrections', [])
    saveStored('flowsys-hr-attendance-corrections', [...requests, { id: `correction_${Date.now()}`, employeeId: employee.id, note: correctionText.trim(), status: 'Pending', createdAt: new Date().toISOString() }])
    setCorrectionText('')
    setCorrectionOpen(false)
    setNotice('Correction request submitted.')
  }

  if (!employee) {
    return <main style={{ fontFamily: font, minHeight: '100vh', padding: 24 }}><section style={{ ...card, padding: 24 }}><h1 style={{ margin: 0 }}>Employee not found</h1><Link href="/hr/attendance" style={{ color: '#16a34a', fontWeight: 800 }}>Back to Attendance</Link></section></main>
  }

  const name = fullName(employee) || employee.email || 'Employee'

  return (
    <main style={{ fontFamily: font, padding: '0 20px 36px', minHeight: '100vh' }}>
      <div style={{ padding: '20px 0 18px', fontSize: 12, color: '#6b7280' }}>HR Hub &nbsp;&gt;&nbsp; <Link href="/hr/attendance" style={{ color: '#6b7280', textDecoration: 'none' }}>Attendance</Link> &nbsp;&gt;&nbsp; {name}</div>
      {notice && <div style={{ ...card, padding: '10px 14px', marginBottom: 14, color: '#15803d', fontSize: 12, fontWeight: 800 }}>{notice}</div>}

      <section style={{ ...card, padding: 24, marginBottom: 16 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 18 }}>
          <div style={{ display: 'flex', gap: 18 }}>
            <button type="button" onClick={() => router.back()} style={{ border: '1px solid #e5e7eb', background: '#fff', width: 38, height: 38, borderRadius: 9, display: 'grid', placeItems: 'center', cursor: 'pointer' }}><ArrowLeft size={16} /></button>
            <Avatar name={name} photo={employee.photo} size={112} />
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 8 }}><h1 style={{ margin: 0, color: '#111827', fontSize: 25 }}>{name}</h1><span style={{ borderRadius: 999, background: '#dcfce7', color: '#15803d', padding: '4px 9px', fontSize: 11, fontWeight: 800 }}>{employee.employmentStatus || 'Active'}</span></div>
              <p style={{ margin: '8px 0', color: '#6b7280', fontSize: 13 }}>{employee.jobTitle || 'Team member'} Â· {employee.employeeId || employee.id}</p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(180px, auto))', gap: '9px 22px', color: '#374151', fontSize: 12 }}>
                <span>{employee.department || 'Unassigned'} Department</span><span>{employee.team || 'No team'}</span><span>{employee.workLocation || employee.address || 'No location'}</span><span>{employee.email || 'No email'}</span>
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10, alignSelf: 'start' }}>
            <button type="button" onClick={() => setCorrectionOpen(true)} style={secondaryButton}>Request Correction</button>
            <button type="button" onClick={exportEmployeeReport} style={primaryButton}><Download size={14} /> Export Report</button>
          </div>
        </div>
      </section>

      <div style={{ display: 'flex', gap: 24, borderBottom: '1px solid #e5e7eb', marginBottom: 16 }}>
        {tabs.map(tab => <button key={tab} type="button" onClick={() => setActiveTab(tab)} style={{ border: 'none', borderBottom: `2px solid ${activeTab === tab ? '#16a34a' : 'transparent'}`, background: 'transparent', padding: '14px 0', color: activeTab === tab ? '#16a34a' : '#374151', fontWeight: 800, cursor: 'pointer' }}>{tab}</button>)}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 360px', gap: 16 }}>
        <section style={{ ...card, overflow: 'hidden' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '240px 150px 150px 1fr', gap: 12, padding: 18 }}>
            <div style={{ ...inputStyle }}>{monthRangeLabel()}</div>
            <select style={inputStyle}><option>Monthly</option></select>
            <select style={inputStyle}><option>All Status</option>{statuses.map(item => <option key={item}>{item}</option>)}</select>
            <label style={{ ...inputStyle, display: 'flex', alignItems: 'center', gap: 8 }}><Search size={15} color="#9ca3af" /><input placeholder="Search remarks..." style={{ border: 'none', outline: 'none', width: '100%' }} /></label>
          </div>
          {activeTab === 'Attendance' ? <EmployeeAttendanceTable rows={employeeRows} rowMenuId={rowMenuId} setRowMenuId={setRowMenuId} menuPosition={rowMenuPosition} setMenuPosition={setRowMenuPosition} onEdit={openEdit} /> : <SimplePanel title={activeTab} rows={employeeRows} />}
        </section>

        <aside style={{ display: 'grid', gap: 16, alignSelf: 'start' }}>
          <section style={{ ...card, padding: 18 }}>
            <strong style={{ color: '#111827', fontSize: 15 }}>Attendance Summary ({monthRangeLabel()})</strong>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 16 }}>
              {([
                ['Present', stats.present, '#16a34a'], ['Late', stats.late, '#f59e0b'], ['Absent', stats.absent, '#ef4444'], ['On Leave', stats.onLeave, '#3b82f6'], ['Weekly Off', stats.rest, '#6b7280'], ['Attendance Rate', `${stats.rate}%`, '#16a34a'],
              ] as [string, string | number, string][]).map(([label, value, color]) => <div key={label} style={{ border: '1px solid #f3f4f6', borderRadius: 10, padding: 12 }}><strong style={{ color: '#111827', fontSize: 17 }}>{value}</strong><div style={{ color, fontSize: 11, fontWeight: 800 }}>{label}</div></div>)}
            </div>
          </section>
          <section style={{ ...card, padding: 18 }}>
            <strong style={{ color: '#111827', fontSize: 15 }}>Work Hours Summary</strong>
            <InfoLine label="Total Worked Hours" value={stats.totalHours} />
            <InfoLine label="Average Daily Hours" value={stats.averageHours} />
            <InfoLine label="Overtime Hours" value={stats.overtime} />
            <InfoLine label="Break Hours" value={stats.breakHours} />
          </section>
          <section style={{ ...card, padding: 18 }}>
            <strong style={{ color: '#111827', fontSize: 15 }}>Actions</strong>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 14 }}>
              <button type="button" onClick={() => setCorrectionOpen(true)} style={secondaryButton}>Request Correction</button>
              <button type="button" onClick={() => openEdit()} style={secondaryButton}>Mark Attendance</button>
            </div>
          </section>
        </aside>
      </div>

      {editRow !== null && (
        <AttendanceModal title={editRow ? 'Edit Attendance' : 'Mark Attendance'} notice={notice} onClose={() => setEditRow(null)} onSave={saveAttendance}>
          <label style={fieldWrap}>Date<input type="date" value={draft.date} onChange={event => setDraft(previous => ({ ...previous, date: event.target.value }))} style={inputStyle} /></label>
          <label style={fieldWrap}>Status<select value={draft.status} onChange={event => setDraft(previous => ({ ...previous, status: event.target.value as AttendanceStatus }))} style={inputStyle}>{statuses.map(item => <option key={item}>{item}</option>)}</select></label>
          <label style={fieldWrap}>Clock in<input type="time" value={draft.clockIn} onChange={event => setDraft(previous => ({ ...previous, clockIn: event.target.value }))} style={inputStyle} /></label>
          <label style={fieldWrap}>Clock out<input type="time" value={draft.clockOut} onChange={event => setDraft(previous => ({ ...previous, clockOut: event.target.value }))} style={inputStyle} /></label>
          <label style={fieldWrap}>Break minutes<input type="number" min="0" value={draft.breakMinutes} onChange={event => setDraft(previous => ({ ...previous, breakMinutes: event.target.value }))} style={inputStyle} /></label>
          <label style={{ ...fieldWrap, gridColumn: '1 / -1' }}>Remarks<input value={draft.notes} onChange={event => setDraft(previous => ({ ...previous, notes: event.target.value }))} style={inputStyle} /></label>
        </AttendanceModal>
      )}

      {correctionOpen && (
        <InfoModal title="Request Attendance Correction" onClose={() => setCorrectionOpen(false)}>
          <label style={fieldWrap}>Correction details<textarea value={correctionText} onChange={event => setCorrectionText(event.target.value)} placeholder="Explain what needs to be corrected..." style={{ ...inputStyle, minHeight: 100 }} /></label>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 16 }}><button type="button" onClick={() => setCorrectionOpen(false)} style={secondaryButton}>Cancel</button><button type="button" onClick={saveCorrection} style={primaryButton}><Send size={14} /> Submit</button></div>
        </InfoModal>
      )}
    </main>
  )
}

function EmployeeAttendanceTable({ rows, rowMenuId, setRowMenuId, menuPosition, setMenuPosition, onEdit }: { rows: AttendanceRow[]; rowMenuId: string | null; setRowMenuId: (id: string | null) => void; menuPosition: FloatingMenuPosition; setMenuPosition: (position: FloatingMenuPosition) => void; onEdit: (row: AttendanceRow) => void }) {
  function toggleMenu(rowId: string, event: React.MouseEvent<HTMLButtonElement>) {
    if (rowMenuId === rowId) {
      setRowMenuId(null)
      return
    }
    const rect = event.currentTarget.getBoundingClientRect()
    const menuWidth = 150
    const menuHeight = 96
    setMenuPosition({
      top: Math.max(12, Math.min(rect.bottom + 8, window.innerHeight - menuHeight - 12)),
      left: Math.max(12, Math.min(rect.right - menuWidth, window.innerWidth - menuWidth - 12)),
    })
    setRowMenuId(rowId)
  }
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', minWidth: 920, borderCollapse: 'collapse', fontSize: 12 }}>
        <thead><tr style={{ background: '#f9fafb', color: '#6b7280' }}>{['Date', 'Day', 'Status', 'Check In', 'Check Out', 'Work Hours', 'Break', 'Overtime', 'Remarks', ''].map(header => <th key={header} style={{ textAlign: 'left', padding: '11px 16px' }}>{header}</th>)}</tr></thead>
        <tbody>{rows.slice(0, 10).map(row => {
          const tone = statusTone(row.status)
          const overtime = Math.max(0, attendanceMinutes(row) - 480)
          return (
            <tr key={row.id} style={{ borderTop: '1px solid #f3f4f6' }}>
              <td style={{ padding: '12px 16px', color: '#111827' }}>{formatDate(row.date)}</td>
              <td style={{ padding: '12px 16px', color: '#374151' }}>{formatDay(row.date)}</td>
              <td style={{ padding: '12px 16px' }}><span style={{ background: tone.bg, color: tone.text, borderRadius: 999, padding: '4px 8px', fontWeight: 800 }}>{row.status}</span></td>
              <td style={{ padding: '12px 16px' }}>{formatClock(row.clockIn)}</td>
              <td style={{ padding: '12px 16px' }}>{formatClock(row.clockOut)}</td>
              <td style={{ padding: '12px 16px', fontWeight: 800 }}>{attendanceHours(row)}</td>
              <td style={{ padding: '12px 16px' }}>{formatMinutes(row.breakMinutes || 0)}</td>
              <td style={{ padding: '12px 16px' }}>{overtime ? formatMinutes(overtime) : '-'}</td>
              <td style={{ padding: '12px 16px' }}>{row.notes || '-'}</td>
              <td style={{ padding: '12px 16px', position: 'relative' }}><button type="button" onClick={event => toggleMenu(row.id, event)} style={iconButton}><MoreHorizontal size={15} /></button>{rowMenuId === row.id && <div style={{ ...menuStyle, top: menuPosition.top, left: menuPosition.left }}><button type="button" onClick={() => onEdit(row)} style={menuButton}>Edit record</button><button type="button" onClick={() => setRowMenuId(null)} style={menuButton}>Close</button></div>}</td>
            </tr>
          )
        })}</tbody>
      </table>
      <div style={{ padding: '12px 16px', color: '#6b7280', fontSize: 12 }}>Showing {Math.min(rows.length, 10)} of {rows.length} records</div>
    </div>
  )
}

function SimplePanel({ title, rows }: { title: string; rows: AttendanceRow[] }) {
  return <div style={{ padding: 24, minHeight: 300 }}><h2 style={{ margin: '0 0 8px', color: '#111827' }}>{title}</h2><p style={{ margin: '0 0 18px', color: '#6b7280', fontSize: 13 }}>This section uses the same attendance records for this employee.</p><div style={{ display: 'grid', gap: 10 }}>{rows.slice(0, 5).map(row => <div key={row.id} style={{ border: '1px solid #f3f4f6', borderRadius: 10, padding: 14, display: 'flex', justifyContent: 'space-between' }}><span>{formatDate(row.date)}</span><strong>{row.status}</strong></div>)}</div></div>
}

function InfoLine({ label, value }: { label: string; value: string }) {
  return <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginTop: 14, color: '#374151', fontSize: 13 }}><span>{label}</span><strong style={{ color: '#111827' }}>{value}</strong></div>
}

const fieldWrap = { display: 'grid', gap: 7, fontSize: 12, fontWeight: 800, color: '#374151' }
const primaryButton = { border: 'none', background: '#16a34a', color: '#fff', borderRadius: 8, padding: '10px 14px', fontSize: 12, fontWeight: 900, cursor: 'pointer', display: 'inline-flex', gap: 8, alignItems: 'center', justifyContent: 'center' }
const secondaryButton = { border: '1px solid #e5e7eb', background: '#fff', color: '#111827', borderRadius: 8, padding: '10px 14px', fontSize: 12, fontWeight: 800, cursor: 'pointer', display: 'inline-flex', gap: 8, alignItems: 'center', justifyContent: 'center' }
const iconButton = { border: '1px solid #e5e7eb', background: '#fff', borderRadius: 8, width: 32, height: 32, display: 'grid', placeItems: 'center', cursor: 'pointer' }
const menuStyle = { position: 'fixed' as const, width: 150, background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, boxShadow: '0 16px 40px rgba(15,23,42,0.14)', zIndex: 260, overflow: 'hidden' }
const menuButton = { width: '100%', border: 'none', background: '#fff', padding: '10px 12px', textAlign: 'left' as const, cursor: 'pointer', fontSize: 12, fontWeight: 800, color: '#374151' }

function AttendanceModal({ title, children, notice, onClose, onSave }: { title: string; children: React.ReactNode; notice: string; onClose: () => void; onSave: () => void }) {
  return <InfoModal title={title} onClose={onClose}>{notice && <div style={{ color: '#b91c1c', background: '#fee2e2', padding: 10, borderRadius: 8, fontSize: 12, fontWeight: 800 }}>{notice}</div>}<div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>{children}</div><div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 16 }}><button type="button" onClick={onClose} style={secondaryButton}>Cancel</button><button type="button" onClick={onSave} style={primaryButton}>Save attendance</button></div></InfoModal>
}

function InfoModal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return <div role="dialog" aria-modal="true" style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.42)', zIndex: 100, display: 'grid', placeItems: 'center', padding: 20 }}><section style={{ width: 'min(680px, 100%)', background: '#fff', borderRadius: 14, border: '1px solid #e5e7eb', boxShadow: '0 30px 90px rgba(15,23,42,0.24)' }}><div style={{ display: 'flex', justifyContent: 'space-between', padding: '18px 20px', borderBottom: '1px solid #f3f4f6' }}><h2 style={{ margin: 0, color: '#111827', fontSize: 18 }}>{title}</h2><button type="button" onClick={onClose} style={iconButton}><XCircle size={16} /></button></div><div style={{ padding: 20 }}>{children}</div></section></div>
}

function Avatar({ name, photo, size }: { name: string; photo?: string; size: number }) {
  return <span style={{ width: size, height: size, borderRadius: '50%', background: photo ? `url(${photo}) center/cover` : '#dcfce7', color: '#15803d', display: 'grid', placeItems: 'center', fontSize: size > 60 ? 24 : 11, fontWeight: 900, flexShrink: 0 }}>{photo ? '' : initials(name)}</span>
}
