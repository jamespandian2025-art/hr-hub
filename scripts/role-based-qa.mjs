import { spawn } from 'node:child_process'
import { createHmac } from 'node:crypto'
import { existsSync } from 'node:fs'
import { mkdir } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

const port = Number(process.env.ROLE_QA_PORT || 3102)
let baseUrl = `http://127.0.0.1:${port}`
const existingDevBaseUrl = process.env.ROLE_QA_BASE_URL || `http://127.0.0.1:${Number(process.env.ROLE_QA_EXISTING_DEV_PORT || 3000)}`
const appRoot = fileURLToPath(new URL('..', import.meta.url))
const nextBin = fileURLToPath(new URL('../node_modules/next/dist/bin/next', import.meta.url))
const hasProductionBuild = existsSync(new URL('../.next/BUILD_ID', import.meta.url))
const authSecret = process.env.AUTH_SESSION_SECRET || process.env.NEXTAUTH_SECRET || process.env.SUPABASE_JWT_SECRET || 'dev-only-change-me'
const companyId = process.env.ROLE_QA_COMPANY_ID || 'role-qa-company'
const requireApiStorageSuccess = process.env.ROLE_QA_REQUIRE_STORAGE === '1'
  || Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY)
const failures = []

const roles = ['Admin', 'Finance', 'HR', 'Employee', 'Team Manager', 'Client']

const pageCases = [
  ['Admin', '/dashboard', 200],
  ['Admin', '/people/clients', 200],
  ['Admin', '/project-management', 200],
  ['Admin', '/accounting/invoices', 200],
  ['Admin', '/accounting/banking', 200],
  ['Admin', '/hr/employees', 200],
  ['Admin', '/hr/payroll', 200],
  ['Admin', '/hr/loan-requests', 200],
  ['Admin', '/employee/dashboard', 200],
  ['Admin', '/client-portal', 200],

  ['Finance', '/dashboard', 200],
  ['Finance', '/accounting/invoices', 200],
  ['Finance', '/accounting/banking', 200],
  ['Finance', '/financials/loan-management', 200],
  ['Finance', '/hr/employees', 307, '/financials/loan-management'],
  ['Finance', '/hr/payroll', 307, '/financials/loan-management'],
  ['Finance', '/hr/loan-requests', 200],
  ['Finance', '/employee/dashboard', 307, '/financials/loan-management'],
  ['Finance', '/client-portal', 307, '/financials/loan-management'],

  ['HR', '/dashboard', 200],
  ['HR', '/hr/overview', 200],
  ['HR', '/hr/employees', 200],
  ['HR', '/hr/leave-requests', 200],
  ['HR', '/hr/payroll', 200],
  ['HR', '/hr/loan-requests', 307, '/hr/overview'],
  ['HR', '/accounting/invoices', 307, '/hr/overview'],
  ['HR', '/accounting/banking', 403],
  ['HR', '/employee/dashboard', 307, '/hr/overview'],
  ['HR', '/client-portal', 307, '/hr/overview'],

  ['Employee', '/employee/dashboard', 200],
  ['Employee', '/employee/payslips', 200],
  ['Employee', '/dashboard', 307, '/employee/dashboard'],
  ['Employee', '/accounting/invoices', 307, '/employee/dashboard'],
  ['Employee', '/accounting/banking', 403],
  ['Employee', '/hr/employees', 307, '/employee/dashboard'],
  ['Employee', '/client-portal', 307, '/employee/dashboard'],

  ['Team Manager', '/employee/dashboard', 200],
  ['Team Manager', '/employee/attendance', 200],
  ['Team Manager', '/dashboard', 200],
  ['Team Manager', '/accounting/invoices', 307, '/employee/dashboard'],
  ['Team Manager', '/accounting/banking', 403],
  ['Team Manager', '/hr/employees', 307, '/employee/dashboard'],
  ['Team Manager', '/client-portal', 307, '/employee/dashboard'],

  ['Client', '/client-portal', 200],
  ['Client', '/dashboard', 307, '/client-portal'],
  ['Client', '/people/clients', 307, '/client-portal'],
  ['Client', '/accounting/invoices', 307, '/client-portal'],
  ['Client', '/accounting/banking', 403],
  ['Client', '/hr/employees', 307, '/client-portal'],
  ['Client', '/employee/dashboard', 307, '/client-portal'],
]

const apiCases = [
  ['signed out business API read is rejected', null, '/api/business-records/clients', { status: 401 }],
  ['Admin general business API is not denied by RBAC', 'Admin', '/api/business-records/clients', { allowedApi: true }],
  ['Finance finance business API is not denied by RBAC', 'Finance', '/api/business-records/accounting-invoices', { allowedApi: true }],
  ['HR cannot read finance business records', 'HR', '/api/business-records/accounting-invoices', { status: 403 }],
  ['Employee cannot read general business records', 'Employee', '/api/business-records/clients', { status: 403 }],
  ['Client cannot read internal business records', 'Client', '/api/business-records/clients', { status: 403 }],
  ['HR employee records API is not denied by RBAC', 'HR', '/api/hr/records/employees', { allowedApi: true }],
  ['Finance employee records API is not denied by RBAC for payroll support', 'Finance', '/api/hr/records/employees', { allowedApi: true }],
  ['Employee cannot read employee directory API', 'Employee', '/api/hr/records/employees', { status: 403 }],
  ['Finance payroll API is not denied by RBAC', 'Finance', '/api/hr/records/payroll-records', { allowedApi: true }],
  ['HR payroll API is not denied by RBAC for payroll generation', 'HR', '/api/hr/records/payroll-records', { allowedApi: true }],
  ['Finance loan request API is not denied by RBAC', 'Finance', '/api/hr/records/loan-requests', { allowedApi: true }],
  ['HR cannot read finance loan request API', 'HR', '/api/hr/records/loan-requests', { status: 403 }],
  ['Admin backup export is not denied by RBAC', 'Admin', '/api/admin/backups', { notStatuses: [401, 403] }],
  ['Finance backup export is denied', 'Finance', '/api/admin/backups', { status: 403 }],
  ['HR backup export is denied', 'HR', '/api/admin/backups', { status: 403 }],
  ['Client backup export is denied', 'Client', '/api/admin/backups', { status: 403 }],
]

function roleSlug(role) {
  return role.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
}

function signSession(role) {
  const slug = roleSlug(role)
  const session = {
    userId: `qa-${slug}`,
    email: `${slug}@qa.wiseflow.local`,
    name: `Role QA ${role}`,
    role,
    employeeId: role === 'Employee' || role === 'Team Manager' ? `qa-${slug}` : undefined,
    issuedAt: Date.now(),
  }
  const payload = Buffer.from(JSON.stringify(session)).toString('base64url')
  const signature = createHmac('sha256', authSecret).update(payload).digest('base64url')
  return `${payload}.${signature}`
}

const sessionCookies = Object.fromEntries(roles.map(role => [role, `wiseflow_session=${signSession(role)}`]))

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

function withQuery(path) {
  const separator = path.includes('?') ? '&' : '?'
  return `${path}${separator}companyId=${encodeURIComponent(companyId)}`
}

async function fetchWithTimeout(path, options = {}, timeoutMs = 10000) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    return await fetch(`${baseUrl}${path}`, {
      redirect: 'manual',
      signal: controller.signal,
      ...options,
      headers: {
        ...(options.headers || {}),
      },
    })
  } finally {
    clearTimeout(timer)
  }
}

async function isServerReady(url) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 1500)
  try {
    const response = await fetch(`${url}/login`, { redirect: 'manual', signal: controller.signal })
    return response.status === 200
  } catch {
    return false
  } finally {
    clearTimeout(timer)
  }
}

async function waitForServer() {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    try {
      const response = await fetchWithTimeout('/login', {}, 1500)
      if (response.status === 200) return
    } catch {
      // Keep waiting for next start.
    }
    await sleep(500)
  }
  throw new Error(`Next server did not become ready at ${baseUrl}`)
}

function recordResult(ok, label, detail) {
  console.log(`${ok ? 'PASS' : 'FAIL'} ${label}${detail ? ` ${detail}` : ''}`)
  if (!ok) failures.push(`${label}${detail ? ` ${detail}` : ''}`)
}

async function checkPage(role, path, expectedStatus, expectedLocation = '') {
  const response = await fetchWithTimeout(path, {
    headers: {
      cookie: sessionCookies[role],
    },
  })
  const location = response.headers.get('location') || ''
  const statusOk = response.status === expectedStatus
  const locationOk = !expectedLocation || location.includes(expectedLocation)
  recordResult(
    statusOk && locationOk,
    `${role} ${path}`,
    `${response.status}${location ? ` -> ${location}` : ''} expected ${expectedStatus}${expectedLocation ? ` -> ${expectedLocation}` : ''}`,
  )
}

async function checkApi(label, role, path, expectation) {
  const headers = {
    'x-wiseflow-company-id': companyId,
  }
  if (role) headers.cookie = sessionCookies[role]
  const response = await fetchWithTimeout(withQuery(path), { headers })
  const effectiveExpectation = expectation.allowedApi
    ? requireApiStorageSuccess
      ? { status: 200 }
      : { notStatuses: [401, 403] }
    : expectation
  const statusOk = Array.isArray(effectiveExpectation.notStatuses)
    ? !effectiveExpectation.notStatuses.includes(response.status) && response.status < 500
    : response.status === effectiveExpectation.status
  const expected = Array.isArray(effectiveExpectation.notStatuses)
    ? `not ${effectiveExpectation.notStatuses.join('/')} and <500`
    : String(effectiveExpectation.status)
  recordResult(statusOk, label, `${response.status} expected ${expected}`)
}

await mkdir(new URL('../.data/role-qa-business', import.meta.url), { recursive: true })
await mkdir(new URL('../.data/role-qa-hrhub', import.meta.url), { recursive: true })
await mkdir(new URL('../.data/role-qa-rate-limits', import.meta.url), { recursive: true })

let server = null

if (!hasProductionBuild && await isServerReady(existingDevBaseUrl)) {
  baseUrl = existingDevBaseUrl
  console.log(`Using existing Next dev server at ${baseUrl}`)
} else {
  server = spawn(process.execPath, [nextBin, hasProductionBuild ? 'start' : 'dev', '-p', String(port)], {
    cwd: appRoot,
    stdio: ['ignore', 'pipe', 'pipe'],
    env: {
      ...process.env,
      PORT: String(port),
      AUTH_SESSION_SECRET: authSecret,
      WISEFLOW_ALLOW_LOCAL_TENANT_STORE: '1',
      BUSINESS_DATA_DIR: fileURLToPath(new URL('../.data/role-qa-business', import.meta.url)),
      HRHUB_DATA_DIR: fileURLToPath(new URL('../.data/role-qa-hrhub', import.meta.url)),
      RATE_LIMIT_DATA_DIR: fileURLToPath(new URL('../.data/role-qa-rate-limits', import.meta.url)),
    },
  })

  server.stdout.on('data', chunk => process.stdout.write(chunk))
  server.stderr.on('data', chunk => process.stderr.write(chunk))
}

try {
  await waitForServer()
  if (!requireApiStorageSuccess) {
    console.log('INFO Allowed API cases are checking RBAC only. Set ROLE_QA_REQUIRE_STORAGE=1 with production Supabase envs to require 200 responses.')
  }
  for (const [role, path, expectedStatus, expectedLocation] of pageCases) {
    await checkPage(role, path, expectedStatus, expectedLocation)
  }
  for (const [label, role, path, expectation] of apiCases) {
    await checkApi(label, role, path, expectation)
  }
} finally {
  if (server) server.kill('SIGTERM')
}

if (failures.length) {
  console.error('\nRole-based QA failures:')
  failures.forEach(failure => console.error(`- ${failure}`))
  process.exit(1)
}

console.log('\nRole-based QA passed.')
