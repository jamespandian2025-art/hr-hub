import { companyChangeEvent, companyScopedKey, getActiveCompany } from '@/lib/tenant/company'

export { companyChangeEvent }

export const projectsStorageKey = 'flowsys-projects'
export const tasksStorageKey = 'flowsys-assigned-tasks'
export const accountStorageKey = 'flowsys-account'
const projectManagementStorageKey = 'wiseflow-project-management-state'
const outboundNotificationsKey = 'flowsys-outbound-notifications'
export const workflowDataChangedEvent = 'wiseflow-workflows-data-changed'

export type TaskStatus = 'Open' | 'In Progress' | 'Completed'

export type WorkflowStage = {
  id: string
  name: string
  type: 'normal' | 'done' | 'failed'
  color?: string
  order?: number
  owners?: string[]
  workers?: string[]
}

export type ProjectRecord = {
  id: number | string
  name: string
  client?: string
  location?: string
  department?: string
  description?: string
  stages?: WorkflowStage[]
  reviewers?: string[]
  deleted?: boolean
  workflowIcon?: string
  workflowColor?: string
}

export type AssignedTask = {
  id: number | string
  projectId: number | string
  title: string
  description?: string
  status: TaskStatus
  priority?: 'Urgent' | 'High' | 'Normal' | 'Low'
  assignee?: string
  assignees?: string[]
  stageId?: string
  dueDate?: string
  createdAt?: string
  draft?: boolean
  updatedAt?: string
  source?: 'Change Order' | 'Manual'
}

export type AccountRecord = {
  fullName?: string
  name?: string
  role?: string
}

export function loadStored<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback
  try {
    const stored = window.localStorage.getItem(key)
    return stored ? JSON.parse(stored) as T : fallback
  } catch {
    return fallback
  }
}

export function readStored<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback
  try {
    const raw = window.localStorage.getItem(key)
    if (!raw) return fallback
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

function loadProjectManagementSnapshot() {
  if (typeof window === 'undefined') return null
  const companyId = getActiveCompany()?.id || ''
  return readStored<Record<string, unknown> | null>(companyScopedKey(projectManagementStorageKey, companyId), null)
    || readStored<Record<string, unknown> | null>(projectManagementStorageKey, null)
}

function normalizeProjectTaskStatus(status: string): TaskStatus {
  if (status === 'Done') return 'Completed'
  if (status === 'In Progress' || status === 'Review' || status === 'Blocked') return 'In Progress'
  return 'Open'
}

function normalizeProjectPriority(priority: string): AssignedTask['priority'] {
  if (priority === 'Critical') return 'Urgent'
  if (priority === 'High' || priority === 'Low') return priority
  return 'Normal'
}

export function loadWorkflowProjects() {
  const legacy = loadStored<ProjectRecord[]>(projectsStorageKey, [])
  const snapshot = loadProjectManagementSnapshot()
  const projectManagementProjects = Array.isArray(snapshot?.projects) ? snapshot.projects as Array<Record<string, unknown>> : []
  const mapped = projectManagementProjects
    .filter(project => !project.archivedAt)
    .map(project => ({
      id: String(project.id || ''),
      name: String(project.name || 'Project workflow'),
      client: String(project.clientId || ''),
      department: String(project.department || 'Project Management Team'),
      description: String(project.description || ''),
      deleted: Boolean(project.archivedAt),
      workflowIcon: 'workflow',
      workflowColor: '#0ea5e9',
    }))
    .filter(project => project.id)
  return uniqueBy([...legacy, ...mapped], project => String(project.id))
}

export function loadWorkflowTasks() {
  const legacy = loadStored<AssignedTask[]>(tasksStorageKey, [])
  const snapshot = loadProjectManagementSnapshot()
  const members = Array.isArray(snapshot?.members) ? snapshot.members as Array<Record<string, unknown>> : []
  const memberById = new Map(members.map(member => [String(member.id || ''), String(member.name || '')]))
  const projectTasks = Array.isArray(snapshot?.tasks) ? snapshot.tasks as Array<Record<string, unknown>> : []
  const mapped = projectTasks
    .filter(task => !task.archivedAt)
    .map(task => {
      const assigneeName = memberById.get(String(task.assigneeId || '')) || String(task.assigneeId || '')
      return {
        id: String(task.id || ''),
        projectId: String(task.projectId || ''),
        title: String(task.title || 'Project task'),
        description: String(task.description || ''),
        status: normalizeProjectTaskStatus(String(task.status || 'To Do')),
        priority: normalizeProjectPriority(String(task.priority || 'Medium')),
        assignee: assigneeName,
        assignees: assigneeName ? [assigneeName] : [],
        dueDate: String(task.dueDate || ''),
        createdAt: String(task.updatedAt || task.startDate || task.dueDate || ''),
        draft: false,
        source: 'Manual' as const,
      }
    })
    .filter(task => task.id && task.projectId)
  return uniqueBy([...legacy, ...mapped], task => String(task.id))
}

export function nextNumericId(rows: Array<{ id: number | string }>) {
  return rows.reduce((max, row) => Math.max(max, typeof row.id === 'number' ? row.id : Number(row.id) || 0), 0) + 1
}

export function saveWorkflowTasks(tasks: AssignedTask[]) {
  if (typeof window === 'undefined') return
  const legacyTasks = tasks.filter(task => typeof task.id === 'number' || !String(task.id).startsWith('tsk-'))
  window.localStorage.setItem(tasksStorageKey, JSON.stringify(legacyTasks))
  window.dispatchEvent(new Event(workflowDataChangedEvent))
  window.dispatchEvent(new Event('storage'))
}

export function addWorkflowNotification(subject: string, message: string, target: string) {
  if (typeof window === 'undefined') return
  const rows = readStored<Array<Record<string, unknown>>>(outboundNotificationsKey, [])
  const next = {
    id: Date.now(),
    channel: 'In-App',
    recipientRole: 'Admin',
    subject,
    message,
    relatedType: 'Workflow',
    relatedId: subject,
    status: 'Queued',
    target,
    createdAt: new Date().toISOString(),
  }
  window.localStorage.setItem(outboundNotificationsKey, JSON.stringify([next, ...rows].slice(0, 100)))
  window.dispatchEvent(new Event('storage'))
}

function uniqueBy<T>(rows: T[], keyFor: (row: T) => string) {
  const seen = new Set<string>()
  return rows.filter(row => {
    const key = keyFor(row)
    if (!key || seen.has(key)) return false
    seen.add(key)
    return true
  })
}
