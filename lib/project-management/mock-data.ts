'use client'

import type { ProjectManagementState } from './types'

export const projectManagementSeed: ProjectManagementState = {
  companyId: 'wiseflow-demo',
  clients: [
    { id: 'client-abc', name: 'ABC Corporation' },
    { id: 'client-global', name: 'Global Industries Ltd.' },
    { id: 'client-delta', name: 'Delta Solutions' },
    { id: 'client-summit', name: 'Summit Enterprises' },
    { id: 'client-bright', name: 'Bright Future Co.' },
  ],
  members: [
    { id: 'user-ec', name: 'Emily Clark', role: 'Project Manager', department: 'Delivery', avatarColor: '#6d5dfc', availability: 82 },
    { id: 'user-ms', name: 'Michael Smith', role: 'Lead Engineer', department: 'Engineering', avatarColor: '#f59e0b', availability: 76 },
    { id: 'user-as', name: 'Alex Scott', role: 'Designer', department: 'Design', avatarColor: '#ef4444', availability: 64 },
    { id: 'user-rb', name: 'Robert Brown', role: 'Site Lead', department: 'Operations', avatarColor: '#2563eb', availability: 91 },
    { id: 'user-jw', name: 'Jessica White', role: 'Finance Partner', department: 'Finance', avatarColor: '#16a34a', availability: 58 },
  ],
  projects: [
    { id: 'prj-001', companyId: 'wiseflow-demo', clientId: 'client-abc', name: 'Website Redesign', description: 'Enterprise portal redesign with phased launch.', status: 'In Progress', health: 'Good', priority: 'High', progress: 75, budget: 120000, spent: 68600, committed: 18500, startDate: '2026-04-01', dueDate: '2026-06-20', managerId: 'user-ec', memberIds: ['user-ec', 'user-as', 'user-ms'], tags: ['Design', 'Portal'], department: 'Delivery' },
    { id: 'prj-002', companyId: 'wiseflow-demo', clientId: 'client-global', name: 'Mobile App Development', description: 'Cross-platform operations mobile app.', status: 'In Progress', health: 'At Risk', priority: 'Critical', progress: 60, budget: 250000, spent: 138000, committed: 42000, startDate: '2026-03-10', dueDate: '2026-07-15', managerId: 'user-ms', memberIds: ['user-ms', 'user-rb'], tags: ['Mobile', 'Field Ops'], department: 'Engineering' },
    { id: 'prj-003', companyId: 'wiseflow-demo', clientId: 'client-delta', name: 'CRM Implementation', description: 'CRM rollout and data migration.', status: 'Planning', health: 'Good', priority: 'Medium', progress: 20, budget: 180000, spent: 28000, committed: 12000, startDate: '2026-05-01', dueDate: '2026-08-10', managerId: 'user-as', memberIds: ['user-as', 'user-jw'], tags: ['CRM', 'Migration'], department: 'Sales Ops' },
    { id: 'prj-004', companyId: 'wiseflow-demo', clientId: 'client-summit', name: 'ERP Integration', description: 'Connect project, accounting, and procurement data.', status: 'In Progress', health: 'Delayed', priority: 'High', progress: 40, budget: 300000, spent: 126000, committed: 67000, startDate: '2026-02-15', dueDate: '2026-07-30', managerId: 'user-rb', memberIds: ['user-rb', 'user-ms', 'user-jw'], tags: ['ERP', 'Integration'], department: 'Operations' },
    { id: 'prj-005', companyId: 'wiseflow-demo', clientId: 'client-bright', name: 'Marketing Campaign', description: 'Campaign operations and launch tracking.', status: 'On Hold', health: 'At Risk', priority: 'Low', progress: 10, budget: 75000, spent: 9500, committed: 8000, startDate: '2026-05-11', dueDate: '2026-09-05', managerId: 'user-jw', memberIds: ['user-jw', 'user-as'], tags: ['Marketing'], department: 'Marketing' },
    { id: 'prj-006', companyId: 'wiseflow-demo', clientId: 'client-abc', name: 'Client Portal Phase 2', description: 'Portal enhancements and document workflows.', status: 'Completed', health: 'Good', priority: 'Medium', progress: 100, budget: 90000, spent: 84000, committed: 0, startDate: '2026-01-05', dueDate: '2026-04-28', managerId: 'user-ec', memberIds: ['user-ec', 'user-ms'], tags: ['Portal'], department: 'Delivery' },
  ],
  tasks: [
    { id: 'tsk-001', projectId: 'prj-001', assigneeId: 'user-as', title: 'Finalize design system', description: 'Lock responsive components and tokens.', priority: 'High', status: 'Review', dueDate: '2026-05-24', dependencies: [], labels: ['Design'], attachments: 3, comments: 8, progress: 85 },
    { id: 'tsk-002', projectId: 'prj-001', assigneeId: 'user-ms', title: 'Build account dashboard', description: 'Implement account widgets and loading states.', priority: 'High', status: 'In Progress', dueDate: '2026-05-28', dependencies: ['tsk-001'], labels: ['Frontend'], attachments: 2, comments: 5, progress: 62 },
    { id: 'tsk-003', projectId: 'prj-002', assigneeId: 'user-rb', title: 'Field sync API', description: 'Offline sync and conflict handling.', priority: 'Critical', status: 'Blocked', dueDate: '2026-05-30', dependencies: [], labels: ['API', 'Mobile'], attachments: 1, comments: 11, progress: 35 },
    { id: 'tsk-004', projectId: 'prj-003', assigneeId: 'user-jw', title: 'Map CRM import fields', description: 'Prepare migration mapping with client owners.', priority: 'Medium', status: 'To Do', dueDate: '2026-06-02', dependencies: [], labels: ['Data'], attachments: 0, comments: 2, progress: 10 },
    { id: 'tsk-005', projectId: 'prj-004', assigneeId: 'user-ms', title: 'Procurement connector', description: 'Connect purchase orders to project cost codes.', priority: 'High', status: 'In Progress', dueDate: '2026-06-07', dependencies: [], labels: ['Integration'], attachments: 4, comments: 6, progress: 44 },
    { id: 'tsk-006', projectId: 'prj-006', assigneeId: 'user-ec', title: 'Client handoff', description: 'Package release notes and archive sign-off.', priority: 'Low', status: 'Done', dueDate: '2026-04-27', dependencies: [], labels: ['Delivery'], attachments: 5, comments: 4, progress: 100 },
  ],
  milestones: [
    { id: 'mil-001', projectId: 'prj-001', title: 'Design System Finalization', dueDate: '2026-06-03', priority: 'High', status: 'In Progress' },
    { id: 'mil-002', projectId: 'prj-002', title: 'Alpha Release', dueDate: '2026-06-07', priority: 'High', status: 'Pending' },
    { id: 'mil-003', projectId: 'prj-003', title: 'Data Migration', dueDate: '2026-06-10', priority: 'Medium', status: 'Pending' },
    { id: 'mil-004', projectId: 'prj-004', title: 'Module Testing', dueDate: '2026-06-15', priority: 'Medium', status: 'Delayed' },
    { id: 'mil-005', projectId: 'prj-005', title: 'Campaign Launch', dueDate: '2026-06-20', priority: 'Low', status: 'Pending' },
  ],
  timeLogs: [
    { id: 'log-001', taskId: 'tsk-001', employeeId: 'user-as', projectId: 'prj-001', hours: 6.5, date: '2026-05-14', billable: true, approved: true },
    { id: 'log-002', taskId: 'tsk-002', employeeId: 'user-ms', projectId: 'prj-001', hours: 7, date: '2026-05-15', billable: true, approved: false },
    { id: 'log-003', taskId: 'tsk-003', employeeId: 'user-rb', projectId: 'prj-002', hours: 5.25, date: '2026-05-15', billable: false, approved: false },
    { id: 'log-004', taskId: 'tsk-005', employeeId: 'user-ms', projectId: 'prj-004', hours: 8, date: '2026-05-16', billable: true, approved: true },
  ],
  documents: [
    { id: 'doc-001', projectId: 'prj-001', name: 'Creative Brief.pdf', type: 'PDF', folder: 'Planning', size: '1.8 MB', version: 'v3', updatedAt: '2026-05-12', ownerId: 'user-ec' },
    { id: 'doc-002', projectId: 'prj-002', name: 'Mobile Scope.docx', type: 'DOCX', folder: 'Scope', size: '840 KB', version: 'v2', updatedAt: '2026-05-13', ownerId: 'user-ms' },
    { id: 'doc-003', projectId: 'prj-004', name: 'Integration Map.xlsx', type: 'XLSX', folder: 'Technical', size: '2.2 MB', version: 'v5', updatedAt: '2026-05-14', ownerId: 'user-rb' },
    { id: 'doc-004', projectId: 'prj-004', name: 'Site Layout.dwg', type: 'CAD', folder: 'Drawings', size: '9.7 MB', version: 'v1', updatedAt: '2026-05-10', ownerId: 'user-rb' },
  ],
  activities: [
    { id: 'act-001', projectId: 'prj-001', actorId: 'user-ec', action: 'updated project progress to 75%', createdAt: '2026-05-16T09:20:00' },
    { id: 'act-002', projectId: 'prj-002', actorId: 'user-ms', action: 'flagged Field sync API as blocked', createdAt: '2026-05-15T16:40:00' },
    { id: 'act-003', projectId: 'prj-004', actorId: 'user-rb', action: 'uploaded Integration Map.xlsx', createdAt: '2026-05-14T13:30:00' },
  ],
}
