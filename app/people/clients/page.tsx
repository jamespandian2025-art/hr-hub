'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'

const font = "'DM Sans', sans-serif"
const storageKey = 'flowsys-clients'
const projectsStorageKey = 'flowsys-projects'

interface Client {
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
  status: string
  materialCost: number
  laborCost: number
  overheadProfit: number
  generalExpense: number
  paidAmount: number
  unpaidAmount: number
  notes: string
}

const initialClients: Client[] = [
  { id: 1, name: 'Jessica Fields', email: 'Jessicajaneteran@gmail.com', contact: '-', completed: 0, total: 0, cost: 0, color: '#6c63ff' },
  { id: 2, name: 'Joey Ong', email: 'Joey@ronincollective.ph', contact: '-', completed: 0, total: 0, cost: 0, color: '#10b981' },
  { id: 3, name: 'Happy Alino', email: 'cjalinoproperties@gmail.com', contact: '-', completed: 0, total: 0, cost: 0, color: '#f59e0b' },
]

const fieldStyle = {
  width: '100%',
  padding: '10px 12px',
  border: '1px solid #e5e7eb',
  borderRadius: '8px',
  outline: 'none',
  fontSize: '13px',
  color: '#374151',
  background: '#fff',
}

const labelStyle = {
  display: 'grid',
  gap: '7px',
  fontSize: '12px',
  color: '#374151',
  fontWeight: 600,
}

const buttonStyle = {
  padding: '10px 18px',
  borderRadius: '10px',
  border: 'none',
  fontSize: '13px',
  fontWeight: 600,
  cursor: 'pointer',
}

const loadClients = () => {
  if (typeof window === 'undefined') return initialClients

  try {
    const stored = window.localStorage.getItem(storageKey)
    return stored ? (JSON.parse(stored) as Client[]) : initialClients
  } catch {
    return initialClients
  }
}

const loadProjects = () => {
  if (typeof window === 'undefined') return []

  try {
    const stored = window.localStorage.getItem(projectsStorageKey)
    return stored ? (JSON.parse(stored) as Project[]) : []
  } catch {
    return []
  }
}

const money = (value: number) => `Php ${value.toLocaleString()}.00`
const nextId = (records: Client[]) => records.reduce((max, record) => Math.max(max, record.id), 0) + 1
const colorFor = (id: number) => ['#6c63ff', '#10b981', '#f59e0b', '#2563eb', '#ec4899'][id % 5]

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>(loadClients)
  const [projects] = useState<Project[]>(loadProjects)
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<number[]>([])
  const [activeMenu, setActiveMenu] = useState<number | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [contact, setContact] = useState('')

  useEffect(() => {
    window.localStorage.setItem(storageKey, JSON.stringify(clients))
  }, [clients])

  const filtered = clients.filter(client =>
    client.name.toLowerCase().includes(search.toLowerCase()) ||
    client.email.toLowerCase().includes(search.toLowerCase())
  )
  const clientStats = (clientName: string) => {
    const ownedProjects = projects.filter(project => project.client.toLowerCase() === clientName.toLowerCase())

    return {
      completed: ownedProjects.filter(project => project.status === 'Completed').length,
      total: ownedProjects.length,
      paid: ownedProjects.reduce((sum, project) => sum + project.paidAmount, 0),
    }
  }

  const resetForm = () => {
    setName('')
    setEmail('')
    setContact('')
    setEditingId(null)
  }

  const closeForm = () => {
    resetForm()
    setShowForm(false)
  }

  const startEdit = (client: Client) => {
    setEditingId(client.id)
    setName(client.name)
    setEmail(client.email === '-' ? '' : client.email)
    setContact(client.contact === '-' ? '' : client.contact)
    setShowForm(true)
    setActiveMenu(null)
  }

  const saveClient = () => {
    const trimmedName = name.trim()
    if (!trimmedName) return

    if (editingId) {
      setClients(previous =>
        previous.map(client =>
          client.id === editingId
            ? { ...client, name: trimmedName, email: email.trim() || '-', contact: contact.trim() || '-' }
            : client
        )
      )
    } else {
      setClients(previous => {
        const id = nextId(previous)
        return [
          ...previous,
          {
            id,
            name: trimmedName,
            email: email.trim() || '-',
            contact: contact.trim() || '-',
            completed: 0,
            total: 0,
            cost: 0,
            color: colorFor(id),
          },
        ]
      })
    }

    closeForm()
  }

  const deleteClient = (id: number) => {
    setClients(previous => previous.filter(client => client.id !== id))
    setSelected(previous => previous.filter(clientId => clientId !== id))
    setActiveMenu(null)
  }

  const toggleSelect = (id: number) => {
    setSelected(previous =>
      previous.includes(id) ? previous.filter(item => item !== id) : [...previous, id]
    )
  }

  if (showForm) {
    return (
      <div style={{ fontFamily: font }}>
        <button onClick={closeForm} style={{ border: 'none', background: 'transparent', color: '#374151', fontSize: '14px', fontWeight: 600, cursor: 'pointer', marginBottom: '20px', padding: 0 }}>
          Back
        </button>
        <div style={{ fontSize: '24px', fontWeight: 600, color: '#111827', marginBottom: '6px' }}>{editingId ? 'Edit Client' : 'Add Client'}</div>
        <div style={{ fontSize: '13px', color: '#9ca3af', marginBottom: '28px', display: 'flex', gap: '6px' }}>
          <span style={{ color: '#6c63ff', fontWeight: 600 }}>Clients</span>
          <span>/</span>
          <span>{editingId ? 'Edit' : 'New'}</span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(220px, 260px) minmax(0, 1fr)', gap: '32px' }}>
          <div>
            <div style={{ fontSize: '15px', fontWeight: 600, color: '#111827', marginBottom: '8px' }}>Client Details</div>
            <div style={{ fontSize: '13px', color: '#6b7280', lineHeight: 1.6 }}>
              Add client contact details. These clients are available when creating projects.
            </div>
          </div>

          <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '20px', display: 'grid', gap: '14px' }}>
            <label style={labelStyle}>
              Client name
              <input style={fieldStyle} value={name} onChange={event => setName(event.target.value)} placeholder="Client name" />
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: '14px' }}>
              <label style={labelStyle}>
                Email
                <input style={fieldStyle} value={email} onChange={event => setEmail(event.target.value)} placeholder="client@example.com" />
              </label>
              <label style={labelStyle}>
                Contact
                <input style={fieldStyle} value={contact} onChange={event => setContact(event.target.value)} placeholder="Phone or contact person" />
              </label>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '28px' }}>
          <button onClick={closeForm} style={{ ...buttonStyle, background: '#fff', border: '1px solid #e5e7eb', color: '#374151' }}>Cancel</button>
          <button onClick={saveClient} disabled={!name.trim()} style={{ ...buttonStyle, background: name.trim() ? '#111827' : '#d1d5db', color: '#fff', cursor: name.trim() ? 'pointer' : 'not-allowed' }}>
            {editingId ? 'Save Client' : 'Create Client'}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div style={{ fontFamily: font }} onClick={() => setActiveMenu(null)}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
        <div style={{ fontSize: '24px', fontWeight: 600, color: '#111827' }}>Clients</div>
        <button onClick={() => setShowForm(true)} style={{ ...buttonStyle, background: '#111827', color: '#fff' }}>
          + Client
        </button>
      </div>

      <div style={{ fontSize: '13px', color: '#9ca3af', marginBottom: '24px', display: 'flex', gap: '6px' }}>
        <span style={{ color: '#6c63ff', fontWeight: 600 }}>Clients</span>
        <span>/</span>
        <span>List</span>
      </div>

      <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '16px', overflow: 'hidden' }}>
        <div style={{ display: 'flex', gap: '12px', padding: '16px 24px', borderBottom: '1px solid #f3f4f6' }}>
          <div style={{ flex: 1, display: 'flex', gap: '8px', padding: '9px 14px', border: '1px solid #e5e7eb', borderRadius: '8px', background: '#fafafa' }}>
            <span style={{ color: '#9ca3af' }}>Search</span>
            <input type="text" placeholder="Search clients..." value={search} onChange={event => setSearch(event.target.value)} style={{ border: 'none', background: 'transparent', outline: 'none', flex: 1, color: '#374151' }} />
          </div>
        </div>

        {filtered.length === 0 ? (
          <div style={{ padding: '60px 24px', textAlign: 'center', color: '#9ca3af', fontSize: '14px', fontWeight: 600 }}>
            No clients yet. Click + Client to create one.
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#fafafa' }}>
                <th style={{ padding: '12px 24px' }}><input type="checkbox" /></th>
                {['Name', 'Contact', 'Completed', 'Projects', 'Cost', ''].map(header => (
                  <th key={header} style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>{header}</th>
                ))}
              </tr>
            </thead>

            <tbody>
              {filtered.map(client => {
                const stats = clientStats(client.name)

                return (
                  <tr key={client.id} style={{ borderTop: '1px solid #f3f4f6' }}>
                    <td style={{ padding: '16px 24px' }}>
                      <input type="checkbox" checked={selected.includes(client.id)} onChange={() => toggleSelect(client.id)} />
                    </td>
                    <td style={{ padding: '16px' }}>
                      <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                        <div style={{ width: '38px', height: '38px', borderRadius: '50%', background: client.color, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600 }}>
                          {client.name.charAt(0)}
                        </div>
                        <div>
                          <Link href={`/people/clients/${client.id}`} style={{ fontWeight: 600, color: '#111827', textDecoration: 'none' }}>
                            {client.name}
                          </Link>
                          <div style={{ fontSize: '12px', color: '#6b7280' }}>{client.email}</div>
                        </div>
                      </div>
                    </td>
                    <td style={cellStyle}>{client.contact}</td>
                    <td style={cellStyle}>{stats.completed}</td>
                    <td style={cellStyle}>{stats.total}</td>
                    <td style={cellStyle}>{money(stats.paid)}</td>
                    <td style={{ padding: '16px', position: 'relative' }}>
                      <button
                        onClick={event => {
                          event.stopPropagation()
                          setActiveMenu(activeMenu === client.id ? null : client.id)
                        }}
                        style={{ border: 'none', background: 'transparent', cursor: 'pointer', fontSize: '18px', color: '#9ca3af' }}
                      >
                        ...
                      </button>

                      {activeMenu === client.id && (
                        <div onClick={event => event.stopPropagation()} style={{ position: 'absolute', right: '16px', top: '46px', background: '#fff', border: '1px solid #e5e7eb', borderRadius: '10px', width: '140px', boxShadow: '0 10px 24px rgba(15,23,42,0.12)', overflow: 'hidden', zIndex: 20 }}>
                          <button onClick={() => startEdit(client)} style={menuItemStyle}>Edit</button>
                          <button onClick={() => deleteClient(client.id)} style={{ ...menuItemStyle, color: '#ef4444', borderBottom: 'none' }}>Delete</button>
                        </div>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}

        <div style={{ padding: '16px 24px', borderTop: '1px solid #f3f4f6', fontSize: '13px', color: '#374151', fontWeight: 600 }}>
          {filtered.length} clients
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

const menuItemStyle = {
  display: 'block',
  width: '100%',
  padding: '11px 14px',
  border: 'none',
  borderBottom: '1px solid #f3f4f6',
  background: '#fff',
  color: '#374151',
  textAlign: 'left' as const,
  fontSize: '13px',
  fontWeight: 600,
  cursor: 'pointer',
}
