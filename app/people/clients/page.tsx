'use client'

import Link from 'next/link'
import type { ChangeEvent, ReactNode } from 'react'
import { CheckCircle2, ChevronDown, CircleDollarSign, Copy, ExternalLink, Filter, Grid3X3, LayoutList, Mail, MoreHorizontal, Plus, Search, Trash2, Upload, UserCheck, UserMinus, UserPlus, UsersRound, X } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { AnalyticsToggleButton, CollapsibleAnalytics, useAnalyticsDisclosure } from '@/components/AnalyticsDisclosure'
import { buildEmptyClient, ClientRecord, deleteClient, formatPeso, getInitials, loadClients, saveClient, slugify } from './clientData'
import { companyScopedKey } from '@/lib/tenant/company'

const font = 'var(--font-body)'
const green = 'var(--foreground)'
type ImportMessage = { tone: 'success' | 'error'; text: string }
type DatasetField = { id: string; key?: string; label: string; type?: string }
type DatasetRecord = { id: string; values: Record<string, string>; createdAt?: string; updatedAt?: string }
type ClientImportDataset = { id: string; name: string; description?: string; fields: DatasetField[]; records: DatasetRecord[] }
type ClientFieldKey = 'clientType' | 'photo' | 'name' | 'company' | 'email' | 'phone' | 'website' | 'industry' | 'companySize' | 'companyType' | 'taxId' | 'annualRevenue' | 'billingAddress' | 'accountManager' | 'defaultCurrency' | 'paymentTerms' | 'description' | 'tags' | 'status'
type ClientFieldMapping = Record<ClientFieldKey, string>
type DatasetClientType = NonNullable<ClientRecord['clientType']>

const datasetWorkspaceKey = 'wiseflow-rework-datasets-workspace'
const datasetClientFields: Array<{ key: ClientFieldKey; label: string; required?: boolean }> = [
  { key: 'clientType', label: 'Client Type' },
  { key: 'photo', label: 'Photo / Logo' },
  { key: 'name', label: 'Client name', required: true },
  { key: 'company', label: 'Company' },
  { key: 'email', label: 'Email' },
  { key: 'phone', label: 'Phone' },
  { key: 'website', label: 'Website' },
  { key: 'industry', label: 'Industry' },
  { key: 'companySize', label: 'Company size' },
  { key: 'companyType', label: 'Company type' },
  { key: 'taxId', label: 'Tax ID / VAT' },
  { key: 'annualRevenue', label: 'Annual revenue' },
  { key: 'billingAddress', label: 'Billing address' },
  { key: 'accountManager', label: 'Account manager' },
  { key: 'defaultCurrency', label: 'Default currency' },
  { key: 'paymentTerms', label: 'Payment terms' },
  { key: 'description', label: 'Description / notes' },
  { key: 'tags', label: 'Tags' },
  { key: 'status', label: 'Status' },
]

export default function ClientsPage() {
  const [clients, setClients] = useState<ClientRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('All Status')
  const [industryFilter, setIndustryFilter] = useState('All Industry')
  const [view, setView] = useState<'list' | 'grid'>('list')
  const [importMessage, setImportMessage] = useState<ImportMessage | null>(null)
  const [datasetImportOpen, setDatasetImportOpen] = useState(false)
  const [datasetsForImport, setDatasetsForImport] = useState<ClientImportDataset[]>([])
  const analytics = useAnalyticsDisclosure('wiseflow:analytics:people-clients')

  useEffect(() => {
    let mounted = true

    loadClients().then(result => {
      if (!mounted) return
      setClients(result.clients)
      setLoading(false)
    })

    return () => {
      mounted = false
    }
  }, [])

  const filteredClients = useMemo(() => {
    const query = search.trim().toLowerCase()

    return clients.filter(client => {
      const matchesSearch = !query || [client.name, client.company, client.email, client.phone, client.industry].join(' ').toLowerCase().includes(query)
      const matchesStatus = statusFilter === 'All Status' || client.status === statusFilter
      const matchesIndustry = industryFilter === 'All Industry' || client.industry === industryFilter
      return matchesSearch && matchesStatus && matchesIndustry
    })
  }, [clients, industryFilter, search, statusFilter])

  const stats = useMemo(() => {
    const active = clients.filter(client => client.status === 'Active').length
    const inactive = clients.filter(client => client.status === 'Inactive').length
    const currentMonth = new Date().toISOString().slice(0, 7)
    const newClients = clients.filter(client => client.createdAt.startsWith(currentMonth)).length
    const revenue = clients.reduce((sum, client) => sum + client.totalRevenue, 0)

    return [
      { label: 'Total Clients', value: clients.length.toString(), detail: `+${newClients} this month`, icon: UsersRound, color: 'var(--foreground)' },
      { label: 'Active Clients', value: active.toString(), detail: `${Math.round((active / Math.max(clients.length, 1)) * 100)}% of total`, icon: UserCheck, color: 'var(--foreground)' },
      { label: 'New Clients', value: newClients.toString(), detail: `+${newClients} this month`, icon: UserPlus, color: 'var(--foreground)' },
      { label: 'Inactive Clients', value: inactive.toString(), detail: `${Math.round((inactive / Math.max(clients.length, 1)) * 100)}% of total`, icon: UserMinus, color: 'var(--foreground)' },
      { label: 'Total Revenue', value: formatPeso(revenue), detail: clients.length ? 'From saved client records' : 'No revenue yet', icon: CircleDollarSign, color: 'var(--foreground)' },
    ]
  }, [clients])

  const industries = Array.from(new Set(clients.map(client => client.industry)))
  const accountManagers = Array.from(new Set(clients.map(client => client.accountManager).filter(Boolean)))
  const removeClient = async (client: ClientRecord) => {
    const confirmed = window.confirm(`Delete ${client.name} from the Client Database?`)
    if (!confirmed) return
    await deleteClient(client.id)
    setClients(current => current.filter(item => item.id !== client.id))
  }

  const importClientsFromCsv = async (file?: File) => {
    if (!file) return
    setImportMessage(null)

    try {
      const text = await file.text()
      const parsedClients = clientsFromCsv(text, clients)

      if (!parsedClients.length) {
        setImportMessage({ tone: 'error', text: 'No client rows were found. Use CSV headers like name, email, phone, industry, accountManager, and tags.' })
        return
      }

      const savedClients = await Promise.all(parsedClients.map(client => saveClient(client).then(result => result.client)))

      setClients(current => {
        const existingKeys = clientDuplicateKeys(current)
        const nextClients = savedClients.filter(client => {
          const keys = clientDuplicateKeys([client])
          if ([...keys].some(key => existingKeys.has(key))) return false
          keys.forEach(key => existingKeys.add(key))
          return true
        })
        return [...nextClients, ...current]
      })
      setSearch('')
      setStatusFilter('All Status')
      setIndustryFilter('All Industry')
      setView('list')
      setImportMessage({ tone: 'success', text: `${savedClients.length} client${savedClients.length === 1 ? '' : 's'} imported from ${file.name}.` })
    } catch {
      setImportMessage({ tone: 'error', text: 'Import failed. Please choose a valid CSV file and try again.' })
    }
  }

  const openDatasetImport = () => {
    setDatasetsForImport(loadClientImportDatasets())
    setDatasetImportOpen(true)
    setImportMessage(null)
  }

  const importClientsFromDataset = async (dataset: ClientImportDataset, mapping: ClientFieldMapping, selectedRecordIds: string[], fallbackClientType: DatasetClientType = 'Commercial') => {
    setImportMessage(null)
    const selectedIds = new Set(selectedRecordIds)
    const mappedClients = dataset.records
      .filter(record => selectedIds.has(record.id))
      .map((record, index) => clientFromDatasetRecord(dataset, record, mapping, clients, index, fallbackClientType))
      .filter(Boolean) as ClientRecord[]

    if (!mappedClients.length) {
      setImportMessage({ tone: 'error', text: 'No importable client rows were selected. Map at least a client name field.' })
      return
    }

    const duplicateKeys = clientDuplicateKeys(clients)
    const uniqueClients = mappedClients.filter(client => {
      const keys = clientDuplicateKeys([client])
      if ([...keys].some(key => duplicateKeys.has(key))) return false
      keys.forEach(key => duplicateKeys.add(key))
      return true
    })

    if (!uniqueClients.length) {
      setImportMessage({ tone: 'error', text: 'All selected dataset rows already exist in the Client Database.' })
      return
    }

    // Save each row independently so one failure does not discard the others,
    // and surface the real reason instead of a generic "import failed" message.
    const outcomes = await Promise.allSettled(uniqueClients.map(client => saveClient(client)))
    const savedClients: ClientRecord[] = []
    let firstError = ''
    outcomes.forEach(outcome => {
      if (outcome.status === 'fulfilled') {
        savedClients.push(outcome.value.client)
      } else if (!firstError) {
        firstError = outcome.reason instanceof Error ? outcome.reason.message : String(outcome.reason || '')
      }
    })

    if (savedClients.length) {
      setClients(current => [...savedClients, ...current])
      setSearch('')
      setStatusFilter('All Status')
      setIndustryFilter('All Industry')
      setView('list')
    }

    const failedCount = uniqueClients.length - savedClients.length
    if (savedClients.length && !failedCount) {
      setDatasetImportOpen(false)
      setImportMessage({ tone: 'success', text: `${savedClients.length} client${savedClients.length === 1 ? '' : 's'} imported from ${dataset.name}.` })
    } else if (savedClients.length && failedCount) {
      setImportMessage({ tone: 'error', text: `${savedClients.length} imported, ${failedCount} could not be saved${firstError ? `: ${firstError}` : '.'}` })
    } else {
      setImportMessage({ tone: 'error', text: `Could not save the selected client${uniqueClients.length === 1 ? '' : 's'}${firstError ? `: ${firstError}` : '. Please try again or check your connection and permissions.'}` })
    }
  }

  if (loading) {
    return <ClientDatabaseLoadingState onCsvImport={importClientsFromCsv} onDatasetImport={openDatasetImport} />
  }

  if (clients.length === 0) {
    return (
      <>
        <ClientDatabaseEmptyState importMessage={importMessage} onCsvImport={importClientsFromCsv} onDatasetImport={openDatasetImport} />
        {datasetImportOpen && <DatasetClientImportModal datasets={datasetsForImport} existingClients={clients} onClose={() => setDatasetImportOpen(false)} onImport={importClientsFromDataset} />}
      </>
    )
  }

  return (
    <div className="clients-page" style={{ fontFamily: font }}>
      <section className="clients-hero">
        <div className="clients-inner">
          <PageHeader
            title="Client Database"
            subtitle="Manage and monitor all your clients and their details."
            actions={(
              <ClientHeaderActions
                analyticsToggle={<AnalyticsToggleButton open={analytics.open} onToggle={analytics.toggle} panelId={analytics.panelId} style={{ ...secondaryButton, fontFamily: font }} />}
                onCsvImport={importClientsFromCsv}
                onDatasetImport={openDatasetImport}
              />
            )}
          />

          <CollapsibleAnalytics open={analytics.open} id={analytics.panelId}>
            <div style={statGrid}>
              {stats.map(stat => <StatCard key={stat.label} {...stat} />)}
            </div>
          </CollapsibleAnalytics>
        </div>
      </section>

      <section className="clients-content">
        {importMessage ? <ImportNotice message={importMessage} /> : null}
        <div style={filterBar}>
          <label style={searchBox}>
            <Search size={17} color="var(--muted-foreground)" />
            <input value={search} onChange={event => setSearch(event.target.value)} placeholder="Search clients by name, email, company..." style={inputBare} />
          </label>
          <select value={statusFilter} onChange={event => setStatusFilter(event.target.value)} style={selectStyle}>
            <option>All Status</option>
            <option>Active</option>
            <option>Inactive</option>
          </select>
          <select value={industryFilter} onChange={event => setIndustryFilter(event.target.value)} style={selectStyle}>
            <option>All Industry</option>
            {industries.map(industry => <option key={industry}>{industry}</option>)}
          </select>
          <select style={selectStyle}>
            <option>All Tags</option>
            <option>Enterprise</option>
            <option>Priority</option>
          </select>
          <select style={selectStyle}>
            <option>Account Manager</option>
            {accountManagers.map(manager => <option key={manager}>{manager}</option>)}
          </select>
          <button style={secondaryButton}><Filter size={16} /> Filter</button>
          <div style={{ display: 'flex', gap: 8, marginLeft: 'auto' }}>
            <button onClick={() => setView('list')} style={iconButton(view === 'list')}><LayoutList size={18} /></button>
            <button onClick={() => setView('grid')} style={iconButton(view === 'grid')}><Grid3X3 size={18} /></button>
          </div>
        </div>

        {view === 'list' ? (
          <ClientTable clients={filteredClients} onDeleteClient={removeClient} />
        ) : (
          <div style={gridCards}>
            {filteredClients.map(client => <ClientGridCard key={client.id} client={client} />)}
          </div>
        )}
      </section>
      {datasetImportOpen && <DatasetClientImportModal datasets={datasetsForImport} existingClients={clients} onClose={() => setDatasetImportOpen(false)} onImport={importClientsFromDataset} />}
    </div>
  )
}

function ClientDatabaseLoadingState({ onCsvImport, onDatasetImport }: { onCsvImport: (file?: File) => void | Promise<void>; onDatasetImport: () => void }) {
  return (
    <div className="clients-page clients-page-empty" style={emptyPage}>
      <section className="clients-hero">
        <div className="clients-inner">
          <PageHeader
            title="Client Database"
            subtitle="Manage and monitor all your clients and their details."
            actions={<ClientHeaderActions onCsvImport={onCsvImport} onDatasetImport={onDatasetImport} />}
          />
        </div>
      </section>
      <section className="clients-empty-content" style={emptyContent}>
        <div style={loadingState}>Loading client database...</div>
      </section>
    </div>
  )
}

function ClientDatabaseEmptyState({ importMessage, onCsvImport, onDatasetImport }: { importMessage: ImportMessage | null; onCsvImport: (file?: File) => void | Promise<void>; onDatasetImport: () => void }) {
  const helperItems = [
    'Store client contact information',
    'Track account managers',
    'Monitor client activity',
    'Organize clients by industry and tags',
    'Manage client relationships',
  ]

  return (
    <div className="clients-page clients-page-empty" style={emptyPage}>
      <section className="clients-hero">
        <div className="clients-inner">
          <PageHeader
            title="Client Database"
            subtitle="Manage and monitor all your clients and their details."
            actions={<ClientHeaderActions onCsvImport={onCsvImport} onDatasetImport={onDatasetImport} />}
          />
        </div>
      </section>

      <section className="clients-empty-content" style={emptyContent}>
        <div style={emptyStateShell}>
          <ClientEmptyIllustration />
          <div style={emptyTextStack}>
            <h2 style={emptyHeadline}>No Clients Yet</h2>
            <p style={emptyDescription}>
              Start building your client database by adding your first client.
              <br />
              You can manually add clients or import them from a spreadsheet.
            </p>
          </div>
          <div style={emptyActions}>
            <Link href="/people/clients/new" style={primaryEmptyCta}><Plus size={18} /> Add First Client</Link>
            <ClientImportMenu variant="empty" onCsvImport={onCsvImport} onDatasetImport={onDatasetImport} />
          </div>
          {importMessage ? <ImportNotice message={importMessage} /> : null}
          <div style={helperSection}>
            <h3 style={helperTitle}>What you can do here</h3>
            <div style={helperList}>
              {helperItems.map(item => (
                <div key={item} style={helperItem}>
                  <CheckCircle2 size={16} />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}

function ClientHeaderActions({ analyticsToggle, onCsvImport, onDatasetImport }: { analyticsToggle?: ReactNode; onCsvImport: (file?: File) => void | Promise<void>; onDatasetImport: () => void }) {
  return (
    <>
      {analyticsToggle}
      <ClientImportMenu onCsvImport={onCsvImport} onDatasetImport={onDatasetImport} />
      <Link href="/people/clients/new" style={primaryLink}><Plus size={16} /> Add Client <ChevronDown size={14} /></Link>
    </>
  )
}

function ClientImportMenu({ variant = 'header', onCsvImport, onDatasetImport }: { variant?: 'header' | 'empty'; onCsvImport: (file?: File) => void | Promise<void>; onDatasetImport: () => void }) {
  const [open, setOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      if (menuRef.current?.contains(event.target as Node)) return
      setOpen(false)
    }

    if (open) document.addEventListener('pointerdown', handlePointerDown)
    return () => document.removeEventListener('pointerdown', handlePointerDown)
  }, [open])

  const handleUploadClick = () => {
    setOpen(false)
    fileInputRef.current?.click()
  }

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.currentTarget.files?.[0]
    void onCsvImport(file)
    event.currentTarget.value = ''
  }

  return (
    <div ref={menuRef} style={importMenuWrap}>
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen(current => !current)}
        style={variant === 'empty' ? importEmptyButton : importHeaderButton}
      >
        <Upload size={variant === 'empty' ? 17 : 16} /> Import Clients <ChevronDown size={14} />
      </button>
      <input ref={fileInputRef} type="file" accept=".csv,text/csv" hidden onChange={handleFileChange} />
      {open ? (
        <div role="menu" style={variant === 'empty' ? importMenuCentered : importMenu}>
          <button type="button" role="menuitem" style={importMenuItem} onClick={handleUploadClick}>
            <Upload size={16} /> Upload CSV file
          </button>
          <button type="button" role="menuitem" style={importMenuItem} onClick={() => {
            setOpen(false)
            onDatasetImport()
          }}>
            <Grid3X3 size={16} /> Import from datasets
          </button>
        </div>
      ) : null}
    </div>
  )
}

function DatasetClientImportModal({
  datasets,
  existingClients,
  onClose,
  onImport,
}: {
  datasets: ClientImportDataset[]
  existingClients: ClientRecord[]
  onClose: () => void
  onImport: (dataset: ClientImportDataset, mapping: ClientFieldMapping, selectedRecordIds: string[], fallbackClientType: DatasetClientType) => void | Promise<void>
}) {
  const [selectedDatasetId, setSelectedDatasetId] = useState(datasets[0]?.id || '')
  const selectedDataset = datasets.find(dataset => dataset.id === selectedDatasetId) || datasets[0]
  const [mapping, setMapping] = useState<ClientFieldMapping>(() => inferClientFieldMapping(selectedDataset?.fields || []))
  const [selectedRecordIds, setSelectedRecordIds] = useState<string[]>(() => selectedDataset?.records.map(record => record.id) || [])
  const [fallbackClientType, setFallbackClientType] = useState<DatasetClientType>('Commercial')
  const [importing, setImporting] = useState(false)

  const previewRecords = selectedDataset?.records.slice(0, 6) || []
  const duplicateKeys = clientDuplicateKeys(existingClients)
  const importableCount = selectedDataset
    ? selectedDataset.records.filter(record => {
      if (!selectedRecordIds.includes(record.id)) return false
      const candidate = clientDuplicateCandidateFromDatasetRecord(selectedDataset, record, mapping)
      return candidate && ![...clientDuplicateKeys([candidate])].some(key => duplicateKeys.has(key))
    }).length
    : 0

  function selectDataset(datasetId: string) {
    const dataset = datasets.find(item => item.id === datasetId)
    setSelectedDatasetId(datasetId)
    setMapping(inferClientFieldMapping(dataset?.fields || []))
    setSelectedRecordIds(dataset?.records.map(record => record.id) || [])
  }

  async function submitImport() {
    if (!selectedDataset || importing) return
    setImporting(true)
    await onImport(selectedDataset, mapping, selectedRecordIds, fallbackClientType)
    setImporting(false)
  }

  return (
    <div style={datasetModalBackdrop} role="presentation" onMouseDown={onClose}>
      <section style={datasetModal} role="dialog" aria-modal="true" aria-labelledby="dataset-import-title" onMouseDown={event => event.stopPropagation()}>
        <header style={datasetModalHeader}>
          <div>
            <h2 id="dataset-import-title" style={datasetModalTitle}>Import from datasets</h2>
            <p style={datasetModalSubtitle}>Choose a dataset, map fields, then import selected rows into Client Database.</p>
          </div>
          <button type="button" aria-label="Close import from datasets" style={datasetModalClose} onClick={onClose}><X size={18} /></button>
        </header>

        {!datasets.length ? (
          <div style={datasetModalEmpty}>
            <Grid3X3 size={28} />
            <strong>No datasets available</strong>
            <span>Create or sync a dataset first, then return here to import client rows.</span>
          </div>
        ) : (
          <div style={datasetImportBody}>
            <aside style={datasetPickerPanel}>
              <label style={datasetImportLabel}>
                Dataset
                <select value={selectedDataset?.id || ''} onChange={event => selectDataset(event.target.value)} style={datasetImportSelect}>
                  {datasets.map(dataset => <option value={dataset.id} key={dataset.id}>{dataset.name}</option>)}
                </select>
              </label>
              <label style={datasetImportLabel}>
                Client Type
                <select value={fallbackClientType} onChange={event => setFallbackClientType(event.target.value as DatasetClientType)} style={datasetImportSelect}>
                  <option value="Commercial">Commercial</option>
                  <option value="Residential">Residential</option>
                </select>
                <span style={datasetImportHint}>Used when a selected row has no mapped Client Type value.</span>
              </label>
              <div style={datasetImportMeta}>
                <strong>{selectedDataset?.records.length || 0}</strong>
                <span>dataset rows found</span>
              </div>
              <div style={datasetImportMeta}>
                <strong>{importableCount}</strong>
                <span>new clients after duplicate checks</span>
              </div>
            </aside>

            <main style={datasetImportMain}>
              <section style={mappingGrid}>
                {datasetClientFields.map(field => (
                  <label style={datasetImportLabel} key={field.key}>
                    {field.label}{field.required ? ' *' : ''}
                    <select value={mapping[field.key] || ''} onChange={event => setMapping(current => ({ ...current, [field.key]: event.target.value }))} style={datasetImportSelect}>
                      <option value="">Do not import</option>
                      {selectedDataset?.fields.map(datasetField => <option value={datasetField.id} key={datasetField.id}>{datasetField.label}</option>)}
                    </select>
                  </label>
                ))}
              </section>

              <section style={datasetPreviewPanel}>
                <header style={datasetPreviewHeader}>
                  <strong>Preview</strong>
                  <label style={datasetSelectAll}>
                    <input
                      type="checkbox"
                      checked={Boolean(selectedDataset?.records.length) && selectedRecordIds.length === selectedDataset?.records.length}
                      onChange={event => setSelectedRecordIds(event.target.checked ? selectedDataset?.records.map(record => record.id) || [] : [])}
                    />
                    Select all
                  </label>
                </header>
                <div style={datasetPreviewRows}>
                  {previewRecords.map(record => (
                    <label style={datasetPreviewRow} key={record.id}>
                      <input
                        type="checkbox"
                        checked={selectedRecordIds.includes(record.id)}
                        onChange={() => setSelectedRecordIds(current => current.includes(record.id) ? current.filter(id => id !== record.id) : [...current, record.id])}
                      />
                      {(() => {
                        const previewName = datasetRecordValue(selectedDataset, record, mapping.name)
                        const previewPhoto = extractPhotoUrl(datasetRecordValue(selectedDataset, record, mapping.photo))
                        return <span style={datasetPreviewAvatar(previewPhoto)}>{previewPhoto ? null : getInitials(previewName || 'Client')}</span>
                      })()}
                      <span style={datasetPreviewText}>
                        <strong>{datasetRecordValue(selectedDataset, record, mapping.name) || 'Unnamed row'}</strong>
                        <small>{[datasetRecordValue(selectedDataset, record, mapping.email), datasetRecordValue(selectedDataset, record, mapping.phone), datasetRecordValue(selectedDataset, record, mapping.industry)].filter(Boolean).join(' - ') || 'No mapped detail yet'}</small>
                      </span>
                    </label>
                  ))}
                  {!previewRecords.length && <div style={datasetPreviewEmpty}>This dataset has no rows to import.</div>}
                </div>
              </section>
            </main>
          </div>
        )}

        <footer style={datasetModalFooter}>
          <button type="button" style={datasetCancelButton} onClick={onClose}>Cancel</button>
          <button type="button" style={datasetPrimaryButton} disabled={!selectedDataset || !mapping.name || !selectedRecordIds.length || importing} onClick={submitImport}>
            {importing ? 'Importing...' : 'Import selected records'}
          </button>
        </footer>
      </section>
    </div>
  )
}

function ImportNotice({ message }: { message: ImportMessage }) {
  return <div style={importNotice(message.tone)}>{message.text}</div>
}

function ClientEmptyIllustration() {
  return (
    <div style={emptyIllustration} aria-hidden="true">
      <div style={{ ...illustrationPanel, left: -18, top: 24, transform: 'rotate(-7deg)' }}>
        <span style={illustrationLineWide} />
        <span style={illustrationLineShort} />
      </div>
      <div style={{ ...illustrationPanel, right: -14, bottom: 18, transform: 'rotate(6deg)' }}>
        <span style={illustrationLineWide} />
        <span style={illustrationLineShort} />
      </div>
      <div style={illustrationCore}>
        <UsersRound size={62} strokeWidth={1.55} />
      </div>
      <span style={illustrationBadge}><Plus size={19} strokeWidth={2.4} /></span>
    </div>
  )
}

function ClientTable({ clients, onDeleteClient }: { clients: ClientRecord[]; onDeleteClient?: (client: ClientRecord) => void }) {
  const [openActionId, setOpenActionId] = useState('')
  const actionMenuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      if (actionMenuRef.current?.contains(event.target as Node)) return
      setOpenActionId('')
    }

    if (openActionId) document.addEventListener('pointerdown', handlePointerDown)
    return () => document.removeEventListener('pointerdown', handlePointerDown)
  }, [openActionId])

  const copyText = async (value: string) => {
    if (!value) return
    try {
      await navigator.clipboard.writeText(value)
    } catch {
      const textarea = document.createElement('textarea')
      textarea.value = value
      textarea.style.position = 'fixed'
      textarea.style.opacity = '0'
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand('copy')
      document.body.removeChild(textarea)
    }
    setOpenActionId('')
  }

  const emailClient = (client: ClientRecord) => {
    const subject = encodeURIComponent(`WiseFlow follow-up for ${client.name}`)
    window.location.assign(`mailto:${client.email}?subject=${subject}`)
    setOpenActionId('')
  }

  return (
    <div style={panel}>
      <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 980 }}>
        <thead>
          <tr style={{ background: 'linear-gradient(180deg, rgba(255,255,255,0.045), rgba(255,255,255,0.015))' }}>
            {['Client Name', 'Contact Person', 'Email', 'Industry', 'Status', 'Account Manager', 'Last Activity', 'Actions'].map(header => (
              <th key={header} style={th}>{header}</th>
            ))}
          </tr>
        </thead>
        {clients.length > 0 && (
          <tbody>
          {clients.map(client => (
            <tr key={client.id} style={row}>
              <td style={td}>
                <Link href={`/people/clients/${client.id}`} style={clientNameCell}>
                  <span style={clientAvatar(client)}>{!client.photo && getInitials(client.name)}</span>
                  <strong>{client.name}</strong>
                </Link>
              </td>
              <td style={td}>{client.contacts[0]?.name || client.name}</td>
              <td style={td}>{client.email}</td>
              <td style={td}><Badge tone="purple">{client.industry}</Badge></td>
              <td style={td}><span style={statusDot(client.status)} /> {client.status}</td>
              <td style={td}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={avatar('var(--secondary)', 'var(--foreground)')}>{getInitials(client.accountManager)}</span>
                  {client.accountManager}
                </div>
              </td>
              <td style={td}>{client.lastContact}</td>
              <td style={{ ...td, position: 'relative' }}>
                <div ref={openActionId === client.id ? actionMenuRef : undefined} style={actionCell}>
                  <button
                    type="button"
                    aria-label={`Open actions for ${client.name}`}
                    aria-expanded={openActionId === client.id}
                    onClick={() => setOpenActionId(current => current === client.id ? '' : client.id)}
                    style={ghostIcon}
                  >
                    <MoreHorizontal size={18} />
                  </button>
                  {openActionId === client.id ? (
                    <div className="client-row-action-menu" style={actionMenu}>
                      <Link className="client-row-action-menu-item" href={`/people/clients/${client.id}`} style={actionMenuItem} onClick={() => setOpenActionId('')}>
                        <ExternalLink size={14} /> View profile
                      </Link>
                      <button className="client-row-action-menu-item" type="button" style={actionMenuItem} onClick={() => emailClient(client)}>
                        <Mail size={14} /> Email client
                      </button>
                      {onDeleteClient ? (
                        <button className="client-row-action-menu-item is-danger" type="button" style={actionMenuDangerItem} onClick={() => { setOpenActionId(''); onDeleteClient(client) }}>
                          <Trash2 size={14} /> Delete client
                        </button>
                      ) : null}
                      <button className="client-row-action-menu-item" type="button" style={actionMenuItem} onClick={() => copyText(client.email)}>
                        <Copy size={14} /> Copy email
                      </button>
                      <button className="client-row-action-menu-item" type="button" style={actionMenuItem} onClick={() => copyText(`${window.location.origin}/people/clients/${client.id}`)}>
                        <Copy size={14} /> Copy profile link
                      </button>
                    </div>
                  ) : null}
                </div>
              </td>
            </tr>
          ))}
          </tbody>
        )}
      </table>
      {!clients.length && <EmptyState message="No clients found" />}
      <div style={tableFooter}>
        Showing {clients.length ? 1 : 0} to {clients.length} of {clients.length} results
        <span style={paginationWrap}>
          <button style={pageButton} disabled>Previous</button>
          <button style={{ ...pageButton, ...pageButtonActive }}>1</button>
          <button style={pageButton} disabled>Next</button>
        </span>
      </div>
    </div>
  )
}

function ClientGridCard({ client }: { client: ClientRecord }) {
  return (
    <Link href={`/people/clients/${client.id}`} style={gridCard}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <span style={clientAvatar(client, 44)}>{!client.photo && getInitials(client.name)}</span>
        <div>
          <div style={{ fontWeight: 900, color: 'var(--foreground)' }}>{client.name}</div>
          <div style={{ fontSize: 12, color: 'var(--muted-foreground)', marginTop: 3 }}>{client.industry}</div>
        </div>
      </div>
      <div style={{ display: 'grid', gap: 8, fontSize: 13, color: 'var(--muted-foreground)' }}>
        <span>{client.email}</span>
        <span>{client.phone}</span>
        <span>{client.totalProjects} projects - {formatPeso(client.totalRevenue)}</span>
      </div>
    </Link>
  )
}

function PageHeader({ crumb, title, subtitle, actions }: { crumb?: string; title: string; subtitle: string; actions: ReactNode }) {
  return (
    <div style={pageHeader}>
      <div>
        {crumb ? <div style={breadcrumb}>{crumb}</div> : null}
        <h1 style={h1}>{title}</h1>
        <p style={subtitleStyle}>{subtitle}</p>
      </div>
      <div style={actionsWrap}>{actions}</div>
    </div>
  )
}

function StatCard({ label, value, detail, icon: Icon, color }: { label: string; value: string; detail: string; icon: typeof UsersRound; color: string }) {
  return (
    <div className="client-stat-card" style={statCard}>
      <div style={softIcon(color)}><Icon size={20} /></div>
      <div>
        <div style={statLabel}>{label}</div>
        <div style={statValue}>{value}</div>
        <div style={statDetail}>{detail}</div>
      </div>
    </div>
  )
}

function Badge({ children, tone }: { children: ReactNode; tone: 'purple' | 'green' | 'orange' | 'blue' }) {
  const colors = {
    purple: ['var(--secondary)', 'var(--foreground)'],
    green: ['var(--secondary)', 'var(--foreground)'],
    orange: ['var(--secondary)', 'var(--foreground)'],
    blue: ['var(--secondary)', 'var(--foreground)'],
  }[tone]
  return <span style={{ padding: '4px 8px', borderRadius: 999, border: '1px solid var(--border)', background: colors[0], color: colors[1], fontSize: 12, fontWeight: 800 }}>{children}</span>
}

function EmptyState({ message }: { message: string }) {
  return (
    <div style={emptyState}>
      <div style={emptyIcon}><UsersRound size={30} /></div>
      <h2 style={emptyTitle}>{message}</h2>
      <p style={emptyCopy}>Try adjusting your search or filters.</p>
    </div>
  )
}

function clientsFromCsv(text: string, existingClients: ClientRecord[]) {
  const rows = parseCsvRows(text).filter(row => row.some(cell => cell.trim()))
  if (rows.length < 2) return []

  const headers = rows[0].map(normalizeCsvKey)
  const usedIds = new Set(existingClients.map(client => client.id))
  const duplicateKeys = clientDuplicateKeys(existingClients)
  const imported: ClientRecord[] = []

  rows.slice(1).forEach((cells, index) => {
    const row = Object.fromEntries(headers.map((header, cellIndex) => [header, cells[cellIndex]?.trim() || '']))
    const name = csvValue(row, ['name', 'client name', 'client', 'company', 'company name', 'organization'])
    if (!name) return

    const email = csvValue(row, ['email', 'company email', 'contact email'])
    const phone = csvValue(row, ['phone', 'phone number', 'contact number', 'mobile'])
    const keys = clientDuplicateKeys([{ id: '', name, email, phone }])
    if ([...keys].some(key => duplicateKeys.has(key))) return
    keys.forEach(key => duplicateKeys.add(key))

    const baseId = csvValue(row, ['id', 'client id']) || slugify(name)
    const id = uniqueImportedClientId(baseId || `client-${index + 1}`, usedIds)
    imported.push(buildEmptyClient({
      id,
      name,
      company: csvValue(row, ['company', 'company name', 'business name']) || name,
      email: email || '-',
      phone: phone || '-',
      website: csvValue(row, ['website', 'url']),
      industry: csvValue(row, ['industry', 'sector']) || 'General',
      status: csvValue(row, ['status']).toLowerCase() === 'inactive' ? 'Inactive' : 'Active',
      companySize: csvValue(row, ['company size', 'size']) || '-',
      companyType: csvValue(row, ['company type', 'type']) || 'Imported',
      annualRevenue: csvValue(row, ['annual revenue', 'revenue']) || '-',
      taxId: csvValue(row, ['tax id', 'vat number', 'tin']) || '-',
      billingAddress: csvValue(row, ['billing address', 'address']) || '-',
      accountManager: csvValue(row, ['account manager', 'manager', 'owner']) || 'Unassigned',
      paymentTerms: csvValue(row, ['payment terms']) || '-',
      tags: csvValue(row, ['tags']).split(/[;,]/).map(tag => tag.trim()).filter(Boolean),
      description: csvValue(row, ['description', 'notes']) || 'Imported from CSV.',
    }))
  })

  return imported
}

function parseCsvRows(text: string) {
  const rows: string[][] = []
  let row: string[] = []
  let cell = ''
  let inQuotes = false

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index]
    const next = text[index + 1]

    if (char === '"' && inQuotes && next === '"') {
      cell += '"'
      index += 1
    } else if (char === '"') {
      inQuotes = !inQuotes
    } else if (char === ',' && !inQuotes) {
      row.push(cell)
      cell = ''
    } else if ((char === '\n' || char === '\r') && !inQuotes) {
      if (char === '\r' && next === '\n') index += 1
      row.push(cell)
      rows.push(row)
      row = []
      cell = ''
    } else {
      cell += char
    }
  }

  row.push(cell)
  rows.push(row)
  return rows
}

function csvValue(row: Record<string, string>, keys: string[]) {
  for (const key of keys) {
    const value = row[normalizeCsvKey(key)]
    if (value) return value
  }
  return ''
}

function normalizeCsvKey(key: string) {
  return key.toLowerCase().replace(/[^a-z0-9]/g, '')
}

function uniqueImportedClientId(rawBase: string, usedIds: Set<string>) {
  const base = slugify(rawBase)
  let candidate = base
  let suffix = 2

  while (usedIds.has(candidate)) {
    candidate = `${base}-${suffix}`
    suffix += 1
  }

  usedIds.add(candidate)
  return candidate
}

function clientDuplicateKeys(clients: Pick<ClientRecord, 'id' | 'name' | 'email' | 'phone'>[]) {
  return new Set(clients.flatMap(client => [
    client.id ? `id:${client.id.toLowerCase()}` : '',
    client.email && client.email !== '-' ? `email:${client.email.toLowerCase()}` : '',
    client.phone && client.phone !== '-' ? `phone:${client.phone.toLowerCase()}` : '',
    client.name ? `name:${client.name.toLowerCase()}` : '',
  ].filter(Boolean)))
}

function loadClientImportDatasets(): ClientImportDataset[] {
  if (typeof window === 'undefined') return []
  const workspaceKey = companyScopedKey(datasetWorkspaceKey)
  const workspace = ensureClientImportTemplateWorkspace(safeJsonParse(window.localStorage.getItem(workspaceKey)))
  window.localStorage.setItem(workspaceKey, JSON.stringify(workspace))
  if (!isObject(workspace) || !Array.isArray(workspace.datasets)) return []

  return workspace.datasets
    .filter(isObject)
    .map(dataset => ({
      id: stringFromUnknown(dataset.id) || slugify(stringFromUnknown(dataset.name) || 'dataset'),
      name: stringFromUnknown(dataset.name) || 'Untitled dataset',
      description: stringFromUnknown(dataset.description),
      fields: Array.isArray(dataset.fields)
        ? dataset.fields.filter(isObject).map(field => ({
          id: stringFromUnknown(field.id) || stringFromUnknown(field.key) || slugify(stringFromUnknown(field.label) || 'field'),
          key: stringFromUnknown(field.key),
          label: stringFromUnknown(field.label) || stringFromUnknown(field.key) || stringFromUnknown(field.id) || 'Field',
          type: stringFromUnknown(field.type),
        }))
        : [],
      records: Array.isArray(dataset.records)
        ? dataset.records.filter(isObject).map((record, index) => ({
          id: stringFromUnknown(record.id) || `record-${index + 1}`,
          values: isObject(record.values) ? Object.fromEntries(Object.entries(record.values).map(([key, value]) => [key, stringFromUnknown(value)])) : {},
          createdAt: stringFromUnknown(record.createdAt),
          updatedAt: stringFromUnknown(record.updatedAt),
        }))
        : [],
    }))
    .filter(dataset => dataset.fields.length && dataset.records.length)
}

// Existing workspaces seeded the Client Import Template before it had a
// Photo / Logo field. Inject that field (and a blank value on existing rows)
// into the stored template so older workspaces can map a profile picture too.
function ensureTemplatePhotoField(datasets: Record<string, unknown>[]): Record<string, unknown>[] {
  return datasets.map(dataset => {
    if (!isObject(dataset)) return dataset
    const isTemplate = stringFromUnknown(dataset.source) === 'Client Dataset Template'
      || stringFromUnknown(dataset.name) === 'Client Import Template'
    if (!isTemplate) return dataset
    const fields = Array.isArray(dataset.fields) ? dataset.fields.filter(isObject) : []
    const hasPhoto = fields.some(field => {
      const id = stringFromUnknown(field.id).toLowerCase()
      const key = stringFromUnknown(field.key).toLowerCase()
      const label = stringFromUnknown(field.label).toLowerCase()
      return id === 'photo_logo' || key === 'photo_logo' || /\b(photo|logo)\b/.test(label)
    })
    if (hasPhoto) return dataset
    const photoField = { id: 'photo_logo', key: 'photo_logo', label: 'Photo / Logo', type: 'File upload', required: false, options: [] }
    const typeIndex = fields.findIndex(field => stringFromUnknown(field.id) === 'client_type' || stringFromUnknown(field.key) === 'client_type')
    const nextFields = [...fields]
    nextFields.splice(typeIndex >= 0 ? typeIndex + 1 : 0, 0, photoField)
    const records = Array.isArray(dataset.records)
      ? dataset.records.map(record => {
        if (!isObject(record)) return record
        const values = isObject(record.values) ? record.values : {}
        if ('photo_logo' in values) return record
        return { ...record, values: { ...values, photo_logo: '' } }
      })
      : dataset.records
    return { ...dataset, fields: nextFields, records }
  })
}

function ensureClientImportTemplateWorkspace(rawWorkspace: unknown) {
  const workspace = isObject(rawWorkspace) ? rawWorkspace : {}
  const datasets = Array.isArray(workspace.datasets) ? workspace.datasets.filter(isObject) : []
  const settings = isObject(workspace.settings) ? workspace.settings : {}
  const hasTemplate = datasets.some(dataset => stringFromUnknown(dataset.source) === 'Client Dataset Template' || stringFromUnknown(dataset.name) === 'Client Import Template')
  const templateSeeded = Boolean(settings.clientDatasetTemplateSeeded)

  if (hasTemplate || templateSeeded) {
    return {
      datasets: ensureTemplatePhotoField(datasets),
      folders: Array.isArray(workspace.folders) ? workspace.folders : [],
      relationships: Array.isArray(workspace.relationships) ? workspace.relationships : [],
      automations: Array.isArray(workspace.automations) ? workspace.automations : [],
      qualityRules: Array.isArray(workspace.qualityRules) ? workspace.qualityRules : [],
      accessKeys: Array.isArray(workspace.accessKeys) ? workspace.accessKeys : [],
      settings: { ...settings, clientDatasetTemplateSeeded: hasTemplate || templateSeeded },
      history: Array.isArray(workspace.history) ? workspace.history : [],
    }
  }

  const createdAt = new Date().toISOString()
  const template = makeClientImportTemplateDataset(createdAt)
  const folders = Array.isArray(workspace.folders) ? workspace.folders : []
  const history = Array.isArray(workspace.history) ? workspace.history : []

  return {
    datasets: [template, ...datasets],
    folders: folders.some(folder => isObject(folder) && stringFromUnknown(folder.name) === 'CRM')
      ? folders
      : [{ id: 'folder_client_import_template_crm', name: 'CRM', description: 'Client import-ready datasets.', createdAt }, ...folders],
    relationships: Array.isArray(workspace.relationships) ? workspace.relationships : [],
    automations: Array.isArray(workspace.automations) ? workspace.automations : [],
    qualityRules: Array.isArray(workspace.qualityRules) ? workspace.qualityRules : [],
    accessKeys: Array.isArray(workspace.accessKeys) ? workspace.accessKeys : [],
    settings: { ...settings, clientDatasetTemplateSeeded: true },
    history: [{ id: `history-${Date.now()}`, action: 'Created dataset', detail: 'Client Import Template', createdAt }, ...history],
  }
}

function makeClientImportTemplateDataset(createdAt: string) {
  return {
    id: 'dataset-client-import-template',
    name: 'Client Import Template',
    description: 'Ready-to-import Client Database table using the Add Client form fields.',
    status: 'ACTIVE',
    folder: 'CRM',
    owner: 'Current User',
    source: 'Client Dataset Template',
    fields: [
      { id: 'client_type', key: 'client_type', label: 'Client Type', type: 'Select', required: false, options: ['Commercial', 'Residential'] },
      { id: 'photo_logo', key: 'photo_logo', label: 'Photo / Logo', type: 'File upload', required: false, options: [] },
      { id: 'client_name', key: 'client_name', label: 'Client Name', type: 'Text', required: true, options: [] },
      { id: 'company_email', key: 'company_email', label: 'Company Email', type: 'Email', required: true, options: [] },
      { id: 'phone_number', key: 'phone_number', label: 'Phone Number', type: 'Phone', required: true, options: [] },
      { id: 'company_website', key: 'company_website', label: 'Company Website', type: 'URL', required: false, options: [] },
      { id: 'industry', key: 'industry', label: 'Industry', type: 'Select', required: true, options: ['Technology', 'Construction', 'Residential', 'Consulting', 'IT Services', 'Logistics', 'Marketing', 'Healthcare', 'Finance'] },
      { id: 'company_size', key: 'company_size', label: 'Company Size', type: 'Select', required: false, options: ['1 - 10 employees', '11 - 50 employees', '51 - 200 employees', '201 - 500 employees', '500+ employees'] },
      { id: 'company_type', key: 'company_type', label: 'Company Type', type: 'Select', required: true, options: ['Private', 'Corporation', 'Startup', 'Government', 'Non-profit'] },
      { id: 'tax_id_vat_number', key: 'tax_id_vat_number', label: 'Tax ID / VAT Number', type: 'Text', required: false, options: [] },
      { id: 'annual_revenue', key: 'annual_revenue', label: 'Annual Revenue', type: 'Select', required: false, options: ['Below PHP 10M', 'PHP 10M - PHP 20M', 'PHP 20M - PHP 50M', 'PHP 50M - PHP 100M', 'PHP 100M+'] },
      { id: 'billing_address', key: 'billing_address', label: 'Billing Address', type: 'Long text', required: false, options: [] },
      { id: 'account_manager', key: 'account_manager', label: 'Account Manager', type: 'Single user', required: false, options: [] },
      { id: 'default_currency', key: 'default_currency', label: 'Default Currency', type: 'Select', required: true, options: ['PHP - Philippine Peso'] },
      { id: 'payment_terms', key: 'payment_terms', label: 'Payment Terms', type: 'Select', required: false, options: ['Due on receipt', 'Net 15', 'Net 30', 'Net 45', 'Net 60'] },
      { id: 'description_notes', key: 'description_notes', label: 'Description / Notes', type: 'Long text', required: false, options: [] },
      { id: 'tags', key: 'tags', label: 'Tags', type: 'Text', required: false, options: [] },
      { id: 'status', key: 'status', label: 'Status', type: 'Select', required: false, options: ['Active', 'Inactive'] },
    ],
    records: [{
      id: 'client-template-mcdonald',
      values: {
        client_type: 'Commercial',
        photo_logo: '',
        client_name: 'MCDonald',
        company_email: 'info@mcdo.com',
        phone_number: '09457850160',
        company_website: 'mcdo.com',
        industry: 'Marketing',
        company_size: '500+ employees',
        company_type: 'Corporation',
        tax_id_vat_number: '9632655356',
        annual_revenue: 'PHP 50M - PHP 100M',
        billing_address: '',
        account_manager: '',
        default_currency: 'PHP - Philippine Peso',
        payment_terms: '',
        description_notes: '',
        tags: 'Commercial, Marketing',
        status: 'Active',
      },
      createdBy: 'Current User',
      createdAt,
      updatedAt: createdAt,
    }],
    views: [{ id: 'view-client-import-template-table', name: 'TABLE', enabled: true, default: true }],
    createdAt,
    updatedAt: createdAt,
  }
}

function inferClientFieldMapping(fields: DatasetField[]): ClientFieldMapping {
  return {
    clientType: findDatasetField(fields, ['client type', 'type of client', 'customer type']),
    photo: findDatasetField(fields, ['photo / logo', 'photo logo', 'photo', 'logo', 'image', 'avatar', 'picture', 'profile photo']),
    name: findDatasetField(fields, ['client name', 'name', 'company name', 'client']),
    company: findDatasetField(fields, ['company', 'company name', 'business name', 'organization']),
    email: findDatasetField(fields, ['email', 'company email', 'contact email']),
    phone: findDatasetField(fields, ['phone', 'phone number', 'contact number', 'mobile']),
    website: findDatasetField(fields, ['company website', 'website', 'website url', 'url']),
    industry: findDatasetField(fields, ['industry', 'sector', 'category']),
    companySize: findDatasetField(fields, ['company size', 'business size', 'employee count']),
    companyType: findDatasetField(fields, ['company type', 'business type', 'organization type']),
    taxId: findDatasetField(fields, ['tax id', 'vat number', 'tax id vat number', 'tax id / vat number']),
    annualRevenue: findDatasetField(fields, ['annual revenue', 'revenue', 'yearly revenue']),
    billingAddress: findDatasetField(fields, ['billing address', 'address', 'company address']),
    accountManager: findDatasetField(fields, ['account manager', 'manager', 'owner', 'created by']),
    defaultCurrency: findDatasetField(fields, ['default currency', 'currency']),
    paymentTerms: findDatasetField(fields, ['payment terms', 'terms']),
    description: findDatasetField(fields, ['description', 'notes', 'description notes', 'description / notes']),
    tags: findDatasetField(fields, ['tags', 'tag', 'labels']),
    status: findDatasetField(fields, ['status', 'stage']),
  }
}

function findDatasetField(fields: DatasetField[], labels: string[]) {
  const targets = labels.map(normalizeCsvKey)
  const exact = fields.find(field => {
    const variants = [field.id, field.key || '', field.label].map(normalizeCsvKey)
    return variants.some(variant => targets.includes(variant))
  })
  if (exact) return exact.id

  const partial = fields.find(field => {
    const variants = [field.id, field.key || '', field.label].map(normalizeCsvKey)
    return variants.some(variant => targets.some(target => variant.includes(target) || target.includes(variant)))
  })
  return partial?.id || ''
}

function clientFromDatasetRecord(dataset: ClientImportDataset, record: DatasetRecord, mapping: ClientFieldMapping, existingClients: ClientRecord[], index: number, fallbackClientType: DatasetClientType) {
  const name = datasetRecordValue(dataset, record, mapping.name).trim()
  if (!name) return null

  const email = datasetRecordValue(dataset, record, mapping.email).trim()
  const phone = datasetRecordValue(dataset, record, mapping.phone).trim()
  const website = datasetRecordValue(dataset, record, mapping.website).trim()
  const clientTypeValue = datasetRecordValue(dataset, record, mapping.clientType).trim()
  const clientType = /residential/i.test(clientTypeValue) ? 'Residential' : /commercial/i.test(clientTypeValue) ? 'Commercial' : fallbackClientType
  const company = datasetRecordValue(dataset, record, mapping.company).trim() || (website ? website.replace(/^https?:\/\//, '') : name)
  const companyType = datasetRecordValue(dataset, record, mapping.companyType).trim()
  const description = datasetRecordValue(dataset, record, mapping.description).trim()
  const photo = extractPhotoUrl(datasetRecordValue(dataset, record, mapping.photo))
  const baseId = `${slugify(name)}-${slugify(record.id || String(index + 1))}`
  const id = uniqueImportedClientId(baseId, new Set(existingClients.map(client => client.id)))
  const statusValue = datasetRecordValue(dataset, record, mapping.status).trim().toLowerCase()

  return buildEmptyClient({
    id,
    clientType,
    photo,
    name,
    company,
    email: email || '-',
    phone: phone || '-',
    website,
    industry: datasetRecordValue(dataset, record, mapping.industry).trim() || 'General',
    status: statusValue === 'inactive' ? 'Inactive' : 'Active',
    companySize: datasetRecordValue(dataset, record, mapping.companySize).trim() || '-',
    companyType: companyType || (clientType === 'Residential' ? 'Residential' : 'Imported'),
    annualRevenue: datasetRecordValue(dataset, record, mapping.annualRevenue).trim() || '-',
    taxId: datasetRecordValue(dataset, record, mapping.taxId).trim() || '-',
    billingAddress: datasetRecordValue(dataset, record, mapping.billingAddress).trim() || '-',
    accountManager: datasetRecordValue(dataset, record, mapping.accountManager).trim() || 'Unassigned',
    defaultCurrency: datasetRecordValue(dataset, record, mapping.defaultCurrency).trim() || 'PHP - Philippine Peso',
    paymentTerms: datasetRecordValue(dataset, record, mapping.paymentTerms).trim() || '-',
    tags: datasetRecordValue(dataset, record, mapping.tags).split(/[;,]/).map(tag => tag.trim()).filter(Boolean),
    description: description || `Imported from dataset ${dataset.name}.`,
  })
}

function clientDuplicateCandidateFromDatasetRecord(dataset: ClientImportDataset, record: DatasetRecord, mapping: ClientFieldMapping) {
  const name = datasetRecordValue(dataset, record, mapping.name).trim()
  if (!name) return null
  return {
    id: `${slugify(name)}-${slugify(record.id || 'dataset-row')}`,
    name,
    email: datasetRecordValue(dataset, record, mapping.email).trim() || '-',
    phone: datasetRecordValue(dataset, record, mapping.phone).trim() || '-',
  }
}

function datasetRecordValue(dataset: ClientImportDataset | undefined, record: DatasetRecord, fieldId: string) {
  if (!dataset || !fieldId) return ''
  const field = dataset.fields.find(item => item.id === fieldId)
  return record.values[fieldId] || (field?.key ? record.values[field.key] : '') || ''
}

// A mapped photo field can hold either a plain image URL / data URL, or the
// JSON payload a dataset "File upload" field stores ([{ fileUrl, dataUrl }]).
// Return a usable image URL string from whichever shape it is.
function extractPhotoUrl(value: string): string {
  const trimmed = value.trim()
  if (!trimmed) return ''
  if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
    try {
      const parsed = JSON.parse(trimmed)
      const first = Array.isArray(parsed) ? parsed[0] : parsed
      if (first && typeof first === 'object') {
        const candidate = (first as Record<string, unknown>).fileUrl
          || (first as Record<string, unknown>).dataUrl
          || (first as Record<string, unknown>).url
        return typeof candidate === 'string' ? candidate : ''
      }
    } catch {
      return ''
    }
    return ''
  }
  return trimmed
}

function safeJsonParse(raw: string | null): unknown {
  if (!raw) return null
  try {
    return JSON.parse(raw)
  } catch {
    return null
  }
}

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value))
}

function stringFromUnknown(value: unknown) {
  return typeof value === 'string' ? value : value == null ? '' : String(value)
}

const emptyPage = { fontFamily: font, minHeight: '100%', display: 'grid', gridTemplateRows: 'auto minmax(0, 1fr)', background: '#f3f4f6', color: '#0f172a' }
const pageHeader = { display: 'flex', justifyContent: 'space-between', gap: 20, alignItems: 'flex-start', flexWrap: 'wrap' as const }
const breadcrumb = { fontSize: 14, color: 'var(--muted-foreground)', fontWeight: 500, marginBottom: 22 }
const h1 = { margin: 0, fontSize: 32, lineHeight: 1.08, color: 'var(--foreground)', fontWeight: 600, letterSpacing: 0 }
const subtitleStyle = { margin: '12px 0 0', color: '#334155', fontSize: 15, fontWeight: 400 }
const actionsWrap = { display: 'flex', gap: 12, flexWrap: 'wrap' as const }
const primaryLink = { display: 'inline-flex', alignItems: 'center', gap: 8, height: 44, padding: '0 18px', borderRadius: 8, border: '1px solid var(--foreground)', background: 'var(--foreground)', color: 'var(--background)', textDecoration: 'none', fontSize: 14, fontWeight: 500 }
const secondaryLink = { display: 'inline-flex', alignItems: 'center', gap: 8, height: 44, padding: '0 18px', borderRadius: 8, border: '1px solid var(--border)', background: '#ffffff', color: 'var(--foreground)', textDecoration: 'none', fontSize: 14, fontWeight: 500 }
const secondaryButton = { display: 'inline-flex', alignItems: 'center', gap: 8, height: 44, padding: '0 18px', borderRadius: 8, border: '1px solid var(--border)', background: 'rgba(255,255,255,0.02)', color: 'var(--foreground)', fontSize: 14, fontWeight: 500, cursor: 'pointer' }
const importMenuWrap = { position: 'relative' as const, display: 'inline-flex' }
const importHeaderButton = { ...secondaryLink, cursor: 'pointer', fontFamily: font }
const importEmptyButton = { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 9, width: 186, height: 48, padding: '0 18px', borderRadius: 8, border: '1px solid #cbd5e1', background: '#ffffff', color: '#0f172a', textDecoration: 'none', fontSize: 15, fontWeight: 600, cursor: 'pointer', fontFamily: font }
const importMenu = { position: 'absolute' as const, top: 'calc(100% + 8px)', right: 0, zIndex: 50, width: 224, padding: 6, display: 'grid', gap: 3, border: '1px solid #dbe3ef', borderRadius: 8, background: '#ffffff', boxShadow: '0 18px 40px rgba(15, 23, 42, 0.16)' }
const importMenuCentered = { ...importMenu, right: 'auto', left: '50%', transform: 'translateX(-50%)' }
const importMenuItem = { width: '100%', minHeight: 40, border: 'none', borderRadius: 6, background: '#ffffff', color: '#0f172a', display: 'flex', alignItems: 'center', justifyContent: 'flex-start', gap: 10, padding: '0 11px', fontSize: 14, fontWeight: 600, textAlign: 'left' as const, textDecoration: 'none', cursor: 'pointer', fontFamily: font }
const importNotice = (tone: ImportMessage['tone']) => ({ minHeight: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '10px 14px', borderRadius: 8, border: tone === 'success' ? '1px solid #bbf7d0' : '1px solid #fecaca', background: tone === 'success' ? '#f0fdf4' : '#fef2f2', color: tone === 'success' ? '#166534' : '#991b1b', fontSize: 13, fontWeight: 600 })
const datasetModalBackdrop = { position: 'fixed' as const, inset: 0, zIndex: 100, display: 'grid', placeItems: 'center', padding: 28, background: 'rgba(15, 23, 42, 0.42)' }
const datasetModal = { width: 'min(1040px, calc(100vw - 56px))', maxHeight: 'calc(100vh - 56px)', overflow: 'auto', borderRadius: 10, background: '#ffffff', boxShadow: '0 24px 70px rgba(15, 23, 42, 0.28)', color: '#0f172a' }
const datasetModalHeader = { minHeight: 76, padding: '18px 22px', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 18 }
const datasetModalTitle = { margin: 0, fontSize: 20, lineHeight: 1.2, fontWeight: 700, color: '#0f172a' }
const datasetModalSubtitle = { margin: '6px 0 0', fontSize: 13, color: '#000000', lineHeight: 1.45 }
const datasetModalClose = { width: 34, height: 34, border: '1px solid #e2e8f0', borderRadius: 8, background: '#ffffff', color: '#334155', display: 'grid', placeItems: 'center', cursor: 'pointer' }
const datasetImportBody = { display: 'grid', gridTemplateColumns: '260px minmax(0, 1fr)', minHeight: 480 }
const datasetPickerPanel = { padding: 18, borderRight: '1px solid #e2e8f0', background: '#f8fafc', display: 'grid', alignContent: 'start', gap: 14 }
const datasetImportMain = { padding: 18, display: 'grid', gap: 16, alignContent: 'start' }
const datasetImportLabel = { display: 'grid', gap: 7, color: '#334155', fontSize: 12, fontWeight: 700 }
const datasetImportSelect = { width: '100%', height: 38, border: '1px solid #cbd5e1', borderRadius: 7, background: '#ffffff', color: '#0f172a', padding: '0 10px', fontSize: 13, fontWeight: 500 }
const datasetImportHint = { color: '#000000', fontSize: 12, fontWeight: 500, lineHeight: 1.35 }
const datasetImportMeta = { border: '1px solid #e2e8f0', borderRadius: 8, background: '#ffffff', padding: 14, display: 'grid', gap: 4 }
const mappingGrid = { display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 12 }
const datasetPreviewPanel = { border: '1px solid #e2e8f0', borderRadius: 8, overflow: 'hidden', background: '#ffffff' }
const datasetPreviewHeader = { minHeight: 44, padding: '0 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #e2e8f0', background: '#f8fafc', color: '#0f172a', fontSize: 13 }
const datasetSelectAll = { display: 'inline-flex', alignItems: 'center', gap: 7, color: '#000000', fontSize: 12, fontWeight: 700 }
const datasetPreviewRows = { display: 'grid' }
const datasetPreviewRow = { minHeight: 58, padding: '10px 14px', display: 'grid', gridTemplateColumns: '18px 34px minmax(0, 1fr)', alignItems: 'center', gap: 11, borderBottom: '1px solid #f1f5f9', color: '#0f172a', fontSize: 13 }
const datasetPreviewAvatar = (photo: string) => ({
  width: 34,
  height: 34,
  borderRadius: '50%',
  display: 'grid',
  placeItems: 'center' as const,
  flexShrink: 0,
  background: photo ? `#f1f5f9 url(${photo}) center/cover no-repeat` : '#ecfdf5',
  color: '#15803d',
  fontSize: 12,
  fontWeight: 800,
  overflow: 'hidden' as const,
})
const datasetPreviewText = { display: 'grid', gap: 2, minWidth: 0 }
const datasetPreviewEmpty = { padding: 22, color: '#000000', fontSize: 13, textAlign: 'center' as const }
const datasetModalEmpty = { minHeight: 320, display: 'grid', alignContent: 'center', justifyItems: 'center', gap: 8, padding: 32, color: '#000000', textAlign: 'center' as const }
const datasetModalFooter = { minHeight: 66, padding: '14px 22px', borderTop: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 10, background: '#f8fafc' }
const datasetCancelButton = { height: 38, padding: '0 15px', border: '1px solid #cbd5e1', borderRadius: 7, background: '#ffffff', color: '#334155', fontSize: 13, fontWeight: 700, cursor: 'pointer' }
const datasetPrimaryButton = { height: 38, padding: '0 16px', border: '1px solid #0f9f52', borderRadius: 7, background: '#0f9f52', color: '#ffffff', fontSize: 13, fontWeight: 800, cursor: 'pointer' }
const emptyContent = { minHeight: 'calc(100dvh - 230px)', padding: '28px 0 72px', display: 'grid', placeItems: 'center', background: '#f3f4f6' }
const loadingState = { color: '#000000', fontSize: 14, fontWeight: 500 }
const emptyStateShell = { width: 'min(680px, calc(100% - 32px))', display: 'grid', justifyItems: 'center', gap: 24, textAlign: 'center' as const }
const emptyTextStack = { display: 'grid', gap: 12, justifyItems: 'center' }
const emptyHeadline = { margin: 0, color: '#0f172a', fontSize: 30, lineHeight: 1.16, fontWeight: 650, letterSpacing: 0 }
const emptyDescription = { margin: 0, color: '#000000', fontSize: 15, lineHeight: 1.68, fontWeight: 400 }
const emptyActions = { display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 12, flexWrap: 'wrap' as const }
const primaryEmptyCta = { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 9, width: 186, height: 48, padding: '0 18px', borderRadius: 8, border: '1px solid #0f9f52', background: '#0f9f52', color: '#ffffff', textDecoration: 'none', fontSize: 15, fontWeight: 650, boxShadow: '0 14px 28px rgba(15, 159, 82, 0.18)' }
const helperSection = { marginTop: 10, display: 'grid', gap: 16, justifyItems: 'center' }
const helperTitle = { margin: 0, color: '#0f172a', fontSize: 14, lineHeight: 1.3, fontWeight: 650 }
const helperList = { display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '10px 22px', textAlign: 'left' as const }
const helperItem = { display: 'flex', alignItems: 'center', gap: 9, minWidth: 0, color: '#000000', fontSize: 14, fontWeight: 500 }
const emptyIllustration = { position: 'relative' as const, width: 164, height: 136, display: 'grid', placeItems: 'center' }
const illustrationCore = { width: 118, height: 118, borderRadius: 999, display: 'grid', placeItems: 'center', border: '1px solid #cfe4d8', background: 'linear-gradient(180deg, #f2f9e6 0%, #ecf8f1 100%)', color: '#0f172a', boxShadow: '0 22px 42px rgba(15, 23, 42, 0.08)' }
const illustrationBadge = { position: 'absolute' as const, right: 26, bottom: 20, width: 34, height: 34, borderRadius: 999, display: 'grid', placeItems: 'center', border: '3px solid #f3f4f6', background: '#84cc16', color: '#ffffff', boxShadow: '0 10px 20px rgba(132, 204, 22, 0.22)' }
const illustrationPanel = { position: 'absolute' as const, width: 58, height: 42, borderRadius: 8, border: '1px solid #dbe3ef', background: 'rgba(255,255,255,0.78)', boxShadow: '0 12px 26px rgba(15,23,42,0.07)', display: 'grid', alignContent: 'center', gap: 7, padding: '0 11px' }
const illustrationLineWide = { display: 'block', width: 32, height: 4, borderRadius: 999, background: '#cbd5e1' }
const illustrationLineShort = { display: 'block', width: 22, height: 4, borderRadius: 999, background: '#e2e8f0' }
const statGrid = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }
const statCard = { minHeight: 108, background: 'linear-gradient(145deg, rgba(255,255,255,0.055), rgba(255,255,255,0.012))', border: '1px solid var(--border)', borderRadius: 8, boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.035)', padding: 14, display: 'grid', gridTemplateColumns: '44px minmax(0, 1fr)', gap: 14, alignItems: 'center' }
const statLabel = { color: '#334155', fontSize: 13, fontWeight: 400 }
const statValue = { color: 'var(--foreground)', fontSize: 28, fontWeight: 600, marginTop: 5, lineHeight: 1.05 }
const statDetail = { color: '#000000', fontSize: 13, fontWeight: 400, marginTop: 8 }
const filterBar = { display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' as const, marginTop: 14 }
const searchBox = { height: 46, minWidth: 320, flex: '1 1 360px', maxWidth: 430, display: 'flex', alignItems: 'center', gap: 10, padding: '0 14px', border: '1px solid var(--border)', borderRadius: 8, background: '#ffffff' }
const inputBare = { border: 'none', outline: 'none', flex: 1, background: 'transparent', fontSize: 13, color: 'var(--foreground)' }
const selectStyle = { height: 46, border: '1px solid var(--border)', borderRadius: 8, background: '#ffffff', color: 'var(--foreground)', fontSize: 14, fontWeight: 500, padding: '0 14px', minWidth: 132 }
const panel = { background: '#ffffff', border: '1px solid var(--border)', borderRadius: 8, boxShadow: 'none', overflow: 'visible', marginTop: 8 }
const th = { padding: '21px 24px', color: '#334155', fontSize: 13, fontWeight: 500, textAlign: 'left' as const, whiteSpace: 'nowrap' as const, borderBottom: '1px solid var(--border)' }
const td = { padding: '16px 24px', color: 'var(--foreground)', fontSize: 13, fontWeight: 400, borderTop: '1px solid var(--border)', whiteSpace: 'nowrap' as const }
const row = { background: 'transparent' }
const clientNameCell = { display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none', color: 'var(--foreground)' }
const tableFooter = { minHeight: 66, padding: '14px 24px', borderTop: '1px solid var(--border)', color: '#000000', fontSize: 13, fontWeight: 400, display: 'flex', alignItems: 'center', flexWrap: 'wrap' as const, gap: 12 }
const ghostIcon = { width: 34, height: 34, border: 'none', borderRadius: 8, background: 'transparent', color: 'var(--muted-foreground)', cursor: 'pointer' }
const actionCell = { position: 'relative' as const, display: 'inline-flex', justifyContent: 'flex-end' }
const actionMenu = { position: 'absolute' as const, top: 'calc(100% + 8px)', right: 0, zIndex: 30, minWidth: 178, padding: 6, border: '1px solid var(--border)', borderRadius: 8, background: 'var(--popover)', color: 'var(--popover-foreground)', boxShadow: '0 14px 32px rgba(15, 23, 42, 0.14)', display: 'grid', gap: 2 }
const actionMenuItem = { width: '100%', minHeight: 34, border: 'none', borderRadius: 6, background: 'transparent', color: 'var(--popover-foreground)', display: 'flex', alignItems: 'center', gap: 9, padding: '0 10px', fontSize: 13, fontWeight: 500, textAlign: 'left' as const, textDecoration: 'none', cursor: 'pointer', fontFamily: font }
const actionMenuDangerItem = { ...actionMenuItem, color: '#dc2626' }
const gridCards = { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16, marginTop: 18 }
const gridCard = { display: 'grid', gap: 18, minHeight: 180, padding: 18, background: '#ffffff', border: '1px solid var(--border)', borderRadius: 8, boxShadow: 'none', textDecoration: 'none' }
const emptyState = { minHeight: 380, display: 'grid', placeItems: 'center', alignContent: 'center', justifyItems: 'center', gap: 12, padding: 48, textAlign: 'center' as const, color: 'var(--foreground)' }
const emptyIcon = { width: 74, height: 74, borderRadius: 999, border: '1px solid var(--border)', background: 'radial-gradient(circle at 50% 10%, rgba(255,255,255,0.08), rgba(255,255,255,0.01))', display: 'grid', placeItems: 'center', color: 'var(--foreground)' }
const emptyTitle = { margin: '4px 0 0', color: 'var(--foreground)', fontSize: 22, fontWeight: 600 }
const emptyCopy = { margin: '-2px 0 8px', color: '#000000', fontSize: 14, fontWeight: 400 }
const paginationWrap = { marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10 }
const pageButton = { minWidth: 76, height: 36, borderRadius: 8, border: '1px solid var(--border)', background: 'rgba(255,255,255,0.015)', color: '#000000', padding: '0 14px', fontSize: 13, fontWeight: 400 }
const pageButtonActive = { background: 'rgba(255,255,255,0.09)', color: 'var(--foreground)' }

const softIcon = (color: string) => ({
  width: 44,
  height: 44,
  borderRadius: 11,
  background: 'var(--secondary)',
  border: '1px solid var(--border)',
  color,
  display: 'grid',
  placeItems: 'center',
  flex: '0 0 auto',
})

const avatar = (background: string, color: string, size = 34) => ({
  width: size,
  height: size,
  borderRadius: 10,
  background,
  color,
  display: 'inline-grid',
  placeItems: 'center',
  fontSize: size > 40 ? 15 : 12,
  fontWeight: 900,
  flex: '0 0 auto',
})

const clientAvatar = (client: Pick<ClientRecord, 'name' | 'photo'>, size = 34) => ({
  ...avatar(client.photo ? '#f8fafc' : 'var(--secondary)', client.photo ? 'transparent' : 'var(--foreground)', size),
  backgroundImage: client.photo ? `url(${client.photo})` : undefined,
  backgroundSize: 'cover',
  backgroundPosition: 'center',
})

const statusDot = (status: string) => ({
  width: 7,
  height: 7,
  borderRadius: 999,
  display: 'inline-block',
  marginRight: 8,
  background: status === 'Active' ? 'var(--foreground)' : 'var(--muted-foreground)',
})

const iconButton = (active: boolean) => ({
  width: 40,
  height: 40,
  borderRadius: 9,
  border: '1px solid var(--border)',
  background: active ? 'var(--secondary)' : 'var(--card)',
  color: active ? green : 'var(--muted-foreground)',
  display: 'grid',
  placeItems: 'center',
  cursor: 'pointer',
})
