'use client'

import { type ComponentType, type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import {
  AlarmClock, AlertTriangle, Award,
  BadgeDollarSign, Boxes, Building2,
  CalendarDays, CheckCircle2, ChevronDown, ChevronRight,
  ClipboardList, FileText, FolderKanban,
  HandCoins, Package, Plus,
  Receipt, ShoppingBag, ShoppingCart,
  Target, TrendingDown, TrendingUp,
  UserPlus, UsersRound, Wallet, Warehouse, Zap,
} from 'lucide-react'
import { listBusinessRecords, replaceBusinessCollection } from '@/lib/business/client'
import type { BusinessCollection } from '@/lib/business/collections'
import { loadAccountingData, refreshAccountingData } from '@/lib/accounting/data'
import { loadWarehouseState, refreshWarehouseState } from '@/lib/warehouse/store'
import { companyChangeEvent, companyScopedKey, getActiveCompany } from '@/lib/tenant/company'

const font = "var(--font-body)"
const display = "var(--font-body)"

// --- Types ------------------------------------------------------------------

type DashboardId = string | number
type StoredRow = Record<string, unknown>

interface ProjectRecord {
  id: DashboardId; name?: string; title?: string
  projectCost?: number; paidAmount?: number; unpaidAmount?: number
  materialCost?: number; laborCost?: number; overheadProfit?: number; generalExpense?: number
  status?: string; health?: string; startDate?: string; endDate?: string; createdAt?: string
  source?: 'project-management' | 'legacy'
}
interface TaskRecord {
  id: DashboardId; title?: string; projectId?: DashboardId; stageId?: string
  status?: string; dueDate?: string; createdAt?: string; assignee?: string; source?: 'assigned-tasks' | 'project-management' | 'workflow'
}
interface ClientRecord  { id: DashboardId; name?: string; createdAt?: string }
interface SupplierRecord { id: DashboardId; name?: string; createdAt?: string }
interface OpportunityRecord {
  id: DashboardId; name?: string; quotation?: number; approvedBudget?: number; estimatedCost?: number
  status?: string; startDate?: string; createdAt?: string; source?: string
}
interface InvoiceRecord {
  id: DashboardId; customer?: string; amount?: number; paid?: number; balanceDue?: number
  status?: string; issueDate?: string; dueDate?: string; createdAt?: string
}
interface BillRecord {
  id: DashboardId; name?: string; associated?: string; amount?: number; paid?: number; balanceDue?: number
  status?: string; date?: string; createdAt?: string; type?: string
}
interface BasicRecord {
  id: DashboardId; name?: string; amount?: number; total?: number; status?: string; date?: string; createdAt?: string; dueDate?: string
  stock?: number; minLevel?: number
}
interface EmployeeRecord { id: DashboardId; name?: string; fullName?: string; status?: string; createdAt?: string }
interface ProcurementRecord { id: DashboardId; name?: string; status?: string; amount?: number; date?: string; createdAt?: string }
interface AccountRecord { name?: string; email?: string; company?: string; theme?: string; role?: string }
interface ActivityItem {
  id: string; type: 'project' | 'task' | 'client' | 'payment' | 'opportunity' | 'supplier'
  description: string; subtext: string; date: Date
}

type ProjectManagementDashboardState = {
  companyId?: string
  clients?: Array<{ id?: DashboardId; name?: string }>
  members?: Array<{ id?: DashboardId; name?: string; fullName?: string }>
  projects?: Array<StoredRow>
  tasks?: Array<StoredRow>
  activities?: Array<StoredRow>
}

type SalesWorkspaceDashboardData = {
  leads?: StoredRow[]
  opportunities?: StoredRow[]
  proposals?: StoredRow[]
  contracts?: StoredRow[]
  billings?: StoredRow[]
  clients?: StoredRow[]
}

// --- Helpers ----------------------------------------------------------------

function loadStored<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback
  try { const r = window.localStorage.getItem(key); return r ? JSON.parse(r) as T : fallback } catch { return fallback }
}
function money(v: number) { return `PHP ${v.toLocaleString('en-PH', { maximumFractionDigits: 0 })}` }
function pct(v: number, t: number) { return t ? Math.max(0, Math.min(100, Math.round((v / t) * 100))) : 0 }
function norm(s?: string) { return (s || '').trim().toLowerCase() }
function parseDate(v?: string): Date | null {
  if (!v) return null; const d = v.includes('T') ? new Date(v) : new Date(`${v}T00:00:00`); return isNaN(d.getTime()) ? null : d
}
function addMonths(d: Date, n: number) { return new Date(d.getFullYear(), d.getMonth() + n, 1) }
function monthKey(d: Date) { return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}` }
function monthLabel(k: string) { const [y, m] = k.split('-').map(Number); return new Date(y, m - 1, 1).toLocaleDateString('en-PH', { month: 'short', year: '2-digit' }) }
function timeAgo(d: Date) {
  const diff = Date.now() - d.getTime()
  const mins = Math.floor(diff / 60000), hrs = Math.floor(diff / 3600000), days = Math.floor(diff / 86400000)
  if (days >= 1) return `${days}d ago`; if (hrs >= 1) return `${hrs}h ago`; if (mins >= 1) return `${mins}m ago`; return 'just now'
}
function urgency(due?: string): 'High' | 'Medium' | 'Low' | null {
  const d = parseDate(due); if (!d) return null
  const days = Math.ceil((d.getTime() - Date.now()) / 86400000)
  return days <= 1 ? 'High' : days <= 7 ? 'Medium' : 'Low'
}
function trend(cur: number, prv: number): { text: string; up: boolean; zero: boolean } {
  if (!prv && !cur) return { text: '0% vs last', up: true, zero: true }
  if (!prv) return { text: 'New this period', up: true, zero: false }
  const ch = ((cur - prv) / prv) * 100
  const pct = Math.round(Math.abs(ch))
  return { text: `${ch >= 0 ? '+' : '-'}${pct}% vs last`, up: ch >= 0, zero: ch === 0 }
}
function forecastPct(actual: number, forecast: number) {
  if (!forecast) return actual ? 100 : 0
  return Math.max(0, Math.round((actual / forecast) * 100))
}
function forecastTrend(actual: number, forecast: number, inverse = false) {
  const percent = forecastPct(actual, forecast)
  const gap = forecast - actual
  const onPlan = inverse ? actual <= forecast : actual >= forecast
  return {
    text: `${percent}% of forecast`,
    up: onPlan,
    zero: !actual && !forecast,
    gap,
    percent,
  }
}
function greeting() { const h = new Date().getHours(); return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening' }

const projectStateKey = 'wiseflow-project-management-state'
const salesWorkspaceKey = 'wiseflow-sales-workspace'
const legacyProjectKey = 'flowsys-projects'
const assignedTasksKey = 'flowsys-assigned-tasks'
const demoProjectIds = new Set(['prj-001', 'prj-002', 'prj-003', 'prj-004', 'prj-005', 'prj-006'])
const demoTaskIds = new Set(['tsk-001', 'tsk-002', 'tsk-003', 'tsk-004', 'tsk-005', 'tsk-006'])
const procurementCollections: BusinessCollection[] = [
  'procurement-purchase-requests',
  'procurement-purchase-orders',
  'procurement-rfqs',
  'procurement-quotations',
  'procurement-receiving',
]
const procurementKeys = [
  'flowsys-procurement-purchase-requests',
  'flowsys-procurement-purchase-orders',
  'flowsys-procurement-rfqs',
  'flowsys-procurement-quotations',
  'flowsys-procurement-receiving',
]

function isRecord(value: unknown): value is StoredRow {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value))
}

function textOf(row: StoredRow, keys: string[], fallback = '') {
  for (const key of keys) {
    const value = row[key]
    if (typeof value === 'string' && value.trim()) return value.trim()
    if (typeof value === 'number' && Number.isFinite(value)) return String(value)
  }
  return fallback
}

function numberOf(row: StoredRow, keys: string[], fallback = 0) {
  for (const key of keys) {
    const value = row[key]
    if (typeof value === 'number' && Number.isFinite(value)) return value
    if (typeof value === 'string') {
      const parsed = Number(value.replace(/[^0-9.-]+/g, ''))
      if (Number.isFinite(parsed)) return parsed
    }
  }
  return fallback
}

function arrayOfRecords(value: unknown) {
  return Array.isArray(value) ? value.filter(isRecord) : []
}

function uniqueByDashboardId<T extends { id: DashboardId }>(rows: T[]) {
  const seen = new Set<string>()
  return rows.filter((row, index) => {
    const key = String(row.id || `row-${index}`)
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

function loadStoredRows<T>(key: string, companyId = getActiveCompany()?.id) {
  const rows: T[] = []
  const scopedKey = companyId ? companyScopedKey(key, companyId) : ''
  for (const storageKey of [scopedKey, key].filter(Boolean)) {
    const value = loadStored<T[]>(storageKey, [])
    if (Array.isArray(value)) rows.push(...value)
  }
  return rows
}

async function safeListBusinessRecords<T extends object>(collection: BusinessCollection) {
  return listBusinessRecords<T>(collection).catch(() => [] as T[])
}

function normalizeProjectState(value: unknown, companyId: string): ProjectManagementDashboardState | null {
  if (!isRecord(value)) return null
  const state = value as ProjectManagementDashboardState
  const projects = arrayOfRecords(state.projects).filter(project => !demoProjectIds.has(String(project.id || '')) && !project.archivedAt)
  const tasks = arrayOfRecords(state.tasks).filter(task => !demoTaskIds.has(String(task.id || '')) && !task.archivedAt)
  const members = arrayOfRecords(state.members).map(member => ({
    id: textOf(member, ['id', 'userId', 'employeeId']),
    name: textOf(member, ['name', 'fullName', 'displayName']),
  }))
  return {
    ...state,
    companyId: state.companyId || companyId,
    projects,
    tasks,
    members,
    activities: arrayOfRecords(state.activities),
  }
}

async function loadProjectDashboardState(companyId: string) {
  const serverRows = await safeListBusinessRecords<ProjectManagementDashboardState>('project-management-state')
  const serverState = serverRows.map(row => normalizeProjectState(row, companyId)).find(Boolean)
  if (serverState) return serverState

  const storedState = loadStored<ProjectManagementDashboardState | null>(projectStateKey, null)
    || loadStored<ProjectManagementDashboardState | null>(companyScopedKey(projectStateKey, companyId), null)
  return normalizeProjectState(storedState, companyId)
}

function mapProjectManagementProject(row: StoredRow, index: number): ProjectRecord {
  const budget = numberOf(row, ['budget', 'projectCost', 'amount', 'total'])
  const spent = numberOf(row, ['spent', 'actual', 'materialCost'])
  const committed = numberOf(row, ['committed', 'unpaidAmount', 'balanceDue'])
  return {
    id: textOf(row, ['id'], `project-${index + 1}`),
    name: textOf(row, ['name', 'title'], `Project ${index + 1}`),
    projectCost: budget,
    paidAmount: numberOf(row, ['paidAmount', 'paid'], 0),
    unpaidAmount: committed,
    materialCost: spent,
    laborCost: numberOf(row, ['laborCost']),
    overheadProfit: numberOf(row, ['overheadProfit']),
    generalExpense: numberOf(row, ['generalExpense']),
    status: textOf(row, ['status'], 'In Progress'),
    health: textOf(row, ['health'], ''),
    startDate: textOf(row, ['startDate', 'createdAt', 'date']),
    endDate: textOf(row, ['dueDate', 'endDate']),
    createdAt: textOf(row, ['createdAt', 'updatedAt', 'startDate']),
    source: 'project-management',
  }
}

function mapLegacyProject(row: StoredRow, index: number): ProjectRecord {
  const projectCost = numberOf(row, ['projectCost', 'budget', 'amount', 'total'])
  return {
    id: textOf(row, ['id', 'projectId'], `legacy-project-${index + 1}`),
    name: textOf(row, ['name', 'title', 'projectName'], `Project ${index + 1}`),
    projectCost,
    paidAmount: numberOf(row, ['paidAmount', 'paid', 'paidRevenue']),
    unpaidAmount: numberOf(row, ['unpaidAmount', 'balanceDue', 'committed'], Math.max(projectCost - numberOf(row, ['paidAmount', 'paid', 'paidRevenue']), 0)),
    materialCost: numberOf(row, ['materialCost', 'directCost', 'spent']),
    laborCost: numberOf(row, ['laborCost']),
    overheadProfit: numberOf(row, ['overheadProfit', 'overhead']),
    generalExpense: numberOf(row, ['generalExpense', 'expense']),
    status: textOf(row, ['status'], 'In Progress'),
    health: textOf(row, ['health'], ''),
    startDate: textOf(row, ['startDate', 'date', 'createdAt']),
    endDate: textOf(row, ['endDate', 'dueDate']),
    createdAt: textOf(row, ['createdAt', 'startDate', 'date']),
    source: 'legacy',
  }
}

function mapProjectManagementTask(row: StoredRow, state: ProjectManagementDashboardState): TaskRecord {
  const assigneeId = textOf(row, ['assigneeId', 'ownerId', 'employeeId'])
  const member = (state.members || []).find(item => String(item.id || '') === assigneeId)
  const status = textOf(row, ['status'], 'Open')
  return {
    id: textOf(row, ['id'], `task-${Date.now()}`),
    title: textOf(row, ['title', 'name'], 'Untitled task'),
    projectId: textOf(row, ['projectId']),
    status: status === 'Done' ? 'Completed' : status,
    dueDate: textOf(row, ['dueDate', 'date']),
    createdAt: textOf(row, ['createdAt', 'updatedAt', 'startDate', 'dueDate']),
    assignee: member?.name || assigneeId || textOf(row, ['assignee', 'owner']),
    stageId: textOf(row, ['stageId', 'status']),
    source: 'project-management',
  }
}

function mapAssignedTask(row: StoredRow, index: number): TaskRecord {
  return {
    id: textOf(row, ['id', 'taskId'], `assigned-task-${index + 1}`),
    title: textOf(row, ['title', 'name', 'description'], `Task ${index + 1}`),
    projectId: textOf(row, ['projectId']),
    status: textOf(row, ['status'], 'Open'),
    dueDate: textOf(row, ['dueDate', 'date']),
    createdAt: textOf(row, ['createdAt', 'startDate', 'dueDate']),
    assignee: textOf(row, ['assignee', 'owner', 'assignedTo']),
    stageId: textOf(row, ['stageId']),
    source: 'assigned-tasks',
  }
}

function mapClient(row: StoredRow, index: number): ClientRecord {
  return {
    id: textOf(row, ['id', 'clientId', 'customerId'], `client-${index + 1}`),
    name: textOf(row, ['name', 'company', 'companyName', 'clientName', 'customer'], `Client ${index + 1}`),
    createdAt: textOf(row, ['createdAt', 'lastContact', 'lastInteraction']),
  }
}

function mapSupplier(row: StoredRow, index: number): SupplierRecord {
  return {
    id: textOf(row, ['id', 'supplierId', 'vendorId'], `supplier-${index + 1}`),
    name: textOf(row, ['name', 'supplier', 'vendor', 'companyName'], `Supplier ${index + 1}`),
    createdAt: textOf(row, ['createdAt', 'date']),
  }
}

function mapOpportunity(row: StoredRow, index: number, source = 'Sales'): OpportunityRecord {
  const value = numberOf(row, ['quotation', 'approvedBudget', 'estimatedContractValue', 'contractValue', 'amount', 'total', 'estimatedBudget'])
  return {
    id: textOf(row, ['id', 'opportunityId', 'leadId'], `${source.toLowerCase()}-${index + 1}`),
    name: textOf(row, ['name', 'projectName', 'title', 'leadName'], `Opportunity ${index + 1}`),
    quotation: numberOf(row, ['quotation', 'estimatedContractValue', 'contractValue', 'amount', 'total'], value),
    approvedBudget: numberOf(row, ['approvedBudget', 'budget'], 0),
    estimatedCost: numberOf(row, ['estimatedCost', 'estimatedBudget'], value),
    status: textOf(row, ['stage', 'status'], 'Lead'),
    startDate: textOf(row, ['expectedCloseDate', 'closeDate', 'startDate', 'createdDate', 'date']),
    createdAt: textOf(row, ['createdAt', 'createdDate', 'expectedCloseDate', 'date']),
    source: textOf(row, ['source'], source),
  }
}

function salesWorkspaceRows(workspace: SalesWorkspaceDashboardData | null): OpportunityRecord[] {
  if (!workspace) return []
  return [
    ...arrayOfRecords(workspace.leads).map((row, index) => mapOpportunity({ ...row, status: textOf(row, ['status'], 'Lead') }, index, 'Lead')),
    ...arrayOfRecords(workspace.opportunities).map((row, index) => mapOpportunity(row, index, 'Sales')),
    ...arrayOfRecords(workspace.proposals).map((row, index) => mapOpportunity({ ...row, stage: textOf(row, ['status'], 'Proposal'), estimatedContractValue: numberOf(row, ['total']) }, index, 'Proposal')),
    ...arrayOfRecords(workspace.contracts).map((row, index) => mapOpportunity({ ...row, stage: textOf(row, ['status'], 'Awarded'), estimatedContractValue: numberOf(row, ['contractAmount']) }, index, 'Contract')),
    ...arrayOfRecords(workspace.billings).map((row, index) => mapOpportunity({ ...row, name: textOf(row, ['project', 'milestone']), stage: textOf(row, ['status'], 'Billing'), estimatedContractValue: numberOf(row, ['amount']) }, index, 'Billing')),
  ]
}

function mapInvoice(row: StoredRow, index: number): InvoiceRecord {
  const amount = numberOf(row, ['amount', 'total', 'balance'])
  const paid = numberOf(row, ['paid', 'paidAmount'], ['paid', 'completed'].includes(norm(textOf(row, ['status']))) ? amount : 0)
  return {
    id: textOf(row, ['id', 'invoiceNo', 'invoiceNumber', 'number'], `invoice-${index + 1}`),
    customer: textOf(row, ['customer', 'recipient', 'client', 'company']),
    amount,
    paid,
    balanceDue: numberOf(row, ['balanceDue', 'balance'], Math.max(amount - paid, 0)),
    status: textOf(row, ['status'], 'Draft'),
    issueDate: textOf(row, ['issueDate', 'dateCreated', 'date', 'createdAt']),
    dueDate: textOf(row, ['dueDate']),
    createdAt: textOf(row, ['createdAt', 'issueDate', 'dateCreated', 'date']),
  }
}

function mapBill(row: StoredRow, index: number, type = 'Bill'): BillRecord {
  const amount = numberOf(row, ['amount', 'total', 'cost'])
  const paid = numberOf(row, ['paid', 'paidAmount'], ['paid', 'completed', 'recorded'].includes(norm(textOf(row, ['status']))) ? amount : 0)
  return {
    id: textOf(row, ['id', 'billNo', 'billNumber', 'reference'], `${type.toLowerCase()}-${index + 1}`),
    name: textOf(row, ['name', 'description', 'merchant', 'vendor'], `${type} ${index + 1}`),
    associated: textOf(row, ['associated', 'project', 'category']),
    amount,
    paid,
    balanceDue: numberOf(row, ['balanceDue', 'balance'], Math.max(amount - paid, 0)),
    status: textOf(row, ['status'], type === 'Expense' ? 'Recorded' : 'Unpaid'),
    date: textOf(row, ['date', 'billDate', 'issueDate', 'expenseDate', 'createdAt']),
    createdAt: textOf(row, ['createdAt', 'date', 'expenseDate']),
    type,
  }
}

function mapBudget(row: StoredRow, index: number): BasicRecord {
  return {
    id: textOf(row, ['id'], `budget-${index + 1}`),
    name: textOf(row, ['name', 'title'], `Budget ${index + 1}`),
    amount: numberOf(row, ['amount', 'total', 'budget']),
    total: numberOf(row, ['total', 'budget', 'amount']),
    status: textOf(row, ['status'], 'Draft'),
    date: textOf(row, ['date', 'createdAt']),
    createdAt: textOf(row, ['createdAt', 'date']),
  }
}

function mapWarehouseAlert(row: StoredRow, index: number): BasicRecord {
  return {
    id: textOf(row, ['id', 'sku'], `inventory-${index + 1}`),
    name: textOf(row, ['name', 'itemName', 'sku'], `Inventory item ${index + 1}`),
    amount: numberOf(row, ['stock', 'quantity', 'amount']),
    total: numberOf(row, ['stock', 'quantity', 'amount']),
    status: textOf(row, ['status'], ''),
    date: textOf(row, ['updatedAt', 'createdAt']),
    createdAt: textOf(row, ['createdAt']),
    stock: numberOf(row, ['stock', 'quantity']),
    minLevel: numberOf(row, ['minLevel', 'minimumStock', 'reorderPoint']),
  }
}

function mapProcurement(row: StoredRow, index: number): ProcurementRecord {
  return {
    id: textOf(row, ['id', 'requestNo', 'poNumber', 'rfqNo', 'quotationNo', 'receiptNo'], `procurement-${index + 1}`),
    name: textOf(row, ['title', 'name', 'requestNo', 'poNumber', 'rfqNo', 'quotationNo', 'supplier'], `Procurement ${index + 1}`),
    status: textOf(row, ['status'], 'Pending'),
    amount: numberOf(row, ['amount', 'total', 'grandTotal', 'estimatedAmount']),
    date: textOf(row, ['date', 'createdAt', 'dueDate']),
    createdAt: textOf(row, ['createdAt', 'date']),
  }
}

// --- Dashboard --------------------------------------------------------------

export default function Dashboard() {
  const [tab, setTab] = useState('Projects')
  // Dropdown open state
  const [newOpen, setNewOpen]   = useState(false)
  const [dateOpen, setDateOpen] = useState(false)
  const newRef  = useRef<HTMLDivElement>(null)
  const dateRef = useRef<HTMLDivElement>(null)
  // Chart filter selections — Projects tab
  const [perfFilter,   setPerfFilter]   = useState('All Projects')
  const [healthFilter, setHealthFilter] = useState('All Projects')
  const [salesPeriod,  setSalesPeriod]  = useState('This Year')
  const [finPeriod,    setFinPeriod]    = useState('This Month')
  // Chart filter selections — Sales tab
  const [salePipeFilter,   setSalePipeFilter]   = useState('This Month')
  const [revTrendFilter,   setRevTrendFilter]   = useState('This Month')
  const [topDealsFilter,   setTopDealsFilter]   = useState('This Month')
  const [salesSourceFilter,setSalesSourceFilter] = useState('This Month')
  // Chart filter selections — Financials tab
  const [incExpFilter,  setIncExpFilter]  = useState('This Month')
  const [cashFlowFilter,setCashFlowFilter] = useState('This Month')
  const [budgetFilter,  setBudgetFilter]  = useState('This Year')
  // Chart filter selections — Operations tab
  const [wfFilter,    setWfFilter]    = useState('This Week')
  const [taskFilter,  setTaskFilter]  = useState('This Week')
  const [twFilter,    setTwFilter]    = useState('This Week')
  const [procFilter,  setProcFilter]  = useState('All Requests')
  const [invFilter,   setInvFilter]   = useState('All Locations')

  const [account, setAccount]       = useState<AccountRecord>({})
  const [projects, setProjects]     = useState<ProjectRecord[]>([])
  const [tasks, setTasks]           = useState<TaskRecord[]>([])
  const [clients, setClients]       = useState<ClientRecord[]>([])
  const [suppliers, setSuppliers]   = useState<SupplierRecord[]>([])
  const [warehouses, setWarehouses] = useState<BasicRecord[]>([])
  const [opps, setOpps]             = useState<OpportunityRecord[]>([])
  const [invoices, setInvoices]     = useState<InvoiceRecord[]>([])
  const [bills, setBills]           = useState<BillRecord[]>([])
  const [budgets, setBudgets]       = useState<BasicRecord[]>([])
  const [employees, setEmployees]   = useState<EmployeeRecord[]>([])
  const [procurement, setProcurement] = useState<ProcurementRecord[]>([])
  const [projectDashboardState, setProjectDashboardState] = useState<ProjectManagementDashboardState | null>(null)

  useEffect(() => {
    let cancelled = false

    const hydrate = async () => {
      const companyId = getActiveCompany()?.id || ''
      setAccount(loadStored('flowsys-account', {}))

      const projectStatePromise = loadProjectDashboardState(companyId)
      const accountingPromise = refreshAccountingData().catch(() => loadAccountingData())
      const warehousePromise = refreshWarehouseState().catch(() => loadWarehouseState())
      const [
        projectState,
        accounting,
        warehouse,
        legacyProjects,
        serverLegacyProjects,
        assignedTasks,
        serverAssignedTasks,
        workflowTodos,
        serverClients,
        serverSuppliers,
        legacyOpportunities,
        serverOpportunities,
        salesWorkspaceRowsFromServer,
        procurementServerGroups,
      ] = await Promise.all([
        projectStatePromise,
        accountingPromise,
        warehousePromise,
        Promise.resolve(loadStoredRows<StoredRow>(legacyProjectKey, companyId)),
        safeListBusinessRecords<StoredRow>('project-legacy-records'),
        Promise.resolve(loadStoredRows<StoredRow>(assignedTasksKey, companyId)),
        safeListBusinessRecords<StoredRow>('assigned-tasks'),
        safeListBusinessRecords<StoredRow>('workflow-todos'),
        safeListBusinessRecords<StoredRow>('clients'),
        safeListBusinessRecords<StoredRow>('suppliers'),
        Promise.resolve(loadStoredRows<StoredRow>('flowsys-opportunities', companyId)),
        safeListBusinessRecords<StoredRow>('opportunities'),
        safeListBusinessRecords<SalesWorkspaceDashboardData>('sales-workspace'),
        Promise.all(procurementCollections.map(collection => safeListBusinessRecords<StoredRow>(collection))),
      ])

      const storedSalesWorkspace = loadStored<SalesWorkspaceDashboardData | null>(salesWorkspaceKey, null)
        || loadStored<SalesWorkspaceDashboardData | null>(companyScopedKey(salesWorkspaceKey, companyId), null)
      const activeProjectState = projectState || { companyId, projects: [], tasks: [], members: [], activities: [] }
      const projectRows = [
        ...(activeProjectState.projects || []).map(mapProjectManagementProject),
        ...serverLegacyProjects.map(mapLegacyProject),
        ...legacyProjects.map(mapLegacyProject),
      ]
      const taskRows = [
        ...(activeProjectState.tasks || []).map(task => mapProjectManagementTask(task, activeProjectState)),
        ...serverAssignedTasks.map(mapAssignedTask),
        ...assignedTasks.map(mapAssignedTask),
        ...workflowTodos.map((task, index) => ({ ...mapAssignedTask(task, index), source: 'workflow' as const })),
      ]
      const clientRows = [
        ...serverClients.map(mapClient),
        ...loadStoredRows<StoredRow>('flowsys-clients', companyId).map(mapClient),
      ]
      const supplierRows = [
        ...serverSuppliers.map(mapSupplier),
        ...loadStoredRows<StoredRow>('flowsys-suppliers', companyId).map(mapSupplier),
      ]
      const opportunityRows = [
        ...salesWorkspaceRows(storedSalesWorkspace),
        ...salesWorkspaceRowsFromServer.flatMap(row => salesWorkspaceRows(row)),
        ...serverOpportunities.map((row, index) => mapOpportunity(row, index, 'Opportunity')),
        ...legacyOpportunities.map((row, index) => mapOpportunity(row, index, 'Legacy')),
      ]

      const invoiceRows = accounting.invoices.map((invoice, index) => mapInvoice(invoice as unknown as StoredRow, index))
      const billRows = [
        ...accounting.bills.map((bill, index) => mapBill(bill as unknown as StoredRow, index, 'Bill')),
        ...accounting.expenses.map((expense, index) => mapBill(expense, index, 'Expense')),
        ...loadStoredRows<StoredRow>('flowsys-bills', companyId).map((bill, index) => mapBill(bill, index, 'Bill')),
        ...loadStoredRows<StoredRow>('flowsys-expenses', companyId).map((expense, index) => mapBill(expense, index, 'Expense')),
      ]
      const budgetRows = [
        ...accounting.budgets.map((budget, index) => mapBudget(budget as unknown as StoredRow, index)),
        ...loadStoredRows<StoredRow>('flowsys-budgets', companyId).map(mapBudget),
      ]
      const warehouseInventory = [
        ...warehouse.inventory.map(item => item as unknown as StoredRow),
        ...loadStoredRows<StoredRow>('flowsys-warehouses', companyId),
      ]
      const warehouseAlerts = warehouseInventory
        .map(mapWarehouseAlert)
        .filter(item => {
          if (item.minLevel && item.stock !== undefined) return item.stock <= item.minLevel
          return ['low stock', 'reorder', 'critical'].some(status => norm(item.status).includes(status))
        })
      const employeeRows = loadStoredRows<StoredRow>('flowsys-hr-employees', companyId).map((row, index): EmployeeRecord => ({
        id: textOf(row, ['id', 'employeeId', 'userId'], `employee-${index + 1}`),
        name: textOf(row, ['name', 'fullName', 'displayName']),
        fullName: textOf(row, ['fullName', 'name', 'displayName']),
        status: textOf(row, ['status'], 'Active'),
        createdAt: textOf(row, ['createdAt', 'hireDate']),
      }))
      const procurementRows = [
        ...procurementServerGroups.flat().map(mapProcurement),
        ...procurementKeys.flatMap(key => loadStoredRows<StoredRow>(key, companyId)).map(mapProcurement),
      ]

      if (cancelled) return
      setProjectDashboardState(projectState)
      setProjects(uniqueByDashboardId(projectRows))
      setTasks(uniqueByDashboardId(taskRows))
      setClients(uniqueByDashboardId(clientRows))
      setSuppliers(uniqueByDashboardId(supplierRows))
      setOpps(uniqueByDashboardId(opportunityRows))
      setInvoices(uniqueByDashboardId(invoiceRows))
      setBills(uniqueByDashboardId(billRows))
      setBudgets(uniqueByDashboardId(budgetRows))
      setWarehouses(uniqueByDashboardId(warehouseAlerts))
      setEmployees(uniqueByDashboardId(employeeRows))
      setProcurement(uniqueByDashboardId(procurementRows))
    }

    const refresh = () => { void hydrate() }
    refresh()
    window.addEventListener('storage', refresh)
    window.addEventListener(companyChangeEvent, refresh)
    window.addEventListener('wiseflow-project-management-refresh', refresh)
    window.addEventListener('wiseflow-accounting-refresh', refresh)
    window.addEventListener('wiseflow:warehouse-data-changed', refresh)
    window.addEventListener('wiseflow:finance-requests-changed', refresh)

    return () => {
      cancelled = true
      window.removeEventListener('storage', refresh)
      window.removeEventListener(companyChangeEvent, refresh)
      window.removeEventListener('wiseflow-project-management-refresh', refresh)
      window.removeEventListener('wiseflow-accounting-refresh', refresh)
      window.removeEventListener('wiseflow:warehouse-data-changed', refresh)
      window.removeEventListener('wiseflow:finance-requests-changed', refresh)
    }
  }, [])

  // Close New / Date dropdowns on outside click
  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (newRef.current  && !newRef.current.contains(e.target as Node))  setNewOpen(false)
      if (dateRef.current && !dateRef.current.contains(e.target as Node)) setDateOpen(false)
    }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  // -- Analytics -------------------------------------------------------------
  const stats = useMemo(() => {
    const projectCost = projects.reduce((s, p) => s + (p.projectCost || 0), 0)
    const projectRevenue = projects.reduce((s, p) => s + (p.paidAmount || 0), 0)
    const invoiceRevenue = invoices.reduce((s, invoice) => s + (invoice.paid || 0), 0)
    const revenue   = invoiceRevenue + projectRevenue
    const material  = projects.reduce((s, p) => s + (p.materialCost || 0), 0)
    const labor     = projects.reduce((s, p) => s + (p.laborCost || 0), 0)
    const overhead  = projects.reduce((s, p) => s + (p.overheadProfit || 0), 0)
    const general   = projects.reduce((s, p) => s + (p.generalExpense || 0), 0)
    const expenses  = material + labor + overhead + general + bills.reduce((s, b) => s + (b.amount || 0), 0)
    const pipeline  = opps.reduce((s, o) => s + (o.quotation || o.approvedBudget || o.estimatedCost || 0), 0)
    const profit    = Math.max(revenue - expenses, 0)
    const today     = new Date()
    const openTasks = tasks.filter(t => norm(t.status) !== 'completed').length
    const overdue   = tasks.filter(t => { const d = parseDate(t.dueDate); return d && d < today && norm(t.status) !== 'completed' }).length
    return { projectCost, revenue, expenses, profit, pipeline, openTasks, overdue }
  }, [projects, tasks, opps, bills, invoices])

  const analyticsForecasts = useMemo(() => {
    const projectCost = stats.projectCost || stats.revenue
    const plannedProjectExpense = projects.reduce((s, p) => (
      s + (p.materialCost || 0) + (p.laborCost || 0) + (p.overheadProfit || 0) + (p.generalExpense || 0)
    ), 0)
    const openBills = bills
      .filter(b => norm(b.status) !== 'paid')
      .reduce((s, b) => s + (b.amount || 0), 0)
    const expensesForecast = plannedProjectExpense + openBills
    const profitForecast = Math.max(projectCost - expensesForecast, 0)
    const quotation = opps.reduce((s, o) => s + (o.quotation || 0), 0)
    const approvedBudget = opps.reduce((s, o) => s + (o.approvedBudget || 0), 0)
    const estimatedCost = opps.reduce((s, o) => s + (o.estimatedCost || 0), 0)
    const salesForecast = quotation || approvedBudget || estimatedCost

    return {
      projectCost,
      expenses: expensesForecast || stats.expenses,
      profit: profitForecast || stats.profit,
      quotation: salesForecast || quotation,
      approvedBudget: approvedBudget || quotation,
      estimatedCost: estimatedCost || approvedBudget || quotation,
      revenue: stats.projectCost || stats.revenue,
      netProfit: profitForecast || stats.profit,
      outstanding: invoices.reduce((s, invoice) => s + (invoice.balanceDue || 0), 0) || bills.reduce((s, b) => s + (b.balanceDue || b.amount || 0), 0) || 0,
      budget: budgets.reduce((s, b) => s + (b.total || b.amount || 0), 0),
      quotationDelta: quotation - approvedBudget,
    }
  }, [bills, budgets, opps, projects, stats, invoices])

  // -- Project perf paid/unpaid for subtitle ---------------------------------
  const perfPaid   = useMemo(() => projects.reduce((s, p) => s + (p.paidAmount || 0), 0), [projects])
  const perfUnpaid = useMemo(() => projects.reduce((s, p) => s + (p.unpaidAmount || 0), 0), [projects])

  // -- Timeline --------------------------------------------------------------
  const timeline = useMemo(() => {
    const today = new Date()
    const allDates = [
      ...projects.map(p => parseDate(p.createdAt || p.startDate)),
      ...invoices.map(i => parseDate(i.createdAt || i.issueDate || i.dueDate)),
      ...bills.map(b => parseDate(b.date || b.createdAt)),
    ].filter(Boolean) as Date[]
    const minDate = allDates.length ? new Date(Math.min(...allDates.map(d => d.getTime()))) : addMonths(today, -3)
    const maxDate = allDates.length ? new Date(Math.max(...allDates.map(d => d.getTime()))) : today
    const months: string[] = []
    for (let c = addMonths(new Date(minDate.getFullYear(), minDate.getMonth(), 1), -1); c <= addMonths(new Date(maxDate.getFullYear(), maxDate.getMonth(), 1), 1); c = addMonths(c, 1))
      months.push(monthKey(c))

    const buckets = new Map(months.map(k => [k, { key: k, month: monthLabel(k), project: 0, pipeline: 0, expenses: 0, profit: 0, projectCount: 0 }]))
    projects.forEach(p => {
      const b = buckets.get(monthKey(parseDate(p.createdAt || p.startDate) || today))
      if (!b) return
      const cost = p.projectCost || 0
      const exp  = (p.materialCost || 0) + (p.laborCost || 0) + (p.overheadProfit || 0) + (p.generalExpense || 0)
      b.project += cost; b.expenses += exp; b.profit = Math.max(b.project - b.expenses, 0); b.projectCount += 1
    })
    invoices.forEach(inv => {
      const b = buckets.get(monthKey(parseDate(inv.createdAt || inv.issueDate || inv.dueDate) || today))
      if (b) {
        b.project += inv.paid || 0
        b.profit = Math.max(b.project - b.expenses, 0)
      }
    })
    opps.forEach(o => { const b = buckets.get(monthKey(parseDate(o.createdAt || o.startDate) || today)); if (b) b.pipeline += (o.quotation || o.approvedBudget || 0) })
    bills.forEach(bl => { const b = buckets.get(monthKey(parseDate(bl.date || bl.createdAt) || today)); if (b) { b.expenses += (bl.amount || 0); b.profit = Math.max(b.project - b.expenses, 0) } })

    const cur = buckets.get(monthKey(today))
    const prv = buckets.get(monthKey(addMonths(today, -1)))
    const data = Array.from(buckets.values())
    return { data, cur, prv }
  }, [projects, opps, bills, invoices])

  // -- Derived donuts --------------------------------------------------------
  const perfData = useMemo(() => {
    const paid  = projects.filter(p => (p.paidAmount || 0) >= (p.projectCost || 1) && (p.projectCost || 0) > 0).length
    const unpaid= projects.filter(p => (p.unpaidAmount || 0) > 0 && !(p.paidAmount)).length
    const inProg= projects.filter(p => ['active', 'ongoing', 'in progress', 'review'].includes(norm(p.status))).length
    const onHold= projects.filter(p => ['planning', 'pending', 'on hold'].includes(norm(p.status))).length
    const canc  = projects.filter(p => norm(p.status) === 'cancelled').length
    return [
      { name: 'Paid',        value: paid,   color: '#22c55e' },
      { name: 'Unpaid',      value: unpaid, color: '#ef4444' },
      { name: 'In Progress', value: inProg, color: '#3b82f6' },
      { name: 'On Hold',     value: onHold, color: '#f59e0b' },
      { name: 'Cancelled',   value: canc,   color: '#000000' },
    ].filter(d => d.value > 0)
  }, [projects])

  const healthData = useMemo(() => {
    const today = new Date()
    const onTrack = projects.filter(p => { const e = parseDate(p.endDate); return ['active', 'ongoing', 'in progress', 'completed'].includes(norm(p.status)) && norm(p.health) !== 'at risk' && norm(p.health) !== 'delayed' && (!e || e >= today || norm(p.status) === 'completed') }).length
    const atRisk  = projects.filter(p => norm(p.health) === 'at risk' || norm(p.status).includes('issue') || norm(p.status) === 'blocked').length
    const delayed = projects.filter(p => { const e = parseDate(p.endDate); return norm(p.health) === 'delayed' || Boolean(e && e < today && norm(p.status) !== 'completed') }).length
    return [
      { name: 'On Track', value: onTrack, color: '#22c55e' },
      { name: 'At Risk',  value: atRisk,  color: '#f59e0b' },
      { name: 'Delayed',  value: delayed, color: '#ef4444' },
    ].filter(d => d.value > 0)
  }, [projects])

  // -- Recent activity -------------------------------------------------------
  const activity = useMemo((): ActivityItem[] => {
    const items: ActivityItem[] = []
    projects.forEach(p => { const d = parseDate(p.createdAt); if (d) items.push({ id: `p${p.id}`, type: 'project', description: `Project "${p.name || p.title || 'Untitled'}" created`, subtext: 'Project Management', date: d }) })
    tasks.forEach(t => { const d = parseDate(t.createdAt); if (d) items.push({ id: `t${t.id}`, type: 'task', description: `Task "${t.title || 'Untitled'}" created`, subtext: t.assignee ? `By ${t.assignee}` : 'Tasks', date: d }) })
    clients.forEach(c => { const d = parseDate(c.createdAt); if (d) items.push({ id: `c${c.id}`, type: 'client', description: `Client "${c.name || 'Unknown'}" added`, subtext: 'Client Database', date: d }) })
    suppliers.forEach(s => { const d = parseDate(s.createdAt); if (d) items.push({ id: `s${s.id}`, type: 'supplier', description: `Supplier "${s.name || 'Unknown'}" added`, subtext: 'Supplier Database', date: d }) })
    invoices.filter(i => (i.paid || 0) > 0).forEach(i => { const d = parseDate(i.createdAt || i.issueDate); if (d) items.push({ id: `i${i.id}`, type: 'payment', description: `Invoice paid${i.customer ? ` by ${i.customer}` : ''}`, subtext: money(i.paid || 0), date: d }) })
    bills.filter(b => norm(b.status) === 'paid').forEach(b => { const d = parseDate(b.date || b.createdAt); if (d) items.push({ id: `b${b.id}`, type: 'payment', description: `Payment received${b.associated ? ` for ${b.associated}` : ''}`, subtext: money(b.amount || 0), date: d }) })
    opps.forEach(o => { const d = parseDate(o.createdAt || o.startDate); if (d) items.push({ id: `o${o.id}`, type: 'opportunity', description: `Quote "${o.name || 'Untitled'}" added`, subtext: 'Sales', date: d }) })
    return items.sort((a, b) => b.date.getTime() - a.date.getTime())
  }, [projects, tasks, clients, suppliers, invoices, bills, opps])

  // -- Upcoming tasks --------------------------------------------------------
  const upcoming = useMemo(() => {
    const pMap = new Map(projects.map(p => [p.id, p.name || p.title || 'Unknown']))
    const today = new Date()
    return tasks
      .filter(t => norm(t.status) !== 'completed')
      .filter(t => { const d = parseDate(t.dueDate); return !d || d >= today })
      .sort((a, b) => (parseDate(a.dueDate)?.getTime() ?? Infinity) - (parseDate(b.dueDate)?.getTime() ?? Infinity))
      .slice(0, 5)
      .map(t => ({ ...t, projectName: t.projectId ? pMap.get(t.projectId) : undefined, urge: urgency(t.dueDate) }))
  }, [tasks, projects])

  // -- Trends ----------------------------------------------------------------
  const trends = useMemo(() => ({
    revenue:  trend(timeline.cur?.project || 0, timeline.prv?.project || 0),
    expenses: trend(timeline.cur?.expenses || 0, timeline.prv?.expenses || 0),
    profit:   trend(timeline.cur?.profit || 0, timeline.prv?.profit || 0),
    neutral:  { text: '0% vs last period', up: true, zero: true },
  }), [timeline])

  // -- Chart series ----------------------------------------------------------
  const series = tab === 'Sales'
    ? [{ key: 'pipeline', name: 'Pipeline', color: '#f59e0b' }, { key: 'project', name: 'Won', color: '#22c55e' }]
    : tab === 'Financials'
    ? [{ key: 'expenses', name: 'Expenses', color: '#ef4444' }, { key: 'profit', name: 'Profit', color: '#22c55e' }]
    : [{ key: 'project', name: 'Project Value', color: '#22c55e' }, { key: 'expenses', name: 'Expenses', color: '#000000' }]

  // -- Date range ------------------------------------------------------------
  const dateRange = useMemo(() => {
    const allDates = [
      ...projects.map(p => parseDate(p.createdAt || p.startDate)),
      ...tasks.map(t => parseDate(t.createdAt || t.dueDate)),
      ...invoices.map(i => parseDate(i.createdAt || i.issueDate || i.dueDate)),
      ...bills.map(b => parseDate(b.date || b.createdAt)),
      ...opps.map(o => parseDate(o.createdAt || o.startDate)),
    ].filter(Boolean) as Date[]
    if (!allDates.length) return new Date().toLocaleDateString('en-PH', { month: 'short', day: '2-digit', year: 'numeric' })
    const min = new Date(Math.min(...allDates.map(d => d.getTime())))
    const max = new Date(Math.max(...allDates.map(d => d.getTime())))
    const fmt = (d: Date) => d.toLocaleDateString('en-PH', { month: 'short', day: '2-digit', year: 'numeric' })
    if (min.toDateString() === max.toDateString()) return fmt(min)
    return `${fmt(min)} – ${fmt(max)}`
  }, [projects, tasks, invoices, bills, opps])

  // -- Sparkline data --------------------------------------------------------
  const sparklines = useMemo(() => ({
    projects: timeline.data.map(d => d.projectCount),
    revenue:  timeline.data.map(d => d.project),
    expenses: timeline.data.map(d => d.expenses),
    profit:   timeline.data.map(d => d.profit),
    openTasks: [stats.openTasks, stats.openTasks],
    overdue:   [stats.overdue, stats.overdue],
  }), [timeline, stats])

  const firstName = account.name?.split(' ')[0] || 'there'

  // -- Sales tab data --------------------------------------------------------
  const salesData = useMemo(() => {
    const leads       = opps.filter(o => norm(o.status) === 'lead').length
    const closed      = opps.filter(o => ['won','closed','won / closed','awarded','paid','completed'].includes(norm(o.status))).length
    const conversion  = opps.length ? Math.round((closed / opps.length) * 100) : 0
    const target      = budgets.reduce((s, b) => s + (b.total || b.amount || 0), 0)
    const stageOrder  = ['lead','site visit','proposal','negotiation','awarded']
    const stageColors: Record<string, string> = {
      lead: '#3b82f6', 'site visit': '#06b6d4', proposal: '#f59e0b', negotiation: '#f97316', awarded: '#22c55e',
    }
    const pipeline = stageOrder.map(s => ({
      stage: s.charAt(0).toUpperCase() + s.slice(1),
      color: stageColors[s],
      count: opps.filter(o => norm(o.status) === s).length,
      value: opps.filter(o => norm(o.status) === s).reduce((acc, o) => acc + (o.quotation || o.approvedBudget || 0), 0),
    }))
    const topDeals  = [...opps].sort((a, b) => (b.quotation || b.approvedBudget || 0) - (a.quotation || a.approvedBudget || 0)).slice(0, 6)
    const sourceMap: Record<string, { color: string; count: number }> = {
      Direct:       { color: '#22c55e', count: 0 },
      Referral:     { color: '#3b82f6', count: 0 },
      Website:      { color: '#f59e0b', count: 0 },
      'Social Media':{ color: '#8b5cf6', count: 0 },
      Other:        { color: '#000000', count: 0 },
    }
    opps.forEach(o => {
      const src = (o as { source?: string }).source
      if (src && sourceMap[src]) sourceMap[src].count++
      else sourceMap.Other.count++
    })
    const bySource = Object.entries(sourceMap).map(([name, v]) => ({ name, color: v.color, value: v.count }))
    return { leads, closed, conversion, target, pipeline, topDeals, bySource }
  }, [opps, budgets])

  // -- Financials tab data ---------------------------------------------------
  const finTabData = useMemo(() => {
    const outstandingInvoices = invoices.filter(i => (i.balanceDue || 0) > 0 || ['unpaid','pending','overdue','sent','partially paid'].includes(norm(i.status)))
    const outstandingBills    = bills.filter(b => ['unpaid','pending','overdue'].includes(norm(b.status)))
    const outstandingAmt = outstandingInvoices.reduce((s, invoice) => s + (invoice.balanceDue || 0), 0)
    const cashFlow       = stats.revenue - stats.expenses
    const totalBudget    = budgets.reduce((s, b) => s + (b.total || b.amount || 0), 0)
    const budgetUsage    = totalBudget ? Math.min(100, Math.round((stats.expenses / totalBudget) * 100)) : 0
    const recentInvoices = [...invoices].sort((a, b) => new Date(b.issueDate || b.createdAt || 0).getTime() - new Date(a.issueDate || a.createdAt || 0).getTime()).slice(0, 5)
    const opsVal   = projects.reduce((s, p) => s + (p.overheadProfit || 0) + (p.generalExpense || 0), 0)
    const projVal  = projects.reduce((s, p) => s + (p.materialCost || 0) + (p.laborCost || 0), 0)
    const billsVal = bills.reduce((s, b) => s + (b.amount || 0), 0)
    const budgetAlloc = [
      { name: 'Operations', color: '#22c55e', value: opsVal  },
      { name: 'Projects',   color: '#3b82f6', value: projVal },
      { name: 'Marketing',  color: '#f59e0b', value: 0 },
      { name: 'HR & Admin', color: '#ec4899', value: employees.length },
      { name: 'IT & Software', color: '#8b5cf6', value: 0 },
      { name: 'Others',     color: '#000000', value: billsVal },
    ]
    const alerts: { level: 'error'|'warning'|'info'; title: string; msg: string }[] = []
    if (outstandingInvoices.length > 0) alerts.push({ level: 'error',   title: 'Outstanding Invoices',  msg: `You have ${outstandingInvoices.length} invoice${outstandingInvoices.length > 1 ? 's' : ''} with balances due.` })
    if (outstandingBills.length > 0) alerts.push({ level: 'warning', title: 'Open Bills', msg: `${outstandingBills.length} bill${outstandingBills.length > 1 ? 's' : ''} still need review or payment.` })
    if (cashFlow < 0)           alerts.push({ level: 'warning', title: 'Low Cash Balance',   msg: 'Your cash balance is below the threshold.' })
    if (budgetUsage > 80)       alerts.push({ level: 'warning', title: 'Budget Alert',        msg: `${budgetUsage}% of budget used for this year.` })
    if (!alerts.length)         alerts.push({ level: 'info',    title: 'All Clear',           msg: 'No financial alerts at this time.' })
    return { outstandingAmt, cashFlow, budgetUsage, totalBudget, recentInvoices, budgetAlloc, alerts }
  }, [invoices, bills, stats, budgets, projects, employees])

  // -- Operations tab data ---------------------------------------------------
  const opsData = useMemo(() => {
    const today     = new Date()
    const openT     = tasks.filter(t => norm(t.status) !== 'completed').length
    const delayed   = tasks.filter(t => { const d = parseDate(t.dueDate); return d && d < today && norm(t.status) !== 'completed' }).length
    const active    = tasks.filter(t => norm(t.status) === 'in progress').length
    const onHold    = tasks.filter(t => norm(t.status) === 'on hold').length
    const completed = tasks.filter(t => norm(t.status) === 'completed').length
    const todo      = tasks.filter(t => ['to do','todo','open'].includes(norm(t.status))).length
    const workflowActivity = [
      { name: 'On Track',    value: Math.max(active - delayed, 0), color: '#22c55e' },
      { name: 'In Progress', value: active,                         color: '#3b82f6' },
      { name: 'On Hold',     value: onHold,                         color: '#f59e0b' },
      { name: 'Completed',   value: completed,                      color: '#8b5cf6' },
    ].filter(d => d.value > 0)
    const taskStatusBars = [
      { name: 'To Do',       value: todo,      fill: '#9ca3af' },
      { name: 'In Progress', value: active,    fill: '#3b82f6' },
      { name: 'Completed',   value: completed, fill: '#22c55e' },
      { name: 'Delayed',     value: delayed,   fill: '#ef4444' },
    ]
    return { openT, delayed, active, onHold, completed, todo, workflowActivity, taskStatusBars }
  }, [tasks])

  // -- Filtered chart data ---------------------------------------------------
  const filteredPerfData = useMemo(() =>
    perfFilter === 'All Projects' ? perfData : perfData.filter(d => d.name === perfFilter),
  [perfData, perfFilter])

  const filteredHealthData = useMemo(() =>
    healthFilter === 'All Projects' ? healthData : healthData.filter(d => d.name === healthFilter),
  [healthData, healthFilter])

  const filteredTimeline = useMemo(() => {
    const yr = new Date().getFullYear()
    const yearRows = (year: number) => {
      const existing = new Map(timeline.data.map(row => [row.key, row]))
      return Array.from({ length: 12 }, (_, index) => {
        const key = `${year}-${String(index + 1).padStart(2, '0')}`
        return existing.get(key) || { key, month: monthLabel(key), project: 0, pipeline: 0, expenses: 0, profit: 0, projectCount: 0 }
      })
    }
    if (salesPeriod === 'This Year')  return yearRows(yr)
    if (salesPeriod === 'Last Year')  return yearRows(yr - 1)
    return timeline.data
  }, [timeline, salesPeriod])

  const finStats = useMemo(() => {
    const today = new Date()
    const curMonthKey  = monthKey(today)
    const lastMonthKey = monthKey(addMonths(today, -1))
    const curYearStr   = String(today.getFullYear())
    const qStart       = Math.floor(today.getMonth() / 3) * 3

    const sum = (rows: typeof timeline.data) => ({
      revenue:  rows.reduce((s, d) => s + d.project,  0),
      expenses: rows.reduce((s, d) => s + d.expenses, 0),
      profit:   rows.reduce((s, d) => s + Math.max(d.project - d.expenses, 0), 0),
    })

    if (finPeriod === 'This Month')  return sum(timeline.data.filter(d => d.key === curMonthKey))
    if (finPeriod === 'Last Month')  return sum(timeline.data.filter(d => d.key === lastMonthKey))
    if (finPeriod === 'This Quarter') return sum(timeline.data.filter(d => {
      const [y, m] = d.key.split('-').map(Number)
      return y === today.getFullYear() && (m - 1) >= qStart && (m - 1) < qStart + 3
    }))
    if (finPeriod === 'This Year') return sum(timeline.data.filter(d => d.key.startsWith(curYearStr)))
    return { revenue: stats.revenue, expenses: stats.expenses, profit: stats.profit } // All Time
  }, [finPeriod, timeline, stats])

  // Task complete toggle (writes to the source store + updates state)
  const completeTask = useCallback((id: DashboardId) => {
    setTasks(prev => {
      const updated = prev.map(t => t.id === id ? { ...t, status: 'Completed' } : t)
      const completed = updated.find(t => t.id === id)
      if (completed?.source === 'project-management' && projectDashboardState) {
        const nextProjectState: ProjectManagementDashboardState = {
          ...projectDashboardState,
          tasks: (projectDashboardState.tasks || []).map(task => String(task.id || '') === String(id) ? { ...task, status: 'Done', updatedAt: new Date().toISOString() } : task),
        }
        setProjectDashboardState(nextProjectState)
        try {
          window.localStorage.setItem(projectStateKey, JSON.stringify(nextProjectState))
          const companyId = getActiveCompany()?.id || nextProjectState.companyId || ''
          if (companyId) window.localStorage.setItem(companyScopedKey(projectStateKey, companyId), JSON.stringify(nextProjectState))
          void replaceBusinessCollection('project-management-state', [{ id: 'project-management-state', ...nextProjectState }], companyId).catch(() => undefined)
          window.dispatchEvent(new Event('wiseflow-project-management-refresh'))
        } catch { /* ignore */ }
      } else {
        try {
          const companyId = getActiveCompany()?.id || ''
          const assignedRows = loadStoredRows<StoredRow>(assignedTasksKey, companyId).map(row => String(textOf(row, ['id', 'taskId'])) === String(id) ? { ...row, status: 'Completed' } : row)
          window.localStorage.setItem(assignedTasksKey, JSON.stringify(assignedRows))
          void replaceBusinessCollection('assigned-tasks', assignedRows).catch(() => undefined)
        } catch { /* ignore */ }
      }
      return updated
    })
  }, [projectDashboardState])

  // -- Module cards ----------------------------------------------------------
  const activeProcurementCount = procurement.filter(row => !['completed', 'closed', 'cancelled', 'rejected'].includes(norm(row.status))).length
  const activeEmployeeCount = employees.filter(employee => norm(employee.status) !== 'inactive').length
  const modules: { title: string; href: string; icon: ComponentType<{ size?: number }>; color: string; stat: number; label: string }[] = [
    { title: 'Client Database',       href: '/client-database',    icon: UsersRound,    color: '#06b6d4', stat: clients.length,   label: 'client records' },
    { title: 'Sales',                 href: '/sales',              icon: BadgeDollarSign,color: '#f59e0b', stat: opps.length,     label: 'opportunities' },
    { title: 'Project Management',    href: '/project-management', icon: FolderKanban,  color: '#8b5cf6', stat: projects.length,  label: 'projects' },
    { title: 'Financial',             href: '/financial',          icon: HandCoins,     color: '#ef4444', stat: invoices.length + bills.length + budgets.length, label: 'records' },
    { title: 'HR',                    href: '/hr',                 icon: Building2,     color: '#ec4899', stat: activeEmployeeCount, label: 'team members' },
    { title: 'Procurement',           href: '/procurement',        icon: ShoppingCart,  color: '#f97316', stat: activeProcurementCount, label: 'active requests' },
    { title: 'Supplier Database',     href: '/supplier-database',  icon: Package,       color: '#6366f1', stat: suppliers.length, label: 'suppliers' },
    { title: 'Warehouse / Inventory', href: '/warehouse-inventory',icon: Warehouse,     color: '#0ea5e9', stat: warehouses.length,label: 'inventory alerts' },
    { title: 'Workflows',             href: '/workflows/my-jobs',  icon: ClipboardList, color: '#22c55e', stat: tasks.filter(t => norm(t.status) !== 'completed').length, label: 'active workflows' },
    { title: 'To Do',                 href: '/workflows/my-to-dos', icon: Boxes,         color: '#000000', stat: tasks.filter(t => norm(t.status) === 'open').length, label: 'open tasks' },
  ]

  // -- Render ----------------------------------------------------------------
  return (
    <main className={`dashboard-page dashboard-tab-${tab.toLowerCase()}`} style={{ fontFamily: font }}>
      <style>{dashboardHierarchyCss}</style>
      <section className="dashboard-hero">
        <div className="dashboard-inner">

      {/* Page title + greeting row */}
      <div className="dash-header-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 22, gap: 12, flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 30, fontWeight: 700, color: '#111827', fontFamily: display, letterSpacing: '-0.3px' }}>
            Dashboard
          </h1>
          <p style={{ margin: '3px 0 0', fontSize: 14, color: '#000000' }}>
            {greeting()}, {firstName}! 👋 Here&apos;s what&apos;s happening across your business today.
          </p>
        </div>
        <div className="dashboard-header-actions" style={{ display: 'flex', gap: 8, alignItems: 'center' }}>

          {/* Date range picker */}
          <div ref={dateRef} style={{ position: 'relative' }}>
            <button
              onClick={() => setDateOpen(v => !v)}
              style={{ border: '1px solid #e5e7eb', background: '#fff', borderRadius: 6, padding: '6px 12px', fontSize: 12, color: '#374151', fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}
            >
              <CalendarDays size={13} style={{ color: '#000000' }} /> {dateRange} <ChevronDown size={12} style={{ transition: 'transform 150ms', transform: dateOpen ? 'rotate(180deg)' : 'none' }} />
            </button>
            {dateOpen && (
              <div style={{ position: 'absolute', top: 'calc(100% + 6px)', right: 0, width: 170, background: '#fff', border: '1px solid #e5e7eb', borderRadius: 6, boxShadow: '0 8px 24px rgba(0,0,0,0.1)', zIndex: 60, overflow: 'hidden' }}>
                {['Today', 'This Week', 'This Month', 'This Quarter', 'This Year', 'All Time'].map(opt => (
                  <button key={opt} onClick={() => setDateOpen(false)} style={{ display: 'block', width: '100%', border: 'none', background: 'transparent', padding: '9px 14px', textAlign: 'left', fontSize: 12, color: '#374151', cursor: 'pointer', fontFamily: font, fontWeight: 400 }}>
                    {opt}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* New record dropdown */}
          <div ref={newRef} style={{ position: 'relative' }}>
            <button
              onClick={() => setNewOpen(v => !v)}
              style={{ background: '#22c55e', border: 'none', borderRadius: 6, padding: '6px 14px', fontSize: 12, color: '#fff', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}
            >
              <Plus size={13} /> New <ChevronDown size={12} style={{ transition: 'transform 150ms', transform: newOpen ? 'rotate(180deg)' : 'none' }} />
            </button>
            {newOpen && (
              <div style={{ position: 'absolute', top: 'calc(100% + 6px)', right: 0, width: 200, background: '#fff', border: '1px solid #e5e7eb', borderRadius: 6, boxShadow: '0 8px 24px rgba(0,0,0,0.12)', zIndex: 60, overflow: 'hidden' }}>
                {([
                  { label: 'New Project',     href: '/project-management', icon: FolderKanban,    color: '#8b5cf6' },
                  { label: 'New Task',        href: '/workflows/my-jobs',  icon: ClipboardList,   color: '#06b6d4' },
                  { label: 'New Client',      href: '/client-database',    icon: UsersRound,      color: '#10b981' },
                  { label: 'New Opportunity', href: '/sales',              icon: BadgeDollarSign, color: '#f59e0b' },
                  { label: 'New Bill',        href: '/financial',          icon: Receipt,         color: '#f97316' },
                  { label: 'New Supplier',    href: '/supplier-database',  icon: Package,         color: '#6366f1' },
                ] as const).map(({ label, href, icon: Icon, color }) => (
                  <Link
                    key={label}
                    href={href}
                    onClick={() => setNewOpen(false)}
                    style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 14px', textDecoration: 'none', color: '#374151', fontSize: 13, fontFamily: font }}
                  >
                    <span style={{ width: 26, height: 26, borderRadius: 6, background: `${color}18`, display: 'grid', placeItems: 'center', flexShrink: 0 }}>
                      <Icon size={13} color={color} />
                    </span>
                    {label}
                  </Link>
                ))}
              </div>
            )}
          </div>

        </div>
      </div>

      {/* Tabs */}
      <div className="dashboard-tabs" style={{ display: 'flex', gap: 2, borderBottom: '1px solid #e5e7eb', marginBottom: 26 }}>
        {['Projects', 'Sales', 'Financials', 'Operations'].map(t => (
          <button key={t} className={tab === t ? 'is-active' : undefined} onClick={() => setTab(t)} style={{ border: 'none', borderBottom: `2px solid ${tab === t ? '#111827' : 'transparent'}`, background: 'transparent', color: tab === t ? '#111827' : '#000000', borderRadius: 0, padding: '8px 16px', fontSize: 13, fontWeight: 700, cursor: 'pointer', transition: 'border-color 150ms ease, color 150ms ease' }}>{t}</button>
        ))}
      </div>

      {/* -- KPI row — changes per tab --------------------------------------- */}
      <div className="kpi-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 16, marginBottom: 0 }}>
        {tab === 'Projects' && <>
          <KpiCard label="Total Projects" value={String(projects.length)} t={trends.neutral}  icon={CalendarDays}    iconColor="#22c55e" sparkData={sparklines.projects} />
          <KpiCard label="Project Cost"   value={money(stats.projectCost)} t={forecastTrend(stats.projectCost, analyticsForecasts.projectCost)} icon={BadgeDollarSign} iconColor="#3b82f6" sparkData={sparklines.revenue} forecast={analyticsForecasts.projectCost} />
          <KpiCard label="Expenses"       value={money(stats.expenses)}   t={forecastTrend(stats.expenses, analyticsForecasts.expenses, true)} icon={Receipt} iconColor="#f97316" sparkData={sparklines.expenses} forecast={analyticsForecasts.expenses} neg />
          <KpiCard label="Profit Margin"  value={money(stats.profit)}     t={forecastTrend(stats.profit, analyticsForecasts.profit)} icon={TrendingUp} iconColor="#8b5cf6" sparkData={sparklines.profit} forecast={analyticsForecasts.profit} />
        </>}
        {tab === 'Sales' && <>
          <KpiCard label="Quotation"        value={money(analyticsForecasts.quotation)} t={forecastTrend(analyticsForecasts.quotation, analyticsForecasts.quotation)} icon={BadgeDollarSign} iconColor="#3b82f6" sparkData={sparklines.revenue} forecast={analyticsForecasts.quotation} />
          <KpiCard label="Approved Budget"  value={money(analyticsForecasts.approvedBudget)} t={forecastTrend(analyticsForecasts.approvedBudget, analyticsForecasts.approvedBudget)} icon={Target} iconColor="#22c55e" sparkData={sparklines.projects} forecast={analyticsForecasts.approvedBudget} delta={analyticsForecasts.quotationDelta} />
          <KpiCard label="Closed Deals"     value={String(salesData.closed)}       t={trends.neutral}  icon={Award}           iconColor="#22c55e" sparkData={sparklines.profit} />
          <KpiCard label="Estimated Cost"   value={money(analyticsForecasts.estimatedCost)} t={forecastTrend(analyticsForecasts.estimatedCost, analyticsForecasts.estimatedCost, true)} icon={TrendingUp} iconColor="#f97316" sparkData={sparklines.revenue} forecast={analyticsForecasts.estimatedCost || salesData.target} />
        </>}
        {tab === 'Financials' && <>
          <KpiCard label="Total Revenue"        value={money(stats.revenue)}              t={forecastTrend(stats.revenue, analyticsForecasts.revenue)} icon={ShoppingBag} iconColor="#22c55e" sparkData={sparklines.revenue} forecast={analyticsForecasts.revenue} />
          <KpiCard label="Total Expenses"       value={money(stats.expenses)}             t={forecastTrend(stats.expenses, analyticsForecasts.expenses, true)} icon={Receipt} iconColor="#f97316" sparkData={sparklines.expenses} forecast={analyticsForecasts.expenses} neg />
          <KpiCard label="Net Profit"           value={money(stats.profit)}               t={forecastTrend(stats.profit, analyticsForecasts.netProfit)} icon={TrendingUp} iconColor="#8b5cf6" sparkData={sparklines.profit} forecast={analyticsForecasts.netProfit} />
          <KpiCard label="Outstanding Invoices" value={money(finTabData.outstandingAmt)}  t={forecastTrend(finTabData.outstandingAmt, analyticsForecasts.outstanding, true)} icon={FileText} iconColor="#f59e0b" sparkData={sparklines.overdue} forecast={analyticsForecasts.outstanding} />
        </>}
        {tab === 'Operations' && <>
          <KpiCard label="Open Tasks"           value={String(opsData.openT)}   t={trends.neutral}  icon={ClipboardList}   iconColor="#06b6d4" sparkData={sparklines.openTasks} />
          <KpiCard label="Delayed Tasks"        value={String(opsData.delayed)} t={{ text: opsData.delayed > 0 ? 'Action needed' : 'All on track', up: opsData.delayed === 0, zero: opsData.delayed === 0 }} icon={AlarmClock} iconColor="#ef4444" sparkData={sparklines.overdue} neg />
          <KpiCard label="Active Workflows"     value={String(opsData.active)}  t={trends.neutral}  icon={Zap}             iconColor="#8b5cf6" sparkData={sparklines.openTasks} />
          <KpiCard label="Warehouse Alerts"     value={String(warehouses.length)} t={trends.neutral} icon={Warehouse}       iconColor="#0ea5e9" sparkData={sparklines.projects} />
        </>}
      </div>
        </div>
      </section>

      <section className="dashboard-content">

      {/* -- Projects tab --------------------------------------------------- */}
      {tab === 'Projects' && <>
        <div className="charts-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 18, marginBottom: 18 }}>
          <ChartCard title="Project Performance" sub={`${projects.length} projects tracked with ${money(perfPaid)} paid and ${money(perfUnpaid)} unpaid.`} filter={perfFilter} filterOptions={['All Projects','Paid','Unpaid','In Progress','On Hold','Cancelled']} onFilterChange={setPerfFilter}>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginTop: 4 }}>
              <Donut data={filteredPerfData.length ? filteredPerfData : [{ name: 'None', value: 1, color: '#e5e7eb' }]} center={String(filteredPerfData.reduce((s, d) => s + d.value, 0) || projects.length)} />
              <DonutLegend data={filteredPerfData} total={projects.length} />
            </div>
          </ChartCard>
          <ChartCard title="Yearly Sales" sub="Balance statistics over time" filter={salesPeriod} filterOptions={['This Year','Last Year','All Time']} onFilterChange={setSalesPeriod}>
            <div style={{ height: 152, marginTop: 4 }}>
              <DashboardBarChart data={filteredTimeline} series={series} height={152} />
            </div>
          </ChartCard>
          <ChartCard title="Project Health" sub={`${projects.length} projects across all statuses`} filter={healthFilter} filterOptions={['All Projects','On Track','At Risk','Delayed']} onFilterChange={setHealthFilter}>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginTop: 4 }}>
              <Donut data={filteredHealthData.length ? filteredHealthData : [{ name: 'None', value: 1, color: '#e5e7eb' }]} center={String(filteredHealthData.reduce((s, d) => s + d.value, 0) || projects.length)} />
              <DonutLegend data={filteredHealthData} total={projects.length} />
            </div>
          </ChartCard>
        </div>
        <div className="data-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 18, marginBottom: 32 }}>
          <ChartCard title="Financial Overview" sub="" filter={finPeriod} filterOptions={['This Month','Last Month','This Quarter','This Year','All Time']} onFilterChange={setFinPeriod}>
            <div style={{ display: 'flex', flexDirection: 'column', marginTop: 2 }}>
              <FinBlock icon={ShoppingBag} iconColor="#22c55e" label="Total Revenue"  value={money(finStats.revenue)}  t={trends.revenue} />
              <FinBlock icon={Receipt}     iconColor="#f97316" label="Total Expenses" value={money(finStats.expenses)} t={trends.expenses} divider />
              <FinBlock icon={Wallet}      iconColor="#3b82f6" label="Net Profit"     value={money(finStats.profit)}   t={trends.profit} divider />
            </div>
          </ChartCard>
          <ChartCard title="Recent Activity" sub="" className="dashboard-recent-activity-card">
            <div className="dashboard-recent-activity-body">
              {activity.length === 0 ? (
                <div className="dashboard-recent-activity-empty">
                  <EmptyBox msg="No recent activity" sub="Activity from across your workspace will appear here." />
                </div>
              ) : (
                <div
                  className={`dashboard-recent-activity-list${activity.length > 3 ? ' is-scrollable' : ''}`}
                  aria-label="Recent activity history"
                  tabIndex={activity.length > 3 ? 0 : undefined}
                >
                  {activity.map((item, i) => (
                    <ActivityRow key={item.id} item={item} divider={i > 0} className="dashboard-activity-row dashboard-recent-activity-row" />
                  ))}
                </div>
              )}
              <Link href="/project-management" className="dashboard-recent-activity-link" style={{ fontSize: 12, color: '#22c55e', fontWeight: 500, textDecoration: 'none', marginTop: 12 }}>View all activity →</Link>
            </div>
          </ChartCard>
          <ChartCard title="Upcoming Tasks" sub="" className="dashboard-upcoming-tasks-card" action={<Link href="/workflows/my-jobs" className="dashboard-card-action-link" style={{ fontSize: 12, color: '#22c55e', fontWeight: 500, textDecoration: 'none' }}>View all</Link>}>
            {upcoming.length === 0 ? <EmptyBox msg="No tasks scheduled" sub="Tasks and to-dos assigned to you will appear here." /> : (
              <div className="dashboard-upcoming-task-list" style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 4 }}>
                {upcoming.slice(0, 4).map(t => (
                  <div key={t.id} className="dashboard-task-row" style={{ display: 'flex', gap: 9, alignItems: 'flex-start' }}>
                    <div className="dashboard-task-check" role="checkbox" aria-checked={false} tabIndex={0} onClick={() => completeTask(t.id)} onKeyDown={e => e.key === 'Enter' && completeTask(t.id)}
                      style={{ width: 14, height: 14, borderRadius: 4, border: '1.5px solid #d1d5db', flexShrink: 0, marginTop: 2, cursor: 'pointer' }} />
                    <div className="dashboard-task-copy" style={{ flex: 1, minWidth: 0 }}>
                      <div className="dashboard-task-title" style={{ fontSize: 12, fontWeight: 500, color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.title || 'Untitled'}</div>
                      <div className="dashboard-task-project" style={{ fontSize: 11, color: '#000000', marginTop: 1 }}>{t.projectName || 'No project'}</div>
                    </div>
                    <div className="dashboard-task-meta" style={{ flexShrink: 0, textAlign: 'right' }}>
                      {t.dueDate && <div className="dashboard-task-date" style={{ fontSize: 11, color: '#000000', marginBottom: 1 }}>{new Date(`${t.dueDate}T00:00:00`).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })}</div>}
                      {t.urge && <span className="dashboard-task-priority" data-priority={t.urge.toLowerCase()} style={{ fontSize: 10, fontWeight: 600, padding: '1px 6px', borderRadius: 4, background: t.urge==='High'?'#fef2f2':t.urge==='Medium'?'#fffbeb':'#f0fdf4', color: t.urge==='High'?'#ef4444':t.urge==='Medium'?'#f59e0b':'#22c55e' }}>{t.urge}</span>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ChartCard>
        </div>
        <TabModules title="Business modules" subtitle="Quick access to the upgraded system areas." modules={modules} />
      </>}

      {/* -- Sales tab ------------------------------------------------------ */}
      {tab === 'Sales' && <>
        {/* Row 1: Pipeline | Revenue Trend | Top Deals */}
        <div className="charts-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 18, marginBottom: 18 }}>
          <ChartCard title="Sales Pipeline" sub="" filter={salePipeFilter} filterOptions={['This Month','This Quarter','This Year','All Time']} onFilterChange={setSalePipeFilter}>
            <div style={{ display: 'flex', gap: 14, alignItems: 'center', marginTop: 8 }}>
              <SalesFunnel data={salesData.pipeline} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 110, flexShrink: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, fontSize: 10, fontWeight: 700, color: '#000000', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  <span>Stage</span><span>Deals</span>
                </div>
                {salesData.pipeline.map(d => (
                  <div key={d.stage} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, fontSize: 12 }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 5, color: '#374151' }}>
                      <span style={{ width: 7, height: 7, borderRadius: '50%', background: d.color, flexShrink: 0 }} />{d.stage}
                    </span>
                    <span style={{ color: '#000000', whiteSpace: 'nowrap' }}>{d.count} ({pct(d.count, Math.max(salesData.pipeline.reduce((s,x)=>s+x.count,0),1))}%)</span>
                  </div>
                ))}
              </div>
            </div>
            <Link href="/sales" style={{ fontSize: 12, color: '#22c55e', fontWeight: 500, textDecoration: 'none', display: 'block', marginTop: 10 }}>View full pipeline →</Link>
          </ChartCard>

          <ChartCard title="Revenue Trend" sub="Opportunities tracked over time" filter={revTrendFilter} filterOptions={['This Month','This Quarter','This Year']} onFilterChange={setRevTrendFilter}>
            <div style={{ height: 148, marginTop: 4 }}>
              <DashboardLineChart
                data={filteredTimeline}
                series={[
                  { key: 'project', name: 'Revenue', color: '#22c55e' },
                  { key: 'pipeline', name: 'Quotations', color: '#3b82f6' },
                  { key: 'profit', name: 'Closed Deals', color: '#8b5cf6' },
                ]}
                height={148}
              />
            </div>
            <div style={{ display: 'flex', gap: 12, marginTop: 6, flexWrap: 'wrap' }}>
              {[{l:'Revenue',c:'#22c55e'},{l:'Quotations',c:'#3b82f6'},{l:'Closed Deals',c:'#8b5cf6'}].map(x => (
                <span key={x.l} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: '#000000' }}>
                  <span style={{ width: 16, height: 2, background: x.c, display: 'inline-block', borderRadius: 1 }} />{x.l}
                </span>
              ))}
            </div>
          </ChartCard>

          <ChartCard title="Top Deals" sub="" filter={topDealsFilter} filterOptions={['This Month','This Quarter','This Year','All Time']} onFilterChange={setTopDealsFilter}>
            {salesData.topDeals.length === 0 ? <EmptyBox msg="No deals yet" sub="Opportunities will appear here once added." /> : (
              <div style={{ marginTop: 8 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto auto auto', gap: '3px 8px', marginBottom: 6, alignItems: 'center' }}>
                  {['Deal / Client','Value','Stage','Close Date',''].map(h => (
                    <span key={h} style={{ fontSize: 10, fontWeight: 600, color: '#000000', textTransform: 'uppercase', letterSpacing: '0.04em', whiteSpace: 'nowrap' }}>{h}</span>
                  ))}
                </div>
                {salesData.topDeals.map(deal => {
                  const sc = stageBadgeColor(norm(deal.status || ''))
                  return (
                    <div key={deal.id} style={{ display: 'grid', gridTemplateColumns: '1fr auto auto auto auto', gap: '3px 8px', padding: '7px 0', borderTop: '1px solid #f3f4f6', alignItems: 'center' }}>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 12, fontWeight: 500, color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{deal.name || 'Untitled'}</div>
                      </div>
                      <span style={{ fontSize: 12, fontWeight: 600, color: '#111827', whiteSpace: 'nowrap' }}>{money(deal.quotation||deal.approvedBudget||0)}</span>
                      <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 99, background: sc.bg, color: sc.text, whiteSpace: 'nowrap' }}>{deal.status || 'Lead'}</span>
                      <span style={{ fontSize: 11, color: '#000000', whiteSpace: 'nowrap' }}>{deal.startDate ? new Date(`${deal.startDate}T00:00:00`).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: '2-digit' }) : '—'}</span>
                      <div style={{ width: 24, height: 24, borderRadius: '50%', background: '#1A73E8', color: '#fff', display: 'grid', placeItems: 'center', fontSize: 9, fontWeight: 700 }}>JP</div>
                    </div>
                  )
                })}
                <Link href="/sales" style={{ fontSize: 12, color: '#22c55e', fontWeight: 500, textDecoration: 'none', display: 'block', marginTop: 8 }}>View all deals →</Link>
              </div>
            )}
          </ChartCard>
        </div>

        {/* Row 2: Sales Activity | Sales by Source | Quick Actions */}
        <div className="data-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 18, marginBottom: 32 }}>
          <ChartCard title="Sales Activity" sub="">
            {activity.filter(a => a.type === 'opportunity').length === 0 && activity.length === 0
              ? <EmptyBox msg="No sales activity" sub="Activity from opportunities will appear here." />
              : (
                <div style={{ display: 'flex', flexDirection: 'column', marginTop: 2 }}>
                  {(activity.filter(a => a.type === 'opportunity').length > 0 ? activity.filter(a => a.type === 'opportunity') : activity).slice(0, 5).map((item, i) => <ActivityRow key={item.id} item={item} divider={i > 0} />)}
                  <Link href="/sales" style={{ fontSize: 12, color: '#22c55e', fontWeight: 500, textDecoration: 'none', marginTop: 12 }}>View all activity →</Link>
                </div>
              )}
          </ChartCard>

          <ChartCard title="Sales by Source" sub="" filter={salesSourceFilter} filterOptions={['This Month','This Quarter','This Year','All Time']} onFilterChange={setSalesSourceFilter}>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginTop: 4 }}>
              <Donut data={salesData.bySource.some(d => d.value > 0) ? salesData.bySource.filter(d=>d.value>0) : [{name:'None',value:1,color:'#e5e7eb'}]} center={String(opps.length)} />
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
                {salesData.bySource.map(d => (
                  <div key={d.name} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#374151' }}>
                      <span style={{ width: 7, height: 7, borderRadius: '50%', background: d.color, flexShrink: 0 }} />{d.name}
                    </span>
                    <span style={{ color: '#000000', whiteSpace: 'nowrap' }}>{d.value} ({pct(d.value, Math.max(opps.length,1))}%)</span>
                  </div>
                ))}
              </div>
            </div>
          </ChartCard>

          <ChartCard title="Quick Actions" sub="">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 8 }}>
              {([
                { label: 'Create Opportunity', href: '/sales',           icon: BadgeDollarSign, color: '#22c55e' },
                { label: 'Add New Lead',        href: '/sales',           icon: UserPlus,        color: '#3b82f6' },
                { label: 'Create Quotation',    href: '/sales',           icon: FileText,        color: '#6366f1' },
                { label: 'Add Client',          href: '/client-database', icon: UsersRound,      color: '#f59e0b' },
                { label: 'Schedule Follow-up',  href: '/workflows/my-jobs', icon: CalendarDays,    color: '#f97316' },
                { label: 'Import Leads',        href: '/sales',           icon: Package,         color: '#8b5cf6' },
              ] as const).map(a => (
                <Link key={a.label} href={a.href} style={{ textDecoration: 'none' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', border: '1px solid #e5e7eb', borderRadius: 6, cursor: 'pointer' }}>
                    <span style={{ width: 28, height: 28, borderRadius: 6, background: `${a.color}18`, display: 'grid', placeItems: 'center', flexShrink: 0 }}><a.icon size={13} color={a.color} /></span>
                    <span style={{ fontSize: 12, fontWeight: 500, color: '#374151', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{a.label}</span>
                    <ChevronRight size={12} color="#d1d5db" style={{ flexShrink: 0 }} />
                  </div>
                </Link>
              ))}
            </div>
          </ChartCard>
        </div>

        {/* Tip banner */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 6, padding: '14px 18px', marginBottom: 32 }}>
          <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#22c55e', display: 'grid', placeItems: 'center', flexShrink: 0 }}><TrendingUp size={15} color="#fff" /></div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#166534' }}>Tip: Keep your pipeline updated</div>
            <div style={{ fontSize: 12, color: '#16a34a' }}>Regular updates help you forecast accurately and close more deals.</div>
          </div>
          <Link href="/sales" style={{ flexShrink: 0, border: '1px solid #22c55e', background: '#fff', borderRadius: 6, padding: '5px 14px', fontSize: 12, fontWeight: 500, color: '#166534', textDecoration: 'none' }}>Learn more</Link>
        </div>

        <TabModules title="Sales modules" subtitle="Quick access to the sales areas." modules={[
          { title: 'Sales Pipeline',  href: '/sales',           icon: TrendingUp,      color: '#22c55e', stat: opps.length,    label: 'opportunities' },
          { title: 'Client Database', href: '/client-database', icon: UsersRound,      color: '#3b82f6', stat: clients.length, label: 'clients' },
          { title: 'Opportunities',   href: '/sales',           icon: BadgeDollarSign, color: '#f59e0b', stat: salesData.closed, label: 'closed deals' },
          { title: 'Quotations',      href: '/sales',           icon: FileText,        color: '#8b5cf6', stat: opps.filter(o=>norm(o.status)==='proposal').length, label: 'proposals' },
          { title: 'Reports',         href: '/financial',       icon: HandCoins,       color: '#ef4444', stat: invoices.length, label: 'invoices' },
        ]} />
      </>}

      {/* -- Financials tab -------------------------------------------------- */}
      {tab === 'Financials' && <>
        {/* Row 1: Income vs Expense | Cash Flow | Budget Allocation */}
        <div className="charts-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 18, marginBottom: 18 }}>
          <ChartCard title="Income vs Expense" sub="" filter={incExpFilter} filterOptions={['This Month','This Quarter','This Year','All Time']} onFilterChange={setIncExpFilter}>
            <div style={{ display: 'flex', gap: 10, marginBottom: 8, marginTop: 6 }}>
              {[{l:'Income',c:'#22c55e'},{l:'Expense',c:'#ef4444'}].map(x => (
                <span key={x.l} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: '#000000' }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: x.c }} />{x.l}
                </span>
              ))}
            </div>
            <div style={{ height: 140 }}>
              <DashboardLineChart
                data={filteredTimeline}
                series={[
                  { key: 'project', name: 'Income', color: '#22c55e', opacity: 0.18 },
                  { key: 'expenses', name: 'Expense', color: '#ef4444', opacity: 0.14 },
                ]}
                height={140}
                area
              />
            </div>
            <Link href="/financial" style={{ fontSize: 12, color: '#22c55e', fontWeight: 500, textDecoration: 'none', display: 'block', marginTop: 'auto', paddingTop: 14 }}>View full report →</Link>
          </ChartCard>

          <ChartCard title="Cash Flow Overview" sub="" filter={cashFlowFilter} filterOptions={['This Month','This Quarter','This Year','All Time']} onFilterChange={setCashFlowFilter}>
            <div style={{ marginBottom: 6, marginTop: 4 }}>
              <div style={{ fontSize: 20, fontWeight: 700, color: '#111827', letterSpacing: '-0.3px' }}>{money(Math.abs(finTabData.cashFlow))}</div>
              <div style={{ fontSize: 12, color: '#000000' }}>Net Cash Flow</div>
            </div>
            <div style={{ display: 'flex', gap: 10, marginBottom: 6 }}>
              {[{l:'Inflow',c:'#22c55e'},{l:'Outflow',c:'#ef4444'}].map(x => (
                <span key={x.l} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: '#000000' }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: x.c }} />{x.l}
                </span>
              ))}
            </div>
            <div style={{ height: 110 }}>
              <DashboardBarChart
                data={filteredTimeline.map(d => ({ ...d, cashFlow: d.project - d.expenses, inflow: d.project, outflow: -d.expenses }))}
                series={[
                  { key: 'inflow', name: 'Inflow', color: '#22c55e', opacity: 0.75 },
                  { key: 'outflow', name: 'Outflow', color: '#ef4444', opacity: 0.65 },
                ]}
                height={110}
                allowNegative
              />
            </div>
            <Link href="/financial" style={{ fontSize: 12, color: '#22c55e', fontWeight: 500, textDecoration: 'none', display: 'block', marginTop: 'auto', paddingTop: 14 }}>View cash flow statement →</Link>
          </ChartCard>

          <ChartCard title="Budget Allocation" sub="" filter={budgetFilter} filterOptions={['This Year','Last Year','All Time']} onFilterChange={setBudgetFilter}>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginTop: 4 }}>
              <Donut data={finTabData.budgetAlloc.some(d=>d.value>0) ? finTabData.budgetAlloc.filter(d=>d.value>0) : [{name:'None',value:1,color:'#e5e7eb'}]} center={money(finTabData.totalBudget)} />
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
                {finTabData.budgetAlloc.map(d => (
                  <div key={d.name} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#374151' }}>
                      <span style={{ width: 7, height: 7, borderRadius: '50%', background: d.color, flexShrink: 0 }} />{d.name}
                    </span>
                    <span style={{ color: '#000000', whiteSpace: 'nowrap' }}>{pct(d.value, Math.max(stats.expenses,1))}%</span>
                  </div>
                ))}
              </div>
            </div>
            <Link href="/financial" style={{ fontSize: 12, color: '#22c55e', fontWeight: 500, textDecoration: 'none', display: 'block', marginTop: 'auto', paddingTop: 14 }}>View budget details →</Link>
          </ChartCard>
        </div>

        {/* Row 2: Recent Invoices | Expense Requests | Financial Alerts */}
        <div className="data-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 18, marginBottom: 32 }}>
          <ChartCard title="Recent Invoices" sub="" action={<Link href="/financial" style={{ fontSize: 12, color: '#22c55e', fontWeight: 500, textDecoration: 'none' }}>View all invoices →</Link>}>
            {finTabData.recentInvoices.length === 0 ? <EmptyBox msg="No invoices yet" sub="Invoices will appear here once created." /> : (
              <div style={{ marginTop: 8 }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr auto auto auto', gap: '3px 8px', marginBottom: 6 }}>
                  {['Invoice #','Client','Amount','Due Date','Status'].map(h => (
                    <span key={h} style={{ fontSize: 10, fontWeight: 600, color: '#000000', textTransform: 'uppercase', letterSpacing: '0.04em', whiteSpace: 'nowrap' }}>{h}</span>
                  ))}
                </div>
                {finTabData.recentInvoices.map((inv, i) => {
                  const sc = statusBadgeColor(norm(inv.status || ''))
                  return (
                    <div key={inv.id} style={{ display: 'grid', gridTemplateColumns: 'auto 1fr auto auto auto', gap: '3px 8px', padding: '7px 0', borderTop: '1px solid #f3f4f6', alignItems: 'center' }}>
                      <span style={{ fontSize: 12, color: '#000000', whiteSpace: 'nowrap' }}>#{String(inv.id).padStart(4,'0')}</span>
                      <span style={{ fontSize: 12, color: '#374151', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{inv.customer || `Client ${i+1}`}</span>
                      <span style={{ fontSize: 12, fontWeight: 600, color: '#111827', whiteSpace: 'nowrap' }}>{money(inv.amount||0)}</span>
                      <span style={{ fontSize: 11, color: '#000000', whiteSpace: 'nowrap' }}>{(inv.dueDate || inv.issueDate) ? new Date(`${inv.dueDate || inv.issueDate}T00:00:00`).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}</span>
                      <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 99, background: sc.bg, color: sc.text, whiteSpace: 'nowrap' }}>{inv.status || 'Pending'}</span>
                    </div>
                  )
                })}
              </div>
            )}
          </ChartCard>

          <ChartCard title="Expense Requests" sub="" action={<Link href="/financial" style={{ fontSize: 12, color: '#22c55e', fontWeight: 500, textDecoration: 'none' }}>View all requests →</Link>}>
            {bills.length === 0 ? <EmptyBox msg="No expense requests yet" sub="Expense requests will appear here." /> : (
              <div style={{ marginTop: 8 }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr auto auto auto', gap: '3px 8px', marginBottom: 6 }}>
                  {['Request #','Requested By','Amount','Date','Status'].map(h => (
                    <span key={h} style={{ fontSize: 10, fontWeight: 600, color: '#000000', textTransform: 'uppercase', letterSpacing: '0.04em', whiteSpace: 'nowrap' }}>{h}</span>
                  ))}
                </div>
                {bills.slice(0,4).map((b, i) => {
                  const sc = statusBadgeColor(norm(b.status || ''))
                  return (
                    <div key={b.id} style={{ display: 'grid', gridTemplateColumns: 'auto 1fr auto auto auto', gap: '3px 8px', padding: '7px 0', borderTop: '1px solid #f3f4f6', alignItems: 'center' }}>
                      <span style={{ fontSize: 12, color: '#000000', whiteSpace: 'nowrap' }}>#{String(b.id).padStart(4,'0')}</span>
                      <span style={{ fontSize: 12, color: '#374151', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{b.name || `Request ${i+1}`}</span>
                      <span style={{ fontSize: 12, fontWeight: 600, color: '#111827', whiteSpace: 'nowrap' }}>{money(b.amount||0)}</span>
                      <span style={{ fontSize: 11, color: '#000000', whiteSpace: 'nowrap' }}>{b.date ? new Date(`${b.date}T00:00:00`).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}</span>
                      <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 99, background: sc.bg, color: sc.text, whiteSpace: 'nowrap' }}>{b.status || 'Pending'}</span>
                    </div>
                  )
                })}
              </div>
            )}
          </ChartCard>

          <ChartCard title="Financial Alerts" sub="">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
              {finTabData.alerts.map((alert, i) => {
                const cfg = { error: { icon: AlertTriangle, bg: '#fef2f2', border: '#fecaca', iconColor: '#ef4444', textColor: '#991b1b' }, warning: { icon: AlertTriangle, bg: '#fffbeb', border: '#fde68a', iconColor: '#f59e0b', textColor: '#92400e' }, info: { icon: CheckCircle2, bg: '#f0fdf4', border: '#bbf7d0', iconColor: '#22c55e', textColor: '#166534' } }[alert.level]
                const AlertIcon = cfg.icon
                return (
                  <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, background: cfg.bg, border: `1px solid ${cfg.border}`, borderRadius: 6, padding: '10px 12px' }}>
                    <AlertIcon size={15} color={cfg.iconColor} style={{ flexShrink: 0, marginTop: 1 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: cfg.textColor }}>{alert.title}</div>
                      <div style={{ fontSize: 11, color: cfg.iconColor, marginTop: 1 }}>{alert.msg}</div>
                    </div>
                    <ChevronRight size={13} color={cfg.iconColor} style={{ flexShrink: 0 }} />
                  </div>
                )
              })}
              <Link href="/financial" style={{ fontSize: 12, color: '#22c55e', fontWeight: 500, textDecoration: 'none', marginTop: 2 }}>View all alerts →</Link>
            </div>
          </ChartCard>
        </div>

        <TabModules title="Financial modules" subtitle="Quick access to the financial areas." modules={[
          { title: 'Financial Overview', href: '/financial',          icon: HandCoins,       color: '#22c55e', stat: invoices.length + bills.length + budgets.length, label: 'records' },
          { title: 'Invoices',           href: '/financial',          icon: FileText,        color: '#3b82f6', stat: invoices.filter(i=>(i.paid || 0) > 0 || norm(i.status)==='paid').length, label: 'paid' },
          { title: 'Expenses',           href: '/financial',          icon: Receipt,         color: '#f97316', stat: bills.length, label: 'expense records' },
          { title: 'Payments',           href: '/financial',          icon: ShoppingBag,     color: '#8b5cf6', stat: invoices.filter(i=>(i.paid || 0) > 0).length, label: 'payments' },
          { title: 'Reports',            href: '/financial',          icon: TrendingUp,      color: '#ef4444', stat: budgets.length, label: 'budgets' },
        ]} />
      </>}

      {/* -- Operations tab -------------------------------------------------- */}
      {tab === 'Operations' && <>
        {/* Row 1: Workflow Activity | Task Status | Team Workload */}
        <div className="charts-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 18, marginBottom: 18 }}>
          <ChartCard title="Workflow Activity" sub="" filter={wfFilter} filterOptions={['This Week','This Month','All Time']} onFilterChange={setWfFilter}>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginTop: 4 }}>
              <Donut data={opsData.workflowActivity.length ? opsData.workflowActivity : [{name:'None',value:1,color:'#e5e7eb'}]} center={String(tasks.length)} />
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 7 }}>
                {opsData.workflowActivity.length === 0 ? <div style={{ fontSize: 12, color: '#000000' }}>No workflow data yet.</div> : opsData.workflowActivity.map(d => (
                  <div key={d.name} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#374151' }}>
                      <span style={{ width: 7, height: 7, borderRadius: '50%', background: d.color, flexShrink: 0 }} />{d.name}
                    </span>
                    <span style={{ color: '#000000' }}>{d.value} ({pct(d.value, Math.max(tasks.length,1))}%)</span>
                  </div>
                ))}
              </div>
            </div>
          </ChartCard>

          <ChartCard title="Task Status Overview" sub="" filter={taskFilter} filterOptions={['This Week','This Month','All Time']} onFilterChange={setTaskFilter}>
            <div style={{ height: 158, marginTop: 4 }}>
              <DashboardBarChart
                data={opsData.taskStatusBars}
                series={[{ key: 'value', name: 'Tasks', color: '#22c55e' }]}
                labelKey="name"
                height={158}
                useDatumColor
              />
            </div>
          </ChartCard>

          <ChartCard title="Team Workload" sub="" filter={twFilter} filterOptions={['This Week','This Month','All Time']} onFilterChange={setTwFilter}>
            {tasks.length === 0 ? <EmptyBox msg="No team data yet" sub="Team workload will appear here once tasks are assigned." /> : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 8 }}>
                {Array.from(new Set(tasks.map(t => t.assignee).filter(Boolean))).slice(0, 5).map(assignee => {
                  const assigned  = tasks.filter(t => t.assignee === assignee)
                  const done      = assigned.filter(t => norm(t.status) === 'completed').length
                  const loadPct   = Math.min(100, Math.round((assigned.length / Math.max(tasks.length, 1)) * 100))
                  const initials  = (assignee || 'U').split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
                  return (
                    <div key={assignee} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 30, height: 30, borderRadius: '50%', background: '#1A73E8', color: '#fff', display: 'grid', placeItems: 'center', fontSize: 11, fontWeight: 700, flexShrink: 0 }}>{initials}</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                          <span style={{ fontSize: 12, fontWeight: 500, color: '#111827' }}>{assignee}</span>
                          <span style={{ fontSize: 11, color: '#000000' }}>{done}/{assigned.length} tasks</span>
                        </div>
                        <div style={{ height: 5, borderRadius: 3, background: '#f3f4f6', overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${loadPct}%`, background: loadPct > 80 ? '#ef4444' : loadPct > 60 ? '#f59e0b' : '#22c55e', borderRadius: 3 }} />
                        </div>
                      </div>
                      <span style={{ fontSize: 11, fontWeight: 600, color: '#374151', flexShrink: 0, minWidth: 28, textAlign: 'right' }}>{loadPct}%</span>
                    </div>
                  )
                })}
                <Link href="/workflows/my-jobs" style={{ fontSize: 12, color: '#22c55e', fontWeight: 500, textDecoration: 'none', marginTop: 2 }}>View all team workload →</Link>
              </div>
            )}
          </ChartCard>
        </div>

        {/* Row 2: Procurement Status | Inventory Alerts | Upcoming Tasks */}
        <div className="data-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 18, marginBottom: 32 }}>
          <ChartCard title="Procurement Status" sub="" filter={procFilter} filterOptions={['All Requests','Approved','Pending','In Review']} onFilterChange={setProcFilter}>
            {procurement.length === 0 ? <EmptyBox msg="No procurement records" sub="Procurement requests will appear here." /> : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 4 }}>
                {procurement
                  .filter(row => procFilter === 'All Requests' || norm(row.status) === norm(procFilter))
                  .slice(0, 5)
                  .map(row => {
                    const sc = statusBadgeColor(norm(row.status || ''))
                    return (
                      <div key={row.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderTop: '1px solid #f3f4f6' }}>
                        <ShoppingCart size={14} color="#f59e0b" />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 12, fontWeight: 600, color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.name || row.id}</div>
                          <div style={{ fontSize: 11, color: '#000000' }}>{row.amount ? money(row.amount) : 'Procurement record'}</div>
                        </div>
                        <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 99, background: sc.bg, color: sc.text, whiteSpace: 'nowrap' }}>{row.status || 'Pending'}</span>
                      </div>
                    )
                  })}
              </div>
            )}
            <Link href="/procurement" style={{ fontSize: 12, color: '#22c55e', fontWeight: 500, textDecoration: 'none', display: 'block', marginTop: 4 }}>View all procurement →</Link>
          </ChartCard>

          <ChartCard title="Inventory Alerts" sub="" filter={invFilter} filterOptions={['All Locations','Warehouse 1','Warehouse 2','Warehouse 3']} onFilterChange={setInvFilter}>
            {warehouses.length === 0 ? <EmptyBox msg="No inventory alerts" sub="Low stock items will appear here." /> : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
                {warehouses.slice(0, 4).map((wh, i) => (
                  <div key={wh.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', border: '1px solid #e5e7eb', borderRadius: 6 }}>
                    <div style={{ width: 28, height: 28, borderRadius: 6, background: '#fef2f218', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
                      <Warehouse size={13} color="#ef4444" />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: 500, color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{wh.name || `Inventory ${i + 1}`}</div>
                      <div style={{ fontSize: 11, color: '#000000' }}>Minimum {wh.minLevel ?? 0}</div>
                    </div>
                    <span style={{ fontSize: 11, fontWeight: 600, color: '#ef4444', whiteSpace: 'nowrap' }}>{wh.stock ?? wh.total ?? wh.amount ?? 0} units</span>
                  </div>
                ))}
                <Link href="/warehouse-inventory" style={{ fontSize: 12, color: '#22c55e', fontWeight: 500, textDecoration: 'none', marginTop: 2 }}>View all inventory →</Link>
              </div>
            )}
          </ChartCard>

          <ChartCard title="Upcoming Tasks" sub="" className="dashboard-upcoming-tasks-card" action={<Link href="/workflows/my-jobs" className="dashboard-card-action-link" style={{ fontSize: 12, color: '#22c55e', fontWeight: 500, textDecoration: 'none' }}>View all</Link>}>
            {upcoming.length === 0 ? <EmptyBox msg="No tasks scheduled" sub="Tasks assigned to you will appear here." /> : (
              <div className="dashboard-upcoming-task-list" style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 4 }}>
                {upcoming.slice(0, 5).map(t => (
                  <div key={t.id} className="dashboard-task-row" style={{ display: 'flex', gap: 9, alignItems: 'flex-start' }}>
                    <div className="dashboard-task-check" role="checkbox" aria-checked={false} tabIndex={0} onClick={() => completeTask(t.id)} onKeyDown={e => e.key === 'Enter' && completeTask(t.id)}
                      style={{ width: 14, height: 14, borderRadius: 4, border: '1.5px solid #d1d5db', flexShrink: 0, marginTop: 2, cursor: 'pointer' }} />
                    <div className="dashboard-task-copy" style={{ flex: 1, minWidth: 0 }}>
                      <div className="dashboard-task-title" style={{ fontSize: 12, fontWeight: 500, color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.title || 'Untitled'}</div>
                      <div className="dashboard-task-project" style={{ fontSize: 11, color: '#000000' }}>{t.projectName || 'Operations'}</div>
                    </div>
                    {t.dueDate && <div className="dashboard-task-date" style={{ fontSize: 11, color: '#000000', flexShrink: 0, whiteSpace: 'nowrap' }}>{new Date(`${t.dueDate}T00:00:00`).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })}</div>}
                  </div>
                ))}
              </div>
            )}
          </ChartCard>
        </div>

        <TabModules title="Operations modules" subtitle="Quick access to key operations areas." modules={[
          { title: 'Workflows',   href: '/workflows/my-jobs',  icon: Zap,          color: '#22c55e', stat: opsData.active,        label: 'active workflows' },
          { title: 'Procurement', href: '/procurement',        icon: ShoppingCart, color: '#f59e0b', stat: activeProcurementCount, label: 'active requests' },
          { title: 'Warehouse',   href: '/warehouse-inventory',icon: Warehouse,    color: '#0ea5e9', stat: warehouses.length,      label: 'inventory alerts' },
          { title: 'Tasks',       href: '/workflows/my-jobs',  icon: ClipboardList,color: '#8b5cf6', stat: opsData.openT,          label: 'open tasks' },
          { title: 'Team Workload',href: '/hr',                icon: UsersRound,   color: '#ef4444', stat: activeEmployeeCount || Array.from(new Set(tasks.map(t=>t.assignee).filter(Boolean))).length, label: 'team members' },
        ]} />
      </>}
      </section>
    </main>
  )
}

const dashboardHierarchyCss = `
.dashboard-page .data-grid {
  align-items: stretch;
}
.dashboard-page .dashboard-card {
  min-height: 0;
}
.dashboard-page .dashboard-card-header {
  min-height: 34px;
  align-items: center !important;
  padding-bottom: 10px;
  border-bottom: 1px solid #eef2f7;
}
.dashboard-page .dashboard-card-header h3 {
  color: #0f172a !important;
  font-size: 15px !important;
  line-height: 1.2;
  font-weight: 750 !important;
}
.dashboard-page .dashboard-card-action-link,
.dashboard-page .dashboard-recent-activity-link {
  color: #16a34a !important;
  font-size: 12px !important;
  font-weight: 700 !important;
}
.dashboard-page .dashboard-recent-activity-card,
.dashboard-page .dashboard-upcoming-tasks-card {
  padding-bottom: 16px !important;
}
.dashboard-page .dashboard-recent-activity-body {
  min-height: 0;
  display: flex;
  flex: 1;
  flex-direction: column;
}
.dashboard-page .dashboard-recent-activity-list {
  display: flex;
  flex-direction: column;
  gap: 0;
}
.dashboard-page .dashboard-recent-activity-list.is-scrollable {
  max-height: 206px;
  padding-right: 8px;
  overflow-y: auto;
  scrollbar-width: thin;
  scrollbar-color: #cbd5e1 transparent;
}
.dashboard-page .dashboard-recent-activity-row {
  padding: 12px 0 !important;
  gap: 12px !important;
}
.dashboard-page .dashboard-recent-activity-row:first-child {
  padding-top: 2px !important;
}
.dashboard-page .dashboard-activity-description {
  color: #0f172a !important;
  font-size: 12.5px !important;
  line-height: 1.35 !important;
  font-weight: 750 !important;
}
.dashboard-page .dashboard-activity-subtext {
  color: #475569 !important;
  font-size: 11px !important;
  line-height: 1.35 !important;
  font-weight: 500 !important;
}
.dashboard-page .dashboard-activity-time {
  color: #334155 !important;
  font-size: 11px !important;
  font-weight: 650 !important;
}
.dashboard-page .dashboard-upcoming-task-list {
  gap: 10px !important;
  margin-top: 2px !important;
}
.dashboard-page .dashboard-task-row {
  min-height: 40px;
  gap: 10px !important;
  padding: 2px 0 10px;
  border-bottom: 1px solid #f1f5f9;
}
.dashboard-page .dashboard-task-row:last-child {
  border-bottom: 0;
}
.dashboard-page .dashboard-task-check {
  width: 15px !important;
  height: 15px !important;
  margin-top: 3px !important;
  border-color: #cbd5e1 !important;
  background: #ffffff;
}
.dashboard-page .dashboard-task-title {
  color: #0f172a !important;
  font-size: 12.5px !important;
  line-height: 1.35 !important;
  font-weight: 750 !important;
  white-space: normal !important;
  overflow: visible !important;
  text-overflow: clip !important;
}
.dashboard-page .dashboard-task-project {
  margin-top: 3px !important;
  color: #475569 !important;
  font-size: 11px !important;
  line-height: 1.3 !important;
  font-weight: 500 !important;
}
.dashboard-page .dashboard-task-meta {
  min-width: 54px;
}
.dashboard-page .dashboard-task-date {
  color: #334155 !important;
  font-size: 11px !important;
  line-height: 1.2 !important;
  font-weight: 650 !important;
}
.dashboard-page .dashboard-task-priority {
  display: inline-flex;
  align-items: center;
  min-height: 18px;
  padding: 1px 6px !important;
  border-radius: 999px !important;
  font-size: 10px !important;
  font-weight: 750 !important;
}
.dashboard-page .dashboard-task-priority[data-priority='medium'] {
  background: #fef3c7 !important;
  color: #92400e !important;
}
.dashboard-page .dashboard-task-priority[data-priority='high'] {
  background: #fee2e2 !important;
  color: #b91c1c !important;
}
.dashboard-page .dashboard-task-priority[data-priority='low'] {
  background: #dcfce7 !important;
  color: #166534 !important;
}
@media (max-width: 1100px) {
  .dashboard-page .data-grid,
  .dashboard-page .charts-grid {
    grid-template-columns: 1fr !important;
  }
}
`

// --- Sub-components ----------------------------------------------------------

function ChartCard({ title, sub, children, action, filter, filterOptions, onFilterChange, className }: {
  title: string; sub: string; children: ReactNode; action?: ReactNode
  filter?: string; filterOptions?: string[]; onFilterChange?: (v: string) => void
  className?: string
}) {
  const [dropOpen, setDropOpen] = useState(false)
  const dropRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!dropOpen) return
    const h = (e: MouseEvent) => { if (dropRef.current && !dropRef.current.contains(e.target as Node)) setDropOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [dropOpen])

  return (
    <div className={`dashboard-card${className ? ` ${className}` : ''}`} style={{ background: '#fff', borderRadius: 6, border: '1px solid #e5e7eb', padding: '18px 20px 20px', boxShadow: '0 1px 4px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column' }}>
      <div className="dashboard-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: sub ? 2 : 12 }}>
        <h3 style={{ margin: 0, fontSize: 14.5, fontWeight: 600, color: '#111827', letterSpacing: '-0.1px' }}>{title}</h3>
        {filter ? (
          <div ref={dropRef} style={{ position: 'relative', flexShrink: 0 }}>
            <button
              onClick={() => setDropOpen(v => !v)}
              style={{ border: '1px solid #e5e7eb', background: '#f9fafb', borderRadius: 6, padding: '3px 10px', fontSize: 11, color: '#374151', fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}
            >
              {filter}
              <ChevronDown size={11} style={{ transition: 'transform 150ms', transform: dropOpen ? 'rotate(180deg)' : 'none' }} />
            </button>
            {dropOpen && filterOptions && (
              <div style={{ position: 'absolute', top: 'calc(100% + 6px)', right: 0, minWidth: 160, background: '#fff', border: '1px solid #e5e7eb', borderRadius: 6, boxShadow: '0 6px 20px rgba(0,0,0,0.1)', zIndex: 50, overflow: 'hidden' }}>
                {filterOptions.map(opt => (
                  <button
                    key={opt}
                    onClick={() => { onFilterChange?.(opt); setDropOpen(false) }}
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', border: 'none', background: filter === opt ? '#f0fdf4' : 'transparent', padding: '8px 13px', fontSize: 12, color: filter === opt ? '#16a34a' : '#374151', fontWeight: filter === opt ? 600 : 400, cursor: 'pointer', textAlign: 'left', fontFamily: font }}
                  >
                    {opt}
                    {filter === opt && <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#22c55e', flexShrink: 0 }} />}
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : action}
      </div>
      {sub && <p style={{ margin: '4px 0 14px', fontSize: 12, color: '#000000' }}>{sub}</p>}
      {children}
    </div>
  )
}

function Sparkline({ data, color }: { data: number[]; color: string }) {
  if (data.length < 2) return null
  const max = Math.max(...data, 1)
  const w = 56, h = 28
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * w},${h - (v / max) * (h - 2) - 1}`).join(' ')
  return (
    <svg width={w} height={h} style={{ display: 'block' }}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

type DashboardChartDatum = Record<string, string | number | undefined>
type DashboardChartSeries = { key: string; name: string; color: string; opacity?: number }

function chartNumber(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0
}

function chartLabel(value: number) {
  const abs = Math.abs(value)
  if (abs >= 1000000) return `${value < 0 ? '-' : ''}${Math.round(abs / 1000000)}m`
  if (abs >= 1000) return `${value < 0 ? '-' : ''}${Math.round(abs / 1000)}k`
  return String(Math.round(value))
}

function niceChartMax(value: number) {
  if (value <= 0) return 1
  const magnitude = 10 ** Math.floor(Math.log10(value))
  const normalized = (value * 1.12) / magnitude
  const step = [1, 2, 3, 4, 5, 6, 8, 10].find(candidate => normalized <= candidate) || 10
  return step * magnitude
}

function chartRows(data: DashboardChartDatum[], series: DashboardChartSeries[], labelKey: string) {
  if (data.length) return data
  return [{ [labelKey]: 'No data', ...Object.fromEntries(series.map(item => [item.key, 0])) }]
}

function chartRange(rows: DashboardChartDatum[], series: DashboardChartSeries[], allowNegative = false) {
  const values = rows.flatMap(row => series.map(item => chartNumber(row[item.key])))
  const maxValue = niceChartMax(Math.max(1, ...values, allowNegative ? 0 : 1))
  const minValue = allowNegative ? Math.min(0, ...values) : 0
  if (maxValue === minValue) return { min: 0, max: maxValue + 1 }
  return { min: minValue, max: maxValue }
}

function DashboardBarChart({
  data,
  series,
  labelKey = 'month',
  height = 152,
  allowNegative = false,
  useDatumColor = false,
}: {
  data: DashboardChartDatum[]
  series: DashboardChartSeries[]
  labelKey?: string
  height?: number
  allowNegative?: boolean
  useDatumColor?: boolean
}) {
  const rows = chartRows(data, series, labelKey)
  const width = 520
  const left = 36
  const right = 10
  const top = 8
  const bottom = 24
  const plotW = width - left - right
  const plotH = height - top - bottom
  const range = chartRange(rows, series, allowNegative)
  const scaleY = (value: number) => top + ((range.max - value) / (range.max - range.min)) * plotH
  const baseline = scaleY(0)
  const groupW = plotW / Math.max(rows.length, 1)
  const maxBarW = series.length === 1 ? 24 : 16
  const barW = Math.max(5, Math.min(maxBarW, (groupW * 0.66) / Math.max(series.length, 1)))
  const totalBarW = barW * series.length
  const labelEvery = Math.max(1, Math.ceil(rows.length / 6))
  const ticks = allowNegative && range.min < 0 ? [range.max, 0, range.min] : [range.max, range.max / 2, 0]

  return (
    <svg viewBox={`0 0 ${width} ${height}`} width="100%" height="100%" preserveAspectRatio="none" role="img" aria-label="Dashboard bar chart" style={{ display: 'block', overflow: 'visible' }}>
      {ticks.map((tick, index) => {
        const y = scaleY(tick)
        return (
          <g key={`${tick}-${index}`}>
            <line x1={left} x2={width - right} y1={y} y2={y} stroke="#eef2f7" strokeDasharray="3 3" />
            <text x={left - 8} y={y + 3} textAnchor="end" fontSize="10" fill="#000000">{chartLabel(tick)}</text>
          </g>
        )
      })}
      {rows.map((row, rowIndex) => {
        const groupX = left + rowIndex * groupW + groupW / 2
        return (
          <g key={`${String(row[labelKey] || rowIndex)}-${rowIndex}`}>
            {series.map((item, seriesIndex) => {
              const value = chartNumber(row[item.key])
              const y = Math.min(scaleY(value), baseline)
              const barH = Math.max(0, Math.abs(scaleY(value) - baseline))
              const x = groupX - totalBarW / 2 + seriesIndex * barW
              const color = useDatumColor && typeof row.fill === 'string' ? row.fill : item.color
              return <rect key={item.key} x={x} y={y} width={Math.max(2, barW - 2)} height={barH} rx={3} fill={color} opacity={item.opacity ?? 1} />
            })}
            {rowIndex % labelEvery === 0 && (
              <text x={groupX} y={height - 6} textAnchor="middle" fontSize="10" fill="#000000">{String(row[labelKey] || '')}</text>
            )}
          </g>
        )
      })}
      {allowNegative && <line x1={left} x2={width - right} y1={baseline} y2={baseline} stroke="#dbe3ef" />}
    </svg>
  )
}

function DashboardLineChart({
  data,
  series,
  labelKey = 'month',
  height = 148,
  area = false,
}: {
  data: DashboardChartDatum[]
  series: DashboardChartSeries[]
  labelKey?: string
  height?: number
  area?: boolean
}) {
  const rows = chartRows(data, series, labelKey)
  const width = 520
  const left = 36
  const right = 10
  const top = 8
  const bottom = 24
  const plotW = width - left - right
  const plotH = height - top - bottom
  const range = chartRange(rows, series)
  const scaleY = (value: number) => top + ((range.max - value) / (range.max - range.min)) * plotH
  const scaleX = (index: number) => rows.length <= 1 ? left + plotW / 2 : left + (index / (rows.length - 1)) * plotW
  const labelEvery = Math.max(1, Math.ceil(rows.length / 6))
  const ticks = [range.max, range.max / 2, 0]

  return (
    <svg viewBox={`0 0 ${width} ${height}`} width="100%" height="100%" preserveAspectRatio="none" role="img" aria-label="Dashboard line chart" style={{ display: 'block', overflow: 'visible' }}>
      {ticks.map((tick, index) => {
        const y = scaleY(tick)
        return (
          <g key={`${tick}-${index}`}>
            <line x1={left} x2={width - right} y1={y} y2={y} stroke="#eef2f7" strokeDasharray="3 3" />
            <text x={left - 8} y={y + 3} textAnchor="end" fontSize="10" fill="#000000">{chartLabel(tick)}</text>
          </g>
        )
      })}
      {series.map(item => {
        const points = rows.map((row, index) => ({ x: scaleX(index), y: scaleY(chartNumber(row[item.key])) }))
        const linePath = points.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`).join(' ')
        const areaPath = `${linePath} L ${points[points.length - 1].x} ${scaleY(0)} L ${points[0].x} ${scaleY(0)} Z`
        return (
          <g key={item.key}>
            {area && <path d={areaPath} fill={item.color} opacity={item.opacity ?? 0.14} />}
            <path d={linePath} fill="none" stroke={item.color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
          </g>
        )
      })}
      {rows.map((row, index) => index % labelEvery === 0 && (
        <text key={`${String(row[labelKey] || index)}-${index}`} x={scaleX(index)} y={height - 6} textAnchor="middle" fontSize="10" fill="#000000">{String(row[labelKey] || '')}</text>
      ))}
    </svg>
  )
}

function KpiCard({ label, value, t, neg = false, icon: Icon, iconColor, sparkData, forecast, delta }: {
  label: string; value: string
  t: { text: string; up: boolean; zero: boolean }
  neg?: boolean
  icon: ComponentType<{ size?: number; color?: string }>
  iconColor: string
  sparkData: number[]
  forecast?: number
  delta?: number
}) {
  const positive = neg ? !t.up : t.up
  const showForecast = typeof forecast === 'number' && forecast > 0
  const showDelta = typeof delta === 'number' && delta !== 0
  return (
    <div className="dashboard-kpi-card" style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 6, padding: '15px 16px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
      <div style={{ display: 'flex', gap: 11, alignItems: 'flex-start' }}>
        <div style={{ width: 32, height: 32, borderRadius: 6, background: `${iconColor}18`, color: iconColor, display: 'grid', placeItems: 'center', flexShrink: 0 }}>
          <Icon size={15} color={iconColor} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, color: '#000000', fontWeight: 500, marginBottom: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</div>
          <div style={{ fontSize: 20, fontWeight: 700, color: '#111827', fontFamily: display, letterSpacing: '-0.4px', marginBottom: 4 }}>{value}</div>
          {showForecast ? (
            <div style={{ display: 'grid', gap: 2, marginBottom: 4 }}>
              <div style={{ fontSize: 11, color: '#000000', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{money(forecast)} Forecast</div>
              {showDelta ? <div style={{ fontSize: 11, color: delta > 0 ? '#f59e0b' : '#22c55e', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{money(Math.abs(delta))} Delta</div> : null}
            </div>
          ) : null}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 4 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 10, color: t.zero ? '#000000' : positive ? '#22c55e' : '#ef4444', fontWeight: 500, minWidth: 0 }}>
              {!t.zero && (t.up ? <TrendingUp size={10} /> : <TrendingDown size={10} />)}
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.text}</span>
            </div>
            <Sparkline data={sparkData} color={iconColor} />
          </div>
        </div>
      </div>
    </div>
  )
}

function Donut({ data, center }: { data: Array<{ name: string; value: number; color: string }>; center: string }) {
  const total = data.reduce((sum, item) => sum + Math.max(item.value, 0), 0) || 1
  const radius = 52
  const circumference = 2 * Math.PI * radius
  const segments = data.reduce<{
    offset: number
    items: Array<{ item: { name: string; value: number; color: string }; dash: string; dashOffset: number }>
  }>((acc, item) => {
    const value = Math.max(item.value, 0)
    const length = (value / total) * circumference
    return {
      offset: acc.offset + length,
      items: [
        ...acc.items,
        {
          item,
          dash: `${Math.max(0, length - (data.length > 1 ? 2 : 0))} ${circumference}`,
          dashOffset: -acc.offset,
        },
      ],
    }
  }, { offset: 0, items: [] }).items

  return (
    <div style={{ position: 'relative', width: 130, height: 130, flexShrink: 0 }}>
      <svg viewBox="0 0 130 130" width="130" height="130" role="img" aria-label="Dashboard donut chart" style={{ display: 'block' }}>
        <circle cx="65" cy="65" r={radius} fill="none" stroke="#eef2f7" strokeWidth="20" />
        {segments.map(({ item, dash, dashOffset }) => {
          return (
            <circle
              key={item.name}
              cx="65"
              cy="65"
              r={radius}
              fill="none"
              stroke={item.color}
              strokeWidth="20"
              strokeDasharray={dash}
              strokeDashoffset={dashOffset}
              strokeLinecap="butt"
              transform="rotate(-90 65 65)"
            />
          )
        })}
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', textAlign: 'center' }}>
        <div>
          <div style={{ fontSize: 9, color: '#000000', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.6px' }}>Total</div>
          <div style={{ fontSize: 20, fontWeight: 700, color: '#111827', fontFamily: display }}>{center}</div>
        </div>
      </div>
    </div>
  )
}

function DonutLegend({ data, total }: { data: Array<{ name: string; value: number; color: string }>; total: number }) {
  if (!data.length) return <div style={{ fontSize: 12, color: '#000000' }}>No data yet.</div>
  return (
    <div style={{ flex: 1, display: 'grid', gap: 7 }}>
      {data.map(d => (
        <div key={d.name} style={{ display: 'flex', justifyContent: 'space-between', gap: 6, fontSize: 12 }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#374151' }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: d.color, flexShrink: 0 }} />{d.name}
          </span>
          <span style={{ color: '#000000', whiteSpace: 'nowrap' }}>{d.value} ({pct(d.value, total)}%)</span>
        </div>
      ))}
    </div>
  )
}

function FinBlock({ icon: Icon, iconColor, label, value, t, divider = false }: {
  icon: ComponentType<{ size?: number; color?: string }>
  iconColor: string; label: string; value: string
  t: { text: string; up: boolean; zero: boolean }
  divider?: boolean
}) {
  return (
    <div style={{ display: 'flex', gap: 12, alignItems: 'center', justifyContent: 'space-between', padding: '14px 0', borderTop: divider ? '1px solid #f1f3f5' : 'none' }}>
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', minWidth: 0 }}>
        <div style={{ width: 38, height: 38, borderRadius: 6, background: `${iconColor}18`, color: iconColor, display: 'grid', placeItems: 'center', flexShrink: 0 }}>
          <Icon size={18} color={iconColor} />
        </div>
        <div style={{ fontSize: 13, color: '#000000', fontWeight: 500, lineHeight: 1.3 }}>{label}</div>
      </div>
      <div style={{ textAlign: 'right', flexShrink: 0 }}>
        <div style={{ fontSize: 17, fontWeight: 700, color: '#111827', fontFamily: display, letterSpacing: '-0.2px', whiteSpace: 'nowrap' }}>{value}</div>
        <div style={{ fontSize: 11, color: t.zero ? '#000000' : t.up ? iconColor : '#ef4444', marginTop: 2 }}>{t.text}</div>
      </div>
    </div>
  )
}

const activityIcons = {
  project:     { icon: FolderKanban,   bg: '#faf5ff', color: '#8b5cf6' },
  task:        { icon: ClipboardList,  bg: '#eff6ff', color: '#3b82f6' },
  client:      { icon: UsersRound,     bg: '#ecfdf5', color: '#10b981' },
  payment:     { icon: HandCoins,      bg: '#f0fdf4', color: '#22c55e' },
  opportunity: { icon: BadgeDollarSign,bg: '#fffbeb', color: '#f59e0b' },
  supplier:    { icon: Package,        bg: '#f0f9ff', color: '#6366f1' },
} as const

function ActivityRow({ item, divider = false, className }: { item: ActivityItem; divider?: boolean; className?: string }) {
  const cfg = activityIcons[item.type]
  const Icon = cfg.icon
  return (
    <div className={className} style={{ display: 'flex', gap: 12, alignItems: 'flex-start', padding: '12px 0', borderTop: divider ? '1px solid #f1f3f5' : 'none' }}>
      <div style={{ width: 34, height: 34, borderRadius: 6, background: cfg.bg, color: cfg.color, display: 'grid', placeItems: 'center', flexShrink: 0 }}>
        <Icon size={15} />
      </div>
      <div className="dashboard-activity-copy" style={{ flex: 1, minWidth: 0 }}>
        <div className="dashboard-activity-description" style={{ fontSize: 12.5, fontWeight: 500, color: '#374151', lineHeight: 1.4 }}>{item.description}</div>
        <div className="dashboard-activity-subtext" style={{ fontSize: 11, color: '#000000', marginTop: 2 }}>{item.subtext}</div>
      </div>
      <div className="dashboard-activity-time" style={{ fontSize: 11, color: '#000000', flexShrink: 0, whiteSpace: 'nowrap', paddingTop: 1 }}>{timeAgo(item.date)}</div>
    </div>
  )
}

function EmptyBox({ msg, sub }: { msg: string; sub: string }) {
  return (
    <div style={{ textAlign: 'center', padding: '16px 8px' }}>
      <div style={{ fontSize: 13, fontWeight: 500, color: '#000000', marginBottom: 4 }}>{msg}</div>
      <div style={{ fontSize: 12, color: '#000000' }}>{sub}</div>
    </div>
  )
}

function ModuleCard({ m }: { m: { title: string; href: string; icon: ComponentType<{ size?: number }>; color: string; stat: number; label: string } }) {
  const Icon = m.icon
  return (
    <Link href={m.href} style={{ textDecoration: 'none' }}>
      <div className="dashboard-module-card" style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 6, padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', transition: 'border-color 150ms ease' }}>
        <div style={{ width: 28, height: 28, borderRadius: 6, background: `${m.color}18`, color: m.color, display: 'grid', placeItems: 'center', flexShrink: 0 }}>
          <Icon size={13} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.title}</div>
          <div style={{ fontSize: 11, color: '#000000', marginTop: 1 }}>
            <span style={{ fontWeight: 600, color: m.color }}>{m.stat}</span> {m.label}
          </div>
        </div>
        <ChevronRight size={13} color="#d1d5db" style={{ flexShrink: 0 }} />
      </div>
    </Link>
  )
}

// --- Badge color helpers ------------------------------------------------------

function stageBadgeColor(status: string): { bg: string; text: string } {
  switch (status) {
    case 'lead':        return { bg: '#eff6ff', text: '#1d4ed8' }
    case 'qualified':   return { bg: '#f0fdf4', text: '#166534' }
    case 'site visit':  return { bg: '#ecfeff', text: '#0e7490' }
    case 'proposal':    return { bg: '#fffbeb', text: '#92400e' }
    case 'negotiation': return { bg: '#fff7ed', text: '#9a3412' }
    case 'awarded':
    case 'won':         return { bg: '#dcfce7', text: '#15803d' }
    case 'closed':
    case 'won / closed':return { bg: '#f1f5f9', text: '#000000' }
    default:            return { bg: '#f3f4f6', text: '#000000' }
  }
}

function statusBadgeColor(status: string): { bg: string; text: string } {
  switch (status) {
    case 'paid':     return { bg: '#dcfce7', text: '#15803d' }
    case 'approved':
    case 'completed':return { bg: '#dcfce7', text: '#15803d' }
    case 'sent':
    case 'draft':
    case 'in review':
    case 'pending':  return { bg: '#fffbeb', text: '#92400e' }
    case 'partially paid':
    case 'unpaid':   return { bg: '#fff7ed', text: '#9a3412' }
    case 'overdue':  return { bg: '#fef2f2', text: '#991b1b' }
    default:         return { bg: '#f3f4f6', text: '#000000' }
  }
}

// --- SalesFunnel --------------------------------------------------------------

function SalesFunnel({ data }: { data: Array<{ stage: string; color: string; count: number; value: number }> }) {
  const maxCount = Math.max(...data.map(d => d.count), 1)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, width: 110, flexShrink: 0 }}>
      {data.map((d, i) => {
        // Each bar narrows from 100% at top to ~40% at bottom
        const widthPct = 100 - i * ((100 - 40) / Math.max(data.length - 1, 1))
        const barH = Math.max(10, Math.round((d.count / maxCount) * 22) + 10)
        return (
          <div key={d.stage} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
            <div style={{
              width: `${widthPct}%`,
              height: barH,
              background: d.color,
              borderRadius: 4,
              opacity: d.count === 0 ? 0.25 : 0.85,
              transition: 'width 300ms ease',
            }} />
          </div>
        )
      })}
    </div>
  )
}

// --- TabModules ---------------------------------------------------------------

type ModuleItem = { title: string; href: string; icon: ComponentType<{ size?: number }>; color: string; stat: number; label: string }

function TabModules({ title, subtitle, modules }: { title: string; subtitle: string; modules: ModuleItem[] }) {
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <div>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#000000', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{title}</div>
          {subtitle && <div style={{ fontSize: 12.5, color: '#000000', marginTop: 3 }}>{subtitle}</div>}
        </div>
      </div>
      <div className="modules-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(5, minmax(0, 1fr))', gap: 12 }}>
        {modules.map(m => <ModuleCard key={m.title} m={m} />)}
      </div>
    </div>
  )
}
