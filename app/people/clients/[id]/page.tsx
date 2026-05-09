'use client'

import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useMemo, useState } from 'react'

const font = "'DM Sans', sans-serif"
const clientsStorageKey = 'flowsys-clients'
const projectsStorageKey = 'flowsys-projects'

type ProjectStatus = 'Pending' | 'Ongoing' | 'Completed' | 'With issue'

interface ClientRecord {
  id: number
  name: string
  email: string
  contact: string
  completed: number
  total: number
  cost: number
  color: string
}

interface Project {
  id: number
  name: string
  client: string
  location: string
  projectCost: number
  startDate: string
  endDate: string
  status: ProjectStatus
  materialCost: number
  laborCost: number
  overheadProfit: number
  generalExpense: number
  paidAmount: number
  unpaidAmount: number
  notes: string
}

const initialClients: ClientRecord[] = [
  { id: 1, name: 'Jessica Fields', email: 'Jessicajaneteran@gmail.com', contact: '-', completed: 0, total: 0, cost: 0, color: '#6c63ff' },
  { id: 2, name: 'Joey Ong', email: 'Joey@ronincollective.ph', contact: '-', completed: 0, total: 0, cost: 0, color: '#10b981' },
  { id: 3, name: 'Happy Alino', email: 'cjalinoproperties@gmail.com', contact: '-', completed: 0, total: 0, cost: 0, color: '#f59e0b' },
]

const statusStyle: Record<ProjectStatus, { bg: string; color: string }> = {
  Ongoing: { bg: '#fef3c7', color: '#d97706' },
  Pending: { bg: '#dbeafe', color: '#2563eb' },
  Completed: { bg: '#d1fae5', color: '#059669' },
  'With issue': { bg: '#fee2e2', color: '#dc2626' },
}

const loadData = <T,>(key: string, fallback: T): T => {
  if (typeof window === 'undefined') return fallback

  try {
    const stored = window.localStorage.getItem(key)
    return stored ? (JSON.parse(stored) as T) : fallback
  } catch {
    return fallback
  }
}

const money = (value: number) => `Php ${value.toLocaleString()}.00`

export default function ClientDetailPage() {
  const params = useParams<{ id: string }>()
  const clientId = Number(params.id)
  const [clients] = useState<ClientRecord[]>(() => loadData(clientsStorageKey, initialClients))
  const [projects] = useState<Project[]>(() => loadData(projectsStorageKey, []))
  const [search, setSearch] = useState('')
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null)

  const client = clients.find(record => record.id === clientId)
  const clientProjects = useMemo(
    () => projects.filter(project => client && project.client.toLowerCase() === client.name.toLowerCase()),
    [client, projects]
  )
  const filtered = clientProjects.filter(project =>
    project.name.toLowerCase().includes(search.toLowerCase()) ||
    project.location.toLowerCase().includes(search.toLowerCase()) ||
    project.status.toLowerCase().includes(search.toLowerCase())
  )

  const totalCost = clientProjects.reduce((sum, project) => sum + project.projectCost, 0)
  const completed = clientProjects.filter(project => project.status === 'Completed').length
  const active = clientProjects.filter(project => project.status === 'Ongoing').length
  const selectedProject = clientProjects.find(project => project.id === selectedProjectId)

  if (!client) {
    return (
      <div style={{ fontFamily: font }}>
        <Link href="/people/clients" style={{ color: '#6c63ff', fontSize: '14px', fontWeight: 600, textDecoration: 'none' }}>
          Back to clients
        </Link>
        <div style={{ marginTop: '28px', background: '#fff', border: '1px solid #e5e7eb', borderRadius: '16px', padding: '44px', textAlign: 'center' }}>
          <div style={{ fontSize: '22px', fontWeight: 600, color: '#111827', marginBottom: '8px' }}>Client not found</div>
          <div style={{ fontSize: '14px', color: '#6b7280' }}>Create the client first, then assign projects to them.</div>
        </div>
      </div>
    )
  }

  if (selectedProject) {
    const projectExpenses = selectedProject.materialCost + selectedProject.laborCost + selectedProject.overheadProfit + selectedProject.generalExpense
    const breakdown = [
      ['Material cost', selectedProject.materialCost, '#f97316'],
      ['Labor cost', selectedProject.laborCost, '#ec4899'],
      ['Overhead profit', selectedProject.overheadProfit, '#f59e0b'],
      ['General expense', selectedProject.generalExpense, '#6c63ff'],
    ] as const

    return (
      <div style={{ fontFamily: font }}>
        <button onClick={() => setSelectedProjectId(null)} style={{ border: 'none', background: 'transparent', color: '#374151', fontSize: '14px', fontWeight: 600, cursor: 'pointer', marginBottom: '20px', padding: 0 }}>
          Back to {client.name} projects
        </button>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px', flexWrap: 'wrap', marginBottom: '8px' }}>
          <div>
            <div style={{ fontSize: '24px', fontWeight: 600, color: '#111827', marginBottom: '6px' }}>{selectedProject.name}</div>
            <div style={{ fontSize: '13px', color: '#9ca3af', display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              <span style={{ color: '#6c63ff', fontWeight: 600 }}>Clients</span>
              <span>/</span>
              <span style={{ color: '#6c63ff', fontWeight: 600 }}>{client.name}</span>
              <span>/</span>
              <span>Project Details</span>
            </div>
          </div>
          <span style={{ fontSize: '11px', fontWeight: 600, padding: '5px 12px', borderRadius: '20px', background: statusStyle[selectedProject.status].bg, color: statusStyle[selectedProject.status].color }}>
            {selectedProject.status.toUpperCase()}
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: '14px', margin: '24px 0' }}>
          {[
            ['Project Cost', money(selectedProject.projectCost), selectedProject.location],
            ['Paid', money(selectedProject.paidAmount), 'Received amount'],
            ['Unpaid', money(selectedProject.unpaidAmount), 'Remaining balance'],
            ['Duration', `${selectedProject.startDate || '-'} - ${selectedProject.endDate || '-'}`, selectedProject.status],
          ].map(([label, value, detail]) => (
            <div key={label} style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '18px' }}>
              <div style={{ fontSize: '12px', color: '#6b7280', fontWeight: 600, marginBottom: '8px' }}>{label}</div>
              <div style={{ fontSize: '20px', color: '#111827', fontWeight: 600, wordBreak: 'break-word' }}>{value}</div>
              <div style={{ fontSize: '12px', color: '#9ca3af', fontWeight: 600, marginTop: '5px', wordBreak: 'break-word' }}>{detail}</div>
            </div>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(280px, 1fr) minmax(280px, 1fr)', gap: '16px' }}>
          <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '16px', padding: '20px' }}>
            <div style={{ fontSize: '15px', color: '#111827', fontWeight: 600, marginBottom: '14px' }}>Cost Breakdown</div>
            <div style={{ display: 'grid', gap: '12px' }}>
              {breakdown.map(([label, amount, color]) => (
                <div key={label} style={{ display: 'grid', gridTemplateColumns: '10px minmax(0, 1fr) auto', gap: '10px', alignItems: 'center' }}>
                  <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: color }} />
                  <span style={{ fontSize: '13px', color: '#374151', fontWeight: 600 }}>{label}</span>
                  <span style={{ fontSize: '13px', color: '#111827', fontWeight: 600 }}>{money(amount)}</span>
                </div>
              ))}
              <div style={{ height: '1px', background: '#f3f4f6', margin: '4px 0' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', color: '#111827', fontWeight: 600 }}>
                <span>Total bills and expenses</span>
                <span>{money(projectExpenses)}</span>
              </div>
            </div>
          </div>

          <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '16px', padding: '20px' }}>
            <div style={{ fontSize: '15px', color: '#111827', fontWeight: 600, marginBottom: '14px' }}>Project Notes</div>
            <div style={{ fontSize: '13px', color: selectedProject.notes ? '#374151' : '#9ca3af', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
              {selectedProject.notes || 'No notes added for this project.'}
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ fontFamily: font }}>
      <Link href="/people/clients" style={{ textDecoration: 'none' }}>
        <div style={{ display: 'inline-flex', color: '#374151', fontSize: '14px', fontWeight: 600, marginBottom: '20px' }}>
          Back to Clients
        </div>
      </Link>

      <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '8px' }}>
        <div style={{ width: '56px', height: '56px', borderRadius: '16px', background: client.color, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px', fontWeight: 600, flex: '0 0 auto' }}>
          {client.name.charAt(0)}
        </div>
        <div>
          <div style={{ fontSize: '24px', fontWeight: 600, color: '#111827', marginBottom: '6px' }}>{client.name}</div>
          <div style={{ fontSize: '13px', color: '#9ca3af', display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            <span style={{ color: '#6c63ff', fontWeight: 600 }}>Clients</span>
            <span>/</span>
            <span>Projects</span>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '14px', margin: '24px 0' }}>
        {[
          ['Total Projects', clientProjects.length.toLocaleString(), `${active} ongoing`],
          ['Completed', completed.toLocaleString(), 'Finished projects'],
          ['Project Cost', money(totalCost), 'Total project value'],
          ['Contact', client.contact, client.email],
        ].map(([label, value, detail]) => (
          <div key={label} style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '18px' }}>
            <div style={{ fontSize: '12px', color: '#6b7280', fontWeight: 600, marginBottom: '8px' }}>{label}</div>
            <div style={{ fontSize: '20px', color: '#111827', fontWeight: 600, wordBreak: 'break-word' }}>{value}</div>
            <div style={{ fontSize: '12px', color: '#9ca3af', fontWeight: 600, marginTop: '5px', wordBreak: 'break-word' }}>{detail}</div>
          </div>
        ))}
      </div>

      <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '16px', overflow: 'hidden' }}>
        <div style={{ display: 'flex', gap: '12px', padding: '16px 24px', borderBottom: '1px solid #f3f4f6' }}>
          <div style={{ flex: 1, display: 'flex', gap: '8px', padding: '9px 14px', border: '1px solid #e5e7eb', borderRadius: '8px', background: '#fafafa' }}>
            <span style={{ color: '#9ca3af' }}>Search</span>
            <input value={search} onChange={event => setSearch(event.target.value)} placeholder="Search this client's projects..." style={{ border: 'none', background: 'transparent', outline: 'none', flex: 1, color: '#374151', fontSize: '13px' }} />
          </div>
        </div>

        {filtered.length === 0 ? (
          <div style={{ padding: '70px 24px', textAlign: 'center', color: '#9ca3af', fontSize: '14px', fontWeight: 600 }}>
            No projects assigned to this client yet.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '840px' }}>
              <thead>
                <tr style={{ background: '#fafafa' }}>
                  {['Project', 'Location', 'Project Cost', 'Paid', 'Unpaid', 'Duration', 'Status'].map(header => (
                    <th key={header} style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>{header}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(project => (
                  <tr key={project.id} onClick={() => setSelectedProjectId(project.id)} style={{ borderTop: '1px solid #f3f4f6', cursor: 'pointer' }}>
                    <td style={{ padding: '16px', fontSize: '13px', fontWeight: 600, color: '#111827' }}>
                      <button onClick={() => setSelectedProjectId(project.id)} style={{ border: 'none', background: 'transparent', padding: 0, color: '#111827', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>
                        {project.name}
                      </button>
                    </td>
                    <td style={cellStyle}>{project.location}</td>
                    <td style={{ ...cellStyle, fontWeight: 600, color: '#111827' }}>{money(project.projectCost)}</td>
                    <td style={cellStyle}>{money(project.paidAmount)}</td>
                    <td style={cellStyle}>{money(project.unpaidAmount)}</td>
                    <td style={cellStyle}>{project.startDate || '-'} - {project.endDate || '-'}</td>
                    <td style={{ padding: '16px' }}>
                      <span style={{ fontSize: '11px', fontWeight: 600, padding: '4px 10px', borderRadius: '20px', background: statusStyle[project.status].bg, color: statusStyle[project.status].color }}>
                        {project.status.toUpperCase()}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div style={{ padding: '16px 24px', borderTop: '1px solid #f3f4f6', fontSize: '13px', color: '#374151', fontWeight: 600 }}>
          {filtered.length} projects
        </div>
      </div>
    </div>
  )
}

const cellStyle = {
  padding: '16px',
  fontSize: '13px',
  color: '#374151',
  fontWeight: 600,
}
