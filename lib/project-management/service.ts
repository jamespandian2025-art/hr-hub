'use client'

import { projectManagementSeed } from './mock-data'
import type { ProjectManagementState, ProjectRecord, ProjectTask, TaskStatus } from './types'

const storageKey = 'wiseflow-project-management-state'
const legacyProjectsKey = 'flowsys-projects'

function readJson<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback
  try {
    const raw = window.localStorage.getItem(key)
    return raw ? JSON.parse(raw) as T : fallback
  } catch {
    return fallback
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
    managerId: 'user-ec',
    memberIds: ['user-ec'],
    tags: [],
    department: String(row.department || 'Delivery'),
  }
}

export function loadProjectManagementState(): ProjectManagementState {
  const stored = readJson<ProjectManagementState | null>(storageKey, null)
  if (stored) return stored

  const legacy = readJson<Array<Record<string, unknown>>>(legacyProjectsKey, [])
  if (legacy.length) {
    return { ...projectManagementSeed, projects: legacy.map(mapLegacyProject) }
  }

  return projectManagementSeed
}

export function saveProjectManagementState(state: ProjectManagementState) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(storageKey, JSON.stringify(state))
  window.localStorage.setItem(legacyProjectsKey, JSON.stringify(state.projects.map(project => ({
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
  }))))
  window.dispatchEvent(new Event('wiseflow-project-management-refresh'))
}

export function createProjectRecord(state: ProjectManagementState, draft: Pick<ProjectRecord, 'name' | 'clientId' | 'description' | 'budget' | 'dueDate' | 'department'>): ProjectManagementState {
  const project: ProjectRecord = {
    id: `prj-${Date.now()}`,
    companyId: state.companyId,
    clientId: draft.clientId,
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
    managerId: state.members[0]?.id || 'user-ec',
    memberIds: state.members.slice(0, 2).map(member => member.id),
    tags: ['New'],
    department: draft.department,
  }
  return { ...state, projects: [project, ...state.projects] }
}

export function updateTaskStatus(state: ProjectManagementState, taskId: string, status: TaskStatus): ProjectManagementState {
  return { ...state, tasks: state.tasks.map(task => task.id === taskId ? { ...task, status } : task) }
}

export function addTaskRecord(state: ProjectManagementState, projectId: string): ProjectManagementState {
  const task: ProjectTask = {
    id: `tsk-${Date.now()}`,
    projectId,
    assigneeId: state.members[0]?.id || 'user-ec',
    title: 'New project task',
    description: 'Define scope, owner, and delivery target.',
    priority: 'Medium',
    status: 'To Do',
    dueDate: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
    dependencies: [],
    labels: ['New'],
    attachments: 0,
    comments: 0,
    progress: 0,
  }
  return { ...state, tasks: [task, ...state.tasks] }
}
