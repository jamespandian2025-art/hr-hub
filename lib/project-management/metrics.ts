'use client'

import type { ProjectManagementState, ProjectStatus, TaskStatus } from './types'

export function formatMoney(value: number) {
  return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', notation: value >= 1000000 ? 'compact' : 'standard' }).format(value || 0)
}

export function formatDate(value: string) {
  const date = new Date(value.includes('T') ? value : `${value}T00:00:00`)
  return Number.isNaN(date.getTime()) ? '-' : date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export function initials(name: string) {
  return name.split(/\s+/).map(part => part[0]).join('').slice(0, 2).toUpperCase()
}

export function projectStats(state: ProjectManagementState) {
  const totalBudget = state.projects.reduce((sum, project) => sum + project.budget, 0)
  const statusCount = (status: ProjectStatus) => state.projects.filter(project => project.status === status).length
  return {
    totalProjects: state.projects.length,
    completedProjects: statusCount('Completed'),
    inProgressProjects: state.projects.filter(project => ['Active', 'In Progress'].includes(project.status)).length,
    onHoldProjects: statusCount('On Hold'),
    totalBudget,
  }
}

export function progressSegments(state: ProjectManagementState) {
  const statuses: ProjectStatus[] = ['Completed', 'In Progress', 'On Hold', 'Planning', 'Cancelled']
  const colors = ['#16a34a', '#2f80ed', '#f59e0b', '#8b5cf6', '#94a3b8']
  return statuses.map((status, index) => ({
    label: status,
    value: state.projects.filter(project => project.status === status || (status === 'In Progress' && project.status === 'Active')).length,
    color: colors[index],
  }))
}

export function monthlyStatusTrend(state: ProjectManagementState) {
  const labels = Array.from(new Set(state.projects
    .map(project => new Date(`${project.startDate}T00:00:00`))
    .filter(date => !Number.isNaN(date.getTime()))
    .sort((a, b) => a.getTime() - b.getTime())
    .map(date => date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' })))).slice(-6)

  return labels.map(label => ({
    label,
    completed: state.projects.filter(project => project.status === 'Completed' && projectMonth(project.startDate) === label).length,
    inProgress: state.projects.filter(project => ['Active', 'In Progress'].includes(project.status) && projectMonth(project.startDate) === label).length,
    onHold: state.projects.filter(project => project.status === 'On Hold' && projectMonth(project.startDate) === label).length,
    planning: state.projects.filter(project => project.status === 'Planning' && projectMonth(project.startDate) === label).length,
  }))
}

function projectMonth(value: string) {
  const date = new Date(`${value}T00:00:00`)
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' })
}

export function budgetSummary(state: ProjectManagementState) {
  const total = state.projects.reduce((sum, project) => sum + project.budget, 0)
  const spent = state.projects.reduce((sum, project) => sum + project.spent, 0)
  const committed = state.projects.reduce((sum, project) => sum + project.committed, 0)
  return { total, spent, committed, remaining: total - spent - committed }
}

export function workloadByMember(state: ProjectManagementState) {
  return state.members.map(member => {
    const taskCount = state.tasks.filter(task => task.assigneeId === member.id && task.status !== 'Done').length
    return { member, taskCount, workload: Math.min(100, member.availability + taskCount * 4) }
  })
}

export function tasksByStatus(state: ProjectManagementState) {
  const statuses: TaskStatus[] = ['To Do', 'In Progress', 'Review', 'Done', 'Blocked']
  return statuses.map(status => ({ status, tasks: state.tasks.filter(task => task.status === status) }))
}
