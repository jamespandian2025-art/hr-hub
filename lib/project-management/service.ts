'use client'

import { emptyProjectManagementState } from './mock-data'
import type { DocumentType, MilestoneStatus, ProjectActivity, ProjectDocument, ProjectManagementState, ProjectMember, ProjectMilestone, ProjectOpportunitySource, ProjectRecord, ProjectStatus, ProjectTask, ProjectTaskAttachment, ProjectTaskChecklistItem, ProjectTaskComment, ProjectTimeLog, TaskStatus } from './types'
import { clearLegacyBusinessRows, listBusinessRecords, replaceBusinessCollection } from '@/lib/business/client'
import { companyScopedKey, getActiveCompany } from '@/lib/tenant/company'

const legacyProjectsKey = 'flowsys-projects'
const salesWorkspaceKey = 'wiseflow-sales-workspace'
const legacyOpportunitiesKey = 'flowsys-opportunities'
const clientsKey = 'flowsys-clients'
const employeesKey = 'flowsys-hr-employees'
const accountKey = 'flowsys-account'
const authKey = 'flowsys-auth-session'

const avatarColors = ['#2563eb', '#16a34a', '#f59e0b', '#8b5cf6', '#ef4444', '#0891b2']
const maxPersistedInlineDataUrlChars = 300_000
const projectAssetDbName = 'wiseflow-project-management-assets'
const projectAssetStoreName = 'project-thumbnails'
const projectStateCollection = 'project-management-state'
let projectStateCache: ProjectManagementState | null = null
let projectStateHydratedCompanyId = ''
let projectRefreshPromise: { companyId: string; promise: Promise<ProjectManagementState> } | null = null

export type ProjectUpdateDraft = Partial<Pick<ProjectRecord,
  'name' | 'clientId' | 'description' | 'status' | 'health' | 'priority' | 'progress' | 'budget' | 'spent' | 'committed' | 'startDate' | 'dueDate' | 'managerId' | 'memberIds' | 'tags' | 'department' | 'code' | 'projectType' | 'contractType' | 'location' | 'budgetBreakdown' | 'settings' | 'thumbnailDataUrl' | 'thumbnailAssetId' | 'opportunityId' | 'opportunitySource'
>>

export type ProjectCreateDraft = Pick<ProjectRecord, 'name' | 'clientId' | 'description' | 'budget' | 'dueDate' | 'department'> & Partial<Pick<ProjectRecord, 'startDate' | 'managerId' | 'memberIds' | 'tags' | 'code' | 'projectType' | 'contractType' | 'location' | 'budgetBreakdown' | 'settings' | 'thumbnailDataUrl' | 'thumbnailAssetId' | 'opportunityId' | 'opportunitySource'>> & { clientName?: string }

export type ProjectSalesOpportunity = {
  id: string
  source: ProjectOpportunitySource
  label: string
  clientName: string
  value: number
  status: string
  expectedCloseDate?: string
  clientId?: string
}

type ProjectClient = ProjectManagementState['clients'][number]

export type MilestoneDraft = Pick<ProjectMilestone, 'projectId' | 'title' | 'dueDate' | 'priority' | 'status'> & {
  phase?: string
  baselineDate?: string
}

export type MilestoneUpdateDraft = Partial<Pick<ProjectMilestone, 'title' | 'phase' | 'baselineDate' | 'dueDate' | 'priority' | 'status'>>

type InitialTaskAttachmentDraft = Pick<ProjectTaskAttachment, 'name' | 'fileType' | 'mimeType' | 'size'> & Partial<Pick<ProjectTaskAttachment, 'evidence' | 'note' | 'dataUrl' | 'fileUrl' | 'objectKey' | 'storageProvider'>>

export type TaskDraft = Pick<ProjectTask, 'projectId' | 'title' | 'description' | 'assigneeId' | 'priority' | 'dueDate'> & Partial<Pick<ProjectTask, 'status' | 'startDate' | 'category' | 'followers' | 'department' | 'team' | 'duration' | 'workingDays' | 'estimatedHours' | 'timeType' | 'budget' | 'billable' | 'costCode' | 'progress' | 'labels' | 'dependencies' | 'recurrence' | 'recurrenceInterval' | 'recurrenceEndDate'>> & {
  initialAttachments?: InitialTaskAttachmentDraft[]
  initialChecklist?: string[]
}

export type TaskUpdateDraft = Partial<Pick<ProjectTask,
  'projectId' | 'title' | 'description' | 'assigneeId' | 'priority' | 'status' | 'startDate' | 'dueDate' | 'category' | 'followers' | 'department' | 'team' | 'duration' | 'workingDays' | 'estimatedHours' | 'timeType' | 'budget' | 'billable' | 'costCode' | 'dependencies' | 'labels' | 'attachments' | 'comments' | 'progress' | 'recurrence' | 'recurrenceInterval' | 'recurrenceEndDate'
>>

export type TaskAttachmentDraft = Pick<ProjectTaskAttachment, 'taskId' | 'name' | 'fileType' | 'mimeType' | 'size'> & Partial<Pick<ProjectTaskAttachment, 'evidence' | 'note' | 'dataUrl' | 'fileUrl' | 'objectKey' | 'storageProvider'>>

export type TaskChecklistDraft = Pick<ProjectTaskChecklistItem, 'taskId' | 'title'>

function readJson<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback
  try {
    const raw = window.localStorage.getItem(key)
    return raw ? JSON.parse(raw) as T : fallback
  } catch {
    return fallback
  }
}

function openProjectAssetDb() {
  if (typeof window === 'undefined' || !window.indexedDB) return Promise.resolve<IDBDatabase | null>(null)
  return new Promise<IDBDatabase | null>(resolve => {
    const request = window.indexedDB.open(projectAssetDbName, 1)
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(projectAssetStoreName)) db.createObjectStore(projectAssetStoreName)
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => resolve(null)
    request.onblocked = () => resolve(null)
  })
}

export async function saveProjectThumbnailAsset(assetId: string, dataUrl: string) {
  if (!assetId || !dataUrl) return false
  const db = await openProjectAssetDb()
  if (!db) return false
  return new Promise<boolean>(resolve => {
    try {
      const transaction = db.transaction(projectAssetStoreName, 'readwrite')
      transaction.objectStore(projectAssetStoreName).put({ dataUrl, updatedAt: new Date().toISOString() }, assetId)
      transaction.oncomplete = () => {
        db.close()
        resolve(true)
      }
      transaction.onerror = () => {
        db.close()
        resolve(false)
      }
      transaction.onabort = () => {
        db.close()
        resolve(false)
      }
    } catch {
      db.close()
      resolve(false)
    }
  })
}

export async function loadProjectThumbnailAsset(assetId?: string) {
  if (!assetId) return undefined
  const db = await openProjectAssetDb()
  if (!db) return undefined
  return new Promise<string | undefined>(resolve => {
    try {
      const transaction = db.transaction(projectAssetStoreName, 'readonly')
      const request = transaction.objectStore(projectAssetStoreName).get(assetId)
      request.onsuccess = () => {
        const value = request.result as { dataUrl?: string } | undefined
        db.close()
        resolve(value?.dataUrl)
      }
      request.onerror = () => {
        db.close()
        resolve(undefined)
      }
    } catch {
      db.close()
      resolve(undefined)
    }
  })
}

function compactInlineDataUrl(value?: string) {
  if (!value) return undefined
  if (!value.startsWith('data:')) return value
  return value.length <= maxPersistedInlineDataUrlChars ? value : undefined
}

function normalizeProjectManagementStateCompany(state: ProjectManagementState, companyId = state.companyId): ProjectManagementState {
  const scopedCompanyId = companyId || state.companyId || 'wiseflow-local'
  return {
    ...state,
    companyId: scopedCompanyId,
    projects: state.projects.map(project => ({ ...project, companyId: scopedCompanyId })),
  }
}

function compactProjectManagementState(state: ProjectManagementState): ProjectManagementState {
  const scopedState = normalizeProjectManagementStateCompany(state)
  return {
    ...scopedState,
    projects: scopedState.projects.map(project => ({
      ...project,
      thumbnailDataUrl: project.thumbnailAssetId ? undefined : compactInlineDataUrl(project.thumbnailDataUrl),
    })),
    taskAttachments: scopedState.taskAttachments.map(attachment => ({
      ...attachment,
      dataUrl: compactInlineDataUrl(attachment.dataUrl),
    })),
  }
}

function timestamp(value: unknown) {
  if (typeof value !== 'string' || !value) return 0
  const parsed = Date.parse(value)
  return Number.isFinite(parsed) ? parsed : 0
}

function stateFreshness(state: ProjectManagementState | null | undefined) {
  if (!state) return 0
  const projects = Array.isArray(state.projects) ? state.projects : []
  const tasks = Array.isArray(state.tasks) ? state.tasks : []
  const milestones = Array.isArray(state.milestones) ? state.milestones : []
  const documents = Array.isArray(state.documents) ? state.documents : []
  const taskComments = Array.isArray(state.taskComments) ? state.taskComments : []
  const taskAttachments = Array.isArray(state.taskAttachments) ? state.taskAttachments : []
  const taskChecklists = Array.isArray(state.taskChecklists) ? state.taskChecklists : []
  const activities = Array.isArray(state.activities) ? state.activities : []
  return [
    state.savedAt,
    ...projects.map(project => project.updatedAt),
    ...tasks.map(task => task.updatedAt),
    ...milestones.map(milestone => milestone.completedAt),
    ...documents.map(document => document.updatedAt),
    ...taskComments.map(comment => comment.createdAt),
    ...taskAttachments.map(attachment => attachment.uploadedAt),
    ...taskChecklists.map(item => item.completedAt || item.createdAt),
    ...activities.map(item => item.createdAt),
  ].reduce((latest, value) => Math.max(latest, timestamp(value)), 0)
}

function newestProjectManagementState(states: Array<ProjectManagementState | null | undefined>) {
  return states.reduce<ProjectManagementState | null>((latest, candidate) => {
    if (!candidate) return latest
    if (!latest) return candidate
    return stateFreshness(candidate) > stateFreshness(latest) ? candidate : latest
  }, null)
}

function text(row: Record<string, unknown>, keys: string[], fallback = '') {
  for (const key of keys) {
    const value = row[key]
    if (typeof value === 'string' && value.trim()) return value.trim()
    if (typeof value === 'number') return String(value)
  }
  return fallback
}

function clientFromRow(row: Record<string, unknown>, index: number): ProjectClient {
  const name = text(row, ['name', 'companyName', 'clientName', 'customerName', 'businessName', 'company'], `Client ${index + 1}`)
  return {
    id: text(row, ['id', 'clientId', 'customerId'], slugifyClientName(name, `client-${index + 1}`)),
    name,
  }
}

function slugifyClientName(value: string, fallback: string) {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80) || fallback
}

function isKnownClientId(clientId: string, clients: ProjectClient[]) {
  const normalized = clientId.trim().toLowerCase()
  if (!normalized || normalized === 'client-local') return false
  return clients.some(client => client.id.trim().toLowerCase() === normalized || client.name.trim().toLowerCase() === normalized)
}

function validProjectClientId(clientId: string | undefined, clients: ProjectClient[]) {
  if (clientId && isKnownClientId(clientId, clients)) return clientId
  return clients[0]?.id || 'client-local'
}

function number(row: Record<string, unknown>, keys: string[], fallback = 0) {
  for (const key of keys) {
    const value = row[key]
    const parsed = typeof value === 'number' ? value : typeof value === 'string' ? Number(value.replace(/,/g, '')) : Number.NaN
    if (Number.isFinite(parsed)) return parsed
  }
  return fallback
}

function opportunitySource(value: unknown): ProjectOpportunitySource | undefined {
  return value === 'sales' || value === 'legacy' ? value : undefined
}

function addDays(date: string, days: number) {
  const next = new Date(`${date}T00:00:00`)
  next.setDate(next.getDate() + days)
  return next.toISOString().slice(0, 10)
}

function addMonths(date: string, months: number) {
  const next = new Date(`${date}T00:00:00`)
  next.setMonth(next.getMonth() + months)
  return next.toISOString().slice(0, 10)
}

function nextRecurringDueDate(task: ProjectTask) {
  const interval = Math.max(1, Number(task.recurrenceInterval) || 1)
  if (task.recurrence === 'Daily') return addDays(task.dueDate, interval)
  if (task.recurrence === 'Weekly') return addDays(task.dueDate, interval * 7)
  if (task.recurrence === 'Monthly') return addMonths(task.dueDate, interval)
  return ''
}

function readAccountLike(): Record<string, unknown> | null {
  return readJson<Record<string, unknown> | null>(accountKey, null) || readJson<Record<string, unknown> | null>(authKey, null)
}

function currentCompanyId(fallback = 'wiseflow-local') {
  const activeCompanyId = getActiveCompany()?.id
  if (activeCompanyId) return activeCompanyId
  const account = readAccountLike()
  return account ? text(account, ['companyId', 'tenantId', 'organizationId'], fallback) : fallback
}

function readScopedLegacyRows<T>(keys: string[], companyId: string) {
  if (typeof window === 'undefined') return [] as T[]
  const includeUnscopedFallback = !companyId || companyId === 'wiseflow-local'
  const rows: T[] = []
  const seenKeys = new Set<string>()
  keys.flatMap(key => includeUnscopedFallback ? [companyScopedKey(key, companyId), key] : [companyScopedKey(key, companyId)]).forEach(key => {
    if (seenKeys.has(key)) return
    seenKeys.add(key)
    try {
      const parsed = JSON.parse(window.localStorage.getItem(key) || '[]') as unknown
      if (Array.isArray(parsed)) parsed.forEach(item => rows.push(item as T))
    } catch {
      // Ignore invalid legacy browser payloads during one-time migration.
    }
  })
  return rows
}

function currentActorId(state: ProjectManagementState) {
  const account = readAccountLike()
  if (!account) return state.members[0]?.id || 'system'
  return text(account, ['id', 'userId', 'employeeId'], state.members[0]?.id || 'system')
}

function activity(state: ProjectManagementState, projectId: string, action: string): ProjectActivity {
  return {
    id: `act-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    projectId,
    actorId: currentActorId(state),
    action,
    createdAt: new Date().toISOString(),
  }
}

function uniqueById<T extends { id: string }>(items: T[]) {
  const seen = new Set<string>()
  return items.filter(item => {
    if (!item.id || seen.has(item.id)) return false
    seen.add(item.id)
    return true
  })
}

function loadLocalClients() {
  const companyId = currentCompanyId('')
  const rows = readJson<Array<Record<string, unknown>>>(companyScopedKey(clientsKey, companyId), [])
  return uniqueById(rows.map(clientFromRow))
}

async function loadBusinessClients(companyId: string) {
  const rows = await listBusinessRecords<Record<string, unknown>>('clients', companyId).catch(() => [])
  return uniqueById(rows.map(clientFromRow))
}

function loadMembers(): ProjectMember[] {
  const companyId = currentCompanyId('')
  const rows = readJson<Array<Record<string, unknown>>>(companyScopedKey(employeesKey, companyId), [])
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

export function loadSalesOpportunities(): ProjectSalesOpportunity[] {
  const companyId = currentCompanyId('')
  const workspace = readJson<{ opportunities?: Array<Record<string, unknown>> }>(
    companyScopedKey(salesWorkspaceKey, companyId),
    { opportunities: [] },
  )
  const salesOpportunities = Array.isArray(workspace.opportunities) ? workspace.opportunities : []
  const legacyScoped = readJson<Array<Record<string, unknown>>>(companyScopedKey(legacyOpportunitiesKey, companyId), [])
  const legacyUnscoped = companyId ? [] : readJson<Array<Record<string, unknown>>>(legacyOpportunitiesKey, [])

  const mappedSales: ProjectSalesOpportunity[] = salesOpportunities.map((row, index) => {
    const id = text(row, ['id', 'opportunityId'], `sales-${index + 1}`)
    return {
      id,
      source: 'sales',
      label: text(row, ['name', 'projectName', 'title'], `Opportunity ${index + 1}`),
      clientName: text(row, ['client', 'clientName', 'companyName'], 'Unassigned client'),
      value: number(row, ['estimatedContractValue', 'contractValue', 'amount', 'quotation', 'approvedBudget']),
      status: text(row, ['stage', 'status'], 'Lead'),
      expectedCloseDate: text(row, ['expectedCloseDate', 'closeDate', 'endDate']),
      clientId: text(row, ['clientId', 'customerId']) || undefined,
    }
  })

  const mappedLegacy: ProjectSalesOpportunity[] = [...legacyScoped, ...legacyUnscoped].map((row, index) => {
    const id = text(row, ['id', 'opportunityId'], `legacy-${index + 1}`)
    return {
      id,
      source: 'legacy',
      label: text(row, ['name', 'projectName', 'title'], `Opportunity ${index + 1}`),
      clientName: text(row, ['client', 'clientName', 'companyName'], 'Unassigned client'),
      value: number(row, ['quotation', 'approvedBudget', 'estimatedContractValue', 'amount']),
      status: text(row, ['status', 'stage'], 'Pending'),
      expectedCloseDate: text(row, ['endDate', 'expectedCloseDate', 'closeDate']),
      clientId: text(row, ['clientId', 'customerId']) || undefined,
    }
  })

  const seen = new Set<string>()
  return [...mappedSales, ...mappedLegacy].filter(opportunity => {
    const key = `${opportunity.source}:${opportunity.id}`
    if (!opportunity.id || seen.has(key)) return false
    seen.add(key)
    return true
  })
}

function liveBaseState(): ProjectManagementState {
  return {
    ...emptyProjectManagementState,
    companyId: currentCompanyId('wiseflow-local'),
    clients: loadLocalClients(),
    members: loadMembers(),
  }
}

async function liveBaseStateWithBusinessClients(base: ProjectManagementState): Promise<ProjectManagementState> {
  const clients = await loadBusinessClients(base.companyId)
  return clients.length ? { ...base, clients } : base
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
    opportunityId: text(row, ['opportunityId']) || undefined,
    opportunitySource: opportunitySource(row.opportunitySource),
  }
}

function hydrateState(state: ProjectManagementState, base: ProjectManagementState): ProjectManagementState {
  const members = Array.isArray(state.members) ? state.members : []
  return normalizeProjectManagementStateCompany({
    ...base,
    ...state,
    savedAt: state.savedAt,
    companyId: base.companyId,
    clients: base.clients,
    members: uniqueById([...members, ...base.members]),
    projects: Array.isArray(state.projects) ? state.projects : [],
    tasks: Array.isArray(state.tasks) ? state.tasks : [],
    milestones: Array.isArray(state.milestones) ? state.milestones : [],
    timeLogs: Array.isArray(state.timeLogs) ? state.timeLogs : [],
    documents: Array.isArray(state.documents) ? state.documents : [],
    taskComments: Array.isArray(state.taskComments) ? state.taskComments : [],
    taskAttachments: Array.isArray(state.taskAttachments) ? state.taskAttachments : [],
    taskChecklists: Array.isArray(state.taskChecklists) ? state.taskChecklists : [],
    activities: Array.isArray(state.activities) ? state.activities : [],
  }, base.companyId)
}

export function loadProjectManagementState(): ProjectManagementState {
  const base = liveBaseState()
  if (projectStateCache && projectStateHydratedCompanyId === base.companyId) {
    return projectStateCache
  }

  if (typeof window !== 'undefined') void refreshProjectManagementState()
  return base
}

export async function refreshProjectManagementState(): Promise<ProjectManagementState> {
  const base = liveBaseState()
  if (projectRefreshPromise?.companyId === base.companyId) return projectRefreshPromise.promise

  const promise = (async () => {
    const liveBase = await liveBaseStateWithBusinessClients(base)
    const rows = await listBusinessRecords<ProjectManagementState>(projectStateCollection, liveBase.companyId).catch(() => [])
    let state = rows[0] ? hydrateState(rows[0], liveBase) : null

    if (!state) {
      const legacy = readScopedLegacyRows<Record<string, unknown>>([legacyProjectsKey], liveBase.companyId)
      if (legacy.length) {
        const managerId = liveBase.members[0]?.id || ''
        state = {
          ...liveBase,
          projects: legacy.map((project, index) => {
            const mapped = mapLegacyProject(project, index)
            return { ...mapped, companyId: liveBase.companyId, managerId, memberIds: managerId ? [managerId] : [] }
          }),
        }
      }
    }

    const compacted = compactProjectManagementState(state || liveBase)
    const cached = projectStateCache && projectStateHydratedCompanyId === base.companyId
      ? hydrateState(projectStateCache, liveBase)
      : null
    projectStateCache = newestProjectManagementState([
      compacted,
      cached,
    ]) || compacted
    projectStateHydratedCompanyId = base.companyId
    await replaceBusinessCollection(projectStateCollection, [projectStateCache], base.companyId).catch(() => [])
    clearLegacyBusinessRows([legacyProjectsKey], base.companyId)
    if (typeof window !== 'undefined') window.dispatchEvent(new Event('wiseflow-project-management-refresh'))
    return projectStateCache
  })().finally(() => {
    if (projectRefreshPromise?.companyId === base.companyId && projectRefreshPromise.promise === promise) {
      projectRefreshPromise = null
    }
  })

  projectRefreshPromise = { companyId: base.companyId, promise }
  return promise
}

export function saveProjectManagementState(state: ProjectManagementState) {
  const companyId = currentCompanyId(state.companyId)
  const persistedState = compactProjectManagementState({ ...state, companyId, savedAt: new Date().toISOString() })
  projectStateCache = persistedState
  projectStateHydratedCompanyId = companyId
  void replaceBusinessCollection(projectStateCollection, [persistedState], companyId).catch(() => undefined)
  if (typeof window !== 'undefined') window.dispatchEvent(new Event('wiseflow-project-management-refresh'))
}

export function createProjectRecord(state: ProjectManagementState, draft: ProjectCreateDraft): ProjectManagementState {
  const clientId = validProjectClientId(draft.clientId, state.clients)
  const managerId = draft.managerId || state.members[0]?.id || ''
  const memberIds = draft.memberIds?.length ? draft.memberIds : state.members.slice(0, 2).map(member => member.id)
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
    startDate: draft.startDate || new Date().toISOString().slice(0, 10),
    dueDate: draft.dueDate,
    managerId,
    memberIds,
    tags: draft.tags || [],
    department: draft.department,
    code: draft.code,
    projectType: draft.projectType,
    contractType: draft.contractType,
    location: draft.location,
    budgetBreakdown: draft.budgetBreakdown,
    settings: draft.settings,
    thumbnailDataUrl: draft.thumbnailDataUrl,
    thumbnailAssetId: draft.thumbnailAssetId,
    opportunityId: draft.opportunityId || undefined,
    opportunitySource: draft.opportunityId ? draft.opportunitySource : undefined,
    updatedAt: new Date().toISOString(),
  }
  const actionText = project.opportunityId ? `Created project ${project.name} and linked sales opportunity` : `Created project ${project.name}`
  return { ...state, projects: [project, ...state.projects], activities: [activity(state, project.id, actionText), ...state.activities] }
}

export function updateProjectRecord(state: ProjectManagementState, projectId: string, patch: ProjectUpdateDraft, action = 'Updated project details'): ProjectManagementState {
  const project = state.projects.find(item => item.id === projectId)
  if (!project) return state
  const clientId = patch.clientId === undefined ? project.clientId : validProjectClientId(patch.clientId, state.clients)
  const nextProject: ProjectRecord = {
    ...project,
    ...patch,
    clientId,
    progress: patch.progress === undefined ? project.progress : Math.max(0, Math.min(Number(patch.progress) || 0, 100)),
    budget: patch.budget === undefined ? project.budget : Number(patch.budget) || 0,
    spent: patch.spent === undefined ? project.spent : Number(patch.spent) || 0,
    committed: patch.committed === undefined ? project.committed : Number(patch.committed) || 0,
    memberIds: patch.memberIds ? Array.from(new Set(patch.memberIds.filter(Boolean))) : project.memberIds,
    tags: patch.tags ? Array.from(new Set(patch.tags.map(tag => tag.trim()).filter(Boolean))) : project.tags,
    updatedAt: new Date().toISOString(),
  }
  const normalizedProject = nextProject.opportunityId ? nextProject : { ...nextProject, opportunitySource: undefined }
  return {
    ...state,
    projects: state.projects.map(item => item.id === projectId ? normalizedProject : item),
    activities: [activity(state, projectId, action), ...state.activities],
  }
}

export function updateProjectStatusRecord(state: ProjectManagementState, projectId: string, status: ProjectStatus): ProjectManagementState {
  return updateProjectRecord(state, projectId, { status }, `Changed project status to ${status}`)
}

export function archiveProjectRecord(state: ProjectManagementState, projectId: string): ProjectManagementState {
  const project = state.projects.find(item => item.id === projectId)
  if (!project) return state
  return {
    ...state,
    projects: state.projects.map(item => item.id === projectId ? { ...item, archivedAt: new Date().toISOString(), updatedAt: new Date().toISOString() } : item),
    activities: [activity(state, projectId, `Archived project ${project.name}`), ...state.activities],
  }
}

export function restoreProjectRecord(state: ProjectManagementState, projectId: string): ProjectManagementState {
  const project = state.projects.find(item => item.id === projectId)
  if (!project) return state
  return {
    ...state,
    projects: state.projects.map(item => item.id === projectId ? { ...item, archivedAt: undefined, updatedAt: new Date().toISOString() } : item),
    activities: [activity(state, projectId, `Restored project ${project.name}`), ...state.activities],
  }
}

export function deleteProjectRecord(state: ProjectManagementState, projectId: string): ProjectManagementState {
  return {
    ...state,
    projects: state.projects.filter(project => project.id !== projectId),
    tasks: state.tasks.filter(task => task.projectId !== projectId),
    milestones: state.milestones.filter(milestone => milestone.projectId !== projectId),
    timeLogs: state.timeLogs.filter(log => log.projectId !== projectId),
    documents: state.documents.filter(document => document.projectId !== projectId),
    taskComments: state.taskComments.filter(comment => comment.projectId !== projectId),
    taskAttachments: state.taskAttachments.filter(attachment => attachment.projectId !== projectId),
    taskChecklists: state.taskChecklists.filter(item => item.projectId !== projectId),
    activities: state.activities.filter(item => item.projectId !== projectId),
  }
}

export function addProjectNoteRecord(state: ProjectManagementState, projectId: string, note: string): ProjectManagementState {
  const trimmed = note.trim()
  if (!trimmed) return state
  return {
    ...state,
    activities: [activity(state, projectId, `Note: ${trimmed}`), ...state.activities],
  }
}

export function createMilestoneRecord(state: ProjectManagementState, draft: MilestoneDraft): ProjectManagementState {
  const title = draft.title.trim() || 'Untitled milestone'
  const milestone: ProjectMilestone = {
    id: `mil-${Date.now()}`,
    projectId: draft.projectId,
    title,
    phase: draft.phase?.trim() || 'Planning',
    baselineDate: draft.baselineDate || draft.dueDate,
    dueDate: draft.dueDate,
    priority: draft.priority,
    status: draft.status,
    completedAt: draft.status === 'Done' ? new Date().toISOString() : undefined,
  }
  return {
    ...state,
    milestones: [milestone, ...state.milestones],
    activities: [activity(state, draft.projectId, `Created milestone ${title}`), ...state.activities],
  }
}

export function updateMilestoneRecord(state: ProjectManagementState, milestoneId: string, patch: MilestoneUpdateDraft): ProjectManagementState {
  const milestone = state.milestones.find(item => item.id === milestoneId)
  if (!milestone) return state
  const status = patch.status || milestone.status
  const title = patch.title?.trim() || milestone.title
  const nextMilestone: ProjectMilestone = {
    ...milestone,
    ...patch,
    title,
    phase: patch.phase?.trim() || milestone.phase || 'Planning',
    baselineDate: patch.baselineDate || milestone.baselineDate || patch.dueDate || milestone.dueDate,
    dueDate: patch.dueDate || milestone.dueDate,
    status,
    completedAt: status === 'Done' ? milestone.completedAt || new Date().toISOString() : undefined,
  }
  return {
    ...state,
    milestones: state.milestones.map(item => item.id === milestoneId ? nextMilestone : item),
    activities: [activity(state, milestone.projectId, `Updated milestone ${title}`), ...state.activities],
  }
}

export function updateMilestoneStatusRecord(state: ProjectManagementState, milestoneId: string, status: MilestoneStatus): ProjectManagementState {
  const milestone = state.milestones.find(item => item.id === milestoneId)
  if (!milestone) return state
  return {
    ...state,
    milestones: state.milestones.map(item => item.id === milestoneId ? { ...item, status, completedAt: status === 'Done' ? item.completedAt || new Date().toISOString() : undefined } : item),
    activities: [activity(state, milestone.projectId, `Changed milestone ${milestone.title} to ${status}`), ...state.activities],
  }
}

export function deleteMilestoneRecord(state: ProjectManagementState, milestoneId: string): ProjectManagementState {
  const milestone = state.milestones.find(item => item.id === milestoneId)
  if (!milestone) return state
  return {
    ...state,
    milestones: state.milestones.filter(item => item.id !== milestoneId),
    activities: [activity(state, milestone.projectId, `Deleted milestone ${milestone.title}`), ...state.activities],
  }
}

export function createTaskRecord(state: ProjectManagementState, draft: TaskDraft): ProjectManagementState {
  const title = draft.title.trim() || 'New task'
  const now = new Date().toISOString()
  const task: ProjectTask = {
    id: `tsk-${Date.now()}`,
    projectId: draft.projectId,
    assigneeId: draft.assigneeId || state.members[0]?.id || '',
    title,
    description: draft.description,
    priority: draft.priority,
    status: draft.status || 'To Do',
    startDate: draft.startDate,
    dueDate: draft.dueDate,
    category: draft.category,
    followers: draft.followers || [],
    department: draft.department,
    team: draft.team,
    duration: draft.duration,
    workingDays: draft.workingDays,
    estimatedHours: draft.estimatedHours,
    timeType: draft.timeType,
    budget: draft.budget,
    billable: draft.billable,
    costCode: draft.costCode,
    dependencies: Array.from(new Set((draft.dependencies || []).filter(Boolean))),
    labels: draft.labels || [],
    attachments: draft.initialAttachments?.length || 0,
    comments: 0,
    progress: Math.max(0, Math.min(Number(draft.progress) || 0, 100)),
    recurrence: draft.recurrence || 'None',
    recurrenceInterval: draft.recurrence && draft.recurrence !== 'None' ? Math.max(1, Number(draft.recurrenceInterval) || 1) : undefined,
    recurrenceEndDate: draft.recurrence && draft.recurrence !== 'None' ? draft.recurrenceEndDate || undefined : undefined,
    updatedAt: now,
  }
  const attachments = (draft.initialAttachments || []).map((attachment, index): ProjectTaskAttachment => ({
    id: `att-${Date.now()}-${index}`,
    taskId: task.id,
    projectId: task.projectId,
    name: attachment.name,
    fileType: attachment.fileType,
    mimeType: attachment.mimeType,
    size: attachment.size,
    uploadedAt: now,
    ownerId: task.assigneeId || currentActorId(state),
    evidence: Boolean(attachment.evidence),
    note: attachment.note,
    dataUrl: attachment.dataUrl,
    fileUrl: attachment.fileUrl,
    objectKey: attachment.objectKey,
    storageProvider: attachment.storageProvider,
  }))
  const checklist = (draft.initialChecklist || []).map((item, index): ProjectTaskChecklistItem => ({
    id: `chk-${Date.now()}-${index}`,
    taskId: task.id,
    projectId: task.projectId,
    title: item.trim(),
    done: false,
    createdAt: now,
  })).filter(item => item.title)
  return {
    ...state,
    tasks: [task, ...state.tasks],
    taskAttachments: [...attachments, ...state.taskAttachments],
    taskChecklists: [...checklist, ...state.taskChecklists],
    activities: [activity(state, task.projectId, `Created task ${title}`), ...state.activities],
  }
}

export function updateTaskRecord(state: ProjectManagementState, taskId: string, patch: TaskUpdateDraft, actionText?: string): ProjectManagementState {
  const task = state.tasks.find(item => item.id === taskId)
  if (!task) return state
  const title = patch.title?.trim() || task.title
  const recurrence = patch.recurrence === undefined ? task.recurrence || 'None' : patch.recurrence
  const nextTask: ProjectTask = {
    ...task,
    ...patch,
    title,
    description: patch.description === undefined ? task.description : patch.description,
    assigneeId: patch.assigneeId === undefined ? task.assigneeId : patch.assigneeId,
    priority: patch.priority || task.priority,
    status: patch.status || task.status,
    dueDate: patch.dueDate || task.dueDate,
    dependencies: patch.dependencies ? Array.from(new Set(patch.dependencies.filter(Boolean))) : task.dependencies,
    labels: patch.labels ? Array.from(new Set(patch.labels.map(label => label.trim()).filter(Boolean))) : task.labels,
    attachments: patch.attachments === undefined ? task.attachments : Math.max(0, Number(patch.attachments) || 0),
    comments: patch.comments === undefined ? task.comments : Math.max(0, Number(patch.comments) || 0),
    progress: patch.progress === undefined ? task.progress : Math.max(0, Math.min(Number(patch.progress) || 0, 100)),
    recurrence,
    recurrenceInterval: recurrence === 'None' ? undefined : Math.max(1, Number(patch.recurrenceInterval ?? task.recurrenceInterval) || 1),
    recurrenceEndDate: recurrence === 'None' ? undefined : patch.recurrenceEndDate ?? task.recurrenceEndDate,
    updatedAt: new Date().toISOString(),
  }
  const nextDueDate = task.status !== 'Done' && nextTask.status === 'Done' ? nextRecurringDueDate(nextTask) : ''
  const recurrenceAllowed = Boolean(nextDueDate && (!nextTask.recurrenceEndDate || new Date(`${nextDueDate}T00:00:00`).getTime() <= new Date(`${nextTask.recurrenceEndDate}T23:59:59`).getTime()))
  const recurringTask: ProjectTask | null = recurrenceAllowed ? {
    ...nextTask,
    id: `tsk-${Date.now()}-r`,
    status: 'To Do',
    progress: 0,
    dueDate: nextDueDate,
    dependencies: [],
    attachments: 0,
    comments: 0,
    archivedAt: undefined,
    recurringParentId: nextTask.recurringParentId || nextTask.id,
    recurrenceGeneratedFromId: nextTask.id,
    updatedAt: new Date().toISOString(),
  } : null
  const recurringChecklistItems: ProjectTaskChecklistItem[] = recurringTask ? state.taskChecklists
    .filter(item => item.taskId === task.id)
    .map(item => ({
      ...item,
      id: `tcl-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      taskId: recurringTask.id,
      done: false,
      createdAt: new Date().toISOString(),
      completedAt: undefined,
    })) : []
  return {
    ...state,
    tasks: recurringTask ? [recurringTask, ...state.tasks.map(item => item.id === taskId ? nextTask : item)] : state.tasks.map(item => item.id === taskId ? nextTask : item),
    taskChecklists: recurringChecklistItems.length ? [...recurringChecklistItems, ...state.taskChecklists] : state.taskChecklists,
    activities: [
      ...(recurringTask ? [activity(state, nextTask.projectId, `Created next recurring task ${recurringTask.title}`)] : []),
      activity(state, nextTask.projectId, actionText || `Updated task ${title}`),
      ...state.activities,
    ],
  }
}

export function updateTaskStatus(state: ProjectManagementState, taskId: string, status: TaskStatus): ProjectManagementState {
  return updateTaskRecord(state, taskId, { status }, `Changed task status to ${status}`)
}

export function archiveTaskRecord(state: ProjectManagementState, taskId: string): ProjectManagementState {
  const task = state.tasks.find(item => item.id === taskId)
  if (!task) return state
  return {
    ...state,
    tasks: state.tasks.map(item => item.id === taskId ? { ...item, archivedAt: new Date().toISOString(), updatedAt: new Date().toISOString() } : item),
    activities: [activity(state, task.projectId, `Archived task ${task.title}`), ...state.activities],
  }
}

export function deleteTaskRecord(state: ProjectManagementState, taskId: string): ProjectManagementState {
  const task = state.tasks.find(item => item.id === taskId)
  if (!task) return state
  return {
    ...state,
    tasks: state.tasks.filter(item => item.id !== taskId).map(item => ({ ...item, dependencies: item.dependencies.filter(id => id !== taskId) })),
    timeLogs: state.timeLogs.filter(log => log.taskId !== taskId),
    taskComments: state.taskComments.filter(comment => comment.taskId !== taskId),
    taskAttachments: state.taskAttachments.filter(attachment => attachment.taskId !== taskId),
    taskChecklists: state.taskChecklists.filter(item => item.taskId !== taskId),
    activities: [activity(state, task.projectId, `Deleted task ${task.title}`), ...state.activities],
  }
}

export function addTaskChecklistItemRecord(state: ProjectManagementState, draft: TaskChecklistDraft): ProjectManagementState {
  const task = state.tasks.find(item => item.id === draft.taskId)
  const title = draft.title.trim()
  if (!task || !title) return state
  const checklistItem: ProjectTaskChecklistItem = {
    id: `tcl-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    taskId: task.id,
    projectId: task.projectId,
    title,
    done: false,
    createdAt: new Date().toISOString(),
  }
  return {
    ...state,
    taskChecklists: [checklistItem, ...state.taskChecklists],
    activities: [activity(state, task.projectId, `Added checklist item to task ${task.title}`), ...state.activities],
  }
}

export function updateTaskChecklistItemRecord(state: ProjectManagementState, itemId: string, patch: Partial<Pick<ProjectTaskChecklistItem, 'title' | 'done'>>): ProjectManagementState {
  const checklistItem = state.taskChecklists.find(item => item.id === itemId)
  if (!checklistItem) return state
  const nextDone = patch.done === undefined ? checklistItem.done : patch.done
  const title = patch.title?.trim() || checklistItem.title
  return {
    ...state,
    taskChecklists: state.taskChecklists.map(item => item.id === itemId ? {
      ...item,
      title,
      done: nextDone,
      completedAt: nextDone ? item.completedAt || new Date().toISOString() : undefined,
    } : item),
  }
}

export function deleteTaskChecklistItemRecord(state: ProjectManagementState, itemId: string): ProjectManagementState {
  const checklistItem = state.taskChecklists.find(item => item.id === itemId)
  if (!checklistItem) return state
  const task = state.tasks.find(item => item.id === checklistItem.taskId)
  return {
    ...state,
    taskChecklists: state.taskChecklists.filter(item => item.id !== itemId),
    activities: task ? [activity(state, task.projectId, `Removed checklist item from task ${task.title}`), ...state.activities] : state.activities,
  }
}

export function addTaskCommentRecord(state: ProjectManagementState, taskId: string, body: string): ProjectManagementState {
  const task = state.tasks.find(item => item.id === taskId)
  const trimmed = body.trim()
  if (!task || !trimmed) return state
  const comment: ProjectTaskComment = {
    id: `tc-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    taskId,
    projectId: task.projectId,
    actorId: currentActorId(state),
    body: trimmed,
    createdAt: new Date().toISOString(),
  }
  return {
    ...state,
    tasks: state.tasks.map(item => item.id === taskId ? { ...item, comments: item.comments + 1, updatedAt: new Date().toISOString() } : item),
    taskComments: [comment, ...state.taskComments],
    activities: [activity(state, task.projectId, `Commented on task ${task.title}`), ...state.activities],
  }
}

export function addTaskAttachmentRecord(state: ProjectManagementState, draft: TaskAttachmentDraft): ProjectManagementState {
  const task = state.tasks.find(item => item.id === draft.taskId)
  if (!task) return state
  const attachment: ProjectTaskAttachment = {
    id: `ta-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    taskId: task.id,
    projectId: task.projectId,
    name: draft.name.trim() || 'Task file',
    fileType: draft.fileType || 'File',
    mimeType: draft.mimeType || 'application/octet-stream',
    size: draft.size || '0 KB',
    uploadedAt: new Date().toISOString(),
    ownerId: currentActorId(state),
    evidence: Boolean(draft.evidence),
    note: draft.note?.trim() || undefined,
    dataUrl: draft.dataUrl,
    fileUrl: draft.fileUrl,
    objectKey: draft.objectKey,
    storageProvider: draft.storageProvider,
  }
  return {
    ...state,
    tasks: state.tasks.map(item => item.id === task.id ? { ...item, attachments: item.attachments + 1, updatedAt: new Date().toISOString() } : item),
    taskAttachments: [attachment, ...state.taskAttachments],
    activities: [activity(state, task.projectId, `${attachment.evidence ? 'Added completion evidence to' : 'Attached file to'} task ${task.title}`), ...state.activities],
  }
}

export function deleteTaskAttachmentRecord(state: ProjectManagementState, attachmentId: string): ProjectManagementState {
  const attachment = state.taskAttachments.find(item => item.id === attachmentId)
  if (!attachment) return state
  const task = state.tasks.find(item => item.id === attachment.taskId)
  return {
    ...state,
    tasks: state.tasks.map(item => item.id === attachment.taskId ? { ...item, attachments: Math.max(0, item.attachments - 1), updatedAt: new Date().toISOString() } : item),
    taskAttachments: state.taskAttachments.filter(item => item.id !== attachmentId),
    activities: task ? [activity(state, task.projectId, `Removed file from task ${task.title}`), ...state.activities] : state.activities,
  }
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
