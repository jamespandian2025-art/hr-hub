'use client'

import Link from 'next/link'
import {
  ArrowUp,
  Banknote,
  CalendarDays,
  ChevronDown,
  Clock3,
  Download,
  FileBarChart,
  FileText,
  Filter,
  MoreHorizontal,
  Plus,
  Search,
  Settings,
  ShoppingCart,
  SlidersHorizontal,
  WalletCards,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

const font = 'var(--font-body)'

type ReportCategory = {
  name: string
  description: string
  icon: LucideIcon
  tone: string
}

type GeneratedReport = {
  name: string
  category: string
  generatedBy: string
  generatedOn: string
  format: 'PDF' | 'XLSX'
}

type ScheduledReport = {
  title: string
  cadence: string
  active: boolean
}

const financialSummary = {
  revenue: 2450000,
  expenses: 1485750.25,
  cashBalance: 1245300.5,
  currentAr: 742850,
  currentAp: 358400.75,
}

const monthlyReports = [
  { label: "Dec '23", revenue: 292000, expenses: 245000, profit: 130000 },
  { label: "Jan '24", revenue: 398000, expenses: 286000, profit: 112000 },
  { label: "Feb '24", revenue: 352000, expenses: 258000, profit: 160000 },
  { label: "Mar '24", revenue: 386000, expenses: 306000, profit: 163000 },
  { label: "Apr '24", revenue: 342000, expenses: 252000, profit: 151000 },
  { label: "May '24", revenue: 462000, expenses: 305000, profit: 228000 },
]

const expenseCategories = [
  { name: 'Operating Expenses', value: 631943.86, color: '#16a34a' },
  { name: 'Payroll Expenses', value: 426321.35, color: '#2563eb' },
  { name: 'Administrative', value: 217250.8, color: '#7c3aed' },
  { name: 'Sales & Marketing', value: 137067.34, color: '#f59e0b' },
  { name: 'Others', value: 73167.9, color: '#64748b' },
]

const reportCategories: ReportCategory[] = [
  { name: 'Financial Statements', description: 'Balance Sheet, P&L, Cash Flow', icon: FileText, tone: '#16a34a' },
  { name: 'Management Reports', description: 'KPIs, Financial Summary, Trends', icon: FileBarChart, tone: '#0f172a' },
  { name: 'Sales Reports', description: 'Sales Summary, Sales by Item, Customers', icon: ArrowUp, tone: '#2563eb' },
  { name: 'Purchasing Reports', description: 'Purchase Summary, Vendors, Expenses', icon: ShoppingCart, tone: '#7c3aed' },
  { name: 'Banking Reports', description: 'Bank Reconciliation, Cash Position', icon: Clock3, tone: '#7c3aed' },
  { name: 'Payroll Reports', description: 'Payroll Summary, Deductions, Taxes', icon: Settings, tone: '#7c3aed' },
  { name: 'Tax & Compliance Reports', description: 'Tax Summary, Filings, Liabilities', icon: WalletCards, tone: '#7c3aed' },
  { name: 'Project Reports', description: 'Project Profitability, Costs, Budget', icon: Banknote, tone: '#f59e0b' },
  { name: 'Custom Reports', description: 'Tailored reports and analytics', icon: Clock3, tone: '#7c3aed' },
]

const generatedReports: GeneratedReport[] = [
  { name: 'Profit & Loss Statement - May 2024', category: 'Financial Statements', generatedBy: 'John User', generatedOn: 'May 31, 2024 09:15 AM', format: 'PDF' },
  { name: 'Balance Sheet - May 2024', category: 'Financial Statements', generatedBy: 'John User', generatedOn: 'May 31, 2024 09:15 AM', format: 'PDF' },
  { name: 'Cash Flow Statement - May 2024', category: 'Financial Statements', generatedBy: 'John User', generatedOn: 'May 31, 2024 09:14 AM', format: 'XLSX' },
  { name: 'Sales Summary - May 2024', category: 'Sales Reports', generatedBy: 'Emily Clark', generatedOn: 'May 31, 2024 08:45 AM', format: 'XLSX' },
  { name: 'AP Aging Summary - May 2024', category: 'Purchasing Reports', generatedBy: 'Emily Clark', generatedOn: 'May 31, 2024 08:30 AM', format: 'PDF' },
  { name: 'Payroll Summary - May 2024', category: 'Payroll Reports', generatedBy: 'John User', generatedOn: 'May 31, 2024 08:10 AM', format: 'PDF' },
]

const scheduledReports: ScheduledReport[] = [
  { title: 'Daily Cash Summary', cadence: 'Every day at 08:00 AM', active: true },
  { title: 'Weekly Financial Summary', cadence: 'Every Monday at 09:00 AM', active: true },
  { title: 'Monthly P&L Report', cadence: '1st of every month at 09:00 AM', active: true },
  { title: 'Quarterly Tax Summary', cadence: 'Every quarter on day 1 at 10:00 AM', active: true },
]

const quickActions = [
  { title: 'Create Custom Report', body: 'Build a report from scratch', icon: FileBarChart },
  { title: 'Report Designer', body: 'Design advanced custom reports', icon: Clock3 },
  { title: 'Import Report Definition', body: 'Import from template or file', icon: Download },
]

function money(value: number) {
  return `$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function FormatPill({ value }: { value: GeneratedReport['format'] }) {
  return <span className={value === 'PDF' ? 'reports-format pdf' : 'reports-format xlsx'}>{value}</span>
}

function StatusPill() {
  return <span className="reports-status">Active</span>
}

export default function ReportsPage() {
  const netProfit = financialSummary.revenue - financialSummary.expenses
  const metrics = [
    { title: 'Total Revenue', value: money(financialSummary.revenue), detail: '18.6% vs Apr 1 - Apr 30, 2024', icon: ArrowUp, tone: '#16a34a', up: true },
    { title: 'Total Expenses', value: money(financialSummary.expenses), detail: '9.4% vs Apr 1 - Apr 30, 2024', icon: ShoppingCart, tone: '#ef4444', up: false },
    { title: 'Net Profit', value: money(netProfit), detail: '28.7% vs Apr 1 - Apr 30, 2024', icon: Banknote, tone: '#2563eb', up: true },
    { title: 'Cash Balance', value: money(financialSummary.cashBalance), detail: '12.3% vs Apr 1 - Apr 30, 2024', icon: SlidersHorizontal, tone: '#7c3aed', up: true },
    { title: 'Current AR', value: money(financialSummary.currentAr), detail: '8.2% vs Apr 1 - Apr 30, 2024', icon: Clock3, tone: '#f59e0b', up: true },
    { title: 'Current AP', value: money(financialSummary.currentAp), detail: '4.5% vs Apr 1 - Apr 30, 2024', icon: FileText, tone: '#0f766e', up: false },
  ]
  const totalExpense = expenseCategories.reduce((sum, item) => sum + item.value, 0)
  const donut = expenseCategories.reduce<{ cursor: number; segments: string[] }>((acc, item) => {
    const start = acc.cursor
    const end = start + (item.value / totalExpense) * 100
    return {
      cursor: end,
      segments: [...acc.segments, `${item.color} ${start}% ${end}%`],
    }
  }, { cursor: 0, segments: [] }).segments.join(', ')

  return (
    <div className="reports-page" style={{ fontFamily: font }}>
      <style>{reportsCss}</style>
      <div className="reports-header">
        <div>
          <h1 className="reports-title">Reports</h1>
          <p className="reports-subtitle">Generate, view and export insightful reports to help you make better decisions.</p>
        </div>
        <div className="reports-actions">
          <button type="button"><CalendarDays size={15} /> May 1 - May 31, 2024</button>
          <button type="button"><Filter size={15} /> Filters</button>
          <button type="button">Export <ChevronDown size={14} /></button>
        </div>
      </div>

      <section className="reports-metrics">
        {metrics.map(metric => {
          const Icon = metric.icon
          return (
            <div key={metric.title} className="reports-card reports-metric-card">
              <span className="reports-metric-icon" style={{ background: `${metric.tone}12`, color: metric.tone }}><Icon size={22} /></span>
              <span>
                <span className="reports-label">{metric.title}</span>
                <strong className="reports-value">{metric.value}</strong>
                <small className="reports-detail" style={{ color: metric.up ? '#16a34a' : '#ef4444' }}>{metric.up ? 'Up ' : 'Down '}{metric.detail}</small>
              </span>
            </div>
          )
        })}
      </section>

      <nav className="reports-tabs" aria-label="Report groups">
        {['Standard Reports', 'Custom Reports', 'Saved Reports', 'Scheduled Reports'].map((tab, index) => <button key={tab} className={index === 0 ? 'is-active' : undefined}>{tab}</button>)}
      </nav>

      <section className="reports-layout">
        <aside className="reports-card reports-browser">
          <h2>Browse Reports</h2>
          <label><Search size={15} color="#64748b" /><input placeholder="Search reports..." /></label>
          <div className="reports-category-list">
            {reportCategories.map((category, index) => {
              const Icon = category.icon
              return (
                <button key={category.name} className={index === 0 ? 'is-active' : undefined}>
                  <span style={{ background: `${category.tone}12`, color: category.tone }}><Icon size={17} /></span>
                  <strong>{category.name}<small>{category.description}</small></strong>
                </button>
              )
            })}
          </div>
          <div className="reports-custom-card">
            <strong>Can&apos;t find the report you need?</strong>
            <p>Create a custom report tailored to your business.</p>
            <button type="button">Create Custom Report <Plus size={14} /></button>
          </div>
        </aside>

        <main className="reports-main">
          <section className="reports-top-panels">
            <div className="reports-card">
              <div className="reports-panel-header"><h2>Profit & Loss Summary</h2><button type="button">By Month <ChevronDown size={14} /></button></div>
              <div className="reports-chart">
                <div className="reports-chart-legend"><span className="revenue" /> Revenue <span className="expenses" /> Expenses <span className="profit" /> Net Profit</div>
                <div className="reports-bars">
                  {monthlyReports.map(month => (
                    <div key={month.label} className="reports-month">
                      <div>
                        <i className="profit-line" style={{ bottom: `${(month.revenue / 500000) * 100}%` }} />
                        <i className="expense-line" style={{ bottom: `${(month.expenses / 500000) * 100}%` }} />
                        <span style={{ height: `${(month.profit / 260000) * 100}%` }} />
                      </div>
                      <small>{month.label}</small>
                    </div>
                  ))}
                </div>
              </div>
              <Link href="/accounting/reports" className="reports-full-link">View Full Report</Link>
            </div>

            <div className="reports-card">
              <h2>Expense by Category</h2>
              <div className="reports-expense-breakdown">
                <div className="reports-donut" style={{ background: `conic-gradient(${donut})` }}>
                  <span><strong>{money(totalExpense)}</strong><small>Total Expenses</small></span>
                </div>
                <div className="reports-expense-list">
                  {expenseCategories.map(item => (
                    <p key={item.name}><span style={{ background: item.color }} /> {item.name} <strong>{((item.value / totalExpense) * 100).toFixed(1)}% ({money(item.value)})</strong></p>
                  ))}
                </div>
              </div>
              <Link href="/accounting/reports" className="reports-full-link">View Full Report</Link>
            </div>
          </section>

          <section className="reports-lower-panels">
            <div className="reports-card">
              <div className="reports-panel-header"><h2>Recent Reports</h2><Link href="/accounting/reports">View Full Report</Link></div>
              <div className="reports-table-wrap">
                <table className="reports-table">
                  <thead><tr>{['Report Name', 'Category', 'Generated By', 'Generated On', 'Format', 'Actions'].map(col => <th key={col}>{col}</th>)}</tr></thead>
                  <tbody>
                    {generatedReports.map(report => (
                      <tr key={report.name}>
                        <td data-label="Report Name">{report.name}</td>
                        <td data-label="Category">{report.category}</td>
                        <td data-label="Generated By">{report.generatedBy}</td>
                        <td data-label="Generated On">{report.generatedOn}</td>
                        <td data-label="Format"><FormatPill value={report.format} /></td>
                        <td data-label="Actions"><button type="button" className="reports-icon-button"><MoreHorizontal size={15} /></button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="reports-pagination"><strong>Showing 1 to {generatedReports.length} of 12 reports</strong><div>{['‹', '1', '2', '3', '...', '12', '›'].map((p, i) => <button key={`${p}-${i}`} className={p === '1' ? 'is-active' : undefined}>{p}</button>)}<button>6 / page <ChevronDown size={14} /></button></div></div>
            </div>

            <aside className="reports-side-stack">
              <div className="reports-card">
                <div className="reports-panel-header"><h2>Scheduled Reports</h2><Link href="/accounting/reports">View All</Link></div>
                <div className="reports-scheduled-list">
                  {scheduledReports.map(item => (
                    <div key={item.title}>
                      <CalendarDays size={18} />
                      <span><strong>{item.title}</strong><small>{item.cadence}</small></span>
                      <StatusPill />
                      <MoreHorizontal size={15} />
                    </div>
                  ))}
                </div>
              </div>

              <div className="reports-card">
                <h2>Quick Actions</h2>
                <div className="reports-quick-list">
                  {quickActions.map(action => {
                    const Icon = action.icon
                    return (
                      <button key={action.title}>
                        <span><Icon size={16} /></span>
                        <strong>{action.title}<small>{action.body}</small></strong>
                        <ChevronDown size={15} />
                      </button>
                    )
                  })}
                </div>
              </div>
            </aside>
          </section>
        </main>
      </section>
    </div>
  )
}

const reportsCss = `
.reports-page { padding: 26px 28px 40px; color: #0f172a; }
.reports-header { display: flex; justify-content: space-between; align-items: flex-start; gap: 18px; margin-bottom: 24px; }
.reports-title { margin: 0; font-size: 28px; line-height: 1.1; font-weight: 950; }
.reports-subtitle { margin: 8px 0 0; color: #334155; font-size: 13.5px; }
.reports-actions { display: flex; gap: 12px; flex-wrap: wrap; justify-content: flex-end; }
.reports-actions button, .reports-panel-header button, .reports-pagination button { min-height: 38px; border-radius: 8px; border: 1px solid #e8edf4; background: #fff; color: #0f172a; display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 0 12px; font-size: 12.5px; font-weight: 850; cursor: pointer; }
.reports-metrics { display: grid; grid-template-columns: repeat(6, minmax(155px, 1fr)); gap: 18px; margin-bottom: 18px; }
.reports-card { background: #fff; border: 1px solid #e8edf4; border-radius: 8px; padding: 18px; box-shadow: 0 1px 2px rgba(15, 23, 42, .03); }
.reports-metric-card { min-height: 96px; display: flex; align-items: center; }
.reports-metric-icon { width: 48px; height: 48px; border-radius: 9px; display: grid; place-items: center; margin-right: 14px; flex: 0 0 auto; }
.reports-label { display: block; color: #475569; font-size: 12px; font-weight: 850; }
.reports-value { display: block; color: #0f172a; font-size: 21px; margin-top: 8px; white-space: nowrap; }
.reports-detail { display: block; font-size: 11px; font-weight: 900; margin-top: 8px; }
.reports-tabs { display: flex; gap: 32px; border-bottom: 1px solid #e8edf4; padding-left: 14px; overflow-x: auto; }
.reports-tabs button { border: 0; border-bottom: 2px solid transparent; background: transparent; color: #0f172a; min-height: 48px; padding: 0; font-size: 12.5px; font-weight: 900; cursor: pointer; white-space: nowrap; }
.reports-tabs .is-active { color: #16a34a; border-bottom-color: #16a34a; }
.reports-layout { display: grid; grid-template-columns: 330px minmax(0, 1fr); gap: 16px; margin-top: 16px; }
.reports-browser { display: flex; flex-direction: column; gap: 14px; }
.reports-card h2, .reports-panel-header h2 { margin: 0; font-size: 16px; font-weight: 950; }
.reports-browser label { min-height: 38px; border: 1px solid #e8edf4; border-radius: 8px; display: flex; align-items: center; gap: 10px; padding: 0 12px; }
.reports-browser input { flex: 1; min-width: 0; border: 0; outline: 0; background: transparent; font-size: 12.5px; }
.reports-category-list { display: grid; gap: 8px; }
.reports-category-list button { border: 0; border-radius: 8px; background: #fff; display: grid; grid-template-columns: 36px minmax(0, 1fr); gap: 12px; align-items: center; min-height: 62px; padding: 10px; color: #0f172a; text-align: left; cursor: pointer; }
.reports-category-list button.is-active { background: #ecfdf3; }
.reports-category-list button span { width: 34px; height: 34px; border-radius: 8px; display: grid; place-items: center; }
.reports-category-list small { display: block; color: #64748b; margin-top: 3px; font-weight: 500; }
.reports-custom-card { margin-top: auto; background: #f8fafc; border: 1px solid #eef2f7; border-radius: 8px; padding: 16px; }
.reports-custom-card p { color: #64748b; font-size: 12.5px; }
.reports-custom-card button { min-height: 36px; border: 1px solid #e8edf4; background: #fff; border-radius: 7px; padding: 0 12px; font-weight: 900; display: inline-flex; align-items: center; gap: 10px; }
.reports-main { display: grid; gap: 16px; }
.reports-top-panels { display: grid; grid-template-columns: minmax(0, 1.1fr) minmax(360px, .9fr); gap: 16px; }
.reports-lower-panels { display: grid; grid-template-columns: minmax(0, 1fr) 360px; gap: 16px; }
.reports-side-stack { display: grid; gap: 16px; }
.reports-panel-header { display: flex; justify-content: space-between; align-items: center; gap: 12px; margin-bottom: 16px; }
.reports-panel-header a, .reports-full-link { color: #2563eb; font-size: 12px; font-weight: 900; text-decoration: none; }
.reports-full-link { display: block; text-align: right; margin-top: 10px; }
.reports-chart { min-height: 240px; display: grid; grid-template-rows: auto 1fr; gap: 12px; }
.reports-chart-legend { display: flex; justify-content: center; gap: 24px; font-size: 12px; font-weight: 850; }
.reports-chart-legend span { width: 18px; height: 7px; border-radius: 999px; display: inline-block; margin-right: -16px; }
.reports-chart-legend .revenue { background: #16a34a; }
.reports-chart-legend .expenses { background: #ef4444; }
.reports-chart-legend .profit { background: #2563eb; }
.reports-bars { min-height: 196px; display: grid; grid-template-columns: repeat(6, 1fr); gap: 18px; align-items: end; border-left: 1px solid #eef2f7; border-bottom: 1px solid #eef2f7; padding: 18px 8px 0; }
.reports-month { height: 100%; display: grid; grid-template-rows: 1fr 24px; align-items: end; text-align: center; }
.reports-month div { position: relative; height: 100%; display: flex; align-items: end; justify-content: center; }
.reports-month span { width: 22px; border-radius: 3px 3px 0 0; background: #2563eb; }
.reports-month i { position: absolute; width: 8px; height: 8px; border-radius: 999px; }
.reports-month .profit-line { background: #16a34a; }
.reports-month .expense-line { background: #ef4444; transform: translateX(12px); }
.reports-month small { color: #334155; font-size: 11px; }
.reports-expense-breakdown { display: grid; grid-template-columns: 210px minmax(0, 1fr); gap: 26px; align-items: center; min-height: 240px; }
.reports-donut { width: 180px; height: 180px; border-radius: 50%; display: grid; place-items: center; }
.reports-donut span { width: 112px; height: 112px; border-radius: 50%; background: #fff; display: grid; place-items: center; text-align: center; }
.reports-donut strong { font-size: 18px; }
.reports-donut small { color: #64748b; font-size: 12px; font-weight: 850; }
.reports-expense-list { display: grid; gap: 16px; }
.reports-expense-list p { margin: 0; display: grid; grid-template-columns: 12px minmax(0, 1fr); gap: 10px; font-size: 13px; }
.reports-expense-list span { width: 12px; height: 12px; border-radius: 4px; margin-top: 2px; }
.reports-expense-list strong { display: block; color: #334155; margin-top: 3px; }
.reports-table-wrap { overflow-x: auto; }
.reports-table { width: 100%; min-width: 760px; border-collapse: collapse; }
.reports-table th { text-align: left; padding: 12px 10px; color: #64748b; font-size: 11px; font-weight: 900; }
.reports-table td { padding: 12px 10px; border-top: 1px solid #eef2f7; color: #0f172a; font-size: 12.5px; }
.reports-format, .reports-status { display: inline-flex; min-height: 24px; border-radius: 6px; align-items: center; padding: 0 9px; font-size: 11.5px; font-weight: 900; }
.reports-format.pdf { background: #fef2f2; color: #dc2626; }
.reports-format.xlsx { background: #dcfce7; color: #15803d; }
.reports-status { background: #dcfce7; color: #15803d; }
.reports-icon-button { width: 32px; height: 32px; border: 1px solid #e8edf4; border-radius: 7px; background: #fff; display: grid; place-items: center; }
.reports-pagination { display: flex; justify-content: space-between; align-items: center; gap: 16px; padding-top: 16px; }
.reports-pagination strong { font-size: 12.5px; }
.reports-pagination div { display: flex; gap: 8px; flex-wrap: wrap; justify-content: flex-end; }
.reports-pagination .is-active { background: #16a34a; color: #fff; border-color: #16a34a; }
.reports-scheduled-list, .reports-quick-list { display: grid; gap: 14px; }
.reports-scheduled-list div, .reports-quick-list button { display: grid; grid-template-columns: 34px minmax(0, 1fr) auto 18px; gap: 12px; align-items: center; border: 0; background: #fff; text-align: left; color: #0f172a; }
.reports-scheduled-list div { border-bottom: 1px solid #eef2f7; padding-bottom: 13px; }
.reports-scheduled-list svg, .reports-quick-list span { color: #2563eb; }
.reports-scheduled-list small, .reports-quick-list small { display: block; color: #64748b; margin-top: 4px; font-weight: 500; }
.reports-quick-list span { width: 32px; height: 32px; border-radius: 8px; background: #eff6ff; display: grid; place-items: center; }
@media (max-width: 1280px) {
  .reports-page { padding: 22px; }
  .reports-header { flex-direction: column; }
  .reports-actions { width: 100%; justify-content: flex-start; }
  .reports-metrics { grid-template-columns: repeat(3, minmax(180px, 1fr)); }
  .reports-layout, .reports-top-panels, .reports-lower-panels { grid-template-columns: 1fr; }
  .reports-browser { order: 0; }
  .reports-side-stack { grid-template-columns: 1fr 1fr; }
}
@media (max-width: 900px) {
  .reports-metrics, .reports-side-stack { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .reports-expense-breakdown { grid-template-columns: 1fr; justify-items: center; }
  .reports-pagination { flex-direction: column; align-items: flex-start; }
}
@media (max-width: 640px) {
  .reports-page { padding: 16px; }
  .reports-title { font-size: 24px; }
  .reports-actions, .reports-metrics, .reports-side-stack { display: grid; grid-template-columns: 1fr; }
  .reports-value { font-size: 20px; }
  .reports-tabs { margin-left: -16px; margin-right: -16px; padding-left: 16px; padding-right: 16px; }
  .reports-card { padding: 14px; }
  .reports-bars { overflow-x: auto; grid-template-columns: repeat(6, 44px); }
  .reports-table-wrap { overflow: visible; }
  .reports-table, .reports-table thead, .reports-table tbody, .reports-table tr, .reports-table td { display: block; width: 100%; min-width: 0; }
  .reports-table thead { display: none; }
  .reports-table tr { border: 1px solid #eef2f7; border-radius: 8px; margin-bottom: 12px; background: #fff; overflow: hidden; }
  .reports-table td { border-top: 0; display: grid; grid-template-columns: 112px minmax(0, 1fr); gap: 10px; padding: 10px 12px; }
  .reports-table td::before { content: attr(data-label); color: #64748b; font-size: 11px; font-weight: 900; text-transform: uppercase; }
  .reports-scheduled-list div, .reports-quick-list button { grid-template-columns: 32px minmax(0, 1fr); }
  .reports-scheduled-list .reports-status, .reports-scheduled-list svg:last-child, .reports-quick-list svg:last-child { grid-column: 2; justify-self: start; }
}
`
