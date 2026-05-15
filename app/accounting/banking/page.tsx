'use client'

import Link from 'next/link'
import {
  ArrowDownLeft,
  ArrowUpRight,
  ChevronDown,
  Clock3,
  CreditCard,
  Download,
  Filter,
  Landmark,
  MoreHorizontal,
  Plus,
  ReceiptText,
  RefreshCw,
  Search,
  Settings,
  SlidersHorizontal,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

const font = 'var(--font-body)'

type BankAccountRecord = {
  name: string
  type: string
  number: string
  bank: string
  currency: 'USD' | 'EUR'
  balance: number
  status: 'Active' | 'Inactive'
  color: string
}

type BankTransactionRecord = {
  date: string
  description: string
  account: string
  type: 'Payment Received' | 'Expense' | 'Transfer' | 'Bill Payment'
  reference: string
  inflow: number
  outflow: number
  balance: number
  status: 'Matched' | 'Pending'
}

const bankAccounts: BankAccountRecord[] = [
  { name: 'Operating Account', type: 'Checking', number: '4242', bank: 'Chase Bank', currency: 'USD', balance: 542350.2, status: 'Active', color: '#2563eb' },
  { name: 'Payroll Account', type: 'Checking', number: '5678', bank: 'Wells Fargo', currency: 'USD', balance: 128750.4, status: 'Active', color: '#dc2626' },
  { name: 'Savings Account', type: 'Savings', number: '9012', bank: 'TD Bank', currency: 'USD', balance: 250000, status: 'Active', color: '#16a34a' },
  { name: 'PayPal Business', type: 'PayPal', number: '3456', bank: 'PayPal', currency: 'USD', balance: 45230.75, status: 'Active', color: '#0ea5e9' },
  { name: 'USD Account', type: 'Foreign Currency', number: '7865', bank: 'Citibank', currency: 'USD', balance: 192456.54, status: 'Active', color: '#0f172a' },
  { name: 'EUR Account', type: 'Foreign Currency', number: '1357', bank: 'HSBC', currency: 'EUR', balance: 74562.35, status: 'Active', color: '#7c3aed' },
]

const bankTransactions: BankTransactionRecord[] = [
  { date: 'May 31, 2024', description: 'Payment from Acme Corp.', account: 'Operating Account', type: 'Payment Received', reference: 'INV-2024-0128', inflow: 7500, outflow: 0, balance: 542350.2, status: 'Matched' },
  { date: 'May 31, 2024', description: 'Office Supplies', account: 'Operating Account', type: 'Expense', reference: 'EXP-2024-0567', inflow: 0, outflow: 120.5, balance: 534850.2, status: 'Matched' },
  { date: 'May 30, 2024', description: 'Transfer to Payroll', account: 'Payroll Account', type: 'Transfer', reference: 'TRF-2024-0045', inflow: 0, outflow: 25000, balance: 128750.4, status: 'Matched' },
  { date: 'May 29, 2024', description: 'Utility Payment', account: 'Operating Account', type: 'Bill Payment', reference: 'BILL-2024-0092', inflow: 0, outflow: 880.75, balance: 559850.7, status: 'Matched' },
  { date: 'May 29, 2024', description: 'Payment from Globex Inc.', account: 'Operating Account', type: 'Payment Received', reference: 'INV-2024-0127', inflow: 12000, outflow: 0, balance: 560831.45, status: 'Matched' },
]

const cashFlow = [
  { day: 'May 1', inflow: 22000, outflow: 4800 },
  { day: 'May 5', inflow: 36500, outflow: 13200 },
  { day: 'May 8', inflow: 36750, outflow: 16600 },
  { day: 'May 12', inflow: 36800, outflow: 13250 },
  { day: 'May 15', inflow: 44200, outflow: 20500 },
  { day: 'May 18', inflow: 48250, outflow: 16650 },
  { day: 'May 22', inflow: 44500, outflow: 21000 },
  { day: 'May 25', inflow: 51800, outflow: 28200 },
  { day: 'May 29', inflow: 48200, outflow: 24500 },
]

const feeds = ['Chase Bank', 'Wells Fargo', 'TD Bank', 'PayPal', 'HSBC']

function money(value: number, currency = 'USD') {
  const prefix = currency === 'EUR' ? 'EUR ' : '$'
  return `${prefix}${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function areaPath(points: number[][]) {
  if (!points.length) return ''
  const line = points.map(([x, y]) => `${x},${y}`).join(' L ')
  const last = points[points.length - 1]
  const first = points[0]
  return `M ${line} L ${last[0]},230 L ${first[0]},230 Z`
}

function StatusPill({ value }: { value: BankAccountRecord['status'] | BankTransactionRecord['status'] }) {
  return <span className="banking-status-pill">{value}</span>
}

export default function BankingPage() {
  const totalBalance = bankAccounts.reduce((sum, account) => sum + account.balance, 0)
  const visibleInflow = bankTransactions.reduce((sum, transaction) => sum + transaction.inflow, 0)
  const visibleOutflow = bankTransactions.reduce((sum, transaction) => sum + transaction.outflow, 0)
  const monthlyInflow = visibleInflow + 226280.5
  const monthlyOutflow = visibleOutflow + 161428.25
  const toReconcile = bankTransactions.length * 25
  const overduePayments = feeds.length + 3
  const metrics = [
    { title: 'Total Balance', value: money(totalBalance), detail: '12.5% vs last month', icon: Landmark, tone: '#16a34a', up: true },
    { title: 'Inflow (This Month)', value: money(monthlyInflow), detail: '18.3% vs last month', icon: ArrowDownLeft, tone: '#2563eb', up: true },
    { title: 'Outflow (This Month)', value: money(monthlyOutflow), detail: '9.7% vs last month', icon: ArrowUpRight, tone: '#f97316', up: true },
    { title: 'To Reconcile', value: String(toReconcile), detail: money(34250.75), icon: ReceiptText, tone: '#7c3aed' },
    { title: 'Overdue Payments', value: String(overduePayments), detail: money(16450), icon: Clock3, tone: '#ef4444' },
  ]
  const quickActions: Array<{ label: string; icon: LucideIcon }> = [
    { label: 'Make a Payment', icon: CreditCard },
    { label: 'Plaid Setup', icon: Settings },
    { label: 'Transfer Records', icon: SlidersHorizontal },
    { label: 'Upload Bank Statement', icon: Download },
  ]

  return (
    <div className="banking-page" style={{ fontFamily: font }}>
      <style>{bankingCss}</style>
      <div className="banking-header">
        <div>
          <h1 className="banking-title">Banking</h1>
          <p className="banking-subtitle">Manage bank accounts, view transactions, and reconcile bank activity.</p>
        </div>
        <div className="banking-header-actions">
          <label className="banking-search">
            <Search size={16} color="#64748b" />
            <input placeholder="Search accounts, transactions..." />
          </label>
          <button type="button" className="banking-toolbar-button"><Filter size={15} /> Filters</button>
          <button type="button" className="banking-primary-button"><Plus size={15} /> Add Account <ChevronDown size={13} /></button>
        </div>
      </div>

      <section className="banking-metrics">
        {metrics.map(metric => {
          const Icon = metric.icon
          return (
            <div key={metric.title} className="banking-card banking-metric-card">
              <span className="banking-metric-icon" style={{ background: `${metric.tone}12`, color: metric.tone }}><Icon size={23} /></span>
              <span>
                <span className="banking-card-label">{metric.title}</span>
                <strong className="banking-card-value">{metric.value}</strong>
                <small className="banking-card-detail" style={{ color: metric.up ? '#16a34a' : '#334155' }}>{metric.up ? 'Up ' : ''}{metric.detail}</small>
              </span>
            </div>
          )
        })}
      </section>

      <nav className="banking-tabs" aria-label="Banking sections">
        {['Accounts', 'Transactions', 'Reconciliation', 'Payments'].map((tab, index) => <button key={tab} type="button" className={index === 0 ? 'is-active' : undefined}>{tab}</button>)}
      </nav>

      <section className="banking-grid">
        <div className="banking-card banking-accounts-panel">
          <div className="banking-panel-header">
            <h2>Bank Accounts</h2>
            <strong>Total Balance: <span>{money(totalBalance)}</span></strong>
          </div>
          <div className="banking-table-wrap">
            <table className="banking-table banking-accounts-table">
              <thead>
                <tr>{['Account', 'Account Number', 'Bank', 'Currency', 'Balance', 'Status', 'Actions'].map(column => <th key={column}>{column}</th>)}</tr>
              </thead>
              <tbody>
                {bankAccounts.map(account => (
                  <tr key={account.number}>
                    <td data-label="Account">
                      <span className="bank-logo" style={{ background: account.color }}>{account.bank.slice(0, 2).toUpperCase()}</span>
                      <span><strong>{account.name}</strong><small>{account.type}</small></span>
                    </td>
                    <td data-label="Account Number">.... {account.number}</td>
                    <td data-label="Bank">{account.bank}</td>
                    <td data-label="Currency">{account.currency}</td>
                    <td data-label="Balance">{money(account.balance, account.currency)}</td>
                    <td data-label="Status"><StatusPill value={account.status} /></td>
                    <td data-label="Actions"><button type="button" aria-label={`Actions for ${account.name}`} className="banking-icon-button"><MoreHorizontal size={15} /></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Link href="/accounting/banking" className="banking-add-link">+ Add Bank Account</Link>
        </div>

        <div className="banking-side-stack">
          <div className="banking-card">
            <div className="banking-panel-header">
              <h2>Cash Flow (This Month)</h2>
              <Link href="/accounting/reports">View Report</Link>
            </div>
            <div className="banking-legend"><Legend color="#16a34a" label="Inflow" /><Legend color="#ef4444" label="Outflow" /></div>
            <div className="banking-chart">
              {[0, 1, 2].map(row => <span key={row} style={{ top: `${row * 33}%` }} />)}
              <svg viewBox="0 0 420 230" preserveAspectRatio="none">
                <path d={areaPath(cashFlow.map((point, index) => [index * 52, 220 - point.inflow / 260]))} fill="rgba(22,163,74,.11)" stroke="none" />
                <polyline points={cashFlow.map((point, index) => `${index * 52},${220 - point.inflow / 260}`).join(' ')} fill="none" stroke="#16a34a" strokeWidth="3" />
                <path d={areaPath(cashFlow.map((point, index) => [index * 52, 220 - point.outflow / 180]))} fill="rgba(239,68,68,.10)" stroke="none" />
                <polyline points={cashFlow.map((point, index) => `${index * 52},${220 - point.outflow / 180}`).join(' ')} fill="none" stroke="#ef4444" strokeWidth="3" />
              </svg>
            </div>
          </div>

          <div className="banking-card">
            <h2 className="banking-card-heading">Quick Actions</h2>
            <div className="banking-actions">
              {quickActions.map(({ label, icon: Icon }) => (
                <button key={label} type="button">
                  <span><Icon size={15} /></span>
                  {label}
                  <ChevronDown size={15} />
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="banking-grid banking-lower-grid">
        <div className="banking-card">
          <div className="banking-panel-header">
            <h2>Recent Transactions</h2>
            <Link href="/accounting/transactions">View All Transactions</Link>
          </div>
          <div className="banking-filter-row">
            {['All Accounts', 'All Types', 'All Status', 'May 1 - May 31, 2024'].map(label => <button key={label} type="button">{label} <ChevronDown size={14} /></button>)}
          </div>
          <div className="banking-table-wrap">
            <table className="banking-table banking-transactions-table">
              <thead>
                <tr>{['Date', 'Description', 'Account', 'Type', 'Reference', 'Inflow', 'Outflow', 'Balance', 'Status'].map(column => <th key={column}>{column}</th>)}</tr>
              </thead>
              <tbody>
                {bankTransactions.map(transaction => (
                  <tr key={transaction.reference}>
                    <td data-label="Date">{transaction.date}</td>
                    <td data-label="Description"><strong>{transaction.description}</strong></td>
                    <td data-label="Account">{transaction.account}</td>
                    <td data-label="Type">{transaction.type}</td>
                    <td data-label="Reference">{transaction.reference}</td>
                    <td data-label="Inflow">{transaction.inflow ? money(transaction.inflow) : '-'}</td>
                    <td data-label="Outflow">{transaction.outflow ? money(transaction.outflow) : '-'}</td>
                    <td data-label="Balance">{money(transaction.balance)}</td>
                    <td data-label="Status"><StatusPill value={transaction.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <strong className="banking-showing">Showing 1 to {bankTransactions.length} of {toReconcile} transactions</strong>
        </div>

        <div className="banking-card">
          <div className="banking-panel-header">
            <h2>Bank Feeds Status</h2>
            <small>Last updated: 2 mins ago <RefreshCw size={13} /></small>
          </div>
          <div className="banking-feeds">
            {feeds.map((feed, index) => (
              <div key={feed}>
                <span className="feed-dot" style={{ background: bankAccounts[index]?.color || '#16a34a' }} />
                <strong>{feed}</strong>
                <em>Connected</em>
              </div>
            ))}
          </div>
          <Link href="/accounting/banking" className="banking-add-link">View All Feeds</Link>
        </div>
      </section>
    </div>
  )
}

function Legend({ color, label }: { color: string; label: string }) {
  return <span className="banking-legend-item"><span style={{ background: color }} />{label}</span>
}

const bankingCss = `
.banking-page { padding: 26px 28px 40px; color: #0f172a; }
.banking-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 18px; margin-bottom: 24px; }
.banking-title { margin: 0; font-size: 28px; line-height: 1.1; font-weight: 950; }
.banking-subtitle { margin: 8px 0 0; color: #334155; font-size: 13.5px; }
.banking-header-actions { display: flex; align-items: center; justify-content: flex-end; gap: 12px; flex-wrap: wrap; }
.banking-search { width: min(340px, 40vw); min-height: 40px; border-radius: 8px; background: #fff; display: flex; align-items: center; gap: 10px; padding: 0 13px; border: 1px solid #e8edf4; }
.banking-search input { flex: 1; min-width: 0; border: 0; outline: 0; background: transparent; font-size: 12.5px; color: #0f172a; }
.banking-toolbar-button, .banking-primary-button, .banking-filter-row button { min-height: 38px; border-radius: 8px; border: 1px solid #e8edf4; background: #fff; color: #0f172a; display: flex; align-items: center; gap: 8px; padding: 0 12px; font-size: 12.5px; font-weight: 850; cursor: pointer; }
.banking-primary-button { border-color: #16a34a; background: #16a34a; color: #fff; font-weight: 950; }
.banking-metrics { display: grid; grid-template-columns: repeat(5, minmax(170px, 1fr)); gap: 18px; margin-bottom: 18px; }
.banking-card { background: #fff; border: 1px solid #e8edf4; border-radius: 8px; padding: 18px; box-shadow: 0 1px 2px rgba(15, 23, 42, .03); }
.banking-metric-card { min-height: 100px; display: flex; align-items: center; }
.banking-metric-icon { width: 54px; height: 54px; border-radius: 9px; display: grid; place-items: center; margin-right: 16px; flex: 0 0 auto; }
.banking-card-label { display: block; color: #475569; font-size: 12px; font-weight: 850; }
.banking-card-value { display: block; color: #0f172a; font-size: 23px; margin-top: 8px; white-space: nowrap; }
.banking-card-detail { display: block; color: #334155; font-size: 11.5px; font-weight: 900; margin-top: 8px; }
.banking-tabs { display: flex; align-items: center; gap: 32px; border-bottom: 1px solid #e8edf4; padding-left: 14px; overflow-x: auto; }
.banking-tabs button { border: 0; border-bottom: 2px solid transparent; background: transparent; color: #0f172a; min-height: 48px; padding: 0; font-size: 12.5px; font-weight: 900; cursor: pointer; white-space: nowrap; }
.banking-tabs button.is-active { color: #16a34a; border-bottom-color: #16a34a; }
.banking-grid { display: grid; grid-template-columns: minmax(0, 1fr) 420px; gap: 16px; margin-top: 0; }
.banking-lower-grid { margin-top: 16px; }
.banking-side-stack { display: grid; gap: 16px; }
.banking-panel-header { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 16px; }
.banking-panel-header h2, .banking-card-heading { margin: 0; color: #0f172a; font-size: 16px; font-weight: 950; }
.banking-panel-header a, .banking-add-link { color: #2563eb; font-size: 12px; font-weight: 900; text-decoration: none; }
.banking-panel-header strong { font-size: 13px; }
.banking-panel-header strong span { color: #16a34a; }
.banking-panel-header small { display: flex; align-items: center; gap: 8px; color: #64748b; font-size: 12px; }
.banking-table-wrap { overflow-x: auto; }
.banking-table { width: 100%; min-width: 780px; border-collapse: collapse; }
.banking-transactions-table { min-width: 920px; }
.banking-table th { text-align: left; padding: 12px 14px; color: #64748b; font-size: 11px; font-weight: 900; }
.banking-table td { padding: 13px 14px; border-top: 1px solid #eef2f7; color: #0f172a; font-size: 13px; vertical-align: middle; }
.banking-table td:first-child { display: flex; align-items: center; gap: 12px; }
.banking-table td strong { display: block; color: #0f172a; }
.banking-table td small { display: block; color: #64748b; margin-top: 3px; }
.bank-logo { width: 34px; height: 34px; border-radius: 8px; color: #fff; display: grid; place-items: center; font-size: 10px; font-weight: 950; flex: 0 0 auto; }
.banking-status-pill { display: inline-flex; min-height: 24px; align-items: center; border-radius: 7px; background: #dcfce7; color: #15803d; padding: 0 9px; font-size: 11.5px; font-weight: 900; }
.banking-icon-button { width: 32px; height: 32px; border: 1px solid #e8edf4; border-radius: 7px; background: #fff; color: #0f172a; display: grid; place-items: center; cursor: pointer; }
.banking-add-link { display: block; text-align: center; margin-top: 14px; color: #16a34a; }
.banking-legend { display: flex; justify-content: center; gap: 18px; color: #334155; font-size: 12px; font-weight: 850; }
.banking-legend-item { display: inline-flex; align-items: center; gap: 8px; }
.banking-legend-item span { width: 14px; height: 6px; border-radius: 999px; }
.banking-chart { height: 236px; position: relative; margin-top: 12px; border-left: 1px solid #eef2f7; border-bottom: 1px solid #eef2f7; overflow: hidden; }
.banking-chart > span { position: absolute; left: 0; right: 0; border-top: 1px solid #eef2f7; }
.banking-chart svg { position: absolute; inset: 0; width: 100%; height: 100%; }
.banking-actions { display: grid; grid-template-columns: 1fr 1fr; gap: 12px 18px; margin-top: 18px; }
.banking-actions button { border: 0; background: #fff; color: #0f172a; display: grid; grid-template-columns: 28px minmax(0, 1fr) 16px; align-items: center; gap: 10px; min-height: 38px; font-size: 12.5px; font-weight: 900; cursor: pointer; text-align: left; }
.banking-actions button span { width: 28px; height: 28px; border-radius: 7px; background: #eff6ff; color: #2563eb; display: grid; place-items: center; }
.banking-filter-row { display: flex; flex-wrap: wrap; gap: 12px; margin-bottom: 14px; }
.banking-showing { display: block; color: #0f172a; font-size: 12.5px; margin-top: 16px; }
.banking-feeds { display: grid; gap: 18px; margin-top: 22px; }
.banking-feeds div { display: grid; grid-template-columns: 14px minmax(0, 1fr) auto; align-items: center; gap: 12px; font-size: 13px; }
.feed-dot { width: 9px; height: 9px; border-radius: 999px; }
.banking-feeds em { color: #16a34a; font-style: normal; font-size: 12px; font-weight: 900; }
@media (max-width: 1280px) {
  .banking-page { padding: 22px; }
  .banking-header { flex-direction: column; }
  .banking-header-actions, .banking-search { width: 100%; }
  .banking-metrics { grid-template-columns: repeat(3, minmax(180px, 1fr)); }
  .banking-grid { grid-template-columns: 1fr; }
  .banking-side-stack { grid-template-columns: 1fr 1fr; }
}
@media (max-width: 820px) {
  .banking-metrics, .banking-side-stack { grid-template-columns: 1fr 1fr; }
  .banking-panel-header { align-items: flex-start; flex-direction: column; }
  .banking-actions { grid-template-columns: 1fr; }
}
@media (max-width: 640px) {
  .banking-page { padding: 16px; }
  .banking-title { font-size: 24px; }
  .banking-header-actions, .banking-metrics, .banking-side-stack { display: grid; grid-template-columns: 1fr; }
  .banking-card-value { font-size: 21px; }
  .banking-tabs { margin-left: -16px; margin-right: -16px; padding-left: 16px; padding-right: 16px; }
  .banking-table-wrap { overflow: visible; }
  .banking-table, .banking-table thead, .banking-table tbody, .banking-table tr, .banking-table td { display: block; width: 100%; min-width: 0; }
  .banking-table thead { display: none; }
  .banking-table tr { border: 1px solid #eef2f7; border-radius: 8px; margin-bottom: 12px; background: #fff; overflow: hidden; }
  .banking-table td, .banking-table td:first-child { border-top: 0; display: grid; grid-template-columns: 120px minmax(0, 1fr); gap: 10px; padding: 10px 12px; font-size: 12.5px; align-items: center; }
  .banking-table td::before { content: attr(data-label); color: #64748b; font-size: 11px; font-weight: 900; text-transform: uppercase; }
  .bank-logo { display: none; }
  .banking-filter-row { display: grid; grid-template-columns: 1fr; }
}
`
