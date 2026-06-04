'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import type { CSSProperties, ReactNode } from 'react'
import {
  ArrowDownLeft,
  ArrowUpRight,
  Banknote,
  Building2,
  Calculator,
  FileBarChart,
  FileText,
  Landmark,
  MoreHorizontal,
  PieChart,
  ReceiptText,
  WalletCards,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { AnalyticsToggleButton, CollapsibleAnalytics, useAnalyticsDisclosure } from '@/components/AnalyticsDisclosure'
import StateFeedback from '@/components/StateFeedback'
import { loadAccountingData as loadSharedAccountingData, subscribeAccountingData } from '@/lib/accounting/data'

const font = 'var(--font-body)'

type StoredRow = Record<string, unknown>

type MoneyMetric = {
  title: string
  value: string
  delta: string
  up?: boolean
  icon: LucideIcon
  tone: string
}

type TransactionRow = {
  id: string
  date: string
  description: string
  secondary: string
  category: string
  type: 'Income' | 'Expense' | 'Transfer'
  amount: number
  status: string
}

type MiniRow = {
  name: string
  reference: string
  amount: number
}

type BankAccountRow = {
  id: string
  name: string
  accountMask: string
  balance: number
  color: string
}

type ExpenseSegment = {
  label: string
  amount: number
  color: string
}

type CashPoint = {
  label: string
  inflow: number
  outflow: number
  net: number
}

type AccountingData = {
  companyName: string
  invoices: StoredRow[]
  bills: StoredRow[]
  expenses: StoredRow[]
  bankAccounts: StoredRow[]
  transactions: StoredRow[]
  payrollRecords: StoredRow[]
}

const quickActions: Array<{ title: string; body: string; icon: LucideIcon; href: string }> = [
  { title: 'Create Invoice', body: 'Bill your clients', icon: FileText, href: '/accounting/invoices' },
  { title: 'Record Expense', body: 'Add new expense', icon: WalletCards, href: '/accounting/expenses' },
  { title: 'Create Bill', body: 'Add vendor bill', icon: ReceiptText, href: '/accounting/bills' },
  { title: 'Bank Reconciliation', body: 'Reconcile accounts', icon: Landmark, href: '/accounting/banking' },
  { title: 'Chart of Accounts', body: 'Manage accounts', icon: PieChart, href: '/accounting/accounting' },
  { title: 'Financial Reports', body: 'View reports', icon: FileText, href: '/accounting/reports' },
  { title: 'Withholding Tax', body: 'Calculate payroll tax', icon: Calculator, href: '/accounting/withholding-tax-calculator' },
]

const heroActions: Array<{ label: string; href: string; icon: LucideIcon; primary?: boolean }> = [
  { label: 'New Invoice', href: '/accounting/invoices?new=1', icon: FileText, primary: true },
  { label: 'Record Bill', href: '/accounting/bills?new=1', icon: ReceiptText },
  { label: 'Reports', href: '/accounting/reports', icon: FileBarChart },
]

const segmentColors = ['#2563eb', '#4f46e5', '#14b8a6', '#f59e0b', '#fb923c', '#9ca3af']
const bankColors = ['#2563eb', '#dc2626', '#0ea5e9', '#16a34a', '#7c3aed', '#0f172a']
const emptyAccountingData: AccountingData = {
  companyName: 'Current company',
  invoices: [],
  bills: [],
  expenses: [],
  bankAccounts: [],
  transactions: [],
  payrollRecords: [],
}

export default function AccountingOverviewPage() {
  const [data, setData] = useState<AccountingData>(emptyAccountingData)
  const analytics = useAnalyticsDisclosure('wiseflow:analytics:accounting-overview')

  useEffect(() => {
    const load = () => setData(loadAccountingData())
    load()
    return subscribeAccountingData(load)
  }, [])

  const view = useMemo(() => buildAccountingView(data), [data])

  return (
    <div className="accounting-overview-page" style={{ fontFamily: font }}>
      <style>{accountingOverviewCss}</style>

      <section className="accounting-dashboard-hero">
        <div className="accounting-dashboard-inner">
          <div className="accounting-hero-header">
            <div className="accounting-hero-copy">
              <div className="accounting-breadcrumb"><Link href="/dashboard">WiseFlow</Link><span>/</span><strong>Accounting</strong></div>
              <h1>Accounting</h1>
              <p>Monitor cash, receivables, payables, payroll costs, and financial controls for {data.companyName}.</p>
            </div>
            <div className="accounting-hero-actions" aria-label="Accounting actions">
              <AnalyticsToggleButton open={analytics.open} onToggle={analytics.toggle} panelId={analytics.panelId} className="accounting-hero-action" />
              {heroActions.map(action => {
                const Icon = action.icon
                return (
                  <Link key={action.label} href={action.href} className={action.primary ? 'accounting-hero-action is-primary' : 'accounting-hero-action'}>
                    <Icon size={15} />
                    {action.label}
                  </Link>
                )
              })}
            </div>
          </div>

          <CollapsibleAnalytics open={analytics.open} id={analytics.panelId}>
            <section className="accounting-metrics" aria-label="Accounting overview metrics">
              {view.metrics.map(metric => {
                const Icon = metric.icon
                return (
                  <div key={metric.title} className="accounting-metric-card">
                    <span className="accounting-metric-icon" style={{ background: `${metric.tone}12`, color: metric.tone }}><Icon size={21} /></span>
                    <div className="accounting-metric-copy">
                      <div className="accounting-eyebrow">{metric.title}</div>
                      <div className="accounting-metric-value">{metric.value}</div>
                      <div className="accounting-metric-delta" style={{ color: metric.up === false ? '#ef4444' : '#16a34a' }}>
                        {metric.up === false ? <ArrowDownLeft size={13} /> : metric.up ? <ArrowUpRight size={13} /> : null}
                        {metric.delta}
                      </div>
                    </div>
                  </div>
                )
              })}
            </section>
          </CollapsibleAnalytics>
        </div>
      </section>

      <section className="accounting-dashboard-content">
        <section className="accounting-main-grid">
          <Panel title="Cash Flow Overview" action={data.companyName}>
            <div className="cash-flow-panel">
              <div className="accounting-legend-row">
                <Legend color="#16a34a" label="Cash Inflow" />
                <Legend color="#ef4444" label="Cash Outflow" />
                <Legend color="#2563eb" label="Net Cash Flow" />
              </div>
              {view.cashPoints.length ? (
                <LineChart points={view.cashPoints} />
              ) : (
                <EmptyState message="No accounting transactions yet. Income, expenses, invoices, bills, and payroll entries will build the cash flow chart." />
              )}
            </div>
          </Panel>

          <Panel title="Expense Breakdown" action={data.companyName}>
            {view.expenseSegments.length ? (
              <div className="expense-breakdown">
                <DonutChart segments={view.expenseSegments} total={view.totalExpenses} />
                <div className="expense-segments">
                  {view.expenseSegments.map(segment => (
                    <Legend key={segment.label} color={segment.color} label={segment.label} value={`${percentage(segment.amount, view.totalExpenses)}%`} />
                  ))}
                </div>
              </div>
            ) : (
              <EmptyState message="No expense records yet. Vendor bills, expenses, and payroll costs will appear here." />
            )}
          </Panel>

          <div className="accounting-side-stack">
            <Panel title="Bank Accounts" link="/accounting/banking">
              {view.bankAccounts.length ? (
                <div className="bank-list">
                  {view.bankAccounts.map(bank => (
                    <div key={bank.id} className="bank-row">
                      <span className="bank-icon" style={{ background: bank.color }}><Building2 size={18} /></span>
                      <span className="bank-copy">
                        <strong>{bank.name}</strong>
                        <small>{bank.accountMask}</small>
                      </span>
                      <strong>{formatCurrency(bank.balance)}</strong>
                    </div>
                  ))}
                  <Link href="/accounting/banking" className="accounting-add-link">Add Bank Account</Link>
                </div>
              ) : (
                <EmptyState message="No bank accounts connected yet." />
              )}
            </Panel>

            <Panel title="Overdue Invoices" link="/accounting/invoices">
              <MiniRows rows={view.overdueInvoices} emptyMessage="No overdue invoices." />
            </Panel>

            <Panel title="Bills to Pay" link="/accounting/bills">
              <MiniRows rows={view.billsToPay} emptyMessage="No vendor bills waiting for payment." />
            </Panel>
          </div>
        </section>

        <section className="accounting-lower-grid">
          <Panel title="Recent Transactions" link="/accounting/transactions">
            {view.recentTransactions.length ? (
              <div className="accounting-table-wrap">
                <table className="accounting-table">
                  <thead>
                    <tr>
                      {['Date', 'Description', 'Category', 'Type', 'Amount', 'Status', ''].map(header => <th key={header}>{header}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {view.recentTransactions.map(row => (
                      <tr key={row.id}>
                        <td data-label="Date">{formatDate(row.date)}</td>
                        <td data-label="Description"><strong>{row.description}</strong><small>{row.secondary}</small></td>
                        <td data-label="Category"><span className="accounting-pill">{row.category}</span></td>
                        <td data-label="Type" className={`type-${row.type.toLowerCase()}`}>{row.type}</td>
                        <td data-label="Amount" className={row.type === 'Expense' ? 'amount-negative' : ''}>{formatCurrency(row.amount)}</td>
                        <td data-label="Status"><span className={`accounting-pill status-${statusSlug(row.status)}`}>{row.status}</span></td>
                        <td data-label="Actions"><Link href="/accounting/transactions" aria-label={`Open transactions for ${row.description}`} className="accounting-more-button"><MoreHorizontal size={16} /></Link></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <EmptyState message="No accounting activity yet. Created invoices, bills, payments, expenses, and payroll releases will appear here." />
            )}
          </Panel>

          <Panel title="Quick Actions">
            <div className="quick-actions-grid">
              {quickActions.map(({ title, body, icon: Icon, href }) => (
                <Link key={title} href={href} className="quick-action">
                  <span><Icon size={17} /></span>
                  <span><strong>{title}</strong><small>{body}</small></span>
                </Link>
              ))}
            </div>
          </Panel>
        </section>
      </section>
    </div>
  )
}

function loadAccountingData(): AccountingData {
  const shared = loadSharedAccountingData()
  return {
    companyName: shared.companyName,
    invoices: shared.invoices as unknown as StoredRow[],
    bills: shared.bills as unknown as StoredRow[],
    expenses: shared.expenses,
    bankAccounts: shared.bankAccounts as unknown as StoredRow[],
    transactions: shared.transactions as unknown as StoredRow[],
    payrollRecords: shared.payrollRecords,
  }
}

function buildAccountingView(data: AccountingData) {
  const invoiceTransactions = data.invoices.map(invoiceToTransaction)
  const billTransactions = data.bills.map(billToTransaction)
  const expenseTransactions = data.expenses.map(expenseToTransaction)
  const payrollTransactions = data.payrollRecords.map(payrollToTransaction).filter(Boolean) as TransactionRow[]
  const storedTransactions = data.transactions.map(storedToTransaction)
  const transactions = [...storedTransactions, ...invoiceTransactions, ...billTransactions, ...expenseTransactions, ...payrollTransactions]
    .filter(row => row.amount > 0)
    .sort((a, b) => dateValue(b.date) - dateValue(a.date))

  const totalIncome = transactions.filter(row => row.type === 'Income').reduce((sum, row) => sum + row.amount, 0)
  const totalExpenses = transactions.filter(row => row.type === 'Expense').reduce((sum, row) => sum + row.amount, 0)
  const bankAccounts = data.bankAccounts.map(toBankAccount)
  const totalCash = bankAccounts.reduce((sum, account) => sum + account.balance, 0)
  const outstandingReceivables = data.invoices.reduce((sum, invoice) => sum + receivableBalance(invoice), 0)
  const outstandingPayables = data.bills.reduce((sum, bill) => sum + payableBalance(bill), 0)
  const overdueInvoices = data.invoices
    .filter(invoice => receivableBalance(invoice) > 0 && isOverdue(readString(invoice, ['dueDate', 'due_date'])))
    .map(invoice => ({ name: readString(invoice, ['recipient', 'customer', 'client', 'company'], 'Unknown client'), reference: readString(invoice, ['invoiceNo', 'invoiceNumber', 'number'], 'Invoice'), amount: receivableBalance(invoice) }))
    .slice(0, 4)
  const billsToPay = data.bills
    .filter(bill => payableBalance(bill) > 0)
    .map(bill => ({ name: readString(bill, ['vendor', 'name', 'supplier'], 'Unknown vendor'), reference: readString(bill, ['billNo', 'billNumber', 'reference', 'name'], 'Bill'), amount: payableBalance(bill) }))
    .slice(0, 4)

  const metrics: MoneyMetric[] = [
    { title: 'Total Cash Balance', value: formatCurrency(totalCash), delta: bankAccounts.length ? `${bankAccounts.length} account${bankAccounts.length === 1 ? '' : 's'} connected` : 'No bank accounts yet', icon: WalletCards, tone: '#16a34a' },
    { title: 'Total Income', value: formatCurrency(totalIncome), delta: `${transactions.filter(row => row.type === 'Income').length} income record${transactions.filter(row => row.type === 'Income').length === 1 ? '' : 's'}`, up: totalIncome > 0, icon: ArrowUpRight, tone: '#2563eb' },
    { title: 'Total Expenses', value: formatCurrency(totalExpenses), delta: `${transactions.filter(row => row.type === 'Expense').length} expense record${transactions.filter(row => row.type === 'Expense').length === 1 ? '' : 's'}`, up: false, icon: ArrowDownLeft, tone: '#ef4444' },
    { title: 'Net Profit', value: formatCurrency(totalIncome - totalExpenses), delta: totalIncome || totalExpenses ? 'Income minus expenses' : 'No profit data yet', up: totalIncome >= totalExpenses, icon: Banknote, tone: '#7c3aed' },
    { title: 'Outstanding Receivables', value: formatCurrency(outstandingReceivables), delta: `${data.invoices.filter(invoice => receivableBalance(invoice) > 0).length} invoice${data.invoices.filter(invoice => receivableBalance(invoice) > 0).length === 1 ? '' : 's'}`, icon: FileText, tone: '#f59e0b' },
    { title: 'Outstanding Payables', value: formatCurrency(outstandingPayables), delta: `${data.bills.filter(bill => payableBalance(bill) > 0).length} bill${data.bills.filter(bill => payableBalance(bill) > 0).length === 1 ? '' : 's'}`, icon: ReceiptText, tone: '#f59e0b' },
  ]

  return {
    metrics,
    bankAccounts,
    totalExpenses,
    cashPoints: buildCashPoints(transactions),
    expenseSegments: buildExpenseSegments(transactions),
    overdueInvoices,
    billsToPay,
    recentTransactions: transactions.slice(0, 8),
  }
}

function invoiceToTransaction(invoice: StoredRow, index: number): TransactionRow {
  const status = readString(invoice, ['status'], 'Draft')
  return {
    id: `invoice-${readString(invoice, ['id', 'invoiceNo', 'invoiceNumber', 'number'], String(index))}`,
    date: readString(invoice, ['dateCreated', 'issueDate', 'date', 'createdAt']),
    description: readString(invoice, ['invoiceNo', 'invoiceNumber', 'number'], 'Invoice'),
    secondary: readString(invoice, ['recipient', 'customer', 'client', 'company'], 'Customer invoice'),
    category: readString(invoice, ['category'], 'Invoice Income'),
    type: 'Income',
    amount: readNumber(invoice, ['paid', 'paidAmount'], isPaidStatus(status) ? readNumber(invoice, ['total', 'amount', 'balance'], 0) : 0),
    status: titleCase(status),
  }
}

function billToTransaction(bill: StoredRow, index: number): TransactionRow {
  const status = readString(bill, ['status'], 'Unpaid')
  return {
    id: `bill-${readString(bill, ['id', 'billNo', 'billNumber', 'reference'], String(index))}`,
    date: readString(bill, ['date', 'billDate', 'issueDate', 'createdAt']),
    description: readString(bill, ['name', 'billNo', 'billNumber'], 'Vendor bill'),
    secondary: readString(bill, ['vendor', 'supplier', 'associated'], 'Vendor payable'),
    category: readString(bill, ['category', 'type'], 'Vendor Bills'),
    type: 'Expense',
    amount: isPaidStatus(status) ? readNumber(bill, ['paid', 'paidAmount'], readNumber(bill, ['amount', 'total'], 0)) : readNumber(bill, ['paid', 'paidAmount'], 0),
    status: titleCase(status),
  }
}

function expenseToTransaction(expense: StoredRow, index: number): TransactionRow {
  return {
    id: `expense-${readString(expense, ['id', 'reference'], String(index))}`,
    date: readString(expense, ['date', 'createdAt', 'expenseDate']),
    description: readString(expense, ['description', 'name', 'merchant'], 'Expense'),
    secondary: readString(expense, ['merchant', 'vendor', 'employee'], 'Recorded expense'),
    category: readString(expense, ['category', 'type'], 'Expenses'),
    type: 'Expense',
    amount: readNumber(expense, ['amount', 'total', 'cost'], 0),
    status: titleCase(readString(expense, ['status'], 'Recorded')),
  }
}

function payrollToTransaction(record: StoredRow, index: number): TransactionRow | null {
  const amount = readNumber(record, ['netPay', 'grossPay', 'totalCost', 'totalPayrollCost'], 0)
  if (!amount) return null
  return {
    id: `payroll-${readString(record, ['id', 'payrollId', 'period'], String(index))}`,
    date: readString(record, ['payDate', 'createdAt', 'periodEnd', 'date']),
    description: readString(record, ['period', 'name'], 'Payroll release'),
    secondary: readString(record, ['employeeName', 'employee', 'department'], 'Payroll Finance'),
    category: 'Payroll',
    type: 'Expense',
    amount,
    status: titleCase(readString(record, ['status'], 'Recorded')),
  }
}

function storedToTransaction(row: StoredRow, index: number): TransactionRow {
  const rawType = readString(row, ['type', 'transactionType'], 'Transfer').toLowerCase()
  const type = rawType.includes('income') || rawType.includes('inflow') || rawType.includes('credit') ? 'Income' : rawType.includes('expense') || rawType.includes('outflow') || rawType.includes('debit') ? 'Expense' : 'Transfer'
  return {
    id: `transaction-${readString(row, ['id', 'reference'], String(index))}`,
    date: readString(row, ['date', 'transactionDate', 'createdAt']),
    description: readString(row, ['description', 'name', 'reference'], 'Transaction'),
    secondary: readString(row, ['account', 'customer', 'vendor', 'notes'], 'Accounting ledger'),
    category: readString(row, ['category'], type),
    type,
    amount: readNumber(row, ['amount', 'total', 'inflow', 'outflow'], 0),
    status: titleCase(readString(row, ['status'], 'Recorded')),
  }
}

function toBankAccount(account: StoredRow, index: number): BankAccountRow {
  const number = readString(account, ['number', 'accountNumber', 'last4'], '')
  return {
    id: readString(account, ['id', 'number', 'accountNumber'], String(index)),
    name: readString(account, ['name', 'accountName', 'bank'], 'Bank account'),
    accountMask: number ? `•••• ${number.slice(-4)}` : readString(account, ['mask'], 'No account number'),
    balance: readNumber(account, ['balance', 'currentBalance', 'availableBalance'], 0),
    color: readString(account, ['color'], bankColors[index % bankColors.length]),
  }
}

function buildCashPoints(transactions: TransactionRow[]): CashPoint[] {
  if (!transactions.length) return []
  const byMonth = new Map<string, CashPoint>()
  transactions.forEach(row => {
    const date = parseDate(row.date)
    const label = date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' })
    const current = byMonth.get(label) || { label, inflow: 0, outflow: 0, net: 0 }
    if (row.type === 'Income') current.inflow += row.amount
    if (row.type === 'Expense') current.outflow += row.amount
    current.net = current.inflow - current.outflow
    byMonth.set(label, current)
  })
  return Array.from(byMonth.values()).slice(-8)
}

function buildExpenseSegments(transactions: TransactionRow[]): ExpenseSegment[] {
  const groups = new Map<string, number>()
  transactions.filter(row => row.type === 'Expense').forEach(row => {
    groups.set(row.category, (groups.get(row.category) || 0) + row.amount)
  })
  return Array.from(groups.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([label, amount], index) => ({ label, amount, color: segmentColors[index % segmentColors.length] }))
}

function receivableBalance(invoice: StoredRow) {
  const status = readString(invoice, ['status'], '')
  if (isPaidStatus(status)) return 0
  const amount = readNumber(invoice, ['total', 'amount', 'balanceDue'], 0)
  const paid = readNumber(invoice, ['paid', 'paidAmount'], 0)
  return Math.max(amount - paid, 0)
}

function payableBalance(bill: StoredRow) {
  const status = readString(bill, ['status'], '')
  if (isPaidStatus(status)) return 0
  const amount = readNumber(bill, ['amount', 'total', 'balanceDue'], 0)
  const paid = readNumber(bill, ['paid', 'paidAmount'], 0)
  return Math.max(amount - paid, 0)
}

function readString(row: StoredRow, keys: string[], fallback = '') {
  for (const key of keys) {
    const value = row[key]
    if (typeof value === 'string' && value.trim()) return value
    if (typeof value === 'number') return String(value)
  }
  return fallback
}

function readNumber(row: StoredRow, keys: string[], fallback = 0) {
  for (const key of keys) {
    const value = row[key]
    if (typeof value === 'number' && Number.isFinite(value)) return value
    if (typeof value === 'string') {
      const parsed = Number(value.replace(/[^0-9.-]+/g, ''))
      if (Number.isFinite(parsed)) return parsed
    }
  }
  return fallback
}

function isPaidStatus(status: string) {
  return ['paid', 'completed', 'released'].includes(status.toLowerCase())
}

function isOverdue(value: string) {
  if (!value || value === '-') return false
  const date = parseDate(value)
  return date.getTime() < startOfToday().getTime()
}

function dateValue(value: string) {
  return parseDate(value).getTime()
}

function parseDate(value: string) {
  const parsed = value ? new Date(value.includes('T') ? value : `${value}T00:00:00`) : new Date()
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed
}

function startOfToday() {
  const date = new Date()
  date.setHours(0, 0, 0, 0)
  return date
}

function formatDate(value: string) {
  return parseDate(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(value)
}

function percentage(value: number, total: number) {
  if (!total) return 0
  return Math.round((value / total) * 1000) / 10
}

function titleCase(value: string) {
  return value.toLowerCase().split(/[\s_-]+/).filter(Boolean).map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ') || 'Recorded'
}

function statusSlug(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-')
}

function Panel({ title, children, action, link }: { title: string; children: ReactNode; action?: string; link?: string }) {
  return (
    <section className="accounting-card">
      <div className="accounting-panel-header">
        <h2>{title}</h2>
        {link ? <Link href={link}>View All</Link> : action ? <span>{action}</span> : null}
      </div>
      {children}
    </section>
  )
}

function Legend({ color, label, value }: { color: string; label: string; value?: string }) {
  return (
    <span className="accounting-legend">
      <span style={{ background: color }} />
      <span>{label}</span>
      {value && <strong>{value}</strong>}
    </span>
  )
}

function EmptyState({ message }: { message: string }) {
  return <StateFeedback className="accounting-empty" size="compact" title={message} />
}

function MiniRows({ rows, emptyMessage }: { rows: MiniRow[]; emptyMessage: string }) {
  if (!rows.length) return <EmptyState message={emptyMessage} />
  const total = rows.reduce((sum, row) => sum + row.amount, 0)
  return (
    <div className="mini-rows">
      {rows.map(row => (
        <div key={`${row.reference}-${row.name}`}>
          <span>{row.name}</span>
          <span>{row.reference}</span>
          <strong>{formatCurrency(row.amount)}</strong>
        </div>
      ))}
      <div className="mini-total"><strong>Total</strong><strong>{formatCurrency(total)}</strong></div>
    </div>
  )
}

function LineChart({ points }: { points: CashPoint[] }) {
  const max = Math.max(...points.flatMap(point => [point.inflow, point.outflow, Math.abs(point.net)]), 1)
  const makePoints = (key: keyof Pick<CashPoint, 'inflow' | 'outflow' | 'net'>) =>
    points.map((point, index) => {
      const x = points.length === 1 ? 350 : (index / (points.length - 1)) * 700
      const y = 205 - (Math.max(point[key], 0) / max) * 180
      return `${x},${y}`
    }).join(' ')

  return (
    <div className="cash-chart">
      {[0, 1, 2, 3].map(row => <span key={row} style={{ top: `${row * 25}%` }} />)}
      <svg viewBox="0 0 700 210" preserveAspectRatio="none">
        <polyline points={makePoints('inflow')} fill="none" stroke="#16a34a" strokeWidth="3" />
        <polyline points={makePoints('outflow')} fill="none" stroke="#ef4444" strokeWidth="3" />
        <polyline points={makePoints('net')} fill="none" stroke="#2563eb" strokeWidth="3" />
      </svg>
      <div className="cash-labels">
        {points.map(point => <span key={point.label}>{point.label}</span>)}
      </div>
    </div>
  )
}

function DonutChart({ segments, total }: { segments: ExpenseSegment[]; total: number }) {
  const gradient = segments.reduce<{ cursor: number; stops: string[] }>((result, segment) => {
    const end = result.cursor + percentage(segment.amount, total)
    return {
      cursor: end,
      stops: [...result.stops, `${segment.color} ${result.cursor}% ${end}%`],
    }
  }, { cursor: 0, stops: [] }).stops.join(', ')

  return (
    <div className="expense-donut" style={{ '--donut-gradient': gradient } as CSSProperties}>
      <div>
        <strong>{formatCurrency(total)}</strong>
        <span>Total Expenses</span>
      </div>
    </div>
  )
}

const accountingOverviewCss = `
.accounting-overview-page {
  --accounting-dashboard-inline-space: clamp(16px, 2vw, 32px);
  --accounting-dashboard-max-width: var(--wf-content-max, 1440px);
  min-height: 100%;
  color: #0f172a;
  background: #f3f4f6;
  padding: 24px var(--accounting-dashboard-inline-space) 32px;
  overflow-x: hidden;
}
.accounting-dashboard-hero {
  width: 100%;
  margin: 0;
  padding: 0;
  background: transparent;
  color: #0f172a;
}
.accounting-dashboard-inner,
.accounting-dashboard-content {
  width: min(100%, var(--accounting-dashboard-max-width));
  margin-inline: auto;
}
.accounting-dashboard-inner,
.accounting-dashboard-content {
  display: grid;
  align-content: start;
}
.accounting-dashboard-inner { gap: 16px; }
.accounting-dashboard-content { gap: 16px; padding: 16px 0 0; }
.accounting-hero-header {
  display: grid;
  grid-template-columns: minmax(280px, .82fr) minmax(340px, auto);
  align-items: start;
  gap: 18px;
  padding: 0 0 2px;
  background: transparent;
}
.accounting-hero-copy { min-width: 0; }
.accounting-breadcrumb {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 14px;
  color: #334155;
  font-size: 13px;
  font-weight: 500;
}
.accounting-breadcrumb a {
  color: inherit;
  text-decoration: none;
}
.accounting-breadcrumb strong { color: #0f172a; font-weight: 600; }
.accounting-hero-copy h1 {
  margin: 0;
  color: #0f172a;
  font-size: 30px;
  line-height: 1.08;
  font-weight: 750;
  letter-spacing: 0;
}
.accounting-hero-copy p {
  max-width: 760px;
  margin: 8px 0 0;
  color: #334155;
  font-size: 14px;
  line-height: 1.5;
  font-weight: 400;
}
.accounting-hero-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 10px;
  flex-wrap: wrap;
}
.accounting-hero-action {
  height: 38px;
  min-width: 0;
  border: 1px solid #d8dee7;
  border-radius: 6px;
  background: #ffffff;
  color: #0f172a;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  padding: 0 13px;
  font-size: 13px;
  font-weight: 600;
  text-decoration: none;
  white-space: nowrap;
  box-shadow: none;
}
.accounting-hero-action:hover {
  background: #f8fafc;
  border-color: #cbd5e1;
}
.accounting-hero-action.is-primary {
  background: #22c55e;
  border-color: #22c55e;
  color: #ffffff;
}
.accounting-hero-action.is-primary:hover {
  background: #16a34a;
  border-color: #16a34a;
  color: #ffffff;
}
.accounting-card {
  background: #ffffff;
  border: 1px solid #dbe2ea;
  border-radius: 8px;
  padding: 18px;
  box-shadow: 0 1px 2px rgba(15, 23, 42, .04);
  min-width: 0;
}
.accounting-metrics {
  display: grid;
  grid-template-columns: repeat(6, minmax(0, 1fr));
  gap: 12px;
}
.accounting-metric-card {
  position: relative;
  overflow: hidden;
  min-width: 0;
  min-height: 104px;
  display: grid;
  grid-template-columns: 40px minmax(0, 1fr);
  align-items: start;
  gap: 12px;
  padding: 14px 15px;
  border: 1px solid #dbe2ea;
  border-radius: 8px;
  background: #ffffff;
  box-shadow: 0 1px 2px rgba(15, 23, 42, .04);
}
.accounting-metric-icon {
  width: 38px;
  height: 38px;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  display: grid;
  place-items: center;
  flex: 0 0 auto;
}
.accounting-metric-copy {
  min-width: 0;
  display: grid;
  gap: 5px;
  max-width: 100%;
}
.accounting-eyebrow {
  min-height: 28px;
  overflow: visible;
  color: #0f172a;
  font-size: 11.5px;
  line-height: 1.2;
  font-weight: 600;
  opacity: .72;
  white-space: normal;
}
.accounting-metric-value {
  overflow: hidden;
  color: #0f172a;
  font-size: 21px;
  line-height: 1.1;
  font-weight: 800;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.accounting-metric-delta {
  min-width: 0;
  margin-top: 0;
  display: flex;
  align-items: center;
  gap: 5px;
  color: #0f172a;
  font-size: 12px;
  font-weight: 600;
  opacity: .72;
}
.accounting-metric-delta svg { flex: 0 0 auto; }
.accounting-metric-delta { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.accounting-main-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.25fr) minmax(360px, .75fr) 380px;
  gap: 16px;
}
.accounting-lower-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 380px;
  gap: 16px;
}
.accounting-side-stack { display: grid; gap: 16px; align-content: start; }
.accounting-panel-header { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 14px; }
.accounting-panel-header h2 { margin: 0; font-size: 15px; font-weight: 700; color: #111827; }
.accounting-panel-header a { color: #0f172a; text-decoration: none; font-size: 12px; font-weight: 600; }
.accounting-panel-header span { border: 1px solid #e5e7eb; background: #f8fafc; border-radius: 6px; min-height: 30px; display: inline-flex; align-items: center; padding: 0 10px; color: #334155; font-size: 12px; font-weight: 600; max-width: 170px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.cash-flow-panel { min-height: 300px; display: grid; grid-template-rows: auto 1fr; gap: 16px; }
.accounting-legend-row { display: flex; flex-wrap: wrap; gap: 18px; color: #000000; font-size: 12px; font-weight: 600; }
.accounting-legend { display: flex; align-items: center; gap: 9px; min-width: 0; }
.accounting-legend > span:first-child { width: 8px; height: 8px; border-radius: 999px; flex: 0 0 auto; }
.accounting-legend > span:nth-child(2) { flex: 1; min-width: 0; font-size: 12px; font-weight: 600; color: #334155; }
.accounting-legend strong { font-size: 12px; }
.cash-chart { min-height: 248px; position: relative; border-bottom: 1px solid #e5e7eb; border-left: 1px solid #e5e7eb; overflow: hidden; }
.cash-chart > span { position: absolute; left: 0; right: 0; border-top: 1px solid #eef2f7; }
.cash-chart svg { position: absolute; inset: 0 0 24px; width: 100%; height: calc(100% - 24px); }
.cash-labels { position: absolute; left: 8px; right: 0; bottom: 0; display: flex; justify-content: space-between; color: #000000; font-size: 10.5px; font-weight: 700; }
.expense-breakdown { display: grid; grid-template-columns: 170px 1fr; gap: 18px; align-items: center; min-height: 300px; }
.expense-donut { width: 156px; height: 156px; border-radius: 50%; background: conic-gradient(var(--donut-gradient)); display: grid; place-items: center; }
.expense-donut > div { width: 92px; height: 92px; border-radius: 50%; background: #fff; display: grid; place-items: center; text-align: center; padding: 8px; }
.expense-donut strong { font-size: 16px; }
.expense-donut span { font-size: 11px; color: #000000; font-weight: 600; }
.expense-segments { display: grid; gap: 12px; }
.bank-list { display: grid; }
.bank-row { display: grid; grid-template-columns: 42px minmax(0, 1fr) auto; gap: 12px; align-items: center; padding: 14px 0; border-bottom: 1px solid #eef2f7; }
.bank-icon { width: 38px; height: 38px; border-radius: 8px; color: #fff; display: grid; place-items: center; }
.bank-copy strong { display: block; font-size: 13.5px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.bank-copy small { color: #000000; font-weight: 600; }
.accounting-add-link { text-decoration: none; color: #0f172a; font-weight: 600; font-size: 13px; text-align: center; padding: 14px 0 0; }
.mini-rows { display: grid; gap: 12px; }
.mini-rows > div:not(.mini-total) { display: grid; grid-template-columns: minmax(0, 1fr) auto auto; gap: 12px; font-size: 12.5px; }
.mini-rows span:first-child { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.mini-rows span:nth-child(2) { color: #000000; font-weight: 600; }
.mini-rows strong { color: #ef4444; }
.mini-total { border-top: 1px solid #eef2f7; padding-top: 12px; display: flex; justify-content: space-between; font-size: 12.5px; }
.accounting-table-wrap { overflow-x: auto; border: 1px solid #e5e7eb; border-radius: 8px; background: #ffffff; }
.accounting-table { width: 100%; border-collapse: collapse; min-width: 880px; }
.accounting-table th { text-align: left; padding: 11px 12px; color: #000000; background: #f8fafc; font-size: 11px; text-transform: uppercase; font-weight: 700; }
.accounting-table td { padding: 12px; font-size: 12.5px; color: #111827; vertical-align: middle; border-top: 1px solid #eef2f7; }
.accounting-table td strong { display: block; }
.accounting-table td small { display: block; color: #000000; margin-top: 3px; }
.accounting-pill { display: inline-flex; align-items: center; min-height: 22px; border-radius: 6px; background: #eef2ff; color: #4f46e5; padding: 0 8px; font-size: 11.5px; font-weight: 700; }
.status-paid, .status-completed, .status-released { background: #dcfce7; color: #15803d; }
.status-overdue, .status-cancelled { background: #fee2e2; color: #dc2626; }
.type-expense, .amount-negative { color: #ef4444 !important; font-weight: 700; }
.type-income { color: #16a34a !important; font-weight: 700; }
.type-transfer { color: #2563eb !important; font-weight: 700; }
.accounting-more-button { width: 32px; height: 30px; border-radius: 7px; border: 1px solid #eef2f7; background: #fff; color: #000000; display: grid; place-items: center; cursor: pointer; }
.quick-actions-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.quick-action { min-height: 76px; border: 1px solid #eef2f7; border-radius: 8px; text-decoration: none; color: #111827; display: flex; align-items: center; gap: 12px; padding: 12px; }
.quick-action > span:first-child { width: 36px; height: 36px; border-radius: 8px; background: #ecfdf3; color: #16a34a; display: grid; place-items: center; flex: 0 0 auto; }
.quick-action strong { display: block; font-size: 13px; font-weight: 700; }
.quick-action small { display: block; color: #000000; margin-top: 3px; }
.accounting-empty { min-height: 154px; display: grid; place-items: center; align-content: center; gap: 8px; text-align: center; color: #000000; font-size: 13px; font-weight: 500; line-height: 1.45; padding: 22px; border: 1px dashed #dbe2ea; border-radius: 8px; background: #ffffff; }
.accounting-empty .wf-state__icon { width: 52px; height: 52px; border: 1px solid #dbe2ea; border-radius: 8px; display: grid; place-items: center; background: #f8fafc; color: #0f172a; }
.accounting-empty h1 { max-width: 360px; margin: 0; color: #0f172a; font-size: 13px; line-height: 1.35; font-weight: 650; }
.accounting-empty p { margin: 0; color: #000000; font-size: 12.5px; line-height: 1.4; }
@media (max-width: 1320px) {
  .accounting-metrics { grid-template-columns: repeat(3, minmax(180px, 1fr)); }
  .accounting-main-grid { grid-template-columns: minmax(0, 1fr) minmax(320px, .8fr); }
  .accounting-side-stack { grid-column: 1 / -1; grid-template-columns: repeat(3, minmax(0, 1fr)); }
  .accounting-lower-grid { grid-template-columns: 1fr; }
}
@media (max-width: 1024px) {
  .accounting-overview-page { --accounting-dashboard-inline-space: 24px; padding-top: 22px; }
  .accounting-hero-header { grid-template-columns: 1fr; }
  .accounting-hero-actions { justify-content: flex-start; }
  .accounting-metrics { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .accounting-main-grid, .accounting-side-stack { grid-template-columns: 1fr; }
}
@media (max-width: 640px) {
  .accounting-overview-page { --accounting-dashboard-inline-space: 16px; padding-top: 18px; }
  .accounting-hero-actions { display: grid; grid-template-columns: 1fr; width: 100%; }
  .accounting-hero-action { width: 100%; }
  .accounting-metrics { display: flex; overflow-x: auto; padding-bottom: 4px; scroll-snap-type: x mandatory; }
  .accounting-metric-card { min-width: min(280px, 82vw); scroll-snap-align: start; }
  .quick-actions-grid { grid-template-columns: 1fr; }
  .accounting-card { padding: 16px; }
  .accounting-metric-value { font-size: 20px; }
  .expense-breakdown { grid-template-columns: 1fr; justify-items: center; }
  .expense-segments { width: 100%; }
  .mini-rows > div:not(.mini-total) { grid-template-columns: 1fr; gap: 4px; }
  .accounting-table-wrap { overflow: visible; border: 0; background: transparent; }
  .accounting-table, .accounting-table thead, .accounting-table tbody, .accounting-table tr, .accounting-table td { display: block; width: 100%; min-width: 0; }
  .accounting-table thead { display: none; }
  .accounting-table tr { border: 1px solid #eef2f7; border-radius: 8px; margin-bottom: 12px; overflow: hidden; background: #ffffff; }
  .accounting-table td { border-top: 0; display: grid; grid-template-columns: 105px minmax(0, 1fr); gap: 10px; padding: 10px 12px; }
  .accounting-table td::before { content: attr(data-label); color: #000000; font-size: 11px; font-weight: 700; text-transform: uppercase; }
}

/* Final overview polish: keep this page readable inside the accounting shell. */
html[data-theme='light'] .accounting-shell .accounting-scroll-content .accounting-overview-page .accounting-dashboard-inner,
html[data-theme='light'] .accounting-shell .accounting-scroll-content .accounting-overview-page .accounting-dashboard-content {
  width: min(var(--accounting-dashboard-max-width), calc(100% - var(--accounting-dashboard-inline-space) * 2)) !important;
}

html[data-theme='light'] .accounting-shell .accounting-scroll-content .accounting-overview-page .accounting-metrics {
  grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
  gap: 14px !important;
  padding: 0 !important;
  background: transparent !important;
  border: 0 !important;
  box-shadow: none !important;
}

html[data-theme='light'] .accounting-shell .accounting-scroll-content .accounting-overview-page .accounting-metric-card {
  min-height: 118px !important;
  grid-template-columns: 42px minmax(0, 1fr) !important;
  align-items: center !important;
  padding: 16px !important;
}

html[data-theme='light'] .accounting-shell .accounting-scroll-content .accounting-overview-page .accounting-metric-icon {
  width: 40px !important;
  height: 40px !important;
  border-radius: 8px !important;
}

html[data-theme='light'] .accounting-shell .accounting-scroll-content .accounting-overview-page .accounting-eyebrow {
  min-height: 0 !important;
  color: #000000 !important;
  font-size: 12px !important;
  line-height: 1.25 !important;
  font-weight: 700 !important;
  opacity: 1 !important;
}

html[data-theme='light'] .accounting-shell .accounting-scroll-content .accounting-overview-page .accounting-metric-value {
  color: #0f172a !important;
  font-size: 23px !important;
  letter-spacing: 0 !important;
}

html[data-theme='light'] .accounting-shell .accounting-scroll-content .accounting-overview-page .accounting-metric-delta {
  font-size: 12px !important;
  opacity: 1 !important;
}

html[data-theme='light'] .accounting-shell .accounting-scroll-content .accounting-overview-page .accounting-main-grid,
html[data-theme='light'] .accounting-shell .accounting-scroll-content .accounting-overview-page .accounting-lower-grid,
html[data-theme='light'] .accounting-shell .accounting-scroll-content .accounting-overview-page .accounting-side-stack {
  gap: 18px !important;
}

html[data-theme='light'] .accounting-shell .accounting-scroll-content .accounting-overview-page .accounting-card {
  padding: 20px !important;
}

html[data-theme='light'] .accounting-shell .accounting-scroll-content .accounting-overview-page .accounting-panel-header {
  margin-bottom: 16px !important;
}

html[data-theme='light'] .accounting-shell .accounting-scroll-content .accounting-overview-page .accounting-panel-header h2 {
  color: #0f172a !important;
  font-size: 15px !important;
  line-height: 1.25 !important;
  font-weight: 760 !important;
}

html[data-theme='light'] .accounting-shell .accounting-scroll-content .accounting-overview-page .accounting-panel-header a,
html[data-theme='light'] .accounting-shell .accounting-scroll-content .accounting-overview-page .accounting-add-link {
  color: #166534 !important;
}

html[data-theme='light'] .accounting-shell .accounting-scroll-content .accounting-overview-page .accounting-empty {
  min-height: 170px !important;
  background: #fbfdff !important;
  border-color: #d8dee7 !important;
}

html[data-theme='light'] .accounting-shell .accounting-scroll-content .accounting-overview-page .quick-action {
  min-height: 72px !important;
  border-color: #dbe2ea !important;
  background: #ffffff !important;
}

html[data-theme='light'] .accounting-shell .accounting-scroll-content .accounting-overview-page .quick-action:hover {
  background: #f8fafc !important;
  border-color: #cbd5e1 !important;
}

@media (max-width: 1120px) {
  html[data-theme='light'] .accounting-shell .accounting-scroll-content .accounting-overview-page .accounting-metrics {
    grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
  }
}

@media (max-width: 760px) {
  html[data-theme='light'] .accounting-shell .accounting-scroll-content > .accounting-overview-page {
    background: #f3f4f6 !important;
  }

  html[data-theme='light'] .accounting-shell .accounting-scroll-content .accounting-overview-page .accounting-dashboard-hero {
    padding: 18px 0 20px !important;
    background: linear-gradient(180deg, var(--acc-hero) 0, var(--acc-hero) 270px, #f3f4f6 270px, #f3f4f6 100%) !important;
  }

  html[data-theme='light'] .accounting-shell .accounting-scroll-content .accounting-overview-page .accounting-dashboard-inner,
  html[data-theme='light'] .accounting-shell .accounting-scroll-content .accounting-overview-page .accounting-dashboard-content {
    width: min(100%, calc(100% - 28px)) !important;
  }

  html[data-theme='light'] .accounting-shell .accounting-scroll-content .accounting-overview-page .accounting-dashboard-inner {
    gap: 14px !important;
  }

  html[data-theme='light'] .accounting-shell .accounting-scroll-content .accounting-overview-page .accounting-hero-header {
    gap: 12px !important;
  }

  html[data-theme='light'] .accounting-shell .accounting-scroll-content .accounting-overview-page .accounting-breadcrumb {
    display: none !important;
  }

  html[data-theme='light'] .accounting-shell .accounting-scroll-content .accounting-overview-page .accounting-hero-copy h1 {
    font-size: 24px !important;
  }

  html[data-theme='light'] .accounting-shell .accounting-scroll-content .accounting-overview-page .accounting-hero-copy p {
    margin-top: 6px !important;
    font-size: 13px !important;
    line-height: 1.45 !important;
  }

  html[data-theme='light'] .accounting-shell .accounting-scroll-content .accounting-overview-page .accounting-hero-actions {
    display: grid !important;
    grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
    gap: 8px !important;
    width: 100% !important;
  }

  html[data-theme='light'] .accounting-shell .accounting-scroll-content .accounting-overview-page .accounting-hero-action {
    width: auto !important;
    min-height: 40px !important;
    height: 40px !important;
    padding: 0 8px !important;
    gap: 6px !important;
    font-size: 12px !important;
  }

  html[data-theme='light'] .accounting-shell .accounting-scroll-content .accounting-overview-page .accounting-hero-action svg {
    width: 14px !important;
    height: 14px !important;
  }

  html[data-theme='light'] .accounting-shell .accounting-scroll-content .accounting-overview-page .accounting-metrics {
    display: grid !important;
    grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
    gap: 12px !important;
    overflow: visible !important;
    padding-bottom: 0 !important;
  }

  html[data-theme='light'] .accounting-shell .accounting-scroll-content .accounting-overview-page .accounting-metric-card {
    min-width: 0 !important;
    min-height: 104px !important;
    grid-template-columns: 34px minmax(0, 1fr) !important;
    gap: 10px !important;
    padding: 13px !important;
    scroll-snap-align: none !important;
  }

  html[data-theme='light'] .accounting-shell .accounting-scroll-content .accounting-overview-page .accounting-metric-icon {
    width: 34px !important;
    height: 34px !important;
  }

  html[data-theme='light'] .accounting-shell .accounting-scroll-content .accounting-overview-page .accounting-eyebrow {
    font-size: 11px !important;
  }

  html[data-theme='light'] .accounting-shell .accounting-scroll-content .accounting-overview-page .accounting-metric-value {
    font-size: 20px !important;
  }

  html[data-theme='light'] .accounting-shell .accounting-scroll-content .accounting-overview-page .accounting-metric-delta {
    font-size: 11px !important;
  }

  html[data-theme='light'] .accounting-shell .accounting-scroll-content .accounting-overview-page .accounting-main-grid,
  html[data-theme='light'] .accounting-shell .accounting-scroll-content .accounting-overview-page .accounting-lower-grid,
  html[data-theme='light'] .accounting-shell .accounting-scroll-content .accounting-overview-page .accounting-side-stack {
    gap: 16px !important;
  }

  html[data-theme='light'] .accounting-shell .accounting-scroll-content .accounting-overview-page .accounting-card {
    padding: 16px !important;
  }
}

@media (max-width: 370px) {
  html[data-theme='light'] .accounting-shell .accounting-scroll-content .accounting-overview-page .accounting-metrics {
    grid-template-columns: 1fr !important;
  }

  html[data-theme='light'] .accounting-shell .accounting-scroll-content .accounting-overview-page .accounting-metric-card {
    grid-template-columns: 40px minmax(0, 1fr) !important;
  }
}
`
