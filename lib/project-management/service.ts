'use client'

import { emptyProjectManagementState } from './mock-data'
import type { DocumentType, ProjectDocument, ProjectManagementState, ProjectMember, ProjectRecord, ProjectTask, ProjectTimeLog, TaskPriority, TaskStatus } from './types'

const storageKey = 'wiseflow-project-management-state'
const legacyProjectsKey = 'flowsys-projects'
const clientsKey = 'flowsys-clients'
const employeesKey = 'flowsys-hr-employees'
const accountKey = 'flowsys-account'
const authKey = 'flowsys-auth-session'

const demoProjectIds = new Set(['prj-001', 'prj-002', 'prj-003', 'prj-004', 'prj-005', 'prj-006'])
const demoClientIds = new Set(['client-abc', 'client-global', 'client-delta', 'client-summit', 'client-bright'])
const demoMemberIds = new Set(['user-ec', 'user-ms', 'user-as', 'user-rb', 'user-jw'])
const demoTaskIds = new Set(['tsk-001', 'tsk-002', 'tsk-003', 'tsk-004', 'tsk-005', 'tsk-006'])
const demoMilestoneIds = new Set(['mil-001', 'mil-002', 'mil-003', 'mil-004', 'mil-005'])
const demoLogIds = new Set(['log-001', 'log-002', 'log-003', 'log-004'])
const demoDocumentIds = new Set(['doc-001', 'doc-002', 'doc-003', 'doc-004'])
const demoActivityIds = new Set(['act-001', 'act-002', 'act-003'])
const avatarColors = ['#2563eb', '#16a34a', '#f59e0b', '#8b5cf6', '#ef4444', '#0891b2']

function readJson<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback
  try {
    const raw = window.localStorage.getItem(key)
    return raw ? JSON.parse(raw) as T : fallback
  } catch {
    return fallback
  }
}

function writeJson(key: string, value: unknown) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(key, JSON.stringify(value))
}

function text(row: Record<string, unknown>, keys: string[], fallback = '') {
  for (const key of keys) {
    const value = row[key]
    if (typeof value === 'string' && value.trim()) return value.trim()
    if (typeof value === 'number') return String(value)
  }
  return fallback
}

function readAccountLike(): Record<string, unknown> | null {
  return readJson<Record<string, unknown> | null>(accountKey, null) || readJson<Record<string, unknown> | null>(authKey, null)
}

function uniqueById<T extends { id: string }>(items: T[]) {
  const seen = new Set<string>()
  return items.filter(item => {
    if (!item.id || seen.has(item.id)) return false
    seen.add(item.id)
    return true
  })
}

function loadClients() {
  const rows = readJson<Array<Record<string, unknown>>>(clientsKey, [])
  return uniqueById(rows.map((row, index) => ({
    id: text(row, ['id', 'clientId', 'customerId'], `client-${index + 1}`),
    name: text(row, ['name', 'companyName', 'clientName', 'customerName', 'businessName', 'company'], `Client ${index + 1}`),
  })))
}

function loadMembers(): ProjectMember[] {
  const rows = readJson<Array<Record<string, unknown>>>(employeesKey, [])
  const employees = rows.map((row, index) => {
    const fullName = text(row, ['fullName', 'name', 'displayName']) || [text(row, ['firstName']), text(row, ['middleName']), text(row, ['lastName'])].filter(Boolean).join(' ')
    return {
      id: text(row, ['id', 'employeeId', 'userId'], `member-${index + 1}`),
      name: fullName || text(row, ['email'], `Team Member ${index + 1}`),
      role: text(row, ['jobTitle', 'position', 'role', 'designation'], 'Team Member'),
      department: text(row, ['department', 'team'], 'Operations'),
      avatarColor: avatarColors[index % avatarColors.length],
      availability: Math.max(0, Math.min(Number(row.availability || row.utilization || 80), 100)),
    }
  })
  if (employees.length) return uniqueById(employees)

  const account = readAccountLike()
  if (!account) return []
  const name = text(account, ['name', 'fullName', 'displayName']) || text(account, ['email'])
  if (!name) return []
  return [{
    id: text(account, ['id', 'userId', 'employeeId'], 'current-user'),
    name,
    role: text(account, ['role', 'jobTitle'], 'Project Owner'),
    department: text(account, ['department'], 'Management'),
    avatarColor: '#2563eb',
    availability: 80,
  }]
}

function liveBaseState(): ProjectManagementState {
  const account = readAccountLike()
  return {
    ...emptyProjectManagementState,
    companyId: account ? text(account, ['companyId', 'tenantId', 'organizationId'], 'wiseflow-local') : 'wiseflow-local',
    clients: loadClients(),
    members: loadMembers(),
  }
}

function mapLegacyProject(row: Record<string, unknown>, index: number): ProjectRecord {
  const cost = Number(row.projectCost || row.budget || 0)
  const spent = ['materialCost', 'laborCost', 'overheadProfit', 'generalExpense'].reduce((sum, key) => sum + Number(row[key] || 0), 0)
  const status = String(row.status || 'Planning').toLowerCase()
  return {
    id: String(row.id || `legacy-${index + 1}`),
    companyId: 'wiseflow-local',
    clientId: String(row.clientId || row.client || 'client-local'),
    name: String(row.name || row.title || 'Untitled Project'),
    description: String(row.notes || row.description || ''),
    status: status.includes('complete') ? 'Completed' : status.includes('hold') || status.includes('pending') ? 'On Hold' : status.includes('issue') ? 'In Progress' : 'In Progress',
    health: status.includes('issue') ? 'At Risk' : 'Good',
    priority: 'Medium',
    progress: status.includes('complete') ? 100 : status.includes('pending') ? 10 : 45,
    budget: cost,
    spent,
    committed: Number(row.unpaidAmount || 0),
    startDate: String(row.startDate || new Date().toISOString().slice(0, 10)),
    dueDate: String(row.endDate || new Date().toISOString().slice(0, 10)),
    managerId: '',
    memberIds: [],
    tags: [],
    department: String(row.department || 'Delivery'),
  }
}

function stripDemoRecords(state: ProjectManagementState) {
  const next: ProjectManagementState = {
    ...state,
    clients: state.clients.filter(client => !demoClientIds.has(client.id)),
    members: state.members.filter(member => !demoMemberIds.has(member.id)),
    projects: state.projects.filter(project => !demoProjectIds.has(project.id)),
    tasks: state.tasks.filter(task => !demoTaskIds.has(task.id) && !demoProjectIds.has(task.projectId)),
    milestones: state.milestones.filter(milestone => !demoMilestoneIds.has(milestone.id) && !demoProjectIds.has(milestone.projectId)),
    timeLogs: state.timeLogs.filter(log => !demoLogIds.has(log.id) && !demoProjectIds.has(log.projectId) && !demoTaskIds.has(log.taskId)),
    documents: state.documents.filter(document => !demoDocumentIds.has(document.id) && !demoProjectIds.has(document.projectId)),
    activities: state.activities.filter(activity => !demoActivityIds.has(activity.id) && !demoProjectIds.has(activity.projectId)),
  }
  const changed = next.clients.length !== state.clients.length
    || next.members.length !== state.members.length
    || next.projects.length !== state.projects.length
    || next.tasks.length !== state.tasks.length
    || next.milestones.length !== state.milestones.length
    || next.timeLogs.length !== state.timeLogs.length
    || next.documents.length !== state.documents.length
    || next.activities.length !== state.activities.length
  return { state: next, changed }
}

function hydrateState(state: ProjectManagementState, base: ProjectManagementState): ProjectManagementState {
  return {
    ...base,
    ...state,
    companyId: state.companyId || base.companyId,
    clients: uniqueById([...state.clients, ...base.clients]),
    members: uniqueById([...state.members, ...base.members]),
  }
}

export function loadProjectManagementState(): ProjectManagementState {
  const base = liveBaseState()
  const stored = readJson<ProjectManagementState | null>(storageKey, null)
  if (stored) {
    const stripped = stripDemoRecords(hydrateState(stored, base))
    if (stripped.changed) writeJson(storageKey, stripped.state)
    return stripped.state
  }

  const legacy = readJson<Array<Record<string, unknown>>>(legacyProjectsKey, [])
  if (legacy.length) {
    const managerId = base.members[0]?.id || ''
    return {
      ...base,
      projects: legacy.map((project, index) => {
        const mapped = mapLegacyProject(project, index)
        return { ...mapped, companyId: base.companyId, managerId, memberIds: managerId ? [managerId] : [] }
      }),
    }
  }

  return base
}

export function saveProjectManagementState(state: ProjectManagementState) {
  if (typeof window === 'undefined') return
  writeJson(storageKey, state)
  writeJson(legacyProjectsKey, state.projects.map(project => ({
    id: Number(project.id.replace(/\D/g, '')) || Date.now(),
    name: project.name,
    client: state.clients.find(client => client.id === project.clientId)?.name || project.clientId,
    location: project.department,
    projectCost: project.budget,
    startDate: project.startDate,
    endDate: project.dueDate,
    status: project.status === 'Completed' ? 'Completed' : project.status === 'On Hold' ? 'Pending' : 'Ongoing',
    materialCost: project.spent,
    unpaidAmount: project.committed,
    notes: project.description,
  })))
  window.dispatchEvent(new Event('wiseflow-project-management-refresh'))
}

export function createProjectRecord(state: ProjectManagementState, draft: Pick<ProjectRecord, 'name' | 'clientId' | 'description' | 'budget' | 'dueDate' | 'department'>): ProjectManagementState {
  const fallbackClient = { id: 'client-local', name: 'Internal / Unassigned' }
  const clients = state.clients.some(client => client.id === draft.clientId || client.id === fallbackClient.id) ? state.clients : [...state.clients, fallbackClient]
  const clientId = draft.clientId || state.clients[0]?.id || fallbackClient.id
  const managerId = state.members[0]?.id || ''
  const project: ProjectRecord = {
    id: `prj-${Date.now()}`,
    companyId: state.companyId,
    clientId,
    name: draft.name,
    description: draft.description,
    status: 'Planning',
    health: 'Good',
    priority: 'Medium',
    progress: 0,
    budget: draft.budget,
    spent: 0,
    committed: 0,
    startDate: new Date().toISOString().slice(0, 10),
    dueDate: draft.dueDate,
    managerId,
    memberIds: state.members.slice(0, 2).map(member => member.id),
    tags: [],
    department: draft.department,
  }
  return { ...state, clients, projects: [project, ...state.projects] }
}

export function updateTaskStatus(state: ProjectManagementState, taskId: string, status: TaskStatus): ProjectManagementState {
  return { ...state, tasks: state.tasks.map(task => task.id === taskId ? { ...task, status } : task) }
}

export function addTaskRecord(state: ProjectManagementState, projectId: string): ProjectManagementState {
  const task: ProjectTask = {
    id: `tsk-${Date.now()}`,
    projectId,
    assigneeId: state.members[0]?.id || '',
    title: 'New project task',
    description: 'Define scope, owner, and delivery target.',
    priority: 'Medium',
    status: 'To Do',
    dueDate: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
    dependencies: [],
    labels: [],
    attachments: 0,
    comments: 0,
    progress: 0,
  }
  return { ...state, tasks: [task, ...state.tasks] }
}

export function createTaskRecord(state: ProjectManagementState, draft: { projectId: string; title: string; description: string; assigneeId: string; priority: TaskPriority; dueDate: string }): ProjectManagementState {
  const task: ProjectTask = {
    id: `tsk-${Date.now()}`,
    projectId: draft.projectId,
    assigneeId: draft.assigneeId || state.members[0]?.id || '',
    title: draft.title,
    description: draft.description,
    priority: draft.priority,
    status: 'To Do',
    dueDate: draft.dueDate,
    dependencies: [],
    labels: [],
    attachments: 0,
    comments: 0,
    progress: 0,
  }
  return { ...state, tasks: [task, ...state.tasks] }
}

export function createTimeLogRecord(state: ProjectManagementState, draft: { projectId: string; taskId: string; employeeId: string; hours: number; date: string; billable: boolean }): ProjectManagementState {
  const log: ProjectTimeLog = {
    id: `log-${Date.now()}`,
    taskId: draft.taskId,
    employeeId: draft.employeeId || state.members[0]?.id || '',
    projectId: draft.projectId,
    hours: draft.hours,
    date: draft.date,
    billable: draft.billable,
    approved: false,
  }
  return { ...state, timeLogs: [log, ...state.timeLogs] }
}

export function createDocumentRecord(state: ProjectManagementState, draft: { projectId: string; name: string; type: DocumentType; folder: string; size: string; ownerId: string }): ProjectManagementState {
  const document: ProjectDocument = {
    id: `doc-${Date.now()}`,
    projectId: draft.projectId,
    name: draft.name,
    type: draft.type,
    folder: draft.folder || 'Project Files',
    size: draft.size || '0 KB',
    version: 'v1',
    updatedAt: new Date().toISOString().slice(0, 10),
    ownerId: draft.ownerId || state.members[0]?.id || '',
  }
  return { ...state, documents: [document, ...state.documents] }
}
