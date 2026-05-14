'use client'

export interface TeamMember {
  id: string
  name: string
  employeeId: string
  position: string
  role: string
  employmentType: string
  status: string
  photo?: string
  email?: string
}

export interface HRTeam {
  id: string
  name: string
  code?: string
  department: string
  location?: string
  type: string
  costCenter?: string
  budget?: number
  goals?: string
  description: string
  responsibilities: string[]
  managerName: string
  managerTitle: string
  managerPhoto?: string
  leadName: string
  leadTitle: string
  leadPhoto?: string
  members: TeamMember[]
  openPositions: number
  projects: number
  status: 'Active' | 'Inactive'
  createdAt: string
  updatedAt: string
}

export interface Employee {
  id: string
  employeeId?: string
  firstName?: string
  middleName?: string
  lastName?: string
  email?: string
  photo?: string
  jobTitle?: string
  employeeType?: string
  employeeRole?: string
  employmentStatus?: string
  department?: string
  team?: string
}

export function loadStored<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback
  try {
    const raw = window.localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

export function saveStored<T>(key: string, value: T) {
  window.localStorage.setItem(key, JSON.stringify(value))
}

export function fullName(employee?: Employee) {
  return [employee?.firstName, employee?.lastName].filter(Boolean).join(' ').trim()
}

export function initials(name?: string) {
  const clean = name?.trim() || 'Team'
  return clean.split(' ').filter(Boolean).map(part => part[0]).join('').toUpperCase().slice(0, 2)
}

export function ensureTeams() {
  return loadStored<HRTeam[]>('flowsys-hr-teams', [])
}
