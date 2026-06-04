'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Copy,
  Database,
  Download,
  ExternalLink,
  FileText,
  Filter,
  LockKeyhole,
  MoreHorizontal,
  RotateCcw,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  User,
  UserCircle2,
  X,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { AnalyticsToggleButton, CollapsibleAnalytics, useAnalyticsDisclosure } from '@/components/AnalyticsDisclosure'
import {
  emptyAccountingData,
  formatDate,
  loadAccountingData,
  subscribeAccountingData,
  type AccountingAuditEvent,
} from '@/lib/accounting/data'

const font = 'var(--font-body)'

type AuditStatus = string
type AuditAction = string
type AuditLogView = AccountingAuditEvent & { dateTime: string }

type AuditMenuState = {
  eventId: string
  top: number
  left: number
}

type Metric = {
  title: string
  value: string
  detail: string
  trend: 'up' | 'down'
  icon: LucideIcon
  tone: string
}

const tabs = ['All Logs', 'User Activity', 'Data Changes', 'Security Events', 'System Events', 'Access Management']
const userColors: Record<string, string> = {
  JU: '#16a34a',
  EC: '#7c3aed',
  MS: '#f59e0b',
  AS: '#ef4444',
  RB: '#2563eb',
}

function formatNumber(value: number) {
  return value.toLocaleString('en-US')
}

function actionClass(action: AuditAction) {
  return action.toLowerCase().replaceAll(' ', '-')
}

function AuditPill({ value }: { value: AuditAction | AuditStatus }) {
  const className = value === 'Success' || value === 'Failed' ? value.toLowerCase() : actionClass(value as AuditAction)
  return <span className={`audit-pill ${className}`}>{value}</span>
}

export default function AuditLogsPage() {
  const [data, setData] = useState(emptyAccountingData)
  const [activeTab, setActiveTab] = useState(tabs[0])
  const [query, setQuery] = useState('')
  const [moduleFilter, setModuleFilter] = useState('All Modules')
  const [actionFilter, setActionFilter] = useState('All Actions')
  const [userFilter, setUserFilter] = useState('All Users')
  const [statusFilter, setStatusFilter] = useState('All Status')
  const [filtersOpen, setFiltersOpen] = useState(true)
  const [activeMenu, setActiveMenu] = useState<AuditMenuState | null>(null)
  const [selectedLogId, setSelectedLogId] = useState('')
  const [actionNotice, setActionNotice] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const analytics = useAnalyticsDisclosure('wiseflow:analytics:accounting-audit-logs')

  useEffect(() => {
    const load = () => setData(loadAccountingData())
    load()
    return subscribeAccountingData(load)
  }, [])

  const auditEvents: AuditLogView[] = data.auditEvents.map(event => ({ ...event, dateTime: formatDate(event.dateTime) }))
  const moduleOptions = Array.from(new Set(auditEvents.map(event => event.module).filter(Boolean))).sort()
  const actionOptions = Array.from(new Set(auditEvents.map(event => event.action).filter(Boolean))).sort()
  const userOptions = Array.from(new Set(auditEvents.map(event => event.user).filter(Boolean))).sort()
  const statusOptions = Array.from(new Set(auditEvents.map(event => event.status).filter(Boolean))).sort()
  const searchedEvents = auditEvents.filter(event => {
    const tabMatches =
      activeTab === 'All Logs' ||
      (activeTab === 'User Activity' && /user|employee|allowance|loan|payroll/i.test(`${event.module} ${event.action} ${event.details}`)) ||
      (activeTab === 'Data Changes' && /created|updated|deleted|change|edit|approved/i.test(event.action)) ||
      (activeTab === 'Security Events' && /security|access|login|password|permission/i.test(`${event.module} ${event.action} ${event.details}`)) ||
      (activeTab === 'System Events' && /system|sync|export|import|payroll run/i.test(`${event.module} ${event.action} ${event.details}`)) ||
      (activeTab === 'Access Management' && /access|permission|role|login/i.test(`${event.module} ${event.action} ${event.details}`))
    const queryValue = query.trim().toLowerCase()
    const queryMatches = !queryValue || [event.id, event.user, event.role, event.action, event.module, event.details, event.ipAddress, event.status].join(' ').toLowerCase().includes(queryValue)
    const moduleMatches = moduleFilter === 'All Modules' || event.module === moduleFilter
    const actionMatches = actionFilter === 'All Actions' || event.action === actionFilter
    const userMatches = userFilter === 'All Users' || event.user === userFilter
    const statusMatches = statusFilter === 'All Status' || event.status === statusFilter
    return tabMatches && queryMatches && moduleMatches && actionMatches && userMatches && statusMatches
  })
  const totalPages = Math.max(1, Math.ceil(searchedEvents.length / pageSize))
  const safeCurrentPage = Math.min(currentPage, totalPages)
  const pagedEvents = searchedEvents.slice((safeCurrentPage - 1) * pageSize, safeCurrentPage * pageSize)
  const uniqueUsers = new Set(auditEvents.map(event => event.user)).size
  const securityEvents = auditEvents.filter(event => /security|access|login|password|permission/i.test(`${event.module} ${event.action} ${event.details}`)).length
  const failedAttempts = auditEvents.filter(event => event.status === 'Failed' || /failed|denied/i.test(event.action)).length
  const dataChanges = auditEvents.filter(event => /created|updated|deleted|change|edit/i.test(event.action)).length
  const auditSummary = {
    totalEvents: auditEvents.length,
    uniqueUsers,
    securityEvents,
    failedAttempts,
    dataChanges,
  }
  const selectedLog = selectedLogId ? auditEvents.find(event => event.id === selectedLogId) : undefined
  const metrics: Metric[] = [
    { title: 'Total Events', value: formatNumber(auditSummary.totalEvents), detail: 'Recorded system events', trend: 'up', icon: FileText, tone: '#2563eb' },
    { title: 'Unique Users', value: formatNumber(auditSummary.uniqueUsers), detail: 'Actors in audit history', trend: 'up', icon: User, tone: '#16a34a' },
    { title: 'Security Events', value: formatNumber(auditSummary.securityEvents), detail: 'Access and security records', trend: 'up', icon: ShieldCheck, tone: '#7c3aed' },
    { title: 'Failed Attempts', value: formatNumber(auditSummary.failedAttempts), detail: 'Failed or denied actions', trend: 'down', icon: AlertTriangle, tone: '#f97316' },
    { title: 'Data Changes', value: formatNumber(auditSummary.dataChanges), detail: 'Create, update, and delete actions', trend: 'up', icon: CheckCircle2, tone: '#0f766e' },
  ]

  function resetFilters() {
    setActiveTab(tabs[0])
    setQuery('')
    setModuleFilter('All Modules')
    setActionFilter('All Actions')
    setUserFilter('All Users')
    setStatusFilter('All Status')
    setCurrentPage(1)
    setActiveMenu(null)
    setActionNotice('')
  }

  function exportEvents(rows = searchedEvents) {
    const header = ['Event ID', 'Date & Time', 'User', 'Role', 'Action', 'Module', 'Details', 'IP Address', 'Status']
    const csv = [
      header.join(','),
      ...rows.map(event => [event.id, event.dateTime, event.user, event.role, event.action, event.module, event.details, event.ipAddress, event.status].map(value => `"${String(value).replaceAll('"', '""')}"`).join(',')),
    ].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = rows.length === 1 ? `${rows[0].id}.csv` : `audit-logs-${new Date().toISOString().slice(0, 10)}.csv`
    link.click()
    URL.revokeObjectURL(url)
    setActionNotice(rows.length === 1 ? `${rows[0].id} exported.` : `${rows.length} audit log${rows.length === 1 ? '' : 's'} exported.`)
    setActiveMenu(null)
  }

  function copyEventId(event: AuditLogView) {
    void navigator.clipboard?.writeText(event.id)
    setSelectedLogId(event.id)
    setActionNotice(`${event.id} copied to clipboard.`)
    setActiveMenu(null)
  }

  function openEvent(event: AuditLogView) {
    setSelectedLogId(event.id)
    setActionNotice(`${event.id} selected in Log Details.`)
    setActiveMenu(null)
  }

  function toggleMenu(eventId: string, element: HTMLButtonElement) {
    const rect = element.getBoundingClientRect()
    setActiveMenu(current => current?.eventId === eventId
      ? null
      : {
        eventId,
        top: rect.bottom + 6,
        left: Math.max(12, Math.min(window.innerWidth - 188, rect.right - 172)),
      })
  }

  return (
    <div
      className="audit-page"
      style={{
        fontFamily: font,
        minHeight: 'calc(100dvh - 76px)',
        background: '#101010',
        color: '#fafafa',
      }}
    >
      <style>{auditCss}</style>

      <div className="audit-header">
        <div>
          <h1>Audit Logs</h1>
          <p>Track system activities and changes across the platform for security and compliance.</p>
        </div>
        <div className="audit-actions">
          <AnalyticsToggleButton open={analytics.open} onToggle={analytics.toggle} panelId={analytics.panelId} />
          <button type="button" onClick={() => exportEvents()}>Export <Download size={14} /></button>
        </div>
      </div>

      <CollapsibleAnalytics open={analytics.open} id={analytics.panelId}>
        <section className="audit-metrics">
          {metrics.map(metric => {
            const Icon = metric.icon
            return (
              <article key={metric.title} className="audit-card audit-metric">
                <span style={{ color: metric.tone, background: `${metric.tone}12` }}><Icon size={22} /></span>
                <div>
                  <small>{metric.title}</small>
                  <strong>{metric.value}</strong>
                  <em className={metric.trend}>{metric.trend === 'up' ? 'Up' : 'Down'} {metric.detail}</em>
                </div>
              </article>
            )
          })}
        </section>
      </CollapsibleAnalytics>

      <nav className="audit-tabs" aria-label="Audit log categories">
        {tabs.map(tab => (
          <button
            type="button"
            key={tab}
            className={activeTab === tab ? 'is-active' : undefined}
            onClick={() => { setActiveTab(tab); setCurrentPage(1); setActiveMenu(null) }}
          >
            {tab}
          </button>
        ))}
      </nav>

      <div className="audit-filter-toolbar">
        <button type="button" className={filtersOpen ? 'is-active' : undefined} onClick={() => setFiltersOpen(open => !open)}><Filter size={15} /> Filters</button>
      </div>

      {filtersOpen && <section className="audit-filter-panel">
        <label className="audit-search">
          <Search size={16} color="#000000" />
          <input value={query} onChange={event => { setQuery(event.target.value); setCurrentPage(1) }} placeholder="Search by user, action, module, IP..." />
        </label>
        <label className="audit-select">Module
          <select value={moduleFilter} onChange={event => { setModuleFilter(event.target.value); setCurrentPage(1) }}>
            <option>All Modules</option>
            {moduleOptions.map(option => <option key={option}>{option}</option>)}
          </select>
        </label>
        <label className="audit-select">Action
          <select value={actionFilter} onChange={event => { setActionFilter(event.target.value); setCurrentPage(1) }}>
            <option>All Actions</option>
            {actionOptions.map(option => <option key={option}>{option}</option>)}
          </select>
        </label>
        <label className="audit-select">User
          <select value={userFilter} onChange={event => { setUserFilter(event.target.value); setCurrentPage(1) }}>
            <option>All Users</option>
            {userOptions.map(option => <option key={option}>{option}</option>)}
          </select>
        </label>
        <label className="audit-select">Status
          <select value={statusFilter} onChange={event => { setStatusFilter(event.target.value); setCurrentPage(1) }}>
            <option>All Status</option>
            {statusOptions.map(option => <option key={option}>{option}</option>)}
          </select>
        </label>
        <button type="button" className="more" onClick={() => setQuery('')}><SlidersHorizontal size={15} /> Clear Search</button>
        <button type="button" className="clear" onClick={resetFilters}><RotateCcw size={15} /> Clear Filters</button>
      </section>}

      {actionNotice && <div className="audit-notice" role="status">{actionNotice}</div>}

      <section className="audit-content">
        <div className="audit-card audit-table-card">
          <div className="audit-table-wrap">
            <table className="audit-table">
              <thead>
                <tr>
                  <th>Date & Time</th>
                  <th>User</th>
                  <th>Action</th>
                  <th>Module</th>
                  <th>Details</th>
                  <th>IP Address</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {pagedEvents.map(event => (
                  <tr key={event.id} className={selectedLog?.id === event.id ? 'is-selected' : undefined}>
                    <td data-label="Date & Time">{event.dateTime}</td>
                    <td data-label="User">
                      <span className="audit-user">
                        <span className="avatar" style={{ background: userColors[event.initials] }}>{event.initials}</span>
                        <strong>{event.user}<small>{event.role}</small></strong>
                      </span>
                    </td>
                    <td data-label="Action"><AuditPill value={event.action} /></td>
                    <td data-label="Module">{event.module}</td>
                    <td data-label="Details">{event.details}</td>
                    <td data-label="IP Address">{event.ipAddress}</td>
                    <td data-label="Status"><AuditPill value={event.status} /></td>
                    <td data-label="Actions">
                      <div className="audit-row-actions">
                        <button type="button" aria-expanded={activeMenu?.eventId === event.id} aria-label={`More actions for ${event.id}`} onClick={click => toggleMenu(event.id, click.currentTarget)}><MoreHorizontal size={16} /></button>
                        {activeMenu?.eventId === event.id && (
                          <div className="audit-row-menu" role="menu" style={{ top: activeMenu.top, left: activeMenu.left }}>
                            <button type="button" role="menuitem" onClick={() => openEvent(event)}>View details</button>
                            <button type="button" role="menuitem" onClick={() => copyEventId(event)}>Copy event ID</button>
                            <button type="button" role="menuitem" onClick={() => exportEvents([event])}>Export log</button>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {!searchedEvents.length && (
                  <tr>
                    <td colSpan={8} style={{ padding: 28, textAlign: 'center', color: '#000000', fontWeight: 800 }}>
                      {auditEvents.length ? 'No audit events match these filters.' : 'No audit events yet. Finance, payroll, loan, allowance, and employee changes will appear here.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="audit-pagination">
            <span>Showing {searchedEvents.length ? (safeCurrentPage - 1) * pageSize + 1 : 0} to {Math.min(safeCurrentPage * pageSize, searchedEvents.length)} of {formatNumber(searchedEvents.length)} events</span>
            <div>
              <button type="button" aria-label="Previous page" disabled={safeCurrentPage === 1} onClick={() => setCurrentPage(page => Math.max(1, page - 1))}><ChevronLeft size={15} /></button>
              {[1].map(page => <button key={page} type="button" className={safeCurrentPage === page ? 'is-active' : undefined} onClick={() => setCurrentPage(page)}>{page}</button>)}
              {totalPages > 1 && (
                <>
                  <span>...</span>
                  <button type="button" className={safeCurrentPage === totalPages ? 'is-active' : undefined} onClick={() => setCurrentPage(totalPages)}>{totalPages}</button>
                </>
              )}
              <button type="button" aria-label="Next page" disabled={safeCurrentPage === totalPages} onClick={() => setCurrentPage(page => Math.min(totalPages, page + 1))}><ChevronRight size={15} /></button>
            </div>
            <select value={pageSize} onChange={event => { setPageSize(Number(event.target.value)); setCurrentPage(1) }} aria-label="Rows per page">
              {[5, 10, 25, 50].map(size => <option key={size} value={size}>{size} / page</option>)}
            </select>
          </div>
        </div>

        {selectedLog ? <section className="audit-card audit-details" aria-label="Selected audit log details">
          <div className="details-title">
            <h2>Log Details</h2>
            <button type="button" aria-label="Close details" onClick={() => setSelectedLogId('')}><X size={16} /></button>
          </div>
          <div className="event-id">
            <small>Event ID</small>
            <strong>{selectedLog.id}<Copy size={14} /></strong>
          </div>
          <dl className="detail-list">
            <div><dt><CalendarDays size={14} /> Date & Time</dt><dd>{selectedLog.dateTime}</dd></div>
            <div><dt><UserCircle2 size={14} /> User</dt><dd>{selectedLog.user} ({selectedLog.role})</dd></div>
            <div><dt><SlidersHorizontal size={14} /> Action</dt><dd>{selectedLog.action}</dd></div>
            <div><dt><Database size={14} /> Module</dt><dd>{selectedLog.module}</dd></div>
            <div><dt><FileText size={14} /> Record</dt><dd>{selectedLog.details}</dd></div>
            <div><dt><LockKeyhole size={14} /> IP Address</dt><dd>{selectedLog.ipAddress}</dd></div>
            <div><dt><ShieldCheck size={14} /> Device / Browser</dt><dd>Current workspace</dd></div>
            <div><dt><CheckCircle2 size={14} /> Status</dt><dd><AuditPill value={selectedLog.status} /></dd></div>
          </dl>
          <div className="detail-note">
            <small>Details</small>
            <p>{selectedLog.details}</p>
          </div>
          <div className="changes">
            <small>Changes</small>
            <div>
              <span>Module<strong>{selectedLog.module}</strong></span>
              <span>Action<strong>{selectedLog.action}</strong></span>
              <span>Status<strong>{selectedLog.status}</strong></span>
            </div>
          </div>
          <Link href="/hr/employees" className="related-link">
            <User size={15} />
            Related Record
            <strong>View Employee <ExternalLink size={14} /></strong>
          </Link>
        </section> : <section className="audit-card audit-details audit-details-empty" aria-label="Audit log details"><div className="detail-note"><small>Log Details</small><p>No audit event selected.</p></div></section>}
      </section>
    </div>
  )
}

const auditCss = `
.audit-page {
  min-height: calc(100dvh - 76px);
  background: #101010;
  color: #fafafa;
  padding: 24px 28px 32px;
}
.audit-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 18px;
  margin-bottom: 22px;
}
.audit-header h1 {
  margin: 0;
  font-size: 28px;
  line-height: 1.1;
  font-weight: 950;
  letter-spacing: 0;
}
.audit-header p {
  margin: 7px 0 0;
  color: #000000;
  font-size: 14px;
}
.audit-actions,
.audit-actions button,
.audit-filter-toolbar,
.audit-filter-toolbar button,
.audit-filter-panel,
.audit-filter-panel button,
.audit-search,
.audit-pagination,
.audit-pagination div {
  display: flex;
  align-items: center;
}
.audit-actions {
  gap: 10px;
  flex-wrap: wrap;
  justify-content: flex-end;
}
.audit-actions button,
.audit-filter-toolbar button,
.audit-filter-panel button,
.audit-filter-panel select,
.audit-pagination button,
.audit-pagination select {
  min-height: 38px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  background: #fff;
  color: #0f172a;
  padding: 0 13px;
  gap: 8px;
  font-size: 12.5px;
  font-weight: 850;
  cursor: pointer;
}
.audit-actions button.is-active {
  border-color: #bbf7d0;
  background: #ecfdf3;
  color: #047857;
}
.audit-filter-toolbar {
  justify-content: flex-end;
  padding: 12px 0;
}
.audit-filter-toolbar button.is-active {
  border-color: #bbf7d0;
  background: #ecfdf3;
  color: #047857;
}
.audit-card {
  background: #fff;
  border: 1px solid #e8edf4;
  border-radius: 8px;
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.03);
}
.audit-metrics {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 16px;
  margin-bottom: 20px;
}
.audit-metric {
  min-height: 128px;
  display: flex;
  align-items: center;
  gap: 18px;
  padding: 22px;
}
.audit-metric > span {
  width: 52px;
  height: 52px;
  border-radius: 10px;
  display: grid;
  place-items: center;
  flex-shrink: 0;
}
.audit-metric small,
.event-id small,
.detail-note small,
.changes small {
  display: block;
  color: #000000;
  font-size: 12px;
  font-weight: 850;
}
.audit-metric strong {
  display: block;
  margin-top: 8px;
  font-size: 24px;
  line-height: 1;
  font-weight: 950;
}
.audit-metric em {
  display: block;
  margin-top: 12px;
  font-size: 12px;
  font-style: normal;
  font-weight: 800;
}
.audit-metric em.up {
  color: #16a34a;
}
.audit-metric em.down {
  color: #ef4444;
}
.audit-tabs {
  display: flex;
  gap: 34px;
  overflow-x: auto;
  border-bottom: 1px solid #e8edf4;
  margin-bottom: 0;
  scrollbar-width: none;
}
.audit-tabs button {
  position: relative;
  min-height: 44px;
  border: 0;
  background: transparent;
  color: #334155;
  padding: 0;
  font-size: 13px;
  font-weight: 850;
  white-space: nowrap;
  cursor: pointer;
}
.audit-tabs button.is-active {
  color: #047857;
}
.audit-tabs button.is-active::after {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  bottom: -1px;
  height: 3px;
  border-radius: 999px;
  background: #059669;
}
.audit-filter-panel {
  gap: 12px;
  padding: 18px;
  margin-bottom: 18px;
  border: 1px solid #e8edf4;
  background: #fff;
  border-radius: 8px;
}
.audit-search {
  min-height: 40px;
  min-width: 290px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 0 12px;
  gap: 10px;
  background: #fff;
}
.audit-select {
  display: grid;
  gap: 6px;
  color: #334155;
  font-size: 11.5px;
  font-weight: 900;
}
.audit-select select {
  width: 100%;
  min-width: 145px;
  appearance: auto;
}
.audit-search input {
  min-width: 0;
  flex: 1;
  border: 0;
  outline: 0;
  background: transparent;
  color: #0f172a;
  font-size: 13px;
}
.audit-filter-panel button {
  min-width: 145px;
  justify-content: space-between;
}
.audit-filter-panel .more {
  min-width: 150px;
  justify-content: center;
}
.audit-filter-panel .clear {
  margin-left: auto;
  min-width: max-content;
  border-color: transparent;
  color: #334155;
}
.audit-content {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 360px;
  gap: 18px;
}
.audit-notice {
  margin: -6px 0 16px;
  border: 1px solid #bbf7d0;
  border-radius: 8px;
  background: #f0fdf4;
  color: #15803d;
  padding: 10px 12px;
  font-size: 12.5px;
  font-weight: 900;
}
.audit-table-card {
  min-width: 0;
  overflow: hidden;
}
.audit-table-wrap {
  overflow-x: auto;
}
.audit-table {
  width: 100%;
  min-width: 940px;
  border-collapse: collapse;
}
.audit-table th,
.audit-table td {
  padding: 16px 14px;
  border-bottom: 1px solid #eef2f7;
  text-align: left;
  vertical-align: middle;
  font-size: 13px;
}
.audit-table th {
  color: #000000;
  background: #fbfdff;
  font-size: 12px;
  font-weight: 900;
}
.audit-table td {
  color: #0f172a;
  font-weight: 650;
}
.audit-table tr.is-selected td {
  background: #f8fafc;
}
.audit-table td:nth-child(5) {
  max-width: 245px;
  line-height: 1.45;
}
.audit-user {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 150px;
}
.avatar {
  width: 28px;
  height: 28px;
  border-radius: 999px;
  color: #fff;
  display: grid;
  place-items: center;
  flex-shrink: 0;
  font-size: 11px;
  font-weight: 950;
}
.audit-user strong {
  display: block;
  font-size: 13px;
  line-height: 1.15;
}
.audit-user small {
  display: block;
  margin-top: 3px;
  color: #000000;
  font-size: 12px;
  font-weight: 700;
}
.audit-pill {
  display: inline-flex;
  min-height: 23px;
  align-items: center;
  border-radius: 6px;
  padding: 0 8px;
  font-size: 11px;
  font-weight: 900;
  white-space: nowrap;
}
.audit-pill.updated,
.audit-pill.login {
  background: #eff6ff;
  color: #2563eb;
}
.audit-pill.created,
.audit-pill.success {
  background: #eafaf1;
  color: #059669;
}
.audit-pill.deleted,
.audit-pill.access-denied,
.audit-pill.login-failed,
.audit-pill.failed {
  background: #fff1f2;
  color: #dc2626;
}
.audit-pill.exported {
  background: #f5f3ff;
  color: #7c3aed;
}
.audit-row-actions {
  position: relative;
  display: inline-grid;
  place-items: center;
}
.audit-row-actions > button {
  width: 34px;
  height: 34px;
  border: 1px solid #e8edf4;
  border-radius: 8px;
  background: #fff;
  color: #0f172a;
  display: grid;
  place-items: center;
  cursor: pointer;
}
.audit-row-menu {
  position: fixed;
  z-index: 1400;
  width: 172px;
  border: 1px solid #e8edf4;
  border-radius: 8px;
  background: #fff;
  box-shadow: 0 18px 44px rgba(15, 23, 42, 0.16);
  padding: 6px;
  display: grid;
  gap: 2px;
}
.audit-row-menu button {
  min-height: 34px;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: #0f172a;
  padding: 0 10px;
  text-align: left;
  font-size: 12.5px;
  font-weight: 850;
  cursor: pointer;
}
.audit-row-menu button:hover {
  background: #f1f5f9;
}
.audit-pagination {
  min-height: 66px;
  justify-content: space-between;
  gap: 14px;
  padding: 0 16px;
}
.audit-pagination span {
  color: #0f172a;
  font-size: 13px;
  font-weight: 800;
}
.audit-pagination div {
  gap: 8px;
}
.audit-pagination button {
  min-width: 38px;
  padding: 0 10px;
  justify-content: center;
}
.audit-pagination button:disabled {
  opacity: .45;
  cursor: not-allowed;
}
.audit-pagination select {
  min-width: 104px;
}
.audit-pagination button.is-active {
  background: #059669;
  border-color: #059669;
  color: #fff;
}
.audit-details {
  background: #fff !important;
  color: #0f172a !important;
  border-color: #e8edf4 !important;
  padding: 20px;
  align-self: start;
}
.audit-details-empty {
  min-height: 118px;
}
.audit-details-empty .detail-note {
  border-top: 0;
  margin-bottom: 0;
  padding-top: 0;
}
.audit-details-empty small {
  display: block;
  color: #000000;
  font-size: 12px;
  font-weight: 900;
}
.audit-details-empty p {
  color: #000000;
}
.details-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 20px;
}
.details-title h2 {
  margin: 0;
  font-size: 16px;
  font-weight: 950;
}
.details-title button {
  width: 32px;
  height: 32px;
  border: 0;
  background: transparent;
  color: #000000;
  display: grid;
  place-items: center;
  cursor: pointer;
}
.event-id {
  border-bottom: 1px solid #eef2f7;
  padding-bottom: 18px;
  margin-bottom: 18px;
}
.event-id strong {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 8px;
  font-size: 13px;
  font-weight: 950;
  overflow-wrap: anywhere;
}
.detail-list {
  display: grid;
  gap: 13px;
  margin: 0 0 18px;
}
.detail-list div {
  display: grid;
  grid-template-columns: 120px minmax(0, 1fr);
  gap: 10px;
  align-items: start;
}
.detail-list dt {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #000000;
  font-size: 12px;
  font-weight: 850;
}
.detail-list dd {
  margin: 0;
  color: #0f172a;
  font-size: 12.5px;
  font-weight: 750;
  line-height: 1.45;
}
.detail-note {
  border-top: 1px solid #eef2f7;
  padding-top: 16px;
  margin-bottom: 16px;
}
.detail-note p {
  margin: 8px 0 0;
  font-size: 13px;
  line-height: 1.45;
  color: #0f172a;
  font-weight: 750;
}
.changes {
  border-top: 1px solid #eef2f7;
  padding-top: 16px;
  margin-bottom: 18px;
}
.changes > div {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
  margin-top: 10px;
  padding: 14px;
  border-radius: 8px;
  background: #f8fafc;
}
.changes span {
  color: #000000;
  font-size: 12px;
  font-weight: 800;
}
.changes strong {
  display: block;
  margin-top: 8px;
  color: #0f172a;
  font-weight: 950;
}
.related-link {
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 48px;
  border-top: 1px solid #eef2f7;
  padding-top: 14px;
  color: #000000;
  text-decoration: none;
  font-size: 13px;
  font-weight: 850;
}
.related-link strong {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 6px;
  color: #2563eb;
  white-space: nowrap;
}
.accounting-theme-dark .audit-page,
html[data-theme='dark'] .audit-page {
  background: #101010 !important;
  background-color: #101010 !important;
  color: #fafafa !important;
}
.accounting-theme-dark .audit-page :is(.audit-card, .audit-filter-panel, .audit-search, .audit-table-wrap, .audit-row-menu, .audit-details, .changes > div),
html[data-theme='dark'] .audit-page :is(.audit-card, .audit-filter-panel, .audit-search, .audit-table-wrap, .audit-row-menu, .audit-details, .changes > div) {
  background: #101010 !important;
  background-color: #101010 !important;
  border-color: #333333 !important;
  color: #fafafa !important;
  box-shadow: none !important;
}
.accounting-theme-dark .audit-page :is(.audit-header h1, .audit-metric strong, .audit-tabs button, .audit-table td, .audit-user strong, .audit-pagination span, .details-title h2, .event-id strong, .detail-list dd, .detail-note p, .changes strong),
html[data-theme='dark'] .audit-page :is(.audit-header h1, .audit-metric strong, .audit-tabs button, .audit-table td, .audit-user strong, .audit-pagination span, .details-title h2, .event-id strong, .detail-list dd, .detail-note p, .changes strong) {
  color: #fafafa !important;
}
.accounting-theme-dark .audit-page :is(.audit-header p, .audit-metric small, .event-id small, .detail-note small, .changes small, .audit-user small, .audit-select, .audit-details-empty small, .audit-details-empty p, .detail-list dt, .changes span, .related-link),
html[data-theme='dark'] .audit-page :is(.audit-header p, .audit-metric small, .event-id small, .detail-note small, .changes small, .audit-user small, .audit-select, .audit-details-empty small, .audit-details-empty p, .detail-list dt, .changes span, .related-link) {
  color: #c7c7cf !important;
}
.accounting-theme-dark .audit-page :is(.audit-actions button, .audit-filter-toolbar button, .audit-filter-panel button, .audit-filter-panel select, .audit-pagination button, .audit-pagination select, .audit-row-actions > button, .audit-row-menu button),
html[data-theme='dark'] .audit-page :is(.audit-actions button, .audit-filter-toolbar button, .audit-filter-panel button, .audit-filter-panel select, .audit-pagination button, .audit-pagination select, .audit-row-actions > button, .audit-row-menu button) {
  background: #161616 !important;
  background-color: #161616 !important;
  border-color: #333333 !important;
  color: #fafafa !important;
}
.accounting-theme-dark .audit-page .audit-search input,
html[data-theme='dark'] .audit-page .audit-search input {
  color: #fafafa !important;
}
.accounting-theme-dark .audit-page .audit-search input::placeholder,
html[data-theme='dark'] .audit-page .audit-search input::placeholder {
  color: #8f8f98 !important;
}
.accounting-theme-dark .audit-page .audit-table th,
html[data-theme='dark'] .audit-page .audit-table th {
  background: #181818 !important;
  background-color: #181818 !important;
  color: #c7c7cf !important;
  border-color: #333333 !important;
}
.accounting-theme-dark .audit-page :is(.audit-table td, .audit-table th, .audit-table tr, .audit-tabs, .event-id, .detail-note, .changes, .related-link),
html[data-theme='dark'] .audit-page :is(.audit-table td, .audit-table th, .audit-table tr, .audit-tabs, .event-id, .detail-note, .changes, .related-link) {
  border-color: #333333 !important;
}
.accounting-theme-dark .audit-page .audit-table tr.is-selected td,
html[data-theme='dark'] .audit-page .audit-table tr.is-selected td {
  background: #181818 !important;
  background-color: #181818 !important;
}
.accounting-theme-dark .audit-page :is(.audit-actions button.is-active, .audit-filter-toolbar button.is-active),
html[data-theme='dark'] .audit-page :is(.audit-actions button.is-active, .audit-filter-toolbar button.is-active) {
  background: #143524 !important;
  border-color: #2f7a4b !important;
  color: #b8f7cf !important;
}
.accounting-theme-dark .audit-page .audit-pagination button.is-active,
html[data-theme='dark'] .audit-page .audit-pagination button.is-active {
  background: #059669 !important;
  border-color: #059669 !important;
  color: #ffffff !important;
}
.accounting-theme-dark .audit-page .audit-row-menu button:hover,
html[data-theme='dark'] .audit-page .audit-row-menu button:hover {
  background: #222222 !important;
}
@media (max-width: 1280px) {
  .audit-metrics {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
  .audit-content {
    grid-template-columns: minmax(0, 1fr);
  }
  .audit-details {
    order: -1;
  }
}
@media (max-width: 980px) {
  .audit-page {
    padding: 20px 18px 28px;
  }
  .audit-header {
    flex-direction: column;
  }
  .audit-actions {
    width: 100%;
    justify-content: flex-start;
  }
  .audit-metrics {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .audit-filter-panel {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .audit-search {
    grid-column: 1 / -1;
    min-width: 0;
  }
  .audit-filter-panel button,
  .audit-filter-panel .more,
  .audit-filter-panel .clear {
    min-width: 0;
    width: 100%;
    margin-left: 0;
  }
}
@media (max-width: 720px) {
  .audit-page {
    padding: 16px 12px 24px;
  }
  .audit-header h1 {
    font-size: 24px;
  }
  .audit-actions {
    display: grid;
    grid-template-columns: 1fr;
  }
  .audit-actions button {
    width: 100%;
    justify-content: center;
  }
  .audit-metrics {
    grid-template-columns: 1fr;
    gap: 12px;
  }
  .audit-metric {
    min-height: auto;
    padding: 16px;
  }
  .audit-tabs {
    gap: 22px;
  }
  .audit-filter-panel {
    grid-template-columns: 1fr;
    padding: 14px;
  }
  .audit-table {
    min-width: 0;
  }
  .audit-table thead {
    display: none;
  }
  .audit-table,
  .audit-table tbody,
  .audit-table tr,
  .audit-table td {
    display: block;
    width: 100%;
  }
  .audit-table tr {
    padding: 14px;
    border-bottom: 1px solid #eef2f7;
  }
  .audit-table td {
    display: grid;
    grid-template-columns: 112px minmax(0, 1fr);
    gap: 12px;
    border-bottom: 0;
    padding: 8px 0;
    font-size: 12.5px;
  }
  .audit-table td::before {
    content: attr(data-label);
    color: #000000;
    font-size: 11px;
    font-weight: 900;
  }
  .audit-table td:nth-child(5) {
    max-width: none;
  }
  .audit-pagination {
    flex-direction: column;
    align-items: stretch;
    padding: 16px;
  }
  .audit-pagination div {
    justify-content: center;
    flex-wrap: wrap;
  }
  .audit-pagination > button {
    width: 100%;
  }
  .detail-list div {
    grid-template-columns: 1fr;
    gap: 5px;
  }
  .changes > div {
    grid-template-columns: 1fr;
  }
  .related-link {
    align-items: flex-start;
    flex-wrap: wrap;
  }
  .related-link strong {
    width: 100%;
    margin-left: 0;
  }
}
`
