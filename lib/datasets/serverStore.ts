import 'server-only'

import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { canAccessArea } from '@/lib/security/rbac'
import { requireVerifiedSession, type ServerSession } from '@/lib/security/session'
import { assertCompanyAccess } from '@/lib/tenant/serverStore'

export const runtime = 'nodejs'

// The datasets workspace is stored as a single opaque document per company.
// The server intentionally does not model the ~30 field types, views, rules,
// etc. — it persists the client's WorkspaceState blob so the workspace becomes
// durable and shared across every member/device of a company, instead of
// living only in one browser's localStorage. Validation/automation still run
// client-side for now; tightening to a normalized schema is a later step.
export type DatasetWorkspaceState = Record<string, unknown>

const dataDir = process.env.DATASETS_DATA_DIR
  || path.join(/*turbopackIgnore: true*/ process.cwd(), '.data', 'datasets')
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
let supabaseAdmin: SupabaseClient | null = null

function shouldUseSupabase() {
  return Boolean(supabaseUrl && supabaseServiceRoleKey)
}

function shouldUseFileStore() {
  return !process.env.VERCEL || Boolean(process.env.DATASETS_DATA_DIR)
}

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

function assertStoreConfigured() {
  if (shouldUseSupabase() || shouldUseFileStore()) return
  throw Object.assign(new Error('Datasets storage is not configured. Add SUPABASE_SERVICE_ROLE_KEY in production and create the dataset_workspaces table.'), { status: 500 })
}

function safePathSegment(value: string) {
  return value.replace(/[^a-zA-Z0-9._-]+/g, '_') || 'default'
}

function workspaceFile(companyId: string) {
  return path.join(/*turbopackIgnore: true*/ dataDir, safePathSegment(companyId), 'workspace.json')
}

async function ensureCompanyDir(companyId: string) {
  await mkdir(path.join(/*turbopackIgnore: true*/ dataDir, safePathSegment(companyId)), { recursive: true })
}

function asWorkspaceObject(value: unknown): DatasetWorkspaceState | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as DatasetWorkspaceState : null
}

async function readJsonObject(file: string): Promise<DatasetWorkspaceState | null> {
  let raw: string
  try {
    raw = await readFile(file, 'utf8')
  } catch (error) {
    const code = typeof error === 'object' && error && 'code' in error ? String(error.code) : ''
    if (code === 'ENOENT') return null
    throw error
  }
  try {
    return asWorkspaceObject(JSON.parse(raw))
  } catch {
    // A corrupt workspace file should not permanently block reads. Return null
    // so the client falls back to its local copy; the next save rewrites a
    // clean document via the atomic temp+rename path below.
    return null
  }
}

async function writeJsonObject(companyId: string, file: string, value: DatasetWorkspaceState) {
  await ensureCompanyDir(companyId)
  const temp = `${file}.${process.pid}.${Date.now()}.tmp`
  await writeFile(temp, `${JSON.stringify(value, null, 2)}\n`, 'utf8')
  await rename(temp, file)
}

export function companyIdFromRequest(request: Request) {
  const fromHeader = request.headers.get('x-wiseflow-company-id')?.trim()
  const fromQuery = new URL(request.url).searchParams.get('companyId')?.trim()
  const companyId = fromHeader || fromQuery || ''
  if (!companyId && process.env.NODE_ENV === 'production') {
    throw Object.assign(new Error('Company context is required for datasets.'), { status: 400 })
  }
  return companyId || 'default-company'
}

// Datasets live in the `general` workspace area (same gate the proxy uses for
// /datasets) — every role except Employee and Client may use them.
export async function actorFromDatasetsRequest(request: Request): Promise<ServerSession> {
  const actor = await requireVerifiedSession(request, 'general')
  if (!canAccessArea(actor.role, 'general')) {
    throw Object.assign(new Error('You are not allowed to access datasets.'), { status: 403 })
  }
  return actor
}

export async function assertDatasetsCompanyAccess(actor: ServerSession, companyId: string) {
  await assertCompanyAccess(actor, companyId)
}

export function assertWorkspaceState(input: unknown): DatasetWorkspaceState {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw Object.assign(new Error('Request body must be a workspace object.'), { status: 400 })
  }
  // Drop functions/undefined and detach from the request object.
  return JSON.parse(JSON.stringify(input)) as DatasetWorkspaceState
}

export async function readDatasetWorkspace(companyId: string): Promise<DatasetWorkspaceState | null> {
  assertStoreConfigured()
  const supabase = getSupabaseAdmin()
  if (!supabase) {
    return readJsonObject(workspaceFile(companyId))
  }

  const { data, error } = await supabase
    .from('dataset_workspaces')
    .select('state')
    .eq('company_id', companyId)
    .maybeSingle()

  if (error) {
    throw Object.assign(new Error(`Could not read dataset workspace from Supabase: ${error.message}`), { status: 500 })
  }

  return asWorkspaceObject(data?.state)
}

export async function writeDatasetWorkspace(companyId: string, state: DatasetWorkspaceState): Promise<DatasetWorkspaceState> {
  assertStoreConfigured()
  const supabase = getSupabaseAdmin()
  if (!supabase) {
    await writeJsonObject(companyId, workspaceFile(companyId), state)
    return state
  }

  const { error } = await supabase
    .from('dataset_workspaces')
    .upsert({ company_id: companyId, state, updated_at: new Date().toISOString() }, { onConflict: 'company_id' })

  if (error) {
    throw Object.assign(new Error(`Could not write dataset workspace to Supabase: ${error.message}`), { status: 500 })
  }

  return state
}

export function jsonError(error: unknown) {
  const status = typeof error === 'object' && error && 'status' in error ? Number(error.status) : 500
  const message = error instanceof Error ? error.message : 'Unexpected server error.'
  return Response.json({ ok: false, error: message }, { status: Number.isFinite(status) ? status : 500 })
}
