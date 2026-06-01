import { randomUUID } from 'node:crypto'
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { assertBusinessCollection, areaForBusinessCollection, type BusinessCollection } from './collections'
import { canAccessArea } from '@/lib/security/rbac'
import { requestIp, requireVerifiedSession, type ServerSession } from '@/lib/security/session'
import { assertCompanyAccess } from '@/lib/tenant/serverStore'

export const runtime = 'nodejs'

export type BusinessPayload = Record<string, unknown>

export type BusinessRecord = {
  id: string
  collection: BusinessCollection
  companyId: string
  payload: BusinessPayload
  createdAt: string
  updatedAt: string
}

type BusinessStoreRow = {
  id: string
  collection: BusinessCollection
  company_id: string
  payload: BusinessPayload | null
  created_at: string
  updated_at: string
}

const dataDir = process.env.BUSINESS_DATA_DIR
  || path.join(/*turbopackIgnore: true*/ process.cwd(), '.data', 'business')
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
let supabaseAdmin: SupabaseClient | null = null

function shouldUseSupabase() {
  return Boolean(supabaseUrl && supabaseServiceRoleKey)
}

function shouldUseFileStore() {
  return !process.env.VERCEL || Boolean(process.env.BUSINESS_DATA_DIR)
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
  throw Object.assign(new Error('Business records storage is not configured. Add SUPABASE_SERVICE_ROLE_KEY in production and create the business_records table.'), { status: 500 })
}

function safePathSegment(value: string) {
  return value.replace(/[^a-zA-Z0-9._-]+/g, '_') || 'default'
}

function collectionFile(companyId: string, collection: BusinessCollection) {
  return path.join(/*turbopackIgnore: true*/ dataDir, safePathSegment(companyId), `${collection}.json`)
}

async function ensureCollectionDir(companyId: string) {
  await mkdir(path.join(/*turbopackIgnore: true*/ dataDir, safePathSegment(companyId)), { recursive: true })
}

// Salvage the first complete top-level JSON array from malformed content, e.g.
// when a legacy non-atomic write left stale bytes after a valid array. Scans
// bracket depth while respecting strings and escapes. Returns null if no
// complete leading array can be recovered.
function salvageLeadingJsonArray<T>(raw: string): T[] | null {
  let depth = 0
  let inStr = false
  let esc = false
  let start = -1
  for (let i = 0; i < raw.length; i++) {
    const ch = raw[i]
    if (inStr) {
      if (esc) esc = false
      else if (ch === '\\') esc = true
      else if (ch === '"') inStr = false
      continue
    }
    if (ch === '"') { inStr = true; continue }
    if (ch === '[') { if (depth === 0 && start < 0) start = i; depth++ }
    else if (ch === ']') {
      depth--
      if (depth === 0 && start >= 0) {
        try {
          const parsed = JSON.parse(raw.slice(start, i + 1))
          return Array.isArray(parsed) ? (parsed as T[]) : null
        } catch {
          return null
        }
      }
    }
  }
  return null
}

async function readJsonArray<T>(file: string): Promise<T[]> {
  let raw: string
  try {
    raw = await readFile(file, 'utf8')
  } catch (error) {
    const code = typeof error === 'object' && error && 'code' in error ? String(error.code) : ''
    if (code === 'ENOENT') return []
    throw error
  }
  try {
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed as T[] : []
  } catch {
    // The file is malformed (e.g. trailing content after a valid array from a
    // legacy non-atomic write). Salvage the first complete top-level array so a
    // single corrupt byte sequence cannot permanently block reads and writes.
    // The next write persists the cleaned array via the atomic temp+rename path.
    const salvaged = salvageLeadingJsonArray<T>(raw)
    if (salvaged) return salvaged
    throw new Error('Stored records file is corrupted and could not be recovered.')
  }
}

async function writeJsonArray<T>(companyId: string, file: string, value: T[]) {
  await ensureCollectionDir(companyId)
  const temp = `${file}.${process.pid}.${Date.now()}.tmp`
  await writeFile(temp, `${JSON.stringify(value, null, 2)}\n`, 'utf8')
  await rename(temp, file)
}

function cleanPayload(input: Record<string, unknown>) {
  return JSON.parse(JSON.stringify(input)) as BusinessPayload
}

function rowToRecord(row: BusinessStoreRow): BusinessRecord {
  const payload = row.payload && typeof row.payload === 'object' ? row.payload : {}
  return {
    id: String(payload.id || row.id),
    collection: row.collection,
    companyId: row.company_id,
    payload: {
      ...payload,
      id: String(payload.id || row.id),
      companyId: String(payload.companyId || row.company_id),
    },
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function recordToRow(collection: BusinessCollection, companyId: string, payload: BusinessPayload) {
  const now = new Date().toISOString()
  const id = String(payload.id || `${collection}-${randomUUID()}`)
  return {
    id,
    collection,
    company_id: companyId,
    payload: {
      ...payload,
      id,
      companyId,
    },
    created_at: typeof payload.createdAt === 'string' ? payload.createdAt : now,
    updated_at: now,
  }
}

export function companyIdFromRequest(request: Request) {
  const fromHeader = request.headers.get('x-wiseflow-company-id')?.trim()
  const fromQuery = new URL(request.url).searchParams.get('companyId')?.trim()
  const companyId = fromHeader || fromQuery || ''
  if (!companyId && process.env.NODE_ENV === 'production') {
    throw Object.assign(new Error('Company context is required for business records.'), { status: 400 })
  }
  return companyId || 'default-company'
}

export async function actorFromBusinessRequest(request: Request, collection: BusinessCollection): Promise<ServerSession> {
  const actor = await requireVerifiedSession(request, areaForBusinessCollection(collection))
  if (!canAccessArea(actor.role, areaForBusinessCollection(collection))) {
    throw Object.assign(new Error('You are not allowed to access this business area.'), { status: 403 })
  }
  return actor
}

export async function assertBusinessCompanyAccess(actor: ServerSession, companyId: string) {
  await assertCompanyAccess(actor, companyId)
}

async function readStoreRecords(collection: BusinessCollection, companyId: string) {
  assertStoreConfigured()
  const supabase = getSupabaseAdmin()
  if (!supabase) {
    return readJsonArray<BusinessRecord>(collectionFile(companyId, collection))
  }

  const { data, error } = await supabase
    .from('business_records')
    .select('id, collection, company_id, payload, created_at, updated_at')
    .eq('collection', collection)
    .eq('company_id', companyId)
    .order('created_at', { ascending: false })

  if (error) {
    throw Object.assign(new Error(`Could not read business records from Supabase: ${error.message}`), { status: 500 })
  }

  return (data || []).map(row => rowToRecord(row as BusinessStoreRow))
}

async function writeStoreRecords(collection: BusinessCollection, companyId: string, records: BusinessRecord[]) {
  assertStoreConfigured()
  const supabase = getSupabaseAdmin()
  if (!supabase) {
    await writeJsonArray(companyId, collectionFile(companyId, collection), records)
    return
  }

  const { error: deleteError } = await supabase
    .from('business_records')
    .delete()
    .eq('collection', collection)
    .eq('company_id', companyId)

  if (deleteError) {
    throw Object.assign(new Error(`Could not replace business records in Supabase: ${deleteError.message}`), { status: 500 })
  }

  if (!records.length) return

  const { error } = await supabase
    .from('business_records')
    .upsert(records.map(record => ({
      id: record.id,
      collection,
      company_id: companyId,
      payload: record.payload,
      created_at: record.createdAt,
      updated_at: record.updatedAt,
    })), { onConflict: 'company_id,collection,id' })

  if (error) {
    throw Object.assign(new Error(`Could not write business records to Supabase: ${error.message}`), { status: 500 })
  }
}

export function assertBusinessPayload(input: unknown) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw Object.assign(new Error('Request body must be an object.'), { status: 400 })
  }
  return cleanPayload(input as Record<string, unknown>)
}

export async function listBusinessRecords(collectionInput: string, companyId: string) {
  const collection = assertBusinessCollection(collectionInput)
  return readStoreRecords(collection, companyId)
}

export async function getBusinessRecord(collectionInput: string, companyId: string, id: string) {
  const collection = assertBusinessCollection(collectionInput)
  const records = await readStoreRecords(collection, companyId)
  return records.find(record => record.id === id) || null
}

export async function upsertBusinessRecord(collectionInput: string, companyId: string, payload: BusinessPayload) {
  const collection = assertBusinessCollection(collectionInput)
  const records = await readStoreRecords(collection, companyId)
  const row = recordToRow(collection, companyId, payload)
  const record: BusinessRecord = {
    id: row.id,
    collection,
    companyId,
    payload: row.payload,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
  await writeStoreRecords(collection, companyId, [record, ...records.filter(item => item.id !== record.id)])
  return record
}

export async function replaceBusinessRecords(collectionInput: string, companyId: string, payloads: BusinessPayload[]) {
  const collection = assertBusinessCollection(collectionInput)
  const records = payloads.map(payload => {
    const row = recordToRow(collection, companyId, payload)
    return {
      id: row.id,
      collection,
      companyId,
      payload: row.payload,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }
  })
  await writeStoreRecords(collection, companyId, records)
  return records
}

export async function deleteBusinessRecord(collectionInput: string, companyId: string, id: string) {
  const collection = assertBusinessCollection(collectionInput)
  const records = await readStoreRecords(collection, companyId)
  const next = records.filter(record => record.id !== id)
  await writeStoreRecords(collection, companyId, next)
  return records.length !== next.length
}

export function jsonError(error: unknown) {
  const status = typeof error === 'object' && error && 'status' in error ? Number(error.status) : 500
  const message = error instanceof Error ? error.message : 'Unexpected server error.'
  return Response.json({ ok: false, error: message }, { status: Number.isFinite(status) ? status : 500 })
}

export function auditMetadata(request: Request) {
  return { ip: requestIp(request) }
}
