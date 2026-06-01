'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle2, HandCoins } from 'lucide-react'
import {
  loanRequestKey,
  loadStored,
  saveStored,
  useEmployeePortalData,
} from '../../employeeData'
import { appendSystemNotification, calculateLoanScheduledDeduction, LoanRequest, LoanRequestType, money } from '@/app/hr/loan-requests/loanData'
import { appendAuditLog } from '@/app/hr/enterpriseData'
import { createHrRecord } from '@/lib/hrms/client'

export default function NewLoanRequestPage() {
  const router = useRouter()
  const { employee, employeeName } = useEmployeePortalData()
  const [requestType, setRequestType] = useState<LoanRequestType>('Personal Loan')
  const [isManualType, setIsManualType] = useState(false)
  const [customLoanType, setCustomLoanType] = useState('')
  const [deductionSchedule, setDeductionSchedule] = useState<'15th payroll' | '30th payroll' | 'Twice a month' | 'One-time'>('Twice a month')
  const [amount, setAmount] = useState('')
  const [repaymentMonths, setRepaymentMonths] = useState('1')
  const [reason, setReason] = useState('')
  const [notice, setNotice] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const amountValue = Number(amount || 0)
  const monthsValue = Math.max(1, Number(repaymentMonths || 1))
  const selectedRequestType = isManualType ? customLoanType.trim() || 'Custom Loan Type' : requestType
  const isCashAdvance = requestType === 'Cash Advance' && !isManualType
  const effectiveMonths = isCashAdvance ? 1 : monthsValue
  const effectiveSchedule = isCashAdvance ? 'One-time' : deductionSchedule
  const repaymentAmount = calculateLoanScheduledDeduction({
    amount: amountValue,
    repaymentMonths: effectiveMonths,
    deductionSchedule: effectiveSchedule,
    requestType,
  })

  const summary = useMemo(() => [
    ['Request Type', selectedRequestType],
    ['Amount', money(amountValue)],
    ['Deduction', isCashAdvance ? 'One-time payroll deduction' : `${money(repaymentAmount)} per payroll deduction`],
    ['Terms', `${effectiveMonths} month${effectiveMonths === 1 ? '' : 's'}`],
    ['Schedule', effectiveSchedule],
    ['Approval Route', 'Finance approval, then payroll deduction'],
  ], [amountValue, effectiveMonths, effectiveSchedule, isCashAdvance, repaymentAmount, selectedRequestType])

  const submit = async () => {
    if (isSubmitting) return
    setNotice('')
    if (!amountValue || amountValue <= 0) {
      setNotice('Please enter a valid amount.')
      return
    }
    if (!reason.trim()) {
      setNotice('Please add a reason for this request.')
      return
    }
    if (isManualType && !customLoanType.trim()) {
      setNotice('Please enter the manual request type.')
      return
    }

    setIsSubmitting(true)
    try {
      const now = new Date().toISOString()
      const request: LoanRequest = {
        id: `LRQ-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`,
        employeeId: employee.id,
        employeeName,
        employeeCode: employee.employeeId || employee.id,
        department: employee.department,
        team: employee.team,
        jobTitle: employee.jobTitle,
        requestType,
        customLoanType: isManualType ? customLoanType.trim() : undefined,
        amount: amountValue,
        repaymentMonths: effectiveMonths,
        repaymentAmount,
        deductionSchedule: effectiveSchedule,
        reason: reason.trim(),
        status: 'Pending',
        approvalStep: 'finance',
        financeApprovalStatus: 'Pending',
        hrApprovalStatus: 'Skipped',
        approvalLogs: [{ id: `LOG-${Date.now()}`, actor: 'employee', decision: 'Submitted', createdAt: now }],
        createdAt: now,
        updatedAt: now,
      }

      let savedRequest: LoanRequest
      try {
        savedRequest = await createHrRecord<LoanRequest>('loan-requests', request as unknown as Record<string, unknown>)
      } catch (error) {
        console.error('Could not sync loan request to Finance inbox', error)
        setNotice(error instanceof Error
          ? `Could not submit this request to Finance. ${error.message}`
          : 'Could not submit this request to Finance. Please try again.')
        return
      }

      const requests = loadStored<LoanRequest[]>(loanRequestKey, [])
      saveStored(loanRequestKey, [savedRequest, ...requests.filter(item => item.id !== savedRequest.id)])
      window.dispatchEvent(new Event('storage'))
      window.dispatchEvent(new Event('wiseflow:finance-requests-changed'))
      appendSystemNotification(
        `${employeeName} requested ${selectedRequestType.toLowerCase()}`,
        `${employeeName} submitted a ${money(amountValue)} ${selectedRequestType.toLowerCase()} request. Finance must approve payment terms before payroll deduction.`,
        '/accounting/payroll-finance',
      )
      appendAuditLog({ action: 'loan.change', targetType: 'Loan Request', targetId: request.id, summary: `${employeeName} submitted ${selectedRequestType} for finance review.` })
      router.push('/employee/loan-requests')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="employee-page">
      <div className="employee-page-header">
        <div>
          <h1>Request Loan or Cash Advance</h1>
          <p>Your request will follow the approval workflow before payroll can deduct it.</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 360px', gap: 18 }}>
        <section className="employee-panel" style={{ padding: 22 }}>
          {notice && <div style={noticeStyle}>{notice}</div>}
          <h2 style={sectionTitle}><span style={stepBadge}>1</span> Request Details</h2>
          <div style={formGrid}>
            <label style={labelStyle}>Request Type *<select value={isManualType ? 'Manual' : requestType} onChange={event => {
              if (event.target.value === 'Manual') {
                setIsManualType(true)
                return
              }
              setIsManualType(false)
              setCustomLoanType('')
              setRequestType(event.target.value as LoanRequestType)
            }} style={inputStyle}><option>Personal Loan</option><option>Cash Loan</option><option>Emergency Loan</option><option>Cash Advance</option><option value="Manual">Add request type manually</option></select></label>
            {isManualType && <label style={labelStyle}>Manual Request Type *<input value={customLoanType} onChange={event => setCustomLoanType(event.target.value)} placeholder="Enter request type" style={inputStyle} /></label>}
            <label style={labelStyle}>Amount *<input type="number" min="1" value={amount} onChange={event => setAmount(event.target.value)} placeholder="0.00" style={inputStyle} /></label>
            <label style={labelStyle}>Repayment Months *<input type="number" min="1" value={effectiveMonths} disabled={isCashAdvance} onChange={event => setRepaymentMonths(event.target.value)} style={inputStyle} /></label>
            <label style={labelStyle}>Deduction Schedule<select value={isCashAdvance ? 'One-time' : deductionSchedule} disabled={isCashAdvance} onChange={event => setDeductionSchedule(event.target.value as typeof deductionSchedule)} style={inputStyle}><option>15th payroll</option><option>30th payroll</option><option>Twice a month</option><option>One-time</option></select></label>
            <label style={labelStyle}>Deduction per Payroll<input value={money(repaymentAmount)} readOnly style={inputStyle} /></label>
          </div>

          <h2 style={{ ...sectionTitle, marginTop: 28 }}><span style={stepBadge}>2</span> Reason</h2>
          <label style={labelStyle}>Reason *<textarea value={reason} onChange={event => setReason(event.target.value)} placeholder="Explain why you need this loan or cash advance." style={{ ...inputStyle, minHeight: 120, paddingTop: 12, resize: 'vertical' }} /></label>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 24 }}>
            <button type="button" onClick={() => router.push('/employee/loan-requests')} className="employee-secondary-button">Cancel</button>
            <button type="button" onClick={submit} disabled={isSubmitting} className="employee-primary-button">{isSubmitting ? 'Submitting...' : 'Submit Request'}</button>
          </div>
        </section>

        <aside style={{ display: 'grid', gap: 16, alignContent: 'start' }}>
          <section className="employee-panel" style={{ padding: 20 }}>
            <h2 style={{ margin: 0, fontSize: 17 }}>Request Summary</h2>
            <div style={{ display: 'grid', gap: 10, marginTop: 16 }}>{summary.map(([label, value]) => <div key={label} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, fontSize: 13 }}><span style={{ color: '#64748b' }}>{label}</span><strong>{value}</strong></div>)}</div>
          </section>
          <section className="employee-panel" style={{ padding: 20 }}>
            <h2 style={{ margin: 0, fontSize: 17 }}>Approval Workflow</h2>
            <div style={{ display: 'grid', gap: 14, marginTop: 16 }}>
              <WorkflowRow done label="Employee" value={`${employeeName} (You)`} />
              <WorkflowRow label="Finance" value="Payment terms, deduction schedule, and amount" />
              <WorkflowRow label="Payroll" value="Deducted only after finance approval" />
            </div>
          </section>
          <section className="employee-panel" style={{ padding: 20, background: '#ecfdf5' }}>
            <HandCoins size={22} color="#16a34a" />
            <p style={{ margin: '10px 0 0', color: '#047857', fontSize: 13, lineHeight: 1.5 }}>Approved loans and cash advances appear as payroll deductions after Finance approval.</p>
          </section>
        </aside>
      </div>
    </div>
  )
}

function WorkflowRow({ label, value, done }: { label: string; value: string; done?: boolean }) {
  return <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}><span style={{ width: 28, height: 28, borderRadius: '50%', display: 'grid', placeItems: 'center', background: done ? '#16a34a' : '#eff6ff', color: done ? '#fff' : '#2563eb' }}>{done ? <CheckCircle2 size={16} /> : label[0]}</span><span><strong style={{ display: 'block', fontSize: 13 }}>{label}</strong><small style={{ color: '#64748b' }}>{value}</small></span></div>
}

const sectionTitle = { display: 'flex', alignItems: 'center', gap: 10, margin: '0 0 16px', color: '#0f172a', fontSize: 16 } as const
const stepBadge = { width: 24, height: 24, borderRadius: '50%', display: 'grid', placeItems: 'center', background: '#16a34a', color: '#ffffff', fontSize: 12, fontWeight: 900 } as const
const formGrid = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 } as const
const labelStyle = { display: 'grid', gap: 8, color: '#334155', fontSize: 13, fontWeight: 850 } as const
const inputStyle = { minHeight: 42, border: '1px solid #e2e8f0', borderRadius: 8, padding: '0 12px', font: 'inherit', color: '#0f172a', background: '#ffffff' } as const
const noticeStyle = { padding: 12, borderRadius: 8, background: '#fef2f2', color: '#dc2626', fontWeight: 800, fontSize: 13, marginBottom: 16 } as const
