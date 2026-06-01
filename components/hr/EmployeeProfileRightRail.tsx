'use client'

import { useEffect, useMemo, useState } from 'react'
import { Activity, CalendarCheck, FileText, RefreshCw, Send, UserMinus, UserPlus, Wallet } from 'lucide-react'

/**
 * Right-rail shared by the employee detail page and the add-employee form.
 *
 * Two stacks:
 *   - "Now online" — first few teammates with a green dot. Currently this is
 *     a presence stub (everyone Active is treated as online) because the app
 *     has no real-time presence channel. Easy to swap later.
 *   - "Live feed" — most recent company-wide HR events derived from local
 *     state: new hires, exits, payslips issued, document uploads, leave
 *     requests. Always sorted newest first, capped at 8.
 *
 * The component reads directly from localStorage and reuses the same keys
 * the rest of the HR module writes through, so it picks up new activity
 * the next time it remounts (or when wiseflow:hr-data-changed fires).
 */

const employeesKey = 'flowsys-hr-employees'
const exEmployeesKey = 'flowsys-hr-deleted-employees'
const documentsKey = 'flowsys-hr-documents'
const leaveRequestsKey = 'flowsys-hr-leave-requests'
const payrollRecordsKey = 'flowsys-hr-payroll-records'

type AnyRecord = { [key: string]: unknown }

type FeedItem = {
  id: string
  icon: typeof Activity
  tone: 'green' | 'blue' | 'amber' | 'rose' | 'violet'
  title: string
  subtitle: string
  timestamp: number
}

type OnlineMember = {
  id: string
  name: string
  role: string
  photo?: string
}

function readJSON<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback
  try {
    const raw = window.localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

function nameOf(record: AnyRecord): string {
  const first = String(record.firstName || '').trim()
  const middle = String(record.middleName || '').trim()
  const last = String(record.lastName || '').trim()
  return [first, middle, last].filter(Boolean).join(' ') || String(record.name || record.email || 'Someone')
}

function safeTime(value: unknown): number {
  if (!value || typeof value !== 'string') return 0
  const parsed = new Date(value).getTime()
  return Number.isFinite(parsed) ? parsed : 0
}

function initialsOf(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .map(part => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || 'HR'
}

function relativeTime(ms: number): string {
  if (!ms) return ''
  const delta = Date.now() - ms
  if (delta < 60_000) return 'Just now'
  if (delta < 3_600_000) return `${Math.floor(delta / 60_000)}m ago`
  if (delta < 86_400_000) return `${Math.floor(delta / 3_600_000)}h ago`
  if (delta < 7 * 86_400_000) return `${Math.floor(delta / 86_400_000)}d ago`
  return new Date(ms).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

const TONE: Record<FeedItem['tone'], { bg: string; color: string }> = {
  green:  { bg: '#dcfce7', color: '#15803d' },
  blue:   { bg: '#dbeafe', color: '#1d4ed8' },
  amber:  { bg: '#fef3c7', color: '#92400e' },
  rose:   { bg: '#ffe4e6', color: '#9f1239' },
  violet: { bg: '#ede9fe', color: '#6d28d9' },
}

export default function EmployeeProfileRightRail({
  currentEmployeeId,
  teamHint,
}: {
  currentEmployeeId?: string
  /** When provided, the "Now online" list is filtered to people on this team. */
  teamHint?: string
}) {
  const [version, setVersion] = useState(0)

  useEffect(() => {
    const refresh = () => setVersion(v => v + 1)
    window.addEventListener('storage', refresh)
    window.addEventListener('wiseflow:hr-data-changed', refresh as EventListener)
    return () => {
      window.removeEventListener('storage', refresh)
      window.removeEventListener('wiseflow:hr-data-changed', refresh as EventListener)
    }
  }, [])

  const { online, feed } = useMemo(() => {
    const employees = readJSON<AnyRecord[]>(employeesKey, [])
    const exEmployees = readJSON<AnyRecord[]>(exEmployeesKey, [])
    const documents = readJSON<AnyRecord[]>(documentsKey, [])
    const leaveRequests = readJSON<AnyRecord[]>(leaveRequestsKey, [])
    const payslips = readJSON<AnyRecord[]>(payrollRecordsKey, [])

    const candidates = employees
      .filter(emp => String(emp.id || '') !== currentEmployeeId)
      .filter(emp => !teamHint || String(emp.team || '').toLowerCase() === teamHint.toLowerCase() || String(emp.department || '').toLowerCase() === teamHint.toLowerCase())
      .filter(emp => {
        const status = String(emp.employmentStatus || '').toLowerCase()
        return status === '' || status === 'active'
      })

    const onlineList: OnlineMember[] = candidates.slice(0, 4).map(emp => ({
      id: String(emp.id || ''),
      name: nameOf(emp),
      role: String(emp.jobTitle || emp.department || 'Team member'),
      photo: typeof emp.photo === 'string' ? emp.photo : undefined,
    }))

    const items: FeedItem[] = []

    employees.forEach(emp => {
      const created = safeTime(emp.createdAt)
      if (!created) return
      items.push({
        id: `hired-${emp.id}`,
        icon: UserPlus,
        tone: 'green',
        title: `${nameOf(emp)} joined`,
        subtitle: String(emp.jobTitle || emp.department || 'New team member'),
        timestamp: created,
      })
    })

    exEmployees.forEach(emp => {
      const left = safeTime(emp.deletedAt) || safeTime(emp.updatedAt)
      if (!left) return
      const reason = String(emp.exitReason || 'Left the company')
      items.push({
        id: `exit-${emp.id}`,
        icon: UserMinus,
        tone: 'rose',
        title: `${nameOf(emp)} marked ex-employee`,
        subtitle: reason,
        timestamp: left,
      })
    })

    payslips.forEach(slip => {
      const stamp = safeTime(slip.paidAt) || safeTime(slip.createdAt)
      if (!stamp) return
      const empId = String(slip.employeeId || '')
      const emp = employees.find(item => String(item.id || '') === empId)
      const who = emp ? nameOf(emp) : 'Payroll'
      items.push({
        id: `pay-${slip.id || stamp}`,
        icon: Wallet,
        tone: 'blue',
        title: `Payslip issued to ${who}`,
        subtitle: String(slip.period || 'This cycle'),
        timestamp: stamp,
      })
    })

    leaveRequests.forEach(leave => {
      const stamp = safeTime(leave.createdAt)
      if (!stamp) return
      const empId = String(leave.employeeId || '')
      const emp = employees.find(item => String(item.id || '') === empId)
      const who = emp ? nameOf(emp) : 'Someone'
      items.push({
        id: `leave-${leave.id || stamp}`,
        icon: CalendarCheck,
        tone: 'amber',
        title: `${who} requested ${String(leave.leaveType || 'leave')}`,
        subtitle: `${String(leave.days || 0)} day${Number(leave.days) === 1 ? '' : 's'} • ${String(leave.status || 'Pending')}`,
        timestamp: stamp,
      })
    })

    documents.forEach(doc => {
      const stamp = safeTime(doc.uploadedAt) || safeTime(doc.createdAt)
      if (!stamp) return
      const empId = String(doc.employeeId || '')
      const emp = employees.find(item => String(item.id || '') === empId)
      const who = emp ? nameOf(emp) : 'HR'
      items.push({
        id: `doc-${doc.id || stamp}`,
        icon: FileText,
        tone: 'violet',
        title: `Document uploaded for ${who}`,
        subtitle: String(doc.name || 'New file'),
        timestamp: stamp,
      })
    })

    items.sort((a, b) => b.timestamp - a.timestamp)
    return { online: onlineList, feed: items.slice(0, 8) }
    // version is intentionally referenced to force re-derive on data change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentEmployeeId, teamHint, version])

  return (
    <aside style={shellStyle}>
      <section style={sectionStyle}>
        <div style={sectionHeaderStyle}>
          <div>
            <h3 style={sectionTitleStyle}>Now online <span style={{ color: '#94a3b8', fontWeight: 600 }}>({online.length})</span></h3>
            <p style={sectionSubtitleStyle}>{teamHint ? `Active in ${teamHint}` : 'Active in your workspace'}</p>
          </div>
        </div>
        {online.length === 0 ? (
          <div style={emptyStyle}>No teammates online right now.</div>
        ) : (
          <ul style={onlineListStyle}>
            {online.map(member => (
              <li key={member.id} style={onlineRowStyle}>
                <span style={avatarStyle(member.photo)}>{!member.photo && initialsOf(member.name)}</span>
                <div style={{ minWidth: 0 }}>
                  <strong style={onlineNameStyle}>{member.name}</strong>
                  <small style={onlineRoleStyle}>{member.role}</small>
                </div>
                <span style={onlineDotStyle} aria-hidden />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section style={sectionStyle}>
        <div style={sectionHeaderStyle}>
          <div>
            <h3 style={sectionTitleStyle}>Live Feed</h3>
            <p style={sectionSubtitleStyle}>Latest HR activity in your workspace.</p>
          </div>
          <button
            type="button"
            onClick={() => setVersion(v => v + 1)}
            style={refreshButtonStyle}
            aria-label="Refresh live feed"
          >
            <RefreshCw size={13} />
          </button>
        </div>
        {feed.length === 0 ? (
          <div style={emptyStyle}>
            <Send size={20} color="#cbd5e1" style={{ marginBottom: 8 }} />
            <div>Activity will appear here as your team uses HR.</div>
          </div>
        ) : (
          <ul style={feedListStyle}>
            {feed.map(item => {
              const Icon = item.icon
              const tone = TONE[item.tone]
              return (
                <li key={item.id} style={feedRowStyle}>
                  <span style={{ ...feedIconStyle, background: tone.bg, color: tone.color }}>
                    <Icon size={13} />
                  </span>
                  <div style={{ minWidth: 0 }}>
                    <strong style={feedTitleStyle}>{item.title}</strong>
                    <small style={feedSubtitleStyle}>{item.subtitle}</small>
                  </div>
                  <time style={feedTimeStyle}>{relativeTime(item.timestamp)}</time>
                </li>
              )
            })}
          </ul>
        )}
      </section>
    </aside>
  )
}

// ─── styles ─────────────────────────────────────────────────────────────

const shellStyle = {
  display: 'grid',
  gap: 14,
  position: 'sticky' as const,
  top: 16,
  alignSelf: 'start' as const,
}

const sectionStyle = {
  background: '#fff',
  border: '1px solid #eef2f7',
  borderRadius: 14,
  padding: 16,
  boxShadow: '0 1px 3px rgba(15, 23, 42, 0.04)',
}

const sectionHeaderStyle = {
  display: 'flex',
  alignItems: 'flex-start',
  justifyContent: 'space-between',
  gap: 10,
  marginBottom: 12,
}

const sectionTitleStyle = { margin: 0, fontSize: 13, fontWeight: 800, color: '#0f172a' }
const sectionSubtitleStyle = { margin: '3px 0 0', fontSize: 11, fontWeight: 500, color: '#64748b' }

const refreshButtonStyle = {
  width: 28,
  height: 28,
  border: '1px solid #e2e8f0',
  background: '#fff',
  borderRadius: 8,
  color: '#475569',
  display: 'grid',
  placeItems: 'center' as const,
  cursor: 'pointer',
}

const emptyStyle = {
  padding: '14px 4px',
  textAlign: 'center' as const,
  color: '#94a3b8',
  fontSize: 12,
  fontWeight: 500,
}

const onlineListStyle = { listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: 8 }

const onlineRowStyle = {
  display: 'grid',
  gridTemplateColumns: '32px minmax(0, 1fr) 12px',
  alignItems: 'center' as const,
  gap: 10,
}

const avatarStyle = (photo?: string) => ({
  width: 32,
  height: 32,
  borderRadius: '50%',
  display: 'grid',
  placeItems: 'center' as const,
  background: photo ? `url(${photo}) center/cover` : '#dcfce7',
  color: '#15803d',
  fontSize: 11,
  fontWeight: 800,
  overflow: 'hidden' as const,
})

const onlineNameStyle = { display: 'block', color: '#0f172a', fontSize: 12, fontWeight: 700, overflow: 'hidden' as const, textOverflow: 'ellipsis' as const, whiteSpace: 'nowrap' as const }
const onlineRoleStyle = { display: 'block', marginTop: 1, color: '#64748b', fontSize: 11, fontWeight: 500, overflow: 'hidden' as const, textOverflow: 'ellipsis' as const, whiteSpace: 'nowrap' as const }
const onlineDotStyle = { width: 9, height: 9, borderRadius: '50%', background: '#22c55e', border: '2px solid #fff', boxShadow: '0 0 0 1px #bbf7d0' }

const feedListStyle = { listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: 4 }

const feedRowStyle = {
  display: 'grid',
  gridTemplateColumns: '28px minmax(0, 1fr) auto',
  alignItems: 'flex-start' as const,
  gap: 10,
  padding: '8px 6px',
  borderRadius: 8,
}

const feedIconStyle = {
  width: 26,
  height: 26,
  borderRadius: '50%',
  display: 'grid',
  placeItems: 'center' as const,
  marginTop: 1,
}

const feedTitleStyle = { display: 'block', color: '#0f172a', fontSize: 12, fontWeight: 700, overflow: 'hidden' as const, textOverflow: 'ellipsis' as const, whiteSpace: 'nowrap' as const }
const feedSubtitleStyle = { display: 'block', marginTop: 2, color: '#64748b', fontSize: 11, fontWeight: 500, overflow: 'hidden' as const, textOverflow: 'ellipsis' as const, whiteSpace: 'nowrap' as const }
const feedTimeStyle = { color: '#94a3b8', fontSize: 11, fontWeight: 500, whiteSpace: 'nowrap' as const }
