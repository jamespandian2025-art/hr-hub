'use client'

import { ChangeEvent, FormEvent, MouseEvent, useEffect, useMemo, useRef, useState } from 'react'
import {
  BarChart3,
  CheckCircle2,
  ChevronDown,
  ClipboardList,
  FileText,
  Filter,
  Grid3X3,
  MoreHorizontal,
  PackageCheck,
  Paperclip,
  Plus,
  Search,
  Send,
  X,
  XCircle,
} from 'lucide-react'
import { AnalyticsToggleButton, CollapsibleAnalytics, useAnalyticsDisclosure } from '@/components/AnalyticsDisclosure'
import { companyChangeEvent, companyScopedKey, getActiveCompany } from '@/lib/tenant/company'

const font = 'var(--font-body)'
const purchaseRequestsKey = 'flowsys-procurement-purchase-requests'
const rfqsKey = 'flowsys-procurement-rfqs'
const hrEmployeesKey = 'flowsys-hr-employees'

type StoredRequest = Record<string, unknown>

type RequestStatus = 'Pending' | 'Approved' | 'Completed' | 'Rejected'
type RequestPriority = 'Low' | 'Medium' | 'High' | 'Critical'
type DetailTab = 'Details' | 'Items' | 'Approvals' | 'Activity'
type ViewMode = 'table' | 'grid'
type ActionMenuPosition = { top: number; left: number }

type RequestedItem = {
  id: string
  name: string
  quantity: string
  unit: string
  details: string
  requiredDate: string
  remarks: string
}

type AttachmentRecord = {
  name: string
  size?: string
  type?: string
}

type NormalizedRequest = {
  id: string
  requestNo: string
  subject: string
  requester: string
  department: string
  requestDate: string
  neededBy: string
  priority: RequestPriority
  status: RequestStatus
  description: string
  itemCount: number
  totalQuantity: string
  attachments: AttachmentRecord[]
  activity: string[]
  items: RequestedItem[]
  source: StoredRequest
}

type RequestFormState = {
  subject: string
  requesterId: string
  requester: string
  department: string
  neededBy: string
  priority: RequestPriority
  description: string
}

type EmployeeOption = {
  id: string
  employeeId: string
  name: string
  department: string
  jobTitle: string
  email: string
  status: string
}

const emptyForm: RequestFormState = {
  subject: '',
  requesterId: '',
  requester: '',
  department: '',
  neededBy: '',
  priority: 'Medium',
  description: '',
}

const statusConfig: Record<RequestStatus, { tone: string; label: string }> = {
  Pending: { tone: 'orange', label: 'Pending' },
  Approved: { tone: 'green', label: 'Approved' },
  Completed: { tone: 'blue', label: 'Completed' },
  Rejected: { tone: 'red', label: 'Rejected' },
}

const priorityConfig: Record<RequestPriority, { tone: string; label: string }> = {
  Low: { tone: 'green', label: 'Low' },
  Medium: { tone: 'orange', label: 'Medium' },
  High: { tone: 'red', label: 'High' },
  Critical: { tone: 'purple', label: 'Critical' },
}

const subjectSuggestions = [
  'Concrete pouring materials',
  'Rebar and formworks request',
  'Masonry materials request',
  'Electrical rough-in materials',
  'Plumbing rough-in materials',
  'Roofing materials request',
  'Tile setting materials',
  'Site safety supplies',
]

const detailTabs: DetailTab[] = ['Details', 'Items', 'Approvals', 'Activity']

export default function PurchaseRequestsPage() {
  const [storedRequests, setStoredRequests] = useState<StoredRequest[]>([])
  const [companyId, setCompanyId] = useState('')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')
  const [departmentFilter, setDepartmentFilter] = useState('All')
  const [priorityFilter, setPriorityFilter] = useState('All')
  const [viewMode, setViewMode] = useState<ViewMode>('table')
  const [showFilters, setShowFilters] = useState(false)
  const [showCreate, setShowCreate] = useState(false)
  const [selectedId, setSelectedId] = useState('')
  const [detailTab, setDetailTab] = useState<DetailTab>('Details')
  const [openActionId, setOpenActionId] = useState('')
  const [actionMenuPosition, setActionMenuPosition] = useState<ActionMenuPosition | null>(null)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [form, setForm] = useState<RequestFormState>(emptyForm)
  const [formError, setFormError] = useState('')
  const [requestedItems, setRequestedItems] = useState<RequestedItem[]>(() => [createRequestedItem()])
  const [attachments, setAttachments] = useState<AttachmentRecord[]>([])
  const [activeEmployees, setActiveEmployees] = useState<EmployeeOption[]>([])
  const attachmentInputRef = useRef<HTMLInputElement | null>(null)
  const analytics = useAnalyticsDisclosure('wiseflow:analytics:procurement-purchase-requests')

  useEffect(() => {
    const load = () => {
      const activeCompany = getActiveCompany()
      const activeCompanyId = activeCompany?.id || ''
      setCompanyId(activeCompanyId)
      setStoredRequests(loadStoredRequests(activeCompanyId))
      setActiveEmployees(loadActiveEmployees(activeCompanyId))
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

  useEffect(() => {
    if (!showCreate || form.requesterId || !activeEmployees.length) return
    const employee = activeEmployees[0]
    setForm(previous => ({
      ...previous,
      requesterId: employee.id,
      requester: employee.name,
      department: previous.department || employee.department,
    }))
  }, [activeEmployees, form.requesterId, showCreate])

  useEffect(() => {
    if (!openActionId) return
    const closeActionMenu = () => {
      setOpenActionId('')
      setActionMenuPosition(null)
    }
    window.addEventListener('resize', closeActionMenu)
    window.addEventListener('scroll', closeActionMenu, true)
    return () => {
      window.removeEventListener('resize', closeActionMenu)
      window.removeEventListener('scroll', closeActionMenu, true)
    }
  }, [openActionId])

  const requests = useMemo(
    () => storedRequests.map((request, index) => normalizeRequest(request, index)).filter(Boolean) as NormalizedRequest[],
    [storedRequests],
  )

  const departments = useMemo(() => uniqueValues(requests.map(request => request.department).filter(value => value !== 'Unassigned')), [requests])
  const activeFilterCount = [statusFilter, departmentFilter, priorityFilter].filter(value => value !== 'All').length

  const stats = useMemo(() => {
    const countStatus = (status: RequestStatus) => requests.filter(request => request.status === status).length
    return {
      total: requests.length,
      pending: countStatus('Pending'),
      approved: countStatus('Approved'),
      completed: countStatus('Completed'),
      rejected: countStatus('Rejected'),
    }
  }, [requests])

  const filteredRequests = useMemo(() => {
    const needle = search.trim().toLowerCase()
    return requests.filter(request => {
      const matchesSearch = !needle || [
        request.requestNo,
        request.subject,
        request.requester,
        request.department,
        request.description,
        ...request.items.flatMap(item => [item.name, item.details, item.remarks]),
      ].some(value => value.toLowerCase().includes(needle))
      const matchesStatus = statusFilter === 'All' || request.status === statusFilter
      const matchesDepartment = departmentFilter === 'All' || request.department === departmentFilter
      const matchesPriority = priorityFilter === 'All' || request.priority === priorityFilter
      return matchesSearch && matchesStatus && matchesDepartment && matchesPriority
    })
  }, [departmentFilter, priorityFilter, requests, search, statusFilter])

  const totalPages = Math.max(1, Math.ceil(filteredRequests.length / pageSize))
  const currentPage = Math.min(page, totalPages)
  const pageStart = filteredRequests.length ? (currentPage - 1) * pageSize + 1 : 0
  const pageEnd = Math.min(currentPage * pageSize, filteredRequests.length)
  const visibleRequests = filteredRequests.slice((currentPage - 1) * pageSize, currentPage * pageSize)
  const selectedRequest = requests.find(request => request.id === selectedId) || visibleRequests[0] || filteredRequests[0]

  function openCreateDrawer() {
    setForm(formForRequester(activeEmployees[0]))
    setRequestedItems([createRequestedItem()])
    setAttachments([])
    setFormError('')
    setShowCreate(true)
  }

  function closeCreateDrawer() {
    setShowCreate(false)
    setFormError('')
  }

  function persist(nextRequests: StoredRequest[]) {
    const unique = uniqueRequests(nextRequests)
    setStoredRequests(unique)
    saveStoredRequests(unique, companyId)
  }

  function addRequestedItem() {
    setRequestedItems(previous => [...previous, createRequestedItem()])
  }

  function updateRequestedItem(id: string, patch: Partial<RequestedItem>) {
    setRequestedItems(previous => previous.map(item => item.id === id ? { ...item, ...patch } : item))
  }

  function removeRequestedItem(id: string) {
    setRequestedItems(previous => previous.filter(item => item.id !== id))
  }

  function addAttachments(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files || [])
    if (!files.length) return
    setAttachments(previous => [
      ...previous,
      ...files.map(file => ({
        name: file.name,
        size: formatFileSize(file.size),
        type: file.type || 'file',
      })),
    ])
    event.target.value = ''
  }

  function removeAttachment(name: string) {
    setAttachments(previous => previous.filter(file => file.name !== name))
  }

  function closeActionMenu() {
    setOpenActionId('')
    setActionMenuPosition(null)
  }

  function toggleRequestActions(requestId: string, event: MouseEvent<HTMLButtonElement>) {
    event.stopPropagation()
    if (openActionId === requestId) {
      closeActionMenu()
      return
    }

    const rect = event.currentTarget.getBoundingClientRect()
    const width = 178
    const height = 204
    const gap = 8
    const left = Math.min(
      Math.max(12, rect.right - width),
      Math.max(12, window.innerWidth - width - 12),
    )
    const hasMoreSpaceAbove = window.innerHeight - rect.bottom < height + gap && rect.top > height + gap
    const top = hasMoreSpaceAbove ? rect.top - height - gap : rect.bottom + gap
    setActionMenuPosition({ top: Math.max(12, top), left })
    setOpenActionId(requestId)
  }

  function selectRequester(value: string) {
    const employee = activeEmployees.find(item => item.name === value)
    setForm(previous => ({
      ...previous,
      requesterId: employee?.id || '',
      requester: value,
      department: employee?.department || previous.department,
    }))
    setFormError('')
  }

  function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const subject = form.subject.trim()
    const selectedRequester = activeEmployees.find(employee => employee.id === form.requesterId)
    const requester = (selectedRequester?.name || form.requester).trim()
    const department = (form.department || selectedRequester?.department || '').trim()
    const neededBy = form.neededBy.trim()
    const validItems = requestedItems
      .map(item => ({
        ...item,
        name: item.name.trim(),
        quantity: item.quantity.trim(),
        unit: item.unit.trim(),
        details: item.details.trim(),
        requiredDate: item.requiredDate.trim(),
        remarks: item.remarks.trim(),
      }))
      .filter(item => item.name || item.quantity || item.unit || item.details || item.requiredDate || item.remarks)

    if (!subject || !requester || !department || !neededBy) {
      setFormError('Complete the subject, requester, department, and needed by fields before submitting.')
      return
    }
    if (!validItems.length) {
      setFormError('Add at least one requested item before submitting the purchase request.')
      return
    }
    if (validItems.some(item => !item.name || numberValue(item.quantity) <= 0)) {
      setFormError('Each requested item needs an item name and a quantity greater than zero.')
      return
    }

    const now = new Date()
    const record: StoredRequest = {
      id: `pr-${Date.now()}`,
      companyId,
      requestNo: nextRequestNumber(requests),
      subject,
      requesterId: selectedRequester?.id || form.requesterId,
      requesterEmployeeId: selectedRequester?.employeeId || undefined,
      requester,
      department,
      requestDate: now.toISOString(),
      neededBy,
      priority: form.priority,
      status: 'Pending',
      description: form.description.trim(),
      items: validItems.map(item => ({
        id: item.id,
        name: item.name,
        itemName: item.name,
        quantity: numberValue(item.quantity),
        unit: item.unit,
        details: item.details,
        specifications: item.details,
        requiredDate: item.requiredDate,
        remarks: item.remarks,
      })),
      attachments,
      itemCount: validItems.length,
      totalQuantity: validItems.reduce((sum, item) => sum + numberValue(item.quantity), 0),
      activity: [`Created ${formatDate(now.toISOString())}`],
    }
    persist([record, ...storedRequests])
    setSelectedId(String(record.id))
    setForm(emptyForm)
    setRequestedItems([createRequestedItem()])
    setAttachments([])
    setFormError('')
    setShowCreate(false)
  }

  function createRfqFromRequest(request: NormalizedRequest) {
    if (readString(request.source, ['rfqId']) || request.status === 'Rejected') {
      closeActionMenu()
      return
    }

    const now = new Date()
    const existingRfqs = loadProcurementRows(rfqsKey, companyId)
    const rfqNumber = nextRfqNumber(existingRfqs)
    const rfqRecord: StoredRequest = {
      id: `rfq-${Date.now()}`,
      companyId,
      rfqNumber,
      title: request.subject,
      category: 'General Procurement',
      issueDate: now.toISOString().slice(0, 10),
      closingDate: request.neededBy,
      status: 'Draft',
      suppliersInvited: 0,
      quotations: 0,
      estimatedValue: 0,
      description: request.description,
      purchaseRequestId: request.id,
      purchaseRequestNo: request.requestNo,
      requester: request.requester,
      department: request.department,
      items: request.items.map(item => ({
        name: item.name,
        description: item.name,
        unit: item.unit,
        quantity: numberValue(item.quantity),
        specifications: item.details,
        notes: item.remarks,
        requiredDate: item.requiredDate,
      })),
      activity: [`Created from ${request.requestNo} on ${formatDate(now.toISOString())}`],
      createdAt: now.toISOString(),
    }
    saveProcurementRows(rfqsKey, [rfqRecord, ...existingRfqs], companyId)

    const nextRequests = storedRequests.map(record => {
      const normalized = normalizeRequest(record, 0)
      if (!normalized || normalized.id !== request.id) return record
      return {
        ...record,
        status: normalized.status === 'Rejected' ? normalized.status : 'Approved',
        rfqId: rfqRecord.id,
        rfqNumber,
        rfqCreatedAt: now.toISOString(),
        activity: [`RFQ ${rfqNumber} created from request`, ...readStringArray(record.activity)],
        updatedAt: now.toISOString(),
      }
    })
    persist(nextRequests)
    closeActionMenu()
  }

  function setRequestStatus(request: NormalizedRequest, status: RequestStatus) {
    const next = storedRequests.map(record => {
      const normalized = normalizeRequest(record, 0)
      if (!normalized || normalized.id !== request.id) return record
      const activity = readStringArray(record.activity)
      return {
        ...record,
        status,
        updatedAt: new Date().toISOString(),
        activity: [`Status changed to ${status}`, ...activity],
      }
    })
    persist(next)
    closeActionMenu()
  }

  function resetFilters() {
    setSearch('')
    setStatusFilter('All')
    setDepartmentFilter('All')
    setPriorityFilter('All')
    setPage(1)
  }

  return (
    <main className="pr-page" style={{ fontFamily: font }}>
      <style>{purchaseRequestsCss}</style>

      <section className="pr-page-head">
        <div>
          <div className="pr-breadcrumb">
            <span>Procurement</span>
            <span>/</span>
            <strong>Purchase Requests</strong>
          </div>
          <div className="pr-title-row">
            <span className="pr-title-icon"><FileText size={22} /></span>
            <div>
              <h1>Purchase Requests</h1>
              <p>Create, review, and manage purchase requests from your team.</p>
            </div>
          </div>
        </div>
        <div className="pr-actions">
          <AnalyticsToggleButton open={analytics.open} onToggle={analytics.toggle} panelId={analytics.panelId} className="pr-secondary-button" />
          <button type="button" className="pr-secondary-button" onClick={() => setViewMode(viewMode === 'table' ? 'grid' : 'table')}>
            <Grid3X3 size={16} /> Views <ChevronDown size={14} />
          </button>
          <button type="button" className="pr-secondary-button" onClick={() => setShowFilters(value => !value)}>
            <Filter size={16} /> Filters <span className="pr-filter-count">{activeFilterCount}</span>
          </button>
          <button type="button" className="pr-secondary-button" onClick={() => { setPriorityFilter(priorityFilter === 'High' ? 'All' : 'High'); setPage(1) }}>
            <PackageCheck size={16} /> Group by <ChevronDown size={14} />
          </button>
          <button type="button" className="pr-icon-button" aria-label="Reset purchase request filters" onClick={resetFilters}>
            <MoreHorizontal size={18} />
          </button>
          <button type="button" className="pr-primary-button" onClick={openCreateDrawer}>
            <Plus size={17} /> New Request <ChevronDown size={14} />
          </button>
        </div>
      </section>

      <CollapsibleAnalytics open={analytics.open} id={analytics.panelId}>
        <section className="pr-stats" aria-label="Purchase request summary">
          <KpiCard title="Total Requests" value={stats.total} helper={stats.total ? 'From saved requests' : 'No requests yet'} icon={ClipboardList} tone="blue" />
          <KpiCard title="Pending" value={stats.pending} helper={stats.pending ? 'Awaiting review' : 'No pending requests'} icon={PackageCheck} tone="purple" />
          <KpiCard title="Approved" value={stats.approved} helper={stats.approved ? 'Ready for sourcing' : 'No approved requests'} icon={Send} tone="orange" />
          <KpiCard title="Completed" value={stats.completed} helper={stats.completed ? 'Fulfilled requests' : 'No completed requests'} icon={CheckCircle2} tone="green" />
          <KpiCard title="Rejected" value={stats.rejected} helper={stats.rejected ? 'Needs revision' : 'No rejected requests'} icon={XCircle} tone="red" />
        </section>
      </CollapsibleAnalytics>

      <section className="pr-workspace">
        <div className="pr-toolbar">
          <label className="pr-search">
            <Search size={17} />
            <input value={search} onChange={event => { setSearch(event.target.value); setPage(1) }} placeholder="Search by request no., item, requester, or department..." aria-label="Search purchase requests" />
          </label>
          <SelectControl label="Status" value={statusFilter} onChange={value => { setStatusFilter(value); setPage(1) }} options={['All', ...Object.keys(statusConfig)]} />
          <SelectControl label="Department" value={departmentFilter} onChange={value => { setDepartmentFilter(value); setPage(1) }} options={['All', ...departments]} />
          <SelectControl label="Priority" value={priorityFilter} onChange={value => { setPriorityFilter(value); setPage(1) }} options={['All', ...Object.keys(priorityConfig)]} />
          <button type="button" className="pr-secondary-button compact" onClick={() => setShowFilters(value => !value)}>
            <Filter size={16} /> More filters
          </button>
          <div className="pr-view-toggle" aria-label="View mode">
            <button type="button" className={viewMode === 'table' ? 'active' : ''} onClick={() => setViewMode('table')} aria-label="Table view"><Grid3X3 size={16} /></button>
            <button type="button" className={viewMode === 'grid' ? 'active' : ''} onClick={() => setViewMode('grid')} aria-label="Analytics view"><BarChart3 size={16} /></button>
          </div>
        </div>

        {showFilters && (
          <div className="pr-filter-panel">
            <SelectControl label="Status" value={statusFilter} onChange={value => { setStatusFilter(value); setPage(1) }} options={['All', ...Object.keys(statusConfig)]} />
            <SelectControl label="Department" value={departmentFilter} onChange={value => { setDepartmentFilter(value); setPage(1) }} options={['All', ...departments]} />
            <SelectControl label="Priority" value={priorityFilter} onChange={value => { setPriorityFilter(value); setPage(1) }} options={['All', ...Object.keys(priorityConfig)]} />
            <button type="button" className="pr-secondary-button" onClick={resetFilters}>Reset filters</button>
          </div>
        )}

        {requests.length === 0 ? (
          <EmptyPurchaseRequests onCreate={openCreateDrawer} />
        ) : (
          <div className={`pr-data-layout${selectedRequest ? ' with-details' : ''}`}>
            <div className="pr-list-card">
              {viewMode === 'table' ? (
                <div className="pr-table-wrap">
                  <table className="pr-table">
                    <thead>
                      <tr>
                        <th aria-label="Select request"></th>
                        <th>Request No.</th>
                        <th>Subject</th>
                        <th>Requester</th>
                        <th>Department</th>
                        <th>Request Date</th>
                        <th>Needed By</th>
                        <th>Items</th>
                        <th>Priority</th>
                        <th>Status</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {visibleRequests.map(request => (
                        <tr key={request.id} className={selectedRequest?.id === request.id ? 'selected' : ''} onClick={() => setSelectedId(request.id)}>
                          <td data-label="Select"><input type="checkbox" checked={selectedRequest?.id === request.id} onChange={() => setSelectedId(request.id)} aria-label={`Select ${request.requestNo}`} /></td>
                          <td data-label="Request No."><button type="button" className="pr-link-button" onClick={() => setSelectedId(request.id)}>{request.requestNo}</button></td>
                          <td data-label="Subject">{request.subject}</td>
                          <td data-label="Requester">{request.requester}</td>
                          <td data-label="Department">{request.department}</td>
                          <td data-label="Request Date">{formatDate(request.requestDate)}</td>
                          <td data-label="Needed By">{formatDate(request.neededBy)}</td>
                          <td data-label="Items">{request.itemCount} item{request.itemCount === 1 ? '' : 's'}</td>
                          <td data-label="Priority"><Badge tone={priorityConfig[request.priority].tone}>{priorityConfig[request.priority].label}</Badge></td>
                          <td data-label="Status"><Badge tone={statusConfig[request.status].tone}>{statusConfig[request.status].label}</Badge></td>
                          <td data-label="Actions">
                            <div className="pr-row-actions" onClick={event => event.stopPropagation()}>
                              <button type="button" aria-label={`Open actions for ${request.requestNo}`} onClick={event => toggleRequestActions(request.id, event)}>
                                <MoreHorizontal size={16} />
                              </button>
                              {openActionId === request.id && (
                                <div className="pr-action-menu" style={actionMenuPosition || undefined}>
                                  <button type="button" onClick={() => { setSelectedId(request.id); closeActionMenu() }}>Open details</button>
                                  <button type="button" disabled={Boolean(readString(request.source, ['rfqId'])) || request.status === 'Rejected'} onClick={() => createRfqFromRequest(request)}>{readString(request.source, ['rfqId']) ? 'RFQ created' : 'Create RFQ'}</button>
                                  <button type="button" onClick={() => setRequestStatus(request, 'Approved')}>Mark approved</button>
                                  <button type="button" onClick={() => setRequestStatus(request, 'Completed')}>Mark completed</button>
                                  <button type="button" onClick={() => setRequestStatus(request, 'Rejected')}>Reject request</button>
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
                <div className="pr-grid-list">
                  {visibleRequests.map(request => (
                    <article key={request.id} className={`pr-request-card${selectedRequest?.id === request.id ? ' selected' : ''}`} onClick={() => setSelectedId(request.id)}>
                      <div>
                        <strong>{request.requestNo}</strong>
                        <h3>{request.subject}</h3>
                        <p>{request.requester} / {request.department}</p>
                      </div>
                      <div className="pr-card-badges">
                        <Badge tone={priorityConfig[request.priority].tone}>{request.priority}</Badge>
                        <Badge tone={statusConfig[request.status].tone}>{request.status}</Badge>
                      </div>
                      <div className="pr-card-meta">
                        <span>{formatDate(request.neededBy)}</span>
                        <strong>{request.itemCount} item{request.itemCount === 1 ? '' : 's'}</strong>
                      </div>
                    </article>
                  ))}
                </div>
              )}

              {filteredRequests.length === 0 && (
                <div className="pr-inline-empty">
                  <strong>No matching purchase requests</strong>
                  <span>Adjust search or filters to see more records.</span>
                  <button type="button" onClick={resetFilters}>Clear filters</button>
                </div>
              )}

              <div className="pr-pagination">
                <span>Showing {pageStart} to {pageEnd} of {filteredRequests.length} entries</span>
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

            {selectedRequest && (
              <RequestDetails
                request={selectedRequest}
                activeTab={detailTab}
                onTabChange={setDetailTab}
                onClose={() => setSelectedId('')}
                onStatusChange={status => setRequestStatus(selectedRequest, status)}
                onCreateRfq={() => createRfqFromRequest(selectedRequest)}
              />
            )}
          </div>
        )}
      </section>

      {showCreate && (
        <div className="pr-drawer-backdrop" role="presentation" onMouseDown={closeCreateDrawer}>
          <aside className="pr-create-drawer" role="dialog" aria-modal="true" aria-labelledby="create-purchase-request-title" onMouseDown={event => event.stopPropagation()}>
            <div className="pr-drawer-head">
              <div>
                <h2 id="create-purchase-request-title">Create Purchase Request</h2>
                <p>Capture what is needed and route it to procurement for sourcing.</p>
              </div>
              <button type="button" aria-label="Close create request form" onClick={closeCreateDrawer}><X size={20} /></button>
            </div>
            <form className="pr-form" onSubmit={handleCreate}>
              {formError && <p className="pr-form-error" role="alert">{formError}</p>}

              <section className="pr-form-section">
                <div className="pr-section-head">
                  <h3>Purchase Request Information</h3>
                </div>
                <div className="pr-form-grid">
                  <label>
                    Subject *
                    <input list="pr-subject-options" value={form.subject} onChange={event => { setForm({ ...form, subject: event.target.value }); setFormError('') }} placeholder="Concrete pouring materials" required />
                    <datalist id="pr-subject-options">
                      {subjectSuggestions.map(subject => <option key={subject} value={subject} />)}
                    </datalist>
                  </label>
                  <label>
                    Requester *
                    <input list="pr-requester-options" value={form.requester} onChange={event => selectRequester(event.target.value)} placeholder={activeEmployees.length ? 'Select or type requester name' : 'Type requester name'} required />
                    <datalist id="pr-requester-options">
                      {activeEmployees.map(employee => (
                        <option key={employee.id} value={employee.name} label={`${employee.department || 'No department'}${employee.jobTitle ? ` - ${employee.jobTitle}` : ''}`} />
                      ))}
                    </datalist>
                  </label>
                  <label>
                    Department *
                    <input value={form.department} onChange={event => { setForm({ ...form, department: event.target.value }); setFormError('') }} placeholder="Site team, package, or cost code" required />
                  </label>
                  <label>
                    Needed By *
                    <input type="date" value={form.neededBy} onChange={event => { setForm({ ...form, neededBy: event.target.value }); setFormError('') }} required />
                  </label>
                  <label>
                    Priority *
                    <select value={form.priority} onChange={event => setForm({ ...form, priority: event.target.value as RequestPriority })}>
                      {Object.keys(priorityConfig).map(priority => <option key={priority} value={priority}>{priority}</option>)}
                    </select>
                  </label>
                  <label className="wide">
                    Description
                    <textarea value={form.description} onChange={event => setForm({ ...form, description: event.target.value })} placeholder="Scope area, site location, delivery notes, or reason for request" />
                  </label>
                </div>
              </section>

              <section className="pr-form-section">
                <div className="pr-section-head">
                  <div>
                    <h3>Requested Items</h3>
                    <p>Define what is needed, how many are needed, and when they are required.</p>
                  </div>
                  <button type="button" className="pr-secondary-button compact" onClick={addRequestedItem}><Plus size={15} /> Add Item</button>
                </div>
                <div className="pr-items-table-wrap">
                  <table className="pr-items-table">
                    <thead>
                      <tr>
                        <th>Item Name *</th>
                        <th>Quantity *</th>
                        <th>Unit</th>
                        <th>Item Details / Specifications</th>
                        <th>Required Date</th>
                        <th>Remarks</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {requestedItems.map(item => (
                        <tr key={item.id}>
                          <td data-label="Item Name *"><input value={item.name} onChange={event => { updateRequestedItem(item.id, { name: event.target.value }); setFormError('') }} placeholder="Rebar" required /></td>
                          <td data-label="Quantity *"><input inputMode="decimal" value={item.quantity} onChange={event => { updateRequestedItem(item.id, { quantity: event.target.value }); setFormError('') }} placeholder="120" required /></td>
                          <td data-label="Unit"><input value={item.unit} onChange={event => updateRequestedItem(item.id, { unit: event.target.value })} placeholder="pcs" /></td>
                          <td data-label="Item Details / Specifications"><textarea value={item.details} onChange={event => updateRequestedItem(item.id, { details: event.target.value })} placeholder="12mm x 6m, Grade 40, mill certificate required" /></td>
                          <td data-label="Required Date"><input type="date" value={item.requiredDate} onChange={event => updateRequestedItem(item.id, { requiredDate: event.target.value })} /></td>
                          <td data-label="Remarks"><textarea value={item.remarks} onChange={event => updateRequestedItem(item.id, { remarks: event.target.value })} placeholder="For footing works" /></td>
                          <td data-label="Actions"><button type="button" className="pr-icon-button danger" aria-label="Remove requested item" onClick={() => removeRequestedItem(item.id)}><X size={15} /></button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>

              <section className="pr-form-section">
                <div className="pr-section-head">
                  <div>
                    <h3>Attachments</h3>
                    <p>Upload specifications, drawings, reference images, or scope documents.</p>
                  </div>
                  <button type="button" className="pr-secondary-button compact" onClick={() => attachmentInputRef.current?.click()}><Paperclip size={15} /> Upload Files</button>
                  <input ref={attachmentInputRef} type="file" multiple hidden onChange={addAttachments} />
                </div>
                <div className="pr-upload-types">
                  <span>Upload specifications</span>
                  <span>Upload drawings</span>
                  <span>Upload reference images</span>
                  <span>Upload scope documents</span>
                </div>
                {attachments.length ? (
                  <div className="pr-attachment-list">
                    {attachments.map(file => (
                      <div key={file.name}>
                        <Paperclip size={15} />
                        <span>{file.name}</span>
                        <small>{file.size || ''}</small>
                        <button type="button" aria-label={`Remove ${file.name}`} onClick={() => removeAttachment(file.name)}><X size={14} /></button>
                      </div>
                    ))}
                  </div>
                ) : null}
              </section>

              <section className="pr-form-section">
                <div className="pr-section-head">
                  <h3>Approvals</h3>
                </div>
                <div className="pr-approval-preview" aria-label="Approval workflow preview">
                  {['Purchase Request', 'RFQ Creation', 'Supplier Quotations', 'Quotation Comparison', 'Approval', 'Purchase Order', 'Receiving'].map((step, index) => (
                    <span key={step} className={index === 0 ? 'active' : ''}>{step}</span>
                  ))}
                </div>
              </section>

              <div className="pr-form-actions">
                <button type="button" className="pr-secondary-button" onClick={closeCreateDrawer}>Cancel</button>
                <button type="submit" className="pr-primary-button">Save Request</button>
              </div>
            </form>
          </aside>
        </div>
      )}
    </main>
  )
}

function KpiCard({ title, value, helper, icon: Icon, tone }: { title: string; value: number; helper: string; icon: React.ComponentType<{ size?: number }>; tone: string }) {
  return (
    <article className="pr-kpi">
      <span className={`pr-kpi-icon ${tone}`}><Icon size={22} /></span>
      <div>
        <span>{title}</span>
        <strong>{value}</strong>
        <small>{helper}</small>
      </div>
    </article>
  )
}

function SelectControl({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: string[] }) {
  return (
    <label className="pr-select">
      <span>{label}:</span>
      <select value={value} onChange={event => onChange(event.target.value)} aria-label={`${label} filter`}>
        {options.map(option => <option key={option} value={option}>{option}</option>)}
      </select>
    </label>
  )
}

function Badge({ tone, children }: { tone: string; children: React.ReactNode }) {
  return <span className={`pr-badge ${tone}`}>{children}</span>
}

function EmptyPurchaseRequests({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="pr-empty">
      <span><FileText size={52} /></span>
      <h2>No purchase requests yet</h2>
      <p>You haven&apos;t created any purchase requests. Get started by creating your first request.</p>
      <button type="button" className="pr-primary-button" onClick={onCreate}>
        <Plus size={17} /> New Purchase Request
      </button>
      <a href="#purchase-request-help">Learn more about purchase requests</a>
    </div>
  )
}

function RequestDetails({
  request,
  activeTab,
  onTabChange,
  onClose,
  onStatusChange,
  onCreateRfq,
}: {
  request: NormalizedRequest
  activeTab: DetailTab
  onTabChange: (tab: DetailTab) => void
  onClose: () => void
  onStatusChange: (status: RequestStatus) => void
  onCreateRfq: () => void
}) {
  const linkedRfqId = readString(request.source, ['rfqId'])
  const linkedRfqNumber = readString(request.source, ['rfqNumber'])
  const hasLinkedRfq = Boolean(linkedRfqId)
  const nextAction = hasLinkedRfq || request.status === 'Rejected' ? 'No pending RFQ action' : 'Create RFQ'

  return (
    <aside className="pr-detail-card">
      <div className="pr-detail-head">
        <div>
          <strong>{request.requestNo}</strong>
          <Badge tone={statusConfig[request.status].tone}>{request.status}</Badge>
        </div>
        <button type="button" aria-label="Close request details" onClick={onClose}><X size={18} /></button>
      </div>
      <nav className="pr-detail-tabs" aria-label="Request detail tabs">
        {detailTabs.map(tab => (
          <button key={tab} type="button" className={activeTab === tab ? 'active' : ''} onClick={() => onTabChange(tab)}>{tab}</button>
        ))}
      </nav>
      {activeTab === 'Details' && (
        <div className="pr-detail-body">
          <h3>Request Information</h3>
          <DetailRow label="Request No." value={request.requestNo} />
          <DetailRow label="Subject" value={request.subject} />
          <DetailRow label="Requester" value={request.requester} />
          <DetailRow label="Department" value={request.department} />
          <DetailRow label="Request Date" value={formatDate(request.requestDate)} />
          <DetailRow label="Needed By" value={formatDate(request.neededBy)} />
          <DetailRow label="Priority" value={request.priority} />
          <DetailRow label="Status" value={request.status} />
          <p>{request.description || 'No description provided.'}</p>
          <div className="pr-detail-summary">
            <span><small>Total Items</small><strong>{request.itemCount}</strong></span>
            <span><small>Total Quantity</small><strong>{request.totalQuantity}</strong></span>
            <span><small>RFQ</small><strong>{linkedRfqNumber || 'Not created'}</strong></span>
          </div>
        </div>
      )}
      {activeTab === 'Items' && (
        <div className="pr-detail-body">
          <h3>Requested Items</h3>
          {request.items.length ? (
            <div className="pr-detail-items">
              {request.items.map(item => (
                <article key={item.id}>
                  <strong>{item.name}</strong>
                  <span>{item.quantity || '-'} {item.unit || ''}</span>
                  <p>{item.details || 'No specifications provided.'}</p>
                  <small>{item.requiredDate ? `Required ${formatDate(item.requiredDate)}` : 'No item required date'}{item.remarks ? ` / ${item.remarks}` : ''}</small>
                </article>
              ))}
            </div>
          ) : <p>No item details have been added to this request.</p>}
        </div>
      )}
      {activeTab === 'Approvals' && (
        <div className="pr-detail-body">
          <h3>Approval Flow</h3>
          <DetailRow label="Current Status" value={request.status} />
          <DetailRow label="Next Action" value={nextAction} />
          <div className="pr-approval-preview compact" aria-label="Approval workflow preview">
            {['PR', 'RFQ', 'Quotations', 'Comparison', 'Approval', 'PO', 'Receiving'].map((step, index) => (
              <span key={step} className={index === 0 ? 'active' : ''}>{step}</span>
            ))}
          </div>
        </div>
      )}
      {activeTab === 'Activity' && (
        <div className="pr-detail-body">
          <h3>Activity</h3>
          {request.activity.length ? request.activity.map(item => <p key={item}>{item}</p>) : <p>No activity has been recorded yet.</p>}
        </div>
      )}
      <div className="pr-attachments">
        <h3>Attachments <span>{request.attachments.length} files</span></h3>
        {request.attachments.length ? request.attachments.map(file => (
          <div key={file.name}>
            <Paperclip size={15} />
            <span>{file.name}</span>
            <small>{file.size || ''}</small>
          </div>
        )) : <p>No attachments yet.</p>}
      </div>
      <div className="pr-detail-actions">
        <button type="button" className="pr-secondary-button" onClick={() => onStatusChange('Approved')}>Approve</button>
        <button type="button" className="pr-primary-button" disabled={hasLinkedRfq || request.status === 'Rejected'} onClick={onCreateRfq}>{hasLinkedRfq ? 'RFQ Created' : 'Create RFQ'}</button>
      </div>
    </aside>
  )
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="pr-detail-row">
      <span>{label}</span>
      <strong>{value || '-'}</strong>
    </div>
  )
}

function loadStoredRequests(companyId: string) {
  const scopedKey = companyId ? companyScopedKey(purchaseRequestsKey, companyId) : purchaseRequestsKey
  const scopedRows = scopedKey === purchaseRequestsKey ? [] : readStored(scopedKey)
  const globalRows = readStored(purchaseRequestsKey)
  const globalForCompany = scopedRows.length ? globalRows.filter(record => readString(record, ['companyId']) === companyId) : globalRows
  const rows = scopedRows.length ? [...scopedRows, ...globalForCompany] : globalForCompany
  return uniqueRequests(rows).filter(record => {
    const recordCompanyId = readString(record, ['companyId'])
    return !companyId || !recordCompanyId || recordCompanyId === companyId
  })
}

function saveStoredRequests(requests: StoredRequest[], companyId: string) {
  if (typeof window === 'undefined') return
  const serialized = JSON.stringify(uniqueRequests(requests))
  window.localStorage.setItem(purchaseRequestsKey, serialized)
  if (companyId) window.localStorage.setItem(companyScopedKey(purchaseRequestsKey, companyId), serialized)
  window.dispatchEvent(new Event('storage'))
}

function loadProcurementRows(key: string, companyId: string) {
  const scopedKey = companyId ? companyScopedKey(key, companyId) : key
  const scopedRows = scopedKey === key ? [] : readStored(scopedKey)
  const globalRows = readStored(key)
  const globalForCompany = scopedRows.length ? globalRows.filter(record => readString(record, ['companyId']) === companyId) : globalRows
  const rows = scopedRows.length ? [...scopedRows, ...globalForCompany] : globalForCompany
  return uniqueRows(rows).filter(record => {
    const recordCompanyId = readString(record, ['companyId'])
    return !companyId || !recordCompanyId || recordCompanyId === companyId
  })
}

function saveProcurementRows(key: string, rows: StoredRequest[], companyId: string) {
  if (typeof window === 'undefined') return
  const serialized = JSON.stringify(uniqueRows(rows))
  window.localStorage.setItem(key, serialized)
  if (companyId) window.localStorage.setItem(companyScopedKey(key, companyId), serialized)
  window.dispatchEvent(new Event('storage'))
}

function readStored(key: string): StoredRequest[] {
  if (typeof window === 'undefined') return []
  try {
    const parsed = JSON.parse(window.localStorage.getItem(key) || '[]') as unknown
    return Array.isArray(parsed) ? parsed.filter(isObjectRecord) : []
  } catch {
    return []
  }
}

function formForRequester(employee?: EmployeeOption): RequestFormState {
  return {
    ...emptyForm,
    requesterId: employee?.id || '',
    requester: employee?.name || '',
    department: employee?.department || '',
  }
}

function loadActiveEmployees(companyId: string): EmployeeOption[] {
  const scopedRows = companyId ? readStored(companyScopedKey(hrEmployeesKey, companyId)) : []
  const globalRows = readStored(hrEmployeesKey)
  return uniqueEmployeeOptions([...scopedRows, ...globalRows]
    .map(normalizeEmployeeOption)
    .filter((employee): employee is EmployeeOption => Boolean(employee))
    .filter(isActiveEmployee))
}

function normalizeEmployeeOption(record: StoredRequest): EmployeeOption | null {
  const firstName = readString(record, ['firstName', 'first_name', 'givenName'])
  const middleName = readString(record, ['middleName', 'middle_name'])
  const lastName = readString(record, ['lastName', 'last_name', 'familyName', 'surname'])
  const name = readString(record, ['fullName', 'name', 'displayName', 'employeeName'])
    || [firstName, middleName, lastName].filter(Boolean).join(' ')
    || readString(record, ['email', 'employeeId', 'id'])
  if (!name) return null
  const employeeId = readString(record, ['employeeId', 'employeeCode', 'code'])
  const email = readString(record, ['email', 'workEmail'])
  const id = readString(record, ['id', 'userId']) || employeeId || email || name
  return {
    id,
    employeeId,
    name,
    department: readString(record, ['department', 'team', 'costCenter']),
    jobTitle: readString(record, ['jobTitle', 'position', 'title', 'employeeRole']),
    email,
    status: readString(record, ['employmentStatus', 'status']) || 'Active',
  }
}

function isActiveEmployee(employee: EmployeeOption) {
  const status = employee.status.trim().toLowerCase()
  return !status || status === 'active' || status === 'probationary' || status === 'regular'
}

function uniqueEmployeeOptions(employees: EmployeeOption[]) {
  const seen = new Set<string>()
  return employees
    .filter(employee => {
      const key = employee.id || employee.employeeId || employee.email || employee.name
      if (!key || seen.has(key)) return false
      seen.add(key)
      return true
    })
    .sort((a, b) => a.name.localeCompare(b.name))
}

function normalizeRequest(record: StoredRequest, index: number): NormalizedRequest | null {
  if (!record) return null
  const requestNo = readString(record, ['requestNo', 'requestNumber', 'reference', 'number']) || `PR-${String(index + 1).padStart(4, '0')}`
  const subject = readString(record, ['subject', 'item', 'itemName', 'title', 'description', 'name']) || 'Untitled request'
  const requester = readString(record, ['requester', 'requesterName', 'createdBy', 'employeeName', 'employee']) || 'Unassigned'
  const department = readString(record, ['department', 'team', 'costCenter']) || 'Unassigned'
  const rawItems = readArray(record.items).filter(isObjectRecord)
  const normalizedItems = rawItems.length
    ? rawItems.map((item, itemIndex) => ({
      id: readString(item, ['id']) || `${requestNo}-item-${itemIndex + 1}`,
      name: readString(item, ['name', 'itemName', 'description']) || 'Item',
      quantity: readString(item, ['quantity', 'qty']),
      unit: readString(item, ['unit', 'uom']),
      details: readString(item, ['details', 'specifications', 'specs', 'itemDetails', 'notes']),
      requiredDate: readString(item, ['requiredDate', 'neededBy', 'needByDate', 'dueDate']),
      remarks: readString(item, ['remarks', 'remark', 'comment']),
    }))
    : [{
      id: `${requestNo}-item-1`,
      name: subject,
      quantity: readString(record, ['quantity', 'qty']) || '1',
      unit: readString(record, ['unit', 'uom']),
      details: readString(record, ['specifications', 'details']) || readString(record, ['description', 'purpose', 'notes']),
      requiredDate: readString(record, ['neededBy', 'needByDate', 'requiredDate', 'dueDate']),
      remarks: '',
    }]
  const itemCount = normalizedItems.length || numberValue(record.itemCount)
  const quantity = normalizedItems.reduce((sum, item) => sum + numberValue(item.quantity), 0)

  return {
    id: readString(record, ['id', 'requestNo', 'requestNumber', 'reference']) || requestNo,
    requestNo,
    subject,
    requester,
    department,
    requestDate: readString(record, ['requestDate', 'date', 'createdAt']),
    neededBy: readString(record, ['neededBy', 'needByDate', 'requiredDate', 'dueDate']),
    priority: normalizePriority(readString(record, ['priority'])),
    status: normalizeStatus(readString(record, ['status'])),
    description: readString(record, ['description', 'purpose', 'notes']),
    itemCount,
    totalQuantity: quantity ? String(quantity) : String(numberValue(record.totalQuantity) || itemCount || '-'),
    attachments: readArray(record.attachments).filter(isObjectRecord).map(item => ({
      name: readString(item, ['name', 'fileName', 'filename']) || 'Attachment',
      size: readString(item, ['size', 'fileSize']),
    })),
    activity: readStringArray(record.activity),
    items: normalizedItems,
    source: record,
  }
}

function nextRequestNumber(requests: NormalizedRequest[]) {
  const year = new Date().getFullYear()
  const next = requests.reduce((max, request) => {
    const match = request.requestNo.match(/(\d+)$/)
    return match ? Math.max(max, Number(match[1])) : max
  }, 0) + 1
  return `PR-${year}-${String(next).padStart(4, '0')}`
}

function uniqueRequests(rows: StoredRequest[]) {
  const seen = new Set<string>()
  return rows.filter((row, index) => {
    const normalized = normalizeRequest(row, index)
    const key = normalized?.id || `${index}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

function uniqueRows(rows: StoredRequest[]) {
  const seen = new Set<string>()
  return rows.filter((row, index) => {
    const key = readString(row, ['id', 'rfqNumber', 'requestNo', 'reference']) || String(index)
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

function nextRfqNumber(rows: StoredRequest[]) {
  const year = new Date().getFullYear()
  const next = rows.reduce((max, row) => {
    const value = readString(row, ['rfqNumber', 'number', 'reference'])
    const match = value.match(/(\d+)$/)
    return match ? Math.max(max, Number(match[1])) : max
  }, 0) + 1
  return `RFQ-${year}-${String(next).padStart(4, '0')}`
}

function normalizeStatus(value: string): RequestStatus {
  const normalized = value.toLowerCase()
  if (normalized.includes('reject') || normalized.includes('denied')) return 'Rejected'
  if (normalized.includes('complete') || normalized.includes('fulfilled') || normalized.includes('closed')) return 'Completed'
  if (normalized.includes('approve')) return 'Approved'
  return 'Pending'
}

function normalizePriority(value: string): RequestPriority {
  const normalized = value.toLowerCase()
  if (normalized.includes('critical') || normalized.includes('urgent')) return 'Critical'
  if (normalized.includes('high')) return 'High'
  if (normalized.includes('low')) return 'Low'
  return 'Medium'
}

function readString(record: StoredRequest, keys: string[]) {
  for (const key of keys) {
    const value = record[key]
    if (typeof value === 'string' && value.trim()) return value.trim()
    if (typeof value === 'number' && Number.isFinite(value)) return String(value)
  }
  return ''
}

function readArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : []
}

function readStringArray(value: unknown) {
  return readArray(value).map(item => String(item)).filter(Boolean)
}

function isObjectRecord(value: unknown): value is StoredRequest {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value))
}

function uniqueValues(values: string[]) {
  return [...new Set(values)].sort((a, b) => a.localeCompare(b))
}

function numberValue(value: unknown) {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string') {
    const parsed = Number(value.replace(/[^0-9.-]/g, ''))
    return Number.isFinite(parsed) ? parsed : 0
  }
  return 0
}

function createRequestedItem(): RequestedItem {
  return {
    id: `pr-item-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    name: '',
    quantity: '',
    unit: '',
    details: '',
    requiredDate: '',
    remarks: '',
  }
}

function formatFileSize(size: number) {
  if (size < 1024) return `${size} B`
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`
  return `${(size / (1024 * 1024)).toFixed(1)} MB`
}

function formatDate(value: string) {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(date)
}

const purchaseRequestsCss = `
.pr-page {
  min-height: 100%;
  padding: 28px;
  color: #0f172a;
}
.pr-page-head,
.pr-title-row,
.pr-actions,
.pr-toolbar,
.pr-filter-panel,
.pr-pagination,
.pr-pagination > div,
.pr-detail-head,
.pr-detail-head > div,
.pr-detail-actions,
.pr-card-meta,
.pr-card-badges {
  display: flex;
  align-items: center;
}
.pr-page-head {
  justify-content: space-between;
  gap: 20px;
  margin-bottom: 24px;
}
.pr-breadcrumb {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #000000;
  font-size: 12px;
  margin-bottom: 10px;
}
.pr-breadcrumb strong {
  color: #0f172a;
}
.pr-title-row {
  gap: 14px;
}
.pr-title-icon {
  width: 42px;
  height: 42px;
  border-radius: 13px;
  background: #dcfce7;
  color: #16a34a;
  display: grid;
  place-items: center;
}
.pr-title-row h1 {
  margin: 0;
  font-size: clamp(25px, 2.3vw, 34px);
  line-height: 1.1;
  letter-spacing: -0.03em;
}
.pr-title-row p {
  margin: 8px 0 0;
  color: #000000;
  font-size: 14px;
}
.pr-actions {
  gap: 10px;
  flex-wrap: wrap;
  justify-content: flex-end;
}
.pr-primary-button,
.pr-secondary-button,
.pr-icon-button,
.pr-row-actions > button,
.pr-view-toggle button,
.pr-pagination button,
.pr-pagination select,
.pr-detail-head button,
.pr-drawer-head button,
.pr-inline-empty button {
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
.pr-primary-button:disabled,
.pr-secondary-button:disabled,
.pr-action-menu button:disabled {
  opacity: .5;
  cursor: not-allowed;
}
.pr-primary-button,
.pr-secondary-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 9px;
  padding: 0 15px;
}
.pr-primary-button {
  background: #16a34a;
  border-color: #16a34a;
  color: #fff;
}
.pr-secondary-button.compact {
  white-space: nowrap;
}
.pr-icon-button,
.pr-row-actions > button,
.pr-detail-head button,
.pr-drawer-head button {
  width: 42px;
  display: grid;
  place-items: center;
}
.pr-filter-count {
  min-width: 24px;
  height: 24px;
  border-radius: 999px;
  display: inline-grid;
  place-items: center;
  background: #6366f1;
  color: #fff;
  font-size: 12px;
}
.pr-stats {
  display: grid;
  grid-template-columns: repeat(5, minmax(150px, 1fr));
  gap: 16px;
  margin-bottom: 18px;
}
.pr-kpi,
.pr-workspace,
.pr-detail-card,
.pr-create-drawer {
  background: #fff;
  border: 1px solid #e5e7eb;
  box-shadow: 0 14px 34px rgba(15, 23, 42, 0.05);
}
.pr-kpi {
  min-height: 112px;
  border-radius: 16px;
  padding: 18px;
  display: flex;
  align-items: center;
  gap: 15px;
}
.pr-kpi-icon {
  width: 52px;
  height: 52px;
  border-radius: 13px;
  display: grid;
  place-items: center;
}
.pr-kpi-icon.blue { background: #dbeafe; color: #2563eb; }
.pr-kpi-icon.purple { background: #f3e8ff; color: #7c3aed; }
.pr-kpi-icon.orange { background: #ffedd5; color: #f97316; }
.pr-kpi-icon.green { background: #dcfce7; color: #16a34a; }
.pr-kpi-icon.red { background: #fee2e2; color: #ef4444; }
.pr-kpi span:not(.pr-kpi-icon) {
  display: block;
  color: #000000;
  font-size: 12px;
  font-weight: 800;
}
.pr-kpi strong {
  display: block;
  margin-top: 6px;
  font-size: 24px;
  line-height: 1;
}
.pr-kpi small {
  display: block;
  margin-top: 8px;
  color: #000000;
  font-size: 12px;
}
.pr-workspace {
  border-radius: 16px;
  overflow: visible;
}
.pr-toolbar {
  gap: 12px;
  padding: 16px;
  border-bottom: 1px solid #e5e7eb;
}
.pr-search {
  min-width: 220px;
  flex: 1 1 360px;
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
.pr-toolbar .pr-search input {
  height: 100%;
  min-height: 0;
  padding: 0;
  border: 0;
  background: transparent !important;
  box-shadow: none;
}
.pr-search input,
.pr-select select,
.pr-form input,
.pr-form select,
.pr-form textarea {
  width: 100%;
  border: 0;
  outline: 0;
  background: transparent;
  font: inherit;
  color: #0f172a;
}
.pr-select {
  min-width: 150px;
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
  position: relative;
}
.pr-select span {
  white-space: nowrap;
}
.pr-toolbar .pr-select select,
.pr-filter-panel .pr-select select {
  min-height: 0;
  padding: 0 18px 0 0;
  border: 0;
  background: transparent !important;
  box-shadow: none;
  appearance: none;
}
.pr-select::after {
  content: "";
  width: 7px;
  height: 7px;
  border-right: 2px solid #0f172a;
  border-bottom: 2px solid #0f172a;
  transform: rotate(45deg);
  pointer-events: none;
  position: absolute;
  right: 14px;
  top: 16px;
}
.pr-view-toggle {
  margin-left: auto;
  display: inline-flex;
  border: 1px solid #e5e7eb;
  border-radius: 11px;
  overflow: hidden;
}
.pr-view-toggle button {
  width: 42px;
  border: 0;
  border-radius: 0;
}
.pr-view-toggle button.active {
  color: #16a34a;
  background: #ecfdf5;
}
.pr-filter-panel {
  gap: 12px;
  flex-wrap: wrap;
  padding: 14px 16px;
  border-bottom: 1px solid #e5e7eb;
  background: #f8fafc;
}
.pr-data-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 16px;
  padding: 16px;
}
.pr-data-layout.with-details {
  grid-template-columns: minmax(0, 1fr) minmax(300px, 340px);
}
.pr-list-card {
  min-width: 0;
}
.pr-table-wrap {
  min-width: 0;
  overflow: auto;
  border: 1px solid #edf2f7;
  border-radius: 12px;
}
.pr-table {
  width: 100%;
  min-width: 1040px;
  border-collapse: collapse;
}
.pr-table th,
.pr-table td {
  padding: 14px 12px;
  text-align: left;
  border-bottom: 1px solid #e5e7eb;
  font-size: 12px;
  vertical-align: middle;
}
.pr-table th {
  background: #f8fafc;
  color: #000000;
  text-transform: uppercase;
  font-size: 10px;
  letter-spacing: .02em;
}
.pr-table tr.selected,
.pr-table tr:hover {
  background: #f0fdf4;
}
.pr-link-button {
  border: 0;
  background: transparent;
  color: #2563eb;
  font: inherit;
  font-size: 12px;
  font-weight: 900;
  cursor: pointer;
}
.pr-badge {
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
.pr-badge.green { background: #dcfce7; color: #15803d; }
.pr-badge.blue { background: #dbeafe; color: #2563eb; }
.pr-badge.orange { background: #ffedd5; color: #f97316; }
.pr-badge.red { background: #fee2e2; color: #ef4444; }
.pr-badge.purple { background: #f3e8ff; color: #7c3aed; }
.pr-row-actions {
  position: relative;
}
.pr-action-menu {
  position: fixed;
  z-index: 1000;
  width: 178px;
  padding: 6px;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  background: #fff;
  box-shadow: 0 18px 40px rgba(15, 23, 42, 0.18);
}
.pr-action-menu button {
  width: 100%;
  min-height: 34px;
  border: 0;
  border-radius: 8px;
  background: transparent;
  text-align: left;
  padding: 0 11px;
  font: inherit;
  font-size: 12px;
  font-weight: 800;
  cursor: pointer;
  color: #0f172a;
}
.pr-action-menu button:hover {
  background: #f8fafc;
}
.pr-action-menu button:disabled:hover {
  background: transparent;
}
.pr-action-menu button:disabled {
  cursor: not-allowed;
  color: #94a3b8;
}
.pr-grid-list {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(230px, 1fr));
  gap: 12px;
}
.pr-request-card {
  border: 1px solid #e5e7eb;
  border-radius: 14px;
  padding: 15px;
  cursor: pointer;
  background: #fff;
}
.pr-request-card.selected {
  border-color: #16a34a;
  box-shadow: 0 0 0 3px #dcfce7;
}
.pr-request-card h3 {
  margin: 8px 0 6px;
  font-size: 15px;
}
.pr-request-card p {
  margin: 0;
  color: #000000;
  font-size: 12px;
}
.pr-card-badges,
.pr-card-meta {
  justify-content: space-between;
  gap: 8px;
  margin-top: 14px;
}
.pr-card-meta {
  color: #000000;
  font-size: 12px;
}
.pr-card-meta strong {
  color: #0f172a;
}
.pr-pagination {
  justify-content: space-between;
  gap: 12px;
  padding-top: 16px;
  font-size: 13px;
  font-weight: 800;
}
.pr-pagination > div {
  gap: 8px;
}
.pr-pagination button {
  width: 38px;
}
.pr-pagination button:disabled {
  opacity: .45;
  cursor: not-allowed;
}
.pr-pagination strong {
  width: 38px;
  height: 38px;
  border-radius: 10px;
  display: grid;
  place-items: center;
  background: #16a34a;
  color: #fff;
}
.pr-pagination select {
  padding: 0 10px;
}
.pr-empty,
.pr-inline-empty {
  min-height: 430px;
  display: grid;
  place-items: center;
  text-align: center;
  padding: 44px 18px;
}
.pr-empty > span {
  width: 118px;
  height: 118px;
  border-radius: 999px;
  display: grid;
  place-items: center;
  margin-bottom: 18px;
  background: #eff6ff;
  color: #000000;
}
.pr-empty h2 {
  margin: 0;
  font-size: 19px;
}
.pr-empty p {
  max-width: 360px;
  color: #000000;
  font-size: 13px;
  line-height: 1.55;
}
.pr-empty a {
  color: #2563eb;
  text-decoration: none;
  font-size: 13px;
  font-weight: 800;
}
.pr-inline-empty {
  min-height: 220px;
  gap: 7px;
}
.pr-inline-empty span {
  color: #000000;
  font-size: 13px;
}
.pr-inline-empty button {
  padding: 0 16px;
}
.pr-detail-card {
  border-radius: 16px;
  padding: 16px;
  align-self: start;
  position: sticky;
  top: 92px;
}
.pr-detail-head {
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 14px;
}
.pr-detail-head > div {
  gap: 10px;
  min-width: 0;
}
.pr-detail-head strong {
  font-size: 16px;
}
.pr-detail-tabs {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  border-bottom: 1px solid #e5e7eb;
  margin-bottom: 14px;
}
.pr-detail-tabs button {
  min-height: 38px;
  border: 0;
  border-bottom: 2px solid transparent;
  background: transparent;
  font: inherit;
  font-size: 12px;
  font-weight: 900;
  cursor: pointer;
}
.pr-detail-tabs button.active {
  border-color: #16a34a;
  color: #16a34a;
}
.pr-detail-body h3,
.pr-attachments h3 {
  margin: 0 0 12px;
  font-size: 13px;
}
.pr-detail-body p,
.pr-attachments p {
  margin: 12px 0;
  color: #000000;
  font-size: 13px;
  line-height: 1.45;
}
.pr-detail-row {
  display: grid;
  grid-template-columns: 110px minmax(0, 1fr);
  gap: 10px;
  padding: 8px 0;
  font-size: 12px;
}
.pr-detail-row span {
  color: #000000;
}
.pr-detail-row strong {
  color: #0f172a;
}
.pr-detail-summary {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
  margin-top: 14px;
  padding: 12px;
  background: #f8fafc;
  border-radius: 12px;
}
.pr-detail-summary span {
  display: grid;
  gap: 5px;
}
.pr-detail-summary small {
  color: #000000;
  font-size: 10px;
}
.pr-detail-summary strong {
  font-size: 12px;
}
.pr-detail-items {
  display: grid;
  gap: 10px;
}
.pr-detail-items article {
  display: grid;
  gap: 6px;
  padding: 10px;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  background: #f8fafc;
}
.pr-detail-items article strong {
  color: #0f172a;
  font-size: 13px;
}
.pr-detail-items article span,
.pr-detail-items article small {
  color: #000000;
  font-size: 12px;
}
.pr-detail-items article p {
  margin: 0;
}
.pr-attachments {
  margin-top: 14px;
  padding-top: 14px;
  border-top: 1px solid #e5e7eb;
}
.pr-attachments h3 {
  display: flex;
  justify-content: space-between;
}
.pr-attachments h3 span {
  color: #000000;
  font-weight: 700;
}
.pr-attachments div {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  gap: 8px;
  align-items: center;
  min-height: 36px;
  font-size: 12px;
  color: #2563eb;
}
.pr-detail-actions {
  gap: 10px;
  margin-top: 16px;
}
.pr-detail-actions > * {
  flex: 1;
}
.pr-drawer-backdrop {
  position: fixed;
  inset: 0;
  z-index: 80;
  background: rgba(15, 23, 42, .42);
  display: flex;
  justify-content: flex-end;
}
.pr-create-drawer {
  width: min(1040px, calc(100vw - 28px));
  height: 100%;
  border-radius: 0;
  overflow: auto;
}
.pr-drawer-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  padding: 24px;
  border-bottom: 1px solid #e5e7eb;
}
.pr-drawer-head h2 {
  margin: 0;
  font-size: 22px;
}
.pr-drawer-head p {
  margin: 8px 0 0;
  color: #000000;
  font-size: 13px;
}
.pr-form {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 16px;
  padding: 24px;
}
.pr-form-section,
.pr-form-error {
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  background: #fff;
}
.pr-form-section {
  display: grid;
  gap: 14px;
  padding: 16px;
}
.pr-form-error {
  margin: 0;
  padding: 12px 14px;
  background: #fef2f2;
  color: #b91c1c;
  font-size: 13px;
  font-weight: 800;
}
.pr-section-head {
  display: flex;
  justify-content: space-between;
  gap: 14px;
  align-items: flex-start;
}
.pr-section-head h3 {
  margin: 0;
  color: #0f172a;
  font-size: 15px;
}
.pr-section-head p {
  margin: 5px 0 0;
  color: #000000;
  font-size: 12px;
  line-height: 1.45;
}
.pr-form-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
}
.pr-form label {
  display: grid;
  gap: 8px;
  color: #334155;
  font-size: 12px;
  font-weight: 900;
}
.pr-form label.wide,
.pr-form-actions {
  grid-column: 1 / -1;
}
.pr-form input,
.pr-form select,
.pr-form textarea {
  min-height: 44px;
  border: 1px solid #d1d5db;
  border-radius: 11px;
  padding: 0 12px;
}
.pr-form textarea {
  min-height: 110px;
  padding: 12px;
  resize: vertical;
}
.pr-items-table-wrap {
  min-width: 0;
  overflow-x: auto;
  border: 1px solid #edf2f7;
  border-radius: 10px;
}
.pr-items-table {
  width: 100%;
  min-width: 1080px;
  table-layout: fixed;
  border-collapse: collapse;
}
.pr-items-table th:nth-child(1),
.pr-items-table td:nth-child(1) {
  width: 150px;
}
.pr-items-table th:nth-child(2),
.pr-items-table td:nth-child(2) {
  width: 128px;
}
.pr-items-table th:nth-child(3),
.pr-items-table td:nth-child(3) {
  width: 120px;
}
.pr-items-table th:nth-child(4),
.pr-items-table td:nth-child(4) {
  width: 330px;
}
.pr-items-table th:nth-child(5),
.pr-items-table td:nth-child(5) {
  width: 150px;
}
.pr-items-table th:nth-child(6),
.pr-items-table td:nth-child(6) {
  width: 170px;
}
.pr-items-table th:nth-child(7),
.pr-items-table td:nth-child(7) {
  width: 62px;
}
.pr-items-table th,
.pr-items-table td {
  padding: 10px;
  border-bottom: 1px solid #e5e7eb;
  text-align: left;
  vertical-align: top;
}
.pr-items-table th {
  background: #f8fafc;
  color: #000000;
  font-size: 10px;
  font-weight: 900;
  text-transform: uppercase;
}
.pr-items-table input,
.pr-items-table textarea {
  min-height: 38px;
  border-radius: 8px;
  font-size: 12px;
}
.pr-items-table textarea {
  min-height: 38px;
  resize: vertical;
}
.pr-items-table .pr-icon-button {
  width: 34px;
  min-height: 34px;
  border-radius: 8px;
}
.pr-icon-button.danger {
  color: #dc2626;
}
.pr-upload-types {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 8px;
}
.pr-upload-types span {
  min-height: 34px;
  display: grid;
  place-items: center;
  padding: 0 10px;
  border: 1px dashed #cbd5e1;
  border-radius: 9px;
  background: #f8fafc;
  color: #000000;
  font-size: 12px;
  font-weight: 800;
  text-align: center;
}
.pr-attachment-list {
  display: grid;
  gap: 8px;
}
.pr-attachment-list div {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto auto;
  gap: 10px;
  align-items: center;
  min-height: 38px;
  padding: 0 10px;
  border: 1px solid #e5e7eb;
  border-radius: 9px;
  background: #f8fafc;
  font-size: 12px;
}
.pr-attachment-list button {
  width: 28px;
  height: 28px;
  border: 0;
  border-radius: 7px;
  background: transparent;
  color: #dc2626;
  cursor: pointer;
}
.pr-approval-preview {
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  gap: 8px;
}
.pr-approval-preview span {
  min-height: 36px;
  display: grid;
  place-items: center;
  padding: 0 8px;
  border: 1px solid #dbeafe;
  border-radius: 9px;
  background: #eff6ff;
  color: #1d4ed8;
  font-size: 11px;
  font-weight: 900;
  text-align: center;
}
.pr-approval-preview span.active {
  border-color: #86efac;
  background: #ecfdf5;
  color: #15803d;
}
.pr-approval-preview.compact {
  grid-template-columns: repeat(4, minmax(0, 1fr));
  margin-top: 10px;
}
.pr-form-actions {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
  padding-top: 8px;
}
.pr-form-actions > * {
  min-width: 140px;
}
@media (max-width: 1280px) {
  .pr-stats {
    grid-template-columns: repeat(3, minmax(150px, 1fr));
  }
  .pr-data-layout.with-details {
    grid-template-columns: minmax(0, 1fr);
  }
  .pr-detail-card {
    position: static;
  }
}
@media (max-width: 820px) {
  .pr-page {
    padding: 18px 14px 28px;
  }
  .pr-page-head {
    display: grid;
  }
  .pr-actions {
    justify-content: stretch;
  }
  .pr-actions > *,
  .pr-toolbar > *,
  .pr-filter-panel > * {
    flex: 1 1 100%;
  }
  .pr-stats {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    overflow-x: auto;
    scroll-snap-type: x mandatory;
    padding-bottom: 4px;
  }
  .pr-kpi {
    min-width: 210px;
    scroll-snap-align: start;
  }
  .pr-toolbar {
    align-items: stretch;
    flex-wrap: wrap;
  }
  .pr-view-toggle {
    margin-left: 0;
    width: 100%;
  }
  .pr-view-toggle button {
    flex: 1;
  }
  .pr-table-wrap {
    border: 0;
    overflow: visible;
  }
  .pr-table,
  .pr-table thead,
  .pr-table tbody,
  .pr-table tr,
  .pr-table td {
    display: block;
    min-width: 0;
  }
  .pr-table thead {
    display: none;
  }
  .pr-table tr {
    border: 1px solid #e5e7eb;
    border-radius: 14px;
    padding: 14px;
    margin-bottom: 12px;
    background: #fff;
  }
  .pr-table td {
    border: 0;
    padding: 7px 0;
  }
  .pr-table td:nth-child(1) {
    display: none;
  }
  .pr-table td:nth-child(2) {
    font-size: 13px;
  }
  .pr-table td::before {
    content: attr(data-label);
    display: inline-block;
    min-width: 105px;
    color: #000000;
    font-size: 11px;
    font-weight: 900;
  }
  .pr-row-actions {
    display: flex;
    justify-content: flex-end;
  }
  .pr-pagination {
    display: grid;
  }
  .pr-detail-summary {
    grid-template-columns: 1fr;
  }
  .pr-create-drawer {
    width: 100vw;
  }
  .pr-form,
  .pr-form-grid {
    grid-template-columns: 1fr;
  }
  .pr-section-head {
    display: grid;
  }
  .pr-upload-types,
  .pr-approval-preview,
  .pr-approval-preview.compact {
    grid-template-columns: 1fr;
  }
  .pr-items-table-wrap {
    border: 0;
    overflow: visible;
  }
  .pr-items-table,
  .pr-items-table thead,
  .pr-items-table tbody,
  .pr-items-table tr,
  .pr-items-table td {
    display: block;
    min-width: 0;
  }
  .pr-items-table thead {
    display: none;
  }
  .pr-items-table tr {
    border: 1px solid #e5e7eb;
    border-radius: 12px;
    padding: 10px;
    margin-bottom: 10px;
    background: #fff;
  }
  .pr-items-table td {
    border: 0;
    padding: 7px 0;
  }
  .pr-items-table td::before {
    content: attr(data-label);
    display: block;
    margin-bottom: 6px;
    color: #000000;
    font-size: 10px;
    font-weight: 900;
    text-transform: uppercase;
  }
}
@media (max-width: 520px) {
  .pr-title-row {
    align-items: flex-start;
  }
  .pr-stats {
    grid-template-columns: 1fr;
  }
  .pr-kpi {
    min-width: 0;
  }
  .pr-data-layout {
    padding: 12px;
  }
  .pr-detail-tabs {
    overflow-x: auto;
    display: flex;
  }
  .pr-detail-tabs button {
    min-width: 90px;
  }
  .pr-create-drawer {
    border-radius: 18px 18px 0 0;
    height: calc(100% - 20px);
    margin-top: 20px;
  }
  .pr-drawer-head,
  .pr-form {
    padding: 18px;
  }
  .pr-form-actions {
    display: grid;
  }
  .pr-form-actions > * {
    width: 100%;
  }
}
`
