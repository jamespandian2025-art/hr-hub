'use client'

import { ChangeEvent, useEffect, useMemo, useRef, useState } from 'react'

const font = "var(--font-body)"
const storageKey = 'flowsys-pricebook-items'
const tabs = ['All', 'Active', 'Inactive'] as const

type Tab = (typeof tabs)[number]
type ItemType = 'Material' | 'Labor' | 'Equipment' | 'Service' | 'Other'
type Status = 'Active' | 'Inactive'

interface PricebookItem {
  id: number
  name: string
  itemType: ItemType
  unit: string
  cost: number
  markup: number
  price: number
  vendor: string
  notes: string
  status: Status
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

const loadItems = () => {
  if (typeof window === 'undefined') return []

  try {
    const stored = window.localStorage.getItem(storageKey)
    return stored ? (JSON.parse(stored) as PricebookItem[]) : []
  } catch {
    return []
  }
}

const money = (value: number) => `PHP ${value.toLocaleString('en-PH')}.00`
const nextId = (records: PricebookItem[]) => records.reduce((max, record) => Math.max(max, record.id), 0) + 1
const calculatedPrice = (cost: number, markup: number) => Math.round(cost + cost * (markup / 100))

export default function PricebookPage() {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [items, setItems] = useState<PricebookItem[]>(loadItems)
  const [activeTab, setActiveTab] = useState<Tab>('All')
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<ItemType | 'All'>('All')
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [openMenu, setOpenMenu] = useState<number | null>(null)
  const [importMessage, setImportMessage] = useState('')

  const [name, setName] = useState('')
  const [itemType, setItemType] = useState<ItemType>('Material')
  const [unit, setUnit] = useState('pcs')
  const [cost, setCost] = useState(0)
  const [markup, setMarkup] = useState(15)
  const [price, setPrice] = useState(0)
  const [vendor, setVendor] = useState('')
  const [notes, setNotes] = useState('')
  const [status, setStatus] = useState<Status>('Active')

  useEffect(() => {
    window.localStorage.setItem(storageKey, JSON.stringify(items))
  }, [items])

  const filtered = items.filter(item => {
    const matchesTab = activeTab === 'All' || item.status === activeTab
    const matchesType = typeFilter === 'All' || item.itemType === typeFilter
    const matchesSearch =
      item.name.toLowerCase().includes(search.toLowerCase()) ||
      item.vendor.toLowerCase().includes(search.toLowerCase()) ||
      item.itemType.toLowerCase().includes(search.toLowerCase())

    return matchesTab && matchesType && matchesSearch
  })

  const summary = useMemo(() => {
    const activeItems = items.filter(item => item.status === 'Active')
    const totalCost = items.reduce((sum, item) => sum + item.cost, 0)
    const totalPrice = items.reduce((sum, item) => sum + item.price, 0)
    const averageMarkup = items.length ? Math.round(items.reduce((sum, item) => sum + item.markup, 0) / items.length) : 0

    return {
      totalItems: items.length,
      activeItems: activeItems.length,
      totalCost,
      totalPrice,
      averageMarkup,
    }
  }, [items])

  const tabCount = (tab: Tab) => (tab === 'All' ? items.length : items.filter(item => item.status === tab).length)

  const resetForm = () => {
    setName('')
    setItemType('Material')
    setUnit('pcs')
    setCost(0)
    setMarkup(15)
    setPrice(0)
    setVendor('')
    setNotes('')
    setStatus('Active')
    setEditingId(null)
  }

  const closeForm = () => {
    resetForm()
    setShowForm(false)
  }

  const startCreate = () => {
    resetForm()
    setShowForm(true)
  }

  const startEdit = (item: PricebookItem) => {
    setEditingId(item.id)
    setName(item.name)
    setItemType(item.itemType)
    setUnit(item.unit)
    setCost(item.cost)
    setMarkup(item.markup)
    setPrice(item.price)
    setVendor(item.vendor)
    setNotes(item.notes)
    setStatus(item.status)
    setShowForm(true)
    setOpenMenu(null)
  }

  const saveItem = () => {
    const trimmedName = name.trim()
    if (!trimmedName) return

    if (editingId) {
      setItems(previous =>
        previous.map(item =>
          item.id === editingId
            ? {
                ...item,
                name: trimmedName,
                itemType,
                unit: unit.trim() || 'pcs',
                cost,
                markup,
                price,
                vendor: vendor.trim() || '-',
                notes,
                status,
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
          itemType,
          unit: unit.trim() || 'pcs',
          cost,
          markup,
          price,
          vendor: vendor.trim() || '-',
          notes,
          status,
        },
      ])
    }

    closeForm()
  }

  const deleteItem = (id: number) => {
    setItems(previous => previous.filter(item => item.id !== id))
    setOpenMenu(null)
  }

  const toggleStatus = (item: PricebookItem) => {
    setItems(previous =>
      previous.map(record =>
        record.id === item.id
          ? { ...record, status: record.status === 'Active' ? 'Inactive' : 'Active' }
          : record
      )
    )
    setOpenMenu(null)
  }

  const updateCost = (value: number) => {
    setCost(value)
    setPrice(calculatedPrice(value, markup))
  }

  const updateMarkup = (value: number) => {
    setMarkup(value)
    setPrice(calculatedPrice(cost, value))
  }

  const parseCsvRows = (content: string) => {
    const lines = content.split(/\r?\n/).map(line => line.trim()).filter(Boolean)
    if (lines.length === 0) return []

    const [, ...rows] = lines
    return rows.map(line => {
      const columns = line.split(',').map(value => value.trim())
      const parsedCost = Number(columns[3] || 0)
      const parsedMarkup = Number(columns[4] || 0)
      const parsedPrice = Number(columns[5] || calculatedPrice(parsedCost, parsedMarkup))

      return {
        name: columns[0] || 'Imported item',
        itemType: validType(columns[1]),
        unit: columns[2] || 'pcs',
        cost: parsedCost,
        markup: parsedMarkup,
        price: parsedPrice,
        vendor: columns[6] || '-',
        notes: columns[7] || '',
        status: validStatus(columns[8]),
      }
    })
  }

  const importFile = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = () => {
      const content = String(reader.result || '')
      const rows = parseCsvRows(content)

      if (rows.length === 0) {
        setImportMessage('No items were found in that file.')
        return
      }

      setItems(previous => {
        let id = nextId(previous)
        const imported = rows.map(row => {
          const record = { id, ...row }
          id += 1
          return record
        })
        return [...previous, ...imported]
      })
      setImportMessage(`${rows.length} item${rows.length === 1 ? '' : 's'} imported.`)
    }
    reader.readAsText(file)
    event.target.value = ''
  }

  if (showForm) {
    return (
      <div style={{ fontFamily: font }}>
        <button
          onClick={closeForm}
          style={{ border: 'none', background: 'transparent', color: '#374151', fontSize: '14px', fontWeight: 600, cursor: 'pointer', marginBottom: '20px', padding: 0 }}
        >
          Back
        </button>

        <div style={{ fontSize: '24px', fontWeight: 600, color: '#111827', marginBottom: '6px' }}>
          {editingId ? 'Edit Pricebook Item' : 'Create Pricebook Item'}
        </div>
        <div style={{ fontSize: '13px', color: '#9ca3af', marginBottom: '28px', display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          <span style={{ color: '#6c63ff', fontWeight: 600 }}>Resources</span>
          <span>/</span>
          <span style={{ color: '#6c63ff', fontWeight: 600 }}>Pricebook</span>
          <span>/</span>
          <span>{editingId ? 'Edit' : 'New'}</span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(220px, 260px) minmax(0, 1fr)', gap: '32px' }}>
          <div>
            <div style={{ fontSize: '15px', fontWeight: 600, color: '#111827', marginBottom: '8px' }}>
              Item Details
            </div>
            <div style={{ fontSize: '13px', color: '#6b7280', lineHeight: 1.6 }}>
              Add reusable labor, material, equipment, or service prices for estimates and budgets.
            </div>
          </div>

          <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '20px', display: 'grid', gap: '14px' }}>
            <label style={fieldGroupStyle}>
              <span style={labelStyle}>Item name</span>
              <input style={fieldStyle} value={name} onChange={event => setName(event.target.value)} placeholder="Example: Excavator rental" />
            </label>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '14px' }}>
              <label style={fieldGroupStyle}>
                <span style={labelStyle}>Item type</span>
                <select style={fieldStyle} value={itemType} onChange={event => setItemType(event.target.value as ItemType)}>
                  <option>Material</option>
                  <option>Labor</option>
                  <option>Equipment</option>
                  <option>Service</option>
                  <option>Other</option>
                </select>
              </label>
              <label style={fieldGroupStyle}>
                <span style={labelStyle}>Unit</span>
                <input style={fieldStyle} value={unit} onChange={event => setUnit(event.target.value)} placeholder="pcs, hour, day, sqm" />
                <span style={helpTextStyle}>How this item is measured or charged.</span>
              </label>
              <label style={fieldGroupStyle}>
                <span style={labelStyle}>Status</span>
                <select style={fieldStyle} value={status} onChange={event => setStatus(event.target.value as Status)}>
                  <option>Active</option>
                  <option>Inactive</option>
                </select>
              </label>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '14px' }}>
              <label style={fieldGroupStyle}>
                <span style={labelStyle}>Base cost</span>
                <input style={fieldStyle} type="number" value={cost} onChange={event => updateCost(Number(event.target.value))} placeholder="0" />
                <span style={helpTextStyle}>Your cost before markup.</span>
              </label>
              <label style={fieldGroupStyle}>
                <span style={labelStyle}>Markup %</span>
                <input style={fieldStyle} type="number" value={markup} onChange={event => updateMarkup(Number(event.target.value))} placeholder="15" />
                <span style={helpTextStyle}>Percent added to the base cost.</span>
              </label>
              <label style={fieldGroupStyle}>
                <span style={labelStyle}>Selling price</span>
                <input style={fieldStyle} type="number" value={price} onChange={event => setPrice(Number(event.target.value))} placeholder="0" />
                <span style={helpTextStyle}>The amount charged to the client.</span>
              </label>
            </div>

            <label style={fieldGroupStyle}>
              <span style={labelStyle}>Vendor or supplier</span>
              <input style={fieldStyle} value={vendor} onChange={event => setVendor(event.target.value)} placeholder="Example: ABC Supplies" />
            </label>
            <label style={fieldGroupStyle}>
              <span style={labelStyle}>Notes</span>
              <textarea style={{ ...fieldStyle, resize: 'vertical' }} value={notes} onChange={event => setNotes(event.target.value)} rows={4} placeholder="Add internal notes, inclusions, or pricing conditions" />
            </label>

            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'center', flexWrap: 'wrap', padding: '12px 14px', background: '#f9fafb', borderRadius: '10px', border: '1px solid #f3f4f6' }}>
              <div>
                <div style={{ fontSize: '13px', color: '#374151', fontWeight: 600 }}>Estimated margin</div>
                <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '3px' }}>Selling price minus base cost.</div>
              </div>
              <div style={{ fontSize: '15px', color: price >= cost ? '#059669' : '#ef4444', fontWeight: 600 }}>
                {money(price - cost)}
              </div>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '28px' }}>
          <button onClick={closeForm} style={{ ...buttonStyle, background: '#fff', border: '1px solid #e5e7eb', color: '#374151' }}>
            Cancel
          </button>
          <button
            onClick={saveItem}
            disabled={!name.trim()}
            style={{ ...buttonStyle, padding: '12px 26px', background: name.trim() ? '#111827' : '#d1d5db', color: '#fff', cursor: name.trim() ? 'pointer' : 'not-allowed' }}
          >
            {editingId ? 'Save Item' : 'Create Item'}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div style={{ fontFamily: font }} onClick={() => setOpenMenu(null)}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px', marginBottom: '8px', flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontSize: '24px', fontWeight: 600, color: '#111827', marginBottom: '6px' }}>Pricebook</div>
          <div style={{ fontSize: '13px', color: '#9ca3af', display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            <span style={{ color: '#6c63ff', fontWeight: 600 }}>Resources</span>
            <span>/</span>
            <span>Pricebook</span>
            <span>/</span>
            <span>List</span>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button onClick={startCreate} style={{ ...buttonStyle, background: '#111827', color: '#fff' }}>
            + Add item
          </button>
          <button onClick={() => fileInputRef.current?.click()} style={{ ...buttonStyle, background: '#fff', color: '#111827', border: '1px solid #e5e7eb' }}>
            Import CSV
          </button>
          <input ref={fileInputRef} type="file" accept=".csv,text/csv" onChange={importFile} style={{ display: 'none' }} />
        </div>
      </div>

      {importMessage && (
        <div style={{ marginTop: '16px', marginBottom: '8px', color: '#059669', fontSize: '13px', fontWeight: 600 }}>
          {importMessage}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '14px', margin: '24px 0' }}>
        {[
          ['Total Items', summary.totalItems.toLocaleString(), `${summary.activeItems} active`],
          ['Total Cost', money(summary.totalCost), 'Base price total'],
          ['Total Price', money(summary.totalPrice), 'Selling price total'],
          ['Average Markup', `${summary.averageMarkup}%`, 'Across all items'],
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
              onClick={() => setActiveTab(tab)}
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
                {tabCount(tab)}
              </span>
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', gap: '12px', padding: '16px 24px', borderBottom: '1px solid #f3f4f6', flexWrap: 'wrap' }}>
          <select value={typeFilter} onChange={event => setTypeFilter(event.target.value as ItemType | 'All')} style={{ ...fieldStyle, width: '160px' }}>
            <option>All</option>
            <option>Material</option>
            <option>Labor</option>
            <option>Equipment</option>
            <option>Service</option>
            <option>Other</option>
          </select>

          <div style={{ flex: 1, minWidth: '220px', display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 14px', border: '1px solid #e5e7eb', borderRadius: '8px', background: '#fafafa' }}>
            <span style={{ color: '#9ca3af', fontSize: '13px', fontWeight: 600 }}>Search</span>
            <input
              value={search}
              onChange={event => setSearch(event.target.value)}
              placeholder="Search item, type, or vendor..."
              style={{ flex: 1, border: 'none', background: 'transparent', outline: 'none', fontSize: '13px', color: '#374151' }}
            />
          </div>
        </div>

        {filtered.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '70px 24px', color: '#9ca3af', textAlign: 'center', gap: '12px' }}>
            <div style={{ fontSize: '15px', fontWeight: 600 }}>No pricebook items yet</div>
            <div style={{ fontSize: '13px', fontWeight: 600 }}>Click + Add item to create reusable prices for budgets and estimates.</div>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', minWidth: '980px', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#fafafa' }}>
                  {['Item', 'Type', 'Unit', 'Cost', 'Markup', 'Price', 'Vendor', 'Status', ''].map(header => (
                    <th key={header} style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(item => (
                  <tr key={item.id} style={{ borderTop: '1px solid #f3f4f6' }}>
                    <td style={{ padding: '15px 16px' }}>
                      <div style={{ fontSize: '13px', fontWeight: 600, color: '#111827' }}>{item.name}</div>
                      {item.notes && <div style={{ fontSize: '12px', color: '#9ca3af', marginTop: '4px' }}>{item.notes}</div>}
                    </td>
                    <td style={cellStyle}>{item.itemType}</td>
                    <td style={cellStyle}>{item.unit}</td>
                    <td style={{ ...cellStyle, fontWeight: 600, color: '#111827' }}>{money(item.cost)}</td>
                    <td style={cellStyle}>{item.markup}%</td>
                    <td style={{ ...cellStyle, fontWeight: 600, color: '#111827' }}>{money(item.price)}</td>
                    <td style={cellStyle}>{item.vendor}</td>
                    <td style={{ padding: '15px 16px' }}>
                      <span style={{ padding: '4px 10px', borderRadius: '99px', background: item.status === 'Active' ? '#d1fae5' : '#f3f4f6', color: item.status === 'Active' ? '#059669' : '#6b7280', fontSize: '11px', fontWeight: 600 }}>
                        {item.status.toUpperCase()}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', position: 'relative', width: '44px' }}>
                      <button
                        onClick={event => {
                          event.stopPropagation()
                          setOpenMenu(openMenu === item.id ? null : item.id)
                        }}
                        style={{ width: '32px', height: '32px', border: 'none', borderRadius: '8px', background: openMenu === item.id ? '#eef2ff' : 'transparent', color: '#2563eb', cursor: 'pointer', fontSize: '18px', fontWeight: 600 }}
                      >
                        ...
                      </button>

                      {openMenu === item.id && (
                        <div onClick={event => event.stopPropagation()} style={{ position: 'absolute', right: '16px', top: '46px', width: '160px', background: '#fff', border: '1px solid #e5e7eb', borderRadius: '10px', boxShadow: '0 16px 40px rgba(15,23,42,0.14)', zIndex: 30, overflow: 'hidden' }}>
                          <button onClick={() => startEdit(item)} style={menuButtonStyle}>Edit</button>
                          <button onClick={() => toggleStatus(item)} style={menuButtonStyle}>
                            Mark {item.status === 'Active' ? 'Inactive' : 'Active'}
                          </button>
                          <button onClick={() => deleteItem(item.id)} style={{ ...menuButtonStyle, color: '#ef4444' }}>Delete</button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '14px 24px', borderTop: '1px solid #f3f4f6', color: '#374151', fontSize: '13px', fontWeight: 600 }}>
          1-{filtered.length} of {filtered.length}
        </div>
      </div>
    </div>
  )
}

const cellStyle = {
  padding: '15px 16px',
  fontSize: '13px',
  color: '#374151',
  fontWeight: 600,
}

const menuButtonStyle = {
  display: 'block',
  width: '100%',
  padding: '11px 14px',
  border: 'none',
  borderBottom: '1px solid #f3f4f6',
  background: '#fff',
  color: '#374151',
  textAlign: 'left' as const,
  fontSize: '13px',
  fontWeight: 600,
  cursor: 'pointer',
}

function validType(value: string): ItemType {
  if (value === 'Labor' || value === 'Equipment' || value === 'Service' || value === 'Other') return value
  return 'Material'
}

function validStatus(value: string): Status {
  return value === 'Inactive' ? 'Inactive' : 'Active'
}
