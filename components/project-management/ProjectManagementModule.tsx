'use client'

import { ChangeEvent, DragEvent, FormEvent, ReactNode, useEffect, useMemo, useRef, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import {
  ArrowUpDown,
  Bell,
  Archive,
  BriefcaseBusiness,
  CalendarDays,
  Camera,
  CheckCircle2,
  CheckSquare,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Download,
  FileCheck2,
  FileText,
  Filter,
  Home,
  LayoutGrid,
  List,
  ListChecks,
  Mail,
  MapPin,
  MessageSquare,
  MoreHorizontal,
  Paperclip,
  Pencil,
  Phone,
  Plus,
  Printer,
  Repeat2,
  RotateCcw,
  Search,
  Share2,
  Star,
  Timer,
  Trash2,
  UploadCloud,
  WalletCards,
  X,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { budgetSummary, formatDate, formatMoney, initials, monthlyStatusTrend, progressSegments, projectStats, tasksByStatus, workloadByMember } from '@/lib/project-management/metrics'
import type { DocumentType, MilestoneStatus, ProjectHealth, ProjectManagementState, ProjectMilestone, ProjectRecord, ProjectStatus, ProjectTask, TaskPriority, TaskStatus } from '@/lib/project-management/types'
import type { MilestoneDraft, MilestoneUpdateDraft, ProjectSalesOpportunity, ProjectUpdateDraft, TaskAttachmentDraft } from '@/lib/project-management/service'
import { loadProjectThumbnailAsset, saveProjectThumbnailAsset } from '@/lib/project-management/service'
import { companyChangeEvent, getActiveCompany } from '@/lib/tenant/company'
import { useProjectManagement } from './useProjectManagement'

const tabs = ['Projects', 'Archived', 'Overview'] as const
type ProjectManagementTab = typeof tabs[number] | 'Tasks' | 'Kanban' | 'Budget' | 'Documents'
type ProjectDirectoryTab = 'Projects' | 'Archived'
type ProjectDirectoryView = 'list' | 'grid'
type ProjectSort = { key: 'name' | 'budget'; direction: 'asc' | 'desc' }
const viewToTab: Record<string, string> = {
  overview: 'Overview',
  projects: 'Projects',
  archived: 'Archived',
  tasks: 'Tasks',
  kanban: 'Kanban',
  budget: 'Budget',
  documents: 'Documents',
}
const pathToTab: Record<string, ProjectManagementTab> = {
  '/project-management': 'Overview',
  '/project-management/projects': 'Projects',
  '/project-management/archived': 'Archived',
  '/project-management/tasks': 'Tasks',
  '/project-management/kanban': 'Kanban',
  '/project-management/budget': 'Budget',
  '/project-management/documents': 'Documents',
}
const tabToPath: Record<ProjectManagementTab, string> = Object.fromEntries(
  Object.entries(pathToTab).map(([path, tab]) => [tab, path]),
) as Record<ProjectManagementTab, string>
const detailTabs = ['Overview', 'Tasks', 'Files', 'Team', 'Budget', 'Schedule', 'Reports', 'Settings']
const statusOptions = ['All', 'Planning', 'Active', 'In Progress', 'On Hold', 'Completed', 'Cancelled']
const projectStatusOptions: ProjectStatus[] = ['Planning', 'Active', 'In Progress', 'On Hold', 'Completed', 'Cancelled']
const healthOptions: ProjectHealth[] = ['Good', 'At Risk', 'Delayed']
const milestoneStatusOptions: MilestoneStatus[] = ['Pending', 'In Progress', 'Done', 'Delayed']
const phaseOptions = ['Planning', 'Design', 'Procurement', 'Execution', 'Inspection', 'Handover', 'Closeout']
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
const maxProjectThumbnailDataUrlChars = 240_000
const colors = {
  green: '#16a34a',
  blue: '#2f80ed',
  orange: '#f59e0b',
  purple: '#8b5cf6',
  red: '#ef4444',
  slate: '#64748b',
}

function fieldId(name: string) {
  return `pm-${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`
}

function opportunityKey(source?: ProjectSalesOpportunity['source'], id?: string) {
  return source && id ? `${source}:${id}` : ''
}

function parseOpportunityKey(value: string): Pick<ProjectRecord, 'opportunityId' | 'opportunitySource'> {
  const [source, ...rest] = value.split(':')
  const id = rest.join(':')
  if ((source === 'sales' || source === 'legacy') && id) return { opportunitySource: source, opportunityId: id }
  return { opportunityId: undefined, opportunitySource: undefined }
}

function findOpportunityByKey(opportunities: ProjectSalesOpportunity[], key: string) {
  return opportunities.find(opportunity => opportunityKey(opportunity.source, opportunity.id) === key)
}

function opportunityLabel(opportunity: ProjectSalesOpportunity) {
  return `${opportunity.label} - ${opportunity.clientName} - ${formatMoney(opportunity.value)}`
}

function resolveOpportunityClientId(opportunity: ProjectSalesOpportunity, clients: ProjectManagementState['clients']) {
  if (opportunity.clientId && clients.some(client => client.id === opportunity.clientId)) return opportunity.clientId
  const clientName = opportunity.clientName.trim().toLowerCase()
  return clients.find(client => client.name.trim().toLowerCase() === clientName)?.id || ''
}

function formatFileSize(bytes: number) {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 KB'
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function formatCurrency(value: number, currency = 'USD') {
  const safeCurrency = currency || 'USD'
  const locale = safeCurrency === 'PHP' ? 'en-PH' : 'en-US'
  try {
    return new Intl.NumberFormat(locale, { style: 'currency', currency: safeCurrency, maximumFractionDigits: 0 }).format(value || 0)
  } catch {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value || 0)
  }
}

function formatRelativeTime(value: string | undefined, nowMs: number) {
  if (!value) return '-'
  const time = new Date(value.includes('T') ? value : `${value}T00:00:00`).getTime()
  if (!Number.isFinite(time)) return '-'
  const seconds = Math.max(0, Math.floor((nowMs - time) / 1000))
  if (seconds < 60) return 'now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}d ago`
  const months = Math.floor(days / 30)
  if (months < 12) return `${months}mo ago`
  return `${Math.floor(months / 12)}y ago`
}

function taskFileType(file: File) {
  if (file.type.startsWith('image/')) return 'Photo'
  if (file.type.includes('pdf')) return 'PDF'
  if (file.type.includes('spreadsheet') || file.name.match(/\.(xls|xlsx|csv)$/i)) return 'Spreadsheet'
  if (file.type.includes('word') || file.name.match(/\.(doc|docx)$/i)) return 'Document'
  return 'File'
}

function readFileAsDataUrl(file: File) {
  const maxStoredFileBytes = 2 * 1024 * 1024
  if (file.size > maxStoredFileBytes) return Promise.resolve<string | undefined>(undefined)
  return new Promise<string | undefined>(resolve => {
    const reader = new FileReader()
    reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : undefined)
    reader.onerror = () => resolve(undefined)
    reader.readAsDataURL(file)
  })
}

function isProjectThumbnailFile(file: File) {
  return file.type.startsWith('image/') || /\.(png|jpe?g|webp)$/i.test(file.name)
}

function readThumbnailAsDataUrl(file: File) {
  if (!isProjectThumbnailFile(file)) return Promise.resolve<string | undefined>(undefined)
  if (typeof document === 'undefined') return readFileAsDataUrl(file)
  return new Promise<string | undefined>(resolve => {
    const url = URL.createObjectURL(file)
    const image = new Image()
    const cleanup = () => URL.revokeObjectURL(url)
    image.onload = () => {
      try {
        const canvas = document.createElement('canvas')
        const context = canvas.getContext('2d')
        if (!context) {
          cleanup()
          readFileAsDataUrl(file).then(resolve)
          return
        }
        let bestDataUrl = ''
        const sizes = [
          [640, 360],
          [520, 292],
          [420, 236],
          [320, 180],
        ]
        const qualities = [0.74, 0.6, 0.48, 0.36]
        for (const [maxWidth, maxHeight] of sizes) {
          const scale = Math.min(1, maxWidth / image.naturalWidth, maxHeight / image.naturalHeight)
          const width = Math.max(1, Math.round(image.naturalWidth * scale))
          const height = Math.max(1, Math.round(image.naturalHeight * scale))
          canvas.width = width
          canvas.height = height
          context.fillStyle = '#0b0b0b'
          context.fillRect(0, 0, width, height)
          context.drawImage(image, 0, 0, width, height)
          for (const quality of qualities) {
            const dataUrl = canvas.toDataURL('image/jpeg', quality)
            bestDataUrl = dataUrl
            if (dataUrl.length <= maxProjectThumbnailDataUrlChars) {
              cleanup()
              resolve(dataUrl)
              return
            }
          }
        }
        cleanup()
        resolve(bestDataUrl && bestDataUrl.length <= maxProjectThumbnailDataUrlChars ? bestDataUrl : undefined)
      } catch {
        cleanup()
        readFileAsDataUrl(file).then(resolve)
      }
    }
    image.onerror = () => {
      cleanup()
      readFileAsDataUrl(file).then(resolve)
    }
    image.src = url
  })
}

function createProjectThumbnailAssetId() {
  return `project-thumbnail-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

async function prepareProjectThumbnail(file: File) {
  const dataUrl = await readThumbnailAsDataUrl(file)
  if (!dataUrl) return { dataUrl: '', assetId: '', name: file.name }
  const assetId = createProjectThumbnailAssetId()
  const saved = await saveProjectThumbnailAsset(assetId, dataUrl)
  return { dataUrl, assetId: saved ? assetId : '', name: file.name }
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
  const [currency, setCurrency] = useState('USD')
  const [showCreate, setShowCreate] = useState(false)
  const [showCreateTask, setShowCreateTask] = useState(false)
  const [dateOpen, setDateOpen] = useState(false)
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
  const datePanelRef = useRef<HTMLElement | null>(null)
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
  const changeMainTab = (tab: string) => {
    const nextTab = tab as ProjectManagementTab
    store.setSelectedProjectId(null)
    store.setActiveTab(nextTab)
    const nextPath = tabToPath[nextTab]
    if (nextPath && nextPath !== pathname) router.push(nextPath)
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
      action: () => store.setActiveTab('Tasks'),
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
    const refreshCurrency = () => setCurrency(getActiveCompany()?.settings.currency || 'USD')
    refreshCurrency()
    window.addEventListener(companyChangeEvent, refreshCurrency)
    window.addEventListener('storage', refreshCurrency)
    return () => {
      window.removeEventListener(companyChangeEvent, refreshCurrency)
      window.removeEventListener('storage', refreshCurrency)
    }
  }, [])

  useEffect(() => {
    const nextTab = initialTab || pathToTab[pathname] || viewToTab[searchParams.get('view') || 'overview']
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
    if (!dateOpen && !filtersOpen && !projectAlertsOpen) return

    const closeOnOutsideTap = (event: PointerEvent) => {
      const target = event.target as Node | null
      if (!target) return
      if (datePanelRef.current?.contains(target)) return
      if (filterPanelRef.current?.contains(target)) return
      if (projectAlertsRef.current?.contains(target)) return
      if (headerActionsRef.current?.contains(target)) return
      setDateOpen(false)
      setFiltersOpen(false)
      setProjectAlertsOpen(false)
    }

    document.addEventListener('pointerdown', closeOnOutsideTap)
    return () => document.removeEventListener('pointerdown', closeOnOutsideTap)
  }, [dateOpen, filtersOpen, projectAlertsOpen])

  const setDatePreset = (preset: 'all' | 'month' | 'next30' | 'quarter') => {
    const today = new Date()
    if (preset === 'all') {
      setFilters(prev => ({ ...prev, dateFrom: '', dateTo: '' }))
      setDateOpen(false)
      return
    }
    if (preset === 'month') {
      const start = new Date(today.getFullYear(), today.getMonth(), 1)
      const end = new Date(today.getFullYear(), today.getMonth() + 1, 0)
      setFilters(prev => ({ ...prev, dateFrom: inputDate(start), dateTo: inputDate(end) }))
      setDateOpen(false)
      return
    }
    if (preset === 'next30') {
      const end = new Date(today)
      end.setDate(today.getDate() + 30)
      setFilters(prev => ({ ...prev, dateFrom: inputDate(today), dateTo: inputDate(end) }))
      setDateOpen(false)
      return
    }
    const quarter = Math.floor(today.getMonth() / 3)
    const start = new Date(today.getFullYear(), quarter * 3, 1)
    const end = new Date(today.getFullYear(), quarter * 3 + 3, 0)
    setFilters(prev => ({ ...prev, dateFrom: inputDate(start), dateTo: inputDate(end) }))
    setDateOpen(false)
  }

  const openCreateProject = () => {
    setDateOpen(false)
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
    setDateOpen(false)
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
    if (store.selectedProject) store.setDetailTab('Tasks')
    store.setActiveTab('Tasks')
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
    const drafts = await Promise.all(files.map(async file => ({
      taskId: editingTaskId,
      name: file.name,
      fileType: taskFileType(file),
      mimeType: file.type || 'application/octet-stream',
      size: formatFileSize(file.size),
      evidence: taskEvidenceMode,
      note: taskAttachmentNote,
      dataUrl: await readFileAsDataUrl(file),
    })))
    store.addTaskAttachments(drafts)
    setTaskAttachmentNote('')
    event.target.value = ''
  }

  const attachNewTaskFiles = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || [])
    if (!files.length) return
    const drafts = await Promise.all(files.map(async file => ({
      name: file.name,
      fileType: taskFileType(file),
      mimeType: file.type || 'application/octet-stream',
      size: formatFileSize(file.size),
      evidence: false,
      dataUrl: await readFileAsDataUrl(file),
    })))
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

  const openActionModal = (action: 'task' | 'time' | 'document') => {
    if (action === 'task') {
      openCreateTaskPage()
      return
    }
    if (action === 'time') setTimeDraft(defaultTimeDraft(state))
    if (action === 'document') setDocumentDraft(defaultDocumentDraft(state))
    setActionModal(action)
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

  return (
    <div className="pm-shell">
      <style>{projectManagementCss}</style>
      <div className="pm-workspace">
        {!store.selectedProject && !showCreate && !showCreateTask && (
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
                  <button type="button" className="pm-control pm-date-control" onClick={() => { setDateOpen(open => !open); setFiltersOpen(false); setProjectAlertsOpen(false) }} aria-expanded={dateOpen} aria-controls="pm-date-panel"><CalendarDays size={15} /> {dateRangeLabel} <ChevronDown size={13} /></button>
                  <label className="pm-search pm-page-search"><Search size={16} /><input value={filters.query} onChange={event => setFilters(prev => ({ ...prev, query: event.target.value }))} placeholder="Search projects, tasks, documents..." /></label>
                  <button type="button" className="pm-control pm-bell-control" onClick={() => { setProjectAlertsOpen(open => !open); setDateOpen(false); setFiltersOpen(false) }} aria-label="Project notifications" aria-expanded={projectAlertsOpen} aria-controls="pm-project-alerts"><Bell size={15} /></button>
                  <button type="button" className="pm-control pm-filter-control" onClick={() => { setFiltersOpen(open => !open); setDateOpen(false); setProjectAlertsOpen(false) }} aria-expanded={filtersOpen} aria-controls="pm-filter-panel"><Filter size={15} /> Filters</button>
                  <button type="button" className="pm-primary pm-new-project-button" onClick={openCreateProject}><Plus size={16} /> New Project <ChevronDown size={13} /></button>
                </>
              )}
            </div>
          </header>
        )}

        {!store.selectedProject && (dateOpen || filtersOpen) && (
          <div className="pm-filter-backdrop" aria-hidden="true" />
        )}

        {!store.selectedProject && dateOpen && (
          <section className="pm-card pm-date-panel" id="pm-date-panel" aria-label="Project date range" ref={datePanelRef}>
            <div className="pm-date-presets">
              <button type="button" onClick={() => setDatePreset('all')}>All project dates</button>
              <button type="button" onClick={() => setDatePreset('month')}>This month</button>
              <button type="button" onClick={() => setDatePreset('next30')}>Next 30 days</button>
              <button type="button" onClick={() => setDatePreset('quarter')}>This quarter</button>
            </div>
            <Field label="Date from"><input type="date" value={filters.dateFrom} onChange={event => setFilters(prev => ({ ...prev, dateFrom: event.target.value }))} /></Field>
            <Field label="Date to"><input type="date" value={filters.dateTo} onChange={event => setFilters(prev => ({ ...prev, dateTo: event.target.value }))} /></Field>
            <div className="pm-form-actions"><button type="button" className="pm-control" onClick={() => setDatePreset('all')}>Clear Dates</button></div>
          </section>
        )}

        {!store.selectedProject && filtersOpen && (
          <section className="pm-card pm-filter-panel" id="pm-filter-panel" aria-label="Project filters" ref={filterPanelRef}>
            <Field label="Status"><Select value={filters.status} options={statusOptions} onChange={value => setFilters(prev => ({ ...prev, status: value }))} /></Field>
            <Field label="Priority"><Select value={filters.priority} options={priorityOptions} onChange={value => setFilters(prev => ({ ...prev, priority: value }))} /></Field>
            <Field label="Department"><Select value={filters.department} options={departments} onChange={value => setFilters(prev => ({ ...prev, department: value }))} /></Field>
            <div className="pm-form-actions"><button type="button" className="pm-control" onClick={() => setFilters(prev => ({ ...prev, status: 'All', priority: 'All', assignee: 'All', department: 'All' }))}>Reset Filters</button></div>
          </section>
        )}

        {!store.selectedProject && projectAlertsOpen && (
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

        {!store.selectedProject && !showCreate && !showCreateTask && (
          <TabBar
            tabs={tabs}
            active={store.activeTab}
            onChange={changeMainTab}
          />
        )}

        {store.activeTab === 'Overview' && !store.selectedProject && !showCreate && !showCreateTask && (
          <section className="pm-kpis">
            {kpis.map(kpi => <KpiCard key={kpi.title} {...kpi} />)}
          </section>
        )}

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
              {store.activeTab === 'Overview' && <Overview state={filteredState} opportunities={store.opportunities} projects={filteredProjects} budget={budget} onOpen={store.setSelectedProjectId} onAction={openActionModal} onNewProject={openCreateProject} />}
              {(store.activeTab === 'Projects' || store.activeTab === 'Archived') && (
                <ProjectsTab
                  key={store.activeTab}
                  initialDirectoryTab={store.activeTab}
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
              {store.activeTab === 'Tasks' && <TasksTab state={filteredState} onOpenTask={openTaskDetail} onEditTask={openEditTaskModal} onArchiveTask={store.archiveTask} onDeleteTask={store.deleteTask} />}
              {store.activeTab === 'Kanban' && <Kanban state={filteredState} onDrag={setDraggedTask} onDrop={onDropTask} onOpenTask={openTaskDetail} onEditTask={openEditTaskModal} onArchiveTask={store.archiveTask} onDeleteTask={store.deleteTask} />}
              {store.activeTab === 'Budget' && <BudgetTab state={filteredState} budget={budget} />}
              {store.activeTab === 'Documents' && <Documents state={filteredState} />}
            </>
          )}
        </section>}
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

function KpiCard({ title, value, change, comparison, icon: Icon, tone, negative }: { title: string; value: string; change: string; comparison: string; icon: LucideIcon; tone: string; negative?: boolean }) {
  return <article className="pm-card pm-kpi"><span style={{ background: `${tone}16`, color: tone }}><Icon size={24} /></span><div><small>{title}</small><strong>{value}</strong><em className={negative ? 'negative' : ''}>{change} {comparison}</em></div></article>
}

function TabBar({ tabs, active, onChange }: { tabs: readonly string[]; active: string; onChange: (tab: string) => void }) {
  return <nav className="pm-tabs" role="tablist" aria-label="Project management sections">{tabs.map(tab => <button key={tab} type="button" role="tab" aria-selected={active === tab} className={active === tab ? 'active' : undefined} onClick={() => onChange(tab)}>{tab}</button>)}</nav>
}

function Field({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  const required = /\*\s*$/.test(label)
  const text = required ? label.replace(/\s*\*+\s*$/, '') : label
  return (
    <label className={`pm-field${className ? ` ${className}` : ''}`} htmlFor={fieldId(label)}>
      <span>{text}{required && <i className="pm-required" aria-hidden="true">*</i>}</span>
      {children}
    </label>
  )
}

function Overview({ state, opportunities, projects, budget, onOpen, onAction, onNewProject }: { state: ProjectManagementState; opportunities: ProjectSalesOpportunity[]; projects: ProjectRecord[]; budget: ReturnType<typeof budgetSummary>; onOpen: (id: string) => void; onAction: (action: 'task' | 'time' | 'document') => void; onNewProject: () => void }) {
  const segments = progressSegments(state)
  const trend = monthlyStatusTrend(state)
  return (
    <section className="pm-overview-grid pm-dashboard-overview">
      <div className="pm-card pm-progress-card"><SectionTitle title="Project Progress Overview" /><Donut data={segments} center={String(state.projects.length)} sub="Total Projects" /></div>
      <div className="pm-card pm-trend"><SectionTitle title="Projects by Status" /><LineChart data={trend} /></div>
      <div className="pm-card pm-milestones"><SectionTitle title="Upcoming Milestones" /><MilestoneList state={state} /></div>
      <div className="pm-card pm-recent"><SectionTitle title="Recent Projects" /><ProjectTable state={state} opportunities={opportunities} projects={projects.slice(0, 5)} onOpen={onOpen} /></div>
      <div className="pm-card pm-budget-card"><SectionTitle title="Project Budget Summary" /><BudgetSummary budget={budget} /></div>
      <div className="pm-card pm-quick-card"><SectionTitle title="Quick Actions" /><QuickActions onNewProject={onNewProject} onAction={onAction} /></div>
    </section>
  )
}

function ProjectsTab({
  initialDirectoryTab = 'Projects',
  state,
  opportunities,
  currency,
  onOpen,
  onEdit,
  onUpdate,
  onArchive,
  onRestore,
  onDelete,
}: {
  initialDirectoryTab?: ProjectDirectoryTab
  state: ProjectManagementState
  opportunities: ProjectSalesOpportunity[]
  currency: string
  onOpen: (id: string) => void
  onEdit: (id: string) => void
  onUpdate: (projectId: string, patch: ProjectUpdateDraft, action?: string) => void
  onArchive: (id: string) => void
  onRestore: (id: string) => void
  onDelete: (id: string) => void
}) {
  const activeDirectoryTab: ProjectDirectoryTab = initialDirectoryTab === 'Archived' ? 'Archived' : 'Projects'
  const [viewMode, setViewMode] = useState<ProjectDirectoryView>('list')
  const [sort, setSort] = useState<ProjectSort>({ key: 'name', direction: 'asc' })
  const [page, setPage] = useState(1)
  const [nowMs] = useState(() => Date.now())
  const rowsPerPage = 8
  const visibleProjects = useMemo(
    () => state.projects.filter(project => activeDirectoryTab === 'Archived' ? Boolean(project.archivedAt) : !project.archivedAt),
    [activeDirectoryTab, state.projects],
  )
  const sortedProjects = useMemo(() => sortProjectsForDirectory(visibleProjects, sort), [sort, visibleProjects])
  const pageCount = Math.max(1, Math.ceil(sortedProjects.length / rowsPerPage))
  const currentPage = Math.min(page, pageCount)
  const pageProjects = sortedProjects.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage)
  const pageStart = sortedProjects.length ? (currentPage - 1) * rowsPerPage + 1 : 0
  const pageEnd = Math.min(currentPage * rowsPerPage, sortedProjects.length)

  const changeViewMode = (mode: ProjectDirectoryView) => {
    setViewMode(mode)
    setPage(1)
  }

  const setSortKey = (key: ProjectSort['key']) => {
    setPage(1)
    setSort(previous => ({
      key,
      direction: previous.key === key && previous.direction === 'asc' ? 'desc' : 'asc',
    }))
  }

  return (
    <section className="pm-project-directory">
      <div className="pm-project-toolbar">
        <div className="pm-project-view-switch" aria-label="Project view">
          <button type="button" className={viewMode === 'list' ? 'active' : undefined} onClick={() => changeViewMode('list')} aria-label="List view" title="List view"><List size={17} /></button>
          <button type="button" className={viewMode === 'grid' ? 'active' : undefined} onClick={() => changeViewMode('grid')} aria-label="Grid view" title="Grid view"><LayoutGrid size={17} /></button>
        </div>
      </div>

      {viewMode === 'list' ? (
        <ProjectDirectoryTable state={state} opportunities={opportunities} projects={pageProjects} currency={currency} sort={sort} nowMs={nowMs} onSort={setSortKey} onOpen={onOpen} onEdit={onEdit} onUpdate={onUpdate} onArchive={onArchive} onRestore={onRestore} onDelete={onDelete} />
      ) : (
        <ProjectDirectoryGrid state={state} opportunities={opportunities} projects={pageProjects} currency={currency} onOpen={onOpen} onEdit={onEdit} onUpdate={onUpdate} onArchive={onArchive} onRestore={onRestore} onDelete={onDelete} />
      )}

      <div className="pm-project-pagination">
        <span>Showing {pageStart} to {pageEnd} of {sortedProjects.length} projects</span>
        <div>
          <button type="button" onClick={() => setPage(Math.max(1, currentPage - 1))} disabled={currentPage === 1} aria-label="Previous projects page"><ChevronLeft size={15} /></button>
          <strong>{currentPage}</strong>
          <button type="button" onClick={() => setPage(Math.min(pageCount, currentPage + 1))} disabled={currentPage === pageCount} aria-label="Next projects page"><ChevronRight size={15} /></button>
        </div>
      </div>
    </section>
  )
}

function sortProjectsForDirectory(projects: ProjectRecord[], sort: ProjectSort) {
  return [...projects].sort((a, b) => {
    const direction = sort.direction === 'asc' ? 1 : -1
    if (sort.key === 'budget') return (a.budget - b.budget) * direction
    return a.name.localeCompare(b.name) * direction
  })
}

function projectTasksFor(state: ProjectManagementState, projectId: string) {
  return state.tasks.filter(task => task.projectId === projectId && !task.archivedAt)
}

function projectSubtitle(project: ProjectRecord, opportunity?: ProjectSalesOpportunity) {
  if (opportunity) return `Linked to ${opportunity.label}`
  if (project.tags.length) return project.tags.join(', ')
  return project.department || 'Construction'
}

function latestProjectUpdatedAt(state: ProjectManagementState, project: ProjectRecord) {
  const values = [
    project.updatedAt,
    ...state.tasks.filter(task => task.projectId === project.id).map(task => task.updatedAt),
    ...state.documents.filter(document => document.projectId === project.id).map(document => document.updatedAt),
    ...state.activities.filter(activity => activity.projectId === project.id).map(activity => activity.createdAt),
  ].filter((value): value is string => Boolean(value))
  return values.sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0]
}

function ProjectDirectoryTable({ state, opportunities, projects, currency, sort, nowMs, onSort, onOpen, onEdit, onUpdate, onArchive, onRestore, onDelete }: { state: ProjectManagementState; opportunities: ProjectSalesOpportunity[]; projects: ProjectRecord[]; currency: string; sort: ProjectSort; nowMs: number; onSort: (key: ProjectSort['key']) => void; onOpen: (id: string) => void; onEdit: (id: string) => void; onUpdate: (projectId: string, patch: ProjectUpdateDraft, action?: string) => void; onArchive: (id: string) => void; onRestore: (id: string) => void; onDelete: (id: string) => void }) {
  if (!projects.length) return <EmptyState title="No projects found" body="Create a project to see project records here." />
  return (
    <div className="pm-project-table-frame">
      <table className="pm-project-table">
        <thead>
          <tr>
            <th>
              <button type="button" onClick={() => onSort('name')} aria-label={`Sort projects by name ${sort.key === 'name' && sort.direction === 'asc' ? 'descending' : 'ascending'}`}>
                Project <ArrowUpDown size={13} />
              </button>
            </th>
            <th>Owner</th>
            <th>Status</th>
            <th>Priority</th>
            <th>Progress</th>
            <th>
              <button type="button" onClick={() => onSort('budget')} aria-label={`Sort projects by budget ${sort.key === 'budget' && sort.direction === 'asc' ? 'descending' : 'ascending'}`}>
                Budget <ArrowUpDown size={13} />
              </button>
            </th>
            <th>Start date</th>
            <th>Due date</th>
            <th>Tasks</th>
            <th>Updated</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {projects.map(project => (
            <ProjectDirectoryRow key={project.id} state={state} opportunities={opportunities} project={project} currency={currency} nowMs={nowMs} onOpen={onOpen} onEdit={onEdit} onUpdate={onUpdate} onArchive={onArchive} onRestore={onRestore} onDelete={onDelete} />
          ))}
        </tbody>
      </table>
    </div>
  )
}

function ProjectDirectoryRow({ state, opportunities, project, currency, nowMs, onOpen, onEdit, onUpdate, onArchive, onRestore, onDelete }: { state: ProjectManagementState; opportunities: ProjectSalesOpportunity[]; project: ProjectRecord; currency: string; nowMs: number; onOpen: (id: string) => void; onEdit: (id: string) => void; onUpdate: (projectId: string, patch: ProjectUpdateDraft, action?: string) => void; onArchive: (id: string) => void; onRestore: (id: string) => void; onDelete: (id: string) => void }) {
  const manager = state.members.find(member => member.id === project.managerId)
  const opportunity = findOpportunityByKey(opportunities, opportunityKey(project.opportunitySource, project.opportunityId))
  const tasks = projectTasksFor(state, project.id)
  const completedTasks = tasks.filter(task => task.status === 'Done').length
  const spentPercent = project.budget ? Math.round((project.spent / project.budget) * 100) : 0
  const remaining = Math.max(project.budget - project.spent - project.committed, 0)
  const updatedAt = latestProjectUpdatedAt(state, project)

  return (
    <tr>
      <td>
        <div className="pm-project-name-cell">
          <ProjectThumbnail project={project} />
          <span className="pm-project-title-block">
            <button type="button" onClick={() => onOpen(project.id)}>{project.name}</button>
            <small>{projectSubtitle(project, opportunity)}</small>
          </span>
        </div>
      </td>
      <td><span className="pm-project-owner"><Avatar member={manager} /> {manager?.name || 'Unassigned'}</span></td>
      <td><ProjectStatusBadge status={project.status} onChange={status => onUpdate(project.id, { status }, `Changed project status to ${status}`)} /></td>
      <td><ProjectPriorityBadge priority={project.priority} onChange={priority => onUpdate(project.id, { priority }, `Changed project priority to ${priority}`)} /></td>
      <td>
        <span className="pm-project-progress-cell"><Progress value={project.progress} /><strong>{Math.round(project.progress)}%</strong></span>
      </td>
      <td>
        <span className="pm-project-budget-cell">
          <strong>{formatCurrency(project.budget, currency)}</strong>
          <small>Spent {formatCurrency(project.spent, currency)} ({spentPercent}%)</small>
          <small>Remaining {formatCurrency(remaining, currency)}</small>
        </span>
      </td>
      <td>{formatDate(project.startDate)}</td>
      <td>{formatDate(project.dueDate)}</td>
      <td>{completedTasks} / {tasks.length}</td>
      <td>{formatRelativeTime(updatedAt, nowMs)}</td>
      <td>
        <ProjectDirectoryActions project={project} onEdit={onEdit} onArchive={onArchive} onRestore={onRestore} onDelete={onDelete} />
      </td>
    </tr>
  )
}

function ProjectDirectoryActions({ project, onEdit, onArchive, onRestore, onDelete }: { project: ProjectRecord; onEdit: (id: string) => void; onArchive: (id: string) => void; onRestore: (id: string) => void; onDelete: (id: string) => void }) {
  const isArchived = Boolean(project.archivedAt)
  const [open, setOpen] = useState(false)
  const [placement, setPlacement] = useState<'up' | 'down'>('down')
  const menuRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!open) return
    const closeOnOutsideTap = (event: PointerEvent) => {
      const target = event.target as Node | null
      if (target && menuRef.current?.contains(target)) return
      setOpen(false)
    }
    document.addEventListener('pointerdown', closeOnOutsideTap)
    return () => document.removeEventListener('pointerdown', closeOnOutsideTap)
  }, [open])

  const editProject = () => {
    setOpen(false)
    onEdit(project.id)
  }

  const archiveProject = () => {
    setOpen(false)
    if (!isArchived && window.confirm(`Archive ${project.name}?`)) onArchive(project.id)
  }

  const restoreProject = () => {
    setOpen(false)
    if (isArchived && window.confirm(`Restore ${project.name} to active projects?`)) onRestore(project.id)
  }

  const deleteProject = () => {
    setOpen(false)
    if (window.confirm(`Delete ${project.name} and all related records?`)) onDelete(project.id)
  }

  const toggleMenu = () => {
    if (!open) {
      const rect = menuRef.current?.getBoundingClientRect()
      const pagination = menuRef.current?.closest('.pm-project-directory')?.querySelector('.pm-project-pagination')
      const lowerBoundary = pagination instanceof HTMLElement ? pagination.getBoundingClientRect().top : window.innerHeight
      const availableBelow = rect ? lowerBoundary - rect.bottom : Number.POSITIVE_INFINITY
      setPlacement(availableBelow < 150 ? 'up' : 'down')
    }
    setOpen(previous => !previous)
  }

  return (
    <div className={`pm-project-actions ${placement === 'up' ? 'menu-up' : ''}`} ref={menuRef} aria-label={`Actions for ${project.name}`}>
      <button
        type="button"
        className="pm-project-action"
        onClick={toggleMenu}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Open actions for ${project.name}`}
      >
        <MoreHorizontal size={16} />
      </button>
      {open && (
        <div className="pm-project-action-menu" role="menu" aria-label={`Actions for ${project.name}`}>
          <button type="button" role="menuitem" onClick={editProject}><Pencil size={14} /> Edit</button>
          {isArchived && <button type="button" role="menuitem" onClick={restoreProject}><RotateCcw size={14} /> Restore</button>}
          <button type="button" role="menuitem" className="danger" onClick={deleteProject}><Trash2 size={14} /> Delete</button>
          {!isArchived && <button type="button" role="menuitem" onClick={archiveProject}><Archive size={14} /> Archive</button>}
        </div>
      )}
    </div>
  )
}

function ProjectDirectoryGrid({ state, opportunities, projects, currency, onOpen, onEdit, onUpdate, onArchive, onRestore, onDelete }: { state: ProjectManagementState; opportunities: ProjectSalesOpportunity[]; projects: ProjectRecord[]; currency: string; onOpen: (id: string) => void; onEdit: (id: string) => void; onUpdate: (projectId: string, patch: ProjectUpdateDraft, action?: string) => void; onArchive: (id: string) => void; onRestore: (id: string) => void; onDelete: (id: string) => void }) {
  if (!projects.length) return <EmptyState title="No projects found" body="Create a project to see project records here." />
  return (
    <div className="pm-project-card-grid">
      {projects.map(project => {
        const manager = state.members.find(member => member.id === project.managerId)
        const opportunity = findOpportunityByKey(opportunities, opportunityKey(project.opportunitySource, project.opportunityId))
        const tasks = projectTasksFor(state, project.id)
        const completedTasks = tasks.filter(task => task.status === 'Done').length
        return (
          <article key={project.id} className="pm-project-grid-card">
            <ProjectThumbnail project={project} />
            <div className="pm-project-grid-head">
              <span>
                <button type="button" onClick={() => onOpen(project.id)}>{project.name}</button>
                <small>{projectSubtitle(project, opportunity)}</small>
              </span>
              <ProjectDirectoryActions project={project} onEdit={onEdit} onArchive={onArchive} onRestore={onRestore} onDelete={onDelete} />
            </div>
            <div className="pm-project-grid-badges">
              <ProjectStatusBadge status={project.status} onChange={status => onUpdate(project.id, { status }, `Changed project status to ${status}`)} />
              <ProjectPriorityBadge priority={project.priority} onChange={priority => onUpdate(project.id, { priority }, `Changed project priority to ${priority}`)} />
            </div>
            <span className="pm-project-progress-cell"><Progress value={project.progress} /><strong>{Math.round(project.progress)}%</strong></span>
            <div className="pm-project-grid-meta">
              <span><small>Owner</small><strong>{manager?.name || 'Unassigned'}</strong></span>
              <span><small>Budget</small><strong>{formatCurrency(project.budget, currency)}</strong></span>
              <span><small>Due</small><strong>{formatDate(project.dueDate)}</strong></span>
              <span><small>Tasks</small><strong>{completedTasks} / {tasks.length}</strong></span>
            </div>
          </article>
        )
      })}
    </div>
  )
}

function useProjectThumbnailSource(project: Pick<ProjectRecord, 'thumbnailDataUrl' | 'thumbnailAssetId'>) {
  const [assetSource, setAssetSource] = useState({ assetId: '', dataUrl: '' })

  useEffect(() => {
    let cancelled = false
    if (project.thumbnailDataUrl || !project.thumbnailAssetId) return
    loadProjectThumbnailAsset(project.thumbnailAssetId).then(dataUrl => {
      if (!cancelled) setAssetSource({ assetId: project.thumbnailAssetId || '', dataUrl: dataUrl || '' })
    })
    return () => {
      cancelled = true
    }
  }, [project.thumbnailAssetId, project.thumbnailDataUrl])

  if (project.thumbnailDataUrl) return project.thumbnailDataUrl
  if (!project.thumbnailAssetId) return ''
  return assetSource.assetId === project.thumbnailAssetId ? assetSource.dataUrl : ''
}

function ProjectThumbnail({ project }: { project: ProjectRecord }) {
  const variant = Math.abs(`${project.id}-${project.name}`.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0)) % 5
  const thumbnailSource = useProjectThumbnailSource(project)

  return (
    <span className={`pm-project-thumb variant-${variant}`} aria-hidden="true">
      {thumbnailSource ? <span className="pm-project-thumb-image" style={{ backgroundImage: `url(${thumbnailSource})` }} /> : <><i /><b /><em /></>}
    </span>
  )
}

function ProjectStatusBadge({ status, onChange }: { status: ProjectStatus; onChange?: (status: ProjectStatus) => void }) {
  const className = `pm-project-badge status-${status.toLowerCase().replaceAll(' ', '-')}${onChange ? ' is-editable' : ''}`
  if (!onChange) return <span className={className}><i />{projectStatusLabel(status)}</span>
  return (
    <label className={className}>
      <i />
      <select
        aria-label="Project status"
        value={status}
        onChange={event => onChange(event.target.value as ProjectStatus)}
      >
        {projectStatusOptions.map(option => <option key={option} value={option}>{projectStatusLabel(option)}</option>)}
      </select>
    </label>
  )
}

function ProjectPriorityBadge({ priority, onChange }: { priority: TaskPriority; onChange?: (priority: TaskPriority) => void }) {
  const className = `pm-project-badge priority-${priority.toLowerCase()}${onChange ? ' is-editable' : ''}`
  if (!onChange) return <span className={className}><i />{priority}</span>
  return (
    <label className={className}>
      <i />
      <select
        aria-label="Project priority"
        value={priority}
        onChange={event => onChange(event.target.value as TaskPriority)}
      >
        {priorityOptions.filter((option): option is TaskPriority => option !== 'All').map(option => <option key={option} value={option}>{option}</option>)}
      </select>
    </label>
  )
}

function Select({ value, options, labels = {}, onChange }: { value: string; options: string[]; labels?: Record<string, string>; onChange: (value: string) => void }) {
  return <select className="pm-select" value={value} onChange={event => onChange(event.target.value)}>{options.map(option => <option key={option} value={option}>{labels[option] || option}</option>)}</select>
}

function ProjectTable({ state, opportunities, projects, onOpen }: { state: ProjectManagementState; opportunities: ProjectSalesOpportunity[]; projects: ProjectRecord[]; onOpen: (id: string) => void }) {
  if (!projects.length) return <EmptyState title="No projects found" body="Create a project to see project records here." />
  return <>
    <div className="pm-table-wrap"><table className="pm-table"><thead><tr>{['Project Name', 'Client', 'Project Manager', 'Status', 'Progress', 'Budget', 'Due Date', 'Actions'].map(head => <th key={head}>{head}</th>)}</tr></thead><tbody>{projects.map(project => { const client = state.clients.find(c => c.id === project.clientId); const manager = state.members.find(m => m.id === project.managerId); const opportunity = findOpportunityByKey(opportunities, opportunityKey(project.opportunitySource, project.opportunityId)); return <tr key={project.id}><td><strong>{project.name}</strong><small>{opportunity ? `Linked to ${opportunity.label}` : project.tags.join(', ') || project.department}</small></td><td>{client?.name || project.clientId}</td><td><Avatar member={manager} /> {manager?.name || '-'}</td><td><Pill value={project.status} /></td><td><Progress value={project.progress} /></td><td>{formatMoney(project.budget)}</td><td>{formatDate(project.dueDate)}</td><td><button type="button" className="pm-icon-btn" onClick={() => onOpen(project.id)} aria-label={`Open ${project.name}`}><MoreHorizontal size={16} /></button></td></tr> })}</tbody></table></div>
    <div className="pm-mobile-projects">{projects.map(project => { const client = state.clients.find(c => c.id === project.clientId); const opportunity = findOpportunityByKey(opportunities, opportunityKey(project.opportunitySource, project.opportunityId)); return <article key={project.id} className="pm-mobile-project-card"><div><strong>{project.name}</strong><button type="button" className="pm-icon-btn" onClick={() => onOpen(project.id)} aria-label={`Open ${project.name}`}><MoreHorizontal size={16} /></button></div><small>{client?.name || project.clientId}</small>{opportunity && <small>Linked to {opportunity.label}</small>}<Pill value={project.status} /><span>{formatMoney(project.budget)} - Due {formatDate(project.dueDate)}</span><Progress value={project.progress} /></article> })}</div>
  </>
}

const taskDescriptionTags = new Set(['b', 'strong', 'i', 'em', 'u', 'ul', 'ol', 'li', 'p', 'br', 'h2', 'h3', 'blockquote', 'pre', 'code', 'div'])

function escapeTaskDescriptionText(value: string) {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;')
}

function hasHtmlMarkup(value: string) {
  return /<\/?[a-z][\s\S]*>/i.test(value)
}

function taskDescriptionInlineMarkup(value: string) {
  return escapeTaskDescriptionText(value)
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[^*])\*([^*\n]+)\*/g, '$1<em>$2</em>')
    .replace(/&lt;u&gt;([\s\S]*?)&lt;\/u&gt;/gi, '<u>$1</u>')
}

function normalizeTaskDescriptionHtml(value: string) {
  return value
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[^*])\*([^*\n]+)\*/g, '$1<em>$2</em>')
    .replace(/(\*{2,})/g, '')
}

function plainTaskDescriptionToHtml(value: string) {
  const lines = value.split(/\r?\n/)
  const html: string[] = []
  let listOpen = false
  lines.forEach(line => {
    const trimmed = line.trim()
    const listMatch = trimmed.match(/^[-*]\s+(?:\[[ xX]\]\s+)?(.+)$/)
    if (listMatch) {
      if (!listOpen) {
        html.push('<ul>')
        listOpen = true
      }
      html.push(`<li>${taskDescriptionInlineMarkup(listMatch[1])}</li>`)
      return
    }
    if (listOpen) {
      html.push('</ul>')
      listOpen = false
    }
    if (!trimmed) html.push('<p><br></p>')
    else if (trimmed.startsWith('### ')) html.push(`<h3>${taskDescriptionInlineMarkup(trimmed.slice(4))}</h3>`)
    else if (trimmed.startsWith('## ')) html.push(`<h2>${taskDescriptionInlineMarkup(trimmed.slice(3))}</h2>`)
    else if (trimmed.startsWith('> ')) html.push(`<blockquote>${taskDescriptionInlineMarkup(trimmed.slice(2))}</blockquote>`)
    else html.push(`<p>${taskDescriptionInlineMarkup(trimmed)}</p>`)
  })
  if (listOpen) html.push('</ul>')
  return html.join('')
}

function sanitizeTaskDescriptionHtml(value: string) {
  const source = hasHtmlMarkup(value) ? normalizeTaskDescriptionHtml(value) : plainTaskDescriptionToHtml(value)
  return source
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<\/?([a-z0-9]+)(?:\s[^>]*)?>/gi, (match, tagName: string) => {
      const normalized = tagName.toLowerCase()
      if (!taskDescriptionTags.has(normalized)) return ''
      if (normalized === 'br') return '<br>'
      return match.startsWith('</') ? `</${normalized}>` : `<${normalized}>`
    })
}

function taskDescriptionText(value: string) {
  return sanitizeTaskDescriptionHtml(value)
    .replace(/<br>/gi, '\n')
    .replace(/<\/(p|h2|h3|blockquote|li)>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

function TaskDescriptionViewer({ value, compact = false }: { value: string; compact?: boolean }) {
  const text = taskDescriptionText(value)
  if (!text) return <p>{compact ? '-' : 'No description has been added yet.'}</p>
  return <div className={compact ? 'pm-task-description-rich compact' : 'pm-task-description-rich'}>{text}</div>
}

function TaskDescriptionEditor({ value, onChange, onAttach }: { value: string; onChange: (value: string) => void; onAttach: () => void }) {
  const editorRef = useRef<HTMLDivElement | null>(null)
  const textLength = taskDescriptionText(value).length
  const editorText = taskDescriptionText(value)

  useEffect(() => {
    const editor = editorRef.current
    if (!editor || document.activeElement === editor) return
    if (editor.textContent !== editorText) editor.textContent = editorText
  }, [editorText])

  function commitEditor() {
    const editor = editorRef.current
    if (!editor) return
    const nextText = editor.innerText.replace(/\n{4,}/g, '\n\n\n').trim()
    if (nextText.length > 2000) {
      editor.textContent = editorText
      return
    }
    onChange(nextText)
  }

  function focusEditor() {
    const editor = editorRef.current
    if (!editor) return
    editor.focus()
  }

  function runEditorCommand(command: string, commandValue?: string) {
    focusEditor()
    window.requestAnimationFrame(() => {
      document.execCommand(command, false, commandValue)
      commitEditor()
    })
  }

  function insertList(checklist = false) {
    if (checklist) runEditorCommand('insertHTML', '<ul><li>Checklist item</li></ul>')
    else runEditorCommand('insertUnorderedList')
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    if (!(event.ctrlKey || event.metaKey)) return
    const key = event.key.toLowerCase()
    if (key === 'b') {
      event.preventDefault()
      runEditorCommand('bold')
    } else if (key === 'i') {
      event.preventDefault()
      runEditorCommand('italic')
    } else if (key === 'u') {
      event.preventDefault()
      runEditorCommand('underline')
    }
  }

  function handlePaste(event: React.ClipboardEvent<HTMLDivElement>) {
    event.preventDefault()
    runEditorCommand('insertText', event.clipboardData.getData('text/plain').slice(0, 2000))
  }

  return (
    <div className="pm-task-description-editor">
      <div className="pm-task-editor-toolbar" aria-label="Description formatting controls">
        <button type="button" aria-label="Bold" title="Bold" onClick={() => runEditorCommand('bold')}>B</button>
        <button type="button" aria-label="Italic" title="Italic" onClick={() => runEditorCommand('italic')}><em>I</em></button>
        <button type="button" aria-label="Underline" title="Underline" onClick={() => runEditorCommand('underline')}><u>U</u></button>
        <button type="button" aria-label="Bulleted list" title="Bulleted list" onClick={() => insertList(false)}><List size={15} /></button>
        <button type="button" aria-label="Checklist" title="Checklist" onClick={() => insertList(true)}><ListChecks size={15} /></button>
        <button type="button" aria-label="Attach file" title="Attach file" aria-controls="pm-new-task-files" onClick={onAttach}><Paperclip size={15} /></button>
      </div>
      <div
        ref={editorRef}
        className="pm-task-description-input"
        contentEditable
        role="textbox"
        aria-label="Task description"
        aria-multiline="true"
        data-placeholder="Enter task description, scope of work, and key details..."
        suppressContentEditableWarning
        onInput={commitEditor}
        onBlur={commitEditor}
        onKeyDown={handleKeyDown}
        onPaste={handlePaste}
      />
      <div className="pm-task-description-footer"><small>{textLength} / 2000</small></div>
    </div>
  )
}

function TasksTab({ state, onAddTask, onOpenTask, onEditTask, onArchiveTask, onDeleteTask }: { state: ProjectManagementState; onAddTask?: () => void; onOpenTask?: (taskId: string) => void; onEditTask: (task: ProjectTask) => void; onArchiveTask: (taskId: string) => void; onDeleteTask: (taskId: string) => void }) {
  const taskCount = state.tasks.length
  const header = (
    <div className="pm-task-board-toolbar">
      <div>
        <h2>Task Management</h2>
        <p>Track work, ownership, and progress for this project.</p>
      </div>
      <div className="pm-task-board-toolbar-meta">
        <span className="pm-section-action">{taskCount} {taskCount === 1 ? 'task' : 'tasks'}</span>
        {onAddTask && <button type="button" className="pm-primary pm-task-board-add" onClick={onAddTask}><Plus size={15} /> Add Task</button>}
      </div>
    </div>
  )
  if (!taskCount) return <section className="pm-card pm-task-board-card">{header}<EmptyState title="No tasks yet" body={onAddTask ? 'Add a task to start tracking work for this project.' : 'Assign a task from Quick Actions or from a project detail page.'} /></section>
  return (
    <section className="pm-card pm-task-board-card">
      {header}
      <div className="pm-task-board" role="table" aria-label="Task board">
        <div className="pm-task-board-group"><span>Active tasks</span><strong>{state.tasks.length}</strong></div>
        <div className="pm-task-board-head" role="row">
          {['Task', 'Owner', 'Status', 'Priority', 'Due date', 'Progress', 'Updates', 'Files', 'Actions'].map(label => <span key={label} role="columnheader">{label}</span>)}
        </div>
        {state.tasks.map(task => (
          <TaskBoardRow key={task.id} state={state} task={task} onOpen={onOpenTask} onEdit={onEditTask} onArchive={onArchiveTask} onDelete={onDeleteTask} />
        ))}
      </div>
    </section>
  )
}

function TaskBoardRow({ state, task, onOpen, onEdit, onArchive, onDelete }: { state: ProjectManagementState; task: ProjectTask; onOpen?: (taskId: string) => void; onEdit: (task: ProjectTask) => void; onArchive: (taskId: string) => void; onDelete: (taskId: string) => void }) {
  const member = state.members.find(item => item.id === task.assigneeId)
  const project = state.projects.find(item => item.id === task.projectId)
  const commentCount = Math.max(task.comments, state.taskComments.filter(comment => comment.taskId === task.id).length)
  const attachmentCount = Math.max(task.attachments, state.taskAttachments.filter(attachment => attachment.taskId === task.id).length)
  const openTask = () => onOpen ? onOpen(task.id) : onEdit(task)
  const openTaskFromKeyboard = (event: React.KeyboardEvent<HTMLElement>) => {
    if (event.key !== 'Enter' && event.key !== ' ') return
    event.preventDefault()
    openTask()
  }

  return (
    <article className="pm-task-board-row" role="row" tabIndex={0} onClick={openTask} onKeyDown={openTaskFromKeyboard} aria-label={`Open task ${task.title}`}>
      <div className="pm-task-board-title" role="cell">
        <strong>{task.title}</strong>
        <small>{project?.name || 'No project'}</small>
        {task.labels.length > 0 && <span>{task.labels.slice(0, 3).join(', ')}</span>}
      </div>
      <div className="pm-task-board-owner" role="cell"><Avatar member={member} /><span>{member?.name || 'Unassigned'}</span></div>
      <div role="cell"><Pill value={task.status} /></div>
      <div role="cell"><Pill value={task.priority} /></div>
      <div className="pm-task-board-date" role="cell">{formatDate(task.dueDate)}</div>
      <div role="cell"><Progress value={task.progress} /></div>
      <div className="pm-task-board-count" role="cell"><MessageSquare size={14} /> {commentCount}</div>
      <div className="pm-task-board-count" role="cell"><Paperclip size={14} /> {attachmentCount}</div>
      <div className="pm-task-board-actions" role="cell" onMouseDown={event => event.stopPropagation()} onClick={event => event.stopPropagation()}>
        <button type="button" className="pm-icon-btn" onClick={() => onEdit(task)} aria-label={`Edit ${task.title}`}><Pencil size={14} /></button>
        <button type="button" className="pm-icon-btn" onClick={() => { if (window.confirm(`Archive ${task.title}?`)) onArchive(task.id) }} aria-label={`Archive ${task.title}`}><Archive size={14} /></button>
        <button type="button" className="pm-icon-btn danger" onClick={() => { if (window.confirm(`Delete ${task.title}? This removes related time logs.`)) onDelete(task.id) }} aria-label={`Delete ${task.title}`}><Trash2 size={14} /></button>
      </div>
    </article>
  )
}

function Kanban({ state, onDrag, onDrop, onOpenTask, onEditTask, onArchiveTask, onDeleteTask }: { state: ProjectManagementState; onDrag: (id: string) => void; onDrop: (status: TaskStatus) => void; onOpenTask?: (taskId: string) => void; onEditTask: (task: ProjectTask) => void; onArchiveTask: (taskId: string) => void; onDeleteTask: (taskId: string) => void }) {
  if (!state.tasks.length) return <section className="pm-card"><SectionTitle title="Kanban" /><EmptyState title="No cards yet" body="Assigned tasks will appear in kanban columns by status." /></section>
  return <section className="pm-kanban">{tasksByStatus(state).map(column => <div key={column.status} className="pm-card pm-kanban-col" onDragOver={event => event.preventDefault()} onDrop={() => onDrop(column.status)}><SectionTitle title={column.status} action={String(column.tasks.length)} />{column.tasks.map(task => <TaskCard key={task.id} state={state} task={task} draggable onDrag={() => onDrag(task.id)} onOpen={onOpenTask} onEdit={onEditTask} onArchive={onArchiveTask} onDelete={onDeleteTask} />)}</div>)}</section>
}

function TaskCard({ state, task, draggable, onDrag, onOpen, onEdit, onArchive, onDelete }: { state: ProjectManagementState; task: ProjectTask; draggable?: boolean; onDrag?: () => void; onOpen?: (taskId: string) => void; onEdit: (task: ProjectTask) => void; onArchive: (taskId: string) => void; onDelete: (taskId: string) => void }) {
  const member = state.members.find(item => item.id === task.assigneeId)
  const project = state.projects.find(item => item.id === task.projectId)
  const commentCount = Math.max(task.comments, state.taskComments.filter(comment => comment.taskId === task.id).length)
  const attachmentCount = Math.max(task.attachments, state.taskAttachments.filter(attachment => attachment.taskId === task.id).length)
  const evidenceCount = state.taskAttachments.filter(attachment => attachment.taskId === task.id && attachment.evidence).length
  const checklistItems = state.taskChecklists.filter(item => item.taskId === task.id)
  const checklistDone = checklistItems.filter(item => item.done).length
  const openTask = () => onOpen ? onOpen(task.id) : onEdit(task)
  const openTaskFromKeyboard = (event: React.KeyboardEvent<HTMLElement>) => {
    if (event.key !== 'Enter' && event.key !== ' ') return
    event.preventDefault()
    openTask()
  }
  return (
    <article className={draggable ? 'pm-task-card is-draggable' : 'pm-task-card'} draggable={draggable} onDragStart={onDrag} onClick={openTask} onKeyDown={openTaskFromKeyboard} role="button" tabIndex={0} aria-label={`Open task ${task.title}`}>
      <div>
        <strong>{task.title}</strong>
        <small>{project?.name}</small>
        <div className="pm-task-actions" onMouseDown={event => event.stopPropagation()} onClick={event => event.stopPropagation()}>
          <button type="button" className="pm-icon-btn" onClick={() => onEdit(task)} aria-label={`Edit ${task.title}`}><Pencil size={14} /></button>
          <button type="button" className="pm-icon-btn" onClick={() => { if (window.confirm(`Archive ${task.title}?`)) onArchive(task.id) }} aria-label={`Archive ${task.title}`}><Archive size={14} /></button>
          <button type="button" className="pm-icon-btn danger" onClick={() => { if (window.confirm(`Delete ${task.title}? This removes related time logs.`)) onDelete(task.id) }} aria-label={`Delete ${task.title}`}><Trash2 size={14} /></button>
        </div>
      </div>
      <TaskDescriptionViewer value={task.description} compact />
      <div className="pm-chip-row"><Pill value={task.priority} /><Pill value={task.status} />{task.labels.map(label => <span key={label}>{label}</span>)}{task.dependencies.length > 0 && <span><ListChecks size={13} /> {task.dependencies.length}</span>}{checklistItems.length > 0 && <span><CheckSquare size={13} /> {checklistDone}/{checklistItems.length}</span>}{task.recurrence && task.recurrence !== 'None' && <span><Repeat2 size={13} /> {task.recurrence}</span>}<span><MessageSquare size={13} /> {commentCount}</span><span><Paperclip size={13} /> {attachmentCount}</span>{evidenceCount > 0 && <span><FileCheck2 size={13} /> {evidenceCount}</span>}</div>
      <footer><Avatar member={member} /><span>{member?.name || 'Unassigned'}</span><span>{formatDate(task.dueDate)}</span><Progress value={task.progress} /></footer>
    </article>
  )
}

function TaskCollaborationPanel({
  state,
  task,
  commentDraft,
  checklistDraft,
  attachmentNote,
  evidenceMode,
  onCommentDraft,
  onChecklistDraft,
  onAttachmentNote,
  onEvidenceMode,
  onAddComment,
  onAddChecklistItem,
  onToggleChecklistItem,
  onDeleteChecklistItem,
  onAttachFiles,
  onDeleteAttachment,
}: {
  state: ProjectManagementState
  task: ProjectTask
  commentDraft: string
  checklistDraft: string
  attachmentNote: string
  evidenceMode: boolean
  onCommentDraft: (value: string) => void
  onChecklistDraft: (value: string) => void
  onAttachmentNote: (value: string) => void
  onEvidenceMode: (value: boolean) => void
  onAddComment: (event: FormEvent) => void
  onAddChecklistItem: (event: FormEvent) => void
  onToggleChecklistItem: (itemId: string, done: boolean) => void
  onDeleteChecklistItem: (itemId: string) => void
  onAttachFiles: (event: ChangeEvent<HTMLInputElement>) => void
  onDeleteAttachment: (attachmentId: string) => void
}) {
  const comments = state.taskComments.filter(comment => comment.taskId === task.id)
  const attachments = state.taskAttachments.filter(attachment => attachment.taskId === task.id)
  const checklistItems = state.taskChecklists.filter(item => item.taskId === task.id)
  const checklistDone = checklistItems.filter(item => item.done).length
  const evidence = attachments.filter(attachment => attachment.evidence)
  return (
    <section className="pm-task-collab">
      <div className="pm-task-collab-head">
        <div>
          <h3>Collaboration</h3>
          <p>Track subtasks, comments, files, and completion evidence.</p>
        </div>
        <span>{comments.length} comments · {attachments.length} files</span>
      </div>
      <div className="pm-task-collab-grid">
        <div className="pm-task-panel">
          <SectionTitle title="Subtasks" action={`${checklistDone}/${checklistItems.length}`} />
          <form className="pm-task-comment-form" onSubmit={onAddChecklistItem}>
            <input value={checklistDraft} onChange={event => onChecklistDraft(event.target.value)} placeholder="Add checklist item..." />
            <button type="submit" className="pm-control">Add</button>
          </form>
          <div className="pm-checklist-list">
            {checklistItems.length ? checklistItems.map(item => (
              <label key={item.id}>
                <input type="checkbox" checked={item.done} onChange={event => onToggleChecklistItem(item.id, event.target.checked)} />
                <span>{item.title}</span>
                <button type="button" onClick={() => onDeleteChecklistItem(item.id)} aria-label={`Delete ${item.title}`}><Trash2 size={13} /></button>
              </label>
            )) : <EmptyState title="No subtasks yet" body="Checklist items for this task will appear here." />}
          </div>
        </div>
        <div className="pm-task-panel">
          <SectionTitle title="Comments" action={String(comments.length)} />
          <form className="pm-task-comment-form" onSubmit={onAddComment}>
            <input value={commentDraft} onChange={event => onCommentDraft(event.target.value)} placeholder="Add a task comment..." />
            <button type="submit" className="pm-control">Comment</button>
          </form>
          <div className="pm-task-comment-list">
            {comments.length ? comments.map(comment => {
              const actor = state.members.find(member => member.id === comment.actorId)
              return <article key={comment.id}><Avatar member={actor} /><div><strong>{comment.body}</strong><small>{actor?.name || 'WiseFlow'} - {new Date(comment.createdAt).toLocaleString('en-US', { month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit' })}</small></div></article>
            }) : <EmptyState title="No comments yet" body="Task discussion will appear here." />}
          </div>
        </div>
        <div className="pm-task-panel">
          <SectionTitle title="Files & Evidence" action={`${attachments.length} files`} />
          <div className="pm-task-upload">
            <label className="pm-check"><input type="checkbox" checked={evidenceMode} onChange={event => onEvidenceMode(event.target.checked)} /> Completion evidence</label>
            <input value={attachmentNote} onChange={event => onAttachmentNote(event.target.value)} placeholder="Optional file note" />
            <label className="pm-upload-button"><UploadCloud size={15} /> Attach files<input type="file" multiple accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.csv,.txt" onChange={onAttachFiles} /></label>
          </div>
          {evidence.length > 0 && (
            <div className="pm-evidence-strip">
              {evidence.slice(0, 4).map(item => item.mimeType.startsWith('image/') && item.dataUrl ? <span key={item.id} className="pm-evidence-thumb" style={{ backgroundImage: `url(${item.dataUrl})` }} aria-label={item.name} /> : <span key={item.id}><FileCheck2 size={16} />{item.fileType}</span>)}
            </div>
          )}
          <div className="pm-task-file-list">
            {attachments.length ? attachments.map(attachment => {
              const owner = state.members.find(member => member.id === attachment.ownerId)
              const Icon = attachment.evidence ? FileCheck2 : attachment.mimeType.startsWith('image/') ? Camera : FileText
              return (
                <article key={attachment.id}>
                  <Icon size={16} />
                  <div>
                    <strong>{attachment.name}</strong>
                    <small>{attachment.fileType} - {attachment.size} - {owner?.name || 'WiseFlow'}</small>
                    {attachment.note && <em>{attachment.note}</em>}
                  </div>
                  {attachment.evidence && <Pill value="Evidence" />}
                  {attachment.dataUrl && <a className="pm-icon-btn" href={attachment.dataUrl} download={attachment.name} aria-label={`Download ${attachment.name}`}><Download size={14} /></a>}
                  <button type="button" className="pm-icon-btn danger" onClick={() => { if (window.confirm(`Remove ${attachment.name}?`)) onDeleteAttachment(attachment.id) }} aria-label={`Remove ${attachment.name}`}><Trash2 size={14} /></button>
                </article>
              )
            }) : <EmptyState title="No task files" body="Photos, files, and completion evidence will appear here." />}
          </div>
        </div>
      </div>
    </section>
  )
}

function Resources({ state }: { state: ProjectManagementState }) {
  if (!state.members.length) return <section className="pm-card"><SectionTitle title="Team Workload" /><EmptyState title="No team members found" body="Employees or account users will appear here when connected." /></section>
  return <section className="pm-card"><SectionTitle title="Team Workload" action={`${state.members.length} ${state.members.length === 1 ? 'member' : 'members'}`} /><div className="pm-table-wrap"><table className="pm-table"><thead><tr>{['Team Member', 'Role', 'Assigned Projects', 'Workload', 'Availability'].map(head => <th key={head}>{head}</th>)}</tr></thead><tbody>{workloadByMember(state).map(item => { const assignedProjects = state.projects.filter(project => project.managerId === item.member.id || project.memberIds.includes(item.member.id)); return <tr key={item.member.id}><td><span className="pm-workload-member"><Avatar member={item.member} /><strong>{item.member.name}</strong></span></td><td>{item.member.role}</td><td>{assignedProjects.map(project => project.name).join(', ') || '-'}</td><td><span className="pm-workload-cell"><Progress value={item.workload} /><b>{Math.round(item.workload)}%</b></span></td><td>{item.member.availability}%</td></tr> })}</tbody></table></div></section>
}

function BudgetTab({ state, budget }: { state: ProjectManagementState; budget: ReturnType<typeof budgetSummary> }) {
  const money = (value: number) => formatCurrency(value, 'PHP')
  const overBudget = budget.remaining < 0
  const used = budget.spent + budget.committed
  const utilization = percentOf(used, budget.total)

  const breakdown = state.projects.reduce(
    (acc, project) => ({
      direct: acc.direct + (project.budgetBreakdown?.direct || 0),
      indirect: acc.indirect + (project.budgetBreakdown?.indirect || 0),
      contingency: acc.contingency + (project.budgetBreakdown?.contingency || 0),
      other: acc.other + (project.budgetBreakdown?.other || 0),
    }),
    { direct: 0, indirect: 0, contingency: 0, other: 0 },
  )
  const categories = [
    { label: 'Direct cost', amount: breakdown.direct },
    { label: 'Indirect cost', amount: breakdown.indirect },
    { label: 'Contingency', amount: breakdown.contingency },
    { label: 'Other', amount: breakdown.other },
  ].filter(row => row.amount > 0)
  const allocated = categories.reduce((sum, row) => sum + row.amount, 0)
  const unallocated = Math.max(budget.total - allocated, 0)
  const estimateRows = categories.length
    ? (unallocated > 0 ? [...categories, { label: 'Unallocated', amount: unallocated }] : categories)
    : [{ label: 'Total budget', amount: budget.total }]
  const estimatedTotal = estimateRows.reduce((sum, row) => sum + row.amount, 0) || budget.total
  const rows = estimateRows.map(row => {
    const share = estimatedTotal > 0 ? row.amount / estimatedTotal : 0
    const actual = used * share
    return { label: row.label, estimated: row.amount, actual, remaining: row.amount - actual }
  })

  const tiles = [
    { label: 'Total Budget', value: budget.total, hint: 'Approved project budget', negative: false },
    { label: 'Spent', value: budget.spent, hint: `${percentOf(budget.spent, budget.total)}% of budget`, negative: false },
    { label: 'Committed', value: budget.committed, hint: `${percentOf(budget.committed, budget.total)}% of budget`, negative: false },
    { label: 'Remaining', value: budget.remaining, hint: overBudget ? 'Over budget' : `${percentOf(budget.remaining, budget.total)}% available`, negative: overBudget },
  ]

  return (
    <div className="pm-budget-page">
      <section className="pm-budget-tiles">
        {tiles.map(tile => (
          <article key={tile.label} className="pm-budget-tile">
            <small>{tile.label}</small>
            <strong className={tile.negative ? 'negative' : undefined}>{formatMoney(tile.value)}</strong>
            <span>{tile.hint}</span>
          </article>
        ))}
      </section>

      <section className="pm-card pm-budget-summary-card">
        <SectionTitle title="Cost Summary" action={`${utilization}% utilized`} />
        <div className="pm-budget-bar" role="img" aria-label={`${utilization}% of budget used`}>
          <span className="is-spent" style={{ width: `${percentOf(budget.spent, budget.total)}%` }} />
          <span className="is-committed" style={{ width: `${percentOf(budget.committed, budget.total)}%` }} />
        </div>
        <div className="pm-budget-bar-legend">
          <span><i className="is-spent" /> Spent {formatMoney(budget.spent)}</span>
          <span><i className="is-committed" /> Committed {formatMoney(budget.committed)}</span>
          <span><i className="is-remaining" /> Remaining {formatMoney(Math.max(budget.remaining, 0))}</span>
        </div>

        <div className="pm-table-wrap">
          <table className="pm-table pm-budget-table">
            <thead>
              <tr>
                <th>Cost Category</th>
                <th className="pm-num">Estimated</th>
                <th className="pm-num">Actual / Committed</th>
                <th className="pm-num">Remaining</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(row => (
                <tr key={row.label}>
                  <td><strong>{row.label}</strong></td>
                  <td className="pm-num">{money(row.estimated)}</td>
                  <td className="pm-num">{money(row.actual)}</td>
                  <td className={row.remaining < 0 ? 'pm-num negative' : 'pm-num'}>{money(row.remaining)}</td>
                </tr>
              ))}
              <tr className="pm-budget-subtotal">
                <td>Subtotal</td>
                <td className="pm-num">{money(estimatedTotal)}</td>
                <td className="pm-num">{money(used)}</td>
                <td className={budget.remaining < 0 ? 'pm-num negative' : 'pm-num'}>{money(estimatedTotal - used)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="pm-budget-totals">
          <div><span>Project Budget</span><strong>{money(budget.total)}</strong></div>
          <div><span>Total Spent</span><strong>{money(budget.spent)}</strong></div>
          <div><span>Total Committed</span><strong>{money(budget.committed)}</strong></div>
          <div className="pm-budget-grand"><span>Remaining Amount</span><strong className={overBudget ? 'negative' : undefined}>{money(budget.remaining)}</strong></div>
        </div>
      </section>
    </div>
  )
}

function Documents({ state }: { state: ProjectManagementState }) {
  if (!state.documents.length) return <section className="pm-card"><SectionTitle title="Documents" /><EmptyState title="No documents uploaded" body="Project files and document versions will appear here." /></section>
  return <section className="pm-card"><SectionTitle title="Documents" /><div className="pm-table-wrap"><table className="pm-table"><thead><tr>{['Files', 'Folders', 'File Type', 'Uploaded By', 'Last Updated', 'Actions'].map(head => <th key={head}>{head}</th>)}</tr></thead><tbody>{state.documents.map(doc => { const owner = state.members.find(member => member.id === doc.ownerId); return <tr key={doc.id}><td><FileText size={15} /> <strong>{doc.name}</strong><small>{doc.size} - {doc.version}</small></td><td>{doc.folder}</td><td><Pill value={doc.type} /></td><td>{owner?.name || '-'}</td><td>{formatDate(doc.updatedAt)}</td><td><button type="button" className="pm-icon-btn" aria-label={`Open document actions for ${doc.name}`}><MoreHorizontal size={16} /></button></td></tr> })}</tbody></table></div></section>
}

function projectDetailDraft(project: ProjectRecord) {
  return {
    name: project.name,
    code: project.code || projectDisplayCode(project),
    clientId: project.clientId,
    projectType: project.projectType || project.department,
    contractType: project.contractType || '',
    description: project.description,
    status: project.status,
    health: project.health,
    priority: project.priority,
    progress: String(project.progress),
    budget: String(project.budget),
    spent: String(project.spent),
    committed: String(project.committed),
    startDate: project.startDate,
    dueDate: project.dueDate,
    managerId: project.managerId,
    memberIds: project.memberIds,
    tags: project.tags.join(', '),
    department: project.department,
    address: project.location?.address || '',
    city: project.location?.city || '',
    province: project.location?.province || '',
    postalCode: project.location?.postalCode || '',
    directCost: project.budgetBreakdown?.direct === undefined ? '' : String(project.budgetBreakdown.direct),
    indirectCost: project.budgetBreakdown?.indirect === undefined ? '' : String(project.budgetBreakdown.indirect),
    contingencyCost: project.budgetBreakdown?.contingency === undefined ? '' : String(project.budgetBreakdown.contingency),
    otherCost: project.budgetBreakdown?.other === undefined ? '' : String(project.budgetBreakdown.other),
    allowTaskCreation: project.settings?.allowTaskCreation ?? true,
    enableBudgetTracking: project.settings?.enableBudgetTracking ?? true,
    enableTimeTracking: project.settings?.enableTimeTracking ?? true,
    enableDocumentManagement: project.settings?.enableDocumentManagement ?? true,
    opportunityKey: opportunityKey(project.opportunitySource, project.opportunityId),
    thumbnailDataUrl: project.thumbnailDataUrl || '',
    thumbnailAssetId: project.thumbnailAssetId || '',
    thumbnailName: '',
  }
}

function projectDisplayCode(project: ProjectRecord) {
  const compact = project.id.replace(/^prj-/i, '').replace(/[^a-z0-9]/gi, '').toUpperCase()
  return `PRJ-${compact || project.name.replace(/[^a-z0-9]+/gi, '').slice(0, 6).toUpperCase() || 'PROJECT'}`
}

function projectStatusLabel(status: ProjectStatus) {
  return status === 'Active' ? 'In Progress' : status
}

function projectHealthLabel(project: ProjectRecord) {
  if (project.health === 'Good') return 'On Track'
  return project.health
}

function percentOf(value: number, total: number) {
  if (!total || total <= 0) return 0
  return Math.max(0, Math.min(100, Math.round((value / total) * 100)))
}

function formatActivityDate(value: string) {
  const date = new Date(value)
  if (!Number.isFinite(date.getTime())) return value
  return date.toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })
}

function ProjectDetailStat({ title, value, sub, icon: Icon, tone = '#3fcf54' }: { title: string; value: string; sub?: string; icon: LucideIcon; tone?: string }) {
  return (
    <article className="pm-detail-stat">
      <div className="pm-detail-stat-head"><span>{title}</span><i style={{ color: tone }}><Icon size={16} /></i></div>
      <strong>{value}</strong>
      {sub && <small>{sub}</small>}
    </article>
  )
}

function ProjectDetailValue({ label, value }: { label: string; value: React.ReactNode }) {
  return <p className="pm-detail-value"><span>{label}</span><strong>{value}</strong></p>
}

function ProjectDetailBar({ label, value, max, tone = '#3fcf54' }: { label: string; value: number; max: number; tone?: string }) {
  return (
    <div className="pm-detail-budget-bar">
      <span>{label}</span>
      <i><b style={{ width: `${percentOf(value, max)}%`, background: tone }} /></i>
      <strong>{formatMoney(value)}</strong>
    </div>
  )
}

function ProjectBudgetOverview({ budget }: { budget: ReturnType<typeof budgetSummary> }) {
  const total = Math.max(budget.total, 0)
  const spent = Math.max(budget.spent, 0)
  const committed = Math.max(budget.committed, 0)
  const remaining = Math.max(budget.remaining, 0)
  const spentDeg = total ? (spent / total) * 360 : 0
  const committedDeg = total ? (committed / total) * 360 : 0
  const remainingDeg = total ? (remaining / total) * 360 : 0
  const donutStyle = {
    background: `conic-gradient(#3fcf54 0deg ${spentDeg}deg, #3b82f6 ${spentDeg}deg ${spentDeg + committedDeg}deg, #facc15 ${spentDeg + committedDeg}deg ${spentDeg + committedDeg + remainingDeg}deg, #e5e7eb ${spentDeg + committedDeg + remainingDeg}deg 360deg)`,
  }
  const rows = [
    { label: 'Spent', value: spent, color: '#3fcf54' },
    { label: 'Committed', value: committed, color: '#3b82f6' },
    { label: 'Remaining', value: remaining, color: '#facc15' },
  ]

  return (
    <section className="pm-detail-panel pm-detail-budget-overview">
      <div className="pm-detail-panel-head"><h3>Budget Overview</h3><button type="button">View full report</button></div>
      <div className="pm-detail-budget-content">
        <div className="pm-detail-donut" style={donutStyle}>
          <div><strong>{formatMoney(total)}</strong><span>Total Budget</span></div>
        </div>
        <div className="pm-detail-budget-legend">
          {rows.map(row => (
            <p key={row.label}><i style={{ background: row.color }} /><span>{row.label}</span><strong>{formatMoney(row.value)} ({percentOf(row.value, total)}%)</strong></p>
          ))}
        </div>
        <div className="pm-detail-budget-bars">
          <h4>Budget vs Actual</h4>
          <ProjectDetailBar label="Total Budget" value={total} max={total} tone="#d4d4d8" />
          <ProjectDetailBar label="Actual Spent" value={spent} max={total} tone="#3fcf54" />
          <ProjectDetailBar label="Remaining" value={remaining} max={total} tone="#d4d4d8" />
        </div>
      </div>
    </section>
  )
}

function ProjectTimelinePreview({ project, milestones }: { project: ProjectRecord; milestones: ProjectMilestone[] }) {
  const sorted = [...milestones].sort((a, b) => new Date(`${a.dueDate}T00:00:00`).getTime() - new Date(`${b.dueDate}T00:00:00`).getTime())
  const items = [
    { id: `${project.id}-start`, title: 'Project Start', date: project.startDate, status: 'Done' as MilestoneStatus },
    ...sorted,
    { id: `${project.id}-due`, title: 'Project Due', date: project.dueDate, status: project.status === 'Completed' ? 'Done' as MilestoneStatus : 'Pending' as MilestoneStatus },
  ]

  return (
    <section className="pm-detail-panel pm-detail-timeline-card">
      <div className="pm-detail-panel-head"><h3>Project Timeline</h3><button type="button">View full schedule</button></div>
      <div className="pm-detail-timeline-list">
        {items.slice(0, 6).map(item => (
          <article key={item.id} className={`state-${item.status.toLowerCase().replaceAll(' ', '-')}`}>
            <i />
            <div><strong>{item.title}</strong><span>{formatDate('dueDate' in item ? item.dueDate : item.date)}</span></div>
            <em>{item.status === 'Done' ? 'Completed' : item.status === 'In Progress' ? 'In Progress' : 'Upcoming'}</em>
          </article>
        ))}
      </div>
    </section>
  )
}

function ProjectPhotoGrid({ project, attachments, onViewAll }: { project: ProjectRecord; attachments: ProjectManagementState['taskAttachments']; onViewAll: () => void }) {
  const thumbnailSource = useProjectThumbnailSource(project)
  const photos = [
    ...(thumbnailSource ? [{ id: `${project.id}-thumbnail`, name: `${project.name} thumbnail`, dataUrl: thumbnailSource }] : []),
    ...attachments
      .filter(attachment => attachment.mimeType.startsWith('image/') && attachment.dataUrl)
      .map(attachment => ({ id: attachment.id, name: attachment.name, dataUrl: attachment.dataUrl || '' })),
  ].slice(0, 6)
  return (
    <section className="pm-detail-panel pm-detail-photos">
      <div className="pm-detail-panel-head"><h3>Project Photos</h3><button type="button" onClick={onViewAll}>View all</button></div>
      {photos.length ? (
        <div className="pm-detail-photo-grid">
          {photos.map(photo => (
            <span key={photo.id} className="pm-detail-photo-tile" style={{ backgroundImage: `url(${photo.dataUrl})` }} aria-label={photo.name} />
          ))}
        </div>
      ) : (
        <EmptyState title="No project photos" body="Upload a project thumbnail or attach image evidence to tasks." />
      )}
    </section>
  )
}

function ProjectFilesTab({ state }: { state: ProjectManagementState }) {
  const attachments = state.taskAttachments
  if (!state.documents.length && !attachments.length) {
    return <section className="pm-card"><SectionTitle title="Files" /><EmptyState title="No files uploaded" body="Project documents and task attachments will appear here." /></section>
  }
  return (
    <section className="pm-card">
      <SectionTitle title="Files" />
      <div className="pm-table-wrap">
        <table className="pm-table">
          <thead><tr>{['File', 'Source', 'File Type', 'Uploaded By', 'Last Updated', 'Actions'].map(head => <th key={head}>{head}</th>)}</tr></thead>
          <tbody>
            {state.documents.map(doc => {
              const owner = state.members.find(member => member.id === doc.ownerId)
              return (
                <tr key={doc.id}>
                  <td><FileText size={15} /> <strong>{doc.name}</strong><small>{doc.size} - {doc.version}</small></td>
                  <td>{doc.folder}</td>
                  <td><Pill value={doc.type} /></td>
                  <td>{owner?.name || '-'}</td>
                  <td>{formatDate(doc.updatedAt)}</td>
                  <td><button type="button" className="pm-icon-btn" aria-label={`Open document actions for ${doc.name}`}><MoreHorizontal size={16} /></button></td>
                </tr>
              )
            })}
            {attachments.map(attachment => {
              const owner = state.members.find(member => member.id === attachment.ownerId)
              const task = state.tasks.find(item => item.id === attachment.taskId)
              const Icon = attachment.mimeType.startsWith('image/') ? Camera : attachment.evidence ? FileCheck2 : FileText
              return (
                <tr key={attachment.id}>
                  <td><Icon size={15} /> <strong>{attachment.name}</strong><small>{attachment.size}{attachment.evidence ? ' - Evidence' : ''}</small></td>
                  <td>{task?.title || 'Task attachment'}</td>
                  <td><Pill value={attachment.fileType || 'File'} /></td>
                  <td>{owner?.name || '-'}</td>
                  <td>{formatDate(attachment.uploadedAt.slice(0, 10))}</td>
                  <td>{attachment.dataUrl ? <a className="pm-icon-btn" href={attachment.dataUrl} download={attachment.name} aria-label={`Download ${attachment.name}`}><Download size={15} /></a> : <button type="button" className="pm-icon-btn" aria-label={`Open file actions for ${attachment.name}`}><MoreHorizontal size={16} /></button>}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </section>
  )
}

function ProjectTeamPreview({ members }: { members: ProjectManagementState['members'] }) {
  return (
    <section className="pm-detail-panel pm-detail-team-card">
      <div className="pm-detail-panel-head"><h3>Team Members</h3><button type="button">View all</button></div>
      <div className="pm-detail-team-list">
        {members.length ? members.slice(0, 5).map(member => (
          <article key={member.id}>
            <Avatar member={member} />
            <div><strong>{member.name}</strong><span>{member.role}</span></div>
            <button type="button" aria-label={`Email ${member.name}`}><Mail size={15} /></button>
            <button type="button" aria-label={`Call ${member.name}`}><Phone size={15} /></button>
          </article>
        )) : <EmptyState title="No team members" body="Assign team members in Settings." />}
      </div>
    </section>
  )
}

function ProjectActivityPreview({ state, activities }: { state: ProjectManagementState; activities: ProjectManagementState['activities'] }) {
  return (
    <section className="pm-detail-panel pm-detail-activity-card">
      <div className="pm-detail-panel-head"><h3>Recent Activity</h3><button type="button">View all</button></div>
      <div className="pm-detail-activity-list">
        {activities.length ? activities.slice(0, 5).map(activity => {
          const actor = state.members.find(member => member.id === activity.actorId)
          return (
            <article key={activity.id}>
              <span><FileText size={16} /></span>
              <div><strong>{activity.action}</strong><small>{actor?.name || 'WiseFlow'} - {formatActivityDate(activity.createdAt)}</small></div>
            </article>
          )
        }) : <EmptyState title="No activity yet" body="Project updates will appear here." />}
      </div>
    </section>
  )
}

function ProjectDetails({
  state,
  opportunities,
  project,
  active,
  onTab,
  onClose,
  onAddTask,
  onUpdate,
  onOpenTask,
  onEditTask,
  onArchiveTask,
  onDeleteTask,
  onArchive,
  onRestore,
  onDelete,
  onAddNote,
  onCreateMilestone,
  onUpdateMilestone,
  onUpdateMilestoneStatus,
  onDeleteMilestone,
}: {
  state: ProjectManagementState
  opportunities: ProjectSalesOpportunity[]
  project: ProjectRecord
  active: string
  onTab: (tab: string) => void
  onClose: () => void
  onAddTask: (projectId: string) => void
  onUpdate: (projectId: string, patch: ProjectUpdateDraft, action?: string) => void
  onOpenTask: (taskId: string) => void
  onEditTask: (task: ProjectTask) => void
  onArchiveTask: (taskId: string) => void
  onDeleteTask: (taskId: string) => void
  onArchive: (projectId: string) => void
  onRestore: (projectId: string) => void
  onDelete: (projectId: string) => void
  onAddNote: (projectId: string, note: string) => void
  onCreateMilestone: (draft: MilestoneDraft) => void
  onUpdateMilestone: (milestoneId: string, patch: MilestoneUpdateDraft) => void
  onUpdateMilestoneStatus: (milestoneId: string, status: MilestoneStatus) => void
  onDeleteMilestone: (milestoneId: string) => void
}) {
  const tasks = state.tasks.filter(task => task.projectId === project.id && !task.archivedAt)
  const taskIds = new Set(tasks.map(task => task.id))
  const activities = state.activities.filter(a => a.projectId === project.id)
  const milestones = state.milestones.filter(milestone => milestone.projectId === project.id)
  const documents = state.documents.filter(document => document.projectId === project.id)
  const timeLogs = state.timeLogs.filter(log => log.projectId === project.id && taskIds.has(log.taskId))
  const taskComments = state.taskComments.filter(comment => taskIds.has(comment.taskId))
  const taskChecklists = state.taskChecklists.filter(item => taskIds.has(item.taskId))
  const taskAttachments = state.taskAttachments.filter(attachment => taskIds.has(attachment.taskId))
  const projectState = { ...state, projects: [project], tasks, milestones, documents, timeLogs, taskComments, taskChecklists, taskAttachments, activities }
  const client = state.clients.find(item => item.id === project.clientId)
  const manager = state.members.find(item => item.id === project.managerId)
  const linkedOpportunity = findOpportunityByKey(opportunities, opportunityKey(project.opportunitySource, project.opportunityId))
  const budget = { total: project.budget, spent: project.spent, committed: project.committed, remaining: project.budget - project.spent - project.committed }
  const [draft, setDraft] = useState(() => projectDetailDraft(project))
  const [noteDraft, setNoteDraft] = useState('')
  const [savedAt, setSavedAt] = useState<number | null>(null)
  const existingThumbnailSource = useProjectThumbnailSource(project)
  const draftThumbnailSource = draft.thumbnailDataUrl || existingThumbnailSource
  const teamMemberIds = new Set(draft.memberIds)
  const draftOpportunity = findOpportunityByKey(opportunities, draft.opportunityKey)

  const departmentOptions = Array.from(new Set([...projectDepartmentOptions, project.department, draft.department].filter(Boolean)))
  const detailProjectTypeOptions = Array.from(new Set([...projectTypeOptions, ...state.projects.map(item => item.projectType || item.department), draft.projectType].filter(Boolean)))
  const detailContractTypeOptions = Array.from(new Set([...contractTypeOptions, ...state.projects.map(item => item.contractType || ''), draft.contractType].filter(Boolean)))
  const workflowSettings = [
    { key: 'allowTaskCreation' as const, title: 'Allow task creation', body: 'Team members can add and manage tasks under this project.' },
    { key: 'enableBudgetTracking' as const, title: 'Enable budget tracking', body: 'Show budget, spent, committed, and remaining cost controls.' },
    { key: 'enableTimeTracking' as const, title: 'Enable time tracking', body: 'Allow logged hours and labor tracking against project tasks.' },
    { key: 'enableDocumentManagement' as const, title: 'Enable document management', body: 'Allow files, task evidence, and project documents to be attached.' },
  ]
  const completedTasks = tasks.filter(task => task.status === 'Done').length
  const remainingTasks = Math.max(tasks.length - completedTasks, 0)
  const remainingBudget = Math.max(budget.remaining, 0)
  const spentPercent = percentOf(project.spent, project.budget)
  const teamMembers = Array.from(new Set([project.managerId, ...project.memberIds]))
    .map(memberId => state.members.find(member => member.id === memberId))
    .filter((member): member is ProjectManagementState['members'][number] => Boolean(member))
  const latestUpdate = project.updatedAt || activities[0]?.createdAt || documents[0]?.updatedAt || project.startDate
  const projectLocation = [client?.name, linkedOpportunity?.clientName, project.department].filter(Boolean)[0] || 'No location assigned'
  const selectedDetailTab = active === 'Details' ? 'Settings'
    : active === 'Planning' ? 'Schedule'
      : active === 'Activity Logs' ? 'Reports'
        : active

  const applyDetailOpportunity = (key: string) => {
    const opportunity = findOpportunityByKey(opportunities, key)
    setDraft(prev => {
      if (!opportunity) return { ...prev, opportunityKey: '' }
      const clientId = resolveOpportunityClientId(opportunity, state.clients) || prev.clientId
      return {
        ...prev,
        opportunityKey: key,
        clientId,
        budget: Number(prev.budget) > 0 ? prev.budget : String(opportunity.value || 0),
      }
    })
  }

  const attachDetailProjectThumbnail = async (event: ChangeEvent<HTMLInputElement>) => {
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

  const dropDetailProjectThumbnail = async (event: DragEvent<HTMLLabelElement>) => {
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

  const saveDetails = (event: FormEvent) => {
    event.preventDefault()
    const managerId = draft.managerId || state.members[0]?.id || ''
    const memberIds = Array.from(new Set([managerId, ...draft.memberIds].filter(Boolean)))
    const opportunityLink = parseOpportunityKey(draft.opportunityKey)
    onUpdate(project.id, {
      name: draft.name.trim() || project.name,
      clientId: draft.clientId || state.clients[0]?.id || project.clientId,
      description: draft.description,
      status: draft.status,
      health: draft.health,
      priority: draft.priority,
      code: draft.code.trim() || project.code,
      projectType: draft.projectType,
      contractType: draft.contractType,
      progress: Number(draft.progress) || 0,
      budget: Number(draft.budget) || 0,
      spent: Number(draft.spent) || 0,
      committed: Number(draft.committed) || 0,
      startDate: draft.startDate,
      dueDate: draft.dueDate,
      managerId,
      memberIds,
      tags: draft.tags.split(',').map(tag => tag.trim()).filter(Boolean),
      department: draft.department,
      location: {
        address: draft.address,
        city: draft.city,
        province: draft.province,
        postalCode: draft.postalCode,
      },
      budgetBreakdown: {
        direct: numericDraftValue(draft.directCost),
        indirect: numericDraftValue(draft.indirectCost),
        contingency: numericDraftValue(draft.contingencyCost),
        other: numericDraftValue(draft.otherCost),
      },
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
    }, 'Updated project profile, assignments, budget, and opportunity link')
    setSavedAt(Date.now())
  }

  useEffect(() => {
    if (!savedAt) return
    const timer = window.setTimeout(() => setSavedAt(null), 2600)
    return () => window.clearTimeout(timer)
  }, [savedAt])

  const toggleMember = (memberId: string) => {
    setDraft(prev => {
      const next = new Set(prev.memberIds)
      if (next.has(memberId)) next.delete(memberId)
      else next.add(memberId)
      return { ...prev, memberIds: Array.from(next) }
    })
  }

  const addNote = (event: FormEvent) => {
    event.preventDefault()
    if (!noteDraft.trim()) return
    onAddNote(project.id, noteDraft)
    setNoteDraft('')
  }

  const reportLines = () => [
    `${project.name} Project Report`,
    `Generated: ${new Date().toLocaleString()}`,
    '',
    `Status: ${project.status}`,
    `Health: ${project.health}`,
    `Priority: ${project.priority}`,
    `Progress: ${Math.round(project.progress)}%`,
    `Client: ${client?.name || 'Unassigned'}`,
    `Manager: ${manager?.name || 'Unassigned'}`,
    `Schedule: ${formatDate(project.startDate)} to ${formatDate(project.dueDate)}`,
    `Budget: ${formatMoney(project.budget)}`,
    `Spent: ${formatMoney(project.spent)}`,
    `Committed: ${formatMoney(project.committed)}`,
    `Remaining: ${formatMoney(remainingBudget)}`,
    '',
    `Tasks: ${completedTasks} complete / ${tasks.length} total`,
    ...tasks.map(task => `- ${task.title}: ${task.status}, due ${formatDate(task.dueDate)}, ${Math.round(task.progress)}%`),
    '',
    `Milestones: ${milestones.length}`,
    ...milestones.map(milestone => `- ${milestone.title}: ${milestone.status}, due ${formatDate(milestone.dueDate)}`),
    '',
    `Documents: ${documents.length}`,
    ...documents.map(document => `- ${document.name} (${document.type}, ${document.version})`),
    '',
    `Activity: ${activities.length}`,
    ...activities.slice(0, 25).map(item => `- ${formatDate(item.createdAt.slice(0, 10))}: ${item.action}`),
  ]

  const exportReport = () => {
    const blob = new Blob([reportLines().join('\n')], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${projectDisplayCode(project).replace(/[^a-z0-9-]+/gi, '-')}-project-report.txt`
    link.click()
    URL.revokeObjectURL(url)
  }

  const printReport = () => {
    const printable = window.open('', '_blank', 'noopener,noreferrer')
    const escape: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }
    const body = reportLines().map(line => line ? `<p>${line.replace(/[&<>"']/g, char => escape[char] || char)}</p>` : '<br />').join('')
    if (!printable) {
      window.print()
      return
    }
    const safeTitle = project.name.replace(/[&<>"']/g, char => escape[char] || char)
    printable.document.write(`<!doctype html><html><head><title>${safeTitle} Project Report</title><style>body{font-family:Arial,sans-serif;margin:32px;color:#111}p{margin:0 0 7px;line-height:1.35}p:first-child{font-size:24px;font-weight:700;margin-bottom:12px}</style></head><body>${body}</body></html>`)
    printable.document.close()
    window.setTimeout(() => {
      printable.focus()
      printable.print()
    }, 50)
  }

  return (
    <section className="pm-detail">
      <div className="pm-detail-crumbs" aria-label="Project breadcrumbs">
        <Home size={15} />
        <button type="button" onClick={onClose}>Project Mgmt</button>
        <ChevronRight size={13} />
        <button type="button" onClick={onClose}>Projects</button>
        <ChevronRight size={13} />
        <span>{project.name}</span>
      </div>

      <header className="pm-detail-hero-new">
        <ProjectThumbnail project={project} />
        <div className="pm-detail-hero-copy">
          <div className="pm-detail-hero-meta">
            <ProjectStatusBadge status={project.status} />
            <button type="button" aria-label="Open project flow"><ChevronRight size={14} /></button>
          </div>
          <h2>{project.name}<Star size={17} /></h2>
          <p>{project.tags[0] || project.department || 'Construction Project'}</p>
          <span><MapPin size={15} /> {projectLocation}</span>
        </div>
        <div className="pm-detail-hero-actions">
          <button type="button" aria-label={`Open actions for ${project.name}`}><MoreHorizontal size={18} /></button>
          <button type="button" onClick={() => { void navigator.clipboard?.writeText(project.name).catch(() => undefined) }}><Share2 size={16} /> Share</button>
        </div>
      </header>

      <TabBar tabs={detailTabs} active={selectedDetailTab} onChange={onTab} />
      {selectedDetailTab === 'Overview' && (
        <div className="pm-detail-dashboard">
          <section className="pm-detail-stats">
            <ProjectDetailStat title="Overall Progress" value={`${Math.round(project.progress)}%`} sub={projectHealthLabel(project)} icon={CheckCircle2} />
            <ProjectDetailStat title="Budget" value={formatMoney(project.budget)} sub={`Spent: ${formatMoney(project.spent)} (${spentPercent}%)`} icon={WalletCards} />
            <ProjectDetailStat title="Timeline" value={formatDate(project.startDate)} sub={`Due ${formatDate(project.dueDate)}`} icon={CalendarDays} tone="#60a5fa" />
            <ProjectDetailStat title="Tasks" value={`${completedTasks} / ${tasks.length}`} sub={`${remainingTasks} tasks remaining`} icon={ListChecks} tone="#8b5cf6" />
          </section>

          <div className="pm-detail-main-grid">
            <div className="pm-detail-left">
              <ProjectBudgetOverview budget={{ ...budget, remaining: remainingBudget }} />

              <div className="pm-detail-lower-grid">
                <ProjectTimelinePreview project={project} milestones={milestones} />
                <ProjectPhotoGrid project={project} attachments={taskAttachments} onViewAll={() => onTab('Files')} />
                <ProjectTeamPreview members={teamMembers} />
              </div>
            </div>

            <aside className="pm-detail-right">
              <section className="pm-detail-panel pm-detail-info-card">
                <h3>Project Details</h3>
                <ProjectDetailValue label="Project Code" value={projectDisplayCode(project)} />
                <ProjectDetailValue label="Client" value={client?.name || 'Unassigned'} />
                <ProjectDetailValue label="Project Manager" value={<><Avatar member={manager} /> {manager?.name || 'Unassigned'}</>} />
                <ProjectDetailValue label="Department" value={project.department || 'Unassigned'} />
                <ProjectDetailValue label="Status" value={<span className="pm-detail-dot-text"><i />{projectStatusLabel(project.status)}</span>} />
                <ProjectDetailValue label="Priority" value={project.priority} />
                <ProjectDetailValue label="Created" value={formatDate(project.startDate)} />
                <ProjectDetailValue label="Last Updated" value={formatDate(latestUpdate.slice(0, 10))} />
              </section>

              <section className="pm-detail-panel pm-detail-description-card">
                <h3>Description</h3>
                <p>{project.description || 'Add project scope, delivery requirements, and notes in Settings.'}</p>
                <button type="button" onClick={() => onTab('Settings')}>View more</button>
              </section>

              <ProjectActivityPreview state={state} activities={activities} />
            </aside>
          </div>
        </div>
      )}
      {selectedDetailTab === 'Settings' && (
        <form className="pm-settings-page" onSubmit={saveDetails}>
          <header className="pm-settings-header">
            <div>
              <span>Project Settings</span>
              <h2>{project.name}</h2>
              <p>Update the project profile, thumbnail, team access, budget controls, and workflow preferences.</p>
            </div>
            <div className="pm-settings-actions">
              {savedAt ? <span className="pm-settings-saved" role="status"><CheckCircle2 size={15} /> Saved</span> : null}
              <button type="button" className="pm-control" onClick={() => setDraft(projectDetailDraft(project))}>Reset</button>
              <button type="submit" className="pm-primary"><FileCheck2 size={15} /> Save Changes</button>
            </div>
          </header>

          <div className="pm-settings-layout">
            <main className="pm-settings-main">
              <section className="pm-settings-card">
                <div className="pm-settings-section-head">
                  <div><h3>Identity</h3><p>Core project information used across project lists, reports, and task workflows.</p></div>
                  <span>{draft.status}</span>
                </div>
                <div className="pm-settings-field-grid">
                  <Field label="Project name *"><input value={draft.name} onChange={event => setDraft(prev => ({ ...prev, name: event.target.value }))} required /></Field>
                  <Field label="Project code"><input value={draft.code} onChange={event => setDraft(prev => ({ ...prev, code: event.target.value }))} placeholder={projectDisplayCode(project)} /></Field>
                  <Field label="Sales opportunity">
                    <select value={draft.opportunityKey} onChange={event => applyDetailOpportunity(event.target.value)}>
                      <option value="">No linked opportunity</option>
                      {draft.opportunityKey && !draftOpportunity && <option value={draft.opportunityKey}>Linked opportunity not found</option>}
                      {opportunities.map(opportunity => <option key={opportunityKey(opportunity.source, opportunity.id)} value={opportunityKey(opportunity.source, opportunity.id)}>{opportunityLabel(opportunity)}</option>)}
                    </select>
                  </Field>
                  <Field label="Client"><select value={draft.clientId} onChange={event => setDraft(prev => ({ ...prev, clientId: event.target.value }))}>{!state.clients.length && <option value="client-local">Internal / Unassigned</option>}{state.clients.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></Field>
                  <Field label="Project type"><select value={draft.projectType} onChange={event => setDraft(prev => ({ ...prev, projectType: event.target.value, department: event.target.value || prev.department }))}>{detailProjectTypeOptions.map(type => <option key={type} value={type}>{type}</option>)}</select></Field>
                  <Field label="Contract type"><select value={draft.contractType} onChange={event => setDraft(prev => ({ ...prev, contractType: event.target.value }))}><option value="">Select contract type</option>{detailContractTypeOptions.map(type => <option key={type} value={type}>{type}</option>)}</select></Field>
                  <Field label="Department"><select value={draft.department} onChange={event => setDraft(prev => ({ ...prev, department: event.target.value }))}>{departmentOptions.map(department => <option key={department} value={department}>{department}</option>)}</select></Field>
                  <Field label="Project manager"><select value={draft.managerId} onChange={event => setDraft(prev => ({ ...prev, managerId: event.target.value }))}>{!state.members.length && <option value="">Unassigned</option>}{state.members.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></Field>
                  <Field label="Status"><select value={draft.status} onChange={event => setDraft(prev => ({ ...prev, status: event.target.value as ProjectStatus }))}>{projectStatusOptions.map(status => <option key={status} value={status}>{status}</option>)}</select></Field>
                  <Field label="Health"><select value={draft.health} onChange={event => setDraft(prev => ({ ...prev, health: event.target.value as ProjectHealth }))}>{healthOptions.map(health => <option key={health} value={health}>{health}</option>)}</select></Field>
                  <Field label="Priority"><select value={draft.priority} onChange={event => setDraft(prev => ({ ...prev, priority: event.target.value as TaskPriority }))}>{priorityOptions.filter(option => option !== 'All').map(priority => <option key={priority} value={priority}>{priority}</option>)}</select></Field>
                  <Field label="Progress %"><input type="number" min="0" max="100" value={draft.progress} onChange={event => setDraft(prev => ({ ...prev, progress: event.target.value }))} /></Field>
                </div>
              </section>

              <section className="pm-settings-card">
                <div className="pm-settings-section-head">
                  <div><h3>Schedule, Location & Budget</h3><p>Dates, delivery location, and cost controls shown throughout the project dashboard.</p></div>
                </div>
                <div className="pm-settings-field-grid">
                  <Field label="Start date"><input type="date" value={draft.startDate} onChange={event => setDraft(prev => ({ ...prev, startDate: event.target.value }))} /></Field>
                  <Field label="Due date"><input type="date" value={draft.dueDate} onChange={event => setDraft(prev => ({ ...prev, dueDate: event.target.value }))} /></Field>
                  <Field label="Budget"><input type="number" min="0" value={draft.budget} onChange={event => setDraft(prev => ({ ...prev, budget: event.target.value }))} /></Field>
                  <Field label="Spent"><input type="number" min="0" value={draft.spent} onChange={event => setDraft(prev => ({ ...prev, spent: event.target.value }))} /></Field>
                  <Field label="Committed"><input type="number" min="0" value={draft.committed} onChange={event => setDraft(prev => ({ ...prev, committed: event.target.value }))} /></Field>
                  <Field label="Direct cost"><input type="number" min="0" value={draft.directCost} onChange={event => setDraft(prev => ({ ...prev, directCost: event.target.value }))} /></Field>
                  <Field label="Indirect cost"><input type="number" min="0" value={draft.indirectCost} onChange={event => setDraft(prev => ({ ...prev, indirectCost: event.target.value }))} /></Field>
                  <Field label="Contingency"><input type="number" min="0" value={draft.contingencyCost} onChange={event => setDraft(prev => ({ ...prev, contingencyCost: event.target.value }))} /></Field>
                  <Field label="Other cost"><input type="number" min="0" value={draft.otherCost} onChange={event => setDraft(prev => ({ ...prev, otherCost: event.target.value }))} /></Field>
                  <Field label="Address" className="pm-settings-span-2"><input value={draft.address} onChange={event => setDraft(prev => ({ ...prev, address: event.target.value }))} placeholder="Project address" /></Field>
                  <Field label="City / Municipality"><input value={draft.city} onChange={event => setDraft(prev => ({ ...prev, city: event.target.value }))} /></Field>
                  <Field label="Province"><select value={draft.province} onChange={event => setDraft(prev => ({ ...prev, province: event.target.value }))}><option value="">Select province</option>{provinceOptions.map(province => <option key={province} value={province}>{province}</option>)}</select></Field>
                  <Field label="Zip / Postal code"><input value={draft.postalCode} onChange={event => setDraft(prev => ({ ...prev, postalCode: event.target.value }))} /></Field>
                  <Field label="Tags" className="pm-settings-span-2"><input value={draft.tags} onChange={event => setDraft(prev => ({ ...prev, tags: event.target.value }))} placeholder="construction, phase 1, priority" /></Field>
                  <label className="pm-field pm-settings-span-2"><span>Description</span><textarea value={draft.description} onChange={event => setDraft(prev => ({ ...prev, description: event.target.value }))} rows={5} /></label>
                </div>
              </section>

              <section className="pm-settings-card">
                <div className="pm-settings-section-head">
                  <div><h3>Team Members</h3><p>Choose who has project visibility and task assignment access.</p></div>
                  <span>{draft.memberIds.length} assigned</span>
                </div>
                <div className="pm-settings-team-list">
                  {state.members.length ? state.members.map(member => (
                    <label key={member.id} className="pm-settings-team-option">
                      <input type="checkbox" checked={teamMemberIds.has(member.id)} onChange={() => toggleMember(member.id)} />
                      <Avatar member={member} />
                      <span><strong>{member.name}</strong><small>{member.role} - {member.department}</small></span>
                    </label>
                  )) : <EmptyState title="No team members" body="Employees will appear here when connected to HR." />}
                </div>
              </section>
            </main>

            <aside className="pm-settings-side">
              <section className="pm-settings-card pm-settings-photo-card">
                <div className="pm-settings-section-head">
                  <div><h3>Thumbnail</h3><p>This image appears on the project list, detail header, and photo overview.</p></div>
                </div>
                <label className={draftThumbnailSource ? 'pm-settings-photo-drop has-image' : 'pm-settings-photo-drop'} htmlFor={`pm-detail-thumbnail-${project.id}`} onDragOver={event => event.preventDefault()} onDrop={dropDetailProjectThumbnail}>
                  {draftThumbnailSource ? (
                    <span style={{ backgroundImage: `url(${draftThumbnailSource})` }} aria-label={`${project.name} thumbnail preview`} />
                  ) : (
                    <i><Camera size={26} /></i>
                  )}
                  <b><Camera size={15} /> {draftThumbnailSource ? 'Edit photo' : 'Upload photo'}</b>
                </label>
                <input id={`pm-detail-thumbnail-${project.id}`} className="pm-create-file-input" type="file" accept="image/png,image/jpeg,image/webp" onChange={attachDetailProjectThumbnail} />
                <p>{draft.thumbnailName || 'Upload or drag a JPG, PNG, or WebP image, then save changes.'}</p>
              </section>

              <section className="pm-settings-card">
                <div className="pm-settings-section-head">
                  <div><h3>Workflow Settings</h3><p>Turn project modules on or off for this workspace.</p></div>
                </div>
                <div className="pm-settings-toggle-list">
                  {workflowSettings.map(item => (
                    <label key={item.key} className="pm-settings-toggle">
                      <span><strong>{item.title}</strong><small>{item.body}</small></span>
                      <input type="checkbox" checked={draft[item.key]} onChange={event => setDraft(prev => ({ ...prev, [item.key]: event.target.checked }))} />
                    </label>
                  ))}
                </div>
              </section>

              <section className="pm-settings-card pm-settings-danger-card">
                <div className="pm-settings-section-head">
                  <div><h3>Project Controls</h3><p>Archive hides this project from active lists. Delete permanently removes related records.</p></div>
                </div>
                <div className="pm-settings-danger-actions">
                  {project.archivedAt ? (
                    <button type="button" className="pm-control" onClick={() => { if (window.confirm(`Restore ${project.name} to active projects?`)) onRestore(project.id) }}>Restore</button>
                  ) : (
                    <button type="button" className="pm-control" onClick={() => { if (window.confirm(`Archive ${project.name}?`)) onArchive(project.id) }}>Archive</button>
                  )}
                  <button type="button" className="pm-control danger" onClick={() => { if (window.confirm(`Delete ${project.name} and all related records?`)) onDelete(project.id) }}>Delete</button>
                </div>
              </section>
            </aside>
          </div>
        </form>
      )}
      {selectedDetailTab === 'Tasks' && (
        <TasksTab state={projectState} onAddTask={() => onAddTask(project.id)} onOpenTask={onOpenTask} onEditTask={onEditTask} onArchiveTask={onArchiveTask} onDeleteTask={onDeleteTask} />
      )}
      {selectedDetailTab === 'Schedule' && (
        <PlanningTab
          state={projectState}
          project={project}
          onCreateMilestone={onCreateMilestone}
          onUpdateMilestone={onUpdateMilestone}
          onUpdateMilestoneStatus={onUpdateMilestoneStatus}
          onDeleteMilestone={onDeleteMilestone}
        />
      )}
      {selectedDetailTab === 'Files' && <ProjectFilesTab state={projectState} />}
      {selectedDetailTab === 'Budget' && <BudgetTab state={{ ...state, projects: [project] }} budget={budget} />}
      {selectedDetailTab === 'Team' && <Resources state={{ ...state, projects: [project], members: teamMembers }} />}
      {selectedDetailTab === 'Reports' && (
        <section className="pm-card pm-detail-reports">
          <SectionTitle
            title="Reports"
            action={<span className="pm-report-actions"><button type="button" onClick={exportReport}><Download size={14} /> Export</button><button type="button" onClick={printReport}><Printer size={14} /> Print</button></span>}
          />
          <form className="pm-note-form" onSubmit={addNote}>
            <input value={noteDraft} onChange={event => setNoteDraft(event.target.value)} placeholder="Add a project note..." />
            <button type="submit" className="pm-control">Add Note</button>
          </form>
          {activities.length ? <ActivityList state={state} activities={activities} /> : <EmptyState title="No activity yet" body="Project changes and notes will appear here." />}
        </section>
      )}
    </section>
  )
}

function defaultMilestoneDraft(project: ProjectRecord) {
  return {
    projectId: project.id,
    title: '',
    phase: 'Planning',
    baselineDate: project.dueDate,
    dueDate: project.dueDate,
    priority: 'Medium' as TaskPriority,
    status: 'Pending' as MilestoneStatus,
  }
}

function milestoneDraftFromRecord(milestone: ProjectMilestone) {
  return {
    projectId: milestone.projectId,
    title: milestone.title,
    phase: milestone.phase || 'Planning',
    baselineDate: milestone.baselineDate || milestone.dueDate,
    dueDate: milestone.dueDate,
    priority: milestone.priority,
    status: milestone.status,
  }
}

function dayDiff(from: string, to: string) {
  const start = new Date(`${from}T00:00:00`).getTime()
  const end = new Date(`${to}T00:00:00`).getTime()
  if (!Number.isFinite(start) || !Number.isFinite(end)) return 0
  return Math.round((end - start) / 86400000)
}

function milestoneSignal(milestone: ProjectMilestone) {
  const baseline = milestone.baselineDate || milestone.dueDate
  const drift = dayDiff(baseline, milestone.dueDate)
  const overdue = milestone.status !== 'Done' && new Date(`${milestone.dueDate}T23:59:59`).getTime() < Date.now()
  if (milestone.status === 'Delayed' || overdue) return { label: overdue ? 'Overdue' : 'Delayed', tone: 'danger', drift }
  if (milestone.priority === 'Critical') return { label: 'Critical', tone: 'danger', drift }
  if (drift > 0) return { label: `${drift}d slip`, tone: 'warning', drift }
  if (milestone.status === 'Done') return { label: 'Complete', tone: 'good', drift }
  return { label: 'On track', tone: 'good', drift }
}

function PlanningTab({
  state,
  project,
  onCreateMilestone,
  onUpdateMilestone,
  onUpdateMilestoneStatus,
  onDeleteMilestone,
}: {
  state: ProjectManagementState
  project: ProjectRecord
  onCreateMilestone: (draft: MilestoneDraft) => void
  onUpdateMilestone: (milestoneId: string, patch: MilestoneUpdateDraft) => void
  onUpdateMilestoneStatus: (milestoneId: string, status: MilestoneStatus) => void
  onDeleteMilestone: (milestoneId: string) => void
}) {
  const [draft, setDraft] = useState(() => defaultMilestoneDraft(project))
  const [editingId, setEditingId] = useState<string | null>(null)
  const milestones = [...state.milestones].sort((a, b) => new Date(`${a.dueDate}T00:00:00`).getTime() - new Date(`${b.dueDate}T00:00:00`).getTime())
  const phases = Array.from(new Set([...phaseOptions, ...milestones.map(milestone => milestone.phase || 'Planning'), draft.phase].filter(Boolean)))
  const blockedTasks = state.tasks.filter(task => task.dependencies.length > 0 || task.status === 'Blocked')
  const delayedMilestones = milestones.filter(milestone => ['Delayed', 'Pending', 'In Progress'].includes(milestone.status) && milestoneSignal(milestone).tone === 'danger')

  const resetDraft = () => {
    setDraft(defaultMilestoneDraft(project))
    setEditingId(null)
  }

  const submitMilestone = (event: FormEvent) => {
    event.preventDefault()
    const nextDraft: MilestoneDraft = {
      ...draft,
      title: draft.title.trim() || 'Untitled milestone',
      phase: draft.phase.trim() || 'Planning',
      baselineDate: draft.baselineDate || draft.dueDate,
    }
    if (editingId) onUpdateMilestone(editingId, nextDraft)
    else onCreateMilestone(nextDraft)
    resetDraft()
  }

  const startEdit = (milestone: ProjectMilestone) => {
    setEditingId(milestone.id)
    setDraft(milestoneDraftFromRecord(milestone))
  }

  return (
    <section className="pm-planning-grid">
      <form className="pm-card pm-planning-form" onSubmit={submitMilestone}>
        <div className="pm-section-bar"><h2>{editingId ? 'Edit Milestone' : 'Create Milestone'}</h2><span className="pm-section-action">{project.name}</span></div>
        <div className="pm-planning-form-grid">
          <Field label="Milestone *"><input value={draft.title} onChange={event => setDraft(prev => ({ ...prev, title: event.target.value }))} placeholder="e.g. Structural inspection sign-off" required /></Field>
          <Field label="Phase"><select value={draft.phase} onChange={event => setDraft(prev => ({ ...prev, phase: event.target.value }))}>{phases.map(phase => <option key={phase} value={phase}>{phase}</option>)}</select></Field>
          <Field label="Baseline date"><input type="date" value={draft.baselineDate} onChange={event => setDraft(prev => ({ ...prev, baselineDate: event.target.value }))} /></Field>
          <Field label="Current due date"><input type="date" value={draft.dueDate} onChange={event => setDraft(prev => ({ ...prev, dueDate: event.target.value }))} /></Field>
          <Field label="Priority"><select value={draft.priority} onChange={event => setDraft(prev => ({ ...prev, priority: event.target.value as TaskPriority }))}>{priorityOptions.filter(option => option !== 'All').map(priority => <option key={priority} value={priority}>{priority}</option>)}</select></Field>
          <Field label="Status"><select value={draft.status} onChange={event => setDraft(prev => ({ ...prev, status: event.target.value as MilestoneStatus }))}>{milestoneStatusOptions.map(status => <option key={status} value={status}>{status}</option>)}</select></Field>
        </div>
        <div className="pm-form-actions"><button type="button" className="pm-control" onClick={resetDraft}>{editingId ? 'Cancel Edit' : 'Clear'}</button><button type="submit" className="pm-primary">{editingId ? 'Save Milestone' : 'Add Milestone'}</button></div>
      </form>

      <aside className="pm-card pm-planning-health">
        <SectionTitle title="Planning Health" action={`${milestones.length} milestones`} />
        <div className="pm-planning-stats">
          <span className={milestones.some(item => item.status === 'Done') ? 'is-good' : undefined}><strong>{milestones.filter(item => item.status === 'Done').length}</strong><small>Completed</small></span>
          <span className={delayedMilestones.length ? 'is-warn' : undefined}><strong>{delayedMilestones.length}</strong><small>Delayed / critical</small></span>
          <span className={blockedTasks.length ? 'is-danger' : undefined}><strong>{blockedTasks.length}</strong><small>Blocked dependencies</small></span>
        </div>
        {delayedMilestones.length || blockedTasks.length ? (
          <div className="pm-planning-risks">
            {delayedMilestones.slice(0, 4).map(milestone => <p key={milestone.id}><Pill value={milestoneSignal(milestone).label} /> {milestone.title}</p>)}
            {blockedTasks.slice(0, 3).map(task => <p key={task.id}><Pill value="Blocked" /> {task.title}</p>)}
          </div>
        ) : <EmptyState title="No planning risks" body="Milestone slippage and task blockers will appear here." />}
      </aside>

      <div className="pm-card pm-phase-board">
        <SectionTitle title="Project Phases" action={`${phases.length}`} />
        <div className="pm-phase-lanes">
          {phases.map(phase => {
            const phaseMilestones = milestones.filter(milestone => (milestone.phase || 'Planning') === phase)
            return (
              <section className="pm-phase-lane" key={phase}>
                <div className="pm-phase-lane-head"><strong>{phase}</strong><span>{phaseMilestones.length}</span></div>
                {phaseMilestones.length ? phaseMilestones.map(milestone => {
                  const signal = milestoneSignal(milestone)
                  return (
                    <article className="pm-milestone-card" key={milestone.id}>
                      <div>
                        <strong>{milestone.title}</strong>
                        <Pill value={signal.label} />
                      </div>
                      <small>Baseline {formatDate(milestone.baselineDate || milestone.dueDate)} - Due {formatDate(milestone.dueDate)}</small>
                      <div className="pm-milestone-meta">
                        <Pill value={milestone.priority} />
                        <select value={milestone.status} onChange={event => onUpdateMilestoneStatus(milestone.id, event.target.value as MilestoneStatus)} aria-label={`Status for ${milestone.title}`}>
                          {milestoneStatusOptions.map(status => <option key={status} value={status}>{status}</option>)}
                        </select>
                      </div>
                      <footer>
                        <button type="button" onClick={() => startEdit(milestone)}>Edit</button>
                        <button type="button" onClick={() => { if (window.confirm(`Delete milestone ${milestone.title}?`)) onDeleteMilestone(milestone.id) }}>Delete</button>
                      </footer>
                    </article>
                  )
                }) : <p className="pm-phase-empty">No milestones in this phase.</p>}
              </section>
            )
          })}
        </div>
      </div>
    </section>
  )
}

function ActivityList({ state, activities }: { state: ProjectManagementState; activities: ProjectManagementState['activities'] }) {
  return <div className="pm-activity-list">{activities.map(activity => {
    const actor = state.members.find(member => member.id === activity.actorId)
    return <article key={activity.id}><span>{initials(actor?.name || 'WF')}</span><div><strong>{activity.action}</strong><small>{actor?.name || 'WiseFlow'} - {new Date(activity.createdAt).toLocaleString('en-US', { month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit' })}</small></div></article>
  })}</div>
}

function SectionTitle({ title, action }: { title: string; action?: ReactNode }) { return <div className="pm-section-bar"><h2>{title}</h2>{action && <span className="pm-section-action">{action}</span>}</div> }
function Pill({ value }: { value: string }) { return <span className={`pm-pill tone-${value.toLowerCase().replaceAll(' ', '-')}`}>{value}</span> }
function Avatar({ member }: { member?: { name: string; avatarColor: string } }) { return <span className="pm-avatar">{initials(member?.name || 'NA')}</span> }
function Progress({ value }: { value: number }) { return <span className="pm-progress"><i style={{ width: `${Math.max(0, Math.min(value, 100))}%` }} /></span> }

function Donut({ data, center, sub }: { data: Array<{ label: string; value: number; color: string }>; center: string; sub: string }) {
  if (!data.some(item => item.value > 0)) return <EmptyState title="No project status data" body="Create projects and their status breakdown will appear here." />
  const total = Math.max(data.reduce((s, d) => s + d.value, 0), 1)
  const gradient = data.reduce<{ cursor: number; stops: string[] }>((acc, item) => {
    const start = acc.cursor
    const end = start + (item.value / total) * 100
    return { cursor: end, stops: [...acc.stops, `${item.color} ${start}% ${end}%`] }
  }, { cursor: 0, stops: [] }).stops.join(', ')
  return <div className="pm-donut-wrap"><div className="pm-donut" style={{ background: `conic-gradient(${gradient})` }}><span><strong>{center}</strong><small>{sub}</small></span></div><div className="pm-legend">{data.map(item => <p key={item.label}><i style={{ background: item.color }} />{item.label}<strong>{Math.round((item.value / total) * 100)}% ({item.value})</strong></p>)}</div></div>
}

function LineChart({ data }: { data: ReturnType<typeof monthlyStatusTrend> }) {
  if (!data.length) return <EmptyState title="No status trend yet" body="Project trend analytics will appear once real project records exist." />
  const series = [{ key: 'completed', color: colors.green }, { key: 'inProgress', color: colors.blue }, { key: 'onHold', color: colors.orange }, { key: 'planning', color: colors.purple }] as const
  const max = Math.max(...data.flatMap(row => series.map(item => Number(row[item.key]))), 1)
  const points = (key: typeof series[number]['key']) => data.map((row, index) => ({
    x: (index / Math.max(data.length - 1, 1)) * 620 + 10,
    y: 230 - (Number(row[key]) / max) * 190,
  }))
  return <div className="pm-line"><svg viewBox="0 0 640 260" preserveAspectRatio="none">{[0, 1, 2, 3].map(i => <line key={i} x1="0" x2="640" y1={40 + i * 55} y2={40 + i * 55} stroke="#e8edf4" />)}{series.map(item => { const itemPoints = points(item.key); return <g key={item.key}><polyline fill="none" stroke={item.color} strokeWidth="3" points={itemPoints.map(point => `${point.x},${point.y}`).join(' ')} />{itemPoints.map((point, index) => <circle key={`${item.key}-${index}`} cx={point.x} cy={point.y} r="4" fill={item.color} />)}</g> })}</svg><div>{data.map(row => <span key={row.label}>{row.label}</span>)}</div></div>
}

function MilestoneList({ state }: { state: ProjectManagementState }) {
  if (!state.milestones.length) return <EmptyState title="No upcoming milestones" body="Milestones tied to real projects will appear here." />
  return <div className="pm-list">{state.milestones.slice(0, 5).map(m => { const p = state.projects.find(project => project.id === m.projectId); return <article key={m.id}><CalendarDays size={17} /><span><strong>{m.title}</strong><small>{p?.name || 'Unassigned project'}</small></span><em>{formatDate(m.dueDate)}</em><Pill value={m.priority} /></article> })}</div>
}
function BudgetSummary({ budget }: { budget: ReturnType<typeof budgetSummary> }) {
  const labels: Record<keyof ReturnType<typeof budgetSummary>, string> = {
    total: 'Total',
    spent: 'Spent',
    committed: 'Committed',
    remaining: 'Remaining',
  }
  return <div className="pm-budget-meter">{Object.entries(budget).map(([key, value]) => <span key={key}><small>{labels[key as keyof typeof labels]}</small><strong>{formatMoney(value)}</strong></span>)}<Progress value={budget.total ? ((budget.spent + budget.committed) / budget.total) * 100 : 0} /></div>
}
function QuickActions({ onNewProject, onAction }: { onNewProject: () => void; onAction: (action: 'task' | 'time' | 'document') => void }) {
  const actions: Array<{ label: string; icon: LucideIcon; onClick: () => void }> = [
    { label: 'New Project', icon: Plus, onClick: onNewProject },
    { label: 'Assign Task', icon: ListChecks, onClick: () => onAction('task') },
    { label: 'Upload Document', icon: FileText, onClick: () => onAction('document') },
  ]
  return <div className="pm-actions">{actions.map(({ label, icon: Icon, onClick }) => <button key={label} type="button" onClick={onClick}><span><Icon size={16} /></span>{label}<ChevronDown size={15} /></button>)}</div>
}
function EmptyState({ title, body }: { title: string; body: string }) {
  return <div className="pm-empty"><span className="pm-empty-icon"><BriefcaseBusiness size={22} /></span><strong>{title}</strong><p>{body}</p></div>
}

const projectManagementCss = `
.pm-shell { display: grid; align-content: start; gap: 20px; color: #0f172a; font-family: var(--font-body); }
.pm-shell { max-width: var(--wf-content-max, 1440px); width: 100%; margin-inline: auto; padding-inline: clamp(16px, 2vw, 28px); overflow-x: clip; }
.pm-workspace { max-width: 100%; overflow-x: clip; }
.pm-workspace { min-width: 0; display: grid; align-content: start; gap: 20px; position: relative; }
.pm-header { display: grid; grid-template-columns: minmax(220px, 1fr) auto; gap: 16px; align-items: start; }
.pm-title-block h1 { margin: 0; font-size: 30px; line-height: 1.08; font-weight: 900; letter-spacing: 0; }
.pm-title-block p { margin: 7px 0 0; color: #475569; font-size: 14px; font-weight: 500; }
.pm-header-actions { display: flex; gap: 12px; justify-content: flex-end; flex-wrap: wrap; }
.pm-control, .pm-primary, .pm-select, .pm-search { min-height: 38px; border: 1px solid #dbe3ef; border-radius: 8px; background: #fff; color: #091133; display: inline-flex; align-items: center; gap: 8px; padding: 0 14px; font-size: 13px; font-weight: 800; max-width: 100%; }
.pm-primary { background: #16a34a; border-color: #16a34a; color: #fff; cursor: pointer; }
.pm-primary:disabled { opacity: .55; cursor: not-allowed; }
.pm-search input { border: 0; outline: 0; min-width: min(220px, 42vw); font: inherit; max-width: 100%; }
.pm-card { background: #fff; border: 1px solid #dfe7f2; border-radius: 8px; box-shadow: 0 10px 24px rgba(15, 23, 42, .035); padding: 20px; min-width: 0; }
.pm-kpis { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(210px, 100%), 1fr)); gap: 18px; margin-bottom: 0; }
.pm-kpi { display: flex; align-items: center; gap: 18px; min-height: 112px; }
.pm-kpi div { min-width: 0; }
.pm-kpi > span { width: 56px; height: 56px; border-radius: 12px; display: grid; place-items: center; flex: 0 0 auto; }
.pm-kpi small, .pm-card small { color: #475569; font-size: 13px; font-weight: 750; }
.pm-kpi strong { display: block; font-size: 24px; line-height: 1.1; margin-top: 6px; overflow-wrap: anywhere; }
.pm-kpi em { display: block; color: #16a34a; font-style: normal; font-size: 12px; font-weight: 750; margin-top: 8px; }
.pm-kpi em.negative { color: #ef4444; }
.pm-tabs {
  display: flex;
  gap: 24px;
  align-items: flex-end;
  min-height: 48px;
  border-bottom: 1px solid #dfe7f2;
  overflow-x: auto;
  margin-bottom: 20px;
  background: transparent !important;
}
.pm-tabs button {
  min-height: 48px;
  padding: 0 0 12px;
  border: 0 !important;
  border-bottom: 2px solid transparent !important;
  border-radius: 0 !important;
  background: transparent !important;
  box-shadow: none !important;
  color: #334155;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  white-space: nowrap;
  transform: none !important;
}
.pm-tabs button.active,
.pm-tabs button[aria-selected="true"],
.pm-tabs button:hover,
.pm-tabs button:focus-visible {
  color: #111827 !important;
  border-bottom-color: #111827 !important;
  font-weight: 600;
}
.pm-overview-grid { display: grid; gap: 18px; align-items: stretch; }
.pm-dashboard-overview {
  grid-template-columns: minmax(340px, 1.05fr) minmax(360px, 1.2fr) minmax(300px, .85fr);
  grid-template-areas:
    "progress trend milestones"
    "recent recent budget"
    "recent recent quick";
}
.pm-progress-card { grid-area: progress; }
.pm-trend { grid-area: trend; }
.pm-milestones { grid-area: milestones; }
.pm-recent { grid-area: recent; }
.pm-budget-card { grid-area: budget; }
.pm-quick-card { grid-area: quick; }
.pm-section-header { display: flex; justify-content: space-between; align-items: center; gap: 12px; margin-bottom: 16px; }
.pm-section-header h2 { margin: 0; font-size: 15px; font-weight: 900; }
.pm-section-header button { border: 0; background: transparent; color: #0f172a; font-weight: 900; cursor: pointer; }
.pm-section-bar { min-width: 0; display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; flex-wrap: wrap; margin-bottom: 16px; }
.pm-section-bar h2 { min-width: 0; margin: 0; font-size: 18px; line-height: 1.2; font-weight: 600; overflow-wrap: anywhere; }
.pm-section-bar button, .pm-section-action { min-height: 24px; display: inline-flex; align-items: center; border: 1px solid var(--pm-border-soft, #dbe3ef); border-radius: 999px; background: var(--pm-card-hover, #f8fafc); color: var(--pm-muted, #475569); padding: 3px 9px; font-size: 12px; line-height: 1.2; font-weight: 600; white-space: nowrap; }
.pm-section-bar button { cursor: pointer; }
.pm-report-actions { display: inline-flex; align-items: center; gap: 6px; }
.pm-report-actions button { gap: 6px; }
.pm-donut-wrap { display: grid; grid-template-columns: minmax(160px, 220px) minmax(0, 1fr); align-items: center; gap: 20px; }
.pm-donut { width: 200px; height: 200px; border-radius: 50%; display: grid; place-items: center; }
.pm-donut span { width: 112px; height: 112px; border-radius: 50%; background: #fff; color: #0f172a; display: grid; grid-template-rows: auto auto; place-items: center; justify-items: center; align-content: center; gap: 6px; text-align: center; user-select: none; }
.pm-donut strong { display: block; color: #0f172a !important; font-size: 24px; line-height: 1; font-weight: 700; }
.pm-donut small { display: block; max-width: 76px; color: #94a3b8 !important; font-size: 12px; line-height: 1.2; font-weight: 500; }
.pm-legend, .pm-list, .pm-actions, .pm-task-list, .pm-bar-list { display: grid; gap: 12px; }
.pm-legend p { display: grid; grid-template-columns: 10px 1fr auto; gap: 10px; align-items: center; margin: 0; font-size: 13px; }
.pm-legend i { width: 10px; height: 10px; border-radius: 999px; }
.pm-line { min-height: 244px; display: grid; grid-template-rows: 1fr auto; }
.pm-line svg { width: 100%; height: clamp(170px, 20vw, 224px); }
.pm-line div { display: flex; justify-content: space-between; color: #23335f; font-size: 12px; font-weight: 800; }
.pm-list article { display: grid; grid-template-columns: 34px minmax(0, 1fr) auto; column-gap: 10px; row-gap: 4px; align-items: center; }
.pm-list article > svg { grid-column: 1; grid-row: 1 / span 2; align-self: center; }
.pm-list article > span:not(.pm-pill) { grid-column: 2; grid-row: 1; display: grid; gap: 2px; min-width: 0; }
.pm-list article > .pm-pill { grid-column: 3; grid-row: 1; justify-self: end; align-self: center; }
.pm-list article > em { grid-column: 2 / -1; grid-row: 2; color: #475569; font-size: 12px; font-style: normal; font-weight: 700; }
.pm-list article strong { font-size: 13px; line-height: 1.3; font-weight: 800; overflow-wrap: anywhere; }
.pm-list article small { color: #64748b; font-size: 12px; line-height: 1.3; overflow-wrap: anywhere; }
.pm-list svg { width: 34px; height: 34px; padding: 8px; border-radius: 9px; background: #e6fffb; color: #0891b2; }
.pm-table-wrap { overflow-x: auto; }
.pm-mobile-projects { display: none; }
.pm-table { width: 100%; min-width: 820px; border-collapse: collapse; }
.pm-table th { text-align: left; padding: 13px 14px; background: #f8fafc; color: #475569; font-size: 11px; font-weight: 900; }
.pm-table td { padding: 13px 14px; border-top: 1px solid #edf2f8; font-size: 12px; vertical-align: middle; }
.pm-avatar { width: 28px; height: 28px; border: 1px solid var(--pm-border-soft); border-radius: 999px; background: var(--pm-card-hover); color: var(--pm-foreground); display: inline-grid; place-items: center; font-size: 11px; font-weight: 900; vertical-align: middle; margin-right: 6px; }
.pm-pill { display: inline-flex; min-height: 24px; border-radius: 7px; background: #eef2ff; color: #4f46e5; padding: 0 8px; align-items: center; font-size: 11px; font-weight: 900; white-space: nowrap; }
.tone-completed, .tone-done, .tone-approved, .tone-good { background: #dcfce7; color: #15803d; }
.tone-in-progress, .tone-active, .tone-review { background: #dbeafe; color: #2563eb; }
.tone-on-hold, .tone-medium, .tone-pending { background: #ffedd5; color: #ea580c; }
.tone-critical, .tone-high, .tone-blocked, .tone-delayed, .tone-at-risk { background: #fee2e2; color: #dc2626; }
.pm-progress { display: block; width: 112px; height: 8px; border-radius: 999px; background: #e9edf4; overflow: hidden; }
.pm-progress i { display: block; height: 100%; border-radius: inherit; background: #2f80ed; }
.pm-icon-btn { width: 34px; height: 34px; border: 1px solid #dbe3ef; border-radius: 8px; background: #fff; display: grid; place-items: center; cursor: pointer; }
.pm-filter-row { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 10px; margin-bottom: 16px; }
.pm-kanban { display: grid; grid-template-columns: repeat(5, minmax(240px, 1fr)); gap: 16px; overflow-x: auto; }
.pm-kanban-col { display: grid; align-content: start; gap: 12px; }
.pm-task-board-card { overflow: hidden; }
.pm-task-board { width: 100%; min-width: 0; overflow-x: auto; display: grid; border: 1px solid var(--pm-border-soft, #e6edf6); border-radius: 12px; background: var(--pm-card, #fff); }
.pm-task-board-group { min-width: 1040px; min-height: 44px; display: flex; align-items: center; gap: 10px; padding: 0 14px; border-bottom: 1px solid var(--pm-border-soft, #e6edf6); background: var(--pm-card-hover, #f8fafc); color: var(--pm-foreground, #0f172a); }
.pm-task-board-group span { font-size: 14px; font-weight: 800; }
.pm-task-board-group strong { min-width: 24px; height: 24px; border-radius: 999px; display: grid; place-items: center; background: var(--pm-card, #fff); border: 1px solid var(--pm-border-soft, #e6edf6); color: var(--pm-muted, #64748b); font-size: 12px; }
.pm-task-board-head,
.pm-task-board-row { min-width: 1040px; display: grid; grid-template-columns: minmax(260px, 1.5fr) minmax(180px, .9fr) 112px 104px 120px 132px 82px 76px 116px; align-items: stretch; }
.pm-task-board-head { min-height: 38px; border-bottom: 1px solid var(--pm-border-soft, #e6edf6); background: color-mix(in srgb, var(--pm-card-hover, #f8fafc) 55%, var(--pm-card, #fff)); color: var(--pm-muted, #64748b); font-size: 12px; font-weight: 700; }
.pm-task-board-head span,
.pm-task-board-row > * { min-width: 0; display: flex; align-items: center; padding: 10px 12px; border-right: 1px solid var(--pm-border-soft, #e6edf6); }
.pm-task-board-head span:last-child,
.pm-task-board-row > *:last-child { border-right: 0; }
.pm-task-board-row { min-height: 62px; border-bottom: 1px solid var(--pm-border-soft, #e6edf6); color: var(--pm-foreground, #0f172a); cursor: pointer; }
.pm-task-board-row:last-child { border-bottom: 0; }
.pm-task-board-row:hover,
.pm-task-board-row:focus-visible { background: var(--pm-card-hover, #f8fafc); outline: none; }
.pm-task-board-title { display: grid !important; align-content: center; align-items: center; gap: 3px; }
.pm-task-board-title strong { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 14px; line-height: 1.25; }
.pm-task-board-title small,
.pm-task-board-title span { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: var(--pm-muted, #64748b); font-size: 12px; line-height: 1.2; }
.pm-task-board-owner { gap: 6px; }
.pm-task-board-owner span { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 13px; }
.pm-task-board-date { color: var(--pm-muted, #64748b); font-size: 13px; font-weight: 600; }
.pm-task-board-count { gap: 6px; justify-content: center; color: var(--pm-muted, #64748b); font-size: 13px; font-weight: 700; }
.pm-task-board-actions { justify-content: flex-end; gap: 6px; }
.pm-task-board-actions .pm-icon-btn { width: 30px; height: 30px; }
.pm-task-card { border: 1px solid #e6edf6; border-radius: 14px; padding: 14px; display: grid; gap: 10px; background: #fff; cursor: pointer; }
.pm-task-card.is-draggable { cursor: grab; }
.pm-task-card:focus-visible { outline: 2px solid var(--pm-foreground, #0f172a); outline-offset: 3px; }
.pm-task-card > div:first-child { min-width: 0; display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 3px 10px; align-items: start; }
.pm-task-card > div:first-child strong { min-width: 0; overflow-wrap: anywhere; }
.pm-task-card > div:first-child small { grid-column: 1; color: var(--pm-muted, #64748b); }
.pm-task-actions { grid-column: 2; grid-row: 1 / span 2; display: flex; align-items: center; gap: 6px; }
.pm-task-actions .pm-icon-btn { width: 30px; height: 30px; }
.pm-icon-btn.danger { border-color: rgba(239,68,68,.35); color: #ef4444; }
.pm-task-card p { margin: 0; color: #23335f; font-size: 13px; line-height: 1.45; }
.pm-chip-row { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
.pm-chip-row span:not(.pm-pill) { display: inline-flex; align-items: center; gap: 4px; color: #64748b; font-size: 12px; }
.pm-task-card footer { display: grid; grid-template-columns: auto 1fr auto; align-items: center; gap: 8px; }
.pm-task-collab { grid-column: 1 / -1; display: grid; gap: 14px; padding-top: 2px; }
.pm-task-collab-head { min-width: 0; display: flex; align-items: flex-end; justify-content: space-between; gap: 14px; padding-top: 4px; border-top: 1px solid var(--pm-border-soft, #e6edf6); }
.pm-task-collab-head h3 { margin: 14px 0 0; color: var(--pm-foreground, #0f172a); font-size: 16px; line-height: 1.2; font-weight: 700; }
.pm-task-collab-head p { margin: 4px 0 0; color: var(--pm-muted, #64748b); font-size: 13px; line-height: 1.4; }
.pm-task-collab-head > span { flex: 0 0 auto; color: var(--pm-muted, #64748b); font-size: 12px; font-weight: 600; white-space: nowrap; }
.pm-task-collab-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 14px; align-items: start; }
.pm-task-panel { min-width: 0; min-height: 0; height: 320px; display: flex; flex-direction: column; gap: 12px; padding: 14px; border: 1px solid var(--pm-border-soft, #e6edf6); border-radius: 14px; background: var(--pm-card-hover, #f8fafc); overflow: hidden; }
.pm-task-panel .pm-section-bar { margin-bottom: 0; }
.pm-dependency-list, .pm-checklist-list { min-height: 0; overflow-y: auto; display: grid; align-content: start; gap: 8px; padding-right: 3px; scrollbar-width: thin; scrollbar-color: var(--pm-border, #262626) transparent; }
.pm-dependency-list > span, .pm-checklist-list label { min-width: 0; display: flex; align-items: center; gap: 8px; padding: 9px 10px; border: 1px solid var(--pm-border-soft, #e6edf6); border-radius: 10px; background: var(--pm-card, #fff); color: var(--pm-foreground, #0f172a); font-size: 13px; }
.pm-dependency-list > span { overflow-wrap: anywhere; }
.pm-dependency-list button, .pm-checklist-list button { width: 24px; height: 24px; margin-left: auto; border: 1px solid var(--pm-border-soft, #e6edf6); border-radius: 7px; background: transparent; color: var(--pm-muted, #64748b); display: grid; place-items: center; cursor: pointer; }
.pm-checklist-list label span { min-width: 0; flex: 1; overflow-wrap: anywhere; }
.pm-checklist-list label:has(input:checked) span { color: var(--pm-muted, #64748b); text-decoration: line-through; }
.pm-task-comment-form { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 10px; }
.pm-task-comment-form input, .pm-task-upload input:not([type="checkbox"]):not([type="file"]) { min-width: 0; min-height: 40px; border: 1px solid var(--pm-border-soft, #dbe3ef); border-radius: 10px; background: var(--pm-input, #fff); color: var(--pm-foreground, #0f172a); padding: 0 12px; font: inherit; }
.pm-task-comment-list, .pm-task-file-list { min-height: 0; overflow-y: auto; display: grid; align-content: start; gap: 10px; padding-right: 3px; scrollbar-width: thin; scrollbar-color: var(--pm-border, #262626) transparent; }
.pm-task-comment-list article { display: grid; grid-template-columns: auto minmax(0, 1fr); gap: 10px; align-items: start; }
.pm-task-comment-list article > div, .pm-task-file-list article > div { min-width: 0; display: grid; gap: 3px; }
.pm-task-comment-list strong, .pm-task-file-list strong { min-width: 0; overflow-wrap: anywhere; font-size: 13px; line-height: 1.35; }
.pm-task-comment-list small, .pm-task-file-list small { color: var(--pm-muted, #64748b); font-size: 12px; line-height: 1.35; }
.pm-task-upload { display: grid; grid-template-columns: auto minmax(0, 1fr) auto; gap: 10px; align-items: center; }
.pm-upload-button { min-height: 40px; display: inline-flex; align-items: center; justify-content: center; gap: 8px; border: 1px solid var(--pm-border-soft, #dbe3ef); border-radius: 10px; background: var(--pm-card, #fff); color: var(--pm-foreground, #0f172a); padding: 0 12px; font-size: 13px; font-weight: 800; cursor: pointer; white-space: nowrap; }
.pm-upload-button input { position: absolute; width: 1px; height: 1px; opacity: 0; pointer-events: none; }
.pm-evidence-strip { display: flex; gap: 8px; overflow-x: auto; padding-bottom: 2px; }
.pm-evidence-strip span { width: 74px; height: 54px; flex: 0 0 auto; border: 1px solid var(--pm-border-soft, #e6edf6); border-radius: 10px; background: var(--pm-card, #fff); }
.pm-evidence-strip span { display: grid; place-items: center; gap: 2px; color: var(--pm-muted, #64748b); font-size: 11px; }
.pm-evidence-strip .pm-evidence-thumb { background-size: cover; background-position: center; }
.pm-task-file-list article { min-width: 0; display: grid; grid-template-columns: 28px minmax(0, 1fr) auto auto auto; gap: 10px; align-items: center; padding: 10px; border: 1px solid var(--pm-border-soft, #e6edf6); border-radius: 12px; background: var(--pm-card, #fff); }
.pm-task-file-list article > svg { width: 28px; height: 28px; padding: 6px; border: 1px solid var(--pm-border-soft, #e6edf6); border-radius: 8px; color: var(--pm-foreground, #0f172a); }
.pm-task-file-list em { color: var(--pm-muted, #64748b); font-size: 12px; font-style: normal; overflow-wrap: anywhere; }
.pm-resource-grid, .pm-doc-grid, .pm-budget-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 16px; }
.pm-resource-grid article, .pm-doc-grid article { border: 1px solid #e6edf6; border-radius: 14px; padding: 16px; display: grid; gap: 8px; }
.pm-budget-meter { display: grid; grid-template-columns: repeat(auto-fit, minmax(118px, 1fr)); gap: 14px 18px; align-items: start; }
.pm-budget-meter span { min-width: 0; display: grid; gap: 5px; }
.pm-budget-meter small { font-size: 12px; color: #475569; font-weight: 850; text-transform: none; }
.pm-budget-meter strong { display: block; color: #0f172a; font-size: 15px; line-height: 1.18; font-weight: 900; white-space: nowrap; }
.pm-budget-meter .pm-progress { grid-column: 1 / -1; width: 100%; }
.pm-budget-page { min-width: 0; display: grid; gap: 18px; }
.pm-budget-tiles { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(200px, 100%), 1fr)); gap: 14px; }
.pm-budget-tile { min-width: 0; border: 1px solid var(--pm-border, #e5e7eb); border-radius: 12px; background: var(--pm-card, #fff); padding: 16px 18px; display: grid; gap: 6px; }
.pm-budget-tile small { color: var(--pm-muted, #64748b); font-size: 12px; font-weight: 700; }
.pm-budget-tile strong { color: var(--pm-foreground, #0f172a); font-size: 22px; line-height: 1.1; font-weight: 800; white-space: nowrap; }
.pm-budget-tile strong.negative { color: #ef4444; }
.pm-budget-tile span { color: var(--pm-muted, #64748b); font-size: 12px; }
.pm-budget-summary-card { display: grid; gap: 16px; }
.pm-budget-bar { display: flex; width: 100%; height: 12px; border-radius: 999px; background: var(--pm-card-hover, #eef2f7); overflow: hidden; }
.pm-budget-bar span { height: 100%; }
.pm-budget-bar span.is-spent { background: var(--pm-foreground, #0f172a); }
.pm-budget-bar span.is-committed { background: var(--pm-muted, #94a3b8); }
.pm-budget-bar-legend { display: flex; flex-wrap: wrap; gap: 16px; color: var(--pm-muted, #64748b); font-size: 12px; font-weight: 600; }
.pm-budget-bar-legend span { display: inline-flex; align-items: center; gap: 7px; }
.pm-budget-bar-legend i { width: 10px; height: 10px; border-radius: 3px; flex: 0 0 auto; }
.pm-budget-bar-legend i.is-spent { background: var(--pm-foreground, #0f172a); }
.pm-budget-bar-legend i.is-committed { background: var(--pm-muted, #94a3b8); }
.pm-budget-bar-legend i.is-remaining { background: var(--pm-card-hover, #e5e7eb); border: 1px solid var(--pm-border, #d4d4d8); }
.pm-budget-table th.pm-num, .pm-budget-table td.pm-num { text-align: right; white-space: nowrap; }
.pm-budget-table td.negative, .pm-budget-table strong.negative { color: #ef4444 !important; }
.pm-budget-table tr.pm-budget-subtotal td { border-top: 1px solid var(--pm-border, #e5e7eb); background: var(--pm-card-hover, #f8fafc); font-weight: 800; color: var(--pm-foreground, #0f172a); }
.pm-budget-totals { display: grid; justify-content: end; gap: 10px; margin-top: 4px; }
.pm-budget-totals > div { display: grid; grid-template-columns: minmax(160px, auto) minmax(150px, auto); gap: 24px; align-items: center; }
.pm-budget-totals span { color: var(--pm-muted, #64748b); font-size: 13px; font-weight: 600; }
.pm-budget-totals strong { text-align: right; color: var(--pm-foreground, #0f172a); font-size: 14px; font-weight: 700; white-space: nowrap; }
.pm-budget-totals .pm-budget-grand { border-top: 1px solid var(--pm-border, #e5e7eb); padding-top: 10px; }
.pm-budget-totals .pm-budget-grand span { color: var(--pm-foreground, #0f172a); font-weight: 800; }
.pm-budget-totals .pm-budget-grand strong { font-size: 18px; font-weight: 900; }
.pm-budget-totals .pm-budget-grand strong.negative { color: #ef4444; }
.pm-actions button { min-height: 52px; border: 0; background: #fff; display: grid; grid-template-columns: 34px 1fr auto; align-items: center; gap: 10px; text-align: left; font-weight: 900; cursor: pointer; }
.pm-actions span { width: 34px; height: 34px; border-radius: 10px; background: #dcfce7; color: #16a34a; display: grid; place-items: center; }
.pm-form { display: grid; grid-template-columns: repeat(5, 1fr); gap: 14px; }
.pm-field { display: grid; gap: 7px; }
.pm-field span { font-size: 12px; color: #23335f; font-weight: 900; }
.pm-field .pm-required { margin-left: 3px; color: #ef4444; font-style: normal; font-weight: 900; }
.pm-field input, .pm-field select, .pm-field textarea { min-height: 42px; border: 1px solid #dbe3ef; border-radius: 10px; padding: 0 12px; font: inherit; }
.pm-field textarea { padding: 10px 12px; resize: vertical; }
.pm-wide { grid-column: span 3; }
.pm-form-actions { grid-column: 1 / -1; display: flex; justify-content: flex-end; }
.pm-date-panel { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)) auto; gap: 14px; align-items: end; }
.pm-date-presets { grid-column: 1 / -1; display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 10px; }
.pm-date-presets button { min-height: 42px; border: 1px solid #dbe3ef; border-radius: 10px; background: #f8fafc; color: #0f172a; font: inherit; font-size: 12px; font-weight: 900; cursor: pointer; }
.pm-date-presets button:hover { border-color: #16a34a; background: #ecfdf5; color: #047857; }
.pm-filter-panel { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 14px; align-items: end; }
.pm-filter-panel .pm-field, .pm-filter-panel .pm-form-actions { min-width: 0; }
.pm-filter-panel .pm-form-actions { grid-column: auto; align-self: end; }
.pm-filter-panel .pm-form-actions .pm-control { width: 100%; justify-content: center; }
.pm-alert-panel { position: absolute; top: 58px; right: 160px; z-index: 95; width: min(360px, calc(100vw - 32px)); display: grid; gap: 10px; padding: 14px; }
.pm-alert-head { display: flex; align-items: center; justify-content: space-between; gap: 10px; padding-bottom: 8px; border-bottom: 1px solid #e6edf6; }
.pm-alert-head strong { font-size: 14px; font-weight: 950; }
.pm-alert-head button { width: 30px; height: 30px; border: 1px solid #dbe3ef; border-radius: 8px; background: #fff; display: grid; place-items: center; cursor: pointer; }
.pm-alert-panel > button { border: 0; background: #fff; display: grid; grid-template-columns: 34px 1fr; gap: 10px; align-items: start; text-align: left; padding: 10px; border-radius: 10px; cursor: pointer; }
.pm-alert-panel > button:hover { background: #f8fafc; }
.pm-alert-panel > button > svg { width: 34px; height: 34px; padding: 8px; border-radius: 10px; background: #ecfdf5; color: #16a34a; }
.pm-alert-panel > button span, .pm-alert-empty { display: grid; gap: 3px; }
.pm-alert-panel > button strong { font-size: 13px; font-weight: 950; color: #0f172a; }
.pm-alert-panel > button small, .pm-alert-empty small { color: #64748b; font-size: 12px; line-height: 1.35; }
.pm-alert-empty { min-height: 96px; align-content: center; justify-items: center; text-align: center; border: 1px dashed #dbe3ef; border-radius: 12px; padding: 16px; }
.pm-alert-empty strong { color: #0f172a; font-size: 13px; }
.pm-modal-backdrop { position: fixed; inset: 0; z-index: 1300; background: rgba(15, 23, 42, .62); display: grid; place-items: center; padding: 20px; }
.pm-modal { position: relative; z-index: 1; isolation: isolate; width: min(860px, calc(100vw - 40px)); max-height: min(820px, calc(100dvh - 40px)); overflow: hidden; padding: 0 !important; display: grid; grid-template-rows: auto minmax(0, 1fr); background: var(--pm-card, #fff) !important; background-image: none !important; }
.pm-modal-head { min-width: 0; display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; padding: 18px 20px; border-bottom: 1px solid var(--pm-border-soft, #e6edf6); background: var(--pm-card, #fff); }
.pm-modal-head h2 { margin: 0; color: var(--pm-foreground, #0f172a); font-size: 19px; line-height: 1.2; font-weight: 700; }
.pm-modal-head p { margin: 5px 0 0; color: var(--pm-muted, #64748b); font-size: 13px; line-height: 1.45; }
.pm-modal-head button { flex: 0 0 auto; min-height: 32px; border: 1px solid var(--pm-border-soft, #e6edf6); border-radius: 999px; background: var(--pm-card-hover, #f8fafc); color: var(--pm-foreground, #0f172a); padding: 0 12px; font-size: 12px; font-weight: 700; cursor: pointer; }
.pm-modal > .pm-form { min-height: 0; overflow: auto; padding: 20px; }
.pm-modal-form { grid-template-columns: repeat(2, minmax(0, 1fr)); }
.pm-task-editor-modal { width: min(1040px, calc(100vw - 48px)); max-height: min(860px, calc(100dvh - 48px)); }
.pm-task-editor-body { min-height: 0; overflow: auto; display: grid; gap: 18px; padding: 20px; }
.pm-task-modal-form { grid-template-columns: minmax(0, 1.28fr) minmax(320px, .82fr); gap: 18px; align-items: start; }
.pm-task-form-section { min-width: 0; display: grid; gap: 14px; padding: 18px; border: 1px solid var(--pm-border-soft, #e6edf6); border-radius: 12px; background: color-mix(in srgb, var(--pm-card-hover, #f8fafc) 72%, var(--pm-card, #fff)); }
.pm-task-form-section h3 { margin: 0; color: var(--pm-foreground, #0f172a); font-size: 16px; line-height: 1.2; font-weight: 700; }
.pm-task-form-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px 16px; }
.pm-task-side-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px 12px; }
.pm-task-side-grid .pm-field:first-child { grid-column: 1 / -1; }
.pm-task-form-grid .pm-field,
.pm-task-side-grid .pm-field { min-width: 0; }
.pm-span-2 { grid-column: 1 / -1; }
.pm-task-modal-form .pm-field input,
.pm-task-modal-form .pm-field select,
.pm-task-modal-form .pm-field textarea { width: 100%; }
.pm-task-modal-form .pm-field textarea { min-height: 96px; line-height: 1.45; }
.pm-task-modal-form > .pm-form-actions { grid-column: 1 / -1; }
.pm-task-modal-form .pm-form-actions { padding-top: 2px; }
.pm-task-modal-form .pm-form-actions .pm-primary { min-width: 132px; }
.pm-drawer-backdrop { position: fixed; inset: 0; z-index: 1250; background: rgba(15, 23, 42, .58); display: flex; justify-content: flex-end; }
.pm-drawer-close { width: 38px; height: 38px; flex: 0 0 auto; border: 1px solid #dbe3ef; border-radius: 12px; background: #fff; color: #0f172a; display: grid; place-items: center; cursor: pointer; }
.pm-drawer-close:hover { border-color: #94a3b8; }
.pm-create-page {
  min-width: 0;
  display: grid;
  gap: 16px;
}
.pm-create-crumbs {
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 9px;
  color: var(--pm-muted);
  font-size: 13px;
}
.pm-create-crumbs button {
  border: 0 !important;
  background: transparent !important;
  color: var(--pm-muted) !important;
  padding: 0 !important;
  font: inherit;
  cursor: pointer;
}
.pm-create-crumbs span {
  color: var(--pm-foreground);
}
.pm-create-title-row h1 {
  margin: 0;
  color: var(--pm-foreground);
  font-size: clamp(26px, 2.6vw, 34px);
  line-height: 1.1;
  font-weight: 700;
}
.pm-create-title-row p {
  margin: 7px 0 0;
  color: var(--pm-muted);
  font-size: 15px;
}
.pm-create-layout {
  min-width: 0;
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(320px, 410px);
  gap: 12px;
  align-items: start;
}
.pm-create-main,
.pm-create-side {
  min-width: 0;
  display: grid;
  gap: 8px;
}
.pm-create-section,
.pm-create-side-box {
  min-width: 0;
  border: 1px solid var(--pm-border);
  border-radius: 8px;
  background: var(--pm-card);
  background-image: var(--pm-card-gradient);
  padding: 18px;
  display: grid;
  gap: 16px;
  box-shadow: none;
}
.pm-create-section h3,
.pm-create-side-box h3 {
  margin: 0;
  color: var(--pm-foreground);
  font-size: 16px;
  line-height: 1.2;
  font-weight: 700;
}
.pm-create-section-head {
  min-width: 0;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}
.pm-create-section-head p {
  margin: 6px 0 0;
  color: var(--pm-muted);
  font-size: 12px;
  line-height: 1.45;
}
.pm-create-basic-grid {
  min-width: 0;
  display: grid;
  grid-template-columns: 220px minmax(0, 1fr);
  gap: 20px;
  align-items: start;
}
.pm-create-photo-field {
  min-width: 0;
  display: grid;
  gap: 8px;
}
.pm-create-photo-field > span,
.pm-create-side-box > small,
.pm-create-side-box > p,
.pm-create-note,
.pm-create-section .pm-field small {
  color: var(--pm-muted);
  font-size: 12px;
  line-height: 1.4;
}
.pm-create-upload {
  min-height: 212px;
  border: 1px dashed var(--pm-border);
  border-radius: 8px;
  background: color-mix(in srgb, var(--pm-card) 72%, var(--pm-background));
  color: var(--pm-muted);
  display: grid;
  place-items: center;
  align-content: center;
  gap: 10px;
  text-align: center;
  padding: 20px;
  cursor: pointer;
  overflow: hidden;
}
.pm-create-upload strong,
.pm-create-upload em {
  font-size: 13px;
  font-style: normal;
  font-weight: 400;
}
.pm-create-upload b {
  min-height: 36px;
  display: inline-flex;
  align-items: center;
  border: 1px solid var(--pm-border);
  border-radius: 8px;
  color: var(--pm-foreground);
  padding: 0 15px;
  font-size: 13px;
}
.pm-create-upload.has-image {
  padding: 0;
}
.pm-create-upload-image {
  width: 100%;
  height: 100%;
  min-height: 212px;
  display: block;
  background-size: cover;
  background-position: center;
}
.pm-create-file-input {
  position: absolute;
  width: 1px;
  height: 1px;
  opacity: 0;
  pointer-events: none;
}
.pm-create-basic-fields,
.pm-create-location-grid,
.pm-create-schedule-grid,
.pm-create-budget-grid {
  min-width: 0;
  display: grid;
  gap: 14px;
}
.pm-create-basic-fields {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}
.pm-create-location-grid,
.pm-create-budget-grid {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}
.pm-create-schedule-grid {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}
.pm-create-span-2 {
  grid-column: span 2;
}
.pm-create-span-3 {
  grid-column: 1 / -1;
}
.pm-create-page .pm-field {
  min-width: 0;
}
.pm-create-page .pm-field input,
.pm-create-page .pm-field select,
.pm-create-page .pm-field textarea,
.pm-create-team-add select {
  width: 100%;
  min-height: 40px;
  border: 1px solid var(--pm-border);
  border-radius: 8px;
  background: var(--pm-input);
  color: var(--pm-foreground);
  padding: 0 12px;
  font: inherit;
  font-size: 13px;
}
.pm-create-page .pm-field textarea {
  min-height: 90px;
  padding: 12px;
  resize: vertical;
}
.pm-create-note {
  margin: -2px 0 0;
  display: inline-flex;
  align-items: center;
  gap: 8px;
}
.pm-create-side {
  position: sticky;
  top: 16px;
}
.pm-create-side-title {
  display: flex;
  align-items: center;
  gap: 10px;
}
.pm-create-side-title > svg {
  width: 32px;
  height: 32px;
  border: 1px solid var(--pm-border);
  border-radius: 8px;
  padding: 7px;
  color: var(--pm-foreground);
  background: var(--pm-card-hover);
}
.pm-create-total {
  color: var(--pm-foreground);
  font-size: 22px;
  line-height: 1.1;
}
.pm-create-budget-list {
  display: grid;
  gap: 0;
  border-top: 1px solid var(--pm-border);
  border-bottom: 1px solid var(--pm-border);
}
.pm-create-budget-list p {
  margin: 0;
  min-width: 0;
  display: grid;
  grid-template-columns: 12px minmax(0, 1fr) auto;
  gap: 10px;
  align-items: center;
  min-height: 36px;
  color: var(--pm-foreground);
  font-size: 13px;
}
.pm-create-budget-list i {
  width: 8px;
  height: 8px;
  border-radius: 999px;
  background: currentColor;
}
.pm-create-budget-list strong {
  font-size: 12px;
  font-weight: 600;
}
.pm-create-donut-row {
  display: flex;
  align-items: center;
  gap: 24px;
  padding-top: 4px;
  color: var(--pm-foreground);
  font-size: 16px;
  line-height: 1.45;
}
.pm-create-donut {
  width: 86px;
  height: 86px;
  border-radius: 999px;
  display: grid;
  place-items: center;
  position: relative;
}
.pm-create-donut::after {
  content: "";
  position: absolute;
  inset: 10px;
  border-radius: inherit;
  background: var(--pm-card);
}
.pm-create-donut b {
  position: relative;
  z-index: 1;
  color: var(--pm-foreground);
  font-size: 18px;
}
.pm-create-team-add {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 10px;
}
.pm-create-team-add .pm-primary {
  justify-self: start;
  min-height: 34px;
  background: var(--pm-foreground);
  color: var(--pm-background);
  border-color: var(--pm-foreground);
}
.pm-create-team-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.pm-create-team-list span {
  min-height: 30px;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  border: 1px solid var(--pm-border);
  border-radius: 999px;
  background: var(--pm-card-hover);
  color: var(--pm-foreground);
  padding: 0 8px 0 11px;
  font-size: 12px;
}
.pm-create-team-list button {
  border: 0 !important;
  background: transparent !important;
  color: inherit !important;
  padding: 0 !important;
  display: grid;
  place-items: center;
  cursor: pointer;
}
.pm-create-check {
  min-height: 26px;
  display: inline-flex;
  align-items: center;
  gap: 9px;
  color: var(--pm-foreground);
  font-size: 13px;
  cursor: pointer;
}
.pm-create-check input {
  width: 16px;
  height: 16px;
  accent-color: var(--pm-foreground);
}
.pm-create-actions {
  display: grid;
  grid-template-columns: 1fr 1.6fr;
  gap: 12px;
}
.pm-create-actions .pm-control,
.pm-create-actions .pm-primary {
  width: 100%;
  justify-content: center;
}
.pm-task-create-page {
  padding-bottom: 18px;
}
.pm-task-name-field input {
  min-height: 46px !important;
  font-size: 15px !important;
  font-weight: 600 !important;
}
.pm-task-id-field {
  align-content: start;
}
.pm-task-id-field input {
  color: var(--pm-muted) !important;
}
.pm-task-id-field small {
  margin-top: 2px;
}
.pm-task-detail-grid,
.pm-task-assignment-grid,
.pm-task-schedule-grid,
.pm-task-time-grid {
  min-width: 0;
  display: grid;
  gap: 14px 16px;
}
.pm-task-detail-grid {
  grid-template-columns: minmax(0, 1fr) minmax(280px, .58fr);
  align-items: start;
}
.pm-task-assignment-grid,
.pm-task-schedule-grid {
  grid-template-columns: repeat(4, minmax(0, 1fr));
}
.pm-task-time-grid {
  grid-template-columns: minmax(0, 1fr) minmax(160px, .72fr) minmax(0, 1.1fr) minmax(94px, .42fr) minmax(0, .78fr);
  align-items: end;
}
.pm-task-advanced-section {
  padding: 0;
  gap: 0;
}
.pm-task-advanced-toggle {
  min-width: 0;
  width: 100%;
  border: 0 !important;
  background: transparent !important;
  color: var(--pm-foreground) !important;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 16px 18px;
  text-align: left;
  cursor: pointer;
  font: inherit;
}
.pm-task-advanced-toggle span {
  min-width: 0;
  display: grid;
  gap: 4px;
}
.pm-task-advanced-toggle strong {
  font-size: 15px;
  line-height: 1.2;
}
.pm-task-advanced-toggle small {
  color: var(--pm-muted);
  font-size: 12px;
  line-height: 1.35;
}
.pm-task-advanced-toggle svg {
  flex: 0 0 auto;
  color: var(--pm-muted);
  transition: transform .16s ease;
}
.pm-task-advanced-toggle[aria-expanded="true"] svg {
  transform: rotate(180deg);
}
.pm-task-advanced-panel {
  display: grid;
  gap: 18px;
  border-top: 1px solid var(--pm-border);
  padding: 18px;
}
.pm-task-advanced-group {
  min-width: 0;
  display: grid;
  gap: 12px;
}
.pm-task-advanced-group h4 {
  margin: 0;
  color: var(--pm-foreground);
  font-size: 13px;
  line-height: 1.2;
  font-weight: 700;
}
.pm-task-assignment-grid.compact {
  grid-template-columns: minmax(0, .5fr);
}
.pm-task-after-create div {
  display: grid;
  gap: 9px;
}
.pm-task-after-create span {
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--pm-foreground);
  font-size: 12px;
}
.pm-task-description-editor {
  min-width: 0;
  border: 1px solid var(--pm-border);
  border-radius: 8px;
  background: var(--pm-input);
  overflow: hidden;
  display: grid;
}
.pm-task-editor-toolbar {
  min-width: 0;
  min-height: 38px;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 4px;
  padding: 0 8px;
  border-bottom: 1px solid var(--pm-border);
  color: var(--pm-foreground);
}
.pm-task-editor-toolbar button {
  min-height: 30px;
  border: 0 !important;
  border-radius: 6px;
  background: transparent !important;
  color: var(--pm-foreground) !important;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 0 8px;
  font: inherit;
  font-size: 13px;
  cursor: pointer;
}
.pm-task-editor-toolbar button:hover,
.pm-task-editor-toolbar button:focus-visible {
  background: var(--pm-card-hover) !important;
}
.pm-task-description-input {
  min-height: 136px !important;
  border: 0 !important;
  border-radius: 0 !important;
  background: transparent !important;
  color: var(--pm-foreground);
  outline: none;
  overflow: auto;
  padding: 10px 12px;
  line-height: 1.55;
  resize: vertical;
  font: inherit;
}
.pm-task-description-input:empty::before {
  content: attr(data-placeholder);
  color: var(--pm-muted);
  pointer-events: none;
}
.pm-task-description-input p,
.pm-task-description-input h2,
.pm-task-description-input h3,
.pm-task-description-input blockquote,
.pm-task-description-input ul,
.pm-task-description-input ol,
.pm-task-description-rich p,
.pm-task-description-rich h2,
.pm-task-description-rich h3,
.pm-task-description-rich blockquote,
.pm-task-description-rich ul,
.pm-task-description-rich ol {
  margin: 0 0 8px;
}
.pm-task-description-input h2,
.pm-task-description-rich h2 {
  font-size: 18px;
  line-height: 1.3;
}
.pm-task-description-input h3,
.pm-task-description-rich h3 {
  font-size: 15px;
  line-height: 1.35;
}
.pm-task-description-input blockquote,
.pm-task-description-rich blockquote {
  border-left: 3px solid var(--pm-border-strong);
  padding-left: 10px;
  color: var(--pm-muted);
}
.pm-task-description-input pre,
.pm-task-description-rich pre {
  margin: 0 0 8px;
  border-radius: 6px;
  background: var(--pm-card-hover);
  padding: 9px 10px;
  overflow: auto;
}
.pm-task-description-input ul,
.pm-task-description-input ol,
.pm-task-description-rich ul,
.pm-task-description-rich ol {
  padding-left: 20px;
}
.pm-task-description-rich {
  color: var(--pm-foreground);
  font-size: 13px;
  line-height: 1.5;
  white-space: pre-wrap;
}
.pm-task-description-rich.compact {
  max-height: 78px;
  overflow: hidden;
}
.pm-task-description-rich.compact p,
.pm-task-description-rich.compact ul,
.pm-task-description-rich.compact ol {
  margin-bottom: 6px;
}
.pm-task-description-editor small {
  color: var(--pm-muted);
}
.pm-task-description-footer {
  min-height: 34px;
  border-top: 1px solid var(--pm-border);
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 10px;
  padding: 0 10px;
  color: var(--pm-muted);
  font-size: 12px;
  font-weight: 600;
}
.pm-task-description-editor > .pm-task-description-rich {
  border-top: 1px solid var(--pm-border);
  background: color-mix(in srgb, var(--pm-card) 80%, transparent);
  padding: 10px 12px 4px;
  min-height: 48px;
}
.pm-input-with-suffix,
.pm-input-with-prefix {
  min-width: 0;
  min-height: 40px;
  border: 1px solid var(--pm-border);
  border-radius: 8px;
  background: var(--pm-input);
  display: grid;
  align-items: center;
  overflow: hidden;
}
.pm-input-with-suffix {
  grid-template-columns: minmax(0, 1fr) 48px;
}
.pm-input-with-prefix {
  grid-template-columns: 54px minmax(0, 1fr);
}
.pm-input-with-suffix input,
.pm-input-with-prefix input {
  min-height: 38px !important;
  border: 0 !important;
  background: transparent !important;
  border-radius: 0 !important;
}
.pm-input-with-suffix b,
.pm-input-with-prefix b {
  height: 100%;
  display: grid;
  place-items: center;
  border-color: var(--pm-border);
  color: var(--pm-muted);
  font-size: 12px;
  font-weight: 700;
}
.pm-input-with-suffix b {
  border-left: 1px solid var(--pm-border);
}
.pm-input-with-prefix b {
  border-right: 1px solid var(--pm-border);
}
.pm-task-toggle-field {
  align-self: end;
}
.pm-create-toggle {
  width: 44px;
  height: 26px;
  border: 1px solid var(--pm-border) !important;
  border-radius: 999px;
  background: #e5e7eb !important;
  padding: 2px !important;
  display: flex;
  align-items: center;
  cursor: pointer;
}
.pm-create-toggle i {
  width: 20px;
  height: 20px;
  border-radius: 999px;
  background: var(--pm-foreground);
  transition: transform .16s ease;
}
.pm-create-toggle.active {
  background: var(--pm-foreground) !important;
}
.pm-create-toggle.active i {
  background: var(--pm-background);
  transform: translateX(18px);
}
.pm-task-follower-list {
  margin-top: -2px;
}
.pm-task-progress-summary {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: 22px;
  align-items: center;
}
.pm-task-progress-summary p {
  margin: 0;
  color: var(--pm-foreground);
  font-size: 14px;
  line-height: 1.5;
}
.pm-task-upload-zone {
  min-height: 150px;
  border: 1px dashed var(--pm-border);
  border-radius: 8px;
  background: color-mix(in srgb, var(--pm-card) 72%, var(--pm-background));
  display: grid;
  place-items: center;
  align-content: center;
  gap: 10px;
  color: var(--pm-muted);
  text-align: center;
  cursor: pointer;
  padding: 18px;
}
.pm-task-upload-zone b {
  min-height: 34px;
  display: inline-flex;
  align-items: center;
  border: 1px solid var(--pm-border);
  border-radius: 8px;
  color: var(--pm-foreground);
  padding: 0 14px;
  font-size: 13px;
}
.pm-task-attachment-list,
.pm-task-checklist-list {
  min-width: 0;
  display: grid;
  gap: 8px;
}
.pm-task-attachment-list article,
.pm-task-checklist-list span {
  min-width: 0;
  min-height: 40px;
  border: 1px solid var(--pm-border);
  border-radius: 8px;
  background: var(--pm-card-hover);
  color: var(--pm-foreground);
  display: grid;
  align-items: center;
  gap: 9px;
  padding: 8px 10px;
}
.pm-task-attachment-list article {
  grid-template-columns: auto minmax(0, 1fr) auto;
}
.pm-task-attachment-list article span {
  min-width: 0;
  display: grid;
  gap: 2px;
}
.pm-task-attachment-list article strong,
.pm-task-checklist-list span {
  font-size: 13px;
  line-height: 1.3;
}
.pm-task-attachment-list article small {
  color: var(--pm-muted);
  font-size: 11px;
}
.pm-task-attachment-list button,
.pm-task-checklist-list button {
  border: 0 !important;
  background: transparent !important;
  color: var(--pm-muted) !important;
  display: grid;
  place-items: center;
  cursor: pointer;
}
.pm-task-checklist-add {
  min-width: 0;
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 10px;
}
.pm-task-checklist-add input {
  min-width: 0;
  min-height: 40px;
  border: 1px solid var(--pm-border);
  border-radius: 8px;
  background: var(--pm-input);
  color: var(--pm-foreground);
  padding: 0 12px;
  font: inherit;
  font-size: 13px;
}
.pm-task-checklist-add .pm-primary {
  min-height: 40px;
  background: var(--pm-foreground);
  color: var(--pm-background);
  border-color: var(--pm-foreground);
}
.pm-task-checklist-list span {
  grid-template-columns: auto minmax(0, 1fr) auto;
}
.pm-check { min-height: 42px; display: flex; align-items: center; gap: 8px; font-weight: 900; color: #23335f; }
.pm-empty { min-height: 160px; border: 1px dashed #dbe3ef; border-radius: 12px; display: grid; place-items: center; text-align: center; align-content: center; gap: 8px; color: #64748b; padding: 20px; }
.pm-empty strong { color: #0f172a; }
.pm-empty p { margin: 0; max-width: 360px; }
.pm-detail { display: grid; gap: 18px; }
.pm-detail-head { display: grid; grid-template-columns: auto 1fr auto; align-items: center; gap: 16px; }
.pm-detail-head h2 { margin: 0; }
.pm-detail-head p { margin: 5px 0 0; color: #23335f; }
.pm-detail-head > button:first-child { border: 1px solid #dbe3ef; border-radius: 8px; background: #fff; min-height: 38px; padding: 0 12px; font-weight: 900; cursor: pointer; }
.pm-detail-actions { display: flex; justify-content: flex-end; align-items: center; gap: 10px; flex-wrap: wrap; }
.pm-detail-status { width: 150px; }
.pm-detail-overview { display: grid; grid-template-columns: minmax(0, 1.2fr) minmax(280px, .8fr); gap: 16px; align-items: start; }
.pm-project-hero { grid-row: span 2; display: grid; gap: 18px; }
.pm-project-hero-head { display: flex; justify-content: space-between; gap: 14px; align-items: start; }
.pm-project-hero-head h3 { margin: 4px 0 6px; font-size: 24px; line-height: 1.16; }
.pm-project-hero-head p { margin: 0; color: var(--pm-muted, #64748b); line-height: 1.5; }
.pm-overline { color: var(--pm-muted, #64748b); font-size: 11px; font-weight: 900; letter-spacing: .06em; text-transform: uppercase; }
.pm-project-progress { display: grid; gap: 10px; }
.pm-project-progress > div { display: flex; justify-content: space-between; gap: 12px; align-items: end; }
.pm-project-progress strong { font-size: 24px; line-height: 1; }
.pm-project-progress span { color: var(--pm-muted, #64748b); font-size: 12px; }
.pm-project-progress .pm-progress { width: 100%; }
.pm-project-facts { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 10px; }
.pm-project-facts span { min-width: 0; display: grid; gap: 4px; padding: 11px 12px; border: 1px solid var(--pm-border-soft, #e6edf6); border-radius: 12px; background: var(--pm-card-hover, #f8fafc); }
.pm-project-facts small { color: var(--pm-muted, #64748b); font-size: 11px; font-weight: 800; }
.pm-project-facts strong { min-width: 0; color: var(--pm-foreground, #0f172a); font-size: 13px; line-height: 1.25; overflow-wrap: anywhere; }
.pm-settings-page {
  display: grid;
  gap: 16px;
}
.pm-settings-header {
  position: sticky;
  top: 0;
  z-index: 30;
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 18px;
  border: 1px solid var(--pm-border);
  border-radius: 8px;
  background: var(--pm-card);
  padding: 18px 20px;
  box-shadow: 0 6px 18px rgba(15, 23, 42, .06);
}
.pm-settings-header > div:first-child {
  min-width: 0;
  display: grid;
  gap: 5px;
}
.pm-settings-header span {
  color: var(--pm-muted);
  font-size: 12px;
  font-weight: 800;
}
.pm-settings-header h2 {
  margin: 0;
  color: var(--pm-foreground);
  font-size: 24px;
  line-height: 1.16;
}
.pm-settings-header p,
.pm-settings-section-head p,
.pm-settings-photo-card p {
  margin: 0;
  color: var(--pm-muted);
  font-size: 13px;
  line-height: 1.45;
}
.pm-settings-actions,
.pm-settings-danger-actions {
  display: inline-flex;
  align-items: center;
  justify-content: flex-end;
  gap: 10px;
  flex-wrap: wrap;
}
.pm-settings-saved {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: #16a34a;
  font-size: 13px;
  font-weight: 700;
}
.pm-settings-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(320px, .34fr);
  gap: 16px;
  align-items: start;
}
.pm-settings-main,
.pm-settings-side {
  min-width: 0;
  display: grid;
  gap: 16px;
}
.pm-settings-side {
  position: sticky;
  top: 88px;
}
.pm-settings-card {
  min-width: 0;
  display: grid;
  gap: 16px;
  border: 1px solid var(--pm-border);
  border-radius: 8px;
  background: var(--pm-card);
  padding: 18px;
}
.pm-settings-section-head {
  min-width: 0;
  display: flex;
  align-items: start;
  justify-content: space-between;
  gap: 14px;
}
.pm-settings-section-head div {
  min-width: 0;
  display: grid;
  gap: 5px;
}
.pm-settings-section-head h3 {
  margin: 0;
  color: var(--pm-foreground);
  font-size: 16px;
  line-height: 1.2;
}
.pm-settings-section-head > span {
  flex: 0 0 auto;
  border: 1px solid var(--pm-border);
  border-radius: 999px;
  color: var(--pm-muted);
  padding: 5px 10px;
  font-size: 12px;
  font-weight: 800;
}
.pm-settings-field-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 14px;
}
.pm-settings-span-2 {
  grid-column: span 2;
}
.pm-settings-page .pm-field input,
.pm-settings-page .pm-field select,
.pm-settings-page .pm-field textarea {
  min-height: 38px;
  font-size: 13px;
}
.pm-settings-page .pm-field span {
  font-size: 12px;
}
.pm-settings-photo-drop {
  position: relative;
  width: 100%;
  aspect-ratio: 16 / 9;
  border: 1px dashed var(--pm-border);
  border-radius: 8px;
  display: grid;
  place-items: center;
  overflow: hidden;
  background: color-mix(in srgb, var(--pm-card) 72%, var(--pm-background));
  color: var(--pm-muted);
  cursor: pointer;
}
.pm-settings-photo-drop.has-image {
  border-style: solid;
}
.pm-settings-photo-drop > span {
  position: absolute;
  inset: 0;
  background-size: cover;
  background-position: center;
}
.pm-settings-photo-drop > i {
  width: 58px;
  height: 58px;
  border: 1px solid var(--pm-border);
  border-radius: 999px;
  display: grid;
  place-items: center;
  background: rgba(255,255,255,.04);
}
.pm-settings-photo-drop b {
  position: absolute;
  left: 12px;
  right: 12px;
  bottom: 12px;
  min-height: 36px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  border: 1px solid rgba(255,255,255,.18);
  border-radius: 8px;
  background: rgba(0,0,0,.62);
  color: #fff;
  font-size: 13px;
}
.pm-settings-toggle-list,
.pm-settings-team-list {
  display: grid;
  gap: 10px;
}
.pm-settings-toggle,
.pm-settings-team-option {
  min-width: 0;
  border: 1px solid var(--pm-border-soft);
  border-radius: 8px;
  background: var(--pm-background);
}
.pm-settings-toggle {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: 12px;
  padding: 12px;
  cursor: pointer;
}
.pm-settings-toggle span,
.pm-settings-team-option span {
  min-width: 0;
  display: grid;
  gap: 4px;
}
.pm-settings-toggle strong,
.pm-settings-team-option strong {
  color: var(--pm-foreground);
  font-size: 13px;
  line-height: 1.25;
}
.pm-settings-toggle small,
.pm-settings-team-option small {
  color: var(--pm-muted);
  font-size: 12px;
  line-height: 1.35;
}
.pm-settings-toggle input {
  width: 18px;
  height: 18px;
  accent-color: var(--pm-foreground);
}
.pm-settings-team-option {
  display: grid;
  grid-template-columns: auto 32px minmax(0, 1fr);
  align-items: center;
  gap: 10px;
  padding: 12px;
  cursor: pointer;
}
.pm-settings-team-option input[type="checkbox"],
.pm-settings-toggle input[type="checkbox"] {
  appearance: auto;
  -webkit-appearance: auto;
  flex: 0 0 auto;
  place-self: center;
  width: 16px;
  height: 16px;
  min-width: 16px;
  min-height: 16px;
  margin: 0;
  padding: 0;
  border-radius: 4px;
  accent-color: var(--pm-foreground);
}
.pm-settings-toggle input[type="checkbox"] {
  width: 18px;
  height: 18px;
  min-width: 18px;
  min-height: 18px;
}
.pm-settings-team-option input[type="checkbox"]:focus-visible,
.pm-settings-toggle input[type="checkbox"]:focus-visible {
  outline: 2px solid var(--pm-foreground);
  outline-offset: 2px;
}
.pm-settings-danger-card {
  border-color: rgba(239,68,68,.32);
  background: color-mix(in srgb, rgba(239,68,68,.11) 45%, var(--pm-card));
}
.pm-detail-form { display: grid; gap: 18px; }
.pm-detail-thumbnail-editor {
  display: grid;
  grid-template-columns: 176px minmax(0, 1fr);
  align-items: center;
  gap: 14px;
  border: 1px solid var(--pm-border);
  border-radius: 8px;
  background: color-mix(in srgb, var(--pm-card) 72%, var(--pm-background));
  padding: 12px;
}
.pm-detail-thumbnail-drop {
  width: 176px;
  aspect-ratio: 16 / 9;
  border: 1px dashed var(--pm-border);
  border-radius: 8px;
  display: grid;
  place-items: center;
  gap: 8px;
  color: var(--pm-muted);
  cursor: pointer;
  overflow: hidden;
}
.pm-detail-thumbnail-drop.has-image { border-style: solid; }
.pm-detail-thumbnail-drop span {
  width: 100%;
  height: 100%;
  display: block;
  background-size: cover;
  background-position: center;
}
.pm-detail-thumbnail-editor div {
  min-width: 0;
  display: grid;
  gap: 6px;
}
.pm-detail-thumbnail-editor strong {
  color: var(--pm-foreground);
  font-size: 14px;
}
.pm-detail-thumbnail-editor small {
  color: var(--pm-muted);
  font-size: 12px;
}
.pm-detail-form-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 14px; }
.pm-form-span-2 { grid-column: span 2; }
.pm-team-picker { display: grid; gap: 10px; padding-top: 4px; }
.pm-team-option { min-width: 0; display: grid; grid-template-columns: auto 28px minmax(0, 1fr); align-items: center; gap: 10px; padding: 10px 12px; border: 1px solid var(--pm-border-soft, #e6edf6); border-radius: 12px; background: var(--pm-card-hover, #f8fafc); cursor: pointer; }
.pm-team-option input { width: 16px; min-height: 16px; }
.pm-team-option span:last-child { min-width: 0; display: grid; gap: 3px; }
.pm-team-option strong { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 13px; }
.pm-team-option small { color: var(--pm-muted, #64748b); font-size: 12px; }
.pm-danger-zone { display: grid; grid-template-columns: minmax(0, 1fr) auto auto; align-items: center; gap: 12px; padding: 14px; border: 1px solid rgba(239,68,68,.28); border-radius: 12px; background: rgba(239,68,68,.06); }
.pm-danger-zone div { min-width: 0; display: grid; gap: 3px; }
.pm-danger-zone strong { font-size: 13px; }
.pm-danger-zone small { color: var(--pm-muted, #64748b); font-size: 12px; line-height: 1.4; }
.pm-control.danger { border-color: rgba(239,68,68,.42); color: #ef4444; }
.pm-note-form { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 10px; margin-bottom: 12px; }
.pm-note-form input { min-width: 0; }
.pm-activity-list { display: grid; gap: 10px; }
.pm-activity-list article { display: grid; grid-template-columns: 32px minmax(0, 1fr); gap: 10px; align-items: start; padding: 10px; border: 1px solid var(--pm-border-soft, #e6edf6); border-radius: 12px; background: var(--pm-card-hover, #f8fafc); }
.pm-activity-list article > span { width: 32px; height: 32px; border-radius: 999px; display: grid; place-items: center; background: var(--pm-card, #fff); border: 1px solid var(--pm-border-soft, #e6edf6); color: var(--pm-foreground, #0f172a); font-size: 11px; font-weight: 800; }
.pm-activity-list div { min-width: 0; display: grid; gap: 3px; }
.pm-activity-list strong { font-size: 13px; line-height: 1.35; overflow-wrap: anywhere; }
.pm-activity-list small { color: var(--pm-muted, #64748b); font-size: 12px; }
.pm-planning-grid { display: grid; grid-template-columns: minmax(0, 1fr) minmax(280px, .36fr); gap: 16px; align-items: start; }
.pm-planning-form { display: grid; gap: 14px; }
.pm-planning-form-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 14px; }
.pm-planning-health { display: grid; gap: 14px; }
.pm-planning-stats { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 10px; }
.pm-planning-stats span { min-width: 0; display: grid; gap: 3px; padding: 12px; border: 1px solid var(--pm-border-soft, #e6edf6); border-radius: 12px; background: var(--pm-card-hover, #f8fafc); }
.pm-planning-stats strong { font-size: 20px; line-height: 1; }
.pm-planning-stats small { color: var(--pm-muted, #64748b); font-size: 11px; line-height: 1.25; }
.pm-planning-stats span.is-good strong { color: #16a34a; }
.pm-planning-stats span.is-warn { border-color: rgba(245, 158, 11, .42); background: rgba(245, 158, 11, .12); }
.pm-planning-stats span.is-warn strong { color: #d97706; }
.pm-planning-stats span.is-danger { border-color: rgba(239, 68, 68, .42); background: rgba(239, 68, 68, .12); }
.pm-planning-stats span.is-danger strong { color: #ef4444; }
.pm-planning-risks { display: grid; gap: 10px; }
.pm-planning-risks p { margin: 0; display: flex; align-items: center; gap: 8px; color: var(--pm-muted, #64748b); font-size: 13px; line-height: 1.35; }
.pm-phase-board { grid-column: 1 / -1; display: grid; gap: 14px; }
.pm-phase-lanes { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 12px; align-items: start; }
.pm-phase-lane { min-width: 0; display: grid; gap: 10px; padding: 12px; border: 1px solid var(--pm-border-soft, #e6edf6); border-radius: 14px; background: rgba(255,255,255,.02); }
.pm-phase-lane-head { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
.pm-phase-lane-head strong { font-size: 13px; }
.pm-phase-lane-head span { min-width: 24px; height: 24px; border-radius: 999px; display: grid; place-items: center; background: var(--pm-card-hover, #f8fafc); color: var(--pm-muted, #64748b); font-size: 12px; }
.pm-milestone-card { display: grid; gap: 9px; padding: 12px; border: 1px solid var(--pm-border-soft, #e6edf6); border-radius: 12px; background: var(--pm-card, #fff); }
.pm-milestone-card > div:first-child { min-width: 0; display: flex; align-items: flex-start; justify-content: space-between; gap: 8px; }
.pm-milestone-card strong { min-width: 0; font-size: 13px; line-height: 1.35; overflow-wrap: anywhere; }
.pm-milestone-card small { color: var(--pm-muted, #64748b); font-size: 12px; line-height: 1.35; }
.pm-milestone-meta { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.pm-milestone-meta select { min-height: 32px; border: 1px solid var(--pm-border-soft, #e6edf6); border-radius: 8px; background: var(--pm-input, #fff); color: var(--pm-foreground, #0f172a); font: inherit; font-size: 12px; padding: 0 8px; }
.pm-milestone-card footer { display: flex; justify-content: flex-end; gap: 8px; }
.pm-milestone-card footer button { min-height: 28px; border: 1px solid var(--pm-border-soft, #e6edf6); border-radius: 8px; background: transparent; color: var(--pm-muted, #64748b); font-size: 12px; cursor: pointer; }
.pm-phase-empty { min-height: 80px; margin: 0; border: 1px dashed var(--pm-border-soft, #e6edf6); border-radius: 12px; display: grid; place-items: center; color: var(--pm-muted, #64748b); font-size: 12px; text-align: center; padding: 12px; }
@media (max-width: 1280px) {
  .pm-dashboard-overview {
    grid-template-columns: minmax(0, 1fr) minmax(300px, .42fr);
    grid-template-areas:
      "progress milestones"
      "trend milestones"
      "recent budget"
      "recent quick";
  }
  .pm-resource-grid, .pm-doc-grid, .pm-budget-grid { grid-template-columns: 1fr 1fr; }
  .pm-kpis { grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 14px; }
  .pm-kpi { gap: 12px; padding: 16px; }
  .pm-kpi > span { width: 48px; height: 48px; }
  .pm-kpi strong { font-size: clamp(20px, 1.8vw, 24px); }
  .pm-header { grid-template-columns: minmax(300px, .8fr) minmax(520px, 1.2fr); align-items: start; }
  .pm-header-actions { display: grid; grid-template-columns: minmax(190px, auto) minmax(260px, 1fr) 44px minmax(120px, auto); justify-content: end; }
  .pm-new-project-button { grid-column: 4; justify-self: stretch; }
}
@media (max-width: 1080px) {
  .pm-header { grid-template-columns: 1fr; }
  .pm-header-actions { grid-template-columns: minmax(180px, auto) minmax(260px, 1fr) 44px minmax(120px, auto) minmax(150px, auto); justify-content: start; }
  .pm-new-project-button { grid-column: auto; }
}
@media (max-width: 760px) {
  .pm-shell { gap: 16px; padding-bottom: calc(84px + env(safe-area-inset-bottom)); }
  .pm-workspace { gap: 16px; }
  .pm-header { gap: 10px; }
  .pm-title-block h1 { font-size: clamp(24px, 7vw, 28px); letter-spacing: 0; }
  .pm-title-block p { margin-top: 6px; font-size: 13.5px; line-height: 1.45; }
  .pm-header-actions { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; align-items: stretch; }
  .pm-control, .pm-primary, .pm-search { width: 100%; min-width: 0; min-height: 44px; justify-content: center; border-radius: 10px; padding: 0 12px; font-size: 12.5px; }
  .pm-header-search { order: 1; grid-column: 1 / -1; justify-content: flex-start; background: #fff; }
  .pm-header-search input { min-width: 0; width: 100%; }
  .pm-date-control { order: 2; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
  .pm-filter-control { order: 3; }
  .pm-bell-control { display: none; }
  .pm-filter-backdrop {
    position: fixed;
    inset: 0;
    z-index: 850;
    background: rgba(15, 23, 42, .34);
  }
  .pm-new-project-button {
    position: fixed;
    right: 16px;
    bottom: calc(16px + env(safe-area-inset-bottom));
    z-index: 85;
    width: auto;
    min-width: 156px;
    min-height: 52px;
    border-radius: 999px;
    box-shadow: 0 18px 36px rgba(22, 163, 74, .32);
  }
  .pm-kpis {
    display: flex;
    gap: 12px;
    overflow-x: auto;
    scroll-snap-type: x mandatory;
    margin-left: -16px;
    margin-right: -16px;
    padding: 0 16px 8px;
    scroll-padding-left: 16px;
    scrollbar-width: none;
  }
  .pm-kpis::-webkit-scrollbar, .pm-tabs::-webkit-scrollbar { display: none; }
  .pm-kpi { min-width: min(280px, 82vw); min-height: 124px; scroll-snap-align: start; border-radius: 16px; }
  .pm-card { border-radius: 16px; padding: 16px; box-shadow: 0 8px 22px rgba(9, 17, 51, .055); }
  .pm-filter-row { grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 8px; }
  .pm-filter-row .pm-select { min-height: 44px; padding: 0 8px; font-size: 12px; border-radius: 10px; }
  .pm-resource-grid, .pm-doc-grid, .pm-budget-grid, .pm-form, .pm-modal-form { grid-template-columns: 1fr; }
  .pm-task-form-section,
  .pm-task-modal-form > .pm-form-actions {
    grid-column: 1 / -1;
  }
  .pm-task-form-grid {
    grid-template-columns: 1fr;
  }
  .pm-tabs {
    gap: 22px;
    margin-left: -16px;
    margin-right: -16px;
    padding-left: 16px;
    padding-right: 16px;
    border-bottom: 1px solid #dfe7f2;
    scrollbar-width: none;
  }
  .pm-tabs button {
    min-height: 40px;
    border: 0 !important;
    border-bottom: 2px solid transparent !important;
    border-radius: 0 !important;
    padding: 0 0 10px;
    font-size: 13px;
  }
  .pm-tabs button.active,
  .pm-tabs button[aria-selected="true"] {
    background: transparent !important;
    color: #111827 !important;
    border-bottom-color: #111827 !important;
  }
  .pm-date-panel,
  .pm-filter-panel,
  .pm-alert-panel {
    position: fixed;
    left: 0;
    right: 0;
    bottom: 0;
    top: auto;
    width: auto;
    z-index: 860;
    grid-template-columns: 1fr;
    max-height: min(82dvh, calc(100dvh - 88px));
    overflow: auto;
    border-radius: 20px 20px 0 0;
    padding: 18px;
    box-shadow: 0 -18px 60px rgba(15, 23, 42, .24);
  }
  .pm-date-presets { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .pm-alert-panel { gap: 12px; }
  .pm-dashboard-overview {
    grid-template-columns: 1fr;
    grid-template-areas:
      "progress"
      "trend"
      "milestones"
      "recent"
      "budget"
      "quick";
  }
  .pm-settings-header,
  .pm-settings-layout {
    grid-template-columns: 1fr;
  }
  .pm-settings-header {
    display: grid;
    align-items: start;
  }
  .pm-settings-side {
    position: static;
  }
  .pm-settings-field-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .pm-create-layout,
  .pm-create-basic-grid,
  .pm-create-basic-fields,
  .pm-create-location-grid,
  .pm-create-schedule-grid,
  .pm-create-budget-grid,
  .pm-detail-thumbnail-editor,
  .pm-task-detail-grid,
  .pm-task-assignment-grid,
  .pm-task-schedule-grid,
  .pm-task-time-grid,
  .pm-task-progress-summary {
    grid-template-columns: 1fr;
  }
  .pm-create-span-2,
  .pm-create-span-3,
  .pm-settings-span-2 {
    grid-column: auto;
  }
  .pm-create-side {
    position: static;
  }
  .pm-detail-thumbnail-drop {
    width: 100%;
  }
  .pm-create-section,
  .pm-create-side-box {
    padding: 14px;
  }
  .pm-settings-field-grid {
    grid-template-columns: 1fr;
  }
  .pm-settings-header,
  .pm-settings-card {
    padding: 14px;
  }
  .pm-settings-actions,
  .pm-settings-danger-actions {
    width: 100%;
    justify-content: stretch;
  }
  .pm-settings-actions button,
  .pm-settings-danger-actions button {
    flex: 1 1 0;
  }
  .pm-create-actions { grid-template-columns: 1fr; }
  .pm-donut-wrap, .pm-budget-meter, .pm-detail-head { grid-template-columns: 1fr; }
  .pm-donut { width: 180px; height: 180px; margin: auto; }
  .pm-list article { align-items: start; }
  .pm-wide { grid-column: auto; }
  .pm-table-wrap { display: none; }
  .pm-mobile-projects { display: grid; gap: 12px; }
  .pm-mobile-project-card {
    border: 1px solid #e3ebf5;
    border-radius: 16px;
    padding: 16px;
    display: grid;
    gap: 10px;
    background: #fff;
    box-shadow: 0 10px 24px rgba(9, 17, 51, .07);
  }
  .pm-mobile-project-card > div { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
  .pm-mobile-project-card strong { overflow-wrap: anywhere; font-size: 15px; }
  .pm-mobile-project-card small { font-size: 12.5px; }
  .pm-mobile-project-card span:not(.pm-pill):not(.pm-progress) { color: #64748b; font-size: 12px; font-weight: 800; }
  .pm-mobile-project-card .pm-progress { width: 100%; }
  .pm-kanban { grid-template-columns: repeat(5, minmax(78vw, 1fr)); margin-right: -16px; }
  .pm-task-card footer { grid-template-columns: auto 1fr; }
  .pm-task-card footer .pm-progress { grid-column: 1 / -1; width: 100%; }
  .pm-task-collab-grid, .pm-task-upload, .pm-task-comment-form { grid-template-columns: 1fr; }
  .pm-task-panel { height: min(320px, 64dvh); }
  .pm-task-actions { flex-wrap: wrap; justify-content: flex-end; }
  .pm-task-file-list article { grid-template-columns: 28px minmax(0, 1fr) auto; }
  .pm-task-file-list article .pm-pill { grid-column: 2; justify-self: start; }
  .pm-modal-backdrop { align-items: end; padding: 0; }
  .pm-modal { width: 100%; max-height: 92dvh; border-radius: 18px 18px 0 0; }
}
@media (max-width: 390px) {
  .pm-new-project-button { left: 16px; right: 16px; width: auto; }
  .pm-kpi { min-width: calc(100vw - 56px); }
}

@media (max-width: 1040px) {
  .pm-detail-head { grid-template-columns: 1fr; align-items: start; }
  .pm-detail-actions { justify-content: flex-start; }
  .pm-detail-overview { grid-template-columns: 1fr; }
  .pm-project-hero { grid-row: auto; }
  .pm-detail-form-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .pm-danger-zone { grid-template-columns: 1fr; }
  .pm-planning-grid { grid-template-columns: 1fr; }
  .pm-planning-health { order: 3; }
}
@media (max-width: 640px) {
  .pm-detail-form-grid { grid-template-columns: 1fr; }
  .pm-planning-form-grid { grid-template-columns: 1fr; }
  .pm-planning-stats { grid-template-columns: 1fr; }
  .pm-form-span-2 { grid-column: span 1; }
  .pm-detail-actions, .pm-note-form { display: grid; grid-template-columns: 1fr; }
  .pm-detail-status { width: 100%; }
}

.pm-shell {
  --pm-background: #ffffff;
  --pm-card: #ffffff;
  --pm-card-hover: #f4f4f5;
  --pm-card-gradient: #ffffff;
  --pm-border: #e5e7eb;
  --pm-border-soft: #eef2f7;
  --pm-foreground: #09090b;
  --pm-muted: #4b5563;
  --pm-placeholder: #6b7280;
  --pm-input: #ffffff;
  --pm-ring: rgba(9,9,11,.08);
  gap: 24px;
  color: var(--pm-foreground);
  font-family: var(--font-geist-sans), "Geist Sans", sans-serif;
}
.pm-shell,
.pm-workspace {
  background: var(--pm-background);
}
.pm-workspace {
  gap: 24px;
}
.pm-header {
  align-items: start;
}
.pm-title-block h1 {
  color: var(--pm-foreground);
  font-size: 31px;
  line-height: 37px;
  font-weight: 600;
}
.pm-title-block p {
  color: var(--pm-muted);
  font-size: 15px;
  line-height: 1.5;
  font-weight: 400;
  margin-top: 6px;
}
.pm-header-actions {
  align-items: center;
  gap: 12px;
}
.pm-control,
.pm-primary,
.pm-select,
.pm-search,
.pm-icon-btn,
.pm-detail-head > button:first-child,
.pm-drawer-close,
.pm-alert-head button {
  min-height: 40px;
  border: 1px solid var(--pm-border);
  border-radius: 12px;
  background: var(--pm-card);
  color: var(--pm-foreground);
  box-shadow: none;
  font-size: 14px;
  font-weight: 500;
}
.pm-primary {
  background: var(--pm-card);
  border-color: var(--pm-border);
}
.pm-control:hover,
.pm-primary:hover,
.pm-icon-btn:hover,
.pm-date-presets button:hover,
.pm-section-header button:hover,
.pm-alert-panel > button:hover,
.pm-actions button:hover {
  background: var(--pm-card-hover);
  color: var(--pm-foreground);
  border-color: var(--pm-border);
  transform: none;
}
.pm-search {
  height: 40px;
  background: var(--pm-input);
}
.pm-search input,
.pm-field input,
.pm-field select,
.pm-field textarea,
.pm-select {
  background: var(--pm-input);
  color: var(--pm-foreground);
  border-color: #2a2a2a;
}
.pm-search input::placeholder,
.pm-field input::placeholder,
.pm-field textarea::placeholder {
  color: var(--pm-placeholder);
}
.pm-search:focus-within,
.pm-field input:focus,
.pm-field select:focus,
.pm-field textarea:focus,
.pm-select:focus {
  border-color: var(--pm-foreground) !important;
  box-shadow: 0 0 0 3px var(--pm-ring) !important;
}
.pm-card {
  background: var(--pm-card-gradient);
  border: 1px solid var(--pm-border);
  border-radius: 16px;
  box-shadow: inset 0 1px 0 rgba(255,255,255,.035);
  color: var(--pm-foreground);
}
.pm-card:hover {
  background: linear-gradient(145deg, rgba(255,255,255,.075), rgba(255,255,255,.02));
}
.pm-kpis {
  gap: 16px;
}
.pm-kpi {
  min-height: 116px;
  padding: 20px 24px;
  gap: 16px;
}
.pm-kpi > span {
  width: 52px;
  height: 52px;
  border: 1px solid var(--pm-border-soft);
  background: var(--pm-card-hover) !important;
  color: var(--pm-foreground) !important;
}
.pm-kpi small,
.pm-card small,
.pm-budget-meter small {
  color: var(--pm-muted);
  font-weight: 400;
}
.pm-kpi strong,
.pm-budget-meter strong {
  color: var(--pm-foreground);
  font-weight: 600;
}
.pm-kpi em,
.pm-kpi em.negative {
  color: var(--pm-muted);
  font-weight: 400;
}
.pm-tabs {
  gap: 24px;
  min-height: 48px;
  margin-bottom: 0;
  border-bottom: 1px solid var(--pm-border);
  background: transparent !important;
}
.pm-tabs button {
  min-height: 48px;
  padding: 0 0 12px;
  background: transparent !important;
  border: 0 !important;
  border-bottom: 2px solid transparent !important;
  border-radius: 0 !important;
  box-shadow: none !important;
  color: var(--pm-muted);
  font-size: 13px;
  font-weight: 400;
  transform: none !important;
}
.pm-tabs button.active,
.pm-tabs button[aria-selected="true"],
.pm-tabs button:hover,
.pm-tabs button:focus-visible {
  color: var(--pm-foreground) !important;
  border-bottom-color: var(--pm-foreground) !important;
  background: transparent !important;
  font-weight: 500;
}
.pm-section-header {
  margin-bottom: 16px;
}
.pm-section-header h2 {
  color: var(--pm-foreground);
  font-size: 18px;
  font-weight: 600;
}
.pm-section-header button {
  color: var(--pm-foreground);
  font-size: 13px;
  font-weight: 500;
}
.pm-empty {
  min-height: 170px;
  border: 1px dashed #3a3a3a;
  border-radius: 12px;
  background: linear-gradient(145deg, rgba(255,255,255,.035), rgba(255,255,255,.008));
  color: var(--pm-muted);
  gap: 10px;
}
.pm-empty-icon {
  width: 52px;
  height: 52px;
  border: 1px solid var(--pm-border-soft);
  border-radius: 999px;
  display: grid;
  place-items: center;
  background: var(--pm-card-hover);
  color: var(--pm-foreground);
}
.pm-empty strong {
  color: var(--pm-foreground);
  font-size: 15px;
  font-weight: 600;
}
.pm-empty p {
  color: var(--pm-muted);
  font-size: 14px;
  line-height: 1.55;
}
.pm-line line {
  stroke: var(--pm-border-soft);
}
.pm-line div,
.pm-task-card p,
.pm-detail-head p,
.pm-field span,
.pm-check,
.pm-mobile-project-card span:not(.pm-pill):not(.pm-progress) {
  color: var(--pm-muted);
}
.pm-list article,
.pm-task-card,
.pm-task-panel,
.pm-task-file-list article,
.pm-resource-grid article,
.pm-doc-grid article,
.pm-mobile-project-card,
.pm-create-snapshot span,
.pm-create-section {
  border-color: var(--pm-border);
  background: var(--pm-card);
  box-shadow: none;
}
.pm-list svg,
.pm-actions span {
  background: var(--pm-card-hover);
  color: var(--pm-foreground);
  border: 1px solid var(--pm-border-soft);
}
.pm-table th {
  background: var(--pm-card);
  color: var(--pm-muted);
  border-bottom: 1px solid var(--pm-border-soft);
  font-size: 13px;
  font-weight: 500;
}
.pm-table td {
  color: var(--pm-foreground);
  border-color: var(--pm-border-soft);
  font-size: 13px;
}
.pm-table tbody tr:hover td {
  background: var(--pm-card-hover);
}
.pm-pill,
.tone-completed,
.tone-done,
.tone-approved,
.tone-good,
.tone-in-progress,
.tone-active,
.tone-review,
.tone-on-hold,
.tone-medium,
.tone-pending,
.tone-critical,
.tone-high,
.tone-blocked,
.tone-delayed,
.tone-at-risk {
  background: var(--pm-card-hover);
  border: 1px solid var(--pm-border-soft);
  color: var(--pm-foreground);
}
.pm-progress {
  background: #e5e7eb;
}
.pm-progress i {
  background: var(--pm-foreground);
}
.pm-actions button,
.pm-upload-button,
.pm-alert-panel > button,
.pm-date-presets button,
.pm-create,
.pm-create-body,
.pm-create-actions {
  background: var(--pm-card);
  color: var(--pm-foreground);
}
.pm-alert-head,
.pm-create-head,
.pm-create-actions {
  border-color: var(--pm-border);
}
.pm-create-head {
  background: linear-gradient(180deg, var(--pm-card-hover), var(--pm-card));
}
.pm-create-eyebrow {
  color: var(--pm-muted);
}
.pm-create-head h2,
.pm-create-section h3,
.pm-create-snapshot strong,
.pm-alert-panel > button strong,
.pm-alert-empty strong {
  color: var(--pm-foreground);
}
.pm-create-head p,
.pm-create-snapshot small,
.pm-alert-panel > button small,
.pm-alert-empty small {
  color: var(--pm-muted);
}
.pm-create-snapshot,
.pm-alert-empty {
  background: var(--pm-background);
  border-color: var(--pm-border);
}
.pm-modal-backdrop,
.pm-drawer-backdrop {
  background: rgba(15,23,42,.32);
}
@media (max-width: 760px) {
  .pm-header-search,
  .pm-mobile-project-card {
    background: var(--pm-card);
  }
  .pm-tabs {
    border-color: var(--pm-border);
  }
  .pm-filter-backdrop {
    background: rgba(15,23,42,.32);
  }
}
html[data-theme='dark'] body .project-workspace-shell .pm-shell .pm-tabs.pm-tabs,
body .project-workspace-shell .pm-shell .pm-tabs.pm-tabs {
  background: transparent !important;
  background-color: transparent !important;
  background-image: none !important;
  box-shadow: none !important;
}
html[data-theme='dark'] body .project-workspace-shell .pm-shell .pm-tabs.pm-tabs button,
body .project-workspace-shell .pm-shell .pm-tabs.pm-tabs button {
  background: transparent !important;
  background-color: transparent !important;
  background-image: none !important;
  box-shadow: none !important;
  transform: none !important;
}
html[data-theme='dark'] body .project-workspace-shell .pm-shell .pm-tabs.pm-tabs button.active,
html[data-theme='dark'] body .project-workspace-shell .pm-shell .pm-tabs.pm-tabs button[aria-selected="true"],
html[data-theme='dark'] body .project-workspace-shell .pm-shell .pm-tabs.pm-tabs button:hover,
html[data-theme='dark'] body .project-workspace-shell .pm-shell .pm-tabs.pm-tabs button:focus-visible,
body .project-workspace-shell .pm-shell .pm-tabs.pm-tabs button.active,
body .project-workspace-shell .pm-shell .pm-tabs.pm-tabs button[aria-selected="true"],
body .project-workspace-shell .pm-shell .pm-tabs.pm-tabs button:hover,
body .project-workspace-shell .pm-shell .pm-tabs.pm-tabs button:focus-visible {
  background: transparent !important;
  background-color: transparent !important;
  background-image: none !important;
  box-shadow: none !important;
  color: var(--pm-foreground) !important;
  border-bottom-color: var(--pm-foreground) !important;
}

html[data-theme='light'] body .project-workspace-shell .pm-shell {
  --pm-background: #ffffff;
  --pm-card: #ffffff;
  --pm-card-hover: #f4f4f5;
  --pm-card-gradient: #ffffff;
  --pm-border: #e5e7eb;
  --pm-border-soft: #eef2f7;
  --pm-foreground: #09090b;
  --pm-muted: #4b5563;
  --pm-placeholder: #6b7280;
  --pm-input: #ffffff;
  --pm-ring: rgba(9,9,11,.08);
  color: var(--pm-foreground);
  background: var(--pm-background);
}
html[data-theme='light'] body .project-workspace-shell .pm-workspace {
  background: var(--pm-background);
}
html[data-theme='light'] body .project-workspace-shell .pm-title-block h1,
html[data-theme='light'] body .project-workspace-shell .pm-section-header h2,
html[data-theme='light'] body .project-workspace-shell .pm-kpi strong,
html[data-theme='light'] body .project-workspace-shell .pm-budget-meter strong,
html[data-theme='light'] body .project-workspace-shell .pm-empty strong,
html[data-theme='light'] body .project-workspace-shell .pm-create-head h2,
html[data-theme='light'] body .project-workspace-shell .pm-create-section h3,
html[data-theme='light'] body .project-workspace-shell .pm-create-snapshot strong,
html[data-theme='light'] body .project-workspace-shell .pm-alert-panel > button strong,
html[data-theme='light'] body .project-workspace-shell .pm-alert-empty strong {
  color: var(--pm-foreground);
}
html[data-theme='light'] body .project-workspace-shell .pm-title-block p,
html[data-theme='light'] body .project-workspace-shell .pm-kpi small,
html[data-theme='light'] body .project-workspace-shell .pm-card small,
html[data-theme='light'] body .project-workspace-shell .pm-budget-meter small,
html[data-theme='light'] body .project-workspace-shell .pm-kpi em,
html[data-theme='light'] body .project-workspace-shell .pm-kpi em.negative,
html[data-theme='light'] body .project-workspace-shell .pm-empty p,
html[data-theme='light'] body .project-workspace-shell .pm-line div,
html[data-theme='light'] body .project-workspace-shell .pm-task-card p,
html[data-theme='light'] body .project-workspace-shell .pm-detail-head p,
html[data-theme='light'] body .project-workspace-shell .pm-field span,
html[data-theme='light'] body .project-workspace-shell .pm-check,
html[data-theme='light'] body .project-workspace-shell .pm-create-head p,
html[data-theme='light'] body .project-workspace-shell .pm-create-snapshot small,
html[data-theme='light'] body .project-workspace-shell .pm-alert-panel > button small,
html[data-theme='light'] body .project-workspace-shell .pm-alert-empty small {
  color: var(--pm-muted);
}
html[data-theme='light'] body .project-workspace-shell .pm-card,
html[data-theme='light'] body .project-workspace-shell .pm-list article,
html[data-theme='light'] body .project-workspace-shell .pm-task-card,
html[data-theme='light'] body .project-workspace-shell .pm-task-panel,
html[data-theme='light'] body .project-workspace-shell .pm-task-file-list article,
html[data-theme='light'] body .project-workspace-shell .pm-resource-grid article,
html[data-theme='light'] body .project-workspace-shell .pm-doc-grid article,
html[data-theme='light'] body .project-workspace-shell .pm-mobile-project-card,
html[data-theme='light'] body .project-workspace-shell .pm-create-snapshot span,
html[data-theme='light'] body .project-workspace-shell .pm-create-section,
html[data-theme='light'] body .project-workspace-shell .pm-alert-panel > button,
html[data-theme='light'] body .project-workspace-shell .pm-upload-button,
html[data-theme='light'] body .project-workspace-shell .pm-create,
html[data-theme='light'] body .project-workspace-shell .pm-create-body,
html[data-theme='light'] body .project-workspace-shell .pm-create-actions {
  background: var(--pm-card);
  border-color: var(--pm-border);
  color: var(--pm-foreground);
  box-shadow: none;
}
html[data-theme='light'] body .project-workspace-shell .pm-card:hover {
  background: var(--pm-card);
}
html[data-theme='light'] body .project-workspace-shell .pm-control,
html[data-theme='light'] body .project-workspace-shell .pm-select,
html[data-theme='light'] body .project-workspace-shell .pm-search,
html[data-theme='light'] body .project-workspace-shell .pm-icon-btn,
html[data-theme='light'] body .project-workspace-shell .pm-detail-head > button:first-child,
html[data-theme='light'] body .project-workspace-shell .pm-drawer-close,
html[data-theme='light'] body .project-workspace-shell .pm-alert-head button,
html[data-theme='light'] body .project-workspace-shell .pm-field input,
html[data-theme='light'] body .project-workspace-shell .pm-field select,
html[data-theme='light'] body .project-workspace-shell .pm-field textarea {
  background: var(--pm-input);
  border-color: #d4d4d8;
  color: var(--pm-foreground);
}
html[data-theme='light'] body .project-workspace-shell .pm-primary {
  background: #09090b;
  border-color: #09090b;
  color: #ffffff;
}
html[data-theme='light'] body .project-workspace-shell .pm-primary:hover {
  background: #18181b;
  border-color: #18181b;
  color: #ffffff;
}
html[data-theme='light'] body .project-workspace-shell .pm-control:hover,
html[data-theme='light'] body .project-workspace-shell .pm-icon-btn:hover,
html[data-theme='light'] body .project-workspace-shell .pm-date-presets button:hover,
html[data-theme='light'] body .project-workspace-shell .pm-section-header button:hover,
html[data-theme='light'] body .project-workspace-shell .pm-alert-panel > button:hover,
html[data-theme='light'] body .project-workspace-shell .pm-actions button:hover {
  background: var(--pm-card-hover);
  border-color: var(--pm-border);
  color: var(--pm-foreground);
}
html[data-theme='light'] body .project-workspace-shell .pm-search input,
html[data-theme='light'] body .project-workspace-shell .pm-field input,
html[data-theme='light'] body .project-workspace-shell .pm-field select,
html[data-theme='light'] body .project-workspace-shell .pm-field textarea {
  color: var(--pm-foreground);
}
html[data-theme='light'] body .project-workspace-shell .pm-search input::placeholder,
html[data-theme='light'] body .project-workspace-shell .pm-field input::placeholder,
html[data-theme='light'] body .project-workspace-shell .pm-field textarea::placeholder {
  color: var(--pm-placeholder);
}
html[data-theme='light'] body .project-workspace-shell .pm-search:focus-within,
html[data-theme='light'] body .project-workspace-shell .pm-field input:focus,
html[data-theme='light'] body .project-workspace-shell .pm-field select:focus,
html[data-theme='light'] body .project-workspace-shell .pm-field textarea:focus,
html[data-theme='light'] body .project-workspace-shell .pm-select:focus {
  border-color: var(--pm-foreground) !important;
  box-shadow: 0 0 0 3px var(--pm-ring) !important;
}
html[data-theme='light'] body .project-workspace-shell .pm-kpi > span,
html[data-theme='light'] body .project-workspace-shell .pm-empty-icon,
html[data-theme='light'] body .project-workspace-shell .pm-list svg,
html[data-theme='light'] body .project-workspace-shell .pm-actions span {
  background: var(--pm-card-hover) !important;
  border-color: var(--pm-border);
  color: var(--pm-foreground) !important;
}
html[data-theme='light'] body .project-workspace-shell .pm-tabs {
  border-bottom-color: var(--pm-border);
}
html[data-theme='light'] body .project-workspace-shell .pm-tabs button {
  color: var(--pm-muted);
}
html[data-theme='light'] body .project-workspace-shell .pm-tabs button.active,
html[data-theme='light'] body .project-workspace-shell .pm-tabs button[aria-selected="true"],
html[data-theme='light'] body .project-workspace-shell .pm-tabs button:hover,
html[data-theme='light'] body .project-workspace-shell .pm-tabs button:focus-visible {
  color: var(--pm-foreground) !important;
  border-bottom-color: var(--pm-foreground) !important;
}
html[data-theme='light'] body .project-workspace-shell .pm-empty,
html[data-theme='light'] body .project-workspace-shell .pm-alert-empty,
html[data-theme='light'] body .project-workspace-shell .pm-create-snapshot {
  background: #ffffff;
  border-color: #d4d4d8;
}
html[data-theme='light'] body .project-workspace-shell .pm-table th {
  background: #fafafa;
  border-color: var(--pm-border);
  color: var(--pm-muted);
}
html[data-theme='light'] body .project-workspace-shell .pm-table td {
  border-color: var(--pm-border-soft);
  color: var(--pm-foreground);
}
html[data-theme='light'] body .project-workspace-shell .pm-table tbody tr:hover td {
  background: #fafafa;
}
html[data-theme='light'] body .project-workspace-shell .pm-pill,
html[data-theme='light'] body .project-workspace-shell .tone-completed,
html[data-theme='light'] body .project-workspace-shell .tone-done,
html[data-theme='light'] body .project-workspace-shell .tone-approved,
html[data-theme='light'] body .project-workspace-shell .tone-good,
html[data-theme='light'] body .project-workspace-shell .tone-in-progress,
html[data-theme='light'] body .project-workspace-shell .tone-active,
html[data-theme='light'] body .project-workspace-shell .tone-review,
html[data-theme='light'] body .project-workspace-shell .tone-on-hold,
html[data-theme='light'] body .project-workspace-shell .tone-medium,
html[data-theme='light'] body .project-workspace-shell .tone-pending,
html[data-theme='light'] body .project-workspace-shell .tone-critical,
html[data-theme='light'] body .project-workspace-shell .tone-high,
html[data-theme='light'] body .project-workspace-shell .tone-blocked,
html[data-theme='light'] body .project-workspace-shell .tone-delayed,
html[data-theme='light'] body .project-workspace-shell .tone-at-risk {
  background: #fafafa;
  border-color: var(--pm-border);
  color: var(--pm-foreground);
}
html[data-theme='light'] body .project-workspace-shell .pm-progress {
  background: #e5e7eb;
}
html[data-theme='light'] body .project-workspace-shell .pm-progress i {
  background: var(--pm-foreground);
}
html[data-theme='light'] body .project-workspace-shell .pm-create-head {
  background: #ffffff;
  border-color: var(--pm-border);
}
html[data-theme='light'] body .project-workspace-shell .pm-modal-backdrop,
html[data-theme='light'] body .project-workspace-shell .pm-drawer-backdrop {
  background: rgba(15,23,42,.32);
}

html[data-theme='dark'] body .project-workspace-shell .pm-header,
html[data-theme='dark'] body .project-workspace-shell .pm-header:hover,
html[data-theme='dark'] body .project-workspace-shell .pm-title-block,
html[data-theme='dark'] body .project-workspace-shell .pm-title-block:hover,
html[data-theme='dark'] body .project-workspace-shell .pm-header-actions,
html[data-theme='dark'] body .project-workspace-shell .pm-header-actions:hover,
html[data-theme='dark'] body .project-workspace-shell .pm-section-header,
html[data-theme='dark'] body .project-workspace-shell .pm-section-header:hover,
html[data-theme='dark'] body .project-workspace-shell .pm-section-header > *,
html[data-theme='dark'] body .project-workspace-shell .pm-section-header > *:hover,
html[data-theme='dark'] body .project-workspace-shell .pm-section-header h2,
html[data-theme='dark'] body .project-workspace-shell .pm-section-header h2:hover {
  background: transparent !important;
  background-color: transparent !important;
  background-image: none !important;
  box-shadow: none !important;
}
html[data-theme='dark'] body .project-workspace-shell .pm-header-actions {
  border-color: transparent !important;
}
html[data-theme='dark'] body .project-workspace-shell .pm-card:hover {
  background: var(--pm-card-gradient) !important;
  background-color: var(--pm-card) !important;
  box-shadow: inset 0 1px 0 rgba(255,255,255,.035) !important;
}
html[data-theme='dark'] body .project-workspace-shell .pm-card:hover .pm-section-header,
html[data-theme='dark'] body .project-workspace-shell .pm-card:hover .pm-section-header h2,
html[data-theme='dark'] body .project-workspace-shell .pm-card:hover .pm-section-header button {
  background: transparent !important;
  background-color: transparent !important;
  background-image: none !important;
  box-shadow: none !important;
}
html[data-theme='dark'] body .project-workspace-shell .pm-section-header button:hover {
  background: transparent !important;
  background-color: transparent !important;
}
html[data-theme='light'] body .project-workspace-shell .pm-header,
html[data-theme='light'] body .project-workspace-shell .pm-header:hover,
html[data-theme='light'] body .project-workspace-shell .pm-title-block,
html[data-theme='light'] body .project-workspace-shell .pm-title-block:hover,
html[data-theme='light'] body .project-workspace-shell .pm-header-actions,
html[data-theme='light'] body .project-workspace-shell .pm-header-actions:hover,
html[data-theme='light'] body .project-workspace-shell .pm-section-header,
html[data-theme='light'] body .project-workspace-shell .pm-section-header:hover,
html[data-theme='light'] body .project-workspace-shell .pm-section-header > *,
html[data-theme='light'] body .project-workspace-shell .pm-section-bar,
html[data-theme='light'] body .project-workspace-shell .pm-section-bar:hover,
html[data-theme='light'] body .project-workspace-shell .pm-section-bar > *,
html[data-theme='light'] body .project-workspace-shell .pm-section-bar > *:hover,
html[data-theme='light'] body .project-workspace-shell .pm-section-header > *:hover,
html[data-theme='light'] body .project-workspace-shell .pm-section-header h2,
html[data-theme='light'] body .project-workspace-shell .pm-section-header h2:hover {
  background: transparent !important;
  background-color: transparent !important;
  background-image: none !important;
  box-shadow: none !important;
}
html[data-theme='light'] body .project-workspace-shell .pm-card:hover {
  background: var(--pm-card) !important;
  background-color: var(--pm-card) !important;
  box-shadow: none !important;
}

body .project-workspace-shell .pm-page-top {
  min-width: 0;
  display: grid;
  grid-template-columns: minmax(240px, .9fr) minmax(320px, 1.1fr);
  gap: 16px;
  align-items: start;
}
body .project-workspace-shell .pm-page-title {
  min-width: 0;
}
body .project-workspace-shell .pm-page-title h1 {
  margin: 0;
  color: var(--pm-foreground);
  font-size: clamp(26px, 3vw, 32px);
  line-height: 1.12;
  font-weight: 600;
  overflow-wrap: anywhere;
}
body .project-workspace-shell .pm-page-title p {
  margin: 6px 0 0;
  color: var(--pm-muted);
  font-size: 15px;
  line-height: 1.4;
}
body .project-workspace-shell .pm-page-tools {
  min-width: 0;
  display: grid;
  grid-template-columns: minmax(170px, auto) minmax(180px, 1fr) 40px minmax(110px, auto) minmax(140px, auto);
  gap: 10px;
  justify-content: end;
}
body .project-workspace-shell .pm-page-search,
body .project-workspace-shell .pm-page-search input {
  min-width: 0;
}
body .project-workspace-shell .pm-kpis {
  grid-template-columns: repeat(auto-fit, minmax(min(190px, 100%), 1fr)) !important;
}
body .project-workspace-shell .pm-dashboard-overview {
  grid-template-columns: repeat(auto-fit, minmax(min(320px, 100%), 1fr));
  grid-template-areas: none;
}
body .project-workspace-shell .pm-progress-card,
body .project-workspace-shell .pm-trend,
body .project-workspace-shell .pm-milestones,
body .project-workspace-shell .pm-recent,
body .project-workspace-shell .pm-budget-card,
body .project-workspace-shell .pm-quick-card {
  grid-area: auto;
}
body .project-workspace-shell .pm-section-bar,
body .project-workspace-shell .pm-section-header {
  min-width: 0;
  flex-wrap: wrap;
  align-items: flex-start;
  row-gap: 6px;
}
body .project-workspace-shell .pm-section-bar h2,
body .project-workspace-shell .pm-section-header h2 {
  min-width: 0;
  overflow-wrap: anywhere;
  line-height: 1.2;
}
body .project-workspace-shell .pm-section-action,
body .project-workspace-shell .pm-section-bar button,
body .project-workspace-shell .pm-section-header button {
  min-height: 24px;
  white-space: nowrap;
  line-height: 1.2;
}
body .project-workspace-shell .pm-section-action {
  border: 1px solid var(--pm-border-soft);
  border-radius: 999px;
  background: var(--pm-card-hover) !important;
  color: var(--pm-muted);
  padding: 4px 10px;
  font-size: 12px;
  font-weight: 600;
}
body .project-workspace-shell .pm-kanban {
  grid-template-columns: repeat(5, minmax(220px, 1fr));
}
@media (max-width: 1180px) {
  body .project-workspace-shell .pm-page-top {
    grid-template-columns: 1fr;
  }
  body .project-workspace-shell .pm-page-tools {
    grid-template-columns: minmax(170px, auto) minmax(220px, 1fr) 40px minmax(110px, auto) minmax(140px, auto);
    justify-content: start;
  }
}
@media (max-width: 760px) {
  body .project-workspace-shell .pm-page-title h1 {
    font-size: clamp(24px, 8vw, 30px);
  }
  body .project-workspace-shell .pm-page-tools {
    grid-template-columns: 1fr 1fr;
  }
  body .project-workspace-shell .pm-page-search {
    grid-column: 1 / -1;
    order: -1;
  }
  body .project-workspace-shell .pm-bell-control {
    display: none;
  }
  body .project-workspace-shell .pm-kanban {
    grid-template-columns: repeat(5, minmax(78vw, 1fr));
    margin-right: -16px;
  }
  body .project-workspace-shell .pm-section-action,
  body .project-workspace-shell .pm-section-bar button,
  body .project-workspace-shell .pm-section-header button {
    white-space: normal;
    text-align: left;
  }
}

body .project-workspace-shell .pm-section-bar {
  display: grid !important;
  grid-template-columns: minmax(0, 1fr) max-content;
  align-items: start;
  column-gap: 14px;
  row-gap: 4px;
}
body .project-workspace-shell .pm-section-bar h2 {
  min-width: 0;
  margin: 0;
}
body .project-workspace-shell .pm-section-action {
  min-height: 0;
  justify-self: end;
  border: 0 !important;
  border-radius: 0;
  background: transparent !important;
  color: var(--pm-muted);
  padding: 4px 0 0;
  font-size: 12px;
  font-weight: 500;
  line-height: 1.2;
  white-space: nowrap;
}
@media (max-width: 760px) {
  body .project-workspace-shell .pm-section-bar {
    grid-template-columns: 1fr;
  }
  body .project-workspace-shell .pm-section-action {
    justify-self: start;
    padding-top: 0;
    white-space: normal;
  }
}

body .app-shell .main-content .pm-shell {
  width: 100%;
  max-width: none !important;
  min-width: 0;
  min-height: calc(100vh - 48px);
  margin: 0 !important;
  padding: 16px 24px 28px;
  align-content: start;
  gap: 18px;
}
body .app-shell .main-content .pm-workspace {
  width: 100%;
  min-width: 0;
  align-content: start;
  gap: 18px;
}
body .app-shell .main-content .pm-page-top {
  min-width: 0;
  display: grid;
  grid-template-columns: minmax(260px, .72fr) minmax(520px, 1fr);
  gap: 16px;
  align-items: start;
}
body .app-shell .main-content .pm-page-title {
  min-width: 0;
}
body .app-shell .main-content .pm-page-title h1 {
  margin: 0;
  color: var(--pm-foreground);
  font-size: clamp(27px, 2.4vw, 32px);
  line-height: 1.1;
  font-weight: 700;
  overflow-wrap: anywhere;
}
body .app-shell .main-content .pm-page-title p {
  margin: 4px 0 0;
  color: var(--pm-muted);
  font-size: 15px;
  line-height: 1.35;
}
body .app-shell .main-content .pm-page-tools {
  min-width: 0;
  display: grid;
  grid-template-columns: minmax(168px, max-content) minmax(220px, 1fr) 44px minmax(104px, max-content) minmax(142px, max-content);
  gap: 8px;
  justify-content: end;
  align-items: start;
}
body .app-shell .main-content .pm-page-tools .pm-control,
body .app-shell .main-content .pm-page-tools .pm-primary,
body .app-shell .main-content .pm-page-tools .pm-search {
  min-height: 40px;
  height: 40px;
  border-radius: 10px;
  white-space: nowrap;
}
body .app-shell .main-content .pm-page-tools .pm-date-control,
body .app-shell .main-content .pm-page-tools .pm-filter-control,
body .app-shell .main-content .pm-page-tools .pm-new-project-button {
  padding-left: 12px;
  padding-right: 12px;
}
body .app-shell .main-content .pm-page-search {
  width: 100%;
  min-width: 0;
  overflow: hidden;
}
body .app-shell .main-content .pm-page-search input {
  width: 100%;
  min-width: 0;
  max-width: none;
  text-overflow: ellipsis;
}
body .app-shell .main-content .pm-bell-control {
  width: 44px;
  justify-content: center;
  padding: 0;
}
body .app-shell .main-content .pm-kpis {
  grid-template-columns: repeat(5, minmax(178px, 1fr)) !important;
  gap: 14px;
}
body .app-shell .main-content .pm-kpi {
  min-height: 108px;
  padding: 18px 20px;
  gap: 14px;
}
body .app-shell .main-content .pm-dashboard-overview {
  grid-template-columns: minmax(320px, .92fr) minmax(360px, 1.06fr) minmax(300px, .82fr);
  grid-template-areas:
    "progress trend milestones"
    "recent recent budget"
    "recent recent quick";
}
body .app-shell .main-content .pm-progress-card { grid-area: progress; }
body .app-shell .main-content .pm-trend { grid-area: trend; }
body .app-shell .main-content .pm-milestones { grid-area: milestones; }
body .app-shell .main-content .pm-recent { grid-area: recent; }
body .app-shell .main-content .pm-budget-card { grid-area: budget; }
body .app-shell .main-content .pm-quick-card { grid-area: quick; }
body .app-shell .main-content .pm-tabs {
  gap: 24px;
  min-height: 48px;
  margin-top: 0;
  margin-bottom: 4px;
  padding-bottom: 0;
  border-bottom: 1px solid var(--pm-border);
  background: transparent !important;
}
body .app-shell .main-content .pm-shell .pm-tabs.pm-tabs button {
  min-height: 48px;
  padding: 0 0 12px;
  background: transparent !important;
  border: 0 !important;
  border-bottom: 2px solid transparent !important;
  border-radius: 0 !important;
  box-shadow: none !important;
  color: var(--pm-muted);
  font-size: 13px;
  font-weight: 400;
  transform: none !important;
}
body .app-shell .main-content .pm-shell .pm-tabs.pm-tabs button.active,
body .app-shell .main-content .pm-shell .pm-tabs.pm-tabs button[aria-selected="true"],
body .app-shell .main-content .pm-shell .pm-tabs.pm-tabs button:hover,
body .app-shell .main-content .pm-shell .pm-tabs.pm-tabs button:focus-visible {
  color: var(--pm-foreground) !important;
  border-bottom-color: var(--pm-foreground) !important;
  font-weight: 500;
}
body .app-shell .main-content .pm-card {
  padding: 20px;
}
body .app-shell .main-content .pm-section-header {
  margin-bottom: 14px;
}
body .app-shell .main-content .pm-donut-wrap {
  gap: 16px;
}
body .app-shell .main-content .pm-table-wrap {
  overflow-x: auto;
}
@media (max-width: 1440px) {
  body .app-shell .main-content .pm-page-top {
    grid-template-columns: 1fr;
  }
  body .app-shell .main-content .pm-page-tools {
    justify-content: start;
  }
  body .app-shell .main-content .pm-kpis {
    grid-template-columns: repeat(auto-fit, minmax(210px, 1fr)) !important;
  }
  body .app-shell .main-content .pm-dashboard-overview {
    grid-template-columns: repeat(auto-fit, minmax(min(320px, 100%), 1fr));
    grid-template-areas: none;
  }
  body .app-shell .main-content .pm-progress-card,
  body .app-shell .main-content .pm-trend,
  body .app-shell .main-content .pm-milestones,
  body .app-shell .main-content .pm-recent,
  body .app-shell .main-content .pm-budget-card,
  body .app-shell .main-content .pm-quick-card {
    grid-area: auto;
  }
}
@media (max-width: 920px) {
  body .app-shell .main-content .pm-page-tools {
    grid-template-columns: 1fr 1fr;
  }
  body .app-shell .main-content .pm-page-search {
    grid-column: 1 / -1;
    order: -1;
  }
  body .app-shell .main-content .pm-bell-control {
    display: none;
  }
}
@media (max-width: 560px) {
  body .app-shell .main-content .pm-shell {
    padding: 14px 12px 22px;
  }
  body .app-shell .main-content .pm-page-tools {
    grid-template-columns: 1fr;
  }
  body .app-shell .main-content .pm-page-tools .pm-control,
  body .app-shell .main-content .pm-page-tools .pm-primary,
  body .app-shell .main-content .pm-page-tools .pm-search {
    width: 100%;
    justify-content: center;
  }
}

body .app-shell .main-content .pm-shell {
  align-items: start;
  grid-auto-rows: max-content;
}
body .app-shell .main-content .pm-workspace {
  grid-auto-rows: max-content;
  gap: 16px;
}
body .app-shell .main-content .pm-tab-panel {
  width: 100%;
  min-width: 0;
  display: grid;
  align-content: start;
  gap: 16px;
}
body .app-shell .main-content .pm-tabs {
  gap: 28px;
  min-height: 44px;
  margin-bottom: 0;
}
body .app-shell .main-content .pm-shell .pm-tabs.pm-tabs button {
  min-height: 44px;
  padding-bottom: 10px;
}
body .app-shell .main-content .pm-kpis {
  gap: 12px;
}
body .app-shell .main-content .pm-kpi {
  min-height: 96px;
  padding: 16px 18px;
  gap: 13px;
}
body .app-shell .main-content .pm-kpi > span {
  width: 46px;
  height: 46px;
  border-radius: 8px;
}
body .app-shell .main-content .pm-kpi small,
body .app-shell .main-content .pm-card small {
  font-weight: 600;
}
body .app-shell .main-content .pm-kpi strong {
  margin-top: 4px;
  font-size: 22px;
}
body .app-shell .main-content .pm-kpi em {
  margin-top: 6px;
  color: var(--pm-muted);
  font-weight: 600;
}
body .app-shell .main-content .pm-dashboard-overview,
body .app-shell .main-content .pm-overview-grid,
body .app-shell .main-content .pm-budget-grid,
body .app-shell .main-content .pm-resource-grid,
body .app-shell .main-content .pm-doc-grid,
body .app-shell .main-content .pm-kanban {
  gap: 16px;
  align-items: start;
}
body .app-shell .main-content .pm-kanban {
  width: 100%;
  max-width: 100%;
  display: grid;
  grid-template-columns: repeat(5, minmax(240px, 1fr));
  overflow-x: auto;
  padding-bottom: 4px;
}
body .app-shell .main-content .pm-kanban-col {
  min-width: 0;
}
body .app-shell .main-content .pm-card,
body .app-shell .main-content .pm-task-board,
body .app-shell .main-content .pm-task-card,
body .app-shell .main-content .pm-task-panel,
body .app-shell .main-content .pm-resource-grid article,
body .app-shell .main-content .pm-doc-grid article {
  border-radius: 8px;
}
body .app-shell .main-content .pm-card {
  border-color: var(--pm-border);
  box-shadow: none;
}
body .app-shell .main-content .pm-section-header,
body .app-shell .main-content .pm-section-bar {
  min-width: 0;
  margin-bottom: 12px;
}
body .app-shell .main-content .pm-section-header h2,
body .app-shell .main-content .pm-section-bar h2 {
  font-size: 16px;
  line-height: 1.2;
  font-weight: 650;
}
body .app-shell .main-content .pm-donut-wrap {
  grid-template-columns: minmax(150px, 200px) minmax(0, 1fr);
}
body .app-shell .main-content .pm-donut {
  width: min(200px, 100%);
  height: auto;
  aspect-ratio: 1;
}
body .app-shell .main-content .pm-line {
  min-height: 220px;
}
body .app-shell .main-content .pm-line svg {
  height: clamp(160px, 17vw, 206px);
}
body .app-shell .main-content .pm-table {
  min-width: 900px;
}
body .app-shell .main-content .pm-table th {
  height: 42px;
  padding: 11px 14px;
  color: var(--pm-muted);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: .04em;
}
body .app-shell .main-content .pm-table td {
  padding: 14px;
  font-size: 13px;
  line-height: 1.35;
}
body .app-shell .main-content .pm-table td strong {
  display: block;
  max-width: 340px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
body .app-shell .main-content .pm-table td small {
  display: block;
  max-width: 340px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  margin-top: 3px;
}
body .app-shell .main-content .pm-table tbody tr:hover td {
  background: var(--pm-card-hover);
}
body .app-shell .main-content .pm-progress {
  width: min(140px, 100%);
}
body .app-shell .main-content .pm-empty {
  min-height: 180px;
  border: 1px dashed var(--pm-border-soft);
  border-radius: 8px;
  background: color-mix(in srgb, var(--pm-card-hover) 52%, transparent);
}
body .app-shell .main-content .pm-empty-icon {
  width: 44px;
  height: 44px;
  border-radius: 8px;
}
body .app-shell .main-content .pm-control,
body .app-shell .main-content .pm-primary,
body .app-shell .main-content .pm-select,
body .app-shell .main-content .pm-search,
body .app-shell .main-content .pm-field input,
body .app-shell .main-content .pm-field select,
body .app-shell .main-content .pm-field textarea {
  border-radius: 8px;
}
body .app-shell .main-content .pm-task-board-head,
body .app-shell .main-content .pm-task-board-row {
  min-width: 980px;
}
body .app-shell .main-content .pm-task-board-row {
  min-height: 58px;
}
body .app-shell .main-content .pm-task-board-head span,
body .app-shell .main-content .pm-task-board-row > * {
  padding: 9px 12px;
}
body .app-shell .main-content .pm-task-board-title strong {
  font-size: 13px;
  font-weight: 650;
}
body .app-shell .main-content .pm-pill {
  border-radius: 6px;
  font-weight: 650;
}
body .app-shell .main-content .pm-pill.tone-to-do {
  background: rgba(59, 130, 246, .14) !important;
  border-color: rgba(96, 165, 250, .42) !important;
  color: #93c5fd !important;
}
body .app-shell .main-content .pm-pill.tone-in-progress {
  background: rgba(245, 158, 11, .16) !important;
  border-color: rgba(251, 191, 36, .44) !important;
  color: #fbbf24 !important;
}
body .app-shell .main-content .pm-pill.tone-review {
  background: rgba(168, 85, 247, .16) !important;
  border-color: rgba(192, 132, 252, .44) !important;
  color: #d8b4fe !important;
}
body .app-shell .main-content .pm-pill.tone-on-hold,
body .app-shell .main-content .pm-pill.tone-blocked {
  background: rgba(239, 68, 68, .16) !important;
  border-color: rgba(248, 113, 113, .46) !important;
  color: #fca5a5 !important;
}
body .app-shell .main-content .pm-pill.tone-done,
body .app-shell .main-content .pm-pill.tone-completed {
  background: rgba(34, 197, 94, .16) !important;
  border-color: rgba(74, 222, 128, .44) !important;
  color: #86efac !important;
}
html[data-theme='light'] body .app-shell .main-content .pm-pill.tone-to-do {
  background: #dbeafe !important;
  border-color: #93c5fd !important;
  color: #1d4ed8 !important;
}
html[data-theme='light'] body .app-shell .main-content .pm-pill.tone-in-progress {
  background: #fef3c7 !important;
  border-color: #fcd34d !important;
  color: #b45309 !important;
}
html[data-theme='light'] body .app-shell .main-content .pm-pill.tone-review {
  background: #f3e8ff !important;
  border-color: #c084fc !important;
  color: #7e22ce !important;
}
html[data-theme='light'] body .app-shell .main-content .pm-pill.tone-on-hold,
html[data-theme='light'] body .app-shell .main-content .pm-pill.tone-blocked {
  background: #fee2e2 !important;
  border-color: #fca5a5 !important;
  color: #b91c1c !important;
}
html[data-theme='light'] body .app-shell .main-content .pm-pill.tone-done,
html[data-theme='light'] body .app-shell .main-content .pm-pill.tone-completed {
  background: #dcfce7 !important;
  border-color: #86efac !important;
  color: #15803d !important;
}
body .app-shell .main-content .pm-icon-btn {
  border-radius: 8px;
}
@media (max-width: 920px) {
  body .app-shell .main-content .pm-tabs {
    gap: 22px;
  }
  body .app-shell .main-content .pm-kpi {
    min-height: 104px;
  }
  body .app-shell .main-content .pm-kanban {
    grid-template-columns: repeat(5, minmax(280px, 1fr));
  }
}
@media (max-width: 560px) {
  body .app-shell .main-content .pm-tab-panel {
    gap: 14px;
  }
  body .app-shell .main-content .pm-tabs {
    margin-left: -12px;
    margin-right: -12px;
    padding-left: 12px;
    padding-right: 12px;
  }
  body .app-shell .main-content .pm-kanban {
    margin-right: -12px;
    padding-right: 12px;
    grid-template-columns: repeat(5, minmax(78vw, 1fr));
  }
}

body .app-shell .main-content .pm-page-tools:has(.pm-projects-primary) {
  display: flex;
  justify-content: flex-end;
}
body .app-shell .main-content .pm-projects-primary {
  min-width: 154px;
  height: 44px;
  justify-content: center;
  background: #fafafa !important;
  background-color: #fafafa !important;
  background-image: none !important;
  border-color: #fafafa !important;
  color: #050505 !important;
  filter: none !important;
  opacity: 1 !important;
}
html[data-theme='dark'] body .app-shell .main-content .pm-shell .pm-page-tools .pm-projects-primary.pm-projects-primary {
  background: #fafafa !important;
  background-color: #fafafa !important;
  background-image: none !important;
  border-color: #fafafa !important;
  color: #050505 !important;
  filter: none !important;
  opacity: 1 !important;
}
body .app-shell .main-content .pm-shell .pm-tabs.pm-tabs {
  min-height: 50px;
  gap: 52px;
  align-items: flex-end;
  border-bottom: 1px solid var(--pm-border);
  background: transparent !important;
  background-color: transparent !important;
  background-image: none !important;
  box-shadow: none !important;
  margin: 0 0 16px;
  padding: 0;
}
body .app-shell .main-content .pm-shell .pm-tabs.pm-tabs button {
  position: relative;
  min-height: 50px;
  padding: 0 0 15px;
  border: 0 !important;
  border-radius: 0 !important;
  background: transparent !important;
  background-color: transparent !important;
  background-image: none !important;
  box-shadow: none !important;
  color: var(--pm-muted) !important;
  font-size: 14px;
  font-weight: 500;
}
body .app-shell .main-content .pm-shell .pm-tabs.pm-tabs button::after {
  content: "";
  position: absolute;
  left: 0;
  right: 0;
  bottom: -1px;
  height: 2px;
  background: transparent;
}
body .app-shell .main-content .pm-shell .pm-tabs.pm-tabs button.active,
body .app-shell .main-content .pm-shell .pm-tabs.pm-tabs button[aria-selected="true"],
body .app-shell .main-content .pm-shell .pm-tabs.pm-tabs button:hover,
body .app-shell .main-content .pm-shell .pm-tabs.pm-tabs button:focus-visible {
  color: var(--pm-foreground) !important;
  background: transparent !important;
  background-color: transparent !important;
  background-image: none !important;
  box-shadow: none !important;
  font-weight: 700;
}
body .app-shell .main-content .pm-shell .pm-tabs.pm-tabs button.active::after,
body .app-shell .main-content .pm-shell .pm-tabs.pm-tabs button[aria-selected="true"]::after {
  background: var(--pm-foreground);
}
.pm-detail {
  min-width: 0;
  display: grid;
  gap: 18px;
}
.pm-detail-crumbs {
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 10px;
  color: var(--pm-muted);
  font-size: 13px;
}
.pm-detail-crumbs button {
  border: 0;
  background: transparent !important;
  color: var(--pm-muted);
  padding: 0;
  font: inherit;
  cursor: pointer;
}
.pm-detail-crumbs span {
  color: var(--pm-foreground);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.pm-detail-hero-new {
  min-width: 0;
  display: grid;
  grid-template-columns: 198px minmax(0, 1fr) auto;
  align-items: center;
  gap: 20px;
}
.pm-detail-hero-new .pm-project-thumb {
  width: 198px;
  height: 150px;
  border-radius: 8px;
}
.pm-detail-hero-copy {
  min-width: 0;
  display: grid;
  gap: 9px;
}
.pm-detail-hero-meta {
  display: flex;
  align-items: center;
  gap: 9px;
}
.pm-detail-hero-meta button,
.pm-detail-hero-actions button,
.pm-detail-panel-head button,
.pm-detail-team-list button {
  border: 1px solid var(--pm-border);
  border-radius: 8px;
  background: var(--pm-card);
  color: var(--pm-foreground);
  min-height: 38px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 0 14px;
  font: inherit;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
}
.pm-detail-hero-meta button {
  width: 30px;
  min-height: 30px;
  padding: 0;
  border-radius: 999px;
}
.pm-detail-hero-copy h2 {
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 0;
  color: var(--pm-foreground);
  font-size: clamp(28px, 2.8vw, 36px);
  line-height: 1.05;
  letter-spacing: 0;
}
.pm-detail-hero-copy p,
.pm-detail-hero-copy > span {
  margin: 0;
  color: var(--pm-muted);
  font-size: 14px;
}
.pm-detail-hero-copy > span {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}
.pm-detail-hero-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 14px;
}
.pm-detail-hero-actions button:first-child {
  width: 54px;
  min-height: 54px;
  padding: 0;
}
.pm-detail-dashboard,
.pm-detail-left {
  min-width: 0;
  display: grid;
  gap: 16px;
}
.pm-detail-stats {
  min-width: 0;
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 14px;
}
.pm-detail-stat,
.pm-detail-panel {
  min-width: 0;
  border: 1px solid var(--pm-border);
  border-radius: 8px;
  background: linear-gradient(145deg, rgba(255,255,255,.045), rgba(255,255,255,.014));
  color: var(--pm-foreground);
}
.pm-detail-stat {
  min-height: 146px;
  padding: 20px;
  display: grid;
  align-content: space-between;
  gap: 12px;
}
.pm-detail-stat-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  color: var(--pm-muted);
  font-size: 13px;
}
.pm-detail-stat-head i {
  width: 30px;
  height: 30px;
  border-radius: 7px;
  display: grid;
  place-items: center;
  background: rgba(255,255,255,.07);
  font-style: normal;
}
.pm-detail-stat strong {
  font-size: 28px;
  line-height: 1;
  font-weight: 700;
}
.pm-detail-stat small {
  color: var(--pm-muted);
  font-size: 13px;
}
.pm-detail-main-grid {
  min-width: 0;
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(320px, 420px);
  gap: 16px;
  align-items: start;
}
.pm-detail-panel {
  padding: 18px;
}
.pm-detail-panel-head {
  min-width: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 16px;
}
.pm-detail-panel h3,
.pm-detail-panel-head h3 {
  margin: 0;
  color: var(--pm-foreground);
  font-size: 16px;
  line-height: 1.2;
  font-weight: 700;
}
.pm-detail-panel-head button {
  border: 0;
  min-height: auto;
  padding: 0;
  background: transparent !important;
  color: #60a5fa;
}
.pm-detail-budget-content {
  display: grid;
  grid-template-columns: 220px minmax(230px, .72fr) minmax(300px, 1fr);
  gap: 34px;
  align-items: center;
}
.pm-detail-donut {
  width: 190px;
  height: 190px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  position: relative;
  box-shadow: inset 0 0 0 1px rgba(255,255,255,.08);
}
.pm-detail-donut::after {
  content: "";
  position: absolute;
  inset: 34px;
  border-radius: 50%;
  background: var(--pm-background);
}
.pm-detail-donut div {
  position: relative;
  z-index: 1;
  display: grid;
  gap: 6px;
  text-align: center;
}
.pm-detail-donut strong {
  font-size: 20px;
}
.pm-detail-donut span,
.pm-detail-budget-legend span,
.pm-detail-budget-bar span,
.pm-detail-value span {
  color: var(--pm-muted);
}
.pm-detail-budget-legend {
  display: grid;
  gap: 18px;
}
.pm-detail-budget-legend p {
  display: grid;
  grid-template-columns: 12px minmax(0, 1fr) auto;
  align-items: center;
  gap: 12px;
  margin: 0;
}
.pm-detail-budget-legend i {
  width: 12px;
  height: 12px;
  border-radius: 999px;
}
.pm-detail-budget-legend strong {
  font-weight: 500;
  white-space: nowrap;
}
.pm-detail-budget-bars {
  display: grid;
  gap: 18px;
  border-left: 1px solid var(--pm-border);
  padding-left: 34px;
}
.pm-detail-budget-bars h4 {
  margin: 0 0 2px;
  font-size: 13px;
  color: var(--pm-foreground);
}
.pm-detail-budget-bar {
  display: grid;
  grid-template-columns: 110px minmax(120px, 1fr) auto;
  align-items: center;
  gap: 14px;
  font-size: 13px;
}
.pm-detail-budget-bar i {
  height: 11px;
  border-radius: 999px;
  background: rgba(255,255,255,.12);
  overflow: hidden;
}
.pm-detail-budget-bar b {
  display: block;
  height: 100%;
  border-radius: inherit;
}
.pm-detail-lower-grid {
  display: grid;
  grid-template-columns: minmax(240px, .78fr) minmax(320px, 1fr) minmax(260px, .78fr);
  gap: 16px;
}
.pm-detail-timeline-list,
.pm-detail-team-list,
.pm-detail-activity-list {
  display: grid;
  gap: 14px;
}
.pm-detail-timeline-list article {
  display: grid;
  grid-template-columns: 20px minmax(0, 1fr) auto;
  align-items: start;
  gap: 12px;
}
.pm-detail-timeline-list article > i {
  width: 16px;
  height: 16px;
  margin-top: 2px;
  border: 2px solid #52525b;
  border-radius: 999px;
  background: var(--pm-card);
}
.pm-detail-timeline-list article.state-done > i {
  border-color: #3fcf54;
  background: #3fcf54;
}
.pm-detail-timeline-list article.state-in-progress > i {
  border-color: #3b82f6;
  background: #3b82f6;
}
.pm-detail-timeline-list strong,
.pm-detail-team-list strong,
.pm-detail-activity-list strong {
  display: block;
  color: var(--pm-foreground);
  font-size: 13px;
  line-height: 1.35;
}
.pm-detail-timeline-list span,
.pm-detail-team-list span,
.pm-detail-activity-list small {
  color: var(--pm-muted);
  font-size: 12px;
}
.pm-detail-timeline-list em {
  border-radius: 999px;
  background: rgba(255,255,255,.08);
  color: var(--pm-muted);
  padding: 4px 9px;
  font-size: 11px;
  font-style: normal;
  white-space: nowrap;
}
.pm-detail-photo-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 6px;
}
.pm-detail-photo-tile {
  position: relative;
  min-height: 112px;
  border: 1px solid var(--pm-border-soft);
  border-radius: 7px;
  overflow: hidden;
  background-color: var(--pm-background);
  background-size: cover;
  background-position: center;
}
.pm-detail-photo-tile::before,
.pm-detail-photo-tile::after {
  display: none;
}
.pm-detail-photos .pm-empty {
  min-height: 238px;
}
.pm-detail-team-list article,
.pm-detail-activity-list article {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto auto;
  align-items: center;
  gap: 12px;
}
.pm-detail-team-list button {
  width: 30px;
  min-height: 30px;
  padding: 0;
  border: 0;
  background: transparent !important;
  color: var(--pm-muted);
}
.pm-detail-right {
  min-width: 0;
  display: grid;
  gap: 16px;
}
.pm-detail-info-card,
.pm-detail-description-card {
  display: grid;
  gap: 12px;
}
.pm-detail-value {
  display: grid;
  grid-template-columns: minmax(112px, .72fr) minmax(0, 1fr);
  align-items: center;
  gap: 16px;
  margin: 0;
  font-size: 13px;
}
.pm-detail-value strong {
  min-width: 0;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: var(--pm-foreground);
  font-weight: 500;
  overflow-wrap: anywhere;
}
.pm-detail-dot-text i {
  width: 8px;
  height: 8px;
  border-radius: 999px;
  background: #3fcf54;
}
.pm-detail-description-card p {
  margin: 0;
  color: var(--pm-muted);
  font-size: 13px;
  line-height: 1.5;
}
.pm-detail-description-card button {
  justify-self: start;
  border: 0;
  background: transparent !important;
  color: #60a5fa;
  padding: 0;
  font: inherit;
  font-size: 13px;
  cursor: pointer;
}
.pm-detail-activity-list article {
  grid-template-columns: 34px minmax(0, 1fr);
}
.pm-detail-activity-list article > span {
  width: 34px;
  height: 34px;
  border-radius: 7px;
  display: grid;
  place-items: center;
  background: #3b82f6;
  color: #fff;
}
.pm-task-board-toolbar {
  min-width: 0;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
  margin-bottom: 16px;
}
.pm-task-board-toolbar h2 {
  min-width: 0;
  margin: 0;
  color: var(--pm-foreground);
  font-size: 18px;
  line-height: 1.2;
  font-weight: 600;
  overflow-wrap: anywhere;
}
.pm-task-board-toolbar p {
  margin: 4px 0 0;
  color: var(--pm-muted);
  font-size: 13px;
  line-height: 1.4;
}
.pm-task-board-toolbar-meta {
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  gap: 12px;
}
.pm-task-board-add {
  min-height: 38px;
}
.pm-workload-member {
  min-width: 0;
  display: inline-flex;
  align-items: center;
  gap: 10px;
}
.pm-workload-member strong {
  color: var(--pm-foreground);
  font-weight: 700;
}
.pm-workload-cell {
  display: inline-flex;
  align-items: center;
  gap: 10px;
}
.pm-workload-cell b {
  min-width: 38px;
  color: var(--pm-foreground);
  font-size: 12px;
  font-weight: 700;
}
body .app-shell .main-content .pm-detail .pm-detail-stat,
body .app-shell .main-content .pm-detail .pm-detail-panel {
  background-color: var(--pm-card) !important;
}
body .app-shell .main-content .pm-detail .pm-detail-hero-meta button:hover,
body .app-shell .main-content .pm-detail .pm-detail-hero-actions button:hover,
body .app-shell .main-content .pm-detail .pm-detail-panel-head button:hover,
body .app-shell .main-content .pm-detail .pm-detail-team-list button:hover,
body .app-shell .main-content .pm-detail .pm-detail-description-card button:hover,
body .app-shell .main-content .pm-detail .pm-detail-crumbs button:hover {
  background: transparent !important;
  background-color: transparent !important;
}
.pm-project-directory {
  min-width: 0;
  display: grid;
  gap: 12px;
  background: transparent !important;
}
.pm-project-toolbar {
  min-width: 0;
  display: flex;
  justify-content: flex-end;
  align-items: center;
  background: transparent !important;
  border: 0 !important;
  box-shadow: none !important;
  padding: 0 !important;
}
.pm-project-toolbar > :not(.pm-project-view-switch) {
  display: none !important;
}
.pm-project-view-switch,
.pm-project-action {
  border: 1px solid var(--pm-border);
  border-radius: 8px;
  background: var(--pm-card);
  color: var(--pm-foreground);
}
.pm-project-view-switch {
  height: 40px;
  display: inline-grid;
  grid-template-columns: 38px 38px;
  gap: 4px;
  padding: 3px;
}
.pm-project-view-switch button,
.pm-project-pagination button,
.pm-project-action {
  display: grid;
  place-items: center;
  cursor: pointer;
  transform: none !important;
}
.pm-project-view-switch button {
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: var(--pm-muted);
}
.pm-project-view-switch button.active,
.pm-project-view-switch button:hover {
  background: var(--pm-card-hover);
  color: var(--pm-foreground);
}
.pm-project-table-frame {
  width: 100%;
  min-width: 0;
  overflow-x: auto;
  border: 0;
  border-top: 1px solid var(--pm-border);
  border-bottom: 1px solid var(--pm-border);
  border-radius: 0;
  background: var(--pm-background);
}
.pm-project-table {
  width: 100%;
  min-width: 1430px;
  table-layout: fixed;
  border-collapse: collapse !important;
  border-spacing: 0 !important;
}
.pm-project-table th:nth-child(1),
.pm-project-table td:nth-child(1) { width: 268px; }
.pm-project-table th:nth-child(2),
.pm-project-table td:nth-child(2) { width: 160px; }
.pm-project-table th:nth-child(3),
.pm-project-table td:nth-child(3) { width: 105px; }
.pm-project-table th:nth-child(4),
.pm-project-table td:nth-child(4) { width: 95px; }
.pm-project-table th:nth-child(5),
.pm-project-table td:nth-child(5) { width: 130px; }
.pm-project-table th:nth-child(6),
.pm-project-table td:nth-child(6) { width: 162px; }
.pm-project-table th:nth-child(7),
.pm-project-table td:nth-child(7),
.pm-project-table th:nth-child(8),
.pm-project-table td:nth-child(8) { width: 95px; }
.pm-project-table th:nth-child(9),
.pm-project-table td:nth-child(9) { width: 50px; }
.pm-project-table th:nth-child(10),
.pm-project-table td:nth-child(10) { width: 65px; }
.pm-project-table th:nth-child(11),
.pm-project-table td:nth-child(11) { width: 72px; }
.pm-project-table th,
.pm-project-table td {
  border-bottom: 1px solid var(--pm-border-soft);
  padding: 12px 10px !important;
  text-align: left;
  vertical-align: middle;
  font-size: 13px;
}
.pm-project-table th {
  height: 48px;
  background: transparent !important;
  color: var(--pm-foreground) !important;
  font-weight: 600 !important;
  letter-spacing: 0 !important;
  text-transform: none !important;
  white-space: nowrap;
}
.pm-project-table th button {
  border: 0 !important;
  border-color: transparent !important;
  background: transparent !important;
  background-color: transparent !important;
  background-image: none !important;
  color: inherit !important;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 0 !important;
  font: inherit;
  cursor: pointer;
  transform: none !important;
  box-shadow: none !important;
}
.pm-project-table th button:hover,
.pm-project-table th button:focus-visible {
  border-color: transparent !important;
  background: transparent !important;
  background-color: transparent !important;
  background-image: none !important;
  box-shadow: none !important;
  color: inherit !important;
}
.pm-project-table td {
  background: transparent !important;
  color: var(--pm-foreground) !important;
}
.pm-project-table td:nth-child(7),
.pm-project-table td:nth-child(8),
.pm-project-table td:nth-child(9),
.pm-project-table td:nth-child(10),
.pm-project-table td:nth-child(11) {
  white-space: nowrap;
}
.pm-project-table th:nth-child(6),
.pm-project-table td:nth-child(6) {
  padding-left: 14px !important;
}
.pm-project-table tbody tr:last-child td {
  border-bottom: 0;
}
.pm-project-table tbody tr:hover td {
  background: var(--pm-background);
}
body .app-shell .main-content .pm-project-table {
  border-collapse: collapse !important;
  border-spacing: 0 !important;
}
body .app-shell .main-content .pm-project-table thead th,
body .app-shell .main-content .pm-project-table thead td {
  background: transparent !important;
  color: var(--pm-foreground) !important;
  font-size: 13px !important;
  font-weight: 600 !important;
  letter-spacing: 0 !important;
  text-transform: none !important;
}
body .app-shell .main-content .pm-project-table th,
body .app-shell .main-content .pm-project-table td {
  padding: 12px 10px !important;
  line-height: 1.35 !important;
}
body .app-shell .main-content .pm-project-table tbody tr {
  border-radius: 0 !important;
  box-shadow: none !important;
}
body .app-shell .main-content .pm-project-table tbody td:first-child,
body .app-shell .main-content .pm-project-table tbody td:last-child {
  border-radius: 0 !important;
}
body .app-shell .main-content .pm-project-table tbody tr:hover td {
  background: var(--pm-background) !important;
}
.pm-project-name-cell {
  min-width: 0;
  display: grid;
  grid-template-columns: 76px minmax(0, 1fr);
  align-items: center;
  gap: 12px;
  background: transparent !important;
  background-color: transparent !important;
  background-image: none !important;
  box-shadow: none !important;
}
.pm-project-title-block,
.pm-project-grid-head span,
.pm-project-budget-cell {
  min-width: 0;
  display: grid;
  gap: 4px;
  background: transparent !important;
  background-color: transparent !important;
  background-image: none !important;
  box-shadow: none !important;
}
.pm-project-name-cell button,
.pm-project-grid-head button:first-child {
  min-width: 0;
  border: 0 !important;
  border-color: transparent !important;
  background: transparent !important;
  background-color: transparent !important;
  background-image: none !important;
  color: var(--pm-foreground) !important;
  padding: 0 !important;
  text-align: left;
  font-size: 13px;
  font-weight: 700;
  line-height: 1.25;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  cursor: pointer;
  transform: none !important;
  box-shadow: none !important;
  filter: none !important;
}
.pm-project-name-cell button:hover,
.pm-project-name-cell button:focus-visible,
.pm-project-grid-head button:first-child:hover,
.pm-project-grid-head button:first-child:focus-visible {
  border-color: transparent !important;
  background: transparent !important;
  background-color: transparent !important;
  background-image: none !important;
  box-shadow: none !important;
  color: var(--pm-foreground) !important;
  outline: none;
}
.pm-project-name-cell small,
.pm-project-grid-head small,
.pm-project-budget-cell small,
.pm-project-grid-meta small,
.pm-project-overview small {
  color: var(--pm-muted);
  font-size: 12px;
  font-weight: 500;
}
.pm-project-thumb {
  position: relative;
  width: 76px;
  height: 50px;
  border: 1px solid var(--pm-border);
  border-radius: 7px;
  display: block;
  overflow: hidden;
  background:
    linear-gradient(180deg, rgba(255,255,255,.22), transparent 42%),
    linear-gradient(135deg, #64748b, #18181b);
}
.pm-project-thumb-image {
  width: 100%;
  height: 100%;
  display: block;
  object-fit: cover;
  background-size: cover;
  background-position: center;
}
.pm-project-thumb:has(.pm-project-thumb-image)::before,
.pm-project-thumb:has(.pm-project-thumb-image)::after {
  display: none;
}
.pm-project-thumb::before,
.pm-project-thumb::after,
.pm-project-thumb i,
.pm-project-thumb b,
.pm-project-thumb em {
  position: absolute;
  content: "";
  display: block;
}
.pm-project-thumb::before {
  left: 8px;
  right: 8px;
  bottom: 8px;
  height: 24px;
  border: 2px solid rgba(255,255,255,.72);
  border-bottom-width: 5px;
}
.pm-project-thumb::after {
  left: 18px;
  bottom: 8px;
  width: 2px;
  height: 34px;
  background: rgba(255,255,255,.8);
  box-shadow: 14px 0 rgba(255,255,255,.45), 28px 0 rgba(255,255,255,.7);
}
.pm-project-thumb i {
  left: 6px;
  right: 6px;
  bottom: 30px;
  height: 2px;
  background: rgba(255,255,255,.72);
  transform: skewY(-12deg);
}
.pm-project-thumb b {
  left: 0;
  right: 0;
  bottom: 0;
  height: 9px;
  background: rgba(0,0,0,.28);
}
.pm-project-thumb em {
  right: 8px;
  top: 8px;
  width: 24px;
  height: 15px;
  border: 2px solid rgba(255,255,255,.58);
  transform: skewX(-22deg);
}
.pm-project-thumb.variant-1 { background: linear-gradient(180deg, rgba(255,255,255,.20), transparent 44%), linear-gradient(135deg, #475569, #0f172a); }
.pm-project-thumb.variant-2 { background: linear-gradient(180deg, rgba(255,255,255,.18), transparent 44%), linear-gradient(135deg, #71717a, #1f2937); }
.pm-project-thumb.variant-3 { background: linear-gradient(180deg, rgba(255,255,255,.22), transparent 44%), linear-gradient(135deg, #94a3b8, #27272a); }
.pm-project-thumb.variant-4 { background: linear-gradient(180deg, rgba(255,255,255,.18), transparent 44%), linear-gradient(135deg, #52525b, #111827); }
.pm-project-owner,
.pm-project-progress-cell {
  min-width: 0;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  white-space: nowrap;
}
.pm-project-owner {
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
}
.pm-project-owner .pm-avatar {
  flex: 0 0 auto;
  margin-right: 0;
}
.pm-project-progress-cell .pm-progress {
  width: 82px !important;
  height: 7px;
}
.pm-project-progress-cell strong {
  font-size: 13px;
  font-weight: 600;
}
.pm-project-budget-cell strong {
  font-size: 14px;
  font-weight: 700;
}
.pm-project-badge {
  min-height: 28px;
  border: 1px solid var(--pm-border);
  border-radius: 7px;
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 0 10px;
  background: var(--pm-background);
  color: var(--pm-foreground);
  font-size: 12px;
  font-weight: 600;
  white-space: nowrap;
}
.pm-project-badge.is-editable {
  cursor: pointer;
}
.pm-project-badge i {
  width: 7px;
  height: 7px;
  border-radius: 999px;
  background: currentColor;
}
body .app-shell .main-content .pm-project-badge select,
.pm-project-badge select {
  appearance: none;
  width: auto !important;
  min-width: 0 !important;
  min-height: 0 !important;
  height: auto !important;
  border: 0 !important;
  outline: 0 !important;
  background: transparent !important;
  background-color: transparent !important;
  background-image: none !important;
  color: inherit !important;
  box-shadow: none !important;
  padding: 0 !important;
  font: inherit;
  font-weight: inherit;
  line-height: 1.2;
  cursor: pointer;
}
.pm-project-badge select option {
  background: var(--pm-card);
  color: var(--pm-foreground);
}
.pm-project-badge.is-editable:focus-within {
  border-color: rgba(255,255,255,.42);
  box-shadow: 0 0 0 3px var(--pm-ring);
}
.pm-project-badge.status-in-progress i,
.pm-project-badge.status-active i { color: #2f80ed; }
.pm-project-badge.status-completed i,
.pm-project-badge.status-on-track i { color: #22c55e; }
.pm-project-badge.status-planning i { color: #a855f7; }
.pm-project-badge.status-on-hold i,
.pm-project-badge.priority-medium i { color: #f59e0b; }
.pm-project-badge.status-cancelled i,
.pm-project-badge.priority-critical i { color: #ef4444; }
.pm-project-badge.priority-high i { color: #ef4444; }
.pm-project-badge.priority-low i { color: #94a3b8; }
.pm-project-action {
  width: 34px;
  height: 34px;
  margin-left: auto;
}
.pm-project-action:hover {
  background: var(--pm-card-hover);
}
.pm-project-actions {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  min-width: 0;
  background: transparent !important;
}
.pm-project-action-menu {
  position: absolute;
  top: calc(100% + 6px);
  right: 0;
  z-index: 30;
  width: 150px;
  display: grid;
  gap: 3px;
  border: 1px solid var(--pm-border);
  border-radius: 8px;
  background: var(--pm-card);
  padding: 5px;
  box-shadow: 0 16px 34px rgb(0 0 0 / .38);
}
.pm-project-actions.menu-up .pm-project-action-menu {
  top: auto;
  bottom: calc(100% + 6px);
}
.pm-project-action-menu button {
  width: 100%;
  height: 34px;
  display: flex;
  align-items: center;
  justify-content: flex-start;
  gap: 8px;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: var(--pm-foreground);
  padding: 0 9px;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  transform: none !important;
  box-shadow: none !important;
}
.pm-project-action-menu button:hover,
.pm-project-action-menu button:focus-visible {
  background: var(--pm-background);
  outline: none;
}
.pm-project-action-menu button svg {
  flex: 0 0 auto;
}
.pm-project-action-menu button.danger {
  color: #ffb4b4;
}
.pm-project-action-menu button:disabled {
  opacity: .5;
  cursor: not-allowed;
}
.pm-project-pagination {
  min-height: 44px;
  border: 0;
  border-top: 0;
  border-radius: 0;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  padding: 0 14px;
  color: var(--pm-muted);
  font-size: 13px;
}
.pm-project-pagination > div {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}
.pm-project-pagination button,
.pm-project-pagination strong {
  width: 34px;
  height: 34px;
  border: 1px solid var(--pm-border);
  border-radius: 8px;
  background: var(--pm-card);
  color: var(--pm-foreground);
}
.pm-project-pagination button:disabled {
  opacity: .45;
  cursor: not-allowed;
}
.pm-project-pagination strong {
  display: grid;
  place-items: center;
  background: var(--pm-foreground);
  color: var(--pm-background);
}
html[data-theme='dark'] body .app-shell .main-content .pm-project-directory,
html[data-theme='dark'] body .app-shell .main-content .pm-project-toolbar,
html[data-theme='dark'] body .app-shell .main-content .pm-project-table-frame,
html[data-theme='dark'] body .app-shell .main-content .pm-project-pagination,
html[data-theme='dark'] body .app-shell .main-content .pm-project-table,
html[data-theme='dark'] body .app-shell .main-content .pm-project-table th,
html[data-theme='dark'] body .app-shell .main-content .pm-project-table td,
html[data-theme='dark'] body .app-shell .main-content .pm-project-directory .pm-empty {
  background: var(--pm-background) !important;
  background-color: var(--pm-background) !important;
  background-image: none !important;
}
html[data-theme='dark'] body .app-shell .main-content .pm-project-view-switch,
html[data-theme='dark'] body .app-shell .main-content .pm-project-action,
html[data-theme='dark'] body .app-shell .main-content .pm-project-pagination button,
html[data-theme='dark'] body .app-shell .main-content .pm-project-directory .pm-empty-icon {
  background: var(--pm-background) !important;
  background-color: var(--pm-background) !important;
  background-image: none !important;
}
html[data-theme='dark'] body .app-shell .main-content .pm-project-view-switch button.active,
html[data-theme='dark'] body .app-shell .main-content .pm-project-view-switch button:hover,
html[data-theme='dark'] body .app-shell .main-content .pm-project-action:hover,
html[data-theme='dark'] body .app-shell .main-content .pm-project-table tbody tr:hover td {
  background: var(--pm-background) !important;
  background-color: var(--pm-background) !important;
  background-image: none !important;
}
body .app-shell .main-content .pm-project-table .pm-project-name-cell,
body .app-shell .main-content .pm-project-table .pm-project-title-block,
body .app-shell .main-content .pm-project-table .pm-project-title-block::before,
body .app-shell .main-content .pm-project-table .pm-project-title-block::after,
body .app-shell .main-content .pm-project-table .pm-project-name-cell button,
body .app-shell .main-content .pm-project-table .pm-project-name-cell button::before,
body .app-shell .main-content .pm-project-table .pm-project-name-cell button::after,
body .app-shell .main-content .pm-project-table tbody tr:hover .pm-project-name-cell,
body .app-shell .main-content .pm-project-table tbody tr:hover .pm-project-title-block,
body .app-shell .main-content .pm-project-table tbody tr:hover .pm-project-name-cell button {
  background: transparent !important;
  background-color: transparent !important;
  background-image: none !important;
  box-shadow: none !important;
  filter: none !important;
}
body .app-shell .main-content .pm-project-table .pm-project-title-block::before,
body .app-shell .main-content .pm-project-table .pm-project-title-block::after,
body .app-shell .main-content .pm-project-table .pm-project-name-cell button::before,
body .app-shell .main-content .pm-project-table .pm-project-name-cell button::after {
  content: none !important;
}
body .app-shell .main-content .pm-project-table .pm-project-name-cell button {
  width: auto !important;
  justify-self: start !important;
}
.pm-project-card-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(260px, 100%), 1fr));
  gap: 14px;
}
.pm-project-grid-card {
  min-width: 0;
  display: grid;
  gap: 13px;
  border: 1px solid var(--pm-border);
  border-radius: 8px;
  background: var(--pm-card);
  padding: 14px;
}
.pm-project-grid-card .pm-project-thumb {
  width: 100%;
  height: auto;
  aspect-ratio: 16 / 8;
}
.pm-project-grid-head {
  min-width: 0;
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 10px;
  align-items: start;
}
.pm-project-grid-badges {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.pm-project-grid-meta {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}
.pm-project-grid-meta span,
.pm-project-overview article {
  min-width: 0;
  display: grid;
  gap: 5px;
  border: 1px solid var(--pm-border-soft);
  border-radius: 8px;
  background: var(--pm-background);
  padding: 10px;
}
.pm-project-grid-meta strong,
.pm-project-overview strong {
  min-width: 0;
  overflow-wrap: anywhere;
  font-size: 13px;
  line-height: 1.25;
}
.pm-project-overview {
  display: grid;
  grid-template-columns: repeat(6, minmax(0, 1fr));
  gap: 14px;
}
.pm-project-overview article {
  min-height: 88px;
  align-content: center;
  background: var(--pm-card);
  border-color: var(--pm-border);
}
.pm-project-overview article strong {
  font-size: 22px;
}
.pm-project-overview-list {
  grid-column: 1 / -1;
  border: 1px solid var(--pm-border);
  border-radius: 8px;
  background: var(--pm-card);
  padding: 18px;
}
@media (max-width: 1100px) {
  .pm-project-overview {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}
@media (max-width: 700px) {
  body .app-shell .main-content .pm-page-tools:has(.pm-projects-primary) {
    justify-content: stretch;
  }
  body .app-shell .main-content .pm-projects-primary {
    width: 100%;
  }
  .pm-project-view-switch {
    width: 100%;
  }
  .pm-project-view-switch {
    grid-template-columns: 1fr 1fr;
  }
  .pm-project-pagination {
    min-height: 72px;
    align-items: flex-start;
    flex-direction: column;
    padding: 12px;
  }
  .pm-project-overview {
    grid-template-columns: 1fr;
  }
}
`
