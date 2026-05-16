'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  Clock3,
  CreditCard,
  Download,
  FileCheck2,
  FileText,
  Filter,
  MoreHorizontal,
  Search,
  ShieldCheck,
  SlidersHorizontal,
} from 'lucide-react'
import { emptyAccountingData, formatDate, loadAccountingData, money, subscribeAccountingData, type TaxObligation as AccountingTaxObligation } from '@/lib/accounting/data'

const font = 'var(--font-body)'

type TaxStatus = string
type TaxTabId = 'overview' | 'obligations' | 'filings' | 'payments' | 'certificates' | 'reports' | 'calendar'

const taxTabs: Array<{ id: TaxTabId; label: string }> = [
  { id: 'overview', label: 'Overview' },
  { id: 'obligations', label: 'Tax Obligations' },
  { id: 'filings', label: 'Filings' },
  { id: 'payments', label: 'Payments' },
  { id: 'certificates', label: 'Certificates' },
  { id: 'reports', label: 'Reports' },
  { id: 'calendar', label: 'Calendar' },
]

function StatusPill({ value }: { value: TaxStatus }) {
  return <span className={`tax-pill ${value.toLowerCase().replaceAll(' ', '-').replaceAll('&', 'and')}`}>{value}</span>
}

export default function TaxCompliancePage() {
  const [data, setData] = useState(emptyAccountingData)
  const [todayMs] = useState(() => Date.now())
  const [activeTab, setActiveTab] = useState<TaxTabId>('overview')
  const [searchTerm, setSearchTerm] = useState('')
  const [typeFilter, setTypeFilter] = useState('All')
  const [statusFilter, setStatusFilter] = useState('All')

  useEffect(() => {
    const load = () => setData(loadAccountingData())
    load()
    return subscribeAccountingData(load)
  }, [])

  const obligations = data.taxObligations
  const payrollTax = data.payrollRecords.reduce((sum, record) => {
    const breakdown = record.deductionBreakdown as Record<string, unknown> | undefined
    return sum + Number(breakdown?.tax || 0)
  }, 0)
  const derivedObligations: AccountingTaxObligation[] = obligations.length ? obligations : payrollTax > 0 ? [{
    id: 'payroll-tax',
    type: 'Payroll Withholding Tax',
    period: 'Current payroll records',
    dueDate: '',
    taxableAmount: data.payrollRecords.reduce((sum, record) => sum + Number(record.gross || 0), 0),
    payable: payrollTax,
    paid: data.payrollRecords.filter(record => record.status === 'Paid').reduce((sum, record) => {
      const breakdown = record.deductionBreakdown as Record<string, unknown> | undefined
      return sum + Number(breakdown?.tax || 0)
    }, 0),
    status: 'Pending',
    color: '#f59e0b',
  }] : []
  const compliance = derivedObligations.map(item => ({
    title: item.type,
    detail: item.period || 'Current records',
    date: item.dueDate ? `Due on ${formatDate(item.dueDate)}` : 'No due date set',
    status: item.status,
  }))
  const deadlines = derivedObligations.filter(item => item.dueDate).map(item => {
    const due = new Date(item.dueDate)
    const days = Math.ceil((due.getTime() - new Date().getTime()) / 86400000)
    return {
      month: due.toLocaleDateString('en-US', { month: 'short' }).toUpperCase(),
      day: String(due.getDate()).padStart(2, '0'),
      title: item.type,
      detail: item.period || 'Tax obligation',
      time: days >= 0 ? `${days} days left` : `${Math.abs(days)} days overdue`,
    }
  })
  const filings = derivedObligations.filter(item => item.paid >= item.payable && item.payable > 0).map(item => ({ title: item.type, date: item.dueDate ? `Filed on ${formatDate(item.dueDate)}` : 'Filed', status: 'Filed' }))
  const certificates: Array<{ title: string; date: string; status: TaxStatus }> = []
  const totalPayable = derivedObligations.reduce((sum, item) => sum + item.payable, 0)
  const paidThisPeriod = derivedObligations.reduce((sum, item) => sum + item.paid, 0)
  const pendingAmount = totalPayable - paidThisPeriod
  const overdueAmount = derivedObligations.filter(item => item.dueDate && new Date(item.dueDate).getTime() < todayMs && item.paid < item.payable).reduce((sum, item) => sum + Math.max(item.payable - item.paid, 0), 0)
  const complianceScore = compliance.length ? Math.round((compliance.filter(item => ['Paid', 'Filed', 'Compliant'].includes(item.status)).length / compliance.length) * 100) : 0
  const taxTypes = ['All', ...Array.from(new Set(derivedObligations.map(item => item.type))).sort()]
  const taxStatuses = ['All', ...Array.from(new Set(derivedObligations.map(item => item.status))).sort()]
  const normalizedSearch = searchTerm.trim().toLowerCase()
  const filteredObligations = derivedObligations.filter(item => {
    const matchesSearch = !normalizedSearch || [item.type, item.period, item.status, item.dueDate].join(' ').toLowerCase().includes(normalizedSearch)
    const matchesType = typeFilter === 'All' || item.type === typeFilter
    const matchesStatus = statusFilter === 'All' || item.status === statusFilter
    return matchesSearch && matchesType && matchesStatus
  })
  const payments = derivedObligations.filter(item => item.paid > 0).map(item => ({
    id: `${item.id}-payment`,
    type: item.type,
    period: item.period || 'Current records',
    date: item.dueDate ? formatDate(item.dueDate) : 'Current records',
    amount: item.paid,
    status: item.paid >= item.payable ? 'Paid' : 'Partially Paid',
  }))
  const reports = [
    { title: 'Tax Liability Report', detail: `${derivedObligations.length} obligations`, value: money(totalPayable, data.currency) },
    { title: 'Tax Payment Summary', detail: `${payments.length} payment records`, value: money(paidThisPeriod, data.currency) },
    { title: 'Pending Compliance Report', detail: `${derivedObligations.filter(item => item.payable > item.paid).length} open items`, value: money(pendingAmount, data.currency) },
    { title: 'Overdue Tax Report', detail: `${derivedObligations.filter(item => item.dueDate && new Date(item.dueDate).getTime() < todayMs && item.paid < item.payable).length} overdue items`, value: money(overdueAmount, data.currency) },
  ]
  const metrics = [
    { title: 'Total Tax Payable', value: money(totalPayable, data.currency), detail: `${derivedObligations.length} obligations`, icon: FileCheck2, tone: '#16a34a', bad: true },
    { title: 'Paid This Period', value: money(paidThisPeriod, data.currency), detail: 'From tax and payroll records', icon: CreditCard, tone: '#2563eb', good: true },
    { title: 'Pending Amount', value: money(pendingAmount, data.currency), detail: 'Payable minus paid', icon: Clock3, tone: '#f59e0b' },
    { title: 'Overdue Amount', value: money(overdueAmount, data.currency), detail: 'Past due unpaid amount', icon: AlertTriangle, tone: '#ef4444', bad: true },
    { title: 'Compliance Score', value: `${complianceScore}%`, detail: 'Paid or filed obligations', icon: ShieldCheck, tone: '#7c3aed', good: true },
  ]

  return (
    <div className="tax-page" style={{ fontFamily: font }}>
      <style>{taxCss}</style>
      <div className="tax-header">
        <div>
          <h1 className="tax-title">Taxes & Compliance</h1>
          <p className="tax-subtitle">Manage tax obligations, filings, and compliance requirements.</p>
        </div>
        <div className="tax-actions">
          <button type="button"><CalendarDays size={15} /> Current records</button>
          <button type="button" onClick={() => setActiveTab('obligations')}><Filter size={15} /> Filters</button>
          <button type="button" onClick={() => exportTaxRows(activeTab, filteredObligations, payments, filings, certificates, reports, data.currency)}>Export <Download size={14} /></button>
        </div>
      </div>

      <section className="tax-metrics">
        {metrics.map(metric => {
          const Icon = metric.icon
          return (
            <div key={metric.title} className="tax-card tax-metric-card">
              <span className="tax-metric-icon" style={{ background: `${metric.tone}12`, color: metric.tone }}><Icon size={23} /></span>
              <span>
                <span className="tax-label">{metric.title}</span>
                <strong className="tax-value">{metric.value}</strong>
                <small className="tax-detail" style={{ color: metric.good ? '#16a34a' : metric.bad ? '#ef4444' : '#334155' }}>{metric.good ? 'Down ' : metric.bad ? 'Up ' : ''}{metric.detail}</small>
              </span>
            </div>
          )
        })}
      </section>

      <nav className="tax-tabs" aria-label="Tax sections" role="tablist">
        {taxTabs.map(tab => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            id={`tax-tab-${tab.id}`}
            aria-controls={`tax-panel-${tab.id}`}
            aria-selected={activeTab === tab.id}
            className={activeTab === tab.id ? 'is-active' : undefined}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      <div
        role="tabpanel"
        id="tax-panel-overview"
        aria-labelledby="tax-tab-overview"
        className={activeTab === 'overview' ? 'tax-tab-panel' : 'tax-hidden'}
      >
      <section className="tax-top-grid">
        <div className="tax-card">
          <h2>Tax Liability Summary</h2>
          <div className="tax-liability">
            <div className="tax-donut" style={{ background: `conic-gradient(${derivedObligations.map((item, index) => {
              const start = derivedObligations.slice(0, index).reduce((sum, prev) => sum + (prev.payable / Math.max(totalPayable, 1)) * 100, 0)
              const end = start + (item.payable / Math.max(totalPayable, 1)) * 100
              return `${item.color} ${start}% ${end}%`
            }).join(', ') || '#e5e7eb 0% 100%'})` }}>
              <span className="tax-donut-center"><strong>{money(totalPayable, data.currency)}</strong><small>Total Payable</small></span>
            </div>
            <div className="tax-liability-list">
              <div className="tax-liability-head"><span>Tax Type</span><span>Amount</span><span>% of Total</span></div>
              {derivedObligations.slice(0, 5).map(item => (
                <div key={item.type} className="tax-liability-row">
                  <span className="tax-liability-type"><i style={{ background: item.color }} /><span>{item.type}</span></span>
                  <strong className="tax-liability-amount">{money(item.payable, data.currency)}</strong>
                  <strong className="tax-liability-percent">{((item.payable / Math.max(totalPayable, 1)) * 100).toFixed(1)}%</strong>
                </div>
              ))}
              <div className="tax-liability-total"><span>Total</span><strong className="tax-liability-amount">{money(totalPayable, data.currency)}</strong><strong className="tax-liability-percent">100%</strong></div>
            </div>
          </div>
        </div>

        <div className="tax-card">
          <div className="tax-panel-header"><h2>Compliance Status</h2><Link href="/accounting/reports">View All</Link></div>
          <div className="tax-status-list">
            {compliance.map(item => (
              <div key={item.title}>
                <span className={item.status === 'Compliant' ? 'tax-status-icon good' : item.status === 'Overdue' ? 'tax-status-icon bad' : 'tax-status-icon warn'}>{item.status === 'Compliant' ? <CheckCircle2 size={17} /> : <Clock3 size={17} />}</span>
                <span><strong>{item.title}</strong><small>{item.detail}</small></span>
                <span><StatusPill value={item.status} /><small>{item.date}</small></span>
              </div>
            ))}
          </div>
        </div>

        <div className="tax-card">
          <div className="tax-panel-header"><h2>Upcoming Deadlines</h2><Link href="/accounting/tax-compliance">View All</Link></div>
          <div className="tax-deadlines">
            {deadlines.map(item => (
              <div key={`${item.month}-${item.day}`}>
                <time><small>{item.month}</small><strong>{item.day}</strong></time>
                <span><strong>{item.title}</strong><small>{item.detail}</small></span>
                <em>{item.time}</em>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="tax-main-grid">
        <div className="tax-card">
          <h2>Tax Obligations</h2>
          <div className="tax-filterbar">
            <label><Search size={15} color="#64748b" /><input value={searchTerm} onChange={event => setSearchTerm(event.target.value)} placeholder="Search tax obligations..." /></label>
            <select value={typeFilter} onChange={event => setTypeFilter(event.target.value)} aria-label="Filter tax type">
              {taxTypes.map(type => <option key={type} value={type}>{type === 'All' ? 'All Tax Types' : type}</option>)}
            </select>
            <select value={statusFilter} onChange={event => setStatusFilter(event.target.value)} aria-label="Filter tax status">
              {taxStatuses.map(status => <option key={status} value={status}>{status === 'All' ? 'All Status' : status}</option>)}
            </select>
            <button type="button"><CalendarDays size={15} /> Current records</button>
            <button type="button" onClick={() => { setSearchTerm(''); setTypeFilter('All'); setStatusFilter('All') }}><SlidersHorizontal size={15} /> Reset Filters</button>
          </div>
          <div className="tax-table-wrap">
            <table className="tax-table">
              <thead><tr>{['Tax Type', 'Period', 'Due Date', 'Taxable Amount', 'Tax Payable', 'Paid Amount', 'Status', 'Actions'].map(col => <th key={col}>{col}</th>)}</tr></thead>
              <tbody>
                {filteredObligations.map(item => (
                  <tr key={item.type}>
                    <td data-label="Tax Type">{item.type}</td>
                    <td data-label="Period">{item.period}</td>
                    <td data-label="Due Date">{item.dueDate}</td>
                    <td data-label="Taxable Amount">{money(item.taxableAmount, data.currency)}</td>
                    <td data-label="Tax Payable">{money(item.payable, data.currency)}</td>
                    <td data-label="Paid Amount">{money(item.paid, data.currency)}</td>
                    <td data-label="Status"><StatusPill value={item.status} /></td>
                    <td data-label="Actions"><button type="button" className="tax-icon-button"><MoreHorizontal size={15} /></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {filteredObligations.length === 0 && <EmptyState message="No tax obligations match the current filters." />}
          <div className="tax-pagination"><strong>Showing {filteredObligations.length ? 1 : 0} to {filteredObligations.length} of {derivedObligations.length} obligations</strong><div><button type="button" disabled>‹</button><button type="button" className="is-active">1</button><button type="button" disabled>›</button><button type="button">{Math.max(filteredObligations.length, 10)} / page <ChevronDown size={14} /></button></div></div>
        </div>

        <div className="tax-side-stack">
          <SideList title="Recent Filings" items={filings} />
          <SideList title="Tax Certificates" items={certificates} />
        </div>
      </section>
      </div>

      <div
        role={activeTab === 'overview' ? undefined : 'tabpanel'}
        id={activeTab === 'overview' ? undefined : `tax-panel-${activeTab}`}
        aria-labelledby={activeTab === 'overview' ? undefined : `tax-tab-${activeTab}`}
        className={activeTab === 'overview' ? 'tax-hidden' : 'tax-tab-panel'}
      >
        {activeTab === 'obligations' && (
          <TaxObligationsPanel
            obligations={filteredObligations}
            totalCount={derivedObligations.length}
            currency={data.currency}
            searchTerm={searchTerm}
            onSearchTermChange={setSearchTerm}
            typeFilter={typeFilter}
            onTypeFilterChange={setTypeFilter}
            statusFilter={statusFilter}
            onStatusFilterChange={setStatusFilter}
            taxTypes={taxTypes}
            taxStatuses={taxStatuses}
          />
        )}
        {activeTab === 'filings' && <SideList title="Tax Filings" items={filings} />}
        {activeTab === 'payments' && <PaymentsPanel payments={payments} currency={data.currency} />}
        {activeTab === 'certificates' && <SideList title="Tax Certificates" items={certificates} />}
        {activeTab === 'reports' && <ReportsPanel reports={reports} />}
        {activeTab === 'calendar' && <CalendarPanel deadlines={deadlines} />}
      </div>
    </div>
  )
}

function TaxObligationsPanel({
  obligations,
  totalCount,
  currency,
  searchTerm,
  onSearchTermChange,
  typeFilter,
  onTypeFilterChange,
  statusFilter,
  onStatusFilterChange,
  taxTypes,
  taxStatuses,
}: {
  obligations: AccountingTaxObligation[]
  totalCount: number
  currency: string
  searchTerm: string
  onSearchTermChange: (value: string) => void
  typeFilter: string
  onTypeFilterChange: (value: string) => void
  statusFilter: string
  onStatusFilterChange: (value: string) => void
  taxTypes: string[]
  taxStatuses: string[]
}) {
  return (
    <div className="tax-card">
      <h2>Tax Obligations</h2>
      <div className="tax-filterbar">
        <label><Search size={15} color="#64748b" /><input value={searchTerm} onChange={event => onSearchTermChange(event.target.value)} placeholder="Search tax obligations..." /></label>
        <select value={typeFilter} onChange={event => onTypeFilterChange(event.target.value)} aria-label="Filter tax type">
          {taxTypes.map(type => <option key={type} value={type}>{type === 'All' ? 'All Tax Types' : type}</option>)}
        </select>
        <select value={statusFilter} onChange={event => onStatusFilterChange(event.target.value)} aria-label="Filter tax status">
          {taxStatuses.map(status => <option key={status} value={status}>{status === 'All' ? 'All Status' : status}</option>)}
        </select>
        <button type="button"><CalendarDays size={15} /> Current records</button>
        <button type="button" onClick={() => { onSearchTermChange(''); onTypeFilterChange('All'); onStatusFilterChange('All') }}><SlidersHorizontal size={15} /> Reset Filters</button>
      </div>
      <TaxObligationsTable obligations={obligations} currency={currency} />
      {obligations.length === 0 && <EmptyState message="No tax obligations match the current filters." />}
      <div className="tax-pagination"><strong>Showing {obligations.length ? 1 : 0} to {obligations.length} of {totalCount} obligations</strong><div><button type="button" disabled>‹</button><button type="button" className="is-active">1</button><button type="button" disabled>›</button><button type="button">{Math.max(obligations.length, 10)} / page <ChevronDown size={14} /></button></div></div>
    </div>
  )
}

function TaxObligationsTable({ obligations, currency }: { obligations: AccountingTaxObligation[]; currency: string }) {
  return (
    <div className="tax-table-wrap">
      <table className="tax-table">
        <thead><tr>{['Tax Type', 'Period', 'Due Date', 'Taxable Amount', 'Tax Payable', 'Paid Amount', 'Status', 'Actions'].map(col => <th key={col}>{col}</th>)}</tr></thead>
        <tbody>
          {obligations.map(item => (
            <tr key={item.id || item.type}>
              <td data-label="Tax Type">{item.type}</td>
              <td data-label="Period">{item.period || 'Current records'}</td>
              <td data-label="Due Date">{item.dueDate ? formatDate(item.dueDate) : 'No due date set'}</td>
              <td data-label="Taxable Amount">{money(item.taxableAmount, currency)}</td>
              <td data-label="Tax Payable">{money(item.payable, currency)}</td>
              <td data-label="Paid Amount">{money(item.paid, currency)}</td>
              <td data-label="Status"><StatusPill value={item.status} /></td>
              <td data-label="Actions"><button type="button" className="tax-icon-button" aria-label={`Open actions for ${item.type}`}><MoreHorizontal size={15} /></button></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function PaymentsPanel({ payments, currency }: { payments: Array<{ id: string; type: string; period: string; date: string; amount: number; status: TaxStatus }>; currency: string }) {
  return (
    <div className="tax-card">
      <h2>Tax Payments</h2>
      <div className="tax-record-list">
        {payments.map(payment => (
          <div key={payment.id} className="tax-record-row">
            <CreditCard size={18} />
            <span><strong>{payment.type}</strong><small>{payment.period} · {payment.date}</small></span>
            <strong>{money(payment.amount, currency)}</strong>
            <StatusPill value={payment.status} />
          </div>
        ))}
      </div>
      {payments.length === 0 && <EmptyState message="No tax payments have been recorded yet." />}
    </div>
  )
}

function ReportsPanel({ reports }: { reports: Array<{ title: string; detail: string; value: string }> }) {
  return (
    <div className="tax-report-grid">
      {reports.map(report => (
        <div key={report.title} className="tax-card tax-report-card">
          <FileText size={19} />
          <span><strong>{report.title}</strong><small>{report.detail}</small></span>
          <b>{report.value}</b>
        </div>
      ))}
    </div>
  )
}

function CalendarPanel({ deadlines }: { deadlines: Array<{ month: string; day: string; title: string; detail: string; time: string }> }) {
  return (
    <div className="tax-card">
      <div className="tax-panel-header"><h2>Compliance Calendar</h2><Link href="/accounting/tax-compliance">Current records</Link></div>
      <div className="tax-deadlines tax-calendar-list">
        {deadlines.map(item => (
          <div key={`${item.month}-${item.day}-${item.title}`}>
            <time><small>{item.month}</small><strong>{item.day}</strong></time>
            <span><strong>{item.title}</strong><small>{item.detail}</small></span>
            <em>{item.time}</em>
          </div>
        ))}
      </div>
      {deadlines.length === 0 && <EmptyState message="No tax due dates are scheduled for the current records." />}
    </div>
  )
}

function EmptyState({ message }: { message: string }) {
  return <div className="tax-empty">{message}</div>
}

function SideList({ title, items }: { title: string; items: Array<{ title: string; date: string; status: TaxStatus }> }) {
  return (
    <div className="tax-card">
      <div className="tax-panel-header"><h2>{title}</h2><Link href="/accounting/tax-compliance">View All</Link></div>
      <div className="tax-side-list">
        {items.map(item => (
          <div key={item.title}>
            <FileText size={18} />
            <span><strong>{item.title}</strong><small>{item.date}</small></span>
            <StatusPill value={item.status} />
            <ChevronDown size={15} />
          </div>
        ))}
      </div>
      {items.length === 0 && <EmptyState message={`No ${title.toLowerCase()} found for the current records.`} />}
    </div>
  )
}

function exportTaxRows(
  activeTab: TaxTabId,
  obligations: AccountingTaxObligation[],
  payments: Array<{ type: string; period: string; date: string; amount: number; status: TaxStatus }>,
  filings: Array<{ title: string; date: string; status: TaxStatus }>,
  certificates: Array<{ title: string; date: string; status: TaxStatus }>,
  reports: Array<{ title: string; detail: string; value: string }>,
  currency: string,
) {
  const rows = activeTab === 'payments'
    ? payments.map(item => ({ Type: item.type, Period: item.period, Date: item.date, Amount: money(item.amount, currency), Status: item.status }))
    : activeTab === 'filings'
      ? filings.map(item => ({ Filing: item.title, Date: item.date, Status: item.status }))
      : activeTab === 'certificates'
        ? certificates.map(item => ({ Certificate: item.title, Date: item.date, Status: item.status }))
        : activeTab === 'reports'
          ? reports.map(item => ({ Report: item.title, Detail: item.detail, Value: item.value }))
          : obligations.map(item => ({
            Type: item.type,
            Period: item.period || 'Current records',
            DueDate: item.dueDate ? formatDate(item.dueDate) : 'No due date set',
            TaxableAmount: money(item.taxableAmount, currency),
            TaxPayable: money(item.payable, currency),
            PaidAmount: money(item.paid, currency),
            Status: item.status,
          }))

  downloadCsv(`tax-${activeTab}.csv`, rows)
}

function downloadCsv(filename: string, rows: Array<Record<string, string | number>>) {
  if (rows.length === 0 || typeof document === 'undefined') return
  const headers = Object.keys(rows[0])
  const csv = [
    headers.join(','),
    ...rows.map(row => headers.map(header => {
      const value = String(row[header] ?? '')
      return `"${value.replaceAll('"', '""')}"`
    }).join(',')),
  ].join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

const taxCss = `
.tax-page { padding: 26px 28px 40px; color: #0f172a; }
.tax-header { display: flex; justify-content: space-between; align-items: flex-start; gap: 18px; margin-bottom: 24px; }
.tax-title { margin: 0; font-size: 28px; line-height: 1.1; font-weight: 950; }
.tax-subtitle { margin: 8px 0 0; color: #334155; font-size: 13.5px; }
.tax-actions { display: flex; gap: 12px; flex-wrap: wrap; justify-content: flex-end; }
.tax-actions button, .tax-filterbar button, .tax-filterbar select, .tax-pagination button { min-height: 38px; border-radius: 8px; border: 1px solid #e8edf4; background: #fff; color: #0f172a; display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 0 12px; font-size: 12.5px; font-weight: 850; cursor: pointer; }
.tax-pagination button:disabled { color: #94a3b8; cursor: not-allowed; }
.tax-metrics { display: grid; grid-template-columns: repeat(5, minmax(170px, 1fr)); gap: 18px; margin-bottom: 18px; }
.tax-card { background: #fff; border: 1px solid #e8edf4; border-radius: 8px; padding: 18px; box-shadow: 0 1px 2px rgba(15, 23, 42, .03); }
.tax-metric-card { min-height: 100px; display: flex; align-items: center; }
.tax-metric-icon { width: 54px; height: 54px; border-radius: 9px; display: grid; place-items: center; margin-right: 16px; flex: 0 0 auto; }
.tax-label { display: block; color: #475569; font-size: 12px; font-weight: 850; }
.tax-value { display: block; color: #0f172a; font-size: 23px; margin-top: 8px; white-space: nowrap; }
.tax-detail { display: block; font-size: 11.5px; font-weight: 900; margin-top: 8px; }
.tax-tabs { display: flex; gap: 32px; border-bottom: 1px solid #e8edf4; padding-left: 14px; overflow-x: auto; }
.tax-tabs button { border: 0; border-bottom: 2px solid transparent; background: transparent; color: #0f172a; min-height: 48px; padding: 0; font-size: 12.5px; font-weight: 900; cursor: pointer; white-space: nowrap; }
.tax-tabs .is-active { color: #16a34a; border-bottom-color: #16a34a; }
.tax-hidden { display: none !important; }
.tax-tab-panel { margin-top: 16px; }
.tax-top-grid { display: grid; grid-template-columns: minmax(420px, 1.1fr) minmax(330px, .9fr) minmax(330px, .9fr); gap: 16px; margin-top: 16px; }
.tax-main-grid { display: grid; grid-template-columns: minmax(0, 1fr) 380px; gap: 16px; margin-top: 16px; }
.tax-side-stack { display: grid; gap: 16px; }
.tax-card h2, .tax-panel-header h2 { margin: 0; font-size: 16px; font-weight: 950; }
.tax-panel-header { display: flex; justify-content: space-between; align-items: center; gap: 12px; margin-bottom: 16px; }
.tax-panel-header a { color: #2563eb; font-size: 12px; font-weight: 900; text-decoration: none; }
.tax-liability { display: grid; grid-template-columns: minmax(150px, 190px) minmax(0, 1fr); gap: 28px; align-items: center; margin-top: 20px; }
.tax-donut { width: clamp(150px, 14vw, 180px); aspect-ratio: 1; border-radius: 50%; display: grid; place-items: center; justify-self: center; }
.tax-donut-center { width: 62%; aspect-ratio: 1; border-radius: 50%; background: #fff; display: grid; place-items: center; align-content: center; gap: 6px; padding: 10px; text-align: center; }
.tax-donut strong { display: block; max-width: 100%; color: #0f172a; font-size: clamp(15px, 1.35vw, 19px); line-height: 1.08; overflow-wrap: anywhere; }
.tax-donut small { color: #64748b; font-size: 11.5px; font-weight: 850; line-height: 1.15; }
.tax-liability-list { display: grid; gap: 14px; min-width: 0; }
.tax-liability-list div { display: grid; grid-template-columns: minmax(0, 1.25fr) minmax(105px, .7fr) minmax(68px, .45fr); gap: 14px; align-items: center; font-size: 13px; }
.tax-liability-type { display: flex; align-items: flex-start; gap: 10px; min-width: 0; line-height: 1.25; }
.tax-liability-type span { min-width: 0; overflow-wrap: anywhere; }
.tax-liability-list i { width: 12px; height: 12px; border-radius: 4px; display: inline-block; flex: 0 0 auto; margin-top: 2px; }
.tax-liability-amount, .tax-liability-percent { justify-self: end; text-align: right; white-space: nowrap; }
.tax-liability-head { color: #64748b; font-size: 11px !important; font-weight: 900; }
.tax-liability-total { border-top: 1px solid #eef2f7; padding-top: 12px; font-weight: 950; }
.tax-status-list, .tax-deadlines, .tax-side-list { display: grid; gap: 13px; }
.tax-status-list div { display: grid; grid-template-columns: 38px minmax(0, 1fr) auto; align-items: center; gap: 12px; border: 1px solid #eef2f7; border-radius: 8px; padding: 11px; }
.tax-status-list small, .tax-deadlines small, .tax-side-list small { display: block; color: #64748b; margin-top: 4px; }
.tax-status-icon { width: 34px; height: 34px; border-radius: 8px; display: grid; place-items: center; }
.tax-status-icon.good { background: #dcfce7; color: #16a34a; }
.tax-status-icon.warn { background: #fff7ed; color: #f59e0b; }
.tax-status-icon.bad { background: #fef2f2; color: #ef4444; }
.tax-deadlines div { display: grid; grid-template-columns: 46px minmax(0, 1fr) auto; align-items: center; gap: 12px; border-bottom: 1px solid #eef2f7; padding-bottom: 13px; }
.tax-deadlines time small { color: #16a34a; font-size: 10px; font-weight: 950; }
.tax-deadlines time strong { display: block; font-size: 22px; }
.tax-deadlines em { color: #d97706; font-style: normal; font-size: 12px; font-weight: 900; }
.tax-filterbar { display: grid; grid-template-columns: minmax(210px, 1fr) 150px 150px 190px 150px; gap: 12px; margin: 16px 0 14px; }
.tax-filterbar label { min-height: 38px; border-radius: 8px; border: 1px solid #e8edf4; display: flex; align-items: center; gap: 10px; padding: 0 12px; }
.tax-filterbar input { flex: 1; min-width: 0; border: 0; outline: 0; background: transparent; font-size: 12.5px; }
.tax-filterbar select { width: 100%; appearance: auto; }
.tax-table-wrap { overflow-x: auto; }
.tax-table { width: 100%; min-width: 860px; border-collapse: collapse; }
.tax-table th { text-align: left; padding: 12px 10px; color: #64748b; font-size: 11px; font-weight: 900; }
.tax-table td { padding: 12px 10px; border-top: 1px solid #eef2f7; color: #0f172a; font-size: 12.5px; }
.tax-icon-button { width: 32px; height: 32px; border: 1px solid #e8edf4; border-radius: 7px; background: #fff; display: grid; place-items: center; }
.tax-pill { display: inline-flex; min-height: 24px; border-radius: 6px; align-items: center; padding: 0 9px; font-size: 11.5px; font-weight: 900; }
.tax-pill.paid, .tax-pill.compliant, .tax-pill.filed, .tax-pill.valid { background: #dcfce7; color: #15803d; }
.tax-pill.partially-paid { background: #dbeafe; color: #2563eb; }
.tax-pill.pending, .tax-pill.due-in-10-days { background: #fff7ed; color: #d97706; }
.tax-pill.overdue { background: #fef2f2; color: #ef4444; }
.tax-pagination { display: flex; justify-content: space-between; align-items: center; gap: 16px; padding-top: 16px; }
.tax-pagination div { display: flex; gap: 8px; flex-wrap: wrap; justify-content: flex-end; }
.tax-pagination .is-active { background: #16a34a; color: #fff; border-color: #16a34a; }
.tax-side-list div { display: grid; grid-template-columns: 34px minmax(0, 1fr) auto 16px; align-items: center; gap: 12px; border-bottom: 1px solid #eef2f7; padding-bottom: 13px; }
.tax-side-list svg { color: #2563eb; }
.tax-empty { border: 1px dashed #cbd5e1; border-radius: 8px; color: #64748b; font-size: 13px; font-weight: 850; margin-top: 14px; padding: 18px; text-align: center; }
.tax-record-list { display: grid; gap: 12px; margin-top: 16px; }
.tax-record-row { display: grid; grid-template-columns: 36px minmax(0, 1fr) auto auto; align-items: center; gap: 12px; border: 1px solid #eef2f7; border-radius: 8px; padding: 12px; }
.tax-record-row svg { color: #2563eb; }
.tax-record-row small, .tax-report-card small { display: block; color: #64748b; margin-top: 4px; }
.tax-report-grid { display: grid; grid-template-columns: repeat(4, minmax(180px, 1fr)); gap: 16px; }
.tax-report-card { display: grid; grid-template-columns: 38px minmax(0, 1fr); gap: 12px; align-items: start; }
.tax-report-card svg { color: #16a34a; }
.tax-report-card b { grid-column: 2; color: #0f172a; font-size: 20px; }
.tax-calendar-list { margin-top: 14px; }
@media (max-width: 1280px) {
  .tax-page { padding: 22px; }
  .tax-header { flex-direction: column; }
  .tax-actions { width: 100%; justify-content: flex-start; }
  .tax-metrics { grid-template-columns: repeat(3, minmax(180px, 1fr)); }
  .tax-top-grid, .tax-main-grid { grid-template-columns: 1fr; }
  .tax-side-stack { grid-template-columns: 1fr 1fr; }
  .tax-report-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}
@media (max-width: 900px) {
  .tax-metrics, .tax-side-stack, .tax-filterbar { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .tax-liability { grid-template-columns: 1fr; justify-items: center; }
  .tax-liability-list { width: 100%; }
  .tax-pagination { flex-direction: column; align-items: flex-start; }
}
@media (max-width: 640px) {
  .tax-page { padding: 16px; }
  .tax-title { font-size: 24px; }
  .tax-actions, .tax-metrics, .tax-side-stack, .tax-filterbar { display: grid; grid-template-columns: 1fr; }
  .tax-report-grid { grid-template-columns: 1fr; }
  .tax-value { font-size: 21px; }
  .tax-tabs { margin-left: -16px; margin-right: -16px; padding-left: 16px; padding-right: 16px; }
  .tax-card { padding: 14px; }
  .tax-liability-list div { grid-template-columns: minmax(0, 1fr) auto; gap: 7px 12px; }
  .tax-liability-head { display: none !important; }
  .tax-liability-type { grid-column: 1 / -1; }
  .tax-liability-amount { justify-self: start; text-align: left; }
  .tax-liability-percent { justify-self: end; text-align: right; }
  .tax-status-list div, .tax-deadlines div, .tax-side-list div { grid-template-columns: 38px minmax(0, 1fr); }
  .tax-record-row { grid-template-columns: 32px minmax(0, 1fr); }
  .tax-record-row > strong, .tax-record-row .tax-pill { grid-column: 2; justify-self: start; }
  .tax-status-list .tax-pill, .tax-deadlines em, .tax-side-list .tax-pill { grid-column: 2; justify-self: start; }
  .tax-table-wrap { overflow: visible; }
  .tax-table, .tax-table thead, .tax-table tbody, .tax-table tr, .tax-table td { display: block; width: 100%; min-width: 0; }
  .tax-table thead { display: none; }
  .tax-table tr { border: 1px solid #eef2f7; border-radius: 8px; margin-bottom: 12px; background: #fff; overflow: hidden; }
  .tax-table td { border-top: 0; display: grid; grid-template-columns: 120px minmax(0, 1fr); gap: 10px; padding: 10px 12px; }
  .tax-table td::before { content: attr(data-label); color: #64748b; font-size: 11px; font-weight: 900; text-transform: uppercase; }
}
`
