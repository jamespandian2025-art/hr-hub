'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, FileText, RotateCcw, Search, Trash2 } from 'lucide-react'
import {
  buildRows, dateSpan, employeeKey, formatDateTime, initials, leaveRequestKey,
  leaveTypeTone, loadStored, saveStored, statusTone,
  type Employee, type LeaveRequest, type LeaveRow,
} from '../../leave-requests/leaveData'

const font = "var(--font-body)"
const deletedApprovalsKey = 'flowsys-hr-deleted-approvals'

type DeletedApproval = LeaveRequest & { deletedAt?: string }

export default function DeletedApprovalsPage() {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [approvals, setApprovals] = useState<DeletedApproval[]>([])
  const [query, setQuery] = useState('')

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setEmployees(loadStored<Employee[]>(employeeKey, []))
      setApprovals(loadStored<DeletedApproval[]>(deletedApprovalsKey, []))
    }, 0)
    return () => window.clearTimeout(timer)
  }, [])

  const rows = useMemo(() => buildRows(employees, approvals), [approvals, employees])
  const filtered = useMemo(() => {
    const clean = query.trim().toLowerCase()
    return rows.filter(row => !clean || `${row.id} ${row.employeeName} ${row.employeeCode} ${row.leaveType} ${row.department}`.toLowerCase().includes(clean))
  }, [query, rows])

  function persistDeleted(next: DeletedApproval[]) {
    setApprovals(next)
    saveStored(deletedApprovalsKey, next)
  }

  function restoreApproval(row: LeaveRow) {
    const activeApprovals = loadStored<LeaveRequest[]>(leaveRequestKey, [])
    const original = approvals.find(item => item.id === row.id)
    if (!original) return
    const restored: LeaveRequest = { ...original }
    delete (restored as Partial<DeletedApproval>).deletedAt
    saveStored(leaveRequestKey, [{ ...restored, updatedAt: new Date().toISOString() }, ...activeApprovals.filter(item => item.id !== original.id)])
    persistDeleted(approvals.filter(item => item.id !== original.id))
  }

  function deleteForever(id: string) {
    persistDeleted(approvals.filter(approval => approval.id !== id))
  }

  return (
    <main style={{ fontFamily: font, padding: '0 20px 32px', minHeight: '100vh' }}>
      <div style={{ padding: '20px 0 18px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 14, flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontSize: 12, color: '#000000', marginBottom: 12 }}>HR Hub &gt; Approvals &gt; Deleted Approvals</div>
          <h1 style={{ margin: 0, color: '#0f172a', fontSize: 24 }}>Deleted Approvals</h1>
          <p style={{ margin: '6px 0 0', color: '#000000', fontSize: 13 }}>Restore approval requests or delete them forever.</p>
        </div>
        <Link href="/hr/approvals" style={secondaryLinkStyle}><ArrowLeft size={15} /> Back to Approvals</Link>
      </div>

      <section style={cardStyle}>
        <label style={searchStyle}>
          <Search size={15} color="#000000" />
          <input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search deleted approvals..." style={searchInputStyle} />
        </label>
        <div style={{ overflowX: 'auto', marginTop: 16 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 980 }}>
            <thead><tr>{['Request', 'Employee', 'Leave Type', 'Dates', 'Status', 'Deleted On', 'Actions'].map(header => <th key={header} style={thStyle}>{header}</th>)}</tr></thead>
            <tbody>
              {filtered.map(row => {
                const typeTone = leaveTypeTone(row.leaveType)
                const st = statusTone(row.status)
                const deletedAt = approvals.find(item => item.id === row.id)?.deletedAt
                return (
                  <tr key={row.id} style={{ borderTop: '1px solid #f1f5f9' }}>
                    <td style={tdStyle}><strong style={{ color: '#16a34a' }}>{row.id}</strong></td>
                    <td style={tdStyle}><span style={avatarStyle}>{initials(row.employeeName)}</span><span><strong style={{ display: 'block' }}>{row.employeeName}</strong><small style={{ color: '#000000' }}>{row.employeeCode}</small></span></td>
                    <td style={tdStyle}><span style={{ ...pillStyle, background: typeTone.bg, color: typeTone.text }}>{row.leaveType}</span></td>
                    <td style={tdStyle}>{dateSpan(row)}</td>
                    <td style={tdStyle}><span style={{ ...pillStyle, background: st.bg, color: st.text }}>{row.status}</span></td>
                    <td style={tdStyle}>{deletedAt ? formatDateTime(deletedAt) : '-'}</td>
                    <td style={{ ...tdStyle, textAlign: 'right' }}>
                      <button onClick={() => restoreApproval(row)} style={restoreButtonStyle}><RotateCcw size={14} /> Restore</button>
                      <button onClick={() => deleteForever(row.id)} style={dangerButtonStyle}><Trash2 size={14} /> Delete forever</button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {filtered.length === 0 && <EmptyState icon={<FileText size={30} />} title="No deleted approvals" text="Deleted approvals will appear here before they are removed forever." />}
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
const avatarStyle = { width: 34, height: 34, borderRadius: '50%', background: '#dcfce7', color: '#15803d', display: 'inline-grid', placeItems: 'center', marginRight: 10, fontSize: 12, fontWeight: 900, verticalAlign: 'middle' } as const
const pillStyle = { display: 'inline-flex', alignItems: 'center', borderRadius: 999, padding: '3px 8px', fontSize: 11, fontWeight: 800 } as const
const restoreButtonStyle = { minHeight: 34, border: '1px solid #bbf7d0', borderRadius: 8, background: '#f0fdf4', color: '#15803d', display: 'inline-flex', alignItems: 'center', gap: 7, padding: '0 11px', marginRight: 8, fontSize: 12, fontWeight: 900, cursor: 'pointer', fontFamily: font } as const
const dangerButtonStyle = { minHeight: 34, border: '1px solid #fecaca', borderRadius: 8, background: '#fff', color: '#dc2626', display: 'inline-flex', alignItems: 'center', gap: 7, padding: '0 11px', fontSize: 12, fontWeight: 900, cursor: 'pointer', fontFamily: font } as const
