import 'server-only'

import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { businessCollections, isBusinessCollection, type BusinessCollection } from '@/lib/business/collections'
import { listBusinessRecords, replaceBusinessRecords } from '@/lib/business/serverStore'
import { appendAuditLog, listRecords, replaceRecords, type HrActor, type HrRecord } from '@/lib/hrms/serverStore'
import { hrCollections, isHrCollection, type HrCollection } from '@/lib/hrms/permissions'
import type { ServerSession } from '@/lib/security/session'

export const runtime = 'nodejs'

type JsonRecord = Record<string, unknown>

type BackupBusinessRecord = {
  id: string
  collection: BusinessCollection
  companyId: string
  payload: JsonRecord
  createdAt: string
  updatedAt: string
}

type BackupEnvelope = {
  schemaVersion: 1
  product: 'WiseFlow'
  exportedAt: string
  companyId: string
  exportedBy: {
    userId: string
    email?: string
    role: string
  }
  company: JsonRecord | null
  companyMembers: JsonRecord[]
  tables: {
    clients: JsonRecord[]
    salesOrders: JsonRecord[]
  }
  businessRecords: Record<BusinessCollection, BackupBusinessRecord[]>
  hrRecords: Record<HrCollection, HrRecord[]>
}

export type BackupSummary = {
  companyMembers: number
  clients: number
  salesOrders: number
  businessRecords: Record<BusinessCollection, number>
  hrRecords: Record<HrCollection, number>
  totalRecords: number
}

type RestoreInput = {
  companyId: string
  actor: ServerSession
  backup: unknown
  dryRun: boolean
  confirm?: unknown
  ip?: string
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
let supabaseAdmin: SupabaseClient | null = null

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

function isRecord(value: unknown): value is JsonRecord {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value))
}

function safeRecord(value: unknown): JsonRecord {
  return isRecord(value) ? JSON.parse(JSON.stringify(value)) as JsonRecord : {}
}

function groupedBusinessRecords() {
  const groups = {} as Record<BusinessCollection, BackupBusinessRecord[]>
  businessCollections.forEach(collection => {
    groups[collection] = []
  })
  return groups
}

function groupedHrRecords() {
  const groups = {} as Record<HrCollection, HrRecord[]>
  hrCollections.forEach(collection => {
    groups[collection] = []
  })
  return groups
}

function actorForAudit(actor: ServerSession): HrActor {
  return {
    id: actor.userId,
    email: actor.email,
    name: actor.name || actor.email || 'Admin User',
    role: actor.role,
  }
}

function normalizeBusinessRecord(input: unknown, collectionFallback?: BusinessCollection, companyIdFallback?: string): BackupBusinessRecord | null {
  const record = safeRecord(input)
  const collection = String(record.collection || collectionFallback || '')
  if (!isBusinessCollection(collection)) return null
  const payload = safeRecord(record.payload)
  const id = String(record.id || payload.id || `${collection}-${Date.now()}`)
  const companyId = String(record.companyId || record.company_id || payload.companyId || companyIdFallback || '')
  const now = new Date().toISOString()
  return {
    id,
    collection,
    companyId,
    payload: {
      ...payload,
      id,
      companyId,
    },
    createdAt: typeof record.createdAt === 'string' ? record.createdAt : typeof record.created_at === 'string' ? record.created_at : now,
    updatedAt: typeof record.updatedAt === 'string' ? record.updatedAt : typeof record.updated_at === 'string' ? record.updated_at : now,
  }
}

function normalizeHrRecord(input: unknown, collection: HrCollection, companyId: string): HrRecord | null {
  const record = safeRecord(input)
  const id = String(record.id || `${collection}-${Date.now()}`)
  const now = new Date().toISOString()
  return {
    ...record,
    id,
    companyId,
    createdAt: typeof record.createdAt === 'string' ? record.createdAt : typeof record.created_at === 'string' ? record.created_at : now,
    updatedAt: typeof record.updatedAt === 'string' ? record.updatedAt : typeof record.updated_at === 'string' ? record.updated_at : now,
  } as HrRecord
}

function summaryForBackup(backup: BackupEnvelope): BackupSummary {
  const businessCounts = Object.fromEntries(
    businessCollections.map(collection => [collection, backup.businessRecords[collection]?.length || 0]),
  ) as Record<BusinessCollection, number>
  const hrCounts = Object.fromEntries(
    hrCollections.map(collection => [collection, backup.hrRecords[collection]?.length || 0]),
  ) as Record<HrCollection, number>
  const totalRecords = backup.companyMembers.length
    + backup.tables.clients.length
    + backup.tables.salesOrders.length
    + Object.values(businessCounts).reduce((total, count) => total + count, 0)
    + Object.values(hrCounts).reduce((total, count) => total + count, 0)

  return {
    companyMembers: backup.companyMembers.length,
    clients: backup.tables.clients.length,
    salesOrders: backup.tables.salesOrders.length,
    businessRecords: businessCounts,
    hrRecords: hrCounts,
    totalRecords,
  }
}

function assertBackupEnvelope(input: unknown): BackupEnvelope {
  if (!isRecord(input)) {
    throw Object.assign(new Error('Backup payload must be a JSON object.'), { status: 400 })
  }

  if (input.schemaVersion !== 1 || input.product !== 'WiseFlow') {
    throw Object.assign(new Error('Unsupported backup format.'), { status: 400 })
  }

  const companyId = typeof input.companyId === 'string' ? input.companyId.trim() : ''
  if (!companyId) {
    throw Object.assign(new Error('Backup payload is missing companyId.'), { status: 400 })
  }

  const businessRecords = groupedBusinessRecords()
  const rawBusinessRecords = isRecord(input.businessRecords) ? input.businessRecords : {}
  for (const collection of businessCollections) {
    const rows = Array.isArray(rawBusinessRecords[collection]) ? rawBusinessRecords[collection] as unknown[] : []
    businessRecords[collection] = rows
      .map(row => normalizeBusinessRecord(row, collection, companyId))
      .filter((row): row is BackupBusinessRecord => Boolean(row))
  }

  const hrRecords = groupedHrRecords()
  const rawHrRecords = isRecord(input.hrRecords) ? input.hrRecords : {}
  for (const collection of hrCollections) {
    const rows = Array.isArray(rawHrRecords[collection]) ? rawHrRecords[collection] as unknown[] : []
    hrRecords[collection] = rows
      .map(row => normalizeHrRecord(row, collection, companyId))
      .filter((row): row is HrRecord => Boolean(row))
  }

  const tables = isRecord(input.tables) ? input.tables : {}
  return {
    schemaVersion: 1,
    product: 'WiseFlow',
    exportedAt: typeof input.exportedAt === 'string' ? input.exportedAt : new Date().toISOString(),
    companyId,
    exportedBy: isRecord(input.exportedBy)
      ? {
          userId: String(input.exportedBy.userId || ''),
          email: typeof input.exportedBy.email === 'string' ? input.exportedBy.email : undefined,
          role: String(input.exportedBy.role || 'Admin'),
        }
      : { userId: '', role: 'Admin' },
    company: input.company === null ? null : safeRecord(input.company),
    companyMembers: Array.isArray(input.companyMembers) ? input.companyMembers.map(safeRecord) : [],
    tables: {
      clients: Array.isArray(tables.clients) ? tables.clients.map(safeRecord) : [],
      salesOrders: Array.isArray(tables.salesOrders) ? tables.salesOrders.map(safeRecord) : [],
    },
    businessRecords,
    hrRecords,
  }
}

async function readSupabaseRows<T extends JsonRecord>(supabase: SupabaseClient, table: string, companyId: string) {
  const { data, error } = await supabase
    .from(table)
    .select('*')
    .eq('company_id', companyId)

  if (error) {
    throw Object.assign(new Error(`Could not read ${table} for backup: ${error.message}`), { status: 500 })
  }
  return (data || []) as T[]
}

async function exportFromSupabase(companyId: string, actor: ServerSession): Promise<BackupEnvelope> {
  const supabase = getSupabaseAdmin()
  if (!supabase) throw Object.assign(new Error('Supabase backup storage is not configured.'), { status: 500 })

  const [companyResult, membersResult, clients, salesOrders, businessRows, hrRows] = await Promise.all([
    supabase.from('companies').select('*').eq('id', companyId).maybeSingle(),
    supabase.from('company_members').select('*').eq('company_id', companyId),
    readSupabaseRows(supabase, 'clients', companyId),
    readSupabaseRows(supabase, 'sales_orders', companyId),
    readSupabaseRows(supabase, 'business_records', companyId),
    readSupabaseRows(supabase, 'hr_records', companyId),
  ])

  if (companyResult.error) {
    throw Object.assign(new Error(`Could not read company for backup: ${companyResult.error.message}`), { status: 500 })
  }
  if (membersResult.error) {
    throw Object.assign(new Error(`Could not read company members for backup: ${membersResult.error.message}`), { status: 500 })
  }

  const businessRecords = groupedBusinessRecords()
  for (const row of businessRows) {
    const collection = String(row.collection || '')
    if (!isBusinessCollection(collection)) continue
    const record = normalizeBusinessRecord({
      id: row.id,
      collection,
      companyId: row.company_id,
      payload: row.payload,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }, collection, companyId)
    if (record) businessRecords[collection].push(record)
  }

  const hrRecords = groupedHrRecords()
  for (const row of hrRows) {
    const collection = String(row.collection || '')
    if (!isHrCollection(collection)) continue
    const record = normalizeHrRecord({
      ...safeRecord(row.payload),
      id: row.id,
      companyId: row.company_id,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }, collection, companyId)
    if (record) hrRecords[collection].push(record)
  }

  return {
    schemaVersion: 1,
    product: 'WiseFlow',
    exportedAt: new Date().toISOString(),
    companyId,
    exportedBy: {
      userId: actor.userId,
      email: actor.email,
      role: actor.role,
    },
    company: companyResult.data ? safeRecord(companyResult.data) : null,
    companyMembers: (membersResult.data || []).map(safeRecord),
    tables: {
      clients: clients.map(safeRecord),
      salesOrders: salesOrders.map(safeRecord),
    },
    businessRecords,
    hrRecords,
  }
}

async function exportFromFileFallback(companyId: string, actor: ServerSession): Promise<BackupEnvelope> {
  const businessRecords = groupedBusinessRecords()
  for (const collection of businessCollections) {
    businessRecords[collection] = (await listBusinessRecords(collection, companyId)).map(record => ({
      id: record.id,
      collection: record.collection,
      companyId: record.companyId,
      payload: safeRecord(record.payload),
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    }))
  }

  const hrRecords = groupedHrRecords()
  for (const collection of hrCollections) {
    hrRecords[collection] = await listRecords(collection, companyId)
  }

  return {
    schemaVersion: 1,
    product: 'WiseFlow',
    exportedAt: new Date().toISOString(),
    companyId,
    exportedBy: {
      userId: actor.userId,
      email: actor.email,
      role: actor.role,
    },
    company: { id: companyId },
    companyMembers: [],
    tables: {
      clients: [],
      salesOrders: [],
    },
    businessRecords,
    hrRecords,
  }
}

export async function exportCompanyBackup(companyId: string, actor: ServerSession, ip?: string) {
  const backup = getSupabaseAdmin()
    ? await exportFromSupabase(companyId, actor)
    : await exportFromFileFallback(companyId, actor)
  const summary = summaryForBackup(backup)
  await appendAuditLog({
    action: 'backup.export',
    actor: actorForAudit(actor),
    collection: 'audit-logs',
    targetId: companyId,
    summary: `Exported company backup with ${summary.totalRecords} records.`,
    after: summary,
    companyId,
    ip,
  }).catch(() => undefined)
  return backup
}

function forcedCompanyRow(row: JsonRecord, companyId: string) {
  return {
    ...row,
    id: companyId,
    owner_user_id: null,
    updated_at: new Date().toISOString(),
  }
}

function forceCompanyId(row: JsonRecord, companyId: string) {
  return {
    ...row,
    company_id: companyId,
  }
}

async function replaceSupabaseRows(supabase: SupabaseClient, table: string, companyId: string, rows: JsonRecord[], onConflict = 'id') {
  const { error: deleteError } = await supabase.from(table).delete().eq('company_id', companyId)
  if (deleteError) throw Object.assign(new Error(`Could not clear ${table} before restore: ${deleteError.message}`), { status: 500 })
  if (!rows.length) return
  const { error } = await supabase.from(table).upsert(rows.map(row => forceCompanyId(row, companyId)), { onConflict })
  if (error) throw Object.assign(new Error(`Could not restore ${table}: ${error.message}`), { status: 500 })
}

async function restoreIntoSupabase(companyId: string, backup: BackupEnvelope) {
  const supabase = getSupabaseAdmin()
  if (!supabase) throw Object.assign(new Error('Supabase backup storage is not configured.'), { status: 500 })

  if (backup.company) {
    const { error } = await supabase.from('companies').upsert(forcedCompanyRow(backup.company, companyId), { onConflict: 'id' })
    if (error) throw Object.assign(new Error(`Could not restore company profile: ${error.message}`), { status: 500 })
  }

  const members = backup.companyMembers
    .filter(member => typeof member.email === 'string' && member.email.trim())
    .map(member => ({
      company_id: companyId,
      user_id: null,
      email: String(member.email).trim().toLowerCase(),
      role: typeof member.role === 'string' ? member.role : 'Member',
      permissions: Array.isArray(member.permissions) ? member.permissions : ['dashboard'],
      status: typeof member.status === 'string' ? member.status : 'Pending',
      invited_at: typeof member.invited_at === 'string' ? member.invited_at : new Date().toISOString(),
      joined_at: typeof member.joined_at === 'string' ? member.joined_at : null,
    }))
  if (members.length) {
    const { error } = await supabase.from('company_members').upsert(members, { onConflict: 'company_id,email' })
    if (error) throw Object.assign(new Error(`Could not restore company members: ${error.message}`), { status: 500 })
  }

  await replaceSupabaseRows(supabase, 'clients', companyId, backup.tables.clients)
  await replaceSupabaseRows(supabase, 'sales_orders', companyId, backup.tables.salesOrders)

  const businessRows = businessCollections.flatMap(collection => backup.businessRecords[collection].map(record => ({
    id: record.id,
    collection,
    company_id: companyId,
    payload: {
      ...record.payload,
      id: record.id,
      companyId,
    },
    created_at: record.createdAt,
    updated_at: record.updatedAt,
  })))
  await replaceSupabaseRows(supabase, 'business_records', companyId, businessRows, 'company_id,collection,id')

  const hrRows = hrCollections.flatMap(collection => backup.hrRecords[collection].map(record => ({
    id: record.id,
    collection,
    company_id: companyId,
    payload: {
      ...record,
      id: record.id,
      companyId,
    },
    created_at: record.createdAt,
    updated_at: record.updatedAt,
  })))
  await replaceSupabaseRows(supabase, 'hr_records', companyId, hrRows)
}

async function restoreIntoFileFallback(companyId: string, backup: BackupEnvelope) {
  for (const collection of businessCollections) {
    const payloads = backup.businessRecords[collection].map(record => ({
      ...record.payload,
      id: record.id,
      companyId,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    }))
    await replaceBusinessRecords(collection, companyId, payloads)
  }

  for (const collection of hrCollections) {
    await replaceRecords(collection, backup.hrRecords[collection], companyId)
  }
}

export async function restoreCompanyBackup(input: RestoreInput) {
  const backup = assertBackupEnvelope(input.backup)
  if (backup.companyId !== input.companyId) {
    throw Object.assign(new Error('Backup companyId does not match the active company context.'), { status: 400 })
  }

  const summary = summaryForBackup(backup)
  const warnings = [
    'Restores replace app-managed company records for the selected company.',
    'Provider-managed Supabase PITR remains the preferred disaster recovery path for whole-database rollback.',
  ]

  if (input.dryRun) {
    return { dryRun: true, restored: false, summary, warnings }
  }

  if (input.confirm !== `RESTORE ${input.companyId}`) {
    throw Object.assign(new Error(`Type RESTORE ${input.companyId} to confirm this restore.`), { status: 400 })
  }

  if (getSupabaseAdmin()) {
    await restoreIntoSupabase(input.companyId, backup)
  } else {
    await restoreIntoFileFallback(input.companyId, backup)
  }

  await appendAuditLog({
    action: 'backup.restore',
    actor: actorForAudit(input.actor),
    collection: 'audit-logs',
    targetId: input.companyId,
    summary: `Restored company backup with ${summary.totalRecords} records.`,
    after: summary,
    companyId: input.companyId,
    ip: input.ip,
  }).catch(() => undefined)

  return { dryRun: false, restored: true, summary, warnings }
}

export function backupFilename(companyId: string) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
  const safeCompany = companyId.replace(/[^a-zA-Z0-9._-]+/g, '_') || 'company'
  return `wiseflow-backup-${safeCompany}-${timestamp}.json`
}

export function backupSummary(backup: unknown) {
  return summaryForBackup(assertBackupEnvelope(backup))
}
