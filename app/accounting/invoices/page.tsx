'use client'

import { FormEvent, useEffect, useMemo, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import {
  ArrowDownLeft,
  CheckCircle2,
  ChevronDown,
  Clock3,
  FileText,
  Filter,
  Mail,
  MoreHorizontal,
  Plus,
  ReceiptText,
  Search,
  Send,
  Trash2,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { getActiveCompany } from '@/lib/tenant/company'
import {
  type AccountingInvoice,
  emptyAccountingData,
  formatDate,
  isOverdue,
  loadAccountingData,
  money,
  subscribeAccountingData,
} from '@/lib/accounting/data'

const font = 'var(--font-body)'
const invoiceStorageKeys = ['flowsys-invoices', 'flowsys-accounting-invoices', 'wiseflow-accounting-invoices']
const tabs = ['All', 'Draft', 'Sent', 'Paid', 'Overdue']

type InvoiceForm = {
  customer: string
  email: string
  issueDate: string
  dueDate: string
  amount: string
  status: string
}

function todayInputValue() {
  return new Date().toISOString().slice(0, 10)
}

function normalizeStatus(value: string) {
  const status = value.trim() || 'Draft'
  return status.charAt(0).toUpperCase() + status.slice(1).toLowerCase()
}

function statusTone(value: string) {
  const status = value.toLowerCase()
  if (status === 'paid') return { bg: '#dcfce7', color: '#15803d' }
  if (status === 'overdue') return { bg: '#fee2e2', color: '#dc2626' }
  if (status === 'sent') return { bg: '#dbeafe', color: '#2563eb' }
  return { bg: '#f1f5f9', color: '#475569' }
}

function invoiceToStored(invoice: AccountingInvoice) {
  return {
    id: invoice.id,
    invoiceNo: invoice.number,
    recipient: invoice.customer,
    customer: invoice.customer,
    email: invoice.email,
    dateCreated: invoice.issueDate,
    issueDate: invoice.issueDate,
    dueDate: invoice.dueDate,
    total: invoice.amount,
    amount: invoice.amount,
    paid: invoice.paid,
    paidAmount: invoice.paid,
    balanceDue: invoice.balanceDue,
    status: invoice.status,
  }
}

function saveInvoices(invoices: AccountingInvoice[]) {
  if (typeof window === 'undefined') return
  const companyId = getActiveCompany()?.id
  const rows = invoices.map(invoiceToStored)
  const keys = invoiceStorageKeys.flatMap(key => companyId ? [`${key}:${companyId}`, key] : [key])
  keys.forEach(key => window.localStorage.setItem(key, JSON.stringify(rows)))
  window.dispatchEvent(new Event('wiseflow-accounting-refresh'))
}

function nextInvoiceNumber(invoices: AccountingInvoice[]) {
  const max = invoices.reduce((largest, invoice) => {
    const parsed = Number(invoice.number.replace(/[^0-9]/g, ''))
    return Number.isFinite(parsed) ? Math.max(largest, parsed) : largest
  }, invoices.length)
  return `INV-${String(max + 1).padStart(5, '0')}`
}

function StatusPill({ value }: { value: string }) {
  const tone = statusTone(value)
  return <span className="invoice-status-pill" style={{ background: tone.bg, color: tone.color }}>{value}</span>
}

export default function AccountingInvoicesPage() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const createRequested = searchParams.get('new') === '1'
  const [data, setData] = useState(emptyAccountingData)
  const [activeTab, setActiveTab] = useState('All')
  const [search, setSearch] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [selected, setSelected] = useState<string[]>([])
  const [form, setForm] = useState<InvoiceForm>({
    customer: '',
    email: '',
    issueDate: todayInputValue(),
    dueDate: '',
    amount: '',
    status: 'Draft',
  })

  useEffect(() => {
    const load = () => setData(loadAccountingData())
    load()
    return subscribeAccountingData(load)
  }, [])

  const invoices = data.invoices
  const createPanelOpen = showCreate || createRequested
  const filtered = useMemo(() => invoices.filter(invoice => {
    const normalizedStatus = invoice.balanceDue > 0 && isOverdue(invoice.dueDate) && invoice.status.toLowerCase() !== 'paid' ? 'Overdue' : invoice.status
    const tabMatches = activeTab === 'All' || normalizedStatus.toLowerCase() === activeTab.toLowerCase()
    const term = search.trim().toLowerCase()
    const searchMatches = !term || [invoice.number, invoice.customer, invoice.email, invoice.status].some(value => value.toLowerCase().includes(term))
    return tabMatches && searchMatches
  }), [activeTab, invoices, search])

  const totalAmount = invoices.reduce((sum, invoice) => sum + invoice.amount, 0)
  const paidAmount = invoices.reduce((sum, invoice) => sum + invoice.paid, 0)
  const balanceDue = invoices.reduce((sum, invoice) => sum + invoice.balanceDue, 0)
  const overdueAmount = invoices.filter(invoice => invoice.balanceDue > 0 && isOverdue(invoice.dueDate)).reduce((sum, invoice) => sum + invoice.balanceDue, 0)
  const collectionRate = totalAmount ? Math.round((paidAmount / totalAmount) * 100) : 0
  const statusSummary = tabs.slice(1).map(label => ({
    label,
    count: invoices.filter(invoice => {
      const normalizedStatus = invoice.balanceDue > 0 && isOverdue(invoice.dueDate) && invoice.status.toLowerCase() !== 'paid' ? 'Overdue' : invoice.status
      return normalizedStatus.toLowerCase() === label.toLowerCase()
    }).length,
  }))
  const metrics: Array<{ title: string; value: string; detail: string; icon: LucideIcon; tone: string; up?: boolean }> = [
    { title: 'Total Invoiced', value: money(totalAmount, data.currency), detail: `${invoices.length} invoice${invoices.length === 1 ? '' : 's'}`, icon: FileText, tone: '#2563eb', up: totalAmount > 0 },
    { title: 'Collected', value: money(paidAmount, data.currency), detail: `${collectionRate}% collection rate`, icon: CheckCircle2, tone: '#16a34a', up: paidAmount > 0 },
    { title: 'Outstanding', value: money(balanceDue, data.currency), detail: `${invoices.filter(invoice => invoice.balanceDue > 0).length} open invoice${invoices.filter(invoice => invoice.balanceDue > 0).length === 1 ? '' : 's'}`, icon: ReceiptText, tone: '#f97316' },
    { title: 'Overdue', value: money(overdueAmount, data.currency), detail: `${statusSummary.find(item => item.label === 'Overdue')?.count || 0} overdue`, icon: Clock3, tone: '#ef4444' },
    { title: 'Sent', value: String(statusSummary.find(item => item.label === 'Sent')?.count || 0), detail: 'Awaiting payment', icon: Send, tone: '#7c3aed' },
  ]

  const closeCreate = () => {
    setShowCreate(false)
    if (createRequested) router.replace(pathname)
  }

  const updateInvoices = (nextInvoices: AccountingInvoice[]) => {
    saveInvoices(nextInvoices)
    setData(loadAccountingData())
  }

  const createInvoice = (event: FormEvent) => {
    event.preventDefault()
    const amount = Number(form.amount)
    const status = normalizeStatus(form.status)
    const paid = status.toLowerCase() === 'paid' ? amount : 0
    const invoice: AccountingInvoice = {
      id: `invoice-${Date.now()}`,
      number: nextInvoiceNumber(invoices),
      customer: form.customer.trim() || 'No recipient',
      email: form.email.trim(),
      issueDate: form.issueDate || todayInputValue(),
      dueDate: form.dueDate,
      amount: Number.isFinite(amount) ? amount : 0,
      paid: Number.isFinite(paid) ? paid : 0,
      balanceDue: Number.isFinite(amount) ? Math.max(amount - paid, 0) : 0,
      status,
    }
    updateInvoices([...invoices, invoice])
    setForm({ customer: '', email: '', issueDate: todayInputValue(), dueDate: '', amount: '', status: 'Draft' })
    closeCreate()
  }

  const setInvoiceStatus = (id: string, status: string) => {
    const next = invoices.map(invoice => {
      if (invoice.id !== id) return invoice
      const paid = status === 'Paid' ? invoice.amount : invoice.paid
      return { ...invoice, status, paid, balanceDue: Math.max(invoice.amount - paid, 0) }
    })
    updateInvoices(next)
  }

  const deleteInvoice = (id: string) => {
    updateInvoices(invoices.filter(invoice => invoice.id !== id))
    setSelected(prev => prev.filter(item => item !== id))
  }

  const markSelectedPaid = () => {
    if (!selected.length) return
    updateInvoices(invoices.map(invoice => selected.includes(invoice.id) ? { ...invoice, status: 'Paid', paid: invoice.amount, balanceDue: 0 } : invoice))
    setSelected([])
  }

  const toggleSelected = (id: string) => setSelected(prev => prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id])

  return (
    <div className="invoices-page" style={{ fontFamily: font }}>
      <style>{invoicesCss}</style>
      <div className="invoices-header">
        <div>
          <h1 className="invoices-title">Invoices</h1>
          <p className="invoices-subtitle">Create client invoices, track collections, and keep receivables synced with accounting.</p>
        </div>
        <div className="invoices-header-actions">
          <label className="invoices-search">
            <Search size={16} color="#64748b" />
            <input value={search} onChange={event => setSearch(event.target.value)} placeholder="Search invoices, clients..." />
          </label>
          <button type="button" className="invoices-toolbar-button"><Filter size={15} /> Filters</button>
          <button type="button" className="invoices-primary-button" onClick={() => setShowCreate(true)}><Plus size={15} /> New Invoice <ChevronDown size={13} /></button>
        </div>
      </div>

      <section className="invoices-metrics">
        {metrics.map(metric => {
          const Icon = metric.icon
          return (
            <div key={metric.title} className="invoices-card invoices-metric-card">
              <span className="invoices-metric-icon" style={{ background: `${metric.tone}12`, color: metric.tone }}><Icon size={23} /></span>
              <span>
                <span className="invoices-card-label">{metric.title}</span>
                <strong className="invoices-card-value">{metric.value}</strong>
                <small className="invoices-card-detail" style={{ color: metric.up ? '#16a34a' : '#334155' }}>{metric.detail}</small>
              </span>
            </div>
          )
        })}
      </section>

      <nav className="invoices-tabs" aria-label="Invoice sections">
        {tabs.map(tab => (
          <button key={tab} type="button" className={activeTab === tab ? 'is-active' : undefined} onClick={() => setActiveTab(tab)}>
            {tab} <span>{tab === 'All' ? invoices.length : statusSummary.find(item => item.label === tab)?.count || 0}</span>
          </button>
        ))}
      </nav>

      {createPanelOpen && (
        <section className="invoices-card invoices-create-panel">
          <div className="invoices-panel-header">
            <h2>Create Invoice</h2>
            <button type="button" className="invoices-link-button" onClick={closeCreate}>Cancel</button>
          </div>
          <form className="invoices-form" onSubmit={createInvoice}>
            <label>
              <span>Customer</span>
              <input value={form.customer} onChange={event => setForm(prev => ({ ...prev, customer: event.target.value }))} placeholder="Client or company name" required />
            </label>
            <label>
              <span>Email</span>
              <input value={form.email} onChange={event => setForm(prev => ({ ...prev, email: event.target.value }))} type="email" placeholder="billing@client.com" />
            </label>
            <label>
              <span>Issue Date</span>
              <input value={form.issueDate} onChange={event => setForm(prev => ({ ...prev, issueDate: event.target.value }))} type="date" required />
            </label>
            <label>
              <span>Due Date</span>
              <input value={form.dueDate} onChange={event => setForm(prev => ({ ...prev, dueDate: event.target.value }))} type="date" />
            </label>
            <label>
              <span>Amount</span>
              <input value={form.amount} onChange={event => setForm(prev => ({ ...prev, amount: event.target.value }))} type="number" min="0" step="0.01" placeholder="0.00" required />
            </label>
            <label>
              <span>Status</span>
              <select value={form.status} onChange={event => setForm(prev => ({ ...prev, status: event.target.value }))}>
                <option>Draft</option>
                <option>Sent</option>
                <option>Paid</option>
              </select>
            </label>
            <div className="invoices-form-actions">
              <strong>Next number: {nextInvoiceNumber(invoices)}</strong>
              <button type="submit" className="invoices-primary-button"><Plus size={15} /> Create Invoice</button>
            </div>
          </form>
        </section>
      )}

      <section className="invoices-grid">
        <div className="invoices-card invoices-table-panel">
          <div className="invoices-panel-header">
            <h2>Invoice Register</h2>
            <div className="invoices-panel-actions">
              {selected.length > 0 && <button type="button" onClick={markSelectedPaid}>Mark {selected.length} Paid</button>}
              <strong>Showing {filtered.length} of {invoices.length}</strong>
            </div>
          </div>
          <div className="invoices-table-wrap">
            <table className="invoices-table">
              <thead>
                <tr>{['', 'Invoice', 'Customer', 'Issue Date', 'Due Date', 'Amount', 'Paid', 'Balance', 'Status', 'Actions'].map(column => <th key={column}>{column}</th>)}</tr>
              </thead>
              <tbody>
                {filtered.map(invoice => {
                  const derivedStatus = invoice.balanceDue > 0 && isOverdue(invoice.dueDate) && invoice.status.toLowerCase() !== 'paid' ? 'Overdue' : invoice.status
                  return (
                    <tr key={invoice.id}>
                      <td data-label="Select"><input type="checkbox" checked={selected.includes(invoice.id)} onChange={() => toggleSelected(invoice.id)} aria-label={`Select ${invoice.number}`} /></td>
                      <td data-label="Invoice"><strong>{invoice.number}</strong><small>{invoice.email || 'No billing email'}</small></td>
                      <td data-label="Customer">{invoice.customer}</td>
                      <td data-label="Issue Date">{formatDate(invoice.issueDate)}</td>
                      <td data-label="Due Date">{formatDate(invoice.dueDate)}</td>
                      <td data-label="Amount">{money(invoice.amount, data.currency)}</td>
                      <td data-label="Paid">{money(invoice.paid, data.currency)}</td>
                      <td data-label="Balance">{money(invoice.balanceDue, data.currency)}</td>
                      <td data-label="Status"><StatusPill value={derivedStatus} /></td>
                      <td data-label="Actions">
                        <div className="invoices-row-actions">
                          <button type="button" aria-label={`Mark ${invoice.number} as sent`} onClick={() => setInvoiceStatus(invoice.id, 'Sent')}><Mail size={15} /></button>
                          <button type="button" aria-label={`Mark ${invoice.number} as paid`} onClick={() => setInvoiceStatus(invoice.id, 'Paid')}><CheckCircle2 size={15} /></button>
                          <button type="button" aria-label={`Delete ${invoice.number}`} onClick={() => deleteInvoice(invoice.id)}><Trash2 size={15} /></button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={10} className="invoices-empty">No invoices match this view. Create an invoice and it will flow into accounting receivables and transactions.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="invoices-side-stack">
          <div className="invoices-card">
            <div className="invoices-panel-header">
              <h2>Status Summary</h2>
              <MoreHorizontal size={16} color="#64748b" />
            </div>
            <div className="invoices-status-list">
              {statusSummary.map(item => (
                <div key={item.label}>
                  <span><StatusPill value={item.label} /></span>
                  <strong>{item.count}</strong>
                </div>
              ))}
            </div>
          </div>

          <div className="invoices-card">
            <h2 className="invoices-card-heading">Quick Actions</h2>
            <div className="invoices-actions">
              <button type="button" onClick={() => setShowCreate(true)}><span><Plus size={15} /></span>New Invoice<ChevronDown size={15} /></button>
              <button type="button" onClick={() => setActiveTab('Overdue')}><span><Clock3 size={15} /></span>Review Overdue<ChevronDown size={15} /></button>
              <button type="button" onClick={markSelectedPaid}><span><CheckCircle2 size={15} /></span>Mark Paid<ChevronDown size={15} /></button>
              <button type="button" onClick={() => setActiveTab('Sent')}><span><ArrowDownLeft size={15} /></span>Collections<ChevronDown size={15} /></button>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}

const invoicesCss = `
.invoices-page { padding: 26px 28px 40px; color: #0f172a; }
.invoices-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 18px; margin-bottom: 24px; }
.invoices-title { margin: 0; font-size: 28px; line-height: 1.1; font-weight: 950; }
.invoices-subtitle { margin: 8px 0 0; color: #334155; font-size: 13.5px; }
.invoices-header-actions { display: flex; align-items: center; justify-content: flex-end; gap: 12px; flex-wrap: wrap; }
.invoices-search { width: min(340px, 40vw); min-height: 40px; border-radius: 8px; background: #fff; display: flex; align-items: center; gap: 10px; padding: 0 13px; border: 1px solid #e8edf4; }
.invoices-search input { flex: 1; min-width: 0; border: 0; outline: 0; background: transparent; font-size: 12.5px; color: #0f172a; }
.invoices-toolbar-button, .invoices-primary-button { min-height: 38px; border-radius: 8px; border: 1px solid #e8edf4; background: #fff; color: #0f172a; display: flex; align-items: center; gap: 8px; padding: 0 12px; font-size: 12.5px; font-weight: 850; cursor: pointer; }
.invoices-primary-button { border-color: #16a34a; background: #16a34a; color: #fff; font-weight: 950; }
.invoices-metrics { display: grid; grid-template-columns: repeat(5, minmax(170px, 1fr)); gap: 18px; margin-bottom: 18px; }
.invoices-card { background: #fff; border: 1px solid #e8edf4; border-radius: 8px; padding: 18px; box-shadow: 0 1px 2px rgba(15, 23, 42, .03); }
.invoices-metric-card { min-height: 100px; display: flex; align-items: center; }
.invoices-metric-icon { width: 54px; height: 54px; border-radius: 9px; display: grid; place-items: center; margin-right: 16px; flex: 0 0 auto; }
.invoices-card-label { display: block; color: #475569; font-size: 12px; font-weight: 850; }
.invoices-card-value { display: block; color: #0f172a; font-size: 23px; margin-top: 8px; white-space: nowrap; }
.invoices-card-detail { display: block; color: #334155; font-size: 11.5px; font-weight: 900; margin-top: 8px; }
.invoices-tabs { display: flex; align-items: center; gap: 32px; border-bottom: 1px solid #e8edf4; padding-left: 14px; overflow-x: auto; }
.invoices-tabs button { border: 0; border-bottom: 2px solid transparent; background: transparent; color: #0f172a; min-height: 48px; padding: 0; font-size: 12.5px; font-weight: 900; cursor: pointer; white-space: nowrap; display: inline-flex; align-items: center; gap: 8px; }
.invoices-tabs button.is-active { color: #16a34a; border-bottom-color: #16a34a; }
.invoices-tabs span { min-width: 22px; min-height: 22px; border-radius: 999px; background: #f1f5f9; color: #475569; display: grid; place-items: center; font-size: 11px; }
.invoices-tabs button.is-active span { background: #dcfce7; color: #15803d; }
.invoices-grid { display: grid; grid-template-columns: minmax(0, 1fr) 360px; gap: 16px; margin-top: 18px; }
.invoices-side-stack { display: grid; align-content: start; gap: 16px; }
.invoices-panel-header { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 16px; }
.invoices-panel-header h2, .invoices-card-heading { margin: 0; color: #0f172a; font-size: 16px; font-weight: 950; }
.invoices-panel-actions { display: flex; align-items: center; flex-wrap: wrap; justify-content: flex-end; gap: 10px; }
.invoices-panel-actions strong { color: #475569; font-size: 12px; }
.invoices-panel-actions button, .invoices-link-button { min-height: 32px; border: 1px solid #e8edf4; border-radius: 7px; background: #fff; color: #0f172a; padding: 0 10px; font-size: 12px; font-weight: 900; cursor: pointer; }
.invoices-table-wrap { overflow-x: auto; }
.invoices-table { width: 100%; min-width: 980px; border-collapse: collapse; }
.invoices-table th { text-align: left; padding: 12px 14px; color: #64748b; font-size: 11px; font-weight: 900; }
.invoices-table td { padding: 13px 14px; border-top: 1px solid #eef2f7; color: #0f172a; font-size: 13px; vertical-align: middle; }
.invoices-table td strong { display: block; color: #0f172a; }
.invoices-table td small { display: block; color: #64748b; margin-top: 3px; }
.invoice-status-pill { display: inline-flex; min-height: 24px; align-items: center; border-radius: 7px; padding: 0 9px; font-size: 11.5px; font-weight: 900; }
.invoices-row-actions { display: flex; align-items: center; gap: 6px; }
.invoices-row-actions button { width: 32px; height: 32px; border: 1px solid #e8edf4; border-radius: 7px; background: #fff; color: #0f172a; display: grid; place-items: center; cursor: pointer; }
.invoices-empty { text-align: center; color: #64748b !important; padding: 34px !important; font-weight: 800; }
.invoices-create-panel { margin-top: 18px; }
.invoices-form { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 14px; }
.invoices-form label { display: grid; gap: 7px; }
.invoices-form span { color: #475569; font-size: 12px; font-weight: 900; }
.invoices-form input, .invoices-form select { min-height: 40px; border: 1px solid #e8edf4; border-radius: 8px; padding: 0 12px; color: #0f172a; background: #fff; outline: 0; font-size: 13px; }
.invoices-form-actions { grid-column: 1 / -1; display: flex; justify-content: space-between; align-items: center; gap: 12px; border-top: 1px solid #eef2f7; padding-top: 14px; }
.invoices-form-actions strong { color: #475569; font-size: 12px; }
.invoices-status-list { display: grid; gap: 14px; }
.invoices-status-list div { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.invoices-status-list strong { color: #0f172a; font-size: 18px; }
.invoices-actions { display: grid; grid-template-columns: 1fr; gap: 12px; margin-top: 18px; }
.invoices-actions button { border: 0; background: #fff; color: #0f172a; display: grid; grid-template-columns: 28px minmax(0, 1fr) 16px; align-items: center; gap: 10px; min-height: 38px; font-size: 12.5px; font-weight: 900; cursor: pointer; text-align: left; }
.invoices-actions button span { width: 28px; height: 28px; border-radius: 7px; background: #eff6ff; color: #2563eb; display: grid; place-items: center; }
@media (max-width: 1280px) {
  .invoices-page { padding: 22px; }
  .invoices-header { flex-direction: column; }
  .invoices-header-actions, .invoices-search { width: 100%; }
  .invoices-metrics { grid-template-columns: repeat(3, minmax(180px, 1fr)); }
  .invoices-grid { grid-template-columns: 1fr; }
  .invoices-side-stack { grid-template-columns: 1fr 1fr; }
}
@media (max-width: 820px) {
  .invoices-metrics, .invoices-side-stack, .invoices-form { grid-template-columns: 1fr 1fr; }
  .invoices-panel-header { align-items: flex-start; flex-direction: column; }
}
@media (max-width: 640px) {
  .invoices-page { padding: 16px; }
  .invoices-title { font-size: 24px; }
  .invoices-header-actions, .invoices-metrics, .invoices-side-stack, .invoices-form { display: grid; grid-template-columns: 1fr; }
  .invoices-card-value { font-size: 21px; }
  .invoices-tabs { margin-left: -16px; margin-right: -16px; padding-left: 16px; padding-right: 16px; }
  .invoices-form-actions { align-items: stretch; flex-direction: column; }
  .invoices-table-wrap { overflow: visible; }
  .invoices-table, .invoices-table thead, .invoices-table tbody, .invoices-table tr, .invoices-table td { display: block; width: 100%; min-width: 0; }
  .invoices-table thead { display: none; }
  .invoices-table tr { border: 1px solid #eef2f7; border-radius: 8px; margin-bottom: 12px; background: #fff; overflow: hidden; }
  .invoices-table td { border-top: 0; display: grid; grid-template-columns: 112px minmax(0, 1fr); gap: 10px; padding: 10px 12px; font-size: 12.5px; align-items: center; }
  .invoices-table td::before { content: attr(data-label); color: #64748b; font-size: 11px; font-weight: 900; text-transform: uppercase; }
  .invoices-row-actions { justify-content: flex-start; }
}
`
