import { appendAuditLog, listRecords, updateRecord } from '@/lib/hrms/serverStore'
import { requireCsrf } from '@/lib/security/requestGuards'
import { requestIp, sealSession, sessionCookieHeader } from '@/lib/security/session'
import { createPortalPasswordFields, verifyPortalPassword } from '@/lib/security/password'
import { validateObject } from '@/lib/security/validation'
import { checkRateLimit, hitRateLimit, rateLimitIdentifier, rateLimitPolicies, resetRateLimit } from '@/lib/security/rateLimit'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type EmployeeRecord = {
  id: string
  employeeId?: string
  firstName?: string
  middleName?: string
  lastName?: string
  email?: string
  portalEmail?: string
  portalPasswordHash?: string
  portalPasswordSalt?: string
  portalPasswordAlgorithm?: 'pbkdf2-sha256'
  portalPasswordUpdatedAt?: string
  /** Legacy records only. New records store portal password hashes instead. */
  portalPassword?: string
  employmentStatus?: string
  jobTitle?: string
  employeeRole?: string
  employeeType?: string
  companyId?: string
  company_id?: string
}

function text(value: unknown) {
  if (value === null || value === undefined) return ''
  if (typeof value === 'string') return value.trim().toLowerCase()
  if (typeof value === 'number' || typeof value === 'boolean') return String(value).trim().toLowerCase()
  return ''
}

function compact(value: unknown) {
  return text(value).replace(/[^a-z0-9]/g, '')
}

function fullName(employee: EmployeeRecord) {
  return [employee.firstName, employee.middleName, employee.lastName].filter(Boolean).join(' ').trim()
}

function canUseEmployeePortal(employee: EmployeeRecord) {
  return !['archived', 'deleted', 'inactive', 'terminated', 'resigned'].includes(text(employee.employmentStatus))
}

function generatedPortalEmail(employee: EmployeeRecord) {
  const namePart = [text(employee.firstName), text(employee.lastName)].filter(Boolean).join('.') || 'employee'
  const idPart = text(employee.employeeId || employee.id) || 'new'
  return `${namePart}.${idPart}@wiseflow.employee`
}

function loginEmailMatches(employee: EmployeeRecord, loginEmail: string) {
  const normalizedEmail = text(loginEmail)
  const localPart = compact(normalizedEmail.split('@')[0])
  const exactMatches = [employee.portalEmail, employee.email, generatedPortalEmail(employee)].some(value => text(value) === normalizedEmail)
  if (exactMatches) return true
  return [employee.employeeId, employee.id]
    .map(compact)
    .filter(value => value.length >= 4)
    .some(value => localPart.includes(value))
}

function isEmployeeManager(employee: EmployeeRecord) {
  const haystack = [employee.employeeRole, employee.employeeType, employee.jobTitle].filter(Boolean).join(' ').toLowerCase()
  return /\b(team\s*manager|department\s*manager|hr\s*manager|manager|team\s*lead|team\s*leader|lead|supervisor|head|director)\b/.test(haystack)
}

export async function POST(request: Request) {
  try {
    requireCsrf(request)
  } catch (error) {
    const status = typeof error === 'object' && error && 'status' in error ? Number(error.status) : 403
    const message = error instanceof Error ? error.message : 'Request blocked.'
    return Response.json({ ok: false, error: message }, { status: Number.isFinite(status) ? status : 403 })
  }

  let payload: Record<string, unknown>
  try {
    payload = await request.json()
  } catch {
    return Response.json({ ok: false, error: 'Invalid request body.' }, { status: 400 })
  }

  const validation = validateObject(payload, {
    email: { required: true, type: 'string', maxLength: 200 },
    password: { required: true, type: 'string', maxLength: 200 },
  })
  if (!validation.ok) return Response.json({ ok: false, error: validation.errors[0] }, { status: 400 })

  const email = text(validation.value.email)
  const enteredPassword = String(validation.value.password || '')
  const limiterId = rateLimitIdentifier(request, email)
  const limiterCheck = await checkRateLimit(rateLimitPolicies.employeeLogin, limiterId)
  if (!limiterCheck.allowed) {
    return Response.json({
      ok: false,
      blocked: true,
      retryAfterSeconds: limiterCheck.retryAfterSeconds,
      error: `Too many employee login attempts. Try again in ${limiterCheck.retryAfterSeconds || 900} seconds.`,
    }, { status: 429 })
  }

  const employees = (await listRecords('employees') as EmployeeRecord[]).filter(canUseEmployeePortal)
  const candidates = employees.filter(employee => loginEmailMatches(employee, email))
  let employee: EmployeeRecord | undefined
  for (const item of candidates) {
    if (await verifyPortalPassword(item, enteredPassword)) {
      employee = item
      break
    }
  }

  if (!employee) {
    const limiterResult = await hitRateLimit(rateLimitPolicies.employeeLogin, limiterId)
    await appendAuditLog({
      action: 'login.failure',
      actor: { name: 'Anonymous Employee', role: 'Employee' },
      collection: 'audit-logs',
      targetId: email,
      summary: 'Failed employee portal login.',
      ip: requestIp(request),
    }).catch(() => undefined)
    return Response.json({
      ok: false,
      blocked: limiterResult.blocked,
      retryAfterSeconds: limiterResult.retryAfterSeconds,
      error: limiterResult.blocked ? `Too many employee login attempts. Try again in ${limiterResult.retryAfterSeconds || 900} seconds.` : 'Email or password is incorrect.',
    }, { status: limiterResult.blocked ? 429 : 401 })
  }

  await resetRateLimit(rateLimitPolicies.employeeLogin, limiterId)

  if (employee.portalPassword && !employee.portalPasswordHash) {
    const migratedFields = await createPortalPasswordFields(enteredPassword)
    await updateRecord('employees', employee.id, {
      ...migratedFields,
      portalPassword: '',
    }, { id: 'employee-portal-login', name: 'Employee Portal', role: 'Admin' }).catch(() => undefined)
  }

  const role = isEmployeeManager(employee) ? 'Team Manager' : 'Employee'
  const name = fullName(employee) || employee.email || email
  const companyId = employee.companyId || employee.company_id
  const cookieValue = await sealSession({
    userId: employee.id || employee.employeeId || email,
    employeeId: employee.employeeId || employee.id,
    email: employee.portalEmail || employee.email || email,
    name,
    role,
    provider: 'email',
    companyId,
  })

  await appendAuditLog({
    action: 'login.success',
    actor: { id: employee.id || employee.employeeId, name, role },
    collection: 'audit-logs',
    targetId: employee.id || employee.employeeId,
    summary: 'Employee portal login succeeded.',
    ip: requestIp(request),
  }).catch(() => undefined)

  return Response.json({
    ok: true,
    employee: {
      id: employee.id,
      employeeId: employee.employeeId,
      email: employee.email,
      portalEmail: employee.portalEmail || generatedPortalEmail(employee),
      firstName: employee.firstName,
      middleName: employee.middleName,
      lastName: employee.lastName,
      employmentStatus: employee.employmentStatus,
      jobTitle: employee.jobTitle,
      companyId,
    },
    account: {
      userId: employee.id || employee.employeeId || email,
      employeeId: employee.employeeId || employee.id,
      email: employee.portalEmail || employee.email || email,
      fullName: name,
      role,
      companyId,
    },
    ip: requestIp(request),
  }, { headers: { 'Set-Cookie': sessionCookieHeader(cookieValue) } })
}
