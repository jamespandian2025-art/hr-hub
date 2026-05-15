'use client'

import {
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Download,
  Eye,
  FileText,
  Filter,
  MoreHorizontal,
  Plus,
  Search,
  Settings,
  SlidersHorizontal,
  TrendingUp,
  User,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

const font = 'var(--font-body)'

type InvoiceStatus = 'Paid' | 'Partially Paid' | 'Overdue' | 'Sent'

type Invoice = {
  number: string
  customer: string
  email: string
  issueDate: string
  dueDate: string
  dueIn: string
  amount: number
  paid: number
  status: InvoiceStatus
}

type Metric = {
  title: string
  value: string
  detail: string
  icon: LucideIcon
  tone: string
  trend: 'up' | 'down'
}

const invoiceSummary = {
  totalInvoices: 128,
  totalRevenue: 125430,
  paid: 89250,
  outstanding: 32650,
  overdue: 18540,
}

const invoices: Invoice[] = [
  {
    number: 'INV-2024-0128',
    customer: 'Acme Corporation',
    email: 'acme@corporation.com',
    issueDate: 'May 31, 2024',
    dueDate: 'Jun 30, 2024',
    dueIn: '30 days',
    amount: 7500,
    paid: 7500,
    status: 'Paid',
  },
  {
    number: 'INV-2024-0127',
    customer: 'Globex Corporation',
    email: 'billing@globex.com',
    issueDate: 'May 30, 2024',
    dueDate: 'Jun 29, 2024',
    dueIn: '29 days',
    amount: 12000,
    paid: 6000,
    status: 'Partially Paid',
  },
]

const tabs = ['All Invoices', 'Draft', 'Sent', 'Viewed', 'Partially Paid', 'Paid', 'Overdue', 'Cancelled']
const filters = [
  { label: 'Customer', icon: User },
  { label: 'Status', icon: null },
  { label: 'Date Range', icon: CalendarDays },
]

function money(value: number) {
  return `$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function StatusPill({ value }: { value: InvoiceStatus }) {
  return <span className={`invoice-status ${value.toLowerCase().replaceAll(' ', '-')}`}>{value}</span>
}

export default function InvoicesPage() {
  const metrics: Metric[] = [
    { title: 'Total Invoices', value: String(invoiceSummary.totalInvoices), detail: '18.6% vs last month', icon: FileText, tone: '#16a34a', trend: 'up' },
    { title: 'Total Revenue', value: money(invoiceSummary.totalRevenue), detail: '26.3% vs last month', icon: TrendingUp, tone: '#2563eb', trend: 'up' },
    { title: 'Paid', value: money(invoiceSummary.paid), detail: '21.8% vs last month', icon: CheckCircle2, tone: '#059669', trend: 'up' },
    { title: 'Outstanding', value: money(invoiceSummary.outstanding), detail: '8.4% vs last month', icon: FileText, tone: '#f59e0b', trend: 'down' },
    { title: 'Overdue', value: money(invoiceSummary.overdue), detail: '5.2% vs last month', icon: Clock3, tone: '#ef4444', trend: 'down' },
  ]

  return (
    <div className="invoices-page" style={{ fontFamily: font }}>
      <style>{invoiceCss}</style>

      <header className="invoices-header">
        <div>
          <h1>Invoices</h1>
          <p>Create, manage, and track customer invoices and payments.</p>
        </div>
        <div className="header-actions">
          <label className="top-search">
            <Search size={15} color="#64748b" />
            <input placeholder="Search invoices, customers..." />
          </label>
          <button type="button"><Filter size={15} /> Filters</button>
          <button type="button" className="primary"><Plus size={16} /> New Invoice <ChevronDown size={14} /></button>
        </div>
      </header>

      <section className="invoice-metrics">
        {metrics.map(metric => {
          const Icon = metric.icon
          return (
            <article key={metric.title} className="invoice-card metric-card">
              <span style={{ color: metric.tone, background: `${metric.tone}12` }}><Icon size={23} /></span>
              <div>
                <small>{metric.title}</small>
                <strong>{metric.value}</strong>
                <em className={metric.trend}>{metric.trend === 'up' ? 'Up' : 'Down'} {metric.detail}</em>
              </div>
            </article>
          )
        })}
      </section>

      <nav className="invoice-tabs" aria-label="Invoice status filters">
        {tabs.map((tab, index) => <button key={tab} type="button" className={index === 0 ? 'is-active' : undefined}>{tab}</button>)}
      </nav>

      <section className="invoice-card invoice-panel">
        <div className="invoice-filters">
          <label className="search-box">
            <Search size={16} color="#64748b" />
            <input placeholder="Search invoices..." />
          </label>
          {filters.map(filter => {
            const Icon = filter.icon
            return (
              <button key={filter.label} type="button">
                {Icon ? <Icon size={15} /> : null}
                {filter.label}
                <ChevronDown size={14} />
              </button>
            )
          })}
          <button type="button"><SlidersHorizontal size={15} /> More Filters</button>
          <div className="filter-spacer" />
          <button type="button"><Download size={15} /> Export</button>
          <button type="button" aria-label="Invoice settings" className="icon-only"><Settings size={16} /></button>
        </div>

        <div className="invoice-table-wrap">
          <table className="invoice-table">
            <thead>
              <tr>
                <th><span className="checkbox" /></th>
                <th>Invoice #</th>
                <th>Customer</th>
                <th>Issue Date</th>
                <th>Due Date</th>
                <th>Amount</th>
                <th>Paid</th>
                <th>Balance Due</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map(invoice => {
                const balanceDue = invoice.amount - invoice.paid
                return (
                  <tr key={invoice.number}>
                    <td data-label="Select"><span className="checkbox" /></td>
                    <td data-label="Invoice #"><strong className="invoice-number">{invoice.number}</strong></td>
                    <td data-label="Customer"><strong className="customer">{invoice.customer}<small>{invoice.email}</small></strong></td>
                    <td data-label="Issue Date">{invoice.issueDate}</td>
                    <td data-label="Due Date"><strong className="due-date">{invoice.dueDate}<small>{invoice.dueIn}</small></strong></td>
                    <td data-label="Amount">{money(invoice.amount)}</td>
                    <td data-label="Paid">{money(invoice.paid)}</td>
                    <td data-label="Balance Due" className={balanceDue > 0 ? 'balance-open' : undefined}>{money(balanceDue)}</td>
                    <td data-label="Status"><StatusPill value={invoice.status} /></td>
                    <td data-label="Actions">
                      <span className="row-actions">
                        <button type="button" aria-label={`View ${invoice.number}`}><Eye size={15} /></button>
                        <button type="button" aria-label={`More actions for ${invoice.number}`}><MoreHorizontal size={15} /></button>
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        <footer className="invoice-pagination">
          <span>Showing 1 to {invoices.length} of {invoiceSummary.totalInvoices} invoices</span>
          <div>
            <button type="button" aria-label="Previous page"><ChevronLeft size={15} /></button>
            {[1, 2, 3, 4, 5].map(page => <button key={page} type="button" className={page === 1 ? 'is-active' : undefined}>{page}</button>)}
            <span>...</span>
            <button type="button">13</button>
            <button type="button" aria-label="Next page"><ChevronRight size={15} /></button>
          </div>
          <button type="button">10 / page <ChevronDown size={14} /></button>
        </footer>
      </section>
    </div>
  )
}

const invoiceCss = `
.invoices-page {
  min-height: 100vh;
  background: #f8fafc;
  color: #0f172a;
  padding: 24px 28px 32px;
}
.invoices-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 18px;
  margin-bottom: 24px;
}
.invoices-header h1 {
  margin: 0;
  font-size: 28px;
  line-height: 1.1;
  font-weight: 950;
  letter-spacing: 0;
}
.invoices-header p {
  margin: 8px 0 0;
  color: #475569;
  font-size: 14px;
}
.header-actions,
.top-search,
.invoice-filters,
.search-box,
.invoice-pagination,
.invoice-pagination div,
.row-actions {
  display: flex;
  align-items: center;
}
.header-actions {
  gap: 12px;
  flex-wrap: wrap;
  justify-content: flex-end;
}
.top-search,
.search-box {
  min-height: 40px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  background: #fff;
  padding: 0 12px;
  gap: 10px;
}
.top-search {
  width: min(300px, 42vw);
}
.top-search input,
.search-box input {
  min-width: 0;
  flex: 1;
  border: 0;
  outline: 0;
  background: transparent;
  color: #0f172a;
  font-size: 13px;
}
.header-actions button,
.invoice-filters button,
.invoice-pagination button {
  min-height: 40px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  background: #fff;
  color: #0f172a;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 0 14px;
  font-size: 12.5px;
  font-weight: 850;
  cursor: pointer;
}
.header-actions .primary {
  border-color: #047857;
  background: #047857;
  color: #fff;
}
.invoice-card {
  background: #fff;
  border: 1px solid #e8edf4;
  border-radius: 8px;
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.03);
}
.invoice-metrics {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 16px;
  margin-bottom: 22px;
}
.metric-card {
  min-height: 132px;
  display: flex;
  align-items: center;
  gap: 18px;
  padding: 22px;
}
.metric-card > span {
  width: 54px;
  height: 54px;
  border-radius: 10px;
  display: grid;
  place-items: center;
  flex-shrink: 0;
}
.metric-card small,
.customer small,
.due-date small {
  display: block;
  color: #475569;
  font-size: 12px;
  font-weight: 800;
}
.metric-card strong {
  display: block;
  margin-top: 9px;
  font-size: 24px;
  line-height: 1;
  font-weight: 950;
}
.metric-card em {
  display: block;
  margin-top: 12px;
  font-style: normal;
  font-size: 12px;
  font-weight: 850;
}
.metric-card em.up {
  color: #16a34a;
}
.metric-card em.down {
  color: #ef4444;
}
.invoice-tabs {
  display: flex;
  gap: 36px;
  overflow-x: auto;
  scrollbar-width: none;
  border-bottom: 1px solid #e8edf4;
}
.invoice-tabs button {
  position: relative;
  min-height: 48px;
  border: 0;
  background: transparent;
  color: #334155;
  padding: 0;
  font-size: 13px;
  font-weight: 850;
  white-space: nowrap;
  cursor: pointer;
}
.invoice-tabs button.is-active {
  color: #047857;
}
.invoice-tabs button.is-active::after {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  bottom: -1px;
  height: 3px;
  border-radius: 999px;
  background: #059669;
}
.invoice-panel {
  border-top: 0;
  border-radius: 0 0 8px 8px;
  overflow: hidden;
}
.invoice-filters {
  gap: 12px;
  padding: 18px;
  flex-wrap: wrap;
}
.search-box {
  width: 270px;
}
.invoice-filters button {
  min-width: 142px;
}
.invoice-filters .icon-only {
  min-width: 40px;
  width: 40px;
  padding: 0;
}
.filter-spacer {
  flex: 1;
}
.invoice-table-wrap {
  overflow-x: auto;
  padding: 0 18px;
}
.invoice-table {
  width: 100%;
  min-width: 980px;
  border-collapse: collapse;
}
.invoice-table th,
.invoice-table td {
  padding: 16px 12px;
  border-bottom: 1px solid #eef2f7;
  text-align: left;
  vertical-align: middle;
  font-size: 13px;
}
.invoice-table th {
  background: #fbfdff;
  color: #475569;
  font-size: 12px;
  font-weight: 900;
}
.invoice-table td {
  color: #0f172a;
  font-weight: 700;
}
.checkbox {
  width: 16px;
  height: 16px;
  border: 1px solid #d9e1ec;
  border-radius: 4px;
  display: inline-block;
  background: #fff;
}
.invoice-number {
  color: #047857;
  font-weight: 950;
}
.customer,
.due-date {
  display: block;
  line-height: 1.25;
}
.customer small,
.due-date small {
  margin-top: 4px;
  font-weight: 700;
}
.balance-open {
  color: #f59e0b !important;
}
.invoice-status {
  display: inline-flex;
  min-height: 24px;
  align-items: center;
  border-radius: 6px;
  padding: 0 9px;
  font-size: 11px;
  font-weight: 900;
  white-space: nowrap;
}
.invoice-status.paid {
  background: #eafaf1;
  color: #059669;
}
.invoice-status.partially-paid {
  background: #fff7ed;
  color: #d97706;
}
.invoice-status.overdue {
  background: #fff1f2;
  color: #dc2626;
}
.invoice-status.sent {
  background: #eff6ff;
  color: #2563eb;
}
.row-actions {
  gap: 8px;
}
.row-actions button {
  width: 34px;
  height: 34px;
  border: 1px solid #e8edf4;
  border-radius: 8px;
  background: #fff;
  color: #0f172a;
  display: grid;
  place-items: center;
  cursor: pointer;
}
.invoice-pagination {
  min-height: 72px;
  justify-content: space-between;
  gap: 14px;
  padding: 0 18px;
}
.invoice-pagination span {
  color: #0f172a;
  font-size: 13px;
  font-weight: 800;
}
.invoice-pagination div {
  gap: 8px;
  flex-wrap: wrap;
  justify-content: center;
}
.invoice-pagination button {
  min-width: 38px;
  padding: 0 10px;
}
.invoice-pagination button.is-active {
  background: #059669;
  border-color: #059669;
  color: #fff;
}
@media (max-width: 1280px) {
  .invoice-metrics {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}
@media (max-width: 980px) {
  .invoices-page {
    padding: 20px 18px 28px;
  }
  .invoices-header {
    flex-direction: column;
  }
  .header-actions {
    width: 100%;
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto auto;
    justify-content: stretch;
  }
  .top-search {
    width: 100%;
  }
  .invoice-metrics {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .invoice-filters {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .search-box {
    width: 100%;
    grid-column: 1 / -1;
  }
  .invoice-filters button {
    min-width: 0;
    width: 100%;
  }
  .filter-spacer {
    display: none;
  }
}
@media (max-width: 720px) {
  .invoices-page {
    padding: 16px 12px 24px;
  }
  .invoices-header h1 {
    font-size: 24px;
  }
  .header-actions,
  .invoice-filters,
  .invoice-metrics {
    grid-template-columns: 1fr;
  }
  .header-actions button {
    width: 100%;
  }
  .metric-card {
    min-height: auto;
    padding: 16px;
  }
  .invoice-tabs {
    gap: 22px;
  }
  .invoice-table-wrap {
    padding: 0;
  }
  .invoice-table {
    min-width: 0;
  }
  .invoice-table thead {
    display: none;
  }
  .invoice-table,
  .invoice-table tbody,
  .invoice-table tr,
  .invoice-table td {
    display: block;
    width: 100%;
  }
  .invoice-table tr {
    padding: 14px;
    border-bottom: 1px solid #eef2f7;
  }
  .invoice-table td {
    display: grid;
    grid-template-columns: 108px minmax(0, 1fr);
    gap: 12px;
    border-bottom: 0;
    padding: 8px 0;
    font-size: 12.5px;
  }
  .invoice-table td::before {
    content: attr(data-label);
    color: #64748b;
    font-size: 11px;
    font-weight: 900;
  }
  .row-actions {
    justify-content: flex-start;
  }
  .invoice-pagination {
    flex-direction: column;
    align-items: stretch;
    padding: 16px;
  }
  .invoice-pagination > button {
    width: 100%;
  }
}
`
