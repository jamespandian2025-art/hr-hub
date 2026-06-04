import 'server-only'

import { randomUUID } from 'node:crypto'
import { cache } from 'react'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { listBusinessRecords, upsertBusinessRecord } from '@/lib/business/serverStore'
import { authCookieName, openSession, type ServerSession } from '@/lib/security/session'
import { normalizeRole } from '@/lib/security/rbac'
import { assertCompanyAccess } from '@/lib/tenant/serverStore'
import type {
  AccountAdminRole,
  AccountApplication,
  AccountCompany,
  AccountCustomizations,
  AccountGroup,
  AccountMutationAction,
  AccountOffice,
  AccountPerson,
  AccountSecuritySession,
  AccountStatus,
  AccountSystemSettings,
  AccountTrustedDevice,
  AccountViewer,
  AccountWorkspace,
} from './types'

export const runtime = 'nodejs'

type StoredWorkspace = Partial<AccountWorkspace> & {
  id?: string
  companyId?: string
}

type TenantCompanyRow = {
  id: string
  name: string
  type: string | null
  settings: Record<string, unknown> | null
  created_at?: string | null
  updated_at?: string | null
}

type TenantMemberRow = {
  id: string
  company_id: string
  user_id: string | null
  email: string
  role: string
  permissions: string[] | null
  status: string
  invited_at?: string | null
  joined_at?: string | null
  companies?: TenantCompanyRow | TenantCompanyRow[] | null
}

type TenantSnapshot = {
  companyId: string
  company: TenantCompanyRow | null
  members: TenantMemberRow[]
}

const accountWorkspaceCollection = 'account-workspace'
const workspaceRecordId = 'account-workspace'
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
let supabaseAdmin: SupabaseClient | null = null

const permissionCatalog = [
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
] as const

const applicationCatalog: Array<Omit<AccountApplication, 'enabled' | 'restricted' | 'visibleByDefault'>> = [
  { id: 'dashboard', name: 'Dashboard', detail: 'Company overview, activity, and workspace metrics', category: 'Core', plan: 'PRO', icon: 'layout-dashboard' },
  { id: 'client-database', name: 'Client Database', detail: 'Client records, contacts, and relationship tracking', category: 'Core', plan: 'PRO', icon: 'users' },
  { id: 'sales', name: 'Sales', detail: 'Leads, opportunities, proposals, contracts, and billings', category: 'Revenue', plan: 'PRO', icon: 'badge-dollar' },
  { id: 'project-management', name: 'Project Mgmt', detail: 'Projects, tasks, documents, and delivery tracking', category: 'Projects', plan: 'PRO', icon: 'folder-kanban' },
  { id: 'financials', name: 'Financials', detail: 'Invoices, bills, banking, budgets, and transactions', category: 'Finance', plan: 'PRO', icon: 'hand-coins' },
  { id: 'hr-hub', name: 'HR Hub', detail: 'Employees, teams, attendance, leave, payroll, and documents', category: 'People', plan: 'PRO', icon: 'users' },
  { id: 'procurement', name: 'Procurement', detail: 'Pricebooks, purchase requests, orders, RFQs, and receiving', category: 'Supply Chain', plan: 'PRO', icon: 'shopping-cart' },
  { id: 'supplier-database', name: 'Supplier Database', detail: 'Vendor records, supplier contacts, and supply relationships', category: 'Supply Chain', plan: 'PRO', icon: 'users' },
  { id: 'warehouse', name: 'Warehouse', detail: 'Inventory, locations, receiving, transfers, and stock movements', category: 'Supply Chain', plan: 'PRO', icon: 'warehouse' },
  { id: 'workflows', name: 'Workflows', detail: 'Cross-team workflow runs', category: 'Operations', plan: 'PRO', icon: 'clipboard-list' },
  { id: 'docs', name: 'Docs', detail: 'Resource documents and business reference content', category: 'Productivity', plan: 'PRO', icon: 'file-text' },
  { id: 'webforms', name: 'Webforms', detail: 'Client portal forms and external intake workflows', category: 'Operations', plan: 'PRO', icon: 'clipboard-list' },
  { id: 'messages', name: 'Messages', detail: 'Team messaging', category: 'Collaboration', plan: 'PRO', icon: 'bell' },
  { id: 'datasets', name: 'Datasets', detail: 'Structured business data', category: 'Data', plan: 'PRO', icon: 'database-zap' },
  { id: 'account', name: 'Account', detail: 'Account management', category: 'Account', plan: 'PRO', icon: 'user' },
  { id: 'settings', name: 'Settings', detail: 'Centralized settings', category: 'Account', plan: 'PRO', icon: 'settings' },
  { id: 'design-system', name: 'Design System', detail: 'Internal UI components, tokens, and interface standards', category: 'Platform', plan: 'PRO', icon: 'book-open' },
]

const roleCatalog: Array<Omit<AccountAdminRole, 'userIds'>> = [
  {
    id: 'system-owner',
    name: 'System owner',
    description: 'Full company control, billing, security, and user administration.',
    permissions: [...permissionCatalog],
    system: true,
  },
  {
    id: 'account-admin',
    name: 'Account admin',
    description: 'Manage users, groups, applications, and account configuration.',
    permissions: ['settings', 'members', 'documents', 'workflows'],
    system: true,
  },
  {
    id: 'security-admin',
    name: 'Security admin',
    description: 'Manage security policies, sessions, and audit controls.',
    permissions: ['settings', 'members', 'reports'],
    system: true,
  },
  {
    id: 'app-admin',
    name: 'App admin',
    description: 'Manage application access and subscription settings.',
    permissions: ['settings', 'documents', 'workflows', 'datasets'],
    system: true,
  },
]

function getSupabaseAdmin() {
  if (!supabaseUrl || !supabaseServiceRoleKey) return null
  if (!supabaseAdmin) {
    supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })
  }
  return supabaseAdmin
}

function text(input: unknown, fallback = '', maxLength = 500) {
  if (typeof input === 'number' && Number.isFinite(input)) return String(input)
  if (typeof input !== 'string') return fallback
  return input.replace(/\p{C}/gu, '').trim().slice(0, maxLength) || fallback
}

function cleanEmail(input: unknown) {
  return text(input, '', 200).toLowerCase()
}

function isEmail(input: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input)
}

function bool(input: unknown, fallback = false) {
  return typeof input === 'boolean' ? input : fallback
}

function number(input: unknown, fallback: number, min: number, max: number) {
  const value = typeof input === 'number' ? input : Number(input)
  if (!Number.isFinite(value)) return fallback
  return Math.min(max, Math.max(min, Math.round(value)))
}

function stringArray(input: unknown) {
  return Array.isArray(input) ? input.map(item => text(item, '', 120)).filter(Boolean) : []
}

function record(input: unknown) {
  return input && typeof input === 'object' && !Array.isArray(input) ? input as Record<string, unknown> : {}
}

function status(input: unknown, fallback: AccountStatus = 'Active'): AccountStatus {
  const value = text(input)
  if (value === 'Active' || value === 'Pending' || value === 'Deactivated') return value
  return fallback
}

function nowIso() {
  return new Date().toISOString()
}

function slugify(value: string, fallback = 'company') {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || fallback
}

function compactUsername(name: string, email: string) {
  const source = name || email.split('@')[0] || 'user'
  return source.toLowerCase().replace(/@.*/, '').replace(/[^a-z0-9]+/g, '').slice(0, 28) || 'user'
}

function canManage(actor: Pick<ServerSession, 'role'>) {
  return normalizeRole(actor.role) === 'Admin'
}

function tenantCompanyFromMember(row: TenantMemberRow) {
  const company = Array.isArray(row.companies) ? row.companies[0] : row.companies
  return company || null
}

async function findTenantSnapshot(actor: ServerSession, preferredCompanyId: string): Promise<TenantSnapshot> {
  const supabase = getSupabaseAdmin()
  if (!supabase) {
    return { companyId: preferredCompanyId, company: null, members: [] }
  }

  const email = cleanEmail(actor.email)
  const userId = text(actor.userId)

  if (preferredCompanyId && preferredCompanyId !== 'default-company') {
    const [companyResult, memberResult] = await Promise.all([
      supabase
        .from('companies')
        .select('id, name, type, settings, created_at, updated_at')
        .eq('id', preferredCompanyId)
        .maybeSingle(),
      supabase
        .from('company_members')
        .select('id, company_id, user_id, email, role, permissions, status, invited_at, joined_at')
        .eq('company_id', preferredCompanyId)
        .order('joined_at', { ascending: true, nullsFirst: false }),
    ])
    if (companyResult.error) throw Object.assign(new Error(`Could not read company: ${companyResult.error.message}`), { status: 500 })
    if (memberResult.error) throw Object.assign(new Error(`Could not read company members: ${memberResult.error.message}`), { status: 500 })
    return {
      companyId: preferredCompanyId,
      company: companyResult.data as TenantCompanyRow | null,
      members: (memberResult.data || []) as TenantMemberRow[],
    }
  }

  let membership: TenantMemberRow | null = null
  if (userId) {
    const { data, error } = await supabase
      .from('company_members')
      .select('id, company_id, user_id, email, role, permissions, status, invited_at, joined_at, companies(id, name, type, settings, created_at, updated_at)')
      .eq('user_id', userId)
      .eq('status', 'Active')
      .limit(1)
    if (error) throw Object.assign(new Error(`Could not read company membership: ${error.message}`), { status: 500 })
    membership = (data?.[0] as unknown as TenantMemberRow | undefined) || null
  }

  if (!membership && email) {
    const { data, error } = await supabase
      .from('company_members')
      .select('id, company_id, user_id, email, role, permissions, status, invited_at, joined_at, companies(id, name, type, settings, created_at, updated_at)')
      .ilike('email', email)
      .eq('status', 'Active')
      .limit(1)
    if (error) throw Object.assign(new Error(`Could not read company membership: ${error.message}`), { status: 500 })
    membership = (data?.[0] as unknown as TenantMemberRow | undefined) || null
  }

  const companyId = membership?.company_id || preferredCompanyId || 'default-company'
  const { data: members, error: memberError } = await supabase
    .from('company_members')
    .select('id, company_id, user_id, email, role, permissions, status, invited_at, joined_at')
    .eq('company_id', companyId)
    .order('joined_at', { ascending: true, nullsFirst: false })

  if (memberError) throw Object.assign(new Error(`Could not read company members: ${memberError.message}`), { status: 500 })
  return {
    companyId,
    company: membership ? tenantCompanyFromMember(membership) : null,
    members: (members || []) as TenantMemberRow[],
  }
}

function viewerFromActor(actor: ServerSession, stored?: Partial<AccountViewer>): AccountViewer {
  // The viewer is always the authenticated session, never the persisted one.
  // A workspace's stored viewer is just "whoever last saved their profile", so
  // preferring it would let one admin's identity shadow another's (wrong
  // name/email on My Account, cross-contaminated profile edits). Only fall back
  // to stored values when the session genuinely lacks them.
  const actorEmail = cleanEmail(actor.email)
  const email = actorEmail || cleanEmail(stored?.email)
  const name = text(actor.name, text(stored?.name, email || actor.userId, 160), 160)
  return {
    id: text(actor.userId, email || 'current-user', 120),
    name,
    email,
    role: normalizeRole(actor.role),
    provider: text(actor.provider),
    canManageAccount: canManage(actor),
  }
}

function companyFromTenant(snapshot: TenantSnapshot, actor: ServerSession, stored?: Partial<AccountCompany>): AccountCompany {
  const tenantSettings = snapshot.company?.settings || {}
  const name = text(stored?.name, text(snapshot.company?.name, text(actor.companyId, 'WiseFlow Company', 160), 160), 160)
  const createdAt = text(stored?.createdAt, text(snapshot.company?.created_at, nowIso()))
  return {
    id: text(stored?.id, snapshot.companyId, 120),
    name,
    type: text(stored?.type, text(snapshot.company?.type, 'Operating Company', 120), 120),
    path: slugify(text(stored?.path, name), slugify(snapshot.companyId)),
    status: status(stored?.status),
    introduction: text(stored?.introduction, '', 1000),
    address: text(stored?.address, '', 500),
    phone: text(stored?.phone, '', 80),
    website: text(stored?.website, '', 200),
    userLimit: number(stored?.userLimit, Math.max(10, snapshot.members.length || 10), 1, 100000),
    createdAt,
    settings: {
      currency: text(stored?.settings?.currency, text(tenantSettings.currency, 'PHP', 20), 20),
      timezone: text(stored?.settings?.timezone, text(tenantSettings.timezone, 'Asia/Manila', 80), 80),
      fiscalYearStart: text(stored?.settings?.fiscalYearStart, text(tenantSettings.fiscalYearStart, 'January', 40), 40),
      language: text(stored?.settings?.language, 'English', 60),
      dateFormat: text(stored?.settings?.dateFormat, 'DD-MM-YYYY', 40),
    },
  }
}

function personFromMember(member: TenantMemberRow, index: number): AccountPerson {
  const email = cleanEmail(member.email)
  const name = text((member as TenantMemberRow & { name?: unknown }).name, email.split('@')[0] || 'Company user', 160)
  const normalizedRole = member.role === 'Owner' ? 'System owner' : text(member.role, 'Member', 80)
  return {
    id: text(member.user_id, member.id || `member-${index + 1}`, 120),
    name,
    role: normalizedRole,
    username: compactUsername(name, email),
    email,
    phone: '',
    manager: '',
    office: '',
    joinedAt: text(member.joined_at, text(member.invited_at, nowIso())),
    status: status(member.status),
    owner: member.role === 'Owner' || member.role === 'Admin',
    online: index === 0,
    type: 'member',
  }
}

function currentActorPerson(viewer: AccountViewer): AccountPerson {
  return {
    id: viewer.id,
    name: viewer.name,
    role: viewer.role === 'Admin' ? 'System owner' : viewer.role,
    username: compactUsername(viewer.name, viewer.email),
    email: viewer.email,
    phone: '',
    manager: '',
    office: '',
    joinedAt: nowIso(),
    status: 'Active',
    owner: viewer.canManageAccount,
    online: true,
    type: 'member',
  }
}

function normalizePerson(input: unknown, fallback: AccountPerson): AccountPerson {
  const item = record(input)
  const email = cleanEmail(item.email) || fallback.email
  const name = text(item.name, fallback.name, 160)
  return {
    id: text(item.id, fallback.id, 120),
    name,
    role: text(item.role, fallback.role, 100),
    username: text(item.username, compactUsername(name, email), 80),
    email,
    phone: text(item.phone, fallback.phone, 80),
    manager: text(item.manager, fallback.manager, 160),
    office: text(item.office, fallback.office, 160),
    joinedAt: text(item.joinedAt, fallback.joinedAt),
    status: status(item.status, fallback.status),
    owner: bool(item.owner, fallback.owner),
    online: bool(item.online, fallback.online),
    type: item.type === 'guest' ? 'guest' : 'member',
    expiresAt: text(item.expiresAt),
  }
}

function normalizeUsers(input: unknown, snapshot: TenantSnapshot, viewer: AccountViewer) {
  const memberUsers = snapshot.members.filter(member => member.status !== 'Pending').map(personFromMember)
  const seedUsers = memberUsers.length ? memberUsers : [currentActorPerson(viewer)]
  const stored = Array.isArray(input) ? input.map((item, index) => normalizePerson(item, seedUsers[index] || currentActorPerson(viewer))) : []
  const byEmail = new Map<string, AccountPerson>()
  for (const user of [...seedUsers, ...stored]) {
    if (!user.email && !user.id) continue
    byEmail.set(user.email || user.id, { ...user, type: 'member' })
  }
  if (!Array.from(byEmail.values()).some(user => user.id === viewer.id || user.email === viewer.email)) {
    byEmail.set(viewer.email || viewer.id, currentActorPerson(viewer))
  }
  return Array.from(byEmail.values()).map((user, index) => ({ ...user, online: user.online || index === 0 }))
}

function normalizeGuests(input: unknown, snapshot: TenantSnapshot) {
  const invitedGuests = snapshot.members
    .filter(member => member.status === 'Pending')
    .map((member, index) => ({ ...personFromMember(member, index), type: 'guest' as const, status: 'Pending' as const }))
  const stored = Array.isArray(input) ? input.map((item, index) => normalizePerson(item, invitedGuests[index] || {
    id: `guest-${index + 1}`,
    name: 'Guest user',
    role: 'Guest',
    username: 'guest',
    email: '',
    phone: '',
    manager: '',
    office: '',
    joinedAt: nowIso(),
    status: 'Pending',
    owner: false,
    online: false,
    type: 'guest',
  })) : []
  return [...invitedGuests, ...stored].filter((guest, index, list) => {
    const key = guest.email || guest.id
    return key && list.findIndex(item => (item.email || item.id) === key) === index
  }).map(guest => ({ ...guest, type: 'guest' as const }))
}

function normalizeApplications(input: unknown): AccountApplication[] {
  const stored = new Map((Array.isArray(input) ? input : []).map(item => {
    const app = record(item)
    return [text(app.id), app] as const
  }))
  return applicationCatalog.map(app => {
    const item = stored.get(app.id) || {}
    const restrictedDefault = [
      'financials',
      'hr-hub',
      'procurement',
      'supplier-database',
      'warehouse',
      'settings',
      'account',
      'design-system',
    ].includes(app.id)
    return {
      ...app,
      enabled: bool(item.enabled, true),
      restricted: bool(item.restricted, restrictedDefault),
      visibleByDefault: bool(item.visibleByDefault, !restrictedDefault),
    }
  })
}

function normalizeGroups(input: unknown, users: AccountPerson[], company: AccountCompany): AccountGroup[] {
  const stored = Array.isArray(input) ? input.map(item => {
    const group = record(item)
    return {
      id: text(group.id, `group-${randomUUID().slice(0, 8)}`, 120),
      name: text(group.name, 'Company members', 160),
      description: text(group.description, '', 500),
      status: status(group.status),
      memberIds: stringArray(group.memberIds),
      createdAt: text(group.createdAt, nowIso()),
    } satisfies AccountGroup
  }) : []
  if (stored.length) return stored
  return [{
    id: 'all-company-members',
    name: `${company.name} members`,
    description: 'Default group for active company members.',
    status: 'Active',
    memberIds: users.filter(user => user.status === 'Active').map(user => user.id),
    createdAt: company.createdAt,
  }]
}

function normalizeOffices(input: unknown): AccountOffice[] {
  return (Array.isArray(input) ? input : []).map(item => {
    const office = record(item)
    return {
      id: text(office.id, `office-${randomUUID().slice(0, 8)}`, 120),
      name: text(office.name, 'Office', 160),
      detail: text(office.detail, '', 300),
      location: text(office.location, '', 300),
      userIds: stringArray(office.userIds),
      status: status(office.status),
      createdAt: text(office.createdAt, nowIso()),
    }
  })
}

function normalizeRoles(input: unknown, users: AccountPerson[]): AccountAdminRole[] {
  const stored = new Map((Array.isArray(input) ? input : []).map(item => {
    const role = record(item)
    return [text(role.id), role] as const
  }))
  const ownerIds = users.filter(user => user.owner || /owner|admin/i.test(user.role)).map(user => user.id)
  return roleCatalog.map(role => {
    const item = stored.get(role.id) || {}
    return {
      ...role,
      description: text(item.description, role.description, 500),
      permissions: stringArray(item.permissions).length ? stringArray(item.permissions) : role.permissions,
      userIds: stringArray(item.userIds).length ? stringArray(item.userIds) : role.id === 'system-owner' ? ownerIds : [],
      system: bool(item.system, role.system),
    }
  }).concat((Array.isArray(input) ? input : []).flatMap(item => {
    const role = record(item)
    const id = text(role.id)
    if (!id || roleCatalog.some(base => base.id === id)) return []
    return [{
      id,
      name: text(role.name, 'Custom role', 120),
      description: text(role.description, '', 500),
      permissions: stringArray(role.permissions),
      userIds: stringArray(role.userIds),
      system: false,
    } satisfies AccountAdminRole]
  }))
}

function normalizeSecurity(input: unknown, viewer: AccountViewer) {
  const security = record(input)
  const fallbackSession: AccountSecuritySession = {
    id: `session-${viewer.id}`,
    userId: viewer.id,
    device: 'Current browser session',
    ip: '',
    method: 'Password or SSO',
    status: 'Active',
    createdAt: nowIso(),
  }
  const sessions = (Array.isArray(security.sessions) ? security.sessions : []).map(item => {
    const session = record(item)
    return {
      id: text(session.id, `session-${randomUUID().slice(0, 8)}`, 120),
      userId: text(session.userId, viewer.id, 120),
      device: text(session.device, fallbackSession.device, 160),
      ip: text(session.ip, '', 80),
      method: text(session.method, fallbackSession.method, 120),
      status: session.status === 'Revoked' ? 'Revoked' : 'Active',
      createdAt: text(session.createdAt, nowIso()),
    } satisfies AccountSecuritySession
  })
  if (!sessions.some(session => session.userId === viewer.id && session.status === 'Active')) sessions.unshift(fallbackSession)
  const devices = (Array.isArray(security.devices) ? security.devices : []).map(item => {
    const device = record(item)
    return {
      id: text(device.id, `device-${randomUUID().slice(0, 8)}`, 120),
      label: text(device.label, 'Trusted device', 160),
      lastSeenAt: text(device.lastSeenAt, nowIso()),
      status: status(device.status),
    } satisfies AccountTrustedDevice
  })
  return {
    twoFactorEnabled: bool(security.twoFactorEnabled),
    sessions,
    devices,
  }
}

function normalizeCustomizations(input: unknown, applications: AccountApplication[]): AccountCustomizations {
  const customizations = record(input)
  const storedModules = record(customizations.moduleVisibility)
  return {
    brandColor: text(customizations.brandColor, '#0f7f86', 40),
    logoUrl: text(customizations.logoUrl, '', 300),
    moduleVisibility: Object.fromEntries(applications.map(app => [app.id, bool(storedModules[app.id], app.enabled)])),
    profileFields: stringArray(customizations.profileFields).length
      ? stringArray(customizations.profileFields)
      : ['phone', 'manager', 'office'],
  }
}

function normalizeSystemSettings(input: unknown, company: AccountCompany): AccountSystemSettings {
  const settings = record(input)
  return {
    timezone: text(settings.timezone, company.settings.timezone, 80),
    language: text(settings.language, company.settings.language, 80),
    dateFormat: text(settings.dateFormat, company.settings.dateFormat, 40),
    sessionTimeoutMinutes: number(settings.sessionTimeoutMinutes, 720, 15, 43200),
    passwordMinLength: number(settings.passwordMinLength, 12, 8, 128),
    requireTwoFactor: bool(settings.requireTwoFactor),
    invitationExpiryDays: number(settings.invitationExpiryDays, 7, 1, 365),
    guestAccessEnabled: bool(settings.guestAccessEnabled, true),
    emailSender: text(settings.emailSender, company.website ? `noreply@${company.website.replace(/^https?:\/\//, '').replace(/\/.*/, '')}` : '', 200),
  }
}

function normalizeWorkspace(stored: StoredWorkspace | null, actor: ServerSession, snapshot: TenantSnapshot): AccountWorkspace {
  const viewer = viewerFromActor(actor, stored?.viewer)
  const company = companyFromTenant(snapshot, actor, stored?.company)
  const users = normalizeUsers(stored?.users, snapshot, viewer)
  const guests = normalizeGuests(stored?.guests, snapshot)
  const applications = normalizeApplications(stored?.applications)
  const groups = normalizeGroups(stored?.groups, users, company)
  const offices = normalizeOffices(stored?.offices)
  const adminRoles = normalizeRoles(stored?.adminRoles, users)
  const security = normalizeSecurity(stored?.security, viewer)
  const customizations = normalizeCustomizations(stored?.customizations, applications)
  const systemSettings = normalizeSystemSettings(stored?.systemSettings, company)

  return {
    viewer,
    company,
    security,
    users,
    guests,
    groups,
    applications,
    offices,
    adminRoles,
    customizations,
    systemSettings,
    updatedAt: text(stored?.updatedAt, company.createdAt),
  }
}

async function readStoredWorkspace(companyId: string) {
  const records = await listBusinessRecords(accountWorkspaceCollection, companyId)
  const payload = records.find(record => record.id === workspaceRecordId)?.payload
  return payload && typeof payload === 'object' ? payload as StoredWorkspace : null
}

async function persistWorkspace(workspace: AccountWorkspace) {
  await upsertBusinessRecord(accountWorkspaceCollection, workspace.company.id, {
    id: workspaceRecordId,
    companyId: workspace.company.id,
    ...workspace,
  })
}

export async function getAccountWorkspaceForActor(actor: ServerSession, requestedCompanyId?: string) {
  const preferredCompanyId = text(requestedCompanyId, text(actor.companyId, 'default-company', 120), 120)
  const tenant = await findTenantSnapshot(actor, preferredCompanyId)
  await assertCompanyAccess(actor, tenant.companyId)
  const stored = await readStoredWorkspace(tenant.companyId)
  return normalizeWorkspace(stored, actor, tenant)
}

export const getAccountWorkspaceForCurrentSession = cache(async () => {
  const cookieStore = await cookies()
  const session = await openSession(cookieStore.get(authCookieName)?.value)
  if (!session) redirect('/login?next=/account')
  if (normalizeRole(session.role) === 'Employee' || normalizeRole(session.role) === 'Client') {
    redirect('/dashboard')
  }
  return getAccountWorkspaceForActor(session)
})

function assertManager(actor: ServerSession, action: AccountMutationAction) {
  if (action === 'update-profile' || action === 'set-two-factor' || action === 'revoke-session') return
  if (!canManage(actor)) {
    throw Object.assign(new Error('Only account admins can perform this action.'), { status: 403 })
  }
}

function requireValidEmail(email: string) {
  if (!isEmail(email)) throw Object.assign(new Error('Enter a valid email address.'), { status: 400 })
}

function addPerson(workspace: AccountWorkspace, payload: Record<string, unknown>, type: 'member' | 'guest') {
  const email = cleanEmail(payload.email)
  requireValidEmail(email)
  const list = type === 'member' ? workspace.users : workspace.guests
  if ([...workspace.users, ...workspace.guests].some(person => person.email === email)) {
    throw Object.assign(new Error('A user with this email already exists.'), { status: 409 })
  }
  const name = text(payload.name, email.split('@')[0], 160)
  const person: AccountPerson = {
    id: `${type}-${randomUUID()}`,
    name,
    role: text(payload.role, type === 'guest' ? 'Guest' : 'Member', 100),
    username: compactUsername(name, email),
    email,
    phone: text(payload.phone, '', 80),
    manager: text(payload.manager, '', 160),
    office: text(payload.office, '', 160),
    joinedAt: nowIso(),
    status: status(payload.status, 'Pending'),
    owner: false,
    online: false,
    type,
    expiresAt: text(payload.expiresAt),
  }
  list.unshift(person)
}

function updateApplication(workspace: AccountWorkspace, payload: Record<string, unknown>) {
  const id = text(payload.id, '', 120)
  const index = workspace.applications.findIndex(app => app.id === id)
  if (index < 0) throw Object.assign(new Error('Application was not found.'), { status: 404 })
  workspace.applications[index] = {
    ...workspace.applications[index],
    enabled: bool(payload.enabled, workspace.applications[index].enabled),
    restricted: bool(payload.restricted, workspace.applications[index].restricted),
    visibleByDefault: bool(payload.visibleByDefault, workspace.applications[index].visibleByDefault),
  }
  workspace.customizations.moduleVisibility[id] = workspace.applications[index].enabled
}

export async function mutateAccountWorkspace(
  actor: ServerSession,
  requestedCompanyId: string,
  action: AccountMutationAction,
  payloadInput: unknown,
) {
  assertManager(actor, action)
  const workspace = await getAccountWorkspaceForActor(actor, requestedCompanyId)
  const payload = record(payloadInput)

  if (action === 'update-company') {
    workspace.company = {
      ...workspace.company,
      name: text(payload.name, workspace.company.name, 160),
      type: text(payload.type, workspace.company.type, 120),
      path: slugify(text(payload.path, workspace.company.path, 120), workspace.company.path),
      introduction: text(payload.introduction, workspace.company.introduction, 1000),
      address: text(payload.address, workspace.company.address, 500),
      phone: text(payload.phone, workspace.company.phone, 80),
      website: text(payload.website, workspace.company.website, 200),
      userLimit: number(payload.userLimit, workspace.company.userLimit, 1, 100000),
      settings: {
        ...workspace.company.settings,
        currency: text(payload.currency, workspace.company.settings.currency, 20),
        timezone: text(payload.timezone, workspace.company.settings.timezone, 80),
        fiscalYearStart: text(payload.fiscalYearStart, workspace.company.settings.fiscalYearStart, 40),
        language: text(payload.language, workspace.company.settings.language, 80),
        dateFormat: text(payload.dateFormat, workspace.company.settings.dateFormat, 40),
      },
    }
  }

  if (action === 'update-profile') {
    const previousViewer = workspace.viewer
    const name = text(payload.name, workspace.viewer.name, 160)
    const email = cleanEmail(payload.email) || workspace.viewer.email
    requireValidEmail(email)
    workspace.viewer = { ...workspace.viewer, name, email }
    workspace.users = workspace.users.map(user => (
      user.id === previousViewer.id || user.email === previousViewer.email
        ? {
          ...user,
          name,
          email,
          phone: text(payload.phone, user.phone, 80),
          office: text(payload.office, user.office, 160),
          username: compactUsername(name, email),
        }
        : user
    ))
  }

  if (action === 'set-two-factor') {
    workspace.security.twoFactorEnabled = bool(payload.enabled)
  }

  if (action === 'revoke-session') {
    const sessionId = text(payload.sessionId, '', 120)
    workspace.security.sessions = workspace.security.sessions.map(session => (
      session.id === sessionId && session.userId === workspace.viewer.id
        ? { ...session, status: 'Revoked' }
        : session
    ))
  }

  if (action === 'create-user') addPerson(workspace, payload, 'member')
  if (action === 'create-guest') addPerson(workspace, payload, 'guest')

  if (action === 'create-group') {
    workspace.groups.unshift({
      id: `group-${randomUUID()}`,
      name: text(payload.name, 'New group', 160),
      description: text(payload.description, '', 500),
      status: 'Active',
      memberIds: stringArray(payload.memberIds),
      createdAt: nowIso(),
    })
  }

  if (action === 'create-office') {
    workspace.offices.unshift({
      id: `office-${randomUUID()}`,
      name: text(payload.name, 'New office', 160),
      detail: text(payload.detail, '', 300),
      location: text(payload.location, '', 300),
      userIds: stringArray(payload.userIds),
      status: 'Active',
      createdAt: nowIso(),
    })
  }

  if (action === 'create-role') {
    workspace.adminRoles.push({
      id: `role-${randomUUID()}`,
      name: text(payload.name, 'Custom role', 120),
      description: text(payload.description, '', 500),
      permissions: stringArray(payload.permissions),
      userIds: stringArray(payload.userIds),
      system: false,
    })
  }

  if (action === 'update-application') updateApplication(workspace, payload)

  if (action === 'update-customizations') {
    workspace.customizations = {
      ...workspace.customizations,
      brandColor: text(payload.brandColor, workspace.customizations.brandColor, 40),
      logoUrl: text(payload.logoUrl, workspace.customizations.logoUrl, 300),
      profileFields: stringArray(payload.profileFields).length ? stringArray(payload.profileFields) : workspace.customizations.profileFields,
      moduleVisibility: {
        ...workspace.customizations.moduleVisibility,
        ...Object.fromEntries(Object.entries(record(payload.moduleVisibility)).map(([key, value]) => [key, bool(value)])),
      },
    }
  }

  if (action === 'update-system-settings') {
    workspace.systemSettings = normalizeSystemSettings(payload, workspace.company)
    workspace.company.settings = {
      ...workspace.company.settings,
      timezone: workspace.systemSettings.timezone,
      language: workspace.systemSettings.language,
      dateFormat: workspace.systemSettings.dateFormat,
    }
  }

  workspace.updatedAt = nowIso()
  await persistWorkspace(workspace)
  return workspace
}
