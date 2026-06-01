'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useParams } from 'next/navigation'
import { ChangeEvent, useEffect, useMemo, useState } from 'react'
import { uploadFileObject } from '@/lib/uploads/client'

const font = "var(--font-body)"
const tabs = ['Inventory', 'Purchase Orders', 'Outgoing Transfers'] as const

type Tab = (typeof tabs)[number]
type ItemType = 'Material' | 'Tool' | 'Equipment' | 'Supply'
type PurchaseStatus = 'Ordered' | 'Received' | 'Cancelled'
type TransferStatus = 'Draft' | 'Completed' | 'Cancelled'

interface Warehouse {
  id: number
  name: string
  location: string
  manager: string
  notes: string
  photoUrl?: string
}

interface InventoryItem {
  id: number
  name: string
  sku: string
  itemType: ItemType
  unit: string
  stock: number
  minimumStock: number
  cost: number
  photoUrl?: string
}

interface SupplierSupply {
  id: number
  name: string
  sku: string
  itemType: ItemType
  unit: string
  cost: number
  availableQty: number
}

interface Supplier {
  id: number
  name: string
  contact: string
  phone: string
  email: string
  notes: string
  supplies: SupplierSupply[]
}

interface PurchaseOrder {
  id: number
  supplier: string
  itemName: string
  sku: string
  qty: number
  unitCost: number
  expectedDate: string
  status: PurchaseStatus
  receivedApplied: boolean
}

interface OutgoingTransfer {
  id: number
  itemId: number
  itemName: string
  destination: string
  qty: number
  date: string
  status: TransferStatus
  transferApplied: boolean
}

const fieldStyle = {
  width: '100%',
  padding: '10px 12px',
  border: '1px solid #e5e7eb',
  borderRadius: '8px',
  outline: 'none',
  fontSize: '13px',
  color: '#374151',
  background: '#fff',
}

const fieldGroupStyle = {
  display: 'grid',
  gap: '7px',
}

const labelStyle = {
  fontSize: '12px',
  color: '#374151',
  fontWeight: 600,
}

const helpTextStyle = {
  fontSize: '12px',
  color: '#6b7280',
  lineHeight: 1.45,
}

const buttonStyle = {
  padding: '10px 18px',
  borderRadius: '10px',
  border: 'none',
  fontSize: '13px',
  fontWeight: 600,
  cursor: 'pointer',
}

const loadData = <T,>(key: string, fallback: T): T => {
  if (typeof window === 'undefined') return fallback

  try {
    const stored = window.localStorage.getItem(key)
    return stored ? (JSON.parse(stored) as T) : fallback
  } catch {
    return fallback
  }
}

const money = (value: number) => `PHP ${value.toLocaleString('en-PH')}.00`
const nextId = <T extends { id: number }>(records: T[]) => records.reduce((max, record) => Math.max(max, record.id), 0) + 1

export default function WarehouseDetailPage() {
  const params = useParams<{ id: string }>()
  const warehouseId = Number(params.id)
  const [warehouses] = useState<Warehouse[]>(() => loadData('flowsys-warehouses', []))
  const warehouse = warehouses.find(record => record.id === warehouseId)

  const inventoryKey = `flowsys-inventory-${warehouseId}`
  const purchaseKey = `flowsys-purchase-orders-${warehouseId}`
  const transferKey = `flowsys-outgoing-transfers-${warehouseId}`
  const suppliersKey = 'flowsys-suppliers'

  const [activeTab, setActiveTab] = useState<Tab>('Inventory')
  const [search, setSearch] = useState('')
  const [openMenu, setOpenMenu] = useState<string | null>(null)
  const [form, setForm] = useState<'item' | 'purchase' | 'transfer' | null>(null)
  const [editingItemId, setEditingItemId] = useState<number | null>(null)
  const [items, setItems] = useState<InventoryItem[]>(() => loadData(inventoryKey, []))
  const [purchases, setPurchases] = useState<PurchaseOrder[]>(() => loadData(purchaseKey, []))
  const [transfers, setTransfers] = useState<OutgoingTransfer[]>(() => loadData(transferKey, []))
  const [suppliers, setSuppliers] = useState<Supplier[]>(() => loadData(suppliersKey, []))

  const [itemName, setItemName] = useState('')
  const [sku, setSku] = useState('')
  const [itemType, setItemType] = useState<ItemType>('Material')
  const [unit, setUnit] = useState('pcs')
  const [stock, setStock] = useState(0)
  const [minimumStock, setMinimumStock] = useState(0)
  const [cost, setCost] = useState(0)
  const [itemPhotoUrl, setItemPhotoUrl] = useState('')

  const [supplier, setSupplier] = useState('')
  const [supplierId, setSupplierId] = useState(0)
  const [showInlineSupplier, setShowInlineSupplier] = useState(false)
  const [inlineSupplierName, setInlineSupplierName] = useState('')
  const [purchaseItemId, setPurchaseItemId] = useState(0)
  const [purchaseItemName, setPurchaseItemName] = useState('')
  const [purchaseSku, setPurchaseSku] = useState('')
  const [purchaseQty, setPurchaseQty] = useState(0)
  const [purchaseCost, setPurchaseCost] = useState(0)
  const [expectedDate, setExpectedDate] = useState('2026-05-06')
  const [purchaseStatus, setPurchaseStatus] = useState<PurchaseStatus>('Ordered')

  const [transferItemId, setTransferItemId] = useState(0)
  const [destination, setDestination] = useState('')
  const [transferQty, setTransferQty] = useState(0)
  const [transferDate, setTransferDate] = useState('2026-05-06')
  const [transferStatus, setTransferStatus] = useState<TransferStatus>('Draft')

  useEffect(() => {
    window.localStorage.setItem(inventoryKey, JSON.stringify(items))
  }, [inventoryKey, items])

  useEffect(() => {
    window.localStorage.setItem(purchaseKey, JSON.stringify(purchases))
  }, [purchaseKey, purchases])

  useEffect(() => {
    window.localStorage.setItem(transferKey, JSON.stringify(transfers))
  }, [transferKey, transfers])

  useEffect(() => {
    window.localStorage.setItem(suppliersKey, JSON.stringify(suppliers))
  }, [suppliersKey, suppliers])

  const filteredItems = items.filter(item =>
    item.name.toLowerCase().includes(search.toLowerCase()) ||
    item.sku.toLowerCase().includes(search.toLowerCase()) ||
    item.itemType.toLowerCase().includes(search.toLowerCase())
  )

  const filteredPurchases = purchases.filter(purchase =>
    purchase.itemName.toLowerCase().includes(search.toLowerCase()) ||
    purchase.supplier.toLowerCase().includes(search.toLowerCase()) ||
    purchase.status.toLowerCase().includes(search.toLowerCase())
  )

  const filteredTransfers = transfers.filter(transfer =>
    transfer.itemName.toLowerCase().includes(search.toLowerCase()) ||
    transfer.destination.toLowerCase().includes(search.toLowerCase()) ||
    transfer.status.toLowerCase().includes(search.toLowerCase())
  )

  const selectedTransferItem = useMemo(
    () => items.find(item => item.id === transferItemId),
    [items, transferItemId]
  )
  const selectedSupplier = useMemo(
    () => suppliers.find(record => record.id === supplierId),
    [supplierId, suppliers]
  )
  const supplierSupplies = selectedSupplier?.supplies || []

  const totalValue = items.reduce((sum, item) => sum + item.stock * item.cost, 0)
  const lowStock = items.filter(item => item.stock <= item.minimumStock).length
  const totalStock = items.reduce((sum, item) => sum + item.stock, 0)

  const resetItemForm = () => {
    setItemName('')
    setSku('')
    setItemType('Material')
    setUnit('pcs')
    setStock(0)
    setMinimumStock(0)
    setCost(0)
    setItemPhotoUrl('')
    setEditingItemId(null)
  }

  const resetPurchaseForm = () => {
    setSupplier('')
    setSupplierId(0)
    setShowInlineSupplier(false)
    setInlineSupplierName('')
    setPurchaseItemId(0)
    setPurchaseItemName('')
    setPurchaseSku('')
    setPurchaseQty(0)
    setPurchaseCost(0)
    setExpectedDate('2026-05-06')
    setPurchaseStatus('Ordered')
  }

  const resetTransferForm = () => {
    setTransferItemId(0)
    setDestination('')
    setTransferQty(0)
    setTransferDate('2026-05-06')
    setTransferStatus('Draft')
  }

  const closeForm = () => {
    resetItemForm()
    resetPurchaseForm()
    resetTransferForm()
    setForm(null)
  }

  const openItemForm = (item?: InventoryItem) => {
    if (item) {
      setEditingItemId(item.id)
      setItemName(item.name)
      setSku(item.sku)
      setItemType(item.itemType)
      setUnit(item.unit)
      setStock(item.stock)
      setMinimumStock(item.minimumStock)
      setCost(item.cost)
      setItemPhotoUrl(item.photoUrl || '')
    }
    setForm('item')
    setOpenMenu(null)
  }

  const uploadItemPhoto = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    try {
      const uploaded = await uploadFileObject(file, 'warehouse-photos')
      setItemPhotoUrl(uploaded.url)
    } catch {
      setItemPhotoUrl('')
    }
  }

  const selectSupplier = (value: number) => {
    setSupplierId(value)
    setPurchaseItemId(0)
    setPurchaseItemName('')
    setPurchaseSku('')
    setPurchaseCost(0)

    const selected = suppliers.find(record => record.id === value)
    setSupplier(selected?.name || '')
  }

  const addInlineSupplier = () => {
    const trimmedName = inlineSupplierName.trim()
    if (!trimmedName) return

    const existing = suppliers.find(record => record.name.toLowerCase() === trimmedName.toLowerCase())
    if (existing) {
      selectSupplier(existing.id)
      setShowInlineSupplier(false)
      setInlineSupplierName('')
      return
    }

    const id = nextId(suppliers)
    const newSupplier: Supplier = {
      id,
      name: trimmedName,
      contact: '-',
      phone: '-',
      email: '-',
      notes: '',
      supplies: [],
    }

    setSuppliers(previous => [...previous, newSupplier])
    setSupplierId(id)
    setSupplier(trimmedName)
    setShowInlineSupplier(false)
    setInlineSupplierName('')
  }

  const selectPurchaseItem = (value: number) => {
    setPurchaseItemId(value)

    if (value > 0) {
      const supply = supplierSupplies.find(record => record.id === value)
      if (!supply) return
      setPurchaseItemName(supply.name)
      setPurchaseSku(supply.sku)
      setPurchaseCost(supply.cost)
      return
    }

    setPurchaseItemName('')
    setPurchaseSku('')
    setPurchaseCost(0)
  }

  const applyIncomingStock = (name: string, itemSku: string, qty: number, unitCost: number) => {
    setItems(previous => {
      const foundIndex = previous.findIndex(item => item.sku === itemSku && itemSku.trim())
      if (foundIndex >= 0) {
        return previous.map((item, index) =>
          index === foundIndex
            ? { ...item, stock: item.stock + qty, cost: unitCost || item.cost }
            : item
        )
      }

      return [
        ...previous,
        {
          id: nextId(previous),
          name,
          sku: itemSku || `ITEM-${String(nextId(previous)).padStart(4, '0')}`,
          itemType: 'Material',
          unit: 'pcs',
          stock: qty,
          minimumStock: 0,
          cost: unitCost,
          photoUrl: '',
        },
      ]
    })
  }

  const applyOutgoingStock = (itemId: number, qty: number) => {
    setItems(previous =>
      previous.map(item =>
        item.id === itemId ? { ...item, stock: Math.max(0, item.stock - qty) } : item
      )
    )
  }

  const saveItem = () => {
    const trimmedName = itemName.trim()
    if (!trimmedName) return

    if (editingItemId) {
      setItems(previous =>
        previous.map(item =>
          item.id === editingItemId
            ? {
                ...item,
                name: trimmedName,
                sku: sku.trim() || item.sku,
                itemType,
                unit: unit.trim() || 'pcs',
                stock,
                minimumStock,
                cost,
                photoUrl: itemPhotoUrl,
              }
            : item
        )
      )
    } else {
      setItems(previous => [
        ...previous,
        {
          id: nextId(previous),
          name: trimmedName,
          sku: sku.trim() || `ITEM-${String(nextId(previous)).padStart(4, '0')}`,
          itemType,
          unit: unit.trim() || 'pcs',
          stock,
          minimumStock,
          cost,
          photoUrl: itemPhotoUrl,
        },
      ])
    }

    closeForm()
  }

  const savePurchase = () => {
    const trimmedName = purchaseItemName.trim()
    if (!trimmedName || purchaseQty <= 0) return
    const supplierName = supplier.trim() || selectedSupplier?.name || '-'
    const finalSku = purchaseSku.trim() || `ITEM-${String(nextId(items)).padStart(4, '0')}`

    if (supplierId > 0 && purchaseItemId === -1) {
      setSuppliers(previous =>
        previous.map(record => {
          if (record.id !== supplierId) return record

          return {
            ...record,
            supplies: [
              ...record.supplies,
              {
                id: nextId(record.supplies),
                name: trimmedName,
                sku: finalSku,
                itemType: 'Material',
                unit: 'pcs',
                cost: purchaseCost,
                availableQty: purchaseQty,
              },
            ],
          }
        })
      )
    }

    const receivedApplied = purchaseStatus === 'Received'
    if (receivedApplied) applyIncomingStock(trimmedName, finalSku, purchaseQty, purchaseCost)

    setPurchases(previous => [
      ...previous,
      {
        id: nextId(previous),
        supplier: supplierName,
        itemName: trimmedName,
        sku: finalSku,
        qty: purchaseQty,
        unitCost: purchaseCost,
        expectedDate,
        status: purchaseStatus,
        receivedApplied,
      },
    ])

    closeForm()
  }

  const markPurchaseReceived = (purchase: PurchaseOrder) => {
    if (!purchase.receivedApplied) {
      applyIncomingStock(purchase.itemName, purchase.sku, purchase.qty, purchase.unitCost)
    }

    setPurchases(previous =>
      previous.map(record =>
        record.id === purchase.id
          ? { ...record, status: 'Received', receivedApplied: true }
          : record
      )
    )
    setOpenMenu(null)
  }

  const saveTransfer = () => {
    const item = selectedTransferItem
    if (!item || transferQty <= 0 || !destination.trim()) return
    if (transferStatus === 'Completed' && transferQty > item.stock) return

    const transferApplied = transferStatus === 'Completed'
    if (transferApplied) applyOutgoingStock(item.id, transferQty)

    setTransfers(previous => [
      ...previous,
      {
        id: nextId(previous),
        itemId: item.id,
        itemName: item.name,
        destination: destination.trim(),
        qty: transferQty,
        date: transferDate,
        status: transferStatus,
        transferApplied,
      },
    ])

    closeForm()
  }

  const markTransferCompleted = (transfer: OutgoingTransfer) => {
    const item = items.find(record => record.id === transfer.itemId)
    if (!item || item.stock < transfer.qty) return
    if (!transfer.transferApplied) applyOutgoingStock(transfer.itemId, transfer.qty)

    setTransfers(previous =>
      previous.map(record =>
        record.id === transfer.id
          ? { ...record, status: 'Completed', transferApplied: true }
          : record
      )
    )
    setOpenMenu(null)
  }

  const deleteItem = (id: number) => {
    setItems(previous => previous.filter(item => item.id !== id))
    setOpenMenu(null)
  }

  const deletePurchase = (id: number) => {
    setPurchases(previous => previous.filter(record => record.id !== id))
    setOpenMenu(null)
  }

  const deleteTransfer = (id: number) => {
    setTransfers(previous => previous.filter(record => record.id !== id))
    setOpenMenu(null)
  }

  if (!warehouse) {
    return (
      <div style={{ fontFamily: font }}>
        <Link href="/resources/inventory" style={{ color: '#6c63ff', fontSize: '14px', fontWeight: 600, textDecoration: 'none' }}>
          Back to warehouses
        </Link>
        <div style={{ marginTop: '28px', background: '#fff', border: '1px solid #e5e7eb', borderRadius: '16px', padding: '44px', textAlign: 'center' }}>
          <div style={{ fontSize: '22px', fontWeight: 600, color: '#111827', marginBottom: '8px' }}>Warehouse not found</div>
          <div style={{ fontSize: '14px', color: '#6b7280' }}>Create a warehouse first, then open it from the inventory page.</div>
        </div>
      </div>
    )
  }

  const activeCount = activeTab === 'Inventory' ? items.length : activeTab === 'Purchase Orders' ? purchases.length : transfers.length
  const transferBlocked = transferStatus === 'Completed' && selectedTransferItem ? transferQty > selectedTransferItem.stock : false

  return (
    <div style={{ fontFamily: font }} onClick={() => setOpenMenu(null)}>
      <Link href="/resources/inventory" style={{ textDecoration: 'none' }}>
        <div style={{ display: 'inline-flex', color: '#374151', fontSize: '14px', fontWeight: 600, marginBottom: '20px' }}>
          Back to Warehouses
        </div>
      </Link>

      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '16px', alignItems: 'flex-start', marginBottom: '8px', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: '14px', alignItems: 'center', minWidth: 0 }}>
          <div style={{ width: '58px', height: '58px', borderRadius: '14px', background: '#f3f4f6', border: '1px solid #e5e7eb', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#374151', fontSize: '20px', fontWeight: 600, flex: '0 0 auto' }}>
            {warehouse.photoUrl ? <Image src={warehouse.photoUrl} alt={warehouse.name} width={58} height={58} unoptimized style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : warehouse.name.trim().charAt(0).toUpperCase() || 'W'}
          </div>
          <div>
            <div style={{ fontSize: '24px', fontWeight: 600, color: '#111827', marginBottom: '6px' }}>{warehouse.name}</div>
            <div style={{ fontSize: '13px', color: '#9ca3af', display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              <span style={{ color: '#6c63ff', fontWeight: 600 }}>Resources</span>
              <span>/</span>
              <span style={{ color: '#6c63ff', fontWeight: 600 }}>Inventory</span>
              <span>/</span>
              <span>{activeTab}</span>
            </div>
          </div>
        </div>

        <button
          onClick={() => setForm(activeTab === 'Inventory' ? 'item' : activeTab === 'Purchase Orders' ? 'purchase' : 'transfer')}
          style={{ ...buttonStyle, background: '#111827', color: '#fff' }}
        >
          + {activeTab === 'Inventory' ? 'Inventory item' : activeTab === 'Purchase Orders' ? 'Purchase order' : 'Outgoing transfer'}
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '14px', margin: '24px 0' }}>
        {[
          ['Total Stock', totalStock.toLocaleString(), `${items.length} items`],
          ['Inventory Value', money(totalValue), 'Current stock value'],
          ['Low Stock', lowStock.toLocaleString(), 'Needs attention'],
          ['Warehouse Manager', warehouse.manager, warehouse.location],
        ].map(([label, value, detail]) => (
          <div key={label} style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '18px' }}>
            <div style={{ fontSize: '12px', color: '#6b7280', fontWeight: 600, marginBottom: '8px' }}>{label}</div>
            <div style={{ fontSize: '20px', color: '#111827', fontWeight: 600, wordBreak: 'break-word' }}>{value}</div>
            <div style={{ fontSize: '12px', color: '#9ca3af', fontWeight: 600, marginTop: '5px' }}>{detail}</div>
          </div>
        ))}
      </div>

      <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '16px', overflow: 'hidden' }}>
        <div style={{ display: 'flex', borderBottom: '1px solid #f3f4f6', padding: '0 18px', overflowX: 'auto' }}>
          {tabs.map(tab => (
            <button
              key={tab}
              onClick={() => {
                setActiveTab(tab)
                setSearch('')
                setOpenMenu(null)
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '14px 16px',
                border: 'none',
                borderBottom: activeTab === tab ? '2px solid #111827' : '2px solid transparent',
                background: 'transparent',
                color: activeTab === tab ? '#111827' : '#6b7280',
                fontSize: '13px',
                fontWeight: activeTab === tab ? 800 : 600,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              {tab}
              <span style={{ fontSize: '11px', padding: '1px 7px', borderRadius: '99px', background: activeTab === tab ? '#111827' : '#f3f4f6', color: activeTab === tab ? '#fff' : '#6b7280' }}>
                {tab === 'Inventory' ? items.length : tab === 'Purchase Orders' ? purchases.length : transfers.length}
              </span>
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', gap: '12px', padding: '16px 24px', borderBottom: '1px solid #f3f4f6', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: '220px', display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 14px', border: '1px solid #e5e7eb', borderRadius: '8px', background: '#fafafa' }}>
            <span style={{ color: '#9ca3af' }}>Search</span>
            <input
              value={search}
              onChange={event => setSearch(event.target.value)}
              placeholder={`Search ${activeTab.toLowerCase()}...`}
              style={{ flex: 1, border: 'none', background: 'transparent', outline: 'none', fontSize: '13px', color: '#374151' }}
            />
          </div>
          <button style={{ padding: '8px 14px', border: '1px solid #e5e7eb', borderRadius: '8px', background: '#fafafa', color: '#374151', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>
            Columns
          </button>
        </div>

        {activeTab === 'Inventory' && (
          filteredItems.length === 0 ? (
            <EmptyState text="No inventory items yet - add your first item." />
          ) : (
            <TableWrap>
              <thead>
                <tr style={{ background: '#fafafa' }}>
                  {['Item', 'SKU', 'Stock', 'Minimum', 'Unit', 'Type', 'Value', ''].map(header => <Head key={header}>{header}</Head>)}
                </tr>
              </thead>
              <tbody>
                {filteredItems.map(item => (
                  <tr key={item.id} style={{ borderTop: '1px solid #f3f4f6' }}>
                    <td style={{ padding: '15px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '11px' }}>
                        <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: '#f3f4f6', border: '1px solid #e5e7eb', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6b7280', fontSize: '14px', fontWeight: 600, flex: '0 0 auto' }}>
                          {item.photoUrl ? <Image src={item.photoUrl} alt={item.name} width={42} height={42} unoptimized style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : item.name.trim().charAt(0).toUpperCase() || 'I'}
                        </div>
                        <div style={{ fontSize: '13px', fontWeight: 600, color: '#111827' }}>{item.name}</div>
                      </div>
                    </td>
                    <Cell>{item.sku}</Cell>
                    <Cell strong color={item.stock <= item.minimumStock ? '#ef4444' : '#111827'}>{item.stock.toLocaleString()}</Cell>
                    <Cell>{item.minimumStock.toLocaleString()}</Cell>
                    <Cell>{item.unit}</Cell>
                    <Cell>{item.itemType}</Cell>
                    <Cell strong>{money(item.stock * item.cost)}</Cell>
                    <MenuCell
                      menuKey={`item-${item.id}`}
                      openMenu={openMenu}
                      setOpenMenu={setOpenMenu}
                      actions={[
                        { label: 'Edit', onClick: () => openItemForm(item) },
                        { label: 'Delete', danger: true, onClick: () => deleteItem(item.id) },
                      ]}
                    />
                  </tr>
                ))}
              </tbody>
            </TableWrap>
          )
        )}

        {activeTab === 'Purchase Orders' && (
          filteredPurchases.length === 0 ? (
            <EmptyState text="No purchase orders yet - add incoming stock here." />
          ) : (
            <TableWrap>
              <thead>
                <tr style={{ background: '#fafafa' }}>
                  {['PO No', 'Item', 'Supplier', 'Qty', 'Amount', 'Expected', 'Status', ''].map(header => <Head key={header}>{header}</Head>)}
                </tr>
              </thead>
              <tbody>
                {filteredPurchases.map(purchase => (
                  <tr key={purchase.id} style={{ borderTop: '1px solid #f3f4f6' }}>
                    <Cell strong>PO-{String(purchase.id).padStart(5, '0')}</Cell>
                    <Cell>{purchase.itemName}</Cell>
                    <Cell>{purchase.supplier}</Cell>
                    <Cell>{purchase.qty.toLocaleString()}</Cell>
                    <Cell strong>{money(purchase.qty * purchase.unitCost)}</Cell>
                    <Cell>{purchase.expectedDate}</Cell>
                    <Cell><StatusPill status={purchase.status} /></Cell>
                    <MenuCell
                      menuKey={`purchase-${purchase.id}`}
                      openMenu={openMenu}
                      setOpenMenu={setOpenMenu}
                      actions={[
                        { label: 'Mark Received', onClick: () => markPurchaseReceived(purchase), disabled: purchase.status === 'Received' },
                        { label: 'Delete', danger: true, onClick: () => deletePurchase(purchase.id) },
                      ]}
                    />
                  </tr>
                ))}
              </tbody>
            </TableWrap>
          )
        )}

        {activeTab === 'Outgoing Transfers' && (
          filteredTransfers.length === 0 ? (
            <EmptyState text="No outgoing transfers yet - record released stock here." />
          ) : (
            <TableWrap>
              <thead>
                <tr style={{ background: '#fafafa' }}>
                  {['Transfer No', 'Item', 'Destination', 'Qty', 'Date', 'Status', ''].map(header => <Head key={header}>{header}</Head>)}
                </tr>
              </thead>
              <tbody>
                {filteredTransfers.map(transfer => (
                  <tr key={transfer.id} style={{ borderTop: '1px solid #f3f4f6' }}>
                    <Cell strong>OT-{String(transfer.id).padStart(5, '0')}</Cell>
                    <Cell>{transfer.itemName}</Cell>
                    <Cell>{transfer.destination}</Cell>
                    <Cell>{transfer.qty.toLocaleString()}</Cell>
                    <Cell>{transfer.date}</Cell>
                    <Cell><StatusPill status={transfer.status} /></Cell>
                    <MenuCell
                      menuKey={`transfer-${transfer.id}`}
                      openMenu={openMenu}
                      setOpenMenu={setOpenMenu}
                      actions={[
                        { label: 'Mark Completed', onClick: () => markTransferCompleted(transfer), disabled: transfer.status === 'Completed' },
                        { label: 'Delete', danger: true, onClick: () => deleteTransfer(transfer.id) },
                      ]}
                    />
                  </tr>
                ))}
              </tbody>
            </TableWrap>
          )
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '14px 24px', borderTop: '1px solid #f3f4f6', color: '#374151', fontSize: '13px', fontWeight: 600 }}>
          1-{activeCount} of {activeCount}
        </div>
      </div>

      {form && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.35)', display: 'flex', justifyContent: 'center', alignItems: 'flex-start', padding: '7vh 18px', zIndex: 60 }} onClick={closeForm}>
          <div style={{ width: 'min(720px, 100%)', background: '#fff', borderRadius: '14px', border: '1px solid #e5e7eb', boxShadow: '0 24px 70px rgba(15,23,42,0.22)', padding: '22px' }} onClick={event => event.stopPropagation()}>
            <div style={{ fontSize: '20px', fontWeight: 600, color: '#111827', marginBottom: '18px' }}>
              {form === 'item' ? (editingItemId ? 'Edit Inventory Item' : 'Add Inventory Item') : form === 'purchase' ? 'Add Purchase Order' : 'Add Outgoing Transfer'}
            </div>

            {form === 'item' && (
              <div style={{ display: 'grid', gap: '14px' }}>
                <label style={fieldGroupStyle}>
                  <span style={labelStyle}>Item photo</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
                    <div style={{ width: '78px', height: '78px', borderRadius: '14px', background: '#f3f4f6', border: '1px solid #e5e7eb', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6b7280', fontSize: '22px', fontWeight: 600 }}>
                      {itemPhotoUrl ? <Image src={itemPhotoUrl} alt="Inventory item preview" width={78} height={78} unoptimized style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : itemName.trim().charAt(0).toUpperCase() || 'I'}
                    </div>
                    <div style={{ display: 'grid', gap: '8px' }}>
                      <input type="file" accept="image/*" onChange={uploadItemPhoto} style={{ fontSize: '13px', color: '#374151' }} />
                      {itemPhotoUrl && (
                        <button type="button" onClick={() => setItemPhotoUrl('')} style={{ width: 'fit-content', border: 'none', background: 'transparent', color: '#ef4444', fontSize: '12px', fontWeight: 600, padding: 0, cursor: 'pointer' }}>
                          Remove photo
                        </button>
                      )}
                    </div>
                  </div>
                </label>
                <label style={fieldGroupStyle}>
                  <span style={labelStyle}>Item name</span>
                  <input style={fieldStyle} value={itemName} onChange={event => setItemName(event.target.value)} placeholder="Example: Cement" />
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: '14px' }}>
                  <label style={fieldGroupStyle}>
                    <span style={labelStyle}>SKU / item code</span>
                    <input style={fieldStyle} value={sku} onChange={event => setSku(event.target.value)} placeholder="Example: CEM-001" />
                    <span style={helpTextStyle}>Optional code used for tracking and search.</span>
                  </label>
                  <label style={fieldGroupStyle}>
                    <span style={labelStyle}>Item type</span>
                    <select style={fieldStyle} value={itemType} onChange={event => setItemType(event.target.value as ItemType)}>
                      <option>Material</option>
                      <option>Tool</option>
                      <option>Equipment</option>
                      <option>Supply</option>
                    </select>
                  </label>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '14px' }}>
                  <label style={fieldGroupStyle}>
                    <span style={labelStyle}>Unit</span>
                    <input style={fieldStyle} value={unit} onChange={event => setUnit(event.target.value)} placeholder="pcs, bag, box, meter" />
                  </label>
                  <label style={fieldGroupStyle}>
                    <span style={labelStyle}>Current stock</span>
                    <input style={fieldStyle} type="number" value={stock} onChange={event => setStock(Number(event.target.value))} placeholder="0" />
                  </label>
                  <label style={fieldGroupStyle}>
                    <span style={labelStyle}>Minimum stock</span>
                    <input style={fieldStyle} type="number" value={minimumStock} onChange={event => setMinimumStock(Number(event.target.value))} placeholder="0" />
                    <span style={helpTextStyle}>Low-stock alert level.</span>
                  </label>
                  <label style={fieldGroupStyle}>
                    <span style={labelStyle}>Unit cost</span>
                    <input style={fieldStyle} type="number" value={cost} onChange={event => setCost(Number(event.target.value))} placeholder="0" />
                    <span style={helpTextStyle}>Cost per one unit.</span>
                  </label>
                </div>
              </div>
            )}

            {form === 'purchase' && (
              <div style={{ display: 'grid', gap: '14px' }}>
                <label style={fieldGroupStyle}>
                  <span style={labelStyle}>Supplier</span>
                  <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto', gap: '10px', alignItems: 'start' }}>
                    <select style={fieldStyle} value={supplierId} onChange={event => selectSupplier(Number(event.target.value))}>
                      <option value={0}>{suppliers.length ? 'Select supplier' : 'No suppliers yet'}</option>
                      {suppliers.map(record => (
                        <option key={record.id} value={record.id}>
                          {record.name}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => setShowInlineSupplier(previous => !previous)}
                      aria-label="Add supplier"
                      style={{ width: '40px', height: '40px', border: '1px solid #e5e7eb', borderRadius: '10px', background: '#fff', color: '#111827', fontSize: '20px', fontWeight: 600, cursor: 'pointer' }}
                    >
                      +
                    </button>
                  </div>
                  <span style={helpTextStyle}>Choose a supplier to see only the supplies they provide.</span>
                  {showInlineSupplier && (
                    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto', gap: '10px' }}>
                      <input style={fieldStyle} value={inlineSupplierName} onChange={event => setInlineSupplierName(event.target.value)} placeholder="New supplier name" />
                      <button type="button" onClick={addInlineSupplier} style={{ ...buttonStyle, background: '#111827', color: '#fff' }}>Add</button>
                    </div>
                  )}
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: '14px' }}>
                  <label style={fieldGroupStyle}>
                    <span style={labelStyle}>Item name</span>
                    <select style={fieldStyle} value={purchaseItemId} onChange={event => selectPurchaseItem(Number(event.target.value))} disabled={!selectedSupplier}>
                      <option value={0}>
                        {!selectedSupplier
                          ? 'Select supplier first'
                          : supplierSupplies.length
                            ? 'Select supplier supply'
                            : 'No supplies listed for this supplier'}
                      </option>
                      {supplierSupplies.map(supply => (
                        <option key={supply.id} value={supply.id}>
                          {supply.name} ({supply.availableQty} {supply.unit} available)
                        </option>
                      ))}
                      {selectedSupplier && <option value={-1}>New item not in supplier catalog</option>}
                    </select>
                    <span style={helpTextStyle}>Pick a supplier supply to auto-fill SKU and cost.</span>
                    {purchaseItemId === -1 && (
                      <input style={fieldStyle} value={purchaseItemName} onChange={event => setPurchaseItemName(event.target.value)} placeholder="New item name" />
                    )}
                  </label>
                  <label style={fieldGroupStyle}>
                    <span style={labelStyle}>SKU / item code</span>
                    <input
                      style={{ ...fieldStyle, background: purchaseItemId > 0 ? '#f9fafb' : '#fff' }}
                      value={purchaseSku}
                      onChange={event => setPurchaseSku(event.target.value)}
                      placeholder="Example: CEM-001"
                      readOnly={purchaseItemId > 0}
                    />
                    <span style={helpTextStyle}>{purchaseItemId > 0 ? 'Auto-filled from the selected supplier supply.' : 'Use the same SKU to add stock to an existing inventory item.'}</span>
                  </label>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '14px' }}>
                  <label style={fieldGroupStyle}>
                    <span style={labelStyle}>Quantity ordered</span>
                    <input style={fieldStyle} type="number" value={purchaseQty} onChange={event => setPurchaseQty(Number(event.target.value))} placeholder="0" />
                  </label>
                  <label style={fieldGroupStyle}>
                    <span style={labelStyle}>Unit cost</span>
                    <input style={fieldStyle} type="number" value={purchaseCost} onChange={event => setPurchaseCost(Number(event.target.value))} placeholder="0" />
                    <span style={helpTextStyle}>Cost per one item.</span>
                  </label>
                  <label style={fieldGroupStyle}>
                    <span style={labelStyle}>Expected date</span>
                    <input style={fieldStyle} type="date" value={expectedDate} onChange={event => setExpectedDate(event.target.value)} />
                  </label>
                  <label style={fieldGroupStyle}>
                    <span style={labelStyle}>Order status</span>
                    <select style={fieldStyle} value={purchaseStatus} onChange={event => setPurchaseStatus(event.target.value as PurchaseStatus)}>
                      <option>Ordered</option>
                      <option>Received</option>
                      <option>Cancelled</option>
                    </select>
                    <span style={helpTextStyle}>Received orders add stock to inventory.</span>
                  </label>
                </div>
              </div>
            )}

            {form === 'transfer' && (
              <div style={{ display: 'grid', gap: '14px' }}>
                <label style={fieldGroupStyle}>
                  <span style={labelStyle}>Inventory item</span>
                  <select style={fieldStyle} value={transferItemId} onChange={event => setTransferItemId(Number(event.target.value))}>
                    <option value={0}>Select item</option>
                    {items.map(item => <option key={item.id} value={item.id}>{item.name} ({item.stock} {item.unit})</option>)}
                  </select>
                  <span style={helpTextStyle}>Choose the stock item that will leave this warehouse.</span>
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '14px' }}>
                  <label style={fieldGroupStyle}>
                    <span style={labelStyle}>Destination</span>
                    <input style={fieldStyle} value={destination} onChange={event => setDestination(event.target.value)} placeholder="Project, site, or warehouse" />
                  </label>
                  <label style={fieldGroupStyle}>
                    <span style={labelStyle}>Quantity to transfer</span>
                    <input style={fieldStyle} type="number" value={transferQty} onChange={event => setTransferQty(Number(event.target.value))} placeholder="0" />
                  </label>
                  <label style={fieldGroupStyle}>
                    <span style={labelStyle}>Transfer date</span>
                    <input style={fieldStyle} type="date" value={transferDate} onChange={event => setTransferDate(event.target.value)} />
                  </label>
                </div>
                <label style={fieldGroupStyle}>
                  <span style={labelStyle}>Transfer status</span>
                  <select style={fieldStyle} value={transferStatus} onChange={event => setTransferStatus(event.target.value as TransferStatus)}>
                    <option>Draft</option>
                    <option>Completed</option>
                    <option>Cancelled</option>
                  </select>
                  <span style={helpTextStyle}>Completed transfers deduct stock from inventory.</span>
                </label>
                {transferBlocked && <div style={{ color: '#ef4444', fontSize: '13px', fontWeight: 600 }}>This transfer is more than the available stock.</div>}
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '22px' }}>
              <button onClick={closeForm} style={{ ...buttonStyle, background: '#fff', border: '1px solid #e5e7eb', color: '#374151' }}>Cancel</button>
              <button
                onClick={form === 'item' ? saveItem : form === 'purchase' ? savePurchase : saveTransfer}
                disabled={form === 'transfer' && transferBlocked}
                style={{ ...buttonStyle, background: form === 'transfer' && transferBlocked ? '#d1d5db' : '#111827', color: '#fff', cursor: form === 'transfer' && transferBlocked ? 'not-allowed' : 'pointer' }}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function TableWrap({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '850px' }}>{children}</table>
    </div>
  )
}

function Head({ children }: { children: React.ReactNode }) {
  return (
    <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>{children}</th>
  )
}

function Cell({ children, strong, color }: { children: React.ReactNode; strong?: boolean; color?: string }) {
  return (
    <td style={{ padding: '15px 16px', fontSize: '13px', color: color || '#374151', fontWeight: strong ? 800 : 500 }}>{children}</td>
  )
}

function EmptyState({ text }: { text: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '70px 24px', color: '#9ca3af', fontSize: '14px', fontWeight: 600, textAlign: 'center' }}>
      {text}
    </div>
  )
}

function StatusPill({ status }: { status: string }) {
  const color = status === 'Received' || status === 'Completed'
    ? { bg: '#d1fae5', text: '#059669' }
    : status === 'Cancelled'
      ? { bg: '#fee2e2', text: '#dc2626' }
      : { bg: '#fef3c7', text: '#d97706' }

  return (
    <span style={{ padding: '4px 10px', borderRadius: '99px', background: color.bg, color: color.text, fontSize: '11px', fontWeight: 600 }}>
      {status.toUpperCase()}
    </span>
  )
}

function MenuCell({
  menuKey,
  openMenu,
  setOpenMenu,
  actions,
}: {
  menuKey: string
  openMenu: string | null
  setOpenMenu: (value: string | null) => void
  actions: { label: string; onClick: () => void; danger?: boolean; disabled?: boolean }[]
}) {
  return (
    <td style={{ padding: '12px 16px', position: 'relative', width: '44px' }}>
      <button
        onClick={event => {
          event.stopPropagation()
          setOpenMenu(openMenu === menuKey ? null : menuKey)
        }}
        style={{ width: '32px', height: '32px', border: 'none', borderRadius: '8px', background: openMenu === menuKey ? '#eef2ff' : 'transparent', color: '#2563eb', cursor: 'pointer', fontSize: '18px', fontWeight: 600 }}
      >
        ...
      </button>
      {openMenu === menuKey && (
        <div onClick={event => event.stopPropagation()} style={{ position: 'absolute', right: '16px', top: '46px', width: '160px', background: '#fff', border: '1px solid #e5e7eb', borderRadius: '10px', boxShadow: '0 16px 40px rgba(15,23,42,0.14)', zIndex: 30, overflow: 'hidden' }}>
          {actions.map(action => (
            <button
              key={action.label}
              onClick={action.onClick}
              disabled={action.disabled}
              style={{ display: 'block', width: '100%', padding: '11px 14px', border: 'none', borderBottom: '1px solid #f3f4f6', background: '#fff', color: action.disabled ? '#9ca3af' : action.danger ? '#ef4444' : '#374151', textAlign: 'left', fontSize: '13px', fontWeight: 600, cursor: action.disabled ? 'not-allowed' : 'pointer' }}
            >
              {action.label}
            </button>
          ))}
        </div>
      )}
    </td>
  )
}
