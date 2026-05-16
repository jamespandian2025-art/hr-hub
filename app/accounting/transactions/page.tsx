'use client'

import { useEffect, useState } from 'react'
import {
  ArrowDownCircle,
  ArrowUpCircle,
  Banknote,
  CalendarDays,
  ChevronDown,
  Download,
  Filter,
  Landmark,
  MoreHorizontal,
  Search,
  SlidersHorizontal,
} from 'lucide-react'
import { emptyAccountingData, formatDate, loadAccountingData, money, subscribeAccountingData } from '@/lib/accounting/data'

const font = 'var(--font-body)'

type TransactionType = 'Deposit' | 'Withdrawal' | 'Transfer'
type TransactionStatus = 'Reconciled' | 'Unreconciled'

function TransactionTypePill({ value }: { value: TransactionType }) {
  const styles: Record<TransactionType, { bg: string; color: string }> = {
    Deposit: { bg: '#dcfce7', color: '#15803d' },
    Withdrawal: { bg: '#fee2e2', color: '#dc2626' },
    Transfer: { bg: '#dbeafe', color: '#2563eb' },
  }
  return <span className="tx-pill" style={styles[value]}>{value}</span>
}

function StatusPill({ value }: { value: TransactionStatus }) {
  return <span className={value === 'Reconciled' ? 'tx-status is-good' : 'tx-status is-warn'}>{value}</span>
}

function CategoryPill({ value }: { value: string }) {
  const colors: Record<string, { bg: string; color: string }> = {
    Receivables: { bg: '#dbeafe', color: '#2563eb' },
    'Office Supplies': { bg: '#f3e8ff', color: '#7c3aed' },
    Payroll: { bg: '#ccfbf1', color: '#0f766e' },
    Utilities: { bg: '#dbeafe', color: '#2563eb' },
    Transfer: { bg: '#f1f5f9', color: '#475569' },
    'Internet & Phone': { bg: '#f3e8ff', color: '#7c3aed' },
    'Other Income': { bg: '#dcfce7', color: '#15803d' },
    'Credit Card': { bg: '#fef3c7', color: '#d97706' },
  }
  return <span className="tx-pill" style={colors[value] || colors.Transfer}>{value}</span>
}

export default function TransactionsPage() {
  const [data, setData] = useState(emptyAccountingData)

  useEffect(() => {
    const load = () => setData(loadAccountingData())
    load()
    return subscribeAccountingData(load)
  }, [])

  const transactions = data.transactions.map(transaction => ({
    date: formatDate(transaction.date),
    description: transaction.description,
    detail: transaction.secondary,
    account: transaction.account,
    accountDetail: transaction.reference || '-',
    type: transaction.type === 'Income' ? 'Deposit' as const : transaction.type === 'Expense' ? 'Withdrawal' as const : 'Transfer' as const,
    reference: transaction.reference || transaction.id,
    inflow: transaction.inflow,
    outflow: transaction.outflow,
    balance: transaction.balance,
    status: ['Reconciled', 'Paid', 'Completed'].includes(transaction.status) ? 'Reconciled' as const : 'Unreconciled' as const,
    category: transaction.category,
  }))
  const totalTransactions = transactions.length
  const accountCount = new Set(transactions.map(transaction => transaction.account).filter(Boolean)).size
  const totalInflow = transactions.reduce((sum, transaction) => sum + transaction.inflow, 0)
  const totalOutflow = transactions.reduce((sum, transaction) => sum + transaction.outflow, 0)
  const netCashFlow = totalInflow - totalOutflow
  const unreconciled = transactions.filter(transaction => transaction.status === 'Unreconciled').length
  const unreconciledValue = transactions
    .filter(transaction => transaction.status === 'Unreconciled')
    .reduce((sum, transaction) => sum + transaction.inflow + transaction.outflow, 0)
  const metrics = [
    { title: 'Total Transactions', value: String(totalTransactions), detail: `${accountCount} account${accountCount === 1 ? '' : 's'}`, icon: Landmark, tone: '#2563eb', up: totalTransactions > 0 },
    { title: 'Total Inflow', value: money(totalInflow, data.currency), detail: `${transactions.filter(row => row.inflow > 0).length} income records`, icon: ArrowDownCircle, tone: '#16a34a', up: totalInflow > 0 },
    { title: 'Total Outflow', value: money(totalOutflow, data.currency), detail: `${transactions.filter(row => row.outflow > 0).length} expense records`, icon: ArrowUpCircle, tone: '#ef4444', up: false },
    { title: 'Net Cash Flow', value: money(netCashFlow, data.currency), detail: 'Inflow minus outflow', icon: SlidersHorizontal, tone: '#7c3aed', up: netCashFlow >= 0 },
    { title: 'Unreconciled', value: String(unreconciled), detail: money(unreconciledValue, data.currency), icon: Banknote, tone: '#f59e0b' },
  ]

  return (
    <div className="tx-page" style={{ fontFamily: font }}>
      <style>{transactionsCss}</style>
      <div className="tx-header">
        <div>
          <h1 className="tx-title">Transactions</h1>
          <p className="tx-subtitle">View and manage all bank transactions across your accounts.</p>
        </div>
        <div className="tx-header-actions">
          <label className="tx-search">
            <Search size={16} color="#64748b" />
            <input placeholder="Search transactions, accounts, reference..." />
          </label>
          <button type="button" className="tx-toolbar-button"><Filter size={15} /> Filters</button>
          <button type="button" className="tx-toolbar-button"><CalendarDays size={15} /> Current records</button>
          <button type="button" className="tx-toolbar-button">Export <Download size={14} /></button>
        </div>
      </div>

      <section className="tx-metrics">
        {metrics.map(metric => {
          const Icon = metric.icon
          return (
            <div key={metric.title} className="tx-card tx-metric-card">
              <span className="tx-metric-icon" style={{ background: `${metric.tone}12`, color: metric.tone }}><Icon size={23} /></span>
              <span>
                <span className="tx-card-label">{metric.title}</span>
                <strong className="tx-card-value">{metric.value}</strong>
                <small className="tx-card-detail" style={{ color: metric.up === false ? '#ef4444' : metric.up ? '#16a34a' : '#d97706' }}>{metric.up === false ? 'Down ' : metric.up ? 'Up ' : ''}{metric.detail}</small>
              </span>
            </div>
          )
        })}
      </section>

      <section className="tx-account-select">
        <strong>Accounts</strong>
        <button type="button">All Accounts ({accountCount}) <ChevronDown size={15} /></button>
      </section>

      <nav className="tx-tabs" aria-label="Transaction filters">
        {['All Transactions', 'Unreconciled', 'Deposits', 'Withdrawals', 'Transfers'].map((tab, index) => (
          <button key={tab} type="button" className={index === 0 ? 'is-active' : undefined}>{tab}</button>
        ))}
      </nav>

      <section className="tx-table-card">
        <div className="tx-filterbar">
          <label className="tx-filter-search"><Search size={15} color="#64748b" /><input placeholder="Search transactions..." /></label>
          <button type="button">All Types <ChevronDown size={14} /></button>
          <button type="button">All Status <ChevronDown size={14} /></button>
          <button type="button">All Accounts <ChevronDown size={14} /></button>
          <button type="button"><CalendarDays size={15} /> Current records</button>
          <button type="button"><SlidersHorizontal size={15} /> More Filters</button>
        </div>

        <div className="tx-table-wrap">
          <table className="tx-table">
            <thead>
              <tr>
                <th><input type="checkbox" aria-label="Select all transactions" /></th>
                {['Date', 'Description', 'Account', 'Type', 'Reference', 'Inflow', 'Outflow', 'Balance', 'Status', 'Category', 'Actions'].map(column => <th key={column}>{column}</th>)}
              </tr>
            </thead>
            <tbody>
              {transactions.map(transaction => (
                <tr key={transaction.reference}>
                  <td data-label="Select"><input type="checkbox" aria-label={`Select ${transaction.description}`} /></td>
                  <td data-label="Date">{transaction.date}</td>
                  <td data-label="Description"><strong>{transaction.description}</strong><small>{transaction.detail}</small></td>
                  <td data-label="Account"><strong>{transaction.account}</strong><small>{transaction.accountDetail}</small></td>
                  <td data-label="Type"><TransactionTypePill value={transaction.type} /></td>
                  <td data-label="Reference">{transaction.reference}</td>
                  <td data-label="Inflow" className="tx-money-in">{transaction.inflow ? money(transaction.inflow, data.currency) : '-'}</td>
                  <td data-label="Outflow" className="tx-money-out">{transaction.outflow ? money(transaction.outflow, data.currency) : '-'}</td>
                  <td data-label="Balance">{money(transaction.balance, data.currency)}</td>
                  <td data-label="Status"><StatusPill value={transaction.status} /></td>
                  <td data-label="Category"><CategoryPill value={transaction.category} /></td>
                  <td data-label="Actions"><button type="button" aria-label={`Actions for ${transaction.description}`} className="tx-icon-button"><MoreHorizontal size={15} /></button></td>
                </tr>
              ))}
              {!transactions.length && (
                <tr>
                  <td colSpan={12} style={{ padding: 28, textAlign: 'center', color: '#64748b', fontWeight: 800 }}>
                    No transactions yet. Paid invoices, paid bills, expenses, payroll, and ledger imports will appear here.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="tx-pagination">
          <strong>Showing {transactions.length ? 1 : 0} to {transactions.length} of {totalTransactions} transactions</strong>
          <div>
            {['‹', '1', '2', '3', '4', '5', '...', '25', '›'].map((page, index) => (
              <button key={`${page}-${index}`} type="button" className={page === '1' ? 'is-active' : undefined}>{page}</button>
            ))}
            <button type="button" className="tx-page-size">10 / page <ChevronDown size={14} /></button>
          </div>
        </div>
      </section>
    </div>
  )
}

const transactionsCss = `
.tx-page { padding: 26px 28px 40px; color: #0f172a; }
.tx-header { display: flex; justify-content: space-between; align-items: flex-start; gap: 18px; margin-bottom: 24px; }
.tx-title { margin: 0; font-size: 28px; line-height: 1.1; font-weight: 950; }
.tx-subtitle { margin: 8px 0 0; color: #334155; font-size: 13.5px; }
.tx-header-actions { display: flex; align-items: center; justify-content: flex-end; gap: 12px; flex-wrap: wrap; }
.tx-search, .tx-filter-search { min-height: 40px; border-radius: 8px; background: #fff; display: flex; align-items: center; gap: 10px; padding: 0 13px; border: 1px solid #e8edf4; }
.tx-search { width: min(360px, 38vw); }
.tx-search input, .tx-filter-search input { flex: 1; min-width: 0; border: 0; outline: 0; background: transparent; font-size: 12.5px; color: #0f172a; }
.tx-toolbar-button, .tx-filterbar button { min-height: 40px; border-radius: 8px; border: 1px solid #e8edf4; background: #fff; color: #0f172a; display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 0 12px; font-size: 12.5px; font-weight: 850; cursor: pointer; white-space: nowrap; }
.tx-metrics { display: grid; grid-template-columns: repeat(5, minmax(170px, 1fr)); gap: 18px; margin-bottom: 24px; }
.tx-card, .tx-account-select, .tx-table-card { background: #fff; border: 1px solid #e8edf4; border-radius: 8px; box-shadow: 0 1px 2px rgba(15, 23, 42, .03); }
.tx-card { min-height: 100px; padding: 18px; }
.tx-metric-card { display: flex; align-items: center; }
.tx-metric-icon { width: 54px; height: 54px; border-radius: 9px; display: grid; place-items: center; margin-right: 16px; flex: 0 0 auto; }
.tx-card-label { display: block; color: #475569; font-size: 12px; font-weight: 850; }
.tx-card-value { display: block; color: #0f172a; font-size: 23px; margin-top: 8px; white-space: nowrap; }
.tx-card-detail { display: block; font-size: 11.5px; font-weight: 900; margin-top: 8px; }
.tx-account-select { width: min(360px, 100%); min-height: 58px; display: grid; grid-template-columns: 82px minmax(0, 1fr); align-items: center; gap: 12px; padding: 10px 14px; margin-bottom: 24px; }
.tx-account-select strong { font-size: 13px; }
.tx-account-select button { min-height: 40px; border: 1px solid #e8edf4; border-radius: 8px; background: #fff; display: flex; align-items: center; justify-content: space-between; padding: 0 14px; color: #0f172a; font-size: 13px; font-weight: 850; }
.tx-tabs { display: flex; gap: 30px; border-bottom: 1px solid #e8edf4; padding-left: 14px; overflow-x: auto; }
.tx-tabs button { border: 0; border-bottom: 2px solid transparent; background: transparent; color: #0f172a; min-height: 48px; padding: 0; font-size: 12.5px; font-weight: 900; cursor: pointer; white-space: nowrap; }
.tx-tabs button.is-active { color: #16a34a; border-bottom-color: #16a34a; }
.tx-table-card { border-top-left-radius: 0; border-top-right-radius: 0; padding: 18px; }
.tx-filterbar { display: grid; grid-template-columns: minmax(220px, 1fr) repeat(5, minmax(140px, auto)); gap: 14px; align-items: center; margin-bottom: 18px; }
.tx-table-wrap { overflow-x: auto; border: 1px solid #eef2f7; border-radius: 8px; }
.tx-table { width: 100%; min-width: 1220px; border-collapse: collapse; }
.tx-table th { text-align: left; padding: 12px 14px; color: #64748b; font-size: 11px; text-transform: uppercase; font-weight: 900; background: #f8fafc; }
.tx-table td { padding: 14px; font-size: 13px; color: #334155; vertical-align: middle; border-top: 1px solid #eef2f7; }
.tx-table td strong { display: block; color: #0f172a; }
.tx-table td small { display: block; color: #64748b; margin-top: 3px; }
.tx-money-in { color: #16a34a !important; font-weight: 950; }
.tx-money-out { color: #ef4444 !important; font-weight: 950; }
.tx-pill, .tx-status { display: inline-flex; min-height: 24px; align-items: center; border-radius: 6px; padding: 0 9px; font-size: 11.5px; font-weight: 900; white-space: nowrap; }
.tx-status.is-good { background: #dcfce7; color: #15803d; }
.tx-status.is-warn { background: #fff7ed; color: #d97706; }
.tx-icon-button { width: 32px; height: 32px; border-radius: 7px; border: 1px solid #e8edf4; background: #fff; color: #0f172a; display: grid; place-items: center; cursor: pointer; }
.tx-pagination { display: flex; justify-content: space-between; align-items: center; gap: 16px; padding-top: 16px; }
.tx-pagination strong { font-size: 12.5px; }
.tx-pagination > div { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; justify-content: flex-end; }
.tx-pagination button { min-width: 34px; height: 32px; border-radius: 7px; border: 1px solid #e8edf4; background: #fff; color: #0f172a; font-weight: 900; cursor: pointer; }
.tx-pagination button.is-active { background: #16a34a; border-color: #16a34a; color: #fff; }
.tx-page-size { display: flex; align-items: center; gap: 8px; padding: 0 10px; width: auto; }
@media (max-width: 1280px) {
  .tx-page { padding: 22px; }
  .tx-header { flex-direction: column; }
  .tx-header-actions, .tx-search { width: 100%; }
  .tx-metrics { grid-template-columns: repeat(3, minmax(180px, 1fr)); }
  .tx-filterbar { grid-template-columns: repeat(3, minmax(0, 1fr)); }
}
@media (max-width: 920px) {
  .tx-metrics, .tx-filterbar { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .tx-pagination { align-items: flex-start; flex-direction: column; }
}
@media (max-width: 640px) {
  .tx-page { padding: 16px; }
  .tx-title { font-size: 24px; }
  .tx-header-actions, .tx-metrics, .tx-filterbar { display: grid; grid-template-columns: 1fr; }
  .tx-card-value { font-size: 21px; }
  .tx-account-select { width: 100%; grid-template-columns: 1fr; }
  .tx-tabs { margin-left: -16px; margin-right: -16px; padding-left: 16px; padding-right: 16px; }
  .tx-table-card { padding: 12px; }
  .tx-table-wrap { border: 0; overflow: visible; }
  .tx-table, .tx-table thead, .tx-table tbody, .tx-table tr, .tx-table td { display: block; width: 100%; min-width: 0; }
  .tx-table thead { display: none; }
  .tx-table tr { border: 1px solid #eef2f7; border-radius: 8px; margin-bottom: 12px; background: #fff; overflow: hidden; }
  .tx-table td { border-top: 0; display: grid; grid-template-columns: 112px minmax(0, 1fr); gap: 10px; padding: 10px 12px; font-size: 12.5px; }
  .tx-table td::before { content: attr(data-label); color: #64748b; font-size: 11px; font-weight: 900; text-transform: uppercase; }
  .tx-pagination > div { justify-content: flex-start; }
}
`
