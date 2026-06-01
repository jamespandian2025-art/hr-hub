import { spawn } from 'node:child_process'
import { createHmac } from 'node:crypto'
import { mkdir, rm, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { createServer } from 'node:http'
import path from 'node:path'
import { Readable } from 'node:stream'
import { fileURLToPath } from 'node:url'

const appRoot = fileURLToPath(new URL('..', import.meta.url))
const nextBin = fileURLToPath(new URL('../node_modules/next/dist/bin/next', import.meta.url))
const port = Number(process.env.MANUAL_QA_PORT || 3106)
const baseUrl = `http://127.0.0.1:${port}`
const proxyPort = Number(process.env.MANUAL_QA_PROXY_PORT || port + 100)
const proxyBaseUrl = `http://127.0.0.1:${proxyPort}`
const authSecret = process.env.AUTH_SESSION_SECRET || 'manual-browser-qa-session-secret'
const outputRoot = path.join(appRoot, '.data', 'manual-browser-qa')
const runId = new Date().toISOString().replace(/[:.]/g, '-')
const outputDir = path.join(outputRoot, runId)
const chromeUserDataDir = path.join(appRoot, '.data', 'manual-browser-qa-chrome')
const chromeDebugPort = Number(process.env.MANUAL_QA_CHROME_PORT || 9239)
const failures = []
const warnings = []
let activeSessionCookie = ''

const viewports = [
  { id: 'desktop', width: 1440, height: 900, mobile: false },
  { id: 'tablet', width: 768, height: 1024, mobile: false },
  { id: 'mobile', width: 390, height: 844, mobile: true },
]

const routes = [
  { id: 'dashboard', path: '/dashboard', role: 'Admin', title: 'Dashboard' },
  { id: 'sales', path: '/sales', role: 'Admin', title: 'Sales' },
  { id: 'clients', path: '/people/clients', role: 'Admin', title: 'Client Database' },
  { id: 'accounting-overview', path: '/accounting', role: 'Admin', title: 'Accounting Overview' },
  { id: 'accounting-invoices', path: '/accounting/invoices', role: 'Admin', title: 'Accounting Invoices' },
  { id: 'accounting-banking', path: '/accounting/banking', role: 'Admin', title: 'Accounting Banking' },
  { id: 'hr-employees', path: '/hr/employees', role: 'Admin', title: 'HR Employees' },
  { id: 'hr-payroll', path: '/hr/payroll', role: 'Admin', title: 'HR Payroll' },
  { id: 'procurement', path: '/procurement', role: 'Admin', title: 'Procurement' },
  { id: 'warehouse', path: '/warehouse', role: 'Admin', title: 'Warehouse' },
  { id: 'project-management', path: '/project-management', role: 'Admin', title: 'Project Management' },
  { id: 'workflows', path: '/workflows/all-workflows', role: 'Admin', title: 'Workflows' },
  { id: 'datasets', path: '/datasets', role: 'Admin', title: 'Datasets' },
  { id: 'employee-dashboard', path: '/employee/dashboard', role: 'Employee', title: 'Employee Dashboard' },
  { id: 'employee-payslips', path: '/employee/payslips', role: 'Employee', title: 'Employee Payslips' },
  { id: 'client-portal', path: '/client-portal', role: 'Client', title: 'Client Portal' },
]

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

function chromePath() {
  const candidates = [
    process.env.CHROME_PATH,
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    path.join(process.env.LOCALAPPDATA || '', 'Google\\Chrome\\Application\\chrome.exe'),
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    path.join(process.env.LOCALAPPDATA || '', 'Microsoft\\Edge\\Application\\msedge.exe'),
  ].filter(Boolean)
  return candidates.find(candidate => existsSync(candidate))
}

function signSession(role) {
  const slug = role.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
  const session = {
    userId: `manual-qa-${slug}`,
    email: `${slug}@manual-qa.wiseflow.local`,
    name: `Manual QA ${role}`,
    role,
    employeeId: role === 'Employee' || role === 'Team Manager' ? `manual-qa-${slug}` : undefined,
    issuedAt: Date.now(),
  }
  const payload = Buffer.from(JSON.stringify(session)).toString('base64url')
  const signature = createHmac('sha256', authSecret).update(payload).digest('base64url')
  return `${payload}.${signature}`
}

function accountForRole(role) {
  const slug = role.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
  return {
    userId: `manual-qa-${slug}`,
    id: `manual-qa-${slug}`,
    email: `${slug}@manual-qa.wiseflow.local`,
    name: `Manual QA ${role}`,
    fullName: `Manual QA ${role}`,
    provider: 'manual-qa',
    role,
    company: 'WiseFlow Manual QA',
  }
}

async function waitForServer() {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    try {
      const response = await fetch(`${baseUrl}/login`, { redirect: 'manual', signal: AbortSignal.timeout(1500) })
      if (response.status === 200) return
    } catch {
      // Keep waiting.
    }
    await sleep(500)
  }
  throw new Error(`Next server did not become ready at ${baseUrl}`)
}

async function startQaProxy() {
  const server = createServer(async (request, response) => {
    try {
      const targetUrl = new URL(request.url || '/', baseUrl)
      const headers = new Headers()
      Object.entries(request.headers).forEach(([name, value]) => {
      if (!value || name.toLowerCase() === 'host') return
      const lower = name.toLowerCase()
      if (lower === 'origin') {
        headers.set(name, baseUrl)
        return
      }
      if (lower === 'referer') {
        const joined = Array.isArray(value) ? value.join(', ') : value
        headers.set(name, joined.replaceAll(proxyBaseUrl, baseUrl))
        return
      }
      if (Array.isArray(value)) headers.set(name, value.join(', '))
      else headers.set(name, value)
    })
      if (activeSessionCookie) {
        headers.set('cookie', activeSessionCookie)
        headers.set('x-wiseflow-qa-session', activeSessionCookie.replace(/^wiseflow_session=/, ''))
      }

      const upstream = await fetch(targetUrl, {
        method: request.method,
        headers,
        redirect: 'manual',
        body: request.method === 'GET' || request.method === 'HEAD' ? undefined : request,
        duplex: request.method === 'GET' || request.method === 'HEAD' ? undefined : 'half',
      })

      response.statusCode = upstream.status
      upstream.headers.forEach((value, name) => {
        const lower = name.toLowerCase()
        if (['content-encoding', 'content-length', 'transfer-encoding'].includes(lower)) return
        if (lower === 'location') {
          response.setHeader(name, value.replace(baseUrl, proxyBaseUrl).replace(`http://localhost:${port}`, proxyBaseUrl))
          return
        }
        response.setHeader(name, value)
      })

      if (upstream.body) Readable.fromWeb(upstream.body).pipe(response)
      else response.end()
    } catch (error) {
      response.statusCode = 502
      response.setHeader('Content-Type', 'text/plain; charset=utf-8')
      response.end(error instanceof Error ? error.message : String(error))
    }
  })

  await new Promise(resolve => server.listen(proxyPort, '127.0.0.1', resolve))
  return server
}

async function waitForChrome() {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    try {
      const response = await fetch(`http://127.0.0.1:${chromeDebugPort}/json/version`, { signal: AbortSignal.timeout(1500) })
      if (response.ok) return
    } catch {
      // Keep waiting.
    }
    await sleep(300)
  }
  throw new Error('Chrome debugging port did not become ready.')
}

async function newCdpTarget() {
  const response = await fetch(`http://127.0.0.1:${chromeDebugPort}/json/new?about:blank`, { method: 'PUT' })
  if (!response.ok) throw new Error(`Could not create Chrome target: ${response.status}`)
  return response.json()
}

async function closeCdpTarget(targetId) {
  if (!targetId) return
  await fetch(`http://127.0.0.1:${chromeDebugPort}/json/close/${encodeURIComponent(targetId)}`).catch(() => undefined)
}

function createCdpClient(wsUrl) {
  const ws = new WebSocket(wsUrl)
  let id = 0
  const pending = new Map()
  const listeners = new Map()

  ws.addEventListener('message', event => {
    const message = JSON.parse(event.data)
    if (message.id && pending.has(message.id)) {
      const { resolve, reject } = pending.get(message.id)
      pending.delete(message.id)
      if (message.error) reject(new Error(message.error.message || JSON.stringify(message.error)))
      else resolve(message.result || {})
      return
    }
    if (message.method && listeners.has(message.method)) {
      for (const listener of listeners.get(message.method)) listener(message.params || {})
    }
  })

  function on(method, listener) {
    if (!listeners.has(method)) listeners.set(method, new Set())
    listeners.get(method).add(listener)
    return () => listeners.get(method)?.delete(listener)
  }

  async function ready() {
    if (ws.readyState === WebSocket.OPEN) return
    await new Promise((resolve, reject) => {
      ws.addEventListener('open', resolve, { once: true })
      ws.addEventListener('error', reject, { once: true })
    })
  }

  function send(method, params = {}) {
    const commandId = ++id
    const payload = JSON.stringify({ id: commandId, method, params })
    return new Promise((resolve, reject) => {
      pending.set(commandId, { resolve, reject })
      ws.send(payload)
    })
  }

  function close() {
    ws.close()
  }

  return { on, ready, send, close }
}

async function waitForLoad(client, action) {
  let loaded = false
  const off = client.on('Page.loadEventFired', () => { loaded = true })
  await action()
  const startedAt = Date.now()
  while (!loaded && Date.now() - startedAt < 15000) await sleep(100)
  off()
  await sleep(900)
}

function resultValue(evaluateResult) {
  return evaluateResult.result?.value
}

async function inspectPage(client, route, viewport) {
  const consoleErrors = []
  const exceptions = []
  const failedRequests = []
  const httpErrors = []
  const offLog = client.on('Log.entryAdded', params => {
    if (params.entry?.level === 'error') consoleErrors.push(params.entry.text)
  })
  const offException = client.on('Runtime.exceptionThrown', params => {
    exceptions.push(params.exceptionDetails?.text || params.exceptionDetails?.exception?.description || 'Runtime exception')
  })
  const offFailed = client.on('Network.loadingFailed', params => {
    if (params.errorText && !/net::ERR_ABORTED/.test(params.errorText)) failedRequests.push(params.errorText)
  })
  const offResponse = client.on('Network.responseReceived', params => {
    const response = params.response || {}
    if (Number(response.status) >= 400) {
      httpErrors.push({
        status: response.status,
        url: response.url,
      })
    }
  })
  activeSessionCookie = `wiseflow_session=${signSession(route.role)}`

  await client.send('Emulation.setDeviceMetricsOverride', {
    width: viewport.width,
    height: viewport.height,
    deviceScaleFactor: viewport.mobile ? 2 : 1,
    mobile: viewport.mobile,
  })
  await client.send('Storage.clearDataForOrigin', {
    origin: proxyBaseUrl,
    storageTypes: 'local_storage',
  }).catch(() => undefined)
  await waitForLoad(client, () => client.send('Page.navigate', { url: `${proxyBaseUrl}/login` }))
  const account = accountForRole(route.role)
  await client.send('Runtime.evaluate', {
    expression: `(() => {
      const account = ${JSON.stringify(account)};
      window.localStorage.setItem('flowsys-auth-session', JSON.stringify(account));
      window.localStorage.setItem('flowsys-account', JSON.stringify(account));
      window.localStorage.removeItem('flowsys-auth-logged-out');
    })()`,
  })
  await waitForLoad(client, () => client.send('Page.navigate', { url: `${proxyBaseUrl}${route.path}` }))

  const inspection = resultValue(await client.send('Runtime.evaluate', {
    returnByValue: true,
    expression: `(() => {
      const doc = document.documentElement;
      const body = document.body;
      const visible = element => {
        const rect = element.getBoundingClientRect();
        const style = getComputedStyle(element);
        return rect.width > 0 && rect.height > 0 && style.visibility !== 'hidden' && style.display !== 'none';
      };
      const text = body?.innerText || '';
      const horizontalOverflow = Math.max(doc.scrollWidth, body?.scrollWidth || 0) - window.innerWidth;
      const clippedText = Array.from(document.querySelectorAll('button, a, [role="button"], [role="tab"], th, td, label'))
        .filter(visible)
        .filter(element => element.scrollWidth > element.clientWidth + 8 && element.clientWidth > 0)
        .slice(0, 8)
        .map(element => ({
          tag: element.tagName.toLowerCase(),
          text: (element.innerText || element.textContent || '').trim().slice(0, 80),
          clientWidth: element.clientWidth,
          scrollWidth: element.scrollWidth,
        }));
      const fixedOverflow = Array.from(document.querySelectorAll('*'))
        .filter(visible)
        .filter(element => {
          const style = getComputedStyle(element);
          if (style.position !== 'fixed' && style.position !== 'sticky') return false;
          const rect = element.getBoundingClientRect();
          const intersectsViewport = rect.right > 2 && rect.left < window.innerWidth - 2;
          if (!intersectsViewport) return false;
          return rect.left < -2 || rect.right > window.innerWidth + 2;
        })
        .slice(0, 8)
        .map(element => ({
          tag: element.tagName.toLowerCase(),
          text: (element.innerText || element.textContent || '').trim().slice(0, 80),
        }));
      return {
        url: location.href,
        title: document.title,
        heading: document.querySelector('h1')?.innerText || '',
        bodyTextSample: text.slice(0, 900),
        viewport: { width: window.innerWidth, height: window.innerHeight, scrollWidth: doc.scrollWidth, scrollHeight: doc.scrollHeight },
        horizontalOverflow,
        loginRedirect: location.pathname.includes('/login'),
        appError: /Application error|Internal Server Error|Unhandled Runtime Error|This page could not be found|Authentication required/i.test(text),
        clippedText,
        fixedOverflow,
      };
    })()`,
  }))

  const screenshot = await client.send('Page.captureScreenshot', { format: 'png', fromSurface: true })
  const screenshotFile = `${viewport.id}-${route.id}.png`
  await writeFile(path.join(outputDir, screenshotFile), Buffer.from(screenshot.data, 'base64'))

  offLog()
  offException()
  offFailed()
  offResponse()

  const issueList = []
  if (inspection.loginRedirect) issueList.push('redirected to login')
  if (inspection.appError) issueList.push('visible app error')
  if (inspection.horizontalOverflow > 16) issueList.push(`page-level horizontal overflow ${inspection.horizontalOverflow}px`)
  if (inspection.fixedOverflow.length) issueList.push(`fixed/sticky overflow ${inspection.fixedOverflow.length}`)
  if (inspection.clippedText.length) issueList.push(`possible clipped text ${inspection.clippedText.length}`)

  const consoleErrorCount = consoleErrors.length
  if (consoleErrorCount || failedRequests.length || httpErrors.length) {
    warnings.push({
      route: route.path,
      viewport: viewport.id,
      consoleErrors: consoleErrors.slice(0, 5),
      failedRequests: failedRequests.slice(0, 5),
      httpErrors: httpErrors.slice(0, 8),
      exceptions: exceptions.slice(0, 5),
    })
  }

  return {
    ...route,
    viewport: viewport.id,
    dimensions: `${viewport.width}x${viewport.height}`,
    url: inspection.url,
    heading: inspection.heading,
    screenshot: screenshotFile,
    issueList,
    consoleErrorCount,
    failedRequestCount: failedRequests.length,
    httpErrors,
    horizontalOverflow: inspection.horizontalOverflow,
    clippedText: inspection.clippedText,
    fixedOverflow: inspection.fixedOverflow,
    exceptions: exceptions.slice(0, 5),
    consoleErrors: consoleErrors.slice(0, 5),
  }
}

function markdownReport(results) {
  const lines = [
    '# Manual Browser QA',
    '',
    `Run: ${new Date().toISOString()}`,
    `App URL: ${baseUrl}`,
    `QA proxy URL: ${proxyBaseUrl}`,
    '',
    '## Result',
    '',
    failures.length ? `Failures: ${failures.length}` : 'Failures: 0',
    warnings.length ? `Warnings: ${warnings.length}` : 'Warnings: 0',
    '',
    '## Viewports',
    '',
    ...viewports.map(viewport => `- ${viewport.id}: ${viewport.width} x ${viewport.height}`),
    '',
    '## Route Results',
    '',
    '| Viewport | Route | Role | Result | Screenshot |',
    '| --- | --- | --- | --- | --- |',
  ]

  results.forEach(result => {
    lines.push(`| ${result.dimensions} | ${result.path} | ${result.role} | ${result.issueList.length ? result.issueList.join('; ') : 'pass'} | ${result.screenshot} |`)
  })

  if (warnings.length) {
    lines.push('', '## Warnings', '')
    warnings.slice(0, 30).forEach(warning => {
      const statusSummary = (warning.httpErrors || [])
        .slice(0, 3)
        .map(error => `${error.status} ${new URL(error.url).pathname}`)
        .join(', ')
      lines.push(`- ${warning.viewport} ${warning.route}: ${warning.consoleErrors.length} console errors, ${warning.failedRequests.length} failed requests${statusSummary ? ` (${statusSummary})` : ''}`)
    })
  }

  return `${lines.join('\n')}\n`
}

await mkdir(outputDir, { recursive: true })
await rm(chromeUserDataDir, { recursive: true, force: true })
await mkdir(chromeUserDataDir, { recursive: true })

const server = spawn(process.execPath, [nextBin, 'start', '-p', String(port)], {
  cwd: appRoot,
  stdio: ['ignore', 'pipe', 'pipe'],
  env: {
    ...process.env,
    PORT: String(port),
    AUTH_SESSION_SECRET: authSecret,
    WISEFLOW_ALLOW_LOCAL_TENANT_STORE: '1',
    BUSINESS_DATA_DIR: path.join(appRoot, '.data', 'manual-browser-qa-business'),
    HRHUB_DATA_DIR: path.join(appRoot, '.data', 'manual-browser-qa-hrhub'),
    RATE_LIMIT_DATA_DIR: path.join(appRoot, '.data', 'manual-browser-qa-rate-limits'),
  },
})

server.stdout.on('data', chunk => process.stdout.write(chunk))
server.stderr.on('data', chunk => process.stderr.write(chunk))

let chrome
let qaProxy

try {
  await waitForServer()
  qaProxy = await startQaProxy()
  const browserPath = chromePath()
  if (!browserPath) throw new Error('Chrome or Edge was not found. Set CHROME_PATH to run manual browser QA.')

  chrome = spawn(browserPath, [
    '--headless=new',
    `--remote-debugging-port=${chromeDebugPort}`,
    `--user-data-dir=${chromeUserDataDir}`,
    '--disable-gpu',
    '--no-first-run',
    '--no-default-browser-check',
    '--hide-scrollbars=false',
    'about:blank',
  ], { stdio: ['ignore', 'ignore', 'ignore'] })

  await waitForChrome()

  const results = []
  for (const viewport of viewports) {
    for (const route of routes) {
      const target = await newCdpTarget()
      const routeClient = createCdpClient(target.webSocketDebuggerUrl)
      try {
        await routeClient.ready()
        await routeClient.send('Page.enable')
        await routeClient.send('Runtime.enable')
        await routeClient.send('Network.enable')
        await routeClient.send('Log.enable')
        const result = await inspectPage(routeClient, route, viewport)
        results.push(result)
        const ok = result.issueList.length === 0
        console.log(`${ok ? 'PASS' : 'FAIL'} ${viewport.id} ${route.path}${ok ? '' : `: ${result.issueList.join('; ')}`}`)
        if (!ok) failures.push(result)
      } finally {
        routeClient.close()
        await closeCdpTarget(target.id)
      }
    }
  }

  await writeFile(path.join(outputDir, 'report.json'), `${JSON.stringify({ runId, baseUrl, results, failures, warnings }, null, 2)}\n`)
  await writeFile(path.join(outputDir, 'report.md'), markdownReport(results))
  await writeFile(path.join(outputRoot, 'latest-report-path.txt'), `${path.join(outputDir, 'report.md')}\n`)
  console.log(`\nManual browser QA artifacts: ${outputDir}`)

  if (failures.length) {
    console.error('\nManual browser QA failures:')
    failures.forEach(result => console.error(`- ${result.viewport} ${result.path}: ${result.issueList.join('; ')}`))
    process.exit(1)
  }

  console.log('\nManual browser QA passed.')
} finally {
  if (chrome && !chrome.killed) chrome.kill('SIGTERM')
  if (qaProxy) await new Promise(resolve => qaProxy.close(resolve))
  server.kill('SIGTERM')
}
