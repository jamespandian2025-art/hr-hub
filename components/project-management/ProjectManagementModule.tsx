'use client'

import { FormEvent, useMemo, useState } from 'react'
import {
  Bell,
  BriefcaseBusiness,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  Clock3,
  FileText,
  Filter,
  ListChecks,
  MoreHorizontal,
  Paperclip,
  Plus,
  Search,
  Timer,
  WalletCards,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { budgetSummary, formatDate, formatMoney, initials, monthlyStatusTrend, progressSegments, projectStats, tasksByStatus, workloadByMember } from '@/lib/project-management/metrics'
import type { ProjectManagementState, ProjectRecord, ProjectTask, TaskStatus } from '@/lib/project-management/types'
import { useProjectManagement } from './useProjectManagement'

const tabs = ['Overview', 'Projects', 'Tasks', 'Kanban', 'Timeline', 'Resources', 'Time Logs', 'Budget', 'Documents']
const detailTabs = ['Overview', 'Tasks', 'Kanban', 'Timeline', 'Files', 'Budget', 'Team', 'Activity Logs']
const statusOptions = ['All', 'Planning', 'Active', 'In Progress', 'On Hold', 'Completed', 'Cancelled']
const priorityOptions = ['All', 'Low', 'Medium', 'High', 'Critical']
const colors = {
  green: '#16a34a',
  blue: '#2f80ed',
  orange: '#f59e0b',
  purple: '#8b5cf6',
  red: '#ef4444',
  slate: '#64748b',
}

function fieldId(name: string) {
  return `pm-${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`
}

function defaultProjectDraft(clientId: string) {
  return {
    name: '',
    clientId,
    description: '',
    budget: '0',
    dueDate: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
    department: 'Delivery',
  }
}

export default function ProjectManagementModule() {
  const store = useProjectManagement()
  const { state, filters, setFilters, filteredProjects } = store
  const [showCreate, setShowCreate] = useState(false)
  const [draggedTask, setDraggedTask] = useState<string | null>(null)
  const [draft, setDraft] = useState(() => defaultProjectDraft(state.clients[0]?.id || ''))
  const stats = projectStats(state)
  const budget = budgetSummary(state)
  const departments = useMemo(() => ['All', ...Array.from(new Set(state.projects.map(project => project.department)))], [state.projects])

  const kpis = [
    { title: 'Total Projects', value: String(stats.totalProjects), change: '+14.6%', comparison: 'vs prior period', icon: BriefcaseBusiness, tone: colors.green },
    { title: 'Completed Projects', value: String(stats.completedProjects), change: '+23.8%', comparison: 'vs prior period', icon: CheckCircle2, tone: colors.blue },
    { title: 'In Progress Projects', value: String(stats.inProgressProjects), change: '+5.3%', comparison: 'vs prior period', icon: Clock3, tone: colors.purple },
    { title: 'On Hold Projects', value: String(stats.onHoldProjects), change: '-7.1%', comparison: 'vs prior period', icon: Timer, tone: colors.orange, negative: true },
    { title: 'Total Budget', value: formatMoney(stats.totalBudget), change: '+12.4%', comparison: 'vs prior period', icon: WalletCards, tone: '#14b8a6' },
  ]

  const createProject = (event: FormEvent) => {
    event.preventDefault()
    store.createProject({
      name: draft.name.trim() || 'Untitled Project',
      clientId: draft.clientId || state.clients[0]?.id || 'client-local',
      description: draft.description,
      budget: Number(draft.budget) || 0,
      dueDate: draft.dueDate,
      department: draft.department,
    })
    setDraft(prev => ({ ...prev, name: '', description: '', budget: '0' }))
    setShowCreate(false)
  }

  const onDropTask = (status: TaskStatus) => {
    if (!draggedTask) return
    store.updateTaskStatus(draggedTask, status)
    setDraggedTask(null)
  }

  return (
    <div className="pm-shell">
      <style>{projectManagementCss}</style>
      <div className="pm-workspace">
        <header className="pm-header">
          <div className="pm-title-block">
            <h1>Project Management</h1>
            <p>Plan, track and deliver projects successfully.</p>
          </div>
          <div className="pm-header-actions">
            <button type="button" className="pm-control"><CalendarDays size={15} /> May 1 - May 31, 2026 <ChevronDown size={13} /></button>
            <label className="pm-search"><Search size={16} /><input value={filters.query} onChange={event => setFilters(prev => ({ ...prev, query: event.target.value }))} placeholder="Search projects, tasks, documents..." /></label>
            <button type="button" className="pm-control"><Bell size={15} /></button>
            <button type="button" className="pm-control"><Filter size={15} /> Filters</button>
            <button type="button" className="pm-primary" onClick={() => setShowCreate(true)}><Plus size={16} /> New Project <ChevronDown size={13} /></button>
          </div>
        </header>

        <section className="pm-kpis">
          {kpis.map(kpi => <KpiCard key={kpi.title} {...kpi} />)}
        </section>

        <TabBar tabs={tabs} active={store.activeTab} onChange={store.setActiveTab} />

        {showCreate && (
          <section className="pm-card pm-create">
            <div className="pm-section-header"><h2>New Project</h2><button type="button" onClick={() => setShowCreate(false)}>Cancel</button></div>
            <form onSubmit={createProject} className="pm-form">
              <Field label="Project name"><input value={draft.name} onChange={event => setDraft(prev => ({ ...prev, name: event.target.value }))} required /></Field>
              <Field label="Client"><select value={draft.clientId} onChange={event => setDraft(prev => ({ ...prev, clientId: event.target.value }))}>{state.clients.map(client => <option key={client.id} value={client.id}>{client.name}</option>)}</select></Field>
              <Field label="Department"><input value={draft.department} onChange={event => setDraft(prev => ({ ...prev, department: event.target.value }))} /></Field>
              <Field label="Due date"><input value={draft.dueDate} onChange={event => setDraft(prev => ({ ...prev, dueDate: event.target.value }))} type="date" /></Field>
              <Field label="Budget"><input value={draft.budget} onChange={event => setDraft(prev => ({ ...prev, budget: event.target.value }))} type="number" min="0" /></Field>
              <label className="pm-field pm-wide"><span>Description</span><textarea value={draft.description} onChange={event => setDraft(prev => ({ ...prev, description: event.target.value }))} rows={3} /></label>
              <div className="pm-form-actions"><button type="submit" className="pm-primary"><Plus size={15} /> Create Project</button></div>
            </form>
          </section>
        )}

        {store.selectedProject ? (
          <ProjectDetails state={state} project={store.selectedProject} active={store.detailTab} onTab={store.setDetailTab} onClose={() => store.setSelectedProjectId(null)} onAddTask={store.addTask} onDrag={setDraggedTask} onDrop={onDropTask} />
        ) : (
          <>
            {store.activeTab === 'Overview' && <Overview state={state} projects={filteredProjects} budget={budget} onOpen={store.setSelectedProjectId} />}
            {store.activeTab === 'Projects' && <ProjectsTab state={state} projects={filteredProjects} filters={filters} departments={departments} onFilters={setFilters} onOpen={store.setSelectedProjectId} />}
            {store.activeTab === 'Tasks' && <TasksTab state={state} />}
            {store.activeTab === 'Kanban' && <Kanban state={state} onDrag={setDraggedTask} onDrop={onDropTask} />}
            {store.activeTab === 'Timeline' && <Timeline state={state} />}
            {store.activeTab === 'Resources' && <Resources state={state} />}
            {store.activeTab === 'Time Logs' && <TimeLogs state={state} />}
            {store.activeTab === 'Budget' && <BudgetTab state={state} budget={budget} />}
            {store.activeTab === 'Documents' && <Documents state={state} />}
          </>
        )}
      </div>
    </div>
  )
}

function KpiCard({ title, value, change, comparison, icon: Icon, tone, negative }: { title: string; value: string; change: string; comparison: string; icon: LucideIcon; tone: string; negative?: boolean }) {
  return <article className="pm-card pm-kpi"><span style={{ background: `${tone}16`, color: tone }}><Icon size={24} /></span><div><small>{title}</small><strong>{value}</strong><em className={negative ? 'negative' : ''}>{change} {comparison}</em></div></article>
}

function TabBar({ tabs, active, onChange }: { tabs: string[]; active: string; onChange: (tab: string) => void }) {
  return <nav className="pm-tabs">{tabs.map(tab => <button key={tab} type="button" className={active === tab ? 'active' : undefined} onClick={() => onChange(tab)}>{tab}</button>)}</nav>
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="pm-field" htmlFor={fieldId(label)}><span>{label}</span>{children}</label>
}

function Overview({ state, projects, budget, onOpen }: { state: ProjectManagementState; projects: ProjectRecord[]; budget: ReturnType<typeof budgetSummary>; onOpen: (id: string) => void }) {
  const segments = progressSegments(state)
  const trend = monthlyStatusTrend(state)
  return (
    <section className="pm-overview-grid">
      <div className="pm-card pm-progress"><SectionTitle title="Project Progress Overview" /><Donut data={segments} center={String(state.projects.length)} sub="Total Projects" /></div>
      <div className="pm-card pm-trend"><SectionTitle title="Projects by Status" action="By Month" /><LineChart data={trend} /></div>
      <div className="pm-card pm-milestones"><SectionTitle title="Upcoming Milestones" action="View All" /><MilestoneList state={state} /></div>
      <div className="pm-card pm-recent"><SectionTitle title="Recent Projects" action="View All" /><ProjectTable state={state} projects={projects.slice(0, 5)} onOpen={onOpen} /></div>
      <div className="pm-card"><SectionTitle title="Project Budget Summary" action="View Report" /><BudgetSummary budget={budget} /></div>
      <div className="pm-card"><SectionTitle title="Quick Actions" /><QuickActions /></div>
    </section>
  )
}

function ProjectsTab({ state, projects, filters, departments, onFilters, onOpen }: { state: ProjectManagementState; projects: ProjectRecord[]; filters: { status: string; priority: string; assignee: string; department: string }; departments: string[]; onFilters: React.Dispatch<React.SetStateAction<{ query: string; status: string; priority: string; assignee: string; department: string }>>; onOpen: (id: string) => void }) {
  return <section className="pm-card"><div className="pm-filter-row"><Select value={filters.status} options={statusOptions} onChange={value => onFilters(prev => ({ ...prev, status: value }))} /><Select value={filters.priority} options={priorityOptions} onChange={value => onFilters(prev => ({ ...prev, priority: value }))} /><Select value={filters.assignee} options={['All', ...state.members.map(m => m.id)]} labels={Object.fromEntries(state.members.map(m => [m.id, m.name]))} onChange={value => onFilters(prev => ({ ...prev, assignee: value }))} /><Select value={filters.department} options={departments} onChange={value => onFilters(prev => ({ ...prev, department: value }))} /></div><ProjectTable state={state} projects={projects} onOpen={onOpen} /></section>
}

function Select({ value, options, labels = {}, onChange }: { value: string; options: string[]; labels?: Record<string, string>; onChange: (value: string) => void }) {
  return <select className="pm-select" value={value} onChange={event => onChange(event.target.value)}>{options.map(option => <option key={option} value={option}>{labels[option] || option}</option>)}</select>
}

function ProjectTable({ state, projects, onOpen }: { state: ProjectManagementState; projects: ProjectRecord[]; onOpen: (id: string) => void }) {
  return <div className="pm-table-wrap"><table className="pm-table"><thead><tr>{['Project Name', 'Client', 'Project Manager', 'Status', 'Progress', 'Budget', 'Due Date', 'Actions'].map(head => <th key={head}>{head}</th>)}</tr></thead><tbody>{projects.map(project => { const client = state.clients.find(c => c.id === project.clientId); const manager = state.members.find(m => m.id === project.managerId); return <tr key={project.id}><td><strong>{project.name}</strong><small>{project.tags.join(', ') || project.department}</small></td><td>{client?.name || project.clientId}</td><td><Avatar member={manager} /> {manager?.name || '-'}</td><td><Pill value={project.status} /></td><td><Progress value={project.progress} /></td><td>{formatMoney(project.budget)}</td><td>{formatDate(project.dueDate)}</td><td><button type="button" className="pm-icon-btn" onClick={() => onOpen(project.id)}><MoreHorizontal size={16} /></button></td></tr> })}</tbody></table></div>
}

function TasksTab({ state }: { state: ProjectManagementState }) {
  return <section className="pm-card"><SectionTitle title="Task Management" action={`${state.tasks.length} tasks`} /><div className="pm-task-list">{state.tasks.map(task => <TaskCard key={task.id} state={state} task={task} />)}</div></section>
}

function Kanban({ state, onDrag, onDrop }: { state: ProjectManagementState; onDrag: (id: string) => void; onDrop: (status: TaskStatus) => void }) {
  return <section className="pm-kanban">{tasksByStatus(state).filter(column => column.status !== 'Blocked').map(column => <div key={column.status} className="pm-card pm-kanban-col" onDragOver={event => event.preventDefault()} onDrop={() => onDrop(column.status)}><SectionTitle title={column.status} action={String(column.tasks.length)} />{column.tasks.map(task => <TaskCard key={task.id} state={state} task={task} draggable onDrag={() => onDrag(task.id)} />)}</div>)}</section>
}

function TaskCard({ state, task, draggable, onDrag }: { state: ProjectManagementState; task: ProjectTask; draggable?: boolean; onDrag?: () => void }) {
  const member = state.members.find(item => item.id === task.assigneeId)
  const project = state.projects.find(item => item.id === task.projectId)
  return <article className="pm-task-card" draggable={draggable} onDragStart={onDrag}><div><strong>{task.title}</strong><small>{project?.name}</small></div><p>{task.description}</p><div className="pm-chip-row"><Pill value={task.priority} /><Pill value={task.status} /><span><Paperclip size={13} /> {task.attachments}</span></div><footer><Avatar member={member} /><span>{formatDate(task.dueDate)}</span><Progress value={task.progress} /></footer></article>
}

function Timeline({ state }: { state: ProjectManagementState }) {
  const min = Math.min(...state.projects.map(p => new Date(`${p.startDate}T00:00:00`).getTime()))
  const max = Math.max(...state.projects.map(p => new Date(`${p.dueDate}T00:00:00`).getTime()))
  const span = Math.max(max - min, 1)
  return <section className="pm-card"><SectionTitle title="Timeline" action="Gantt View" /><div className="pm-timeline">{state.projects.map(project => { const left = ((new Date(`${project.startDate}T00:00:00`).getTime() - min) / span) * 70; const width = Math.max(12, ((new Date(`${project.dueDate}T00:00:00`).getTime() - new Date(`${project.startDate}T00:00:00`).getTime()) / span) * 80); return <div key={project.id}><span>{project.name}</span><strong style={{ marginLeft: `${left}%`, width: `${width}%` }}>{project.status}</strong></div> })}</div></section>
}

function Resources({ state }: { state: ProjectManagementState }) {
  return <section className="pm-card"><SectionTitle title="Resource Workload" /><div className="pm-resource-grid">{workloadByMember(state).map(item => <article key={item.member.id}><Avatar member={item.member} /><strong>{item.member.name}</strong><small>{item.member.department} · {item.taskCount} open tasks</small><Progress value={item.workload} /></article>)}</div></section>
}

function TimeLogs({ state }: { state: ProjectManagementState }) {
  return <section className="pm-card"><SectionTitle title="Time Logs" action={`${state.timeLogs.reduce((s, l) => s + l.hours, 0)} hrs`} /><div className="pm-table-wrap"><table className="pm-table"><thead><tr>{['Employee', 'Project', 'Task', 'Hours', 'Date', 'Billing', 'Approval'].map(h => <th key={h}>{h}</th>)}</tr></thead><tbody>{state.timeLogs.map(log => { const member = state.members.find(m => m.id === log.employeeId); const project = state.projects.find(p => p.id === log.projectId); const task = state.tasks.find(t => t.id === log.taskId); return <tr key={log.id}><td>{member?.name}</td><td>{project?.name}</td><td>{task?.title}</td><td>{log.hours}</td><td>{formatDate(log.date)}</td><td>{log.billable ? 'Billable' : 'Non-billable'}</td><td><Pill value={log.approved ? 'Approved' : 'Pending'} /></td></tr> })}</tbody></table></div></section>
}

function BudgetTab({ state, budget }: { state: ProjectManagementState; budget: ReturnType<typeof budgetSummary> }) {
  return <section className="pm-budget-grid"><div className="pm-card"><SectionTitle title="Budget vs Actual" /><BudgetSummary budget={budget} /></div><div className="pm-card"><SectionTitle title="Spending Trend" /><BarList items={state.projects.map(p => ({ label: p.name, value: p.spent, max: p.budget }))} /></div></section>
}

function Documents({ state }: { state: ProjectManagementState }) {
  return <section className="pm-card"><SectionTitle title="Documents" action="Upload" /><div className="pm-doc-grid">{state.documents.map(doc => <article key={doc.id}><FileText size={20} /><strong>{doc.name}</strong><small>{doc.folder} · {doc.type} · {doc.size}</small><span>{doc.version} · {formatDate(doc.updatedAt)}</span></article>)}</div></section>
}

function ProjectDetails({ state, project, active, onTab, onClose, onAddTask, onDrag, onDrop }: { state: ProjectManagementState; project: ProjectRecord; active: string; onTab: (tab: string) => void; onClose: () => void; onAddTask: (projectId: string) => void; onDrag: (id: string) => void; onDrop: (status: TaskStatus) => void }) {
  const tasks = state.tasks.filter(task => task.projectId === project.id)
  const projectState = { ...state, tasks }
  return <section className="pm-detail"><div className="pm-card pm-detail-head"><button type="button" onClick={onClose}>Back</button><div><h2>{project.name}</h2><p>{project.description}</p></div><button type="button" className="pm-primary" onClick={() => onAddTask(project.id)}><Plus size={15} /> Add Task</button></div><TabBar tabs={detailTabs} active={active} onChange={onTab} />{active === 'Overview' && <div className="pm-overview-grid"><div className="pm-card"><SectionTitle title="Project Overview" /><Progress value={project.progress} /><p>{project.description}</p><BudgetSummary budget={{ total: project.budget, spent: project.spent, committed: project.committed, remaining: project.budget - project.spent - project.committed }} /></div><div className="pm-card"><SectionTitle title="Milestones" /><MilestoneList state={projectState} /></div><div className="pm-card"><SectionTitle title="Recent Activity" />{state.activities.filter(a => a.projectId === project.id).map(a => <p key={a.id}>{a.action}</p>)}</div></div>}{active === 'Tasks' && <TasksTab state={projectState} />}{active === 'Kanban' && <Kanban state={projectState} onDrag={onDrag} onDrop={onDrop} />}{active === 'Timeline' && <Timeline state={{ ...state, projects: [project] }} />}{active === 'Files' && <Documents state={{ ...state, documents: state.documents.filter(doc => doc.projectId === project.id) }} />}{active === 'Budget' && <BudgetTab state={{ ...state, projects: [project] }} budget={{ total: project.budget, spent: project.spent, committed: project.committed, remaining: project.budget - project.spent - project.committed }} />}{active === 'Team' && <Resources state={{ ...state, members: state.members.filter(m => project.memberIds.includes(m.id)) }} />}{active === 'Activity Logs' && <section className="pm-card">{state.activities.filter(a => a.projectId === project.id).map(a => <p key={a.id}>{formatDate(a.createdAt)} · {a.action}</p>)}</section>}</section>
}

function SectionTitle({ title, action }: { title: string; action?: string }) { return <div className="pm-section-header"><h2>{title}</h2>{action && <button type="button">{action}</button>}</div> }
function Pill({ value }: { value: string }) { return <span className={`pm-pill tone-${value.toLowerCase().replaceAll(' ', '-')}`}>{value}</span> }
function Avatar({ member }: { member?: { name: string; avatarColor: string } }) { return <span className="pm-avatar" style={{ background: member?.avatarColor || colors.green }}>{initials(member?.name || 'NA')}</span> }
function Progress({ value }: { value: number }) { return <span className="pm-progress"><i style={{ width: `${Math.max(0, Math.min(value, 100))}%` }} /></span> }

function Donut({ data, center, sub }: { data: Array<{ label: string; value: number; color: string }>; center: string; sub: string }) {
  const total = Math.max(data.reduce((s, d) => s + d.value, 0), 1)
  const gradient = data.reduce<{ cursor: number; stops: string[] }>((acc, item) => {
    const start = acc.cursor
    const end = start + (item.value / total) * 100
    return { cursor: end, stops: [...acc.stops, `${item.color} ${start}% ${end}%`] }
  }, { cursor: 0, stops: [] }).stops.join(', ')
  return <div className="pm-donut-wrap"><div className="pm-donut" style={{ background: `conic-gradient(${gradient})` }}><span><strong>{center}</strong><small>{sub}</small></span></div><div className="pm-legend">{data.map(item => <p key={item.label}><i style={{ background: item.color }} />{item.label}<strong>{Math.round((item.value / total) * 100)}% ({item.value})</strong></p>)}</div></div>
}

function LineChart({ data }: { data: ReturnType<typeof monthlyStatusTrend> }) {
  const series = [{ key: 'completed', color: colors.green }, { key: 'inProgress', color: colors.blue }, { key: 'onHold', color: colors.orange }, { key: 'planning', color: colors.purple }] as const
  const max = Math.max(...data.flatMap(row => series.map(item => Number(row[item.key]))), 1)
  return <div className="pm-line"><svg viewBox="0 0 640 260" preserveAspectRatio="none">{[0, 1, 2, 3].map(i => <line key={i} x1="0" x2="640" y1={40 + i * 55} y2={40 + i * 55} stroke="#e8edf4" />)}{series.map(item => <polyline key={item.key} fill="none" stroke={item.color} strokeWidth="3" points={data.map((row, index) => `${(index / Math.max(data.length - 1, 1)) * 620 + 10},${230 - (Number(row[item.key]) / max) * 190}`).join(' ')} />)}</svg><div>{data.map(row => <span key={row.label}>{row.label}</span>)}</div></div>
}

function MilestoneList({ state }: { state: ProjectManagementState }) { return <div className="pm-list">{state.milestones.slice(0, 5).map(m => { const p = state.projects.find(project => project.id === m.projectId); return <article key={m.id}><CalendarDays size={17} /><span><strong>{m.title}</strong><small>{p?.name}</small></span><em>{formatDate(m.dueDate)}</em><Pill value={m.priority} /></article> })}</div> }
function BudgetSummary({ budget }: { budget: ReturnType<typeof budgetSummary> }) { return <div className="pm-budget-summary">{Object.entries(budget).map(([key, value]) => <span key={key}><small>{key}</small><strong>{formatMoney(value)}</strong></span>)}<Progress value={budget.total ? ((budget.spent + budget.committed) / budget.total) * 100 : 0} /></div> }
function QuickActions() { return <div className="pm-actions">{[['New Project', Plus], ['Assign Task', ListChecks], ['Log Time', Timer], ['Upload Document', FileText]].map(([label, Icon]) => { const I = Icon as LucideIcon; return <button key={label as string} type="button"><span><I size={16} /></span>{label as string}<ChevronDown size={15} /></button> })}</div> }
function BarList({ items }: { items: Array<{ label: string; value: number; max: number }> }) { return <div className="pm-bar-list">{items.map(item => <p key={item.label}><span>{item.label}</span><strong>{formatMoney(item.value)}</strong><Progress value={item.max ? (item.value / item.max) * 100 : 0} /></p>)}</div> }

const projectManagementCss = `
.pm-shell { display: grid; gap: 22px; color: #0f172a; font-family: var(--font-space-grotesk), "Space Grotesk", sans-serif; }
.pm-workspace { min-width: 0; display: grid; gap: 22px; }
.pm-header { display: grid; grid-template-columns: minmax(220px, 1fr) auto; gap: 16px; align-items: start; }
.pm-title-block h1 { margin: 0; font-size: clamp(26px, 3vw, 34px); line-height: 1.1; }
.pm-title-block p { margin: 8px 0 0; color: #23335f; }
.pm-header-actions { display: flex; gap: 12px; justify-content: flex-end; flex-wrap: wrap; }
.pm-control, .pm-primary, .pm-select, .pm-search { min-height: 42px; border: 1px solid #dbe3ef; border-radius: 8px; background: #fff; color: #091133; display: inline-flex; align-items: center; gap: 9px; padding: 0 14px; font-weight: 800; }
.pm-primary { background: #16a34a; border-color: #16a34a; color: #fff; cursor: pointer; }
.pm-search input { border: 0; outline: 0; min-width: 220px; font: inherit; }
.pm-card { background: #fff; border: 1px solid #e6edf6; border-radius: 16px; box-shadow: 0 12px 34px rgba(9, 17, 51, .06); padding: 20px; min-width: 0; }
.pm-kpis { display: grid; grid-template-columns: repeat(5, minmax(170px, 1fr)); gap: 18px; margin-bottom: 22px; }
.pm-kpi { display: flex; align-items: center; gap: 18px; min-height: 112px; }
.pm-kpi > span { width: 56px; height: 56px; border-radius: 12px; display: grid; place-items: center; flex: 0 0 auto; }
.pm-kpi small, .pm-card small { color: #23335f; font-weight: 800; }
.pm-kpi strong { display: block; font-size: 26px; margin-top: 8px; }
.pm-kpi em { display: block; color: #16a34a; font-style: normal; font-size: 12px; font-weight: 800; margin-top: 8px; }
.pm-kpi em.negative { color: #ef4444; }
.pm-tabs { display: flex; gap: 28px; border-bottom: 1px solid #dfe7f2; overflow-x: auto; margin-bottom: 20px; }
.pm-tabs button { border: 0; border-bottom: 3px solid transparent; min-height: 48px; background: transparent; color: #091133; font-weight: 900; cursor: pointer; white-space: nowrap; }
.pm-tabs button.active { color: #16a34a; border-bottom-color: #16a34a; }
.pm-overview-grid { display: grid; grid-template-columns: 1.05fr 1.2fr .9fr; gap: 18px; }
.pm-recent { grid-column: span 2; }
.pm-section-header { display: flex; justify-content: space-between; align-items: center; gap: 12px; margin-bottom: 16px; }
.pm-section-header h2 { margin: 0; font-size: 18px; }
.pm-section-header button { border: 0; background: transparent; color: #2563eb; font-weight: 900; cursor: pointer; }
.pm-donut-wrap { display: grid; grid-template-columns: 220px 1fr; align-items: center; gap: 20px; }
.pm-donut { width: 200px; height: 200px; border-radius: 50%; display: grid; place-items: center; }
.pm-donut span { width: 112px; height: 112px; border-radius: 50%; background: #fff; display: grid; place-items: center; text-align: center; align-content: center; }
.pm-donut strong { font-size: 28px; }
.pm-legend, .pm-list, .pm-actions, .pm-task-list, .pm-bar-list { display: grid; gap: 12px; }
.pm-legend p { display: grid; grid-template-columns: 10px 1fr auto; gap: 10px; align-items: center; margin: 0; font-size: 13px; }
.pm-legend i { width: 10px; height: 10px; border-radius: 999px; }
.pm-line { min-height: 260px; display: grid; grid-template-rows: 1fr auto; }
.pm-line svg { width: 100%; height: 250px; }
.pm-line div { display: flex; justify-content: space-between; color: #23335f; font-size: 12px; font-weight: 800; }
.pm-list article { display: grid; grid-template-columns: 34px 1fr auto auto; gap: 10px; align-items: center; }
.pm-list svg { width: 34px; height: 34px; padding: 8px; border-radius: 9px; background: #e6fffb; color: #0891b2; }
.pm-table-wrap { overflow-x: auto; }
.pm-table { width: 100%; min-width: 820px; border-collapse: collapse; }
.pm-table th { text-align: left; padding: 13px 14px; background: #f8fafc; color: #23335f; font-size: 12px; }
.pm-table td { padding: 14px; border-top: 1px solid #edf2f8; font-size: 13px; vertical-align: middle; }
.pm-avatar { width: 28px; height: 28px; border-radius: 999px; color: #fff; display: inline-grid; place-items: center; font-size: 11px; font-weight: 900; vertical-align: middle; margin-right: 6px; }
.pm-pill { display: inline-flex; min-height: 24px; border-radius: 7px; background: #eef2ff; color: #4f46e5; padding: 0 8px; align-items: center; font-size: 11px; font-weight: 900; white-space: nowrap; }
.tone-completed, .tone-done, .tone-approved, .tone-good { background: #dcfce7; color: #15803d; }
.tone-in-progress, .tone-active, .tone-review { background: #dbeafe; color: #2563eb; }
.tone-on-hold, .tone-medium, .tone-pending { background: #ffedd5; color: #ea580c; }
.tone-critical, .tone-high, .tone-blocked, .tone-delayed, .tone-at-risk { background: #fee2e2; color: #dc2626; }
.pm-progress { display: block; width: 112px; height: 8px; border-radius: 999px; background: #e9edf4; overflow: hidden; }
.pm-progress i { display: block; height: 100%; border-radius: inherit; background: #2f80ed; }
.pm-icon-btn { width: 34px; height: 34px; border: 1px solid #dbe3ef; border-radius: 8px; background: #fff; display: grid; place-items: center; cursor: pointer; }
.pm-filter-row { display: flex; flex-wrap: wrap; gap: 10px; margin-bottom: 16px; }
.pm-kanban { display: grid; grid-template-columns: repeat(4, minmax(240px, 1fr)); gap: 16px; overflow-x: auto; }
.pm-kanban-col { display: grid; align-content: start; gap: 12px; }
.pm-task-card { border: 1px solid #e6edf6; border-radius: 14px; padding: 14px; display: grid; gap: 10px; background: #fff; cursor: grab; }
.pm-task-card p { margin: 0; color: #23335f; font-size: 13px; line-height: 1.45; }
.pm-chip-row { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
.pm-chip-row span:not(.pm-pill) { display: inline-flex; align-items: center; gap: 4px; color: #64748b; font-size: 12px; }
.pm-task-card footer { display: grid; grid-template-columns: auto 1fr auto; align-items: center; gap: 8px; }
.pm-timeline { display: grid; gap: 14px; min-width: 720px; }
.pm-timeline div { display: grid; grid-template-columns: 180px 1fr; align-items: center; }
.pm-timeline strong { display: block; height: 28px; border-radius: 999px; background: linear-gradient(90deg, #16a34a, #2f80ed); color: #fff; padding: 6px 10px; font-size: 12px; }
.pm-resource-grid, .pm-doc-grid, .pm-budget-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 16px; }
.pm-resource-grid article, .pm-doc-grid article { border: 1px solid #e6edf6; border-radius: 14px; padding: 16px; display: grid; gap: 8px; }
.pm-budget-summary { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; }
.pm-budget-summary .pm-progress { grid-column: 1 / -1; width: 100%; }
.pm-actions button { min-height: 52px; border: 0; background: #fff; display: grid; grid-template-columns: 34px 1fr auto; align-items: center; gap: 10px; text-align: left; font-weight: 900; cursor: pointer; }
.pm-actions span { width: 34px; height: 34px; border-radius: 10px; background: #dcfce7; color: #16a34a; display: grid; place-items: center; }
.pm-form { display: grid; grid-template-columns: repeat(5, 1fr); gap: 14px; }
.pm-field { display: grid; gap: 7px; }
.pm-field span { font-size: 12px; color: #23335f; font-weight: 900; }
.pm-field input, .pm-field select, .pm-field textarea { min-height: 42px; border: 1px solid #dbe3ef; border-radius: 10px; padding: 0 12px; font: inherit; }
.pm-field textarea { padding: 10px 12px; resize: vertical; }
.pm-wide { grid-column: span 3; }
.pm-form-actions { grid-column: 1 / -1; display: flex; justify-content: flex-end; }
.pm-detail { display: grid; gap: 18px; }
.pm-detail-head { display: grid; grid-template-columns: auto 1fr auto; align-items: center; gap: 16px; }
.pm-detail-head h2 { margin: 0; }
.pm-detail-head p { margin: 5px 0 0; color: #23335f; }
.pm-detail-head > button:first-child { border: 1px solid #dbe3ef; border-radius: 8px; background: #fff; min-height: 38px; padding: 0 12px; font-weight: 900; cursor: pointer; }
@media (max-width: 1280px) { .pm-kpis { grid-template-columns: repeat(3, 1fr); } .pm-overview-grid { grid-template-columns: 1fr; } .pm-recent { grid-column: auto; } .pm-resource-grid, .pm-doc-grid, .pm-budget-grid { grid-template-columns: 1fr 1fr; } .pm-header { grid-template-columns: 1fr; } .pm-header-actions { justify-content: flex-start; } }
@media (max-width: 640px) { .pm-kpis, .pm-resource-grid, .pm-doc-grid, .pm-budget-grid, .pm-form { grid-template-columns: 1fr; } .pm-header-actions, .pm-search, .pm-control, .pm-primary { width: 100%; justify-content: center; } .pm-search input { min-width: 0; width: 100%; } .pm-donut-wrap, .pm-budget-summary, .pm-detail-head { grid-template-columns: 1fr; } .pm-donut { width: 180px; height: 180px; margin: auto; } .pm-list article { grid-template-columns: 34px 1fr; } .pm-list em, .pm-list .pm-pill { grid-column: 2; } .pm-wide { grid-column: auto; } .pm-table { min-width: 760px; } }
`
