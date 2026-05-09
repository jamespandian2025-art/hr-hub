'use client'

import { useEffect, useState } from 'react'

const font = "'DM Sans', sans-serif"
const billsStorageKey = 'flowsys-bills'

interface Bill {
  id: number
  name: string
  type: string
  associated: string
  category: string
  vendor: string
  amount: number
  status: string
  date: string
  notes: string
}

const statusStyle: Record<string, { bg: string; color: string }> = {
  PAID: { bg: '#d1fae5', color: '#059669' },
  UNPAID: { bg: '#fef3c7', color: '#d97706' },
}

const categoryColors: Record<string, string> = {
  'Material cost': '#f97316',
  'Labor cost': '#ec4899',
  'Overhead profit': '#f59e0b',
  'General expense': '#6c63ff',
}

const loadBills = () => {
  if (typeof window === 'undefined') return []

  try {
    const stored = window.localStorage.getItem(billsStorageKey)
    return stored ? (JSON.parse(stored) as Bill[]) : []
  } catch {
    return []
  }
}

const tabs = ['All', 'Unpaid', 'Paid']

const formatCurrency = (value: number) => `₱${value.toLocaleString()}.00`
const formatDate = (value: string) =>
  value
    ? new Date(`${value}T00:00:00`).toLocaleDateString('en-PH', { month: 'long', day: 'numeric', year: 'numeric' })
    : '-'

export default function BillsPage() {
  const [showCreate, setShowCreate] = useState(false)
  const [activeTab, setActiveTab] = useState('All')
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<number[]>([])
  const [showSummary, setShowSummary] = useState(true)
  const [bills, setBills] = useState<Bill[]>(loadBills)
  const [selectedBillId, setSelectedBillId] = useState<number | null>(null)
  const [editingId, setEditingId] = useState<number | null>(null)

  const [name, setName] = useState('')
  const [type, setType] = useState('Bill')
  const [associated, setAssociated] = useState('')
  const [category, setCategory] = useState('Material cost')
  const [vendor, setVendor] = useState('')
  const [amount, setAmount] = useState(0)
  const [status, setStatus] = useState('Unpaid')
  const [date, setDate] = useState('2026-05-06')
  const [notes, setNotes] = useState('')

  useEffect(() => {
    window.localStorage.setItem(billsStorageKey, JSON.stringify(bills))
  }, [bills])

  const resetForm = () => {
    setName('')
    setType('Bill')
    setAssociated('')
    setCategory('Material cost')
    setVendor('')
    setAmount(0)
    setStatus('Unpaid')
    setDate('2026-05-06')
    setNotes('')
    setEditingId(null)
  }

  const handleCreate = () => {
    const nextBill: Bill = {
      id: editingId || bills.reduce((max, bill) => Math.max(max, bill.id), 0) + 1,
      name: name || 'Untitled bill',
      type,
      associated: associated || '-',
      category,
      vendor: vendor || '-',
      amount,
      status: status.toUpperCase(),
      date,
      notes,
    }

    setBills(prev => (editingId ? prev.map(bill => (bill.id === editingId ? nextBill : bill)) : [...prev, nextBill]))
    setShowCreate(false)
    resetForm()
  }

  const startEdit = (bill: Bill) => {
    setEditingId(bill.id)
    setName(bill.name)
    setType(bill.type)
    setAssociated(bill.associated === '-' ? '' : bill.associated)
    setCategory(bill.category)
    setVendor(bill.vendor === '-' ? '' : bill.vendor)
    setAmount(bill.amount)
    setStatus(bill.status === 'PAID' ? 'Paid' : 'Unpaid')
    setDate(bill.date)
    setNotes(bill.notes)
    setSelectedBillId(null)
    setShowCreate(true)
  }

  const toggleSelect = (id: number) => {
    setSelected(prev => (prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]))
  }

  const filtered = bills.filter(bill => {
    const matchTab =
      activeTab === 'All' ||
      (activeTab === 'Paid' && bill.status === 'PAID') ||
      (activeTab === 'Unpaid' && bill.status === 'UNPAID')

    const matchSearch =
      bill.name.toLowerCase().includes(search.toLowerCase()) ||
      bill.associated.toLowerCase().includes(search.toLowerCase()) ||
      bill.vendor.toLowerCase().includes(search.toLowerCase())

    return matchTab && matchSearch
  })

  const tabCounts = (tab: string) =>
    tab === 'All'
      ? bills.length
      : bills.filter(bill => bill.status === tab.toUpperCase()).length

  const totalAmount = bills.reduce((sum, bill) => sum + bill.amount, 0)
  const paidAmount = bills
    .filter(bill => bill.status === 'PAID')
    .reduce((sum, bill) => sum + bill.amount, 0)
  const unpaidAmount = bills
    .filter(bill => bill.status === 'UNPAID')
    .reduce((sum, bill) => sum + bill.amount, 0)
  const selectedBill = bills.find(bill => bill.id === selectedBillId)

  const categorySummary = Object.keys(categoryColors).map(categoryName => {
    const categoryBills = bills.filter(bill => bill.category === categoryName)
    return {
      name: categoryName,
      color: categoryColors[categoryName],
      amount: categoryBills.reduce((sum, bill) => sum + bill.amount, 0),
      count: categoryBills.length,
    }
  })

  let donutCursor = 0
  const donutGradient = totalAmount
    ? categorySummary
        .filter(item => item.amount > 0)
        .map(item => {
          const start = donutCursor
          const end = donutCursor + (item.amount / totalAmount) * 100
          donutCursor = end
          return `${item.color} ${start}% ${end}%`
        })
        .join(', ')
    : '#f3f4f6 0% 100%'

  if (showCreate) {
    return (
      <div style={{ fontFamily: font }}>
        <div
          onClick={() => setShowCreate(false)}
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
          Create Bill or Expense
        </div>

        <div
          style={{
            fontSize: '13px',
            color: '#9ca3af',
            marginBottom: '28px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          <span style={{ color: '#6c63ff', fontWeight: 500 }}>Financials</span>
          <span>•</span>
          <span style={{ color: '#6c63ff', fontWeight: 500 }}>Bills and Expenses</span>
          <span>•</span>
          <span>New</span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: '32px' }}>
          <div>
            <div style={{ fontSize: '15px', fontWeight: 600, color: '#111827', marginBottom: '6px' }}>
              Basic Details
            </div>
            <div style={{ fontSize: '13px', color: '#6b7280', lineHeight: 1.6 }}>
              Add the bill name, type, vendor, and project or expense association.
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
            <input
              placeholder="Name"
              value={name}
              onChange={event => setName(event.target.value)}
              style={{
                width: '100%',
                padding: '10px 14px',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                outline: 'none',
                fontSize: '13px',
                color: '#374151',
              }}
            />

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              <div>
                <div style={{ fontSize: '12px', color: '#6b7280', fontWeight: 500, marginBottom: '6px' }}>
                  Type
                </div>
                <select
                  value={type}
                  onChange={event => setType(event.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    outline: 'none',
                    background: '#fff',
                    fontSize: '13px',
                    color: '#374151',
                  }}
                >
                  <option>Bill</option>
                  <option>Expense</option>
                </select>
              </div>

              <div>
                <div style={{ fontSize: '12px', color: '#6b7280', fontWeight: 500, marginBottom: '6px' }}>
                  Vendor
                </div>
                <input
                  placeholder="Vendor name"
                  value={vendor}
                  onChange={event => setVendor(event.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    outline: 'none',
                    fontSize: '13px',
                    color: '#374151',
                  }}
                />
              </div>
            </div>

            <input
              placeholder="Associated with"
              value={associated}
              onChange={event => setAssociated(event.target.value)}
              style={{
                width: '100%',
                padding: '10px 14px',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                outline: 'none',
                fontSize: '13px',
                color: '#374151',
              }}
            />
          </div>

          <div>
            <div style={{ fontSize: '15px', fontWeight: 600, color: '#111827', marginBottom: '6px' }}>
              Amount and Status
            </div>
            <div style={{ fontSize: '13px', color: '#6b7280', lineHeight: 1.6 }}>
              Set the expense category, amount, date, and payment status.
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
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              <div>
                <div style={{ fontSize: '12px', color: '#6b7280', fontWeight: 500, marginBottom: '6px' }}>
                  Category
                </div>
                <select
                  value={category}
                  onChange={event => setCategory(event.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    outline: 'none',
                    background: '#fff',
                    fontSize: '13px',
                    color: '#374151',
                  }}
                >
                  <option>Material cost</option>
                  <option>Labor cost</option>
                  <option>Overhead profit</option>
                  <option>General expense</option>
                </select>
              </div>

              <div>
                <div style={{ fontSize: '12px', color: '#6b7280', fontWeight: 500, marginBottom: '6px' }}>
                  Amount
                </div>
                <input
                  type="number"
                  min="0"
                  value={amount}
                  onChange={event => setAmount(Number(event.target.value))}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    outline: 'none',
                    fontSize: '13px',
                    color: '#374151',
                  }}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              <div>
                <div style={{ fontSize: '12px', color: '#6b7280', fontWeight: 500, marginBottom: '6px' }}>
                  Status
                </div>
                <select
                  value={status}
                  onChange={event => setStatus(event.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    outline: 'none',
                    background: '#fff',
                    fontSize: '13px',
                    color: '#374151',
                  }}
                >
                  <option>Unpaid</option>
                  <option>Paid</option>
                </select>
              </div>

              <div>
                <div style={{ fontSize: '12px', color: '#6b7280', fontWeight: 500, marginBottom: '6px' }}>
                  Date
                </div>
                <input
                  type="date"
                  value={date}
                  onChange={event => setDate(event.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    outline: 'none',
                    fontSize: '13px',
                    color: '#374151',
                  }}
                />
              </div>
            </div>

            <textarea
              placeholder="Notes"
              value={notes}
              onChange={event => setNotes(event.target.value)}
              rows={4}
              style={{
                width: '100%',
                padding: '10px 14px',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                outline: 'none',
                resize: 'vertical',
                fontSize: '13px',
                color: '#374151',
              }}
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
            onClick={handleCreate}
            style={{
              padding: '12px 28px',
              background: '#111827',
              color: '#fff',
              border: 'none',
              borderRadius: '10px',
              fontSize: '14px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Create Bill / Expense
          </button>
        </div>
      </div>
    )
  }

  if (selectedBill) {
    return (
      <div style={{ fontFamily: font }}>
        <button onClick={() => setSelectedBillId(null)} style={{ border: 'none', background: 'transparent', color: '#111827', fontSize: '14px', fontWeight: 600, cursor: 'pointer', marginBottom: '42px', padding: 0 }}>
          ‹ Back
        </button>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px', marginBottom: '44px', flexWrap: 'wrap' }}>
          <div style={{ fontSize: '13px', color: '#94a3b8', display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{ color: '#111827', fontWeight: 600 }}>Financials</span>
            <span>•</span>
            <span style={{ color: '#111827', fontWeight: 600 }}>Bills and Expenses</span>
            <span>•</span>
            <span style={{ color: '#111827', fontWeight: 600 }}>{selectedBill.name}</span>
            <span>•</span>
            <span>Details</span>
          </div>
          <button onClick={() => startEdit(selectedBill)} style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '11px 18px', background: '#111827', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: 600, cursor: 'pointer' }}>
            ✎ Edit details
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(360px, 1.1fr) minmax(280px, 0.72fr)', gap: '56px', alignItems: 'start' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', marginBottom: '14px' }}>
              <div>
                <div style={{ fontSize: '22px', color: '#111827', fontWeight: 600, marginBottom: '14px' }}>{selectedBill.name}</div>
                <div style={{ fontSize: '13px', color: '#111827', fontWeight: 600 }}>{selectedBill.type}</div>
              </div>
              <span style={{ fontSize: '12px', fontWeight: 600, padding: '7px 10px', borderRadius: '6px', background: statusStyle[selectedBill.status]?.bg || '#f3f4f6', color: statusStyle[selectedBill.status]?.color || '#374151' }}>
                {selectedBill.status === 'PAID' ? 'Paid' : 'Unpaid'}
              </span>
            </div>

            <div style={{ height: '1px', borderTop: '1px dashed #e5e7eb', margin: '34px 0' }} />

            <div style={{ display: 'grid', gap: '28px' }}>
              {[
                ['Date created', formatDate(selectedBill.date)],
                ['Vendor', selectedBill.vendor],
                ['Associated with', selectedBill.associated],
                ['Tags', selectedBill.category],
              ].map(([label, value]) => (
                <div key={label} style={{ display: 'grid', gridTemplateColumns: '210px minmax(0, 1fr)', gap: '18px', alignItems: 'center' }}>
                  <div style={{ fontSize: '16px', color: '#111827', fontWeight: 600 }}>{label}</div>
                  <div style={{ textAlign: 'right', fontSize: '14px', color: '#111827', fontWeight: 600, wordBreak: 'break-word' }}>{value || '-'}</div>
                </div>
              ))}
              <div style={{ display: 'grid', gridTemplateColumns: '210px minmax(0, 1fr)', gap: '18px', alignItems: 'center' }}>
                <div style={{ fontSize: '16px', color: '#111827', fontWeight: 600 }}>Amount</div>
                <div style={{ textAlign: 'right', fontSize: '17px', color: '#111827', fontWeight: 600 }}>{formatCurrency(selectedBill.amount)}</div>
              </div>
            </div>

            <div style={{ width: 'min(390px, 100%)', background: '#fff', border: '1px solid #e5e7eb', borderRadius: '16px', padding: '24px', marginTop: '30px', boxShadow: '0 18px 45px rgba(15,23,42,0.04)' }}>
              <div style={{ fontSize: '18px', color: '#111827', fontWeight: 600, marginBottom: '28px' }}>Activity logs</div>
              <div style={{ display: 'grid', gridTemplateColumns: '12px minmax(0, 1fr)', gap: '14px' }}>
                <span style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#22c55e', marginTop: '4px' }} />
                <div>
                  <div style={{ fontSize: '14px', color: '#111827', fontWeight: 600, lineHeight: 1.55 }}>
                    Local User added a new expense costing {formatCurrency(selectedBill.amount)} for {selectedBill.associated}
                  </div>
                  <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '7px', fontWeight: 600 }}>{formatDate(selectedBill.date)}</div>
                </div>
              </div>
              <button style={{ border: 'none', background: 'transparent', color: '#111827', cursor: 'pointer', fontSize: '13px', fontWeight: 600, marginTop: '22px', padding: 0 }}>⌄ See more</button>
            </div>
          </div>

          <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '18px', minHeight: '350px', display: 'grid', placeItems: 'center', textAlign: 'center', boxShadow: '0 18px 45px rgba(15,23,42,0.04)', padding: '28px' }}>
            <div>
              <div style={{ width: '190px', height: '130px', borderRadius: '24px', background: 'linear-gradient(135deg, #e5e7eb, #f8fafc)', margin: '0 auto 34px', display: 'grid', placeItems: 'center', color: '#cbd5e1', fontSize: '54px' }}>▧</div>
              <div style={{ fontSize: '14px', color: '#334155', fontWeight: 600 }}>This item doesn’t have a photo yet.</div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ fontFamily: font }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
        <div style={{ fontSize: '24px', fontWeight: 600, color: '#111827' }}>Bills and Expenses</div>
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
          + Bill and expense
        </button>
      </div>

      <div
        style={{
          fontSize: '13px',
          color: '#9ca3af',
          marginBottom: '16px',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
        }}
      >
        <span style={{ color: '#6c63ff', fontWeight: 500 }}>Financials</span>
        <span>•</span>
        <span style={{ color: '#6c63ff', fontWeight: 500 }}>Bills and Expenses</span>
        <span>•</span>
        <span>List</span>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '16px' }}>
        <div
          style={{
            fontSize: '13px',
            color: '#374151',
            fontWeight: 600,
            background: '#fff',
            border: '1px solid #e5e7eb',
            padding: '8px 16px',
            borderRadius: '20px',
            cursor: 'pointer',
          }}
        >
          📅 May 06, 2026 ▾
        </div>
      </div>

      <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '16px', overflow: 'hidden' }}>
        <div style={{ display: 'flex', borderBottom: '1.5px solid #f3f4f6', padding: '0 24px' }}>
          {tabs.map(tab => (
            <div
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '14px 16px',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: activeTab === tab ? 700 : 500,
                color: activeTab === tab ? '#111827' : '#6b7280',
                borderBottom: activeTab === tab ? '2px solid #111827' : '2px solid transparent',
                marginBottom: '-1.5px',
              }}
            >
              {tab}
              <span
                style={{
                  fontSize: '11px',
                  padding: '1px 7px',
                  borderRadius: '20px',
                  background: activeTab === tab ? '#111827' : '#f3f4f6',
                  color: activeTab === tab ? '#fff' : '#6b7280',
                  fontWeight: 600,
                }}
              >
                {tabCounts(tab)}
              </span>
            </div>
          ))}
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '16px 24px',
            borderBottom: '1px solid #f3f4f6',
          }}
        >
          <div
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 14px',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              background: '#fafafa',
            }}
          >
            <span style={{ color: '#9ca3af' }}>🔍</span>
            <input
              type="text"
              placeholder="Search..."
              value={search}
              onChange={event => setSearch(event.target.value)}
              style={{
                border: 'none',
                background: 'transparent',
                fontSize: '13px',
                color: '#374151',
                outline: 'none',
                flex: 1,
              }}
            />
          </div>

          <div
            onClick={() => setShowSummary(!showSummary)}
            style={{
              padding: '8px 14px',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              background: '#fafafa',
              cursor: 'pointer',
              fontSize: '13px',
              color: '#374151',
              fontWeight: 500,
            }}
          >
            {showSummary ? 'Hide' : 'Show'} Summary
          </div>
        </div>

        {showSummary && (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr 1.5fr',
              borderBottom: '1px solid #f3f4f6',
            }}
          >
            <div style={{ padding: '24px', borderRight: '1px solid #f3f4f6' }}>
              <div style={{ fontSize: '13px', color: '#6b7280', fontWeight: 500, marginBottom: '8px' }}>
                Bills and Expenses
              </div>
              <div style={{ fontSize: '26px', fontWeight: 600, color: '#111827', marginBottom: '4px' }}>
                {formatCurrency(totalAmount)}
              </div>
              <div style={{ fontSize: '12px', color: '#f59e0b', fontWeight: 500 }}>
                {bills.length} record{bills.length === 1 ? '' : 's'} total
              </div>
            </div>

            <div style={{ padding: '24px', borderRight: '1px solid #f3f4f6' }}>
              <div style={{ fontSize: '13px', color: '#6b7280', fontWeight: 500, marginBottom: '8px' }}>
                Payment Status
              </div>
              <div style={{ fontSize: '20px', fontWeight: 600, color: '#111827', marginBottom: '6px' }}>
                {formatCurrency(paidAmount)}
              </div>
              <div style={{ fontSize: '12px', color: '#10b981', fontWeight: 600 }}>
                Paid
              </div>
              <div style={{ fontSize: '20px', fontWeight: 600, color: '#111827', margin: '14px 0 6px' }}>
                {formatCurrency(unpaidAmount)}
              </div>
              <div style={{ fontSize: '12px', color: '#f59e0b', fontWeight: 600 }}>
                Unpaid
              </div>
            </div>

            <div style={{ padding: '24px', display: 'flex', alignItems: 'center', gap: '24px' }}>
              <div
                style={{
                  width: '120px',
                  height: '120px',
                  borderRadius: '50%',
                  background: `conic-gradient(${donutGradient})`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <div
                  style={{
                    width: '70px',
                    height: '70px',
                    borderRadius: '50%',
                    background: '#fff',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <div style={{ fontSize: '9px', color: '#6b7280', fontWeight: 600 }}>TOTAL</div>
                  <div style={{ fontSize: '11px', fontWeight: 600, color: '#111827' }}>
                    {totalAmount ? `₱${(totalAmount / 1000000).toFixed(2)}M` : '₱0'}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {categorySummary.map(item => (
                  <div key={item.name} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span
                      style={{
                        width: '10px',
                        height: '10px',
                        borderRadius: '50%',
                        background: item.color,
                        display: 'inline-block',
                        flexShrink: 0,
                      }}
                    />
                    <div>
                      <div style={{ fontSize: '12px', color: '#374151', fontWeight: 600 }}>
                        {item.name} ({item.count})
                      </div>
                      <div style={{ fontSize: '12px', color: '#111827', fontWeight: 600 }}>
                        {formatCurrency(item.amount)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {filtered.length === 0 ? (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '60px',
              gap: '12px',
            }}
          >
            <div style={{ fontSize: '40px', opacity: 0.2 }}>🧾</div>
            <div style={{ fontSize: '14px', fontWeight: 600, color: '#9ca3af' }}>
              No bills or expenses yet - click + Bill and expense to create one
            </div>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#fafafa' }}>
                  <th style={{ padding: '12px 24px', width: '40px', textAlign: 'left' }}>
                    <input type="checkbox" />
                  </th>
                  {['Name', 'Associated with', 'Vendor', 'Tags', 'Amount', 'Status', 'Date', ''].map(header => (
                    <th
                      key={header}
                      style={{
                        padding: '12px 16px',
                        textAlign: 'left',
                        fontSize: '12px',
                        fontWeight: 600,
                        color: '#6b7280',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                      }}
                    >
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((item, index) => (
                  <tr
                    key={item.id}
                    onClick={() => setSelectedBillId(item.id)}
                    style={{
                      borderTop: '1px solid #f3f4f6',
                      background: selected.includes(item.id) ? '#f5f4ff' : index % 2 === 0 ? '#fff' : '#fafafa',
                      cursor: 'pointer',
                    }}
                  >
                    <td style={{ padding: '16px 24px' }}>
                      <input
                        type="checkbox"
                        checked={selected.includes(item.id)}
                        onClick={event => event.stopPropagation()}
                        onChange={() => toggleSelect(item.id)}
                      />
                    </td>
                    <td style={{ padding: '16px' }}>
                      <button onClick={event => { event.stopPropagation(); setSelectedBillId(item.id) }} style={{ display: 'block', width: '100%', border: 'none', background: 'transparent', padding: 0, fontSize: '13px', fontWeight: 600, color: '#111827', cursor: 'pointer', textAlign: 'left', lineHeight: 1.35 }}>{item.name}</button>
                      <div style={{ fontSize: '12px', color: '#6b7280' }}>{item.type}</div>
                    </td>
                    <td style={{ padding: '16px' }}>
                      <div style={{ fontSize: '13px', fontWeight: 500, color: '#374151' }}>{item.associated}</div>
                      <div style={{ fontSize: '12px', color: '#9ca3af' }}>{item.category}</div>
                    </td>
                    <td style={{ padding: '16px', fontSize: '13px', color: '#6b7280' }}>{item.vendor}</td>
                    <td style={{ padding: '16px', fontSize: '13px', color: '#6b7280' }}>{item.category}</td>
                    <td style={{ padding: '16px', fontSize: '13px', fontWeight: 600, color: '#111827' }}>
                      {formatCurrency(item.amount)}
                    </td>
                    <td style={{ padding: '16px' }}>
                      <span
                        style={{
                          fontSize: '11px',
                          fontWeight: 600,
                          padding: '4px 10px',
                          borderRadius: '20px',
                          background: statusStyle[item.status]?.bg,
                          color: statusStyle[item.status]?.color,
                        }}
                      >
                        {item.status}
                      </span>
                    </td>
                    <td style={{ padding: '16px', fontSize: '13px', color: '#6b7280' }}>{item.date}</td>
                    <td style={{ padding: '16px', color: '#9ca3af', cursor: 'pointer', fontSize: '18px' }}>⋮</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            alignItems: 'center',
            gap: '16px',
            padding: '16px 24px',
            borderTop: '1px solid #f3f4f6',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#374151' }}>
            Rows per page:
            <select
              style={{
                fontSize: '13px',
                border: '1px solid #e5e7eb',
                borderRadius: '6px',
                padding: '4px 8px',
                color: '#374151',
              }}
            >
              <option>50</option>
              <option>25</option>
              <option>100</option>
            </select>
          </div>
          <div style={{ fontSize: '13px', color: '#374151', fontWeight: 500 }}>
            {filtered.length === 0 ? '0-0' : `1-${filtered.length}`} of {filtered.length}
          </div>
          <div style={{ display: 'flex', gap: '4px' }}>
            <button
              style={{
                padding: '6px 10px',
                border: '1px solid #e5e7eb',
                borderRadius: '6px',
                background: '#fafafa',
                cursor: 'pointer',
                color: '#9ca3af',
              }}
            >
              ‹
            </button>
            <button
              style={{
                padding: '6px 10px',
                border: '1px solid #e5e7eb',
                borderRadius: '6px',
                background: '#fafafa',
                cursor: 'pointer',
                color: '#9ca3af',
              }}
            >
              ›
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
