'use client'

import { getSupabaseBrowserClient } from '@/lib/auth/supabaseClient'
import { withCsrfHeaders } from '@/lib/security/csrfClient'

export type CompanyRole =
  | 'Owner'
  | 'Admin'
  | 'Finance'
  | 'HR'
  | 'Employee'
  | 'Team Manager'
  | 'Project Manager'
  | 'Support'
  | 'Client'
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

export function authRoleForCompanyRole(role?: string) {
  if (role === 'Admin') return 'Admin'
  if (role === 'Finance') return 'Finance'
  if (role === 'HR') return 'HR'
  if (role === 'Employee') return 'Employee'
  if (role === 'Team Manager') return 'Team Manager'
  if (role === 'Project Manager') return 'Project Manager'
  if (role === 'Client') return 'Client'
  return 'Support'
}

export function loadCompanies(): CompanyRecord[] {
  if (typeof window === 'undefined') return []
  try {
    const parsed = JSON.parse(window.localStorage.getItem(companiesKey) || '[]') as unknown
    const records = Array.isArray(parsed) ? parsed.filter(isCompanyRecord) : []
    const normalized = normalizeCompanyIds(records)
    if (normalized.changed) {
      window.localStorage.setItem(companiesKey, JSON.stringify(normalized.companies))
      if (normalized.activeCompanyId) window.localStorage.setItem(activeCompanyKey, normalized.activeCompanyId)
    }
    return normalized.companies
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
  const companies = loadCompanies()
  const target = companies.find(item => item.id === companyId)
  if (!target) return null

  const previousId = getStoredActiveCompanyId()

  // If the actor isn't a member of this workspace yet, auto-enroll them.
  // The UI lists every known company and labels non-member entries "Continue",
  // which signals "join + switch." Without this step, clicking Continue is a
  // no-op because both setActiveCompanyId and getActiveCompany re-check
  // membership and bounce the actor back to their default workspace.
  let company = target
  if (actor.email && !isCompanyMember(target, actor.email)) {
    const joinedMember: CompanyMember = {
      id: `mem-${Date.now()}`,
      email: actor.email.toLowerCase(),
      name: actor.fullName || actor.name,
      role: 'Admin',
      permissions: allPermissions,
      status: 'Active',
      joinedAt: new Date().toISOString(),
    }
    company = { ...target, members: [...target.members, joinedMember] }
    saveCompanies(companies.map(item => item.id === companyId ? company : item))
  }

  persistActiveCompany(company)

  // After switching, every piece of company-scoped data lives under a new
  // namespace in localStorage (see lib/tenant/storageScope.ts). Components
  // mounted before the switch loaded the previous workspace's data into
  // their state — there's no general way to tell them to re-fetch. A page
  // reload is the safest way to guarantee the whole app re-reads from the
  // new namespace. We skip the reload if the user clicked their currently-
  // active workspace (no actual switch).
  if (typeof window !== 'undefined' && previousId && previousId !== company.id) {
    window.setTimeout(() => window.location.reload(), 60)
  }

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

export function findPendingCompanyInvitation(email: string) {
  const normalizedEmail = email.trim().toLowerCase()
  if (!normalizedEmail) return null
  for (const company of loadCompanies()) {
    const member = company.members.find(item => item.status === 'Pending' && item.email.toLowerCase() === normalizedEmail)
    if (member) return { company, member }
  }
  return null
}

export function acceptCompanyInvitation(email: string, name?: string) {
  const normalizedEmail = email.trim().toLowerCase()
  if (!normalizedEmail) return null
  const companies = loadCompanies()
  let acceptedCompany: CompanyRecord | null = null
  let acceptedMember: CompanyMember | null = null
  const nextCompanies: CompanyRecord[] = []

  for (const company of companies) {
    const member = company.members.find(item => item.status === 'Pending' && item.email.toLowerCase() === normalizedEmail)
    if (!member) {
      nextCompanies.push(company)
      continue
    }

    const nextMember: CompanyMember = {
      ...member,
      name: name?.trim() || member.name,
      status: 'Active',
      joinedAt: new Date().toISOString(),
    }
    const nextCompany = {
      ...company,
      members: company.members.map(item => item.id === member.id ? nextMember : item),
    }
    acceptedCompany = nextCompany
    acceptedMember = nextMember
    nextCompanies.push(nextCompany)
  }

  saveCompanies(nextCompanies)
  if (acceptedCompany && acceptedMember) {
    window.localStorage.setItem(activeCompanyKey, acceptedCompany.id)
    dispatchCompanyChange(acceptedCompany)
    return { company: acceptedCompany, member: acceptedMember }
  }
  return null
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

export async function bootstrapCompanyOnServer(input: { companyName?: string; companyId?: string; companyType?: string }) {
  const authHeaders: Record<string, string> = {}
  const supabase = getSupabaseBrowserClient()
  if (supabase) {
    const { data } = await supabase.auth.getSession().catch(() => ({ data: { session: null } }))
    const token = data.session?.access_token
    if (token) authHeaders.Authorization = `Bearer ${token}`
  }

  const response = await fetch('/api/tenant/bootstrap', {
    method: 'POST',
    headers: withCsrfHeaders({
      'Content-Type': 'application/json',
      ...authHeaders,
    }),
    body: JSON.stringify(input),
  })
  const payload = await response.json().catch(() => null) as { ok?: boolean; company?: CompanyRecord; error?: string } | null
  if (!response.ok || !payload?.ok || !payload.company) {
    throw new Error(payload?.error || 'Could not prepare the company workspace.')
  }
  return payload.company
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

function normalizeCompanyIds(companies: CompanyRecord[]) {
  const activeId = getStoredActiveCompanyId()
  const account = readJson<AccountSnapshot>(accountKey) || {}
  const used = new Set<string>()
  let changed = false
  let activeCompanyId = activeId
  const idCounts = companies.reduce((counts, company) => {
    counts.set(company.id, (counts.get(company.id) || 0) + 1)
    return counts
  }, new Map<string, number>())
  const activeDuplicateName = account.company?.trim().toLowerCase()

  const normalized = companies.map((company, index) => {
    const duplicated = (idCounts.get(company.id) || 0) > 1
    const shouldKeepDuplicateId = duplicated
      && company.id === activeId
      && !used.has(company.id)
      && (!activeDuplicateName || company.name.trim().toLowerCase() === activeDuplicateName)

    if (!used.has(company.id) && (!duplicated || shouldKeepDuplicateId)) {
      used.add(company.id)
      return company
    }

    const base = slugifyCompanyId(company.name)
    let nextId = base
    let suffix = 2
    while (used.has(nextId)) {
      nextId = `${base}-${suffix}`
      suffix += 1
    }
    used.add(nextId)
    changed = true
    const renamed = { ...company, id: nextId }
    if (company.id === activeId && !activeDuplicateName && index === 0) activeCompanyId = nextId
    return renamed
  })

  if (activeCompanyId && !normalized.some(company => company.id === activeCompanyId)) {
    activeCompanyId = normalized[0]?.id || ''
    changed = true
  }

  return { companies: normalized, changed, activeCompanyId }
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
