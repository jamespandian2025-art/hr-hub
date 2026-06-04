import { spawn } from 'node:child_process'
import { createHmac, webcrypto } from 'node:crypto'
import { existsSync } from 'node:fs'
import { mkdir, rm, writeFile } from 'node:fs/promises'
import { createServer } from 'node:http'
import path from 'node:path'
import { Readable } from 'node:stream'
import { fileURLToPath } from 'node:url'

const appRoot = fileURLToPath(new URL('..', import.meta.url))
const nextBin = fileURLToPath(new URL('../node_modules/next/dist/bin/next', import.meta.url))
const port = Number(process.env.AUTOMATED_SMOKE_PORT || 3112)
const baseUrl = `http://127.0.0.1:${port}`
const proxyPort = Number(process.env.AUTOMATED_SMOKE_PROXY_PORT || port + 100)
const proxyBaseUrl = `http://127.0.0.1:${proxyPort}`
const chromeDebugPort = Number(process.env.AUTOMATED_SMOKE_CHROME_PORT || 9252)
const authSecret = process.env.AUTH_SESSION_SECRET || 'automated-smoke-session-secret'
const companyId = 'automated-smoke-company'
const companyName = 'WiseFlow Automated Smoke'
const adminEmail = 'admin@automated-smoke.wiseflow.local'
const businessDataDir = path.join(appRoot, '.data', 'automated-smoke-business')
const hrDataDir = path.join(appRoot, '.data', 'automated-smoke-hrhub')
const rateLimitDataDir = path.join(appRoot, '.data', 'automated-smoke-rate-limits')
const outputRoot = path.join(appRoot, '.data', 'automated-smoke')
const runId = new Date().toISOString().replace(/[:.]/g, '-')
const outputDir = path.join(outputRoot, runId)
const chromeUserDataDir = path.join(appRoot, '.data', 'automated-smoke-chrome')
const failures = []
const results = []
let activeSessionCookie = ''

const smokeClient = {
  id: 'smoke-client-rasmus-pandian',
  companyId,
  name: 'Rasmus Pandian',
  company: 'Consulting Solutions & Services',
  email: 'rasmusp.smoke@example.com',
  phone: '9457850160',
  website: 'rasmuspandian.com',
  industry: 'Consulting',
  status: 'Active',
  companySize: '1-10',
  companyType: 'Private',
  annualRevenue: '-',
  taxId: 'TAX-SMOKE-1001',
  billingAddress: 'Matina Drive, Davao City',
  accountManager: 'Automated Smoke Admin',
  defaultCurrency: 'PHP - Philippine Peso',
  paymentTerms: '15 days',
  tags: ['smoke'],
  description: 'Automated smoke test client.',
  createdAt: '2026-05-27',
  lastContact: 'May 27, 2026',
  totalProjects: 0,
  activeProjects: 0,
  completedProjects: 0,
  onHoldProjects: 0,
  totalRevenue: 0,
  paidRevenue: 0,
  outstandingRevenue: 0,
  invoices: { total: 0, paid: 0, unpaid: 0, overdue: 0 },
  contracts: 0,
  documents: 0,
  contacts: [
    {
      id: 'smoke-contact-rasmus',
      name: 'Rasmus Pandian',
      role: 'Owner',
      email: 'rasmusp.smoke@example.com',
      phone: '9457850160',
      primary: true,
    },
  ],
  activities: [],
  notes: [],
}

const smokeSalesOpportunityName = 'Automated Smoke Sales Project'
const smokeSalesCloseDate = new Date().toISOString().slice(0, 10)
const smokeEmployeePassword = 'SmokePass123!'
const smokeEmployee = {
  id: 'smoke-employee-christina',
  companyId,
  employeeId: 'EMP-SMOKE-001',
  firstName: 'Christina',
  middleName: 'Inah Julian',
  lastName: 'Pandian',
  email: 'christina.smoke@example.com',
  portalEmail: 'christina.smoke@wiseflow.employee',
  employmentStatus: 'Active',
  employeeType: 'Full-time',
  employeeRole: 'Employee',
  department: 'Finance',
  team: 'Accounting',
  jobTitle: 'Accountant',
  dateOfJoining: '2026-01-15',
  basicSalary: 65000,
  allowances: 5000,
  deductions: 0,
  bankName: 'Smoke Bank',
  accountNumber: '1234567890',
}

const smokePayrollRecord = {
  id: 'payroll-smoke-christina-may-2026',
  employeeId: smokeEmployee.id,
  period: 'May 2026',
  gross: 70000,
  deductions: 14500,
  deductionBreakdown: {
    sss: 2800,
    philHealth: 2500,
    pagIbig: 200,
    tax: 9000,
    loanOrCashAdvance: 0,
  },
  net: 55500,
  status: 'Pending',
  source: 'payroll-run',
  createdAt: '2026-05-26T08:00:00.000Z',
}

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

function roleSlug(role) {
  return role.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
}

function signSession(role) {
  const slug = roleSlug(role)
  const session = {
    userId: `automated-smoke-${slug}`,
    email: role === 'Admin' ? adminEmail : `${slug}@automated-smoke.wiseflow.local`,
    name: `Automated Smoke ${role}`,
    role,
    companyId,
    employeeId: role === 'Employee' || role === 'Team Manager' ? `automated-smoke-${slug}` : undefined,
    issuedAt: Date.now(),
  }
  const payload = Buffer.from(JSON.stringify(session)).toString('base64url')
  const signature = createHmac('sha256', authSecret).update(payload).digest('base64url')
  return `${payload}.${signature}`
}

function accountForRole(role) {
  const slug = roleSlug(role)
  return {
    userId: `automated-smoke-${slug}`,
    id: `automated-smoke-${slug}`,
    email: role === 'Admin' ? adminEmail : `${slug}@automated-smoke.wiseflow.local`,
    name: `Automated Smoke ${role}`,
    fullName: `Automated Smoke ${role}`,
    provider: 'automated-smoke',
    role,
    company: companyName,
    companyId,
  }
}

function companyRecord() {
  return {
    id: companyId,
    name: companyName,
    type: 'Operating Company',
    createdAt: '2026-05-27T00:00:00.000Z',
    ownerEmail: adminEmail,
    members: [
      {
        id: 'automated-smoke-member-admin',
        email: adminEmail,
        name: 'Automated Smoke Admin',
        role: 'Admin',
        permissions: [
          'dashboard',
          'clients',
          'sales',
          'projects',
          'financials',
          'hr',
          'procurement',
          'warehouse',
          'workflows',
          'datasets',
          'documents',
          'reports',
          'settings',
          'members',
        ],
        status: 'Active',
        joinedAt: '2026-05-27T00:00:00.000Z',
      },
    ],
    settings: {
      currency: 'PHP',
      timezone: 'Asia/Manila',
      fiscalYearStart: 'January',
    },
  }
}

function portalPasswordFingerprint(value) {
  return String(value || '').replace(/[\u2010-\u2015\u2212]/g, '-').trim().replace(/[^a-z0-9]/gi, '').toLowerCase()
}

async function pbkdf2Hex(password, salt) {
  const key = await webcrypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveBits'],
  )
  const bits = await webcrypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      hash: 'SHA-256',
      salt: new TextEncoder().encode(salt),
      iterations: 210000,
    },
    key,
    256,
  )
  return Array.from(new Uint8Array(bits), value => value.toString(16).padStart(2, '0')).join('')
}

function businessRecord(collection, payload) {
  const now = new Date().toISOString()
  const id = String(payload.id)
  return {
    id,
    collection,
    companyId,
    payload: { ...payload, id, companyId },
    createdAt: payload.createdAt || now,
    updatedAt: now,
  }
}

async function seedData() {
  await rm(businessDataDir, { recursive: true, force: true })
  await rm(hrDataDir, { recursive: true, force: true })
  await rm(rateLimitDataDir, { recursive: true, force: true })
  await rm(outputDir, { recursive: true, force: true })
  await mkdir(path.join(businessDataDir, companyId), { recursive: true })
  await mkdir(hrDataDir, { recursive: true })
  await mkdir(rateLimitDataDir, { recursive: true })
  await mkdir(outputDir, { recursive: true })

  await writeFile(
    path.join(businessDataDir, companyId, 'clients.json'),
    `${JSON.stringify([businessRecord('clients', smokeClient)], null, 2)}\n`,
    'utf8',
  )
  await writeFile(
    path.join(businessDataDir, companyId, 'accounting-invoices.json'),
    '[]\n',
    'utf8',
  )

  const salt = 'automatedsmokesalt0001'
  const portalPasswordHash = await pbkdf2Hex(portalPasswordFingerprint(smokeEmployeePassword), salt)
  await writeFile(
    path.join(hrDataDir, 'employees.json'),
    `${JSON.stringify([
      {
        ...smokeEmployee,
        portalPasswordHash,
        portalPasswordSalt: salt,
        portalPasswordAlgorithm: 'pbkdf2-sha256',
        portalPasswordUpdatedAt: '2026-05-27T00:00:00.000Z',
        createdAt: '2026-05-27T00:00:00.000Z',
        updatedAt: '2026-05-27T00:00:00.000Z',
      },
    ], null, 2)}\n`,
    'utf8',
  )
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

function valueFromResult(evaluateResult) {
  return evaluateResult.result?.value
}

async function evaluate(client, expression) {
  const result = await client.send('Runtime.evaluate', {
    expression,
    awaitPromise: true,
    returnByValue: true,
  })
  if (result.exceptionDetails) {
    const detail = result.exceptionDetails.exception?.description || result.exceptionDetails.text || 'Runtime evaluation failed.'
    throw new Error(detail)
  }
  return valueFromResult(result)
}

async function waitForLoad(client, action) {
  let loaded = false
  const off = client.on('Page.loadEventFired', () => { loaded = true })
  await action()
  const startedAt = Date.now()
  while (!loaded && Date.now() - startedAt < 15000) await sleep(100)
  off()
  await sleep(800)
}

async function waitForExpression(client, label, expression, timeoutMs = 12000) {
  const startedAt = Date.now()
  let lastError = ''
  while (Date.now() - startedAt < timeoutMs) {
    try {
      if (await evaluate(client, expression)) return
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error)
    }
    await sleep(200)
  }
  throw new Error(`Timed out waiting for ${label}${lastError ? `: ${lastError}` : ''}`)
}

function clientStorageScript(role = 'Admin', extras = {}) {
  const account = accountForRole(role)
  const company = companyRecord()
  return `(() => {
    const account = ${JSON.stringify(account)};
    const company = ${JSON.stringify(company)};
    window.localStorage.setItem('flowsys-auth-session', JSON.stringify(account));
    window.localStorage.setItem('flowsys-account', JSON.stringify(account));
    window.localStorage.removeItem('flowsys-auth-logged-out');
    window.localStorage.setItem('wiseflow-companies', JSON.stringify([company]));
    window.localStorage.setItem('wiseflow-active-company-id', ${JSON.stringify(companyId)});
    ${Object.entries(extras).map(([key, value]) => `window.localStorage.setItem(${JSON.stringify(key)}, JSON.stringify(${JSON.stringify(value)}));`).join('\n    ')}
  })()`
}

async function openAuthenticatedPage(client, pathName, role = 'Admin', extras = {}) {
  activeSessionCookie = `wiseflow_session=${signSession(role)}`
  await client.send('Storage.clearDataForOrigin', {
    origin: proxyBaseUrl,
    storageTypes: 'local_storage,cookies,indexeddb',
  }).catch(() => undefined)
  await waitForLoad(client, () => client.send('Page.navigate', { url: `${proxyBaseUrl}/login` }))
  await evaluate(client, clientStorageScript(role, extras))
  await waitForLoad(client, () => client.send('Page.navigate', { url: `${proxyBaseUrl}${pathName}` }))
  await waitForExpression(client, `load ${pathName}`, `!document.body.innerText.includes('Loading') && document.body.innerText.length > 50`)
}

async function openPublicPage(client, pathName) {
  activeSessionCookie = ''
  await client.send('Storage.clearDataForOrigin', {
    origin: baseUrl,
    storageTypes: 'local_storage,cookies,indexeddb',
  }).catch(() => undefined)
  await waitForLoad(client, () => client.send('Page.navigate', { url: `${baseUrl}${pathName}` }))
}

async function clickByText(client, selector, text, match = 'includes') {
  const expression = `(() => {
    const text = ${JSON.stringify(text)};
    const match = ${JSON.stringify(match)};
    const element = Array.from(document.querySelectorAll(${JSON.stringify(selector)}))
      .find(item => {
        const value = (item.innerText || item.textContent || '').trim();
        return match === 'exact' ? value === text : value.includes(text);
      });
    if (!element) return false;
    element.click();
    return true;
  })()`
  const clicked = await evaluate(client, expression)
  if (!clicked) throw new Error(`Could not click ${selector} with text "${text}".`)
}

async function clickFirst(client, selector, label = selector) {
  const clicked = await evaluate(client, `(() => {
    const element = document.querySelector(${JSON.stringify(selector)});
    if (!element) return false;
    element.click();
    return true;
  })()`)
  if (!clicked) throw new Error(`Could not click ${label}.`)
}

async function setElementValue(client, selector, value, index = 0) {
  const updated = await evaluate(client, `(() => {
    const elements = Array.from(document.querySelectorAll(${JSON.stringify(selector)}));
    const element = elements[${Number(index)}];
    if (!element) return false;
    const value = ${JSON.stringify(value)};
    const proto = Object.getPrototypeOf(element);
    const descriptor = Object.getOwnPropertyDescriptor(proto, 'value');
    if (descriptor?.set) descriptor.set.call(element, value);
    else element.value = value;
    element.dispatchEvent(new Event('input', { bubbles: true }));
    element.dispatchEvent(new Event('change', { bubbles: true }));
    return true;
  })()`)
  if (!updated) throw new Error(`Could not set ${selector}.`)
}

async function setLabeledControl(client, labelText, value, controlSelector = 'input, textarea, select') {
  const updated = await evaluate(client, `(() => {
    const labelText = ${JSON.stringify(labelText)};
    const value = ${JSON.stringify(value)};
    const label = Array.from(document.querySelectorAll('label'))
      .find(item => (item.querySelector('span')?.textContent || '').replace(/\\s*\\*$/, '').trim() === labelText);
    const element = label?.querySelector(${JSON.stringify(controlSelector)});
    if (!element) return false;
    const proto = Object.getPrototypeOf(element);
    const descriptor = Object.getOwnPropertyDescriptor(proto, 'value');
    if (descriptor?.set) descriptor.set.call(element, value);
    else element.value = value;
    element.dispatchEvent(new Event('input', { bubbles: true }));
    element.dispatchEvent(new Event('change', { bubbles: true }));
    return true;
  })()`)
  if (!updated) throw new Error(`Could not set labeled control "${labelText}".`)
}

async function screenshot(client, name) {
  const image = await client.send('Page.captureScreenshot', { format: 'png', fromSurface: true })
  const filename = `${name}.png`
  await writeFile(path.join(outputDir, filename), Buffer.from(image.data, 'base64'))
  return filename
}

async function runBrowserCase(name, callback) {
  const target = await newCdpTarget()
  const client = createCdpClient(target.webSocketDebuggerUrl)
  const startedAt = Date.now()
  try {
    await client.ready()
    await client.send('Page.enable')
    await client.send('Runtime.enable')
    await client.send('Network.enable')
    await client.send('Log.enable')
    await client.send('Emulation.setDeviceMetricsOverride', {
      width: 1440,
      height: 900,
      deviceScaleFactor: 1,
      mobile: false,
    })
    await callback(client)
    const screenshotFile = await screenshot(client, name.toLowerCase().replace(/[^a-z0-9]+/g, '-'))
    results.push({ name, ok: true, durationMs: Date.now() - startedAt, screenshot: screenshotFile })
    console.log(`PASS ${name}`)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    let screenshotFile = ''
    try {
      screenshotFile = await screenshot(client, `${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-failure`)
    } catch {
      // Screenshot failure should not mask the smoke failure.
    }
    failures.push({ name, message, screenshot: screenshotFile })
    results.push({ name, ok: false, durationMs: Date.now() - startedAt, error: message, screenshot: screenshotFile })
    console.log(`FAIL ${name}: ${message}`)
  } finally {
    client.close()
    await closeCdpTarget(target.id)
  }
}

async function accountingInvoiceFlow(client) {
  await openAuthenticatedPage(client, '/accounting/invoices')
  await waitForExpression(client, 'invoice page', `document.body.innerText.includes('Invoices')`)
  await clickByText(client, 'button', 'New Invoice')
  await waitForExpression(client, 'create invoice form', `document.body.innerText.includes('Create Invoice')`)
  await waitForExpression(
    client,
    'seeded client option',
    `Array.from(document.querySelectorAll('.invoices-maker-form select option')).some(option => option.value === ${JSON.stringify(smokeClient.id)})`,
  )
  await setLabeledControl(client, 'Customer', smokeClient.id, 'select')
  await waitForExpression(client, 'client email autofill', `document.querySelector('input[type="email"]')?.value === ${JSON.stringify(smokeClient.email)}`)
  await waitForExpression(
    client,
    'bill-to autofill',
    `(() => {
      const value = Array.from(document.querySelectorAll('label')).find(label => (label.querySelector('span')?.textContent || '').trim() === 'Bill to')?.querySelector('textarea')?.value || '';
      return value.includes(${JSON.stringify(smokeClient.name)}) &&
        value.includes(${JSON.stringify(smokeClient.email)}) &&
        value.includes(${JSON.stringify(smokeClient.phone)}) &&
        value.includes(${JSON.stringify(smokeClient.taxId)}) &&
        value.includes(${JSON.stringify(smokeClient.billingAddress)});
    })()`,
  )
  await setElementValue(client, '.invoices-line-row input[placeholder="Design, materials, labor..."]', 'Automated smoke consulting')
  await setElementValue(client, '.invoices-line-row select', 'Hourly')
  await setElementValue(client, '.invoices-line-row input[placeholder="0.00"]', '850')
  await setElementValue(client, '.invoices-line-row input[placeholder="1"]', '2')
  await waitForExpression(client, 'line total', `document.body.innerText.includes('PHP 1,700.00') || document.body.innerText.includes('₱1,700.00')`)
  await evaluate(client, `document.querySelector('.invoices-maker-form')?.requestSubmit()`)
  await waitForExpression(
    client,
    'created invoice row',
    `document.body.innerText.includes(${JSON.stringify(smokeClient.name)}) && (document.body.innerText.includes('PHP 1,700.00') || document.body.innerText.includes('₱1,700.00'))`,
  )
  const invoiceNumber = await evaluate(client, `document.querySelector('.invoices-table tbody tr td[data-label="Invoice"] strong')?.textContent?.trim() || ''`)
  if (!invoiceNumber) throw new Error('Created invoice number was not visible in the invoice register.')

  await waitForLoad(client, () => client.send('Page.navigate', { url: `${proxyBaseUrl}/people/clients/${smokeClient.id}` }))
  await waitForExpression(client, 'client detail page', `document.body.innerText.includes(${JSON.stringify(smokeClient.name)})`)
  await clickByText(client, 'button', 'Invoices', 'exact')
  await waitForExpression(
    client,
    'client invoice reflection',
    `document.body.innerText.includes(${JSON.stringify(invoiceNumber)}) &&
      document.body.innerText.includes(${JSON.stringify(smokeClient.email)}) &&
      (document.body.innerText.includes('PHP 1,700.00') || document.body.innerText.includes('₱1,700.00'))`,
  )
}

async function salesOpportunityFlow(client) {
  await openAuthenticatedPage(client, '/sales')
  await waitForExpression(client, 'sales workspace', `document.body.innerText.includes('Opportunities') && document.body.innerText.includes('Opportunity List')`)
  for (const theme of ['dark', 'light']) {
    await evaluate(client, `document.documentElement.setAttribute('data-theme', ${JSON.stringify(theme)})`)
    const overflow = await evaluate(client, `Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) - window.innerWidth`)
    if (overflow > 16) throw new Error(`Sales ${theme} theme rendered with ${overflow}px horizontal overflow.`)
  }
  await clickByText(client, 'button', 'Opportunity', 'exact')
  await waitForExpression(client, 'opportunity drawer', `document.querySelector('[role="dialog"][aria-modal="true"]')?.textContent.includes('Create Project Opportunity')`)
  await waitForExpression(
    client,
    'seeded sales client option',
    `Array.from(document.querySelectorAll('[role="dialog"] select option')).some(option => option.value === ${JSON.stringify(smokeClient.id)})`,
  )

  await setLabeledControl(client, 'Client / Company', smokeClient.id, 'select')
  await setLabeledControl(client, 'Project Name', smokeSalesOpportunityName)
  await setLabeledControl(client, 'Estimated Contract Value', '1250000')
  await setLabeledControl(client, 'Project Type', 'Commercial', 'select')
  await setLabeledControl(client, 'Location / Site Address', smokeClient.billingAddress)
  await setLabeledControl(client, 'Sales Stage', 'Awarded', 'select')
  await setLabeledControl(client, 'Probability (%)', '100')
  await setLabeledControl(client, 'Assigned Team', 'Architecture / Engineering')
  await setLabeledControl(client, 'Expected Closing Date', smokeSalesCloseDate)
  await evaluate(client, `document.querySelector('.sales-opportunity-drawer')?.requestSubmit()`)
  await waitForExpression(
    client,
    'created sales opportunity',
    `document.body.innerText.includes(${JSON.stringify(smokeSalesOpportunityName)}) &&
      document.body.innerText.includes(${JSON.stringify(smokeClient.name)}) &&
      document.body.innerText.includes('Create Project')`,
  )
  await setElementValue(client, '.workspace-general-search-input, input[placeholder="Search records"]', smokeSalesOpportunityName)
  await waitForExpression(
    client,
    'sales global search result',
    `document.querySelector('[role="listbox"][aria-label="Global search results"]')?.innerText.includes(${JSON.stringify(smokeSalesOpportunityName)}) &&
      document.querySelector('[role="listbox"][aria-label="Global search results"]')?.innerText.includes('Sales')`,
  )
  await setElementValue(client, '.workspace-general-search-input, input[placeholder="Search records"]', '')

  await clickByText(client, 'button', 'Filters', 'includes')
  await waitForExpression(client, 'sales filters', `document.body.innerText.includes('Reset filters')`)
  await setLabeledControl(client, 'Stage', 'Awarded', 'select')
  await setLabeledControl(client, 'Client', smokeClient.name, 'select')
  await setElementValue(client, '.sales-panel-search input', smokeSalesOpportunityName)
  await waitForExpression(client, 'filtered sales opportunity', `document.body.innerText.includes(${JSON.stringify(smokeSalesOpportunityName)})`)
  await setElementValue(client, '.sales-panel-search input', 'no matching smoke opportunity')
  await waitForExpression(client, 'sales empty state', `document.body.innerText.includes('No opportunities found')`)
  await setElementValue(client, '.sales-panel-search input', smokeSalesOpportunityName)
  await waitForExpression(client, 'sales search restored', `document.body.innerText.includes(${JSON.stringify(smokeSalesOpportunityName)})`)

  await clickByText(client, 'button', 'Export', 'exact')
  await waitForExpression(client, 'sales export notice', `document.body.innerText.includes('opportunity record') && document.body.innerText.includes('exported')`)
  await clickByText(client, 'button', 'Reset filters', 'exact')
  await waitForExpression(client, 'sales reset notice', `document.body.innerText.includes('Sales view reset')`)
  await waitForExpression(client, 'sales reset keeps record visible', `document.body.innerText.includes(${JSON.stringify(smokeSalesOpportunityName)})`)

  await clickByText(client, 'button', 'Create Project', 'exact')
  await waitForExpression(client, 'sales project conversion notice', `document.body.innerText.includes('created in Project Management')`)
  await clickByText(client, 'button', 'Create Project', 'exact')
  await waitForExpression(client, 'sales duplicate project guard', `document.body.innerText.includes('already linked')`)

  await waitForLoad(client, () => client.send('Page.navigate', { url: `${proxyBaseUrl}/project-management/projects` }))
  await waitForExpression(client, 'converted project visible', `document.body.innerText.includes(${JSON.stringify(smokeSalesOpportunityName)})`)
}

async function employeeLoginFlow(client) {
  await openPublicPage(client, '/employee/login')
  await waitForExpression(client, 'employee login page', `document.body.innerText.includes('Welcome Back')`)
  await setElementValue(client, 'input[placeholder="Enter your email"]', smokeEmployee.portalEmail)
  await setElementValue(client, 'input[placeholder="Enter your password"]', smokeEmployeePassword)
  for (let attempt = 0; attempt < 2; attempt += 1) {
    await clickByText(client, 'button', 'Sign In', 'exact')
    try {
      await waitForExpression(client, 'employee dashboard redirect', `location.pathname === '/employee/dashboard'`, 15000)
      break
    } catch (error) {
      if (attempt > 0) throw error
      await waitForExpression(
        client,
        'employee login retry ready',
        `location.pathname === '/employee/dashboard' || Array.from(document.querySelectorAll('button')).some(button => button.innerText.trim() === 'Sign In')`,
        5000,
      )
      if (await evaluate(client, `location.pathname === '/employee/dashboard'`)) break
    }
  }
  await waitForExpression(client, 'employee dashboard content', `document.body.innerText.includes('Employee Dashboard') || document.body.innerText.includes('Download Payslip')`)
}

async function payrollDetailsModalFlow(client) {
  await openAuthenticatedPage(client, '/hr/payroll', 'Admin', {
    'flowsys-hr-employees': [smokeEmployee],
    'flowsys-hr-payroll-records': [smokePayrollRecord],
  })
  await waitForExpression(client, 'payroll cycles', `document.body.innerText.includes('Payroll Cycles') && document.body.innerText.includes('May 2026')`)
  await clickFirst(client, 'tbody tr button', 'first payroll cycle details button')
  await waitForExpression(client, 'payroll details page', `document.querySelector('h1')?.innerText === 'Payroll Details'`)
  await clickByText(client, 'button', 'Employee Payslips', 'exact')
  await waitForExpression(client, 'cycle payslips table', `document.body.innerText.includes(${JSON.stringify(smokeEmployee.employeeId)})`)
  await clickFirst(client, 'tbody tr[role="button"]', 'first cycle payslip row')
  await waitForExpression(
    client,
    'payslip details modal',
    `document.querySelector('[role="dialog"][aria-modal="true"]')?.textContent.includes('Payslip Details') &&
      document.querySelector('[role="dialog"][aria-modal="true"]')?.textContent.includes(${JSON.stringify(smokeEmployee.employeeId)})`,
  )
}

async function projectStatusDropdownFlow(client) {
  await openAuthenticatedPage(client, '/project-management/projects')
  await waitForExpression(client, 'project directory', `document.body.innerText.includes('Projects') && Boolean(document.querySelector('.pm-project-table'))`)
  await clickFirst(client, 'button[aria-label="Project status"]', 'project status dropdown')
  await waitForExpression(client, 'project status options', `document.querySelector('.pm-project-badge-menu')?.textContent.includes('Completed')`)
  const inProgressOptions = await evaluate(client, `Array.from(document.querySelectorAll('.pm-project-badge-menu-option')).filter(option => (option.innerText || '').trim() === 'In Progress').length`)
  if (inProgressOptions > 1) throw new Error(`Project status menu rendered ${inProgressOptions} In Progress options.`)
  const targetStatus = await evaluate(client, `document.querySelector('button[aria-label="Project status"]')?.innerText.includes('Planning') ? 'Completed' : 'Planning'`)
  await clickByText(client, '.pm-project-badge-menu-option', targetStatus, 'exact')
  await waitForExpression(client, 'project status changed', `document.querySelector('button[aria-label="Project status"]')?.innerText.includes(${JSON.stringify(targetStatus)})`)
}

async function aiAssistantFlow(client) {
  await openAuthenticatedPage(client, '/dashboard')
  await waitForExpression(client, 'dashboard shell', `document.body.innerText.includes('Dashboard') && Boolean(document.querySelector('.ai-assistant-fab'))`)
  await clickFirst(client, '.ai-assistant-fab', 'AI assistant launcher')
  await waitForExpression(client, 'assistant panel', `document.querySelector('.ai-assistant-panel')?.textContent.includes('WiseFlow AI')`)
  await setElementValue(client, '.ai-assistant-composer textarea', 'How do I create an invoice?')
  await clickFirst(client, '.ai-assistant-composer button[type="submit"]', 'AI assistant send button')
  await waitForExpression(
    client,
    'assistant invoice guidance',
    `document.querySelector('.ai-assistant-thread')?.innerText.includes('Accounting > Invoices') &&
      document.querySelector('.ai-assistant-thread')?.innerText.includes('Customer dropdown')`,
    15000,
  )
  await waitForExpression(client, 'assistant local mode indicator', `document.querySelector('.ai-assistant-title')?.innerText.includes('Local help mode')`)
}

function markdownReport() {
  const lines = [
    '# Automated Smoke Tests',
    '',
    `Run: ${new Date().toISOString()}`,
    `App URL: ${baseUrl}`,
    `QA proxy URL: ${proxyBaseUrl}`,
    '',
    '## Result',
    '',
    failures.length ? `Failures: ${failures.length}` : 'Failures: 0',
    '',
    '## Flow Results',
    '',
    '| Flow | Result | Duration | Screenshot |',
    '| --- | --- | ---: | --- |',
  ]

  results.forEach(result => {
    lines.push(`| ${result.name} | ${result.ok ? 'pass' : `fail: ${result.error}`} | ${Math.round(result.durationMs / 100) / 10}s | ${result.screenshot || ''} |`)
  })

  return `${lines.join('\n')}\n`
}

await seedData()
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
    BUSINESS_DATA_DIR: businessDataDir,
    HRHUB_DATA_DIR: hrDataDir,
    RATE_LIMIT_DATA_DIR: rateLimitDataDir,
    OPENAI_API_KEY: '',
  },
})

server.stdout.on('data', chunk => process.stdout.write(chunk))
server.stderr.on('data', chunk => process.stderr.write(chunk))

let qaProxy
let chrome

try {
  await waitForServer()
  qaProxy = await startQaProxy()
  const browserPath = chromePath()
  if (!browserPath) throw new Error('Chrome or Edge was not found. Set CHROME_PATH to run automated smoke tests.')

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

  await runBrowserCase('Accounting invoice creation and client reflection', accountingInvoiceFlow)
  await runBrowserCase('Sales opportunity creation and project conversion', salesOpportunityFlow)
  await runBrowserCase('Employee portal login', employeeLoginFlow)
  await runBrowserCase('Payroll details modal', payrollDetailsModalFlow)
  await runBrowserCase('Project status dropdown', projectStatusDropdownFlow)
  await runBrowserCase('AI assistant local guidance', aiAssistantFlow)

  await writeFile(path.join(outputDir, 'report.json'), `${JSON.stringify({ runId, baseUrl, results, failures }, null, 2)}\n`)
  await writeFile(path.join(outputDir, 'report.md'), markdownReport())
  await writeFile(path.join(outputRoot, 'latest-report-path.txt'), `${path.join(outputDir, 'report.md')}\n`)
  console.log(`\nAutomated smoke artifacts: ${outputDir}`)

  if (failures.length) {
    console.error('\nAutomated smoke failures:')
    failures.forEach(failure => console.error(`- ${failure.name}: ${failure.message}`))
    process.exit(1)
  }

  console.log('\nAutomated smoke tests passed.')
} finally {
  if (chrome && !chrome.killed) chrome.kill('SIGTERM')
  if (qaProxy) await new Promise(resolve => qaProxy.close(resolve))
  server.kill('SIGTERM')
}
