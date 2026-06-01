import { clearLegacyBusinessRows, listBusinessRecords, readLegacyBusinessObject, replaceBusinessCollection } from '@/lib/business/client'
import { companyScopedKey, getActiveCompany } from '@/lib/tenant/company'

export type WarehouseStatus = 'Completed'

export type InventoryItem = {
  id: string
  name: string
  sku: string
  category: string
  uom: string
  warehouse: string
  location: string
  supplier: string
  stock: number
  reserved: number
  unitCost: number
  minLevel: number
  reorderQty: number
  createdAt: string
  updatedAt?: string
  source?: string
  sourceReceiptId?: string
  sourcePoNumber?: string
  companyId?: string
}

export type LocationRecord = {
  id: string
  code: string
  name: string
  warehouse: string
  zone: string
  type: string
  capacity: number
  utilization: number
  status: 'Active' | 'Inactive'
  description: string
  createdAt: string
}

export type ReceivingRecord = {
  id: string
  receiptNo: string
  poNumber: string
  supplier: string
  warehouse: string
  receiptType: string
  itemName: string
  sku: string
  uom: string
  quantity: number
  unitCost: number
  receivedBy: string
  notes: string
  status: WarehouseStatus
  createdAt: string
  source?: string
  sourceReceiptId?: string
  sourcePoId?: string
  companyId?: string
}

export type TransferRecord = {
  id: string
  transferNo: string
  fromWarehouse: string
  toWarehouse: string
  itemName: string
  sku: string
  uom: string
  quantity: number
  unitCost: number
  requestedBy: string
  notes: string
  status: WarehouseStatus
  createdAt: string
}

export type AdjustmentRecord = {
  id: string
  adjustmentNo: string
  warehouse: string
  adjustmentType: string
  reason: string
  itemName: string
  sku: string
  uom: string
  quantity: number
  unitCost: number
  adjustedBy: string
  notes: string
  status: WarehouseStatus
  createdAt: string
}

export type MovementRecord = {
  id: string
  date: string
  movementType: string
  referenceType: string
  referenceNo: string
  itemName: string
  sku: string
  warehouseFlow: string
  quantity: number
  uom: string
  by: string
  status: WarehouseStatus
  source?: string
  sourceReceiptId?: string
}

export type WarehouseState = {
  inventory: InventoryItem[]
  locations: LocationRecord[]
  receiving: ReceivingRecord[]
  transfers: TransferRecord[]
  adjustments: AdjustmentRecord[]
  movements: MovementRecord[]
}

type StoredRow = Record<string, unknown>

type ProcurementReceiptItem = {
  id?: string
  name?: string
  description?: string
  sku?: string
  unit?: string
  uom?: string
  orderedQuantity?: string | number
  receivedQuantity?: string | number
  received?: string | number
  quantity?: string | number
  condition?: string
  notes?: string
}

type ProcurementOrderItem = {
  name?: string
  description?: string
  sku?: string
  unit?: string
  uom?: string
  quantity?: string | number
  unitPrice?: string | number
  price?: string | number
  cost?: string | number
  amount?: string | number
  total?: string | number
}

export type ProcurementReceiptSyncInput = {
  receipt: StoredRow
  order?: StoredRow
  companyId?: string
}

export const warehouseStorageKey = 'wiseflow-warehouse-workspace'
const warehouseCollection = 'warehouse-state'
let warehouseStateCache: WarehouseState | null = null
let warehouseHydratedCompanyId = ''
let warehouseRefreshPromise: Promise<WarehouseState> | null = null

export const emptyWarehouseState: WarehouseState = {
  inventory: [],
  locations: [],
  receiving: [],
  transfers: [],
  adjustments: [],
  movements: [],
}

export function newWarehouseId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

export function loadWarehouseState(): WarehouseState {
  const companyId = getActiveCompany()?.id || ''
  if (warehouseStateCache && warehouseHydratedCompanyId === companyId) return warehouseStateCache
  if (typeof window !== 'undefined') void refreshWarehouseState()
  return emptyWarehouseState
}

export async function refreshWarehouseState(): Promise<WarehouseState> {
  if (warehouseRefreshPromise) return warehouseRefreshPromise

  warehouseRefreshPromise = (async () => {
    const companyId = getActiveCompany()?.id || ''
    const rows = await listBusinessRecords<WarehouseState>(warehouseCollection).catch(() => [])
    let next = rows[0] ? normalizeWarehouseState(rows[0]) : null
    if (!next) {
      const legacy = readLegacyBusinessObject<Partial<WarehouseState>>([warehouseStorageKey])
      if (legacy) next = normalizeWarehouseState(legacy)
    }
    warehouseStateCache = next || emptyWarehouseState
    warehouseHydratedCompanyId = companyId
    await replaceBusinessCollection(warehouseCollection, [{ id: warehouseCollection, ...warehouseStateCache }]).catch(() => [])
    clearLegacyBusinessRows([warehouseStorageKey])
    if (typeof window !== 'undefined') window.dispatchEvent(new Event('wiseflow:warehouse-data-changed'))
    return warehouseStateCache
  })().finally(() => {
    warehouseRefreshPromise = null
  })

  return warehouseRefreshPromise
}

function persistedWarehouseState(next: WarehouseState) {
  return {
    id: warehouseCollection,
    ...normalizeWarehouseState(next),
  }
}

export function saveWarehouseState(next: WarehouseState) {
  const companyId = getActiveCompany()?.id || ''
  warehouseStateCache = normalizeWarehouseState(next)
  warehouseHydratedCompanyId = companyId
  void replaceBusinessCollection(warehouseCollection, [persistedWarehouseState(next)]).catch(() => undefined)
  if (typeof window !== 'undefined') window.dispatchEvent(new Event('wiseflow:warehouse-data-changed'))
}

export function activeWarehouseStorageKey(companyId = getActiveCompany()?.id) {
  return companyScopedKey(warehouseStorageKey, companyId)
}

export function normalizeWarehouseState(parsed: Partial<WarehouseState>): WarehouseState {
  return {
    inventory: Array.isArray(parsed.inventory) ? parsed.inventory : [],
    locations: Array.isArray(parsed.locations) ? parsed.locations : [],
    receiving: Array.isArray(parsed.receiving) ? parsed.receiving : [],
    transfers: Array.isArray(parsed.transfers) ? parsed.transfers : [],
    adjustments: Array.isArray(parsed.adjustments) ? parsed.adjustments : [],
    movements: Array.isArray(parsed.movements) ? parsed.movements : [],
  }
}

export function movementFromReceiving(record: ReceivingRecord): MovementRecord {
  return {
    id: newWarehouseId('mov'),
    date: record.createdAt,
    movementType: 'Received',
    referenceType: 'PO',
    referenceNo: record.poNumber || record.receiptNo,
    itemName: record.itemName,
    sku: record.sku,
    warehouseFlow: `N/A -> ${record.warehouse}`,
    quantity: record.quantity,
    uom: record.uom,
    by: record.receivedBy,
    status: 'Completed',
    source: record.source,
    sourceReceiptId: record.sourceReceiptId,
  }
}

export function movementFromTransfer(record: TransferRecord): MovementRecord {
  return {
    id: newWarehouseId('mov'),
    date: record.createdAt,
    movementType: 'Transfer',
    referenceType: 'TRF',
    referenceNo: record.transferNo,
    itemName: record.itemName,
    sku: record.sku,
    warehouseFlow: `${record.fromWarehouse} -> ${record.toWarehouse}`,
    quantity: record.quantity,
    uom: record.uom,
    by: record.requestedBy,
    status: 'Completed',
  }
}

export function movementFromAdjustment(record: AdjustmentRecord): MovementRecord {
  return {
    id: newWarehouseId('mov'),
    date: record.createdAt,
    movementType: 'Adjustment',
    referenceType: 'ADJ',
    referenceNo: record.adjustmentNo,
    itemName: record.itemName,
    sku: record.sku,
    warehouseFlow: record.warehouse,
    quantity: record.quantity,
    uom: record.uom,
    by: record.adjustedBy,
    status: 'Completed',
  }
}

export function syncProcurementReceiptToWarehouse({ receipt, order, companyId }: ProcurementReceiptSyncInput) {
  if (typeof window === 'undefined') return
  const sourceReceiptId = textFrom(receipt.id) || textFrom(receipt.receiptNumber)
  if (!sourceReceiptId) return

  const state = loadWarehouseState()
  const alreadySynced = state.receiving.some(row => row.source === 'procurement' && row.sourceReceiptId === sourceReceiptId)
  if (alreadySynced) return

  const createdAt = textFrom(receipt.createdAt) || textFrom(receipt.receiptDate) || new Date().toISOString()
  const receiptNo = textFrom(receipt.receiptNumber) || textFrom(receipt.number) || `RCV-${Date.now()}`
  const poNumber = textFrom(receipt.poNumber) || textFrom(order?.poNumber)
  const poId = textFrom(receipt.poId) || textFrom(order?.id)
  const supplier = textFrom(receipt.supplierName) || textFrom(receipt.supplier) || textFrom(order?.supplierName) || textFrom(order?.supplier)
  const warehouse = warehouseFrom(receipt, order)
  const receivedBy = textFrom(receipt.receivedBy) || textFrom(receipt.user) || 'Unassigned'
  const orderItems = readArray(order?.items).filter(isRecord) as ProcurementOrderItem[]

  const receiptRows = (readArray(receipt.items).filter(isRecord) as ProcurementReceiptItem[])
    .map((item, index) => {
      const name = textFrom(item.name) || textFrom(item.description)
      const sku = textFrom(item.sku) || name
      const matchingOrderItem = orderItems.find(orderItem => sameSkuOrName(orderItem, sku, name))
      const quantity = numberFrom(item.receivedQuantity ?? item.received ?? item.quantity)
      const unitCost = unitCostFrom(item, matchingOrderItem)
      if (!name || quantity <= 0) return null
      return {
        id: `wh-rcv-${sourceReceiptId}-${sku || index}`,
        receiptNo,
        poNumber,
        supplier,
        warehouse,
        receiptType: 'Purchase',
        itemName: name,
        sku,
        uom: textFrom(item.unit) || textFrom(item.uom) || textFrom(matchingOrderItem?.unit) || textFrom(matchingOrderItem?.uom),
        quantity,
        unitCost,
        receivedBy,
        notes: [textFrom(item.condition), textFrom(item.notes), textFrom(receipt.referenceNotes)].filter(Boolean).join(' - '),
        status: 'Completed' as const,
        createdAt,
        source: 'procurement',
        sourceReceiptId,
        sourcePoId: poId,
        companyId,
      }
    })
    .filter(Boolean) as ReceivingRecord[]

  if (!receiptRows.length) return

  const nextInventory = [...state.inventory]
  receiptRows.forEach(row => {
    const existingIndex = nextInventory.findIndex(item => item.sku === row.sku && item.warehouse === row.warehouse)
    if (existingIndex >= 0) {
      const existing = nextInventory[existingIndex]
      nextInventory[existingIndex] = {
        ...existing,
        name: existing.name || row.itemName,
        supplier: existing.supplier || row.supplier,
        uom: existing.uom || row.uom,
        stock: existing.stock + row.quantity,
        unitCost: row.unitCost || existing.unitCost,
        updatedAt: createdAt,
        source: existing.source || 'procurement',
        sourceReceiptId,
        sourcePoNumber: poNumber,
      }
      return
    }
    nextInventory.unshift({
      id: newWarehouseId('sku'),
      name: row.itemName,
      sku: row.sku,
      category: '',
      uom: row.uom,
      warehouse: row.warehouse,
      location: '',
      supplier: row.supplier,
      stock: row.quantity,
      reserved: 0,
      unitCost: row.unitCost,
      minLevel: 0,
      reorderQty: 0,
      createdAt,
      source: 'procurement',
      sourceReceiptId,
      sourcePoNumber: poNumber,
      companyId,
    })
  })

  saveWarehouseState({
    ...state,
    inventory: nextInventory,
    receiving: [...receiptRows, ...state.receiving],
    movements: [...receiptRows.map(movementFromReceiving), ...state.movements],
  })
}

function warehouseFrom(receipt: StoredRow, order?: StoredRow) {
  return textFrom(receipt.warehouse)
    || textFrom(order?.warehouse)
    || textFrom(order?.deliverTo)
    || textFrom(order?.deliveryLocation)
    || 'Unassigned Warehouse'
}

function sameSkuOrName(item: ProcurementOrderItem, sku: string, name: string) {
  return (sku && textFrom(item.sku) === sku) || (name && (textFrom(item.name) || textFrom(item.description)) === name)
}

function unitCostFrom(item: ProcurementReceiptItem, orderItem?: ProcurementOrderItem) {
  const direct = numberFrom((item as StoredRow).unitCost ?? (item as StoredRow).unitPrice ?? (item as StoredRow).price ?? (item as StoredRow).cost)
  if (direct) return direct
  const unitPrice = numberFrom(orderItem?.unitPrice ?? orderItem?.price ?? orderItem?.cost)
  if (unitPrice) return unitPrice
  const amount = numberFrom(orderItem?.amount ?? orderItem?.total)
  const quantity = numberFrom(orderItem?.quantity)
  return amount && quantity ? amount / quantity : 0
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

function numberFrom(value: unknown) {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string') {
    const parsed = Number(value.replace(/[^0-9.-]/g, ''))
    return Number.isFinite(parsed) ? parsed : 0
  }
  return 0
}
