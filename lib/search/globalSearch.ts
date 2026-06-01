'use client'

import { companyScopedKey, getActiveCompany } from '@/lib/tenant/company'

export type GlobalSearchResult = {
  id: string
  title: string
  subtitle: string
  module: string
  type: string
  href: string
  keywords: string
}

type StoredRow = Record<string, unknown>

type RowSource = {
  keys: string[]
  module: string
  type: string
  href: string | ((row: StoredRow, id: string) => string)
  titleKeys: string[]
  subtitleKeys?: string[]
}

type StateCollectionSource = Omit<RowSource, 'keys'> & {
  collection: string
}

const ignoredTextKeys = /dataurl|dataUrl|thumbnail|image|photo|avatar|base64|file|blob|content/i

const rowSources: RowSource[] = [
  {
    keys: ['flowsys-clients'],
    module: 'Client Database',
    type: 'Client',
    href: (row, id) => `/people/clients/${encodeURIComponent(id)}`,
    titleKeys: ['name', 'clientName', 'companyName', 'company', 'businessName'],
    subtitleKeys: ['email', 'phone', 'industry', 'stage', 'status', 'address'],
  },
  {
    keys: ['flowsys-suppliers'],
    module: 'Supplier Database',
    type: 'Supplier',
    href: '/supplier-database',
    titleKeys: ['name', 'supplierName', 'companyName', 'vendorName'],
    subtitleKeys: ['email', 'contactEmail', 'phone', 'category', 'type', 'terms'],
  },
  {
    keys: ['flowsys-pricebook-items'],
    module: 'Procurement',
    type: 'Pricebook item',
    href: '/procurement/pricebook',
    titleKeys: ['name', 'itemName', 'description', 'sku'],
    subtitleKeys: ['category', 'supplier', 'unit', 'uom', 'price', 'unitPrice'],
  },
  {
    keys: ['flowsys-procurement-purchase-requests'],
    module: 'Procurement',
    type: 'Purchase request',
    href: '/procurement/purchase-requests',
    titleKeys: ['requestNo', 'prNumber', 'title', 'description', 'projectName'],
    subtitleKeys: ['requestedBy', 'department', 'status', 'priority', 'supplier'],
  },
  {
    keys: ['flowsys-procurement-purchase-orders'],
    module: 'Procurement',
    type: 'Purchase order',
    href: '/procurement/purchase-orders',
    titleKeys: ['poNumber', 'orderNo', 'title', 'supplier', 'projectName'],
    subtitleKeys: ['status', 'requestedBy', 'department', 'total', 'amount'],
  },
  {
    keys: ['flowsys-procurement-rfqs'],
    module: 'Procurement',
    type: 'RFQ',
    href: '/procurement/rfqs',
    titleKeys: ['rfqNumber', 'title', 'projectName', 'supplier'],
    subtitleKeys: ['status', 'requestedBy', 'dueDate', 'category'],
  },
  {
    keys: ['flowsys-procurement-quotations'],
    module: 'Procurement',
    type: 'Quotation',
    href: '/procurement/quotations',
    titleKeys: ['quoteNo', 'quotationNo', 'supplier', 'projectName', 'title'],
    subtitleKeys: ['status', 'amount', 'total', 'validUntil'],
  },
  {
    keys: ['flowsys-procurement-receiving'],
    module: 'Procurement',
    type: 'Receiving',
    href: '/procurement/receiving',
    titleKeys: ['receiptNo', 'poNumber', 'supplier', 'itemName'],
    subtitleKeys: ['status', 'warehouse', 'receivedBy', 'quantity'],
  },
  {
    keys: ['flowsys-hr-employees'],
    module: 'HR Hub',
    type: 'Employee',
    href: (_row, id) => `/hr/employees/${encodeURIComponent(id)}`,
    titleKeys: ['name', 'fullName', 'employeeName', 'displayName'],
    subtitleKeys: ['email', 'employeeCode', 'department', 'role', 'position', 'status'],
  },
  {
    keys: ['flowsys-hr-teams'],
    module: 'HR Hub',
    type: 'Team',
    href: (_row, id) => `/hr/teams/${encodeURIComponent(id)}`,
    titleKeys: ['name', 'teamName', 'department'],
    subtitleKeys: ['lead', 'manager', 'status', 'description'],
  },
  {
    keys: ['flowsys-hr-documents', 'flowsys-hr-employee-documents'],
    module: 'HR Hub',
    type: 'Document',
    href: (_row, id) => `/hr/documents/${encodeURIComponent(id)}`,
    titleKeys: ['title', 'name', 'documentName', 'fileName'],
    subtitleKeys: ['employeeName', 'employeeCode', 'category', 'type', 'status'],
  },
  {
    keys: ['flowsys-hr-leave-requests'],
    module: 'HR Hub',
    type: 'Leave request',
    href: '/hr/leave-requests',
    titleKeys: ['employeeName', 'name', 'type', 'leaveType'],
    subtitleKeys: ['status', 'startDate', 'endDate', 'reason', 'department'],
  },
  {
    keys: ['flowsys-hr-loan-requests'],
    module: 'HR Hub',
    type: 'Loan request',
    href: (_row, id) => `/hr/loan-requests/${encodeURIComponent(id)}`,
    titleKeys: ['employeeName', 'name', 'requestType', 'customLoanType'],
    subtitleKeys: ['status', 'approvalStep', 'amount', 'employeeCode'],
  },
  {
    keys: ['flowsys-hr-payroll-records'],
    module: 'HR Hub',
    type: 'Payroll record',
    href: '/hr/payroll',
    titleKeys: ['employeeName', 'name', 'period', 'payrollPeriod'],
    subtitleKeys: ['employeeCode', 'department', 'status', 'netPay', 'grossPay'],
  },
  {
    keys: ['flowsys-invoices', 'flowsys-accounting-invoices', 'wiseflow-accounting-invoices'],
    module: 'Accounting',
    type: 'Invoice',
    href: '/accounting/invoices',
    titleKeys: ['invoiceNumber', 'number', 'clientName', 'customer', 'projectName'],
    subtitleKeys: ['status', 'amount', 'total', 'dueDate', 'description'],
  },
  {
    keys: ['flowsys-bills', 'flowsys-accounting-bills', 'wiseflow-accounting-bills'],
    module: 'Accounting',
    type: 'Bill',
    href: '/financials/bills',
    titleKeys: ['billNumber', 'number', 'vendor', 'supplier', 'description'],
    subtitleKeys: ['status', 'amount', 'total', 'dueDate'],
  },
  {
    keys: ['flowsys-expenses', 'flowsys-accounting-expenses', 'wiseflow-accounting-expenses'],
    module: 'Accounting',
    type: 'Expense',
    href: '/accounting/transactions',
    titleKeys: ['description', 'merchant', 'vendor', 'category'],
    subtitleKeys: ['status', 'amount', 'date', 'projectName'],
  },
  {
    keys: ['flowsys-transactions', 'flowsys-accounting-transactions', 'wiseflow-accounting-transactions'],
    module: 'Accounting',
    type: 'Transaction',
    href: '/accounting/transactions',
    titleKeys: ['description', 'reference', 'payee', 'memo'],
    subtitleKeys: ['type', 'status', 'amount', 'date', 'account'],
  },
  {
    keys: ['flowsys-budgets', 'flowsys-accounting-budgets', 'wiseflow-accounting-budgets'],
    module: 'Accounting',
    type: 'Budget',
    href: '/accounting/budgeting',
    titleKeys: ['name', 'title', 'projectName', 'category'],
    subtitleKeys: ['period', 'status', 'amount', 'remaining'],
  },
  {
    keys: ['flowsys-bank-accounts', 'flowsys-accounting-bank-accounts', 'wiseflow-bank-accounts'],
    module: 'Accounting',
    type: 'Bank account',
    href: '/accounting/banking',
    titleKeys: ['name', 'accountName', 'bankName', 'accountNumber'],
    subtitleKeys: ['type', 'status', 'balance', 'currency'],
  },
  {
    keys: ['flowsys-assigned-tasks'],
    module: 'Workflows',
    type: 'Task',
    href: '/tasks',
    titleKeys: ['title', 'name', 'description'],
    subtitleKeys: ['assignee', 'status', 'dueDate', 'source'],
  },
]

const salesCollections: StateCollectionSource[] = [
  { collection: 'leads', module: 'Sales', type: 'Lead', href: '/sales?tab=pipeline', titleKeys: ['leadName', 'companyName', 'contactPerson'], subtitleKeys: ['status', 'projectType', 'location', 'salesRep'] },
  { collection: 'opportunities', module: 'Sales', type: 'Opportunity', href: '/sales?tab=pipeline', titleKeys: ['name', 'client', 'projectName'], subtitleKeys: ['stage', 'projectType', 'salesRep', 'expectedCloseDate'] },
  { collection: 'siteVisits', module: 'Sales', type: 'Site visit', href: '/sales?tab=pipeline', titleKeys: ['project', 'client', 'siteAddress'], subtitleKeys: ['status', 'assignedProfessional', 'schedule'] },
  { collection: 'proposals', module: 'Sales', type: 'Proposal', href: '/sales?tab=pipeline', titleKeys: ['projectName', 'client'], subtitleKeys: ['status', 'timeline', 'total', 'validUntil'] },
  { collection: 'contracts', module: 'Sales', type: 'Contract', href: '/sales?tab=pipeline', titleKeys: ['projectName', 'client'], subtitleKeys: ['status', 'contractAmount', 'completionDate'] },
  { collection: 'billings', module: 'Sales', type: 'Progress billing', href: '/sales?tab=reports', titleKeys: ['project', 'milestone'], subtitleKeys: ['status', 'amount', 'dueDate'] },
  { collection: 'clients', module: 'Sales', type: 'Client', href: '/sales?tab=clients', titleKeys: ['companyName', 'contactPerson'], subtitleKeys: ['email', 'phone', 'accountManager'] },
]

const warehouseCollections: StateCollectionSource[] = [
  { collection: 'inventory', module: 'Warehouse', type: 'Inventory item', href: '/warehouse/inventory', titleKeys: ['name', 'sku', 'itemName'], subtitleKeys: ['category', 'warehouse', 'location', 'supplier'] },
  { collection: 'locations', module: 'Warehouse', type: 'Location', href: '/warehouse/locations', titleKeys: ['name', 'code', 'warehouse'], subtitleKeys: ['zone', 'type', 'status'] },
  { collection: 'receiving', module: 'Warehouse', type: 'Receiving', href: '/warehouse/receiving-logs', titleKeys: ['receiptNo', 'poNumber', 'itemName'], subtitleKeys: ['supplier', 'warehouse', 'status'] },
  { collection: 'transfers', module: 'Warehouse', type: 'Transfer', href: '/warehouse/transfers', titleKeys: ['transferNo', 'itemName', 'sku'], subtitleKeys: ['fromWarehouse', 'toWarehouse', 'status'] },
  { collection: 'adjustments', module: 'Warehouse', type: 'Adjustment', href: '/warehouse/adjustments', titleKeys: ['adjustmentNo', 'itemName', 'reason'], subtitleKeys: ['warehouse', 'adjustmentType', 'status'] },
  { collection: 'movements', module: 'Warehouse', type: 'Movement', href: '/warehouse/stock-movements', titleKeys: ['referenceNo', 'itemName', 'sku'], subtitleKeys: ['movementType', 'warehouseFlow', 'status'] },
]

const datasetCollections: StateCollectionSource[] = [
  { collection: 'datasets', module: 'Datasets', type: 'Dataset', href: '/datasets', titleKeys: ['name'], subtitleKeys: ['description', 'folder', 'source', 'status'] },
  { collection: 'folders', module: 'Datasets', type: 'Folder', href: '/datasets', titleKeys: ['name'], subtitleKeys: ['description'] },
  { collection: 'automations', module: 'Datasets', type: 'Automation', href: '/datasets', titleKeys: ['name', 'title'], subtitleKeys: ['description', 'status'] },
  { collection: 'qualityRules', module: 'Datasets', type: 'Quality rule', href: '/datasets', titleKeys: ['name', 'fieldName', 'type'], subtitleKeys: ['description', 'status'] },
]

export function buildGlobalSearchIndex(): GlobalSearchResult[] {
  if (typeof window === 'undefined') return []

  const companyId = getActiveCompany()?.id
  const results: GlobalSearchResult[] = []
  const seen = new Set<string>()

  indexProjectManagement(results, seen, companyId)
  indexStateCollections(results, seen, companyId, 'wiseflow-sales-workspace', salesCollections)
  indexStateCollections(results, seen, companyId, 'wiseflow-warehouse-workspace', warehouseCollections)
  indexStateCollections(results, seen, companyId, 'wiseflow-rework-datasets-workspace', datasetCollections)
  indexDatasetRecords(results, seen, companyId)

  rowSources.forEach(source => {
    source.keys.forEach(key => {
      readRows(key, companyId).forEach(row => {
        addRowResult(results, seen, source, row)
      })
    })
  })

  return results
}

export function searchGlobalRecords(query: string, limit = 10): GlobalSearchResult[] {
  const needle = normalize(query)
  if (needle.length < 2) return []

  return buildGlobalSearchIndex()
    .map(result => ({ result, score: scoreResult(result, needle) }))
    .filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score || a.result.title.localeCompare(b.result.title))
    .slice(0, limit)
    .map(item => item.result)
}

function indexProjectManagement(results: GlobalSearchResult[], seen: Set<string>, companyId?: string) {
  const state = readState('wiseflow-project-management-state', companyId)
  if (!state || (companyId && typeof state.companyId === 'string' && state.companyId !== companyId)) return

  const projects = arrayOfRows(state.projects)
  const tasks = arrayOfRows(state.tasks)
  const milestones = arrayOfRows(state.milestones)
  const documents = arrayOfRows(state.documents)
  const members = arrayOfRows(state.members)
  const clients = arrayOfRows(state.clients)
  const membersById = new Map(members.map(member => [stringValue(member.id), member]))
  const clientsById = new Map(clients.map(client => [stringValue(client.id), client]))
  const projectsById = new Map(projects.map(project => [stringValue(project.id), project]))

  projects.forEach(project => {
    const id = stringValue(project.id)
    const manager = membersById.get(stringValue(project.managerId))
    const client = clientsById.get(stringValue(project.clientId))
    addResult(results, seen, {
      id: `project-management:project:${id}`,
      title: firstText(project, ['name', 'title']),
      subtitle: compact([firstText(project, ['department', 'projectType']), firstText(client, ['name']), firstText(manager, ['name']), firstText(project, ['status'])]).join(' - '),
      module: 'Project Mgmt',
      type: 'Project',
      href: `/project-management/projects?project=${encodeURIComponent(id)}`,
      keywords: compact([searchableRowText(project), searchableRowText(client), searchableRowText(manager)]).join(' '),
    })
  })

  tasks.forEach(task => {
    const id = stringValue(task.id)
    const project = projectsById.get(stringValue(task.projectId))
    const assignee = membersById.get(stringValue(task.assigneeId))
    addResult(results, seen, {
      id: `project-management:task:${id}`,
      title: firstText(task, ['title', 'name']),
      subtitle: compact([firstText(project, ['name']), firstText(assignee, ['name']), firstText(task, ['status']), firstText(task, ['dueDate'])]).join(' - '),
      module: 'Project Mgmt',
      type: 'Task',
      href: `/project-management/tasks/${encodeURIComponent(id)}`,
      keywords: compact([searchableRowText(task), searchableRowText(project), searchableRowText(assignee)]).join(' '),
    })
  })

  milestones.forEach(milestone => {
    const id = stringValue(milestone.id)
    const project = projectsById.get(stringValue(milestone.projectId))
    addResult(results, seen, {
      id: `project-management:milestone:${id}`,
      title: firstText(milestone, ['title', 'name', 'phase']),
      subtitle: compact([firstText(project, ['name']), firstText(milestone, ['status']), firstText(milestone, ['dueDate'])]).join(' - '),
      module: 'Project Mgmt',
      type: 'Milestone',
      href: '/project-management?view=overview',
      keywords: compact([searchableRowText(milestone), searchableRowText(project)]).join(' '),
    })
  })

  documents.forEach(document => {
    const id = stringValue(document.id)
    const project = projectsById.get(stringValue(document.projectId))
    addResult(results, seen, {
      id: `project-management:document:${id}`,
      title: firstText(document, ['name', 'title', 'fileName']),
      subtitle: compact([firstText(project, ['name']), firstText(document, ['type']), firstText(document, ['folder'])]).join(' - '),
      module: 'Project Mgmt',
      type: 'Document',
      href: '/project-management/documents',
      keywords: compact([searchableRowText(document), searchableRowText(project)]).join(' '),
    })
  })

  readRows('flowsys-projects', companyId).forEach(project => {
    const id = stringValue(project.id)
    addResult(results, seen, {
      id: `legacy-project:${id}`,
      title: firstText(project, ['name', 'title', 'projectName']),
      subtitle: compact([firstText(project, ['client', 'clientName']), firstText(project, ['status']), firstText(project, ['department', 'type'])]).join(' - '),
      module: 'Project Mgmt',
      type: 'Project',
      href: `/project-management/projects?project=${encodeURIComponent(id)}`,
      keywords: searchableRowText(project),
    })
  })
}

function indexStateCollections(results: GlobalSearchResult[], seen: Set<string>, companyId: string | undefined, key: string, collections: StateCollectionSource[]) {
  const state = readState(key, companyId)
  if (!state) return

  collections.forEach(source => {
    arrayOfRows(state[source.collection]).forEach(row => {
      if (!rowBelongsToCompany(row, companyId)) return
      addRowResult(results, seen, source, row)
    })
  })
}

function indexDatasetRecords(results: GlobalSearchResult[], seen: Set<string>, companyId?: string) {
  const state = readState('wiseflow-rework-datasets-workspace', companyId)
  if (!state) return

  arrayOfRows(state.datasets).forEach(dataset => {
    const datasetId = stringValue(dataset.id)
    const datasetName = firstText(dataset, ['name'])
    arrayOfRows(dataset.records).forEach(record => {
      const id = stringValue(record.id)
      const values = isRecord(record.values) ? record.values : {}
      addResult(results, seen, {
        id: `datasets:record:${datasetId}:${id}`,
        title: firstText(values, ['name', 'title', 'clientName', 'companyName', 'itemName']) || firstPrimitiveValue(values) || 'Dataset record',
        subtitle: compact([datasetName, firstText(dataset, ['folder', 'source'])]).join(' - '),
        module: 'Datasets',
        type: 'Record',
        href: '/datasets',
        keywords: compact([searchableRowText(values), searchableRowText(record), searchableRowText(dataset)]).join(' '),
      })
    })
  })
}

function addRowResult(results: GlobalSearchResult[], seen: Set<string>, source: Omit<RowSource, 'keys'>, row: StoredRow) {
  const id = stringValue(row.id) || slug(firstText(row, source.titleKeys)) || `${source.module}:${source.type}:${results.length}`
  const title = firstText(row, source.titleKeys)
  if (!title) return
  const href = typeof source.href === 'function' ? source.href(row, id) : source.href
  addResult(results, seen, {
    id: `${source.module}:${source.type}:${id}`,
    title,
    subtitle: firstTexts(row, source.subtitleKeys || []).slice(0, 3).join(' - '),
    module: source.module,
    type: source.type,
    href,
    keywords: searchableRowText(row),
  })
}

function addResult(results: GlobalSearchResult[], seen: Set<string>, result: GlobalSearchResult) {
  const title = result.title.trim()
  if (!title) return
  const key = result.id || `${result.module}:${result.type}:${title}`
  if (seen.has(key)) return
  seen.add(key)
  results.push({
    ...result,
    title,
    subtitle: result.subtitle.trim(),
    keywords: compact([result.title, result.subtitle, result.module, result.type, result.keywords]).join(' '),
  })
}

function scoreResult(result: GlobalSearchResult, needle: string) {
  const title = normalize(result.title)
  const subtitle = normalize(result.subtitle)
  const moduleText = normalize(result.module)
  const type = normalize(result.type)
  const keywords = normalize(result.keywords)

  if (title === needle) return 100
  if (title.startsWith(needle)) return 82
  if (title.includes(needle)) return 68
  if (subtitle.includes(needle)) return 46
  if (moduleText.includes(needle) || type.includes(needle)) return 34
  if (keywords.includes(needle)) return 22
  return 0
}

function readRows(key: string, companyId?: string) {
  const rows: StoredRow[] = []
  const keys = unique([companyId ? companyScopedKey(key, companyId) : key, key])
  keys.forEach(candidate => {
    const parsed = readJson(candidate)
    arrayFromStorage(parsed).forEach(row => {
      if (rowBelongsToCompany(row, companyId)) rows.push(row)
    })
  })

  const seen = new Set<string>()
  return rows.filter(row => {
    const id = stringValue(row.id) || JSON.stringify(row).slice(0, 120)
    if (seen.has(id)) return false
    seen.add(id)
    return true
  })
}

function readState(key: string, companyId?: string) {
  const scoped = companyId ? readJson(companyScopedKey(key, companyId)) : null
  if (isRecord(scoped)) return scoped
  const global = readJson(key)
  return isRecord(global) ? global : null
}

function readJson(key: string): unknown {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(key)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function arrayFromStorage(value: unknown): StoredRow[] {
  if (Array.isArray(value)) return value.filter(isRecord)
  if (!isRecord(value)) return []
  return ['rows', 'items', 'records', 'data', 'entries']
    .flatMap(key => arrayOfRows(value[key]))
}

function arrayOfRows(value: unknown): StoredRow[] {
  return Array.isArray(value) ? value.filter(isRecord) : []
}

function rowBelongsToCompany(row: StoredRow, companyId?: string) {
  if (!companyId) return true
  const candidates = [row.companyId, row.tenantId, row.organizationId, row.orgId]
    .map(value => stringValue(value))
    .filter(Boolean)
  if (!candidates.length) return true
  return candidates.includes(companyId)
}

function firstText(row: StoredRow | undefined, keys: string[]) {
  if (!row) return ''
  for (const key of keys) {
    const value = stringValue(row[key])
    if (value) return value
  }
  return ''
}

function firstTexts(row: StoredRow, keys: string[]) {
  const values = keys.map(key => stringValue(row[key])).filter(Boolean)
  return unique(values)
}

function firstPrimitiveValue(row: StoredRow) {
  for (const [key, value] of Object.entries(row)) {
    if (ignoredTextKeys.test(key)) continue
    const text = stringValue(value)
    if (text) return text
  }
  return ''
}

function searchableRowText(row: StoredRow | undefined) {
  if (!row) return ''
  return Object.entries(row)
    .filter(([key]) => !ignoredTextKeys.test(key))
    .flatMap(([, value]) => primitiveSearchValues(value))
    .join(' ')
    .slice(0, 4000)
}

function primitiveSearchValues(value: unknown): string[] {
  if (typeof value === 'string') return value.length > 240 ? [value.slice(0, 240)] : [value]
  if (typeof value === 'number' || typeof value === 'boolean') return [String(value)]
  if (Array.isArray(value)) return value.flatMap(item => primitiveSearchValues(item)).slice(0, 24)
  if (!isRecord(value)) return []
  return Object.entries(value)
    .filter(([key]) => !ignoredTextKeys.test(key))
    .flatMap(([, nested]) => primitiveSearchValues(nested))
    .slice(0, 24)
}

function stringValue(value: unknown) {
  if (typeof value === 'string') return value.trim()
  if (typeof value === 'number' && Number.isFinite(value)) return String(value)
  return ''
}

function normalize(value: string) {
  return value.toLowerCase().replace(/\s+/g, ' ').trim()
}

function isRecord(value: unknown): value is StoredRow {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function compact(values: Array<string | undefined | null>) {
  return values.map(value => value?.trim() || '').filter(Boolean)
}

function unique(values: string[]) {
  return Array.from(new Set(values))
}

function slug(value: string) {
  return normalize(value).replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
}
