'use client'

import { useEffect, useMemo, useState, type ComponentType } from 'react'
import { CheckCircle2, Clock3, FileCheck2, Filter, Search, ShieldCheck, XCircle } from 'lucide-react'
import { companyChangeEvent, companyScopedKey, getActiveCompany } from '@/lib/tenant/company'

const font = 'var(--font-body)'
const purchaseRequestsKey = 'flowsys-procurement-purchase-requests'
const rfqsKey = 'flowsys-procurement-rfqs'
const quotationsKey = 'flowsys-procurement-quotations'
const purchaseOrdersKey = 'flowsys-procurement-purchase-orders'

type StoredRow = Record<string, unknown>
type ApprovalType = 'Purchase Request' | 'RFQ' | 'Quotation' | 'Purchase Order'
type ApprovalStatus = 'Pending' | 'Approved' | 'Rejected'

type ApprovalItem = {
  id: string
  key: string
  sourceId: string
  type: ApprovalType
  reference: string
  title: string
  supplier: string
  requester: string
  amount: number
  submittedAt: string
  status: ApprovalStatus
  sourceStatus: string
}

const approvalTargets: Record<ApprovalType, { key: string; approved: string; rejected: string }> = {
  'Purchase Request': { key: purchaseRequestsKey, approved: 'Approved', rejected: 'Rejected' },
  RFQ: { key: rfqsKey, approved: 'Open', rejected: 'Cancelled' },
  Quotation: { key: quotationsKey, approved: 'Accepted', rejected: 'Declined' },
  'Purchase Order': { key: purchaseOrdersKey, approved: 'Open', rejected: 'Cancelled' },
}

export default function ProcurementApprovalsPage() {
  const [companyId, setCompanyId] = useState('')
  const [requests, setRequests] = useState<StoredRow[]>([])
  const [rfqs, setRfqs] = useState<StoredRow[]>([])
  const [quotes, setQuotes] = useState<StoredRow[]>([])
  const [orders, setOrders] = useState<StoredRow[]>([])
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<'All' | ApprovalType>('All')
  const [statusFilter, setStatusFilter] = useState<'All' | ApprovalStatus>('All')

  useEffect(() => {
    const load = () => {
      const activeCompanyId = getActiveCompany()?.id || ''
      setCompanyId(activeCompanyId)
      setRequests(loadRows(purchaseRequestsKey, activeCompanyId))
      setRfqs(loadRows(rfqsKey, activeCompanyId))
      setQuotes(loadRows(quotationsKey, activeCompanyId))
      setOrders(loadRows(purchaseOrdersKey, activeCompanyId))
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

  const approvals = useMemo(() => [
    ...requests.map((row, index) => normalizeApproval(row, index, 'Purchase Request')),
    ...rfqs.map((row, index) => normalizeApproval(row, index, 'RFQ')),
    ...quotes.map((row, index) => normalizeApproval(row, index, 'Quotation')),
    ...orders.map((row, index) => normalizeApproval(row, index, 'Purchase Order')),
  ].filter(Boolean) as ApprovalItem[], [orders, quotes, requests, rfqs])

  const filteredApprovals = useMemo(() => {
    const needle = search.trim().toLowerCase()
    return approvals.filter(item => {
      const matchesSearch = !needle || [
        item.reference,
        item.title,
        item.supplier,
        item.requester,
        item.type,
        item.sourceStatus,
      ].some(value => value.toLowerCase().includes(needle))
      const matchesType = typeFilter === 'All' || item.type === typeFilter
      const matchesStatus = statusFilter === 'All' || item.status === statusFilter
      return matchesSearch && matchesType && matchesStatus
    })
  }, [approvals, search, statusFilter, typeFilter])

  const stats = useMemo(() => ({
    total: approvals.length,
    pending: approvals.filter(item => item.status === 'Pending').length,
    approved: approvals.filter(item => item.status === 'Approved').length,
    rejected: approvals.filter(item => item.status === 'Rejected').length,
    value: approvals.filter(item => item.status === 'Pending').reduce((sum, item) => sum + item.amount, 0),
  }), [approvals])

  function updateApproval(item: ApprovalItem, decision: 'approve' | 'reject') {
    const target = approvalTargets[item.type]
    const nextStatus = decision === 'approve' ? target.approved : target.rejected
    const now = new Date().toISOString()
    const rows = loadRows(target.key, companyId).map(row => {
      const id = textFrom(row.id) || textFrom(row.requestNo) || textFrom(row.rfqNumber) || textFrom(row.quoteNumber) || textFrom(row.poNumber)
      if (id !== item.sourceId) return row
      return {
        ...row,
        status: nextStatus,
        approvalStatus: decision === 'approve' ? 'Approved' : 'Rejected',
        approvedAt: decision === 'approve' ? now : row.approvedAt,
        rejectedAt: decision === 'reject' ? now : row.rejectedAt,
        activity: [`${decision === 'approve' ? 'Approved' : 'Rejected'} from procurement approvals on ${formatDate(now)}`, ...readStringArray(row.activity)],
        updatedAt: now,
      }
    })
    persistRows(target.key, rows, companyId)
    if (item.type === 'Purchase Request') setRequests(rows)
    if (item.type === 'RFQ') setRfqs(rows)
    if (item.type === 'Quotation') setQuotes(rows)
    if (item.type === 'Purchase Order') setOrders(rows)
  }

  function resetFilters() {
    setSearch('')
    setTypeFilter('All')
    setStatusFilter('All')
  }

  return (
    <main className="proc-approvals" style={{ fontFamily: font }}>
      <style>{approvalsCss}</style>
      <header className="approval-head">
        <div>
          <div className="approval-breadcrumb"><span>Procurement</span><span>/</span><strong>Approvals</strong></div>
          <div className="approval-title">
            <span><ShieldCheck size={22} /></span>
            <div>
              <h1>Procurement Approvals</h1>
              <p>Review purchase requests, RFQs, quotations, and purchase orders from one queue.</p>
            </div>
          </div>
        </div>
        <button type="button" className="approval-secondary" onClick={resetFilters}><Filter size={16} /> Reset</button>
      </header>

      <section className="approval-kpis" aria-label="Procurement approval summary">
        <Kpi icon={FileCheck2} title="Total Items" value={String(stats.total)} helper="Approval records" />
        <Kpi icon={Clock3} title="Pending" value={String(stats.pending)} helper={formatCurrency(stats.value)} />
        <Kpi icon={CheckCircle2} title="Approved" value={String(stats.approved)} helper="Completed decisions" />
        <Kpi icon={XCircle} title="Rejected" value={String(stats.rejected)} helper="Returned or cancelled" />
      </section>

      <section className="approval-workspace">
        <div className="approval-toolbar">
          <label className="approval-search">
            <Search size={17} />
            <input value={search} onChange={event => setSearch(event.target.value)} placeholder="Search approvals, supplier, requester, reference..." />
          </label>
          <label>
            Type
            <select value={typeFilter} onChange={event => setTypeFilter(event.target.value as 'All' | ApprovalType)}>
              {(['All', 'Purchase Request', 'RFQ', 'Quotation', 'Purchase Order'] as const).map(option => <option key={option} value={option}>{option}</option>)}
            </select>
          </label>
          <label>
            Status
            <select value={statusFilter} onChange={event => setStatusFilter(event.target.value as 'All' | ApprovalStatus)}>
              {(['All', 'Pending', 'Approved', 'Rejected'] as const).map(option => <option key={option} value={option}>{option}</option>)}
            </select>
          </label>
        </div>

        {filteredApprovals.length ? (
          <div className="approval-table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Reference</th>
                  <th>Type</th>
                  <th>Title</th>
                  <th>Supplier / Requester</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredApprovals.map(item => (
                  <tr key={item.key}>
                    <td><strong>{item.reference}</strong><small>{formatDate(item.submittedAt)}</small></td>
                    <td>{item.type}</td>
                    <td><strong>{item.title}</strong><small>Source: {item.sourceStatus}</small></td>
                    <td>{item.supplier || item.requester || '-'}</td>
                    <td>{formatCurrency(item.amount)}</td>
                    <td><Badge status={item.status} /></td>
                    <td>
                      <div className="approval-actions">
                        <button type="button" disabled={item.status === 'Approved'} onClick={() => updateApproval(item, 'approve')}><CheckCircle2 size={15} /> Approve</button>
                        <button type="button" className="danger" disabled={item.status === 'Rejected'} onClick={() => updateApproval(item, 'reject')}><XCircle size={15} /> Reject</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="approval-empty">
            <ShieldCheck size={42} />
            <strong>No approvals match this view</strong>
            <p>Create or submit procurement records, then use this queue to approve or reject them.</p>
          </div>
        )}
      </section>
    </main>
  )
}

function Kpi({ icon: Icon, title, value, helper }: { icon: ComponentType<{ size?: number }>; title: string; value: string; helper: string }) {
  return (
    <article>
      <span><Icon size={20} /></span>
      <div>
        <small>{title}</small>
        <strong>{value}</strong>
        <p>{helper}</p>
      </div>
    </article>
  )
}

function Badge({ status }: { status: ApprovalStatus }) {
  return <span className={`approval-badge ${status.toLowerCase()}`}>{status}</span>
}

function normalizeApproval(row: StoredRow, index: number, type: ApprovalType): ApprovalItem | null {
  const status = textFrom(row.status)
  const reference = type === 'Purchase Request'
    ? textFrom(row.requestNo || row.requestNumber || row.reference) || `PR-${String(index + 1).padStart(4, '0')}`
    : type === 'RFQ'
      ? textFrom(row.rfqNumber || row.number || row.reference) || `RFQ-${String(index + 1).padStart(4, '0')}`
      : type === 'Quotation'
        ? textFrom(row.quoteNumber || row.quotationNumber || row.number) || `QT-${String(index + 1).padStart(5, '0')}`
        : textFrom(row.poNumber || row.number || row.reference) || `PO-${String(index + 1).padStart(4, '0')}`

  const approvalStatus = approvalStatusFor(type, status, textFrom(row.approvalStatus))
  return {
    id: `${type}-${reference}`,
    key: `${type}-${textFrom(row.id) || reference}`,
    sourceId: textFrom(row.id) || reference,
    type,
    reference,
    title: textFrom(row.subject || row.title || row.name || row.description || row.referenceNotes) || `${type} approval`,
    supplier: textFrom(row.supplierName || row.supplier || row.vendorName),
    requester: textFrom(row.requester || row.requesterName || row.createdBy),
    amount: moneyFrom(row.total ?? row.grandTotal ?? row.estimatedValue ?? row.amount ?? row.subtotal),
    submittedAt: textFrom(row.createdAt || row.submittedDate || row.orderDate || row.issueDate || row.requestDate || row.date) || new Date().toISOString(),
    status: approvalStatus,
    sourceStatus: status || 'Pending',
  }
}

function approvalStatusFor(type: ApprovalType, status: string, explicit: string): ApprovalStatus {
  if (explicit === 'Approved' || explicit === 'Rejected') return explicit
  if (['Rejected', 'Declined', 'Cancelled'].includes(status)) return 'Rejected'
  if (type === 'Purchase Request' && ['Approved', 'Completed'].includes(status)) return 'Approved'
  if (type === 'RFQ' && ['Open', 'Awarded', 'Closed'].includes(status)) return 'Approved'
  if (type === 'Quotation' && status === 'Accepted') return 'Approved'
  if (type === 'Purchase Order' && ['Open', 'Partially Received', 'Received'].includes(status)) return 'Approved'
  return 'Pending'
}

function loadRows(key: string, companyId: string) {
  if (typeof window === 'undefined') return []
  const scopedKey = companyId ? companyScopedKey(key, companyId) : key
  const scopedRows = scopedKey === key ? [] : readRows(scopedKey)
  const globalRows = readRows(key)
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
  const serialized = JSON.stringify(unique)
  window.localStorage.setItem(key, serialized)
  if (companyId) window.localStorage.setItem(companyScopedKey(key, companyId), serialized)
  window.dispatchEvent(new Event('storage'))
}

function readRows(key: string) {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(key) || '[]') as unknown
    if (Array.isArray(parsed)) return parsed.filter(isRecord)
    return []
  } catch {
    return []
  }
}

function uniqueRows(rows: StoredRow[]) {
  const seen = new Set<string>()
  return rows.filter((row, index) => {
    const id = textFrom(row.id) || textFrom(row.requestNo) || textFrom(row.rfqNumber) || textFrom(row.quoteNumber) || textFrom(row.poNumber) || String(index)
    if (seen.has(id)) return false
    seen.add(id)
    return true
  })
}

function isRecord(value: unknown): value is StoredRow {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value))
}

function textFrom(value: unknown) {
  return typeof value === 'string' ? value.trim() : typeof value === 'number' ? String(value) : ''
}

function readStringArray(value: unknown) {
  return Array.isArray(value) ? value.map(textFrom).filter(Boolean) : typeof value === 'string' && value.trim() ? [value] : []
}

function moneyFrom(value: unknown) {
  const parsed = typeof value === 'number' ? value : typeof value === 'string' ? Number(value.replace(/[^0-9.-]/g, '')) : 0
  return Number.isFinite(parsed) ? parsed : 0
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', maximumFractionDigits: 0 }).format(value || 0)
}

function formatDate(value: string) {
  if (!value) return '-'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(date)
}

const approvalsCss = `
.proc-approvals {
  padding: 28px;
  color: #0f172a;
}
.approval-head {
  display: flex;
  justify-content: space-between;
  gap: 18px;
  align-items: flex-start;
  margin-bottom: 22px;
}
.approval-breadcrumb {
  display: flex;
  gap: 8px;
  color: #64748b;
  font-size: 13px;
  margin-bottom: 10px;
}
.approval-title {
  display: flex;
  align-items: center;
  gap: 12px;
}
.approval-title > span,
.approval-kpis article > span {
  width: 42px;
  height: 42px;
  display: grid;
  place-items: center;
  border-radius: 10px;
  background: #dcfce7;
  color: #16a34a;
}
.approval-title h1 {
  margin: 0;
  font-size: 28px;
}
.approval-title p,
.approval-kpis p,
.approval-empty p,
td small {
  margin: 3px 0 0;
  color: #64748b;
}
.approval-secondary,
.approval-actions button {
  border: 1px solid #d1d5db;
  background: #fff;
  color: #0f172a;
  border-radius: 10px;
  min-height: 40px;
  padding: 0 13px;
  display: inline-flex;
  align-items: center;
  gap: 7px;
  font-weight: 800;
  cursor: pointer;
}
.approval-kpis {
  display: grid;
  grid-template-columns: repeat(4, minmax(160px, 1fr));
  gap: 14px;
  margin-bottom: 18px;
}
.approval-kpis article {
  border: 1px solid #e5e7eb;
  background: #fff;
  border-radius: 12px;
  padding: 16px;
  display: flex;
  gap: 12px;
}
.approval-kpis small {
  color: #64748b;
  font-weight: 800;
}
.approval-kpis strong {
  display: block;
  font-size: 22px;
  margin-top: 4px;
}
.approval-workspace {
  border: 1px solid #e5e7eb;
  background: #fff;
  border-radius: 14px;
  overflow: hidden;
}
.approval-toolbar {
  padding: 14px;
  border-bottom: 1px solid #e5e7eb;
  display: flex;
  gap: 12px;
  align-items: end;
  flex-wrap: wrap;
}
.approval-search {
  flex: 1 1 320px;
}
.approval-toolbar label {
  display: grid;
  gap: 6px;
  color: #334155;
  font-size: 12px;
  font-weight: 900;
}
.approval-search {
  position: relative;
}
.approval-search svg {
  position: absolute;
  left: 12px;
  bottom: 12px;
  color: #64748b;
}
.approval-toolbar input,
.approval-toolbar select {
  min-height: 42px;
  border: 1px solid #d1d5db;
  border-radius: 10px;
  padding: 0 12px;
  min-width: 170px;
  background: #fff;
}
.approval-search input {
  padding-left: 38px;
  width: 100%;
}
.approval-table-wrap {
  overflow-x: auto;
}
table {
  width: 100%;
  border-collapse: collapse;
  min-width: 920px;
}
th,
td {
  padding: 14px;
  text-align: left;
  border-bottom: 1px solid #eef2f7;
  vertical-align: top;
  font-size: 13px;
}
th {
  background: #f8fafc;
  color: #475569;
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: .04em;
}
td strong,
td small {
  display: block;
}
.approval-badge {
  display: inline-flex;
  border-radius: 999px;
  padding: 5px 10px;
  font-size: 12px;
  font-weight: 900;
  border: 1px solid transparent;
}
.approval-badge.pending {
  background: #fff7ed;
  color: #c2410c;
  border-color: #fed7aa;
}
.approval-badge.approved {
  background: #dcfce7;
  color: #15803d;
  border-color: #bbf7d0;
}
.approval-badge.rejected {
  background: #fee2e2;
  color: #b91c1c;
  border-color: #fecaca;
}
.approval-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}
.approval-actions button:first-child {
  border-color: #bbf7d0;
  color: #15803d;
}
.approval-actions button.danger {
  border-color: #fecaca;
  color: #b91c1c;
}
.approval-actions button:disabled {
  opacity: .45;
  cursor: not-allowed;
}
.approval-empty {
  padding: 54px 18px;
  display: grid;
  place-items: center;
  text-align: center;
  gap: 8px;
  color: #64748b;
}
.approval-empty strong {
  color: #0f172a;
  font-size: 18px;
}
@media (max-width: 900px) {
  .proc-approvals {
    padding: 18px 14px;
  }
  .approval-head {
    display: grid;
  }
  .approval-kpis {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .approval-toolbar > * {
    flex: 1 1 100%;
  }
}
@media (max-width: 520px) {
  .approval-kpis {
    grid-template-columns: 1fr;
  }
}
`
