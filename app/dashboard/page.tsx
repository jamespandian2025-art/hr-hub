'use client'

import { type ComponentType, type ReactNode, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import {
  BadgeDollarSign,
  Boxes,
  Building2,
  ChevronDown,
  ChevronRight,
  ClipboardList,
  FolderKanban,
  HandCoins,
  Home,
  Package,
  Plus,
  ShoppingCart,
  TrendingDown,
  TrendingUp,
  UsersRound,
  Warehouse,
} from 'lucide-react'
import {
  Bar, BarChart, CartesianGrid, Cell,
  Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts'

const font = "'DM Sans', sans-serif"
const display = "'Outfit', 'DM Sans', sans-serif"

// ─── Types ──────────────────────────────────────────────────────────────────

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

// ─── Helpers ────────────────────────────────────────────────────────────────

function loadStored<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback
  try { const r = window.localStorage.getItem(key); return r ? JSON.parse(r) as T : fallback } catch { return fallback }
}
function money(v: number) { return `Php ${v.toLocaleString('en-PH', { maximumFractionDigits: 0 })}` }
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
  if (!prv && !cur) return { text: '0% vs last period', up: true, zero: true }
  if (!prv) return { text: '+100% vs last period', up: true, zero: false }
  const ch = ((cur - prv) / prv) * 100
  return { text: `${ch >= 0 ? '+' : ''}${Math.round(ch)}% vs last period`, up: ch >= 0, zero: ch === 0 }
}
function greeting() { const h = new Date().getHours(); return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening' }

// ─── Dashboard ──────────────────────────────────────────────────────────────

export default function Dashboard() {
  const [tab, setTab] = useState('Projects')
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
    setAccount(loadStored('flowsys-account', {}))
    setProjects(loadStored('flowsys-projects', []))
    setTasks(loadStored('flowsys-assigned-tasks', []))
    setClients(loadStored('flowsys-clients', []))
    setSuppliers(loadStored('flowsys-suppliers', []))
    setWarehouses(loadStored('flowsys-warehouses', []))
    setOpps(loadStored('flowsys-opportunities', []))
    setBills(loadStored('flowsys-bills', []))
    setBudgets(loadStored('flowsys-budgets', []))
  }, [])

  // ── Analytics ─────────────────────────────────────────────────────────────
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

  // ── Timeline ──────────────────────────────────────────────────────────────
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

    const buckets = new Map(months.map(k => [k, { key: k, month: monthLabel(k), project: 0, pipeline: 0, expenses: 0, profit: 0 }]))
    projects.forEach(p => {
      const b = buckets.get(monthKey(parseDate(p.createdAt || p.startDate) || today))
      if (!b) return
      const cost = p.projectCost || 0
      const exp  = (p.materialCost || 0) + (p.laborCost || 0) + (p.overheadProfit || 0) + (p.generalExpense || 0)
      b.project += cost; b.expenses += exp; b.profit = Math.max(b.project - b.expenses, 0)
    })
    opps.forEach(o => { const b = buckets.get(monthKey(parseDate(o.createdAt || o.startDate) || today)); if (b) b.pipeline += (o.quotation || o.approvedBudget || 0) })
    bills.forEach(bl => { const b = buckets.get(monthKey(parseDate(bl.date || bl.createdAt) || today)); if (b) { b.expenses += (bl.amount || 0); b.profit = Math.max(b.project - b.expenses, 0) } })

    const cur = buckets.get(monthKey(today))
    const prv = buckets.get(monthKey(addMonths(today, -1)))
    return { data: Array.from(buckets.values()), cur, prv }
  }, [projects, opps, bills])

  // ── Derived donuts ────────────────────────────────────────────────────────
  const perfData = useMemo(() => {
    const paid  = projects.filter(p => (p.paidAmount || 0) >= (p.projectCost || 1) && (p.projectCost || 0) > 0).length
    const unpaid= projects.filter(p => (p.unpaidAmount || 0) > 0 && !(p.paidAmount)).length
    const inProg= projects.filter(p => ['ongoing', 'in progress'].includes(norm(p.status))).length
    const onHold= projects.filter(p => ['pending', 'on hold'].includes(norm(p.status))).length
    const canc  = projects.filter(p => norm(p.status) === 'cancelled').length
    return [
      { name: 'Paid',        value: paid,   color: '#1db954' },
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
      { name: 'On Track', value: onTrack, color: '#1db954' },
      { name: 'At Risk',  value: atRisk,  color: '#f59e0b' },
      { name: 'Delayed',  value: delayed, color: '#ef4444' },
    ].filter(d => d.value > 0)
  }, [projects])

  // ── Recent activity ───────────────────────────────────────────────────────
  const activity = useMemo((): ActivityItem[] => {
    const items: ActivityItem[] = []
    projects.forEach(p => { const d = parseDate(p.createdAt); if (d) items.push({ id: `p${p.id}`, type: 'project', description: `Project "${p.name || p.title || 'Untitled'}" created`, subtext: 'Project Management', date: d }) })
    tasks.forEach(t => { const d = parseDate(t.createdAt); if (d) items.push({ id: `t${t.id}`, type: 'task', description: `Task "${t.title || 'Untitled'}" created`, subtext: t.assignee ? `By ${t.assignee}` : 'Tasks', date: d }) })
    clients.forEach(c => { const d = parseDate(c.createdAt); if (d) items.push({ id: `c${c.id}`, type: 'client', description: `Client "${c.name || 'Unknown'}" added`, subtext: 'Client Database', date: d }) })
    bills.filter(b => norm(b.status) === 'paid').forEach(b => { const d = parseDate(b.date || b.createdAt); if (d) items.push({ id: `b${b.id}`, type: 'payment', description: `Payment received${b.associated ? ` for ${b.associated}` : ''}`, subtext: money(b.amount || 0), date: d }) })
    opps.forEach(o => { const d = parseDate(o.createdAt || o.startDate); if (d) items.push({ id: `o${o.id}`, type: 'opportunity', description: `Quote "${o.name || 'Untitled'}" added`, subtext: 'Sales', date: d }) })
    return items.sort((a, b) => b.date.getTime() - a.date.getTime()).slice(0, 6)
  }, [projects, tasks, clients, bills, opps])

  // ── Upcoming tasks ────────────────────────────────────────────────────────
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

  // ── Trends ────────────────────────────────────────────────────────────────
  const trends = useMemo(() => ({
    revenue:  trend(timeline.cur?.project || 0, timeline.prv?.project || 0),
    expenses: trend(timeline.cur?.expenses || 0, timeline.prv?.expenses || 0),
    profit:   trend(timeline.cur?.profit || 0, timeline.prv?.profit || 0),
    neutral:  { text: '0% vs last period', up: true, zero: true },
  }), [timeline])

  // ── Chart series ──────────────────────────────────────────────────────────
  const series = tab === 'Sales'
    ? [{ key: 'pipeline', name: 'Pipeline', color: '#f59e0b' }, { key: 'project', name: 'Won', color: '#1db954' }]
    : tab === 'Financials'
    ? [{ key: 'expenses', name: 'Expenses', color: '#ef4444' }, { key: 'profit', name: 'Profit', color: '#1db954' }]
    : [{ key: 'project', name: 'Project Value', color: '#1db954' }, { key: 'expenses', name: 'Expenses', color: '#6b7280' }]

  const firstName = account.name?.split(' ')[0] || 'there'

  // ── Module cards ──────────────────────────────────────────────────────────
  const modules: { title: string; href: string; icon: ComponentType<{ size?: number }>; color: string; stat: number; label: string }[] = [
    { title: 'Client Database',       href: '/client-database',    icon: UsersRound,    color: '#06b6d4', stat: clients.length,   label: 'client records' },
    { title: 'Sales',                 href: '/sales',              icon: BadgeDollarSign,color: '#f59e0b', stat: opps.length,     label: 'opportunities' },
    { title: 'Project Management',    href: '/project-management', icon: FolderKanban,  color: '#8b5cf6', stat: projects.length,  label: 'projects' },
    { title: 'Financial',             href: '/financial',          icon: HandCoins,     color: '#ef4444', stat: bills.length + budgets.length, label: 'records' },
    { title: 'HR',                    href: '/hr',                 icon: Building2,     color: '#ec4899', stat: 0,                label: 'team members' },
    { title: 'Procurement',           href: '/procurement',        icon: ShoppingCart,  color: '#f97316', stat: 0,                label: 'purchase orders' },
    { title: 'Supplier Database',     href: '/supplier-database',  icon: Package,       color: '#6366f1', stat: suppliers.length, label: 'suppliers' },
    { title: 'Warehouse / Inventory', href: '/warehouse-inventory',icon: Warehouse,     color: '#0ea5e9', stat: warehouses.length,label: 'warehouses' },
    { title: 'Workflows',             href: '/tasks',              icon: ClipboardList, color: '#1db954', stat: tasks.filter(t => norm(t.status) !== 'completed').length, label: 'active workflows' },
    { title: 'To Do',                 href: '/to-do',              icon: Boxes,         color: '#64748b', stat: tasks.filter(t => norm(t.status) === 'open').length, label: 'open tasks' },
  ]

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <main style={{ fontFamily: font, paddingBottom: 48 }}>

      {/* Breadcrumb */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: '#9ca3af', marginBottom: 18 }}>
        <Home size={12} />
        <ChevronRight size={11} />
        <span style={{ color: '#374151', fontWeight: 500 }}>Dashboard</span>
      </div>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, gap: 16, flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 26, fontWeight: 700, color: '#111827', fontFamily: display, letterSpacing: '-0.3px' }}>
            {greeting()}, {firstName}! 👋
          </h1>
          <p style={{ margin: '6px 0 0', fontSize: 14, color: '#6b7280' }}>Here's what's happening across your business today.</p>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <button style={{ border: '1px solid #e5e7eb', background: '#fff', borderRadius: 8, padding: '8px 14px', fontSize: 13, color: '#374151', fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
            {new Date().toLocaleDateString('en-PH', { month: 'short', day: '2-digit', year: 'numeric' })}
          </button>
          <button style={{ background: '#1db954', border: 'none', borderRadius: 8, padding: '8px 16px', fontSize: 13, color: '#fff', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
            <Plus size={14} />New<ChevronDown size={13} />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 2, borderBottom: '1px solid #e5e7eb', marginBottom: 22 }}>
        {['Projects', 'Sales', 'Financials', 'Operations'].map(t => (
          <button key={t} onClick={() => setTab(t)} style={{ border: 'none', borderBottom: `2px solid ${tab === t ? '#1db954' : 'transparent'}`, background: 'transparent', color: tab === t ? '#1db954' : '#6b7280', padding: '10px 18px', fontSize: 14, fontWeight: 600, cursor: 'pointer', transition: 'color 150ms ease' }}>{t}</button>
        ))}
      </div>

      {/* KPI row — 6 cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, minmax(0, 1fr))', gap: 12, marginBottom: 18 }}>
        <KpiCard label="Total Projects" value={String(projects.length)} t={trends.neutral} />
        <KpiCard label="Revenue"        value={money(stats.revenue)}    t={trends.revenue} />
        <KpiCard label="Expenses"       value={money(stats.expenses)}   t={trends.expenses} neg />
        <KpiCard label="Profit Margin"  value={money(stats.profit)}     t={trends.profit} />
        <KpiCard label="Open Tasks"     value={String(stats.openTasks)} t={trends.neutral} />
        <KpiCard label="Overdue Jobs"   value={String(stats.overdue)}   t={trends.neutral} neg />
      </div>

      {/* 3-column charts */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 14, marginBottom: 14 }}>

        {/* Project Performance */}
        <ChartCard title="Project Performance" sub={`${projects.length} projects across all statuses`}>
          <div style={{ display: 'flex', gap: 14, alignItems: 'center', marginTop: 4 }}>
            <Donut data={perfData.length ? perfData : [{ name: 'None', value: 1, color: '#e5e7eb' }]} center={String(projects.length)} />
            <DonutLegend data={perfData} total={projects.length} />
          </div>
        </ChartCard>

        {/* Yearly Sales */}
        <ChartCard title={tab === 'Sales' ? 'Pipeline & Delivery' : 'Yearly Sales'} sub="Balance statistics over time">
          <div style={{ height: 188, marginTop: 4 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={timeline.data} barGap={3} barSize={10}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: '#9ca3af', fontSize: 11 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#9ca3af', fontSize: 11 }} tickFormatter={v => `${Math.round(Number(v) / 1000)}k`} width={36} />
                <Tooltip formatter={(v: number) => money(v)} contentStyle={{ borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 12, fontFamily: font }} />
                {series.map(s => <Bar key={s.key} dataKey={s.key} name={s.name} fill={s.color} radius={[4, 4, 0, 0]} />)}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        {/* Project Health */}
        <ChartCard title="Project Health" sub={`${projects.length} projects across all statuses`}>
          <div style={{ display: 'flex', gap: 14, alignItems: 'center', marginTop: 4 }}>
            <Donut data={healthData.length ? healthData : [{ name: 'None', value: 1, color: '#e5e7eb' }]} center={String(projects.length)} />
            <DonutLegend data={healthData} total={projects.length} />
          </div>
        </ChartCard>
      </div>

      {/* 3-column data row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 14, marginBottom: 28 }}>

        {/* Financial Overview */}
        <ChartCard title="Financial Overview" sub="All amounts in Php">
          <div style={{ display: 'grid', gap: 16, marginTop: 8 }}>
            <FinRow label="Total Revenue"  value={money(stats.revenue)}   t={trends.revenue}  color="#1db954" />
            <FinRow label="Total Expenses" value={money(stats.expenses)}  t={trends.expenses} color="#ef4444" />
            <FinRow label="Net Profit"     value={money(stats.profit)}    t={trends.profit}   color="#1db954" />
          </div>
        </ChartCard>

        {/* Recent Activity */}
        <ChartCard title="Recent Activity" sub="">
          {activity.length === 0
            ? <EmptyBox msg="No recent activity" sub="Activity from across your workspace will appear here." />
            : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 4 }}>
                {activity.map(item => <ActivityRow key={item.id} item={item} />)}
                <Link href="/dashboard" style={{ fontSize: 12, color: '#1db954', fontWeight: 500, textDecoration: 'none', marginTop: 2 }}>View all activity →</Link>
              </div>
            )}
        </ChartCard>

        {/* Upcoming Tasks */}
        <ChartCard title="Upcoming Tasks" sub="" action={<Link href="/tasks" style={{ fontSize: 12, color: '#1db954', fontWeight: 500, textDecoration: 'none' }}>View all</Link>}>
          {upcoming.length === 0
            ? <EmptyBox msg="No tasks scheduled" sub="Tasks and to-dos assigned to you will appear here." />
            : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 4 }}>
                {upcoming.map(t => (
                  <div key={t.id} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                    <div style={{ width: 15, height: 15, borderRadius: 4, border: '1.5px solid #d1d5db', flexShrink: 0, marginTop: 2 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 500, color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.title || 'Untitled'}</div>
                      <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 1 }}>{t.projectName || 'No project'}</div>
                    </div>
                    <div style={{ flexShrink: 0, textAlign: 'right' }}>
                      {t.dueDate && <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 2 }}>{new Date(`${t.dueDate}T00:00:00`).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })}</div>}
                      {t.urge && (
                        <span style={{ fontSize: 10, fontWeight: 600, padding: '1px 6px', borderRadius: 4, background: t.urge === 'High' ? '#fef2f2' : t.urge === 'Medium' ? '#fffbeb' : '#f0fdf4', color: t.urge === 'High' ? '#ef4444' : t.urge === 'Medium' ? '#f59e0b' : '#22c55e' }}>
                          {t.urge}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
        </ChartCard>
      </div>

      {/* Business Modules */}
      <div>
        <div style={{ marginBottom: 14 }}>
          <h2 style={{ margin: 0, fontSize: 17, fontWeight: 600, color: '#111827', fontFamily: display }}>Business modules</h2>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: '#9ca3af' }}>Quick access to the upgraded system areas.</p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
          {modules.map(m => <ModuleCard key={m.title} m={m} />)}
        </div>
      </div>
    </main>
  )
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function ChartCard({ title, sub, children, action }: { title: string; sub: string; children: ReactNode; action?: ReactNode }) {
  return (
    <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #e5e7eb', padding: '18px 20px 20px', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: sub ? 2 : 0 }}>
        <h3 style={{ margin: 0, fontSize: 14, fontWeight: 600, color: '#111827' }}>{title}</h3>
        {action}
      </div>
      {sub && <p style={{ margin: '3px 0 0', fontSize: 12, color: '#9ca3af' }}>{sub}</p>}
      {children}
    </div>
  )
}

function KpiCard({ label, value, t, neg = false }: { label: string; value: string; t: { text: string; up: boolean; zero: boolean }; neg?: boolean }) {
  const positive = neg ? !t.up : t.up
  return (
    <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
      <div style={{ fontSize: 11, color: '#9ca3af', fontWeight: 500, marginBottom: 8, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</div>
      <div style={{ fontSize: 20, fontWeight: 700, color: '#111827', fontFamily: display, letterSpacing: '-0.3px', marginBottom: 8 }}>{value}</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 11, color: t.zero ? '#9ca3af' : positive ? '#1db954' : '#ef4444', fontWeight: 500 }}>
        {!t.zero && (t.up ? <TrendingUp size={11} /> : <TrendingDown size={11} />)}
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.text}</span>
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

function FinRow({ label, value, t, color }: { label: string; value: string; t: { text: string; up: boolean; zero: boolean }; color: string }) {
  return (
    <div>
      <div style={{ fontSize: 12, color: '#9ca3af', marginBottom: 3 }}>{label}</div>
      <div style={{ fontSize: 18, fontWeight: 700, color: '#111827', fontFamily: display, letterSpacing: '-0.2px' }}>{value}</div>
      <div style={{ fontSize: 11, color: t.zero ? '#9ca3af' : t.up ? color : '#ef4444', marginTop: 2 }}>{t.text}</div>
    </div>
  )
}

const activityIcons = {
  project:     { icon: FolderKanban,   bg: '#faf5ff', color: '#8b5cf6' },
  task:        { icon: ClipboardList,  bg: '#eff6ff', color: '#3b82f6' },
  client:      { icon: UsersRound,     bg: '#ecfdf5', color: '#10b981' },
  payment:     { icon: HandCoins,      bg: '#f0fdf4', color: '#1db954' },
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
    <div style={{ textAlign: 'center', padding: '28px 8px' }}>
      <div style={{ fontSize: 13, fontWeight: 500, color: '#6b7280', marginBottom: 4 }}>{msg}</div>
      <div style={{ fontSize: 12, color: '#9ca3af' }}>{sub}</div>
    </div>
  )
}

function ModuleCard({ m }: { m: { title: string; href: string; icon: ComponentType<{ size?: number }>; color: string; stat: number; label: string } }) {
  const Icon = m.icon
  return (
    <Link href={m.href} style={{ textDecoration: 'none' }}>
      <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: '16px 18px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)', cursor: 'pointer' }}>
        <div style={{ width: 36, height: 36, borderRadius: 9, background: `${m.color}18`, color: m.color, display: 'grid', placeItems: 'center', marginBottom: 12 }}>
          <Icon size={17} />
        </div>
        <div style={{ fontSize: 13, fontWeight: 600, color: '#111827', marginBottom: 8 }}>{m.title}</div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 5 }}>
          <span style={{ fontSize: 22, fontWeight: 700, color: m.color, fontFamily: display }}>{m.stat}</span>
          <span style={{ fontSize: 12, color: '#9ca3af' }}>{m.label}</span>
        </div>
      </div>
    </Link>
  )
}
