'use client'

import { useEffect, useMemo, useState } from 'react'

const font = "var(--font-body)"
const storageKey = 'flowsys-accounting-entries'

interface JournalLine {
  id: number
  account: string
  description: string
  debit: number
  credit: number
}

interface JournalEntry {
  id: number
  entryNo: string
  title: string
  reference: string
  date: string
  status: string
  notes: string
  lines: JournalLine[]
  totalDebit: number
  totalCredit: number
}

const statusStyle: Record<string, { bg: string; color: string }> = {
  DRAFT: { bg: '#f3f4f6', color: '#374151' },
  POSTED: { bg: '#d1fae5', color: '#059669' },
}

const accountOptions = [
  'Cash on Hand',
  'Accounts Receivable',
  'Materials Expense',
  'Labor Expense',
  'Equipment Expense',
  'Accounts Payable',
  'Sales Revenue',
  'Owner Equity',
]

const tabs = ['All', 'Draft', 'Posted']

const createDefaultLines = (): JournalLine[] => [
  { id: 1, account: 'Materials Expense', description: '', debit: 0, credit: 0 },
  { id: 2, account: 'Cash on Hand', description: '', debit: 0, credit: 0 },
]

const formatCurrency = (value: number) => `PHP ${value.toLocaleString('en-PH')}.00`

const loadEntries = () => {
  if (typeof window === 'undefined') return []

  try {
    const stored = window.localStorage.getItem(storageKey)
    return stored ? (JSON.parse(stored) as JournalEntry[]) : []
  } catch {
    return []
  }
}

export default function AccountingPage() {
  const [showCreate, setShowCreate] = useState(false)
  const [activeTab, setActiveTab] = useState('All')
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<number[]>([])
  const [openMenu, setOpenMenu] = useState<number | null>(null)
  const [viewingEntry, setViewingEntry] = useState<JournalEntry | null>(null)
  const [entries, setEntries] = useState<JournalEntry[]>(loadEntries)

  const [title, setTitle] = useState('')
  const [reference, setReference] = useState('')
  const [date, setDate] = useState('2026-05-06')
  const [status, setStatus] = useState('Draft')
  const [notes, setNotes] = useState('')
  const [lines, setLines] = useState<JournalLine[]>(createDefaultLines)

  useEffect(() => {
    window.localStorage.setItem(storageKey, JSON.stringify(entries))
  }, [entries])

  const totalDebit = lines.reduce((sum, line) => sum + line.debit, 0)
  const totalCredit = lines.reduce((sum, line) => sum + line.credit, 0)
  const difference = totalDebit - totalCredit
  const isBalanced = totalDebit > 0 && totalDebit === totalCredit

  const postedDebit = entries
    .filter(entry => entry.status === 'POSTED')
    .reduce((sum, entry) => sum + entry.totalDebit, 0)

  const postedCredit = entries
    .filter(entry => entry.status === 'POSTED')
    .reduce((sum, entry) => sum + entry.totalCredit, 0)

  const filtered = entries.filter(entry => {
    const matchTab = activeTab === 'All' || entry.status === activeTab.toUpperCase()
    const matchSearch =
      entry.entryNo.toLowerCase().includes(search.toLowerCase()) ||
      entry.title.toLowerCase().includes(search.toLowerCase()) ||
      entry.reference.toLowerCase().includes(search.toLowerCase())

    return matchTab && matchSearch
  })

  const accountSummary = useMemo(() => {
    const totals: Record<string, { debit: number; credit: number }> = {}

    entries.forEach(entry => {
      entry.lines.forEach(line => {
        totals[line.account] ??= { debit: 0, credit: 0 }
        totals[line.account].debit += line.debit
        totals[line.account].credit += line.credit
      })
    })

    return Object.entries(totals)
      .map(([account, total]) => ({ account, ...total }))
      .sort((a, b) => b.debit + b.credit - (a.debit + a.credit))
      .slice(0, 4)
  }, [entries])

  const tabCounts = (tab: string) =>
    tab === 'All'
      ? entries.length
      : entries.filter(entry => entry.status === tab.toUpperCase()).length

  const resetForm = () => {
    setTitle('')
    setReference('')
    setDate('2026-05-06')
    setStatus('Draft')
    setNotes('')
    setLines(createDefaultLines())
  }

  const addLine = () => {
    setLines(prev => [
      ...prev,
      { id: Math.max(...prev.map(line => line.id)) + 1, account: 'Cash on Hand', description: '', debit: 0, credit: 0 },
    ])
  }

  const removeLine = (id: number) => {
    setLines(prev => (prev.length > 2 ? prev.filter(line => line.id !== id) : prev))
  }

  const updateLine = (
    id: number,
    field: Exclude<keyof JournalLine, 'id'>,
    value: string | number
  ) => {
    setLines(prev =>
      prev.map(line => (line.id === id ? { ...line, [field]: value } : line))
    )
  }

  const toggleSelect = (id: number) => {
    setSelected(prev => (prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]))
  }

  const handleCreate = () => {
    if (!isBalanced) return

    const cleanLines = lines.map(line => ({
      ...line,
      description: line.description || '-',
    }))

    const newEntry: JournalEntry = {
      id: entries.reduce((maxId, entry) => Math.max(maxId, entry.id), 0) + 1,
      entryNo: `JE-${String(entries.length + 1).padStart(5, '0')}`,
      title: title || 'Untitled journal entry',
      reference: reference || '-',
      date,
      status: status.toUpperCase(),
      notes,
      lines: cleanLines,
      totalDebit,
      totalCredit,
    }

    setEntries(prev => [...prev, newEntry])
    setShowCreate(false)
    resetForm()
  }

  const toggleEntryStatus = (entryId: number) => {
    setEntries(prev =>
      prev.map(entry =>
        entry.id === entryId
          ? { ...entry, status: entry.status === 'POSTED' ? 'DRAFT' : 'POSTED' }
          : entry
      )
    )
    setOpenMenu(null)
  }

  const deleteEntry = (entryId: number) => {
    setEntries(prev => prev.filter(entry => entry.id !== entryId))
    setSelected(prev => prev.filter(id => id !== entryId))
    setViewingEntry(prev => (prev?.id === entryId ? null : prev))
    setOpenMenu(null)
  }

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
          ? Back
        </div>

        <div style={{ fontSize: '24px', fontWeight: 600, color: '#111827', marginBottom: '6px' }}>
          Create Journal Entry
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
          <span style={{ color: '#6c63ff', fontWeight: 500 }}>Accounting</span>
          <span>•</span>
          <span>New</span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: '32px' }}>
          <div>
            <div style={{ fontSize: '15px', fontWeight: 600, color: '#111827', marginBottom: '6px' }}>
              Entry Details
            </div>
            <div style={{ fontSize: '13px', color: '#6b7280', lineHeight: 1.6 }}>
              Record the document date, reference, and posting status.
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
              placeholder="Entry title"
              value={title}
              onChange={event => setTitle(event.target.value)}
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

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '14px' }}>
              <div>
                <div style={{ fontSize: '12px', color: '#6b7280', fontWeight: 500, marginBottom: '6px' }}>
                  Reference
                </div>
                <input
                  placeholder="OR / Invoice / Voucher"
                  value={reference}
                  onChange={event => setReference(event.target.value)}
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
                  <option>Draft</option>
                  <option>Posted</option>
                </select>
              </div>
            </div>
          </div>

          <div>
            <div style={{ fontSize: '15px', fontWeight: 600, color: '#111827', marginBottom: '6px' }}>
              Journal Lines
            </div>
            <div style={{ fontSize: '13px', color: '#6b7280', lineHeight: 1.6 }}>
              Debits and credits must match before saving.
            </div>
          </div>

          <div
            style={{
              background: '#fff',
              border: '1px solid #e5e7eb',
              borderRadius: '12px',
              padding: '20px',
            }}
          >
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', minWidth: '760px', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#f9fafb' }}>
                    {['Account', 'Description', 'Debit', 'Credit', ''].map(header => (
                      <th
                        key={header}
                        style={{
                          padding: '10px 12px',
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
                  {lines.map(line => (
                    <tr key={line.id} style={{ borderTop: '1px solid #f3f4f6' }}>
                      <td style={{ padding: '10px 12px' }}>
                        <select
                          value={line.account}
                          onChange={event => updateLine(line.id, 'account', event.target.value)}
                          style={{
                            width: '180px',
                            padding: '8px 10px',
                            border: '1px solid #e5e7eb',
                            borderRadius: '6px',
                            outline: 'none',
                            background: '#fff',
                            fontSize: '13px',
                            color: '#374151',
                          }}
                        >
                          {accountOptions.map(account => (
                            <option key={account}>{account}</option>
                          ))}
                        </select>
                      </td>

                      <td style={{ padding: '10px 12px' }}>
                        <input
                          value={line.description}
                          onChange={event => updateLine(line.id, 'description', event.target.value)}
                          style={{
                            width: '100%',
                            padding: '8px 10px',
                            border: '1px solid #e5e7eb',
                            borderRadius: '6px',
                            outline: 'none',
                            fontSize: '13px',
                            color: '#374151',
                          }}
                        />
                      </td>

                      <td style={{ padding: '10px 12px' }}>
                        <input
                          type="number"
                          min="0"
                          value={line.debit}
                          onChange={event => updateLine(line.id, 'debit', Number(event.target.value))}
                          style={{
                            width: '120px',
                            padding: '8px 10px',
                            border: '1px solid #e5e7eb',
                            borderRadius: '6px',
                            outline: 'none',
                            fontSize: '13px',
                            color: '#374151',
                          }}
                        />
                      </td>

                      <td style={{ padding: '10px 12px' }}>
                        <input
                          type="number"
                          min="0"
                          value={line.credit}
                          onChange={event => updateLine(line.id, 'credit', Number(event.target.value))}
                          style={{
                            width: '120px',
                            padding: '8px 10px',
                            border: '1px solid #e5e7eb',
                            borderRadius: '6px',
                            outline: 'none',
                            fontSize: '13px',
                            color: '#374151',
                          }}
                        />
                      </td>

                      <td style={{ padding: '10px 12px' }}>
                        {lines.length > 2 && (
                          <button
                            onClick={() => removeLine(line.id)}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: '#ef4444',
                              cursor: 'pointer',
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
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '16px', marginTop: '16px' }}>
              <button
                onClick={addLine}
                style={{
                  padding: '9px 18px',
                  background: '#fff',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  color: '#374151',
                }}
              >
                + Add line
              </button>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'auto auto',
                  gap: '8px 28px',
                  fontSize: '13px',
                  color: '#374151',
                }}
              >
                <span>Total Debit</span>
                <strong style={{ color: '#111827' }}>{formatCurrency(totalDebit)}</strong>
                <span>Total Credit</span>
                <strong style={{ color: '#111827' }}>{formatCurrency(totalCredit)}</strong>
                <span>Difference</span>
                <strong style={{ color: difference === 0 ? '#059669' : '#dc2626' }}>
                  {formatCurrency(Math.abs(difference))}
                </strong>
              </div>
            </div>
          </div>

          <div>
            <div style={{ fontSize: '15px', fontWeight: 600, color: '#111827', marginBottom: '6px' }}>
              Notes
            </div>
            <div style={{ fontSize: '13px', color: '#6b7280', lineHeight: 1.6 }}>
              Optional internal notes for this entry.
            </div>
          </div>

          <div
            style={{
              background: '#fff',
              border: '1px solid #e5e7eb',
              borderRadius: '12px',
              padding: '20px',
            }}
          >
            <textarea
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

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', marginTop: '28px' }}>
          <div style={{ fontSize: '13px', color: isBalanced ? '#059669' : '#dc2626', fontWeight: 600 }}>
            {isBalanced
              ? 'Ready to save. Debits and credits are balanced.'
              : `Cannot save yet. Add ${formatCurrency(Math.abs(difference))} ${difference < 0 ? 'to debit' : 'to credit'} to balance this entry.`}
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
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
            disabled={!isBalanced}
            style={{
              padding: '12px 28px',
              background: isBalanced ? '#111827' : '#d1d5db',
              color: '#fff',
              border: 'none',
              borderRadius: '10px',
              fontSize: '14px',
              fontWeight: 600,
              cursor: isBalanced ? 'pointer' : 'not-allowed',
            }}
          >
            Create Journal Entry
          </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ fontFamily: font }} onClick={() => setOpenMenu(null)}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
        <div style={{ fontSize: '24px', fontWeight: 600, color: '#111827' }}>Accounting</div>
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
          + Journal entry
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
        <span>Accounting</span>
        <span>•</span>
        <span>Journal Entries</span>
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
            display: 'grid',
            gridTemplateColumns: '1fr 1fr 1.4fr',
            borderBottom: '1px solid #f3f4f6',
          }}
        >
          <div style={{ padding: '24px', borderRight: '1px solid #f3f4f6' }}>
            <div style={{ fontSize: '13px', color: '#6b7280', fontWeight: 500, marginBottom: '8px' }}>
              Posted Debits
            </div>
            <div style={{ fontSize: '26px', fontWeight: 600, color: '#111827', marginBottom: '4px' }}>
              {formatCurrency(postedDebit)}
            </div>
            <div style={{ fontSize: '12px', color: '#10b981', fontWeight: 600 }}>
              {tabCounts('Posted')} posted entries
            </div>
          </div>

          <div style={{ padding: '24px', borderRight: '1px solid #f3f4f6' }}>
            <div style={{ fontSize: '13px', color: '#6b7280', fontWeight: 500, marginBottom: '8px' }}>
              Posted Credits
            </div>
            <div style={{ fontSize: '26px', fontWeight: 600, color: '#111827', marginBottom: '4px' }}>
              {formatCurrency(postedCredit)}
            </div>
            <div style={{ fontSize: '12px', color: postedDebit === postedCredit ? '#10b981' : '#ef4444', fontWeight: 600 }}>
              Difference {formatCurrency(Math.abs(postedDebit - postedCredit))}
            </div>
          </div>

          <div style={{ padding: '24px' }}>
            <div style={{ fontSize: '13px', color: '#6b7280', fontWeight: 500, marginBottom: '12px' }}>
              Account Activity
            </div>
            {accountSummary.length === 0 ? (
              <div style={{ fontSize: '13px', color: '#9ca3af', fontWeight: 500 }}>No account activity yet</div>
            ) : (
              <div style={{ display: 'grid', gap: '10px' }}>
                {accountSummary.map(item => (
                  <div key={item.account}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', marginBottom: '5px' }}>
                      <span style={{ fontSize: '12px', color: '#374151', fontWeight: 600 }}>{item.account}</span>
                      <span style={{ fontSize: '12px', color: '#111827', fontWeight: 600 }}>
                        {formatCurrency(item.debit + item.credit)}
                      </span>
                    </div>
                    <div style={{ height: '6px', background: '#f3f4f6', borderRadius: '999px', overflow: 'hidden' }}>
                      <div
                        style={{
                          width: `${Math.min(((item.debit + item.credit) / Math.max(postedDebit + postedCredit, 1)) * 100, 100)}%`,
                          height: '100%',
                          background: '#6c63ff',
                          borderRadius: '999px',
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
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
            <span style={{ color: '#9ca3af' }}>??</span>
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
            Columns
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
            <div style={{ fontSize: '14px', fontWeight: 600, color: '#9ca3af' }}>
              No journal entries yet - click + Journal entry to create one
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
                  {['Entry No', 'Title', 'Reference', 'Date', 'Debit', 'Credit', 'Status', ''].map(header => (
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
                {filtered.map((entry, index) => (
                  <tr
                    key={entry.id}
                    style={{
                      borderTop: '1px solid #f3f4f6',
                      background: selected.includes(entry.id) ? '#f5f4ff' : index % 2 === 0 ? '#fff' : '#fafafa',
                    }}
                  >
                    <td style={{ padding: '16px 24px' }}>
                      <input
                        type="checkbox"
                        checked={selected.includes(entry.id)}
                        onChange={() => toggleSelect(entry.id)}
                      />
                    </td>
                    <td style={{ padding: '16px', fontSize: '13px', fontWeight: 600, color: '#111827' }}>
                      {entry.entryNo}
                    </td>
                    <td style={{ padding: '16px' }}>
                      <div style={{ fontSize: '13px', fontWeight: 600, color: '#111827' }}>{entry.title}</div>
                      <div style={{ fontSize: '12px', color: '#9ca3af' }}>{entry.lines.length} lines</div>
                    </td>
                    <td style={{ padding: '16px', fontSize: '13px', color: '#374151' }}>{entry.reference}</td>
                    <td style={{ padding: '16px', fontSize: '13px', color: '#6b7280' }}>{entry.date}</td>
                    <td style={{ padding: '16px', fontSize: '13px', fontWeight: 600, color: '#111827' }}>
                      {formatCurrency(entry.totalDebit)}
                    </td>
                    <td style={{ padding: '16px', fontSize: '13px', fontWeight: 600, color: '#111827' }}>
                      {formatCurrency(entry.totalCredit)}
                    </td>
                    <td style={{ padding: '16px' }}>
                      <span
                        style={{
                          fontSize: '11px',
                          fontWeight: 600,
                          padding: '4px 10px',
                          borderRadius: '20px',
                          background: statusStyle[entry.status]?.bg,
                          color: statusStyle[entry.status]?.color,
                        }}
                      >
                        {entry.status}
                      </span>
                    </td>
                    <td style={{ padding: '16px', position: 'relative' }}>
                      <button
                        onClick={event => {
                          event.stopPropagation()
                          setOpenMenu(openMenu === entry.id ? null : entry.id)
                        }}
                        aria-label={`Open actions for ${entry.entryNo}`}
                        style={{
                          width: '32px',
                          height: '32px',
                          border: 'none',
                          borderRadius: '8px',
                          background: openMenu === entry.id ? '#f3f4f6' : 'transparent',
                          color: '#6b7280',
                          cursor: 'pointer',
                          fontSize: '18px',
                          fontWeight: 600,
                        }}
                      >
                        ?
                      </button>

                      {openMenu === entry.id && (
                        <div
                          onClick={event => event.stopPropagation()}
                          style={{
                            position: 'absolute',
                            right: '18px',
                            top: '46px',
                            width: '170px',
                            background: '#fff',
                            border: '1px solid #e5e7eb',
                            borderRadius: '10px',
                            boxShadow: '0 14px 35px rgba(15,23,42,0.12)',
                            overflow: 'hidden',
                            zIndex: 20,
                          }}
                        >
                          <div
                            onClick={() => {
                              setViewingEntry(entry)
                              setOpenMenu(null)
                            }}
                            style={{
                              padding: '11px 14px',
                              fontSize: '13px',
                              color: '#374151',
                              fontWeight: 600,
                              cursor: 'pointer',
                              borderBottom: '1px solid #f3f4f6',
                            }}
                          >
                            View details
                          </div>
                          <div
                            onClick={() => toggleEntryStatus(entry.id)}
                            style={{
                              padding: '11px 14px',
                              fontSize: '13px',
                              color: '#374151',
                              fontWeight: 600,
                              cursor: 'pointer',
                              borderBottom: '1px solid #f3f4f6',
                            }}
                          >
                            Mark as {entry.status === 'POSTED' ? 'Draft' : 'Posted'}
                          </div>
                          <div
                            onClick={() => deleteEntry(entry.id)}
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

      {viewingEntry && (
        <div
          onClick={() => setViewingEntry(null)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(17, 24, 39, 0.42)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
            zIndex: 120,
          }}
        >
          <div
            onClick={event => event.stopPropagation()}
            style={{
              width: 'min(760px, 100%)',
              maxHeight: '85vh',
              overflowY: 'auto',
              background: '#fff',
              borderRadius: '14px',
              border: '1px solid #e5e7eb',
              boxShadow: '0 24px 70px rgba(15,23,42,0.2)',
            }}
          >
            <div
              style={{
                padding: '20px 24px',
                borderBottom: '1px solid #f3f4f6',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: '16px',
              }}
            >
              <div>
                <div style={{ fontSize: '18px', fontWeight: 600, color: '#111827' }}>
                  {viewingEntry.entryNo}
                </div>
                <div style={{ fontSize: '13px', color: '#6b7280', marginTop: '4px' }}>
                  {viewingEntry.title}
                </div>
              </div>
              <button
                onClick={() => setViewingEntry(null)}
                style={{
                  border: '1px solid #e5e7eb',
                  background: '#fff',
                  borderRadius: '8px',
                  width: '34px',
                  height: '34px',
                  cursor: 'pointer',
                  color: '#6b7280',
                  fontWeight: 600,
                }}
              >
                ×
              </button>
            </div>

            <div style={{ padding: '22px 24px' }}>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(4, 1fr)',
                  gap: '14px',
                  marginBottom: '20px',
                }}
              >
                {[
                  ['Reference', viewingEntry.reference],
                  ['Date', viewingEntry.date],
                  ['Debit', formatCurrency(viewingEntry.totalDebit)],
                  ['Credit', formatCurrency(viewingEntry.totalCredit)],
                ].map(([label, value]) => (
                  <div key={label} style={{ background: '#f9fafb', borderRadius: '10px', padding: '14px' }}>
                    <div style={{ fontSize: '11px', color: '#6b7280', fontWeight: 600, marginBottom: '6px' }}>
                      {label}
                    </div>
                    <div style={{ fontSize: '13px', color: '#111827', fontWeight: 600 }}>
                      {value}
                    </div>
                  </div>
                ))}
              </div>

              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', minWidth: '640px', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: '#fafafa' }}>
                      {['Account', 'Description', 'Debit', 'Credit'].map(header => (
                        <th
                          key={header}
                          style={{
                            padding: '10px 12px',
                            textAlign: 'left',
                            fontSize: '12px',
                            fontWeight: 600,
                            color: '#6b7280',
                            textTransform: 'uppercase',
                          }}
                        >
                          {header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {viewingEntry.lines.map(line => (
                      <tr key={line.id} style={{ borderTop: '1px solid #f3f4f6' }}>
                        <td style={{ padding: '12px', fontSize: '13px', fontWeight: 600, color: '#111827' }}>
                          {line.account}
                        </td>
                        <td style={{ padding: '12px', fontSize: '13px', color: '#6b7280' }}>
                          {line.description}
                        </td>
                        <td style={{ padding: '12px', fontSize: '13px', fontWeight: 600, color: '#111827' }}>
                          {formatCurrency(line.debit)}
                        </td>
                        <td style={{ padding: '12px', fontSize: '13px', fontWeight: 600, color: '#111827' }}>
                          {formatCurrency(line.credit)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {viewingEntry.notes && (
                <div style={{ marginTop: '18px' }}>
                  <div style={{ fontSize: '12px', color: '#6b7280', fontWeight: 600, marginBottom: '8px' }}>
                    Notes
                  </div>
                  <div style={{ fontSize: '13px', color: '#374151', lineHeight: 1.6 }}>
                    {viewingEntry.notes}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
