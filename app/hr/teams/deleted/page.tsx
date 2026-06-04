'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, RotateCcw, Search, Trash2, Users } from 'lucide-react'
import { HRTeam, initials, loadStored, saveStored } from '../teamData'

const font = "var(--font-body)"
const teamsKey = 'flowsys-hr-teams'
const deletedTeamsKey = 'flowsys-hr-deleted-teams'

type DeletedTeam = HRTeam & { deletedAt?: string }

export default function DeletedTeamsPage() {
  const [teams, setTeams] = useState<DeletedTeam[]>([])
  const [query, setQuery] = useState('')

  useEffect(() => {
    const timer = window.setTimeout(() => setTeams(loadStored<DeletedTeam[]>(deletedTeamsKey, [])), 0)
    return () => window.clearTimeout(timer)
  }, [])

  const filtered = useMemo(() => {
    const clean = query.trim().toLowerCase()
    return teams.filter(team => !clean || `${team.name} ${team.department} ${team.managerName}`.toLowerCase().includes(clean))
  }, [query, teams])

  function persistDeleted(next: DeletedTeam[]) {
    setTeams(next)
    saveStored(deletedTeamsKey, next)
  }

  function restoreTeam(team: DeletedTeam) {
    const activeTeams = loadStored<HRTeam[]>(teamsKey, [])
    const restored: HRTeam = { ...team }
    delete (restored as Partial<DeletedTeam>).deletedAt
    saveStored(teamsKey, [{ ...restored, updatedAt: new Date().toISOString() }, ...activeTeams.filter(item => item.id !== team.id)])
    persistDeleted(teams.filter(item => item.id !== team.id))
  }

  function deleteForever(teamId: string) {
    persistDeleted(teams.filter(team => team.id !== teamId))
  }

  return (
    <main style={{ fontFamily: font, padding: '0 20px 32px', minHeight: '100vh' }}>
      <div style={{ padding: '20px 0 18px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 14, flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontSize: 12, color: '#000000', marginBottom: 12 }}>HR Hub &gt; Teams &gt; Deleted Teams</div>
          <h1 style={{ margin: 0, color: '#0f172a', fontSize: 24 }}>Deleted Teams</h1>
          <p style={{ margin: '6px 0 0', color: '#000000', fontSize: 13 }}>Restore teams or delete them forever.</p>
        </div>
        <Link href="/hr/teams" style={secondaryLinkStyle}><ArrowLeft size={15} /> Back to Teams</Link>
      </div>

      <section style={cardStyle}>
        <label style={searchStyle}>
          <Search size={15} color="#000000" />
          <input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search deleted teams..." style={searchInputStyle} />
        </label>
        <div style={{ overflowX: 'auto', marginTop: 16 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 760 }}>
            <thead><tr>{['Team', 'Department', 'Manager', 'Members', 'Deleted On', 'Actions'].map(header => <th key={header} style={thStyle}>{header}</th>)}</tr></thead>
            <tbody>
              {filtered.map(team => (
                <tr key={team.id} style={{ borderTop: '1px solid #f1f5f9' }}>
                  <td style={tdStyle}><span style={avatarStyle}>{initials(team.name)}</span><strong>{team.name}</strong></td>
                  <td style={tdStyle}>{team.department || '-'}</td>
                  <td style={tdStyle}>{team.managerName || '-'}</td>
                  <td style={tdStyle}>{team.members?.length || 0}</td>
                  <td style={tdStyle}>{team.deletedAt ? new Date(team.deletedAt).toLocaleString() : '-'}</td>
                  <td style={{ ...tdStyle, textAlign: 'right' }}>
                    <button onClick={() => restoreTeam(team)} style={restoreButtonStyle}><RotateCcw size={14} /> Restore</button>
                    <button onClick={() => deleteForever(team.id)} style={dangerButtonStyle}><Trash2 size={14} /> Delete forever</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && <EmptyState icon={<Users size={30} />} title="No deleted teams" text="Deleted teams will appear here before they are removed forever." />}
        </div>
      </section>
    </main>
  )
}

function EmptyState({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) {
  return <div style={{ padding: 44, textAlign: 'center', color: '#000000' }}><div style={{ margin: '0 auto 12px', width: 54, height: 54, borderRadius: '50%', background: '#f1f5f9', display: 'grid', placeItems: 'center' }}>{icon}</div><strong style={{ display: 'block', color: '#0f172a', fontSize: 15 }}>{title}</strong><p style={{ margin: '6px 0 0', fontSize: 13 }}>{text}</p></div>
}

const cardStyle = { background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: 18, boxShadow: '0 8px 24px rgba(15,23,42,0.04)' } as const
const secondaryLinkStyle = { minHeight: 38, border: '1px solid #e5e7eb', borderRadius: 8, background: '#fff', color: '#0f172a', display: 'inline-flex', alignItems: 'center', gap: 8, padding: '0 14px', fontSize: 12, fontWeight: 900, textDecoration: 'none' } as const
const searchStyle = { maxWidth: 360, minHeight: 40, border: '1px solid #e5e7eb', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 8, padding: '0 12px' } as const
const searchInputStyle = { border: 'none', outline: 'none', width: '100%', fontSize: 13, fontFamily: font } as const
const thStyle = { padding: '12px 14px', textAlign: 'left' as const, color: '#000000', fontSize: 11, fontWeight: 900, background: '#fbfdff' }
const tdStyle = { padding: '13px 14px', color: '#0f172a', fontSize: 13, verticalAlign: 'middle' as const }
const avatarStyle = { width: 34, height: 34, borderRadius: '50%', background: '#ede9fe', color: '#7c3aed', display: 'inline-grid', placeItems: 'center', marginRight: 10, fontSize: 12, fontWeight: 900 } as const
const restoreButtonStyle = { minHeight: 34, border: '1px solid #bbf7d0', borderRadius: 8, background: '#f0fdf4', color: '#15803d', display: 'inline-flex', alignItems: 'center', gap: 7, padding: '0 11px', marginRight: 8, fontSize: 12, fontWeight: 900, cursor: 'pointer', fontFamily: font } as const
const dangerButtonStyle = { minHeight: 34, border: '1px solid #fecaca', borderRadius: 8, background: '#fff', color: '#dc2626', display: 'inline-flex', alignItems: 'center', gap: 7, padding: '0 11px', fontSize: 12, fontWeight: 900, cursor: 'pointer', fontFamily: font } as const
