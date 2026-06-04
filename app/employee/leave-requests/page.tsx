'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { Filter, MoreHorizontal, Plus, Search } from 'lucide-react'
import {
  formatDate,
  formatDateTime,
  leaveBalanceFor,
  leaveRequestKey,
  LeaveRequest,
  loadStored,
  matchesEmployeeId,
  saveStored,
  useEmployeePortalData,
} from '../employeeData'
import StatusChip from '@/components/employee/StatusChip'
import { updateHrRecord } from '@/lib/hrms/client'

const tabs = ['All', 'Pending', 'Approved', 'Rejected', 'Cancelled'] as const

export default function EmployeeLeaveRequestsPage() {
  const { employee, myLeaveRequests } = useEmployeePortalData()
  const [tab, setTab] = useState<(typeof tabs)[number]>('All')
  const [query, setQuery] = useState('')
  const [type, setType] = useState('All')
  const balances = leaveBalanceFor(myLeaveRequests)
  const types = Array.from(new Set(myLeaveRequests.map(item => item.leaveType))).sort()

  const rows = useMemo(() => myLeaveRequests
    .filter(item => tab === 'All' || item.status === tab)
    .filter(item => type === 'All' || item.leaveType === type)
    .filter(item => {
      const haystack = [item.id, item.leaveType, item.reason, item.status].join(' ').toLowerCase()
      return haystack.includes(query.trim().toLowerCase())
    })
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()), [myLeaveRequests, query, tab, type])

  const cancelRequest = (id: string) => {
    const updatedAt = new Date().toISOString()
    const all = loadStored<LeaveRequest[]>(leaveRequestKey, [])
    const next = all.map(item => item.id === id && matchesEmployeeId(item.employeeId, employee) ? { ...item, status: 'Cancelled' as const, updatedAt } : item)
    saveStored(leaveRequestKey, next)
    window.dispatchEvent(new StorageEvent('storage', { key: leaveRequestKey }))
    // Push the cancellation to the shared HR store so it isn't reverted by the
    // server-wins sync and HR sees it cross-device. The server enforces that an
    // employee may only cancel their own pending request.
    void updateHrRecord('leave-requests', id, { status: 'Cancelled', updatedAt })
      .then(() => window.dispatchEvent(new Event('wiseflow:hr-data-changed')))
      .catch(() => undefined)
  }

  return (
    <div className="employee-page">
      <div className="employee-page-header">
        <div>
          <h1>My HR Requests</h1>
          <p>Track leave and work from home requests in one place.</p>
        </div>
        <Link href="/employee/leave-requests/new" className="employee-primary-button"><Plus size={16} /> New HR Request</Link>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 340px', gap: 16 }}>
        <section>
          <div className="employee-grid">
            {[
              ['Total Requests', myLeaveRequests.length],
              ['Pending', myLeaveRequests.filter(item => item.status === 'Pending').length],
              ['Approved', myLeaveRequests.filter(item => item.status === 'Approved').length],
              ['Rejected', myLeaveRequests.filter(item => item.status === 'Rejected').length],
              ['Cancelled', myLeaveRequests.filter(item => item.status === 'Cancelled').length],
            ].map(([label, value]) => (
              <div key={label} className="employee-card" style={{ padding: 18 }}>
                <div style={{ color: '#000000', fontSize: 13, fontWeight: 800 }}>{label}</div>
                <strong style={{ display: 'block', marginTop: 6, fontSize: 25 }}>{value}</strong>
              </div>
            ))}
          </div>

          <div className="employee-panel" style={{ marginTop: 16, overflow: 'hidden' }}>
            <div style={{ display: 'flex', gap: 24, padding: '0 16px', borderBottom: '1px solid #e2e8f0' }}>
              {tabs.map(item => (
                <button key={item} type="button" onClick={() => setTab(item)} style={{ height: 50, border: 0, borderBottom: tab === item ? '2px solid #16a34a' : '2px solid transparent', background: 'transparent', color: tab === item ? '#16a34a' : '#334155', fontWeight: 850, cursor: 'pointer' }}>
                  {item}
                </button>
              ))}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '180px 180px minmax(220px, 1fr) 42px', gap: 12, padding: 16 }}>
              <select value={type} onChange={event => setType(event.target.value)} style={controlStyle}>
                <option>All</option>
                {types.map(item => <option key={item}>{item}</option>)}
              </select>
              <select value={tab} onChange={event => setTab(event.target.value as typeof tab)} style={controlStyle}>
                {tabs.map(item => <option key={item}>{item}</option>)}
              </select>
              <label style={{ ...controlStyle, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Search size={16} />
                <input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search by reason or leave ID..." style={{ border: 0, outline: 0, width: '100%', font: 'inherit', background: 'transparent' }} />
              </label>
              <button type="button" className="employee-secondary-button" aria-label="Filters" style={{ padding: 0 }}><Filter size={16} /></button>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 860 }}>
                <thead style={{ background: '#f8fafc', color: '#000000', fontSize: 12, textAlign: 'left' }}>
                  <tr>
                    {['Request ID', 'Request Type', 'Duration', 'Dates', 'Reason', 'Status', 'Applied On', 'Actions'].map(header => <th key={header} style={{ padding: '12px 16px' }}>{header}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {rows.length === 0 ? (
                    <tr><td colSpan={8} style={{ padding: 42, textAlign: 'center', color: '#000000' }}>No HR requests found.</td></tr>
                  ) : rows.map(item => (
                    <tr key={item.id} style={{ borderTop: '1px solid #eef2f7' }}>
                      <td style={cellStyle}><strong style={{ color: '#16a34a' }}>{item.id}</strong></td>
                      <td style={cellStyle}>{item.leaveType}</td>
                      <td style={cellStyle}>{item.days} Day{item.days === 1 ? '' : 's'}</td>
                      <td style={cellStyle}>{formatDate(item.startDate)} - {formatDate(item.endDate)}</td>
                      <td style={cellStyle}>{item.reason || '-'}</td>
                      <td style={cellStyle}><StatusChip value={item.status} /></td>
                      <td style={cellStyle}>{formatDateTime(item.createdAt)}</td>
                      <td style={cellStyle}>
                        {item.status === 'Pending' ? <button type="button" onClick={() => cancelRequest(item.id)} className="employee-secondary-button">Cancel</button> : <button type="button" className="employee-secondary-button" aria-label="More"><MoreHorizontal size={16} /></button>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        <aside style={{ display: 'grid', gap: 16, alignContent: 'start' }}>
          <section className="employee-panel" style={{ padding: 20 }}>
            <h2 style={{ margin: 0, fontSize: 17 }}>Leave Balance</h2>
            <div style={{ display: 'grid', gap: 15, marginTop: 18 }}>
              {balances.map(item => (
                <div key={item.type}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, fontWeight: 800 }}>
                    <span>{item.type}</span>
                    <span>{item.remaining} / {item.limit} Days</span>
                  </div>
                  <div style={{ height: 7, borderRadius: 99, background: '#e5e7eb', marginTop: 8 }}><div style={{ width: `${(item.remaining / item.limit) * 100}%`, height: '100%', borderRadius: 99, background: item.color }} /></div>
                </div>
              ))}
            </div>
          </section>
          <section className="employee-panel" style={{ padding: 20 }}>
            <h2 style={{ margin: 0, fontSize: 17 }}>Quick Actions</h2>
            <div style={{ display: 'grid', gap: 10, marginTop: 16 }}>
              <Link href="/employee/leave-requests/new" className="employee-secondary-button">New Leave / WFH Request</Link>
              <Link href="/employee/calendar" className="employee-secondary-button">View Leave Calendar</Link>
            </div>
          </section>
        </aside>
      </div>
    </div>
  )
}

const controlStyle = {
  height: 42,
  borderRadius: 8,
  border: '1px solid #e2e8f0',
  background: '#ffffff',
  padding: '0 12px',
  color: '#0f172a',
  fontSize: 13,
  fontWeight: 700,
} as const

const cellStyle = { padding: '14px 16px', color: '#0f172a', fontSize: 13, verticalAlign: 'middle' } as const
