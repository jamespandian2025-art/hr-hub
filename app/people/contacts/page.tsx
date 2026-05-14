'use client'

import { useEffect, useMemo, useState } from 'react'

const font = "var(--font-body)"
const contactsStorageKey = 'flowsys-contacts'
const clientsStorageKey = 'flowsys-clients'

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

interface ManualContact {
  id: number
  name: string
  email: string
  phone: string
  company: string
  color: string
}

interface ContactRow {
  key: string
  id: number
  source: 'Client' | 'Contact'
  name: string
  email: string
  phone: string
  company: string
  color: string
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

const fieldGroupStyle = {
  display: 'grid',
  gap: '7px',
}

const labelStyle = {
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
    const stored = window.localStorage.getItem(clientsStorageKey)
    return stored ? (JSON.parse(stored) as Client[]) : initialClients
  } catch {
    return initialClients
  }
}

const loadContacts = () => {
  if (typeof window === 'undefined') return []

  try {
    const stored = window.localStorage.getItem(contactsStorageKey)
    return stored ? (JSON.parse(stored) as ManualContact[]) : []
  } catch {
    return []
  }
}

const nextId = (records: { id: number }[]) => records.reduce((max, record) => Math.max(max, record.id), 0) + 1
const colorFor = (id: number) => ['#6c63ff', '#10b981', '#f59e0b', '#2563eb', '#ec4899'][id % 5]

export default function ContactsPage() {
  const [clients, setClients] = useState<Client[]>(loadClients)
  const [manualContacts, setManualContacts] = useState<ManualContact[]>(loadContacts)
  const [search, setSearch] = useState('')
  const [sourceFilter, setSourceFilter] = useState<'All' | 'Client' | 'Contact'>('All')
  const [selected, setSelected] = useState<string[]>([])
  const [activeMenu, setActiveMenu] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [editingKey, setEditingKey] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [company, setCompany] = useState('')

  useEffect(() => {
    window.localStorage.setItem(contactsStorageKey, JSON.stringify(manualContacts))
  }, [manualContacts])

  useEffect(() => {
    window.localStorage.setItem(clientsStorageKey, JSON.stringify(clients))
  }, [clients])

  const rows = useMemo<ContactRow[]>(() => {
    const clientRows = clients.map(client => ({
      key: `client-${client.id}`,
      id: client.id,
      source: 'Client' as const,
      name: client.name,
      email: client.email,
      phone: client.contact,
      company: client.name,
      color: client.color,
    }))

    const contactRows = manualContacts.map(contact => ({
      key: `contact-${contact.id}`,
      id: contact.id,
      source: 'Contact' as const,
      name: contact.name,
      email: contact.email,
      phone: contact.phone,
      company: contact.company,
      color: contact.color,
    }))

    return [...clientRows, ...contactRows]
  }, [clients, manualContacts])

  const filtered = rows.filter(contact => {
    const matchesSource = sourceFilter === 'All' || contact.source === sourceFilter
    const matchesSearch =
      contact.name.toLowerCase().includes(search.toLowerCase()) ||
      contact.email.toLowerCase().includes(search.toLowerCase()) ||
      contact.phone.toLowerCase().includes(search.toLowerCase()) ||
      contact.company.toLowerCase().includes(search.toLowerCase())

    return matchesSource && matchesSearch
  })

  const resetForm = () => {
    setName('')
    setEmail('')
    setPhone('')
    setCompany('')
    setEditingKey(null)
  }

  const closeForm = () => {
    resetForm()
    setShowForm(false)
  }

  const startCreate = () => {
    resetForm()
    setShowForm(true)
  }

  const startEdit = (contact: ContactRow) => {
    setEditingKey(contact.key)
    setName(contact.name)
    setEmail(contact.email === '-' ? '' : contact.email)
    setPhone(contact.phone === '-' ? '' : contact.phone)
    setCompany(contact.company === '-' ? '' : contact.company)
    setShowForm(true)
    setActiveMenu(null)
  }

  const saveContact = () => {
    const trimmedName = name.trim()
    if (!trimmedName) return

    if (editingKey?.startsWith('client-')) {
      const id = Number(editingKey.replace('client-', ''))
      setClients(previous =>
        previous.map(client =>
          client.id === id
            ? {
                ...client,
                name: trimmedName,
                email: email.trim() || '-',
                contact: phone.trim() || '-',
              }
            : client
        )
      )
    } else if (editingKey?.startsWith('contact-')) {
      const id = Number(editingKey.replace('contact-', ''))
      setManualContacts(previous =>
        previous.map(contact =>
          contact.id === id
            ? {
                ...contact,
                name: trimmedName,
                email: email.trim() || '-',
                phone: phone.trim() || '-',
                company: company.trim() || '-',
              }
            : contact
        )
      )
    } else {
      setManualContacts(previous => {
        const id = nextId(previous)
        return [
          ...previous,
          {
            id,
            name: trimmedName,
            email: email.trim() || '-',
            phone: phone.trim() || '-',
            company: company.trim() || '-',
            color: colorFor(id),
          },
        ]
      })
    }

    closeForm()
  }

  const deleteContact = (contact: ContactRow) => {
    if (contact.source === 'Client') {
      setClients(previous => previous.filter(client => client.id !== contact.id))
    } else {
      setManualContacts(previous => previous.filter(record => record.id !== contact.id))
    }

    setSelected(previous => previous.filter(key => key !== contact.key))
    setActiveMenu(null)
  }

  const toggleSelect = (key: string) => {
    setSelected(previous =>
      previous.includes(key) ? previous.filter(item => item !== key) : [...previous, key]
    )
  }

  const toggleSelectAll = () => {
    const filteredKeys = filtered.map(contact => contact.key)
    const allSelected = filteredKeys.length > 0 && filteredKeys.every(key => selected.includes(key))
    setSelected(previous => (allSelected ? previous.filter(key => !filteredKeys.includes(key)) : Array.from(new Set([...previous, ...filteredKeys]))))
  }

  if (showForm) {
    return (
      <div style={{ fontFamily: font }}>
        <button onClick={closeForm} style={{ border: 'none', background: 'transparent', color: '#374151', fontSize: '14px', fontWeight: 600, cursor: 'pointer', marginBottom: '20px', padding: 0 }}>
          Back
        </button>
        <div style={{ fontSize: '24px', fontWeight: 600, color: '#111827', marginBottom: '6px' }}>{editingKey ? 'Edit Contact' : 'Add Contact'}</div>
        <div style={{ fontSize: '13px', color: '#9ca3af', marginBottom: '28px', display: 'flex', gap: '6px' }}>
          <span style={{ color: '#6c63ff', fontWeight: 600 }}>Contacts</span>
          <span>/</span>
          <span>{editingKey ? 'Edit' : 'New'}</span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(220px, 260px) minmax(0, 1fr)', gap: '32px' }}>
          <div>
            <div style={{ fontSize: '15px', fontWeight: 600, color: '#111827', marginBottom: '8px' }}>Contact Details</div>
            <div style={{ fontSize: '13px', color: '#6b7280', lineHeight: 1.6 }}>
              Client records appear here automatically. Editing a client contact updates the Clients page too.
            </div>
          </div>

          <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '20px', display: 'grid', gap: '14px' }}>
            <label style={fieldGroupStyle}>
              <span style={labelStyle}>Name</span>
              <input style={fieldStyle} value={name} onChange={event => setName(event.target.value)} placeholder="Contact name" />
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: '14px' }}>
              <label style={fieldGroupStyle}>
                <span style={labelStyle}>Email</span>
                <input style={fieldStyle} value={email} onChange={event => setEmail(event.target.value)} placeholder="contact@example.com" />
              </label>
              <label style={fieldGroupStyle}>
                <span style={labelStyle}>Phone</span>
                <input style={fieldStyle} value={phone} onChange={event => setPhone(event.target.value)} placeholder="Phone number" />
              </label>
            </div>
            <label style={fieldGroupStyle}>
              <span style={labelStyle}>Company</span>
              <input style={{ ...fieldStyle, background: editingKey?.startsWith('client-') ? '#f9fafb' : '#fff' }} value={company} onChange={event => setCompany(event.target.value)} placeholder="Company or organization" readOnly={Boolean(editingKey?.startsWith('client-'))} />
            </label>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '28px' }}>
          <button onClick={closeForm} style={{ ...buttonStyle, background: '#fff', border: '1px solid #e5e7eb', color: '#374151' }}>Cancel</button>
          <button onClick={saveContact} disabled={!name.trim()} style={{ ...buttonStyle, background: name.trim() ? '#111827' : '#d1d5db', color: '#fff', cursor: name.trim() ? 'pointer' : 'not-allowed' }}>
            {editingKey ? 'Save Contact' : 'Create Contact'}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div style={{ fontFamily: font }} onClick={() => setActiveMenu(null)}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
        <div style={{ fontSize: '24px', fontWeight: 600, color: '#111827' }}>Contacts</div>
        <button onClick={startCreate} style={{ ...buttonStyle, background: '#111827', color: '#fff' }}>
          + Contact
        </button>
      </div>

      <div style={{ fontSize: '13px', color: '#9ca3af', marginBottom: '24px', display: 'flex', gap: '6px' }}>
        <span style={{ color: '#6c63ff', fontWeight: 600 }}>Contacts</span>
        <span>/</span>
        <span>List</span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '14px', marginBottom: '18px' }}>
        {[
          ['All Contacts', rows.length.toLocaleString(), 'Clients and manual contacts'],
          ['Client Contacts', rows.filter(row => row.source === 'Client').length.toLocaleString(), 'Synced from Clients'],
          ['Manual Contacts', rows.filter(row => row.source === 'Contact').length.toLocaleString(), 'Added here'],
        ].map(([label, value, detail]) => (
          <div key={label} style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '18px' }}>
            <div style={{ fontSize: '12px', color: '#6b7280', fontWeight: 600, marginBottom: '8px' }}>{label}</div>
            <div style={{ fontSize: '20px', color: '#111827', fontWeight: 600 }}>{value}</div>
            <div style={{ fontSize: '12px', color: '#9ca3af', fontWeight: 600, marginTop: '5px' }}>{detail}</div>
          </div>
        ))}
      </div>

      <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '16px', overflow: 'hidden' }}>
        <div style={{ display: 'flex', gap: '12px', padding: '16px 24px', borderBottom: '1px solid #f3f4f6', flexWrap: 'wrap' }}>
          <select value={sourceFilter} onChange={event => setSourceFilter(event.target.value as 'All' | 'Client' | 'Contact')} style={{ ...fieldStyle, width: '170px', background: '#fafafa' }}>
            <option>All</option>
            <option>Client</option>
            <option>Contact</option>
          </select>
          <div style={{ flex: 1, minWidth: '220px', display: 'flex', gap: '8px', padding: '9px 14px', border: '1px solid #e5e7eb', borderRadius: '8px', background: '#fafafa' }}>
            <span style={{ color: '#9ca3af' }}>Search</span>
            <input type="text" placeholder="Search name, email, phone, or company..." value={search} onChange={event => setSearch(event.target.value)} style={{ border: 'none', background: 'transparent', outline: 'none', flex: 1, color: '#374151' }} />
          </div>
        </div>

        {filtered.length === 0 ? (
          <div style={{ padding: '70px 24px', textAlign: 'center', color: '#9ca3af', fontSize: '14px', fontWeight: 600 }}>
            No contacts found.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '860px' }}>
              <thead>
                <tr style={{ background: '#fafafa' }}>
                  <th style={{ padding: '12px 24px', width: '40px' }}>
                    <input type="checkbox" checked={filtered.length > 0 && filtered.every(contact => selected.includes(contact.key))} onChange={toggleSelectAll} />
                  </th>
                  {['Name', 'Email', 'Phone', 'Company', 'Source', ''].map(header => (
                    <th key={header} style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>{header}</th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {filtered.map(contact => (
                  <tr key={contact.key} style={{ borderTop: '1px solid #f3f4f6' }}>
                    <td style={{ padding: '16px 24px' }}>
                      <input type="checkbox" checked={selected.includes(contact.key)} onChange={() => toggleSelect(contact.key)} />
                    </td>
                    <td style={{ padding: '16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ width: '34px', height: '34px', borderRadius: '50%', background: contact.color, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600 }}>
                          {contact.name.charAt(0)}
                        </div>
                        <span style={{ fontSize: '13px', fontWeight: 600, color: '#111827' }}>{contact.name}</span>
                      </div>
                    </td>
                    <td style={cellStyle}>{contact.email}</td>
                    <td style={cellStyle}>{contact.phone}</td>
                    <td style={cellStyle}>{contact.company}</td>
                    <td style={{ padding: '16px' }}>
                      <span style={{ fontSize: '11px', fontWeight: 600, padding: '4px 10px', borderRadius: '999px', background: contact.source === 'Client' ? '#eef2ff' : '#f3f4f6', color: contact.source === 'Client' ? '#4f46e5' : '#374151' }}>
                        {contact.source}
                      </span>
                    </td>
                    <td style={{ padding: '16px', position: 'relative' }}>
                      <button
                        onClick={event => {
                          event.stopPropagation()
                          setActiveMenu(activeMenu === contact.key ? null : contact.key)
                        }}
                        style={{ border: 'none', background: 'transparent', cursor: 'pointer', fontSize: '18px', color: '#9ca3af' }}
                      >
                        ...
                      </button>

                      {activeMenu === contact.key && (
                        <div onClick={event => event.stopPropagation()} style={{ position: 'absolute', right: '16px', top: '46px', background: '#fff', border: '1px solid #e5e7eb', borderRadius: '10px', boxShadow: '0 10px 24px rgba(15,23,42,0.12)', width: '150px', zIndex: 20, overflow: 'hidden' }}>
                          <button onClick={() => startEdit(contact)} style={menuItemStyle}>Edit</button>
                          <button onClick={() => deleteContact(contact)} style={{ ...menuItemStyle, color: '#ef4444', borderBottom: 'none' }}>
                            {contact.source === 'Client' ? 'Delete client' : 'Delete'}
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div style={{ padding: '16px 24px', borderTop: '1px solid #f3f4f6', fontSize: '13px', color: '#374151', fontWeight: 600 }}>
          {filtered.length} contacts
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
