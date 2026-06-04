'use client'

import Link from 'next/link'
import { useParams } from 'next/navigation'
import { Activity, ArrowLeft, BriefcaseBusiness, CalendarDays, ChevronDown, CircleDollarSign, Clock3, Copy, FileText, Globe2, Mail, MapPin, MoreHorizontal, Pencil, Phone, Plus, ReceiptText, UserPlus, UserRound, UsersRound } from 'lucide-react'
import type { FormEvent, ReactNode } from 'react'
import { useEffect, useMemo, useState } from 'react'
import { ClientRecord, findClient, formatPeso, getInitials, saveClient, type ClientActivity } from '../clientData'
import { type AccountingInvoice, isOverdue, loadAccountingData, money, subscribeAccountingData } from '@/lib/accounting/data'
import { loadProjectManagementState } from '@/lib/project-management/service'
import type { ProjectRecord } from '@/lib/project-management/types'

const font = 'var(--font-body)'
const green = '#16a34a'

const tabs = ['Overview', 'Projects', 'Invoices', 'Contracts', 'Activities', 'Notes', 'Documents', 'Contacts', 'History']

export default function ClientDetailPage() {
  const params = useParams<{ id: string }>()
  const [client, setClient] = useState<ClientRecord>()
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('Overview')
  const [hoveredTab, setHoveredTab] = useState('')
  const [moreOpen, setMoreOpen] = useState(false)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editForm, setEditForm] = useState({ name: '', email: '', phone: '', website: '', clientManager: '', billingAddress: '' })
  const [loggingActivity, setLoggingActivity] = useState(false)
  const [activitySaving, setActivitySaving] = useState(false)
  const [activityForm, setActivityForm] = useState({ title: '', description: '', tone: 'green' as ClientActivity['tone'] })
  const [invoices, setInvoices] = useState<AccountingInvoice[]>([])
  const [projects, setProjects] = useState<ProjectRecord[]>([])

  useEffect(() => {
    let mounted = true

    findClient(params.id).then(result => {
      if (!mounted) return
      setClient(result.client)
      if (result.client) {
        setEditForm({
          name: result.client.name,
          email: result.client.email,
          phone: result.client.phone,
          website: result.client.website,
          clientManager: result.client.accountManager,
          billingAddress: result.client.billingAddress,
        })
      }
      setLoading(false)
    })

    return () => {
      mounted = false
    }
  }, [params.id])

  useEffect(() => {
    const load = () => setInvoices(loadAccountingData().invoices)
    load()
    return subscribeAccountingData(load)
  }, [])

  useEffect(() => {
    const loadProjects = () => {
      try {
        setProjects(loadProjectManagementState().projects)
      } catch {
        setProjects([])
      }
    }

    loadProjects()
    window.addEventListener('storage', loadProjects)
    window.addEventListener('wiseflow-project-management-refresh', loadProjects)
    return () => {
      window.removeEventListener('storage', loadProjects)
      window.removeEventListener('wiseflow-project-management-refresh', loadProjects)
    }
  }, [])

  const updateEditField = (field: keyof typeof editForm, value: string) => {
    setEditForm(current => ({ ...current, [field]: value }))
  }

  const handleSaveEdit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!client || saving) return

    setSaving(true)
    const updatedClient = {
      ...client,
      name: editForm.name.trim() || client.name,
      email: editForm.email.trim() || client.email,
      phone: editForm.phone.trim() || client.phone,
      website: editForm.website.trim(),
      company: editForm.website.trim().replace(/^https?:\/\//, '') || client.company,
      accountManager: editForm.clientManager.trim() || client.accountManager,
      billingAddress: editForm.billingAddress.trim() || client.billingAddress,
    }

    try {
      const result = await saveClient(updatedClient)
      setClient(result.client)
      setEditing(false)
    } finally {
      setSaving(false)
    }
  }

  const openActivityLogger = () => {
    if (!client) return
    setActivityForm({
      title: 'Follow-up logged',
      description: `Logged a client touchpoint for ${client.name}.`,
      tone: 'green',
    })
    setLoggingActivity(true)
  }

  const handleSaveActivity = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!client || activitySaving) return

    setActivitySaving(true)
    const now = new Date()
    const activityDate = now.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' })
    const activity: ClientActivity = {
      id: `act-${Date.now()}`,
      title: activityForm.title.trim() || 'Client activity logged',
      description: activityForm.description.trim() || `Logged a client touchpoint for ${client.name}.`,
      date: activityDate,
      time: now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      tone: activityForm.tone,
    }
    const updatedClient: ClientRecord = {
      ...client,
      lastContact: activityDate,
      activities: [activity, ...client.activities],
    }

    try {
      const result = await saveClient(updatedClient)
      setClient(result.client)
      setLoggingActivity(false)
    } finally {
      setActivitySaving(false)
    }
  }

  const clientFinancials = useMemo(() => client ? buildClientFinancials(client, invoices) : emptyClientInvoiceSummary(), [client, invoices])
  const financialDisplay = useMemo(() => client ? buildFinancialDisplay(client, clientFinancials) : emptyFinancialDisplay(), [client, clientFinancials])
  const clientProjects = useMemo(() => client ? projects.filter(project => projectBelongsToClient(project, client)) : [], [client, projects])

  if (loading) {
    return (
      <div style={{ fontFamily: font, display: 'grid', placeItems: 'center', minHeight: 420 }}>
        <div style={{ color: '#000000', fontSize: 14, fontWeight: 800 }}>Loading client...</div>
      </div>
    )
  }

  if (!client) {
    return (
      <div style={{ fontFamily: font, display: 'grid', placeItems: 'center', minHeight: 420 }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ color: '#000000', marginBottom: 14 }}><UsersRound size={52} /></div>
          <h1 style={{ margin: 0, color: '#0f172a', fontSize: 22, fontWeight: 900 }}>Client not found</h1>
          <p style={{ color: '#000000', fontSize: 14 }}>The selected client may have been removed.</p>
          <Link href="/people/clients" style={primaryLink}>Back to Client Database</Link>
        </div>
      </div>
    )
  }

  const projectCreateHref = clientCreateHref('/project-management/projects', client, {
    projectName: `${client.name} Project`,
    address: client.billingAddress,
  })
  const invoiceCreateHref = clientCreateHref('/accounting/invoices', client, {
    billTo: clientBillingBlock(client),
  })
  const contactCreateHref = clientCreateHref('/people/contacts', client, {
    company: client.name,
  })

  return (
    <div className="client-detail-page client-command-center" style={{ fontFamily: font }}>
      <style>{clientDetailCss}</style>
      <div className="client-mobile-bar">
        <Link href="/people/clients" aria-label="Back to clients">&lt;</Link>
        <span>{client.name}</span>
        <StatusBadge status={client.status} />
      </div>
      <div className="client-crumb-row">
        <Link href="/people/clients" className="client-back-list-button"><ArrowLeft size={14} /> Back to Client List</Link>
        <nav className="client-crumbs" aria-label="Breadcrumb">
          <Link href="/people/clients">Client Database</Link>
          <span>/</span>
          <strong>{client.name}</strong>
        </nav>
      </div>
      <section className="client-hero-card" style={heroCard}>
        <div className="client-hero-topline">
          <div className="client-hero-main" style={clientHero}>
            <span className="client-hero-avatar" style={heroAvatar(client.photo)}>{!client.photo && getInitials(client.name)}</span>
            <div className="client-hero-copy">
              <div className="client-title-row">
                <h1 className="client-name" style={h1}>{client.name}</h1>
                <StatusBadge status={client.status} />
                <span className="client-type-badge">{client.clientType || client.companyType || 'Commercial'}</span>
              </div>
              <div className="client-contact-grid" style={contactGrid}>
                <InfoPill icon={Mail} text={client.email} href={`mailto:${client.email}`} copyValue={client.email} />
                <InfoPill icon={Phone} text={client.phone} href={`tel:${phoneHref(client.phone)}`} copyValue={client.phone} />
                <InfoPill icon={Globe2} text={client.website || client.company} href={websiteHref(client.website || client.company)} copyValue={client.website || client.company} external />
                <InfoPill icon={MapPin} text={client.billingAddress} href={mapsHref(client.billingAddress)} copyValue={client.billingAddress} external />
              </div>
            </div>
          </div>

          <div className="client-actions client-hero-actions">
            <Link href={projectCreateHref} className="client-action-button is-primary"><Plus size={16} /> Project</Link>
            <Link href={invoiceCreateHref} className="client-action-button"><Plus size={16} /> Invoice</Link>
            <Link href={contactCreateHref} className="client-action-button"><Plus size={16} /> Contact</Link>
            <button type="button" className="client-action-button" onClick={openActivityLogger}><Activity size={16} /> Log Activity</button>
            <div className="client-more-wrap" style={{ position: 'relative' }}>
              <button type="button" aria-expanded={moreOpen} className="client-action-button" onClick={() => setMoreOpen(open => !open)}><MoreHorizontal size={16} /> More</button>
              {moreOpen ? (
                <div className="client-detail-action-menu" style={actionMenu}>
                  <button type="button" className="client-action-menu-item" style={actionMenuItem} onClick={() => { setEditing(true); setMoreOpen(false) }}><Pencil size={14} /> <span>Edit client</span></button>
                  <a href={`mailto:${client.email}`} className="client-action-menu-item" style={actionMenuItem} onClick={() => setMoreOpen(false)}><Mail size={14} /> <span>Email client</span></a>
                  <button type="button" className="client-action-menu-item" style={actionMenuItem} onClick={() => { copyToClipboard(client.email); setMoreOpen(false) }}><Copy size={14} /> <span>Copy email</span></button>
                  <button type="button" className="client-action-menu-item" style={actionMenuItem} onClick={() => { copyToClipboard(`${window.location.origin}/people/clients/${client.id}`); setMoreOpen(false) }}><Copy size={14} /> <span>Copy profile link</span></button>
                  <Link href="/people/clients" className="client-action-menu-item" style={actionMenuItem} onClick={() => setMoreOpen(false)}><UsersRound size={14} /> <span>Client Database</span></Link>
                </div>
              ) : null}
            </div>
          </div>
        </div>

      </section>

      <nav className="client-tabs" style={tabsWrap}>
        {tabs.map(tab => (
          <button
            key={tab}
            className={[
              'client-tab-button',
              activeTab === tab ? 'is-active' : '',
              hoveredTab === tab ? 'is-hovered' : '',
            ].filter(Boolean).join(' ')}
            onClick={() => setActiveTab(tab)}
            onMouseEnter={() => setHoveredTab(tab)}
            onMouseLeave={() => setHoveredTab('')}
            onFocus={() => setHoveredTab(tab)}
            onBlur={() => setHoveredTab('')}
            style={tabButton(activeTab === tab || hoveredTab === tab)}
          >
            {tab}
          </button>
        ))}
      </nav>

      {activeTab === 'Overview' ? (
        <OverviewTab
          client={client}
          invoiceSummary={clientFinancials}
          financialDisplay={financialDisplay}
          projects={clientProjects}
          onLogActivity={openActivityLogger}
          onViewActivities={() => setActiveTab('Activities')}
        />
      ) : null}
      {activeTab === 'Projects' ? <ClientProjectsTab client={client} projects={clientProjects} projectCreateHref={projectCreateHref} /> : null}
      {activeTab === 'Invoices' ? <ClientInvoicesTab invoiceSummary={clientFinancials} financialDisplay={financialDisplay} invoiceCreateHref={invoiceCreateHref} /> : null}
      {activeTab === 'Activities' ? <ClientActivitiesTab client={client} onLogActivity={openActivityLogger} /> : null}
      {activeTab === 'Contacts' ? <ClientContactsTab client={client} contactCreateHref={contactCreateHref} /> : null}
      {activeTab !== 'Overview' && activeTab !== 'Projects' && activeTab !== 'Invoices' && activeTab !== 'Activities' && activeTab !== 'Contacts' ? <EmptyTab tab={activeTab} client={client} /> : null}

      {editing ? (
        <div className="client-edit-backdrop" style={modalBackdrop}>
          <form className="client-edit-dialog" onSubmit={handleSaveEdit} style={modalCard}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'flex-start' }}>
              <div>
                <h2 style={{ margin: 0, fontSize: 18, fontWeight: 600, color: 'var(--foreground)' }}>Edit Client</h2>
                <p style={{ margin: '8px 0 0', color: 'var(--muted-foreground)', fontSize: 13 }}>Update the client profile details.</p>
              </div>
              <button type="button" style={iconCloseButton} onClick={() => setEditing(false)}>Close</button>
            </div>
            <div style={modalGrid}>
              <EditField label="Client Name" value={editForm.name} onChange={value => updateEditField('name', value)} />
              <EditField label="Email" value={editForm.email} onChange={value => updateEditField('email', value)} type="email" />
              <EditField label="Phone" value={editForm.phone} onChange={value => updateEditField('phone', value)} />
              <EditField label="Website" value={editForm.website} onChange={value => updateEditField('website', value)} />
              <EditField label="Client Manager" value={editForm.clientManager} onChange={value => updateEditField('clientManager', value)} />
              <label style={{ ...modalField, gridColumn: '1 / -1' }}>
                <span>Billing Address</span>
                <input value={editForm.billingAddress} onChange={event => updateEditField('billingAddress', event.target.value)} style={modalInput} />
              </label>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button type="button" style={secondaryButton} onClick={() => setEditing(false)}>Cancel</button>
              <button type="submit" style={primaryButton} disabled={saving}>{saving ? 'Saving...' : 'Save Changes'}</button>
            </div>
          </form>
        </div>
      ) : null}

      {loggingActivity ? (
        <div className="client-edit-backdrop" style={modalBackdrop}>
          <form className="client-edit-dialog" onSubmit={handleSaveActivity} style={modalCard}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'flex-start' }}>
              <div>
                <h2 style={{ margin: 0, fontSize: 18, fontWeight: 600, color: 'var(--foreground)' }}>Log Activity</h2>
                <p style={{ margin: '8px 0 0', color: 'var(--muted-foreground)', fontSize: 13 }}>Capture a client touchpoint for the activity timeline.</p>
              </div>
              <button type="button" style={iconCloseButton} onClick={() => setLoggingActivity(false)}>Close</button>
            </div>
            <div style={{ display: 'grid', gap: 14 }}>
              <EditField label="Activity Title" value={activityForm.title} onChange={value => setActivityForm(current => ({ ...current, title: value }))} />
              <label style={{ ...modalField, gridColumn: '1 / -1' }}>
                <span>Description</span>
                <textarea value={activityForm.description} onChange={event => setActivityForm(current => ({ ...current, description: event.target.value }))} style={{ ...modalInput, minHeight: 96, paddingTop: 10, resize: 'vertical' }} />
              </label>
              <label style={modalField}>
                <span>Activity Type</span>
                <select value={activityForm.tone} onChange={event => setActivityForm(current => ({ ...current, tone: event.target.value as ClientActivity['tone'] }))} style={modalInput}>
                  <option value="green">Follow-up / Success</option>
                  <option value="blue">Call / Meeting</option>
                  <option value="orange">Payment / Invoice</option>
                  <option value="purple">Contract / Note</option>
                </select>
              </label>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button type="button" style={secondaryButton} onClick={() => setLoggingActivity(false)}>Cancel</button>
              <button type="submit" style={primaryButton} disabled={activitySaving}>{activitySaving ? 'Saving...' : 'Save Activity'}</button>
            </div>
          </form>
        </div>
      ) : null}
    </div>
  )
}

function EditField({ label, value, onChange, type = 'text' }: { label: string; value: string; onChange: (value: string) => void; type?: string }) {
  return (
    <label style={modalField}>
      <span>{label}</span>
      <input type={type} value={value} onChange={event => onChange(event.target.value)} style={modalInput} />
    </label>
  )
}

type ClientInvoiceSummary = {
  invoices: AccountingInvoice[]
  totalBilled: number
  totalPaid: number
  outstanding: number
  paidCount: number
  unpaidCount: number
  overdueCount: number
}

type ClientFinancialDisplay = {
  total: number
  paid: number
  outstanding: number
  invoiceCount: number
  paidCount: number
  unpaidCount: number
  overdueCount: number
  sourceLabel: string
}

type ClientProjectCard = {
  id: string
  name: string
  description: string
  progress: number
  budget: number
  dueDate: string
  tone: 'green' | 'blue' | 'purple'
}

type DashboardActivity = {
  id: string
  title: string
  description: string
  date: string
  time: string
  tone: 'green' | 'blue' | 'purple' | 'orange'
}

function emptyClientInvoiceSummary(): ClientInvoiceSummary {
  return {
    invoices: [],
    totalBilled: 0,
    totalPaid: 0,
    outstanding: 0,
    paidCount: 0,
    unpaidCount: 0,
    overdueCount: 0,
  }
}

function emptyFinancialDisplay(): ClientFinancialDisplay {
  return {
    total: 0,
    paid: 0,
    outstanding: 0,
    invoiceCount: 0,
    paidCount: 0,
    unpaidCount: 0,
    overdueCount: 0,
    sourceLabel: 'No revenue yet',
  }
}

function buildFinancialDisplay(client: ClientRecord, invoiceSummary: ClientInvoiceSummary): ClientFinancialDisplay {
  if (invoiceSummary.invoices.length) {
    return {
      total: invoiceSummary.totalBilled,
      paid: invoiceSummary.totalPaid,
      outstanding: invoiceSummary.outstanding,
      invoiceCount: invoiceSummary.invoices.length,
      paidCount: invoiceSummary.paidCount,
      unpaidCount: invoiceSummary.unpaidCount,
      overdueCount: invoiceSummary.overdueCount,
      sourceLabel: 'From linked invoices',
    }
  }

  return {
    total: client.totalRevenue,
    paid: client.paidRevenue,
    outstanding: client.outstandingRevenue,
    invoiceCount: client.invoices.total,
    paidCount: client.invoices.paid,
    unpaidCount: client.invoices.unpaid,
    overdueCount: client.invoices.overdue,
    sourceLabel: client.totalRevenue ? 'From client profile' : 'No revenue yet',
  }
}

function buildClientFinancials(client: ClientRecord, invoices: AccountingInvoice[]): ClientInvoiceSummary {
  const matchedInvoices = invoices
    .filter(invoice => invoiceBelongsToClient(invoice, client))
    .sort((a, b) => new Date(b.issueDate || 0).getTime() - new Date(a.issueDate || 0).getTime())

  return {
    invoices: matchedInvoices,
    totalBilled: matchedInvoices.reduce((sum, invoice) => sum + invoice.amount, 0),
    totalPaid: matchedInvoices.reduce((sum, invoice) => sum + invoice.paid, 0),
    outstanding: matchedInvoices.reduce((sum, invoice) => sum + invoice.balanceDue, 0),
    paidCount: matchedInvoices.filter(invoice => invoice.balanceDue <= 0 || invoice.status.toLowerCase() === 'paid').length,
    unpaidCount: matchedInvoices.filter(invoice => invoice.balanceDue > 0).length,
    overdueCount: matchedInvoices.filter(invoice => invoice.balanceDue > 0 && isOverdue(invoice.dueDate)).length,
  }
}

function invoiceBelongsToClient(invoice: AccountingInvoice, client: ClientRecord) {
  const clientEmail = normalizeMatch(client.email)
  const invoiceEmail = normalizeMatch(invoice.email)
  const clientName = normalizeMatch(client.name)
  const clientCompany = normalizeMatch(client.company)
  const invoiceCustomer = normalizeMatch(invoice.customer)

  return Boolean(
    (invoice.clientId && invoice.clientId === client.id) ||
    (clientEmail && invoiceEmail && clientEmail === invoiceEmail) ||
    (clientName && invoiceCustomer && clientName === invoiceCustomer) ||
    (clientCompany && invoiceCustomer && clientCompany === invoiceCustomer),
  )
}

function normalizeMatch(value?: string) {
  return (value || '').trim().toLowerCase()
}

function invoiceDisplayStatus(invoice: AccountingInvoice) {
  if (invoice.balanceDue > 0 && isOverdue(invoice.dueDate) && invoice.status.toLowerCase() !== 'paid') return 'Overdue'
  return invoice.status
}

function isResidentialClient(client: ClientRecord) {
  return client.clientType === 'Residential' || client.industry === 'Residential'
}

function projectBelongsToClient(project: ProjectRecord, client: ClientRecord) {
  const projectClientId = normalizeMatch(project.clientId)
  return Boolean(
    projectClientId &&
    (
      projectClientId === normalizeMatch(client.id) ||
      projectClientId === normalizeMatch(client.name) ||
      projectClientId === normalizeMatch(client.company)
    )
  )
}

function isActiveProject(project: ProjectRecord) {
  const status = project.status.toLowerCase()
  return !project.archivedAt && status !== 'completed' && status !== 'cancelled'
}

function buildClientProjectCards(client: ClientRecord, projects: ProjectRecord[]): ClientProjectCard[] {
  const activeProjects = projects
    .filter(project => isActiveProject(project))
    .sort((a, b) => new Date(`${a.dueDate}T00:00:00`).getTime() - new Date(`${b.dueDate}T00:00:00`).getTime())
    .slice(0, 3)

  if (activeProjects.length) {
    return activeProjects.map((project, index) => ({
      id: project.id,
      name: project.name,
      description: project.projectType || project.department || project.status,
      progress: Math.round(project.progress || 0),
      budget: project.budget || 0,
      dueDate: formatDate(project.dueDate),
      tone: index === 0 ? 'green' : index === 1 ? 'blue' : 'purple',
    }))
  }

  if (!client.activeProjects) return []

  const fallbackNames = isResidentialClient(client)
    ? ['Property scope planning', 'Site coordination', 'Client handover prep']
    : [`${client.industry || 'Client'} implementation`, 'Account delivery plan', 'Commercial follow-through']
  const totalBudget = client.totalRevenue || client.outstandingRevenue || client.paidRevenue

  return Array.from({ length: Math.min(client.activeProjects, 3) }, (_, index) => ({
    id: `${client.id}-portfolio-${index}`,
    name: fallbackNames[index] || `Active project ${index + 1}`,
    description: 'Summary from client profile',
    progress: [72, 48, 24][index] || 35,
    budget: totalBudget ? Math.round(totalBudget / Math.max(client.activeProjects, 1)) : 0,
    dueDate: formatDate(addMonthsFromToday(index + 1)),
    tone: index === 0 ? 'green' : index === 1 ? 'blue' : 'purple',
  }))
}

function buildDashboardActivities(client: ClientRecord, invoiceSummary: ClientInvoiceSummary): DashboardActivity[] {
  if (client.activities.length) {
    return client.activities.slice(0, 5).map(activity => ({
      id: activity.id,
      title: activity.title,
      description: activity.description,
      date: activity.date,
      time: activity.time,
      tone: activity.tone,
    }))
  }

  return invoiceSummary.invoices.slice(0, 4).map(invoice => ({
    id: invoice.id,
    title: `${invoice.number} ${invoice.balanceDue > 0 ? 'sent' : 'paid'}`,
    description: invoice.balanceDue > 0
      ? `Balance due ${money(invoice.balanceDue, invoice.currency || 'PHP')}`
      : `Paid ${money(invoice.paid, invoice.currency || 'PHP')}`,
    date: formatDate(invoice.issueDate),
    time: invoice.balanceDue > 0 ? 'Open' : 'Paid',
    tone: invoice.balanceDue > 0 ? 'orange' : 'green',
  }))
}

function activityIconFor(title: string) {
  const lowered = title.toLowerCase()
  if (lowered.includes('call') || lowered.includes('phone')) return Phone
  if (lowered.includes('invoice') || lowered.includes('payment')) return ReceiptText
  if (lowered.includes('contact')) return UserPlus
  if (lowered.includes('contract') || lowered.includes('signed')) return FileText
  return Activity
}

function OverviewTab({
  client,
  invoiceSummary,
  financialDisplay,
  projects,
  onLogActivity,
  onViewActivities,
}: {
  client: ClientRecord
  invoiceSummary: ClientInvoiceSummary
  financialDisplay: ClientFinancialDisplay
  projects: ProjectRecord[]
  onLogActivity: () => void
  onViewActivities: () => void
}) {
  const activities = buildDashboardActivities(client, invoiceSummary)
  const activeProjectCount = projects.length
    ? projects.filter(project => isActiveProject(project)).length
    : client.activeProjects
  const primaryContact = client.contacts.find(contact => contact.primary) || client.contacts[0]

  return (
    <div className="client-command-dashboard">
      <div className="client-overview-layout">
        <CommandCard
          title="Recent Activity"
          className="client-activity-card"
          action={<button type="button" className="client-card-action" onClick={onViewActivities}>View all</button>}
        >
          {activities.length ? (
            <>
              <div className="client-activity-timeline">
                {activities.map(activity => {
                  const Icon = activityIconFor(activity.title)
                  return (
                    <article key={activity.id} className="client-timeline-item">
                      <time className="client-timeline-date">{activity.date}</time>
                      <span className={`client-timeline-dot tone-${activity.tone}`} />
                      <span className={`client-timeline-icon tone-${activity.tone}`}><Icon size={16} /></span>
                      <div className="client-timeline-copy">
                        <strong>{activity.title}</strong>
                        <p>{activity.description}</p>
                      </div>
                      <span className="client-timeline-time">{activity.time}</span>
                    </article>
                  )
                })}
              </div>
              <button type="button" className="client-card-link" onClick={onViewActivities}>View all activities</button>
            </>
          ) : (
            <FriendlyEmptyState
              icon={Activity}
              title="No activities yet"
              description="Log calls, payments, meetings, and decisions so the team has a shared history."
              actionLabel="Log Activity"
              onAction={onLogActivity}
            />
          )}
        </CommandCard>

        <CommandCard title="Client Summary" className="client-summary-card">
          <div className="client-snapshot-list">
            <SnapshotItem icon={CalendarDays} label="Client Since" value={`${formatDate(client.createdAt)} (${clientAge(client.createdAt)})`} />
            <SnapshotItem icon={Clock3} label="Last Contact" value={client.lastContact || '-'} />
            <SnapshotItem icon={CalendarDays} label="Next Follow-up" value={nextFollowUpDate(client.lastContact || client.createdAt)} />
            <SnapshotItem icon={BriefcaseBusiness} label="Open Projects" value={activeProjectCount.toString()} />
            <SnapshotItem icon={ReceiptText} label="Outstanding Balance" value={formatDashboardMoney(financialDisplay.outstanding)} />
            <SnapshotItem icon={UserRound} label="Primary Contact" value={primaryContact?.name || 'No primary contact'} />
            <SnapshotItem icon={UsersRound} label="Account Manager / Owner" value={client.accountManager || 'Unassigned'} />
          </div>
        </CommandCard>
      </div>

      <AnalyticsDisclosure client={client} financialDisplay={financialDisplay} projects={projects} />
      <CompanyInformation client={client} />
    </div>
  )
}

function CommandCard({ title, children, action, className = '' }: { title: string; children: ReactNode; action?: ReactNode; className?: string }) {
  return (
    <section className={`client-command-card ${className}`.trim()}>
      <div className="client-card-header">
        <h2>{title}</h2>
        {action ? <div className="client-card-header-action">{action}</div> : null}
      </div>
      <div className="client-card-body">{children}</div>
    </section>
  )
}

function KpiCard({ icon: Icon, label, value, sub, tone = green }: { icon: typeof UsersRound; label: string; value: string; sub: string; tone?: string }) {
  return (
    <article className="client-kpi-card">
      <span className="client-kpi-icon" style={{ color: tone, background: `${tone}16` }}><Icon size={20} /></span>
      <div>
        <small>{label}</small>
        <strong>{value}</strong>
        <span>{sub}</span>
      </div>
    </article>
  )
}

function AnalyticsDisclosure({ client, financialDisplay, projects }: { client: ClientRecord; financialDisplay: ClientFinancialDisplay; projects: ProjectRecord[] }) {
  const [open, setOpen] = useState(false)
  const activeProjectCount = projects.length
    ? projects.filter(project => isActiveProject(project)).length
    : client.activeProjects
  const projectMetricCount = projects.length || client.totalProjects
  const primaryContactCount = client.contacts.filter(contact => contact.primary).length

  return (
    <section className={`client-analytics-disclosure ${open ? 'is-open' : ''}`}>
      <button type="button" className="client-disclosure-toggle" aria-expanded={open} onClick={() => setOpen(current => !current)}>
        <span><CircleDollarSign size={16} /> Analytics</span>
        <strong>{open ? 'Hide Analytics' : 'Show Analytics'}</strong>
        <ChevronDown size={16} />
      </button>
      {open ? (
        <div className="client-analytics-body">
          <div className="client-metric-strip" style={metricStrip}>
            <KpiCard icon={BriefcaseBusiness} label="Projects" value={projectMetricCount.toString()} sub={`${activeProjectCount} in progress`} />
            <KpiCard icon={CircleDollarSign} label="Revenue YTD" value={formatDashboardMoney(financialDisplay.total)} sub={financialDisplay.sourceLabel} />
            <KpiCard icon={ReceiptText} label="Outstanding" value={formatDashboardMoney(financialDisplay.outstanding)} sub={`${financialDisplay.unpaidCount} open invoice${financialDisplay.unpaidCount === 1 ? '' : 's'}`} tone="#f59e0b" />
            <KpiCard icon={UsersRound} label="Contacts" value={client.contacts.length.toString()} sub={`${primaryContactCount} primary contact${primaryContactCount === 1 ? '' : 's'}`} tone="#2563eb" />
            <KpiCard icon={CalendarDays} label="Client Since" value={formatDate(client.createdAt)} sub={clientAge(client.createdAt)} tone="#7c3aed" />
          </div>
        </div>
      ) : null}
    </section>
  )
}

function FriendlyEmptyState({ icon: Icon, title, description, actionLabel, href, onAction }: { icon: typeof UsersRound; title: string; description: string; actionLabel: string; href?: string; onAction?: () => void }) {
  const action = (
    <>
      <Plus size={15} />
      {actionLabel}
    </>
  )

  return (
    <div className="client-friendly-empty">
      <span><Icon size={22} /></span>
      <strong>{title}</strong>
      <p>{description}</p>
      {href ? <Link href={href}>{action}</Link> : <button type="button" onClick={onAction}>{action}</button>}
    </div>
  )
}

function ProgressBar({ value }: { value: number }) {
  return (
    <span className="client-progress" aria-label={`${value}% complete`}>
      <i style={{ width: `${Math.max(0, Math.min(value, 100))}%` }} />
    </span>
  )
}

function FinancialMetric({ label, value, sub, tone }: { label: string; value: string; sub: string; tone: 'success' | 'warning' | 'danger' }) {
  return (
    <div className={`client-financial-metric tone-${tone}`}>
      <small>{label}</small>
      <strong>{value}</strong>
      <span>{sub}</span>
    </div>
  )
}

function ClientProjectsTab({ client, projects, projectCreateHref }: { client: ClientRecord; projects: ProjectRecord[]; projectCreateHref: string }) {
  return (
    <div className="client-tab-stack">
      <ActiveProjectsCard client={client} projects={projects} projectCreateHref={projectCreateHref} />
    </div>
  )
}

function ActiveProjectsCard({ client, projects, projectCreateHref }: { client: ClientRecord; projects: ProjectRecord[]; projectCreateHref: string }) {
  const projectCards = buildClientProjectCards(client, projects)

  return (
    <CommandCard title="Active Projects" action={<Link href="/project-management/projects" className="client-card-action">View all</Link>}>
      {projectCards.length ? (
        <div className="client-project-list">
          {projectCards.map(project => (
            <article key={project.id} className="client-project-row">
              <span className={`client-project-icon tone-${project.tone}`}><BriefcaseBusiness size={16} /></span>
              <div className="client-project-main">
                <strong>{project.name}</strong>
                <small>{project.description}</small>
                <ProgressBar value={project.progress} />
              </div>
              <div className="client-project-meta">
                <span><small>Budget</small><strong>{formatDashboardMoney(project.budget)}</strong></span>
                <span><small>Due</small><strong>{project.dueDate}</strong></span>
                <b>{project.progress}%</b>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <FriendlyEmptyState
          icon={BriefcaseBusiness}
          title="No active projects"
          description="Create a project to track scope, budget, due dates, and delivery progress for this client."
          actionLabel="Add Project"
          href={projectCreateHref}
        />
      )}
      {projectCards.length ? <Link href="/project-management/projects" className="client-card-link">View all projects</Link> : null}
    </CommandCard>
  )
}

function FinancialOverviewCard({ financialDisplay, invoiceCreateHref }: { financialDisplay: ClientFinancialDisplay; invoiceCreateHref: string }) {
  const paidPercent = financialDisplay.total ? Math.round((financialDisplay.paid / financialDisplay.total) * 100) : 0
  const hasFinancialActivity = Boolean(financialDisplay.invoiceCount || financialDisplay.total || financialDisplay.outstanding)

  return (
    <CommandCard title="Financial Overview" action={<Link href={invoiceCreateHref} className="client-card-action"><Plus size={15} /> New invoice</Link>}>
      <div className="client-financial-overview">
        <div className="client-financial-metrics">
          <FinancialMetric label="Revenue" value={formatDashboardMoney(financialDisplay.total)} sub={financialDisplay.sourceLabel} tone="success" />
          <FinancialMetric label="Paid" value={formatDashboardMoney(financialDisplay.paid)} sub={`${Math.max(paidPercent, 0)}% collected`} tone="success" />
          <FinancialMetric label="Outstanding" value={formatDashboardMoney(financialDisplay.outstanding)} sub={`${financialDisplay.unpaidCount} open invoice${financialDisplay.unpaidCount === 1 ? '' : 's'}`} tone={financialDisplay.overdueCount ? 'danger' : 'warning'} />
        </div>
        <div className={hasFinancialActivity ? 'client-financial-status' : 'client-financial-status is-empty'}>
          <span><ReceiptText size={18} /></span>
          <div>
            <strong>{hasFinancialActivity ? `${paidPercent}% collected` : 'No invoice activity yet'}</strong>
            <p>{hasFinancialActivity ? "Track collection progress against this client's issued invoices." : 'Create an invoice to start tracking revenue, payments, and open balances.'}</p>
          </div>
        </div>
        {hasFinancialActivity ? (
          <>
            <div className="client-collection-bar" aria-label={`${paidPercent}% collected`}>
              <i style={{ width: `${Math.max(0, Math.min(paidPercent, 100))}%` }} />
            </div>
            <div className="client-financial-split">
              <span><small>Paid</small><strong>{formatDashboardMoney(financialDisplay.paid)}</strong></span>
              <span><small>Outstanding</small><strong>{formatDashboardMoney(financialDisplay.outstanding)}</strong></span>
            </div>
          </>
        ) : null}
      </div>
      <div className="client-invoice-total">
        <span>
          <small>Total invoices</small>
          <strong>{financialDisplay.invoiceCount}</strong>
        </span>
        <Link href="/accounting/invoices" className="client-card-action">Open register</Link>
      </div>
    </CommandCard>
  )
}

function ClientContactsTab({ client, contactCreateHref }: { client: ClientRecord; contactCreateHref: string }) {
  return (
    <div className="client-tab-stack">
      <CommandCard title="Key Contacts" action={client.contacts.length ? <Link href="/people/contacts" className="client-card-action">View all</Link> : null}>
        {client.contacts.length ? (
          <div className="client-contact-list">
            {client.contacts.slice(0, 4).map(contact => (
              <article key={contact.id} className="client-contact-row">
                <span className="client-contact-avatar">{contact.avatar || getInitials(contact.name)}</span>
                <div className="client-contact-copy">
                  <strong>{contact.name} {contact.primary ? <span className="client-primary-badge">Primary</span> : null}</strong>
                  <small>{contact.role || 'Client contact'}</small>
                </div>
                <div className="client-contact-methods">
                  <span>{contact.email}</span>
                  <span>{contact.phone}</span>
                </div>
                <div className="client-contact-actions">
                  <a href={`mailto:${contact.email}`} aria-label={`Email ${contact.name}`}><Mail size={16} /></a>
                  <a href={`tel:${phoneHref(contact.phone)}`} aria-label={`Call ${contact.name}`}><Phone size={16} /></a>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <FriendlyEmptyState
            icon={UserPlus}
            title="No contacts yet"
            description="Add a primary contact so your team knows who to reach."
            actionLabel="Add Contact"
            href={contactCreateHref}
          />
        )}
        {client.contacts.length ? <Link href="/people/contacts" className="client-card-link with-icon"><UserPlus size={15} /> Add contact</Link> : null}
      </CommandCard>
    </div>
  )
}

function CompanyInformation({ client }: { client: ClientRecord }) {
  const rows: [string, string][] = [
    ['Client Type', client.clientType || 'Commercial'],
    ['Industry', client.industry],
    ['Company Type', client.companyType],
    ['Company Size', client.companySize],
    ['Annual Revenue', client.annualRevenue],
    ['Tax ID / VAT', client.taxId],
    ['Billing Address', client.billingAddress],
    ['Default Currency', client.defaultCurrency],
    ['Payment Terms', client.paymentTerms],
    ['Tags', client.tags.join(', ') || '-'],
  ]

  return (
    <details className="client-company-info">
      <summary>
        <span><FileText size={16} /> Company Information</span>
        <ChevronDown size={16} />
      </summary>
      <div>
        <DetailsList rows={rows} />
      </div>
    </details>
  )
}

function EmptyTab({ tab, client }: { tab: string; client: ClientRecord }) {
  return (
    <section style={{ ...panel, minHeight: 280, display: 'grid', placeItems: 'center', textAlign: 'center' }}>
      <div>
        <div style={{ color: '#000000', marginBottom: 14 }}><FileText size={48} /></div>
        <h2 style={{ margin: 0, color: '#0f172a', fontSize: 18, fontWeight: 900 }}>No {tab.toLowerCase()} yet</h2>
        <p style={{ color: '#000000', fontSize: 14, margin: '8px 0 0' }}>{client.name} does not have {tab.toLowerCase()} records yet.</p>
      </div>
    </section>
  )
}

function ClientActivitiesTab({ client, onLogActivity }: { client: ClientRecord; onLogActivity: () => void }) {
  if (!client.activities.length) {
    return (
      <section style={panel}>
        <FriendlyEmptyState
          icon={Activity}
          title="No activities yet"
          description="Log calls, payments, meetings, and decisions so the team has a shared history."
          actionLabel="Log Activity"
          onAction={onLogActivity}
        />
      </section>
    )
  }

  return (
    <section style={panel}>
      <div className="client-card-header">
        <h2>All Activities</h2>
        <button type="button" className="client-card-action" onClick={onLogActivity}><Plus size={15} /> Log Activity</button>
      </div>
      <div className="client-activity-timeline">
        {client.activities.map(activity => {
          const Icon = activityIconFor(activity.title)
          return (
            <article key={activity.id} className="client-timeline-item">
              <time className="client-timeline-date">{activity.date}</time>
              <span className={`client-timeline-dot tone-${activity.tone}`} />
              <span className={`client-timeline-icon tone-${activity.tone}`}><Icon size={16} /></span>
              <div className="client-timeline-copy">
                <strong>{activity.title}</strong>
                <p>{activity.description}</p>
              </div>
              <span className="client-timeline-time">{activity.time}</span>
            </article>
          )
        })}
      </div>
    </section>
  )
}

function ClientInvoicesTab({
  invoiceSummary,
  financialDisplay,
  invoiceCreateHref,
}: {
  invoiceSummary: ClientInvoiceSummary
  financialDisplay: ClientFinancialDisplay
  invoiceCreateHref: string
}) {
  return (
    <div className="client-tab-stack client-invoices-tab">
      <FinancialOverviewCard financialDisplay={financialDisplay} invoiceCreateHref={invoiceCreateHref} />
      <CommandCard title="Invoices">
        {invoiceSummary.invoices.length ? (
          <>
            <div className="client-invoices-summary">
              <MiniMetric value={invoiceSummary.invoices.length} label="Total Invoices" />
              <MiniMetric value={invoiceSummary.paidCount} label="Paid" tone={green} />
              <MiniMetric value={invoiceSummary.unpaidCount} label="Unpaid" tone="#f97316" />
              <MiniMetric value={invoiceSummary.overdueCount} label="Overdue" tone="#ef4444" />
            </div>
            <div className="client-invoices-total-row">
              <DetailStat label="Total billed" value={formatPeso(invoiceSummary.totalBilled)} />
              <DetailStat label="Total paid" value={formatPeso(invoiceSummary.totalPaid)} />
              <DetailStat label="Outstanding" value={formatPeso(invoiceSummary.outstanding)} tone="#f97316" />
            </div>
            <div className="client-invoices-table-wrap">
              <table className="client-invoices-table">
                <thead>
                  <tr>
                    {['Invoice', 'Issue Date', 'Due Date', 'Amount', 'Paid', 'Balance', 'Status'].map(header => <th key={header}>{header}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {invoiceSummary.invoices.map(invoice => {
                    const status = invoiceDisplayStatus(invoice)
                    return (
                      <tr key={invoice.id}>
                        <td data-label="Invoice">
                          <strong>{invoice.number}</strong>
                          <small>{invoice.purchaseOrder ? `PO: ${invoice.purchaseOrder}` : invoice.email || 'No billing email'}</small>
                        </td>
                        <td data-label="Issue Date">{formatDate(invoice.issueDate)}</td>
                        <td data-label="Due Date">{formatDate(invoice.dueDate)}</td>
                        <td data-label="Amount">{money(invoice.amount, invoice.currency || 'PHP')}</td>
                        <td data-label="Paid">{money(invoice.paid, invoice.currency || 'PHP')}</td>
                        <td data-label="Balance">{money(invoice.balanceDue, invoice.currency || 'PHP')}</td>
                        <td data-label="Status"><InvoiceStatusBadge status={status} /></td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <FriendlyEmptyState
            icon={ReceiptText}
            title="No invoices yet"
            description="Create an invoice to track billed revenue, payments, and open balances for this client."
            actionLabel="New Invoice"
            href={invoiceCreateHref}
          />
        )}
      </CommandCard>
    </div>
  )
}

function DetailStat({ label, value, tone = '#0f172a' }: { label: string; value: string; tone?: string }) {
  return (
    <div className="client-invoices-detail-stat">
      <span>{label}</span>
      <strong style={{ color: tone }}>{value}</strong>
    </div>
  )
}

function InvoiceStatusBadge({ status }: { status: string }) {
  const normalized = status.toLowerCase()
  const tone = normalized === 'paid'
    ? { bg: '#dcfce7', color: '#15803d' }
    : normalized === 'overdue'
      ? { bg: '#fee2e2', color: '#dc2626' }
      : normalized === 'sent'
        ? { bg: '#dbeafe', color: '#2563eb' }
        : { bg: '#f1f5f9', color: '#000000' }

  return <span className="client-invoice-status" style={{ background: tone.bg, color: tone.color }}>{status}</span>
}

function DetailsList({ rows }: { rows: [string, string][] }) {
  return (
    <dl className="client-details-list" style={{ display: 'grid', gap: 12, margin: 0 }}>
      {rows.map(([label, value]) => (
        <div key={label} style={{ display: 'grid', gridTemplateColumns: '170px 1fr', gap: 18 }}>
          <dt style={muted}>{label}</dt>
          <dd style={{ margin: 0, color: '#0f172a', fontSize: 13, fontWeight: 800 }}>{value}</dd>
        </div>
      ))}
    </dl>
  )
}

function InfoPill({ icon: Icon, text, href, copyValue, external }: { icon: typeof Mail; text: string; href: string; copyValue: string; external?: boolean }) {
  return (
    <div className="client-info-pill" style={infoPill}>
      <a className="client-info-pill-link" href={href} target={external ? '_blank' : undefined} rel={external ? 'noreferrer' : undefined} style={infoPillLink}>
        <span style={tinyIcon}><Icon size={17} strokeWidth={1.9} /></span>
        <span>{text}</span>
      </a>
      <button type="button" className="client-info-copy" aria-label={`Copy ${text}`} onClick={() => copyToClipboard(copyValue)} style={copyButton}>
        <Copy size={14} />
      </button>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  return <span className="client-status-badge" style={{ padding: '4px 9px', borderRadius: 999, background: status === 'Active' ? '#dcfce7' : '#ffedd5', color: status === 'Active' ? '#15803d' : '#c2410c', fontSize: 12, fontWeight: 900 }}>{status}</span>
}

function MiniMetric({ value, label, tone = '#2563eb' }: { value: number; label: string; tone?: string }) {
  return (
    <div className="client-mini-metric" style={miniMetric}>
      <strong style={{ color: tone, fontSize: 20 }}>{value}</strong>
      <span style={muted}>{label}</span>
    </div>
  )
}

function SnapshotItem({ icon: Icon, label, value }: { icon: typeof UserRound; label: string; value: string }) {
  return (
    <div className="client-snapshot-item">
      <span><Icon size={16} /></span>
      <div>
        <small>{label}</small>
        <strong>{value}</strong>
      </div>
    </div>
  )
}

function formatDate(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' })
}

function formatDateObject(date: Date) {
  return date.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' })
}

function addMonthsFromToday(months: number) {
  const date = new Date()
  date.setMonth(date.getMonth() + months)
  return date.toISOString().slice(0, 10)
}

function nextFollowUpDate(value: string) {
  const parsed = looseDate(value)
  const next = parsed || new Date()
  next.setDate(next.getDate() + 7)
  return formatDateObject(next)
}

function looseDate(value: string) {
  const lowered = value.trim().toLowerCase()
  if (!lowered) return null
  if (lowered === 'today') return new Date()
  if (lowered === 'yesterday') {
    const date = new Date()
    date.setDate(date.getDate() - 1)
    return date
  }

  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

function formatDashboardMoney(value: number) {
  return formatPeso(value)
}

function clientAge(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'
  const months = Math.max(1, Math.round((Date.now() - date.getTime()) / 1000 / 60 / 60 / 24 / 30))
  if (months < 12) return `${months} month${months === 1 ? '' : 's'}`
  const years = Math.floor(months / 12)
  const remainingMonths = months % 12
  const yearLabel = `${years} year${years === 1 ? '' : 's'}`
  return remainingMonths ? `${yearLabel}, ${remainingMonths} month${remainingMonths === 1 ? '' : 's'}` : yearLabel
}

function websiteHref(value: string) {
  const trimmed = value.trim()
  if (!trimmed) return '#'
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`
}

function phoneHref(value: string) {
  return value.replace(/[^\d+]/g, '')
}

function mapsHref(value: string) {
  const query = encodeURIComponent(value.trim())
  return query ? `https://www.google.com/maps/search/?api=1&query=${query}` : '#'
}

function clientCreateHref(path: string, client: ClientRecord, extra: Record<string, string> = {}) {
  const params = new URLSearchParams()
  params.set('new', '1')
  params.set('clientId', client.id)
  params.set('clientName', client.name)
  if (client.company) params.set('company', client.company)
  if (client.email) params.set('email', client.email)
  if (client.phone) params.set('phone', client.phone)
  if (client.billingAddress) params.set('address', client.billingAddress)
  Object.entries(extra).forEach(([key, value]) => {
    const trimmed = value.trim()
    if (trimmed) params.set(key, trimmed)
  })
  return `${path}?${params.toString()}`
}

function clientBillingBlock(client: ClientRecord) {
  return [
    client.name,
    client.email ? `Email: ${client.email}` : '',
    client.phone ? `Phone: ${client.phone}` : '',
    client.taxId && client.taxId !== '-' ? `Tax ID: ${client.taxId}` : '',
    client.billingAddress ? `Address: ${client.billingAddress}` : '',
  ].filter(Boolean).join('\n')
}

async function copyToClipboard(value: string) {
  const text = value.trim()
  if (!text || typeof window === 'undefined') return

  try {
    await navigator.clipboard.writeText(text)
  } catch {
    const textarea = document.createElement('textarea')
    textarea.value = text
    textarea.style.position = 'fixed'
    textarea.style.opacity = '0'
    document.body.appendChild(textarea)
    textarea.select()
    document.execCommand('copy')
    document.body.removeChild(textarea)
  }
}

const clientDetailCss = `
.client-detail-page {
  --client-ink: #0f172a;
  --client-muted: #000000;
  --client-border: #dfe7ee;
  --client-soft: #f8fafc;
  padding-bottom: 42px;
}

.client-mobile-bar {
  display: none;
}

.client-actions button,
.client-tabs button,
.client-panel button {
  max-width: 100%;
}

.client-hero-card {
  align-items: stretch;
  position: relative;
}

.client-hero-copy {
  min-width: 0;
}

.client-hero-actions {
  position: absolute;
  top: 22px;
  right: 22px;
  z-index: 2;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.client-metrics-area {
  align-self: stretch;
  display: grid;
  align-content: end;
  padding-top: 58px;
}

.client-name {
  overflow-wrap: anywhere;
}

.client-info-pill {
  min-width: 0;
  padding: 0;
  overflow: hidden;
}

.client-info-pill-link > span:last-child {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.client-info-pill.is-wide .client-info-pill-link > span:last-child {
  white-space: normal;
  overflow-wrap: anywhere;
  line-height: 1.45;
}

.client-info-pill-link {
  min-width: 0;
  flex: 1;
}

.client-info-copy {
  flex: 0 0 auto;
}

.client-metric-strip {
  align-content: stretch;
}

.client-metric-card {
  min-width: 0;
  min-height: 104px;
}

.client-metric-card > div {
  margin-top: 10px;
}

.client-overview-grid {
  grid-template-columns: repeat(12, minmax(0, 1fr)) !important;
  align-items: start;
}

.client-panel {
  min-width: 0;
  min-height: 100%;
}

.client-panel-about {
  grid-column: span 4;
}

.client-panel-contacts {
  grid-column: span 4;
}

.client-panel-activity {
  grid-column: span 4;
}

.client-panel-projects,
.client-panel-invoices,
.client-panel-snapshot {
  grid-column: span 4;
}

.client-panel-notes {
  grid-column: span 8;
}

.client-details-list > div {
  align-items: start;
  padding: 9px 0;
  border-bottom: 1px solid #f1f5f9;
}

.client-details-list > div:last-child {
  border-bottom: 0;
}

.client-details-list dd {
  overflow-wrap: anywhere;
  line-height: 1.45;
  text-align: right;
}

.client-snapshot-list {
  display: grid;
  gap: 12px;
}

.client-snapshot-item {
  display: grid;
  grid-template-columns: 38px minmax(0, 1fr);
  gap: 12px;
  align-items: center;
  padding: 12px;
  border: 1px solid #eef2f7;
  border-radius: 12px;
  background: #fbfdff;
}

.client-snapshot-item > span {
  width: 38px;
  height: 38px;
  border-radius: 10px;
  display: grid;
  place-items: center;
  background: #dcfce7;
  color: #15803d;
}

.client-snapshot-item small {
  display: block;
  color: var(--client-muted);
  font-size: 12px;
  font-weight: 750;
}

.client-snapshot-item strong {
  display: block;
  margin-top: 3px;
  color: var(--client-ink);
  font-size: 13px;
  font-weight: 900;
  overflow-wrap: anywhere;
}

.client-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.client-tags span {
  border-radius: 999px;
  background: #f1f5f9;
  color: #334155;
  padding: 6px 10px;
  font-size: 12px;
  font-weight: 850;
}

.client-empty-message {
  display: grid;
  place-items: center;
  min-height: 132px;
  border: 1px dashed #dbe3ea;
  border-radius: 12px;
  background: #fbfdff;
}

.client-invoices-tab {
  display: grid;
  gap: 18px;
}

.client-invoices-summary {
  display: grid;
  grid-template-columns: repeat(4, minmax(130px, 1fr));
  gap: 12px;
}

.client-invoices-total-row {
  display: grid;
  grid-template-columns: repeat(3, minmax(160px, 1fr));
  gap: 12px;
}

.client-invoices-detail-stat {
  border: 1px solid #eef2f7;
  border-radius: 12px;
  background: #fbfdff;
  padding: 14px;
  display: grid;
  gap: 6px;
}

.client-invoices-detail-stat span {
  color: #000000;
  font-size: 12px;
  font-weight: 850;
}

.client-invoices-detail-stat strong {
  font-size: 20px;
  font-weight: 950;
}

.client-invoices-table-wrap {
  overflow-x: auto;
}

.client-invoices-table {
  width: 100%;
  min-width: 860px;
  border-collapse: collapse;
}

.client-invoices-table th {
  text-align: left;
  padding: 12px 14px;
  color: #000000;
  font-size: 11px;
  font-weight: 950;
}

.client-invoices-table td {
  padding: 14px;
  border-top: 1px solid #eef2f7;
  color: #0f172a;
  font-size: 13px;
  vertical-align: middle;
}

.client-invoices-table td strong {
  display: block;
  color: #0f172a;
  font-size: 13px;
  font-weight: 950;
}

.client-invoices-table td small {
  display: block;
  color: #000000;
  font-size: 12px;
  font-weight: 750;
  margin-top: 4px;
}

.client-invoice-status {
  display: inline-flex;
  min-height: 24px;
  align-items: center;
  border-radius: 7px;
  padding: 0 9px;
  font-size: 11.5px;
  font-weight: 950;
}

html[data-theme='dark'] .client-detail-page {
  --client-ink: var(--foreground);
  --client-muted: var(--muted-foreground);
  --client-border: var(--border);
  --client-soft: var(--secondary);
  color: var(--foreground);
  max-width: 1440px;
}

html[data-theme='dark'] .client-detail-page,
html[data-theme='dark'] .client-detail-page .client-overview-grid {
  background: transparent !important;
  background-color: transparent !important;
  background-image: none !important;
}

html[data-theme='dark'] .client-detail-page h1,
html[data-theme='dark'] .client-detail-page h2,
html[data-theme='dark'] .client-detail-page strong,
html[data-theme='dark'] .client-detail-page dd,
html[data-theme='dark'] .client-detail-page [style*='color: #020617'],
html[data-theme='dark'] .client-detail-page [style*='color: #0f172a'],
html[data-theme='dark'] .client-detail-page [style*='color:#0f172a'],
html[data-theme='dark'] .client-detail-page [style*='color: rgb(15, 23, 42)'],
html[data-theme='dark'] .client-detail-page [style*='color:rgb(15,23,42)'] {
  color: var(--foreground) !important;
}

html[data-theme='dark'] .client-detail-page p,
html[data-theme='dark'] .client-detail-page small,
html[data-theme='dark'] .client-detail-page dt,
html[data-theme='dark'] .client-detail-page .client-info-pill,
html[data-theme='dark'] .client-detail-page .client-empty-message,
html[data-theme='dark'] .client-detail-page [style*='color: #008b4a'],
html[data-theme='dark'] .client-detail-page [style*='color: #334155'],
html[data-theme='dark'] .client-detail-page [style*='color: #475569'],
html[data-theme='dark'] .client-detail-page [style*='color: #64748b'],
html[data-theme='dark'] .client-detail-page [style*='color: #cbd5e1'],
html[data-theme='dark'] .client-detail-page [style*='color: rgb(51, 65, 85)'],
html[data-theme='dark'] .client-detail-page [style*='color:rgb(51,65,85)'],
html[data-theme='dark'] .client-detail-page [style*='color: rgb(71, 85, 105)'],
html[data-theme='dark'] .client-detail-page [style*='color:rgb(71,85,105)'],
html[data-theme='dark'] .client-detail-page [style*='color: rgb(100, 116, 139)'],
html[data-theme='dark'] .client-detail-page [style*='color:rgb(100,116,139)'],
html[data-theme='dark'] .client-detail-page [style*='color: rgb(203, 213, 225)'],
html[data-theme='dark'] .client-detail-page [style*='color:rgb(203,213,225)'] {
  color: var(--muted-foreground) !important;
}

html[data-theme='dark'] .client-detail-page .client-hero-card,
html[data-theme='dark'] .client-detail-page .client-panel,
html[data-theme='dark'] .client-detail-page section,
html[data-theme='dark'] .client-detail-page [style*='background: #fff'],
html[data-theme='dark'] .client-detail-page [style*='background:#fff'] {
  background: var(--card) !important;
  border-color: var(--border) !important;
  box-shadow: none !important;
}

html[data-theme='dark'] .client-detail-page .client-hero-card {
  min-height: 240px;
  padding: 28px 20px 22px !important;
}

html[data-theme='dark'] .client-detail-page .client-title-row,
html[data-theme='dark'] .client-detail-page .client-title-row:hover {
  background: transparent !important;
  background-color: transparent !important;
}

html[data-theme='dark'] .client-detail-page .client-panel {
  padding: 20px !important;
}

html[data-theme='dark'] .client-detail-page .client-metric-card,
html[data-theme='dark'] .client-detail-page .client-snapshot-item,
html[data-theme='dark'] .client-detail-page .client-mini-metric,
html[data-theme='dark'] .client-detail-page [style*='border: 1px solid #dbe3ea'] {
  background: var(--secondary) !important;
  border: 1px solid var(--border) !important;
  border-radius: var(--radius-card) !important;
}

html[data-theme='dark'] .client-detail-page .client-mini-metric strong {
  color: var(--foreground) !important;
}

html[data-theme='dark'] .client-detail-page .client-metric-card {
  align-content: start !important;
  gap: 10px !important;
}

html[data-theme='dark'] .client-detail-page button:not(.client-tab-button),
html[data-theme='dark'] .client-detail-page a,
html[data-theme='dark'] .client-detail-page .client-status-badge,
html[data-theme='dark'] .client-detail-page .client-tags span,
html[data-theme='dark'] .client-detail-page .client-empty-message,
html[data-theme='dark'] .client-detail-page .client-snapshot-item,
html[data-theme='dark'] .client-detail-page .client-snapshot-item > span,
html[data-theme='dark'] .client-detail-page .client-hero-avatar,
html[data-theme='dark'] .client-detail-page .client-info-pill > span:first-child,
html[data-theme='dark'] .client-detail-page .client-metric-card > span,
html[data-theme='dark'] .client-detail-page [style*='background: #f1f5f9'],
html[data-theme='dark'] .client-detail-page [style*='background: #f8fafc'],
html[data-theme='dark'] .client-detail-page [style*='background: #fbfdff'],
html[data-theme='dark'] .client-detail-page [style*='background: #ede9fe'],
html[data-theme='dark'] .client-detail-page [style*='background: #e0f2fe'],
html[data-theme='dark'] .client-detail-page [style*='background: #dcfce7'],
html[data-theme='dark'] .client-detail-page [style*='background: #ffedd5'],
html[data-theme='dark'] .client-detail-page [style*='background: #e2e8f0'],
html[data-theme='dark'] .client-detail-page [style*='background: rgb(241, 245, 249)'],
html[data-theme='dark'] .client-detail-page [style*='background:rgb(241,245,249)'],
html[data-theme='dark'] .client-detail-page [style*='background: rgb(248, 250, 252)'],
html[data-theme='dark'] .client-detail-page [style*='background:rgb(248,250,252)'],
html[data-theme='dark'] .client-detail-page [style*='background: rgb(251, 253, 255)'],
html[data-theme='dark'] .client-detail-page [style*='background:rgb(251,253,255)'],
html[data-theme='dark'] .client-detail-page [style*='background: rgb(226, 232, 240)'],
html[data-theme='dark'] .client-detail-page [style*='background:rgb(226,232,240)'] {
  background: var(--secondary) !important;
  border-color: var(--border) !important;
  color: var(--foreground) !important;
  box-shadow: none !important;
}

html[data-theme='dark'] .client-detail-page .client-hero-actions button {
  background: var(--card) !important;
  border-color: var(--border) !important;
  color: var(--foreground) !important;
}

html[data-theme='dark'] .client-detail-page .client-metric-card > span,
html[data-theme='dark'] .client-detail-page .client-info-pill > span:first-child,
html[data-theme='dark'] .client-detail-page .client-info-pill-link > span:first-child,
html[data-theme='dark'] .client-detail-page .client-snapshot-item > span {
  width: 38px !important;
  height: 38px !important;
  border-radius: var(--radius-control) !important;
}

html[data-theme='dark'] .client-detail-page .client-info-pill-link,
html[data-theme='dark'] .client-detail-page .client-info-pill-link:hover,
html[data-theme='dark'] .client-detail-page .client-info-pill-link:focus-visible {
  background: transparent !important;
  color: var(--foreground) !important;
}

html[data-theme='dark'] .client-detail-page .client-info-copy {
  background: transparent !important;
  border-color: transparent !important;
  color: var(--muted-foreground) !important;
}

html[data-theme='dark'] .client-detail-page .client-info-copy:hover,
html[data-theme='dark'] .client-detail-page .client-info-copy:focus-visible {
  background: var(--card-hover) !important;
  color: var(--foreground) !important;
}

html[data-theme='dark'] .client-detail-page .client-metric-strip,
html[data-theme='dark'] .client-detail-page .client-metric-card,
html[data-theme='dark'] .client-detail-page .client-tabs,
html[data-theme='dark'] .client-detail-page .client-details-list > div,
html[data-theme='dark'] .client-detail-page [style*='border-left: 1px solid'],
html[data-theme='dark'] .client-detail-page [style*='border-right: 1px solid'],
html[data-theme='dark'] .client-detail-page [style*='border-bottom: 1px solid'],
html[data-theme='dark'] .client-detail-page [style*='border-top: 1px solid'] {
  border-color: var(--border) !important;
}

html[data-theme='dark'] .client-detail-page .client-tabs .client-tab-button {
  color: var(--muted-foreground) !important;
  background: transparent !important;
  background-color: transparent !important;
  background-image: none !important;
  border: 0 !important;
  border-radius: 0 !important;
  box-shadow: none !important;
}

html[data-theme='dark'] .client-detail-page .client-tabs .client-tab-button.is-active {
  color: var(--foreground) !important;
}

html[data-theme='dark'] .client-detail-page .client-tabs .client-tab-button.is-active::after {
  background: var(--foreground) !important;
}

html[data-theme='dark'] .client-detail-page .client-tabs .client-tab-button:hover,
html[data-theme='dark'] .client-detail-page .client-tabs .client-tab-button:focus-visible {
  background: transparent !important;
  background-color: transparent !important;
  background-image: none !important;
  border-radius: 0 !important;
  box-shadow: none !important;
  color: var(--foreground) !important;
}

html[data-theme='dark'] .client-detail-page .client-tabs .client-tab-button:hover::after,
html[data-theme='dark'] .client-detail-page .client-tabs .client-tab-button:focus-visible::after {
  background: var(--foreground) !important;
}

html[data-theme='dark'] .client-detail-page .client-tabs {
  gap: 24px !important;
  margin-top: 0;
  border-bottom-color: var(--border) !important;
}

html[data-theme='dark'] .client-detail-page .client-tabs .client-tab-button {
  padding-bottom: 14px !important;
  font-size: 14px !important;
  font-weight: 500 !important;
}

html[data-theme='dark'] .client-detail-page .client-panel h2 {
  margin-bottom: 20px !important;
  font-size: 16px !important;
  font-weight: 600 !important;
}

html[data-theme='dark'] .client-detail-page .client-empty-message {
  min-height: 170px;
  border-style: solid !important;
}

html[data-theme='dark'] .client-detail-page svg,
html[data-theme='dark'] .client-detail-page [style*='color: #0369a1'],
html[data-theme='dark'] .client-detail-page [style*='color: #15803d'],
html[data-theme='dark'] .client-detail-page [style*='color: #c2410c'],
html[data-theme='dark'] .client-detail-page [style*='color: #7c3aed'],
html[data-theme='dark'] .client-detail-page [style*='color: #2563eb'],
html[data-theme='dark'] .client-detail-page [style*='color: #f97316'],
html[data-theme='dark'] .client-detail-page [style*='color: #ef4444'],
html[data-theme='dark'] .client-detail-page [style*='color: rgb(3, 105, 161)'],
html[data-theme='dark'] .client-detail-page [style*='color:rgb(3,105,161)'],
html[data-theme='dark'] .client-detail-page [style*='color: rgb(21, 128, 61)'],
html[data-theme='dark'] .client-detail-page [style*='color:rgb(21,128,61)'] {
  color: var(--foreground) !important;
  stroke: currentColor !important;
}

html[data-theme='dark'] .client-detail-page [style*='background: #16a34a'],
html[data-theme='dark'] .client-detail-page [style*='background: #2563eb'],
html[data-theme='dark'] .client-detail-page [style*='background: #f59e0b'],
html[data-theme='dark'] .client-detail-page [style*='background: #e0f2fe'],
html[data-theme='dark'] .client-detail-page [style*='background: rgb(22, 163, 74)'],
html[data-theme='dark'] .client-detail-page [style*='background:rgb(22,163,74)'],
html[data-theme='dark'] .client-detail-page [style*='background: rgb(37, 99, 235)'],
html[data-theme='dark'] .client-detail-page [style*='background:rgb(37,99,235)'],
html[data-theme='dark'] .client-detail-page [style*='background: rgb(245, 158, 11)'],
html[data-theme='dark'] .client-detail-page [style*='background:rgb(245,158,11)'],
html[data-theme='dark'] .client-detail-page [style*='background: rgb(224, 242, 254)'],
html[data-theme='dark'] .client-detail-page [style*='background:rgb(224,242,254)'],
html[data-theme='dark'] .client-detail-page [style*='background: rgb(220, 252, 231)'],
html[data-theme='dark'] .client-detail-page [style*='background:rgb(220,252,231)'],
html[data-theme='dark'] .client-detail-page [style*='background: rgba(124, 58, 237'],
html[data-theme='dark'] .client-detail-page [style*='background:rgba(124,58,237'] {
  background: var(--secondary) !important;
  border-color: var(--border) !important;
  color: var(--foreground) !important;
}

@media (max-width: 1280px) {
  .client-hero-card {
    grid-template-columns: 1fr !important;
    padding-top: 74px !important;
  }

  .client-metric-strip {
    border-left: 0 !important;
    border-top: 1px solid #e2e8f0;
    padding-top: 14px;
  }

  .client-metrics-area {
    padding-top: 0;
  }

  .client-panel-about,
  .client-panel-contacts,
  .client-panel-activity,
  .client-panel-projects,
  .client-panel-invoices,
  .client-panel-snapshot,
  .client-panel-notes {
    grid-column: span 6;
  }
}

@media (max-width: 820px) {
  .client-detail-page {
    min-height: 100dvh;
    margin: 0 -16px;
    padding: 0 14px 30px !important;
    background: #f8fafc;
    gap: 14px !important;
  }

  .client-mobile-bar {
    position: sticky;
    top: 0;
    z-index: 30;
    display: grid;
    grid-template-columns: 40px minmax(0, 1fr) auto;
    align-items: center;
    gap: 10px;
    min-height: 60px;
    margin: 0 -14px;
    padding: 8px 14px;
    background: rgba(248, 250, 252, .94);
    border-bottom: 1px solid rgba(226, 232, 240, .92);
    backdrop-filter: blur(12px);
  }

  .client-mobile-bar a {
    width: 38px;
    height: 38px;
    border-radius: 999px;
    border: 1px solid #e2e8f0;
    background: #fff;
    color: #0f172a;
    display: grid;
    place-items: center;
    text-decoration: none;
    font-size: 26px;
    line-height: 1;
    font-weight: 750;
  }

  .client-mobile-bar > span {
    color: #0f172a;
    font-size: 15px;
    font-weight: 950;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .client-hero-card,
  .client-panel {
    border-radius: 22px !important;
    border-color: #edf2f7 !important;
    box-shadow: 0 16px 40px rgba(15, 23, 42, .06) !important;
  }

  .client-hero-card {
    padding: 16px !important;
    gap: 16px !important;
  }

  .client-hero-actions {
    position: static;
    width: 100%;
    display: grid !important;
    grid-template-columns: 1fr 1fr;
    order: -1;
  }

  .client-hero-main {
    grid-template-columns: 58px minmax(0, 1fr) !important;
    gap: 12px !important;
  }

  .client-hero-avatar {
    width: 56px !important;
    height: 56px !important;
    border-radius: 16px !important;
    font-size: 21px !important;
  }

  .client-title-row .client-status-badge {
    display: none;
  }

  .client-name {
    font-size: 25px !important;
    line-height: 1.05 !important;
  }

  .client-subtitle {
    font-size: 13px !important;
    margin-top: 5px !important;
  }

  .client-contact-grid {
    grid-template-columns: 1fr !important;
    gap: 9px !important;
    margin-top: 16px !important;
    grid-column: 1 / -1;
  }

  .client-info-pill {
    min-height: 40px;
    padding: 8px 10px;
    border: 1px solid #edf2f7;
    border-radius: 14px;
    background: #fbfdff;
  }

  .client-metric-strip {
    display: flex !important;
    gap: 10px;
    margin: 0 -16px;
    padding: 2px 16px 4px;
    overflow-x: auto;
    border-top: 0 !important;
    scrollbar-width: none;
    scroll-snap-type: x mandatory;
  }

  .client-metric-strip::-webkit-scrollbar {
    display: none;
  }

  .client-metric-card {
    min-width: 210px;
    border: 1px solid #edf2f7 !important;
    border-radius: 18px;
    background: #fff;
    padding: 12px !important;
    scroll-snap-align: start;
  }

  .client-tabs {
    position: sticky;
    top: 60px;
    z-index: 25;
    gap: 20px !important;
    margin: 0 -14px;
    padding: 0 14px;
    background: #f8fafc;
    border-bottom: 1px solid #e2e8f0 !important;
    scrollbar-width: none;
  }

  .client-tabs::-webkit-scrollbar {
    display: none;
  }

  .client-tabs button {
    padding-bottom: 12px !important;
  }

  .client-overview-grid {
    grid-template-columns: 1fr !important;
    gap: 14px !important;
  }

  .client-panel-about,
  .client-panel-contacts,
  .client-panel-activity,
  .client-panel-projects,
  .client-panel-invoices,
  .client-panel-snapshot,
  .client-panel-notes {
    grid-column: auto;
  }

  .client-panel {
    padding: 16px !important;
  }

  .client-invoices-summary,
  .client-invoices-total-row {
    grid-template-columns: 1fr !important;
  }

  .client-invoices-table-wrap {
    overflow: visible;
  }

  .client-invoices-table,
  .client-invoices-table thead,
  .client-invoices-table tbody,
  .client-invoices-table tr,
  .client-invoices-table td {
    display: block;
    width: 100%;
    min-width: 0;
  }

  .client-invoices-table thead {
    display: none;
  }

  .client-invoices-table tr {
    border: 1px solid #eef2f7;
    border-radius: 12px;
    margin-bottom: 12px;
    background: #fff;
    overflow: hidden;
  }

  .client-invoices-table td {
    border-top: 0;
    display: grid;
    grid-template-columns: 104px minmax(0, 1fr);
    gap: 10px;
    padding: 10px 12px;
    align-items: center;
  }

  .client-invoices-table td::before {
    content: attr(data-label);
    color: #000000;
    font-size: 11px;
    font-weight: 950;
    text-transform: uppercase;
  }

  .client-details-list {
    gap: 0 !important;
  }

  .client-details-list > div {
    grid-template-columns: 1fr !important;
    gap: 4px !important;
    padding: 11px 0;
  }

  .client-details-list dd {
    text-align: left;
    font-size: 14px !important;
  }
}

.client-command-center {
  --client-bg: #f8fafc;
  --client-card: #ffffff;
  --client-border: #e5e7eb;
  --client-text: #000000;
  --client-muted: #000000;
  --client-teal: #0f8f8c;
  --client-success: #16a34a;
  --client-warning: #f59e0b;
  --client-danger: #dc2626;
  display: grid !important;
  gap: 8px !important;
  color: var(--client-text);
}

.main-content:has(> .client-command-center) {
  background: var(--client-bg) !important;
}

.client-command-center .client-crumb-row {
  align-items: center;
  background: transparent !important;
  border: 0 !important;
  box-shadow: none !important;
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin: 0;
  min-height: 30px;
  padding: 0 !important;
}

.client-command-center .client-back-list-button {
  align-items: center;
  background: #ffffff;
  border: 1px solid #dbe3ef;
  border-radius: 8px;
  color: #0f172a;
  display: inline-flex;
  font-size: 13px;
  font-weight: 700;
  gap: 7px;
  min-height: 30px;
  padding: 0 10px;
  text-decoration: none;
  white-space: nowrap;
}

.client-command-center .client-crumbs {
  align-items: center;
  background: transparent !important;
  border: 0 !important;
  box-shadow: none !important;
  color: #334155;
  display: inline-flex;
  font-size: 13px;
  font-weight: 500;
  gap: 8px;
  line-height: 18px;
  margin: 0;
  min-height: 18px;
  padding: 0 !important;
  width: max-content;
}

.client-command-center .client-crumbs a {
  color: inherit;
  text-decoration: none;
}

.client-command-center .client-crumbs span {
  color: #000000;
}

.client-command-center .client-crumbs strong {
  color: inherit;
  font-size: inherit;
  font-weight: 500;
}

.client-command-center .client-hero-card {
  display: grid !important;
  grid-template-columns: 1fr !important;
  gap: 10px !important;
  padding: 14px !important;
  background: var(--client-card) !important;
  border: 1px solid var(--client-border) !important;
  border-radius: 8px !important;
  box-shadow: 0 8px 22px rgba(15, 23, 42, 0.04) !important;
}

.client-hero-topline {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 12px;
  align-items: start;
}

.client-command-center .client-hero-main {
  grid-template-columns: 64px minmax(0, 1fr) !important;
  gap: 14px !important;
}

.client-command-center .client-hero-avatar {
  width: 62px !important;
  height: 62px !important;
  border-radius: 8px !important;
  font-size: 24px !important;
  background: #ede9fe !important;
  color: #7c3aed !important;
}

.client-command-center .client-title-row {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  min-width: 0;
}

.client-command-center .client-name {
  color: var(--client-text) !important;
  font-size: 26px !important;
  line-height: 1.14 !important;
  font-weight: 700 !important;
}

.client-command-center .client-subtitle {
  color: #334155 !important;
  font-size: 14px !important;
  font-weight: 500 !important;
  margin: 4px 0 0 !important;
}

.client-command-center .client-status-badge,
.client-type-badge {
  display: inline-flex;
  align-items: center;
  min-height: 24px;
  border-radius: 999px;
  padding: 3px 9px;
  font-size: 12px;
  font-weight: 700;
  white-space: nowrap;
}

.client-type-badge {
  background: #f1f5f9;
  color: #334155;
}

.client-command-center .client-contact-grid {
  grid-template-columns: repeat(4, minmax(0, 1fr)) !important;
  gap: 10px !important;
  max-width: none !important;
  margin-top: 8px !important;
}

.client-command-center .client-info-pill {
  min-height: 28px !important;
  border: 0 !important;
  background: transparent !important;
  color: #334155 !important;
}

.client-command-center .client-info-pill-link {
  gap: 9px !important;
}

.client-command-center .client-info-pill-link > span:first-child {
  width: 18px !important;
  height: 18px !important;
  border-radius: 0 !important;
  background: transparent !important;
  color: #334155 !important;
}

.client-command-center .client-info-pill-link svg {
  stroke: currentColor;
}

.client-command-center .client-info-pill-link > span:last-child {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.client-command-center .client-info-copy {
  display: none !important;
}

.client-command-center .client-hero-actions {
  position: static !important;
  display: flex !important;
  align-items: center;
  justify-content: flex-end;
  gap: 8px !important;
  flex-wrap: wrap;
  width: auto !important;
}

.client-action-button {
  min-height: 36px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 0 13px;
  border: 1px solid var(--client-border);
  border-radius: 8px;
  background: #fff;
  color: var(--client-text);
  text-decoration: none;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  white-space: nowrap;
}

.client-action-button.is-primary {
  background: var(--client-teal);
  border-color: var(--client-teal);
  color: #fff;
  box-shadow: 0 10px 18px rgba(15, 143, 140, 0.18);
}

.client-command-center .client-detail-action-menu {
  justify-items: stretch !important;
  min-width: 190px !important;
}

.client-command-center .client-detail-action-menu .client-action-menu-item {
  align-items: center !important;
  display: grid !important;
  gap: 10px !important;
  grid-template-columns: 18px minmax(0, 1fr) !important;
  justify-content: start !important;
  justify-items: start !important;
  line-height: 1.2 !important;
  padding: 0 12px !important;
  text-align: left !important;
  width: 100% !important;
}

.client-command-center .client-detail-action-menu .client-action-menu-item svg {
  display: block;
  justify-self: center;
}

.client-command-center .client-detail-action-menu .client-action-menu-item span {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.client-command-center .client-metrics-area {
  padding-top: 0 !important;
}

.client-command-center .client-metric-strip {
  display: grid !important;
  grid-template-columns: repeat(5, minmax(0, 1fr)) !important;
  gap: 0 !important;
  border: 1px solid var(--client-border);
  border-radius: 8px;
  overflow: hidden;
  background: #fff;
}

.client-kpi-card {
  min-height: 64px;
  display: grid;
  grid-template-columns: 34px minmax(0, 1fr);
  gap: 8px;
  align-items: center;
  padding: 8px 12px;
  border-right: 1px solid var(--client-border);
}

.client-kpi-card:last-child {
  border-right: 0;
}

.client-kpi-icon {
  width: 32px;
  height: 32px;
  border-radius: 999px;
  display: grid;
  place-items: center;
}

.client-kpi-card small {
  display: block;
  color: var(--client-muted);
  font-size: 11px;
  font-weight: 700;
}

.client-kpi-card strong {
  display: block;
  margin-top: 3px;
  color: var(--client-text);
  font-size: 18px;
  line-height: 1.1;
  font-weight: 750;
  overflow-wrap: anywhere;
}

.client-kpi-card span:not(.client-kpi-icon) {
  display: block;
  margin-top: 4px;
  color: var(--client-muted);
  font-size: 11px;
  font-weight: 600;
}

.client-command-center .client-tabs {
  gap: 32px !important;
  margin-top: 0;
  border-bottom: 1px solid var(--client-border) !important;
}

.client-command-center .client-tabs .client-tab-button {
  background: transparent !important;
  border: 0 !important;
  border-radius: 0 !important;
  box-shadow: none !important;
  min-height: 42px !important;
  padding: 0 0 8px !important;
  color: #000000 !important;
  font-size: 14px !important;
  line-height: 20px !important;
  font-weight: 400 !important;
  letter-spacing: 0 !important;
  position: relative;
}

.client-command-center .client-tabs .client-tab-button.is-active,
.client-command-center .client-tabs .client-tab-button:hover,
.client-command-center .client-tabs .client-tab-button:focus-visible {
  background: transparent !important;
  border-radius: 0 !important;
  box-shadow: none !important;
  color: #000000 !important;
  font-weight: 500 !important;
}

.client-command-center .client-tabs .client-tab-button::after {
  background: transparent;
  bottom: -1px;
  content: "";
  height: 2px;
  left: 0;
  position: absolute;
  right: 0;
}

.client-command-center .client-tabs .client-tab-button.is-active::after,
.client-command-center .client-tabs .client-tab-button:hover::after,
.client-command-center .client-tabs .client-tab-button:focus-visible::after {
  background: #000000;
}

.client-command-dashboard {
  display: grid;
  gap: 8px;
}

.client-overview-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(300px, 380px);
  gap: 8px;
  align-items: start;
}

.client-tab-stack {
  display: grid;
  gap: 8px;
}

.client-analytics-disclosure {
  min-width: 0;
  background: #fff;
  border: 1px solid var(--client-border);
  border-radius: 8px;
  box-shadow: 0 8px 22px rgba(15, 23, 42, 0.035);
  overflow: hidden;
}

.client-disclosure-toggle {
  width: 100%;
  min-height: 44px;
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto auto;
  gap: 10px;
  align-items: center;
  border: 0;
  background: #fff;
  color: var(--client-text);
  cursor: pointer;
  padding: 0 14px;
  text-align: left;
}

.client-disclosure-toggle span {
  display: inline-flex;
  align-items: center;
  gap: 9px;
  min-width: 0;
  font-size: 14px;
  font-weight: 800;
}

.client-disclosure-toggle strong {
  color: var(--client-teal);
  font-size: 13px;
  font-weight: 800;
  white-space: nowrap;
}

.client-analytics-disclosure.is-open .client-disclosure-toggle svg:last-child {
  transform: rotate(180deg);
}

.client-analytics-body {
  padding: 0 14px 14px;
  border-top: 1px solid #eef2f7;
}

.client-analytics-body .client-metric-strip {
  margin-top: 14px;
}

.client-command-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(360px, 0.9fr);
  gap: 8px;
  align-items: stretch;
}

.client-lower-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.05fr) minmax(0, 0.95fr) minmax(340px, 1fr);
  gap: 8px;
}

.client-command-card {
  min-width: 0;
  background: #fff;
  border: 1px solid var(--client-border);
  border-radius: 8px;
  box-shadow: 0 8px 22px rgba(15, 23, 42, 0.035);
  padding: 14px;
}

.client-card-header {
  min-height: 24px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  margin-bottom: 10px;
}

.client-card-header h2 {
  margin: 0 !important;
  color: var(--client-text) !important;
  font-size: 16px !important;
  line-height: 1.25 !important;
  font-weight: 750 !important;
}

.client-card-body {
  display: grid;
  gap: 10px;
}

.client-filter-button,
.client-period-button,
.client-card-action,
.client-card-link {
  border: 0;
  background: transparent;
  color: var(--client-teal);
  font-size: 13px;
  font-weight: 750;
  text-decoration: none;
  display: inline-flex;
  align-items: center;
  gap: 7px;
  cursor: pointer;
}

.client-filter-button,
.client-period-button {
  color: var(--client-text);
}

.client-card-link {
  justify-self: center;
}

.client-card-link.with-icon {
  justify-self: start;
}

.client-activity-timeline {
  display: grid;
  gap: 0;
}

.client-timeline-item {
  display: grid;
  grid-template-columns: 72px 12px 34px minmax(0, 1fr) auto;
  gap: 9px;
  align-items: start;
  min-height: 44px;
  position: relative;
}

.client-timeline-item:not(:last-child)::after {
  content: "";
  position: absolute;
  left: 78px;
  top: 18px;
  bottom: -10px;
  width: 1px;
  background: #e2e8f0;
}

.client-timeline-date {
  color: var(--client-text);
  font-size: 12px;
  line-height: 1.3;
  font-weight: 700;
}

.client-timeline-dot {
  width: 7px;
  height: 7px;
  border-radius: 999px;
  margin-top: 8px;
  z-index: 1;
  background: var(--client-teal);
}

.client-timeline-icon {
  width: 30px;
  height: 30px;
  border-radius: 999px;
  display: grid;
  place-items: center;
  background: #ecfdf5;
  color: var(--client-success);
}

.tone-green { color: var(--client-success); }
.tone-blue { color: #2563eb; }
.tone-purple { color: #7c3aed; }
.tone-orange { color: var(--client-warning); }
.client-timeline-icon.tone-blue { background: #dbeafe; }
.client-timeline-icon.tone-purple { background: #f3e8ff; }
.client-timeline-icon.tone-orange { background: #ffedd5; }
.client-timeline-dot.tone-blue { background: #2563eb; }
.client-timeline-dot.tone-purple { background: #7c3aed; }
.client-timeline-dot.tone-orange { background: var(--client-warning); }

.client-timeline-copy strong {
  display: block;
  color: var(--client-text);
  font-size: 13px;
  font-weight: 750;
}

.client-timeline-copy p {
  margin: 3px 0 0;
  color: var(--client-muted);
  font-size: 13px;
  line-height: 1.35;
}

.client-timeline-time {
  color: #334155;
  font-size: 12px;
  font-weight: 700;
  white-space: nowrap;
}

.client-relationship-layout {
  display: grid;
  grid-template-columns: minmax(220px, 0.9fr) minmax(0, 1.1fr);
  gap: 14px;
  align-items: center;
}

.client-health-block {
  display: grid;
  justify-items: center;
  gap: 6px;
  padding: 8px 18px 8px 8px;
  border-right: 1px solid var(--client-border);
}

.client-health-gauge {
  width: 196px;
  height: 176px;
  position: relative;
  display: grid;
  place-items: center;
}

.client-health-gauge svg {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  overflow: visible;
}

.client-health-track,
.client-health-progress {
  fill: none;
  stroke-linecap: round;
  stroke-width: 12;
}

.client-health-track {
  stroke: #dfe7ed;
}

.client-health-progress {
  stroke: #56c86d;
}

.client-health-copy {
  position: relative;
  z-index: 1;
  display: grid;
  justify-items: center;
  align-content: center;
  transform: translateY(10px);
}

.client-health-copy strong {
  color: #0f8f8c;
  font-size: 34px;
  line-height: 1;
  font-weight: 800;
  letter-spacing: 0;
}

.client-health-copy span {
  margin-top: 9px;
  color: #0f8f8c;
  font-size: 14px;
  line-height: 1.1;
  font-weight: 800;
}

.client-health-copy small,
.client-snapshot-item small {
  color: var(--client-muted);
  font-size: 12px;
  font-weight: 700;
}

.client-snapshot-list {
  display: grid;
  gap: 0 !important;
}

.client-snapshot-item {
  display: grid;
  grid-template-columns: 34px minmax(0, 1fr);
  gap: 9px;
  align-items: center;
  padding: 7px 0;
  border: 0 !important;
  border-bottom: 1px solid #eef2f7 !important;
  border-radius: 0 !important;
  background: transparent !important;
}

.client-snapshot-item:last-child {
  border-bottom: 0 !important;
}

.client-snapshot-item > span {
  width: 30px !important;
  height: 30px !important;
  border-radius: 999px !important;
  display: grid;
  place-items: center;
  background: #ecfeff !important;
  color: var(--client-teal) !important;
}

.client-snapshot-item strong {
  display: block;
  margin-top: 2px;
  color: var(--client-text);
  font-size: 13px;
  font-weight: 750;
  overflow-wrap: anywhere;
}

.client-insight-banner {
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 34px;
  padding: 8px 10px;
  border: 1px solid #cbe8df;
  border-radius: 8px;
  background: #f0fdfa;
  color: #0f766e;
  font-size: 13px;
  font-weight: 650;
}

.client-project-list,
.client-contact-list {
  display: grid;
  gap: 8px;
}

.client-financial-metrics {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
}

.client-project-row {
  display: grid;
  grid-template-columns: 34px minmax(0, 1fr) auto;
  gap: 10px;
  align-items: center;
  padding: 9px;
  border: 1px solid #eef2f7;
  border-radius: 8px;
}

.client-project-icon {
  width: 30px;
  height: 30px;
  border-radius: 8px;
  display: grid;
  place-items: center;
  background: #ecfdf5;
}

.client-project-icon.tone-blue { background: #dbeafe; }
.client-project-icon.tone-purple { background: #f3e8ff; }

.client-project-main strong,
.client-contact-copy strong {
  display: block;
  color: var(--client-text);
  font-size: 13px;
  font-weight: 800;
}

.client-project-main small,
.client-contact-copy small {
  display: block;
  margin-top: 3px;
  color: var(--client-muted);
  font-size: 12px;
  font-weight: 650;
}

.client-progress {
  display: block;
  height: 7px;
  margin-top: 7px;
  border-radius: 999px;
  background: #e2e8f0;
  overflow: hidden;
}

.client-progress i {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: var(--client-teal);
}

.client-project-meta {
  display: grid;
  grid-template-columns: repeat(2, minmax(74px, auto)) 40px;
  gap: 10px;
  align-items: center;
  text-align: left;
}

.client-project-meta small {
  display: block;
  color: var(--client-muted);
  font-size: 11px;
  font-weight: 700;
}

.client-project-meta strong,
.client-project-meta b {
  display: block;
  color: var(--client-text);
  font-size: 12px;
  font-weight: 800;
}

.client-financial-overview {
  display: grid;
  gap: 10px;
  grid-template-columns: 1fr;
  align-items: stretch;
}

.client-financial-metric {
  background: #f8fafc;
  border: 1px solid #eef2f7;
  border-radius: 8px;
  display: grid;
  gap: 4px;
  align-content: start;
  min-height: 0;
  padding: 10px;
}

.client-financial-metric small {
  color: var(--client-muted);
  font-size: 11px;
  font-weight: 700;
}

.client-financial-metric strong {
  color: var(--client-text);
  font-size: 16px;
  font-weight: 800;
  overflow-wrap: anywhere;
}

.client-financial-metric span {
  color: var(--client-success);
  font-size: 12px;
  font-weight: 700;
}

.client-financial-metric.tone-warning span { color: var(--client-warning); }
.client-financial-metric.tone-danger span { color: var(--client-danger); }

.client-financial-status {
  align-items: center;
  background: #f8fafc;
  border: 1px solid #eef2f7;
  border-radius: 8px;
  display: grid;
  gap: 10px;
  grid-template-columns: 38px minmax(0, 1fr);
  min-height: 76px;
  padding: 10px;
}

.client-financial-status > span {
  align-items: center;
  background: #ecfdf5;
  border-radius: 999px;
  color: var(--client-teal);
  display: inline-flex;
  height: 34px;
  justify-content: center;
  width: 34px;
}

.client-financial-status.is-empty {
  border-style: dashed;
}

.client-financial-status strong {
  color: var(--client-text);
  display: block;
  font-size: 14px;
  font-weight: 800;
  line-height: 1.25;
}

.client-financial-status p {
  color: var(--client-muted);
  font-size: 12px;
  line-height: 1.4;
  margin: 3px 0 0;
}

.client-collection-bar {
  background: #e2e8f0;
  border-radius: 999px;
  height: 10px;
  overflow: hidden;
}

.client-collection-bar i {
  background: linear-gradient(90deg, #0f8f8c, #16a34a);
  border-radius: inherit;
  display: block;
  height: 100%;
  min-width: 0;
}

.client-financial-split {
  display: grid;
  gap: 8px;
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.client-financial-split span {
  background: #f8fafc;
  border: 1px solid #eef2f7;
  border-radius: 8px;
  display: grid;
  gap: 3px;
  padding: 9px 10px;
}

.client-financial-split small {
  color: var(--client-muted);
  font-size: 11px;
  font-weight: 800;
}

.client-financial-split strong {
  color: var(--client-text);
  font-size: 13px;
  font-weight: 850;
  overflow-wrap: anywhere;
}

.client-invoice-total {
  align-items: center;
  display: flex;
  gap: 12px;
  justify-content: space-between;
  border-top: 1px solid #eef2f7;
  padding-top: 10px;
  color: var(--client-muted);
  font-size: 13px;
  font-weight: 700;
}

.client-invoice-total > span {
  display: grid;
  gap: 2px;
}

.client-invoice-total small {
  color: var(--client-muted);
  font-size: 11px;
  font-weight: 800;
  text-transform: uppercase;
}

.client-invoice-total strong {
  color: var(--client-text);
  font-size: 20px;
}

.client-contact-row {
  display: grid;
  grid-template-columns: 36px minmax(0, 1fr) minmax(150px, auto) 56px;
  gap: 10px;
  align-items: center;
  padding: 7px 0;
}

.client-contact-avatar {
  width: 34px;
  height: 34px;
  border-radius: 999px;
  display: grid;
  place-items: center;
  background: #ecfdf5;
  color: #0f766e;
  font-size: 12px;
  font-weight: 800;
}

.client-primary-badge {
  display: inline-flex;
  margin-left: 6px;
  padding: 2px 7px;
  border-radius: 999px;
  background: #dcfce7;
  color: var(--client-success);
  font-size: 10px;
  font-weight: 800;
  vertical-align: middle;
}

.client-contact-methods {
  display: grid;
  gap: 3px;
  color: #334155;
  font-size: 12px;
  font-weight: 650;
}

.client-contact-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

.client-contact-actions a {
  width: 28px;
  height: 28px;
  display: grid;
  place-items: center;
  color: #334155;
  text-decoration: none;
}

.client-friendly-empty {
  min-height: 122px;
  display: grid;
  place-items: center;
  align-content: center;
  gap: 7px;
  padding: 16px;
  border: 1px dashed #cbd5e1;
  border-radius: 8px;
  background: #f8fafc;
  text-align: center;
}

.client-friendly-empty > span {
  width: 38px;
  height: 38px;
  display: grid;
  place-items: center;
  border-radius: 999px;
  background: #ecfdf5;
  color: var(--client-teal);
}

.client-friendly-empty strong {
  color: var(--client-text);
  font-size: 15px;
  font-weight: 800;
}

.client-friendly-empty p {
  max-width: 320px;
  margin: 0;
  color: var(--client-muted);
  font-size: 13px;
  line-height: 1.45;
}

.client-friendly-empty a,
.client-friendly-empty button {
  min-height: 36px;
  margin-top: 4px;
  display: inline-flex;
  align-items: center;
  gap: 7px;
  border: 1px solid var(--client-teal);
  border-radius: 8px;
  background: var(--client-teal);
  color: #fff;
  padding: 0 13px;
  text-decoration: none;
  font-size: 13px;
  font-weight: 750;
  cursor: pointer;
}

.client-company-info {
  border: 1px solid var(--client-border);
  border-radius: 8px;
  background: #fff;
  box-shadow: 0 8px 22px rgba(15, 23, 42, 0.035);
  overflow: hidden;
}

.client-company-info summary {
  min-height: 42px;
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 12px;
  align-items: center;
  padding: 0 14px;
  cursor: pointer;
  list-style: none;
}

.client-company-info summary::-webkit-details-marker {
  display: none;
}

.client-company-info summary > span {
  display: inline-flex;
  align-items: center;
  gap: 9px;
  color: var(--client-text);
  font-size: 14px;
  font-weight: 800;
}

.client-company-info summary small {
  color: var(--client-muted);
  font-size: 13px;
  font-weight: 650;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.client-company-info[open] summary svg:last-child {
  transform: rotate(180deg);
}

.client-company-info > div {
  display: grid;
  gap: 12px;
  padding: 14px;
  border-top: 1px solid #eef2f7;
}

.client-company-info .client-details-list {
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0 24px !important;
}

.client-company-info .client-details-list > div {
  grid-template-columns: minmax(130px, 0.7fr) minmax(0, 1fr) !important;
  gap: 14px !important;
}

.client-company-info .client-details-list dd {
  text-align: right;
}

html[data-theme='dark'] .client-detail-page .client-analytics-disclosure,
html[data-theme='dark'] .client-detail-page .client-company-info {
  background: var(--card) !important;
  border-color: var(--border) !important;
  box-shadow: none !important;
}

html[data-theme='dark'] .client-detail-page .client-disclosure-toggle {
  background: var(--card) !important;
  color: var(--foreground) !important;
}

html[data-theme='dark'] .client-detail-page .client-analytics-body,
html[data-theme='dark'] .client-detail-page .client-company-info > div {
  border-color: var(--border) !important;
}

@media (max-width: 1280px) {
  .client-command-grid,
  .client-lower-grid {
    grid-template-columns: 1fr 1fr;
  }

  .client-lower-grid .client-command-card:last-child {
    grid-column: 1 / -1;
  }

  .client-command-center .client-contact-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
  }
}

@media (max-width: 900px) {
  .client-hero-topline,
  .client-overview-layout,
  .client-command-grid,
  .client-lower-grid,
  .client-relationship-layout,
  .client-financial-overview {
    grid-template-columns: 1fr;
  }

  .client-command-center .client-hero-actions {
    justify-content: flex-start;
    flex-wrap: nowrap;
    overflow-x: auto;
    padding-bottom: 4px;
    scrollbar-width: none;
  }

  .client-command-center .client-hero-actions::-webkit-scrollbar {
    display: none;
  }

  .client-command-center .client-metric-strip {
    grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
  }

  .client-kpi-card {
    border-right: 1px solid var(--client-border);
    border-bottom: 1px solid var(--client-border);
  }

  .client-kpi-card:nth-child(2n) {
    border-right: 0;
  }

  .client-kpi-card:last-child {
    grid-column: 1 / -1;
    border-bottom: 0;
  }

  .client-health-block {
    border-right: 0;
    border-bottom: 1px solid var(--client-border);
    padding: 4px 0 18px;
  }

  .client-contact-row,
  .client-project-row {
    grid-template-columns: 40px minmax(0, 1fr);
  }

  .client-contact-methods,
  .client-contact-actions,
  .client-project-meta {
    grid-column: 2;
  }

  .client-project-meta {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .client-company-info .client-details-list {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 560px) {
  .client-command-center {
    margin: 0 -4px;
  }

  .client-command-center .client-crumb-row {
    display: none;
  }

  .client-command-center .client-hero-card,
  .client-command-card,
  .client-company-info {
    border-radius: 8px !important;
  }

  .client-command-center .client-hero-card {
    padding: 16px !important;
  }

  .client-command-center .client-hero-main {
    grid-template-columns: 58px minmax(0, 1fr) !important;
    gap: 12px !important;
  }

  .client-command-center .client-hero-avatar {
    width: 56px !important;
    height: 56px !important;
    font-size: 22px !important;
  }

  .client-command-center .client-name {
    font-size: 24px !important;
  }

  .client-command-center .client-contact-grid,
  .client-command-center .client-metric-strip {
    grid-template-columns: 1fr !important;
  }

  .client-kpi-card,
  .client-kpi-card:nth-child(2n),
  .client-kpi-card:last-child {
    grid-column: auto;
    border-right: 0;
    border-bottom: 1px solid var(--client-border);
  }

  .client-kpi-card:last-child {
    border-bottom: 0;
  }

  .client-timeline-item {
    grid-template-columns: 36px minmax(0, 1fr) auto;
  }

  .client-timeline-date,
  .client-timeline-dot,
  .client-timeline-item::after {
    display: none;
  }

  .client-project-meta {
    grid-template-columns: 1fr;
  }

  .client-company-info summary {
    grid-template-columns: minmax(0, 1fr) auto;
  }

  .client-company-info summary small {
    grid-column: 1 / -1;
    white-space: normal;
  }
}
`

const h1 = { margin: 0, color: '#020617', fontSize: 31, lineHeight: '37px', fontWeight: 600, letterSpacing: 0 }
const primaryLink = { display: 'inline-flex', alignItems: 'center', height: 40, padding: '0 16px', borderRadius: 8, background: green, color: '#fff', textDecoration: 'none', fontSize: 13, fontWeight: 600 }
const secondaryButton = { display: 'inline-flex', alignItems: 'center', gap: 8, height: 40, padding: '0 14px', borderRadius: 8, border: '1px solid #dbe3ea', background: '#fff', color: '#0f172a', fontSize: 13, fontWeight: 600, cursor: 'pointer' }
const primaryButton = { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, height: 40, padding: '0 16px', borderRadius: 8, border: '1px solid var(--foreground)', background: 'var(--foreground)', color: 'var(--background)', fontSize: 13, fontWeight: 600, cursor: 'pointer' }
const actionMenu = { position: 'absolute' as const, top: 'calc(100% + 8px)', right: 0, zIndex: 40, minWidth: 190, padding: 6, border: '1px solid var(--border)', borderRadius: 8, background: 'var(--popover)', color: 'var(--popover-foreground)', boxShadow: '0 18px 40px rgba(0,0,0,.24)', display: 'grid', gap: 2 }
const actionMenuItem = { width: '100%', minHeight: 36, border: 'none', borderRadius: 6, background: 'transparent', color: 'var(--popover-foreground)', display: 'flex', alignItems: 'center', gap: 9, padding: '0 10px', fontSize: 13, fontWeight: 500, textAlign: 'left' as const, textDecoration: 'none', cursor: 'pointer', fontFamily: font }
const modalBackdrop = { position: 'fixed' as const, inset: 0, zIndex: 1000, display: 'grid', placeItems: 'center', padding: 20, background: 'rgba(0,0,0,.72)' }
const modalCard = { position: 'relative' as const, zIndex: 1001, width: 'min(640px, 100%)', display: 'grid', gap: 20, padding: 22, border: '1px solid var(--border)', borderRadius: 12, background: 'var(--card)', color: 'var(--foreground)', boxShadow: '0 24px 80px rgba(0,0,0,.42)' }
const modalGrid = { display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 14 }
const modalField = { display: 'grid', gap: 8, color: 'var(--foreground)', fontSize: 13, fontWeight: 600 }
const modalInput = { width: '100%', height: 42, border: '1px solid var(--input-border)', borderRadius: 8, background: 'var(--input)', color: 'var(--foreground)', padding: '0 12px', fontSize: 13, fontFamily: font, outline: 'none', boxSizing: 'border-box' as const }
const iconCloseButton = { height: 32, border: '1px solid var(--border)', borderRadius: 8, background: 'transparent', color: 'var(--foreground)', padding: '0 10px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }
const heroCard = { display: 'grid', gridTemplateColumns: 'minmax(620px, 1fr) minmax(620px, 1.1fr)', gap: 18, background: '#fff', border: '1px solid #dfe7ee', borderRadius: 8, padding: 22, boxShadow: '0 10px 24px rgba(15,23,42,.04)' }
const clientHero = { display: 'grid', gridTemplateColumns: '72px minmax(0, 1fr)', gap: 18, alignItems: 'flex-start' }
const heroAvatar = (photo?: string) => ({
  width: 64,
  height: 64,
  borderRadius: 12,
  background: photo ? '#f8fafc' : '#ede9fe',
  backgroundImage: photo ? `url(${photo})` : undefined,
  backgroundSize: 'cover',
  backgroundPosition: 'center',
  color: photo ? 'transparent' : '#7c3aed',
  display: 'grid',
  placeItems: 'center',
  fontSize: 24,
  fontWeight: 600,
  overflow: 'hidden',
})
const contactGrid = { display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 12, marginTop: 28, maxWidth: 610 }
const infoPill = { minHeight: 52, display: 'flex', alignItems: 'center', gap: 8, color: '#000000', fontSize: 13, fontWeight: 700, minWidth: 0, padding: '0 8px 0 14px', border: '1px solid #eef2f7', borderRadius: 8, background: '#fbfdff' }
const infoPillLink = { display: 'flex', alignItems: 'center', gap: 12, minWidth: 0, color: 'inherit', textDecoration: 'none' }
const copyButton = { width: 30, height: 30, display: 'grid', placeItems: 'center', border: '1px solid transparent', borderRadius: 7, background: 'transparent', color: 'var(--muted-foreground)', cursor: 'pointer', padding: 0 }
const tinyIcon = { width: 18, height: 18, borderRadius: 0, background: 'transparent', color: '#334155', display: 'grid', placeItems: 'center', flex: '0 0 auto' }
const metricStrip = { display: 'grid', gridTemplateColumns: 'repeat(4, minmax(140px, 1fr))', gap: 8, alignItems: 'stretch' }
const tabsWrap = { display: 'flex', gap: 32, borderBottom: '1px solid #dbe3ea', overflowX: 'auto' as const }
const tabButton = (active: boolean) => ({ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '0 0 14px', border: 'none', borderRadius: 0, boxShadow: 'none', background: 'transparent', color: active ? 'var(--foreground)' : '#0f172a', fontSize: 13, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' as const })
const panel = { background: '#fff', border: '1px solid #dfe7ee', borderRadius: 8, padding: 22, boxShadow: '0 10px 24px rgba(15,23,42,.04)' }
const muted = { color: '#000000', fontSize: 13, fontWeight: 600 }
const miniMetric = { minHeight: 74, border: '1px solid #dbe3ea', borderRadius: 10, display: 'grid', placeItems: 'center', textAlign: 'center' as const, padding: 10 }
