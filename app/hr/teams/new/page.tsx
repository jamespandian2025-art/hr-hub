'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { BriefcaseBusiness, Building2, ChevronRight, Lightbulb, MapPin, Search, Users } from 'lucide-react'
import { Employee, ensureTeams, fullName, HRTeam, initials, loadStored, saveStored } from '../teamData'

const font = "var(--font-body)"
const card = { background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, boxShadow: '0 1px 4px rgba(15,23,42,0.05)' }

const locations = ['Main Office', 'Hybrid', 'Remote', 'Site Office']
const teamTypes = ['Technical', 'Operations', 'Administrative', 'Project', 'Support']
const leadRoles = ['Team Lead', 'Manager', 'Supervisor', 'Coordinator']

interface HRDepartment {
  id: string
  name: string
}

export default function AddTeamPage() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [employees, setEmployees] = useState<Employee[]>([])
  const [departments, setDepartments] = useState<string[]>([])
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([])
  const [memberSearch, setMemberSearch] = useState('')
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    name: '',
    code: '',
    department: '',
    location: '',
    description: '',
    leadRole: '',
    type: '',
    costCenter: '',
    budget: '',
    goals: '',
    managerName: '',
    leadName: '',
  })

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const storedTeams = ensureTeams()
      const storedDepartments = loadStored<HRDepartment[]>('flowsys-hr-departments', [])
      const departmentNames = Array.from(new Set([
        ...storedDepartments.map(department => department.name),
        ...storedTeams.map(team => team.department),
      ].filter(Boolean)))
      setEmployees(loadStored<Employee[]>('flowsys-hr-employees', []))
      setDepartments(departmentNames)
    }, 0)
    return () => window.clearTimeout(timer)
  }, [])

  const selectedMembers = useMemo(() => {
    return employees.filter(employee => selectedMemberIds.includes(employee.id))
  }, [employees, selectedMemberIds])

  const filteredMemberEmployees = useMemo(() => {
    const query = memberSearch.trim().toLowerCase()
    if (!query) return employees

    return employees.filter(employee => {
      const name = fullName(employee)
      return [
        name,
        employee.email,
        employee.employeeId,
        employee.jobTitle,
        employee.department,
      ].filter(Boolean).join(' ').toLowerCase().includes(query)
    })
  }, [employees, memberSearch])

  const preview = useMemo(() => ({
    name: form.name || 'New Team',
    department: form.department || '-',
    lead: form.leadName || form.managerName || '-',
    members: selectedMembers.length,
    type: form.type || '-',
    location: form.location || '-',
    costCenter: form.costCenter || '-',
    budget: form.budget ? `PHP ${Number(form.budget).toLocaleString('en-PH')}` : '-',
  }), [form, selectedMembers.length])

  function setField(key: keyof typeof form, value: string) {
    setError('')
    setForm(previous => ({ ...previous, [key]: value }))
  }

  function validateStep(nextStep = step) {
    if (nextStep >= 2 && (!form.name.trim() || !form.department)) {
      setError('Team name and department are required before continuing.')
      setStep(1)
      return false
    }
    if (nextStep >= 3 && (!form.managerName.trim() || !form.leadRole)) {
      setError('Team manager and team lead role are required before adding members.')
      setStep(2)
      return false
    }
    setError('')
    return true
  }

  function goNext() {
    if (!validateStep(step + 1)) return
    setStep(previous => Math.min(4, previous + 1))
  }

  function toggleMember(employeeId: string) {
    setSelectedMemberIds(previous => previous.includes(employeeId) ? previous.filter(id => id !== employeeId) : [...previous, employeeId])
  }

  function createTeam() {
    if (!validateStep(4)) return
    const currentTeams = ensureTeams()
    const members = selectedMembers.map(employee => ({
      id: employee.id,
      name: fullName(employee) || employee.email || 'Team Member',
      employeeId: employee.employeeId || employee.id,
      position: employee.jobTitle || '',
      role: fullName(employee) === form.leadName ? form.leadRole : employee.jobTitle || '',
      employmentType: employee.employeeType || '',
      status: employee.employmentStatus || '',
      photo: employee.photo,
      email: employee.email,
    }))
    const newTeam: HRTeam = {
      id: `team_${Date.now()}`,
      name: form.name.trim(),
      code: form.code.trim(),
      department: form.department,
      location: form.location,
      type: form.type,
      costCenter: form.costCenter,
      budget: Number(form.budget || 0),
      goals: form.goals,
      description: form.description,
      responsibilities: form.goals ? form.goals.split(',').map(item => item.trim()).filter(Boolean).slice(0, 4) : [],
      managerName: form.managerName,
      managerTitle: '',
      leadName: form.leadName || form.managerName,
      leadTitle: form.leadRole,
      members,
      openPositions: 0,
      projects: 0,
      status: 'Active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    const nextTeams = [...currentTeams.filter(team => team.id !== newTeam.id), newTeam]
    saveStored('flowsys-hr-teams', nextTeams)
    router.push(`/hr/teams/${newTeam.id}`)
  }

  const nextLabel = step === 1 ? 'Next: Assign Manager' : step === 2 ? 'Next: Add Members' : step === 3 ? 'Next: Review & Confirm' : 'Create Team'

  return (
    <main style={{ fontFamily: font, padding: '0 20px 32px', minHeight: '100vh', background: '#f8fafc' }}>
      <div style={{ padding: '20px 0 18px' }}>
        <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 14 }}>HR Hub &nbsp;&gt;&nbsp; Teams &nbsp;&gt;&nbsp; Add Team</div>
        <h1 style={{ margin: 0, color: '#111827', fontSize: 24, fontWeight: 800 }}>Add Team</h1>
        <p style={{ margin: '6px 0 0', color: '#6b7280', fontSize: 13 }}>Create a new team and assign manager, members, and basic details.</p>
      </div>

      <section style={{ ...card, padding: '18px 22px', marginBottom: 18 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
          {['Team Information', 'Assign Manager', 'Add Members', 'Review & Confirm'].map((label, index) => {
            const current = index + 1
            return (
              <button key={label} onClick={() => setStep(current)} style={{ border: 'none', background: 'transparent', textAlign: 'left', cursor: 'pointer', fontFamily: font }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ width: 28, height: 28, borderRadius: '50%', display: 'grid', placeItems: 'center', background: step === current ? '#16a34a' : '#fff', color: step === current ? '#fff' : '#6b7280', border: '1px solid #e5e7eb', fontWeight: 800, fontSize: 12 }}>{current}</span>
                  <strong style={{ color: step === current ? '#111827' : '#6b7280', fontSize: 12 }}>{label}</strong>
                </div>
                <div style={{ height: 2, background: step === current ? '#16a34a' : '#e5e7eb', marginTop: 14 }} />
              </button>
            )
          })}
        </div>
      </section>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 320px', gap: 18 }}>
        <section style={{ ...card, overflow: 'hidden' }}>
          {error && <div style={{ margin: '18px 22px 0', background: '#fee2e2', color: '#b91c1c', borderRadius: 8, padding: '10px 12px', fontSize: 12, fontWeight: 800 }}>{error}</div>}

          {step === 1 && (
            <>
              <div style={{ padding: '22px 22px', borderBottom: '1px solid #f3f4f6' }}>
                <h2 style={{ margin: '0 0 18px', fontSize: 16, color: '#111827' }}>Team Information</h2>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <Field label="Team Name *" value={form.name} placeholder="Enter team name" onChange={value => setField('name', value)} />
                  <SelectField label="Department *" value={form.department} placeholder="Select department" options={departments} onChange={value => setField('department', value)} />
                  <Field label="Team Code (Optional)" value={form.code} placeholder="Enter unique team code" onChange={value => setField('code', value)} />
                  <SelectField label="Location (Optional)" value={form.location} placeholder="Select location" options={locations} onChange={value => setField('location', value)} />
                </div>
                <label style={{ display: 'grid', gap: 7, fontSize: 12, fontWeight: 700, color: '#374151', marginTop: 16 }}>
                  Description (Optional)
                  <textarea value={form.description} onChange={event => setField('description', event.target.value)} maxLength={500} placeholder="Enter team description, goals, and responsibilities" style={{ minHeight: 80, resize: 'vertical', border: '1px solid #e5e7eb', borderRadius: 8, padding: '12px', outline: 'none', fontFamily: font, fontSize: 13 }} />
                </label>
              </div>

              <div style={{ padding: '22px 22px' }}>
                <h2 style={{ margin: '0 0 18px', fontSize: 16, color: '#111827' }}>Team Settings</h2>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <SelectField label="Team Type" value={form.type} placeholder="Select team type" options={teamTypes} onChange={value => setField('type', value)} />
                  <Field label="Cost Center (Optional)" value={form.costCenter} placeholder="Select cost center" onChange={value => setField('costCenter', value)} />
                  <Field label="Budget (Optional)" value={form.budget} placeholder="Enter annual budget" type="number" onChange={value => setField('budget', value)} />
                </div>
                <label style={{ display: 'grid', gap: 7, fontSize: 12, fontWeight: 700, color: '#374151', marginTop: 16 }}>
                  Team Goals (Optional)
                  <textarea value={form.goals} onChange={event => setField('goals', event.target.value)} maxLength={500} placeholder="Enter team goals and objectives. Use commas to create responsibilities." style={{ minHeight: 80, resize: 'vertical', border: '1px solid #e5e7eb', borderRadius: 8, padding: '12px', outline: 'none', fontFamily: font, fontSize: 13 }} />
                </label>
              </div>
            </>
          )}

          {step === 2 && (
            <div style={{ padding: '22px 22px' }}>
              <h2 style={{ margin: '0 0 8px', fontSize: 16, color: '#111827' }}>Assign Manager</h2>
              <p style={{ margin: '0 0 18px', fontSize: 13, color: '#6b7280' }}>Choose the accountable manager and lead role for this team.</p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <Field label="Team Manager *" value={form.managerName} placeholder="Manager name" onChange={value => setField('managerName', value)} />
                <Field label="Team Lead" value={form.leadName} placeholder="Team lead name" onChange={value => setField('leadName', value)} />
                <SelectField label="Team Lead Role *" value={form.leadRole} placeholder="Select team lead role" options={leadRoles} onChange={value => setField('leadRole', value)} />
              </div>
              {employees.length > 0 && (
                <div style={{ marginTop: 18 }}>
                  <div style={{ fontSize: 12, fontWeight: 800, color: '#374151', marginBottom: 9 }}>Quick select from employees</div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 10 }}>
                    {employees.slice(0, 6).map(employee => {
                      const name = fullName(employee) || employee.email || 'Employee'
                      return (
                        <button key={employee.id} onClick={() => setField('managerName', name)} style={{ border: '1px solid #e5e7eb', background: '#fff', borderRadius: 10, padding: 10, display: 'flex', alignItems: 'center', gap: 10, textAlign: 'left', cursor: 'pointer' }}>
                          <EmployeeAvatar employee={employee} name={name} size={30} />
                          <span><strong style={{ color: '#111827', fontSize: 12 }}>{name}</strong><span style={{ display: 'block', color: '#6b7280', fontSize: 11 }}>{employee.jobTitle || 'Employee'}</span></span>
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {step === 3 && (
            <div style={{ padding: '22px 22px' }}>
              <h2 style={{ margin: '0 0 8px', fontSize: 16, color: '#111827' }}>Add Members</h2>
              <p style={{ margin: '0 0 18px', fontSize: 13, color: '#6b7280' }}>Select employees to include in this team. You can also add more later from the team details page.</p>
              {employees.length === 0 ? (
                <div style={{ border: '1px dashed #e5e7eb', borderRadius: 12, padding: 24, textAlign: 'center', color: '#6b7280', fontSize: 13 }}>No employees found yet. You can create the team now and add members later.</div>
              ) : (
                <div>
                  <div style={{ position: 'relative', maxWidth: 420, marginBottom: 14 }}>
                    <Search size={15} color="#9ca3af" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
                    <input
                      value={memberSearch}
                      onChange={event => setMemberSearch(event.target.value)}
                      placeholder="Search employees by name, email, role..."
                      style={{ width: '100%', border: '1px solid #e5e7eb', borderRadius: 10, padding: '11px 12px 11px 36px', outline: 'none', fontSize: 13, color: '#111827', fontFamily: font, background: '#fff' }}
                    />
                  </div>

                  {filteredMemberEmployees.length === 0 ? (
                    <div style={{ border: '1px dashed #e5e7eb', borderRadius: 12, padding: 24, textAlign: 'center', color: '#6b7280', fontSize: 13 }}>
                      No employees match {memberSearch}. Try another name or email.
                    </div>
                  ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 10 }}>
                  {filteredMemberEmployees.map(employee => {
                    const name = fullName(employee) || employee.email || 'Employee'
                    const selected = selectedMemberIds.includes(employee.id)
                    return (
                      <button key={employee.id} onClick={() => toggleMember(employee.id)} style={{ border: `1px solid ${selected ? '#16a34a' : '#e5e7eb'}`, background: selected ? '#f0fdf4' : '#fff', borderRadius: 10, padding: 12, display: 'flex', alignItems: 'center', gap: 10, textAlign: 'left', cursor: 'pointer' }}>
                        <EmployeeAvatar employee={employee} name={name} size={34} selected={selected} />
                        <span style={{ flex: 1, minWidth: 0 }}><strong style={{ color: '#111827', fontSize: 12, display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</strong><span style={{ display: 'block', color: '#6b7280', fontSize: 11, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{employee.jobTitle || employee.email || 'Employee'}</span></span>
                        <span style={{ color: selected ? '#16a34a' : '#d1d5db', fontWeight: 900 }}>{selected ? 'âœ“' : '+'}</span>
                      </button>
                    )
                  })}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {step === 4 && (
            <div style={{ padding: '22px 22px' }}>
              <h2 style={{ margin: '0 0 8px', fontSize: 16, color: '#111827' }}>Review & Confirm</h2>
              <p style={{ margin: '0 0 18px', fontSize: 13, color: '#6b7280' }}>Review the team information before creating it.</p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 12 }}>
                {[
                  ['Team Name', preview.name],
                  ['Department', preview.department],
                  ['Team Manager', form.managerName || '-'],
                  ['Team Lead', preview.lead],
                  ['Team Type', preview.type],
                  ['Members', String(preview.members)],
                  ['Location', preview.location],
                  ['Budget', preview.budget],
                ].map(([label, value]) => (
                  <div key={label} style={{ border: '1px solid #f3f4f6', borderRadius: 10, padding: 12 }}>
                    <div style={{ color: '#6b7280', fontSize: 11, fontWeight: 800, marginBottom: 4 }}>{label}</div>
                    <div style={{ color: '#111827', fontSize: 13, fontWeight: 800 }}>{value}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div style={{ padding: '16px 22px', borderTop: '1px solid #f3f4f6', display: 'flex', justifyContent: 'space-between' }}>
            <Link href="/hr/teams" style={{ textDecoration: 'none' }}><button style={{ border: '1px solid #e5e7eb', background: '#fff', borderRadius: 8, padding: '10px 24px', fontSize: 13, fontWeight: 700, color: '#374151' }}>Cancel</button></Link>
            <div style={{ display: 'flex', gap: 10 }}>
              {step > 1 && <button onClick={() => setStep(previous => previous - 1)} style={{ border: '1px solid #e5e7eb', background: '#fff', color: '#374151', borderRadius: 8, padding: '10px 18px', fontSize: 13, fontWeight: 800, cursor: 'pointer' }}>Back</button>}
              <button onClick={step < 4 ? goNext : createTeam} style={{ border: 'none', background: '#16a34a', color: '#fff', borderRadius: 8, padding: '10px 24px', display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 800, cursor: 'pointer' }}>
                {nextLabel} <ChevronRight size={15} />
              </button>
            </div>
          </div>
        </section>

        <aside style={{ display: 'grid', gap: 14, alignSelf: 'start' }}>
          <div style={{ ...card, padding: 22, textAlign: 'center' }}>
            <h2 style={{ margin: '0 0 26px', textAlign: 'left', fontSize: 16, color: '#111827' }}>Team Preview</h2>
            <div style={{ width: 72, height: 72, borderRadius: '50%', background: '#ede9fe', color: '#7c3aed', display: 'grid', placeItems: 'center', margin: '0 auto 14px', fontWeight: 900, fontSize: 20 }}>{initials(preview.name)}</div>
            <strong style={{ color: '#111827' }}>{preview.name}</strong>
            <div style={{ display: 'grid', gap: 12, marginTop: 24, textAlign: 'left' }}>
              {[
                { label: 'Department', value: preview.department, Icon: Building2 },
                { label: 'Team Lead', value: preview.lead, Icon: Users },
                { label: 'Members', value: preview.members, Icon: Users },
                { label: 'Team Type', value: preview.type, Icon: Users },
                { label: 'Location', value: preview.location, Icon: MapPin },
                { label: 'Cost Center', value: preview.costCenter, Icon: BriefcaseBusiness },
                { label: 'Budget', value: preview.budget, Icon: BriefcaseBusiness },
              ].map(({ label, value, Icon }) => {
                const RowIcon = Icon
                return (
                  <div key={label} style={{ display: 'flex', justifyContent: 'space-between', gap: 8, color: '#6b7280', fontSize: 12 }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}><RowIcon size={14} /> {label}</span>
                    <strong style={{ color: '#374151' }}>{value}</strong>
                  </div>
                )
              })}
            </div>
          </div>
          <div style={{ ...card, padding: 22, background: '#f0fdf4' }}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', color: '#15803d', fontWeight: 800, marginBottom: 12 }}><Lightbulb size={18} /> Tips</div>
            {['Choose a clear and unique team name.', 'Assign a team lead who will be responsible for the team.', 'Add members in the next step.', 'You can edit team details anytime later.'].map(tip => (
              <div key={tip} style={{ color: '#15803d', fontSize: 12, lineHeight: 1.6, marginBottom: 8 }}>â€¢ {tip}</div>
            ))}
          </div>
        </aside>
      </div>
    </main>
  )
}

function EmployeeAvatar({ employee, name, size = 34, selected = false }: { employee: Employee; name: string; size?: number; selected?: boolean }) {
  const border = employee.photo ? (selected ? '2px solid #16a34a' : '1px solid #e5e7eb') : 'none'

  return (
    <span style={{ width: size, height: size, borderRadius: '50%', background: selected ? '#16a34a' : '#dcfce7', color: selected ? '#fff' : '#15803d', display: 'grid', placeItems: 'center', fontSize: 11, fontWeight: 900, overflow: 'hidden', flexShrink: 0, border, boxSizing: 'border-box' }}>
      {employee.photo ? (
        <span
          role="img"
          aria-label={name}
          style={{ width: '100%', height: '100%', backgroundImage: `url(${employee.photo})`, backgroundSize: 'cover', backgroundPosition: 'center' }}
        />
      ) : (
        initials(name)
      )}
    </span>
  )
}

function Field({ label, value, placeholder, type = 'text', onChange }: { label: string; value: string; placeholder: string; type?: string; onChange: (value: string) => void }) {
  return (
    <label style={{ display: 'grid', gap: 7, fontSize: 12, fontWeight: 700, color: '#374151' }}>
      {label}
      <input type={type} value={value} placeholder={placeholder} onChange={event => onChange(event.target.value)} style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: '12px', outline: 'none', fontSize: 13 }} />
    </label>
  )
}

function SelectField({ label, value, placeholder, options, onChange }: { label: string; value: string; placeholder: string; options: string[]; onChange: (value: string) => void }) {
  return (
    <label style={{ display: 'grid', gap: 7, fontSize: 12, fontWeight: 700, color: '#374151' }}>
      {label}
      <select value={value} onChange={event => onChange(event.target.value)} style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: '12px', outline: 'none', fontSize: 13, background: '#fff', color: value ? '#111827' : '#9ca3af' }}>
        <option value="">{placeholder}</option>
        {options.map(option => <option key={option} value={option}>{option}</option>)}
      </select>
    </label>
  )
}
