'use client'

import Link from 'next/link'
import Image from 'next/image'
import { ChangeEvent, useEffect, useState } from 'react'

const font = "'DM Sans', sans-serif"
const storageKey = 'flowsys-warehouses'

interface Warehouse {
  id: number
  name: string
  location: string
  manager: string
  notes: string
  photoUrl?: string
}

const initialWarehouses: Warehouse[] = []

const getInitial = (value: string) => value.trim().charAt(0).toUpperCase() || 'W'

const fieldStyle = {
  width: '100%',
  padding: '10px 14px',
  border: '1px solid #e5e7eb',
  borderRadius: '8px',
  outline: 'none',
  fontSize: '13px',
  color: '#374151',
}

const labelStyle = {
  display: 'grid',
  gap: '7px',
  fontSize: '12px',
  color: '#374151',
  fontWeight: 600,
}

const loadWarehouses = () => {
  if (typeof window === 'undefined') return initialWarehouses

  try {
    const stored = window.localStorage.getItem(storageKey)
    return stored ? (JSON.parse(stored) as Warehouse[]) : initialWarehouses
  } catch {
    return initialWarehouses
  }
}

export default function InventoryPage() {
  const [search, setSearch] = useState('')
  const [warehouses, setWarehouses] = useState<Warehouse[]>(loadWarehouses)
  const [showCreate, setShowCreate] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [openMenu, setOpenMenu] = useState<number | null>(null)
  const [name, setName] = useState('')
  const [location, setLocation] = useState('')
  const [manager, setManager] = useState('')
  const [notes, setNotes] = useState('')
  const [photoUrl, setPhotoUrl] = useState('')

  useEffect(() => {
    window.localStorage.setItem(storageKey, JSON.stringify(warehouses))
  }, [warehouses])

  const filtered = warehouses.filter(warehouse =>
    warehouse.name.toLowerCase().includes(search.toLowerCase()) ||
    warehouse.location.toLowerCase().includes(search.toLowerCase()) ||
    warehouse.manager.toLowerCase().includes(search.toLowerCase())
  )

  const resetForm = () => {
    setName('')
    setLocation('')
    setManager('')
    setNotes('')
    setPhotoUrl('')
    setEditingId(null)
  }

  const startEdit = (warehouse: Warehouse) => {
    setName(warehouse.name)
    setLocation(warehouse.location)
    setManager(warehouse.manager)
    setNotes(warehouse.notes)
    setPhotoUrl(warehouse.photoUrl || '')
    setEditingId(warehouse.id)
    setShowCreate(true)
    setOpenMenu(null)
  }

  const uploadWarehousePhoto = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = () => setPhotoUrl(String(reader.result || ''))
    reader.readAsDataURL(file)
  }

  const saveWarehouse = () => {
    const trimmedName = name.trim()
    if (!trimmedName) return

    if (editingId) {
      setWarehouses(prev =>
        prev.map(warehouse =>
          warehouse.id === editingId
            ? {
                ...warehouse,
                name: trimmedName,
                location: location.trim() || '-',
                manager: manager.trim() || '-',
                notes,
                photoUrl,
              }
            : warehouse
        )
      )
    } else {
      const nextId = warehouses.reduce((maxId, warehouse) => Math.max(maxId, warehouse.id), 0) + 1
      setWarehouses(prev => [
        ...prev,
        {
          id: nextId,
          name: trimmedName,
          location: location.trim() || '-',
          manager: manager.trim() || '-',
          notes,
          photoUrl,
        },
      ])
    }

    resetForm()
    setShowCreate(false)
  }

  const deleteWarehouse = (id: number) => {
    setWarehouses(prev => prev.filter(warehouse => warehouse.id !== id))
    window.localStorage.removeItem(`flowsys-inventory-${id}`)
    window.localStorage.removeItem(`flowsys-purchase-orders-${id}`)
    window.localStorage.removeItem(`flowsys-outgoing-transfers-${id}`)
    setOpenMenu(null)
  }

  if (showCreate) {
    return (
      <div style={{ fontFamily: font }}>
        <div
          onClick={() => {
            resetForm()
            setShowCreate(false)
          }}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '14px',
            color: '#374151',
            fontWeight: 600,
            marginBottom: '20px',
            cursor: 'pointer',
          }}
        >
          ← Back
        </div>

        <div style={{ fontSize: '24px', fontWeight: 600, color: '#111827', marginBottom: '6px' }}>
          {editingId ? 'Edit Warehouse' : 'Create Warehouse'}
        </div>
        <div style={{ fontSize: '13px', color: '#9ca3af', marginBottom: '28px', display: 'flex', gap: '6px' }}>
          <span style={{ color: '#6c63ff', fontWeight: 500 }}>Resources</span>
          <span>/</span>
          <span style={{ color: '#6c63ff', fontWeight: 500 }}>Inventory</span>
          <span>/</span>
          <span>{editingId ? 'Edit' : 'New'}</span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(220px, 260px) minmax(0, 1fr)', gap: '32px' }}>
          <div>
            <div style={{ fontSize: '15px', fontWeight: 600, color: '#111827', marginBottom: '6px' }}>
              Warehouse Details
            </div>
            <div style={{ fontSize: '13px', color: '#6b7280', lineHeight: 1.6 }}>
              Add the warehouse name, location, manager, and notes.
            </div>
          </div>

          <div
            style={{
              background: '#fff',
              border: '1px solid #e5e7eb',
              borderRadius: '12px',
              padding: '20px',
              display: 'grid',
              gap: '14px',
            }}
          >
            <label style={labelStyle}>
              Warehouse profile photo
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
                <div
                  style={{
                    width: '74px',
                    height: '74px',
                    borderRadius: '14px',
                    background: '#f3f4f6',
                    border: '1px solid #e5e7eb',
                    overflow: 'hidden',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#6b7280',
                    fontSize: '22px',
                    fontWeight: 600,
                  }}
                >
                  {photoUrl ? <Image src={photoUrl} alt="Warehouse preview" width={74} height={74} unoptimized style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : getInitial(name)}
                </div>
                <div style={{ display: 'grid', gap: '8px' }}>
                  <input type="file" accept="image/*" onChange={uploadWarehousePhoto} style={{ fontSize: '13px', color: '#374151' }} />
                  {photoUrl && (
                    <button type="button" onClick={() => setPhotoUrl('')} style={{ width: 'fit-content', border: 'none', background: 'transparent', color: '#ef4444', fontSize: '12px', fontWeight: 600, padding: 0, cursor: 'pointer' }}>
                      Remove photo
                    </button>
                  )}
                </div>
              </div>
            </label>

            <input
              placeholder="Warehouse name"
              value={name}
              onChange={event => setName(event.target.value)}
              style={fieldStyle}
            />

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
              <input
                placeholder="Location"
                value={location}
                onChange={event => setLocation(event.target.value)}
                style={fieldStyle}
              />
              <input
                placeholder="Warehouse manager"
                value={manager}
                onChange={event => setManager(event.target.value)}
                style={fieldStyle}
              />
            </div>

            <textarea
              placeholder="Notes"
              value={notes}
              onChange={event => setNotes(event.target.value)}
              rows={4}
              style={{ ...fieldStyle, resize: 'vertical' }}
            />
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '28px' }}>
          <button
            onClick={() => {
              resetForm()
              setShowCreate(false)
            }}
            style={{
              padding: '12px 22px',
              background: '#fff',
              color: '#374151',
              border: '1px solid #e5e7eb',
              borderRadius: '10px',
              fontSize: '14px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Cancel
          </button>
          <button
            onClick={saveWarehouse}
            disabled={!name.trim()}
            style={{
              padding: '12px 28px',
              background: name.trim() ? '#111827' : '#d1d5db',
              color: '#fff',
              border: 'none',
              borderRadius: '10px',
              fontSize: '14px',
              fontWeight: 600,
              cursor: name.trim() ? 'pointer' : 'not-allowed',
            }}
          >
            {editingId ? 'Save Warehouse' : 'Create Warehouse'}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div style={{ fontFamily: font }} onClick={() => setOpenMenu(null)}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
        <div style={{ fontSize: '24px', fontWeight: 600, color: '#111827' }}>Warehouses</div>
        <button
          onClick={() => setShowCreate(true)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 20px',
            background: '#111827',
            color: '#fff',
            border: 'none',
            borderRadius: '10px',
            fontSize: '14px',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          + Add Warehouse
        </button>
      </div>

      <div style={{ fontSize: '13px', color: '#9ca3af', marginBottom: '24px', display: 'flex', gap: '6px' }}>
        <span style={{ color: '#6c63ff', fontWeight: 500 }}>Resources</span>
        <span>/</span>
        <span>Inventory</span>
        <span>/</span>
        <span>Warehouses</span>
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '10px 16px',
          border: '1px solid #e5e7eb',
          borderRadius: '10px',
          background: '#fff',
          marginBottom: '28px',
          maxWidth: '500px',
        }}
      >
        <span style={{ color: '#9ca3af', fontSize: '15px' }}>🔍</span>
        <input
          type="text"
          placeholder="Search warehouses..."
          value={search}
          onChange={event => setSearch(event.target.value)}
          style={{ border: 'none', background: 'transparent', fontSize: '14px', color: '#374151', outline: 'none', flex: 1 }}
        />
      </div>

      {filtered.length === 0 ? (
        <div
          style={{
            background: '#fff',
            border: '1px solid #e5e7eb',
            borderRadius: '16px',
            textAlign: 'center',
            padding: '60px',
            color: '#9ca3af',
            fontSize: '14px',
            fontWeight: 600,
          }}
        >
          No warehouses yet - click + Add Warehouse to create one
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
          {filtered.map(warehouse => (
            <div key={warehouse.id} style={{ position: 'relative' }}>
              <Link href={`/resources/inventory/${warehouse.id}`} style={{ textDecoration: 'none' }}>
                <div
                  style={{
                    background: '#fff',
                    border: '1px solid #e5e7eb',
                    borderRadius: '16px',
                    padding: '24px',
                    cursor: 'pointer',
                    minHeight: '170px',
                    transition: 'box-shadow 0.2s',
                  }}
                  onMouseEnter={event => (event.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.08)')}
                  onMouseLeave={event => (event.currentTarget.style.boxShadow = 'none')}
                >
                  <div
                    style={{
                      width: '54px',
                      height: '54px',
                      borderRadius: '12px',
                      background: '#f3f4f6',
                      overflow: 'hidden',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '18px',
                      fontWeight: 600,
                      color: '#374151',
                      marginBottom: '16px',
                    }}
                  >
                    {warehouse.photoUrl ? <Image src={warehouse.photoUrl} alt={warehouse.name} width={54} height={54} unoptimized style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : getInitial(warehouse.name)}
                  </div>
                  <div style={{ fontSize: '15px', fontWeight: 600, color: '#111827', marginBottom: '6px' }}>
                    {warehouse.name}
                  </div>
                  <div style={{ fontSize: '13px', color: '#6b7280', fontWeight: 400, marginBottom: '6px' }}>
                    {warehouse.location}
                  </div>
                  <div style={{ fontSize: '12px', color: '#9ca3af', fontWeight: 500 }}>
                    Manager: {warehouse.manager}
                  </div>
                </div>
              </Link>

              <button
                onClick={event => {
                  event.preventDefault()
                  event.stopPropagation()
                  setOpenMenu(openMenu === warehouse.id ? null : warehouse.id)
                }}
                aria-label={`Open actions for ${warehouse.name}`}
                style={{
                  position: 'absolute',
                  top: '14px',
                  right: '14px',
                  width: '32px',
                  height: '32px',
                  border: 'none',
                  borderRadius: '8px',
                  background: openMenu === warehouse.id ? '#f3f4f6' : 'transparent',
                  color: '#6b7280',
                  cursor: 'pointer',
                  fontSize: '18px',
                  fontWeight: 600,
                }}
              >
                ⋮
              </button>

              {openMenu === warehouse.id && (
                <div
                  onClick={event => event.stopPropagation()}
                  style={{
                    position: 'absolute',
                    right: '14px',
                    top: '50px',
                    width: '140px',
                    background: '#fff',
                    border: '1px solid #e5e7eb',
                    borderRadius: '10px',
                    boxShadow: '0 14px 35px rgba(15,23,42,0.12)',
                    overflow: 'hidden',
                    zIndex: 20,
                  }}
                >
                  <div
                    onClick={() => startEdit(warehouse)}
                    style={{
                      padding: '11px 14px',
                      fontSize: '13px',
                      color: '#374151',
                      fontWeight: 600,
                      cursor: 'pointer',
                      borderBottom: '1px solid #f3f4f6',
                    }}
                  >
                    Edit
                  </div>
                  <div
                    onClick={() => deleteWarehouse(warehouse.id)}
                    style={{
                      padding: '11px 14px',
                      fontSize: '13px',
                      color: '#ef4444',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    Delete
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
