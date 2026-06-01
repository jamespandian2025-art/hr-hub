'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import {
  ArrowUpDown,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Filter,
  MoreVertical,
  Paperclip,
  Plus,
  Search,
  UserRound,
} from 'lucide-react'
import { loadWorkflowProjects, loadWorkflowTasks } from '../workflow-ui'

const accountStorageKey = 'flowsys-account'

type TaskStatus = 'Open' | 'In Progress' | 'Completed'

type AssignedTask = {
  id: number | string
  projectId: number | string
  title: string
  description?: string
  status: TaskStatus
  priority?: 'Urgent' | 'High' | 'Normal' | 'Low'
  assignee?: string
  assignees?: string[]
  dueDate?: string
  draft?: boolean
}

type ProjectRecord = {
  id: number | string
  name: string
  workflowColor?: string
}

type AccountRecord = {
  fullName?: string
  name?: string
}

type TabId = 'all' | 'open' | 'overdue' | 'today' | 'upcoming'

function loadStored<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback
  try {
    const stored = window.localStorage.getItem(key)
    return stored ? JSON.parse(stored) as T : fallback
  } catch {
    return fallback
  }
}

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map(part => part[0]).join('').toUpperCase() || 'WF'
}

function formatDue(date?: string) {
  if (!date) return 'No due date'
  const parsed = new Date(`${date}T00:00:00`)
  if (Number.isNaN(parsed.getTime())) return 'No due date'
  return parsed.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function dueState(date?: string) {
  if (!date) return 'unscheduled' as const
  const today = new Date()
  const todayTime = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime()
  const dueTime = new Date(`${date}T00:00:00`).getTime()
  if (Number.isNaN(dueTime)) return 'unscheduled' as const
  if (dueTime < todayTime) return 'overdue' as const
  if (dueTime === todayTime) return 'today' as const
  return 'upcoming' as const
}

function daysUntil(date?: string) {
  if (!date) return 0
  const today = new Date()
  const todayTime = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime()
  const dueTime = new Date(`${date}T00:00:00`).getTime()
  return Math.max(0, Math.round((dueTime - todayTime) / 86400000))
}

function daysOverdue(date?: string) {
  if (!date) return 0
  const today = new Date()
  const todayTime = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime()
  const dueTime = new Date(`${date}T00:00:00`).getTime()
  return Math.max(0, Math.round((todayTime - dueTime) / 86400000))
}

function priorityClass(priority?: string) {
  if (priority === 'Urgent') return 'urgent'
  if (priority === 'High') return 'high'
  if (priority === 'Low') return 'low'
  return 'normal'
}

function rowColor(seed: number | string) {
  const palette = ['#22c55e', '#3b82f6', '#ef4444', '#8b5cf6', '#f59e0b', '#06b6d4']
  const idx = String(seed).split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0)
  return palette[idx % palette.length]
}

function statusInfo(task: AssignedTask, state: ReturnType<typeof dueState>) {
  if (task.status === 'In Progress') return { label: 'In Progress', kind: 'in-progress' }
  if (state === 'overdue' && task.status !== 'Completed') return { label: 'Overdue', kind: 'overdue' }
  if (task.status === 'Completed') return { label: 'Completed', kind: 'completed' }
  return { label: 'Open', kind: 'open' }
}

function dueSubLabel(state: ReturnType<typeof dueState>, date?: string) {
  if (state === 'overdue') {
    const days = daysOverdue(date)
    return days > 1 ? `${days} days overdue` : 'Overdue'
  }
  if (state === 'today') return 'Due Today'
  if (state === 'upcoming') {
    const days = daysUntil(date)
    return days === 1 ? '1 day left' : `${days} days left`
  }
  return 'No schedule'
}

export default function WorkflowMyToDosPage() {
  const [tasks] = useState(() => loadWorkflowTasks() as AssignedTask[])
  const [projects] = useState(() => loadWorkflowProjects() as ProjectRecord[])
  const [account] = useState(() => loadStored<AccountRecord>(accountStorageKey, {}))
  const [search, setSearch] = useState('')
  const [activeTab, setActiveTab] = useState<TabId>('all')
  const currentUser = account.fullName || account.name || 'James Pandian'
  const projectById = useMemo(() => new Map(projects.map(p => [p.id, p])), [projects])

  const myTasks = tasks.filter(task => [task.assignee, ...(task.assignees || [])].filter(Boolean).includes(currentUser))
  const baseTasks = useMemo(
    () => (myTasks.length ? myTasks : tasks).filter(task => task.status !== 'Completed' && !task.draft),
    [myTasks, tasks],
  )

  const openCount = baseTasks.filter(task => task.status === 'Open').length
  const todayCount = baseTasks.filter(task => dueState(task.dueDate) === 'today').length
  const overdueCount = baseTasks.filter(task => dueState(task.dueDate) === 'overdue').length
  const upcomingCount = baseTasks.filter(task => dueState(task.dueDate) === 'upcoming').length

  const tabbedTasks = useMemo(() => {
    if (activeTab === 'all') return baseTasks
    if (activeTab === 'open') return baseTasks.filter(t => t.status === 'Open')
    if (activeTab === 'overdue') return baseTasks.filter(t => dueState(t.dueDate) === 'overdue')
    if (activeTab === 'today') return baseTasks.filter(t => dueState(t.dueDate) === 'today')
    return baseTasks.filter(t => dueState(t.dueDate) === 'upcoming')
  }, [baseTasks, activeTab])

  const filteredTasks = useMemo(() => {
    const needle = search.trim().toLowerCase()
    if (!needle) return tabbedTasks
    return tabbedTasks.filter(task => {
      const project = projectById.get(task.projectId)
      return [task.title, task.description || '', task.priority || '', project?.name || ''].some(value => value.toLowerCase().includes(needle))
    })
  }, [tabbedTasks, projectById, search])

  const tabs: { id: TabId; label: string; count: number }[] = [
    { id: 'all', label: 'All To-dos', count: baseTasks.length },
    { id: 'open', label: 'Open', count: openCount },
    { id: 'overdue', label: 'Overdue', count: overdueCount },
    { id: 'today', label: 'Due Today', count: todayCount },
    { id: 'upcoming', label: 'Upcoming', count: upcomingCount },
  ]

  return (
    <main className="wf-todos-page">
      <style>{todosCss}</style>

      <section className="wf-todos-header">
        <div className="wf-todos-title">
          <span><CheckCircle2 size={24} /></span>
          <div>
            <div className="wf-todos-breadcrumb">Dashboard / Workflows / <strong>My To-dos</strong></div>
            <h1>My To-dos</h1>
            <p>Open tasks that need your attention inside the workflow workspace.</p>
          </div>
        </div>
        <div className="wf-todos-actions">
          <label className="wf-todos-search">
            <Search size={16} />
            <input value={search} onChange={event => setSearch(event.target.value)} placeholder="Search to-dos..." />
          </label>
          <button type="button" className="wf-todos-toolbtn"><Filter size={15} /> Filters</button>
          <button type="button" className="wf-todos-toolbtn"><ArrowUpDown size={15} /> Sort</button>
          <Link href="/workflows/my-jobs" className="wf-todos-new"><Plus size={16} /> New To-do</Link>
        </div>
      </section>

      <section className="wf-todos-metrics">
        <Metric icon={<UserRound size={20} />} label="Open To-dos" detail="Tasks currently open" value={openCount} tone="#0f9f5f" chart="line" />
        <Metric icon={<CalendarDays size={20} />} label="Due Today" detail="Due within today" value={todayCount} tone="#f59e0b" chart="bar" />
        <Metric icon={<Clock3 size={20} />} label="Overdue" detail="Past deadline tasks" value={overdueCount} tone="#ef4444" chart="line" />
        <Metric icon={<CheckCircle2 size={20} />} label="Upcoming" detail="Scheduled for later" value={upcomingCount} tone="#2563eb" chart="bar" />
      </section>

      <nav className="wf-todos-tabs">
        {tabs.map(tab => (
          <button
            key={tab.id}
            type="button"
            className={activeTab === tab.id ? 'active' : ''}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label} <em>{tab.count}</em>
          </button>
        ))}
      </nav>

      <section className="wf-todos-list">
        <div className="wf-todos-row head">
          <span className="wf-todos-check" />
          <span>To-do</span>
          <span>Workflow</span>
          <span>Priority</span>
          <span>Due Date</span>
          <span>Status</span>
          <span>Action</span>
        </div>
        {filteredTasks.length ? filteredTasks.map(task => {
          const project = projectById.get(task.projectId)
          const state = dueState(task.dueDate)
          const dotColor = project?.workflowColor || rowColor(task.id)
          const status = statusInfo(task, state)
          return (
            <div className="wf-todos-row" key={task.id}>
              <span className="wf-todos-check"><span className="wf-todos-checkbox" /></span>
              <span className="wf-todos-main">
                <span className="wf-todos-dot" style={{ background: dotColor }} />
                <span className="wf-todos-main-text">
                  <strong>
                    {task.title}
                    <Paperclip size={12} aria-hidden="true" />
                  </strong>
                  <small>{task.description || 'No description added yet.'}</small>
                </span>
              </span>
              <span className="wf-todos-workflow">
                <b style={{ background: dotColor }}>{initials(project?.name || 'Workflow')}</b>
                <span className="wf-todos-workflow-text">
                  <strong>{project?.name || 'Workflow'}</strong>
                  <small>Primary Workflow</small>
                </span>
              </span>
              <span className={`wf-todos-priority ${priorityClass(task.priority)}`}>
                <i />
                {task.priority || 'Normal'}
              </span>
              <span className={`wf-todos-due ${state}`}>
                <CalendarDays size={13} aria-hidden="true" />
                <span className="wf-todos-due-text">
                  <strong>{formatDue(task.dueDate)}</strong>
                  <small>{dueSubLabel(state, task.dueDate)}</small>
                </span>
              </span>
              <span className={`wf-todos-status ${status.kind}`}>
                <i />
                {status.label}
              </span>
              <span className="wf-todos-rowaction">
                <button type="button" aria-label="More actions"><MoreVertical size={16} /></button>
              </span>
            </div>
          )
        }) : (
          <div className="wf-todos-empty">
            <CheckCircle2 size={42} />
            <strong>No workflow to-dos found</strong>
            <p>Open jobs assigned to you will appear here without leaving the workflow workspace.</p>
          </div>
        )}
      </section>

      {filteredTasks.length > 0 && (
        <footer className="wf-todos-footer">
          <span>Showing 1 to {filteredTasks.length} of {filteredTasks.length} to-dos</span>
          <div className="wf-todos-pager">
            <button type="button" aria-label="Previous page"><ChevronLeft size={14} /></button>
            <button type="button" className="active" aria-current="page">1</button>
            <button type="button" aria-label="Next page"><ChevronRight size={14} /></button>
            <button type="button" className="wf-todos-pagesize">10 / page <ChevronDown size={13} /></button>
          </div>
        </footer>
      )}
    </main>
  )
}

function Metric({ icon, label, detail, value, tone, chart }: { icon: React.ReactNode; label: string; detail: string; value: number; tone: string; chart: 'line' | 'bar' }) {
  return (
    <article className="wf-todos-metric" style={{ '--wf-todo-tone': tone } as React.CSSProperties}>
      <div className="wf-todos-metric-head">
        <span>{icon}</span>
        <div className="wf-todos-metric-text">
          <strong>{value}</strong>
          <p>{label}</p>
          <small>{detail}</small>
        </div>
      </div>
      {chart === 'line' ? <MiniLine color={tone} /> : <MiniBars color={tone} />}
    </article>
  )
}

function MiniLine({ color }: { color: string }) {
  return (
    <svg className="wf-todos-metric-chart" width={80} height={28} viewBox="0 0 72 22" preserveAspectRatio="none" aria-hidden="true">
      <polyline points="0,16 10,18 20,8 32,14 44,6 56,16 72,9" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function MiniBars({ color }: { color: string }) {
  const bars = [10, 16, 8, 14, 18, 7, 13]
  return (
    <svg className="wf-todos-metric-chart" width={80} height={28} viewBox="0 0 72 22" preserveAspectRatio="none" aria-hidden="true">
      {bars.map((h, i) => (
        <rect key={i} x={i * 10 + 1} y={22 - h} width={6} height={h} rx={1.5} fill={color} opacity={0.85} />
      ))}
    </svg>
  )
}

const todosCss = `
.wf-todos-page {
  min-height: calc(100vh - 66px);
  background: #fff;
  padding: 26px 28px 32px;
  color: #111827;
}
.wf-todos-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 22px;
  margin-bottom: 24px;
  flex-wrap: wrap;
}
.wf-todos-title {
  display: grid;
  grid-template-columns: 48px minmax(0, 1fr);
  gap: 14px;
  align-items: center;
}
.wf-todos-title > span {
  width: 46px;
  height: 46px;
  border-radius: 11px;
  background: #dff8eb;
  color: #0f9f5f;
  display: grid;
  place-items: center;
}
.wf-todos-breadcrumb {
  color: #64748b;
  font-size: 13px;
}
.wf-todos-breadcrumb strong {
  color: #111827;
}
.wf-todos-title h1 {
  margin: 6px 0 0;
  font-size: 28px;
  line-height: 1.05;
}
.wf-todos-title p {
  margin: 6px 0 0;
  color: #4b5563;
  font-size: 14px;
}
.wf-todos-actions {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}
.wf-todos-search {
  width: 240px;
  height: 42px;
  border: 1px solid #e2e6ec;
  border-radius: 10px;
  background: #fff;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 0 13px;
  color: #8a95a3;
}
.wf-todos-search input {
  min-width: 0;
  flex: 1;
  border: 0;
  outline: 0;
  background: transparent;
  color: #111827;
  font: inherit;
  font-size: 13px;
}
.wf-todos-toolbtn {
  height: 42px;
  border: 1px solid #e2e6ec;
  border-radius: 10px;
  background: #fff;
  color: #111827;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 0 14px;
  font-size: 13px;
  font-weight: 800;
  cursor: pointer;
}
.wf-todos-new {
  height: 42px;
  border-radius: 10px;
  background: #16a34a;
  color: #fff;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 0 16px;
  font-size: 13px;
  font-weight: 900;
  text-decoration: none;
  box-shadow: 0 8px 18px rgba(22, 163, 74, 0.18);
}
.wf-todos-new:hover {
  background: #15913f;
}
.wf-todos-metrics {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 14px;
  margin-bottom: 22px;
}
.wf-todos-metric {
  position: relative;
  min-height: 118px;
  border: 1px solid #eef1f4;
  border-radius: 14px;
  background: #fff;
  box-shadow: 0 1px 2px rgba(16, 24, 40, 0.04);
  padding: 16px 18px;
  overflow: hidden;
}
.wf-todos-metric-head {
  display: flex;
  align-items: flex-start;
  gap: 12px;
}
.wf-todos-metric-head > span {
  width: 40px;
  height: 40px;
  border-radius: 11px;
  background: color-mix(in srgb, var(--wf-todo-tone) 13%, white);
  color: var(--wf-todo-tone);
  display: grid;
  place-items: center;
  flex-shrink: 0;
}
.wf-todos-metric-text strong {
  display: block;
  font-size: 26px;
  font-weight: 900;
  line-height: 1;
  color: #0f172a;
}
.wf-todos-metric-text p {
  margin: 6px 0 0;
  color: #0f172a;
  font-size: 13px;
  font-weight: 800;
}
.wf-todos-metric-text small {
  display: block;
  margin-top: 4px;
  color: #64748b;
  font-size: 11.5px;
}
.wf-todos-metric-chart {
  position: absolute;
  right: 14px;
  bottom: 14px;
  opacity: 0.9;
}
.wf-todos-tabs {
  display: flex;
  align-items: stretch;
  gap: 4px;
  height: 48px;
  border: 1px solid #eef1f4;
  border-radius: 12px 12px 0 0;
  background: #fff;
  padding: 0 12px;
}
.wf-todos-tabs button {
  border: 0;
  border-bottom: 2px solid transparent;
  background: transparent;
  color: #6b7480;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 0 14px;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  transition: color 120ms ease, border-color 120ms ease;
}
.wf-todos-tabs button:hover {
  color: #111827;
}
.wf-todos-tabs button.active {
  color: #0f9f5f;
  border-bottom-color: #0f9f5f;
  font-weight: 800;
}
.wf-todos-tabs em {
  font-style: normal;
  min-width: 22px;
  padding: 1px 7px;
  border-radius: 999px;
  background: #f1f3f7;
  color: #475569;
  font-size: 11px;
  font-weight: 800;
}
.wf-todos-tabs button.active em {
  background: #dcfce7;
  color: #166534;
}
.wf-todos-list {
  border: 1px solid #eef1f4;
  border-top: 0;
  border-radius: 0 0 12px 12px;
  overflow: hidden;
  background: #fff;
}
.wf-todos-row {
  min-height: 78px;
  display: grid;
  grid-template-columns: 42px minmax(260px, 1.5fr) minmax(190px, .95fr) minmax(120px, .55fr) minmax(150px, .7fr) minmax(130px, .6fr) 60px;
  gap: 14px;
  align-items: center;
  padding: 0 16px;
  border-bottom: 1px solid #eef1f4;
}
.wf-todos-row:last-child {
  border-bottom: 0;
}
.wf-todos-row.head {
  min-height: 50px;
  color: #475569;
  font-size: 12px;
  font-weight: 800;
  background: #fbfcfd;
}
.wf-todos-check {
  display: flex;
  align-items: center;
  justify-content: center;
}
.wf-todos-checkbox {
  width: 18px;
  height: 18px;
  border: 1.5px solid #cfd6df;
  border-radius: 5px;
  display: block;
}
.wf-todos-main {
  min-width: 0;
  display: grid;
  grid-template-columns: 10px minmax(0, 1fr);
  gap: 12px;
  align-items: flex-start;
}
.wf-todos-dot {
  width: 10px;
  height: 10px;
  border-radius: 999px;
  margin-top: 6px;
  flex-shrink: 0;
}
.wf-todos-main-text {
  min-width: 0;
  display: grid;
  gap: 4px;
}
.wf-todos-main-text strong {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  color: #0f172a;
  font-size: 13.5px;
  font-weight: 800;
}
.wf-todos-main-text strong svg {
  color: #94a3b8;
}
.wf-todos-main-text small {
  color: #64748b;
  font-size: 12px;
  line-height: 1.4;
}
.wf-todos-workflow {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
  color: #0f172a;
}
.wf-todos-workflow b {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  color: #fff;
  display: grid;
  place-items: center;
  font-size: 11px;
  font-weight: 900;
  flex-shrink: 0;
}
.wf-todos-workflow-text {
  min-width: 0;
  display: grid;
  gap: 2px;
}
.wf-todos-workflow-text strong {
  color: #0f172a;
  font-size: 13px;
  font-weight: 800;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.wf-todos-workflow-text small {
  color: #94a3b8;
  font-size: 11.5px;
}
.wf-todos-priority {
  width: fit-content;
  min-height: 26px;
  border-radius: 999px;
  padding: 0 11px;
  display: inline-flex;
  align-items: center;
  gap: 7px;
  font-size: 12px;
  font-weight: 800;
}
.wf-todos-priority i {
  width: 6px;
  height: 6px;
  border-radius: 999px;
  background: currentColor;
}
.wf-todos-priority.urgent { background: #fef2f2; color: #b91c1c; }
.wf-todos-priority.high { background: #fef2f2; color: #e11d48; }
.wf-todos-priority.normal { background: #fef6e7; color: #b7791f; }
.wf-todos-priority.low { background: #eff6ff; color: #2563eb; }
.wf-todos-due {
  display: inline-flex;
  align-items: flex-start;
  gap: 7px;
  color: #0f172a;
}
.wf-todos-due svg {
  color: #94a3b8;
  margin-top: 2px;
  flex-shrink: 0;
}
.wf-todos-due-text {
  display: grid;
  gap: 2px;
}
.wf-todos-due-text strong {
  color: #0f172a;
  font-size: 13px;
  font-weight: 800;
}
.wf-todos-due-text small {
  color: #64748b;
  font-size: 11.5px;
}
.wf-todos-due.overdue .wf-todos-due-text small { color: #e11d48; font-weight: 700; }
.wf-todos-due.today .wf-todos-due-text small { color: #b7791f; font-weight: 700; }
.wf-todos-due.upcoming .wf-todos-due-text small { color: #2563eb; font-weight: 700; }
.wf-todos-status {
  width: fit-content;
  min-height: 26px;
  border-radius: 999px;
  padding: 0 11px;
  display: inline-flex;
  align-items: center;
  gap: 7px;
  font-size: 12px;
  font-weight: 800;
}
.wf-todos-status i {
  width: 6px;
  height: 6px;
  border-radius: 999px;
  background: currentColor;
}
.wf-todos-status.open { background: #ecfdf3; color: #0f9f5f; }
.wf-todos-status.in-progress { background: #fef6e7; color: #b7791f; }
.wf-todos-status.overdue { background: #fef2f2; color: #e11d48; }
.wf-todos-status.completed { background: #f1f5f9; color: #475569; }
.wf-todos-rowaction {
  display: flex;
  align-items: center;
  justify-content: center;
}
.wf-todos-rowaction button {
  width: 32px;
  height: 32px;
  border: 0;
  background: transparent;
  color: #94a3b8;
  display: grid;
  place-items: center;
  border-radius: 8px;
  cursor: pointer;
}
.wf-todos-rowaction button:hover {
  background: #f1f5f9;
  color: #0f172a;
}
.wf-todos-empty {
  min-height: 260px;
  display: grid;
  place-items: center;
  gap: 8px;
  text-align: center;
  color: #64748b;
  padding: 34px;
}
.wf-todos-empty strong {
  color: #111827;
}
.wf-todos-empty p {
  max-width: 360px;
  margin: 0;
  font-size: 13px;
  line-height: 1.5;
}
.wf-todos-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  margin-top: 18px;
  color: #64748b;
  font-size: 13px;
}
.wf-todos-pager {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}
.wf-todos-pager button {
  min-width: 32px;
  height: 32px;
  padding: 0 8px;
  border: 1px solid #e2e6ec;
  border-radius: 8px;
  background: #fff;
  color: #111827;
  font-size: 12.5px;
  font-weight: 700;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
}
.wf-todos-pager button.active {
  background: #16a34a;
  border-color: #16a34a;
  color: #fff;
}
.wf-todos-pager .wf-todos-pagesize {
  min-width: 92px;
  margin-left: 4px;
}

/* The global \`[class*="header"]\` rule (globals.css:4116) forces a white
   background on any element whose class contains "header". Override it so the
   to-dos page header sits transparently on the page background. */
html[data-theme] .wf-todos-page .wf-todos-header {
  background: transparent !important;
  background-color: transparent !important;
  box-shadow: none !important;
  border-color: transparent !important;
}

@media (max-width: 1180px) {
  .wf-todos-metrics {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .wf-todos-list {
    overflow-x: auto;
  }
  .wf-todos-row {
    min-width: 960px;
  }
}
@media (max-width: 720px) {
  .wf-todos-page {
    padding: 18px 14px 28px;
  }
  .wf-todos-header {
    display: grid;
  }
  .wf-todos-metrics {
    grid-template-columns: 1fr;
  }
  .wf-todos-tabs {
    overflow-x: auto;
  }
}
`
