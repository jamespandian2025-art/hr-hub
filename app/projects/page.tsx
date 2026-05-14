'use client'

import { ChangeEvent, useEffect, useMemo, useState } from 'react'

const font = "var(--font-body)"
const storageKey = 'flowsys-projects'
const clientsStorageKey = 'flowsys-clients'
const projectTasksStorageKey = 'flowsys-project-tasks'
const projectMessagesStorageKey = 'flowsys-project-messages'
const projectAttachmentsStorageKey = 'flowsys-project-attachments'
const projectProgressStorageKey = 'flowsys-project-progress'
const changeOrdersStorageKey = 'flowsys-change-orders'
const assignedTasksStorageKey = 'flowsys-assigned-tasks'
const tabs = ['All', 'Pending', 'Ongoing', 'Completed', 'With issue'] as const
const projectDetailTabs = ['Overview', 'Progress', 'Change Orders', 'Tasks', 'Chat', 'Financials', 'Attachments', 'Settings'] as const
const financialTabs = ['Summary', 'Budget', 'Bills and Expenses', 'Purchase Orders', 'Invoices'] as const
const categories = [
  { key: 'materialCost', label: 'Material cost', color: '#22c55e' },
  { key: 'laborCost', label: 'Labor cost', color: '#4ade80' },
  { key: 'overheadProfit', label: 'Overhead profit', color: '#535353' },
  { key: 'generalExpense', label: 'General expense', color: '#191414' },
] as const

type Tab = (typeof tabs)[number]
type ProjectDetailTab = (typeof projectDetailTabs)[number]
type FinancialTab = (typeof financialTabs)[number]
type ProjectStatus = 'Pending' | 'Ongoing' | 'Completed' | 'With issue'
type ProjectTaskStatus = 'Open' | 'Completed'
type ProjectViewMode = 'Table' | 'Kanban' | 'Grid'

interface Project {
  id: number
  name: string
  client: string
  location: string
  projectCost?: number
  startDate: string
  endDate: string
  status: ProjectStatus
  materialCost?: number
  laborCost?: number
  overheadProfit?: number
  generalExpense?: number
  paidAmount?: number
  unpaidAmount?: number
  notes: string
}

interface ClientRecord {
  id: number
  name: string
  email: string
  contact: string
  completed: number
  total: number
  cost: number
  color: string
}

interface ProjectTask {
  id: number
  projectId: number
  title: string
  dueDate: string
  notes: string
  status: ProjectTaskStatus
  createdAt: string
}

interface ProjectMessage {
  id: number
  projectId: number
  author: string
  message: string
  createdAt: string
}

interface ProjectAttachment {
  id: number
  projectId: number
  name: string
  size: number
  addedAt: string
}

interface ProjectProgressUpdate {
  id: number
  projectId: number
  phase: string
  title: string
  remarks: string
  updateDate: string
  author: string
  notifyClient: boolean
  files: string[]
  createdAt: string
}

type ChangeOrderStatus = 'Requested' | 'Priced' | 'Approved' | 'Rejected'

interface ChangeOrder {
  id: number
  projectId: number
  clientName: string
  title: string
  description: string
  requestedBy: string
  status: ChangeOrderStatus
  priceImpact: number
  timelineImpact: number
  files: string[]
  createdAt: string
  decidedAt?: string
}

type AssignedTaskStatus = 'Open' | 'In Progress' | 'Completed'

interface AssignedTask {
  id: number
  projectId: number
  changeOrderId?: number
  title: string
  description: string
  assignee: string
  dueDate: string
  status: AssignedTaskStatus
  source: 'Change Order' | 'Manual'
  createdAt: string
}

const initialClients: ClientRecord[] = [
  { id: 1, name: 'Jessica Fields', email: 'Jessicajaneteran@gmail.com', contact: '-', completed: 0, total: 0, cost: 0, color: '#22c55e' },
  { id: 2, name: 'Joey Ong', email: 'Joey@ronincollective.ph', contact: '-', completed: 0, total: 0, cost: 0, color: '#4ade80' },
  { id: 3, name: 'Happy Alino', email: 'cjalinoproperties@gmail.com', contact: '-', completed: 0, total: 0, cost: 0, color: '#535353' },
]

const statusStyle: Record<ProjectStatus, { bg: string; color: string }> = {
  Ongoing: { bg: '#effff4', color: '#22c55e' },
  Pending: { bg: '#f5f5f5', color: '#535353' },
  Completed: { bg: '#e8fbea', color: '#4ade80' },
  'With issue': { bg: '#eeeeee', color: '#191414' },
}

const validProjectStatuses: ProjectStatus[] = ['Pending', 'Ongoing', 'Completed', 'With issue']

const normalizeProjectStatus = (status: unknown): ProjectStatus => {
  return validProjectStatuses.includes(status as ProjectStatus) ? (status as ProjectStatus) : 'Pending'
}

const getStatusStyle = (status: unknown) => statusStyle[normalizeProjectStatus(status)]

const safeNumber = (value: unknown) => {
  const numberValue = Number(value ?? 0)
  return Number.isFinite(numberValue) ? numberValue : 0
}

const normalizeProject = (project: Partial<Project>, index: number): Project => {
  const projectCost = safeNumber(project.projectCost)
  const paidAmount = safeNumber(project.paidAmount)
  const unpaidAmount = project.unpaidAmount === undefined ? Math.max(projectCost - paidAmount, 0) : safeNumber(project.unpaidAmount)

  return {
    id: safeNumber(project.id) || index + 1,
    name: String(project.name || 'Untitled Project'),
    client: String(project.client || '-'),
    location: String(project.location || '-'),
    projectCost,
    startDate: String(project.startDate || '2026-05-06'),
    endDate: String(project.endDate || '2026-05-06'),
    status: normalizeProjectStatus(project.status),
    materialCost: safeNumber(project.materialCost),
    laborCost: safeNumber(project.laborCost),
    overheadProfit: safeNumber(project.overheadProfit),
    generalExpense: safeNumber(project.generalExpense),
    paidAmount,
    unpaidAmount,
    notes: String(project.notes || ''),
  }
}

const fieldStyle = {
  width: '100%',
  padding: '10px 12px',
  border: '1px solid #e5e7eb',
  borderRadius: '8px',
  outline: 'none',
  fontSize: '13px',
  color: '#374151',
  background: '#fff',
}

const fieldGroupStyle = {
  display: 'grid',
  gap: '7px',
}

const labelStyle = {
  fontSize: '12px',
  color: '#374151',
  fontWeight: 600,
}

const buttonStyle = {
  padding: '10px 18px',
  borderRadius: '10px',
  border: 'none',
  fontSize: '13px',
  fontWeight: 600,
  cursor: 'pointer',
}

const loadProjects = () => {
  if (typeof window === 'undefined') return []

  try {
    const stored = window.localStorage.getItem(storageKey)
    return stored ? (JSON.parse(stored) as Partial<Project>[]).map(normalizeProject) : []
  } catch {
    return []
  }
}

const loadClients = () => {
  if (typeof window === 'undefined') return initialClients

  try {
    const stored = window.localStorage.getItem(clientsStorageKey)
    return stored ? (JSON.parse(stored) as ClientRecord[]) : initialClients
  } catch {
    return initialClients
  }
}

const loadStored = <T,>(key: string, fallback: T[]): T[] => {
  if (typeof window === 'undefined') return fallback

  try {
    const stored = window.localStorage.getItem(key)
    return stored ? (JSON.parse(stored) as T[]) : fallback
  } catch {
    return fallback
  }
}

const money = (value: number | undefined | null) => `PHP ${(value ?? 0).toLocaleString('en-PH')}.00`
const nextId = (records: Project[]) => records.reduce((max, record) => Math.max(max, record.id), 0) + 1
const nextClientId = (records: ClientRecord[]) => records.reduce((max, record) => Math.max(max, record.id), 0) + 1
const nextRecordId = <T extends { id: number }>(records: T[]) => records.reduce((max, record) => Math.max(max, record.id), 0) + 1
const colorFor = (id: number) => ['#22c55e', '#4ade80', '#535353', '#191414', '#b3b3b3'][id % 5]
const statusLabel = (status: unknown) => normalizeProjectStatus(status).toUpperCase()
const duration = (project: Project) => `${project.startDate || '-'} - ${project.endDate || '-'}`
const formatDateTime = (date: string) =>
  new Date(date).toLocaleString('en-PH', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
const fileSize = (size: number) => (size >= 1024 * 1024 ? `${(size / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(size / 1024))} KB`)
const teamMembers = ['Anna', 'Mark', 'Leo', 'John', 'Jane', 'Paul', 'Mike', 'Project Manager', 'Support']

export default function ProjectsPage() {
  const [mounted, setMounted] = useState(false)
  const [projects, setProjects] = useState<Project[]>([])
  const [clientRecords, setClientRecords] = useState<ClientRecord[]>(initialClients)
  const [activeTab, setActiveTab] = useState<Tab>('All')
  const [viewMode, setViewMode] = useState<ProjectViewMode>('Table')
  const [search, setSearch] = useState('')
  const [clientFilter, setClientFilter] = useState('All')
  const [selected, setSelected] = useState<number[]>([])
  const [draggedProjectId, setDraggedProjectId] = useState<number | null>(null)
  const [openMenu, setOpenMenu] = useState<number | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null)
  const [projectDetailTab, setProjectDetailTab] = useState<ProjectDetailTab>('Overview')
  const [financialTab, setFinancialTab] = useState<FinancialTab>('Summary')
  const [financialSearch, setFinancialSearch] = useState('')
  const [financialStatusOpen, setFinancialStatusOpen] = useState(false)
  const [financialStatuses, setFinancialStatuses] = useState<string[]>([])
  const [projectTasks, setProjectTasks] = useState<ProjectTask[]>([])
  const [projectMessages, setProjectMessages] = useState<ProjectMessage[]>([])
  const [projectAttachments, setProjectAttachments] = useState<ProjectAttachment[]>([])
  const [projectProgress, setProjectProgress] = useState<ProjectProgressUpdate[]>([])
  const [changeOrders, setChangeOrders] = useState<ChangeOrder[]>([])
  const [assignedTasks, setAssignedTasks] = useState<AssignedTask[]>([])
  const [taskTitle, setTaskTitle] = useState('')
  const [taskDueDate, setTaskDueDate] = useState('2026-05-06')
  const [taskNotes, setTaskNotes] = useState('')
  const [chatMessage, setChatMessage] = useState('')
  const [progressPhase, setProgressPhase] = useState('Foundation')
  const [progressTitle, setProgressTitle] = useState('')
  const [progressRemarks, setProgressRemarks] = useState('')
  const [progressDate, setProgressDate] = useState('2026-05-06')
  const [progressFiles, setProgressFiles] = useState<string[]>([])
  const [progressNotifyClient, setProgressNotifyClient] = useState(true)
  const [pricingOrderId, setPricingOrderId] = useState<number | null>(null)
  const [priceImpact, setPriceImpact] = useState(0)
  const [timelineImpact, setTimelineImpact] = useState(0)
  const [assigningOrderId, setAssigningOrderId] = useState<number | null>(null)
  const [taskAssignee, setTaskAssignee] = useState('Anna')
  const [taskDueDateFromOrder, setTaskDueDateFromOrder] = useState('2026-05-06')

  const [name, setName] = useState('')
  const [client, setClient] = useState('')
  const [addingClient, setAddingClient] = useState(false)
  const [manualClient, setManualClient] = useState('')
  const [location, setLocation] = useState('')
  const [projectCost, setProjectCost] = useState(0)
  const [startDate, setStartDate] = useState('2026-05-06')
  const [endDate, setEndDate] = useState('2026-05-06')
  const [status, setStatus] = useState<ProjectStatus>('Pending')
  const [materialCost, setMaterialCost] = useState(0)
  const [laborCost, setLaborCost] = useState(0)
  const [overheadProfit, setOverheadProfit] = useState(0)
  const [generalExpense, setGeneralExpense] = useState(0)
  const [paidAmount, setPaidAmount] = useState(0)
  const [notes, setNotes] = useState('')
  const calculatedUnpaidAmount = Math.max(projectCost - paidAmount, 0)

  useEffect(() => {
    setMounted(true)
    setProjects(loadProjects())
    setClientRecords(loadClients())
    setProjectTasks(loadStored<ProjectTask>(projectTasksStorageKey, []))
    setProjectMessages(loadStored<ProjectMessage>(projectMessagesStorageKey, []))
    setProjectAttachments(loadStored<ProjectAttachment>(projectAttachmentsStorageKey, []))
    setProjectProgress(loadStored<ProjectProgressUpdate>(projectProgressStorageKey, []))
    setChangeOrders(loadStored<ChangeOrder>(changeOrdersStorageKey, []))
    setAssignedTasks(loadStored<AssignedTask>(assignedTasksStorageKey, []))
  }, [])

  useEffect(() => {
    if (!mounted) return
    window.localStorage.setItem(storageKey, JSON.stringify(projects))
  }, [mounted, projects])

  useEffect(() => {
    if (!mounted) return
    window.localStorage.setItem(clientsStorageKey, JSON.stringify(clientRecords))
  }, [mounted, clientRecords])

  useEffect(() => {
    if (!mounted) return
    window.localStorage.setItem(projectTasksStorageKey, JSON.stringify(projectTasks))
  }, [mounted, projectTasks])

  useEffect(() => {
    if (!mounted) return
    window.localStorage.setItem(projectMessagesStorageKey, JSON.stringify(projectMessages))
  }, [mounted, projectMessages])

  useEffect(() => {
    if (!mounted) return
    window.localStorage.setItem(projectAttachmentsStorageKey, JSON.stringify(projectAttachments))
  }, [mounted, projectAttachments])

  useEffect(() => {
    if (!mounted) return
    window.localStorage.setItem(projectProgressStorageKey, JSON.stringify(projectProgress))
  }, [mounted, projectProgress])

  useEffect(() => {
    if (!mounted) return
    window.localStorage.setItem(changeOrdersStorageKey, JSON.stringify(changeOrders))
  }, [mounted, changeOrders])

  useEffect(() => {
    if (!mounted) return
    window.localStorage.setItem(assignedTasksStorageKey, JSON.stringify(assignedTasks))
  }, [mounted, assignedTasks])

  const clients = useMemo(() => clientRecords.map(record => record.name), [clientRecords])

  const filtered = projects.filter(project => {
    const matchesTab = activeTab === 'All' || project.status === activeTab
    const matchesClient = clientFilter === 'All' || project.client === clientFilter
    const matchesSearch =
      project.name.toLowerCase().includes(search.toLowerCase()) ||
      project.location.toLowerCase().includes(search.toLowerCase()) ||
      project.client.toLowerCase().includes(search.toLowerCase())

    return matchesTab && matchesClient && matchesSearch
  })

  const analytics = useMemo(() => {
    const totalBills = projects.reduce(
      (sum, project) => sum + (project.materialCost ?? 0) + (project.laborCost ?? 0) + (project.overheadProfit ?? 0) + (project.generalExpense ?? 0),
      0
    )
    const paid = projects.reduce((sum, project) => sum + (project.paidAmount ?? 0), 0)
    const unpaid = projects.reduce((sum, project) => sum + (project.unpaidAmount ?? 0), 0)
    const categorySummary = categories.map(category => {
      const amount = projects.reduce((sum, project) => sum + Number(project[category.key]), 0)
      const count = projects.filter(project => Number(project[category.key]) > 0).length
      return { ...category, amount, count }
    })

    return { totalBills, paid, unpaid, categorySummary }
  }, [projects])

  let donutCursor = 0
  const donutGradient = analytics.totalBills
    ? analytics.categorySummary
        .filter(item => item.amount > 0)
        .map(item => {
          const start = donutCursor
          const end = donutCursor + (item.amount / analytics.totalBills) * 100
          donutCursor = end
          return `${item.color} ${start}% ${end}%`
        })
        .join(', ')
    : '#f3f4f6 0% 100%'

  const tabCount = (tab: Tab) => (tab === 'All' ? projects.length : projects.filter(project => project.status === tab).length)
  const selectedProject = projects.find(project => project.id === selectedProjectId)

  const resetForm = () => {
    setName('')
    setClient('')
    setAddingClient(false)
    setManualClient('')
    setLocation('')
    setProjectCost(0)
    setStartDate('2026-05-06')
    setEndDate('2026-05-06')
    setStatus('Pending')
    setMaterialCost(0)
    setLaborCost(0)
    setOverheadProfit(0)
    setGeneralExpense(0)
    setPaidAmount(0)
    setNotes('')
    setEditingId(null)
  }

  const closeForm = () => {
    resetForm()
    setShowForm(false)
  }

  const startCreate = () => {
    resetForm()
    setShowForm(true)
  }

  const startEdit = (project: Project) => {
    setEditingId(project.id)
    setName(project.name)
    setClient(project.client === '-' ? '' : project.client)
    setAddingClient(false)
    setManualClient('')
    setLocation(project.location === '-' ? '' : project.location)
    setProjectCost(project.projectCost ?? 0)
    setStartDate(project.startDate)
    setEndDate(project.endDate)
    setStatus(normalizeProjectStatus(project.status))
    setMaterialCost(project.materialCost ?? 0)
    setLaborCost(project.laborCost ?? 0)
    setOverheadProfit(project.overheadProfit ?? 0)
    setGeneralExpense(project.generalExpense ?? 0)
    setPaidAmount(project.paidAmount ?? 0)
    setNotes(project.notes)
    setShowForm(true)
    setOpenMenu(null)
  }

  const saveProject = () => {
    const trimmedName = name.trim()
    if (!trimmedName) return
    const finalClient = addingClient ? manualClient.trim() : client.trim()

    if (addingClient && finalClient) {
      setClientRecords(previous => {
        const exists = previous.some(record => record.name.toLowerCase() === finalClient.toLowerCase())
        if (exists) return previous

        const id = nextClientId(previous)
        return [
          ...previous,
          {
            id,
            name: finalClient,
            email: '-',
            contact: '-',
            completed: 0,
            total: 0,
            cost: 0,
            color: colorFor(id),
          },
        ]
      })
    }

    const nextProject = {
      name: trimmedName,
      client: finalClient || '-',
      location: location.trim() || '-',
      projectCost,
      startDate,
      endDate,
      status,
      materialCost,
      laborCost,
      overheadProfit,
      generalExpense,
      paidAmount,
      unpaidAmount: calculatedUnpaidAmount,
      notes,
    }

    if (editingId) {
      setProjects(previous =>
        previous.map(project => (project.id === editingId ? { ...project, ...nextProject } : project))
      )
    } else {
      setProjects(previous => [...previous, { id: nextId(previous), ...nextProject }])
    }

    closeForm()
  }

  const deleteProject = (id: number) => {
    setProjects(previous => previous.filter(project => project.id !== id))
    setSelected(previous => previous.filter(projectId => projectId !== id))
    setOpenMenu(null)
  }

  const updateProjectStatus = (id: number, nextStatus: ProjectStatus) => {
    setProjects(previous => previous.map(project => project.id === id ? { ...project, status: nextStatus } : project))
  }

  const dropProjectToStatus = (nextStatus: ProjectStatus) => {
    if (!draggedProjectId) return
    updateProjectStatus(draggedProjectId, nextStatus)
    setDraggedProjectId(null)
  }

  const toggleSelect = (id: number) => {
    setSelected(previous => (previous.includes(id) ? previous.filter(item => item !== id) : [...previous, id]))
  }

  const toggleSelectAll = () => {
    const filteredIds = filtered.map(project => project.id)
    const allSelected = filteredIds.length > 0 && filteredIds.every(id => selected.includes(id))
    setSelected(previous => (allSelected ? previous.filter(id => !filteredIds.includes(id)) : Array.from(new Set([...previous, ...filteredIds]))))
  }

  const openProjectDetail = (id: number) => {
    setSelectedProjectId(id)
    setProjectDetailTab('Overview')
    setFinancialTab('Summary')
    setFinancialSearch('')
    setFinancialStatusOpen(false)
    setFinancialStatuses([])
    setOpenMenu(null)
  }

  const addProjectTask = (projectId: number) => {
    const trimmedTitle = taskTitle.trim()
    if (!trimmedTitle) return

    setProjectTasks(previous => [
      ...previous,
      {
        id: nextRecordId(previous),
        projectId,
        title: trimmedTitle,
        dueDate: taskDueDate,
        notes: taskNotes.trim(),
        status: 'Open',
        createdAt: new Date().toISOString(),
      },
    ])
    setTaskTitle('')
    setTaskNotes('')
  }

  const toggleProjectTask = (id: number) => {
    setProjectTasks(previous =>
      previous.map(task => (task.id === id ? { ...task, status: task.status === 'Completed' ? 'Open' : 'Completed' } : task))
    )
  }

  const deleteProjectTask = (id: number) => {
    setProjectTasks(previous => previous.filter(task => task.id !== id))
  }

  const sendProjectMessage = (projectId: number) => {
    const trimmedMessage = chatMessage.trim()
    if (!trimmedMessage) return

    setProjectMessages(previous => [
      ...previous,
      {
        id: nextRecordId(previous),
        projectId,
        author: 'Local User',
        message: trimmedMessage,
        createdAt: new Date().toISOString(),
      },
    ])
    setChatMessage('')
  }

  const addProjectAttachments = (projectId: number, event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || [])
    if (!files.length) return

    setProjectAttachments(previous => [
      ...previous,
      ...files.map((file, index) => ({
        id: nextRecordId(previous) + index,
        projectId,
        name: file.name,
        size: file.size,
        addedAt: new Date().toISOString(),
      })),
    ])
    event.target.value = ''
  }

  const deleteProjectAttachment = (id: number) => {
    setProjectAttachments(previous => previous.filter(attachment => attachment.id !== id))
  }

  const collectProgressFiles = (event: ChangeEvent<HTMLInputElement>) => {
    setProgressFiles(Array.from(event.target.files || []).map(file => file.name))
  }

  const addProgressUpdate = (projectId: number) => {
    const trimmedTitle = progressTitle.trim()
    const trimmedRemarks = progressRemarks.trim()
    if (!trimmedTitle && !trimmedRemarks && progressFiles.length === 0) return

    setProjectProgress(previous => [
      ...previous,
      {
        id: nextRecordId(previous),
        projectId,
        phase: progressPhase,
        title: trimmedTitle || `${progressPhase} update`,
        remarks: trimmedRemarks,
        updateDate: progressDate,
        author: 'Local User',
        notifyClient: progressNotifyClient,
        files: progressFiles,
        createdAt: new Date().toISOString(),
      },
    ])
    setProgressTitle('')
    setProgressRemarks('')
    setProgressFiles([])
    setProgressNotifyClient(true)
  }

  const deleteProgressUpdate = (id: number) => {
    setProjectProgress(previous => previous.filter(update => update.id !== id))
  }

  const saveChangeOrderPricing = (id: number) => {
    setChangeOrders(previous =>
      previous.map(order =>
        order.id === id
          ? { ...order, priceImpact, timelineImpact, status: order.status === 'Requested' ? 'Priced' : order.status }
          : order
      )
    )
    setPricingOrderId(null)
    setPriceImpact(0)
    setTimelineImpact(0)
  }

  const decideChangeOrder = (order: ChangeOrder, status: 'Approved' | 'Rejected') => {
    setChangeOrders(previous =>
      previous.map(item =>
        item.id === order.id ? { ...item, status, decidedAt: new Date().toISOString() } : item
      )
    )

    if (status === 'Approved' && order.priceImpact > 0) {
      setProjects(previous =>
        previous.map(project =>
          project.id === order.projectId
            ? {
                ...project,
                projectCost: (project.projectCost ?? 0) + order.priceImpact,
                unpaidAmount: (project.unpaidAmount ?? 0) + order.priceImpact,
                notes: `${project.notes || ''}${project.notes ? '\n' : ''}Approved change order: ${order.title} (${money(order.priceImpact)})`,
              }
            : project
        )
      )
    }
  }

  const assignChangeOrderTask = (order: ChangeOrder) => {
    if (!taskAssignee.trim()) return
    const exists = assignedTasks.some(task => task.changeOrderId === order.id)
    const nextTask: AssignedTask = {
      id: nextRecordId(assignedTasks),
      projectId: order.projectId,
      changeOrderId: order.id,
      title: order.title,
      description: order.description || `Complete approved change order: ${order.title}`,
      assignee: taskAssignee,
      dueDate: taskDueDateFromOrder,
      status: 'Open',
      source: 'Change Order',
      createdAt: new Date().toISOString(),
    }

    setAssignedTasks(previous => exists ? previous.map(task => task.changeOrderId === order.id ? { ...task, assignee: taskAssignee, dueDate: taskDueDateFromOrder } : task) : [nextTask, ...previous])
    setAssigningOrderId(null)
  }

  const toggleFinancialStatus = (statusName: string) => {
    setFinancialStatuses(previous =>
      previous.includes(statusName) ? previous.filter(status => status !== statusName) : [...previous, statusName]
    )
  }

  if (showForm) {
    return (
      <div style={{ fontFamily: font }}>
        <button onClick={closeForm} style={{ border: 'none', background: 'transparent', color: '#374151', fontSize: '14px', fontWeight: 600, cursor: 'pointer', marginBottom: '20px', padding: 0 }}>
          Back
        </button>

        <div style={{ fontSize: '24px', fontWeight: 600, color: '#111827', marginBottom: '6px' }}>
          {editingId ? 'Edit Project' : 'Create Project'}
        </div>
        <div style={{ fontSize: '13px', color: '#9ca3af', marginBottom: '28px', display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
          <span style={{ color: '#6c63ff', fontWeight: 600 }}>Projects</span>
          <span>/</span>
          <span>{editingId ? 'Edit' : 'New'}</span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(220px, 260px) minmax(0, 1fr)', gap: '32px' }}>
          <div>
            <div style={{ fontSize: '15px', fontWeight: 600, color: '#111827', marginBottom: '8px' }}>Project Details</div>
            <div style={{ fontSize: '13px', color: '#6b7280', lineHeight: 1.6 }}>
              Add the project profile, budget, payment status, and cost breakdown used by the analytics.
            </div>
          </div>

          <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '20px', display: 'grid', gap: '14px' }}>
            <label style={fieldGroupStyle}>
              <span style={labelStyle}>Project title</span>
              <input style={fieldStyle} value={name} onChange={event => setName(event.target.value)} placeholder="Example: Warehouse renovation" />
            </label>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: '14px' }}>
              <label style={fieldGroupStyle}>
                <span style={labelStyle}>Client</span>
                <select
                  style={fieldStyle}
                  value={addingClient ? '__new' : client}
                  onChange={event => {
                    if (event.target.value === '__new') {
                      setAddingClient(true)
                      setClient('')
                      return
                    }

                    setAddingClient(false)
                    setManualClient('')
                    setClient(event.target.value)
                  }}
                >
                  <option value="">{clients.length ? 'Select client' : 'No clients yet'}</option>
                  {clients.map(clientName => <option key={clientName} value={clientName}>{clientName}</option>)}
                  <option value="__new">+ Add new client</option>
                </select>
                {addingClient && (
                  <input style={fieldStyle} value={manualClient} onChange={event => setManualClient(event.target.value)} placeholder="New client name" />
                )}
                <span style={{ fontSize: '12px', color: '#6b7280', lineHeight: 1.45 }}>
                  New clients added here are saved to the Clients page.
                </span>
              </label>
              <label style={fieldGroupStyle}>
                <span style={labelStyle}>Location</span>
                <input style={fieldStyle} value={location} onChange={event => setLocation(event.target.value)} placeholder="Project location" />
              </label>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '14px' }}>
              <label style={fieldGroupStyle}>
                <span style={labelStyle}>Project cost</span>
                <input style={fieldStyle} type="number" value={projectCost} onChange={event => setProjectCost(Number(event.target.value))} placeholder="0" />
              </label>
              <label style={fieldGroupStyle}>
                <span style={labelStyle}>Start date</span>
                <input style={fieldStyle} type="date" value={startDate} onChange={event => setStartDate(event.target.value)} />
              </label>
              <label style={fieldGroupStyle}>
                <span style={labelStyle}>End date</span>
                <input style={fieldStyle} type="date" value={endDate} onChange={event => setEndDate(event.target.value)} />
              </label>
              <label style={fieldGroupStyle}>
                <span style={labelStyle}>Status</span>
                <select style={fieldStyle} value={status} onChange={event => setStatus(event.target.value as ProjectStatus)}>
                  <option>Pending</option>
                  <option>Ongoing</option>
                  <option>Completed</option>
                  <option>With issue</option>
                </select>
              </label>
            </div>

            <div style={{ height: '1px', background: '#f3f4f6', margin: '4px 0' }} />

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '14px' }}>
              <label style={fieldGroupStyle}>
                <span style={labelStyle}>Paid amount</span>
                <input style={fieldStyle} type="number" value={paidAmount} onChange={event => setPaidAmount(Number(event.target.value))} placeholder="0" />
              </label>
              <label style={fieldGroupStyle}>
                <span style={labelStyle}>Unpaid amount</span>
                <input style={{ ...fieldStyle, background: '#f9fafb' }} type="number" value={calculatedUnpaidAmount} readOnly placeholder="0" />
                <span style={{ fontSize: '12px', color: '#6b7280', lineHeight: 1.45 }}>Auto-calculated from project cost minus paid amount.</span>
              </label>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '14px' }}>
              <label style={fieldGroupStyle}>
                <span style={labelStyle}>Material cost</span>
                <input style={fieldStyle} type="number" value={materialCost} onChange={event => setMaterialCost(Number(event.target.value))} placeholder="0" />
              </label>
              <label style={fieldGroupStyle}>
                <span style={labelStyle}>Labor cost</span>
                <input style={fieldStyle} type="number" value={laborCost} onChange={event => setLaborCost(Number(event.target.value))} placeholder="0" />
              </label>
              <label style={fieldGroupStyle}>
                <span style={labelStyle}>Overhead profit</span>
                <input style={fieldStyle} type="number" value={overheadProfit} onChange={event => setOverheadProfit(Number(event.target.value))} placeholder="0" />
              </label>
              <label style={fieldGroupStyle}>
                <span style={labelStyle}>General expense</span>
                <input style={fieldStyle} type="number" value={generalExpense} onChange={event => setGeneralExpense(Number(event.target.value))} placeholder="0" />
              </label>
            </div>

            <label style={fieldGroupStyle}>
              <span style={labelStyle}>Notes</span>
              <textarea style={{ ...fieldStyle, resize: 'vertical' }} value={notes} onChange={event => setNotes(event.target.value)} rows={4} placeholder="Internal project notes" />
            </label>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '28px' }}>
          <button onClick={closeForm} style={{ ...buttonStyle, background: '#fff', border: '1px solid #e5e7eb', color: '#374151' }}>Cancel</button>
          <button onClick={saveProject} disabled={!name.trim()} style={{ ...buttonStyle, background: name.trim() ? '#111827' : '#d1d5db', color: '#fff', cursor: name.trim() ? 'pointer' : 'not-allowed' }}>
            {editingId ? 'Save Project' : 'Create Project'}
          </button>
        </div>
      </div>
    )
  }

  if (selectedProject) {
    const projectExpenses = (selectedProject.materialCost ?? 0) + (selectedProject.laborCost ?? 0) + (selectedProject.overheadProfit ?? 0) + (selectedProject.generalExpense ?? 0)
    const breakdown = categories.map(category => ({
      ...category,
      amount: Number(selectedProject[category.key]),
    }))
    const selectedTasks = projectTasks.filter(task => task.projectId === selectedProject.id)
    const selectedMessages = projectMessages.filter(message => message.projectId === selectedProject.id)
    const selectedAttachments = projectAttachments.filter(attachment => attachment.projectId === selectedProject.id)
    const selectedChangeOrders = changeOrders.filter(order => order.projectId === selectedProject.id)
    const selectedAssignedTasks = assignedTasks.filter(task => task.projectId === selectedProject.id)
    const selectedProgress = projectProgress
      .filter(update => update.projectId === selectedProject.id)
      .sort((a, b) => new Date(b.updateDate || b.createdAt).getTime() - new Date(a.updateDate || a.createdAt).getTime())
    const completedTasks = selectedTasks.filter(task => task.status === 'Completed').length
    const completion = selectedTasks.length ? Math.round((completedTasks / selectedTasks.length) * 100) : selectedProject.status === 'Completed' ? 100 : 0
    const estimatedMargin = (selectedProject.projectCost ?? 0) - projectExpenses
    const maxBarAmount = Math.max(selectedProject.materialCost ?? 0, selectedProject.laborCost ?? 0, selectedProject.overheadProfit ?? 0, selectedProject.generalExpense ?? 0, 1)
    const activities = [
      ...selectedTasks.slice(-3).map(task => ({
        id: `task-${task.id}`,
        color: task.status === 'Completed' ? '#22c55e' : '#0ea5e9',
        text: `${task.status === 'Completed' ? 'Completed' : 'Created'} task "${task.title}"`,
        date: task.createdAt,
      })),
      ...selectedMessages.slice(-2).map(message => ({
        id: `message-${message.id}`,
        color: '#6c63ff',
        text: `Added project chat note: "${message.message}"`,
        date: message.createdAt,
      })),
      ...selectedAttachments.slice(-2).map(attachment => ({
        id: `attachment-${attachment.id}`,
        color: '#f97316',
        text: `Attached file "${attachment.name}"`,
        date: attachment.addedAt,
      })),
      ...selectedChangeOrders.slice(-3).map(order => ({
        id: `change-order-${order.id}`,
        color: order.status === 'Approved' ? '#22c55e' : order.status === 'Rejected' ? '#ef4444' : '#a855f7',
        text: `${order.status} change order "${order.title}"`,
        date: order.decidedAt || order.createdAt,
      })),
      ...selectedProgress.slice(0, 3).map(update => ({
        id: `progress-${update.id}`,
        color: '#10b981',
        text: `Posted ${update.phase} progress update: "${update.title}"`,
        date: update.createdAt,
      })),
      {
        id: `project-${selectedProject.id}`,
        color: '#22c55e',
        text: `Created project "${selectedProject.name}"`,
        date: selectedProject.startDate ? new Date(`${selectedProject.startDate}T08:00:00`).toISOString() : new Date().toISOString(),
      },
    ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

    const renderTasks = (compact = false) => (
      <div style={{ display: 'grid', gap: '14px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: compact ? '1fr' : 'minmax(180px, 1fr) 170px auto', gap: '10px', alignItems: 'end' }}>
          <label style={fieldGroupStyle}>
            <span style={labelStyle}>Task title</span>
            <input style={fieldStyle} value={taskTitle} onChange={event => setTaskTitle(event.target.value)} placeholder="Example: Site inspection" />
          </label>
          <label style={fieldGroupStyle}>
            <span style={labelStyle}>Due date</span>
            <input style={fieldStyle} type="date" value={taskDueDate} onChange={event => setTaskDueDate(event.target.value)} />
          </label>
          <button onClick={() => addProjectTask(selectedProject.id)} disabled={!taskTitle.trim()} style={{ ...buttonStyle, height: '40px', background: taskTitle.trim() ? '#111827' : '#d1d5db', color: '#fff', cursor: taskTitle.trim() ? 'pointer' : 'not-allowed' }}>
            + Create Task
          </button>
        </div>
        {!compact && (
          <textarea style={{ ...fieldStyle, resize: 'vertical' }} rows={3} value={taskNotes} onChange={event => setTaskNotes(event.target.value)} placeholder="Task notes or instructions" />
        )}
        {selectedTasks.length === 0 ? (
          <div style={{ border: '1px dashed #e5e7eb', borderRadius: '12px', padding: '28px', textAlign: 'center', color: '#6b7280', fontSize: '13px', fontWeight: 600 }}>
            No tasks yet. Add the first task to organize this project.
          </div>
        ) : viewMode === 'Kanban' ? (
          <div style={{ padding: '18px 22px 24px', overflowX: 'auto' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(270px, 1fr))', gap: '16px', minWidth: '1120px', alignItems: 'start' }}>
              {(['Pending', 'Ongoing', 'With issue', 'Completed'] as ProjectStatus[]).map(columnStatus => {
                const columnProjects = filtered.filter(project => project.status === columnStatus)
                return (
                  <section
                    key={columnStatus}
                    onDragOver={event => event.preventDefault()}
                    onDrop={() => dropProjectToStatus(columnStatus)}
                    style={{ background: '#f5f5f5', border: '1px solid #d9d9d9', borderRadius: '16px', minHeight: '420px', overflow: 'hidden' }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px', padding: '14px 16px', background: '#fff', borderTop: `5px solid ${statusStyle[columnStatus].color}`, borderBottom: '1px solid #d9d9d9' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ width: 9, height: 9, borderRadius: '50%', background: statusStyle[columnStatus].color }} />
                        <strong style={{ color: '#191414', fontSize: '14px', fontWeight: 600 }}>{columnStatus}</strong>
                      </div>
                      <span style={{ color: '#191414', background: '#effff4', borderRadius: '999px', padding: '3px 9px', fontSize: '12px', fontWeight: 600 }}>{columnProjects.length}</span>
                    </div>
                    <div style={{ display: 'grid', gap: '12px', padding: '14px' }}>
                      {columnProjects.length === 0 ? (
                        <div style={{ border: '1px dashed #b3b3b3', borderRadius: '14px', padding: '32px 14px', color: '#535353', fontSize: '13px', fontWeight: 600, textAlign: 'center' }}>
                          Drag projects here
                        </div>
                      ) : columnProjects.map(project => {
                        const projectExpenses = (project.materialCost ?? 0) + (project.laborCost ?? 0) + (project.overheadProfit ?? 0) + (project.generalExpense ?? 0)
                        const progress = project.projectCost ? Math.min(100, Math.round(((project.paidAmount ?? 0) / project.projectCost) * 100)) : 0
                        return (
                          <article
                            key={project.id}
                            draggable
                            onDragStart={() => setDraggedProjectId(project.id)}
                            onDragEnd={() => setDraggedProjectId(null)}
                            onClick={() => openProjectDetail(project.id)}
                            style={{ background: '#fff', border: '1px solid #d9d9d9', borderRadius: '14px', padding: '14px', cursor: 'grab', boxShadow: draggedProjectId === project.id ? '0 18px 42px rgba(25,20,20,.18)' : '0 10px 26px rgba(25,20,20,.06)', opacity: draggedProjectId === project.id ? 0.72 : 1 }}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', alignItems: 'start', marginBottom: '12px' }}>
                              <div>
                                <h3 style={{ margin: 0, color: '#191414', fontSize: '15px', fontWeight: 600, lineHeight: 1.35 }}>{project.name}</h3>
                                <div style={{ color: '#535353', fontSize: '12px', fontWeight: 600, marginTop: '4px' }}>{project.location}</div>
                              </div>
                              <button onClick={event => { event.stopPropagation(); setOpenMenu(openMenu === project.id ? null : project.id) }} style={{ border: 'none', background: '#f5f5f5', color: '#191414', borderRadius: '8px', width: 30, height: 30, cursor: 'pointer', fontWeight: 600 }}>...</button>
                            </div>
                            <div style={{ display: 'grid', gap: '9px' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', color: '#535353', fontSize: '12px', fontWeight: 600 }}><span>Client</span><strong style={{ color: '#191414', fontWeight: 600 }}>{project.client}</strong></div>
                              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', color: '#535353', fontSize: '12px', fontWeight: 600 }}><span>Budget</span><strong style={{ color: '#191414', fontWeight: 600 }}>{money(project.projectCost)}</strong></div>
                              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', color: '#535353', fontSize: '12px', fontWeight: 600 }}><span>Spent</span><strong style={{ color: '#191414', fontWeight: 600 }}>{money(projectExpenses)}</strong></div>
                              <div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#535353', fontSize: '12px', fontWeight: 600, marginBottom: '6px' }}><span>Progress</span><span>{progress}%</span></div>
                                <div style={{ height: 7, borderRadius: 999, background: '#d9d9d9', overflow: 'hidden' }}><div style={{ width: `${progress}%`, height: '100%', background: '#22c55e' }} /></div>
                              </div>
                            </div>
                          </article>
                        )
                      })}
                      <button onClick={startCreate} style={{ border: '1px dashed #b3b3b3', borderRadius: '12px', background: '#fff', color: '#22c55e', padding: '12px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>+ Add Project</button>
                    </div>
                  </section>
                )
              })}
            </div>
          </div>
        ) : viewMode === 'Grid' ? (
          <div style={{ padding: '18px 22px 24px', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
            {filtered.map(project => {
              const projectExpenses = (project.materialCost ?? 0) + (project.laborCost ?? 0) + (project.overheadProfit ?? 0) + (project.generalExpense ?? 0)
              const progress = project.projectCost ? Math.min(100, Math.round(((project.paidAmount ?? 0) / project.projectCost) * 100)) : 0
              return (
                <article key={project.id} onClick={() => openProjectDetail(project.id)} style={{ background: '#fff', border: '1px solid #d9d9d9', borderRadius: '18px', padding: '18px', cursor: 'pointer', boxShadow: '0 16px 38px rgba(25,20,20,.06)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'start', marginBottom: '14px' }}>
                    <div>
                      <h3 style={{ margin: 0, color: '#191414', fontSize: '17px', fontWeight: 600, lineHeight: 1.35 }}>{project.name}</h3>
                      <p style={{ margin: '5px 0 0', color: '#535353', fontSize: '13px', fontWeight: 600 }}>{project.client}</p>
                    </div>
                    <span style={{ fontSize: '11px', fontWeight: 600, padding: '5px 10px', borderRadius: '999px', background: getStatusStyle(project.status).bg, color: getStatusStyle(project.status).color, whiteSpace: 'nowrap' }}>{project.status}</span>
                  </div>
                  <div style={{ color: '#535353', fontSize: '13px', fontWeight: 600, marginBottom: '14px' }}>{project.location}</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '14px' }}>
                    <MiniProjectMetric label="Budget" value={money(project.projectCost)} />
                    <MiniProjectMetric label="Spent" value={money(projectExpenses)} />
                    <MiniProjectMetric label="Paid" value={money(project.paidAmount)} />
                    <MiniProjectMetric label="Unpaid" value={money(project.unpaidAmount)} />
                  </div>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#535353', fontSize: '12px', fontWeight: 600, marginBottom: '7px' }}><span>Payment progress</span><span>{progress}%</span></div>
                    <div style={{ height: 8, borderRadius: 999, background: '#d9d9d9', overflow: 'hidden' }}><div style={{ height: '100%', width: `${progress}%`, background: '#22c55e' }} /></div>
                  </div>
                </article>
              )
            })}
          </div>
        ) : (
          <div style={{ display: 'grid', gap: '10px' }}>
            {selectedTasks.map(task => (
              <div key={task.id} style={{ display: 'grid', gridTemplateColumns: 'auto minmax(0, 1fr) auto', gap: '12px', alignItems: 'center', border: '1px solid #f3f4f6', borderRadius: '12px', padding: '12px' }}>
                <input type="checkbox" checked={task.status === 'Completed'} onChange={() => toggleProjectTask(task.id)} style={{ cursor: 'pointer' }} />
                <div>
                  <div style={{ fontSize: '13px', color: '#111827', fontWeight: 600, textDecoration: task.status === 'Completed' ? 'line-through' : 'none' }}>{task.title}</div>
                  <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '3px' }}>Due {task.dueDate || '-'}{task.notes ? ` - ${task.notes}` : ''}</div>
                </div>
                <button onClick={() => deleteProjectTask(task.id)} style={{ border: 'none', background: '#fff1f2', color: '#e11d48', borderRadius: '8px', padding: '7px 10px', cursor: 'pointer', fontWeight: 600 }}>Delete</button>
              </div>
            ))}
          </div>
        )}
      </div>
    )
    const financialStatusOptions =
      financialTab === 'Budget'
        ? ['Paid', 'Partial', 'Pending', 'Unpaid']
        : financialTab === 'Purchase Orders'
          ? ['Canvassing', 'Ongoing', 'Unavailable', 'Completed']
          : financialTab === 'Invoices'
            ? ['Draft', 'Unpaid', 'Paid']
            : ['Unpaid', 'Paid']
    const tableColumns =
      financialTab === 'Budget'
        ? ['Title', 'Amount', 'Date', 'Status']
        : financialTab === 'Bills and Expenses'
          ? ['Name', 'Vendor', 'Tags', 'Amount', 'Status', 'Date']
          : financialTab === 'Purchase Orders'
            ? ['PO#', 'Source', 'Date Created', 'Items', 'Total Cost', 'Status']
            : ['INV #', 'Client', 'Due Date', 'Total', 'Status']
    const searchPlaceholder = financialTab === 'Invoices' ? 'Search Client or Invoice number' : 'Search...'
    const renderFinancialTable = () => (
      <div>
        {financialTab === 'Purchase Orders' && (
          <div style={{ textAlign: 'right', fontSize: '14px', color: '#111827', fontWeight: 600, marginBottom: '28px' }}>
            May 06, 2026?
          </div>
        )}
        <div style={{ display: 'grid', gridTemplateColumns: '200px minmax(220px, 1fr) auto auto', gap: '16px', alignItems: 'start', marginBottom: '20px' }}>
          <div style={{ position: 'relative' }}>
            <button onClick={() => setFinancialStatusOpen(!financialStatusOpen)} style={{ ...fieldStyle, height: '54px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: financialStatusOpen ? '#111827' : '#94a3b8', fontWeight: 600, cursor: 'pointer', borderColor: financialStatusOpen ? '#111827' : '#e5e7eb' }}>
              <span>Status</span>
              <span>{financialStatusOpen ? '^' : '?'}</span>
            </button>
            {financialStatusOpen && (
              <div style={{ position: 'absolute', top: '60px', left: 0, width: '200px', background: '#fff', border: '1px solid #e5e7eb', borderRadius: '0 0 10px 10px', boxShadow: '0 22px 44px rgba(15,23,42,0.14)', zIndex: 20, padding: '12px' }}>
                {financialStatusOptions.map(option => (
                  <label key={option} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 0', fontSize: '14px', color: '#374151', fontWeight: 600 }}>
                    <input type="checkbox" checked={financialStatuses.includes(option)} onChange={() => toggleFinancialStatus(option)} style={{ width: '16px', height: '16px' }} />
                    {option}
                  </label>
                ))}
                <button onClick={() => setFinancialStatusOpen(false)} style={{ ...buttonStyle, width: '64px', padding: '8px 12px', background: '#d19a2a', color: '#fff', float: 'right', marginTop: '2px' }}>Apply</button>
              </div>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', border: '1px solid #e5e7eb', borderRadius: '8px', height: '54px', padding: '0 16px', background: '#fff' }}>
            <span style={{ color: '#94a3b8', fontSize: '17px' }}>?</span>
            <input value={financialSearch} onChange={event => setFinancialSearch(event.target.value)} placeholder={searchPlaceholder} style={{ border: 'none', outline: 'none', flex: 1, fontSize: '14px', color: '#374151' }} />
          </div>
          <button style={{ border: 'none', background: 'transparent', color: '#111827', fontSize: '14px', fontWeight: 600, height: '54px', cursor: 'pointer' }}>? Columns</button>
          {financialTab === 'Bills and Expenses' && <button style={{ border: 'none', background: 'transparent', color: '#111827', fontSize: '14px', fontWeight: 600, height: '54px', cursor: 'pointer' }}>? Filters</button>}
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: financialTab === 'Bills and Expenses' ? '920px' : '760px' }}>
            <thead>
              <tr style={{ background: '#f1f5f9' }}>
                <th style={{ padding: '16px', width: '44px', textAlign: 'left' }}><input type="checkbox" /></th>
                {tableColumns.map(column => (
                  <th key={column} style={{ padding: '16px', textAlign: 'left', fontSize: '13px', color: '#64748b', fontWeight: 600, borderLeft: '1px solid #e5e7eb' }}>{column}</th>
                ))}
              </tr>
            </thead>
          </table>
          <div style={{ minHeight: financialTab === 'Budget' ? '214px' : '300px', border: '1px dashed #e5e7eb', borderTop: 'none', borderRadius: '0 0 12px 12px', display: 'grid', placeItems: 'center', background: '#fff' }}>
            <div style={{ textAlign: 'center', color: '#94a3b8', fontSize: '18px', fontWeight: 600 }}>
              <div style={{ width: '86px', height: '70px', margin: '0 auto 18px', borderRadius: '12px', background: 'linear-gradient(135deg, #e2e8f0, #cbd5e1)', opacity: 0.75 }} />
              No Data
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '28px', padding: '18px 8px 0', fontSize: '14px', color: '#111827' }}>
          <span>Rows per page: <strong style={{ marginLeft: '8px', fontWeight: 500 }}>50?</strong></span>
          <span>0-0 of 0</span>
          <span style={{ color: '#94a3b8', fontSize: '24px' }}>‹</span>
          <span style={{ color: '#94a3b8', fontSize: '24px' }}>›</span>
        </div>
      </div>
    )

    return (
      <div style={{ fontFamily: font }}>
        <button onClick={() => setSelectedProjectId(null)} style={{ border: 'none', background: 'transparent', color: '#374151', fontSize: '14px', fontWeight: 600, cursor: 'pointer', marginBottom: '22px', padding: 0 }}>
          Back
        </button>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px', flexWrap: 'wrap', marginBottom: '24px' }}>
          <div>
            <div style={{ fontSize: '24px', fontWeight: 600, color: '#111827', marginBottom: '6px' }}>Projects</div>
            <div style={{ fontSize: '13px', color: '#9ca3af', display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              <span style={{ color: '#6c63ff', fontWeight: 600 }}>Projects</span>
              <span>/</span>
              <span>{selectedProject.name}</span>
              <span>/</span>
              <span>Overview</span>
            </div>
          </div>
          <button onClick={() => startEdit(selectedProject)} style={{ ...buttonStyle, background: '#111827', color: '#fff' }}>Edit Project</button>
        </div>

        <div style={{ display: 'flex', gap: '22px', borderBottom: '1px solid #e5e7eb', marginBottom: '20px', overflowX: 'auto' }}>
          {projectDetailTabs.map(tab => (
            <button key={tab} onClick={() => setProjectDetailTab(tab)} style={{ border: 'none', borderBottom: projectDetailTab === tab ? '2px solid #111827' : '2px solid transparent', background: 'transparent', padding: '12px 2px', color: projectDetailTab === tab ? '#111827' : '#64748b', cursor: 'pointer', fontSize: '13px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '7px', whiteSpace: 'nowrap' }}>
              {tab}
              {tab === 'Progress' && <span style={{ fontSize: '11px', padding: '1px 7px', borderRadius: '20px', background: projectDetailTab === tab ? '#111827' : '#f3f4f6', color: projectDetailTab === tab ? '#fff' : '#64748b' }}>{selectedProgress.length}</span>}
              {tab === 'Change Orders' && <span style={{ fontSize: '11px', padding: '1px 7px', borderRadius: '20px', background: projectDetailTab === tab ? '#111827' : '#f3f4f6', color: projectDetailTab === tab ? '#fff' : '#64748b' }}>{selectedChangeOrders.length}</span>}
              {tab === 'Tasks' && <span style={{ fontSize: '11px', padding: '1px 7px', borderRadius: '20px', background: projectDetailTab === tab ? '#111827' : '#f3f4f6', color: projectDetailTab === tab ? '#fff' : '#64748b' }}>{selectedTasks.length + selectedAssignedTasks.length}</span>}
              {tab === 'Attachments' && <span style={{ fontSize: '11px', padding: '1px 7px', borderRadius: '20px', background: projectDetailTab === tab ? '#111827' : '#f3f4f6', color: projectDetailTab === tab ? '#fff' : '#64748b' }}>{selectedAttachments.length}</span>}
            </button>
          ))}
        </div>

        <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '16px', padding: '22px', marginBottom: '18px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(260px, 1fr) 170px 170px 130px', gap: '22px', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: '16px', color: '#111827', fontWeight: 600, lineHeight: 1.4 }}>{selectedProject.name}</div>
              <div style={{ fontSize: '13px', color: '#64748b', fontWeight: 600, marginTop: '5px' }}>{selectedProject.location}</div>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '10px', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '11px', fontWeight: 600, padding: '4px 10px', borderRadius: '7px', background: getStatusStyle(selectedProject.status).bg, color: getStatusStyle(selectedProject.status).color }}>{statusLabel(selectedProject.status)}</span>
                <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>as of {selectedProject.startDate || '-'}</span>
              </div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '12px', color: '#111827', fontWeight: 600, marginBottom: '8px' }}>Project Completion</div>
              <div style={{ width: '58px', height: '58px', borderRadius: '50%', margin: '0 auto', background: `conic-gradient(#22c55e 0% ${completion}%, #f1f5f9 ${completion}% 100%)`, display: 'grid', placeItems: 'center' }}>
                <div style={{ width: '42px', height: '42px', borderRadius: '50%', background: '#fff', display: 'grid', placeItems: 'center', fontSize: '12px', fontWeight: 600, color: '#64748b' }}>{completion}%</div>
              </div>
            </div>
            <div style={{ borderLeft: '1px solid #e5e7eb', paddingLeft: '22px' }}>
              <div style={{ fontSize: '12px', color: '#111827', fontWeight: 600, marginBottom: '8px' }}>Project Timeline</div>
              <div style={{ width: '94px', height: '3px', background: '#ef4444', borderRadius: '20px', marginBottom: '8px' }} />
              <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>{duration(selectedProject)}</div>
            </div>
            <button style={{ ...buttonStyle, background: '#fff', border: '1px solid #e5e7eb', color: '#111827' }}>Invite Client</button>
          </div>
        </div>

        {projectDetailTab === 'Overview' && (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(280px, 0.8fr) minmax(360px, 1.6fr)', gap: '18px', marginBottom: '18px' }}>
              <section style={panelStyle}>
                <div style={panelTitleStyle}>Financial Summary</div>
                <div style={{ width: '210px', height: '210px', borderRadius: '50%', margin: '20px auto', background: `conic-gradient(#22c55e 0% 38%, #fbbf24 38% 68%, #e5e7eb 68% 100%)`, display: 'grid', placeItems: 'center' }}>
                  <div style={{ width: '156px', height: '156px', borderRadius: '50%', background: '#fff', display: 'grid', placeItems: 'center', textAlign: 'center', boxShadow: 'inset 0 0 0 10px #f3f4f6' }}>
                    <div>
                      <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>Project cost</div>
                      <div style={{ fontSize: '20px', color: '#111827', fontWeight: 600, marginTop: '8px' }}>{money(selectedProject.projectCost)}</div>
                    </div>
                  </div>
                </div>
                <div style={{ display: 'grid', gap: '10px', borderTop: '1px solid #f3f4f6', paddingTop: '14px' }}>
                  {[
                    ['#22c55e', 'Project Cost', selectedProject.projectCost],
                    ['#f97316', 'Current Expenses', projectExpenses],
                    ['#f59e0b', 'Estimated Margin', estimatedMargin],
                  ].map(([color, label, amount]) => (
                    <div key={label as string} style={{ display: 'grid', gridTemplateColumns: '10px minmax(0, 1fr) auto', gap: '10px', alignItems: 'center' }}>
                      <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: color as string }} />
                      <span style={{ fontSize: '13px', color: '#374151', fontWeight: 600 }}>{label}</span>
                      <span style={{ fontSize: '13px', color: '#111827', fontWeight: 600 }}>{money(amount as number)}</span>
                    </div>
                  ))}
                </div>
              </section>

              <section style={panelStyle}>
                <div style={panelTitleStyle}>Expected Expenses and Actual Cost</div>
                <div style={{ display: 'flex', gap: '18px', alignItems: 'center', marginTop: '8px', marginBottom: '18px' }}>
                  <span style={{ fontSize: '12px', color: '#374151', fontWeight: 600 }}><span style={{ color: '#22c55e' }}>?</span> Estimated</span>
                  <span style={{ fontSize: '12px', color: '#374151', fontWeight: 600 }}><span style={{ color: '#ef4444' }}>?</span> Cost</span>
                </div>
                <div style={{ height: '260px', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '28px', alignItems: 'end', borderBottom: '1px solid #e5e7eb', padding: '0 24px' }}>
                  {breakdown.map(item => (
                    <div key={item.key} style={{ display: 'grid', gap: '8px', alignItems: 'end', justifyItems: 'center', height: '100%' }}>
                      <div title={money(item.amount)} style={{ width: '34px', height: `${Math.max(8, (item.amount / maxBarAmount) * 230)}px`, borderRadius: '6px 6px 0 0', background: item.amount ? '#22c55e' : '#e5e7eb' }} />
                      <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 600, textAlign: 'center' }}>{item.label}</div>
                    </div>
                  ))}
                </div>
              </section>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(340px, 1fr) minmax(260px, 0.48fr)', gap: '18px', marginBottom: '18px' }}>
              <section style={panelStyle}>
                <div style={panelTitleStyle}>Tasks</div>
                {renderTasks(true)}
              </section>
              <section style={panelStyle}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px' }}>
                  <div style={panelTitleStyle}>Notes</div>
                  <button onClick={() => startEdit(selectedProject)} style={{ border: 'none', background: 'transparent', color: '#64748b', fontSize: '18px', cursor: 'pointer' }}>?</button>
                </div>
                <div style={{ fontSize: '13px', color: selectedProject.notes ? '#374151' : '#64748b', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{selectedProject.notes || 'This is where your notes will appear.'}</div>
              </section>
            </div>

            <section style={panelStyle}>
              <div style={panelTitleStyle}>Activities</div>
              <div style={{ display: 'grid', gap: '18px', marginTop: '18px' }}>
                {activities.slice(0, 6).map(activity => (
                  <div key={activity.id} style={{ display: 'grid', gridTemplateColumns: '12px minmax(0, 1fr)', gap: '12px', alignItems: 'start' }}>
                    <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: activity.color, marginTop: '4px' }} />
                    <div>
                      <div style={{ fontSize: '13px', color: '#111827', fontWeight: 600 }}>{activity.text}</div>
                      <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px', fontWeight: 600 }}>{formatDateTime(activity.date)}</div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </>
        )}

        {projectDetailTab === 'Progress' && (
          <section style={panelStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'flex-start', marginBottom: '18px', flexWrap: 'wrap' }}>
              <div>
                <div style={panelTitleStyle}>Progress Log + Gallery</div>
                <div style={{ fontSize: '13px', color: '#64748b', fontWeight: 600, marginTop: '5px' }}>
                  Share dated site updates with phase tags, remarks, photos, and client notification tracking.
                </div>
              </div>
              <div style={{ fontSize: '12px', color: '#059669', fontWeight: 600, background: '#ecfdf5', borderRadius: '999px', padding: '7px 11px' }}>
                Client portal ready
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(280px, 0.7fr) minmax(360px, 1.2fr)', gap: '18px', alignItems: 'start' }}>
              <div style={{ border: '1px solid #e5e7eb', borderRadius: '14px', padding: '16px', display: 'grid', gap: '12px' }}>
                <label style={fieldGroupStyle}>
                  <span style={labelStyle}>Phase</span>
                  <select style={fieldStyle} value={progressPhase} onChange={event => setProgressPhase(event.target.value)}>
                    {['Foundation', 'Framing', 'Roofing', 'Electrical', 'Plumbing', 'Finishes', 'Turnover', 'Other'].map(phase => <option key={phase}>{phase}</option>)}
                  </select>
                </label>
                <label style={fieldGroupStyle}>
                  <span style={labelStyle}>Update title</span>
                  <input style={fieldStyle} value={progressTitle} onChange={event => setProgressTitle(event.target.value)} placeholder="Example: Foundation inspection completed" />
                </label>
                <label style={fieldGroupStyle}>
                  <span style={labelStyle}>Update date</span>
                  <input style={fieldStyle} type="date" value={progressDate} onChange={event => setProgressDate(event.target.value)} />
                </label>
                <label style={fieldGroupStyle}>
                  <span style={labelStyle}>Remarks</span>
                  <textarea style={{ ...fieldStyle, resize: 'vertical' }} rows={4} value={progressRemarks} onChange={event => setProgressRemarks(event.target.value)} placeholder="What changed on site? What should the client know?" />
                </label>
                <label style={fieldGroupStyle}>
                  <span style={labelStyle}>Photos / videos</span>
                  <input style={fieldStyle} type="file" multiple accept="image/*,video/*" onChange={collectProgressFiles} />
                  <span style={{ fontSize: '12px', color: '#64748b', lineHeight: 1.5 }}>
                    This prototype records file names. Cloud upload can be connected later.
                  </span>
                </label>
                {progressFiles.length > 0 && (
                  <div style={{ display: 'flex', gap: '7px', flexWrap: 'wrap' }}>
                    {progressFiles.map(file => <span key={file} style={{ fontSize: '11px', color: '#374151', fontWeight: 600, background: '#f8fafc', border: '1px solid #e5e7eb', borderRadius: '999px', padding: '5px 8px' }}>{file}</span>)}
                  </div>
                )}
                <label style={{ display: 'flex', alignItems: 'center', gap: '9px', color: '#374151', fontSize: '13px', fontWeight: 600 }}>
                  <input type="checkbox" checked={progressNotifyClient} onChange={event => setProgressNotifyClient(event.target.checked)} />
                  Notify client about this update
                </label>
                <button onClick={() => addProgressUpdate(selectedProject.id)} style={{ ...buttonStyle, background: '#111827', color: '#fff' }}>
                  Post Progress Update
                </button>
              </div>

              <div style={{ display: 'grid', gap: '12px' }}>
                {selectedProgress.length === 0 ? (
                  <div style={{ border: '1px dashed #cbd5e1', borderRadius: '14px', padding: '42px 20px', textAlign: 'center', color: '#64748b', fontSize: '13px', fontWeight: 600 }}>
                    No progress updates yet. Add the first site update for this client.
                  </div>
                ) : selectedProgress.map(update => (
                  <div key={update.id} style={{ border: '1px solid #e5e7eb', borderRadius: '14px', padding: '16px', background: '#fff' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap', marginBottom: '10px' }}>
                      <div>
                        <span style={{ fontSize: '11px', color: '#047857', fontWeight: 600, background: '#d1fae5', borderRadius: '999px', padding: '4px 9px' }}>{update.phase}</span>
                        <div style={{ fontSize: '15px', color: '#111827', fontWeight: 600, marginTop: '9px' }}>{update.title}</div>
                        <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 600, marginTop: '4px' }}>
                          {update.updateDate} by {update.author} {update.notifyClient ? '- client notified' : '- internal only'}
                        </div>
                      </div>
                      <button onClick={() => deleteProgressUpdate(update.id)} style={{ border: 'none', background: '#fff1f2', color: '#e11d48', borderRadius: '8px', padding: '8px 10px', cursor: 'pointer', fontWeight: 600 }}>Remove</button>
                    </div>
                    {update.remarks && <div style={{ fontSize: '13px', color: '#374151', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{update.remarks}</div>}
                    {update.files.length > 0 && (
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '10px', marginTop: '14px' }}>
                        {update.files.map(file => (
                          <div key={file} style={{ border: '1px solid #e5e7eb', borderRadius: '12px', background: '#f8fafc', padding: '12px', minHeight: '88px', display: 'grid', alignContent: 'space-between' }}>
                            <div style={{ fontSize: '12px', color: '#111827', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{file}</div>
                            <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>Gallery item</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {projectDetailTab === 'Change Orders' && (
          <section style={panelStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'flex-start', marginBottom: '18px', flexWrap: 'wrap' }}>
              <div>
                <div style={panelTitleStyle}>Change Orders / Add-ons</div>
                <div style={{ fontSize: '13px', color: '#64748b', fontWeight: 600, marginTop: '5px' }}>
                  Review client upgrade requests, add price/timeline impact, and approve or reject.
                </div>
              </div>
              <span style={{ fontSize: '12px', color: '#6d28d9', fontWeight: 600, background: '#f5f3ff', borderRadius: '999px', padding: '7px 11px' }}>
                {selectedChangeOrders.length} request{selectedChangeOrders.length === 1 ? '' : 's'}
              </span>
            </div>

            <div style={{ display: 'grid', gap: '12px' }}>
              {selectedChangeOrders.length === 0 ? (
                <div style={{ border: '1px dashed #cbd5e1', borderRadius: '14px', padding: '34px 20px', textAlign: 'center', color: '#64748b', fontSize: '13px', fontWeight: 600 }}>
                  No change order requests for this project yet.
                </div>
              ) : selectedChangeOrders.map(order => (
                <div key={order.id} style={{ border: '1px solid #e5e7eb', borderRadius: '14px', background: '#fff', padding: '16px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto', gap: '14px', alignItems: 'start' }}>
                    <div>
                      <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                        <div style={{ fontSize: '15px', color: '#111827', fontWeight: 600 }}>{order.title}</div>
                        <span style={{ fontSize: '11px', fontWeight: 600, borderRadius: '999px', padding: '4px 9px', color: order.status === 'Approved' ? '#047857' : order.status === 'Rejected' ? '#b91c1c' : order.status === 'Priced' ? '#6d28d9' : '#c2410c', background: order.status === 'Approved' ? '#d1fae5' : order.status === 'Rejected' ? '#fee2e2' : order.status === 'Priced' ? '#ede9fe' : '#ffedd5' }}>{order.status}</span>
                      </div>
                      <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 600, marginTop: '5px' }}>
                        Requested by {order.requestedBy} - {new Date(order.createdAt).toLocaleDateString('en-PH')}
                      </div>
                      {order.description && <div style={{ fontSize: '13px', color: '#374151', lineHeight: 1.65, marginTop: '10px' }}>{order.description}</div>}
                      {order.files?.length > 0 && (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '10px', marginTop: '12px' }}>
                          {order.files.map(file => (
                            <div key={file} style={{ border: '1px solid #e5e7eb', borderRadius: '12px', background: '#f8fafc', minHeight: '82px', padding: '10px', display: 'grid', alignContent: 'space-between' }}>
                              <div style={{ fontSize: '12px', color: '#111827', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{file}</div>
                              <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>Reference photo</div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    <div style={{ display: 'grid', gap: '8px', minWidth: '220px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', fontSize: '13px', color: '#374151', fontWeight: 600 }}>
                        <span>Price impact</span><strong>{money(order.priceImpact)}</strong>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', fontSize: '13px', color: '#374151', fontWeight: 600 }}>
                        <span>Timeline</span><strong>{order.timelineImpact} day{order.timelineImpact === 1 ? '' : 's'}</strong>
                      </div>
                    </div>
                  </div>

                  {pricingOrderId === order.id ? (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '10px', alignItems: 'end', marginTop: '14px' }}>
                      <label style={fieldGroupStyle}>
                        <span style={labelStyle}>Price impact</span>
                        <input style={fieldStyle} type="number" value={priceImpact} onChange={event => setPriceImpact(Number(event.target.value))} />
                      </label>
                      <label style={fieldGroupStyle}>
                        <span style={labelStyle}>Timeline impact days</span>
                        <input style={fieldStyle} type="number" value={timelineImpact} onChange={event => setTimelineImpact(Number(event.target.value))} />
                      </label>
                      <button onClick={() => saveChangeOrderPricing(order.id)} style={{ ...buttonStyle, background: '#111827', color: '#fff' }}>Save Price</button>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '14px', flexWrap: 'wrap' }}>
                      <button onClick={() => { setPricingOrderId(order.id); setPriceImpact(order.priceImpact); setTimelineImpact(order.timelineImpact) }} style={{ ...buttonStyle, background: '#fff', border: '1px solid #e5e7eb', color: '#111827' }}>Price Request</button>
                      <button onClick={() => decideChangeOrder(order, 'Rejected')} disabled={order.status === 'Rejected'} style={{ ...buttonStyle, background: '#fff1f2', color: '#e11d48', opacity: order.status === 'Rejected' ? .5 : 1 }}>Reject</button>
                      <button onClick={() => decideChangeOrder(order, 'Approved')} disabled={order.status === 'Approved'} style={{ ...buttonStyle, background: '#ecfdf5', color: '#047857', opacity: order.status === 'Approved' ? .5 : 1 }}>Approve</button>
                    </div>
                  )}
                  {order.status === 'Approved' && (
                    <div style={{ marginTop: '14px', borderTop: '1px solid #f3f4f6', paddingTop: '14px' }}>
                      {assignedTasks.find(task => task.changeOrderId === order.id) && assigningOrderId !== order.id ? (
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                          <div style={{ fontSize: '13px', color: '#374151', fontWeight: 600 }}>
                            Assigned to {assignedTasks.find(task => task.changeOrderId === order.id)?.assignee} - due {assignedTasks.find(task => task.changeOrderId === order.id)?.dueDate}
                          </div>
                          <button onClick={() => { const task = assignedTasks.find(item => item.changeOrderId === order.id); setAssigningOrderId(order.id); setTaskAssignee(task?.assignee || 'Anna'); setTaskDueDateFromOrder(task?.dueDate || '2026-05-06') }} style={{ ...buttonStyle, background: '#fff', border: '1px solid #e5e7eb', color: '#111827' }}>Change Assignment</button>
                        </div>
                      ) : assigningOrderId === order.id ? (
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '10px', alignItems: 'end' }}>
                          <label style={fieldGroupStyle}>
                            <span style={labelStyle}>Assign to team member</span>
                            <select style={fieldStyle} value={taskAssignee} onChange={event => setTaskAssignee(event.target.value)}>
                              {teamMembers.map(member => <option key={member}>{member}</option>)}
                            </select>
                          </label>
                          <label style={fieldGroupStyle}>
                            <span style={labelStyle}>Due date</span>
                            <input style={fieldStyle} type="date" value={taskDueDateFromOrder} onChange={event => setTaskDueDateFromOrder(event.target.value)} />
                          </label>
                          <button onClick={() => assignChangeOrderTask(order)} style={{ ...buttonStyle, background: '#111827', color: '#fff' }}>Create Task</button>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                          <button onClick={() => { setAssigningOrderId(order.id); setTaskAssignee('Anna'); setTaskDueDateFromOrder('2026-05-06') }} style={{ ...buttonStyle, background: '#111827', color: '#fff' }}>Assign Team Task</button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {projectDetailTab === 'Tasks' && (
          <section style={panelStyle}>
            <div style={panelTitleStyle}>Project Tasks</div>
            {selectedAssignedTasks.length > 0 && (
              <div style={{ display: 'grid', gap: '10px', margin: '16px 0' }}>
                <div style={{ fontSize: '13px', color: '#64748b', fontWeight: 600 }}>Assigned from approved client requests</div>
                {selectedAssignedTasks.map(task => (
                  <div key={task.id} style={{ border: '1px solid #f3f4f6', borderRadius: '12px', padding: '12px', display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto', gap: '12px', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontSize: '13px', color: '#111827', fontWeight: 600 }}>{task.title}</div>
                      <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 600, marginTop: '4px' }}>Assigned to {task.assignee} - Due {task.dueDate} - {task.status}</div>
                    </div>
                    <span style={{ fontSize: '11px', color: '#6d28d9', background: '#f5f3ff', borderRadius: '999px', padding: '5px 9px', fontWeight: 600 }}>{task.source}</span>
                  </div>
                ))}
              </div>
            )}
            {renderTasks(false)}
          </section>
        )}

        {projectDetailTab === 'Chat' && (
          <section style={panelStyle}>
            <div style={panelTitleStyle}>Project Chat</div>
            <div style={{ display: 'grid', gap: '12px', margin: '16px 0' }}>
              {selectedMessages.length === 0 ? (
                <div style={{ color: '#64748b', fontSize: '13px', fontWeight: 600 }}>No chat notes yet.</div>
              ) : selectedMessages.map(message => (
                <div key={message.id} style={{ border: '1px solid #f3f4f6', borderRadius: '12px', padding: '12px' }}>
                  <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>{message.author} • {formatDateTime(message.createdAt)}</div>
                  <div style={{ fontSize: '13px', color: '#111827', lineHeight: 1.6, marginTop: '6px' }}>{message.message}</div>
                </div>
              ))}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto', gap: '10px' }}>
              <input style={fieldStyle} value={chatMessage} onChange={event => setChatMessage(event.target.value)} placeholder="Write a project update..." />
              <button onClick={() => sendProjectMessage(selectedProject.id)} disabled={!chatMessage.trim()} style={{ ...buttonStyle, background: chatMessage.trim() ? '#111827' : '#d1d5db', color: '#fff', cursor: chatMessage.trim() ? 'pointer' : 'not-allowed' }}>Send</button>
            </div>
          </section>
        )}

        {projectDetailTab === 'Financials' && (
          <section style={{ ...panelStyle, padding: 0, overflow: 'hidden' }}>
            <div style={{ display: 'flex', gap: '24px', padding: '0 16px', borderBottom: '1px solid #f3f4f6', background: '#fff', overflowX: 'auto' }}>
              {financialTabs.map(tab => (
                <button key={tab} onClick={() => setFinancialTab(tab)} style={{ border: 'none', background: financialTab === tab ? '#f8fafc' : 'transparent', borderRadius: '10px 10px 0 0', padding: '16px', color: financialTab === tab ? '#111827' : '#475569', fontSize: '13px', fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                  {tab}
                </button>
              ))}
            </div>

            <div style={{ background: '#f8fafc', padding: '24px 16px' }}>
              <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '16px', padding: financialTab === 'Summary' ? '16px' : '20px', overflow: 'visible' }}>
                {financialTab === 'Summary' && (
                  <>
                    <div style={{ overflowX: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '760px' }}>
                        <thead>
                          <tr style={{ background: '#f1f5f9' }}>
                            {['Summary', 'Estimated Cost', 'Actual Cost', 'Remaining Cost'].map(header => (
                              <th key={header} style={{ padding: '16px', textAlign: header === 'Summary' ? 'left' : 'right', fontSize: '13px', color: '#64748b', fontWeight: 600 }}>{header}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {breakdown.filter(item => item.key !== 'generalExpense').map(item => {
                            const remaining = item.amount
                            return (
                              <tr key={item.key} style={{ borderBottom: '1px dashed #e5e7eb' }}>
                                <td style={{ padding: '16px', fontSize: '14px', color: '#111827', fontWeight: 600 }}>{item.label}</td>
                                <td style={{ padding: '16px', textAlign: 'right', fontSize: '14px', color: '#111827', fontWeight: 600 }}>{money(item.amount)}</td>
                                <td style={{ padding: '16px', textAlign: 'right', fontSize: '14px', color: '#111827', fontWeight: 600 }}>{money(0)}</td>
                                <td style={{ padding: '16px', textAlign: 'right', fontSize: '14px', color: '#111827', fontWeight: 600 }}>{money(remaining)}</td>
                              </tr>
                            )
                          })}
                          <tr style={{ borderBottom: '1px dashed #e5e7eb' }}>
                            <td style={{ padding: '16px', fontSize: '14px', color: '#111827', fontWeight: 600 }}>Subtotal</td>
                            <td style={{ padding: '16px', textAlign: 'right', fontSize: '14px', color: '#111827', fontWeight: 600 }}>{money(projectExpenses)}</td>
                            <td style={{ padding: '16px', textAlign: 'right', fontSize: '14px', color: '#111827', fontWeight: 600 }}>{money(0)}</td>
                            <td style={{ padding: '16px', textAlign: 'right', fontSize: '14px', color: '#111827', fontWeight: 600 }}>{money(projectExpenses)}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>

                    <div style={{ display: 'grid', justifyContent: 'end', gap: '14px', marginTop: '24px' }}>
                      {[
                        ['Project Cost', selectedProject.projectCost, '#111827', 800],
                        ['Estimated Cost', projectExpenses, '#111827', 800],
                        ['Total Actual Cost', 0, '#ef4444', 700],
                        ['Remaining Amount', selectedProject.projectCost, '#111827', 900],
                      ].map(([label, amount, color, weight]) => (
                        <div key={label as string} style={{ display: 'grid', gridTemplateColumns: '180px 160px', gap: '18px', alignItems: 'center' }}>
                          <span style={{ fontSize: '14px', color: '#64748b', fontWeight: label === 'Remaining Amount' ? 900 : 700 }}>{label}</span>
                          <span style={{ textAlign: 'right', fontSize: '14px', color: color as string, fontWeight: weight as number }}>{money(amount as number)}</span>
                        </div>
                      ))}
                    </div>
                  </>
                )}

                {financialTab !== 'Summary' && renderFinancialTable()}
              </div>
            </div>
          </section>
        )}

        {projectDetailTab === 'Attachments' && (
          <section style={panelStyle}>
            <div style={panelTitleStyle}>Attachments</div>
            <label style={{ ...fieldGroupStyle, maxWidth: '420px', marginTop: '16px' }}>
              <span style={labelStyle}>Upload files</span>
              <input style={fieldStyle} type="file" multiple onChange={event => addProjectAttachments(selectedProject.id, event)} />
            </label>
            <div style={{ display: 'grid', gap: '10px', marginTop: '18px' }}>
              {selectedAttachments.length === 0 ? (
                <div style={{ color: '#64748b', fontSize: '13px', fontWeight: 600 }}>No attachments uploaded for this project.</div>
              ) : selectedAttachments.map(attachment => (
                <div key={attachment.id} style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto', gap: '12px', alignItems: 'center', border: '1px solid #f3f4f6', borderRadius: '12px', padding: '12px' }}>
                  <div>
                    <div style={{ fontSize: '13px', color: '#111827', fontWeight: 600 }}>{attachment.name}</div>
                    <div style={{ fontSize: '12px', color: '#64748b', marginTop: '3px' }}>{fileSize(attachment.size)} - {formatDateTime(attachment.addedAt)}</div>
                  </div>
                  <button onClick={() => deleteProjectAttachment(attachment.id)} style={{ border: 'none', background: '#fff1f2', color: '#e11d48', borderRadius: '8px', padding: '8px 10px', cursor: 'pointer', fontWeight: 600 }}>Remove</button>
                </div>
              ))}
            </div>
          </section>
        )}

        {projectDetailTab === 'Settings' && (
          <section style={panelStyle}>
            <div style={panelTitleStyle}>Project Settings</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px', marginTop: '18px' }}>
              {[
                ['Project title', selectedProject.name],
                ['Client', selectedProject.client],
                ['Location', selectedProject.location],
                ['Status', selectedProject.status],
                ['Start date', selectedProject.startDate],
                ['End date', selectedProject.endDate],
              ].map(([label, value]) => (
                <div key={label} style={{ border: '1px solid #f3f4f6', borderRadius: '12px', padding: '14px' }}>
                  <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>{label}</div>
                  <div style={{ fontSize: '14px', color: '#111827', fontWeight: 600, marginTop: '7px' }}>{value}</div>
                </div>
              ))}
            </div>
            <button onClick={() => startEdit(selectedProject)} style={{ ...buttonStyle, background: '#111827', color: '#fff', marginTop: '18px' }}>Edit Project Details</button>
          </section>
        )}
      </div>
    )
  }

  return (
    <div style={{ fontFamily: font }} onClick={() => setOpenMenu(null)}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px', marginBottom: '8px', flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontSize: '24px', fontWeight: 600, color: '#111827', marginBottom: '6px' }}>Projects</div>
          <div style={{ fontSize: '13px', color: '#9ca3af', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ color: '#6c63ff', fontWeight: 600 }}>Projects</span>
            <span>/</span>
            <span>List</span>
          </div>
        </div>
        <button onClick={startCreate} style={{ ...buttonStyle, background: '#111827', color: '#fff' }}>+ Project</button>
      </div>

      <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '16px', overflow: 'hidden', margin: '24px 0' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr minmax(360px, 1.35fr)', minHeight: '188px' }}>
          <div style={{ padding: '24px', borderRight: '1px solid #f3f4f6' }}>
            <div style={{ fontSize: '14px', color: '#374151', fontWeight: 600, marginBottom: '8px' }}>Bills and Expenses</div>
            <div style={{ fontSize: '28px', fontWeight: 600, color: '#111827' }}>{money(analytics.totalBills)}</div>
            <div style={{ fontSize: '13px', color: '#f97316', fontWeight: 600, marginTop: '6px' }}>{projects.length} records total</div>
          </div>

          <div style={{ padding: '24px', borderRight: '1px solid #f3f4f6' }}>
            <div style={{ fontSize: '14px', color: '#374151', fontWeight: 600, marginBottom: '12px' }}>Payment Status</div>
            <div style={{ fontSize: '22px', fontWeight: 600, color: '#111827' }}>{money(analytics.paid)}</div>
            <div style={{ fontSize: '12px', color: '#059669', fontWeight: 600, margin: '4px 0 14px' }}>Paid</div>
            <div style={{ fontSize: '22px', fontWeight: 600, color: '#111827' }}>{money(analytics.unpaid)}</div>
            <div style={{ fontSize: '12px', color: '#f59e0b', fontWeight: 600, marginTop: '4px' }}>Unpaid</div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '28px', padding: '24px', flexWrap: 'wrap' }}>
            <div style={{ width: '120px', height: '120px', borderRadius: '50%', background: `conic-gradient(${donutGradient})`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ width: '68px', height: '68px', borderRadius: '50%', background: '#fff', display: 'grid', placeItems: 'center', textAlign: 'center' }}>
                <div>
                  <div style={{ fontSize: '9px', color: '#6b7280', fontWeight: 600 }}>TOTAL</div>
                  <div style={{ fontSize: '12px', color: '#111827', fontWeight: 600 }}>{money(analytics.totalBills).replace('.00', '')}</div>
                </div>
              </div>
            </div>
            <div style={{ display: 'grid', gap: '10px', minWidth: '210px' }}>
              {analytics.categorySummary.map(item => (
                <div key={item.key} style={{ display: 'grid', gridTemplateColumns: '10px minmax(0, 1fr)', gap: '8px', alignItems: 'start' }}>
                  <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: item.color, marginTop: '4px' }} />
                  <div>
                    <div style={{ fontSize: '13px', color: '#111827', fontWeight: 600 }}>{item.label} ({item.count})</div>
                    <div style={{ fontSize: '13px', color: '#111827', fontWeight: 600 }}>{money(item.amount)}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '16px', overflow: 'hidden' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '14px', padding: '18px 22px 0', borderBottom: '1px solid #e5e7eb', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', gap: '18px', overflowX: 'auto' }}>
            {(['Kanban', 'Table', 'Grid'] as ProjectViewMode[]).map(mode => (
              <button key={mode} onClick={() => setViewMode(mode)} style={{ border: 'none', borderBottom: viewMode === mode ? '3px solid #22c55e' : '3px solid transparent', background: 'transparent', color: viewMode === mode ? '#191414' : '#535353', padding: '0 4px 14px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                {mode} View
              </button>
            ))}
          </div>
          <div style={{ display: 'flex', gap: '10px', paddingBottom: '14px', flexWrap: 'wrap' }}>
            <button style={{ ...buttonStyle, minHeight: '36px', padding: '8px 13px', background: '#fff', border: '1px solid #d9d9d9', color: '#191414' }}>Filter</button>
            <button style={{ ...buttonStyle, minHeight: '36px', padding: '8px 13px', background: '#fff', border: '1px solid #d9d9d9', color: '#191414' }}>Group by: Status</button>
            <button style={{ ...buttonStyle, minHeight: '36px', padding: '8px 13px', background: '#fff', border: '1px solid #d9d9d9', color: '#191414' }}>Sort</button>
            <button onClick={startCreate} style={{ ...buttonStyle, minHeight: '36px', padding: '8px 14px', background: '#22c55e', color: '#191414' }}>+ New Project</button>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '16px 24px 10px', borderBottom: '1px solid #f3f4f6', flexWrap: 'wrap' }}>
          <select value={clientFilter} onChange={event => setClientFilter(event.target.value)} style={{ ...fieldStyle, width: '180px', background: '#fafafa' }}>
            <option>All</option>
            {clients.map(clientName => <option key={clientName}>{clientName}</option>)}
          </select>
          <div style={{ flex: 1, minWidth: '220px', display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 14px', border: '1px solid #e5e7eb', borderRadius: '8px', background: '#fafafa' }}>
            <span style={{ color: '#9ca3af', fontSize: '13px' }}>Search</span>
            <input type="text" placeholder="Search project, client, or location..." value={search} onChange={event => setSearch(event.target.value)} style={{ border: 'none', background: 'transparent', fontSize: '13px', color: '#374151', outline: 'none', flex: 1 }} />
          </div>
          <button type="button" onClick={() => { setSearch(''); setClientFilter('All'); setActiveTab('All') }} style={{ ...buttonStyle, background: '#fafafa', border: '1px solid #e5e7eb', color: '#374151' }}>Reset</button>
        </div>

        <div style={{ display: 'flex', gap: '12px', padding: '0 24px 16px', overflowX: 'auto' }}>
          {tabs.map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 12px', cursor: 'pointer', fontSize: '13px', fontWeight: 600, color: activeTab === tab ? '#191414' : '#535353', border: '1px solid', borderColor: activeTab === tab ? '#22c55e' : '#d9d9d9', borderRadius: '999px', background: activeTab === tab ? '#effff4' : '#fff', whiteSpace: 'nowrap' }}>
              {tab}
              <span style={{ fontSize: '11px', padding: '1px 7px', borderRadius: '20px', background: activeTab === tab ? '#22c55e' : '#f5f5f5', color: activeTab === tab ? '#191414' : '#535353', fontWeight: 600 }}>{tabCount(tab)}</span>
            </button>
          ))}
        </div>

        {filtered.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '70px 24px', color: '#9ca3af', textAlign: 'center', gap: '12px' }}>
            <div style={{ fontSize: '15px', fontWeight: 600 }}>No projects yet</div>
            <div style={{ fontSize: '13px', fontWeight: 600 }}>Click + Project to create your first real project.</div>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '980px' }}>
              <thead>
                <tr style={{ background: '#fafafa' }}>
                  <th style={{ padding: '12px 24px', textAlign: 'left', width: '40px' }}>
                    <input type="checkbox" checked={filtered.length > 0 && filtered.every(project => selected.includes(project.id))} onChange={toggleSelectAll} style={{ cursor: 'pointer' }} />
                  </th>
                  {['Title', 'Client', 'Project Cost', 'Bills/Expenses', 'Payment', 'Duration', 'Status', ''].map(header => (
                    <th key={header} style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>{header}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((project, index) => {
                  const projectExpenses = (project.materialCost ?? 0) + (project.laborCost ?? 0) + (project.overheadProfit ?? 0) + (project.generalExpense ?? 0)
                  return (
                    <tr key={project.id} onClick={() => openProjectDetail(project.id)} style={{ borderTop: '1px solid #f3f4f6', background: selected.includes(project.id) ? '#f5f4ff' : index % 2 === 0 ? '#fff' : '#fafafa', cursor: 'pointer' }}>
                      <td style={{ padding: '16px 24px' }}>
                        <input type="checkbox" checked={selected.includes(project.id)} onClick={event => event.stopPropagation()} onChange={() => toggleSelect(project.id)} style={{ cursor: 'pointer' }} />
                      </td>
                      <td style={{ padding: '16px' }}>
                        <button onClick={event => { event.stopPropagation(); openProjectDetail(project.id) }} style={{ display: 'block', width: '100%', border: 'none', background: 'transparent', padding: 0, fontSize: '14px', fontWeight: 600, color: '#111827', marginBottom: '3px', cursor: 'pointer', textAlign: 'left', lineHeight: 1.35 }}>{project.name}</button>
                        <div style={{ fontSize: '12px', color: '#6c63ff', fontWeight: 600 }}>{project.location}</div>
                      </td>
                      <td style={cellStyle}>{project.client}</td>
                      <td style={{ ...cellStyle, fontWeight: 600, color: '#111827' }}>{money(project.projectCost)}</td>
                      <td style={{ ...cellStyle, fontWeight: 600, color: '#111827' }}>{money(projectExpenses)}</td>
                      <td style={cellStyle}>Paid {money(project.paidAmount)} / Unpaid {money(project.unpaidAmount)}</td>
                      <td style={cellStyle}>{duration(project)}</td>
                      <td style={{ padding: '16px' }}>
                        <span style={{ fontSize: '11px', fontWeight: 600, padding: '4px 10px', borderRadius: '20px', background: getStatusStyle(project.status).bg, color: getStatusStyle(project.status).color }}>
                          {statusLabel(project.status)}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px', position: 'relative', width: '44px' }}>
                        <button onClick={event => { event.stopPropagation(); setOpenMenu(openMenu === project.id ? null : project.id) }} style={{ width: '32px', height: '32px', border: 'none', borderRadius: '8px', background: openMenu === project.id ? '#eef2ff' : 'transparent', color: '#2563eb', cursor: 'pointer', fontSize: '18px', fontWeight: 600 }}>...</button>
                        {openMenu === project.id && (
                          <div onClick={event => event.stopPropagation()} style={{ position: 'absolute', right: '16px', top: '46px', width: '140px', background: '#fff', border: '1px solid #e5e7eb', borderRadius: '10px', boxShadow: '0 16px 40px rgba(15,23,42,0.14)', zIndex: 30, overflow: 'hidden' }}>
                            <button onClick={() => startEdit(project)} style={menuItemStyle}>Edit</button>
                            <button onClick={() => deleteProject(project.id)} style={{ ...menuItemStyle, color: '#ef4444' }}>Delete</button>
                          </div>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '16px', padding: '16px 24px', borderTop: '1px solid #f3f4f6' }}>
          <div style={{ fontSize: '13px', color: '#374151', fontWeight: 600 }}>1-{filtered.length} of {filtered.length}</div>
        </div>
      </div>
    </div>
  )
}

const cellStyle = {
  padding: '16px',
  fontSize: '13px',
  color: '#6b7280',
  fontWeight: 600,
}

function MiniProjectMetric({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ border: '1px solid #e5e5e5', borderRadius: '12px', background: '#f5f5f5', padding: '10px' }}>
      <div style={{ color: '#535353', fontSize: '11px', fontWeight: 600, marginBottom: '4px' }}>{label}</div>
      <div style={{ color: '#191414', fontSize: '13px', fontWeight: 600 }}>{value}</div>
    </div>
  )
}

const panelStyle = {
  background: '#fff',
  border: '1px solid #e5e7eb',
  borderRadius: '16px',
  padding: '22px',
}

const panelTitleStyle = {
  fontSize: '16px',
  color: '#111827',
  fontWeight: 600,
}

const menuItemStyle = {
  display: 'block',
  width: '100%',
  padding: '11px 14px',
  border: 'none',
  borderBottom: '1px solid #f3f4f6',
  background: '#fff',
  color: '#374151',
  textAlign: 'left' as const,
  fontSize: '13px',
  fontWeight: 600,
  cursor: 'pointer',
}
