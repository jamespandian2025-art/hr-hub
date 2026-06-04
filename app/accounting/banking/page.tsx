'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ChangeEvent, FormEvent, useEffect, useMemo, useRef, useState } from 'react'
import {
  ArrowDownLeft,
  ArrowUpRight,
  ChevronDown,
  Clock3,
  CreditCard,
  Download,
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
import { AnalyticsToggleButton, CollapsibleAnalytics, useAnalyticsDisclosure } from '@/components/AnalyticsDisclosure'
import { createAccountingTransaction, emptyAccountingData, formatDate, loadAccountingData, monthlySeries, money, saveAccountingBankAccounts, subscribeAccountingData, updateAccountingTransactionStatus } from '@/lib/accounting/data'
import { canAccessBanking } from '@/lib/security/rbac'

const font = 'var(--font-body)'
const today = new Date().toISOString().slice(0, 10)

type BankingTab = 'Accounts' | 'Transactions' | 'Reconciliation' | 'Payments'
type BankingAction = 'add-account' | 'payment' | 'plaid' | 'transfer' | 'statement' | null

const bankingTabs: BankingTab[] = ['Accounts', 'Transactions', 'Reconciliation', 'Payments']

const initialAccountForm = {
  name: '',
  type: 'Checking',
  number: '',
  bank: '',
  balance: '',
  status: 'Active',
}

const initialPaymentForm = {
  date: today,
  description: '',
  account: '',
  amount: '',
  reference: '',
  category: 'Payment',
}

const initialTransferForm = {
  date: today,
  description: 'Bank transfer',
  fromAccount: '',
  toAccount: '',
  amount: '',
  reference: '',
}

function areaPath(points: number[][]) {
  if (!points.length) return ''
  const line = points.map(([x, y]) => `${x},${y}`).join(' L ')
  const last = points[points.length - 1]
  const first = points[0]
  return `M ${line} L ${last[0]},230 L ${first[0]},230 Z`
}

function StatusPill({ value }: { value: string }) {
  return <span className="banking-status-pill">{value}</span>
}

export default function BankingPage() {
  const router = useRouter()
  const [data, setData] = useState(emptyAccountingData)
  const [access, setAccess] = useState<'checking' | 'allowed' | 'denied'>('checking')
  const [activeTab, setActiveTab] = useState<BankingTab>('Accounts')
  const [search, setSearch] = useState('')
  const [accountFilter, setAccountFilter] = useState('All Accounts')
  const [typeFilter, setTypeFilter] = useState('All Types')
  const [statusFilter, setStatusFilter] = useState('All Status')
  const [modal, setModal] = useState<BankingAction>(null)
  const [notice, setNotice] = useState('')
  const [accountForm, setAccountForm] = useState(initialAccountForm)
  const [paymentForm, setPaymentForm] = useState(initialPaymentForm)
  const [transferForm, setTransferForm] = useState(initialTransferForm)
  const analytics = useAnalyticsDisclosure('wiseflow:analytics:accounting-banking')
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    try {
      const sessionRaw = window.localStorage.getItem('flowsys-auth-session')
      const accountRaw = window.localStorage.getItem('flowsys-account')
      if (!sessionRaw) {
        router.replace('/login?next=%2Faccounting%2Fbanking')
        return
      }
      const session = JSON.parse(sessionRaw) as { role?: string }
      const account = accountRaw ? JSON.parse(accountRaw) as { role?: string } : {}
      const nextAccess = canAccessBanking(session.role || account.role) ? 'allowed' : 'denied'
      const timer = window.setTimeout(() => setAccess(nextAccess), 0)
      return () => window.clearTimeout(timer)
    } catch {
      router.replace('/login?next=%2Faccounting%2Fbanking')
    }
  }, [router])

  useEffect(() => {
    if (access !== 'allowed') return
    const load = () => setData(loadAccountingData())
    load()
    return subscribeAccountingData(load)
  }, [access])

  const bankAccounts = data.bankAccounts
  const bankTransactions = data.transactions.map(transaction => ({
    id: transaction.id,
    date: formatDate(transaction.date),
    rawDate: transaction.date,
    description: transaction.description,
    detail: transaction.secondary,
    account: transaction.account,
    type: transaction.type === 'Income' ? 'Payment Received' as const : transaction.type === 'Expense' ? 'Expense' as const : 'Transfer' as const,
    reference: transaction.reference || transaction.id,
    inflow: transaction.inflow,
    outflow: transaction.outflow,
    balance: transaction.balance,
    status: ['Reconciled', 'Paid', 'Completed'].includes(transaction.status) ? 'Matched' as const : 'Pending' as const,
    category: transaction.category,
  }))
  const accountOptions = useMemo(() => Array.from(new Set([
    ...bankAccounts.map(account => account.name),
    ...bankTransactions.map(transaction => transaction.account),
  ].filter(Boolean))).sort(), [bankAccounts, bankTransactions])
  const visibleAccounts = useMemo(() => {
    const query = search.trim().toLowerCase()
    return bankAccounts.filter(account => {
      const accountMatches = accountFilter === 'All Accounts' || account.name === accountFilter || account.bank === accountFilter
      const statusMatches = statusFilter === 'All Status' || account.status === statusFilter
      const queryMatches = !query || [account.name, account.type, account.number, account.bank, account.status].join(' ').toLowerCase().includes(query)
      return accountMatches && statusMatches && queryMatches
    })
  }, [accountFilter, bankAccounts, search, statusFilter])
  const visibleTransactions = useMemo(() => {
    const query = search.trim().toLowerCase()
    return bankTransactions.filter(transaction => {
      const accountMatches = accountFilter === 'All Accounts' || transaction.account === accountFilter
      const typeMatches = typeFilter === 'All Types' || transaction.type === typeFilter
      const statusMatches = statusFilter === 'All Status' || transaction.status === statusFilter
      const tabMatches =
        activeTab === 'Accounts' ||
        activeTab === 'Transactions' ||
        (activeTab === 'Reconciliation' && transaction.status === 'Pending') ||
        (activeTab === 'Payments' && transaction.outflow > 0)
      const queryMatches = !query || [transaction.description, transaction.detail, transaction.account, transaction.reference, transaction.type, transaction.status, transaction.category].join(' ').toLowerCase().includes(query)
      return accountMatches && typeMatches && statusMatches && tabMatches && queryMatches
    })
  }, [accountFilter, activeTab, bankTransactions, search, statusFilter, typeFilter])
  const cashFlow = useMemo(() => monthlySeries(data.transactions).map(month => ({ day: month.label, inflow: month.revenue, outflow: month.expenses })), [data.transactions])
  const feeds = visibleAccounts.map(account => account.bank).filter(Boolean)
  const totalBalance = bankAccounts.reduce((sum, account) => sum + account.balance, 0)
  const visibleInflow = bankTransactions.reduce((sum, transaction) => sum + transaction.inflow, 0)
  const visibleOutflow = bankTransactions.reduce((sum, transaction) => sum + transaction.outflow, 0)
  const monthlyInflow = visibleInflow
  const monthlyOutflow = visibleOutflow
  const toReconcile = bankTransactions.filter(transaction => transaction.status === 'Pending').length
  const overduePayments = data.bills.filter(bill => bill.balanceDue > 0).length
  const metrics = [
    { title: 'Total Balance', value: money(totalBalance, data.currency), detail: `${bankAccounts.length} connected account${bankAccounts.length === 1 ? '' : 's'}`, icon: Landmark, tone: '#16a34a', up: totalBalance > 0 },
    { title: 'Inflow', value: money(monthlyInflow, data.currency), detail: `${bankTransactions.filter(row => row.inflow > 0).length} deposits`, icon: ArrowDownLeft, tone: '#2563eb', up: monthlyInflow > 0 },
    { title: 'Outflow', value: money(monthlyOutflow, data.currency), detail: `${bankTransactions.filter(row => row.outflow > 0).length} withdrawals`, icon: ArrowUpRight, tone: '#f97316', up: false },
    { title: 'To Reconcile', value: String(toReconcile), detail: money(bankTransactions.filter(row => row.status === 'Pending').reduce((sum, row) => sum + row.inflow + row.outflow, 0), data.currency), icon: ReceiptText, tone: '#7c3aed' },
    { title: 'Open Payments', value: String(overduePayments), detail: money(data.bills.reduce((sum, bill) => sum + bill.balanceDue, 0), data.currency), icon: Clock3, tone: '#ef4444' },
  ]
  const quickActions: Array<{ label: string; icon: LucideIcon; action: BankingAction }> = [
    { label: 'Make a Payment', icon: CreditCard, action: 'payment' },
    { label: 'Plaid Setup', icon: Settings, action: 'plaid' },
    { label: 'Transfer Records', icon: SlidersHorizontal, action: 'transfer' },
    { label: 'Upload Bank Statement', icon: Download, action: 'statement' },
  ]
  const tabCounts: Record<BankingTab, number> = {
    Accounts: bankAccounts.length,
    Transactions: bankTransactions.length,
    Reconciliation: toReconcile,
    Payments: bankTransactions.filter(transaction => transaction.outflow > 0).length,
  }
  const selectTab = (tab: BankingTab) => {
    setActiveTab(tab)
    setAccountFilter('All Accounts')
    setTypeFilter('All Types')
    setStatusFilter('All Status')
    setNotice('')
  }
  const resetFilters = () => {
    setSearch('')
    setAccountFilter('All Accounts')
    setTypeFilter('All Types')
    setStatusFilter('All Status')
  }
  const refreshData = (message?: string) => {
    setData(loadAccountingData())
    if (message) setNotice(message)
  }
  const openModal = (action: BankingAction) => {
    setNotice('')
    setModal(action)
    if (action === 'payment') setPaymentForm(previous => ({ ...previous, account: previous.account || accountOptions[0] || '' }))
    if (action === 'transfer') setTransferForm(previous => ({ ...previous, fromAccount: previous.fromAccount || accountOptions[0] || '', toAccount: previous.toAccount || accountOptions[1] || accountOptions[0] || '' }))
  }
  const submitAccount = (event: FormEvent) => {
    event.preventDefault()
    const balance = Number(accountForm.balance)
    const next = {
      id: `bank_${Date.now()}`,
      name: accountForm.name.trim(),
      type: accountForm.type,
      number: accountForm.number.trim().slice(-4),
      bank: accountForm.bank.trim(),
      currency: data.currency,
      balance: Number.isFinite(balance) ? balance : 0,
      status: accountForm.status,
      color: '#16a34a',
    }
    saveAccountingBankAccounts([next, ...bankAccounts])
    setAccountForm(initialAccountForm)
    setModal(null)
    refreshData('Bank account added.')
  }
  const submitPayment = (event: FormEvent) => {
    event.preventDefault()
    const amount = Math.max(Number(paymentForm.amount), 0)
    if (!amount) return
    createAccountingTransaction({
      date: paymentForm.date,
      description: paymentForm.description.trim() || 'Bank payment',
      account: paymentForm.account || accountOptions[0] || 'Bank account',
      category: paymentForm.category,
      type: 'Expense',
      reference: paymentForm.reference.trim() || `PAY-${Date.now()}`,
      amount,
      status: 'Reconciled',
    })
    setPaymentForm({ ...initialPaymentForm, account: paymentForm.account })
    setModal(null)
    setActiveTab('Payments')
    refreshData('Payment recorded.')
  }
  const submitTransfer = (event: FormEvent) => {
    event.preventDefault()
    const amount = Math.max(Number(transferForm.amount), 0)
    if (!amount) return
    createAccountingTransaction({
      date: transferForm.date,
      description: transferForm.description.trim() || 'Bank transfer',
      account: transferForm.fromAccount || 'Bank transfer',
      category: 'Transfer',
      type: 'Transfer',
      reference: transferForm.reference.trim() || `TRF-${Date.now()}`,
      amount,
      status: 'Reconciled',
      notes: `Transfer to ${transferForm.toAccount}`,
    })
    setTransferForm({ ...initialTransferForm, fromAccount: transferForm.fromAccount, toAccount: transferForm.toAccount })
    setModal(null)
    setActiveTab('Transactions')
    refreshData('Transfer recorded.')
  }
  const importStatement = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    const text = await file.text()
    const [, ...lines] = text.split(/\r?\n/).filter(Boolean)
    const imported = lines.map((line, index) => {
      const [dateValue, description, amountValue, typeValue, referenceValue, accountValue] = line.split(',').map(value => value?.trim().replace(/^"|"$/g, ''))
      const amount = Math.abs(Number((amountValue || '').replace(/[^0-9.-]+/g, ''))) || 0
      const isExpense = (typeValue || '').toLowerCase().includes('expense') || Number(amountValue) < 0
      return {
        date: dateValue || today,
        description: description || `Statement row ${index + 1}`,
        account: accountValue || accountOptions[0] || 'Imported statement',
        category: isExpense ? 'Statement Expense' : 'Statement Income',
        type: isExpense ? 'Expense' as const : 'Income' as const,
        reference: referenceValue || `STM-${Date.now()}-${index + 1}`,
        amount,
        status: 'Pending',
      }
    }).filter(row => row.amount > 0)
    imported.forEach(row => createAccountingTransaction(row))
    event.target.value = ''
    setModal(null)
    setActiveTab('Reconciliation')
    refreshData(imported.length ? `${imported.length} statement transaction${imported.length === 1 ? '' : 's'} imported.` : 'No valid statement rows found.')
  }
  const reconcileTransaction = (reference: string) => {
    updateAccountingTransactionStatus(reference, 'Reconciled')
    refreshData('Transaction reconciled.')
  }
  const exportTransactions = () => {
    const headers = ['Date', 'Description', 'Account', 'Type', 'Reference', 'Inflow', 'Outflow', 'Balance', 'Status']
    const csv = [headers, ...visibleTransactions.map(row => [row.rawDate, row.description, row.account, row.type, row.reference, row.inflow, row.outflow, row.balance, row.status])]
      .map(row => row.map(value => `"${String(value).replaceAll('"', '""')}"`).join(','))
      .join('\n')
    const url = window.URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
    const link = document.createElement('a')
    link.href = url
    link.download = `banking-transactions-${today}.csv`
    link.click()
    window.URL.revokeObjectURL(url)
  }

  if (access === 'checking') return null
  if (access === 'denied') return <BankingAccessDenied />

  return (
    <div
      className="banking-page"
      style={{
        fontFamily: font,
        minHeight: 'calc(100dvh - 76px)',
        background: '#101010',
        color: '#fafafa',
      }}
    >
      <style>{bankingCss}</style>
      <div className="banking-header">
        <div>
          <h1 className="banking-title">Banking</h1>
          <p className="banking-subtitle">Manage bank accounts, view transactions, and reconcile bank activity.</p>
        </div>
        <div className="banking-header-actions">
          <label className="banking-search">
            <Search size={16} color="#000000" />
            <input value={search} onChange={event => setSearch(event.target.value)} placeholder="Search accounts, transactions..." />
          </label>
          <AnalyticsToggleButton open={analytics.open} onToggle={analytics.toggle} panelId={analytics.panelId} className="banking-toolbar-button" />
          <button type="button" className="banking-primary-button" onClick={() => openModal('add-account')}><Plus size={15} /> Add Account <ChevronDown size={13} /></button>
        </div>
      </div>
      {notice && <div className="banking-notice" role="status">{notice}</div>}

      <CollapsibleAnalytics open={analytics.open} id={analytics.panelId}>
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
      </CollapsibleAnalytics>

      <nav className="banking-tabs" aria-label="Banking sections" role="tablist">
        {bankingTabs.map(tab => (
          <button key={tab} type="button" role="tab" className={activeTab === tab ? 'is-active' : undefined} aria-selected={activeTab === tab} onClick={() => selectTab(tab)}>
            {tab} <span>{tabCounts[tab]}</span>
          </button>
        ))}
      </nav>

      {(activeTab === 'Accounts' || activeTab === 'Reconciliation') && <section className="banking-grid">
        <div className="banking-card banking-accounts-panel">
          <div className="banking-panel-header">
            <h2>Bank Accounts</h2>
            <strong>Total Balance: <span>{money(totalBalance, data.currency)}</span></strong>
          </div>
          <div className="banking-table-wrap">
            <table className="banking-table banking-accounts-table">
              <thead>
                <tr>{['Account', 'Account Number', 'Bank', 'Currency', 'Balance', 'Status', 'Actions'].map(column => <th key={column}>{column}</th>)}</tr>
              </thead>
              <tbody>
                {visibleAccounts.map(account => (
                  <tr key={account.number}>
                    <td data-label="Account">
                      <span className="bank-logo" style={{ background: account.color }}>{account.bank.slice(0, 2).toUpperCase()}</span>
                      <span><strong>{account.name}</strong><small>{account.type}</small></span>
                    </td>
                    <td data-label="Account Number">.... {account.number}</td>
                    <td data-label="Bank">{account.bank}</td>
                    <td data-label="Currency">{data.currency}</td>
                    <td data-label="Balance">{money(account.balance, data.currency)}</td>
                    <td data-label="Status"><StatusPill value={account.status} /></td>
                    <td data-label="Actions"><button type="button" aria-label={`Filter transactions for ${account.name}`} onClick={() => { setAccountFilter(account.name); setActiveTab('Transactions') }} className="banking-icon-button"><MoreHorizontal size={15} /></button></td>
                  </tr>
                ))}
                {!visibleAccounts.length && <tr><td colSpan={7} className="banking-empty">No bank accounts match your filters.</td></tr>}
              </tbody>
            </table>
          </div>
          <button type="button" className="banking-add-link banking-link-button" onClick={() => openModal('add-account')}>+ Add Bank Account</button>
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
              {quickActions.map(({ label, icon: Icon, action }) => (
                <button key={label} type="button" onClick={() => openModal(action)}>
                  <span><Icon size={15} /></span>
                  {label}
                  <ChevronDown size={15} />
                </button>
              ))}
            </div>
            <input ref={fileInputRef} type="file" accept=".csv,text/csv" className="sr-only" onChange={importStatement} />
          </div>
        </div>
      </section>}

      {(activeTab === 'Transactions' || activeTab === 'Reconciliation' || activeTab === 'Payments' || activeTab === 'Accounts') && <section className="banking-grid banking-lower-grid">
        <div className="banking-card">
          <div className="banking-panel-header">
            <h2>{activeTab === 'Reconciliation' ? 'Transactions To Reconcile' : activeTab === 'Payments' ? 'Payment Records' : 'Recent Transactions'}</h2>
            <Link href="/accounting/transactions">View All Transactions</Link>
          </div>
          <div className="banking-filter-row">
            <SelectFilter label="Account" value={accountFilter} onChange={setAccountFilter} options={['All Accounts', ...accountOptions]} />
            <SelectFilter label="Type" value={typeFilter} onChange={setTypeFilter} options={['All Types', 'Payment Received', 'Expense', 'Transfer']} />
            <SelectFilter label="Status" value={statusFilter} onChange={setStatusFilter} options={['All Status', 'Matched', 'Pending']} />
            <button type="button" onClick={resetFilters}>Current records <ChevronDown size={14} /></button>
            <button type="button" onClick={exportTransactions}>Export <Download size={14} /></button>
          </div>
          <div className="banking-table-wrap">
            <table className="banking-table banking-transactions-table">
              <thead>
                <tr>{['Date', 'Description', 'Account', 'Type', 'Reference', 'Inflow', 'Outflow', 'Balance', 'Status'].map(column => <th key={column}>{column}</th>)}</tr>
              </thead>
              <tbody>
                {visibleTransactions.map(transaction => (
                  <tr key={transaction.id}>
                    <td data-label="Date">{transaction.date}</td>
                    <td data-label="Description"><strong>{transaction.description}</strong></td>
                    <td data-label="Account">{transaction.account}</td>
                    <td data-label="Type">{transaction.type}</td>
                    <td data-label="Reference">{transaction.reference}</td>
                    <td data-label="Inflow">{transaction.inflow ? money(transaction.inflow, data.currency) : '-'}</td>
                    <td data-label="Outflow">{transaction.outflow ? money(transaction.outflow, data.currency) : '-'}</td>
                    <td data-label="Balance">{money(transaction.balance, data.currency)}</td>
                    <td data-label="Status">
                      {transaction.status === 'Pending' ? <button type="button" className="banking-reconcile-button" onClick={() => reconcileTransaction(transaction.reference)}>Reconcile</button> : <StatusPill value={transaction.status} />}
                    </td>
                  </tr>
                ))}
                {!visibleTransactions.length && <tr><td colSpan={9} className="banking-empty">No transactions match the selected view.</td></tr>}
              </tbody>
            </table>
          </div>
          <strong className="banking-showing">Showing {visibleTransactions.length ? 1 : 0} to {visibleTransactions.length} of {bankTransactions.length} transactions</strong>
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
            {!feeds.length && <p className="banking-feed-empty">No connected bank feeds yet.</p>}
          </div>
          <button type="button" className="banking-add-link banking-link-button" onClick={() => openModal('plaid')}>View All Feeds</button>
        </div>
      </section>}

      {modal && (
        <div className="banking-modal-backdrop" role="dialog" aria-modal="true">
          <div className="banking-modal">
            <div className="banking-panel-header">
              <h2>{modalTitle(modal)}</h2>
              <button type="button" className="banking-icon-button" onClick={() => setModal(null)} aria-label="Close banking action">x</button>
            </div>
            {modal === 'add-account' && (
              <form className="banking-form" onSubmit={submitAccount}>
                <FormField label="Account name" value={accountForm.name} onChange={value => setAccountForm({ ...accountForm, name: value })} required />
                <FormField label="Bank" value={accountForm.bank} onChange={value => setAccountForm({ ...accountForm, bank: value })} required />
                <FormField label="Last 4 digits" value={accountForm.number} onChange={value => setAccountForm({ ...accountForm, number: value })} required />
                <FormField label="Opening balance" type="number" value={accountForm.balance} onChange={value => setAccountForm({ ...accountForm, balance: value })} required />
                <SelectFormField label="Type" value={accountForm.type} options={['Checking', 'Savings', 'Credit Card', 'Payroll', 'Cash']} onChange={value => setAccountForm({ ...accountForm, type: value })} />
                <SelectFormField label="Status" value={accountForm.status} options={['Active', 'Connected', 'Pending', 'Inactive']} onChange={value => setAccountForm({ ...accountForm, status: value })} />
                <button type="submit" className="banking-primary-button">Save Account</button>
              </form>
            )}
            {modal === 'payment' && (
              <form className="banking-form" onSubmit={submitPayment}>
                <FormField label="Date" type="date" value={paymentForm.date} onChange={value => setPaymentForm({ ...paymentForm, date: value })} required />
                <FormField label="Description" value={paymentForm.description} onChange={value => setPaymentForm({ ...paymentForm, description: value })} required />
                <SelectFormField label="Account" value={paymentForm.account} options={accountOptions.length ? accountOptions : ['Bank account']} onChange={value => setPaymentForm({ ...paymentForm, account: value })} />
                <FormField label="Amount" type="number" value={paymentForm.amount} onChange={value => setPaymentForm({ ...paymentForm, amount: value })} required />
                <FormField label="Reference" value={paymentForm.reference} onChange={value => setPaymentForm({ ...paymentForm, reference: value })} />
                <FormField label="Category" value={paymentForm.category} onChange={value => setPaymentForm({ ...paymentForm, category: value })} />
                <button type="submit" className="banking-primary-button">Record Payment</button>
              </form>
            )}
            {modal === 'transfer' && (
              <form className="banking-form" onSubmit={submitTransfer}>
                <FormField label="Date" type="date" value={transferForm.date} onChange={value => setTransferForm({ ...transferForm, date: value })} required />
                <FormField label="Description" value={transferForm.description} onChange={value => setTransferForm({ ...transferForm, description: value })} required />
                <SelectFormField label="From account" value={transferForm.fromAccount} options={accountOptions.length ? accountOptions : ['Bank account']} onChange={value => setTransferForm({ ...transferForm, fromAccount: value })} />
                <SelectFormField label="To account" value={transferForm.toAccount} options={accountOptions.length ? accountOptions : ['Bank account']} onChange={value => setTransferForm({ ...transferForm, toAccount: value })} />
                <FormField label="Amount" type="number" value={transferForm.amount} onChange={value => setTransferForm({ ...transferForm, amount: value })} required />
                <FormField label="Reference" value={transferForm.reference} onChange={value => setTransferForm({ ...transferForm, reference: value })} />
                <button type="submit" className="banking-primary-button">Record Transfer</button>
              </form>
            )}
            {modal === 'plaid' && (
              <div className="banking-modal-copy">
                <p>Bank feeds are connected from the same bank account records used across Accounting. Add or update accounts here, then feeds and balances refresh everywhere.</p>
                <button type="button" className="banking-primary-button" onClick={() => setModal('add-account')}>Connect Bank Account</button>
              </div>
            )}
            {modal === 'statement' && (
              <div className="banking-modal-copy">
                <p>Upload a CSV with columns: date, description, amount, type, reference, account. Imported rows are added as pending transactions for reconciliation.</p>
                <button type="button" className="banking-primary-button" onClick={() => fileInputRef.current?.click()}>Choose CSV</button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function BankingAccessDenied() {
  return (
    <div
      className="banking-page"
      style={{
        fontFamily: font,
        minHeight: 'calc(100dvh - 76px)',
        background: '#101010',
        color: '#fafafa',
      }}
    >
      <style>{bankingCss}</style>
      <div className="banking-card" style={{ maxWidth: 520 }}>
        <h1 className="banking-title">Access Denied</h1>
        <p className="banking-subtitle">Banking is restricted to Admin and Finance users.</p>
      </div>
    </div>
  )
}

function Legend({ color, label }: { color: string; label: string }) {
  return <span className="banking-legend-item"><span style={{ background: color }} />{label}</span>
}

function modalTitle(action: Exclude<BankingAction, null>) {
  const titles: Record<Exclude<BankingAction, null>, string> = {
    'add-account': 'Add Bank Account',
    payment: 'Make a Payment',
    plaid: 'Bank Feed Setup',
    transfer: 'Transfer Records',
    statement: 'Upload Bank Statement',
  }
  return titles[action]
}

function SelectFilter({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (value: string) => void }) {
  return (
    <label className="banking-select-filter">
      <span className="sr-only">{label}</span>
      <select value={value} onChange={event => onChange(event.target.value)}>
        {options.map(option => <option key={option} value={option}>{option}</option>)}
      </select>
      <ChevronDown size={14} />
    </label>
  )
}

function FormField({ label, value, onChange, type = 'text', required = false }: { label: string; value: string; onChange: (value: string) => void; type?: string; required?: boolean }) {
  return (
    <label className="banking-field">
      <span>{label}</span>
      <input type={type} value={value} required={required} onChange={event => onChange(event.target.value)} />
    </label>
  )
}

function SelectFormField({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (value: string) => void }) {
  return (
    <label className="banking-field">
      <span>{label}</span>
      <select value={value} onChange={event => onChange(event.target.value)}>
        {options.map(option => <option key={option} value={option}>{option}</option>)}
      </select>
    </label>
  )
}

const bankingCss = `
.banking-page { min-height: calc(100dvh - 76px); padding: 26px 28px 40px; background: #101010; color: #fafafa; }
.banking-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 18px; margin-bottom: 24px; }
.banking-title { margin: 0; font-size: 28px; line-height: 1.1; font-weight: 950; }
.banking-subtitle { margin: 8px 0 0; color: #334155; font-size: 13.5px; }
.banking-header-actions { display: flex; align-items: center; justify-content: flex-end; gap: 12px; flex-wrap: wrap; }
.banking-search { width: min(340px, 40vw); min-height: 40px; border-radius: 8px; background: #fff; display: flex; align-items: center; gap: 10px; padding: 0 13px; border: 1px solid #e8edf4; }
.banking-search input { flex: 1; min-width: 0; border: 0; outline: 0; background: transparent; font-size: 12.5px; color: #0f172a; }
.banking-toolbar-button, .banking-primary-button, .banking-filter-row button { min-height: 38px; border-radius: 8px; border: 1px solid #e8edf4; background: #fff; color: #0f172a; display: flex; align-items: center; gap: 8px; padding: 0 12px; font-size: 12.5px; font-weight: 850; cursor: pointer; }
.banking-primary-button { border-color: #16a34a; background: #16a34a; color: #fff; font-weight: 950; }
.banking-notice { border: 1px solid #bbf7d0; background: #f0fdf4; color: #15803d; border-radius: 8px; padding: 10px 12px; font-size: 12.5px; font-weight: 900; margin: -10px 0 18px; }
.banking-metrics { display: grid; grid-template-columns: repeat(5, minmax(170px, 1fr)); gap: 18px; margin-bottom: 18px; }
.banking-card { background: #fff; border: 1px solid #e8edf4; border-radius: 8px; padding: 18px; box-shadow: 0 1px 2px rgba(15, 23, 42, .03); }
.banking-metric-card { min-height: 100px; display: flex; align-items: center; }
.banking-metric-icon { width: 54px; height: 54px; border-radius: 9px; display: grid; place-items: center; margin-right: 16px; flex: 0 0 auto; }
.banking-card-label { display: block; color: #000000; font-size: 12px; font-weight: 850; }
.banking-card-value { display: block; color: #0f172a; font-size: 23px; margin-top: 8px; white-space: nowrap; }
.banking-card-detail { display: block; color: #334155; font-size: 11.5px; font-weight: 900; margin-top: 8px; }
.banking-tabs { display: flex; align-items: center; gap: 32px; border-bottom: 1px solid #e8edf4; padding-left: 14px; overflow-x: auto; }
.banking-tabs button { border: 0; border-bottom: 2px solid transparent; background: transparent; color: #0f172a; min-height: 48px; padding: 0; font-size: 12.5px; font-weight: 900; cursor: pointer; white-space: nowrap; display: inline-flex; align-items: center; gap: 7px; }
.banking-tabs button.is-active { color: #16a34a; border-bottom-color: #16a34a; }
.banking-tabs span { min-width: 21px; min-height: 21px; border-radius: 999px; background: #f1f5f9; color: #000000; display: grid; place-items: center; font-size: 11px; }
.banking-tabs button.is-active span { background: #dcfce7; color: #15803d; }
.banking-grid { display: grid; grid-template-columns: minmax(0, 1fr) 420px; gap: 16px; margin-top: 0; }
.banking-lower-grid { margin-top: 16px; }
.banking-side-stack { display: grid; gap: 16px; }
.banking-panel-header { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 16px; }
.banking-panel-header h2, .banking-card-heading { margin: 0; color: #0f172a; font-size: 16px; font-weight: 950; }
.banking-panel-header a, .banking-add-link { color: #2563eb; font-size: 12px; font-weight: 900; text-decoration: none; }
.banking-panel-header strong { font-size: 13px; }
.banking-panel-header strong span { color: #16a34a; }
.banking-panel-header small { display: flex; align-items: center; gap: 8px; color: #000000; font-size: 12px; }
.banking-table-wrap { overflow-x: auto; }
.banking-table { width: 100%; min-width: 780px; border-collapse: collapse; }
.banking-transactions-table { min-width: 920px; }
.banking-table th { text-align: left; padding: 12px 14px; color: #000000; font-size: 11px; font-weight: 900; }
.banking-table td { padding: 13px 14px; border-top: 1px solid #eef2f7; color: #0f172a; font-size: 13px; vertical-align: middle; }
.banking-table td:first-child { display: flex; align-items: center; gap: 12px; }
.banking-table td strong { display: block; color: #0f172a; }
.banking-table td small { display: block; color: #000000; margin-top: 3px; }
.bank-logo { width: 34px; height: 34px; border-radius: 8px; color: #fff; display: grid; place-items: center; font-size: 10px; font-weight: 950; flex: 0 0 auto; }
.banking-status-pill { display: inline-flex; min-height: 24px; align-items: center; border-radius: 7px; background: #dcfce7; color: #15803d; padding: 0 9px; font-size: 11.5px; font-weight: 900; }
.banking-icon-button { width: 32px; height: 32px; border: 1px solid #e8edf4; border-radius: 7px; background: #fff; color: #0f172a; display: grid; place-items: center; cursor: pointer; }
.banking-add-link { display: block; text-align: center; margin-top: 14px; color: #16a34a; }
.banking-link-button { width: 100%; border: 0; background: transparent; cursor: pointer; font: inherit; }
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
.banking-select-filter { min-height: 38px; border-radius: 8px; border: 1px solid #e8edf4; background: #fff; color: #0f172a; display: flex; align-items: center; gap: 8px; padding: 0 12px; font-size: 12.5px; font-weight: 850; }
.banking-select-filter select { appearance: none; border: 0; outline: 0; background: transparent; color: #0f172a; font: inherit; font-weight: 850; cursor: pointer; min-width: 120px; }
.banking-showing { display: block; color: #0f172a; font-size: 12.5px; margin-top: 16px; }
.banking-empty { padding: 26px !important; text-align: center; color: #000000 !important; font-weight: 850; display: table-cell !important; }
.banking-reconcile-button { min-height: 28px; border: 0; border-radius: 7px; background: #dcfce7; color: #15803d; padding: 0 10px; font-size: 11.5px; font-weight: 900; cursor: pointer; }
.banking-feeds { display: grid; gap: 18px; margin-top: 22px; }
.banking-feeds div { display: grid; grid-template-columns: 14px minmax(0, 1fr) auto; align-items: center; gap: 12px; font-size: 13px; }
.feed-dot { width: 9px; height: 9px; border-radius: 999px; }
.banking-feeds em { color: #16a34a; font-style: normal; font-size: 12px; font-weight: 900; }
.banking-feed-empty { margin: 0; color: #000000; font-size: 12.5px; font-weight: 850; }
.banking-modal-backdrop { position: fixed; inset: 0; z-index: 80; background: rgba(15, 23, 42, .36); display: grid; place-items: center; padding: 20px; }
.banking-modal { width: min(560px, 100%); max-height: min(760px, calc(100dvh - 40px)); overflow: auto; background: #fff; border-radius: 12px; border: 1px solid #e8edf4; box-shadow: 0 24px 80px rgba(15, 23, 42, .24); padding: 20px; }
.banking-form { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px; }
.banking-form .banking-primary-button { grid-column: 1 / -1; justify-content: center; min-height: 44px; }
.banking-field { display: grid; gap: 7px; color: #0f172a; font-size: 12px; font-weight: 900; }
.banking-field input, .banking-field select { min-height: 40px; border-radius: 8px; border: 1px solid #e8edf4; background: #fff; color: #0f172a; padding: 0 12px; font: inherit; outline: 0; }
.banking-field input:focus-visible, .banking-field select:focus-visible, .banking-select-filter select:focus-visible, .banking-search input:focus-visible { box-shadow: 0 0 0 3px rgba(22, 163, 74, .18); }
.banking-modal-copy { display: grid; gap: 16px; color: #334155; font-size: 13px; line-height: 1.55; }
.banking-modal-copy p { margin: 0; }
.sr-only { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; border: 0; }
.accounting-theme-dark .banking-page,
html[data-theme='dark'] .banking-page { background: #101010 !important; background-color: #101010 !important; color: #fafafa !important; }
.accounting-theme-dark .banking-page .banking-card,
html[data-theme='dark'] .banking-page .banking-card,
.accounting-theme-dark .banking-page .banking-table-wrap,
html[data-theme='dark'] .banking-page .banking-table-wrap { background: #101010 !important; background-color: #101010 !important; border-color: #333 !important; color: #fafafa !important; box-shadow: none !important; }
.accounting-theme-dark .banking-page .banking-table th,
html[data-theme='dark'] .banking-page .banking-table th { background: #181818 !important; color: #c7c7cf !important; border-color: #333 !important; }
.accounting-theme-dark .banking-page .banking-table td,
html[data-theme='dark'] .banking-page .banking-table td { background: #101010 !important; color: #fafafa !important; border-color: #333 !important; }
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
  .banking-table td::before { content: attr(data-label); color: #000000; font-size: 11px; font-weight: 900; text-transform: uppercase; }
  .bank-logo { display: none; }
  .banking-filter-row { display: grid; grid-template-columns: 1fr; }
  .banking-select-filter { width: 100%; justify-content: space-between; }
  .banking-form { grid-template-columns: 1fr; }
}
`
