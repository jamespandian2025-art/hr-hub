'use client'

import { ChangeEvent, DragEvent, FormEvent, useEffect, useMemo, useRef, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import {
  Bell,
  BriefcaseBusiness,
  CheckCircle2,
  CheckSquare,
  ChevronDown,
  ChevronRight,
  Clock3,
  FileCheck2,
  FileText,
  Filter,
  Home,
  MessageSquare,
  Plus,
  Search,
  Timer,
  UploadCloud,
  WalletCards,
  X,
} from 'lucide-react'
import { budgetSummary, formatDate, formatMoney, projectStats } from '@/lib/project-management/metrics'
import type { DocumentType, ProjectManagementState, ProjectRecord, ProjectTask, TaskPriority, TaskStatus } from '@/lib/project-management/types'
import type { TaskAttachmentDraft } from '@/lib/project-management/service'
import { companyChangeEvent } from '@/lib/tenant/company'
import { uploadFileObject } from '@/lib/uploads/client'
import {
  type ProjectManagementTab,
  projectManagementPathToTab,
  projectManagementTabs,
  projectManagementTabToPath,
  projectManagementViewToTab,
} from './projectManagementNav'
import { useProjectManagement } from './useProjectManagement'
import { projectManagementCss } from './projectManagementStyles'
import {
  Field,
  KpiCard,
  ProjectDetails,
  Select,
  TabBar,
  TaskCollaborationPanel,
  TaskDescriptionEditor,
} from './ProjectManagementComponents'
import { ArchivedTab } from './tabs/ArchivedTab'
import { BudgetTab } from './tabs/BudgetTab'
import { DocumentsTab } from './tabs/DocumentsTab'
import { OverviewTab } from './tabs/OverviewTab'
import { ProjectsTab } from './tabs/ProjectsTab'

const detailTabs = ['Overview', 'Tasks', 'Kanban', 'Files', 'Team', 'Budget', 'Schedule', 'Reports', 'Settings']
const statusOptions = ['All', 'Planning', 'Active', 'In Progress', 'On Hold', 'Completed', 'Cancelled']
type TaskRecurrence = 'None' | 'Daily' | 'Weekly' | 'Monthly'
const priorityOptions = ['All', 'Low', 'Medium', 'High', 'Critical']
const projectDepartmentOptions = ['Delivery', 'Operations', 'Construction', 'Engineering', 'Design', 'Procurement', 'Finance', 'HR', 'Administration']
const projectTypeOptions = ['Residential Construction', 'Commercial Construction', 'Industrial Construction', 'Infrastructure Construction', 'Educational Construction', 'Hospitality Construction']
const contractTypeOptions = ['Lump Sum', 'Time and Materials', 'Cost Plus', 'Unit Price', 'Design Build', 'Guaranteed Maximum Price']
const workingDayOptions = ['Monday to Friday', 'Monday to Saturday', 'Seven days', 'Custom schedule']
const provinceOptions = ['Metro Manila', 'Cavite', 'Laguna', 'Rizal', 'Bulacan', 'Batangas', 'Cebu', 'Davao del Sur']
const taskCategoryOptions = ['Budget', 'Cost Control', 'Design', 'Procurement', 'Site Work', 'Documentation', 'Inspection', 'Handover']
const taskDurationOptions = ['Half day', '1 day', '2 days', '1 week', '2 weeks', '1 month']
const taskTimeTypeOptions = ['One-time', 'Recurring', 'Milestone', 'Retainer']
const taskCostCodeOptions = ['General', 'Labor', 'Materials', 'Equipment', 'Subcontractor', 'Administration']
const documentTypes: DocumentType[] = ['PDF', 'DOCX', 'XLSX', 'Image', 'CAD']
type PendingTaskAttachment = Omit<TaskAttachmentDraft, 'taskId'>
const colors = {
  green: '#16a34a',
  blue: '#2f80ed',
  orange: '#f59e0b',
  purple: '#8b5cf6',
}

function parseOpportunityKey(value: string): Pick<ProjectRecord, 'opportunityId' | 'opportunitySource'> {
  const [source, ...rest] = value.split(':')
  const id = rest.join(':')
  if ((source === 'sales' || source === 'legacy') && id) return { opportunitySource: source, opportunityId: id }
  return { opportunityId: undefined, opportunitySource: undefined }
}

function formatFileSize(bytes: number) {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 KB'
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function formatCurrency(value: number, currency = 'PHP') {
  const safeCurrency = currency || 'PHP'
  const locale = safeCurrency === 'PHP' ? 'en-PH' : 'en-US'
  try {
    return new Intl.NumberFormat(locale, { style: 'currency', currency: safeCurrency, maximumFractionDigits: 0 }).format(value || 0)
  } catch {
    return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', maximumFractionDigits: 0 }).format(value || 0)
  }
}

function taskFileType(file: File) {
  if (file.type.startsWith('image/')) return 'Photo'
  if (file.type.includes('pdf')) return 'PDF'
  if (file.type.includes('spreadsheet') || file.name.match(/\.(xls|xlsx|csv)$/i)) return 'Spreadsheet'
  if (file.type.includes('word') || file.name.match(/\.(doc|docx)$/i)) return 'Document'
  return 'File'
}

function isProjectThumbnailFile(file: File) {
  return file.type.startsWith('image/') || /\.(png|jpe?g|webp)$/i.test(file.name)
}

async function prepareProjectThumbnail(file: File) {
  if (!isProjectThumbnailFile(file)) return { dataUrl: '', assetId: '', name: file.name }
  try {
    const uploaded = await uploadFileObject(file, 'project-thumbnails')
    return { dataUrl: uploaded.url, assetId: '', name: uploaded.name }
  } catch {
    return { dataUrl: '', assetId: '', name: file.name }
  }
}

async function prepareProjectAttachment(file: File, purpose = 'project-attachments') {
  try {
    return await uploadFileObject(file, purpose)
  } catch {
    return undefined
  }
}

function defaultProjectDraft(clientId: string, managerId = '') {
  const startDate = new Date()
  const dueDate = new Date(Date.now() + 30 * 86400000)
  return {
    name: '',
    code: '',
    clientId,
    projectType: '',
    contractType: '',
    description: '',
    budget: '0',
    startDate: inputDate(startDate),
    dueDate: inputDate(dueDate),
    duration: '',
    workingDays: '',
    address: '',
    city: '',
    province: '',
    postalCode: '',
    directCost: '',
    indirectCost: '',
    contingencyCost: '',
    otherCost: '',
    managerId,
    teamMemberIds: managerId ? [managerId] : [] as string[],
    thumbnailDataUrl: '',
    thumbnailAssetId: '',
    thumbnailName: '',
    allowTaskCreation: true,
    enableBudgetTracking: true,
    enableTimeTracking: true,
    enableDocumentManagement: true,
    department: 'Delivery',
    opportunityKey: '',
  }
}

function defaultTaskDraft(state: ProjectManagementState) {
  const activeProjects = state.projects.filter(project => !project.archivedAt)
  const activeMembers = state.members
  const startDate = new Date()
  const dueDate = new Date(Date.now() + 7 * 86400000)
  return {
    projectId: activeProjects[0]?.id || '',
    title: '',
    code: '',
    description: '',
    assigneeId: activeMembers[0]?.id || '',
    followers: [] as string[],
    priority: 'Medium' as TaskPriority,
    status: 'To Do' as TaskStatus,
    startDate: inputDate(startDate),
    dueDate: inputDate(dueDate),
    category: '',
    department: '',
    team: '',
    duration: '',
    workingDays: '',
    estimatedHours: '',
    timeType: 'One-time',
    budget: '',
    billable: true,
    costCode: '',
    progress: '0',
    labels: '',
    dependencies: [] as string[],
    recurrence: 'None' as TaskRecurrence,
    recurrenceInterval: '1',
    recurrenceEndDate: '',
  }
}

function taskDraftFromRecord(task: ProjectTask) {
  return {
    projectId: task.projectId,
    title: task.title,
    code: task.id,
    description: task.description,
    assigneeId: task.assigneeId,
    followers: task.followers || [],
    priority: task.priority,
    status: task.status,
    startDate: task.startDate || '',
    dueDate: task.dueDate,
    category: task.category || '',
    department: task.department || '',
    team: task.team || '',
    duration: task.duration || '',
    workingDays: task.workingDays || '',
    estimatedHours: task.estimatedHours === undefined ? '' : String(task.estimatedHours),
    timeType: task.timeType || 'One-time',
    budget: task.budget === undefined ? '' : String(task.budget),
    billable: task.billable ?? true,
    costCode: task.costCode || '',
    progress: String(task.progress),
    labels: task.labels.join(', '),
    dependencies: task.dependencies,
    recurrence: task.recurrence || 'None',
    recurrenceInterval: String(task.recurrenceInterval || 1),
    recurrenceEndDate: task.recurrenceEndDate || '',
  }
}

function defaultTimeDraft(state: ProjectManagementState) {
  const activeTasks = state.tasks.filter(task => !task.archivedAt)
  return {
    projectId: activeTasks[0]?.projectId || state.projects.find(project => !project.archivedAt)?.id || '',
    taskId: activeTasks[0]?.id || '',
    employeeId: state.members[0]?.id || '',
    hours: '1',
    date: new Date().toISOString().slice(0, 10),
    billable: true,
  }
}

function defaultDocumentDraft(state: ProjectManagementState) {
  return {
    projectId: state.projects[0]?.id || '',
    name: '',
    type: 'PDF' as DocumentType,
    folder: 'Project Files',
    size: '0 KB',
    ownerId: state.members[0]?.id || '',
  }
}

function inputDate(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function suggestedProjectCode(name: string, projects: ProjectRecord[]) {
  const base = name.trim().replace(/[^a-z0-9]+/gi, '').slice(0, 4).toUpperCase()
  const suffix = String(projects.length + 1).padStart(3, '0')
  return `PRJ-${new Date().getFullYear()}-${base || suffix}`
}

function numericDraftValue(value: string) {
  return Number(value.replace(/,/g, '')) || 0
}

export default function ProjectManagementModule({ initialTab }: { initialTab?: ProjectManagementTab }) {
  const pathname = usePathname()
  const router = useRouter()
  const searchParams = useSearchParams()
  const store = useProjectManagement()
  const { state, filters, setFilters, filteredProjects, filteredState } = store
  const { activeTab, setActiveTab, detailTab, setDetailTab } = store
  const [currency, setCurrency] = useState('PHP')
  const [showCreate, setShowCreate] = useState(false)
  const [showCreateTask, setShowCreateTask] = useState(false)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [projectAlertsOpen, setProjectAlertsOpen] = useState(false)
  const [actionModal, setActionModal] = useState<'task' | 'time' | 'document' | null>(null)
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null)
  const [taskCommentDraft, setTaskCommentDraft] = useState('')
  const [taskChecklistDraft, setTaskChecklistDraft] = useState('')
  const [newTaskChecklistItems, setNewTaskChecklistItems] = useState<string[]>([])
  const [newTaskAttachments, setNewTaskAttachments] = useState<PendingTaskAttachment[]>([])
  const [taskAdvancedOpen, setTaskAdvancedOpen] = useState(false)
  const [taskFollowerPick, setTaskFollowerPick] = useState('')
  const [taskAttachmentNote, setTaskAttachmentNote] = useState('')
  const [taskEvidenceMode, setTaskEvidenceMode] = useState(false)
  const [draggedTask, setDraggedTask] = useState<string | null>(null)
  const [draft, setDraft] = useState(() => defaultProjectDraft(state.clients[0]?.id || '', state.members[0]?.id || ''))
  const [teamMemberPick, setTeamMemberPick] = useState(state.members[0]?.id || '')
  const [taskDraft, setTaskDraft] = useState(() => defaultTaskDraft(state))
  const [timeDraft, setTimeDraft] = useState(() => defaultTimeDraft(state))
  const [documentDraft, setDocumentDraft] = useState(() => defaultDocumentDraft(state))
  const filterPanelRef = useRef<HTMLElement | null>(null)
  const projectAlertsRef = useRef<HTMLElement | null>(null)
  const headerActionsRef = useRef<HTMLDivElement | null>(null)
  const newTaskFileInputRef = useRef<HTMLInputElement | null>(null)
  const stats = projectStats(filteredState)
  const budget = budgetSummary(filteredState)
  const departments = useMemo(() => ['All', ...Array.from(new Set(state.projects.map(project => project.department)))], [state.projects])
  const createProjectTypeOptions = useMemo(
    () => Array.from(new Set([...projectTypeOptions, ...state.projects.map(project => project.projectType || project.department), draft.projectType].filter(Boolean))),
    [draft.projectType, state.projects],
  )
  const createContractTypeOptions = useMemo(
    () => Array.from(new Set([...contractTypeOptions, ...state.projects.map(project => project.contractType || '').filter(Boolean), draft.contractType].filter(Boolean))),
    [draft.contractType, state.projects],
  )
  const budgetParts = {
    direct: numericDraftValue(draft.directCost),
    indirect: numericDraftValue(draft.indirectCost),
    contingency: numericDraftValue(draft.contingencyCost),
    other: numericDraftValue(draft.otherCost),
  }
  const allocatedBudget = budgetParts.direct + budgetParts.indirect + budgetParts.contingency + budgetParts.other
  const enteredBudget = numericDraftValue(draft.budget)
  const totalDraftBudget = enteredBudget || allocatedBudget
  const budgetAllocatedPercent = totalDraftBudget ? Math.min(100, Math.round((allocatedBudget / totalDraftBudget) * 100)) : 0
  const taskProject = state.projects.find(project => project.id === taskDraft.projectId) || state.projects.find(project => !project.archivedAt) || null
  const taskDepartmentOptions = useMemo(
    () => Array.from(new Set([...projectDepartmentOptions, ...state.projects.map(project => project.department), ...state.members.map(member => member.department), taskDraft.department].filter(Boolean))),
    [state.members, state.projects, taskDraft.department],
  )
  const taskTeamOptions = useMemo(
    () => Array.from(new Set([
      taskProject?.name,
      taskProject?.department,
      ...state.members.map(member => member.role),
      taskDraft.team,
    ].filter(Boolean))),
    [state.members, taskDraft.team, taskProject],
  )
  const editingTask = editingTaskId ? state.tasks.find(task => task.id === editingTaskId) || null : null
  const dateRangeLabel = filters.dateFrom || filters.dateTo ? `${filters.dateFrom || 'Start'} - ${filters.dateTo || 'End'}` : 'All project dates'
  const hasAnyActiveProjects = state.projects.some(project => !project.archivedAt)
  const activeFilterCount = [
    Boolean(filters.query.trim()),
    filters.status !== 'All',
    filters.priority !== 'All',
    filters.assignee !== 'All',
    filters.department !== 'All',
    Boolean(filters.dateFrom || filters.dateTo),
  ].filter(Boolean).length
  const changeMainTab = (tab: string) => {
    const nextTab = tab as ProjectManagementTab
    store.setSelectedProjectId(null)
    store.setActiveTab(nextTab)
    const nextPath = projectManagementTabToPath[nextTab]
    // Update the URL without a full route navigation so the tab content swaps
    // instantly (client-side) instead of remounting the module. pushState is
    // synced with usePathname/useSearchParams by the Next.js App Router.
    if (nextPath && nextPath !== pathname) window.history.pushState(null, '', nextPath)
  }
  const closeProjectDetail = () => {
    store.setSelectedProjectId(null)
    if (!searchParams.has('project')) return
    const params = new URLSearchParams(searchParams.toString())
    params.delete('project')
    params.delete('detail')
    const query = params.toString()
    router.replace(`${pathname}${query ? `?${query}` : ''}`)
  }
  const projectAlerts = [
    ...filteredState.milestones.slice(0, 2).map(milestone => {
      const project = filteredState.projects.find(item => item.id === milestone.projectId)
      return {
        title: milestone.title,
        detail: `${project?.name || 'Unassigned project'} due ${formatDate(milestone.dueDate)}`,
        action: () => changeMainTab('Overview'),
      }
    }),
    ...filteredState.tasks.filter(task => task.status !== 'Done').slice(0, 2).map(task => ({
      title: task.title,
      detail: `${task.status} task due ${formatDate(task.dueDate)}`,
      action: () => {
        store.setSelectedProjectId(task.projectId)
        store.setDetailTab('Tasks')
      },
    })),
  ]
  const isArchivedDirectory = store.activeTab === 'Archived'
  const isProjectDirectory = store.activeTab === 'Projects' || isArchivedDirectory
  const pageTitle = store.activeTab === 'Projects' ? 'Projects' : isArchivedDirectory ? 'Archived' : 'Project Management'
  const pageDescription = store.activeTab === 'Projects'
    ? 'All your construction projects in one place. Plan, track and deliver projects successfully.'
    : isArchivedDirectory
      ? 'Review archived construction projects and historical delivery records.'
    : 'Plan, track and deliver projects successfully.'

  const kpis = [
    { title: 'Total Projects', value: String(stats.totalProjects), change: `${filteredState.tasks.length} tasks`, comparison: 'in view', icon: BriefcaseBusiness, tone: colors.green },
    { title: 'Completed Projects', value: String(stats.completedProjects), change: `${Math.round((stats.completedProjects / Math.max(stats.totalProjects, 1)) * 100)}%`, comparison: 'complete', icon: CheckCircle2, tone: colors.blue },
    { title: 'In Progress Projects', value: String(stats.inProgressProjects), change: `${filteredState.milestones.length} milestones`, comparison: 'tracked', icon: Clock3, tone: colors.purple },
    { title: 'On Hold Projects', value: String(stats.onHoldProjects), change: `${stats.onHoldProjects}`, comparison: 'needs review', icon: Timer, tone: colors.orange, negative: stats.onHoldProjects > 0 },
    { title: 'Total Budget', value: formatMoney(stats.totalBudget), change: formatMoney(budget.remaining), comparison: 'remaining', icon: WalletCards, tone: '#14b8a6' },
  ]

  useEffect(() => {
    const refreshCurrency = () => setCurrency('PHP')
    refreshCurrency()
    window.addEventListener(companyChangeEvent, refreshCurrency)
    window.addEventListener('storage', refreshCurrency)
    return () => {
      window.removeEventListener(companyChangeEvent, refreshCurrency)
      window.removeEventListener('storage', refreshCurrency)
    }
  }, [])

  useEffect(() => {
    // Prefer the live pathname (kept in sync by pushState) over the static
    // initialTab prop, so a client-side tab switch isn't reverted to the
    // tab the route was first rendered with.
    const nextTab = projectManagementPathToTab[pathname] || projectManagementViewToTab[searchParams.get('view') || 'overview'] || initialTab
    if (nextTab && nextTab !== activeTab) setActiveTab(nextTab)
  }, [activeTab, initialTab, pathname, searchParams, setActiveTab])

  useEffect(() => {
    const projectId = searchParams.get('project')
    if (!projectId || store.selectedProjectId === projectId) return
    if (!state.projects.some(project => project.id === projectId)) return
    store.setSelectedProjectId(projectId)
  }, [searchParams, state.projects, store])

  useEffect(() => {
    const requestedDetailTab = searchParams.get('detail')
    if (!requestedDetailTab) return
    const nextDetailTab = detailTabs.find(tab => tab.toLowerCase() === requestedDetailTab.toLowerCase())
    if (nextDetailTab && nextDetailTab !== detailTab) setDetailTab(nextDetailTab)
  }, [detailTab, searchParams, setDetailTab])

  useEffect(() => {
    if (!filtersOpen && !projectAlertsOpen) return

    const closeOnOutsideTap = (event: PointerEvent) => {
      const target = event.target as Node | null
      if (!target) return
      if (filterPanelRef.current?.contains(target)) return
      if (projectAlertsRef.current?.contains(target)) return
      if (headerActionsRef.current?.contains(target)) return
      setFiltersOpen(false)
      setProjectAlertsOpen(false)
    }

    document.addEventListener('pointerdown', closeOnOutsideTap)
    return () => document.removeEventListener('pointerdown', closeOnOutsideTap)
  }, [filtersOpen, projectAlertsOpen])

  const setDatePreset = (preset: 'all' | 'month' | 'next30' | 'quarter') => {
    const today = new Date()
    if (preset === 'all') {
      setFilters(prev => ({ ...prev, dateFrom: '', dateTo: '' }))
      setFiltersOpen(false)
      return
    }
    if (preset === 'month') {
      const start = new Date(today.getFullYear(), today.getMonth(), 1)
      const end = new Date(today.getFullYear(), today.getMonth() + 1, 0)
      setFilters(prev => ({ ...prev, dateFrom: inputDate(start), dateTo: inputDate(end) }))
      setFiltersOpen(false)
      return
    }
    if (preset === 'next30') {
      const end = new Date(today)
      end.setDate(today.getDate() + 30)
      setFilters(prev => ({ ...prev, dateFrom: inputDate(today), dateTo: inputDate(end) }))
      setFiltersOpen(false)
      return
    }
    const quarter = Math.floor(today.getMonth() / 3)
    const start = new Date(today.getFullYear(), quarter * 3, 1)
    const end = new Date(today.getFullYear(), quarter * 3 + 3, 0)
    setFilters(prev => ({ ...prev, dateFrom: inputDate(start), dateTo: inputDate(end) }))
    setFiltersOpen(false)
  }

  const openCreateProject = () => {
    setFiltersOpen(false)
    setProjectAlertsOpen(false)
    store.setSelectedProjectId(null)
    setShowCreateTask(false)
    setShowCreate(true)
  }

  const openCreateTaskPage = (projectId?: string) => {
    const defaultDraft = defaultTaskDraft(state)
    const nextProjectId = projectId || store.selectedProjectId || defaultDraft.projectId
    const project = state.projects.find(item => item.id === nextProjectId)
    setFiltersOpen(false)
    setProjectAlertsOpen(false)
    setActionModal(null)
    setShowCreate(false)
    setEditingTaskId(null)
    setTaskDraft({
      ...defaultDraft,
      projectId: nextProjectId,
      department: project?.department || defaultDraft.department,
      team: project?.name || defaultDraft.team,
      assigneeId: project?.managerId || defaultDraft.assigneeId,
      followers: project?.memberIds.filter(memberId => memberId !== (project.managerId || defaultDraft.assigneeId)) || [],
    })
    setTaskFollowerPick('')
    setNewTaskChecklistItems([])
    setNewTaskAttachments([])
    setTaskAdvancedOpen(false)
    setShowCreateTask(true)
  }

  const attachProjectThumbnail = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    const thumbnail = await prepareProjectThumbnail(file)
    setDraft(prev => ({
      ...prev,
      thumbnailDataUrl: thumbnail.dataUrl,
      thumbnailAssetId: thumbnail.assetId,
      thumbnailName: thumbnail.name,
    }))
    event.target.value = ''
  }

  const dropProjectThumbnail = async (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault()
    const file = event.dataTransfer.files?.[0]
    if (!file) return
    const thumbnail = await prepareProjectThumbnail(file)
    setDraft(prev => ({
      ...prev,
      thumbnailDataUrl: thumbnail.dataUrl,
      thumbnailAssetId: thumbnail.assetId,
      thumbnailName: thumbnail.name,
    }))
  }

  const addCreateTeamMember = () => {
    if (!teamMemberPick) return
    setDraft(prev => ({
      ...prev,
      teamMemberIds: Array.from(new Set([...prev.teamMemberIds, teamMemberPick])),
    }))
  }

  const removeCreateTeamMember = (memberId: string) => {
    setDraft(prev => ({
      ...prev,
      teamMemberIds: prev.teamMemberIds.filter(id => id !== memberId),
    }))
  }

  const createProject = (event: FormEvent) => {
    event.preventDefault()
    const opportunityLink = parseOpportunityKey(draft.opportunityKey)
    const projectType = draft.projectType || draft.department
    const memberIds = Array.from(new Set([draft.managerId, ...draft.teamMemberIds].filter(Boolean)))
    store.createProject({
      name: draft.name.trim() || 'Untitled Project',
      clientId: draft.clientId || state.clients[0]?.id || 'client-local',
      description: draft.description,
      budget: totalDraftBudget,
      startDate: draft.startDate,
      dueDate: draft.dueDate,
      department: projectType || draft.department,
      code: draft.code.trim() || suggestedProjectCode(draft.name, state.projects),
      projectType,
      contractType: draft.contractType,
      location: {
        address: draft.address,
        city: draft.city,
        province: draft.province,
        postalCode: draft.postalCode,
      },
      budgetBreakdown: budgetParts,
      managerId: draft.managerId || state.members[0]?.id || '',
      memberIds,
      settings: {
        allowTaskCreation: draft.allowTaskCreation,
        enableBudgetTracking: draft.enableBudgetTracking,
        enableTimeTracking: draft.enableTimeTracking,
        enableDocumentManagement: draft.enableDocumentManagement,
      },
      thumbnailDataUrl: draft.thumbnailDataUrl || undefined,
      thumbnailAssetId: draft.thumbnailAssetId || undefined,
      opportunityId: opportunityLink.opportunityId,
      opportunitySource: opportunityLink.opportunitySource,
    })
    setDraft(defaultProjectDraft(state.clients[0]?.id || '', state.members[0]?.id || ''))
    setShowCreate(false)
  }

  const submitTask = (event: FormEvent) => {
    event.preventDefault()
    if (!taskDraft.projectId) return
    const labels = taskDraft.labels.split(',').map(label => label.trim()).filter(Boolean)
    const payload = {
      ...taskDraft,
      title: taskDraft.title.trim() || 'New task',
      description: taskDraft.description.trim(),
      labels,
      progress: Number(taskDraft.progress) || 0,
      estimatedHours: taskDraft.estimatedHours === '' ? undefined : Number(taskDraft.estimatedHours) || 0,
      budget: taskDraft.budget === '' ? undefined : Number(taskDraft.budget) || 0,
      dependencies: taskDraft.dependencies,
      recurrence: taskDraft.recurrence,
      recurrenceInterval: Number(taskDraft.recurrenceInterval) || 1,
      recurrenceEndDate: taskDraft.recurrence === 'None' ? undefined : taskDraft.recurrenceEndDate || undefined,
      initialAttachments: editingTaskId ? undefined : newTaskAttachments,
      initialChecklist: editingTaskId ? undefined : newTaskChecklistItems,
    }
    if (editingTaskId) store.updateTask(editingTaskId, payload)
    else store.createTask(payload)
    setTaskDraft(defaultTaskDraft(state))
    setEditingTaskId(null)
    setActionModal(null)
    setShowCreateTask(false)
    setTaskFollowerPick('')
    setNewTaskChecklistItems([])
    setNewTaskAttachments([])
    setTaskAdvancedOpen(false)
    store.setSelectedProjectId(payload.projectId)
    store.setDetailTab('Tasks')
  }

  const addTaskComment = (event: FormEvent) => {
    event.preventDefault()
    if (!editingTaskId || !taskCommentDraft.trim()) return
    store.addTaskComment(editingTaskId, taskCommentDraft)
    setTaskCommentDraft('')
  }

  const addTaskChecklistItem = (event: FormEvent) => {
    event.preventDefault()
    if (!editingTaskId || !taskChecklistDraft.trim()) return
    store.addTaskChecklistItem({ taskId: editingTaskId, title: taskChecklistDraft })
    setTaskChecklistDraft('')
  }

  const attachTaskFiles = async (event: ChangeEvent<HTMLInputElement>) => {
    if (!editingTaskId) return
    const files = Array.from(event.target.files || [])
    if (!files.length) return
    const drafts = await Promise.all(files.map(async file => {
      const uploaded = await prepareProjectAttachment(file)
      return {
        taskId: editingTaskId,
        name: file.name,
        fileType: taskFileType(file),
        mimeType: file.type || 'application/octet-stream',
        size: formatFileSize(file.size),
        evidence: taskEvidenceMode,
        note: taskAttachmentNote,
        dataUrl: uploaded?.url,
        fileUrl: uploaded?.url,
        objectKey: uploaded?.objectKey,
        storageProvider: uploaded?.storageProvider,
      }
    }))
    store.addTaskAttachments(drafts)
    setTaskAttachmentNote('')
    event.target.value = ''
  }

  const attachNewTaskFiles = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || [])
    if (!files.length) return
    const drafts = await Promise.all(files.map(async file => {
      const uploaded = await prepareProjectAttachment(file)
      return {
        name: file.name,
        fileType: taskFileType(file),
        mimeType: file.type || 'application/octet-stream',
        size: formatFileSize(file.size),
        evidence: false,
        dataUrl: uploaded?.url,
        fileUrl: uploaded?.url,
        objectKey: uploaded?.objectKey,
        storageProvider: uploaded?.storageProvider,
      }
    }))
    setNewTaskAttachments(prev => [...prev, ...drafts])
    event.target.value = ''
  }

  const removeNewTaskAttachment = (index: number) => {
    setNewTaskAttachments(prev => prev.filter((_, itemIndex) => itemIndex !== index))
  }

  const addTaskFollower = (memberId: string) => {
    if (!memberId) return
    setTaskDraft(prev => ({ ...prev, followers: Array.from(new Set([...prev.followers, memberId])) }))
    setTaskFollowerPick('')
  }

  const removeTaskFollower = (memberId: string) => {
    setTaskDraft(prev => ({ ...prev, followers: prev.followers.filter(id => id !== memberId) }))
  }

  const cancelCreateTask = () => {
    setShowCreateTask(false)
    setTaskDraft(defaultTaskDraft(state))
    setTaskFollowerPick('')
    setNewTaskChecklistItems([])
    setNewTaskAttachments([])
    setTaskAdvancedOpen(false)
  }

  const submitTime = (event: FormEvent) => {
    event.preventDefault()
    if (!timeDraft.projectId || !timeDraft.taskId) return
    store.createTimeLog({ ...timeDraft, hours: Number(timeDraft.hours) || 0 })
    setTimeDraft(defaultTimeDraft(state))
    closeActionModal()
    store.setActiveTab('Overview')
  }

  const submitDocument = (event: FormEvent) => {
    event.preventDefault()
    if (!documentDraft.projectId) return
    store.createDocument({ ...documentDraft, name: documentDraft.name.trim() || 'Project document' })
    setDocumentDraft(defaultDocumentDraft(state))
    closeActionModal()
    store.setActiveTab('Documents')
  }

  const onDropTask = (status: TaskStatus) => {
    if (!draggedTask) return
    store.updateTaskStatus(draggedTask, status)
    setDraggedTask(null)
  }

  const openTaskDetail = (taskId: string) => {
    router.push(`/project-management/tasks/${encodeURIComponent(taskId)}`)
  }

  const openProjectTaskModal = (projectId: string) => {
    openCreateTaskPage(projectId)
  }

  const openEditTaskModal = (task: ProjectTask) => {
    setShowCreateTask(false)
    setEditingTaskId(task.id)
    setTaskDraft(taskDraftFromRecord(task))
    setTaskCommentDraft('')
    setTaskChecklistDraft('')
    setTaskAttachmentNote('')
    setTaskEvidenceMode(task.status === 'Done')
    setActionModal('task')
  }

  const closeActionModal = () => {
    setActionModal(null)
    setEditingTaskId(null)
    setTaskCommentDraft('')
    setTaskChecklistDraft('')
    setTaskAttachmentNote('')
    setTaskEvidenceMode(false)
  }
  const showWorkspaceChrome = !store.selectedProject && !showCreate && !showCreateTask
  const heroToneClass = `pm-hero-tab-${store.activeTab.toLowerCase().replace(/\s+/g, '-')}`
  const showHeroKpis = store.activeTab === 'Overview' && hasAnyActiveProjects
  const heroDensityClass = showHeroKpis ? 'has-kpis' : 'is-compact'

  return (
    <div className="pm-shell">
      <style>{projectManagementCss}</style>
      <div className="pm-workspace">
        {showWorkspaceChrome && (
          <section className={`pm-dashboard-hero ${heroToneClass} ${heroDensityClass}`}>
            <div className="pm-dashboard-inner">
              <header className="pm-page-top">
                <div className="pm-page-title">
                  <h1>{pageTitle}</h1>
                  <p>{pageDescription}</p>
                </div>
                <div className="pm-page-tools" ref={headerActionsRef}>
                  {isProjectDirectory ? (
                    <button type="button" className="pm-primary pm-new-project-button pm-projects-primary" onClick={openCreateProject}><Plus size={16} /> New Project <ChevronDown size={13} /></button>
                  ) : (
                    <>
                      <button type="button" className="pm-primary pm-new-project-button" onClick={openCreateProject}><Plus size={16} /> New Project <ChevronDown size={13} /></button>
                      <button type="button" className="pm-control pm-filter-control" onClick={() => { setFiltersOpen(open => !open); setProjectAlertsOpen(false) }} aria-expanded={filtersOpen} aria-controls="pm-filter-panel"><Filter size={15} /> Filters{activeFilterCount ? <span>{activeFilterCount}</span> : null}</button>
                      <button type="button" className="pm-control pm-bell-control" onClick={() => { setProjectAlertsOpen(open => !open); setFiltersOpen(false) }} aria-label="Project notifications" aria-expanded={projectAlertsOpen} aria-controls="pm-project-alerts"><Bell size={15} /></button>
                    </>
                  )}
                </div>
              </header>

              {filtersOpen && (
                <div className="pm-filter-backdrop" aria-hidden="true" />
              )}

              {filtersOpen && (
                <section className="pm-card pm-filter-panel" id="pm-filter-panel" aria-label="Project filters" ref={filterPanelRef}>
                  <div className="pm-filter-panel-head">
                    <strong>Filters</strong>
                    <small>{dateRangeLabel}</small>
                  </div>
                  <Field label="Keyword">
                    <span className="pm-filter-search">
                      <Search size={15} />
                      <input
                        value={filters.query}
                        onChange={event => setFilters(prev => ({ ...prev, query: event.target.value }))}
                        placeholder="Search projects, tasks, documents..."
                      />
                    </span>
                  </Field>
                  <div className="pm-date-presets">
                    <button type="button" onClick={() => setDatePreset('all')}>All project dates</button>
                    <button type="button" onClick={() => setDatePreset('month')}>This month</button>
                    <button type="button" onClick={() => setDatePreset('next30')}>Next 30 days</button>
                    <button type="button" onClick={() => setDatePreset('quarter')}>This quarter</button>
                  </div>
                  <div className="pm-filter-date-grid">
                    <Field label="Date from"><input type="date" value={filters.dateFrom} onChange={event => setFilters(prev => ({ ...prev, dateFrom: event.target.value }))} /></Field>
                    <Field label="Date to"><input type="date" value={filters.dateTo} onChange={event => setFilters(prev => ({ ...prev, dateTo: event.target.value }))} /></Field>
                  </div>
                  <Field label="Status"><Select value={filters.status} options={statusOptions} onChange={value => setFilters(prev => ({ ...prev, status: value }))} /></Field>
                  <Field label="Priority"><Select value={filters.priority} options={priorityOptions} onChange={value => setFilters(prev => ({ ...prev, priority: value }))} /></Field>
                  <Field label="Department"><Select value={filters.department} options={departments} onChange={value => setFilters(prev => ({ ...prev, department: value }))} /></Field>
                  <div className="pm-form-actions"><button type="button" className="pm-control" onClick={() => setFilters(prev => ({ ...prev, query: '', status: 'All', priority: 'All', assignee: 'All', department: 'All', dateFrom: '', dateTo: '' }))}>Reset Filters</button></div>
                </section>
              )}

              {projectAlertsOpen && (
                <section className="pm-card pm-alert-panel" id="pm-project-alerts" aria-label="Project notifications" ref={projectAlertsRef}>
                  <div className="pm-alert-head">
                    <strong>Project notifications</strong>
                    <button type="button" onClick={() => setProjectAlertsOpen(false)} aria-label="Close project notifications"><X size={14} /></button>
                  </div>
                  {projectAlerts.length ? projectAlerts.map(alert => (
                    <button key={`${alert.title}-${alert.detail}`} type="button" onClick={() => { alert.action(); setProjectAlertsOpen(false) }}>
                      <Bell size={15} />
                      <span><strong>{alert.title}</strong><small>{alert.detail}</small></span>
                    </button>
                  )) : (
                    <div className="pm-alert-empty"><strong>No project alerts</strong><small>Create projects, tasks, or milestones and alerts will appear here.</small></div>
                  )}
                </section>
              )}

              <TabBar
                tabs={projectManagementTabs}
                active={store.activeTab}
                onChange={changeMainTab}
              />

              {showHeroKpis && (
                <section className="pm-kpis">
                  {kpis.map(kpi => <KpiCard key={kpi.title} {...kpi} />)}
                </section>
              )}
            </div>
          </section>
        )}

        <div className={showWorkspaceChrome ? 'pm-dashboard-content' : 'pm-dashboard-content pm-dashboard-content-flat'}>
        {showCreate && (
          <form className="pm-create-page" onSubmit={createProject} aria-labelledby="pm-create-title">
            <nav className="pm-create-crumbs" aria-label="New project breadcrumb">
              <Home size={15} />
              <button type="button" onClick={() => setShowCreate(false)}>Project Mgmt</button>
              <ChevronRight size={13} />
              <button type="button" onClick={() => setShowCreate(false)}>Projects</button>
              <ChevronRight size={13} />
              <span>New Project</span>
            </nav>

            <header className="pm-create-title-row">
              <div>
                <h1 id="pm-create-title">Add New Project</h1>
                <p>Create a new construction project and set up the essential details.</p>
              </div>
            </header>

            <div className="pm-create-layout">
              <main className="pm-create-main">
                <section className="pm-create-section">
                  <h3>1. Basic Information</h3>
                  <div className="pm-create-basic-grid">
                    <div className="pm-create-photo-field">
                      <span>Project Photo (Thumbnail) *</span>
                      <label className={draft.thumbnailDataUrl ? 'pm-create-upload has-image' : 'pm-create-upload'} htmlFor="pm-project-thumbnail" onDragOver={event => event.preventDefault()} onDrop={dropProjectThumbnail}>
                        {draft.thumbnailDataUrl ? (
                          <span className="pm-create-upload-image" style={{ backgroundImage: `url(${draft.thumbnailDataUrl})` }} aria-label="Project thumbnail preview" />
                        ) : (
                          <>
                            <UploadCloud size={30} />
                            <strong>Drag and drop an image here</strong>
                            <em>or</em>
                            <b>Upload Photo</b>
                          </>
                        )}
                      </label>
                      <input id="pm-project-thumbnail" className="pm-create-file-input" type="file" accept="image/png,image/jpeg,image/webp" onChange={attachProjectThumbnail} />
                      <small>{draft.thumbnailName || 'Recommended: 16:9 ratio, JPG or PNG, max 5MB.'}</small>
                    </div>

                    <div className="pm-create-basic-fields">
                      <Field label="Project Name *"><input value={draft.name} onChange={event => setDraft(prev => ({ ...prev, name: event.target.value }))} placeholder="Enter project name" required /></Field>
                      <Field label="Project Code *"><input value={draft.code} onChange={event => setDraft(prev => ({ ...prev, code: event.target.value }))} placeholder="Auto-generated or enter code" /></Field>
                      <Field label="Project Type *">
                        <select value={draft.projectType} onChange={event => setDraft(prev => ({ ...prev, projectType: event.target.value, department: event.target.value || prev.department }))} required>
                          <option value="">Select project type</option>
                          {createProjectTypeOptions.map(type => <option key={type} value={type}>{type}</option>)}
                        </select>
                      </Field>
                      <Field label="Contract Type *">
                        <select value={draft.contractType} onChange={event => setDraft(prev => ({ ...prev, contractType: event.target.value }))} required>
                          <option value="">Select contract type</option>
                          {createContractTypeOptions.map(type => <option key={type} value={type}>{type}</option>)}
                        </select>
                      </Field>
                      <label className="pm-field pm-create-span-2">
                        <span>Description</span>
                        <textarea value={draft.description} onChange={event => setDraft(prev => ({ ...prev, description: event.target.value.slice(0, 500) }))} rows={4} maxLength={500} placeholder="Enter project description, scope of work, and key objectives..." />
                        <small>{draft.description.length} / 500</small>
                      </label>
                    </div>
                  </div>
                </section>

                <section className="pm-create-section">
                  <h3>2. Location</h3>
                  <div className="pm-create-location-grid">
                    <Field label="Project Address *" className="pm-create-span-3"><input value={draft.address} onChange={event => setDraft(prev => ({ ...prev, address: event.target.value }))} placeholder="Enter complete project address" required /></Field>
                    <Field label="City / Municipality *"><input value={draft.city} onChange={event => setDraft(prev => ({ ...prev, city: event.target.value }))} placeholder="Enter city or municipality" required /></Field>
                    <Field label="Province *">
                      <select value={draft.province} onChange={event => setDraft(prev => ({ ...prev, province: event.target.value }))} required>
                        <option value="">Select province</option>
                        {provinceOptions.map(province => <option key={province} value={province}>{province}</option>)}
                      </select>
                    </Field>
                    <Field label="Zip / Postal Code"><input value={draft.postalCode} onChange={event => setDraft(prev => ({ ...prev, postalCode: event.target.value }))} placeholder="Enter zip or postal code" /></Field>
                  </div>
                </section>

                <section className="pm-create-section">
                  <h3>3. Schedule</h3>
                  <div className="pm-create-schedule-grid">
                    <Field label="Start Date *"><input value={draft.startDate} onChange={event => setDraft(prev => ({ ...prev, startDate: event.target.value }))} type="date" required /></Field>
                    <Field label="Target Completion Date *"><input value={draft.dueDate} onChange={event => setDraft(prev => ({ ...prev, dueDate: event.target.value }))} type="date" required /></Field>
                    <Field label="Project Duration (Estimated)"><input value={draft.duration} onChange={event => setDraft(prev => ({ ...prev, duration: event.target.value }))} placeholder="e.g., 12 months" /></Field>
                    <Field label="Working Days">
                      <select value={draft.workingDays} onChange={event => setDraft(prev => ({ ...prev, workingDays: event.target.value }))}>
                        <option value="">Select working days</option>
                        {workingDayOptions.map(option => <option key={option} value={option}>{option}</option>)}
                      </select>
                    </Field>
                  </div>
                </section>

                <section className="pm-create-section">
                  <h3>4. Budget</h3>
                  <div className="pm-create-budget-grid">
                    <Field label={`Total Budget (${currency}) *`}><input value={draft.budget} onChange={event => setDraft(prev => ({ ...prev, budget: event.target.value }))} type="number" min="0" inputMode="decimal" placeholder="e.g., 12,500,000.00" required /></Field>
                    <Field label={`Direct Cost (${currency})`}><input value={draft.directCost} onChange={event => setDraft(prev => ({ ...prev, directCost: event.target.value }))} type="number" min="0" inputMode="decimal" placeholder="e.g., 8,500,000.00" /></Field>
                    <Field label={`Contingency (${currency})`}><input value={draft.contingencyCost} onChange={event => setDraft(prev => ({ ...prev, contingencyCost: event.target.value }))} type="number" min="0" inputMode="decimal" placeholder="e.g., 1,500,000.00" /></Field>
                  </div>
                  <p className="pm-create-note"><Bell size={14} /> You can edit the detailed budget breakdown after creating the project.</p>
                </section>
              </main>

              <aside className="pm-create-side">
                <section className="pm-create-side-box">
                  <div className="pm-create-side-title"><WalletCards size={17} /><h3>Budget Summary</h3></div>
                  <small>Total Budget ({currency})</small>
                  <strong className="pm-create-total">{formatCurrency(totalDraftBudget, currency)}</strong>
                  <div className="pm-create-budget-list">
                    {[
                      ['Direct Cost', budgetParts.direct, '#3b82f6'],
                      ['Indirect Cost', budgetParts.indirect, '#22c55e'],
                      ['Contingency', budgetParts.contingency, '#facc15'],
                      ['Others', budgetParts.other, '#cbd5e1'],
                    ].map(([label, value, color]) => (
                      <p key={label as string}><i style={{ color: color as string }} /> <span>{label}</span><strong>{formatCurrency(value as number, currency)} ({totalDraftBudget ? Math.round(((value as number) / totalDraftBudget) * 100) : 0}%)</strong></p>
                    ))}
                  </div>
                  <div className="pm-create-donut-row">
                    <span className="pm-create-donut" style={{ background: `conic-gradient(#f5f5f5 ${budgetAllocatedPercent * 3.6}deg, #3a3a3a 0deg)` }}><b>{budgetAllocatedPercent}%</b></span>
                    <span>Budget<br />Allocated</span>
                  </div>
                </section>

                <section className="pm-create-side-box">
                  <h3>Project Manager</h3>
                  <Field label="Project Manager *">
                    <select value={draft.managerId} onChange={event => setDraft(prev => ({ ...prev, managerId: event.target.value, teamMemberIds: Array.from(new Set([event.target.value, ...prev.teamMemberIds].filter(Boolean))) }))} required>
                      <option value="">Search and select manager</option>
                      {state.members.map(member => <option key={member.id} value={member.id}>{member.name}</option>)}
                    </select>
                  </Field>
                </section>

                <section className="pm-create-side-box">
                  <h3>Team Members</h3>
                  <p>Add initial team members to this project.</p>
                  <div className="pm-create-team-add">
                    <select value={teamMemberPick} onChange={event => setTeamMemberPick(event.target.value)} aria-label="Team member">
                      <option value="">Select team member</option>
                      {state.members.map(member => <option key={member.id} value={member.id}>{member.name}</option>)}
                    </select>
                    <button type="button" className="pm-primary" onClick={addCreateTeamMember}><Plus size={14} /> Add Team Member</button>
                  </div>
                  {!!draft.teamMemberIds.length && (
                    <div className="pm-create-team-list">
                      {draft.teamMemberIds.map(memberId => {
                        const member = state.members.find(item => item.id === memberId)
                        return <span key={memberId}>{member?.name || memberId}<button type="button" onClick={() => removeCreateTeamMember(memberId)} aria-label={`Remove ${member?.name || memberId}`}><X size={12} /></button></span>
                      })}
                    </div>
                  )}
                </section>

                <section className="pm-create-side-box">
                  <h3>Project Settings</h3>
                  {[
                    ['allowTaskCreation', 'Allow task creation'],
                    ['enableBudgetTracking', 'Enable budget tracking'],
                    ['enableTimeTracking', 'Enable time tracking'],
                    ['enableDocumentManagement', 'Enable document management'],
                  ].map(([key, label]) => (
                    <label key={key} className="pm-create-check">
                      <input type="checkbox" checked={Boolean(draft[key as keyof typeof draft])} onChange={event => setDraft(prev => ({ ...prev, [key]: event.target.checked }))} />
                      <span>{label}</span>
                    </label>
                  ))}
                </section>

                <div className="pm-create-actions">
                  <button type="button" className="pm-control" onClick={() => setShowCreate(false)}>Cancel</button>
                  <button type="submit" className="pm-primary"><FileCheck2 size={15} /> Create Project</button>
                </div>
              </aside>
            </div>
          </form>
        )}

        {showCreateTask && (
          <form className="pm-create-page pm-task-create-page" onSubmit={submitTask} aria-labelledby="pm-create-task-title">
            <nav className="pm-create-crumbs" aria-label="New task breadcrumb">
              <Home size={15} />
              <button type="button" onClick={cancelCreateTask}>Project Mgmt</button>
              <ChevronRight size={13} />
              <button type="button" onClick={cancelCreateTask}>Projects</button>
              <ChevronRight size={13} />
              <button type="button" onClick={cancelCreateTask}>{taskProject?.name || 'Project'}</button>
              <ChevronRight size={13} />
              <span>Add New Task</span>
            </nav>

            <header className="pm-create-title-row">
              <div>
                <h1 id="pm-create-task-title">Add New Task</h1>
                <p>Create a new task under this project and set up the necessary details.</p>
              </div>
            </header>

            <div className="pm-create-layout">
              <main className="pm-create-main">
                <section className="pm-create-section">
                  <div className="pm-create-section-head">
                    <div>
                      <h3>Task essentials</h3>
                      <p>Capture the work, owner, priority, and due date. Everything else can be added later.</p>
                    </div>
                  </div>
                  <div className="pm-task-detail-grid">
                    <Field label="Project *" className="pm-create-span-2">
                      <select
                        value={taskDraft.projectId}
                        onChange={event => {
                          const project = state.projects.find(item => item.id === event.target.value)
                          setTaskDraft(prev => ({
                            ...prev,
                            projectId: event.target.value,
                            department: project?.department || prev.department,
                            team: project?.name || prev.team,
                            assigneeId: project?.managerId || prev.assigneeId,
                            followers: project?.memberIds.filter(memberId => memberId !== (project.managerId || prev.assigneeId)) || prev.followers,
                          }))
                        }}
                        required
                      >
                        {!state.projects.filter(project => !project.archivedAt).length && <option value="">No projects available</option>}
                        {state.projects.filter(project => !project.archivedAt).map(project => <option key={project.id} value={project.id}>{project.name}</option>)}
                      </select>
                    </Field>
                    <Field label="Task Name *" className="pm-create-span-2 pm-task-name-field">
                      <input value={taskDraft.title} onChange={event => setTaskDraft(prev => ({ ...prev, title: event.target.value }))} placeholder="Enter a clear, action-oriented task name" required />
                    </Field>
                    <label className="pm-field pm-create-span-2">
                      <span>Description</span>
                      <TaskDescriptionEditor
                        value={taskDraft.description}
                        onChange={description => setTaskDraft(prev => ({ ...prev, description }))}
                        onAttach={() => newTaskFileInputRef.current?.click()}
                      />
                    </label>
                    <Field label="Assignee *">
                      <select value={taskDraft.assigneeId} onChange={event => setTaskDraft(prev => ({ ...prev, assigneeId: event.target.value }))} required>
                        {!state.members.length && <option value="">Unassigned</option>}
                        {state.members.map(member => <option key={member.id} value={member.id}>{member.name}</option>)}
                      </select>
                    </Field>
                    <Field label="Due Date *">
                      <input type="date" value={taskDraft.dueDate} onChange={event => setTaskDraft(prev => ({ ...prev, dueDate: event.target.value }))} required />
                    </Field>
                    <Field label="Status *">
                      <select value={taskDraft.status} onChange={event => setTaskDraft(prev => ({ ...prev, status: event.target.value as TaskStatus }))} required>
                        {['To Do', 'In Progress', 'Review', 'Done', 'Blocked'].map(status => <option key={status} value={status}>{status}</option>)}
                      </select>
                    </Field>
                    <Field label="Priority *">
                      <select value={taskDraft.priority} onChange={event => setTaskDraft(prev => ({ ...prev, priority: event.target.value as TaskPriority }))} required>
                        {priorityOptions.filter(option => option !== 'All').map(option => <option key={option} value={option}>{option}</option>)}
                      </select>
                    </Field>
                    <Field label="Task ID" className="pm-task-id-field">
                      <input value={taskDraft.code} placeholder="Auto-generated" disabled readOnly />
                      <small>Generated automatically once the task is created.</small>
                    </Field>
                  </div>
                </section>

                <section className="pm-create-section pm-task-advanced-section">
                  <button type="button" className="pm-task-advanced-toggle" aria-expanded={taskAdvancedOpen} onClick={() => setTaskAdvancedOpen(prev => !prev)}>
                    <span>
                      <strong>Advanced details</strong>
                      <small>Category, followers, schedule, cost, and billing fields.</small>
                    </span>
                    <ChevronDown size={18} />
                  </button>
                  {taskAdvancedOpen && (
                    <div className="pm-task-advanced-panel">
                      <div className="pm-task-advanced-group">
                        <h4>Classification</h4>
                        <div className="pm-task-assignment-grid">
                          <Field label="Category">
                            <select value={taskDraft.category} onChange={event => setTaskDraft(prev => ({ ...prev, category: event.target.value }))}>
                              <option value="">Select category</option>
                              {taskCategoryOptions.map(option => <option key={option} value={option}>{option}</option>)}
                            </select>
                          </Field>
                          <Field label="Tags">
                            <input value={taskDraft.labels} onChange={event => setTaskDraft(prev => ({ ...prev, labels: event.target.value }))} placeholder="Select or type tags" />
                          </Field>
                          <Field label="Department">
                            <select value={taskDraft.department} onChange={event => setTaskDraft(prev => ({ ...prev, department: event.target.value }))}>
                              <option value="">Select department</option>
                              {taskDepartmentOptions.map(option => <option key={option} value={option}>{option}</option>)}
                            </select>
                          </Field>
                          <Field label="Team">
                            <select value={taskDraft.team} onChange={event => setTaskDraft(prev => ({ ...prev, team: event.target.value }))}>
                              <option value="">Select team</option>
                              {taskTeamOptions.map(option => <option key={option} value={option}>{option}</option>)}
                            </select>
                          </Field>
                        </div>
                      </div>

                      <div className="pm-task-advanced-group">
                        <h4>Followers</h4>
                        <div className="pm-task-assignment-grid compact">
                          <Field label="Add follower">
                            <select value={taskFollowerPick} onChange={event => addTaskFollower(event.target.value)}>
                              <option value="">Search and select followers</option>
                              {state.members.filter(member => !taskDraft.followers.includes(member.id)).map(member => <option key={member.id} value={member.id}>{member.name}</option>)}
                            </select>
                          </Field>
                        </div>
                        {!!taskDraft.followers.length && (
                          <div className="pm-create-team-list pm-task-follower-list" aria-label="Selected followers">
                            {taskDraft.followers.map(memberId => {
                              const member = state.members.find(item => item.id === memberId)
                              return <span key={memberId}>{member?.name || memberId}<button type="button" onClick={() => removeTaskFollower(memberId)} aria-label={`Remove ${member?.name || memberId}`}><X size={12} /></button></span>
                            })}
                          </div>
                        )}
                      </div>

                      <div className="pm-task-advanced-group">
                        <h4>Schedule</h4>
                        <div className="pm-task-schedule-grid">
                          <Field label="Start Date"><input type="date" value={taskDraft.startDate} onChange={event => setTaskDraft(prev => ({ ...prev, startDate: event.target.value }))} /></Field>
                          <Field label="Duration">
                            <select value={taskDraft.duration} onChange={event => setTaskDraft(prev => ({ ...prev, duration: event.target.value }))}>
                              <option value="">Select duration</option>
                              {taskDurationOptions.map(option => <option key={option} value={option}>{option}</option>)}
                            </select>
                          </Field>
                          <Field label="Working Days">
                            <select value={taskDraft.workingDays} onChange={event => setTaskDraft(prev => ({ ...prev, workingDays: event.target.value }))}>
                              <option value="">Select working days</option>
                              {workingDayOptions.map(option => <option key={option} value={option}>{option}</option>)}
                            </select>
                          </Field>
                        </div>
                      </div>

                      <div className="pm-task-advanced-group">
                        <h4>Time &amp; Budget</h4>
                        <div className="pm-task-time-grid">
                          <Field label="Estimated Hours">
                            <span className="pm-input-with-suffix"><input value={taskDraft.estimatedHours} onChange={event => setTaskDraft(prev => ({ ...prev, estimatedHours: event.target.value }))} type="number" min="0" step="0.25" inputMode="decimal" placeholder="e.g., 16" /><b>hrs</b></span>
                          </Field>
                          <Field label="Time Type">
                            <select value={taskDraft.timeType} onChange={event => setTaskDraft(prev => ({ ...prev, timeType: event.target.value }))}>
                              {taskTimeTypeOptions.map(option => <option key={option} value={option}>{option}</option>)}
                            </select>
                          </Field>
                          <Field label={`Budget (${currency})`}>
                            <span className="pm-input-with-prefix"><b>{currency}</b><input value={taskDraft.budget} onChange={event => setTaskDraft(prev => ({ ...prev, budget: event.target.value }))} type="number" min="0" inputMode="decimal" placeholder="e.g., 25,000.00" /></span>
                          </Field>
                          <label className="pm-field pm-task-toggle-field">
                            <span>Billable</span>
                            <button type="button" className={taskDraft.billable ? 'pm-create-toggle active' : 'pm-create-toggle'} aria-pressed={taskDraft.billable} onClick={() => setTaskDraft(prev => ({ ...prev, billable: !prev.billable }))}><i /></button>
                          </label>
                          <Field label="Cost Code">
                            <select value={taskDraft.costCode} onChange={event => setTaskDraft(prev => ({ ...prev, costCode: event.target.value }))}>
                              <option value="">Select cost code</option>
                              {taskCostCodeOptions.map(option => <option key={option} value={option}>{option}</option>)}
                            </select>
                          </Field>
                        </div>
                      </div>
                    </div>
                  )}
                </section>
              </main>

              <aside className="pm-create-side">
                <section className="pm-create-side-box">
                  <h3>Attachments</h3>
                  <label className="pm-task-upload-zone" htmlFor="pm-new-task-files">
                    <UploadCloud size={30} />
                    <span>Drag and drop files here or</span>
                    <b>Upload Files</b>
                  </label>
                  <input ref={newTaskFileInputRef} id="pm-new-task-files" className="pm-create-file-input" type="file" multiple onChange={attachNewTaskFiles} />
                  <small>Supports: PDF, DOC, XLS, JPG, PNG (Max 50MB)</small>
                  {!!newTaskAttachments.length && (
                    <div className="pm-task-attachment-list">
                      {newTaskAttachments.map((attachment, index) => (
                        <article key={`${attachment.name}-${index}`}>
                          <FileText size={15} />
                          <span><strong>{attachment.name}</strong><small>{attachment.fileType} - {attachment.size}</small></span>
                          <button type="button" onClick={() => removeNewTaskAttachment(index)} aria-label={`Remove ${attachment.name}`}><X size={13} /></button>
                        </article>
                      ))}
                    </div>
                  )}
                </section>

                <section className="pm-create-side-box pm-task-after-create">
                  <h3>After creation</h3>
                  <p>Open the task detail page to manage progress, subtasks, checklist items, updates, and time logs.</p>
                  <div>
                    <span><Timer size={14} /> Progress tracking</span>
                    <span><CheckSquare size={14} /> Subtasks and checklist</span>
                    <span><MessageSquare size={14} /> Updates and activity</span>
                  </div>
                </section>

                <div className="pm-create-actions">
                  <button type="button" className="pm-control" onClick={cancelCreateTask}>Cancel</button>
                  <button type="submit" className="pm-primary" disabled={!state.projects.filter(project => !project.archivedAt).length}><FileCheck2 size={15} /> Create Task</button>
                </div>
              </aside>
            </div>
          </form>
        )}

        {!showCreate && !showCreateTask && <section className="pm-tab-panel" aria-label={store.selectedProject ? 'Project detail workspace' : `${store.activeTab} workspace`}>
          {store.selectedProject ? (
            <ProjectDetails
              key={store.selectedProject.id}
              state={state}
              opportunities={store.opportunities}
              project={store.selectedProject}
              active={store.detailTab}
              onTab={store.setDetailTab}
              onClose={closeProjectDetail}
              onAddTask={openProjectTaskModal}
              onUpdate={store.updateProject}
              onOpenTask={openTaskDetail}
              onEditTask={openEditTaskModal}
              onArchiveTask={store.archiveTask}
              onDeleteTask={store.deleteTask}
              onDragTask={setDraggedTask}
              onDropTask={onDropTask}
              onArchive={projectId => {
                store.archiveProject(projectId)
                store.setSelectedProjectId(null)
              }}
              onRestore={store.restoreProject}
              onDelete={projectId => {
                store.deleteProject(projectId)
                store.setSelectedProjectId(null)
              }}
              onAddNote={store.addProjectNote}
              onCreateMilestone={store.createMilestone}
              onUpdateMilestone={store.updateMilestone}
              onUpdateMilestoneStatus={store.updateMilestoneStatus}
              onDeleteMilestone={store.deleteMilestone}
            />
          ) : (
            <>
              {store.activeTab === 'Overview' && (
                <OverviewTab
                  state={filteredState}
                  opportunities={store.opportunities}
                  projects={filteredProjects}
                  budget={budget}
                  hasAnyProjects={hasAnyActiveProjects}
                  onOpen={store.setSelectedProjectId}
                  onEdit={projectId => {
                    store.setSelectedProjectId(projectId)
                    store.setDetailTab('Settings')
                  }}
                  onArchive={store.archiveProject}
                  onDelete={store.deleteProject}
                  onNewProject={openCreateProject}
                />
              )}
              {store.activeTab === 'Projects' && (
                <ProjectsTab
                  state={state}
                  opportunities={store.opportunities}
                  currency={currency}
                  onOpen={store.setSelectedProjectId}
                  onEdit={projectId => {
                    store.setSelectedProjectId(projectId)
                    store.setDetailTab('Settings')
                  }}
                  onUpdate={store.updateProject}
                  onArchive={store.archiveProject}
                  onRestore={store.restoreProject}
                  onDelete={store.deleteProject}
                />
              )}
              {store.activeTab === 'Archived' && (
                <ArchivedTab
                  state={state}
                  opportunities={store.opportunities}
                  currency={currency}
                  onOpen={store.setSelectedProjectId}
                  onEdit={projectId => {
                    store.setSelectedProjectId(projectId)
                    store.setDetailTab('Settings')
                  }}
                  onUpdate={store.updateProject}
                  onArchive={store.archiveProject}
                  onRestore={store.restoreProject}
                  onDelete={store.deleteProject}
                />
              )}
              {store.activeTab === 'Budget' && <BudgetTab state={filteredState} budget={budget} />}
              {store.activeTab === 'Documents' && <DocumentsTab state={filteredState} />}
            </>
          )}
        </section>}
        </div>
      </div>

      {actionModal && (
        <div className="pm-modal-backdrop" role="dialog" aria-modal="true">
          <div className={actionModal === 'task' ? 'pm-card pm-modal pm-task-editor-modal' : 'pm-card pm-modal'}>
            <div className="pm-modal-head">
              <div>
                <h2>{actionModal === 'task' ? editingTaskId ? 'Edit Task' : 'Assign Task' : actionModal === 'time' ? 'Log Time' : 'Upload Document'}</h2>
                {actionModal === 'task' && <p>Update task scope, ownership, schedule, and collaboration details.</p>}
              </div>
              <button type="button" onClick={closeActionModal}>Close</button>
            </div>
            {actionModal === 'task' && (
              <div className="pm-task-editor-body">
                <form className="pm-form pm-modal-form pm-task-modal-form" onSubmit={submitTask}>
                  <section className="pm-task-form-section pm-task-form-main">
                    <h3>Task</h3>
                    <div className="pm-task-form-grid">
                      <Field label="Project" className="pm-span-2"><select value={taskDraft.projectId} onChange={event => setTaskDraft(prev => ({ ...prev, projectId: event.target.value }))}>{!state.projects.filter(project => !project.archivedAt).length && <option value="">No projects available</option>}{state.projects.filter(project => !project.archivedAt).map(project => <option key={project.id} value={project.id}>{project.name}</option>)}</select></Field>
                      <Field label="Task title" className="pm-span-2"><input value={taskDraft.title} onChange={event => setTaskDraft(prev => ({ ...prev, title: event.target.value }))} required /></Field>
                      <label className="pm-field pm-span-2"><span>Description</span><textarea value={taskDraft.description} onChange={event => setTaskDraft(prev => ({ ...prev, description: event.target.value }))} rows={3} /></label>
                    </div>
                  </section>

                  <section className="pm-task-form-section pm-task-form-side">
                    <h3>Assignment</h3>
                    <div className="pm-task-side-grid">
                      <Field label="Assignee"><select value={taskDraft.assigneeId} onChange={event => setTaskDraft(prev => ({ ...prev, assigneeId: event.target.value }))}>{!state.members.length && <option value="">Unassigned</option>}{state.members.map(member => <option key={member.id} value={member.id}>{member.name}</option>)}</select></Field>
                      <Field label="Status"><select value={taskDraft.status} onChange={event => setTaskDraft(prev => ({ ...prev, status: event.target.value as TaskStatus }))}>{['To Do', 'In Progress', 'Review', 'Done', 'Blocked'].map(status => <option key={status} value={status}>{status}</option>)}</select></Field>
                      <Field label="Priority"><select value={taskDraft.priority} onChange={event => setTaskDraft(prev => ({ ...prev, priority: event.target.value as TaskPriority }))}>{priorityOptions.filter(option => option !== 'All').map(option => <option key={option} value={option}>{option}</option>)}</select></Field>
                      <Field label="Due date"><input type="date" value={taskDraft.dueDate} onChange={event => setTaskDraft(prev => ({ ...prev, dueDate: event.target.value }))} /></Field>
                      <Field label="Progress %"><input type="number" min="0" max="100" value={taskDraft.progress} onChange={event => setTaskDraft(prev => ({ ...prev, progress: event.target.value }))} /></Field>
                    </div>
                  </section>

                  <div className="pm-form-actions"><button type="submit" className="pm-primary" disabled={!state.projects.filter(project => !project.archivedAt).length}>{editingTaskId ? 'Save Task' : 'Assign Task'}</button></div>
                </form>
                {editingTask && (
                  <TaskCollaborationPanel
                    state={state}
                    task={editingTask}
                    commentDraft={taskCommentDraft}
                    attachmentNote={taskAttachmentNote}
                    checklistDraft={taskChecklistDraft}
                    evidenceMode={taskEvidenceMode}
                    onCommentDraft={setTaskCommentDraft}
                    onChecklistDraft={setTaskChecklistDraft}
                    onAttachmentNote={setTaskAttachmentNote}
                    onEvidenceMode={setTaskEvidenceMode}
                    onAddComment={addTaskComment}
                    onAddChecklistItem={addTaskChecklistItem}
                    onToggleChecklistItem={(itemId, done) => store.updateTaskChecklistItem(itemId, { done })}
                    onDeleteChecklistItem={store.deleteTaskChecklistItem}
                    onAttachFiles={attachTaskFiles}
                    onDeleteAttachment={store.deleteTaskAttachment}
                  />
                )}
              </div>
            )}
            {actionModal === 'time' && (
              <form className="pm-form pm-modal-form" onSubmit={submitTime}>
                <Field label="Project"><select value={timeDraft.projectId} onChange={event => setTimeDraft(prev => ({ ...prev, projectId: event.target.value }))}>{!state.projects.filter(project => !project.archivedAt).length && <option value="">No projects available</option>}{state.projects.filter(project => !project.archivedAt).map(project => <option key={project.id} value={project.id}>{project.name}</option>)}</select></Field>
                <Field label="Task"><select value={timeDraft.taskId} onChange={event => setTimeDraft(prev => ({ ...prev, taskId: event.target.value }))}>{!state.tasks.filter(task => !task.archivedAt).length && <option value="">No tasks available</option>}{state.tasks.filter(task => !task.archivedAt).map(task => <option key={task.id} value={task.id}>{task.title}</option>)}</select></Field>
                <Field label="Employee"><select value={timeDraft.employeeId} onChange={event => setTimeDraft(prev => ({ ...prev, employeeId: event.target.value }))}>{!state.members.length && <option value="">Unassigned</option>}{state.members.map(member => <option key={member.id} value={member.id}>{member.name}</option>)}</select></Field>
                <Field label="Hours"><input type="number" min="0" step="0.25" value={timeDraft.hours} onChange={event => setTimeDraft(prev => ({ ...prev, hours: event.target.value }))} /></Field>
                <Field label="Date"><input type="date" value={timeDraft.date} onChange={event => setTimeDraft(prev => ({ ...prev, date: event.target.value }))} /></Field>
                <label className="pm-check"><input type="checkbox" checked={timeDraft.billable} onChange={event => setTimeDraft(prev => ({ ...prev, billable: event.target.checked }))} /> Billable</label>
                <div className="pm-form-actions"><button type="submit" className="pm-primary" disabled={!state.projects.filter(project => !project.archivedAt).length || !state.tasks.filter(task => !task.archivedAt).length}>Log Time</button></div>
              </form>
            )}
            {actionModal === 'document' && (
              <form className="pm-form pm-modal-form" onSubmit={submitDocument}>
                <Field label="Project"><select value={documentDraft.projectId} onChange={event => setDocumentDraft(prev => ({ ...prev, projectId: event.target.value }))}>{!state.projects.length && <option value="">No projects available</option>}{state.projects.map(project => <option key={project.id} value={project.id}>{project.name}</option>)}</select></Field>
                <Field label="Document name"><input value={documentDraft.name} onChange={event => setDocumentDraft(prev => ({ ...prev, name: event.target.value }))} required /></Field>
                <Field label="Type"><select value={documentDraft.type} onChange={event => setDocumentDraft(prev => ({ ...prev, type: event.target.value as DocumentType }))}>{documentTypes.map(type => <option key={type} value={type}>{type}</option>)}</select></Field>
                <Field label="Folder"><input value={documentDraft.folder} onChange={event => setDocumentDraft(prev => ({ ...prev, folder: event.target.value }))} /></Field>
                <Field label="Size"><input value={documentDraft.size} onChange={event => setDocumentDraft(prev => ({ ...prev, size: event.target.value }))} /></Field>
                <div className="pm-form-actions"><button type="submit" className="pm-primary" disabled={!state.projects.length}>Upload Document</button></div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
