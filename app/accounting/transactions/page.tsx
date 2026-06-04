'use client'

import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import {
  ArrowDownCircle,
  ArrowUpCircle,
  Banknote,
  ChevronDown,
  Download,
  Landmark,
  MoreHorizontal,
  Plus,
  Search,
  SlidersHorizontal,
  Trash2,
  X,
} from 'lucide-react'
import { AnalyticsToggleButton, CollapsibleAnalytics, useAnalyticsDisclosure } from '@/components/AnalyticsDisclosure'
import {
  createAccountingTransaction,
  deleteAccountingTransaction,
  emptyAccountingData,
  formatDate,
  loadAccountingData,
  money,
  refreshAccountingData,
  subscribeAccountingData,
  type AccountingTransactionSource,
  updateAccountingTransactionStatus,
} from '@/lib/accounting/data'

const font = 'var(--font-body)'

type TransactionType = 'Deposit' | 'Withdrawal' | 'Transfer'
type TransactionStatus = 'Reconciled' | 'Unreconciled'
type TransactionTab = 'All Transactions' | 'Unreconciled' | 'Deposits' | 'Withdrawals' | 'Transfers'
type PaginationItem = number | 'ellipsis'
type TransactionRowView = {
  id: string
  source: AccountingTransactionSource
  date: string
  description: string
  detail: string
  account: string
  accountDetail: string
  type: TransactionType
  reference: string
  inflow: number
  outflow: number
  balance: number
  status: TransactionStatus
  category: string
}
type TransactionMenuState = {
  transactionId: string
  top: number
  left: number
}

const PAGE_SIZE_OPTIONS = [5, 10, 25, 50, 100]
const reconciledStatuses = new Set(['Reconciled', 'Paid', 'Completed', 'Released', 'Processed', 'Posted', 'Settled', 'Cleared'])
const sourceLabels: Record<AccountingTransactionSource, string> = {
  manual: 'Manual',
  invoice: 'Invoice',
  bill: 'Bill',
  expense: 'Expense',
  payroll: 'Payroll',
}

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
    Transfer: { bg: '#f1f5f9', color: '#000000' },
    'Internet & Phone': { bg: '#f3e8ff', color: '#7c3aed' },
    'Other Income': { bg: '#dcfce7', color: '#15803d' },
    'Credit Card': { bg: '#fef3c7', color: '#d97706' },
  }
  return <span className="tx-pill" style={colors[value] || colors.Transfer}>{value}</span>
}

export default function TransactionsPage() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const createRequested = searchParams.get('new') === '1'
  const [data, setData] = useState(emptyAccountingData)
  const [activeTab, setActiveTab] = useState<TransactionTab>('All Transactions')
  const [headerSearch, setHeaderSearch] = useState('')
  const [tableSearch, setTableSearch] = useState('')
  const [accountFilter, setAccountFilter] = useState('All Accounts')
  const [typeFilter, setTypeFilter] = useState('All Types')
  const [statusFilter, setStatusFilter] = useState('All Status')
  const [categoryFilter, setCategoryFilter] = useState('All Categories')
  const [selectedRows, setSelectedRows] = useState<string[]>([])
  const [activeMenu, setActiveMenu] = useState<TransactionMenuState | null>(null)
  const [notice, setNotice] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const analytics = useAnalyticsDisclosure('wiseflow:analytics:accounting-transactions')
  const [form, setForm] = useState({
    date: new Date().toISOString().slice(0, 10),
    description: '',
    account: '',
    category: '',
    type: 'Expense' as 'Income' | 'Expense' | 'Transfer',
    reference: '',
    amount: '',
    status: 'Recorded',
    notes: '',
  })
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  useEffect(() => {
    let active = true
    const load = () => setData(loadAccountingData())
    load()
    void refreshAccountingData()
      .then(nextData => {
        if (active) setData(nextData)
      })
      .catch(() => undefined)
    const unsubscribe = subscribeAccountingData(load)
    return () => {
      active = false
      unsubscribe()
    }
  }, [])

  const transactions = useMemo<TransactionRowView[]>(() => data.transactions.map(transaction => ({
    id: transaction.id,
    source: transaction.source,
    date: formatDate(transaction.date),
    description: transaction.description,
    detail: transaction.source === 'manual' ? transaction.secondary : `${sourceLabels[transaction.source]} - ${transaction.secondary}`,
    account: transaction.account,
    accountDetail: transaction.reference || '-',
    type: transaction.type === 'Income' ? 'Deposit' as const : transaction.type === 'Expense' ? 'Withdrawal' as const : 'Transfer' as const,
    reference: transaction.reference || transaction.id,
    inflow: transaction.inflow,
    outflow: transaction.outflow,
    balance: transaction.balance,
    status: reconciledStatuses.has(transaction.status) ? 'Reconciled' as const : 'Unreconciled' as const,
    category: transaction.category,
  })), [data.transactions])
  const accounts = useMemo(() => Array.from(new Set(transactions.map(transaction => transaction.account).filter(Boolean))).sort(), [transactions])
  const categories = useMemo(() => Array.from(new Set(transactions.map(transaction => transaction.category).filter(Boolean))).sort(), [transactions])
  const visibleTransactions = useMemo(() => {
    const query = [headerSearch, tableSearch].join(' ').trim().toLowerCase()
    return transactions.filter(transaction => {
      const tabMatches =
        activeTab === 'All Transactions' ||
        (activeTab === 'Unreconciled' && transaction.status === 'Unreconciled') ||
        (activeTab === 'Deposits' && transaction.type === 'Deposit') ||
        (activeTab === 'Withdrawals' && transaction.type === 'Withdrawal') ||
        (activeTab === 'Transfers' && transaction.type === 'Transfer')
      const accountMatches = accountFilter === 'All Accounts' || transaction.account === accountFilter
      const typeMatches = typeFilter === 'All Types' || transaction.type === typeFilter
      const statusMatches = statusFilter === 'All Status' || transaction.status === statusFilter
      const categoryMatches = categoryFilter === 'All Categories' || transaction.category === categoryFilter
      const queryMatches = !query || [transaction.description, transaction.detail, transaction.account, transaction.reference, transaction.category, transaction.type, transaction.status].join(' ').toLowerCase().includes(query)
      return tabMatches && accountMatches && typeMatches && statusMatches && categoryMatches && queryMatches
    })
  }, [accountFilter, activeTab, categoryFilter, headerSearch, statusFilter, tableSearch, transactions, typeFilter])
  const filteredTotal = visibleTransactions.length
  const totalPages = Math.max(1, Math.ceil(filteredTotal / pageSize))
  const safeCurrentPage = Math.min(currentPage, totalPages)
  const pageStart = filteredTotal ? (safeCurrentPage - 1) * pageSize + 1 : 0
  const pageEnd = Math.min(safeCurrentPage * pageSize, filteredTotal)
  const paginatedTransactions = useMemo(() => {
    const start = (safeCurrentPage - 1) * pageSize
    return visibleTransactions.slice(start, start + pageSize)
  }, [pageSize, safeCurrentPage, visibleTransactions])
  const paginationItems = useMemo(() => getPaginationItems(safeCurrentPage, totalPages), [safeCurrentPage, totalPages])
  const allPageRowsSelected = paginatedTransactions.length > 0 && paginatedTransactions.every(transaction => selectedRows.includes(transaction.id))
  const totalTransactions = transactions.length
  const generatedTransactions = transactions.filter(transaction => transaction.source !== 'manual').length
  const manualTransactions = totalTransactions - generatedTransactions
  const accountCount = new Set(transactions.map(transaction => transaction.account).filter(Boolean)).size
  const totalInflow = transactions.reduce((sum, transaction) => sum + transaction.inflow, 0)
  const totalOutflow = transactions.reduce((sum, transaction) => sum + transaction.outflow, 0)
  const netCashFlow = totalInflow - totalOutflow
  const unreconciled = transactions.filter(transaction => transaction.status === 'Unreconciled').length
  const unreconciledValue = transactions
    .filter(transaction => transaction.status === 'Unreconciled')
    .reduce((sum, transaction) => sum + transaction.inflow + transaction.outflow, 0)
  const metrics = [
    { title: 'Total Transactions', value: String(totalTransactions), detail: `${generatedTransactions} generated / ${manualTransactions} manual`, icon: Landmark, tone: '#2563eb', up: totalTransactions > 0 },
    { title: 'Total Inflow', value: money(totalInflow, data.currency), detail: `${transactions.filter(row => row.inflow > 0).length} income records`, icon: ArrowDownCircle, tone: '#16a34a', up: totalInflow > 0 },
    { title: 'Total Outflow', value: money(totalOutflow, data.currency), detail: `${transactions.filter(row => row.outflow > 0).length} expense records`, icon: ArrowUpCircle, tone: '#ef4444', up: false },
    { title: 'Net Cash Flow', value: money(netCashFlow, data.currency), detail: 'Inflow minus outflow', icon: SlidersHorizontal, tone: '#7c3aed', up: netCashFlow >= 0 },
    { title: 'Unreconciled', value: String(unreconciled), detail: money(unreconciledValue, data.currency), icon: Banknote, tone: '#f59e0b' },
  ]
  const tabCounts: Record<TransactionTab, number> = {
    'All Transactions': transactions.length,
    Unreconciled: transactions.filter(transaction => transaction.status === 'Unreconciled').length,
    Deposits: transactions.filter(transaction => transaction.type === 'Deposit').length,
    Withdrawals: transactions.filter(transaction => transaction.type === 'Withdrawal').length,
    Transfers: transactions.filter(transaction => transaction.type === 'Transfer').length,
  }
  const toggleSelectAll = (event: ChangeEvent<HTMLInputElement>) => {
    const pageRowIds = paginatedTransactions.map(transaction => transaction.id)
    setSelectedRows(previous => {
      if (event.target.checked) return Array.from(new Set([...previous, ...pageRowIds]))
      return previous.filter(id => !pageRowIds.includes(id))
    })
  }
  const toggleSelectRow = (id: string) => {
    setSelectedRows(previous => previous.includes(id) ? previous.filter(item => item !== id) : [...previous, id])
  }
  const openCreate = () => {
    setShowCreate(true)
    setNotice('')
  }
  const closeCreate = () => {
    setShowCreate(false)
    if (createRequested) router.replace(pathname, { scroll: false })
  }
  const submitTransaction = (event: FormEvent) => {
    event.preventDefault()
    const amount = Number(form.amount || 0)
    if (!Number.isFinite(amount) || amount <= 0) {
      setNotice('Enter an amount greater than zero.')
      return
    }
    createAccountingTransaction({
      date: form.date,
      description: form.description,
      account: form.account || accounts[0] || 'Accounting ledger',
      category: form.category || form.type,
      type: form.type,
      reference: form.reference,
      amount,
      status: form.status,
      notes: form.notes,
    })
    setData(loadAccountingData())
    setForm({ date: new Date().toISOString().slice(0, 10), description: '', account: '', category: '', type: 'Expense', reference: '', amount: '', status: 'Recorded', notes: '' })
    closeCreate()
    setNotice('Transaction created.')
  }
  const reconcileRows = (ids: string[]) => {
    const manualIds = ids.filter(id => transactions.find(transaction => transaction.id === id)?.source === 'manual')
    manualIds.forEach(id => updateAccountingTransactionStatus(id, 'Reconciled'))
    setData(loadAccountingData())
    setSelectedRows(previous => previous.filter(id => !ids.includes(id)))
    setActiveMenu(null)
    setNotice(manualIds.length === ids.length
      ? `${ids.length} transaction${ids.length === 1 ? '' : 's'} reconciled.`
      : manualIds.length
        ? `${manualIds.length} manual transaction${manualIds.length === 1 ? '' : 's'} reconciled. Generated rows follow their source record.`
        : 'Generated transactions follow their source record.')
  }
  const removeTransaction = (id: string) => {
    const target = transactions.find(transaction => transaction.id === id)
    if (target?.source !== 'manual') {
      setNotice('Generated transactions follow their source record.')
      setActiveMenu(null)
      return
    }
    deleteAccountingTransaction(id)
    setData(loadAccountingData())
    setSelectedRows(previous => previous.filter(item => item !== id))
    setActiveMenu(null)
    setNotice('Transaction deleted.')
  }
  const exportCsv = () => {
    if (typeof window === 'undefined') return
    const headers = ['Date', 'Description', 'Account', 'Type', 'Reference', 'Inflow', 'Outflow', 'Balance', 'Status', 'Category']
    const rows = visibleTransactions.map(transaction => [
      transaction.date,
      transaction.description,
      transaction.account,
      transaction.type,
      transaction.reference,
      transaction.inflow,
      transaction.outflow,
      transaction.balance,
      transaction.status,
      transaction.category,
    ])
    const csv = [headers, ...rows].map(row => row.map(value => `"${String(value).replaceAll('"', '""')}"`).join(',')).join('\n')
    const url = window.URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
    const link = document.createElement('a')
    link.href = url
    link.download = `accounting-transactions-${new Date().toISOString().slice(0, 10)}.csv`
    link.click()
    window.URL.revokeObjectURL(url)
    setNotice(`${visibleTransactions.length} transaction${visibleTransactions.length === 1 ? '' : 's'} exported.`)
  }
  const exportTransaction = (transaction: TransactionRowView) => {
    if (typeof window === 'undefined') return
    const headers = ['Date', 'Description', 'Account', 'Type', 'Reference', 'Inflow', 'Outflow', 'Balance', 'Status', 'Category']
    const row = [transaction.date, transaction.description, transaction.account, transaction.type, transaction.reference, transaction.inflow, transaction.outflow, transaction.balance, transaction.status, transaction.category]
    const csv = [headers, row].map(values => values.map(value => `"${String(value).replaceAll('"', '""')}"`).join(',')).join('\n')
    const url = window.URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
    const link = document.createElement('a')
    link.href = url
    link.download = `${transaction.reference || transaction.id}.csv`
    link.click()
    window.URL.revokeObjectURL(url)
    setNotice(`${transaction.description} exported.`)
    setActiveMenu(null)
  }
  const focusTransaction = (transaction: TransactionRowView) => {
    setTableSearch(transaction.reference || transaction.description)
    setCurrentPage(1)
    setNotice(`${transaction.description} is selected in the register.`)
    setActiveMenu(null)
  }
  const filterAccount = (transaction: TransactionRowView) => {
    setAccountFilter(transaction.account)
    setCurrentPage(1)
    setNotice(`Showing ${transaction.account} transactions.`)
    setActiveMenu(null)
  }
  const toggleMenu = (transactionId: string, element: HTMLButtonElement) => {
    const rect = element.getBoundingClientRect()
    setActiveMenu(current => current?.transactionId === transactionId
      ? null
      : {
        transactionId,
        top: rect.bottom + 6,
        left: Math.max(12, Math.min(window.innerWidth - 188, rect.right - 172)),
      })
  }

  return (
    <div
      className="tx-page"
      style={{
        fontFamily: font,
        minHeight: 'calc(100dvh - 76px)',
        background: '#101010',
        color: '#fafafa',
      }}
    >
      <style>{transactionsCss}</style>
      <div className="tx-header">
        <div>
          <h1 className="tx-title">Transactions</h1>
          <p className="tx-subtitle">View and manage all bank transactions across your accounts.</p>
        </div>
        <div className="tx-header-actions">
          <label className="tx-search">
            <Search size={16} color="#000000" />
            <input value={headerSearch} onChange={event => { setHeaderSearch(event.target.value); setCurrentPage(1) }} placeholder="Search transactions, accounts, reference..." />
          </label>
          <AnalyticsToggleButton open={analytics.open} onToggle={analytics.toggle} panelId={analytics.panelId} className="tx-toolbar-button" />
          <button type="button" className="tx-primary-button" onClick={openCreate}><Plus size={14} /> New Transaction</button>
          <button type="button" className="tx-toolbar-button" onClick={exportCsv}>Export <Download size={14} /></button>
        </div>
      </div>

      <CollapsibleAnalytics open={analytics.open} id={analytics.panelId}>
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
      </CollapsibleAnalytics>

      <section className="tx-account-select">
        <strong>Accounts</strong>
        <label>
          <select value={accountFilter} onChange={event => { setAccountFilter(event.target.value); setCurrentPage(1) }} aria-label="Filter transactions by account">
            <option value="All Accounts">All Accounts ({accountCount})</option>
            {accounts.map(account => <option key={account} value={account}>{account}</option>)}
          </select>
          <ChevronDown size={15} />
        </label>
      </section>

      <nav className="tx-tabs" aria-label="Transaction filters">
        {(['All Transactions', 'Unreconciled', 'Deposits', 'Withdrawals', 'Transfers'] as TransactionTab[]).map(tab => (
          <button key={tab} type="button" className={activeTab === tab ? 'is-active' : undefined} onClick={() => { setActiveTab(tab); setCurrentPage(1) }}>
            {tab} <span>{tabCounts[tab]}</span>
          </button>
        ))}
      </nav>

      <section className="tx-table-card">
        <div className="tx-filterbar">
          <label className="tx-filter-search"><Search size={15} color="#000000" /><input value={tableSearch} onChange={event => { setTableSearch(event.target.value); setCurrentPage(1) }} placeholder="Search transactions..." /></label>
          <SelectButton label="Transaction type" value={typeFilter} onChange={value => { setTypeFilter(value); setCurrentPage(1) }} options={['All Types', 'Deposit', 'Withdrawal', 'Transfer']} />
          <SelectButton label="Transaction status" value={statusFilter} onChange={value => { setStatusFilter(value); setCurrentPage(1) }} options={['All Status', 'Reconciled', 'Unreconciled']} />
          <SelectButton label="Transaction account" value={accountFilter} onChange={value => { setAccountFilter(value); setCurrentPage(1) }} options={['All Accounts', ...accounts]} />
          <SelectButton label="Category" value={categoryFilter} onChange={value => { setCategoryFilter(value); setCurrentPage(1) }} options={['All Categories', ...categories]} />
          {selectedRows.length > 0 && <button type="button" onClick={() => reconcileRows(selectedRows)}>Reconcile {selectedRows.length}</button>}
        </div>
        {notice && <div className="tx-notice" role="status">{notice}</div>}

        <div className="tx-table-wrap">
          <table className="tx-table">
            <thead>
              <tr>
                <th><input type="checkbox" aria-label="Select transactions on this page" checked={allPageRowsSelected} onChange={toggleSelectAll} /></th>
                {['Date', 'Description', 'Account', 'Type', 'Reference', 'Inflow', 'Outflow', 'Balance', 'Status', 'Category', 'Actions'].map(column => <th key={column}>{column}</th>)}
              </tr>
            </thead>
            <tbody>
              {paginatedTransactions.map(transaction => (
                <tr key={transaction.id}>
                  <td data-label="Select"><input type="checkbox" checked={selectedRows.includes(transaction.id)} onChange={() => toggleSelectRow(transaction.id)} aria-label={`Select ${transaction.description}`} /></td>
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
                  <td data-label="Actions">
                    <div className="tx-row-actions">
                      <button type="button" aria-expanded={activeMenu?.transactionId === transaction.id} aria-label={`Actions for ${transaction.description}`} className="tx-icon-button" onClick={event => toggleMenu(transaction.id, event.currentTarget)}><MoreHorizontal size={15} /></button>
                      {activeMenu?.transactionId === transaction.id && (
                        <div className="tx-row-menu" role="menu" style={{ top: activeMenu.top, left: activeMenu.left }}>
                          <button type="button" role="menuitem" onClick={() => focusTransaction(transaction)}>View details</button>
                          <button type="button" role="menuitem" onClick={() => filterAccount(transaction)}>Filter account</button>
                          <button type="button" role="menuitem" onClick={() => reconcileRows([transaction.id])}>Mark reconciled</button>
                          <button type="button" role="menuitem" onClick={() => exportTransaction(transaction)}>Export row</button>
                          {transaction.source === 'manual' && <button type="button" role="menuitem" className="danger" onClick={() => removeTransaction(transaction.id)}><Trash2 size={13} /> Delete</button>}
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {!filteredTotal && (
                <tr>
                  <td colSpan={12} style={{ padding: 28, textAlign: 'center', color: '#000000', fontWeight: 800 }}>
                    {transactions.length ? 'No transactions match the selected filters.' : 'No transactions yet. Paid invoices, paid bills, expenses, payroll, and ledger imports will appear here.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="tx-pagination">
          <strong>Showing {pageStart} to {pageEnd} of {filteredTotal} transactions{filteredTotal !== totalTransactions ? ` (filtered from ${totalTransactions})` : ''}{selectedRows.length ? ` (${selectedRows.length} selected)` : ''}</strong>
          <div>
            <button type="button" disabled={safeCurrentPage === 1} onClick={() => setCurrentPage(page => Math.max(1, page - 1))} aria-label="Previous page">‹</button>
            {paginationItems.map((page, index) => page === 'ellipsis' ? (
              <span key={`ellipsis-${index}`} className="tx-ellipsis" aria-hidden="true">...</span>
            ) : (
              <button key={page} type="button" className={page === safeCurrentPage ? 'is-active' : undefined} onClick={() => setCurrentPage(page)} aria-current={page === safeCurrentPage ? 'page' : undefined}>{page}</button>
            ))}
            <button type="button" disabled={safeCurrentPage === totalPages} onClick={() => setCurrentPage(page => Math.min(totalPages, page + 1))} aria-label="Next page">›</button>
            <label className="tx-page-size">
              <span className="sr-only">Rows per page</span>
              <select value={pageSize} onChange={event => { setPageSize(Number(event.target.value)); setCurrentPage(1) }}>
                {PAGE_SIZE_OPTIONS.map(option => <option key={option} value={option}>{option} / page</option>)}
              </select>
              <ChevronDown size={14} />
            </label>
          </div>
        </div>
      </section>
      {(showCreate || createRequested) && (
        <div className="tx-modal-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) closeCreate() }}>
          <form className="tx-create-sheet" onSubmit={submitTransaction}>
            <div className="tx-create-head">
              <div>
                <h2>New Transaction</h2>
                <p>Add an income, expense, or transfer row to the accounting ledger.</p>
              </div>
              <button type="button" onClick={closeCreate} aria-label="Close transaction form"><X size={18} /></button>
            </div>
            <div className="tx-create-grid">
              <label><span>Date</span><input type="date" value={form.date} onChange={event => setForm(prev => ({ ...prev, date: event.target.value }))} required /></label>
              <label><span>Type</span><select value={form.type} onChange={event => setForm(prev => ({ ...prev, type: event.target.value as typeof form.type }))}><option>Income</option><option>Expense</option><option>Transfer</option></select></label>
              <label><span>Description</span><input value={form.description} onChange={event => setForm(prev => ({ ...prev, description: event.target.value }))} required /></label>
              <label><span>Account</span><input value={form.account} onChange={event => setForm(prev => ({ ...prev, account: event.target.value }))} placeholder={accounts[0] || 'Accounting ledger'} /></label>
              <label><span>Category</span><input value={form.category} onChange={event => setForm(prev => ({ ...prev, category: event.target.value }))} placeholder={form.type} /></label>
              <label><span>Reference</span><input value={form.reference} onChange={event => setForm(prev => ({ ...prev, reference: event.target.value }))} placeholder="Optional reference" /></label>
              <label><span>Amount</span><input type="number" min="0" step="0.01" value={form.amount} onChange={event => setForm(prev => ({ ...prev, amount: event.target.value }))} required /></label>
              <label><span>Status</span><select value={form.status} onChange={event => setForm(prev => ({ ...prev, status: event.target.value }))}><option>Recorded</option><option>Reconciled</option><option>Pending</option></select></label>
              <label className="wide"><span>Notes</span><textarea value={form.notes} onChange={event => setForm(prev => ({ ...prev, notes: event.target.value }))} /></label>
            </div>
            <div className="tx-create-actions">
              <button type="button" onClick={closeCreate}>Cancel</button>
              <button type="submit" className="tx-primary-button">Save Transaction</button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}

function getPaginationItems(currentPage: number, totalPages: number): PaginationItem[] {
  if (totalPages <= 7) return Array.from({ length: totalPages }, (_, index) => index + 1)

  const pages = new Set([1, totalPages, currentPage - 1, currentPage, currentPage + 1])
  if (currentPage <= 3) {
    pages.add(2)
    pages.add(3)
    pages.add(4)
  }
  if (currentPage >= totalPages - 2) {
    pages.add(totalPages - 1)
    pages.add(totalPages - 2)
    pages.add(totalPages - 3)
  }

  const sortedPages = Array.from(pages)
    .filter(page => page >= 1 && page <= totalPages)
    .sort((a, b) => a - b)

  return sortedPages.reduce<PaginationItem[]>((items, page, index) => {
    const previous = sortedPages[index - 1]
    if (previous && page - previous > 1) items.push('ellipsis')
    items.push(page)
    return items
  }, [])
}

function SelectButton({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (value: string) => void }) {
  return (
    <label className="tx-select-button">
      <span className="sr-only">{label}</span>
      <select value={value} onChange={event => onChange(event.target.value)}>
        {options.map(option => <option key={option} value={option}>{option}</option>)}
      </select>
      <ChevronDown size={14} />
    </label>
  )
}

const transactionsCss = `
.tx-page { min-height: calc(100dvh - 76px); padding: 26px 28px 40px; background: #101010; color: #fafafa; }
.tx-header { display: flex; justify-content: space-between; align-items: flex-start; gap: 18px; margin-bottom: 24px; }
.tx-title { margin: 0; font-size: 28px; line-height: 1.1; font-weight: 950; }
.tx-subtitle { margin: 8px 0 0; color: #334155; font-size: 13.5px; }
.tx-header-actions { display: flex; align-items: center; justify-content: flex-end; gap: 12px; flex-wrap: wrap; }
.tx-search, .tx-filter-search { min-height: 40px; border-radius: 8px; background: #fff; display: flex; align-items: center; gap: 10px; padding: 0 13px; border: 1px solid #e8edf4; }
.tx-search { width: min(360px, 38vw); }
.tx-search input, .tx-filter-search input { flex: 1; min-width: 0; border: 0; outline: 0; background: transparent; font-size: 12.5px; color: #0f172a; }
.tx-toolbar-button, .tx-primary-button, .tx-filterbar button, .tx-select-button { min-height: 40px; border-radius: 8px; border: 1px solid #e8edf4; background: #fff; color: #0f172a; display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 0 12px; font-size: 12.5px; font-weight: 850; cursor: pointer; white-space: nowrap; }
.tx-primary-button { background: #16a34a; border-color: #16a34a; color: #fff; justify-content: center; font-weight: 950; }
.tx-select-button select, .tx-account-select select { appearance: none; border: 0; outline: 0; background: transparent; color: #0f172a; font: inherit; font-weight: 850; width: 100%; cursor: pointer; }
.tx-metrics { display: grid; grid-template-columns: repeat(5, minmax(170px, 1fr)); gap: 18px; margin-bottom: 24px; }
.tx-card, .tx-account-select, .tx-table-card { background: #fff; border: 1px solid #e8edf4; border-radius: 8px; box-shadow: 0 1px 2px rgba(15, 23, 42, .03); }
.tx-card { min-height: 100px; padding: 18px; }
.tx-metric-card { display: flex; align-items: center; }
.tx-metric-icon { width: 54px; height: 54px; border-radius: 9px; display: grid; place-items: center; margin-right: 16px; flex: 0 0 auto; }
.tx-card-label { display: block; color: #000000; font-size: 12px; font-weight: 850; }
.tx-card-value { display: block; color: #0f172a; font-size: 23px; margin-top: 8px; white-space: nowrap; }
.tx-card-detail { display: block; font-size: 11.5px; font-weight: 900; margin-top: 8px; }
.tx-account-select { width: min(360px, 100%); min-height: 58px; display: grid; grid-template-columns: 82px minmax(0, 1fr); align-items: center; gap: 12px; padding: 10px 14px; margin-bottom: 24px; }
.tx-account-select strong { font-size: 13px; }
.tx-account-select label { min-height: 40px; border: 1px solid #e8edf4; border-radius: 8px; background: #fff; display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 0 14px; color: #0f172a; font-size: 13px; font-weight: 850; }
.tx-tabs { display: flex; gap: 30px; border-bottom: 1px solid #e8edf4; padding-left: 14px; overflow-x: auto; }
.tx-tabs button { border: 0; border-bottom: 2px solid transparent; background: transparent; color: #0f172a; min-height: 48px; padding: 0; font-size: 12.5px; font-weight: 900; cursor: pointer; white-space: nowrap; display: inline-flex; align-items: center; gap: 7px; }
.tx-tabs button.is-active { color: #16a34a; border-bottom-color: #16a34a; }
.tx-tabs span { min-width: 21px; min-height: 21px; border-radius: 999px; background: #f1f5f9; color: #000000; display: grid; place-items: center; font-size: 11px; }
.tx-tabs button.is-active span { background: #dcfce7; color: #15803d; }
.tx-table-card { border-top-left-radius: 0; border-top-right-radius: 0; padding: 18px; }
.tx-filterbar { display: grid; grid-template-columns: minmax(220px, 1fr) repeat(4, minmax(140px, auto)); gap: 14px; align-items: center; margin-bottom: 18px; }
.tx-notice { margin: -4px 0 14px; border: 1px solid #bbf7d0; border-radius: 8px; background: #f0fdf4; color: #15803d; padding: 10px 12px; font-size: 12.5px; font-weight: 900; }
.sr-only { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; border: 0; }
.tx-table-wrap { overflow-x: auto; border: 1px solid #eef2f7; border-radius: 8px; }
.tx-table { width: 100%; min-width: 1220px; border-collapse: collapse; }
.tx-table th { text-align: left; padding: 12px 14px; color: #000000; font-size: 11px; text-transform: uppercase; font-weight: 900; background: #f8fafc; }
.tx-table td { padding: 14px; font-size: 13px; color: #334155; vertical-align: middle; border-top: 1px solid #eef2f7; }
.tx-table td strong { display: block; color: #0f172a; }
.tx-table td small { display: block; color: #000000; margin-top: 3px; }
.tx-money-in { color: #16a34a !important; font-weight: 950; }
.tx-money-out { color: #ef4444 !important; font-weight: 950; }
.tx-pill, .tx-status { display: inline-flex; min-height: 24px; align-items: center; border-radius: 6px; padding: 0 9px; font-size: 11.5px; font-weight: 900; white-space: nowrap; }
.tx-status.is-good { background: #dcfce7; color: #15803d; }
.tx-status.is-warn { background: #fff7ed; color: #d97706; }
.tx-icon-button { width: 32px; height: 32px; border-radius: 7px; border: 1px solid #e8edf4; background: #fff; color: #0f172a; display: grid; place-items: center; cursor: pointer; }
.tx-row-actions { position: relative; display: inline-grid; place-items: center; }
.tx-row-menu { position: fixed; z-index: 1400; width: 172px; border: 1px solid #e8edf4; border-radius: 8px; background: #fff; box-shadow: 0 18px 44px rgba(15,23,42,.16); padding: 6px; display: grid; gap: 2px; }
.tx-row-menu button { min-height: 34px; border: 0; border-radius: 6px; background: transparent; color: #0f172a; padding: 0 10px; text-align: left; font-size: 12.5px; font-weight: 850; cursor: pointer; }
.tx-row-menu button:hover { background: #f1f5f9; }
.tx-row-menu button.danger { color: #dc2626; display: flex; align-items: center; gap: 8px; }
.tx-modal-backdrop { position: fixed; inset: 0; z-index: 1500; background: rgba(15,23,42,.36); display: flex; justify-content: flex-end; }
.tx-create-sheet { width: min(520px, 100%); height: 100%; background: #fff; box-shadow: -24px 0 80px rgba(15,23,42,.22); display: grid; grid-template-rows: auto 1fr auto; }
.tx-create-head { padding: 22px 24px; border-bottom: 1px solid #e8edf4; display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; }
.tx-create-head h2 { margin: 0; font-size: 22px; }
.tx-create-head p { margin: 6px 0 0; color: #000000; font-size: 13px; }
.tx-create-head button { width: 36px; height: 36px; border: 1px solid #e8edf4; border-radius: 8px; background: #fff; display: grid; place-items: center; cursor: pointer; }
.tx-create-grid { padding: 22px 24px; display: grid; grid-template-columns: 1fr 1fr; gap: 14px; overflow: auto; align-content: start; }
.tx-create-grid label { display: grid; gap: 7px; min-width: 0; }
.tx-create-grid label.wide { grid-column: 1 / -1; }
.tx-create-grid span { font-size: 12px; font-weight: 900; color: #334155; }
.tx-create-grid input, .tx-create-grid select, .tx-create-grid textarea { width: 100%; border: 1px solid #dbe3ef; border-radius: 8px; background: #fff; color: #0f172a; padding: 0 12px; font: inherit; font-size: 13px; outline: 0; }
.tx-create-grid input, .tx-create-grid select { height: 44px; }
.tx-create-grid textarea { min-height: 96px; padding: 11px 12px; resize: vertical; line-height: 1.45; }
.tx-create-actions { padding: 14px 24px; border-top: 1px solid #e8edf4; display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.tx-create-actions button { justify-content: center; }
.tx-pagination { display: flex; justify-content: space-between; align-items: center; gap: 16px; padding-top: 16px; }
.tx-pagination strong { font-size: 12.5px; }
.tx-pagination > div { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; justify-content: flex-end; }
.tx-pagination button { min-width: 34px; height: 32px; border-radius: 7px; border: 1px solid #e8edf4; background: #fff; color: #0f172a; font-weight: 900; cursor: pointer; }
.tx-pagination button.is-active { background: #16a34a; border-color: #16a34a; color: #fff; }
.tx-pagination button:disabled { opacity: .45; cursor: not-allowed; }
.tx-ellipsis { min-width: 22px; text-align: center; color: #000000; font-weight: 900; }
.tx-page-size { min-height: 32px; border-radius: 7px; border: 1px solid #e8edf4; background: #fff; color: #0f172a; display: flex; align-items: center; gap: 8px; padding: 0 10px; width: auto; }
.tx-page-size select { appearance: none; border: 0; outline: 0; background: transparent; color: #0f172a; font: inherit; font-weight: 900; cursor: pointer; }
.accounting-theme-dark .tx-page,
html[data-theme='dark'] .tx-page { background: #101010 !important; background-color: #101010 !important; color: #fafafa !important; }
.accounting-theme-dark .tx-page :is(.tx-card,.tx-account-select,.tx-table-card,.tx-table-wrap),
html[data-theme='dark'] .tx-page :is(.tx-card,.tx-account-select,.tx-table-card,.tx-table-wrap) { background: #101010 !important; background-color: #101010 !important; border-color: #333 !important; color: #fafafa !important; box-shadow: none !important; }
.accounting-theme-dark .tx-page .tx-table th,
html[data-theme='dark'] .tx-page .tx-table th { background: #181818 !important; color: #c7c7cf !important; border-color: #333 !important; }
.accounting-theme-dark .tx-page .tx-table td,
html[data-theme='dark'] .tx-page .tx-table td { background: #101010 !important; color: #fafafa !important; border-color: #333 !important; }
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
  .tx-table td::before { content: attr(data-label); color: #000000; font-size: 11px; font-weight: 900; text-transform: uppercase; }
  .tx-pagination > div { justify-content: flex-start; }
  .tx-create-sheet { height: min(92dvh, 720px); align-self: end; border-radius: 18px 18px 0 0; }
  .tx-create-grid { grid-template-columns: 1fr; padding: 18px; }
  .tx-create-head { padding: 18px; }
  .tx-create-actions { padding: 12px 18px; }
}
`
