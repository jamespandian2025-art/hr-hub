'use client'

export type ProjectStatus = 'Planning' | 'Active' | 'In Progress' | 'On Hold' | 'Completed' | 'Cancelled'
export type ProjectHealth = 'Good' | 'At Risk' | 'Delayed'
export type TaskStatus = 'To Do' | 'In Progress' | 'Review' | 'Done' | 'Blocked'
export type TaskPriority = 'Low' | 'Medium' | 'High' | 'Critical'
export type TaskRecurrence = 'None' | 'Daily' | 'Weekly' | 'Monthly'
export type MilestoneStatus = 'Pending' | 'In Progress' | 'Done' | 'Delayed'
export type DocumentType = 'PDF' | 'DOCX' | 'XLSX' | 'Image' | 'CAD'
export type ProjectOpportunitySource = 'sales' | 'legacy'

export type ProjectLocation = {
  address: string
  city: string
  province: string
  postalCode: string
}

export type ProjectBudgetBreakdown = {
  direct: number
  indirect: number
  contingency: number
  other: number
}

export type ProjectSettings = {
  allowTaskCreation: boolean
  enableBudgetTracking: boolean
  enableTimeTracking: boolean
  enableDocumentManagement: boolean
}

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
  code?: string
  projectType?: string
  contractType?: string
  location?: ProjectLocation
  budgetBreakdown?: ProjectBudgetBreakdown
  settings?: ProjectSettings
  thumbnailDataUrl?: string
  thumbnailAssetId?: string
  opportunityId?: string
  opportunitySource?: ProjectOpportunitySource
  archivedAt?: string
  updatedAt?: string
}

export type ProjectTask = {
  id: string
  projectId: string
  assigneeId: string
  title: string
  description: string
  priority: TaskPriority
  status: TaskStatus
  startDate?: string
  dueDate: string
  category?: string
  followers?: string[]
  department?: string
  team?: string
  duration?: string
  workingDays?: string
  estimatedHours?: number
  timeType?: string
  budget?: number
  billable?: boolean
  costCode?: string
  dependencies: string[]
  labels: string[]
  attachments: number
  comments: number
  progress: number
  recurrence?: TaskRecurrence
  recurrenceInterval?: number
  recurrenceEndDate?: string
  recurringParentId?: string
  recurrenceGeneratedFromId?: string
  archivedAt?: string
  updatedAt?: string
}

export type ProjectMilestone = {
  id: string
  projectId: string
  title: string
  phase?: string
  baselineDate?: string
  dueDate: string
  priority: TaskPriority
  status: MilestoneStatus
  completedAt?: string
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

export type ProjectTaskComment = {
  id: string
  taskId: string
  projectId: string
  actorId: string
  body: string
  createdAt: string
}

export type ProjectTaskAttachment = {
  id: string
  taskId: string
  projectId: string
  name: string
  fileType: string
  mimeType: string
  size: string
  uploadedAt: string
  ownerId: string
  evidence: boolean
  note?: string
  dataUrl?: string
  fileUrl?: string
  objectKey?: string
  storageProvider?: string
}

export type ProjectTaskChecklistItem = {
  id: string
  taskId: string
  projectId: string
  title: string
  done: boolean
  createdAt: string
  completedAt?: string
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
  taskComments: ProjectTaskComment[]
  taskAttachments: ProjectTaskAttachment[]
  taskChecklists: ProjectTaskChecklistItem[]
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
