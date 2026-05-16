'use client'

import { FormEvent, useEffect, useMemo, useRef, useState } from 'react'
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
import type { DocumentType, ProjectManagementState, ProjectRecord, ProjectTask, TaskPriority, TaskStatus } from '@/lib/project-management/types'
import { useProjectManagement } from './useProjectManagement'

const tabs = ['Overview', 'Projects', 'Tasks', 'Kanban', 'Timeline', 'Resources', 'Time Logs', 'Budget', 'Documents']
const detailTabs = ['Overview', 'Tasks', 'Kanban', 'Timeline', 'Files', 'Budget', 'Team', 'Activity Logs']
const statusOptions = ['All', 'Planning', 'Active', 'In Progress', 'On Hold', 'Completed', 'Cancelled']
const priorityOptions = ['All', 'Low', 'Medium', 'High', 'Critical']
const documentTypes: DocumentType[] = ['PDF', 'DOCX', 'XLSX', 'Image', 'CAD']
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

function defaultTaskDraft(state: ProjectManagementState) {
  return {
    projectId: state.projects[0]?.id || '',
    title: '',
    description: '',
    assigneeId: state.members[0]?.id || '',
    priority: 'Medium' as TaskPriority,
    dueDate: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
  }
}

function defaultTimeDraft(state: ProjectManagementState) {
  return {
    projectId: state.projects[0]?.id || '',
    taskId: state.tasks[0]?.id || '',
    employeeId: state.members[0]?.id || '',
    hours: '1',
    date: new Date().toISOString().slice(0, 10),
    billable: true,
  }
}

function defaultDocumentDraft(state: ProjectManagementState) {
  return {
    projectId: state.projects[0]?.id || '',
    name: '',
    type: 'PDF' as DocumentType,
    folder: 'Project Files',
    size: '0 KB',
    ownerId: state.members[0]?.id || '',
  }
}

export default function ProjectManagementModule() {
  const store = useProjectManagement()
  const { state, filters, setFilters, filteredProjects, filteredState } = store
  const [showCreate, setShowCreate] = useState(false)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [actionModal, setActionModal] = useState<'task' | 'time' | 'document' | null>(null)
  const [draggedTask, setDraggedTask] = useState<string | null>(null)
  const [draft, setDraft] = useState(() => defaultProjectDraft(state.clients[0]?.id || ''))
  const [taskDraft, setTaskDraft] = useState(() => defaultTaskDraft(state))
  const [timeDraft, setTimeDraft] = useState(() => defaultTimeDraft(state))
  const [documentDraft, setDocumentDraft] = useState(() => defaultDocumentDraft(state))
  const filterPanelRef = useRef<HTMLElement | null>(null)
  const headerActionsRef = useRef<HTMLDivElement | null>(null)
  const stats = projectStats(filteredState)
  const budget = budgetSummary(filteredState)
  const departments = useMemo(() => ['All', ...Array.from(new Set(state.projects.map(project => project.department)))], [state.projects])
  const dateRangeLabel = filters.dateFrom || filters.dateTo ? `${filters.dateFrom || 'Start'} - ${filters.dateTo || 'End'}` : 'All project dates'

  const kpis = [
    { title: 'Total Projects', value: String(stats.totalProjects), change: `${filteredState.tasks.length} tasks`, comparison: 'in view', icon: BriefcaseBusiness, tone: colors.green },
    { title: 'Completed Projects', value: String(stats.completedProjects), change: `${Math.round((stats.completedProjects / Math.max(stats.totalProjects, 1)) * 100)}%`, comparison: 'complete', icon: CheckCircle2, tone: colors.blue },
    { title: 'In Progress Projects', value: String(stats.inProgressProjects), change: `${filteredState.milestones.length} milestones`, comparison: 'tracked', icon: Clock3, tone: colors.purple },
    { title: 'On Hold Projects', value: String(stats.onHoldProjects), change: `${stats.onHoldProjects}`, comparison: 'needs review', icon: Timer, tone: colors.orange, negative: stats.onHoldProjects > 0 },
    { title: 'Total Budget', value: formatMoney(stats.totalBudget), change: formatMoney(budget.remaining), comparison: 'remaining', icon: WalletCards, tone: '#14b8a6' },
  ]

  useEffect(() => {
    if (!filtersOpen) return

    const closeOnOutsideTap = (event: PointerEvent) => {
      const target = event.target as Node | null
      if (!target) return
      if (filterPanelRef.current?.contains(target)) return
      if (headerActionsRef.current?.contains(target)) return
      setFiltersOpen(false)
    }

    document.addEventListener('pointerdown', closeOnOutsideTap)
    return () => document.removeEventListener('pointerdown', closeOnOutsideTap)
  }, [filtersOpen])

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

  const submitTask = (event: FormEvent) => {
    event.preventDefault()
    store.createTask({ ...taskDraft, title: taskDraft.title.trim() || 'New task' })
    setTaskDraft(defaultTaskDraft(state))
    setActionModal(null)
    store.setActiveTab('Tasks')
  }

  const submitTime = (event: FormEvent) => {
    event.preventDefault()
    store.createTimeLog({ ...timeDraft, hours: Number(timeDraft.hours) || 0 })
    setTimeDraft(defaultTimeDraft(state))
    setActionModal(null)
    store.setActiveTab('Time Logs')
  }

  const submitDocument = (event: FormEvent) => {
    event.preventDefault()
    store.createDocument({ ...documentDraft, name: documentDraft.name.trim() || 'Project document' })
    setDocumentDraft(defaultDocumentDraft(state))
    setActionModal(null)
    store.setActiveTab('Documents')
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
          <div className="pm-header-actions" ref={headerActionsRef}>
            <button type="button" className="pm-control pm-date-control" onClick={() => setFiltersOpen(open => !open)}><CalendarDays size={15} /> {dateRangeLabel} <ChevronDown size={13} /></button>
            <label className="pm-search pm-header-search"><Search size={16} /><input value={filters.query} onChange={event => setFilters(prev => ({ ...prev, query: event.target.value }))} placeholder="Search projects, tasks, documents..." /></label>
            <button type="button" className="pm-control pm-bell-control"><Bell size={15} /></button>
            <button type="button" className="pm-control pm-filter-control" onClick={() => setFiltersOpen(open => !open)}><Filter size={15} /> Filters</button>
            <button type="button" className="pm-primary pm-new-project-button" onClick={() => setShowCreate(true)}><Plus size={16} /> New Project <ChevronDown size={13} /></button>
          </div>
        </header>

        {filtersOpen && (
          <div className="pm-filter-backdrop" aria-hidden="true" />
        )}

        {filtersOpen && (
          <section className="pm-card pm-filter-panel" aria-label="Project filters" ref={filterPanelRef}>
            <Field label="Date from"><input type="date" value={filters.dateFrom} onChange={event => setFilters(prev => ({ ...prev, dateFrom: event.target.value }))} /></Field>
            <Field label="Date to"><input type="date" value={filters.dateTo} onChange={event => setFilters(prev => ({ ...prev, dateTo: event.target.value }))} /></Field>
            <Field label="Status"><Select value={filters.status} options={statusOptions} onChange={value => setFilters(prev => ({ ...prev, status: value }))} /></Field>
            <Field label="Priority"><Select value={filters.priority} options={priorityOptions} onChange={value => setFilters(prev => ({ ...prev, priority: value }))} /></Field>
            <Field label="Department"><Select value={filters.department} options={departments} onChange={value => setFilters(prev => ({ ...prev, department: value }))} /></Field>
            <div className="pm-form-actions"><button type="button" className="pm-control" onClick={() => setFilters(prev => ({ ...prev, status: 'All', priority: 'All', assignee: 'All', department: 'All', dateFrom: '', dateTo: '' }))}>Reset Filters</button></div>
          </section>
        )}

        <section className="pm-kpis">
          {kpis.map(kpi => <KpiCard key={kpi.title} {...kpi} />)}
        </section>

        <TabBar tabs={tabs} active={store.activeTab} onChange={store.setActiveTab} />

        {showCreate && (
          <div className="pm-drawer-backdrop">
          <aside className="pm-card pm-create" role="dialog" aria-modal="true" aria-labelledby="pm-create-title">
            <div className="pm-section-header"><h2 id="pm-create-title">New Project</h2><button type="button" className="pm-drawer-close" onClick={() => setShowCreate(false)} aria-label="Close new project form">&times;</button></div>
            <form onSubmit={createProject} className="pm-form pm-create-form">
              <Field label="Project name"><input value={draft.name} onChange={event => setDraft(prev => ({ ...prev, name: event.target.value }))} required /></Field>
              <Field label="Client"><select value={draft.clientId} onChange={event => setDraft(prev => ({ ...prev, clientId: event.target.value }))}>{state.clients.map(client => <option key={client.id} value={client.id}>{client.name}</option>)}</select></Field>
              <Field label="Department"><input value={draft.department} onChange={event => setDraft(prev => ({ ...prev, department: event.target.value }))} /></Field>
              <Field label="Due date"><input value={draft.dueDate} onChange={event => setDraft(prev => ({ ...prev, dueDate: event.target.value }))} type="date" /></Field>
              <Field label="Budget"><input value={draft.budget} onChange={event => setDraft(prev => ({ ...prev, budget: event.target.value }))} type="number" min="0" /></Field>
              <label className="pm-field pm-wide"><span>Description</span><textarea value={draft.description} onChange={event => setDraft(prev => ({ ...prev, description: event.target.value }))} rows={3} /></label>
              <div className="pm-form-actions pm-create-actions"><button type="button" className="pm-control" onClick={() => setShowCreate(false)}>Cancel</button><button type="submit" className="pm-primary"><Plus size={15} /> Create Project</button></div>
            </form>
          </aside>
          </div>
        )}

        {store.selectedProject ? (
          <ProjectDetails state={state} project={store.selectedProject} active={store.detailTab} onTab={store.setDetailTab} onClose={() => store.setSelectedProjectId(null)} onAddTask={store.addTask} onDrag={setDraggedTask} onDrop={onDropTask} />
        ) : (
          <>
            {store.activeTab === 'Overview' && <Overview state={filteredState} projects={filteredProjects} budget={budget} onOpen={store.setSelectedProjectId} onAction={setActionModal} onNewProject={() => setShowCreate(true)} />}
            {store.activeTab === 'Projects' && <ProjectsTab state={state} projects={filteredProjects} filters={filters} departments={departments} onFilters={setFilters} onOpen={store.setSelectedProjectId} />}
            {store.activeTab === 'Tasks' && <TasksTab state={filteredState} />}
            {store.activeTab === 'Kanban' && <Kanban state={filteredState} onDrag={setDraggedTask} onDrop={onDropTask} />}
            {store.activeTab === 'Timeline' && <Timeline state={filteredState} />}
            {store.activeTab === 'Resources' && <Resources state={filteredState} />}
            {store.activeTab === 'Time Logs' && <TimeLogs state={filteredState} />}
            {store.activeTab === 'Budget' && <BudgetTab state={filteredState} budget={budget} />}
            {store.activeTab === 'Documents' && <Documents state={filteredState} />}
          </>
        )}
      </div>

      {actionModal && (
        <div className="pm-modal-backdrop" role="dialog" aria-modal="true">
          <div className="pm-card pm-modal">
            <div className="pm-section-header"><h2>{actionModal === 'task' ? 'Assign Task' : actionModal === 'time' ? 'Log Time' : 'Upload Document'}</h2><button type="button" onClick={() => setActionModal(null)}>Close</button></div>
            {actionModal === 'task' && (
              <form className="pm-form pm-modal-form" onSubmit={submitTask}>
                <Field label="Project"><select value={taskDraft.projectId} onChange={event => setTaskDraft(prev => ({ ...prev, projectId: event.target.value }))}>{state.projects.map(project => <option key={project.id} value={project.id}>{project.name}</option>)}</select></Field>
                <Field label="Assignee"><select value={taskDraft.assigneeId} onChange={event => setTaskDraft(prev => ({ ...prev, assigneeId: event.target.value }))}>{state.members.map(member => <option key={member.id} value={member.id}>{member.name}</option>)}</select></Field>
                <Field label="Priority"><select value={taskDraft.priority} onChange={event => setTaskDraft(prev => ({ ...prev, priority: event.target.value as TaskPriority }))}>{priorityOptions.filter(option => option !== 'All').map(option => <option key={option} value={option}>{option}</option>)}</select></Field>
                <Field label="Due date"><input type="date" value={taskDraft.dueDate} onChange={event => setTaskDraft(prev => ({ ...prev, dueDate: event.target.value }))} /></Field>
                <Field label="Task title"><input value={taskDraft.title} onChange={event => setTaskDraft(prev => ({ ...prev, title: event.target.value }))} required /></Field>
                <label className="pm-field pm-wide"><span>Description</span><textarea value={taskDraft.description} onChange={event => setTaskDraft(prev => ({ ...prev, description: event.target.value }))} rows={3} /></label>
                <div className="pm-form-actions"><button type="submit" className="pm-primary">Assign Task</button></div>
              </form>
            )}
            {actionModal === 'time' && (
              <form className="pm-form pm-modal-form" onSubmit={submitTime}>
                <Field label="Project"><select value={timeDraft.projectId} onChange={event => setTimeDraft(prev => ({ ...prev, projectId: event.target.value }))}>{state.projects.map(project => <option key={project.id} value={project.id}>{project.name}</option>)}</select></Field>
                <Field label="Task"><select value={timeDraft.taskId} onChange={event => setTimeDraft(prev => ({ ...prev, taskId: event.target.value }))}>{state.tasks.map(task => <option key={task.id} value={task.id}>{task.title}</option>)}</select></Field>
                <Field label="Employee"><select value={timeDraft.employeeId} onChange={event => setTimeDraft(prev => ({ ...prev, employeeId: event.target.value }))}>{state.members.map(member => <option key={member.id} value={member.id}>{member.name}</option>)}</select></Field>
                <Field label="Hours"><input type="number" min="0" step="0.25" value={timeDraft.hours} onChange={event => setTimeDraft(prev => ({ ...prev, hours: event.target.value }))} /></Field>
                <Field label="Date"><input type="date" value={timeDraft.date} onChange={event => setTimeDraft(prev => ({ ...prev, date: event.target.value }))} /></Field>
                <label className="pm-check"><input type="checkbox" checked={timeDraft.billable} onChange={event => setTimeDraft(prev => ({ ...prev, billable: event.target.checked }))} /> Billable</label>
                <div className="pm-form-actions"><button type="submit" className="pm-primary">Log Time</button></div>
              </form>
            )}
            {actionModal === 'document' && (
              <form className="pm-form pm-modal-form" onSubmit={submitDocument}>
                <Field label="Project"><select value={documentDraft.projectId} onChange={event => setDocumentDraft(prev => ({ ...prev, projectId: event.target.value }))}>{state.projects.map(project => <option key={project.id} value={project.id}>{project.name}</option>)}</select></Field>
                <Field label="Document name"><input value={documentDraft.name} onChange={event => setDocumentDraft(prev => ({ ...prev, name: event.target.value }))} required /></Field>
                <Field label="Type"><select value={documentDraft.type} onChange={event => setDocumentDraft(prev => ({ ...prev, type: event.target.value as DocumentType }))}>{documentTypes.map(type => <option key={type} value={type}>{type}</option>)}</select></Field>
                <Field label="Folder"><input value={documentDraft.folder} onChange={event => setDocumentDraft(prev => ({ ...prev, folder: event.target.value }))} /></Field>
                <Field label="Size"><input value={documentDraft.size} onChange={event => setDocumentDraft(prev => ({ ...prev, size: event.target.value }))} /></Field>
                <div className="pm-form-actions"><button type="submit" className="pm-primary">Upload Document</button></div>
              </form>
            )}
          </div>
        </div>
      )}
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

function Overview({ state, projects, budget, onOpen, onAction, onNewProject }: { state: ProjectManagementState; projects: ProjectRecord[]; budget: ReturnType<typeof budgetSummary>; onOpen: (id: string) => void; onAction: (action: 'task' | 'time' | 'document') => void; onNewProject: () => void }) {
  const segments = progressSegments(state)
  const trend = monthlyStatusTrend(state)
  return (
    <section className="pm-overview-grid pm-dashboard-overview">
      <div className="pm-card pm-progress-card"><SectionTitle title="Project Progress Overview" /><Donut data={segments} center={String(state.projects.length)} sub="Total Projects" /></div>
      <div className="pm-card pm-trend"><SectionTitle title="Projects by Status" action="By Month" /><LineChart data={trend} /></div>
      <div className="pm-card pm-milestones"><SectionTitle title="Upcoming Milestones" action="View All" /><MilestoneList state={state} /></div>
      <div className="pm-card pm-recent"><SectionTitle title="Recent Projects" action="View All" /><ProjectTable state={state} projects={projects.slice(0, 5)} onOpen={onOpen} /></div>
      <div className="pm-card pm-budget-card"><SectionTitle title="Project Budget Summary" action="View Report" /><BudgetSummary budget={budget} /></div>
      <div className="pm-card pm-quick-card"><SectionTitle title="Quick Actions" /><QuickActions onNewProject={onNewProject} onAction={onAction} /></div>
    </section>
  )
}

function ProjectsTab({ state, projects, filters, departments, onFilters, onOpen }: { state: ProjectManagementState; projects: ProjectRecord[]; filters: { query: string; status: string; priority: string; assignee: string; department: string; dateFrom: string; dateTo: string }; departments: string[]; onFilters: React.Dispatch<React.SetStateAction<{ query: string; status: string; priority: string; assignee: string; department: string; dateFrom: string; dateTo: string }>>; onOpen: (id: string) => void }) {
  return <section className="pm-card"><div className="pm-filter-row"><Select value={filters.status} options={statusOptions} onChange={value => onFilters(prev => ({ ...prev, status: value }))} /><Select value={filters.priority} options={priorityOptions} onChange={value => onFilters(prev => ({ ...prev, priority: value }))} /><Select value={filters.assignee} options={['All', ...state.members.map(m => m.id)]} labels={Object.fromEntries(state.members.map(m => [m.id, m.name]))} onChange={value => onFilters(prev => ({ ...prev, assignee: value }))} /><Select value={filters.department} options={departments} onChange={value => onFilters(prev => ({ ...prev, department: value }))} /></div><ProjectTable state={state} projects={projects} onOpen={onOpen} /></section>
}

function Select({ value, options, labels = {}, onChange }: { value: string; options: string[]; labels?: Record<string, string>; onChange: (value: string) => void }) {
  return <select className="pm-select" value={value} onChange={event => onChange(event.target.value)}>{options.map(option => <option key={option} value={option}>{labels[option] || option}</option>)}</select>
}

function ProjectTable({ state, projects, onOpen }: { state: ProjectManagementState; projects: ProjectRecord[]; onOpen: (id: string) => void }) {
  if (!projects.length) return <EmptyState title="No projects found" body="Create a project or adjust filters to see project records." />
  return <>
    <div className="pm-table-wrap"><table className="pm-table"><thead><tr>{['Project Name', 'Client', 'Project Manager', 'Status', 'Progress', 'Budget', 'Due Date', 'Actions'].map(head => <th key={head}>{head}</th>)}</tr></thead><tbody>{projects.map(project => { const client = state.clients.find(c => c.id === project.clientId); const manager = state.members.find(m => m.id === project.managerId); return <tr key={project.id}><td><strong>{project.name}</strong><small>{project.tags.join(', ') || project.department}</small></td><td>{client?.name || project.clientId}</td><td><Avatar member={manager} /> {manager?.name || '-'}</td><td><Pill value={project.status} /></td><td><Progress value={project.progress} /></td><td>{formatMoney(project.budget)}</td><td>{formatDate(project.dueDate)}</td><td><button type="button" className="pm-icon-btn" onClick={() => onOpen(project.id)} aria-label={`Open ${project.name}`}><MoreHorizontal size={16} /></button></td></tr> })}</tbody></table></div>
    <div className="pm-mobile-projects">{projects.map(project => { const client = state.clients.find(c => c.id === project.clientId); return <article key={project.id} className="pm-mobile-project-card"><div><strong>{project.name}</strong><button type="button" className="pm-icon-btn" onClick={() => onOpen(project.id)} aria-label={`Open ${project.name}`}><MoreHorizontal size={16} /></button></div><small>{client?.name || project.clientId}</small><Pill value={project.status} /><span>{formatMoney(project.budget)} · Due {formatDate(project.dueDate)}</span><Progress value={project.progress} /></article> })}</div>
  </>
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
function QuickActions({ onNewProject, onAction }: { onNewProject: () => void; onAction: (action: 'task' | 'time' | 'document') => void }) {
  const actions: Array<{ label: string; icon: LucideIcon; onClick: () => void }> = [
    { label: 'New Project', icon: Plus, onClick: onNewProject },
    { label: 'Assign Task', icon: ListChecks, onClick: () => onAction('task') },
    { label: 'Log Time', icon: Timer, onClick: () => onAction('time') },
    { label: 'Upload Document', icon: FileText, onClick: () => onAction('document') },
  ]
  return <div className="pm-actions">{actions.map(({ label, icon: Icon, onClick }) => <button key={label} type="button" onClick={onClick}><span><Icon size={16} /></span>{label}<ChevronDown size={15} /></button>)}</div>
}
function BarList({ items }: { items: Array<{ label: string; value: number; max: number }> }) { return <div className="pm-bar-list">{items.map(item => <p key={item.label}><span>{item.label}</span><strong>{formatMoney(item.value)}</strong><Progress value={item.max ? (item.value / item.max) * 100 : 0} /></p>)}</div> }
function EmptyState({ title, body }: { title: string; body: string }) {
  return <div className="pm-empty"><strong>{title}</strong><p>{body}</p></div>
}

const projectManagementCss = `
.pm-shell { display: grid; gap: 22px; color: #0f172a; font-family: var(--font-space-grotesk), "Space Grotesk", sans-serif; }
.pm-shell, .pm-workspace { max-width: 100%; overflow-x: clip; }
.pm-workspace { min-width: 0; display: grid; gap: 22px; }
.pm-header { display: grid; grid-template-columns: minmax(220px, 1fr) auto; gap: 16px; align-items: start; }
.pm-title-block h1 { margin: 0; font-size: 30px; line-height: 1.08; font-weight: 900; letter-spacing: 0; }
.pm-title-block p { margin: 7px 0 0; color: #475569; font-size: 14px; font-weight: 500; }
.pm-header-actions { display: flex; gap: 12px; justify-content: flex-end; flex-wrap: wrap; }
.pm-control, .pm-primary, .pm-select, .pm-search { min-height: 38px; border: 1px solid #dbe3ef; border-radius: 8px; background: #fff; color: #091133; display: inline-flex; align-items: center; gap: 8px; padding: 0 14px; font-size: 13px; font-weight: 800; max-width: 100%; }
.pm-primary { background: #16a34a; border-color: #16a34a; color: #fff; cursor: pointer; }
.pm-search input { border: 0; outline: 0; min-width: min(220px, 42vw); font: inherit; max-width: 100%; }
.pm-card { background: #fff; border: 1px solid #e6edf6; border-radius: 10px; box-shadow: 0 12px 28px rgba(15, 23, 42, .04); padding: 20px; min-width: 0; }
.pm-kpis { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(210px, 100%), 1fr)); gap: 18px; margin-bottom: 0; }
.pm-kpi { display: flex; align-items: center; gap: 18px; min-height: 112px; }
.pm-kpi > span { width: 56px; height: 56px; border-radius: 12px; display: grid; place-items: center; flex: 0 0 auto; }
.pm-kpi small, .pm-card small { color: #475569; font-size: 13px; font-weight: 750; }
.pm-kpi strong { display: block; font-size: 24px; margin-top: 6px; }
.pm-kpi em { display: block; color: #16a34a; font-style: normal; font-size: 12px; font-weight: 750; margin-top: 8px; }
.pm-kpi em.negative { color: #ef4444; }
.pm-tabs { display: flex; gap: 28px; border-bottom: 1px solid #dfe7f2; overflow-x: auto; margin-bottom: 20px; }
.pm-tabs button { border: 0; border-bottom: 2px solid transparent; min-height: 40px; background: transparent; color: #334155; font-size: 13px; font-weight: 750; cursor: pointer; white-space: nowrap; }
.pm-tabs button.active { font-weight: 900; }
.pm-tabs button.active { color: #16a34a; border-bottom-color: #16a34a; }
.pm-overview-grid { display: grid; gap: 18px; align-items: start; }
.pm-dashboard-overview {
  grid-template-columns: minmax(0, 1.05fr) minmax(0, 1.2fr) minmax(280px, .9fr);
  grid-template-areas:
    "progress trend milestones"
    "recent recent budget"
    "recent recent quick";
}
.pm-progress-card { grid-area: progress; }
.pm-trend { grid-area: trend; }
.pm-milestones { grid-area: milestones; }
.pm-recent { grid-area: recent; }
.pm-budget-card { grid-area: budget; }
.pm-quick-card { grid-area: quick; }
.pm-section-header { display: flex; justify-content: space-between; align-items: center; gap: 12px; margin-bottom: 16px; }
.pm-section-header h2 { margin: 0; font-size: 15px; font-weight: 900; }
.pm-section-header button { border: 0; background: transparent; color: #2563eb; font-weight: 900; cursor: pointer; }
.pm-donut-wrap { display: grid; grid-template-columns: minmax(160px, 220px) minmax(0, 1fr); align-items: center; gap: 20px; }
.pm-donut { width: 200px; height: 200px; border-radius: 50%; display: grid; place-items: center; }
.pm-donut span { width: 112px; height: 112px; border-radius: 50%; background: #fff; display: grid; place-items: center; text-align: center; align-content: center; }
.pm-donut strong { font-size: 24px; }
.pm-legend, .pm-list, .pm-actions, .pm-task-list, .pm-bar-list { display: grid; gap: 12px; }
.pm-legend p { display: grid; grid-template-columns: 10px 1fr auto; gap: 10px; align-items: center; margin: 0; font-size: 13px; }
.pm-legend i { width: 10px; height: 10px; border-radius: 999px; }
.pm-line { min-height: 260px; display: grid; grid-template-rows: 1fr auto; }
.pm-line svg { width: 100%; height: clamp(180px, 24vw, 250px); }
.pm-line div { display: flex; justify-content: space-between; color: #23335f; font-size: 12px; font-weight: 800; }
.pm-list article { display: grid; grid-template-columns: 34px 1fr auto auto; gap: 10px; align-items: center; }
.pm-list svg { width: 34px; height: 34px; padding: 8px; border-radius: 9px; background: #e6fffb; color: #0891b2; }
.pm-table-wrap { overflow-x: auto; }
.pm-mobile-projects { display: none; }
.pm-table { width: 100%; min-width: 820px; border-collapse: collapse; }
.pm-table th { text-align: left; padding: 13px 14px; background: #f8fafc; color: #475569; font-size: 11px; font-weight: 900; }
.pm-table td { padding: 13px 14px; border-top: 1px solid #edf2f8; font-size: 12px; vertical-align: middle; }
.pm-avatar { width: 28px; height: 28px; border-radius: 999px; color: #fff; display: inline-grid; place-items: center; font-size: 11px; font-weight: 900; vertical-align: middle; margin-right: 6px; }
.pm-pill { display: inline-flex; min-height: 24px; border-radius: 7px; background: #eef2ff; color: #4f46e5; padding: 0 8px; align-items: center; font-size: 11px; font-weight: 900; white-space: nowrap; }
.tone-completed, .tone-done, .tone-approved, .tone-good { background: #dcfce7; color: #15803d; }
.tone-in-progress, .tone-active, .tone-review { background: #dbeafe; color: #2563eb; }
.tone-on-hold, .tone-medium, .tone-pending { background: #ffedd5; color: #ea580c; }
.tone-critical, .tone-high, .tone-blocked, .tone-delayed, .tone-at-risk { background: #fee2e2; color: #dc2626; }
.pm-progress { display: block; width: 112px; height: 8px; border-radius: 999px; background: #e9edf4; overflow: hidden; }
.pm-progress i { display: block; height: 100%; border-radius: inherit; background: #2f80ed; }
.pm-icon-btn { width: 34px; height: 34px; border: 1px solid #dbe3ef; border-radius: 8px; background: #fff; display: grid; place-items: center; cursor: pointer; }
.pm-filter-row { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 10px; margin-bottom: 16px; }
.pm-kanban { display: grid; grid-template-columns: repeat(4, minmax(240px, 1fr)); gap: 16px; overflow-x: auto; }
.pm-kanban-col { display: grid; align-content: start; gap: 12px; }
.pm-task-card { border: 1px solid #e6edf6; border-radius: 14px; padding: 14px; display: grid; gap: 10px; background: #fff; cursor: grab; }
.pm-task-card p { margin: 0; color: #23335f; font-size: 13px; line-height: 1.45; }
.pm-chip-row { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
.pm-chip-row span:not(.pm-pill) { display: inline-flex; align-items: center; gap: 4px; color: #64748b; font-size: 12px; }
.pm-task-card footer { display: grid; grid-template-columns: auto 1fr auto; align-items: center; gap: 8px; }
.pm-timeline { display: grid; gap: 14px; min-width: 0; overflow-x: auto; }
.pm-timeline div { min-width: 720px; display: grid; grid-template-columns: 180px 1fr; align-items: center; }
.pm-timeline strong { display: block; height: 28px; border-radius: 999px; background: linear-gradient(90deg, #16a34a, #2f80ed); color: #fff; padding: 6px 10px; font-size: 12px; }
.pm-resource-grid, .pm-doc-grid, .pm-budget-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 16px; }
.pm-resource-grid article, .pm-doc-grid article { border: 1px solid #e6edf6; border-radius: 14px; padding: 16px; display: grid; gap: 8px; }
.pm-budget-summary { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 14px; }
.pm-budget-summary span { min-width: 0; overflow-wrap: anywhere; }
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
.pm-filter-panel { display: grid; grid-template-columns: repeat(6, minmax(0, 1fr)); gap: 14px; align-items: end; }
.pm-filter-panel .pm-field, .pm-filter-panel .pm-form-actions { min-width: 0; }
.pm-filter-panel .pm-form-actions { grid-column: auto; align-self: end; }
.pm-filter-panel .pm-form-actions .pm-control { width: 100%; justify-content: center; }
.pm-modal-backdrop { position: fixed; inset: 0; z-index: 120; background: rgba(15, 23, 42, .38); display: grid; place-items: center; padding: 20px; }
.pm-modal { width: min(760px, 100%); max-height: min(760px, calc(100dvh - 40px)); overflow: auto; }
.pm-modal-form { grid-template-columns: repeat(2, minmax(0, 1fr)); }
.pm-drawer-backdrop { position: fixed; inset: 0; z-index: 115; background: rgba(15, 23, 42, .36); display: flex; justify-content: flex-end; }
.pm-create { width: min(520px, 100%); height: 100dvh; border-radius: 0; border-top: 0; border-right: 0; border-bottom: 0; padding: 0; overflow: hidden; display: flex; flex-direction: column; }
.pm-create .pm-section-header { margin: 0; padding: 24px 28px; border-bottom: 1px solid #e6edf6; }
.pm-create .pm-section-header h2 { font-size: 22px; }
.pm-drawer-close { width: 36px; height: 36px; border: 1px solid #dbe3ef; border-radius: 10px; background: #fff; color: #0f172a; font-size: 22px; line-height: 1; display: grid; place-items: center; cursor: pointer; }
.pm-create-form { grid-template-columns: 1fr; gap: 16px; padding: 24px 28px; overflow: auto; align-content: start; }
.pm-create .pm-wide { grid-column: auto; }
.pm-create-actions { position: sticky; bottom: 0; display: grid; grid-template-columns: 1fr 1fr; gap: 12px; background: #fff; padding-top: 16px; }
.pm-create-actions .pm-control, .pm-create-actions .pm-primary { width: 100%; justify-content: center; }
.pm-check { min-height: 42px; display: flex; align-items: center; gap: 8px; font-weight: 900; color: #23335f; }
.pm-empty { min-height: 160px; border: 1px dashed #dbe3ef; border-radius: 14px; display: grid; place-items: center; text-align: center; align-content: center; gap: 8px; color: #64748b; padding: 20px; }
.pm-empty strong { color: #0f172a; }
.pm-empty p { margin: 0; max-width: 360px; }
.pm-detail { display: grid; gap: 18px; }
.pm-detail-head { display: grid; grid-template-columns: auto 1fr auto; align-items: center; gap: 16px; }
.pm-detail-head h2 { margin: 0; }
.pm-detail-head p { margin: 5px 0 0; color: #23335f; }
.pm-detail-head > button:first-child { border: 1px solid #dbe3ef; border-radius: 8px; background: #fff; min-height: 38px; padding: 0 12px; font-weight: 900; cursor: pointer; }
@media (max-width: 1280px) {
  .pm-dashboard-overview {
    grid-template-columns: minmax(0, 1fr) minmax(300px, .42fr);
    grid-template-areas:
      "progress milestones"
      "trend milestones"
      "recent budget"
      "recent quick";
  }
  .pm-resource-grid, .pm-doc-grid, .pm-budget-grid { grid-template-columns: 1fr 1fr; }
  .pm-kpis { grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 14px; }
  .pm-kpi { gap: 12px; padding: 16px; }
  .pm-kpi > span { width: 48px; height: 48px; }
  .pm-kpi strong { font-size: 24px; }
  .pm-header { grid-template-columns: minmax(300px, .8fr) minmax(520px, 1.2fr); align-items: start; }
  .pm-header-actions { display: grid; grid-template-columns: minmax(190px, auto) minmax(260px, 1fr) 44px minmax(120px, auto); justify-content: end; }
  .pm-new-project-button { grid-column: 4; justify-self: stretch; }
}
@media (max-width: 1080px) {
  .pm-header { grid-template-columns: 1fr; }
  .pm-header-actions { grid-template-columns: minmax(180px, auto) minmax(260px, 1fr) 44px minmax(120px, auto) minmax(150px, auto); justify-content: start; }
  .pm-new-project-button { grid-column: auto; }
}
@media (max-width: 760px) {
  .pm-shell { gap: 16px; padding-bottom: calc(84px + env(safe-area-inset-bottom)); }
  .pm-workspace { gap: 16px; }
  .pm-header { gap: 10px; }
  .pm-title-block h1 { font-size: clamp(24px, 7vw, 28px); letter-spacing: 0; }
  .pm-title-block p { margin-top: 6px; font-size: 13.5px; line-height: 1.45; }
  .pm-header-actions { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; align-items: stretch; }
  .pm-control, .pm-primary, .pm-search { width: 100%; min-width: 0; min-height: 44px; justify-content: center; border-radius: 10px; padding: 0 12px; font-size: 12.5px; }
  .pm-header-search { order: 1; grid-column: 1 / -1; justify-content: flex-start; background: #fff; }
  .pm-header-search input { min-width: 0; width: 100%; }
  .pm-date-control { order: 2; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
  .pm-filter-control { order: 3; }
  .pm-bell-control { display: none; }
  .pm-filter-backdrop {
    position: fixed;
    inset: 0;
    z-index: 850;
    background: rgba(15, 23, 42, .34);
  }
  .pm-new-project-button {
    position: fixed;
    right: 16px;
    bottom: calc(16px + env(safe-area-inset-bottom));
    z-index: 85;
    width: auto;
    min-width: 156px;
    min-height: 52px;
    border-radius: 999px;
    box-shadow: 0 18px 36px rgba(22, 163, 74, .32);
  }
  .pm-kpis {
    display: flex;
    gap: 12px;
    overflow-x: auto;
    scroll-snap-type: x mandatory;
    margin-left: -16px;
    margin-right: -16px;
    padding: 0 16px 8px;
    scroll-padding-left: 16px;
    scrollbar-width: none;
  }
  .pm-kpis::-webkit-scrollbar, .pm-tabs::-webkit-scrollbar { display: none; }
  .pm-kpi { min-width: min(280px, 82vw); min-height: 124px; scroll-snap-align: start; border-radius: 16px; }
  .pm-card { border-radius: 16px; padding: 16px; box-shadow: 0 8px 22px rgba(9, 17, 51, .055); }
  .pm-filter-row { grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 8px; }
  .pm-filter-row .pm-select { min-height: 44px; padding: 0 8px; font-size: 12px; border-radius: 10px; }
  .pm-resource-grid, .pm-doc-grid, .pm-budget-grid, .pm-form, .pm-modal-form { grid-template-columns: 1fr; }
  .pm-tabs {
    gap: 22px;
    margin-left: -16px;
    margin-right: -16px;
    padding-left: 16px;
    padding-right: 16px;
    border-bottom: 0;
    scrollbar-width: none;
  }
  .pm-tabs button {
    min-height: 40px;
    border: 0;
    border-bottom: 2px solid transparent;
    border-radius: 0;
    padding: 0;
    font-size: 13px;
  }
  .pm-tabs button.active { background: transparent; color: #111827; border-bottom-color: #111827; }
  .pm-filter-panel {
    position: fixed;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 860;
    grid-template-columns: 1fr;
    max-height: min(82dvh, calc(100dvh - 88px));
    overflow: auto;
    border-radius: 20px 20px 0 0;
    padding: 18px;
    box-shadow: 0 -18px 60px rgba(15, 23, 42, .24);
  }
  .pm-dashboard-overview {
    grid-template-columns: 1fr;
    grid-template-areas:
      "progress"
      "trend"
      "milestones"
      "recent"
      "budget"
      "quick";
  }
  .pm-drawer-backdrop { align-items: end; }
  .pm-create { width: 100%; height: auto; max-height: 88dvh; border-radius: 20px 20px 0 0; }
  .pm-create .pm-section-header { padding: 18px; }
  .pm-create-form { padding: 18px; }
  .pm-create-actions { grid-template-columns: 1fr; }
  .pm-donut-wrap, .pm-budget-summary, .pm-detail-head { grid-template-columns: 1fr; }
  .pm-donut { width: 180px; height: 180px; margin: auto; }
  .pm-list article { grid-template-columns: 34px 1fr; align-items: start; }
  .pm-list em, .pm-list .pm-pill { grid-column: 2; }
  .pm-wide { grid-column: auto; }
  .pm-table-wrap { display: none; }
  .pm-mobile-projects { display: grid; gap: 12px; }
  .pm-mobile-project-card {
    border: 1px solid #e3ebf5;
    border-radius: 16px;
    padding: 16px;
    display: grid;
    gap: 10px;
    background: #fff;
    box-shadow: 0 10px 24px rgba(9, 17, 51, .07);
  }
  .pm-mobile-project-card > div { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
  .pm-mobile-project-card strong { overflow-wrap: anywhere; font-size: 15px; }
  .pm-mobile-project-card small { font-size: 12.5px; }
  .pm-mobile-project-card span:not(.pm-pill):not(.pm-progress) { color: #64748b; font-size: 12px; font-weight: 800; }
  .pm-mobile-project-card .pm-progress { width: 100%; }
  .pm-kanban { grid-template-columns: repeat(4, minmax(78vw, 1fr)); margin-right: -16px; }
  .pm-task-card footer { grid-template-columns: auto 1fr; }
  .pm-task-card footer .pm-progress { grid-column: 1 / -1; width: 100%; }
  .pm-timeline div { min-width: 620px; }
  .pm-modal-backdrop { align-items: end; padding: 0; }
  .pm-modal { width: 100%; max-height: 92dvh; border-radius: 18px 18px 0 0; }
}
@media (max-width: 390px) {
  .pm-new-project-button { left: 16px; right: 16px; width: auto; }
  .pm-kpi { min-width: calc(100vw - 56px); }
  .pm-create { max-height: 92dvh; }
}
`
