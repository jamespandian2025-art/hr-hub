'use client'

import Link from 'next/link'
import { useParams } from 'next/navigation'
import { BriefcaseBusiness, CalendarDays, CircleDollarSign, FileText, Globe2, Mail, MapPin, MoreHorizontal, Pencil, Phone, StickyNote, UsersRound } from 'lucide-react'
import type { ReactNode } from 'react'
import { useEffect, useState } from 'react'
import { ClientRecord, findClient, formatPeso, getInitials } from '../clientData'

const font = 'var(--font-body)'
const green = '#16a34a'

const tabs = ['Overview', 'Projects', 'Invoices', 'Contracts', 'Activities', 'Notes', 'Documents', 'Contacts', 'History']

export default function ClientDetailPage() {
  const params = useParams<{ id: string }>()
  const [client, setClient] = useState<ClientRecord>()
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('Overview')

  useEffect(() => {
    let mounted = true

    findClient(params.id).then(result => {
      if (!mounted) return
      setClient(result.client)
      setLoading(false)
    })

    return () => {
      mounted = false
    }
  }, [params.id])

  if (loading) {
    return (
      <div style={{ fontFamily: font, display: 'grid', placeItems: 'center', minHeight: 420 }}>
        <div style={{ color: '#64748b', fontSize: 14, fontWeight: 800 }}>Loading client...</div>
      </div>
    )
  }

  if (!client) {
    return (
      <div style={{ fontFamily: font, display: 'grid', placeItems: 'center', minHeight: 420 }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ color: '#cbd5e1', marginBottom: 14 }}><UsersRound size={52} /></div>
          <h1 style={{ margin: 0, color: '#0f172a', fontSize: 22, fontWeight: 900 }}>Client not found</h1>
          <p style={{ color: '#64748b', fontSize: 14 }}>The selected client may have been removed.</p>
          <Link href="/people/clients" style={primaryLink}>Back to Client Database</Link>
        </div>
      </div>
    )
  }

  const tabCounts: Record<string, number> = {
    Projects: client.totalProjects,
    Invoices: client.invoices.total,
    Contracts: client.contracts,
    Notes: client.notes.length,
    Documents: client.documents,
    Contacts: client.contacts.length,
  }

  return (
    <div className="client-detail-page" style={{ fontFamily: font, display: 'grid', gap: 22 }}>
      <div style={pageHeader}>
        <div>
          <div style={breadcrumb}>Home / Client Database / {client.name}</div>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button style={secondaryButton}><Pencil size={16} /> Edit Client</button>
          <button style={secondaryButton}><MoreHorizontal size={16} /> More</button>
        </div>
      </div>

      <section style={heroCard}>
        <div style={clientHero}>
          <span style={heroAvatar}>{getInitials(client.name)}</span>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <h1 style={h1}>{client.name}</h1>
              <StatusBadge status={client.status} />
            </div>
            <p style={subtitle}>{client.industry} Solutions & Services</p>
            <div style={contactGrid}>
              <InfoPill icon={Mail} text={client.email} />
              <InfoPill icon={Phone} text={client.phone} />
              <InfoPill icon={Globe2} text={client.website || client.company} />
              <InfoPill icon={MapPin} text={client.billingAddress} wide />
            </div>
          </div>
        </div>
        <div style={metricStrip}>
          <Metric icon={BriefcaseBusiness} label="Total Projects" value={client.totalProjects.toString()} sub={`Active: ${client.activeProjects}`} />
          <Metric icon={CircleDollarSign} label="Total Revenue" value={formatPeso(client.totalRevenue)} sub="Lifetime Value" />
          <Metric icon={CircleDollarSign} label="Outstanding" value={formatPeso(client.outstandingRevenue)} sub={`${client.invoices.unpaid} invoices`} tone="#f97316" />
          <Metric icon={CalendarDays} label="Client Since" value={formatDate(client.createdAt)} sub={clientAge(client.createdAt)} tone="#2563eb" />
        </div>
      </section>

      <nav style={tabsWrap}>
        {tabs.map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)} style={tabButton(activeTab === tab)}>
            {tab}
            {tabCounts[tab] ? <span style={tabCount}>{tabCounts[tab]}</span> : null}
          </button>
        ))}
      </nav>

      {activeTab === 'Overview' ? <OverviewTab client={client} /> : <EmptyTab tab={activeTab} client={client} />}
    </div>
  )
}

function OverviewTab({ client }: { client: ClientRecord }) {
  return (
    <div style={overviewGrid}>
      <Panel title={`About ${client.name}`} footer="Show more">
        <p style={bodyText}>{client.description}</p>
        <DetailsList
          rows={[
            ['Industry', client.industry],
            ['Company Size', client.companySize],
            ['Company Type', client.companyType],
            ['Annual Revenue', client.annualRevenue],
            ['Tax ID / VAT', client.taxId],
            ['Billing Address', client.billingAddress],
          ]}
        />
      </Panel>

      <Panel title="Key Contacts" footer="View all contacts">
        {client.contacts.length ? (
          <div style={{ display: 'grid', gap: 18 }}>
            {client.contacts.slice(0, 3).map(contact => (
              <div key={contact.id} style={contactRow}>
                <span style={smallAvatar('#e0f2fe', '#0369a1')}>{getInitials(contact.name)}</span>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 900, color: '#0f172a' }}>{contact.name} {contact.primary ? <span style={primaryBadge}>Primary</span> : null}</div>
                  <div style={muted}>{contact.role}</div>
                  <div style={contactMeta}><Mail size={13} /> {contact.email}</div>
                  <div style={contactMeta}><Phone size={13} /> {contact.phone}</div>
                </div>
                <MoreHorizontal size={18} color="#64748b" style={{ marginLeft: 'auto' }} />
              </div>
            ))}
          </div>
        ) : <EmptyMessage text="No contacts added yet." />}
      </Panel>

      <Panel title="Recent Activities" footer="View all">
        {client.activities.length ? (
          <div style={{ display: 'grid', gap: 18 }}>
            {client.activities.map(activity => (
              <div key={activity.id} style={activityRow}>
                <span style={activityIcon(activity.tone)}><FileText size={15} /></span>
                <div>
                  <div style={{ fontWeight: 900, color: '#0f172a' }}>{activity.title}</div>
                  <div style={muted}>{activity.description}</div>
                </div>
                <div style={{ marginLeft: 'auto', textAlign: 'right', color: '#64748b', fontSize: 12 }}>
                  <div>{activity.date}</div>
                  <div>{activity.time}</div>
                </div>
              </div>
            ))}
          </div>
        ) : <EmptyMessage text="No activities yet." />}
      </Panel>

      <Panel title="Project Summary" footer="View all projects">
        <div style={{ display: 'flex', gap: 28, alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={donut(client)}>
            <span style={donutCenter}>{client.totalProjects}<small>Total Projects</small></span>
          </div>
          <div style={{ display: 'grid', gap: 12, flex: 1 }}>
            <Legend color={green} label="In Progress" value={`${client.activeProjects} (${percent(client.activeProjects, client.totalProjects)}%)`} />
            <Legend color="#2563eb" label="Completed" value={`${client.completedProjects} (${percent(client.completedProjects, client.totalProjects)}%)`} />
            <Legend color="#f59e0b" label="On Hold" value={`${client.onHoldProjects} (${percent(client.onHoldProjects, client.totalProjects)}%)`} />
          </div>
        </div>
      </Panel>

      <Panel title="Invoice Summary" footer="View all invoices">
        <div style={invoiceBoxes}>
          <MiniMetric value={client.invoices.total} label="Total Invoices" />
          <MiniMetric value={client.invoices.paid} label="Paid" tone={green} />
          <MiniMetric value={client.invoices.unpaid} label="Unpaid" />
          <MiniMetric value={client.invoices.overdue} label="Overdue" tone="#ef4444" />
        </div>
        <DetailsList
          rows={[
            ['Total Billed', formatPeso(client.totalRevenue)],
            ['Total Paid', formatPeso(client.paidRevenue)],
            ['Outstanding', formatPeso(client.outstandingRevenue)],
          ]}
        />
      </Panel>

      <Panel title="Notes" footer="Add note">
        {client.notes.length ? (
          <div style={{ display: 'grid', gap: 16 }}>
            {client.notes.map(note => (
              <div key={note.id} style={noteRow}>
                <StickyNote size={18} color="#7c3aed" />
                <div>
                  <div style={{ fontWeight: 900, color: '#0f172a' }}>{note.title}</div>
                  <div style={muted}>{note.body}</div>
                  <div style={{ ...muted, marginTop: 6 }}>{note.date} by {note.author}</div>
                </div>
              </div>
            ))}
          </div>
        ) : <EmptyMessage text="No notes added yet." />}
      </Panel>
    </div>
  )
}

function EmptyTab({ tab, client }: { tab: string; client: ClientRecord }) {
  return (
    <section style={{ ...panel, minHeight: 280, display: 'grid', placeItems: 'center', textAlign: 'center' }}>
      <div>
        <div style={{ color: '#cbd5e1', marginBottom: 14 }}><FileText size={48} /></div>
        <h2 style={{ margin: 0, color: '#0f172a', fontSize: 18, fontWeight: 900 }}>No {tab.toLowerCase()} yet</h2>
        <p style={{ color: '#64748b', fontSize: 14, margin: '8px 0 0' }}>{client.name} does not have {tab.toLowerCase()} records yet.</p>
      </div>
    </section>
  )
}

function Panel({ title, children, footer }: { title: string; children: ReactNode; footer?: string }) {
  return (
    <section style={panel}>
      <h2 style={panelTitle}>{title}</h2>
      <div style={{ display: 'grid', gap: 18 }}>{children}</div>
      {footer ? <button style={footerLink}>{footer}</button> : null}
    </section>
  )
}

function DetailsList({ rows }: { rows: [string, string][] }) {
  return (
    <dl style={{ display: 'grid', gap: 12, margin: 0 }}>
      {rows.map(([label, value]) => (
        <div key={label} style={{ display: 'grid', gridTemplateColumns: '170px 1fr', gap: 18 }}>
          <dt style={muted}>{label}</dt>
          <dd style={{ margin: 0, color: '#0f172a', fontSize: 13, fontWeight: 800 }}>{value}</dd>
        </div>
      ))}
    </dl>
  )
}

function Metric({ icon: Icon, label, value, sub, tone = green }: { icon: typeof UsersRound; label: string; value: string; sub: string; tone?: string }) {
  return (
    <div style={metricCard}>
      <span style={metricIcon(tone)}><Icon size={19} /></span>
      <div>
        <div style={muted}>{label}</div>
        <div style={{ color: '#0f172a', fontSize: 18, fontWeight: 900, marginTop: 4 }}>{value}</div>
        <div style={{ color: '#64748b', fontSize: 12, marginTop: 5 }}>{sub}</div>
      </div>
    </div>
  )
}

function InfoPill({ icon: Icon, text, wide }: { icon: typeof Mail; text: string; wide?: boolean }) {
  return (
    <div style={{ ...infoPill, gridColumn: wide ? '1 / -1' : undefined }}>
      <span style={tinyIcon}><Icon size={15} /></span>
      <span>{text}</span>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  return <span style={{ padding: '4px 9px', borderRadius: 999, background: status === 'Active' ? '#dcfce7' : '#ffedd5', color: status === 'Active' ? '#15803d' : '#c2410c', fontSize: 12, fontWeight: 900 }}>{status}</span>
}

function MiniMetric({ value, label, tone = '#2563eb' }: { value: number; label: string; tone?: string }) {
  return (
    <div style={miniMetric}>
      <strong style={{ color: tone, fontSize: 20 }}>{value}</strong>
      <span style={muted}>{label}</span>
    </div>
  )
}

function Legend({ color, label, value }: { color: string; label: string; value: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <span style={{ width: 9, height: 9, borderRadius: 999, background: color }} />
      <span style={{ color: '#0f172a', fontSize: 13, fontWeight: 800 }}>{label}</span>
      <span style={{ color: '#64748b', fontSize: 13, marginLeft: 'auto' }}>{value}</span>
    </div>
  )
}

function EmptyMessage({ text }: { text: string }) {
  return <div style={{ padding: '30px 0', color: '#64748b', fontSize: 13, fontWeight: 700, textAlign: 'center' }}>{text}</div>
}

function formatDate(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' })
}

function clientAge(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'
  const months = Math.max(1, Math.round((Date.now() - date.getTime()) / 1000 / 60 / 60 / 24 / 30))
  if (months < 12) return `${months} months`
  const years = Math.floor(months / 12)
  return `${years} year${years > 1 ? 's' : ''}, ${months % 12} months`
}

function percent(value: number, total: number) {
  if (!total) return 0
  return Math.round((value / total) * 100)
}

const pageHeader = { display: 'flex', justifyContent: 'space-between', gap: 20, alignItems: 'flex-start', flexWrap: 'wrap' as const }
const breadcrumb = { fontSize: 13, color: '#008b4a', fontWeight: 800 }
const h1 = { margin: 0, color: '#020617', fontSize: 30, lineHeight: 1.1, fontWeight: 900, letterSpacing: 0 }
const subtitle = { margin: '8px 0 0', color: '#475569', fontSize: 14, fontWeight: 600 }
const primaryLink = { display: 'inline-flex', alignItems: 'center', height: 40, padding: '0 16px', borderRadius: 8, background: green, color: '#fff', textDecoration: 'none', fontSize: 13, fontWeight: 900 }
const secondaryButton = { display: 'inline-flex', alignItems: 'center', gap: 8, height: 40, padding: '0 14px', borderRadius: 8, border: '1px solid #dbe3ea', background: '#fff', color: '#0f172a', fontSize: 13, fontWeight: 900, cursor: 'pointer' }
const heroCard = { display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(320px, .9fr)', gap: 26, background: '#fff', border: '1px solid #dfe7ee', borderRadius: 14, padding: 22, boxShadow: '0 10px 24px rgba(15,23,42,.04)' }
const clientHero = { display: 'grid', gridTemplateColumns: '72px minmax(0, 1fr)', gap: 18, alignItems: 'flex-start' }
const heroAvatar = { width: 64, height: 64, borderRadius: 14, background: '#ede9fe', color: '#7c3aed', display: 'grid', placeItems: 'center', fontSize: 24, fontWeight: 900 }
const contactGrid = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 12, marginTop: 28 }
const infoPill = { display: 'flex', alignItems: 'center', gap: 10, color: '#475569', fontSize: 13, fontWeight: 700, minWidth: 0 }
const tinyIcon = { width: 28, height: 28, borderRadius: 8, background: '#f1f5f9', color: '#64748b', display: 'grid', placeItems: 'center', flex: '0 0 auto' }
const metricStrip = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', borderLeft: '1px solid #e2e8f0' }
const metricCard = { display: 'flex', gap: 12, alignItems: 'center', padding: '10px 18px', borderRight: '1px solid #e2e8f0' }
const metricIcon = (color: string) => ({ width: 38, height: 38, borderRadius: 10, background: `${color}16`, color, display: 'grid', placeItems: 'center', flex: '0 0 auto' })
const tabsWrap = { display: 'flex', gap: 18, borderBottom: '1px solid #dbe3ea', overflowX: 'auto' as const }
const tabButton = (active: boolean) => ({ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '0 0 14px', border: 'none', borderBottom: `2px solid ${active ? green : 'transparent'}`, background: 'transparent', color: active ? green : '#0f172a', fontSize: 13, fontWeight: 900, cursor: 'pointer', whiteSpace: 'nowrap' as const })
const tabCount = { minWidth: 20, height: 20, borderRadius: 999, background: '#f1f5f9', color: '#475569', display: 'inline-grid', placeItems: 'center', fontSize: 11 }
const overviewGrid = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 18 }
const panel = { background: '#fff', border: '1px solid #dfe7ee', borderRadius: 14, padding: 22, boxShadow: '0 10px 24px rgba(15,23,42,.04)' }
const panelTitle = { margin: '0 0 18px', color: '#0f172a', fontSize: 16, fontWeight: 900 }
const bodyText = { color: '#334155', fontSize: 13, lineHeight: 1.65, margin: 0 }
const muted = { color: '#64748b', fontSize: 13, fontWeight: 600 }
const footerLink = { justifySelf: 'start', marginTop: 18, border: 'none', background: 'transparent', padding: 0, color: '#0f8a4b', fontSize: 13, fontWeight: 900, cursor: 'pointer' }
const contactRow = { display: 'grid', gridTemplateColumns: '42px minmax(0, 1fr) 20px', gap: 12, alignItems: 'start' }
const contactMeta = { display: 'flex', alignItems: 'center', gap: 6, color: '#64748b', fontSize: 12, fontWeight: 600, marginTop: 5 }
const primaryBadge = { marginLeft: 8, padding: '3px 8px', borderRadius: 999, background: '#dcfce7', color: '#15803d', fontSize: 11, fontWeight: 900 }
const activityRow = { display: 'grid', gridTemplateColumns: '34px minmax(0, 1fr) auto', gap: 12, alignItems: 'start' }
const noteRow = { display: 'grid', gridTemplateColumns: '28px minmax(0, 1fr)', gap: 10 }
const invoiceBoxes = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: 10 }
const miniMetric = { minHeight: 74, border: '1px solid #dbe3ea', borderRadius: 10, display: 'grid', placeItems: 'center', textAlign: 'center' as const, padding: 10 }
const smallAvatar = (background: string, color: string) => ({ width: 38, height: 38, borderRadius: 999, background, color, display: 'grid', placeItems: 'center', fontSize: 12, fontWeight: 900 })
const donutCenter = { width: 92, height: 92, borderRadius: '50%', background: '#fff', display: 'grid', placeItems: 'center', color: '#0f172a', fontSize: 24, fontWeight: 900, textAlign: 'center' as const, boxShadow: 'inset 0 0 0 1px #e2e8f0' }

const activityIcon = (tone: string) => {
  const colors: Record<string, string> = { green, blue: '#2563eb', purple: '#7c3aed', orange: '#f97316' }
  const color = colors[tone] || green
  return { width: 34, height: 34, borderRadius: 10, background: `${color}16`, color, display: 'grid', placeItems: 'center' }
}

const donut = (client: ClientRecord) => {
  const active = percent(client.activeProjects, client.totalProjects)
  const completed = percent(client.completedProjects, client.totalProjects)
  return {
    width: 136,
    height: 136,
    borderRadius: '50%',
    background: client.totalProjects
      ? `conic-gradient(${green} 0 ${active}%, #2563eb ${active}% ${active + completed}%, #f59e0b ${active + completed}% 100%)`
      : '#e2e8f0',
    display: 'grid',
    placeItems: 'center',
    flex: '0 0 auto',
  }
}
