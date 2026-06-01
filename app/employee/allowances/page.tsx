'use client'

import { useEffect, useMemo, useState } from 'react'
import { Car, Plus, ReceiptText, Upload, Utensils } from 'lucide-react'
import EmployeeEmptyPage from '@/components/employee/EmployeeEmptyPage'
import { allowanceRequestKey, AllowanceRequest, appendAuditLog, isFuelEligible, loadStored, saveStored } from '@/app/hr/enterpriseData'
import { matchesEmployeeId, useEmployeePortalData } from '../employeeData'
import { createHrRecord, listHrRecords } from '@/lib/hrms/client'
import { uploadFileObject } from '@/lib/uploads/client'

type AllowanceSelection = 'Meal' | 'Fuel' | 'Manual'

export default function EmployeeAllowancesPage() {
  const { employee, employeeName } = useEmployeePortalData()
  const [requests, setRequests] = useState<AllowanceRequest[]>([])
  const [type, setType] = useState<AllowanceSelection>('Meal')
  const [manualType, setManualType] = useState('')
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [amount, setAmount] = useState('')
  const [purpose, setPurpose] = useState('')
  const [remarks, setRemarks] = useState('')
  const [attachmentName, setAttachmentName] = useState('')
  const [attachmentDataUrl, setAttachmentDataUrl] = useState('')
  const [attachmentType, setAttachmentType] = useState('')
  const [notice, setNotice] = useState('')
  const [noticeTone, setNoticeTone] = useState<'success' | 'error'>('success')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const myRequests = useMemo(() => requests.filter(item => matchesEmployeeId(item.employeeId, employee) || matchesEmployeeId(item.employeeCode, employee)), [employee, requests])
  const fuelAllowed = isFuelEligible(employee.jobTitle)
  const isManual = type === 'Manual'
  const displayType = isManual ? manualType.trim() || 'Custom Allowance' : type

  const uploadReceipt = async (file?: File) => {
    if (!file) return
    setAttachmentName(file.name)
    setAttachmentType(file.type || 'application/octet-stream')
    try {
      const uploaded = await uploadFileObject(file, 'allowance-receipts')
      setAttachmentDataUrl(uploaded.url)
    } catch {
      setAttachmentDataUrl('')
      setNoticeTone('error')
      setNotice('Could not upload the receipt file. Please try another file.')
    }
  }

  useEffect(() => {
    let cancelled = false
    const loadRequests = async () => {
      const localRequests = loadStored<AllowanceRequest[]>(allowanceRequestKey, [])
      try {
        const serverRequests = await listHrRecords<AllowanceRequest>('allowance-requests', {
          'x-hr-role': 'Employee',
          'x-hr-user-id': employee.id || employee.employeeId || '',
          'x-hr-user-name': employeeName,
        })
        const map = new Map<string, AllowanceRequest>()
        ;[...localRequests, ...serverRequests].forEach((request, index) => map.set(request.id || `allowance-${index}`, { ...map.get(request.id), ...request }))
        const merged = Array.from(map.values())
        if (cancelled) return
        setRequests(merged)
        saveStored(allowanceRequestKey, merged)
      } catch {
        if (!cancelled) setRequests(localRequests)
      }
    }
    void loadRequests()
    window.addEventListener('focus', loadRequests)
    window.addEventListener('wiseflow:finance-requests-changed', loadRequests)
    const timer = window.setInterval(loadRequests, 2500)
    return () => {
      cancelled = true
      window.removeEventListener('focus', loadRequests)
      window.removeEventListener('wiseflow:finance-requests-changed', loadRequests)
      window.clearInterval(timer)
    }
  }, [employee.id, employee.employeeId, employeeName])

  const submit = async () => {
    if (isSubmitting) return
    setNotice('')
    const amountValue = Number(amount || 0)
    if (isManual && !manualType.trim()) {
      setNoticeTone('error')
      setNotice('Please enter the manual allowance type.')
      return
    }
    if (!date || amountValue <= 0 || !purpose.trim()) {
      setNoticeTone('error')
      setNotice('Date, amount, and purpose/reason are required.')
      return
    }

    setIsSubmitting(true)
    try {
      const now = new Date().toISOString()
      const request: AllowanceRequest = {
        id: `ALW-${Date.now()}`,
        employeeId: employee.id,
        employeeName,
        employeeCode: employee.employeeId,
        department: employee.department,
        jobTitle: employee.jobTitle,
        type: isManual ? 'Other' : type,
        customType: isManual ? manualType.trim() : undefined,
        date,
        amount: amountValue,
        purpose: type === 'Fuel' ? purpose.trim() : undefined,
        reason: type === 'Meal' ? purpose.trim() : undefined,
        remarks: remarks.trim(),
        attachmentName: attachmentName.trim() || undefined,
        attachmentDataUrl: attachmentDataUrl || undefined,
        attachmentType: attachmentType || undefined,
        status: 'Pending',
        managerDecision: 'Pending',
        financeDecision: 'Pending',
        createdAt: now,
        updatedAt: now,
      }

      let savedRequest: AllowanceRequest
      try {
        savedRequest = await createHrRecord<AllowanceRequest>('allowance-requests', request as unknown as Record<string, unknown>)
      } catch (error) {
        console.error('Could not sync allowance request to Finance inbox', error)
        setNoticeTone('error')
        setNotice(error instanceof Error
          ? `Could not submit this allowance request to Finance. ${error.message}`
          : 'Could not submit this allowance request to Finance. Please try again.')
        return
      }

      const nextRequests = [savedRequest, ...requests.filter(item => item.id !== savedRequest.id)]
      setRequests(nextRequests)
      saveStored(allowanceRequestKey, nextRequests)
      window.dispatchEvent(new Event('storage'))
      window.dispatchEvent(new Event('wiseflow:finance-requests-changed'))
      appendAuditLog({ action: 'allowance.change', targetType: 'Allowance Request', targetId: request.id, summary: `${employeeName} filed ${displayType} allowance for ${amountValue}.` })
      setAmount('')
      setPurpose('')
      setRemarks('')
      setAttachmentName('')
      setAttachmentDataUrl('')
      setAttachmentType('')
      if (isManual) setManualType('')
      setNoticeTone('success')
      setNotice(`${displayType} allowance request submitted for finance approval.`)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <EmployeeEmptyPage title="My Allowances" subtitle="Request meal and eligible fuel allowances and track approval history.">
      {notice && <div style={noticeTone === 'success' ? noticeStyle : errorNoticeStyle}>{notice}</div>}
      <section className="employee-panel" style={{ padding: 18, marginBottom: 18 }}>
        <div style={formGrid}>
          <label style={fieldStyle}>Allowance type<select value={type} onChange={event => setType(event.target.value as AllowanceSelection)} style={inputStyle}><option>Meal</option><option>Fuel</option><option value="Manual">Add allowance type manually</option></select></label>
          {isManual && <label style={fieldStyle}>Manual allowance type<input value={manualType} onChange={event => setManualType(event.target.value)} placeholder="Enter allowance type" style={inputStyle} /></label>}
          <label style={fieldStyle}>Date<input type="date" value={date} onChange={event => setDate(event.target.value)} style={inputStyle} /></label>
          <label style={fieldStyle}>Amount<input type="number" min="1" value={amount} onChange={event => setAmount(event.target.value)} style={inputStyle} /></label>
          <label style={fieldStyle}>{type === 'Fuel' ? 'Purpose' : 'Reason'}<input value={purpose} onChange={event => setPurpose(event.target.value)} style={inputStyle} /></label>
          <label style={fieldStyle}>Upload Receipt
            <span style={uploadControlStyle}>
              <Upload size={15} />
              <span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{attachmentName || 'Choose receipt file'}</span>
              <input
                type="file"
                accept="image/*,.pdf,.doc,.docx"
                onChange={event => uploadReceipt(event.target.files?.[0])}
                style={fileInputStyle}
                aria-label="Upload receipt"
              />
            </span>
          </label>
          <label style={fieldStyle}>Remarks<input value={remarks} onChange={event => setRemarks(event.target.value)} style={inputStyle} /></label>
          <button type="button" onClick={submit} disabled={isSubmitting} className="employee-primary-button"><Plus size={16} /> {isSubmitting ? 'Submitting...' : 'Submit'}</button>
        </div>
        {type === 'Fuel' && !fuelAllowed && <div style={hintStyle}>Fuel is selectable. Finance will review eligibility for your position before approving.</div>}
      </section>

      <section className="employee-panel" style={{ overflow: 'hidden' }}>
        <div style={panelHeader}><h2 style={{ margin: 0, fontSize: 17 }}>Allowance History</h2></div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', minWidth: 820, borderCollapse: 'collapse' }}>
            <thead style={{ background: '#f8fafc', color: '#475569', fontSize: 12, textAlign: 'left' }}><tr>{['Type', 'Date', 'Amount', 'Purpose / Reason', 'Receipt', 'Status'].map(item => <th key={item} style={cell}>{item}</th>)}</tr></thead>
            <tbody>{myRequests.length ? myRequests.map(item => <tr key={item.id} style={{ borderTop: '1px solid #eef2f7' }}><td style={cell}>{item.type === 'Fuel' ? <Car size={14} /> : <Utensils size={14} />} {item.customType || item.type}</td><td style={cell}>{item.date}</td><td style={cell}>PHP {item.amount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</td><td style={cell}>{item.purpose || item.reason || '-'}</td><td style={cell}>{item.attachmentName ? item.attachmentDataUrl ? <a href={item.attachmentDataUrl} download={item.attachmentName} style={receiptLinkStyle}><ReceiptText size={14} /> {item.attachmentName}</a> : <span style={receiptTextStyle}><ReceiptText size={14} /> {item.attachmentName}</span> : '-'}</td><td style={cell}>{item.status}</td></tr>) : <tr><td colSpan={6} style={{ ...cell, textAlign: 'center', color: '#64748b', padding: 42 }}>No allowance requests yet.</td></tr>}</tbody>
          </table>
        </div>
      </section>
    </EmployeeEmptyPage>
  )
}

const formGrid = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14, alignItems: 'end' } as const
const fieldStyle = { display: 'grid', gap: 7, color: '#334155', fontSize: 12, fontWeight: 900 } as const
const inputStyle = { minHeight: 40, border: '1px solid #e2e8f0', borderRadius: 8, padding: '0 12px', font: 'inherit', background: '#fff', color: '#0f172a' } as const
const uploadControlStyle = { minHeight: 40, border: '1px solid #e2e8f0', borderRadius: 8, padding: '0 12px', font: 'inherit', background: '#fff', color: '#0f172a', display: 'flex', alignItems: 'center', gap: 9, position: 'relative', cursor: 'pointer' } as const
const fileInputStyle = { position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer' } as const
const receiptTextStyle = { display: 'inline-flex', alignItems: 'center', gap: 6, maxWidth: 220, color: '#0f172a' } as const
const receiptLinkStyle = { ...receiptTextStyle, color: '#047857', textDecoration: 'none', fontWeight: 800 } as const
const noticeStyle = { padding: 12, borderRadius: 10, background: '#ecfdf5', color: '#047857', fontWeight: 900, fontSize: 13, marginBottom: 16 } as const
const errorNoticeStyle = { padding: 12, borderRadius: 10, background: '#fef2f2', color: '#b91c1c', fontWeight: 900, fontSize: 13, marginBottom: 16 } as const
const hintStyle = { marginTop: 12, padding: 10, borderRadius: 8, background: '#fffbeb', color: '#92400e', fontWeight: 800, fontSize: 12 } as const
const panelHeader = { padding: 18, borderBottom: '1px solid #e2e8f0' } as const
const cell = { padding: '12px 16px', color: '#0f172a', fontSize: 13 } as const
