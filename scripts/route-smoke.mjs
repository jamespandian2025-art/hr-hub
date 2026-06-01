import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const port = Number(process.env.SMOKE_PORT || 3100)
const baseUrl = `http://127.0.0.1:${port}`
const nextBin = fileURLToPath(new URL('../node_modules/next/dist/bin/next', import.meta.url))
const publicRoutes = ['/', '/why-wiseflow', '/login', '/signup', '/account-recovery', '/employee/login']
const protectedRoutes = ['/dashboard', '/accounting', '/accounting/invoices', '/hr/employees', '/employee/dashboard', '/people/clients', '/project-management', '/warehouse', '/workflows/my-workflows']
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

const server = spawn(process.execPath, [nextBin, 'start', '-p', String(port)], {
  cwd: fileURLToPath(new URL('..', import.meta.url)),
  stdio: ['ignore', 'pipe', 'pipe'],
  env: { ...process.env, PORT: String(port) },
})

server.stdout.on('data', chunk => process.stdout.write(chunk))
server.stderr.on('data', chunk => process.stderr.write(chunk))

try {
  await waitForServer()
  for (const route of publicRoutes) await checkRoute(route, 200)
  for (const route of protectedRoutes) await checkRoute(route, 307, route.startsWith('/employee') ? '/employee/login' : '/login')
} finally {
  server.kill('SIGTERM')
}

if (failures.length) {
  console.error('\nRoute smoke failures:')
  failures.forEach(failure => console.error(`- ${failure}`))
  process.exit(1)
}

console.log('\nRoute smoke passed.')
