'use client'

import { useEffect, useMemo, useState } from 'react'
import type { CSSProperties, ReactNode } from 'react'
import Link from 'next/link'
import {
  ArrowRight,
  Building2,
  CalendarDays,
  CheckCircle2,
  Clock,
  FileText,
  FolderOpen,
  HelpCircle,
  KeyRound,
  Network,
  Plus,
  Search,
  Settings,
  ShieldCheck,
  Users,
} from 'lucide-react'

type ActivityItem = {
  id: string
  title?: string
  description?: string
  actor?: string
  createdAt?: string
  source?: string
}

type SettingsSnapshot = {
  departments: number
  locations: number
  employees: number
  policies: number
  workflows: number
  roles: number
  templates: number
  activities: ActivityItem[]
}

const font = "var(--font-body)"

function loadStored<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback
  try {
    const raw = window.localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

function countStored(key: string) {
  const value = loadStored<unknown>(key, [])
  return Array.isArray(value) ? value.length : 0
}

function countUniqueStored(key: string, field: string) {
  const value = loadStored<Record<string, unknown>[]>(key, [])
  if (!Array.isArray(value)) return 0
  return new Set(value.map(item => String(item[field] || '').trim()).filter(Boolean)).size
}

function formatDate(value?: string) {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function readSnapshot(): SettingsSnapshot {
  const activities = loadStored<ActivityItem[]>('flowsys-hr-settings-activity', [])
  return {
    departments: countStored('flowsys-hr-departments'),
    locations: countUniqueStored('flowsys-hr-employees', 'workLocation'),
    employees: countStored('flowsys-hr-employees'),
    policies: countStored('flowsys-hr-policies'),
    workflows: countStored('flowsys-hr-workflows'),
    roles: countStored('flowsys-hr-roles'),
    templates: countStored('flowsys-hr-document-templates'),
    activities: Array.isArray(activities) ? activities : [],
  }
}

export default function HrSettingsPage() {
  const [activeTab, setActiveTab] = useState('Overview')
  const [query, setQuery] = useState('')
  const [snapshot, setSnapshot] = useState<SettingsSnapshot>(() => ({
    departments: 0,
    locations: 0,
    employees: 0,
    policies: 0,
    workflows: 0,
    roles: 0,
    templates: 0,
    activities: [],
  }))

  useEffect(() => {
    const load = () => setSnapshot(readSnapshot())
    load()
    window.addEventListener('storage', load)
    return () => window.removeEventListener('storage', load)
  }, [])

  const tabs = ['Overview', 'Policies', 'Workflows', 'Organization', 'Roles & Permissions', 'Document Templates', 'Integrations', 'Holiday Calendar', 'General Settings']
  const configItems = useMemo(() => [
    { title: 'Organization', description: 'Manage organization structure, departments, locations, and business units.', icon: Building2, href: '/hr/teams' },
    { title: 'Employee Settings', description: 'Configure employee IDs, probation rules, exit settings, and employee defaults.', icon: Users, href: '/hr/employees' },
    { title: 'Attendance Settings', description: 'Set attendance rules, late arrival, early departure, overtime, and shift defaults.', icon: Clock, href: '/hr/attendance' },
    { title: 'Leave Settings', description: 'Configure leave types, balance rules, encashment, and carry-forward behavior.', icon: CalendarDays, href: '/hr/leave-requests' },
    { title: 'Payroll Settings', description: 'Manage payroll schedule, salary components, deductions, taxes, and payment methods.', icon: FileText, href: '/hr/payroll' },
    { title: 'Roles & Permissions', description: 'Manage roles, permissions, and access control for HR modules.', icon: ShieldCheck, href: '/hr/settings' },
    { title: 'Approval Settings', description: 'Set approval hierarchies and configure approval flows.', icon: CheckCircle2, href: '/hr/approvals' },
    { title: 'Performance Settings', description: 'Configure review cycles, goals, KPI templates, and rating scales.', icon: Network, href: '/hr/performance' },
    { title: 'Document Settings', description: 'Manage document categories, retention policies, and access settings.', icon: FolderOpen, href: '/hr/documents' },
    { title: 'Holiday Calendar', description: 'Manage company holidays, working days, and regional calendars.', icon: CalendarDays, href: '/hr/settings' },
  ].filter(item => {
    if (!query.trim()) return true
    return `${item.title} ${item.description}`.toLowerCase().includes(query.toLowerCase())
  }), [query])

  return (
    <section className="hr-module-page" style={{ fontFamily: font }}>
      <div style={pageHeaderStyle}>
        <div>
          <h1 style={pageTitleStyle}>HR Settings</h1>
          <p style={pageSubtitleStyle}>Manage and configure all HR preferences, policies, and processes.</p>
        </div>
        <label style={searchBoxStyle}>
          <Search size={15} color="#94a3b8" />
          <input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search settings..." style={plainInputStyle} />
        </label>
      </div>

      <div style={tabsStyle}>
        {tabs.map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)} style={tabStyle(activeTab === tab)}>{tab}</button>
        ))}
      </div>

      {activeTab === 'Overview' ? (
        <>
          <div style={topCardsStyle}>
            <FeatureCard icon={Building2} title="Organization Details" text="Update organization information, contacts, departments, and locations." href="/hr/teams" action="View Details" />
            <FeatureCard icon={FileText} title="HR Policies" text="Manage leave, attendance, payroll, and employee policy records." href="/hr/settings" action="View Policies" />
            <FeatureCard icon={Network} title="Workflows" text="Configure HR workflow and approval process records." href="/hr/settings" action="Manage Workflows" />
            <FeatureCard icon={KeyRound} title="Roles & Permissions" text="Manage HR access, roles, and permission settings." href="/hr/settings" action="Manage Access" />
            <FeatureCard icon={FolderOpen} title="Document Templates" text="Create and manage HR document template records." href="/hr/documents" action="View Templates" />
          </div>

          <div style={mainGridStyle}>
            <section style={panelStyle}>
              <div style={sectionHeaderStyle}>
                <h2 style={sectionTitleStyle}>HR Configuration</h2>
              </div>
              <div style={configGridStyle}>
                {configItems.map(item => (
                  <Link key={item.title} href={item.href} style={configItemStyle}>
                    <span style={configIconStyle}><item.icon size={20} /></span>
                    <span>
                      <strong>{item.title}</strong>
                      <small>{item.description}</small>
                    </span>
                    <ArrowRight size={16} color="#64748b" />
                  </Link>
                ))}
              </div>
              {!configItems.length && <EmptyState icon={Settings} title="No matching settings." text="Try another search term." />}
            </section>

            <aside style={sideStackStyle}>
              <Panel title="Quick Actions">
                <ActionButton label="Add Leave Type" />
                <ActionButton label="Create New Policy" />
                <ActionButton label="Add Holiday" />
                <ActionButton label="Create Workflow" />
                <ActionButton label="Upload Document Template" />
              </Panel>

              <Panel title="HR Settings Summary">
                <SummaryRow label="Departments" value={snapshot.departments} />
                <SummaryRow label="Locations" value={snapshot.locations} />
                <SummaryRow label="Total Employees" value={snapshot.employees} />
                <SummaryRow label="Active Policies" value={snapshot.policies} />
                <SummaryRow label="Workflow Templates" value={snapshot.workflows} />
                <SummaryRow label="User Roles" value={snapshot.roles} />
                <SummaryRow label="Document Templates" value={snapshot.templates} />
              </Panel>

              <Panel title="Need Help?">
                <EmptyState icon={HelpCircle} title="Help center not configured." text="HR settings help content can be connected later." compact />
              </Panel>
            </aside>
          </div>

          <section style={panelStyle}>
            <div style={sectionHeaderStyle}>
              <h2 style={sectionTitleStyle}>Recent Activity</h2>
            </div>
            {snapshot.activities.length ? (
              <div style={activityListStyle}>
                {snapshot.activities.map(activity => (
                  <article key={activity.id} style={activityItemStyle}>
                    <span style={activityIconStyle}><FileText size={16} /></span>
                    <span>
                      <strong>{activity.title || 'Settings activity'}</strong>
                      <small>{activity.description || '-'}</small>
                    </span>
                    <small>{formatDate(activity.createdAt)}{activity.actor ? ` by ${activity.actor}` : ''}</small>
                  </article>
                ))}
              </div>
            ) : (
              <EmptyState icon={FileText} title="No settings activity yet." text="Policy updates, workflow changes, and template changes will appear here once real records exist." />
            )}
          </section>
        </>
      ) : (
        <section style={panelStyle}>
          <div style={sectionHeaderStyle}>
            <h2 style={sectionTitleStyle}>{activeTab}</h2>
          </div>
          <EmptyState icon={Settings} title={`${activeTab} is ready.`} text="This tab will stay empty until real settings records are created or connected." />
        </section>
      )}
    </section>
  )
}

function FeatureCard({ icon: Icon, title, text, href, action }: { icon: typeof Settings; title: string; text: string; href: string; action: string }) {
  return (
    <Link href={href} style={featureCardStyle}>
      <span style={featureIconStyle}><Icon size={22} /></span>
      <span style={featureContentStyle}>
        <strong style={featureTitleStyle}>{title}</strong>
        <small style={featureTextStyle}>{text}</small>
        <b style={featureActionStyle}>{action} <ArrowRight size={13} /></b>
      </span>
    </Link>
  )
}

function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section style={sidePanelStyle}>
      <div style={sectionHeaderStyle}>
        <h2 style={sectionTitleStyle}>{title}</h2>
      </div>
      {children}
    </section>
  )
}

function ActionButton({ label }: { label: string }) {
  return (
    <button style={actionButtonStyle} disabled>
      <Plus size={14} />
      <span>{label}</span>
      <ArrowRight size={14} />
    </button>
  )
}

function SummaryRow({ label, value }: { label: string; value: number }) {
  return (
    <div style={summaryRowStyle}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  )
}

function EmptyState({ icon: Icon, title, text, compact = false }: { icon: typeof Settings; title: string; text: string; compact?: boolean }) {
  return (
    <div style={{ ...emptyStateStyle, minHeight: compact ? 120 : 220 }}>
      <Icon size={compact ? 24 : 34} color="#94a3b8" />
      <strong>{title}</strong>
      <span>{text}</span>
    </div>
  )
}

const pageHeaderStyle: CSSProperties = { display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'flex-start', flexWrap: 'wrap', marginBottom: 18 }
const pageTitleStyle: CSSProperties = { margin: 0, color: '#0f172a', fontSize: 28, fontWeight: 900 }
const pageSubtitleStyle: CSSProperties = { margin: '6px 0 0', color: '#475569', fontSize: 14 }
const searchBoxStyle: CSSProperties = { minHeight: 42, minWidth: 360, border: '1px solid #e5e7eb', borderRadius: 8, background: '#fff', padding: '0 12px', display: 'flex', alignItems: 'center', gap: 8, color: '#0f172a', fontSize: 13, fontFamily: font }
const plainInputStyle: CSSProperties = { border: 'none', outline: 'none', background: 'transparent', width: '100%', font: 'inherit' }
const tabsStyle: CSSProperties = { display: 'flex', gap: 26, borderBottom: '1px solid #e5e7eb', overflowX: 'auto', marginBottom: 16 }
const tabStyle = (active: boolean): CSSProperties => ({ border: 'none', background: 'transparent', padding: '13px 0', borderBottom: active ? '2px solid #22c55e' : '2px solid transparent', color: active ? '#16a34a' : '#334155', fontSize: 13, fontWeight: 800, cursor: 'pointer', fontFamily: font, whiteSpace: 'nowrap' })
const topCardsStyle: CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 12, marginBottom: 14 }
const featureCardStyle: CSSProperties = { minHeight: 118, padding: 18, background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, boxShadow: '0 8px 24px rgba(15,23,42,0.04)', display: 'flex', alignItems: 'flex-start', gap: 14, color: '#0f172a', textDecoration: 'none', fontSize: 13 }
const featureIconStyle: CSSProperties = { width: 44, height: 44, borderRadius: 12, background: '#dcfce7', color: '#16a34a', display: 'grid', placeItems: 'center', flexShrink: 0 }
const featureContentStyle: CSSProperties = { minWidth: 0, display: 'grid', gap: 6, lineHeight: 1.35 }
const featureTitleStyle: CSSProperties = { display: 'block', color: '#0f172a', fontSize: 13, fontWeight: 900 }
const featureTextStyle: CSSProperties = { display: 'block', color: '#475569', fontSize: 12, lineHeight: 1.45 }
const featureActionStyle: CSSProperties = { display: 'inline-flex', alignItems: 'center', gap: 4, color: '#0f172a', fontSize: 12, fontWeight: 900 }
const mainGridStyle: CSSProperties = { display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 320px', gap: 14, alignItems: 'start', marginBottom: 14 }
const panelStyle: CSSProperties = { background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, boxShadow: '0 8px 24px rgba(15,23,42,0.04)', overflow: 'hidden', marginBottom: 14 }
const sideStackStyle: CSSProperties = { display: 'grid', gap: 14 }
const sidePanelStyle: CSSProperties = { background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, boxShadow: '0 8px 24px rgba(15,23,42,0.04)', overflow: 'hidden' }
const sectionHeaderStyle: CSSProperties = { padding: '15px 16px', borderBottom: '1px solid #f1f5f9' }
const sectionTitleStyle: CSSProperties = { margin: 0, color: '#0f172a', fontSize: 14, fontWeight: 900 }
const configGridStyle: CSSProperties = { display: 'grid', gridTemplateColumns: '1fr 1fr' }
const configItemStyle: CSSProperties = { minHeight: 98, padding: 18, display: 'grid', gridTemplateColumns: '44px 1fr auto', gap: 14, alignItems: 'center', color: '#0f172a', textDecoration: 'none', borderRight: '1px solid #f1f5f9', borderBottom: '1px solid #f1f5f9', fontSize: 13 }
const configIconStyle: CSSProperties = { width: 44, height: 44, borderRadius: 12, background: '#f0fdf4', color: '#16a34a', display: 'grid', placeItems: 'center' }
const actionButtonStyle: CSSProperties = { width: '100%', minHeight: 42, padding: '0 14px', border: 'none', borderBottom: '1px solid #f1f5f9', background: '#fff', color: '#0f172a', display: 'grid', gridTemplateColumns: 'auto 1fr auto', alignItems: 'center', gap: 10, textAlign: 'left', fontSize: 13, fontWeight: 800, fontFamily: font, cursor: 'not-allowed' }
const summaryRowStyle: CSSProperties = { display: 'flex', justifyContent: 'space-between', gap: 12, padding: '11px 16px', borderBottom: '1px solid #f1f5f9', color: '#475569', fontSize: 13 }
const emptyStateStyle: CSSProperties = { display: 'grid', placeItems: 'center', alignContent: 'center', gap: 8, padding: 20, color: '#64748b', fontSize: 13, textAlign: 'center' }
const activityListStyle: CSSProperties = { display: 'grid' }
const activityItemStyle: CSSProperties = { minHeight: 64, padding: '12px 16px', borderBottom: '1px solid #f1f5f9', display: 'grid', gridTemplateColumns: '40px 1fr auto', gap: 12, alignItems: 'center', color: '#0f172a', fontSize: 13 }
const activityIconStyle: CSSProperties = { width: 36, height: 36, borderRadius: 10, background: '#f0fdf4', color: '#16a34a', display: 'grid', placeItems: 'center' }
