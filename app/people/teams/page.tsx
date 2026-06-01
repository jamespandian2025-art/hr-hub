'use client'
import { useState, useEffect, useRef } from 'react'

const font = "var(--font-body)"

const teams = [
  {
    id: 1,
    name: 'Design Team',
    department: 'Creative',
    members: ['Anna', 'Mark', 'Leo'],
    color: '#6c63ff',
  },
  {
    id: 2,
    name: 'Engineering',
    department: 'Development',
    members: ['John', 'Jane', 'Paul', 'Mike'],
    color: '#10b981',
  },
]

export default function TeamsPage() {
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<number[]>([])
  const [activeMenu, setActiveMenu] = useState<number | null>(null)

  const menuRef = useRef<HTMLDivElement | null>(null)

  // ?? Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setActiveMenu(null)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const filtered = teams.filter(t =>
    t.name.toLowerCase().includes(search.toLowerCase()) ||
    t.department.toLowerCase().includes(search.toLowerCase())
  )

  const toggleSelect = (id: number) => {
    setSelected(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    )
  }

  const menuItem = {
    padding: '10px 14px',
    fontSize: '13px',
    cursor: 'pointer',
    borderBottom: '1px solid #f3f4f6',
  }

  return (
    <div style={{ fontFamily: font }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
        <div style={{ fontSize: '24px', fontWeight: 600 }}>Teams</div>
        <button style={{
          padding: '10px 20px',
          background: '#111827',
          color: '#fff',
          border: 'none',
          borderRadius: '10px',
          fontSize: '14px',
          fontWeight: 600,
          cursor: 'pointer',
        }}>
          + Team
        </button>
      </div>

      {/* Breadcrumb */}
      <div style={{ fontSize: '13px', color: '#9ca3af', marginBottom: '24px' }}>
        <span style={{ color: '#6c63ff', fontWeight: 500 }}>Teams</span> • List
      </div>

      {/* Card */}
      <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '16px', overflow: 'hidden' }}>

        {/* Search */}
        <div style={{ padding: '16px 24px', borderBottom: '1px solid #f3f4f6' }}>
          <input
            type="text"
            placeholder="Search teams..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{
              width: '100%',
              padding: '10px 14px',
              borderRadius: '8px',
              border: '1px solid #e5e7eb',
              outline: 'none'
            }}
          />
        </div>

        {/* Table */}
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#fafafa' }}>
              <th style={{ padding: '12px 24px' }}></th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', color: '#6b7280' }}>Team Name</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', color: '#6b7280' }}>Department</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', color: '#6b7280' }}>Members</th>
              <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: '12px', color: '#6b7280' }}>Total</th>
              <th style={{ padding: '12px 16px' }}></th>
            </tr>
          </thead>

          <tbody>
            {filtered.map(team => (
              <tr key={team.id} style={{ borderTop: '1px solid #f3f4f6' }}>

                {/* Checkbox */}
                <td style={{ padding: '16px 24px' }}>
                  <input
                    type="checkbox"
                    checked={selected.includes(team.id)}
                    onChange={() => toggleSelect(team.id)}
                  />
                </td>

                {/* Team Name */}
                <td style={{ padding: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{
                      width: '34px',
                      height: '34px',
                      borderRadius: '8px',
                      background: team.color,
                      color: '#fff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 600
                    }}>
                      {team.name.charAt(0)}
                    </div>
                    {team.name}
                  </div>
                </td>

                {/* Department */}
                <td style={{ padding: '16px', fontSize: '13px' }}>{team.department}</td>

                {/* Members */}
                <td style={{ padding: '16px', fontSize: '13px' }}>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    {team.members.slice(0, 3).map((m, i) => (
                      <div
                        key={i}
                        style={{
                          padding: '4px 8px',
                          background: '#f3f4f6',
                          borderRadius: '6px',
                          fontSize: '12px'
                        }}
                      >
                        {m}
                      </div>
                    ))}
                    {team.members.length > 3 && (
                      <div style={{ fontSize: '12px', color: '#6b7280' }}>
                        +{team.members.length - 3} more
                      </div>
                    )}
                  </div>
                </td>

                {/* Total */}
                <td style={{ padding: '16px', textAlign: 'center', fontWeight: 600 }}>
                  {team.members.length}
                </td>

                {/* Actions Dropdown */}
                <td style={{ padding: '16px', position: 'relative' }}>
                  <div
                    onClick={() =>
                      setActiveMenu(activeMenu === team.id ? null : team.id)
                    }
                    style={{ cursor: 'pointer', fontSize: '18px', color: '#9ca3af' }}
                  >
                    ?
                  </div>

                  {activeMenu === team.id && (
                    <div
                      style={{
                        position: 'absolute',
                        right: '16px',
                        top: '40px',
                        background: '#fff',
                        border: '1px solid #e5e7eb',
                        borderRadius: '10px',
                        boxShadow: '0 10px 20px rgba(0,0,0,0.05)',
                        width: '140px',
                        zIndex: 10,
                        overflow: 'hidden'
                      }}
                    >
                      <div
                        style={menuItem}
                        onClick={() => setActiveMenu(null)}
                        onMouseEnter={e => (e.currentTarget.style.background = '#f9fafb')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                      >
                        View
                      </div>

                      <div
                        style={menuItem}
                        onClick={() => setActiveMenu(null)}
                        onMouseEnter={e => (e.currentTarget.style.background = '#f9fafb')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                      >
                        Edit
                      </div>

                      <div
                        style={{ ...menuItem, color: '#ef4444', borderBottom: 'none' }}
                        onClick={() => setActiveMenu(null)}
                        onMouseEnter={e => (e.currentTarget.style.background = '#fef2f2')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                      >
                        Delete
                      </div>
                    </div>
                  )}
                </td>

              </tr>
            ))}
          </tbody>
        </table>

        {/* Footer */}
        <div style={{
          padding: '16px 24px',
          borderTop: '1px solid #f3f4f6',
          fontSize: '13px',
          color: '#6b7280'
        }}>
          {filtered.length} teams
        </div>
      </div>
    </div>
  )
}
