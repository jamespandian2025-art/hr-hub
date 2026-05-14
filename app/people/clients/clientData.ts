'use client'

export type ClientStatus = 'Active' | 'Inactive'

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

export const clientsStorageKey = 'flowsys-clients'

export const accountManagers = ['James Pandian', 'Sarah Johnson', 'Michael Chen', 'Priya Sharma', 'Daniel Lee']

export const seedClients: ClientRecord[] = [
  {
    id: 'horizon-technologies',
    name: 'Horizon Technologies',
    company: 'horizontech.com',
    email: 'contact@horizontech.com',
    phone: '+63 917 123 4567',
    website: 'www.horizontech.com',
    industry: 'Technology',
    status: 'Active',
    companySize: '51 - 200 employees',
    companyType: 'Private',
    annualRevenue: 'PHP 50M - PHP 100M',
    taxId: '123-456-789-000',
    billingAddress: '29th Floor, Tech Tower One, Ayala Avenue, Makati City, Metro Manila, Philippines 1226',
    accountManager: 'James Pandian',
    defaultCurrency: 'PHP - Philippine Peso',
    paymentTerms: 'Net 30',
    tags: ['Enterprise', 'Priority'],
    description: 'Horizon Technologies is a leading provider of cloud-based software solutions and IT consulting services. They help businesses streamline operations and drive digital transformation.',
    createdAt: '2024-01-15',
    lastContact: 'May 06, 2026',
    totalProjects: 5,
    activeProjects: 3,
    completedProjects: 1,
    onHoldProjects: 1,
    totalRevenue: 850000,
    paidRevenue: 725000,
    outstandingRevenue: 125000,
    invoices: { total: 8, paid: 6, unpaid: 2, overdue: 0 },
    contracts: 3,
    documents: 6,
    contacts: [
      { id: 'james-anderson', name: 'James Anderson', role: 'Chief Information Officer', email: 'james.anderson@horizontech.com', phone: '+63 917 888 2345', primary: true },
      { id: 'michelle-reyes', name: 'Michelle Reyes', role: 'Operations Manager', email: 'michelle.reyes@horizontech.com', phone: '+63 918 777 3456' },
      { id: 'daniel-cruz', name: 'Daniel Cruz', role: 'Finance Manager', email: 'daniel.cruz@horizontech.com', phone: '+63 919 654 7890' },
    ],
    activities: [
      { id: 'a1', title: 'Invoice #INV-2026-0042 paid', description: 'Amount: PHP 125,000', date: 'May 06, 2026', time: '2:50 PM', tone: 'green' },
      { id: 'a2', title: 'Project "Website Redesign" updated', description: 'Status changed to In Progress', date: 'May 05, 2026', time: '11:15 AM', tone: 'blue' },
      { id: 'a3', title: 'Contract renewed', description: 'Contract updated and extended for 1 year', date: 'Apr 28, 2026', time: '9:45 AM', tone: 'purple' },
      { id: 'a4', title: 'New project "Mobile App Development" created', description: 'Budget: PHP 280,000', date: 'Apr 20, 2026', time: '4:20 PM', tone: 'orange' },
    ],
    notes: [
      { id: 'n1', title: 'Follow-up on Proposal', body: 'Discussed the Q2 roadmap and submitted proposal for the mobile app phase.', date: 'May 02, 2026', author: 'James Pandian' },
      { id: 'n2', title: 'Contract Renewal', body: 'Client agreed to renew the contract for another 12 months.', date: 'Apr 25, 2026', author: 'Sarah Johnson' },
    ],
  },
  {
    id: 'brightline-corp',
    name: 'Brightline Corp',
    company: 'brightline.ph',
    email: 'info@brightline.ph',
    phone: '+63 918 234 5678',
    website: 'www.brightline.ph',
    industry: 'Construction',
    status: 'Active',
    companySize: '11 - 50 employees',
    companyType: 'Corporation',
    annualRevenue: 'PHP 20M - PHP 50M',
    taxId: '234-567-890-000',
    billingAddress: 'Ortigas Center, Pasig City, Metro Manila',
    accountManager: 'Sarah Johnson',
    defaultCurrency: 'PHP - Philippine Peso',
    paymentTerms: 'Net 15',
    tags: ['Construction'],
    description: 'Commercial fit-out and general construction client focused on office and retail spaces.',
    createdAt: '2026-05-05',
    lastContact: 'May 05, 2026',
    totalProjects: 3,
    activeProjects: 2,
    completedProjects: 1,
    onHoldProjects: 0,
    totalRevenue: 620000,
    paidRevenue: 590000,
    outstandingRevenue: 30000,
    invoices: { total: 5, paid: 4, unpaid: 1, overdue: 0 },
    contracts: 2,
    documents: 4,
    contacts: [{ id: 'ana-reyes', name: 'Ana Reyes', role: 'Procurement Lead', email: 'ana@brightline.ph', phone: '+63 917 231 4567', primary: true }],
    activities: [],
    notes: [],
  },
  {
    id: 'greenpath-solutions',
    name: 'GreenPath Solutions',
    company: 'greenpath.com',
    email: 'hello@greenpath.com',
    phone: '+63 919 345 6789',
    website: 'www.greenpath.com',
    industry: 'Consulting',
    status: 'Active',
    companySize: '51 - 200 employees',
    companyType: 'Private',
    annualRevenue: 'PHP 10M - PHP 20M',
    taxId: '345-678-901-000',
    billingAddress: 'Cebu Business Park, Cebu City',
    accountManager: 'Michael Chen',
    defaultCurrency: 'PHP - Philippine Peso',
    paymentTerms: 'Net 30',
    tags: ['Consulting', 'Retainer'],
    description: 'Sustainability consulting firm with recurring advisory work.',
    createdAt: '2026-05-04',
    lastContact: 'May 04, 2026',
    totalProjects: 4,
    activeProjects: 2,
    completedProjects: 2,
    onHoldProjects: 0,
    totalRevenue: 490000,
    paidRevenue: 450000,
    outstandingRevenue: 40000,
    invoices: { total: 6, paid: 5, unpaid: 1, overdue: 0 },
    contracts: 1,
    documents: 3,
    contacts: [],
    activities: [],
    notes: [],
  },
  {
    id: 'delta-analytics',
    name: 'Delta Analytics',
    company: 'delta-analytics.com',
    email: 'team@delta-analytics.com',
    phone: '+63 920 456 7890',
    website: 'www.delta-analytics.com',
    industry: 'Technology',
    status: 'Inactive',
    companySize: '1 - 10 employees',
    companyType: 'Startup',
    annualRevenue: 'Below PHP 10M',
    taxId: '456-789-012-000',
    billingAddress: 'Bonifacio Global City, Taguig City',
    accountManager: 'Priya Sharma',
    defaultCurrency: 'PHP - Philippine Peso',
    paymentTerms: 'Due on receipt',
    tags: ['Analytics'],
    description: 'Analytics startup with paused implementation work.',
    createdAt: '2026-04-28',
    lastContact: 'Apr 28, 2026',
    totalProjects: 2,
    activeProjects: 0,
    completedProjects: 1,
    onHoldProjects: 1,
    totalRevenue: 230000,
    paidRevenue: 180000,
    outstandingRevenue: 50000,
    invoices: { total: 3, paid: 2, unpaid: 1, overdue: 1 },
    contracts: 1,
    documents: 2,
    contacts: [],
    activities: [],
    notes: [],
  },
  {
    id: 'sunrise-builders',
    name: 'Sunrise Builders',
    company: 'sunrisebuilders.com',
    email: 'projects@sunrise.com',
    phone: '+63 921 567 8901',
    website: 'www.sunrisebuilders.com',
    industry: 'Construction',
    status: 'Active',
    companySize: '201 - 500 employees',
    companyType: 'Corporation',
    annualRevenue: 'PHP 100M+',
    taxId: '567-890-123-000',
    billingAddress: 'Alabang, Muntinlupa City',
    accountManager: 'Daniel Lee',
    defaultCurrency: 'PHP - Philippine Peso',
    paymentTerms: 'Net 60',
    tags: ['Enterprise', 'Construction'],
    description: 'Large construction account with multiple active project sites.',
    createdAt: '2026-04-27',
    lastContact: 'Apr 27, 2026',
    totalProjects: 6,
    activeProjects: 4,
    completedProjects: 2,
    onHoldProjects: 0,
    totalRevenue: 1120000,
    paidRevenue: 1000000,
    outstandingRevenue: 120000,
    invoices: { total: 9, paid: 7, unpaid: 2, overdue: 0 },
    contracts: 4,
    documents: 8,
    contacts: [],
    activities: [],
    notes: [],
  },
]

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

export function loadClients() {
  if (typeof window === 'undefined') return seedClients

  try {
    const stored = window.localStorage.getItem(clientsStorageKey)
    const parsed = stored ? (JSON.parse(stored) as unknown[]) : []
    const validClients = parsed.filter(isClientRecord)
    const storedById = new Map(validClients.map(client => [client.id, client]))
    const mergedSeeds = seedClients.map(client => storedById.get(client.id) || client)
    const customClients = validClients.filter(client => !seedClients.some(seed => seed.id === client.id))
    return [...mergedSeeds, ...customClients]
  } catch {
    return seedClients
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

export function saveClients(clients: ClientRecord[]) {
  window.localStorage.setItem(clientsStorageKey, JSON.stringify(clients))
}

export function findClient(clients: ClientRecord[], rawId: string | string[] | undefined) {
  const id = decodeURIComponent(Array.isArray(rawId) ? rawId[0] || '' : rawId || '')
  return clients.find(client => client.id === id || client.name.toLowerCase() === id.toLowerCase())
}
