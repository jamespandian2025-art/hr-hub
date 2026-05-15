'use client'

import { getSupabaseBrowserClient, hasSupabaseConfig } from '@/lib/auth/supabaseClient'
import { companyScopedKey, getActiveCompany } from '@/lib/tenant/company'

export type ClientStatus = 'Active' | 'Inactive'
export type ClientSource = 'supabase' | 'local' | 'unavailable'

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
export const accountManagers = ['James Pandian', 'Sarah Johnson', 'Michael Chen', 'Priya Sharma', 'Daniel Lee']

type ClientRow = Record<string, unknown>

const emptyInvoices = { total: 0, paid: 0, unpaid: 0, overdue: 0 }
const legacyDemoClientIds = new Set(['horizon-technologies', 'brightline-corp', 'greenpath-solutions', 'delta-analytics', 'sunrise-builders'])

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

export function buildEmptyClient(overrides: Partial<ClientRecord> & Pick<ClientRecord, 'id' | 'name' | 'email' | 'phone' | 'industry' | 'companyType' | 'billingAddress' | 'accountManager'>): ClientRecord {
  const now = new Date()
  const createdAt = overrides.createdAt || now.toISOString().slice(0, 10)
  const website = overrides.website || ''
  const activeCompany = getActiveCompany()

  return {
    companyId: activeCompany?.id,
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

export function loadLocalClients() {
  if (typeof window === 'undefined') return []
  const activeCompany = getActiveCompany()
  const scopedKey = companyScopedKey(clientsStorageKey, activeCompany?.id)

  try {
    const stored = window.localStorage.getItem(scopedKey)
    const parsed = stored ? (JSON.parse(stored) as unknown[]) : []
    const clients = parsed
      .filter(isClientRecord)
      .filter(client => !legacyDemoClientIds.has(client.id))
      .map(client => ({ ...client, companyId: client.companyId || activeCompany?.id }))
      .filter(client => !activeCompany?.id || client.companyId === activeCompany.id)
    if (clients.length !== parsed.length) saveClientsLocally(clients)
    return clients
  } catch {
    return []
  }
}

export async function loadClients(): Promise<ClientLoadResult> {
  const localClients = loadLocalClients()
  const supabase = getSupabaseBrowserClient()

  if (!supabase || !hasSupabaseConfig()) {
    return {
      clients: localClients,
      source: localClients.length ? 'local' : 'unavailable',
      error: 'Supabase is not configured.',
    }
  }

  const { data, error } = await supabase
    .from('clients')
    .select('*')
    .eq('company_id', getActiveCompany()?.id || '')
    .order('created_at', { ascending: false })

  if (error) {
    return {
      clients: localClients,
      source: localClients.length ? 'local' : 'unavailable',
      error: error.message,
    }
  }

  const clients = (data || []).map(rowToClient).filter(isClientRecord)
  saveClientsLocally(clients)
  return { clients, source: 'supabase' }
}

export async function saveClient(client: ClientRecord): Promise<{ client: ClientRecord; source: ClientSource; error?: string }> {
  const supabase = getSupabaseBrowserClient()

  if (supabase && hasSupabaseConfig()) {
    const { data, error } = await supabase
      .from('clients')
      .upsert(clientToRow(client), { onConflict: 'id' })
      .select()
      .single()

    if (!error && data) {
      const savedClient = rowToClient(data)
      upsertLocalClient(savedClient)
      return { client: savedClient, source: 'supabase' }
    }

    upsertLocalClient(client)
    return { client, source: 'local', error: error?.message || 'Supabase save failed.' }
  }

  upsertLocalClient(client)
  return { client, source: 'local', error: 'Supabase is not configured.' }
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

export function saveClientsLocally(clients: ClientRecord[]) {
  if (typeof window === 'undefined') return
  const activeCompany = getActiveCompany()
  const scopedClients = clients.map(client => ({ ...client, companyId: client.companyId || activeCompany?.id }))
  window.localStorage.setItem(companyScopedKey(clientsStorageKey, activeCompany?.id), JSON.stringify(scopedClients))
}

function upsertLocalClient(client: ClientRecord) {
  const clients = loadLocalClients()
  const nextClients = clients.some(existing => existing.id === client.id)
    ? clients.map(existing => existing.id === client.id ? client : existing)
    : [client, ...clients]

  saveClientsLocally(nextClients)
}

function rowToClient(row: ClientRow): ClientRecord {
  const metadata = objectValue(row.metadata)

  return buildEmptyClient({
    id: stringValue(row.id),
    companyId: stringValue(row.company_id, getActiveCompany()?.id),
    name: stringValue(row.name),
    company: stringValue(row.company, stringValue(row.website)),
    email: stringValue(row.email),
    phone: stringValue(row.phone),
    website: stringValue(row.website),
    industry: stringValue(row.industry),
    status: statusValue(row.status),
    companySize: stringValue(row.company_size, stringValue(metadata.companySize, '-')),
    companyType: stringValue(row.company_type, stringValue(metadata.companyType)),
    annualRevenue: stringValue(row.annual_revenue, stringValue(metadata.annualRevenue, '-')),
    taxId: stringValue(row.tax_id, stringValue(metadata.taxId, '-')),
    billingAddress: stringValue(row.billing_address, stringValue(metadata.billingAddress)),
    accountManager: stringValue(row.account_manager, stringValue(metadata.accountManager)),
    accountManagerAvatar: stringValue(row.account_manager_avatar, stringValue(metadata.accountManagerAvatar)),
    defaultCurrency: stringValue(row.default_currency, stringValue(metadata.defaultCurrency, 'PHP - Philippine Peso')),
    paymentTerms: stringValue(row.payment_terms, stringValue(metadata.paymentTerms, '-')),
    tags: stringArray(row.tags),
    description: stringValue(row.description, stringValue(metadata.description, 'No client description added yet.')),
    createdAt: stringValue(row.created_at, stringValue(metadata.createdAt, new Date().toISOString())).slice(0, 10),
    lastContact: stringValue(row.last_contact, stringValue(metadata.lastContact, '-')),
    totalProjects: numberValue(row.total_projects),
    activeProjects: numberValue(row.active_projects),
    completedProjects: numberValue(row.completed_projects),
    onHoldProjects: numberValue(row.on_hold_projects),
    totalRevenue: numberValue(row.total_revenue),
    paidRevenue: numberValue(row.paid_revenue),
    outstandingRevenue: numberValue(row.outstanding_revenue),
    invoices: invoiceValue(row.invoices),
    contracts: numberValue(row.contracts),
    documents: numberValue(row.documents),
    contacts: arrayValue<ClientContact>(row.contacts),
    activities: arrayValue<ClientActivity>(row.activities),
    notes: arrayValue<ClientNote>(row.notes),
  })
}

function clientToRow(client: ClientRecord) {
  return {
    id: client.id,
    company_id: client.companyId || getActiveCompany()?.id,
    name: client.name,
    company: client.company,
    email: client.email,
    phone: client.phone,
    website: client.website,
    industry: client.industry,
    status: client.status,
    company_size: client.companySize,
    company_type: client.companyType,
    annual_revenue: client.annualRevenue,
    tax_id: client.taxId,
    billing_address: client.billingAddress,
    account_manager: client.accountManager,
    account_manager_avatar: client.accountManagerAvatar || null,
    default_currency: client.defaultCurrency,
    payment_terms: client.paymentTerms,
    tags: client.tags,
    description: client.description,
    created_at: client.createdAt,
    last_contact: client.lastContact,
    total_projects: client.totalProjects,
    active_projects: client.activeProjects,
    completed_projects: client.completedProjects,
    on_hold_projects: client.onHoldProjects,
    total_revenue: client.totalRevenue,
    paid_revenue: client.paidRevenue,
    outstanding_revenue: client.outstandingRevenue,
    invoices: client.invoices,
    contracts: client.contracts,
    documents: client.documents,
    contacts: client.contacts,
    activities: client.activities,
    notes: client.notes,
    metadata: {
      companySize: client.companySize,
      companyType: client.companyType,
      annualRevenue: client.annualRevenue,
      taxId: client.taxId,
      billingAddress: client.billingAddress,
      accountManager: client.accountManager,
      defaultCurrency: client.defaultCurrency,
      paymentTerms: client.paymentTerms,
    },
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

function numberValue(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0
}

function objectValue(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {}
}

function arrayValue<T>(value: unknown): T[] {
  return Array.isArray(value) ? value as T[] : []
}

function stringArray(value: unknown) {
  return Array.isArray(value) ? value.filter(item => typeof item === 'string') : []
}

function statusValue(value: unknown): ClientStatus {
  return value === 'Inactive' ? 'Inactive' : 'Active'
}

function invoiceValue(value: unknown) {
  const invoices = objectValue(value)
  return {
    total: numberValue(invoices.total),
    paid: numberValue(invoices.paid),
    unpaid: numberValue(invoices.unpaid),
    overdue: numberValue(invoices.overdue),
  }
}
