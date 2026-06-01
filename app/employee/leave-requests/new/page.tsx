'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { CalendarDays, CheckCircle2, FileText, Home, Upload, Trash2 } from 'lucide-react'
import {
  daysBetweenInclusive,
  formatDate,
  leaveBalanceFor,
  leaveDraftsKey,
  leaveRequestKey,
  LeaveRequest,
  loadStored,
  saveStored,
  useEmployeePortalData,
} from '../../employeeData'
import { employeeLeaveOutboxKey } from '@/app/hr/leave-requests/leaveData'
import { createHrRecord } from '@/lib/hrms/client'
import { uploadFileObject } from '@/lib/uploads/client'

const leaveTypes = ['Annual Leave', 'Sick Leave', 'Personal Leave', 'Maternity Leave', 'Paternity Leave', 'Emergency Leave', 'Unpaid Leave', 'Work From Home']

async function uploadLeaveAttachment(file: File) {
  const uploaded = await uploadFileObject(file, 'leave-attachments')
  return {
    name: file.name,
    size: file.size,
    type: file.type,
    dataUrl: uploaded.url,
    fileUrl: uploaded.url,
    objectKey: uploaded.objectKey,
    storageProvider: uploaded.storageProvider,
  }
}

export default function ApplyLeavePage() {
  const router = useRouter()
  const { employee, employeeName, myLeaveRequests } = useEmployeePortalData()
  const [leaveType, setLeaveType] = useState('Annual Leave')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [reason, setReason] = useState('')
  const [contact, setContact] = useState('')
  const [halfDay, setHalfDay] = useState(false)
  const [attachments, setAttachments] = useState<Array<{ name: string; size: number; type: string; dataUrl?: string; fileUrl?: string; objectKey?: string; storageProvider?: string }>>([])
  const [notice, setNotice] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const isWorkFromHome = leaveType === 'Work From Home'
  const days = halfDay ? 0.5 : daysBetweenInclusive(startDate, endDate)
  const balances = leaveBalanceFor(myLeaveRequests)
  const selectedBalance = balances.find(item => item.type === leaveType)
  const requestDate = new Date().toISOString().slice(0, 10)

  const summary = useMemo(() => [
    ['Request Type', leaveType],
    ['Start Date', formatDate(startDate)],
    ['End Date', formatDate(endDate)],
    ['Duration', `${days || 0} Work Day${days === 1 ? '' : 's'}`],
    ['Reason', reason || '-'],
  ], [days, endDate, leaveType, reason, startDate])

  const attachFiles = async (files: FileList | null) => {
    if (!files?.length) return
    try {
      const next = await Promise.all(Array.from(files).map(uploadLeaveAttachment))
      setAttachments(current => [...current, ...next])
    } catch {
      setNotice('Could not upload one or more attachments. Please try again.')
    }
  }

  const buildRequest = (status: 'Pending' | 'Draft'): LeaveRequest => {
    return {
      id: `LR-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`,
      employeeId: employee.id,
      employeeName,
      jobTitle: employee.jobTitle,
      leaveType,
      startDate,
      endDate,
      days,
      reason: isWorkFromHome ? `WFH request: ${reason.trim()}` : reason.trim(),
      status,
      approvalStep: status === 'Draft' ? undefined : 'hr',
      managerApprovalStatus: status === 'Draft' ? undefined : 'Skipped',
      hrApprovalStatus: status === 'Draft' ? undefined : 'Pending',
      contactDuringLeave: contact.trim(),
      attachments,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
  }

  const saveDraft = () => {
    const drafts = loadStored<LeaveRequest[]>(leaveDraftsKey, [])
    saveStored(leaveDraftsKey, [buildRequest('Draft'), ...drafts])
    setNotice('Draft saved on this device.')
  }

  const submit = async () => {
    if (isSubmitting) return
    setNotice('')
    if (!startDate || !endDate || !days) {
      setNotice('Please choose a valid start and end date.')
      return
    }
    if (!reason.trim()) {
      setNotice(`Please add a reason for your ${isWorkFromHome ? 'work from home' : 'leave'} request.`)
      return
    }
    if (!isWorkFromHome && selectedBalance && days > selectedBalance.remaining) {
      setNotice(`You only have ${selectedBalance.remaining} day${selectedBalance.remaining === 1 ? '' : 's'} left for ${leaveType}.`)
      return
    }
    const request = buildRequest('Pending')
    setIsSubmitting(true)
    try {
      const syncedRequest = await createHrRecord<LeaveRequest>('leave-requests', request as unknown as Record<string, unknown>)
      const requests = loadStored<LeaveRequest[]>(leaveRequestKey, [])
      saveStored(leaveRequestKey, [syncedRequest, ...requests.filter(item => item.id !== syncedRequest.id)])
      const outbox = loadStored<LeaveRequest[]>(employeeLeaveOutboxKey, [])
      saveStored(employeeLeaveOutboxKey, [syncedRequest, ...outbox.filter(item => item.id !== syncedRequest.id)])
      window.dispatchEvent(new Event('storage'))
      window.dispatchEvent(new Event('wiseflow:hr-data-changed'))
      router.push('/employee/leave-requests')
    } catch (error) {
      console.error('Could not sync leave request to HR inbox', error)
      const message = error instanceof Error ? error.message : 'HR backend request failed.'
      setNotice(`Could not send this request to HR yet: ${message}`)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="employee-page">
      <div className="employee-page-header" style={pageHeroStyle}>
        <div>
          <span style={eyebrowStyle}>HR REQUEST</span>
          <h1>Submit HR Request</h1>
          <p>Apply for leave or request work from home. Your request will go directly to HR for approval.</p>
        </div>
        <div style={heroMetaStyle}>
          <span style={heroMetaLabelStyle}>Approval route</span>
          <strong>Employee → HR</strong>
        </div>
      </div>

      <div style={layoutStyle}>
        <section className="employee-panel" style={formPanelStyle}>
          {notice && <div style={notice.includes('saved') ? successNoticeStyle : errorNoticeStyle}>{notice}</div>}
          <div style={sectionBlockStyle}>
          <h2 style={sectionTitle}><span style={stepBadge}>1</span> Request Details</h2>
          <div style={formGrid}>
            <label style={labelStyle}>Request Type *<select value={leaveType} onChange={event => setLeaveType(event.target.value)} style={inputStyle}>{leaveTypes.map(item => <option key={item}>{item}</option>)}</select></label>
            <label style={labelStyle}>Request Date<input value={requestDate} readOnly style={inputStyle} /></label>
            <label style={labelStyle}>Start Date *<input type="date" value={startDate} onChange={event => setStartDate(event.target.value)} style={inputStyle} /></label>
            <label style={labelStyle}>End Date *<input type="date" value={endDate} onChange={event => setEndDate(event.target.value)} style={inputStyle} /></label>
          </div>
          <div style={durationRowStyle}>
            <label style={labelStyle}>Duration<input value={days || 0} readOnly style={{ ...inputStyle, width: 120 }} /></label>
            <span style={typePillStyle(isWorkFromHome)}>{isWorkFromHome ? 'WFH Days' : 'Working Days'}</span>
            <label style={checkLabelStyle}>
              <input type="checkbox" checked={halfDay} onChange={event => setHalfDay(event.target.checked)} /> Half day
            </label>
          </div>
          </div>

          <div style={sectionBlockStyle}>
          <h2 style={sectionTitle}><span style={stepBadge}>2</span> Additional Information</h2>
          <label style={labelStyle}>{isWorkFromHome ? 'Reason / Work Plan *' : 'Reason for Leave *'}<textarea value={reason} onChange={event => setReason(event.target.value)} placeholder={isWorkFromHome ? 'Tell HR your WFH reason, work setup, and expected outputs.' : 'Tell HR why you need this leave.'} style={{ ...inputStyle, height: 96, paddingTop: 12, resize: 'vertical' }} /></label>
          <label style={{ ...labelStyle, marginTop: 14 }}>{isWorkFromHome ? 'Reachable Contact / Location (Optional)' : 'Contact During Leave (Optional)'}<input value={contact} onChange={event => setContact(event.target.value)} placeholder={isWorkFromHome ? 'Home address, mobile, or work location notes' : '+63...'} style={inputStyle} /></label>
          </div>

          <div style={sectionBlockStyle}>
          <h2 style={sectionTitle}><span style={stepBadge}>3</span> Attachments <em style={{ color: '#64748b', fontStyle: 'normal', fontWeight: 600 }}>(Optional)</em></h2>
          <label onDragOver={event => event.preventDefault()} onDrop={event => { event.preventDefault(); void attachFiles(event.dataTransfer.files) }} style={uploadBoxStyle}>
            <span style={uploadIconStyle}><Upload size={20} /></span>
            <strong>Upload supporting files</strong>
            <small style={{ color: '#64748b', fontWeight: 600 }}>PDF, JPG, PNG up to your browser limit</small>
            <input type="file" multiple onChange={event => void attachFiles(event.target.files)} style={{ display: 'none' }} />
          </label>
          {attachments.length > 0 && <div style={{ display: 'grid', gap: 8, marginTop: 12 }}>
            {attachments.map(file => (
              <div key={file.name} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: 12, border: '1px solid #e2e8f0', borderRadius: 8 }}>
                <span><strong>{file.name}</strong><small style={{ display: 'block', color: '#64748b' }}>{Math.round(file.size / 1024)} KB</small></span>
                <button type="button" onClick={() => setAttachments(current => current.filter(item => item.name !== file.name))} className="employee-secondary-button" aria-label="Remove attachment"><Trash2 size={15} /></button>
              </div>
            ))}
          </div>}
          </div>

          <div style={actionBarStyle}>
            <button type="button" onClick={saveDraft} className="employee-secondary-button">Save as Draft</button>
            <button type="button" onClick={submit} disabled={isSubmitting} className="employee-primary-button">{isSubmitting ? 'Sending...' : 'Submit to HR'}</button>
          </div>
        </section>

        <aside style={sideRailStyle}>
          <section className="employee-panel" style={sideCardStyle}>
            <div style={sideCardHeaderStyle}>
              <span style={sideIconStyle}>{isWorkFromHome ? <Home size={16} /> : <FileText size={16} />}</span>
              <h2 style={sideTitleStyle}>{isWorkFromHome ? 'Work From Home Notes' : 'Leave Balance'}</h2>
            </div>
            {isWorkFromHome ? (
              <p style={{ margin: '12px 0 0', color: '#64748b', fontSize: 13, lineHeight: 1.6 }}>WFH requests do not reduce leave balances. HR reviews the date range, reason, contact details, and work plan before approval.</p>
            ) : (
              <div style={{ display: 'grid', gap: 14, marginTop: 18 }}>
                {balances.map(item => <div key={item.type}><div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, fontWeight: 800 }}><span>{item.type}</span><span>{item.remaining} / {item.limit} Days</span></div><div style={{ height: 7, borderRadius: 99, background: '#e2e8f0', marginTop: 8 }}><div style={{ height: '100%', width: `${(item.remaining / item.limit) * 100}%`, borderRadius: 99, background: item.color }} /></div></div>)}
              </div>
            )}
          </section>
          <section className="employee-panel" style={sideCardStyle}>
            <h2 style={sideTitleStyle}>Request Summary</h2>
            <div style={{ display: 'grid', gap: 10, marginTop: 16 }}>{summary.map(([label, value]) => <div key={label} style={summaryRowStyle}><span style={{ color: '#64748b' }}>{label}</span><strong style={{ textAlign: 'right' }}>{value}</strong></div>)}</div>
          </section>
          <section className="employee-panel" style={sideCardStyle}>
            <h2 style={sideTitleStyle}>Approval Workflow</h2>
            <div style={{ display: 'grid', gap: 14, marginTop: 16 }}>
              <WorkflowRow done label="Employee" value={`${employeeName} (You)`} />
              <WorkflowRow label="HR" value="Human Resources approval" />
              <WorkflowRow label="Final Record" value="Saved after HR decision" />
            </div>
          </section>
        </aside>
      </div>
    </div>
  )
}

function WorkflowRow({ label, value, done }: { label: string; value: string; done?: boolean }) {
  return <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}><span style={{ width: 28, height: 28, borderRadius: '50%', display: 'grid', placeItems: 'center', background: done ? '#16a34a' : '#eff6ff', color: done ? '#fff' : '#2563eb' }}>{done ? <CheckCircle2 size={16} /> : <CalendarDays size={15} />}</span><span><strong style={{ display: 'block', fontSize: 13 }}>{label}</strong><small style={{ color: '#64748b' }}>{value}</small></span></div>
}

const pageHeroStyle = { alignItems: 'center', gap: 18 }
const eyebrowStyle = { display: 'block', color: '#16a34a', fontSize: 11, fontWeight: 900, letterSpacing: 0, marginBottom: 7 }
const heroMetaStyle = { border: '1px solid #dbeafe', background: '#eff6ff', borderRadius: 12, padding: '12px 14px', color: '#1e40af', display: 'grid', gap: 4, minWidth: 180 }
const heroMetaLabelStyle = { fontSize: 11, color: '#64748b', fontWeight: 800 }
const layoutStyle = { display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(300px, 360px)', gap: 18, alignItems: 'start' } as const
const formPanelStyle = { padding: 0, overflow: 'hidden' }
const sectionBlockStyle = { padding: '22px 24px', borderBottom: '1px solid #edf2f7' }
const sectionTitle = { display: 'flex', alignItems: 'center', gap: 10, margin: '0 0 18px', color: '#0f172a', fontSize: 16 } as const
const stepBadge = { width: 26, height: 26, borderRadius: '50%', display: 'grid', placeItems: 'center', background: '#16a34a', color: '#ffffff', fontSize: 12, fontWeight: 900 } as const
const formGrid = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16 } as const
const labelStyle = { display: 'grid', gap: 8, color: '#334155', fontSize: 13, fontWeight: 850 } as const
const inputStyle = { minHeight: 42, border: '1px solid #e2e8f0', borderRadius: 8, padding: '0 12px', font: 'inherit', color: '#0f172a', background: '#ffffff' } as const
const durationRowStyle = { display: 'flex', gap: 14, alignItems: 'center', marginTop: 16, flexWrap: 'wrap' as const }
const typePillStyle = (wfh: boolean) => ({ padding: '11px 16px', borderRadius: 999, background: wfh ? '#eff6ff' : '#ecfdf5', color: wfh ? '#1d4ed8' : '#047857', fontSize: 13, fontWeight: 900 })
const checkLabelStyle = { display: 'flex', gap: 8, alignItems: 'center', color: '#334155', fontSize: 13, fontWeight: 800 }
const uploadBoxStyle = { display: 'grid', placeItems: 'center', gap: 8, minHeight: 118, border: '1px dashed #b8c6d8', borderRadius: 12, background: '#fbfdff', cursor: 'pointer', color: '#334155', fontWeight: 850, textAlign: 'center' as const }
const uploadIconStyle = { width: 38, height: 38, borderRadius: 999, display: 'grid', placeItems: 'center', background: '#ecfdf5', color: '#16a34a' }
const actionBarStyle = { display: 'flex', justifyContent: 'space-between', gap: 12, padding: '18px 24px', background: '#fbfdff' }
const sideRailStyle = { display: 'grid', gap: 16, alignContent: 'start', position: 'sticky' as const, top: 18 }
const sideCardStyle = { padding: 20, borderRadius: 14 }
const sideCardHeaderStyle = { display: 'flex', alignItems: 'center', gap: 10 }
const sideIconStyle = { width: 34, height: 34, borderRadius: 10, background: '#ecfdf5', color: '#16a34a', display: 'grid', placeItems: 'center', flexShrink: 0 }
const sideTitleStyle = { margin: 0, fontSize: 17, color: '#0f172a' }
const summaryRowStyle = { display: 'flex', justifyContent: 'space-between', gap: 12, fontSize: 13, paddingBottom: 9, borderBottom: '1px solid #f1f5f9' }
const errorNoticeStyle = { padding: 12, borderRadius: 10, background: '#fef2f2', color: '#dc2626', fontWeight: 800, fontSize: 13, margin: 22, marginBottom: 0 }
const successNoticeStyle = { padding: 12, borderRadius: 10, background: '#ecfdf5', color: '#047857', fontWeight: 800, fontSize: 13, margin: 22, marginBottom: 0 }
