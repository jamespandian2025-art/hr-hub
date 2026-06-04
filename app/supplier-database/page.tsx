'use client'

import Link from 'next/link'
import { FormEvent, type ComponentType, useEffect, useMemo, useState } from 'react'
import {
  ArrowLeft,
  BadgeCheck,
  Building2,
  ChevronRight,
  ClipboardCheck,
  FileText,
  FolderOpen,
  LayoutDashboard,
  Mail,
  Menu,
  MoreHorizontal,
  PackageSearch,
  Phone,
  Plus,
  Search,
  Settings,
  Star,
  UsersRound,
  X,
} from 'lucide-react'
import CompanySwitcher from '@/components/CompanySwitcher'
import { AnalyticsToggleButton, CollapsibleAnalytics, useAnalyticsDisclosure } from '@/components/AnalyticsDisclosure'
import StateFeedback from '@/components/StateFeedback'
import { companyChangeEvent, companyScopedKey, getActiveCompany } from '@/lib/tenant/company'

const font = 'var(--font-body)'
const suppliersKey = 'flowsys-suppliers'
const purchaseOrdersKey = 'flowsys-procurement-purchase-orders'
const settingsKey = 'flowsys-supplier-settings'

type StoredRow = Record<string, unknown>
type SupplierSection = 'Overview' | 'Suppliers' | 'Supplier Details' | 'Documents' | 'Settings'
type SupplierStatus = 'Active' | 'Pending' | 'Inactive' | 'Blocked'

type SupplierDocument = {
  id: string
  name: string
  type: string
  uploadedAt: string
  status: string
}

type SupplierTransaction = {
  id: string
  reference: string
  date: string
  amount: number
  status: string
}

type SupplierRecord = {
  id: string
  companyId: string
  name: string
  category: string
  contactPerson: string
  email: string
  phone: string
  rating: number
  status: SupplierStatus
  paymentTerms: string
  spend: number
  notes: string
  documents: SupplierDocument[]
  transactions: SupplierTransaction[]
  createdAt: string
  source: StoredRow
}

type SupplierForm = {
  name: string
  category: string
  contactPerson: string
  email: string
  phone: string
  status: SupplierStatus
  paymentTerms: string
}

const emptyForm: SupplierForm = {
  name: '',
  category: '',
  contactPerson: '',
  email: '',
  phone: '',
  status: 'Pending',
  paymentTerms: '',
}

const statusOptions: SupplierStatus[] = ['Active', 'Pending', 'Inactive', 'Blocked']

const suggestedSupplierCategories = [
  'Hardware',
  'Construction Materials',
  'Electrical',
  'Plumbing',
  'HVAC',
  'Safety Equipment',
  'Office Supplies',
  'IT Equipment',
  'Equipment Rental',
  'Logistics',
  'Professional Services',
  'Subcontractor',
  'Fuel & Lubricants',
  'Furniture & Fixtures',
  'Tools & Equipment',
]

const supplierWorkspaceMenu: Array<{ label: SupplierSection; icon: ComponentType<{ size?: number }> }> = [
  { label: 'Overview', icon: LayoutDashboard },
  { label: 'Suppliers', icon: UsersRound },
  { label: 'Supplier Details', icon: Building2 },
  { label: 'Documents', icon: FolderOpen },
  { label: 'Settings', icon: Settings },
]

export default function SupplierDatabasePage() {
  const [companyId, setCompanyId] = useState('')
  const [storedSuppliers, setStoredSuppliers] = useState<StoredRow[]>([])
  const [storedOrders, setStoredOrders] = useState<StoredRow[]>([])
  const [activeSection, setActiveSection] = useState<SupplierSection>('Overview')
  const [selectedId, setSelectedId] = useState('')
  const [search, setSearch] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [form, setForm] = useState<SupplierForm>(emptyForm)
  const analytics = useAnalyticsDisclosure('wiseflow:analytics:supplier-database')

  useEffect(() => {
    const load = () => {
      const activeCompany = getActiveCompany()
      const activeCompanyId = activeCompany?.id || ''
      setCompanyId(activeCompanyId)
      setStoredSuppliers(loadRows(suppliersKey, activeCompanyId))
      setStoredOrders(loadRows(purchaseOrdersKey, activeCompanyId))
    }

    load()
    window.addEventListener('storage', load)
    window.addEventListener('focus', load)
    window.addEventListener(companyChangeEvent, load)
    return () => {
      window.removeEventListener('storage', load)
      window.removeEventListener('focus', load)
      window.removeEventListener(companyChangeEvent, load)
    }
  }, [])

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setSidebarOpen(false)
    }
    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [])

  const orderTransactions = useMemo(() => buildSupplierTransactions(storedOrders), [storedOrders])
  const suppliers = useMemo(
    () => storedSuppliers.map((row, index) => normalizeSupplier(row, index, companyId, orderTransactions)).filter(Boolean) as SupplierRecord[],
    [companyId, orderTransactions, storedSuppliers],
  )
  const selectedSupplier = suppliers.find(supplier => supplier.id === selectedId) || suppliers[0]
  const categories = useMemo(() => uniqueValues(suppliers.map(supplier => supplier.category).filter(Boolean)), [suppliers])
  const categoryOptions = useMemo(
    () => uniqueValues([...suggestedSupplierCategories, ...categories]).sort((a, b) => a.localeCompare(b)),
    [categories],
  )
  const filteredSuppliers = useMemo(() => {
    const needle = search.trim().toLowerCase()
    return suppliers.filter(supplier => !needle || [
      supplier.name,
      supplier.category,
      supplier.contactPerson,
      supplier.email,
      supplier.phone,
      supplier.status,
    ].some(value => value.toLowerCase().includes(needle)))
  }, [search, suppliers])

  const stats = useMemo(() => ({
    total: suppliers.length,
    active: suppliers.filter(supplier => supplier.status === 'Active').length,
    pending: suppliers.filter(supplier => supplier.status === 'Pending').length,
    spend: suppliers.reduce((sum, supplier) => sum + supplier.spend, 0),
  }), [suppliers])

  const recentSuppliers = useMemo(
    () => [...suppliers].sort((a, b) => dateValue(b.createdAt) - dateValue(a.createdAt)).slice(0, 5),
    [suppliers],
  )
  const topSuppliers = useMemo(
    () => [...suppliers].sort((a, b) => b.spend - a.spend).slice(0, 5),
    [suppliers],
  )
  const documents = useMemo(() => suppliers.flatMap(supplier => supplier.documents.map(document => ({ ...document, supplier }))), [suppliers])
  const settings = useMemo(() => loadSettings(companyId), [companyId])

  function persist(nextRows: StoredRow[]) {
    const unique = uniqueRows(nextRows)
    setStoredSuppliers(unique)
    persistRows(suppliersKey, unique, companyId)
  }

  function openSupplier(supplier: SupplierRecord) {
    setSelectedId(supplier.id)
    setActiveSection('Supplier Details')
  }

  function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const name = form.name.trim()
    if (!name) return
    const now = new Date()
    const contactPerson = form.contactPerson.trim()
    const record: StoredRow = {
      id: `supplier-${now.toISOString()}`,
      companyId,
      name,
      category: form.category.trim() || 'General Supplier',
      contact: contactPerson,
      contactPerson,
      email: form.email.trim().toLowerCase(),
      phone: form.phone.trim(),
      status: form.status,
      paymentTerms: form.paymentTerms.trim(),
      rating: 0,
      supplies: [],
      documents: [],
      createdAt: now.toISOString(),
    }
    persist([record, ...storedSuppliers])
    setSelectedId(String(record.id))
    setForm(emptyForm)
    setShowCreate(false)
    setActiveSection('Supplier Details')
  }

  return (
    <div className="supplier-workspace" style={{ fontFamily: font }}>
      <style>{supplierCss}</style>
      <button type="button" className={`supplier-mobile-backdrop${sidebarOpen ? ' is-open' : ''}`} aria-label="Close supplier navigation" onClick={() => setSidebarOpen(false)} />
      <header className="supplier-mobile-bar">
        <button type="button" className="supplier-mobile-menu" aria-label="Open supplier navigation" aria-expanded={sidebarOpen} onClick={() => setSidebarOpen(true)}>
          <Menu size={19} />
        </button>
        <div className="supplier-mobile-brand">
          <span>S</span>
          <div>
            <strong>Supplier Database</strong>
            <small>Vendor workspace</small>
          </div>
        </div>
      </header>

      <aside className={`supplier-sidebar${sidebarOpen ? ' is-open' : ''}`}>
        <div className="supplier-brand">
          <span>S</span>
          <div>
            <strong>Supplier Database</strong>
            <small>Vendor workspace</small>
          </div>
          <button type="button" className="supplier-sidebar-close" aria-label="Close supplier navigation" onClick={() => setSidebarOpen(false)}>
            <X size={18} />
          </button>
        </div>
        <Link href="/dashboard" className="supplier-back"><ArrowLeft size={15} /> Back to WiseFlow</Link>
        <nav aria-label="Supplier Database workspace navigation">
          <span className="supplier-nav-label">Workspace</span>
          {supplierWorkspaceMenu.map(item => {
            const Icon = item.icon
            return (
              <button key={item.label} type="button" className={activeSection === item.label ? 'active' : ''} onClick={() => { setActiveSection(item.label); setSidebarOpen(false) }}>
                <Icon size={16} />
                <span>{item.label}</span>
              </button>
            )
          })}
        </nav>
      </aside>

      <main className="supplier-main">
        <header className="supplier-header">
          <div>
            <h1>Supplier Database</h1>
            <p>Manage company suppliers, documents, terms, and purchasing history.</p>
          </div>
          <label className="supplier-search">
            <Search size={17} />
            <input value={search} onChange={event => setSearch(event.target.value)} placeholder="Search suppliers..." aria-label="Search suppliers" />
          </label>
          <CompanySwitcher className="supplier-company-switcher" />
          {activeSection === 'Overview' && (
            <AnalyticsToggleButton open={analytics.open} onToggle={analytics.toggle} panelId={analytics.panelId} className="supplier-secondary" />
          )}
          <button type="button" className="supplier-primary" onClick={() => setShowCreate(true)}><Plus size={16} /> New Supplier</button>
        </header>

        {activeSection === 'Overview' && (
          <section className="supplier-section">
            <CollapsibleAnalytics open={analytics.open} id={analytics.panelId}>
              <div className="supplier-kpis">
                <KpiCard title="Total Suppliers" value={String(stats.total)} icon={UsersRound} helper="Company supplier records" />
                <KpiCard title="Active Suppliers" value={String(stats.active)} icon={BadgeCheck} helper="Approved for purchasing" />
                <KpiCard title="Pending Suppliers" value={String(stats.pending)} icon={ClipboardCheck} helper="Awaiting review" />
                <KpiCard title="Total Spend" value={formatCurrency(stats.spend)} icon={PackageSearch} helper="From linked purchase orders" />
              </div>
            </CollapsibleAnalytics>

            <div className="supplier-dashboard-grid">
              <Panel title="Recent Suppliers">
                {recentSuppliers.length ? recentSuppliers.map(supplier => (
                  <SupplierMiniRow key={supplier.id} supplier={supplier} onOpen={openSupplier} />
                )) : <EmptyState title="No recent suppliers" body="Create suppliers or connect supplier records to see activity here." />}
              </Panel>
              <Panel title="Top Suppliers">
                {topSuppliers.length ? topSuppliers.map(supplier => (
                  <button key={supplier.id} type="button" className="supplier-top-row" onClick={() => openSupplier(supplier)}>
                    <span><strong>{supplier.name}</strong><small>{supplier.category}</small></span>
                    <b>{formatCurrency(supplier.spend)}</b>
                  </button>
                )) : <EmptyState title="No supplier spend yet" body="Purchase orders connected to suppliers will build this ranking." />}
              </Panel>
            </div>
          </section>
        )}

        {activeSection === 'Suppliers' && (
          <section className="supplier-section">
            <div className="supplier-card">
              <div className="supplier-card-head">
                <div>
                  <h2>Suppliers</h2>
                  <p>{filteredSuppliers.length} supplier records</p>
                </div>
                <button type="button" className="supplier-secondary" onClick={() => setShowCreate(true)}><Plus size={15} /> Add Supplier</button>
              </div>
              {filteredSuppliers.length ? (
                <div className="supplier-table-wrap">
                  <table className="supplier-table">
                    <thead>
                      <tr>
                        <th>Supplier Name</th>
                        <th>Category</th>
                        <th>Contact Person</th>
                        <th>Email</th>
                        <th>Phone</th>
                        <th>Rating</th>
                        <th>Status</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredSuppliers.map(supplier => (
                        <tr key={supplier.id}>
                          <td data-label="Supplier Name"><button type="button" className="supplier-link" onClick={() => openSupplier(supplier)}>{supplier.name}</button></td>
                          <td data-label="Category">{supplier.category || '-'}</td>
                          <td data-label="Contact Person">{supplier.contactPerson || '-'}</td>
                          <td data-label="Email">{supplier.email || '-'}</td>
                          <td data-label="Phone">{supplier.phone || '-'}</td>
                          <td data-label="Rating"><Rating value={supplier.rating} /></td>
                          <td data-label="Status"><Badge status={supplier.status} /></td>
                          <td data-label="Actions">
                            <button type="button" className="supplier-icon-button" aria-label={`Open ${supplier.name}`} onClick={() => openSupplier(supplier)}><MoreHorizontal size={17} /></button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : <EmptyState title="No suppliers found" body="Supplier records will appear here once created for this company." />}
            </div>
          </section>
        )}

        {activeSection === 'Supplier Details' && (
          <section className="supplier-section">
            {selectedSupplier ? (
              <div className="supplier-details-grid">
                <section className="supplier-card">
                  <div className="supplier-profile">
                    <span>{initials(selectedSupplier.name)}</span>
                    <div>
                      <h2>{selectedSupplier.name}</h2>
                      <p>{selectedSupplier.category || 'General Supplier'}</p>
                      <Badge status={selectedSupplier.status} />
                    </div>
                  </div>
                  <div className="supplier-facts">
                    <Fact icon={Mail} label="Email" value={selectedSupplier.email || '-'} />
                    <Fact icon={Phone} label="Phone" value={selectedSupplier.phone || '-'} />
                    <Fact icon={UsersRound} label="Contact" value={selectedSupplier.contactPerson || '-'} />
                    <Fact icon={FileText} label="Payment Terms" value={selectedSupplier.paymentTerms || '-'} />
                  </div>
                </section>

                <Panel title="Recent Transactions">
                  {selectedSupplier.transactions.length ? selectedSupplier.transactions.slice(0, 5).map(transaction => (
                    <div key={transaction.id} className="supplier-transaction-row">
                      <span><strong>{transaction.reference}</strong><small>{formatDate(transaction.date)} - {transaction.status}</small></span>
                      <b>{formatCurrency(transaction.amount)}</b>
                    </div>
                  )) : <EmptyState title="No transactions yet" body="Purchase orders for this supplier will appear here." compact />}
                </Panel>

                <Panel title="Uploaded Documents">
                  {selectedSupplier.documents.length ? selectedSupplier.documents.map(document => (
                    <DocumentRow key={document.id} document={document} supplierName={selectedSupplier.name} />
                  )) : <EmptyState title="No documents uploaded" body="Contracts, permits, certifications, and invoices will appear here." compact />}
                </Panel>
              </div>
            ) : <EmptyState title="No supplier selected" body="Create or select a supplier to view profile details." />}
          </section>
        )}

        {activeSection === 'Documents' && (
          <section className="supplier-section">
            <div className="supplier-card">
              <div className="supplier-card-head">
                <div>
                  <h2>Supplier Documents</h2>
                  <p>Contracts, permits, certifications, and invoices linked to supplier records.</p>
                </div>
              </div>
              {documents.length ? (
                <div className="supplier-doc-grid">
                  {documents.map(document => <DocumentRow key={`${document.supplier.id}-${document.id}`} document={document} supplierName={document.supplier.name} />)}
                </div>
              ) : <EmptyState title="No supplier files yet" body="Upload documents on supplier records and they will be listed here." />}
            </div>
          </section>
        )}

        {activeSection === 'Settings' && (
          <section className="supplier-section supplier-settings-grid">
            <Panel title="Supplier Categories">
              {categories.length ? categories.map(category => <SettingPill key={category} label={category} />) : <EmptyState title="No categories yet" body="Categories are generated from supplier records." compact />}
            </Panel>
            <Panel title="Supplier Status Options">
              {statusOptions.map(status => <SettingPill key={status} label={status} />)}
            </Panel>
            <Panel title="Approval Settings">
              <div className="supplier-setting-line"><span>Require approval for new suppliers</span><strong>{settings.requireApproval ? 'On' : 'Off'}</strong></div>
              <div className="supplier-setting-line"><span>Require documents before activation</span><strong>{settings.requireDocuments ? 'On' : 'Off'}</strong></div>
              <div className="supplier-setting-line"><span>Default payment review</span><strong>{settings.paymentReview}</strong></div>
            </Panel>
          </section>
        )}
      </main>

      {showCreate && (
        <div className="supplier-modal-backdrop" onMouseDown={() => setShowCreate(false)}>
          <form className="supplier-modal" onMouseDown={event => event.stopPropagation()} onSubmit={handleCreate}>
            <div className="supplier-modal-head">
              <div>
                <h2>New Supplier</h2>
                <p>Add a supplier profile for the active company.</p>
              </div>
              <button type="button" aria-label="Close supplier form" onClick={() => setShowCreate(false)}><X size={18} /></button>
            </div>
            <div className="supplier-form-grid">
              <label>Supplier Name *<input value={form.name} onChange={event => setForm({ ...form, name: event.target.value })} placeholder="e.g. Agcang SM Hardware" autoComplete="organization" required /></label>
              <label>Category<select value={form.category} onChange={event => setForm({ ...form, category: event.target.value })}>
                <option value="">Select category</option>
                {categoryOptions.map(category => <option key={category} value={category}>{category}</option>)}
              </select></label>
              <label>Contact Person<input value={form.contactPerson} onChange={event => setForm({ ...form, contactPerson: event.target.value })} placeholder="e.g. Marojin Lao" autoComplete="name" /></label>
              <label>Email<input type="email" value={form.email} onChange={event => setForm({ ...form, email: event.target.value })} placeholder="supplier@example.com" autoComplete="email" /></label>
              <label>Phone<input value={form.phone} onChange={event => setForm({ ...form, phone: event.target.value })} placeholder="e.g. 0945 785 0160" inputMode="tel" autoComplete="tel" /></label>
              <label>Status<select value={form.status} onChange={event => setForm({ ...form, status: event.target.value as SupplierStatus })}>{statusOptions.map(status => <option key={status}>{status}</option>)}</select></label>
              <label className="wide">Payment Terms<input value={form.paymentTerms} onChange={event => setForm({ ...form, paymentTerms: event.target.value })} placeholder="e.g. 30 Days" autoComplete="off" /></label>
            </div>
            <div className="supplier-modal-actions">
              <button type="button" className="supplier-secondary" onClick={() => setShowCreate(false)}>Cancel</button>
              <button type="submit" className="supplier-primary">Save Supplier</button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}

function KpiCard({ title, value, icon: Icon, helper }: { title: string; value: string; icon: ComponentType<{ size?: number }>; helper: string }) {
  return (
    <article className="supplier-kpi">
      <span><Icon size={22} /></span>
      <div>
        <small>{title}</small>
        <strong>{value}</strong>
        <em>{helper}</em>
      </div>
    </article>
  )
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="supplier-card">
      <div className="supplier-card-head"><h2>{title}</h2></div>
      {children}
    </section>
  )
}

function SupplierMiniRow({ supplier, onOpen }: { supplier: SupplierRecord; onOpen: (supplier: SupplierRecord) => void }) {
  return (
    <button type="button" className="supplier-mini-row" onClick={() => onOpen(supplier)}>
      <span>{initials(supplier.name)}</span>
      <div><strong>{supplier.name}</strong><small>{supplier.category || 'General Supplier'}</small></div>
      <ChevronRight size={16} />
    </button>
  )
}

function DocumentRow({ document, supplierName }: { document: SupplierDocument; supplierName: string }) {
  return (
    <div className="supplier-document-row">
      <span><FileText size={17} /></span>
      <div><strong>{document.name}</strong><small>{supplierName} - {document.type} - {formatDate(document.uploadedAt)}</small></div>
      <Badge status={document.status === 'Expired' ? 'Blocked' : 'Active'} />
    </div>
  )
}

function Fact({ icon: Icon, label, value }: { icon: ComponentType<{ size?: number }>; label: string; value: string }) {
  return (
    <div className="supplier-fact">
      <Icon size={17} />
      <span><small>{label}</small><strong>{value}</strong></span>
    </div>
  )
}

function Rating({ value }: { value: number }) {
  const rounded = Math.max(0, Math.min(5, Math.round(value || 0)))
  return (
    <span className="supplier-rating" aria-label={`${rounded} star rating`}>
      {Array.from({ length: 5 }).map((_, index) => <Star key={index} size={13} fill={index < rounded ? 'currentColor' : 'none'} />)}
    </span>
  )
}

function Badge({ status }: { status: SupplierStatus | string }) {
  const normalized = status.toLowerCase()
  const tone = normalized.includes('active') ? 'green' : normalized.includes('pending') ? 'orange' : normalized.includes('block') ? 'red' : 'gray'
  return <span className={`supplier-badge ${tone}`}>{status}</span>
}

function SettingPill({ label }: { label: string }) {
  return <span className="supplier-setting-pill">{label}</span>
}

function EmptyState({ title, body, compact = false }: { title: string; body: string; compact?: boolean }) {
  return (
    <StateFeedback
      className={`supplier-empty${compact ? ' compact' : ''}`}
      size={compact ? 'compact' : 'section'}
      icon={<PackageSearch size={compact ? 26 : 40} />}
      title={title}
      message={body}
    />
  )
}

function buildSupplierTransactions(rows: StoredRow[]) {
  return rows.reduce<Record<string, SupplierTransaction[]>>((map, row, index) => {
    const supplierName = textFrom(row.supplierName) || textFrom(row.supplier)
    if (!supplierName) return map
    const transaction: SupplierTransaction = {
      id: textFrom(row.id) || `po-${index}`,
      reference: textFrom(row.poNumber) || textFrom(row.reference) || `PO-${index + 1}`,
      date: textFrom(row.orderDate) || textFrom(row.date) || textFrom(row.createdAt),
      amount: moneyValue(row.total ?? row.amount ?? row.grandTotal),
      status: textFrom(row.status) || 'Open',
    }
    const key = supplierName.toLowerCase()
    map[key] = [...(map[key] || []), transaction]
    return map
  }, {})
}

function normalizeSupplier(row: StoredRow, index: number, companyId: string, orderTransactions: Record<string, SupplierTransaction[]>): SupplierRecord | null {
  const name = textFrom(row.name) || textFrom(row.supplierName)
  if (!name) return null
  const transactions = orderTransactions[name.toLowerCase()] || []
  const documents = readArray(row.documents).filter(isRecord).map((document, documentIndex) => ({
    id: textFrom(document.id) || `${name}-document-${documentIndex}`,
    name: textFrom(document.name) || textFrom(document.fileName) || 'Supplier document',
    type: textFrom(document.type) || textFrom(document.category) || 'Document',
    uploadedAt: textFrom(document.uploadedAt) || textFrom(document.createdAt),
    status: textFrom(document.status) || 'Active',
  }))

  return {
    id: textFrom(row.id) || `supplier-${index}`,
    companyId: textFrom(row.companyId) || companyId,
    name,
    category: textFrom(row.category) || textFrom(row.type) || firstSupplyType(row.supplies) || 'General Supplier',
    contactPerson: textFrom(row.contactPerson) || textFrom(row.contact) || textFrom(row.primaryContact),
    email: textFrom(row.email),
    phone: textFrom(row.phone),
    rating: numberValue(row.rating),
    status: normalizeStatus(textFrom(row.status)),
    paymentTerms: textFrom(row.paymentTerms) || textFrom(row.terms),
    spend: moneyValue(row.spend ?? row.totalSpend) || transactions.reduce((sum, transaction) => sum + transaction.amount, 0),
    notes: textFrom(row.notes),
    documents,
    transactions,
    createdAt: textFrom(row.createdAt) || textFrom(row.updatedAt),
    source: row,
  }
}

function loadRows(key: string, companyId: string) {
  const scoped = companyId ? companyScopedKey(key, companyId) : key
  const rows = [...readStored(key), ...(scoped === key ? [] : readStored(scoped))]
  return uniqueRows(rows).filter(row => {
    const rowCompanyId = textFrom(row.companyId)
    return !companyId || !rowCompanyId || rowCompanyId === companyId
  })
}

function persistRows(key: string, rows: StoredRow[], companyId: string) {
  if (typeof window === 'undefined') return
  const unique = uniqueRows(rows)
  window.localStorage.setItem(key, JSON.stringify(unique))
  if (companyId) window.localStorage.setItem(companyScopedKey(key, companyId), JSON.stringify(unique))
  window.dispatchEvent(new Event('storage'))
}

function readStored(key: string): StoredRow[] {
  if (typeof window === 'undefined') return []
  try {
    const parsed = JSON.parse(window.localStorage.getItem(key) || '[]') as unknown
    return Array.isArray(parsed) ? parsed.filter(isRecord) : []
  } catch {
    return []
  }
}

function loadSettings(companyId: string) {
  const key = companyId ? companyScopedKey(settingsKey, companyId) : settingsKey
  if (typeof window === 'undefined') return { requireApproval: true, requireDocuments: false, paymentReview: 'Finance' }
  try {
    const parsed = JSON.parse(window.localStorage.getItem(key) || '{}') as StoredRow
    return {
      requireApproval: typeof parsed.requireApproval === 'boolean' ? parsed.requireApproval : true,
      requireDocuments: typeof parsed.requireDocuments === 'boolean' ? parsed.requireDocuments : false,
      paymentReview: textFrom(parsed.paymentReview) || 'Finance',
    }
  } catch {
    return { requireApproval: true, requireDocuments: false, paymentReview: 'Finance' }
  }
}

function uniqueRows(rows: StoredRow[]) {
  const seen = new Set<string>()
  return rows.filter((row, index) => {
    const key = textFrom(row.id) || textFrom(row.name) || textFrom(row.supplierName) || String(index)
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

function firstSupplyType(value: unknown) {
  const first = readArray(value).find(isRecord)
  return first ? textFrom(first.itemType) || textFrom(first.type) : ''
}

function normalizeStatus(value: string): SupplierStatus {
  const status = value.toLowerCase()
  if (status.includes('block')) return 'Blocked'
  if (status.includes('inactive')) return 'Inactive'
  if (status.includes('pending')) return 'Pending'
  return 'Active'
}

function readArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : []
}

function isRecord(value: unknown): value is StoredRow {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value))
}

function textFrom(value: unknown) {
  if (typeof value === 'string') return value.trim()
  if (typeof value === 'number' && Number.isFinite(value)) return String(value)
  return ''
}

function moneyValue(value: unknown) {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string') {
    const parsed = Number(value.replace(/[^0-9.-]/g, ''))
    return Number.isFinite(parsed) ? parsed : 0
  }
  return 0
}

function numberValue(value: unknown) {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string') {
    const parsed = Number(value.replace(/[^0-9.-]/g, ''))
    return Number.isFinite(parsed) ? parsed : 0
  }
  return 0
}

function uniqueValues(values: string[]) {
  return [...new Set(values)].sort((a, b) => a.localeCompare(b))
}

function initials(value: string) {
  return value.split(/\s+/).filter(Boolean).map(part => part[0]).join('').slice(0, 2).toUpperCase() || 'S'
}

function dateValue(value: string) {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? 0 : date.getTime()
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', maximumFractionDigits: 2 }).format(value).replace('PHP', 'Php')
}

function formatDate(value: string) {
  if (!value) return 'No date'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(date)
}

const supplierCss = `
.supplier-workspace {
  min-height: 100vh;
  height: 100dvh;
  display: grid;
  grid-template-columns: 250px minmax(0, 1fr);
  background: #f3f4f6;
  color: #0f172a;
  overflow: hidden;
}
.supplier-mobile-backdrop,
.supplier-mobile-bar {
  display: none;
}
.supplier-sidebar {
  min-height: 100dvh;
  background: #030303;
  color: #ededed;
  padding: 18px 10px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.supplier-brand {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 0 6px 4px;
}
.supplier-brand div {
  min-width: 0;
}
.supplier-brand > span {
  width: 38px;
  height: 38px;
  border-radius: 10px;
  background: #fff;
  color: #030303;
  display: grid;
  place-items: center;
  font-weight: 900;
}
.supplier-brand strong,
.supplier-brand small {
  display: block;
}
.supplier-brand strong {
  font-size: 16px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.supplier-brand small {
  color: #a1a1a1;
  font-size: 12px;
  margin-top: 3px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.supplier-sidebar-close {
  display: none;
}
.supplier-back {
  min-height: 40px;
  display: flex;
  align-items: center;
  gap: 10px;
  border: 1px solid #242424;
  border-radius: 10px;
  background: #0b0b0b;
  color: #ededed;
  text-decoration: none;
  padding: 0 12px;
  font-size: 13px;
  font-weight: 850;
}
.supplier-sidebar nav {
  display: grid;
  gap: 5px;
}
.supplier-nav-label {
  padding: 4px 10px 6px;
  color: #737373;
  text-transform: uppercase;
  letter-spacing: 1px;
  font-size: 10px;
  font-weight: 900;
}
.supplier-sidebar nav button {
  min-height: 40px;
  border: 0;
  border-radius: 10px;
  background: transparent;
  color: #e5e7eb !important;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 0 10px;
  text-align: left;
  font: inherit;
  font-size: 13px;
  font-weight: 850;
  cursor: pointer;
}
.supplier-sidebar nav button svg {
  color: #a1a1a1 !important;
}
.supplier-sidebar nav button span {
  color: inherit !important;
}
.supplier-sidebar nav button:not(.active):hover {
  background: #1f1f1f;
  color: #ffffff !important;
}
.supplier-sidebar nav button:not(.active):hover svg {
  color: #ffffff !important;
}
.supplier-sidebar nav button.active {
  background: #dcfce7 !important;
  color: #052e16 !important;
}
.supplier-sidebar nav button.active svg {
  color: #16a34a !important;
}
/* Supplier sidebar — light theme */
.supplier-sidebar { background: #ffffff; color: #0f172a; border-right: 1px solid #e5e7eb; }
.supplier-brand > span { background: #0f172a; color: #ffffff; }
.supplier-brand small { color: #000000; }
.supplier-back { border-color: #e5e7eb; background: #f8fafc; color: #0f172a; }
.supplier-back:hover { background: #f1f5f9; }
.supplier-nav-label { color: #000000; }
.supplier-sidebar nav button { color: #334155 !important; }
.supplier-sidebar nav button svg { color: #000000 !important; }
.supplier-sidebar nav button:not(.active):hover { background: #f1f5f9 !important; color: #0f172a !important; }
.supplier-sidebar nav button:not(.active):hover svg { color: #334155 !important; }
.supplier-main {
  min-width: 0;
  height: 100dvh;
  overflow-y: auto;
  padding: 28px max(28px, calc((100% - var(--wf-content-max)) / 2));
}
.supplier-header {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(220px, 420px) minmax(190px, max-content) auto;
  gap: 14px;
  align-items: center;
  margin-bottom: 22px;
}
.supplier-header h1 {
  margin: 0;
  font-size: clamp(26px, 2.4vw, 34px);
  letter-spacing: -0.03em;
}
.supplier-header p {
  margin: 6px 0 0;
  color: #000000;
  font-size: 14px;
}
.supplier-search {
  min-height: 44px;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  display: flex;
  align-items: center;
  gap: 10px;
  background: #fff;
  padding: 0 13px;
  color: #000000;
}
.supplier-search input {
  width: 100%;
  min-width: 0;
  border: 0;
  outline: 0;
  background: transparent;
  font: inherit;
  font-size: 13px;
}
.supplier-primary,
.supplier-secondary,
.supplier-icon-button {
  min-height: 42px;
  border-radius: 11px;
  border: 1px solid #e5e7eb;
  background: #fff;
  color: #0f172a;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 0 14px;
  font: inherit;
  font-size: 13px;
  font-weight: 850;
  cursor: pointer;
}
.supplier-primary {
  background: #16a34a;
  border-color: #16a34a;
  color: #fff;
}
.supplier-icon-button {
  width: 38px;
  padding: 0;
}
.supplier-section {
  display: grid;
  gap: 16px;
}
.supplier-kpis {
  display: grid;
  grid-template-columns: repeat(4, minmax(150px, 1fr));
  gap: 14px;
}
.supplier-kpi,
.supplier-card {
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 16px;
  box-shadow: 0 14px 34px rgba(15, 23, 42, 0.05);
}
.supplier-kpi {
  min-height: 112px;
  padding: 18px;
  display: flex;
  align-items: center;
  gap: 14px;
}
.supplier-kpi > span {
  width: 50px;
  height: 50px;
  border-radius: 14px;
  display: grid;
  place-items: center;
  background: #dcfce7;
  color: #16a34a;
}
.supplier-kpi small,
.supplier-kpi em {
  display: block;
  color: #000000;
  font-size: 12px;
  font-style: normal;
  font-weight: 800;
}
.supplier-kpi strong {
  display: block;
  margin: 6px 0;
  font-size: 24px;
  line-height: 1;
}
.supplier-dashboard-grid,
.supplier-details-grid,
.supplier-settings-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
}
.supplier-card {
  padding: 18px;
  min-width: 0;
}
.supplier-card-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 14px;
}
.supplier-card-head h2 {
  margin: 0;
  font-size: 16px;
}
.supplier-card-head p {
  margin: 4px 0 0;
  color: #000000;
  font-size: 12px;
}
.supplier-mini-row,
.supplier-top-row {
  width: 100%;
  min-height: 58px;
  border: 0;
  border-radius: 12px;
  background: transparent;
  display: grid;
  align-items: center;
  gap: 10px;
  text-align: left;
  cursor: pointer;
}
.supplier-mini-row {
  grid-template-columns: 38px minmax(0, 1fr) 18px;
}
.supplier-top-row {
  grid-template-columns: minmax(0, 1fr) auto;
  padding: 0 4px;
}
.supplier-mini-row:hover,
.supplier-top-row:hover {
  background: #f8fafc;
}
.supplier-mini-row > span {
  width: 34px;
  height: 34px;
  border-radius: 10px;
  background: #ecfdf5;
  color: #16a34a;
  display: grid;
  place-items: center;
  font-weight: 900;
}
.supplier-mini-row strong,
.supplier-mini-row small,
.supplier-top-row strong,
.supplier-top-row small {
  display: block;
}
.supplier-mini-row small,
.supplier-top-row small {
  color: #000000;
  font-size: 12px;
  margin-top: 3px;
}
.supplier-table-wrap {
  overflow: auto;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
}
.supplier-table {
  width: 100%;
  min-width: 960px;
  border-collapse: collapse;
}
.supplier-table th,
.supplier-table td {
  padding: 14px 12px;
  border-bottom: 1px solid #e5e7eb;
  text-align: left;
  font-size: 12px;
}
.supplier-table th {
  background: #f8fafc;
  color: #000000;
  text-transform: uppercase;
  font-size: 10px;
}
.supplier-link {
  border: 0;
  background: transparent;
  color: #2563eb;
  font: inherit;
  font-size: 12px;
  font-weight: 900;
  cursor: pointer;
}
.supplier-rating {
  display: inline-flex;
  gap: 2px;
  color: #f59e0b;
}
.supplier-badge {
  display: inline-flex;
  align-items: center;
  min-height: 24px;
  border-radius: 8px;
  padding: 0 9px;
  font-size: 10px;
  font-weight: 900;
  text-transform: uppercase;
}
.supplier-badge.green { background: #dcfce7; color: #15803d; }
.supplier-badge.orange { background: #ffedd5; color: #f97316; }
.supplier-badge.red { background: #fee2e2; color: #ef4444; }
.supplier-badge.gray { background: #f1f5f9; color: #000000; }
.supplier-profile {
  display: flex;
  align-items: center;
  gap: 14px;
}
.supplier-profile > span {
  width: 58px;
  height: 58px;
  border-radius: 16px;
  display: grid;
  place-items: center;
  background: #dcfce7;
  color: #16a34a;
  font-size: 18px;
  font-weight: 950;
}
.supplier-profile h2 {
  margin: 0;
  font-size: 20px;
}
.supplier-profile p {
  margin: 5px 0 8px;
  color: #000000;
}
.supplier-facts {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
  margin-top: 18px;
}
.supplier-fact {
  min-width: 0;
  display: grid;
  grid-template-columns: 20px minmax(0, 1fr);
  gap: 8px;
  padding: 12px;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
}
.supplier-fact svg {
  color: #16a34a;
}
.supplier-fact small,
.supplier-fact strong {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.supplier-fact small {
  color: #000000;
  font-size: 11px;
  margin-bottom: 3px;
}
.supplier-transaction-row,
.supplier-document-row,
.supplier-setting-line {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 0;
  border-bottom: 1px solid #e5e7eb;
}
.supplier-document-row {
  justify-content: flex-start;
}
.supplier-document-row > span {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  background: #ecfdf5;
  color: #16a34a;
  display: grid;
  place-items: center;
}
.supplier-document-row > div {
  flex: 1;
  min-width: 0;
}
.supplier-transaction-row strong,
.supplier-transaction-row small,
.supplier-document-row strong,
.supplier-document-row small {
  display: block;
}
.supplier-transaction-row small,
.supplier-document-row small {
  color: #000000;
  font-size: 12px;
  margin-top: 3px;
}
.supplier-doc-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 10px 18px;
}
.supplier-setting-pill {
  min-height: 38px;
  display: inline-flex;
  align-items: center;
  border: 1px solid #e5e7eb;
  border-radius: 999px;
  padding: 0 14px;
  margin: 0 8px 8px 0;
  font-size: 13px;
  font-weight: 850;
  background: #fff;
}
.supplier-empty {
  min-height: 220px;
  display: grid;
  place-items: center;
  align-content: center;
  gap: 8px;
  text-align: center;
  color: #000000;
  border: 1px dashed #cbd5e1;
  border-radius: 14px;
  padding: 24px;
}
.supplier-empty.compact {
  min-height: 140px;
}
.supplier-empty strong {
  color: #0f172a;
}
.supplier-empty p {
  max-width: 360px;
  margin: 0;
  font-size: 13px;
}
.supplier-modal-backdrop {
  position: fixed;
  inset: 0;
  z-index: 80;
  display: grid;
  place-items: center;
  background: rgba(15, 23, 42, .42);
  padding: 18px;
}
.supplier-modal {
  width: min(620px, 100%);
  max-height: calc(100dvh - 36px);
  overflow: auto;
  border: 1px solid #e5e7eb;
  border-radius: 18px;
  background: #fff;
  box-shadow: 0 30px 80px rgba(15,23,42,.24);
}
.supplier-modal-head {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  padding: 20px;
  border-bottom: 1px solid #e5e7eb;
}
.supplier-modal-head h2 {
  margin: 0;
}
.supplier-modal-head p {
  margin: 5px 0 0;
  color: #000000;
  font-size: 13px;
}
.supplier-modal-head button {
  width: 38px;
  height: 38px;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  background: #fff;
  cursor: pointer;
}
.supplier-form-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
  padding: 20px;
}
.supplier-form-grid label {
  display: grid;
  gap: 8px;
  color: #334155;
  font-size: 12px;
  font-weight: 900;
}
.supplier-form-grid label.wide {
  grid-column: 1 / -1;
}
.supplier-form-grid input,
.supplier-form-grid select {
  box-sizing: border-box;
  min-height: 44px;
  width: 100%;
  border: 1px solid #d1d5db;
  border-radius: 11px;
  padding: 0 12px;
  outline: 0;
  font: inherit;
  font-size: 13px;
  color: #0f172a;
  background: #fff;
}
.supplier-form-grid input::placeholder {
  color: #000000;
}
.supplier-form-grid input:focus,
.supplier-form-grid select:focus {
  border-color: #16a34a;
  box-shadow: 0 0 0 3px rgba(22, 163, 74, .12);
}
.supplier-modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 14px 20px;
  border-top: 1px solid #e5e7eb;
}
@media (max-width: 1180px) {
  .supplier-workspace {
    grid-template-columns: 82px minmax(0, 1fr);
  }
  .supplier-brand div,
  .supplier-back,
  .supplier-nav-label,
  .supplier-sidebar nav button span {
    display: none;
  }
  .supplier-brand {
    justify-content: center;
  }
  .supplier-sidebar nav button {
    justify-content: center;
    padding: 0;
  }
  .supplier-header,
  .supplier-kpis,
  .supplier-dashboard-grid,
  .supplier-details-grid,
  .supplier-settings-grid {
    grid-template-columns: 1fr 1fr;
  }
  .supplier-header > div:first-child {
    grid-column: 1 / -1;
  }
}
@media (max-width: 900px) {
  .supplier-workspace {
    display: block;
    height: auto;
    overflow: visible;
  }
  .supplier-mobile-bar {
    min-height: 64px;
    display: flex;
    align-items: center;
    gap: 12px;
    position: sticky;
    top: 0;
    z-index: 35;
    padding: 10px 14px;
    border-bottom: 1px solid #e5e7eb;
    background: rgba(255,255,255,.96);
    backdrop-filter: blur(12px);
  }
  .supplier-mobile-menu {
    width: 42px;
    height: 42px;
    border: 1px solid #d1d5db;
    border-radius: 12px;
    background: #fff;
    color: #030303;
    display: grid;
    place-items: center;
    cursor: pointer;
  }
  .supplier-mobile-brand {
    min-width: 0;
    display: flex;
    align-items: center;
    gap: 10px;
  }
  .supplier-mobile-brand > span {
    width: 38px;
    height: 38px;
    border-radius: 10px;
    background: #030303;
    color: #fff;
    display: grid;
    place-items: center;
    font-weight: 900;
  }
  .supplier-mobile-brand strong,
  .supplier-mobile-brand small {
    display: block;
  }
  .supplier-mobile-brand strong {
    font-size: 14px;
    line-height: 1.1;
  }
  .supplier-mobile-brand small {
    color: #000000;
    font-size: 11px;
    margin-top: 2px;
  }
  .supplier-mobile-backdrop {
    position: fixed;
    inset: 0;
    z-index: 110;
    display: block;
    opacity: 0;
    pointer-events: none;
    border: 0;
    background: rgba(15, 23, 42, .46);
    transition: opacity .2s ease;
  }
  .supplier-mobile-backdrop.is-open {
    opacity: 1;
    pointer-events: auto;
  }
  .supplier-sidebar {
    width: min(86vw, 300px);
    min-height: 100dvh;
    height: 100dvh;
    position: fixed;
    top: 0;
    left: 0;
    z-index: 120;
    padding: 20px 10px 16px;
    flex-direction: column;
    gap: 14px;
    overflow-y: auto;
    transform: translateX(-105%);
    transition: transform .24s ease;
    box-shadow: 22px 0 56px rgba(15, 23, 42, .35);
  }
  .supplier-sidebar.is-open {
    transform: translateX(0);
  }
  .supplier-brand {
    display: flex;
    padding: 0 10px 4px;
  }
  .supplier-brand div,
  .supplier-back,
  .supplier-nav-label,
  .supplier-sidebar nav button span {
    display: block;
  }
  .supplier-sidebar-close {
    width: 34px;
    height: 34px;
    margin-left: auto;
    flex: 0 0 auto;
    border: 1px solid #e5e7eb;
    border-radius: 10px;
    background: #ffffff;
    color: #0f172a;
    display: grid;
    place-items: center;
    cursor: pointer;
  }
  .supplier-back {
    display: flex;
    margin: 0 0 4px;
  }
  .supplier-sidebar nav {
    display: grid;
    gap: 5px;
  }
  .supplier-sidebar nav button {
    min-width: 0;
    min-height: 40px;
    justify-content: flex-start;
    padding: 0 10px;
  }
  .supplier-sidebar nav button span {
    display: inline;
    white-space: nowrap;
  }
  .supplier-main {
    height: auto;
    min-height: 100vh;
    padding: 18px 14px 28px;
    overflow: visible;
  }
  .supplier-header,
  .supplier-kpis,
  .supplier-dashboard-grid,
  .supplier-details-grid,
  .supplier-settings-grid,
  .supplier-facts {
    grid-template-columns: 1fr;
  }
  .supplier-table-wrap {
    border: 0;
    overflow: visible;
  }
  .supplier-table,
  .supplier-table thead,
  .supplier-table tbody,
  .supplier-table tr,
  .supplier-table td {
    display: block;
    min-width: 0;
    width: 100%;
  }
  .supplier-table thead {
    display: none;
  }
  .supplier-table tr {
    border: 1px solid #e5e7eb;
    border-radius: 14px;
    padding: 14px;
    margin-bottom: 12px;
    background: #fff;
  }
  .supplier-table td {
    border: 0;
    padding: 7px 0;
    display: grid;
    grid-template-columns: 118px minmax(0, 1fr);
    gap: 10px;
  }
  .supplier-table td::before {
    content: attr(data-label);
    color: #000000;
    font-size: 11px;
    font-weight: 900;
    text-transform: uppercase;
  }
  .supplier-modal-backdrop {
    align-items: end;
  }
  .supplier-modal {
    border-radius: 18px 18px 0 0;
  }
  .supplier-form-grid {
    grid-template-columns: 1fr;
  }
  .supplier-modal-actions {
    display: grid;
  }
}
`
