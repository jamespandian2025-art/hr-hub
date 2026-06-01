'use client'

import type { ProjectManagementState } from './types'

export const mockProjectClients = [
  { id: 'client-abc', name: 'ABC Builders' },
  { id: 'client-global', name: 'Global Retail Group' },
  { id: 'client-delta', name: 'Delta Logistics' },
  { id: 'client-summit', name: 'Summit Properties' },
]

export const mockProjectMembers = [
  { id: 'user-ec', name: 'Elena Cruz', role: 'Project Manager', department: 'Delivery', avatarColor: '#3b82f6', availability: 78 },
  { id: 'user-ms', name: 'Marco Santos', role: 'Site Engineer', department: 'Engineering', avatarColor: '#71717a', availability: 84 },
  { id: 'user-as', name: 'Ariana Sy', role: 'Procurement Lead', department: 'Procurement', avatarColor: '#52525b', availability: 66 },
  { id: 'user-rb', name: 'Rafael Bautista', role: 'QA Reviewer', department: 'Operations', avatarColor: '#a1a1aa', availability: 72 },
  { id: 'user-jw', name: 'Jessa Wong', role: 'Finance Analyst', department: 'Finance', avatarColor: '#27272a', availability: 64 },
]

export const mockProjects = [
  {
    id: 'prj-001',
    companyId: 'wiseflow-local',
    clientId: 'client-abc',
    name: 'Warehouse Expansion',
    description: 'Phase two buildout for additional inventory capacity and dock staging.',
    status: 'In Progress',
    health: 'Good',
    priority: 'High',
    progress: 68,
    budget: 8200000,
    spent: 4380000,
    committed: 910000,
    startDate: '2026-01-15',
    dueDate: '2026-07-30',
    managerId: 'user-ec',
    memberIds: ['user-ec', 'user-ms', 'user-as'],
    tags: ['Construction', 'Expansion'],
    department: 'Construction',
  },
  {
    id: 'prj-002',
    companyId: 'wiseflow-local',
    clientId: 'client-global',
    name: 'Retail Fit-Out Program',
    description: 'Coordinated fit-out package for five new branch locations.',
    status: 'Active',
    health: 'At Risk',
    priority: 'Critical',
    progress: 42,
    budget: 5400000,
    spent: 2260000,
    committed: 780000,
    startDate: '2026-02-04',
    dueDate: '2026-08-18',
    managerId: 'user-rb',
    memberIds: ['user-rb', 'user-as', 'user-jw'],
    tags: ['Retail', 'Multi-site'],
    department: 'Delivery',
  },
  {
    id: 'prj-003',
    companyId: 'wiseflow-local',
    clientId: 'client-delta',
    name: 'Fleet Yard Upgrade',
    description: 'Paving, lighting, and secure access upgrades for the logistics yard.',
    status: 'On Hold',
    health: 'Delayed',
    priority: 'Medium',
    progress: 24,
    budget: 3100000,
    spent: 830000,
    committed: 270000,
    startDate: '2026-03-01',
    dueDate: '2026-09-12',
    managerId: 'user-ms',
    memberIds: ['user-ms', 'user-ec'],
    tags: ['Infrastructure'],
    department: 'Operations',
  },
  {
    id: 'prj-004',
    companyId: 'wiseflow-local',
    clientId: 'client-summit',
    name: 'Condo Turnover Automation',
    description: 'Document, punch-list, and client handover workflow for unit turnover.',
    status: 'Completed',
    health: 'Good',
    priority: 'Low',
    progress: 100,
    budget: 1850000,
    spent: 1680000,
    committed: 0,
    startDate: '2025-11-08',
    dueDate: '2026-04-20',
    managerId: 'user-ec',
    memberIds: ['user-ec', 'user-rb', 'user-jw'],
    tags: ['Automation', 'Turnover'],
    department: 'Administration',
  },
] as ProjectManagementState['projects']

export const mockProjectTasks = [
  { id: 'tsk-001', projectId: 'prj-001', assigneeId: 'user-ms', title: 'Finalize dock slab inspection', description: 'Close structural inspection notes before the concrete pour.', priority: 'High', status: 'In Progress', dueDate: '2026-05-28', dependencies: [], labels: ['Site'], attachments: 3, comments: 6, progress: 62 },
  { id: 'tsk-002', projectId: 'prj-001', assigneeId: 'user-as', title: 'Confirm racking supplier delivery', description: 'Validate material arrival date and unload plan.', priority: 'Medium', status: 'To Do', dueDate: '2026-06-03', dependencies: ['tsk-001'], labels: ['Procurement'], attachments: 1, comments: 2, progress: 10 },
  { id: 'tsk-003', projectId: 'prj-002', assigneeId: 'user-rb', title: 'Review branch punch list', description: 'Check open defects and assign final owners.', priority: 'Critical', status: 'Review', dueDate: '2026-05-30', dependencies: [], labels: ['QA'], attachments: 5, comments: 8, progress: 80 },
  { id: 'tsk-004', projectId: 'prj-002', assigneeId: 'user-jw', title: 'Reconcile variation orders', description: 'Match approved variations against budget actuals.', priority: 'High', status: 'Blocked', dueDate: '2026-06-07', dependencies: ['tsk-003'], labels: ['Finance'], attachments: 2, comments: 4, progress: 35 },
  { id: 'tsk-005', projectId: 'prj-004', assigneeId: 'user-ec', title: 'Archive handover documents', description: 'Move signed turnover files into final project folders.', priority: 'Low', status: 'Done', dueDate: '2026-04-18', dependencies: [], labels: ['Documents'], attachments: 4, comments: 1, progress: 100 },
] as ProjectManagementState['tasks']

export const mockProjectMilestones = [
  { id: 'mil-001', projectId: 'prj-001', title: 'Structural inspection sign-off', dueDate: '2026-05-31', priority: 'High', status: 'In Progress' },
  { id: 'mil-002', projectId: 'prj-002', title: 'Branch three turnover', dueDate: '2026-06-14', priority: 'Critical', status: 'Pending' },
  { id: 'mil-003', projectId: 'prj-003', title: 'Permit clarification response', dueDate: '2026-06-21', priority: 'Medium', status: 'Delayed' },
  { id: 'mil-004', projectId: 'prj-004', title: 'Final document archive', dueDate: '2026-04-20', priority: 'Low', status: 'Done' },
] as ProjectManagementState['milestones']

export const mockProjectTimeLogs = [
  { id: 'log-001', taskId: 'tsk-001', employeeId: 'user-ms', projectId: 'prj-001', hours: 6.5, date: '2026-05-20', billable: true, approved: true },
  { id: 'log-002', taskId: 'tsk-003', employeeId: 'user-rb', projectId: 'prj-002', hours: 4, date: '2026-05-19', billable: true, approved: false },
  { id: 'log-003', taskId: 'tsk-004', employeeId: 'user-jw', projectId: 'prj-002', hours: 3.25, date: '2026-05-18', billable: false, approved: false },
  { id: 'log-004', taskId: 'tsk-005', employeeId: 'user-ec', projectId: 'prj-004', hours: 2, date: '2026-04-19', billable: true, approved: true },
] as ProjectManagementState['timeLogs']

export const mockProjectDocuments = [
  { id: 'doc-001', projectId: 'prj-001', name: 'Dock Slab Inspection.pdf', type: 'PDF', folder: 'Inspections', size: '1.8 MB', version: 'v3', updatedAt: '2026-05-20', ownerId: 'user-ms' },
  { id: 'doc-002', projectId: 'prj-002', name: 'Branch Punch List.xlsx', type: 'XLSX', folder: 'Quality', size: '740 KB', version: 'v5', updatedAt: '2026-05-19', ownerId: 'user-rb' },
  { id: 'doc-003', projectId: 'prj-003', name: 'Permit Response.docx', type: 'DOCX', folder: 'Permits', size: '420 KB', version: 'v2', updatedAt: '2026-05-17', ownerId: 'user-ec' },
  { id: 'doc-004', projectId: 'prj-004', name: 'Turnover Archive.pdf', type: 'PDF', folder: 'Handover', size: '2.3 MB', version: 'v1', updatedAt: '2026-04-20', ownerId: 'user-jw' },
] as ProjectManagementState['documents']

export const mockProjectActivities = [
  { id: 'act-001', projectId: 'prj-001', actorId: 'user-ms', action: 'Marco Santos updated dock inspection progress.', createdAt: '2026-05-20T09:30:00.000Z' },
  { id: 'act-002', projectId: 'prj-002', actorId: 'user-rb', action: 'Rafael Bautista moved branch punch list to review.', createdAt: '2026-05-19T14:15:00.000Z' },
  { id: 'act-003', projectId: 'prj-004', actorId: 'user-ec', action: 'Elena Cruz completed turnover document archive.', createdAt: '2026-04-20T11:05:00.000Z' },
] as ProjectManagementState['activities']

export const emptyProjectManagementState: ProjectManagementState = {
  companyId: 'wiseflow-local',
  clients: [],
  members: [],
  projects: [],
  tasks: [],
  milestones: [],
  timeLogs: [],
  documents: [],
  taskComments: [],
  taskAttachments: [],
  taskChecklists: [],
  activities: [],
}

export function mockProjectManagementState(companyId = 'wiseflow-local'): ProjectManagementState {
  return {
    companyId,
    clients: mockProjectClients,
    members: mockProjectMembers,
    projects: mockProjects.map(project => ({ ...project, companyId })),
    tasks: mockProjectTasks,
    milestones: mockProjectMilestones,
    timeLogs: mockProjectTimeLogs,
    documents: mockProjectDocuments,
    taskComments: [],
    taskAttachments: [],
    taskChecklists: [],
    activities: mockProjectActivities,
  }
}
