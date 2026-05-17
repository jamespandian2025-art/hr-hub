'use client'

import { FormEvent, useEffect, useMemo, useState } from 'react'
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
import { companyChangeEvent, companyScopedKey, getActiveCompany } from '@/lib/tenant/company'

const font = 'var(--font-body)'
const purchaseRequestsKey = 'flowsys-procurement-purchase-requests'

type StoredRequest = Record<string, unknown>

type RequestStatus = 'Pending' | 'Approved' | 'Completed' | 'Rejected'
type RequestPriority = 'Low' | 'Medium' | 'High' | 'Critical'
type DetailTab = 'Details' | 'Items' | 'Approvals' | 'Activity'
type ViewMode = 'table' | 'grid'

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
  total: number
  description: string
  itemCount: number
  totalQuantity: string
  attachments: Array<{ name: string; size?: string }>
  activity: string[]
  items: Array<{ name: string; quantity?: string; unit?: string; amount?: number }>
  source: StoredRequest
}

type RequestFormState = {
  subject: string
  requester: string
  department: string
  neededBy: string
  priority: RequestPriority
  total: string
  description: string
}

const emptyForm: RequestFormState = {
  subject: '',
  requester: '',
  department: '',
  neededBy: '',
  priority: 'Medium',
  total: '',
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
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [form, setForm] = useState<RequestFormState>(emptyForm)

  useEffect(() => {
    const load = () => {
      const activeCompany = getActiveCompany()
      const activeCompanyId = activeCompany?.id || ''
      setCompanyId(activeCompanyId)
      setStoredRequests(loadStoredRequests(activeCompanyId))
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

  function persist(nextRequests: StoredRequest[]) {
    const unique = uniqueRequests(nextRequests)
    setStoredRequests(unique)
    saveStoredRequests(unique, companyId)
  }

  function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const subject = form.subject.trim()
    if (!subject) return
    const now = new Date()
    const record: StoredRequest = {
      id: `pr-${Date.now()}`,
      companyId,
      requestNo: nextRequestNumber(requests),
      subject,
      requester: form.requester.trim() || 'Current user',
      department: form.department.trim() || 'Unassigned',
      requestDate: now.toISOString(),
      neededBy: form.neededBy,
      priority: form.priority,
      status: 'Pending',
      total: moneyValue(form.total),
      description: form.description.trim(),
      activity: [`Created ${formatDate(now.toISOString())}`],
    }
    persist([record, ...storedRequests])
    setSelectedId(String(record.id))
    setForm(emptyForm)
    setShowCreate(false)
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
    setOpenActionId('')
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
          <button type="button" className="pr-secondary-button" onClick={() => setViewMode(viewMode === 'table' ? 'grid' : 'table')}>
            <Grid3X3 size={16} /> Views <ChevronDown size={14} />
          </button>
          <button type="button" className="pr-secondary-button" onClick={() => setShowFilters(value => !value)}>
            <Filter size={16} /> Filters <span className="pr-filter-count">{activeFilterCount}</span>
          </button>
          <button type="button" className="pr-secondary-button" onClick={() => { setPriorityFilter(priorityFilter === 'High' ? 'All' : 'High'); setPage(1) }}>
            <PackageCheck size={16} /> Group by <ChevronDown size={14} />
          </button>
          <button type="button" className="pr-icon-button" aria-label="More purchase request actions">
            <MoreHorizontal size={18} />
          </button>
          <button type="button" className="pr-primary-button" onClick={() => setShowCreate(true)}>
            <Plus size={17} /> New Request <ChevronDown size={14} />
          </button>
        </div>
      </section>

      <section className="pr-stats" aria-label="Purchase request summary">
        <KpiCard title="Total Requests" value={stats.total} helper={stats.total ? 'From saved requests' : 'No requests yet'} icon={ClipboardList} tone="blue" />
        <KpiCard title="Pending" value={stats.pending} helper={stats.pending ? 'Awaiting review' : 'No pending requests'} icon={PackageCheck} tone="purple" />
        <KpiCard title="Approved" value={stats.approved} helper={stats.approved ? 'Ready for sourcing' : 'No approved requests'} icon={Send} tone="orange" />
        <KpiCard title="Completed" value={stats.completed} helper={stats.completed ? 'Fulfilled requests' : 'No completed requests'} icon={CheckCircle2} tone="green" />
        <KpiCard title="Rejected" value={stats.rejected} helper={stats.rejected ? 'Needs revision' : 'No rejected requests'} icon={XCircle} tone="red" />
      </section>

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
          <EmptyPurchaseRequests onCreate={() => setShowCreate(true)} />
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
                        <th>Priority</th>
                        <th>Status</th>
                        <th>Total</th>
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
                          <td data-label="Priority"><Badge tone={priorityConfig[request.priority].tone}>{priorityConfig[request.priority].label}</Badge></td>
                          <td data-label="Status"><Badge tone={statusConfig[request.status].tone}>{statusConfig[request.status].label}</Badge></td>
                          <td data-label="Total">{formatCurrency(request.total)}</td>
                          <td data-label="Actions">
                            <div className="pr-row-actions" onClick={event => event.stopPropagation()}>
                              <button type="button" aria-label={`Open actions for ${request.requestNo}`} onClick={() => setOpenActionId(openActionId === request.id ? '' : request.id)}>
                                <MoreHorizontal size={16} />
                              </button>
                              {openActionId === request.id && (
                                <div className="pr-action-menu">
                                  <button type="button" onClick={() => setSelectedId(request.id)}>Open details</button>
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
                        <strong>{formatCurrency(request.total)}</strong>
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
                  <button type="button" disabled={currentPage === 1} onClick={() => setPage(value => Math.max(1, value - 1))}>‹</button>
                  <strong>{currentPage}</strong>
                  <button type="button" disabled={currentPage === totalPages} onClick={() => setPage(value => Math.min(totalPages, value + 1))}>›</button>
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
              />
            )}
          </div>
        )}
      </section>

      {showCreate && (
        <div className="pr-drawer-backdrop" role="presentation" onMouseDown={() => setShowCreate(false)}>
          <aside className="pr-create-drawer" role="dialog" aria-modal="true" aria-labelledby="create-purchase-request-title" onMouseDown={event => event.stopPropagation()}>
            <div className="pr-drawer-head">
              <div>
                <h2 id="create-purchase-request-title">Create Purchase Request</h2>
                <p>Capture a team request and route it for procurement review.</p>
              </div>
              <button type="button" aria-label="Close create request form" onClick={() => setShowCreate(false)}><X size={20} /></button>
            </div>
            <form className="pr-form" onSubmit={handleCreate}>
              <label>
                Subject *
                <input value={form.subject} onChange={event => setForm({ ...form, subject: event.target.value })} placeholder="Item or request title" required />
              </label>
              <label>
                Requester
                <input value={form.requester} onChange={event => setForm({ ...form, requester: event.target.value })} placeholder="Employee name" />
              </label>
              <label>
                Department
                <input value={form.department} onChange={event => setForm({ ...form, department: event.target.value })} placeholder="Department or project team" />
              </label>
              <label>
                Needed by
                <input type="date" value={form.neededBy} onChange={event => setForm({ ...form, neededBy: event.target.value })} />
              </label>
              <label>
                Priority
                <select value={form.priority} onChange={event => setForm({ ...form, priority: event.target.value as RequestPriority })}>
                  {Object.keys(priorityConfig).map(priority => <option key={priority} value={priority}>{priority}</option>)}
                </select>
              </label>
              <label>
                Estimated total
                <input inputMode="decimal" value={form.total} onChange={event => setForm({ ...form, total: event.target.value })} placeholder="0.00" />
              </label>
              <label className="wide">
                Description
                <textarea value={form.description} onChange={event => setForm({ ...form, description: event.target.value })} placeholder="Purpose, item details, or supplier notes" />
              </label>
              <div className="pr-form-actions">
                <button type="button" className="pr-secondary-button" onClick={() => setShowCreate(false)}>Cancel</button>
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
}: {
  request: NormalizedRequest
  activeTab: DetailTab
  onTabChange: (tab: DetailTab) => void
  onClose: () => void
  onStatusChange: (status: RequestStatus) => void
}) {
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
            <span><small>Total Amount</small><strong>{formatCurrency(request.total)}</strong></span>
          </div>
        </div>
      )}
      {activeTab === 'Items' && (
        <div className="pr-detail-body">
          <h3>Items</h3>
          {request.items.length ? request.items.map(item => (
            <DetailRow key={`${item.name}-${item.quantity || ''}`} label={item.name} value={`${item.quantity || '-'} ${item.unit || ''} ${item.amount ? ` / ${formatCurrency(item.amount)}` : ''}`} />
          )) : <p>No item details have been added to this request.</p>}
        </div>
      )}
      {activeTab === 'Approvals' && (
        <div className="pr-detail-body">
          <h3>Approval Flow</h3>
          <DetailRow label="Current Status" value={request.status} />
          <DetailRow label="Next Action" value={request.status === 'Pending' ? 'Procurement review' : 'No pending review'} />
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
        <button type="button" className="pr-primary-button" onClick={() => onStatusChange('Completed')}>Complete</button>
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
  const rows = [...readStored(purchaseRequestsKey), ...(scopedKey === purchaseRequestsKey ? [] : readStored(scopedKey))]
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

function readStored(key: string): StoredRequest[] {
  if (typeof window === 'undefined') return []
  try {
    const parsed = JSON.parse(window.localStorage.getItem(key) || '[]') as unknown
    return Array.isArray(parsed) ? parsed.filter(isObjectRecord) : []
  } catch {
    return []
  }
}

function normalizeRequest(record: StoredRequest, index: number): NormalizedRequest | null {
  if (!record) return null
  const requestNo = readString(record, ['requestNo', 'requestNumber', 'reference', 'number']) || `PR-${String(index + 1).padStart(4, '0')}`
  const subject = readString(record, ['subject', 'item', 'itemName', 'title', 'description', 'name']) || 'Untitled request'
  const requester = readString(record, ['requester', 'requesterName', 'createdBy', 'employeeName', 'employee']) || 'Unassigned'
  const department = readString(record, ['department', 'team', 'costCenter']) || 'Unassigned'
  const rawItems = readArray(record.items).filter(isObjectRecord)
  const itemCount = rawItems.length || numberValue(record.itemCount) || (subject ? 1 : 0)
  const quantity = rawItems.reduce((sum, item) => sum + numberValue(item.quantity), 0)

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
    total: moneyValue(record.total ?? record.amount ?? record.estimatedTotal ?? record.grandTotal),
    description: readString(record, ['description', 'purpose', 'notes']),
    itemCount,
    totalQuantity: quantity ? String(quantity) : String(numberValue(record.totalQuantity) || itemCount),
    attachments: readArray(record.attachments).filter(isObjectRecord).map(item => ({
      name: readString(item, ['name', 'fileName', 'filename']) || 'Attachment',
      size: readString(item, ['size', 'fileSize']),
    })),
    activity: readStringArray(record.activity),
    items: rawItems.map(item => ({
      name: readString(item, ['name', 'itemName', 'description']) || 'Item',
      quantity: readString(item, ['quantity', 'qty']),
      unit: readString(item, ['unit', 'uom']),
      amount: moneyValue(item.amount ?? item.total),
    })),
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
  color: #64748b;
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
  color: #64748b;
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
  color: #64748b;
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
  color: #64748b;
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
  color: #64748b;
  background: #fff;
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
}
.pr-select span {
  white-space: nowrap;
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
  color: #475569;
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
  position: absolute;
  top: 46px;
  right: 0;
  z-index: 25;
  width: 170px;
  padding: 8px;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  background: #fff;
  box-shadow: 0 20px 45px rgba(15, 23, 42, 0.16);
}
.pr-action-menu button {
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
.pr-action-menu button:hover {
  background: #f1f5f9;
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
  color: #64748b;
  font-size: 12px;
}
.pr-card-badges,
.pr-card-meta {
  justify-content: space-between;
  gap: 8px;
  margin-top: 14px;
}
.pr-card-meta {
  color: #64748b;
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
  color: #64748b;
}
.pr-empty h2 {
  margin: 0;
  font-size: 19px;
}
.pr-empty p {
  max-width: 360px;
  color: #64748b;
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
  color: #64748b;
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
  color: #64748b;
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
  color: #64748b;
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
  color: #64748b;
  font-size: 10px;
}
.pr-detail-summary strong {
  font-size: 12px;
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
  color: #64748b;
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
  width: min(560px, 100vw);
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
  color: #64748b;
  font-size: 13px;
}
.pr-form {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  padding: 24px;
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
    color: #64748b;
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
  .pr-form {
    grid-template-columns: 1fr;
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
