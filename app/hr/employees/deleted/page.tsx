'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, RotateCcw, Search, Trash2, Users } from 'lucide-react'

interface Employee {
  id: string
  employeeId: string
  firstName: string
  middleName?: string
  lastName: string
  email: string
  phone: string
  photo?: string
  employeeType: string
  employmentStatus: string
  dateOfJoining: string
  department: string
  team: string
  jobTitle: string
  createdAt: string
  updatedAt: string
}

type ExitReason = 'Resigned' | 'AWOL' | 'Terminated' | 'Retired' | 'End of contract' | 'Other'
type DeletedEmployee = Employee & { deletedAt?: string; exitReason?: ExitReason; exitNotes?: string }

const exitReasonStyles: Record<ExitReason, { bg: string; color: string }> = {
  Resigned:           { bg: '#dbeafe', color: '#1d4ed8' },
  AWOL:               { bg: '#fee2e2', color: '#b91c1c' },
  Terminated:         { bg: '#fef3c7', color: '#92400e' },
  Retired:            { bg: '#ede9fe', color: '#6d28d9' },
  'End of contract':  { bg: '#dcfce7', color: '#15803d' },
  Other:              { bg: '#e2e8f0', color: '#334155' },
}

const font = "var(--font-body)"
const employeesKey = 'flowsys-hr-employees'
const deletedEmployeesKey = 'flowsys-hr-deleted-employees'

function loadStored<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback
  try { const raw = window.localStorage.getItem(key); return raw ? JSON.parse(raw) as T : fallback } catch { return fallback }
}

function saveStored<T>(key: string, value: T) {
  window.localStorage.setItem(key, JSON.stringify(value))
  window.dispatchEvent(new StorageEvent('storage', { key }))
}

function fullName(employee: Employee) {
  return [employee.firstName, employee.middleName, employee.lastName].filter(Boolean).join(' ')
}

function initials(name: string) {
  return name.split(' ').filter(Boolean).map(part => part[0]).join('').toUpperCase().slice(0, 2) || 'HR'
}

export default function DeletedEmployeesPage() {
  const [employees, setEmployees] = useState<DeletedEmployee[]>([])
  const [query, setQuery] = useState('')

  useEffect(() => {
    const timer = window.setTimeout(() => setEmployees(loadStored<DeletedEmployee[]>(deletedEmployeesKey, [])), 0)
    return () => window.clearTimeout(timer)
  }, [])

  const filtered = useMemo(() => {
    const clean = query.trim().toLowerCase()
    return employees.filter(employee => !clean || `${fullName(employee)} ${employee.employeeId} ${employee.email} ${employee.department}`.toLowerCase().includes(clean))
  }, [employees, query])

  function persistDeleted(next: DeletedEmployee[]) {
    setEmployees(next)
    saveStored(deletedEmployeesKey, next)
  }

  function restoreEmployee(employee: DeletedEmployee) {
    const activeEmployees = loadStored<Employee[]>(employeesKey, [])
    const restored: Employee = { ...employee }
    const restoredAsPartial = restored as Partial<DeletedEmployee>
    delete restoredAsPartial.deletedAt
    delete restoredAsPartial.exitReason
    delete restoredAsPartial.exitNotes
    saveStored(employeesKey, [{ ...restored, updatedAt: new Date().toISOString() }, ...activeEmployees.filter(item => item.id !== employee.id)])
    persistDeleted(employees.filter(item => item.id !== employee.id))
    window.dispatchEvent(new Event('wiseflow:hr-data-changed'))
  }

  function deleteForever(employeeId: string) {
    persistDeleted(employees.filter(employee => employee.id !== employeeId))
    window.dispatchEvent(new Event('wiseflow:hr-data-changed'))
  }

  return (
    <main style={{ fontFamily: font, padding: '0 20px 32px', minHeight: '100vh' }}>
      <div style={{ padding: '20px 0 18px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 14, flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontSize: 12, color: '#000000', marginBottom: 12 }}>HR Hub &gt; Employees &gt; Ex Employees</div>
          <h1 style={{ margin: 0, color: '#0f172a', fontSize: 24 }}>Ex Employees</h1>
          <p style={{ margin: '6px 0 0', color: '#000000', fontSize: 13 }}>People who have left the company. Reinstate or remove the record permanently.</p>
        </div>
        <Link href="/hr/employees" style={secondaryLinkStyle}><ArrowLeft size={15} /> Back to Employees</Link>
      </div>

      <section style={cardStyle}>
        <label style={searchStyle}>
          <Search size={15} color="#000000" />
          <input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search ex employees..." style={searchInputStyle} />
        </label>
        <div style={{ overflowX: 'auto', marginTop: 16 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 820 }}>
            <thead><tr>{['Employee', 'Employee ID', 'Position', 'Department', 'Reason', 'Exit date', 'Actions'].map(header => <th key={header} style={thStyle}>{header}</th>)}</tr></thead>
            <tbody>
              {filtered.map(employee => {
                const name = fullName(employee)
                const reason = employee.exitReason
                const reasonStyle = reason ? exitReasonStyles[reason] : null
                return (
                  <tr key={employee.id} style={{ borderTop: '1px solid #f1f5f9' }}>
                    <td style={tdStyle}>
                      <span style={{ ...avatarStyle, background: employee.photo ? `url(${employee.photo}) center/cover` : '#dcfce7', color: '#15803d' }}>{employee.photo ? '' : initials(name)}</span>
                      <span><strong style={{ display: 'block' }}>{name}</strong><small style={{ color: '#000000' }}>{employee.email}</small></span>
                    </td>
                    <td style={tdStyle}>{employee.employeeId}</td>
                    <td style={tdStyle}>{employee.jobTitle || '-'}</td>
                    <td style={tdStyle}>{employee.department || '-'}</td>
                    <td style={tdStyle}>
                      {reason && reasonStyle ? (
                        <span style={{ display: 'inline-flex', alignItems: 'center', padding: '3px 9px', borderRadius: 999, background: reasonStyle.bg, color: reasonStyle.color, fontSize: 11, fontWeight: 800 }}>{reason}</span>
                      ) : <span style={{ color: '#000000' }}>Not specified</span>}
                      {employee.exitNotes && <div style={{ marginTop: 4, color: '#000000', fontSize: 11, maxWidth: 220, whiteSpace: 'normal' }}>{employee.exitNotes}</div>}
                    </td>
                    <td style={tdStyle}>{employee.deletedAt ? new Date(employee.deletedAt).toLocaleString() : '-'}</td>
                    <td style={{ ...tdStyle, textAlign: 'right' }}>
                      <button onClick={() => restoreEmployee(employee)} style={restoreButtonStyle}><RotateCcw size={14} /> Reinstate</button>
                      <button onClick={() => deleteForever(employee.id)} style={dangerButtonStyle}><Trash2 size={14} /> Remove</button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {filtered.length === 0 && <EmptyState icon={<Users size={30} />} title="No ex employees" text="People you mark as having left the company will appear here." />}
        </div>
      </section>
    </main>
  )
}

function EmptyState({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) {
  return <div style={{ padding: 44, textAlign: 'center', color: '#000000' }}><div style={{ margin: '0 auto 12px', width: 54, height: 54, borderRadius: '50%', background: '#f1f5f9', display: 'grid', placeItems: 'center' }}>{icon}</div><strong style={{ display: 'block', color: '#0f172a', fontSize: 15 }}>{title}</strong><p style={{ margin: '6px 0 0', fontSize: 13 }}>{text}</p></div>
}

const cardStyle = { background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: 18, boxShadow: '0 8px 24px rgba(15,23,42,0.04)' } as const
const secondaryLinkStyle = { minHeight: 38, border: '1px solid #e5e7eb', borderRadius: 8, background: '#fff', color: '#0f172a', display: 'inline-flex', alignItems: 'center', gap: 8, padding: '0 14px', fontSize: 12, fontWeight: 900, textDecoration: 'none' } as const
const searchStyle = { maxWidth: 380, minHeight: 40, border: '1px solid #e5e7eb', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 8, padding: '0 12px' } as const
const searchInputStyle = { border: 'none', outline: 'none', width: '100%', fontSize: 13, fontFamily: font } as const
const thStyle = { padding: '12px 14px', textAlign: 'left' as const, color: '#000000', fontSize: 11, fontWeight: 900, background: '#fbfdff' }
const tdStyle = { padding: '13px 14px', color: '#0f172a', fontSize: 13, verticalAlign: 'middle' as const }
const avatarStyle = { width: 34, height: 34, borderRadius: '50%', display: 'inline-grid', placeItems: 'center', marginRight: 10, fontSize: 12, fontWeight: 900, overflow: 'hidden', verticalAlign: 'middle' } as const
const restoreButtonStyle = { minHeight: 34, border: '1px solid #bbf7d0', borderRadius: 8, background: '#f0fdf4', color: '#15803d', display: 'inline-flex', alignItems: 'center', gap: 7, padding: '0 11px', marginRight: 8, fontSize: 12, fontWeight: 900, cursor: 'pointer', fontFamily: font } as const
const dangerButtonStyle = { minHeight: 34, border: '1px solid #fecaca', borderRadius: 8, background: '#fff', color: '#dc2626', display: 'inline-flex', alignItems: 'center', gap: 7, padding: '0 11px', fontSize: 12, fontWeight: 900, cursor: 'pointer', fontFamily: font } as const
