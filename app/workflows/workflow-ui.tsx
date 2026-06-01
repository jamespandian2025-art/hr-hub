'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  Archive,
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  BarChart3,
  Bell,
  BriefcaseBusiness,
  Calendar,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  Clock,
  Copy,
  ExternalLink,
  FileText,
  Flag,
  Folder,
  FolderPlus,
  HelpCircle,
  Layers,
  LayoutDashboard,
  Menu,
  MoreHorizontal,
  MoreVertical,
  Paperclip,
  Package,
  Pencil,
  PlayCircle,
  Plus,
  Plug,
  RotateCcw,
  Search,
  Settings,
  ShieldCheck,
  ShoppingCart,
  SlidersHorizontal,
  Star,
  Trash2,
  Truck,
  UploadCloud,
  UserRound,
  UsersRound,
  Zap,
  Workflow,
} from 'lucide-react'
import { companyChangeEvent, companyScopedKey, getActiveCompany } from '@/lib/tenant/company'

const projectsStorageKey = 'flowsys-projects'
const tasksStorageKey = 'flowsys-assigned-tasks'
const accountStorageKey = 'flowsys-account'
const projectManagementStorageKey = 'wiseflow-project-management-state'
const outboundNotificationsKey = 'flowsys-outbound-notifications'
const workflowDataChangedEvent = 'wiseflow-workflows-data-changed'

const departments = [
  'Procurement',
  'Design Team',
  'Engineering Dept',
  'Quantity Surveying/Estimates',
  'Project Management Team',
  'No Group',
]

type TaskStatus = 'Open' | 'In Progress' | 'Completed'

type WorkflowStage = {
  id: string
  name: string
  type: 'normal' | 'done' | 'failed'
  color?: string
  order?: number
  owners?: string[]
  workers?: string[]
}

type ProjectRecord = {
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

type AssignedTask = {
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

type AccountRecord = {
  fullName?: string
  name?: string
  role?: string
}

function loadStored<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback
  try {
    const stored = window.localStorage.getItem(key)
    return stored ? JSON.parse(stored) as T : fallback
  } catch {
    return fallback
  }
}

function readStored<T>(key: string, fallback: T): T {
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

function uniqueBy<T>(rows: T[], keyFor: (row: T) => string) {
  const seen = new Set<string>()
  return rows.filter(row => {
    const key = keyFor(row)
    if (!key || seen.has(key)) return false
    seen.add(key)
    return true
  })
}

function nextNumericId(rows: Array<{ id: number | string }>) {
  return rows.reduce((max, row) => Math.max(max, typeof row.id === 'number' ? row.id : Number(row.id) || 0), 0) + 1
}

function saveWorkflowTasks(tasks: AssignedTask[]) {
  if (typeof window === 'undefined') return
  const legacyTasks = tasks.filter(task => typeof task.id === 'number' || !String(task.id).startsWith('tsk-'))
  window.localStorage.setItem(tasksStorageKey, JSON.stringify(legacyTasks))
  window.dispatchEvent(new Event(workflowDataChangedEvent))
  window.dispatchEvent(new Event('storage'))
}

function addWorkflowNotification(subject: string, message: string, target: string) {
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

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map(part => part[0]).join('').toUpperCase() || 'WF'
}

function groupLabel(value?: string) {
  return value?.trim() || 'No Group'
}

function groupKey(value: string) {
  return value.toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

function colorFor(name: string) {
  const colors = ['#0ea5a4', '#0f9f5f', '#b99600', '#dc4c4c', '#2789a8', '#6d5bd7', '#607080']
  let seed = 0
  for (let index = 0; index < name.length; index++) seed = (seed * 31 + name.charCodeAt(index)) % colors.length
  return colors[seed]
}

function projectMembers(project: ProjectRecord, tasks: AssignedTask[]) {
  const names = [
    ...(project.reviewers || []),
    ...(project.stages || []).flatMap(stage => [...(stage.owners || []), ...(stage.workers || [])]),
    ...tasks.flatMap(task => [task.assignee, ...(task.assignees || [])]),
  ].filter(Boolean) as string[]
  return Array.from(new Set(names)).slice(0, 4)
}

function fullProjectMembers(project: ProjectRecord, tasks: AssignedTask[]) {
  const names = [
    ...(project.reviewers || []),
    ...(project.stages || []).flatMap(stage => [...(stage.owners || []), ...(stage.workers || [])]),
    ...tasks.flatMap(task => [task.assignee, ...(task.assignees || [])]),
  ].filter(Boolean) as string[]
  return Array.from(new Set(names))
}

function getFailedCount(project: ProjectRecord, tasks: AssignedTask[]) {
  const failedStageIds = new Set((project.stages || []).filter(stage => stage.type === 'failed').map(stage => stage.id))
  return tasks.filter(task => task.stageId && failedStageIds.has(task.stageId)).length
}

function isOverdue(task: AssignedTask) {
  if (!task.dueDate || task.status === 'Completed') return false
  const today = new Date()
  const todayTime = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime()
  return new Date(`${task.dueDate}T00:00:00`).getTime() < todayTime
}

function formatDue(date?: string) {
  if (!date) return 'No date'
  return new Date(`${date}T00:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function formatDateTime(date?: string) {
  if (!date) return '-'
  const parsed = new Date(date.includes('T') ? date : `${date}T00:00:00`)
  if (Number.isNaN(parsed.getTime())) return '-'
  return parsed.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function statusForStage(stage?: WorkflowStage): TaskStatus {
  if (stage?.type === 'done') return 'Completed'
  if (stage?.name.toLowerCase().includes('progress')) return 'In Progress'
  return 'Open'
}

function priorityMeta(task: AssignedTask) {
  const priority = task.priority || (isOverdue(task) ? 'Urgent' : 'Normal')
  if (priority === 'High' || priority === 'Urgent') return { label: priority, className: 'high', icon: <ArrowUp size={14} /> }
  if (priority === 'Low') return { label: 'Low', className: 'low', icon: <ArrowDown size={14} /> }
  return { label: 'Medium', className: 'medium', icon: <span /> }
}

function progressForTask(task: AssignedTask, stage?: WorkflowStage) {
  if (task.status === 'Completed' || stage?.type === 'done') return 100
  if (stage?.type === 'failed') return 0
  if (task.status === 'In Progress') return 40
  if (isOverdue(task)) return 70
  return 0
}

function parseTaskDate(date?: string) {
  if (!date) return null
  const parsed = new Date(`${date}T00:00:00`)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

function sameDate(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

const fallbackStages: WorkflowStage[] = [
  { id: 'wf-open', name: 'Open', type: 'normal', color: '#8b5cf6', order: 10 },
  { id: 'wf-progress', name: 'In Progress', type: 'normal', color: '#0ea5e9', order: 20 },
  { id: 'wf-done', name: 'Done', type: 'done', color: '#0f9f5f', order: 100 },
  { id: 'wf-failed', name: 'Failed', type: 'failed', color: '#ef4444', order: 200 },
]

function getWorkflowStages(project?: ProjectRecord) {
  const stages = project?.stages?.length ? [...project.stages] : fallbackStages
  const hasDone = stages.some(stage => stage.type === 'done')
  const hasFailed = stages.some(stage => stage.type === 'failed')
  return [
    ...stages,
    ...(!hasDone ? [{ id: 'wf-done', name: 'Done', type: 'done' as const, color: '#0f9f5f', order: 100 }] : []),
    ...(!hasFailed ? [{ id: 'wf-failed', name: 'Failed', type: 'failed' as const, color: '#ef4444', order: 200 }] : []),
  ].sort((a, b) => (a.order || 0) - (b.order || 0))
}

function taskStage(task: AssignedTask, stages: WorkflowStage[]) {
  if (task.stageId) {
    const exact = stages.find(stage => stage.id === task.stageId)
    if (exact) return exact
  }
  if (task.status === 'Completed') return stages.find(stage => stage.type === 'done') || stages.at(-1)
  if (task.status === 'In Progress') return stages.find(stage => stage.name.toLowerCase().includes('progress')) || stages.find(stage => stage.type === 'normal')
  return stages.find(stage => stage.type === 'normal') || stages[0]
}

function workflowStats(project: ProjectRecord, allTasks: AssignedTask[]) {
  const tasks = allTasks.filter(task => task.projectId === project.id)
  const done = tasks.filter(task => task.status === 'Completed').length
  const failed = getFailedCount(project, tasks)
  const overdue = tasks.filter(isOverdue).length
  const completion = tasks.length ? Math.round((done / tasks.length) * 100) : 0
  const members = fullProjectMembers(project, tasks)
  const owner = members[0] || project.reviewers?.[0] || 'Unassigned'
  return { tasks, done, failed, overdue, completion, members, owner }
}

function WorkflowShell({
  title,
  subtitle,
  actions,
  children,
}: {
  title: string
  subtitle?: string
  actions?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <main className="wf-page">
      <style>{workflowCss}</style>
      <section className="wf-page-header">
        <div>
          <h1>{title}</h1>
          {subtitle && <p>{subtitle}</p>}
        </div>
        {actions}
      </section>
      {children}
    </main>
  )
}

function WorkflowCard({ project, tasks }: { project: ProjectRecord; tasks: AssignedTask[] }) {
  const done = tasks.filter(task => task.status === 'Completed').length
  const failed = getFailedCount(project, tasks)
  const members = projectMembers(project, tasks)
  const percent = tasks.length ? Math.max(8, Math.min(100, Math.round((done / tasks.length) * 100))) : 0
  const color = project.workflowColor || colorFor(project.name)

  return (
    <Link href={`/workflows/${project.id}`} className="wf-card">
      <div className="wf-card-main">
        <div className="wf-card-icon" style={{ '--wf-card-color': color } as React.CSSProperties}>{initials(project.name)}</div>
        <div>
          <h3>{project.name}</h3>
          <p>{project.description || project.client || 'Workflow service for team jobs and stage tracking.'}</p>
        </div>
      </div>
      <div className="wf-members">
        {members.length ? members.map(name => <span key={name}>{initials(name)}</span>) : <span>JP</span>}
        {members.length > 3 && <em>+{members.length - 3}</em>}
      </div>
      <div className="wf-progress"><span style={{ width: `${percent}%` }} /></div>
      <div className="wf-card-stats">
        <span>{tasks.length} Jobs</span>
        <strong>{done} Done</strong>
        <b>{failed} Failed</b>
      </div>
    </Link>
  )
}

export function MyWorkflowsPageClient() {
  const [projects, setProjects] = useState<ProjectRecord[]>(loadWorkflowProjects)
  const [tasks, setTasks] = useState<AssignedTask[]>(loadWorkflowTasks)
  useEffect(() => {
    const reload = () => {
      setProjects(loadWorkflowProjects())
      setTasks(loadWorkflowTasks())
    }
    window.addEventListener('storage', reload)
    window.addEventListener(companyChangeEvent, reload)
    window.addEventListener(workflowDataChangedEvent, reload)
    return () => {
      window.removeEventListener('storage', reload)
      window.removeEventListener(companyChangeEvent, reload)
      window.removeEventListener(workflowDataChangedEvent, reload)
    }
  }, [])
  const visibleProjects = projects.filter(project => !project.deleted)
  const hasWorkflows = visibleProjects.length > 0

  const grouped = useMemo(() => {
    return departments.map(department => {
      const projectsInGroup = visibleProjects.filter(project => groupKey(groupLabel(project.department)) === groupKey(department))
      return { department, projects: projectsInGroup }
    })
  }, [visibleProjects])
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(() => (
    new Set(grouped.filter(group => group.projects.length === 0).map(group => group.department))
  ))
  const toggleGroup = (department: string) => {
    setCollapsedGroups(current => {
      const next = new Set(current)
      if (next.has(department)) next.delete(department)
      else next.add(department)
      return next
    })
  }

  return (
    <WorkflowShell
      title="My Workflows"
      subtitle="All workflows on which you are a member"
      actions={(
        <div className="wf-header-actions">
        <label className="wf-search"><Search size={16} /><input placeholder="Search workflows..." /></label>
        <button className="wf-filter" type="button">Active workflows <ChevronDown size={15} /></button>
        <Link className="wf-primary" href="/workflows/create">+ Create workflow service</Link>
        </div>
      )}
    >
      {!hasWorkflows ? (
        <section className="wf-empty-state">
          <div className="wf-empty-art"><Workflow size={54} /></div>
          <h2>No workflows yet</h2>
          <p>You&apos;re not a member of any workflow yet.<br />Once you&apos;re added to a workflow, it will appear here.</p>
          <Link className="wf-primary" href="/workflows/create">+ Create workflow service</Link>
          <Link className="wf-learn" href="/workflows/reports">Learn more about workflows <ExternalLink size={14} /></Link>
        </section>
      ) : (
        <section className="wf-groups">
          {grouped.map(group => {
            const isCollapsed = collapsedGroups.has(group.department)
            return (
            <div className={isCollapsed ? 'wf-group is-collapsed' : 'wf-group'} key={group.department}>
              <div className="wf-group-header">
                <button
                  type="button"
                  aria-expanded={!isCollapsed}
                  onClick={() => toggleGroup(group.department)}
                >
                  <ChevronDown size={16} />
                  {group.department.toUpperCase()} ({group.projects.length})
                </button>
                <Link href={`/workflows/create?department=${encodeURIComponent(group.department)}`}>+ New workflow</Link>
              </div>
              {!isCollapsed && group.projects.length > 0 && (
                <div className="wf-card-grid">
                  {group.projects.map(project => (
                    <WorkflowCard key={project.id} project={project} tasks={tasks.filter(task => task.projectId === project.id)} />
                  ))}
                </div>
              )}
            </div>
            )
          })}
        </section>
      )}
    </WorkflowShell>
  )
}

function SummaryCard({
  icon,
  title,
  value,
  detail,
  tone,
}: {
  icon: React.ReactNode
  title: string
  value: number
  detail: string
  tone: string
}) {
  return (
    <article className="wf-summary-card">
      <span style={{ '--wf-summary-tone': tone } as React.CSSProperties}>{icon}</span>
      <div>
        <p>{title}</p>
        <strong>{value}</strong>
        <small>{detail}</small>
      </div>
    </article>
  )
}

function JobsMetric({ icon, label, value, detail, tone }: { icon: React.ReactNode; label: string; value: number; detail: string; tone: string }) {
  return (
    <article className="wf-jobs-metric" style={{ '--wf-tone': tone } as React.CSSProperties}>
      <span>{icon}</span>
      <div>
        <strong>{value}</strong>
        <p>{label}</p>
        <small>{detail}</small>
      </div>
    </article>
  )
}

export function MyJobsPageClient() {
  const [projects, setProjects] = useState<ProjectRecord[]>(loadWorkflowProjects)
  const [tasks, setTasks] = useState<AssignedTask[]>(loadWorkflowTasks)
  const [account] = useState(() => loadStored<AccountRecord>(accountStorageKey, {}))
  useEffect(() => {
    const reload = () => {
      setProjects(loadWorkflowProjects())
      setTasks(loadWorkflowTasks())
    }
    window.addEventListener('storage', reload)
    window.addEventListener(companyChangeEvent, reload)
    window.addEventListener(workflowDataChangedEvent, reload)
    return () => {
      window.removeEventListener('storage', reload)
      window.removeEventListener(companyChangeEvent, reload)
      window.removeEventListener(workflowDataChangedEvent, reload)
    }
  }, [])
  const currentUser = account.fullName || account.name || 'James Pandian'
  const projectById = new Map(projects.map(project => [project.id, project]))
  const today = new Date()
  const todayTime = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime()
  const myTasks = tasks.filter(task => [task.assignee, ...(task.assignees || [])].filter(Boolean).includes(currentUser))
  const visibleTasks = (myTasks.length ? myTasks : tasks).filter(task => !task.draft)
  const dueToday = visibleTasks.filter(task => task.status !== 'Completed' && task.dueDate && new Date(`${task.dueDate}T00:00:00`).getTime() === todayTime).length
  const overdue = visibleTasks.filter(isOverdue).length
  const completed = visibleTasks.filter(task => task.status === 'Completed').length
  const highPriority = visibleTasks.filter(task => task.priority === 'High' || task.priority === 'Urgent').length

  return (
    <main className="wf-my-jobs-page">
      <style>{workflowCss}</style>
      <section className="wf-my-jobs-header">
        <div className="wf-my-jobs-title">
          <div>
            <div className="wf-list-breadcrumb">Dashboard / Workflows / <strong>My Jobs</strong></div>
            <h1>My Jobs</h1>
            <p>All jobs assigned to you across workflows.</p>
          </div>
        </div>
        <div className="wf-my-jobs-actions">
          <label><Search size={16} /><input placeholder="Search jobs..." /></label>
          <button type="button"><SlidersHorizontal size={15} /> Filters</button>
          <button type="button"><ArrowUpDown size={15} /> Sort</button>
          <button type="button">Bulk actions <ChevronDown size={15} /></button>
        </div>
      </section>

      <section className="wf-jobs-metrics">
        <JobsMetric icon={<UserRound size={24} />} label="Assigned to Me" value={visibleTasks.length} detail="All active jobs" tone="#0f9f5f" />
        <JobsMetric icon={<Calendar size={24} />} label="Due Today" value={dueToday} detail="Due today" tone="#f59e0b" />
        <JobsMetric icon={<Clock size={24} />} label="Overdue" value={overdue} detail="Past deadline" tone="#ef4444" />
        <JobsMetric icon={<CheckCircle2 size={24} />} label="Completed" value={completed} detail="This month" tone="#0f9f5f" />
        <JobsMetric icon={<ArrowUp size={24} />} label="High Priority" value={highPriority} detail="Urgent & High" tone="#8b5cf6" />
      </section>

      <nav className="wf-my-jobs-tabs">
        {['Assigned to Me', 'Created by Me', 'Following', 'Team Jobs'].map((item, index) => (
          <button className={index === 0 ? 'active' : ''} type="button" key={item}>{index === 0 ? <UserRound size={15} /> : <UsersRound size={15} />}{item}</button>
        ))}
      </nav>

      <section className="wf-my-jobs-table">
        <div className="wf-my-jobs-row head">
          <span className="check" />
          <span>Job</span>
          <span>Assigned</span>
          <span>Stage</span>
          <span>Priority</span>
          <span>Due Date</span>
          <span>Workflow</span>
          <span>Actions</span>
        </div>
        {visibleTasks.length ? visibleTasks.map(task => {
          const project = projectById.get(task.projectId)
          const stages = getWorkflowStages(project)
          const stage = taskStage(task, stages)
          const priority = priorityMeta(task)
          const assignees = Array.from(new Set([task.assignee, ...(task.assignees || [])].filter(Boolean))) as string[]
          const due = task.dueDate ? new Date(`${task.dueDate}T00:00:00`).getTime() : 0
          const dueLabel = task.status === 'Completed' ? 'Completed' : due && due < todayTime ? 'Overdue' : due === todayTime ? 'Due today' : task.dueDate ? `${Math.ceil((due - todayTime) / 86400000)} days left` : ''
          const dotColor = project?.workflowColor || colorFor(project?.name || 'Workflow')
          return (
            <div className="wf-my-jobs-row" key={task.id}>
              <span className="check" />
              <span className="job">
                <Link href={project ? `/workflows/${project.id}/jobs/${task.id}` : '/workflows/my-jobs'}>{task.title}</Link>
                <small>{project?.name || 'Workflow'} · {project ? `${initials(project.name)}-${String(task.id).padStart(4, '0')}` : `JOB-${task.id}`}</small>
                <em>{task.description || 'No description added yet.'}</em>
              </span>
              <span className="assignees">
                {(assignees.length ? assignees : [currentUser]).slice(0, 2).map(name => <b key={name}>{initials(name)}</b>)}
                {assignees.length > 2 && <i>+{assignees.length - 2}</i>}
              </span>
              <span className="stage"><i style={{ background: stage?.color || dotColor }} /> {stage?.name || 'Open'}</span>
              <span className={`priority ${priority.className}`}>{priority.icon}{priority.label}</span>
              <span className={isOverdue(task) ? 'due overdue' : due === todayTime ? 'due today' : 'due'}><strong>{task.dueDate ? formatDue(task.dueDate) : '-'}</strong><small>{dueLabel}</small></span>
              <span className="workflow"><b style={{ background: dotColor }}>{project ? initials(project.name) : 'WF'}</b>{project?.name || 'Workflow'}</span>
              <span className="actions">{project && <Link href={`/workflows/${project.id}/jobs/${task.id}`}>Open</Link>}<button type="button"><MoreVertical size={16} /></button></span>
            </div>
          )
        }) : (
          <div className="wf-job-list-empty">
            <BriefcaseBusiness size={34} />
            <strong>No jobs assigned to you yet</strong>
            <span>Jobs assigned to you across workflows will appear here.</span>
          </div>
        )}
      </section>

      <footer className="wf-job-list-footer">
        <span>Showing {visibleTasks.length ? `1 to ${visibleTasks.length}` : '0'} of {visibleTasks.length} jobs</span>
        <div><button type="button">1</button><button type="button">10 / page <ChevronDown size={14} /></button></div>
      </footer>
    </main>
  )
}

export function AllWorkflowsPageClient() {
  const [projects, setProjects] = useState<ProjectRecord[]>(loadWorkflowProjects)
  const [tasks, setTasks] = useState<AssignedTask[]>(loadWorkflowTasks)
  useEffect(() => {
    const reload = () => {
      setProjects(loadWorkflowProjects())
      setTasks(loadWorkflowTasks())
    }
    window.addEventListener('storage', reload)
    window.addEventListener(companyChangeEvent, reload)
    window.addEventListener(workflowDataChangedEvent, reload)
    return () => {
      window.removeEventListener('storage', reload)
      window.removeEventListener(companyChangeEvent, reload)
      window.removeEventListener(workflowDataChangedEvent, reload)
    }
  }, [])
  const visibleProjects = projects.filter(project => !project.deleted)
  const archivedProjects = projects.filter(project => project.deleted)
  const totalDone = tasks.filter(task => task.status === 'Completed').length
  const overdueWorkflows = visibleProjects.filter(project => workflowStats(project, tasks).overdue > 0).length

  return (
    <main className="wf-page wf-list-page">
      <style>{workflowCss}</style>
      <section className="wf-list-header">
        <div>
          <div className="wf-list-breadcrumb">Workflows / <strong>All Workflows</strong></div>
          <h1>All Workflows</h1>
          <p>View and manage all workflows across the organization</p>
        </div>
        <div className="wf-list-actions">
          <button type="button">Import Workflow</button>
          <button type="button">More Actions <ChevronDown size={15} /></button>
          <Link href="/workflows/create" className="wf-primary">+ Create workflow service</Link>
        </div>
      </section>

      <section className="wf-summary-grid">
        <SummaryCard icon={<Layers size={26} />} title="Total Workflows" value={projects.length} detail={`${visibleProjects.length} active`} tone="#0f9f5f" />
        <SummaryCard icon={<PlayCircle size={26} />} title="Active Workflows" value={visibleProjects.length} detail="Available now" tone="#3b82f6" />
        <SummaryCard icon={<RotateCcw size={26} />} title="Inactive Workflows" value={visibleProjects.filter(project => workflowStats(project, tasks).tasks.length === 0).length} detail="No jobs yet" tone="#f59e0b" />
        <SummaryCard icon={<Archive size={26} />} title="Archived Workflows" value={archivedProjects.length} detail="Archived records" tone="#8b5cf6" />
        <SummaryCard icon={<CheckCircle2 size={26} />} title="Completed Jobs" value={totalDone} detail="Across workflows" tone="#0f9f5f" />
        <SummaryCard icon={<AlertTriangle size={26} />} title="Workflows At Risk" value={overdueWorkflows} detail="Have overdue jobs" tone="#f59e0b" />
      </section>

      <section className="wf-list-filters">
        <label><input placeholder="Search workflows..." /><Search size={16} /></label>
        <button type="button">Department: All <ChevronDown size={15} /></button>
        <button type="button">Status: All <ChevronDown size={15} /></button>
        <button type="button">Owner: All <ChevronDown size={15} /></button>
        <button type="button">Visibility: All <ChevronDown size={15} /></button>
        <button type="button">Tags: All <ChevronDown size={15} /></button>
        <button type="button" className="clear">Clear filters</button>
      </section>

      <section className="wf-list-table">
        <div className="wf-list-row header">
          <span>Workflow</span>
          <span>Department</span>
          <span>Owner</span>
          <span>Status</span>
          <span>Jobs</span>
          <span>Overdue</span>
          <span>Completion</span>
          <span>Last Activity</span>
          <span>Actions</span>
        </div>
        {visibleProjects.length ? visibleProjects.map(project => {
          const stats = workflowStats(project, tasks)
          const color = project.workflowColor || colorFor(project.name)
          return (
            <Link href={`/workflows/${project.id}`} className="wf-list-row" key={project.id}>
              <span className="wf-list-name">
                <b style={{ '--wf-card-color': color } as React.CSSProperties}>{initials(project.name)}</b>
                <span><strong>{project.name}</strong><small>{project.description || project.client || 'Workflow service'}</small></span>
              </span>
              <span><em className="wf-chip">{groupLabel(project.department)}</em></span>
              <span className="wf-owner"><i>{initials(stats.owner)}</i>{stats.owner}</span>
              <span><em className="wf-status">Active</em></span>
              <span className="wf-jobs-count"><strong>{stats.tasks.length}</strong><small>{stats.done} • {stats.overdue} • {stats.failed}</small></span>
              <span className={stats.overdue ? 'wf-overdue has' : 'wf-overdue'}>{stats.overdue}</span>
              <span className="wf-completion">{stats.completion}%<small><b style={{ width: `${stats.completion}%` }} /></small></span>
              <span className="wf-activity">Recently<small>{stats.owner}</small></span>
              <span><button type="button" className="wf-row-action" onClick={event => event.preventDefault()}><MoreHorizontal size={18} /></button></span>
            </Link>
          )
        }) : (
          <div className="wf-list-empty">No workflows yet. Create a workflow service to start tracking jobs.</div>
        )}
      </section>

      <footer className="wf-list-footer">
        <span>Showing {visibleProjects.length ? `1 to ${visibleProjects.length}` : '0'} of {visibleProjects.length} workflows</span>
        <div><button type="button">1</button><button type="button">10 / page</button></div>
      </footer>
    </main>
  )
}

const iconOptions = [
  { key: 'briefcase', icon: BriefcaseBusiness },
  { key: 'cart', icon: ShoppingCart },
  { key: 'file', icon: FileText },
  { key: 'people', icon: UsersRound },
  { key: 'settings', icon: Settings },
  { key: 'workflow', icon: Workflow },
  { key: 'truck', icon: Truck },
  { key: 'shield', icon: ShieldCheck },
  { key: 'package', icon: Package },
]

const colors = ['#10b981', '#14b8a6', '#0ea5e9', '#8b5cf6', '#ec4899', '#f59e0b', '#64748b']

export function CreateWorkflowPageClient() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [name, setName] = useState('')
  const [department, setDepartment] = useState(searchParams.get('department') || '')
  const [group, setGroup] = useState('')
  const [description, setDescription] = useState('')
  const [icon, setIcon] = useState(iconOptions[0].key)
  const [color, setColor] = useState(colors[0])
  const Icon = iconOptions.find(item => item.key === icon)?.icon || BriefcaseBusiness

  const createWorkflow = () => {
    if (!name.trim()) return
    const projects = loadStored<ProjectRecord[]>(projectsStorageKey, [])
    const account = loadStored<AccountRecord>(accountStorageKey, {})
    const next: ProjectRecord = {
      id: nextNumericId(projects),
      name: name.trim(),
      client: description.trim(),
      location: '',
      department: group || department || 'No Group',
      description: description.trim(),
      reviewers: [account.fullName || account.name || 'James Pandian'],
      workflowIcon: icon,
      workflowColor: color,
    }
    window.localStorage.setItem(projectsStorageKey, JSON.stringify([...projects, next]))
    addWorkflowNotification('Workflow created', `${next.name} is ready for jobs.`, `/workflows/${next.id}`)
    router.push('/workflows/my-workflows')
  }

  return (
    <main className="wf-page wf-create-page">
      <style>{workflowCss}</style>
      <section className="wf-create-shell">
        <Link className="wf-back" href="/workflows/my-workflows"><ChevronLeft size={16} /> Back to workflows</Link>
        <header className="wf-create-heading">
          <h1>Create workflow service</h1>
          <p>Build a new workflow to streamline and automate your business process.</p>
        </header>

        <div className="wf-steps">
          {['Basic information', 'Design workflow', 'Settings', 'Review & create'].map((step, index) => (
            <div className={index === 0 ? 'active' : ''} key={step}>
              <span>{index + 1}</span>
              <strong>{step}</strong>
              <small>{index === 0 ? 'Add workflow details' : index === 1 ? 'Add stages and structure' : index === 2 ? 'Assign owners and configure' : 'Review and publish'}</small>
            </div>
          ))}
        </div>

        <div className="wf-create-grid">
          <section className="wf-form-panel">
            <h2>Basic information</h2>
            <p>Provide the basic details of your workflow.</p>

            <label className="wf-field full">
              <span>Workflow name <b>*</b></span>
              <input value={name} onChange={event => setName(event.target.value)} placeholder="e.g. Procurement Workflow" />
              <small>Choose a clear and descriptive name for your workflow.</small>
            </label>

            <div className="wf-form-row">
              <label className="wf-field">
                <span>Department <b>*</b></span>
                <select value={department} onChange={event => setDepartment(event.target.value)}>
                  <option value="">Select department</option>
                  {departments.filter(item => item !== 'No Group').map(item => <option key={item} value={item}>{item}</option>)}
                </select>
              </label>
              <label className="wf-field">
                <span>Workflow group <em>(optional)</em></span>
                <select value={group} onChange={event => setGroup(event.target.value)}>
                  <option value="">Select group</option>
                  {departments.map(item => <option key={item} value={item}>{item}</option>)}
                </select>
                <small>This helps to categorize your workflow.</small>
              </label>
            </div>

            <label className="wf-field full">
              <span>Description <em>(optional)</em></span>
              <textarea value={description} onChange={event => setDescription(event.target.value)} placeholder="Describe the purpose and scope of this workflow..." />
              <small>Explain what this workflow is used for and who it&apos;s for.</small>
            </label>

            <div className="wf-picker">
              <span>Workflow icon & color</span>
              <small>Choose an icon and color to represent this workflow.</small>
              <div className="wf-icon-grid">
                {iconOptions.map(item => {
                  const PickerIcon = item.icon
                  return <button className={icon === item.key ? 'active' : ''} key={item.key} type="button" onClick={() => setIcon(item.key)}><PickerIcon size={23} /></button>
                })}
              </div>
              <div className="wf-color-row">
                {colors.map(item => <button className={color === item ? 'active' : ''} key={item} type="button" onClick={() => setColor(item)} style={{ '--wf-color': item } as React.CSSProperties}>{color === item && <Check size={17} />}</button>)}
              </div>
            </div>
          </section>

          <aside className="wf-preview-column">
            <section className="wf-preview-panel">
              <h2>Workflow preview</h2>
              <p>This is how your workflow will appear.</p>
              <div className="wf-preview-card">
                <div className="wf-card-main">
                  <div className="wf-card-icon" style={{ '--wf-card-color': color } as React.CSSProperties}><Icon size={24} /></div>
                  <div>
                    <h3>{name || 'Workflow name'}</h3>
                    <p>{group || department || 'Department'}</p>
                  </div>
                </div>
                <p>{description || 'Workflow description will appear here...'}</p>
                <div className="wf-progress"><span style={{ width: '0%' }} /></div>
                <div className="wf-card-stats"><span>0 Jobs</span><strong>0 Done</strong><b>0 Overdue</b></div>
              </div>
            </section>
            <section className="wf-tips">
              <h2>Tips</h2>
              {['Keep the workflow name short and meaningful.', 'Choose the right department for better organization.', 'You can always edit these details later.', 'Workflow stages and rules can be added next.'].map(tip => <p key={tip}><Check size={15} /> {tip}</p>)}
            </section>
          </aside>
        </div>

        <footer className="wf-create-footer">
          <Link href="/workflows/my-workflows">Cancel</Link>
          <button type="button" onClick={createWorkflow} disabled={!name.trim()}>Next: Design workflow</button>
        </footer>
      </section>
    </main>
  )
}

function JobCard({ task, projectId }: { task: AssignedTask; projectId: number | string }) {
  const isDone = task.status === 'Completed'
  const priority = isDone ? 'Completed' : task.priority || (isOverdue(task) ? 'Urgent' : 'Normal')
  const priorityClass = isDone ? 'done' : priority === 'Urgent' || priority === 'High' ? 'high' : priority === 'Low' ? 'low' : 'medium'
  const person = task.assignee || task.assignees?.[0] || 'Unassigned'
  return (
    <Link href={`/workflows/${projectId}/jobs/${task.id}`} className="wf-job-card">
      <h4>{task.title}</h4>
      <p>{task.description || `#${String(task.id).padStart(4, '0')}`}</p>
      <div className="wf-job-row">
        <span className="wf-mini-avatar">{initials(person)}</span>
        <small>{person}</small>
        <em className={priorityClass}>{isOverdue(task) && !isDone ? 'Overdue' : priority === 'Normal' ? 'Medium' : priority}</em>
      </div>
      <div className={isOverdue(task) && !isDone ? 'wf-job-date overdue' : 'wf-job-date'}><Calendar size={14} /> {formatDue(task.dueDate)}</div>
    </Link>
  )
}

function StageTemplatePanel({ onAddStage, onCreateTemplate }: { onAddStage: (name: string) => void; onCreateTemplate: () => void }) {
  return (
    <aside className="wf-stage-template">
      <div className="wf-template-art"><Package size={34} /></div>
      <h3>Create your first stage</h3>
      <p>Stages help organize jobs and visualize progress.</p>
      <small>Quick templates</small>
      <div className="wf-template-grid">
        {['Approval', 'Review', 'Procurement', 'Design', 'QA', 'Delivery'].map(item => (
          <button type="button" key={item} onClick={() => onAddStage(item)}>+ {item}</button>
        ))}
      </div>
      <button type="button" className="wf-template-primary" onClick={onCreateTemplate}>Create from template</button>
    </aside>
  )
}

function WorkflowJobList({ project, tasks, stages, mode = 'list' }: { project: ProjectRecord; tasks: AssignedTask[]; stages: WorkflowStage[]; mode?: 'list' | 'table' }) {
  return (
    <section className={mode === 'table' ? 'wf-job-list-view table-mode' : 'wf-job-list-view'}>
      <div className="wf-list-toolbar">
        <label><Search size={16} /><input placeholder="Search jobs..." /></label>
        <button type="button">All stages <ChevronDown size={15} /></button>
        <button type="button">Assigned to me <ChevronDown size={15} /></button>
        <button type="button">Priority: All <ChevronDown size={15} /></button>
        <button type="button">Due date <ChevronDown size={15} /></button>
        <button type="button" className="push">Filters</button>
        {mode === 'table' && <button type="button">Columns</button>}
      </div>

      <div className="wf-job-table">
        <div className="wf-job-table-row head">
          <span className="check" />
          <span>Job</span>
          <span>Stage</span>
          <span>Priority</span>
          <span>Assigned to</span>
          <span>Due date</span>
          <span>Progress</span>
          <span>Updated</span>
          <span>{mode === 'table' ? 'Actions' : ''}</span>
        </div>
        {tasks.length ? tasks.map(task => {
          const stage = taskStage(task, stages)
          const priority = priorityMeta(task)
          const progress = progressForTask(task, stage)
          const assignees = Array.from(new Set([task.assignee, ...(task.assignees || [])].filter(Boolean))) as string[]
          const dotColor = stage?.color || (stage?.type === 'done' ? '#9ca3af' : stage?.type === 'failed' ? '#ef4444' : colorFor(stage?.name || project.name))
          return (
            <div className="wf-job-table-row" key={task.id}>
              <span className="check" />
              <span className="job">
                <Link href={`/workflows/${project.id}/jobs/${task.id}`}>{task.title}</Link>
                <small>{initials(project.name)}-{String(task.id).padStart(4, '0')}</small>
              </span>
              <span className="stage"><i style={{ background: dotColor }} /> {stage?.name || 'Open'}</span>
              <span className={`priority ${priority.className}`}>{priority.icon}{priority.label}</span>
              <span className="assignees">
                {(assignees.length ? assignees : ['Unassigned']).slice(0, 2).map(name => <b key={name}>{initials(name)}</b>)}
                {assignees.length > 2 && <em>+{assignees.length - 2}</em>}
              </span>
              <span className={isOverdue(task) && task.status !== 'Completed' ? 'due overdue' : 'due'}><Calendar size={14} /> {task.dueDate ? formatDue(task.dueDate) : '-'}</span>
              <span className="progress"><i><b style={{ width: `${progress}%` }} /></i>{progress}%</span>
              <span className="updated">{task.createdAt ? 'Recently' : '-'}</span>
              <button type="button"><MoreVertical size={16} /></button>
            </div>
          )
        }) : (
          <div className="wf-job-list-empty">
            <FileText size={34} />
            <strong>No jobs yet</strong>
            <span>Jobs added to this workflow will appear here.</span>
            <Link href={`/workflows/${project.id}/add-job`}>+ Add job</Link>
          </div>
        )}
      </div>

      <footer className="wf-job-list-footer">
        <span>Showing {tasks.length ? `1 to ${tasks.length}` : '0'} of {tasks.length} jobs</span>
        <div><button type="button">1</button><button type="button">10 / page <ChevronDown size={14} /></button></div>
      </footer>
    </section>
  )
}

function WorkflowJobCalendar({ project, tasks, stages }: { project: ProjectRecord; tasks: AssignedTask[]; stages: WorkflowStage[] }) {
  const datedTasks = tasks.map(task => ({ task, date: parseTaskDate(task.dueDate) })).filter((item): item is { task: AssignedTask; date: Date } => Boolean(item.date))
  const baseDate = datedTasks[0]?.date || new Date()
  const monthStart = new Date(baseDate.getFullYear(), baseDate.getMonth(), 1)
  const gridStart = new Date(monthStart)
  gridStart.setDate(monthStart.getDate() - monthStart.getDay())
  const days = Array.from({ length: 42 }, (_, index) => {
    const day = new Date(gridStart)
    day.setDate(gridStart.getDate() + index)
    return day
  })
  const monthTitle = monthStart.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
  const stageLegend = stages.slice(0, 4)

  return (
    <section className="wf-calendar-view">
      <div className="wf-calendar-toolbar">
        <div>
          <button type="button">Today</button>
          <button type="button" aria-label="Previous month"><ChevronLeft size={16} /></button>
          <button type="button" aria-label="Next month"><ChevronDown size={16} className="rotate" /></button>
          <h2>{monthTitle} <ChevronDown size={16} /></h2>
        </div>
        <div>
          <button type="button">Month <ChevronDown size={15} /></button>
          <button type="button">Filters</button>
        </div>
      </div>

      <div className="wf-calendar-legend">
        {stageLegend.map(stage => (
          <span key={stage.id}><i style={{ background: stage.color || (stage.type === 'done' ? '#9ca3af' : stage.type === 'failed' ? '#ef4444' : colorFor(stage.name)) }} />{stage.name}</span>
        ))}
        {stages.length > 4 && <span><i className="muted" />+{stages.length - 4} more</span>}
      </div>

      <div className="wf-calendar-grid">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => <div className="wf-calendar-head" key={day}>{day}</div>)}
        {days.map(day => {
          const inMonth = day.getMonth() === monthStart.getMonth()
          const dayTasks = datedTasks.filter(item => sameDate(item.date, day))
          return (
            <div className={inMonth ? 'wf-calendar-day' : 'wf-calendar-day muted'} key={day.toISOString()}>
              <strong className={sameDate(day, new Date()) ? 'today' : ''}>{day.getDate()}</strong>
              <div>
                {dayTasks.slice(0, 2).map(({ task }) => {
                  const stage = taskStage(task, stages)
                  const dotColor = stage?.color || (stage?.type === 'done' ? '#9ca3af' : stage?.type === 'failed' ? '#ef4444' : colorFor(stage?.name || project.name))
                  const assignee = task.assignee || task.assignees?.[0]
                  return (
                    <article className="wf-calendar-job" key={task.id}>
                      <span style={{ background: dotColor }} />
                      <b>{task.title}</b>
                      <small>{initials(project.name)}-{String(task.id).padStart(4, '0')}</small>
                      {assignee && <em>{initials(assignee)}</em>}
                    </article>
                  )
                })}
                {dayTasks.length > 2 && <button type="button">+{dayTasks.length - 2} more</button>}
              </div>
            </div>
          )
        })}
      </div>

      <footer className="wf-job-list-footer">
        <span>Showing {tasks.length ? `1 to ${tasks.length}` : '0'} of {tasks.length} jobs</span>
      </footer>
    </section>
  )
}

function WorkflowFilesView({ project, tasks, stages }: { project: ProjectRecord; tasks: AssignedTask[]; stages: WorkflowStage[] }) {
  const stageFolders = stages.map(stage => {
    const stageTasks = tasks.filter(task => taskStage(task, stages)?.id === stage.id)
    const uploader = stage.owners?.[0] || stage.workers?.[0] || stageTasks[0]?.assignee || project.reviewers?.[0] || 'Team member'
    const latestTask = [...stageTasks].sort((a, b) => new Date(b.createdAt || b.dueDate || 0).getTime() - new Date(a.createdAt || a.dueDate || 0).getTime())[0]
    return {
      id: `stage-${stage.id}`,
      kind: 'folder' as const,
      name: stage.name,
      detail: `${stageTasks.length} job${stageTasks.length === 1 ? '' : 's'}`,
      type: '-',
      stage,
      uploadedBy: uploader,
      size: '-',
      uploadedAt: latestTask?.createdAt || latestTask?.dueDate,
    }
  }).filter(item => item.detail !== '0 jobs')

  const jobFiles = tasks.map(task => {
    const stage = taskStage(task, stages)
    return {
      id: `task-${task.id}`,
      kind: 'file' as const,
      name: `${task.title}.docx`,
      detail: initials(project.name) + '-' + String(task.id).padStart(4, '0'),
      type: 'DOCX',
      stage,
      uploadedBy: task.assignee || task.assignees?.[0] || 'Unassigned',
      size: '-',
      uploadedAt: task.createdAt || task.dueDate,
    }
  })

  const rows = [...stageFolders, ...jobFiles]

  return (
    <section className="wf-files-view">
      <div className="wf-files-toolbar">
        <label><Search size={16} /><input placeholder="Search files..." /></label>
        <button type="button">All file types <ChevronDown size={15} /></button>
        <button type="button">All stages <ChevronDown size={15} /></button>
        <button type="button">More filters</button>
        <span />
        <button type="button"><UploadCloud size={15} /> Upload files</button>
        <button type="button"><FolderPlus size={15} /> New folder</button>
      </div>

      <div className="wf-files-table">
        <div className="wf-files-row head">
          <span className="check" />
          <span>Name</span>
          <span>Type</span>
          <span>Stage</span>
          <span>Uploaded by</span>
          <span>Size</span>
          <span>Uploaded on</span>
          <span>Actions</span>
        </div>
        {rows.length ? rows.map(row => {
          const dotColor = row.stage?.color || (row.stage?.type === 'done' ? '#9ca3af' : row.stage?.type === 'failed' ? '#ef4444' : colorFor(row.stage?.name || project.name))
          return (
            <div className="wf-files-row" key={row.id}>
              <span className="check" />
              <span className="file-name">
                <b className={row.kind}>{row.kind === 'folder' ? <Folder size={20} /> : <FileText size={20} />}</b>
                <span><strong>{row.name}</strong><small>{row.detail}</small></span>
              </span>
              <span>{row.type}</span>
              <span className="stage"><i style={{ background: dotColor }} /> {row.stage?.name || '-'}</span>
              <span className="uploader"><b>{initials(row.uploadedBy)}</b>{row.uploadedBy}</span>
              <span>{row.size}</span>
              <span>{formatDateTime(row.uploadedAt)}</span>
              <button type="button"><MoreVertical size={16} /></button>
            </div>
          )
        }) : (
          <div className="wf-job-list-empty">
            <Folder size={34} />
            <strong>No files yet</strong>
            <span>Files uploaded to this workflow will appear here.</span>
          </div>
        )}
      </div>

      <footer className="wf-job-list-footer">
        <span>Showing {rows.length ? `1 to ${rows.length}` : '0'} of {rows.length} files</span>
        <div><button type="button">1</button><button type="button">10 / page <ChevronDown size={14} /></button></div>
      </footer>
    </section>
  )
}

function WorkflowActivityView({ project, tasks, stages }: { project: ProjectRecord; tasks: AssignedTask[]; stages: WorkflowStage[] }) {
  const rows = tasks.flatMap(task => {
    const stage = taskStage(task, stages)
    const user = task.assignee || task.assignees?.[0] || project.reviewers?.[0] || 'Team member'
    const date = task.createdAt || task.dueDate || new Date().toISOString()
    const code = `${initials(project.name)}-${String(task.id).padStart(4, '0')}`
    return [
      {
        id: `created-${task.id}`,
        time: date,
        user,
        action: 'Created',
        tone: 'created',
        entity: 'Job',
        dot: stage?.color || colorFor(stage?.name || project.name),
        details: `${task.title} (${code}) has been created`,
      },
      ...(task.priority && task.priority !== 'Normal' ? [{
        id: `priority-${task.id}`,
        time: date,
        user,
        action: 'Updated',
        tone: 'updated',
        entity: 'Job',
        dot: task.priority === 'Low' ? '#0f9f5f' : '#ef4444',
        details: `Updated priority to ${task.priority} for ${task.title} (${code})`,
      }] : []),
      ...(task.dueDate ? [{
        id: `due-${task.id}`,
        time: task.dueDate,
        user,
        action: task.status === 'Completed' ? 'Completed' : 'Updated',
        tone: task.status === 'Completed' ? 'created' : 'updated',
        entity: 'Job',
        dot: stage?.color || '#0ea5e9',
        details: task.status === 'Completed' ? `${task.title} (${code}) has been completed` : `Updated due date to ${formatDue(task.dueDate)} for ${task.title} (${code})`,
      }] : []),
    ]
  }).sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())

  return (
    <section className="wf-activity-view">
      <div className="wf-activity-toolbar">
        <label><Search size={16} /><input placeholder="Search activity..." /></label>
        <span />
        <button type="button">All activities <ChevronDown size={15} /></button>
        <button type="button"><Calendar size={15} /> {rows[0] ? formatDateTime(rows[rows.length - 1]?.time) : 'Start'} - {rows[0] ? formatDateTime(rows[0].time) : 'Today'} <ChevronDown size={15} /></button>
      </div>

      <div className="wf-activity-table">
        <div className="wf-activity-row head">
          <span>Time</span>
          <span>User</span>
          <span>Action</span>
          <span>Entity</span>
          <span>Details</span>
        </div>
        {rows.length ? rows.slice(0, 12).map(row => (
          <div className="wf-activity-row" key={row.id}>
            <span>{formatDateTime(row.time)}</span>
            <span className="actor"><b>{initials(row.user)}</b>{row.user}</span>
            <span><em className={row.tone}>{row.action}</em></span>
            <span className="entity"><i style={{ background: row.dot }} />{row.entity}</span>
            <span>{row.details}</span>
          </div>
        )) : (
          <div className="wf-job-list-empty">
            <Workflow size={34} />
            <strong>No activity yet</strong>
            <span>Workflow job changes will appear here.</span>
          </div>
        )}
      </div>

      <footer className="wf-job-list-footer">
        <span>Showing {rows.length ? `1 to ${Math.min(12, rows.length)}` : '0'} of {rows.length} activities</span>
        <div><button type="button">1</button><button type="button">10 / page <ChevronDown size={14} /></button></div>
      </footer>
    </section>
  )
}

function WorkflowSettingsView({ project, tasks }: { project: ProjectRecord; tasks: AssignedTask[] }) {
  const owner = fullProjectMembers(project, tasks)[0] || project.reviewers?.[0] || 'James Pandian'
  const color = project.workflowColor || colorFor(project.name)
  const workflowCode = `WFL-${String(project.id).padStart(4, '0')}`
  const workflowId = `workflow-${project.id}-${groupKey(project.name)}`
  const menu = [
    { label: 'General', icon: Settings, active: true },
    { label: 'Stages', icon: Layers },
    { label: 'Job types', icon: BriefcaseBusiness },
    { label: 'Custom fields', icon: FileText },
    { label: 'Forms', icon: FileText },
    { label: 'Automation', icon: Zap },
    { label: 'Notifications', icon: Bell },
    { label: 'Permissions', icon: ShieldCheck },
    { label: 'Members', icon: UsersRound },
    { label: 'Integrations', icon: Plug },
    { label: 'Activity log', icon: Workflow },
    { label: 'Danger zone', icon: Trash2, danger: true },
  ]

  return (
    <section className="wf-settings-view">
      <aside className="wf-settings-menu">
        {menu.map(item => {
          const Icon = item.icon
          return (
            <button className={item.active ? 'active' : item.danger ? 'danger' : ''} type="button" key={item.label}>
              <Icon size={16} /> {item.label}
            </button>
          )
        })}
      </aside>

      <div className="wf-settings-content">
        <header>
          <div>
            <h2>General</h2>
            <p>Manage basic workflow information and preferences.</p>
          </div>
          <button type="button"><Pencil size={15} /> Edit</button>
        </header>

        <section className="wf-settings-card">
          {[
            ['Workflow name', project.name],
            ['Workflow code', workflowCode],
            ['Description', project.description || project.client || 'Workflow service for team jobs and stage tracking.'],
            ['Workflow owner', owner],
            ['Default job assignee', 'Project owner'],
            ['Date format', 'MMM DD, YYYY'],
            ['Time format', '12-hour'],
            ['Timezone', '(GMT+08:00) Kuala Lumpur, Singapore'],
            ['Language', 'English (US)'],
          ].map(([label, value]) => (
            <div className="wf-settings-row" key={label}>
              <strong>{label}</strong>
              <span>{label === 'Workflow owner' ? <b>{initials(value)}</b> : null}{value}</span>
            </div>
          ))}
          <div className="wf-settings-row">
            <strong>Workflow color</strong>
            <span><i style={{ background: color }} /> {color.toUpperCase()}</span>
          </div>
        </section>

        <section className="wf-settings-card id-card">
          <h3>Workflow ID</h3>
          <p>Use this ID for API and integration purposes.</p>
          <div><code>{workflowId}</code><button type="button" aria-label="Copy workflow ID"><Copy size={16} /></button></div>
        </section>

        <section className="wf-settings-card archive-card">
          <div>
            <h3>Archive workflow</h3>
            <p>Archive this workflow if it is no longer active. You can restore it later if needed.</p>
          </div>
          <button type="button"><Trash2 size={15} /> Archive workflow</button>
        </section>
      </div>
    </section>
  )
}

export function WorkflowJobDetailPageClient({ workflowId, jobId }: { workflowId: string; jobId: string }) {
  const [projects] = useState<ProjectRecord[]>(loadWorkflowProjects)
  const [tasks, setTasks] = useState<AssignedTask[]>(loadWorkflowTasks)
  const project = projects.find(item => String(item.id) === workflowId)
  const task = tasks.find(item => String(item.projectId) === workflowId && String(item.id) === jobId)
  const stages = getWorkflowStages(project)
  const stage = task ? taskStage(task, stages) : undefined
  const assignees = task ? Array.from(new Set([task.assignee, ...(task.assignees || [])].filter(Boolean))) as string[] : []
  const progress = task ? progressForTask(task, stage) : 0
  const priority = task ? priorityMeta(task) : { label: '-', className: 'medium', icon: <span /> }

  if (!project || !task) {
    return (
      <main className="wf-page">
        <style>{workflowCss}</style>
        <section className="wf-empty-state">
          <div className="wf-empty-art"><FileText size={54} /></div>
          <h2>Job not found</h2>
          <p>This job may have been removed or is not available in this workflow.</p>
          <Link className="wf-primary" href={`/workflows/${workflowId}`}>Back to workflow</Link>
        </section>
      </main>
    )
  }

  const code = `${initials(project.name)}-${String(task.id).padStart(4, '0')}`
  const owner = task.assignee || assignees[0] || project.reviewers?.[0] || 'Team member'
  const created = formatDateTime(task.createdAt || task.dueDate)
  const updateJobStatus = (status: TaskStatus) => {
    const nextTasks = tasks.map(item => String(item.id) === String(task.id) ? { ...item, status, draft: false, updatedAt: new Date().toISOString() } : item)
    setTasks(nextTasks)
    saveWorkflowTasks(nextTasks)
    addWorkflowNotification('Workflow job updated', `${task.title} moved to ${status}.`, `/workflows/${workflowId}/jobs/${jobId}`)
  }

  return (
    <main className="wf-page wf-job-detail-page">
      <style>{workflowCss}</style>
      <section className="wf-job-detail-hero">
        <div className="wf-job-detail-title">
          <Link href={`/workflows/${project.id}`}><ChevronLeft size={18} /></Link>
          <div>
            <div className="wf-breadcrumb">Dashboard / Workflows / {project.name} / <strong>Job Details</strong></div>
            <h1>{task.title}</h1>
            <p>Job ID: {code}</p>
            <p>Created by {owner} on {created}</p>
          </div>
        </div>
        <div className="wf-job-detail-actions">
          <button type="button" onClick={() => updateJobStatus('In Progress')}><PlayCircle size={15} /> Run job</button>
          <button type="button" onClick={() => updateJobStatus('Completed')}><CheckCircle2 size={15} /> Complete</button>
          <button type="button" onClick={() => updateJobStatus('Open')}><Pencil size={15} /> Reopen</button>
          <button type="button"><MoreVertical size={16} /></button>
        </div>
      </section>

      <section className="wf-job-summary-strip">
        <div><strong>Workflow</strong><span>{project.name}</span></div>
        <div><strong>Stage</strong><span className="stage"><i style={{ background: stage?.color || colorFor(stage?.name || project.name) }} /> {stage?.name || 'Open'}</span></div>
        <div><strong>Priority</strong><span className={`priority ${priority.className}`}>{priority.icon}{priority.label}</span></div>
        <div><strong>Due date</strong><span><Calendar size={15} /> {task.dueDate ? formatDue(task.dueDate) : '-'}</span></div>
        <div><strong>Assigned to</strong><span className="assignees">{(assignees.length ? assignees : [owner]).slice(0, 2).map(name => <b key={name}>{initials(name)}</b>)} {assignees.length || 1} member{(assignees.length || 1) === 1 ? '' : 's'}</span></div>
      </section>

      <nav className="wf-job-detail-tabs">
        {['Overview', 'Tasks', 'Files', 'Comments', 'Activity'].map((item, index) => (
          <button className={index === 0 ? 'active' : ''} type="button" key={item}>{item}{index > 0 && <span>{index}</span>}</button>
        ))}
      </nav>

      <section className="wf-job-detail-grid">
        <div className="wf-job-detail-main">
          <section className="wf-job-panel">
            <header><h2>Description</h2><button type="button">Edit</button></header>
            <p>{task.description || 'No description added yet.'}</p>
          </section>

          <section className="wf-job-panel">
            <header><h2>Custom fields</h2><button type="button">Edit</button></header>
            <dl>
              <div><dt>Client</dt><dd>{project.client || '-'}</dd></div>
              <div><dt>Project</dt><dd>{project.name}</dd></div>
              <div><dt>Workflow</dt><dd>{project.name}</dd></div>
              <div><dt>Reference link</dt><dd><a href={`/workflows/${project.id}`}>Open workflow <ExternalLink size={13} /></a></dd></div>
            </dl>
          </section>

          <section className="wf-job-panel">
            <header><h2>To-do list</h2><button type="button">View all</button></header>
            <ul className="wf-job-todos">
              <li><CheckCircle2 size={18} /> Review job requirements <span>{task.dueDate ? formatDue(task.dueDate) : '-'}</span></li>
              <li><CheckCircle2 size={18} /> Confirm assigned members <span>{created}</span></li>
              <li><span className="empty-check" /> Finalize job output <span>{task.dueDate ? formatDue(task.dueDate) : '-'}</span></li>
            </ul>
          </section>

          <section className="wf-job-panel">
            <header><h2>Comments</h2><button type="button"><MoreVertical size={16} /></button></header>
            <div className="wf-job-comment"><b>{initials(owner)}</b><div><strong>{owner}</strong><small>{created}</small><p>{task.description ? 'Initial details are ready for review.' : 'No comments yet.'}</p></div></div>
            <div className="wf-job-comment-input"><b>JP</b><input placeholder="Write a comment..." /><Paperclip size={16} /></div>
          </section>
        </div>

        <aside className="wf-job-detail-side">
          <section className="wf-side-panel">
            <h3>Job progress</h3>
            <div className="wf-side-progress"><i><b style={{ width: `${progress}%` }} /></i><span>{progress}%</span></div>
            <small>Stage progress</small>
            <ol>
              {stages.slice(0, 5).map((item, index) => {
                const current = item.id === stage?.id
                const doneStage = stage && (item.order || 0) < (stage.order || 0)
                return <li className={current ? 'current' : doneStage ? 'done' : ''} key={item.id}><b>{doneStage ? <Check size={13} /> : index + 1}</b><span>{item.name}<small>{current ? 'In progress' : doneStage ? `Completed on ${created}` : 'Pending'}</small></span></li>
              })}
            </ol>
          </section>

          <section className="wf-side-panel">
            <h3>Time tracking</h3>
            <div className="wf-time-grid"><span><small>Total time logged</small><strong>{Math.max(1, Math.round(progress / 10))}h 00m</strong></span><span><small>Estimated time</small><strong>20h 00m</strong></span></div>
            <button type="button"><Clock size={15} /> Log time</button>
          </section>

          <section className="wf-side-panel">
            <h3>Attachments</h3>
            <p><FileText size={18} /> {task.title}.docx <small>DOCX · Workflow document</small></p>
            <p><FileText size={18} /> {code}.pdf <small>PDF · Job summary</small></p>
            <Link href={`/workflows/${project.id}`}>View all files</Link>
          </section>

          <section className="wf-side-panel">
            <h3>Followers</h3>
            <div className="wf-follower-row">{(assignees.length ? assignees : [owner]).slice(0, 4).map(name => <b key={name}>{initials(name)}</b>)}<button type="button">Manage</button></div>
          </section>
        </aside>
      </section>
    </main>
  )
}

export function WorkflowDetailPageClient({ workflowId }: { workflowId: string }) {
  const [projects, setProjects] = useState<ProjectRecord[]>(loadWorkflowProjects)
  const [tasks, setTasks] = useState<AssignedTask[]>(loadWorkflowTasks)
  const [activeView, setActiveView] = useState('Board')
  const project = projects.find(item => String(item.id) === workflowId)
  const workflowTasks = tasks.filter(task => String(task.projectId) === workflowId && !task.draft)
  const stages = getWorkflowStages(project)
  const hasCustomStages = Boolean(project?.stages?.some(stage => stage.type === 'normal' && !stage.id.startsWith('wf-')))
  const boardStages = hasCustomStages ? stages : stages.filter(stage => stage.type !== 'normal')
  const members = project ? fullProjectMembers(project, workflowTasks) : []
  const done = workflowTasks.filter(task => task.status === 'Completed').length
  const overdue = workflowTasks.filter(isOverdue).length
  const completion = workflowTasks.length ? Math.round((done / workflowTasks.length) * 100) : 0
  const color = project?.workflowColor || colorFor(project?.name || 'Workflow')

  function saveProjectStages(nextStages: WorkflowStage[]) {
    const nextProjects = projects.map(item => String(item.id) === workflowId ? { ...item, stages: nextStages } : item)
    setProjects(nextProjects)
    window.localStorage.setItem(projectsStorageKey, JSON.stringify(nextProjects.filter(item => typeof item.id === 'number')))
    window.dispatchEvent(new Event(workflowDataChangedEvent))
    window.dispatchEvent(new Event('storage'))
  }

  function runWorkflow() {
    const firstRunnableStage = getWorkflowStages(project).find(stage => stage.type === 'normal')
    const nextTasks = tasks.map(task => String(task.projectId) === workflowId && !task.draft && task.status === 'Open'
      ? { ...task, status: 'In Progress' as TaskStatus, stageId: task.stageId || firstRunnableStage?.id, updatedAt: new Date().toISOString() }
      : task)
    setTasks(nextTasks)
    saveWorkflowTasks(nextTasks)
    addWorkflowNotification('Workflow run started', `${project?.name || 'Workflow'} jobs moved into progress.`, `/workflows/${workflowId}`)
  }

  function addStage(name?: string) {
    if (!project) return
    const cleanName = (name || window.prompt('Stage name') || '').trim()
    if (!cleanName) return
    const currentStages = project.stages?.length ? project.stages : []
    const normalStages = currentStages.filter(stage => stage.type === 'normal')
    const existingNames = new Set(currentStages.map(stage => stage.name.trim().toLowerCase()))
    if (existingNames.has(cleanName.toLowerCase())) return
    const nextStage: WorkflowStage = {
      id: `stage-${new Date().getTime()}-${groupKey(cleanName)}`,
      name: cleanName,
      type: 'normal',
      color: colorFor(cleanName),
      order: (normalStages.at(-1)?.order || normalStages.length * 10) + 10,
    }
    saveProjectStages([...currentStages, nextStage])
    setActiveView('Board')
  }

  function createTemplateStages() {
    if (!project) return
    const templateNames = ['Open', 'Review', 'Approval']
    const currentStages = project.stages?.length ? project.stages : []
    const existingNames = new Set(currentStages.map(stage => stage.name.trim().toLowerCase()))
    const now = new Date().getTime()
    const templateStages = templateNames
      .filter(name => !existingNames.has(name.toLowerCase()))
      .map((name, index) => ({
        id: `stage-${now}-${groupKey(name)}`,
        name,
        type: 'normal' as const,
        color: colorFor(name),
        order: (index + 1) * 10,
      }))
    if (!templateStages.length) return
    saveProjectStages([...currentStages, ...templateStages])
    setActiveView('Board')
  }

  if (!project) {
    return (
      <main className="wf-page">
        <style>{workflowCss}</style>
        <section className="wf-empty-state">
          <div className="wf-empty-art"><Workflow size={54} /></div>
          <h2>Workflow not found</h2>
          <p>This workflow may have been deleted or is not available in this workspace.</p>
          <Link className="wf-primary" href="/workflows/my-workflows">Back to workflows</Link>
        </section>
      </main>
    )
  }

  return (
    <main className="wf-page wf-detail-page">
      <style>{workflowCss}</style>
      <section className="wf-detail-hero">
        <div className="wf-detail-title">
          <div className="wf-detail-icon" style={{ '--wf-card-color': color } as React.CSSProperties}>{initials(project.name)}</div>
          <div>
            <div className="wf-breadcrumb">Workflows / {groupLabel(project.department)}</div>
            <h1>{project.name}</h1>
          </div>
          <button type="button" aria-label="Workflow information"><HelpCircle size={17} /></button>
          <button type="button" aria-label="Favorite workflow"><Star size={17} /></button>
        </div>
        <div className="wf-detail-actions">
          <label className="wf-detail-search"><input placeholder="Search jobs" /><Search size={16} /></label>
          <button type="button" className="wf-filter"><SlidersHorizontal size={15} /> Filter <ChevronDown size={14} /></button>
          <button type="button" className="wf-filter" onClick={runWorkflow}><PlayCircle size={15} /> Run</button>
          <Link href={`/workflows/${project.id}/add-job`} className="wf-primary"><Plus size={16} /> Create job <ChevronDown size={14} /></Link>
          <button type="button" aria-label="More workflow actions"><MoreHorizontal size={17} /></button>
        </div>
      </section>

      <nav className="wf-detail-tabs">
        {[
          { label: 'Board', icon: Layers, view: 'Board' },
          { label: 'List', icon: FileText, view: 'List' },
          { label: 'Table', icon: LayoutDashboard, view: 'Table' },
          { label: 'Report', icon: BarChart3, view: 'Activity' },
          { label: 'Stages', icon: Pencil, view: 'Board' },
          { label: 'Settings', icon: Settings, view: 'Settings' },
        ].map(item => {
          const Icon = item.icon
          return (
            <button className={activeView === item.view ? 'active' : ''} type="button" key={item.label} onClick={() => setActiveView(item.view)}>
              <Icon size={14} />
              {item.label}
            </button>
          )
        })}
        <button type="button">More <ChevronDown size={14} /></button>
      </nav>

      {activeView === 'Settings' ? (
        <WorkflowSettingsView project={project} tasks={workflowTasks} />
      ) : activeView === 'Activity' ? (
        <WorkflowActivityView project={project} tasks={workflowTasks} stages={stages} />
      ) : activeView === 'Files' ? (
        <WorkflowFilesView project={project} tasks={workflowTasks} stages={stages} />
      ) : activeView === 'Calendar' ? (
        <WorkflowJobCalendar project={project} tasks={workflowTasks} stages={stages} />
      ) : activeView === 'List' || activeView === 'Table' ? (
        <WorkflowJobList project={project} tasks={workflowTasks} stages={stages} mode={activeView === 'Table' ? 'table' : 'list'} />
      ) : (
        <>
          <section className="wf-board-toolbar">
            <div>
              <button type="button"><SlidersHorizontal size={14} /> Filter</button>
              <button type="button"><Menu size={14} /> Manage view</button>
            </div>
            <div>
              <span>{workflowTasks.length} jobs</span>
              <span>{overdue} late</span>
              <span>{completion}% complete</span>
            </div>
          </section>

          <section className="wf-kanban">
            {!hasCustomStages && <StageTemplatePanel onAddStage={addStage} onCreateTemplate={createTemplateStages} />}
            {boardStages.map(stage => {
              const stageTasks = workflowTasks.filter(task => taskStage(task, stages)?.id === stage.id)
              const lateCount = stageTasks.filter(isOverdue).length
              const dotColor = stage.color || (stage.type === 'done' ? '#0f9f5f' : stage.type === 'failed' ? '#ef4444' : colorFor(stage.name))
              return (
                <div
                  className={`wf-kanban-column ${stage.type === 'done' ? 'is-done' : stage.type === 'failed' ? 'is-failed' : ''}`}
                  key={stage.id}
                  style={{ '--wf-stage-color': dotColor } as React.CSSProperties}
                >
                  <header>
                    <div>
                      <strong>{stage.name}</strong>
                      <span className="wf-member-row">
                        {(members.length ? members : ['James Pandian']).slice(0, 2).map(name => <i key={name}>{initials(name)}</i>)}
                      </span>
                      <button type="button" aria-label={`${stage.name} actions`}><ChevronDown size={16} /></button>
                    </div>
                    <span className="wf-stage-progress" />
                    <small>
                      {stageTasks.length} Job{stageTasks.length === 1 ? '' : 's'} · {lateCount} Late
                      {stageTasks.length > 0 && <em> · {Math.max(24, stageTasks.length * 24).toFixed(2)}h · {stageTasks.length} to-dos</em>}
                    </small>
                  </header>
                  <div className="wf-kanban-list">
                    {stageTasks.map(task => <JobCard key={task.id} task={task} projectId={project.id} />)}
                  </div>
                  <Link href={`/workflows/${project.id}/add-job?stage=${encodeURIComponent(stage.id)}`} className="wf-add-job">+ Add job</Link>
                </div>
              )
            })}
            <div className="wf-add-stage">
              <button type="button" onClick={() => addStage()}>+</button>
              <span>Add Stage</span>
            </div>
          </section>
        </>
      )}
    </main>
  )
}

export function AddWorkflowJobPageClient({ workflowId }: { workflowId: string }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [projects] = useState<ProjectRecord[]>(loadWorkflowProjects)
  const [tasks, setTasks] = useState<AssignedTask[]>(loadWorkflowTasks)
  const [account] = useState(() => loadStored<AccountRecord>(accountStorageKey, {}))
  const project = projects.find(item => String(item.id) === workflowId)
  const stages = getWorkflowStages(project)
  const firstStage = stages.find(stage => stage.type === 'normal') || stages[0]
  const initialStage = searchParams.get('stage') || firstStage?.id || ''
  const projectTasks = tasks.filter(task => String(task.projectId) === workflowId)
  const members = project ? fullProjectMembers(project, projectTasks) : []
  const defaultAssignee = account.fullName || account.name || members[0] || 'James Pandian'
  const [title, setTitle] = useState('')
  const [stageId, setStageId] = useState(initialStage)
  const [priority, setPriority] = useState<AssignedTask['priority']>('Normal')
  const [dueDate, setDueDate] = useState('')
  const [assignee, setAssignee] = useState(defaultAssignee)
  const [description, setDescription] = useState('')
  const selectedStage = stages.find(stage => stage.id === stageId)
  const currentMembers = members.length ? members : [defaultAssignee]

  const createJob = (draft = false) => {
    const cleanTitle = title.trim()
    if (!project || (!draft && (!cleanTitle || !stageId))) return

    const nextTask: AssignedTask = {
      id: nextNumericId(tasks),
      projectId: project.id,
      title: cleanTitle || 'Untitled draft job',
      description: description.trim(),
      status: draft ? 'Open' : statusForStage(selectedStage),
      priority,
      assignee,
      assignees: assignee ? [assignee] : [],
      stageId,
      dueDate,
      draft,
      source: 'Manual',
      createdAt: new Date().toISOString(),
    }
    const nextTasks = [...tasks, nextTask]
    setTasks(nextTasks)
    saveWorkflowTasks(nextTasks)
    addWorkflowNotification(draft ? 'Draft job saved' : 'Workflow job created', `${nextTask.title} was ${draft ? 'saved as a draft' : 'created'}.`, draft ? '/workflows/draft-jobs' : `/workflows/${project.id}/jobs/${nextTask.id}`)
    router.push(draft ? '/workflows/draft-jobs' : `/workflows/${project.id}`)
  }

  if (!project) {
    return (
      <main className="wf-page">
        <style>{workflowCss}</style>
        <section className="wf-empty-state">
          <div className="wf-empty-art"><FileText size={54} /></div>
          <h2>Workflow not found</h2>
          <p>Select an available workflow before adding a job.</p>
          <Link className="wf-primary" href="/workflows/my-workflows">Back to workflows</Link>
        </section>
      </main>
    )
  }

  return (
    <main className="wf-page wf-job-create-page">
      <style>{workflowCss}</style>
      <section className="wf-job-create-header">
        <div>
          <div className="wf-breadcrumb">
            <Link href={`/workflows/${project.id}`}><ChevronLeft size={16} /> Back</Link>
            <span>Dashboard</span>
            <span>/</span>
            <span>Workflows</span>
            <span>/</span>
            <span>{project.name}</span>
            <span>/</span>
            <strong>Add job</strong>
          </div>
          <h1>Add job</h1>
          <p>Create a new job and assign it to a workflow stage.</p>
        </div>
        <div className="wf-job-create-actions">
          <Link href={`/workflows/${project.id}`}>Cancel</Link>
          <button type="button" onClick={() => createJob(true)}>Save draft</button>
          <button type="button" onClick={() => createJob(false)} disabled={!title.trim() || !stageId}>Create job</button>
        </div>
      </section>

      <section className="wf-job-create-grid">
        <form className="wf-job-form" onSubmit={event => { event.preventDefault(); createJob(false) }}>
          <label className="full">
            <span>Job title <b>*</b></span>
            <div className="wf-counted-input">
              <input value={title} onChange={event => setTitle(event.target.value.slice(0, 150))} placeholder="Enter job title" />
              <small>{title.length}/150</small>
            </div>
          </label>

          <label>
            <span>Workflow <b>*</b></span>
            <select value={project.id} disabled>
              <option value={project.id}>{project.name}</option>
            </select>
          </label>
          <label>
            <span>Stage <b>*</b></span>
            <select value={stageId} onChange={event => setStageId(event.target.value)}>
              <option value="">Select stage</option>
              {stages.map(stage => <option value={stage.id} key={stage.id}>{stage.name}</option>)}
            </select>
          </label>

          <label>
            <span>Priority</span>
            <div className="wf-select-icon"><Flag size={16} /><select value={priority} onChange={event => setPriority(event.target.value as AssignedTask['priority'])}>
              <option>Normal</option>
              <option>Low</option>
              <option>High</option>
              <option>Urgent</option>
            </select></div>
          </label>
          <label>
            <span>Due date</span>
            <div className="wf-select-icon"><Calendar size={16} /><input type="date" value={dueDate} onChange={event => setDueDate(event.target.value)} /></div>
          </label>

          <label className="full">
            <span>Assigned to</span>
            <select value={assignee} onChange={event => setAssignee(event.target.value)}>
              {currentMembers.map(name => <option value={name} key={name}>{name}</option>)}
            </select>
          </label>

          <label className="full">
            <span>Description</span>
            <div className="wf-counted-input textarea">
              <textarea value={description} onChange={event => setDescription(event.target.value.slice(0, 1000))} placeholder="Add a description for this job..." />
              <small>{description.length}/1000</small>
            </div>
          </label>

          <div className="wf-attachment-drop">
            <Paperclip size={18} />
            <strong>Drag and drop files here or click to browse</strong>
            <span>Supports: PDF, DOC, DOCX, XLS, XLSX, PNG, JPG (Max 20MB)</span>
          </div>

          <footer className="wf-job-form-footer">
            <Link href={`/workflows/${project.id}`}>Cancel</Link>
            <button type="button" onClick={() => createJob(true)}>Save draft</button>
            <button type="submit" disabled={!title.trim() || !stageId}>Create job</button>
          </footer>
        </form>

        <aside className="wf-job-summary">
          <section>
            <h2><FileText size={19} /> Job details</h2>
            <small>Job summary</small>
            <dl>
              <div><dt>Workflow</dt><dd>{project.name}</dd></div>
              <div><dt>Stage</dt><dd>{selectedStage?.name || '-'}</dd></div>
              <div><dt>Priority</dt><dd>{priority || '-'}</dd></div>
              <div><dt>Due date</dt><dd>{dueDate ? formatDue(dueDate) : '-'}</dd></div>
              <div><dt>Assigned to</dt><dd>{assignee || '-'}</dd></div>
            </dl>
          </section>
          <section>
            <small>What&apos;s next?</small>
            {['Add tasks and checklists', 'Attach files and references', 'Add comments and collaborators', 'Track progress and updates'].map(item => (
              <p key={item}><CheckCircle2 size={16} /> {item}</p>
            ))}
          </section>
        </aside>
      </section>
    </main>
  )
}

const workflowCss = `
.wf-page {
  min-height: calc(100vh - 66px);
  background: #fbfbfc;
  color: #111827;
  font-family: var(--font-body);
}
.wf-page * { box-sizing: border-box; }
.wf-search {
  height: 42px;
  display: flex;
  align-items: center;
  gap: 10px;
  border: 1px solid #e2e6ec;
  background: #fff;
  border-radius: 6px;
  padding: 0 13px;
  color: #8a95a3;
}
.wf-search input {
  width: 100%;
  border: 0;
  outline: 0;
  background: transparent;
  color: #111827;
  font: inherit;
  font-size: 13px;
}
.wf-page-header {
  min-height: 96px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
  padding: 24px 28px;
  border-bottom: 1px solid #e7e9ee;
  background: #fff;
}
.wf-page-header h1 {
  margin: 0;
  color: #111827;
  font-size: 28px;
  line-height: 1.1;
  letter-spacing: 0;
}
.wf-page-header p {
  margin: 8px 0 0;
  color: #6b7280;
  font-size: 14px;
}
.wf-header-actions {
  margin-left: auto;
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  gap: 10px;
}
.wf-search { width: min(280px, 28vw); }
.wf-filter,
.wf-primary,
.wf-group-header a,
.wf-create-footer button,
.wf-create-footer a {
  min-height: 42px;
  border: 1px solid #e2e6ec;
  border-radius: 6px;
  background: #fff;
  color: #111827;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 0 16px;
  font-size: 13px;
  font-weight: 800;
  text-decoration: none;
  cursor: pointer;
}
.wf-primary,
.wf-create-footer button {
  background: #0f9f5f;
  color: #fff;
  border-color: #0f9f5f;
  box-shadow: 0 8px 18px rgba(15,159,95,.16);
}
.wf-empty-state {
  min-height: calc(100vh - 182px);
  display: grid;
  place-items: center;
  align-content: center;
  gap: 14px;
  text-align: center;
  padding: 60px 20px;
}
.wf-empty-art {
  width: 132px;
  height: 112px;
  border-radius: 24px;
  background: linear-gradient(180deg, #e7f8ef, #d7f3e5);
  color: #95d8b7;
  display: grid;
  place-items: center;
  box-shadow: 0 18px 30px rgba(15,159,95,.12);
}
.wf-empty-state h2 { margin: 10px 0 0; font-size: 20px; color: #111827; }
.wf-empty-state p { margin: 0; color: #5b6472; line-height: 1.55; font-size: 14px; }
.wf-learn {
  color: #0f9f5f;
  font-size: 13px;
  font-weight: 750;
  text-decoration: none;
  display: inline-flex;
  align-items: center;
  gap: 7px;
}
.wf-groups { padding: 0 28px 40px; background: #fbfbfc; width: 100%; }
.wf-group { border-bottom: 1px solid #e7e9ee; padding: 18px 0 16px; }
.wf-group-header {
  min-height: 38px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.wf-group-header button {
  border: 0;
  background: transparent;
  color: #111827;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 900;
  cursor: pointer;
}
.wf-group-header button svg {
  transition: transform 140ms ease;
}
.wf-group.is-collapsed .wf-group-header button svg {
  transform: rotate(-90deg);
}
.wf-group-header a {
  min-height: 34px;
  padding: 0 14px;
  color: #4b5563;
  font-weight: 750;
}
.wf-card-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(260px, 420px));
  gap: 22px;
  margin-top: 12px;
}
.wf-card,
.wf-preview-card {
  min-height: 156px;
  border: 1px solid #e4e7ec;
  border-radius: 4px;
  background: #fff;
  color: #111827;
  text-decoration: none;
  padding: 18px;
  display: grid;
  gap: 14px;
  box-shadow: 0 1px 2px rgba(16,24,40,.03);
}
.wf-card:hover { border-color: #cfd5de; box-shadow: 0 10px 28px rgba(16,24,40,.08); }
.wf-card-main {
  display: grid;
  grid-template-columns: 44px minmax(0, 1fr);
  gap: 14px;
  align-items: start;
}
.wf-card-icon {
  width: 38px;
  height: 38px;
  border-radius: 5px;
  background: var(--wf-card-color, #0f9f5f);
  color: #fff;
  display: grid;
  place-items: center;
  font-weight: 900;
  font-size: 13px;
}
.wf-card h3,
.wf-preview-card h3 {
  margin: 0 0 5px;
  font-size: 14px;
  line-height: 1.25;
  color: #111827;
  font-weight: 900;
  letter-spacing: 0;
}
.wf-card p,
.wf-preview-card p {
  margin: 0;
  color: #5b6472;
  font-size: 13px;
  line-height: 1.4;
}
.wf-members {
  display: flex;
  align-items: center;
  min-height: 24px;
}
.wf-members span,
.wf-members em {
  width: 22px;
  height: 22px;
  border-radius: 999px;
  display: grid;
  place-items: center;
  border: 2px solid #fff;
  margin-left: -5px;
  background: #172033;
  color: #fff;
  font-size: 10px;
  font-style: normal;
  font-weight: 850;
}
.wf-members span:first-child { margin-left: 0; }
.wf-members span:nth-child(2) { background: #375a7f; }
.wf-members span:nth-child(3) { background: #8b9ac5; }
.wf-members em { background: #e5e7eb; color: #475569; }
.wf-progress {
  height: 4px;
  border-radius: 999px;
  background: #e5e7eb;
  overflow: hidden;
}
.wf-progress span {
  display: block;
  height: 100%;
  background: #0f9f5f;
}
.wf-card-stats {
  display: flex;
  align-items: center;
  justify-content: space-between;
  color: #4b5563;
  font-size: 13px;
  font-weight: 750;
}
.wf-card-stats strong { color: #0f9f5f; }
.wf-card-stats b { color: #e11d48; }
.wf-create-page { background: #fff; }
.wf-create-shell {
  padding: 20px 30px 30px;
  min-height: calc(100vh - 66px);
}
.wf-back {
  color: #0f9f5f;
  text-decoration: none;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 800;
  margin-bottom: 18px;
}
.wf-create-heading h1 {
  margin: 0;
  color: #111827;
  font-size: 30px;
  letter-spacing: 0;
}
.wf-create-heading p { margin: 8px 0 0; color: #6b7280; font-size: 14px; }
.wf-steps {
  margin: 34px 0 32px;
  padding: 0 10px;
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 26px;
  position: relative;
}
.wf-steps::before {
  content: "";
  position: absolute;
  left: 58px;
  right: 58px;
  top: 20px;
  height: 1px;
  background: #e5e7eb;
}
.wf-steps div {
  position: relative;
  z-index: 1;
  display: grid;
  grid-template-columns: 46px minmax(0, 1fr);
  column-gap: 14px;
  row-gap: 4px;
  align-items: center;
  background: #fff;
}
.wf-steps span {
  grid-row: span 2;
  width: 40px;
  height: 40px;
  border-radius: 999px;
  border: 2px solid #d6dbe3;
  background: #fff;
  color: #6b7280;
  display: grid;
  place-items: center;
  font-size: 14px;
  font-weight: 900;
}
.wf-steps strong { color: #111827; font-size: 14px; }
.wf-steps small { color: #6b7280; font-size: 13px; }
.wf-steps .active span { background: #0f9f5f; color: #fff; border-color: #0f9f5f; }
.wf-steps .active strong { color: #0f9f5f; }
.wf-create-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 430px;
  gap: 18px;
}
.wf-form-panel,
.wf-preview-panel,
.wf-tips {
  border: 1px solid #e4e7ec;
  border-radius: 5px;
  background: #fff;
  padding: 28px;
}
.wf-form-panel h2,
.wf-preview-panel h2,
.wf-tips h2 {
  margin: 0;
  color: #111827;
  font-size: 20px;
  letter-spacing: 0;
}
.wf-form-panel > p,
.wf-preview-panel > p {
  margin: 7px 0 28px;
  color: #6b7280;
  font-size: 14px;
}
.wf-form-row {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 20px;
}
.wf-field {
  display: grid;
  gap: 8px;
  margin-bottom: 24px;
}
.wf-field span,
.wf-picker > span {
  color: #111827;
  font-size: 13px;
  font-weight: 850;
}
.wf-field b { color: #e11d48; }
.wf-field em {
  color: #6b7280;
  font-style: normal;
  font-weight: 650;
}
.wf-field input,
.wf-field select,
.wf-field textarea {
  width: 100%;
  min-height: 44px;
  border: 1px solid #dfe3ea;
  border-radius: 5px;
  background: #fff;
  color: #111827;
  font: inherit;
  font-size: 14px;
  padding: 0 13px;
  outline: 0;
}
.wf-field textarea {
  min-height: 92px;
  padding: 13px;
  resize: vertical;
}
.wf-field small,
.wf-picker small {
  color: #6b7280;
  font-size: 12px;
}
.wf-picker { display: grid; gap: 10px; }
.wf-icon-grid {
  display: grid;
  grid-template-columns: repeat(9, 56px);
  gap: 14px;
  margin-top: 8px;
}
.wf-icon-grid button {
  width: 56px;
  height: 56px;
  border: 1px solid #e1e5ec;
  border-radius: 7px;
  background: #fff;
  color: #40615b;
  display: grid;
  place-items: center;
  cursor: pointer;
}
.wf-icon-grid button.active {
  border-color: #0f9f5f;
  box-shadow: 0 0 0 2px rgba(15,159,95,.14);
  color: #0f9f5f;
}
.wf-color-row {
  display: flex;
  gap: 24px;
  margin-top: 10px;
}
.wf-color-row button {
  width: 26px;
  height: 26px;
  border-radius: 999px;
  border: 0;
  background: var(--wf-color);
  color: #fff;
  display: grid;
  place-items: center;
  cursor: pointer;
}
.wf-color-row button.active { box-shadow: 0 0 0 4px rgba(15,159,95,.13); }
.wf-preview-column { display: grid; align-content: start; gap: 16px; }
.wf-preview-card { margin-top: 24px; min-height: 198px; }
.wf-preview-card > p { min-height: 42px; }
.wf-tips { display: grid; gap: 14px; }
.wf-tips p {
  margin: 0;
  color: #3f4b5f;
  font-size: 14px;
  display: flex;
  gap: 10px;
  align-items: center;
}
.wf-tips svg { color: #0f9f5f; }
.wf-create-footer {
  position: static;
  margin-top: 22px;
  height: 64px;
  border-top: 1px solid #e7e9ee;
  background: #fff;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 14px;
  padding: 0;
}
.wf-create-footer a { min-width: 100px; }
.wf-create-footer button { min-width: 210px; }
.wf-create-footer button:disabled {
  background: #d1d5db;
  border-color: #d1d5db;
  box-shadow: none;
  cursor: not-allowed;
}
.wf-detail-page {
  background: #fff;
  min-height: calc(100vh - 66px);
  overflow-x: auto;
}
.wf-detail-hero {
  min-width: 1180px;
  padding: 22px 28px 18px;
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 18px 28px;
  border-bottom: 1px solid #e7e9ee;
  background: #fff;
}
.wf-detail-title {
  display: grid;
  grid-template-columns: 58px minmax(0, 1fr);
  gap: 16px;
  align-items: start;
}
.wf-detail-icon {
  width: 54px;
  height: 54px;
  border-radius: 7px;
  background: var(--wf-card-color, #0f9f5f);
  color: #fff;
  display: grid;
  place-items: center;
  font-size: 16px;
  font-weight: 950;
}
.wf-breadcrumb {
  margin-bottom: 14px;
  color: #6b7280;
  font-size: 13px;
  font-weight: 650;
}
.wf-breadcrumb strong { color: #111827; }
.wf-detail-title h1 {
  margin: 0;
  color: #111827;
  font-size: 30px;
  line-height: 1.1;
  letter-spacing: 0;
}
.wf-detail-title p {
  margin: 7px 0 0;
  color: #4b5563;
  font-size: 14px;
}
.wf-detail-actions {
  display: flex;
  align-items: flex-start;
  gap: 12px;
}
.wf-detail-metric {
  min-width: 84px;
  border-left: 1px solid #edf0f3;
  padding: 2px 16px;
  display: grid;
  gap: 7px;
  position: relative;
}
.wf-detail-metric strong {
  color: #111827;
  font-size: 20px;
  line-height: 1;
}
.wf-detail-metric strong.danger { color: #e11d48; }
.wf-detail-metric span {
  color: #6b7280;
  font-size: 12px;
  font-weight: 700;
}
.wf-detail-metric:nth-child(3)::after {
  content: "";
  width: 44px;
  height: 3px;
  border-radius: 999px;
  background: #0f9f5f;
}
.wf-member-row {
  grid-column: 1 / -1;
  display: flex;
  align-items: center;
  gap: 8px;
}
.wf-member-row span,
.wf-member-row em,
.wf-mini-avatar {
  width: 26px;
  height: 26px;
  border-radius: 999px;
  background: #172033;
  color: #fff;
  display: grid;
  place-items: center;
  font-size: 10px;
  font-weight: 900;
  font-style: normal;
}
.wf-member-row span:nth-child(2) { background: #d7eadc; color: #234c35; }
.wf-member-row span:nth-child(3) { background: #e1e7e7; color: #36505a; }
.wf-member-row span:nth-child(4) { background: #d5d9e1; color: #2f3b4a; }
.wf-member-row em { background: #e5e7eb; color: #475569; }
.wf-member-row button {
  margin-left: 8px;
  min-height: 34px;
  border: 1px solid #e2e6ec;
  border-radius: 6px;
  background: #fff;
  color: #111827;
  padding: 0 13px;
  font-size: 13px;
  font-weight: 800;
}
.wf-detail-tabs {
  min-width: 1180px;
  height: 58px;
  display: flex;
  align-items: flex-end;
  gap: 26px;
  padding: 0 28px;
  border-bottom: 1px solid #e7e9ee;
  background: #fff;
}
.wf-detail-tabs button {
  height: 44px;
  border: 0;
  border-bottom: 2px solid transparent;
  background: transparent;
  color: #4b5563;
  font-size: 13px;
  font-weight: 800;
  cursor: pointer;
}
.wf-detail-tabs button.active {
  color: #0f9f5f;
  border-bottom-color: #0f9f5f;
}
.wf-board-toolbar {
  min-width: 1180px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  padding: 20px 28px;
  background: #fff;
}
.wf-board-toolbar div {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}
.wf-board-toolbar button {
  min-height: 40px;
  border: 1px solid #e2e6ec;
  border-radius: 6px;
  background: #fff;
  color: #111827;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 0 16px;
  font-size: 13px;
  font-weight: 800;
  cursor: pointer;
}
.wf-kanban {
  min-width: 1180px;
  display: grid;
  grid-auto-flow: column;
  grid-auto-columns: minmax(245px, 1fr);
  gap: 16px;
  align-items: start;
  overflow-x: auto;
  padding: 0 28px 36px;
}
.wf-kanban-column {
  min-height: 560px;
  border: 1px solid #e8ebf0;
  border-radius: 6px;
  background: #fcfcfd;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.wf-kanban-column header {
  min-height: 78px;
  border-bottom: 1px solid #edf0f3;
  padding: 15px 16px 10px;
  display: grid;
  grid-template-columns: 12px minmax(0, 1fr) 20px;
  gap: 8px;
  align-items: center;
}
.wf-kanban-column header > span {
  width: 12px;
  height: 12px;
  border-radius: 999px;
}
.wf-kanban-column header strong {
  color: #111827;
  font-size: 14px;
  line-height: 1.2;
}
.wf-kanban-column header b {
  color: #6b7280;
  line-height: 1;
  text-align: right;
  display: grid;
  place-items: center;
}
.wf-kanban-column header small {
  grid-column: 2 / -1;
  color: #4b5563;
  font-size: 12px;
  font-weight: 700;
}
.wf-kanban-column header em {
  color: #e11d48;
  font-style: normal;
}
.wf-kanban-list {
  flex: 1;
  display: grid;
  align-content: start;
  gap: 0;
  padding: 12px;
}
.wf-job-card {
  min-height: 104px;
  border: 0;
  border-bottom: 1px solid #edf0f3;
  border-radius: 0;
  background: #fff;
  padding: 15px 4px 13px;
  display: grid;
  gap: 8px;
  box-shadow: none;
}
.wf-job-card:first-child { padding-top: 4px; }
.wf-job-card:last-child { border-bottom: 0; }
.wf-job-card h4 {
  margin: 0;
  color: #111827;
  font-size: 13.5px;
  line-height: 1.25;
  font-weight: 900;
}
.wf-job-card p {
  margin: 0;
  color: #4b5563;
  font-size: 12px;
  font-weight: 750;
}
.wf-job-row {
  display: grid;
  grid-template-columns: 24px minmax(0, 1fr) auto;
  gap: 8px;
  align-items: center;
}
.wf-job-row small {
  color: #6b7280;
  font-size: 12px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.wf-job-row em {
  border-radius: 999px;
  padding: 4px 8px;
  font-style: normal;
  font-size: 11px;
  font-weight: 900;
}
.wf-job-row em.medium { background: #fff7e6; color: #b7791f; }
.wf-job-row em.low { background: #e6f6fb; color: #2581a3; }
.wf-job-row em.high { background: #ffe8ef; color: #e11d48; }
.wf-job-row em.done { background: #e3f8ee; color: #0f8a53; }
.wf-job-date {
  color: #4b5563;
  font-size: 12px;
  font-weight: 800;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  justify-self: end;
  margin-top: -29px;
}
.wf-job-date.overdue { color: #e11d48; }
.wf-add-job {
  border: 0;
  border-top: 1px solid #edf0f3;
  background: transparent;
  min-height: 42px;
  color: #4b5563;
  font-size: 13px;
  font-weight: 800;
  cursor: pointer;
  background: #fff;
}
.wf-add-stage {
  min-height: 560px;
  display: grid;
  align-content: center;
  justify-items: center;
  gap: 12px;
  color: #4b5563;
}
.wf-add-stage button {
  width: 62px;
  height: 62px;
  border: 0;
  border-radius: 999px;
  background: #0f9f5f;
  color: #fff;
  font-size: 30px;
  box-shadow: 0 16px 28px rgba(15,159,95,.28);
  cursor: pointer;
}
.wf-add-stage span {
  font-size: 14px;
  font-weight: 750;
}
.wf-stage-template {
  min-height: 560px;
  border: 1px solid #e3e7ed;
  border-radius: 6px;
  background: #fff;
  padding: 42px 22px 24px;
  display: grid;
  align-content: start;
  justify-items: center;
  text-align: center;
  gap: 14px;
}
.wf-template-art {
  width: 78px;
  height: 78px;
  border-radius: 999px;
  border: 1px dashed #cbd5e1;
  color: #111827;
  display: grid;
  place-items: center;
}
.wf-stage-template h3 {
  margin: 12px 0 0;
  color: #111827;
  font-size: 15px;
  letter-spacing: 0;
}
.wf-stage-template p {
  margin: 0;
  max-width: 190px;
  color: #4b5563;
  font-size: 14px;
  line-height: 1.55;
}
.wf-stage-template small {
  margin-top: 28px;
  width: 100%;
  text-align: left;
  color: #4b5563;
  font-size: 11px;
  font-weight: 900;
  letter-spacing: .04em;
  text-transform: uppercase;
}
.wf-template-grid {
  width: 100%;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}
.wf-template-grid button,
.wf-template-primary {
  min-height: 38px;
  border: 1px solid #e3e7ed;
  border-radius: 999px;
  background: #fff;
  color: #111827;
  font: inherit;
  font-size: 13px;
  font-weight: 750;
  cursor: pointer;
}
.wf-template-primary {
  width: 100%;
  margin-top: 12px;
  border-radius: 6px;
  border-color: #0f9f5f;
  color: #0f9f5f;
  font-weight: 900;
}
.wf-add-job {
  display: flex;
  align-items: center;
  justify-content: center;
  text-decoration: none;
}
.wf-job-create-page {
  background: #fff;
  min-height: calc(100vh - 66px);
  padding: 26px 30px 34px;
}
.wf-job-create-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 24px;
  margin-bottom: 34px;
}
.wf-job-create-header .wf-breadcrumb {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
  margin-bottom: 22px;
  color: #6b7280;
  font-size: 13px;
}
.wf-job-create-header .wf-breadcrumb a {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: #111827;
  text-decoration: none;
  font-weight: 800;
}
.wf-job-create-header h1 {
  margin: 0;
  font-size: 28px;
  line-height: 1.1;
  color: #111827;
  letter-spacing: 0;
}
.wf-job-create-header p {
  margin: 10px 0 0;
  color: #4b5563;
  font-size: 14px;
}
.wf-job-create-actions,
.wf-job-form-footer {
  display: flex;
  align-items: center;
  gap: 12px;
}
.wf-job-create-actions a,
.wf-job-form-footer a,
.wf-job-create-actions button,
.wf-job-form-footer button {
  min-height: 42px;
  padding: 0 24px;
  border-radius: 6px;
  border: 1px solid #d9dee7;
  background: #fff;
  color: #111827;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  text-decoration: none;
  font-size: 13px;
  font-weight: 850;
  cursor: pointer;
}
.wf-job-create-actions button,
.wf-job-form-footer button {
  background: #0f9f5f;
  color: #fff;
  border-color: #0f9f5f;
  box-shadow: 0 10px 20px rgba(15,159,95,.14);
}
.wf-job-create-actions button:disabled,
.wf-job-form-footer button:disabled {
  background: #d1d5db;
  border-color: #d1d5db;
  color: #fff;
  box-shadow: none;
  cursor: not-allowed;
}
.wf-job-create-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 430px;
  gap: 28px;
  align-items: start;
}
.wf-job-form,
.wf-job-summary section {
  border: 1px solid #e2e6ec;
  border-radius: 8px;
  background: #fff;
}
.wf-job-form {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 22px 24px;
  padding: 28px;
}
.wf-job-form label {
  min-width: 0;
  display: grid;
  gap: 10px;
}
.wf-job-form label.full,
.wf-attachment-drop,
.wf-job-form-footer {
  grid-column: 1 / -1;
}
.wf-job-form label > span {
  color: #111827;
  font-size: 13px;
  font-weight: 850;
}
.wf-job-form label b {
  color: #e11d48;
}
.wf-job-form input,
.wf-job-form select,
.wf-job-form textarea {
  width: 100%;
  min-width: 0;
  border: 1px solid #d9dee7;
  border-radius: 6px;
  background: #fff;
  color: #111827;
  font: inherit;
  font-size: 14px;
  outline: 0;
}
.wf-job-form input,
.wf-job-form select {
  height: 48px;
  padding: 0 14px;
}
.wf-job-form textarea {
  min-height: 108px;
  resize: vertical;
  padding: 14px;
}
.wf-job-form input:focus,
.wf-job-form select:focus,
.wf-job-form textarea:focus {
  border-color: #0f9f5f;
  box-shadow: 0 0 0 3px rgba(15,159,95,.11);
}
.wf-counted-input {
  position: relative;
}
.wf-counted-input input {
  padding-right: 68px;
}
.wf-counted-input small {
  position: absolute;
  right: 13px;
  bottom: 14px;
  color: #4b5563;
  font-size: 12px;
  font-weight: 700;
}
.wf-counted-input.textarea small {
  bottom: 12px;
}
.wf-select-icon {
  position: relative;
}
.wf-select-icon svg {
  position: absolute;
  left: 14px;
  top: 50%;
  transform: translateY(-50%);
  color: #6b7280;
  pointer-events: none;
}
.wf-select-icon input,
.wf-select-icon select {
  padding-left: 42px;
}
.wf-attachment-drop {
  min-height: 94px;
  border: 1px solid #e2e6ec;
  border-radius: 7px;
  display: grid;
  place-items: center;
  align-content: center;
  gap: 8px;
  color: #4b5563;
  text-align: center;
}
.wf-attachment-drop strong {
  color: #111827;
  font-size: 13px;
}
.wf-attachment-drop span {
  font-size: 12px;
  color: #6b7280;
}
.wf-job-form-footer {
  justify-content: flex-start;
  padding-top: 8px;
}
.wf-job-summary {
  display: grid;
  gap: 16px;
}
.wf-job-summary section {
  padding: 28px;
}
.wf-job-summary h2 {
  display: flex;
  align-items: center;
  gap: 12px;
  margin: 0 0 28px;
  color: #111827;
  font-size: 20px;
}
.wf-job-summary small {
  display: block;
  margin-bottom: 16px;
  color: #111827;
  font-size: 12px;
  font-weight: 900;
  text-transform: uppercase;
}
.wf-job-summary dl {
  display: grid;
  gap: 18px;
  margin: 0;
  padding-bottom: 26px;
  border-bottom: 1px solid #e7e9ee;
}
.wf-job-summary dl div {
  display: grid;
  grid-template-columns: 120px minmax(0, 1fr);
  gap: 12px;
}
.wf-job-summary dt {
  color: #4b5563;
  font-size: 14px;
}
.wf-job-summary dd {
  margin: 0;
  color: #111827;
  font-size: 14px;
  font-weight: 850;
}
.wf-job-summary p {
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 13px 0 0;
  color: #263548;
  font-size: 14px;
}
.wf-job-summary p svg {
  color: #0f9f5f;
  flex: 0 0 auto;
}
.wf-job-list-view {
  min-width: 1180px;
  padding: 18px 28px 28px;
  background: #fff;
}
.wf-list-toolbar {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 20px;
}
.wf-list-toolbar label {
  width: 260px;
  height: 42px;
  border: 1px solid #e2e6ec;
  border-radius: 6px;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 0 13px;
  color: #8a95a3;
}
.wf-list-toolbar input {
  min-width: 0;
  flex: 1;
  border: 0;
  outline: 0;
  background: transparent;
  color: #111827;
  font: inherit;
  font-size: 13px;
}
.wf-list-toolbar button,
.wf-job-list-footer button {
  min-height: 42px;
  border: 1px solid #e2e6ec;
  border-radius: 6px;
  background: #fff;
  color: #111827;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 0 16px;
  font-size: 13px;
  font-weight: 800;
  cursor: pointer;
}
.wf-list-toolbar .push {
  margin-left: auto;
}
.wf-job-list-view.table-mode .wf-list-toolbar {
  margin-bottom: 22px;
}
.wf-job-list-view.table-mode .wf-list-toolbar button:last-child {
  min-width: 94px;
}
.wf-job-table {
  border: 1px solid #edf0f3;
  border-radius: 7px;
  overflow: hidden;
  background: #fff;
}
.wf-job-table-row {
  min-height: 66px;
  display: grid;
  grid-template-columns: 42px minmax(220px, 1.4fr) minmax(140px, .8fr) minmax(130px, .7fr) minmax(150px, .8fr) minmax(140px, .8fr) minmax(140px, .8fr) minmax(100px, .6fr) 42px;
  gap: 14px;
  align-items: center;
  padding: 0 14px;
  border-bottom: 1px solid #edf0f3;
  color: #111827;
}
.wf-job-table-row:last-child {
  border-bottom: 0;
}
.wf-job-table-row.head {
  min-height: 54px;
  color: #4b5563;
  font-size: 12px;
  font-weight: 800;
  background: #fff;
}
.wf-job-list-view.table-mode .wf-job-table-row.head {
  background: #fcfcfd;
}
.wf-job-list-view.table-mode .wf-job-table-row {
  grid-template-columns: 42px minmax(220px, 1.35fr) minmax(135px, .75fr) minmax(130px, .7fr) minmax(150px, .8fr) minmax(140px, .8fr) minmax(140px, .8fr) minmax(100px, .6fr) 74px;
}
.wf-job-list-view.table-mode .wf-job-table-row > button {
  justify-self: center;
}
.wf-job-table-row:not(.head):hover {
  background: #fbfbfc;
}
.wf-job-table-row .check {
  width: 17px;
  height: 17px;
  border: 1px solid #cfd6df;
  border-radius: 5px;
  display: block;
}
.wf-job-table-row .job {
  display: grid;
  gap: 4px;
}
.wf-job-table-row .job strong {
  color: #111827;
  font-size: 13.5px;
  font-weight: 900;
}
.wf-job-table-row .job small,
.wf-job-table-row .updated {
  color: #4b5563;
  font-size: 12px;
  font-weight: 650;
}
.wf-job-table-row .stage,
.wf-job-table-row .due,
.wf-job-table-row .priority {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: #263548;
  font-size: 13px;
  font-weight: 750;
}
.wf-job-table-row .stage i {
  width: 10px;
  height: 10px;
  border-radius: 999px;
  flex: 0 0 auto;
}
.wf-job-table-row .priority svg {
  flex: 0 0 auto;
}
.wf-job-table-row .priority span {
  width: 13px;
  height: 2px;
  border-radius: 999px;
  background: #f59e0b;
}
.wf-job-table-row .priority.high { color: #ef4444; }
.wf-job-table-row .priority.medium { color: #b7791f; }
.wf-job-table-row .priority.low { color: #0f9f5f; }
.wf-job-table-row .assignees {
  display: flex;
  align-items: center;
}
.wf-job-table-row .assignees b,
.wf-job-table-row .assignees em {
  width: 28px;
  height: 28px;
  margin-left: -5px;
  border: 2px solid #fff;
  border-radius: 999px;
  display: grid;
  place-items: center;
  background: #dff5e9;
  color: #154a32;
  font-size: 10px;
  font-style: normal;
  font-weight: 900;
}
.wf-job-table-row .assignees b:first-child {
  margin-left: 0;
}
.wf-job-table-row .assignees b:nth-child(2) {
  background: #ede7ff;
  color: #5b48a2;
}
.wf-job-table-row .assignees em {
  background: #eef1f5;
  color: #475569;
}
.wf-job-table-row .due.overdue {
  color: #e11d48;
}
.wf-job-table-row .progress {
  display: grid;
  grid-template-columns: minmax(70px, 96px) 40px;
  align-items: center;
  gap: 9px;
  color: #263548;
  font-size: 12px;
  font-weight: 800;
}
.wf-job-table-row .progress i {
  height: 8px;
  border-radius: 999px;
  background: #e5e7eb;
  overflow: hidden;
}
.wf-job-table-row .progress b {
  height: 100%;
  display: block;
  border-radius: inherit;
  background: #10b981;
}
.wf-job-table-row > button {
  width: 32px;
  height: 32px;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: #4b5563;
  display: grid;
  place-items: center;
  cursor: pointer;
}
.wf-job-list-empty {
  min-height: 280px;
  display: grid;
  place-items: center;
  align-content: center;
  gap: 10px;
  color: #64748b;
  text-align: center;
}
.wf-job-list-empty strong {
  color: #111827;
}
.wf-job-list-empty a {
  min-height: 38px;
  padding: 0 14px;
  border-radius: 6px;
  background: #0f9f5f;
  color: #fff;
  display: inline-flex;
  align-items: center;
  text-decoration: none;
  font-size: 13px;
  font-weight: 850;
}
.wf-job-list-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 14px 4px 0;
  color: #4b5563;
  font-size: 13px;
}
.wf-job-list-footer div {
  display: flex;
  align-items: center;
  gap: 10px;
}
.wf-calendar-view {
  min-width: 1180px;
  padding: 18px 28px 28px;
  background: #fff;
}
.wf-calendar-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
  margin-bottom: 14px;
}
.wf-calendar-toolbar > div {
  display: flex;
  align-items: center;
  gap: 10px;
}
.wf-calendar-toolbar button {
  min-height: 40px;
  border: 1px solid #e2e6ec;
  border-radius: 6px;
  background: #fff;
  color: #111827;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 0 15px;
  font-size: 13px;
  font-weight: 800;
  cursor: pointer;
}
.wf-calendar-toolbar button[aria-label] {
  width: 40px;
  padding: 0;
}
.wf-calendar-toolbar .rotate {
  transform: rotate(-90deg);
}
.wf-calendar-toolbar h2 {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  margin: 0 0 0 12px;
  color: #111827;
  font-size: 20px;
  line-height: 1;
}
.wf-calendar-legend {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  flex-wrap: wrap;
  gap: 20px;
  min-height: 36px;
  color: #263548;
  font-size: 12px;
  font-weight: 750;
}
.wf-calendar-legend span {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}
.wf-calendar-legend i {
  width: 10px;
  height: 10px;
  border-radius: 999px;
}
.wf-calendar-legend i.muted {
  background: #d1d5db;
}
.wf-calendar-grid {
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  border: 1px solid #e5e9ef;
  border-radius: 7px;
  overflow: hidden;
  background: #fff;
}
.wf-calendar-head {
  min-height: 38px;
  display: grid;
  place-items: center;
  border-right: 1px solid #e5e9ef;
  border-bottom: 1px solid #e5e9ef;
  color: #263548;
  font-size: 12px;
  font-weight: 850;
}
.wf-calendar-head:nth-child(7) {
  border-right: 0;
}
.wf-calendar-day {
  min-height: 112px;
  border-right: 1px solid #e5e9ef;
  border-bottom: 1px solid #e5e9ef;
  padding: 12px 10px 8px;
  display: grid;
  align-content: start;
  gap: 8px;
}
.wf-calendar-day:nth-child(7n) {
  border-right: 0;
}
.wf-calendar-day:nth-last-child(-n + 7) {
  border-bottom: 0;
}
.wf-calendar-day.muted {
  background: #fcfcfd;
}
.wf-calendar-day > strong {
  width: 24px;
  height: 24px;
  border-radius: 999px;
  color: #263548;
  display: grid;
  place-items: center;
  font-size: 12px;
  font-weight: 850;
}
.wf-calendar-day.muted > strong {
  color: #a0a7b1;
}
.wf-calendar-day > strong.today {
  background: #10b981;
  color: #fff;
}
.wf-calendar-day > div {
  display: grid;
  gap: 6px;
}
.wf-calendar-job {
  min-height: 54px;
  border: 1px solid #eef1f5;
  border-radius: 6px;
  background: #fff;
  box-shadow: 0 2px 8px rgba(16,24,40,.04);
  display: grid;
  grid-template-columns: 10px minmax(0, 1fr) 24px;
  gap: 6px;
  align-items: center;
  padding: 8px;
}
.wf-calendar-job > span {
  width: 10px;
  height: 10px;
  border-radius: 999px;
  align-self: start;
  margin-top: 3px;
}
.wf-calendar-job b {
  color: #111827;
  font-size: 12px;
  line-height: 1.15;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.wf-calendar-job small {
  grid-column: 2;
  color: #4b5563;
  font-size: 11px;
  font-weight: 700;
}
.wf-calendar-job em {
  grid-column: 3;
  grid-row: 1 / span 2;
  width: 22px;
  height: 22px;
  border-radius: 999px;
  background: #172033;
  color: #fff;
  display: grid;
  place-items: center;
  font-size: 9px;
  font-style: normal;
  font-weight: 900;
}
.wf-calendar-day button {
  border: 0;
  background: transparent;
  color: #0f9f5f;
  font-size: 12px;
  font-weight: 850;
  text-align: left;
  cursor: pointer;
}
.wf-files-view {
  min-width: 1180px;
  padding: 22px 28px 28px;
  background: #fff;
}
.wf-files-toolbar {
  display: grid;
  grid-template-columns: 260px 130px 130px 120px minmax(0, 1fr) auto auto;
  gap: 12px;
  align-items: center;
  margin-bottom: 22px;
}
.wf-files-toolbar label {
  height: 42px;
  border: 1px solid #e2e6ec;
  border-radius: 6px;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 0 13px;
  color: #8a95a3;
}
.wf-files-toolbar input {
  min-width: 0;
  flex: 1;
  border: 0;
  outline: 0;
  background: transparent;
  color: #111827;
  font: inherit;
  font-size: 13px;
}
.wf-files-toolbar button {
  min-height: 42px;
  border: 1px solid #e2e6ec;
  border-radius: 6px;
  background: #fff;
  color: #111827;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 0 15px;
  font-size: 13px;
  font-weight: 800;
  cursor: pointer;
}
.wf-files-table {
  border: 1px solid #edf0f3;
  border-radius: 7px;
  overflow: hidden;
  background: #fff;
}
.wf-files-row {
  min-height: 64px;
  display: grid;
  grid-template-columns: 42px minmax(260px, 1.3fr) minmax(90px, .45fr) minmax(150px, .7fr) minmax(180px, .9fr) minmax(90px, .45fr) minmax(190px, .85fr) 74px;
  gap: 14px;
  align-items: center;
  padding: 0 14px;
  border-bottom: 1px solid #edf0f3;
  color: #263548;
  font-size: 13px;
  font-weight: 700;
}
.wf-files-row:last-child {
  border-bottom: 0;
}
.wf-files-row.head {
  min-height: 54px;
  background: #fff;
  color: #4b5563;
  font-size: 12px;
  font-weight: 850;
}
.wf-files-row:not(.head):hover {
  background: #fbfbfc;
}
.wf-files-row .check {
  width: 17px;
  height: 17px;
  border: 1px solid #cfd6df;
  border-radius: 5px;
  display: block;
}
.wf-files-row .file-name {
  display: grid;
  grid-template-columns: 32px minmax(0, 1fr);
  gap: 12px;
  align-items: center;
}
.wf-files-row .file-name > b {
  width: 28px;
  height: 28px;
  border-radius: 6px;
  display: grid;
  place-items: center;
}
.wf-files-row .file-name > b.folder {
  color: #f4b71b;
}
.wf-files-row .file-name > b.file {
  background: #e8f1ff;
  color: #2563eb;
}
.wf-files-row .file-name strong {
  display: block;
  color: #111827;
  font-size: 13.5px;
  font-weight: 900;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.wf-files-row .file-name small {
  display: block;
  margin-top: 2px;
  color: #64748b;
  font-size: 12px;
  font-weight: 650;
}
.wf-files-row .stage,
.wf-files-row .uploader {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}
.wf-files-row .stage i {
  width: 9px;
  height: 9px;
  border-radius: 999px;
  flex: 0 0 auto;
}
.wf-files-row .uploader b {
  width: 28px;
  height: 28px;
  border-radius: 999px;
  background: #dff5e9;
  color: #154a32;
  display: grid;
  place-items: center;
  font-size: 10px;
  font-weight: 900;
}
.wf-files-row > button {
  width: 32px;
  height: 32px;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: #4b5563;
  display: grid;
  place-items: center;
  justify-self: center;
  cursor: pointer;
}
.wf-activity-view {
  min-width: 1180px;
  padding: 22px 28px 28px;
  background: #fff;
}
.wf-activity-toolbar {
  display: grid;
  grid-template-columns: 260px minmax(0, 1fr) auto auto;
  gap: 12px;
  align-items: center;
  margin-bottom: 24px;
}
.wf-activity-toolbar label {
  height: 42px;
  border: 1px solid #e2e6ec;
  border-radius: 6px;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 0 13px;
  color: #8a95a3;
}
.wf-activity-toolbar input {
  min-width: 0;
  flex: 1;
  border: 0;
  outline: 0;
  background: transparent;
  color: #111827;
  font: inherit;
  font-size: 13px;
}
.wf-activity-toolbar button {
  min-height: 42px;
  border: 1px solid #e2e6ec;
  border-radius: 6px;
  background: #fff;
  color: #111827;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 0 15px;
  font-size: 13px;
  font-weight: 800;
  cursor: pointer;
}
.wf-activity-table {
  border-top: 1px solid #edf0f3;
  background: #fff;
}
.wf-activity-row {
  min-height: 58px;
  display: grid;
  grid-template-columns: minmax(170px, .8fr) minmax(230px, 1.1fr) minmax(130px, .6fr) minmax(130px, .6fr) minmax(360px, 2fr);
  gap: 18px;
  align-items: center;
  border-bottom: 1px solid #edf0f3;
  color: #263548;
  font-size: 13px;
  font-weight: 700;
}
.wf-activity-row.head {
  min-height: 48px;
  color: #4b5563;
  font-size: 12px;
  font-weight: 850;
}
.wf-activity-row:not(.head):hover {
  background: #fbfbfc;
}
.wf-activity-row .actor {
  display: inline-flex;
  align-items: center;
  gap: 12px;
}
.wf-activity-row .actor b {
  width: 28px;
  height: 28px;
  border-radius: 999px;
  background: #dff5e9;
  color: #154a32;
  display: grid;
  place-items: center;
  font-size: 10px;
  font-weight: 900;
}
.wf-activity-row em {
  min-width: 70px;
  min-height: 24px;
  border-radius: 999px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0 10px;
  font-style: normal;
  font-size: 12px;
  font-weight: 900;
}
.wf-activity-row em.created {
  background: #e4f8ee;
  color: #0f8a53;
}
.wf-activity-row em.updated {
  background: #eee9ff;
  color: #6d5bd7;
}
.wf-activity-row .entity {
  display: inline-flex;
  align-items: center;
  gap: 10px;
}
.wf-activity-row .entity i {
  width: 11px;
  height: 11px;
  border-radius: 999px;
  flex: 0 0 auto;
}
.wf-settings-view {
  min-width: 1180px;
  padding: 22px 28px 32px;
  background: #fff;
  display: grid;
  grid-template-columns: 225px minmax(0, 1fr);
  gap: 28px;
  align-items: start;
}
.wf-settings-menu {
  border: 1px solid #e5e9ef;
  border-radius: 7px;
  background: #fff;
  padding: 10px;
  display: grid;
  gap: 4px;
}
.wf-settings-menu button {
  min-height: 42px;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: #263548;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 0 12px;
  font-size: 13px;
  font-weight: 800;
  text-align: left;
  cursor: pointer;
}
.wf-settings-menu button.active {
  background: #e8f8f0;
  color: #0f9f5f;
}
.wf-settings-menu button.danger {
  color: #e11d48;
}
.wf-settings-content {
  display: grid;
  gap: 18px;
}
.wf-settings-content > header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 18px;
}
.wf-settings-content h2 {
  margin: 0;
  color: #111827;
  font-size: 19px;
}
.wf-settings-content header p,
.wf-settings-card p {
  margin: 6px 0 0;
  color: #4b5563;
  font-size: 13px;
}
.wf-settings-content header button,
.archive-card button {
  min-height: 40px;
  border: 1px solid #e2e6ec;
  border-radius: 6px;
  background: #fff;
  color: #111827;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 0 16px;
  font-size: 13px;
  font-weight: 850;
  cursor: pointer;
}
.wf-settings-card {
  border: 1px solid #e5e9ef;
  border-radius: 7px;
  background: #fff;
  overflow: hidden;
}
.wf-settings-row {
  min-height: 42px;
  display: grid;
  grid-template-columns: 260px minmax(0, 1fr);
  gap: 24px;
  align-items: center;
  padding: 0 18px;
  border-bottom: 1px solid #edf0f3;
}
.wf-settings-row:last-child {
  border-bottom: 0;
}
.wf-settings-row strong {
  color: #111827;
  font-size: 13px;
  font-weight: 900;
}
.wf-settings-row span {
  min-width: 0;
  display: inline-flex;
  align-items: center;
  gap: 10px;
  color: #263548;
  font-size: 13px;
  font-weight: 700;
}
.wf-settings-row span b {
  width: 25px;
  height: 25px;
  border-radius: 999px;
  background: #dff5e9;
  color: #154a32;
  display: grid;
  place-items: center;
  font-size: 10px;
  font-weight: 900;
}
.wf-settings-row span i {
  width: 10px;
  height: 10px;
  border-radius: 999px;
}
.wf-settings-card.id-card,
.wf-settings-card.archive-card {
  padding: 18px;
}
.wf-settings-card h3 {
  margin: 0;
  color: #111827;
  font-size: 16px;
}
.wf-settings-card.id-card > div {
  height: 42px;
  margin-top: 14px;
  border: 1px solid #edf0f3;
  border-radius: 6px;
  background: #f8fafc;
  display: grid;
  grid-template-columns: minmax(0, 1fr) 42px;
  align-items: center;
  padding-left: 14px;
}
.wf-settings-card code {
  color: #475569;
  font: inherit;
  font-size: 13px;
}
.wf-settings-card.id-card button {
  width: 42px;
  height: 40px;
  border: 0;
  border-left: 1px solid #edf0f3;
  background: transparent;
  color: #475569;
  display: grid;
  place-items: center;
  cursor: pointer;
}
.wf-settings-card.archive-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
}
.wf-job-detail-page {
  min-width: 1180px;
  background: #fff;
  padding-bottom: 32px;
}
.wf-job-detail-hero {
  padding: 24px 28px 18px;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 24px;
}
.wf-job-detail-title {
  display: grid;
  grid-template-columns: 34px minmax(0, 1fr);
  gap: 14px;
  align-items: start;
}
.wf-job-detail-title > a {
  width: 30px;
  height: 30px;
  border-radius: 6px;
  color: #111827;
  display: grid;
  place-items: center;
  text-decoration: none;
}
.wf-job-detail-title h1 {
  margin: 0;
  color: #111827;
  font-size: 26px;
  line-height: 1.1;
}
.wf-job-detail-title p {
  margin: 7px 0 0;
  color: #4b5563;
  font-size: 13px;
  font-weight: 650;
}
.wf-job-detail-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}
.wf-job-detail-actions button,
.wf-job-panel header button,
.wf-side-panel button {
  min-height: 38px;
  border: 1px solid #e2e6ec;
  border-radius: 6px;
  background: #fff;
  color: #111827;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 0 14px;
  font-size: 13px;
  font-weight: 850;
  cursor: pointer;
}
.wf-job-summary-strip {
  margin: 0 28px 20px;
  border: 1px solid #e5e9ef;
  border-radius: 7px;
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  overflow: hidden;
}
.wf-job-summary-strip > div {
  min-height: 72px;
  border-right: 1px solid #edf0f3;
  padding: 16px 18px;
  display: grid;
  gap: 9px;
}
.wf-job-summary-strip > div:last-child { border-right: 0; }
.wf-job-summary-strip strong {
  color: #111827;
  font-size: 12px;
  font-weight: 900;
}
.wf-job-summary-strip span {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: #263548;
  font-size: 13px;
  font-weight: 800;
}
.wf-job-summary-strip .stage i {
  width: 10px;
  height: 10px;
  border-radius: 999px;
}
.wf-job-summary-strip .priority.high { color: #ef4444; }
.wf-job-summary-strip .priority.medium { color: #b7791f; }
.wf-job-summary-strip .priority.low { color: #0f9f5f; }
.wf-job-summary-strip .assignees b {
  width: 24px;
  height: 24px;
  border-radius: 999px;
  background: #dff5e9;
  color: #154a32;
  display: grid;
  place-items: center;
  font-size: 10px;
  font-weight: 900;
}
.wf-job-detail-tabs {
  height: 58px;
  display: flex;
  align-items: flex-end;
  gap: 28px;
  padding: 0 28px;
  border-top: 1px solid #edf0f3;
  border-bottom: 1px solid #edf0f3;
}
.wf-job-detail-tabs button {
  height: 44px;
  border: 0;
  border-bottom: 2px solid transparent;
  background: transparent;
  color: #4b5563;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  font-weight: 850;
  cursor: pointer;
}
.wf-job-detail-tabs button.active {
  color: #0f9f5f;
  border-bottom-color: #0f9f5f;
}
.wf-job-detail-tabs span {
  min-width: 20px;
  height: 20px;
  border-radius: 999px;
  background: #eef1f5;
  color: #475569;
  display: grid;
  place-items: center;
  font-size: 11px;
}
.wf-job-detail-grid {
  padding: 20px 28px 0;
  display: grid;
  grid-template-columns: minmax(0, 1fr) 310px;
  gap: 18px;
  align-items: start;
}
.wf-job-detail-main,
.wf-job-detail-side {
  display: grid;
  gap: 16px;
}
.wf-job-panel,
.wf-side-panel {
  border: 1px solid #e5e9ef;
  border-radius: 7px;
  background: #fff;
  padding: 18px;
}
.wf-job-panel header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
}
.wf-job-panel h2,
.wf-side-panel h3 {
  margin: 0;
  color: #111827;
  font-size: 16px;
}
.wf-job-panel p {
  margin: 0;
  color: #263548;
  font-size: 13.5px;
  line-height: 1.55;
}
.wf-job-panel dl {
  display: grid;
  gap: 14px;
  margin: 0;
}
.wf-job-panel dl div {
  display: grid;
  grid-template-columns: 180px minmax(0, 1fr);
  gap: 18px;
}
.wf-job-panel dt {
  color: #111827;
  font-size: 13px;
  font-weight: 900;
}
.wf-job-panel dd {
  margin: 0;
  color: #263548;
  font-size: 13px;
  font-weight: 750;
}
.wf-job-panel dd a {
  color: #0f9f5f;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  text-decoration: none;
}
.wf-job-todos {
  margin: 0;
  padding: 0;
  display: grid;
  gap: 13px;
  list-style: none;
}
.wf-job-todos li {
  display: grid;
  grid-template-columns: 22px minmax(0, 1fr) auto;
  gap: 9px;
  align-items: center;
  color: #111827;
  font-size: 13px;
  font-weight: 750;
}
.wf-job-todos svg { color: #0f9f5f; }
.wf-job-todos li > span:last-child {
  color: #4b5563;
  font-size: 12px;
}
.empty-check {
  width: 18px;
  height: 18px;
  border: 1px solid #cfd6df;
  border-radius: 999px;
}
.wf-job-comment,
.wf-job-comment-input {
  display: grid;
  grid-template-columns: 34px minmax(0, 1fr);
  gap: 12px;
  align-items: start;
}
.wf-job-comment b,
.wf-job-comment-input b,
.wf-follower-row b {
  width: 34px;
  height: 34px;
  border-radius: 999px;
  background: #dff5e9;
  color: #154a32;
  display: grid;
  place-items: center;
  font-size: 11px;
  font-weight: 900;
}
.wf-job-comment strong {
  color: #111827;
  font-size: 13px;
}
.wf-job-comment small {
  margin-left: 10px;
  color: #6b7280;
  font-size: 12px;
}
.wf-job-comment-input {
  margin-top: 18px;
  align-items: center;
}
.wf-job-comment-input input {
  height: 42px;
  border: 1px solid #e2e6ec;
  border-radius: 6px;
  padding: 0 38px 0 12px;
  font: inherit;
  outline: 0;
}
.wf-job-comment-input svg {
  justify-self: end;
  margin: 0 12px 0 -34px;
  color: #6b7280;
}
.wf-side-progress {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 42px;
  gap: 10px;
  align-items: center;
  margin: 16px 0 18px;
}
.wf-side-progress i {
  height: 8px;
  border-radius: 999px;
  background: #e5e7eb;
  overflow: hidden;
}
.wf-side-progress b {
  display: block;
  height: 100%;
  background: #10b981;
}
.wf-side-panel > small {
  display: block;
  margin-bottom: 14px;
  color: #4b5563;
  font-size: 11px;
  font-weight: 900;
  text-transform: uppercase;
}
.wf-side-panel ol {
  display: grid;
  gap: 13px;
  margin: 0;
  padding: 0;
  list-style: none;
}
.wf-side-panel li {
  display: grid;
  grid-template-columns: 26px minmax(0, 1fr);
  gap: 9px;
  align-items: start;
}
.wf-side-panel li b {
  width: 22px;
  height: 22px;
  border-radius: 999px;
  background: #e5e7eb;
  color: #475569;
  display: grid;
  place-items: center;
  font-size: 11px;
}
.wf-side-panel li.done b,
.wf-side-panel li.current b {
  background: #10b981;
  color: #fff;
}
.wf-side-panel li span {
  color: #111827;
  font-size: 13px;
  font-weight: 850;
}
.wf-side-panel li small {
  display: block;
  color: #6b7280;
  font-size: 12px;
  font-weight: 650;
}
.wf-time-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  margin: 18px 0 14px;
}
.wf-time-grid small {
  display: block;
  color: #6b7280;
  font-size: 11px;
  margin-bottom: 5px;
}
.wf-time-grid strong {
  color: #111827;
  font-size: 13px;
}
.wf-side-panel p {
  display: grid;
  grid-template-columns: 24px minmax(0, 1fr);
  gap: 9px;
  color: #111827;
  font-size: 13px;
  font-weight: 850;
}
.wf-side-panel p small {
  display: block;
  color: #6b7280;
  font-size: 11px;
  font-weight: 650;
}
.wf-side-panel > a {
  color: #0f9f5f;
  font-size: 12px;
  font-weight: 850;
  text-decoration: none;
}
.wf-follower-row {
  display: flex;
  align-items: center;
  gap: 0;
}
.wf-follower-row b {
  margin-left: -7px;
  border: 2px solid #fff;
}
.wf-follower-row b:first-child { margin-left: 0; }
.wf-follower-row button {
  margin-left: auto;
}
.wf-list-page {
  min-height: calc(100vh - 66px);
  background: #fff;
  padding: 26px 28px 32px;
}
.wf-my-jobs-page {
  min-height: calc(100vh - 66px);
  background: #fff;
  padding: 26px 28px 32px;
  color: #111827;
}
.wf-my-jobs-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 22px;
  margin-bottom: 24px;
}
.wf-my-jobs-title {
  display: block;
}
.wf-my-jobs-title > span {
  width: 46px;
  height: 46px;
  border-radius: 9px;
  background: #dff8eb;
  color: #0f9f5f;
  display: grid;
  place-items: center;
}
.wf-my-jobs-title h1 {
  margin: 6px 0 0;
  color: #111827;
  font-size: 28px;
  line-height: 1.05;
}
.wf-my-jobs-title p {
  margin: 6px 0 0;
  color: #4b5563;
  font-size: 14px;
}
.wf-my-jobs-actions {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
  justify-content: flex-end;
}
.wf-my-jobs-actions label {
  width: 230px;
  height: 42px;
  border: 1px solid #e2e6ec;
  border-radius: 6px;
  background: #fff;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 0 13px;
  color: #8a95a3;
}
.wf-my-jobs-actions input {
  min-width: 0;
  flex: 1;
  border: 0;
  outline: 0;
  background: transparent;
  color: #111827;
  font: inherit;
  font-size: 13px;
}
.wf-my-jobs-actions button {
  min-height: 42px;
  border: 1px solid #e2e6ec;
  border-radius: 6px;
  background: #fff;
  color: #111827;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 0 15px;
  font-size: 13px;
  font-weight: 850;
  cursor: pointer;
}
.wf-jobs-metrics {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 14px;
  margin-bottom: 22px;
}
.wf-jobs-metric {
  min-height: 108px;
  border: 1px solid #eef1f4;
  border-radius: 14px;
  background: #fff;
  box-shadow: 0 1px 2px rgba(16, 24, 40, 0.04);
  display: grid;
  grid-template-columns: 58px minmax(0, 1fr);
  gap: 14px;
  align-items: center;
  padding: 18px 20px;
}
.wf-jobs-metric > span {
  width: 50px;
  height: 50px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--wf-tone) 13%, white);
  color: var(--wf-tone);
  display: grid;
  place-items: center;
}
.wf-jobs-metric strong {
  display: block;
  color: #111827;
  font-size: 28px;
  line-height: 1;
}
.wf-jobs-metric p {
  margin: 0 0 6px;
  color: #111827;
  font-size: 13px;
  font-weight: 900;
}
.wf-jobs-metric small {
  color: #4b5563;
  font-size: 12px;
  font-weight: 650;
}
.wf-my-jobs-tabs {
  height: 52px;
  border: 1px solid #eef1f4;
  border-bottom: 1px solid #eef1f4;
  border-radius: 12px 12px 0 0;
  background: #fff;
  display: flex;
  align-items: stretch;
  gap: 2px;
  padding: 0 10px;
}
.wf-my-jobs-tabs button {
  border: 0;
  border-bottom: 2px solid transparent;
  background: transparent;
  color: #6b7480;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 0 16px;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  transition: color 120ms ease, border-color 120ms ease;
}
.wf-my-jobs-tabs button:hover {
  color: #111827;
}
.wf-my-jobs-tabs button.active {
  color: #0f9f5f;
  border-bottom-color: #0f9f5f;
  font-weight: 800;
}
.wf-my-jobs-table {
  border: 1px solid #eef1f4;
  border-top: 0;
  border-radius: 0 0 12px 12px;
  overflow: hidden;
  background: #fff;
}
.wf-my-jobs-row {
  min-height: 74px;
  display: grid;
  grid-template-columns: 42px minmax(280px, 1.6fr) minmax(130px, .7fr) minmax(120px, .65fr) minmax(120px, .65fr) minmax(130px, .7fr) minmax(180px, .9fr) minmax(110px, .55fr);
  gap: 14px;
  align-items: center;
  padding: 0 14px;
  border-bottom: 1px solid #edf0f3;
  color: #111827;
}
.wf-my-jobs-row:last-child {
  border-bottom: 0;
}
.wf-my-jobs-row.head {
  min-height: 54px;
  color: #111827;
  font-size: 12px;
  font-weight: 900;
}
.wf-my-jobs-row:not(.head):hover {
  background: #fbfbfc;
}
.wf-my-jobs-row .check {
  width: 17px;
  height: 17px;
  border: 1px solid #cfd6df;
  border-radius: 5px;
  display: block;
}
.wf-my-jobs-row .job {
  min-width: 0;
  display: grid;
  gap: 3px;
}
.wf-my-jobs-row .job a {
  color: #111827;
  font-size: 13.5px;
  font-weight: 900;
  text-decoration: none;
}
.wf-my-jobs-row .job small,
.wf-my-jobs-row .job em,
.wf-my-jobs-row .due small {
  color: #4b5563;
  font-size: 12px;
  font-style: normal;
  font-weight: 650;
}
.wf-my-jobs-row .assignees {
  display: flex;
  align-items: center;
}
.wf-my-jobs-row .assignees b,
.wf-my-jobs-row .assignees i {
  width: 28px;
  height: 28px;
  margin-left: -5px;
  border: 2px solid #fff;
  border-radius: 999px;
  background: #dff5e9;
  color: #154a32;
  display: grid;
  place-items: center;
  font-size: 10px;
  font-style: normal;
  font-weight: 900;
}
.wf-my-jobs-row .assignees b:first-child { margin-left: 0; }
.wf-my-jobs-row .assignees b:nth-child(2) { background: #ede7ff; color: #5b48a2; }
.wf-my-jobs-row .stage,
.wf-my-jobs-row .priority,
.wf-my-jobs-row .workflow {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: #263548;
  font-size: 13px;
  font-weight: 800;
}
.wf-my-jobs-row .stage {
  width: fit-content;
  min-height: 26px;
  border-radius: 999px;
  background: #f1f3f7;
  padding: 0 11px;
  color: #344256;
  font-weight: 700;
}
.wf-my-jobs-row .stage i {
  width: 8px;
  height: 8px;
  border-radius: 999px;
}
.wf-my-jobs-row .priority {
  width: fit-content;
  min-height: 26px;
  border-radius: 999px;
  padding: 0 11px;
  font-size: 12.5px;
  font-weight: 800;
}
.wf-my-jobs-row .priority.high { background: #fef2f2; color: #e11d48; }
.wf-my-jobs-row .priority.medium { background: #fdf3e3; color: #b7791f; }
.wf-my-jobs-row .priority.low { background: #ecfdf3; color: #0f9f5f; }
.wf-my-jobs-row .due {
  display: grid;
  gap: 4px;
  color: #111827;
  font-size: 13px;
}
.wf-my-jobs-row .due.overdue strong { color: #e11d48; }
.wf-my-jobs-row .due.today strong { color: #b7791f; }
.wf-my-jobs-row .workflow b {
  width: 26px;
  height: 26px;
  border-radius: 6px;
  color: #fff;
  display: grid;
  place-items: center;
  font-size: 9px;
  font-weight: 900;
}
.wf-my-jobs-row .actions {
  display: inline-flex;
  align-items: center;
  gap: 10px;
}
.wf-my-jobs-row .actions a {
  min-height: 34px;
  border: 1px solid #dbe7df;
  border-radius: 6px;
  color: #0f7a4a;
  display: inline-flex;
  align-items: center;
  padding: 0 16px;
  text-decoration: none;
  font-size: 13px;
  font-weight: 850;
}
.wf-my-jobs-row .actions button {
  width: 30px;
  height: 30px;
  border: 0;
  background: transparent;
  color: #4b5563;
  display: grid;
  place-items: center;
  cursor: pointer;
}
.wf-list-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 20px;
}
.wf-list-breadcrumb {
  color: #64748b;
  font-size: 13px;
  margin-bottom: 14px;
}
.wf-list-breadcrumb strong { color: #111827; }
.wf-list-header h1 {
  margin: 0;
  color: #111827;
  font-size: 30px;
  line-height: 1.1;
  letter-spacing: 0;
}
.wf-list-header p {
  margin: 8px 0 0;
  color: #4b5563;
  font-size: 14px;
}
.wf-list-actions {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
  justify-content: flex-end;
}
.wf-list-actions button,
.wf-list-filters button,
.wf-list-footer button {
  min-height: 40px;
  border: 1px solid #e2e6ec;
  border-radius: 6px;
  background: #fff;
  color: #111827;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 0 16px;
  font: inherit;
  font-size: 13px;
  font-weight: 800;
  cursor: pointer;
}
.wf-summary-grid {
  display: grid;
  grid-template-columns: repeat(6, minmax(150px, 1fr));
  gap: 14px;
  margin: 28px 0 26px;
}
.wf-summary-card {
  min-height: 112px;
  border: 1px solid #e8ebf0;
  border-radius: 8px;
  background: #fff;
  display: grid;
  grid-template-columns: 48px minmax(0, 1fr);
  gap: 14px;
  align-items: center;
  padding: 18px;
  box-shadow: 0 1px 2px rgba(16,24,40,.03);
}
.wf-summary-card > span {
  width: 48px;
  height: 48px;
  border-radius: 10px;
  background: color-mix(in srgb, var(--wf-summary-tone) 14%, white);
  color: var(--wf-summary-tone);
  display: grid;
  place-items: center;
}
.wf-summary-card p {
  margin: 0 0 6px;
  color: #334155;
  font-size: 12px;
  font-weight: 850;
}
.wf-summary-card strong {
  display: block;
  color: #111827;
  font-size: 28px;
  line-height: 1;
}
.wf-summary-card small {
  display: block;
  margin-top: 9px;
  color: #64748b;
  font-size: 12px;
}
.wf-list-filters {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
  margin-bottom: 24px;
}
.wf-list-filters label {
  width: min(320px, 100%);
  height: 42px;
  border: 1px solid #e2e6ec;
  border-radius: 6px;
  background: #fff;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 0 12px;
  color: #64748b;
}
.wf-list-filters input {
  min-width: 0;
  flex: 1;
  border: 0;
  outline: 0;
  background: transparent;
  color: #111827;
  font: inherit;
  font-size: 13px;
}
.wf-list-filters .clear {
  border-color: transparent;
  color: #4b5563;
  font-weight: 750;
}
.wf-list-table {
  border: 1px solid #edf0f3;
  border-radius: 8px;
  overflow: hidden;
  background: #fff;
}
.wf-list-row {
  min-height: 78px;
  display: grid;
  grid-template-columns: minmax(260px, 1.9fr) minmax(130px, .8fr) minmax(150px, 1fr) minmax(95px, .65fr) minmax(90px, .6fr) minmax(90px, .55fr) minmax(150px, .9fr) minmax(140px, .9fr) 70px;
  gap: 16px;
  align-items: center;
  padding: 0 14px;
  border-bottom: 1px solid #edf0f3;
  color: #111827;
  text-decoration: none;
}
.wf-list-row.header {
  min-height: 54px;
  background: #fbfbfc;
  color: #334155;
  font-size: 12px;
  font-weight: 900;
}
.wf-list-row:not(.header):hover {
  background: #fbfbfc;
}
.wf-list-name {
  display: grid;
  grid-template-columns: 42px minmax(0, 1fr);
  gap: 14px;
  align-items: center;
}
.wf-list-name > b {
  width: 38px;
  height: 38px;
  border-radius: 6px;
  background: var(--wf-card-color, #0f9f5f);
  color: #fff;
  display: grid;
  place-items: center;
  font-size: 12px;
  font-weight: 950;
}
.wf-list-name strong {
  display: block;
  color: #111827;
  font-size: 14px;
  margin-bottom: 5px;
}
.wf-list-name small,
.wf-activity small,
.wf-jobs-count small {
  display: block;
  color: #64748b;
  font-size: 12px;
}
.wf-chip,
.wf-status {
  display: inline-flex;
  align-items: center;
  min-height: 22px;
  border-radius: 999px;
  background: #e9f9f2;
  color: #0f8a53;
  padding: 0 11px;
  font-size: 11px;
  font-style: normal;
  font-weight: 850;
}
.wf-owner {
  display: flex;
  align-items: center;
  gap: 10px;
  color: #4b5563;
  font-size: 13px;
}
.wf-owner i {
  width: 30px;
  height: 30px;
  border-radius: 999px;
  background: #0a3d2a;
  color: #fff;
  display: grid;
  place-items: center;
  font-style: normal;
  font-size: 11px;
  font-weight: 900;
}
.wf-jobs-count strong { display: block; font-size: 14px; }
.wf-overdue {
  color: #111827;
  font-weight: 850;
}
.wf-overdue.has { color: #e11d48; }
.wf-completion {
  color: #111827;
  font-size: 13px;
  font-weight: 850;
}
.wf-completion small {
  display: block;
  width: 110px;
  height: 5px;
  border-radius: 999px;
  background: #e5e7eb;
  overflow: hidden;
  margin-top: 7px;
}
.wf-completion b {
  display: block;
  height: 100%;
  background: #0f9f5f;
}
.wf-activity {
  color: #334155;
  font-size: 13px;
  font-weight: 750;
}
.wf-row-action {
  width: 34px;
  height: 34px;
  border: 0;
  background: transparent;
  color: #111827;
  display: grid;
  place-items: center;
  cursor: pointer;
}
.wf-list-empty {
  min-height: 240px;
  display: grid;
  place-items: center;
  color: #64748b;
  font-size: 14px;
}
.wf-list-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  color: #4b5563;
  font-size: 13px;
  padding: 18px 10px 0;
}
.wf-list-footer div {
  display: flex;
  align-items: center;
  gap: 8px;
}
.wf-detail-page {
  background: #fff;
  min-height: calc(100vh - 66px);
  overflow-x: auto;
}
.wf-detail-page .wf-detail-hero {
  min-width: 0;
  min-height: 82px;
  padding: 14px 28px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  border-bottom: 1px solid #e5e7eb;
  background: #fff;
}
.wf-detail-page .wf-detail-title {
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 12px;
}
.wf-detail-page .wf-detail-icon {
  width: 32px;
  height: 32px;
  border-radius: 4px;
  font-size: 11px;
  flex: 0 0 auto;
}
.wf-detail-page .wf-breadcrumb {
  margin: 0 0 3px;
  color: #6b7280;
  font-size: 11px;
  font-weight: 650;
}
.wf-detail-page .wf-detail-title h1 {
  margin: 0;
  color: #000;
  font-size: 24px;
  line-height: 1.05;
  font-weight: 900;
}
.wf-detail-page .wf-detail-title > button,
.wf-detail-page .wf-detail-actions > button {
  width: 32px;
  height: 32px;
  border: 1px solid #e0e3e8;
  border-radius: 4px;
  background: #fff;
  color: #9aa3af;
  display: grid;
  place-items: center;
  cursor: pointer;
}
.wf-detail-page .wf-detail-title > button {
  border-color: transparent;
  color: #9ca3af;
}
.wf-detail-page .wf-detail-actions {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  justify-content: flex-end;
}
.wf-detail-search {
  width: 220px;
  height: 32px;
  border: 1px solid #dfe3e8;
  border-radius: 4px;
  background: #fff;
  color: #6b7280;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 10px;
}
.wf-detail-search input {
  min-width: 0;
  width: 100%;
  border: 0;
  outline: 0;
  background: transparent;
  color: #111827;
  font: inherit;
  font-size: 12px;
}
.wf-detail-page .wf-detail-actions .wf-filter,
.wf-detail-page .wf-detail-actions .wf-primary {
  min-height: 32px;
  border-radius: 4px;
  padding: 0 12px;
  font-size: 12px;
  font-weight: 850;
}
.wf-detail-page .wf-detail-actions .wf-primary {
  background: #0f8ea2;
  border-color: #0f8ea2;
  box-shadow: 0 8px 18px rgba(15,142,162,.18);
}
.wf-detail-page .wf-detail-tabs {
  min-width: 0;
  height: 42px;
  padding: 0 28px;
  gap: 22px;
  align-items: stretch;
  border-bottom: 1px solid #e5e7eb;
}
.wf-detail-page .wf-detail-tabs button {
  height: 42px;
  display: inline-flex;
  align-items: center;
  gap: 7px;
  color: #8b949e;
  text-transform: uppercase;
  font-size: 11px;
  font-weight: 900;
}
.wf-detail-page .wf-detail-tabs button.active {
  color: #111827;
  border-bottom-color: #111827;
}
.wf-detail-page .wf-board-toolbar {
  min-width: 0;
  height: 44px;
  padding: 0 28px;
  border-bottom: 1px solid #e9ecef;
  background: #fff;
}
.wf-detail-page .wf-board-toolbar button {
  min-height: 30px;
  border-color: #e5e7eb;
  border-radius: 5px;
  background: #fff;
  padding: 0 10px;
  color: #111827;
  font-size: 12px;
  font-weight: 850;
}
.wf-detail-page .wf-board-toolbar span {
  color: #6b7280;
  font-size: 12px;
  font-weight: 750;
}
.wf-detail-page .wf-kanban {
  min-width: 0;
  width: 100%;
  grid-auto-columns: minmax(340px, 1fr);
  gap: 0;
  padding: 0;
  align-items: stretch;
  min-height: calc(100vh - 234px);
  max-height: none;
  background: #fff;
}
.wf-detail-page .wf-kanban-column {
  min-height: calc(100vh - 234px);
  max-height: none;
  border: 0;
  border-right: 1px solid #dde3eb;
  border-radius: 0;
  background: #f7f8fa;
  box-shadow: none;
}
.wf-detail-page .wf-kanban-column.is-done {
  background: #f2fff3;
}
.wf-detail-page .wf-kanban-column.is-failed {
  background: #fff4f4;
}
.wf-detail-page .wf-kanban-column header {
  min-height: 116px;
  border-bottom: 1px solid #e2e5e9;
  padding: 14px 16px 12px;
  display: grid;
  grid-template-columns: 1fr;
  gap: 8px;
  background: color-mix(in srgb, var(--wf-stage-color) 9%, #fff);
}
.wf-detail-page .wf-kanban-column header > div {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto 20px;
  align-items: center;
  gap: 8px;
}
.wf-detail-page .wf-kanban-column header strong {
  color: #111827;
  font-size: 16px;
  font-weight: 850;
}
.wf-detail-page .wf-kanban-column header button {
  width: 20px;
  height: 20px;
  border: 0;
  background: transparent;
  color: #000;
  display: grid;
  place-items: center;
  cursor: pointer;
}
.wf-detail-page .wf-kanban-column .wf-member-row {
  display: flex;
  align-items: center;
  gap: 0;
}
.wf-detail-page .wf-kanban-column .wf-member-row i {
  width: 18px;
  height: 18px;
  margin-left: -5px;
  border: 1px solid #fff;
  border-radius: 999px;
  background: #172033;
  color: #fff;
  display: grid;
  place-items: center;
  font-size: 8px;
  font-style: normal;
  font-weight: 900;
}
.wf-detail-page .wf-kanban-column .wf-member-row i:first-child {
  margin-left: 0;
}
.wf-stage-progress {
  height: 5px;
  width: 100%;
  border-radius: 999px;
  background: color-mix(in srgb, var(--wf-stage-color) 45%, #cfd4dc);
}
.wf-detail-page .wf-kanban-column header small {
  color: #7b8490;
  font-size: 12px;
  font-weight: 750;
}
.wf-detail-page .wf-kanban-column header em {
  color: #e85b5b;
  font-style: normal;
}
.wf-detail-page .wf-kanban-list {
  padding: 0 16px 12px;
  background: transparent;
  overflow-y: visible;
}
.wf-detail-page .wf-job-card {
  min-height: 128px;
  border: 0;
  border-bottom: 1px solid #e4e8ee;
  border-radius: 0;
  background: #fff;
  padding: 15px 0 14px;
  margin-bottom: 0;
  color: #111827;
  text-decoration: none;
  box-shadow: none;
  transition: background .16s ease, padding .16s ease;
}
.wf-detail-page .wf-job-card:hover {
  transform: none;
  background: rgba(255,255,255,.72);
  padding-left: 8px;
  padding-right: 8px;
}
.wf-detail-page .wf-job-card h4 {
  font-size: 14px;
}
.wf-detail-page .wf-job-card p {
  color: #374151;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.wf-detail-page .wf-job-date {
  margin-top: 0;
  justify-self: start;
}
.wf-detail-page .wf-add-job {
  min-height: 42px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: auto 0 0;
  border: 0;
  border-top: 1px solid #dde3eb;
  border-radius: 0;
  padding: 0 16px;
  color: #334155;
  background: #fff;
  text-decoration: none;
}
.wf-detail-page .wf-add-job:hover {
  border-color: #dde3eb;
  color: #0f8ea2;
  background: #f7fbfc;
}
.wf-detail-page .wf-add-stage {
  width: auto;
  min-height: calc(100vh - 234px);
  max-height: none;
  border: 0;
  border-right: 1px solid #dde3eb;
  border-radius: 0;
  background: #fff;
  align-content: center;
  box-shadow: none;
}
.wf-detail-page .wf-add-stage button {
  width: 58px;
  height: 58px;
  background: #0f9f5f;
  box-shadow: 0 14px 28px rgba(15,159,95,.24);
}
.wf-detail-page .wf-add-stage button:hover {
  transform: translateY(-1px);
}
.wf-detail-page .wf-add-stage span {
  color: #334155;
  font-weight: 850;
}
@media (max-width: 1180px) {
  .wf-page-header { align-items: flex-start; flex-direction: column; }
  .wf-header-actions { width: 100%; flex-wrap: wrap; }
  .wf-search { flex: 1 1 240px; }
  .wf-card-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .wf-create-grid { grid-template-columns: 1fr; }
  .wf-detail-hero { grid-template-columns: 1fr; }
  .wf-detail-actions { flex-wrap: wrap; }
  .wf-summary-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); }
  .wf-list-table { overflow-x: auto; }
  .wf-list-row { min-width: 1180px; }
}
@media (max-width: 760px) {
  .wf-page-header,
  .wf-groups,
  .wf-create-shell { padding-left: 16px; padding-right: 16px; }
  .wf-card-grid,
  .wf-form-row,
  .wf-steps { grid-template-columns: 1fr; }
  .wf-steps::before { display: none; }
  .wf-icon-grid { grid-template-columns: repeat(4, 56px); }
  .wf-summary-grid { grid-template-columns: 1fr; }
  .wf-list-header { flex-direction: column; }
  .wf-list-actions { justify-content: flex-start; }
}

/* The global \`[class*="header"]\` catch-all (globals.css:4116) forces a white
   background on any element whose class contains "header" — including the
   workflow page header rows (wf-my-jobs-header, wf-page-header, wf-list-header).
   Prefixing with html[data-theme] raises specificity to (0,3,1) so these
   sections stay transparent and show the page background instead. */
html[data-theme] .wf-my-jobs-page .wf-my-jobs-header,
html[data-theme] .wf-page .wf-page-header,
html[data-theme] .wf-my-jobs-page .wf-list-header {
  background: transparent !important;
  background-color: transparent !important;
  box-shadow: none !important;
  border-color: transparent !important;
}
`
