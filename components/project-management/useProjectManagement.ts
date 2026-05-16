'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  addTaskRecord,
  createProjectRecord,
  loadProjectManagementState,
  saveProjectManagementState,
  updateTaskStatus,
} from '@/lib/project-management/service'
import type { ProjectFilters, ProjectManagementState, ProjectRecord, TaskStatus } from '@/lib/project-management/types'

const defaultFilters: ProjectFilters = {
  query: '',
  status: 'All',
  priority: 'All',
  assignee: 'All',
  department: 'All',
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
    const queryMatch = !query || [project.name, project.description, project.department, manager?.name || '', client?.name || '', ...project.tags].join(' ').toLowerCase().includes(query)
    const statusMatch = filters.status === 'All' || project.status === filters.status
    const priorityMatch = filters.priority === 'All' || project.priority === filters.priority
    const assigneeMatch = filters.assignee === 'All' || project.memberIds.includes(filters.assignee) || project.managerId === filters.assignee
    const departmentMatch = filters.department === 'All' || project.department === filters.department
    return queryMatch && statusMatch && priorityMatch && assigneeMatch && departmentMatch
  }), [filters, state.clients, state.members, state.projects])

  const selectedProject = selectedProjectId ? state.projects.find(project => project.id === selectedProjectId) || null : null

  return {
    state,
    activeTab,
    setActiveTab,
    filters,
    setFilters,
    filteredProjects,
    selectedProject,
    selectedProjectId,
    setSelectedProjectId,
    detailTab,
    setDetailTab,
    createProject: (draft: Pick<ProjectRecord, 'name' | 'clientId' | 'description' | 'budget' | 'dueDate' | 'department'>) => persist(createProjectRecord(state, draft)),
    updateTaskStatus: (taskId: string, status: TaskStatus) => persist(updateTaskStatus(state, taskId, status)),
    addTask: (projectId: string) => persist(addTaskRecord(state, projectId)),
  }
}
