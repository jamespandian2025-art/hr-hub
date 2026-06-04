'use client'

import { ChangeEvent, FormEvent, type ComponentType, type MouseEvent as ReactMouseEvent, useEffect, useMemo, useRef, useState } from 'react'
import {
  BarChart3,
  CheckCircle2,
  ChevronDown,
  Clock3,
  CloudUpload,
  FileText,
  Filter,
  Grid3X3,
  MoreHorizontal,
  Package,
  Paperclip,
  PieChart,
  Plus,
  Search,
  Send,
  Star,
  X,
  XCircle,
} from 'lucide-react'
import { AnalyticsToggleButton, CollapsibleAnalytics, useAnalyticsDisclosure } from '@/components/AnalyticsDisclosure'
import { companyChangeEvent, companyScopedKey, getActiveCompany } from '@/lib/tenant/company'
import { withCsrfHeaders } from '@/lib/security/csrfClient'
import { useVoiceIntent } from '@/lib/voice/intent'

const font = 'var(--font-body)'
const rfqsKey = 'flowsys-procurement-rfqs'
const suppliersKey = 'flowsys-suppliers'
const projectsKey = 'wiseflow-project-management-state'

type StoredRow = Record<string, unknown>
type RfqStatus = 'Draft' | 'Open' | 'Pending Evaluation' | 'Awarded' | 'Cancelled' | 'Closed'
type ViewMode = 'table' | 'cards'

type SupplierOption = {
  id: string
  name: string
  email: string
}

type ProjectOption = {
  id: string
  name: string
}

type RfqItem = {
  id: string
  description: string
  sku: string
  unit: string
  quantity: string
  notes: string
}

type AttachmentRecord = {
  id: string
  name: string
  size: string
  type: string
}

type NormalizedRfq = {
  id: string
  rfqNumber: string
  title: string
  category: string
  issueDate: string
  closingDate: string
  status: RfqStatus
  suppliersInvited: number
  quotations: number
  estimatedValue: number
  description: string
  supplierNames: string[]
  items: string[]
  activity: string[]
  source: StoredRow
}

type RfqForm = {
  title: string
  category: string
  issueDate: string
  closingDate: string
  estimatedValue: string
  projectId: string
  referenceNotes: string
  paymentTerms: string
  currency: string
  deliveryTerms: string
  deliveryLocation: string
  description: string
}

const emptyForm: RfqForm = {
  title: '',
  category: '',
  issueDate: todayInput(),
  closingDate: '',
  estimatedValue: '',
  projectId: '',
  referenceNotes: '',
  paymentTerms: '',
  currency: 'PHP',
  deliveryTerms: '',
  deliveryLocation: '',
  description: '',
}

const statusConfig: Record<RfqStatus, { tone: string; label: string }> = {
  Draft: { tone: 'gray', label: 'Draft' },
  Open: { tone: 'blue', label: 'Open' },
  'Pending Evaluation': { tone: 'orange', label: 'Pending Evaluation' },
  Awarded: { tone: 'green', label: 'Awarded' },
  Cancelled: { tone: 'red', label: 'Cancelled' },
  Closed: { tone: 'gray', label: 'Closed' },
}

const categoryOptions = [
  'Construction Materials',
  'Office Equipment',
  'Mechanical',
  'Electrical',
  'Safety',
  'IT & Software',
  'Plumbing',
  'Finishing',
  'General Procurement',
]

const paymentTermOptions = ['COD', '7 Days', '15 Days', '30 Days', '45 Days', '60 Days']
const currencyOptions = [
  { value: 'PHP', label: 'PHP - Philippine Peso' },
  { value: 'USD', label: 'USD - US Dollar' },
  { value: 'EUR', label: 'EUR - Euro' },
]
const deliveryTermOptions = ['FOB', 'CIF', 'Delivered Duty Paid', 'Supplier Delivery', 'Pickup']
const deliveryLocationOptions = ['Main Warehouse', 'Project Site', 'Head Office', 'Supplier Pickup']

export default function RFQsPage() {
  const [companyId, setCompanyId] = useState('')
  const [storedRfqs, setStoredRfqs] = useState<StoredRow[]>([])
  const [suppliers, setSuppliers] = useState<SupplierOption[]>([])
  const [projects, setProjects] = useState<ProjectOption[]>([])
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')
  const [categoryFilter, setCategoryFilter] = useState('All')
  const [dateFilter, setDateFilter] = useState('All')
  const [activeTab, setActiveTab] = useState('All')
  const [viewMode, setViewMode] = useState<ViewMode>('table')
  const [showFilters, setShowFilters] = useState(false)
  const [showCreate, setShowCreate] = useState(false)
  const [selectedId, setSelectedId] = useState('')
  const [detailRfqId, setDetailRfqId] = useState('')
  const [openActionId, setOpenActionId] = useState('')
  const [actionMenuPos, setActionMenuPos] = useState<{ top: number; left: number } | null>(null)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [form, setForm] = useState<RfqForm>(emptyForm)
  const [invitedSupplierIds, setInvitedSupplierIds] = useState<string[]>([])
  const [inviteRfqId, setInviteRfqId] = useState('')
  const [inviteSelection, setInviteSelection] = useState<string[]>([])
  const [flash, setFlash] = useState('')
  const [manualLinks, setManualLinks] = useState<Array<{ name: string; url: string }>>([])
  const [copiedLink, setCopiedLink] = useState('')
  const [publishing, setPublishing] = useState(false)
  const [quotationCounts, setQuotationCounts] = useState<Record<string, number>>({})
  const [requestedItems, setRequestedItems] = useState<RfqItem[]>([])
  const [attachments, setAttachments] = useState<AttachmentRecord[]>([])
  const analytics = useAnalyticsDisclosure('wiseflow:analytics:procurement-rfqs')
  const importItemsRef = useRef<HTMLInputElement | null>(null)
  const attachmentRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    const load = () => {
      const activeCompany = getActiveCompany()
      const activeCompanyId = activeCompany?.id || ''
      setCompanyId(activeCompanyId)
      setStoredRfqs(loadRows(rfqsKey, activeCompanyId))
      setSuppliers(loadSuppliers(activeCompanyId))
      setProjects(loadProjects(activeCompanyId))
    }

    load()
    window.addEventListener('storage', load)
    window.addEventListener('focus', load)
    window.addEventListener(companyChangeEvent, load)
    return () => {
      window.removeEventListener('storage', load)
      window.removeEventListener('focus', load)
      window.removeEventListener(companyChangeEvent, load)
    }
  }, [])

  const refreshQuotations = useMemo(() => async () => {
    if (!companyId) return
    try {
      const response = await fetch(`/api/procurement/quotations?companyId=${encodeURIComponent(companyId)}`, { headers: { 'x-wiseflow-company-id': companyId }, cache: 'no-store' })
      const payload = await response.json().catch(() => null) as { ok?: boolean; quotations?: Array<{ rfqId: string }>; notifications?: Array<{ read?: boolean; message?: string }> } | null
      if (!response.ok || !payload?.ok) return
      const counts: Record<string, number> = {}
      for (const quote of payload.quotations || []) counts[quote.rfqId] = (counts[quote.rfqId] || 0) + 1
      setQuotationCounts(counts)
      const unread = (payload.notifications || []).filter(note => !note.read)
      if (unread.length) setFlash(unread.length === 1 ? (unread[0].message || 'A supplier submitted a quotation.') : `${unread.length} new supplier quotations received.`)
    } catch {
      // Quotations are a server enhancement; ignore fetch failures.
    }
  }, [companyId])

  useEffect(() => { void refreshQuotations() }, [refreshQuotations])

  useVoiceIntent('new-rfq', () => setShowCreate(true))

  // The row action menu is rendered with fixed positioning (see toggleActionMenu)
  // so the table's scroll container can't clip it. Close it on scroll/resize/outside click.
  useEffect(() => {
    if (!openActionId) return
    const close = () => setOpenActionId('')
    window.addEventListener('scroll', close, true)
    window.addEventListener('resize', close)
    window.addEventListener('click', close)
    return () => {
      window.removeEventListener('scroll', close, true)
      window.removeEventListener('resize', close)
      window.removeEventListener('click', close)
    }
  }, [openActionId])

  const rfqs = useMemo(() => storedRfqs.map((rfq, index) => normalizeRfq(rfq, index)).filter(Boolean) as NormalizedRfq[], [storedRfqs])
  const categories = useMemo(() => uniqueValues([...categoryOptions, ...rfqs.map(rfq => rfq.category).filter(Boolean)]), [rfqs])
  const activeFilterCount = [statusFilter, categoryFilter, dateFilter].filter(value => value !== 'All').length

  const stats = useMemo(() => {
    const count = (status: RfqStatus) => rfqs.filter(rfq => rfq.status === status).length
    const totalInvited = rfqs.reduce((sum, rfq) => sum + rfq.suppliersInvited, 0)
    const totalQuotations = rfqs.reduce((sum, rfq) => sum + rfq.quotations, 0)
    const totalValue = rfqs.reduce((sum, rfq) => sum + rfq.estimatedValue, 0)
    return {
      total: rfqs.length,
      open: count('Open'),
      pending: count('Pending Evaluation'),
      awarded: count('Awarded'),
      cancelled: count('Cancelled'),
      closed: count('Closed'),
      totalValue,
      avgQuotes: rfqs.length ? totalQuotations / rfqs.length : 0,
      responseRate: totalInvited ? Math.round((totalQuotations / totalInvited) * 100) : 0,
      totalInvited,
      totalQuotations,
    }
  }, [rfqs])

  const tabs = useMemo(() => [
    { label: 'All', count: rfqs.length },
    { label: 'Open', count: stats.open },
    { label: 'Pending Evaluation', count: stats.pending },
    { label: 'Awarded', count: stats.awarded },
    { label: 'Cancelled', count: stats.cancelled },
    { label: 'Closed', count: stats.closed },
  ], [rfqs.length, stats])

  const filteredRfqs = useMemo(() => {
    const needle = search.trim().toLowerCase()
    return rfqs.filter(rfq => {
      const matchesSearch = !needle || [
        rfq.rfqNumber,
        rfq.title,
        rfq.category,
        rfq.description,
        ...rfq.items,
      ].some(value => value.toLowerCase().includes(needle))
      const matchesTab = activeTab === 'All' || rfq.status === activeTab
      const matchesStatus = statusFilter === 'All' || rfq.status === statusFilter
      const matchesCategory = categoryFilter === 'All' || rfq.category === categoryFilter
      const matchesDate = dateFilter === 'All' || isInDateFilter(rfq.issueDate, dateFilter)
      return matchesSearch && matchesTab && matchesStatus && matchesCategory && matchesDate
    })
  }, [activeTab, categoryFilter, dateFilter, rfqs, search, statusFilter])

  const totalPages = Math.max(1, Math.ceil(filteredRfqs.length / pageSize))
  const currentPage = Math.min(page, totalPages)
  const pageStart = filteredRfqs.length ? (currentPage - 1) * pageSize + 1 : 0
  const pageEnd = Math.min(currentPage * pageSize, filteredRfqs.length)
  const visibleRfqs = filteredRfqs.slice((currentPage - 1) * pageSize, currentPage * pageSize)
  const selectedRfq = rfqs.find(rfq => rfq.id === selectedId) || visibleRfqs[0] || filteredRfqs[0]
  const detailRfq = rfqs.find(rfq => rfq.id === detailRfqId)
  const statusDistribution = useMemo(() => tabs.filter(tab => tab.label !== 'All' && tab.count > 0), [tabs])
  const recentActivity = useMemo(() => rfqs.flatMap(rfq => {
    const entries = rfq.activity.length ? rfq.activity : [`${rfq.rfqNumber} is ${rfq.status.toLowerCase()}`]
    return entries.slice(0, 2).map(entry => ({ id: `${rfq.id}-${entry}`, rfq, entry }))
  }).slice(0, 5), [rfqs])
  const rfqNumber = useMemo(() => nextRfqNumber(rfqs), [rfqs])
  const selectedProject = projects.find(project => project.id === form.projectId)
  const selectedSuppliers = suppliers.filter(supplier => invitedSupplierIds.includes(supplier.id))
  const rfqSummary = useMemo(() => {
    const totalQuantity = requestedItems.reduce((sum, item) => sum + numberValue(item.quantity), 0)
    const responseDueDays = daysBetween(form.issueDate, form.closingDate)
    return {
      totalItems: requestedItems.length,
      totalQuantity,
      suppliersInvited: invitedSupplierIds.length,
      responseDueDays,
      estimatedAmount: moneyValue(form.estimatedValue),
    }
  }, [form.closingDate, form.estimatedValue, form.issueDate, invitedSupplierIds.length, requestedItems])

  function persist(nextRfqs: StoredRow[]) {
    const unique = uniqueRows(nextRfqs)
    setStoredRfqs(unique)
    persistRows(rfqsKey, unique, companyId)
  }

  function openRfqDetails(rfq: NormalizedRfq) {
    setSelectedId(rfq.id)
    setDetailRfqId(rfq.id)
    setOpenActionId('')
  }

  function resetFilters() {
    setSearch('')
    setStatusFilter('All')
    setCategoryFilter('All')
    setDateFilter('All')
    setActiveTab('All')
    setPage(1)
  }

  function addSupplierToInvite() {
    const nextSupplier = suppliers.find(supplier => !invitedSupplierIds.includes(supplier.id))
    if (nextSupplier) setInvitedSupplierIds(previous => [...previous, nextSupplier.id])
  }

  function toggleSupplierInvite(supplierId: string) {
    setInvitedSupplierIds(previous => previous.includes(supplierId)
      ? previous.filter(id => id !== supplierId)
      : [...previous, supplierId])
  }

  function addRequestedItem() {
    setRequestedItems(previous => [
      ...previous,
      {
        id: `rfq-item-${Date.now()}-${previous.length}`,
        description: '',
        sku: '',
        unit: '',
        quantity: '',
        notes: '',
      },
    ])
  }

  function updateRequestedItem(id: string, patch: Partial<RfqItem>) {
    setRequestedItems(previous => previous.map(item => item.id === id ? { ...item, ...patch } : item))
  }

  function handleImportItems(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      const rows = String(reader.result || '').split(/\r?\n/).map(line => line.trim()).filter(Boolean)
      const imported = rows.slice(rows[0]?.toLowerCase().includes('item') ? 1 : 0).map((line, index) => {
        const [description, sku, unit, quantity, notes] = line.split(',').map(value => value.trim())
        return {
          id: `rfq-import-${Date.now()}-${index}`,
          description: description || '',
          sku: sku || '',
          unit: unit || '',
          quantity: quantity || '',
          notes: notes || '',
        }
      }).filter(item => item.description)
      if (imported.length) setRequestedItems(previous => [...previous, ...imported])
      event.target.value = ''
    }
    reader.readAsText(file)
  }

  function addAttachments(files: FileList | File[]) {
    const next = Array.from(files).map(file => ({
      id: `rfq-attachment-${Date.now()}-${file.name}`,
      name: file.name,
      size: formatFileSize(file.size),
      type: file.type || 'file',
    }))
    setAttachments(previous => [...previous, ...next])
  }

  function resetCreateForm() {
    setForm({ ...emptyForm, issueDate: todayInput() })
    setInvitedSupplierIds([])
    setRequestedItems([])
    setAttachments([])
  }

  function saveRfq(status: RfqStatus) {
    const title = form.title.trim() || (status === 'Draft' ? `Draft ${rfqNumber}` : '')
    if (!title) return
    const now = new Date()
    const itemNames = requestedItems.map(item => item.description.trim()).filter(Boolean)
    const record: StoredRow = {
      id: `rfq-${Date.now()}`,
      companyId,
      rfqNumber,
      title,
      category: form.category || 'General Procurement',
      issueDate: form.issueDate || now.toISOString(),
      closingDate: form.closingDate,
      status,
      suppliersInvited: invitedSupplierIds.length,
      quotations: 0,
      estimatedValue: rfqSummary.estimatedAmount,
      description: form.description.trim() || itemNames.join(', '),
      projectId: form.projectId,
      projectName: selectedProject?.name || '',
      referenceNotes: form.referenceNotes,
      paymentTerms: form.paymentTerms,
      currency: form.currency,
      deliveryTerms: form.deliveryTerms,
      deliveryLocation: form.deliveryLocation,
      supplierIds: invitedSupplierIds,
      supplierNames: selectedSuppliers.map(supplier => supplier.name),
      items: requestedItems.map(item => ({
        name: item.description,
        description: item.description,
        sku: item.sku,
        unit: item.unit,
        quantity: numberValue(item.quantity),
        notes: item.notes,
      })),
      attachments,
      activity: [`RFQ ${status.toLowerCase()} on ${formatDate(now.toISOString())}`],
      createdAt: now.toISOString(),
    }
    persist([record, ...storedRfqs])
    setSelectedId(String(record.id))
    resetCreateForm()
    setShowCreate(false)
  }

  function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    saveRfq('Open')
  }

  function updateStatus(rfq: NormalizedRfq, status: RfqStatus) {
    const next = storedRfqs.map(record => {
      const normalized = normalizeRfq(record, 0)
      if (!normalized || normalized.id !== rfq.id) return record
      return {
        ...record,
        status,
        activity: [`Status changed to ${status} on ${formatDate(new Date().toISOString())}`, ...readStringArray(record.activity)],
        updatedAt: new Date().toISOString(),
      }
    })
    persist(next)
    setOpenActionId('')
  }

  function toggleActionMenu(rfqId: string, event: ReactMouseEvent<HTMLButtonElement>) {
    if (openActionId === rfqId) {
      setOpenActionId('')
      return
    }
    const rect = event.currentTarget.getBoundingClientRect()
    const menuWidth = 184
    const menuHeight = 268
    const openUp = window.innerHeight - rect.bottom < menuHeight + 16
    setActionMenuPos({
      top: openUp ? Math.max(8, rect.top - menuHeight - 6) : rect.bottom + 6,
      left: Math.max(8, Math.min(rect.right - menuWidth, window.innerWidth - menuWidth - 8)),
    })
    setOpenActionId(rfqId)
  }

  function openInviteSuppliers(rfq: NormalizedRfq) {
    setInviteRfqId(rfq.id)
    setInviteSelection(readStringArray(rfq.source.supplierIds))
    setOpenActionId('')
  }

  function toggleInviteSelection(supplierId: string) {
    setInviteSelection(previous => previous.includes(supplierId)
      ? previous.filter(id => id !== supplierId)
      : [...previous, supplierId])
  }

  async function sendInvites() {
    if (!inviteRfqId) return
    const targetId = inviteRfqId
    const invited = suppliers.filter(supplier => inviteSelection.includes(supplier.id))
    const names = invited.map(supplier => supplier.name)
    const rfq = rfqs.find(item => item.id === targetId)
    const status: RfqStatus = rfq?.status === 'Draft' ? 'Open' : (rfq?.status || 'Open')

    // Local record keeps the buyer's list instant + offline-friendly.
    const next = storedRfqs.map(record => {
      const normalized = normalizeRfq(record, 0)
      if (!normalized || normalized.id !== targetId) return record
      return {
        ...record,
        supplierIds: inviteSelection,
        supplierNames: names,
        suppliersInvited: inviteSelection.length,
        status,
        activity: [
          `Sent RFQ to ${inviteSelection.length} supplier${inviteSelection.length === 1 ? '' : 's'} on ${formatDate(new Date().toISOString())}`,
          ...readStringArray(record.activity),
        ],
        updatedAt: new Date().toISOString(),
      }
    })
    persist(next)
    setSelectedId(targetId)
    setInviteRfqId('')
    setInviteSelection([])

    // Publish server-side + email each supplier a tokenized response link.
    setPublishing(true)
    try {
      const items = rfq ? readArray(rfq.source.items).map((raw, index) => {
        const item = isRecord(raw) ? raw : {}
        return {
          id: textFrom(item.id) || `item-${index + 1}`,
          name: textFrom(item.name) || textFrom(item.description) || `Item ${index + 1}`,
          quantity: numberValue(item.quantity),
          unit: textFrom(item.unit),
          details: textFrom(item.specifications) || textFrom(item.notes),
        }
      }) : []
      const response = await fetch(`/api/procurement/rfqs/publish?companyId=${encodeURIComponent(companyId)}`, {
        method: 'POST',
        headers: withCsrfHeaders({ 'Content-Type': 'application/json', 'x-wiseflow-company-id': companyId }),
        body: JSON.stringify({
          companyName: getActiveCompany()?.name || 'WiseFlow',
          rfq: { id: targetId, rfqNumber: rfq?.rfqNumber || targetId, title: rfq?.title || 'Request for Quotation', currency: textFrom(rfq?.source.currency) || 'PHP', closingDate: rfq?.closingDate || '', status, items },
          suppliers: invited.map(supplier => ({ supplierId: supplier.id, name: supplier.name, email: supplier.email })),
        }),
      })
      const payload = await response.json().catch(() => null) as { ok?: boolean; emailResults?: Array<{ name: string; sent: boolean; reason?: string; url?: string }>; error?: string } | null
      if (!response.ok || !payload?.ok) {
        setFlash(`Suppliers recorded, but the RFQ could not be published: ${payload?.error || 'server error'}.`)
        setManualLinks([])
      } else {
        const results = payload.emailResults || []
        const sent = results.filter(item => item.sent).length
        const failed = results.filter(item => !item.sent)
        // When email can't be sent (provider not configured / no supplier email),
        // surface the secure response link so the buyer can share it manually.
        setManualLinks(failed.filter(item => item.url).map(item => ({ name: item.name, url: item.url as string })))
        setFlash(sent === results.length && sent > 0
          ? `RFQ link emailed to ${sent} supplier${sent === 1 ? '' : 's'}.`
          : `RFQ published. ${sent} email${sent === 1 ? '' : 's'} sent${failed.length ? `; ${failed.length} link${failed.length === 1 ? '' : 's'} ready to share below (email not configured).` : '.'}`)
      }
    } catch (error) {
      setFlash(`Suppliers recorded locally, but publishing failed: ${error instanceof Error ? error.message : 'network error'}.`)
    } finally {
      setPublishing(false)
    }
  }

  async function copyShareLink(url: string, button: HTMLButtonElement) {
    // Select the field first so the user can always Ctrl+C even if the
    // programmatic copy is blocked (clipboard API needs a secure context +
    // clipboard-write permission, which some embedded/iframe views deny).
    const input = button.closest('.rfq-share-row')?.querySelector('input') as HTMLInputElement | null
    if (input) { input.focus(); input.select() }
    let ok = false
    try {
      if (navigator.clipboard?.writeText) { await navigator.clipboard.writeText(url); ok = true }
    } catch {
      ok = false
    }
    if (!ok && input) {
      try { ok = document.execCommand('copy') } catch { ok = false }
    }
    setCopiedLink(ok ? url : `select:${url}`)
  }

  return (
    <main className="rfq-page" style={{ fontFamily: font }}>
      <style>{rfqCss}</style>

      {flash && (
        <div className="rfq-flash" role="status">
          <span>{flash}</span>
          <button type="button" aria-label="Dismiss" onClick={() => setFlash('')}><X size={15} /></button>
        </div>
      )}

      {manualLinks.length > 0 && (
        <div className="rfq-share-links">
          <div className="rfq-share-head">
            <strong>Supplier response links</strong>
            <button type="button" aria-label="Dismiss links" onClick={() => { setManualLinks([]); setCopiedLink('') }}><X size={15} /></button>
          </div>
          <p>Email isn&apos;t configured yet, so share these secure links with each supplier. Each link opens their RFQ price form — no login needed.</p>
          {manualLinks.map(link => (
            <div className="rfq-share-row" key={link.url}>
              <span className="rfq-share-name">{link.name}</span>
              <input readOnly value={link.url} onFocus={event => event.currentTarget.select()} />
              <button type="button" className="rfq-outline-button" onClick={event => void copyShareLink(link.url, event.currentTarget)}>{copiedLink === link.url ? 'Copied' : copiedLink === `select:${link.url}` ? 'Press Ctrl+C' : 'Copy'}</button>
            </div>
          ))}
        </div>
      )}

      <section className="rfq-page-head">
        <div>
          <div className="rfq-breadcrumb">
            <span>Procurement</span>
            <span>/</span>
            <strong>RFQs</strong>
          </div>
          <div className="rfq-title-row">
            <span className="rfq-title-icon"><FileText size={22} /></span>
            <div>
              <h1>Request for Quotations (RFQs) <Star size={18} /></h1>
              <p>Create and manage RFQs to collect quotations from suppliers.</p>
            </div>
          </div>
        </div>
        <div className="rfq-actions">
          <AnalyticsToggleButton open={analytics.open} onToggle={analytics.toggle} panelId={analytics.panelId} className="rfq-secondary-button" />
          <button type="button" className="rfq-secondary-button" onClick={() => setViewMode(viewMode === 'table' ? 'cards' : 'table')}>
            <Grid3X3 size={16} /> Views <ChevronDown size={14} />
          </button>
          <button type="button" className="rfq-secondary-button" onClick={() => setShowFilters(value => !value)}>
            <Filter size={16} /> Filters <span>{activeFilterCount}</span>
          </button>
          <button type="button" className="rfq-icon-button" aria-label="Reset RFQ filters" onClick={resetFilters}>
            <MoreHorizontal size={18} />
          </button>
          <button type="button" className="rfq-primary-button" onClick={() => setShowCreate(true)}>
            <Plus size={17} /> New RFQ <ChevronDown size={14} />
          </button>
        </div>
      </section>

      <section className="rfq-grid-shell">
        <div className="rfq-left">
          <CollapsibleAnalytics open={analytics.open} id={analytics.panelId}>
            <section className="rfq-stats" aria-label="RFQ summary">
              <KpiCard title="Total RFQs" value={String(stats.total)} helper="All time" icon={FileText} tone="green" />
              <KpiCard title="Open RFQs" value={String(stats.open)} helper={stats.total ? `${percent(stats.open, stats.total)} of total` : 'No open RFQs'} icon={Send} tone="purple" />
              <KpiCard title="Pending Evaluation" value={String(stats.pending)} helper={stats.total ? `${percent(stats.pending, stats.total)} of total` : 'No pending evaluation'} icon={Clock3} tone="blue" />
              <KpiCard title="Awarded" value={String(stats.awarded)} helper={stats.total ? `${percent(stats.awarded, stats.total)} of total` : 'No awarded RFQs'} icon={CheckCircle2} tone="orange" />
              <KpiCard title="Cancelled" value={String(stats.cancelled)} helper={stats.total ? `${percent(stats.cancelled, stats.total)} of total` : 'No cancelled RFQs'} icon={XCircle} tone="red" />
            </section>
          </CollapsibleAnalytics>

          <section className="rfq-tabs" aria-label="RFQ status tabs">
            {tabs.map(tab => (
              <button
                key={tab.label}
                type="button"
                className={activeTab === tab.label ? 'active' : ''}
                onClick={() => { setActiveTab(tab.label); setPage(1) }}
              >
                {tab.label} <span>{tab.count}</span>
              </button>
            ))}
          </section>

          <section className="rfq-workspace">
            <div className="rfq-toolbar">
              <label className="rfq-search">
                <Search size={17} />
                <input value={search} onChange={event => { setSearch(event.target.value); setPage(1) }} placeholder="Search by RFQ number, title, or item..." aria-label="Search RFQs" />
              </label>
              <SelectControl label="Status" value={statusFilter} onChange={value => { setStatusFilter(value); setPage(1) }} options={['All', ...Object.keys(statusConfig)]} />
              <SelectControl label="Category" value={categoryFilter} onChange={value => { setCategoryFilter(value); setPage(1) }} options={['All', ...categories]} />
              <SelectControl label="Date Range" value={dateFilter} onChange={value => { setDateFilter(value); setPage(1) }} options={['All', 'This Month', 'Last 30 Days', 'This Year']} />
              <button type="button" className="rfq-secondary-button compact" onClick={() => setShowFilters(value => !value)}>
                <Filter size={16} /> More filters
              </button>
              <div className="rfq-view-toggle">
                <button type="button" className={viewMode === 'table' ? 'active' : ''} onClick={() => setViewMode('table')} aria-label="Table view"><Grid3X3 size={16} /></button>
                <button type="button" className={viewMode === 'cards' ? 'active' : ''} onClick={() => setViewMode('cards')} aria-label="Cards view"><BarChart3 size={16} /></button>
              </div>
            </div>

            {showFilters && (
              <div className="rfq-filter-panel">
                <SelectControl label="Status" value={statusFilter} onChange={value => { setStatusFilter(value); setPage(1) }} options={['All', ...Object.keys(statusConfig)]} />
                <SelectControl label="Category" value={categoryFilter} onChange={value => { setCategoryFilter(value); setPage(1) }} options={['All', ...categories]} />
                <SelectControl label="Date Range" value={dateFilter} onChange={value => { setDateFilter(value); setPage(1) }} options={['All', 'This Month', 'Last 30 Days', 'This Year']} />
                <button type="button" className="rfq-secondary-button" onClick={resetFilters}>Reset filters</button>
              </div>
            )}

            {rfqs.length === 0 ? (
              <EmptyRfqs onCreate={() => setShowCreate(true)} />
            ) : (
              <div className="rfq-list-card">
                {viewMode === 'table' ? (
                  <div className="rfq-table-wrap">
                    <table className="rfq-table">
                      <thead>
                        <tr>
                          <th aria-label="Select RFQ"></th>
                          <th>RFQ Number</th>
                          <th>Title</th>
                          <th>Category</th>
                          <th>Issue Date</th>
                          <th>Closing Date</th>
                          <th>Status</th>
                          <th>Suppliers Invited</th>
                          <th>Quotations</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {visibleRfqs.map(rfq => (
                          <tr key={rfq.id} className={selectedRfq?.id === rfq.id ? 'selected' : ''} onClick={() => openRfqDetails(rfq)}>
                            <td data-label="Select" onClick={event => event.stopPropagation()}><input type="checkbox" checked={selectedRfq?.id === rfq.id} onChange={() => setSelectedId(rfq.id)} aria-label={`Select ${rfq.rfqNumber}`} /></td>
                            <td data-label="RFQ Number"><button type="button" className="rfq-link-button" onClick={event => { event.stopPropagation(); openRfqDetails(rfq) }}>{rfq.rfqNumber}</button></td>
                            <td data-label="Title"><button type="button" className="rfq-title-button" onClick={event => { event.stopPropagation(); openRfqDetails(rfq) }}><strong>{rfq.title}</strong><small>{rfq.items.slice(0, 3).join(', ') || rfq.description}</small></button></td>
                            <td data-label="Category">{rfq.category}</td>
                            <td data-label="Issue Date">{formatDate(rfq.issueDate)}</td>
                            <td data-label="Closing Date">{formatDate(rfq.closingDate)}</td>
                            <td data-label="Status"><Badge tone={statusConfig[rfq.status].tone}>{statusConfig[rfq.status].label}</Badge></td>
                            <td data-label="Suppliers Invited">{rfq.suppliersInvited}</td>
                            <td data-label="Quotations">{Math.max(rfq.quotations, quotationCounts[rfq.id] || 0)}</td>
                            <td data-label="Actions">
                              <div className="rfq-row-actions" onClick={event => event.stopPropagation()}>
                                <button type="button" aria-label={`Open actions for ${rfq.rfqNumber}`} onClick={event => toggleActionMenu(rfq.id, event)}>
                                  <MoreHorizontal size={16} />
                                </button>
                                {openActionId === rfq.id && actionMenuPos && (
                                  <div className="rfq-action-menu" style={{ position: 'fixed', top: actionMenuPos.top, left: actionMenuPos.left, right: 'auto' }}>
                                    <button type="button" onClick={() => openRfqDetails(rfq)}>Open details</button>
                                    <button type="button" onClick={() => openInviteSuppliers(rfq)}>Invite suppliers</button>
                                    <button type="button" onClick={() => updateStatus(rfq, 'Pending Evaluation')}>Start evaluation</button>
                                    <button type="button" onClick={() => updateStatus(rfq, 'Awarded')}>Mark awarded</button>
                                    <button type="button" onClick={() => updateStatus(rfq, 'Closed')}>Close RFQ</button>
                                    <button type="button" onClick={() => updateStatus(rfq, 'Cancelled')}>Cancel RFQ</button>
                                  </div>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="rfq-card-grid">
                    {visibleRfqs.map(rfq => (
                      <article key={rfq.id} className={`rfq-card${selectedRfq?.id === rfq.id ? ' selected' : ''}`} onClick={() => openRfqDetails(rfq)}>
                        <div>
                          <strong>{rfq.rfqNumber}</strong>
                          <Badge tone={statusConfig[rfq.status].tone}>{rfq.status}</Badge>
                        </div>
                        <h3>{rfq.title}</h3>
                        <p>{rfq.category} / closes {formatDate(rfq.closingDate)}</p>
                        <div className="rfq-card-meta">
                          <span>{rfq.suppliersInvited} suppliers</span>
                          <strong>{rfq.quotations} quotes</strong>
                        </div>
                      </article>
                    ))}
                  </div>
                )}

                {filteredRfqs.length === 0 && (
                  <div className="rfq-inline-empty">
                    <strong>No matching RFQs</strong>
                    <span>Adjust search or filters to see more records.</span>
                    <button type="button" onClick={resetFilters}>Clear filters</button>
                  </div>
                )}

                <div className="rfq-pagination">
                  <span>Showing {pageStart} to {pageEnd} of {filteredRfqs.length} entries</span>
                  <div>
                    <button type="button" disabled={currentPage === 1} onClick={() => setPage(value => Math.max(1, value - 1))} aria-label="Previous page">&lt;</button>
                    <strong>{currentPage}</strong>
                    <button type="button" disabled={currentPage === totalPages} onClick={() => setPage(value => Math.min(totalPages, value + 1))} aria-label="Next page">&gt;</button>
                    <select value={pageSize} onChange={event => { setPageSize(Number(event.target.value)); setPage(1) }} aria-label="Rows per page">
                      {[10, 25, 50].map(size => <option key={size} value={size}>{size} / page</option>)}
                    </select>
                  </div>
                </div>
              </div>
            )}
          </section>
        </div>

        <aside className="rfq-right">
          <section className="rfq-side-card">
            <div className="rfq-card-title">
              <h2>RFQ Overview</h2>
              <SelectControl label="" value={dateFilter} onChange={setDateFilter} options={['All', 'This Month', 'Last 30 Days', 'This Year']} compact />
            </div>
            <MetricBlock label="Total RFQ Value (Est.)" value={formatCurrency(stats.totalValue)} helper={`From ${stats.open} open RFQs`} />
            <MetricBlock label="Average Quotations per RFQ" value={stats.avgQuotes.toFixed(1)} />
            <MetricBlock label="Response Rate" value={`${stats.responseRate}%`} helper={`${stats.totalQuotations} of ${stats.totalInvited} invited suppliers responded`} progress={stats.responseRate} />
          </section>

          <section className="rfq-side-card">
            <h2>Status Distribution</h2>
            <div className="rfq-donut" aria-label="RFQ status distribution">
              <PieChart size={82} />
            </div>
            <div className="rfq-status-list">
              {statusDistribution.length ? statusDistribution.map(item => (
                <div key={item.label}>
                  <span><i className={`dot ${statusConfig[item.label as RfqStatus].tone}`} />{item.label}</span>
                  <strong>{item.count} ({percent(item.count, stats.total)})</strong>
                </div>
              )) : <p>No RFQ statuses yet.</p>}
            </div>
          </section>

          <section className="rfq-side-card">
            <div className="rfq-card-title">
              <h2>Recent Activity</h2>
              <button type="button" onClick={resetFilters}>View all</button>
            </div>
            <div className="rfq-activity">
              {recentActivity.length ? recentActivity.map(activity => (
                <button key={activity.id} type="button" onClick={() => openRfqDetails(activity.rfq)}>
                  <span className={`rfq-activity-icon ${statusConfig[activity.rfq.status].tone}`}><FileText size={14} /></span>
                  <span>
                    <strong>{activity.rfq.rfqNumber}</strong>
                    <small>{activity.entry}</small>
                  </span>
                </button>
              )) : <p>No RFQ activity yet.</p>}
            </div>
          </section>

          {selectedRfq && (
            <section className="rfq-side-card">
              <div className="rfq-card-title">
                <h2>{selectedRfq.rfqNumber}</h2>
                <button type="button" onClick={() => setSelectedId('')}><X size={16} /></button>
              </div>
              <Badge tone={statusConfig[selectedRfq.status].tone}>{selectedRfq.status}</Badge>
              <div className="rfq-detail-lines">
                <DetailRow label="Title" value={selectedRfq.title} />
                <DetailRow label="Category" value={selectedRfq.category} />
                <DetailRow label="Closing Date" value={formatDate(selectedRfq.closingDate)} />
                <DetailRow label="Suppliers" value={String(selectedRfq.suppliersInvited)} />
                <DetailRow label="Quotations" value={String(selectedRfq.quotations)} />
                <DetailRow label="Estimated Value" value={formatCurrency(selectedRfq.estimatedValue)} />
              </div>
              <p>{selectedRfq.description || 'No description recorded.'}</p>
            </section>
          )}
        </aside>
      </section>

      {detailRfq && (
        <RfqDetailsModal
          rfq={detailRfq}
          onClose={() => setDetailRfqId('')}
          onStatusChange={status => updateStatus(detailRfq, status)}
          onInvite={() => { openInviteSuppliers(detailRfq); setDetailRfqId('') }}
        />
      )}

      {inviteRfqId && (
        <div className="rfq-drawer-backdrop rfq-invite-backdrop" role="presentation" onMouseDown={() => setInviteRfqId('')}>
          <aside className="rfq-invite-modal" role="dialog" aria-modal="true" aria-labelledby="invite-suppliers-title" onMouseDown={event => event.stopPropagation()}>
            <div className="rfq-drawer-head">
              <div className="rfq-title-row">
                <span className="rfq-title-icon purple"><Send size={20} /></span>
                <div>
                  <h2 id="invite-suppliers-title">Invite suppliers</h2>
                  <p>Select suppliers to send this RFQ to. They&apos;ll be invited to submit quotations.</p>
                </div>
              </div>
              <button type="button" aria-label="Close invite suppliers" onClick={() => setInviteRfqId('')}><X size={20} /></button>
            </div>
            <div className="rfq-invite-body">
              {suppliers.length ? (
                <div className="rfq-supplier-grid">
                  {suppliers.map(supplier => (
                    <label key={supplier.id} className={inviteSelection.includes(supplier.id) ? 'selected' : ''}>
                      <input type="checkbox" checked={inviteSelection.includes(supplier.id)} onChange={() => toggleInviteSelection(supplier.id)} />
                      <span>{supplier.name}</span>
                    </label>
                  ))}
                </div>
              ) : (
                <div className="rfq-empty-box">
                  <Send size={34} />
                  <strong>No suppliers available</strong>
                  <span>Add suppliers in the Supplier Database first, then come back to invite them.</span>
                </div>
              )}
            </div>
            <div className="rfq-invite-foot">
              <span>{inviteSelection.length} selected</span>
              <div>
                <button type="button" className="rfq-secondary-button" onClick={() => setInviteRfqId('')}>Cancel</button>
                <button type="button" className="rfq-primary-button" disabled={!inviteSelection.length || publishing} onClick={() => void sendInvites()}>
                  <Send size={15} /> {publishing ? 'Sending…' : `Send RFQ${inviteSelection.length ? ` to ${inviteSelection.length} supplier${inviteSelection.length === 1 ? '' : 's'}` : ''}`}
                </button>
              </div>
            </div>
          </aside>
        </div>
      )}

      {showCreate && (
        <div className="rfq-drawer-backdrop" role="presentation" onMouseDown={() => setShowCreate(false)}>
          <aside className="rfq-create-drawer" role="dialog" aria-modal="true" aria-labelledby="create-rfq-title" onMouseDown={event => event.stopPropagation()}>
            <div className="rfq-drawer-head">
              <div>
                <div className="rfq-breadcrumb">
                  <span>Procurement</span>
                  <span>/</span>
                  <span>RFQs</span>
                  <span>/</span>
                  <strong>New RFQ</strong>
                </div>
                <div className="rfq-title-row">
                  <span className="rfq-title-icon purple"><Send size={22} /></span>
                  <div>
                    <h2 id="create-rfq-title">New Request for Quotation (RFQ)</h2>
                    <p>Create a new RFQ to invite suppliers and collect their quotations.</p>
                  </div>
                </div>
              </div>
              <button type="button" aria-label="Close RFQ form" onClick={() => setShowCreate(false)}><X size={20} /></button>
            </div>

            <form className="rfq-create-layout" onSubmit={handleCreate}>
              <div className="rfq-create-main">
                <section className="rfq-form-card">
                  <h3>RFQ Information</h3>
                  <div className="rfq-form-grid">
                    <label>
                      RFQ Number
                      <input value={rfqNumber} readOnly />
                      <small>Auto-generated</small>
                    </label>
                    <label>
                      Issue Date <sup>*</sup>
                      <input type="date" value={form.issueDate} onChange={event => setForm({ ...form, issueDate: event.target.value })} required />
                    </label>
                    <label>
                      Closing Date <sup>*</sup>
                      <input type="date" value={form.closingDate} onChange={event => setForm({ ...form, closingDate: event.target.value })} required />
                    </label>
                    <label className="wide-full">
                      Title <sup>*</sup>
                      <input value={form.title} onChange={event => setForm({ ...form, title: event.target.value })} placeholder="Enter RFQ title" required />
                    </label>
                    <label>
                      Category <sup>*</sup>
                      <select value={form.category} onChange={event => setForm({ ...form, category: event.target.value })} required>
                        <option value="">Select category</option>
                        {categoryOptions.map(category => <option key={category} value={category}>{category}</option>)}
                      </select>
                    </label>
                    <label>
                      Project (Optional)
                      <select value={form.projectId} onChange={event => setForm({ ...form, projectId: event.target.value })}>
                        <option value="">Select project</option>
                        {projects.map(project => <option key={project.id} value={project.id}>{project.name}</option>)}
                      </select>
                    </label>
                    <label>
                      Reference / Notes
                      <textarea value={form.referenceNotes} onChange={event => setForm({ ...form, referenceNotes: event.target.value })} placeholder="Enter reference or notes (optional)" />
                    </label>
                    <label>
                      Payment Terms
                      <select value={form.paymentTerms} onChange={event => setForm({ ...form, paymentTerms: event.target.value })}>
                        <option value="">Select payment terms</option>
                        {paymentTermOptions.map(term => <option key={term} value={term}>{term}</option>)}
                      </select>
                    </label>
                    <label>
                      Currency <sup>*</sup>
                      <select value={form.currency} onChange={event => setForm({ ...form, currency: event.target.value })}>
                        {currencyOptions.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
                      </select>
                    </label>
                    <label>
                      Delivery Terms
                      <select value={form.deliveryTerms} onChange={event => setForm({ ...form, deliveryTerms: event.target.value })}>
                        <option value="">Select delivery terms</option>
                        {deliveryTermOptions.map(term => <option key={term} value={term}>{term}</option>)}
                      </select>
                    </label>
                    <label>
                      Delivery Location
                      <select value={form.deliveryLocation} onChange={event => setForm({ ...form, deliveryLocation: event.target.value })}>
                        <option value="">Select delivery location</option>
                        {deliveryLocationOptions.map(location => <option key={location} value={location}>{location}</option>)}
                      </select>
                    </label>
                    <label>
                      Attachment (Optional)
                      <span className="rfq-attach-inline">
                        <button type="button" className="rfq-secondary-button" onClick={() => attachmentRef.current?.click()}><Paperclip size={15} /> Attach files</button>
                        <small>Max file size: 10MB each</small>
                      </span>
                    </label>
                  </div>
                </section>

                <section className="rfq-form-card">
                  <div className="rfq-card-title">
                    <div>
                      <h3>Invite Suppliers</h3>
                      <p>Select suppliers to invite for this RFQ. They will receive an invitation to submit their quotations.</p>
                    </div>
                    <button type="button" className="rfq-outline-button" onClick={addSupplierToInvite}><Plus size={15} /> Add Supplier</button>
                  </div>
                  {suppliers.length ? (
                    <div className="rfq-supplier-grid">
                      {suppliers.map(supplier => (
                        <label key={supplier.id} className={invitedSupplierIds.includes(supplier.id) ? 'selected' : ''}>
                          <input type="checkbox" checked={invitedSupplierIds.includes(supplier.id)} onChange={() => toggleSupplierInvite(supplier.id)} />
                          <span>{supplier.name}</span>
                        </label>
                      ))}
                    </div>
                  ) : (
                    <div className="rfq-empty-box">
                      <Send size={34} />
                      <strong>No suppliers added yet</strong>
                      <span>Add suppliers in Supplier Database, then invite them for this RFQ.</span>
                    </div>
                  )}
                </section>

                <section className="rfq-form-card">
                  <div className="rfq-card-title">
                    <div>
                      <h3>Items Requested</h3>
                      <p>Add the items or materials you need quotations for.</p>
                    </div>
                    <div className="rfq-form-actions compact">
                      <button type="button" className="rfq-outline-button" onClick={addRequestedItem}><Plus size={15} /> Add Item</button>
                      <button type="button" className="rfq-secondary-button" onClick={() => importItemsRef.current?.click()}>Import Items</button>
                      <input ref={importItemsRef} type="file" accept=".csv,text/csv" hidden onChange={handleImportItems} />
                    </div>
                  </div>
                  {requestedItems.length ? (
                    <div className="rfq-items-table-wrap">
                      <table className="rfq-items-table">
                        <thead>
                          <tr>
                            <th>#</th>
                            <th>Item / Description</th>
                            <th>SKU (Optional)</th>
                            <th>Unit</th>
                            <th>Quantity</th>
                            <th>Additional Notes</th>
                            <th>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {requestedItems.map((item, index) => (
                            <tr key={item.id}>
                              <td data-label="#">{index + 1}</td>
                              <td data-label="Item"><input value={item.description} onChange={event => updateRequestedItem(item.id, { description: event.target.value })} placeholder="Item description" /></td>
                              <td data-label="SKU"><input value={item.sku} onChange={event => updateRequestedItem(item.id, { sku: event.target.value })} placeholder="SKU" /></td>
                              <td data-label="Unit"><input value={item.unit} onChange={event => updateRequestedItem(item.id, { unit: event.target.value })} placeholder="pcs" /></td>
                              <td data-label="Quantity"><input inputMode="decimal" value={item.quantity} onChange={event => updateRequestedItem(item.id, { quantity: event.target.value })} placeholder="0" /></td>
                              <td data-label="Notes"><input value={item.notes} onChange={event => updateRequestedItem(item.id, { notes: event.target.value })} placeholder="Optional notes" /></td>
                              <td data-label="Actions"><button type="button" className="rfq-icon-button danger" onClick={() => setRequestedItems(previous => previous.filter(row => row.id !== item.id))}><X size={15} /></button></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="rfq-empty-box compact">
                      <Package size={32} />
                      <strong>No items added yet</strong>
                      <span>Add items to specify what you need quotations for.</span>
                    </div>
                  )}
                </section>
              </div>

              <aside className="rfq-create-side">
                <section className="rfq-side-card">
                  <h2>RFQ Summary</h2>
                  <SummaryLine label="Total Items" value={String(rfqSummary.totalItems)} />
                  <SummaryLine label="Total Quantity" value={String(rfqSummary.totalQuantity)} />
                  <SummaryLine label="Suppliers Invited" value={String(rfqSummary.suppliersInvited)} />
                  <SummaryLine label="Closing Date" value={formatDate(form.closingDate)} />
                  <SummaryLine label="Response Due In" value={rfqSummary.responseDueDays > 0 ? `${rfqSummary.responseDueDays} days` : '-'} />
                  <div className="rfq-total-line">
                    <strong>Estimated Amount</strong>
                    <strong>{rfqSummary.estimatedAmount ? formatCurrency(rfqSummary.estimatedAmount) : '-'}</strong>
                  </div>
                </section>

                <section className="rfq-side-card">
                  <h2>RFQ Workflow</h2>
                  <div className="rfq-workflow">
                    {['RFQ Created', 'Awaiting Quotations', 'Evaluate Quotations', 'Award'].map((step, index) => (
                      <div key={step}>
                        <span>{index + 1}</span>
                        <p><strong>{step}</strong><small>{index === 0 ? 'Create and send RFQ to suppliers' : index === 1 ? 'Suppliers submit their quotations' : index === 2 ? 'Compare and evaluate received quotes' : 'Select winning quotation and convert to PO'}</small></p>
                      </div>
                    ))}
                  </div>
                </section>

                <section className="rfq-side-card">
                  <h2>Attachments</h2>
                  <div className="rfq-dropzone" onClick={() => attachmentRef.current?.click()} onDragOver={event => event.preventDefault()} onDrop={event => { event.preventDefault(); addAttachments(event.dataTransfer.files) }} role="button" tabIndex={0}>
                    <CloudUpload size={30} />
                    <strong>Drag and drop files here</strong>
                    <span>or click to browse</span>
                    <small>PDF, JPG, PNG (max. 10MB)</small>
                  </div>
                  <input ref={attachmentRef} type="file" multiple hidden onChange={event => event.target.files && addAttachments(event.target.files)} />
                  {attachments.length ? (
                    <div className="rfq-attachment-list">
                      {attachments.map(file => (
                        <div key={file.id}>
                          <span>{file.name}</span>
                          <button type="button" onClick={() => setAttachments(previous => previous.filter(item => item.id !== file.id))}><X size={14} /></button>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </section>
              </aside>

              <footer className="rfq-create-footer">
                <button type="button" className="rfq-secondary-button" onClick={() => setShowCreate(false)}>Cancel</button>
                <div>
                  <button type="button" className="rfq-secondary-button" onClick={() => saveRfq('Draft')}>Save as Draft</button>
                  <button type="submit" className="rfq-primary-button">Create RFQ <ChevronDown size={14} /></button>
                </div>
              </footer>
            </form>
          </aside>
        </div>
      )}
    </main>
  )
}

function KpiCard({ title, value, helper, icon: Icon, tone }: { title: string; value: string; helper: string; icon: ComponentType<{ size?: number }>; tone: string }) {
  return (
    <article className="rfq-kpi">
      <span className={`rfq-kpi-icon ${tone}`}><Icon size={22} /></span>
      <div>
        <span>{title}</span>
        <strong>{value}</strong>
        <small>{helper}</small>
      </div>
    </article>
  )
}

function SelectControl({ label, value, options, onChange, compact = false }: { label: string; value: string; options: string[]; onChange: (value: string) => void; compact?: boolean }) {
  return (
    <label className={`rfq-select${compact ? ' compact' : ''}`}>
      {label ? <span>{label}:</span> : null}
      <select value={value} onChange={event => onChange(event.target.value)}>
        {options.map(option => <option key={option} value={option}>{option}</option>)}
      </select>
    </label>
  )
}

function Badge({ tone, children }: { tone: string; children: React.ReactNode }) {
  return <span className={`rfq-badge ${tone}`}>{children}</span>
}

function MetricBlock({ label, value, helper, progress }: { label: string; value: string; helper?: string; progress?: number }) {
  return (
    <div className="rfq-metric-block">
      <span>{label}</span>
      <strong>{value}</strong>
      {typeof progress === 'number' ? <i><b style={{ width: `${Math.max(0, Math.min(100, progress))}%` }} /></i> : null}
      {helper ? <small>{helper}</small> : null}
    </div>
  )
}

function RfqDetailsModal({ rfq, onClose, onStatusChange, onInvite }: { rfq: NormalizedRfq; onClose: () => void; onStatusChange: (status: RfqStatus) => void; onInvite: () => void }) {
  const itemRows = readArray(rfq.source.items).filter(isRecord)
  const items = itemRows.length
    ? itemRows.map((item, index) => ({
      id: textFrom(item.id) || `${rfq.id}-item-${index}`,
      name: textFrom(item.name) || textFrom(item.description) || textFrom(item.itemName) || `Item ${index + 1}`,
      quantity: textFrom(item.quantity) || textFrom(item.qty),
      unit: textFrom(item.unit) || textFrom(item.uom),
      details: textFrom(item.specifications) || textFrom(item.details) || textFrom(item.notes),
      requiredDate: textFrom(item.requiredDate) || textFrom(item.neededBy) || textFrom(item.dueDate),
    }))
    : rfq.items.map((item, index) => ({
      id: `${rfq.id}-item-${index}`,
      name: item,
      quantity: '',
      unit: '',
      details: '',
      requiredDate: '',
    }))
  const suppliers = rfq.supplierNames.length ? rfq.supplierNames : readArray(rfq.source.suppliers).map(item => isRecord(item) ? textFrom(item.name) || textFrom(item.supplierName) : textFrom(item)).filter(Boolean)
  const attachments = readArray(rfq.source.attachments).map(item => isRecord(item) ? textFrom(item.name) || textFrom(item.fileName) : textFrom(item)).filter(Boolean)
  const projectName = textFrom(rfq.source.projectName)
  const purchaseRequestNo = textFrom(rfq.source.purchaseRequestNo)

  return (
    <div className="rfq-detail-backdrop" role="presentation" onMouseDown={onClose}>
      <section className="rfq-detail-modal" role="dialog" aria-modal="true" aria-labelledby="rfq-detail-title" onMouseDown={event => event.stopPropagation()}>
        <div className="rfq-detail-modal-head">
          <div>
            <span>Request for Quotation</span>
            <h2 id="rfq-detail-title">{rfq.rfqNumber}</h2>
            <p>{rfq.title}</p>
          </div>
          <button type="button" aria-label="Close RFQ details" onClick={onClose}><X size={20} /></button>
        </div>

        <div className="rfq-detail-modal-body">
          <section className="rfq-detail-summary-card">
            <div>
              <Badge tone={statusConfig[rfq.status].tone}>{rfq.status}</Badge>
              <strong>{formatCurrency(rfq.estimatedValue)}</strong>
              <span>Estimated value</span>
            </div>
            <div>
              <strong>{rfq.suppliersInvited}</strong>
              <span>Suppliers invited</span>
            </div>
            <div>
              <strong>{rfq.quotations}</strong>
              <span>Quotations</span>
            </div>
          </section>

          <section className="rfq-detail-section">
            <h3>RFQ Information</h3>
            <div className="rfq-detail-lines modal">
              <DetailRow label="Title" value={rfq.title} />
              <DetailRow label="Category" value={rfq.category} />
              <DetailRow label="Issue Date" value={formatDate(rfq.issueDate)} />
              <DetailRow label="Closing Date" value={formatDate(rfq.closingDate)} />
              {projectName ? <DetailRow label="Project" value={projectName} /> : null}
              {purchaseRequestNo ? <DetailRow label="Purchase Request" value={purchaseRequestNo} /> : null}
              <DetailRow label="Payment Terms" value={textFrom(rfq.source.paymentTerms) || '-'} />
              <DetailRow label="Delivery Terms" value={textFrom(rfq.source.deliveryTerms) || '-'} />
              <DetailRow label="Delivery Location" value={textFrom(rfq.source.deliveryLocation) || '-'} />
            </div>
            <p>{rfq.description || textFrom(rfq.source.referenceNotes) || 'No description recorded.'}</p>
          </section>

          <section className="rfq-detail-section">
            <h3>Requested Items</h3>
            <div className="rfq-detail-items">
              {items.length ? items.map(item => (
                <article key={item.id}>
                  <strong>{item.name}</strong>
                  <span>{[item.quantity, item.unit].filter(Boolean).join(' ') || 'Quantity not specified'}</span>
                  {item.details ? <p>{item.details}</p> : null}
                  {item.requiredDate ? <small>Required by {formatDate(item.requiredDate)}</small> : null}
                </article>
              )) : <p>No item details recorded.</p>}
            </div>
          </section>

          <section className="rfq-detail-section split">
            <div>
              <h3>Suppliers</h3>
              <div className="rfq-detail-chip-list">
                {suppliers.length ? suppliers.map(supplier => <span key={supplier}>{supplier}</span>) : <p>No suppliers invited yet.</p>}
              </div>
            </div>
            <div>
              <h3>Attachments</h3>
              <div className="rfq-detail-chip-list">
                {attachments.length ? attachments.map(file => <span key={file}>{file}</span>) : <p>No attachments uploaded.</p>}
              </div>
            </div>
          </section>

          <section className="rfq-detail-section">
            <h3>Activity</h3>
            <div className="rfq-detail-activity">
              {rfq.activity.length ? rfq.activity.map(entry => <span key={entry}>{entry}</span>) : <span>{rfq.rfqNumber} is {rfq.status.toLowerCase()}.</span>}
            </div>
          </section>
        </div>

        <div className="rfq-detail-modal-actions">
          <button type="button" className="rfq-outline-button rfq-detail-invite" onClick={onInvite}><Send size={15} /> Invite suppliers</button>
          <button type="button" className="rfq-secondary-button" onClick={() => onStatusChange('Pending Evaluation')}>Start evaluation</button>
          <button type="button" className="rfq-secondary-button" onClick={() => onStatusChange('Awarded')}>Mark awarded</button>
          <button type="button" className="rfq-primary-button" onClick={() => onStatusChange('Closed')}>Close RFQ</button>
        </div>
      </section>
    </div>
  )
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rfq-detail-row">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  )
}

function SummaryLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="rfq-summary-line">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  )
}

function EmptyRfqs({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="rfq-empty">
      <span><FileText size={46} /></span>
      <h2>No RFQs yet</h2>
      <p>Create RFQs to collect supplier quotations, evaluate responses, and award purchasing decisions.</p>
      <button type="button" className="rfq-primary-button" onClick={onCreate}><Plus size={17} /> New RFQ</button>
    </div>
  )
}

function loadRows(key: string, companyId: string) {
  const scoped = companyId ? companyScopedKey(key, companyId) : key
  const scopedRows = scoped === key ? [] : readStored(scoped)
  const globalRows = readStored(key)
  const globalForCompany = scopedRows.length ? globalRows.filter(row => textFrom(row.companyId) === companyId) : globalRows
  const rows = scopedRows.length ? [...scopedRows, ...globalForCompany] : globalForCompany
  return uniqueRows(rows).filter(row => {
    const rowCompanyId = textFrom(row.companyId)
    return !companyId || !rowCompanyId || rowCompanyId === companyId
  })
}

function persistRows(key: string, rows: StoredRow[], companyId: string) {
  if (typeof window === 'undefined') return
  const unique = uniqueRows(rows)
  window.localStorage.setItem(key, JSON.stringify(unique))
  if (companyId) window.localStorage.setItem(companyScopedKey(key, companyId), JSON.stringify(unique))
  window.dispatchEvent(new Event('storage'))
}

function readStored(key: string): StoredRow[] {
  if (typeof window === 'undefined') return []
  try {
    const parsed = JSON.parse(window.localStorage.getItem(key) || '[]') as unknown
    return Array.isArray(parsed) ? parsed.filter(isRecord) : []
  } catch {
    return []
  }
}

function loadSuppliers(companyId: string) {
  return loadRows(suppliersKey, companyId).map((row, index) => ({
    id: textFrom(row.id) || textFrom(row.name) || `supplier-${index}`,
    name: textFrom(row.name) || textFrom(row.supplierName) || 'Unnamed supplier',
    email: (textFrom(row.email) || textFrom(row.contactEmail) || textFrom(row.emailAddress) || '').toLowerCase(),
  }))
}

function loadProjects(companyId: string) {
  const state = readJson(projectsKey)
  const projects = Array.isArray(state?.projects) ? state.projects.filter(isRecord) : []
  return projects
    .filter(project => !companyId || !textFrom(project.companyId) || textFrom(project.companyId) === companyId)
    .map((project, index) => ({
      id: textFrom(project.id) || `project-${index}`,
      name: textFrom(project.name) || 'Untitled project',
    }))
}

function normalizeRfq(row: StoredRow, index: number): NormalizedRfq | null {
  const rfqNumber = textFrom(row.rfqNumber) || textFrom(row.number) || textFrom(row.reference) || `RFQ-${String(index + 1).padStart(4, '0')}`
  const title = textFrom(row.title) || textFrom(row.subject) || textFrom(row.name) || 'Untitled RFQ'
  const suppliersInvited = numberValue(row.suppliersInvited ?? row.invitedSuppliers ?? row.supplierCount)
  const quotations = numberValue(row.quotations ?? row.quoteCount ?? row.responses)
  const items = readArray(row.items).map(item => {
    if (isRecord(item)) return textFrom(item.name) || textFrom(item.description) || textFrom(item.item)
    return textFrom(item)
  }).filter(Boolean)

  return {
    id: textFrom(row.id) || rfqNumber,
    rfqNumber,
    title,
    category: textFrom(row.category) || textFrom(row.type) || 'General Procurement',
    issueDate: textFrom(row.issueDate) || textFrom(row.date) || textFrom(row.createdAt),
    closingDate: textFrom(row.closingDate) || textFrom(row.expiresAt) || textFrom(row.validUntil) || textFrom(row.dueDate),
    status: normalizeStatus(textFrom(row.status)),
    suppliersInvited,
    quotations,
    estimatedValue: moneyValue(row.estimatedValue ?? row.value ?? row.total ?? row.amount),
    description: textFrom(row.description) || textFrom(row.notes),
    supplierNames: readArray(row.supplierNames).map(textFrom).filter(Boolean),
    items,
    activity: readStringArray(row.activity),
    source: row,
  }
}

function normalizeStatus(value: string): RfqStatus {
  const normalized = value.toLowerCase()
  if (normalized.includes('draft')) return 'Draft'
  if (normalized.includes('cancel')) return 'Cancelled'
  if (normalized.includes('award')) return 'Awarded'
  if (normalized.includes('pending') || normalized.includes('evaluat')) return 'Pending Evaluation'
  if (normalized.includes('closed') || normalized.includes('complete')) return 'Closed'
  return 'Open'
}

function nextRfqNumber(rfqs: NormalizedRfq[]) {
  const year = new Date().getFullYear()
  const next = rfqs.reduce((max, rfq) => {
    const match = rfq.rfqNumber.match(/(\d+)$/)
    return match ? Math.max(max, Number(match[1])) : max
  }, 0) + 1
  return `RFQ-${year}-${String(next).padStart(4, '0')}`
}

function uniqueRows(rows: StoredRow[]) {
  const seen = new Set<string>()
  return rows.filter((row, index) => {
    const key = textFrom(row.id) || textFrom(row.rfqNumber) || textFrom(row.reference) || String(index)
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

function readArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : []
}

function readJson(key: string) {
  if (typeof window === 'undefined') return null
  try {
    return JSON.parse(window.localStorage.getItem(key) || 'null') as StoredRow | null
  } catch {
    return null
  }
}

function readStringArray(value: unknown) {
  return readArray(value).map(item => String(item)).filter(Boolean)
}

function isRecord(value: unknown): value is StoredRow {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value))
}

function textFrom(value: unknown) {
  if (typeof value === 'string') return value.trim()
  if (typeof value === 'number' && Number.isFinite(value)) return String(value)
  return ''
}

function moneyValue(value: unknown) {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string') {
    const parsed = Number(value.replace(/[^0-9.-]/g, ''))
    return Number.isFinite(parsed) ? parsed : 0
  }
  return 0
}

function numberValue(value: unknown) {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string') {
    const parsed = Number(value.replace(/[^0-9.-]/g, ''))
    return Number.isFinite(parsed) ? parsed : 0
  }
  return 0
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', maximumFractionDigits: 2 }).format(value).replace('PHP', 'Php')
}

function formatDate(value: string) {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(date)
}

function formatFileSize(size: number) {
  if (size < 1024) return `${size} B`
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`
  return `${(size / (1024 * 1024)).toFixed(1)} MB`
}

function todayInput() {
  return new Date().toISOString().slice(0, 10)
}

function daysBetween(start: string, end: string) {
  if (!start || !end) return 0
  const startDate = new Date(start)
  const endDate = new Date(end)
  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) return 0
  return Math.max(0, Math.ceil((endDate.getTime() - startDate.getTime()) / 86400000))
}

function isInDateFilter(value: string, filter: string) {
  if (!value) return false
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return false
  const now = new Date()
  if (filter === 'This Month') return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear()
  if (filter === 'This Year') return date.getFullYear() === now.getFullYear()
  if (filter === 'Last 30 Days') {
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - 30)
    return date >= cutoff
  }
  return true
}

function uniqueValues(values: string[]) {
  return [...new Set(values)].sort((a, b) => a.localeCompare(b))
}

function percent(value: number, total: number) {
  if (!total) return '0%'
  return `${Math.round((value / total) * 100)}%`
}

const rfqCss = `
.rfq-page {
  min-height: 100%;
  padding: 28px;
  color: #0f172a;
}
.rfq-page-head,
.rfq-title-row,
.rfq-actions,
.rfq-toolbar,
.rfq-filter-panel,
.rfq-pagination,
.rfq-pagination > div,
.rfq-card-meta,
.rfq-card > div:first-child,
.rfq-card-title,
.rfq-detail-row,
.rfq-status-list div {
  display: flex;
  align-items: center;
}
.rfq-page-head {
  justify-content: space-between;
  gap: 20px;
  margin-bottom: 24px;
}
.rfq-breadcrumb {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #000000;
  font-size: 12px;
  margin-bottom: 10px;
}
.rfq-breadcrumb strong {
  color: #0f172a;
}
.rfq-title-row {
  gap: 14px;
}
.rfq-title-icon {
  width: 42px;
  height: 42px;
  border-radius: 13px;
  background: #dcfce7;
  color: #16a34a;
  display: grid;
  place-items: center;
}
.rfq-title-row h1 {
  margin: 0;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: clamp(25px, 2.3vw, 34px);
  line-height: 1.1;
  letter-spacing: -0.03em;
}
.rfq-title-row h1 svg {
  color: #000000;
}
.rfq-title-row p {
  margin: 8px 0 0;
  color: #000000;
  font-size: 14px;
}
.rfq-actions {
  gap: 10px;
  flex-wrap: wrap;
  justify-content: flex-end;
}
.rfq-primary-button,
.rfq-secondary-button,
.rfq-outline-button,
.rfq-icon-button,
.rfq-row-actions > button,
.rfq-view-toggle button,
.rfq-pagination button,
.rfq-pagination select,
.rfq-link-button,
.rfq-drawer-head button,
.rfq-card-title button,
.rfq-inline-empty button {
  min-height: 42px;
  border-radius: 11px;
  border: 1px solid #e5e7eb;
  background: #fff;
  color: #0f172a;
  font: inherit;
  font-size: 13px;
  font-weight: 800;
  cursor: pointer;
}
.rfq-primary-button,
.rfq-secondary-button,
.rfq-outline-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 9px;
  padding: 0 15px;
}
.rfq-outline-button {
  min-height: 38px;
  border: 1px solid #86efac;
  background: #fff;
  color: #16a34a;
}
.rfq-primary-button {
  background: #16a34a;
  border-color: #16a34a;
  color: #fff;
}
.rfq-secondary-button span {
  min-width: 24px;
  height: 24px;
  border-radius: 999px;
  display: inline-grid;
  place-items: center;
  background: #6366f1;
  color: #fff;
  font-size: 12px;
}
.rfq-icon-button,
.rfq-row-actions > button,
.rfq-drawer-head button {
  width: 42px;
  display: grid;
  place-items: center;
}
.rfq-grid-shell {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(300px, 360px);
  gap: 16px;
}
.rfq-left {
  min-width: 0;
}
.rfq-right {
  display: grid;
  gap: 16px;
  align-content: start;
}
.rfq-stats {
  display: grid;
  grid-template-columns: repeat(5, minmax(145px, 1fr));
  gap: 16px;
  margin-bottom: 18px;
}
.rfq-kpi,
.rfq-workspace,
.rfq-side-card,
.rfq-create-drawer {
  background: #fff;
  border: 1px solid #e5e7eb;
  box-shadow: 0 14px 34px rgba(15, 23, 42, 0.05);
}
.rfq-kpi {
  min-height: 112px;
  border-radius: 16px;
  padding: 18px;
  display: flex;
  align-items: center;
  gap: 15px;
}
.rfq-kpi-icon {
  width: 52px;
  height: 52px;
  border-radius: 13px;
  display: grid;
  place-items: center;
}
.rfq-kpi-icon.green { background: #dcfce7; color: #16a34a; }
.rfq-kpi-icon.purple { background: #f3e8ff; color: #7c3aed; }
.rfq-kpi-icon.blue { background: #dbeafe; color: #2563eb; }
.rfq-kpi-icon.orange { background: #ffedd5; color: #f97316; }
.rfq-kpi-icon.red { background: #fee2e2; color: #ef4444; }
.rfq-kpi span:not(.rfq-kpi-icon) {
  display: block;
  color: #000000;
  font-size: 12px;
  font-weight: 800;
}
.rfq-kpi strong {
  display: block;
  margin-top: 6px;
  font-size: 22px;
  line-height: 1;
}
.rfq-kpi small {
  display: block;
  margin-top: 8px;
  color: #000000;
  font-size: 12px;
}
.rfq-tabs {
  display: flex;
  gap: 30px;
  overflow-x: auto;
  border-bottom: 1px solid #e5e7eb;
}
.rfq-tabs button {
  min-height: 48px;
  border: 0;
  border-bottom: 2px solid transparent;
  background: transparent;
  color: #334155;
  font: inherit;
  font-size: 13px;
  font-weight: 850;
  cursor: pointer;
  white-space: nowrap;
}
.rfq-tabs button.active {
  color: #111827;
  border-color: #16a34a;
}
.rfq-tabs span {
  color: #000000;
  margin-left: 6px;
  font-size: 12px;
}
.rfq-workspace {
  border-radius: 0 0 16px 16px;
  overflow: visible;
}
.rfq-toolbar {
  gap: 12px;
  padding: 16px;
  border-bottom: 1px solid #e5e7eb;
}
.rfq-search {
  min-width: 220px;
  flex: 1 1 340px;
  height: 44px;
  border: 1px solid #e5e7eb;
  border-radius: 11px;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 0 13px;
  color: #000000;
  background: #fff;
}
.rfq-search input,
.rfq-select select,
.rfq-form input,
.rfq-form select,
.rfq-form textarea {
  width: 100%;
  border: 0;
  outline: 0;
  background: transparent;
  font: inherit;
  color: #0f172a;
}
.rfq-select {
  min-width: 145px;
  height: 44px;
  border: 1px solid #e5e7eb;
  border-radius: 11px;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 0 12px;
  background: #fff;
  font-size: 13px;
  font-weight: 800;
}
.rfq-select.compact {
  min-width: 118px;
  height: 36px;
  font-size: 12px;
}
.rfq-select span {
  white-space: nowrap;
}
.rfq-view-toggle {
  margin-left: auto;
  display: inline-flex;
  border: 1px solid #e5e7eb;
  border-radius: 11px;
  overflow: hidden;
}
.rfq-view-toggle button {
  width: 42px;
  border: 0;
  border-radius: 0;
}
.rfq-view-toggle button.active {
  color: #16a34a;
  background: #ecfdf5;
}
.rfq-filter-panel {
  gap: 12px;
  flex-wrap: wrap;
  padding: 14px 16px;
  border-bottom: 1px solid #e5e7eb;
  background: #f8fafc;
}
.rfq-list-card {
  min-width: 0;
  padding: 16px;
}
.rfq-table-wrap {
  min-width: 0;
  overflow: auto;
  border: 1px solid #edf2f7;
  border-radius: 12px;
}
.rfq-table {
  width: 100%;
  min-width: 1040px;
  border-collapse: collapse;
}
.rfq-table th,
.rfq-table td {
  padding: 14px 12px;
  text-align: left;
  border-bottom: 1px solid #e5e7eb;
  font-size: 12px;
  vertical-align: middle;
}
.rfq-table th {
  background: #f8fafc;
  color: #000000;
  text-transform: uppercase;
  font-size: 10px;
  letter-spacing: .02em;
}
.rfq-table tr.selected,
.rfq-table tr:hover {
  background: #f0fdf4;
}
.rfq-table tbody tr {
  cursor: pointer;
}
.rfq-table td small {
  display: block;
  color: #000000;
  margin-top: 4px;
  max-width: 190px;
}
.rfq-link-button,
.rfq-title-button {
  border: 0;
  background: transparent;
  cursor: pointer;
  font: inherit;
  padding: 0;
  text-align: left;
}
.rfq-link-button {
  color: #2563eb;
  font-size: 12px;
  font-weight: 900;
}
.rfq-title-button {
  color: inherit;
}
.rfq-title-button strong,
.rfq-title-button small {
  display: block;
}
.rfq-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 24px;
  padding: 0 9px;
  border-radius: 8px;
  font-size: 10px;
  font-weight: 900;
  text-transform: uppercase;
  white-space: nowrap;
}
.rfq-badge.green { background: #dcfce7; color: #15803d; }
.rfq-badge.blue { background: #dbeafe; color: #2563eb; }
.rfq-badge.orange { background: #ffedd5; color: #f97316; }
.rfq-badge.red { background: #fee2e2; color: #ef4444; }
.rfq-badge.gray { background: #f1f5f9; color: #000000; }
.rfq-row-actions {
  position: relative;
}
.rfq-action-menu {
  position: absolute;
  top: 46px;
  right: 0;
  z-index: 120;
  width: 184px;
  padding: 8px;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  background: #fff;
  box-shadow: 0 20px 45px rgba(15, 23, 42, 0.16);
}
.rfq-action-menu button {
  width: 100%;
  min-height: 36px;
  border: 0;
  border-radius: 9px;
  background: transparent;
  text-align: left;
  padding: 0 10px;
  font: inherit;
  font-size: 12px;
  font-weight: 800;
  cursor: pointer;
}
.rfq-action-menu button:hover {
  background: #f1f5f9;
}
.rfq-card-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(230px, 1fr));
  gap: 12px;
}
.rfq-card {
  border: 1px solid #e5e7eb;
  border-radius: 14px;
  padding: 15px;
  cursor: pointer;
  background: #fff;
}
.rfq-card.selected {
  border-color: #16a34a;
  box-shadow: 0 0 0 3px #dcfce7;
}
.rfq-card > div:first-child,
.rfq-card-meta {
  justify-content: space-between;
  gap: 8px;
}
.rfq-card h3 {
  margin: 12px 0 6px;
  font-size: 15px;
}
.rfq-card p,
.rfq-card-meta {
  color: #000000;
  font-size: 12px;
}
.rfq-card-meta {
  margin-top: 14px;
}
.rfq-card-meta strong {
  color: #0f172a;
}
.rfq-pagination {
  justify-content: space-between;
  gap: 12px;
  padding-top: 16px;
  font-size: 13px;
  font-weight: 800;
}
.rfq-pagination > div {
  gap: 8px;
}
.rfq-pagination button {
  width: 38px;
}
.rfq-pagination button:disabled {
  opacity: .45;
  cursor: not-allowed;
}
.rfq-pagination strong {
  width: 38px;
  height: 38px;
  border-radius: 10px;
  display: grid;
  place-items: center;
  background: #16a34a;
  color: #fff;
}
.rfq-pagination select {
  padding: 0 10px;
}
.rfq-empty,
.rfq-inline-empty {
  min-height: 430px;
  display: grid;
  place-items: center;
  text-align: center;
  padding: 44px 18px;
}
.rfq-empty > span {
  width: 118px;
  height: 118px;
  border-radius: 999px;
  display: grid;
  place-items: center;
  margin-bottom: 18px;
  background: #eff6ff;
  color: #000000;
}
.rfq-empty h2 {
  margin: 0;
  font-size: 19px;
}
.rfq-empty p {
  max-width: 360px;
  color: #000000;
  font-size: 13px;
  line-height: 1.55;
}
.rfq-inline-empty {
  min-height: 220px;
  gap: 7px;
}
.rfq-inline-empty span {
  color: #000000;
  font-size: 13px;
}
.rfq-inline-empty button {
  padding: 0 16px;
}
.rfq-side-card {
  border-radius: 16px;
  padding: 16px;
}
.rfq-side-card h2 {
  margin: 0;
  font-size: 15px;
}
.rfq-card-title {
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 14px;
}
.rfq-card-title button {
  min-height: 34px;
  padding: 0 10px;
  font-size: 12px;
}
.rfq-metric-block {
  display: grid;
  gap: 6px;
  padding: 10px 0;
  border-bottom: 1px solid #e5e7eb;
}
.rfq-metric-block span,
.rfq-metric-block small {
  color: #000000;
  font-size: 12px;
}
.rfq-metric-block strong {
  font-size: 19px;
}
.rfq-metric-block i {
  height: 6px;
  display: block;
  border-radius: 999px;
  overflow: hidden;
  background: #e5e7eb;
}
.rfq-metric-block b {
  display: block;
  height: 100%;
  background: #16a34a;
}
.rfq-donut {
  height: 112px;
  display: grid;
  place-items: center;
  color: #2563eb;
}
.rfq-status-list {
  display: grid;
  gap: 8px;
}
.rfq-status-list div {
  justify-content: space-between;
  gap: 12px;
  font-size: 12px;
}
.rfq-status-list span {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: #000000;
}
.rfq-status-list strong {
  font-size: 12px;
}
.dot {
  width: 8px;
  height: 8px;
  border-radius: 99px;
  display: inline-block;
}
.dot.green { background: #16a34a; }
.dot.blue { background: #2563eb; }
.dot.orange { background: #f97316; }
.dot.red { background: #ef4444; }
.dot.gray { background: #64748b; }
.rfq-activity {
  display: grid;
  gap: 8px;
}
.rfq-activity button {
  display: grid;
  grid-template-columns: 34px minmax(0, 1fr);
  gap: 10px;
  min-height: 52px;
  padding: 8px;
  border: 0;
  border-radius: 10px;
  background: transparent;
  text-align: left;
  cursor: pointer;
}
.rfq-activity button:hover {
  background: #f8fafc;
}
.rfq-activity-icon {
  width: 34px;
  height: 34px;
  border-radius: 9px;
  display: grid;
  place-items: center;
}
.rfq-activity-icon.green { background: #dcfce7; color: #16a34a; }
.rfq-activity-icon.blue { background: #dbeafe; color: #2563eb; }
.rfq-activity-icon.orange { background: #ffedd5; color: #f97316; }
.rfq-activity-icon.red { background: #fee2e2; color: #ef4444; }
.rfq-activity-icon.gray { background: #f1f5f9; color: #000000; }
.rfq-activity strong,
.rfq-activity small {
  display: block;
}
.rfq-activity small {
  color: #000000;
  font-size: 11px;
  margin-top: 3px;
}
.rfq-detail-lines {
  display: grid;
  gap: 6px;
  margin: 14px 0;
}
.rfq-detail-row {
  justify-content: space-between;
  gap: 12px;
  font-size: 12px;
}
.rfq-detail-row span {
  color: #000000;
}
.rfq-side-card p {
  color: #000000;
  font-size: 13px;
  line-height: 1.45;
}
.rfq-detail-backdrop {
  position: fixed;
  inset: 0;
  z-index: 90;
  display: grid;
  place-items: center;
  padding: 24px;
  background: rgba(15, 23, 42, .48);
}
.rfq-detail-modal {
  width: min(920px, 100%);
  max-height: min(820px, calc(100vh - 48px));
  display: grid;
  grid-template-rows: auto minmax(0, 1fr) auto;
  border: 1px solid #dbe3ef;
  border-radius: 16px;
  overflow: hidden;
  background: #fff;
  box-shadow: 0 28px 80px rgba(15, 23, 42, .28);
}
.rfq-detail-modal-head,
.rfq-detail-modal-actions {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  padding: 18px 22px;
  border-bottom: 1px solid #e5e7eb;
}
.rfq-detail-modal-head span {
  color: #16a34a;
  font-size: 11px;
  font-weight: 900;
  text-transform: uppercase;
}
.rfq-detail-modal-head h2 {
  margin: 5px 0 0;
  font-size: 24px;
}
.rfq-detail-modal-head p {
  margin: 6px 0 0;
  color: #0f172a;
  font-size: 14px;
  font-weight: 850;
}
.rfq-detail-modal-head button {
  width: 38px;
  height: 38px;
  border: 1px solid #dbe3ef;
  border-radius: 10px;
  background: #fff;
  cursor: pointer;
}
.rfq-detail-modal-body {
  display: grid;
  gap: 14px;
  padding: 18px 22px;
  overflow: auto;
  background: #f8fafc;
}
.rfq-detail-summary-card,
.rfq-detail-section {
  border: 1px solid #e5e7eb;
  border-radius: 14px;
  background: #fff;
}
.rfq-detail-summary-card {
  display: grid;
  grid-template-columns: 1.4fr 1fr 1fr;
  gap: 1px;
  overflow: hidden;
  background: #e5e7eb;
}
.rfq-detail-summary-card div {
  min-height: 92px;
  display: grid;
  gap: 5px;
  align-content: center;
  padding: 14px;
  background: #fff;
}
.rfq-detail-summary-card strong {
  display: block;
  font-size: 20px;
}
.rfq-detail-summary-card span {
  color: #000000;
  font-size: 12px;
  font-weight: 800;
}
.rfq-detail-section {
  padding: 16px;
}
.rfq-detail-section h3 {
  margin: 0 0 12px;
  font-size: 15px;
}
.rfq-detail-lines.modal {
  grid-template-columns: repeat(2, minmax(0, 1fr));
  margin: 0 0 12px;
}
.rfq-detail-lines.modal .rfq-detail-row {
  min-height: 34px;
  padding-bottom: 7px;
  border-bottom: 1px solid #f1f5f9;
}
.rfq-detail-section p {
  margin: 0;
  color: #000000;
  font-size: 13px;
  line-height: 1.5;
}
.rfq-detail-items {
  display: grid;
  gap: 10px;
}
.rfq-detail-items article {
  display: grid;
  gap: 5px;
  padding: 12px;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  background: #f8fafc;
}
.rfq-detail-items article strong {
  font-size: 13px;
}
.rfq-detail-items article span,
.rfq-detail-items article small {
  color: #000000;
  font-size: 12px;
}
.rfq-detail-section.split {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
}
.rfq-detail-chip-list,
.rfq-detail-activity {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.rfq-detail-chip-list span,
.rfq-detail-activity span {
  display: inline-flex;
  min-height: 30px;
  align-items: center;
  padding: 0 10px;
  border: 1px solid #dbeafe;
  border-radius: 999px;
  background: #eff6ff;
  color: #1d4ed8;
  font-size: 12px;
  font-weight: 850;
}
.rfq-detail-modal-actions {
  justify-content: flex-end;
  border-top: 1px solid #e5e7eb;
  border-bottom: 0;
  background: #fff;
}
.rfq-detail-modal-actions .rfq-detail-invite {
  margin-right: auto;
}
.rfq-flash {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 14px;
  padding: 11px 14px;
  border: 1px solid #bbf7d0;
  border-radius: 10px;
  background: #ecfdf5;
  color: #166534;
  font-size: 13px;
  font-weight: 700;
}
.rfq-flash button {
  border: 0;
  background: transparent;
  color: inherit;
  cursor: pointer;
  display: inline-flex;
  padding: 4px;
}
.rfq-share-links {
  margin-bottom: 14px;
  padding: 14px 16px;
  border: 1px solid #cbd5e1;
  border-radius: 10px;
  background: #f8fafc;
}
.rfq-share-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.rfq-share-head strong { font-size: 14px; color: #0f172a; }
.rfq-share-head button { border: 0; background: transparent; cursor: pointer; color: #64748b; display: inline-flex; padding: 4px; }
.rfq-share-links p { margin: 4px 0 12px; color: #475569; font-size: 12px; }
.rfq-share-row {
  display: grid;
  grid-template-columns: minmax(120px, 180px) minmax(0, 1fr) auto;
  align-items: center;
  gap: 10px;
  margin-top: 8px;
}
.rfq-share-name { font-weight: 700; font-size: 13px; color: #0f172a; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.rfq-share-row input {
  min-height: 36px;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  padding: 0 10px;
  font-size: 12px;
  background: #fff;
  color: #334155;
}
@media (max-width: 640px) {
  .rfq-share-row { grid-template-columns: 1fr auto; }
  .rfq-share-name { grid-column: 1 / -1; }
}
.rfq-drawer-backdrop {
  position: fixed;
  inset: 0;
  z-index: 80;
  background: rgba(15, 23, 42, .42);
  display: flex;
  justify-content: flex-end;
}
.rfq-create-drawer {
  width: min(1180px, calc(100vw - 32px));
  height: 100%;
  border-radius: 0;
  overflow: auto;
}
.rfq-invite-backdrop {
  justify-content: center;
  align-items: center;
  padding: 20px;
}
.rfq-invite-modal {
  width: min(560px, calc(100vw - 32px));
  max-height: min(80vh, 720px);
  background: #ffffff;
  border-radius: 14px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  box-shadow: 0 30px 80px rgba(15, 23, 42, .3);
}
.rfq-invite-body {
  padding: 20px;
  overflow: auto;
}
.rfq-invite-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 16px 20px;
  border-top: 1px solid #e5e7eb;
}
.rfq-invite-foot > div {
  display: flex;
  gap: 10px;
}
.rfq-invite-foot > span {
  color: #475569;
  font-size: 13px;
  font-weight: 600;
}
.rfq-primary-button:disabled {
  opacity: .55;
  cursor: not-allowed;
}
.rfq-drawer-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  padding: 24px;
  border-bottom: 1px solid #e5e7eb;
}
.rfq-drawer-head h2 {
  margin: 0;
  font-size: 22px;
}
.rfq-drawer-head p {
  margin: 8px 0 0;
  color: #000000;
  font-size: 13px;
}
.rfq-create-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(280px, 320px);
  gap: 16px;
  padding: 16px 16px 86px;
  align-items: start;
}
.rfq-create-main,
.rfq-create-side {
  display: grid;
  gap: 16px;
}
.rfq-form-card,
.rfq-side-card {
  border: 1px solid #e5e7eb;
  border-radius: 14px;
  background: #fff;
}
.rfq-form-card {
  padding: 16px;
}
.rfq-form-card h3,
.rfq-card-title h3,
.rfq-side-card h2 {
  margin: 0;
  font-size: 15px;
}
.rfq-card-title p {
  margin: 5px 0 0;
  color: #000000;
  font-size: 12px;
}
.rfq-form-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14px;
  margin-top: 16px;
}
.rfq-form-grid label,
.rfq-items-table td {
  min-width: 0;
}
.rfq-form-grid label {
  display: grid;
  gap: 8px;
  color: #334155;
  font-size: 12px;
  font-weight: 900;
}
.rfq-form-grid label.wide-full,
.rfq-form-actions {
  grid-column: 1 / -1;
}
.rfq-form-grid input,
.rfq-form-grid select,
.rfq-form-grid textarea,
.rfq-items-table input {
  min-height: 44px;
  border: 1px solid #d1d5db;
  border-radius: 11px;
  padding: 0 12px;
  width: 100%;
  outline: 0;
  background: #fff;
  color: #0f172a;
  font: inherit;
}
.rfq-form-grid textarea {
  min-height: 44px;
  padding: 12px;
  resize: vertical;
}
.rfq-form-actions {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
}
.rfq-form-actions.compact {
  grid-column: auto;
  justify-content: flex-start;
  flex-wrap: wrap;
}
.rfq-form-actions > * {
  min-width: 140px;
}
.rfq-attach-inline {
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 44px;
}
.rfq-attach-inline small,
.rfq-form-grid small {
  color: #000000;
  font-size: 11px;
  font-weight: 700;
}
.rfq-supplier-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(190px, 1fr));
  gap: 10px;
}
.rfq-supplier-grid label {
  min-height: 44px;
  display: flex;
  align-items: center;
  gap: 10px;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  padding: 0 12px;
  font-size: 13px;
  font-weight: 850;
  cursor: pointer;
}
.rfq-supplier-grid label.selected {
  border-color: #16a34a;
  background: #ecfdf5;
  color: #166534;
}
.rfq-supplier-grid label input[type="checkbox"] {
  width: 16px !important;
  height: 16px !important;
  min-width: 16px !important;
  min-height: 16px !important;
  flex: 0 0 auto;
  margin: 0;
  accent-color: #16a34a;
  cursor: pointer;
}
.rfq-empty-box {
  min-height: 140px;
  display: grid;
  place-items: center;
  text-align: center;
  gap: 6px;
  border: 1px dashed #cbd5e1;
  border-radius: 13px;
  color: #000000;
  padding: 20px;
}
.rfq-empty-box.compact {
  min-height: 115px;
}
.rfq-empty-box strong {
  color: #0f172a;
}
.rfq-empty-box span {
  font-size: 12px;
}
.rfq-items-table-wrap {
  overflow: auto;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
}
.rfq-items-table {
  width: 100%;
  min-width: 860px;
  border-collapse: collapse;
}
.rfq-items-table th,
.rfq-items-table td {
  padding: 10px;
  border-bottom: 1px solid #edf2f7;
  text-align: left;
  font-size: 11px;
}
.rfq-items-table th {
  background: #f8fafc;
  color: #000000;
  text-transform: uppercase;
}
.rfq-summary-line,
.rfq-total-line {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  padding: 9px 0;
  border-bottom: 1px solid #e5e7eb;
  font-size: 12px;
}
.rfq-summary-line span {
  color: #000000;
}
.rfq-total-line {
  margin: 8px -16px -16px;
  padding: 16px;
  background: #ecfdf5;
  border-radius: 0 0 14px 14px;
  border-bottom: 0;
}
.rfq-workflow {
  display: grid;
  gap: 14px;
}
.rfq-workflow div {
  display: grid;
  grid-template-columns: 28px minmax(0, 1fr);
  gap: 10px;
}
.rfq-workflow span {
  width: 24px;
  height: 24px;
  border-radius: 999px;
  display: grid;
  place-items: center;
  background: #dcfce7;
  color: #16a34a;
  font-size: 11px;
  font-weight: 900;
}
.rfq-workflow p {
  margin: 0;
}
.rfq-workflow small {
  display: block;
  margin-top: 3px;
  color: #000000;
  font-size: 11px;
}
.rfq-dropzone {
  min-height: 130px;
  display: grid;
  place-items: center;
  text-align: center;
  gap: 5px;
  border: 1px dashed #cbd5e1;
  border-radius: 13px;
  padding: 18px;
  color: #000000;
  cursor: pointer;
}
.rfq-dropzone strong {
  color: #334155;
  font-size: 12px;
}
.rfq-dropzone span {
  color: #16a34a;
  font-size: 12px;
  font-weight: 900;
}
.rfq-dropzone small {
  font-size: 10px;
}
.rfq-attachment-list {
  display: grid;
  gap: 8px;
  margin-top: 10px;
}
.rfq-attachment-list div {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  min-height: 34px;
  padding: 0 8px;
  border-radius: 9px;
  background: #f8fafc;
  font-size: 12px;
  font-weight: 800;
}
.rfq-attachment-list button,
.rfq-icon-button.danger {
  color: #ef4444;
}
.rfq-attachment-list button {
  border: 0;
  background: transparent;
  cursor: pointer;
}
.rfq-create-footer {
  position: sticky;
  left: 0;
  right: 0;
  bottom: 0;
  grid-column: 1 / -1;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 14px 16px;
  border-top: 1px solid #e5e7eb;
  background: rgba(255, 255, 255, .96);
  backdrop-filter: blur(10px);
}
.rfq-create-footer > div {
  display: flex;
  gap: 12px;
}
@media (max-width: 1280px) {
  .rfq-grid-shell {
    grid-template-columns: minmax(0, 1fr);
  }
  .rfq-right {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .rfq-stats {
    grid-template-columns: repeat(3, minmax(150px, 1fr));
  }
}
@media (max-width: 900px) {
  .rfq-page {
    padding: 18px 14px 28px;
  }
  .rfq-page-head {
    display: grid;
  }
  .rfq-actions {
    justify-content: stretch;
  }
  .rfq-actions > *,
  .rfq-toolbar > *,
  .rfq-filter-panel > * {
    flex: 1 1 100%;
  }
  .rfq-stats {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    overflow-x: auto;
    scroll-snap-type: x mandatory;
    padding-bottom: 4px;
  }
  .rfq-kpi {
    min-width: 210px;
    scroll-snap-align: start;
  }
  .rfq-toolbar {
    align-items: stretch;
    flex-wrap: wrap;
  }
  .rfq-view-toggle {
    margin-left: 0;
    width: 100%;
  }
  .rfq-view-toggle button {
    flex: 1;
  }
  .rfq-right {
    grid-template-columns: 1fr;
  }
  .rfq-table-wrap {
    border: 0;
    overflow: visible;
  }
  .rfq-table,
  .rfq-table thead,
  .rfq-table tbody,
  .rfq-table tr,
  .rfq-table td {
    display: block;
    min-width: 0;
  }
  .rfq-table thead {
    display: none;
  }
  .rfq-table tr {
    border: 1px solid #e5e7eb;
    border-radius: 14px;
    padding: 14px;
    margin-bottom: 12px;
    background: #fff;
  }
  .rfq-table td {
    border: 0;
    padding: 7px 0;
  }
  .rfq-table td:nth-child(1) {
    display: none;
  }
  .rfq-table td::before {
    content: attr(data-label);
    display: inline-block;
    min-width: 118px;
    color: #000000;
    font-size: 11px;
    font-weight: 900;
  }
  .rfq-row-actions {
    display: flex;
    justify-content: flex-end;
  }
  .rfq-pagination {
    display: grid;
  }
  .rfq-create-layout {
    grid-template-columns: 1fr;
  }
  .rfq-form-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .rfq-detail-summary-card,
  .rfq-detail-lines.modal,
  .rfq-detail-section.split {
    grid-template-columns: 1fr;
  }
}
@media (max-width: 520px) {
  .rfq-title-row {
    align-items: flex-start;
  }
  .rfq-stats {
    grid-template-columns: 1fr;
  }
  .rfq-kpi {
    min-width: 0;
  }
  .rfq-list-card {
    padding: 12px;
  }
  .rfq-create-drawer {
    width: 100vw;
    border-radius: 18px 18px 0 0;
    height: calc(100% - 20px);
    margin-top: 20px;
  }
  .rfq-drawer-head,
  .rfq-create-layout {
    padding: 18px;
  }
  .rfq-form-grid {
    grid-template-columns: 1fr;
  }
  .rfq-form-actions {
    display: grid;
  }
  .rfq-form-actions > * {
    width: 100%;
  }
  .rfq-detail-backdrop {
    align-items: end;
    padding: 12px;
  }
  .rfq-detail-modal {
    max-height: calc(100vh - 24px);
    border-radius: 16px;
  }
  .rfq-detail-modal-head,
  .rfq-detail-modal-body,
  .rfq-detail-modal-actions {
    padding: 16px;
  }
  .rfq-detail-modal-actions {
    display: grid;
  }
  .rfq-create-footer,
  .rfq-create-footer > div {
    display: grid;
    width: 100%;
  }
}
`
