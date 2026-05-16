'use client'

import { type ComponentType, type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import {
  AlarmClock, AlertTriangle, Award,
  BadgeDollarSign, Boxes, Building2,
  CalendarDays, CheckCircle2, ChevronDown, ChevronRight,
  ClipboardList, FileText, FolderKanban,
  HandCoins, Package, Percent, Plus,
  Receipt, ShoppingBag, ShoppingCart,
  Target, TrendingDown, TrendingUp,
  UserPlus, UsersRound, Wallet, Warehouse, Zap,
} from 'lucide-react'
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell,
  Line, LineChart, Pie, PieChart,
  ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts'

const font = "var(--font-body)"
const display = "var(--font-body)"

// --- Types ------------------------------------------------------------------

interface ProjectRecord {
  id: number; name?: string; title?: string
  projectCost?: number; paidAmount?: number; unpaidAmount?: number
  materialCost?: number; laborCost?: number; overheadProfit?: number; generalExpense?: number
  status?: string; startDate?: string; endDate?: string; createdAt?: string
}
interface TaskRecord {
  id: number; title?: string; projectId?: number; stageId?: string
  status?: string; dueDate?: string; createdAt?: string; assignee?: string
}
interface ClientRecord  { id: number; name?: string; createdAt?: string }
interface SupplierRecord { id: number; name?: string; createdAt?: string }
interface OpportunityRecord {
  id: number; name?: string; quotation?: number; approvedBudget?: number; estimatedCost?: number
  status?: string; startDate?: string; createdAt?: string
}
interface BillRecord { id: number; name?: string; associated?: string; amount?: number; status?: string; date?: string; createdAt?: string }
interface BasicRecord { id: number; amount?: number; total?: number; status?: string; date?: string; createdAt?: string; dueDate?: string }
interface AccountRecord { name?: string; email?: string; company?: string; theme?: string; role?: string }
interface ActivityItem {
  id: string; type: 'project' | 'task' | 'client' | 'payment' | 'opportunity' | 'supplier'
  description: string; subtext: string; date: Date
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
function greeting() { const h = new Date().getHours(); return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening' }

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
  const [bills, setBills]           = useState<BillRecord[]>([])
  const [budgets, setBudgets]       = useState<BasicRecord[]>([])

  useEffect(() => {
    const id = window.setTimeout(() => {
      setAccount(loadStored('flowsys-account', {}))
      setProjects(loadStored('flowsys-projects', []))
      setTasks(loadStored('flowsys-assigned-tasks', []))
      setClients(loadStored('flowsys-clients', []))
      setSuppliers(loadStored('flowsys-suppliers', []))
      setWarehouses(loadStored('flowsys-warehouses', []))
      setOpps(loadStored('flowsys-opportunities', []))
      setBills(loadStored('flowsys-bills', []))
      setBudgets(loadStored('flowsys-budgets', []))
    }, 0)
    return () => window.clearTimeout(id)
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
    const revenue   = projects.reduce((s, p) => s + (p.paidAmount || 0), 0)
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
    return { revenue, expenses, profit, pipeline, openTasks, overdue }
  }, [projects, tasks, opps, bills])

  // -- Project perf paid/unpaid for subtitle ---------------------------------
  const perfPaid   = useMemo(() => projects.reduce((s, p) => s + (p.paidAmount || 0), 0), [projects])
  const perfUnpaid = useMemo(() => projects.reduce((s, p) => s + (p.unpaidAmount || 0), 0), [projects])

  // -- Timeline --------------------------------------------------------------
  const timeline = useMemo(() => {
    const today = new Date()
    const allDates = [
      ...projects.map(p => parseDate(p.createdAt || p.startDate)),
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
    opps.forEach(o => { const b = buckets.get(monthKey(parseDate(o.createdAt || o.startDate) || today)); if (b) b.pipeline += (o.quotation || o.approvedBudget || 0) })
    bills.forEach(bl => { const b = buckets.get(monthKey(parseDate(bl.date || bl.createdAt) || today)); if (b) { b.expenses += (bl.amount || 0); b.profit = Math.max(b.project - b.expenses, 0) } })

    const cur = buckets.get(monthKey(today))
    const prv = buckets.get(monthKey(addMonths(today, -1)))
    const data = Array.from(buckets.values())
    return { data, cur, prv }
  }, [projects, opps, bills])

  // -- Derived donuts --------------------------------------------------------
  const perfData = useMemo(() => {
    const paid  = projects.filter(p => (p.paidAmount || 0) >= (p.projectCost || 1) && (p.projectCost || 0) > 0).length
    const unpaid= projects.filter(p => (p.unpaidAmount || 0) > 0 && !(p.paidAmount)).length
    const inProg= projects.filter(p => ['ongoing', 'in progress'].includes(norm(p.status))).length
    const onHold= projects.filter(p => ['pending', 'on hold'].includes(norm(p.status))).length
    const canc  = projects.filter(p => norm(p.status) === 'cancelled').length
    return [
      { name: 'Paid',        value: paid,   color: '#22c55e' },
      { name: 'Unpaid',      value: unpaid, color: '#ef4444' },
      { name: 'In Progress', value: inProg, color: '#3b82f6' },
      { name: 'On Hold',     value: onHold, color: '#f59e0b' },
      { name: 'Cancelled',   value: canc,   color: '#9ca3af' },
    ].filter(d => d.value > 0)
  }, [projects])

  const healthData = useMemo(() => {
    const today = new Date()
    const onTrack = projects.filter(p => { const e = parseDate(p.endDate); return (norm(p.status) === 'ongoing' || norm(p.status) === 'completed') && (!e || e >= today) }).length
    const atRisk  = projects.filter(p => norm(p.status).includes('issue')).length
    const delayed = projects.filter(p => { const e = parseDate(p.endDate); return e && e < today && norm(p.status) !== 'completed' }).length
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
    bills.filter(b => norm(b.status) === 'paid').forEach(b => { const d = parseDate(b.date || b.createdAt); if (d) items.push({ id: `b${b.id}`, type: 'payment', description: `Payment received${b.associated ? ` for ${b.associated}` : ''}`, subtext: money(b.amount || 0), date: d }) })
    opps.forEach(o => { const d = parseDate(o.createdAt || o.startDate); if (d) items.push({ id: `o${o.id}`, type: 'opportunity', description: `Quote "${o.name || 'Untitled'}" added`, subtext: 'Sales', date: d }) })
    return items.sort((a, b) => b.date.getTime() - a.date.getTime()).slice(0, 6)
  }, [projects, tasks, clients, bills, opps])

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
    : [{ key: 'project', name: 'Project Value', color: '#22c55e' }, { key: 'expenses', name: 'Expenses', color: '#6b7280' }]

  // -- Date range ------------------------------------------------------------
  const dateRange = useMemo(() => {
    const allDates = [
      ...projects.map(p => parseDate(p.createdAt || p.startDate)),
      ...tasks.map(t => parseDate(t.createdAt || t.dueDate)),
      ...bills.map(b => parseDate(b.date || b.createdAt)),
      ...opps.map(o => parseDate(o.createdAt || o.startDate)),
    ].filter(Boolean) as Date[]
    if (!allDates.length) return new Date().toLocaleDateString('en-PH', { month: 'short', day: '2-digit', year: 'numeric' })
    const min = new Date(Math.min(...allDates.map(d => d.getTime())))
    const max = new Date(Math.max(...allDates.map(d => d.getTime())))
    const fmt = (d: Date) => d.toLocaleDateString('en-PH', { month: 'short', day: '2-digit', year: 'numeric' })
    if (min.toDateString() === max.toDateString()) return fmt(min)
    return `${fmt(min)} – ${fmt(max)}`
  }, [projects, tasks, bills, opps])

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
    const closed      = opps.filter(o => ['won','closed','won / closed'].includes(norm(o.status))).length
    const conversion  = opps.length ? Math.round((closed / opps.length) * 100) : 0
    const target      = budgets.reduce((s, b) => s + (b.total || b.amount || 0), 0)
    const stageOrder  = ['lead','qualified','proposal','negotiation','won']
    const stageColors: Record<string, string> = {
      lead: '#3b82f6', qualified: '#22c55e', proposal: '#f59e0b', negotiation: '#f97316', won: '#ef4444',
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
      Other:        { color: '#9ca3af', count: 0 },
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
    const outstanding    = bills.filter(b => ['unpaid','pending','overdue'].includes(norm(b.status)))
    const outstandingAmt = outstanding.reduce((s, b) => s + (b.amount || 0), 0)
    const cashFlow       = stats.revenue - stats.expenses
    const totalBudget    = budgets.reduce((s, b) => s + (b.total || b.amount || 0), 0)
    const budgetUsage    = totalBudget ? Math.min(100, Math.round((stats.expenses / totalBudget) * 100)) : 0
    const recentInvoices = [...bills].sort((a, b) => new Date(b.date || b.createdAt || 0).getTime() - new Date(a.date || a.createdAt || 0).getTime()).slice(0, 5)
    const opsVal   = projects.reduce((s, p) => s + (p.overheadProfit || 0) + (p.generalExpense || 0), 0)
    const projVal  = projects.reduce((s, p) => s + (p.materialCost || 0) + (p.laborCost || 0), 0)
    const billsVal = bills.reduce((s, b) => s + (b.amount || 0), 0)
    const budgetAlloc = [
      { name: 'Operations', color: '#22c55e', value: opsVal  },
      { name: 'Projects',   color: '#3b82f6', value: projVal },
      { name: 'Marketing',  color: '#f59e0b', value: 0 },
      { name: 'HR & Admin', color: '#ec4899', value: 0 },
      { name: 'IT & Software', color: '#8b5cf6', value: 0 },
      { name: 'Others',     color: '#9ca3af', value: billsVal },
    ]
    const alerts: { level: 'error'|'warning'|'info'; title: string; msg: string }[] = []
    if (outstanding.length > 0) alerts.push({ level: 'error',   title: 'Overdue Invoices',  msg: `You have ${outstanding.length} overdue invoice${outstanding.length > 1 ? 's' : ''}.` })
    if (cashFlow < 0)           alerts.push({ level: 'warning', title: 'Low Cash Balance',   msg: 'Your cash balance is below the threshold.' })
    if (budgetUsage > 80)       alerts.push({ level: 'warning', title: 'Budget Alert',        msg: `${budgetUsage}% of budget used for this year.` })
    if (!alerts.length)         alerts.push({ level: 'info',    title: 'All Clear',           msg: 'No financial alerts at this time.' })
    return { outstandingAmt, cashFlow, budgetUsage, totalBudget, recentInvoices, budgetAlloc, alerts }
  }, [bills, stats, budgets, projects])

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
    if (salesPeriod === 'This Year')  return timeline.data.filter(d => d.key.startsWith(String(yr)))
    if (salesPeriod === 'Last Year')  return timeline.data.filter(d => d.key.startsWith(String(yr - 1)))
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

  // Task complete toggle (writes to localStorage + updates state)
  const completeTask = useCallback((id: number) => {
    setTasks(prev => {
      const updated = prev.map(t => t.id === id ? { ...t, status: 'Completed' } : t)
      try { window.localStorage.setItem('flowsys-assigned-tasks', JSON.stringify(updated)) } catch { /* ignore */ }
      return updated
    })
  }, [])

  // -- Module cards ----------------------------------------------------------
  const modules: { title: string; href: string; icon: ComponentType<{ size?: number }>; color: string; stat: number; label: string }[] = [
    { title: 'Client Database',       href: '/client-database',    icon: UsersRound,    color: '#06b6d4', stat: clients.length,   label: 'client records' },
    { title: 'Sales',                 href: '/sales',              icon: BadgeDollarSign,color: '#f59e0b', stat: opps.length,     label: 'opportunities' },
    { title: 'Project Management',    href: '/project-management', icon: FolderKanban,  color: '#8b5cf6', stat: projects.length,  label: 'projects' },
    { title: 'Financial',             href: '/financial',          icon: HandCoins,     color: '#ef4444', stat: bills.length + budgets.length, label: 'records' },
    { title: 'HR',                    href: '/hr',                 icon: Building2,     color: '#ec4899', stat: 0,                label: 'team members' },
    { title: 'Procurement',           href: '/procurement',        icon: ShoppingCart,  color: '#f97316', stat: 0,                label: 'purchase orders' },
    { title: 'Supplier Database',     href: '/supplier-database',  icon: Package,       color: '#6366f1', stat: suppliers.length, label: 'suppliers' },
    { title: 'Warehouse / Inventory', href: '/warehouse-inventory',icon: Warehouse,     color: '#0ea5e9', stat: warehouses.length,label: 'warehouses' },
    { title: 'Workflows',             href: '/tasks',              icon: ClipboardList, color: '#22c55e', stat: tasks.filter(t => norm(t.status) !== 'completed').length, label: 'active workflows' },
    { title: 'To Do',                 href: '/to-do',              icon: Boxes,         color: '#64748b', stat: tasks.filter(t => norm(t.status) === 'open').length, label: 'open tasks' },
  ]

  // -- Render ----------------------------------------------------------------
  return (
    <main className="dashboard-page" style={{ fontFamily: font, paddingBottom: 16 }}>

      {/* Page title + greeting row */}
      <div className="dash-header-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, gap: 12, flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 30, fontWeight: 700, color: '#111827', fontFamily: display, letterSpacing: '-0.3px' }}>
            Dashboard
          </h1>
          <p style={{ margin: '3px 0 0', fontSize: 14, color: '#6b7280' }}>
            {greeting()}, {firstName}! ?? Here&apos;s what&apos;s happening across your business today.
          </p>
        </div>
        <div className="dashboard-header-actions" style={{ display: 'flex', gap: 8, alignItems: 'center' }}>

          {/* Date range picker */}
          <div ref={dateRef} style={{ position: 'relative' }}>
            <button
              onClick={() => setDateOpen(v => !v)}
              style={{ border: '1px solid #e5e7eb', background: '#fff', borderRadius: 8, padding: '6px 12px', fontSize: 12, color: '#374151', fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}
            >
              ?? {dateRange} <ChevronDown size={12} style={{ transition: 'transform 150ms', transform: dateOpen ? 'rotate(180deg)' : 'none' }} />
            </button>
            {dateOpen && (
              <div style={{ position: 'absolute', top: 'calc(100% + 6px)', right: 0, width: 170, background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, boxShadow: '0 8px 24px rgba(0,0,0,0.1)', zIndex: 60, overflow: 'hidden' }}>
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
              style={{ background: '#22c55e', border: 'none', borderRadius: 8, padding: '6px 14px', fontSize: 12, color: '#fff', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}
            >
              <Plus size={13} /> New <ChevronDown size={12} style={{ transition: 'transform 150ms', transform: newOpen ? 'rotate(180deg)' : 'none' }} />
            </button>
            {newOpen && (
              <div style={{ position: 'absolute', top: 'calc(100% + 6px)', right: 0, width: 200, background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, boxShadow: '0 8px 24px rgba(0,0,0,0.12)', zIndex: 60, overflow: 'hidden' }}>
                {([
                  { label: 'New Project',     href: '/project-management', icon: FolderKanban,    color: '#8b5cf6' },
                  { label: 'New Task',        href: '/tasks',              icon: ClipboardList,   color: '#06b6d4' },
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
                    <span style={{ width: 26, height: 26, borderRadius: 7, background: `${color}18`, display: 'grid', placeItems: 'center', flexShrink: 0 }}>
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
      <div className="dashboard-tabs" style={{ display: 'flex', gap: 2, borderBottom: '1px solid #e5e7eb', marginBottom: 14 }}>
        {['Projects', 'Sales', 'Financials', 'Operations'].map(t => (
          <button key={t} className={tab === t ? 'is-active' : undefined} onClick={() => setTab(t)} style={{ border: 'none', borderBottom: `2px solid ${tab === t ? '#111827' : 'transparent'}`, background: 'transparent', color: tab === t ? '#111827' : '#6b7280', borderRadius: 0, padding: '8px 16px', fontSize: 13, fontWeight: 700, cursor: 'pointer', transition: 'border-color 150ms ease, color 150ms ease' }}>{t}</button>
        ))}
      </div>

      {/* -- KPI row — changes per tab --------------------------------------- */}
      <div className="kpi-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(6, minmax(0, 1fr))', gap: 10, marginBottom: 12 }}>
        {tab === 'Projects' && <>
          <KpiCard label="Total Projects" value={String(projects.length)} t={trends.neutral}  icon={CalendarDays}    iconColor="#22c55e" sparkData={sparklines.projects} />
          <KpiCard label="Revenue"        value={money(stats.revenue)}    t={trends.revenue}  icon={BadgeDollarSign} iconColor="#3b82f6" sparkData={sparklines.revenue} />
          <KpiCard label="Expenses"       value={money(stats.expenses)}   t={trends.expenses} icon={Receipt}         iconColor="#f97316" sparkData={sparklines.expenses} neg />
          <KpiCard label="Profit Margin"  value={money(stats.profit)}     t={trends.profit}   icon={TrendingUp}      iconColor="#8b5cf6" sparkData={sparklines.profit} />
          <KpiCard label="Open Tasks"     value={String(stats.openTasks)} t={trends.neutral}  icon={ClipboardList}   iconColor="#06b6d4" sparkData={sparklines.openTasks} />
          <KpiCard label="Overdue Jobs"   value={String(stats.overdue)}   t={trends.neutral}  icon={AlarmClock}      iconColor="#ef4444" sparkData={sparklines.overdue} neg />
        </>}
        {tab === 'Sales' && <>
          <KpiCard label="Total Revenue"    value={money(stats.revenue)}           t={trends.revenue}  icon={BadgeDollarSign} iconColor="#3b82f6" sparkData={sparklines.revenue} />
          <KpiCard label="New Leads"        value={String(salesData.leads)}        t={trends.neutral}  icon={UserPlus}        iconColor="#06b6d4" sparkData={sparklines.openTasks} />
          <KpiCard label="Opportunities"    value={String(salesData.closed + salesData.leads + opps.filter(o => !['won','closed','lead'].includes(norm(o.status))).length)} t={trends.neutral} icon={Target} iconColor="#f59e0b" sparkData={sparklines.projects} />
          <KpiCard label="Closed Deals"     value={String(salesData.closed)}       t={trends.neutral}  icon={Award}           iconColor="#22c55e" sparkData={sparklines.profit} />
          <KpiCard label="Conversion Rate"  value={`${salesData.conversion}%`}     t={trends.neutral}  icon={Percent}         iconColor="#8b5cf6" sparkData={sparklines.overdue} />
          <KpiCard label="Sales Target"     value={money(salesData.target)}        t={trends.neutral}  icon={TrendingUp}      iconColor="#f97316" sparkData={sparklines.revenue} />
        </>}
        {tab === 'Financials' && <>
          <KpiCard label="Total Revenue"        value={money(stats.revenue)}              t={trends.revenue}  icon={ShoppingBag}     iconColor="#22c55e" sparkData={sparklines.revenue} />
          <KpiCard label="Total Expenses"       value={money(stats.expenses)}             t={trends.expenses} icon={Receipt}         iconColor="#f97316" sparkData={sparklines.expenses} neg />
          <KpiCard label="Net Profit"           value={money(stats.profit)}               t={trends.profit}   icon={TrendingUp}      iconColor="#8b5cf6" sparkData={sparklines.profit} />
          <KpiCard label="Outstanding Invoices" value={money(finTabData.outstandingAmt)}  t={trends.neutral}  icon={FileText}        iconColor="#f59e0b" sparkData={sparklines.overdue} />
          <KpiCard label="Cash Flow"            value={money(Math.abs(finTabData.cashFlow))} t={finTabData.cashFlow >= 0 ? { text: '0% vs last', up: true, zero: true } : { text: 'Negative', up: false, zero: false }} icon={HandCoins} iconColor="#06b6d4" sparkData={sparklines.profit} />
          <KpiCard label="Budget Usage"         value={`${finTabData.budgetUsage}%`}      t={trends.neutral}  icon={Boxes}           iconColor="#ec4899" sparkData={sparklines.expenses} />
        </>}
        {tab === 'Operations' && <>
          <KpiCard label="Open Tasks"           value={String(opsData.openT)}   t={trends.neutral}  icon={ClipboardList}   iconColor="#06b6d4" sparkData={sparklines.openTasks} />
          <KpiCard label="Delayed Tasks"        value={String(opsData.delayed)} t={{ text: opsData.delayed > 0 ? 'Action needed' : 'All on track', up: opsData.delayed === 0, zero: opsData.delayed === 0 }} icon={AlarmClock} iconColor="#ef4444" sparkData={sparklines.overdue} neg />
          <KpiCard label="Active Workflows"     value={String(opsData.active)}  t={trends.neutral}  icon={Zap}             iconColor="#8b5cf6" sparkData={sparklines.openTasks} />
          <KpiCard label="Procurement Requests" value="0"                        t={trends.neutral}  icon={ShoppingCart}    iconColor="#f59e0b" sparkData={sparklines.overdue} />
          <KpiCard label="Warehouse Alerts"     value={String(warehouses.length)} t={trends.neutral} icon={Warehouse}       iconColor="#0ea5e9" sparkData={sparklines.projects} />
          <KpiCard label="Team Workload"        value="0%"                       t={trends.neutral}  icon={UsersRound}      iconColor="#22c55e" sparkData={sparklines.openTasks} />
        </>}
      </div>

      {/* -- Projects tab --------------------------------------------------- */}
      {tab === 'Projects' && <>
        <div className="charts-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 10, marginBottom: 10 }}>
          <ChartCard title="Project Performance" sub={`${projects.length} projects tracked with ${money(perfPaid)} paid and ${money(perfUnpaid)} unpaid.`} filter={perfFilter} filterOptions={['All Projects','Paid','Unpaid','In Progress','On Hold','Cancelled']} onFilterChange={setPerfFilter}>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginTop: 4 }}>
              <Donut data={filteredPerfData.length ? filteredPerfData : [{ name: 'None', value: 1, color: '#e5e7eb' }]} center={String(filteredPerfData.reduce((s, d) => s + d.value, 0) || projects.length)} />
              <DonutLegend data={filteredPerfData} total={projects.length} />
            </div>
          </ChartCard>
          <ChartCard title="Yearly Sales" sub="Balance statistics over time" filter={salesPeriod} filterOptions={['This Year','Last Year','All Time']} onFilterChange={setSalesPeriod}>
            <div style={{ height: 152, marginTop: 4 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={filteredTimeline} barGap={3} barSize={10}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                  <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: '#9ca3af', fontSize: 10 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#9ca3af', fontSize: 10 }} tickFormatter={v => `${Math.round(Number(v)/1000)}k`} width={32} />
                  <Tooltip formatter={v => money(Number(v))} contentStyle={{ borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 12, fontFamily: font }} />
                  {series.map(s => <Bar key={s.key} dataKey={s.key} name={s.name} fill={s.color} radius={[4,4,0,0]} />)}
                </BarChart>
              </ResponsiveContainer>
            </div>
          </ChartCard>
          <ChartCard title="Project Health" sub={`${projects.length} projects across all statuses`} filter={healthFilter} filterOptions={['All Projects','On Track','At Risk','Delayed']} onFilterChange={setHealthFilter}>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginTop: 4 }}>
              <Donut data={filteredHealthData.length ? filteredHealthData : [{ name: 'None', value: 1, color: '#e5e7eb' }]} center={String(filteredHealthData.reduce((s, d) => s + d.value, 0) || projects.length)} />
              <DonutLegend data={filteredHealthData} total={projects.length} />
            </div>
          </ChartCard>
        </div>
        <div className="data-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 10, marginBottom: 12 }}>
          <ChartCard title="Financial Overview" sub="" filter={finPeriod} filterOptions={['This Month','Last Month','This Quarter','This Year','All Time']} onFilterChange={setFinPeriod}>
            <div className="fin-overview-grid" style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 8, marginTop: 10 }}>
              <FinBlock icon={ShoppingBag} iconColor="#22c55e" label="Total Revenue"  value={money(finStats.revenue)}  t={trends.revenue} />
              <FinBlock icon={Receipt}     iconColor="#f97316" label="Total Expenses" value={money(finStats.expenses)} t={trends.expenses} />
              <FinBlock icon={Wallet}      iconColor="#3b82f6" label="Net Profit"     value={money(finStats.profit)}   t={trends.profit} />
            </div>
          </ChartCard>
          <ChartCard title="Recent Activity" sub="">
            {activity.length === 0 ? <EmptyBox msg="No recent activity" sub="Activity from across your workspace will appear here." /> : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 9, marginTop: 4 }}>
                {activity.slice(0, 4).map(item => <ActivityRow key={item.id} item={item} />)}
                <Link href="/project-management" style={{ fontSize: 12, color: '#22c55e', fontWeight: 500, textDecoration: 'none', marginTop: 2 }}>View all activity ?</Link>
              </div>
            )}
          </ChartCard>
          <ChartCard title="Upcoming Tasks" sub="" action={<Link href="/tasks" style={{ fontSize: 12, color: '#22c55e', fontWeight: 500, textDecoration: 'none' }}>View all</Link>}>
            {upcoming.length === 0 ? <EmptyBox msg="No tasks scheduled" sub="Tasks and to-dos assigned to you will appear here." /> : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 4 }}>
                {upcoming.slice(0, 4).map(t => (
                  <div key={t.id} style={{ display: 'flex', gap: 9, alignItems: 'flex-start' }}>
                    <div role="checkbox" aria-checked={false} tabIndex={0} onClick={() => completeTask(t.id)} onKeyDown={e => e.key === 'Enter' && completeTask(t.id)}
                      style={{ width: 14, height: 14, borderRadius: 4, border: '1.5px solid #d1d5db', flexShrink: 0, marginTop: 2, cursor: 'pointer' }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: 500, color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.title || 'Untitled'}</div>
                      <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 1 }}>{t.projectName || 'No project'}</div>
                    </div>
                    <div style={{ flexShrink: 0, textAlign: 'right' }}>
                      {t.dueDate && <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 1 }}>{new Date(`${t.dueDate}T00:00:00`).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })}</div>}
                      {t.urge && <span style={{ fontSize: 10, fontWeight: 600, padding: '1px 6px', borderRadius: 4, background: t.urge==='High'?'#fef2f2':t.urge==='Medium'?'#fffbeb':'#f0fdf4', color: t.urge==='High'?'#ef4444':t.urge==='Medium'?'#f59e0b':'#22c55e' }}>{t.urge}</span>}
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
        <div className="charts-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 10, marginBottom: 10 }}>
          <ChartCard title="Sales Pipeline" sub="" filter={salePipeFilter} filterOptions={['This Month','This Quarter','This Year','All Time']} onFilterChange={setSalePipeFilter}>
            <div style={{ display: 'flex', gap: 14, alignItems: 'center', marginTop: 8 }}>
              <SalesFunnel data={salesData.pipeline} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 110, flexShrink: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, fontSize: 10, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  <span>Stage</span><span>Deals</span>
                </div>
                {salesData.pipeline.map(d => (
                  <div key={d.stage} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, fontSize: 12 }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 5, color: '#374151' }}>
                      <span style={{ width: 7, height: 7, borderRadius: '50%', background: d.color, flexShrink: 0 }} />{d.stage}
                    </span>
                    <span style={{ color: '#9ca3af', whiteSpace: 'nowrap' }}>{d.count} ({pct(d.count, Math.max(salesData.pipeline.reduce((s,x)=>s+x.count,0),1))}%)</span>
                  </div>
                ))}
              </div>
            </div>
            <Link href="/sales" style={{ fontSize: 12, color: '#22c55e', fontWeight: 500, textDecoration: 'none', display: 'block', marginTop: 10 }}>View full pipeline ?</Link>
          </ChartCard>

          <ChartCard title="Revenue Trend" sub="Opportunities tracked over time" filter={revTrendFilter} filterOptions={['This Month','This Quarter','This Year']} onFilterChange={setRevTrendFilter}>
            <div style={{ height: 148, marginTop: 4 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={filteredTimeline}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                  <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: '#9ca3af', fontSize: 10 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#9ca3af', fontSize: 10 }} tickFormatter={v => `${Math.round(Number(v)/1000)}k`} width={32} />
                  <Tooltip formatter={v => money(Number(v))} contentStyle={{ borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 12, fontFamily: font }} />
                  <Line type="monotone" dataKey="project"  name="Revenue"      stroke="#22c55e" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="pipeline" name="Quotations"   stroke="#3b82f6" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="profit"   name="Closed Deals" stroke="#8b5cf6" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div style={{ display: 'flex', gap: 12, marginTop: 6, flexWrap: 'wrap' }}>
              {[{l:'Revenue',c:'#22c55e'},{l:'Quotations',c:'#3b82f6'},{l:'Closed Deals',c:'#8b5cf6'}].map(x => (
                <span key={x.l} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: '#6b7280' }}>
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
                    <span key={h} style={{ fontSize: 10, fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.04em', whiteSpace: 'nowrap' }}>{h}</span>
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
                      <span style={{ fontSize: 11, color: '#6b7280', whiteSpace: 'nowrap' }}>{deal.startDate ? new Date(`${deal.startDate}T00:00:00`).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: '2-digit' }) : '—'}</span>
                      <div style={{ width: 24, height: 24, borderRadius: '50%', background: '#1A73E8', color: '#fff', display: 'grid', placeItems: 'center', fontSize: 9, fontWeight: 700 }}>JP</div>
                    </div>
                  )
                })}
                <Link href="/sales" style={{ fontSize: 12, color: '#22c55e', fontWeight: 500, textDecoration: 'none', display: 'block', marginTop: 8 }}>View all deals ?</Link>
              </div>
            )}
          </ChartCard>
        </div>

        {/* Row 2: Sales Activity | Sales by Source | Quick Actions */}
        <div className="data-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 10, marginBottom: 12 }}>
          <ChartCard title="Sales Activity" sub="">
            {activity.filter(a => a.type === 'opportunity').length === 0 && activity.length === 0
              ? <EmptyBox msg="No sales activity" sub="Activity from opportunities will appear here." />
              : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 9, marginTop: 4 }}>
                  {(activity.filter(a => a.type === 'opportunity').length > 0 ? activity.filter(a => a.type === 'opportunity') : activity).slice(0, 5).map(item => <ActivityRow key={item.id} item={item} />)}
                  <Link href="/sales" style={{ fontSize: 12, color: '#22c55e', fontWeight: 500, textDecoration: 'none', marginTop: 2 }}>View all activity ?</Link>
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
                    <span style={{ color: '#9ca3af', whiteSpace: 'nowrap' }}>{d.value} ({pct(d.value, Math.max(opps.length,1))}%)</span>
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
                { label: 'Schedule Follow-up',  href: '/tasks',           icon: CalendarDays,    color: '#f97316' },
                { label: 'Import Leads',        href: '/sales',           icon: Package,         color: '#8b5cf6' },
              ] as const).map(a => (
                <Link key={a.label} href={a.href} style={{ textDecoration: 'none' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', border: '1px solid #e5e7eb', borderRadius: 9, cursor: 'pointer' }}>
                    <span style={{ width: 28, height: 28, borderRadius: 7, background: `${a.color}18`, display: 'grid', placeItems: 'center', flexShrink: 0 }}><a.icon size={13} color={a.color} /></span>
                    <span style={{ fontSize: 12, fontWeight: 500, color: '#374151', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{a.label}</span>
                    <ChevronRight size={12} color="#d1d5db" style={{ flexShrink: 0 }} />
                  </div>
                </Link>
              ))}
            </div>
          </ChartCard>
        </div>

        {/* Tip banner */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 12, padding: '12px 16px', marginBottom: 12 }}>
          <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#22c55e', display: 'grid', placeItems: 'center', flexShrink: 0 }}><TrendingUp size={15} color="#fff" /></div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#166534' }}>Tip: Keep your pipeline updated</div>
            <div style={{ fontSize: 12, color: '#16a34a' }}>Regular updates help you forecast accurately and close more deals.</div>
          </div>
          <Link href="/sales" style={{ flexShrink: 0, border: '1px solid #22c55e', background: '#fff', borderRadius: 7, padding: '5px 14px', fontSize: 12, fontWeight: 500, color: '#166534', textDecoration: 'none' }}>Learn more</Link>
        </div>

        <TabModules title="Sales modules" subtitle="Quick access to the sales areas." modules={[
          { title: 'Sales Pipeline',  href: '/sales',           icon: TrendingUp,      color: '#22c55e', stat: opps.length,    label: 'opportunities' },
          { title: 'Client Database', href: '/client-database', icon: UsersRound,      color: '#3b82f6', stat: clients.length, label: 'clients' },
          { title: 'Opportunities',   href: '/sales',           icon: BadgeDollarSign, color: '#f59e0b', stat: salesData.closed, label: 'closed deals' },
          { title: 'Quotations',      href: '/sales',           icon: FileText,        color: '#8b5cf6', stat: opps.filter(o=>norm(o.status)==='proposal').length, label: 'proposals' },
          { title: 'Reports',         href: '/financial',       icon: HandCoins,       color: '#ef4444', stat: bills.length,   label: 'invoices' },
        ]} />
      </>}

      {/* -- Financials tab -------------------------------------------------- */}
      {tab === 'Financials' && <>
        {/* Row 1: Income vs Expense | Cash Flow | Budget Allocation */}
        <div className="charts-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 10, marginBottom: 10 }}>
          <ChartCard title="Income vs Expense" sub="" filter={incExpFilter} filterOptions={['This Month','This Quarter','This Year','All Time']} onFilterChange={setIncExpFilter}>
            <div style={{ display: 'flex', gap: 10, marginBottom: 8, marginTop: 6 }}>
              {[{l:'Income',c:'#22c55e'},{l:'Expense',c:'#ef4444'}].map(x => (
                <span key={x.l} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: '#6b7280' }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: x.c }} />{x.l}
                </span>
              ))}
            </div>
            <div style={{ height: 140 }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={filteredTimeline}>
                  <defs>
                    <linearGradient id="gradIncome" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#22c55e" stopOpacity={0.18} />
                      <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gradExpense" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#ef4444" stopOpacity={0.14} />
                      <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                  <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: '#9ca3af', fontSize: 10 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#9ca3af', fontSize: 10 }} tickFormatter={v => `${Math.round(Number(v)/1000)}k`} width={32} />
                  <Tooltip formatter={v => money(Number(v))} contentStyle={{ borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 12, fontFamily: font }} />
                  <Area type="monotone" dataKey="project"  name="Income"  stroke="#22c55e" fill="url(#gradIncome)"  strokeWidth={2} />
                  <Area type="monotone" dataKey="expenses" name="Expense" stroke="#ef4444" fill="url(#gradExpense)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <Link href="/financial" style={{ fontSize: 12, color: '#22c55e', fontWeight: 500, textDecoration: 'none', display: 'block', marginTop: 8 }}>View full report ?</Link>
          </ChartCard>

          <ChartCard title="Cash Flow Overview" sub="" filter={cashFlowFilter} filterOptions={['This Month','This Quarter','This Year','All Time']} onFilterChange={setCashFlowFilter}>
            <div style={{ marginBottom: 6, marginTop: 4 }}>
              <div style={{ fontSize: 20, fontWeight: 700, color: '#111827', letterSpacing: '-0.3px' }}>{money(Math.abs(finTabData.cashFlow))}</div>
              <div style={{ fontSize: 12, color: '#9ca3af' }}>Net Cash Flow</div>
            </div>
            <div style={{ display: 'flex', gap: 10, marginBottom: 6 }}>
              {[{l:'Inflow',c:'#22c55e'},{l:'Outflow',c:'#ef4444'}].map(x => (
                <span key={x.l} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: '#6b7280' }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: x.c }} />{x.l}
                </span>
              ))}
            </div>
            <div style={{ height: 110 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={filteredTimeline.map(d => ({ ...d, cashFlow: d.project - d.expenses, inflow: d.project, outflow: -d.expenses }))} barGap={2} barSize={8}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                  <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: '#9ca3af', fontSize: 9 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#9ca3af', fontSize: 9 }} tickFormatter={v => `${Math.round(Number(v)/1000)}k`} width={28} />
                  <ReferenceLine y={0} stroke="#e5e7eb" strokeWidth={1} />
                  <Tooltip formatter={v => money(Math.abs(Number(v)))} contentStyle={{ borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 12, fontFamily: font }} />
                  <Bar dataKey="inflow"  name="Inflow"  fill="#22c55e" fillOpacity={0.75} radius={[3,3,0,0]} />
                  <Bar dataKey="outflow" name="Outflow" fill="#ef4444" fillOpacity={0.65} radius={[3,3,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <Link href="/financial" style={{ fontSize: 12, color: '#22c55e', fontWeight: 500, textDecoration: 'none', display: 'block', marginTop: 8 }}>View cash flow statement ?</Link>
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
                    <span style={{ color: '#9ca3af', whiteSpace: 'nowrap' }}>{pct(d.value, Math.max(stats.expenses,1))}%</span>
                  </div>
                ))}
              </div>
            </div>
            <Link href="/financial" style={{ fontSize: 12, color: '#22c55e', fontWeight: 500, textDecoration: 'none', display: 'block', marginTop: 10 }}>View budget details ?</Link>
          </ChartCard>
        </div>

        {/* Row 2: Recent Invoices | Expense Requests | Financial Alerts */}
        <div className="data-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 10, marginBottom: 12 }}>
          <ChartCard title="Recent Invoices" sub="" action={<Link href="/financial" style={{ fontSize: 12, color: '#22c55e', fontWeight: 500, textDecoration: 'none' }}>View all invoices ?</Link>}>
            {finTabData.recentInvoices.length === 0 ? <EmptyBox msg="No invoices yet" sub="Invoices will appear here once created." /> : (
              <div style={{ marginTop: 8 }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr auto auto auto', gap: '3px 8px', marginBottom: 6 }}>
                  {['Invoice #','Client','Amount','Due Date','Status'].map(h => (
                    <span key={h} style={{ fontSize: 10, fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.04em', whiteSpace: 'nowrap' }}>{h}</span>
                  ))}
                </div>
                {finTabData.recentInvoices.map((inv, i) => {
                  const sc = statusBadgeColor(norm(inv.status || ''))
                  return (
                    <div key={inv.id} style={{ display: 'grid', gridTemplateColumns: 'auto 1fr auto auto auto', gap: '3px 8px', padding: '7px 0', borderTop: '1px solid #f3f4f6', alignItems: 'center' }}>
                      <span style={{ fontSize: 12, color: '#6b7280', whiteSpace: 'nowrap' }}>#{String(inv.id).padStart(4,'0')}</span>
                      <span style={{ fontSize: 12, color: '#374151', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{inv.associated || inv.name || `Client ${i+1}`}</span>
                      <span style={{ fontSize: 12, fontWeight: 600, color: '#111827', whiteSpace: 'nowrap' }}>{money(inv.amount||0)}</span>
                      <span style={{ fontSize: 11, color: '#6b7280', whiteSpace: 'nowrap' }}>{inv.date ? new Date(`${inv.date}T00:00:00`).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}</span>
                      <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 99, background: sc.bg, color: sc.text, whiteSpace: 'nowrap' }}>{inv.status || 'Pending'}</span>
                    </div>
                  )
                })}
              </div>
            )}
          </ChartCard>

          <ChartCard title="Expense Requests" sub="" action={<Link href="/financial" style={{ fontSize: 12, color: '#22c55e', fontWeight: 500, textDecoration: 'none' }}>View all requests ?</Link>}>
            {bills.length === 0 ? <EmptyBox msg="No expense requests yet" sub="Expense requests will appear here." /> : (
              <div style={{ marginTop: 8 }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr auto auto auto', gap: '3px 8px', marginBottom: 6 }}>
                  {['Request #','Requested By','Amount','Date','Status'].map(h => (
                    <span key={h} style={{ fontSize: 10, fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.04em', whiteSpace: 'nowrap' }}>{h}</span>
                  ))}
                </div>
                {bills.slice(0,4).map((b, i) => {
                  const sc = statusBadgeColor(norm(b.status || ''))
                  return (
                    <div key={b.id} style={{ display: 'grid', gridTemplateColumns: 'auto 1fr auto auto auto', gap: '3px 8px', padding: '7px 0', borderTop: '1px solid #f3f4f6', alignItems: 'center' }}>
                      <span style={{ fontSize: 12, color: '#6b7280', whiteSpace: 'nowrap' }}>#{String(b.id).padStart(4,'0')}</span>
                      <span style={{ fontSize: 12, color: '#374151', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{b.name || `Request ${i+1}`}</span>
                      <span style={{ fontSize: 12, fontWeight: 600, color: '#111827', whiteSpace: 'nowrap' }}>{money(b.amount||0)}</span>
                      <span style={{ fontSize: 11, color: '#6b7280', whiteSpace: 'nowrap' }}>{b.date ? new Date(`${b.date}T00:00:00`).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}</span>
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
                  <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, background: cfg.bg, border: `1px solid ${cfg.border}`, borderRadius: 9, padding: '10px 12px' }}>
                    <AlertIcon size={15} color={cfg.iconColor} style={{ flexShrink: 0, marginTop: 1 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: cfg.textColor }}>{alert.title}</div>
                      <div style={{ fontSize: 11, color: cfg.iconColor, marginTop: 1 }}>{alert.msg}</div>
                    </div>
                    <ChevronRight size={13} color={cfg.iconColor} style={{ flexShrink: 0 }} />
                  </div>
                )
              })}
              <Link href="/financial" style={{ fontSize: 12, color: '#22c55e', fontWeight: 500, textDecoration: 'none', marginTop: 2 }}>View all alerts ?</Link>
            </div>
          </ChartCard>
        </div>

        <TabModules title="Financial modules" subtitle="Quick access to the financial areas." modules={[
          { title: 'Financial Overview', href: '/financial',          icon: HandCoins,       color: '#22c55e', stat: bills.length + budgets.length, label: 'records' },
          { title: 'Invoices',           href: '/financial',          icon: FileText,        color: '#3b82f6', stat: bills.filter(b=>norm(b.status)==='paid').length, label: 'paid' },
          { title: 'Expenses',           href: '/financial',          icon: Receipt,         color: '#f97316', stat: bills.length, label: 'expense records' },
          { title: 'Payments',           href: '/financial',          icon: ShoppingBag,     color: '#8b5cf6', stat: bills.filter(b=>norm(b.status)==='paid').length, label: 'payments' },
          { title: 'Reports',            href: '/financial',          icon: TrendingUp,      color: '#ef4444', stat: budgets.length, label: 'budgets' },
        ]} />
      </>}

      {/* -- Operations tab -------------------------------------------------- */}
      {tab === 'Operations' && <>
        {/* Row 1: Workflow Activity | Task Status | Team Workload */}
        <div className="charts-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 10, marginBottom: 10 }}>
          <ChartCard title="Workflow Activity" sub="" filter={wfFilter} filterOptions={['This Week','This Month','All Time']} onFilterChange={setWfFilter}>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginTop: 4 }}>
              <Donut data={opsData.workflowActivity.length ? opsData.workflowActivity : [{name:'None',value:1,color:'#e5e7eb'}]} center={String(tasks.length)} />
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 7 }}>
                {opsData.workflowActivity.length === 0 ? <div style={{ fontSize: 12, color: '#9ca3af' }}>No workflow data yet.</div> : opsData.workflowActivity.map(d => (
                  <div key={d.name} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#374151' }}>
                      <span style={{ width: 7, height: 7, borderRadius: '50%', background: d.color, flexShrink: 0 }} />{d.name}
                    </span>
                    <span style={{ color: '#9ca3af' }}>{d.value} ({pct(d.value, Math.max(tasks.length,1))}%)</span>
                  </div>
                ))}
              </div>
            </div>
          </ChartCard>

          <ChartCard title="Task Status Overview" sub="" filter={taskFilter} filterOptions={['This Week','This Month','All Time']} onFilterChange={setTaskFilter}>
            <div style={{ height: 158, marginTop: 4 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={opsData.taskStatusBars} barSize={28}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#9ca3af', fontSize: 10 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#9ca3af', fontSize: 10 }} width={24} />
                  <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 12, fontFamily: font }} />
                  <Bar dataKey="value" name="Tasks" radius={[4,4,0,0]}>
                    {opsData.taskStatusBars.map((entry, index) => <Cell key={index} fill={entry.fill} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
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
                          <span style={{ fontSize: 11, color: '#9ca3af' }}>{done}/{assigned.length} tasks</span>
                        </div>
                        <div style={{ height: 5, borderRadius: 3, background: '#f3f4f6', overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${loadPct}%`, background: loadPct > 80 ? '#ef4444' : loadPct > 60 ? '#f59e0b' : '#22c55e', borderRadius: 3 }} />
                        </div>
                      </div>
                      <span style={{ fontSize: 11, fontWeight: 600, color: '#374151', flexShrink: 0, minWidth: 28, textAlign: 'right' }}>{loadPct}%</span>
                    </div>
                  )
                })}
                <Link href="/tasks" style={{ fontSize: 12, color: '#22c55e', fontWeight: 500, textDecoration: 'none', marginTop: 2 }}>View all team workload ?</Link>
              </div>
            )}
          </ChartCard>
        </div>

        {/* Row 2: Procurement Status | Inventory Alerts | Upcoming Tasks */}
        <div className="data-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 10, marginBottom: 12 }}>
          <ChartCard title="Procurement Status" sub="" filter={procFilter} filterOptions={['All Requests','Approved','Pending','In Review']} onFilterChange={setProcFilter}>
            <EmptyBox msg="No procurement records" sub="Procurement requests will appear here." />
            <Link href="/procurement" style={{ fontSize: 12, color: '#22c55e', fontWeight: 500, textDecoration: 'none', display: 'block', marginTop: 4 }}>View all procurement ?</Link>
          </ChartCard>

          <ChartCard title="Inventory Alerts" sub="" filter={invFilter} filterOptions={['All Locations','Warehouse 1','Warehouse 2','Warehouse 3']} onFilterChange={setInvFilter}>
            {warehouses.length === 0 ? <EmptyBox msg="No inventory alerts" sub="Low stock items will appear here." /> : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
                {warehouses.slice(0, 4).map((wh, i) => (
                  <div key={wh.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', border: '1px solid #e5e7eb', borderRadius: 8 }}>
                    <div style={{ width: 28, height: 28, borderRadius: 7, background: '#fef2f218', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
                      <Warehouse size={13} color="#ef4444" />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: 500, color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>Warehouse {i + 1}</div>
                      <div style={{ fontSize: 11, color: '#9ca3af' }}>Location #{wh.id}</div>
                    </div>
                    <span style={{ fontSize: 11, fontWeight: 600, color: '#ef4444', whiteSpace: 'nowrap' }}>{wh.total ?? wh.amount ?? 0} units</span>
                  </div>
                ))}
                <Link href="/warehouse-inventory" style={{ fontSize: 12, color: '#22c55e', fontWeight: 500, textDecoration: 'none', marginTop: 2 }}>View all inventory ?</Link>
              </div>
            )}
          </ChartCard>

          <ChartCard title="Upcoming Tasks" sub="" action={<Link href="/tasks" style={{ fontSize: 12, color: '#22c55e', fontWeight: 500, textDecoration: 'none' }}>View all</Link>}>
            {upcoming.length === 0 ? <EmptyBox msg="No tasks scheduled" sub="Tasks assigned to you will appear here." /> : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 4 }}>
                {upcoming.slice(0, 5).map(t => (
                  <div key={t.id} style={{ display: 'flex', gap: 9, alignItems: 'flex-start' }}>
                    <div role="checkbox" aria-checked={false} tabIndex={0} onClick={() => completeTask(t.id)} onKeyDown={e => e.key === 'Enter' && completeTask(t.id)}
                      style={{ width: 14, height: 14, borderRadius: 4, border: '1.5px solid #d1d5db', flexShrink: 0, marginTop: 2, cursor: 'pointer' }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: 500, color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.title || 'Untitled'}</div>
                      <div style={{ fontSize: 11, color: '#9ca3af' }}>{t.projectName || 'Operations'}</div>
                    </div>
                    {t.dueDate && <div style={{ fontSize: 11, color: '#6b7280', flexShrink: 0, whiteSpace: 'nowrap' }}>{new Date(`${t.dueDate}T00:00:00`).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })}</div>}
                  </div>
                ))}
              </div>
            )}
          </ChartCard>
        </div>

        <TabModules title="Operations modules" subtitle="Quick access to key operations areas." modules={[
          { title: 'Workflows',   href: '/tasks',              icon: Zap,          color: '#22c55e', stat: opsData.active,        label: 'active workflows' },
          { title: 'Procurement', href: '/procurement',        icon: ShoppingCart, color: '#f59e0b', stat: 0,                     label: 'active requests' },
          { title: 'Warehouse',   href: '/warehouse-inventory',icon: Warehouse,    color: '#0ea5e9', stat: warehouses.length,      label: 'locations' },
          { title: 'Tasks',       href: '/tasks',              icon: ClipboardList,color: '#8b5cf6', stat: opsData.openT,          label: 'open tasks' },
          { title: 'Team Workload',href: '/hr',                icon: UsersRound,   color: '#ef4444', stat: Array.from(new Set(tasks.map(t=>t.assignee).filter(Boolean))).length, label: 'team members' },
        ]} />
      </>}
    </main>
  )
}

// --- Sub-components ----------------------------------------------------------

function ChartCard({ title, sub, children, action, filter, filterOptions, onFilterChange }: {
  title: string; sub: string; children: ReactNode; action?: ReactNode
  filter?: string; filterOptions?: string[]; onFilterChange?: (v: string) => void
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
    <div className="dashboard-card" style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', padding: '14px 16px 16px', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
      <div className="dashboard-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: sub ? 2 : 0 }}>
        <h3 style={{ margin: 0, fontSize: 14, fontWeight: 600, color: '#111827' }}>{title}</h3>
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
              <div style={{ position: 'absolute', top: 'calc(100% + 6px)', right: 0, minWidth: 160, background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, boxShadow: '0 6px 20px rgba(0,0,0,0.1)', zIndex: 50, overflow: 'hidden' }}>
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
      {sub && <p style={{ margin: '3px 0 0', fontSize: 12, color: '#9ca3af' }}>{sub}</p>}
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

function KpiCard({ label, value, t, neg = false, icon: Icon, iconColor, sparkData }: {
  label: string; value: string
  t: { text: string; up: boolean; zero: boolean }
  neg?: boolean
  icon: ComponentType<{ size?: number; color?: string }>
  iconColor: string
  sparkData: number[]
}) {
  const positive = neg ? !t.up : t.up
  return (
    <div className="dashboard-kpi-card" style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 11, padding: '11px 13px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
      <div style={{ display: 'flex', gap: 9, alignItems: 'flex-start' }}>
        <div style={{ width: 32, height: 32, borderRadius: 9, background: `${iconColor}18`, color: iconColor, display: 'grid', placeItems: 'center', flexShrink: 0 }}>
          <Icon size={15} color={iconColor} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, color: '#9ca3af', fontWeight: 500, marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: '#111827', fontFamily: display, letterSpacing: '-0.3px', marginBottom: 3 }}>{value}</div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 4 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 10, color: t.zero ? '#9ca3af' : positive ? '#22c55e' : '#ef4444', fontWeight: 500, minWidth: 0 }}>
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
  return (
    <div style={{ position: 'relative', width: 130, height: 130, flexShrink: 0 }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart><Pie data={data} innerRadius={40} outerRadius={62} dataKey="value" strokeWidth={0}>{data.map(d => <Cell key={d.name} fill={d.color} />)}</Pie></PieChart>
      </ResponsiveContainer>
      <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', textAlign: 'center' }}>
        <div>
          <div style={{ fontSize: 9, color: '#9ca3af', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.6px' }}>Total</div>
          <div style={{ fontSize: 20, fontWeight: 700, color: '#111827', fontFamily: display }}>{center}</div>
        </div>
      </div>
    </div>
  )
}

function DonutLegend({ data, total }: { data: Array<{ name: string; value: number; color: string }>; total: number }) {
  if (!data.length) return <div style={{ fontSize: 12, color: '#9ca3af' }}>No data yet.</div>
  return (
    <div style={{ flex: 1, display: 'grid', gap: 7 }}>
      {data.map(d => (
        <div key={d.name} style={{ display: 'flex', justifyContent: 'space-between', gap: 6, fontSize: 12 }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#374151' }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: d.color, flexShrink: 0 }} />{d.name}
          </span>
          <span style={{ color: '#9ca3af', whiteSpace: 'nowrap' }}>{d.value} ({pct(d.value, total)}%)</span>
        </div>
      ))}
    </div>
  )
}

function FinBlock({ icon: Icon, iconColor, label, value, t }: {
  icon: ComponentType<{ size?: number; color?: string }>
  iconColor: string; label: string; value: string
  t: { text: string; up: boolean; zero: boolean }
}) {
  return (
    <div className="dashboard-activity-row" style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
      <div style={{ width: 34, height: 34, borderRadius: 9, background: `${iconColor}18`, color: iconColor, display: 'grid', placeItems: 'center', flexShrink: 0 }}>
        <Icon size={16} color={iconColor} />
      </div>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 13, color: '#9ca3af', fontWeight: 500, marginBottom: 3 }}>{label}</div>
        <div style={{ fontSize: 15, fontWeight: 700, color: '#111827', fontFamily: display, letterSpacing: '-0.2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{value}</div>
        <div style={{ fontSize: 10, color: t.zero ? '#9ca3af' : t.up ? iconColor : '#ef4444', marginTop: 2 }}>{t.text}</div>
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

function ActivityRow({ item }: { item: ActivityItem }) {
  const cfg = activityIcons[item.type]
  const Icon = cfg.icon
  return (
    <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
      <div style={{ width: 30, height: 30, borderRadius: 8, background: cfg.bg, color: cfg.color, display: 'grid', placeItems: 'center', flexShrink: 0 }}>
        <Icon size={14} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12, fontWeight: 500, color: '#374151', lineHeight: 1.4 }}>{item.description}</div>
        <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 1 }}>{item.subtext}</div>
      </div>
      <div style={{ fontSize: 11, color: '#9ca3af', flexShrink: 0, whiteSpace: 'nowrap' }}>{timeAgo(item.date)}</div>
    </div>
  )
}

function EmptyBox({ msg, sub }: { msg: string; sub: string }) {
  return (
    <div style={{ textAlign: 'center', padding: '16px 8px' }}>
      <div style={{ fontSize: 13, fontWeight: 500, color: '#6b7280', marginBottom: 4 }}>{msg}</div>
      <div style={{ fontSize: 12, color: '#9ca3af' }}>{sub}</div>
    </div>
  )
}

function ModuleCard({ m }: { m: { title: string; href: string; icon: ComponentType<{ size?: number }>; color: string; stat: number; label: string } }) {
  const Icon = m.icon
  return (
    <Link href={m.href} style={{ textDecoration: 'none' }}>
      <div className="dashboard-module-card" style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 9, padding: '9px 12px', display: 'flex', alignItems: 'center', gap: 9, cursor: 'pointer', transition: 'border-color 150ms ease' }}>
        <div style={{ width: 28, height: 28, borderRadius: 7, background: `${m.color}18`, color: m.color, display: 'grid', placeItems: 'center', flexShrink: 0 }}>
          <Icon size={13} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.title}</div>
          <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 1 }}>
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
    case 'proposal':    return { bg: '#fffbeb', text: '#92400e' }
    case 'negotiation': return { bg: '#fff7ed', text: '#9a3412' }
    case 'won':         return { bg: '#dcfce7', text: '#15803d' }
    case 'closed':
    case 'won / closed':return { bg: '#f1f5f9', text: '#475569' }
    default:            return { bg: '#f3f4f6', text: '#6b7280' }
  }
}

function statusBadgeColor(status: string): { bg: string; text: string } {
  switch (status) {
    case 'paid':     return { bg: '#dcfce7', text: '#15803d' }
    case 'pending':  return { bg: '#fffbeb', text: '#92400e' }
    case 'unpaid':   return { bg: '#fff7ed', text: '#9a3412' }
    case 'overdue':  return { bg: '#fef2f2', text: '#991b1b' }
    default:         return { bg: '#f3f4f6', text: '#6b7280' }
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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 600, color: '#111827' }}>{title}</div>
          {subtitle && <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 1 }}>{subtitle}</div>}
        </div>
      </div>
      <div className="modules-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(5, minmax(0, 1fr))', gap: 8 }}>
        {modules.map(m => <ModuleCard key={m.title} m={m} />)}
      </div>
    </div>
  )
}
