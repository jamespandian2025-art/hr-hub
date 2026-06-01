import { randomUUID } from 'node:crypto'
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { requireCsrf } from '@/lib/security/requestGuards'
import { enforceRateLimit, rateLimitPolicies } from '@/lib/security/rateLimit'
import { requestIp, requireVerifiedSession } from '@/lib/security/session'
import { assertCompanyAccess, companyIdFromRequest } from '@/lib/tenant/serverStore'
import { appendAuditLog } from '@/lib/hrms/serverStore'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type UploadMetadata = {
  objectKey: string
  companyId: string
  name: string
  mimeType: string
  sizeBytes: number
  uploadedBy: string
  uploadedAt: string
}

const maxUploadBytes = 10 * 1024 * 1024
const uploadDir = path.join(process.cwd(), '.data', 'uploads')
const metadataFile = path.join(uploadDir, 'metadata.json')
const bucket = process.env.WISEFLOW_UPLOAD_BUCKET || 'wiseflow-uploads'
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
let supabaseAdmin: SupabaseClient | null = null

const allowedMimePrefixes = ['image/', 'text/', 'audio/', 'video/']
const allowedMimeTypes = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/zip',
  'application/octet-stream',
])
const allowedExtensions = new Set(['pdf', 'doc', 'docx', 'xls', 'xlsx', 'csv', 'txt', 'png', 'jpg', 'jpeg', 'gif', 'webp', 'zip', 'webm', 'mp3', 'wav', 'm4a', 'mp4', 'mov'])

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

function jsonError(error: unknown) {
  const status = typeof error === 'object' && error && 'status' in error ? Number(error.status) : 500
  const message = error instanceof Error ? error.message : 'Unexpected upload error.'
  return Response.json({ ok: false, error: message }, { status: Number.isFinite(status) ? status : 500 })
}

function safeName(value: string) {
  return value.replace(/[^\w.\- ]+/g, '_').replace(/\s+/g, '-').slice(0, 120) || 'upload.bin'
}

function extension(value: string) {
  return value.includes('.') ? value.split('.').pop()?.toLowerCase() || '' : ''
}

function assertAllowedFile(file: File) {
  const mimeType = file.type || 'application/octet-stream'
  const ext = extension(file.name)
  if (file.size <= 0) throw Object.assign(new Error('Uploaded file is empty.'), { status: 400 })
  if (file.size > maxUploadBytes) throw Object.assign(new Error('Uploaded file must be 10MB or smaller.'), { status: 413 })
  const allowedMime = allowedMimePrefixes.some(prefix => mimeType.startsWith(prefix)) || allowedMimeTypes.has(mimeType)
  if (!allowedMime || !allowedExtensions.has(ext)) {
    throw Object.assign(new Error('File type is not allowed.'), { status: 400 })
  }
}

async function ensureUploadDir() {
  await mkdir(uploadDir, { recursive: true })
}

async function readMetadata() {
  await ensureUploadDir()
  try {
    const parsed = JSON.parse(await readFile(metadataFile, 'utf8'))
    return Array.isArray(parsed) ? parsed as UploadMetadata[] : []
  } catch (error) {
    const code = typeof error === 'object' && error && 'code' in error ? String(error.code) : ''
    if (code === 'ENOENT') return []
    throw error
  }
}

async function writeMetadata(records: UploadMetadata[]) {
  await ensureUploadDir()
  const temp = `${metadataFile}.${process.pid}.${Date.now()}.tmp`
  await writeFile(temp, `${JSON.stringify(records.slice(-5000), null, 2)}\n`, 'utf8')
  await rename(temp, metadataFile)
}

function localFilePath(objectKey: string) {
  const resolvedRoot = path.resolve(/*turbopackIgnore: true*/ uploadDir)
  const resolvedFile = path.resolve(/*turbopackIgnore: true*/ uploadDir, objectKey)
  if (!resolvedFile.startsWith(`${resolvedRoot}${path.sep}`)) {
    throw Object.assign(new Error('Invalid upload key.'), { status: 400 })
  }
  return resolvedFile
}

function uploadUrl(request: Request, companyId: string, objectKey: string) {
  const origin = new URL(request.url).origin
  return `${origin}/api/uploads?companyId=${encodeURIComponent(companyId)}&key=${encodeURIComponent(objectKey)}`
}

function assertKeyCompany(objectKey: string, companyId: string) {
  if (!objectKey || !objectKey.startsWith(`${companyId}/`)) {
    throw Object.assign(new Error('Upload does not belong to the active company.'), { status: 403 })
  }
}

function uploadCompanyIdFromRequest(request: Request, actor: { companyId?: string }) {
  const explicitCompanyId = request.headers.get('x-wiseflow-company-id')?.trim()
    || new URL(request.url).searchParams.get('companyId')?.trim()
    || ''
  return explicitCompanyId || actor.companyId || companyIdFromRequest(request)
}

async function assertUploadCompanyAccess(actor: Awaited<ReturnType<typeof requireVerifiedSession>>, companyId: string) {
  if (actor.companyId && actor.companyId === companyId && (actor.role === 'Employee' || actor.role === 'Team Manager')) {
    return
  }
  await assertCompanyAccess(actor, companyId)
}

export async function POST(request: Request) {
  try {
    requireCsrf(request)
    const actor = await requireVerifiedSession(request)
    const companyId = uploadCompanyIdFromRequest(request, actor)
    await assertUploadCompanyAccess(actor, companyId)
    await enforceRateLimit(request, rateLimitPolicies.fileUpload, actor.userId, actor.email, companyId)

    const formData = await request.formData()
    const file = formData.get('file')
    const purpose = typeof formData.get('purpose') === 'string' ? String(formData.get('purpose')).slice(0, 80) : 'general'
    if (!(file instanceof File)) {
      return Response.json({ ok: false, error: 'Request must include a file field.' }, { status: 400 })
    }
    assertAllowedFile(file)

    const objectKey = `${companyId}/${purpose}/${new Date().toISOString().slice(0, 10)}/${randomUUID()}-${safeName(file.name)}`
    const bytes = Buffer.from(await file.arrayBuffer())
    const mimeType = file.type || 'application/octet-stream'
    const supabase = getSupabaseAdmin()

    if (supabase) {
      const { error } = await supabase.storage.from(bucket).upload(objectKey, bytes, {
        contentType: mimeType,
        upsert: false,
      })
      if (error) throw Object.assign(new Error(`Could not upload file to object storage: ${error.message}`), { status: 500 })
    } else {
      const targetPath = localFilePath(objectKey)
      await mkdir(path.dirname(targetPath), { recursive: true })
      await writeFile(targetPath, bytes)
      const metadata = await readMetadata()
      await writeMetadata([...metadata.filter(item => item.objectKey !== objectKey), {
        objectKey,
        companyId,
        name: file.name,
        mimeType,
        sizeBytes: file.size,
        uploadedBy: actor.userId,
        uploadedAt: new Date().toISOString(),
      }])
    }

    await appendAuditLog({
      action: 'file.upload',
      actor: { id: actor.userId, email: actor.email, name: actor.name || actor.email || 'System User', role: actor.role },
      collection: 'audit-logs',
      targetId: objectKey,
      summary: `Uploaded ${file.name}.`,
      after: { objectKey, name: file.name, mimeType, sizeBytes: file.size, purpose },
      companyId,
      ip: requestIp(request),
    }).catch(() => undefined)

    return Response.json({
      ok: true,
      file: {
        objectKey,
        name: file.name,
        mimeType,
        sizeBytes: file.size,
        url: uploadUrl(request, companyId, objectKey),
        storageProvider: supabase ? 'supabase' : 'local',
      },
    }, { status: 201 })
  } catch (error) {
    return jsonError(error)
  }
}

export async function GET(request: Request) {
  try {
    const actor = await requireVerifiedSession(request)
    const companyId = uploadCompanyIdFromRequest(request, actor)
    await assertUploadCompanyAccess(actor, companyId)
    const objectKey = new URL(request.url).searchParams.get('key') || ''
    assertKeyCompany(objectKey, companyId)

    const supabase = getSupabaseAdmin()
    if (supabase) {
      const { data, error } = await supabase.storage.from(bucket).createSignedUrl(objectKey, 60)
      if (error || !data?.signedUrl) throw Object.assign(new Error(error?.message || 'Could not create signed upload URL.'), { status: 404 })
      return Response.redirect(data.signedUrl, 302)
    }

    const metadata = (await readMetadata()).find(item => item.objectKey === objectKey)
    if (!metadata) return Response.json({ ok: false, error: 'Upload not found.' }, { status: 404 })
    const bytes = await readFile(localFilePath(objectKey))
    return new Response(bytes, {
      headers: {
        'Cache-Control': 'private, max-age=60',
        'Content-Type': metadata.mimeType || 'application/octet-stream',
        'Content-Disposition': `inline; filename="${safeName(metadata.name)}"`,
      },
    })
  } catch (error) {
    return jsonError(error)
  }
}
