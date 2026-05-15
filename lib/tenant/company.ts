'use client'

export type CompanyRole =
  | 'Owner'
  | 'Admin'
  | 'Finance'
  | 'HR'
  | 'Project Manager'
  | 'Sales'
  | 'Warehouse'
  | 'Procurement'
  | 'Member'

export type CompanyPermission =
  | 'dashboard'
  | 'clients'
  | 'sales'
  | 'projects'
  | 'financials'
  | 'hr'
  | 'procurement'
  | 'warehouse'
  | 'workflows'
  | 'datasets'
  | 'documents'
  | 'reports'
  | 'settings'
  | 'members'

export interface CompanyMember {
  id: string
  email: string
  name?: string
  role: CompanyRole
  permissions: CompanyPermission[]
  status: 'Active' | 'Pending'
  invitedAt?: string
  joinedAt?: string
}

export interface CompanyRecord {
  id: string
  name: string
  type: string
  createdAt: string
  ownerEmail: string
  members: CompanyMember[]
  settings: {
    currency: string
    timezone: string
    fiscalYearStart: string
  }
}

type AccountSnapshot = {
  company?: string
  companyId?: string
  email?: string
  fullName?: string
  name?: string
}

export const companiesKey = 'wiseflow-companies'
export const activeCompanyKey = 'wiseflow-active-company-id'
export const companyChangeEvent = 'wiseflow-company-change'

const accountKey = 'flowsys-account'
const sessionKey = 'flowsys-auth-session'
const allPermissions: CompanyPermission[] = [
  'dashboard',
  'clients',
  'sales',
  'projects',
  'financials',
  'hr',
  'procurement',
  'warehouse',
  'workflows',
  'datasets',
  'documents',
  'reports',
  'settings',
  'members',
]

export function rolePermissions(role: CompanyRole): CompanyPermission[] {
  if (role === 'Owner' || role === 'Admin') return allPermissions
  if (role === 'Finance') return ['dashboard', 'clients', 'sales', 'financials', 'reports']
  if (role === 'HR') return ['dashboard', 'hr', 'workflows', 'settings']
  if (role === 'Project Manager') return ['dashboard', 'clients', 'projects', 'workflows', 'documents']
  if (role === 'Sales') return ['dashboard', 'clients', 'sales', 'workflows']
  if (role === 'Warehouse') return ['dashboard', 'warehouse', 'procurement']
  if (role === 'Procurement') return ['dashboard', 'procurement', 'warehouse']
  return ['dashboard']
}

export function loadCompanies(): CompanyRecord[] {
  if (typeof window === 'undefined') return []
  try {
    const parsed = JSON.parse(window.localStorage.getItem(companiesKey) || '[]') as unknown
    return Array.isArray(parsed) ? parsed.filter(isCompanyRecord) : []
  } catch {
    return []
  }
}

export function saveCompanies(companies: CompanyRecord[]) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(companiesKey, JSON.stringify(companies))
}

export function getCurrentActor(): AccountSnapshot {
  if (typeof window === 'undefined') return {}
  const account = readJson<AccountSnapshot>(accountKey) || {}
  const session = readJson<AccountSnapshot>(sessionKey) || {}
  return { ...session, ...account }
}

export function ensureDefaultCompany(accountSnapshot?: AccountSnapshot): CompanyRecord {
  const actor = { ...getCurrentActor(), ...accountSnapshot }
  const actorEmail = actor.email || 'owner@wiseflow.local'
  const companies = loadCompanies()
  const activeId = getStoredActiveCompanyId()
  const active = companies.find(company => company.id === activeId && isCompanyMember(company, actorEmail))
  if (active) return active

  const memberCompany = companies.find(company => isCompanyMember(company, actorEmail))
  if (memberCompany) {
    persistActiveCompany(memberCompany)
    return memberCompany
  }

  const company = makeCompany(actor.company || 'WiseFlow Company', {
    ownerEmail: actorEmail,
    ownerName: actor.fullName || actor.name,
    id: actor.companyId,
  })
  const nextCompanies = [company, ...companies]
  saveCompanies(nextCompanies)
  persistActiveCompany(company)
  return company
}

export function getActiveCompany(): CompanyRecord | null {
  if (typeof window === 'undefined') return null
  const actor = getCurrentActor()
  const companies = loadCompanies()
  const activeId = getStoredActiveCompanyId() || actor.companyId
  const active = companies.find(company => company.id === activeId && isCompanyMember(company, actor.email))
  return active || ensureDefaultCompany(actor)
}

export function createCompany(name: string, options: Partial<Pick<CompanyRecord, 'type'>> = {}) {
  const actor = getCurrentActor()
  const company = makeCompany(name, {
    ownerEmail: actor.email || 'owner@wiseflow.local',
    ownerName: actor.fullName || actor.name,
    type: options.type,
  })
  const companies = [company, ...loadCompanies()]
  saveCompanies(companies)
  persistActiveCompany(company)
  return company
}

export function setActiveCompanyId(companyId: string) {
  const actor = getCurrentActor()
  const company = loadCompanies().find(item => item.id === companyId)
  if (!company || !isCompanyMember(company, actor.email)) return null
  persistActiveCompany(company)
  return company
}

export function updateCompanySettings(companyId: string, patch: Partial<CompanyRecord['settings']> & { name?: string; type?: string }): CompanyRecord | null {
  let updated: CompanyRecord | null = null
  const companies = loadCompanies().map(company => {
    if (company.id !== companyId) return company
    updated = {
      ...company,
      name: patch.name?.trim() || company.name,
      type: patch.type?.trim() || company.type,
      settings: {
        ...company.settings,
        currency: patch.currency || company.settings.currency,
        timezone: patch.timezone || company.settings.timezone,
        fiscalYearStart: patch.fiscalYearStart || company.settings.fiscalYearStart,
      },
    }
    return updated
  })
  saveCompanies(companies)
  if (updated && getStoredActiveCompanyId() === companyId) persistActiveCompany(updated)
  return updated
}

export function inviteCompanyMember(companyId: string, email: string, role: CompanyRole) {
  const normalizedEmail = email.trim().toLowerCase()
  if (!normalizedEmail) return null
  let invited: CompanyMember | null = null
  const companies = loadCompanies().map(company => {
    if (company.id !== companyId) return company
    const existing = company.members.find(member => member.email.toLowerCase() === normalizedEmail)
    if (existing) {
      invited = existing
      return company
    }
    invited = {
      id: `mem-${Date.now()}`,
      email: normalizedEmail,
      role,
      permissions: rolePermissions(role),
      status: 'Pending',
      invitedAt: new Date().toISOString(),
    }
    return { ...company, members: [...company.members, invited] }
  })
  saveCompanies(companies)
  const active = companies.find(company => company.id === companyId)
  if (active && getStoredActiveCompanyId() === companyId) persistActiveCompany(active)
  return invited
}

export function removeCompanyMember(companyId: string, memberId: string) {
  let active: CompanyRecord | undefined
  const companies = loadCompanies().map(company => {
    if (company.id !== companyId) return company
    active = { ...company, members: company.members.filter(member => member.id !== memberId || member.role === 'Owner') }
    return active
  })
  saveCompanies(companies)
  if (active && getStoredActiveCompanyId() === companyId) persistActiveCompany(active)
}

export function isCompanyMember(company: CompanyRecord, email?: string) {
  if (!email) return true
  return company.members.some(member => member.email.toLowerCase() === email.toLowerCase())
}

export function canAccessCompany(companyId: string, email?: string) {
  const actorEmail = email || getCurrentActor().email
  const company = loadCompanies().find(item => item.id === companyId)
  return Boolean(company && isCompanyMember(company, actorEmail))
}

export function companyScopedKey(baseKey: string, companyId = getActiveCompany()?.id) {
  return companyId ? `${baseKey}:${companyId}` : baseKey
}

export function dispatchCompanyChange(company: CompanyRecord) {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent(companyChangeEvent, { detail: company }))
  window.dispatchEvent(new Event('storage'))
}

function makeCompany(name: string, options: { ownerEmail: string; ownerName?: string; type?: string; id?: string }): CompanyRecord {
  const cleanName = name.trim() || 'WiseFlow Company'
  const owner: CompanyMember = {
    id: `mem-${Date.now()}`,
    email: options.ownerEmail,
    name: options.ownerName,
    role: 'Owner',
    permissions: allPermissions,
    status: 'Active',
    joinedAt: new Date().toISOString(),
  }
  return {
    id: options.id || uniqueCompanyId(cleanName),
    name: cleanName,
    type: options.type || 'Operating Company',
    createdAt: new Date().toISOString(),
    ownerEmail: options.ownerEmail,
    members: [owner],
    settings: {
      currency: 'USD',
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
      fiscalYearStart: 'January',
    },
  }
}

function uniqueCompanyId(name: string) {
  const base = slugifyCompanyId(name)
  const existing = new Set(loadCompanies().map(company => company.id))
  if (!existing.has(base)) return base
  let index = 2
  while (existing.has(`${base}-${index}`)) index += 1
  return `${base}-${index}`
}

function slugifyCompanyId(name: string) {
  const slug = name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
  return slug || `company-${Date.now()}`
}

function persistActiveCompany(company: CompanyRecord) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(activeCompanyKey, company.id)
  const account = readJson<AccountSnapshot>(accountKey) || {}
  window.localStorage.setItem(accountKey, JSON.stringify({ ...account, company: company.name, companyId: company.id }))
  dispatchCompanyChange(company)
}

function getStoredActiveCompanyId() {
  if (typeof window === 'undefined') return ''
  return window.localStorage.getItem(activeCompanyKey) || ''
}

function readJson<T>(key: string): T | null {
  try {
    const value = window.localStorage.getItem(key)
    return value ? JSON.parse(value) as T : null
  } catch {
    return null
  }
}

function isCompanyRecord(value: unknown): value is CompanyRecord {
  if (!value || typeof value !== 'object') return false
  const company = value as Partial<CompanyRecord>
  return typeof company.id === 'string' && typeof company.name === 'string' && Array.isArray(company.members)
}
