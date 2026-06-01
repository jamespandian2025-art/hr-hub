'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import {
  Building2, Check, Edit2, Eye, Filter, Mail, MoreHorizontal,
  Plus, Search, Settings, Trash2, Users, UserRoundCheck, X,
} from 'lucide-react'
import { Employee, ensureTeams, fullName, HRTeam, initials, loadStored, saveStored, TeamMember } from './teamData'

const font = "var(--font-body)"
const card = { background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, boxShadow: '0 1px 4px rgba(15,23,42,0.05)' }
const teamsKey = 'flowsys-hr-teams'
const deletedTeamsKey = 'flowsys-hr-deleted-teams'

const departmentColors = ['#22c55e', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444', '#14b8a6']
const legacySampleTeamIds = new Set(['team_platform', 'team_backend', 'team_frontend', 'team_hr_ops'])
const legacySampleDepartmentNames = new Set(['engineering', 'human resources', 'marketing'])

interface HRDepartment {
  id: string
  name: string
  code?: string
  manager?: string
  color: string
  createdAt: string
  updatedAt: string
}

type FloatingMenuPosition = { top: number; left: number }

function departmentId(name: string) {
  return `dept_${name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '')}`
}

function seedDepartments(teams: HRTeam[]) {
  return Array.from(new Set(teams.map(team => team.department).filter(Boolean))).map((name, index) => ({
    id: departmentId(name),
    name,
    code: initials(name),
    manager: teams.find(team => team.department === name)?.managerName || '',
    color: departmentColors[index % departmentColors.length],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }))
}

function isLegacySampleTeam(team: HRTeam) {
  return legacySampleTeamIds.has(team.id)
}

function hasNonLegacyTeams(department: string, teams: HRTeam[]) {
  return teams.some(team => team.department === department && !isLegacySampleTeam(team))
}

function removeLegacySampleData(teams: HRTeam[], departments: HRDepartment[]) {
  const realTeams = teams.filter(team => !isLegacySampleTeam(team))
  const realDepartments = departments.filter(department => {
    const name = normalize(department.name)
    if (!legacySampleDepartmentNames.has(name)) return true
    return hasNonLegacyTeams(department.name, teams)
  })
  return { realTeams, realDepartments }
}

function normalize(value?: string) {
  return (value || '').trim().toLowerCase()
}

function findEmployeeForMember(member: TeamMember, employees: Employee[]) {
  return employees.find(employee => {
    const employeeName = fullName(employee)
    return employee.id === member.id
      || normalize(employee.employeeId) === normalize(member.employeeId)
      || normalize(employee.email) === normalize(member.email)
      || normalize(employeeName) === normalize(member.name)
  })
}

function findEmployeeByName(name: string, employees: Employee[]) {
  return employees.find(employee => normalize(fullName(employee)) === normalize(name))
}

function employeeDisplayName(employee: Employee) {
  return [employee.firstName, employee.middleName, employee.lastName].filter(Boolean).join(' ').trim()
    || employee.email
    || employee.employeeId
    || ''
}

function isActiveEmployee(employee: Employee) {
  const status = normalize(employee.employmentStatus)
  return !status || status === 'active' || status === 'probationary'
}

function hasLeadershipRole(employee: Employee) {
  const text = [employee.employeeRole, employee.employeeType, employee.jobTitle].filter(Boolean).join(' ').toLowerCase()
  return /\b(manager|lead|supervisor|head|director)\b/.test(text)
}

function hydrateTeamPhotos(teams: HRTeam[], employees: Employee[]) {
  if (!employees.length) return teams

  return teams.map(team => {
    const manager = findEmployeeByName(team.managerName, employees)
    const lead = findEmployeeByName(team.leadName, employees)
    return {
      ...team,
      managerPhoto: manager?.photo || team.managerPhoto,
      leadPhoto: lead?.photo || team.leadPhoto,
      members: team.members.map(member => {
        const employee = findEmployeeForMember(member, employees)
        return {
          ...member,
          photo: employee?.photo || member.photo,
          email: employee?.email || member.email,
          position: employee?.jobTitle || member.position,
        }
      }),
    }
  })
}

export default function HrTeamsPage() {
  const [teams, setTeams] = useState<HRTeam[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [departmentRecords, setDepartmentRecords] = useState<HRDepartment[]>([])
  const [selectedDepartment, setSelectedDepartment] = useState('All Departments')
  const [selectedTeamId, setSelectedTeamId] = useState<string>()
  const [query, setQuery] = useState('')
  const [departmentModal, setDepartmentModal] = useState<'add' | 'manage' | null>(null)
  const [departmentForm, setDepartmentForm] = useState({ id: '', name: '', code: '', manager: '', color: departmentColors[0] })
  const [departmentError, setDepartmentError] = useState('')
  const [statusFilter, setStatusFilter] = useState<'All Status' | 'Active' | 'Inactive'>('All Status')
  const [showFilters, setShowFilters] = useState(false)
  const [openTeamMenuId, setOpenTeamMenuId] = useState<string | null>(null)
  const [teamMenuPosition, setTeamMenuPosition] = useState<FloatingMenuPosition>({ top: 0, left: 0 })

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const employees = loadStored<Employee[]>('flowsys-hr-employees', [])
      const storedTeams = ensureTeams()
      const storedDepartments = loadStored<HRDepartment[]>('flowsys-hr-departments', [])
      const cleaned = removeLegacySampleData(storedTeams, storedDepartments)
      const loaded = hydrateTeamPhotos(cleaned.realTeams, employees)
      const seededDepartments = seedDepartments(loaded)
      const mergedDepartments = [
        ...cleaned.realDepartments,
        ...seededDepartments.filter(seeded => !cleaned.realDepartments.some(stored => stored.name === seeded.name)),
      ]
      if (mergedDepartments.length !== storedDepartments.length) saveStored('flowsys-hr-departments', mergedDepartments)
      saveStored(teamsKey, loaded)
      setEmployees(employees)
      setTeams(loaded)
      setDepartmentRecords(mergedDepartments)
      setSelectedTeamId(loaded[0]?.id)
    }, 0)
    return () => window.clearTimeout(timer)
  }, [])

  const departments = useMemo(() => {
    const names = Array.from(new Set([...departmentRecords.map(department => department.name), ...teams.map(team => team.department)].filter(Boolean)))
    return ['All Departments', ...names]
  }, [departmentRecords, teams])

  const departmentCounts = useMemo(() => {
    return departments.map((department, index) => ({
      name: department,
      count: department === 'All Departments'
        ? teams.length
        : teams.filter(team => normalize(team.department) === normalize(department)).length,
      color: departmentRecords.find(record => record.name === department)?.color || departmentColors[index % departmentColors.length],
    }))
  }, [departmentRecords, departments, teams])

  const filteredTeams = useMemo(() => {
    return teams.filter(team => {
      const matchesDepartment = selectedDepartment === 'All Departments' || normalize(team.department) === normalize(selectedDepartment)
      const matchesStatus = statusFilter === 'All Status' || team.status === statusFilter
      const haystack = `${team.name} ${team.managerName} ${team.department} ${team.description}`.toLowerCase()
      return matchesDepartment && matchesStatus && haystack.includes(query.toLowerCase())
    })
  }, [query, selectedDepartment, statusFilter, teams])

  const selectedTeam = filteredTeams.find(team => team.id === selectedTeamId) || filteredTeams[0]
  const departmentsOnly = departments.filter(department => department !== 'All Departments')
  const addTeamHref = selectedDepartment === 'All Departments'
    ? '/hr/teams/new'
    : `/hr/teams/new?department=${encodeURIComponent(selectedDepartment)}`
  const managers = teams.filter(team => team.managerName).length
  const departmentManagerOptions = useMemo(() => {
    const optionMap = new Map<string, { value: string; label: string }>()
    employees
      .filter(employee => isActiveEmployee(employee) && hasLeadershipRole(employee))
      .forEach(employee => {
        const name = employeeDisplayName(employee)
        if (!name) return
        optionMap.set(normalize(name), {
          value: name,
          label: `${name}${employee.jobTitle ? ` - ${employee.jobTitle}` : ''}`,
        })
      })

    const options = Array.from(optionMap.values())

    if (departmentForm.manager && !options.some(option => normalize(option.value) === normalize(departmentForm.manager))) {
      options.push({ value: departmentForm.manager, label: `${departmentForm.manager} (saved)` })
    }

    return options.sort((a, b) => a.label.localeCompare(b.label))
  }, [departmentForm.manager, employees])

  function openAddDepartment() {
    setDepartmentForm({ id: '', name: '', code: '', manager: '', color: departmentColors[departmentRecords.length % departmentColors.length] })
    setDepartmentError('')
    setDepartmentModal('add')
  }

  function openEditDepartment(department: HRDepartment) {
    setDepartmentForm({ id: department.id, name: department.name, code: department.code || '', manager: department.manager || '', color: department.color })
    setDepartmentError('')
    setDepartmentModal('add')
  }

  function saveDepartment() {
    const name = departmentForm.name.trim()
    if (!name) {
      setDepartmentError('Department name is required.')
      return
    }
    const duplicate = departmentRecords.some(department => department.name.toLowerCase() === name.toLowerCase() && department.id !== departmentForm.id)
    if (duplicate) {
      setDepartmentError('A department with this name already exists.')
      return
    }

    const previousName = departmentRecords.find(department => department.id === departmentForm.id)?.name
    const nextDepartment: HRDepartment = {
      id: departmentForm.id || departmentId(name),
      name,
      code: departmentForm.code.trim() || initials(name),
      manager: departmentForm.manager.trim(),
      color: departmentForm.color,
      createdAt: departmentRecords.find(department => department.id === departmentForm.id)?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    const nextDepartments = departmentForm.id
      ? departmentRecords.map(department => department.id === departmentForm.id ? nextDepartment : department)
      : [...departmentRecords, nextDepartment]
    setDepartmentRecords(nextDepartments)
    saveStored('flowsys-hr-departments', nextDepartments)

    if (previousName && previousName !== name) {
      const nextTeams = teams.map(team => team.department === previousName ? { ...team, department: name, updatedAt: new Date().toISOString() } : team)
      setTeams(nextTeams)
      saveStored(teamsKey, nextTeams)
      if (selectedDepartment === previousName) setSelectedDepartment(name)
    } else if (!departmentForm.id) {
      setSelectedDepartment(name)
    }

    setDepartmentModal(null)
    setDepartmentError('')
  }

  function deleteDepartment(department: HRDepartment) {
    const hasTeams = teams.some(team => team.department === department.name)
    if (hasTeams) {
      setDepartmentError('Move or rename teams in this department before deleting it.')
      return
    }
    const nextDepartments = departmentRecords.filter(item => item.id !== department.id)
    setDepartmentRecords(nextDepartments)
    saveStored('flowsys-hr-departments', nextDepartments)
    if (selectedDepartment === department.name) setSelectedDepartment('All Departments')
  }

  function deleteTeam(team: HRTeam) {
    const nextTeams = teams.filter(item => item.id !== team.id)
    const deletedTeams = loadStored<Array<HRTeam & { deletedAt?: string }>>(deletedTeamsKey, [])
    setTeams(nextTeams)
    saveStored(teamsKey, nextTeams)
    saveStored(deletedTeamsKey, [{ ...team, deletedAt: new Date().toISOString() }, ...deletedTeams.filter(item => item.id !== team.id)])
    if (selectedTeamId === team.id) setSelectedTeamId(nextTeams[0]?.id)
    setOpenTeamMenuId(null)
  }

  function toggleTeamMenu(teamId: string, event: React.MouseEvent<HTMLButtonElement>) {
    event.stopPropagation()
    if (openTeamMenuId === teamId) {
      setOpenTeamMenuId(null)
      return
    }
    const rect = event.currentTarget.getBoundingClientRect()
    const menuWidth = 178
    const menuHeight = 142
    setTeamMenuPosition({
      top: Math.max(12, Math.min(rect.bottom + 8, window.innerHeight - menuHeight - 12)),
      left: Math.max(12, Math.min(rect.right - menuWidth, window.innerWidth - menuWidth - 12)),
    })
    setOpenTeamMenuId(teamId)
  }

  return (
    <main style={{ fontFamily: font, padding: '0 20px 32px', minHeight: '100vh' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14, padding: '20px 0 18px', flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ margin: 0, color: '#0f172a', fontSize: 28, fontWeight: 900 }}>Teams</h1>
          <p style={{ margin: '6px 0 0', color: '#475569', fontSize: 14 }}>Manage departments, teams, managers, members, and reporting lines across your organization.</p>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <Link href="/hr/teams/deleted" style={{ textDecoration: 'none' }}>
            <button style={{ border: '1px solid #fecaca', background: '#fff', color: '#dc2626', borderRadius: 8, padding: '10px 14px', fontSize: 12, fontWeight: 700, display: 'flex', gap: 8, alignItems: 'center', cursor: 'pointer' }}>
              <Trash2 size={14} /> Deleted Teams
            </button>
          </Link>
          <button onClick={openAddDepartment} style={{ border: '1px solid #e5e7eb', background: '#fff', color: '#111827', borderRadius: 8, padding: '10px 14px', fontSize: 12, fontWeight: 700, display: 'flex', gap: 8, alignItems: 'center', cursor: 'pointer' }}>
            <Plus size={14} /> Add Department
          </button>
          <Link href={addTeamHref} style={{ textDecoration: 'none' }}>
            <button style={{ border: 'none', background: '#16a34a', color: '#fff', borderRadius: 8, padding: '10px 16px', fontSize: 12, fontWeight: 800, display: 'flex', gap: 8, alignItems: 'center', cursor: 'pointer' }}>
              <Plus size={15} /> Add Team
            </button>
          </Link>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, minmax(0, 1fr))', gap: 14, marginBottom: 18 }}>
        {[
          { label: 'Total Departments', value: departmentsOnly.length, icon: Building2, color: '#16a34a', bg: '#dcfce7' },
          { label: 'Total Teams', value: teams.length, icon: Users, color: '#2563eb', bg: '#dbeafe' },
          { label: 'Total Employees', value: teams.reduce((sum, team) => sum + team.members.length, 0), icon: Users, color: '#7c3aed', bg: '#ede9fe' },
          { label: 'Avg. Team Size', value: teams.length ? (teams.reduce((sum, team) => sum + team.members.length, 0) / teams.length).toFixed(1) : '0', icon: UserRoundCheck, color: '#d97706', bg: '#fef3c7' },
          { label: 'Managers', value: managers, icon: UserRoundCheck, color: '#16a34a', bg: '#dcfce7' },
        ].map(item => {
          const Icon = item.icon
          return (
            <div key={item.label} style={{ ...card, padding: '20px 22px', display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{ width: 54, height: 54, borderRadius: 16, background: item.bg, display: 'grid', placeItems: 'center' }}><Icon size={25} color={item.color} /></div>
              <div>
                <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 5 }}>{item.label}</div>
                <div style={{ fontSize: 24, fontWeight: 800, color: '#111827' }}>{item.value}</div>
              </div>
            </div>
          )
        })}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '280px minmax(520px, 1fr) 330px', gap: 16 }}>
        <section style={{ ...card, overflow: 'hidden' }}>
          <div style={{ padding: '18px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f3f4f6' }}>
            <strong style={{ fontSize: 14, color: '#111827' }}>Departments</strong>
            <button onClick={openAddDepartment} aria-label="Add department" style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#374151' }}><Plus size={16} /></button>
          </div>
          <div style={{ padding: 12, display: 'grid', gap: 6 }}>
            {departmentCounts.map(department => (
              <button key={department.name} onClick={() => { setSelectedDepartment(department.name); setSelectedTeamId(undefined) }} style={{ border: 'none', borderRadius: 9, padding: '12px 14px', background: selectedDepartment === department.name ? '#dcfce7' : 'transparent', color: selectedDepartment === department.name ? '#15803d' : '#374151', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', fontFamily: font }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, fontWeight: 700 }}>
                  <Building2 size={16} color={department.color} /> {department.name}
                </span>
                <span style={{ fontSize: 12 }}>{department.count}</span>
              </button>
            ))}
          </div>
          <div style={{ padding: 16, borderTop: '1px solid #f3f4f6' }}>
            <button onClick={() => { setDepartmentError(''); setDepartmentModal('manage') }} style={{ width: '100%', border: '1px solid #e5e7eb', background: '#fff', borderRadius: 8, padding: '10px', fontSize: 12, fontWeight: 800, color: '#374151', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, cursor: 'pointer' }}>
              <Settings size={14} /> Manage Departments
            </button>
          </div>
        </section>

        <section style={{ ...card, overflow: 'hidden' }}>
          <div style={{ padding: '16px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, borderBottom: '1px solid #f3f4f6' }}>
            <strong style={{ fontSize: 14, color: '#111827' }}>Teams in {selectedDepartment === 'All Departments' ? 'All Departments' : selectedDepartment} ({filteredTeams.length})</strong>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <label style={{ width: 280, border: '1px solid #e5e7eb', borderRadius: 8, padding: '9px 12px', display: 'flex', alignItems: 'center', gap: 8 }}>
                <Search size={15} color="#9ca3af" />
                <input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search teams..." style={{ border: 'none', outline: 'none', width: '100%', fontSize: 12 }} />
              </label>
              <div style={{ position: 'relative' }}>
                <button onClick={() => setShowFilters(value => !value)} style={{ width: 40, height: 40, border: '1px solid #e5e7eb', background: showFilters ? '#f0fdf4' : '#fff', color: showFilters ? '#16a34a' : '#111827', borderRadius: 8, display: 'grid', placeItems: 'center', cursor: 'pointer' }}><Filter size={15} /></button>
                {showFilters && (
                  <div style={{ position: 'absolute', top: 46, right: 0, width: 180, background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, boxShadow: '0 16px 40px rgba(15,23,42,0.14)', zIndex: 20, overflow: 'hidden' }}>
                    {(['All Status', 'Active', 'Inactive'] as const).map(status => (
                      <button key={status} onClick={() => { setStatusFilter(status); setShowFilters(false) }} style={{ width: '100%', border: 'none', background: statusFilter === status ? '#f0fdf4' : '#fff', color: statusFilter === status ? '#15803d' : '#374151', padding: '10px 12px', textAlign: 'left', fontSize: 12, fontWeight: 800, cursor: 'pointer', fontFamily: font }}>
                        {status}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#f9fafb', color: '#6b7280' }}>
                {['Team Name', 'Manager', 'Members', 'Description', 'Actions'].map(header => <th key={header} style={{ padding: '13px 16px', textAlign: 'left', fontSize: 11, fontWeight: 800 }}>{header}</th>)}
              </tr>
          </thead>
          <tbody>
              {filteredTeams.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ padding: '46px 18px', textAlign: 'center', color: '#6b7280' }}>
                    <div style={{ width: 54, height: 54, borderRadius: '50%', background: '#f0fdf4', color: '#16a34a', display: 'grid', placeItems: 'center', margin: '0 auto 14px' }}>
                      <Users size={24} />
                    </div>
                    <div style={{ fontSize: 15, fontWeight: 800, color: '#111827', marginBottom: 6 }}>No teams yet</div>
                    <div style={{ fontSize: 13, marginBottom: 16 }}>Create a team to start organizing employees.</div>
                    <Link href={addTeamHref} style={{ textDecoration: 'none' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: '#16a34a', color: '#fff', borderRadius: 8, padding: '10px 14px', fontSize: 12, fontWeight: 900 }}>
                        <Plus size={14} /> Add Team
                      </span>
                    </Link>
                  </td>
                </tr>
              ) : filteredTeams.map(team => (
                <tr key={team.id} onClick={() => setSelectedTeamId(team.id)} style={{ borderTop: '1px solid #f3f4f6', cursor: 'pointer', background: selectedTeam?.id === team.id ? '#f8fafc' : '#fff' }}>
                  <td style={{ padding: '15px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 34, height: 34, borderRadius: 10, background: '#dbeafe', color: '#2563eb', display: 'grid', placeItems: 'center', fontSize: 12, fontWeight: 800 }}>{initials(team.name)}</div>
                      <strong style={{ color: '#111827' }}>{team.name}</strong>
                    </div>
                  </td>
                  <td style={{ padding: '15px 16px' }}>
                    <div style={{ fontWeight: 700, color: '#111827' }}>{team.managerName}</div>
                    <div style={{ color: '#6b7280', fontSize: 11 }}>{team.managerTitle}</div>
                  </td>
                  <td style={{ padding: '15px 16px', fontWeight: 800, color: '#111827' }}>{team.members.length}</td>
                  <td style={{ padding: '15px 16px', color: '#374151', lineHeight: 1.45 }}>{team.description}</td>
                  <td style={{ padding: '15px 16px' }}>
                    <div style={{ position: 'relative' }}>
                      <button onClick={event => toggleTeamMenu(team.id, event)} style={{ border: '1px solid #e5e7eb', background: '#fff', width: 34, height: 34, borderRadius: 8, cursor: 'pointer' }}><MoreHorizontal size={15} /></button>
                      {openTeamMenuId === team.id && (
                        <div style={{ position: 'fixed', top: teamMenuPosition.top, left: teamMenuPosition.left, width: 178, background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, boxShadow: '0 16px 40px rgba(15,23,42,0.14)', zIndex: 260, overflow: 'hidden', padding: 6 }}>
                          <Link href={`/hr/teams/${team.id}`} style={{ textDecoration: 'none' }} onClick={event => event.stopPropagation()}>
                            <span style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#374151', padding: '10px 12px', fontSize: 12, fontWeight: 800 }}><Eye size={14} /> View Details</span>
                          </Link>
                          <Link href={`/hr/teams/${team.id}`} style={{ textDecoration: 'none' }} onClick={event => event.stopPropagation()}>
                            <span style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#374151', padding: '10px 12px', fontSize: 12, fontWeight: 800 }}><Edit2 size={14} /> Edit Team</span>
                          </Link>
                          <button onClick={event => { event.stopPropagation(); deleteTeam(team) }} style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', border: 'none', background: '#fff', color: '#dc2626', padding: '10px 12px', fontSize: 12, fontWeight: 800, cursor: 'pointer', fontFamily: font }}>
                            <Trash2 size={14} /> Delete Team
                          </button>
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div style={{ padding: '14px 18px', display: 'flex', justifyContent: 'space-between', color: '#6b7280', fontSize: 12, borderTop: '1px solid #f3f4f6' }}>
            Showing {filteredTeams.length ? 1 : 0} to {filteredTeams.length} of {filteredTeams.length} teams
            {filteredTeams.length > 0 && <span style={{ background: '#16a34a', color: '#fff', borderRadius: 8, padding: '6px 11px', fontWeight: 800 }}>1</span>}
          </div>
        </section>

        {selectedTeam ? (
          <aside style={{ ...card, padding: 22 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 18 }}>
              <div style={{ width: 58, height: 58, borderRadius: 18, background: '#ede9fe', color: '#7c3aed', display: 'grid', placeItems: 'center', fontSize: 18, fontWeight: 900 }}>{initials(selectedTeam.name)}</div>
              <div>
                <h2 style={{ margin: 0, fontSize: 18, color: '#111827' }}>{selectedTeam.name}</h2>
                <div style={{ marginTop: 3, fontSize: 12, color: '#6b7280' }}>{selectedTeam.department} Department</div>
              </div>
            </div>
            <Link href={`/hr/teams/${selectedTeam.id}`} style={{ textDecoration: 'none' }}>
              <button style={{ width: '100%', border: '1px solid #e5e7eb', background: '#fff', borderRadius: 8, padding: '10px', fontSize: 12, fontWeight: 800, color: '#374151', marginBottom: 16 }}>Edit Team</button>
            </Link>
            <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 8 }}>Team Manager</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
              <PersonAvatar name={selectedTeam.managerName} photo={selectedTeam.managerPhoto} size={38} />
              <div style={{ flex: 1 }}>
                <strong style={{ fontSize: 13, color: '#111827' }}>{selectedTeam.managerName}</strong>
                <div style={{ fontSize: 11, color: '#6b7280' }}>{selectedTeam.managerTitle}</div>
              </div>
              <Mail size={15} color="#6b7280" />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', border: '1px solid #f3f4f6', borderRadius: 10, overflow: 'hidden', marginBottom: 18 }}>
              {[['Members', selectedTeam.members.length], ['Open Positions', selectedTeam.openPositions], ['Projects', selectedTeam.projects]].map(([label, value]) => (
                <div key={label} style={{ padding: 12, textAlign: 'center', borderRight: label !== 'Projects' ? '1px solid #f3f4f6' : 'none' }}>
                  <div style={{ color: '#111827', fontWeight: 900 }}>{value}</div>
                  <div style={{ color: '#6b7280', fontSize: 11 }}>{label}</div>
                </div>
              ))}
            </div>
            <strong style={{ display: 'block', fontSize: 13, color: '#111827', marginBottom: 8 }}>About Team</strong>
            <p style={{ margin: '0 0 16px', color: '#374151', fontSize: 12, lineHeight: 1.6 }}>{selectedTeam.description}</p>
            <strong style={{ display: 'block', fontSize: 13, color: '#111827', marginBottom: 8 }}>Key Responsibilities</strong>
            <div style={{ display: 'grid', gap: 8, marginBottom: 18 }}>
              {selectedTeam.responsibilities.map(item => (
                <span key={item} style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 12, color: '#374151' }}><Check size={14} color="#16a34a" /> {item}</span>
              ))}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: 20 }}>
              {selectedTeam.members.slice(0, 5).map(member => (
                <PersonAvatar key={member.id} name={member.name} photo={member.photo} size={32} overlap />
              ))}
              {selectedTeam.members.length > 5 && <div style={{ width: 32, height: 32, borderRadius: '50%', border: '2px solid #fff', background: '#e5e7eb', color: '#374151', display: 'grid', placeItems: 'center', fontSize: 10, fontWeight: 800 }}>+{selectedTeam.members.length - 5}</div>}
            </div>
            <Link href={`/hr/teams/${selectedTeam.id}`} style={{ textDecoration: 'none' }}>
              <button style={{ width: '100%', border: '1px solid #e5e7eb', background: '#fff', borderRadius: 8, padding: '12px', fontSize: 13, fontWeight: 800, color: '#111827' }}>View Team Details</button>
            </Link>
          </aside>
        ) : (
          <aside style={{ ...card, padding: 22, display: 'grid', placeItems: 'center', minHeight: 360, textAlign: 'center' }}>
            <div>
              <div style={{ width: 58, height: 58, borderRadius: 18, background: '#f0fdf4', color: '#16a34a', display: 'grid', placeItems: 'center', margin: '0 auto 14px' }}>
                <Users size={24} />
              </div>
              <h2 style={{ margin: 0, fontSize: 18, color: '#111827' }}>No team selected</h2>
              <p style={{ margin: '8px 0 18px', color: '#6b7280', fontSize: 13, lineHeight: 1.5 }}>Team details will appear here after you create or select a team.</p>
              <Link href={addTeamHref} style={{ textDecoration: 'none' }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: '#16a34a', color: '#fff', borderRadius: 8, padding: '10px 14px', fontSize: 12, fontWeight: 900 }}>
                  <Plus size={14} /> Add Team
                </span>
              </Link>
            </div>
          </aside>
        )}
      </div>

      {departmentModal && (
        <div role="dialog" aria-modal="true" style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.45)', display: 'grid', placeItems: 'center', zIndex: 100, padding: 20 }}>
          <section style={{ width: 'min(620px, 100%)', maxHeight: '88vh', overflow: 'auto', background: '#fff', borderRadius: 14, boxShadow: '0 30px 90px rgba(15,23,42,0.24)', border: '1px solid #e5e7eb' }}>
            <div style={{ padding: '18px 20px', borderBottom: '1px solid #f3f4f6', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
              <div>
                <h2 style={{ margin: 0, color: '#111827', fontSize: 18, fontWeight: 900 }}>{departmentModal === 'manage' ? 'Manage Departments' : departmentForm.id ? 'Edit Department' : 'Add Department'}</h2>
                <p style={{ margin: '4px 0 0', color: '#6b7280', fontSize: 12 }}>{departmentModal === 'manage' ? 'Edit existing departments or add a new department.' : 'Create a department that teams can be grouped under.'}</p>
              </div>
              <button onClick={() => setDepartmentModal(null)} aria-label="Close department dialog" style={{ width: 34, height: 34, border: '1px solid #e5e7eb', borderRadius: 8, background: '#fff', display: 'grid', placeItems: 'center', cursor: 'pointer' }}><X size={16} /></button>
            </div>

            {departmentError && <div style={{ margin: '16px 20px 0', background: '#fee2e2', color: '#b91c1c', borderRadius: 8, padding: '10px 12px', fontSize: 12, fontWeight: 800 }}>{departmentError}</div>}

            {departmentModal === 'manage' ? (
              <div style={{ padding: 20 }}>
                <button onClick={openAddDepartment} style={{ border: 'none', background: '#16a34a', color: '#fff', borderRadius: 8, padding: '10px 14px', fontSize: 12, fontWeight: 900, display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', marginBottom: 14 }}>
                  <Plus size={14} /> Add Department
                </button>
                <div style={{ display: 'grid', gap: 8 }}>
                  {departmentRecords.length === 0 ? (
                    <div style={{ border: '1px dashed #e5e7eb', borderRadius: 10, padding: 20, textAlign: 'center', color: '#6b7280', fontSize: 13 }}>
                      No departments yet.
                    </div>
                  ) : departmentRecords.map(department => {
                    const teamCount = teams.filter(team => team.department === department.name).length
                    return (
                      <div key={department.id} style={{ border: '1px solid #e5e7eb', borderRadius: 10, padding: 12, display: 'flex', alignItems: 'center', gap: 12 }}>
                        <span style={{ width: 34, height: 34, borderRadius: 10, background: `${department.color}20`, color: department.color, display: 'grid', placeItems: 'center', fontWeight: 900, fontSize: 12 }}>{department.code || initials(department.name)}</span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <strong style={{ color: '#111827', fontSize: 13 }}>{department.name}</strong>
                          <div style={{ color: '#6b7280', fontSize: 11 }}>{teamCount} team{teamCount === 1 ? '' : 's'}{department.manager ? ` - Managed by ${department.manager}` : ''}</div>
                        </div>
                        <button onClick={() => openEditDepartment(department)} style={{ border: '1px solid #e5e7eb', background: '#fff', borderRadius: 8, padding: '8px 10px', display: 'flex', gap: 6, alignItems: 'center', fontSize: 12, fontWeight: 800, cursor: 'pointer' }}><Edit2 size={13} /> Edit</button>
                        <button onClick={() => deleteDepartment(department)} disabled={teamCount > 0} title={teamCount > 0 ? 'Move teams before deleting this department' : 'Delete department'} style={{ border: '1px solid #fecaca', background: teamCount > 0 ? '#f9fafb' : '#fff', color: teamCount > 0 ? '#9ca3af' : '#ef4444', borderRadius: 8, padding: '8px 10px', display: 'flex', gap: 6, alignItems: 'center', fontSize: 12, fontWeight: 800, cursor: teamCount > 0 ? 'not-allowed' : 'pointer' }}><Trash2 size={13} /> Delete</button>
                      </div>
                    )
                  })}
                </div>
              </div>
            ) : (
              <div style={{ padding: 20, display: 'grid', gap: 14 }}>
                <label style={{ display: 'grid', gap: 7, fontSize: 12, fontWeight: 800, color: '#374151' }}>
                  Department Name *
                  <input value={departmentForm.name} onChange={event => { setDepartmentError(''); setDepartmentForm(previous => ({ ...previous, name: event.target.value })) }} placeholder="Enter department name" style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: '11px 12px', outline: 'none', fontSize: 13, color: '#111827' }} />
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <label style={{ display: 'grid', gap: 7, fontSize: 12, fontWeight: 800, color: '#374151' }}>
                    Code
                    <input value={departmentForm.code} onChange={event => setDepartmentForm(previous => ({ ...previous, code: event.target.value }))} placeholder="ENG" style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: '11px 12px', outline: 'none', fontSize: 13, color: '#111827' }} />
                  </label>
                  <label style={{ display: 'grid', gap: 7, fontSize: 12, fontWeight: 800, color: '#374151' }}>
                    Department Manager
                    <select value={departmentForm.manager} onChange={event => setDepartmentForm(previous => ({ ...previous, manager: event.target.value }))} style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: '11px 12px', outline: 'none', fontSize: 13, color: departmentForm.manager ? '#111827' : '#9ca3af', background: '#fff' }}>
                      <option value="">Select department manager</option>
                      {departmentManagerOptions.map(option => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </select>
                    <span style={{ fontSize: 11, fontWeight: 500, color: '#6b7280' }}>
                      {departmentManagerOptions.length ? 'Managers, leads, supervisors, heads, and directors from active employees.' : 'No active managers or leaders found yet.'}
                    </span>
                  </label>
                </div>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 800, color: '#374151', marginBottom: 8 }}>Color</div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {departmentColors.map(color => (
                      <button key={color} onClick={() => setDepartmentForm(previous => ({ ...previous, color }))} aria-label={`Use ${color} department color`} style={{ width: 30, height: 30, borderRadius: '50%', border: departmentForm.color === color ? '3px solid #111827' : '2px solid #fff', boxShadow: '0 0 0 1px #e5e7eb', background: color, cursor: 'pointer' }} />
                    ))}
                  </div>
                </div>
              </div>
            )}

            {departmentModal !== 'manage' && (
              <div style={{ padding: '16px 20px', borderTop: '1px solid #f3f4f6', display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                <button onClick={() => setDepartmentModal(null)} style={{ border: '1px solid #e5e7eb', background: '#fff', color: '#374151', borderRadius: 8, padding: '10px 16px', fontSize: 12, fontWeight: 800, cursor: 'pointer' }}>Cancel</button>
                <button onClick={saveDepartment} style={{ border: 'none', background: '#16a34a', color: '#fff', borderRadius: 8, padding: '10px 16px', fontSize: 12, fontWeight: 900, cursor: 'pointer' }}>{departmentForm.id ? 'Save Changes' : 'Create Department'}</button>
              </div>
            )}
          </section>
        </div>
      )}
    </main>
  )
}

function PersonAvatar({ name, photo, size, overlap = false }: { name: string; photo?: string; size: number; overlap?: boolean }) {
  return (
    <div
      title={name}
      style={{
        width: size,
        height: size,
        marginRight: overlap ? -7 : 0,
        borderRadius: '50%',
        border: overlap ? '2px solid #fff' : photo ? '1px solid #e5e7eb' : 'none',
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
        <span
          role="img"
          aria-label={name}
          style={{ width: '100%', height: '100%', backgroundImage: `url(${photo})`, backgroundSize: 'cover', backgroundPosition: 'center' }}
        />
      ) : (
        initials(name)
      )}
    </div>
  )
}
