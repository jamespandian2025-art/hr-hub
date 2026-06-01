'use client'

import { ChangeEvent, DragEvent, FormEvent, useEffect, useMemo, useRef, useState } from 'react'
import {
  CalendarDays,
  ChevronDown,
  Clock3,
  CloudUpload,
  Download,
  FileText,
  Filter,
  Grid3X3,
  MoreHorizontal,
  Package,
  Plus,
  Search,
  Star,
  Trash2,
  Truck,
  Upload,
  WalletCards,
  X,
} from 'lucide-react'
import { companyChangeEvent, companyScopedKey, getActiveCompany } from '@/lib/tenant/company'

const font = 'var(--font-body)'
const purchaseOrdersKey = 'flowsys-procurement-purchase-orders'
const suppliersKey = 'flowsys-suppliers'
const pricebookKey = 'flowsys-pricebook-items'
const projectsKey = 'wiseflow-project-management-state'

type StoredRow = Record<string, unknown>
type OrderStatus = 'Draft' | 'Open' | 'Partially Received' | 'Received' | 'Cancelled' | 'Overdue'
type ViewMode = 'table' | 'cards'
type DetailTab = 'Details' | 'Items' | 'Receiving' | 'Activity' | 'Attachments'

type SupplierOption = {
  id: string
  name: string
  contact: string
  email: string
  phone: string
}

type PricebookOption = {
  id: string
  name: string
  sku: string
  unit: string
  price: number
  cost: number
  vendor: string
}

type ProjectOption = {
  id: string
  name: string
}

type PurchaseOrderItem = {
  id: string
  itemId: string
  name: string
  sku: string
  unit: string
  quantity: string
  unitPrice: string
  discount: string
  taxRate: string
}

type AttachmentRecord = {
  id: string
  name: string
  size: string
  type: string
}

type PurchaseOrderForm = {
  supplierId: string
  supplierName: string
  orderDate: string
  deliveryDate: string
  paymentTerms: string
  currency: string
  shippingMethod: string
  referenceNotes: string
  deliverTo: string
  attentionTo: string
  projectId: string
  remarks: string
  orderDiscount: string
}

type NormalizedOrder = {
  id: string
  poNumber: string
  supplierId: string
  supplierName: string
  supplierEmail: string
  supplierPhone: string
  orderDate: string
  deliveryDate: string
  status: OrderStatus
  total: number
  subtotal: number
  discount: number
  vat: number
  receivedPercent: number
  paymentTerms: string
  currency: string
  shippingMethod: string
  referenceNotes: string
  amountReceived: number
  items: Array<{
    name: string
    sku: string
    unit: string
    quantity: number
    unitPrice: number
    discount: number
    taxRate: number
    amount: number
  }>
  attachments: AttachmentRecord[]
  activity: string[]
  source: StoredRow
}

const emptyForm: PurchaseOrderForm = {
  supplierId: '',
  supplierName: '',
  orderDate: todayInput(),
  deliveryDate: '',
  paymentTerms: '',
  currency: 'PHP',
  shippingMethod: '',
  referenceNotes: '',
  deliverTo: '',
  attentionTo: '',
  projectId: '',
  remarks: '',
  orderDiscount: '',
}

const paymentTermOptions = ['COD', '7 Days', '15 Days', '30 Days', '45 Days', '60 Days']
const currencyOptions = [
  { value: 'PHP', label: 'PHP - Philippine Peso' },
  { value: 'USD', label: 'USD - US Dollar' },
  { value: 'EUR', label: 'EUR - Euro' },
]
const shippingMethodOptions = ['Pickup', 'Supplier delivery', 'Courier', 'Freight', 'Site delivery']
const detailTabs: DetailTab[] = ['Details', 'Items', 'Receiving', 'Activity', 'Attachments']

const statusConfig: Record<OrderStatus, { label: string; tone: string }> = {
  Draft: { label: 'Draft', tone: 'gray' },
  Open: { label: 'Open', tone: 'blue' },
  'Partially Received': { label: 'Partially Received', tone: 'orange' },
  Received: { label: 'Received', tone: 'green' },
  Cancelled: { label: 'Cancelled', tone: 'gray' },
  Overdue: { label: 'Overdue', tone: 'red' },
}

export default function PurchaseOrdersPage() {
  const [companyId, setCompanyId] = useState('')
  const [storedOrders, setStoredOrders] = useState<StoredRow[]>([])
  const [suppliers, setSuppliers] = useState<SupplierOption[]>([])
  const [pricebook, setPricebook] = useState<PricebookOption[]>([])
  const [projects, setProjects] = useState<ProjectOption[]>([])
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')
  const [supplierFilter, setSupplierFilter] = useState('All')
  const [dateFilter, setDateFilter] = useState('All')
  const [activeTab, setActiveTab] = useState('All')
  const [viewMode, setViewMode] = useState<ViewMode>('table')
  const [showFilters, setShowFilters] = useState(false)
  const [showCreate, setShowCreate] = useState(false)
  const [selectedId, setSelectedId] = useState('')
  const [detailTab, setDetailTab] = useState<DetailTab>('Details')
  const [openActionId, setOpenActionId] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [form, setForm] = useState<PurchaseOrderForm>(emptyForm)
  const [items, setItems] = useState<PurchaseOrderItem[]>([])
  const [itemSearch, setItemSearch] = useState('')
  const [attachments, setAttachments] = useState<AttachmentRecord[]>([])
  const [message, setMessage] = useState('')
  const [showSupplierDialog, setShowSupplierDialog] = useState(false)
  const [newSupplierName, setNewSupplierName] = useState('')
  const importOrdersRef = useRef<HTMLInputElement | null>(null)
  const importItemsRef = useRef<HTMLInputElement | null>(null)
  const attachmentRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    const load = () => {
      const activeCompany = getActiveCompany()
      const activeCompanyId = activeCompany?.id || ''
      setCompanyId(activeCompanyId)
      setStoredOrders(loadRows(purchaseOrdersKey, activeCompanyId))
      setSuppliers(loadSuppliers(activeCompanyId))
      setPricebook(loadPricebook(activeCompanyId))
      setProjects(loadProjects(activeCompanyId))
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

  const orders = useMemo(() => storedOrders.map((order, index) => normalizeOrder(order, index, suppliers)).filter(Boolean) as NormalizedOrder[], [storedOrders, suppliers])
  const poNumber = useMemo(() => nextPoNumber(orders), [orders])
  const supplierOptions = useMemo(() => uniqueValues(orders.map(order => order.supplierName).filter(Boolean)), [orders])

  const stats = useMemo(() => {
    const totalValue = orders.reduce((sum, order) => sum + order.total, 0)
    const count = (status: OrderStatus) => orders.filter(order => order.status === status).length
    return {
      total: orders.length,
      totalValue,
      open: count('Open') + count('Draft'),
      partiallyReceived: count('Partially Received'),
      received: count('Received'),
      cancelled: count('Cancelled'),
      overdue: count('Overdue'),
    }
  }, [orders])

  const tabs = useMemo(() => [
    { label: 'All', count: orders.length },
    { label: 'Open', count: stats.open },
    { label: 'Partially Received', count: stats.partiallyReceived },
    { label: 'Received', count: stats.received },
    { label: 'Cancelled', count: stats.cancelled },
    { label: 'Overdue', count: stats.overdue },
  ], [orders.length, stats])

  const filteredOrders = useMemo(() => {
    const needle = search.trim().toLowerCase()
    return orders.filter(order => {
      const matchesSearch = !needle || [
        order.poNumber,
        order.supplierName,
        order.referenceNotes,
        ...order.items.map(item => item.name),
      ].some(value => value.toLowerCase().includes(needle))
      const matchesStatus = statusFilter === 'All' || order.status === statusFilter
      const matchesTab = activeTab === 'All'
        || (activeTab === 'Open' ? order.status === 'Open' || order.status === 'Draft' : order.status === activeTab)
      const matchesSupplier = supplierFilter === 'All' || order.supplierName === supplierFilter
      const matchesDate = dateFilter === 'All' || isInDateFilter(order.orderDate, dateFilter)
      return matchesSearch && matchesStatus && matchesTab && matchesSupplier && matchesDate
    })
  }, [activeTab, dateFilter, orders, search, statusFilter, supplierFilter])

  const totalPages = Math.max(1, Math.ceil(filteredOrders.length / pageSize))
  const currentPage = Math.min(page, totalPages)
  const pageStart = filteredOrders.length ? (currentPage - 1) * pageSize + 1 : 0
  const pageEnd = Math.min(currentPage * pageSize, filteredOrders.length)
  const visibleOrders = filteredOrders.slice((currentPage - 1) * pageSize, currentPage * pageSize)
  const selectedOrder = orders.find(order => order.id === selectedId) || visibleOrders[0] || filteredOrders[0]

  const filteredItems = useMemo(() => {
    const needle = itemSearch.trim().toLowerCase()
    if (!needle) return items
    return items.filter(item => [item.name, item.sku, item.unit].some(value => value.toLowerCase().includes(needle)))
  }, [itemSearch, items])

  const summary = useMemo(() => {
    const subtotal = items.reduce((sum, item) => sum + itemBaseTotal(item), 0)
    const rowDiscount = items.reduce((sum, item) => sum + moneyValue(item.discount), 0)
    const orderDiscount = moneyValue(form.orderDiscount)
    const totalDiscount = Math.min(subtotal, rowDiscount + orderDiscount)
    const afterDiscount = Math.max(0, subtotal - totalDiscount)
    const vat = items.reduce((sum, item) => sum + itemTaxTotal(item), 0)
    const total = Math.max(0, afterDiscount + vat)
    const totalQuantity = items.reduce((sum, item) => sum + numberValue(item.quantity), 0)
    return { subtotal, rowDiscount, orderDiscount, totalDiscount, afterDiscount, vat, total, totalQuantity }
  }, [form.orderDiscount, items])

  const selectedSupplier = suppliers.find(supplier => supplier.id === form.supplierId)
  const selectedProject = projects.find(project => project.id === form.projectId)

  function persist(nextOrders: StoredRow[]) {
    const unique = uniqueRows(nextOrders)
    setStoredOrders(unique)
    persistRows(purchaseOrdersKey, unique, companyId)
  }

  function resetFilters() {
    setSearch('')
    setStatusFilter('All')
    setSupplierFilter('All')
    setDateFilter('All')
    setActiveTab('All')
    setPage(1)
  }

  function patchForm(patch: Partial<PurchaseOrderForm>) {
    setForm(previous => ({ ...previous, ...patch }))
  }

  function handleSupplierChange(value: string) {
    const supplier = suppliers.find(item => item.id === value)
    patchForm({ supplierId: value, supplierName: supplier?.name || '' })
  }

  function addItem(option?: PricebookOption) {
    setItems(previous => [
      ...previous,
      {
        id: `poi-${Date.now()}-${previous.length}`,
        itemId: option?.id || '',
        name: option?.name || '',
        sku: option?.sku || '',
        unit: option?.unit || '',
        quantity: option ? '1' : '',
        unitPrice: option ? String(option.price || option.cost || 0) : '',
        discount: '',
        taxRate: '12',
      },
    ])
  }

  function addFromPricebook() {
    const needle = itemSearch.trim().toLowerCase()
    const option = (needle
      ? pricebook.find(item => [item.name, item.sku, item.vendor].some(value => value.toLowerCase().includes(needle)))
      : pricebook[0])
    if (!option) {
      setMessage('No pricebook items found yet. Add an item manually or create pricebook records first.')
      addItem()
      return
    }
    addItem(option)
    setMessage(`${option.name} added from pricebook.`)
  }

  function updateItem(id: string, patch: Partial<PurchaseOrderItem>) {
    setItems(previous => previous.map(item => item.id === id ? { ...item, ...patch } : item))
  }

  function choosePricebookItem(rowId: string, optionId: string) {
    const option = pricebook.find(item => item.id === optionId)
    if (!option) {
      updateItem(rowId, { itemId: '', name: '', sku: '', unit: '', unitPrice: '' })
      return
    }
    updateItem(rowId, {
      itemId: option.id,
      name: option.name,
      sku: option.sku,
      unit: option.unit,
      unitPrice: String(option.price || option.cost || 0),
      quantity: items.find(item => item.id === rowId)?.quantity || '1',
    })
  }

  function createSupplier() {
    const name = newSupplierName.trim()
    if (!name) return
    const supplier: StoredRow = {
      id: `supplier-${Date.now()}`,
      companyId,
      name,
      contact: '',
      email: '',
      phone: '',
      notes: '',
      supplies: [],
    }
    const nextStored = [supplier, ...loadRows(suppliersKey, companyId)]
    persistRows(suppliersKey, nextStored, companyId)
    const option = normalizeSupplier(supplier, 0)
    setSuppliers(previous => [option, ...previous])
    patchForm({ supplierId: option.id, supplierName: option.name })
    setNewSupplierName('')
    setShowSupplierDialog(false)
  }

  function addAttachments(files: FileList | File[]) {
    const next = Array.from(files).map(file => ({
      id: `att-${Date.now()}-${file.name}`,
      name: file.name,
      size: formatFileSize(file.size),
      type: file.type || 'file',
    }))
    setAttachments(previous => [...previous, ...next])
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault()
    addAttachments(event.dataTransfer.files)
  }

  function handleImportItems(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      const imported = parseItemCsv(String(reader.result || ''))
      if (imported.length) setItems(previous => [...previous, ...imported])
      event.target.value = ''
    }
    reader.readAsText(file)
  }

  function handleImportOrders(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      const imported = parseOrderCsv(String(reader.result || ''), companyId)
      if (imported.length) persist([...imported, ...storedOrders])
      event.target.value = ''
    }
    reader.readAsText(file)
  }

  function saveOrder(status: 'Draft' | 'Open') {
    if (!form.supplierId && !form.supplierName.trim()) {
      setMessage('Select or add a supplier before saving this purchase order.')
      return
    }
    const validItems = items.filter(item => item.name.trim())
    if (status === 'Open' && validItems.length === 0) {
      setMessage('Add at least one item before creating this purchase order.')
      return
    }
    const record: StoredRow = {
      id: `po-${Date.now()}`,
      companyId,
      poNumber,
      supplierId: form.supplierId,
      supplierName: form.supplierName || selectedSupplier?.name || '',
      supplier: form.supplierName || selectedSupplier?.name || '',
      supplierEmail: selectedSupplier?.email || '',
      supplierPhone: selectedSupplier?.phone || '',
      status,
      orderDate: form.orderDate,
      deliveryDate: form.deliveryDate,
      date: form.orderDate,
      paymentTerms: form.paymentTerms,
      currency: form.currency,
      shippingMethod: form.shippingMethod,
      referenceNotes: form.referenceNotes,
      deliverTo: form.deliverTo,
      attentionTo: form.attentionTo,
      projectId: form.projectId,
      projectName: selectedProject?.name || '',
      remarks: form.remarks,
      receivedPercent: 0,
      amountReceived: 0,
      items: validItems.map(item => ({
        name: item.name,
        sku: item.sku,
        unit: item.unit,
        quantity: numberValue(item.quantity),
        unitPrice: moneyValue(item.unitPrice),
        discount: moneyValue(item.discount),
        taxRate: numberValue(item.taxRate),
        amount: itemGrandTotal(item),
      })),
      subtotal: summary.subtotal,
      discount: summary.totalDiscount,
      vat: summary.vat,
      total: summary.total,
      grandTotal: summary.total,
      amount: summary.total,
      attachments,
      activity: [`${status === 'Draft' ? 'Draft saved' : 'Purchase order created'} on ${formatDate(new Date().toISOString())}`],
      createdAt: new Date().toISOString(),
    }
    const next = [record, ...storedOrders]
    persist(next)
    setSelectedId(String(record.id))
    setMessage(status === 'Draft' ? `${poNumber} saved as draft.` : `${poNumber} created.`)
    setForm({ ...emptyForm, orderDate: todayInput() })
    setItems([])
    setAttachments([])
    setShowCreate(false)
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    saveOrder('Open')
  }

  function updateStatus(order: NormalizedOrder, status: OrderStatus) {
    const next = storedOrders.map(record => {
      const normalized = normalizeOrder(record, 0, suppliers)
      if (!normalized || normalized.id !== order.id) return record
      const receivedPercent = status === 'Received' ? 100 : status === 'Partially Received' ? Math.max(normalized.receivedPercent, 50) : normalized.receivedPercent
      return {
        ...record,
        status,
        receivedPercent,
        amountReceived: normalized.total * (receivedPercent / 100),
        activity: [`Marked ${status} on ${formatDate(new Date().toISOString())}`, ...readStringArray(record.activity)],
        updatedAt: new Date().toISOString(),
      }
    })
    persist(next)
    setOpenActionId('')
  }

  const activeFilterCount = [statusFilter, supplierFilter, dateFilter].filter(value => value !== 'All').length

  return (
    <main className="po-page" style={{ fontFamily: font }}>
      <style>{purchaseOrderCss}</style>

      <section className="po-page-head">
        <div>
          <div className="po-breadcrumb">
            <span>Procurement</span>
            <span>/</span>
            <strong>Purchase Orders</strong>
          </div>
          <div className="po-title-row">
            <span className="po-title-icon"><FileText size={22} /></span>
            <div>
              <h1>Purchase Orders <Star size={18} /></h1>
              <p>Manage and track all purchase orders and their fulfillment.</p>
            </div>
          </div>
        </div>
        <div className="po-actions">
          <button type="button" className="po-secondary-button" onClick={() => setViewMode(viewMode === 'table' ? 'cards' : 'table')}>
            <Grid3X3 size={16} /> Views <ChevronDown size={14} />
          </button>
          <button type="button" className="po-secondary-button" onClick={() => setShowFilters(value => !value)}>
            <Filter size={16} /> Filters <span>{activeFilterCount}</span>
          </button>
          <button type="button" className="po-secondary-button" onClick={() => { setActiveTab(activeTab === 'Received' ? 'All' : 'Received'); setPage(1) }}>
            <Package size={16} /> Group by <ChevronDown size={14} />
          </button>
          <button type="button" className="po-icon-button" aria-label="Reset purchase order filters" onClick={resetFilters}>
            <MoreHorizontal size={18} />
          </button>
          <button type="button" className="po-secondary-button" onClick={() => importOrdersRef.current?.click()}>
            Import CSV
          </button>
          <input ref={importOrdersRef} type="file" accept=".csv,text/csv" hidden onChange={handleImportOrders} />
          <button type="button" className="po-primary-button" onClick={() => setShowCreate(true)}>
            <Plus size={17} /> New PO <ChevronDown size={14} />
          </button>
        </div>
      </section>

      <section className="po-stats" aria-label="Purchase order summary">
        <KpiCard title="Total POs" value={String(stats.total)} helper={stats.total ? 'Across saved records' : 'No orders yet'} icon={FileText} tone="green" />
        <KpiCard title="Total Value" value={formatCurrency(stats.totalValue)} helper="Across all POs" icon={WalletCards} tone="purple" />
        <KpiCard title="Open POs" value={String(stats.open)} helper={stats.total ? `${percent(stats.open, stats.total)} of total` : 'No open orders'} icon={CalendarDays} tone="blue" />
        <KpiCard title="Received" value={String(stats.received)} helper={stats.total ? `${percent(stats.received, stats.total)} of total` : 'No received orders'} icon={Truck} tone="orange" />
        <KpiCard title="Overdue" value={String(stats.overdue)} helper={stats.total ? `${percent(stats.overdue, stats.total)} of total` : 'No overdue orders'} icon={Clock3} tone="red" />
      </section>

      <section className="po-tabs" aria-label="Purchase order status tabs">
        {tabs.map(tab => (
          <button
            key={tab.label}
            type="button"
            className={activeTab === tab.label ? 'active' : ''}
            onClick={() => { setActiveTab(tab.label); setPage(1) }}
          >
            {tab.label} <span>{tab.count}</span>
          </button>
        ))}
      </section>

      <section className="po-workspace">
        <div className="po-toolbar">
          <label className="po-search">
            <Search size={17} />
            <input value={search} onChange={event => { setSearch(event.target.value); setPage(1) }} placeholder="Search by PO number, supplier, or item..." aria-label="Search purchase orders" />
          </label>
          <SelectControl label="Status" value={statusFilter} onChange={value => { setStatusFilter(value); setPage(1) }} options={['All', ...Object.keys(statusConfig)]} />
          <SelectControl label="Supplier" value={supplierFilter} onChange={value => { setSupplierFilter(value); setPage(1) }} options={['All', ...supplierOptions]} />
          <SelectControl label="Date Range" value={dateFilter} onChange={value => { setDateFilter(value); setPage(1) }} options={['All', 'This Month', 'Last 30 Days', 'This Year']} />
          <button type="button" className="po-secondary-button compact" onClick={() => setShowFilters(value => !value)}>
            <Filter size={16} /> More filters
          </button>
          <div className="po-view-toggle">
            <button type="button" className={viewMode === 'table' ? 'active' : ''} onClick={() => setViewMode('table')} aria-label="Table view"><Grid3X3 size={16} /></button>
            <button type="button" className={viewMode === 'cards' ? 'active' : ''} onClick={() => setViewMode('cards')} aria-label="Cards view"><Package size={16} /></button>
          </div>
        </div>

        {showFilters && (
          <div className="po-filter-panel">
            <SelectControl label="Status" value={statusFilter} onChange={value => { setStatusFilter(value); setPage(1) }} options={['All', ...Object.keys(statusConfig)]} />
            <SelectControl label="Supplier" value={supplierFilter} onChange={value => { setSupplierFilter(value); setPage(1) }} options={['All', ...supplierOptions]} />
            <SelectControl label="Date Range" value={dateFilter} onChange={value => { setDateFilter(value); setPage(1) }} options={['All', 'This Month', 'Last 30 Days', 'This Year']} />
            <button type="button" className="po-secondary-button" onClick={resetFilters}>Reset filters</button>
          </div>
        )}

        {orders.length === 0 ? (
          <EmptyPurchaseOrders onCreate={() => setShowCreate(true)} />
        ) : (
          <div className={`po-data-layout${selectedOrder ? ' with-details' : ''}`}>
            <div className="po-list-card">
              {viewMode === 'table' ? (
                <div className="po-table-wrap">
                  <table className="po-table">
                    <thead>
                      <tr>
                        <th aria-label="Select order"></th>
                        <th>PO Number</th>
                        <th>Supplier</th>
                        <th>Order Date</th>
                        <th>Delivery Date</th>
                        <th>Status</th>
                        <th>Total (PHP)</th>
                        <th>Received</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {visibleOrders.map(order => (
                        <tr key={order.id} className={selectedOrder?.id === order.id ? 'selected' : ''} onClick={() => setSelectedId(order.id)}>
                          <td data-label="Select"><input type="checkbox" checked={selectedOrder?.id === order.id} onChange={() => setSelectedId(order.id)} aria-label={`Select ${order.poNumber}`} /></td>
                          <td data-label="PO Number"><button type="button" className="po-link-button" onClick={() => setSelectedId(order.id)}>{order.poNumber}</button></td>
                          <td data-label="Supplier">{order.supplierName}</td>
                          <td data-label="Order Date">{formatDate(order.orderDate)}</td>
                          <td data-label="Delivery Date">{formatDate(order.deliveryDate)}</td>
                          <td data-label="Status"><Badge tone={statusConfig[order.status].tone}>{statusConfig[order.status].label}</Badge></td>
                          <td data-label="Total">{formatCurrency(order.total, order.currency)}</td>
                          <td data-label="Received">
                            <span className="po-progress-text">{order.receivedPercent}%</span>
                            <span className="po-progress"><span style={{ width: `${order.receivedPercent}%` }} /></span>
                          </td>
                          <td data-label="Actions">
                            <div className="po-row-actions" onClick={event => event.stopPropagation()}>
                              <button type="button" aria-label={`Open actions for ${order.poNumber}`} onClick={() => setOpenActionId(openActionId === order.id ? '' : order.id)}>
                                <MoreHorizontal size={16} />
                              </button>
                              {openActionId === order.id && (
                                <div className="po-action-menu">
                                  <button type="button" onClick={() => { setSelectedId(order.id); setOpenActionId('') }}>Open details</button>
                                  <button type="button" onClick={() => updateStatus(order, 'Partially Received')}>Mark partial</button>
                                  <button type="button" onClick={() => updateStatus(order, 'Received')}>Mark received</button>
                                  <button type="button" onClick={() => updateStatus(order, 'Cancelled')}>Cancel PO</button>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="po-card-grid">
                  {visibleOrders.map(order => (
                    <article key={order.id} className={`po-order-card${selectedOrder?.id === order.id ? ' selected' : ''}`} onClick={() => setSelectedId(order.id)}>
                      <div>
                        <strong>{order.poNumber}</strong>
                        <Badge tone={statusConfig[order.status].tone}>{order.status}</Badge>
                      </div>
                      <h3>{order.supplierName}</h3>
                      <p>{formatDate(order.orderDate)} / {formatDate(order.deliveryDate)}</p>
                      <div className="po-card-meta">
                        <span>{order.receivedPercent}% received</span>
                        <strong>{formatCurrency(order.total, order.currency)}</strong>
                      </div>
                      <span className="po-progress"><span style={{ width: `${order.receivedPercent}%` }} /></span>
                    </article>
                  ))}
                </div>
              )}

              {filteredOrders.length === 0 && (
                <div className="po-inline-empty">
                  <strong>No matching purchase orders</strong>
                  <span>Adjust search or filters to see more records.</span>
                  <button type="button" onClick={resetFilters}>Clear filters</button>
                </div>
              )}

              <div className="po-pagination">
                <span>Showing {pageStart} to {pageEnd} of {filteredOrders.length} entries</span>
                <div>
                  <button type="button" disabled={currentPage === 1} onClick={() => setPage(value => Math.max(1, value - 1))} aria-label="Previous page">&lt;</button>
                  <strong>{currentPage}</strong>
                  <button type="button" disabled={currentPage === totalPages} onClick={() => setPage(value => Math.min(totalPages, value + 1))} aria-label="Next page">&gt;</button>
                  <select value={pageSize} onChange={event => { setPageSize(Number(event.target.value)); setPage(1) }} aria-label="Rows per page">
                    {[10, 25, 50].map(size => <option key={size} value={size}>{size} / page</option>)}
                  </select>
                </div>
              </div>
            </div>

            {selectedOrder && (
              <OrderDetails order={selectedOrder} activeTab={detailTab} onTabChange={setDetailTab} onClose={() => setSelectedId('')} onStatusChange={status => updateStatus(selectedOrder, status)} />
            )}
          </div>
        )}
      </section>

      {showCreate && (
        <div className="po-drawer-backdrop" role="presentation" onMouseDown={() => setShowCreate(false)}>
          <aside className="po-create-drawer" role="dialog" aria-modal="true" aria-labelledby="create-po-title" onMouseDown={event => event.stopPropagation()}>
            <div className="po-drawer-head">
              <div>
                <h2 id="create-po-title">Create Purchase Order</h2>
                <p>Fill in the details below to create a new purchase order.</p>
              </div>
              <button type="button" aria-label="Close purchase order form" onClick={() => setShowCreate(false)}><X size={20} /></button>
            </div>

            <form className="po-form-layout" onSubmit={handleSubmit}>
              <div className="po-form-main">
                <section className="po-form-card">
                  <h3>PO Information</h3>
                  <div className="po-form-grid">
                    <label>
                      Supplier <sup>*</sup>
                      <span className="po-combo-row">
                        <select value={form.supplierId} onChange={event => handleSupplierChange(event.target.value)} aria-label="Supplier">
                          <option value="">Select supplier</option>
                          {suppliers.map(supplier => <option key={supplier.id} value={supplier.id}>{supplier.name}</option>)}
                        </select>
                        <button type="button" aria-label="Add supplier" onClick={() => setShowSupplierDialog(true)}><Plus size={17} /></button>
                      </span>
                    </label>
                    <label>
                      PO Number <sup>*</sup>
                      <input value={poNumber} readOnly aria-label="PO number" />
                      <small className="po-field-help">Auto-generated</small>
                    </label>
                    <label>
                      Order Date <sup>*</sup>
                      <input type="date" value={form.orderDate} onChange={event => patchForm({ orderDate: event.target.value })} required />
                    </label>
                    <label>
                      Delivery Date <sup>*</sup>
                      <input type="date" value={form.deliveryDate} onChange={event => patchForm({ deliveryDate: event.target.value })} />
                    </label>
                    <label>
                      Payment Terms <sup>*</sup>
                      <select value={form.paymentTerms} onChange={event => patchForm({ paymentTerms: event.target.value })}>
                        <option value="">Select payment terms</option>
                        {paymentTermOptions.map(option => <option key={option} value={option}>{option}</option>)}
                      </select>
                    </label>
                    <label>
                      Currency <sup>*</sup>
                      <select value={form.currency} onChange={event => patchForm({ currency: event.target.value })}>
                        {currencyOptions.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
                      </select>
                    </label>
                    <label>
                      Shipping Method
                      <select value={form.shippingMethod} onChange={event => patchForm({ shippingMethod: event.target.value })}>
                        <option value="">Select shipping method</option>
                        {shippingMethodOptions.map(option => <option key={option} value={option}>{option}</option>)}
                      </select>
                    </label>
                    <label className="wide">
                      Reference / Notes
                      <textarea value={form.referenceNotes} onChange={event => patchForm({ referenceNotes: event.target.value })} placeholder="Enter reference or notes (optional)" />
                    </label>
                  </div>
                </section>

                <section className="po-form-card">
                  <div className="po-card-head">
                    <h3>Items</h3>
                    <div>
                      <button type="button" className="po-outline-button" onClick={addFromPricebook}><Plus size={16} /> Add from Pricebook</button>
                      <button type="button" className="po-outline-button dark" onClick={() => importItemsRef.current?.click()}><Upload size={16} /> Import Items</button>
                      <input ref={importItemsRef} type="file" accept=".csv,text/csv" hidden onChange={handleImportItems} />
                    </div>
                  </div>
                  <label className="po-search inner">
                    <Search size={17} />
                    <input value={itemSearch} onChange={event => setItemSearch(event.target.value)} placeholder="Search by item name, SKU, or description..." />
                  </label>

                  {items.length ? (
                    <div className="po-items-table-wrap">
                      <table className="po-items-table">
                        <thead>
                          <tr>
                            <th>#</th>
                            <th>Item</th>
                            <th>SKU</th>
                            <th>Unit</th>
                            <th>Quantity</th>
                            <th>Unit Price ({form.currency})</th>
                            <th>Discount</th>
                            <th>Tax</th>
                            <th>Amount ({form.currency})</th>
                            <th>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredItems.map((item, index) => (
                            <tr key={item.id}>
                              <td data-label="#">{index + 1}</td>
                              <td data-label="Item">
                                <select value={item.itemId} onChange={event => choosePricebookItem(item.id, event.target.value)} aria-label="Select item">
                                  <option value="">Custom item</option>
                                  {pricebook.map(option => <option key={option.id} value={option.id}>{option.name}</option>)}
                                </select>
                                <input value={item.name} onChange={event => updateItem(item.id, { name: event.target.value })} placeholder="Item description" />
                              </td>
                              <td data-label="SKU"><input value={item.sku} onChange={event => updateItem(item.id, { sku: event.target.value })} placeholder="SKU" /></td>
                              <td data-label="Unit"><input value={item.unit} onChange={event => updateItem(item.id, { unit: event.target.value })} placeholder="Unit" /></td>
                              <td data-label="Quantity"><input inputMode="decimal" value={item.quantity} onChange={event => updateItem(item.id, { quantity: event.target.value })} placeholder="0" /></td>
                              <td data-label="Unit Price"><input inputMode="decimal" value={item.unitPrice} onChange={event => updateItem(item.id, { unitPrice: event.target.value })} placeholder="0.00" /></td>
                              <td data-label="Discount"><input inputMode="decimal" value={item.discount} onChange={event => updateItem(item.id, { discount: event.target.value })} placeholder="0.00" /></td>
                              <td data-label="Tax"><input inputMode="decimal" value={item.taxRate} onChange={event => updateItem(item.id, { taxRate: event.target.value })} placeholder="12" /></td>
                              <td data-label="Amount"><strong>{formatCurrency(itemGrandTotal(item), form.currency)}</strong></td>
                              <td data-label="Actions">
                                <button type="button" className="po-icon-button danger" onClick={() => setItems(previous => previous.filter(row => row.id !== item.id))} aria-label="Remove item">
                                  <Trash2 size={16} />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      <div className="po-items-footer">
                        <button type="button" className="po-outline-button" onClick={() => addItem()}><Plus size={16} /> Add Item</button>
                        <span>{items.length} {items.length === 1 ? 'item' : 'items'}</span>
                      </div>
                    </div>
                  ) : (
                    <div className="po-empty-items">
                      <Package size={36} />
                      <strong>No items added yet</strong>
                      <span>Add items to this purchase order to see them here.</span>
                      <button type="button" className="po-outline-button" onClick={addFromPricebook}><Plus size={16} /> Add from Pricebook</button>
                    </div>
                  )}
                </section>

                <section className="po-form-card">
                  <h3>Additional Information</h3>
                  <div className="po-form-grid">
                    <label>
                      Deliver To
                      <select value={form.deliverTo} onChange={event => patchForm({ deliverTo: event.target.value })}>
                        <option value="">Select deliver to</option>
                        <option value="Main Office">Main Office</option>
                        <option value="Warehouse">Warehouse</option>
                        <option value="Project Site">Project Site</option>
                      </select>
                    </label>
                    <label>
                      Attention To
                      <input value={form.attentionTo} onChange={event => patchForm({ attentionTo: event.target.value })} placeholder="Enter contact person" />
                    </label>
                    <label>
                      Project (Optional)
                      <select value={form.projectId} onChange={event => patchForm({ projectId: event.target.value })}>
                        <option value="">Select project</option>
                        {projects.map(project => <option key={project.id} value={project.id}>{project.name}</option>)}
                      </select>
                    </label>
                    <label className="wide">
                      Remarks
                      <textarea value={form.remarks} onChange={event => patchForm({ remarks: event.target.value })} placeholder="Enter any additional remarks (optional)" />
                    </label>
                  </div>
                </section>
              </div>

              <aside className="po-form-side">
                <section className="po-form-card po-summary-card">
                  <h3>Order Summary</h3>
                  <SummaryRow label="Subtotal" value={formatCurrency(summary.subtotal, form.currency)} />
                  <label className="po-discount-row">
                    <span>Discount</span>
                    <input inputMode="decimal" value={form.orderDiscount} onChange={event => patchForm({ orderDiscount: event.target.value })} placeholder="0.00" aria-label="Order discount" />
                  </label>
                  <SummaryRow label="Subtotal After Discount" value={formatCurrency(summary.afterDiscount, form.currency)} />
                  <SummaryRow label="VAT (12%)" value={formatCurrency(summary.vat, form.currency)} />
                  <div className="po-total-row">
                    <strong>Total Amount</strong>
                    <strong>{formatCurrency(summary.total, form.currency)}</strong>
                  </div>
                </section>

                <section className="po-form-card">
                  <h3>Summary</h3>
                  <SummaryRow label="Total Items" value={String(items.length)} />
                  <SummaryRow label="Total Quantity" value={String(summary.totalQuantity)} />
                  <SummaryRow label="Payment Terms" value={form.paymentTerms || '-'} />
                  <SummaryRow label="Delivery Date" value={formatDate(form.deliveryDate)} />
                </section>

                <section className="po-form-card">
                  <h3>Attachments</h3>
                  <div className="po-dropzone" onDragOver={event => event.preventDefault()} onDrop={handleDrop} onClick={() => attachmentRef.current?.click()} role="button" tabIndex={0}>
                    <CloudUpload size={30} />
                    <strong>Drag and drop files here</strong>
                    <span>or click to browse</span>
                    <small>PDF, JPG, PNG (max. 10MB)</small>
                  </div>
                  <input ref={attachmentRef} type="file" multiple hidden onChange={event => event.target.files && addAttachments(event.target.files)} />
                  {attachments.length > 0 && (
                    <div className="po-attachment-list">
                      {attachments.map(file => (
                        <div key={file.id}>
                          <span>{file.name}</span>
                          <button type="button" aria-label={`Remove ${file.name}`} onClick={() => setAttachments(previous => previous.filter(item => item.id !== file.id))}><X size={14} /></button>
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              </aside>

              <footer className="po-form-footer">
                <span>{message}</span>
                <div>
                  <button type="button" className="po-secondary-footer" onClick={() => setShowCreate(false)}>Cancel</button>
                  <button type="button" className="po-secondary-footer" onClick={() => saveOrder('Draft')}>Save as Draft</button>
                  <button type="submit" className="po-primary-footer">Create Purchase Order <ChevronDown size={15} /></button>
                </div>
              </footer>
            </form>
          </aside>
        </div>
      )}

      {showSupplierDialog && (
        <div className="po-modal-backdrop" onMouseDown={() => setShowSupplierDialog(false)}>
          <div className="po-mini-modal" role="dialog" aria-modal="true" aria-labelledby="new-supplier-title" onMouseDown={event => event.stopPropagation()}>
            <div>
              <h2 id="new-supplier-title">Add Supplier</h2>
              <button type="button" aria-label="Close supplier dialog" onClick={() => setShowSupplierDialog(false)}><X size={18} /></button>
            </div>
            <label>
              Supplier name
              <input value={newSupplierName} onChange={event => setNewSupplierName(event.target.value)} placeholder="Supplier or vendor name" />
            </label>
            <button type="button" className="po-primary-footer" onClick={createSupplier}>Save Supplier</button>
          </div>
        </div>
      )}
    </main>
  )
}

function KpiCard({ title, value, helper, icon: Icon, tone }: { title: string; value: string; helper: string; icon: React.ComponentType<{ size?: number }>; tone: string }) {
  return (
    <article className="po-kpi">
      <span className={`po-kpi-icon ${tone}`}><Icon size={22} /></span>
      <div>
        <span>{title}</span>
        <strong>{value}</strong>
        <small>{helper}</small>
      </div>
    </article>
  )
}

function SelectControl({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (value: string) => void }) {
  return (
    <label className="po-select">
      <span>{label}:</span>
      <select value={value} onChange={event => onChange(event.target.value)}>
        {options.map(option => <option key={option} value={option}>{option}</option>)}
      </select>
    </label>
  )
}

function Badge({ tone, children }: { tone: string; children: React.ReactNode }) {
  return <span className={`po-badge ${tone}`}>{children}</span>
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="po-summary-row">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  )
}

function EmptyPurchaseOrders({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="po-empty">
      <span><FileText size={46} /></span>
      <h2>No purchase orders yet</h2>
      <p>Create your first purchase order or import a CSV to start tracking supplier orders and fulfillment.</p>
      <button type="button" className="po-primary-button" onClick={onCreate}><Plus size={17} /> New Purchase Order</button>
    </div>
  )
}

function OrderDetails({ order, activeTab, onTabChange, onClose, onStatusChange }: {
  order: NormalizedOrder
  activeTab: DetailTab
  onTabChange: (tab: DetailTab) => void
  onClose: () => void
  onStatusChange: (status: OrderStatus) => void
}) {
  const remaining = Math.max(0, order.total - order.amountReceived)
  return (
    <aside className="po-detail-card">
      <div className="po-detail-head">
        <div>
          <strong>{order.poNumber}</strong>
          <Badge tone={statusConfig[order.status].tone}>{order.status}</Badge>
        </div>
        <button type="button" aria-label="Close order details" onClick={onClose}><X size={17} /></button>
      </div>

      <div className="po-supplier-block">
        <span>{initials(order.supplierName)}</span>
        <div>
          <strong>{order.supplierName}</strong>
          <small>{order.supplierEmail || 'No supplier email'}</small>
          <small>{order.supplierPhone || 'No phone number'}</small>
        </div>
      </div>

      <div className="po-detail-meta">
        <SummaryRow label="Order Date" value={formatDate(order.orderDate)} />
        <SummaryRow label="Delivery Date" value={formatDate(order.deliveryDate)} />
        <SummaryRow label="Total Amount" value={formatCurrency(order.total, order.currency)} />
      </div>

      <div className="po-detail-tabs">
        {detailTabs.map(tab => (
          <button key={tab} type="button" className={activeTab === tab ? 'active' : ''} onClick={() => onTabChange(tab)}>{tab}</button>
        ))}
      </div>

      {activeTab === 'Details' && (
        <div className="po-detail-body">
          <h3>PO Information</h3>
          <DetailRow label="Payment Terms" value={order.paymentTerms || '-'} />
          <DetailRow label="Currency" value={order.currency} />
          <DetailRow label="Shipping Method" value={order.shippingMethod || '-'} />
          <DetailRow label="Reference / Notes" value={order.referenceNotes || '-'} />
          <h3>Summary</h3>
          <SummaryRow label="Subtotal" value={formatCurrency(order.subtotal, order.currency)} />
          <SummaryRow label="VAT (12%)" value={formatCurrency(order.vat, order.currency)} />
          <SummaryRow label="Amount Received" value={formatCurrency(order.amountReceived, order.currency)} />
          <SummaryRow label="Amount Remaining" value={formatCurrency(remaining, order.currency)} />
        </div>
      )}

      {activeTab === 'Items' && (
        <div className="po-detail-body">
          <h3>Items</h3>
          {order.items.length ? order.items.map((item, index) => (
            <div key={`${item.name}-${index}`} className="po-detail-item">
              <strong>{item.name}</strong>
              <span>{item.quantity} {item.unit || 'unit'} / {formatCurrency(item.amount, order.currency)}</span>
            </div>
          )) : <p>No item details saved.</p>}
        </div>
      )}

      {activeTab === 'Receiving' && (
        <div className="po-detail-body">
          <h3>Receiving</h3>
          <span className="po-progress large"><span style={{ width: `${order.receivedPercent}%` }} /></span>
          <p>{order.receivedPercent}% received against this purchase order.</p>
          <div className="po-detail-actions">
            <button type="button" className="po-secondary-button" onClick={() => onStatusChange('Partially Received')}>Mark Partial</button>
            <button type="button" className="po-primary-button" onClick={() => onStatusChange('Received')}>Mark Received</button>
          </div>
        </div>
      )}

      {activeTab === 'Activity' && (
        <div className="po-detail-body">
          <h3>Activity</h3>
          {order.activity.length ? order.activity.map((entry, index) => <p key={`${entry}-${index}`}>{entry}</p>) : <p>No activity recorded yet.</p>}
        </div>
      )}

      {activeTab === 'Attachments' && (
        <div className="po-detail-body">
          <h3>Attachments</h3>
          {order.attachments.length ? order.attachments.map(file => (
            <div key={file.id || file.name} className="po-detail-item">
              <strong>{file.name}</strong>
              <span>{file.size || 'Saved attachment'}</span>
            </div>
          )) : <p>No attachments saved.</p>}
        </div>
      )}

      <div className="po-detail-actions">
        <button type="button" className="po-secondary-button" onClick={() => downloadPurchaseOrderCsv(order)}><Download size={15} /> Export CSV</button>
        <button type="button" className="po-primary-button" onClick={() => onStatusChange('Received')}><Truck size={15} /> Mark Received</button>
      </div>
    </aside>
  )
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="po-detail-row">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  )
}

function loadRows(key: string, companyId: string) {
  const scoped = companyId ? companyScopedKey(key, companyId) : key
  const scopedRows = scoped === key ? [] : readStored(scoped)
  const globalRows = readStored(key)
  const globalForCompany = scopedRows.length ? globalRows.filter(row => textFrom(row.companyId) === companyId) : globalRows
  const rows = scopedRows.length ? [...scopedRows, ...globalForCompany] : globalForCompany
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

function loadSuppliers(companyId: string) {
  return loadRows(suppliersKey, companyId).map(normalizeSupplier)
}

function loadPricebook(companyId: string) {
  return loadRows(pricebookKey, companyId).map((row, index) => ({
    id: textFrom(row.id) || textFrom(row.sku) || `item-${index}`,
    name: textFrom(row.name) || 'Untitled item',
    sku: textFrom(row.sku),
    unit: textFrom(row.unit) || 'pcs',
    price: moneyValue(row.price ?? row.cost),
    cost: moneyValue(row.cost),
    vendor: textFrom(row.vendor),
  }))
}

function loadProjects(companyId: string) {
  const state = readJson(projectsKey)
  const projects = Array.isArray(state?.projects) ? state.projects.filter(isRecord) : []
  return projects
    .filter(project => !companyId || !textFrom(project.companyId) || textFrom(project.companyId) === companyId)
    .map((project, index) => ({
      id: textFrom(project.id) || `project-${index}`,
      name: textFrom(project.name) || 'Untitled project',
    }))
}

function normalizeSupplier(row: StoredRow, index: number): SupplierOption {
  return {
    id: textFrom(row.id) || textFrom(row.name) || `supplier-${index}`,
    name: textFrom(row.name) || textFrom(row.supplierName) || 'Unnamed supplier',
    contact: textFrom(row.contact),
    email: textFrom(row.email),
    phone: textFrom(row.phone),
  }
}

function normalizeOrder(row: StoredRow, index: number, suppliers: SupplierOption[]): NormalizedOrder | null {
  const poNumber = textFrom(row.poNumber) || textFrom(row.reference) || `PO-${String(index + 1).padStart(4, '0')}`
  const supplierId = textFrom(row.supplierId)
  const supplier = suppliers.find(item => item.id === supplierId)
  const supplierName = textFrom(row.supplierName) || textFrom(row.supplier) || supplier?.name || 'Unknown supplier'
  const items = readArray(row.items).filter(isRecord).map(item => ({
    name: textFrom(item.name) || textFrom(item.description) || 'Item',
    sku: textFrom(item.sku),
    unit: textFrom(item.unit) || textFrom(item.uom),
    quantity: numberValue(item.quantity ?? item.qty),
    unitPrice: moneyValue(item.unitPrice ?? item.price ?? item.cost),
    discount: moneyValue(item.discount),
    taxRate: numberValue(item.taxRate ?? item.tax),
    amount: moneyValue(item.amount ?? item.total),
  }))
  const subtotal = moneyValue(row.subtotal) || items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0)
  const discount = moneyValue(row.discount)
  const vat = moneyValue(row.vat) || moneyValue(row.tax)
  const total = moneyValue(row.total ?? row.grandTotal ?? row.amount) || Math.max(0, subtotal - discount + vat)
  const status = normalizeStatus(textFrom(row.status), textFrom(row.deliveryDate))
  const receivedPercent = clampPercent(numberValue(row.receivedPercent ?? row.received))
  const amountReceived = moneyValue(row.amountReceived) || total * (receivedPercent / 100)

  return {
    id: textFrom(row.id) || poNumber,
    poNumber,
    supplierId,
    supplierName,
    supplierEmail: textFrom(row.supplierEmail) || supplier?.email || '',
    supplierPhone: textFrom(row.supplierPhone) || supplier?.phone || '',
    orderDate: textFrom(row.orderDate) || textFrom(row.date) || textFrom(row.createdAt),
    deliveryDate: textFrom(row.deliveryDate) || textFrom(row.dueDate),
    status,
    total,
    subtotal,
    discount,
    vat,
    receivedPercent: status === 'Received' ? 100 : receivedPercent,
    paymentTerms: textFrom(row.paymentTerms),
    currency: textFrom(row.currency) || 'PHP',
    shippingMethod: textFrom(row.shippingMethod),
    referenceNotes: textFrom(row.referenceNotes) || textFrom(row.notes),
    amountReceived: status === 'Received' ? total : amountReceived,
    items,
    attachments: readArray(row.attachments).filter(isRecord).map((file, fileIndex) => ({
      id: textFrom(file.id) || `attachment-${fileIndex}`,
      name: textFrom(file.name) || textFrom(file.fileName) || 'Attachment',
      size: textFrom(file.size),
      type: textFrom(file.type),
    })),
    activity: readStringArray(row.activity),
    source: row,
  }
}

function normalizeStatus(value: string, deliveryDate: string): OrderStatus {
  const normalized = value.toLowerCase()
  if (normalized.includes('cancel')) return 'Cancelled'
  if (normalized.includes('partial')) return 'Partially Received'
  if (normalized.includes('receive') || normalized.includes('complete')) return 'Received'
  if (normalized.includes('draft')) return 'Draft'
  if (normalized.includes('overdue')) return 'Overdue'
  if (deliveryDate && new Date(deliveryDate).getTime() < startOfToday().getTime()) return 'Overdue'
  return 'Open'
}

function parseItemCsv(text: string): PurchaseOrderItem[] {
  const rows = text.split(/\r?\n/).map(line => line.trim()).filter(Boolean)
  return rows.slice(rows[0]?.toLowerCase().includes('item') ? 1 : 0).map((line, index) => {
    const [name, sku, unit, quantity, unitPrice, discount, taxRate] = splitCsvLine(line)
    return {
      id: `poi-import-${Date.now()}-${index}`,
      itemId: '',
      name: name || '',
      sku: sku || '',
      unit: unit || '',
      quantity: quantity || '1',
      unitPrice: unitPrice || '0',
      discount: discount || '',
      taxRate: taxRate || '12',
    }
  }).filter(item => item.name)
}

function parseOrderCsv(text: string, companyId: string): StoredRow[] {
  const rows = text.split(/\r?\n/).map(line => line.trim()).filter(Boolean)
  return rows.slice(rows[0]?.toLowerCase().includes('po') ? 1 : 0).map((line, index) => {
    const [poNumber, supplierName, orderDate, deliveryDate, status, total] = splitCsvLine(line)
    return {
      id: `po-import-${Date.now()}-${index}`,
      companyId,
      poNumber: poNumber || `PO-IMPORT-${index + 1}`,
      supplierName: supplierName || 'Imported supplier',
      orderDate,
      deliveryDate,
      status: status || 'Open',
      total: moneyValue(total),
      currency: 'PHP',
      items: [],
      activity: [`Imported on ${formatDate(new Date().toISOString())}`],
      createdAt: new Date().toISOString(),
    }
  }).filter(order => textFrom(order.poNumber))
}

function splitCsvLine(line: string) {
  return line.split(',').map(value => value.replace(/^"|"$/g, '').trim())
}

function downloadPurchaseOrderCsv(order: NormalizedOrder) {
  if (typeof window === 'undefined') return
  const rows = [
    ['PO Number', order.poNumber],
    ['Supplier', order.supplierName],
    ['Order Date', order.orderDate],
    ['Delivery Date', order.deliveryDate],
    ['Status', order.status],
    ['Total', String(order.total)],
    [],
    ['Item', 'SKU', 'Quantity', 'Unit', 'Unit Price', 'Amount'],
    ...order.items.map(item => [
      item.name,
      item.sku,
      String(item.quantity),
      item.unit,
      String(item.unitPrice),
      String(item.amount),
    ]),
  ]
  const csv = rows.map(row => row.map(csvEscape).join(',')).join('\n')
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
  const link = document.createElement('a')
  link.href = url
  link.download = `${order.poNumber || 'purchase-order'}.csv`
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

function csvEscape(value: string) {
  if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`
  return value
}

function uniqueRows(rows: StoredRow[]) {
  const seen = new Set<string>()
  return rows.filter((row, index) => {
    const key = textFrom(row.id) || textFrom(row.poNumber) || textFrom(row.reference) || String(index)
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

function nextPoNumber(orders: NormalizedOrder[]) {
  const year = new Date().getFullYear()
  const next = orders.reduce((max, order) => {
    const match = order.poNumber.match(/(\d+)$/)
    return match ? Math.max(max, Number(match[1])) : max
  }, 0) + 1
  return `PO-${year}-${String(next).padStart(4, '0')}`
}

function itemBaseTotal(item: PurchaseOrderItem) {
  return numberValue(item.quantity) * moneyValue(item.unitPrice)
}

function itemTaxTotal(item: PurchaseOrderItem) {
  const taxable = Math.max(0, itemBaseTotal(item) - moneyValue(item.discount))
  return taxable * (numberValue(item.taxRate) / 100)
}

function itemGrandTotal(item: PurchaseOrderItem) {
  return Math.max(0, itemBaseTotal(item) - moneyValue(item.discount) + itemTaxTotal(item))
}

function readJson(key: string) {
  if (typeof window === 'undefined') return null
  try {
    return JSON.parse(window.localStorage.getItem(key) || 'null') as StoredRow | null
  } catch {
    return null
  }
}

function readArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : []
}

function readStringArray(value: unknown) {
  return readArray(value).map(item => String(item)).filter(Boolean)
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

function formatCurrency(value: number, currency = 'PHP') {
  return new Intl.NumberFormat(currency === 'PHP' ? 'en-PH' : 'en-US', {
    style: 'currency',
    currency,
    maximumFractionDigits: 2,
  }).format(value).replace('PHP', 'Php')
}

function formatDate(value: string) {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(date)
}

function formatFileSize(size: number) {
  if (size < 1024) return `${size} B`
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`
  return `${(size / (1024 * 1024)).toFixed(1)} MB`
}

function todayInput() {
  return new Date().toISOString().slice(0, 10)
}

function startOfToday() {
  const date = new Date()
  date.setHours(0, 0, 0, 0)
  return date
}

function isInDateFilter(value: string, filter: string) {
  if (!value) return false
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return false
  const now = new Date()
  if (filter === 'This Month') return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear()
  if (filter === 'This Year') return date.getFullYear() === now.getFullYear()
  if (filter === 'Last 30 Days') {
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - 30)
    return date >= cutoff
  }
  return true
}

function percent(value: number, total: number) {
  if (!total) return '0%'
  return `${Math.round((value / total) * 100)}%`
}

function clampPercent(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)))
}

function uniqueValues(values: string[]) {
  return [...new Set(values)].sort((a, b) => a.localeCompare(b))
}

function initials(value: string) {
  return value.split(/\s+/).map(word => word[0]).join('').slice(0, 2).toUpperCase() || 'PO'
}

const purchaseOrderCss = `
.po-page {
  min-height: 100%;
  padding: 28px;
  color: #0f172a;
}
.po-page-head,
.po-title-row,
.po-actions,
.po-toolbar,
.po-filter-panel,
.po-pagination,
.po-pagination > div,
.po-card-meta,
.po-detail-head,
.po-detail-head > div,
.po-detail-actions {
  display: flex;
  align-items: center;
}
.po-page-head {
  justify-content: space-between;
  gap: 20px;
  margin-bottom: 24px;
}
.po-breadcrumb {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #64748b;
  font-size: 12px;
  margin-bottom: 10px;
}
.po-breadcrumb strong {
  color: #0f172a;
}
.po-title-row {
  gap: 14px;
}
.po-title-icon {
  width: 42px;
  height: 42px;
  border-radius: 13px;
  background: #dcfce7;
  color: #16a34a;
  display: grid;
  place-items: center;
}
.po-title-row h1 {
  margin: 0;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: clamp(25px, 2.3vw, 34px);
  line-height: 1.1;
  letter-spacing: -0.03em;
}
.po-title-row h1 svg {
  color: #94a3b8;
}
.po-title-row p {
  margin: 8px 0 0;
  color: #64748b;
  font-size: 14px;
}
.po-actions {
  gap: 10px;
  flex-wrap: wrap;
  justify-content: flex-end;
}
.po-primary-button,
.po-secondary-button,
.po-icon-button,
.po-row-actions > button,
.po-view-toggle button,
.po-pagination button,
.po-pagination select,
.po-link-button,
.po-detail-head button,
.po-drawer-head button,
.po-outline-button,
.po-secondary-footer,
.po-primary-footer,
.po-inline-empty button {
  min-height: 42px;
  border-radius: 11px;
  border: 1px solid #e5e7eb;
  background: #fff;
  color: #0f172a;
  font: inherit;
  font-size: 13px;
  font-weight: 800;
  cursor: pointer;
}
.po-primary-button,
.po-secondary-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 9px;
  padding: 0 15px;
}
.po-primary-button {
  background: #16a34a;
  border-color: #16a34a;
  color: #fff;
}
.po-secondary-button span {
  min-width: 24px;
  height: 24px;
  border-radius: 999px;
  display: inline-grid;
  place-items: center;
  background: #6366f1;
  color: #fff;
  font-size: 12px;
}
.po-icon-button,
.po-row-actions > button,
.po-detail-head button,
.po-drawer-head button {
  width: 42px;
  display: grid;
  place-items: center;
}
.po-icon-button.danger {
  color: #ef4444;
}
.po-stats {
  display: grid;
  grid-template-columns: repeat(5, minmax(150px, 1fr));
  gap: 16px;
  margin-bottom: 18px;
}
.po-kpi,
.po-workspace,
.po-detail-card,
.po-create-drawer,
.po-form-card {
  background: #fff;
  border: 1px solid #e5e7eb;
  box-shadow: 0 14px 34px rgba(15, 23, 42, 0.05);
}
.po-kpi {
  min-height: 112px;
  border-radius: 16px;
  padding: 18px;
  display: flex;
  align-items: center;
  gap: 15px;
}
.po-kpi-icon {
  width: 52px;
  height: 52px;
  border-radius: 13px;
  display: grid;
  place-items: center;
}
.po-kpi-icon.green { background: #dcfce7; color: #16a34a; }
.po-kpi-icon.purple { background: #f3e8ff; color: #7c3aed; }
.po-kpi-icon.blue { background: #dbeafe; color: #2563eb; }
.po-kpi-icon.orange { background: #ffedd5; color: #f97316; }
.po-kpi-icon.red { background: #fee2e2; color: #ef4444; }
.po-kpi span:not(.po-kpi-icon) {
  display: block;
  color: #64748b;
  font-size: 12px;
  font-weight: 800;
}
.po-kpi strong {
  display: block;
  margin-top: 6px;
  font-size: 21px;
  line-height: 1.05;
}
.po-kpi small {
  display: block;
  margin-top: 8px;
  color: #64748b;
  font-size: 12px;
}
.po-tabs {
  display: flex;
  gap: 30px;
  overflow-x: auto;
  border-bottom: 1px solid #e5e7eb;
  margin-bottom: 0;
}
.po-tabs button {
  min-height: 48px;
  border: 0;
  border-bottom: 2px solid transparent;
  background: transparent;
  color: #334155;
  font: inherit;
  font-size: 13px;
  font-weight: 850;
  cursor: pointer;
  white-space: nowrap;
}
.po-tabs button.active {
  color: #111827;
  border-color: #16a34a;
}
.po-tabs span {
  color: #64748b;
  margin-left: 6px;
  font-size: 12px;
}
.po-workspace {
  border-radius: 0 0 16px 16px;
  overflow: visible;
}
.po-toolbar {
  gap: 12px;
  padding: 16px;
  border-bottom: 1px solid #e5e7eb;
}
.po-search {
  min-width: 220px;
  flex: 1 1 360px;
  height: 44px;
  border: 1px solid #e5e7eb;
  border-radius: 11px;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 0 13px;
  color: #64748b;
  background: #fff;
}
.po-search.inner {
  margin-bottom: 14px;
}
.po-search input,
.po-select select,
.po-form-grid input,
.po-form-grid select,
.po-form-grid textarea,
.po-items-table input,
.po-items-table select,
.po-discount-row input,
.po-mini-modal input {
  width: 100%;
  border: 0;
  outline: 0;
  background: transparent;
  font: inherit;
  color: #0f172a;
}
.po-select {
  min-width: 150px;
  height: 44px;
  border: 1px solid #e5e7eb;
  border-radius: 11px;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 0 12px;
  background: #fff;
  font-size: 13px;
  font-weight: 800;
}
.po-select span {
  white-space: nowrap;
}
.po-view-toggle {
  margin-left: auto;
  display: inline-flex;
  border: 1px solid #e5e7eb;
  border-radius: 11px;
  overflow: hidden;
}
.po-view-toggle button {
  width: 42px;
  border: 0;
  border-radius: 0;
}
.po-view-toggle button.active {
  color: #16a34a;
  background: #ecfdf5;
}
.po-filter-panel {
  gap: 12px;
  flex-wrap: wrap;
  padding: 14px 16px;
  border-bottom: 1px solid #e5e7eb;
  background: #f8fafc;
}
.po-data-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 16px;
  padding: 16px;
}
.po-data-layout.with-details {
  grid-template-columns: minmax(0, 1fr) minmax(310px, 360px);
}
.po-list-card {
  min-width: 0;
}
.po-table-wrap {
  min-width: 0;
  overflow: auto;
  border: 1px solid #edf2f7;
  border-radius: 12px;
}
.po-table {
  width: 100%;
  min-width: 1040px;
  border-collapse: collapse;
}
.po-table th,
.po-table td {
  padding: 14px 12px;
  text-align: left;
  border-bottom: 1px solid #e5e7eb;
  font-size: 12px;
  vertical-align: middle;
}
.po-table th {
  background: #f8fafc;
  color: #475569;
  text-transform: uppercase;
  font-size: 10px;
  letter-spacing: .02em;
}
.po-table tr.selected,
.po-table tr:hover {
  background: #f0fdf4;
}
.po-link-button {
  border: 0;
  background: transparent;
  color: #2563eb;
  font-size: 12px;
  font-weight: 900;
}
.po-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 24px;
  padding: 0 9px;
  border-radius: 8px;
  font-size: 10px;
  font-weight: 900;
  text-transform: uppercase;
  white-space: nowrap;
}
.po-badge.green { background: #dcfce7; color: #15803d; }
.po-badge.blue { background: #dbeafe; color: #2563eb; }
.po-badge.orange { background: #ffedd5; color: #f97316; }
.po-badge.red { background: #fee2e2; color: #ef4444; }
.po-badge.gray { background: #f1f5f9; color: #475569; }
.po-progress-text {
  display: inline-block;
  min-width: 36px;
}
.po-progress {
  width: 90px;
  height: 6px;
  display: inline-flex;
  vertical-align: middle;
  border-radius: 999px;
  background: #e5e7eb;
  overflow: hidden;
}
.po-progress span {
  display: block;
  height: 100%;
  background: #16a34a;
}
.po-progress.large {
  width: 100%;
  height: 9px;
}
.po-row-actions {
  position: relative;
}
.po-action-menu {
  position: absolute;
  top: 46px;
  right: 0;
  z-index: 25;
  width: 170px;
  padding: 8px;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  background: #fff;
  box-shadow: 0 20px 45px rgba(15, 23, 42, 0.16);
}
.po-action-menu button {
  width: 100%;
  min-height: 36px;
  border: 0;
  border-radius: 9px;
  background: transparent;
  text-align: left;
  padding: 0 10px;
  font: inherit;
  font-size: 12px;
  font-weight: 800;
  cursor: pointer;
}
.po-action-menu button:hover {
  background: #f1f5f9;
}
.po-card-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(230px, 1fr));
  gap: 12px;
}
.po-order-card {
  border: 1px solid #e5e7eb;
  border-radius: 14px;
  padding: 15px;
  cursor: pointer;
  background: #fff;
}
.po-order-card.selected {
  border-color: #16a34a;
  box-shadow: 0 0 0 3px #dcfce7;
}
.po-order-card > div:first-child,
.po-card-meta {
  justify-content: space-between;
  gap: 8px;
}
.po-order-card h3 {
  margin: 12px 0 6px;
  font-size: 15px;
}
.po-order-card p,
.po-card-meta {
  color: #64748b;
  font-size: 12px;
}
.po-card-meta {
  margin: 14px 0 8px;
}
.po-card-meta strong {
  color: #0f172a;
}
.po-pagination {
  justify-content: space-between;
  gap: 12px;
  padding-top: 16px;
  font-size: 13px;
  font-weight: 800;
}
.po-pagination > div {
  gap: 8px;
}
.po-pagination button {
  width: 38px;
}
.po-pagination button:disabled {
  opacity: .45;
  cursor: not-allowed;
}
.po-pagination strong {
  width: 38px;
  height: 38px;
  border-radius: 10px;
  display: grid;
  place-items: center;
  background: #16a34a;
  color: #fff;
}
.po-pagination select {
  padding: 0 10px;
}
.po-empty,
.po-inline-empty {
  min-height: 430px;
  display: grid;
  place-items: center;
  text-align: center;
  padding: 44px 18px;
}
.po-empty > span {
  width: 118px;
  height: 118px;
  border-radius: 999px;
  display: grid;
  place-items: center;
  margin-bottom: 18px;
  background: #eff6ff;
  color: #64748b;
}
.po-empty h2 {
  margin: 0;
  font-size: 19px;
}
.po-empty p {
  max-width: 360px;
  color: #64748b;
  font-size: 13px;
  line-height: 1.55;
}
.po-inline-empty {
  min-height: 220px;
  gap: 7px;
}
.po-inline-empty span {
  color: #64748b;
  font-size: 13px;
}
.po-inline-empty button {
  padding: 0 16px;
}
.po-detail-card {
  border-radius: 16px;
  padding: 16px;
  align-self: start;
  position: sticky;
  top: 92px;
}
.po-detail-head {
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 14px;
}
.po-detail-head > div {
  gap: 10px;
  min-width: 0;
}
.po-detail-head strong {
  font-size: 16px;
}
.po-supplier-block {
  display: flex;
  gap: 12px;
  align-items: flex-start;
  padding: 12px;
  border-radius: 12px;
  background: #f8fafc;
  margin-bottom: 14px;
}
.po-supplier-block > span {
  width: 38px;
  height: 38px;
  border-radius: 999px;
  background: #334155;
  color: #fff;
  display: grid;
  place-items: center;
  font-size: 12px;
  font-weight: 900;
}
.po-supplier-block small {
  display: block;
  color: #64748b;
  font-size: 11px;
  margin-top: 3px;
}
.po-detail-meta {
  display: grid;
  gap: 4px;
  margin-bottom: 14px;
}
.po-detail-tabs {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  border-bottom: 1px solid #e5e7eb;
  margin-bottom: 14px;
  overflow-x: auto;
}
.po-detail-tabs button {
  min-height: 38px;
  border: 0;
  border-bottom: 2px solid transparent;
  background: transparent;
  font: inherit;
  font-size: 11px;
  font-weight: 900;
  cursor: pointer;
  white-space: nowrap;
}
.po-detail-tabs button.active {
  border-color: #16a34a;
  color: #16a34a;
}
.po-detail-body h3 {
  margin: 0 0 12px;
  font-size: 13px;
}
.po-detail-body p {
  margin: 12px 0;
  color: #64748b;
  font-size: 13px;
  line-height: 1.45;
}
.po-detail-row {
  display: grid;
  grid-template-columns: 120px minmax(0, 1fr);
  gap: 10px;
  padding: 8px 0;
  font-size: 12px;
}
.po-detail-row span {
  color: #64748b;
}
.po-detail-row strong {
  color: #0f172a;
}
.po-detail-item {
  display: grid;
  gap: 4px;
  padding: 10px 0;
  border-bottom: 1px solid #e5e7eb;
  font-size: 12px;
}
.po-detail-item span {
  color: #64748b;
}
.po-detail-actions {
  gap: 10px;
  margin-top: 16px;
}
.po-detail-actions > * {
  flex: 1;
}
.po-drawer-backdrop,
.po-modal-backdrop {
  position: fixed;
  inset: 0;
  z-index: 80;
  background: rgba(15, 23, 42, .42);
}
.po-drawer-backdrop {
  display: flex;
  justify-content: flex-end;
}
.po-create-drawer {
  width: min(1220px, calc(100vw - 32px));
  height: 100%;
  overflow: auto;
  background: #fff;
  display: flex;
  flex-direction: column;
}
.po-drawer-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  padding: 24px;
  border-bottom: 1px solid #e5e7eb;
}
.po-drawer-head h2 {
  margin: 0;
  font-size: 24px;
}
.po-drawer-head p {
  margin: 8px 0 0;
  color: #64748b;
  font-size: 13px;
}
.po-form-layout {
  flex: 1;
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(300px, 340px);
  gap: 16px;
  align-items: start;
  padding: 16px;
}
.po-form-main,
.po-form-side {
  display: grid;
  gap: 16px;
  align-content: start;
}
.po-form-side {
  position: sticky;
  top: 16px;
  max-height: calc(100dvh - 146px);
  overflow: auto;
  padding-bottom: 6px;
  scrollbar-width: thin;
}
.po-form-card {
  min-width: 0;
  border-radius: 16px;
  padding: 18px;
}
.po-form-card h3 {
  margin: 0 0 16px;
  font-size: 16px;
}
.po-card-head {
  display: flex;
  justify-content: space-between;
  gap: 14px;
  align-items: center;
  margin-bottom: 14px;
}
.po-card-head h3 {
  margin: 0;
}
.po-card-head > div {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}
.po-form-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
}
.po-form-grid label,
.po-mini-modal label {
  color: #334155;
  font-size: 12px;
  font-weight: 850;
}
.po-form-grid label {
  display: block;
}
.po-mini-modal label {
  display: grid;
  gap: 8px;
}
.po-form-grid sup {
  color: #ef4444;
  margin-left: 2px;
}
.po-field-help {
  color: #64748b;
  font-size: 11px;
  font-weight: 700;
  margin-top: -3px;
}
.po-form-grid .wide {
  grid-column: span 2;
}
.po-form-grid input,
.po-form-grid select,
.po-form-grid textarea,
.po-items-table input,
.po-items-table select,
.po-discount-row input,
.po-mini-modal input {
  box-sizing: border-box;
  min-height: 42px;
  width: 100%;
  border: 1px solid #dbe3ef;
  border-radius: 10px;
  background: #fff;
  padding: 0 12px;
  font-size: 13px;
}
.po-form-grid label > input,
.po-form-grid label > select,
.po-form-grid label > textarea,
.po-form-grid label > .po-combo-row {
  margin-top: 8px;
}
.po-form-grid textarea {
  min-height: 58px;
  padding: 12px;
  resize: vertical;
}
.po-combo-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 42px;
  gap: 8px;
}
.po-combo-row button {
  width: 42px;
  min-height: 42px;
  border: 1px solid #dbe3ef;
  border-radius: 10px;
  background: #fff;
  display: grid;
  place-items: center;
  cursor: pointer;
  color: #0f172a;
}
.po-outline-button,
.po-secondary-footer,
.po-primary-footer {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 0 16px;
}
.po-outline-button {
  color: #16a34a;
  border-color: #86efac;
}
.po-outline-button.dark {
  color: #0f172a;
  border-color: #dbe3ef;
}
.po-items-table-wrap {
  overflow: auto;
  border: 1px solid #edf2f7;
  border-radius: 12px;
}
.po-items-table {
  width: 100%;
  min-width: 1060px;
  border-collapse: collapse;
}
.po-items-table th,
.po-items-table td {
  padding: 12px 9px;
  border-bottom: 1px solid #e5e7eb;
  text-align: left;
  font-size: 12px;
  vertical-align: top;
}
.po-items-table th {
  background: #f8fafc;
  color: #64748b;
  font-size: 10px;
  text-transform: uppercase;
}
.po-items-table td:nth-child(2) {
  min-width: 220px;
}
.po-items-table td:nth-child(2) select {
  margin-bottom: 8px;
}
.po-items-footer {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 12px;
  border-top: 1px solid #e5e7eb;
  background: #fff;
}
.po-items-footer span {
  color: #64748b;
  font-size: 12px;
  font-weight: 800;
}
.po-empty-items {
  min-height: 190px;
  border: 1px dashed #dbe3ef;
  border-radius: 14px;
  display: grid;
  place-items: center;
  text-align: center;
  color: #94a3b8;
  padding: 28px 12px;
}
.po-empty-items strong {
  color: #0f172a;
  margin-top: 8px;
}
.po-empty-items span {
  color: #64748b;
  font-size: 13px;
  margin-bottom: 10px;
}
.po-summary-row,
.po-discount-row,
.po-total-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  min-height: 36px;
  color: #64748b;
  font-size: 13px;
}
.po-summary-row strong {
  color: #0f172a;
}
.po-discount-row input {
  width: 120px;
  min-height: 36px;
  text-align: right;
}
.po-total-row {
  margin: 14px -18px -18px;
  padding: 18px;
  background: #ecfdf5;
  color: #0f172a;
}
.po-total-row strong:last-child {
  color: #16a34a;
  font-size: 18px;
}
.po-dropzone {
  min-height: 150px;
  border: 1px dashed #dbe3ef;
  border-radius: 14px;
  display: grid;
  place-items: center;
  text-align: center;
  padding: 18px;
  color: #64748b;
  cursor: pointer;
}
.po-dropzone strong {
  color: #334155;
  font-size: 13px;
}
.po-dropzone span {
  color: #16a34a;
  font-size: 13px;
  font-weight: 850;
}
.po-dropzone small {
  color: #94a3b8;
  font-size: 11px;
}
.po-attachment-list {
  display: grid;
  gap: 8px;
  margin-top: 12px;
}
.po-attachment-list div {
  min-height: 34px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
  padding: 0 10px;
  border-radius: 9px;
  background: #f8fafc;
  font-size: 12px;
}
.po-attachment-list button {
  border: 0;
  background: transparent;
  cursor: pointer;
}
.po-form-footer {
  position: sticky;
  bottom: 0;
  grid-column: 1 / -1;
  z-index: 90;
  width: auto;
  min-height: 68px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin: 0 -16px -16px;
  padding: 12px 24px;
  background: rgba(255, 255, 255, .94);
  border-top: 1px solid #e5e7eb;
  backdrop-filter: blur(12px);
}
.po-form-footer > span {
  color: #16a34a;
  font-size: 13px;
  font-weight: 800;
}
.po-form-footer > div {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  justify-content: flex-end;
}
.po-primary-footer {
  background: #16a34a;
  border-color: #16a34a;
  color: #fff;
}
.po-modal-backdrop {
  z-index: 120;
  display: grid;
  place-items: center;
  padding: 18px;
}
.po-mini-modal {
  width: min(420px, 100%);
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 16px;
  padding: 18px;
  box-shadow: 0 20px 60px rgba(15, 23, 42, .2);
  display: grid;
  gap: 16px;
}
.po-mini-modal > div {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: center;
}
.po-mini-modal h2 {
  margin: 0;
  font-size: 18px;
}
.po-mini-modal button[aria-label] {
  width: 38px;
  height: 38px;
  border-radius: 10px;
  border: 1px solid #e5e7eb;
  background: #fff;
  display: grid;
  place-items: center;
  cursor: pointer;
}
@media (max-width: 1280px) {
  .po-stats {
    grid-template-columns: repeat(3, minmax(150px, 1fr));
  }
  .po-data-layout.with-details,
  .po-form-layout {
    grid-template-columns: minmax(0, 1fr);
  }
  .po-detail-card,
  .po-form-side {
    position: static;
    max-height: none;
    overflow: visible;
  }
}
@media (max-width: 900px) {
  .po-page {
    padding: 18px 14px 28px;
  }
  .po-page-head {
    display: grid;
  }
  .po-actions {
    justify-content: stretch;
  }
  .po-actions > *,
  .po-toolbar > *,
  .po-filter-panel > * {
    flex: 1 1 100%;
  }
  .po-stats {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    overflow-x: auto;
    scroll-snap-type: x mandatory;
    padding-bottom: 4px;
  }
  .po-kpi {
    min-width: 210px;
    scroll-snap-align: start;
  }
  .po-toolbar {
    align-items: stretch;
    flex-wrap: wrap;
  }
  .po-view-toggle {
    margin-left: 0;
    width: 100%;
  }
  .po-view-toggle button {
    flex: 1;
  }
  .po-table-wrap {
    border: 0;
    overflow: visible;
  }
  .po-table,
  .po-table thead,
  .po-table tbody,
  .po-table tr,
  .po-table td {
    display: block;
    min-width: 0;
  }
  .po-table thead {
    display: none;
  }
  .po-table tr {
    border: 1px solid #e5e7eb;
    border-radius: 14px;
    padding: 14px;
    margin-bottom: 12px;
    background: #fff;
  }
  .po-table td {
    border: 0;
    padding: 7px 0;
  }
  .po-table td:nth-child(1) {
    display: none;
  }
  .po-table td::before {
    content: attr(data-label);
    display: inline-block;
    min-width: 105px;
    color: #64748b;
    font-size: 11px;
    font-weight: 900;
  }
  .po-row-actions {
    display: flex;
    justify-content: flex-end;
  }
  .po-pagination {
    display: grid;
  }
  .po-create-drawer {
    width: 100vw;
  }
  .po-form-grid {
    grid-template-columns: 1fr 1fr;
  }
  .po-form-grid .wide {
    grid-column: 1 / -1;
  }
  .po-form-footer {
    display: grid;
  }
  .po-form-footer > div {
    display: grid;
    grid-template-columns: 1fr;
  }
}
@media (max-width: 640px) {
  .po-title-row {
    align-items: flex-start;
  }
  .po-stats {
    grid-template-columns: 1fr;
  }
  .po-kpi {
    min-width: 0;
  }
  .po-data-layout {
    padding: 12px;
  }
  .po-detail-tabs {
    display: flex;
  }
  .po-detail-tabs button {
    min-width: 86px;
  }
  .po-create-drawer {
    height: calc(100% - 18px);
    margin-top: 18px;
    border-radius: 18px 18px 0 0;
  }
  .po-drawer-head,
  .po-form-layout {
    padding: 16px;
  }
  .po-form-layout {
    padding-bottom: 16px;
  }
  .po-form-card {
    padding: 14px;
    border-radius: 14px;
  }
  .po-card-head {
    display: grid;
  }
  .po-card-head > div {
    display: grid;
  }
  .po-form-grid {
    grid-template-columns: 1fr;
  }
  .po-items-table,
  .po-items-table thead,
  .po-items-table tbody,
  .po-items-table tr,
  .po-items-table td {
    display: block;
    min-width: 0;
  }
  .po-items-table thead {
    display: none;
  }
  .po-items-table-wrap {
    border: 0;
    overflow: visible;
  }
  .po-items-table tr {
    border: 1px solid #e5e7eb;
    border-radius: 14px;
    padding: 12px;
    margin-bottom: 12px;
  }
  .po-items-table td {
    border: 0;
    padding: 8px 0;
  }
  .po-items-table td::before {
    content: attr(data-label);
    display: block;
    color: #64748b;
    font-size: 11px;
    font-weight: 900;
    margin-bottom: 6px;
  }
}
`
