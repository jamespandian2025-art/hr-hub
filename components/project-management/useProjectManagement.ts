'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  addProjectNoteRecord,
  addTaskAttachmentRecord,
  addTaskChecklistItemRecord,
  addTaskCommentRecord,
  archiveProjectRecord,
  archiveTaskRecord,
  createMilestoneRecord,
  createDocumentRecord,
  createProjectRecord,
  createTaskRecord,
  createTimeLogRecord,
  deleteMilestoneRecord,
  deleteProjectRecord,
  deleteTaskAttachmentRecord,
  deleteTaskChecklistItemRecord,
  deleteTaskRecord,
  loadProjectManagementState,
  loadSalesOpportunities,
  refreshProjectManagementState,
  restoreProjectRecord,
  saveProjectManagementState,
  updateMilestoneRecord,
  updateMilestoneStatusRecord,
  updateProjectRecord,
  updateProjectStatusRecord,
  updateTaskChecklistItemRecord,
  updateTaskRecord,
  updateTaskStatus,
  type MilestoneDraft,
  type MilestoneUpdateDraft,
  type ProjectCreateDraft,
  type ProjectSalesOpportunity,
  type ProjectUpdateDraft,
  type TaskAttachmentDraft,
  type TaskChecklistDraft,
  type TaskDraft,
  type TaskUpdateDraft,
} from '@/lib/project-management/service'
import type { DocumentType, MilestoneStatus, ProjectFilters, ProjectManagementState, ProjectStatus, TaskStatus } from '@/lib/project-management/types'

const defaultFilters: ProjectFilters = {
  query: '',
  status: 'All',
  priority: 'All',
  assignee: 'All',
  department: 'All',
  dateFrom: '',
  dateTo: '',
}

export function useProjectManagement() {
  const [state, setState] = useState<ProjectManagementState>(() => loadProjectManagementState())
  const [opportunities, setOpportunities] = useState<ProjectSalesOpportunity[]>(() => loadSalesOpportunities())
  const [filters, setFilters] = useState<ProjectFilters>(defaultFilters)
  const [activeTab, setActiveTab] = useState('Overview')
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null)
  const [detailTab, setDetailTab] = useState('Overview')

  useEffect(() => {
    const load = () => {
      setState(loadProjectManagementState())
      setOpportunities(loadSalesOpportunities())
    }
    refreshProjectManagementState().then(next => setState(next)).catch(() => undefined)
    window.addEventListener('storage', load)
    window.addEventListener('wiseflow-project-management-refresh', load)
    return () => {
      window.removeEventListener('storage', load)
      window.removeEventListener('wiseflow-project-management-refresh', load)
    }
  }, [])

  const persist = (next: ProjectManagementState) => {
    setState(next)
    saveProjectManagementState(next)
  }

  const opportunityMap = useMemo(() => new Map(opportunities.map(opportunity => [`${opportunity.source}:${opportunity.id}`, opportunity])), [opportunities])

  const filteredProjects = useMemo(() => state.projects.filter(project => {
    if (project.archivedAt) return false
    const query = filters.query.trim().toLowerCase()
    const manager = state.members.find(member => member.id === project.managerId)
    const client = state.clients.find(item => item.id === project.clientId)
    const opportunity = project.opportunitySource && project.opportunityId ? opportunityMap.get(`${project.opportunitySource}:${project.opportunityId}`) : undefined
    const relatedTasks = state.tasks.filter(task => task.projectId === project.id && !task.archivedAt)
    const relatedDocs = state.documents.filter(document => document.projectId === project.id)
    const relatedTaskIds = new Set(relatedTasks.map(task => task.id))
    const relatedComments = state.taskComments.filter(comment => relatedTaskIds.has(comment.taskId))
    const relatedAttachments = state.taskAttachments.filter(attachment => relatedTaskIds.has(attachment.taskId))
    const relatedChecklistItems = state.taskChecklists.filter(item => relatedTaskIds.has(item.taskId))
    const queryMatch = !query || [
      project.name,
      project.description,
      project.department,
      manager?.name || '',
      client?.name || '',
      opportunity?.label || '',
      opportunity?.clientName || '',
      opportunity?.status || '',
      ...project.tags,
      ...relatedTasks.flatMap(task => [task.title, task.description, task.status, task.priority, ...task.labels]),
      ...relatedComments.map(comment => comment.body),
      ...relatedAttachments.flatMap(attachment => [attachment.name, attachment.fileType, attachment.note || '', attachment.evidence ? 'evidence' : '']),
      ...relatedChecklistItems.map(item => item.title),
      ...relatedDocs.flatMap(document => [document.name, document.folder, document.type]),
    ].join(' ').toLowerCase().includes(query)
    const statusMatch = filters.status === 'All' || project.status === filters.status
    const priorityMatch = filters.priority === 'All' || project.priority === filters.priority
    const assigneeMatch = filters.assignee === 'All' || project.memberIds.includes(filters.assignee) || project.managerId === filters.assignee
    const departmentMatch = filters.department === 'All' || project.department === filters.department
    const startsBeforeRangeEnd = !filters.dateTo || new Date(`${project.startDate}T00:00:00`).getTime() <= new Date(`${filters.dateTo}T23:59:59`).getTime()
    const endsAfterRangeStart = !filters.dateFrom || new Date(`${project.dueDate}T00:00:00`).getTime() >= new Date(`${filters.dateFrom}T00:00:00`).getTime()
    return queryMatch && statusMatch && priorityMatch && assigneeMatch && departmentMatch && startsBeforeRangeEnd && endsAfterRangeStart
  }), [filters, opportunityMap, state.clients, state.documents, state.members, state.projects, state.taskAttachments, state.taskChecklists, state.taskComments, state.tasks])

  const filteredState = useMemo<ProjectManagementState>(() => {
    const projectIds = new Set(filteredProjects.map(project => project.id))
    const activeTasks = state.tasks.filter(task => !task.archivedAt)
    const activeTaskIds = new Set(activeTasks.map(task => task.id))
    const inDateRange = (value: string) => {
      const time = new Date(`${value}T00:00:00`).getTime()
      const from = filters.dateFrom ? new Date(`${filters.dateFrom}T00:00:00`).getTime() : Number.NEGATIVE_INFINITY
      const to = filters.dateTo ? new Date(`${filters.dateTo}T23:59:59`).getTime() : Number.POSITIVE_INFINITY
      return time >= from && time <= to
    }
    return {
      ...state,
      projects: filteredProjects,
      tasks: activeTasks.filter(task => projectIds.has(task.projectId) && inDateRange(task.dueDate)),
      milestones: state.milestones.filter(milestone => projectIds.has(milestone.projectId) && inDateRange(milestone.dueDate)),
      timeLogs: state.timeLogs.filter(log => projectIds.has(log.projectId) && activeTaskIds.has(log.taskId) && inDateRange(log.date)),
      documents: state.documents.filter(document => projectIds.has(document.projectId) && inDateRange(document.updatedAt)),
      taskComments: state.taskComments.filter(comment => projectIds.has(comment.projectId) && activeTaskIds.has(comment.taskId) && inDateRange(comment.createdAt.slice(0, 10))),
      taskAttachments: state.taskAttachments.filter(attachment => projectIds.has(attachment.projectId) && activeTaskIds.has(attachment.taskId) && inDateRange(attachment.uploadedAt.slice(0, 10))),
      taskChecklists: state.taskChecklists.filter(item => projectIds.has(item.projectId) && activeTaskIds.has(item.taskId)),
      activities: state.activities.filter(activity => projectIds.has(activity.projectId) && inDateRange(activity.createdAt.slice(0, 10))),
    }
  }, [filteredProjects, filters.dateFrom, filters.dateTo, state])

  const selectedProject = selectedProjectId ? state.projects.find(project => project.id === selectedProjectId) || null : null

  return {
    state,
    opportunities,
    activeTab,
    setActiveTab,
    filters,
    setFilters,
    filteredProjects,
    filteredState,
    selectedProject,
    selectedProjectId,
    setSelectedProjectId,
    detailTab,
    setDetailTab,
    createProject: (draft: ProjectCreateDraft) => persist(createProjectRecord(state, draft)),
    updateProject: (projectId: string, patch: ProjectUpdateDraft, action?: string) => persist(updateProjectRecord(state, projectId, patch, action)),
    updateProjectStatus: (projectId: string, status: ProjectStatus) => persist(updateProjectStatusRecord(state, projectId, status)),
    archiveProject: (projectId: string) => persist(archiveProjectRecord(state, projectId)),
    restoreProject: (projectId: string) => persist(restoreProjectRecord(state, projectId)),
    deleteProject: (projectId: string) => persist(deleteProjectRecord(state, projectId)),
    addProjectNote: (projectId: string, note: string) => persist(addProjectNoteRecord(state, projectId, note)),
    createMilestone: (draft: MilestoneDraft) => persist(createMilestoneRecord(state, draft)),
    updateMilestone: (milestoneId: string, patch: MilestoneUpdateDraft) => persist(updateMilestoneRecord(state, milestoneId, patch)),
    updateMilestoneStatus: (milestoneId: string, status: MilestoneStatus) => persist(updateMilestoneStatusRecord(state, milestoneId, status)),
    deleteMilestone: (milestoneId: string) => persist(deleteMilestoneRecord(state, milestoneId)),
    updateTaskStatus: (taskId: string, status: TaskStatus) => persist(updateTaskStatus(state, taskId, status)),
    updateTask: (taskId: string, patch: TaskUpdateDraft) => persist(updateTaskRecord(state, taskId, patch)),
    archiveTask: (taskId: string) => persist(archiveTaskRecord(state, taskId)),
    deleteTask: (taskId: string) => persist(deleteTaskRecord(state, taskId)),
    addTaskComment: (taskId: string, body: string) => persist(addTaskCommentRecord(state, taskId, body)),
    addTaskAttachment: (draft: TaskAttachmentDraft) => persist(addTaskAttachmentRecord(state, draft)),
    addTaskAttachments: (drafts: TaskAttachmentDraft[]) => persist(drafts.reduce((next, draft) => addTaskAttachmentRecord(next, draft), state)),
    deleteTaskAttachment: (attachmentId: string) => persist(deleteTaskAttachmentRecord(state, attachmentId)),
    addTaskChecklistItem: (draft: TaskChecklistDraft) => persist(addTaskChecklistItemRecord(state, draft)),
    updateTaskChecklistItem: (itemId: string, patch: { title?: string; done?: boolean }) => persist(updateTaskChecklistItemRecord(state, itemId, patch)),
    deleteTaskChecklistItem: (itemId: string) => persist(deleteTaskChecklistItemRecord(state, itemId)),
    createTask: (draft: TaskDraft) => persist(createTaskRecord(state, draft)),
    createTimeLog: (draft: { projectId: string; taskId: string; employeeId: string; hours: number; date: string; billable: boolean }) => persist(createTimeLogRecord(state, draft)),
    createDocument: (draft: { projectId: string; name: string; type: DocumentType; folder: string; size: string; ownerId: string }) => persist(createDocumentRecord(state, draft)),
  }
}
