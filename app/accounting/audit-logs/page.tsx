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
import { emptyAccountingData, formatDate, loadAccountingData, subscribeAccountingData } from '@/lib/accounting/data'

const font = 'var(--font-body)'

type AuditStatus = string
type AuditAction = string

type Metric = {
  title: string
  value: string
  detail: string
  trend: 'up' | 'down'
  icon: LucideIcon
  tone: string
}

const filters = ['All Modules', 'All Actions', 'All Users', 'All Status']
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

  useEffect(() => {
    const load = () => setData(loadAccountingData())
    load()
    return subscribeAccountingData(load)
  }, [])

  const auditEvents = data.auditEvents.map(event => ({ ...event, dateTime: formatDate(event.dateTime) }))
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
  const selectedLog = auditEvents[0]
  const metrics: Metric[] = [
    { title: 'Total Events', value: formatNumber(auditSummary.totalEvents), detail: 'Recorded system events', trend: 'up', icon: FileText, tone: '#2563eb' },
    { title: 'Unique Users', value: formatNumber(auditSummary.uniqueUsers), detail: 'Actors in audit history', trend: 'up', icon: User, tone: '#16a34a' },
    { title: 'Security Events', value: formatNumber(auditSummary.securityEvents), detail: 'Access and security records', trend: 'up', icon: ShieldCheck, tone: '#7c3aed' },
    { title: 'Failed Attempts', value: formatNumber(auditSummary.failedAttempts), detail: 'Failed or denied actions', trend: 'down', icon: AlertTriangle, tone: '#f97316' },
    { title: 'Data Changes', value: formatNumber(auditSummary.dataChanges), detail: 'Create, update, and delete actions', trend: 'up', icon: CheckCircle2, tone: '#0f766e' },
  ]

  return (
    <div className="audit-page" style={{ fontFamily: font }}>
      <style>{auditCss}</style>

      <div className="audit-header">
        <div>
          <h1>Audit Logs</h1>
          <p>Track system activities and changes across the platform for security and compliance.</p>
        </div>
        <div className="audit-actions">
          <button type="button"><CalendarDays size={15} /> Current records</button>
          <button type="button"><Filter size={15} /> Filters</button>
          <button type="button">Export <Download size={14} /></button>
        </div>
      </div>

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

      <nav className="audit-tabs" aria-label="Audit log categories">
        {tabs.map((tab, index) => <button key={tab} className={index === 0 ? 'is-active' : undefined}>{tab}</button>)}
      </nav>

      <section className="audit-filter-panel">
        <label className="audit-search">
          <Search size={16} color="#64748b" />
          <input placeholder="Search by user, action, module, IP..." />
        </label>
        {filters.map(filter => (
          <button key={filter} type="button">{filter}<ChevronRight size={14} /></button>
        ))}
        <button type="button" className="more"><SlidersHorizontal size={15} /> More Filters</button>
        <button type="button" className="clear"><RotateCcw size={15} /> Clear Filters</button>
      </section>

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
                {auditEvents.map(event => (
                  <tr key={event.id}>
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
                    <td data-label="Actions"><button type="button" aria-label={`More actions for ${event.id}`}><MoreHorizontal size={16} /></button></td>
                  </tr>
                ))}
                {!auditEvents.length && (
                  <tr>
                    <td colSpan={8} style={{ padding: 28, textAlign: 'center', color: '#64748b', fontWeight: 800 }}>
                      No audit events yet. Finance, payroll, loan, allowance, and employee changes will appear here.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="audit-pagination">
            <span>Showing {auditEvents.length ? 1 : 0} to {auditEvents.length} of {formatNumber(auditSummary.totalEvents)} events</span>
            <div>
              <button type="button" aria-label="Previous page"><ChevronLeft size={15} /></button>
              {[1, 2, 3].map(page => <button key={page} type="button" className={page === 1 ? 'is-active' : undefined}>{page}</button>)}
              <span>...</span>
              <button type="button">876</button>
              <button type="button" aria-label="Next page"><ChevronRight size={15} /></button>
            </div>
            <button type="button">10 / page</button>
          </div>
        </div>

        {selectedLog ? <aside className="audit-card audit-details">
          <div className="details-title">
            <h2>Log Details</h2>
            <button type="button" aria-label="Close details"><X size={16} /></button>
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
        </aside> : <aside className="audit-card audit-details"><div className="detail-note"><small>Log Details</small><p>No audit event selected.</p></div></aside>}
      </section>
    </div>
  )
}

const auditCss = `
.audit-page {
  min-height: 100vh;
  background: #f8fafc;
  color: #0f172a;
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
  color: #475569;
  font-size: 14px;
}
.audit-actions,
.audit-actions button,
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
.audit-filter-panel button,
.audit-pagination button {
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
  color: #475569;
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
  border-top: 0;
  background: #fff;
  border-radius: 0 0 8px 8px;
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
  color: #475569;
  background: #fbfdff;
  font-size: 12px;
  font-weight: 900;
}
.audit-table td {
  color: #0f172a;
  font-weight: 650;
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
  color: #64748b;
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
.audit-table td button {
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
.audit-pagination button.is-active {
  background: #059669;
  border-color: #059669;
  color: #fff;
}
.audit-details {
  padding: 20px;
  align-self: start;
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
  color: #475569;
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
  color: #475569;
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
  color: #475569;
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
  color: #475569;
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
    color: #64748b;
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
