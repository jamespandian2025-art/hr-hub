'use client'

import { ChangeEvent, FormEvent, type ComponentType, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import {
  Box,
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
  Printer,
  Search,
  X,
  XCircle,
} from 'lucide-react'
import { AnalyticsToggleButton, CollapsibleAnalytics, useAnalyticsDisclosure } from '@/components/AnalyticsDisclosure'
import { companyChangeEvent, companyScopedKey, getActiveCompany } from '@/lib/tenant/company'
import { syncProcurementReceiptToWarehouse } from '@/lib/warehouse/store'

const font = 'var(--font-body)'
const receivingKey = 'flowsys-procurement-receiving'
const purchaseOrdersKey = 'flowsys-procurement-purchase-orders'

type StoredRow = Record<string, unknown>
type ReceiptStatus = 'Received' | 'Partially Received' | 'Pending' | 'Overdue' | 'Cancelled'
type ViewMode = 'table' | 'cards'
type DetailTab = 'Details' | 'Items' | 'Attachments' | 'Activity'

type AttachmentRecord = {
  id: string
  name: string
  size: string
  type: string
}

type PurchaseOrderItem = {
  name: string
  sku: string
  unit: string
  quantity: number
  unitPrice: number
  amount: number
}

type PurchaseOrderOption = {
  id: string
  poNumber: string
  supplierName: string
  deliveryDate: string
  total: number
  receivedPercent: number
  items: PurchaseOrderItem[]
  source: StoredRow
}

type ReceiptItem = {
  id: string
  name: string
  sku: string
  unit: string
  orderedQuantity: string
  receivedQuantity: string
  condition: string
  notes: string
}

type ReceiptForm = {
  poId: string
  receiptDate: string
  receivedBy: string
  deliveryDate: string
  status: ReceiptStatus
  referenceNotes: string
}

type NormalizedReceipt = {
  id: string
  receiptNumber: string
  poNumber: string
  poId: string
  supplierName: string
  receiptDate: string
  deliveryDate: string
  status: ReceiptStatus
  receivedBy: string
  total: number
  totalItems: number
  totalQuantity: number
  receivedPercent: number
  referenceNotes: string
  items: ReceiptItem[]
  attachments: AttachmentRecord[]
  activity: string[]
  source: StoredRow
}

const emptyForm: ReceiptForm = {
  poId: '',
  receiptDate: todayInput(),
  receivedBy: '',
  deliveryDate: '',
  status: 'Received',
  referenceNotes: '',
}

const statusConfig: Record<ReceiptStatus, { label: string; tone: string }> = {
  Received: { label: 'Received', tone: 'green' },
  'Partially Received': { label: 'Partially Received', tone: 'orange' },
  Pending: { label: 'Pending', tone: 'blue' },
  Overdue: { label: 'Overdue', tone: 'red' },
  Cancelled: { label: 'Cancelled', tone: 'gray' },
}

const detailTabs: DetailTab[] = ['Details', 'Items', 'Attachments', 'Activity']

export default function ReceivingPage() {
  const [companyId, setCompanyId] = useState('')
  const [storedReceipts, setStoredReceipts] = useState<StoredRow[]>([])
  const [storedOrders, setStoredOrders] = useState<StoredRow[]>([])
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
  const [form, setForm] = useState<ReceiptForm>(emptyForm)
  const [items, setItems] = useState<ReceiptItem[]>([])
  const [attachments, setAttachments] = useState<AttachmentRecord[]>([])
  const analytics = useAnalyticsDisclosure('wiseflow:analytics:procurement-receiving')
  const attachmentRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    const load = () => {
      const activeCompany = getActiveCompany()
      const activeCompanyId = activeCompany?.id || ''
      setCompanyId(activeCompanyId)
      setStoredReceipts(loadRows(receivingKey, activeCompanyId))
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

  const orders = useMemo(() => storedOrders.map((order, index) => normalizeOrder(order, index)).filter(Boolean) as PurchaseOrderOption[], [storedOrders])
  const receipts = useMemo(() => storedReceipts.map((receipt, index) => normalizeReceipt(receipt, index, orders)).filter(Boolean) as NormalizedReceipt[], [storedReceipts, orders])
  const receiptNumber = useMemo(() => nextReceiptNumber(receipts), [receipts])
  const suppliers = useMemo(() => uniqueValues([...orders.map(order => order.supplierName), ...receipts.map(receipt => receipt.supplierName)].filter(Boolean)), [orders, receipts])
  const activeFilterCount = [statusFilter, supplierFilter, dateFilter].filter(value => value !== 'All').length

  const stats = useMemo(() => {
    const thisMonth = receipts.filter(receipt => isInDateFilter(receipt.receiptDate, 'This Month'))
    const count = (status: ReceiptStatus) => receipts.filter(receipt => receipt.status === status).length
    return {
      total: receipts.length,
      thisMonth: thisMonth.length,
      receivedValue: thisMonth.reduce((sum, receipt) => sum + receipt.total, 0),
      pending: count('Pending'),
      overdue: count('Overdue'),
      received: count('Received'),
      partial: count('Partially Received'),
      cancelled: count('Cancelled'),
      quantity: receipts.reduce((sum, receipt) => sum + receipt.totalQuantity, 0),
      value: receipts.reduce((sum, receipt) => sum + receipt.total, 0),
    }
  }, [receipts])

  const tabs = useMemo(() => [
    { label: 'All', count: receipts.length },
    { label: 'Received', count: stats.received },
    { label: 'Partially Received', count: stats.partial },
    { label: 'Pending', count: stats.pending },
    { label: 'Overdue', count: stats.overdue },
    { label: 'Cancelled', count: stats.cancelled },
  ], [receipts.length, stats])

  const filteredReceipts = useMemo(() => {
    const needle = search.trim().toLowerCase()
    return receipts.filter(receipt => {
      const matchesSearch = !needle || [
        receipt.receiptNumber,
        receipt.poNumber,
        receipt.supplierName,
        receipt.receivedBy,
        receipt.referenceNotes,
        ...receipt.items.map(item => item.name),
      ].some(value => value.toLowerCase().includes(needle))
      const matchesStatus = statusFilter === 'All' || receipt.status === statusFilter
      const matchesSupplier = supplierFilter === 'All' || receipt.supplierName === supplierFilter
      const matchesDate = dateFilter === 'All' || isInDateFilter(receipt.receiptDate, dateFilter)
      const matchesTab = activeTab === 'All' || receipt.status === activeTab
      return matchesSearch && matchesStatus && matchesSupplier && matchesDate && matchesTab
    })
  }, [activeTab, dateFilter, receipts, search, statusFilter, supplierFilter])

  const totalPages = Math.max(1, Math.ceil(filteredReceipts.length / pageSize))
  const currentPage = Math.min(page, totalPages)
  const pageStart = filteredReceipts.length ? (currentPage - 1) * pageSize + 1 : 0
  const pageEnd = Math.min(currentPage * pageSize, filteredReceipts.length)
  const visibleReceipts = filteredReceipts.slice((currentPage - 1) * pageSize, currentPage * pageSize)
  const selectedReceipt = receipts.find(receipt => receipt.id === selectedId) || visibleReceipts[0] || filteredReceipts[0]
  const selectedOrder = orders.find(order => order.id === form.poId)
  const summary = useMemo(() => {
    const totalQuantity = items.reduce((sum, item) => sum + numberValue(item.receivedQuantity), 0)
    const orderedQuantity = items.reduce((sum, item) => sum + numberValue(item.orderedQuantity), 0)
    const total = items.reduce((sum, item) => {
      const orderItem = selectedOrder?.items.find(poItem => poItem.sku === item.sku && poItem.name === item.name)
      const unitPrice = orderItem?.unitPrice || (orderItem && orderItem.quantity ? orderItem.amount / orderItem.quantity : 0)
      return sum + numberValue(item.receivedQuantity) * unitPrice
    }, 0)
    return {
      totalItems: items.length,
      totalQuantity,
      orderedQuantity,
      receivedPercent: orderedQuantity ? Math.round((totalQuantity / orderedQuantity) * 100) : 0,
      total,
    }
  }, [items, selectedOrder])

  function persistReceipts(nextReceipts: StoredRow[]) {
    const unique = uniqueRows(nextReceipts)
    setStoredReceipts(unique)
    persistRows(receivingKey, unique, companyId)
  }

  function persistOrders(nextOrders: StoredRow[]) {
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

  function selectOrder(poId: string) {
    const order = orders.find(item => item.id === poId)
    setForm(previous => ({
      ...previous,
      poId,
      deliveryDate: order?.deliveryDate || '',
      status: order?.receivedPercent && order.receivedPercent > 0 && order.receivedPercent < 100 ? 'Partially Received' : 'Received',
    }))
    setItems(order ? order.items.map((item, index) => ({
      id: `receipt-item-${poId}-${index}`,
      name: item.name,
      sku: item.sku,
      unit: item.unit,
      orderedQuantity: String(item.quantity || ''),
      receivedQuantity: String(item.quantity || ''),
      condition: 'Good',
      notes: '',
    })) : [])
  }

  function updateItem(id: string, patch: Partial<ReceiptItem>) {
    setItems(previous => previous.map(item => item.id === id ? { ...item, ...patch } : item))
  }

  function addAttachments(files: FileList | File[]) {
    const next = Array.from(files).map(file => ({
      id: `receiving-attachment-${file.name}-${file.size}`,
      name: file.name,
      size: formatFileSize(file.size),
      type: file.type || 'file',
    }))
    setAttachments(previous => [...previous, ...next])
  }

  function resetCreateForm() {
    setForm({ ...emptyForm, receiptDate: todayInput() })
    setItems([])
    setAttachments([])
  }

  function saveReceipt(statusOverride?: ReceiptStatus) {
    if (!selectedOrder) return
    const now = new Date()
    const receiptStatus = statusOverride || form.status || statusFromPercent(summary.receivedPercent, form.deliveryDate)
    const record: StoredRow = {
      id: `receiving-${now.toISOString()}`,
      companyId,
      receiptNumber,
      poId: selectedOrder.id,
      poNumber: selectedOrder.poNumber,
      supplierName: selectedOrder.supplierName,
      receiptDate: form.receiptDate || todayInput(),
      deliveryDate: form.deliveryDate || selectedOrder.deliveryDate,
      status: receiptStatus,
      receivedBy: form.receivedBy.trim() || 'Unassigned',
      referenceNotes: form.referenceNotes,
      total: summary.total,
      totalItems: summary.totalItems,
      totalQuantity: summary.totalQuantity,
      receivedPercent: clampPercent(summary.receivedPercent),
      items,
      attachments,
      activity: [`${receiptNumber} ${receiptStatus.toLowerCase()} on ${formatDate(now.toISOString())}`],
      createdAt: now.toISOString(),
    }
    persistReceipts([record, ...storedReceipts])
    if (receiptStatus === 'Received' || receiptStatus === 'Partially Received') {
      syncProcurementReceiptToWarehouse({ receipt: record, order: selectedOrder.source, companyId })
    }
    updatePurchaseOrderFromReceipt(selectedOrder, receiptStatus, summary.receivedPercent, summary.total)
    setSelectedId(String(record.id))
    resetCreateForm()
    setShowCreate(false)
  }

  function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    saveReceipt()
  }

  function updatePurchaseOrderFromReceipt(order: PurchaseOrderOption, status: ReceiptStatus, receivedPercent: number, amountReceived: number) {
    const nextOrders = storedOrders.map(record => {
      const normalized = normalizeOrder(record, 0)
      if (!normalized || normalized.id !== order.id) return record
      const existingPercent = clampPercent(numberValue(record.receivedPercent ?? record.received))
      const nextPercent = status === 'Cancelled' ? existingPercent : Math.max(existingPercent, clampPercent(receivedPercent))
      const nextStatus = status === 'Cancelled'
        ? record.status
        : nextPercent >= 100
          ? 'Received'
          : nextPercent > 0
            ? 'Partially Received'
            : record.status || 'Open'
      return {
        ...record,
        status: nextStatus,
        receivedPercent: nextPercent,
        amountReceived: Math.max(moneyValue(record.amountReceived), amountReceived),
        activity: [`Receiving updated to ${nextPercent}% on ${formatDate(new Date().toISOString())}`, ...readStringArray(record.activity)],
        updatedAt: new Date().toISOString(),
      }
    })
    persistOrders(nextOrders)
  }

  function updateReceiptStatus(receipt: NormalizedReceipt, status: ReceiptStatus) {
    let syncedReceipt: StoredRow | null = null
    const next = storedReceipts.map(record => {
      const normalized = normalizeReceipt(record, 0, orders)
      if (!normalized || normalized.id !== receipt.id) return record
      const updated = {
        ...record,
        status,
        activity: [`Status changed to ${status} on ${formatDate(new Date().toISOString())}`, ...readStringArray(record.activity)],
        updatedAt: new Date().toISOString(),
      }
      syncedReceipt = updated
      return updated
    })
    persistReceipts(next)
    if ((status === 'Received' || status === 'Partially Received') && syncedReceipt) {
      const sourceOrder = orders.find(order => order.id === receipt.poId || order.poNumber === receipt.poNumber)
      syncProcurementReceiptToWarehouse({ receipt: syncedReceipt, order: sourceOrder?.source, companyId })
    }
    setOpenActionId('')
  }

  function exportCsv() {
    const headers = ['Receipt #', 'PO Number', 'Supplier', 'Receipt Date', 'Status', 'Received By', 'Total']
    const rows = filteredReceipts.map(receipt => [
      receipt.receiptNumber,
      receipt.poNumber,
      receipt.supplierName,
      receipt.receiptDate,
      receipt.status,
      receipt.receivedBy,
      String(receipt.total),
    ])
    downloadCsv('receiving.csv', [headers, ...rows])
  }

  return (
    <main className="receiving-page" style={{ fontFamily: font }}>
      <style>{receivingCss}</style>

      <section className="receiving-head">
        <div>
          <div className="receiving-breadcrumb"><span>Procurement</span><span>/</span><strong>Receiving</strong></div>
          <div className="receiving-title-row">
            <span className="receiving-title-icon"><Box size={22} /></span>
            <div>
              <h1>Receiving</h1>
              <p>Track and manage received items from suppliers.</p>
            </div>
          </div>
        </div>
        <div className="receiving-actions">
          <AnalyticsToggleButton open={analytics.open} onToggle={analytics.toggle} panelId={analytics.panelId} className="receiving-secondary" />
          <button type="button" className="receiving-secondary" onClick={exportCsv}><Download size={16} /> Export</button>
          <button type="button" className="receiving-primary" onClick={() => setShowCreate(true)}><Plus size={16} /> New Receiving <ChevronDown size={14} /></button>
          <button type="button" className="receiving-icon-button" aria-label="Toggle receiving filters" aria-expanded={showFilters} onClick={() => setShowFilters(value => !value)}><ChevronDown size={16} /></button>
        </div>
      </section>

      <section className="receiving-grid-shell">
        <div className="receiving-left">
          <CollapsibleAnalytics open={analytics.open} id={analytics.panelId}>
            <section className="receiving-stats" aria-label="Receiving metrics">
              <KpiCard title="Total Receipts" value={String(stats.total)} helper="This month" icon={Box} tone="green" />
              <KpiCard title="Total Received Value" value={formatCurrency(stats.receivedValue)} helper="This month" icon={FileText} tone="green" />
              <KpiCard title="Pending Receipts" value={String(stats.pending)} helper="This month" icon={Clock3} tone="blue" />
              <KpiCard title="Overdue Receipts" value={String(stats.overdue)} helper="This month" icon={XCircle} tone="orange" />
            </section>
          </CollapsibleAnalytics>

          <section className="receiving-workspace">
            <div className="receiving-tabs" aria-label="Receiving status tabs">
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
            </div>

            <div className="receiving-toolbar">
              <label className="receiving-search">
                <Search size={17} />
            <input value={search} onChange={event => { setSearch(event.target.value); setPage(1) }} placeholder="Search by receipt #, PO number, or supplier..." aria-label="Search receiving records" />
              </label>
              <SelectControl label="Date Range" value={dateFilter} onChange={value => { setDateFilter(value); setPage(1) }} options={['All', 'This Month', 'Last 30 Days', 'This Year']} />
              <SelectControl label="Supplier" value={supplierFilter} onChange={value => { setSupplierFilter(value); setPage(1) }} options={['All', ...suppliers]} />
              <SelectControl label="Status" value={statusFilter} onChange={value => { setStatusFilter(value); setPage(1) }} options={['All', ...Object.keys(statusConfig)]} />
              <button type="button" className="receiving-secondary" onClick={() => setShowFilters(value => !value)}><Filter size={16} /> More filters {activeFilterCount ? <span>{activeFilterCount}</span> : null}</button>
              <div className="receiving-view-toggle">
                <button type="button" className={viewMode === 'cards' ? 'active' : ''} onClick={() => setViewMode('cards')} aria-label="Cards view"><Grid3X3 size={16} /></button>
                <button type="button" className={viewMode === 'table' ? 'active' : ''} onClick={() => setViewMode('table')} aria-label="Table view"><FileText size={16} /></button>
              </div>
            </div>

            {showFilters && (
              <div className="receiving-filter-panel">
                <SelectControl label="Status" value={statusFilter} onChange={value => { setStatusFilter(value); setPage(1) }} options={['All', ...Object.keys(statusConfig)]} />
                <SelectControl label="Supplier" value={supplierFilter} onChange={value => { setSupplierFilter(value); setPage(1) }} options={['All', ...suppliers]} />
                <button type="button" className="receiving-secondary" onClick={resetFilters}>Clear Filters</button>
              </div>
            )}

            <section className="receiving-list-card">
              {filteredReceipts.length ? (
                viewMode === 'table' ? (
                  <div className="receiving-table-wrap">
                    <table className="receiving-table">
                      <thead>
                        <tr>
                          <th><input type="checkbox" aria-label="Select all receiving records" /></th>
                          <th>Receipt #</th>
                          <th>PO Number</th>
                          <th>Supplier</th>
                          <th>Receipt Date</th>
                          <th>Status</th>
                          <th>Received By</th>
                          <th>Total (PHP)</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {visibleReceipts.map(receipt => (
                          <tr key={receipt.id} className={selectedReceipt?.id === receipt.id ? 'selected' : ''}>
                            <td data-label="Select"><input type="checkbox" checked={selectedReceipt?.id === receipt.id} onChange={() => setSelectedId(receipt.id)} aria-label={`Select ${receipt.receiptNumber}`} /></td>
                            <td data-label="Receipt #"><button type="button" className="receiving-link" onClick={() => { setSelectedId(receipt.id); setDetailTab('Details') }}>{receipt.receiptNumber}</button></td>
                            <td data-label="PO Number">{receipt.poNumber || '-'}</td>
                            <td data-label="Supplier">{receipt.supplierName || '-'}</td>
                            <td data-label="Receipt Date">{formatDate(receipt.receiptDate)}</td>
                            <td data-label="Status"><Badge tone={statusConfig[receipt.status].tone}>{statusConfig[receipt.status].label}</Badge></td>
                            <td data-label="Received By">{receipt.receivedBy || '-'}</td>
                            <td data-label="Total">{formatCurrency(receipt.total)}</td>
                            <td data-label="Actions" className="receiving-row-actions">
                              <button type="button" aria-label={`Actions for ${receipt.receiptNumber}`} onClick={() => setOpenActionId(openActionId === receipt.id ? '' : receipt.id)}><MoreHorizontal size={18} /></button>
                              {openActionId === receipt.id && (
                                <div className="receiving-action-menu">
                                  <button type="button" onClick={() => { setSelectedId(receipt.id); setDetailTab('Details'); setOpenActionId('') }}>View details</button>
                                  <button type="button" onClick={() => updateReceiptStatus(receipt, 'Received')}>Mark received</button>
                                  <button type="button" onClick={() => updateReceiptStatus(receipt, 'Cancelled')}>Cancel receipt</button>
                                </div>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="receiving-card-grid">
                    {visibleReceipts.map(receipt => (
                      <button key={receipt.id} type="button" className={`receiving-card ${selectedReceipt?.id === receipt.id ? 'selected' : ''}`} onClick={() => setSelectedId(receipt.id)}>
                        <span><strong>{receipt.receiptNumber}</strong><Badge tone={statusConfig[receipt.status].tone}>{receipt.status}</Badge></span>
                        <h3>{receipt.supplierName}</h3>
                        <p>{receipt.poNumber} / {formatDate(receipt.receiptDate)}</p>
                        <span className="receiving-progress"><span style={{ width: `${clampPercent(receipt.receivedPercent)}%` }} /></span>
                        <small>{receipt.receivedPercent}% received - {formatCurrency(receipt.total)}</small>
                      </button>
                    ))}
                  </div>
                )
              ) : (
                <EmptyReceiving onCreate={() => setShowCreate(true)} />
              )}

              <div className="receiving-pagination">
                <span>Showing {pageStart} to {pageEnd} of {filteredReceipts.length} entries</span>
                <div>
                  <button type="button" disabled={currentPage === 1} onClick={() => setPage(value => Math.max(1, value - 1))} aria-label="Previous page">&lt;</button>
                  <strong>{currentPage}</strong>
                  <button type="button" disabled={currentPage === totalPages} onClick={() => setPage(value => Math.min(totalPages, value + 1))} aria-label="Next page">&gt;</button>
                  <select value={pageSize} onChange={event => { setPageSize(Number(event.target.value)); setPage(1) }} aria-label="Rows per page">
                    {[10, 25, 50].map(size => <option key={size} value={size}>{size} / page</option>)}
                  </select>
                </div>
              </div>
            </section>
          </section>
        </div>

        <aside className="receiving-right">
          {selectedReceipt ? (
            <ReceiptDetail receipt={selectedReceipt} activeTab={detailTab} setActiveTab={setDetailTab} onClose={() => setSelectedId('')} />
          ) : (
            <>
              <section className="receiving-side-card">
                <h2>Receipt Summary</h2>
                <SummaryLine label="Total Items" value={String(stats.total)} />
                <SummaryLine label="Total Quantity Received" value={String(stats.quantity)} />
                <SummaryLine label="Total Value (PHP)" value={formatCurrency(stats.value)} />
              </section>
              <section className="receiving-side-card">
                <h2>Receiving Progress</h2>
                <p>No receipts yet</p>
                <span className="receiving-progress"><span style={{ width: '0%' }} /></span>
                <strong>0%</strong>
              </section>
              <section className="receiving-side-card">
                <h2>Related Documents</h2>
                <RelatedLink label="Purchase Orders" value="View all purchase orders" href="/procurement/purchase-orders" />
                <RelatedLink label="Delivery Receipts" value="View all delivery receipts" href="/procurement/receiving" />
              </section>
            </>
          )}
        </aside>
      </section>

      {showCreate && (
        <div className="receiving-backdrop" role="presentation" onMouseDown={() => setShowCreate(false)}>
          <aside className="receiving-drawer" role="dialog" aria-modal="true" aria-labelledby="new-receiving-title" onMouseDown={event => event.stopPropagation()}>
            <div className="receiving-drawer-head">
              <div>
                <div className="receiving-breadcrumb"><span>Procurement</span><span>/</span><span>Receiving</span><span>/</span><strong>New Receiving</strong></div>
                <div className="receiving-title-row">
                  <span className="receiving-title-icon"><Box size={22} /></span>
                  <div>
                    <h2 id="new-receiving-title">New Receiving</h2>
                    <p>Record supplier deliveries against purchase orders.</p>
                  </div>
                </div>
              </div>
              <button type="button" aria-label="Close receiving form" onClick={() => setShowCreate(false)}><X size={20} /></button>
            </div>

            <form className="receiving-form-layout" onSubmit={handleCreate}>
              <div className="receiving-form-main">
                <section className="receiving-form-card">
                  <h3>Receipt Information</h3>
                  <div className="receiving-form-grid">
                    <label>
                      Receipt Number
                      <input value={receiptNumber} readOnly />
                      <small>Auto-generated</small>
                    </label>
                    <label>
                      Purchase Order <sup>*</sup>
                      <select value={form.poId} onChange={event => selectOrder(event.target.value)} required>
                        <option value="">Select purchase order</option>
                        {orders.map(order => <option key={order.id} value={order.id}>{order.poNumber} - {order.supplierName}</option>)}
                      </select>
                    </label>
                    <label>
                      Supplier
                      <input value={selectedOrder?.supplierName || ''} readOnly placeholder="Select a purchase order" />
                    </label>
                    <label>
                      Receipt Date <sup>*</sup>
                      <input type="date" value={form.receiptDate} onChange={event => setForm({ ...form, receiptDate: event.target.value })} required />
                    </label>
                    <label>
                      Delivery Date
                      <input type="date" value={form.deliveryDate} onChange={event => setForm({ ...form, deliveryDate: event.target.value })} />
                    </label>
                    <label>
                      Status
                      <select value={form.status} onChange={event => setForm({ ...form, status: event.target.value as ReceiptStatus })}>
                        {Object.keys(statusConfig).map(status => <option key={status} value={status}>{status}</option>)}
                      </select>
                    </label>
                    <label>
                      Received By
                      <input value={form.receivedBy} onChange={event => setForm({ ...form, receivedBy: event.target.value })} placeholder="Employee name" />
                    </label>
                    <label className="wide">
                      Reference / Notes
                      <textarea value={form.referenceNotes} onChange={event => setForm({ ...form, referenceNotes: event.target.value })} placeholder="Delivered on site. All items in good condition." />
                    </label>
                  </div>
                </section>

                <section className="receiving-form-card">
                  <div className="receiving-card-title">
                    <div>
                      <h3>Items Received</h3>
                      <p>Quantities come from the selected purchase order and can be adjusted before saving.</p>
                    </div>
                  </div>
                  {items.length ? (
                    <div className="receiving-items-wrap">
                      <table className="receiving-items-table">
                        <thead>
                          <tr>
                            <th>#</th>
                            <th>Item</th>
                            <th>SKU</th>
                            <th>Unit</th>
                            <th>Ordered</th>
                            <th>Received</th>
                            <th>Condition</th>
                            <th>Notes</th>
                          </tr>
                        </thead>
                        <tbody>
                          {items.map((item, index) => (
                            <tr key={item.id}>
                              <td>{index + 1}</td>
                              <td>{item.name}</td>
                              <td>{item.sku || '-'}</td>
                              <td>{item.unit || '-'}</td>
                              <td>{item.orderedQuantity}</td>
                              <td><input inputMode="decimal" value={item.receivedQuantity} onChange={event => updateItem(item.id, { receivedQuantity: event.target.value })} /></td>
                              <td>
                                <select value={item.condition} onChange={event => updateItem(item.id, { condition: event.target.value })}>
                                  <option value="Good">Good</option>
                                  <option value="Damaged">Damaged</option>
                                  <option value="Short">Short</option>
                                </select>
                              </td>
                              <td><input value={item.notes} onChange={event => updateItem(item.id, { notes: event.target.value })} placeholder="Optional" /></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="receiving-empty-box">
                      <Package size={34} />
                      <strong>No purchase order selected</strong>
                      <span>Select a purchase order to load receivable items.</span>
                    </div>
                  )}
                </section>
              </div>

              <aside className="receiving-form-side">
                <section className="receiving-side-card">
                  <h2>Receipt Summary</h2>
                  <SummaryLine label="Total Items" value={String(summary.totalItems)} />
                  <SummaryLine label="Total Quantity Received" value={String(summary.totalQuantity)} />
                  <SummaryLine label="Purchase Order" value={selectedOrder?.poNumber || '-'} />
                  <SummaryLine label="Supplier" value={selectedOrder?.supplierName || '-'} />
                  <div className="receiving-total-line">
                    <strong>Total Value</strong>
                    <strong>{formatCurrency(summary.total)}</strong>
                  </div>
                </section>

                <section className="receiving-side-card">
                  <h2>Receiving Progress</h2>
                  <span className="receiving-progress large"><span style={{ width: `${clampPercent(summary.receivedPercent)}%` }} /></span>
                  <strong>{clampPercent(summary.receivedPercent)}% received</strong>
                </section>

                <section className="receiving-side-card">
                  <h2>Attachments</h2>
                  <div className="receiving-dropzone" onClick={() => attachmentRef.current?.click()} onDragOver={event => event.preventDefault()} onDrop={event => { event.preventDefault(); addAttachments(event.dataTransfer.files) }} role="button" tabIndex={0}>
                    <CloudUpload size={30} />
                    <strong>Drag and drop files here</strong>
                    <span>or click to browse</span>
                    <small>PDF, JPG, PNG (max. 10MB)</small>
                  </div>
                  <input ref={attachmentRef} type="file" multiple hidden onChange={(event: ChangeEvent<HTMLInputElement>) => event.target.files && addAttachments(event.target.files)} />
                  {attachments.length ? (
                    <div className="receiving-attachment-list">
                      {attachments.map(file => (
                        <div key={file.id}>
                          <span>{file.name}</span>
                          <button type="button" onClick={() => setAttachments(previous => previous.filter(item => item.id !== file.id))}><X size={14} /></button>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </section>
              </aside>

              <footer className="receiving-form-footer">
                <button type="button" className="receiving-secondary" onClick={() => setShowCreate(false)}>Cancel</button>
                <div>
                  <button type="button" className="receiving-secondary" disabled={!selectedOrder} onClick={() => saveReceipt('Pending')}>Save as Pending</button>
                  <button type="submit" className="receiving-primary" disabled={!selectedOrder}>Create Receiving <ChevronDown size={14} /></button>
                </div>
              </footer>
            </form>
          </aside>
        </div>
      )}
    </main>
  )
}

function KpiCard({ title, value, helper, icon: Icon, tone }: { title: string; value: string; helper: string; icon: ComponentType<{ size?: number }>; tone: string }) {
  return (
    <article className="receiving-kpi">
      <span className={`receiving-kpi-icon ${tone}`}><Icon size={22} /></span>
      <div>
        <span>{title}</span>
        <strong>{value}</strong>
        <small>{helper}</small>
      </div>
    </article>
  )
}

function Badge({ children, tone }: { children: string; tone: string }) {
  return <span className={`receiving-badge ${tone}`}>{children}</span>
}

function SelectControl({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: string[] }) {
  return (
    <label className="receiving-select">
      <span>{label}</span>
      <select value={value} onChange={event => onChange(event.target.value)} aria-label={label}>
        {options.map(option => <option key={option} value={option}>{option}</option>)}
      </select>
      <ChevronDown size={14} />
    </label>
  )
}

function SummaryLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="receiving-summary-line">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  )
}

function RelatedLink({ label, value, href }: { label: string; value: string; href: string }) {
  return (
    <Link href={href} className="receiving-related-link">
      <FileText size={16} />
      <span><strong>{label}</strong><small>{value}</small></span>
      <ChevronDown size={14} />
    </Link>
  )
}

function EmptyReceiving({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="receiving-empty">
      <span><Box size={48} /></span>
      <h2>No receipts found</h2>
      <p>You have not recorded any receiving transactions yet.</p>
      <button type="button" className="receiving-primary" onClick={onCreate}><Plus size={16} /> New Receiving</button>
    </div>
  )
}

function ReceiptDetail({ receipt, activeTab, setActiveTab, onClose }: { receipt: NormalizedReceipt; activeTab: DetailTab; setActiveTab: (tab: DetailTab) => void; onClose: () => void }) {
  return (
    <section className="receiving-detail-panel">
      <div className="receiving-detail-head">
        <button type="button" aria-label="Close receiving detail" onClick={onClose}><X size={17} /></button>
        <h2>{receipt.receiptNumber}</h2>
        <Badge tone={statusConfig[receipt.status].tone}>{receipt.status}</Badge>
        <p>{receipt.poNumber} - {receipt.supplierName}</p>
      </div>

      <div className="receiving-detail-tabs">
        {detailTabs.map(tab => (
          <button key={tab} type="button" className={activeTab === tab ? 'active' : ''} onClick={() => setActiveTab(tab)}>{tab}</button>
        ))}
      </div>

      {activeTab === 'Details' && (
        <div className="receiving-detail-body">
          <h3>Receipt Information</h3>
          <SummaryLine label="Receipt Date" value={formatDate(receipt.receiptDate)} />
          <SummaryLine label="Received By" value={receipt.receivedBy || '-'} />
          <SummaryLine label="Delivery Date" value={formatDate(receipt.deliveryDate)} />
          <SummaryLine label="Reference / Notes" value={receipt.referenceNotes || '-'} />
          <h3>Summary</h3>
          <SummaryLine label="Total Items" value={String(receipt.totalItems)} />
          <SummaryLine label="Total Quantity Received" value={String(receipt.totalQuantity)} />
          <SummaryLine label="Total Value (PHP)" value={formatCurrency(receipt.total)} />
          <h3>Receiving Progress</h3>
          <span className="receiving-progress large"><span style={{ width: `${clampPercent(receipt.receivedPercent)}%` }} /></span>
          <strong>{clampPercent(receipt.receivedPercent)}% received</strong>
          <h3>Related Documents</h3>
          <RelatedLink label="Purchase Order" value={receipt.poNumber || '-'} href="/procurement/purchase-orders" />
          <RelatedLink label="Delivery Receipt" value={receipt.receiptNumber} href="/procurement/receiving" />
        </div>
      )}

      {activeTab === 'Items' && (
        <div className="receiving-detail-body">
          {receipt.items.length ? receipt.items.map(item => (
            <div key={item.id} className="receiving-detail-item">
              <strong>{item.name}</strong>
              <span>{item.receivedQuantity} / {item.orderedQuantity} {item.unit}</span>
              <small>{item.condition}{item.notes ? ` - ${item.notes}` : ''}</small>
            </div>
          )) : <p>No item details recorded.</p>}
        </div>
      )}

      {activeTab === 'Attachments' && (
        <div className="receiving-detail-body">
          {receipt.attachments.length ? receipt.attachments.map(file => (
            <div key={file.id} className="receiving-detail-item">
              <strong>{file.name}</strong>
              <small>{file.size}</small>
            </div>
          )) : <p>No attachments recorded.</p>}
        </div>
      )}

      {activeTab === 'Activity' && (
        <div className="receiving-detail-body">
          {receipt.activity.length ? receipt.activity.map(entry => (
            <div key={entry} className="receiving-detail-item">
              <strong>{entry}</strong>
            </div>
          )) : <p>No activity yet.</p>}
        </div>
      )}

      <div className="receiving-detail-actions">
        <button type="button" className="receiving-secondary" onClick={() => window.print()}><Printer size={15} /> Print</button>
        <button type="button" className="receiving-primary" onClick={onClose}>Close Detail <ChevronDown size={14} /></button>
      </div>
    </section>
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

function normalizeOrder(row: StoredRow, index: number): PurchaseOrderOption | null {
  const poNumber = textFrom(row.poNumber) || textFrom(row.reference) || `PO-${String(index + 1).padStart(4, '0')}`
  const items = readArray(row.items).filter(isRecord).map(item => ({
    name: textFrom(item.name) || textFrom(item.description) || 'Item',
    sku: textFrom(item.sku),
    unit: textFrom(item.unit) || textFrom(item.uom),
    quantity: numberValue(item.quantity ?? item.qty),
    unitPrice: moneyValue(item.unitPrice ?? item.price ?? item.cost),
    amount: moneyValue(item.amount ?? item.total),
  }))
  const total = moneyValue(row.total ?? row.grandTotal ?? row.amount) || items.reduce((sum, item) => sum + (item.amount || item.quantity * item.unitPrice), 0)
  return {
    id: textFrom(row.id) || poNumber,
    poNumber,
    supplierName: textFrom(row.supplierName) || textFrom(row.supplier) || 'Unknown supplier',
    deliveryDate: textFrom(row.deliveryDate) || textFrom(row.dueDate),
    total,
    receivedPercent: clampPercent(numberValue(row.receivedPercent ?? row.received)),
    items,
    source: row,
  }
}

function normalizeReceipt(row: StoredRow, index: number, orders: PurchaseOrderOption[]): NormalizedReceipt | null {
  const receiptNumber = textFrom(row.receiptNumber) || textFrom(row.number) || textFrom(row.reference) || `RCV-${String(index + 1).padStart(4, '0')}`
  const poId = textFrom(row.poId)
  const poNumber = textFrom(row.poNumber)
  const order = orders.find(item => item.id === poId || item.poNumber === poNumber)
  const items = readArray(row.items).filter(isRecord).map((item, itemIndex) => ({
    id: textFrom(item.id) || `${receiptNumber}-${itemIndex}`,
    name: textFrom(item.name) || textFrom(item.description) || 'Item',
    sku: textFrom(item.sku),
    unit: textFrom(item.unit),
    orderedQuantity: textFrom(item.orderedQuantity) || textFrom(item.ordered) || '',
    receivedQuantity: textFrom(item.receivedQuantity) || textFrom(item.received) || textFrom(item.quantity) || '',
    condition: textFrom(item.condition) || 'Good',
    notes: textFrom(item.notes),
  }))
  const totalQuantity = numberValue(row.totalQuantity) || items.reduce((sum, item) => sum + numberValue(item.receivedQuantity), 0)
  const orderedQuantity = items.reduce((sum, item) => sum + numberValue(item.orderedQuantity), 0)
  return {
    id: textFrom(row.id) || receiptNumber,
    receiptNumber,
    poNumber: poNumber || order?.poNumber || '-',
    poId: poId || order?.id || '',
    supplierName: textFrom(row.supplierName) || order?.supplierName || 'Unknown supplier',
    receiptDate: textFrom(row.receiptDate) || textFrom(row.date) || textFrom(row.createdAt),
    deliveryDate: textFrom(row.deliveryDate) || order?.deliveryDate || '',
    status: normalizeStatus(textFrom(row.status), textFrom(row.deliveryDate) || order?.deliveryDate || ''),
    receivedBy: textFrom(row.receivedBy) || textFrom(row.user),
    total: moneyValue(row.total ?? row.amount) || orderValueForReceivedItems(items, order),
    totalItems: numberValue(row.totalItems) || items.length,
    totalQuantity,
    receivedPercent: clampPercent(numberValue(row.receivedPercent) || (orderedQuantity ? Math.round((totalQuantity / orderedQuantity) * 100) : 0)),
    referenceNotes: textFrom(row.referenceNotes) || textFrom(row.notes),
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

function orderValueForReceivedItems(items: ReceiptItem[], order?: PurchaseOrderOption) {
  if (!order) return 0
  return items.reduce((sum, item) => {
    const orderItem = order.items.find(poItem => poItem.sku === item.sku && poItem.name === item.name)
    const unitPrice = orderItem?.unitPrice || (orderItem && orderItem.quantity ? orderItem.amount / orderItem.quantity : 0)
    return sum + numberValue(item.receivedQuantity) * unitPrice
  }, 0)
}

function normalizeStatus(value: string, deliveryDate = ''): ReceiptStatus {
  const normalized = value.toLowerCase()
  if (normalized.includes('cancel')) return 'Cancelled'
  if (normalized.includes('partial')) return 'Partially Received'
  if (normalized.includes('overdue')) return 'Overdue'
  if (normalized.includes('pending') || normalized.includes('draft')) return 'Pending'
  if (normalized.includes('receive') || normalized.includes('complete')) return 'Received'
  if (deliveryDate && new Date(deliveryDate).getTime() < startOfToday().getTime()) return 'Overdue'
  return 'Pending'
}

function statusFromPercent(percent: number, deliveryDate = ''): ReceiptStatus {
  if (percent >= 100) return 'Received'
  if (percent > 0) return 'Partially Received'
  return normalizeStatus('', deliveryDate)
}

function nextReceiptNumber(receipts: NormalizedReceipt[]) {
  const year = new Date().getFullYear()
  const next = receipts.reduce((max, receipt) => {
    const match = receipt.receiptNumber.match(/(\d+)$/)
    return match ? Math.max(max, Number(match[1])) : max
  }, 0) + 1
  return `RCV-${year}-${String(next).padStart(4, '0')}`
}

function uniqueRows(rows: StoredRow[]) {
  const seen = new Set<string>()
  return rows.filter((row, index) => {
    const key = textFrom(row.id) || textFrom(row.receiptNumber) || textFrom(row.poNumber) || textFrom(row.reference) || String(index)
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
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

function clampPercent(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)))
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', maximumFractionDigits: 2 }).format(value).replace('PHP', 'Php')
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

function uniqueValues(values: string[]) {
  return [...new Set(values)].sort((a, b) => a.localeCompare(b))
}

function csvEscape(value: string) {
  // Neutralize spreadsheet formula injection: a cell starting with = + - @ is
  // treated as a formula by Excel/Sheets. Prefix it with an apostrophe.
  let text = String(value ?? '').replace(/"/g, '""')
  if (/^[=+\-@]/.test(text.trimStart())) text = `'${text}`
  return `"${text}"`
}

function downloadCsv(filename: string, rows: string[][]) {
  if (typeof window === 'undefined') return
  const csv = rows.map(row => row.map(csvEscape).join(',')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}

const receivingCss = `
.receiving-page {
  min-height: 100%;
  padding: 28px;
  color: #0f172a;
}
.receiving-head,
.receiving-title-row,
.receiving-actions,
.receiving-toolbar,
.receiving-filter-panel,
.receiving-tabs,
.receiving-pagination,
.receiving-pagination > div,
.receiving-card span,
.receiving-card-title,
.receiving-detail-actions {
  display: flex;
  align-items: center;
}
.receiving-head {
  justify-content: space-between;
  gap: 20px;
  margin-bottom: 24px;
}
.receiving-breadcrumb {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #000000;
  font-size: 12px;
  margin-bottom: 10px;
}
.receiving-breadcrumb strong {
  color: #0f172a;
}
.receiving-title-row {
  gap: 14px;
}
.receiving-title-icon,
.receiving-kpi-icon {
  display: grid;
  place-items: center;
}
.receiving-title-icon {
  width: 42px;
  height: 42px;
  border-radius: 13px;
  background: #dcfce7;
  color: #16a34a;
}
.receiving-title-row h1,
.receiving-title-row h2 {
  margin: 0;
  font-size: clamp(25px, 2.25vw, 34px);
  line-height: 1.1;
  letter-spacing: -0.03em;
}
.receiving-title-row p {
  margin: 8px 0 0;
  color: #000000;
  font-size: 14px;
}
.receiving-actions {
  gap: 10px;
  flex-wrap: wrap;
  justify-content: flex-end;
}
.receiving-primary,
.receiving-secondary,
.receiving-icon-button,
.receiving-row-actions > button,
.receiving-view-toggle button,
.receiving-pagination button,
.receiving-pagination select,
.receiving-link,
.receiving-drawer-head button {
  min-height: 42px;
  border-radius: 11px;
  border: 1px solid #e5e7eb;
  background: #fff;
  color: #0f172a;
  font: inherit;
  font-size: 13px;
  font-weight: 850;
  cursor: pointer;
}
.receiving-primary,
.receiving-secondary {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 9px;
  padding: 0 15px;
}
.receiving-primary {
  background: #16a34a;
  border-color: #16a34a;
  color: #fff;
}
.receiving-primary:disabled,
.receiving-secondary:disabled {
  opacity: .5;
  cursor: not-allowed;
}
.receiving-icon-button,
.receiving-row-actions > button,
.receiving-drawer-head button {
  width: 42px;
  display: grid;
  place-items: center;
}
.receiving-grid-shell {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(300px, 360px);
  gap: 16px;
}
.receiving-left {
  min-width: 0;
}
.receiving-right {
  display: grid;
  gap: 16px;
  align-content: start;
}
.receiving-stats {
  display: grid;
  grid-template-columns: repeat(4, minmax(160px, 1fr));
  gap: 16px;
  margin-bottom: 18px;
}
.receiving-kpi,
.receiving-workspace,
.receiving-side-card,
.receiving-detail-panel,
.receiving-drawer {
  background: #fff;
  border: 1px solid #e5e7eb;
  box-shadow: 0 14px 34px rgba(15, 23, 42, 0.05);
}
.receiving-kpi {
  min-height: 112px;
  border-radius: 16px;
  padding: 18px;
  display: flex;
  align-items: center;
  gap: 15px;
}
.receiving-kpi-icon {
  width: 52px;
  height: 52px;
  border-radius: 13px;
}
.receiving-kpi-icon.green { background: #dcfce7; color: #16a34a; }
.receiving-kpi-icon.blue { background: #dbeafe; color: #2563eb; }
.receiving-kpi-icon.orange { background: #ffedd5; color: #f97316; }
.receiving-kpi span:not(.receiving-kpi-icon) {
  display: block;
  color: #000000;
  font-size: 12px;
  font-weight: 800;
}
.receiving-kpi strong {
  display: block;
  margin-top: 6px;
  font-size: 22px;
  line-height: 1;
}
.receiving-kpi small {
  display: block;
  margin-top: 8px;
  color: #000000;
  font-size: 12px;
}
.receiving-workspace {
  border-radius: 16px;
  overflow: visible;
}
.receiving-tabs {
  gap: 30px;
  overflow-x: auto;
  border-bottom: 1px solid #e5e7eb;
  padding: 0 16px;
}
.receiving-tabs button {
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
.receiving-tabs button.active {
  color: #111827;
  border-color: #16a34a;
}
.receiving-tabs span {
  color: #000000;
  margin-left: 6px;
  font-size: 12px;
}
.receiving-toolbar,
.receiving-filter-panel {
  gap: 12px;
  flex-wrap: wrap;
  padding: 16px;
  border-bottom: 1px solid #e5e7eb;
}
.receiving-filter-panel {
  background: #f8fafc;
}
.receiving-search {
  min-width: 250px;
  flex: 1 1 340px;
  height: 44px;
  border: 1px solid #e5e7eb;
  border-radius: 11px;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 0 13px;
  color: #000000;
  background: #fff;
}
.receiving-search input,
.receiving-select select {
  width: 100%;
  border: 0;
  outline: 0;
  background: transparent;
  font: inherit;
  color: #0f172a;
}
.receiving-select {
  min-width: 135px;
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
.receiving-select span {
  white-space: nowrap;
}
.receiving-view-toggle {
  margin-left: auto;
  display: inline-flex;
  border: 1px solid #e5e7eb;
  border-radius: 11px;
  overflow: hidden;
}
.receiving-view-toggle button {
  width: 42px;
  border: 0;
  border-radius: 0;
}
.receiving-view-toggle button.active {
  color: #16a34a;
  background: #ecfdf5;
}
.receiving-list-card {
  min-width: 0;
  padding: 16px;
}
.receiving-table-wrap {
  min-width: 0;
  overflow: auto;
  border: 1px solid #edf2f7;
  border-radius: 12px;
}
.receiving-table {
  width: 100%;
  min-width: 1040px;
  border-collapse: collapse;
}
.receiving-table th,
.receiving-table td {
  padding: 14px 12px;
  text-align: left;
  border-bottom: 1px solid #e5e7eb;
  font-size: 12px;
  vertical-align: middle;
}
.receiving-table th {
  background: #f8fafc;
  color: #000000;
  text-transform: uppercase;
  font-size: 10px;
  letter-spacing: .02em;
}
.receiving-table tr.selected,
.receiving-table tr:hover {
  background: #f0fdf4;
}
.receiving-link {
  min-height: auto;
  border: 0;
  background: transparent;
  color: #2563eb;
  padding: 0;
  font-size: 12px;
}
.receiving-badge {
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
.receiving-badge.green { background: #dcfce7; color: #15803d; }
.receiving-badge.blue { background: #dbeafe; color: #2563eb; }
.receiving-badge.orange { background: #ffedd5; color: #f97316; }
.receiving-badge.red { background: #fee2e2; color: #ef4444; }
.receiving-badge.gray { background: #f1f5f9; color: #000000; }
.receiving-row-actions {
  position: relative;
}
.receiving-action-menu {
  position: absolute;
  top: 46px;
  right: 0;
  z-index: 25;
  width: 180px;
  padding: 8px;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  background: #fff;
  box-shadow: 0 20px 45px rgba(15, 23, 42, 0.16);
}
.receiving-action-menu button {
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
.receiving-action-menu button:hover {
  background: #f1f5f9;
}
.receiving-card-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(230px, 1fr));
  gap: 12px;
}
.receiving-card {
  border: 1px solid #e5e7eb;
  border-radius: 14px;
  padding: 15px;
  text-align: left;
  background: #fff;
  cursor: pointer;
}
.receiving-card.selected {
  border-color: #16a34a;
  box-shadow: 0 0 0 3px #dcfce7;
}
.receiving-card span {
  justify-content: space-between;
  gap: 8px;
}
.receiving-card h3 {
  margin: 12px 0 6px;
  font-size: 15px;
}
.receiving-card p,
.receiving-card small {
  color: #000000;
  font-size: 12px;
}
.receiving-progress {
  display: block;
  height: 6px;
  border-radius: 999px;
  overflow: hidden;
  background: #e5e7eb;
}
.receiving-progress span {
  display: block;
  height: 100%;
  background: #16a34a;
}
.receiving-progress.large {
  height: 8px;
  margin: 12px 0 8px;
}
.receiving-pagination {
  justify-content: space-between;
  gap: 12px;
  padding-top: 16px;
  font-size: 13px;
  font-weight: 800;
}
.receiving-pagination > div {
  gap: 8px;
}
.receiving-pagination button {
  width: 38px;
}
.receiving-pagination button:disabled {
  opacity: .45;
  cursor: not-allowed;
}
.receiving-pagination strong {
  width: 38px;
  height: 38px;
  border-radius: 10px;
  display: grid;
  place-items: center;
  background: #16a34a;
  color: #fff;
}
.receiving-pagination select {
  padding: 0 10px;
}
.receiving-empty {
  min-height: 390px;
  display: grid;
  place-items: center;
  text-align: center;
  padding: 44px 18px;
}
.receiving-empty > span {
  width: 118px;
  height: 118px;
  border-radius: 999px;
  display: grid;
  place-items: center;
  margin-bottom: 18px;
  background: #dcfce7;
  color: #16a34a;
}
.receiving-empty h2 {
  margin: 0;
  font-size: 19px;
}
.receiving-empty p {
  color: #000000;
  font-size: 13px;
}
.receiving-side-card,
.receiving-detail-panel {
  border-radius: 16px;
  padding: 16px;
}
.receiving-side-card h2,
.receiving-detail-panel h2 {
  margin: 0;
  font-size: 15px;
}
.receiving-side-card p {
  color: #000000;
  font-size: 13px;
}
.receiving-summary-line,
.receiving-total-line {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 0;
  border-bottom: 1px solid #e5e7eb;
  font-size: 12px;
}
.receiving-summary-line span {
  color: #000000;
}
.receiving-total-line {
  margin: 8px -16px -16px;
  padding: 16px;
  background: #ecfdf5;
  border-bottom: 0;
  border-radius: 0 0 14px 14px;
}
.receiving-related-link {
  width: 100%;
  min-height: 52px;
  display: grid;
  grid-template-columns: 22px minmax(0, 1fr) 16px;
  align-items: center;
  gap: 10px;
  border: 1px solid #e5e7eb;
  border-radius: 11px;
  background: #fff;
  padding: 0 12px;
  text-align: left;
  text-decoration: none;
  color: #0f172a;
  margin-top: 10px;
  cursor: pointer;
}
.receiving-related-link small {
  display: block;
  color: #000000;
  font-size: 11px;
}
.receiving-detail-head {
  position: relative;
}
.receiving-detail-head > button {
  position: absolute;
  right: 0;
  top: 0;
  border: 0;
  background: transparent;
  cursor: pointer;
}
.receiving-detail-head p {
  color: #000000;
  font-size: 12px;
}
.receiving-detail-tabs {
  display: flex;
  gap: 18px;
  overflow-x: auto;
  border-bottom: 1px solid #e5e7eb;
  margin: 14px -16px 0;
  padding: 0 16px;
}
.receiving-detail-tabs button {
  min-height: 42px;
  border: 0;
  border-bottom: 2px solid transparent;
  background: transparent;
  font: inherit;
  font-size: 12px;
  font-weight: 900;
  cursor: pointer;
}
.receiving-detail-tabs button.active {
  border-color: #16a34a;
}
.receiving-detail-body {
  padding-top: 14px;
}
.receiving-detail-body h3 {
  margin: 16px 0 8px;
  font-size: 13px;
}
.receiving-detail-item {
  display: grid;
  gap: 4px;
  padding: 10px 0;
  border-bottom: 1px solid #e5e7eb;
  font-size: 12px;
}
.receiving-detail-item small,
.receiving-detail-item span {
  color: #000000;
}
.receiving-detail-actions {
  gap: 10px;
  margin-top: 16px;
}
.receiving-detail-actions > * {
  flex: 1;
}
.receiving-backdrop {
  position: fixed;
  inset: 0;
  z-index: 80;
  display: flex;
  justify-content: flex-end;
  background: rgba(15, 23, 42, .42);
}
.receiving-drawer {
  width: min(1180px, calc(100vw - 32px));
  height: 100%;
  overflow: auto;
  border-radius: 0;
}
.receiving-drawer-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  padding: 24px;
  border-bottom: 1px solid #e5e7eb;
}
.receiving-drawer-head h2 {
  font-size: 24px;
}
.receiving-form-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(280px, 320px);
  gap: 16px;
  padding: 16px 16px 86px;
  align-items: start;
}
.receiving-form-main,
.receiving-form-side {
  display: grid;
  gap: 16px;
}
.receiving-form-card {
  border: 1px solid #e5e7eb;
  border-radius: 14px;
  background: #fff;
  padding: 16px;
}
.receiving-form-card h3,
.receiving-card-title h3 {
  margin: 0;
  font-size: 15px;
}
.receiving-card-title {
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 14px;
}
.receiving-card-title p {
  margin: 5px 0 0;
  color: #000000;
  font-size: 12px;
}
.receiving-form-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14px;
  margin-top: 16px;
}
.receiving-form-grid label {
  display: grid;
  gap: 8px;
  color: #334155;
  font-size: 12px;
  font-weight: 900;
}
.receiving-form-grid label.wide {
  grid-column: span 2;
}
.receiving-form-grid input,
.receiving-form-grid select,
.receiving-form-grid textarea,
.receiving-items-table input,
.receiving-items-table select {
  min-height: 44px;
  border: 1px solid #d1d5db;
  border-radius: 11px;
  padding: 0 12px;
  width: 100%;
  outline: 0;
  background: #fff;
  color: #0f172a;
  font: inherit;
}
.receiving-form-grid textarea {
  min-height: 44px;
  padding: 12px;
  resize: vertical;
}
.receiving-form-grid small {
  color: #000000;
  font-size: 11px;
}
.receiving-items-wrap {
  overflow: auto;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
}
.receiving-items-table {
  width: 100%;
  min-width: 860px;
  border-collapse: collapse;
}
.receiving-items-table th,
.receiving-items-table td {
  padding: 10px;
  border-bottom: 1px solid #edf2f7;
  text-align: left;
  font-size: 11px;
}
.receiving-items-table th {
  background: #f8fafc;
  color: #000000;
  text-transform: uppercase;
}
.receiving-empty-box {
  min-height: 150px;
  display: grid;
  place-items: center;
  text-align: center;
  gap: 6px;
  border: 1px dashed #cbd5e1;
  border-radius: 13px;
  color: #000000;
  padding: 20px;
}
.receiving-empty-box strong {
  color: #0f172a;
}
.receiving-dropzone {
  min-height: 130px;
  display: grid;
  place-items: center;
  text-align: center;
  gap: 5px;
  border: 1px dashed #cbd5e1;
  border-radius: 13px;
  padding: 18px;
  color: #000000;
  cursor: pointer;
}
.receiving-dropzone strong {
  color: #334155;
  font-size: 12px;
}
.receiving-dropzone span {
  color: #16a34a;
  font-size: 12px;
  font-weight: 900;
}
.receiving-dropzone small {
  font-size: 10px;
}
.receiving-attachment-list {
  display: grid;
  gap: 8px;
  margin-top: 10px;
}
.receiving-attachment-list div {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  min-height: 34px;
  padding: 0 8px;
  border-radius: 9px;
  background: #f8fafc;
  font-size: 12px;
  font-weight: 800;
}
.receiving-attachment-list button {
  border: 0;
  background: transparent;
  color: #ef4444;
  cursor: pointer;
}
.receiving-form-footer {
  position: sticky;
  left: 0;
  right: 0;
  bottom: 0;
  grid-column: 1 / -1;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 14px 16px;
  border-top: 1px solid #e5e7eb;
  background: rgba(255, 255, 255, .96);
  backdrop-filter: blur(10px);
}
.receiving-form-footer > div {
  display: flex;
  gap: 12px;
}
@media (max-width: 1280px) {
  .receiving-grid-shell {
    grid-template-columns: minmax(0, 1fr);
  }
  .receiving-right {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .receiving-stats {
    grid-template-columns: repeat(2, minmax(160px, 1fr));
  }
}
@media (max-width: 900px) {
  .receiving-page {
    padding: 18px 14px 28px;
  }
  .receiving-head {
    display: grid;
  }
  .receiving-actions {
    justify-content: stretch;
  }
  .receiving-actions > *,
  .receiving-toolbar > *,
  .receiving-filter-panel > * {
    flex: 1 1 100%;
  }
  .receiving-stats {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .receiving-toolbar {
    align-items: stretch;
  }
  .receiving-view-toggle {
    margin-left: 0;
    width: 100%;
  }
  .receiving-view-toggle button {
    flex: 1;
  }
  .receiving-right {
    grid-template-columns: 1fr;
  }
  .receiving-table-wrap {
    border: 0;
    overflow: visible;
  }
  .receiving-table,
  .receiving-table thead,
  .receiving-table tbody,
  .receiving-table tr,
  .receiving-table td {
    display: block;
    min-width: 0;
  }
  .receiving-table thead {
    display: none;
  }
  .receiving-table tr {
    border: 1px solid #e5e7eb;
    border-radius: 14px;
    padding: 14px;
    margin-bottom: 12px;
    background: #fff;
  }
  .receiving-table td {
    border: 0;
    padding: 7px 0;
  }
  .receiving-table td:nth-child(1) {
    display: none;
  }
  .receiving-table td::before {
    content: attr(data-label);
    display: inline-block;
    min-width: 118px;
    color: #000000;
    font-size: 11px;
    font-weight: 900;
  }
  .receiving-row-actions {
    display: flex;
    justify-content: flex-end;
  }
  .receiving-pagination {
    display: grid;
  }
  .receiving-form-layout {
    grid-template-columns: 1fr;
  }
  .receiving-form-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
@media (max-width: 540px) {
  .receiving-stats {
    grid-template-columns: 1fr;
  }
  .receiving-list-card {
    padding: 12px;
  }
  .receiving-drawer {
    width: 100vw;
    border-radius: 18px 18px 0 0;
    height: calc(100% - 20px);
    margin-top: 20px;
  }
  .receiving-drawer-head,
  .receiving-form-layout {
    padding: 18px;
  }
  .receiving-form-grid {
    grid-template-columns: 1fr;
  }
  .receiving-form-grid label.wide {
    grid-column: auto;
  }
  .receiving-form-footer,
  .receiving-form-footer > div {
    display: grid;
    width: 100%;
  }
}
`
