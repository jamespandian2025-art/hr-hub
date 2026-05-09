'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import type { ChangeEvent, ClipboardEvent, DragEvent, ReactNode } from 'react'
import {
  AlignLeft,
  AlignJustify,
  Baseline,
  BarChart3,
  Bold,
  BriefcaseBusiness,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Circle,
  CirclePlus,
  ClipboardList,
  Code,
  Columns3,
  Flag,
  Grid2X2,
  Heading1,
  Heading2,
  Highlighter,
  Image,
  Italic,
  Layers,
  Link,
  List,
  ListOrdered,
  ListTodo,
  Lock,
  MoreHorizontal,
  Paperclip,
  Pencil,
  Plus,
  Quote,
  RemoveFormatting,
  Search,
  Strikethrough,
  Trash2,
  Underline,
  Users,
  X,
} from 'lucide-react'

const font = "'DM Sans', sans-serif"
const displayFont = "'Outfit', 'DM Sans', sans-serif"
const tasksStorageKey = 'flowsys-assigned-tasks'
const projectsStorageKey = 'flowsys-projects'
const accountStorageKey = 'flowsys-account'
const contactsStorageKey = 'flowsys-contacts'
const changeOrdersStorageKey = 'flowsys-change-orders'
const taskCommentsStorageKey = 'flowsys-task-comments'
const customColumnsStorageKey = 'flowsys-task-columns'

type TaskStatus = 'Open' | 'In Progress' | 'Completed'
type TaskPriority = 'Urgent' | 'High' | 'Normal' | 'Low'
type ViewMode = 'List' | 'Board' | 'Grid' | 'Reminders' | 'Workflows' | 'SystemReport'
type ColumnFieldType = 'text' | 'number' | 'date' | 'dropdown' | 'checkbox' | 'labels' | 'money' | 'website' | 'textarea'

interface CustomColumn {
  id: string
  name: string
  type: ColumnFieldType
  width: number
}

interface SubTask {
  id: number
  title: string
  done: boolean
}

interface ChecklistItem {
  id: number
  text: string
  done: boolean
}

interface Checklist {
  id: number
  title: string
  items: ChecklistItem[]
}

interface AssignedTask {
  id: number
  projectId: number
  changeOrderId?: number
  title: string
  description: string
  assignee: string
  startDate?: string
  dueDate: string
  status: TaskStatus
  priority?: TaskPriority
  tags?: string[]
  subtasks?: SubTask[]
  checklists?: Checklist[]
  timeTracked?: number
  assignees?: string[]
  taskAttachments?: CommentAttachment[]
  customFields?: Record<string, string>
  source: 'Change Order' | 'Manual'
  createdAt: string
  stageId?: string
}

interface WorkflowStage {
  id: string
  name: string
  color: string
  order: number
  type: 'normal' | 'done' | 'failed'
  owners?: string[]
  workers?: string[]
  defaultFollowers?: string[]
  addUserGroupsAsWorkers?: boolean
  guideline?: string
  expectedHours?: string
  assignmentOption?: string
  deadlineMode?: string
}

interface ProjectRecord {
  id: number
  name: string
  client: string
  location: string
  department?: string
  description?: string
  stages?: WorkflowStage[]
  failedReasons?: string[]
  visibility?: string
  displayOption?: string
  reviewers?: string[]
  viewerGroups?: string
  creatorGroups?: string
  deleted?: boolean
  deletedAt?: string
}

const DEFAULT_STAGES: WorkflowStage[] = [
  { id: 'wf-done',   name: 'Done',   color: '#1db954', order: 100, type: 'done'   },
  { id: 'wf-failed', name: 'Failed', color: '#ef4444', order: 200, type: 'failed' },
]

function getProjectStages(project?: ProjectRecord): WorkflowStage[] {
  if (!project?.stages || project.stages.length === 0) return DEFAULT_STAGES
  return [...project.stages].sort((a, b) => a.order - b.order)
}

const WORKFLOW_DEPARTMENTS = [
  'Purchasing',
  'Design Team',
  'Engineering Dept',
  'Quantity Surveying/Estimates',
  'Project Management Team',
  'No Group',
]

interface AccountRecord {
  fullName?: string
  name?: string
  role?: 'Admin' | 'Project Manager' | 'Support' | 'Client'
}

interface ContactRecord {
  name: string
}

interface StageMemberConfig {
  owners: string[]
  workers: string[]
  defaultFollowers: string[]
  addUserGroupsAsWorkers: boolean
  guideline: string
  expectedHours: string
  assignmentOption: string
  deadlineMode: string
}

interface StageMoveRequest {
  taskId: number
  targetStageId: string
}

interface ChangeOrderRecord {
  id: number
  projectId: number
  clientName: string
  title: string
  description: string
  requestedBy: string
  status: string
  priceImpact: number
  timelineImpact: number
  files: string[]
  createdAt: string
}

interface TaskComment {
  id: number
  taskId: number
  author: string
  body: string
  status: TaskStatus
  attachments?: CommentAttachment[]
  createdAt: string
}

interface CommentAttachment {
  id: number
  name: string
  type: string
  dataUrl: string
}

interface TaskDraft {
  title: string
  description: string
  assignee: string
  projectId: string
  dueDate: string
  status: TaskStatus
  stageId?: string
}

const statusOrder: TaskStatus[] = ['Open', 'In Progress', 'Completed']
const statuses: Array<'All' | TaskStatus> = ['All', ...statusOrder]

const priorityColors: Record<TaskPriority, string> = {
  Urgent: '#ef4444', High: '#f59e0b', Normal: '#3b82f6', Low: '#6b7280',
}

const statusColors: Record<TaskStatus, { bg: string; text: string; border: string }> = {
  Open: { bg: '#f5f5f5', text: '#535353', border: '#b3b3b3' },
  'In Progress': { bg: '#effff4', text: '#1db954', border: '#1db954' },
  Completed: { bg: '#e8fbea', text: '#138a3d', border: '#1ed760' },
}

const clStatusBadge: Record<TaskStatus, { bg: string; color: string }> = {
  Open: { bg: '#2a2a2a', color: '#8c8c8c' },
  'In Progress': { bg: '#1b3a6b', color: '#60a5fa' },
  Completed: { bg: '#14532d', color: '#4ade80' },
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

function formatDate(date: string) {
  if (!date) return 'No due date'
  return new Date(`${date}T00:00:00`).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })
}

function dateTime(date: string) {
  return date ? new Date(`${date}T00:00:00`).getTime() : 0
}

function todayTime() {
  const today = new Date()
  return new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime()
}

function dueMeta(task: AssignedTask) {
  if (task.status === 'Completed') return { group: 'Completed', label: formatDate(task.dueDate), text: '#138a3d', bg: '#e8fbea' }
  if (!task.dueDate) return { group: 'Upcoming', label: 'No due date', text: '#535353', bg: '#f5f5f5' }
  const due = dateTime(task.dueDate)
  const today = todayTime()
  if (due < today) return { group: 'Overdue', label: `${formatDate(task.dueDate)} overdue`, text: '#191414', bg: '#e7e7e7' }
  if (due === today) return { group: 'Today', label: `${formatDate(task.dueDate)} today`, text: '#191414', bg: '#1ed760' }
  if (due <= today + 7 * 86400000) return { group: 'This Week', label: formatDate(task.dueDate), text: '#1db954', bg: '#effff4' }
  return { group: 'Upcoming', label: formatDate(task.dueDate), text: '#1db954', bg: '#effff4' }
}

function taskPriority(task: AssignedTask) {
  if (task.status === 'In Progress') return { label: 'High', color: '#1db954' }
  if (task.status === 'Completed') return { label: 'Done', color: '#138a3d' }
  return { label: 'Normal', color: '#b3b3b3' }
}

function spaceColor(name: string) {
  const colors = ['#1db954', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#10b981']
  let h = 0
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) % colors.length
  return colors[h]
}

function taskType(task: AssignedTask) {
  if (task.source === 'Change Order') return { label: 'Client Request', color: '#1db954' }
  return { label: 'General', color: '#535353' }
}

function taskAssigneeNames(task: AssignedTask) {
  return Array.from(new Set([...(task.assignees || []), task.assignee].filter(Boolean)))
}

export default function TasksPage() {
  const [storageReady, setStorageReady] = useState(false)
  const [tasks, setTasks] = useState<AssignedTask[]>([])
  const [projects, setProjects] = useState<ProjectRecord[]>([])
  const [changeOrders, setChangeOrders] = useState<ChangeOrderRecord[]>([])
  const [comments, setComments] = useState<TaskComment[]>([])
  const [status, setStatus] = useState<'All' | TaskStatus>('All')
  const [viewMode, setViewMode] = useState<ViewMode>('List')
  const [quickFilter, setQuickFilter] = useState<'all' | 'mine' | 'overdue' | 'today' | 'draft'>('all')
  const [search, setSearch] = useState('')
  const [workflowSearch, setWorkflowSearch] = useState('')
  const [showFilterPanel, setShowFilterPanel] = useState(false)
  const [priorityFilter, setPriorityFilter] = useState<'All' | TaskPriority>('All')
  const [sourceFilter, setSourceFilter] = useState<'All' | AssignedTask['source']>('All')
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null)
  const [commentBody, setCommentBody] = useState('')
  const [commentAttachments, setCommentAttachments] = useState<CommentAttachment[]>([])
  const [draggingTaskId, setDraggingTaskId] = useState<number | null>(null)
  const [draggingStageId, setDraggingStageId] = useState<string | null>(null)
  const [stageDragOverId, setStageDragOverId] = useState<string | null>(null)
  const [stageMoveRequest, setStageMoveRequest] = useState<StageMoveRequest | null>(null)
  const [newTaskTitle, setNewTaskTitle] = useState('')
  const [taskFormOpen, setTaskFormOpen] = useState(false)
  const [editingTaskId, setEditingTaskId] = useState<number | null>(null)
  const [projectFilter, setProjectFilter] = useState<number | 'All'>('All')
  const [taskDraft, setTaskDraft] = useState<TaskDraft>({
    title: '',
    description: '',
    assignee: '',
    projectId: '',
    dueDate: new Date().toISOString().slice(0, 10),
    status: 'Open',
    stageId: undefined,
  })
  const [assignee, setAssignee] = useState('All')

  useEffect(() => {
    setTasks(loadStored<AssignedTask[]>(tasksStorageKey, []))
    setProjects(loadStored<ProjectRecord[]>(projectsStorageKey, []))
    setChangeOrders(loadStored<ChangeOrderRecord[]>(changeOrdersStorageKey, []))
    setComments(loadStored<TaskComment[]>(taskCommentsStorageKey, []))
    setCustomColumns(loadStored<CustomColumn[]>(customColumnsStorageKey, []))
    const currentTasks = loadStored<AssignedTask[]>(tasksStorageKey, [])
    const currentAccount = loadStored<AccountRecord>(accountStorageKey, {})
    const currentName = currentAccount.fullName || currentAccount.name
    if (currentName && currentTasks.some(task => task.assignee.toLowerCase() === currentName.toLowerCase())) {
      setAssignee(currentName)
    }
    const pendingView = window.sessionStorage.getItem('flowsys-workspace-pending-view') as ViewMode | null
    if (pendingView) {
      setViewMode(pendingView)
      window.sessionStorage.removeItem('flowsys-workspace-pending-view')
    }
    setStorageReady(true)
  }, [])

  useEffect(() => {
    if (!storageReady) return
    window.localStorage.setItem(tasksStorageKey, JSON.stringify(tasks))
  }, [storageReady, tasks])

  useEffect(() => {
    if (!storageReady) return
    window.localStorage.setItem(projectsStorageKey, JSON.stringify(projects))
  }, [projects, storageReady])

  useEffect(() => {
    if (!storageReady) return
    window.localStorage.setItem(taskCommentsStorageKey, JSON.stringify(comments))
  }, [comments, storageReady])

  const [customColumns, setCustomColumns] = useState<CustomColumn[]>([])
  useEffect(() => {
    if (!storageReady) return
    window.localStorage.setItem(customColumnsStorageKey, JSON.stringify(customColumns))
  }, [customColumns, storageReady])
  const addCustomColumn = (col: CustomColumn) => setCustomColumns(prev => [...prev, col])
  const removeCustomColumn = (id: string) => setCustomColumns(prev => prev.filter(c => c.id !== id))

  const [showSpaceModal, setShowSpaceModal] = useState(false)
  const [spaceName, setSpaceName] = useState('')
  const [spaceDesc, setSpaceDesc] = useState('')
  const [spacePrivate, setSpacePrivate] = useState(false)
  const [showCreateWorkflow, setShowCreateWorkflow] = useState(false)
  const [showAddStage, setShowAddStage] = useState(false)
  const [showNoStageError, setShowNoStageError] = useState(false)

  const createSpace = (opts?: Partial<ProjectRecord> & { name?: string; description?: string; department?: string }) => {
    const name = (opts?.name ?? spaceName).trim()
    if (!name) return
    const newProject: ProjectRecord = {
      id: projects.reduce((m, p) => Math.max(m, p.id), 0) + 1,
      name,
      client: opts?.description ?? spaceDesc,
      location: '',
      department: opts?.department ?? 'No Group',
      description: opts?.description ?? spaceDesc,
      failedReasons: opts?.failedReasons ?? [],
      visibility: opts?.visibility,
      displayOption: opts?.displayOption,
      reviewers: opts?.reviewers ?? [],
      viewerGroups: opts?.viewerGroups,
      creatorGroups: opts?.creatorGroups,
    }
    const updated = [...projects, newProject]
    setProjects(updated)
    window.localStorage.setItem(projectsStorageKey, JSON.stringify(updated))
    setSpaceName('')
    setSpaceDesc('')
    setSpacePrivate(false)
    setShowSpaceModal(false)
  }

  const [account, setAccount] = useState<AccountRecord>({})

  useEffect(() => {
    setAccount(loadStored<AccountRecord>(accountStorageKey, {}))
  }, [])

  const projectById = useMemo(() => new Map(projects.map(project => [project.id, project])), [projects])
  const changeOrderById = useMemo(() => new Map(changeOrders.map(order => [order.id, order])), [changeOrders])
  const assignees = useMemo(() => Array.from(new Set([
    account.fullName,
    account.name,
    ...tasks.map(task => task.assignee),
    ...tasks.flatMap(task => task.assignees || []),
  ].filter(Boolean) as string[])).sort(), [account.fullName, account.name, tasks])
  const people = useMemo(() => {
    const contacts = loadStored<ContactRecord[]>(contactsStorageKey, [])
    const teamMembers = ['Anna', 'Mark', 'Leo', 'John', 'Jane', 'Paul', 'Mike']
    return Array.from(new Set([
      account.fullName,
      account.name,
      ...assignees,
      ...teamMembers,
      ...contacts.map(contact => contact.name),
    ].filter(Boolean) as string[])).sort((a, b) => a.localeCompare(b))
  }, [account.fullName, account.name, assignees])
  const selectedTask = useMemo(() => tasks.find(task => task.id === selectedTaskId) || null, [selectedTaskId, tasks])
  const selectedProject = selectedTask ? projectById.get(selectedTask.projectId) : undefined
  const selectedChangeOrder = selectedTask?.changeOrderId ? changeOrderById.get(selectedTask.changeOrderId) : undefined
  const selectedComments = useMemo(() => comments.filter(comment => comment.taskId === selectedTaskId).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()), [comments, selectedTaskId])
  const currentUserName = account.fullName || account.name || 'James Pandian'
  const myJobs = useMemo(() => tasks.filter(task => taskAssigneeNames(task).includes(currentUserName)), [currentUserName, tasks])

  const filteredTasks = useMemo(() => {
    const term = search.trim().toLowerCase()
    const me = currentUserName
    const now = todayTime()
    return tasks.filter(task => {
      const project = projectById.get(task.projectId)
      const matchesStatus = status === 'All' || task.status === status
      const taskAssignees = taskAssigneeNames(task)
      const matchesAssignee = assignee === 'All' || taskAssignees.includes(assignee)
      const matchesProject = projectFilter === 'All' || task.projectId === projectFilter
      const matchesPriority = priorityFilter === 'All' || task.priority === priorityFilter
      const matchesSource = sourceFilter === 'All' || task.source === sourceFilter
      const haystack = [task.title, task.description, ...taskAssignees, task.source, project?.name, project?.client, project?.location].join(' ').toLowerCase()
      const matchesQuick =
        quickFilter === 'all' ? true
        : quickFilter === 'mine' ? taskAssignees.includes(me)
        : quickFilter === 'overdue' ? (task.status !== 'Completed' && !!task.dueDate && dateTime(task.dueDate) < now)
        : quickFilter === 'today' ? (task.status !== 'Completed' && !!task.dueDate && dateTime(task.dueDate) === now)
        : quickFilter === 'draft' ? !task.dueDate || !task.description.trim()
        : true
      return matchesStatus && matchesAssignee && matchesProject && matchesPriority && matchesSource && matchesQuick && (!term || haystack.includes(term))
    })
  }, [assignee, currentUserName, priorityFilter, projectById, projectFilter, quickFilter, search, sourceFilter, status, tasks])

  const myTasksCount = useMemo(() => {
    return myJobs.length
  }, [myJobs.length])

  const counts = useMemo(() => ({
    all: tasks.length,
    open: tasks.filter(task => task.status === 'Open').length,
    progress: tasks.filter(task => task.status === 'In Progress').length,
    completed: tasks.filter(task => task.status === 'Completed').length,
  }), [tasks])

  const reminderStats = useMemo(() => {
    const openTasks = tasks.filter(task => task.status !== 'Completed')
    return {
      overdue: openTasks.filter(task => task.dueDate && dateTime(task.dueDate) < todayTime()).length,
      today: openTasks.filter(task => task.dueDate && dateTime(task.dueDate) === todayTime()).length,
      upcoming: openTasks.filter(task => !task.dueDate || dateTime(task.dueDate) > todayTime()).length,
    }
  }, [tasks])

  const groupedTasks = useMemo(() => {
    const groups = [
      { title: 'Project Work', color: '#1db954', tasks: filteredTasks.filter(task => task.source !== 'Change Order') },
      { title: 'Client Requests', color: '#1ed760', tasks: filteredTasks.filter(task => task.source === 'Change Order') },
    ].filter(group => group.tasks.length > 0)

    return groups.length ? groups : [{ title: 'All Tasks', color: '#1db954', tasks: filteredTasks }]
  }, [filteredTasks])

  const reminderGroups = useMemo(() => {
    const groups = ['Overdue', 'Today', 'This Week', 'Upcoming', 'Completed']
    return groups
      .map(group => ({
        title: group,
        tasks: filteredTasks.filter(task => dueMeta(task).group === group),
      }))
      .filter(group => group.tasks.length > 0)
  }, [filteredTasks])

  const currentProjectStages = useMemo(() => {
    const project = projectFilter !== 'All' ? projectById.get(projectFilter as number) : undefined
    return getProjectStages(project)
  }, [projectFilter, projectById])

  const stageForTask = (task: AssignedTask, stages: WorkflowStage[]) => {
    if (task.stageId) {
      const assignedStage = stages.find(stage => stage.id === task.stageId)
      if (assignedStage) return assignedStage
    }
    if (task.status === 'Completed') return stages.find(stage => stage.type === 'done') || stages[0]
    if (task.status === 'In Progress') return stages.find(stage => stage.name === 'In Progress') || stages.find(stage => stage.type === 'normal') || stages[0]
    return stages.find(stage => stage.type === 'normal' && !stage.id.startsWith('wf-')) || stages.find(stage => stage.type === 'normal') || stages[0]
  }

  const activeStageMove = useMemo(() => {
    if (!stageMoveRequest) return null
    const task = tasks.find(item => item.id === stageMoveRequest.taskId)
    if (!task) return null
    const project = projectById.get(task.projectId)
    const stages = getProjectStages(project)
    const targetStage = stages.find(stage => stage.id === stageMoveRequest.targetStageId)
    if (!targetStage) return null
    return {
      task,
      project,
      currentStage: stageForTask(task, stages),
      targetStage,
      stages,
    }
  }, [projectById, stageMoveRequest, tasks])

  // Only count user-created stages (default stages have ids prefixed with 'wf-')
  const hasCustomStages = currentProjectStages.some(s => s.type === 'normal' && !s.id.startsWith('wf-'))

  const boardColumns = useMemo(() => currentProjectStages.map(stage => ({
    stage,
    tasks: filteredTasks.filter(task => {
      if (task.stageId) return task.stageId === stage.id
      // Fallback mapping for tasks without stageId
      if (stage.type === 'done')    return task.status === 'Completed'
      if (stage.type === 'failed')  return false
      if (stage.name === 'In Progress') return task.status === 'In Progress'
      if (stage.name === 'Open')    return task.status === 'Open'
      // First user-created stage catches remaining Open tasks
      const userStages = currentProjectStages.filter(s => s.type === 'normal' && !s.id.startsWith('wf-'))
      const firstUserOrder = userStages.length > 0 ? Math.min(...userStages.map(s => s.order)) : Infinity
      return stage.order === firstUserOrder && task.status === 'Open'
    }),
  })), [currentProjectStages, filteredTasks])
  const normalBoardCols   = boardColumns.filter(c => c.stage.type === 'normal')
  const terminalBoardCols = boardColumns.filter(c => c.stage.type !== 'normal')

  /** Block job creation in any view when the selected workflow has no custom stages */
  const guardAddTask = (cb: () => void) => {
    if (projectFilter !== 'All' && !hasCustomStages) { setShowNoStageError(true); return }
    cb()
  }

  const updateTaskStatus = (taskId: number, nextStatus: TaskStatus) => {
    setTasks(previous => previous.map(task => task.id === taskId ? { ...task, status: nextStatus } : task))
  }

  const updateTask = (taskId: number, updates: Partial<AssignedTask>) => {
    setTasks(previous => previous.map(task => task.id === taskId ? { ...task, ...updates } : task))
  }

  const deleteTask = (taskId: number) => {
    setTasks(previous => previous.filter(task => task.id !== taskId))
    setComments(previous => previous.filter(comment => comment.taskId !== taskId))
    if (selectedTaskId === taskId) setSelectedTaskId(null)
    if (editingTaskId === taskId) {
      setEditingTaskId(null)
      setTaskFormOpen(false)
    }
  }

  const softDeleteWorkflow = (id: number) => {
    setProjects(prev => prev.map(p => p.id === id ? { ...p, deleted: true, deletedAt: new Date().toISOString() } : p))
    // If we're currently viewing this workflow, go back to main view
    if (projectFilter === id) { setProjectFilter('All'); setViewMode('Workflows') }
  }

  const restoreWorkflow = (id: number) => {
    setProjects(prev => prev.map(p => p.id === id ? { ...p, deleted: false, deletedAt: undefined } : p))
  }

  const permanentlyDeleteWorkflow = (id: number) => {
    setProjects(prev => prev.filter(p => p.id !== id))
    setTasks(prev => prev.filter(t => t.projectId !== id))
  }

  const addStageToProject = (stageName: string, insertBefore: string = 'done', config?: StageMemberConfig) => {
    if (projectFilter === 'All') return
    const project = projectById.get(projectFilter as number)
    if (!project) return
    const existing = project.stages?.length ? project.stages : DEFAULT_STAGES
    const normalStages = existing.filter(s => s.type === 'normal')
    const selectedStage = normalStages.find(stage => stage.id === insertBefore)
    const doneStageOrder = existing.find(stage => stage.type === 'done')?.order ?? 100
    const maxOrder = Math.max(...existing.map(stage => stage.order), 0)
    const newStage: WorkflowStage = {
      id: `stage-${Date.now()}`,
      name: stageName,
      color: '#7c6af7',
      order: insertBefore === 'done'
        ? doneStageOrder - (normalStages.length + 1) / 10
        : selectedStage
          ? selectedStage.order + 0.1
          : maxOrder + 1,
      type: 'normal',
      owners: config?.owners ?? [],
      workers: config?.workers ?? [],
      defaultFollowers: config?.defaultFollowers ?? [],
      addUserGroupsAsWorkers: config?.addUserGroupsAsWorkers ?? false,
      guideline: config?.guideline ?? '',
      expectedHours: config?.expectedHours ?? '',
      assignmentOption: config?.assignmentOption ?? 'Keep the assignee from previous stage',
      deadlineMode: config?.deadlineMode ?? 'Use automatic deadline (based on stage duration)',
    }
    const updatedStages = [...existing, newStage].sort((a, b) => a.order - b.order)
    const updated = projects.map(p => p.id === projectFilter ? { ...p, stages: updatedStages } : p)
    setProjects(updated)
    window.localStorage.setItem(projectsStorageKey, JSON.stringify(updated))
  }

  const updateTaskStage = (taskId: number, stage: WorkflowStage) => {
    const nextStatus: TaskStatus = stage.type === 'done' ? 'Completed' : stage.type === 'failed' ? 'Completed' : 'In Progress'
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, stageId: stage.id, status: nextStatus } : t))
  }

  const swapWorkflowStages = (sourceStageId: string, targetStageId: string) => {
    if (projectFilter === 'All' || sourceStageId === targetStageId) return
    setProjects(prev => prev.map(project => {
      if (project.id !== projectFilter) return project
      const stages = getProjectStages(project)
      const sourceIndex = stages.findIndex(stage => stage.id === sourceStageId)
      const targetIndex = stages.findIndex(stage => stage.id === targetStageId)
      if (sourceIndex < 0 || targetIndex < 0) return project
      const reordered = [...stages]
      const sourceOrder = reordered[sourceIndex].order
      reordered[sourceIndex] = { ...reordered[sourceIndex], order: reordered[targetIndex].order }
      reordered[targetIndex] = { ...reordered[targetIndex], order: sourceOrder }
      return { ...project, stages: reordered.sort((a, b) => a.order - b.order) }
    }))
  }

  const handleTaskDragStart = (event: DragEvent<HTMLElement>, taskId: number) => {
    setDraggingTaskId(taskId)
    setDraggingStageId(null)
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData('application/x-wiseflow-task', String(taskId))
  }

  const handleStageDragStart = (event: DragEvent<HTMLElement>, stageId: string) => {
    setDraggingStageId(stageId)
    setDraggingTaskId(null)
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData('application/x-wiseflow-stage', stageId)
  }

  const handleStageDragOver = (event: DragEvent<HTMLElement>, stageId: string) => {
    event.preventDefault()
    event.dataTransfer.dropEffect = 'move'
    if (stageDragOverId !== stageId) setStageDragOverId(stageId)
  }

  const handleStageDrop = (event: DragEvent<HTMLElement>, stage: WorkflowStage) => {
    event.preventDefault()
    const droppedStageId = event.dataTransfer.getData('application/x-wiseflow-stage') || draggingStageId
    if (droppedStageId) {
      swapWorkflowStages(droppedStageId, stage.id)
      setDraggingStageId(null)
      setStageDragOverId(null)
      return
    }
    const droppedTaskId = Number(event.dataTransfer.getData('application/x-wiseflow-task') || draggingTaskId)
    if (droppedTaskId) {
      const task = tasks.find(item => item.id === droppedTaskId)
      if (task?.stageId !== stage.id) setStageMoveRequest({ taskId: droppedTaskId, targetStageId: stage.id })
    }
    setDraggingTaskId(null)
    setStageDragOverId(null)
  }

  const renameStage = (stage: WorkflowStage) => {
    if (projectFilter === 'All') return
    if (stage.id.startsWith('wf-')) {
      window.alert('Default Done and Failed stages cannot be renamed.')
      return
    }
    const nextName = window.prompt('Stage name. Type DELETE to remove this stage.', stage.name)?.trim()
    if (!nextName || nextName === stage.name) return
    if (nextName.toUpperCase() === 'DELETE') {
      deleteStageFromWorkflow(stage)
      return
    }
    setProjects(prev => prev.map(project => project.id === projectFilter
      ? { ...project, stages: getProjectStages(project).map(item => item.id === stage.id ? { ...item, name: nextName } : item) }
      : project))
  }

  const deleteStageFromWorkflow = (stage: WorkflowStage) => {
    if (projectFilter === 'All') return
    if (stage.id.startsWith('wf-')) {
      window.alert('Default Done and Failed stages cannot be deleted.')
      return
    }
    const ok = window.confirm(`Delete "${stage.name}"? Jobs in this stage will move back to Open.`)
    if (!ok) return
    setProjects(prev => prev.map(project => project.id === projectFilter
      ? { ...project, stages: getProjectStages(project).filter(item => item.id !== stage.id) }
      : project))
    setTasks(prev => prev.map(task => task.stageId === stage.id ? { ...task, stageId: undefined, status: 'Open' } : task))
  }

  const openTaskForm = (task?: AssignedTask, defaultStatus: TaskStatus = 'Open', defaultProjectId?: number, defaultStageId?: string) => {
    if (task) {
      setEditingTaskId(task.id)
      setTaskDraft({
        title: task.title,
        description: task.description,
        assignee: task.assignee,
        projectId: String(task.projectId || ''),
        dueDate: task.dueDate,
        status: task.status,
        stageId: task.stageId,
      })
    } else {
      const owner = account.fullName || account.name || assignees[0] || 'Team member'
      const firstProject = defaultProjectId
        ? projects.find(project => project.id === defaultProjectId)
        : projectFilter !== 'All' ? projects.find(project => project.id === projectFilter) : projects[0]
      setEditingTaskId(null)
      setTaskDraft({
        title: newTaskTitle,
        description: '',
        assignee: owner,
        projectId: firstProject ? String(firstProject.id) : '',
        dueDate: new Date().toISOString().slice(0, 10),
        status: defaultStatus,
        stageId: defaultStageId,
      })
    }
    setTaskFormOpen(true)
  }

  const saveTaskDraft = () => {
    const title = taskDraft.title.trim()
    if (!title) return
    const projectId = Number(taskDraft.projectId || 0)
    const assigneeName = taskDraft.assignee.trim() || account.fullName || account.name || 'Team member'
    if (editingTaskId) {
      const existingTask = tasks.find(item => item.id === editingTaskId)
      updateTask(editingTaskId, {
        title,
        description: taskDraft.description.trim(),
        assignee: assigneeName,
        assignees: existingTask?.assignee === assigneeName && existingTask.assignees?.length ? existingTask.assignees : [assigneeName],
        projectId,
          dueDate: taskDraft.dueDate,
          status: taskDraft.status,
          stageId: taskDraft.stageId,
      })
    } else {
      setTasks(previous => [
        ...previous,
        {
          id: previous.reduce((max, task) => Math.max(max, task.id), 0) + 1,
          projectId,
          title,
          description: taskDraft.description.trim(),
          assignee: assigneeName,
          assignees: [assigneeName],
          dueDate: taskDraft.dueDate,
          status: taskDraft.status,
          stageId: taskDraft.stageId,
          source: 'Manual',
          createdAt: new Date().toISOString(),
        },
      ])
    }
    setNewTaskTitle('')
    setEditingTaskId(null)
    setTaskFormOpen(false)
  }

  const quickAddTask = () => {
    const title = newTaskTitle.trim()
    if (!title) {
      openTaskForm()
      return
    }
    const firstProject = projectFilter !== 'All' ? projects.find(project => project.id === projectFilter) : projects[0]
    const owner = account.fullName || account.name || assignees[0] || 'Team member'
    const today = new Date().toISOString().slice(0, 10)
    setTasks(previous => [
      ...previous,
      {
        id: previous.reduce((max, task) => Math.max(max, task.id), 0) + 1,
        projectId: firstProject?.id || 0,
        title,
        description: '',
        assignee: owner,
        assignees: [owner],
        dueDate: today,
        status: 'Open',
        stageId: currentProjectStages.find(stage => stage.type === 'normal' && !stage.id.startsWith('wf-'))?.id,
        source: 'Manual',
        createdAt: new Date().toISOString(),
      },
    ])
    setNewTaskTitle('')
  }

  const openNextStageMove = () => {
    const task = filteredTasks.find(item => item.status !== 'Completed') || tasks.find(item => item.status !== 'Completed')
    if (!task) {
      window.alert('No movable job found.')
      return
    }

    const project = projectById.get(task.projectId)
    const stages = getProjectStages(project)
    const currentStage = stageForTask(task, stages)
    const targetStage = stages.find(stage => stage.order > (currentStage?.order ?? -1)) || stages.find(stage => stage.id !== currentStage?.id)

    if (!targetStage) {
      window.alert('No next stage is available for this job.')
      return
    }

    setStageMoveRequest({ taskId: task.id, targetStageId: targetStage.id })
  }

  useEffect(() => {
    const handleSearch = (event: Event) => {
      const detail = (event as CustomEvent<{ value?: string }>).detail
      setSearch(detail?.value || '')
    }
    const handleGeneralSearch = (event: Event) => {
      const detail = (event as CustomEvent<{ value?: string }>).detail
      const value = detail?.value || ''
      setSearch(value)
      setWorkflowSearch(value)
    }
    const handleView = (event: Event) => {
      const mode = (event as CustomEvent<{ mode?: ViewMode }>).detail?.mode
      if (!mode) return
      setViewMode(mode)
      if (mode === 'Workflows') setQuickFilter('all')
    }
    const handleCreateJob = () => guardAddTask(quickAddTask)
    const handleCreateWorkflow = () => {
      setShowCreateWorkflow(true)
      setViewMode('Workflows')
    }
    const handleCreateGroup = () => setShowSpaceModal(true)
    const handleStageMove = () => openNextStageMove()
    window.addEventListener('flowsys-workspace-search', handleSearch)
    window.addEventListener('flowsys-workspace-general-search', handleGeneralSearch)
    window.addEventListener('flowsys-workspace-view', handleView)
    window.addEventListener('flowsys-workspace-create-job', handleCreateJob)
    window.addEventListener('flowsys-workspace-create-workflow', handleCreateWorkflow)
    window.addEventListener('flowsys-workspace-create-group', handleCreateGroup)
    window.addEventListener('flowsys-workspace-stage-move', handleStageMove)
    return () => {
      window.removeEventListener('flowsys-workspace-search', handleSearch)
      window.removeEventListener('flowsys-workspace-general-search', handleGeneralSearch)
      window.removeEventListener('flowsys-workspace-view', handleView)
      window.removeEventListener('flowsys-workspace-create-job', handleCreateJob)
      window.removeEventListener('flowsys-workspace-create-workflow', handleCreateWorkflow)
      window.removeEventListener('flowsys-workspace-create-group', handleCreateGroup)
      window.removeEventListener('flowsys-workspace-stage-move', handleStageMove)
    }
  }, [filteredTasks, guardAddTask, openNextStageMove, projectById, quickAddTask, tasks])

  const confirmStageMove = (assigneeName: string, outputFiles: CommentAttachment[]) => {
    if (!activeStageMove) return
    const { task, targetStage, currentStage } = activeStageMove
    const nextStatus: TaskStatus = targetStage.type === 'done' ? 'Completed' : targetStage.type === 'failed' ? 'Completed' : 'In Progress'
    const nextAssignee = assigneeName.trim() || task.assignee
    setTasks(prev => prev.map(item => item.id === task.id ? {
      ...item,
      stageId: targetStage.id,
      status: nextStatus,
      assignee: nextAssignee,
      assignees: Array.from(new Set([...(item.assignees || []), nextAssignee].filter(Boolean))),
      taskAttachments: outputFiles.length ? [...(item.taskAttachments || []), ...outputFiles] : item.taskAttachments,
    } : item))
    setComments(prev => [
      {
        id: prev.reduce((max, comment) => Math.max(max, comment.id), 0) + 1,
        taskId: task.id,
        author: account.fullName || account.name || 'Team member',
        body: `Moved from ${currentStage?.name || 'Previous stage'} to ${targetStage.name}.`,
        status: nextStatus,
        attachments: outputFiles,
        createdAt: new Date().toISOString(),
      },
      ...prev,
    ])
    setStageMoveRequest(null)
  }

  const readCommentFiles = (files: File[]) => {
    files.forEach(file => {
      const reader = new FileReader()
      reader.onload = () => {
        const dataUrl = reader.result
        if (typeof dataUrl !== 'string') return
        setCommentAttachments(previous => [
          ...previous,
          {
            id: Date.now() + previous.length,
            name: file.name || `Pasted image ${previous.length + 1}`,
            type: file.type,
            dataUrl,
          },
        ])
      }
      reader.readAsDataURL(file)
    })
  }

  const handleCommentFiles = (event: ChangeEvent<HTMLInputElement>) => {
    readCommentFiles(Array.from(event.target.files || []))
    event.target.value = ''
  }

  const handleCommentPaste = (event: ClipboardEvent<HTMLTextAreaElement>) => {
    const files = Array.from(event.clipboardData.files || [])
    if (files.some(file => file.type.startsWith('image/'))) readCommentFiles(files)
  }

  const addComment = () => {
    if (!selectedTask || (!commentBody.trim() && commentAttachments.length === 0)) return
    setComments(previous => [
      {
        id: previous.reduce((max, comment) => Math.max(max, comment.id), 0) + 1,
        taskId: selectedTask.id,
        author: account.fullName || account.name || 'Team member',
        body: commentBody.trim(),
        status: selectedTask.status,
        attachments: commentAttachments,
        createdAt: new Date().toISOString(),
      },
      ...previous,
    ])
    setCommentBody('')
    setCommentAttachments([])
  }

  // Rework-style tab definitions
  const reworkTabs = [
    { key: 'mine' as const,    label: 'Assigned to Me',  count: myTasksCount },
    { key: 'all'  as const,    label: 'All Tasks',        count: counts.all },
    { key: 'overdue' as const, label: 'Overdue',          count: reminderStats.overdue },
    { key: 'today' as const,   label: 'Due Today',        count: reminderStats.today },
  ]

  const statusChips: Array<{ label: string; value: 'All' | TaskStatus }> = [
    { label: 'ALL',         value: 'All' },
    { label: 'ACTIVE',      value: 'In Progress' },
    { label: 'DONE',        value: 'Completed' },
    { label: 'OPEN',        value: 'Open' },
  ]
  const isMyJobsSimpleView = false
  const isMyJobsContentView = viewMode === 'Reminders' && quickFilter === 'mine'

  return (
    <main style={{ maxWidth: 'none', margin: 0, minHeight: 'calc(100vh - 66px)', background: '#111', fontFamily: font, color: '#f5f5f5' }}>
      <section style={{ display: 'grid', gridTemplateColumns: '260px minmax(0, 1fr)', minHeight: 'calc(100vh - 66px)' }}>

        {/* ── Left sidebar ── */}
        <aside style={{ borderRight: '1px solid #1e1e1e', background: '#141414', position: 'sticky', top: 0, height: 'calc(100vh - 66px)', overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>

          {/* User profile block */}
          <div style={{ padding: '18px 16px 14px', borderBottom: '1px solid #1e1e1e' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <Avatar name={account.fullName || account.name || 'U'} size={36} />
              <div style={{ minWidth: 0 }}>
                <div style={{ color: '#f0f0f0', fontSize: 13, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{account.fullName || account.name || 'User'}</div>
                <div style={{ color: '#555', fontSize: 11, fontWeight: 500, marginTop: 1 }}>{(account as { company?: string }).company || 'WiseFlow'}</div>
              </div>
              <button onClick={() => guardAddTask(() => openTaskForm())} title="New task" style={{ marginLeft: 'auto', width: 26, height: 26, borderRadius: '50%', border: '1px solid #2a2a2a', background: '#1e1e1e', color: '#b3b3b3', display: 'grid', placeItems: 'center', cursor: 'pointer', padding: 0, flexShrink: 0 }}>
                <Plus size={14} />
              </button>
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#1e1e1e', border: '1px solid #252525', borderRadius: 8, padding: '7px 11px' }}>
              <Search size={13} color="#555" />
              <input value={workflowSearch} onChange={e => setWorkflowSearch(e.target.value)} placeholder="Search workflows..." style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', color: '#ccc', fontSize: 12, fontFamily: font }} />
            </label>
          </div>

          {/* Personal inbox */}
          <div style={{ padding: '10px 10px 0' }}>
            <div style={sidebarSectionTitleStyle}>Personal</div>
            {[
              { key: 'mine' as const,   label: 'My Jobs',       icon: <BriefcaseBusiness size={15} />, count: myTasksCount,        mode: 'Reminders' as ViewMode },
              { key: 'today' as const,  label: 'My To-dos',     icon: <CalendarDays size={15} />,      count: reminderStats.today, mode: 'Reminders' as ViewMode },
            ].map(item => {
              const active = viewMode === item.mode && (item.mode === 'Workflows' ? true : quickFilter === item.key)
              return (
                <button key={item.key}
                  onClick={() => { setQuickFilter(item.key); setViewMode(item.mode) }}
                  style={{ display: 'flex', alignItems: 'center', gap: 9, width: '100%', padding: '9px 10px', borderRadius: 8, border: 'none', background: active ? '#1db954' : 'transparent', color: active ? '#111' : '#888', cursor: 'pointer', fontSize: 13, fontWeight: active ? 700 : 500, fontFamily: font, marginBottom: 2, transition: 'background 0.12s, color 0.12s' }}
                  onMouseEnter={e => { if (!active) (e.currentTarget as HTMLButtonElement).style.background = '#1e1e1e'; if (!active) (e.currentTarget as HTMLButtonElement).style.color = '#ccc' }}
                  onMouseLeave={e => { if (!active) (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; if (!active) (e.currentTarget as HTMLButtonElement).style.color = '#888' }}
                >
                  <span style={{ flexShrink: 0 }}>{item.icon}</span>
                  <span style={{ flex: 1, textAlign: 'left' }}>{item.label}</span>
                  {item.count > 0 && <span style={{ fontSize: 11, fontWeight: 700, background: active ? 'rgba(0,0,0,0.18)' : '#252525', color: active ? '#111' : '#666', borderRadius: 10, padding: '1px 7px' }}>{item.count}</span>}
                </button>
              )
            })}
          </div>

          <div style={{ height: 1, background: '#1e1e1e', margin: '8px 0' }} />

          {/* Workflows section — grouped by department */}
          <div style={{ padding: '0 10px', flex: 1, overflowY: 'auto' }}>
            <div style={sidebarSectionTitleStyle}>Workflows</div>
            <SidebarGroups
              projects={projects.filter(p => !p.deleted && (!workflowSearch.trim() || [p.name, p.department, p.description, p.client].join(' ').toLowerCase().includes(workflowSearch.trim().toLowerCase())))}
              deletedProjects={projects.filter(p => p.deleted && (!workflowSearch.trim() || [p.name, p.department, p.description, p.client].join(' ').toLowerCase().includes(workflowSearch.trim().toLowerCase())))}
              projectFilter={projectFilter}
              onSelect={id => { setProjectFilter(id); setQuickFilter('all'); setViewMode('Board') }}
              onNew={() => setShowCreateWorkflow(true)}
              onDelete={softDeleteWorkflow}
              onRestore={restoreWorkflow}
              onPermanentDelete={permanentlyDeleteWorkflow}
            />
          </div>
        </aside>

        {/* ── Main content ── */}
        <section style={{ minWidth: 0, display: 'flex', flexDirection: 'column', background: isMyJobsSimpleView || viewMode === 'SystemReport' ? '#f4f4f4' : undefined }}>

          {/* Title row */}
          {!isMyJobsSimpleView && !isMyJobsContentView && viewMode !== 'SystemReport' && <div style={{ padding: '20px 28px 0', background: '#111', borderBottom: 'none' }}>
            {viewMode === 'Workflows' ? (
              /* ── My Workflows header ── */
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 18 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 34, height: 34, borderRadius: 9, background: '#1a2a1a', border: '1px solid #1db95440', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
                    <Layers size={17} color="#1db954" />
                  </div>
                  <div>
                    <h1 style={{ margin: 0, color: '#f0f0f0', fontSize: 20, fontWeight: 800, fontFamily: displayFont, letterSpacing: '-0.02em' }}>My workflows</h1>
                    <div style={{ color: '#555', fontSize: 12, marginTop: 3 }}>All workflows on which you are a member</div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#1a1a1a', border: '1px solid #252525', borderRadius: 8, padding: '7px 12px', cursor: 'text' }}>
                    <Search size={13} color="#555" />
                    <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search workflows" style={{ border: 'none', outline: 'none', background: 'transparent', color: '#ccc', fontSize: 12, fontFamily: font, width: 140 }} />
                  </label>
                  <button onClick={() => setShowCreateWorkflow(true)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', border: 'none', borderRadius: 8, background: '#1db954', color: '#111', fontSize: 12, fontWeight: 700, fontFamily: font, cursor: 'pointer' }}>
                    <Plus size={13} /> Create workflow service
                  </button>
                </div>
              </div>
            ) : (
              /* ── Jobs / board header ── */
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 0 }}>
                  {projectFilter !== 'All' ? (
                    <div style={{ width: 32, height: 32, borderRadius: '50%', background: spaceColor(projects.find(p => p.id === projectFilter)?.name || 'W'), display: 'grid', placeItems: 'center', fontSize: 13, fontWeight: 800, color: '#111', flexShrink: 0, fontFamily: displayFont }}>
                      {(projects.find(p => p.id === projectFilter)?.name || 'W').slice(0, 2).toUpperCase()}
                    </div>
                  ) : (
                    <div style={{ width: 32, height: 32, borderRadius: 8, background: '#1a2a1a', border: '1px solid #1db95440', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
                      <ClipboardList size={16} color="#1db954" />
                    </div>
                  )}
                  <h1 style={{ margin: 0, color: '#f0f0f0', fontSize: 18, fontWeight: 800, fontFamily: displayFont, letterSpacing: '-0.02em' }}>
                    {projectFilter !== 'All' ? (projects.find(p => p.id === projectFilter)?.name || 'Workflow') : quickFilter === 'mine' ? 'My Jobs' : 'All Jobs'}
                  </h1>
                  <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#1a1a1a', border: '1px solid #252525', borderRadius: 8, padding: '7px 12px', cursor: 'text' }}>
                      <Search size={13} color="#555" />
                      <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search jobs" style={{ border: 'none', outline: 'none', background: 'transparent', color: '#ccc', fontSize: 12, fontFamily: font, width: 130 }} />
                    </label>
                    <div style={{ position: 'relative' }}>
                      <button onClick={() => setShowFilterPanel(v => !v)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', border: '1px solid #252525', borderRadius: 8, background: showFilterPanel ? '#242424' : '#1a1a1a', color: '#aaa', fontSize: 12, fontWeight: 600, fontFamily: font, cursor: 'pointer' }}>
                        <Layers size={13} /> Filter
                      </button>
                      {showFilterPanel && (
                        <div style={{ position: 'absolute', top: 38, right: 0, width: 260, background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 10, boxShadow: '0 22px 45px rgba(0,0,0,.45)', padding: 14, zIndex: 30 }}>
                          <div style={{ color: '#e0e0e0', fontSize: 13, fontWeight: 800, marginBottom: 12 }}>Filters</div>
                          <label style={{ display: 'grid', gap: 6, color: '#777', fontSize: 11, fontWeight: 700, marginBottom: 12 }}>
                            Priority
                            <select value={priorityFilter} onChange={e => setPriorityFilter(e.target.value as 'All' | TaskPriority)} style={{ background: '#111', border: '1px solid #2a2a2a', borderRadius: 7, color: '#ccc', padding: '8px 10px', fontFamily: font, outline: 'none' }}>
                              <option value="All">All priorities</option>
                              <option value="Urgent">Urgent</option>
                              <option value="High">High</option>
                              <option value="Normal">Normal</option>
                              <option value="Low">Low</option>
                            </select>
                          </label>
                          <label style={{ display: 'grid', gap: 6, color: '#777', fontSize: 11, fontWeight: 700, marginBottom: 14 }}>
                            Source
                            <select value={sourceFilter} onChange={e => setSourceFilter(e.target.value as 'All' | AssignedTask['source'])} style={{ background: '#111', border: '1px solid #2a2a2a', borderRadius: 7, color: '#ccc', padding: '8px 10px', fontFamily: font, outline: 'none' }}>
                              <option value="All">All sources</option>
                              <option value="Manual">Manual</option>
                              <option value="Change Order">Change Order</option>
                            </select>
                          </label>
                          <button onClick={() => { setPriorityFilter('All'); setSourceFilter('All'); setStatus('All'); setAssignee('All'); setQuickFilter('all') }} style={{ width: '100%', border: '1px solid #2a2a2a', borderRadius: 7, background: 'transparent', color: '#aaa', padding: '8px 0', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: font }}>Reset filters</button>
                        </div>
                      )}
                    </div>
                    <button onClick={() => guardAddTask(quickAddTask)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', border: 'none', borderRadius: 8, background: '#1db954', color: '#111', fontSize: 12, fontWeight: 700, fontFamily: font, cursor: 'pointer' }}>
                      <Plus size={13} /> Create job
                    </button>
                  </div>
                </div>

                {/* Tab bar: BOARD | LIST | TABLE | REPORT */}
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: 0, overflowX: 'auto', marginTop: 10 }}>
                  {([
                    ['Board', 'Board', <Columns3 size={13} />],
                    ['List',  'List',  <ListTodo size={13} />],
                    ['Grid',  'Table', <Grid2X2 size={13} />],
                    ['Reminders', 'Report', <CalendarDays size={13} />],
                  ] as [ViewMode, string, React.ReactNode][]).map(([mode, label, icon]) => {
                    const active = viewMode === mode
                    return (
                      <button key={mode} onClick={() => setViewMode(mode)}
                        style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '9px 16px', border: 'none', borderBottom: active ? '2px solid #1db954' : '2px solid transparent', background: 'transparent', color: active ? '#e0e0e0' : '#555', fontWeight: active ? 700 : 500, fontSize: 12, fontFamily: font, cursor: 'pointer', whiteSpace: 'nowrap', transition: 'color 0.12s, border-color 0.12s' }}
                        onMouseEnter={e => { if (!active) (e.currentTarget as HTMLButtonElement).style.color = '#aaa' }}
                        onMouseLeave={e => { if (!active) (e.currentTarget as HTMLButtonElement).style.color = '#555' }}
                      >
                        {icon}{label.toUpperCase()}
                      </button>
                    )
                  })}
                  {reworkTabs.map(tab => {
                    const active = (viewMode as string) !== 'Workflows' && quickFilter === tab.key && (tab.key === 'overdue' || tab.key === 'today')
                    return (
                      <button key={tab.key}
                        onClick={() => { setQuickFilter(tab.key); if (tab.key === 'overdue' || tab.key === 'today') setViewMode('Reminders') }}
                        style={{ padding: '9px 16px', border: 'none', borderBottom: active ? '2px solid #1db954' : '2px solid transparent', background: 'transparent', color: active ? '#1db954' : '#555', fontWeight: active ? 700 : 500, fontSize: 12, fontFamily: font, cursor: 'pointer', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 5, transition: 'color 0.12s, border-color 0.12s' }}
                        onMouseEnter={e => { if (!active) (e.currentTarget as HTMLButtonElement).style.color = '#aaa' }}
                        onMouseLeave={e => { if (!active) (e.currentTarget as HTMLButtonElement).style.color = '#555' }}
                      >
                        {tab.label.toUpperCase()}
                        {tab.count > 0 && <span style={{ background: active ? '#1db95430' : '#1e1e1e', color: active ? '#1db954' : '#555', borderRadius: 10, padding: '1px 6px', fontSize: 10, fontWeight: 700 }}>{tab.count}</span>}
                      </button>
                    )
                  })}
                </div>
              </>
            )}
          </div>}

          {/* Status chips + view mode row — hidden in Workflows view */}
          {viewMode !== 'Workflows' && viewMode !== 'SystemReport' && !isMyJobsSimpleView && !isMyJobsContentView && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 28px', borderBottom: '1px solid #1e1e1e', background: '#111', flexWrap: 'wrap' }}>
            <span style={{ color: '#444', fontSize: 12, fontWeight: 600, marginRight: 4 }}>
              {filteredTasks.length} job{filteredTasks.length !== 1 ? 's' : ''}
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 2, background: '#1a1a1a', borderRadius: 8, padding: '3px 4px', border: '1px solid #252525' }}>
              {statusChips.map(chip => {
                const active = status === chip.value
                return (
                  <button key={chip.label}
                    onClick={() => setStatus(chip.value)}
                    style={{ padding: '4px 12px', borderRadius: 6, border: 'none', background: active ? '#1db954' : 'transparent', color: active ? '#111' : '#555', fontWeight: 700, fontSize: 11, fontFamily: font, letterSpacing: '0.05em', cursor: 'pointer', transition: 'background 0.12s, color 0.12s' }}>
                    {chip.label}
                  </button>
                )
              })}
            </div>

            {/* Assignee filter */}
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#1a1a1a', border: '1px solid #252525', borderRadius: 8, padding: '5px 10px' }}>
              <Users size={12} color="#555" />
              <select value={assignee} onChange={e => setAssignee(e.target.value)} style={{ border: 'none', outline: 'none', background: 'transparent', color: '#888', fontSize: 12, fontFamily: font, cursor: 'pointer' }}>
                <option value="All">All assignees</option>
                {assignees.map(name => <option key={name}>{name}</option>)}
              </select>
            </label>

            {/* Quick add */}
            <input value={newTaskTitle} onChange={e => setNewTaskTitle(e.target.value)} onKeyDown={e => e.key === 'Enter' && guardAddTask(quickAddTask)} placeholder="Quick add job…" style={{ ...newTaskInputStyle, fontSize: 12, padding: '5px 10px', borderRadius: 8, borderColor: '#252525', background: '#1a1a1a', color: '#ccc' }} />
          </div>
          )}

          <section style={{ padding: isMyJobsSimpleView || isMyJobsContentView ? 0 : viewMode === 'Workflows' || viewMode === 'SystemReport' ? '0' : '16px 0 64px', flex: 1 }}>
            {isMyJobsSimpleView ? (
              <SimpleMyJobsView
                tasks={filteredTasks}
                projectById={projectById}
                status={status}
                search={search}
                onStatus={setStatus}
                onSearch={setSearch}
                onOpen={setSelectedTaskId}
                onCreate={() => guardAddTask(() => openTaskForm())}
                currentUser={account.fullName || account.name || 'Team member'}
              />
            ) : viewMode === 'Reminders' && !isMyJobsContentView && <div style={{ padding: '0 28px 16px' }}><ReminderSummary stats={reminderStats} /></div>}

            {!isMyJobsSimpleView && (viewMode === 'SystemReport' ? (
              <SystemReportView
                projects={projects.filter(project => !project.deleted)}
                tasks={tasks}
                assignees={assignees}
                currentUser={account.fullName || account.name || 'Team member'}
              />
            ) : viewMode === 'Workflows' ? (
              <WorkflowsView
                projects={projects.filter(p => !p.deleted)}
                tasks={tasks}
                onSelectProject={id => { setProjectFilter(id); setViewMode('Board') }}
                onCreateWorkflow={() => setShowCreateWorkflow(true)}
                onDeleteWorkflow={softDeleteWorkflow}
              />
            ) : viewMode === 'Board' ? (
              <div style={{ position: 'relative', paddingBottom: 72 }}>
              <div className="workflow-board-scroll" style={{ display: 'flex', gap: 12, padding: '0 28px 16px', overflowX: 'auto', alignItems: 'flex-start', minHeight: 500 }}>

                {/* ── Normal stage columns (or all columns when no custom stages) ── */}
                {(hasCustomStages ? normalBoardCols : boardColumns).map(({ stage, tasks: stageTasks }) => {
                  const isDone   = stage.type === 'done'
                  const isFailed = stage.type === 'failed'
                  const colBg    = isDone ? 'rgba(29,185,84,0.06)' : isFailed ? 'rgba(239,68,68,0.06)' : '#121212'
                  const headerBg = isDone ? 'rgba(29,185,84,0.1)'  : isFailed ? 'rgba(239,68,68,0.1)'  : 'transparent'
                  const lateCount = stageTasks.filter(t => t.dueDate && dateTime(t.dueDate) < todayTime()).length
                  return (
                    <section
                      key={stage.id}
                      onDragOver={e => handleStageDragOver(e, stage.id)}
                      onDragLeave={e => {
                        if (!e.currentTarget.contains(e.relatedTarget as Node)) setStageDragOverId(null)
                      }}
                      onDrop={e => handleStageDrop(e, stage)}
                      style={{ flexShrink: 0, width: 270, border: `1px solid ${stageDragOverId === stage.id && draggingStageId !== stage.id ? stage.color : '#1e1e1e'}`, borderRadius: 10, background: colBg, overflow: 'hidden', display: 'flex', flexDirection: 'column', opacity: draggingStageId === stage.id ? 0.55 : 1, transition: 'border-color 0.12s, opacity 0.12s, transform 0.12s' }}
                    >
                      {/* Column header */}
                      <div
                        draggable
                        onDragStart={e => handleStageDragStart(e, stage.id)}
                        onDragEnd={() => { setDraggingStageId(null); setStageDragOverId(null) }}
                        title="Drag to switch stage position"
                        style={{ borderTop: `3px solid ${stage.color}`, padding: '12px 14px', background: headerBg, borderBottom: '1px solid #1e1e1e', cursor: draggingStageId === stage.id ? 'grabbing' : 'grab' }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                            <span style={{ color: isDone ? '#1db954' : isFailed ? '#ef4444' : '#e0e0e0', fontSize: 13, fontWeight: 700, letterSpacing: '0.3px' }}>{stage.name}</span>
                            <ChevronDown size={13} color="#444" />
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                            <button onClick={() => guardAddTask(() => openTaskForm(undefined, 'Open', projectFilter !== 'All' ? projectFilter : undefined, stage.id))} style={{ border: 'none', background: 'transparent', color: '#444', cursor: 'pointer', display: 'grid', placeItems: 'center', padding: 4, borderRadius: 5 }} onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.color = '#aaa'} onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.color = '#444'}><Plus size={14} /></button>
                            <button title="Stage options" onClick={() => renameStage(stage)} style={{ border: 'none', background: 'transparent', color: '#444', cursor: 'pointer', display: 'grid', placeItems: 'center', padding: 4, borderRadius: 5 }} onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.color = '#aaa'} onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.color = '#444'}><MoreHorizontal size={14} /></button>
                          </div>
                        </div>
                        <div style={{ color: '#444', fontSize: 11, marginBottom: 8 }}>
                          {stageTasks.length} Jobs · <span style={{ color: lateCount > 0 ? '#ef4444' : '#444' }}>{lateCount} Late</span>
                        </div>
                        {/* Mini progress bar */}
                        <div style={{ height: 3, borderRadius: 2, background: '#1e1e1e', overflow: 'hidden' }}>
                          <div style={{ height: '100%', background: stage.color, width: stageTasks.length > 0 ? '100%' : '0%', borderRadius: 2 }} />
                        </div>
                      </div>
                      {/* Cards */}
                      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8, padding: '10px', minHeight: 260 }}>
                        {stageTasks.map(task => (
                          <TaskCard key={task.id} task={task} project={projectById.get(task.projectId)} onOpen={() => setSelectedTaskId(task.id)} onDragStart={event => handleTaskDragStart(event, task.id)} onComplete={() => updateTaskStatus(task.id, task.status === 'Completed' ? 'Open' : 'Completed')} onEdit={() => openTaskForm(task)} onDelete={() => deleteTask(task.id)} />
                        ))}
                        <button onClick={() => guardAddTask(() => openTaskForm(undefined, 'Open', projectFilter !== 'All' ? projectFilter : undefined, stage.id))} style={{ border: '1px dashed #2a2a2a', background: 'transparent', color: '#444', borderRadius: 9, padding: '10px', fontSize: 13, cursor: 'pointer', transition: 'border-color 0.12s, color 0.12s' }} onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = '#444'; (e.currentTarget as HTMLButtonElement).style.color = '#aaa' }} onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = '#2a2a2a'; (e.currentTarget as HTMLButtonElement).style.color = '#444' }}>+ Add job</button>
                      </div>
                    </section>
                  )
                })}

                {/* ── Terminal columns (Done / Failed) — always rendered last ── */}
                {hasCustomStages && terminalBoardCols.map(({ stage, tasks: stageTasks }) => {
                  const isDone   = stage.type === 'done'
                  const isFailed = stage.type === 'failed'
                  const colBg    = isDone ? 'rgba(29,185,84,0.06)' : isFailed ? 'rgba(239,68,68,0.06)' : '#121212'
                  const headerBg = isDone ? 'rgba(29,185,84,0.1)'  : isFailed ? 'rgba(239,68,68,0.1)'  : 'transparent'
                  const lateCount = stageTasks.filter(t => t.dueDate && dateTime(t.dueDate) < todayTime()).length
                  return (
                    <section
                      key={stage.id}
                      onDragOver={e => handleStageDragOver(e, stage.id)}
                      onDragLeave={e => {
                        if (!e.currentTarget.contains(e.relatedTarget as Node)) setStageDragOverId(null)
                      }}
                      onDrop={e => handleStageDrop(e, stage)}
                      style={{ flexShrink: 0, width: 270, border: `1px solid ${stageDragOverId === stage.id && draggingStageId !== stage.id ? stage.color : '#1e1e1e'}`, borderRadius: 10, background: colBg, overflow: 'hidden', display: 'flex', flexDirection: 'column', opacity: draggingStageId === stage.id ? 0.55 : 1, transition: 'border-color 0.12s, opacity 0.12s, transform 0.12s' }}
                    >
                      <div
                        draggable
                        onDragStart={e => handleStageDragStart(e, stage.id)}
                        onDragEnd={() => { setDraggingStageId(null); setStageDragOverId(null) }}
                        title="Drag to switch stage position"
                        style={{ borderTop: `3px solid ${stage.color}`, padding: '12px 14px', background: headerBg, borderBottom: '1px solid #1e1e1e', cursor: draggingStageId === stage.id ? 'grabbing' : 'grab' }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                            <span style={{ color: isDone ? '#1db954' : isFailed ? '#ef4444' : '#e0e0e0', fontSize: 13, fontWeight: 700, letterSpacing: '0.3px' }}>{stage.name}</span>
                            <ChevronDown size={13} color="#444" />
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                            <button onClick={() => guardAddTask(() => openTaskForm(undefined, 'Open', projectFilter !== 'All' ? projectFilter : undefined, stage.id))} style={{ border: 'none', background: 'transparent', color: '#444', cursor: 'pointer', display: 'grid', placeItems: 'center', padding: 4, borderRadius: 5 }} onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.color = '#aaa'} onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.color = '#444'}><Plus size={14} /></button>
                            <button title="Stage options" onClick={() => renameStage(stage)} style={{ border: 'none', background: 'transparent', color: '#444', cursor: 'pointer', display: 'grid', placeItems: 'center', padding: 4, borderRadius: 5 }} onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.color = '#aaa'} onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.color = '#444'}><MoreHorizontal size={14} /></button>
                          </div>
                        </div>
                        <div style={{ color: '#444', fontSize: 11, marginBottom: 8 }}>
                          {stageTasks.length} Jobs · <span style={{ color: lateCount > 0 ? '#ef4444' : '#444' }}>{lateCount} Late</span>
                        </div>
                        <div style={{ height: 3, borderRadius: 2, background: '#1e1e1e', overflow: 'hidden' }}>
                          <div style={{ height: '100%', background: stage.color, width: stageTasks.length > 0 ? '100%' : '0%', borderRadius: 2 }} />
                        </div>
                      </div>
                      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8, padding: '10px', minHeight: 260 }}>
                        {stageTasks.map(task => (
                          <TaskCard key={task.id} task={task} project={projectById.get(task.projectId)} onOpen={() => setSelectedTaskId(task.id)} onDragStart={event => handleTaskDragStart(event, task.id)} onComplete={() => updateTaskStatus(task.id, task.status === 'Completed' ? 'Open' : 'Completed')} onEdit={() => openTaskForm(task)} onDelete={() => deleteTask(task.id)} />
                        ))}
                        <button onClick={() => guardAddTask(() => openTaskForm(undefined, 'Open', projectFilter !== 'All' ? projectFilter : undefined, stage.id))} style={{ border: '1px dashed #2a2a2a', background: 'transparent', color: '#444', borderRadius: 9, padding: '10px', fontSize: 13, cursor: 'pointer', transition: 'border-color 0.12s, color 0.12s' }} onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = '#444'; (e.currentTarget as HTMLButtonElement).style.color = '#aaa' }} onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = '#2a2a2a'; (e.currentTarget as HTMLButtonElement).style.color = '#444' }}>+ Add job</button>
                      </div>
                    </section>
                  )
                })}

              </div>

              {/* ── Add Stage button — pinned bottom-left of the board ── */}
              <div style={{ position: 'absolute', bottom: 16, left: 28 }}>
                <button
                  onClick={() => setShowAddStage(true)}
                  title="Add Stage"
                  style={{ width: 50, height: 50, borderRadius: '50%', border: 'none', background: '#1db954', cursor: 'pointer', display: 'grid', placeItems: 'center', color: '#fff', boxShadow: '0 4px 14px rgba(29,185,84,0.4)', transition: 'background 0.15s, transform 0.15s, box-shadow 0.15s' }}
                  onMouseEnter={e => { const b = e.currentTarget as HTMLButtonElement; b.style.background = '#17a845'; b.style.transform = 'scale(1.08)'; b.style.boxShadow = '0 6px 20px rgba(29,185,84,0.55)' }}
                  onMouseLeave={e => { const b = e.currentTarget as HTMLButtonElement; b.style.background = '#1db954'; b.style.transform = 'scale(1)'; b.style.boxShadow = '0 4px 14px rgba(29,185,84,0.4)' }}
                >
                  <Plus size={22} />
                </button>
              </div>

              </div>
            ) : filteredTasks.length === 0 ? (
              <div style={{ padding: '24px 28px' }}><EmptyState /></div>
            ) : viewMode === 'Grid' ? (
              <div style={{ padding: '16px 28px', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 14 }}>
                {filteredTasks.map(task => <TaskCard key={task.id} task={task} project={projectById.get(task.projectId)} onOpen={() => setSelectedTaskId(task.id)} onDragStart={event => handleTaskDragStart(event, task.id)} onComplete={() => updateTaskStatus(task.id, task.status === 'Completed' ? 'Open' : 'Completed')} onEdit={() => openTaskForm(task)} onDelete={() => deleteTask(task.id)} />)}
              </div>
            ) : viewMode === 'Reminders' && isMyJobsContentView ? (
              <DarkMyJobsContent
                tasks={myJobs}
                projectById={projectById}
                currentUser={currentUserName}
                onOpen={setSelectedTaskId}
                onStatus={updateTaskStatus}
                onAdd={() => guardAddTask(() => openTaskForm())}
                onWorkflowSelect={id => { setProjectFilter(id); setQuickFilter('all'); setViewMode('Board') }}
              />
            ) : viewMode === 'Reminders' ? (
              <div style={{ padding: '0 28px' }}>
                <RemindersListView
                  groups={reminderGroups}
                  onOpen={setSelectedTaskId}
                  onStatus={updateTaskStatus}
                  onDelete={deleteTask}
                  onAdd={() => guardAddTask(() => openTaskForm())}
                  onTaskUpdate={updateTask}
                />
              </div>
            ) : (
              <ReworkListView
                tasks={filteredTasks}
                projectById={projectById}
                onOpen={setSelectedTaskId}
                onDelete={deleteTask}
                onStatus={updateTaskStatus}
                onTaskUpdate={updateTask}
                onAdd={() => guardAddTask(() => openTaskForm())}
              />
            ))}
          </section>
        </section>
      </section>

      {selectedTask && (
        <TaskDetailModal
          task={selectedTask}
          project={selectedProject}
          changeOrder={selectedChangeOrder}
          comments={selectedComments}
          commentBody={commentBody}
          attachments={commentAttachments}
          onBodyChange={setCommentBody}
          onPaste={handleCommentPaste}
          onFiles={handleCommentFiles}
          onRemoveAttachment={id => setCommentAttachments(previous => previous.filter(file => file.id !== id))}
          onComment={addComment}
          onTaskUpdate={updates => updateTask(selectedTask.id, updates)}
          onTaskDelete={() => deleteTask(selectedTask.id)}
          onTaskEdit={() => openTaskForm(selectedTask)}
          onClose={() => setSelectedTaskId(null)}
          onStatus={next => updateTaskStatus(selectedTask.id, next)}
          people={people}
          customColumns={customColumns}
          onAddCustomColumn={addCustomColumn}
          onRemoveCustomColumn={removeCustomColumn}
        />
      )}
      {activeStageMove && (
        <StageMoveModal
          task={activeStageMove.task}
          currentStage={activeStageMove.currentStage}
          targetStage={activeStageMove.targetStage}
          people={people}
          onClose={() => setStageMoveRequest(null)}
          onMove={confirmStageMove}
        />
      )}
      {taskFormOpen && (
        <TaskFormModal
          draft={taskDraft}
          editing={Boolean(editingTaskId)}
          projects={projects}
          assignees={assignees}
          onChange={setTaskDraft}
          onSave={saveTaskDraft}
          onClose={() => {
            setTaskFormOpen(false)
            setEditingTaskId(null)
          }}
        />
      )}

      {/* No-stage error modal */}
      {showNoStageError && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }} onClick={() => setShowNoStageError(false)}>
          <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 14, padding: '32px 28px 24px', width: 380, boxShadow: '0 24px 64px rgba(0,0,0,0.32)', fontFamily: "'DM Sans', sans-serif", textAlign: 'center' }}>
            {/* Icon */}
            <div style={{ width: 52, height: 52, borderRadius: '50%', background: '#fee2e2', display: 'grid', placeItems: 'center', margin: '0 auto 16px' }}>
              <span style={{ color: '#ef4444', fontSize: 22, fontWeight: 800, lineHeight: 1 }}>!</span>
            </div>
            {/* Title */}
            <p style={{ color: '#1a1a1a', fontSize: 16, fontWeight: 700, margin: '0 0 10px' }}>No Stage Created</p>
            {/* Body */}
            <p style={{ color: '#6b7280', fontSize: 14, margin: '0 0 24px', lineHeight: 1.6 }}>
              Please create a stage in this workflow first before adding a job.
            </p>
            {/* Buttons */}
            <button
              onClick={() => { setShowNoStageError(false); setShowAddStage(true) }}
              style={{ width: '100%', padding: '11px 0', borderRadius: 8, border: 'none', background: '#1db954', color: '#fff', fontWeight: 700, fontSize: 14, cursor: 'pointer', marginBottom: 10, fontFamily: "'DM Sans', sans-serif" }}
            >
              Create Stage
            </button>
            <button
              onClick={() => setShowNoStageError(false)}
              style={{ width: '100%', padding: '11px 0', borderRadius: 8, border: '1px solid #e5e7eb', background: 'transparent', color: '#6b7280', fontWeight: 600, fontSize: 14, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Add Stage modal */}
      {showAddStage && (
        <AddStageModal
          existingStages={currentProjectStages}
          onClose={() => setShowAddStage(false)}
          onSave={(name, insertBefore, config) => { addStageToProject(name, insertBefore, config); setShowAddStage(false) }}
        />
      )}

      {/* Create Workflow modal */}
      {showCreateWorkflow && (
        <CreateWorkflowModal
          onClose={() => setShowCreateWorkflow(false)}
          onSubmit={data => createSpace(data)}
        />
      )}

      {/* Create Space modal (legacy) */}
      {showSpaceModal && (
        <div onClick={() => setShowSpaceModal(false)} style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,.65)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: '#1e1e1e', borderRadius: 14, width: '100%', maxWidth: 460, padding: '28px 28px 24px', boxShadow: '0 24px 60px rgba(0,0,0,.7)', position: 'relative', fontFamily: font }}>
            <button onClick={() => setShowSpaceModal(false)} style={{ position: 'absolute', top: 16, right: 16, border: 'none', background: 'transparent', color: '#b3b3b3', cursor: 'pointer', display: 'grid', placeItems: 'center' }}><X size={18} /></button>
            <div style={{ marginBottom: 20 }}>
              <h2 style={{ margin: 0, color: '#f5f5f5', fontSize: 18, fontWeight: 700, fontFamily: displayFont }}>Create a Space</h2>
              <p style={{ margin: '6px 0 0', color: '#b3b3b3', fontSize: 13, lineHeight: 1.5 }}>A Space represents teams, departments, or groups, each with its own Lists, workflows, and settings.</p>
            </div>
            <div style={{ marginBottom: 18 }}>
              <label style={{ display: 'block', color: '#f5f5f5', fontSize: 13, fontWeight: 700, marginBottom: 8 }}>Icon &amp; name</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 40, height: 40, borderRadius: '50%', background: spaceName.trim() ? spaceColor(spaceName.trim()) : '#282828', display: 'grid', placeItems: 'center', fontSize: 16, fontWeight: 800, color: spaceName.trim() ? '#191414' : '#555', flexShrink: 0, transition: 'background 0.2s', fontFamily: displayFont }}>
                  {spaceName.trim() ? spaceName.trim().charAt(0).toUpperCase() : 'S'}
                </div>
                <input autoFocus value={spaceName} onChange={e => setSpaceName(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && spaceName.trim()) createSpace() }} placeholder="e.g. Marketing, Engineering, HR"
                  style={{ flex: 1, background: '#282828', border: '1px solid #333', borderRadius: 8, color: '#f5f5f5', fontSize: 14, fontFamily: font, padding: '10px 14px', outline: 'none' }}
                  onFocus={e => (e.currentTarget.style.borderColor = '#1db954')} onBlur={e => (e.currentTarget.style.borderColor = '#333')} />
              </div>
            </div>
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', color: '#f5f5f5', fontSize: 13, fontWeight: 700, marginBottom: 8 }}>Description <span style={{ color: '#555', fontWeight: 500 }}>(optional)</span></label>
              <input value={spaceDesc} onChange={e => setSpaceDesc(e.target.value)} style={{ width: '100%', background: '#282828', border: '1px solid #333', borderRadius: 8, color: '#f5f5f5', fontSize: 13, fontFamily: font, padding: '9px 14px', outline: 'none', boxSizing: 'border-box' }}
                onFocus={e => (e.currentTarget.style.borderColor = '#1db954')} onBlur={e => (e.currentTarget.style.borderColor = '#333')} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, paddingBottom: 20, borderBottom: '1px solid #2a2a2a' }}>
              <div>
                <div style={{ color: '#f5f5f5', fontSize: 13, fontWeight: 700 }}>Make Private</div>
                <div style={{ color: '#b3b3b3', fontSize: 12, marginTop: 2 }}>Only you and invited members have access</div>
              </div>
              <button onClick={() => setSpacePrivate(v => !v)} style={{ width: 44, height: 24, borderRadius: 12, border: 'none', background: spacePrivate ? '#1db954' : '#444', cursor: 'pointer', position: 'relative', transition: 'background 0.2s', flexShrink: 0 }}>
                <span style={{ position: 'absolute', top: 3, left: spacePrivate ? 23 : 3, width: 18, height: 18, borderRadius: '50%', background: '#fff', transition: 'left 0.2s' }} />
              </button>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <button onClick={() => setShowSpaceModal(false)} style={{ background: 'transparent', border: 'none', color: '#b3b3b3', fontSize: 13, fontWeight: 700, fontFamily: font, cursor: 'pointer' }}>Use Templates</button>
              <button onClick={() => createSpace()} disabled={!spaceName.trim()} style={{ background: spaceName.trim() ? '#f5f5f5' : '#333', color: spaceName.trim() ? '#191414' : '#555', border: 'none', borderRadius: 8, padding: '10px 24px', fontSize: 13, fontWeight: 700, fontFamily: font, cursor: spaceName.trim() ? 'pointer' : 'not-allowed' }}>Continue</button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}

// ─── Rich-text guideline editor ──────────────────────────────────────────────
function SystemReportView({
  projects,
  tasks,
  assignees,
  currentUser,
}: {
  projects: ProjectRecord[]
  tasks: AssignedTask[]
  assignees: string[]
  currentUser: string
}) {
  const [groupFilter, setGroupFilter] = useState('All')
  const [workflowFilter, setWorkflowFilter] = useState('All')
  const [jobFilter, setJobFilter] = useState('active')
  const [dateFilter, setDateFilter] = useState('Created date')
  const [dateRange, setDateRange] = useState('All dates')
  const groups = Array.from(new Set(projects.map(project => project.department || 'No Group')))
  const visibleProjects = projects.filter(project => (groupFilter === 'All' || (project.department || 'No Group') === groupFilter) && (workflowFilter === 'All' || project.id === Number(workflowFilter)))
  const visibleProjectIds = new Set(visibleProjects.map(project => project.id))
  const visibleTasks = tasks.filter(task => visibleProjectIds.has(task.projectId)).filter(task => jobFilter === 'all' ? true : task.status !== 'Completed')
  const overdueTasks = visibleTasks.filter(task => task.dueDate && dateTime(task.dueDate) < todayTime() && task.status !== 'Completed')
  const doneTasks = visibleTasks.filter(task => task.status === 'Completed')
  const inProgressTasks = visibleTasks.filter(task => task.status === 'In Progress')
  const failedTasks = visibleTasks.filter(task => {
    const project = projects.find(item => item.id === task.projectId)
    const stage = getProjectStages(project).find(item => item.id === task.stageId)
    return stage?.type === 'failed'
  })
  const allMembers = Array.from(new Set([...assignees, ...visibleProjects.flatMap(project => getProjectStages(project).flatMap(stage => [...(stage.owners || []), ...(stage.workers || [])]))].filter(Boolean)))
  const workflowRows = visibleProjects.map(project => {
    const stages = getProjectStages(project)
    const projectTasks = visibleTasks.filter(task => task.projectId === project.id)
    const projectDone = projectTasks.filter(task => task.status === 'Completed').length
    const projectOverdue = projectTasks.filter(task => task.dueDate && dateTime(task.dueDate) < todayTime() && task.status !== 'Completed').length
    return {
      project,
      stages: stages.length,
      workers: new Set(stages.flatMap(stage => stage.workers || [])).size,
      jobs: projectTasks.length,
      inProgress: projectTasks.filter(task => task.status === 'In Progress').length,
      overdue: projectOverdue,
      done: projectDone,
      failed: projectTasks.filter(task => stages.find(stage => stage.id === task.stageId)?.type === 'failed').length,
      hours: projectTasks.reduce((sum, task) => sum + (task.timeTracked || 0), 0),
    }
  })
  const memberRows = allMembers.map(member => {
    const assigned = visibleTasks.filter(task => taskAssigneeNames(task).includes(member))
    const done = assigned.filter(task => task.status === 'Completed')
    const overdue = assigned.filter(task => task.dueDate && dateTime(task.dueDate) < todayTime() && task.status !== 'Completed')
    return {
      member,
      assigned: assigned.length,
      done: done.length,
      overdue: overdue.length,
      inProgress: assigned.filter(task => task.status === 'In Progress').length,
      failed: assigned.filter(task => failedTasks.includes(task)).length,
      movedBack: assigned.filter(task => task.status === 'Open' && task.createdAt).length,
      hours: assigned.reduce((sum, task) => sum + (task.timeTracked || 0), 0),
    }
  })
  const exportCsv = (rows: Array<Record<string, string | number>>, filename: string) => {
    const headers = Object.keys(rows[0] || { empty: 'No data' })
    const csv = [headers.join(','), ...rows.map(row => headers.map(header => JSON.stringify(row[header] ?? '')).join(','))].join('\n')
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    link.click()
    URL.revokeObjectURL(url)
  }
  const topDone = [...workflowRows].sort((a, b) => b.done - a.done).slice(0, 5)
  const topOverdue = [...workflowRows].sort((a, b) => b.overdue - a.overdue).slice(0, 5)

  return (
    <div style={{ background: '#f4f4f4', color: '#1b1b1b', minHeight: 'calc(100vh - 42px)', fontFamily: font, overflowX: 'auto' }}>
      <div style={{ minWidth: 980 }}>
        <header style={{ height: 54, borderBottom: '1px solid #ddd', background: '#fff', display: 'flex', alignItems: 'center', padding: '0 22px', gap: 12 }}>
          <span style={{ width: 24, height: 24, borderRadius: 3, background: '#8b8b8b', color: '#fff', display: 'grid', placeItems: 'center' }}><BarChart3 size={16} /></span>
          <h1 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: '#111' }}>System report</h1>
        </header>

        <div style={{ maxWidth: 1120, margin: '0 auto', padding: '22px 20px 70px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, minmax(150px, 1fr))', gap: 12, marginBottom: 28 }}>
            <ReportSelect value={groupFilter} onChange={setGroupFilter} options={[['All', 'View all service groups'], ...groups.map(group => [group, group] as [string, string])]} />
            <ReportSelect value={workflowFilter} onChange={setWorkflowFilter} options={[['All', 'View all workflows'], ...projects.map(project => [String(project.id), project.name] as [string, string])]} />
            <ReportSelect value={jobFilter} onChange={setJobFilter} options={[['active', 'All jobs exclude archive...'], ['all', 'All jobs include archive...']]} />
            <ReportSelect value={dateFilter} onChange={setDateFilter} options={[['Created date', 'Filter by: Created date'], ['Deadline', 'Filter by: Deadline']]} />
            <ReportSelect value={dateRange} onChange={setDateRange} options={[['All dates', 'Select Date Filter'], ['Today', 'Today'], ['This week', 'This week'], ['This month', 'This month']]} />
          </div>

          <ReportSectionTitle>Overview</ReportSectionTitle>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(180px, 1fr))', gap: 12, marginBottom: 28 }}>
            <ReportMetric title="Groups" value={groups.length} lines={[['#c94242', `${projects.filter(project => !project.department || project.department === 'No Group').length} workflows with no group`]]} />
            <ReportMetric title="Workflows" value={visibleProjects.length} lines={[['#16a34a', `${visibleProjects.length} Active`], ['#c94242', '0 Closed']]} />
            <ReportMetric title="Jobs" value={visibleTasks.length} lines={[['#16a34a', `${visibleTasks.filter(task => task.assignee).length} assigned`], ['#e11d48', `${visibleTasks.filter(task => !task.assignee).length} unassigned`]]} />
            <ReportMetric title="Members" value={allMembers.length || 1} lines={[['#f59e0b', `${visibleProjects.flatMap(project => getProjectStages(project).flatMap(stage => stage.owners || [])).length} Workflow owners`], ['#2f80ed', `${visibleProjects.flatMap(project => getProjectStages(project).flatMap(stage => stage.owners || [])).length} Stage owners`], ['#8b83e6', `${visibleProjects.flatMap(project => getProjectStages(project).flatMap(stage => stage.workers || [])).length} Stage workers`]]} />
          </div>

          <ReportSectionTitle>Workflows report</ReportSectionTitle>
          <div style={{ display: 'grid', gridTemplateColumns: '1.05fr 1fr 1fr', gap: 12, marginBottom: 18 }}>
            <ReportCard title="Jobs status">
              <div style={{ display: 'grid', placeItems: 'center', minHeight: 260 }}>
                <div style={{ width: 132, height: 132, borderRadius: '50%', border: '15px solid #2f80ed', display: 'grid', placeItems: 'center', color: '#111', fontWeight: 900, fontSize: 24 }}>
                  <span style={{ textAlign: 'center' }}>{visibleTasks.length}<span style={{ display: 'block', color: '#aaa', fontSize: 11, marginTop: 3 }}>JOBS</span></span>
                </div>
                <ReportLegend rows={[[ '#2f80ed', `${inProgressTasks.length} In progress` ], [ '#f59e0b', `${overdueTasks.length} Overdue` ], [ '#16a34a', `${doneTasks.length} Done` ], [ '#e11d48', `${failedTasks.length} Failed` ]]} />
              </div>
            </ReportCard>
            <ReportRankCard title="Workflows with most jobs done" rows={topDone.map(row => ({ name: row.project.name, sub: `${row.done}/${row.jobs} jobs done`, percent: row.jobs ? Math.round(row.done / row.jobs * 100) : 0 }))} />
            <ReportRankCard title="Workflows with most jobs overdue" rows={topOverdue.map(row => ({ name: row.project.name, sub: `${row.overdue}/${row.jobs} jobs overdue`, percent: row.jobs ? Math.round(row.overdue / row.jobs * 100) : 0 }))} />
          </div>

          <ReportTable
            title="All workflows statistics"
            onExport={() => exportCsv(workflowRows.map(row => ({ workflow: row.project.name, stages: row.stages, workers: row.workers, jobs: row.jobs, inProgress: row.inProgress, overdue: row.overdue, done: row.done, failed: row.failed, totalHours: row.hours.toFixed(2) })), 'workflow-statistics.csv')}
            headers={['Workflow', 'Stages', 'Workers', 'Jobs', 'In progress', 'Overdue', 'Done', 'Failed', 'Total spent']}
            rows={workflowRows.map(row => [row.project.name, row.stages, row.workers, row.jobs, row.inProgress, row.overdue, row.done, row.failed, `${row.hours.toFixed(2)} h`])}
          />

          <ReportSectionTitle>Members report</ReportSectionTitle>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(220px, 1fr))', gap: 12, marginBottom: 18 }}>
            <ReportMemberCard title="Top workers" rows={memberRows.sort((a, b) => b.done - a.done).slice(0, 4)} sub={member => `${member.done}/${member.assigned || 1} times done on time`} />
            <ReportMemberCard title="Top assigned" rows={memberRows.sort((a, b) => b.assigned - a.assigned).slice(0, 4)} sub={member => `${member.assigned} assigned times`} />
            <ReportMemberCard title="Top delayed" rows={memberRows.sort((a, b) => b.overdue - a.overdue).slice(0, 4)} sub={member => `${member.overdue} overdue times · 0 done late times`} />
          </div>

          <ReportTable
            title="All members statistics"
            onExport={() => exportCsv(memberRows.map(row => ({ assignee: row.member, assigned: row.assigned, doneOnTime: row.done, doneLate: 0, inProgress: row.inProgress, overdue: row.overdue, markFailed: row.failed, moveBack: row.movedBack, avgDuration: row.assigned ? (row.hours / row.assigned).toFixed(2) : '0.00' })), 'member-statistics.csv')}
            headers={['Assignee', 'Assigned times', 'Done on time', 'Done late', 'In progress', 'Overdue', 'Mark failed', 'Move back', 'Avg duration']}
            rows={(memberRows.length ? memberRows : [{ member: currentUser, assigned: 0, done: 0, overdue: 0, inProgress: 0, failed: 0, movedBack: 0, hours: 0 }]).map(row => [row.member, row.assigned, row.done, 0, row.inProgress, row.overdue, row.failed, row.movedBack, `${row.assigned ? (row.hours / row.assigned).toFixed(2) : '0.00'} h`])}
          />
        </div>
      </div>
    </div>
  )
}

function ReportSelect({ value, onChange, options }: { value: string; onChange: (value: string) => void; options: [string, string][] }) {
  return <select value={value} onChange={event => onChange(event.target.value)} style={{ height: 35, border: '1px solid #d7d7d7', borderRadius: 3, background: '#fff', color: '#222', padding: '0 10px', fontSize: 12, fontWeight: 600, outline: 'none' }}>{options.map(([optionValue, label]) => <option key={optionValue} value={optionValue}>{label}</option>)}</select>
}

function ReportSectionTitle({ children }: { children: ReactNode }) {
  return <div style={{ color: '#aaa', fontSize: 11, fontWeight: 900, textTransform: 'uppercase', margin: '0 0 10px' }}>{children}</div>
}

function ReportMetric({ title, value, lines }: { title: string; value: number; lines: [string, string][] }) {
  return <ReportCard title={title}><div style={{ fontSize: 24, fontWeight: 900, color: '#111', marginBottom: 14 }}>{value}</div><ReportLegend rows={lines} /></ReportCard>
}

function ReportCard({ title, children }: { title: string; children: ReactNode }) {
  return <section style={{ background: '#fff', border: '1px solid #ddd', borderRadius: 3, boxShadow: '0 1px 4px rgba(0,0,0,.07)', minHeight: 120 }}><div style={{ borderBottom: '1px solid #e8e8e8', padding: '12px 14px', color: '#555', fontSize: 12, fontWeight: 900, textTransform: 'uppercase' }}>{title}</div><div style={{ padding: 14 }}>{children}</div></section>
}

function ReportLegend({ rows }: { rows: [string, string][] }) {
  return <div style={{ display: 'grid', gap: 8 }}>{rows.map(([color, label]) => <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#333', fontSize: 12, fontWeight: 600 }}><span style={{ width: 9, height: 9, borderRadius: '50%', background: color }} />{label}</div>)}</div>
}

function ReportRankCard({ title, rows }: { title: string; rows: { name: string; sub: string; percent: number }[] }) {
  return <ReportCard title={title}><div style={{ display: 'grid' }}>{rows.map(row => <div key={row.name} style={{ display: 'grid', gridTemplateColumns: '28px minmax(0, 1fr) 42px', alignItems: 'center', gap: 10, padding: '10px 0', borderBottom: '1px solid #eee' }}><ClipboardList size={18} color="#777" /><div style={{ minWidth: 0 }}><div style={{ color: '#111', fontSize: 13, fontWeight: 800, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{row.name}</div><div style={{ color: '#777', fontSize: 12 }}>{row.sub}</div></div><span style={{ width: 36, height: 36, borderRadius: '50%', border: '3px solid #ddd', display: 'grid', placeItems: 'center', color: '#555', fontSize: 11, fontWeight: 900 }}>{row.percent}%</span></div>)}</div></ReportCard>
}

function ReportMemberCard({ title, rows, sub }: { title: string; rows: { member: string; assigned: number; done: number; overdue: number }[]; sub: (row: { member: string; assigned: number; done: number; overdue: number }) => string }) {
  return <ReportCard title={title}><div style={{ display: 'grid' }}>{rows.map(row => <div key={row.member} style={{ display: 'grid', gridTemplateColumns: '34px minmax(0, 1fr) 42px', alignItems: 'center', gap: 10, padding: '9px 0', borderBottom: '1px solid #eee' }}><Avatar name={row.member} size={28} /><div><div style={{ color: '#111', fontSize: 13, fontWeight: 800 }}>{row.member}</div><div style={{ color: '#777', fontSize: 12 }}>{sub(row)}</div></div><span style={{ width: 34, height: 34, borderRadius: '50%', border: '3px solid #ddd', display: 'grid', placeItems: 'center', color: '#555', fontSize: 11, fontWeight: 900 }}>{row.assigned ? Math.round(row.done / row.assigned * 100) : 0}%</span></div>)}</div></ReportCard>
}

function ReportTable({ title, headers, rows, onExport }: { title: string; headers: string[]; rows: Array<Array<string | number>>; onExport: () => void }) {
  return <section style={{ background: '#fff', border: '1px solid #ddd', borderRadius: 3, boxShadow: '0 1px 4px rgba(0,0,0,.07)', marginBottom: 28, overflow: 'hidden' }}><div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #e8e8e8', padding: '11px 14px', color: '#555', fontSize: 12, fontWeight: 900, textTransform: 'uppercase' }}><span>{title}</span><button onClick={onExport} style={{ border: 'none', background: 'transparent', color: '#168c96', fontSize: 12, fontWeight: 800, cursor: 'pointer' }}>Export excel</button></div><div style={{ overflowX: 'auto' }}><table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 860 }}><thead><tr>{headers.map(header => <th key={header} style={{ padding: '11px 14px', background: '#f7f7f7', color: '#333', fontSize: 11, fontWeight: 900, textAlign: 'left', borderBottom: '1px solid #eee', whiteSpace: 'nowrap' }}>{header}</th>)}</tr></thead><tbody>{rows.map((row, rowIndex) => <tr key={rowIndex}>{row.map((cell, index) => <td key={`${rowIndex}-${index}`} style={{ padding: '12px 14px', borderBottom: '1px solid #eee', color: index === 0 ? '#168c96' : '#111', fontSize: 12, fontWeight: index === 0 ? 800 : 600, whiteSpace: 'nowrap' }}>{cell}</td>)}</tr>)}</tbody></table></div></section>
}

function StageMoveModal({
  task,
  currentStage,
  targetStage,
  people,
  onClose,
  onMove,
}: {
  task: AssignedTask
  currentStage?: WorkflowStage
  targetStage: WorkflowStage
  people: string[]
  onClose: () => void
  onMove: (assignee: string, outputFiles: CommentAttachment[]) => void
}) {
  const [assignee, setAssignee] = useState(task.assignee || people[0] || '')
  const [files, setFiles] = useState<CommentAttachment[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)
  const sourceStageName = currentStage?.name || 'Previous stage'
  const requiredLabel = `${sourceStageName} output`
  const duration = currentStage?.expectedHours ? `${currentStage.expectedHours}h 0m` : '3d 0h 0m'
  const todos = [
    ...(task.subtasks || []).map(item => ({ id: `sub-${item.id}`, title: item.title, done: item.done, assignee: task.assignee })),
    ...(task.checklists || []).flatMap(checklist => checklist.items.map(item => ({ id: `check-${checklist.id}-${item.id}`, title: item.text, done: item.done, assignee: task.assignee }))),
  ]
  const visibleTodos = todos.length ? todos : [
    { id: 'stage-output', title: `Complete ${sourceStageName}`, done: true, assignee: task.assignee },
    { id: 'next-owner', title: `Prepare ${targetStage.name}`, done: false, assignee: assignee || task.assignee },
  ]

  const readFiles = (picked: File[]) => {
    picked.forEach(file => {
      const reader = new FileReader()
      reader.onload = () => {
        const dataUrl = reader.result
        if (typeof dataUrl !== 'string') return
        setFiles(prev => [...prev, { id: Date.now() + prev.length, name: file.name, type: file.type, dataUrl }])
      }
      reader.readAsDataURL(file)
    })
  }

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 1200, background: 'rgba(0,0,0,.68)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, fontFamily: font }}>
      <div onClick={event => event.stopPropagation()} style={{ width: 'min(800px, calc(100vw - 40px))', maxHeight: 'calc(100vh - 44px)', overflowY: 'auto', background: '#fff', border: '1px solid #cfd7de', borderRadius: 8, boxShadow: '0 24px 80px rgba(0,0,0,.45)', color: '#00304d' }}>
        <div style={{ padding: '18px 20px 28px' }}>
          <h2 style={{ margin: 0, color: '#10b600', fontSize: 24, lineHeight: 1.25, fontWeight: 500, textAlign: 'center' }}>Move job to the next stage</h2>
          <p style={{ margin: '6px 0 26px', color: '#0f2738', fontSize: 14, textAlign: 'center' }}>
            Please complete the following before moving the job <strong>{task.title}</strong> to <strong>{targetStage.name}</strong>.
          </p>

          <label style={{ display: 'block', border: '1px solid #c9d4dc', borderRadius: 2, background: '#fff', padding: '7px 14px 8px', marginBottom: 15, position: 'relative' }}>
            <span style={{ display: 'block', color: '#00304d', fontSize: 13, fontWeight: 700, marginBottom: 4 }}>Reassigned to <span style={{ color: '#d82f2f' }}>*</span></span>
            <select value={assignee} onChange={event => setAssignee(event.target.value)} style={{ width: '100%', border: 'none', outline: 'none', background: 'transparent', color: assignee ? '#0f2738' : '#8a98a5', fontSize: 14, fontFamily: font, appearance: 'none', padding: 0 }}>
              <option value="">Please select</option>
              {people.map(name => <option key={name} value={name}>{name}</option>)}
            </select>
            <ChevronDown size={16} color="#8a98a5" style={{ position: 'absolute', right: 12, top: 31, pointerEvents: 'none' }} />
          </label>

          <div style={{ border: '1px solid #c9d4dc', borderRadius: 2, background: '#fff', padding: '8px 14px', marginBottom: 30, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ color: '#00304d', fontSize: 13, fontWeight: 700, marginBottom: 6 }}>Duration</div>
              <div style={{ color: '#0f2738', fontSize: 14 }}>{duration}</div>
            </div>
            <Lock size={17} color="#4c7893" />
          </div>

          <div style={{ borderTop: '1px solid #c9d4dc', paddingTop: 17, marginBottom: 30 }}>
            <div style={{ textAlign: 'center', color: '#00304d', fontSize: 13, fontWeight: 800, textTransform: 'uppercase', marginBottom: 14 }}>
              OUTPUT FOR STAGE <span style={{ background: '#e0f3ff', border: '1px solid #97cbea', color: '#004d78', borderRadius: 4, padding: '3px 7px', marginLeft: 4, fontSize: 12 }}>{sourceStageName}</span>
            </div>
            <div style={{ border: '1px solid #c9d4dc', borderRadius: 2, background: '#fff', padding: 16 }}>
              <div style={{ color: '#00304d', fontSize: 14, marginBottom: 20 }}>{requiredLabel} <span style={{ color: '#d82f2f' }}>*</span></div>
              {files.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14 }}>
                  {files.map(file => (
                    <div key={file.id} style={{ display: 'flex', alignItems: 'center', gap: 10, border: '1px solid #d9e1e7', borderRadius: 2, height: 36, padding: '0 10px', color: '#0f2738', fontSize: 14 }}>
                      <Paperclip size={14} color="#0b6fb3" />
                      <span style={{ flex: 1, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{file.name}</span>
                      <span style={{ background: '#c9c9c9', color: '#fff', borderRadius: 9, padding: '2px 7px', fontSize: 10, fontWeight: 800 }}>EXISTING</span>
                      <button onClick={() => setFiles(prev => prev.filter(item => item.id !== file.id))} style={{ border: 'none', background: 'transparent', color: '#546a78', cursor: 'pointer', display: 'grid', placeItems: 'center', padding: 0 }}>
                        <X size={17} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <input ref={fileInputRef} type="file" multiple onChange={event => { readFiles(Array.from(event.target.files || [])); event.target.value = '' }} style={{ display: 'none' }} />
              <button onClick={() => fileInputRef.current?.click()} style={{ border: 'none', borderRadius: 2, background: '#e3f5f8', color: '#00708f', fontSize: 13, fontWeight: 700, padding: '9px 15px', cursor: 'pointer', fontFamily: font }}>
                Choose file
              </button>
            </div>
          </div>

          <div style={{ borderTop: '1px solid #c9d4dc', paddingTop: 17, marginBottom: 30 }}>
            <div style={{ textAlign: 'center', color: '#00304d', fontSize: 13, fontWeight: 800, textTransform: 'uppercase', marginBottom: 13 }}>PENDING TO-DOS AT PREVIOUS STAGES</div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {visibleTodos.map((item, index) => (
                <div key={item.id} style={{ borderBottom: index === visibleTodos.length - 1 ? 'none' : '1px dotted #d3dce2', padding: '11px 0', display: 'grid', gridTemplateColumns: '22px minmax(0, 1fr) 22px', gap: 10, alignItems: 'center' }}>
                  <span style={{ width: 20, height: 20, borderRadius: '50%', border: item.done ? 'none' : '1px solid #c5d0d8', background: item.done ? '#12b80b' : '#fff', color: '#fff', display: 'grid', placeItems: 'center' }}>
                    {item.done && <Check size={14} />}
                  </span>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ color: '#00304d', fontSize: 14, marginBottom: 4, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{item.title}</div>
                    <div style={{ color: '#7a8790', fontSize: 12 }}>
                      <span style={{ display: 'inline-block', minWidth: 42, textAlign: 'center', background: item.done ? '#19bd16' : '#cfeeff', color: item.done ? '#fff' : '#0981b3', borderRadius: 8, padding: '2px 7px', fontSize: 10, fontWeight: 800, marginRight: 7 }}>{item.done ? 'DONE' : 'DOING'}</span>
                      Assigned to {item.assignee || 'Team member'} &middot; No deadline
                    </div>
                  </div>
                  <Avatar name={item.assignee || task.assignee || 'U'} size={20} />
                </div>
              ))}
            </div>
          </div>

          <div style={{ borderTop: '1px solid #c9d4dc', paddingTop: 30 }}>
            <button onClick={() => onMove(assignee, files)} disabled={!assignee} style={{ width: '100%', height: 40, border: 'none', borderRadius: 2, background: assignee ? '#18b400' : '#9bcc91', color: '#fff', fontSize: 14, fontWeight: 800, cursor: assignee ? 'pointer' : 'not-allowed', fontFamily: font }}>
              Move to next stage
            </button>
            <button onClick={onClose} style={{ width: '100%', border: 'none', background: 'transparent', color: '#777', fontSize: 16, padding: '18px 0 0', cursor: 'pointer', fontFamily: font }}>
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function GuidelineEditor({
  initialValue = '',
  onChange,
  placeholder = 'Write here…',
  minRows = 4,
  borderColor = '#e0e0e0',
}: {
  initialValue?: string
  onChange: (html: string) => void
  placeholder?: string
  minRows?: number
  borderColor?: string
}) {
  const editorRef    = useRef<HTMLDivElement>(null)
  const fgColorRef   = useRef<HTMLInputElement>(null)
  const bgColorRef   = useRef<HTMLInputElement>(null)
  const f = "'DM Sans', sans-serif"

  useEffect(() => {
    if (editorRef.current) editorRef.current.innerHTML = initialValue
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const emit = () => onChange(editorRef.current?.innerHTML ?? '')

  const exec = (cmd: string, arg?: string) => {
    editorRef.current?.focus()
    document.execCommand(cmd, false, arg)
    emit()
  }

  const insertLink = () => {
    editorRef.current?.focus()
    const url = window.prompt('Enter URL (include https://):')
    if (!url) return
    document.execCommand('createLink', false, url)
    // open in new tab
    const sel = window.getSelection()
    const node = sel?.anchorNode?.parentElement
    if (node?.tagName === 'A') (node as HTMLAnchorElement).target = '_blank'
    emit()
  }

  const insertImage = () => {
    const url = window.prompt('Enter image URL:')
    if (url) exec('insertImage', url)
  }

  const Sep = () => <div style={{ width: 1, height: 18, background: '#ddd', margin: '0 3px', alignSelf: 'center', flexShrink: 0 }} />

  const Btn = ({ icon, title, action }: { icon: ReactNode; title: string; action: () => void }) => (
    <button
      title={title}
      onMouseDown={e => { e.preventDefault(); action() }}
      style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#555', display: 'grid', placeItems: 'center', width: 26, height: 26, borderRadius: 4, transition: 'background 0.1s, color 0.1s', flexShrink: 0 }}
      onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = '#e8e8e8'; (e.currentTarget as HTMLButtonElement).style.color = '#111' }}
      onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; (e.currentTarget as HTMLButtonElement).style.color = '#555' }}
    >{icon}</button>
  )

  return (
    <div style={{ border: `1.5px solid ${borderColor}`, borderRadius: 7, overflow: 'hidden' }}>
      {/* ── Toolbar ── */}
      <div style={{ padding: '4px 8px', borderBottom: '1px solid #eee', display: 'flex', alignItems: 'center', gap: 1, background: '#fafafa', flexWrap: 'wrap' }}>

        {/* Group 1 — inline formatting */}
        <Btn icon={<Bold size={13} />}          title="Bold"          action={() => exec('bold')} />
        <Btn icon={<Italic size={13} />}        title="Italic"        action={() => exec('italic')} />
        <Btn icon={<Underline size={13} />}     title="Underline"     action={() => exec('underline')} />
        <Btn icon={<Strikethrough size={13} />} title="Strikethrough" action={() => exec('strikeThrough')} />

        <Sep />

        {/* Group 2 — headings + lists */}
        <Btn icon={<Heading1 size={14} />}     title="Heading 1"      action={() => exec('formatBlock', 'H1')} />
        <Btn icon={<Heading2 size={14} />}     title="Heading 2"      action={() => exec('formatBlock', 'H2')} />
        <Btn icon={<ListOrdered size={13} />}  title="Ordered list"   action={() => exec('insertOrderedList')} />
        <Btn icon={<List size={13} />}         title="Bullet list"    action={() => exec('insertUnorderedList')} />

        <Sep />

        {/* Group 3 — alignment + block */}
        <Btn icon={<AlignJustify size={13} />} title="Justify"    action={() => exec('justifyFull')} />
        <Btn icon={<Quote size={13} />}        title="Blockquote" action={() => exec('formatBlock', 'BLOCKQUOTE')} />
        <Btn icon={<Code size={13} />}         title="Code block" action={() => exec('formatBlock', 'PRE')} />
        <Btn icon={<Link size={13} />}         title="Insert link"  action={insertLink} />
        <Btn icon={<Image size={13} />}        title="Insert image" action={insertImage} />

        <Sep />

        {/* Group 4 — color + clear */}
        <div style={{ position: 'relative', display: 'inline-flex' }}>
          <Btn icon={<Baseline size={13} />} title="Text color" action={() => fgColorRef.current?.click()} />
          <input ref={fgColorRef} type="color" defaultValue="#000000"
            style={{ position: 'absolute', opacity: 0, width: 0, height: 0, pointerEvents: 'none' }}
            onChange={e => { editorRef.current?.focus(); document.execCommand('foreColor', false, e.target.value); emit() }}
          />
        </div>
        <div style={{ position: 'relative', display: 'inline-flex' }}>
          <Btn icon={<Highlighter size={13} />} title="Highlight color" action={() => bgColorRef.current?.click()} />
          <input ref={bgColorRef} type="color" defaultValue="#ffff00"
            style={{ position: 'absolute', opacity: 0, width: 0, height: 0, pointerEvents: 'none' }}
            onChange={e => { editorRef.current?.focus(); document.execCommand('hiliteColor', false, e.target.value); emit() }}
          />
        </div>
        <Btn icon={<RemoveFormatting size={13} />} title="Clear formatting" action={() => exec('removeFormat')} />
      </div>

      {/* ── Editable area ── */}
      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        onInput={emit}
        data-placeholder={placeholder}
        style={{ minHeight: minRows * 26, padding: '12px', fontSize: 13, color: '#333', outline: 'none', fontFamily: f, lineHeight: 1.65, background: '#fff' }}
      />
      <style>{`
        [data-placeholder]:empty:before { content: attr(data-placeholder); color: #bbb; pointer-events: none; }
        [contenteditable] blockquote { border-left: 3px solid #ccc; margin: 4px 0; padding-left: 12px; color: #666; }
        [contenteditable] pre { background: #f4f4f4; border-radius: 4px; padding: 8px 12px; font-family: monospace; font-size: 12px; white-space: pre-wrap; }
        [contenteditable] h1 { font-size: 1.5em; font-weight: 700; margin: 6px 0; }
        [contenteditable] h2 { font-size: 1.2em; font-weight: 700; margin: 5px 0; }
        [contenteditable] a  { color: #1d4ed8; text-decoration: underline; }
        [contenteditable] img { max-width: 100%; border-radius: 4px; margin-top: 4px; }
      `}</style>
    </div>
  )
}

// ─── Sidebar department-grouped project list ─────────────────────────────────
function SidebarGroups({
  projects,
  deletedProjects,
  projectFilter,
  onSelect,
  onNew,
  onDelete,
  onRestore,
  onPermanentDelete,
}: {
  projects: ProjectRecord[]
  deletedProjects: ProjectRecord[]
  projectFilter: number | 'All'
  onSelect: (id: number) => void
  onNew: () => void
  onDelete: (id: number) => void
  onRestore: (id: number) => void
  onPermanentDelete: (id: number) => void
}) {
  const [collapsedDepts, setCollapsedDepts] = useState<Set<string>>(new Set())
  const [trashOpen, setTrashOpen] = useState(false)
  const [hoveredId, setHoveredId] = useState<number | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null)

  const toggle = (dept: string) =>
    setCollapsedDepts(prev => { const n = new Set(prev); n.has(dept) ? n.delete(dept) : n.add(dept); return n })

  const grouped = useMemo(() => {
    const map = new Map<string, ProjectRecord[]>()
    projects.forEach(p => {
      const dept = p.department || 'No Group'
      if (!map.has(dept)) map.set(dept, [])
      map.get(dept)!.push(p)
    })
    const order = [...WORKFLOW_DEPARTMENTS, ...Array.from(map.keys()).filter(k => !WORKFLOW_DEPARTMENTS.includes(k))]
    return order.filter(k => map.has(k)).map(k => ({ dept: k, items: map.get(k)! }))
  }, [projects])

  return (
    <div>
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 4px 8px' }}>
        <span style={{ fontSize: 10, fontWeight: 700, color: '#444', letterSpacing: '0.8px', textTransform: 'uppercase' }}>Workflows</span>
        <button onClick={onNew} title="New workflow" style={{ width: 18, height: 18, borderRadius: 4, border: '1px solid #2a2a2a', background: 'transparent', color: '#555', display: 'grid', placeItems: 'center', cursor: 'pointer', padding: 0 }}>
          <Plus size={11} />
        </button>
      </div>

      {projects.length === 0 && (
        <div style={{ color: '#333', fontSize: 12, padding: '4px 10px' }}>No workflows yet</div>
      )}

      {grouped.map(({ dept, items }) => {
        const isCollapsed = collapsedDepts.has(dept)
        return (
          <div key={dept} style={{ marginBottom: 4 }}>
            <button
              onClick={() => toggle(dept)}
              style={{ display: 'flex', alignItems: 'center', gap: 6, width: '100%', padding: '5px 6px', border: 'none', background: 'transparent', cursor: 'pointer', borderRadius: 5 }}
              onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.background = '#181818'}
              onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.background = 'transparent'}
            >
              {isCollapsed
                ? <ChevronRight size={11} color="#444" style={{ flexShrink: 0 }} />
                : <ChevronDown size={11} color="#444" style={{ flexShrink: 0 }} />}
              <span style={{ fontSize: 13, fontWeight: 700, color: '#555', letterSpacing: '0.6px', textTransform: 'uppercase', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, textAlign: 'left' }}>
                {dept}
              </span>
              <span style={{ fontSize: 10, color: '#333', fontWeight: 600, flexShrink: 0 }}>{items.length}</span>
            </button>

            {!isCollapsed && items.map(project => {
              const active = projectFilter === project.id
              const bg = spaceColor(project.name)
              const hovered = hoveredId === project.id
              return (
                <div
                  key={project.id}
                  style={{ position: 'relative', display: 'flex', alignItems: 'center' }}
                  onMouseEnter={() => setHoveredId(project.id)}
                  onMouseLeave={() => setHoveredId(null)}
                >
                  <button
                    onClick={() => onSelect(project.id)}
                    style={{ display: 'flex', alignItems: 'center', gap: 9, flex: 1, padding: '6px 10px 6px 10px', borderRadius: 7, border: 'none', background: active ? bg : 'transparent', color: active ? '#fff' : '#777', cursor: 'pointer', fontSize: 11, fontFamily: font, marginBottom: 1, boxShadow: 'none', textAlign: 'left', minWidth: 0, fontWeight: active ? 700 : 500, letterSpacing: '0.04em', transition: 'color 0.12s, background 0.12s' }}
                    onMouseEnter={e => { if (!active) { (e.currentTarget as HTMLButtonElement).style.background = '#1a1a1a'; (e.currentTarget as HTMLButtonElement).style.color = '#bbb' } }}
                    onMouseLeave={e => { if (!active) { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; (e.currentTarget as HTMLButtonElement).style.color = '#777' } }}
                  >
                    <span style={{ width: 16, height: 16, borderRadius: '50%', background: active ? 'rgba(0,0,0,0.22)' : bg, display: 'inline-grid', placeItems: 'center', fontSize: 9, fontWeight: 800, color: active ? '#fff' : '#111', flexShrink: 0, transition: 'color 0.12s' }}>
                      {project.name.charAt(0).toUpperCase()}
                    </span>
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, textTransform: 'uppercase' }}>
                      {project.name}
                    </span>
                  </button>
                  {/* Trash icon on hover */}
                  {hovered && (
                    <button
                      title="Delete workflow"
                      onClick={e => { e.stopPropagation(); onDelete(project.id) }}
                      style={{ position: 'absolute', right: 6, width: 20, height: 20, border: 'none', background: 'transparent', cursor: 'pointer', display: 'grid', placeItems: 'center', color: active ? '#fff' : '#555', borderRadius: 4, flexShrink: 0 }}
                      onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = active ? '#fff' : '#ef4444'; (e.currentTarget as HTMLButtonElement).style.background = active ? 'rgba(255,255,255,0.14)' : 'rgba(239,68,68,0.1)' }}
                      onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = active ? '#fff' : '#555'; (e.currentTarget as HTMLButtonElement).style.background = 'transparent' }}
                    >
                      <Trash2 size={12} />
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        )
      })}

      {/* New Workflow */}
      <button
        onClick={onNew}
        style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '7px 10px', border: 'none', background: 'transparent', color: '#333', cursor: 'pointer', fontSize: 12, fontFamily: font, marginTop: 6 }}
        onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = '#888' }}
        onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = '#333' }}
      >
        <Plus size={12} /> New Workflow
      </button>

      {/* ── Deleted Workflows section ── */}
      {deletedProjects.length > 0 && (
        <div style={{ marginTop: 12, borderTop: '1px solid #1e1e1e', paddingTop: 10 }}>
          <button
            onClick={() => setTrashOpen(v => !v)}
            style={{ display: 'flex', alignItems: 'center', gap: 6, width: '100%', padding: '5px 6px', border: 'none', background: 'transparent', cursor: 'pointer', borderRadius: 5 }}
            onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.background = '#181818'}
            onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.background = 'transparent'}
          >
            {trashOpen ? <ChevronDown size={11} color="#555" /> : <ChevronRight size={11} color="#555" />}
            <Trash2 size={11} color="#555" />
            <span style={{ fontSize: 11, fontWeight: 700, color: '#555', letterSpacing: '0.6px', textTransform: 'uppercase', flex: 1, textAlign: 'left' }}>Deleted</span>
            <span style={{ fontSize: 10, color: '#555', fontWeight: 600, background: '#2a2a2a', borderRadius: 10, padding: '1px 6px' }}>{deletedProjects.length}</span>
          </button>

          {trashOpen && deletedProjects.map(project => (
            <div key={project.id} style={{ padding: '6px 8px 6px 20px', display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ width: 18, height: 18, borderRadius: '50%', background: spaceColor(project.name), display: 'inline-grid', placeItems: 'center', fontSize: 10, fontWeight: 800, color: '#111', flexShrink: 0, opacity: 0.5 }}>
                {project.name.charAt(0).toUpperCase()}
              </span>
              <span style={{ fontSize: 11, color: '#555', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textDecoration: 'line-through', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                {project.name}
              </span>
              {/* Restore */}
              <button
                title="Restore"
                onClick={() => onRestore(project.id)}
                style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#1db954', display: 'grid', placeItems: 'center', padding: 3, borderRadius: 4, flexShrink: 0 }}
                onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.background = 'rgba(29,185,84,0.12)'}
                onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.background = 'transparent'}
              >
                <CirclePlus size={13} />
              </button>
              {/* Permanent delete */}
              <button
                title="Delete permanently"
                onClick={() => setConfirmDeleteId(project.id)}
                style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#ef4444', display: 'grid', placeItems: 'center', padding: 3, borderRadius: 4, flexShrink: 0 }}
                onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.background = 'rgba(239,68,68,0.1)'}
                onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.background = 'transparent'}
              >
                <X size={13} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Permanent delete confirmation */}
      {confirmDeleteId !== null && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }} onClick={() => setConfirmDeleteId(null)}>
          <div onClick={e => e.stopPropagation()} style={{ background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 12, padding: '28px 28px 22px', width: 360, fontFamily: font, textAlign: 'center' }}>
            <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'rgba(239,68,68,0.15)', display: 'grid', placeItems: 'center', margin: '0 auto 14px' }}>
              <Trash2 size={20} color="#ef4444" />
            </div>
            <p style={{ color: '#f0f0f0', fontSize: 15, fontWeight: 700, margin: '0 0 8px' }}>Delete permanently?</p>
            <p style={{ color: '#666', fontSize: 13, margin: '0 0 22px', lineHeight: 1.5 }}>
              This workflow and all its tasks will be removed forever. This cannot be undone.
            </p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setConfirmDeleteId(null)} style={{ flex: 1, padding: '10px 0', borderRadius: 8, border: '1px solid #2a2a2a', background: 'transparent', color: '#aaa', fontWeight: 600, fontSize: 13, cursor: 'pointer', fontFamily: font }}>Cancel</button>
              <button onClick={() => { onPermanentDelete(confirmDeleteId!); setConfirmDeleteId(null) }} style={{ flex: 1, padding: '10px 0', borderRadius: 8, border: 'none', background: '#ef4444', color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer', fontFamily: font }}>Delete Forever</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Add Stage modal ─────────────────────────────────────────────────────────
function AddStageModal({
  existingStages,
  onClose,
  onSave,
}: {
  existingStages: WorkflowStage[]
  onClose: () => void
  onSave: (name: string, insertBefore: string, config: StageMemberConfig) => void
}) {
  const [name, setName] = useState('')
  const [guideline, setGuideline] = useState('')
  const [expectedHours, setExpectedHours] = useState('')
  const [insertBefore, setInsertBefore] = useState<string>('done')
  const [addUserGroups, setAddUserGroups] = useState(false)
  const [owners, setOwners] = useState<string[]>([])
  const [workers, setWorkers] = useState<string[]>([])
  const [defaultFollowers, setDefaultFollowers] = useState<string[]>([])
  const [assignmentOption, setAssignmentOption] = useState('Keep the assignee from previous stage')
  const [deadlineMode, setDeadlineMode] = useState('Use automatic deadline (based on stage duration)')

  const teamMembers = useMemo(() => ['Anna', 'Mark', 'Leo', 'John', 'Jane', 'Paul', 'Mike'], [])
  const availableMembers = useMemo(() => {
    const account = loadStored<AccountRecord>(accountStorageKey, {})
    const contacts = loadStored<ContactRecord[]>('flowsys-contacts', [])
    const names = [
      account.fullName,
      account.name,
      ...teamMembers,
      ...contacts.map(contact => contact.name),
    ].filter(Boolean) as string[]
    return Array.from(new Set(names.map(member => member.trim()).filter(Boolean))).sort((a, b) => a.localeCompare(b))
  }, [teamMembers])

  const handleSave = () => {
    if (!name.trim() || owners.length === 0) return
    onSave(name.trim(), insertBefore, {
      owners,
      workers,
      defaultFollowers,
      addUserGroupsAsWorkers: addUserGroups,
      guideline,
      expectedHours,
      assignmentOption,
      deadlineMode,
    })
  }

  const stageNameColor = '#2c7a4b'

  const fieldStyle: React.CSSProperties = {
    width: '100%',
    padding: '9px 12px',
    border: '1.5px solid #d0d0d0',
    borderRadius: 6,
    fontSize: 13,
    color: '#222',
    background: '#fff',
    outline: 'none',
    boxSizing: 'border-box',
    fontFamily: font,
  }

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 1200, background: 'rgba(0,0,0,.65)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 12, width: '100%', maxWidth: 900, maxHeight: '92vh', overflowY: 'auto', boxShadow: '0 32px 80px rgba(0,0,0,.45)', display: 'flex', flexDirection: 'column', fontFamily: font, color: '#1a1a1a' }}>

        {/* Header */}
        <div style={{ padding: '18px 24px', borderBottom: '1px solid #eee', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <h2 style={{ margin: 0, fontSize: 14, fontWeight: 700, letterSpacing: '0.08em', color: '#1a1a1a' }}>ADD A NEW STAGE TO THE WORKFLOW</h2>
          <button onClick={onClose} style={{ border: 'none', background: 'transparent', color: '#aaa', cursor: 'pointer', display: 'grid', placeItems: 'center', padding: 4 }}>
            <X size={18} />
          </button>
        </div>

        {/* Two-column body */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', flex: 1 }}>

          {/* ── Left column ── */}
          <div style={{ padding: '24px', borderRight: '1px solid #eee', display: 'flex', flexDirection: 'column', gap: 18 }}>

            {/* Stage name */}
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#777', marginBottom: 6 }}>Stage name *</label>
              <input
                autoFocus
                value={name}
                onChange={e => setName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSave()}
                placeholder="Stage name *"
                style={{ ...fieldStyle, fontSize: 16, borderColor: name ? stageNameColor : '#d0d0d0', color: '#111', fontWeight: 600 }}
                onFocus={e => (e.currentTarget.style.borderColor = stageNameColor)}
                onBlur={e => (e.currentTarget.style.borderColor = name ? stageNameColor : '#d0d0d0')}
              />
            </div>

            {/* Stage owners */}
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#777', marginBottom: 6 }}>Stage owners *</label>
              <MemberMentionInput
                value={owners}
                onChange={setOwners}
                options={availableMembers}
                placeholder="Type @ to tag stage owners"
                fieldStyle={fieldStyle}
                required
              />
            </div>

            {/* Stage guideline */}
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#777', marginBottom: 6 }}>Stage guideline</label>
              <GuidelineEditor
                initialValue={guideline}
                onChange={setGuideline}
                placeholder="Explain how to complete the stage"
                minRows={5}
                borderColor="#d0d0d0"
              />
            </div>

            {/* Advanced Settings */}
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#aaa', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: 16 }}>Advanced Settings</div>

              {/* Jobs assigned/reassigned options */}
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#555', marginBottom: 6 }}>Jobs assigned/reassigned options *</label>
                <div style={{ position: 'relative' }}>
                  <select value={assignmentOption} onChange={e => setAssignmentOption(e.target.value)} style={{ ...fieldStyle, paddingRight: 32, appearance: 'none' as const }}>
                    <option>Keep the assignee from previous stage</option>
                    <option>Assign to stage owner</option>
                    <option>Leave unassigned</option>
                  </select>
                  <ChevronDown size={14} color="#aaa" style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                </div>
              </div>

              {/* Expected duration */}
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#555', marginBottom: 6 }}>Expected duration</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input
                    type="number"
                    value={expectedHours}
                    onChange={e => setExpectedHours(e.target.value)}
                    placeholder="Time (hours)"
                    style={{ ...fieldStyle, width: 120, flexShrink: 0 }}
                  />
                  <div style={{ position: 'relative', flex: 1 }}>
                    <select value={deadlineMode} onChange={e => setDeadlineMode(e.target.value)} style={{ ...fieldStyle, paddingRight: 32, appearance: 'none' as const }}>
                      <option>Use automatic deadline (based on stage duration)</option>
                      <option>No automatic deadline</option>
                    </select>
                    <ChevronDown size={14} color="#aaa" style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                  </div>
                </div>
              </div>

              {/* Inserted at */}
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#555', marginBottom: 6 }}>Inserted at</label>
                <div style={{ position: 'relative' }}>
                  <select
                    value={insertBefore}
                    onChange={e => setInsertBefore(e.target.value)}
                    style={{ ...fieldStyle, paddingRight: 32, appearance: 'none' as const }}
                  >
                    <option value="done">Before the Done stage</option>
                    {existingStages.filter(s => s.type === 'normal').map(s => (
                      <option key={s.id} value={s.id}>After "{s.name}"</option>
                    ))}
                    <option value="end">At the end</option>
                  </select>
                  <ChevronDown size={14} color="#aaa" style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                </div>
              </div>
            </div>
          </div>

          {/* ── Right column ── */}
          <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: 18 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#aaa', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: 4 }}>Members in Stage</div>

            {/* Stage workers */}
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#555', marginBottom: 6 }}>Stage workers</label>
              <MemberMentionInput
                value={workers}
                onChange={setWorkers}
                options={availableMembers}
                placeholder="Type @ to tag stage workers"
                fieldStyle={fieldStyle}
              />
            </div>

            {/* Add user groups toggle */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', border: '1px solid #e0e0e0', borderRadius: 8, background: '#fafafa' }}>
              <span style={{ fontSize: 13, color: '#555', fontWeight: 500 }}>Add user groups as stage workers</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <button
                  onClick={() => setAddUserGroups(v => !v)}
                  style={{ width: 40, height: 22, borderRadius: 11, border: 'none', background: addUserGroups ? stageNameColor : '#ccc', cursor: 'pointer', position: 'relative', flexShrink: 0, transition: 'background 0.2s' }}
                >
                  <span style={{ position: 'absolute', top: 3, left: addUserGroups ? 21 : 3, width: 16, height: 16, borderRadius: '50%', background: '#fff', transition: 'left 0.2s' }} />
                </button>
                <button onClick={() => setAddUserGroups(false)} title="Clear user group workers" style={{ border: 'none', background: 'transparent', color: '#ccc', cursor: 'pointer', display: 'grid', placeItems: 'center' }}>
                  <X size={14} />
                </button>
              </div>
            </div>

            {/* Stage default followers */}
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#555', marginBottom: 6 }}>Stage default followers</label>
              <MemberMentionInput
                value={defaultFollowers}
                onChange={setDefaultFollowers}
                options={availableMembers}
                placeholder="Type @ to tag stage default followers"
                fieldStyle={fieldStyle}
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding: '16px 24px', borderTop: '1px solid #eee', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: '#aaa', fontSize: 13, fontWeight: 600, fontFamily: font, cursor: 'pointer', padding: '10px 20px' }}>
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!name.trim() || owners.length === 0}
            style={{ background: name.trim() && owners.length > 0 ? stageNameColor : '#d0d0d0', color: '#fff', border: 'none', borderRadius: 8, padding: '11px 40px', fontSize: 14, fontWeight: 700, fontFamily: font, cursor: name.trim() && owners.length > 0 ? 'pointer' : 'not-allowed', transition: 'background 0.12s' }}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Workflows card-grid view ────────────────────────────────────────────────
function MemberMentionInput({
  value,
  onChange,
  options,
  placeholder,
  fieldStyle,
  required = false,
}: {
  value: string[]
  onChange: (members: string[]) => void
  options: string[]
  placeholder: string
  fieldStyle: React.CSSProperties
  required?: boolean
}) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)
  const selected = new Set(value)
  const cleanQuery = query.startsWith('@') ? query.slice(1) : query
  const filteredOptions = options
    .filter(option => !selected.has(option))
    .filter(option => option.toLowerCase().includes(cleanQuery.trim().toLowerCase()))
    .slice(0, 8)
  const showRequired = required && value.length === 0

  const addMember = (member: string) => {
    if (selected.has(member)) return
    onChange([...value, member])
    setQuery('')
    setOpen(false)
    setActiveIndex(0)
  }

  const removeMember = (member: string) => {
    onChange(value.filter(item => item !== member))
  }

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if ((event.key === 'Enter' || event.key === 'Tab') && open && filteredOptions[activeIndex]) {
      event.preventDefault()
      addMember(filteredOptions[activeIndex])
      return
    }
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setOpen(true)
      setActiveIndex(index => Math.min(index + 1, Math.max(filteredOptions.length - 1, 0)))
      return
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault()
      setActiveIndex(index => Math.max(index - 1, 0))
      return
    }
    if (event.key === 'Backspace' && !query && value.length > 0) {
      removeMember(value[value.length - 1])
    }
  }

  return (
    <div style={{ position: 'relative' }}>
      <div
        style={{
          ...fieldStyle,
          minHeight: 42,
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          flexWrap: 'wrap',
          padding: '5px 8px',
          borderColor: open ? '#2c7a4b' : showRequired ? '#d0d0d0' : fieldStyle.borderColor,
          boxShadow: open ? '0 0 0 3px rgba(44,122,75,0.12)' : 'none',
        }}
        onClick={() => setOpen(true)}
      >
        {value.map(member => (
          <span key={member} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, maxWidth: '100%', padding: '4px 7px', borderRadius: 6, background: '#eef8f1', color: '#1f6b3f', fontSize: 12, fontWeight: 700 }}>
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>@{member}</span>
            <button
              type="button"
              onClick={event => { event.stopPropagation(); removeMember(member) }}
              style={{ border: 'none', background: 'transparent', color: '#2c7a4b', cursor: 'pointer', padding: 0, display: 'grid', placeItems: 'center' }}
              aria-label={`Remove ${member}`}
            >
              <X size={12} />
            </button>
          </span>
        ))}
        <input
          value={query}
          onChange={event => {
            setQuery(event.target.value)
            setOpen(true)
            setActiveIndex(0)
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => window.setTimeout(() => setOpen(false), 120)}
          onKeyDown={handleKeyDown}
          placeholder={value.length === 0 ? placeholder : 'Add another'}
          style={{ border: 'none', outline: 'none', flex: '1 1 150px', minWidth: 120, fontSize: 13, fontFamily: font, color: '#222', padding: '4px 2px', background: 'transparent' }}
        />
      </div>

      {open && (
        <div style={{ position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: 0, background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, boxShadow: '0 18px 34px rgba(15,23,42,0.14)', overflow: 'hidden', zIndex: 1300 }}>
          {filteredOptions.length > 0 ? filteredOptions.map((member, index) => (
            <button
              key={member}
              type="button"
              onMouseDown={event => { event.preventDefault(); addMember(member) }}
              onMouseEnter={() => setActiveIndex(index)}
              style={{ width: '100%', border: 'none', background: index === activeIndex ? '#eef8f1' : '#fff', color: '#222', display: 'flex', alignItems: 'center', gap: 9, padding: '9px 12px', cursor: 'pointer', fontFamily: font, textAlign: 'left' }}
            >
              <span style={{ width: 24, height: 24, borderRadius: '50%', background: spaceColor(member), color: '#fff', display: 'grid', placeItems: 'center', fontSize: 11, fontWeight: 800, flexShrink: 0 }}>
                {member.charAt(0).toUpperCase()}
              </span>
              <span style={{ fontSize: 13, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{member}</span>
            </button>
          )) : (
            <div style={{ padding: '10px 12px', color: '#999', fontSize: 12 }}>No team members found</div>
          )}
        </div>
      )}
    </div>
  )
}

function WorkflowsView({
  projects,
  tasks,
  onSelectProject,
  onCreateWorkflow,
  onDeleteWorkflow,
}: {
  projects: ProjectRecord[]
  tasks: AssignedTask[]
  onSelectProject: (id: number) => void
  onDeleteWorkflow: (id: number) => void
  onCreateWorkflow: () => void
}) {
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set())

  const toggleGroup = (dept: string) =>
    setCollapsedGroups(prev => {
      const next = new Set(prev)
      next.has(dept) ? next.delete(dept) : next.add(dept)
      return next
    })

  const grouped = useMemo(() => {
    const map = new Map<string, ProjectRecord[]>()
    projects.forEach(p => {
      const dept = p.department || 'No Group'
      if (!map.has(dept)) map.set(dept, [])
      map.get(dept)!.push(p)
    })
    // preserve the canonical order from WORKFLOW_DEPARTMENTS then append extras
    const order = [...WORKFLOW_DEPARTMENTS, ...Array.from(map.keys()).filter(k => !WORKFLOW_DEPARTMENTS.includes(k))]
    return order.filter(k => map.has(k)).map(k => ({ name: k, projects: map.get(k)! }))
  }, [projects])

  const tasksByProject = useMemo(() => {
    const m = new Map<number, AssignedTask[]>()
    tasks.forEach(t => {
      if (!m.has(t.projectId)) m.set(t.projectId, [])
      m.get(t.projectId)!.push(t)
    })
    return m
  }, [tasks])

  if (projects.length === 0) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 320, gap: 14, padding: '60px 28px', color: '#555' }}>
        <Layers size={42} color="#2a2a2a" />
        <div style={{ fontSize: 17, fontWeight: 700, color: '#888' }}>No workflows yet</div>
        <div style={{ fontSize: 13, color: '#555' }}>Create your first workflow service to get started.</div>
        <button onClick={onCreateWorkflow} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '10px 22px', background: '#1db954', color: '#111', border: 'none', borderRadius: 9, fontSize: 13, fontWeight: 700, fontFamily: font, cursor: 'pointer' }}>
          <Plus size={14} /> Create workflow service
        </button>
      </div>
    )
  }

  return (
    <div style={{ padding: '24px 28px 48px' }}>
      {grouped.map(({ name: dept, projects: deptProjects }) => {
        const isCollapsed = collapsedGroups.has(dept)
        return (
        <div key={dept} style={{ marginBottom: 36 }}>
          {/* Group header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: isCollapsed ? 0 : 16 }}>
            <button
              onClick={() => toggleGroup(dept)}
              style={{ display: 'flex', alignItems: 'center', gap: 8, border: 'none', background: 'transparent', cursor: 'pointer', padding: '4px 0' }}
            >
              {isCollapsed
                ? <ChevronRight size={15} color="#555" />
                : <ChevronDown size={15} color="#555" />}
              <span style={{ color: '#c0c0c0', fontSize: 16, fontWeight: 700, fontFamily: displayFont, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                {dept} ({deptProjects.length})
              </span>
            </button>
            <button
              onClick={onCreateWorkflow}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 12px', border: '1px solid #2a2a2a', borderRadius: 7, background: 'transparent', color: '#555', fontSize: 12, fontWeight: 600, fontFamily: font, cursor: 'pointer', transition: 'border-color 0.12s, color 0.12s' }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = '#444'; (e.currentTarget as HTMLButtonElement).style.color = '#aaa' }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = '#2a2a2a'; (e.currentTarget as HTMLButtonElement).style.color = '#555' }}
            >
              <Plus size={12} /> New service
            </button>
          </div>

          {/* Workflow cards — hidden when collapsed */}
          {!isCollapsed && <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))', gap: 14 }}>
            {deptProjects.map(project => {
              const pts = tasksByProject.get(project.id) || []
              const total = pts.length
              const done = pts.filter(t => t.status === 'Completed').length
              const bg = spaceColor(project.name)
              const members = Array.from(new Set(pts.map(t => t.assignee).filter(Boolean)))
              const pct = total > 0 ? (done / total) * 100 : 0

              return (
                <div
                  key={project.id}
                  onClick={() => onSelectProject(project.id)}
                  style={{ background: '#141414', border: '1px solid #1e1e1e', borderRadius: 12, padding: '18px 20px', cursor: 'pointer', transition: 'border-color 0.15s, background 0.15s' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor = '#3a3a3a'; (e.currentTarget as HTMLDivElement).style.background = '#181818' }}
                  onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = '#1e1e1e'; (e.currentTarget as HTMLDivElement).style.background = '#141414' }}
                >
                  {/* Card header */}
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 14 }}>
                    <div style={{ width: 40, height: 40, borderRadius: '50%', background: bg, display: 'grid', placeItems: 'center', fontSize: 13, fontWeight: 800, color: '#111', flexShrink: 0, fontFamily: displayFont }}>
                      {project.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ color: '#e0e0e0', fontSize: 14, fontWeight: 700, fontFamily: displayFont, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {project.name}
                      </div>
                      <div style={{ color: '#444', fontSize: 12, marginTop: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {project.description || project.client || 'No description'}
                      </div>
                    </div>
                    <button
                      onClick={e => { e.stopPropagation(); onDeleteWorkflow(project.id) }}
                      title="Delete workflow"
                      style={{ border: 'none', background: 'transparent', color: '#444', cursor: 'pointer', display: 'grid', placeItems: 'center', padding: 4, flexShrink: 0, borderRadius: 5 }}
                      onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = '#ef4444'; (e.currentTarget as HTMLButtonElement).style.background = 'rgba(239,68,68,0.1)' }}
                      onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = '#444'; (e.currentTarget as HTMLButtonElement).style.background = 'transparent' }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>

                  {/* Member avatars */}
                  {members.length > 0 && (
                    <div style={{ display: 'flex', alignItems: 'center', marginBottom: 14 }}>
                      {members.slice(0, 5).map((name, i) => (
                        <div key={name} style={{ marginLeft: i > 0 ? -8 : 0, zIndex: members.length - i, borderRadius: '50%', border: '2px solid #141414' }}>
                          <Avatar name={name} size={26} />
                        </div>
                      ))}
                      {members.length > 5 && (
                        <div style={{ width: 26, height: 26, borderRadius: '50%', background: '#2a2a2a', border: '2px solid #141414', display: 'grid', placeItems: 'center', fontSize: 9, color: '#888', fontWeight: 700, marginLeft: -8 }}>
                          +{members.length - 5}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Progress bar */}
                  <div style={{ height: 4, borderRadius: 2, background: '#252525', marginBottom: 10, overflow: 'hidden' }}>
                    <div style={{ height: '100%', borderRadius: 2, background: '#1db954', width: `${pct}%`, transition: 'width 0.3s' }} />
                  </div>

                  {/* Stats */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <span style={{ color: '#555', fontSize: 12 }}>{total} Job{total !== 1 ? 's' : ''}</span>
                    <span style={{ color: '#1db954', fontSize: 12, fontWeight: 600 }}>{done} Done</span>
                    <span style={{ color: '#ef4444', fontSize: 12, fontWeight: 600 }}>0 Failed</span>
                  </div>
                </div>
              )
            })}
          </div>}
        </div>
        )
      })}
    </div>
  )
}

// ─── Create Workflow Service modal ───────────────────────────────────────────
function CreateWorkflowModal({
  onClose,
  onSubmit,
}: {
  onClose: () => void
  onSubmit: (data: Partial<ProjectRecord> & { name: string; department: string; description: string }) => void
}) {
  const [name, setName] = useState('')
  const [department, setDepartment] = useState(WORKFLOW_DEPARTMENTS[0])
  const [description, setDescription] = useState('')
  const [failedReasons, setFailedReasons] = useState<string[]>([])
  const [failedInput, setFailedInput] = useState('')
  const [visibility, setVisibility] = useState('Anyone who follows the job can view it')
  const [displayOpt, setDisplayOpt] = useState('All jobs')
  const [reviewers, setReviewers] = useState<string[]>([])
  const [viewerGroups, setViewerGroups] = useState('')
  const [creatorGroups, setCreatorGroups] = useState('')

  const availableMembers = useMemo(() => {
    const account = loadStored<AccountRecord>(accountStorageKey, {})
    const contacts = loadStored<ContactRecord[]>(contactsStorageKey, [])
    const names = [account.fullName, account.name, 'Anna', 'Mark', 'Leo', 'John', 'Jane', 'Paul', 'Mike', ...contacts.map(contact => contact.name)]
    return Array.from(new Set(names.filter(Boolean) as string[])).sort((a, b) => a.localeCompare(b))
  }, [])

  const addFailed = () => {
    const r = failedInput.trim()
    if (r && !failedReasons.includes(r)) setFailedReasons(prev => [...prev, r])
    setFailedInput('')
  }

  const handleSubmit = () => {
    if (!name.trim()) return
    onSubmit({ name: name.trim(), department, description, failedReasons, visibility, displayOption: displayOpt, reviewers, viewerGroups, creatorGroups })
    onClose()
  }

  const fieldStyle: React.CSSProperties = {
    width: '100%',
    padding: '9px 12px',
    border: '1.5px solid #e0e0e0',
    borderRadius: 7,
    fontSize: 13,
    color: '#222',
    background: '#fff',
    outline: 'none',
    boxSizing: 'border-box',
    fontFamily: font,
    appearance: 'none' as const,
  }

  return (
    <div
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, zIndex: 1100, background: 'rgba(0,0,0,.72)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{ background: '#fff', borderRadius: 14, width: '100%', maxWidth: 880, maxHeight: '92vh', overflowY: 'auto', boxShadow: '0 32px 80px rgba(0,0,0,.55)', display: 'flex', flexDirection: 'column', fontFamily: font, color: '#1a1a1a' }}
      >
        {/* Modal header */}
        <div style={{ padding: '18px 24px', borderBottom: '1px solid #e8e8e8', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <h2 style={{ margin: 0, fontSize: 14, fontWeight: 700, letterSpacing: '0.06em', color: '#1a1a1a', fontFamily: font }}>CREATE A NEW WORKFLOW SERVICE</h2>
          <button onClick={onClose} style={{ border: 'none', background: 'transparent', color: '#aaa', cursor: 'pointer', display: 'grid', placeItems: 'center', padding: 4 }}>
            <X size={18} />
          </button>
        </div>

        {/* Two-column body */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', flex: 1 }}>

          {/* ── Left column ── */}
          <div style={{ padding: '24px', borderRight: '1px solid #eee', display: 'flex', flexDirection: 'column', gap: 18 }}>

            {/* Workflow name */}
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#777', marginBottom: 6 }}>Workflow name *</label>
              <input
                autoFocus
                value={name}
                onChange={e => setName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                placeholder="Workflow name *"
                style={{ ...fieldStyle }}
                onFocus={e => (e.currentTarget.style.borderColor = '#1db954')}
                onBlur={e => (e.currentTarget.style.borderColor = '#e0e0e0')}
              />
            </div>

            {/* Service group */}
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#777', marginBottom: 6 }}>Service group</label>
              <div style={{ position: 'relative' }}>
                <select value={department} onChange={e => setDepartment(e.target.value)} style={{ ...fieldStyle, paddingRight: 32 }}>
                  <option value="">Not specified</option>
                  {WORKFLOW_DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
                <ChevronDown size={14} color="#aaa" style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
              </div>
            </div>

            {/* Workflow owners */}
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#777', marginBottom: 6 }}>Workflow owners</label>
              <div style={{ padding: '9px 12px', border: '1.5px solid #e0e0e0', borderRadius: 7, fontSize: 13, color: '#aaa', background: '#fafafa' }}>
                Workflow owners can see all the jobs in the workflow. You are owner by default
              </div>
            </div>

            {/* Workflow guideline */}
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#777', marginBottom: 6 }}>Workflow guideline</label>
              <GuidelineEditor
                initialValue={description}
                onChange={setDescription}
                placeholder="Detailed description about the workflow"
                minRows={4}
              />
            </div>

            {/* Failed reasons */}
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#777', marginBottom: 6 }}>Failed reasons</label>
              <div style={{ border: '1.5px solid #e0e0e0', borderRadius: 7, padding: '8px 12px', minHeight: 44, background: '#fafafa' }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: failedReasons.length ? 6 : 0 }}>
                  {failedReasons.map(r => (
                    <span key={r} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: '#eee', borderRadius: 4, padding: '2px 8px', fontSize: 12, color: '#444' }}>
                      {r}
                      <button onClick={() => setFailedReasons(prev => prev.filter(x => x !== r))} style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#aaa', display: 'grid', placeItems: 'center', padding: 0 }}>
                        <X size={10} />
                      </button>
                    </span>
                  ))}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#aaa' }}>
                  <span style={{ fontSize: 13 }}>»</span>
                  <input
                    value={failedInput}
                    onChange={e => setFailedInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && addFailed()}
                    placeholder="Type one possible failed reason and press Enter"
                    style={{ border: 'none', outline: 'none', fontSize: 13, color: '#555', fontFamily: font, flex: 1, background: 'transparent' }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* ── Right column ── */}
          <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: 18 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#aaa', letterSpacing: '0.8px', textTransform: 'uppercase', marginBottom: 4 }}>OTHER OPTIONS</div>

            {/* Job visibility */}
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#333', marginBottom: 3 }}>Job visibility</div>
              <div style={{ fontSize: 12, color: '#999', marginBottom: 8 }}>Permissions to view jobs in the workflow</div>
              <div style={{ position: 'relative' }}>
                <select value={visibility} onChange={e => setVisibility(e.target.value)} style={{ ...fieldStyle, paddingRight: 32 }}>
                  {['Anyone who follows the job can view it', 'Workflow members only', 'Public'].map(o => <option key={o} value={o}>{o}</option>)}
                </select>
                <ChevronDown size={14} color="#aaa" style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
              </div>
            </div>

            {/* Job display options */}
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#333', marginBottom: 3 }}>Job display options</div>
              <div style={{ fontSize: 12, color: '#999', marginBottom: 8 }}>Display jobs in the workflow</div>
              <div style={{ position: 'relative' }}>
                <select value={displayOpt} onChange={e => setDisplayOpt(e.target.value)} style={{ ...fieldStyle, paddingRight: 32 }}>
                  {['All jobs', 'My jobs only', 'Team jobs'].map(o => <option key={o} value={o}>{o}</option>)}
                </select>
                <ChevronDown size={14} color="#aaa" style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
              </div>
            </div>

            {/* Workflow reviewers */}
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#333', marginBottom: 3 }}>Workflow reviewers</div>
              <div style={{ fontSize: 12, color: '#999', marginBottom: 8 }}>Workflow reviewers have the rights to view & review all the jobs but no editing right</div>
              <MemberMentionInput value={reviewers} onChange={setReviewers} options={availableMembers} placeholder="Type @ to tag reviewers" fieldStyle={fieldStyle} />
            </div>

            {/* Who can see */}
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#333', marginBottom: 3 }}>Who can see the workflow?</div>
              <div style={{ fontSize: 12, color: '#999', marginBottom: 8 }}>List of user groups who can see the workflow</div>
              <div style={{ position: 'relative' }}>
                <select value={viewerGroups} onChange={e => setViewerGroups(e.target.value)} style={{ ...fieldStyle, paddingRight: 32, color: viewerGroups ? '#222' : '#bbb' }}>
                  <option value="">Please select</option>
                  {WORKFLOW_DEPARTMENTS.map(group => <option key={group} value={group}>{group}</option>)}
                </select>
                <ChevronDown size={14} color="#aaa" style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
              </div>
            </div>

            {/* Who can create */}
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#333', marginBottom: 3 }}>Who can create a new job?</div>
              <div style={{ fontSize: 12, color: '#999', marginBottom: 8 }}>List of user groups who can create a new job in the workflow</div>
              <div style={{ position: 'relative' }}>
                <select value={creatorGroups} onChange={e => setCreatorGroups(e.target.value)} style={{ ...fieldStyle, paddingRight: 32, color: creatorGroups ? '#222' : '#bbb' }}>
                  <option value="">Please select</option>
                  {WORKFLOW_DEPARTMENTS.map(group => <option key={group} value={group}>{group}</option>)}
                </select>
                <ChevronDown size={14} color="#aaa" style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding: '16px 24px', borderTop: '1px solid #e8e8e8', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: '#aaa', fontSize: 13, fontWeight: 600, fontFamily: font, cursor: 'pointer' }}>
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!name.trim()}
            style={{ background: name.trim() ? '#1db954' : '#d0d0d0', color: name.trim() ? '#fff' : '#aaa', border: 'none', borderRadius: 8, padding: '10px 36px', fontSize: 14, fontWeight: 700, fontFamily: font, cursor: name.trim() ? 'pointer' : 'not-allowed', transition: 'background 0.12s' }}
          >
            Create
          </button>
        </div>
      </div>
    </div>
  )
}

function SideItem({ label, count, active = false, onClick }: { label: string; count: number; active?: boolean; onClick?: () => void }) {
  return (
    <button onClick={onClick} style={{ ...sideButtonStyle, background: active ? '#282828' : 'transparent', color: active ? '#ffffff' : '#b3b3b3' }}>
      <Circle size={13} />
      <span>{label}</span>
      <span style={{ marginLeft: 'auto', color: active ? '#1ed760' : '#b3b3b3', fontSize: 11, fontWeight: 700 }}>{count}</span>
    </button>
  )
}

function ViewTab({ label, icon, active, onClick }: { label: string; icon: ReactNode; active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} style={{ ...viewButtonStyle, color: active ? '#1ed760' : '#b3b3b3', borderBottomColor: active ? '#1ed760' : 'transparent' }}>
      {icon}
      {label}
    </button>
  )
}

const reminderGroupMeta: Record<string, { dot: string; label: string }> = {
  Overdue:    { dot: '#ef4444', label: 'Overdue' },
  Today:      { dot: '#1db954', label: 'Today' },
  'This Week':{ dot: '#3b82f6', label: 'This Week' },
  Upcoming:   { dot: '#535353', label: 'Upcoming' },
  Completed:  { dot: '#1db954', label: 'Completed' },
}

function RemindersListView({
  groups, onOpen, onStatus, onDelete, onAdd, onTaskUpdate,
}: {
  groups: Array<{ title: string; tasks: AssignedTask[] }>
  onOpen: (id: number) => void
  onStatus: (id: number, status: TaskStatus) => void
  onDelete: (id: number) => void
  onAdd: () => void
  onTaskUpdate: (id: number, updates: Partial<AssignedTask>) => void
}) {
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())
  const toggle = (title: string) =>
    setCollapsed(prev => { const n = new Set(prev); n.has(title) ? n.delete(title) : n.add(title); return n })

  if (groups.length === 0) return <EmptyState />

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {groups.map(({ title, tasks }) => {
        const meta = reminderGroupMeta[title] ?? { dot: '#535353', label: title }
        const isCollapsed = collapsed.has(title)

        return (
          <div key={title}>
            {/* Group header */}
            <button
              onClick={() => toggle(title)}
              style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'transparent', border: 'none', cursor: 'pointer', padding: '8px 4px', width: '100%', textAlign: 'left' }}
            >
              {isCollapsed ? <ChevronRight size={13} color="#535353" /> : <ChevronDown size={13} color="#535353" />}
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: meta.dot, flexShrink: 0 }} />
              <span style={{ color: '#f0f0f0', fontSize: 13, fontWeight: 700, fontFamily: font }}>{meta.label}</span>
              <span style={{ color: '#535353', fontSize: 12, fontWeight: 600 }}>{tasks.length} {tasks.length === 1 ? 'task' : 'tasks'}</span>
            </button>

            {!isCollapsed && (
              <div style={{ borderRadius: 10, border: '1px solid #1e1e1e', overflow: 'hidden', marginBottom: 8 }}>
                {tasks.map((task, i) => {
                  const due = dueMeta(task)
                  const displayPriority = task.priority ?? (taskPriority(task).label as TaskPriority)
                  const priorityColor = priorityColors[displayPriority as TaskPriority] ?? taskPriority(task).color
                  const isOverdue = due.group === 'Overdue'

                  return (
                    <div
                      key={task.id}
                      onClick={() => onOpen(task.id)}
                      onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.background = '#1c1c1c'}
                      onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.background = i % 2 === 0 ? '#181818' : '#161616'}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 12,
                        padding: '10px 16px',
                        background: i % 2 === 0 ? '#181818' : '#161616',
                        borderBottom: i < tasks.length - 1 ? '1px solid #1e1e1e' : 'none',
                        cursor: 'pointer',
                        transition: 'background 0.1s',
                      }}
                    >
                      {/* Status toggle */}
                      <button
                        onClick={e => { e.stopPropagation(); onStatus(task.id, task.status === 'Completed' ? 'Open' : task.status === 'Open' ? 'In Progress' : 'Completed') }}
                        style={{ border: 'none', background: 'transparent', cursor: 'pointer', display: 'grid', placeItems: 'center', flexShrink: 0, padding: 0 }}
                      >
                        {task.status === 'Completed'
                          ? <CheckCircle2 size={16} color="#1db954" />
                          : task.status === 'In Progress'
                            ? <Circle size={16} color="#3b82f6" strokeWidth={2.5} />
                            : <Circle size={16} color="#535353" />}
                      </button>

                      {/* Task name */}
                      <span style={{ flex: 1, color: task.status === 'Completed' ? '#555' : '#e8e8e8', fontSize: 13, fontWeight: 500, textDecoration: task.status === 'Completed' ? 'line-through' : 'none', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {task.title}
                      </span>

                      {/* Right metadata */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexShrink: 0 }}>
                        {task.assignee && <Avatar name={task.assignee} size={22} />}

                        {task.dueDate ? (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, color: isOverdue ? '#ef4444' : '#888', fontSize: 12, fontWeight: 600, minWidth: 80 }}>
                            <CalendarDays size={13} />
                            {due.label.replace(/ overdue$| today$/i, '')}
                          </span>
                        ) : (
                          <span style={{ minWidth: 80 }} />
                        )}

                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 600, color: priorityColor, minWidth: 68 }}>
                          <Flag size={13} fill={priorityColor} />
                          {displayPriority}
                        </span>

                        {/* Delete */}
                        <button
                          onClick={e => { e.stopPropagation(); onDelete(task.id) }}
                          style={{ border: 'none', background: 'transparent', color: '#2a2a2a', cursor: 'pointer', display: 'grid', placeItems: 'center', padding: 0 }}
                          onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.color = '#ef4444'}
                          onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.color = '#2a2a2a'}
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  )
                })}

                {/* Add task row */}
                <button
                  onClick={onAdd}
                  style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '9px 16px 9px 44px', border: 'none', background: '#141414', color: '#444', cursor: 'pointer', fontSize: 13, fontFamily: font }}
                  onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = '#b3b3b3'; (e.currentTarget as HTMLButtonElement).style.background = '#1a1a1a' }}
                  onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = '#444'; (e.currentTarget as HTMLButtonElement).style.background = '#141414' }}
                >
                  <Plus size={13} /> Add task
                </button>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

function DarkMyJobsContent({
  tasks,
  projectById,
  currentUser,
  onOpen,
  onStatus,
  onAdd,
  onWorkflowSelect,
}: {
  tasks: AssignedTask[]
  projectById: Map<number, ProjectRecord>
  currentUser: string
  onOpen: (id: number) => void
  onStatus: (id: number, status: TaskStatus) => void
  onAdd: () => void
  onWorkflowSelect: (id: number) => void
}) {
  const [filter, setFilter] = useState<'all' | 'today' | 'overdue' | 'completed' | 'priority'>('all')
  const [query, setQuery] = useState('')
  const today = todayTime()
  const stageName = (task: AssignedTask) => {
    const project = projectById.get(task.projectId)
    const stage = getProjectStages(project).find(item => item.id === task.stageId)
    return stage?.name || (task.status === 'Completed' ? 'Done' : task.status === 'In Progress' ? 'Active' : 'Open')
  }
  const deadlineMeta = (task: AssignedTask) => {
    if (!task.dueDate) return '-'
    const due = new Date(`${task.dueDate}T19:28:00`)
    const dueDay = dateTime(task.dueDate)
    return {
      label: `${String(due.getDate()).padStart(2, '0')}-${String(due.getMonth() + 1).padStart(2, '0')}-${due.getFullYear()} 19:28`,
      color: task.status === 'Completed' ? '#777' : dueDay < today ? '#ef4444' : dueDay === today ? '#f59e0b' : '#b3b3b3',
    }
  }
  const filtered = tasks.filter(task => {
    const project = projectById.get(task.projectId)
    const term = query.trim().toLowerCase()
    const matchesQuery = !term || [task.title, task.description, task.assignee, project?.name, stageName(task)].filter(Boolean).join(' ').toLowerCase().includes(term)
    const due = task.dueDate ? dateTime(task.dueDate) : 0
    const matchesFilter =
      filter === 'all' ? true :
      filter === 'today' ? task.status !== 'Completed' && due === today :
      filter === 'overdue' ? task.status !== 'Completed' && !!due && due < today :
      filter === 'completed' ? task.status === 'Completed' :
      filter === 'priority' ? task.priority === 'High' || task.priority === 'Urgent' :
      true
    return matchesQuery && matchesFilter
  })
  const stats = {
    total: tasks.length,
    today: tasks.filter(task => task.status !== 'Completed' && task.dueDate && dateTime(task.dueDate) === today).length,
    overdue: tasks.filter(task => task.status !== 'Completed' && task.dueDate && dateTime(task.dueDate) < today).length,
    completed: tasks.filter(task => task.status === 'Completed').length,
  }

  return (
    <div style={{ padding: '24px 28px 64px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 18, marginBottom: 18 }}>
        <div>
          <h1 style={{ margin: 0, color: '#f5f5f5', fontSize: 24, fontWeight: 900, fontFamily: displayFont }}>My Jobs</h1>
          <p style={{ margin: '6px 0 0', color: '#777', fontSize: 13, fontWeight: 600 }}>All jobs assigned to you across every workflow</p>
        </div>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, width: 230, height: 38, border: '1px solid #252525', borderRadius: 8, background: '#171717', padding: '0 12px' }}>
          <Search size={14} color="#555" />
          <input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search my jobs" style={{ flex: 1, minHeight: 0, border: 'none', outline: 'none', background: 'transparent', color: '#ddd', fontSize: 13 }} />
        </label>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(130px, 1fr))', gap: 10, marginBottom: 16 }}>
        {[
          ['Total Assigned', stats.total, '#1db954'],
          ['Due Today', stats.today, '#f59e0b'],
          ['Overdue', stats.overdue, '#ef4444'],
          ['Completed', stats.completed, '#8b83e6'],
        ].map(([label, value, color]) => (
          <div key={String(label)} style={{ border: '1px solid #252525', borderRadius: 10, background: '#171717', padding: 14 }}>
            <div style={{ color: '#777', fontSize: 11, fontWeight: 900, textTransform: 'uppercase' }}>{label}</div>
            <div style={{ color: String(color), fontSize: 24, fontWeight: 900, marginTop: 8 }}>{value}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        {[
          ['all', 'All'],
          ['today', 'Today'],
          ['overdue', 'Overdue'],
          ['completed', 'Completed'],
          ['priority', 'High Priority'],
        ].map(([key, label]) => {
          const active = filter === key
          return <button key={key} onClick={() => setFilter(key as typeof filter)} style={{ border: '1px solid #252525', borderRadius: 999, background: active ? '#1db954' : '#171717', color: active ? '#111' : '#aaa', padding: '7px 13px', fontSize: 12, fontWeight: 800, cursor: 'pointer' }}>{label}</button>
        })}
      </div>

      <div style={{ border: '1px solid #1e1e1e', borderRadius: 9, overflow: 'hidden', background: '#121212' }}>
        {filtered.length === 0 ? (
          <div style={{ padding: 38, color: '#777', fontSize: 14, textAlign: 'center' }}>No jobs assigned to you yet.</div>
        ) : filtered.map(task => {
          const project = projectById.get(task.projectId)
          const assignees = taskAssigneeNames(task)
          const primaryAssignee = assignees[0] || currentUser
          const deadline = deadlineMeta(task)
          const displayPriority = task.priority ?? (taskPriority(task).label as TaskPriority)
          const priorityColor = priorityColors[displayPriority] ?? taskPriority(task).color
          return (
            <div
              key={task.id}
              style={{ minHeight: 72, borderBottom: '1px solid #1e1e1e', background: '#171717', color: '#f5f5f5', display: 'grid', gridTemplateColumns: '34px minmax(260px, 1.25fr) 170px 120px 112px 160px 110px', alignItems: 'center', gap: 12, padding: '12px 14px', boxSizing: 'border-box' }}
            >
              <button
                onClick={() => onStatus(task.id, task.status === 'Completed' ? 'Open' : 'Completed')}
                title="Toggle done"
                style={{ width: 16, height: 16, borderRadius: '50%', border: `1px solid ${task.status === 'Completed' ? '#1db954' : '#666'}`, background: task.status === 'Completed' ? '#1db954' : 'transparent', cursor: 'pointer' }}
              />
              <button onClick={() => onOpen(task.id)} style={{ minWidth: 0, border: 'none', background: 'transparent', textAlign: 'left', cursor: 'pointer', padding: 0 }}>
                <span style={{ display: 'block', color: '#fff', fontSize: 14, fontWeight: 900, marginBottom: 5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{task.title}</span>
                <span style={{ display: 'block', color: '#6b7280', fontSize: 12, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {task.description || 'No description'} — created by {task.assignee || currentUser}
                </span>
              </button>
              <button onClick={() => project && onWorkflowSelect(project.id)} style={{ border: '1px solid rgba(29,185,84,.28)', borderRadius: 999, background: 'rgba(29,185,84,.1)', color: '#1db954', padding: '7px 10px', fontSize: 12, fontWeight: 900, cursor: project ? 'pointer' : 'default', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textAlign: 'left' }}>
                {project?.name || 'No workflow'}
              </button>
              <span style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                <Avatar name={primaryAssignee} size={32} />
                <span style={{ minWidth: 0 }}>
                  <span style={{ display: 'block', color: '#f5f5f5', fontSize: 13, fontWeight: 800, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{primaryAssignee}</span>
                  <span style={{ display: 'block', color: '#777', fontSize: 12, marginTop: 2 }}>@{primaryAssignee.split(' ')[0]?.toLowerCase()} · CEO</span>
                </span>
              </span>
              <span style={{ display: 'grid', gap: 4 }}>
                <span style={{ color: '#6b7280', fontSize: 10, fontWeight: 900 }}>STAGE:</span>
                <span style={{ color: '#f5f5f5', fontSize: 12, fontWeight: 900, textTransform: 'uppercase' }}>{stageName(task)}</span>
              </span>
              <span style={{ display: 'grid', gap: 4 }}>
                <span style={{ color: '#6b7280', fontSize: 10, fontWeight: 900 }}>PRIORITY:</span>
                <span style={{ color: priorityColor, fontSize: 12, fontWeight: 900, textTransform: 'uppercase' }}>{displayPriority}</span>
              </span>
              <span style={{ display: 'grid', gap: 4 }}>
                <span style={{ color: '#6b7280', fontSize: 10, fontWeight: 900 }}>DEADLINE:</span>
                <span style={{ color: typeof deadline === 'string' ? '#777' : deadline.color, fontSize: 12, fontWeight: 900 }}>{typeof deadline === 'string' ? deadline : deadline.label}</span>
              </span>
              <button onClick={() => onOpen(task.id)} style={{ border: '1px solid #252525', borderRadius: 8, background: '#121212', color: '#aaa', padding: '8px 10px', fontSize: 12, fontWeight: 800, cursor: 'pointer' }}>Open</button>
            </div>
          )
        })}
        <button onClick={onAdd} style={{ width: '100%', minHeight: 40, border: 'none', background: '#121212', color: '#555', display: 'flex', alignItems: 'center', gap: 8, padding: '0 48px', cursor: 'pointer', fontSize: 13 }}>
          <Plus size={14} /> Add task
        </button>
      </div>

      <div style={{ height: 58, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 36, color: '#555', fontSize: 14 }}>
        <ChevronRight size={17} style={{ transform: 'rotate(180deg)' }} />
        <span>Page 1</span>
        <ChevronRight size={17} />
      </div>
    </div>
  )
}

function ReminderSummary({ stats }: { stats: { overdue: number; today: number; upcoming: number } }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 22, flexWrap: 'wrap' }}>
      {[
        { label: 'Overdue', value: stats.overdue, dot: '#ef4444' },
        { label: 'Due today', value: stats.today, dot: '#1db954' },
        { label: 'Upcoming', value: stats.upcoming, dot: '#3b82f6' },
      ].map(s => (
        <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: 7, background: '#1a1a1a', border: '1px solid #282828', borderRadius: 8, padding: '6px 12px' }}>
          <span style={{ width: 7, height: 7, borderRadius: '50%', background: s.dot, flexShrink: 0 }} />
          <span style={{ color: '#888', fontSize: 12, fontWeight: 600 }}>{s.label}</span>
          <strong style={{ color: '#f5f5f5', fontSize: 13, fontWeight: 700 }}>{s.value}</strong>
        </div>
      ))}
    </div>
  )
}

function EmptyState() {
  return (
    <div style={{ border: '1px dashed #535353', borderRadius: 14, padding: '54px 20px', textAlign: 'center', color: '#b3b3b3', background: '#121212' }}>
      <ListTodo size={42} color="#535353" />
      <div style={{ marginTop: 14, fontSize: 17, color: '#f5f5f5', fontWeight: 700 }}>No tasks found</div>
      <div style={{ marginTop: 6, fontSize: 13, fontWeight: 600 }}>Add a manual task or approve a client request to assign work.</div>
    </div>
  )
}

function SimpleMyJobsView({
  tasks,
  projectById,
  status,
  search,
  currentUser,
  onStatus,
  onSearch,
  onOpen,
  onCreate,
}: {
  tasks: AssignedTask[]
  projectById: Map<number, ProjectRecord>
  status: 'All' | TaskStatus
  search: string
  currentUser: string
  onStatus: (status: 'All' | TaskStatus) => void
  onSearch: (value: string) => void
  onOpen: (id: number) => void
  onCreate: () => void
}) {
  const [tab, setTab] = useState<'assigned' | 'created' | 'following' | 'team'>('assigned')
  const pageTasks = tasks.filter(task => {
    if (tab === 'assigned') return true
    if (tab === 'created') return task.assignee === currentUser || taskAssigneeNames(task).includes(currentUser)
    if (tab === 'following') return task.assignees?.includes(currentUser) || task.assignee === currentUser
    return true
  })
  const statusFilters: Array<{ label: string; value: 'All' | TaskStatus }> = [
    { label: 'ALL', value: 'All' },
    { label: 'DONE', value: 'Completed' },
    { label: 'ACTIVE', value: 'In Progress' },
    { label: 'FAILED', value: 'Completed' },
    { label: 'OVERDUE', value: 'Open' },
  ]

  const stageName = (task: AssignedTask) => {
    const project = projectById.get(task.projectId)
    const stage = getProjectStages(project).find(item => item.id === task.stageId)
    return stage?.name || (task.status === 'Completed' ? 'Done' : task.status === 'In Progress' ? 'Active' : 'Open')
  }

  return (
    <div className="my-jobs-simple-view" style={{ minHeight: 'calc(100vh - 42px)', background: '#fff', color: '#111', fontFamily: font }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', padding: '18px 20px 0', borderBottom: '1px solid #d8d8d8' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
          <ClipboardList size={22} color="#777" style={{ marginTop: 1 }} />
          <div>
            <div style={{ margin: 0, color: '#111', fontSize: 25, fontWeight: 900, lineHeight: 1, fontFamily: displayFont }}>List of jobs</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 24, marginTop: 16 }}>
              {[
                ['assigned', 'ASSIGNED TO ME'],
                ['created', 'CREATED BY ME'],
                ['following', 'FOLLOWING'],
                ['team', 'JOBS OF MY TEAM'],
              ].map(([key, label]) => {
                const active = tab === key
                return (
                  <button key={key} onClick={() => setTab(key as typeof tab)} style={{ height: 30, border: 'none', borderBottom: active ? '1px solid #111' : '1px solid transparent', background: 'transparent', color: active ? '#111' : '#a0a0a0', fontSize: 12, fontWeight: 800, cursor: 'pointer', padding: 0 }}>
                    {label}
                  </button>
                )
              })}
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, width: 150, height: 32, border: '1px solid #d6d6d6', background: '#fff', padding: '0 10px' }}>
            <input value={search} onChange={event => onSearch(event.target.value)} placeholder="Search jobs" style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', color: '#333', fontSize: 13 }} />
            <Search size={15} color="#777" />
          </label>
          <button style={simpleMyJobsButtonStyle}>Filter <ChevronRight size={14} /></button>
          <button onClick={onCreate} style={simpleMyJobsButtonStyle}>Actions <ChevronDown size={14} /></button>
        </div>
      </div>

      <div style={{ height: 46, background: '#f4f4f4', borderBottom: '1px solid #d8d8d8', display: 'flex', alignItems: 'center', padding: '0 18px' }}>
        <span style={{ color: '#8b8b8b', fontSize: 16 }}>List of jobs</span>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 26 }}>
          {statusFilters.map(item => {
            const active = status === item.value || (item.label === 'FAILED' && false)
            return (
              <button key={item.label} onClick={() => onStatus(item.value)} style={{ border: 'none', background: 'transparent', color: active ? '#1db954' : '#8a8a8a', fontSize: 12, fontWeight: 800, cursor: 'pointer' }}>
                {item.label}
              </button>
            )
          })}
        </div>
      </div>

      <div>
        {pageTasks.length === 0 ? (
          <div style={{ padding: 36, color: '#999', fontSize: 14 }}>No jobs found.</div>
        ) : pageTasks.map(task => {
          const project = projectById.get(task.projectId)
          const assignees = taskAssigneeNames(task)
          const due = task.dueDate ? new Date(`${task.dueDate}T19:28:00`) : null
          return (
            <button key={task.id} onClick={() => onOpen(task.id)} style={{ width: '100%', minHeight: 66, border: 'none', borderBottom: '1px solid #e1e1e1', background: '#fff', color: '#111', display: 'grid', gridTemplateColumns: '42px minmax(360px, 1fr) 86px 200px 150px 150px', alignItems: 'center', gap: 12, padding: '10px 18px', textAlign: 'left', cursor: 'pointer' }}>
              <span style={{ width: 19, height: 15, border: '1px solid #9a9a9a', borderRadius: 4, display: 'block' }} />
              <span style={{ minWidth: 0 }}>
                <span style={{ display: 'block', color: '#111', fontSize: 15, fontWeight: 900, marginBottom: 5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{task.title}</span>
                <span style={{ display: 'block', color: '#56616a', fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  » {project?.name || 'NO WORKFLOW'} · {task.description || 'No description'} — created by {task.assignee || currentUser} at {task.createdAt ? new Date(task.createdAt).toLocaleDateString('en-GB').replace(/\//g, '-') : ''}
                </span>
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                {[0, 1, 2].map(index => <span key={index} style={{ width: 16, height: 16, borderRadius: '50%', background: '#4ebe3c', border: '1px solid #2c9824' }} />)}
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                <Avatar name={assignees[0] || currentUser} size={40} />
                <span style={{ minWidth: 0 }}>
                  <span style={{ display: 'block', color: '#111', fontSize: 13, fontWeight: 800, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{assignees[0] || currentUser}</span>
                  <span style={{ display: 'block', color: '#777', fontSize: 12, marginTop: 2 }}>@{(assignees[0] || currentUser).split(' ')[0]?.toLowerCase()} · CEO</span>
                </span>
              </span>
              <span style={{ display: 'grid', gap: 4 }}>
                <span style={{ color: '#9ba3aa', fontSize: 11, fontWeight: 800 }}>STAGE:</span>
                <span style={{ color: '#111', fontSize: 13, fontWeight: 800, textTransform: 'uppercase' }}>{stageName(task)}</span>
              </span>
              <span style={{ display: 'grid', gap: 4 }}>
                <span style={{ color: '#9ba3aa', fontSize: 11, fontWeight: 800 }}>DEADLINE:</span>
                <span style={{ color: '#111', fontSize: 13, fontWeight: 800 }}>{due ? `19:28 ${String(due.getDate()).padStart(2, '0')}-${String(due.getMonth() + 1).padStart(2, '0')}-${due.getFullYear()}` : '-'}</span>
              </span>
            </button>
          )
        })}
      </div>

      <div style={{ height: 58, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 36, color: '#7c8791', fontSize: 14 }}>
        <ChevronRight size={17} style={{ transform: 'rotate(180deg)' }} />
        <span>Page 1</span>
        <ChevronRight size={17} />
      </div>
    </div>
  )
}

const simpleMyJobsButtonStyle = {
  height: 32,
  border: '1px solid #d6d6d6',
  borderRadius: 3,
  background: '#fff',
  color: '#111',
  padding: '0 13px',
  display: 'inline-flex',
  alignItems: 'center',
  gap: 7,
  fontSize: 13,
  fontWeight: 800,
  cursor: 'pointer',
}

function TaskTable({ title, color, tasks, projectById, comments, onOpen, onStatus, onDelete, onAdd, onTaskUpdate, people, customColumns, onColumnAdd, onColumnRemove }: {
  title: string
  color: string
  tasks: AssignedTask[]
  projectById: Map<number, ProjectRecord>
  comments: TaskComment[]
  onOpen: (id: number) => void
  onStatus: (id: number, status: TaskStatus) => void
  onDelete: (id: number) => void
  onAdd: () => void
  onTaskUpdate: (id: number, updates: Partial<AssignedTask>) => void
  people: string[]
  customColumns: CustomColumn[]
  onColumnAdd: (col: CustomColumn) => void
  onColumnRemove: (id: string) => void
}) {
  const [editingCell, setEditingCell] = useState<{ taskId: number; col: string } | null>(null)
  const [cellDraft, setCellDraft] = useState('')
  const [assigneePickerTaskId, setAssigneePickerTaskId] = useState<number | null>(null)
  const assigneePickerRef = useRef<HTMLDivElement>(null)
  const [showFieldsPanel, setShowFieldsPanel] = useState(false)
  const [fieldsPanelPos, setFieldsPanelPos] = useState<{ top: number; right: number } | null>(null)
  const [fieldSearch, setFieldSearch] = useState('')
  const [fieldsTab, setFieldsTab] = useState<'create' | 'existing'>('create')
  const fieldsPanelRef = useRef<HTMLDivElement>(null)
  const addColBtnRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (assigneePickerTaskId === null) return
    const h = (e: MouseEvent) => {
      if (assigneePickerRef.current && !assigneePickerRef.current.contains(e.target as Node))
        setAssigneePickerTaskId(null)
    }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [assigneePickerTaskId])

  useEffect(() => {
    if (!showFieldsPanel) return
    const h = (e: MouseEvent) => {
      if (
        fieldsPanelRef.current && !fieldsPanelRef.current.contains(e.target as Node) &&
        addColBtnRef.current && !addColBtnRef.current.contains(e.target as Node)
      ) { setShowFieldsPanel(false); setFieldsPanelPos(null) }
    }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [showFieldsPanel])

  const commitCell = (taskId: number, col: string, value: string) => {
    const keyMap: Partial<Record<string, keyof AssignedTask>> = {
      name: 'title', startDate: 'startDate', dueDate: 'dueDate',
    }
    if (keyMap[col]) onTaskUpdate(taskId, { [keyMap[col]!]: value } as Partial<AssignedTask>)
    setEditingCell(null)
  }

  const gridCols = [
    '42px',
    'minmax(320px, 1.5fr)',
    '150px',
    '150px',
    '120px',
    '150px',
    '150px',
    '170px',
    ...customColumns.map(c => `${c.width}px`),
    '48px',
    '58px',
  ].join(' ')

  const inlineCellInput = (taskId: number, col: string, type: string = 'text') => (
    <input
      autoFocus
      type={type}
      value={cellDraft}
      onChange={e => setCellDraft(e.target.value)}
      onBlur={() => commitCell(taskId, col, cellDraft)}
      onKeyDown={e => {
        if (e.key === 'Enter') commitCell(taskId, col, cellDraft)
        if (e.key === 'Escape') setEditingCell(null)
      }}
      style={{ width: '100%', background: 'transparent', border: 'none', borderBottom: '1px solid #1db954', outline: 'none', color: '#f5f5f5', fontSize: 12, fontWeight: 700, fontFamily: font, padding: 0 }}
    />
  )

  return (
    <section style={{ border: '1px solid #282828', borderRadius: 14, background: '#121212', overflow: 'hidden', position: 'relative' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '14px 16px', borderBottom: '1px solid #282828' }}>
        <span style={{ width: 10, height: 10, borderRadius: '50%', background: color }} />
        <h2 style={{ margin: 0, color: '#f5f5f5', fontSize: 15, fontWeight: 700 }}>{title}</h2>
        <span style={{ color: '#b3b3b3', fontSize: 12, fontWeight: 700 }}>{tasks.length} tasks</span>
      </div>
      <div style={{ overflowX: 'auto' }}>
        <div style={{ minWidth: 1108 + customColumns.length * 150 }}>
          {/* Header row */}
          <div style={{ display: 'grid', gridTemplateColumns: gridCols, color: '#b3b3b3', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', borderBottom: '1px solid #282828' }}>
            {['', 'Name', 'Assignee', 'Status', 'Priority', 'Start Date', 'Due Date', 'Task Type'].map(h => (
              <div key={h} style={tableCellStyle}>{h}</div>
            ))}
            {customColumns.map(col => (
              <div key={col.id} style={{ ...tableCellStyle, justifyContent: 'space-between' }}>
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{col.name.toUpperCase()}</span>
                <button onClick={() => onColumnRemove(col.id)} title={`Remove ${col.name}`} style={{ border: 'none', background: 'transparent', color: '#535353', cursor: 'pointer', display: 'grid', placeItems: 'center', padding: 0, flexShrink: 0 }}>
                  <X size={11} />
                </button>
              </div>
            ))}
            <div style={{ ...tableCellStyle, justifyContent: 'center' }}>
              <button ref={addColBtnRef} onClick={() => {
                  if (showFieldsPanel) { setShowFieldsPanel(false); return }
                  const rect = addColBtnRef.current?.getBoundingClientRect()
                  if (rect) setFieldsPanelPos({ top: rect.bottom + 8, right: window.innerWidth - rect.right })
                  setShowFieldsPanel(true)
                }} title="Add column" style={{ width: 28, height: 28, borderRadius: '50%', border: '1px solid #535353', background: '#121212', color: '#b3b3b3', display: 'grid', placeItems: 'center', cursor: 'pointer' }}>
                <Plus size={14} />
              </button>
            </div>
            <div style={tableCellStyle} />
          </div>

          {/* Task rows */}
          {tasks.map(task => {
            const project = projectById.get(task.projectId)
            const due = dueMeta(task)
            const type = taskType(task)
            const attachmentCount = comments.filter(c => c.taskId === task.id).reduce((s, c) => s + (c.attachments?.length || 0), 0)
            const displayStartDate = task.startDate
              ? formatDate(task.startDate)
              : task.createdAt ? new Date(task.createdAt).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' }) : '-'
            const displayPriority = task.priority ?? taskPriority(task).label as TaskPriority
            const priorityColor = priorityColors[displayPriority as TaskPriority] ?? taskPriority(task).color
            const isEditingName = editingCell?.taskId === task.id && editingCell?.col === 'name'
            const isEditingStart = editingCell?.taskId === task.id && editingCell?.col === 'startDate'
            const isEditingDue = editingCell?.taskId === task.id && editingCell?.col === 'dueDate'
            const isEditingPriority = editingCell?.taskId === task.id && editingCell?.col === 'priority'
            const assignedNames = taskAssigneeNames(task)

            return (
              <div key={task.id} onClick={() => onOpen(task.id)} style={{ display: 'grid', gridTemplateColumns: gridCols, minHeight: 48, borderBottom: '1px solid #282828', cursor: 'pointer' }}>
                {/* Status icon */}
                <div style={{ ...tableCellStyle, display: 'grid', placeItems: 'center' }}>
                  {task.status === 'Completed' ? <CheckCircle2 size={17} color="#1ed760" /> : <Circle size={17} color="#535353" />}
                </div>

                {/* Name — inline editable */}
                <div style={{ ...tableCellStyle, minWidth: 0 }} onClick={e => { e.stopPropagation(); setEditingCell({ taskId: task.id, col: 'name' }); setCellDraft(task.title) }}>
                  {isEditingName ? inlineCellInput(task.id, 'name') : (
                    <>
                      <div style={{ color: '#f5f5f5', fontSize: 13, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{task.title}</div>
                      <div style={{ color: '#b3b3b3', fontSize: 12, marginTop: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{project?.name || 'No project'}{task.description ? ` - ${task.description}` : ''}</div>
                    </>
                  )}
                </div>

                {/* Assignee — avatar + floating picker */}
                <div style={{ ...tableCellStyle, position: 'relative', overflow: 'visible' }} onClick={e => { e.stopPropagation(); setAssigneePickerTaskId(task.id) }}>
                  <div style={{ display: 'flex', alignItems: 'center', minWidth: 0 }}>
                    {assignedNames.slice(0, 3).map((name, index) => (
                      <span key={name} title={name} style={{ display: 'inline-flex', marginLeft: index > 0 ? -7 : 0, borderRadius: '50%', border: '2px solid #191919', zIndex: 3 - index }}>
                        <Avatar name={name} size={24} />
                      </span>
                    ))}
                    {assignedNames.length > 3 && (
                      <span title={assignedNames.slice(3).join(', ')} style={{ width: 24, height: 24, marginLeft: -7, borderRadius: '50%', border: '2px solid #191919', background: '#2a2a2a', color: '#b3b3b3', display: 'inline-grid', placeItems: 'center', fontSize: 10, fontWeight: 800 }}>
                        +{assignedNames.length - 3}
                      </span>
                    )}
                  </div>
                  {assigneePickerTaskId === task.id && (
                    <div ref={assigneePickerRef} style={{ position: 'absolute', top: '100%', left: 0, zIndex: 200, background: '#1e1e1e', border: '1px solid #333', borderRadius: 10, width: 200, boxShadow: '0 8px 24px rgba(0,0,0,.5)', overflow: 'hidden', marginTop: 4 }}>
                      <div style={{ padding: '4px 0' }}>
                        {people.map(name => (
                          <div key={name} onClick={e => { e.stopPropagation(); onTaskUpdate(task.id, { assignee: name, assignees: [name] }); setAssigneePickerTaskId(null) }}
                            style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '7px 12px', cursor: 'pointer', background: name === task.assignee ? '#282828' : 'transparent' }}
                            onMouseEnter={ev => (ev.currentTarget as HTMLDivElement).style.background = '#282828'}
                            onMouseLeave={ev => (ev.currentTarget as HTMLDivElement).style.background = name === task.assignee ? '#282828' : 'transparent'}
                          >
                            <Avatar name={name} size={22} />
                            <span style={{ fontSize: 13, color: '#ccc' }}>{name}</span>
                            {name === task.assignee && <span style={{ marginLeft: 'auto', color: '#1db954', fontSize: 11, fontWeight: 700 }}>✓</span>}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Status — existing select */}
                <div style={tableCellStyle} onClick={e => e.stopPropagation()}>
                  <select value={task.status} onChange={e => onStatus(task.id, e.target.value as TaskStatus)} style={{ width: '100%', border: 'none', borderRadius: 0, background: statusColors[task.status].text, color: '#191414', height: 31, fontWeight: 700, fontFamily: font, textAlign: 'center' }}>
                    {statusOrder.map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>

                {/* Priority — inline dropdown */}
                <div style={{ ...tableCellStyle, position: 'relative', overflow: 'visible', display: 'flex', alignItems: 'center', gap: 6, color: priorityColor, cursor: 'pointer' }}
                  onClick={e => { e.stopPropagation(); setEditingCell({ taskId: task.id, col: 'priority' }) }}>
                  <Flag size={15} fill={priorityColor} />{displayPriority}
                  {isEditingPriority && (
                    <div style={{ position: 'absolute', top: '100%', left: 0, zIndex: 200, background: '#1e1e1e', border: '1px solid #333', borderRadius: 10, width: 150, boxShadow: '0 8px 24px rgba(0,0,0,.5)', overflow: 'hidden', marginTop: 4 }}>
                      {(['Urgent', 'High', 'Normal', 'Low'] as TaskPriority[]).map(p => (
                        <div key={p} onClick={e => { e.stopPropagation(); onTaskUpdate(task.id, { priority: p }); setEditingCell(null) }}
                          style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', cursor: 'pointer', color: priorityColors[p], fontSize: 13, fontWeight: 700 }}
                          onMouseEnter={ev => (ev.currentTarget as HTMLDivElement).style.background = '#282828'}
                          onMouseLeave={ev => (ev.currentTarget as HTMLDivElement).style.background = 'transparent'}
                        >
                          <Flag size={14} fill={priorityColors[p]} />{p}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Start Date — inline date input */}
                <div style={{ ...tableCellStyle, color: '#b3b3b3', cursor: 'pointer' }}
                  onClick={e => { e.stopPropagation(); setEditingCell({ taskId: task.id, col: 'startDate' }); setCellDraft(task.startDate || '') }}>
                  {isEditingStart ? inlineCellInput(task.id, 'startDate', 'date') : displayStartDate}
                </div>

                {/* Due Date — inline date input */}
                <div style={{ ...tableCellStyle, color: due.text, cursor: 'pointer' }}
                  onClick={e => { e.stopPropagation(); setEditingCell({ taskId: task.id, col: 'dueDate' }); setCellDraft(task.dueDate || '') }}>
                  {isEditingDue ? inlineCellInput(task.id, 'dueDate', 'date') : due.label}
                </div>

                {/* Task Type — read-only */}
                <div style={{ ...tableCellStyle, background: type.color, color: type.color === '#1db954' ? '#191414' : '#fff', fontWeight: 700, justifyContent: 'center' }}>
                  {type.label}{attachmentCount ? ` · ${attachmentCount}` : ''}
                </div>

                {/* Custom column cells */}
                {customColumns.map(col => {
                  const val = task.customFields?.[col.id] ?? ''
                  const isEditing = editingCell?.taskId === task.id && editingCell?.col === col.id
                  const saveCustom = (v: string) => {
                    onTaskUpdate(task.id, { customFields: { ...task.customFields, [col.id]: v } })
                    setEditingCell(null)
                  }
                  return (
                    <div key={col.id} style={{ ...tableCellStyle, position: 'relative', overflow: 'visible', cursor: 'pointer' }}
                      onClick={e => { e.stopPropagation(); if (col.type !== 'checkbox') { setEditingCell({ taskId: task.id, col: col.id }); setCellDraft(val) } }}>
                      {col.type === 'checkbox' ? (
                        <input type="checkbox" checked={val === 'true'} onChange={e => { e.stopPropagation(); onTaskUpdate(task.id, { customFields: { ...task.customFields, [col.id]: e.target.checked ? 'true' : 'false' } }) }} style={{ cursor: 'pointer' }} />
                      ) : isEditing ? (
                        <input
                          autoFocus
                          type={col.type === 'number' || col.type === 'money' ? 'number' : col.type === 'date' ? 'date' : 'text'}
                          value={cellDraft}
                          onChange={e => setCellDraft(e.target.value)}
                          onBlur={() => saveCustom(cellDraft)}
                          onKeyDown={e => { if (e.key === 'Enter') saveCustom(cellDraft); if (e.key === 'Escape') setEditingCell(null) }}
                          style={{ width: '100%', background: 'transparent', border: 'none', borderBottom: '1px solid #1db954', outline: 'none', color: '#f5f5f5', fontSize: 12, fontWeight: 700, fontFamily: font, padding: 0 }}
                        />
                      ) : (
                        <span style={{ color: val ? '#f5f5f5' : '#555' }}>{val || '—'}</span>
                      )}
                    </div>
                  )
                })}

                {/* + column placeholder */}
                <div style={tableCellStyle} />

                {/* Delete */}
                <div style={{ ...tableCellStyle, justifyContent: 'center' }} onClick={e => e.stopPropagation()}>
                  <button onClick={() => onDelete(task.id)} style={{ border: 'none', background: 'transparent', color: '#b3b3b3', cursor: 'pointer', display: 'grid', placeItems: 'center' }} aria-label={`Delete ${task.title}`}>
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            )
          })}
          <button onClick={onAdd} style={{ width: '100%', border: 'none', background: '#121212', color: '#b3b3b3', padding: '12px 54px', textAlign: 'left', cursor: 'pointer', fontFamily: font }}>+ Add task</button>
        </div>
      </div>

      {/* Fields panel — fixed so it escapes any overflow:hidden parent */}
      {showFieldsPanel && fieldsPanelPos && (
        <div ref={fieldsPanelRef} style={{ position: 'fixed', top: fieldsPanelPos.top, right: fieldsPanelPos.right, zIndex: 9999, background: '#1e1e1e', border: '1px solid #333', borderRadius: 12, width: 300, boxShadow: '0 12px 32px rgba(0,0,0,.6)', overflow: 'hidden' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', borderBottom: '1px solid #2a2a2a' }}>
            <span style={{ color: '#f5f5f5', fontWeight: 700, fontSize: 14, fontFamily: font }}>Fields</span>
            <button onClick={() => setShowFieldsPanel(false)} style={{ border: 'none', background: 'transparent', color: '#b3b3b3', cursor: 'pointer', display: 'grid', placeItems: 'center' }}><X size={14} /></button>
          </div>
          <div style={{ padding: '8px 12px', borderBottom: '1px solid #2a2a2a' }}>
            <input value={fieldSearch} onChange={e => setFieldSearch(e.target.value)} placeholder="Search for new or existing fields"
              style={{ width: '100%', background: '#282828', border: '1px solid #333', borderRadius: 7, color: '#f5f5f5', fontSize: 12, fontFamily: font, padding: '6px 10px', outline: 'none', boxSizing: 'border-box' }} />
          </div>
          <div style={{ display: 'flex', borderBottom: '1px solid #2a2a2a' }}>
            {(['create', 'existing'] as const).map(t => (
              <button key={t} onClick={() => setFieldsTab(t)} style={{ flex: 1, border: 'none', background: 'transparent', color: fieldsTab === t ? '#f5f5f5' : '#555', fontWeight: 700, fontSize: 13, fontFamily: font, padding: '10px', borderBottom: fieldsTab === t ? '2px solid #1db954' : '2px solid transparent', cursor: 'pointer' }}>
                {t === 'create' ? 'Create new' : 'Add existing'}
              </button>
            ))}
          </div>
          <div style={{ maxHeight: 380, overflowY: 'auto', padding: '8px 0' }}>
            {fieldsTab === 'create'
              ? <FieldsCreateTab search={fieldSearch} onAdd={col => { onColumnAdd(col); setShowFieldsPanel(false) }} />
              : <FieldsExistingTab customColumns={customColumns} onRemove={onColumnRemove} />
            }
          </div>
        </div>
      )}
    </section>
  )
}

function ReworkListView({
  tasks,
  projectById,
  onOpen,
  onDelete,
  onStatus,
  onTaskUpdate,
  onAdd,
}: {
  tasks: AssignedTask[]
  projectById: Map<number, ProjectRecord>
  onOpen: (id: number) => void
  onDelete: (id: number) => void
  onStatus: (id: number, status: TaskStatus) => void
  onTaskUpdate: (id: number, updates: Partial<AssignedTask>) => void
  onAdd: () => void
}) {
  const [collapsed, setCollapsed] = useState<Set<number | 'none'>>(new Set())
  const toggle = (key: number | 'none') =>
    setCollapsed(prev => { const n = new Set(prev); n.has(key) ? n.delete(key) : n.add(key); return n })

  if (tasks.length === 0) return <EmptyState />

  // Group by project
  const grouped: { projectId: number | null; project: ProjectRecord | undefined; tasks: AssignedTask[] }[] = []
  const seen = new Map<number | null, number>()
  tasks.forEach(task => {
    const pid = task.projectId || null
    if (!seen.has(pid)) { seen.set(pid, grouped.length); grouped.push({ projectId: pid, project: pid ? projectById.get(pid) : undefined, tasks: [] }) }
    grouped[seen.get(pid)!].tasks.push(task)
  })

  return (
    <div style={{ padding: '0 28px 40px', display: 'flex', flexDirection: 'column', gap: 6 }}>
      {grouped.map(({ projectId, project, tasks: groupTasks }) => {
        const groupKey = projectId ?? 'none'
        const isCollapsed = collapsed.has(groupKey as number | 'none')
        const dotColor = project ? spaceColor(project.name) : '#535353'

        return (
          <div key={groupKey}>
            {/* ── Group header ── */}
            <button
              onClick={() => toggle(groupKey as number | 'none')}
              style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'transparent', border: 'none', cursor: 'pointer', padding: '8px 4px', width: '100%', textAlign: 'left' }}
            >
              {isCollapsed ? <ChevronRight size={13} color="#535353" /> : <ChevronDown size={13} color="#535353" />}
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: dotColor, flexShrink: 0 }} />
              <span style={{ color: '#f0f0f0', fontSize: 13, fontWeight: 700, fontFamily: font }}>{project?.name ?? 'No Workflow'}</span>
              <span style={{ color: '#535353', fontSize: 12, fontWeight: 600 }}>{groupTasks.length} {groupTasks.length === 1 ? 'job' : 'jobs'}</span>
            </button>

            {/* ── Rows ── */}
            {!isCollapsed && (
              <div style={{ borderRadius: 10, border: '1px solid #1e1e1e', overflow: 'hidden', marginBottom: 8 }}>
                {groupTasks.map((task, i) => {
                  const due = dueMeta(task)
                  const isOverdue = due.group === 'Overdue'
                  const isDone = task.status === 'Completed'
                  const badge = clStatusBadge[task.status]
                  const assignedNames = taskAssigneeNames(task)
                  const visibleNames = assignedNames.slice(0, 3)
                  const hiddenCount = Math.max(assignedNames.length - visibleNames.length, 0)
                  const createdAt = task.createdAt
                    ? new Date(task.createdAt).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })
                    : ''

                  return (
                    <div
                      key={task.id}
                      onClick={() => onOpen(task.id)}
                      onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.background = '#1c1c1c'}
                      onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.background = i % 2 === 0 ? '#181818' : '#161616'}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 12,
                        padding: '11px 16px',
                        background: i % 2 === 0 ? '#181818' : '#161616',
                        borderBottom: i < groupTasks.length - 1 ? '1px solid #1e1e1e' : 'none',
                        cursor: 'pointer',
                        transition: 'background 0.1s',
                      }}
                    >
                      {/* Status toggle */}
                      <button
                        onClick={e => { e.stopPropagation(); onStatus(task.id, isDone ? 'Open' : task.status === 'Open' ? 'In Progress' : 'Completed') }}
                        style={{ border: 'none', background: 'transparent', cursor: 'pointer', display: 'grid', placeItems: 'center', flexShrink: 0, padding: 0 }}
                      >
                        {isDone
                          ? <CheckCircle2 size={16} color="#1db954" />
                          : task.status === 'In Progress'
                            ? <Circle size={16} color="#3b82f6" strokeWidth={2.5} />
                            : <Circle size={16} color="#535353" />}
                      </button>

                      {/* Title + breadcrumb */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <span style={{ display: 'block', color: isDone ? '#555' : '#e8e8e8', fontSize: 13, fontWeight: 600, fontFamily: displayFont, textDecoration: isDone ? 'line-through' : 'none', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {task.title}
                        </span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 2, fontSize: 11, overflow: 'hidden', whiteSpace: 'nowrap' }}>
                          {task.description && (
                            <span style={{ color: '#3a3a3a', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {task.description.length > 60 ? `${task.description.slice(0, 60)}…` : task.description}
                            </span>
                          )}
                          {createdAt && (
                            <>
                              {task.description && <span style={{ color: '#2a2a2a' }}>—</span>}
                              <span style={{ color: '#2e2e2e' }}>created {createdAt}</span>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Right metadata */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexShrink: 0 }}>
                        {/* Assignee avatars */}
                        {assignedNames.length > 0 && (
                          <div style={{ display: 'flex', alignItems: 'center' }}>
                            {visibleNames.map((name, idx) => (
                              <span key={name} title={name} style={{ display: 'inline-flex', marginLeft: idx > 0 ? -6 : 0, borderRadius: '50%', border: '2px solid #181818', zIndex: visibleNames.length - idx }}>
                                <Avatar name={name} size={22} />
                              </span>
                            ))}
                            {hiddenCount > 0 && (
                              <span style={{ width: 22, height: 22, marginLeft: -6, borderRadius: '50%', border: '2px solid #181818', background: '#2a2a2a', color: '#b3b3b3', display: 'inline-grid', placeItems: 'center', fontSize: 10, fontWeight: 800 }}>
                                +{hiddenCount}
                              </span>
                            )}
                          </div>
                        )}

                        {/* Due date */}
                        {task.dueDate ? (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, color: isOverdue ? '#ef4444' : '#888', fontSize: 12, fontWeight: 600, minWidth: 78 }}>
                            <CalendarDays size={13} />
                            {due.label.replace(/ overdue$| today$/i, '')}
                          </span>
                        ) : <span style={{ minWidth: 78 }} />}

                        {/* Stage badge */}
                        <span style={{ display: 'inline-block', padding: '3px 10px', borderRadius: 5, background: badge.bg, color: badge.color, fontSize: 11, fontWeight: 700, letterSpacing: '0.5px', textTransform: 'uppercase', fontFamily: font, minWidth: 60, textAlign: 'center' }}>
                          {task.status}
                        </span>

                        {/* Delete */}
                        <button
                          onClick={e => { e.stopPropagation(); onDelete(task.id) }}
                          style={{ border: 'none', background: 'transparent', color: '#2a2a2a', cursor: 'pointer', display: 'grid', placeItems: 'center', padding: 0 }}
                          onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.color = '#ef4444'}
                          onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.color = '#2a2a2a'}
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  )
                })}

                {/* Add job row */}
                <button
                  onClick={onAdd}
                  style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '9px 16px 9px 44px', border: 'none', background: '#141414', color: '#444', cursor: 'pointer', fontSize: 13, fontFamily: font }}
                  onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = '#b3b3b3'; (e.currentTarget as HTMLButtonElement).style.background = '#1a1a1a' }}
                  onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = '#444'; (e.currentTarget as HTMLButtonElement).style.background = '#141414' }}
                >
                  <Plus size={13} /> Add job
                </button>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

function ClickUpListView({
  tasks, projects, projectById, comments, onOpen, onDelete, onTaskUpdate, onStatus, onAdd, people, customColumns, onColumnAdd, onColumnRemove,
}: {
  tasks: AssignedTask[]
  projects: ProjectRecord[]
  projectById: Map<number, ProjectRecord>
  comments: TaskComment[]
  onOpen: (id: number) => void
  onDelete: (id: number) => void
  onTaskUpdate: (id: number, updates: Partial<AssignedTask>) => void
  onStatus: (id: number, status: TaskStatus) => void
  onAdd: (projectId: number, status: TaskStatus) => void
  people: string[]
  customColumns: CustomColumn[]
  onColumnAdd: (col: CustomColumn) => void
  onColumnRemove: (id: string) => void
}) {
  const [collapsedProjects, setCollapsedProjects] = useState<Set<number>>(new Set())
  const [collapsedStatuses, setCollapsedStatuses] = useState<Set<string>>(new Set())
  const [editingCell, setEditingCell] = useState<{ taskId: number; col: string } | null>(null)
  const [cellDraft, setCellDraft] = useState('')

  const toggleProject = (id: number) =>
    setCollapsedProjects(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })

  const toggleStatus = (key: string) =>
    setCollapsedStatuses(prev => { const n = new Set(prev); n.has(key) ? n.delete(key) : n.add(key); return n })

  const commitCell = (taskId: number, col: string, value: string) => {
    if (col === 'name') onTaskUpdate(taskId, { title: value })
    if (col === 'dueDate') onTaskUpdate(taskId, { dueDate: value })
    setEditingCell(null)
  }

  const projectGroups = useMemo(() => {
    const grouped = new Map<number, AssignedTask[]>()
    tasks.forEach(task => {
      const pid = task.projectId || 0
      if (!grouped.has(pid)) grouped.set(pid, [])
      grouped.get(pid)!.push(task)
    })
    return Array.from(grouped.entries()).map(([projectId, pts]) => ({
      project: projectById.get(projectId),
      projectId,
      statusGroups: statusOrder
        .map(s => ({ status: s, tasks: pts.filter(t => t.status === s) }))
        .filter(g => g.tasks.length > 0),
    }))
  }, [tasks, projectById])

  const gridCols = 'minmax(280px,1fr) 140px 140px 130px 44px'

  if (tasks.length === 0) return <EmptyState />

  return (
    <div style={{ background: '#191414' }}>
      {projectGroups.map(({ project, projectId, statusGroups }) => {
        const isCollapsed = collapsedProjects.has(projectId)
        const projectName = project?.name || 'No Project'
        const projectBg = spaceColor(projectName)

        return (
          <div key={projectId} style={{ marginBottom: 28 }}>
            {/* Project header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0 8px 2px' }}>
              <button onClick={() => toggleProject(projectId)} style={{ border: 'none', background: 'transparent', color: '#535353', cursor: 'pointer', display: 'grid', placeItems: 'center', padding: 2, flexShrink: 0 }}>
                {isCollapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
              </button>
              <span style={{ fontSize: 10, color: '#535353', fontWeight: 600, letterSpacing: '0.5px', textTransform: 'uppercase' }}>Team Space</span>
              <span style={{ width: 1, height: 12, background: '#2a2a2a', flexShrink: 0 }} />
              <span style={{ width: 20, height: 20, borderRadius: '50%', background: projectBg, display: 'inline-grid', placeItems: 'center', fontSize: 11, fontWeight: 800, color: '#191414', flexShrink: 0 }}>
                {projectName.charAt(0).toUpperCase()}
              </span>
              <span style={{ color: '#f5f5f5', fontSize: 14, fontWeight: 700, fontFamily: displayFont }}>{projectName}</span>
              <button title="Collapse project" onClick={() => toggleProject(projectId)} style={{ border: 'none', background: 'transparent', color: '#444', cursor: 'pointer', display: 'grid', placeItems: 'center', padding: '2px 4px', borderRadius: 4 }}
                onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.color = '#b3b3b3'}
                onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.color = '#444'}>
                <MoreHorizontal size={14} />
              </button>
            </div>

            {!isCollapsed && statusGroups.map(({ status, tasks: stTasks }) => {
              const groupKey = `${projectId}:${status}`
              const isStatusCollapsed = collapsedStatuses.has(groupKey)
              const badge = clStatusBadge[status]

              return (
                <div key={status} style={{ marginBottom: 2 }}>
                  {/* Status subgroup header */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 8px 5px 20px' }}>
                    <button onClick={() => toggleStatus(groupKey)} style={{ border: 'none', background: 'transparent', color: '#535353', cursor: 'pointer', display: 'grid', placeItems: 'center', padding: 0, flexShrink: 0 }}>
                      {isStatusCollapsed ? <ChevronRight size={12} /> : <ChevronDown size={12} />}
                    </button>
                    <span style={{ padding: '2px 9px', borderRadius: 5, background: badge.bg, color: badge.color, fontSize: 11, fontWeight: 700, letterSpacing: '0.6px', textTransform: 'uppercase', fontFamily: font }}>
                      {status}
                    </span>
                    <span style={{ color: '#535353', fontSize: 12, fontWeight: 600 }}>{stTasks.length}</span>
                  </div>

                  {!isStatusCollapsed && (
                    <div style={{ overflowX: 'auto' }}>
                      <div style={{ minWidth: 700 }}>
                        {/* Column header row */}
                        <div style={{ display: 'grid', gridTemplateColumns: gridCols, borderBottom: '1px solid #252525', padding: '0 0 0 40px' }}>
                          {['NAME', 'ASSIGNEE', 'DUE DATE', 'PRIORITY', ''].map((h, i) => (
                            <div key={i} style={{ padding: '5px 12px', fontSize: 11, fontWeight: 700, color: '#444', letterSpacing: '0.5px' }}>{h}</div>
                          ))}
                        </div>

                        {/* Task rows */}
                        {stTasks.map(task => {
                          const due = dueMeta(task)
                          const displayPriority = task.priority ?? taskPriority(task).label as TaskPriority
                          const priorityColor = priorityColors[displayPriority as TaskPriority] ?? taskPriority(task).color
                          const isEditingName = editingCell?.taskId === task.id && editingCell?.col === 'name'
                          const isEditingDue = editingCell?.taskId === task.id && editingCell?.col === 'dueDate'

                          return (
                            <div key={task.id}
                              onClick={() => onOpen(task.id)}
                              onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.background = '#1c1c1c'}
                              onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.background = 'transparent'}
                              style={{ display: 'grid', gridTemplateColumns: gridCols, borderBottom: '1px solid #1e1e1e', cursor: 'pointer', padding: '0 0 0 40px', minHeight: 42, alignItems: 'center', transition: 'background 0.1s' }}
                            >
                              {/* Name */}
                              <div onClick={e => { e.stopPropagation(); setEditingCell({ taskId: task.id, col: 'name' }); setCellDraft(task.title) }}
                                style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '0 12px 0 0' }}>
                                <button onClick={e => { e.stopPropagation(); onStatus(task.id, task.status === 'Completed' ? 'Open' : task.status === 'Open' ? 'In Progress' : 'Completed') }}
                                  style={{ border: 'none', background: 'transparent', cursor: 'pointer', display: 'grid', placeItems: 'center', flexShrink: 0, padding: 0 }}>
                                  {task.status === 'Completed'
                                    ? <CheckCircle2 size={16} color="#1db954" />
                                    : task.status === 'In Progress'
                                      ? <Circle size={16} color="#3b82f6" strokeWidth={2.5} />
                                      : <Circle size={16} color="#535353" />}
                                </button>
                                {isEditingName
                                  ? <input autoFocus value={cellDraft} onChange={e => setCellDraft(e.target.value)}
                                      onBlur={() => commitCell(task.id, 'name', cellDraft)}
                                      onKeyDown={e => { if (e.key === 'Enter') commitCell(task.id, 'name', cellDraft); if (e.key === 'Escape') setEditingCell(null) }}
                                      style={{ flex: 1, background: 'transparent', border: 'none', borderBottom: '1px solid #1db954', outline: 'none', color: '#f5f5f5', fontSize: 13, fontFamily: font, padding: 0 }} />
                                  : <span style={{ color: '#e8e8e8', fontSize: 13, fontWeight: 500 }}>{task.title}</span>
                                }
                              </div>

                              {/* Assignee */}
                              <div style={{ display: 'flex', alignItems: 'center', padding: '0 12px' }}>
                                {task.assignee
                                  ? <Avatar name={task.assignee} size={22} />
                                  : <Users size={15} color="#333" />}
                              </div>

                              {/* Due date */}
                              <div onClick={e => { e.stopPropagation(); setEditingCell({ taskId: task.id, col: 'dueDate' }); setCellDraft(task.dueDate || '') }}
                                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '0 12px' }}>
                                {isEditingDue
                                  ? <input autoFocus type="date" value={cellDraft} onChange={e => setCellDraft(e.target.value)}
                                      onBlur={() => commitCell(task.id, 'dueDate', cellDraft)}
                                      onKeyDown={e => { if (e.key === 'Enter') commitCell(task.id, 'dueDate', cellDraft); if (e.key === 'Escape') setEditingCell(null) }}
                                      style={{ background: 'transparent', border: 'none', borderBottom: '1px solid #1db954', outline: 'none', color: '#f5f5f5', fontSize: 12, colorScheme: 'dark', fontFamily: font }} />
                                  : task.dueDate
                                    ? <><CalendarDays size={13} color={due.group === 'Overdue' ? '#ef4444' : '#444'} /><span style={{ fontSize: 12, color: due.group === 'Overdue' ? '#ef4444' : '#b3b3b3', marginLeft: 4 }}>{due.label}</span></>
                                    : <CalendarDays size={14} color="#333" />}
                              </div>

                              {/* Priority */}
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '0 12px' }}>
                                <Flag size={13} color={priorityColor} fill={priorityColor} />
                                <span style={{ fontSize: 12, color: '#888' }}>{displayPriority}</span>
                              </div>

                              {/* Delete */}
                              <div onClick={e => e.stopPropagation()} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <button onClick={() => onDelete(task.id)}
                                  style={{ border: 'none', background: 'transparent', color: '#333', cursor: 'pointer', display: 'grid', placeItems: 'center', padding: 4, borderRadius: 4 }}
                                  onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.color = '#ef4444'}
                                  onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.color = '#333'}>
                                  <Trash2 size={13} />
                                </button>
                              </div>
                            </div>
                          )
                        })}

                        {/* Add task row */}
                        <button onClick={() => onAdd(projectId, status)}
                          style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '8px 12px 8px 44px', border: 'none', borderBottom: '1px solid #1e1e1e', background: 'transparent', color: '#444', cursor: 'pointer', fontSize: 13, fontFamily: font }}
                          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = '#b3b3b3'; (e.currentTarget as HTMLButtonElement).style.background = '#1c1c1c' }}
                          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = '#444'; (e.currentTarget as HTMLButtonElement).style.background = 'transparent' }}>
                          <Plus size={13} /> Add Task
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )
      })}
    </div>
  )
}

const SUGGESTED_FIELDS: Array<{ icon: string; label: string; type: ColumnFieldType }> = [
  { icon: '$', label: 'Budget Allocation', type: 'money' },
  { icon: '⊞', label: 'Client Feedback', type: 'textarea' },
  { icon: '⊞', label: 'Project Milestone', type: 'text' },
  { icon: '⊠', label: 'Completion Percentage', type: 'number' },
]

const ALL_FIELD_TYPES: Array<{ icon: string; label: string; type: ColumnFieldType | null }> = [
  { icon: '⊞', label: 'Dropdown', type: 'dropdown' },
  { icon: 'T', label: 'Text', type: 'text' },
  { icon: '📅', label: 'Date', type: 'date' },
  { icon: '⊞', label: 'Text area (Long Text)', type: 'textarea' },
  { icon: '#', label: 'Number', type: 'number' },
  { icon: '◇', label: 'Labels', type: 'labels' },
  { icon: '☐', label: 'Checkbox', type: 'checkbox' },
  { icon: '$', label: 'Money', type: 'money' },
  { icon: '🌐', label: 'Website', type: 'website' },
  { icon: '∑', label: 'Formula', type: null },
]

function FieldRow({ icon, label, onClick }: { icon: string; label: string; onClick?: () => void }) {
  return (
    <div onClick={onClick} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 14px', cursor: onClick ? 'pointer' : 'default', color: onClick ? '#ccc' : '#555', fontSize: 13, fontFamily: font }}
      onMouseEnter={ev => { if (onClick) (ev.currentTarget as HTMLDivElement).style.background = '#282828' }}
      onMouseLeave={ev => { if (onClick) (ev.currentTarget as HTMLDivElement).style.background = 'transparent' }}
    >
      <span style={{ width: 18, textAlign: 'center', fontSize: 14 }}>{icon}</span>
      <span>{label}</span>
    </div>
  )
}

function FieldsCreateTab({ search, onAdd }: { search: string; onAdd: (col: CustomColumn) => void }) {
  const createCol = (label: string, type: ColumnFieldType) =>
    onAdd({ id: `col_${Date.now()}`, name: label, type, width: 150 })
  const term = search.toLowerCase()
  const filteredSuggested = SUGGESTED_FIELDS.filter(f => f.label.toLowerCase().includes(term))
  const filteredAll = ALL_FIELD_TYPES.filter(f => f.label.toLowerCase().includes(term))
  return (
    <>
      {filteredSuggested.length > 0 && (
        <>
          <div style={{ padding: '6px 14px 3px', fontSize: 10, fontWeight: 700, color: '#555', letterSpacing: '0.8px', textTransform: 'uppercase', fontFamily: font }}>Suggested</div>
          {filteredSuggested.map(f => <FieldRow key={f.label} icon={f.icon} label={f.label} onClick={() => createCol(f.label, f.type)} />)}
          <div style={{ height: 1, background: '#2a2a2a', margin: '6px 0' }} />
        </>
      )}
      <div style={{ padding: '6px 14px 3px', fontSize: 10, fontWeight: 700, color: '#555', letterSpacing: '0.8px', textTransform: 'uppercase', fontFamily: font }}>All</div>
      {filteredAll.map(f => <FieldRow key={f.label} icon={f.icon} label={f.label} onClick={f.type ? () => createCol(f.label, f.type!) : undefined} />)}
      {filteredAll.length === 0 && filteredSuggested.length === 0 && (
        <div style={{ padding: '12px 14px', color: '#555', fontSize: 13, fontFamily: font }}>No fields match your search.</div>
      )}
    </>
  )
}

function FieldsExistingTab({ customColumns, onRemove }: { customColumns: CustomColumn[]; onRemove: (id: string) => void }) {
  if (customColumns.length === 0)
    return <div style={{ padding: '16px 14px', color: '#555', fontSize: 13, fontFamily: font }}>No custom columns yet. Create one from the "Create new" tab.</div>
  return (
    <>
      {customColumns.map(col => (
        <div key={col.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 14px' }}>
          <span style={{ color: '#ccc', fontSize: 13, fontFamily: font }}>{col.name}</span>
          <button onClick={() => onRemove(col.id)} style={{ border: 'none', background: 'transparent', color: '#535353', cursor: 'pointer', display: 'grid', placeItems: 'center' }}>
            <X size={13} />
          </button>
        </div>
      ))}
    </>
  )
}

function TaskCard({ task, project, onOpen, onDragStart, onComplete, onEdit, onDelete }: {
  task: AssignedTask
  project?: ProjectRecord
  onOpen: () => void
  onDragStart: (event: DragEvent<HTMLElement>) => void
  onComplete: () => void
  onEdit: () => void
  onDelete: () => void
}) {
  const [hovered, setHovered] = useState(false)
  const [showMore, setShowMore] = useState(false)
  const moreRef = useRef<HTMLDivElement>(null)
  const due = dueMeta(task)
  const displayPriority = task.priority ?? (taskPriority(task).label as TaskPriority)
  const priorityColor = priorityColors[displayPriority as TaskPriority] ?? taskPriority(task).color
  const isOverdue = due.group === 'Overdue'
  const assignedNames = taskAssigneeNames(task)
  const visibleAssignedNames = assignedNames.slice(0, 3)
  const hiddenAssignedCount = Math.max(assignedNames.length - visibleAssignedNames.length, 0)

  useEffect(() => {
    if (!showMore) return
    const h = (e: MouseEvent) => {
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) setShowMore(false)
    }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [showMore])

  return (
    <article
      draggable
      onDragStart={onDragStart}
      onClick={onOpen}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => { setHovered(false); setShowMore(false) }}
      style={{
        border: `1px solid ${hovered ? '#3a3a3a' : '#252525'}`,
        borderRadius: 9,
        background: hovered ? '#222' : '#1a1a1a',
        padding: '12px 14px',
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        position: 'relative',
        transition: 'background 0.12s, border-color 0.12s',
      }}
    >
      {/* Hover action buttons — top right */}
      {hovered && (
        <div
          onClick={e => e.stopPropagation()}
          style={{ position: 'absolute', top: 10, right: 10, display: 'flex', alignItems: 'center', gap: 2, background: '#2a2a2a', border: '1px solid #3a3a3a', borderRadius: 7, padding: '3px 5px' }}
        >
          <button title={task.status === 'Completed' ? 'Mark open' : 'Mark complete'} onClick={onComplete}
            style={{ border: 'none', background: 'transparent', color: task.status === 'Completed' ? '#1db954' : '#b3b3b3', cursor: 'pointer', display: 'grid', placeItems: 'center', padding: '3px 4px', borderRadius: 5 }}
            onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.color = '#1db954'}
            onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.color = task.status === 'Completed' ? '#1db954' : '#b3b3b3'}>
            <Check size={13} />
          </button>
          <button title="Add subtask" onClick={onEdit}
            style={{ border: 'none', background: 'transparent', color: '#b3b3b3', cursor: 'pointer', display: 'grid', placeItems: 'center', padding: '3px 4px', borderRadius: 5 }}
            onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.color = '#f5f5f5'}
            onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.color = '#b3b3b3'}>
            <CirclePlus size={13} />
          </button>
          <button title="Edit task" onClick={onEdit}
            style={{ border: 'none', background: 'transparent', color: '#b3b3b3', cursor: 'pointer', display: 'grid', placeItems: 'center', padding: '3px 4px', borderRadius: 5 }}
            onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.color = '#f5f5f5'}
            onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.color = '#b3b3b3'}>
            <Pencil size={13} />
          </button>
          <div ref={moreRef} style={{ position: 'relative' }}>
            <button title="More options" onClick={() => setShowMore(v => !v)}
              style={{ border: 'none', background: 'transparent', color: showMore ? '#f5f5f5' : '#b3b3b3', cursor: 'pointer', display: 'grid', placeItems: 'center', padding: '3px 4px', borderRadius: 5 }}
              onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.color = '#f5f5f5'}
              onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.color = showMore ? '#f5f5f5' : '#b3b3b3'}>
              <MoreHorizontal size={13} />
            </button>
            {showMore && (
              <div style={{ position: 'fixed', zIndex: 9999, background: '#1e1e1e', border: '1px solid #3a3a3a', borderRadius: 8, minWidth: 140, boxShadow: '0 8px 24px rgba(0,0,0,.6)', overflow: 'hidden' }}>
                <button onClick={() => { onEdit(); setShowMore(false) }}
                  style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '9px 13px', border: 'none', background: 'transparent', color: '#ccc', fontSize: 13, fontFamily: font, cursor: 'pointer', textAlign: 'left' }}
                  onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.background = '#282828'}
                  onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.background = 'transparent'}>
                  <Pencil size={13} /> Edit task
                </button>
                <button onClick={() => { onComplete(); setShowMore(false) }}
                  style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '9px 13px', border: 'none', background: 'transparent', color: '#ccc', fontSize: 13, fontFamily: font, cursor: 'pointer', textAlign: 'left' }}
                  onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.background = '#282828'}
                  onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.background = 'transparent'}>
                  <Check size={13} /> {task.status === 'Completed' ? 'Mark as open' : 'Mark complete'}
                </button>
                <div style={{ height: 1, background: '#2a2a2a', margin: '2px 0' }} />
                <button onClick={() => { onDelete(); setShowMore(false) }}
                  style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '9px 13px', border: 'none', background: 'transparent', color: '#ef4444', fontSize: 13, fontFamily: font, cursor: 'pointer', textAlign: 'left' }}
                  onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.background = '#2a1515'}
                  onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.background = 'transparent'}>
                  <Trash2 size={13} /> Delete task
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Title */}
      <span style={{ color: '#f0f0f0', fontSize: 14, fontWeight: 600, lineHeight: 1.45, fontFamily: displayFont, paddingRight: 100, minHeight: 41 }}>
        {task.title}
      </span>

      {/* Description indicator */}
      {task.description && (
        <div style={{ color: '#3a3a3a' }}>
          <AlignLeft size={14} />
        </div>
      )}

      {/* Bottom metadata row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        {assignedNames.length ? (
          <div style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }} title={assignedNames.join(', ')}>
            {visibleAssignedNames.map((name, index) => (
              <span key={name} style={{ display: 'inline-flex', marginLeft: index > 0 ? -7 : 0, borderRadius: '50%', border: '2px solid #1a1a1a', zIndex: visibleAssignedNames.length - index }}>
                <Avatar name={name} size={22} />
              </span>
            ))}
            {hiddenAssignedCount > 0 && (
              <span style={{ width: 22, height: 22, marginLeft: -7, borderRadius: '50%', border: '2px solid #1a1a1a', background: '#2a2a2a', color: '#b3b3b3', display: 'inline-grid', placeItems: 'center', fontSize: 9, fontWeight: 800, zIndex: 0 }}>
                +{hiddenAssignedCount}
              </span>
            )}
          </div>
        ) : (
          <Users size={15} color="#333" />
        )}

        {task.dueDate ? (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: isOverdue ? '#ef4444' : '#888', fontSize: 12, fontWeight: 600 }}>
            <CalendarDays size={13} />
            {due.label.replace(/ overdue$| today$/i, '')}
          </span>
        ) : (
          <CalendarDays size={14} color="#333" />
        )}

        {task.priority ? (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: priorityColor, fontSize: 12, fontWeight: 600 }}>
            <Flag size={13} fill={priorityColor} />
            {displayPriority}
          </span>
        ) : (
          <Flag size={14} color="#333" />
        )}

        <Paperclip size={14} color="#333" />
      </div>
    </article>
  )
}

function TaskDetailModal(props: {
  task: AssignedTask
  project: ProjectRecord | undefined
  changeOrder: ChangeOrderRecord | undefined
  comments: TaskComment[]
  commentBody: string
  attachments: CommentAttachment[]
  onBodyChange: (value: string) => void
  onPaste: (event: ClipboardEvent<HTMLTextAreaElement>) => void
  onFiles: (event: ChangeEvent<HTMLInputElement>) => void
  onRemoveAttachment: (id: number) => void
  onComment: () => void
  onTaskUpdate: (updates: Partial<AssignedTask>) => void
  onTaskDelete: () => void
  onTaskEdit: () => void
  onClose: () => void
  onStatus: (status: TaskStatus) => void
  people: string[]
  customColumns: CustomColumn[]
  onAddCustomColumn: (col: CustomColumn) => void
  onRemoveCustomColumn: (id: string) => void
}) {
  const [tagInput, setTagInput] = useState('')
  const [subtaskInput, setSubtaskInput] = useState('')
  const [showSubtaskInput, setShowSubtaskInput] = useState(false)
  const [newChecklistTitle, setNewChecklistTitle] = useState('')
  const [showChecklistInput, setShowChecklistInput] = useState(false)
  const [checklistItemInputs, setChecklistItemInputs] = useState<Record<number, string>>({})
  const [timeInput, setTimeInput] = useState('')
  const [showTimeInput, setShowTimeInput] = useState(false)
  const [showFullDesc, setShowFullDesc] = useState(false)
  const [showAssigneePicker, setShowAssigneePicker] = useState(false)
  const [assigneeSearch, setAssigneeSearch] = useState('')
  const [showFieldsPanel, setShowFieldsPanel] = useState(false)
  const [fieldsSearch, setFieldsSearch] = useState('')
  const [fieldsTab, setFieldsTab] = useState<'create' | 'existing'>('create')
  const [draggingFiles, setDraggingFiles] = useState(false)
  const assigneePickerRef = useRef<HTMLDivElement>(null)
  const fieldsPanelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!showAssigneePicker) return
    const handler = (e: MouseEvent) => {
      if (assigneePickerRef.current && !assigneePickerRef.current.contains(e.target as Node)) {
        setShowAssigneePicker(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [showAssigneePicker])

  useEffect(() => {
    if (!showFieldsPanel) return
    const handler = (e: MouseEvent) => {
      if (fieldsPanelRef.current && !fieldsPanelRef.current.contains(e.target as Node)) {
        setShowFieldsPanel(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [showFieldsPanel])

  const currentAssignees: string[] = props.task.assignees && props.task.assignees.length > 0
    ? props.task.assignees
    : props.task.assignee ? [props.task.assignee] : []

  const addAssignee = (name: string) => {
    if (currentAssignees.includes(name)) return
    const updated = [...currentAssignees, name]
    props.onTaskUpdate({ assignees: updated, assignee: updated[0] })
    setAssigneeSearch('')
  }

  const removeAssignee = (name: string) => {
    const updated = currentAssignees.filter(a => a !== name)
    props.onTaskUpdate({ assignees: updated, assignee: updated[0] || '' })
  }

  const assignWithAI = () => {
    const candidate = props.people.find(name => !currentAssignees.includes(name)) || props.people[0]
    if (!candidate) return
    addAssignee(candidate)
    setShowAssigneePicker(false)
  }

  const handleTaskFileUpload = (event: ChangeEvent<HTMLInputElement>) => {
    uploadTaskFiles(Array.from(event.target.files || []))
    event.target.value = ''
  }

  const uploadTaskFiles = (files: File[]) => {
    files.forEach(file => {
      const reader = new FileReader()
      reader.onload = () => {
        if (typeof reader.result !== 'string') return
        const existing = props.task.taskAttachments || []
        props.onTaskUpdate({ taskAttachments: [...existing, { id: Date.now() + Math.random(), name: file.name, type: file.type, dataUrl: reader.result as string }] })
      }
      reader.readAsDataURL(file)
    })
  }

  const cuStatusStyle: Record<TaskStatus, { label: string; color: string; bg: string }> = {
    'Open': { label: 'TO DO', color: '#7c6af7', bg: 'rgba(124,106,247,0.18)' },
    'In Progress': { label: 'IN PROGRESS', color: '#f59e0b', bg: 'rgba(245,158,11,0.18)' },
    'Completed': { label: 'DONE', color: '#1db954', bg: 'rgba(29,185,84,0.18)' },
  }
  const priorityColors: Record<TaskPriority, string> = {
    Urgent: '#ef4444', High: '#f59e0b', Normal: '#3b82f6', Low: '#6b7280',
  }

  const tags = props.task.tags || []
  const subtasks = props.task.subtasks || []
  const checklists = props.task.checklists || []
  const timeTracked = props.task.timeTracked || 0

  const addTag = () => {
    const tag = tagInput.trim()
    if (!tag || tags.includes(tag)) return
    props.onTaskUpdate({ tags: [...tags, tag] })
    setTagInput('')
  }

  const addSubtask = () => {
    const title = subtaskInput.trim()
    if (!title) return
    props.onTaskUpdate({ subtasks: [...subtasks, { id: Date.now(), title, done: false }] })
    setSubtaskInput('')
    setShowSubtaskInput(false)
  }

  const toggleSubtask = (id: number) =>
    props.onTaskUpdate({ subtasks: subtasks.map(s => s.id === id ? { ...s, done: !s.done } : s) })

  const deleteSubtask = (id: number) =>
    props.onTaskUpdate({ subtasks: subtasks.filter(s => s.id !== id) })

  const addChecklist = () => {
    const title = newChecklistTitle.trim() || 'Checklist'
    props.onTaskUpdate({ checklists: [...checklists, { id: Date.now(), title, items: [] }] })
    setNewChecklistTitle('')
    setShowChecklistInput(false)
  }

  const addChecklistItem = (clId: number) => {
    const text = (checklistItemInputs[clId] || '').trim()
    if (!text) return
    props.onTaskUpdate({
      checklists: checklists.map(c => c.id === clId
        ? { ...c, items: [...c.items, { id: Date.now(), text, done: false }] }
        : c),
    })
    setChecklistItemInputs(prev => ({ ...prev, [clId]: '' }))
  }

  const toggleChecklistItem = (clId: number, itemId: number) =>
    props.onTaskUpdate({
      checklists: checklists.map(c => c.id === clId
        ? { ...c, items: c.items.map(i => i.id === itemId ? { ...i, done: !i.done } : i) }
        : c),
    })

  const deleteChecklistItem = (clId: number, itemId: number) =>
    props.onTaskUpdate({
      checklists: checklists.map(c => c.id === clId
        ? { ...c, items: c.items.filter(i => i.id !== itemId) }
        : c),
    })

  const deleteChecklist = (clId: number) =>
    props.onTaskUpdate({ checklists: checklists.filter(c => c.id !== clId) })

  const addTime = () => {
    const val = timeInput.trim()
    let minutes = 0
    const hMatch = val.match(/(\d+)h/)
    const mMatch = val.match(/(\d+)m/)
    if (hMatch) minutes += parseInt(hMatch[1]) * 60
    if (mMatch) minutes += parseInt(mMatch[1])
    if (!hMatch && !mMatch) minutes = parseInt(val) || 0
    if (minutes > 0) props.onTaskUpdate({ timeTracked: timeTracked + minutes })
    setTimeInput('')
    setShowTimeInput(false)
  }

  const formatTime = (mins: number) => {
    const h = Math.floor(mins / 60), m = mins % 60
    return h > 0 && m > 0 ? `${h}h ${m}m` : h > 0 ? `${h}h` : `${m}m`
  }

  const writeWithAI = () => {
    const projectName = props.project?.name || 'this workflow'
    const relationship = props.changeOrder ? ` It is related to Change Order #${props.changeOrder.id}.` : ''
    const draft = `Goal: complete "${props.task.title}" for ${projectName}.${relationship}\n\nDefinition of done:\n- Confirm the required work is finished.\n- Update status, assignees, dates, and attachments as needed.\n- Leave a final activity comment with the outcome.`
    props.onTaskUpdate({ description: props.task.description.trim() ? `${props.task.description.trim()}\n\n${draft}` : draft })
    setShowFullDesc(true)
  }

  const updateCustomField = (column: CustomColumn, value: string) => {
    props.onTaskUpdate({ customFields: { ...(props.task.customFields || {}), [column.id]: value } })
  }

  const renderCustomFieldInput = (column: CustomColumn) => {
    const value = props.task.customFields?.[column.id] || ''
    const baseStyle: React.CSSProperties = { background: 'transparent', border: 'none', color: '#bbb', fontSize: 13, fontFamily: font, outline: 'none', width: '100%', padding: 0 }
    if (column.type === 'checkbox') {
      return <input type="checkbox" checked={value === 'true'} onChange={e => updateCustomField(column, e.target.checked ? 'true' : '')} />
    }
    if (column.type === 'textarea') {
      return <textarea value={value} onChange={e => updateCustomField(column, e.target.value)} placeholder="Empty" rows={2} style={{ ...baseStyle, resize: 'vertical', lineHeight: 1.5 }} />
    }
    if (column.type === 'date') {
      return <input type="date" value={value} onChange={e => updateCustomField(column, e.target.value)} style={{ ...baseStyle, colorScheme: 'dark' }} />
    }
    if (column.type === 'number' || column.type === 'money') {
      return <input type="number" value={value} onChange={e => updateCustomField(column, e.target.value)} placeholder={column.type === 'money' ? '0.00' : '0'} style={baseStyle} />
    }
    if (column.type === 'website') {
      return <input type="url" value={value} onChange={e => updateCustomField(column, e.target.value)} placeholder="https://" style={baseStyle} />
    }
    return <input value={value} onChange={e => updateCustomField(column, e.target.value)} placeholder="Empty" style={baseStyle} />
  }

  const taskIdDisplay = props.task.id.toString(36).padStart(9, '0')

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.55)', zIndex: 80, display: 'flex', justifyContent: 'flex-end' }} onClick={props.onClose}>
      <div style={{ width: 'min(1120px, 100%)', height: '100%', background: '#1a1a1a', display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 340px', overflow: 'hidden', fontFamily: font }} onClick={e => e.stopPropagation()}>

        {/* LEFT: main content */}
        <div style={{ overflow: 'auto', borderRight: '1px solid #2a2a2a' }}>
          {/* Top bar */}
          <div style={{ padding: '10px 18px', borderBottom: '1px solid #2a2a2a', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#1a1a1a', position: 'sticky', top: 0, zIndex: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#666', fontSize: 12 }}>
              <span>Task</span>
              <ChevronRight size={13} />
              <span style={{ fontFamily: 'monospace', color: '#888' }}>{taskIdDisplay}</span>
            </div>
            <button onClick={props.onClose} style={cuIconBtn} aria-label="Close"><X size={16} /></button>
          </div>

          {/* Title */}
          <div style={{ padding: '22px 24px 6px' }}>
            <input
              value={props.task.title}
              onChange={e => props.onTaskUpdate({ title: e.target.value })}
              style={{ width: '100%', background: 'transparent', border: 'none', outline: 'none', color: '#f0f0f0', fontSize: 22, fontWeight: 700, fontFamily: displayFont, letterSpacing: '-0.02em', padding: 0 }}
            />
          </div>

          {/* Fields */}
          <div style={{ padding: '4px 24px 20px' }}>
            <CuFieldRow icon={<Circle size={14} color="#555" />} label="Status">
              <div style={{ display: 'flex', gap: 4 }}>
                {statusOrder.map(s => (
                  <button key={s} onClick={() => props.onStatus(s)} style={{ border: 'none', borderRadius: 4, padding: '4px 10px', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: font, color: cuStatusStyle[s].color, background: props.task.status === s ? cuStatusStyle[s].bg : 'transparent', outline: props.task.status === s ? `1px solid ${cuStatusStyle[s].color}55` : 'none' }}>
                    {cuStatusStyle[s].label}
                  </button>
                ))}
              </div>
            </CuFieldRow>

            <CuFieldRow icon={<CalendarDays size={14} color="#555" />} label="Dates">
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#888', fontSize: 13 }}>
                <input type="date" value={props.task.startDate || ''} onChange={e => props.onTaskUpdate({ startDate: e.target.value })} style={{ background: 'transparent', border: 'none', color: props.task.startDate ? '#888' : '#555', fontFamily: font, fontSize: 13, outline: 'none', cursor: 'pointer' }} />
                <span style={{ color: '#444' }}>→</span>
                <input type="date" value={props.task.dueDate} onChange={e => props.onTaskUpdate({ dueDate: e.target.value })} style={{ background: 'transparent', border: 'none', color: '#888', fontFamily: font, fontSize: 13, outline: 'none', cursor: 'pointer' }} />
              </div>
            </CuFieldRow>

            <CuFieldRow icon={<CheckCircle2 size={14} color="#555" />} label="Track Time">
              {showTimeInput ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                  <input value={timeInput} onChange={e => setTimeInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') addTime(); if (e.key === 'Escape') setShowTimeInput(false) }} placeholder="2h 30m" autoFocus style={{ background: '#242424', border: '1px solid #333', borderRadius: 6, color: '#ccc', fontSize: 12, padding: '4px 8px', fontFamily: font, outline: 'none', width: 90 }} />
                  <button onClick={addTime} style={{ background: '#7c6af7', border: 'none', borderRadius: 5, color: '#fff', fontSize: 11, fontWeight: 700, padding: '4px 8px', cursor: 'pointer', fontFamily: font }}>Add</button>
                  <button onClick={() => setShowTimeInput(false)} style={{ background: 'transparent', border: 'none', color: '#555', cursor: 'pointer', display: 'grid', placeItems: 'center' }}><X size={13} /></button>
                </div>
              ) : (
                <button onClick={() => setShowTimeInput(true)} style={{ background: 'transparent', border: 'none', color: timeTracked ? '#bbb' : '#555', fontSize: 13, cursor: 'pointer', fontFamily: font, padding: 0 }}>
                  {timeTracked ? formatTime(timeTracked) : 'Add time'}
                </button>
              )}
            </CuFieldRow>

            {/* Assignees — avatar bubbles only with picker */}
            <div style={{ display: 'grid', gridTemplateColumns: '150px 1fr', alignItems: 'center', minHeight: 38, borderBottom: '1px solid #222' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#555', fontSize: 13, fontWeight: 600 }}>
                <Users size={14} color="#555" />Assignees
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 0', position: 'relative' }} ref={assigneePickerRef}>
                {currentAssignees.map(name => (
                  <div key={name} style={{ position: 'relative', display: 'inline-flex' }}
                    onMouseEnter={e => { const btn = (e.currentTarget as HTMLDivElement).querySelector<HTMLButtonElement>('.rm-btn'); if (btn) btn.style.opacity = '1' }}
                    onMouseLeave={e => { const btn = (e.currentTarget as HTMLDivElement).querySelector<HTMLButtonElement>('.rm-btn'); if (btn) btn.style.opacity = '0' }}
                  >
                    <Avatar name={name} size={26} />
                    <button
                      className="rm-btn"
                      onClick={() => removeAssignee(name)}
                      title={`Remove ${name}`}
                      style={{ position: 'absolute', top: -5, right: -5, width: 14, height: 14, borderRadius: '50%', background: '#444', border: '1px solid #191414', color: '#fff', fontSize: 9, display: 'grid', placeItems: 'center', cursor: 'pointer', opacity: 0, transition: 'opacity 0.15s', padding: 0 }}
                    >×</button>
                  </div>
                ))}
                <button
                  onClick={() => setShowAssigneePicker(v => !v)}
                  title="Add assignee"
                  style={{ width: 26, height: 26, borderRadius: '50%', border: '1px dashed #444', background: 'transparent', color: '#666', fontSize: 16, display: 'grid', placeItems: 'center', cursor: 'pointer' }}
                >+</button>

                {showAssigneePicker && (
                  <div style={{ position: 'absolute', top: 34, left: 0, zIndex: 200, background: '#1e1e1e', border: '1px solid #333', borderRadius: 10, width: 230, boxShadow: '0 8px 24px rgba(0,0,0,.5)', overflow: 'hidden' }}>
                    <div style={{ padding: '8px 10px', borderBottom: '1px solid #2a2a2a' }}>
                      <input
                        autoFocus
                        value={assigneeSearch}
                        onChange={e => setAssigneeSearch(e.target.value)}
                        placeholder="Search people..."
                        style={{ width: '100%', background: '#282828', border: '1px solid #333', borderRadius: 6, color: '#f5f5f5', fontSize: 12, fontFamily: font, padding: '5px 8px', outline: 'none', boxSizing: 'border-box' }}
                      />
                    </div>
                    {currentAssignees.length > 0 && (
                      <div>
                        <div style={{ padding: '6px 12px 2px', fontSize: 10, fontWeight: 700, color: '#555', letterSpacing: '0.8px', textTransform: 'uppercase' }}>Assignees</div>
                        {currentAssignees.map(name => (
                          <div key={name} onClick={() => removeAssignee(name)} style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '7px 12px', cursor: 'pointer', background: 'transparent' }}
                            onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.background = '#282828'}
                            onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.background = 'transparent'}
                          >
                            <Avatar name={name} size={22} />
                            <span style={{ fontSize: 13, color: '#ccc', flex: 1 }}>{name}</span>
                            <span style={{ fontSize: 10, color: '#1db954', fontWeight: 700 }}>✓</span>
                          </div>
                        ))}
                        <div style={{ height: 1, background: '#2a2a2a', margin: '4px 0' }} />
                      </div>
                    )}
                    <div>
                      <div style={{ padding: '6px 12px 2px', fontSize: 10, fontWeight: 700, color: '#555', letterSpacing: '0.8px', textTransform: 'uppercase' }}>People</div>
                      {props.people
                        .filter(name => !currentAssignees.includes(name) && name.toLowerCase().includes(assigneeSearch.toLowerCase()))
                        .map(name => (
                          <div key={name} onClick={() => addAssignee(name)} style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '7px 12px', cursor: 'pointer', background: 'transparent' }}
                            onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.background = '#282828'}
                            onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.background = 'transparent'}
                          >
                            <Avatar name={name} size={22} />
                            <span style={{ fontSize: 13, color: '#ccc' }}>{name}</span>
                          </div>
                        ))
                      }
                      {props.people.filter(name => !currentAssignees.includes(name) && name.toLowerCase().includes(assigneeSearch.toLowerCase())).length === 0 && (
                        <div style={{ padding: '8px 12px', fontSize: 12, color: '#555' }}>No people found</div>
                      )}
                    </div>
                    <div onClick={assignWithAI} style={{ borderTop: '1px solid #2a2a2a', padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 6, color: '#1db954', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                      <span style={{ fontSize: 14 }}>✦</span> Assign with AI
                    </div>
                  </div>
                )}
              </div>
            </div>

            <CuFieldRow icon={<Flag size={14} color="#555" />} label="Priority">
              <select value={props.task.priority || ''} onChange={e => props.onTaskUpdate({ priority: (e.target.value as TaskPriority) || undefined })} style={{ background: 'transparent', border: 'none', color: props.task.priority ? priorityColors[props.task.priority] : '#555', fontSize: 13, fontFamily: font, outline: 'none', cursor: 'pointer' }}>
                <option value="">Empty</option>
                <option value="Urgent">🔴 Urgent</option>
                <option value="High">🟠 High</option>
                <option value="Normal">🔵 Normal</option>
                <option value="Low">⚪ Low</option>
              </select>
            </CuFieldRow>

            <CuFieldRow icon={<Layers size={14} color="#555" />} label="Tags">
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap' }}>
                {tags.map(tag => (
                  <span key={tag} style={{ display: 'inline-flex', alignItems: 'center', gap: 3, background: '#2a2a2a', color: '#bbb', borderRadius: 4, padding: '2px 7px', fontSize: 11, fontWeight: 600 }}>
                    {tag}
                    <button onClick={() => props.onTaskUpdate({ tags: tags.filter(t => t !== tag) })} style={{ background: 'transparent', border: 'none', color: '#666', cursor: 'pointer', display: 'inline-flex', padding: 0 }}><X size={9} /></button>
                  </span>
                ))}
                <input value={tagInput} onChange={e => setTagInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addTag() } }} placeholder={tags.length ? '+tag' : 'Add tag...'} style={{ background: 'transparent', border: 'none', color: '#888', fontSize: 12, fontFamily: font, outline: 'none', width: tags.length ? 48 : 80, padding: 0 }} />
              </div>
            </CuFieldRow>

            <CuFieldRow icon={<Plus size={14} color="#555" />} label="Relationships">
              {(props.changeOrder || props.project) ? (
                <span style={{ background: '#2a2a2a', color: '#aaa', borderRadius: 6, padding: '3px 9px', fontSize: 12, fontWeight: 600 }}>
                  {props.changeOrder ? `Change Order #${props.changeOrder.id}` : props.project?.name}
                </span>
              ) : <span style={{ color: '#555', fontSize: 13 }}>None</span>}
            </CuFieldRow>
          </div>

          <div style={{ height: 1, background: '#242424', margin: '0 24px' }} />

          {/* Description */}
          <div style={{ padding: '18px 24px' }}>
            {(() => {
              const isLong = props.task.description.length > 250
              const collapsed = isLong && !showFullDesc
              return (
                <>
                  <div style={{ position: 'relative' }}>
                    <textarea
                      value={props.task.description}
                      onChange={e => { props.onTaskUpdate({ description: e.target.value }); if (!showFullDesc && e.target.value.length > 250) setShowFullDesc(true) }}
                      placeholder="Add description"
                      rows={collapsed ? 4 : undefined}
                      style={{ width: '100%', background: 'transparent', border: 'none', outline: 'none', color: '#aaa', fontSize: 14, fontFamily: font, resize: 'none', lineHeight: 1.7, padding: 0, overflow: collapsed ? 'hidden' : 'auto', maxHeight: collapsed ? '96px' : 'none', transition: 'max-height 0.2s' }}
                    />
                    {collapsed && (
                      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 40, background: 'linear-gradient(to bottom, transparent, #191414)' }} />
                    )}
                  </div>
                  {isLong && (
                    <button
                      onClick={() => setShowFullDesc(v => !v)}
                      style={{ width: '100%', marginTop: 6, background: '#242424', border: 'none', borderRadius: 8, color: '#b3b3b3', fontSize: 12, fontWeight: 700, fontFamily: font, padding: '8px 0', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}
                      onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.background = '#2c2c2c'}
                      onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.background = '#242424'}
                    >
                      {showFullDesc ? '∧ Show less' : '∨ Show more'}
                    </button>
                  )}
                </>
              )
            })()}
            <button onClick={writeWithAI} style={{ background: 'transparent', border: 'none', color: '#7c6af7', fontSize: 12, cursor: 'pointer', fontFamily: font, display: 'inline-flex', alignItems: 'center', gap: 5, padding: 0, marginTop: 2 }}>
              ✦ Write with AI
            </button>
          </div>

          <div style={{ height: 1, background: '#242424', margin: '0 24px' }} />

          {/* Add fields */}
          <div style={{ padding: '16px 24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <span style={{ color: '#e0e0e0', fontSize: 14, fontWeight: 700 }}>Add fields</span>
              <div ref={fieldsPanelRef} style={{ display: 'flex', gap: 6, position: 'relative' }}>
                <button onClick={() => { setShowFieldsPanel(true); setFieldsTab('existing') }} style={cuSecondaryBtn} title="Search fields"><Search size={12} /></button>
                <button onClick={() => setShowFieldsPanel(v => !v)} style={cuSecondaryBtn} aria-label="Expand">⤢</button>
                <button onClick={() => { setShowFieldsPanel(true); setFieldsTab('create') }} style={cuSecondaryBtn} title="Create field"><Plus size={12} /></button>
                {showFieldsPanel && (
                  <div style={{ position: 'absolute', top: 32, right: 0, width: 310, maxHeight: 420, overflow: 'hidden', background: '#1f1f1f', border: '1px solid #333', borderRadius: 10, boxShadow: '0 22px 50px rgba(0,0,0,.45)', zIndex: 20 }}>
                    <div style={{ padding: 10, borderBottom: '1px solid #2a2a2a' }}>
                      <input value={fieldsSearch} onChange={e => setFieldsSearch(e.target.value)} placeholder="Search fields..." autoFocus style={{ width: '100%', background: '#282828', border: '1px solid #333', borderRadius: 7, color: '#ddd', fontSize: 12, fontFamily: font, padding: '8px 10px', outline: 'none', boxSizing: 'border-box' }} />
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', borderBottom: '1px solid #2a2a2a' }}>
                      <button onClick={() => setFieldsTab('create')} style={{ border: 'none', background: fieldsTab === 'create' ? '#282828' : 'transparent', color: fieldsTab === 'create' ? '#fff' : '#777', padding: '9px 0', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: font }}>Create new</button>
                      <button onClick={() => setFieldsTab('existing')} style={{ border: 'none', background: fieldsTab === 'existing' ? '#282828' : 'transparent', color: fieldsTab === 'existing' ? '#fff' : '#777', padding: '9px 0', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: font }}>Existing</button>
                    </div>
                    <div style={{ maxHeight: 300, overflow: 'auto', padding: '6px 0' }}>
                      {fieldsTab === 'create'
                        ? <FieldsCreateTab search={fieldsSearch} onAdd={col => { props.onAddCustomColumn(col); setFieldsTab('existing') }} />
                        : <FieldsExistingTab customColumns={props.customColumns.filter(col => col.name.toLowerCase().includes(fieldsSearch.toLowerCase()))} onRemove={props.onRemoveCustomColumn} />}
                    </div>
                  </div>
                )}
              </div>
            </div>
            {props.customColumns.length > 0 && (
              <div style={{ display: 'grid', gap: 2, marginBottom: 10 }}>
                {props.customColumns.map(column => (
                  <CuFieldRow key={column.id} icon={<span style={{ color: '#555', width: 14, textAlign: 'center', fontSize: 12 }}>{column.type === 'money' ? '$' : column.type === 'number' ? '#' : column.type === 'date' ? 'D' : column.type === 'checkbox' ? '✓' : 'T'}</span>} label={column.name}>
                    {renderCustomFieldInput(column)}
                  </CuFieldRow>
                ))}
              </div>
            )}
            <button onClick={() => { setShowFieldsPanel(true); setFieldsTab('create') }} style={cuDashedBtn}>+ Create a field in this List</button>
          </div>

          <div style={{ height: 1, background: '#242424', margin: '0 24px' }} />

          {/* Subtasks */}
          <div style={{ padding: '16px 24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <span style={{ color: '#e0e0e0', fontSize: 14, fontWeight: 700 }}>Add subtask</span>
              {subtasks.length > 0 && <span style={{ color: '#555', fontSize: 12 }}>{subtasks.filter(s => s.done).length}/{subtasks.length} done</span>}
            </div>
            {subtasks.length > 0 && (
              <div style={{ marginBottom: 10 }}>
                {subtasks.map(sub => (
                  <div key={sub.id} style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '7px 0', borderBottom: '1px solid #222' }}>
                    <button onClick={() => toggleSubtask(sub.id)} style={{ background: 'transparent', border: 'none', color: sub.done ? '#1db954' : '#444', cursor: 'pointer', display: 'grid', placeItems: 'center', flexShrink: 0, padding: 0 }}>
                      {sub.done ? <CheckCircle2 size={16} /> : <Circle size={16} />}
                    </button>
                    <span style={{ color: sub.done ? '#555' : '#ccc', fontSize: 13, flex: 1, textDecoration: sub.done ? 'line-through' : 'none' }}>{sub.title}</span>
                    <button onClick={() => deleteSubtask(sub.id)} style={{ background: 'transparent', border: 'none', color: '#444', cursor: 'pointer', display: 'grid', placeItems: 'center', padding: 0 }}><X size={13} /></button>
                  </div>
                ))}
              </div>
            )}
            {showSubtaskInput ? (
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <input value={subtaskInput} onChange={e => setSubtaskInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') addSubtask(); if (e.key === 'Escape') setShowSubtaskInput(false) }} placeholder="Subtask name..." autoFocus style={{ flex: 1, background: '#242424', border: '1px solid #333', borderRadius: 7, color: '#ccc', fontSize: 13, padding: '7px 10px', fontFamily: font, outline: 'none' }} />
                <button onClick={addSubtask} style={{ background: '#7c6af7', border: 'none', borderRadius: 7, color: '#fff', fontSize: 12, fontWeight: 700, padding: '7px 12px', cursor: 'pointer', fontFamily: font }}>Add</button>
                <button onClick={() => setShowSubtaskInput(false)} style={{ background: 'transparent', border: 'none', color: '#555', cursor: 'pointer', display: 'grid', placeItems: 'center' }}><X size={14} /></button>
              </div>
            ) : (
              <button onClick={() => setShowSubtaskInput(true)} style={cuDashedBtn}><Plus size={13} /> Add Task</button>
            )}
          </div>

          <div style={{ height: 1, background: '#242424', margin: '0 24px' }} />

          {/* Checklists */}
          <div style={{ padding: '16px 24px' }}>
            <div style={{ marginBottom: 12 }}>
              <span style={{ color: '#e0e0e0', fontSize: 14, fontWeight: 700 }}>Checklists</span>
            </div>
            {checklists.map(cl => {
              const done = cl.items.filter(i => i.done).length
              const total = cl.items.length
              const pct = total > 0 ? Math.round((done / total) * 100) : 0
              return (
                <div key={cl.id} style={{ marginBottom: 14, border: '1px solid #2a2a2a', borderRadius: 10, overflow: 'hidden' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '10px 14px', background: '#1f1f1f', borderBottom: '1px solid #2a2a2a' }}>
                    <CheckCircle2 size={14} color="#555" />
                    <span style={{ color: '#ddd', fontSize: 13, fontWeight: 700, flex: 1 }}>{cl.title}</span>
                    <span style={{ color: '#555', fontSize: 11 }}>{done}/{total}</span>
                    <button onClick={() => deleteChecklist(cl.id)} style={{ background: 'transparent', border: 'none', color: '#444', cursor: 'pointer', display: 'grid', placeItems: 'center', padding: 0 }}><X size={13} /></button>
                  </div>
                  {total > 0 && (
                    <div style={{ height: 3, background: '#242424' }}>
                      <div style={{ height: '100%', width: `${pct}%`, background: '#1db954', transition: 'width 0.2s' }} />
                    </div>
                  )}
                  <div style={{ padding: '4px 0' }}>
                    {cl.items.map(item => (
                      <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '6px 14px' }}>
                        <button onClick={() => toggleChecklistItem(cl.id, item.id)} style={{ background: 'transparent', border: 'none', color: item.done ? '#1db954' : '#444', cursor: 'pointer', flexShrink: 0, padding: 0, display: 'grid', placeItems: 'center' }}>
                          {item.done ? <CheckCircle2 size={15} /> : <Circle size={15} />}
                        </button>
                        <span style={{ color: item.done ? '#555' : '#ccc', fontSize: 13, flex: 1, textDecoration: item.done ? 'line-through' : 'none' }}>{item.text}</span>
                        <button onClick={() => deleteChecklistItem(cl.id, item.id)} style={{ background: 'transparent', border: 'none', color: '#333', cursor: 'pointer', padding: 0, display: 'grid', placeItems: 'center' }}><X size={12} /></button>
                      </div>
                    ))}
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', padding: '6px 14px' }}>
                      <input value={checklistItemInputs[cl.id] || ''} onChange={e => setChecklistItemInputs(prev => ({ ...prev, [cl.id]: e.target.value }))} onKeyDown={e => { if (e.key === 'Enter') addChecklistItem(cl.id) }} placeholder="Add an item..." style={{ flex: 1, background: 'transparent', border: 'none', borderBottom: '1px solid #2a2a2a', color: '#888', fontSize: 13, padding: '4px 0', fontFamily: font, outline: 'none' }} />
                      <button onClick={() => addChecklistItem(cl.id)} style={{ background: 'transparent', border: 'none', color: '#7c6af7', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: font }}>Add</button>
                    </div>
                  </div>
                </div>
              )
            })}
            {showChecklistInput ? (
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <input value={newChecklistTitle} onChange={e => setNewChecklistTitle(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') addChecklist(); if (e.key === 'Escape') setShowChecklistInput(false) }} placeholder="Checklist name..." autoFocus style={{ flex: 1, background: '#242424', border: '1px solid #333', borderRadius: 7, color: '#ccc', fontSize: 13, padding: '7px 10px', fontFamily: font, outline: 'none' }} />
                <button onClick={addChecklist} style={{ background: '#7c6af7', border: 'none', borderRadius: 7, color: '#fff', fontSize: 12, fontWeight: 700, padding: '7px 12px', cursor: 'pointer', fontFamily: font }}>Create</button>
                <button onClick={() => setShowChecklistInput(false)} style={{ background: 'transparent', border: 'none', color: '#555', cursor: 'pointer', display: 'grid', placeItems: 'center' }}><X size={14} /></button>
              </div>
            ) : (
              <button onClick={() => setShowChecklistInput(true)} style={cuDashedBtn}><Plus size={13} /> Create checklist</button>
            )}
          </div>

          <div style={{ height: 1, background: '#242424', margin: '0 24px' }} />

          {/* Attachments */}
          <div style={{ padding: '16px 24px 48px' }}>
            <div style={{ marginBottom: 12 }}>
              <span style={{ color: '#e0e0e0', fontSize: 14, fontWeight: 700 }}>Attachments</span>
              {(props.task.taskAttachments || []).length > 0 && (
                <span style={{ color: '#555', fontSize: 12, marginLeft: 8 }}>{(props.task.taskAttachments || []).length} file{(props.task.taskAttachments || []).length !== 1 ? 's' : ''}</span>
              )}
            </div>
            <label
              onDragEnter={e => { e.preventDefault(); setDraggingFiles(true) }}
              onDragOver={e => e.preventDefault()}
              onDragLeave={e => { e.preventDefault(); setDraggingFiles(false) }}
              onDrop={e => { e.preventDefault(); setDraggingFiles(false); uploadTaskFiles(Array.from(e.dataTransfer.files || [])) }}
              style={{ display: 'block', border: `1px dashed ${draggingFiles ? '#7c6af7' : '#333'}`, borderRadius: 8, padding: '20px', textAlign: 'center', color: draggingFiles ? '#b9afff' : '#555', fontSize: 13, cursor: 'pointer', background: draggingFiles ? 'rgba(124,106,247,0.08)' : 'transparent' }}
            >
              Drop your files here to <span style={{ color: '#7c6af7' }}>upload</span>
              <input type="file" multiple onChange={handleTaskFileUpload} style={{ display: 'none' }} />
            </label>
            {(props.task.taskAttachments || []).length > 0 && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))', gap: 10, marginTop: 12 }}>
                {(props.task.taskAttachments || []).map(file => (
                  <div key={file.id} style={{ position: 'relative', border: '1px solid #2a2a2a', borderRadius: 8, overflow: 'hidden', background: '#1f1f1f' }}>
                    {file.type.startsWith('image/') ? (
                      <a href={file.dataUrl} target="_blank" rel="noreferrer">
                        <img src={file.dataUrl} alt={file.name} style={{ width: '100%', height: 80, objectFit: 'cover', display: 'block' }} />
                      </a>
                    ) : (
                      <a href={file.dataUrl} download={file.name} style={{ display: 'grid', placeItems: 'center', height: 80, background: '#242424', textDecoration: 'none' }}>
                        <Paperclip size={24} color="#555" />
                      </a>
                    )}
                    <button onClick={() => props.onTaskUpdate({ taskAttachments: (props.task.taskAttachments || []).filter(f => f.id !== file.id) })} style={{ position: 'absolute', top: 4, right: 4, width: 20, height: 20, border: 'none', borderRadius: 4, background: 'rgba(0,0,0,.75)', color: '#fff', cursor: 'pointer', display: 'grid', placeItems: 'center' }} aria-label="Remove"><X size={10} /></button>
                    <div style={{ padding: '6px 8px' }}>
                      <div style={{ color: '#ccc', fontSize: 11, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{file.name}</div>
                      <div style={{ color: '#555', fontSize: 10, marginTop: 2, textTransform: 'uppercase' }}>{file.type.split('/')[1] || 'file'}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT: Activity panel */}
        <div style={{ display: 'grid', gridTemplateRows: 'auto 1fr auto', overflow: 'hidden' }}>
          {/* Activity header */}
          <div style={{ padding: '10px 14px', borderBottom: '1px solid #2a2a2a', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ color: '#ccc', fontSize: 13, fontWeight: 700 }}>Activity</span>
            <div style={{ display: 'flex', gap: 6 }}>
              <button onClick={props.onTaskDelete} style={{ ...cuIconBtn, color: '#e55' }} aria-label="Delete task"><Trash2 size={14} /></button>
              <button onClick={props.onClose} style={cuIconBtn} aria-label="Close"><X size={14} /></button>
            </div>
          </div>

          {/* Task links / comments list */}
          <div style={{ overflow: 'auto', padding: '14px' }}>
            {props.comments.length === 0 ? (
              <div style={{ color: '#444', fontSize: 12, textAlign: 'center', paddingTop: 24 }}>No activity yet.</div>
            ) : (
              <div style={{ display: 'grid', gap: 16 }}>
                {props.comments.map(comment => (
                  <div key={comment.id} style={{ display: 'grid', gridTemplateColumns: '30px minmax(0,1fr)', gap: 9 }}>
                    <div style={{ width: 30, height: 30, borderRadius: '50%', background: '#2a2a2a', color: '#1ed760', display: 'grid', placeItems: 'center', fontSize: 11, fontWeight: 700, flexShrink: 0 }}>
                      {(comment.author || '?').charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
                        <span style={{ color: '#ddd', fontSize: 12, fontWeight: 600 }}>{comment.author}</span>
                        <span style={{ color: '#555', fontSize: 10 }}>{new Date(comment.createdAt).toLocaleString('en-PH', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                      {comment.body && <div style={{ color: '#bbb', fontSize: 12, lineHeight: 1.6, marginTop: 5, whiteSpace: 'pre-wrap' }}>{comment.body}</div>}
                      {comment.attachments?.length ? (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 5, marginTop: 7 }}>
                          {comment.attachments.map(file => (
                            <a key={file.id} href={file.dataUrl} target="_blank" rel="noreferrer" style={{ display: 'block', borderRadius: 6, overflow: 'hidden' }}>
                              <img src={file.dataUrl} alt={file.name} style={{ width: '100%', height: 56, objectFit: 'cover', display: 'block' }} />
                            </a>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Comment input */}
          <div style={{ padding: '10px 14px', borderTop: '1px solid #2a2a2a' }}>
            <div style={{ border: '1px solid #2a2a2a', borderRadius: 10, background: '#111', overflow: 'hidden' }}>
              <textarea
                value={props.commentBody}
                onChange={e => props.onBodyChange(e.target.value)}
                onKeyDown={e => { if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') props.onComment() }}
                onPaste={props.onPaste}
                placeholder="Write a comment..."
                rows={3}
                style={{ width: '100%', background: 'transparent', border: 'none', outline: 'none', color: '#ccc', fontSize: 13, fontFamily: font, padding: '10px 12px', resize: 'none', lineHeight: 1.5 }}
              />
              {props.attachments.length > 0 && (
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', padding: '0 10px 8px' }}>
                  {props.attachments.map(file => (
                    <div key={file.id} style={{ position: 'relative', width: 56, height: 56, borderRadius: 6, overflow: 'hidden', border: '1px solid #2a2a2a', flexShrink: 0 }}>
                      {file.type.startsWith('image/') ? (
                        <img src={file.dataUrl} alt={file.name} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                      ) : (
                        <div style={{ width: '100%', height: '100%', background: '#242424', display: 'grid', placeItems: 'center' }}><Paperclip size={18} color="#555" /></div>
                      )}
                      <button onClick={() => props.onRemoveAttachment(file.id)} style={{ position: 'absolute', top: 2, right: 2, width: 16, height: 16, border: 'none', borderRadius: 3, background: 'rgba(0,0,0,.8)', color: '#fff', cursor: 'pointer', display: 'grid', placeItems: 'center', padding: 0 }}><X size={9} /></button>
                    </div>
                  ))}
                </div>
              )}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 10px', borderTop: '1px solid #2a2a2a' }}>
                <label style={{ color: '#555', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11 }} title="Attach files or images">
                  <Paperclip size={14} />
                  <input type="file" multiple onChange={props.onFiles} style={{ display: 'none' }} />
                </label>
                <button
                  onClick={props.onComment}
                  disabled={!props.commentBody.trim() && props.attachments.length === 0}
                  style={{ border: 'none', borderRadius: 6, background: props.commentBody.trim() || props.attachments.length ? '#7c6af7' : '#2a2a2a', color: '#fff', padding: '5px 12px', fontSize: 12, fontWeight: 600, cursor: props.commentBody.trim() || props.attachments.length ? 'pointer' : 'not-allowed', fontFamily: font }}
                >
                  Comment
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function CuFieldRow({ icon, label, children }: { icon: ReactNode; label: string; children: ReactNode }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '150px 1fr', alignItems: 'center', minHeight: 38, borderBottom: '1px solid #222' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#555', fontSize: 13, fontWeight: 600 }}>{icon}{label}</div>
      <div style={{ display: 'flex', alignItems: 'center', padding: '4px 0' }}>{children}</div>
    </div>
  )
}

function TaskFormModal({ draft, editing, projects, assignees, onChange, onSave, onClose }: {
  draft: TaskDraft
  editing: boolean
  projects: ProjectRecord[]
  assignees: string[]
  onChange: (draft: TaskDraft) => void
  onSave: () => void
  onClose: () => void
}) {
  const update = (field: keyof TaskDraft, value: string) => onChange({ ...draft, [field]: value })

  const fieldLabel: React.CSSProperties = { fontSize: 11, fontWeight: 700, color: '#555', textTransform: 'uppercase', letterSpacing: '0.8px', fontFamily: font, marginBottom: 6, display: 'block' }
  const fieldInput: React.CSSProperties = { width: '100%', background: '#282828', border: '1px solid #333', borderRadius: 9, color: '#f5f5f5', fontSize: 13, fontWeight: 600, fontFamily: font, padding: '10px 14px', outline: 'none', boxSizing: 'border-box' }
  const fieldTextarea: React.CSSProperties = { ...fieldInput, resize: 'vertical', minHeight: 100, lineHeight: 1.6 }

  const handleFocus = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    e.currentTarget.style.borderColor = '#1db954'
    e.currentTarget.style.boxShadow = '0 0 0 3px rgba(29,185,84,0.12)'
  }
  const handleBlur = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    e.currentTarget.style.borderColor = '#333'
    e.currentTarget.style.boxShadow = 'none'
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.7)', zIndex: 90, display: 'grid', placeItems: 'center', padding: 24 }} onClick={onClose}>
      <section style={{ width: 'min(600px, 100%)', background: '#1e1e1e', border: '1px solid #2a2a2a', borderRadius: 16, overflow: 'hidden', boxShadow: '0 32px 80px rgba(0,0,0,.6)' }} onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, padding: '22px 24px 20px', borderBottom: '1px solid #282828' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 42, height: 42, borderRadius: 11, background: '#1db954', display: 'grid', placeItems: 'center', flexShrink: 0, boxShadow: '0 6px 18px rgba(29,185,84,0.25)' }}>
              <ListTodo size={20} color="#191414" />
            </div>
            <div>
              <h2 style={{ margin: 0, color: '#f5f5f5', fontSize: 18, fontWeight: 800, fontFamily: displayFont, letterSpacing: '-0.02em' }}>{editing ? 'Edit task' : 'New Task'}</h2>
              <p style={{ margin: '3px 0 0', color: '#555', fontSize: 12, fontWeight: 600, fontFamily: font }}>Fill in the details below to {editing ? 'update this task' : 'create a new task'}</p>
            </div>
          </div>
          <button onClick={onClose} style={{ width: 32, height: 32, border: '1px solid #333', borderRadius: 8, background: 'transparent', color: '#b3b3b3', display: 'grid', placeItems: 'center', cursor: 'pointer', flexShrink: 0 }}>
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '20px 24px', display: 'grid', gap: 16 }}>

          {/* Task name */}
          <div>
            <label style={fieldLabel}>Task name</label>
            <input
              autoFocus
              value={draft.title}
              onChange={e => update('title', e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && draft.title.trim()) onSave() }}
              placeholder="e.g. Install requested cabinet upgrade"
              style={fieldInput}
              onFocus={handleFocus}
              onBlur={handleBlur}
            />
          </div>

          {/* Description */}
          <div>
            <label style={fieldLabel}>Description <span style={{ textTransform: 'none', letterSpacing: 0, fontSize: 11, color: '#444', fontWeight: 500 }}>(optional)</span></label>
            <textarea
              value={draft.description}
              onChange={e => update('description', e.target.value)}
              placeholder="What needs to be done?"
              style={fieldTextarea}
              onFocus={handleFocus}
              onBlur={handleBlur}
            />
          </div>

          {/* Project + Assignee */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div>
              <label style={fieldLabel}>Project / Space</label>
              <select value={draft.projectId} onChange={e => update('projectId', e.target.value)} style={{ ...fieldInput, cursor: 'pointer' }} onFocus={handleFocus} onBlur={handleBlur}>
                <option value="">No project</option>
                {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div>
              <label style={fieldLabel}>Assignee</label>
              <select value={draft.assignee} onChange={e => update('assignee', e.target.value)} style={{ ...fieldInput, cursor: 'pointer' }} onFocus={handleFocus} onBlur={handleBlur}>
                <option value="">Unassigned</option>
                {assignees.map(name => <option key={name} value={name}>{name}</option>)}
              </select>
            </div>
          </div>

          {/* Due date + Status */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div>
              <label style={fieldLabel}>Due date</label>
              <input type="date" value={draft.dueDate} onChange={e => update('dueDate', e.target.value)} style={{ ...fieldInput, colorScheme: 'dark' }} onFocus={handleFocus} onBlur={handleBlur} />
            </div>
            <div>
              <label style={fieldLabel}>Status</label>
              <select value={draft.status} onChange={e => update('status', e.target.value as TaskStatus)} style={{ ...fieldInput, cursor: 'pointer' }} onFocus={handleFocus} onBlur={handleBlur}>
                {statusOrder.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
          </div>

        </div>

        {/* Footer */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 10, padding: '16px 24px', borderTop: '1px solid #282828', background: '#191414' }}>
          <button onClick={onClose} style={{ background: 'transparent', border: '1px solid #333', borderRadius: 9, color: '#b3b3b3', fontSize: 13, fontWeight: 700, fontFamily: font, padding: '9px 20px', cursor: 'pointer' }}
            onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.borderColor = '#555'}
            onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.borderColor = '#333'}
          >Cancel</button>
          <button onClick={onSave} disabled={!draft.title.trim()}
            style={{ background: draft.title.trim() ? '#1db954' : '#1a3a24', color: draft.title.trim() ? '#191414' : '#2d6b3c', border: 'none', borderRadius: 9, fontSize: 13, fontWeight: 800, fontFamily: font, padding: '9px 22px', cursor: draft.title.trim() ? 'pointer' : 'not-allowed', transition: 'background 0.15s', display: 'inline-flex', alignItems: 'center', gap: 7 }}
          >
            <Plus size={15} />{editing ? 'Save changes' : 'Create task'}
          </button>
        </div>

      </section>
    </div>
  )
}

function DetailItem({ label, value }: { label: string; value: string }) {
  return <div><div style={smallLabelStyle}>{label}</div><div style={{ color: '#f5f5f5', fontSize: 14, fontWeight: 700, marginTop: 5 }}>{value}</div></div>
}

function Pill({ color, children }: { color: string; children: ReactNode }) {
  return <span style={{ display: 'inline-flex', color, background: '#282828', borderRadius: 999, padding: '4px 8px', fontSize: 11, fontWeight: 700, marginTop: 6 }}>{children}</span>
}

function Avatar({ name, size = 24 }: { name: string; size?: number }) {
  return <span style={{ width: size, height: size, borderRadius: '50%', background: '#1db954', color: '#191414', display: 'inline-grid', placeItems: 'center', fontSize: Math.floor(size * 0.46), fontWeight: 800, flexShrink: 0 }}>{(name || '?').charAt(0).toUpperCase()}</span>
}

const sideSectionStyle = { color: '#b3b3b3', fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1, padding: '0 8px 8px' } as const
const sidebarSectionTitleStyle = { color: '#555', fontSize: 10, fontWeight: 900, letterSpacing: 1.1, textTransform: 'uppercase', padding: '7px 10px 8px' } as const
const sideButtonStyle = { width: '100%', border: 'none', borderRadius: 8, background: 'transparent', color: '#b3b3b3', minHeight: 34, padding: '0 9px', display: 'flex', alignItems: 'center', gap: 9, fontSize: 13, fontWeight: 700, fontFamily: font, cursor: 'pointer', textAlign: 'left' } as const
const iconButtonStyle = { width: 34, height: 34, border: '1px solid #535353', borderRadius: 10, background: '#121212', color: '#f5f5f5', display: 'grid', placeItems: 'center', cursor: 'pointer' } as const
const viewButtonStyle = { display: 'inline-flex', alignItems: 'center', gap: 7, border: 'none', borderBottom: '3px solid transparent', background: 'transparent', padding: '11px 9px 12px', color: '#b3b3b3', fontSize: 13, fontWeight: 700, fontFamily: font, cursor: 'pointer', whiteSpace: 'nowrap' } as const
const chipButtonStyle = { display: 'inline-flex', alignItems: 'center', gap: 6, border: '1px solid #282828', borderRadius: 999, background: '#121212', color: '#f5f5f5', minHeight: 32, padding: '0 11px', fontSize: 12, fontWeight: 700, fontFamily: font, cursor: 'pointer', whiteSpace: 'nowrap' } as const
const darkSelectStyle = { border: '1px solid #282828', borderRadius: 999, background: '#121212', color: '#f5f5f5', minHeight: 32, padding: '0 11px', fontSize: 12, fontWeight: 700, fontFamily: font, outline: 'none' } as const
const newTaskInputStyle = { width: 180, minHeight: 32, border: '1px solid #282828', borderRadius: 999, background: '#121212', color: '#f5f5f5', padding: '0 12px', fontSize: 12, fontWeight: 700, fontFamily: font, outline: 'none' } as const
const formInputStyle = { width: '100%', minHeight: 40, border: '1px solid #535353', borderRadius: 10, background: '#121212', color: '#f5f5f5', padding: '0 12px', fontSize: 13, fontWeight: 700, fontFamily: font, outline: 'none' } as const
const greenButtonStyle = { border: 'none', borderRadius: 999, minHeight: 32, padding: '0 13px', background: '#1db954', color: '#191414', fontSize: 12, fontWeight: 800, fontFamily: font, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6 } as const
const tableCellStyle = { padding: '9px 12px', borderRight: '1px solid #282828', display: 'flex', alignItems: 'center', minWidth: 0, fontSize: 12, fontWeight: 700 } as const
const detailGridStyle = { display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 12 } as const
const smallLabelStyle = { color: '#b3b3b3', fontSize: 12, fontWeight: 700 } as const
const descriptionBoxStyle = { marginTop: 16, padding: 14, borderRadius: 12, background: '#191414', border: '1px solid #282828' } as const
const emptyBoxStyle = { border: '1px dashed #535353', borderRadius: 12, padding: 22, color: '#b3b3b3', fontSize: 13, fontWeight: 700, textAlign: 'center' } as const
const textareaStyle = { width: '100%', minHeight: 116, border: '1px solid #535353', borderRadius: 12, background: '#191414', color: '#f5f5f5', fontSize: 13, fontWeight: 600, padding: 12, fontFamily: font, outline: 'none', resize: 'vertical' } as const
const uploadButtonStyle = { display: 'inline-flex', alignItems: 'center', gap: 7, border: '1px solid #535353', borderRadius: 10, padding: '9px 12px', color: '#f5f5f5', fontSize: 12, fontWeight: 700, cursor: 'pointer', background: '#121212' } as const
const cuIconBtn = { width: 28, height: 28, border: '1px solid #2a2a2a', borderRadius: 7, background: 'transparent', color: '#888', display: 'grid', placeItems: 'center', cursor: 'pointer' } as const
const cuDashedBtn = { display: 'inline-flex', alignItems: 'center', gap: 6, border: '1px solid #2d2d2d', borderRadius: 7, background: 'transparent', color: '#666', padding: '8px 14px', fontSize: 13, cursor: 'pointer', fontFamily: font } as const
const cuSecondaryBtn = { width: 26, height: 26, border: '1px solid #2a2a2a', borderRadius: 6, background: 'transparent', color: '#666', display: 'grid', placeItems: 'center', cursor: 'pointer', fontSize: 13 } as const
