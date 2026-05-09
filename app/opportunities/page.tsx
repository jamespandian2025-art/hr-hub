'use client'

import { ChangeEvent, useEffect, useMemo, useState } from 'react'

const font = "'DM Sans', sans-serif"
const storageKey = 'flowsys-opportunities'
const clientsStorageKey = 'flowsys-clients'
const opportunityScopesStorageKey = 'flowsys-opportunity-scopes'
const opportunityAttachmentsStorageKey = 'flowsys-opportunity-attachments'
const tabs = ['All', 'Pending', 'Negotiations', 'Awarded 2024', 'Awarded 2025', 'Declined'] as const
const detailTabs = ['Overview', 'Scope of Works', 'Attachments'] as const

type Tab = (typeof tabs)[number]
type DetailTab = (typeof detailTabs)[number]
type OpportunityStatus = 'Pending' | 'Negotiations' | 'Awarded 2024' | 'Awarded 2025' | 'Declined'

interface Opportunity {
  id: number
  name: string
  client: string
  location: string
  startDate: string
  endDate: string
  quotation: number
  approvedBudget: number
  status: OpportunityStatus
  probability: number
  source: string
  notes: string
}

interface ClientRecord {
  id: number
  name: string
  email: string
  contact: string
  completed: number
  total: number
  cost: number
  color: string
}

interface OpportunityScope {
  id: number
  opportunityId: number
  title: string
  description: string
  amount: number
  createdAt: string
}

interface OpportunityAttachment {
  id: number
  opportunityId: number
  name: string
  size: number
  tag: string
  addedAt: string
}

const initialClients: ClientRecord[] = [
  { id: 1, name: 'Jessica Fields', email: 'Jessicajaneteran@gmail.com', contact: '-', completed: 0, total: 0, cost: 0, color: '#6c63ff' },
  { id: 2, name: 'Joey Ong', email: 'Joey@ronincollective.ph', contact: '-', completed: 0, total: 0, cost: 0, color: '#10b981' },
  { id: 3, name: 'Happy Alino', email: 'cjalinoproperties@gmail.com', contact: '-', completed: 0, total: 0, cost: 0, color: '#f59e0b' },
]

const statusStyle: Record<OpportunityStatus, { bg: string; color: string }> = {
  'Awarded 2024': { bg: '#ede9fe', color: '#6c63ff' },
  'Awarded 2025': { bg: '#d1fae5', color: '#059669' },
  Pending: { bg: '#fef3c7', color: '#d97706' },
  Negotiations: { bg: '#dbeafe', color: '#2563eb' },
  Declined: { bg: '#fee2e2', color: '#dc2626' },
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

const buttonStyle = {
  padding: '10px 18px',
  borderRadius: '10px',
  border: 'none',
  fontSize: '13px',
  fontWeight: 600,
  cursor: 'pointer',
}

const loadOpportunities = () => {
  if (typeof window === 'undefined') return []

  try {
    const stored = window.localStorage.getItem(storageKey)
    return stored ? (JSON.parse(stored) as Opportunity[]) : []
  } catch {
    return []
  }
}

const loadClients = () => {
  if (typeof window === 'undefined') return initialClients

  try {
    const stored = window.localStorage.getItem(clientsStorageKey)
    return stored ? (JSON.parse(stored) as ClientRecord[]) : initialClients
  } catch {
    return initialClients
  }
}

const loadStored = <T,>(key: string, fallback: T[]): T[] => {
  if (typeof window === 'undefined') return fallback

  try {
    const stored = window.localStorage.getItem(key)
    return stored ? (JSON.parse(stored) as T[]) : fallback
  } catch {
    return fallback
  }
}

const money = (value: number) => `Php ${value.toLocaleString()}.00`
const nextOpportunityId = (records: Opportunity[]) => records.reduce((max, record) => Math.max(max, record.id), 0) + 1
const nextClientId = (records: ClientRecord[]) => records.reduce((max, record) => Math.max(max, record.id), 0) + 1
const nextRecordId = <T extends { id: number }>(records: T[]) => records.reduce((max, record) => Math.max(max, record.id), 0) + 1
const colorFor = (id: number) => ['#6c63ff', '#10b981', '#f59e0b', '#2563eb', '#ec4899'][id % 5]
const duration = (record: Opportunity) => `${record.startDate || '-'} - ${record.endDate || '-'}`
const statusLabel = (status: OpportunityStatus) => status.toUpperCase()
const fileSize = (size: number) => (size >= 1024 * 1024 ? `${(size / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(size / 1024))} KB`)
const formatDateTime = (date: string) =>
  new Date(date).toLocaleString('en-PH', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })

export default function OpportunitiesPage() {
  const [opportunities, setOpportunities] = useState<Opportunity[]>(loadOpportunities)
  const [clients, setClients] = useState<ClientRecord[]>(loadClients)
  const [activeTab, setActiveTab] = useState<Tab>('All')
  const [search, setSearch] = useState('')
  const [clientFilter, setClientFilter] = useState('All')
  const [selected, setSelected] = useState<number[]>([])
  const [openMenu, setOpenMenu] = useState<number | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [selectedOpportunityId, setSelectedOpportunityId] = useState<number | null>(null)
  const [detailTab, setDetailTab] = useState<DetailTab>('Overview')
  const [scopes, setScopes] = useState<OpportunityScope[]>(() => loadStored<OpportunityScope>(opportunityScopesStorageKey, []))
  const [attachments, setAttachments] = useState<OpportunityAttachment[]>(() => loadStored<OpportunityAttachment>(opportunityAttachmentsStorageKey, []))
  const [scopeTitle, setScopeTitle] = useState('')
  const [scopeDescription, setScopeDescription] = useState('')
  const [scopeAmount, setScopeAmount] = useState(0)
  const [attachmentSearch, setAttachmentSearch] = useState('')
  const [attachmentTagFilter, setAttachmentTagFilter] = useState('All')

  const [name, setName] = useState('')
  const [client, setClient] = useState('')
  const [addingClient, setAddingClient] = useState(false)
  const [manualClient, setManualClient] = useState('')
  const [location, setLocation] = useState('')
  const [startDate, setStartDate] = useState('2026-05-06')
  const [endDate, setEndDate] = useState('2026-05-06')
  const [quotation, setQuotation] = useState(0)
  const [approvedBudget, setApprovedBudget] = useState(0)
  const [status, setStatus] = useState<OpportunityStatus>('Pending')
  const [probability, setProbability] = useState(25)
  const [source, setSource] = useState('')
  const [notes, setNotes] = useState('')

  useEffect(() => {
    window.localStorage.setItem(storageKey, JSON.stringify(opportunities))
  }, [opportunities])

  useEffect(() => {
    window.localStorage.setItem(clientsStorageKey, JSON.stringify(clients))
  }, [clients])

  useEffect(() => {
    window.localStorage.setItem(opportunityScopesStorageKey, JSON.stringify(scopes))
  }, [scopes])

  useEffect(() => {
    window.localStorage.setItem(opportunityAttachmentsStorageKey, JSON.stringify(attachments))
  }, [attachments])

  const clientNames = useMemo(() => clients.map(record => record.name), [clients])

  const filtered = opportunities.filter(opportunity => {
    const matchesTab = activeTab === 'All' || opportunity.status === activeTab
    const matchesClient = clientFilter === 'All' || opportunity.client === clientFilter
    const matchesSearch =
      opportunity.name.toLowerCase().includes(search.toLowerCase()) ||
      opportunity.location.toLowerCase().includes(search.toLowerCase()) ||
      opportunity.client.toLowerCase().includes(search.toLowerCase()) ||
      opportunity.source.toLowerCase().includes(search.toLowerCase())

    return matchesTab && matchesClient && matchesSearch
  })

  const analytics = useMemo(() => {
    const totalQuotation = opportunities.reduce((sum, item) => sum + item.quotation, 0)
    const totalBudget = opportunities.reduce((sum, item) => sum + item.approvedBudget, 0)
    const awarded = opportunities.filter(item => item.status === 'Awarded 2024' || item.status === 'Awarded 2025')
    const awardedValue = awarded.reduce((sum, item) => sum + item.quotation, 0)
    const weightedPipeline = opportunities.reduce((sum, item) => sum + item.quotation * (item.probability / 100), 0)

    return { totalQuotation, totalBudget, awardedValue, weightedPipeline, awardedCount: awarded.length }
  }, [opportunities])

  const tabCount = (tab: Tab) => (tab === 'All' ? opportunities.length : opportunities.filter(item => item.status === tab).length)
  const selectedOpportunity = opportunities.find(item => item.id === selectedOpportunityId)

  const resetForm = () => {
    setName('')
    setClient('')
    setAddingClient(false)
    setManualClient('')
    setLocation('')
    setStartDate('2026-05-06')
    setEndDate('2026-05-06')
    setQuotation(0)
    setApprovedBudget(0)
    setStatus('Pending')
    setProbability(25)
    setSource('')
    setNotes('')
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

  const startEdit = (opportunity: Opportunity) => {
    setEditingId(opportunity.id)
    setName(opportunity.name)
    setClient(opportunity.client === '-' ? '' : opportunity.client)
    setAddingClient(false)
    setManualClient('')
    setLocation(opportunity.location === '-' ? '' : opportunity.location)
    setStartDate(opportunity.startDate)
    setEndDate(opportunity.endDate)
    setQuotation(opportunity.quotation)
    setApprovedBudget(opportunity.approvedBudget)
    setStatus(opportunity.status)
    setProbability(opportunity.probability)
    setSource(opportunity.source === '-' ? '' : opportunity.source)
    setNotes(opportunity.notes)
    setShowForm(true)
    setOpenMenu(null)
    setSelectedOpportunityId(null)
  }

  const saveOpportunity = () => {
    const trimmedName = name.trim()
    if (!trimmedName) return

    const finalClient = addingClient ? manualClient.trim() : client.trim()

    if (addingClient && finalClient) {
      setClients(previous => {
        const exists = previous.some(record => record.name.toLowerCase() === finalClient.toLowerCase())
        if (exists) return previous

        const id = nextClientId(previous)
        return [
          ...previous,
          {
            id,
            name: finalClient,
            email: '-',
            contact: '-',
            completed: 0,
            total: 0,
            cost: 0,
            color: colorFor(id),
          },
        ]
      })
    }

    const nextOpportunity = {
      name: trimmedName,
      client: finalClient || '-',
      location: location.trim() || '-',
      startDate,
      endDate,
      quotation,
      approvedBudget,
      status,
      probability,
      source: source.trim() || '-',
      notes,
    }

    if (editingId) {
      setOpportunities(previous =>
        previous.map(opportunity => (opportunity.id === editingId ? { ...opportunity, ...nextOpportunity } : opportunity))
      )
    } else {
      setOpportunities(previous => [...previous, { id: nextOpportunityId(previous), ...nextOpportunity }])
    }

    closeForm()
  }

  const deleteOpportunity = (id: number) => {
    setOpportunities(previous => previous.filter(opportunity => opportunity.id !== id))
    setSelected(previous => previous.filter(selectedId => selectedId !== id))
    setOpenMenu(null)
    setSelectedOpportunityId(null)
  }

  const toggleSelect = (id: number) => {
    setSelected(previous => (previous.includes(id) ? previous.filter(item => item !== id) : [...previous, id]))
  }

  const toggleSelectAll = () => {
    const filteredIds = filtered.map(item => item.id)
    const allSelected = filteredIds.length > 0 && filteredIds.every(id => selected.includes(id))
    setSelected(previous => (allSelected ? previous.filter(id => !filteredIds.includes(id)) : Array.from(new Set([...previous, ...filteredIds]))))
  }

  const openOpportunityDetail = (id: number) => {
    setSelectedOpportunityId(id)
    setDetailTab('Overview')
    setOpenMenu(null)
  }

  const addScope = (opportunityId: number) => {
    const trimmedTitle = scopeTitle.trim()
    if (!trimmedTitle) return

    setScopes(previous => [
      ...previous,
      {
        id: nextRecordId(previous),
        opportunityId,
        title: trimmedTitle,
        description: scopeDescription.trim(),
        amount: scopeAmount,
        createdAt: new Date().toISOString(),
      },
    ])
    setScopeTitle('')
    setScopeDescription('')
    setScopeAmount(0)
  }

  const deleteScope = (id: number) => {
    setScopes(previous => previous.filter(scope => scope.id !== id))
  }

  const addAttachments = (opportunityId: number, event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || [])
    if (!files.length) return

    setAttachments(previous => [
      ...previous,
      ...files.map((file, index) => ({
        id: nextRecordId(previous) + index,
        opportunityId,
        name: file.name,
        size: file.size,
        tag: 'General',
        addedAt: new Date().toISOString(),
      })),
    ])
    event.target.value = ''
  }

  const deleteAttachment = (id: number) => {
    setAttachments(previous => previous.filter(attachment => attachment.id !== id))
  }

  if (showForm) {
    return (
      <div style={{ fontFamily: font }}>
        <button onClick={closeForm} style={{ border: 'none', background: 'transparent', color: '#374151', fontSize: '14px', fontWeight: 600, cursor: 'pointer', marginBottom: '20px', padding: 0 }}>
          Back
        </button>

        <div style={{ fontSize: '24px', fontWeight: 600, color: '#111827', marginBottom: '6px' }}>
          {editingId ? 'Edit Opportunity' : 'Create Opportunity'}
        </div>
        <div style={{ fontSize: '13px', color: '#9ca3af', marginBottom: '28px', display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
          <span style={{ color: '#6c63ff', fontWeight: 600 }}>Opportunities</span>
          <span>/</span>
          <span>{editingId ? 'Edit' : 'New'}</span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(220px, 260px) minmax(0, 1fr)', gap: '32px' }}>
          <div>
            <div style={{ fontSize: '15px', fontWeight: 600, color: '#111827', marginBottom: '8px' }}>Opportunity Details</div>
            <div style={{ fontSize: '13px', color: '#6b7280', lineHeight: 1.6 }}>
              Track potential projects before they become awarded work. Awarded items can later be created as projects.
            </div>
          </div>

          <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '20px', display: 'grid', gap: '14px' }}>
            <label style={fieldGroupStyle}>
              <span style={labelStyle}>Opportunity name</span>
              <input style={fieldStyle} value={name} onChange={event => setName(event.target.value)} placeholder="Example: Proposed warehouse construction" />
            </label>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: '14px' }}>
              <label style={fieldGroupStyle}>
                <span style={labelStyle}>Client</span>
                <select
                  style={fieldStyle}
                  value={addingClient ? '__new' : client}
                  onChange={event => {
                    if (event.target.value === '__new') {
                      setAddingClient(true)
                      setClient('')
                      return
                    }

                    setAddingClient(false)
                    setManualClient('')
                    setClient(event.target.value)
                  }}
                >
                  <option value="">{clientNames.length ? 'Select client' : 'No clients yet'}</option>
                  {clientNames.map(clientName => <option key={clientName} value={clientName}>{clientName}</option>)}
                  <option value="__new">+ Add new client</option>
                </select>
                {addingClient && (
                  <input style={fieldStyle} value={manualClient} onChange={event => setManualClient(event.target.value)} placeholder="New client name" />
                )}
                <span style={{ fontSize: '12px', color: '#6b7280', lineHeight: 1.45 }}>New clients added here are saved to the Clients page.</span>
              </label>
              <label style={fieldGroupStyle}>
                <span style={labelStyle}>Location</span>
                <input style={fieldStyle} value={location} onChange={event => setLocation(event.target.value)} placeholder="Opportunity location" />
              </label>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '14px' }}>
              <label style={fieldGroupStyle}>
                <span style={labelStyle}>Start date</span>
                <input style={fieldStyle} type="date" value={startDate} onChange={event => setStartDate(event.target.value)} />
              </label>
              <label style={fieldGroupStyle}>
                <span style={labelStyle}>End date</span>
                <input style={fieldStyle} type="date" value={endDate} onChange={event => setEndDate(event.target.value)} />
              </label>
              <label style={fieldGroupStyle}>
                <span style={labelStyle}>Status</span>
                <select style={fieldStyle} value={status} onChange={event => setStatus(event.target.value as OpportunityStatus)}>
                  <option>Pending</option>
                  <option>Negotiations</option>
                  <option>Awarded 2024</option>
                  <option>Awarded 2025</option>
                  <option>Declined</option>
                </select>
              </label>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '14px' }}>
              <label style={fieldGroupStyle}>
                <span style={labelStyle}>Quotation</span>
                <input style={fieldStyle} type="number" value={quotation} onChange={event => setQuotation(Number(event.target.value))} placeholder="0" />
              </label>
              <label style={fieldGroupStyle}>
                <span style={labelStyle}>Approved budget</span>
                <input style={fieldStyle} type="number" value={approvedBudget} onChange={event => setApprovedBudget(Number(event.target.value))} placeholder="0" />
              </label>
              <label style={fieldGroupStyle}>
                <span style={labelStyle}>Probability %</span>
                <input style={fieldStyle} type="number" min={0} max={100} value={probability} onChange={event => setProbability(Math.max(0, Math.min(100, Number(event.target.value))))} placeholder="25" />
              </label>
            </div>

            <label style={fieldGroupStyle}>
              <span style={labelStyle}>Lead source</span>
              <input style={fieldStyle} value={source} onChange={event => setSource(event.target.value)} placeholder="Referral, website, walk-in, bid invite..." />
            </label>

            <label style={fieldGroupStyle}>
              <span style={labelStyle}>Notes</span>
              <textarea style={{ ...fieldStyle, resize: 'vertical' }} value={notes} onChange={event => setNotes(event.target.value)} rows={4} placeholder="Scope notes, next steps, decision makers, or risks" />
            </label>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '28px' }}>
          <button onClick={closeForm} style={{ ...buttonStyle, background: '#fff', border: '1px solid #e5e7eb', color: '#374151' }}>Cancel</button>
          <button onClick={saveOpportunity} disabled={!name.trim()} style={{ ...buttonStyle, background: name.trim() ? '#111827' : '#d1d5db', color: '#fff', cursor: name.trim() ? 'pointer' : 'not-allowed' }}>
            {editingId ? 'Save Opportunity' : 'Create Opportunity'}
          </button>
        </div>
      </div>
    )
  }

  if (selectedOpportunity) {
    const grossMargin = selectedOpportunity.quotation - selectedOpportunity.approvedBudget
    const opportunityScopes = scopes.filter(scope => scope.opportunityId === selectedOpportunity.id)
    const opportunityAttachments = attachments.filter(attachment => attachment.opportunityId === selectedOpportunity.id)
    const filteredAttachments = opportunityAttachments.filter(attachment => {
      const matchesTag = attachmentTagFilter === 'All' || attachment.tag === attachmentTagFilter
      const matchesSearch = attachment.name.toLowerCase().includes(attachmentSearch.toLowerCase())
      return matchesTag && matchesSearch
    })

    return (
      <div style={{ fontFamily: font }}>
        <button onClick={() => setSelectedOpportunityId(null)} style={{ border: 'none', background: 'transparent', color: '#374151', fontSize: '14px', fontWeight: 600, cursor: 'pointer', marginBottom: '28px', padding: 0 }}>
          ‹ Back
        </button>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px', flexWrap: 'wrap', marginBottom: '34px' }}>
          <div>
            <div style={{ fontSize: '24px', fontWeight: 600, color: '#111827', marginBottom: '12px' }}>Opportunities</div>
            <div style={{ fontSize: '13px', color: '#9ca3af', display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              <span style={{ color: '#111827', fontWeight: 600 }}>Opportunities</span>
              <span>•</span>
              <span style={{ color: '#111827', fontWeight: 600 }}>{selectedOpportunity.name}</span>
              <span>•</span>
              <span>{detailTab}</span>
            </div>
          </div>
          {detailTab === 'Attachments' ? (
            <label style={{ ...buttonStyle, background: '#111827', color: '#fff', display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
              + Add
              <input type="file" multiple onChange={event => addAttachments(selectedOpportunity.id, event)} style={{ display: 'none' }} />
            </label>
          ) : (
            <button onClick={() => startEdit(selectedOpportunity)} style={{ ...buttonStyle, background: '#111827', color: '#fff' }}>✎ Edit</button>
          )}
        </div>

        <div style={{ display: 'flex', gap: '28px', marginBottom: '34px', overflowX: 'auto' }}>
          {detailTabs.map(tab => (
            <button key={tab} onClick={() => setDetailTab(tab)} style={{ border: 'none', borderBottom: detailTab === tab ? '2px solid #111827' : '2px solid transparent', background: 'transparent', padding: '12px 2px', color: detailTab === tab ? '#111827' : '#64748b', cursor: 'pointer', fontSize: '14px', fontWeight: 600, display: 'flex', gap: '8px', alignItems: 'center', whiteSpace: 'nowrap' }}>
              {tab}
              {tab === 'Scope of Works' && <span style={{ fontSize: '11px', padding: '2px 7px', borderRadius: '8px', background: '#111827', color: '#fff' }}>{opportunityScopes.length}</span>}
            </button>
          ))}
        </div>

        {detailTab === 'Overview' && (
          <>
            <div style={panelStyle}>
              <div style={{ display: 'grid', gridTemplateColumns: 'minmax(260px, 1fr) 180px 220px', gap: '24px', alignItems: 'center' }}>
                <div><div style={panelTitleStyle}>{selectedOpportunity.name}</div><div style={{ fontSize: '13px', color: '#64748b', fontWeight: 600, marginTop: '7px' }}>{selectedOpportunity.location}</div></div>
                <div><div style={{ fontSize: '12px', color: '#111827', fontWeight: 600, marginBottom: '8px' }}>Planned schedule</div><div style={{ fontSize: '13px', color: '#64748b', fontWeight: 600 }}>{duration(selectedOpportunity)}</div></div>
                <div style={{ borderLeft: '1px solid #e5e7eb', paddingLeft: '24px' }}><div style={{ fontSize: '12px', color: '#111827', fontWeight: 600, marginBottom: '10px' }}>Client</div><div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}><span style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#7c3aed', color: '#fff', display: 'grid', placeItems: 'center', fontSize: '16px', fontWeight: 600 }}>{selectedOpportunity.client.charAt(0).toLowerCase()}</span><span style={{ fontSize: '13px', color: '#374151', fontWeight: 600 }}>{selectedOpportunity.client}</span></div></div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(280px, 0.78fr) minmax(360px, 1.62fr)', gap: '18px', margin: '18px 0' }}>
              <section style={panelStyle}>
                <div style={panelTitleStyle}>Financial Chart</div>
                <div style={{ width: '230px', height: '230px', borderRadius: '50%', margin: '28px auto 20px', background: 'conic-gradient(#22c55e 0% 48%, #f59e0b 48% 78%, #ff5733 78% 100%)', display: 'grid', placeItems: 'center' }}>
                  <div style={{ width: '168px', height: '168px', borderRadius: '50%', background: '#fff', boxShadow: 'inset 0 0 0 10px #f3f4f6', display: 'grid', placeItems: 'center', textAlign: 'center' }}>
                    <div><div style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>Approved budget</div><div style={{ fontSize: '22px', color: '#111827', fontWeight: 600, marginTop: '8px' }}>{money(selectedOpportunity.approvedBudget)}</div></div>
                  </div>
                </div>
                {[['#22c55e', 'Approved Budget', selectedOpportunity.approvedBudget], ['#f59e0b', 'Quotation', selectedOpportunity.quotation], ['#ff5733', 'Estimated Cost', Math.max(grossMargin, 0)]].map(([color, label, amount]) => (
                  <div key={label as string} style={{ display: 'grid', gridTemplateColumns: '10px minmax(0, 1fr) auto', gap: '10px', alignItems: 'center', paddingTop: '10px' }}><span style={{ width: '10px', height: '10px', borderRadius: '50%', background: color as string }} /><span style={{ fontSize: '13px', color: '#374151', fontWeight: 600 }}>{label}</span><span style={{ fontSize: '13px', color: '#111827', fontWeight: 600 }}>{money(amount as number)}</span></div>
                ))}
              </section>

              <section style={panelStyle}>
                <div style={panelTitleStyle}>Estimated cost</div>
                <div style={{ fontSize: '12px', color: '#374151', fontWeight: 600, margin: '12px 0 24px' }}><span style={{ color: '#ff5733' }}>●</span> Estimated</div>
                <div style={{ height: '300px', position: 'relative', borderBottom: '1px solid #e5e7eb' }}>{[2, 1.5, 1, 0.5, 0].map(value => <div key={value} style={{ height: '20%', borderTop: value === 2 ? 'none' : '1px dashed #e5e7eb', fontSize: '11px', color: '#94a3b8' }}>{value}</div>)}<div style={{ position: 'absolute', bottom: '-22px', left: '48%', fontSize: '11px', color: '#94a3b8', fontWeight: 600 }}>Material Cost</div></div>
              </section>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(360px, 1fr) minmax(260px, 0.48fr)', gap: '18px' }}>
              <section style={panelStyle}>
                <div style={panelTitleStyle}>Scope of works</div>
                <div style={{ minHeight: '310px', display: 'grid', placeItems: 'center', textAlign: 'center' }}>
                  {opportunityScopes.length === 0 ? <div><div style={{ fontSize: '66px', color: '#cbd5e1', marginBottom: '18px' }}>☹</div><div style={{ fontSize: '22px', color: '#64748b', fontWeight: 600, marginBottom: '18px' }}>No Scope of Works</div><div style={{ fontSize: '14px', color: '#64748b', marginBottom: '24px' }}>It seems there are no Scope of Works added yet</div><button onClick={() => setDetailTab('Scope of Works')} style={{ ...buttonStyle, background: '#fff', border: '1px solid #e5e7eb', color: '#111827' }}>+ Scope of Work</button></div> : <div style={{ width: '100%', display: 'grid', gap: '10px' }}>{opportunityScopes.slice(0, 3).map(scope => <div key={scope.id} style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', borderBottom: '1px solid #f3f4f6', padding: '12px 0', textAlign: 'left' }}><span style={{ fontSize: '13px', color: '#111827', fontWeight: 600 }}>{scope.title}</span><span style={{ fontSize: '13px', color: '#111827', fontWeight: 600 }}>{money(scope.amount)}</span></div>)}</div>}
                </div>
              </section>
              <section style={panelStyle}>
                <div style={panelTitleStyle}>Activity logs</div>
                <div style={{ display: 'grid', gridTemplateColumns: '10px minmax(0, 1fr)', gap: '12px', marginTop: '26px' }}><span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#22c55e', marginTop: '4px' }} /><div><div style={{ fontSize: '13px', color: '#111827', fontWeight: 600, lineHeight: 1.45 }}>Local User created a new opportunity ({selectedOpportunity.name})</div><div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '6px' }}>{formatDateTime(new Date().toISOString())}</div></div></div>
                <button style={{ border: 'none', background: 'transparent', color: '#111827', fontSize: '13px', fontWeight: 600, marginTop: '22px', cursor: 'pointer' }}>⌄ See more</button>
              </section>
            </div>
          </>
        )}

        {detailTab === 'Scope of Works' && (
          <section style={{ ...panelStyle, minHeight: '520px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(180px, 1fr) 160px auto', gap: '12px', alignItems: 'end', marginBottom: '14px' }}>
              <label style={fieldGroupStyle}><span style={labelStyle}>Scope title</span><input style={fieldStyle} value={scopeTitle} onChange={event => setScopeTitle(event.target.value)} placeholder="Scope of work" /></label>
              <label style={fieldGroupStyle}><span style={labelStyle}>Amount</span><input style={fieldStyle} type="number" value={scopeAmount} onChange={event => setScopeAmount(Number(event.target.value))} /></label>
              <button onClick={() => addScope(selectedOpportunity.id)} disabled={!scopeTitle.trim()} style={{ ...buttonStyle, height: '40px', background: scopeTitle.trim() ? '#111827' : '#d1d5db', color: '#fff' }}>+ Scope of Work</button>
            </div>
            <textarea style={{ ...fieldStyle, resize: 'vertical', marginBottom: '18px' }} rows={3} value={scopeDescription} onChange={event => setScopeDescription(event.target.value)} placeholder="Description" />
            {opportunityScopes.length === 0 ? <div style={{ minHeight: '330px', display: 'grid', placeItems: 'center', textAlign: 'center' }}><div><div style={{ fontSize: '66px', color: '#cbd5e1', marginBottom: '18px' }}>☹</div><div style={{ fontSize: '24px', color: '#64748b', fontWeight: 600, marginBottom: '18px' }}>No Scope of Works</div><div style={{ fontSize: '14px', color: '#64748b' }}>It seems there are no Scope of Works added yet</div></div></div> : <div style={{ display: 'grid', gap: '10px' }}>{opportunityScopes.map(scope => <div key={scope.id} style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto auto', gap: '12px', alignItems: 'center', border: '1px solid #f3f4f6', borderRadius: '12px', padding: '14px' }}><div><div style={{ fontSize: '14px', color: '#111827', fontWeight: 600 }}>{scope.title}</div><div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>{scope.description || 'No description'}</div></div><div style={{ fontSize: '13px', color: '#111827', fontWeight: 600 }}>{money(scope.amount)}</div><button onClick={() => deleteScope(scope.id)} style={{ border: 'none', background: '#fff1f2', color: '#e11d48', borderRadius: '8px', padding: '8px 10px', cursor: 'pointer', fontWeight: 600 }}>Delete</button></div>)}</div>}
          </section>
        )}

        {detailTab === 'Attachments' && (
          <section>
            <div style={{ display: 'grid', gridTemplateColumns: '200px minmax(220px, 260px) 1fr auto auto', gap: '10px', alignItems: 'center', marginBottom: '38px' }}>
              <select style={fieldStyle} value={attachmentTagFilter} onChange={event => setAttachmentTagFilter(event.target.value)}><option>All</option><option>General</option></select>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '10px 12px', background: '#fff' }}><span style={{ color: '#94a3b8' }}>⌕</span><input style={{ border: 'none', outline: 'none', flex: 1, fontSize: '13px' }} value={attachmentSearch} onChange={event => setAttachmentSearch(event.target.value)} placeholder="Search..." /></div>
              <div />
              <span style={{ fontSize: '14px', color: '#111827', fontWeight: 600 }}>May 06, 2026⌄</span>
              <span style={{ fontSize: '14px', color: '#111827', fontWeight: 600 }}>All type⌄</span>
            </div>
            <div style={{ minHeight: '380px', border: '1px dashed #e5e7eb', borderRadius: '14px', background: '#fff', display: 'grid', placeItems: filteredAttachments.length ? 'stretch' : 'center', padding: '20px' }}>
              {filteredAttachments.length === 0 ? <div style={{ textAlign: 'center', color: '#94a3b8', fontSize: '18px', fontWeight: 600 }}><div style={{ width: '86px', height: '70px', margin: '0 auto 18px', borderRadius: '12px', background: 'linear-gradient(135deg, #e2e8f0, #cbd5e1)', opacity: 0.75 }} />No Data</div> : <div style={{ display: 'grid', gap: '10px' }}>{filteredAttachments.map(attachment => <div key={attachment.id} style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto auto', gap: '12px', alignItems: 'center', borderBottom: '1px solid #f3f4f6', padding: '12px' }}><div><div style={{ fontSize: '13px', color: '#111827', fontWeight: 600 }}>{attachment.name}</div><div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>{fileSize(attachment.size)} - {attachment.tag}</div></div><span style={{ fontSize: '12px', color: '#64748b' }}>{formatDateTime(attachment.addedAt)}</span><button onClick={() => deleteAttachment(attachment.id)} style={{ border: 'none', background: '#fff1f2', color: '#e11d48', borderRadius: '8px', padding: '8px 10px', cursor: 'pointer', fontWeight: 600 }}>Remove</button></div>)}</div>}
            </div>
          </section>
        )}
      </div>
    )
  }

  return (
    <div style={{ fontFamily: font }} onClick={() => setOpenMenu(null)}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px', marginBottom: '8px', flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontSize: '24px', fontWeight: 600, color: '#111827', marginBottom: '6px' }}>Opportunities</div>
          <div style={{ fontSize: '13px', color: '#9ca3af', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ color: '#6c63ff', fontWeight: 600 }}>Opportunities</span>
            <span>/</span>
            <span>List</span>
          </div>
        </div>
        <button onClick={startCreate} style={{ ...buttonStyle, background: '#111827', color: '#fff' }}>+ Opportunity</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: '14px', margin: '24px 0' }}>
        {[
          ['Total Quotation', money(analytics.totalQuotation), `${opportunities.length} opportunities`],
          ['Approved Budget', money(analytics.totalBudget), 'Estimated delivery budget'],
          ['Awarded Value', money(analytics.awardedValue), `${analytics.awardedCount} awarded`],
          ['Weighted Pipeline', money(analytics.weightedPipeline), 'Quotation x probability'],
        ].map(([label, value, detail]) => (
          <div key={label} style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '18px' }}>
            <div style={{ fontSize: '12px', color: '#6b7280', fontWeight: 600, marginBottom: '8px' }}>{label}</div>
            <div style={{ fontSize: '20px', color: '#111827', fontWeight: 600, wordBreak: 'break-word' }}>{value}</div>
            <div style={{ fontSize: '12px', color: '#9ca3af', fontWeight: 600, marginTop: '5px' }}>{detail}</div>
          </div>
        ))}
      </div>

      <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '16px', overflow: 'hidden' }}>
        <div style={{ display: 'flex', borderBottom: '1.5px solid #f3f4f6', padding: '0 24px', overflowX: 'auto' }}>
          {tabs.map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '14px 16px', cursor: 'pointer', fontSize: '13px', fontWeight: activeTab === tab ? 800 : 600, color: activeTab === tab ? '#111827' : '#6b7280', border: 'none', borderBottom: activeTab === tab ? '2px solid #111827' : '2px solid transparent', background: 'transparent', marginBottom: '-1.5px', whiteSpace: 'nowrap' }}>
              {tab}
              <span style={{ fontSize: '11px', padding: '1px 7px', borderRadius: '20px', background: activeTab === tab ? '#111827' : '#f3f4f6', color: activeTab === tab ? '#fff' : '#6b7280', fontWeight: 600 }}>{tabCount(tab)}</span>
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '16px 24px', borderBottom: '1px solid #f3f4f6', flexWrap: 'wrap' }}>
          <select value={clientFilter} onChange={event => setClientFilter(event.target.value)} style={{ ...fieldStyle, width: '180px', background: '#fafafa' }}>
            <option>All</option>
            {clientNames.map(clientName => <option key={clientName}>{clientName}</option>)}
          </select>
          <div style={{ flex: 1, minWidth: '220px', display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 14px', border: '1px solid #e5e7eb', borderRadius: '8px', background: '#fafafa' }}>
            <span style={{ color: '#9ca3af', fontSize: '13px' }}>Search</span>
            <input type="text" placeholder="Search opportunity, client, location, or source..." value={search} onChange={event => setSearch(event.target.value)} style={{ border: 'none', background: 'transparent', fontSize: '13px', color: '#374151', outline: 'none', flex: 1 }} />
          </div>
          <button type="button" onClick={() => { setSearch(''); setClientFilter('All'); setActiveTab('All') }} style={{ ...buttonStyle, background: '#fafafa', border: '1px solid #e5e7eb', color: '#374151' }}>Reset</button>
        </div>

        {filtered.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '70px 24px', color: '#9ca3af', textAlign: 'center', gap: '12px' }}>
            <div style={{ fontSize: '15px', fontWeight: 600 }}>No opportunities yet</div>
            <div style={{ fontSize: '13px', fontWeight: 600 }}>Click + Opportunity to create your first real lead.</div>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '980px' }}>
              <thead>
                <tr style={{ background: '#fafafa' }}>
                  <th style={{ padding: '12px 24px', textAlign: 'left', width: '40px' }}>
                    <input type="checkbox" checked={filtered.length > 0 && filtered.every(item => selected.includes(item.id))} onChange={toggleSelectAll} style={{ cursor: 'pointer' }} />
                  </th>
                  {['Opportunity', 'Client', 'Duration', 'Quotation', 'Approved Budget', 'Probability', 'Status', ''].map(header => (
                    <th key={header} style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>{header}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((item, index) => (
                  <tr key={item.id} onClick={() => openOpportunityDetail(item.id)} style={{ borderTop: '1px solid #f3f4f6', background: selected.includes(item.id) ? '#f5f4ff' : index % 2 === 0 ? '#fff' : '#fafafa', cursor: 'pointer' }}>
                    <td style={{ padding: '16px 24px' }}>
                      <input type="checkbox" checked={selected.includes(item.id)} onClick={event => event.stopPropagation()} onChange={() => toggleSelect(item.id)} style={{ cursor: 'pointer' }} />
                    </td>
                    <td style={{ padding: '16px' }}>
                      <button onClick={event => { event.stopPropagation(); openOpportunityDetail(item.id) }} style={{ display: 'block', width: '100%', border: 'none', background: 'transparent', padding: 0, fontSize: '14px', fontWeight: 600, color: '#111827', marginBottom: '3px', cursor: 'pointer', textAlign: 'left', lineHeight: 1.35 }}>{item.name}</button>
                      <div style={{ fontSize: '12px', color: '#6c63ff', fontWeight: 600 }}>{item.location}</div>
                    </td>
                    <td style={cellStyle}>{item.client}</td>
                    <td style={cellStyle}>{duration(item)}</td>
                    <td style={{ ...cellStyle, fontWeight: 600, color: '#111827' }}>{money(item.quotation)}</td>
                    <td style={{ ...cellStyle, fontWeight: 600, color: '#111827' }}>{money(item.approvedBudget)}</td>
                    <td style={cellStyle}>{item.probability}%</td>
                    <td style={{ padding: '16px' }}>
                      <span style={{ fontSize: '11px', fontWeight: 600, padding: '4px 10px', borderRadius: '20px', background: statusStyle[item.status].bg, color: statusStyle[item.status].color }}>
                        {statusLabel(item.status)}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', position: 'relative', width: '44px' }}>
                      <button onClick={event => { event.stopPropagation(); setOpenMenu(openMenu === item.id ? null : item.id) }} style={{ width: '32px', height: '32px', border: 'none', borderRadius: '8px', background: openMenu === item.id ? '#eef2ff' : 'transparent', color: '#2563eb', cursor: 'pointer', fontSize: '18px', fontWeight: 600 }}>...</button>
                      {openMenu === item.id && (
                        <div onClick={event => event.stopPropagation()} style={{ position: 'absolute', right: '16px', top: '46px', width: '140px', background: '#fff', border: '1px solid #e5e7eb', borderRadius: '10px', boxShadow: '0 16px 40px rgba(15,23,42,0.14)', zIndex: 30, overflow: 'hidden' }}>
                          <button onClick={() => startEdit(item)} style={menuItemStyle}>Edit</button>
                          <button onClick={() => deleteOpportunity(item.id)} style={{ ...menuItemStyle, color: '#ef4444' }}>Delete</button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '16px', padding: '16px 24px', borderTop: '1px solid #f3f4f6' }}>
          <div style={{ fontSize: '13px', color: '#374151', fontWeight: 600 }}>1-{filtered.length} of {filtered.length}</div>
        </div>
      </div>
    </div>
  )
}

const cellStyle = {
  padding: '16px',
  fontSize: '13px',
  color: '#6b7280',
  fontWeight: 600,
}

const panelStyle = {
  background: '#fff',
  border: '1px solid #e5e7eb',
  borderRadius: '16px',
  padding: '22px',
}

const panelTitleStyle = {
  fontSize: '16px',
  color: '#111827',
  fontWeight: 600,
}

const menuItemStyle = {
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
