'use client'

import { FormEvent, useEffect, useMemo, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import {
  ArrowDownLeft,
  CheckCircle2,
  ChevronDown,
  Clock3,
  Download,
  FileText,
  Mail,
  MoreHorizontal,
  Plus,
  ReceiptText,
  Search,
  Send,
  Trash2,
  Upload,
  X,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { AnalyticsToggleButton, CollapsibleAnalytics, useAnalyticsDisclosure } from '@/components/AnalyticsDisclosure'
import { secureId } from '@/lib/security/random'
import { loadClients, type ClientRecord } from '@/app/people/clients/clientData'
import {
  type AccountingInvoice,
  emptyAccountingData,
  formatDate,
  isOverdue,
  loadAccountingData,
  money,
  saveAccountingInvoices,
  subscribeAccountingData,
} from '@/lib/accounting/data'

const font = 'var(--font-body)'
const tabs = ['All', 'Draft', 'Sent', 'Paid', 'Overdue']
const invoiceUnitTypes = ['Quantity', 'Hourly', 'Daily', 'Weekly', 'Monthly', 'Fixed fee', 'Square meter', 'Linear meter', 'Lot']
const manualCustomerOption = '__manual_customer__'

type InvoiceForm = {
  number: string
  purchaseOrder: string
  logoName: string
  companyDetails: string
  billTo: string
  currency: string
  clientId: string
  customer: string
  email: string
  issueDate: string
  dueDate: string
  status: string
  notes: string
  bankDetails: string
  taxRate: string
  discount: string
  shippingFee: string
  lineItems: InvoiceLineItem[]
}

type InvoiceLineItem = {
  id: string
  description: string
  unitType: string
  unitCost: string
  quantity: string
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
  return { bg: '#f1f5f9', color: '#000000' }
}

function nextInvoiceNumber(invoices: AccountingInvoice[]) {
  const max = invoices.reduce((largest, invoice) => {
    const parsed = Number(invoice.number.replace(/[^0-9]/g, ''))
    return Number.isFinite(parsed) ? Math.max(largest, parsed) : largest
  }, invoices.length)
  return `INV-${String(max + 1).padStart(5, '0')}`
}

function createEmptyLineItem(): InvoiceLineItem {
  return {
    id: secureId('item'),
    description: '',
    unitType: 'Quantity',
    unitCost: '',
    quantity: '1',
  }
}

function createInvoiceId() {
  return `invoice-${Date.now()}`
}

function clientDisplayName(client: ClientRecord) {
  return client.name || client.company || client.email || 'Unnamed client'
}

function clientBillingEmail(client: ClientRecord) {
  return client.email || client.contacts.find(contact => contact.primary)?.email || client.contacts.find(contact => contact.email)?.email || ''
}

function clientBillingLabel(client: ClientRecord) {
  return clientDisplayName(client)
}

function validClientDetail(value: string) {
  const trimmed = value.trim()
  return trimmed && trimmed !== '-'
}

function clientBillingBlock(client: ClientRecord) {
  const email = clientBillingEmail(client)
  return [
    clientDisplayName(client),
    validClientDetail(email) ? `Email: ${email}` : '',
    validClientDetail(client.phone) ? `Phone: ${client.phone}` : '',
    validClientDetail(client.taxId) ? `Tax ID: ${client.taxId}` : '',
    validClientDetail(client.billingAddress) ? `Address: ${client.billingAddress}` : '',
  ].filter(Boolean).join('\n')
}

function createInvoiceForm(nextNumber: string, currency = 'PHP'): InvoiceForm {
  return {
    number: nextNumber,
    purchaseOrder: '',
    logoName: '',
    companyDetails: '',
    billTo: '',
    currency,
    clientId: '',
    customer: '',
    email: '',
    issueDate: todayInputValue(),
    dueDate: '',
    status: 'Draft',
    notes: 'Payment is due within 15 days.',
    bankDetails: '',
    taxRate: '',
    discount: '',
    shippingFee: '',
    lineItems: [createEmptyLineItem()],
  }
}

function invoiceFormFromSearchParams(searchParams: { get(name: string): string | null }, currency = 'PHP') {
  const form = createInvoiceForm('', currency)
  const clientId = searchParams.get('clientId') || searchParams.get('client') || ''
  const customer = searchParams.get('clientName') || searchParams.get('customer') || searchParams.get('company') || ''
  const email = searchParams.get('email') || ''
  const phone = searchParams.get('phone') || ''
  const address = searchParams.get('address') || ''
  const billTo = searchParams.get('billTo') || [
    customer,
    email ? `Email: ${email}` : '',
    phone ? `Phone: ${phone}` : '',
    address ? `Address: ${address}` : '',
  ].filter(Boolean).join('\n')

  return {
    ...form,
    clientId,
    customer,
    email,
    billTo,
  }
}

function numericInput(value: string) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? Math.max(parsed, 0) : 0
}

function StatusPill({ value }: { value: string }) {
  const tone = statusTone(value)
  return <span className="invoice-status-pill" style={{ background: tone.bg, color: tone.color }}>{value}</span>
}

function downloadCsv(filename: string, rows: Array<Record<string, string | number>>) {
  const headers = Object.keys(rows[0] || { Empty: 'No rows' })
  const csv = [
    headers.join(','),
    ...(rows.length ? rows : [{ Empty: 'No invoice rows' }]).map(row => headers.map(header => `"${String(row[header] ?? '').replaceAll('"', '""')}"`).join(',')),
  ].join('\n')
  const url = window.URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  window.URL.revokeObjectURL(url)
}

export default function AccountingInvoicesPage() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const createRequested = searchParams.get('new') === '1'
  const [data, setData] = useState(emptyAccountingData)
  const [activeTab, setActiveTab] = useState('All')
  const [search, setSearch] = useState('')
  const [showCreate, setShowCreate] = useState(createRequested)
  const [selected, setSelected] = useState<string[]>([])
  const [form, setForm] = useState<InvoiceForm>(() => createRequested ? invoiceFormFromSearchParams(searchParams) : createInvoiceForm(''))
  const [clients, setClients] = useState<ClientRecord[]>([])
  const analytics = useAnalyticsDisclosure('wiseflow:analytics:accounting-invoices')

  useEffect(() => {
    const load = () => setData(loadAccountingData())
    load()
    return subscribeAccountingData(load)
  }, [])

  useEffect(() => {
    let active = true
    const refreshClients = async () => {
      const result = await loadClients()
      if (active) setClients(result.clients)
    }

    refreshClients()
    window.addEventListener('storage', refreshClients)
    window.addEventListener('wiseflow-company-change', refreshClients)
    window.addEventListener('focus', refreshClients)
    return () => {
      active = false
      window.removeEventListener('storage', refreshClients)
      window.removeEventListener('wiseflow-company-change', refreshClients)
      window.removeEventListener('focus', refreshClients)
    }
  }, [])

  const invoices = data.invoices
  const createPanelOpen = showCreate || createRequested
  const suggestedInvoiceNumber = nextInvoiceNumber(invoices)
  const clientOptions = useMemo(() => {
    return [...clients].sort((a, b) => clientDisplayName(a).localeCompare(clientDisplayName(b)))
  }, [clients])

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
  const invoiceLines = form.lineItems.map(item => {
    const unitCost = numericInput(item.unitCost)
    const quantity = numericInput(item.quantity || '1')
    return { ...item, unitCost, quantity, amount: unitCost * quantity }
  })
  const invoiceSubtotal = invoiceLines.reduce((sum, item) => sum + item.amount, 0)
  const invoiceTaxRate = numericInput(form.taxRate)
  const invoiceTaxAmount = invoiceSubtotal * (invoiceTaxRate / 100)
  const invoiceDiscount = numericInput(form.discount)
  const invoiceShipping = numericInput(form.shippingFee)
  const invoiceTotal = Math.max(invoiceSubtotal + invoiceTaxAmount + invoiceShipping - invoiceDiscount, 0)
  const invoiceCurrency = form.currency || data.currency

  const closeCreate = () => {
    setShowCreate(false)
    if (createRequested) router.replace(pathname)
  }

  const openCreate = () => {
    setForm(createInvoiceForm(suggestedInvoiceNumber, data.currency))
    setShowCreate(true)
  }

  const updateInvoices = async (nextInvoices: AccountingInvoice[]) => {
    await saveAccountingInvoices(nextInvoices)
    setData(loadAccountingData())
  }

  const createInvoice = async (event: FormEvent) => {
    event.preventDefault()
    const status = normalizeStatus(form.status)
    const paid = status.toLowerCase() === 'paid' ? invoiceTotal : 0
    const invoiceNumber = form.number.trim() || suggestedInvoiceNumber
    const lineItems = invoiceLines
      .filter(item => item.description.trim() || item.amount > 0)
      .map(item => ({
        id: item.id,
        description: item.description.trim() || 'Invoice item',
        unitType: item.unitType || 'Quantity',
        unitCost: item.unitCost,
        quantity: item.quantity || 1,
        amount: item.amount,
      }))
    const invoice: AccountingInvoice = {
      id: createInvoiceId(),
      clientId: form.clientId,
      number: invoiceNumber,
      customer: form.customer.trim() || 'No recipient',
      email: form.email.trim(),
      issueDate: form.issueDate || todayInputValue(),
      dueDate: form.dueDate,
      amount: invoiceTotal,
      paid,
      balanceDue: Math.max(invoiceTotal - paid, 0),
      status,
      purchaseOrder: form.purchaseOrder.trim(),
      companyDetails: form.companyDetails.trim(),
      billTo: form.billTo.trim(),
      currency: invoiceCurrency,
      notes: form.notes.trim(),
      bankDetails: form.bankDetails.trim(),
      logoName: form.logoName,
      subtotal: invoiceSubtotal,
      taxRate: invoiceTaxRate,
      taxAmount: invoiceTaxAmount,
      discount: invoiceDiscount,
      shippingFee: invoiceShipping,
      lineItems,
    }
    await updateInvoices([...invoices, invoice])
    setForm(createInvoiceForm(nextInvoiceNumber([...invoices, invoice]), data.currency))
    closeCreate()
  }

  const setInvoiceStatus = async (id: string, status: string) => {
    const next = invoices.map(invoice => {
      if (invoice.id !== id) return invoice
      const paid = status === 'Paid' ? invoice.amount : invoice.paid
      return { ...invoice, status, paid, balanceDue: Math.max(invoice.amount - paid, 0) }
    })
    await updateInvoices(next)
  }

  const deleteInvoice = async (id: string) => {
    await updateInvoices(invoices.filter(invoice => invoice.id !== id))
    setSelected(prev => prev.filter(item => item !== id))
  }
  const exportInvoices = () => {
    const rows = filtered.map(invoice => ({
      Number: invoice.number,
      Customer: invoice.customer,
      Email: invoice.email,
      IssueDate: formatDate(invoice.issueDate),
      DueDate: formatDate(invoice.dueDate),
      Amount: money(invoice.amount, invoice.currency || data.currency),
      Paid: money(invoice.paid, invoice.currency || data.currency),
      Balance: money(invoice.balanceDue, invoice.currency || data.currency),
      Status: invoice.balanceDue > 0 && isOverdue(invoice.dueDate) && invoice.status.toLowerCase() !== 'paid' ? 'Overdue' : invoice.status,
    }))
    downloadCsv(`accounting-invoices-${new Date().toISOString().slice(0, 10)}.csv`, rows)
  }

  const markSelectedPaid = async () => {
    if (!selected.length) return
    await updateInvoices(invoices.map(invoice => selected.includes(invoice.id) ? { ...invoice, status: 'Paid', paid: invoice.amount, balanceDue: 0 } : invoice))
    setSelected([])
  }

  const findClientByBillingText = (value: string) => {
    const normalized = value.split('\n')[0].trim().toLowerCase()
    return clientOptions.find(client => {
      const names = [clientBillingLabel(client), clientDisplayName(client), client.company, client.email].filter(Boolean)
      return names.some(name => name.trim().toLowerCase() === normalized)
    })
  }

  const applyClientToForm = (client: ClientRecord | undefined, extra: Partial<InvoiceForm> = {}) => {
    setForm(prev => ({
      ...prev,
      ...extra,
      clientId: client ? client.id : extra.clientId ?? prev.clientId,
      customer: client ? clientDisplayName(client) : extra.customer ?? prev.customer,
      email: client ? clientBillingEmail(client) : extra.email ?? prev.email,
      billTo: client ? extra.billTo ?? clientBillingBlock(client) : extra.billTo ?? prev.billTo,
    }))
  }

  const updateCustomer = (value: string) => {
    const matchedClient = clientOptions.find(client => clientDisplayName(client).toLowerCase() === value.trim().toLowerCase())
    if (matchedClient) {
      applyClientToForm(matchedClient, { customer: value })
      return
    }

    setForm(prev => ({ ...prev, clientId: '', customer: value, email: '' }))
  }

  const updateCustomerSelection = (value: string) => {
    if (!value) {
      setForm(prev => ({ ...prev, clientId: '', customer: '', email: '', billTo: '' }))
      return
    }

    if (value === manualCustomerOption) {
      setForm(prev => ({
        ...prev,
        clientId: '',
        customer: prev.clientId ? '' : prev.customer,
        email: prev.clientId ? '' : prev.email,
        billTo: prev.clientId ? '' : prev.billTo,
      }))
      return
    }

    const matchedClient = clientOptions.find(client => client.id === value)
    if (matchedClient) applyClientToForm(matchedClient)
  }

  const updateBillTo = (value: string) => {
    const matchedClient = findClientByBillingText(value)
    if (matchedClient) {
      applyClientToForm(matchedClient)
      return
    }

    setForm(prev => ({ ...prev, billTo: value }))
  }

  const toggleSelected = (id: string) => setSelected(prev => prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id])
  const updateLineItem = (id: string, field: keyof InvoiceLineItem, value: string) => {
    setForm(prev => ({ ...prev, lineItems: prev.lineItems.map(item => item.id === id ? { ...item, [field]: value } : item) }))
  }
  const addLineItem = () => setForm(prev => ({ ...prev, lineItems: [...prev.lineItems, createEmptyLineItem()] }))
  const removeLineItem = (id: string) => {
    setForm(prev => ({ ...prev, lineItems: prev.lineItems.length === 1 ? prev.lineItems : prev.lineItems.filter(item => item.id !== id) }))
  }

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
            <Search size={16} color="#000000" />
            <input value={search} onChange={event => setSearch(event.target.value)} placeholder="Search invoices, clients..." />
          </label>
          <AnalyticsToggleButton open={analytics.open} onToggle={analytics.toggle} panelId={analytics.panelId} className="invoices-toolbar-button" />
          <button type="button" className="invoices-toolbar-button" onClick={exportInvoices}><Download size={15} /> Export CSV</button>
          <button type="button" className="invoices-primary-button" onClick={openCreate}><Plus size={15} /> New Invoice <ChevronDown size={13} /></button>
        </div>
      </div>

      <CollapsibleAnalytics open={analytics.open} id={analytics.panelId}>
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
      </CollapsibleAnalytics>

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
            <div>
              <h2>Create Invoice</h2>
              <p className="invoices-panel-subtitle">Build a detailed invoice with items, taxes, payment terms, and bank details.</p>
            </div>
            <button type="button" className="invoices-link-button" onClick={closeCreate}>Cancel</button>
          </div>
          <form className="invoices-maker-form" onSubmit={createInvoice}>
            <div className="invoices-maker-top">
              <label>
                <span>Invoice number</span>
                <input value={form.number} onChange={event => setForm(prev => ({ ...prev, number: event.target.value }))} placeholder={suggestedInvoiceNumber} />
              </label>
              <label>
                <span>Purchase order</span>
                <input value={form.purchaseOrder} onChange={event => setForm(prev => ({ ...prev, purchaseOrder: event.target.value }))} placeholder="PO or contract reference" />
              </label>
              <label className="invoices-logo-upload">
                <span>Logo</span>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/jpg"
                  onChange={event => setForm(prev => ({ ...prev, logoName: event.target.files?.[0]?.name || '' }))}
                />
                <strong><Upload size={15} /> Upload file</strong>
                <small>{form.logoName || 'JPG, JPEG, PNG, less than 5MB'}</small>
              </label>
            </div>

            <div className="invoices-maker-addresses">
              <label>
                <span>Your company details</span>
                <textarea value={form.companyDetails} onChange={event => setForm(prev => ({ ...prev, companyDetails: event.target.value }))} placeholder={`${data.companyName}\nCompany address\nTax ID / contact details`} />
              </label>
              <label>
                <span>Bill to</span>
                <textarea
                  value={form.billTo}
                  onChange={event => updateBillTo(event.target.value)}
                  placeholder={clientOptions.length ? 'Select a customer to fill billing details, or type manually' : 'Client name, email, phone, tax ID, and billing address'}
                />
              </label>
            </div>

            <div className="invoices-maker-meta">
              <label>
                <span>Customer</span>
                <select
                  value={form.clientId || (form.customer ? manualCustomerOption : '')}
                  onChange={event => updateCustomerSelection(event.target.value)}
                  required
                >
                  <option value="">{clientOptions.length ? 'Select client' : 'No clients available'}</option>
                  {form.clientId && !clientOptions.some(client => client.id === form.clientId) ? <option value={form.clientId}>{form.customer || form.clientId}</option> : null}
                  {clientOptions.map(client => <option key={client.id} value={client.id}>{clientDisplayName(client)}</option>)}
                  <option value={manualCustomerOption}>Manual customer</option>
                </select>
                {!form.clientId && (
                  <input
                    value={form.customer}
                    onChange={event => updateCustomer(event.target.value)}
                    placeholder="Type customer name"
                    required
                  />
                )}
              </label>
              <label>
                <span>Email</span>
                <input value={form.email} onChange={event => setForm(prev => ({ ...prev, email: event.target.value }))} type="email" placeholder="billing@client.com" readOnly={Boolean(form.clientId)} />
              </label>
              <label>
                <span>Currency</span>
                <select value={form.currency} onChange={event => setForm(prev => ({ ...prev, currency: event.target.value }))}>
                  <option value="PHP">PHP - Philippine peso</option>
                  <option value="USD">USD - US dollar</option>
                </select>
              </label>
              <label>
                <span>Invoice date</span>
                <input value={form.issueDate} onChange={event => setForm(prev => ({ ...prev, issueDate: event.target.value }))} type="date" required />
              </label>
              <label>
                <span>Due date</span>
                <input value={form.dueDate} onChange={event => setForm(prev => ({ ...prev, dueDate: event.target.value }))} type="date" />
              </label>
              <label>
                <span>Status</span>
                <select value={form.status} onChange={event => setForm(prev => ({ ...prev, status: event.target.value }))}>
                  <option>Draft</option>
                  <option>Sent</option>
                  <option>Paid</option>
                </select>
              </label>
            </div>

            <section className="invoices-line-items" aria-label="Invoice line items">
              <div className="invoices-line-heading">
                <span>Item description</span>
                <span>Unit</span>
                <span>Unit cost</span>
                <span>Quantity</span>
                <span>Amount</span>
                <span />
              </div>
              {form.lineItems.map(item => {
                const unitCost = numericInput(item.unitCost)
                const quantity = numericInput(item.quantity || '1')
                return (
                  <div key={item.id} className="invoices-line-row">
                    <label>
                      <span>Item description</span>
                      <input value={item.description} onChange={event => updateLineItem(item.id, 'description', event.target.value)} placeholder="Design, materials, labor..." />
                    </label>
                    <label>
                      <span>Unit</span>
                      <select value={item.unitType} onChange={event => updateLineItem(item.id, 'unitType', event.target.value)}>
                        {invoiceUnitTypes.map(unitType => <option key={unitType}>{unitType}</option>)}
                      </select>
                    </label>
                    <label>
                      <span>Unit cost</span>
                      <input value={item.unitCost} onChange={event => updateLineItem(item.id, 'unitCost', event.target.value)} type="number" min="0" step="0.01" placeholder="0.00" />
                    </label>
                    <label>
                      <span>Quantity</span>
                      <input value={item.quantity} onChange={event => updateLineItem(item.id, 'quantity', event.target.value)} type="number" min="0" step="0.01" placeholder="1" />
                    </label>
                    <div className="invoices-line-amount">
                      <span>Amount</span>
                      <strong>{money(unitCost * quantity, invoiceCurrency)}</strong>
                    </div>
                    <button type="button" className="invoices-icon-button" onClick={() => removeLineItem(item.id)} aria-label="Remove item"><X size={17} /></button>
                  </div>
                )
              })}
              <button type="button" className="invoices-add-item" onClick={addLineItem}><Plus size={18} /> Add item</button>
            </section>

            <div className="invoices-maker-bottom">
              <div className="invoices-notes-stack">
                <label>
                  <span>Notes / payment terms</span>
                  <textarea value={form.notes} onChange={event => setForm(prev => ({ ...prev, notes: event.target.value }))} placeholder="Payment terms, special instructions, or invoice notes" />
                </label>
                <label>
                  <span>Bank account details</span>
                  <textarea value={form.bankDetails} onChange={event => setForm(prev => ({ ...prev, bankDetails: event.target.value }))} placeholder="Bank name, account name, account number, transfer notes" />
                </label>
              </div>
              <div className="invoices-total-box">
                <div><span>Subtotal</span><strong>{money(invoiceSubtotal, invoiceCurrency)}</strong></div>
                <label>
                  <span>Tax %</span>
                  <input value={form.taxRate} onChange={event => setForm(prev => ({ ...prev, taxRate: event.target.value }))} type="number" min="0" step="0.01" placeholder="0" />
                </label>
                <div><span>Tax amount</span><strong>{money(invoiceTaxAmount, invoiceCurrency)}</strong></div>
                <label>
                  <span>Discount</span>
                  <input value={form.discount} onChange={event => setForm(prev => ({ ...prev, discount: event.target.value }))} type="number" min="0" step="0.01" placeholder="0.00" />
                </label>
                <label>
                  <span>Shipping fee</span>
                  <input value={form.shippingFee} onChange={event => setForm(prev => ({ ...prev, shippingFee: event.target.value }))} type="number" min="0" step="0.01" placeholder="0.00" />
                </label>
                <div className="invoices-total-row"><span>Total</span><strong>{money(invoiceTotal, invoiceCurrency)}</strong></div>
              </div>
            </div>
            <div className="invoices-form-actions">
              <strong>Next number: {suggestedInvoiceNumber}</strong>
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
                      <td data-label="Amount">{money(invoice.amount, invoice.currency || data.currency)}</td>
                      <td data-label="Paid">{money(invoice.paid, invoice.currency || data.currency)}</td>
                      <td data-label="Balance">{money(invoice.balanceDue, invoice.currency || data.currency)}</td>
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
              <MoreHorizontal size={16} color="#000000" />
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
              <button type="button" onClick={openCreate}><span><Plus size={15} /></span>New Invoice<ChevronDown size={15} /></button>
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
.invoices-toolbar-button { min-height: 38px; border-radius: 8px; border: 1px solid #e8edf4; background: #fff; color: #0f172a; display: flex; align-items: center; gap: 8px; padding: 0 12px; font-size: 12.5px; font-weight: 850; cursor: pointer; }
.invoices-primary-button { min-height: 38px; border-radius: 8px; border: 1px solid #e8edf4; background: #fff; color: #0f172a; display: flex; align-items: center; gap: 8px; padding: 0 12px; font-size: 12.5px; font-weight: 850; cursor: pointer; }
.invoices-primary-button { border-color: #16a34a; background: #16a34a; color: #fff; font-weight: 950; }
.invoices-metrics { display: grid; grid-template-columns: repeat(5, minmax(170px, 1fr)); gap: 18px; margin-bottom: 18px; }
.invoices-card { background: #fff; border: 1px solid #e8edf4; border-radius: 8px; padding: 18px; box-shadow: 0 1px 2px rgba(15, 23, 42, .03); }
.invoices-metric-card { min-height: 100px; display: flex; align-items: center; }
.invoices-metric-icon { width: 54px; height: 54px; border-radius: 9px; display: grid; place-items: center; margin-right: 16px; flex: 0 0 auto; }
.invoices-card-label { display: block; color: #000000; font-size: 12px; font-weight: 850; }
.invoices-card-value { display: block; color: #0f172a; font-size: 23px; margin-top: 8px; white-space: nowrap; }
.invoices-card-detail { display: block; color: #334155; font-size: 11.5px; font-weight: 900; margin-top: 8px; }
.invoices-tabs { display: flex; align-items: center; gap: 32px; border-bottom: 1px solid #e8edf4; padding-left: 14px; overflow-x: auto; }
.invoices-tabs button { border: 0; border-bottom: 2px solid transparent; background: transparent; color: #0f172a; min-height: 48px; padding: 0; font-size: 12.5px; font-weight: 900; cursor: pointer; white-space: nowrap; display: inline-flex; align-items: center; gap: 8px; }
.invoices-tabs button.is-active { color: #16a34a; border-bottom-color: #16a34a; }
.invoices-tabs span { min-width: 22px; min-height: 22px; border-radius: 999px; background: #f1f5f9; color: #000000; display: grid; place-items: center; font-size: 11px; }
.invoices-tabs button.is-active span { background: #dcfce7; color: #15803d; }
.invoices-grid { display: grid; grid-template-columns: minmax(0, 1fr) 360px; gap: 16px; margin-top: 18px; }
.invoices-side-stack { display: grid; align-content: start; gap: 16px; }
.invoices-panel-header { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 16px; }
.invoices-panel-header h2, .invoices-card-heading { margin: 0; color: #0f172a; font-size: 16px; font-weight: 950; }
.invoices-panel-subtitle { margin: 6px 0 0; color: #000000; font-size: 12.5px; font-weight: 650; }
.invoices-panel-actions { display: flex; align-items: center; flex-wrap: wrap; justify-content: flex-end; gap: 10px; }
.invoices-panel-actions strong { color: #000000; font-size: 12px; }
.invoices-panel-actions button, .invoices-link-button { min-height: 32px; border: 1px solid #e8edf4; border-radius: 7px; background: #fff; color: #0f172a; padding: 0 10px; font-size: 12px; font-weight: 900; cursor: pointer; }
.invoices-table-wrap { overflow-x: auto; }
.invoices-table { width: 100%; min-width: 980px; border-collapse: collapse; }
.invoices-table th { text-align: left; padding: 12px 14px; color: #000000; font-size: 11px; font-weight: 900; }
.invoices-table td { padding: 13px 14px; border-top: 1px solid #eef2f7; color: #0f172a; font-size: 13px; vertical-align: middle; }
.invoices-table td strong { display: block; color: #0f172a; }
.invoices-table td small { display: block; color: #000000; margin-top: 3px; }
.invoice-status-pill { display: inline-flex; min-height: 24px; align-items: center; border-radius: 7px; padding: 0 9px; font-size: 11.5px; font-weight: 900; }
.invoices-row-actions { display: flex; align-items: center; gap: 6px; }
.invoices-row-actions button { width: 32px; height: 32px; border: 1px solid #e8edf4; border-radius: 7px; background: #fff; color: #0f172a; display: grid; place-items: center; cursor: pointer; }
.invoices-empty { text-align: center; color: #000000 !important; padding: 34px !important; font-weight: 800; }
.invoices-create-panel { margin-top: 18px; }
.invoices-maker-form { display: grid; gap: 18px; }
.invoices-maker-form label { display: grid; gap: 7px; min-width: 0; }
.invoices-maker-form span, .invoices-line-amount span, .invoices-total-box span { color: #000000; font-size: 12px; font-weight: 900; }
.invoices-maker-form input,
.invoices-maker-form select,
.invoices-maker-form textarea { width: 100%; min-height: 40px; border: 1px solid #d7dde7; border-radius: 8px; padding: 0 12px; color: #0f172a; background: #fff; outline: 0; font-size: 13px; font-family: inherit; }
.invoices-maker-form textarea { min-height: 92px; padding-top: 11px; resize: vertical; line-height: 1.45; }
.invoices-maker-form input:focus,
.invoices-maker-form select:focus,
.invoices-maker-form textarea:focus { border-color: #0f172a; box-shadow: 0 0 0 3px rgba(15, 23, 42, .08); }
.invoices-maker-top, .invoices-maker-meta { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 14px; }
.invoices-maker-addresses, .invoices-maker-bottom { display: grid; grid-template-columns: minmax(0, 1fr) minmax(280px, .55fr); gap: 14px; }
.invoices-logo-upload { position: relative; min-height: 72px; border: 1px solid #d7dde7; border-radius: 8px; padding: 12px 14px; align-content: center; cursor: pointer; }
.invoices-logo-upload > span { position: static; }
.invoices-logo-upload input { position: absolute; inset: 0; opacity: 0; cursor: pointer; }
.invoices-logo-upload strong { display: flex; align-items: center; gap: 8px; color: #0f172a; font-size: 12.5px; font-weight: 950; }
.invoices-logo-upload small { color: #000000; font-size: 11px; font-weight: 750; }
.invoices-line-items { background: #f2f7ef; border: 1px solid #e2ecd9; border-radius: 10px; padding: 16px; display: grid; gap: 12px; }
.invoices-line-heading, .invoices-line-row { display: grid; grid-template-columns: minmax(220px, 1fr) 130px 130px 110px 150px 36px; gap: 10px; align-items: end; }
.invoices-line-heading { align-items: center; color: #000000; font-size: 11px; font-weight: 950; padding: 0 0 2px; }
.invoices-line-row label span { display: none; }
.invoices-line-amount { display: grid; gap: 7px; }
.invoices-line-amount span { display: none; }
.invoices-line-amount strong { min-height: 40px; border: 1px solid #d7dde7; border-radius: 8px; background: #fff; display: flex; align-items: center; padding: 0 12px; color: #0f172a; font-size: 13px; }
.invoices-icon-button { width: 36px; height: 40px; border: 0; background: transparent; color: #15803d; display: grid; place-items: center; cursor: pointer; }
.invoices-add-item { justify-self: center; width: 86px; min-height: 64px; border: 0; background: transparent; color: #0f172a; display: grid; place-items: center; gap: 6px; font-size: 11px; font-weight: 900; cursor: pointer; }
.invoices-add-item svg { width: 34px; height: 34px; padding: 8px; border-radius: 999px; background: #9bea6b; color: #0f172a; }
.invoices-notes-stack { display: grid; gap: 14px; }
.invoices-total-box { display: grid; align-content: start; gap: 12px; }
.invoices-total-box > div,
.invoices-total-box label { display: grid; grid-template-columns: minmax(120px, 1fr) minmax(140px, 1fr); align-items: center; gap: 12px; }
.invoices-total-box input { min-height: 38px; text-align: right; }
.invoices-total-box strong { color: #0f172a; font-size: 13px; text-align: right; }
.invoices-total-row { border-top: 1px solid #e8edf4; padding-top: 10px; }
.invoices-total-row strong { font-size: 18px; font-weight: 950; }
.invoices-form { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 14px; }
.invoices-form label { display: grid; gap: 7px; }
.invoices-form span { color: #000000; font-size: 12px; font-weight: 900; }
.invoices-form input, .invoices-form select { min-height: 40px; border: 1px solid #e8edf4; border-radius: 8px; padding: 0 12px; color: #0f172a; background: #fff; outline: 0; font-size: 13px; }
.invoices-form-actions { grid-column: 1 / -1; display: flex; justify-content: space-between; align-items: center; gap: 12px; border-top: 1px solid #eef2f7; padding-top: 14px; }
.invoices-form-actions strong { color: #000000; font-size: 12px; }
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
  .invoices-line-heading, .invoices-line-row { grid-template-columns: minmax(180px, 1fr) 120px 120px 100px 140px 36px; }
}
@media (max-width: 820px) {
  .invoices-metrics, .invoices-side-stack, .invoices-form { grid-template-columns: 1fr 1fr; }
  .invoices-maker-top, .invoices-maker-meta, .invoices-maker-addresses, .invoices-maker-bottom { grid-template-columns: 1fr 1fr; }
  .invoices-line-heading { display: none; }
  .invoices-line-row { grid-template-columns: 1fr 1fr; align-items: start; background: rgba(255,255,255,.72); border: 1px solid #e2ecd9; border-radius: 9px; padding: 12px; }
  .invoices-line-row label span { display: block; }
  .invoices-line-amount span { display: block; }
  .invoices-line-amount { grid-column: span 1; }
  .invoices-icon-button { justify-self: start; align-self: end; }
  .invoices-panel-header { align-items: flex-start; flex-direction: column; }
}
@media (max-width: 640px) {
  .invoices-page { padding: 16px; }
  .invoices-title { font-size: 24px; }
  .invoices-header-actions, .invoices-metrics, .invoices-side-stack, .invoices-form { display: grid; grid-template-columns: 1fr; }
  .invoices-maker-top, .invoices-maker-meta, .invoices-maker-addresses, .invoices-maker-bottom, .invoices-line-row { grid-template-columns: 1fr; }
  .invoices-line-items { margin-left: -6px; margin-right: -6px; padding: 12px; }
  .invoices-total-box > div, .invoices-total-box label { grid-template-columns: 1fr; gap: 7px; }
  .invoices-total-box input, .invoices-total-box strong { text-align: left; }
  .invoices-card-value { font-size: 21px; }
  .invoices-tabs { margin-left: -16px; margin-right: -16px; padding-left: 16px; padding-right: 16px; }
  .invoices-form-actions { align-items: stretch; flex-direction: column; }
  .invoices-table-wrap { overflow: visible; }
  .invoices-table, .invoices-table thead, .invoices-table tbody, .invoices-table tr, .invoices-table td { display: block; width: 100%; min-width: 0; }
  .invoices-table thead { display: none; }
  .invoices-table tr { border: 1px solid #eef2f7; border-radius: 8px; margin-bottom: 12px; background: #fff; overflow: hidden; }
  .invoices-table td { border-top: 0; display: grid; grid-template-columns: 112px minmax(0, 1fr); gap: 10px; padding: 10px 12px; font-size: 12.5px; align-items: center; }
  .invoices-table td::before { content: attr(data-label); color: #000000; font-size: 11px; font-weight: 900; text-transform: uppercase; }
  .invoices-row-actions { justify-content: flex-start; }
}
`
