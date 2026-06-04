import 'server-only'

import { randomUUID } from 'node:crypto'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { sessionFromRequest, type ServerSession } from '@/lib/security/session'
import { normalizeRole } from '@/lib/security/rbac'

export const runtime = 'nodejs'

export type TenantCompany = {
  id: string
  name: string
  type: string
  settings: {
    currency: string
    timezone: string
    fiscalYearStart: string
  }
  role: string
  status: string
}

type CompanyRow = {
  id: string
  name: string
  type: string | null
  settings: Record<string, unknown> | null
}

type CompanyMemberRow = {
  id: string
  company_id: string
  user_id: string | null
  email: string
  role: string
  permissions: string[]
  status: string
  companies?: CompanyRow | CompanyRow[] | null
}

const allPermissions = [
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

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
let supabaseAdmin: SupabaseClient | null = null

function shouldUseLocalTenantStore() {
  return process.env.WISEFLOW_ALLOW_LOCAL_TENANT_STORE === '1'
}

function getSupabaseAdmin() {
  if (shouldUseLocalTenantStore()) return null
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

function assertTenantStoreConfigured() {
  if (getSupabaseAdmin()) return
  if (shouldUseLocalTenantStore()) return
  if (process.env.NODE_ENV !== 'production' && !process.env.VERCEL) return
  throw Object.assign(new Error('Supabase tenant storage is not configured. Add SUPABASE_SERVICE_ROLE_KEY and run the production Supabase setup SQL.'), { status: 500 })
}

function isUuid(value?: string) {
  return Boolean(value && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value))
}

function text(input: unknown, fallback = '') {
  return typeof input === 'string' ? input.trim() : fallback
}

function cleanEmail(input?: string) {
  return text(input).toLowerCase()
}

function slugifyCompanyId(name: string) {
  const slug = name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
  return slug || `company-${randomUUID().slice(0, 8)}`
}

function cleanSettings(settings: Record<string, unknown> | null | undefined): TenantCompany['settings'] {
  return {
    currency: text(settings?.currency, 'PHP'),
    timezone: text(settings?.timezone, 'Asia/Manila'),
    fiscalYearStart: text(settings?.fiscalYearStart, 'January'),
  }
}

function tenantCompanyFromMember(row: CompanyMemberRow): TenantCompany {
  const company = Array.isArray(row.companies) ? row.companies[0] : row.companies
  return {
    id: company?.id || row.company_id,
    name: company?.name || row.company_id,
    type: company?.type || 'Operating Company',
    settings: cleanSettings(company?.settings),
    role: row.role,
    status: row.status,
  }
}

function companyIdFromRequestUrl(request: Request) {
  return new URL(request.url).searchParams.get('companyId')?.trim() || ''
}

export function companyIdFromRequest(request: Request) {
  const fromHeader = request.headers.get('x-wiseflow-company-id')?.trim()
  const companyId = fromHeader || companyIdFromRequestUrl(request)
  if (!companyId && process.env.NODE_ENV === 'production') {
    throw Object.assign(new Error('Company context is required.'), { status: 400 })
  }
  return companyId || 'default-company'
}

// Like companyIdFromRequest, but falls back to the authenticated session's
// companyId when no explicit header/query is sent. The employee portal does not
// maintain a client-side active company, so without this fallback its writes
// land in 'default-company' and HR (scoped to the real company) never sees them.
export async function resolveCompanyId(request: Request) {
  const fromHeader = request.headers.get('x-wiseflow-company-id')?.trim()
  const explicit = fromHeader || companyIdFromRequestUrl(request)
  if (explicit) return explicit
  const session = await sessionFromRequest(request)
  const sessionCompanyId = session?.companyId?.trim()
  if (sessionCompanyId) return sessionCompanyId
  if (process.env.NODE_ENV === 'production') {
    throw Object.assign(new Error('Company context is required.'), { status: 400 })
  }
  return 'default-company'
}

async function findMemberByUserId(supabase: SupabaseClient, companyId: string, userId: string) {
  if (!isUuid(userId)) return null
  const { data, error } = await supabase
    .from('company_members')
    .select('id, company_id, user_id, email, role, permissions, status, companies(id, name, type, settings)')
    .eq('company_id', companyId)
    .eq('user_id', userId)
    .limit(1)

  if (error) throw Object.assign(new Error(`Could not verify company membership: ${error.message}`), { status: 500 })
  return (data?.[0] as unknown as CompanyMemberRow | undefined) || null
}

async function findMemberByEmail(supabase: SupabaseClient, companyId: string, email: string) {
  if (!email) return null
  const { data, error } = await supabase
    .from('company_members')
    .select('id, company_id, user_id, email, role, permissions, status, companies(id, name, type, settings)')
    .eq('company_id', companyId)
    .ilike('email', email)
    .limit(1)

  if (error) throw Object.assign(new Error(`Could not verify company membership: ${error.message}`), { status: 500 })
  return (data?.[0] as unknown as CompanyMemberRow | undefined) || null
}

async function findActorMembership(supabase: SupabaseClient, companyId: string, actor: Pick<ServerSession, 'userId' | 'email'>) {
  const byUser = await findMemberByUserId(supabase, companyId, actor.userId)
  if (byUser) return byUser
  return findMemberByEmail(supabase, companyId, cleanEmail(actor.email))
}

export async function assertCompanyAccess(actor: Pick<ServerSession, 'userId' | 'email' | 'role'>, companyId: string) {
  if (!companyId) throw Object.assign(new Error('Company context is required.'), { status: 400 })
  assertTenantStoreConfigured()
  const supabase = getSupabaseAdmin()

  if (!supabase) {
    return { companyId, role: normalizeRole(actor.role), status: 'Active' }
  }

  const membership = await findActorMembership(supabase, companyId, actor)
  if (!membership || membership.status !== 'Active') {
    throw Object.assign(new Error('You are not a member of this company workspace.'), { status: 403 })
  }
  return membership
}

async function existingActorCompany(supabase: SupabaseClient, actor: Pick<ServerSession, 'userId' | 'email'>) {
  const email = cleanEmail(actor.email)
  if (isUuid(actor.userId)) {
    const { data, error } = await supabase
      .from('company_members')
      .select('id, company_id, user_id, email, role, permissions, status, companies(id, name, type, settings)')
      .eq('user_id', actor.userId)
      .eq('status', 'Active')
      .limit(1)
    if (error) throw Object.assign(new Error(`Could not read company membership: ${error.message}`), { status: 500 })
    if (data?.[0]) return data[0] as unknown as CompanyMemberRow
  }

  if (!email) return null
  const { data, error } = await supabase
    .from('company_members')
    .select('id, company_id, user_id, email, role, permissions, status, companies(id, name, type, settings)')
    .ilike('email', email)
    .eq('status', 'Active')
    .limit(1)
  if (error) throw Object.assign(new Error(`Could not read company membership: ${error.message}`), { status: 500 })
  return (data?.[0] as unknown as CompanyMemberRow | undefined) || null
}

async function pendingActorInvite(supabase: SupabaseClient, actor: Pick<ServerSession, 'email'>, requestedCompanyId?: string) {
  const email = cleanEmail(actor.email)
  if (!email) return null
  let query = supabase
    .from('company_members')
    .select('id, company_id, user_id, email, role, permissions, status, companies(id, name, type, settings)')
    .ilike('email', email)
    .eq('status', 'Pending')
    .limit(1)

  if (requestedCompanyId) query = query.eq('company_id', requestedCompanyId)

  const { data, error } = await query
  if (error) throw Object.assign(new Error(`Could not read pending company invitation: ${error.message}`), { status: 500 })
  return (data?.[0] as unknown as CompanyMemberRow | undefined) || null
}

async function uniqueCompanyId(supabase: SupabaseClient, preferredId: string) {
  const base = slugifyCompanyId(preferredId)
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const candidate = attempt === 0 ? base : `${base}-${randomUUID().slice(0, 6)}`
    const { data, error } = await supabase.from('companies').select('id').eq('id', candidate).limit(1)
    if (error) throw Object.assign(new Error(`Could not prepare company workspace: ${error.message}`), { status: 500 })
    if (!data?.length) return candidate
  }
  return `${base}-${randomUUID().slice(0, 10)}`
}

export async function bootstrapCompanyForActor(
  actor: Pick<ServerSession, 'userId' | 'email' | 'name' | 'role'>,
  input: { companyName?: unknown; companyId?: unknown; companyType?: unknown },
) {
  assertTenantStoreConfigured()
  const supabase = getSupabaseAdmin()
  const companyName = text(input.companyName, 'WiseFlow Company') || 'WiseFlow Company'
  const requestedCompanyId = text(input.companyId)
  const companyType = text(input.companyType, 'Operating Company') || 'Operating Company'

  if (!supabase) {
    return {
      id: requestedCompanyId || slugifyCompanyId(companyName),
      name: companyName,
      type: companyType,
      settings: cleanSettings(null),
      role: normalizeRole(actor.role),
      status: 'Active',
    } satisfies TenantCompany
  }

  const pending = await pendingActorInvite(supabase, actor, requestedCompanyId)
  if (pending) {
    const { error } = await supabase
      .from('company_members')
      .update({
        user_id: isUuid(actor.userId) ? actor.userId : null,
        status: 'Active',
        joined_at: new Date().toISOString(),
      })
      .eq('id', pending.id)
    if (error) throw Object.assign(new Error(`Could not activate company invitation: ${error.message}`), { status: 500 })
    return tenantCompanyFromMember({ ...pending, user_id: isUuid(actor.userId) ? actor.userId : pending.user_id, status: 'Active' })
  }

  const existing = requestedCompanyId
    ? await findActorMembership(supabase, requestedCompanyId, actor)
    : await existingActorCompany(supabase, actor)
  if (existing?.status === 'Active') return tenantCompanyFromMember(existing)

  if (normalizeRole(actor.role) !== 'Admin') {
    throw Object.assign(new Error('Only an Admin can create a new company workspace.'), { status: 403 })
  }

  const companyId = await uniqueCompanyId(supabase, requestedCompanyId || companyName)
  const now = new Date().toISOString()
  const settings = cleanSettings(null)
  const { error: companyError } = await supabase
    .from('companies')
    .insert({
      id: companyId,
      name: companyName,
      type: companyType,
      owner_user_id: isUuid(actor.userId) ? actor.userId : null,
      settings,
      created_at: now,
      updated_at: now,
    })

  if (companyError) throw Object.assign(new Error(`Could not create company workspace: ${companyError.message}`), { status: 500 })

  const email = cleanEmail(actor.email)
  if (!email) throw Object.assign(new Error('A verified email is required to create a company workspace.'), { status: 400 })

  const { error: memberError } = await supabase
    .from('company_members')
    .upsert({
      company_id: companyId,
      user_id: isUuid(actor.userId) ? actor.userId : null,
      email,
      role: 'Owner',
      permissions: allPermissions,
      status: 'Active',
      invited_at: now,
      joined_at: now,
    }, { onConflict: 'company_id,email' })

  if (memberError) throw Object.assign(new Error(`Could not create company owner membership: ${memberError.message}`), { status: 500 })

  return {
    id: companyId,
    name: companyName,
    type: companyType,
    settings,
    role: 'Owner',
    status: 'Active',
  } satisfies TenantCompany
}
