'use client'

import { useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
  ArrowLeft, Briefcase, CalendarDays, CheckCircle2, Download,
  FileText, Mail, MessageSquare, UserRound, X,
} from 'lucide-react'
import {
  approvalState, buildRows, dateSpan, decideLeaveRequest, downloadCsv, employeeKey, formatDateTime,
  formatDay, fullName, initials, leaveRequestKey, leaveTypeTone,
  loadLeaveRequests, loadStored, normalizeStatus, saveStored, statusTone,
  type Employee, type LeaveRequest, type LeaveRow, type LeaveStatus,
} from '../../leave-requests/leaveData'

const font = "var(--font-body)"

export default function ApprovalDetailPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const [employees, setEmployees] = useState<Employee[]>([])
  const [requests, setRequests] = useState<LeaveRequest[]>([])

  useEffect(() => {
    const load = () => {
      setEmployees(loadStored<Employee[]>(employeeKey, []))
      setRequests(loadLeaveRequests())
    }
    load()
    window.addEventListener('storage', load)
    return () => window.removeEventListener('storage', load)
  }, [])

  const row = useMemo(() => {
    const requestId = decodeURIComponent(String(params.id || ''))
    return buildRows(employees, requests).find(item => item.id === requestId) || null
  }, [employees, params.id, requests])

  function persistStatus(status: LeaveStatus) {
    if (!row) return
    const next = requests.map(request => {
      if (request.id !== row.id) return request
      if (status === 'Cancelled') return { ...request, status, approvalStep: 'complete' as const, updatedAt: new Date().toISOString() }
      if (status === 'Pending') return { ...request, status, updatedAt: new Date().toISOString() }
      return decideLeaveRequest(request, row.employee, 'hr', status)
    })
    setRequests(next)
    saveStored(leaveRequestKey, next)
  }

  function exportDetail() {
    if (!row) return
    downloadCsv(`${row.id}-approval.csv`, [
      ['Field', 'Value'],
      ['Request ID', row.id],
      ['Employee', row.employeeName],
      ['Employee ID', row.employeeCode],
      ['Department', row.department],
      ['Job Title', row.jobTitle],
      ['Leave Type', row.leaveType],
      ['Duration', `${row.days} day${row.days === 1 ? '' : 's'}`],
      ['Dates', dateSpan(row)],
      ['Reason', row.reason || ''],
      ['Status', normalizeStatus(row.status)],
      ['Submitted On', formatDateTime(row.createdAt)],
      ['Updated On', formatDateTime(row.updatedAt)],
    ])
  }

  if (!row && requests.length > 0) {
    return (
      <div className="hr-module-page" style={{ fontFamily: font }}>
        <button onClick={() => router.push('/hr/approvals')} style={secondaryButtonStyle}><ArrowLeft size={15} /> Back to Approvals</button>
        <div style={{ ...cardStyle, marginTop: 18, textAlign: 'center', color: '#000000' }}>Approval request not found.</div>
      </div>
    )
  }

  if (!row) {
    return (
      <div className="hr-module-page" style={{ fontFamily: font }}>
        <button onClick={() => router.push('/hr/approvals')} style={secondaryButtonStyle}><ArrowLeft size={15} /> Back to Approvals</button>
        <div style={{ ...cardStyle, marginTop: 18, textAlign: 'center', color: '#000000' }}>No approval request selected.</div>
      </div>
    )
  }

  const st = statusTone(row.status)
  const typeTone = leaveTypeTone(row.leaveType)
  const isPending = normalizeStatus(row.status) === 'Pending'
  const approval = approvalState(row, row.employee)
  const employeeName = fullName(row.employee) || row.employeeName

  return (
    <div className="hr-module-page" style={{ fontFamily: font }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 14, marginBottom: 18 }}>
        <div>
          <div style={{ color: '#000000', fontSize: 12, marginBottom: 22 }}>Approvals&nbsp;&nbsp;&gt;&nbsp;&nbsp;<strong style={{ color: '#0f172a' }}>Approval Details</strong></div>
          <h1 style={{ margin: 0, fontSize: 26, color: '#0f172a', letterSpacing: '-0.5px' }}>Approval Details</h1>
          <p style={{ margin: '6px 0 0', color: '#000000', fontSize: 13 }}>Review this saved request and take action.</p>
        </div>
        <button onClick={() => router.push('/hr/approvals')} style={secondaryButtonStyle}><ArrowLeft size={15} /> Back to Approvals</button>
      </div>

      <div style={{ ...cardStyle, marginBottom: 18 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(260px, 1fr) repeat(4, minmax(140px, 190px))', gap: 20, alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
            <Avatar row={row} size={82} />
            <div>
              <h2 style={{ margin: 0, color: '#0f172a', fontSize: 18 }}>{employeeName}</h2>
              <div style={{ color: '#000000', fontSize: 12, marginTop: 6 }}>{row.jobTitle} {row.department !== '-' ? `â€¢ ${row.department}` : ''}</div>
              <div style={{ color: '#16a34a', fontSize: 12, marginTop: 8, fontWeight: 800 }}>Employee ID: <span style={{ color: '#334155' }}>{row.employeeCode}</span></div>
            </div>
          </div>
          <HeaderFact icon={FileText} label="Request ID" value={row.id} accent />
          <HeaderFact icon={UserRound} label="Leave Type" value={row.leaveType} />
          <HeaderFact icon={CalendarDays} label="Duration" value={`${row.days} Day${row.days === 1 ? '' : 's'}`} />
          <HeaderFact icon={CalendarDays} label="Dates" value={dateSpan(row)} sub={`${formatDay(row.startDate)} - ${formatDay(row.endDate)}`} />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 420px', gap: 20 }}>
        <div style={{ display: 'grid', gap: 18, minWidth: 0 }}>
          <div style={cardStyle}>
            <SectionTitle title="Request Details" />
            <DetailRow label="Reason" value={row.reason || '-'} />
            <DetailRow label="Leave Type" value={row.leaveType} badge={{ bg: typeTone.bg, color: typeTone.text }} />
            <DetailRow label="Status" value={normalizeStatus(row.status)} badge={{ bg: st.bg, color: st.text }} />
            <DetailRow label="Submitted On" value={formatDateTime(row.createdAt)} />
            <DetailRow label="Updated On" value={formatDateTime(row.updatedAt)} />
            <DetailRow label="Employee Email" value={row.employee?.email || '-'} icon={Mail} />
            <DetailRow label="Employee Phone" value={row.employee?.phone || '-'} />
            <DetailRow label="Department" value={row.department} icon={Briefcase} />
          </div>

          <div style={cardStyle}>
            <SectionTitle title="Attachments" />
            <div style={{ color: '#000000', fontSize: 13 }}>No attachments uploaded for this request.</div>
          </div>

          <div style={{ ...cardStyle, background: '#f0fdf4', borderColor: '#bbf7d0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
            <span style={{ color: '#15803d', fontSize: 13 }}>Review the saved request details before taking action.</span>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <button onClick={exportDetail} style={secondaryButtonStyle}><Download size={15} /> Export</button>
              {isPending && approval.canHrDecide && <button onClick={() => persistStatus('Rejected')} style={rejectButtonStyle}><X size={15} /> Reject</button>}
              {isPending && approval.canHrDecide && <button onClick={() => persistStatus('Approved')} style={approveButtonStyle}><CheckCircle2 size={15} /> Approve</button>}
              {isPending && !approval.canHrDecide && <span style={{ color: '#92400e', fontSize: 13, fontWeight: 900 }}>{approval.helper}</span>}
            </div>
          </div>
        </div>

        <aside style={{ display: 'grid', gap: 18, alignContent: 'start' }}>
          <div style={cardStyle}>
            <SectionTitle title="Approval Workflow" />
            <WorkflowItem done label="Request Submitted" detail={formatDateTime(row.createdAt)} />
            <WorkflowItem active={approval.step === 'hr'} done={approval.hrStatus === 'Approved'} label="HR Approval" detail={approval.hrStatus} />
            <WorkflowItem done={approval.step === 'complete'} label="Final Record" detail={row.updatedAt ? formatDateTime(row.updatedAt) : '-'} />
          </div>

          <div style={cardStyle}>
            <SectionTitle title="Activity" icon={MessageSquare} />
            <ActivityItem dot="#16a34a" title="Request submitted" detail={formatDateTime(row.createdAt)} />
            {row.updatedAt && <ActivityItem dot={st.dot} title={`Request ${normalizeStatus(row.status).toLowerCase()}`} detail={formatDateTime(row.updatedAt)} />}
          </div>
        </aside>
      </div>
    </div>
  )
}

function Avatar({ row, size }: { row: LeaveRow; size: number }) {
  return <span style={{ width: size, height: size, borderRadius: '50%', background: row.photo ? `url(${row.photo}) center/cover` : '#dcfce7', color: '#15803d', display: 'grid', placeItems: 'center', fontSize: size > 60 ? 22 : 11, fontWeight: 900, flexShrink: 0 }}>{row.photo ? '' : initials(row.employeeName)}</span>
}

function HeaderFact({ icon: Icon, label, value, sub, accent }: { icon: React.ComponentType<{ size?: number; color?: string }>; label: string; value: string; sub?: string; accent?: boolean }) {
  return <div style={{ borderLeft: '1px solid #e5e7eb', paddingLeft: 20 }}><div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#000000', fontSize: 12, marginBottom: 10 }}><Icon size={15} color="#000000" />{label}</div><strong style={{ color: accent ? '#16a34a' : '#0f172a', fontSize: 13 }}>{value}</strong>{sub && <div style={{ color: '#000000', fontSize: 12, marginTop: 7 }}>{sub}</div>}</div>
}

function SectionTitle({ title, icon: Icon }: { title: string; icon?: React.ComponentType<{ size?: number; color?: string }> }) {
  return <div style={{ display: 'flex', alignItems: 'center', gap: 8, borderBottom: '1px solid #f1f5f9', margin: '-18px -18px 14px', padding: '16px 18px' }}>{Icon && <Icon size={16} color="#000000" />}<strong style={{ color: '#0f172a', fontSize: 14 }}>{title}</strong></div>
}

function DetailRow({ label, value, badge, icon: Icon }: { label: string; value: string; badge?: { bg: string; color: string }; icon?: React.ComponentType<{ size?: number; color?: string }> }) {
  return <div style={{ display: 'grid', gridTemplateColumns: '220px minmax(0, 1fr)', gap: 16, padding: '13px 0', borderBottom: '1px solid #f8fafc', fontSize: 13 }}><span style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#000000' }}>{Icon && <Icon size={14} color="#000000" />}{label}</span><span style={{ color: '#0f172a' }}>{badge ? <span style={{ borderRadius: 999, background: badge.bg, color: badge.color, padding: '3px 9px', fontSize: 11, fontWeight: 800 }}>{value}</span> : value}</span></div>
}

function WorkflowItem({ label, detail, done, active }: { label: string; detail: string; done?: boolean; active?: boolean }) {
  return <div style={{ display: 'grid', gridTemplateColumns: '38px 1fr', gap: 12, padding: '12px 0' }}><span style={{ width: 30, height: 30, borderRadius: '50%', background: done ? '#16a34a' : active ? '#dcfce7' : '#f1f5f9', color: done ? '#fff' : active ? '#15803d' : '#000000', display: 'grid', placeItems: 'center', fontWeight: 900, fontSize: 12 }}>{done ? 'âœ“' : active ? '2' : '3'}</span><span><strong style={{ display: 'block', color: '#0f172a', fontSize: 13 }}>{label}</strong><small style={{ color: '#000000' }}>{detail}</small></span></div>
}

function ActivityItem({ dot, title, detail }: { dot: string; title: string; detail: string }) {
  return <div style={{ display: 'grid', gridTemplateColumns: '12px 1fr', gap: 10, padding: '10px 0' }}><span style={{ width: 7, height: 7, borderRadius: '50%', background: dot, marginTop: 6 }} /><span><strong style={{ display: 'block', color: '#0f172a', fontSize: 13 }}>{title}</strong><small style={{ color: '#000000' }}>{detail}</small></span></div>
}

const cardStyle = { background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, boxShadow: '0 8px 24px rgba(15,23,42,0.04)', padding: 18 } as const
const secondaryButtonStyle = { minHeight: 38, border: '1px solid #e5e7eb', borderRadius: 8, background: '#fff', color: '#0f172a', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '0 15px', fontSize: 12, fontWeight: 900, cursor: 'pointer', fontFamily: font } as const
const approveButtonStyle = { minHeight: 38, border: '1px solid #16a34a', borderRadius: 8, background: '#16a34a', color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '0 15px', fontSize: 12, fontWeight: 900, cursor: 'pointer', fontFamily: font } as const
const rejectButtonStyle = { minHeight: 38, border: '1px solid #fca5a5', borderRadius: 8, background: '#fff', color: '#dc2626', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '0 15px', fontSize: 12, fontWeight: 900, cursor: 'pointer', fontFamily: font } as const
