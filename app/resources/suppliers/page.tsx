'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'

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

const labelStyle = {
  display: 'grid',
  gap: '7px',
  fontSize: '12px',
  color: '#374151',
  fontWeight: 600,
}

const buttonStyle = {
  padding: '10px 18px',
  borderRadius: '10px',
  border: 'none',
  fontSize: '13px',
  fontWeight: 600,
  cursor: 'pointer',
}

const loadSuppliers = () => {
  if (typeof window === 'undefined') return []

  try {
    const stored = window.localStorage.getItem(storageKey)
    return stored ? (JSON.parse(stored) as Supplier[]) : []
  } catch {
    return []
  }
}

const nextId = <T extends { id: number }>(records: T[]) => records.reduce((max, record) => Math.max(max, record.id), 0) + 1

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>(loadSuppliers)
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [name, setName] = useState('')
  const [contact, setContact] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [notes, setNotes] = useState('')

  useEffect(() => {
    window.localStorage.setItem(storageKey, JSON.stringify(suppliers))
  }, [suppliers])

  const filtered = useMemo(
    () =>
      suppliers.filter(supplier =>
        supplier.name.toLowerCase().includes(search.toLowerCase()) ||
        supplier.contact.toLowerCase().includes(search.toLowerCase()) ||
        supplier.email.toLowerCase().includes(search.toLowerCase())
      ),
    [search, suppliers]
  )

  const resetForm = () => {
    setName('')
    setContact('')
    setPhone('')
    setEmail('')
    setNotes('')
    setEditingId(null)
  }

  const startEdit = (supplier: Supplier) => {
    setEditingId(supplier.id)
    setName(supplier.name)
    setContact(supplier.contact)
    setPhone(supplier.phone)
    setEmail(supplier.email)
    setNotes(supplier.notes)
    setShowForm(true)
  }

  const closeForm = () => {
    resetForm()
    setShowForm(false)
  }

  const saveSupplier = () => {
    const trimmedName = name.trim()
    if (!trimmedName) return

    if (editingId) {
      setSuppliers(previous =>
        previous.map(supplier =>
          supplier.id === editingId
            ? {
                ...supplier,
                name: trimmedName,
                contact: contact.trim() || '-',
                phone: phone.trim() || '-',
                email: email.trim() || '-',
                notes,
              }
            : supplier
        )
      )
    } else {
      setSuppliers(previous => [
        ...previous,
        {
          id: nextId(previous),
          name: trimmedName,
          contact: contact.trim() || '-',
          phone: phone.trim() || '-',
          email: email.trim() || '-',
          notes,
          supplies: [],
        },
      ])
    }

    closeForm()
  }

  const deleteSupplier = (id: number) => {
    setSuppliers(previous => previous.filter(supplier => supplier.id !== id))
  }

  if (showForm) {
    return (
      <div style={{ fontFamily: font }}>
        <button onClick={closeForm} style={{ border: 'none', background: 'transparent', color: '#374151', fontSize: '14px', fontWeight: 600, cursor: 'pointer', marginBottom: '20px', padding: 0 }}>
          Back
        </button>
        <div style={{ fontSize: '24px', fontWeight: 600, color: '#111827', marginBottom: '6px' }}>{editingId ? 'Edit Supplier' : 'Add Supplier'}</div>
        <div style={{ fontSize: '13px', color: '#9ca3af', marginBottom: '28px', display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          <span style={{ color: '#6c63ff', fontWeight: 600 }}>Resources</span>
          <span>/</span>
          <span style={{ color: '#6c63ff', fontWeight: 600 }}>Suppliers</span>
          <span>/</span>
          <span>{editingId ? 'Edit' : 'New'}</span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(220px, 260px) minmax(0, 1fr)', gap: '32px' }}>
          <div>
            <div style={{ fontSize: '15px', fontWeight: 600, color: '#111827', marginBottom: '8px' }}>Supplier Details</div>
            <div style={{ fontSize: '13px', color: '#6b7280', lineHeight: 1.6 }}>
              Add supplier contact details, then open the supplier to list the items they can provide.
            </div>
          </div>

          <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '20px', display: 'grid', gap: '14px' }}>
            <label style={labelStyle}>
              Supplier name
              <input style={fieldStyle} value={name} onChange={event => setName(event.target.value)} placeholder="Example: ABC Supplies" />
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: '14px' }}>
              <label style={labelStyle}>
                Contact person
                <input style={fieldStyle} value={contact} onChange={event => setContact(event.target.value)} placeholder="Example: Maria Santos" />
              </label>
              <label style={labelStyle}>
                Phone
                <input style={fieldStyle} value={phone} onChange={event => setPhone(event.target.value)} placeholder="Phone number" />
              </label>
            </div>
            <label style={labelStyle}>
              Email
              <input style={fieldStyle} value={email} onChange={event => setEmail(event.target.value)} placeholder="supplier@example.com" />
            </label>
            <label style={labelStyle}>
              Notes
              <textarea style={{ ...fieldStyle, resize: 'vertical' }} value={notes} onChange={event => setNotes(event.target.value)} rows={4} placeholder="Payment terms, delivery notes, or account details" />
            </label>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '28px' }}>
          <button onClick={closeForm} style={{ ...buttonStyle, background: '#fff', border: '1px solid #e5e7eb', color: '#374151' }}>Cancel</button>
          <button onClick={saveSupplier} disabled={!name.trim()} style={{ ...buttonStyle, background: name.trim() ? '#111827' : '#d1d5db', color: '#fff', cursor: name.trim() ? 'pointer' : 'not-allowed' }}>
            {editingId ? 'Save Supplier' : 'Create Supplier'}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div style={{ fontFamily: font }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px', marginBottom: '8px', flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontSize: '24px', fontWeight: 600, color: '#111827', marginBottom: '6px' }}>Suppliers</div>
          <div style={{ fontSize: '13px', color: '#9ca3af', display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            <span style={{ color: '#6c63ff', fontWeight: 600 }}>Resources</span>
            <span>/</span>
            <span>Suppliers</span>
          </div>
        </div>
        <button onClick={() => setShowForm(true)} style={{ ...buttonStyle, background: '#111827', color: '#fff' }}>+ Add Supplier</button>
      </div>

      <div style={{ margin: '24px 0', maxWidth: '520px', background: '#fff', border: '1px solid #e5e7eb', borderRadius: '10px', padding: '10px 14px' }}>
        <input value={search} onChange={event => setSearch(event.target.value)} placeholder="Search suppliers..." style={{ border: 'none', outline: 'none', width: '100%', fontSize: '14px', color: '#374151' }} />
      </div>

      {filtered.length === 0 ? (
        <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '16px', textAlign: 'center', padding: '60px 24px', color: '#9ca3af', fontSize: '14px', fontWeight: 600 }}>
          No suppliers yet. Add a supplier to start building a supply catalog.
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '18px' }}>
          {filtered.map(supplier => (
            <div key={supplier.id} style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '14px', padding: '18px', display: 'grid', gap: '14px' }}>
              <Link href={`/resources/suppliers/${supplier.id}`} style={{ textDecoration: 'none' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '44px', height: '44px', borderRadius: '10px', background: '#f3f4f6', color: '#374151', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', fontWeight: 600 }}>
                    {supplier.name.trim().charAt(0).toUpperCase() || 'S'}
                  </div>
                  <div>
                    <div style={{ fontSize: '15px', fontWeight: 600, color: '#111827' }}>{supplier.name}</div>
                    <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>{supplier.supplies.length} supplies listed</div>
                  </div>
                </div>
              </Link>
              <div style={{ fontSize: '13px', color: '#6b7280', lineHeight: 1.5 }}>
                <div>Contact: {supplier.contact}</div>
                <div>Email: {supplier.email}</div>
              </div>
              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                <button onClick={() => startEdit(supplier)} style={{ ...buttonStyle, background: '#fff', color: '#374151', border: '1px solid #e5e7eb', padding: '8px 12px' }}>Edit</button>
                <button onClick={() => deleteSupplier(supplier.id)} style={{ ...buttonStyle, background: '#fff', color: '#ef4444', border: '1px solid #fee2e2', padding: '8px 12px' }}>Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
