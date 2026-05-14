'use client'

/* eslint-disable @next/next/no-img-element */
import { ChangeEvent, CSSProperties, useEffect, useMemo, useRef, useState } from 'react'
import {
  BarChart3,
  Boxes,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Filter,
  Grid2X2,
  Image as ImageIcon,
  MoreHorizontal,
  PackagePlus,
  Plus,
  ReceiptText,
  Search,
  Star,
  Table2,
  UploadCloud,
  X,
} from 'lucide-react'

const storageKey = 'flowsys-pricebook-items'
const font = 'var(--font-body)'

type ItemStatus = 'Active' | 'Inactive' | 'Low Stock' | 'Out of Stock'
type ItemType = 'Material' | 'Labor' | 'Equipment' | 'Service' | 'Other'

type PricebookItem = {
  id: number
  name: string
  sku: string
  category: string
  itemType: ItemType
  unit: string
  cost: number
  markup: number
  price: number
  vendor: string
  notes: string
  status: ItemStatus
  stockOnHand: number
  minimumOrder: number
  leadTime: string
  paymentTerms: string
  image?: string
}

type NewItemForm = {
  name: string
  sku: string
  category: string
  itemType: ItemType
  unit: string
  vendor: string
  cost: string
  price: string
  markup: string
  status: ItemStatus
  notes: string
  image: string
}

const seedItems: PricebookItem[] = [
  {
    id: 1,
    name: 'Cement Ordinary Portland',
    sku: 'MAT-0001',
    category: 'Construction Materials',
    itemType: 'Material',
    unit: '20 pcs',
    cost: 2000,
    markup: 5,
    price: 2100,
    vendor: 'BuildWell Supplies',
    notes: 'High quality cement for construction use',
    status: 'Active',
    stockOnHand: 120,
    minimumOrder: 20,
    leadTime: '3 - 5 days',
    paymentTerms: '30 Days',
  },
  {
    id: 2,
    name: 'Steel Rebar 16mm',
    sku: 'MAT-0002',
    category: 'Construction Materials',
    itemType: 'Material',
    unit: '100 pcs',
    cost: 85,
    markup: 8,
    price: 91.8,
    vendor: 'SteelCorp Industries',
    notes: 'Deformed steel bar',
    status: 'Active',
    stockOnHand: 400,
    minimumOrder: 100,
    leadTime: '5 - 7 days',
    paymentTerms: '30 Days',
  },
  {
    id: 3,
    name: 'Paint Latex White',
    sku: 'MAT-0003',
    category: 'Finishing Materials',
    itemType: 'Material',
    unit: '4 L',
    cost: 450,
    markup: 10,
    price: 495,
    vendor: 'ColorPlus Inc.',
    notes: 'Premium quality',
    status: 'Active',
    stockOnHand: 64,
    minimumOrder: 12,
    leadTime: '2 - 4 days',
    paymentTerms: 'COD',
  },
  {
    id: 4,
    name: 'Plywood 12mm',
    sku: 'MAT-0004',
    category: 'Wood & Boards',
    itemType: 'Material',
    unit: '10 pcs',
    cost: 750,
    markup: 6,
    price: 795,
    vendor: 'WoodWorks Trading',
    notes: 'Marine plywood',
    status: 'Low Stock',
    stockOnHand: 6,
    minimumOrder: 10,
    leadTime: '4 - 6 days',
    paymentTerms: '15 Days',
  },
  {
    id: 5,
    name: 'THHN Wire 3.5mm',
    sku: 'ELEC-0001',
    category: 'Electrical Materials',
    itemType: 'Material',
    unit: '100 m',
    cost: 15,
    markup: 7,
    price: 16.05,
    vendor: 'ElectroHub Supply',
    notes: 'Electrical wire',
    status: 'Active',
    stockOnHand: 240,
    minimumOrder: 100,
    leadTime: '2 - 3 days',
    paymentTerms: '30 Days',
  },
  {
    id: 6,
    name: 'PVC Pipe 2"',
    sku: 'PLUMB-0001',
    category: 'Plumbing Materials',
    itemType: 'Material',
    unit: '6 m',
    cost: 120,
    markup: 10,
    price: 132,
    vendor: 'PipeLine Depot',
    notes: 'Schedule 40',
    status: 'Active',
    stockOnHand: 90,
    minimumOrder: 20,
    leadTime: '2 - 4 days',
    paymentTerms: '30 Days',
  },
  {
    id: 7,
    name: 'Self Drilling Screw #8',
    sku: 'HDW-0001',
    category: 'Hardware',
    itemType: 'Material',
    unit: '50 pcs',
    cost: 2.5,
    markup: 15,
    price: 2.88,
    vendor: 'BuildWell Supplies',
    notes: 'Metal to metal screw',
    status: 'Active',
    stockOnHand: 650,
    minimumOrder: 50,
    leadTime: '1 - 2 days',
    paymentTerms: 'COD',
  },
  {
    id: 8,
    name: 'Sand (Washed)',
    sku: 'MAT-0005',
    category: 'Construction Materials',
    itemType: 'Material',
    unit: '1 m3',
    cost: 1200,
    markup: 10,
    price: 1320,
    vendor: 'QuarryPro Aggregates',
    notes: 'Construction sand',
    status: 'Out of Stock',
    stockOnHand: 0,
    minimumOrder: 1,
    leadTime: '1 - 3 days',
    paymentTerms: 'COD',
  },
]

const emptyForm: NewItemForm = {
  name: '',
  sku: '',
  category: '',
  itemType: 'Material',
  unit: '',
  vendor: '',
  cost: '',
  price: '',
  markup: '0',
  status: 'Active',
  notes: '',
  image: '',
}

function loadInitialItems() {
  if (typeof window === 'undefined') return seedItems

  try {
    const stored = window.localStorage.getItem(storageKey)
    if (!stored) return seedItems

    const parsed = JSON.parse(stored)
    if (!Array.isArray(parsed) || !parsed.length) return []

    return parsed.map((item, index) => normalizeStoredItem(item, index))
  } catch {
    return seedItems
  }
}

function normalizeStoredItem(item: Partial<PricebookItem> & Record<string, unknown>, index: number): PricebookItem {
  const cost = numberFrom(item.cost)
  const markup = numberFrom(item.markup)
  const price = numberFrom(item.price) || Number((cost + cost * (markup / 100)).toFixed(2))

  return {
    id: numberFrom(item.id) || index + 1,
    name: textFrom(item.name, 'Untitled item'),
    sku: textFrom(item.sku, `ITEM-${String(index + 1).padStart(4, '0')}`),
    category: textFrom(item.category, 'Uncategorized'),
    itemType: validItemType(item.itemType ?? item.type),
    unit: textFrom(item.unit, 'pcs'),
    cost,
    markup,
    price,
    vendor: textFrom(item.vendor, '-'),
    notes: textFrom(item.notes ?? item.description, ''),
    status: validStatus(item.status),
    stockOnHand: numberFrom(item.stockOnHand),
    minimumOrder: numberFrom(item.minimumOrder),
    leadTime: textFrom(item.leadTime, '-'),
    paymentTerms: textFrom(item.paymentTerms, '-'),
    image: textFrom(item.image, ''),
  }
}

export default function ProcurementPricebookPage() {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [items, setItems] = useState<PricebookItem[]>(loadInitialItems)
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [activeTab, setActiveTab] = useState<ItemStatus | 'All'>('All')
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('All')
  const [statusFilter, setStatusFilter] = useState<ItemStatus | 'All'>('All')
  const [viewMode, setViewMode] = useState<'table' | 'grid' | 'chart'>('table')
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [actionsOpen, setActionsOpen] = useState(false)
  const [form, setForm] = useState<NewItemForm>(emptyForm)
  const [formError, setFormError] = useState('')

  useEffect(() => {
    if (!items.length) return
    window.localStorage.setItem(storageKey, JSON.stringify(items))
  }, [items])

  const categories = useMemo(() => ['All', ...Array.from(new Set(items.map(item => item.category))).sort()], [items])

  const filteredItems = useMemo(() => {
    const query = search.trim().toLowerCase()
    return items.filter(item => {
      const matchesTab = activeTab === 'All' || item.status === activeTab
      const matchesStatus = statusFilter === 'All' || item.status === statusFilter
      const matchesCategory = categoryFilter === 'All' || item.category === categoryFilter
      const matchesQuery =
        !query ||
        item.name.toLowerCase().includes(query) ||
        item.sku.toLowerCase().includes(query) ||
        item.vendor.toLowerCase().includes(query) ||
        item.category.toLowerCase().includes(query)

      return matchesTab && matchesStatus && matchesCategory && matchesQuery
    })
  }, [activeTab, categoryFilter, items, search, statusFilter])

  const selectedItem = items.find(item => item.id === selectedId) ?? filteredItems[0] ?? items[0]

  const summary = useMemo(() => {
    const totalCost = items.reduce((sum, item) => sum + item.cost, 0)
    const totalPrice = items.reduce((sum, item) => sum + item.price, 0)
    const averageMarkup = items.length ? Math.round(items.reduce((sum, item) => sum + item.markup, 0) / items.length) : 0
    return { totalCost, totalPrice, averageMarkup }
  }, [items])

  const tabCount = (tab: ItemStatus | 'All') => tab === 'All' ? items.length : items.filter(item => item.status === tab).length

  const updateForm = (key: keyof NewItemForm, value: string) => {
    setForm(current => {
      const next = { ...current, [key]: value }
      if (key === 'cost' || key === 'price') {
        const cost = Number(key === 'cost' ? value : next.cost)
        const price = Number(key === 'price' ? value : next.price)
        next.markup = cost > 0 && price > 0 ? String(Number((((price - cost) / cost) * 100).toFixed(2))) : '0'
      }
      if (key === 'markup') {
        const cost = Number(next.cost)
        const markup = Number(value)
        next.price = cost > 0 ? String(Number((cost + cost * (markup / 100)).toFixed(2))) : next.price
      }
      return next
    })
  }

  const handleImageUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    if (file.size > 2 * 1024 * 1024) {
      setFormError('Image is too large. Please upload a PNG, JPG, or WebP under 2MB.')
      event.target.value = ''
      return
    }

    const reader = new FileReader()
    reader.onload = () => {
      updateForm('image', typeof reader.result === 'string' ? reader.result : '')
      setFormError('')
    }
    reader.readAsDataURL(file)
    event.target.value = ''
  }

  const openAddDrawer = () => {
    setForm(emptyForm)
    setFormError('')
    setDrawerOpen(true)
    setActionsOpen(false)
  }

  const saveItem = () => {
    setFormError('')
    const required = [form.name, form.sku, form.category, form.unit, form.vendor, form.cost, form.price]
    if (required.some(value => !value.trim())) {
      setFormError('Please complete all required fields before saving.')
      return
    }

    const nextItem: PricebookItem = {
      id: items.reduce((max, item) => Math.max(max, item.id), 0) + 1,
      name: form.name.trim(),
      sku: form.sku.trim(),
      category: form.category.trim(),
      itemType: form.itemType,
      unit: form.unit.trim(),
      cost: Number(form.cost),
      markup: Number(form.markup),
      price: Number(form.price),
      vendor: form.vendor.trim(),
      notes: form.notes.trim(),
      status: form.status,
      stockOnHand: 0,
      minimumOrder: 0,
      leadTime: '-',
      paymentTerms: '-',
      image: form.image,
    }

    const nextItems = [nextItem, ...items]
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(nextItems))
      setItems(nextItems)
      setSelectedId(nextItem.id)
      setDrawerOpen(false)
    } catch {
      const withoutImage = { ...nextItem, image: '' }
      const fallbackItems = [withoutImage, ...items]
      window.localStorage.setItem(storageKey, JSON.stringify(fallbackItems))
      setItems(fallbackItems)
      setSelectedId(withoutImage.id)
      setDrawerOpen(false)
    }
  }

  return (
    <div style={{ fontFamily: font, padding: '28px 28px 40px', color: '#0f172a' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 20, marginBottom: 28, flexWrap: 'wrap' }}>
        <div>
          <div style={breadcrumbStyle}><span>Procurement</span><span>/</span><span>Pricebook</span></div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={titleIconStyle}><Boxes size={18} /></span>
            <h1 style={{ margin: 0, fontSize: 28, lineHeight: 1.1, fontWeight: 900, color: '#07111f' }}>Pricebook</h1>
            <Star size={18} color="#94a3b8" />
          </div>
          <p style={{ margin: '8px 0 0', fontSize: 14, color: '#64748b' }}>Manage your items, pricing, and vendor information in one place.</p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <ToolbarButton icon={<Grid2X2 size={16} />} label="Views" hasChevron />
          <ToolbarButton icon={<Filter size={16} />} label="Filters" badge="2" />
          <ToolbarButton icon={<Boxes size={16} />} label="Group" />
          <button style={smallIconButtonStyle} aria-label="More"><MoreHorizontal size={18} /></button>
          <button style={outlineButtonStyle}>Import CSV</button>
          <div style={{ position: 'relative' }}>
            <button onClick={() => setActionsOpen(value => !value)} style={greenButtonStyle}>
              <Plus size={17} />
              Add Item
              <ChevronDown size={15} />
            </button>
            {actionsOpen && (
              <div style={addMenuStyle}>
                <button style={addMenuItemStyle} onClick={openAddDrawer}><PackagePlus size={15} /> New Item</button>
                <button style={addMenuItemStyle}><ReceiptText size={15} /> Purchase Request</button>
                <button style={addMenuItemStyle}><ReceiptText size={15} /> Purchase Order</button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(160px, 1fr))', gap: 14, marginBottom: 18 }}>
        <MetricCard icon={<PackagePlus size={25} />} label="Total Items" value={items.length.toLocaleString()} detail="Across all categories" tone="#22c55e" />
        <MetricCard icon={<Boxes size={25} />} label="Total Cost" value={formatPeso(summary.totalCost)} detail="Base price total" tone="#8b5cf6" />
        <MetricCard icon={<ReceiptText size={25} />} label="Total Price" value={formatPeso(summary.totalPrice)} detail="Selling price total" tone="#3b82f6" />
        <MetricCard icon={<BarChart3 size={25} />} label="Average Markup" value={`${summary.averageMarkup}%`} detail="Across all items" tone="#f59e0b" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 320px', gap: 16, alignItems: 'start' }}>
        <section style={panelStyle}>
          <div style={{ display: 'flex', borderBottom: '1px solid #e5e7eb', overflowX: 'auto' }}>
            {(['All', 'Active', 'Inactive', 'Low Stock', 'Out of Stock'] as const).map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)} style={tabStyle(activeTab === tab)}>
                {tab} <span style={tabCountStyle}>{tabCount(tab)}</span>
              </button>
            ))}
          </div>

          <div style={{ display: 'flex', gap: 12, padding: 16, borderBottom: '1px solid #eef2f7', flexWrap: 'wrap' }}>
            <label style={searchBoxStyle}>
              <Search size={16} color="#64748b" />
              <input value={search} onChange={event => setSearch(event.target.value)} placeholder="Search by item name, SKU, type, or vendor..." style={inputResetStyle} />
            </label>
            <select value={categoryFilter} onChange={event => setCategoryFilter(event.target.value)} style={selectStyle}>
              {categories.map(category => <option key={category}>{category}</option>)}
            </select>
            <select value={statusFilter} onChange={event => setStatusFilter(event.target.value as ItemStatus | 'All')} style={selectStyle}>
              <option>All</option>
              <option>Active</option>
              <option>Inactive</option>
              <option>Low Stock</option>
              <option>Out of Stock</option>
            </select>
            <ToolbarButton icon={<Filter size={16} />} label="More filters" />
            <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
              <button onClick={() => setViewMode('grid')} style={viewButtonStyle(viewMode === 'grid')}><Grid2X2 size={16} /></button>
              <button onClick={() => setViewMode('table')} style={viewButtonStyle(viewMode === 'table')}><Table2 size={16} /></button>
              <button onClick={() => setViewMode('chart')} style={viewButtonStyle(viewMode === 'chart')}><BarChart3 size={16} /></button>
            </div>
          </div>

          {viewMode === 'grid' ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))', gap: 14, padding: 16 }}>
              {filteredItems.map(item => (
                <button key={item.id} onClick={() => setSelectedId(item.id)} style={gridCardStyle(selectedItem?.id === item.id)}>
                  <ItemThumbnail item={item} large />
                  <strong>{item.name}</strong>
                  <span>{item.sku} - {formatPeso(item.price)}</span>
                  <StatusBadge status={item.status} />
                </button>
              ))}
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', minWidth: 1050, borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#f8fafc' }}>
                    {['Item', 'SKU', 'Category', 'Type', 'Unit', 'Cost', 'Markup', 'Price', 'Vendor', 'Status', ''].map(header => (
                      <th key={header} style={tableHeadStyle}>{header}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredItems.map(item => (
                    <tr key={item.id} onClick={() => setSelectedId(item.id)} style={{ borderTop: '1px solid #eef2f7', background: selectedItem?.id === item.id ? '#ecfdf5' : '#fff', cursor: 'pointer' }}>
                      <td style={tableCellStyle}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <input type="checkbox" onClick={event => event.stopPropagation()} />
                          <ItemThumbnail item={item} />
                          <span>
                            <strong style={{ display: 'block', fontSize: 13 }}>{item.name}</strong>
                            <span style={{ display: 'block', fontSize: 12, color: '#64748b', marginTop: 3 }}>{item.notes}</span>
                          </span>
                        </div>
                      </td>
                      <td style={tableCellStyle}>{item.sku}</td>
                      <td style={tableCellStyle}>{item.category}</td>
                      <td style={tableCellStyle}>{item.itemType}</td>
                      <td style={tableCellStyle}>{item.unit}</td>
                      <td style={tableCellStyle}>{formatPeso(item.cost)}</td>
                      <td style={tableCellStyle}>{item.markup}%</td>
                      <td style={{ ...tableCellStyle, fontWeight: 850 }}>{formatPeso(item.price)}</td>
                      <td style={tableCellStyle}>{item.vendor}</td>
                      <td style={tableCellStyle}><StatusBadge status={item.status} /></td>
                      <td style={tableCellStyle}><button style={ghostIconButtonStyle}><MoreHorizontal size={16} /></button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: 16, borderTop: '1px solid #eef2f7', color: '#64748b', fontSize: 13 }}>
            <span>Showing 1 to {filteredItems.length} of {items.length.toLocaleString()} items</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <button style={pagerButtonStyle}><ChevronLeft size={16} /></button>
              <button style={{ ...pagerButtonStyle, background: '#dcfce7', color: '#16a34a' }}>1</button>
              <button style={pagerButtonStyle}>2</button>
              <button style={pagerButtonStyle}>3</button>
              <span>...</span>
              <button style={pagerButtonStyle}>125</button>
              <button style={pagerButtonStyle}><ChevronRight size={16} /></button>
            </div>
          </div>
        </section>

        {selectedItem && <ItemDetails item={selectedItem} />}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, minmax(130px, 1fr))', gap: 14, marginTop: 16 }}>
        <MiniAction value="12" label="Pending Requests" />
        <MiniAction value="8" label="Draft POs" />
        <MiniAction value="4" label="RFQs Sent" />
        <MiniAction value="2" label="Overdue Deliveries" />
        <MiniAction value="Php 2.45M" label="Total PO Value (This Month)" />
      </div>

      {drawerOpen && (
        <div style={drawerOverlayStyle}>
          <div style={drawerStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 24 }}>
              <div>
                <h2 style={{ margin: 0, fontSize: 20, fontWeight: 900 }}>Add New Item</h2>
                <p style={{ margin: '7px 0 0', color: '#64748b', fontSize: 13 }}>Add a new item to your pricebook.</p>
              </div>
              <button onClick={() => setDrawerOpen(false)} style={ghostIconButtonStyle}><X size={20} /></button>
            </div>

            <button onClick={() => fileInputRef.current?.click()} style={uploadBoxStyle}>
              {form.image ? <img src={form.image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 10 }} /> : <><UploadCloud size={28} /><span>Upload item image</span><small>PNG, JPG or WebP (max. 2MB)</small></>}
            </button>
            <input ref={fileInputRef} type="file" accept="image/png,image/jpeg,image/webp" onChange={handleImageUpload} style={{ display: 'none' }} />

            {formError && <div style={errorStyle}>{formError}</div>}

            <div style={{ display: 'grid', gap: 16 }}>
              <Field label="Item Name *"><input style={fieldStyle} value={form.name} onChange={event => updateForm('name', event.target.value)} placeholder="Enter item name" /></Field>
              <Field label="SKU *"><input style={fieldStyle} value={form.sku} onChange={event => updateForm('sku', event.target.value)} placeholder="Enter SKU" /></Field>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <Field label="Category *"><input style={fieldStyle} value={form.category} onChange={event => updateForm('category', event.target.value)} placeholder="Select category" /></Field>
                <Field label="Type *"><select style={fieldStyle} value={form.itemType} onChange={event => updateForm('itemType', event.target.value)}><option>Material</option><option>Labor</option><option>Equipment</option><option>Service</option><option>Other</option></select></Field>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <Field label="Unit *"><input style={fieldStyle} value={form.unit} onChange={event => updateForm('unit', event.target.value)} placeholder="Select unit" /></Field>
                <Field label="Vendor *"><input style={fieldStyle} value={form.vendor} onChange={event => updateForm('vendor', event.target.value)} placeholder="Select vendor" /></Field>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <Field label="Cost (Base Price) *"><input style={fieldStyle} type="number" value={form.cost} onChange={event => updateForm('cost', event.target.value)} placeholder="0.00" /></Field>
                <Field label="Price (Selling Price) *"><input style={fieldStyle} type="number" value={form.price} onChange={event => updateForm('price', event.target.value)} placeholder="0.00" /></Field>
              </div>
              <Field label="Markup (%)"><input style={fieldStyle} type="number" value={form.markup} onChange={event => updateForm('markup', event.target.value)} /></Field>
              <Field label="Status"><select style={fieldStyle} value={form.status} onChange={event => updateForm('status', event.target.value)}><option>Active</option><option>Inactive</option><option>Low Stock</option><option>Out of Stock</option></select></Field>
              <Field label="Description"><textarea style={{ ...fieldStyle, minHeight: 78, resize: 'vertical' }} value={form.notes} onChange={event => updateForm('notes', event.target.value)} placeholder="Enter item description (optional)" /></Field>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 26 }}>
              <button onClick={() => setDrawerOpen(false)} style={outlineButtonStyle}>Cancel</button>
              <button onClick={saveItem} style={greenButtonStyle}>Save Item</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: 'grid', gap: 7 }}>
      <span style={{ fontSize: 12, fontWeight: 850, color: '#334155' }}>{label}</span>
      {children}
    </label>
  )
}

function MetricCard({ icon, label, value, detail, tone }: { icon: React.ReactNode; label: string; value: string; detail: string; tone: string }) {
  return (
    <div style={metricCardStyle}>
      <span style={{ width: 54, height: 54, borderRadius: 12, background: withAlpha(tone, 0.14), color: tone, display: 'grid', placeItems: 'center', flexShrink: 0 }}>{icon}</span>
      <span>
        <span style={{ display: 'block', fontSize: 12, color: '#64748b', fontWeight: 750 }}>{label}</span>
        <strong style={{ display: 'block', marginTop: 6, fontSize: 20, color: '#0f172a' }}>{value}</strong>
        <span style={{ display: 'block', marginTop: 5, fontSize: 12, color: '#64748b' }}>{detail}</span>
      </span>
    </div>
  )
}

function ToolbarButton({ icon, label, hasChevron, badge }: { icon: React.ReactNode; label: string; hasChevron?: boolean; badge?: string }) {
  return (
    <button style={outlineButtonStyle}>
      {icon}
      {label}
      {badge && <span style={{ display: 'grid', placeItems: 'center', minWidth: 22, height: 22, borderRadius: 99, background: '#4f46e5', color: '#fff', fontSize: 12 }}>{badge}</span>}
      {hasChevron && <ChevronDown size={14} />}
    </button>
  )
}

function ItemThumbnail({ item, large }: { item: PricebookItem; large?: boolean }) {
  const size = large ? 130 : 48
  return (
    <span style={{ width: size, height: large ? 110 : size, borderRadius: large ? 10 : 8, background: item.image ? '#fff' : '#f1f5f9', display: 'grid', placeItems: 'center', overflow: 'hidden', border: '1px solid #e5e7eb', flexShrink: 0 }}>
      {item.image ? <img src={item.image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <ImageIcon size={large ? 32 : 18} color="#ef4444" />}
    </span>
  )
}

function ItemDetails({ item }: { item: PricebookItem }) {
  const fields = [
    ['Category', item.category],
    ['Type', item.itemType],
    ['Unit', item.unit],
    ['Cost (Base Price)', formatPeso(item.cost)],
    ['Markup', `${item.markup}%`],
    ['Price (Selling Price)', formatPeso(item.price)],
    ['Stock On Hand', `${item.stockOnHand} pcs`],
    ['Minimum Order', `${item.minimumOrder} pcs`],
    ['Lead Time', item.leadTime],
    ['Preferred Vendor', item.vendor],
    ['Payment Terms', item.paymentTerms],
  ]

  return (
    <aside style={detailsPanelStyle}>
      <button style={{ position: 'absolute', top: 18, right: 18, border: 0, background: 'transparent', color: '#64748b', cursor: 'pointer' }}><X size={18} /></button>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, paddingRight: 24 }}>
        <ItemThumbnail item={item} large />
        <div>
          <h2 style={{ margin: 0, fontSize: 17, fontWeight: 900 }}>{item.name}</h2>
          <StatusBadge status={item.status} />
          <p style={{ margin: '8px 0 0', fontSize: 13, color: '#64748b', lineHeight: 1.45 }}>{item.sku}<br />{item.notes}</p>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 18, marginTop: 18, borderBottom: '1px solid #e5e7eb' }}>
        {['Details', 'Suppliers', 'Pricing History', 'Activity'].map((tab, index) => (
          <button key={tab} style={{ border: 0, background: 'transparent', padding: '0 0 12px', fontSize: 13, fontWeight: 800, color: index === 0 ? '#16a34a' : '#64748b', borderBottom: index === 0 ? '2px solid #16a34a' : '2px solid transparent' }}>{tab}</button>
        ))}
      </div>
      <div style={{ display: 'grid', gap: 13, marginTop: 16 }}>
        {fields.map(([label, value]) => (
          <div key={label} style={{ display: 'grid', gridTemplateColumns: 'minmax(110px, 1fr) 1fr', gap: 12, fontSize: 13 }}>
            <span style={{ color: '#64748b' }}>{label}</span>
            <strong style={{ color: label.includes('Price') ? '#0f172a' : '#334155' }}>{value}</strong>
          </div>
        ))}
      </div>
      <div style={{ marginTop: 20, paddingTop: 18, borderTop: '1px solid #e5e7eb' }}>
        <strong style={{ display: 'block', fontSize: 13 }}>Price History (Last 6 Months)</strong>
        <div style={{ height: 118, marginTop: 14, borderRadius: 12, background: 'linear-gradient(180deg, #ecfdf5 0%, #fff 100%)', position: 'relative', overflow: 'hidden' }}>
          <svg viewBox="0 0 300 110" width="100%" height="100%" preserveAspectRatio="none">
            <polyline points="0,72 35,44 70,68 105,55 140,70 175,42 210,50 245,60 300,36" fill="none" stroke="#10b981" strokeWidth="3" />
          </svg>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10, fontSize: 13 }}>
          <span style={{ color: '#64748b' }}>Current Price</span>
          <strong>{formatPeso(item.price)}</strong>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 5, fontSize: 13 }}>
          <span style={{ color: '#64748b' }}>Base Price</span>
          <strong>{formatPeso(item.cost)}</strong>
        </div>
      </div>
    </aside>
  )
}

function StatusBadge({ status }: { status: ItemStatus }) {
  const tone = status === 'Active' ? ['#dcfce7', '#16a34a'] : status === 'Low Stock' ? ['#fef3c7', '#d97706'] : status === 'Out of Stock' ? ['#fee2e2', '#dc2626'] : ['#f1f5f9', '#64748b']
  return <span style={{ display: 'inline-flex', alignItems: 'center', padding: '4px 9px', borderRadius: 999, background: tone[0], color: tone[1], fontSize: 11, fontWeight: 900, textTransform: 'uppercase' }}>{status}</span>
}

function MiniAction({ value, label }: { value: string; label: string }) {
  return (
    <div style={{ ...panelStyle, padding: 18, display: 'flex', alignItems: 'center', gap: 12 }}>
      <span style={{ width: 42, height: 42, borderRadius: 10, background: '#dcfce7', color: '#16a34a', display: 'grid', placeItems: 'center' }}><ReceiptText size={20} /></span>
      <span>
        <strong style={{ display: 'block', fontSize: 18 }}>{value}</strong>
        <span style={{ display: 'block', fontSize: 12, color: '#64748b' }}>{label}</span>
      </span>
    </div>
  )
}

const breadcrumbStyle: CSSProperties = { display: 'flex', gap: 8, alignItems: 'center', marginBottom: 10, color: '#64748b', fontSize: 13 }
const titleIconStyle: CSSProperties = { width: 38, height: 38, borderRadius: 10, background: '#dcfce7', color: '#16a34a', display: 'grid', placeItems: 'center' }
const panelStyle: CSSProperties = { background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14, boxShadow: '0 14px 30px rgba(15,23,42,0.04)', overflow: 'hidden' }
const metricCardStyle: CSSProperties = { background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14, padding: 18, display: 'flex', alignItems: 'center', gap: 16, boxShadow: '0 14px 30px rgba(15,23,42,0.04)' }
const outlineButtonStyle: CSSProperties = { minHeight: 40, border: '1px solid #e2e8f0', borderRadius: 10, background: '#fff', color: '#0f172a', padding: '0 14px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontSize: 13, fontWeight: 850, cursor: 'pointer', textDecoration: 'none' }
const greenButtonStyle: CSSProperties = { minHeight: 42, border: 0, borderRadius: 10, background: '#16a34a', color: '#fff', padding: '0 18px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontSize: 13, fontWeight: 900, cursor: 'pointer' }
const smallIconButtonStyle: CSSProperties = { width: 40, height: 40, border: '1px solid #e2e8f0', borderRadius: 10, background: '#fff', display: 'grid', placeItems: 'center', cursor: 'pointer', color: '#334155' }
const searchBoxStyle: CSSProperties = { minHeight: 42, flex: '1 1 300px', border: '1px solid #e2e8f0', background: '#f8fafc', borderRadius: 10, display: 'flex', alignItems: 'center', gap: 10, padding: '0 12px' }
const inputResetStyle: CSSProperties = { flex: 1, border: 0, outline: 0, background: 'transparent', color: '#0f172a', fontSize: 13 }
const selectStyle: CSSProperties = { minHeight: 42, minWidth: 132, border: '1px solid #e2e8f0', borderRadius: 10, background: '#fff', color: '#0f172a', padding: '0 12px', fontSize: 13, fontWeight: 750 }
const tableHeadStyle: CSSProperties = { padding: '13px 12px', textAlign: 'left', fontSize: 11, letterSpacing: '0.04em', textTransform: 'uppercase', color: '#64748b', fontWeight: 900 }
const tableCellStyle: CSSProperties = { padding: '13px 12px', fontSize: 13, color: '#334155', verticalAlign: 'middle' }
const ghostIconButtonStyle: CSSProperties = { width: 34, height: 34, border: '1px solid #e2e8f0', borderRadius: 9, background: '#fff', color: '#0f172a', display: 'grid', placeItems: 'center', cursor: 'pointer' }
const pagerButtonStyle: CSSProperties = { minWidth: 34, height: 34, border: '1px solid #e2e8f0', borderRadius: 8, background: '#fff', color: '#334155', display: 'inline-grid', placeItems: 'center', fontSize: 13, fontWeight: 800 }
const detailsPanelStyle: CSSProperties = { ...panelStyle, padding: 18, position: 'sticky', top: 92 }
const addMenuStyle: CSSProperties = { position: 'absolute', right: 0, top: 48, width: 220, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, boxShadow: '0 22px 45px rgba(15,23,42,0.18)', zIndex: 20, overflow: 'hidden' }
const addMenuItemStyle: CSSProperties = { width: '100%', border: 0, background: '#fff', padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 9, color: '#0f172a', fontSize: 13, fontWeight: 750, cursor: 'pointer', textAlign: 'left' }
const drawerOverlayStyle: CSSProperties = { position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.35)', backdropFilter: 'blur(2px)', zIndex: 80, display: 'flex', justifyContent: 'flex-end' }
const drawerStyle: CSSProperties = { width: 'min(460px, 100vw)', height: '100vh', overflowY: 'auto', background: '#fff', padding: 28, boxShadow: '-24px 0 60px rgba(15,23,42,0.24)' }
const uploadBoxStyle: CSSProperties = { width: '100%', height: 132, border: '1px dashed #cbd5e1', borderRadius: 12, background: '#fff', color: '#64748b', display: 'grid', placeItems: 'center', gap: 7, marginBottom: 20, cursor: 'pointer', fontSize: 13, fontWeight: 800 }
const fieldStyle: CSSProperties = { minHeight: 40, width: '100%', border: '1px solid #e2e8f0', borderRadius: 9, background: '#fff', color: '#0f172a', outline: 0, padding: '0 12px', fontSize: 13 }
const errorStyle: CSSProperties = { margin: '0 0 16px', border: '1px solid #fecaca', background: '#fef2f2', color: '#dc2626', borderRadius: 9, padding: '10px 12px', fontSize: 13, fontWeight: 800 }
const tabCountStyle: CSSProperties = { color: '#94a3b8', fontSize: 12, marginLeft: 4 }

function tabStyle(active: boolean): CSSProperties {
  return { border: 0, background: 'transparent', color: active ? '#16a34a' : '#64748b', borderBottom: active ? '2px solid #16a34a' : '2px solid transparent', padding: '17px 20px', fontSize: 13, fontWeight: 900, cursor: 'pointer', whiteSpace: 'nowrap' }
}

function viewButtonStyle(active: boolean): CSSProperties {
  return { width: 38, height: 38, border: '1px solid #e2e8f0', borderRadius: 9, background: active ? '#dcfce7' : '#fff', color: active ? '#16a34a' : '#64748b', display: 'grid', placeItems: 'center', cursor: 'pointer' }
}

function gridCardStyle(active: boolean): CSSProperties {
  return { border: `1px solid ${active ? '#22c55e' : '#e2e8f0'}`, borderRadius: 13, background: active ? '#f0fdf4' : '#fff', padding: 12, display: 'grid', gap: 9, textAlign: 'left', color: '#0f172a', cursor: 'pointer', boxShadow: active ? '0 14px 28px rgba(34,197,94,0.12)' : 'none' }
}

function withAlpha(hex: string, alpha: number) {
  const value = hex.replace('#', '')
  const r = parseInt(value.substring(0, 2), 16)
  const g = parseInt(value.substring(2, 4), 16)
  const b = parseInt(value.substring(4, 6), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

function numberFrom(value: unknown) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

function textFrom(value: unknown, fallback: string) {
  return typeof value === 'string' && value.trim() ? value : fallback
}

function validItemType(value: unknown): ItemType {
  return value === 'Material' || value === 'Labor' || value === 'Equipment' || value === 'Service' || value === 'Other'
    ? value
    : 'Material'
}

function validStatus(value: unknown): ItemStatus {
  return value === 'Active' || value === 'Inactive' || value === 'Low Stock' || value === 'Out of Stock'
    ? value
    : 'Active'
}

function formatPeso(value: number) {
  return `Php ${value.toLocaleString('en-PH', { minimumFractionDigits: value % 1 ? 2 : 0, maximumFractionDigits: 2 })}`
}
