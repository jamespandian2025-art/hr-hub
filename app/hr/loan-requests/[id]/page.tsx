'use client'

import { useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, BriefcaseBusiness, CalendarClock, CheckCircle2, Clock3, CreditCard, FileText, HandCoins, UserRound, XCircle } from 'lucide-react'
import type { Employee } from '@/app/employee/employeeData'
import { employeeKey, fullName, initials, loadStored } from '@/app/employee/employeeData'
import { listHrRecords } from '@/lib/hrms/client'
import {
  formatDateTime,
  loadLoanRequests,
  loanApprovalState,
  loanBalanceAmount,
  loanDisplayName,
  loanPaidAmount,
  loanRemainingTerms,
  LoanRequest,
  loanScheduledDeduction,
  money,
  resolveLoanEmployee,
} from '../loanData'

function uniqueLoanRequests(rows: LoanRequest[]) {
  const map = new Map<string, LoanRequest>()
  rows.forEach((row, index) => {
    const key = row.id || `loan-${index}`
    map.set(key, { ...map.get(key), ...row })
  })
  return Array.from(map.values())
}

function normalizeKey(value?: string) {
  return String(value || '').toLowerCase()
}

export default function HrLoanRequestDetailPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const [employees, setEmployees] = useState<Employee[]>([])
  const [requests, setRequests] = useState<LoanRequest[]>([])

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      setEmployees(loadStored<Employee[]>(employeeKey, []))
      const localRequests = loadLoanRequests()
      try {
        const serverRequests = await listHrRecords<LoanRequest>('loan-requests', {
          'x-hr-role': 'HR',
          'x-hr-user-name': 'HR Loan Detail View',
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

  const requestId = decodeURIComponent(String(params.id || ''))
  const request = useMemo(() => requests.find(item => normalizeKey(item.id) === normalizeKey(requestId)) || null, [requestId, requests])
  const employee = useMemo(() => request ? resolveLoanEmployee(request, employees) : undefined, [employees, request])
  const state = request ? loanApprovalState(request) : null

  if (!request) {
    return (
      <div className="hr-module-page">
        <button type="button" onClick={() => router.push('/hr/loan-requests')} style={secondaryButtonStyle}><ArrowLeft size={15} /> Back to loan requests</button>
        <section style={{ ...cardStyle, marginTop: 18, padding: 28, textAlign: 'center' }}>
          <h1 style={pageTitleStyle}>Loan request not found</h1>
          <p style={pageSubtitleStyle}>The request may still be syncing or was removed.</p>
        </section>
      </div>
    )
  }

  const requestedMonths = request.requestedRepaymentMonths || request.repaymentMonths
  const requestedSchedule = request.requestedDeductionSchedule || request.deductionSchedule || 'Twice a month'
  const approvedMonths = request.financeApprovedRepaymentMonths || request.repaymentMonths
  const approvedSchedule = request.financeApprovedDeductionSchedule || request.deductionSchedule || 'Twice a month'
  const scheduledDeduction = loanScheduledDeduction(request)
  const paidAmount = loanPaidAmount(request)
  const balance = loanBalanceAmount(request)
  const remainingTerms = loanRemainingTerms(request)
  const employeeName = request.employeeName || fullName(employee) || 'Employee'

  return (
    <div className="hr-module-page loan-detail-page">
      <style>{loanDetailCss}</style>
      <div className="loan-breadcrumb" style={breadcrumbStyle}>HR Hub &nbsp;&gt;&nbsp; Loan Requests &nbsp;&gt;&nbsp; {request.id}</div>
      <div className="loan-mobile-bar">
        <button type="button" onClick={() => router.push('/hr/loan-requests')} aria-label="Back to loan requests"><ArrowLeft size={18} /></button>
        <span>Loan Details</span>
        <Badge value={request.status} />
      </div>
      <div className="loan-page-header" style={pageHeaderStyle}>
        <div className="loan-title-block">
          <button type="button" className="loan-back-button" onClick={() => router.push('/hr/loan-requests')} style={secondaryButtonStyle}><ArrowLeft size={15} /> Back to loan requests</button>
          <h1 className="loan-page-title" style={{ ...pageTitleStyle, marginTop: 18 }}>{loanDisplayName(request)}</h1>
          <p className="loan-page-subtitle" style={pageSubtitleStyle}>Read-only HR view of Finance-owned loan approval, payment terms, and payroll deduction details.</p>
        </div>
        <Badge value={request.status} />
      </div>

      <section className="loan-hero-card" style={heroCardStyle}>
        <div className="loan-employee-panel" style={employeePanelStyle}>
          <Avatar employee={employee} name={employeeName} />
          <div className="loan-employee-copy">
            <h2 className="loan-employee-name" style={employeeNameStyle}>{employeeName}</h2>
            <p style={employeeMetaStyle}>{request.employeeCode || employee?.employeeId || request.employeeId} • {request.jobTitle || employee?.jobTitle || 'Employee'}</p>
            <div className="loan-employee-grid" style={employeeGridStyle}>
              <InfoLine icon={BriefcaseBusiness} label="Department" value={request.department || employee?.department || '-'} />
              <InfoLine icon={UserRound} label="Team" value={request.team || employee?.team || '-'} />
              <InfoLine icon={CalendarClock} label="Submitted" value={formatDateTime(request.createdAt)} />
            </div>
          </div>
        </div>
        <div className="loan-summary-grid" style={summaryGridStyle}>
          <Metric icon={HandCoins} label="Requested Amount" value={money(request.amount)} tone="#2563eb" />
          <Metric icon={CreditCard} label="Scheduled Deduction" value={money(scheduledDeduction)} detail={approvedSchedule} tone="#16a34a" />
          <Metric icon={Clock3} label="Remaining Terms" value={String(remainingTerms)} detail={`${money(balance)} balance`} tone="#f59e0b" />
          <Metric icon={FileText} label="Workflow" value={state?.label || request.status} detail={request.financeApprovalStatus || 'Pending'} tone="#7c3aed" />
        </div>
      </section>

      <section className="loan-content-grid" style={contentGridStyle}>
        <div className="loan-card" style={cardStyle}>
          <SectionTitle title="Loan Details" />
          <DetailGrid rows={[
            ['Request ID', request.id],
            ['Request Type', loanDisplayName(request)],
            ['Amount', money(request.amount)],
            ['Reason', request.reason || '-'],
            ['Status', request.status],
            ['Submitted', formatDateTime(request.createdAt)],
          ]} />
        </div>

        <div className="loan-card" style={cardStyle}>
          <SectionTitle title="Finance Decision" />
          <DetailGrid rows={[
            ['Finance Status', request.financeApprovalStatus || 'Pending'],
            ['Approved At', formatDateTime(request.financeApprovedAt)],
            ['Rejected At', formatDateTime(request.financeRejectedAt)],
            ['Terms Adjusted', request.financeTermsAdjusted ? 'Yes' : 'No'],
            ['Finance Note', request.financeTermsNote || '-'],
          ]} />
        </div>

        <div className="loan-card" style={cardStyle}>
          <SectionTitle title="Payment Terms" />
          <div className="loan-terms-compare" style={termsCompareStyle}>
            <TermsColumn title="Employee Requested" months={requestedMonths} schedule={requestedSchedule} amount={money(request.amount)} deduction={money(request.repaymentAmount)} />
            <TermsColumn title="Finance Approved" months={approvedMonths} schedule={approvedSchedule} amount={money(request.amount)} deduction={money(scheduledDeduction)} isApproved />
          </div>
        </div>

        <div className="loan-card" style={cardStyle}>
          <SectionTitle title="Payroll Deduction" />
          <DetailGrid rows={[
            ['Original Amount', money(request.amount)],
            ['Paid Amount', money(paidAmount)],
            ['Balance Due', money(balance)],
            ['Deduction Amount', money(scheduledDeduction)],
            ['Deduction Schedule', approvedSchedule],
            ['Last Deducted Period', request.lastDeductedPayrollPeriod || '-'],
            ['Payroll Record', request.payrollRecordId || '-'],
          ]} />
        </div>

        <div className="loan-card loan-timeline-card" style={{ ...cardStyle, gridColumn: '1 / -1' }}>
          <SectionTitle title="Workflow Timeline" />
          <div className="loan-timeline" style={timelineStyle}>
            {(request.approvalLogs || []).length ? request.approvalLogs?.map(log => (
              <div key={log.id} className="loan-timeline-item" style={timelineItemStyle}>
                <span style={timelineIconStyle(log.decision)}>{String(log.decision).toLowerCase() === 'rejected' ? <XCircle size={15} /> : <CheckCircle2 size={15} />}</span>
                <div>
                  <strong>{log.decision}</strong>
                  <small>{log.actor} • {formatDateTime(log.createdAt)}</small>
                  {log.reason ? <p>{log.reason}</p> : null}
                </div>
              </div>
            )) : <div style={emptyStyle}>No workflow log yet.</div>}
          </div>
        </div>
      </section>
    </div>
  )
}

function Avatar({ employee, name }: { employee?: Employee; name: string }) {
  if (employee?.photo) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img className="loan-avatar" src={employee.photo} alt="" style={avatarStyle} />
  }
  return <span className="loan-avatar" style={avatarFallback}>{initials(name)}</span>
}

function InfoLine({ icon: Icon, label, value }: { icon: typeof BriefcaseBusiness; label: string; value: string }) {
  return <span className="loan-info-line" style={infoLineStyle}><Icon size={15} /><span><small>{label}</small><strong>{value}</strong></span></span>
}

function Metric({ icon: Icon, label, value, detail, tone }: { icon: typeof HandCoins; label: string; value: string; detail?: string; tone: string }) {
  return <div className="loan-metric" style={metricStyle}><span className="loan-metric-icon" style={{ ...metricIconStyle, background: `${tone}16`, color: tone }}><Icon size={22} /></span><span><small>{label}</small><strong>{value}</strong>{detail ? <em>{detail}</em> : null}</span></div>
}

function Badge({ value }: { value: string }) {
  const tone = value === 'Approved' || value === 'Processed' ? { bg: '#dcfce7', text: '#15803d' } : value === 'Rejected' ? { bg: '#fee2e2', text: '#dc2626' } : { bg: '#fef3c7', text: '#d97706' }
  return <span className="loan-status-badge" style={{ borderRadius: 999, padding: '7px 12px', background: tone.bg, color: tone.text, fontWeight: 900, fontSize: 12 }}>{value}</span>
}

function SectionTitle({ title }: { title: string }) {
  return <h2 className="loan-section-title" style={sectionTitleStyle}>{title}</h2>
}

function DetailGrid({ rows }: { rows: Array<[string, string]> }) {
  return <div className="loan-detail-grid" style={detailGridStyle}>{rows.map(([label, value]) => <div key={label}><small>{label}</small><strong>{value}</strong></div>)}</div>
}

function TermsColumn({ title, months, schedule, amount, deduction, isApproved }: { title: string; months: number; schedule: string; amount: string; deduction: string; isApproved?: boolean }) {
  return (
    <div className={isApproved ? 'loan-terms-column is-approved' : 'loan-terms-column'} style={{ ...termsColumnStyle, borderColor: isApproved ? '#bbf7d0' : '#e2e8f0', background: isApproved ? '#f0fdf4' : '#fff' }}>
      <strong>{title}</strong>
      <span><small>Terms</small><b>{months} month{months === 1 ? '' : 's'}</b></span>
      <span><small>Schedule</small><b>{schedule}</b></span>
      <span><small>Amount</small><b>{amount}</b></span>
      <span><small>Deduction</small><b>{deduction}</b></span>
    </div>
  )
}

const loanDetailCss = `
.loan-detail-page {
  --loan-border: #e2e8f0;
  --loan-muted: #64748b;
  --loan-ink: #0f172a;
  padding-bottom: 40px;
}

.loan-mobile-bar {
  display: none;
}

.loan-title-block {
  min-width: 0;
}

.loan-info-line small,
.loan-detail-grid small,
.loan-terms-column small,
.loan-metric small {
  display: block;
  color: var(--loan-muted);
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0;
  line-height: 1.25;
}

.loan-info-line strong,
.loan-detail-grid strong,
.loan-terms-column b,
.loan-metric strong {
  display: block;
  color: var(--loan-ink);
  font-size: 14px;
  font-weight: 900;
  line-height: 1.35;
  overflow-wrap: anywhere;
}

.loan-info-line {
  min-width: 0;
}

.loan-info-line svg {
  flex: 0 0 auto;
  color: #475569;
}

.loan-metric {
  background: #fff;
}

.loan-metric > span:last-child {
  min-width: 0;
}

.loan-metric strong {
  margin-top: 3px;
  font-size: 17px;
}

.loan-metric em {
  display: block;
  margin-top: 2px;
  color: #334155;
  font-size: 13px;
  font-style: normal;
  font-weight: 750;
}

.loan-detail-grid > div {
  display: grid;
  grid-template-columns: minmax(130px, .35fr) minmax(0, 1fr);
  gap: 14px;
  align-items: baseline;
  padding: 10px 0;
  border-bottom: 1px solid #f1f5f9;
}

.loan-detail-grid > div:last-child {
  border-bottom: 0;
}

.loan-detail-grid strong {
  text-align: right;
}

.loan-terms-column > strong {
  color: var(--loan-ink);
  font-size: 15px;
  font-weight: 950;
}

.loan-terms-column > span {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 12px;
  align-items: baseline;
}

.loan-terms-column b {
  text-align: right;
}

.loan-timeline-item:last-child {
  border-bottom: 0 !important;
  padding-bottom: 0 !important;
}

.loan-timeline-item strong {
  color: var(--loan-ink);
  font-size: 14px;
  font-weight: 950;
  margin-right: 4px;
}

.loan-timeline-item small {
  color: #475569;
  font-size: 13px;
}

.loan-timeline-item p {
  margin: 6px 0 0;
  color: #475569;
  font-size: 13px;
}

@media (max-width: 1100px) {
  .loan-hero-card {
    grid-template-columns: 1fr !important;
  }

  .loan-summary-grid {
    grid-template-columns: repeat(4, minmax(220px, 1fr)) !important;
    overflow-x: auto;
    padding-bottom: 2px;
    scroll-snap-type: x mandatory;
  }

  .loan-metric {
    scroll-snap-align: start;
  }
}

@media (max-width: 760px) {
  .loan-detail-page {
    min-height: 100dvh;
    margin: 0 -16px;
    padding: 0 14px 28px !important;
    background: #f8fafc;
  }

  .loan-breadcrumb,
  .loan-page-header > .loan-status-badge,
  .loan-back-button,
  .loan-page-subtitle {
    display: none !important;
  }

  .loan-mobile-bar {
    position: sticky;
    top: 0;
    z-index: 30;
    display: grid;
    grid-template-columns: 40px minmax(0, 1fr) auto;
    align-items: center;
    gap: 10px;
    min-height: 60px;
    margin: 0 -14px 14px;
    padding: 8px 14px;
    background: rgba(248, 250, 252, .94);
    border-bottom: 1px solid rgba(226, 232, 240, .9);
    backdrop-filter: blur(12px);
  }

  .loan-mobile-bar button {
    width: 38px;
    height: 38px;
    border: 1px solid #e2e8f0;
    border-radius: 999px;
    background: #fff;
    color: #0f172a;
    display: grid;
    place-items: center;
  }

  .loan-mobile-bar > span {
    color: #0f172a;
    font-size: 15px;
    font-weight: 950;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .loan-page-header {
    display: block !important;
    margin: 0 0 12px !important;
  }

  .loan-page-title {
    font-size: 28px !important;
    margin: 4px 0 0 !important;
    line-height: 1.05 !important;
  }

  .loan-hero-card,
  .loan-card {
    border-radius: 22px !important;
    border-color: #edf2f7 !important;
    box-shadow: 0 16px 40px rgba(15, 23, 42, .06) !important;
  }

  .loan-hero-card {
    padding: 16px !important;
    gap: 16px !important;
    margin-bottom: 14px !important;
  }

  .loan-employee-panel {
    align-items: flex-start !important;
    gap: 13px !important;
  }

  .loan-avatar {
    width: 66px !important;
    height: 66px !important;
    font-size: 20px !important;
  }

  .loan-employee-name {
    font-size: 20px !important;
    line-height: 1.1 !important;
  }

  .loan-employee-copy > p {
    margin: 5px 0 12px !important;
    font-size: 12px !important;
  }

  .loan-employee-grid {
    grid-template-columns: 1fr !important;
    gap: 8px !important;
  }

  .loan-info-line {
    min-height: 34px;
  }

  .loan-summary-grid {
    display: flex !important;
    gap: 10px !important;
    margin: 0 -16px;
    padding: 0 16px 4px;
    overflow-x: auto;
    scrollbar-width: none;
  }

  .loan-summary-grid::-webkit-scrollbar {
    display: none;
  }

  .loan-metric {
    min-width: 238px !important;
    border-radius: 18px !important;
    padding: 12px !important;
  }

  .loan-metric-icon {
    width: 40px !important;
    height: 40px !important;
  }

  .loan-content-grid {
    grid-template-columns: 1fr !important;
    gap: 14px !important;
  }

  .loan-card {
    padding: 16px !important;
  }

  .loan-section-title {
    font-size: 16px !important;
    margin-bottom: 10px !important;
  }

  .loan-detail-grid {
    gap: 0 !important;
  }

  .loan-detail-grid > div {
    grid-template-columns: 1fr !important;
    gap: 4px;
    padding: 11px 0;
  }

  .loan-detail-grid strong {
    text-align: left;
    font-size: 15px;
  }

  .loan-terms-compare {
    grid-template-columns: 1fr !important;
    gap: 10px !important;
  }

  .loan-terms-column {
    border-radius: 18px !important;
  }

  .loan-timeline-card {
    margin-bottom: 10px;
  }

  .loan-timeline-item {
    grid-template-columns: 32px minmax(0, 1fr) !important;
  }
}
`

const breadcrumbStyle = { color: '#64748b', fontSize: 13, marginBottom: 18 } as const
const pageHeaderStyle = { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap', marginBottom: 18 } as const
const pageTitleStyle = { margin: 0, fontSize: 30, fontWeight: 950, color: '#0f172a' } as const
const pageSubtitleStyle = { margin: '7px 0 0', color: '#475569', fontSize: 14 } as const
const secondaryButtonStyle = { minHeight: 40, border: '1px solid #e2e8f0', background: '#fff', color: '#0f172a', borderRadius: 8, padding: '0 13px', display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 900, cursor: 'pointer' } as const
const cardStyle = { border: '1px solid #e2e8f0', borderRadius: 12, background: '#fff', padding: 18, boxShadow: '0 12px 30px rgba(15,23,42,.05)' } as const
const heroCardStyle = { ...cardStyle, display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(420px, .9fr)', gap: 18, marginBottom: 18 } as const
const employeePanelStyle = { display: 'flex', alignItems: 'center', gap: 20, minWidth: 0 } as const
const avatarStyle = { width: 92, height: 92, borderRadius: '50%', objectFit: 'cover' } as const
const avatarFallback = { width: 92, height: 92, borderRadius: '50%', display: 'grid', placeItems: 'center', background: '#dcfce7', color: '#15803d', fontSize: 26, fontWeight: 950 } as const
const employeeNameStyle = { margin: 0, color: '#0f172a', fontSize: 24, fontWeight: 950 } as const
const employeeMetaStyle = { margin: '6px 0 14px', color: '#475569', fontSize: 13, fontWeight: 750 } as const
const employeeGridStyle = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10 } as const
const infoLineStyle = { display: 'flex', alignItems: 'center', gap: 8, color: '#475569' } as const
const summaryGridStyle = { display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 12 } as const
const metricStyle = { border: '1px solid #eef2f7', borderRadius: 10, padding: 14, display: 'flex', gap: 12, alignItems: 'center', minWidth: 0 } as const
const metricIconStyle = { width: 44, height: 44, borderRadius: 12, display: 'grid', placeItems: 'center', flex: '0 0 auto' } as const
const contentGridStyle = { display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 18 } as const
const sectionTitleStyle = { margin: '0 0 14px', color: '#0f172a', fontSize: 17, fontWeight: 950 } as const
const detailGridStyle = { display: 'grid', gap: 12 } as const
const termsCompareStyle = { display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 12 } as const
const termsColumnStyle = { border: '1px solid #e2e8f0', borderRadius: 10, padding: 14, display: 'grid', gap: 11 } as const
const timelineStyle = { display: 'grid', gap: 12 } as const
const timelineItemStyle = { display: 'grid', gridTemplateColumns: '34px minmax(0, 1fr)', gap: 10, paddingBottom: 12, borderBottom: '1px solid #eef2f7' } as const
const emptyStyle = { minHeight: 110, display: 'grid', placeItems: 'center', color: '#64748b', fontSize: 13 } as const

function timelineIconStyle(decision: string) {
  const rejected = String(decision).toLowerCase() === 'rejected'
  return { width: 30, height: 30, borderRadius: '50%', display: 'grid', placeItems: 'center', background: rejected ? '#fee2e2' : '#dcfce7', color: rejected ? '#dc2626' : '#15803d' } as const
}
