'use client'

import { FormEvent, useEffect, useMemo, useState } from 'react'
import {
  Boxes,
  CheckCircle2,
  Edit3,
  Filter,
  MoreHorizontal,
  PackagePlus,
  Plus,
  Search,
  Trash2,
  X,
} from 'lucide-react'
import { companyChangeEvent, companyScopedKey, getActiveCompany } from '@/lib/tenant/company'

const font = 'var(--font-body)'
const pricebookKey = 'flowsys-pricebook-items'
const suppliersKey = 'flowsys-suppliers'

type StoredRow = Record<string, unknown>
type ItemType = 'Material' | 'Labor' | 'Equipment' | 'Service' | 'Other'
type ItemStatus = 'Active' | 'Inactive'

type PricebookItem = {
  id: string
  sku: string
  name: string
  itemType: ItemType
  unit: string
  cost: number
  markup: number
  price: number
  vendor: string
  reorderPoint: number
  status: ItemStatus
  notes: string
}

type SupplierOption = {
  id: string
  name: string
}

type PricebookForm = {
  sku: string
  name: string
  itemType: ItemType
  unit: string
  cost: string
  markup: string
  price: string
  vendor: string
  reorderPoint: string
  status: ItemStatus
  notes: string
}

const emptyForm: PricebookForm = {
  sku: '',
  name: '',
  itemType: 'Material',
  unit: 'pcs',
  cost: '',
  markup: '15',
  price: '',
  vendor: '',
  reorderPoint: '',
  status: 'Active',
  notes: '',
}

const itemTypes: ItemType[] = ['Material', 'Labor', 'Equipment', 'Service', 'Other']
const units = ['pcs', 'bag', 'box', 'kg', 'm', 'sqm', 'hour', 'day', 'lot']

export default function ProcurementPricebookPage() {
  const [companyId, setCompanyId] = useState('')
  const [storedItems, setStoredItems] = useState<StoredRow[]>([])
  const [suppliers, setSuppliers] = useState<SupplierOption[]>([])
  const [search, setSearch] = useState('')
  const [activeTab, setActiveTab] = useState<'All' | ItemStatus>('All')
  const [typeFilter, setTypeFilter] = useState<'All' | ItemType>('All')
  const [showCreate, setShowCreate] = useState(false)
  const [editingId, setEditingId] = useState('')
  const [openActionId, setOpenActionId] = useState('')
  const [form, setForm] = useState<PricebookForm>(emptyForm)

  useEffect(() => {
    const load = () => {
      const activeCompanyId = getActiveCompany()?.id || ''
      setCompanyId(activeCompanyId)
      setStoredItems(loadRows(pricebookKey, activeCompanyId))
      setSuppliers(loadSuppliers(activeCompanyId))
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

  const items = useMemo(() => storedItems.map(normalizeItem).filter(Boolean) as PricebookItem[], [storedItems])
  const supplierNames = useMemo(() => uniqueValues([...suppliers.map(supplier => supplier.name), ...items.map(item => item.vendor)].filter(Boolean)), [items, suppliers])

  const filteredItems = useMemo(() => {
    const needle = search.trim().toLowerCase()
    return items.filter(item => {
      const matchesSearch = !needle || [item.sku, item.name, item.itemType, item.unit, item.vendor, item.notes].some(value => value.toLowerCase().includes(needle))
      const matchesTab = activeTab === 'All' || item.status === activeTab
      const matchesType = typeFilter === 'All' || item.itemType === typeFilter
      return matchesSearch && matchesTab && matchesType
    })
  }, [activeTab, items, search, typeFilter])

  const stats = useMemo(() => {
    const active = items.filter(item => item.status === 'Active')
    const totalCost = items.reduce((sum, item) => sum + item.cost, 0)
    const totalPrice = items.reduce((sum, item) => sum + item.price, 0)
    const averageMarkup = items.length ? Math.round(items.reduce((sum, item) => sum + item.markup, 0) / items.length) : 0
    return {
      total: items.length,
      active: active.length,
      inactive: items.length - active.length,
      totalCost,
      totalPrice,
      averageMarkup,
    }
  }, [items])

  const tabs = [
    { label: 'All', count: items.length },
    { label: 'Active', count: stats.active },
    { label: 'Inactive', count: stats.inactive },
  ] as const

  function persist(nextRows: StoredRow[]) {
    const unique = uniqueRows(nextRows)
    setStoredItems(unique)
    persistRows(pricebookKey, unique, companyId)
  }

  function resetForm() {
    setForm(emptyForm)
    setEditingId('')
  }

  function openCreate() {
    resetForm()
    setShowCreate(true)
  }

  function openEdit(item: PricebookItem) {
    setForm({
      sku: item.sku,
      name: item.name,
      itemType: item.itemType,
      unit: item.unit,
      cost: String(item.cost || ''),
      markup: String(item.markup || ''),
      price: String(item.price || ''),
      vendor: item.vendor,
      reorderPoint: String(item.reorderPoint || ''),
      status: item.status,
      notes: item.notes,
    })
    setEditingId(item.id)
    setShowCreate(true)
    setOpenActionId('')
  }

  function closeForm() {
    resetForm()
    setShowCreate(false)
  }

  function updateCost(value: string) {
    const nextCost = numberValue(value)
    const markup = numberValue(form.markup)
    setForm(previous => ({ ...previous, cost: value, price: String(calculatedPrice(nextCost, markup) || '') }))
  }

  function updateMarkup(value: string) {
    const cost = numberValue(form.cost)
    const nextMarkup = numberValue(value)
    setForm(previous => ({ ...previous, markup: value, price: String(calculatedPrice(cost, nextMarkup) || '') }))
  }

  function saveItem(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const name = form.name.trim()
    if (!name) return

    const now = new Date()
    const record: StoredRow = {
      id: editingId || `pricebook-${now.getTime()}`,
      companyId,
      sku: form.sku.trim() || nextSku(items),
      name,
      itemType: form.itemType,
      unit: form.unit.trim() || 'pcs',
      cost: numberValue(form.cost),
      markup: numberValue(form.markup),
      price: numberValue(form.price) || calculatedPrice(numberValue(form.cost), numberValue(form.markup)),
      vendor: form.vendor.trim(),
      reorderPoint: numberValue(form.reorderPoint),
      status: form.status,
      notes: form.notes.trim(),
      updatedAt: now.toISOString(),
      createdAt: editingId ? undefined : now.toISOString(),
    }

    if (editingId) {
      persist(storedItems.map(item => textFrom(item.id) === editingId ? { ...item, ...record } : item))
    } else {
      persist([record, ...storedItems])
    }
    closeForm()
  }

  function deleteItem(item: PricebookItem) {
    persist(storedItems.filter(row => textFrom(row.id) !== item.id))
    setOpenActionId('')
  }

  function toggleStatus(item: PricebookItem) {
    const nextStatus: ItemStatus = item.status === 'Active' ? 'Inactive' : 'Active'
    persist(storedItems.map(row => textFrom(row.id) === item.id ? { ...row, status: nextStatus, updatedAt: new Date().toISOString() } : row))
    setOpenActionId('')
  }

  return (
    <main className="pricebook-page" style={{ fontFamily: font }}>
      <style>{pricebookCss}</style>

      <section className="pricebook-header">
        <div>
          <div className="pricebook-breadcrumb"><span>Procurement</span><span>/</span><strong>Pricebook</strong></div>
          <div className="pricebook-title-row">
            <span><Boxes size={21} /></span>
            <div>
              <h1>Pricebook</h1>
              <p>Add real materials, services, labor, and equipment pricing for requests, RFQs, and purchase orders.</p>
            </div>
          </div>
        </div>
        <button type="button" className="pricebook-primary-button" onClick={openCreate}><Plus size={17} /> Add Item</button>
      </section>

      <section className="pricebook-kpis" aria-label="Pricebook summary">
        <Kpi title="Total Items" value={String(stats.total)} helper="All records" />
        <Kpi title="Active Items" value={String(stats.active)} helper="Ready for procurement" />
        <Kpi title="Average Markup" value={`${stats.averageMarkup}%`} helper="Across pricebook" />
        <Kpi title="Cost Value" value={formatCurrency(stats.totalCost)} helper="Base cost total" />
        <Kpi title="Selling Value" value={formatCurrency(stats.totalPrice)} helper="Price total" />
      </section>

      <section className="pricebook-guide-strip">
        <span><PackagePlus size={22} /></span>
        <div>
          <strong>How to add items here</strong>
          <p>Click <b>Add Item</b>, enter the item name, SKU, unit, base cost, markup, selling price, and preferred supplier, then save. Purchase orders can then select these records from the pricebook.</p>
        </div>
      </section>

      <section className="pricebook-tabs" aria-label="Pricebook status tabs">
        {tabs.map(tab => (
          <button key={tab.label} type="button" className={activeTab === tab.label ? 'active' : ''} onClick={() => setActiveTab(tab.label)}>
            {tab.label} <span>{tab.count}</span>
          </button>
        ))}
      </section>

      <section className="pricebook-workspace">
        <div className="pricebook-toolbar">
          <label className="pricebook-search">
            <Search size={17} />
            <input value={search} onChange={event => setSearch(event.target.value)} placeholder="Search SKU, item, supplier, or type..." aria-label="Search pricebook items" />
          </label>
          <label className="pricebook-select">
            <Filter size={15} />
            <select value={typeFilter} onChange={event => setTypeFilter(event.target.value as 'All' | ItemType)} aria-label="Filter item type">
              <option value="All">All types</option>
              {itemTypes.map(type => <option key={type} value={type}>{type}</option>)}
            </select>
          </label>
          <button type="button" className="pricebook-secondary-button" onClick={() => { setSearch(''); setTypeFilter('All'); setActiveTab('All') }}>Reset</button>
        </div>

        {items.length === 0 ? (
          <div className="pricebook-empty">
            <span><PackagePlus size={42} /></span>
            <h2>No pricebook items yet</h2>
            <p>Start by adding your first real item. Use exact SKU, unit, cost, markup, and supplier data so procurement totals stay accurate.</p>
            <button type="button" className="pricebook-primary-button" onClick={openCreate}><Plus size={16} /> Add First Item</button>
          </div>
        ) : (
          <div className="pricebook-table-wrap">
            <table className="pricebook-table">
              <thead>
                <tr>
                  <th>Item</th>
                  <th>Type</th>
                  <th>Unit</th>
                  <th>Supplier</th>
                  <th>Cost</th>
                  <th>Markup</th>
                  <th>Price</th>
                  <th>Reorder</th>
                  <th>Status</th>
                  <th aria-label="Actions" />
                </tr>
              </thead>
              <tbody>
                {filteredItems.map(item => (
                  <tr key={item.id}>
                    <td data-label="Item"><strong>{item.name}</strong><small>{item.sku || 'No SKU'}</small></td>
                    <td data-label="Type">{item.itemType}</td>
                    <td data-label="Unit">{item.unit}</td>
                    <td data-label="Supplier">{item.vendor || '-'}</td>
                    <td data-label="Cost">{formatCurrency(item.cost)}</td>
                    <td data-label="Markup">{item.markup}%</td>
                    <td data-label="Price"><strong>{formatCurrency(item.price)}</strong></td>
                    <td data-label="Reorder">{item.reorderPoint || '-'}</td>
                    <td data-label="Status"><StatusBadge status={item.status} /></td>
                    <td data-label="Actions">
                      <div className="pricebook-row-actions">
                        <button type="button" aria-label={`Open actions for ${item.name}`} onClick={() => setOpenActionId(openActionId === item.id ? '' : item.id)}><MoreHorizontal size={17} /></button>
                        {openActionId === item.id && (
                          <div className="pricebook-action-menu">
                            <button type="button" onClick={() => openEdit(item)}><Edit3 size={14} /> Edit item</button>
                            <button type="button" onClick={() => toggleStatus(item)}><CheckCircle2 size={14} /> Mark {item.status === 'Active' ? 'Inactive' : 'Active'}</button>
                            <button type="button" className="danger" onClick={() => deleteItem(item)}><Trash2 size={14} /> Delete</button>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!filteredItems.length && (
              <div className="pricebook-inline-empty">
                <strong>No items match your filters</strong>
                <button type="button" onClick={() => { setSearch(''); setTypeFilter('All'); setActiveTab('All') }}>Reset filters</button>
              </div>
            )}
          </div>
        )}
      </section>

      <section className="pricebook-checklist">
        <h2>Before You Add Many Items</h2>
        {[
          'Confirm item naming and SKU format.',
          'Create or import supplier records.',
          'Define units such as pcs, bag, kg, m, hour, or lot.',
          'Verify base cost, markup, selling price, and stock thresholds.',
        ].map(item => (
          <div key={item}><CheckCircle2 size={17} /><span>{item}</span></div>
        ))}
      </section>

      {showCreate && (
        <div className="pricebook-drawer-backdrop" role="presentation" onMouseDown={closeForm}>
          <form className="pricebook-drawer" aria-labelledby="pricebook-form-title" onSubmit={saveItem} onMouseDown={event => event.stopPropagation()}>
            <div className="pricebook-drawer-head">
              <div>
                <h2 id="pricebook-form-title">{editingId ? 'Edit Pricebook Item' : 'Add Pricebook Item'}</h2>
                <p>Use real item and pricing details. These records feed procurement purchasing screens.</p>
              </div>
              <button type="button" aria-label="Close pricebook form" onClick={closeForm}><X size={18} /></button>
            </div>

            <div className="pricebook-form-grid">
              <label>
                Item Name
                <input value={form.name} onChange={event => setForm(previous => ({ ...previous, name: event.target.value }))} placeholder="e.g. Portland Cement Type 1" required />
              </label>
              <label>
                SKU
                <input value={form.sku} onChange={event => setForm(previous => ({ ...previous, sku: event.target.value }))} placeholder={nextSku(items)} />
              </label>
              <label>
                Item Type
                <select value={form.itemType} onChange={event => setForm(previous => ({ ...previous, itemType: event.target.value as ItemType }))}>
                  {itemTypes.map(type => <option key={type} value={type}>{type}</option>)}
                </select>
              </label>
              <label>
                Unit
                <input value={form.unit} onChange={event => setForm(previous => ({ ...previous, unit: event.target.value }))} list="pricebook-units" placeholder="pcs" />
                <datalist id="pricebook-units">{units.map(unit => <option key={unit} value={unit} />)}</datalist>
              </label>
              <label>
                Base Cost
                <input type="number" min="0" step="0.01" value={form.cost} onChange={event => updateCost(event.target.value)} placeholder="0.00" />
              </label>
              <label>
                Markup %
                <input type="number" min="0" step="0.01" value={form.markup} onChange={event => updateMarkup(event.target.value)} placeholder="15" />
              </label>
              <label>
                Selling Price
                <input type="number" min="0" step="0.01" value={form.price} onChange={event => setForm(previous => ({ ...previous, price: event.target.value }))} placeholder="0.00" />
              </label>
              <label>
                Preferred Supplier
                <input value={form.vendor} onChange={event => setForm(previous => ({ ...previous, vendor: event.target.value }))} list="pricebook-suppliers" placeholder="Supplier name" />
                <datalist id="pricebook-suppliers">{supplierNames.map(name => <option key={name} value={name} />)}</datalist>
              </label>
              <label>
                Reorder Point
                <input type="number" min="0" step="1" value={form.reorderPoint} onChange={event => setForm(previous => ({ ...previous, reorderPoint: event.target.value }))} placeholder="0" />
              </label>
              <label>
                Status
                <select value={form.status} onChange={event => setForm(previous => ({ ...previous, status: event.target.value as ItemStatus }))}>
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </label>
              <label className="wide">
                Notes
                <textarea value={form.notes} onChange={event => setForm(previous => ({ ...previous, notes: event.target.value }))} placeholder="Brand, specification, warranty, sourcing notes, or pricing assumptions." />
              </label>
            </div>

            <footer className="pricebook-drawer-footer">
              <div>
                <span>Calculated price</span>
                <strong>{formatCurrency(numberValue(form.price) || calculatedPrice(numberValue(form.cost), numberValue(form.markup)))}</strong>
              </div>
              <div>
                <button type="button" className="pricebook-secondary-button" onClick={closeForm}>Cancel</button>
                <button type="submit" className="pricebook-primary-button">{editingId ? 'Save Changes' : 'Save Item'}</button>
              </div>
            </footer>
          </form>
        </div>
      )}
    </main>
  )
}

function Kpi({ title, value, helper }: { title: string; value: string; helper: string }) {
  return (
    <article className="pricebook-kpi">
      <span>{title}</span>
      <strong>{value}</strong>
      <small>{helper}</small>
    </article>
  )
}

function StatusBadge({ status }: { status: ItemStatus }) {
  return <span className={`pricebook-badge ${status.toLowerCase()}`}>{status}</span>
}

function loadRows(key: string, companyId: string) {
  if (typeof window === 'undefined') return []
  const scoped = companyId ? readRows(window.localStorage.getItem(companyScopedKey(key, companyId))) : []
  const global = readRows(window.localStorage.getItem(key))
  const globalForCompany = scoped.length ? global.filter(row => textFrom(row.companyId) === companyId) : global
  const rows = scoped.length ? [...scoped, ...globalForCompany] : globalForCompany
  return uniqueRows(rows).filter(row => !companyId || !textFrom(row.companyId) || textFrom(row.companyId) === companyId)
}

function persistRows(key: string, rows: StoredRow[], companyId: string) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(companyScopedKey(key, companyId), JSON.stringify(rows))
  window.dispatchEvent(new Event('storage'))
}

function loadSuppliers(companyId: string): SupplierOption[] {
  return loadRows(suppliersKey, companyId).map((row, index) => ({
    id: textFrom(row.id) || `supplier-${index}`,
    name: textFrom(row.name || row.companyName || row.vendorName) || `Supplier ${index + 1}`,
  }))
}

function normalizeItem(row: StoredRow, index: number): PricebookItem | null {
  const name = textFrom(row.name || row.itemName || row.description)
  if (!name) return null
  const cost = numberValue(row.cost || row.baseCost)
  const markup = numberValue(row.markup)
  const price = numberValue(row.price || row.sellingPrice) || calculatedPrice(cost, markup)
  return {
    id: textFrom(row.id) || textFrom(row.sku) || `pricebook-${index}`,
    sku: textFrom(row.sku) || `PB-${String(index + 1).padStart(4, '0')}`,
    name,
    itemType: validItemType(textFrom(row.itemType || row.type || row.category)),
    unit: textFrom(row.unit || row.uom) || 'pcs',
    cost,
    markup,
    price,
    vendor: textFrom(row.vendor || row.supplierName || row.supplier),
    reorderPoint: numberValue(row.reorderPoint || row.minimumStock || row.minStock),
    status: textFrom(row.status).toLowerCase() === 'inactive' ? 'Inactive' : 'Active',
    notes: textFrom(row.notes || row.description),
  }
}

function uniqueRows(rows: StoredRow[]) {
  const seen = new Set<string>()
  return rows.filter((row, index) => {
    const id = textFrom(row.id) || `row-${index}`
    if (seen.has(id)) return false
    seen.add(id)
    return true
  })
}

function readRows(raw: string | null) {
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw) as unknown
    if (Array.isArray(parsed)) return parsed.filter(isRecord)
    if (isRecord(parsed) && Array.isArray(parsed.items)) return parsed.items.filter(isRecord)
  } catch {
    return []
  }
  return []
}

function isRecord(value: unknown): value is StoredRow {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value))
}

function textFrom(value: unknown) {
  return typeof value === 'string' ? value : value == null ? '' : String(value)
}

function numberValue(value: unknown) {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string') {
    const parsed = Number(value.replace(/[^0-9.-]/g, ''))
    return Number.isFinite(parsed) ? parsed : 0
  }
  return 0
}

function validItemType(value: string): ItemType {
  const match = itemTypes.find(type => type.toLowerCase() === value.toLowerCase())
  return match || 'Material'
}

function calculatedPrice(cost: number, markup: number) {
  return Math.round((cost + cost * (markup / 100)) * 100) / 100
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', maximumFractionDigits: 0 }).format(value || 0)
}

function nextSku(items: PricebookItem[]) {
  const max = items.reduce((highest, item) => {
    const match = item.sku.match(/(\d+)$/)
    return Math.max(highest, match ? Number(match[1]) : 0)
  }, 0)
  return `PB-${String(max + 1).padStart(4, '0')}`
}

function uniqueValues(values: string[]) {
  return Array.from(new Set(values.map(value => value.trim()).filter(Boolean))).sort((a, b) => a.localeCompare(b))
}

const pricebookCss = `
.pricebook-page {
  min-height: 100%;
  padding: 28px;
  color: #0f172a;
  background: #fff;
}
.pricebook-header,
.pricebook-title-row,
.pricebook-toolbar,
.pricebook-guide-strip,
.pricebook-tabs {
  display: flex;
  align-items: center;
}
.pricebook-header {
  justify-content: space-between;
  gap: 18px;
  margin-bottom: 18px;
}
.pricebook-breadcrumb {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #64748b;
  font-size: 13px;
  margin-bottom: 11px;
}
.pricebook-breadcrumb strong {
  color: #0f172a;
}
.pricebook-title-row {
  gap: 12px;
}
.pricebook-title-row > span,
.pricebook-guide-strip > span {
  width: 44px;
  height: 44px;
  border-radius: 10px;
  background: #ecfdf5;
  color: #16a34a;
  display: grid;
  place-items: center;
  flex: 0 0 auto;
}
.pricebook-title-row h1 {
  margin: 0;
  color: #07111f;
  font-size: 30px;
  line-height: 1.1;
  font-weight: 900;
  letter-spacing: 0;
}
.pricebook-title-row p {
  margin: 7px 0 0;
  color: #64748b;
  font-size: 14px;
  line-height: 1.5;
}
.pricebook-primary-button,
.pricebook-secondary-button,
.pricebook-row-actions > button,
.pricebook-action-menu button,
.pricebook-drawer-head button,
.pricebook-inline-empty button {
  min-height: 40px;
  border-radius: 10px;
  border: 1px solid #e5e7eb;
  background: #fff;
  color: #0f172a;
  font: inherit;
  font-size: 13px;
  font-weight: 850;
  cursor: pointer;
}
.pricebook-primary-button,
.pricebook-secondary-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 0 15px;
}
.pricebook-primary-button {
  border-color: #16a34a;
  background: #16a34a;
  color: #fff;
}
.pricebook-kpis {
  display: grid;
  grid-template-columns: repeat(5, minmax(145px, 1fr));
  gap: 14px;
  margin-bottom: 16px;
}
.pricebook-kpi,
.pricebook-workspace,
.pricebook-guide-strip,
.pricebook-checklist,
.pricebook-drawer {
  border: 1px solid #e5e7eb;
  background: #fff;
  box-shadow: 0 12px 30px rgba(15, 23, 42, .04);
}
.pricebook-kpi {
  border-radius: 14px;
  padding: 16px;
  min-height: 96px;
}
.pricebook-kpi span,
.pricebook-kpi small {
  display: block;
  color: #64748b;
  font-size: 12px;
}
.pricebook-kpi span {
  font-weight: 850;
}
.pricebook-kpi strong {
  display: block;
  margin: 8px 0 7px;
  font-size: 22px;
}
.pricebook-guide-strip {
  gap: 14px;
  border-radius: 14px;
  padding: 16px;
  margin-bottom: 16px;
}
.pricebook-guide-strip strong {
  font-size: 15px;
}
.pricebook-guide-strip p {
  margin: 5px 0 0;
  color: #64748b;
  font-size: 13px;
  line-height: 1.5;
}
.pricebook-guide-strip b {
  color: #0f172a;
}
.pricebook-tabs {
  gap: 28px;
  overflow-x: auto;
  border-bottom: 1px solid #e5e7eb;
}
.pricebook-tabs button {
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
.pricebook-tabs button.active {
  color: #111827;
  border-color: #16a34a;
}
.pricebook-tabs span {
  color: #64748b;
  margin-left: 6px;
  font-size: 12px;
}
.pricebook-workspace {
  border-radius: 0 0 14px 14px;
  overflow: visible;
}
.pricebook-toolbar {
  gap: 12px;
  padding: 16px;
  border-bottom: 1px solid #e5e7eb;
}
.pricebook-search,
.pricebook-select {
  height: 42px;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 0 12px;
  color: #64748b;
  background: #fff;
}
.pricebook-search {
  min-width: 240px;
  flex: 1;
}
.pricebook-select {
  min-width: 150px;
}
.pricebook-search input,
.pricebook-select select,
.pricebook-form-grid input,
.pricebook-form-grid select,
.pricebook-form-grid textarea {
  width: 100%;
  min-width: 0;
  border: 0;
  outline: 0;
  background: transparent;
  color: #0f172a;
  font: inherit;
}
.pricebook-empty,
.pricebook-inline-empty {
  min-height: 360px;
  display: grid;
  place-items: center;
  text-align: center;
  padding: 42px 18px;
}
.pricebook-empty > span {
  width: 104px;
  height: 104px;
  border-radius: 999px;
  background: #eff6ff;
  color: #64748b;
  display: grid;
  place-items: center;
  margin-bottom: 16px;
}
.pricebook-empty h2 {
  margin: 0;
  font-size: 19px;
}
.pricebook-empty p {
  max-width: 420px;
  color: #64748b;
  font-size: 13px;
  line-height: 1.55;
}
.pricebook-table-wrap {
  padding: 16px;
  overflow: auto;
}
.pricebook-table {
  width: 100%;
  min-width: 1040px;
  border-collapse: collapse;
}
.pricebook-table th,
.pricebook-table td {
  padding: 14px 12px;
  text-align: left;
  border-bottom: 1px solid #e5e7eb;
  font-size: 12px;
  vertical-align: middle;
}
.pricebook-table th {
  background: #f8fafc;
  color: #475569;
  text-transform: uppercase;
  font-size: 10px;
  letter-spacing: 0;
}
.pricebook-table tr:hover {
  background: #f0fdf4;
}
.pricebook-table td small {
  display: block;
  margin-top: 4px;
  color: #64748b;
}
.pricebook-badge {
  min-height: 24px;
  border-radius: 8px;
  display: inline-flex;
  align-items: center;
  padding: 0 9px;
  font-size: 10px;
  font-weight: 900;
  text-transform: uppercase;
}
.pricebook-badge.active {
  background: #dcfce7;
  color: #15803d;
}
.pricebook-badge.inactive {
  background: #f1f5f9;
  color: #475569;
}
.pricebook-row-actions {
  position: relative;
}
.pricebook-row-actions > button,
.pricebook-drawer-head button {
  width: 40px;
  display: grid;
  place-items: center;
}
.pricebook-action-menu {
  position: absolute;
  top: 44px;
  right: 0;
  z-index: 20;
  width: 190px;
  padding: 8px;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  background: #fff;
  box-shadow: 0 18px 40px rgba(15, 23, 42, .16);
}
.pricebook-action-menu button {
  width: 100%;
  min-height: 36px;
  border: 0;
  border-radius: 9px;
  justify-content: flex-start;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 10px;
}
.pricebook-action-menu button:hover {
  background: #f1f5f9;
}
.pricebook-action-menu button.danger {
  color: #ef4444;
}
.pricebook-inline-empty {
  min-height: 190px;
  gap: 10px;
}
.pricebook-inline-empty button {
  padding: 0 16px;
}
.pricebook-checklist {
  margin-top: 16px;
  border-radius: 14px;
  padding: 20px 24px;
  display: grid;
  gap: 12px;
}
.pricebook-checklist h2 {
  margin: 0 0 4px;
  font-size: 18px;
}
.pricebook-checklist div {
  display: flex;
  align-items: center;
  gap: 10px;
  color: #334155;
  font-size: 13px;
  font-weight: 750;
}
.pricebook-checklist svg {
  color: #16a34a;
}
.pricebook-drawer-backdrop {
  position: fixed;
  inset: 0;
  z-index: 80;
  background: rgba(15, 23, 42, .42);
  display: flex;
  justify-content: flex-end;
}
.pricebook-drawer {
  width: min(860px, calc(100vw - 32px));
  height: 100%;
  border-radius: 0;
  overflow: auto;
}
.pricebook-drawer-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  padding: 24px;
  border-bottom: 1px solid #e5e7eb;
}
.pricebook-drawer-head h2 {
  margin: 0;
  font-size: 22px;
}
.pricebook-drawer-head p {
  margin: 8px 0 0;
  color: #64748b;
  font-size: 13px;
}
.pricebook-form-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
  padding: 18px 18px 92px;
}
.pricebook-form-grid label {
  display: grid;
  gap: 8px;
  color: #334155;
  font-size: 12px;
  font-weight: 900;
}
.pricebook-form-grid label.wide {
  grid-column: 1 / -1;
}
.pricebook-form-grid input,
.pricebook-form-grid select,
.pricebook-form-grid textarea {
  min-height: 44px;
  border: 1px solid #d1d5db;
  border-radius: 10px;
  padding: 0 12px;
}
.pricebook-form-grid textarea {
  min-height: 92px;
  padding: 12px;
  resize: vertical;
}
.pricebook-drawer-footer {
  position: sticky;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 14px 18px;
  border-top: 1px solid #e5e7eb;
  background: rgba(255, 255, 255, .96);
  backdrop-filter: blur(10px);
}
.pricebook-drawer-footer > div {
  display: flex;
  align-items: center;
  gap: 12px;
}
.pricebook-drawer-footer span {
  color: #64748b;
  font-size: 12px;
}
.pricebook-drawer-footer strong {
  font-size: 18px;
}
@media (max-width: 1100px) {
  .pricebook-kpis {
    grid-template-columns: repeat(3, minmax(150px, 1fr));
  }
}
@media (max-width: 760px) {
  .pricebook-page {
    padding: 18px 14px 28px;
  }
  .pricebook-header {
    display: grid;
  }
  .pricebook-kpis,
  .pricebook-form-grid {
    grid-template-columns: 1fr;
  }
  .pricebook-toolbar {
    flex-wrap: wrap;
  }
  .pricebook-toolbar > * {
    flex: 1 1 100%;
  }
  .pricebook-table-wrap {
    border: 0;
    overflow: visible;
  }
  .pricebook-table,
  .pricebook-table thead,
  .pricebook-table tbody,
  .pricebook-table tr,
  .pricebook-table td {
    display: block;
    min-width: 0;
  }
  .pricebook-table thead {
    display: none;
  }
  .pricebook-table tr {
    border: 1px solid #e5e7eb;
    border-radius: 14px;
    padding: 14px;
    margin-bottom: 12px;
  }
  .pricebook-table td {
    border: 0;
    padding: 7px 0;
  }
  .pricebook-table td::before {
    content: attr(data-label);
    display: inline-block;
    min-width: 104px;
    color: #64748b;
    font-size: 11px;
    font-weight: 900;
  }
  .pricebook-drawer {
    width: 100vw;
    border-radius: 18px 18px 0 0;
    height: calc(100% - 20px);
    margin-top: 20px;
  }
  .pricebook-drawer-footer,
  .pricebook-drawer-footer > div {
    display: grid;
    width: 100%;
  }
}
`
