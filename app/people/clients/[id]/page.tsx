'use client'

import Link from 'next/link'
import { useParams } from 'next/navigation'
import { BriefcaseBusiness, CalendarDays, CircleDollarSign, Copy, FileText, Globe2, Mail, MapPin, MoreHorizontal, Pencil, Phone, StickyNote, UserRound, UsersRound } from 'lucide-react'
import type { FormEvent, ReactNode } from 'react'
import { useEffect, useMemo, useState } from 'react'
import { ClientRecord, findClient, formatPeso, getInitials, saveClient } from '../clientData'
import { type AccountingInvoice, isOverdue, loadAccountingData, money, subscribeAccountingData } from '@/lib/accounting/data'

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
  const [editForm, setEditForm] = useState({ name: '', email: '', phone: '', website: '', billingAddress: '' })
  const [invoices, setInvoices] = useState<AccountingInvoice[]>([])

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

  const clientFinancials = useMemo(() => client ? buildClientFinancials(client, invoices) : emptyClientInvoiceSummary(), [client, invoices])

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

  return (
    <div className="client-detail-page" style={{ fontFamily: font, display: 'grid', gap: 20 }}>
      <style>{clientDetailCss}</style>
      <div className="client-mobile-bar">
        <Link href="/people/clients" aria-label="Back to clients">‹</Link>
        <span>Client Details</span>
        <StatusBadge status={client.status} />
      </div>
      <div className="client-page-header" style={pageHeader}>
        <div>
          <div className="client-breadcrumb" style={breadcrumb}>Home / Client Database / {client.name}</div>
        </div>
      </div>

      <section className="client-hero-card" style={heroCard}>
        <div className="client-actions client-hero-actions" style={{ display: 'flex', gap: 10 }}>
          <button type="button" style={secondaryButton} onClick={() => setEditing(true)}><Pencil size={16} /> Edit Client</button>
          <div className="client-more-wrap" style={{ position: 'relative' }}>
            <button type="button" aria-expanded={moreOpen} style={secondaryButton} onClick={() => setMoreOpen(open => !open)}><MoreHorizontal size={16} /> More</button>
            {moreOpen ? (
              <div className="client-detail-action-menu" style={actionMenu}>
                <a href={`mailto:${client.email}`} style={actionMenuItem} onClick={() => setMoreOpen(false)}><Mail size={14} /> Email client</a>
                <button type="button" style={actionMenuItem} onClick={() => { copyToClipboard(client.email); setMoreOpen(false) }}><Copy size={14} /> Copy email</button>
                <button type="button" style={actionMenuItem} onClick={() => { copyToClipboard(`${window.location.origin}/people/clients/${client.id}`); setMoreOpen(false) }}><Copy size={14} /> Copy profile link</button>
                <Link href="/people/clients" style={actionMenuItem} onClick={() => setMoreOpen(false)}><UsersRound size={14} /> Client Database</Link>
              </div>
            ) : null}
          </div>
        </div>
        <div className="client-hero-main" style={clientHero}>
          <span className="client-hero-avatar" style={heroAvatar(client.photo)}>{!client.photo && getInitials(client.name)}</span>
          <div className="client-hero-copy">
            <div className="client-title-row" style={{ display: 'grid', justifyItems: 'start', gap: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                <h1 className="client-name" style={h1}>{client.name}</h1>
                <StatusBadge status={client.status} />
              </div>
            </div>
            <p className="client-subtitle" style={subtitle}>{client.industry} Solutions & Services</p>
            <div className="client-contact-grid" style={contactGrid}>
              <InfoPill icon={Mail} text={client.email} href={`mailto:${client.email}`} copyValue={client.email} />
              <InfoPill icon={Phone} text={client.phone} href={`tel:${phoneHref(client.phone)}`} copyValue={client.phone} />
              <InfoPill icon={Globe2} text={client.website || client.company} href={websiteHref(client.website || client.company)} copyValue={client.website || client.company} external />
              <InfoPill icon={MapPin} text={client.billingAddress} href={mapsHref(client.billingAddress)} copyValue={client.billingAddress} external />
            </div>
          </div>
        </div>
        <div className="client-metrics-area">
          <div className="client-metric-strip" style={metricStrip}>
            <Metric icon={BriefcaseBusiness} label="Total Projects" value={client.totalProjects.toString()} sub={`Active: ${client.activeProjects}`} />
            <Metric icon={CircleDollarSign} label="Total Revenue" value={formatPeso(clientFinancials.totalBilled)} sub="Lifetime Value" />
            <Metric icon={CircleDollarSign} label="Outstanding" value={formatPeso(clientFinancials.outstanding)} sub={`${clientFinancials.unpaidCount} invoices`} tone="#f97316" />
            <Metric icon={CalendarDays} label="Client Since" value={formatDate(client.createdAt)} sub={clientAge(client.createdAt)} tone="#2563eb" />
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

      {activeTab === 'Overview' ? <OverviewTab client={client} invoiceSummary={clientFinancials} /> : null}
      {activeTab === 'Invoices' ? <ClientInvoicesTab client={client} invoiceSummary={clientFinancials} /> : null}
      {activeTab !== 'Overview' && activeTab !== 'Invoices' ? <EmptyTab tab={activeTab} client={client} /> : null}

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

function OverviewTab({ client, invoiceSummary }: { client: ClientRecord; invoiceSummary: ClientInvoiceSummary }) {
  const isResidential = isResidentialClient(client)

  return (
    <div className="client-overview-grid" style={overviewGrid}>
      <Panel title={`About ${client.name}`} footer="Show more" className="client-panel-about">
        <p style={bodyText}>{client.description}</p>
        <DetailsList
          rows={isResidential ? [
            ['Client Type', 'Residential'],
            ['Property Type', client.companyType],
            ['Project Category', client.industry],
            ['Property Address', client.billingAddress],
            ['Account Manager', client.accountManager],
          ] : [
            ['Client Type', 'Commercial'],
            ['Industry', client.industry],
            ['Company Size', client.companySize],
            ['Company Type', client.companyType],
            ['Annual Revenue', client.annualRevenue],
            ['Tax ID / VAT', client.taxId],
            ['Billing Address', client.billingAddress],
          ]}
        />
      </Panel>

      <Panel title="Key Contacts" footer="View all contacts" className="client-panel-contacts">
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

      <Panel title="Recent Activities" footer="View all" className="client-panel-activity">
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

      <Panel title="Project Summary" footer="View all projects" className="client-panel-projects">
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

      <Panel title="Invoice Summary" footer="View all invoices" className="client-panel-invoices">
        <div className="client-invoice-boxes" style={invoiceBoxes}>
          <MiniMetric value={invoiceSummary.invoices.length} label="Total Invoices" />
          <MiniMetric value={invoiceSummary.paidCount} label="Paid" tone={green} />
          <MiniMetric value={invoiceSummary.unpaidCount} label="Unpaid" />
          <MiniMetric value={invoiceSummary.overdueCount} label="Overdue" tone="#ef4444" />
        </div>
        <DetailsList
          rows={[
            ['Total Billed', formatPeso(invoiceSummary.totalBilled)],
            ['Total Paid', formatPeso(invoiceSummary.totalPaid)],
            ['Outstanding', formatPeso(invoiceSummary.outstanding)],
          ]}
        />
      </Panel>

      <Panel title="Relationship Snapshot" className="client-panel-snapshot">
        <div className="client-snapshot-list">
          <SnapshotItem icon={UserRound} label="Account Manager" value={client.accountManager || '-'} />
          <SnapshotItem icon={CalendarDays} label="Last Contact" value={client.lastContact || '-'} />
          <SnapshotItem icon={CircleDollarSign} label="Payment Terms" value={client.paymentTerms || '-'} />
          <SnapshotItem icon={FileText} label="Default Currency" value={client.defaultCurrency || '-'} />
        </div>
        {client.tags.length ? <div className="client-tags">{client.tags.map(tag => <span key={tag}>{tag}</span>)}</div> : null}
      </Panel>

      <Panel title="Notes" footer="Add note" className="client-panel-notes">
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

function ClientInvoicesTab({ client, invoiceSummary }: { client: ClientRecord; invoiceSummary: ClientInvoiceSummary }) {
  if (!invoiceSummary.invoices.length) {
    return <EmptyTab tab="Invoices" client={client} />
  }

  return (
    <section className="client-invoices-tab" style={panel}>
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
    </section>
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
        : { bg: '#f1f5f9', color: '#475569' }

  return <span className="client-invoice-status" style={{ background: tone.bg, color: tone.color }}>{status}</span>
}

function Panel({ title, children, footer, className = '' }: { title: string; children: ReactNode; footer?: string; className?: string }) {
  return (
    <section className={`client-panel ${className}`.trim()} style={panel}>
      <h2 style={panelTitle}>{title}</h2>
      <div className="client-panel-body" style={{ display: 'grid', gap: 18 }}>{children}</div>
      {footer ? <button style={footerLink}>{footer}</button> : null}
    </section>
  )
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

function Metric({ icon: Icon, label, value, sub, tone = green }: { icon: typeof UsersRound; label: string; value: string; sub: string; tone?: string }) {
  return (
    <div className="client-metric-card" style={metricCard}>
      <span style={metricIcon(tone)}><Icon size={19} /></span>
      <div>
        <div style={muted}>{label}</div>
        <div style={{ color: '#0f172a', fontSize: 18, fontWeight: 900, marginTop: 4 }}>{value}</div>
        <div style={{ color: '#64748b', fontSize: 12, marginTop: 5 }}>{sub}</div>
      </div>
    </div>
  )
}

function InfoPill({ icon: Icon, text, href, copyValue, external }: { icon: typeof Mail; text: string; href: string; copyValue: string; external?: boolean }) {
  return (
    <div className="client-info-pill" style={infoPill}>
      <a className="client-info-pill-link" href={href} target={external ? '_blank' : undefined} rel={external ? 'noreferrer' : undefined} style={infoPillLink}>
        <span style={tinyIcon}><Icon size={15} /></span>
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
  return <div className="client-empty-message" style={{ padding: '30px 0', color: '#64748b', fontSize: 13, fontWeight: 700, textAlign: 'center' }}>{text}</div>
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

function clientAge(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'
  const months = Math.max(1, Math.round((Date.now() - date.getTime()) / 1000 / 60 / 60 / 24 / 30))
  if (months < 12) return `${months} months`
  const years = Math.floor(months / 12)
  return `${years} year${years > 1 ? 's' : ''}, ${months % 12} months`
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

function percent(value: number, total: number) {
  if (!total) return 0
  return Math.round((value / total) * 100)
}

const clientDetailCss = `
.client-detail-page {
  --client-ink: #0f172a;
  --client-muted: #64748b;
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
  color: #64748b;
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
  color: #64748b;
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
  color: #64748b;
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
html[data-theme='dark'] .client-detail-page .client-page-header,
html[data-theme='dark'] .client-detail-page .client-page-header *,
html[data-theme='dark'] .client-detail-page .client-breadcrumb,
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
html[data-theme='dark'] .client-detail-page .client-breadcrumb,
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
html[data-theme='dark'] .client-detail-page [style*='background:rgb(226,232,240)'],
html[data-theme='dark'] .client-detail-page [style*='background: conic-gradient'] {
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
  box-shadow: none !important;
  border-bottom-color: transparent !important;
}

html[data-theme='dark'] .client-detail-page .client-tabs .client-tab-button.is-active {
  color: var(--foreground) !important;
  border-bottom-color: var(--foreground) !important;
}

html[data-theme='dark'] .client-detail-page .client-tabs .client-tab-button:hover,
html[data-theme='dark'] .client-detail-page .client-tabs .client-tab-button:focus-visible {
  background: transparent !important;
  background-color: transparent !important;
  background-image: none !important;
  box-shadow: none !important;
  color: var(--foreground) !important;
  border-bottom-color: var(--foreground) !important;
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

  .client-page-header {
    display: none !important;
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
    color: #64748b;
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
`

const pageHeader = { display: 'flex', justifyContent: 'space-between', gap: 20, alignItems: 'flex-start', flexWrap: 'wrap' as const }
const breadcrumb = { fontSize: 13, color: '#008b4a', fontWeight: 500 }
const h1 = { margin: 0, color: '#020617', fontSize: 31, lineHeight: '37px', fontWeight: 600, letterSpacing: 0 }
const subtitle = { margin: '8px 0 0', color: '#475569', fontSize: 14, fontWeight: 600 }
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
const infoPill = { minHeight: 52, display: 'flex', alignItems: 'center', gap: 8, color: '#475569', fontSize: 13, fontWeight: 700, minWidth: 0, padding: '0 8px 0 14px', border: '1px solid #eef2f7', borderRadius: 8, background: '#fbfdff' }
const infoPillLink = { display: 'flex', alignItems: 'center', gap: 12, minWidth: 0, color: 'inherit', textDecoration: 'none' }
const copyButton = { width: 30, height: 30, display: 'grid', placeItems: 'center', border: '1px solid transparent', borderRadius: 7, background: 'transparent', color: 'var(--muted-foreground)', cursor: 'pointer', padding: 0 }
const tinyIcon = { width: 28, height: 28, borderRadius: 8, background: '#f1f5f9', color: '#64748b', display: 'grid', placeItems: 'center', flex: '0 0 auto' }
const metricStrip = { display: 'grid', gridTemplateColumns: 'repeat(4, minmax(140px, 1fr))', gap: 8, alignItems: 'stretch' }
const metricCard = { display: 'grid', gridTemplateRows: '38px auto', gap: 10, alignContent: 'start', padding: '18px 14px 12px', border: '1px solid #e2e8f0', borderRadius: 8, minWidth: 0 }
const metricIcon = (color: string) => ({ width: 38, height: 38, borderRadius: 8, background: `${color}16`, color, display: 'grid', placeItems: 'center', flex: '0 0 auto' })
const tabsWrap = { display: 'flex', gap: 32, borderBottom: '1px solid #dbe3ea', overflowX: 'auto' as const }
const tabButton = (active: boolean) => ({ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '0 0 14px', border: 'none', borderBottom: `2px solid ${active ? 'var(--foreground)' : 'transparent'}`, background: 'transparent', color: active ? 'var(--foreground)' : '#0f172a', fontSize: 13, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' as const })
const overviewGrid = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 18 }
const panel = { background: '#fff', border: '1px solid #dfe7ee', borderRadius: 8, padding: 22, boxShadow: '0 10px 24px rgba(15,23,42,.04)' }
const panelTitle = { margin: '0 0 18px', color: '#0f172a', fontSize: 16, fontWeight: 600 }
const bodyText = { color: '#334155', fontSize: 13, lineHeight: 1.65, margin: 0 }
const muted = { color: '#64748b', fontSize: 13, fontWeight: 600 }
const footerLink = { justifySelf: 'start', marginTop: 18, border: 'none', background: 'transparent', padding: 0, color: '#0f8a4b', fontSize: 13, fontWeight: 600, cursor: 'pointer' }
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
