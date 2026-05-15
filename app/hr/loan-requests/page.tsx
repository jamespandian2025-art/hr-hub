'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { CheckCircle2, Clock3, HandCoins, Search, ShieldCheck, XCircle } from 'lucide-react'
import type { ComponentType } from 'react'
import type { Employee } from '@/app/employee/employeeData'
import { employeeKey, fullName, initials, loadStored } from '@/app/employee/employeeData'
import {
  formatDateTime,
  loadLoanRequests,
  loanApprovalState,
  loanScheduledDeduction,
  LoanRequest,
  money,
  resolveLoanEmployee,
} from './loanData'
import { listHrRecords } from '@/lib/hrms/client'

type Filter = 'All' | 'Waiting Finance' | 'Approved for Payroll' | 'Processed' | 'Rejected'

function uniqueLoanRequests(rows: LoanRequest[]) {
  const map = new Map<string, LoanRequest>()
  rows.forEach((row, index) => {
    const key = row.id || `loan-${index}`
    map.set(key, { ...map.get(key), ...row })
  })
  return Array.from(map.values())
}

export default function HrLoanRequestsPage() {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [requests, setRequests] = useState<LoanRequest[]>([])
  const [filter, setFilter] = useState<Filter>('All')
  const [query, setQuery] = useState('')
  const [notice, setNotice] = useState('')

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      setEmployees(loadStored<Employee[]>(employeeKey, []))
      const localRequests = loadLoanRequests()
      try {
        const serverRequests = await listHrRecords<LoanRequest>('loan-requests', {
          'x-hr-role': 'HR',
          'x-hr-user-name': 'HR Loan Request View',
        })
        const merged = uniqueLoanRequests([...serverRequests, ...localRequests])
        if (!cancelled) setRequests(current => merged.length > 0 || current.length === 0 ? merged : current)
      } catch {
        if (!cancelled) setRequests(current => localRequests.length > 0 || current.length === 0 ? localRequests : current)
      }
    }
    void load()
    window.addEventListener('storage', load)
    window.addEventListener('focus', load)
    window.addEventListener('wiseflow:finance-requests-changed', load)
    const timer = window.setInterval(load, 2500)
    return () => {
      cancelled = true
      window.removeEventListener('storage', load)
      window.removeEventListener('focus', load)
      window.removeEventListener('wiseflow:finance-requests-changed', load)
      window.clearInterval(timer)
    }
  }, [])

  const rows = useMemo(() => requests.map(request => {
    const employee = resolveLoanEmployee(request, employees)
    const state = loanApprovalState(request)
    return { request, employee, state }
  }), [employees, requests])

  const filteredRows = rows.filter(row => {
    const bucket = row.state.step === 'finance'
      ? 'Waiting Finance'
      : row.request.status === 'Approved'
          ? 'Approved for Payroll'
          : row.request.status
    const matchesFilter = filter === 'All' || bucket === filter
    const term = query.trim().toLowerCase()
    const matchesSearch = !term || [
      row.request.id,
      row.request.employeeName,
      row.request.employeeCode,
      row.request.department,
      row.request.requestType,
      row.request.status,
      row.request.reason,
    ].some(value => String(value || '').toLowerCase().includes(term))
    return matchesFilter && matchesSearch
  })

  const stats = [
    { label: 'Total Requests', value: requests.length, icon: HandCoins, color: '#2563eb', bg: '#dbeafe' },
    { label: 'Waiting Finance', value: rows.filter(row => row.state.step === 'finance').length, icon: Clock3, color: '#d97706', bg: '#fef3c7' },
    { label: 'Approved for Payroll', value: rows.filter(row => row.request.status === 'Approved').length, icon: CheckCircle2, color: '#16a34a', bg: '#dcfce7' },
    { label: 'Rejected', value: rows.filter(row => row.request.status === 'Rejected').length, icon: XCircle, color: '#dc2626', bg: '#fee2e2' },
  ]

  return (
    <div className="hr-module-page">
      <div style={pageHeaderStyle}>
        <div>
          <h1 style={pageTitleStyle}>Loan Requests</h1>
          <p style={pageSubtitleStyle}>HR has read-only visibility into employee loans. Finance owns loan approvals, payment terms, schedules, and deduction controls.</p>
        </div>
        <Link href="/financials/loan-management" style={financeLinkStyle}><ShieldCheck size={15} /> Finance controls</Link>
      </div>

      {notice && <div style={noticeStyle}>{notice}<button onClick={() => setNotice('')} style={dismissButtonStyle}>Dismiss</button></div>}

      <div style={metricGridStyle}>
        {stats.map(item => <Metric key={item.label} {...item} />)}
      </div>

      <div style={tabsStyle}>
        {(['All', 'Waiting Finance', 'Approved for Payroll', 'Processed', 'Rejected'] as Filter[]).map(item => (
          <button key={item} onClick={() => setFilter(item)} style={tabStyle(filter === item)}>{item}</button>
        ))}
      </div>

      <section style={{ ...cardStyle, padding: 0, borderTopLeftRadius: 0, borderTopRightRadius: 0 }}>
        <div style={tableHeaderStyle}>
          <div>
            <strong style={{ display: 'block', color: '#0f172a', fontSize: 16 }}>Loan and Cash Advance Requests</strong>
            <span style={{ display: 'block', color: '#64748b', fontSize: 13, marginTop: 4 }}>Read-only tracker. Finance is the only role that can approve, reject, or modify loan deductions.</span>
          </div>
          <label style={searchStyle}><Search size={15} /><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search loan requests..." /></label>
        </div>
        {!filteredRows.length ? <EmptyState text="No loan or cash advance requests found." /> : (
          <div style={{ overflowX: 'auto' }}>
            <table style={tableStyle}>
              <thead><tr><Th>Employee</Th><Th>Request</Th><Th>Amount</Th><Th>Repayment</Th><Th>Workflow</Th><Th>Status</Th><Th>Submitted</Th><Th>Access</Th></tr></thead>
              <tbody>{filteredRows.map(({ request, employee, state }) => (
                <tr key={request.id} style={trStyle}>
                  <Td><EmployeeCell employee={employee} fallback={request.employeeName} /></Td>
                  <Td><strong>{request.customLoanType || request.requestType}</strong><small style={mutedLine}>{request.reason || '-'}</small></Td>
                  <Td><strong>{money(request.amount)}</strong></Td>
                  <Td>{money(loanScheduledDeduction(request))} x {request.repaymentMonths}<small style={mutedLine}>{request.deductionPaused ? 'Paused by Finance' : request.deductionSchedule || 'Twice a month'}</small></Td>
                  <Td>{state.label}</Td>
                  <Td><Badge value={request.status} /></Td>
                  <Td>{formatDateTime(request.createdAt)}</Td>
                  <Td>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      <span style={{ color: '#64748b', fontSize: 12 }}>{state.step === 'finance' ? 'Waiting Finance' : 'View only'}</span>
                    </div>
                  </Td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}

function Metric({ label, value, icon: Icon, color, bg }: { label: string; value: number; icon: ComponentType<{ size?: number }>; color: string; bg: string }) {
  return <div style={metricStyle}><span style={{ ...metricIconStyle, color, background: bg }}><Icon size={22} /></span><span><small style={{ color: '#64748b', fontSize: 13 }}>{label}</small><strong style={{ display: 'block', color: '#0f172a', fontSize: 25, marginTop: 3 }}>{value}</strong></span></div>
}

function EmployeeCell({ employee, fallback }: { employee?: Employee; fallback?: string }) {
  const name = fullName(employee) || fallback || '-'
  return <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>{employee?.photo ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={employee.photo} alt="" style={avatarStyle} />
  ) : <span style={avatarFallback}>{initials(name)}</span>}<span><strong style={{ display: 'block' }}>{name}</strong><small style={{ color: '#64748b' }}>{employee?.employeeId || employee?.jobTitle || '-'}</small></span></div>
}

function Badge({ value }: { value: string }) {
  const tone = value === 'Approved' || value === 'Processed' ? { bg: '#dcfce7', text: '#15803d' } : value === 'Rejected' ? { bg: '#fee2e2', text: '#dc2626' } : { bg: '#fef3c7', text: '#d97706' }
  return <span style={{ borderRadius: 999, padding: '4px 10px', background: tone.bg, color: tone.text, fontWeight: 900, fontSize: 12 }}>{value}</span>
}

function EmptyState({ text }: { text: string }) {
  return <div style={{ display: 'grid', placeItems: 'center', minHeight: 220, color: '#64748b', fontSize: 14 }}>{text}</div>
}

function Th({ children }: { children: React.ReactNode }) { return <th style={thStyle}>{children}</th> }
function Td({ children }: { children: React.ReactNode }) { return <td style={tdStyle}>{children}</td> }

const pageHeaderStyle = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', marginBottom: 18 } as const
const pageTitleStyle = { margin: 0, fontSize: 28, fontWeight: 900, color: '#0f172a' } as const
const pageSubtitleStyle = { margin: '6px 0 0', color: '#475569', fontSize: 14 } as const
const noticeStyle = { display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', padding: 12, borderRadius: 10, background: '#ecfdf5', color: '#047857', fontWeight: 800, fontSize: 13, marginBottom: 16 } as const
const dismissButtonStyle = { border: '0', background: 'transparent', color: '#047857', fontWeight: 900, cursor: 'pointer' } as const
const metricGridStyle = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 14, marginBottom: 18 } as const
const metricStyle = { border: '1px solid #e2e8f0', borderRadius: 12, background: '#fff', padding: 18, display: 'flex', alignItems: 'center', gap: 14, boxShadow: '0 12px 30px rgba(15,23,42,.05)' } as const
const metricIconStyle = { width: 52, height: 52, borderRadius: 14, display: 'grid', placeItems: 'center' } as const
const tabsStyle = { display: 'flex', gap: 20, borderBottom: '1px solid #e2e8f0', overflowX: 'auto' } as const
const tabStyle = (active: boolean) => ({ border: 0, background: 'transparent', padding: '14px 0', borderBottom: active ? '2px solid #16a34a' : '2px solid transparent', color: active ? '#009d4f' : '#334155', fontSize: 13, fontWeight: 900, cursor: 'pointer', whiteSpace: 'nowrap' } as const)
const cardStyle = { border: '1px solid #e2e8f0', borderRadius: 12, background: '#fff', boxShadow: '0 12px 30px rgba(15,23,42,.05)' } as const
const tableHeaderStyle = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14, padding: 18, borderBottom: '1px solid #e2e8f0', flexWrap: 'wrap' } as const
const searchStyle = { minWidth: 280, display: 'flex', alignItems: 'center', gap: 8, border: '1px solid #e2e8f0', borderRadius: 8, padding: '0 12px', height: 42, color: '#64748b' } as const
const tableStyle = { width: '100%', borderCollapse: 'collapse', fontSize: 13 } as const
const thStyle = { textAlign: 'left', padding: '12px 18px', color: '#475569', background: '#f8fafc', fontWeight: 900, borderBottom: '1px solid #e2e8f0' } as const
const tdStyle = { padding: '14px 18px', borderBottom: '1px solid #e2e8f0', color: '#0f172a', verticalAlign: 'middle' } as const
const trStyle = { background: '#fff' } as const
const mutedLine = { display: 'block', color: '#64748b', marginTop: 4, fontSize: 12 } as const
const avatarStyle = { width: 36, height: 36, borderRadius: '50%', objectFit: 'cover' } as const
const avatarFallback = { width: 36, height: 36, borderRadius: '50%', display: 'grid', placeItems: 'center', background: '#dcfce7', color: '#15803d', fontWeight: 900 } as const
const financeLinkStyle = { minHeight: 38, border: '1px solid #bfdbfe', background: '#eff6ff', color: '#1d4ed8', borderRadius: 8, padding: '0 13px', display: 'inline-flex', alignItems: 'center', gap: 8, textDecoration: 'none', fontSize: 12, fontWeight: 900 } as const
