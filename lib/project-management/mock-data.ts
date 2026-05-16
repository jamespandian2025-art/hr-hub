'use client'

import type { ProjectManagementState } from './types'

export const emptyProjectManagementState: ProjectManagementState = {
  companyId: 'wiseflow-local',
  clients: [],
  members: [],
  projects: [],
  tasks: [],
  milestones: [],
  timeLogs: [],
  documents: [],
  activities: [],
}
