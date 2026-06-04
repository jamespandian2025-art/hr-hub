'use client'

import type { ProjectManagementState } from './types'

// Project Management starts from a clean, empty workspace. Real clients and
// members are sourced live from the company's own data (see liveBaseState in
// service.ts); projects/tasks/etc. are created by the user. No demo/seed data.
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
