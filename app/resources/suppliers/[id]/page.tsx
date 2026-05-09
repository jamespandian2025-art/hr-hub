'use client'

import Link from 'next/link'
import { useParams } from 'next/navigation'
import { ChangeEvent, useEffect, useMemo, useRef, useState } from 'react'

const font = "'DM Sans', sans-serif"
const storageKey = 'flowsys-suppliers'

type SupplyType = 'Material' | 'Tool' | 'Equipment' | 'Supply'

interface SupplierSupply {
  id: number
  name: string
  sku: string
  itemType: SupplyType
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

const unitOptions = [
  'pcs',
  'per kilo',
  'per gram',
  'per liter',
  'per meter',
  'per sqm',
  'per cubic meter',
  'per bag',
  'per box',
  'per roll',
  'per bundle',
  'per sheet',
  'per gallon',
  'per hour',
  'per day',
]

const loadSuppliers = () => {
  if (typeof window === 'undefined') return []

  try {
    const stored = window.localStorage.getItem(storageKey)
    return stored ? (JSON.parse(stored) as Supplier[]) : []
  } catch {
    return []
  }
}

const money = (value: number) => `Php ${value.toLocaleString()}.00`
const nextId = <T extends { id: number }>(records: T[]) => records.reduce((max, record) => Math.max(max, record.id), 0) + 1
const validSupplyType = (value: string): SupplyType => {
  const normalized = value.trim()
  return normalized === 'Tool' || normalized === 'Equipment' || normalized === 'Supply' ? normalized : 'Material'
}

const parseCsvLine = (line: string) => {
  const cells: string[] = []
  let current = ''
  let quoted = false

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index]
    const next = line[index + 1]

    if (char === '"' && quoted && next === '"') {
      current += '"'
      index += 1
    } else if (char === '"') {
      quoted = !quoted
    } else if (char === ',' && !quoted) {
      cells.push(current.trim())
      current = ''
    } else {
      current += char
    }
  }

  cells.push(current.trim())
  return cells
}

const csvCell = (value: string | number) => {
  const text = String(value)
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text
}

export default function SupplierDetailPage() {
  const params = useParams<{ id: string }>()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const supplierId = Number(params.id)
  const [suppliers, setSuppliers] = useState<Supplier[]>(loadSuppliers)
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editingSupplyId, setEditingSupplyId] = useState<number | null>(null)
  const [name, setName] = useState('')
  const [sku, setSku] = useState('')
  const [itemType, setItemType] = useState<SupplyType>('Material')
  const [unit, setUnit] = useState('pcs')
  const [cost, setCost] = useState(0)
  const [availableQty, setAvailableQty] = useState(0)
  const [importMessage, setImportMessage] = useState('')

  useEffect(() => {
    window.localStorage.setItem(storageKey, JSON.stringify(suppliers))
  }, [suppliers])

  const supplier = suppliers.find(record => record.id === supplierId)
  const supplies = useMemo(() => supplier?.supplies || [], [supplier])
  const filtered = useMemo(
    () =>
      supplies.filter(supply =>
        supply.name.toLowerCase().includes(search.toLowerCase()) ||
        supply.sku.toLowerCase().includes(search.toLowerCase()) ||
        supply.itemType.toLowerCase().includes(search.toLowerCase())
      ),
    [search, supplies]
  )

  const resetForm = () => {
    setName('')
    setSku('')
    setItemType('Material')
    setUnit('pcs')
    setCost(0)
    setAvailableQty(0)
    setEditingSupplyId(null)
  }

  const closeForm = () => {
    resetForm()
    setShowForm(false)
  }

  const startEdit = (supply: SupplierSupply) => {
    setEditingSupplyId(supply.id)
    setName(supply.name)
    setSku(supply.sku)
    setItemType(supply.itemType)
    setUnit(supply.unit)
    setCost(supply.cost)
    setAvailableQty(supply.availableQty)
    setShowForm(true)
  }

  const saveSupply = (keepAdding = false) => {
    const trimmedName = name.trim()
    if (!supplier || !trimmedName) return

    setSuppliers(previous =>
      previous.map(record => {
        if (record.id !== supplier.id) return record

        const nextSupply = {
          id: editingSupplyId || nextId(record.supplies),
          name: trimmedName,
          sku: sku.trim() || `SUP-${String(nextId(record.supplies)).padStart(4, '0')}`,
          itemType,
          unit: unit.trim() || 'pcs',
          cost,
          availableQty,
        }

        return {
          ...record,
          supplies: editingSupplyId
            ? record.supplies.map(supply => (supply.id === editingSupplyId ? nextSupply : supply))
            : [...record.supplies, nextSupply],
        }
      })
    )

    if (keepAdding) {
      resetForm()
      return
    }

    closeForm()
  }

  const deleteSupply = (id: number) => {
    if (!supplier) return

    setSuppliers(previous =>
      previous.map(record =>
        record.id === supplier.id
          ? { ...record, supplies: record.supplies.filter(supply => supply.id !== id) }
          : record
      )
    )
  }

  const importCsv = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file || !supplier) return

    const reader = new FileReader()
    reader.onload = () => {
      const content = String(reader.result || '')
      const lines = content.split(/\r?\n/).map(line => line.trim()).filter(Boolean)

      if (lines.length <= 1) {
        setImportMessage('No supplies were found in that CSV.')
        return
      }

      const rows = lines.slice(1).map(parseCsvLine).filter(columns => columns[0])
      if (rows.length === 0) {
        setImportMessage('No supplies were found in that CSV.')
        return
      }

      setSuppliers(previous =>
        previous.map(record => {
          if (record.id !== supplier.id) return record

          let id = nextId(record.supplies)
          const imported = rows.map(columns => {
            const supply = {
              id,
              name: columns[0] || 'Imported supply',
              sku: columns[1] || `SUP-${String(id).padStart(4, '0')}`,
              itemType: validSupplyType(columns[2] || 'Material'),
              unit: columns[3] || 'pcs',
              cost: Number(columns[4] || 0),
              availableQty: Number(columns[5] || 0),
            }
            id += 1
            return supply
          })

          return { ...record, supplies: [...record.supplies, ...imported] }
        })
      )
      setImportMessage(`${rows.length} suppl${rows.length === 1 ? 'y' : 'ies'} imported.`)
    }
    reader.readAsText(file)
    event.target.value = ''
  }

  const exportCsv = () => {
    if (!supplier) return

    const rows = [
      ['name', 'sku', 'itemType', 'unit', 'cost', 'availableQty'],
      ...supplies.map(supply => [supply.name, supply.sku, supply.itemType, supply.unit, supply.cost, supply.availableQty]),
    ]
    const csv = rows.map(row => row.map(csvCell).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${supplier.name.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}-supplies.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  if (!supplier) {
    return (
      <div style={{ fontFamily: font }}>
        <Link href="/resources/suppliers" style={{ color: '#6c63ff', fontSize: '14px', fontWeight: 600, textDecoration: 'none' }}>Back to suppliers</Link>
        <div style={{ marginTop: '28px', background: '#fff', border: '1px solid #e5e7eb', borderRadius: '16px', padding: '44px', textAlign: 'center' }}>
          <div style={{ fontSize: '22px', fontWeight: 600, color: '#111827', marginBottom: '8px' }}>Supplier not found</div>
          <div style={{ fontSize: '14px', color: '#6b7280' }}>Create the supplier first, then add available supplies.</div>
        </div>
      </div>
    )
  }

  if (showForm) {
    return (
      <div style={{ fontFamily: font }}>
        <button onClick={closeForm} style={{ border: 'none', background: 'transparent', color: '#374151', fontSize: '14px', fontWeight: 600, cursor: 'pointer', marginBottom: '20px', padding: 0 }}>Back</button>
        <div style={{ fontSize: '24px', fontWeight: 600, color: '#111827', marginBottom: '6px' }}>{editingSupplyId ? 'Edit Supply' : 'Add Supply'}</div>
        <div style={{ fontSize: '13px', color: '#9ca3af', marginBottom: '28px', display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          <span style={{ color: '#6c63ff', fontWeight: 600 }}>Resources</span>
          <span>/</span>
          <span style={{ color: '#6c63ff', fontWeight: 600 }}>Suppliers</span>
          <span>/</span>
          <span>{supplier.name}</span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(220px, 260px) minmax(0, 1fr)', gap: '32px' }}>
          <div>
            <div style={{ fontSize: '15px', fontWeight: 600, color: '#111827', marginBottom: '8px' }}>Available Supply</div>
            <div style={{ fontSize: '13px', color: '#6b7280', lineHeight: 1.6 }}>
              List the items this supplier can provide. These appear in inventory purchase orders after selecting the supplier.
            </div>
          </div>

          <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '20px', display: 'grid', gap: '14px' }}>
            <label style={fieldGroupStyle}>
              <span style={labelStyle}>Supply name</span>
              <input style={fieldStyle} value={name} onChange={event => setName(event.target.value)} placeholder="Example: Portland cement" />
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '14px' }}>
              <label style={fieldGroupStyle}>
                <span style={labelStyle}>SKU / item code</span>
                <input style={fieldStyle} value={sku} onChange={event => setSku(event.target.value)} placeholder="Example: CEM-001" />
              </label>
              <label style={fieldGroupStyle}>
                <span style={labelStyle}>Supply type</span>
                <select style={fieldStyle} value={itemType} onChange={event => setItemType(event.target.value as SupplyType)}>
                  <option>Material</option>
                  <option>Tool</option>
                  <option>Equipment</option>
                  <option>Supply</option>
                </select>
              </label>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '14px' }}>
              <label style={fieldGroupStyle}>
                <span style={labelStyle}>Unit</span>
                <input
                  style={fieldStyle}
                  value={unit}
                  onChange={event => setUnit(event.target.value)}
                  placeholder="Example: per kilo, pcs, per bag"
                  list="supplier-unit-options"
                />
                <datalist id="supplier-unit-options">
                  {unitOptions.map(option => <option key={option} value={option} />)}
                </datalist>
                <span style={helpTextStyle}>Choose a suggestion or type any custom unit this supplier uses.</span>
              </label>
              <label style={fieldGroupStyle}>
                <span style={labelStyle}>Unit cost</span>
                <input style={fieldStyle} type="number" value={cost} onChange={event => setCost(Number(event.target.value))} placeholder="0" />
                <span style={helpTextStyle}>Default cost used in purchase orders.</span>
              </label>
              <label style={fieldGroupStyle}>
                <span style={labelStyle}>Available quantity</span>
                <input style={fieldStyle} type="number" value={availableQty} onChange={event => setAvailableQty(Number(event.target.value))} placeholder="0" />
              </label>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '28px' }}>
          <button onClick={closeForm} style={{ ...buttonStyle, background: '#fff', border: '1px solid #e5e7eb', color: '#374151' }}>Cancel</button>
          {!editingSupplyId && (
            <button onClick={() => saveSupply(true)} disabled={!name.trim()} style={{ ...buttonStyle, background: name.trim() ? '#fff' : '#f3f4f6', border: '1px solid #e5e7eb', color: name.trim() ? '#111827' : '#9ca3af', cursor: name.trim() ? 'pointer' : 'not-allowed' }}>
              Create & Add Another
            </button>
          )}
          <button onClick={() => saveSupply()} disabled={!name.trim()} style={{ ...buttonStyle, background: name.trim() ? '#111827' : '#d1d5db', color: '#fff', cursor: name.trim() ? 'pointer' : 'not-allowed' }}>{editingSupplyId ? 'Save Supply' : 'Create Supply'}</button>
        </div>
      </div>
    )
  }

  return (
    <div style={{ fontFamily: font }}>
      <Link href="/resources/suppliers" style={{ textDecoration: 'none' }}>
        <div style={{ display: 'inline-flex', color: '#374151', fontSize: '14px', fontWeight: 600, marginBottom: '20px' }}>Back to Suppliers</div>
      </Link>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px', flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontSize: '24px', fontWeight: 600, color: '#111827', marginBottom: '6px' }}>{supplier.name}</div>
          <div style={{ fontSize: '13px', color: '#9ca3af', display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            <span style={{ color: '#6c63ff', fontWeight: 600 }}>Resources</span>
            <span>/</span>
            <span style={{ color: '#6c63ff', fontWeight: 600 }}>Suppliers</span>
            <span>/</span>
            <span>Available Supply</span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button onClick={() => setShowForm(true)} style={{ ...buttonStyle, background: '#111827', color: '#fff' }}>+ Add Supply</button>
          <button onClick={() => fileInputRef.current?.click()} style={{ ...buttonStyle, background: '#fff', color: '#111827', border: '1px solid #e5e7eb' }}>Import CSV</button>
          <button onClick={exportCsv} style={{ ...buttonStyle, background: '#fff', color: '#111827', border: '1px solid #e5e7eb' }}>Export CSV</button>
          <input ref={fileInputRef} type="file" accept=".csv,text/csv" onChange={importCsv} style={{ display: 'none' }} />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '14px', margin: '24px 0' }}>
        {[
          ['Supplies', supplies.length.toLocaleString(), 'Items this supplier can provide'],
          ['Contact', supplier.contact, supplier.phone],
          ['Email', supplier.email, 'Supplier communication'],
        ].map(([label, value, detail]) => (
          <div key={label} style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '18px' }}>
            <div style={{ fontSize: '12px', color: '#6b7280', fontWeight: 600, marginBottom: '8px' }}>{label}</div>
            <div style={{ fontSize: '18px', color: '#111827', fontWeight: 600, wordBreak: 'break-word' }}>{value}</div>
            <div style={{ fontSize: '12px', color: '#9ca3af', fontWeight: 600, marginTop: '5px' }}>{detail}</div>
          </div>
        ))}
      </div>

      <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '16px', overflow: 'hidden' }}>
        <div style={{ padding: '16px 24px', borderBottom: '1px solid #f3f4f6', display: 'grid', gap: '10px' }}>
          <input value={search} onChange={event => setSearch(event.target.value)} placeholder="Search supply name, SKU, or type..." style={{ width: '100%', maxWidth: '520px', padding: '10px 14px', border: '1px solid #e5e7eb', borderRadius: '8px', outline: 'none', fontSize: '13px', color: '#374151' }} />
          <div style={{ fontSize: '12px', color: '#6b7280', fontWeight: 600 }}>
            CSV columns: name, sku, itemType, unit, cost, availableQty
          </div>
          {importMessage && <div style={{ fontSize: '12px', color: '#059669', fontWeight: 600 }}>{importMessage}</div>}
        </div>

        {filtered.length === 0 ? (
          <div style={{ padding: '70px 24px', textAlign: 'center', color: '#9ca3af', fontSize: '14px', fontWeight: 600 }}>
            No supplies yet. Add items this supplier can provide.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', minWidth: '780px', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#fafafa' }}>
                  {['Supply', 'SKU', 'Type', 'Unit', 'Unit Cost', 'Available', ''].map(header => (
                    <th key={header} style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>{header}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(supply => (
                  <tr key={supply.id} style={{ borderTop: '1px solid #f3f4f6' }}>
                    <td style={{ padding: '15px 16px', fontSize: '13px', fontWeight: 600, color: '#111827' }}>{supply.name}</td>
                    <td style={cellStyle}>{supply.sku}</td>
                    <td style={cellStyle}>{supply.itemType}</td>
                    <td style={cellStyle}>{supply.unit}</td>
                    <td style={{ ...cellStyle, fontWeight: 600, color: '#111827' }}>{money(supply.cost)}</td>
                    <td style={{ ...cellStyle, fontWeight: 600, color: '#111827' }}>{supply.availableQty.toLocaleString()}</td>
                    <td style={{ padding: '12px 16px', whiteSpace: 'nowrap' }}>
                      <button onClick={() => startEdit(supply)} style={{ ...buttonStyle, background: '#fff', color: '#374151', border: '1px solid #e5e7eb', padding: '8px 12px', marginRight: '8px' }}>Edit</button>
                      <button onClick={() => deleteSupply(supply.id)} style={{ ...buttonStyle, background: '#fff', color: '#ef4444', border: '1px solid #fee2e2', padding: '8px 12px' }}>Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

const cellStyle = {
  padding: '15px 16px',
  fontSize: '13px',
  color: '#374151',
  fontWeight: 500,
}
