'use client'

import { FormEvent, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  AlertCircle,
  AlertTriangle,
  ArrowDownToLine,
  ArrowLeftRight,
  Boxes,
  CheckCircle2,
  Download,
  Edit3,
  Filter,
  Grid2X2,
  List,
  MapPin,
  MoreHorizontal,
  Package,
  PackageCheck,
  Plus,
  Search,
  SlidersHorizontal,
  Trash2,
  Truck,
  Upload,
  Warehouse,
  XCircle,
} from 'lucide-react'
import { AnalyticsToggleButton, CollapsibleAnalytics, useAnalyticsDisclosure } from '@/components/AnalyticsDisclosure'
import StateFeedback from '@/components/StateFeedback'
import {
  type AdjustmentRecord,
  type InventoryItem,
  type LocationRecord,
  type ReceivingRecord,
  type TransferRecord,
  type WarehouseState,
  loadWarehouseState,
  movementFromAdjustment,
  movementFromReceiving,
  movementFromTransfer,
  newWarehouseId as newId,
  normalizeWarehouseState,
  refreshWarehouseState,
  saveWarehouseState,
} from '@/lib/warehouse/store'

type Variant = 'overview' | 'inventory' | 'stock-movements' | 'receiving-logs' | 'transfers' | 'adjustments' | 'locations' | 'low-stock'
type FormVariant = 'inventory' | 'receiving' | 'transfer' | 'adjustment' | 'location'
type StatusTone = 'ok' | 'warn' | 'danger' | 'blue' | ''

const pageConfig: Record<Variant, { title: string; subtitle: string; primary: string; primaryHref?: string; emptyTitle: string; emptyBody: string }> = {
  overview: {
    title: 'Warehouse Overview',
    subtitle: 'Real-time inventory and multi-warehouse operations at a glance.',
    primary: 'Add Item',
    primaryHref: '/warehouse/inventory/new',
    emptyTitle: 'No warehouse activity yet',
    emptyBody: 'Create inventory items, locations, receiving logs, transfers, or adjustments to activate the warehouse workspace.',
  },
  inventory: {
    title: 'Inventory',
    subtitle: 'Track and manage inventory across all warehouses in real-time.',
    primary: 'Add Item',
    primaryHref: '/warehouse/inventory/new',
    emptyTitle: 'No inventory items found',
    emptyBody: 'Add your first item to start tracking stock across your warehouses.',
  },
  'stock-movements': {
    title: 'Stock Movements',
    subtitle: 'Track all inventory movement transactions across all warehouses.',
    primary: 'Add Adjustment',
    primaryHref: '/warehouse/adjustments/new',
    emptyTitle: 'No stock movements yet',
    emptyBody: 'Receiving, transfers, and adjustments will automatically create movement history.',
  },
  'receiving-logs': {
    title: 'Receiving Logs',
    subtitle: 'View all goods received into the warehouse.',
    primary: 'Add Receiving',
    primaryHref: '/warehouse/receiving-logs/new',
    emptyTitle: 'No receiving logs yet',
    emptyBody: 'Record the first supplier delivery to update inventory and movement history.',
  },
  transfers: {
    title: 'Transfers',
    subtitle: 'View and manage stock transfers between warehouses.',
    primary: 'New Transfer',
    primaryHref: '/warehouse/transfers/new',
    emptyTitle: 'No transfers yet',
    emptyBody: 'Create a transfer when stock moves from one warehouse or site to another.',
  },
  adjustments: {
    title: 'Adjustments',
    subtitle: 'View and manage inventory adjustments.',
    primary: 'New Adjustment',
    primaryHref: '/warehouse/adjustments/new',
    emptyTitle: 'No adjustments yet',
    emptyBody: 'Create an adjustment for stock counts, damaged goods, write-offs, or overages.',
  },
  locations: {
    title: 'Locations',
    subtitle: 'View and manage all warehouse locations.',
    primary: 'New Location',
    primaryHref: '/warehouse/locations/new',
    emptyTitle: 'No locations yet',
    emptyBody: 'Create zones, racks, shelves, or levels to organize warehouse storage.',
  },
  'low-stock': {
    title: 'Low Stock',
    subtitle: 'View items that are running low and need restocking.',
    primary: 'Export',
    emptyTitle: 'No low stock items',
    emptyBody: 'Items appear here automatically when on-hand stock is at or below the minimum level.',
  },
}

const formConfig: Record<FormVariant, { title: string; subtitle: string; primary: string }> = {
  inventory: { title: 'New Inventory Item', subtitle: 'Create an inventory item and initial stock record.', primary: 'Save Item' },
  receiving: { title: 'Add Receiving', subtitle: 'Record goods received into the warehouse.', primary: 'Save Receiving' },
  transfer: { title: 'New Transfer', subtitle: 'Move goods between warehouses.', primary: 'Create Transfer' },
  adjustment: { title: 'New Adjustment', subtitle: 'Create an inventory adjustment to update stock levels.', primary: 'Save Adjustment' },
  location: { title: 'New Location', subtitle: 'Create a storage location for warehouse operations.', primary: 'Save Location' },
}

function useWarehouseState() {
  const [state, setState] = useState<WarehouseState>(() => loadWarehouseState())

  useEffect(() => {
    const reload = () => setState(loadWarehouseState())
    refreshWarehouseState().then(next => setState(next)).catch(() => undefined)
    window.addEventListener('storage', reload)
    window.addEventListener('focus', reload)
    window.addEventListener('wiseflow:warehouse-data-changed', reload)
    return () => {
      window.removeEventListener('storage', reload)
      window.removeEventListener('focus', reload)
      window.removeEventListener('wiseflow:warehouse-data-changed', reload)
    }
  }, [])

  const setAndSave = (updater: (current: WarehouseState) => WarehouseState) => {
    setState(current => {
      const next = updater(current)
      saveWarehouseState(next)
      return next
    })
  }
  return [state, setAndSave] as const
}

function money(value: number) {
  return `PHP ${value.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function dateText(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function itemStatus(item: InventoryItem) {
  const available = Math.max(item.stock - item.reserved, 0)
  if (available <= 0) return 'Out of Stock'
  if (available <= item.minLevel) return 'Low Stock'
  return 'In Stock'
}

function toneForStatus(status: string): StatusTone {
  if (['Completed', 'Active', 'In Stock', 'Received', 'Purchase'].includes(status)) return 'ok'
  if (['Pending', 'Low Stock', 'Low', 'Transfer', 'Adjustment'].includes(status)) return 'warn'
  if (['Critical', 'Inactive', 'Out of Stock', 'Issued'].includes(status)) return 'danger'
  return ''
}

function numberFromForm(data: FormData, key: string) {
  const raw = String(data.get(key) || '').replace(/,/g, '')
  const value = Number(raw)
  return Number.isFinite(value) ? value : 0
}

function textFromForm(data: FormData, key: string) {
  return String(data.get(key) || '').trim()
}

function exportState(state: WarehouseState) {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = 'wiseflow-warehouse-data.json'
  anchor.click()
  URL.revokeObjectURL(url)
}

function applyInventoryChange(
  inventory: InventoryItem[],
  change: {
    name: string
    sku: string
    uom: string
    warehouse: string
    supplier?: string
    quantity: number
    unitCost: number
    createIfMissing?: boolean
  },
) {
  const createIfMissing = change.createIfMissing ?? true
  const index = inventory.findIndex(item => item.sku === change.sku && item.warehouse === change.warehouse)
  if (index >= 0) {
    return inventory.map((item, itemIndex) => itemIndex === index ? {
      ...item,
      name: item.name || change.name,
      uom: item.uom || change.uom,
      supplier: item.supplier || change.supplier || '',
      stock: Math.max(0, item.stock + change.quantity),
      unitCost: weightedUnitCost(item.stock, item.unitCost, change.quantity, change.unitCost),
      updatedAt: new Date().toISOString(),
    } : item)
  }
  if (!createIfMissing || change.quantity <= 0) return inventory
  return [{
    id: newId('sku'),
    name: change.name,
    sku: change.sku,
    category: '',
    uom: change.uom,
    warehouse: change.warehouse,
    location: '',
    supplier: change.supplier || '',
    stock: change.quantity,
    reserved: 0,
    unitCost: change.unitCost,
    minLevel: 0,
    reorderQty: 0,
    createdAt: new Date().toISOString(),
  }, ...inventory]
}

function weightedUnitCost(currentStock: number, currentCost: number, quantityChange: number, incomingCost: number) {
  if (!incomingCost) return currentCost
  if (quantityChange <= 0) return currentCost || incomingCost
  const currentValue = Math.max(currentStock, 0) * currentCost
  const incomingValue = quantityChange * incomingCost
  const nextStock = Math.max(currentStock, 0) + quantityChange
  return nextStock ? (currentValue + incomingValue) / nextStock : incomingCost
}

function movementValue(quantity: number, unitCost: number) {
  return quantity * unitCost
}

function signedAdjustmentQuantity(type: string, quantity: number) {
  const normalized = type.toLowerCase()
  if (normalized.includes('decrease') || normalized.includes('write') || normalized.includes('damage') || normalized.includes('loss')) {
    return -Math.abs(quantity)
  }
  if (normalized.includes('increase') || normalized.includes('found') || normalized.includes('over')) return Math.abs(quantity)
  return quantity
}

export function WarehouseModule({ variant }: { variant: Variant }) {
  const [state, setState] = useWarehouseState()
  const [query, setQuery] = useState('')
  const importRef = useRef<HTMLInputElement>(null)
  const config = pageConfig[variant]
  const stats = useMemo(() => buildStats(state, variant), [state, variant])
  const analytics = useAnalyticsDisclosure(`wiseflow:analytics:warehouse:${variant}`)

  const importData = async (file?: File) => {
    if (!file) return
    const text = await file.text()
    const parsed = JSON.parse(text) as Partial<WarehouseState>
    const next = normalizeWarehouseState(parsed)
    setState(() => next)
  }

  const updateInventoryItem = (item: InventoryItem) => {
    const stock = window.prompt('Stock on hand', String(item.stock))
    if (stock === null) return
    const minLevel = window.prompt('Minimum level', String(item.minLevel))
    if (minLevel === null) return
    const unitCost = window.prompt('Unit cost', String(item.unitCost))
    if (unitCost === null) return
    setState(current => ({
      ...current,
      inventory: current.inventory.map(row => row.id === item.id ? {
        ...row,
        stock: Math.max(0, Number(stock) || 0),
        minLevel: Math.max(0, Number(minLevel) || 0),
        unitCost: Math.max(0, Number(unitCost) || 0),
        updatedAt: new Date().toISOString(),
      } : row),
    }))
  }

  const restockInventoryItem = (item: InventoryItem) => {
    const available = Math.max(item.stock - item.reserved, 0)
    const target = Math.max(item.minLevel + item.reorderQty, item.minLevel)
    const quantity = Math.max(item.reorderQty, target - available, 1)
    const now = new Date().toISOString()
    const receipt: ReceivingRecord = {
      id: newId('rcv'),
      receiptNo: `RCV-${now.replace(/[^0-9]/g, '')}`,
      poNumber: 'LOW-STOCK-RESTOCK',
      supplier: item.supplier,
      warehouse: item.warehouse,
      receiptType: 'Restock',
      itemName: item.name,
      sku: item.sku,
      uom: item.uom,
      quantity,
      unitCost: item.unitCost,
      receivedBy: 'Inventory restock',
      notes: 'Created from low-stock action',
      status: 'Completed',
      createdAt: now,
    }
    setState(current => ({
      ...current,
      inventory: applyInventoryChange(current.inventory, {
        name: item.name,
        sku: item.sku,
        uom: item.uom,
        warehouse: item.warehouse,
        supplier: item.supplier,
        quantity,
        unitCost: item.unitCost,
      }),
      receiving: [receipt, ...current.receiving],
      movements: [movementFromReceiving(receipt), ...current.movements],
    }))
  }

  const deleteInventoryItem = (item: InventoryItem) => {
    if (!window.confirm(`Delete ${item.name}?`)) return
    setState(current => ({ ...current, inventory: current.inventory.filter(row => row.id !== item.id) }))
  }

  const toggleLocationStatus = (location: LocationRecord) => {
    setState(current => ({
      ...current,
      locations: current.locations.map(row => row.id === location.id ? {
        ...row,
        status: row.status === 'Active' ? 'Inactive' : 'Active',
      } : row),
    }))
  }

  const deleteLocation = (location: LocationRecord) => {
    if (!window.confirm(`Delete ${location.code || location.name}?`)) return
    setState(current => ({ ...current, locations: current.locations.filter(row => row.id !== location.id) }))
  }

  return (
    <section className="wh-page">
      <style>{warehouseCss}</style>
      <PageHeader
        title={config.title}
        subtitle={config.subtitle}
        primary={config.primary}
        primaryHref={config.primaryHref}
        onExport={() => exportState(state)}
        onImport={() => importRef.current?.click()}
        analyticsToggle={<AnalyticsToggleButton open={analytics.open} onToggle={analytics.toggle} panelId={analytics.panelId} className="wh-btn" />}
      />
      <input
        ref={importRef}
        type="file"
        accept="application/json"
        hidden
        onChange={event => {
          void importData(event.target.files?.[0])
          event.currentTarget.value = ''
        }}
      />
      <CollapsibleAnalytics open={analytics.open} id={analytics.panelId}>
        <StatGrid stats={stats} />
      </CollapsibleAnalytics>
      {variant === 'overview' ? (
        <Overview state={state} />
      ) : (
        <>
          <Toolbar variant={variant} query={query} onQueryChange={setQuery} />
          <DataView
            state={state}
            variant={variant}
            query={query}
            onInventoryEdit={updateInventoryItem}
            onInventoryRestock={restockInventoryItem}
            onInventoryDelete={deleteInventoryItem}
            onLocationToggle={toggleLocationStatus}
            onLocationDelete={deleteLocation}
          />
        </>
      )}
    </section>
  )
}

export function WarehouseForm({ variant }: { variant: FormVariant }) {
  const [state, setState] = useWarehouseState()
  const router = useRouter()
  const config = formConfig[variant]

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    const now = new Date().toISOString()

    setState(current => {
      if (variant === 'inventory') {
        const item: InventoryItem = {
          id: newId('sku'),
          name: textFromForm(data, 'name'),
          sku: textFromForm(data, 'sku'),
          category: textFromForm(data, 'category'),
          uom: textFromForm(data, 'uom'),
          warehouse: textFromForm(data, 'warehouse'),
          location: textFromForm(data, 'location'),
          supplier: textFromForm(data, 'supplier'),
          stock: numberFromForm(data, 'stock'),
          reserved: numberFromForm(data, 'reserved'),
          unitCost: numberFromForm(data, 'unitCost'),
          minLevel: numberFromForm(data, 'minLevel'),
          reorderQty: numberFromForm(data, 'reorderQty'),
          createdAt: now,
        }
        return { ...current, inventory: [item, ...current.inventory] }
      }

      if (variant === 'location') {
        const location: LocationRecord = {
          id: newId('loc'),
          code: textFromForm(data, 'code'),
          name: textFromForm(data, 'name'),
          warehouse: textFromForm(data, 'warehouse'),
          zone: textFromForm(data, 'zone'),
          type: textFromForm(data, 'type'),
          capacity: numberFromForm(data, 'capacity'),
          utilization: numberFromForm(data, 'utilization'),
          status: textFromForm(data, 'status') === 'Inactive' ? 'Inactive' : 'Active',
          description: textFromForm(data, 'description'),
          createdAt: now,
        }
        return { ...current, locations: [location, ...current.locations] }
      }

      if (variant === 'receiving') {
        const receipt: ReceivingRecord = {
          id: newId('rcv'),
          receiptNo: `RCV-${Date.now()}`,
          poNumber: textFromForm(data, 'poNumber'),
          supplier: textFromForm(data, 'supplier'),
          warehouse: textFromForm(data, 'warehouse'),
          receiptType: textFromForm(data, 'receiptType') || 'Purchase',
          itemName: textFromForm(data, 'itemName'),
          sku: textFromForm(data, 'sku'),
          uom: textFromForm(data, 'uom'),
          quantity: numberFromForm(data, 'quantity'),
          unitCost: numberFromForm(data, 'unitCost'),
          receivedBy: textFromForm(data, 'performedBy'),
          notes: textFromForm(data, 'notes'),
          status: 'Completed',
          createdAt: now,
        }
        const movement = movementFromReceiving(receipt)
        const inventory = applyInventoryChange(current.inventory, {
          name: receipt.itemName,
          sku: receipt.sku,
          uom: receipt.uom,
          warehouse: receipt.warehouse,
          supplier: receipt.supplier,
          quantity: receipt.quantity,
          unitCost: receipt.unitCost,
        })
        return { ...current, inventory, receiving: [receipt, ...current.receiving], movements: [movement, ...current.movements] }
      }

      if (variant === 'transfer') {
        const transfer: TransferRecord = {
          id: newId('trf'),
          transferNo: `TRF-${Date.now()}`,
          fromWarehouse: textFromForm(data, 'fromWarehouse'),
          toWarehouse: textFromForm(data, 'toWarehouse'),
          itemName: textFromForm(data, 'itemName'),
          sku: textFromForm(data, 'sku'),
          uom: textFromForm(data, 'uom'),
          quantity: numberFromForm(data, 'quantity'),
          unitCost: numberFromForm(data, 'unitCost'),
          requestedBy: textFromForm(data, 'performedBy'),
          notes: textFromForm(data, 'notes'),
          status: 'Completed',
          createdAt: now,
        }
        const movement = movementFromTransfer(transfer)
        const afterSource = applyInventoryChange(current.inventory, {
          name: transfer.itemName,
          sku: transfer.sku,
          uom: transfer.uom,
          warehouse: transfer.fromWarehouse,
          quantity: -transfer.quantity,
          unitCost: transfer.unitCost,
          createIfMissing: false,
        })
        const inventory = applyInventoryChange(afterSource, {
          name: transfer.itemName,
          sku: transfer.sku,
          uom: transfer.uom,
          warehouse: transfer.toWarehouse,
          quantity: transfer.quantity,
          unitCost: transfer.unitCost,
        })
        return { ...current, inventory, transfers: [transfer, ...current.transfers], movements: [movement, ...current.movements] }
      }

      const adjustment: AdjustmentRecord = {
        id: newId('adj'),
        adjustmentNo: `ADJ-${Date.now()}`,
        warehouse: textFromForm(data, 'warehouse'),
        adjustmentType: textFromForm(data, 'adjustmentType'),
        reason: textFromForm(data, 'reason'),
        itemName: textFromForm(data, 'itemName'),
        sku: textFromForm(data, 'sku'),
        uom: textFromForm(data, 'uom'),
        quantity: signedAdjustmentQuantity(textFromForm(data, 'adjustmentType'), numberFromForm(data, 'quantity')),
        unitCost: numberFromForm(data, 'unitCost'),
        adjustedBy: textFromForm(data, 'performedBy'),
        notes: textFromForm(data, 'notes'),
        status: 'Completed',
        createdAt: now,
      }
      const movement = movementFromAdjustment(adjustment)
      const inventory = applyInventoryChange(current.inventory, {
        name: adjustment.itemName,
        sku: adjustment.sku,
        uom: adjustment.uom,
        warehouse: adjustment.warehouse,
        quantity: adjustment.quantity,
        unitCost: adjustment.unitCost,
        createIfMissing: adjustment.quantity > 0,
      })
      return { ...current, inventory, adjustments: [adjustment, ...current.adjustments], movements: [movement, ...current.movements] }
    })

    router.push(routeAfterSave[variant])
  }

  return (
    <section className="wh-page">
      <style>{warehouseCss}</style>
      <PageHeader title={config.title} subtitle={config.subtitle} primary={config.primary} secondary />
      <form onSubmit={submit}>
        {variant === 'inventory' && <InventoryForm />}
        {variant === 'location' && <LocationForm />}
        {['receiving', 'transfer', 'adjustment'].includes(variant) && <TransactionForm variant={variant as 'receiving' | 'transfer' | 'adjustment'} state={state} />}
        <div className="wh-form-actions">
          <Link href={routeAfterSave[variant]} className="wh-btn">Cancel</Link>
          <button className="wh-btn wh-primary" type="submit">{config.primary}</button>
        </div>
      </form>
    </section>
  )
}

function PageHeader(props: {
  title: string
  subtitle: string
  primary: string
  primaryHref?: string
  secondary?: boolean
  onExport?: () => void
  onImport?: () => void
  analyticsToggle?: React.ReactNode
}) {
  return (
    <header className="wh-header">
      <div>
        <div className="wh-crumbs">Supply Chain <span>/</span> Warehouse</div>
        <h1>{props.title}</h1>
        <p>{props.subtitle}</p>
      </div>
      <div className="wh-actions">
        {props.analyticsToggle}
        {!props.secondary && <button className="wh-btn" type="button" onClick={props.onImport}><Upload size={15} /> Import</button>}
        {!props.secondary && <button className="wh-btn" type="button" onClick={props.onExport}><Download size={15} /> Export</button>}
        {props.primaryHref ? (
          <Link href={props.primaryHref} className="wh-btn wh-primary"><Plus size={15} /> {props.primary}</Link>
        ) : !props.secondary ? (
          <button className="wh-btn wh-primary" type="button" onClick={props.onExport}><Download size={15} /> {props.primary}</button>
        ) : null}
      </div>
    </header>
  )
}

function Toolbar({ variant, query, onQueryChange }: { variant: Variant; query: string; onQueryChange: (value: string) => void }) {
  const search = variant === 'locations' ? 'Search by location code or name...' : variant === 'low-stock' ? 'Search by item name, SKU, or category...' : 'Search by item name, SKU, reference no...'
  return (
    <div className="wh-toolbar">
      <label className="wh-searchbox">
        <Search size={16} />
        <input value={query} onChange={event => onQueryChange(event.target.value)} placeholder={search} />
      </label>
      <button className="wh-btn" type="button"><Filter size={15} /> Filters</button>
      <span className="wh-view-toggle"><List size={18} /><Grid2X2 size={17} /></span>
    </div>
  )
}

function StatGrid({ stats }: { stats: Array<{ label: string; value: string; note: string; icon: React.ReactNode; tone?: StatusTone }> }) {
  return (
    <div className="wh-stat-grid">
      {stats.map(stat => (
        <article className="wh-stat" key={stat.label}>
          <span className={`wh-stat-icon ${stat.tone || ''}`}>{stat.icon}</span>
          <span>
            <small>{stat.label}</small>
            <strong>{stat.value}</strong>
            <em>{stat.note}</em>
          </span>
        </article>
      ))}
    </div>
  )
}

function Overview({ state }: { state: WarehouseState }) {
  const hasData = state.inventory.length || state.locations.length || state.receiving.length || state.transfers.length || state.adjustments.length
  return (
    <>
      <InventoryHealth state={state} />
      {hasData && (
        <div className="wh-overview-grid">
          <InventoryTable rows={state.inventory.slice(0, 8)} />
          <ActivityPanel state={state} />
        </div>
      )}
      <div className="wh-quick-grid">
        <QuickLink label="Inventory" detail="Create and track SKUs" href="/warehouse/inventory" icon={<Boxes size={22} />} />
        <QuickLink label="Receiving Logs" detail="Record supplier deliveries" href="/warehouse/receiving-logs" icon={<PackageCheck size={22} />} />
        <QuickLink label="Transfers" detail="Move stock between warehouses" href="/warehouse/transfers" icon={<Truck size={22} />} />
        <QuickLink label="Adjustments" detail="Correct counts and damages" href="/warehouse/adjustments" icon={<SlidersHorizontal size={22} />} />
        <QuickLink label="Locations" detail="Organize warehouse storage" href="/warehouse/locations" icon={<MapPin size={22} />} />
      </div>
    </>
  )
}

function InventoryHealth({ state }: { state: WarehouseState }) {
  const items = state.inventory
  const total = items.length
  const counts: Record<'In Stock' | 'Low Stock' | 'Out of Stock', number> = { 'In Stock': 0, 'Low Stock': 0, 'Out of Stock': 0 }
  items.forEach(item => { counts[itemStatus(item)] += 1 })
  const segments = [
    { label: 'In Stock', value: counts['In Stock'], color: '#10b981' },
    { label: 'Low Stock', value: counts['Low Stock'], color: '#f59e0b' },
    { label: 'Out of Stock', value: counts['Out of Stock'], color: '#ef4444' },
  ]
  const totalValue = items.reduce((sum, item) => sum + item.stock * item.unitCost, 0)
  const byWarehouse = new Map<string, number>()
  items.forEach(item => {
    const key = item.warehouse || 'Unassigned'
    byWarehouse.set(key, (byWarehouse.get(key) || 0) + item.stock * item.unitCost)
  })
  const warehouseRows = Array.from(byWarehouse, ([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 6)
  const maxValue = Math.max(...warehouseRows.map(row => row.value), 1)

  const denom = Math.max(total, 1)
  let cursor = 0
  const stops = segments
    .filter(segment => segment.value > 0)
    .map(segment => {
      const start = (cursor / denom) * 100
      cursor += segment.value
      const end = (cursor / denom) * 100
      return `${segment.color} ${start}% ${end}%`
    })
    .join(', ')
  const donutBackground = total ? `conic-gradient(${stops})` : 'conic-gradient(#e5e7eb 0% 100%)'

  return (
    <section className="wh-health">
      <div className="wh-chart-card">
        <header>
          <h3>Stock Status</h3>
          <span className="wh-muted">{total} {total === 1 ? 'SKU' : 'SKUs'}</span>
        </header>
        <div className="wh-donut-wrap">
          <div className="wh-donut" style={{ background: donutBackground }} role="img" aria-label="Stock status breakdown">
            <span><strong>{total}</strong><small>Total SKUs</small></span>
          </div>
          <ul className="wh-donut-legend">
            {segments.map(segment => (
              <li key={segment.label}>
                <i style={{ background: total ? segment.color : '#cbd5e1' }} />
                <span>{segment.label}</span>
                <strong>{segment.value}{total ? ` · ${Math.round((segment.value / total) * 100)}%` : ''}</strong>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <div className="wh-chart-card">
        <header>
          <h3>Inventory Value by Warehouse</h3>
          <span className="wh-muted">{money(totalValue)}</span>
        </header>
        {warehouseRows.length ? (
          <ul className="wh-bar-list">
            {warehouseRows.map(row => (
              <li key={row.name}>
                <span className="wh-bar-label" title={row.name}>{row.name}</span>
                <span className="wh-bar-track"><i style={{ width: `${Math.max((row.value / maxValue) * 100, 2)}%` }} /></span>
                <strong>{money(row.value)}</strong>
              </li>
            ))}
          </ul>
        ) : (
          <div className="wh-chart-empty">
            <p>Add inventory to see value broken down by warehouse.</p>
            <Link href="/warehouse/inventory/new" className="wh-btn wh-primary"><Plus size={15} /> Add Inventory Item</Link>
          </div>
        )}
      </div>
    </section>
  )
}

function DataView({
  state,
  variant,
  query,
  onInventoryEdit,
  onInventoryRestock,
  onInventoryDelete,
  onLocationToggle,
  onLocationDelete,
}: {
  state: WarehouseState
  variant: Variant
  query: string
  onInventoryEdit: (item: InventoryItem) => void
  onInventoryRestock: (item: InventoryItem) => void
  onInventoryDelete: (item: InventoryItem) => void
  onLocationToggle: (location: LocationRecord) => void
  onLocationDelete: (location: LocationRecord) => void
}) {
  const q = query.toLowerCase()
  const filter = (values: string[]) => values.join(' ').toLowerCase().includes(q)
  if (variant === 'inventory') {
    const rows = state.inventory.filter(row => filter([row.name, row.sku, row.category, row.warehouse, row.location, row.supplier]))
    return rows.length ? <><InventoryTable rows={rows} onEdit={onInventoryEdit} onRestock={onInventoryRestock} onDelete={onInventoryDelete} /><Pagination total={rows.length} /></> : <EmptyState title={pageConfig.inventory.emptyTitle} body={pageConfig.inventory.emptyBody} primary="Add Item" href="/warehouse/inventory/new" />
  }
  if (variant === 'stock-movements') {
    const rows = state.movements.filter(row => filter([row.movementType, row.referenceNo, row.itemName, row.sku, row.warehouseFlow, row.by]))
    return rows.length ? <><SimpleTable columns={['Date & Time', 'Movement Type', 'Reference Type', 'Reference No.', 'Item', 'SKU', 'Warehouse From -> To', 'Quantity UOM', 'By', 'Status']} rows={rows.map(row => [dateText(row.date), row.movementType, row.referenceType, row.referenceNo, row.itemName, row.sku, row.warehouseFlow, `${row.quantity.toLocaleString()} ${row.uom}`, row.by, row.status])} /><Pagination total={rows.length} /></> : <EmptyState title={pageConfig['stock-movements'].emptyTitle} body={pageConfig['stock-movements'].emptyBody} primary="Add Adjustment" href="/warehouse/adjustments/new" />
  }
  if (variant === 'receiving-logs') {
    const rows = state.receiving.filter(row => filter([row.receiptNo, row.poNumber, row.supplier, row.itemName, row.sku, row.warehouse, row.receivedBy]))
    return rows.length ? <><SimpleTable columns={['Received Date & Time', 'PO Number', 'Supplier', 'Receipt Type', 'Item', 'Quantity', 'Total Value', 'Received By', 'Status']} rows={rows.map(row => [dateText(row.createdAt), row.poNumber || row.receiptNo, row.supplier, row.receiptType, row.itemName, `${row.quantity.toLocaleString()} ${row.uom}`, money(row.quantity * row.unitCost), row.receivedBy, row.status])} /><Pagination total={rows.length} /></> : <EmptyState title={pageConfig['receiving-logs'].emptyTitle} body={pageConfig['receiving-logs'].emptyBody} primary="Add Receiving" href="/warehouse/receiving-logs/new" />
  }
  if (variant === 'transfers') {
    const rows = state.transfers.filter(row => filter([row.transferNo, row.fromWarehouse, row.toWarehouse, row.itemName, row.sku, row.requestedBy]))
    return rows.length ? <><SimpleTable columns={['Transfer Date & Time', 'Transfer No.', 'From Warehouse', 'To Warehouse', 'Item', 'Quantity', 'Total Value', 'Status', 'Requested By']} rows={rows.map(row => [dateText(row.createdAt), row.transferNo, row.fromWarehouse, row.toWarehouse, row.itemName, `${row.quantity.toLocaleString()} ${row.uom}`, money(row.quantity * row.unitCost), row.status, row.requestedBy])} /><Pagination total={rows.length} /></> : <EmptyState title={pageConfig.transfers.emptyTitle} body={pageConfig.transfers.emptyBody} primary="New Transfer" href="/warehouse/transfers/new" />
  }
  if (variant === 'adjustments') {
    const rows = state.adjustments.filter(row => filter([row.adjustmentNo, row.warehouse, row.adjustmentType, row.reason, row.itemName, row.sku, row.adjustedBy]))
    return rows.length ? <><SimpleTable columns={['Adjustment Date & Time', 'Adjustment No.', 'Warehouse', 'Adjustment Type', 'Reason', 'Item', 'Quantity', 'Total Value', 'Status', 'Adjusted By']} rows={rows.map(row => [dateText(row.createdAt), row.adjustmentNo, row.warehouse, row.adjustmentType, row.reason, row.itemName, `${row.quantity.toLocaleString()} ${row.uom}`, money(row.quantity * row.unitCost), row.status, row.adjustedBy])} /><Pagination total={rows.length} /></> : <EmptyState title={pageConfig.adjustments.emptyTitle} body={pageConfig.adjustments.emptyBody} primary="New Adjustment" href="/warehouse/adjustments/new" />
  }
  if (variant === 'locations') {
    const rows = state.locations.filter(row => filter([row.code, row.name, row.warehouse, row.zone, row.type, row.status]))
    return rows.length ? <><LocationTable rows={rows} onToggle={onLocationToggle} onDelete={onLocationDelete} /><Pagination total={rows.length} /></> : <EmptyState title={pageConfig.locations.emptyTitle} body={pageConfig.locations.emptyBody} primary="New Location" href="/warehouse/locations/new" />
  }
  const rows = state.inventory.filter(row => itemStatus(row) !== 'In Stock').filter(row => filter([row.name, row.sku, row.category, row.warehouse, row.location, row.supplier]))
  return rows.length ? <><LowStockTable rows={rows} onRestock={onInventoryRestock} onEdit={onInventoryEdit} /><Pagination total={rows.length} /></> : <EmptyState title={pageConfig['low-stock'].emptyTitle} body={pageConfig['low-stock'].emptyBody} />
}

function InventoryTable({
  rows,
  onEdit,
  onRestock,
  onDelete,
}: {
  rows: InventoryItem[]
  onEdit?: (item: InventoryItem) => void
  onRestock?: (item: InventoryItem) => void
  onDelete?: (item: InventoryItem) => void
}) {
  return (
    <div className="wh-table-card">
      <div className="wh-table-scroll">
        <table>
          <thead>
            <tr>
              <th>Item</th>
              <th>SKU</th>
              <th>Category</th>
              <th>UOM</th>
              <th>Warehouse</th>
              <th>Location</th>
              <th>Total Stock</th>
              <th>Reserved</th>
              <th>Available</th>
              <th>Status</th>
              <th>Unit Cost</th>
              <th>Value</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(row => {
              const available = Math.max(row.stock - row.reserved, 0)
              const status = itemStatus(row)
              return (
                <tr key={row.id}>
                  <td><ItemName name={row.name} category={row.supplier || row.category} /></td>
                  <td>{row.sku}</td>
                  <td>{row.category}</td>
                  <td>{row.uom}</td>
                  <td>{row.warehouse}</td>
                  <td>{row.location}</td>
                  <td>{row.stock.toLocaleString()}</td>
                  <td>{row.reserved.toLocaleString()}</td>
                  <td>{available.toLocaleString()}</td>
                  <td><Badge tone={toneForStatus(status)}>{status}</Badge></td>
                  <td>{money(row.unitCost)}</td>
                  <td>{money(row.stock * row.unitCost)}</td>
                  <td>
                    <RowActions
                      actions={[
                        onEdit ? { label: 'Edit', icon: <Edit3 size={14} />, onClick: () => onEdit(row) } : null,
                        onRestock ? { label: 'Restock', icon: <PackageCheck size={14} />, onClick: () => onRestock(row) } : null,
                        onDelete ? { label: 'Delete', icon: <Trash2 size={14} />, danger: true, onClick: () => onDelete(row) } : null,
                      ]}
                    />
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function LowStockTable({ rows, onRestock, onEdit }: { rows: InventoryItem[]; onRestock: (item: InventoryItem) => void; onEdit: (item: InventoryItem) => void }) {
  return (
    <div className="wh-table-card">
      <div className="wh-table-scroll">
        <table>
          <thead>
            <tr>
              <th>Item</th>
              <th>SKU</th>
              <th>Warehouse</th>
              <th>Location</th>
              <th>On Hand</th>
              <th>Minimum Level</th>
              <th>Suggested Reorder</th>
              <th>Supplier</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(row => (
              <tr key={row.id}>
                <td><ItemName name={row.name} category={row.category} /></td>
                <td>{row.sku}</td>
                <td>{row.warehouse}</td>
                <td>{row.location}</td>
                <td>{Math.max(row.stock - row.reserved, 0).toLocaleString()} {row.uom}</td>
                <td>{row.minLevel.toLocaleString()} {row.uom}</td>
                <td>{Math.max(row.reorderQty, row.minLevel - Math.max(row.stock - row.reserved, 0), 0).toLocaleString()} {row.uom}</td>
                <td>{row.supplier}</td>
                <td><Badge tone={toneForStatus(itemStatus(row))}>{itemStatus(row)}</Badge></td>
                <td>
                  <RowActions actions={[
                    { label: 'Restock', icon: <PackageCheck size={14} />, onClick: () => onRestock(row) },
                    { label: 'Edit levels', icon: <Edit3 size={14} />, onClick: () => onEdit(row) },
                  ]} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function LocationTable({ rows, onToggle, onDelete }: { rows: LocationRecord[]; onToggle: (location: LocationRecord) => void; onDelete: (location: LocationRecord) => void }) {
  return (
    <div className="wh-table-card">
      <div className="wh-table-scroll">
        <table>
          <thead>
            <tr>
              <th>Location Code</th>
              <th>Location Name</th>
              <th>Warehouse</th>
              <th>Zone</th>
              <th>Type</th>
              <th>Capacity</th>
              <th>Current Utilization</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(row => (
              <tr key={row.id}>
                <td>{row.code}</td>
                <td>{row.name}</td>
                <td>{row.warehouse}</td>
                <td>{row.zone}</td>
                <td>{row.type}</td>
                <td>{row.capacity.toLocaleString()}</td>
                <td>{row.utilization}%</td>
                <td><Badge tone={toneForStatus(row.status)}>{row.status}</Badge></td>
                <td>
                  <RowActions actions={[
                    { label: row.status === 'Active' ? 'Deactivate' : 'Activate', icon: <CheckCircle2 size={14} />, onClick: () => onToggle(row) },
                    { label: 'Delete', icon: <Trash2 size={14} />, danger: true, onClick: () => onDelete(row) },
                  ]} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function RowActions({ actions }: { actions: Array<{ label: string; icon: React.ReactNode; danger?: boolean; onClick: () => void } | null> }) {
  const visibleActions = actions.filter(Boolean) as Array<{ label: string; icon: React.ReactNode; danger?: boolean; onClick: () => void }>
  if (!visibleActions.length) return <MoreHorizontal size={17} />
  return (
    <div className="wh-row-actions">
      {visibleActions.map(action => (
        <button key={action.label} type="button" className={action.danger ? 'danger' : ''} onClick={action.onClick}>
          {action.icon}
          <span>{action.label}</span>
        </button>
      ))}
    </div>
  )
}

function SimpleTable({ columns, rows }: { columns: string[]; rows: string[][] }) {
  return (
    <div className="wh-table-card">
      <div className="wh-table-scroll">
        <table>
          <thead><tr>{columns.map(column => <th key={column}>{column}</th>)}<th>Actions</th></tr></thead>
          <tbody>
            {rows.map((row, rowIndex) => (
              <tr key={`${row[0]}-${rowIndex}`}>
                {row.map((cell, cellIndex) => (
                  <td key={`${cell}-${cellIndex}`}>
                    {cellIndex === row.length - 1 ? <Badge tone={toneForStatus(cell)}>{cell}</Badge> : cell}
                  </td>
                ))}
                <td><MoreHorizontal size={17} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function InventoryForm() {
  return (
    <div className="wh-form-card">
      <h2>Inventory Information</h2>
      <div className="wh-form-grid">
        <Field name="name" label="Item Name" required />
        <Field name="sku" label="SKU" required />
        <Field name="category" label="Category" required />
        <Field name="uom" label="Unit of Measure" required />
        <Field name="warehouse" label="Warehouse" required />
        <Field name="location" label="Location" />
        <Field name="supplier" label="Preferred Supplier" />
        <Field name="stock" label="Initial Stock" type="number" required />
        <Field name="reserved" label="Reserved Quantity" type="number" />
        <Field name="unitCost" label="Unit Cost (PHP)" type="number" step="0.01" required />
        <Field name="minLevel" label="Minimum Level" type="number" />
        <Field name="reorderQty" label="Suggested Reorder Qty" type="number" />
      </div>
    </div>
  )
}

function TransactionForm({ variant, state }: { variant: 'receiving' | 'transfer' | 'adjustment'; state: WarehouseState }) {
  return (
    <>
      <div className="wh-form-card">
        <h2>{variant === 'receiving' ? 'Receiving Information' : variant === 'transfer' ? 'Transfer Information' : 'Adjustment Information'}</h2>
        <div className="wh-form-grid">
          {variant === 'transfer' ? (
            <>
              <Field name="fromWarehouse" label="From Warehouse" required />
              <Field name="toWarehouse" label="To Warehouse" required />
            </>
          ) : (
            <Field name="warehouse" label="Warehouse" required />
          )}
          {variant === 'receiving' && <><Field name="poNumber" label="PO Number" /><Field name="supplier" label="Supplier" required /><Field name="receiptType" label="Receipt Type" placeholder="Purchase" /></>}
          {variant === 'adjustment' && <><Field name="adjustmentType" label="Adjustment Type" placeholder="Increase Stock / Decrease Stock" required /><Field name="reason" label="Reason" required /></>}
          <Field name="performedBy" label={variant === 'transfer' ? 'Requested By' : variant === 'receiving' ? 'Received By' : 'Adjusted By'} required />
        </div>
      </div>
      <div className="wh-form-card">
        <h2>{variant === 'receiving' ? 'Item Received' : variant === 'transfer' ? 'Item to Transfer' : 'Item to Adjust'}</h2>
        {state.inventory.length === 0 && <div className="wh-inline-note">No inventory exists yet. You can still save this record, but creating an inventory item first gives cleaner stock reporting.</div>}
        <div className="wh-form-grid">
          <Field name="itemName" label="Item Name" required />
          <Field name="sku" label="SKU" required />
          <Field name="uom" label="UOM" required />
          <Field name="quantity" label={variant === 'adjustment' ? 'Adjustment Quantity' : 'Quantity'} type="number" required />
          <Field name="unitCost" label="Unit Cost (PHP)" type="number" step="0.01" required />
          <label className="wh-field wide"><span>Notes</span><textarea name="notes" placeholder="Enter reference or notes..." /></label>
        </div>
      </div>
    </>
  )
}

function LocationForm() {
  return (
    <div className="wh-form-card">
      <h2>Location Information</h2>
      <div className="wh-form-grid">
        <Field name="code" label="Location Code" required />
        <Field name="name" label="Location Name" required />
        <Field name="warehouse" label="Warehouse" required />
        <Field name="zone" label="Zone" />
        <Field name="type" label="Type" placeholder="Shelf / Rack / Level" />
        <Field name="capacity" label="Capacity" type="number" />
        <Field name="utilization" label="Current Utilization (%)" type="number" />
        <label className="wh-field">
          <span>Status</span>
          <select name="status" defaultValue="Active"><option>Active</option><option>Inactive</option></select>
        </label>
        <label className="wh-field wide"><span>Description</span><textarea name="description" placeholder="Enter description or additional notes..." /></label>
      </div>
    </div>
  )
}

function Field(props: { name: string; label: string; required?: boolean; type?: string; step?: string; placeholder?: string }) {
  return (
    <label className="wh-field">
      <span>{props.label} {props.required ? <em>*</em> : null}</span>
      <input name={props.name} type={props.type || 'text'} step={props.step} placeholder={props.placeholder || props.label} required={props.required} />
    </label>
  )
}

function EmptyState({ title, body, primary, href }: { title: string; body: string; primary?: string; href?: string }) {
  return (
    <StateFeedback
      className="wh-empty"
      icon={<Package size={34} />}
      title={title}
      message={body}
      actions={primary && href ? <Link href={href} className="wh-btn wh-primary"><Plus size={15} /> {primary}</Link> : null}
    />
  )
}

function ActivityPanel({ state }: { state: WarehouseState }) {
  return (
    <aside className="wh-detail">
      <h3>Warehouse Activity</h3>
      <div className="wh-summary-grid">
        <span><small>Receipts</small><strong>{state.receiving.length}</strong></span>
        <span><small>Transfers</small><strong>{state.transfers.length}</strong></span>
        <span><small>Adjustments</small><strong>{state.adjustments.length}</strong></span>
        <span><small>Movements</small><strong>{state.movements.length}</strong></span>
      </div>
      <h3>Recent Movements</h3>
      {state.movements.slice(0, 5).length ? state.movements.slice(0, 5).map(item => (
        <p className="wh-breakdown" key={item.id}>{item.referenceNo} - {item.itemName} - {item.quantity.toLocaleString()} {item.uom}</p>
      )) : <p className="wh-muted">No movements recorded.</p>}
    </aside>
  )
}

function QuickLink({ label, detail, href, icon }: { label: string; detail: string; href: string; icon: React.ReactNode }) {
  return (
    <Link href={href} className="wh-quick">
      <span>{icon}</span>
      <strong>{label}</strong>
      <small>{detail}</small>
    </Link>
  )
}

function ItemName({ name, category }: { name: string; category: string }) {
  return <span className="wh-item-name"><span>{name.slice(0, 1).toUpperCase()}</span><strong>{name}<small>{category}</small></strong></span>
}

function Badge({ children, tone }: { children: React.ReactNode; tone?: StatusTone }) {
  return <span className={`wh-badge ${tone || ''}`}>{children}</span>
}

function Pagination({ total }: { total: number }) {
  return <div className="wh-pagination"><span>Showing {total ? 1 : 0} to {total} of {total} entries</span><span><button className="active">1</button></span><span>Items per page <button>10</button></span></div>
}

function buildStats(state: WarehouseState, variant: Variant) {
  const inventoryValue = state.inventory.reduce((sum, item) => sum + movementValue(item.stock, item.unitCost), 0)
  const totalStock = state.inventory.reduce((sum, item) => sum + item.stock, 0)
  const lowStock = state.inventory.filter(item => itemStatus(item) === 'Low Stock').length
  const outOfStock = state.inventory.filter(item => itemStatus(item) === 'Out of Stock').length
  const all = {
    overview: [
      { label: 'Total Warehouses', value: String(new Set([...state.inventory.map(item => item.warehouse), ...state.locations.map(item => item.warehouse)].filter(Boolean)).size), note: 'Created workspaces', icon: <Warehouse size={22} /> },
      { label: 'Total SKUs', value: String(state.inventory.length), note: 'Inventory records', icon: <Boxes size={22} /> },
      { label: 'Inventory Value', value: money(inventoryValue), note: 'Current stock value', icon: <Package size={22} /> },
      { label: 'Low Stock Items', value: String(lowStock), note: 'Below minimum level', icon: <AlertTriangle size={22} />, tone: 'warn' as StatusTone },
      { label: 'Out of Stock Items', value: String(outOfStock), note: 'Needs attention', icon: <XCircle size={22} />, tone: 'danger' as StatusTone },
      { label: 'Incoming Deliveries', value: String(state.receiving.length), note: 'Receiving logs', icon: <Truck size={22} />, tone: 'blue' as StatusTone },
    ],
    inventory: [
      { label: 'Total SKUs', value: String(state.inventory.length), note: 'Inventory records', icon: <Boxes size={22} /> },
      { label: 'Inventory Value', value: money(inventoryValue), note: 'Current stock value', icon: <Package size={22} /> },
      { label: 'Low Stock Items', value: String(lowStock), note: 'View items', icon: <AlertTriangle size={22} />, tone: 'warn' as StatusTone },
      { label: 'Out of Stock Items', value: String(outOfStock), note: 'View items', icon: <XCircle size={22} />, tone: 'danger' as StatusTone },
      { label: 'Total Stock', value: totalStock.toLocaleString(), note: 'All warehouses', icon: <Truck size={22} />, tone: 'blue' as StatusTone },
    ],
    'stock-movements': [
      { label: 'Total Movements', value: String(state.movements.length), note: 'All movement history', icon: <ArrowLeftRight size={22} /> },
      { label: 'Received', value: String(state.movements.filter(item => item.movementType === 'Received').length), note: 'Receipt movements', icon: <ArrowDownToLine size={22} />, tone: 'blue' as StatusTone },
      { label: 'Transfers', value: String(state.transfers.length), note: 'Transfer movements', icon: <Truck size={22} /> },
      { label: 'Adjustments', value: String(state.adjustments.length), note: 'Adjustment movements', icon: <SlidersHorizontal size={22} /> },
    ],
    'receiving-logs': [
      { label: 'Total Receipts', value: String(state.receiving.length), note: 'Receiving records', icon: <PackageCheck size={22} /> },
      { label: 'Total Quantity Received', value: state.receiving.reduce((sum, item) => sum + item.quantity, 0).toLocaleString(), note: 'All receipts', icon: <ArrowDownToLine size={22} />, tone: 'blue' as StatusTone },
      { label: 'Total Value', value: money(state.receiving.reduce((sum, item) => sum + movementValue(item.quantity, item.unitCost), 0)), note: 'Received value', icon: <Package size={22} /> },
    ],
    transfers: [
      { label: 'Total Transfers', value: String(state.transfers.length), note: 'Transfer records', icon: <Truck size={22} />, tone: 'blue' as StatusTone },
      { label: 'Total Items Transferred', value: state.transfers.reduce((sum, item) => sum + item.quantity, 0).toLocaleString(), note: 'All transfers', icon: <PackageCheck size={22} /> },
      { label: 'Total Transfer Value', value: money(state.transfers.reduce((sum, item) => sum + movementValue(item.quantity, item.unitCost), 0)), note: 'Transfer value', icon: <ArrowLeftRight size={22} /> },
    ],
    adjustments: [
      { label: 'Total Adjustments', value: String(state.adjustments.length), note: 'Adjustment records', icon: <SlidersHorizontal size={22} />, tone: 'blue' as StatusTone },
      { label: 'Total Quantity Adjusted', value: state.adjustments.reduce((sum, item) => sum + item.quantity, 0).toLocaleString(), note: 'Signed quantity', icon: <PackageCheck size={22} /> },
      { label: 'Total Adjustment Value', value: money(state.adjustments.reduce((sum, item) => sum + movementValue(item.quantity, item.unitCost), 0)), note: 'Signed value', icon: <ArrowLeftRight size={22} /> },
    ],
    locations: [
      { label: 'Total Locations', value: String(state.locations.length), note: 'Storage locations', icon: <MapPin size={22} />, tone: 'blue' as StatusTone },
      { label: 'Active Locations', value: String(state.locations.filter(item => item.status === 'Active').length), note: 'Available locations', icon: <CheckCircle2 size={22} /> },
      { label: 'Inactive Locations', value: String(state.locations.filter(item => item.status === 'Inactive').length), note: 'Paused locations', icon: <AlertCircle size={22} />, tone: 'warn' as StatusTone },
      { label: 'Total Capacity', value: state.locations.reduce((sum, item) => sum + item.capacity, 0).toLocaleString(), note: 'Storage capacity', icon: <Warehouse size={22} /> },
    ],
    'low-stock': [
      { label: 'Low Stock Items', value: String(lowStock), note: 'Items below minimum level', icon: <AlertTriangle size={22} />, tone: 'warn' as StatusTone },
      { label: 'Critical Stock', value: String(outOfStock), note: 'At or near zero stock', icon: <AlertCircle size={22} />, tone: 'danger' as StatusTone },
      { label: 'Out of Stock', value: String(outOfStock), note: 'Require immediate attention', icon: <XCircle size={22} />, tone: 'danger' as StatusTone },
      { label: 'Reorder Recommendations', value: String(lowStock + outOfStock), note: 'Suggested reorder qty.', icon: <PackageCheck size={22} />, tone: 'blue' as StatusTone },
    ],
  }
  return all[variant]
}

const routeAfterSave: Record<FormVariant, string> = {
  inventory: '/warehouse/inventory',
  receiving: '/warehouse/receiving-logs',
  transfer: '/warehouse/transfers',
  adjustment: '/warehouse/adjustments',
  location: '/warehouse/locations',
}

const warehouseCss = `
.wh-page { padding: 24px; color: #0f172a; }
.wh-page * { box-sizing: border-box; }
.wh-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 20px; margin-bottom: 22px; }
.wh-crumbs { color: #000000; font-size: 13px; font-weight: 750; margin-bottom: 12px; }
.wh-crumbs span { margin: 0 8px; color: #000000; }
.wh-header h1 { font-size: 30px; line-height: 1.1; margin: 0; letter-spacing: 0; }
.wh-header p { margin: 8px 0 0; color: #000000; font-size: 14px; }
.wh-actions { display: flex; flex-wrap: wrap; justify-content: flex-end; gap: 10px; }
.wh-btn { min-height: 40px; border: 1px solid #e5e7eb; background: #fff; color: #0f172a; border-radius: 8px; display: inline-flex; align-items: center; justify-content: center; gap: 8px; padding: 0 14px; font-size: 13px; font-weight: 900; text-decoration: none; cursor: pointer; font-family: inherit; }
.wh-primary { background: #10b981; border-color: #10b981; color: #fff; }
.wh-toolbar { background: #fff; border: 1px solid #edf2f7; border-radius: 8px; padding: 18px; display: grid; grid-template-columns: minmax(240px, 1fr) auto auto; gap: 14px; align-items: center; margin-bottom: 18px; }
.wh-searchbox { min-height: 44px; border: 1px solid #e5e7eb; border-radius: 8px; background: #fff; display: flex; align-items: center; gap: 10px; padding: 0 12px; color: #000000; }
.wh-searchbox input { min-width: 0; flex: 1; border: 0; outline: 0; font: inherit; font-size: 13px; }
.wh-view-toggle { justify-self: end; display: inline-flex; gap: 8px; color: #334155; }
.wh-view-toggle svg:first-child { padding: 8px; width: 38px; height: 38px; border-radius: 8px; background: #ecfdf5; color: #10b981; }
.wh-stat-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(190px, 1fr)); gap: 14px; margin-bottom: 18px; }
.wh-stat { min-height: 96px; border: 1px solid #edf2f7; background: #fff; border-radius: 8px; padding: 18px; display: flex; align-items: center; gap: 16px; }
.wh-stat-icon { width: 52px; height: 52px; border-radius: 10px; background: #ecfdf5; color: #10b981; display: grid; place-items: center; flex: 0 0 auto; }
.wh-stat-icon.warn { background: #fff7ed; color: #f59e0b; }
.wh-stat-icon.danger { background: #fef2f2; color: #ef4444; }
.wh-stat-icon.blue { background: #eff6ff; color: #2563eb; }
.wh-stat small { display: block; color: #000000; font-size: 12px; font-weight: 800; margin-bottom: 5px; }
.wh-stat strong { display: block; color: #020617; font-size: 23px; line-height: 1.1; overflow-wrap: anywhere; }
.wh-stat em { display: block; margin-top: 7px; color: #10b981; font-size: 12px; font-style: normal; font-weight: 850; }
.wh-overview-grid { display: grid; grid-template-columns: minmax(0, 1fr) 360px; gap: 18px; align-items: start; }
.wh-table-card, .wh-form-card, .wh-detail { border: 1px solid #edf2f7; background: #fff; border-radius: 8px; overflow: hidden; }
.wh-table-scroll { overflow-x: auto; }
table { width: 100%; border-collapse: collapse; min-width: 980px; }
th { height: 48px; padding: 0 14px; color: #0f172a; font-size: 12px; text-align: left; background: #fbfdff; border-bottom: 1px solid #edf2f7; white-space: nowrap; }
td { padding: 13px 14px; border-bottom: 1px solid #f1f5f9; color: #1e293b; font-size: 13px; vertical-align: middle; white-space: nowrap; }
tr:hover td { background: #f8fffb; }
.wh-item-name { display: inline-grid; grid-template-columns: 36px minmax(130px, 1fr); gap: 10px; align-items: center; }
.wh-item-name > span { width: 34px; height: 34px; border-radius: 8px; background: #f8fafc; color: #10b981; display: grid; place-items: center; font-weight: 950; border: 1px solid #e5e7eb; }
.wh-item-name strong { display: block; color: #0f172a; font-size: 13px; }
.wh-item-name small { display: block; color: #000000; font-size: 12px; margin-top: 2px; }
.wh-badge { display: inline-flex; align-items: center; min-height: 22px; padding: 0 8px; border-radius: 999px; background: #f1f5f9; color: #000000; font-size: 11px; font-weight: 900; }
.wh-badge.ok { background: #dcfce7; color: #047857; }
.wh-badge.warn { background: #fff7ed; color: #b45309; }
.wh-badge.danger { background: #fee2e2; color: #dc2626; }
.wh-badge.blue { background: #eff6ff; color: #2563eb; }
.wh-row-actions { display: inline-flex; gap: 6px; align-items: center; flex-wrap: wrap; }
.wh-row-actions button { min-height: 30px; border: 1px solid #e5e7eb; background: #fff; color: #0f172a; border-radius: 7px; padding: 0 8px; display: inline-flex; align-items: center; gap: 5px; font: inherit; font-size: 11px; font-weight: 900; cursor: pointer; }
.wh-row-actions button.danger { border-color: #fecaca; color: #dc2626; background: #fff7f7; }
.wh-empty { min-height: 300px; border: 1px dashed #d7e3ec; background: linear-gradient(180deg, #ffffff 0%, #f6fdfb 100%); border-radius: 12px; display: grid; place-items: center; align-content: center; gap: 14px; text-align: center; padding: 40px 28px; box-shadow: 0 1px 2px rgba(15, 23, 42, .03); }
.wh-empty > span { width: 88px; height: 88px; border-radius: 999px; background: #ecfdf5; color: #10b981; display: grid; place-items: center; box-shadow: 0 0 0 10px rgba(16, 185, 129, .06); }
.wh-empty h2 { margin: 0; font-size: 22px; font-weight: 800; }
.wh-empty p { max-width: 480px; margin: 0; color: #000000; line-height: 1.55; font-size: 14px; }
.wh-detail { padding: 18px; position: sticky; top: 92px; }
.wh-detail h3, .wh-form-card h2 { margin: 0 0 14px; font-size: 16px; }
.wh-summary-grid { display: grid; grid-template-columns: repeat(2, 1fr); border: 1px solid #edf2f7; border-radius: 8px; overflow: hidden; margin-bottom: 18px; }
.wh-summary-grid span { padding: 13px; border-right: 1px solid #edf2f7; border-bottom: 1px solid #edf2f7; }
.wh-summary-grid small { display: block; color: #000000; font-size: 11px; margin-bottom: 6px; }
.wh-summary-grid strong { font-size: 15px; }
.wh-breakdown { margin: 0; padding: 10px 0; border-bottom: 1px solid #f1f5f9; color: #334155; font-size: 13px; }
.wh-muted { color: #000000; font-size: 13px; margin: 0; }
.wh-quick-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(210px, 1fr)); gap: 14px; margin-top: 18px; }
.wh-quick { min-height: 104px; border: 1px solid #edf2f7; background: #fff; border-radius: 8px; padding: 16px; display: grid; align-content: center; gap: 5px; color: #0f172a; text-decoration: none; }
.wh-quick span { width: 44px; height: 44px; border-radius: 10px; background: #ecfdf5; color: #10b981; display: grid; place-items: center; margin-bottom: 3px; }
.wh-quick strong { font-size: 15px; }
.wh-quick small { color: #000000; font-size: 12px; }
.wh-pagination { display: flex; align-items: center; justify-content: space-between; gap: 14px; color: #000000; font-size: 13px; padding: 16px 4px 0; }
.wh-pagination button { min-width: 34px; height: 34px; border: 1px solid #e5e7eb; background: #fff; border-radius: 8px; color: #0f172a; font-weight: 900; }
.wh-pagination button.active { border-color: #10b981; background: #ecfdf5; color: #059669; }
.wh-form-card { padding: 22px; margin-bottom: 18px; }
.wh-form-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 18px 22px; }
.wh-field { display: grid; gap: 8px; min-width: 0; }
.wh-field.wide { grid-column: 1 / -1; }
.wh-field span { color: #334155; font-size: 13px; font-weight: 850; }
.wh-field em { color: #ef4444; font-style: normal; }
.wh-field input, .wh-field select { min-height: 44px; width: 100%; border: 1px solid #e5e7eb; border-radius: 8px; padding: 0 12px; background: #fff; font: inherit; color: #0f172a; outline: 0; }
textarea { width: 100%; min-height: 96px; resize: vertical; border: 1px solid #e5e7eb; border-radius: 8px; padding: 12px; font: inherit; color: #0f172a; outline: 0; }
.wh-inline-note { border: 1px solid #fde68a; background: #fffbeb; color: #92400e; border-radius: 8px; padding: 12px; font-size: 13px; font-weight: 750; margin-bottom: 16px; }
.wh-form-actions { display: flex; justify-content: flex-end; gap: 10px; padding-bottom: 24px; }
@media (max-width: 1220px) {
  .wh-overview-grid { grid-template-columns: 1fr; }
  .wh-detail { position: static; }
}
@media (max-width: 820px) {
  .wh-page { padding: 16px; }
  .wh-header { display: grid; }
  .wh-actions { justify-content: stretch; }
  .wh-actions > * { flex: 1 1 150px; }
  .wh-toolbar, .wh-form-grid { grid-template-columns: 1fr; }
  .wh-header h1 { font-size: 26px; }
  .wh-pagination { align-items: flex-start; flex-direction: column; }
}

/* ===== UI polish pass ===== */
/* Subtle card elevation instead of flat borders */
.wh-stat, .wh-table-card, .wh-form-card, .wh-detail, .wh-quick, .wh-summary-grid { box-shadow: 0 1px 2px rgba(15, 23, 42, .04); }
.wh-toolbar { box-shadow: 0 1px 2px rgba(15, 23, 42, .03); }
/* Cleaner, scannable data-table headers */
.wh-page th { color: #000000; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: .04em; }
/* Calmer typographic weights (was 850-950 everywhere) */
.wh-header h1 { font-weight: 800; }
.wh-crumbs { font-weight: 600; }
.wh-btn, .wh-badge, .wh-row-actions button, .wh-pagination button { font-weight: 700; }
.wh-item-name > span { font-weight: 800; }
.wh-stat small, .wh-field span { font-weight: 700; }
/* Interactive feedback */
.wh-btn { transition: background .14s ease, border-color .14s ease, box-shadow .14s ease; }
.wh-btn:not(.wh-primary):hover { background: #f8fafc; }
.wh-primary:hover { background: #059669; border-color: #059669; }
.wh-row-actions button { transition: background .14s ease, border-color .14s ease; }
.wh-row-actions button:hover { background: #f8fafc; border-color: #dbe3ec; }
.wh-row-actions button.danger:hover { background: #fef2f2; border-color: #fecaca; }
.wh-quick { transition: box-shadow .16s ease, transform .16s ease, border-color .16s ease; }
.wh-quick:hover { box-shadow: 0 6px 18px rgba(15, 23, 42, .08); border-color: #d1fae5; transform: translateY(-1px); }
.wh-pagination button:not(.active):hover { background: #f8fafc; }
/* Visible keyboard focus */
.wh-page button:focus-visible,
.wh-page a.wh-btn:focus-visible,
.wh-page input:focus-visible,
.wh-page select:focus-visible,
.wh-page textarea:focus-visible { outline: 2px solid #10b981; outline-offset: 2px; }
.wh-field input:focus, .wh-field select:focus, .wh-page textarea:focus { border-color: #10b981; box-shadow: 0 0 0 3px rgba(16, 185, 129, .12); }
/* Inventory Health charts */
.wh-health { display: grid; grid-template-columns: minmax(0, 380px) minmax(0, 1fr); gap: 18px; margin-bottom: 18px; align-items: stretch; }
.wh-chart-card { min-width: 0; border: 1px solid #edf2f7; background: #fff; border-radius: 12px; padding: 18px; box-shadow: 0 1px 2px rgba(15, 23, 42, .04); }
.wh-chart-card header { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 16px; }
.wh-chart-card h3 { margin: 0; font-size: 15px; font-weight: 700; }
.wh-donut-wrap { display: flex; align-items: center; gap: 22px; }
.wh-donut { position: relative; width: 132px; height: 132px; border-radius: 999px; flex: 0 0 auto; display: grid; place-items: center; }
.wh-donut::after { content: ''; position: absolute; inset: 19px; background: #fff; border-radius: 999px; }
.wh-donut > span { position: relative; z-index: 1; display: grid; place-items: center; text-align: center; }
.wh-donut strong { font-size: 26px; line-height: 1; color: #0f172a; }
.wh-donut small { margin-top: 3px; color: #000000; font-size: 11px; font-weight: 700; }
.wh-donut-legend { flex: 1; min-width: 0; list-style: none; margin: 0; padding: 0; display: grid; gap: 11px; }
.wh-donut-legend li { display: grid; grid-template-columns: 12px minmax(0, 1fr) auto; align-items: center; gap: 10px; font-size: 13px; color: #334155; }
.wh-donut-legend i { width: 11px; height: 11px; border-radius: 3px; flex: 0 0 auto; }
.wh-donut-legend strong { color: #0f172a; font-weight: 700; white-space: nowrap; }
.wh-bar-list { list-style: none; margin: 0; padding: 0; display: grid; gap: 15px; }
.wh-bar-list li { display: grid; grid-template-columns: minmax(86px, 130px) minmax(0, 1fr) auto; align-items: center; gap: 14px; font-size: 13px; }
.wh-bar-label { color: #334155; font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.wh-bar-track { height: 10px; border-radius: 999px; background: #f1f5f9; overflow: hidden; }
.wh-bar-track i { display: block; height: 100%; border-radius: 999px; background: linear-gradient(90deg, #34d399, #10b981); }
.wh-bar-list strong { color: #0f172a; font-weight: 700; white-space: nowrap; }
.wh-chart-empty { min-height: 132px; display: grid; place-items: center; align-content: center; gap: 12px; text-align: center; }
.wh-chart-empty p { margin: 0; color: #000000; font-size: 13px; max-width: 280px; }
@media (max-width: 980px) { .wh-health { grid-template-columns: 1fr; } }
`
