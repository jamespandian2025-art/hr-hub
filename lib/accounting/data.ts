'use client'

import { getActiveCompany } from '@/lib/tenant/company'

export type StoredRow = Record<string, unknown>

export type AccountingTransactionType = 'Income' | 'Expense' | 'Transfer'

export type AccountingTransaction = {
  id: string
  date: string
  description: string
  secondary: string
  account: string
  category: string
  type: AccountingTransactionType
  reference: string
  inflow: number
  outflow: number
  amount: number
  balance: number
  status: string
}

export type AccountingBankAccount = {
  id: string
  name: string
  type: string
  number: string
  bank: string
  currency: string
  balance: number
  status: string
  color: string
}

export type AccountingInvoice = {
  id: string
  number: string
  customer: string
  email: string
  issueDate: string
  dueDate: string
  amount: number
  paid: number
  balanceDue: number
  status: string
}

export type AccountingBill = {
  id: string
  name: string
  type: string
  associated: string
  category: string
  vendor: string
  amount: number
  paid: number
  balanceDue: number
  status: string
  date: string
  notes: string
}

export type AccountingBudget = {
  id: string
  name: string
  project: string
  date: string
  status: string
  description: string
  total: number
  actual: number
  department: string
  category: string
}

export type AccountingAuditEvent = {
  id: string
  dateTime: string
  user: string
  initials: string
  role: string
  action: string
  module: string
  details: string
  ipAddress: string
  status: string
}

export type AccountingData = {
  companyName: string
  currency: string
  invoices: AccountingInvoice[]
  bills: AccountingBill[]
  expenses: StoredRow[]
  bankAccounts: AccountingBankAccount[]
  transactions: AccountingTransaction[]
  payrollRecords: StoredRow[]
  budgets: AccountingBudget[]
  auditEvents: AccountingAuditEvent[]
  taxObligations: TaxObligation[]
}

export type TaxObligation = {
  id: string
  type: string
  period: string
  dueDate: string
  taxableAmount: number
  payable: number
  paid: number
  status: string
  color: string
}

const invoiceKeys = ['flowsys-invoices', 'flowsys-accounting-invoices', 'wiseflow-accounting-invoices']
const billKeys = ['flowsys-bills', 'flowsys-accounting-bills', 'wiseflow-accounting-bills']
const expenseKeys = ['flowsys-expenses', 'flowsys-accounting-expenses', 'wiseflow-accounting-expenses']
const bankKeys = ['flowsys-bank-accounts', 'flowsys-accounting-bank-accounts', 'wiseflow-bank-accounts']
const transactionKeys = ['flowsys-transactions', 'flowsys-accounting-transactions', 'wiseflow-accounting-transactions']
const payrollKeys = ['flowsys-hr-payroll-records']
const budgetKeys = ['flowsys-budgets', 'flowsys-accounting-budgets', 'wiseflow-accounting-budgets']
const auditKeys = ['flowsys-audit-logs']
const taxKeys = ['flowsys-tax-obligations', 'flowsys-accounting-tax-obligations', 'wiseflow-tax-obligations']

const colors = ['#2563eb', '#4f46e5', '#14b8a6', '#f59e0b', '#fb923c', '#64748b', '#7c3aed']

export function loadAccountingData(): AccountingData {
  const activeCompany = getActiveCompany()
  const companyId = activeCompany?.id
  const rawInvoices = loadRows(invoiceKeys, companyId)
  const rawBills = loadRows(billKeys, companyId)
  const rawExpenses = loadRows(expenseKeys, companyId)
  const rawBankAccounts = loadRows(bankKeys, companyId)
  const rawTransactions = loadRows(transactionKeys, companyId)
  const payrollRecords = loadRows(payrollKeys, companyId)
  const invoices = rawInvoices.map(toInvoice)
  const bills = rawBills.map(toBill)
  const expenses = rawExpenses
  const bankAccounts = rawBankAccounts.map(toBankAccount)
  const transactions = buildTransactions(rawTransactions, invoices, bills, expenses, payrollRecords)

  return {
    companyName: activeCompany?.name || 'Current company',
    currency: 'PHP',
    invoices,
    bills,
    expenses,
    bankAccounts,
    transactions,
    payrollRecords,
    budgets: loadRows(budgetKeys, companyId).map(toBudget),
    auditEvents: loadRows(auditKeys, companyId).map(toAuditEvent),
    taxObligations: loadRows(taxKeys, companyId).map(toTaxObligation),
  }
}

export function emptyAccountingData(): AccountingData {
  return {
    companyName: 'Current company',
    currency: 'PHP',
    invoices: [],
    bills: [],
    expenses: [],
    bankAccounts: [],
    transactions: [],
    payrollRecords: [],
    budgets: [],
    auditEvents: [],
    taxObligations: [],
  }
}

export function money(value: number, currency = 'PHP') {
  return new Intl.NumberFormat(currency === 'PHP' ? 'en-PH' : 'en-US', { style: 'currency', currency }).format(Number(value || 0))
}

export function formatDate(value?: string) {
  if (!value || value === '-') return '-'
  const date = parseDate(value)
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export function readNumber(row: StoredRow, keys: string[], fallback = 0) {
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

export function readString(row: StoredRow, keys: string[], fallback = '') {
  for (const key of keys) {
    const value = row[key]
    if (typeof value === 'string' && value.trim()) return value.trim()
    if (typeof value === 'number') return String(value)
  }
  return fallback
}

export function statusClass(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-')
}

export function isPaidStatus(status: string) {
  return ['paid', 'completed', 'released', 'processed'].includes(status.toLowerCase())
}

export function isOverdue(value: string) {
  if (!value || value === '-') return false
  const due = parseDate(value)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return due.getTime() < today.getTime()
}

export function titleCase(value: string) {
  return value.toLowerCase().split(/[\s_-]+/).filter(Boolean).map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ') || 'Recorded'
}

export function subscribeAccountingData(callback: () => void) {
  if (typeof window === 'undefined') return () => undefined
  const events = ['storage', 'wiseflow-company-change', 'wiseflow-accounting-refresh', 'wiseflow:finance-requests-changed']
  events.forEach(event => window.addEventListener(event, callback))
  return () => events.forEach(event => window.removeEventListener(event, callback))
}

export function monthlySeries(transactions: AccountingTransaction[]) {
  const byMonth = new Map<string, { label: string; revenue: number; expenses: number; profit: number }>()
  transactions.forEach(transaction => {
    const date = parseDate(transaction.date)
    const label = date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' })
    const current = byMonth.get(label) || { label, revenue: 0, expenses: 0, profit: 0 }
    if (transaction.type === 'Income') current.revenue += transaction.amount
    if (transaction.type === 'Expense') current.expenses += transaction.amount
    current.profit = current.revenue - current.expenses
    byMonth.set(label, current)
  })
  return Array.from(byMonth.values()).slice(-12)
}

export function expenseBreakdown(transactions: AccountingTransaction[]) {
  const groups = new Map<string, number>()
  transactions.filter(row => row.type === 'Expense').forEach(row => {
    groups.set(row.category, (groups.get(row.category) || 0) + row.amount)
  })
  return Array.from(groups.entries()).sort((a, b) => b[1] - a[1]).map(([name, value], index) => ({ name, value, color: colors[index % colors.length] }))
}

function loadRows(keys: string[], companyId?: string): StoredRow[] {
  if (typeof window === 'undefined') return []
  const rows: StoredRow[] = []
  const seenKeys = new Set<string>()
  keys.flatMap(key => companyId ? [`${key}:${companyId}`, key] : [key]).forEach(key => {
    if (seenKeys.has(key)) return
    seenKeys.add(key)
    try {
      const parsed = JSON.parse(window.localStorage.getItem(key) || '[]') as unknown
      if (Array.isArray(parsed)) parsed.forEach(item => {
        if (item && typeof item === 'object') rows.push(item as StoredRow)
      })
    } catch {
      // Ignore invalid legacy rows.
    }
  })
  return dedupeRows(rows)
}

function dedupeRows(rows: StoredRow[]) {
  const seen = new Set<string>()
  return rows.filter((row, index) => {
    const key = String(row.id ?? row.invoiceNo ?? row.invoiceNumber ?? row.billNo ?? row.billNumber ?? row.reference ?? `${row.name ?? row.description ?? 'row'}-${index}`)
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

function toInvoice(row: StoredRow, index: number): AccountingInvoice {
  const status = titleCase(readString(row, ['status'], 'Draft'))
  const amount = readNumber(row, ['total', 'amount', 'balance'], 0)
  const paid = readNumber(row, ['paid', 'paidAmount'], isPaidStatus(status) ? amount : 0)
  return {
    id: readString(row, ['id', 'invoiceNo', 'invoiceNumber', 'number'], String(index)),
    number: readString(row, ['invoiceNo', 'invoiceNumber', 'number'], `INV-${index + 1}`),
    customer: readString(row, ['recipient', 'customer', 'client', 'company'], 'No recipient'),
    email: readString(row, ['email', 'customerEmail', 'recipientEmail'], ''),
    issueDate: readString(row, ['dateCreated', 'issueDate', 'date', 'createdAt'], ''),
    dueDate: readString(row, ['dueDate', 'due_date'], ''),
    amount,
    paid,
    balanceDue: Math.max(amount - paid, 0),
    status,
  }
}

function toBill(row: StoredRow, index: number): AccountingBill {
  const amount = readNumber(row, ['amount', 'total'], 0)
  const status = titleCase(readString(row, ['status'], 'Unpaid'))
  const paid = readNumber(row, ['paid', 'paidAmount'], isPaidStatus(status) ? amount : 0)
  return {
    id: readString(row, ['id', 'billNo', 'billNumber', 'reference'], String(index)),
    name: readString(row, ['name', 'billNo', 'billNumber'], 'Untitled bill'),
    type: readString(row, ['type'], 'Bill'),
    associated: readString(row, ['associated', 'project'], '-'),
    category: readString(row, ['category'], 'General expense'),
    vendor: readString(row, ['vendor', 'supplier'], '-'),
    amount,
    paid,
    balanceDue: Math.max(amount - paid, 0),
    status,
    date: readString(row, ['date', 'billDate', 'issueDate', 'createdAt'], ''),
    notes: readString(row, ['notes', 'description'], ''),
  }
}

function toBankAccount(row: StoredRow, index: number): AccountingBankAccount {
  return {
    id: readString(row, ['id', 'number', 'accountNumber'], String(index)),
    name: readString(row, ['name', 'accountName'], 'Bank account'),
    type: readString(row, ['type', 'accountType'], 'Account'),
    number: readString(row, ['number', 'accountNumber', 'last4'], ''),
    bank: readString(row, ['bank', 'institution'], 'Connected bank'),
    currency: readString(row, ['currency'], 'PHP'),
    balance: readNumber(row, ['balance', 'currentBalance', 'availableBalance'], 0),
    status: titleCase(readString(row, ['status'], 'Active')),
    color: readString(row, ['color'], colors[index % colors.length]),
  }
}

function toBudget(row: StoredRow, index: number): AccountingBudget {
  const total = readNumber(row, ['total', 'budget', 'amount'], 0)
  return {
    id: readString(row, ['id'], String(index)),
    name: readString(row, ['name', 'title'], 'Untitled budget'),
    project: readString(row, ['project', 'associated'], 'No project'),
    date: readString(row, ['date', 'createdAt'], ''),
    status: titleCase(readString(row, ['status'], 'Draft')),
    description: readString(row, ['description', 'notes'], ''),
    total,
    actual: readNumber(row, ['actual', 'spent', 'used'], 0),
    department: readString(row, ['department', 'owner'], 'Unassigned'),
    category: readString(row, ['category'], 'General'),
  }
}

function toAuditEvent(row: StoredRow, index: number): AccountingAuditEvent {
  const actor = readString(row, ['actorName', 'user', 'name'], 'System User')
  return {
    id: readString(row, ['id'], `AUD-${index + 1}`),
    dateTime: readString(row, ['createdAt', 'dateTime', 'date'], ''),
    user: actor,
    initials: actor.split(/\s+/).map(part => part[0]).join('').slice(0, 2).toUpperCase() || 'SU',
    role: readString(row, ['actorRole', 'role'], 'System'),
    action: titleCase(readString(row, ['action'], 'Updated').replaceAll('.', ' ')),
    module: readString(row, ['targetType', 'module'], 'Accounting'),
    details: readString(row, ['summary', 'details'], 'System activity recorded'),
    ipAddress: readString(row, ['ipAddress'], '-'),
    status: titleCase(readString(row, ['status'], 'Success')),
  }
}

function toTaxObligation(row: StoredRow, index: number): TaxObligation {
  const payable = readNumber(row, ['payable', 'amount', 'taxDue'], 0)
  return {
    id: readString(row, ['id'], String(index)),
    type: readString(row, ['type', 'name'], 'Tax obligation'),
    period: readString(row, ['period'], ''),
    dueDate: readString(row, ['dueDate', 'date'], ''),
    taxableAmount: readNumber(row, ['taxableAmount', 'baseAmount'], 0),
    payable,
    paid: readNumber(row, ['paid', 'paidAmount'], isPaidStatus(readString(row, ['status'], '')) ? payable : 0),
    status: titleCase(readString(row, ['status'], 'Pending')),
    color: readString(row, ['color'], colors[index % colors.length]),
  }
}

function buildTransactions(rawTransactions: StoredRow[], invoices: AccountingInvoice[], bills: AccountingBill[], expenses: StoredRow[], payrollRecords: StoredRow[]) {
  return [
    ...rawTransactions.map(storedToTransaction),
    ...invoices.map(invoiceToTransaction),
    ...bills.map(billToTransaction),
    ...expenses.map(expenseToTransaction),
    ...payrollRecords.map(payrollToTransaction).filter(Boolean) as AccountingTransaction[],
  ].filter(row => row.amount > 0).sort((a, b) => parseDate(b.date).getTime() - parseDate(a.date).getTime())
}

function invoiceToTransaction(invoice: AccountingInvoice): AccountingTransaction {
  return {
    id: `invoice-${invoice.id}`,
    date: invoice.issueDate,
    description: invoice.number,
    secondary: invoice.customer,
    account: 'Accounts Receivable',
    category: 'Invoice Income',
    type: 'Income',
    reference: invoice.number,
    inflow: invoice.paid,
    outflow: 0,
    amount: invoice.paid,
    balance: invoice.balanceDue,
    status: invoice.status,
  }
}

function billToTransaction(bill: AccountingBill): AccountingTransaction {
  return {
    id: `bill-${bill.id}`,
    date: bill.date,
    description: bill.name,
    secondary: bill.vendor,
    account: 'Accounts Payable',
    category: bill.category,
    type: 'Expense',
    reference: bill.id,
    inflow: 0,
    outflow: bill.paid,
    amount: bill.paid,
    balance: bill.balanceDue,
    status: bill.status,
  }
}

function expenseToTransaction(expense: StoredRow, index: number): AccountingTransaction {
  const amount = readNumber(expense, ['amount', 'total', 'cost'], 0)
  return {
    id: `expense-${readString(expense, ['id', 'reference'], String(index))}`,
    date: readString(expense, ['date', 'createdAt', 'expenseDate'], ''),
    description: readString(expense, ['description', 'name', 'merchant'], 'Expense'),
    secondary: readString(expense, ['merchant', 'vendor', 'employee'], 'Recorded expense'),
    account: readString(expense, ['account'], 'Expense account'),
    category: readString(expense, ['category', 'type'], 'Expenses'),
    type: 'Expense',
    reference: readString(expense, ['reference', 'id'], ''),
    inflow: 0,
    outflow: amount,
    amount,
    balance: 0,
    status: titleCase(readString(expense, ['status'], 'Recorded')),
  }
}

function payrollToTransaction(record: StoredRow, index: number): AccountingTransaction | null {
  const amount = readNumber(record, ['net', 'netPay', 'gross', 'grossPay', 'totalCost', 'totalPayrollCost'], 0)
  if (!amount) return null
  return {
    id: `payroll-${readString(record, ['id', 'payrollId', 'period'], String(index))}`,
    date: readString(record, ['paidAt', 'payDate', 'createdAt', 'periodEnd', 'date'], ''),
    description: readString(record, ['period', 'name'], 'Payroll release'),
    secondary: readString(record, ['employeeName', 'employee', 'department'], 'Payroll Finance'),
    account: 'Payroll',
    category: 'Payroll',
    type: 'Expense',
    reference: readString(record, ['id', 'period'], ''),
    inflow: 0,
    outflow: amount,
    amount,
    balance: 0,
    status: titleCase(readString(record, ['status'], 'Recorded')),
  }
}

function storedToTransaction(row: StoredRow, index: number): AccountingTransaction {
  const rawType = readString(row, ['type', 'transactionType'], 'Transfer').toLowerCase()
  const type = rawType.includes('income') || rawType.includes('inflow') || rawType.includes('credit') || rawType.includes('deposit')
    ? 'Income'
    : rawType.includes('expense') || rawType.includes('outflow') || rawType.includes('debit') || rawType.includes('withdrawal') || rawType.includes('payment')
      ? 'Expense'
      : 'Transfer'
  const inflow = readNumber(row, ['inflow', 'credit'], 0)
  const outflow = readNumber(row, ['outflow', 'debit'], 0)
  const amount = readNumber(row, ['amount', 'total'], type === 'Income' ? inflow : type === 'Expense' ? outflow : Math.max(inflow, outflow))
  return {
    id: `transaction-${readString(row, ['id', 'reference'], String(index))}`,
    date: readString(row, ['date', 'transactionDate', 'createdAt'], ''),
    description: readString(row, ['description', 'name', 'reference'], 'Transaction'),
    secondary: readString(row, ['account', 'customer', 'vendor', 'notes'], 'Accounting ledger'),
    account: readString(row, ['account'], 'Accounting ledger'),
    category: readString(row, ['category'], type),
    type,
    reference: readString(row, ['reference', 'id'], ''),
    inflow: type === 'Income' ? amount : inflow,
    outflow: type === 'Expense' ? amount : outflow,
    amount,
    balance: readNumber(row, ['balance'], 0),
    status: titleCase(readString(row, ['status'], 'Recorded')),
  }
}

function parseDate(value?: string) {
  const parsed = value ? new Date(value.includes('T') ? value : `${value}T00:00:00`) : new Date()
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed
}
