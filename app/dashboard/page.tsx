'use client'

import Link from 'next/link'
import type { ComponentType, ReactNode } from 'react'
import { useEffect, useMemo, useState } from 'react'
import {
  BadgeDollarSign,
  Boxes,
  Building2,
  CalendarDays,
  ClipboardList,
  FolderKanban,
  HandCoins,
  PackageSearch,
  ShoppingCart,
  UsersRound,
} from 'lucide-react'
import {
  Bar,
  BarChart,
  Cell,
  CartesianGrid,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

const font = "'DM Sans', sans-serif"

interface ProjectRecord {
  id: number
  name?: string
  title?: string
  projectCost?: number
  paidAmount?: number
  unpaidAmount?: number
  materialCost?: number
  laborCost?: number
  overheadProfit?: number
  generalExpense?: number
  status?: string
  startDate?: string
  endDate?: string
  createdAt?: string
}

interface OpportunityRecord {
  id: number
  quotation?: number
  approvedBudget?: number
  estimatedCost?: number
  status?: string
  startDate?: string
  endDate?: string
  createdAt?: string
}

interface BasicRecord {
  id: number
  amount?: number
  total?: number
  status?: string
  date?: string
  createdAt?: string
  dueDate?: string
}

interface TaskRecord {
  id: number
  status?: string
  dueDate?: string
  createdAt?: string
}

type ModuleCard = {
  title: string
  href: string
  icon: ComponentType<{ size?: number }>
  color: string
  stat: number
  label: string
}

function loadStored<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback
  try {
    const stored = window.localStorage.getItem(key)
    return stored ? JSON.parse(stored) as T : fallback
  } catch {
    return fallback
  }
}

function money(value: number) {
  return `Php ${value.toLocaleString('en-PH', { maximumFractionDigits: 0 })}`
}

function percent(value: number, total: number) {
  if (!total) return 0
  return Math.max(0, Math.min(100, Math.round((value / total) * 100)))
}

function normalizeStatus(status?: string) {
  return (status || '').trim().toLowerCase()
}

function parseDate(value?: string) {
  if (!value) return null
  const date = value.includes('T') ? new Date(value) : new Date(`${value}T00:00:00`)
  return Number.isNaN(date.getTime()) ? null : date
}

function dateFromRecord(record: { date?: string; startDate?: string; endDate?: string; createdAt?: string; dueDate?: string }) {
  return parseDate(record.date) || parseDate(record.startDate) || parseDate(record.createdAt) || parseDate(record.dueDate) || parseDate(record.endDate)
}

function monthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

function monthLabel(key: string) {
  const [year, month] = key.split('-').map(Number)
  return new Date(year, month - 1, 1).toLocaleDateString('en-PH', { month: 'short', year: '2-digit' })
}

function addMonths(date: Date, amount: number) {
  return new Date(date.getFullYear(), date.getMonth() + amount, 1)
}

function formatRangeDate(date: Date) {
  return date.toLocaleDateString('en-PH', { month: 'short', day: '2-digit', year: '2-digit' })
}

function recordAmount(record: { amount?: number; total?: number }) {
  return Number(record.amount || record.total || 0)
}

function opportunityValue(opportunity: OpportunityRecord) {
  return Number(opportunity.quotation || opportunity.approvedBudget || opportunity.estimatedCost || 0)
}

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState('Projects')
  const [projects, setProjects] = useState<ProjectRecord[]>([])
  const [opportunities, setOpportunities] = useState<OpportunityRecord[]>([])
  const [clients, setClients] = useState<BasicRecord[]>([])
  const [suppliers, setSuppliers] = useState<BasicRecord[]>([])
  const [warehouses, setWarehouses] = useState<BasicRecord[]>([])
  const [tasks, setTasks] = useState<TaskRecord[]>([])
  const [bills, setBills] = useState<BasicRecord[]>([])
  const [budgets, setBudgets] = useState<BasicRecord[]>([])

  // Load from localStorage only after mount to avoid SSR/hydration mismatch
  useEffect(() => {
    setProjects(loadStored<ProjectRecord[]>('flowsys-projects', []))
    setOpportunities(loadStored<OpportunityRecord[]>('flowsys-opportunities', []))
    setClients(loadStored<BasicRecord[]>('flowsys-clients', []))
    setSuppliers(loadStored<BasicRecord[]>('flowsys-suppliers', []))
    setWarehouses(loadStored<BasicRecord[]>('flowsys-warehouses', []))
    setTasks(loadStored<TaskRecord[]>('flowsys-assigned-tasks', []))
    setBills(loadStored<BasicRecord[]>('flowsys-bills', []))
    setBudgets(loadStored<BasicRecord[]>('flowsys-budgets', []))
  }, [])

  const analytics = useMemo(() => {
    const projectValue = projects.reduce((sum, project) => sum + (project.projectCost || 0), 0)
    const paid = projects.reduce((sum, project) => sum + (project.paidAmount || 0), 0)
    const unpaid = projects.reduce((sum, project) => sum + (project.unpaidAmount || 0), 0)
    const material = projects.reduce((sum, project) => sum + (project.materialCost || 0), 0)
    const labor = projects.reduce((sum, project) => sum + (project.laborCost || 0), 0)
    const overhead = projects.reduce((sum, project) => sum + (project.overheadProfit || 0), 0)
    const general = projects.reduce((sum, project) => sum + (project.generalExpense || 0), 0)
    const expenses = material + labor + overhead + general
    const billTotal = bills.reduce((sum, bill) => sum + recordAmount(bill), 0)
    const budgetTotal = budgets.reduce((sum, budget) => sum + recordAmount(budget), 0)
    const pipeline = opportunities.reduce((sum, opportunity) => sum + opportunityValue(opportunity), 0)
    const profit = Math.max(projectValue - expenses, 0)
    return { projectValue, paid, unpaid, material, labor, overhead, general, expenses, billTotal, budgetTotal, pipeline, profit }
  }, [bills, budgets, opportunities, projects])

  const timeline = useMemo(() => {
    const datedRecords = [
      ...projects.map(project => ({ date: dateFromRecord(project), value: project.projectCost || 0 })),
      ...opportunities.map(opportunity => ({ date: dateFromRecord(opportunity), value: opportunityValue(opportunity) })),
      ...bills.map(bill => ({ date: dateFromRecord(bill), value: recordAmount(bill) })),
      ...budgets.map(budget => ({ date: dateFromRecord(budget), value: recordAmount(budget) })),
      ...tasks.map(task => ({ date: dateFromRecord(task), value: 1 })),
    ].filter(record => record.date)

    const today = new Date()
    const dates = datedRecords.map(record => record.date as Date)
    const minDate = dates.length ? new Date(Math.min(...dates.map(date => date.getTime()))) : today
    const maxDate = dates.length ? new Date(Math.max(...dates.map(date => date.getTime()))) : today
    const start = addMonths(new Date(minDate.getFullYear(), minDate.getMonth(), 1), -1)
    const end = addMonths(new Date(maxDate.getFullYear(), maxDate.getMonth(), 1), 1)
    const months: string[] = []

    for (let cursor = start; cursor <= end; cursor = addMonths(cursor, 1)) {
      months.push(monthKey(cursor))
    }

    const buckets = new Map(months.map(key => [key, {
      key,
      month: monthLabel(key),
      project: 0,
      expenses: 0,
      profit: 0,
      pipeline: 0,
      bills: 0,
      budgets: 0,
      tasks: 0,
    }]))

    projects.forEach(project => {
      const date = dateFromRecord(project)
      if (!date) return
      const bucket = buckets.get(monthKey(date))
      if (!bucket) return
      const cost = project.projectCost || 0
      const expense = (project.materialCost || 0) + (project.laborCost || 0) + (project.overheadProfit || 0) + (project.generalExpense || 0)
      bucket.project += cost
      bucket.expenses += expense
      bucket.profit += Math.max(cost - expense, 0)
    })

    opportunities.forEach(opportunity => {
      const date = dateFromRecord(opportunity)
      const bucket = date ? buckets.get(monthKey(date)) : null
      if (bucket) bucket.pipeline += opportunityValue(opportunity)
    })

    bills.forEach(bill => {
      const date = dateFromRecord(bill)
      const bucket = date ? buckets.get(monthKey(date)) : null
      if (!bucket) return
      const amount = recordAmount(bill)
      bucket.bills += amount
      bucket.expenses += amount
      bucket.profit = Math.max(bucket.project - bucket.expenses, 0)
    })

    budgets.forEach(budget => {
      const date = dateFromRecord(budget)
      const bucket = date ? buckets.get(monthKey(date)) : null
      if (bucket) bucket.budgets += recordAmount(budget)
    })

    tasks.forEach(task => {
      const date = dateFromRecord(task)
      const bucket = date ? buckets.get(monthKey(date)) : null
      if (bucket) bucket.tasks += 1
    })

    return {
      chartData: Array.from(buckets.values()),
      label: dates.length ? `${formatRangeDate(minDate)} - ${formatRangeDate(maxDate)}` : 'No records yet',
    }
  }, [bills, budgets, opportunities, projects, tasks])

  const projectStatusData = [
    { name: 'Completed', value: projects.filter(project => normalizeStatus(project.status) === 'completed').length, color: '#1db954' },
    { name: 'Ongoing', value: projects.filter(project => normalizeStatus(project.status) === 'ongoing').length, color: '#1ed760' },
    { name: 'Pending', value: projects.filter(project => normalizeStatus(project.status) === 'pending').length, color: '#535353' },
    { name: 'With issue', value: projects.filter(project => normalizeStatus(project.status).includes('issue')).length, color: '#191414' },
  ].filter(item => item.value > 0)

  const budgetData = [
    { name: 'Material Cost', value: analytics.material, color: '#1db954' },
    { name: 'Labor Cost', value: analytics.labor, color: '#1ed760' },
    { name: 'Overhead', value: analytics.overhead, color: '#535353' },
    { name: 'General Expense', value: analytics.general, color: '#191414' },
  ].filter(item => item.value > 0)

  const moduleCards: ModuleCard[] = [
    { title: 'Client Database', href: '/client-database', icon: UsersRound, color: '#1db954', stat: clients.length, label: 'client records' },
    { title: 'Sales', href: '/sales', icon: BadgeDollarSign, color: '#1ed760', stat: opportunities.length, label: 'opportunities' },
    { title: 'Project Management', href: '/project-management', icon: FolderKanban, color: '#1db954', stat: projects.length, label: 'projects' },
    { title: 'Financial', href: '/financial', icon: HandCoins, color: '#535353', stat: bills.length + budgets.length, label: 'records' },
    { title: 'HR', href: '/hr', icon: Building2, color: '#535353', stat: 0, label: 'team members' },
    { title: 'Procurement', href: '/procurement', icon: ShoppingCart, color: '#1db954', stat: 0, label: 'workflows' },
    { title: 'Supplier Database', href: '/supplier-database', icon: PackageSearch, color: '#535353', stat: suppliers.length, label: 'suppliers' },
    { title: 'Warehouse / Inventory', href: '/warehouse-inventory', icon: Boxes, color: '#1db954', stat: warehouses.length, label: 'warehouses' },
    { title: 'To Do', href: '/to-do', icon: ClipboardList, color: '#191414', stat: tasks.filter(task => normalizeStatus(task.status) !== 'completed').length, label: 'open tasks' },
  ]

  const summaries: Record<string, { title: string; body: string }> = {
    Projects: {
      title: 'Project performance',
      body: `${projects.length} projects tracked with ${money(analytics.paid)} paid and ${money(analytics.unpaid)} unpaid.`,
    },
    Sales: {
      title: 'Sales pipeline',
      body: `${opportunities.length} opportunities with ${money(analytics.pipeline)} in quotation or approved budget value.`,
    },
    Financials: {
      title: 'Financial control',
      body: `${bills.length + budgets.length} finance records, ${money(analytics.billTotal)} in bills, and ${money(analytics.budgetTotal)} in budgets.`,
    },
    Operations: {
      title: 'Operational coverage',
      body: `${clients.length} clients, ${suppliers.length} suppliers, ${warehouses.length} warehouses, and ${tasks.length} internal tasks connected.`,
    },
  }

  const activeSummary = summaries[activeTab] || summaries.Projects
  const chartSeries = activeTab === 'Sales'
    ? [
        { key: 'pipeline', name: 'Pipeline', color: '#1db954' },
        { key: 'project', name: 'Won Projects', color: '#1ed760' },
      ]
    : activeTab === 'Financials'
      ? [
          { key: 'budgets', name: 'Budgets', color: '#1db954' },
          { key: 'bills', name: 'Bills', color: '#535353' },
          { key: 'expenses', name: 'Total Expenses', color: '#1ed760' },
        ]
      : activeTab === 'Operations'
        ? [
            { key: 'project', name: 'Project Value', color: '#1db954' },
            { key: 'tasks', name: 'Tasks', color: '#535353' },
          ]
        : [
            { key: 'project', name: 'Project Cost', color: '#1db954' },
            { key: 'expenses', name: 'Expenses', color: '#535353' },
            { key: 'profit', name: 'Profit', color: '#1ed760' },
          ]

  return (
    <main style={{ fontFamily: font }}>
      <section style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '18px', marginBottom: '28px', flexWrap: 'wrap' }}>
        <div>
          <p style={{ margin: '0 0 8px', color: '#6c63ff', fontSize: '13px', fontWeight: 600 }}>WiseFlow dashboard</p>
          <h1 style={{ margin: 0, color: '#111827', fontSize: '31px', fontWeight: 600, letterSpacing: '-0.2px' }}>
            Hi, <span style={{ color: '#6c63ff' }}>James</span>
          </h1>
          <p style={{ margin: '9px 0 0', color: '#64748b', fontSize: '14px', fontWeight: 500 }}>
            {activeSummary.body}
          </p>
        </div>
        <button style={{ border: '1px solid #dfe3eb', background: '#fff', borderRadius: '999px', padding: '11px 17px', color: '#334155', fontSize: '13px', fontWeight: 600, cursor: 'pointer', boxShadow: '0 8px 18px rgba(15, 23, 42, 0.06)', display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
          <CalendarDays size={15} />
          {timeline.label}
        </button>
      </section>

      <section style={{ display: 'flex', gap: '8px', borderBottom: '1px solid #dfe3eb', marginBottom: '24px', overflowX: 'auto' }}>
        {['Projects', 'Sales', 'Financials', 'Operations'].map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)} style={{ border: 'none', borderBottom: activeTab === tab ? '3px solid #6c63ff' : '3px solid transparent', background: 'transparent', color: activeTab === tab ? '#6c63ff' : '#64748b', padding: '12px 22px', fontSize: '14px', fontWeight: 600, cursor: 'pointer' }}>
            {tab}
          </button>
        ))}
      </section>

      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '18px', marginBottom: '22px' }}>
        <AnalyticsCard label="Project Cost" value={money(analytics.projectValue)} forecast={money(analytics.projectValue + analytics.pipeline)} color="#1db954" bg="#f5fff8" percent={percent(analytics.projectValue, analytics.projectValue + analytics.pipeline)} />
        <AnalyticsCard label={activeTab === 'Sales' ? 'Pipeline' : 'Expenses'} value={money(activeTab === 'Sales' ? analytics.pipeline : analytics.expenses)} forecast={money(Math.max(analytics.projectValue, analytics.expenses, analytics.pipeline))} color="#535353" bg="#f5f5f5" percent={percent(activeTab === 'Sales' ? analytics.pipeline : analytics.expenses, Math.max(analytics.projectValue, analytics.expenses, analytics.pipeline))} />
        <AnalyticsCard label="Profit Margin" value={money(analytics.profit)} forecast={money(analytics.projectValue)} color="#1ed760" bg="#f3fff7" percent={percent(analytics.profit, analytics.projectValue)} />
      </section>

      <section style={{ background: '#fff', border: '1px solid #dfe3eb', borderRadius: '16px', padding: '18px 22px', marginBottom: '22px', display: 'flex', justifyContent: 'space-between', gap: '18px', flexWrap: 'wrap', boxShadow: '0 16px 38px rgba(15, 23, 42, 0.045)' }}>
        <div>
          <h2 style={{ margin: 0, color: '#111827', fontSize: '17px', fontWeight: 600 }}>{activeSummary.title}</h2>
          <p style={{ margin: '6px 0 0', color: '#64748b', fontSize: '13px', fontWeight: 500 }}>{activeSummary.body}</p>
        </div>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <MiniMetric label="Paid" value={money(analytics.paid)} />
          <MiniMetric label="Unpaid" value={money(analytics.unpaid)} />
          <MiniMetric label="Open Tasks" value={String(moduleCards.find(card => card.title === 'To Do')?.stat || 0)} />
        </div>
      </section>

      <section style={{ display: 'grid', gridTemplateColumns: 'minmax(280px, 0.8fr) minmax(420px, 1.4fr)', gap: '18px', marginBottom: '22px' }}>
        <Panel title="Total Projects" subtitle={`${projects.length} projects across all statuses`}>
          <Donut data={projectStatusData.length ? projectStatusData : [{ name: 'No projects', value: 1, color: '#e5e7eb' }]} center={String(projects.length)} />
          <Legend data={projectStatusData} />
        </Panel>
        <Panel title={activeTab === 'Sales' ? 'Pipeline and Delivery' : 'Yearly Sales'} subtitle="Balance statistics over time">
          <div style={{ height: '240px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={timeline.chartData} barGap={4}>
                <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="#eef2f7" />
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} tickFormatter={value => `${Math.round(Number(value) / 1000)}k`} />
                <Tooltip formatter={value => money(Number(value || 0))} />
                {chartSeries.map(series => (
                  <Bar key={series.key} dataKey={series.key} name={series.name} fill={series.color} radius={[6, 6, 0, 0]} />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>
      </section>

      <Panel title="Budget Allocation Overview" subtitle={`${budgetData.length} allocations - Total ${money(analytics.expenses)}`}>
        <div style={{ display: 'grid', gridTemplateColumns: '190px minmax(0, 1fr)', gap: '28px', alignItems: 'center' }}>
          <Donut data={budgetData.length ? budgetData : [{ name: 'No budget', value: 1, color: '#e5e7eb' }]} center={money(analytics.expenses)} small />
          <div style={{ display: 'grid', gap: '15px' }}>
            {(budgetData.length ? budgetData : [{ name: 'No allocation yet', value: 0, color: '#cbd5e1' }]).map(item => (
              <div key={item.name}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', color: '#334155', fontSize: '13px', fontWeight: 600, marginBottom: '7px' }}>
                  <span>{item.name}</span>
                  <span>{money(item.value)}</span>
                </div>
                <div style={{ height: '7px', borderRadius: '999px', background: '#eef2f7', overflow: 'hidden' }}>
                  <div style={{ width: `${percent(item.value, analytics.expenses)}%`, height: '100%', background: item.color }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </Panel>

      <section style={{ marginTop: '22px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'end', gap: '16px', marginBottom: '14px' }}>
          <div>
            <h2 style={{ margin: 0, color: '#111827', fontSize: '18px', fontWeight: 600 }}>Business modules</h2>
            <p style={{ margin: '5px 0 0', color: '#64748b', fontSize: '13px', fontWeight: 500 }}>Quick access to the upgraded system areas.</p>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(245px, 1fr))', gap: '16px' }}>
          {moduleCards.map(card => (
            <ModuleShortcut key={card.title} card={card} />
          ))}
        </div>
      </section>
    </main>
  )
}

function AnalyticsCard({ label, value, forecast, color, bg, percent: pct }: { label: string; value: string; forecast: string; color: string; bg: string; percent: number }) {
  return (
    <article style={{ borderRadius: '16px', padding: '24px', background: bg, border: `1px solid ${color}30`, minHeight: '190px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#334155', fontSize: '13px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.4px' }}>
        {label}
        <span style={{ background: '#fff', color, borderRadius: '999px', padding: '3px 9px', fontSize: '11px', fontWeight: 600 }}>{pct}%</span>
      </div>
      <div style={{ color, fontSize: '28px', fontWeight: 600, marginTop: '16px' }}>{value}</div>
      <div style={{ color: '#475569', fontSize: '13px', fontWeight: 500, marginTop: '6px' }}>Forecast <strong style={{ color: '#111827', fontWeight: 600 }}>{forecast}</strong></div>
      <div style={{ height: '48px', marginTop: '16px', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', left: 4, right: 4, bottom: 10, height: 3, background: color, borderRadius: 999, opacity: 0.88 }} />
        <div style={{ position: 'absolute', left: '42%', bottom: 10, width: 72, height: 42, border: `3px solid ${color}`, borderBottom: 0, borderRadius: '72px 72px 0 0', transform: 'translateX(-50%)', opacity: 0.88 }} />
      </div>
    </article>
  )
}

function MiniMetric({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ minWidth: '126px', border: '1px solid #dfe3eb', borderRadius: '12px', padding: '11px 14px', background: '#f8fafc' }}>
      <div style={{ color: '#64748b', fontSize: '12px', fontWeight: 600 }}>{label}</div>
      <div style={{ color: '#111827', fontSize: '16px', fontWeight: 600, marginTop: '4px' }}>{value}</div>
    </div>
  )
}

function Panel({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  return (
    <section style={{ background: '#fff', border: '1px solid #dfe3eb', borderRadius: '16px', padding: '24px', boxShadow: '0 16px 38px rgba(15, 23, 42, 0.045)' }}>
      <div style={{ marginBottom: '18px' }}>
        <h2 style={{ margin: 0, color: '#111827', fontSize: '17px', fontWeight: 600 }}>{title}</h2>
        <p style={{ margin: '5px 0 0', color: '#64748b', fontSize: '13px', fontWeight: 500 }}>{subtitle}</p>
      </div>
      {children}
    </section>
  )
}

function Donut({ data, center, small = false }: { data: Array<{ name: string; value: number; color: string }>; center: string; small?: boolean }) {
  return (
    <div style={{ position: 'relative', width: small ? '160px' : '180px', height: small ? '160px' : '180px', margin: '0 auto' }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={data} innerRadius={small ? 48 : 60} outerRadius={small ? 74 : 84} dataKey="value" strokeWidth={0}>
            {data.map(item => <Cell key={item.name} fill={item.color} />)}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', textAlign: 'center' }}>
        <div>
          <div style={{ color: '#64748b', fontSize: '10px', fontWeight: 600, textTransform: 'uppercase' }}>Total</div>
          <div style={{ color: '#111827', fontSize: small ? '14px' : '28px', fontWeight: 600 }}>{center}</div>
        </div>
      </div>
    </div>
  )
}

function Legend({ data }: { data: Array<{ name: string; value: number; color: string }> }) {
  if (!data.length) return <div style={{ color: '#94a3b8', fontSize: '13px', textAlign: 'center' }}>No project status data yet.</div>
  return (
    <div style={{ display: 'grid', gap: '10px', marginTop: '18px' }}>
      {data.map(item => (
        <div key={item.name} style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', color: '#334155', fontSize: '13px', fontWeight: 500 }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}><span style={{ width: '9px', height: '9px', borderRadius: '50%', background: item.color }} />{item.name}</span>
          <strong style={{ fontWeight: 600 }}>{item.value}</strong>
        </div>
      ))}
    </div>
  )
}

function ModuleShortcut({ card }: { card: ModuleCard }) {
  const Icon = card.icon
  return (
    <Link href={card.href} style={{ textDecoration: 'none' }}>
      <article style={{ minHeight: '154px', background: '#fff', border: '1px solid #dfe3eb', borderRadius: '14px', padding: '18px', boxShadow: '0 16px 38px rgba(15, 23, 42, 0.055)', transition: 'transform 160ms ease, box-shadow 160ms ease' }}>
        <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: `${card.color}18`, color: card.color, display: 'grid', placeItems: 'center', marginBottom: '16px' }}>
          <Icon size={20} />
        </div>
        <h2 style={{ margin: 0, color: '#111827', fontSize: '17px', fontWeight: 600 }}>{card.title}</h2>
        <div style={{ marginTop: '14px', display: 'flex', alignItems: 'baseline', gap: '8px' }}>
          <strong style={{ color: card.color, fontSize: '26px', fontWeight: 600 }}>{card.stat}</strong>
          <span style={{ color: '#64748b', fontSize: '13px', fontWeight: 500 }}>{card.label}</span>
        </div>
      </article>
    </Link>
  )
}
