'use client'

import Link from 'next/link'
import {
  ArrowDownCircle,
  ArrowUpCircle,
  CalendarDays,
  ChevronDown,
  Download,
  Filter,
  PieChart,
  Plus,
  Search,
  WalletCards,
} from 'lucide-react'

const font = 'var(--font-body)'

type DepartmentBudget = {
  department: string
  budget: number
  actual: number
}

type CategoryBudget = {
  category: string
  department: string
  budget: number
  actual: number
}

type RecentBudget = {
  name: string
  period: string
  budget: number
  status: 'Active' | 'Draft'
  updated: string
}

const departments: DepartmentBudget[] = [
  { department: 'Sales & Marketing', budget: 450000, actual: 315400 },
  { department: 'Operations', budget: 680000, actual: 430250 },
  { department: 'Finance', budget: 220000, actual: 189700 },
  { department: 'Human Resources', budget: 180000, actual: 126800 },
  { department: 'IT Department', budget: 320000, actual: 198600 },
  { department: 'Administration', budget: 300000, actual: 224000.25 },
]

const categories: CategoryBudget[] = [
  { category: 'Salaries & Wages', department: 'Human Resources', budget: 450000, actual: 302250 },
  { category: 'Office Rent', department: 'Administration', budget: 120000, actual: 60000 },
  { category: 'Marketing Expenses', department: 'Sales & Marketing', budget: 200000, actual: 142600 },
  { category: 'Software & Subscriptions', department: 'IT Department', budget: 95000, actual: 70500 },
  { category: 'Utilities', department: 'Administration', budget: 40000, actual: 28400.25 },
  { category: 'Travel & Entertainment', department: 'Sales & Marketing', budget: 35000, actual: 41250 },
  { category: 'Professional Services', department: 'Operations', budget: 150000, actual: 135800 },
  { category: 'Equipment & Supplies', department: 'Operations', budget: 80000, actual: 95600 },
]

const recentBudgets: RecentBudget[] = [
  { name: 'FY 2024 Operating Budget', period: 'Jan 1 - Dec 31, 2024', budget: 2450000, status: 'Active', updated: 'May 31, 2024' },
  { name: 'Q2 2024 Marketing Budget', period: 'Apr 1 - Jun 30, 2024', budget: 200000, status: 'Active', updated: 'May 15, 2024' },
  { name: 'IT Department Budget', period: 'Jan 1 - Dec 31, 2024', budget: 320000, status: 'Active', updated: 'Apr 28, 2024' },
  { name: 'HR Annual Budget', period: 'Jan 1 - Dec 31, 2024', budget: 180000, status: 'Draft', updated: 'Apr 10, 2024' },
]

const monthlyActuals = [178000, 245000, 198000, 182000, 268000, 306000, 196000, 220000, 274000, 292000, 270000, 318000]
const monthlyBudgets = [292000, 214000, 272000, 345000, 296000, 238000, 298000, 343000, 306000, 340000, 302000, 365000]
const variancePercents = [82, 108, 56, 12, 48, 61, 103, 75, 68, 78, 70, 85]

function money(value: number) {
  return `$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function variance(record: { budget: number; actual: number }) {
  return record.budget - record.actual
}

function variancePercent(record: { budget: number; actual: number }) {
  return record.budget ? (variance(record) / record.budget) * 100 : 0
}

function StatusPill({ favorable, status }: { favorable?: boolean; status?: RecentBudget['status'] }) {
  if (status) return <span className={status === 'Active' ? 'budget-pill is-good' : 'budget-pill is-draft'}>{status}</span>
  return <span className={favorable ? 'budget-pill is-good' : 'budget-pill is-bad'}>{favorable ? 'Favorable' : 'Unfavorable'}</span>
}

export default function BudgetingPage() {
  const totalBudget = departments.reduce((sum, item) => sum + item.budget, 0)
  const totalActual = departments.reduce((sum, item) => sum + item.actual, 0)
  const totalVariance = totalBudget - totalActual
  const favorableVariance = categories.filter(item => variance(item) >= 0).reduce((sum, item) => sum + variance(item), 0)
  const unfavorableVariance = Math.abs(categories.filter(item => variance(item) < 0).reduce((sum, item) => sum + variance(item), 0))
  const utilization = totalActual / totalBudget
  const metrics = [
    { title: 'Total Budget', value: money(totalBudget), detail: 'FY 2024', icon: WalletCards, tone: '#16a34a' },
    { title: 'Total Actual', value: money(totalActual), detail: `${(utilization * 100).toFixed(1)}% of total budget`, icon: ArrowUpCircle, tone: '#2563eb' },
    { title: 'Total Variance', value: money(totalVariance), detail: `${((totalVariance / totalBudget) * 100).toFixed(1)}% of total budget`, icon: PieChart, tone: '#7c3aed' },
    { title: 'Favorable Variance', value: money(favorableVariance), detail: `${((favorableVariance / totalBudget) * 100).toFixed(1)}% of total budget`, icon: ArrowUpCircle, tone: '#f59e0b', good: true },
    { title: 'Unfavorable Variance', value: money(unfavorableVariance), detail: `${((unfavorableVariance / totalBudget) * 100).toFixed(1)}% of total budget`, icon: ArrowDownCircle, tone: '#ef4444', bad: true },
  ]

  return (
    <div className="budget-page" style={{ fontFamily: font }}>
      <style>{budgetCss}</style>
      <div className="budget-header">
        <div>
          <h1 className="budget-title">Budgeting</h1>
          <p className="budget-subtitle">Plan, monitor and analyze your budgets.</p>
        </div>
        <div className="budget-header-actions">
          <button type="button" className="budget-toolbar-button"><CalendarDays size={15} /> FY 2024 <ChevronDown size={14} /></button>
          <button type="button" className="budget-toolbar-button"><Filter size={15} /> Filters</button>
          <button type="button" className="budget-primary-button"><Plus size={15} /> New Budget <ChevronDown size={13} /></button>
        </div>
      </div>

      <section className="budget-metrics">
        {metrics.map(metric => {
          const Icon = metric.icon
          return (
            <div key={metric.title} className="budget-card budget-metric-card">
              <span className="budget-metric-icon" style={{ background: `${metric.tone}12`, color: metric.tone }}><Icon size={23} /></span>
              <span>
                <span className="budget-card-label">{metric.title}</span>
                <strong className="budget-card-value">{metric.value}</strong>
                <small className="budget-card-detail" style={{ color: metric.good ? '#16a34a' : metric.bad ? '#ef4444' : '#334155' }}>{metric.detail}</small>
              </span>
            </div>
          )
        })}
      </section>

      <nav className="budget-tabs" aria-label="Budget sections">
        {['Budget Overview', 'Department Budget', 'Category Budget', 'Budget vs Actual', 'Forecast', 'Budget History'].map((tab, index) => <button key={tab} type="button" className={index === 0 ? 'is-active' : undefined}>{tab}</button>)}
      </nav>

      <section className="budget-grid">
        <div className="budget-card">
          <div className="budget-panel-header">
            <h2>Budget vs Actual</h2>
            <button type="button">This Year <ChevronDown size={14} /></button>
          </div>
          <div className="budget-chart">
            <div className="budget-chart-legend"><span className="is-budget" /> Budget <span className="is-actual" /> Actual <span className="is-line" /> Variance %</div>
            <div className="budget-bars">
              {monthlyBudgets.map((budget, index) => (
                <div key={index} className="budget-month">
                  <div className="budget-bar-pair">
                    <span className="budget-bar is-budget" style={{ height: `${(budget / 400000) * 100}%` }} />
                    <span className="budget-bar is-actual" style={{ height: `${(monthlyActuals[index] / 400000) * 100}%` }} />
                    <i style={{ bottom: `${Math.min(variancePercents[index], 110)}%` }} />
                  </div>
                  <small>{['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][index]}</small>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="budget-card">
          <div className="budget-panel-header">
            <h2>Budget Summary by Department</h2>
            <Link href="/accounting/reports">View All</Link>
          </div>
          <div className="budget-table-wrap">
            <table className="budget-table">
              <thead><tr>{['Department', 'Budget', 'Actual', 'Variance', 'Variance %', 'Status'].map(col => <th key={col}>{col}</th>)}</tr></thead>
              <tbody>
                {departments.map(item => (
                  <tr key={item.department}>
                    <td data-label="Department">{item.department}</td>
                    <td data-label="Budget">{money(item.budget)}</td>
                    <td data-label="Actual">{money(item.actual)}</td>
                    <td data-label="Variance">{money(variance(item))}</td>
                    <td data-label="Variance %">{variancePercent(item).toFixed(1)}%</td>
                    <td data-label="Status"><StatusPill favorable={variance(item) >= 0} /></td>
                  </tr>
                ))}
                <tr>
                  <td data-label="Department"><strong>Total</strong></td>
                  <td data-label="Budget"><strong>{money(totalBudget)}</strong></td>
                  <td data-label="Actual"><strong>{money(totalActual)}</strong></td>
                  <td data-label="Variance"><strong>{money(totalVariance)}</strong></td>
                  <td data-label="Variance %"><strong>{((totalVariance / totalBudget) * 100).toFixed(1)}%</strong></td>
                  <td data-label="Status"><StatusPill favorable={false} /></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="budget-grid budget-lower-grid">
        <div className="budget-card">
          <div className="budget-panel-header">
            <h2>Budget Details</h2>
          </div>
          <div className="budget-filterbar">
            <button type="button">All Departments <ChevronDown size={14} /></button>
            <button type="button">All Categories <ChevronDown size={14} /></button>
            <label><Search size={15} color="#64748b" /><input placeholder="Search categories..." /></label>
            <button type="button" className="budget-export">Export <Download size={14} /></button>
          </div>
          <div className="budget-table-wrap">
            <table className="budget-table budget-details-table">
              <thead><tr>{['Category', 'Department', 'Budget', 'Actual', 'Variance', 'Variance %', 'Status'].map(col => <th key={col}>{col}</th>)}</tr></thead>
              <tbody>
                {categories.map(item => {
                  const diff = variance(item)
                  return (
                    <tr key={item.category}>
                      <td data-label="Category">{item.category}</td>
                      <td data-label="Department">{item.department}</td>
                      <td data-label="Budget">{money(item.budget)}</td>
                      <td data-label="Actual">{money(item.actual)}</td>
                      <td data-label="Variance" className={diff < 0 ? 'is-negative' : undefined}>{diff < 0 ? `(${money(Math.abs(diff))})` : money(diff)}</td>
                      <td data-label="Variance %" className={diff < 0 ? 'is-negative' : undefined}>{variancePercent(item).toFixed(1)}%</td>
                      <td data-label="Status"><StatusPill favorable={diff >= 0} /></td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <div className="budget-pagination">
            <strong>Showing 1 to {categories.length} of 32 categories</strong>
            <div>{['‹', '1', '2', '3', '4', '...', '8', '›'].map((p, i) => <button key={`${p}-${i}`} className={p === '1' ? 'is-active' : undefined}>{p}</button>)}<button>10 / page <ChevronDown size={14} /></button></div>
          </div>
        </div>

        <div className="budget-side-stack">
          <div className="budget-card">
            <h2>Budget Utilization</h2>
            <div className="budget-utilization">
              <div className="budget-donut" style={{ background: `conic-gradient(#16a34a 0 ${(utilization * 100).toFixed(1)}%, #0f172a ${(utilization * 100).toFixed(1)}% 100%)` }}>
                <span><strong>{(utilization * 100).toFixed(1)}%</strong><small>Utilized</small></span>
              </div>
              <div className="budget-utilization-legend">
                <p><span style={{ background: '#16a34a' }} /> Actual ({(utilization * 100).toFixed(1)}%) <strong>{money(totalActual)}</strong></p>
                <p><span style={{ background: '#0f172a' }} /> Remaining ({((1 - utilization) * 100).toFixed(1)}%) <strong>{money(totalVariance)}</strong></p>
              </div>
            </div>
          </div>

          <div className="budget-card">
            <div className="budget-panel-header">
              <h2>Recent Budgets</h2>
              <Link href="/accounting/reports">View All</Link>
            </div>
            <div className="budget-table-wrap">
              <table className="budget-table">
                <thead><tr>{['Budget Name', 'Period', 'Total Budget', 'Status', 'Last Updated'].map(col => <th key={col}>{col}</th>)}</tr></thead>
                <tbody>
                  {recentBudgets.map(item => (
                    <tr key={item.name}>
                      <td data-label="Budget Name">{item.name}</td>
                      <td data-label="Period">{item.period}</td>
                      <td data-label="Total Budget">{money(item.budget)}</td>
                      <td data-label="Status"><StatusPill status={item.status} /></td>
                      <td data-label="Last Updated">{item.updated}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}

const budgetCss = `
.budget-page { padding: 26px 28px 40px; color: #0f172a; }
.budget-header { display: flex; justify-content: space-between; align-items: flex-start; gap: 18px; margin-bottom: 24px; }
.budget-title { margin: 0; font-size: 28px; line-height: 1.1; font-weight: 950; }
.budget-subtitle { margin: 8px 0 0; color: #334155; font-size: 13.5px; }
.budget-header-actions { display: flex; gap: 12px; flex-wrap: wrap; justify-content: flex-end; }
.budget-toolbar-button, .budget-primary-button, .budget-panel-header button, .budget-filterbar button, .budget-pagination button { min-height: 38px; border-radius: 8px; border: 1px solid #e8edf4; background: #fff; color: #0f172a; display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 0 12px; font-size: 12.5px; font-weight: 850; cursor: pointer; }
.budget-primary-button { border-color: #16a34a; background: #16a34a; color: #fff; font-weight: 950; }
.budget-metrics { display: grid; grid-template-columns: repeat(5, minmax(170px, 1fr)); gap: 18px; margin-bottom: 18px; }
.budget-card { background: #fff; border: 1px solid #e8edf4; border-radius: 8px; padding: 18px; box-shadow: 0 1px 2px rgba(15, 23, 42, .03); }
.budget-metric-card { min-height: 100px; display: flex; align-items: center; }
.budget-metric-icon { width: 54px; height: 54px; border-radius: 9px; display: grid; place-items: center; margin-right: 16px; flex: 0 0 auto; }
.budget-card-label { display: block; color: #475569; font-size: 12px; font-weight: 850; }
.budget-card-value { display: block; color: #0f172a; font-size: 23px; margin-top: 8px; white-space: nowrap; }
.budget-card-detail { display: block; font-size: 11.5px; font-weight: 900; margin-top: 8px; }
.budget-tabs { display: flex; gap: 32px; border-bottom: 1px solid #e8edf4; padding-left: 14px; overflow-x: auto; }
.budget-tabs button { border: 0; border-bottom: 2px solid transparent; background: transparent; color: #0f172a; min-height: 48px; padding: 0; font-size: 12.5px; font-weight: 900; cursor: pointer; white-space: nowrap; }
.budget-tabs .is-active { color: #16a34a; border-bottom-color: #16a34a; }
.budget-grid { display: grid; grid-template-columns: minmax(0, 1.25fr) minmax(420px, .75fr); gap: 16px; margin-top: 16px; }
.budget-lower-grid { grid-template-columns: minmax(0, 1.15fr) minmax(430px, .85fr); }
.budget-side-stack { display: grid; gap: 16px; }
.budget-panel-header { display: flex; justify-content: space-between; align-items: center; gap: 12px; margin-bottom: 16px; }
.budget-panel-header h2, .budget-card h2 { margin: 0; font-size: 16px; font-weight: 950; }
.budget-panel-header a { color: #2563eb; font-size: 12px; font-weight: 900; text-decoration: none; }
.budget-chart { min-height: 292px; display: grid; grid-template-rows: auto 1fr; gap: 12px; }
.budget-chart-legend { display: flex; justify-content: center; gap: 28px; font-size: 12px; font-weight: 850; }
.budget-chart-legend span { width: 22px; height: 8px; border-radius: 999px; display: inline-block; margin-right: -18px; }
.budget-chart-legend .is-budget { background: #16a34a; }
.budget-chart-legend .is-actual { background: #0f172a; }
.budget-chart-legend .is-line { background: #f59e0b; height: 3px; }
.budget-bars { min-height: 240px; display: grid; grid-template-columns: repeat(12, 1fr); gap: 10px; align-items: end; border-left: 1px solid #eef2f7; border-bottom: 1px solid #eef2f7; padding: 20px 8px 0; }
.budget-month { height: 100%; display: grid; grid-template-rows: 1fr 24px; align-items: end; text-align: center; }
.budget-bar-pair { position: relative; height: 100%; display: flex; align-items: end; justify-content: center; gap: 7px; }
.budget-bar { width: 13px; border-radius: 3px 3px 0 0; }
.budget-bar.is-budget { background: #16a34a; }
.budget-bar.is-actual { background: #0f172a; }
.budget-bar-pair i { position: absolute; width: 8px; height: 8px; border-radius: 999px; background: #f59e0b; }
.budget-month small { color: #334155; font-size: 11px; }
.budget-filterbar { display: grid; grid-template-columns: 170px 160px minmax(180px, 1fr) auto; gap: 12px; margin-bottom: 14px; }
.budget-filterbar label { min-height: 38px; border-radius: 8px; border: 1px solid #e8edf4; display: flex; align-items: center; gap: 10px; padding: 0 12px; }
.budget-filterbar input { flex: 1; min-width: 0; border: 0; outline: 0; background: transparent; font-size: 12.5px; }
.budget-export { justify-self: end; }
.budget-table-wrap { overflow-x: auto; }
.budget-table { width: 100%; min-width: 640px; border-collapse: collapse; }
.budget-details-table { min-width: 820px; }
.budget-table th { text-align: left; padding: 12px 10px; color: #64748b; font-size: 11px; font-weight: 900; }
.budget-table td { padding: 12px 10px; border-top: 1px solid #eef2f7; color: #0f172a; font-size: 12.5px; }
.is-negative { color: #ef4444 !important; font-weight: 900; }
.budget-pill { display: inline-flex; min-height: 24px; border-radius: 6px; align-items: center; padding: 0 9px; font-size: 11.5px; font-weight: 900; }
.budget-pill.is-good { background: #dcfce7; color: #15803d; }
.budget-pill.is-bad { background: #fee2e2; color: #dc2626; }
.budget-pill.is-draft { background: #fef3c7; color: #d97706; }
.budget-pagination { display: flex; justify-content: space-between; align-items: center; gap: 16px; padding-top: 16px; }
.budget-pagination strong { font-size: 12.5px; }
.budget-pagination div { display: flex; gap: 8px; flex-wrap: wrap; justify-content: flex-end; }
.budget-pagination .is-active { background: #16a34a; color: #fff; border-color: #16a34a; }
.budget-utilization { display: grid; grid-template-columns: 180px minmax(0, 1fr); gap: 28px; align-items: center; min-height: 172px; }
.budget-donut { width: 150px; height: 150px; border-radius: 50%; display: grid; place-items: center; }
.budget-donut span { width: 92px; height: 92px; border-radius: 50%; background: #fff; display: grid; place-items: center; text-align: center; }
.budget-donut strong { font-size: 22px; }
.budget-donut small { color: #64748b; font-size: 12px; font-weight: 850; }
.budget-utilization-legend { display: grid; gap: 18px; }
.budget-utilization-legend p { margin: 0; display: grid; grid-template-columns: 12px minmax(0, 1fr) auto; gap: 10px; align-items: center; font-size: 13px; }
.budget-utilization-legend span { width: 12px; height: 12px; border-radius: 4px; }
@media (max-width: 1280px) {
  .budget-page { padding: 22px; }
  .budget-header { flex-direction: column; }
  .budget-header-actions { width: 100%; justify-content: flex-start; }
  .budget-metrics { grid-template-columns: repeat(3, minmax(180px, 1fr)); }
  .budget-grid, .budget-lower-grid { grid-template-columns: 1fr; }
  .budget-side-stack { grid-template-columns: 1fr 1fr; }
}
@media (max-width: 900px) {
  .budget-metrics, .budget-side-stack, .budget-filterbar { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .budget-utilization { grid-template-columns: 1fr; justify-items: center; }
  .budget-pagination { flex-direction: column; align-items: flex-start; }
}
@media (max-width: 640px) {
  .budget-page { padding: 16px; }
  .budget-title { font-size: 24px; }
  .budget-header-actions, .budget-metrics, .budget-side-stack, .budget-filterbar { display: grid; grid-template-columns: 1fr; }
  .budget-card-value { font-size: 21px; }
  .budget-tabs { margin-left: -16px; margin-right: -16px; padding-left: 16px; padding-right: 16px; }
  .budget-card { padding: 14px; }
  .budget-bars { gap: 5px; overflow-x: auto; grid-template-columns: repeat(12, 36px); }
  .budget-table-wrap { overflow: visible; }
  .budget-table, .budget-table thead, .budget-table tbody, .budget-table tr, .budget-table td { display: block; width: 100%; min-width: 0; }
  .budget-table thead { display: none; }
  .budget-table tr { border: 1px solid #eef2f7; border-radius: 8px; margin-bottom: 12px; background: #fff; overflow: hidden; }
  .budget-table td { border-top: 0; display: grid; grid-template-columns: 112px minmax(0, 1fr); gap: 10px; padding: 10px 12px; font-size: 12.5px; }
  .budget-table td::before { content: attr(data-label); color: #64748b; font-size: 11px; font-weight: 900; text-transform: uppercase; }
}
`
