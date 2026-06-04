'use client'
import { useEffect, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { listBusinessRecords, replaceBusinessCollection } from '@/lib/business/client'

const font = "var(--font-body)"

interface Item {
  id: number
  name: string
  unit: string
  qty: number
  cost: number
}

interface Invoice {
  id: number
  invoiceNo: string
  recipient: string
  dateCreated: string
  dueDate: string
  total: number
  status: string
  notes: string
}

const statusStyle: Record<string, { bg: string; color: string }> = {
  DRAFT: { bg: '#f3f4f6', color: '#374151' },
  SENT: { bg: '#dbeafe', color: '#2563eb' },
  PAID: { bg: '#d1fae5', color: '#059669' },
  OVERDUE: { bg: '#fee2e2', color: '#dc2626' },
}

// An issued, unpaid invoice past its due date is overdue — even if it is still
// stored as "SENT". Drafts/paid/cancelled invoices are never overdue.
function isInvoiceOverdue(inv: Invoice) {
  if (inv.status === 'PAID' || inv.status === 'DRAFT' || inv.status === 'CANCELLED') return false
  if (!inv.dueDate || inv.dueDate === '-') return false
  const due = new Date(`${inv.dueDate}T00:00:00`)
  if (Number.isNaN(due.getTime())) return false
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return due.getTime() < today.getTime()
}

// The status shown to the user: derived OVERDUE wins over the stored status.
function invoiceDisplayStatus(inv: Invoice) {
  return isInvoiceOverdue(inv) ? 'OVERDUE' : inv.status
}

const tabs = ['All', 'Draft', 'Sent', 'Paid', 'Overdue']

export default function InvoicesPage() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const createRequested = searchParams.get('new') === '1'
  const [showCreate, setShowCreate] = useState(false)
  const closeCreate = () => {
    setShowCreate(false)
    if (createRequested) router.replace(pathname)
  }
  const [activeTab, setActiveTab] = useState('All')
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<number[]>([])
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loaded, setLoaded] = useState(false)
  const [status, setStatus] = useState('Draft')
  const [recipient, setRecipient] = useState('')
  const [dateCreated, setDateCreated] = useState('2026-05-06')
  const [dueDate, setDueDate] = useState('')
  const [notes, setNotes] = useState('')
  const [items, setItems] = useState<Item[]>([
    { id: 1, name: '', unit: 'each', qty: 0, cost: 0 },
  ])

  useEffect(() => {
    // Only mark as loaded on a SUCCESSFUL fetch. If the GET fails we must not
    // flip `loaded`, otherwise the persist effect below would immediately
    // replace the server collection with the empty initial state and wipe it.
    listBusinessRecords<Invoice>('accounting-invoices')
      .then(rows => { setInvoices(rows); setLoaded(true) })
      .catch(() => undefined)
  }, [])

  useEffect(() => {
    if (!loaded) return
    void replaceBusinessCollection('accounting-invoices', invoices).catch(() => undefined)
  }, [invoices, loaded])


  const addItem = () =>
    setItems(prev => [
      ...prev,
      { id: Math.max(0, ...prev.map(i => i.id)) + 1, name: '', unit: 'each', qty: 0, cost: 0 },
    ])

  const removeItem = (id: number) =>
    setItems(prev => prev.filter(i => i.id !== id))

  const updateItem = (id: number, field: Exclude<keyof Item, 'id'>, value: string | number) =>
    setItems(prev =>
      prev.map(i => (i.id === id ? { ...i, [field]: value } : i))
    )

  const total = items.reduce((sum, item) => sum + item.qty * item.cost, 0)

  const toggleSelect = (id: number) =>
    setSelected(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    )

  const handleCreate = () => {
    // Collision-proof id derived from the max existing id, not array length —
    // length+1 reuses an id (and invoice number) after any delete.
    const nextId = Math.max(0, ...invoices.map(i => i.id)) + 1
    const newInvoice: Invoice = {
      id: nextId,
      invoiceNo: `INV# ${String(nextId).padStart(5, '0')}`,
      recipient: recipient || 'No recipient',
      dateCreated,
      dueDate: dueDate || '-',
      total,
      status: status.toUpperCase(),
      notes,
    }

    setInvoices(prev => [...prev, newInvoice])
    closeCreate()
    setStatus('Draft')
    setRecipient('')
    setDateCreated('2026-05-06')
    setDueDate('')
    setNotes('')
    setItems([{ id: 1, name: '', unit: 'each', qty: 0, cost: 0 }])
  }

  const filtered = invoices.filter(inv => {
    const matchTab = activeTab === 'All' || invoiceDisplayStatus(inv) === activeTab.toUpperCase()
    const matchSearch =
      inv.invoiceNo.toLowerCase().includes(search.toLowerCase()) ||
      inv.recipient.toLowerCase().includes(search.toLowerCase())

    return matchTab && matchSearch
  })

  const tabCounts = (tab: string) =>
    tab === 'All'
      ? invoices.length
      : invoices.filter(i => invoiceDisplayStatus(i) === tab.toUpperCase()).length

  const totalAmount = invoices.reduce((sum, inv) => sum + inv.total, 0)

  const paidAmount = invoices
    .filter(inv => inv.status === 'PAID')
    .reduce((sum, inv) => sum + inv.total, 0)

  const statusSummary = ['DRAFT', 'SENT', 'PAID', 'OVERDUE'].map(statusName => {
    const statusInvoices = invoices.filter(inv => invoiceDisplayStatus(inv) === statusName)

    return {
      label: statusName.charAt(0) + statusName.slice(1).toLowerCase(),
      count: statusInvoices.length,
      amount: statusInvoices.reduce((sum, inv) => sum + inv.total, 0),
      color: statusStyle[statusName].color,
    }
  })

  const donutTotal = totalAmount || invoices.length
  let donutCursor = 0

  const donutGradient = donutTotal
    ? statusSummary
        .filter(item => (totalAmount ? item.amount > 0 : item.count > 0))
        .map(item => {
          const value = totalAmount ? item.amount : item.count
          const start = donutCursor
          const end = donutCursor + (value / donutTotal) * 100
          donutCursor = end
          return `${item.color} ${start}% ${end}%`
        })
        .join(', ')
    : '#f3f4f6 0% 100%'

  if (showCreate || createRequested) {
    return (
      <div style={{ fontFamily: font }}>
        <div
          onClick={closeCreate}
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
          ? Back
        </div>

        <div
          style={{
            fontSize: '24px',
            fontWeight: 600,
            color: '#111827',
            marginBottom: '6px',
          }}
        >
          Create Invoice
        </div>

        <div
          style={{
            fontSize: '13px',
            color: '#000000',
            marginBottom: '32px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          <span style={{ color: '#6c63ff', fontWeight: 500 }}>Financials</span>
          <span>•</span>
          <span style={{ color: '#6c63ff', fontWeight: 500 }}>Invoices</span>
          <span>•</span>
          <span>New</span>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '20px' }}>
          <div>
            <div
              style={{
                fontSize: '12px',
                color: '#000000',
                fontWeight: 500,
                marginBottom: '6px',
              }}
            >
              Status
            </div>

            <select
              value={status}
              onChange={e => setStatus(e.target.value)}
              style={{
                padding: '9px 14px',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                fontFamily: font,
                fontSize: '13px',
                color: '#374151',
                outline: 'none',
                background: '#fff',
                minWidth: '160px',
              }}
            >
              <option>Draft</option>
              <option>Sent</option>
              <option>Paid</option>
              <option>Overdue</option>
            </select>
          </div>
        </div>

        <div
          style={{
            background: '#fff',
            border: '1px solid #e5e7eb',
            borderRadius: '16px',
            overflow: 'hidden',
            marginBottom: '20px',
          }}
        >
          <div
            style={{
              background: '#f9fafb',
              padding: '40px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              borderBottom: '1px solid #e5e7eb',
              gap: '12px',
            }}
          >
            <div
              style={{
                width: '48px',
                height: '48px',
                borderRadius: '50%',
                background: '#e5e7eb',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '20px',
              }}
            >
              ??
            </div>

            <input
              placeholder="Recipient name"
              value={recipient}
              onChange={e => setRecipient(e.target.value)}
              style={{
                padding: '8px 20px',
                background: '#fff',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                fontFamily: font,
                fontSize: '13px',
                fontWeight: 500,
                color: '#374151',
                outline: 'none',
                textAlign: 'center',
              }}
            />
          </div>

          <div style={{ padding: '24px', borderBottom: '1px solid #e5e7eb' }}>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr 1fr',
                gap: '16px',
              }}
            >
              <input
                defaultValue={`INV# ${String(invoices.length + 1).padStart(5, '0')}`}
                style={{
                  padding: '10px 14px',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  fontFamily: font,
                  fontSize: '13px',
                  color: '#374151',
                  outline: 'none',
                }}
              />

              <div>
                <div style={{ fontSize: '11px', color: '#000000', fontWeight: 500, marginBottom: '4px' }}>
                  Date created
                </div>
                <input
                  type="date"
                  value={dateCreated}
                  onChange={e => setDateCreated(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    fontFamily: font,
                    fontSize: '13px',
                    color: '#374151',
                    outline: 'none',
                  }}
                />
              </div>

              <div>
                <div style={{ fontSize: '11px', color: '#000000', fontWeight: 500, marginBottom: '4px' }}>
                  Due date
                </div>
                <input
                  type="date"
                  value={dueDate}
                  onChange={e => setDueDate(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    fontFamily: font,
                    fontSize: '13px',
                    color: '#374151',
                    outline: 'none',
                  }}
                />
              </div>
            </div>
          </div>

          <div style={{ padding: '24px', borderBottom: '1px solid #e5e7eb' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f9fafb' }}>
                  {['Item name', 'Unit', 'Qty', 'Cost', 'Total Price', ''].map(h => (
                    <th
                      key={h}
                      style={{
                        padding: '10px 12px',
                        textAlign: 'left',
                        fontSize: '12px',
                        fontWeight: 600,
                        color: '#000000',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {items.map(item => (
                  <tr key={item.id} style={{ borderTop: '1px solid #f3f4f6' }}>
                    <td style={{ padding: '10px 12px' }}>
                      <input
                        value={item.name}
                        onChange={e => updateItem(item.id, 'name', e.target.value)}
                        style={{
                          width: '100%',
                          padding: '8px 10px',
                          border: '1px solid #e5e7eb',
                          borderRadius: '6px',
                          fontFamily: font,
                          fontSize: '13px',
                          color: '#374151',
                          outline: 'none',
                        }}
                      />
                    </td>

                    <td style={{ padding: '10px 12px' }}>
                      <input
                        value={item.unit}
                        onChange={e => updateItem(item.id, 'unit', e.target.value)}
                        style={{
                          width: '80px',
                          padding: '8px 10px',
                          border: '1px solid #e5e7eb',
                          borderRadius: '6px',
                          fontFamily: font,
                          fontSize: '13px',
                          color: '#374151',
                          outline: 'none',
                        }}
                      />
                    </td>

                    <td style={{ padding: '10px 12px' }}>
                      <input
                        type="number"
                        value={item.qty}
                        onChange={e => updateItem(item.id, 'qty', Number(e.target.value))}
                        style={{
                          width: '80px',
                          padding: '8px 10px',
                          border: '1px solid #e5e7eb',
                          borderRadius: '6px',
                          fontFamily: font,
                          fontSize: '13px',
                          color: '#374151',
                          outline: 'none',
                        }}
                      />
                    </td>

                    <td style={{ padding: '10px 12px' }}>
                      <input
                        type="number"
                        value={item.cost}
                        onChange={e => updateItem(item.id, 'cost', Number(e.target.value))}
                        style={{
                          width: '100px',
                          padding: '8px 10px',
                          border: '1px solid #e5e7eb',
                          borderRadius: '6px',
                          fontFamily: font,
                          fontSize: '13px',
                          color: '#374151',
                          outline: 'none',
                        }}
                      />
                    </td>

                    <td
                      style={{
                        padding: '10px 12px',
                        fontSize: '13px',
                        fontWeight: 600,
                        color: '#111827',
                      }}
                    >
                      PHP {(item.qty * item.cost).toLocaleString('en-PH')}
                    </td>

                    <td style={{ padding: '10px 12px' }}>
                      {items.length > 1 && (
                        <button
                          onClick={() => removeItem(item.id)}
                          style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            color: '#ef4444',
                            fontSize: '16px',
                          }}
                        >
                          ?
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div
              onClick={addItem}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                marginTop: '16px',
                fontSize: '13px',
                color: '#6c63ff',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              + Item
            </div>

            <div
              style={{
                display: 'flex',
                justifyContent: 'flex-end',
                marginTop: '16px',
                paddingTop: '16px',
                borderTop: '1px solid #f3f4f6',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  gap: '40px',
                  fontSize: '15px',
                  fontWeight: 600,
                  color: '#111827',
                }}
              >
                <span>Total</span>
                <span>PHP {total.toLocaleString('en-PH')}.00</span>
              </div>
            </div>
          </div>

          <div style={{ padding: '24px' }}>
            <div
              style={{
                fontSize: '13px',
                fontWeight: 600,
                color: '#374151',
                marginBottom: '10px',
              }}
            >
              Notes
            </div>

            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={4}
              style={{
                width: '100%',
                padding: '12px 14px',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                fontFamily: font,
                fontSize: '13px',
                color: '#374151',
                outline: 'none',
                resize: 'vertical',
              }}
            />
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button
            onClick={handleCreate}
            style={{
              padding: '12px 28px',
              background: '#111827',
              color: '#fff',
              border: 'none',
              borderRadius: '10px',
              fontFamily: font,
              fontSize: '14px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Create Invoice
          </button>
        </div>
      </div>
    )
  }

  return (
    <div style={{ fontFamily: font }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '6px',
        }}
      >
        <div style={{ fontSize: '24px', fontWeight: 600, color: '#111827' }}>
          Invoices
        </div>

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
            fontFamily: font,
            fontSize: '14px',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          + Invoice
        </button>
      </div>

      <div
        style={{
          fontSize: '13px',
          color: '#000000',
          marginBottom: '16px',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
        }}
      >
        <span style={{ color: '#6c63ff', fontWeight: 500 }}>Financials</span>
        <span>•</span>
        <span>Invoices</span>
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
          ?? May 06, 2026 ?
        </div>
      </div>

      <div
        style={{
          background: '#fff',
          border: '1px solid #e5e7eb',
          borderRadius: '16px',
          overflow: 'hidden',
        }}
      >
        {/* Tabs */}
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
                color: activeTab === tab ? '#111827' : '#000000',
                borderBottom:
                  activeTab === tab ? '2px solid #111827' : '2px solid transparent',
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
                  color: activeTab === tab ? '#fff' : '#000000',
                  fontWeight: 600,
                }}
              >
                {tabCounts(tab)}
              </span>
            </div>
          ))}
        </div>

        {/* Summary */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr 1.2fr',
            borderBottom: '1px solid #f3f4f6',
            minHeight: '140px',
          }}
        >
          <div style={{ padding: '24px', borderRight: '1px solid #f3f4f6' }}>
            <div style={{ fontSize: '13px', color: '#000000', fontWeight: 500, marginBottom: '8px' }}>
              Total Invoices
            </div>
            <div style={{ fontSize: '26px', fontWeight: 600, color: '#111827', marginBottom: '6px' }}>
              PHP {totalAmount.toLocaleString('en-PH')}.00
            </div>
            <div style={{ fontSize: '12px', color: '#f59e0b', fontWeight: 600 }}>
              {invoices.length} invoices total
            </div>
          </div>

          <div style={{ padding: '24px', borderRight: '1px solid #f3f4f6' }}>
            <div style={{ fontSize: '13px', color: '#000000', fontWeight: 500, marginBottom: '8px' }}>
              Paid Invoices
            </div>
            <div style={{ fontSize: '26px', fontWeight: 600, color: '#111827', marginBottom: '6px' }}>
              PHP {paidAmount.toLocaleString('en-PH')}.00
            </div>
            <div style={{ fontSize: '12px', color: '#10b981', fontWeight: 600 }}>
              {tabCounts('Paid')} paid
            </div>
          </div>

          <div
            style={{
              padding: '24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '42px',
            }}
          >
            <div
              style={{
                width: '92px',
                height: '92px',
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
                  width: '56px',
                  height: '56px',
                  borderRadius: '50%',
                  background: '#fff',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <div style={{ fontSize: '9px', fontWeight: 600, color: '#000000' }}>
                  TOTAL
                </div>
                <div style={{ fontSize: '10px', fontWeight: 600, color: '#111827' }}>
                  PHP {totalAmount.toLocaleString('en-PH')}
                </div>
              </div>
            </div>

            <div style={{ display: 'grid', gap: '8px' }}>
              {statusSummary.map(item => (
                <div key={item.label} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                  <span
                    style={{
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      background: item.color,
                      marginTop: '5px',
                      flexShrink: 0,
                    }}
                  />
                  <div>
                    <div style={{ fontSize: '12px', fontWeight: 600, color: '#374151' }}>
                      {item.label} ({item.count})
                    </div>
                    <div style={{ fontSize: '12px', fontWeight: 600, color: '#111827' }}>
                      PHP {item.amount.toLocaleString('en-PH')}.00
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Filter Bar */}
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
            <span style={{ color: '#000000' }}>??</span>
            <input
              type="text"
              placeholder="Search..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{
                border: 'none',
                background: 'transparent',
                fontFamily: font,
                fontSize: '13px',
                color: '#374151',
                outline: 'none',
                flex: 1,
              }}
            />
          </div>

          <div
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
            ? Columns
          </div>

          <div
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
            ? Filters
          </div>

          <div
            style={{
              padding: '8px 12px',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              background: '#fafafa',
              cursor: 'pointer',
              color: '#000000',
            }}
          >
            ?
          </div>
        </div>

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
            <div style={{ fontSize: '40px', opacity: 0.2 }}>??</div>
            <div style={{ fontSize: '14px', fontWeight: 600, color: '#000000' }}>
              No invoices yet — click + Invoice to create one
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
                  {['Invoice No', 'Recipient', 'Date Created', 'Due Date', 'Total', 'Status', ''].map(h => (
                    <th
                      key={h}
                      style={{
                        padding: '12px 16px',
                        textAlign: 'left',
                        fontSize: '12px',
                        fontWeight: 600,
                        color: '#000000',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {filtered.map((inv, idx) => (
                  <tr
                    key={inv.id}
                    style={{
                      borderTop: '1px solid #f3f4f6',
                      background: selected.includes(inv.id)
                        ? '#f5f4ff'
                        : idx % 2 === 0
                          ? '#fff'
                          : '#fafafa',
                    }}
                  >
                    <td style={{ padding: '16px 24px' }}>
                      <input
                        type="checkbox"
                        checked={selected.includes(inv.id)}
                        onChange={() => toggleSelect(inv.id)}
                      />
                    </td>
                    <td style={{ padding: '16px', fontSize: '13px', fontWeight: 600, color: '#111827' }}>
                      {inv.invoiceNo}
                    </td>
                    <td style={{ padding: '16px', fontSize: '13px', color: '#374151', fontWeight: 500 }}>
                      {inv.recipient}
                    </td>
                    <td style={{ padding: '16px', fontSize: '13px', color: '#000000' }}>
                      {inv.dateCreated}
                    </td>
                    <td style={{ padding: '16px', fontSize: '13px', color: '#000000' }}>
                      {inv.dueDate}
                    </td>
                    <td style={{ padding: '16px', fontSize: '13px', fontWeight: 600, color: '#111827' }}>
                      PHP {inv.total.toLocaleString('en-PH')}.00
                    </td>
                    <td style={{ padding: '16px' }}>
                      <span
                        style={{
                          fontSize: '11px',
                          fontWeight: 600,
                          padding: '4px 10px',
                          borderRadius: '20px',
                          background: statusStyle[invoiceDisplayStatus(inv)]?.bg,
                          color: statusStyle[invoiceDisplayStatus(inv)]?.color,
                        }}
                      >
                        {invoiceDisplayStatus(inv)}
                      </span>
                    </td>
                    <td style={{ padding: '16px', color: '#000000', cursor: 'pointer', fontSize: '18px' }}>
                      ?
                    </td>
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
                fontFamily: font,
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
            1–{filtered.length} of {filtered.length}
          </div>

          <div style={{ display: 'flex', gap: '4px' }}>
            <button
              style={{
                padding: '6px 10px',
                border: '1px solid #e5e7eb',
                borderRadius: '6px',
                background: '#fafafa',
                cursor: 'pointer',
                color: '#000000',
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
                color: '#000000',
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
