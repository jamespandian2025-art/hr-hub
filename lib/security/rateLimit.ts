import { createHash } from 'node:crypto'
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { requestIp } from './session'

export const runtime = 'nodejs'

type RateLimitMode = 'check' | 'hit' | 'reset'

export type RateLimitPolicy = {
  scope: string
  limit: number
  windowMs: number
  blockMs: number
}

type RateLimitResult = {
  allowed: boolean
  blocked: boolean
  remaining: number
  retryAfterSeconds: number
  count: number
}

type StoredRateLimit = {
  key: string
  scope: string
  identifierHash: string
  count: number
  windowStartedAt: number
  blockedUntil: number
  updatedAt: number
}

const minute = 60 * 1000
const hour = 60 * minute

export const rateLimitPolicies = {
  login: { scope: 'auth.login', limit: 5, windowMs: 15 * minute, blockMs: 15 * minute },
  sessionCreate: { scope: 'auth.session.create', limit: 30, windowMs: 15 * minute, blockMs: 15 * minute },
  employeeLogin: { scope: 'hr.employee-login', limit: 5, windowMs: 15 * minute, blockMs: 15 * minute },
  invitationCreate: { scope: 'auth.invitation.create', limit: 20, windowMs: hour, blockMs: hour },
  credentialEmail: { scope: 'hr.employee-credential-email', limit: 15, windowMs: hour, blockMs: hour },
  tenantBootstrap: { scope: 'tenant.bootstrap', limit: 10, windowMs: hour, blockMs: hour },
  backupExport: { scope: 'backup.export', limit: 12, windowMs: hour, blockMs: hour },
  backupRestore: { scope: 'backup.restore', limit: 3, windowMs: hour, blockMs: 6 * hour },
  aiAssistant: { scope: 'ai.assistant', limit: 40, windowMs: minute, blockMs: 5 * minute },
  fileUpload: { scope: 'file.upload', limit: 60, windowMs: hour, blockMs: 15 * minute },
  monitoringEvent: { scope: 'monitoring.event', limit: 120, windowMs: minute, blockMs: 5 * minute },
  businessMutation: { scope: 'business.mutation', limit: 240, windowMs: minute, blockMs: 5 * minute },
  hrMutation: { scope: 'hr.mutation', limit: 180, windowMs: minute, blockMs: 5 * minute },
} satisfies Record<string, RateLimitPolicy>

const dataDir = process.env.RATE_LIMIT_DATA_DIR
  || path.join(process.cwd(), '.data', 'rate-limits')
const storeFile = path.join(dataDir, 'rate-limits.json')
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
let supabaseAdmin: SupabaseClient | null = null

function shouldUseSupabase() {
  return Boolean(supabaseUrl && supabaseServiceRoleKey)
}

function shouldUseFileStore() {
  return !process.env.VERCEL || Boolean(process.env.RATE_LIMIT_DATA_DIR)
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
  throw Object.assign(new Error('Rate limit storage is not configured. Add SUPABASE_SERVICE_ROLE_KEY in production and run the rate_limits Supabase setup SQL.'), { status: 500 })
}

function hash(value: string) {
  return createHash('sha256').update(value).digest('hex')
}

function normalizePart(value: unknown) {
  if (value === null || value === undefined) return ''
  return String(value).trim().toLowerCase()
}

export function rateLimitIdentifier(request: Request, ...parts: unknown[]) {
  const ip = requestIp(request) || 'unknown-ip'
  const normalized = [ip, ...parts].map(normalizePart).filter(Boolean)
  return normalized.join('|') || 'anonymous'
}

function fileKey(scope: string, identifier: string) {
  return `${scope}:${hash(identifier)}`
}

async function readFileStore() {
  try {
    const raw = await readFile(storeFile, 'utf8')
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed as StoredRateLimit[] : []
  } catch (error) {
    const code = typeof error === 'object' && error && 'code' in error ? String(error.code) : ''
    if (code === 'ENOENT') return []
    throw error
  }
}

async function writeFileStore(records: StoredRateLimit[]) {
  await mkdir(dataDir, { recursive: true })
  const temp = `${storeFile}.${process.pid}.${Date.now()}.tmp`
  await writeFile(temp, `${JSON.stringify(records, null, 2)}\n`, 'utf8')
  await rename(temp, storeFile)
}

function resultFromRecord(record: StoredRateLimit, policy: RateLimitPolicy, now: number): RateLimitResult {
  const blocked = record.blockedUntil > now
  return {
    allowed: !blocked,
    blocked,
    remaining: Math.max(0, policy.limit - record.count),
    retryAfterSeconds: blocked ? Math.ceil((record.blockedUntil - now) / 1000) : 0,
    count: record.count,
  }
}

async function fileRateLimit(policy: RateLimitPolicy, identifier: string, mode: RateLimitMode): Promise<RateLimitResult> {
  const now = Date.now()
  const key = fileKey(policy.scope, identifier)
  const retentionMs = Math.max(policy.windowMs + policy.blockMs, 24 * hour)
  const records = (await readFileStore()).filter(record => now - Number(record.updatedAt || 0) < retentionMs)
  const index = records.findIndex(record => record.key === key)
  let record = index >= 0 ? records[index] : null

  if (mode === 'reset') {
    if (index >= 0) records.splice(index, 1)
    await writeFileStore(records)
    return { allowed: true, blocked: false, remaining: policy.limit, retryAfterSeconds: 0, count: 0 }
  }

  if (!record) {
    record = {
      key,
      scope: policy.scope,
      identifierHash: hash(identifier),
      count: 0,
      windowStartedAt: now,
      blockedUntil: 0,
      updatedAt: now,
    }
    records.push(record)
  }

  if (record.blockedUntil > now) {
    await writeFileStore(records)
    return resultFromRecord(record, policy, now)
  }

  if (now - record.windowStartedAt > policy.windowMs) {
    record.count = 0
    record.windowStartedAt = now
    record.blockedUntil = 0
  }

  if (mode === 'hit') {
    record.count += 1
    if (record.count > policy.limit) record.blockedUntil = now + policy.blockMs
  }

  record.updatedAt = now
  records[index >= 0 ? index : records.length - 1] = record
  await writeFileStore(records)
  return resultFromRecord(record, policy, now)
}

async function supabaseRateLimit(policy: RateLimitPolicy, identifier: string, mode: RateLimitMode): Promise<RateLimitResult> {
  const supabase = getSupabaseAdmin()
  if (!supabase) return fileRateLimit(policy, identifier, mode)

  const { data, error } = await supabase.rpc('record_rate_limit_hit', {
    input_scope: policy.scope,
    input_identifier: identifier,
    input_limit: policy.limit,
    input_window_seconds: Math.ceil(policy.windowMs / 1000),
    input_block_seconds: Math.ceil(policy.blockMs / 1000),
    input_mode: mode,
  })

  if (error) {
    throw Object.assign(new Error(`Rate limit storage is unavailable: ${error.message}`), { status: 500 })
  }

  const row = Array.isArray(data) ? data[0] : data
  return {
    allowed: Boolean(row?.allowed),
    blocked: Boolean(row?.blocked),
    remaining: Number(row?.remaining || 0),
    retryAfterSeconds: Number(row?.retry_after_seconds || 0),
    count: Number(row?.count || 0),
  }
}

export async function checkRateLimit(policy: RateLimitPolicy, identifier: string) {
  assertStoreConfigured()
  return supabaseRateLimit(policy, identifier, 'check')
}

export async function hitRateLimit(policy: RateLimitPolicy, identifier: string) {
  assertStoreConfigured()
  return supabaseRateLimit(policy, identifier, 'hit')
}

export async function resetRateLimit(policy: RateLimitPolicy, identifier: string) {
  assertStoreConfigured()
  return supabaseRateLimit(policy, identifier, 'reset')
}

export async function enforceRateLimit(request: Request, policy: RateLimitPolicy, ...parts: unknown[]) {
  const result = await hitRateLimit(policy, rateLimitIdentifier(request, ...parts))
  if (result.allowed) return result
  throw Object.assign(new Error(`Too many requests. Try again in ${result.retryAfterSeconds || Math.ceil(policy.blockMs / 1000)} seconds.`), {
    status: 429,
    retryAfterSeconds: result.retryAfterSeconds,
  })
}
