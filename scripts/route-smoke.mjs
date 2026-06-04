import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const port = Number(process.env.SMOKE_PORT || 3100)
let baseUrl = `http://127.0.0.1:${port}`
const existingDevBaseUrl = process.env.SMOKE_BASE_URL || `http://127.0.0.1:${Number(process.env.SMOKE_EXISTING_DEV_PORT || 3000)}`
const nextBin = fileURLToPath(new URL('../node_modules/next/dist/bin/next', import.meta.url))
const appRoot = fileURLToPath(new URL('..', import.meta.url))
const hasProductionBuild = existsSync(new URL('../.next/BUILD_ID', import.meta.url))
const publicRoutes = ['/', '/why-wiseflow', '/privacy', '/terms', '/refund-policy', '/security', '/login', '/signup', '/account-recovery', '/employee/login']
const accountRoutes = [
  '/account/my-account',
  '/account/account-security',
  '/account/applications',
  '/account/users',
  '/account/guests',
  '/account/user-groups',
  '/account/general-info',
  '/account/offices',
  '/account/admin-roles',
  '/account/customizations',
  '/account/system-settings',
]
const protectedRoutes = ['/dashboard', '/accounting', '/accounting/invoices', '/hr/employees', '/employee/dashboard', '/people/clients', '/project-management', '/warehouse', '/workflows/my-workflows', ...accountRoutes]
const failures = []

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function fetchWithTimeout(path, timeoutMs = 8000) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    return await fetch(`${baseUrl}${path}`, { redirect: 'manual', signal: controller.signal })
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
  for (let attempt = 0; attempt < 40; attempt += 1) {
    try {
      const response = await fetchWithTimeout('/login', 1500)
      if (response.status === 200) return
    } catch {
      // Keep waiting.
    }
    await sleep(500)
  }
  throw new Error(`Next server did not become ready at ${baseUrl}`)
}

async function checkRoute(path, expectedStatus, expectedLocationPart = '') {
  try {
    const response = await fetchWithTimeout(path)
    const location = response.headers.get('location') || ''
    const ok = response.status === expectedStatus && (!expectedLocationPart || location.includes(expectedLocationPart))
    console.log(`${ok ? 'PASS' : 'FAIL'} ${path} ${response.status}${location ? ` -> ${location}` : ''}`)
    if (!ok) failures.push(`${path}: expected ${expectedStatus}${expectedLocationPart ? ` with ${expectedLocationPart}` : ''}, got ${response.status} ${location}`)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.log(`FAIL ${path} ${message}`)
    failures.push(`${path}: ${message}`)
  }
}

let server = null

if (!hasProductionBuild && await isServerReady(existingDevBaseUrl)) {
  baseUrl = existingDevBaseUrl
  console.log(`Using existing Next dev server at ${baseUrl}`)
} else {
  server = spawn(process.execPath, [nextBin, hasProductionBuild ? 'start' : 'dev', '-p', String(port)], {
    cwd: appRoot,
    stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env, PORT: String(port) },
  })

  server.stdout.on('data', chunk => process.stdout.write(chunk))
  server.stderr.on('data', chunk => process.stderr.write(chunk))
}

try {
  await waitForServer()
  for (const route of publicRoutes) await checkRoute(route, 200)
  for (const route of protectedRoutes) await checkRoute(route, 307, route.startsWith('/employee') ? '/employee/login' : '/login')
} finally {
  if (server) server.kill('SIGTERM')
}

if (failures.length) {
  console.error('\nRoute smoke failures:')
  failures.forEach(failure => console.error(`- ${failure}`))
  process.exit(1)
}

console.log('\nRoute smoke passed.')
