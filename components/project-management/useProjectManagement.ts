'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  addTaskRecord,
  createDocumentRecord,
  createProjectRecord,
  createTaskRecord,
  createTimeLogRecord,
  loadProjectManagementState,
  saveProjectManagementState,
  updateTaskStatus,
} from '@/lib/project-management/service'
import type { DocumentType, ProjectFilters, ProjectManagementState, ProjectRecord, TaskPriority, TaskStatus } from '@/lib/project-management/types'

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
  const [filters, setFilters] = useState<ProjectFilters>(defaultFilters)
  const [activeTab, setActiveTab] = useState('Overview')
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null)
  const [detailTab, setDetailTab] = useState('Overview')

  useEffect(() => {
    const load = () => setState(loadProjectManagementState())
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

  const filteredProjects = useMemo(() => state.projects.filter(project => {
    const query = filters.query.trim().toLowerCase()
    const manager = state.members.find(member => member.id === project.managerId)
    const client = state.clients.find(item => item.id === project.clientId)
    const relatedTasks = state.tasks.filter(task => task.projectId === project.id)
    const relatedDocs = state.documents.filter(document => document.projectId === project.id)
    const queryMatch = !query || [
      project.name,
      project.description,
      project.department,
      manager?.name || '',
      client?.name || '',
      ...project.tags,
      ...relatedTasks.flatMap(task => [task.title, task.description, task.status, task.priority, ...task.labels]),
      ...relatedDocs.flatMap(document => [document.name, document.folder, document.type]),
    ].join(' ').toLowerCase().includes(query)
    const statusMatch = filters.status === 'All' || project.status === filters.status
    const priorityMatch = filters.priority === 'All' || project.priority === filters.priority
    const assigneeMatch = filters.assignee === 'All' || project.memberIds.includes(filters.assignee) || project.managerId === filters.assignee
    const departmentMatch = filters.department === 'All' || project.department === filters.department
    const startsBeforeRangeEnd = !filters.dateTo || new Date(`${project.startDate}T00:00:00`).getTime() <= new Date(`${filters.dateTo}T23:59:59`).getTime()
    const endsAfterRangeStart = !filters.dateFrom || new Date(`${project.dueDate}T00:00:00`).getTime() >= new Date(`${filters.dateFrom}T00:00:00`).getTime()
    return queryMatch && statusMatch && priorityMatch && assigneeMatch && departmentMatch && startsBeforeRangeEnd && endsAfterRangeStart
  }), [filters, state.clients, state.documents, state.members, state.projects, state.tasks])

  const filteredState = useMemo<ProjectManagementState>(() => {
    const projectIds = new Set(filteredProjects.map(project => project.id))
    const inDateRange = (value: string) => {
      const time = new Date(`${value}T00:00:00`).getTime()
      const from = filters.dateFrom ? new Date(`${filters.dateFrom}T00:00:00`).getTime() : Number.NEGATIVE_INFINITY
      const to = filters.dateTo ? new Date(`${filters.dateTo}T23:59:59`).getTime() : Number.POSITIVE_INFINITY
      return time >= from && time <= to
    }
    return {
      ...state,
      projects: filteredProjects,
      tasks: state.tasks.filter(task => projectIds.has(task.projectId) && inDateRange(task.dueDate)),
      milestones: state.milestones.filter(milestone => projectIds.has(milestone.projectId) && inDateRange(milestone.dueDate)),
      timeLogs: state.timeLogs.filter(log => projectIds.has(log.projectId) && inDateRange(log.date)),
      documents: state.documents.filter(document => projectIds.has(document.projectId) && inDateRange(document.updatedAt)),
      activities: state.activities.filter(activity => projectIds.has(activity.projectId) && inDateRange(activity.createdAt.slice(0, 10))),
    }
  }, [filteredProjects, filters.dateFrom, filters.dateTo, state])

  const selectedProject = selectedProjectId ? state.projects.find(project => project.id === selectedProjectId) || null : null

  return {
    state,
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
    createProject: (draft: Pick<ProjectRecord, 'name' | 'clientId' | 'description' | 'budget' | 'dueDate' | 'department'>) => persist(createProjectRecord(state, draft)),
    updateTaskStatus: (taskId: string, status: TaskStatus) => persist(updateTaskStatus(state, taskId, status)),
    addTask: (projectId: string) => persist(addTaskRecord(state, projectId)),
    createTask: (draft: { projectId: string; title: string; description: string; assigneeId: string; priority: TaskPriority; dueDate: string }) => persist(createTaskRecord(state, draft)),
    createTimeLog: (draft: { projectId: string; taskId: string; employeeId: string; hours: number; date: string; billable: boolean }) => persist(createTimeLogRecord(state, draft)),
    createDocument: (draft: { projectId: string; name: string; type: DocumentType; folder: string; size: string; ownerId: string }) => persist(createDocumentRecord(state, draft)),
  }
}
