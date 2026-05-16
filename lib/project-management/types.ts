'use client'

export type ProjectStatus = 'Planning' | 'Active' | 'In Progress' | 'On Hold' | 'Completed' | 'Cancelled'
export type ProjectHealth = 'Good' | 'At Risk' | 'Delayed'
export type TaskStatus = 'To Do' | 'In Progress' | 'Review' | 'Done' | 'Blocked'
export type TaskPriority = 'Low' | 'Medium' | 'High' | 'Critical'
export type MilestoneStatus = 'Pending' | 'In Progress' | 'Done' | 'Delayed'
export type DocumentType = 'PDF' | 'DOCX' | 'XLSX' | 'Image' | 'CAD'

export type ProjectMember = {
  id: string
  name: string
  role: string
  department: string
  avatarColor: string
  availability: number
}

export type ProjectRecord = {
  id: string
  companyId: string
  clientId: string
  name: string
  description: string
  status: ProjectStatus
  health: ProjectHealth
  priority: TaskPriority
  progress: number
  budget: number
  spent: number
  committed: number
  startDate: string
  dueDate: string
  managerId: string
  memberIds: string[]
  tags: string[]
  department: string
}

export type ProjectTask = {
  id: string
  projectId: string
  assigneeId: string
  title: string
  description: string
  priority: TaskPriority
  status: TaskStatus
  dueDate: string
  dependencies: string[]
  labels: string[]
  attachments: number
  comments: number
  progress: number
}

export type ProjectMilestone = {
  id: string
  projectId: string
  title: string
  dueDate: string
  priority: TaskPriority
  status: MilestoneStatus
}

export type ProjectTimeLog = {
  id: string
  taskId: string
  employeeId: string
  projectId: string
  hours: number
  date: string
  billable: boolean
  approved: boolean
}

export type ProjectDocument = {
  id: string
  projectId: string
  name: string
  type: DocumentType
  folder: string
  size: string
  version: string
  updatedAt: string
  ownerId: string
}

export type ProjectActivity = {
  id: string
  projectId: string
  actorId: string
  action: string
  createdAt: string
}

export type ProjectManagementState = {
  companyId: string
  clients: Array<{ id: string; name: string }>
  members: ProjectMember[]
  projects: ProjectRecord[]
  tasks: ProjectTask[]
  milestones: ProjectMilestone[]
  timeLogs: ProjectTimeLog[]
  documents: ProjectDocument[]
  activities: ProjectActivity[]
}

export type ProjectFilters = {
  query: string
  status: string
  priority: string
  assignee: string
  department: string
  dateFrom: string
  dateTo: string
}
