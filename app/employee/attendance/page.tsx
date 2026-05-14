'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Clock3, Home, MonitorCheck, Pause, Play } from 'lucide-react'
import EmployeeEmptyPage from '@/components/employee/EmployeeEmptyPage'
import { attendanceKey, AttendanceRecord, formatDate, loadStored, saveStored, useEmployeePortalData } from '../employeeData'
import { appendAuditLog } from '@/app/hr/enterpriseData'

function todayInput() {
  const date = new Date()
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function nowTime() {
  return new Date().toTimeString().slice(0, 8)
}

function timeToDate(date: string, time?: string) {
  if (!time) return null
  const normalized = time.split(':').length === 2 ? `${time}:00` : time
  const parsed = new Date(`${date}T${normalized}`)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

function displayClock(value?: string) {
  if (!value) return '-'
  return value.split(':').slice(0, 2).join(':')
}

function formatDuration(ms: number) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000))
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

function compactDuration(ms: number) {
  const totalMinutes = Math.max(0, Math.floor(ms / 60000))
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  return hours <= 0 ? `${minutes}m` : `${hours}h ${minutes}m`
}

export default function EmployeeAttendancePage() {
  const { employee, employeeName, myAttendance } = useEmployeePortalData()
  const [location, setLocation] = useState<'Office' | 'Remote' | 'Hybrid' | 'Field'>(employee.workLocation?.toLowerCase().includes('remote') ? 'Remote' : 'Office')
  const [remarks, setRemarks] = useState('')
  const [notice, setNotice] = useState('')
  const [now, setNow] = useState(() => Date.now())
  const todayRecord = useMemo(() => myAttendance.find(item => item.date === todayInput()), [myAttendance])
  const clockInDate = todayRecord ? timeToDate(todayRecord.date, todayRecord.clockIn) : null
  const clockOutDate = todayRecord ? timeToDate(todayRecord.date, todayRecord.clockOut) : null
  const isRunning = Boolean(clockInDate && !clockOutDate)
  const workedMs = clockInDate ? (clockOutDate?.getTime() || now) - clockInDate.getTime() : 0

  useEffect(() => {
    if (!isRunning) return
    const timer = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(timer)
  }, [isRunning])

  const saveClock = (mode: 'in' | 'out') => {
    const all = loadStored<AttendanceRecord[]>(attendanceKey, [])
    const current = all.find(item => item.employeeId === employee.id && item.date === todayInput())
    const currentTime = nowTime()
    const nextRecord: AttendanceRecord = {
      id: current?.id || `att_${employee.id}_${Date.now()}`,
      employeeId: employee.id,
      date: todayInput(),
      status: 'Present',
      clockIn: mode === 'in' ? currentTime : current?.clockIn || currentTime,
      clockOut: mode === 'out' ? currentTime : '',
      breakMinutes: current?.breakMinutes ?? 60,
      workLocation: location,
      attendanceRemarks: remarks,
      remoteLog: location === 'Remote' || location === 'Hybrid',
      notes: remarks,
      createdAt: current?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    const next = [nextRecord, ...all.filter(item => !(item.employeeId === employee.id && item.date === todayInput()))]
    saveStored(attendanceKey, next)
    window.dispatchEvent(new Event('storage'))
    appendAuditLog({ action: 'attendance.remote', targetType: 'Attendance', targetId: nextRecord.id, summary: `${employeeName} clocked ${mode === 'in' ? 'in' : 'out'} from ${location}.` })
    setNow(Date.now())
    setNotice(`Clock ${mode === 'in' ? 'in' : 'out'} saved for ${location}.`)
  }

  return (
    <EmployeeEmptyPage title="My Attendance" subtitle="Time in/out, tag your work location, and view attendance logs.">
      {notice && <div style={noticeStyle}>{notice}</div>}
      <section style={timerShellStyle}>
        <div style={timerMainStyle}>
          <span style={timerLabelStyle}>{isRunning ? 'Tracking time' : todayRecord ? 'Time stopped' : 'Ready to clock in'}</span>
          <span style={timerValueStyle}>{formatDuration(workedMs)}</span>
          <span style={timerSubStyle}>Worked today: <strong>{compactDuration(workedMs)}</strong></span>
        </div>
        <div style={todaySummaryStyle}>
          <span style={timerLabelStyle}>Today</span>
          <strong style={{ color: '#0f172a', fontSize: 16 }}>{todayRecord ? todayRecord.status : 'No activity yet'}</strong>
          <span style={timerSubStyle}>{todayRecord ? `${displayClock(todayRecord.clockIn)} - ${displayClock(todayRecord.clockOut)}` : 'Clock in to start your shift.'}</span>
        </div>
        <div style={timerControlStyle}>
          <button type="button" onClick={() => saveClock(isRunning ? 'out' : 'in')} style={timerActionStyle(isRunning)} aria-label={isRunning ? 'Time out' : 'Time in'}>
            {isRunning ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" />}
            {isRunning ? 'Pause / Time Out' : 'Start / Time In'}
          </button>
        </div>
      </section>
      <section className="employee-panel" style={{ padding: 18, marginBottom: 18 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', marginBottom: 14, flexWrap: 'wrap' }}>
          <div>
            <h2 style={{ ...titleStyle, fontSize: 16 }}>Remote Work</h2>
            <p style={mutedStyle}>Need approval before working from home? Submit a WFH request to HR.</p>
          </div>
          <Link href="/employee/leave-requests/new" className="employee-secondary-button"><Home size={15} /> Request Work From Home</Link>
        </div>
        <div style={clockGrid}>
          <div>
            <h2 style={titleStyle}>Today</h2>
            <p style={mutedStyle}>{todayRecord ? `Clock in ${displayClock(todayRecord.clockIn)} - Clock out ${displayClock(todayRecord.clockOut)}` : 'No clock activity yet today.'}</p>
          </div>
          <label style={fieldStyle}>Work location<select value={location} onChange={event => setLocation(event.target.value as typeof location)} style={inputStyle}><option>Office</option><option>Remote</option><option>Hybrid</option><option>Field</option></select></label>
          <label style={fieldStyle}>Attendance remarks<input value={remarks} onChange={event => setRemarks(event.target.value)} placeholder="WFH setup, client site, output notes" style={inputStyle} /></label>
          <div style={buttonGroup}>
            <button type="button" onClick={() => saveClock('in')} className="employee-primary-button"><Clock3 size={16} /> Time In</button>
            <button type="button" onClick={() => saveClock('out')} className="employee-secondary-button"><MonitorCheck size={16} /> Time Out</button>
          </div>
        </div>
      </section>
      <section className="employee-panel" style={{ overflow: 'hidden' }}>
        <div style={{ padding: 18, borderBottom: '1px solid #e2e8f0' }}><h2 style={{ margin: 0, fontSize: 17 }}>Attendance Records</h2></div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', minWidth: 840, borderCollapse: 'collapse' }}>
            <thead style={{ background: '#f8fafc', color: '#475569', fontSize: 12, textAlign: 'left' }}><tr>{['Date', 'Status', 'Location', 'Clock In', 'Clock Out', 'Break', 'Remarks'].map(item => <th key={item} style={{ padding: '12px 16px' }}>{item}</th>)}</tr></thead>
            <tbody>{myAttendance.length === 0 ? <tr><td colSpan={7} style={{ padding: 42, textAlign: 'center', color: '#64748b' }}>No attendance records found.</td></tr> : myAttendance.map(item => <tr key={item.id} style={{ borderTop: '1px solid #eef2f7' }}><td style={cell}>{formatDate(item.date)}</td><td style={cell}>{item.status}</td><td style={cell}><Home size={14} /> {item.workLocation || 'Office'}</td><td style={cell}>{displayClock(item.clockIn)}</td><td style={cell}>{displayClock(item.clockOut)}</td><td style={cell}>{item.breakMinutes || 0} min</td><td style={cell}>{item.attendanceRemarks || item.notes || '-'}</td></tr>)}</tbody>
          </table>
        </div>
      </section>
    </EmployeeEmptyPage>
  )
}

const clockGrid = { display: 'grid', gridTemplateColumns: 'minmax(180px, 1fr) minmax(180px, 220px) minmax(220px, 1fr) auto', gap: 14, alignItems: 'end' } as const
const timerShellStyle = { width: '100%', marginBottom: 18, border: '1px solid #dbe4ef', borderRadius: 14, background: '#fff', boxShadow: '0 10px 28px rgba(15,23,42,0.05)', padding: 18, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 260px), 1fr))', gap: 18, alignItems: 'center' } as const
const timerMainStyle = { display: 'grid', gap: 7, minWidth: 0 } as const
const timerLabelStyle = { color: '#64748b', fontSize: 12, fontWeight: 900, textTransform: 'uppercase' as const, letterSpacing: 0 } as const
const timerValueStyle = { color: '#0f172a', fontSize: 42, lineHeight: 1, fontWeight: 900, letterSpacing: 0, fontVariantNumeric: 'tabular-nums' as const } as const
const timerSubStyle = { color: '#475569', fontSize: 13, lineHeight: 1.4 } as const
const todaySummaryStyle = { borderLeft: '1px solid #e2e8f0', paddingLeft: 18, display: 'grid', gap: 6, minHeight: 74, alignContent: 'center' } as const
const timerControlStyle = { display: 'flex', justifyContent: 'flex-end', minWidth: 0 } as const
const timerActionStyle = (running: boolean) => ({
  minHeight: 44,
  borderRadius: 999,
  border: 'none',
  background: running ? '#ff2251' : '#16a34a',
  color: '#fff',
  boxShadow: running ? '0 10px 22px rgba(255,34,81,0.2)' : '0 10px 22px rgba(22,163,74,0.18)',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 8,
  padding: '0 18px',
  fontSize: 13,
  fontWeight: 900,
  cursor: 'pointer',
})
const titleStyle = { margin: 0, color: '#0f172a', fontSize: 18 } as const
const mutedStyle = { margin: '6px 0 0', color: '#64748b', fontSize: 13 } as const
const fieldStyle = { display: 'grid', gap: 7, color: '#334155', fontSize: 12, fontWeight: 900 } as const
const inputStyle = { minHeight: 40, border: '1px solid #e2e8f0', borderRadius: 8, padding: '0 12px', font: 'inherit', background: '#fff', color: '#0f172a' } as const
const buttonGroup = { display: 'flex', gap: 10, flexWrap: 'wrap' as const }
const noticeStyle = { padding: 12, borderRadius: 10, background: '#ecfdf5', color: '#047857', fontWeight: 900, fontSize: 13, marginBottom: 16 } as const
const cell = { padding: '14px 16px', fontSize: 13, color: '#0f172a' } as const
