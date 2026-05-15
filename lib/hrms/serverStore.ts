import { randomUUID } from 'node:crypto'
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import {
  canAccessCollection,
  HrAction,
  HrCollection,
  isHrCollection,
  roleBucket,
  sensitiveAuditAction,
} from './permissions'

export const runtime = 'nodejs'

export type HrActor = {
  id?: string
  name: string
  role: string
}

export type HrRecord = {
  id: string
  createdAt: string
  updatedAt: string
  [key: string]: unknown
}

export type AuditLogRecord = {
  id: string
  action: string
  actorId?: string
  actorName: string
  actorRole: string
  collection: HrCollection
  targetId?: string
  summary: string
  before?: unknown
  after?: unknown
  createdAt: string
  updatedAt: string
}

const dataDir = process.env.HRHUB_DATA_DIR
  || path.join(process.cwd(), '.data', 'hrhub')
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
let supabaseAdmin: SupabaseClient | null = null

type HrStoreRow = {
  id: string
  collection: HrCollection
  payload: Record<string, unknown> | null
  company_id: string | null
  created_at: string
  updated_at: string
}

function shouldUseSupabase() {
  return Boolean(supabaseUrl && supabaseServiceRoleKey)
}

function shouldUseFileStore() {
  return !process.env.VERCEL || Boolean(process.env.HRHUB_DATA_DIR)
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
  throw Object.assign(new Error('Supabase HR records storage is not configured. Add SUPABASE_SERVICE_ROLE_KEY in Vercel and create the hr_records table.'), { status: 500 })
}

function collectionFile(collection: HrCollection) {
  return path.join(dataDir, `${collection}.json`)
}

async function ensureDataDir() {
  await mkdir(dataDir, { recursive: true })
}

async function readJsonArray<T>(file: string): Promise<T[]> {
  await ensureDataDir()
  try {
    const raw = await readFile(file, 'utf8')
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed as T[] : []
  } catch (error) {
    const code = typeof error === 'object' && error && 'code' in error ? String(error.code) : ''
    if (code === 'ENOENT') return []
    throw error
  }
}

async function writeJsonArray<T>(file: string, value: T[]) {
  await ensureDataDir()
  const temp = `${file}.${process.pid}.${Date.now()}.tmp`
  await writeFile(temp, `${JSON.stringify(value, null, 2)}\n`, 'utf8')
  await rename(temp, file)
}

function cleanRecord(record: HrRecord) {
  return JSON.parse(JSON.stringify(record)) as Record<string, unknown>
}

function rowToRecord(row: HrStoreRow): HrRecord {
  const payload = row.payload && typeof row.payload === 'object' ? row.payload : {}
  return {
    ...payload,
    id: String(payload.id || row.id),
    createdAt: typeof payload.createdAt === 'string' ? payload.createdAt : row.created_at,
    updatedAt: typeof payload.updatedAt === 'string' ? payload.updatedAt : row.updated_at,
  }
}

function recordToRow(collection: HrCollection, record: HrRecord) {
  const payload = cleanRecord(record)
  const companyId = typeof record.companyId === 'string'
    ? record.companyId
    : typeof record.company_id === 'string'
      ? record.company_id
      : null

  return {
    id: record.id,
    collection,
    payload,
    company_id: companyId,
    created_at: typeof record.createdAt === 'string' ? record.createdAt : new Date().toISOString(),
    updated_at: typeof record.updatedAt === 'string' ? record.updatedAt : new Date().toISOString(),
  }
}

async function readStoreRecords(collection: HrCollection) {
  assertStoreConfigured()
  const supabase = getSupabaseAdmin()
  if (!supabase) return readJsonArray<HrRecord>(collectionFile(collection))

  const { data, error } = await supabase
    .from('hr_records')
    .select('id, collection, payload, company_id, created_at, updated_at')
    .eq('collection', collection)
    .order('created_at', { ascending: false })

  if (error) {
    throw Object.assign(new Error(`Could not read HR records from Supabase: ${error.message}`), { status: 500 })
  }

  return (data || []).map(row => rowToRecord(row as HrStoreRow))
}

async function writeStoreRecords(collection: HrCollection, records: HrRecord[]) {
  assertStoreConfigured()
  const supabase = getSupabaseAdmin()
  if (!supabase) {
    await writeJsonArray(collectionFile(collection), records)
    return
  }

  if (records.length === 0) return

  const { error } = await supabase
    .from('hr_records')
    .upsert(records.map(record => recordToRow(collection, record)), { onConflict: 'id' })

  if (error) {
    throw Object.assign(new Error(`Could not write HR records to Supabase: ${error.message}`), { status: 500 })
  }
}

export function actorFromRequest(request: Request): HrActor {
  return {
    id: request.headers.get('x-hr-user-id') || undefined,
    name: request.headers.get('x-hr-user-name') || 'System User',
    role: request.headers.get('x-hr-role') || 'Employee',
  }
}

export function assertCollection(input: string) {
  if (!isHrCollection(input)) {
    throw Object.assign(new Error('Unknown HR collection.'), { status: 404 })
  }
  return input
}

export function assertPermission(actor: HrActor, collection: HrCollection, action: HrAction) {
  if (!canAccessCollection(actor.role, collection, action)) {
    throw Object.assign(new Error('You are not allowed to perform this HR action.'), { status: 403 })
  }
}

function recordEmployeeKeys(record: HrRecord) {
  return [
    record.employeeId,
    record.employeeCode,
    record.userId,
    record.requesterId,
    record.accountId,
  ].filter(Boolean).map(String)
}

function notificationVisibleToActor(record: HrRecord, actor: HrActor) {
  const bucket = roleBucket(actor.role)
  const targetUserId = typeof record.targetUserId === 'string' ? record.targetUserId : ''
  const recipientId = typeof record.recipientId === 'string' ? record.recipientId : ''
  const targetRole = typeof record.targetRole === 'string' ? roleBucket(record.targetRole) : undefined
  const audience = Array.isArray(record.audience) ? record.audience.map(String).map(roleBucket) : []

  if (!targetUserId && !recipientId && !targetRole && audience.length === 0) return bucket !== 'employee'
  if (actor.id && [targetUserId, recipientId].includes(actor.id)) return true
  if (targetRole === bucket || audience.includes(bucket)) return true
  return bucket === 'admin'
}

export function recordVisibleToActor(collection: HrCollection, record: HrRecord, actor: HrActor) {
  const bucket = roleBucket(actor.role)
  if (bucket === 'admin' || bucket === 'hr' || bucket === 'finance') return true
  if (collection === 'notifications') return notificationVisibleToActor(record, actor)
  if (bucket === 'manager') return collection !== 'payroll-records' && collection !== 'loan-requests'
  if (bucket !== 'employee') return false
  if (!actor.id) return false
  return recordEmployeeKeys(record).includes(actor.id)
}

export async function listRecords(collection: HrCollection) {
  return readStoreRecords(collection)
}

export async function listVisibleRecords(collection: HrCollection, actor: HrActor) {
  const records = await listRecords(collection)
  return records.filter(record => recordVisibleToActor(collection, record, actor))
}

export async function getRecord(collection: HrCollection, id: string) {
  const records = await listRecords(collection)
  return records.find(record => record.id === id) || null
}

export async function getVisibleRecord(collection: HrCollection, id: string, actor: HrActor) {
  const record = await getRecord(collection, id)
  return record && recordVisibleToActor(collection, record, actor) ? record : null
}

export async function createRecord(collection: HrCollection, input: Record<string, unknown>, actor: HrActor) {
  const now = new Date().toISOString()
  const record: HrRecord = {
    ...input,
    id: String(input.id || `${collection}-${randomUUID()}`),
    createdAt: typeof input.createdAt === 'string' ? input.createdAt : now,
    updatedAt: now,
  }
  const records = await listRecords(collection)
  const next = [record, ...records.filter(item => item.id !== record.id)]
  await writeStoreRecords(collection, next)
  await appendAuditLog({
    action: sensitiveAuditAction(collection, 'create'),
    actor,
    collection,
    targetId: record.id,
    summary: `Created ${collection} record.`,
    after: record,
  })
  return record
}

export async function updateRecord(collection: HrCollection, id: string, input: Record<string, unknown>, actor: HrActor) {
  const records = await listRecords(collection)
  const before = records.find(record => record.id === id)
  if (!before) return null
  const after: HrRecord = {
    ...before,
    ...input,
    id,
    createdAt: before.createdAt,
    updatedAt: new Date().toISOString(),
  }
  await writeStoreRecords(collection, records.map(record => record.id === id ? after : record))
  await appendAuditLog({
    action: sensitiveAuditAction(collection, 'update'),
    actor,
    collection,
    targetId: id,
    summary: `Updated ${collection} record.`,
    before,
    after,
  })
  return after
}

export async function appendAuditLog(input: Omit<AuditLogRecord, 'id' | 'actorId' | 'actorName' | 'actorRole' | 'createdAt' | 'updatedAt'> & { actor: HrActor }) {
  const now = new Date().toISOString()
  const record: AuditLogRecord = {
    id: `audit-${randomUUID()}`,
    action: input.action,
    actorId: input.actor.id,
    actorName: input.actor.name,
    actorRole: input.actor.role,
    collection: input.collection,
    targetId: input.targetId,
    summary: input.summary,
    before: input.before,
    after: input.after,
    createdAt: now,
    updatedAt: now,
  }
  const records = await readStoreRecords('audit-logs') as AuditLogRecord[]
  await writeStoreRecords('audit-logs', [record, ...records].slice(0, 5000))
  return record
}

export async function createNotification(input: Record<string, unknown>, actor: HrActor) {
  return createRecord('notifications', {
    status: 'Unread',
    channel: 'In App',
    ...input,
  }, actor)
}

export function jsonError(error: unknown) {
  const status = typeof error === 'object' && error && 'status' in error ? Number(error.status) : 500
  const message = error instanceof Error ? error.message : 'Unexpected server error.'
  return Response.json({ ok: false, error: message }, { status: Number.isFinite(status) ? status : 500 })
}
