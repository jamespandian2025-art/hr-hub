'use client'

import { use, useEffect, useMemo, useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
import Link from 'next/link'
import { notFound, usePathname, useRouter, useSearchParams } from 'next/navigation'
import { ArrowDownLeft, ArrowUpRight, BookOpenCheck, Download, Plus, Search, X } from 'lucide-react'
import { accountingNavItems } from '@/components/accounting/AccountingShell'
import { createAccountingBill, createAccountingExpense, emptyAccountingData, formatDate, loadAccountingData, money, subscribeAccountingData } from '@/lib/accounting/data'

const font = 'var(--font-body)'

const supportedSections = new Set(['accounting', 'bills', 'expenses'])

export default function AccountingSectionPage({ params }: { params: Promise<{ section: string }> }) {
  const { section } = use(params)
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [data, setData] = useState(emptyAccountingData)
  const [query, setQuery] = useState('')
  const [showBillForm, setShowBillForm] = useState(false)
  const [showExpenseForm, setShowExpenseForm] = useState(false)
  const [billForm, setBillForm] = useState({
    name: '',
    vendor: '',
    amount: '',
    date: new Date().toISOString().slice(0, 10),
    category: 'General expense',
    status: 'Unpaid',
    notes: '',
  })
  const [expenseForm, setExpenseForm] = useState({
    description: '',
    merchant: '',
    amount: '',
    date: new Date().toISOString().slice(0, 10),
    category: 'Expenses',
    status: 'Recorded',
    notes: '',
  })
  const createRequested = searchParams.get('new') === '1'

  useEffect(() => {
    const load = () => setData(loadAccountingData())
    load()
    return subscribeAccountingData(load)
  }, [])

  if (!supportedSections.has(section)) notFound()

  // Exact match on the full route. `endsWith('/accounting')` also matches the
  // Overview item (href '/accounting'), which made the Accounting page borrow
  // Overview's title, description, and icon. Match the whole href instead.
  const navMeta = accountingNavItems.find(item => item.href === `/accounting/${section}`)
  if (!navMeta) notFound()

  const rows = useMemo(() => {
    if (section === 'bills') {
      return data.bills.map(bill => ({
        id: bill.id,
        date: formatDate(bill.date),
        title: bill.name,
        party: bill.vendor,
        category: bill.category,
        debit: bill.balanceDue,
        credit: 0,
        status: bill.status,
      }))
    }

    if (section === 'expenses') {
      return data.transactions.filter(row => row.type === 'Expense').map(row => ({
        id: row.id,
        date: formatDate(row.date),
        title: row.description,
        party: row.secondary,
        category: row.category,
        debit: row.amount,
        credit: 0,
        status: row.status,
      }))
    }

    return data.transactions.map(row => ({
      id: row.id,
      date: formatDate(row.date),
      title: row.description,
      party: row.secondary,
      category: row.category,
      debit: row.type === 'Expense' ? row.amount : 0,
      credit: row.type === 'Income' ? row.amount : 0,
      status: row.status,
    }))
  }, [data, section])

  const totalDebit = rows.reduce((sum, row) => sum + row.debit, 0)
  const totalCredit = rows.reduce((sum, row) => sum + row.credit, 0)
  const createHref = section === 'accounting' ? '/accounting/transactions' : `/accounting/${section}?new=1`
  const isBillFormOpen = section === 'bills' && (showBillForm || createRequested)
  const isExpenseFormOpen = section === 'expenses' && (showExpenseForm || createRequested)
  const closeBillForm = () => {
    setShowBillForm(false)
    if (createRequested) router.replace(pathname, { scroll: false })
  }
  const closeExpenseForm = () => {
    setShowExpenseForm(false)
    if (createRequested) router.replace(pathname, { scroll: false })
  }
  const updateBillField = (field: keyof typeof billForm, value: string) => setBillForm(prev => ({ ...prev, [field]: value }))
  const updateExpenseField = (field: keyof typeof expenseForm, value: string) => setExpenseForm(prev => ({ ...prev, [field]: value }))
  const submitBill = (event: FormEvent) => {
    event.preventDefault()
    createAccountingBill({
      name: billForm.name,
      vendor: billForm.vendor,
      amount: Number(billForm.amount || 0),
      date: billForm.date,
      category: billForm.category,
      status: billForm.status,
      notes: billForm.notes,
    })
    setData(loadAccountingData())
    setBillForm({
      name: '',
      vendor: '',
      amount: '',
      date: new Date().toISOString().slice(0, 10),
      category: 'General expense',
      status: 'Unpaid',
      notes: '',
    })
    closeBillForm()
  }
  const submitExpense = (event: FormEvent) => {
    event.preventDefault()
    createAccountingExpense({
      description: expenseForm.description,
      merchant: expenseForm.merchant,
      amount: Number(expenseForm.amount || 0),
      date: expenseForm.date,
      category: expenseForm.category,
      status: expenseForm.status,
      notes: expenseForm.notes,
    })
    setData(loadAccountingData())
    setExpenseForm({
      description: '',
      merchant: '',
      amount: '',
      date: new Date().toISOString().slice(0, 10),
      category: 'Expenses',
      status: 'Recorded',
      notes: '',
    })
    closeExpenseForm()
  }
  const filteredRows = rows.filter(row => {
    const term = query.trim().toLowerCase()
    if (!term) return true
    return `${row.date} ${row.title} ${row.party} ${row.category} ${row.status}`.toLowerCase().includes(term)
  })

  function safeCsvValue(value: unknown) {
  let text = String(value ?? '')
  text = text.replaceAll('"', '""')

  if (/^[=+\-@]/.test(text.trimStart())) {
    text = `'${text}`
  }

  return `"${text}"`
}
  const exportRows = () => {
    const headers = ['Date', 'Record', 'Party', 'Category', 'Debit', 'Credit', 'Status']
    const csv = [
      headers,
      ...filteredRows.map(row => [
        row.date,
        row.title,
        row.party || '',
        row.category || '',
        String(row.debit || ''),
        String(row.credit || ''),
        row.status,
      ]),
    ].map(values => values.map(value => safeCsvValue(value)).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${section}-register.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div
      className="live-accounting-page"
      style={{
        fontFamily: font,
        minHeight: 'calc(100dvh - 76px)',
      }}
    >
      <style>{css}</style>
      <header className="live-header">
        <div className="live-title">
          <div>
            <div className="crumb"><Link href="/accounting">Accounting</Link><span>/</span><strong>{navMeta.label}</strong></div>
            <h1>{navMeta.label}</h1>
            <p>{navMeta.description}</p>
          </div>
        </div>
        <div className="live-actions">
          <button type="button" onClick={exportRows}><Download size={15} /> Export</button>
          {section === 'bills' ? (
            <button type="button" className="primary" onClick={() => setShowBillForm(true)}><Plus size={15} /> New Record</button>
          ) : section === 'expenses' ? (
            <button type="button" className="primary" onClick={() => setShowExpenseForm(true)}><Plus size={15} /> New Record</button>
          ) : (
            <Link href={createHref} className="primary"><Plus size={15} /> New Record</Link>
          )}
        </div>
      </header>

      <section className="live-metrics">
        <Metric title="Records" value={String(rows.length)} detail={data.companyName} icon={<BookOpenCheck size={18} />} />
        <Metric title={section === 'accounting' ? 'Debits' : 'Open / Expense'} value={money(totalDebit, data.currency)} detail="From live records" icon={<ArrowDownLeft size={18} />} />
        <Metric title={section === 'accounting' ? 'Credits' : 'Income Offset'} value={money(totalCredit, data.currency)} detail="From live records" icon={<ArrowUpRight size={18} />} />
      </section>

      <section className="live-card">
        <div className="live-card-head">
          <div>
            <h2>{navMeta.label} Register</h2>
            <p>Connected invoices, bills, expenses, payroll, and ledger entries.</p>
          </div>
          <label><Search size={15} /><input value={query} onChange={event => setQuery(event.target.value)} placeholder={`Search ${navMeta.label.toLowerCase()}...`} /></label>
        </div>
        <div className="live-table-wrap">
          <table>
            <thead>
              <tr>{['Date', 'Record', 'Party', 'Category', 'Debit', 'Credit', 'Status'].map(column => <th key={column}>{column}</th>)}</tr>
            </thead>
            <tbody>
              {filteredRows.map(row => (
                <tr key={row.id}>
                  <td data-label="Date">{row.date}</td>
                  <td data-label="Record"><strong>{row.title}</strong></td>
                  <td data-label="Party">{row.party || '-'}</td>
                  <td data-label="Category">{row.category || '-'}</td>
                  <td data-label="Debit">{row.debit ? money(row.debit, data.currency) : '-'}</td>
                  <td data-label="Credit">{row.credit ? money(row.credit, data.currency) : '-'}</td>
                  <td data-label="Status"><span className={`live-pill status-${row.status.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`}>{row.status}</span></td>
                </tr>
              ))}
              {!filteredRows.length && (
                <tr>
                  <td colSpan={7} className="empty">{rows.length ? 'No records match your search.' : 'No records yet. Create invoices, bills, expenses, payroll, or ledger transactions and they will appear here.'}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {isBillFormOpen && (
        <div className="live-modal-backdrop" role="presentation" onMouseDown={event => {
          if (event.target === event.currentTarget) closeBillForm()
        }}>
          <form className="live-bill-sheet" onSubmit={submitBill} aria-label="Create bill record">
            <div className="live-sheet-head">
              <div>
                <h2>Create Bill</h2>
                <p>Add a vendor payable to the accounting register.</p>
              </div>
              <button type="button" aria-label="Close create bill form" onClick={closeBillForm}><X size={18} /></button>
            </div>

            <div className="live-form-grid">
              <label>
                <span>Bill name *</span>
                <input value={billForm.name} onChange={event => updateBillField('name', event.target.value)} placeholder="Vendor invoice, material bill..." required />
              </label>
              <label>
                <span>Vendor *</span>
                <input value={billForm.vendor} onChange={event => updateBillField('vendor', event.target.value)} placeholder="Supplier or vendor name" required />
              </label>
              <label>
                <span>Amount *</span>
                <input value={billForm.amount} onChange={event => updateBillField('amount', event.target.value)} inputMode="decimal" type="number" min="0" step="0.01" placeholder="0.00" required />
              </label>
              <label>
                <span>Bill date</span>
                <input value={billForm.date} onChange={event => updateBillField('date', event.target.value)} type="date" />
              </label>
              <label>
                <span>Category</span>
                <select value={billForm.category} onChange={event => updateBillField('category', event.target.value)}>
                  <option>General expense</option>
                  <option>Material cost</option>
                  <option>Labor cost</option>
                  <option>Equipment</option>
                  <option>Utilities</option>
                  <option>Professional services</option>
                </select>
              </label>
              <label>
                <span>Status</span>
                <select value={billForm.status} onChange={event => updateBillField('status', event.target.value)}>
                  <option>Unpaid</option>
                  <option>Paid</option>
                </select>
              </label>
              <label className="wide">
                <span>Notes</span>
                <textarea value={billForm.notes} onChange={event => updateBillField('notes', event.target.value)} placeholder="Optional bill notes" />
              </label>
            </div>

            <div className="live-sheet-actions">
              <button type="button" onClick={closeBillForm}>Cancel</button>
              <button type="submit" className="primary">Save Bill</button>
            </div>
          </form>
        </div>
      )}

      {isExpenseFormOpen && (
        <div className="live-modal-backdrop" role="presentation" onMouseDown={event => {
          if (event.target === event.currentTarget) closeExpenseForm()
        }}>
          <form className="live-bill-sheet" onSubmit={submitExpense} aria-label="Create expense record">
            <div className="live-sheet-head">
              <div>
                <h2>Create Expense</h2>
                <p>Record an expense directly into the accounting register.</p>
              </div>
              <button type="button" aria-label="Close create expense form" onClick={closeExpenseForm}><X size={18} /></button>
            </div>

            <div className="live-form-grid">
              <label>
                <span>Description *</span>
                <input value={expenseForm.description} onChange={event => updateExpenseField('description', event.target.value)} placeholder="Fuel, supplies, payroll adjustment..." required />
              </label>
              <label>
                <span>Merchant / Payee *</span>
                <input value={expenseForm.merchant} onChange={event => updateExpenseField('merchant', event.target.value)} placeholder="Vendor, employee, or merchant" required />
              </label>
              <label>
                <span>Amount *</span>
                <input value={expenseForm.amount} onChange={event => updateExpenseField('amount', event.target.value)} inputMode="decimal" type="number" min="0" step="0.01" placeholder="0.00" required />
              </label>
              <label>
                <span>Expense date</span>
                <input value={expenseForm.date} onChange={event => updateExpenseField('date', event.target.value)} type="date" />
              </label>
              <label>
                <span>Category</span>
                <select value={expenseForm.category} onChange={event => updateExpenseField('category', event.target.value)}>
                  <option>Expenses</option>
                  <option>Payroll</option>
                  <option>Materials</option>
                  <option>Travel</option>
                  <option>Utilities</option>
                  <option>Office supplies</option>
                  <option>Professional services</option>
                </select>
              </label>
              <label>
                <span>Status</span>
                <select value={expenseForm.status} onChange={event => updateExpenseField('status', event.target.value)}>
                  <option>Recorded</option>
                  <option>Paid</option>
                  <option>Pending</option>
                </select>
              </label>
              <label className="wide">
                <span>Notes</span>
                <textarea value={expenseForm.notes} onChange={event => updateExpenseField('notes', event.target.value)} placeholder="Optional expense notes" />
              </label>
            </div>

            <div className="live-sheet-actions">
              <button type="button" onClick={closeExpenseForm}>Cancel</button>
              <button type="submit" className="primary">Save Expense</button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}

function Metric({ title, value, detail, icon }: { title: string; value: string; detail: string; icon: ReactNode }) {
  return (
    <article className="live-card live-metric">
      <span>{icon}</span>
      <div><small>{title}</small><strong>{value}</strong><em>{detail}</em></div>
    </article>
  )
}

const css = `
.live-accounting-page{min-height:100vh;background:transparent;color:var(--acc-text,#0f172a);padding:28px}
html[data-theme='light'] .accounting-scroll-content > .live-accounting-page,
html[data-theme='light'] .live-accounting-page{background:transparent!important;background-color:transparent!important}
.live-header{display:flex;justify-content:space-between;gap:18px;margin-bottom:18px;background:transparent!important;background-color:transparent!important;border:0!important;box-shadow:none!important}
.live-title{display:block;min-width:0}
.crumb{display:flex;gap:8px;color:#64748b;font-size:12px;font-weight:850}.crumb a{color:#64748b;text-decoration:none}.crumb strong{color:#0f172a}
h1{margin:6px 0 0;font-size:28px;line-height:1.12}p{margin:7px 0 0;color:#64748b;font-size:13px}.live-actions{display:flex;gap:10px;align-items:center}
button,.live-actions a{border:1px solid #e8edf4;background:#fff;color:#0f172a;border-radius:8px;min-height:38px;padding:0 12px;font-size:12.5px;font-weight:850;display:inline-flex;align-items:center;gap:8px;text-decoration:none}.live-actions .primary{min-width:132px;justify-content:center;background:#16a34a!important;border-color:#16a34a!important;color:#fff!important;font-weight:950}
.live-metrics{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px;margin-bottom:16px}.live-card{background:#fff;border:1px solid #e8edf4;border-radius:8px;padding:18px;box-shadow:0 1px 2px rgba(15,23,42,.03)}
.live-metric{display:flex;gap:12px;align-items:center}.live-metric>span{width:38px;height:38px;border-radius:9px;background:#ecfdf3;color:#16a34a;display:grid;place-items:center}.live-metric small{display:block;color:#64748b;font-size:12px;font-weight:850}.live-metric strong{display:block;margin-top:5px;font-size:22px}.live-metric em{display:block;margin-top:5px;color:#16a34a;font-size:12px;font-style:normal;font-weight:850}
.live-card-head{display:flex;justify-content:space-between;gap:16px;margin-bottom:14px}.live-card-head h2{margin:0;font-size:16px}.live-card-head label{width:320px;height:38px;border:1px solid #e8edf4;border-radius:8px;background:#f8fafc;display:flex;align-items:center;gap:10px;padding:0 12px}.live-card-head input{border:0;outline:0;background:transparent;flex:1;font-size:12.5px}
.live-table-wrap{overflow:auto}table{width:100%;border-collapse:collapse;min-width:820px}th{text-align:left;padding:12px 14px;color:#64748b;font-size:11px;text-transform:uppercase}td{border-top:1px solid #eef2f7;padding:14px;color:#334155;font-size:13px}td strong{color:#0f172a}td span{display:inline-flex;border-radius:999px;background:#f1f5f9;color:#475569;padding:5px 9px;font-size:11px;font-weight:900}.empty{text-align:center;color:#64748b;font-weight:800;padding:28px}
.live-modal-backdrop{position:fixed;inset:0;z-index:1200;background:rgba(15,23,42,.36);display:flex;justify-content:flex-end}
.live-bill-sheet{width:min(520px,100%);height:100%;background:#fff;box-shadow:-24px 0 80px rgba(15,23,42,.22);display:flex;flex-direction:column;color:#0f172a}
.live-sheet-head{padding:22px 24px;border-bottom:1px solid #e8edf4;display:flex;align-items:flex-start;justify-content:space-between;gap:16px}.live-sheet-head h2{margin:0;font-size:22px}.live-sheet-head p{margin-top:6px}.live-sheet-head button{width:36px;height:36px;padding:0;display:grid;place-items:center;flex:0 0 auto}
.live-form-grid{padding:22px 24px;display:grid;grid-template-columns:1fr 1fr;gap:14px;overflow:auto;flex:1;align-items:start}.live-form-grid label{display:grid;gap:7px;min-width:0;align-content:start}.live-form-grid label.wide{grid-column:1/-1}.live-form-grid span{font-size:12px;font-weight:900;color:#334155}.live-form-grid input,.live-form-grid select,.live-form-grid textarea{width:100%;box-sizing:border-box;border:1px solid #dbe3ef;border-radius:8px;background:#fff;color:#0f172a;padding:0 12px;font:inherit;font-size:13px;outline:0}.live-form-grid input,.live-form-grid select{height:44px!important;min-height:44px!important;max-height:44px!important;line-height:44px}.live-form-grid textarea{min-height:96px;padding:11px 12px;resize:vertical;line-height:1.45}
.live-form-grid input:focus,.live-form-grid select:focus,.live-form-grid textarea:focus{border-color:#16a34a;box-shadow:0 0 0 3px rgba(22,163,74,.12)}
.live-sheet-actions{padding:14px 24px;border-top:1px solid #e8edf4;display:grid;grid-template-columns:1fr 1fr;gap:12px}.live-sheet-actions button{justify-content:center;min-height:44px}
.accounting-theme-dark .live-accounting-page,
html[data-theme='dark'] .live-accounting-page{min-height:calc(100dvh - 76px);background:#101010!important;background-color:#101010!important;color:#fafafa!important}
.accounting-theme-dark .live-accounting-page .live-card,
html[data-theme='dark'] .live-accounting-page .live-card,
.accounting-theme-dark .live-accounting-page .live-table-wrap,
html[data-theme='dark'] .live-accounting-page .live-table-wrap{background:#101010!important;background-color:#101010!important;border-color:#333!important;color:#fafafa!important;box-shadow:none!important}
.accounting-theme-dark .live-accounting-page th,
html[data-theme='dark'] .live-accounting-page th{background:#181818!important;color:#c7c7cf!important;border-color:#333!important}
.accounting-theme-dark .live-accounting-page td,
html[data-theme='dark'] .live-accounting-page td{background:#101010!important;color:#fafafa!important;border-color:#333!important}
@media(max-width:760px){.live-accounting-page{padding:0 18px 18px}.live-header,.live-card-head{display:grid}.live-header{gap:14px}.live-actions{position:sticky;top:0;z-index:45;order:-1;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;width:auto;margin:0 -18px 14px;padding:10px 18px;background:rgba(255,255,255,.96);border-bottom:1px solid #e8edf4;box-shadow:0 8px 18px rgba(15,23,42,.04);backdrop-filter:blur(12px)}.live-actions button,.live-actions a{min-width:0;min-height:40px;justify-content:center;padding:0 8px;border-radius:9px;font-size:12px;white-space:nowrap}.live-actions svg{width:14px;height:14px}.live-title{padding-top:0}.live-metrics{display:grid;grid-template-columns:1fr}.live-card-head label{width:auto;min-height:44px}.live-table-wrap{overflow:visible}table,thead,tbody,tr,td{display:block;width:100%;min-width:0}thead{display:none}tr{border:1px solid #eef2f7;border-radius:8px;margin-bottom:12px;background:#fff;overflow:hidden}td{border-top:0;display:grid;grid-template-columns:105px minmax(0,1fr);gap:10px;padding:10px 12px;align-items:center}td::before{content:attr(data-label);color:#64748b;font-size:11px;font-weight:900;text-transform:uppercase}.empty{display:block!important}.live-modal-backdrop{align-items:flex-end}.live-bill-sheet{height:min(92dvh,720px);border-radius:18px 18px 0 0}.live-form-grid{grid-template-columns:1fr;padding:18px}.live-sheet-head{padding:18px}.live-sheet-actions{padding:12px 18px}}
@media(max-width:360px){.live-actions{grid-template-columns:1fr 1fr}.live-actions .primary{grid-column:1/-1}}
`
