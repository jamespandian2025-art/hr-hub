'use client'

import { clearLegacyBusinessRows, deleteBusinessRecord, listBusinessRecords, readLegacyBusinessRows, upsertBusinessRecord } from '@/lib/business/client'
import { createHrRecord, listHrRecords } from '@/lib/hrms/client'
import { getActiveCompany } from '@/lib/tenant/company'

export type ClientStatus = 'Active' | 'Inactive'
export type ClientSource = 'server' | 'legacy' | 'unavailable'
export type ClientType = 'Commercial' | 'Residential'

export interface ClientContact {
  id: string
  name: string
  role: string
  email: string
  phone: string
  primary?: boolean
  avatar?: string
}

export interface ClientActivity {
  id: string
  title: string
  description: string
  date: string
  time: string
  tone: 'green' | 'blue' | 'purple' | 'orange'
}

export interface ClientNote {
  id: string
  title: string
  body: string
  date: string
  author: string
}

export interface ClientRecord {
  id: string
  companyId?: string
  clientType?: ClientType
  photo?: string
  name: string
  company: string
  email: string
  phone: string
  website: string
  industry: string
  status: ClientStatus
  companySize: string
  companyType: string
  annualRevenue: string
  taxId: string
  billingAddress: string
  accountManager: string
  accountManagerAvatar?: string
  defaultCurrency: string
  paymentTerms: string
  tags: string[]
  description: string
  createdAt: string
  lastContact: string
  totalProjects: number
  activeProjects: number
  completedProjects: number
  onHoldProjects: number
  totalRevenue: number
  paidRevenue: number
  outstandingRevenue: number
  invoices: { total: number; paid: number; unpaid: number; overdue: number }
  contracts: number
  documents: number
  contacts: ClientContact[]
  activities: ClientActivity[]
  notes: ClientNote[]
}

export interface ClientLoadResult {
  clients: ClientRecord[]
  source: ClientSource
  error?: string
}

export const clientsStorageKey = 'flowsys-clients'

type ClientRow = Record<string, unknown>

const emptyInvoices = { total: 0, paid: 0, unpaid: 0, overdue: 0 }
const legacyDemoClientIds = new Set(['horizon-technologies', 'brightline-corp', 'greenpath-solutions', 'delta-analytics', 'sunrise-builders'])
const employeesStorageKey = 'flowsys-hr-employees'

export function slugify(value: string) {
  const slug = value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

  return slug || `client-${Date.now()}`
}

export function getInitials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part.charAt(0).toUpperCase())
    .join('') || 'CL'
}

export function formatPeso(value: number) {
  return `PHP ${value.toLocaleString('en-PH', { maximumFractionDigits: 0 })}`
}

export async function loadAccountManagers() {
  if (typeof window === 'undefined') return []

  const legacyEmployees = readStoredRows(employeesStorageKey)
  const serverEmployees = await listHrRecords<ClientRow>('employees').catch(() => [])
  const names = [...serverEmployees, ...legacyEmployees]
    .filter(isActiveEmployee)
    .map(employeeAccountManagerName)

  return Array.from(new Set(names.map(name => name.trim()).filter(Boolean))).sort((a, b) => a.localeCompare(b))
}

export async function addAccountManagerRecord(name: string) {
  if (typeof window === 'undefined') return ''

  const managerName = name.trim().replace(/\s+/g, ' ')
  if (!managerName) return ''

  const legacyEmployees = readStoredRows(employeesStorageKey)
  const serverEmployees = await listHrRecords<ClientRow>('employees').catch(() => [])
  const employees = [...serverEmployees, ...legacyEmployees]
  const existingName = employees
    .map(employeeAccountManagerName)
    .find(storedName => storedName.trim().toLowerCase() === managerName.toLowerCase())

  if (existingName) return existingName.trim()

  const now = new Date().toISOString()
  const nameParts = managerName.split(/\s+/).filter(Boolean)
  const firstName = nameParts[0] || managerName
  const lastName = nameParts.slice(1).join(' ') || managerName
  const employeeId = nextEmployeeId(employees)
  const record = await createHrRecord<ClientRow>('employees', {
    id: `emp_${slugify(managerName)}_${Date.now()}`,
    employeeId,
    fullName: managerName,
    firstName,
    middleName: '',
    lastName,
    email: '',
    phone: '',
    department: 'Sales',
    team: 'Client Management',
    jobTitle: 'Account Manager',
    employeeType: 'Full Time',
    employeeRole: 'Team Manager',
    employmentStatus: 'Active',
    dateOfJoining: now.slice(0, 10),
    workLocation: 'Head Office',
    createdAt: now,
    updatedAt: now,
    source: 'client-account-manager',
  })

  window.dispatchEvent(new Event('wiseflow-project-management-refresh'))
  return employeeAccountManagerName(record) || managerName
}

export function buildEmptyClient(overrides: Partial<ClientRecord> & Pick<ClientRecord, 'id' | 'name' | 'email' | 'phone' | 'industry' | 'companyType' | 'billingAddress' | 'accountManager'>): ClientRecord {
  const now = new Date()
  const createdAt = overrides.createdAt || now.toISOString().slice(0, 10)
  const website = overrides.website || ''
  const activeCompany = getActiveCompany()

  return {
    companyId: activeCompany?.id,
    clientType: 'Commercial',
    photo: '',
    company: website.replace(/^https?:\/\//, '') || `${slugify(overrides.name)}.com`,
    website,
    status: 'Active',
    companySize: '-',
    annualRevenue: '-',
    taxId: '-',
    defaultCurrency: 'PHP - Philippine Peso',
    paymentTerms: '-',
    tags: [],
    description: 'No client description added yet.',
    createdAt,
    lastContact: overrides.lastContact || now.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }),
    totalProjects: 0,
    activeProjects: 0,
    completedProjects: 0,
    onHoldProjects: 0,
    totalRevenue: 0,
    paidRevenue: 0,
    outstandingRevenue: 0,
    invoices: emptyInvoices,
    contracts: 0,
    documents: 0,
    contacts: [],
    activities: [],
    notes: [],
    ...overrides,
  }
}

function loadLegacyClients() {
  if (typeof window === 'undefined') return []
  const activeCompany = getActiveCompany()

  try {
    const parsed = readLegacyBusinessRows<unknown>([clientsStorageKey])
    const clients = parsed
      .filter(isClientRecord)
      .filter(client => !legacyDemoClientIds.has(client.id))
      .map(client => ({ ...client, companyId: client.companyId || activeCompany?.id }))
      .filter(client => !activeCompany?.id || client.companyId === activeCompany.id)
    return clients
  } catch {
    return []
  }
}

export async function loadClients(): Promise<ClientLoadResult> {
  const legacyClients = loadLegacyClients()

  try {
    const serverRows = await listBusinessRecords<ClientRecord>('clients')
    const serverClients = serverRows.filter(isClientRecord)

    if (serverClients.length || !legacyClients.length) {
      return { clients: serverClients, source: 'server' }
    }

    const migratedClients = await Promise.all(legacyClients.map(client => upsertBusinessRecord<ClientRecord>('clients', client)))
    clearLegacyBusinessRows([clientsStorageKey])
    return { clients: migratedClients.filter(isClientRecord), source: 'server' }
  } catch (error) {
    if (process.env.NODE_ENV !== 'production' && legacyClients.length) {
      return {
        clients: legacyClients,
        source: 'legacy',
        error: error instanceof Error ? error.message : 'Business records API is unavailable.',
      }
    }

    return {
      clients: [],
      source: 'unavailable',
      error: error instanceof Error ? error.message : 'Business records API is unavailable.',
    }
  }
}

export async function saveClient(client: ClientRecord): Promise<{ client: ClientRecord; source: ClientSource; error?: string }> {
  const savedClient = await upsertBusinessRecord<ClientRecord>('clients', client)
  return { client: savedClient, source: 'server' }
}

export async function deleteClient(id: string): Promise<{ source: ClientSource; error?: string }> {
  await deleteBusinessRecord('clients', id)
  return { source: 'server' }
}

export async function findClient(rawId: string | string[] | undefined): Promise<{ client?: ClientRecord; source: ClientSource; error?: string }> {
  const id = decodeURIComponent(Array.isArray(rawId) ? rawId[0] || '' : rawId || '')
  const result = await loadClients()
  return {
    client: result.clients.find(client => client.id === id || client.name.toLowerCase() === id.toLowerCase()),
    source: result.source,
    error: result.error,
  }
}

function readStoredRows(key: string): ClientRow[] {
  if (typeof window === 'undefined') return []
  try {
    const parsed = JSON.parse(window.localStorage.getItem(key) || '[]') as unknown
    return Array.isArray(parsed) ? parsed.filter(isObjectRecord) : []
  } catch {
    return []
  }
}

function isClientRecord(value: unknown): value is ClientRecord {
  if (!value || typeof value !== 'object') return false
  const client = value as Partial<ClientRecord>

  return (
    typeof client.id === 'string' &&
    typeof client.name === 'string' &&
    typeof client.company === 'string' &&
    typeof client.email === 'string' &&
    typeof client.phone === 'string' &&
    typeof client.industry === 'string' &&
    (client.status === 'Active' || client.status === 'Inactive')
  )
}

function stringValue(value: unknown, fallback = '') {
  return typeof value === 'string' && value.trim() ? value : fallback
}

function employeeAccountManagerName(row: ClientRow) {
  return stringValue(row.fullName) ||
    [stringValue(row.firstName), stringValue(row.middleName), stringValue(row.lastName)].filter(Boolean).join(' ') ||
    stringValue(row.name) ||
    stringValue(row.displayName) ||
    stringValue(row.email)
}

function isActiveEmployee(row: ClientRow) {
  const status = stringValue(row.employmentStatus) || stringValue(row.status)
  if (!status) return true
  return !/\b(inactive|terminated|resigned|awol|retired|deleted)\b/i.test(status)
}

function nextEmployeeId(rows: ClientRow[]) {
  const numbers = rows
    .map(row => stringValue(row.employeeId))
    .map(employeeId => Number.parseInt(employeeId.replace(/^EMP-/i, ''), 10))
    .filter(Number.isFinite)
  const next = numbers.length ? Math.max(...numbers) + 1 : 1
  return `EMP-${String(next).padStart(4, '0')}`
}

function isObjectRecord(value: unknown): value is ClientRow {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value))
}
