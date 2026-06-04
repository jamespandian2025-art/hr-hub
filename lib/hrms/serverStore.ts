import 'server-only'

import { randomUUID } from 'node:crypto'
import { mkdir, readFile, rename, unlink, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { sessionFromRequest } from '@/lib/security/session'
import { validateObject, type FieldRule } from '@/lib/security/validation'
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
  email?: string
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
  companyId?: string
  actorId?: string
  actorName: string
  actorRole: string
  collection: HrCollection
  targetId?: string
  ip?: string
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

// Salvage the first complete top-level JSON array from malformed content (e.g.
// trailing bytes left by a legacy non-atomic write). Respects strings/escapes.
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
  await ensureDataDir()
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
    // The file is malformed. Salvage the first complete array so a single
    // corrupt byte sequence cannot permanently block reads and writes; the next
    // write re-persists the cleaned array via the atomic temp+rename path.
    const salvaged = salvageLeadingJsonArray<T>(raw)
    if (salvaged) return salvaged
    throw new Error('Stored HR records file is corrupted and could not be recovered.')
  }
}

async function writeJsonArray<T>(file: string, value: T[]) {
  await ensureDataDir()
  // randomUUID keeps the temp name unique even when two writes land in the same
  // millisecond within one process, so concurrent writers never share a temp.
  const temp = `${file}.${process.pid}.${Date.now()}.${randomUUID()}.tmp`
  await writeFile(temp, `${JSON.stringify(value, null, 2)}\n`, 'utf8')
  // Atomically swap the temp over the target. On Windows, rename across an
  // existing file can transiently fail (EPERM/EEXIST) when another handle —
  // antivirus, a concurrent reader, or an overlapping write — briefly holds the
  // target. Retry with a short backoff, then unlink the temp so a permanent
  // failure can't leak a stray .tmp file. The atomic guarantee is preserved:
  // either rename succeeds and replaces the target, or the target is untouched.
  let lastError: unknown
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      await rename(temp, file)
      return
    } catch (error) {
      lastError = error
      await new Promise(resolve => { setTimeout(resolve, 25 * (attempt + 1)) })
    }
  }
  await unlink(temp).catch(() => {})
  throw lastError
}

function cleanRecord(record: HrRecord) {
  return JSON.parse(JSON.stringify(record)) as Record<string, unknown>
}

function publicRecord(record: HrRecord): HrRecord {
  const copy = cleanRecord(record) as HrRecord
  delete copy.password
  delete copy.passwordHash
  delete copy.passwordSalt
  delete copy.portalPassword
  delete copy.portalPasswordHash
  delete copy.portalPasswordSalt
  delete copy.portalPasswordAlgorithm
  return copy
}

function redactSecrets(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(redactSecrets)
  if (!value || typeof value !== 'object') return value
  return Object.fromEntries(Object.entries(value as Record<string, unknown>).map(([key, item]) => {
    if (/password|secret|token|serviceRole/i.test(key)) return [key, '[redacted]']
    return [key, redactSecrets(item)]
  }))
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

function recordToRow(collection: HrCollection, record: HrRecord, companyId?: string) {
  const payload = cleanRecord(record)
  const recordCompanyId = companyId
    || (typeof record.companyId === 'string'
    ? record.companyId
    : typeof record.company_id === 'string'
      ? record.company_id
      : null)

  return {
    id: record.id,
    collection,
    payload,
    company_id: recordCompanyId,
    created_at: typeof record.createdAt === 'string' ? record.createdAt : new Date().toISOString(),
    updated_at: typeof record.updatedAt === 'string' ? record.updatedAt : new Date().toISOString(),
  }
}

async function readStoreRecords(collection: HrCollection, companyId?: string) {
  assertStoreConfigured()
  const supabase = getSupabaseAdmin()
  if (!supabase) {
    const records = await readJsonArray<HrRecord>(collectionFile(collection))
    return companyId
      ? records.filter(record => record.companyId === companyId || record.company_id === companyId)
      : records
  }

  let query = supabase
    .from('hr_records')
    .select('id, collection, payload, company_id, created_at, updated_at')
    .eq('collection', collection)
    .order('created_at', { ascending: false })
  if (companyId) query = query.eq('company_id', companyId)

  const { data, error } = await query

  if (error) {
    throw Object.assign(new Error(`Could not read HR records from Supabase: ${error.message}`), { status: 500 })
  }

  return (data || []).map(row => rowToRecord(row as HrStoreRow))
}

async function writeStoreRecords(collection: HrCollection, records: HrRecord[], companyId?: string) {
  assertStoreConfigured()
  const supabase = getSupabaseAdmin()
  if (!supabase) {
    if (!companyId) {
      await writeJsonArray(collectionFile(collection), records)
      return
    }
    const existing = await readJsonArray<HrRecord>(collectionFile(collection))
    const retained = existing.filter(record => record.companyId !== companyId && record.company_id !== companyId)
    await writeJsonArray(collectionFile(collection), [...records, ...retained])
    return
  }

  let deleteQuery = supabase
    .from('hr_records')
    .delete()
    .eq('collection', collection)
  deleteQuery = companyId
    ? deleteQuery.eq('company_id', companyId)
    : deleteQuery.is('company_id', null)

  const { error: deleteError } = await deleteQuery
  if (deleteError) {
    throw Object.assign(new Error(`Could not replace HR records in Supabase: ${deleteError.message}`), { status: 500 })
  }

  if (records.length === 0) return

  const { error } = await supabase
    .from('hr_records')
    .upsert(records.map(record => recordToRow(collection, record, companyId)), { onConflict: 'id' })

  if (error) {
    throw Object.assign(new Error(`Could not write HR records to Supabase: ${error.message}`), { status: 500 })
  }
}

export async function actorFromRequest(request: Request): Promise<HrActor> {
  const session = await sessionFromRequest(request)
  if (!session) throw Object.assign(new Error('Authentication required.'), { status: 401 })
  return {
    id: session.employeeId || session.userId,
    email: session.email,
    name: session.name || session.email || 'System User',
    role: session.role,
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

const commonRules = {
  employeeId: { type: 'string', maxLength: 80 },
  employeeName: { type: 'string', maxLength: 160 },
  status: { type: 'string', maxLength: 80 },
  createdAt: { type: 'date' },
  updatedAt: { type: 'date' },
} satisfies Record<string, FieldRule>

const collectionValidationRules: Partial<Record<HrCollection, Record<string, FieldRule>>> = {
  employees: {
    ...commonRules,
    firstName: { required: true, type: 'string', maxLength: 80 },
    lastName: { required: true, type: 'string', maxLength: 80 },
    email: { type: 'string', maxLength: 200 },
    portalEmail: { type: 'string', maxLength: 200 },
    portalPassword: { type: 'string', maxLength: 200 },
    portalPasswordHash: { type: 'string', maxLength: 200 },
    portalPasswordSalt: { type: 'string', maxLength: 80 },
    portalPasswordAlgorithm: { type: 'string', allowed: ['pbkdf2-sha256'] },
    portalPasswordUpdatedAt: { type: 'date' },
    employmentStatus: { type: 'string', maxLength: 80 },
    dateOfJoining: { type: 'date' },
    basicSalary: { type: 'number', min: 0 },
    allowances: { type: 'number', min: 0 },
    deductions: { type: 'number', min: 0 },
  },
  attendance: {
    employeeId: { required: true, type: 'string', maxLength: 80 },
    date: { required: true, type: 'date' },
    status: { required: true, type: 'string', allowed: ['Present', 'Late', 'Absent', 'On Leave', 'Rest day'] },
    breakMinutes: { type: 'number', min: 0, max: 1440 },
    notes: { type: 'string', maxLength: 1000 },
  },
  'leave-requests': {
    ...commonRules,
    employeeId: { required: true, type: 'string', maxLength: 80 },
    leaveType: { required: true, type: 'string', maxLength: 80 },
    startDate: { required: true, type: 'date' },
    endDate: { required: true, type: 'date' },
    days: { required: true, type: 'number', min: 0.5, max: 365 },
    reason: { type: 'string', maxLength: 1500 },
  },
  'loan-requests': {
    ...commonRules,
    employeeId: { required: true, type: 'string', maxLength: 80 },
    requestType: { required: true, type: 'string', maxLength: 80 },
    amount: { required: true, type: 'number', min: 1 },
    repaymentMonths: { type: 'number', min: 1, max: 120 },
    reason: { type: 'string', maxLength: 1500 },
  },
  'allowance-requests': {
    ...commonRules,
    employeeId: { required: true, type: 'string', maxLength: 80 },
    type: { required: true, type: 'string', maxLength: 80 },
    amount: { required: true, type: 'number', min: 1 },
    date: { type: 'date' },
    purpose: { type: 'string', maxLength: 1500 },
  },
  'payroll-records': {
    employeeId: { required: true, type: 'string', maxLength: 80 },
    period: { required: true, type: 'string', maxLength: 80 },
    gross: { required: true, type: 'number', min: 0 },
    deductions: { required: true, type: 'number', min: 0 },
    net: { required: true, type: 'number' },
    status: { required: true, type: 'string', maxLength: 80 },
  },
  notifications: {
    title: { required: true, type: 'string', maxLength: 220 },
    detail: { type: 'string', maxLength: 1000 },
    status: { type: 'string', maxLength: 80 },
  },
}

function validateRecordInput(collection: HrCollection, input: Record<string, unknown>, partial = false) {
  const rules = collectionValidationRules[collection]
  if (!rules) return input
  const activeRules = partial
    ? Object.fromEntries(Object.entries(rules).map(([key, rule]) => [key, { ...rule, required: false }]))
    : rules
  const validation = validateObject(input, activeRules)
  if (!validation.ok) throw Object.assign(new Error(validation.errors[0] || 'Invalid record input.'), { status: 400 })
  return validation.value
}

function assertPayrollWorkflow(collection: HrCollection, action: HrAction, input: Record<string, unknown>, actor: HrActor) {
  if (collection !== 'payroll-records' || action !== 'create') return
  const bucket = roleBucket(actor.role)
  const status = typeof input.status === 'string' ? input.status : ''
  if (bucket === 'hr' && !['Pending', 'Processing'].includes(status)) {
    throw Object.assign(new Error('HR can generate payroll only as Pending or Processing. Finance must approve and release payment.'), { status: 403 })
  }
}

// Employees may PATCH their own leave request only to cancel it while it is still
// pending. Ownership is already enforced by recordVisibleToActor; this guard caps
// what an employee can change so they cannot approve their own leave or edit a
// request that has already been decided.
function assertLeaveSelfCancel(collection: HrCollection, action: HrAction, before: HrRecord, input: Record<string, unknown>, actor: HrActor) {
  if (collection !== 'leave-requests' || action !== 'update') return
  if (roleBucket(actor.role) !== 'employee') return
  const requestedStatus = typeof input.status === 'string' ? input.status : ''
  if (requestedStatus !== 'Cancelled') {
    throw Object.assign(new Error('You can only cancel your own leave request.'), { status: 403 })
  }
  const currentStatus = typeof before.status === 'string' ? before.status : ''
  if (!['Pending', 'Draft'].includes(currentStatus)) {
    throw Object.assign(new Error('Only a pending leave request can be cancelled.'), { status: 409 })
  }
  const allowed = new Set(['status', 'updatedAt', 'approvalStep', 'hrApprovalStatus', 'managerApprovalStatus'])
  const disallowed = Object.keys(input).filter(key => !allowed.has(key) && input[key] !== before[key])
  if (disallowed.length) {
    throw Object.assign(new Error('A cancellation can only change the request status.'), { status: 403 })
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

export async function listRecords(collection: HrCollection, companyId?: string) {
  return readStoreRecords(collection, companyId)
}

export async function listVisibleRecords(collection: HrCollection, actor: HrActor, companyId?: string) {
  const records = await listRecords(collection, companyId)
  return records.filter(record => recordVisibleToActor(collection, record, actor)).map(publicRecord)
}

export async function getRecord(collection: HrCollection, id: string, companyId?: string) {
  const records = await listRecords(collection, companyId)
  return records.find(record => record.id === id) || null
}

export async function getVisibleRecord(collection: HrCollection, id: string, actor: HrActor, companyId?: string) {
  const record = await getRecord(collection, id, companyId)
  return record && recordVisibleToActor(collection, record, actor) ? publicRecord(record) : null
}

export async function createRecord(collection: HrCollection, input: Record<string, unknown>, actor: HrActor, companyId?: string) {
  const now = new Date().toISOString()
  const validatedInput = validateRecordInput(collection, input)
  assertPayrollWorkflow(collection, 'create', validatedInput, actor)
  const record: HrRecord = {
    ...validatedInput,
    ...(companyId ? { companyId } : {}),
    id: String(validatedInput.id || `${collection}-${randomUUID()}`),
    createdAt: typeof validatedInput.createdAt === 'string' ? validatedInput.createdAt : now,
    updatedAt: now,
  }
  if (!recordVisibleToActor(collection, record, actor)) {
    throw Object.assign(new Error('You can only create records for data you are allowed to access.'), { status: 403 })
  }
  const records = await listRecords(collection, companyId)
  const next = [record, ...records.filter(item => item.id !== record.id)]
  await writeStoreRecords(collection, next, companyId)
  await appendAuditLog({
    action: sensitiveAuditAction(collection, 'create'),
    actor,
    collection,
    targetId: record.id,
    summary: `Created ${collection} record.`,
    after: record,
    companyId,
  })
  return publicRecord(record)
}

export async function updateRecord(collection: HrCollection, id: string, input: Record<string, unknown>, actor: HrActor, companyId?: string) {
  const records = await listRecords(collection, companyId)
  const before = records.find(record => record.id === id)
  if (!before) return null
  if (!recordVisibleToActor(collection, before, actor)) {
    throw Object.assign(new Error('You can only update records you are allowed to access.'), { status: 403 })
  }
  assertLeaveSelfCancel(collection, 'update', before, input, actor)
  const validatedInput = validateRecordInput(collection, input, true)
  const after: HrRecord = {
    ...before,
    ...validatedInput,
    ...(companyId ? { companyId } : {}),
    id,
    createdAt: before.createdAt,
    updatedAt: new Date().toISOString(),
  }
  await writeStoreRecords(collection, records.map(record => record.id === id ? after : record), companyId)
  await appendAuditLog({
    action: sensitiveAuditAction(collection, 'update'),
    actor,
    collection,
    targetId: id,
    summary: `Updated ${collection} record.`,
    before,
    after,
    companyId,
  })
  return publicRecord(after)
}

export async function deleteRecord(collection: HrCollection, id: string, actor: HrActor, companyId?: string) {
  const records = await listRecords(collection, companyId)
  const before = records.find(record => record.id === id)
  if (!before) return false
  if (!recordVisibleToActor(collection, before, actor)) {
    throw Object.assign(new Error('You can only delete records you are allowed to access.'), { status: 403 })
  }
  await writeStoreRecords(collection, records.filter(record => record.id !== id), companyId)
  await appendAuditLog({
    action: sensitiveAuditAction(collection, 'delete'),
    actor,
    collection,
    targetId: id,
    summary: `Deleted ${collection} record.`,
    before,
    companyId,
  })
  return true
}

export async function replaceRecords(collection: HrCollection, records: HrRecord[], companyId?: string) {
  const now = new Date().toISOString()
  const cleaned = records.map(record => ({
    ...record,
    ...(companyId ? { companyId } : {}),
    id: String(record.id || `${collection}-${randomUUID()}`),
    createdAt: typeof record.createdAt === 'string' ? record.createdAt : now,
    updatedAt: typeof record.updatedAt === 'string' ? record.updatedAt : now,
  }))
  await writeStoreRecords(collection, cleaned, companyId)
  return cleaned.map(publicRecord)
}

export async function appendAuditLog(input: Omit<AuditLogRecord, 'id' | 'actorId' | 'actorName' | 'actorRole' | 'createdAt' | 'updatedAt'> & { actor: HrActor; companyId?: string }) {
  const now = new Date().toISOString()
  const record: AuditLogRecord = {
    id: `audit-${randomUUID()}`,
    action: input.action,
    actorId: input.actor.id,
    actorName: input.actor.name,
    actorRole: input.actor.role,
    collection: input.collection,
    targetId: input.targetId,
    ip: input.ip,
    summary: input.summary,
    ...(input.companyId ? { companyId: input.companyId } : {}),
    before: redactSecrets(input.before),
    after: redactSecrets(input.after),
    createdAt: now,
    updatedAt: now,
  }
  const records = await readStoreRecords('audit-logs', input.companyId) as AuditLogRecord[]
  await writeStoreRecords('audit-logs', [record, ...records].slice(0, 5000), input.companyId)
  return record
}

export async function createNotification(input: Record<string, unknown>, actor: HrActor, companyId?: string) {
  return createRecord('notifications', {
    status: 'Unread',
    channel: 'In App',
    ...input,
  }, actor, companyId)
}

export function jsonError(error: unknown) {
  const status = typeof error === 'object' && error && 'status' in error ? Number(error.status) : 500
  const message = error instanceof Error ? error.message : 'Unexpected server error.'
  return Response.json({ ok: false, error: message }, { status: Number.isFinite(status) ? status : 500 })
}
