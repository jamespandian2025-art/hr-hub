'use client'

import { useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import {
  Calendar, Check, Copy, Download, Edit2, FileText, Folder,
  MoreHorizontal, Plus, Search, Trash2, UserMinus, Users, X,
} from 'lucide-react'
import { Employee, ensureTeams, fullName, HRTeam, initials, loadStored, saveStored, TeamMember } from '../teamData'

const font = "var(--font-body)"
const card = { background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, boxShadow: '0 1px 4px rgba(15,23,42,0.05)' }
const inputStyle = { border: '1px solid #e5e7eb', borderRadius: 8, padding: '11px 12px', outline: 'none', fontFamily: font, fontSize: 13, color: '#111827', background: '#fff' }
const tabs = ['Overview', 'Members', 'Projects', 'Open Positions', 'Performance', 'Documents', 'Activity']
const storageKey = 'flowsys-hr-teams'
const deletedTeamsKey = 'flowsys-hr-deleted-teams'

interface TeamProject {
  id: string
  teamId: string
  name: string
  description: string
  status: string
  createdAt: string
}

function employeeToMember(employee: Employee): TeamMember {
  const name = fullName(employee) || employee.email || 'Team Member'
  return {
    id: employee.id,
    name,
    employeeId: employee.employeeId || employee.id,
    position: employee.jobTitle || '',
    role: employee.jobTitle || 'Member',
    employmentType: employee.employeeType || '',
    status: employee.employmentStatus || 'Active',
    photo: employee.photo,
    email: employee.email,
  }
}

export default function TeamDetailsPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [teams, setTeams] = useState<HRTeam[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [projects, setProjects] = useState<TeamProject[]>([])
  const [activeTab, setActiveTab] = useState('Overview')
  const [memberQuery, setMemberQuery] = useState('')
  const [editOpen, setEditOpen] = useState(false)
  const [moreOpen, setMoreOpen] = useState(false)
  const [addMemberOpen, setAddMemberOpen] = useState(false)
  const [projectOpen, setProjectOpen] = useState(false)
  const [confirmStatusChange, setConfirmStatusChange] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [openMemberMenuId, setOpenMemberMenuId] = useState<string | null>(null)
  const [editingMemberId, setEditingMemberId] = useState<string | null>(null)
  const [removingMemberId, setRemovingMemberId] = useState<string | null>(null)
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([])
  const [employeeQuery, setEmployeeQuery] = useState('')
  const [notice, setNotice] = useState('')
  const [editForm, setEditForm] = useState({
    name: '',
    code: '',
    department: '',
    location: '',
    type: '',
    costCenter: '',
    budget: '',
    description: '',
    goals: '',
    managerName: '',
    managerTitle: '',
    leadName: '',
    leadTitle: '',
    openPositions: '',
    status: 'Active' as HRTeam['status'],
  })
  const [projectForm, setProjectForm] = useState({ name: '', description: '', status: 'In progress' })
  const [memberForm, setMemberForm] = useState({ position: '', role: '', employmentType: '', status: 'Active' })

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setTeams(ensureTeams())
      setEmployees(loadStored<Employee[]>('flowsys-hr-employees', []))
      setProjects(loadStored<TeamProject[]>('flowsys-hr-team-projects', []))
    }, 0)
    return () => window.clearTimeout(timer)
  }, [])

  const team = teams.find(item => item.id === id)

  const teamProjects = useMemo(() => projects.filter(project => project.teamId === id), [id, projects])

  const availableEmployees = useMemo(() => {
    const existingIds = new Set(team?.members.map(member => member.id) || [])
    const query = employeeQuery.trim().toLowerCase()
    return employees.filter(employee => {
      if (existingIds.has(employee.id)) return false
      const haystack = [fullName(employee), employee.employeeId, employee.email, employee.jobTitle, employee.department].filter(Boolean).join(' ').toLowerCase()
      return !query || haystack.includes(query)
    })
  }, [employeeQuery, employees, team])

  const filteredMembers = useMemo(() => {
    if (!team) return []
    return team.members.filter(member => `${member.name} ${member.position} ${member.role}`.toLowerCase().includes(memberQuery.toLowerCase()))
  }, [memberQuery, team])

  const editingMember = team?.members.find(member => member.id === editingMemberId)
  const removingMember = team?.members.find(member => member.id === removingMemberId)

  function persistTeams(nextTeams: HRTeam[]) {
    setTeams(nextTeams)
    saveStored(storageKey, nextTeams)
  }

  function updateTeam(nextTeam: HRTeam) {
    persistTeams(teams.map(item => item.id === nextTeam.id ? nextTeam : item))
  }

  function openEditTeam() {
    if (!team) return
    setEditForm({
      name: team.name,
      code: team.code || '',
      department: team.department,
      location: team.location || '',
      type: team.type || '',
      costCenter: team.costCenter || '',
      budget: team.budget ? String(team.budget) : '',
      description: team.description || '',
      goals: team.goals || team.responsibilities.join(', '),
      managerName: team.managerName || '',
      managerTitle: team.managerTitle || '',
      leadName: team.leadName || '',
      leadTitle: team.leadTitle || '',
      openPositions: String(team.openPositions || 0),
      status: team.status,
    })
    setNotice('')
    setEditOpen(true)
  }

  function saveTeamEdit() {
    if (!team) return
    const name = editForm.name.trim()
    const department = editForm.department.trim()
    if (!name || !department) {
      setNotice('Team name and department are required.')
      return
    }
    const goals = editForm.goals.trim()
    updateTeam({
      ...team,
      name,
      code: editForm.code.trim(),
      department,
      location: editForm.location.trim(),
      type: editForm.type.trim(),
      costCenter: editForm.costCenter.trim(),
      budget: Number(editForm.budget || 0),
      description: editForm.description.trim(),
      goals,
      responsibilities: goals.split(/[\n,]/).map(item => item.trim()).filter(Boolean).slice(0, 8),
      managerName: editForm.managerName.trim(),
      managerTitle: editForm.managerTitle.trim(),
      leadName: editForm.leadName.trim(),
      leadTitle: editForm.leadTitle.trim(),
      openPositions: Number(editForm.openPositions || 0),
      status: editForm.status,
      updatedAt: new Date().toISOString(),
    })
    setEditOpen(false)
  }

  function toggleTeamStatus() {
    if (!team) return
    const nextStatus = team.status === 'Active' ? 'Inactive' : 'Active'
    updateTeam({ ...team, status: nextStatus, updatedAt: new Date().toISOString() })
    setMoreOpen(false)
    setConfirmStatusChange(false)
  }

  function requestTeamStatusChange() {
    setMoreOpen(false)
    setConfirmStatusChange(true)
  }

  function openAddMemberDialog() {
    setSelectedMemberIds([])
    setEmployeeQuery('')
    setNotice('')
    setAddMemberOpen(true)
  }

  function duplicateTeam() {
    if (!team) return
    const copy: HRTeam = {
      ...team,
      id: `team_${Date.now()}`,
      name: `${team.name} Copy`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    const nextTeams = [...teams, copy]
    persistTeams(nextTeams)
    setMoreOpen(false)
    router.push(`/hr/teams/${copy.id}`)
  }

  function deleteTeam() {
    if (!team) return
    const nextTeams = teams.filter(item => item.id !== team.id)
    const deletedTeams = loadStored<Array<HRTeam & { deletedAt?: string }>>(deletedTeamsKey, [])
    saveStored(deletedTeamsKey, [{ ...team, deletedAt: new Date().toISOString() }, ...deletedTeams.filter(item => item.id !== team.id)])
    persistTeams(nextTeams)
    setConfirmDelete(false)
    router.push('/hr/teams')
  }

  function exportTeam() {
    if (!team) return
    const blob = new Blob([JSON.stringify({ ...team, projects: teamProjects }, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `${team.name.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}-summary.json`
    anchor.click()
    URL.revokeObjectURL(url)
    setMoreOpen(false)
  }

  function toggleSelectedEmployee(employeeId: string) {
    setSelectedMemberIds(previous => previous.includes(employeeId) ? previous.filter(item => item !== employeeId) : [...previous, employeeId])
  }

  function addSelectedMembers() {
    if (!team || selectedMemberIds.length === 0) return
    const newMembers = employees.filter(employee => selectedMemberIds.includes(employee.id)).map(employeeToMember)
    updateTeam({ ...team, members: [...team.members, ...newMembers], updatedAt: new Date().toISOString() })
    setSelectedMemberIds([])
    setEmployeeQuery('')
    setAddMemberOpen(false)
  }

  function createProject() {
    if (!team) return
    const name = projectForm.name.trim()
    if (!name) {
      setNotice('Project name is required.')
      return
    }
    const nextProject: TeamProject = {
      id: `project_${Date.now()}`,
      teamId: team.id,
      name,
      description: projectForm.description.trim(),
      status: projectForm.status,
      createdAt: new Date().toISOString(),
    }
    const nextProjects = [...projects, nextProject]
    setProjects(nextProjects)
    saveStored('flowsys-hr-team-projects', nextProjects)
    updateTeam({ ...team, projects: teamProjects.length + 1, updatedAt: new Date().toISOString() })
    setProjectForm({ name: '', description: '', status: 'In progress' })
    setProjectOpen(false)
  }

  function openMemberEditor(member: TeamMember) {
    setOpenMemberMenuId(null)
    setMemberForm({
      position: member.position || '',
      role: member.role || '',
      employmentType: member.employmentType || '',
      status: member.status || 'Active',
    })
    setEditingMemberId(member.id)
  }

  function saveMemberAssignment() {
    if (!team || !editingMemberId) return
    const nextMembers = team.members.map(member => member.id === editingMemberId ? {
      ...member,
      position: memberForm.position.trim(),
      role: memberForm.role.trim(),
      employmentType: memberForm.employmentType.trim(),
      status: memberForm.status.trim(),
    } : member)
    updateTeam({ ...team, members: nextMembers, updatedAt: new Date().toISOString() })
    setEditingMemberId(null)
  }

  function toggleMemberStatus(member: TeamMember) {
    if (!team) return
    const nextStatus = member.status === 'Active' ? 'Inactive' : 'Active'
    const nextMembers = team.members.map(item => item.id === member.id ? { ...item, status: nextStatus } : item)
    updateTeam({ ...team, members: nextMembers, updatedAt: new Date().toISOString() })
    setOpenMemberMenuId(null)
  }

  function removeMemberFromTeam() {
    if (!team || !removingMemberId) return
    updateTeam({ ...team, members: team.members.filter(member => member.id !== removingMemberId), updatedAt: new Date().toISOString() })
    setRemovingMemberId(null)
  }

  function requestRemoveMember(member: TeamMember) {
    setOpenMemberMenuId(null)
    setRemovingMemberId(member.id)
  }

  if (!team) {
    return (
      <main style={{ fontFamily: font, padding: 24, minHeight: '100vh' }}>
        <div style={{ ...card, padding: 28 }}>
          <h1 style={{ margin: 0, color: '#111827' }}>Team not found</h1>
          <Link href="/hr/teams" style={{ color: '#16a34a', fontWeight: 800 }}>Back to Teams</Link>
        </div>
      </main>
    )
  }

  const fullTime = team.members.filter(member => member.employmentType === 'Full Time').length
  const partTime = team.members.filter(member => member.employmentType === 'Part Time').length
  const contractors = team.members.filter(member => member.employmentType === 'Contractor').length

  return (
    <main style={{ fontFamily: font, padding: '0 20px 32px', minHeight: '100vh' }}>
      <div style={{ padding: '20px 0 18px', fontSize: 12, color: '#000000' }}>
        HR Hub &nbsp;&gt;&nbsp; <Link href="/hr/teams" style={{ color: '#000000', textDecoration: 'none' }}>Teams</Link> &nbsp;&gt;&nbsp; {team.name}
      </div>

      <section style={{ ...card, padding: 24, marginBottom: 16 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 380px', gap: 24 }}>
          <div>
            <div style={{ display: 'flex', gap: 18, alignItems: 'center', marginBottom: 22 }}>
              <div style={{ width: 74, height: 74, borderRadius: '50%', background: '#ede9fe', color: '#7c3aed', display: 'grid', placeItems: 'center', fontSize: 22, fontWeight: 900 }}>{initials(team.name)}</div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <h1 style={{ margin: 0, fontSize: 24, color: '#111827' }}>{team.name}</h1>
                  <span style={{ borderRadius: 999, background: '#dcfce7', color: '#15803d', padding: '4px 9px', fontSize: 11, fontWeight: 800 }}>{team.status}</span>
                </div>
                <div style={{ color: '#000000', fontSize: 13, marginTop: 5 }}>{team.department} Department</div>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, minmax(0, 1fr))', gap: 16 }}>
              <ProfileMetric label="Team Manager" value={team.managerName} sub={team.managerTitle} icon="avatar" />
              <ProfileMetric label="Team Lead" value={team.leadName} sub={team.leadTitle} icon="avatar" />
              <ProfileMetric label="Team Members" value={String(team.members.length)} icon="users" />
              <ProfileMetric label="Open Positions" value={String(team.openPositions)} icon="users" />
              <ProfileMetric label="Projects" value={String(team.projects)} icon="folder" />
              <ProfileMetric label="Created On" value={new Date(team.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} icon="calendar" />
            </div>
          </div>

          <aside style={{ borderLeft: '1px solid #e5e7eb', paddingLeft: 28 }}>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginBottom: 12 }}>
              <button type="button" onClick={openEditTeam} style={{ border: '1px solid #e5e7eb', background: '#fff', borderRadius: 8, padding: '9px 14px', fontSize: 12, fontWeight: 800, cursor: 'pointer' }}>Edit Team</button>
              <div style={{ position: 'relative' }}>
                <button type="button" onClick={() => setMoreOpen(value => !value)} style={{ border: '1px solid #e5e7eb', background: '#fff', borderRadius: 8, padding: '9px 14px', fontSize: 12, fontWeight: 800, cursor: 'pointer' }}>More</button>
                {moreOpen && (
                  <div style={{ position: 'absolute', right: 0, top: 42, width: 190, background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, boxShadow: '0 18px 46px rgba(15,23,42,0.16)', zIndex: 40, overflow: 'hidden' }}>
                    <ActionMenuButton icon={<Edit2 size={14} />} label="Edit details" onClick={openEditTeam} />
                    <ActionMenuButton icon={<Copy size={14} />} label="Duplicate team" onClick={duplicateTeam} />
                    <ActionMenuButton icon={<Download size={14} />} label="Export summary" onClick={exportTeam} />
                    <ActionMenuButton icon={<Users size={14} />} label={team.status === 'Active' ? 'Deactivate team' : 'Activate team'} onClick={requestTeamStatusChange} />
                    <ActionMenuButton danger icon={<Trash2 size={14} />} label="Delete team" onClick={() => { setMoreOpen(false); setConfirmDelete(true) }} />
                  </div>
                )}
              </div>
            </div>
            <strong style={{ display: 'block', color: '#111827', fontSize: 13, marginBottom: 8 }}>About Team</strong>
            <p style={{ margin: '0 0 16px', color: '#374151', fontSize: 12, lineHeight: 1.65 }}>{team.description}</p>
            <strong style={{ display: 'block', color: '#111827', fontSize: 13, marginBottom: 8 }}>Key Responsibilities</strong>
            <div style={{ display: 'grid', gap: 8 }}>
              {team.responsibilities.map(item => <span key={item} style={{ display: 'flex', gap: 8, alignItems: 'center', color: '#374151', fontSize: 12 }}><Check size={14} color="#16a34a" /> {item}</span>)}
            </div>
          </aside>
        </div>
      </section>

      <div style={{ display: 'flex', gap: 22, borderBottom: '1px solid #e5e7eb', marginBottom: 16 }}>
        {tabs.map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)} style={{ border: 'none', borderBottom: `2px solid ${activeTab === tab ? '#16a34a' : 'transparent'}`, background: 'transparent', color: activeTab === tab ? '#16a34a' : '#374151', padding: '13px 0', fontSize: 13, fontWeight: activeTab === tab ? 800 : 600, cursor: 'pointer' }}>
            {tab}{tab === 'Members' ? ` (${team.members.length})` : tab === 'Projects' ? ` (${team.projects})` : tab === 'Open Positions' ? ` (${team.openPositions})` : ''}
          </button>
        ))}
      </div>

      {activeTab === 'Overview' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 370px', gap: 18 }}>
          <section style={{ display: 'grid', gap: 16 }}>
            <MembersTable
              team={team}
              members={filteredMembers.slice(0, 5)}
              query={memberQuery}
              setQuery={setMemberQuery}
              onAddMember={openAddMemberDialog}
              openMemberMenuId={openMemberMenuId}
              setOpenMemberMenuId={setOpenMemberMenuId}
              onEditMember={openMemberEditor}
              onToggleMemberStatus={toggleMemberStatus}
              onRemoveMember={requestRemoveMember}
            />
            <div style={{ ...card, padding: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
                <strong style={{ color: '#111827', fontSize: 15 }}>Recent Activity</strong>
                <button type="button" onClick={() => setActiveTab('Activity')} style={{ border: 'none', background: 'transparent', color: '#16a34a', fontSize: 12, fontWeight: 800 }}>View all activity</button>
              </div>
              {[
                `${team.members[1]?.name || team.leadName} was added to the team`,
                `Project "${team.name} Optimization" was assigned to this team`,
                'Team details were updated',
              ].map((item, index) => (
                <div key={item} style={{ display: 'flex', gap: 12, padding: '9px 0' }}>
                  <div style={{ width: 30, height: 30, borderRadius: 8, background: index === 0 ? '#dcfce7' : index === 1 ? '#dbeafe' : '#ede9fe', display: 'grid', placeItems: 'center' }}>{index === 0 ? <Users size={14} color="#16a34a" /> : index === 1 ? <Folder size={14} color="#2563eb" /> : <FileText size={14} color="#7c3aed" />}</div>
                  <div>
                    <div style={{ color: '#111827', fontSize: 13, fontWeight: 700 }}>{item}</div>
                    <div style={{ color: '#000000', fontSize: 11 }}>Updated by {team.managerName}</div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <aside style={{ display: 'grid', gap: 16, alignSelf: 'start' }}>
            <InfoCard team={team} onToggleStatus={requestTeamStatusChange} />
            <div style={{ ...card, padding: 20 }}>
              <strong style={{ color: '#111827', fontSize: 15 }}>Team Statistics</strong>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 16 }}>
                {[['Total Members', team.members.length], ['Full Time', fullTime], ['Part Time', partTime], ['Contractors', contractors]].map(([label, value]) => (
                  <div key={label} style={{ border: '1px solid #f3f4f6', borderRadius: 10, padding: 14 }}>
                    <div style={{ fontSize: 18, color: '#111827', fontWeight: 900 }}>{value}</div>
                    <div style={{ fontSize: 11, color: '#000000' }}>{label}</div>
                  </div>
                ))}
              </div>
            </div>
            <div style={{ ...card, padding: 20 }}>
              <strong style={{ color: '#111827', fontSize: 15 }}>Quick Actions</strong>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 16 }}>
                <button type="button" onClick={openAddMemberDialog} style={{ border: '1px solid #e5e7eb', background: '#fff', borderRadius: 8, padding: '12px', fontWeight: 800, fontSize: 12, cursor: 'pointer' }}>Add Member</button>
                <button type="button" onClick={() => { setNotice(''); setProjectOpen(true) }} style={{ border: '1px solid #e5e7eb', background: '#fff', borderRadius: 8, padding: '12px', fontWeight: 800, fontSize: 12, cursor: 'pointer' }}>Create Project</button>
              </div>
            </div>
          </aside>
        </div>
      )}

      {activeTab !== 'Overview' && (
        <section style={{ ...card, padding: 20 }}>
          {activeTab === 'Members' && (
            <MembersTable
              team={team}
              members={filteredMembers}
              query={memberQuery}
              setQuery={setMemberQuery}
              onAddMember={openAddMemberDialog}
              openMemberMenuId={openMemberMenuId}
              setOpenMemberMenuId={setOpenMemberMenuId}
              onEditMember={openMemberEditor}
              onToggleMemberStatus={toggleMemberStatus}
              onRemoveMember={requestRemoveMember}
            />
          )}
          {activeTab === 'Projects' && <SimpleGrid title="Projects" rows={teamProjects.map(project => [project.name, project.status, project.description || team.leadName])} empty="No projects created for this team yet." />}
          {activeTab === 'Open Positions' && <SimpleGrid title="Open Positions" rows={Array.from({ length: team.openPositions }, (_, index) => [`Open Role ${index + 1}`, team.department, 'Hiring'])} />}
          {activeTab === 'Performance' && <SimpleGrid title="Performance" rows={[['Delivery health', '92%', 'On track'], ['Quality score', '88%', 'Stable'], ['Team capacity', `${team.members.length} members`, 'Healthy']]} />}
          {activeTab === 'Documents' && <SimpleGrid title="Documents" rows={[['Team charter.pdf', 'Policy', 'Updated'], ['Responsibilities.docx', 'Reference', 'Updated']]} />}
          {activeTab === 'Activity' && <SimpleGrid title="Activity" rows={[['Team details updated', team.managerName, 'Recent'], ['Member roster reviewed', team.leadName, 'Recent'], ['Budget reviewed', team.managerName, 'This month']]} />}
        </section>
      )}

      {editOpen && (
        <Modal title="Edit Team" subtitle="Update the team details shown across HR Hub." onClose={() => setEditOpen(false)}>
          {notice && <Notice message={notice} />}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <Field label="Team name *" value={editForm.name} onChange={value => setEditForm(previous => ({ ...previous, name: value }))} />
            <Field label="Department *" value={editForm.department} onChange={value => setEditForm(previous => ({ ...previous, department: value }))} />
            <Field label="Team code" value={editForm.code} onChange={value => setEditForm(previous => ({ ...previous, code: value }))} />
            <Field label="Location" value={editForm.location} onChange={value => setEditForm(previous => ({ ...previous, location: value }))} />
            <Field label="Team type" value={editForm.type} onChange={value => setEditForm(previous => ({ ...previous, type: value }))} />
            <Field label="Cost center" value={editForm.costCenter} onChange={value => setEditForm(previous => ({ ...previous, costCenter: value }))} />
            <Field label="Budget" type="number" value={editForm.budget} onChange={value => setEditForm(previous => ({ ...previous, budget: value }))} />
            <Field label="Open positions" type="number" value={editForm.openPositions} onChange={value => setEditForm(previous => ({ ...previous, openPositions: value }))} />
            <Field label="Manager name" value={editForm.managerName} onChange={value => setEditForm(previous => ({ ...previous, managerName: value }))} />
            <Field label="Manager title" value={editForm.managerTitle} onChange={value => setEditForm(previous => ({ ...previous, managerTitle: value }))} />
            <Field label="Team lead" value={editForm.leadName} onChange={value => setEditForm(previous => ({ ...previous, leadName: value }))} />
            <Field label="Lead title" value={editForm.leadTitle} onChange={value => setEditForm(previous => ({ ...previous, leadTitle: value }))} />
          </div>
          <TextArea label="About team" value={editForm.description} onChange={value => setEditForm(previous => ({ ...previous, description: value }))} />
          <TextArea label="Key responsibilities" value={editForm.goals} placeholder="Use commas or new lines for each responsibility" onChange={value => setEditForm(previous => ({ ...previous, goals: value }))} />
          <label style={{ display: 'grid', gap: 7, fontSize: 12, fontWeight: 800, color: '#374151' }}>
            Status
            <select value={editForm.status} onChange={event => setEditForm(previous => ({ ...previous, status: event.target.value as HRTeam['status'] }))} style={inputStyle}>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
          </label>
          <ModalFooter onCancel={() => setEditOpen(false)} onConfirm={saveTeamEdit} confirmLabel="Save changes" />
        </Modal>
      )}

      {addMemberOpen && (
        <Modal title="Add Member" subtitle="Search employees and add them to this team." onClose={() => setAddMemberOpen(false)}>
          <label style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Search size={15} color="#000000" />
            <input value={employeeQuery} onChange={event => setEmployeeQuery(event.target.value)} placeholder="Search employees by name, role, email..." style={{ border: 'none', outline: 'none', width: '100%', fontSize: 13 }} />
          </label>
          <div style={{ display: 'grid', gap: 10, maxHeight: 360, overflow: 'auto' }}>
            {availableEmployees.length === 0 ? (
              <div style={{ border: '1px dashed #d1d5db', borderRadius: 10, padding: 18, textAlign: 'center' }}>
                <div style={{ color: '#111827', fontSize: 14, fontWeight: 900, marginBottom: 6 }}>No available employees found.</div>
                <p style={{ margin: '0 0 14px', color: '#000000', fontSize: 12 }}>Employees already in this team are hidden. Create an employee first if the list is empty.</p>
                <Link href="/hr/employees/new" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: '#16a34a', color: '#fff', borderRadius: 8, padding: '9px 13px', fontSize: 12, fontWeight: 900, textDecoration: 'none' }}>
                  <Plus size={14} /> Add employee
                </Link>
              </div>
            ) : availableEmployees.map(employee => {
              const selected = selectedMemberIds.includes(employee.id)
              return (
                <button key={employee.id} onClick={() => toggleSelectedEmployee(employee.id)} style={{ border: `1px solid ${selected ? '#16a34a' : '#e5e7eb'}`, background: selected ? '#f0fdf4' : '#fff', borderRadius: 10, padding: 12, display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', textAlign: 'left', fontFamily: font }}>
                  <PersonAvatar name={fullName(employee) || employee.email || 'Employee'} photo={employee.photo} size={38} />
                  <div style={{ flex: 1 }}>
                    <strong style={{ color: '#111827', fontSize: 13 }}>{fullName(employee) || employee.email || 'Employee'}</strong>
                    <div style={{ color: '#000000', fontSize: 11 }}>{employee.jobTitle || 'No role'}{employee.department ? ` - ${employee.department}` : ''}</div>
                  </div>
                  <span style={{ width: 24, height: 24, borderRadius: '50%', border: `1px solid ${selected ? '#16a34a' : '#d1d5db'}`, display: 'grid', placeItems: 'center', color: selected ? '#16a34a' : '#000000' }}>{selected ? <Check size={14} /> : <Plus size={14} />}</span>
                </button>
              )
            })}
          </div>
          <ModalFooter onCancel={() => setAddMemberOpen(false)} onConfirm={addSelectedMembers} confirmLabel={`Add ${selectedMemberIds.length || ''} member${selectedMemberIds.length === 1 ? '' : 's'}`} />
        </Modal>
      )}

      {projectOpen && (
        <Modal title="Create Project" subtitle="Add a project connected to this team." onClose={() => setProjectOpen(false)}>
          {notice && <Notice message={notice} />}
          <Field label="Project name *" value={projectForm.name} onChange={value => setProjectForm(previous => ({ ...previous, name: value }))} />
          <TextArea label="Description" value={projectForm.description} onChange={value => setProjectForm(previous => ({ ...previous, description: value }))} />
          <label style={{ display: 'grid', gap: 7, fontSize: 12, fontWeight: 800, color: '#374151' }}>
            Status
            <select value={projectForm.status} onChange={event => setProjectForm(previous => ({ ...previous, status: event.target.value }))} style={inputStyle}>
              <option>In progress</option>
              <option>Planning</option>
              <option>Done</option>
              <option>On hold</option>
            </select>
          </label>
          <ModalFooter onCancel={() => setProjectOpen(false)} onConfirm={createProject} confirmLabel="Create project" />
        </Modal>
      )}

      {confirmStatusChange && (
        <Modal title={team.status === 'Active' ? 'Deactivate Team' : 'Activate Team'} subtitle={team.status === 'Active' ? 'Pause this team without deleting employees or records.' : 'Make this team active again.'} onClose={() => setConfirmStatusChange(false)}>
          <div style={{ color: '#374151', fontSize: 13, lineHeight: 1.6 }}>
            {team.status === 'Active'
              ? <>Deactivate <strong>{team.name}</strong>? You can activate it again later.</>
              : <>Activate <strong>{team.name}</strong> and show it as active in HR Hub?</>}
          </div>
          <ModalFooter danger={team.status === 'Active'} onCancel={() => setConfirmStatusChange(false)} onConfirm={toggleTeamStatus} confirmLabel={team.status === 'Active' ? 'Deactivate team' : 'Activate team'} />
        </Modal>
      )}

      {editingMember && (
        <Modal title="Edit Member Assignment" subtitle={`Update ${editingMember.name}'s role inside this team.`} onClose={() => setEditingMemberId(null)}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <Field label="Position" value={memberForm.position} onChange={value => setMemberForm(previous => ({ ...previous, position: value }))} />
            <Field label="Team role" value={memberForm.role} onChange={value => setMemberForm(previous => ({ ...previous, role: value }))} />
            <Field label="Employment type" value={memberForm.employmentType} onChange={value => setMemberForm(previous => ({ ...previous, employmentType: value }))} />
            <label style={{ display: 'grid', gap: 7, fontSize: 12, fontWeight: 800, color: '#374151' }}>
              Status
              <select value={memberForm.status} onChange={event => setMemberForm(previous => ({ ...previous, status: event.target.value }))} style={inputStyle}>
                <option>Active</option>
                <option>Inactive</option>
                <option>On Leave</option>
              </select>
            </label>
          </div>
          <ModalFooter onCancel={() => setEditingMemberId(null)} onConfirm={saveMemberAssignment} confirmLabel="Save member" />
        </Modal>
      )}

      {removingMember && (
        <Modal title="Remove Member" subtitle="This only removes the employee from this team." onClose={() => setRemovingMemberId(null)}>
          <div style={{ color: '#374151', fontSize: 13, lineHeight: 1.6 }}>Remove <strong>{removingMember.name}</strong> from <strong>{team.name}</strong>? Their employee profile will stay in HR Hub.</div>
          <ModalFooter danger onCancel={() => setRemovingMemberId(null)} onConfirm={removeMemberFromTeam} confirmLabel="Remove member" />
        </Modal>
      )}

      {confirmDelete && (
        <Modal title="Delete Team" subtitle="The team will move to Deleted Teams first." onClose={() => setConfirmDelete(false)}>
          <div style={{ color: '#374151', fontSize: 13, lineHeight: 1.6 }}>Move <strong>{team.name}</strong> to Deleted Teams? Employees are not deleted, and you can restore this team later.</div>
          <ModalFooter danger onCancel={() => setConfirmDelete(false)} onConfirm={deleteTeam} confirmLabel="Move to Deleted Teams" />
        </Modal>
      )}
    </main>
  )
}

function ProfileMetric({ label, value, sub, icon }: { label: string; value: string; sub?: string; icon: string }) {
  const Icon = icon === 'folder' ? Folder : icon === 'calendar' ? Calendar : icon === 'users' ? Users : null
  return (
    <div>
      <div style={{ color: '#000000', fontSize: 11, marginBottom: 8 }}>{label}</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {Icon ? <Icon size={15} color="#000000" /> : <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#e5e7eb', display: 'grid', placeItems: 'center', fontSize: 10, fontWeight: 800 }}>{initials(value)}</div>}
        <div>
          <strong style={{ display: 'block', color: '#111827', fontSize: 13 }}>{value}</strong>
          {sub && <span style={{ color: '#000000', fontSize: 11 }}>{sub}</span>}
        </div>
      </div>
    </div>
  )
}

function MembersTable({
  team,
  members,
  query,
  setQuery,
  onAddMember,
  openMemberMenuId,
  setOpenMemberMenuId,
  onEditMember,
  onToggleMemberStatus,
  onRemoveMember,
}: {
  team: HRTeam
  members: HRTeam['members']
  query: string
  setQuery: (value: string) => void
  onAddMember: () => void
  openMemberMenuId: string | null
  setOpenMemberMenuId: (value: string | null) => void
  onEditMember: (member: TeamMember) => void
  onToggleMemberStatus: (member: TeamMember) => void
  onRemoveMember: (member: TeamMember) => void
}) {
  return (
    <div style={{ ...card, padding: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', marginBottom: 16 }}>
        <strong style={{ color: '#111827', fontSize: 15 }}>Team Members</strong>
        <div style={{ display: 'flex', gap: 10 }}>
          <label style={{ width: 260, border: '1px solid #e5e7eb', borderRadius: 8, padding: '9px 12px', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Search size={15} color="#000000" />
            <input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search team members..." style={{ border: 'none', outline: 'none', fontSize: 12, width: '100%' }} />
          </label>
          <button type="button" onClick={onAddMember} style={{ border: '1px solid #16a34a', background: '#fff', color: '#16a34a', borderRadius: 8, padding: '9px 14px', fontSize: 12, fontWeight: 800, display: 'flex', gap: 7, alignItems: 'center', cursor: 'pointer' }}><Plus size={14} /> Add Member</button>
        </div>
      </div>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
        <thead>
          <tr style={{ color: '#000000', borderBottom: '1px solid #f3f4f6' }}>
            {['Employee', 'Position', 'Role', 'Employment Type', 'Status', 'Actions'].map(header => <th key={header} style={{ padding: '10px 12px', textAlign: 'left', fontSize: 11, fontWeight: 800 }}>{header}</th>)}
          </tr>
        </thead>
        <tbody>
          {members.map(member => (
            <tr key={member.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
              <td style={{ padding: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <PersonAvatar name={member.name} photo={member.photo} size={36} />
                  <div><strong style={{ color: '#111827' }}>{member.name}</strong><div style={{ color: '#000000', fontSize: 11 }}>{member.employeeId}</div></div>
                </div>
              </td>
              <td style={{ padding: '12px', color: '#374151' }}>{member.position}</td>
              <td style={{ padding: '12px' }}><span style={{ background: '#ede9fe', color: '#7c3aed', borderRadius: 999, padding: '4px 9px', fontSize: 11, fontWeight: 800 }}>{member.role}</span></td>
              <td style={{ padding: '12px', color: '#374151' }}>{member.employmentType}</td>
              <td style={{ padding: '12px' }}><span style={{ background: member.status === 'Active' ? '#dcfce7' : '#f3f4f6', color: member.status === 'Active' ? '#15803d' : '#000000', borderRadius: 999, padding: '4px 9px', fontSize: 11, fontWeight: 800 }}>{member.status || 'Active'}</span></td>
              <td style={{ padding: '12px', position: 'relative' }}>
                <button type="button" aria-label={`Actions for ${member.name}`} onClick={() => setOpenMemberMenuId(openMemberMenuId === member.id ? null : member.id)} style={{ border: '1px solid transparent', background: 'transparent', width: 32, height: 32, borderRadius: 8, display: 'grid', placeItems: 'center', cursor: 'pointer' }}>
                  <MoreHorizontal size={15} color="#000000" />
                </button>
                {openMemberMenuId === member.id && (
                  <div style={{ position: 'absolute', top: 42, right: 8, width: 190, background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, boxShadow: '0 18px 46px rgba(15,23,42,0.16)', zIndex: 30, overflow: 'hidden' }}>
                    <Link href={`/hr/employees/${member.id}`} style={{ textDecoration: 'none' }} onClick={() => setOpenMemberMenuId(null)}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 9, color: '#374151', padding: '10px 12px', fontSize: 12, fontWeight: 800 }}>
                        <Users size={14} /> View employee
                      </span>
                    </Link>
                    <ActionMenuButton icon={<Edit2 size={14} />} label="Edit assignment" onClick={() => onEditMember(member)} />
                    <ActionMenuButton icon={<Check size={14} />} label={member.status === 'Active' ? 'Mark inactive' : 'Mark active'} onClick={() => onToggleMemberStatus(member)} />
                    <ActionMenuButton danger icon={<UserMinus size={14} />} label="Remove from team" onClick={() => onRemoveMember(member)} />
                  </div>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {members.length < team.members.length && <button type="button" style={{ border: 'none', background: 'transparent', color: '#2563eb', fontSize: 12, fontWeight: 800, marginTop: 14, cursor: 'pointer' }}>View all {team.members.length} members</button>}
    </div>
  )
}

function InfoCard({ team, onToggleStatus }: { team: HRTeam; onToggleStatus: () => void }) {
  return (
    <div style={{ ...card, padding: 20 }}>
      <strong style={{ color: '#111827', fontSize: 15 }}>Team Details</strong>
      <div style={{ display: 'grid', gap: 10, marginTop: 16 }}>
        {[
          ['Team Name', team.name],
          ['Department', team.department],
          ['Team Manager', team.managerName],
          ['Team Lead', team.leadName],
          ['Status', team.status],
          ['Created On', new Date(team.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })],
        ].map(([label, value]) => (
          <div key={label} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, fontSize: 12 }}>
            <span style={{ color: '#000000' }}>{label}</span>
            <strong style={{ color: value === 'Active' ? '#16a34a' : '#111827' }}>{value}</strong>
          </div>
        ))}
      </div>
      <button type="button" onClick={onToggleStatus} style={{ width: '100%', marginTop: 18, border: '1px solid #fecaca', background: '#fff', color: '#ef4444', borderRadius: 8, padding: '10px', fontSize: 12, fontWeight: 800, cursor: 'pointer' }}>{team.status === 'Active' ? 'Deactivate Team' : 'Activate Team'}</button>
    </div>
  )
}

function SimpleGrid({ title, rows, empty = 'No records yet.' }: { title: string; rows: string[][]; empty?: string }) {
  return (
    <>
      <strong style={{ display: 'block', color: '#111827', fontSize: 15, marginBottom: 14 }}>{title}</strong>
      <div style={{ display: 'grid', gap: 10 }}>
        {rows.length === 0 ? <EmptyText text={empty} /> : rows.map(row => (
          <div key={row.join('-')} style={{ display: 'grid', gridTemplateColumns: '1fr 160px 120px', gap: 14, border: '1px solid #f3f4f6', borderRadius: 10, padding: 14, color: '#374151', fontSize: 13 }}>
            <strong style={{ color: '#111827' }}>{row[0]}</strong>
            <span>{row[1]}</span>
            <span style={{ color: '#16a34a', fontWeight: 800 }}>{row[2]}</span>
          </div>
        ))}
      </div>
    </>
  )
}

function ActionMenuButton({ icon, label, onClick, danger = false }: { icon: ReactNode; label: string; onClick: () => void; danger?: boolean }) {
  return (
    <button type="button" onClick={onClick} style={{ width: '100%', border: 'none', background: '#fff', color: danger ? '#dc2626' : '#374151', padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 9, fontSize: 12, fontWeight: 800, cursor: 'pointer', fontFamily: font, textAlign: 'left' }}>
      {icon}
      {label}
    </button>
  )
}

function Modal({ title, subtitle, children, onClose }: { title: string; subtitle: string; children: ReactNode; onClose: () => void }) {
  return (
    <div role="dialog" aria-modal="true" style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.45)', display: 'grid', placeItems: 'center', zIndex: 100, padding: 20 }}>
      <section style={{ width: 'min(760px, 100%)', maxHeight: '88vh', overflow: 'auto', background: '#fff', borderRadius: 14, boxShadow: '0 30px 90px rgba(15,23,42,0.24)', border: '1px solid #e5e7eb' }}>
        <div style={{ padding: '18px 20px', borderBottom: '1px solid #f3f4f6', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
          <div>
            <h2 style={{ margin: 0, color: '#111827', fontSize: 18, fontWeight: 900 }}>{title}</h2>
            <p style={{ margin: '4px 0 0', color: '#000000', fontSize: 12 }}>{subtitle}</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close dialog" style={{ width: 34, height: 34, border: '1px solid #e5e7eb', borderRadius: 8, background: '#fff', display: 'grid', placeItems: 'center', cursor: 'pointer' }}><X size={16} /></button>
        </div>
        <div style={{ padding: 20, display: 'grid', gap: 14 }}>{children}</div>
      </section>
    </div>
  )
}

function ModalFooter({ onCancel, onConfirm, confirmLabel, danger = false }: { onCancel: () => void; onConfirm: () => void; confirmLabel: string; danger?: boolean }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, borderTop: '1px solid #f3f4f6', paddingTop: 16 }}>
      <button type="button" onClick={onCancel} style={{ border: '1px solid #e5e7eb', background: '#fff', color: '#374151', borderRadius: 8, padding: '10px 16px', fontSize: 12, fontWeight: 800, cursor: 'pointer' }}>Cancel</button>
      <button type="button" onClick={onConfirm} style={{ border: 'none', background: danger ? '#dc2626' : '#16a34a', color: '#fff', borderRadius: 8, padding: '10px 16px', fontSize: 12, fontWeight: 900, cursor: 'pointer' }}>{confirmLabel}</button>
    </div>
  )
}

function Field({ label, value, onChange, placeholder, type = 'text' }: { label: string; value: string; onChange: (value: string) => void; placeholder?: string; type?: string }) {
  return (
    <label style={{ display: 'grid', gap: 7, fontSize: 12, fontWeight: 800, color: '#374151' }}>
      {label}
      <input type={type} value={value} placeholder={placeholder} onChange={event => onChange(event.target.value)} style={inputStyle} />
    </label>
  )
}

function TextArea({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (value: string) => void; placeholder?: string }) {
  return (
    <label style={{ display: 'grid', gap: 7, fontSize: 12, fontWeight: 800, color: '#374151' }}>
      {label}
      <textarea value={value} placeholder={placeholder} onChange={event => onChange(event.target.value)} style={{ ...inputStyle, minHeight: 86, resize: 'vertical' }} />
    </label>
  )
}

function Notice({ message }: { message: string }) {
  return <div style={{ background: '#fee2e2', color: '#b91c1c', borderRadius: 8, padding: '10px 12px', fontSize: 12, fontWeight: 800 }}>{message}</div>
}

function EmptyText({ text }: { text: string }) {
  return <div style={{ border: '1px dashed #d1d5db', borderRadius: 10, padding: 18, textAlign: 'center', color: '#000000', fontSize: 13 }}>{text}</div>
}

function PersonAvatar({ name, photo, size }: { name: string; photo?: string; size: number }) {
  return (
    <div
      title={name}
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        border: photo ? '1px solid #e5e7eb' : 'none',
        background: photo ? '#fff' : '#dcfce7',
        color: '#15803d',
        display: 'grid',
        placeItems: 'center',
        fontSize: size <= 32 ? 10 : 12,
        fontWeight: 900,
        overflow: 'hidden',
        flexShrink: 0,
      }}
    >
      {photo ? (
        <span role="img" aria-label={name} style={{ width: '100%', height: '100%', backgroundImage: `url(${photo})`, backgroundSize: 'cover', backgroundPosition: 'center' }} />
      ) : (
        initials(name)
      )}
    </div>
  )
}
