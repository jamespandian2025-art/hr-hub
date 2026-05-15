'use client'

import Link from 'next/link'
import type { ReactNode } from 'react'
import { ChevronDown, CircleDollarSign, Filter, Grid3X3, LayoutList, MoreHorizontal, Search, Upload, UserCheck, UserMinus, UserPlus, UsersRound } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { ClientLoadResult, ClientRecord, formatPeso, getInitials, loadClients } from './clientData'

const font = 'var(--font-body)'
const green = '#16a34a'

export default function ClientsPage() {
  const [clients, setClients] = useState<ClientRecord[]>([])
  const [loadState, setLoadState] = useState<ClientLoadResult>({ clients: [], source: 'unavailable' })
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('All Status')
  const [industryFilter, setIndustryFilter] = useState('All Industry')
  const [view, setView] = useState<'list' | 'grid'>('list')

  useEffect(() => {
    let mounted = true

    loadClients().then(result => {
      if (!mounted) return
      setClients(result.clients)
      setLoadState(result)
      setLoading(false)
    })

    return () => {
      mounted = false
    }
  }, [])

  const filteredClients = useMemo(() => {
    const query = search.trim().toLowerCase()

    return clients.filter(client => {
      const matchesSearch = !query || [client.name, client.company, client.email, client.phone, client.industry].join(' ').toLowerCase().includes(query)
      const matchesStatus = statusFilter === 'All Status' || client.status === statusFilter
      const matchesIndustry = industryFilter === 'All Industry' || client.industry === industryFilter
      return matchesSearch && matchesStatus && matchesIndustry
    })
  }, [clients, industryFilter, search, statusFilter])

  const stats = useMemo(() => {
    const active = clients.filter(client => client.status === 'Active').length
    const inactive = clients.filter(client => client.status === 'Inactive').length
    const currentMonth = new Date().toISOString().slice(0, 7)
    const newClients = clients.filter(client => client.createdAt.startsWith(currentMonth)).length
    const revenue = clients.reduce((sum, client) => sum + client.totalRevenue, 0)

    return [
      { label: 'Total Clients', value: clients.length.toString(), detail: `+${newClients} this month`, icon: UsersRound, color: '#16a34a' },
      { label: 'Active Clients', value: active.toString(), detail: `${Math.round((active / Math.max(clients.length, 1)) * 100)}% of total`, icon: UserCheck, color: '#2563eb' },
      { label: 'New Clients', value: newClients.toString(), detail: `+${newClients} this month`, icon: UserPlus, color: '#10b981' },
      { label: 'Inactive Clients', value: inactive.toString(), detail: `${Math.round((inactive / Math.max(clients.length, 1)) * 100)}% of total`, icon: UserMinus, color: '#f97316' },
      { label: 'Total Revenue', value: formatPeso(revenue), detail: clients.length ? 'From saved client records' : 'No revenue yet', icon: CircleDollarSign, color: '#16a34a' },
    ]
  }, [clients])

  const industries = Array.from(new Set(clients.map(client => client.industry)))
  const accountManagers = Array.from(new Set(clients.map(client => client.accountManager).filter(Boolean)))

  return (
    <div className="clients-page" style={{ fontFamily: font, display: 'grid', gap: 24 }}>
      <PageHeader
        crumb="Home / Client Database"
        title="Client Database"
        subtitle="Manage and monitor all your clients and their details."
        actions={(
          <>
            <button style={secondaryButton}><Upload size={16} /> Import Clients <ChevronDown size={14} /></button>
            <Link href="/people/clients/new" style={primaryLink}><span style={{ fontSize: 18, lineHeight: 1 }}>+</span> Add Client <ChevronDown size={14} /></Link>
          </>
        )}
      />

      <DatabaseStatus source={loadState.source} error={loadState.error} loading={loading} />

      <div style={statGrid}>
        {stats.map(stat => <StatCard key={stat.label} {...stat} />)}
      </div>

      <div style={filterBar}>
        <label style={searchBox}>
          <Search size={17} color="#64748b" />
          <input value={search} onChange={event => setSearch(event.target.value)} placeholder="Search clients by name, email, company..." style={inputBare} />
        </label>
        <select value={statusFilter} onChange={event => setStatusFilter(event.target.value)} style={selectStyle}>
          <option>All Status</option>
          <option>Active</option>
          <option>Inactive</option>
        </select>
        <select value={industryFilter} onChange={event => setIndustryFilter(event.target.value)} style={selectStyle}>
          <option>All Industry</option>
          {industries.map(industry => <option key={industry}>{industry}</option>)}
        </select>
        <select style={selectStyle}>
          <option>All Tags</option>
          <option>Enterprise</option>
          <option>Priority</option>
        </select>
        <select style={selectStyle}>
          <option>Account Manager</option>
          {accountManagers.map(manager => <option key={manager}>{manager}</option>)}
        </select>
        <button style={secondaryButton}><Filter size={16} /> Filter</button>
        <div style={{ display: 'flex', gap: 8, marginLeft: 'auto' }}>
          <button onClick={() => setView('list')} style={iconButton(view === 'list')}><LayoutList size={18} /></button>
          <button onClick={() => setView('grid')} style={iconButton(view === 'grid')}><Grid3X3 size={18} /></button>
        </div>
      </div>

      {loading ? (
        <EmptyState message="Loading clients..." />
      ) : view === 'list' ? (
        <ClientTable clients={filteredClients} />
      ) : (
        <div style={gridCards}>
          {filteredClients.map(client => <ClientGridCard key={client.id} client={client} />)}
        </div>
      )}
    </div>
  )
}

function DatabaseStatus({ source, error, loading }: { source: ClientLoadResult['source']; error?: string; loading: boolean }) {
  if (loading) return <div style={infoBox}>Checking client database...</div>
  if (source === 'supabase') return <div style={successBox}>Client database connected.</div>
  if (source === 'local') return <div style={infoBox}>Using locally saved clients. Supabase is not available: {error}</div>
  return <div style={warningBox}>No client records yet. Supabase is not available: {error || 'clients table not found'}</div>
}

function ClientTable({ clients }: { clients: ClientRecord[] }) {
  if (!clients.length) return <EmptyState message="No clients found." />

  return (
    <div style={panel}>
      <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 1050 }}>
        <thead>
          <tr style={{ background: '#f8fafc' }}>
            <th style={checkCell}><input type="checkbox" /></th>
            {['Client Name', 'Company', 'Email', 'Phone', 'Industry', 'Status', 'Account Manager', 'Total Projects', 'Total Revenue', 'Last Contact', 'Actions'].map(header => (
              <th key={header} style={th}>{header}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {clients.map(client => (
            <tr key={client.id} style={row}>
              <td style={checkCell}><input type="checkbox" /></td>
              <td style={td}>
                <Link href={`/people/clients/${client.id}`} style={clientNameCell}>
                  <span style={avatar('#ede9fe', '#7c3aed')}>{getInitials(client.name)}</span>
                  <strong>{client.name}</strong>
                </Link>
              </td>
              <td style={td}>{client.company}</td>
              <td style={td}>{client.email}</td>
              <td style={td}>{client.phone}</td>
              <td style={td}><Badge tone="purple">{client.industry}</Badge></td>
              <td style={td}><span style={statusDot(client.status)} /> {client.status}</td>
              <td style={td}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={avatar('#f1f5f9', '#0f172a')}>{getInitials(client.accountManager)}</span>
                  {client.accountManager}
                </div>
              </td>
              <td style={td}>{client.totalProjects}</td>
              <td style={{ ...td, fontWeight: 800 }}>{formatPeso(client.totalRevenue)}</td>
              <td style={td}>{client.lastContact}</td>
              <td style={td}><button style={ghostIcon}><MoreHorizontal size={18} /></button></td>
            </tr>
          ))}
        </tbody>
      </table>
      <div style={tableFooter}>Showing 1 to {clients.length} of {clients.length} clients <span style={{ marginLeft: 'auto' }}>Page 1</span></div>
    </div>
  )
}

function ClientGridCard({ client }: { client: ClientRecord }) {
  return (
    <Link href={`/people/clients/${client.id}`} style={gridCard}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <span style={avatar('#ede9fe', '#7c3aed', 44)}>{getInitials(client.name)}</span>
        <div>
          <div style={{ fontWeight: 900, color: '#020617' }}>{client.name}</div>
          <div style={{ fontSize: 12, color: '#64748b', marginTop: 3 }}>{client.industry}</div>
        </div>
      </div>
      <div style={{ display: 'grid', gap: 8, fontSize: 13, color: '#475569' }}>
        <span>{client.email}</span>
        <span>{client.phone}</span>
        <span>{client.totalProjects} projects - {formatPeso(client.totalRevenue)}</span>
      </div>
    </Link>
  )
}

function PageHeader({ crumb, title, subtitle, actions }: { crumb: string; title: string; subtitle: string; actions: ReactNode }) {
  return (
    <div style={pageHeader}>
      <div>
        <div style={breadcrumb}>{crumb}</div>
        <h1 style={h1}>{title}</h1>
        <p style={subtitleStyle}>{subtitle}</p>
      </div>
      <div style={actionsWrap}>{actions}</div>
    </div>
  )
}

function StatCard({ label, value, detail, icon: Icon, color }: { label: string; value: string; detail: string; icon: typeof UsersRound; color: string }) {
  return (
    <div style={statCard}>
      <div style={softIcon(color)}><Icon size={24} /></div>
      <div>
        <div style={statLabel}>{label}</div>
        <div style={statValue}>{value}</div>
        <div style={statDetail}>{detail}</div>
      </div>
    </div>
  )
}

function Badge({ children, tone }: { children: ReactNode; tone: 'purple' | 'green' | 'orange' | 'blue' }) {
  const colors = {
    purple: ['#f3e8ff', '#7e22ce'],
    green: ['#dcfce7', '#15803d'],
    orange: ['#ffedd5', '#c2410c'],
    blue: ['#dbeafe', '#1d4ed8'],
  }[tone]
  return <span style={{ padding: '4px 8px', borderRadius: 999, background: colors[0], color: colors[1], fontSize: 12, fontWeight: 800 }}>{children}</span>
}

function EmptyState({ message }: { message: string }) {
  return <div style={{ ...panel, padding: 80, textAlign: 'center', color: '#64748b', fontWeight: 700 }}>{message}</div>
}

const pageHeader = { display: 'flex', justifyContent: 'space-between', gap: 20, alignItems: 'flex-start', flexWrap: 'wrap' as const }
const breadcrumb = { fontSize: 13, color: '#008b4a', fontWeight: 700, marginBottom: 18 }
const h1 = { margin: 0, fontSize: 30, lineHeight: 1.12, color: '#020617', fontWeight: 900, letterSpacing: 0 }
const subtitleStyle = { margin: '8px 0 0', color: '#475569', fontSize: 14, fontWeight: 500 }
const actionsWrap = { display: 'flex', gap: 12, flexWrap: 'wrap' as const }
const primaryLink = { display: 'inline-flex', alignItems: 'center', gap: 8, height: 42, padding: '0 18px', borderRadius: 8, border: '1px solid #16a34a', background: '#16a34a', color: '#fff', textDecoration: 'none', fontSize: 13, fontWeight: 800 }
const secondaryButton = { display: 'inline-flex', alignItems: 'center', gap: 8, height: 42, padding: '0 16px', borderRadius: 8, border: '1px solid #dbe3ea', background: '#fff', color: '#0f172a', fontSize: 13, fontWeight: 800, cursor: 'pointer' }
const statGrid = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 16 }
const statCard = { minHeight: 112, background: '#fff', border: '1px solid #dfe7ee', borderRadius: 12, boxShadow: '0 10px 24px rgba(15,23,42,.04)', padding: 20, display: 'flex', gap: 18, alignItems: 'center' }
const statLabel = { color: '#475569', fontSize: 13, fontWeight: 700 }
const statValue = { color: '#020617', fontSize: 25, fontWeight: 900, marginTop: 4 }
const statDetail = { color: green, fontSize: 12, fontWeight: 700, marginTop: 6 }
const filterBar = { display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' as const }
const searchBox = { height: 44, minWidth: 0, flex: '1 1 260px', display: 'flex', alignItems: 'center', gap: 10, padding: '0 14px', border: '1px solid #dbe3ea', borderRadius: 8, background: '#fff' }
const inputBare = { border: 'none', outline: 'none', flex: 1, background: 'transparent', fontSize: 13, color: '#0f172a' }
const selectStyle = { height: 44, border: '1px solid #dbe3ea', borderRadius: 8, background: '#fff', color: '#0f172a', fontSize: 13, fontWeight: 700, padding: '0 14px', minWidth: 126 }
const panel = { background: '#fff', border: '1px solid #dfe7ee', borderRadius: 12, boxShadow: '0 10px 24px rgba(15,23,42,.04)', overflow: 'auto' }
const th = { padding: '14px 12px', color: '#475569', fontSize: 12, fontWeight: 900, textAlign: 'left' as const, whiteSpace: 'nowrap' as const }
const td = { padding: '16px 12px', color: '#0f172a', fontSize: 13, fontWeight: 600, borderTop: '1px solid #eaf0f5', whiteSpace: 'nowrap' as const }
const checkCell = { width: 44, padding: '14px 14px', borderTop: '1px solid #eaf0f5' }
const row = { background: '#fff' }
const clientNameCell = { display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none', color: '#020617' }
const tableFooter = { padding: '16px 18px', borderTop: '1px solid #eaf0f5', color: '#475569', fontSize: 13, fontWeight: 600, display: 'flex' }
const ghostIcon = { width: 34, height: 34, border: 'none', borderRadius: 8, background: 'transparent', color: '#475569', cursor: 'pointer' }
const gridCards = { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16 }
const gridCard = { display: 'grid', gap: 18, minHeight: 180, padding: 18, background: '#fff', border: '1px solid #dfe7ee', borderRadius: 12, boxShadow: '0 10px 24px rgba(15,23,42,.04)', textDecoration: 'none' }

const softIcon = (color: string) => ({
  width: 56,
  height: 56,
  borderRadius: 14,
  background: `${color}18`,
  color,
  display: 'grid',
  placeItems: 'center',
  flex: '0 0 auto',
})

const avatar = (background: string, color: string, size = 34) => ({
  width: size,
  height: size,
  borderRadius: 10,
  background,
  color,
  display: 'inline-grid',
  placeItems: 'center',
  fontSize: size > 40 ? 15 : 12,
  fontWeight: 900,
  flex: '0 0 auto',
})

const statusDot = (status: string) => ({
  width: 7,
  height: 7,
  borderRadius: 999,
  display: 'inline-block',
  marginRight: 8,
  background: status === 'Active' ? '#16a34a' : '#f97316',
})

const iconButton = (active: boolean) => ({
  width: 40,
  height: 40,
  borderRadius: 9,
  border: '1px solid #dbe3ea',
  background: active ? '#ecfdf5' : '#fff',
  color: active ? green : '#475569',
  display: 'grid',
  placeItems: 'center',
  cursor: 'pointer',
})

const statusBox = { borderRadius: 10, padding: '12px 14px', fontSize: 13, fontWeight: 800 }
const successBox = { ...statusBox, border: '1px solid #bbf7d0', background: '#f0fdf4', color: '#166534' }
const infoBox = { ...statusBox, border: '1px solid #dbe3ea', background: '#f8fafc', color: '#334155' }
const warningBox = { ...statusBox, border: '1px solid #fed7aa', background: '#fff7ed', color: '#9a3412' }
