'use client'

import { CSSProperties, ChangeEvent, DragEvent, FormEvent, KeyboardEvent, MouseEvent, ReactNode, useEffect, useMemo, useRef, useState } from 'react'
import {
  Archive,
  ArrowUpDown,
  BriefcaseBusiness,
  CalendarDays,
  Camera,
  CheckCircle2,
  CheckSquare,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Copy,
  Download,
  Eye,
  FileCheck2,
  FileText,
  Home,
  LayoutGrid,
  List,
  ListChecks,
  Mail,
  MapPin,
  MessageSquare,
  MoreHorizontal,
  Paperclip,
  Pencil,
  Phone,
  Plus,
  Printer,
  Repeat2,
  RotateCcw,
  Search,
  Star,
  Trash2,
  UploadCloud,
  WalletCards,
  X,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { budgetSummary, formatDate, formatMoney, initials, monthlyStatusTrend, workloadByMember } from '@/lib/project-management/metrics'
import type { MilestoneStatus, ProjectHealth, ProjectManagementState, ProjectMilestone, ProjectRecord, ProjectStatus, ProjectTask, TaskPriority, TaskStatus } from '@/lib/project-management/types'
import type { MilestoneDraft, MilestoneUpdateDraft, ProjectSalesOpportunity, ProjectUpdateDraft } from '@/lib/project-management/service'
import { loadProjectThumbnailAsset } from '@/lib/project-management/service'
import { uploadFileObject } from '@/lib/uploads/client'

type ProjectDirectoryTab = 'Projects' | 'Archived'
type ProjectDirectoryView = 'list' | 'grid'
type ProjectSort = { key: 'name' | 'budget'; direction: 'asc' | 'desc' }
type ProjectDirectoryStatus = 'PENDING' | 'ONGOING' | 'COMPLETED' | 'WITH ISSUE'
export const detailTabs = ['Overview', 'Tasks', 'Kanban', 'Files', 'Team', 'Budget', 'Schedule', 'Reports', 'Settings']
const projectStatusOptions: ProjectStatus[] = ['Planning', 'Active', 'In Progress', 'On Hold', 'Completed', 'Cancelled']
const projectDirectoryStatusOptions: ProjectDirectoryStatus[] = ['PENDING', 'ONGOING', 'COMPLETED', 'WITH ISSUE']
const healthOptions: ProjectHealth[] = ['Good', 'At Risk', 'Delayed']
const milestoneStatusOptions: MilestoneStatus[] = ['Pending', 'In Progress', 'Done', 'Delayed']
const phaseOptions = ['Planning', 'Design', 'Procurement', 'Execution', 'Inspection', 'Handover', 'Closeout']
const priorityOptions = ['All', 'Low', 'Medium', 'High', 'Critical']
const projectDepartmentOptions = ['Delivery', 'Operations', 'Construction', 'Engineering', 'Design', 'Procurement', 'Finance', 'HR', 'Administration']
const projectTypeOptions = ['Residential Construction', 'Commercial Construction', 'Industrial Construction', 'Infrastructure Construction', 'Educational Construction', 'Hospitality Construction']
const contractTypeOptions = ['Lump Sum', 'Time and Materials', 'Cost Plus', 'Unit Price', 'Design Build', 'Guaranteed Maximum Price']
const provinceOptions = ['Metro Manila', 'Cavite', 'Laguna', 'Rizal', 'Bulacan', 'Batangas', 'Cebu', 'Davao del Sur']
const colors = {
  green: '#16a34a',
  blue: '#2f80ed',
  orange: '#f59e0b',
  purple: '#8b5cf6',
  red: '#ef4444',
  slate: '#64748b',
}

const projectStatusBudgetGroups: Array<{ label: string; statuses: ProjectStatus[]; color: string }> = [
  { label: 'Completed', statuses: ['Completed'], color: colors.green },
  { label: 'Active / In Progress', statuses: ['Active', 'In Progress'], color: colors.blue },
  { label: 'On Hold', statuses: ['On Hold'], color: colors.orange },
  { label: 'Planning', statuses: ['Planning'], color: colors.purple },
  { label: 'Cancelled', statuses: ['Cancelled'], color: '#000000' },
]

function fieldId(name: string) {
  return `pm-${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`
}

const commentUrlPattern = /(https?:\/\/[^\s]+)/g

function LinkedCommentText({ text }: { text: string }) {
  return (
    <>
      {text.split(commentUrlPattern).map((part, index) => {
        if (!part) return null
        if (!/^https?:\/\/[^\s]+$/.test(part)) return <span key={`${part}-${index}`}>{part}</span>
        const match = part.match(/^(.*?)([.,!?;:)]*)$/)
        const href = match?.[1] || part
        const suffix = match?.[2] || ''
        return (
          <span key={`${part}-${index}`}>
            <a href={href} target="_blank" rel="noreferrer">{href}</a>
            {suffix}
          </span>
        )
      })}
    </>
  )
}

function opportunityKey(source?: ProjectSalesOpportunity['source'], id?: string) {
  return source && id ? `${source}:${id}` : ''
}

function parseOpportunityKey(value: string): Pick<ProjectRecord, 'opportunityId' | 'opportunitySource'> {
  const [source, ...rest] = value.split(':')
  const id = rest.join(':')
  if ((source === 'sales' || source === 'legacy') && id) return { opportunitySource: source, opportunityId: id }
  return { opportunityId: undefined, opportunitySource: undefined }
}

function findOpportunityByKey(opportunities: ProjectSalesOpportunity[], key: string) {
  return opportunities.find(opportunity => opportunityKey(opportunity.source, opportunity.id) === key)
}

function opportunityLabel(opportunity: ProjectSalesOpportunity) {
  return `${opportunity.label} - ${opportunity.clientName} - ${formatMoney(opportunity.value)}`
}

function resolveOpportunityClientId(opportunity: ProjectSalesOpportunity, clients: ProjectManagementState['clients']) {
  if (opportunity.clientId && clients.some(client => client.id === opportunity.clientId)) return opportunity.clientId
  const clientName = opportunity.clientName.trim().toLowerCase()
  return clients.find(client => client.name.trim().toLowerCase() === clientName)?.id || ''
}

function normalizedLookupKey(value: string) {
  return value.trim().toLowerCase()
}

function resolveProjectClient(project: ProjectRecord, clients: ProjectManagementState['clients']) {
  const projectClientId = normalizedLookupKey(project.clientId)
  if (!projectClientId || projectClientId === 'client-local') return undefined
  return clients.find(client => (
    normalizedLookupKey(client.id) === projectClientId ||
    normalizedLookupKey(client.name) === projectClientId
  ))
}

function projectClientName(project: ProjectRecord, clients: ProjectManagementState['clients'], fallback = 'Unassigned') {
  return resolveProjectClient(project, clients)?.name || fallback
}

function formatCurrency(value: number, currency = 'PHP') {
  const safeCurrency = currency || 'PHP'
  const locale = safeCurrency === 'PHP' ? 'en-PH' : 'en-US'
  try {
    return new Intl.NumberFormat(locale, { style: 'currency', currency: safeCurrency, maximumFractionDigits: 0 }).format(value || 0)
  } catch {
    return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', maximumFractionDigits: 0 }).format(value || 0)
  }
}

function formatRelativeTime(value: string | undefined, nowMs: number) {
  if (!value) return '-'
  const time = new Date(value.includes('T') ? value : `${value}T00:00:00`).getTime()
  if (!Number.isFinite(time)) return '-'
  const seconds = Math.max(0, Math.floor((nowMs - time) / 1000))
  if (seconds < 60) return 'now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}d ago`
  const months = Math.floor(days / 30)
  if (months < 12) return `${months}mo ago`
  return `${Math.floor(months / 12)}y ago`
}

function formatTaskCardDate(value: string) {
  if (!value) return '-'
  const date = new Date(value.includes('T') ? value : `${value}T00:00:00`)
  return Number.isNaN(date.getTime()) ? '-' : date.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: '2-digit' })
}

function taskCardAssigneeLabel(value?: string) {
  const label = value?.trim() || 'Unassigned'
  if (!label.includes('@')) return label
  const [local] = label.split('@')
  return `${(local || label).slice(0, 12)}...`
}

function isProjectThumbnailFile(file: File) {
  if (!file.type.startsWith('image/')) return false
  if (file.type === 'image/svg+xml') return false
  return file.size <= 6 * 1024 * 1024
}

async function prepareProjectThumbnail(file: File) {
  if (!isProjectThumbnailFile(file)) return { dataUrl: '', assetId: '', name: file.name }
  try {
    const uploaded = await uploadFileObject(file, 'project-thumbnails')
    return { dataUrl: uploaded.url, assetId: '', name: uploaded.name }
  } catch {
    return { dataUrl: '', assetId: '', name: file.name }
  }
}

function numericDraftValue(value: string) {
  return Number(value.replace(/,/g, '')) || 0
}

export function KpiCard({ title, value, change, comparison, icon: Icon, tone, negative }: { title: string; value: string; change: string; comparison: string; icon: LucideIcon; tone: string; negative?: boolean }) {
  return <article className="pm-card pm-kpi"><span style={{ background: `${tone}16`, color: tone }}><Icon size={24} /></span><div><small>{title}</small><strong>{value}</strong><em className={negative ? 'negative' : ''}>{change} {comparison}</em></div></article>
}

export function TabBar({ tabs, active, onChange }: { tabs: readonly string[]; active: string; onChange: (tab: string) => void }) {
  return <nav className="pm-tabs" role="tablist" aria-label="Project management sections">{tabs.map(tab => <button key={tab} type="button" role="tab" aria-selected={active === tab} className={active === tab ? 'active' : undefined} onClick={() => onChange(tab)}>{tab}</button>)}</nav>
}

export function Field({ label, children, className }: { label: string; children: ReactNode; className?: string }) {
  const required = /\*\s*$/.test(label)
  const text = required ? label.replace(/\s*\*+\s*$/, '') : label
  return (
    <label className={`pm-field${className ? ` ${className}` : ''}`} htmlFor={fieldId(label)}>
      <span>{text}{required && <i className="pm-required" aria-hidden="true">*</i>}</span>
      {children}
    </label>
  )
}

export function OverviewTab({
  state,
  opportunities,
  projects,
  hasAnyProjects,
  onOpen,
  onEdit,
  onArchive,
  onDelete,
  onNewProject,
}: {
  state: ProjectManagementState
  opportunities: ProjectSalesOpportunity[]
  projects: ProjectRecord[]
  budget: ReturnType<typeof budgetSummary>
  hasAnyProjects: boolean
  onOpen: (id: string) => void
  onEdit: (id: string) => void
  onArchive: (id: string) => void
  onDelete: (id: string) => void
  onNewProject: () => void
}) {
  if (!hasAnyProjects) return <ProjectEmptyState onNewProject={onNewProject} />

  return (
    <section className="pm-overview-grid pm-dashboard-overview pm-dashboard-overview-recent-only">
      <div className="pm-card pm-recent"><SectionTitle title="Recent Projects" /><ProjectTable state={state} opportunities={opportunities} projects={projects.slice(0, 5)} onOpen={onOpen} onEdit={onEdit} onArchive={onArchive} onDelete={onDelete} /></div>
    </section>
  )
}

function ProjectEmptyState({ onNewProject }: { onNewProject: () => void }) {
  return (
    <section className="pm-empty-workspace">
      <span><BriefcaseBusiness size={28} /></span>
      <div>
        <h2>Create your first project</h2>
        <p>Start with a project record, then add tasks, milestones, documents, budgets, and status tracking from the same workspace.</p>
      </div>
      <button type="button" className="pm-primary" onClick={onNewProject}><Plus size={16} /> New Project</button>
    </section>
  )
}

export function ProjectsTab({
  initialDirectoryTab = 'Projects',
  state,
  opportunities,
  currency,
  onOpen,
  onEdit,
  onUpdate,
  onArchive,
  onRestore,
  onDelete,
}: {
  initialDirectoryTab?: ProjectDirectoryTab
  state: ProjectManagementState
  opportunities: ProjectSalesOpportunity[]
  currency: string
  onOpen: (id: string) => void
  onEdit: (id: string) => void
  onUpdate: (projectId: string, patch: ProjectUpdateDraft, action?: string) => void
  onArchive: (id: string) => void
  onRestore: (id: string) => void
  onDelete: (id: string) => void
}) {
  const activeDirectoryTab: ProjectDirectoryTab = initialDirectoryTab === 'Archived' ? 'Archived' : 'Projects'
  const [viewMode, setViewMode] = useState<ProjectDirectoryView>('list')
  const [sort, setSort] = useState<ProjectSort>({ key: 'name', direction: 'asc' })
  const [page, setPage] = useState(1)
  const [selectedProjectIds, setSelectedProjectIds] = useState<string[]>([])
  const rowsPerPage = 8
  const visibleProjects = useMemo(
    () => state.projects.filter(project => activeDirectoryTab === 'Archived' ? Boolean(project.archivedAt) : !project.archivedAt),
    [activeDirectoryTab, state.projects],
  )
  const sortedProjects = useMemo(() => sortProjectsForDirectory(visibleProjects, sort), [sort, visibleProjects])
  const pageCount = Math.max(1, Math.ceil(sortedProjects.length / rowsPerPage))
  const currentPage = Math.min(page, pageCount)
  const pageProjects = sortedProjects.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage)
  const pageStart = sortedProjects.length ? (currentPage - 1) * rowsPerPage + 1 : 0
  const pageEnd = Math.min(currentPage * rowsPerPage, sortedProjects.length)
  const pageProjectIds = useMemo(() => pageProjects.map(project => project.id), [pageProjects])
  const selectedProjectSet = useMemo(() => new Set(selectedProjectIds), [selectedProjectIds])
  const allPageSelected = pageProjectIds.length > 0 && pageProjectIds.every(id => selectedProjectSet.has(id))
  const directoryLabel = activeDirectoryTab === 'Archived' ? 'Archived projects' : 'Project directory'
  const directorySummary = `${sortedProjects.length} ${sortedProjects.length === 1 ? 'project' : 'projects'} ${activeDirectoryTab === 'Archived' ? 'archived' : 'active'}`

  useEffect(() => {
    const visibleProjectIds = new Set(visibleProjects.map(project => project.id))
    setSelectedProjectIds(previous => previous.filter(id => visibleProjectIds.has(id)))
  }, [visibleProjects])

  const changeViewMode = (mode: ProjectDirectoryView) => {
    setViewMode(mode)
    setPage(1)
  }

  const setSortKey = (key: ProjectSort['key']) => {
    setPage(1)
    setSort(previous => ({
      key,
      direction: previous.key === key && previous.direction === 'asc' ? 'desc' : 'asc',
    }))
  }

  const toggleProjectSelection = (projectId: string, selected: boolean) => {
    setSelectedProjectIds(previous => {
      const next = new Set(previous)
      if (selected) next.add(projectId)
      else next.delete(projectId)
      return Array.from(next)
    })
  }

  const togglePageSelection = (selected: boolean) => {
    setSelectedProjectIds(previous => {
      const next = new Set(previous)
      pageProjectIds.forEach(projectId => {
        if (selected) next.add(projectId)
        else next.delete(projectId)
      })
      return Array.from(next)
    })
  }

  return (
    <section className="pm-project-directory">
      <div className="pm-project-toolbar">
        <span className="pm-project-toolbar-copy">
          <strong>{directoryLabel}</strong>
          <small>{directorySummary}</small>
        </span>
        <div className="pm-project-view-switch" aria-label="Project view">
          <button type="button" className={viewMode === 'list' ? 'active' : undefined} onClick={() => changeViewMode('list')} aria-label="List view" title="List view"><List size={17} /></button>
          <button type="button" className={viewMode === 'grid' ? 'active' : undefined} onClick={() => changeViewMode('grid')} aria-label="Grid view" title="Grid view"><LayoutGrid size={17} /></button>
        </div>
      </div>

      {viewMode === 'list' ? (
        <ProjectDirectoryTable state={state} opportunities={opportunities} projects={pageProjects} currency={currency} sort={sort} selectedProjectIds={selectedProjectSet} allPageSelected={allPageSelected} onTogglePageSelection={togglePageSelection} onToggleProjectSelection={toggleProjectSelection} onSort={setSortKey} onOpen={onOpen} onEdit={onEdit} onUpdate={onUpdate} onArchive={onArchive} onRestore={onRestore} onDelete={onDelete} />
      ) : (
        <ProjectDirectoryGrid state={state} opportunities={opportunities} projects={pageProjects} currency={currency} onOpen={onOpen} onEdit={onEdit} onUpdate={onUpdate} onArchive={onArchive} onRestore={onRestore} onDelete={onDelete} />
      )}

      <div className="pm-project-pagination">
        <span>Showing {pageStart} to {pageEnd} of {sortedProjects.length} projects</span>
        <div>
          <button type="button" onClick={() => setPage(Math.max(1, currentPage - 1))} disabled={currentPage === 1} aria-label="Previous projects page"><ChevronLeft size={15} /></button>
          <strong>{currentPage}</strong>
          <button type="button" onClick={() => setPage(Math.min(pageCount, currentPage + 1))} disabled={currentPage === pageCount} aria-label="Next projects page"><ChevronRight size={15} /></button>
        </div>
      </div>
    </section>
  )
}

function sortProjectsForDirectory(projects: ProjectRecord[], sort: ProjectSort) {
  return [...projects].sort((a, b) => {
    const direction = sort.direction === 'asc' ? 1 : -1
    if (sort.key === 'budget') return (a.budget - b.budget) * direction
    return a.name.localeCompare(b.name) * direction
  })
}

function projectTasksFor(state: ProjectManagementState, projectId: string) {
  return state.tasks.filter(task => task.projectId === projectId && !task.archivedAt)
}

function projectSubtitle(project: ProjectRecord, opportunity?: ProjectSalesOpportunity) {
  if (opportunity) return `Linked to ${opportunity.label}`
  if (project.tags.length) return project.tags.join(', ')
  return project.department || 'Construction'
}

function projectLocationLabel(project: ProjectRecord) {
  const cityProvince = [project.location?.city, project.location?.province].filter(Boolean).join(' ')
  if (cityProvince) return cityProvince
  if (project.location?.address) return project.location.address
  return project.department || '-'
}

function projectClientLabel(state: ProjectManagementState, project: ProjectRecord, opportunity?: ProjectSalesOpportunity) {
  return opportunity?.clientName || state.clients.find(client => client.id === project.clientId)?.name || '--'
}

function formatTableDate(value: string) {
  const date = new Date(value.includes('T') ? value : `${value}T00:00:00`)
  if (Number.isNaN(date.getTime())) return '-'
  return `${date.getMonth() + 1}/${date.getDate()}/${date.getFullYear()}`
}

function projectDurationLabel(project: ProjectRecord) {
  return `${formatTableDate(project.startDate)} - ${formatTableDate(project.dueDate)}`
}

function projectDirectoryStatusValue(project: ProjectRecord): ProjectDirectoryStatus {
  if (project.status === 'Completed') return 'COMPLETED'
  if (project.status === 'On Hold' || project.status === 'Cancelled' || project.health === 'At Risk' || project.health === 'Delayed') return 'WITH ISSUE'
  if (project.status === 'Active' || project.status === 'In Progress') return 'ONGOING'
  return 'PENDING'
}

function projectDirectoryStatusTone(status: ProjectDirectoryStatus) {
  return status.toLowerCase().replace(/\s+/g, '-')
}

function projectDirectoryStatusPatch(status: ProjectDirectoryStatus, project: ProjectRecord): ProjectUpdateDraft {
  if (status === 'PENDING') return { status: 'Planning', health: 'Good' }
  if (status === 'ONGOING') return { status: 'In Progress', health: 'Good' }
  if (status === 'COMPLETED') return { status: 'Completed', health: 'Good', progress: 100 }
  return { status: 'On Hold', health: project.health === 'Delayed' ? 'Delayed' : 'At Risk' }
}

function latestProjectUpdatedAt(state: ProjectManagementState, project: ProjectRecord) {
  const values = [
    project.updatedAt,
    ...state.tasks.filter(task => task.projectId === project.id).map(task => task.updatedAt),
    ...state.documents.filter(document => document.projectId === project.id).map(document => document.updatedAt),
    ...state.activities.filter(activity => activity.projectId === project.id).map(activity => activity.createdAt),
  ].filter((value): value is string => Boolean(value))
  return values.sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0]
}

function projectBudgetByStatus(projects: ProjectRecord[]) {
  return projectStatusBudgetGroups.map(group => ({
    label: group.label,
    value: projects
      .filter(project => group.statuses.includes(project.status))
      .reduce((sum, project) => sum + project.budget, 0),
    color: group.color,
  }))
}

function ProjectDirectoryTable({ state, opportunities, projects, currency, sort, selectedProjectIds, allPageSelected, onTogglePageSelection, onToggleProjectSelection, onSort, onOpen, onEdit, onUpdate, onArchive, onRestore, onDelete }: { state: ProjectManagementState; opportunities: ProjectSalesOpportunity[]; projects: ProjectRecord[]; currency: string; sort: ProjectSort; selectedProjectIds: Set<string>; allPageSelected: boolean; onTogglePageSelection: (selected: boolean) => void; onToggleProjectSelection: (projectId: string, selected: boolean) => void; onSort: (key: ProjectSort['key']) => void; onOpen: (id: string) => void; onEdit: (id: string) => void; onUpdate: (projectId: string, patch: ProjectUpdateDraft, action?: string) => void; onArchive: (id: string) => void; onRestore: (id: string) => void; onDelete: (id: string) => void }) {
  if (!projects.length) return <EmptyState title="No projects found" body="Create a project to see project records here." />
  return (
    <div className="pm-project-table-frame">
      <table className="pm-project-table pm-project-opportunity-table">
        <thead>
          <tr>
            <th className="pm-project-check-cell">
              <input
                type="checkbox"
                aria-label="Select all projects on this page"
                checked={allPageSelected}
                onClick={event => event.stopPropagation()}
                onChange={event => onTogglePageSelection(event.target.checked)}
              />
            </th>
            <th>
              <button type="button" onClick={() => onSort('name')} aria-label={`Sort projects by name ${sort.key === 'name' && sort.direction === 'asc' ? 'descending' : 'ascending'}`}>
                Title <ArrowUpDown size={13} />
              </button>
            </th>
            <th>Client</th>
            <th>
              <button type="button" onClick={() => onSort('budget')} aria-label={`Sort projects by budget ${sort.key === 'budget' && sort.direction === 'asc' ? 'descending' : 'ascending'}`}>
                Project Cost <ArrowUpDown size={13} />
              </button>
            </th>
            <th>Duration</th>
            <th>Status</th>
            <th aria-label="Actions" />
          </tr>
        </thead>
        <tbody>
          {projects.map(project => (
            <ProjectDirectoryRow key={project.id} state={state} opportunities={opportunities} project={project} currency={currency} selected={selectedProjectIds.has(project.id)} onToggleSelected={onToggleProjectSelection} onOpen={onOpen} onEdit={onEdit} onUpdate={onUpdate} onArchive={onArchive} onRestore={onRestore} onDelete={onDelete} />
          ))}
        </tbody>
      </table>
    </div>
  )
}

function ProjectDirectoryRow({ state, opportunities, project, currency, selected, onToggleSelected, onOpen, onEdit, onUpdate, onArchive, onRestore, onDelete }: { state: ProjectManagementState; opportunities: ProjectSalesOpportunity[]; project: ProjectRecord; currency: string; selected: boolean; onToggleSelected: (projectId: string, selected: boolean) => void; onOpen: (id: string) => void; onEdit: (id: string) => void; onUpdate: (projectId: string, patch: ProjectUpdateDraft, action?: string) => void; onArchive: (id: string) => void; onRestore: (id: string) => void; onDelete: (id: string) => void }) {
  const opportunity = findOpportunityByKey(opportunities, opportunityKey(project.opportunitySource, project.opportunityId))
  const clientLabel = projectClientLabel(state, project, opportunity)
  const openRow = (event: MouseEvent<HTMLTableRowElement>) => {
    const target = event.target as HTMLElement | null
    if (target?.closest('button, a, input, select, textarea, [role="listbox"], [role="option"], .pm-project-badge-menu-wrap')) return
    onOpen(project.id)
  }
  const openRowOnKeyboard = (event: KeyboardEvent<HTMLTableRowElement>) => {
    if (event.target !== event.currentTarget) return
    if (event.key !== 'Enter' && event.key !== ' ') return
    event.preventDefault()
    onOpen(project.id)
  }

  return (
    <tr className="pm-clickable-row" tabIndex={0} onClick={openRow} onKeyDown={openRowOnKeyboard} aria-label={`Open ${project.name}`}>
      <td className="pm-project-check-cell">
        <input
          type="checkbox"
          aria-label={`Select ${project.name}`}
          checked={selected}
          onClick={event => event.stopPropagation()}
          onChange={event => onToggleSelected(project.id, event.target.checked)}
        />
      </td>
      <td>
        <div className="pm-project-name-cell pm-project-name-cell-compact">
          <span className="pm-project-title-block">
            <button type="button" onClick={() => onOpen(project.id)}>{project.name}</button>
            <small>{projectLocationLabel(project)}</small>
          </span>
        </div>
      </td>
      <td><span className="pm-project-client-cell">{clientLabel}</span></td>
      <td>
        <span className="pm-project-budget-cell">
          <strong>{formatCurrency(project.budget, currency)}</strong>
        </span>
      </td>
      <td>{projectDurationLabel(project)}</td>
      <td><ProjectDirectoryStatusBadge project={project} onChange={status => onUpdate(project.id, projectDirectoryStatusPatch(status, project), `Changed project status to ${status}`)} /></td>
      <td>
        <ProjectDirectoryActions project={project} onOpen={onOpen} onEdit={onEdit} onArchive={onArchive} onRestore={onRestore} onDelete={onDelete} />
      </td>
    </tr>
  )
}

function ProjectDirectoryActions({ project, onOpen, onEdit, onArchive, onRestore, onDelete }: { project: ProjectRecord; onOpen?: (id: string) => void; onEdit: (id: string) => void; onArchive: (id: string) => void; onRestore?: (id: string) => void; onDelete: (id: string) => void }) {
  const isArchived = Boolean(project.archivedAt)
  const [open, setOpen] = useState(false)
  const [menuPosition, setMenuPosition] = useState<CSSProperties>({ top: 0, left: 0, minWidth: 150 })
  const menuRef = useRef<HTMLDivElement | null>(null)
  const triggerRef = useRef<HTMLButtonElement | null>(null)

  useEffect(() => {
    if (!open) return
    const closeOnOutsideTap = (event: PointerEvent) => {
      const target = event.target as Node | null
      if (target && menuRef.current?.contains(target)) return
      setOpen(false)
    }
    document.addEventListener('pointerdown', closeOnOutsideTap)
    return () => document.removeEventListener('pointerdown', closeOnOutsideTap)
  }, [open])

  useEffect(() => {
    if (!open) return

    const updateMenuPosition = () => {
      const rect = triggerRef.current?.getBoundingClientRect()
      if (!rect) return
      const menuWidth = 150
      const menuHeight = onOpen ? 122 : isArchived && onRestore ? 122 : 156
      const availableBelow = window.innerHeight - rect.bottom
      const top = availableBelow < menuHeight + 16 && rect.top > menuHeight
        ? Math.max(12, rect.top - menuHeight - 6)
        : rect.bottom + 6
      const left = Math.min(
        Math.max(12, rect.right - menuWidth),
        Math.max(12, window.innerWidth - menuWidth - 12),
      )
      setMenuPosition({ top, left, minWidth: menuWidth })
    }

    updateMenuPosition()
    window.addEventListener('scroll', updateMenuPosition, true)
    window.addEventListener('resize', updateMenuPosition)
    return () => {
      window.removeEventListener('scroll', updateMenuPosition, true)
      window.removeEventListener('resize', updateMenuPosition)
    }
  }, [isArchived, onOpen, onRestore, open])

  const viewProject = () => {
    setOpen(false)
    onOpen?.(project.id)
  }

  const editProject = () => {
    setOpen(false)
    onEdit(project.id)
  }

  const archiveProject = () => {
    setOpen(false)
    if (!isArchived && window.confirm(`Archive ${project.name}?`)) onArchive(project.id)
  }

  const restoreProject = () => {
    setOpen(false)
    if (isArchived && onRestore && window.confirm(`Restore ${project.name} to active projects?`)) onRestore(project.id)
  }

  const deleteProject = () => {
    setOpen(false)
    if (window.confirm(`Delete ${project.name} and all related records?`)) onDelete(project.id)
  }

  const toggleMenu = () => {
    setOpen(previous => !previous)
  }

  return (
    <div
      className="pm-project-actions"
      ref={menuRef}
      aria-label={`Actions for ${project.name}`}
      onClick={event => event.stopPropagation()}
      onKeyDown={event => event.stopPropagation()}
    >
      <button
        ref={triggerRef}
        type="button"
        className="pm-project-action"
        onClick={toggleMenu}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Open actions for ${project.name}`}
      >
        <MoreHorizontal size={16} />
      </button>
      {open && (
        <div className="pm-project-action-menu" role="menu" aria-label={`Actions for ${project.name}`} style={menuPosition}>
          {onOpen && <button type="button" role="menuitem" onClick={viewProject}><Eye size={14} /> View</button>}
          <button type="button" role="menuitem" onClick={editProject}><Pencil size={14} /> Edit</button>
          <button type="button" role="menuitem" className="danger" onClick={deleteProject}><Trash2 size={14} /> Delete</button>
          {!onOpen && isArchived && onRestore && <button type="button" role="menuitem" onClick={restoreProject}><RotateCcw size={14} /> Restore</button>}
          {!onOpen && !isArchived && <button type="button" role="menuitem" onClick={archiveProject}><Archive size={14} /> Archive</button>}
        </div>
      )}
    </div>
  )
}

function ProjectDirectoryGrid({ state, opportunities, projects, currency, onOpen, onEdit, onUpdate, onArchive, onRestore, onDelete }: { state: ProjectManagementState; opportunities: ProjectSalesOpportunity[]; projects: ProjectRecord[]; currency: string; onOpen: (id: string) => void; onEdit: (id: string) => void; onUpdate: (projectId: string, patch: ProjectUpdateDraft, action?: string) => void; onArchive: (id: string) => void; onRestore: (id: string) => void; onDelete: (id: string) => void }) {
  if (!projects.length) return <EmptyState title="No projects found" body="Create a project to see project records here." />
  return (
    <div className="pm-project-card-grid">
      {projects.map(project => {
        const manager = state.members.find(member => member.id === project.managerId)
        const opportunity = findOpportunityByKey(opportunities, opportunityKey(project.opportunitySource, project.opportunityId))
        const tasks = projectTasksFor(state, project.id)
        const completedTasks = tasks.filter(task => task.status === 'Done').length
        return (
          <article key={project.id} className="pm-project-grid-card">
            <ProjectThumbnail project={project} />
            <div className="pm-project-grid-head">
              <span>
                <button type="button" onClick={() => onOpen(project.id)}>{project.name}</button>
                <small>{projectSubtitle(project, opportunity)}</small>
              </span>
              <ProjectDirectoryActions project={project} onEdit={onEdit} onArchive={onArchive} onRestore={onRestore} onDelete={onDelete} />
            </div>
            <div className="pm-project-grid-badges">
              <ProjectStatusBadge status={project.status} onChange={status => onUpdate(project.id, { status }, `Changed project status to ${status}`)} />
              <ProjectPriorityBadge priority={project.priority} onChange={priority => onUpdate(project.id, { priority }, `Changed project priority to ${priority}`)} />
            </div>
            <span className="pm-project-progress-cell"><Progress value={project.progress} /><strong>{Math.round(project.progress)}%</strong></span>
            <div className="pm-project-grid-meta">
              <span><small>Owner</small><strong>{manager?.name || 'Unassigned'}</strong></span>
              <span><small>Budget</small><strong>{formatCurrency(project.budget, currency)}</strong></span>
              <span><small>Due</small><strong>{formatDate(project.dueDate)}</strong></span>
              <span><small>Tasks</small><strong>{completedTasks} / {tasks.length}</strong></span>
            </div>
          </article>
        )
      })}
    </div>
  )
}

export function useProjectThumbnailSource(project: Pick<ProjectRecord, 'thumbnailDataUrl' | 'thumbnailAssetId'>) {
  const [assetSource, setAssetSource] = useState({ assetId: '', dataUrl: '' })

  useEffect(() => {
    let cancelled = false
    if (project.thumbnailDataUrl || !project.thumbnailAssetId) return
    loadProjectThumbnailAsset(project.thumbnailAssetId).then(dataUrl => {
      if (!cancelled) setAssetSource({ assetId: project.thumbnailAssetId || '', dataUrl: dataUrl || '' })
    })
    return () => {
      cancelled = true
    }
  }, [project.thumbnailAssetId, project.thumbnailDataUrl])

  if (project.thumbnailDataUrl) return project.thumbnailDataUrl
  if (!project.thumbnailAssetId) return ''
  return assetSource.assetId === project.thumbnailAssetId ? assetSource.dataUrl : ''
}

export function ProjectThumbnail({ project, className = '' }: { project: ProjectRecord; className?: string }) {
  const variant = Math.abs(`${project.id}-${project.name}`.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0)) % 5
  const thumbnailSource = useProjectThumbnailSource(project)
  const thumbClassName = `pm-project-thumb variant-${variant}${className ? ` ${className}` : ''}`

  return (
    <span className={thumbClassName} aria-hidden="true">
      {thumbnailSource ? <span className="pm-project-thumb-image" style={{ backgroundImage: `url(${thumbnailSource})` }} /> : <><i /><b /><em /></>}
    </span>
  )
}

function ProjectDirectoryStatusBadge({ project, onChange }: { project: ProjectRecord; onChange: (status: ProjectDirectoryStatus) => void }) {
  const status = projectDirectoryStatusValue(project)
  const tone = projectDirectoryStatusTone(status)
  const className = `pm-project-badge status-${tone} is-editable`

  return (
    <ProjectBadgeSelect
      value={status}
      label={status}
      className={className}
      options={projectDirectoryStatusOptions.map(option => ({
        value: option,
        label: option,
        className: `status-${projectDirectoryStatusTone(option)}`,
      }))}
      ariaLabel="Project status"
      onChange={onChange}
    />
  )
}

export function ProjectStatusBadge({ status, onChange, label, tone }: { status: ProjectStatus; onChange?: (status: ProjectStatus) => void; label?: string; tone?: string }) {
  const displayLabel = label || projectStatusLabel(status)
  const className = `pm-project-badge status-${(tone || status).toLowerCase().replaceAll(' ', '-')}${onChange ? ' is-editable' : ''}`
  const menuOptions = projectStatusOptions.filter(option => status === 'Active' ? option !== 'In Progress' : option !== 'Active')
  if (!onChange) return <span className={className}><i />{displayLabel}</span>
  return <ProjectBadgeSelect value={status} label={displayLabel} className={className} options={menuOptions.map(option => ({ value: option, label: projectStatusLabel(option), className: `status-${option.toLowerCase().replaceAll(' ', '-')}` }))} ariaLabel="Project status" onChange={onChange} />
}

export function ProjectPriorityBadge({ priority, onChange }: { priority: TaskPriority; onChange?: (priority: TaskPriority) => void }) {
  const className = `pm-project-badge priority-${priority.toLowerCase()}${onChange ? ' is-editable' : ''}`
  if (!onChange) return <span className={className}><i />{priority}</span>
  return <ProjectBadgeSelect value={priority} label={priority} className={className} options={priorityOptions.filter((option): option is TaskPriority => option !== 'All').map(option => ({ value: option, label: option, className: `priority-${option.toLowerCase()}` }))} ariaLabel="Project priority" onChange={onChange} />
}

function ProjectTaskStatusBadge({ status, onChange }: { status: TaskStatus; onChange: (status: TaskStatus) => void }) {
  const className = `pm-project-badge status-${status.toLowerCase().replaceAll(' ', '-')} is-editable`
  return <ProjectBadgeSelect value={status} label={status} className={className} options={KANBAN_STATUSES.map(option => ({ value: option, label: option, className: `status-${option.toLowerCase().replaceAll(' ', '-')}` }))} ariaLabel="Task status" onChange={onChange} />
}

function ProjectBadgeSelect<T extends string>({ value, label, className, options, ariaLabel, onChange }: { value: T; label: string; className: string; options: Array<{ value: T; label: string; className: string }>; ariaLabel: string; onChange: (value: T) => void }) {
  const [open, setOpen] = useState(false)
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0, minWidth: 148 })
  const triggerRef = useRef<HTMLButtonElement | null>(null)
  const selectOption = (nextValue: T) => {
    onChange(nextValue)
    setOpen(false)
  }

  useEffect(() => {
    if (!open) return

    const updatePosition = () => {
      const rect = triggerRef.current?.getBoundingClientRect()
      if (!rect) return
      setMenuPosition({
        top: rect.bottom + 6,
        left: rect.left,
        minWidth: Math.max(148, rect.width),
      })
    }

    updatePosition()
    window.addEventListener('scroll', updatePosition, true)
    window.addEventListener('resize', updatePosition)
    return () => {
      window.removeEventListener('scroll', updatePosition, true)
      window.removeEventListener('resize', updatePosition)
    }
  }, [open])

  return (
    <span className="pm-project-badge-menu-wrap" onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false) }}>
      <button ref={triggerRef} type="button" className={className} aria-label={ariaLabel} aria-haspopup="listbox" aria-expanded={open} onClick={() => setOpen(previous => !previous)}>
        <i />
        <span>{label}</span>
        <ChevronDown size={12} aria-hidden="true" />
      </button>
      {open && (
        <span className="pm-project-badge-menu" role="listbox" aria-label={ariaLabel} style={menuPosition}>
          {options.map(option => (
            <button
              key={option.value}
              type="button"
              role="option"
              aria-selected={option.value === value}
              className={`pm-project-badge-menu-option ${option.className}${option.value === value ? ' is-selected' : ''}`}
              onMouseDown={event => event.preventDefault()}
              onClick={() => selectOption(option.value)}
            >
              <i />
              <span>{option.label}</span>
            </button>
          ))}
        </span>
      )}
    </span>
  )
}

export function Select({ value, options, labels = {}, onChange }: { value: string; options: string[]; labels?: Record<string, string>; onChange: (value: string) => void }) {
  return <select className="pm-select" value={value} onChange={event => onChange(event.target.value)}>{options.map(option => <option key={option} value={option}>{labels[option] || option}</option>)}</select>
}

function ProjectTable({ state, opportunities, projects, onOpen, onEdit, onArchive, onDelete }: { state: ProjectManagementState; opportunities: ProjectSalesOpportunity[]; projects: ProjectRecord[]; onOpen: (id: string) => void; onEdit: (id: string) => void; onArchive: (id: string) => void; onDelete: (id: string) => void }) {
  if (!projects.length) return <EmptyState title="No projects found" body="Create a project to see project records here." />
  const openOnKeyboard = (event: KeyboardEvent<HTMLTableRowElement>, projectId: string) => {
    if (event.target !== event.currentTarget) return
    if (event.key !== 'Enter' && event.key !== ' ') return
    event.preventDefault()
    onOpen(projectId)
  }
  return (
    <>
      <div className="pm-table-wrap">
        <table className="pm-table pm-recent-projects-table">
          <thead><tr>{['Project Name', 'Client', 'Project Manager', 'Status', 'Progress', 'Budget', 'Due Date', 'Actions'].map(head => <th key={head}>{head}</th>)}</tr></thead>
          <tbody>{projects.map(project => {
            const manager = state.members.find(m => m.id === project.managerId)
            const opportunity = findOpportunityByKey(opportunities, opportunityKey(project.opportunitySource, project.opportunityId))
            return (
              <tr key={project.id} className="pm-clickable-row" tabIndex={0} onClick={() => onOpen(project.id)} onKeyDown={event => openOnKeyboard(event, project.id)} aria-label={`Open ${project.name}`}>
                <td><strong>{project.name}</strong><small>{opportunity ? `Linked to ${opportunity.label}` : project.tags.join(', ') || project.department}</small></td>
                <td>{projectClientName(project, state.clients)}</td>
                <td><Avatar member={manager} /> {manager?.name || '-'}</td>
                <td><Pill value={project.status} /></td>
                <td>
                  <span className="pm-project-progress-cell"><Progress value={project.progress} /><strong>{Math.round(project.progress)}%</strong></span>
                </td>
                <td>{formatMoney(project.budget)}</td>
                <td>{formatDate(project.dueDate)}</td>
                <td><ProjectDirectoryActions project={project} onOpen={onOpen} onEdit={onEdit} onArchive={onArchive} onDelete={onDelete} /></td>
              </tr>
            )
          })}</tbody>
        </table>
      </div>
      <div className="pm-mobile-projects">{projects.map(project => {
        const opportunity = findOpportunityByKey(opportunities, opportunityKey(project.opportunitySource, project.opportunityId))
        return (
          <article key={project.id} className="pm-mobile-project-card pm-clickable-card" onClick={() => onOpen(project.id)} tabIndex={0} role="button" onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onOpen(project.id) } }}>
            <div><strong>{project.name}</strong><ProjectDirectoryActions project={project} onOpen={onOpen} onEdit={onEdit} onArchive={onArchive} onDelete={onDelete} /></div>
            <small>{projectClientName(project, state.clients)}</small>
            {opportunity && <small>Linked to {opportunity.label}</small>}
            <Pill value={project.status} />
            <span>{formatMoney(project.budget)} - Due {formatDate(project.dueDate)}</span>
            <span className="pm-project-progress-cell"><Progress value={project.progress} /><strong>{Math.round(project.progress)}%</strong></span>
          </article>
        )
      })}</div>
    </>
  )
}

const taskDescriptionTags = new Set(['b', 'strong', 'i', 'em', 'u', 'ul', 'ol', 'li', 'p', 'br', 'h2', 'h3', 'blockquote', 'pre', 'code', 'div'])

function escapeTaskDescriptionText(value: string) {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;')
}

function hasHtmlMarkup(value: string) {
  return /<\/?[a-z][\s\S]*>/i.test(value)
}

function taskDescriptionInlineMarkup(value: string) {
  return escapeTaskDescriptionText(value)
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[^*])\*([^*\n]+)\*/g, '$1<em>$2</em>')
    .replace(/&lt;u&gt;([\s\S]*?)&lt;\/u&gt;/gi, '<u>$1</u>')
}

function normalizeTaskDescriptionHtml(value: string) {
  return value
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[^*])\*([^*\n]+)\*/g, '$1<em>$2</em>')
    .replace(/(\*{2,})/g, '')
}

function plainTaskDescriptionToHtml(value: string) {
  const lines = value.split(/\r?\n/)
  const html: string[] = []
  let listOpen = false
  lines.forEach(line => {
    const trimmed = line.trim()
    const listMatch = trimmed.match(/^[-*]\s+(?:\[[ xX]\]\s+)?(.+)$/)
    if (listMatch) {
      if (!listOpen) {
        html.push('<ul>')
        listOpen = true
      }
      html.push(`<li>${taskDescriptionInlineMarkup(listMatch[1])}</li>`)
      return
    }
    if (listOpen) {
      html.push('</ul>')
      listOpen = false
    }
    if (!trimmed) html.push('<p><br></p>')
    else if (trimmed.startsWith('### ')) html.push(`<h3>${taskDescriptionInlineMarkup(trimmed.slice(4))}</h3>`)
    else if (trimmed.startsWith('## ')) html.push(`<h2>${taskDescriptionInlineMarkup(trimmed.slice(3))}</h2>`)
    else if (trimmed.startsWith('> ')) html.push(`<blockquote>${taskDescriptionInlineMarkup(trimmed.slice(2))}</blockquote>`)
    else html.push(`<p>${taskDescriptionInlineMarkup(trimmed)}</p>`)
  })
  if (listOpen) html.push('</ul>')
  return html.join('')
}

function sanitizeTaskDescriptionHtml(value: string) {
  const source = hasHtmlMarkup(value) ? normalizeTaskDescriptionHtml(value) : plainTaskDescriptionToHtml(value)
  return source
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<\/?([a-z0-9]+)(?:\s[^>]*)?>/gi, (match, tagName: string) => {
      const normalized = tagName.toLowerCase()
      if (!taskDescriptionTags.has(normalized)) return ''
      if (normalized === 'br') return '<br>'
      return match.startsWith('</') ? `</${normalized}>` : `<${normalized}>`
    })
}

function taskDescriptionText(value: string) {
  return sanitizeTaskDescriptionHtml(value)
    .replace(/<br>/gi, '\n')
    .replace(/<\/(p|h2|h3|blockquote|li)>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

function TaskDescriptionViewer({ value, compact = false }: { value: string; compact?: boolean }) {
  const text = taskDescriptionText(value)
  if (!text) return <p>{compact ? '-' : 'No description has been added yet.'}</p>
  return <div className={compact ? 'pm-task-description-rich compact' : 'pm-task-description-rich'}>{text}</div>
}

export function TaskDescriptionEditor({ value, onChange, onAttach }: { value: string; onChange: (value: string) => void; onAttach: () => void }) {
  const editorRef = useRef<HTMLDivElement | null>(null)
  const textLength = taskDescriptionText(value).length
  const editorText = taskDescriptionText(value)

  useEffect(() => {
    const editor = editorRef.current
    if (!editor || document.activeElement === editor) return
    if (editor.textContent !== editorText) editor.textContent = editorText
  }, [editorText])

  function commitEditor() {
    const editor = editorRef.current
    if (!editor) return
    const nextText = editor.innerText.replace(/\n{4,}/g, '\n\n\n').trim()
    if (nextText.length > 2000) {
      editor.textContent = editorText
      return
    }
    onChange(nextText)
  }

  function focusEditor() {
    const editor = editorRef.current
    if (!editor) return
    editor.focus()
  }

  function runEditorCommand(command: string, commandValue?: string) {
    focusEditor()
    window.requestAnimationFrame(() => {
      document.execCommand(command, false, commandValue)
      commitEditor()
    })
  }

  function insertList(checklist = false) {
    if (checklist) runEditorCommand('insertHTML', '<ul><li>Checklist item</li></ul>')
    else runEditorCommand('insertUnorderedList')
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    if (!(event.ctrlKey || event.metaKey)) return
    const key = event.key.toLowerCase()
    if (key === 'b') {
      event.preventDefault()
      runEditorCommand('bold')
    } else if (key === 'i') {
      event.preventDefault()
      runEditorCommand('italic')
    } else if (key === 'u') {
      event.preventDefault()
      runEditorCommand('underline')
    }
  }

  function handlePaste(event: React.ClipboardEvent<HTMLDivElement>) {
    event.preventDefault()
    runEditorCommand('insertText', event.clipboardData.getData('text/plain').slice(0, 2000))
  }

  return (
    <div className="pm-task-description-editor">
      <div className="pm-task-editor-toolbar" aria-label="Description formatting controls">
        <button type="button" aria-label="Bold" title="Bold" onClick={() => runEditorCommand('bold')}>B</button>
        <button type="button" aria-label="Italic" title="Italic" onClick={() => runEditorCommand('italic')}><em>I</em></button>
        <button type="button" aria-label="Underline" title="Underline" onClick={() => runEditorCommand('underline')}><u>U</u></button>
        <button type="button" aria-label="Bulleted list" title="Bulleted list" onClick={() => insertList(false)}><List size={15} /></button>
        <button type="button" aria-label="Checklist" title="Checklist" onClick={() => insertList(true)}><ListChecks size={15} /></button>
        <button type="button" aria-label="Attach file" title="Attach file" aria-controls="pm-new-task-files" onClick={onAttach}><Paperclip size={15} /></button>
      </div>
      <div
        ref={editorRef}
        className="pm-task-description-input"
        contentEditable
        role="textbox"
        aria-label="Task description"
        aria-multiline="true"
        data-placeholder="Enter task description, scope of work, and key details..."
        suppressContentEditableWarning
        onInput={commitEditor}
        onBlur={commitEditor}
        onKeyDown={handleKeyDown}
        onPaste={handlePaste}
      />
      <div className="pm-task-description-footer"><small>{textLength} / 2000</small></div>
    </div>
  )
}

export function TasksTab({ state, onAddTask, onOpenTask, onEditTask, onArchiveTask, onDeleteTask, onUpdateTaskStatus }: { state: ProjectManagementState; onAddTask?: () => void; onOpenTask?: (taskId: string) => void; onEditTask: (task: ProjectTask) => void; onArchiveTask: (taskId: string) => void; onDeleteTask: (taskId: string) => void; onUpdateTaskStatus: (taskId: string, status: TaskStatus) => void }) {
  const taskCount = state.tasks.length
  const header = (
    <div className="pm-task-board-toolbar">
      <div>
        <h2>Task Management</h2>
        <p>Track work, ownership, and progress for this project.</p>
      </div>
      <div className="pm-task-board-toolbar-meta">
        <span className="pm-section-action">{taskCount} {taskCount === 1 ? 'task' : 'tasks'}</span>
        {onAddTask && <button type="button" className="pm-primary pm-task-board-add" onClick={onAddTask}><Plus size={15} /> Add Task</button>}
      </div>
    </div>
  )
  if (!taskCount) return <section className="pm-card pm-task-board-card">{header}<EmptyState title="No tasks yet" body={onAddTask ? 'Add a task to start tracking work for this project.' : 'Open a project detail page to add and assign tasks.'} /></section>
  return (
    <section className="pm-card pm-task-board-card">
      {header}
      <div className="pm-task-board" role="table" aria-label="Task board">
        <div className="pm-task-board-head" role="row">
          {['Task', 'Owner', 'Status', 'Priority', 'Due date', 'Progress', 'Updates', 'Files', 'Actions'].map(label => <span key={label} role="columnheader">{label}</span>)}
        </div>
        {state.tasks.map(task => (
          <TaskBoardRow key={task.id} state={state} task={task} onOpen={onOpenTask} onEdit={onEditTask} onArchive={onArchiveTask} onDelete={onDeleteTask} onUpdateStatus={onUpdateTaskStatus} />
        ))}
      </div>
    </section>
  )
}

function TaskBoardRow({ state, task, onOpen, onEdit, onArchive, onDelete, onUpdateStatus }: { state: ProjectManagementState; task: ProjectTask; onOpen?: (taskId: string) => void; onEdit: (task: ProjectTask) => void; onArchive: (taskId: string) => void; onDelete: (taskId: string) => void; onUpdateStatus: (taskId: string, status: TaskStatus) => void }) {
  const member = state.members.find(item => item.id === task.assigneeId)
  const project = state.projects.find(item => item.id === task.projectId)
  const commentCount = Math.max(task.comments, state.taskComments.filter(comment => comment.taskId === task.id).length)
  const attachmentCount = Math.max(task.attachments, state.taskAttachments.filter(attachment => attachment.taskId === task.id).length)
  const openTask = () => onOpen ? onOpen(task.id) : onEdit(task)
  const openTaskFromKeyboard = (event: React.KeyboardEvent<HTMLElement>) => {
    if (event.key !== 'Enter' && event.key !== ' ') return
    event.preventDefault()
    openTask()
  }

  return (
    <article className="pm-task-board-row" role="row" tabIndex={0} onClick={openTask} onKeyDown={openTaskFromKeyboard} aria-label={`Open task ${task.title}`}>
      <div className="pm-task-board-title" role="cell">
        <strong>{task.title}</strong>
        <small>{project?.name || 'No project'}</small>
        {task.labels.length > 0 && <span>{task.labels.slice(0, 3).join(', ')}</span>}
      </div>
      <div className="pm-task-board-owner" role="cell"><Avatar member={member} /><span>{member?.name || 'Unassigned'}</span></div>
      <div role="cell" onMouseDown={event => event.stopPropagation()} onClick={event => event.stopPropagation()}><ProjectTaskStatusBadge status={task.status} onChange={status => onUpdateStatus(task.id, status)} /></div>
      <div role="cell"><Pill value={task.priority} /></div>
      <div className="pm-task-board-date" role="cell">{formatDate(task.dueDate)}</div>
      <div role="cell"><Progress value={task.progress} /></div>
      <div className="pm-task-board-count" role="cell"><MessageSquare size={14} /> {commentCount}</div>
      <div className="pm-task-board-count" role="cell"><Paperclip size={14} /> {attachmentCount}</div>
      <div className="pm-task-board-actions" role="cell" onMouseDown={event => event.stopPropagation()} onClick={event => event.stopPropagation()}>
        <button type="button" className="pm-icon-btn" onClick={() => onEdit(task)} aria-label={`Edit ${task.title}`}><Pencil size={14} /></button>
        <button type="button" className="pm-icon-btn" onClick={() => { if (window.confirm(`Archive ${task.title}?`)) onArchive(task.id) }} aria-label={`Archive ${task.title}`}><Archive size={14} /></button>
        <button type="button" className="pm-icon-btn danger" onClick={() => { if (window.confirm(`Delete ${task.title}? This removes related time logs.`)) onDelete(task.id) }} aria-label={`Delete ${task.title}`}><Trash2 size={14} /></button>
      </div>
    </article>
  )
}

const KANBAN_STATUSES: TaskStatus[] = ['To Do', 'In Progress', 'Review', 'Done', 'Blocked']
const KANBAN_PRIORITIES: TaskPriority[] = ['Low', 'Medium', 'High', 'Critical']

function kanbanEmptyHint(status: TaskStatus) {
  switch (status) {
    case 'To Do': return 'Add the first task to start planning.'
    case 'In Progress': return 'Move tasks here once work begins.'
    case 'Review': return 'Tasks waiting for approval appear here.'
    case 'Done': return 'Completed tasks are collected here.'
    case 'Blocked': return 'Flag blockers so the team can clear them.'
    default: return 'Tasks will appear here.'
  }
}

export function KanbanTab({ state, onDrag, onDrop, onOpenTask, onEditTask, onArchiveTask, onDeleteTask, onQuickAddTask }: {
  state: ProjectManagementState
  onDrag: (id: string) => void
  onDrop: (status: TaskStatus) => void
  onOpenTask?: (taskId: string) => void
  onEditTask: (task: ProjectTask) => void
  onArchiveTask: (taskId: string) => void
  onDeleteTask: (taskId: string) => void
  onQuickAddTask?: (status: TaskStatus, title: string) => void
}) {
  const [query, setQuery] = useState('')
  const [priorityFilter, setPriorityFilter] = useState('All')
  const [composerStatus, setComposerStatus] = useState<TaskStatus | null>(null)
  const [composerText, setComposerText] = useState('')

  const normalizedQuery = query.trim().toLowerCase()
  const filterActive = Boolean(normalizedQuery) || priorityFilter !== 'All'

  const visibleTasks = useMemo(() => state.tasks.filter(task => {
    if (priorityFilter !== 'All' && task.priority !== priorityFilter) return false
    if (normalizedQuery) {
      const haystack = `${task.title} ${(task.labels || []).join(' ')}`.toLowerCase()
      if (!haystack.includes(normalizedQuery)) return false
    }
    return true
  }), [state.tasks, priorityFilter, normalizedQuery])

  const columns = KANBAN_STATUSES.map(status => ({ status, tasks: visibleTasks.filter(task => task.status === status) }))

  const startComposer = (status: TaskStatus) => {
    setComposerStatus(status)
    setComposerText('')
  }

  const submitComposer = (status: TaskStatus) => {
    const title = composerText.trim()
    if (!title || !onQuickAddTask) {
      setComposerStatus(null)
      setComposerText('')
      return
    }
    onQuickAddTask(status, title)
    setComposerText('')
  }

  const clearFilters = () => {
    setQuery('')
    setPriorityFilter('All')
  }

  return (
    <div className="pm-board">
      <div className="pm-board-toolbar">
        <label className="pm-board-search">
          <Search size={15} />
          <input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search tasks..." aria-label="Search tasks" />
        </label>
        <select value={priorityFilter} onChange={event => setPriorityFilter(event.target.value)} aria-label="Filter by priority">
          <option value="All">All priorities</option>
          {KANBAN_PRIORITIES.map(option => <option key={option} value={option}>{option}</option>)}
        </select>
        {filterActive && <button type="button" className="pm-board-clear" onClick={clearFilters}><X size={14} /> Clear</button>}
      </div>

      <div className="pm-board-body is-panel-collapsed">
        <div className="pm-board-columns">
          {columns.map(column => (
            <section
              key={column.status}
              className="pm-board-col"
              data-status={column.status}
              onDragOver={event => event.preventDefault()}
              onDrop={() => onDrop(column.status)}
            >
              <header className="pm-board-col-head">
                <strong>{column.status}</strong>
                <span className="pm-board-col-count">{column.tasks.length}</span>
              </header>
              <div className="pm-board-col-body">
                {composerStatus === column.status ? (
                  <div className="pm-board-composer">
                    <textarea
                      autoFocus
                      value={composerText}
                      onChange={event => setComposerText(event.target.value)}
                      onKeyDown={event => {
                        if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); submitComposer(column.status) }
                        if (event.key === 'Escape') { setComposerStatus(null); setComposerText('') }
                      }}
                      placeholder={`Add a task to ${column.status}...`}
                    />
                    <div className="pm-board-composer-actions">
                      <button type="button" className="pm-primary" onClick={() => submitComposer(column.status)}>Add task</button>
                      <button type="button" className="pm-control" onClick={() => { setComposerStatus(null); setComposerText('') }}>Cancel</button>
                    </div>
                  </div>
                ) : (
                  <button type="button" className="pm-board-col-add" onClick={() => startComposer(column.status)}><Plus size={15} /> New task</button>
                )}
                {column.tasks.map(task => (
                  <TaskCard key={task.id} state={state} task={task} draggable onDrag={() => onDrag(task.id)} onOpen={onOpenTask} onEdit={onEditTask} onArchive={onArchiveTask} onDelete={onDeleteTask} />
                ))}
                {column.tasks.length === 0 && composerStatus !== column.status && (
                  <div className="pm-board-col-empty">
                    <span><ListChecks size={16} /></span>
                    <strong>{filterActive ? 'No matching tasks' : `No ${column.status.toLowerCase()} tasks`}</strong>
                    <p>{filterActive ? 'Try clearing filters to see more.' : kanbanEmptyHint(column.status)}</p>
                  </div>
                )}
              </div>
            </section>
          ))}
        </div>
      </div>
    </div>
  )
}

function TaskCard({ state, task, draggable, onDrag, onOpen, onEdit, onArchive, onDelete }: { state: ProjectManagementState; task: ProjectTask; draggable?: boolean; onDrag?: () => void; onOpen?: (taskId: string) => void; onEdit: (task: ProjectTask) => void; onArchive: (taskId: string) => void; onDelete: (taskId: string) => void }) {
  const member = state.members.find(item => item.id === task.assigneeId)
  const project = state.projects.find(item => item.id === task.projectId)
  const commentCount = Math.max(task.comments, state.taskComments.filter(comment => comment.taskId === task.id).length)
  const attachmentCount = Math.max(task.attachments, state.taskAttachments.filter(attachment => attachment.taskId === task.id).length)
  const evidenceCount = state.taskAttachments.filter(attachment => attachment.taskId === task.id && attachment.evidence).length
  const checklistItems = state.taskChecklists.filter(item => item.taskId === task.id)
  const checklistDone = checklistItems.filter(item => item.done).length
  const assigneeTitle = member?.name || 'Unassigned'
  const assigneeLabel = taskCardAssigneeLabel(member?.name)
  const openTask = () => onOpen ? onOpen(task.id) : onEdit(task)
  const openTaskFromKeyboard = (event: React.KeyboardEvent<HTMLElement>) => {
    if (event.key !== 'Enter' && event.key !== ' ') return
    event.preventDefault()
    openTask()
  }
  return (
    <article className={draggable ? 'pm-task-card is-draggable' : 'pm-task-card'} draggable={draggable} onDragStart={onDrag} onClick={openTask} onKeyDown={openTaskFromKeyboard} role="button" tabIndex={0} aria-label={`Open task ${task.title}`}>
      <div>
        <strong>{task.title}</strong>
        <small>{project?.name}</small>
        <div className="pm-task-actions" onMouseDown={event => event.stopPropagation()} onClick={event => event.stopPropagation()}>
          <button type="button" className="pm-icon-btn" onClick={() => onEdit(task)} aria-label={`Edit ${task.title}`}><Pencil size={14} /></button>
          <button type="button" className="pm-icon-btn" onClick={() => { if (window.confirm(`Archive ${task.title}?`)) onArchive(task.id) }} aria-label={`Archive ${task.title}`}><Archive size={14} /></button>
          <button type="button" className="pm-icon-btn danger" onClick={() => { if (window.confirm(`Delete ${task.title}? This removes related time logs.`)) onDelete(task.id) }} aria-label={`Delete ${task.title}`}><Trash2 size={14} /></button>
        </div>
      </div>
      <TaskDescriptionViewer value={task.description} compact />
      <div className="pm-chip-row"><Pill value={task.priority} /><Pill value={task.status} />{task.labels.map(label => <span key={label}>{label}</span>)}{task.dependencies.length > 0 && <span><ListChecks size={13} /> {task.dependencies.length}</span>}{checklistItems.length > 0 && <span><CheckSquare size={13} /> {checklistDone}/{checklistItems.length}</span>}{task.recurrence && task.recurrence !== 'None' && <span><Repeat2 size={13} /> {task.recurrence}</span>}<span><MessageSquare size={13} /> {commentCount}</span><span><Paperclip size={13} /> {attachmentCount}</span>{evidenceCount > 0 && <span><FileCheck2 size={13} /> {evidenceCount}</span>}</div>
      <footer><Avatar member={member} /><span className="pm-task-card-assignee" title={assigneeTitle}>{assigneeLabel}</span><span className="pm-task-card-date" title={formatDate(task.dueDate)}>{formatTaskCardDate(task.dueDate)}</span></footer>
    </article>
  )
}

export function TaskCollaborationPanel({
  state,
  task,
  commentDraft,
  checklistDraft,
  attachmentNote,
  evidenceMode,
  onCommentDraft,
  onChecklistDraft,
  onAttachmentNote,
  onEvidenceMode,
  onAddComment,
  onAddChecklistItem,
  onToggleChecklistItem,
  onDeleteChecklistItem,
  onAttachFiles,
  onDeleteAttachment,
}: {
  state: ProjectManagementState
  task: ProjectTask
  commentDraft: string
  checklistDraft: string
  attachmentNote: string
  evidenceMode: boolean
  onCommentDraft: (value: string) => void
  onChecklistDraft: (value: string) => void
  onAttachmentNote: (value: string) => void
  onEvidenceMode: (value: boolean) => void
  onAddComment: (event: FormEvent) => void
  onAddChecklistItem: (event: FormEvent) => void
  onToggleChecklistItem: (itemId: string, done: boolean) => void
  onDeleteChecklistItem: (itemId: string) => void
  onAttachFiles: (event: ChangeEvent<HTMLInputElement>) => void
  onDeleteAttachment: (attachmentId: string) => void
}) {
  const comments = state.taskComments.filter(comment => comment.taskId === task.id)
  const attachments = state.taskAttachments.filter(attachment => attachment.taskId === task.id)
  const checklistItems = state.taskChecklists.filter(item => item.taskId === task.id)
  const checklistDone = checklistItems.filter(item => item.done).length
  const evidence = attachments.filter(attachment => attachment.evidence)
  return (
    <section className="pm-task-collab">
      <div className="pm-task-collab-head">
        <div>
          <h3>Collaboration</h3>
          <p>Track subtasks, comments, files, and completion evidence.</p>
        </div>
        <span>{comments.length} comments · {attachments.length} files</span>
      </div>
      <div className="pm-task-collab-grid">
        <div className="pm-task-panel">
          <SectionTitle title="Subtasks" action={`${checklistDone}/${checklistItems.length}`} />
          <form className="pm-task-comment-form" onSubmit={onAddChecklistItem}>
            <input value={checklistDraft} onChange={event => onChecklistDraft(event.target.value)} placeholder="Add checklist item..." />
            <button type="submit" className="pm-control">Add</button>
          </form>
          <div className="pm-checklist-list">
            {checklistItems.length ? checklistItems.map(item => (
              <label key={item.id}>
                <input type="checkbox" checked={item.done} onChange={event => onToggleChecklistItem(item.id, event.target.checked)} />
                <span>{item.title}</span>
                <button type="button" onClick={() => onDeleteChecklistItem(item.id)} aria-label={`Delete ${item.title}`}><Trash2 size={13} /></button>
              </label>
            )) : <EmptyState title="No subtasks yet" body="Checklist items for this task will appear here." />}
          </div>
        </div>
        <div className="pm-task-panel">
          <SectionTitle title="Comments" action={String(comments.length)} />
          <form className="pm-task-comment-form" onSubmit={onAddComment}>
            <input value={commentDraft} onChange={event => onCommentDraft(event.target.value)} placeholder="Add a task comment..." />
            <button type="submit" className="pm-control">Comment</button>
          </form>
          <div className="pm-task-comment-list">
            {comments.length ? comments.map(comment => {
              const actor = state.members.find(member => member.id === comment.actorId)
              return <article key={comment.id}><Avatar member={actor} /><div><strong><LinkedCommentText text={comment.body} /></strong><small>{actor?.name || 'WiseFlow'} - {new Date(comment.createdAt).toLocaleString('en-US', { month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit' })}</small></div></article>
            }) : <EmptyState title="No comments yet" body="Task discussion will appear here." />}
          </div>
        </div>
        <div className="pm-task-panel">
          <SectionTitle title="Files & Evidence" action={`${attachments.length} files`} />
          <div className="pm-task-upload">
            <label className="pm-check"><input type="checkbox" checked={evidenceMode} onChange={event => onEvidenceMode(event.target.checked)} /> Completion evidence</label>
            <input value={attachmentNote} onChange={event => onAttachmentNote(event.target.value)} placeholder="Optional file note" />
            <label className="pm-upload-button"><UploadCloud size={15} /> Attach files<input type="file" multiple accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.csv,.txt" onChange={onAttachFiles} /></label>
          </div>
          {evidence.length > 0 && (
            <div className="pm-evidence-strip">
              {evidence.slice(0, 4).map(item => {
                const fileUrl = item.fileUrl || item.dataUrl
                return item.mimeType.startsWith('image/') && fileUrl ? <span key={item.id} className="pm-evidence-thumb" style={{ backgroundImage: `url(${fileUrl})` }} aria-label={item.name} /> : <span key={item.id}><FileCheck2 size={16} />{item.fileType}</span>
              })}
            </div>
          )}
          <div className="pm-task-file-list">
            {attachments.length ? attachments.map(attachment => {
              const owner = state.members.find(member => member.id === attachment.ownerId)
              const Icon = attachment.evidence ? FileCheck2 : attachment.mimeType.startsWith('image/') ? Camera : FileText
              return (
                <article key={attachment.id}>
                  <Icon size={16} />
                  <div>
                    <strong>{attachment.name}</strong>
                    <small>{attachment.fileType} - {attachment.size} - {owner?.name || 'WiseFlow'}</small>
                    {attachment.note && <em>{attachment.note}</em>}
                  </div>
                  {attachment.evidence && <Pill value="Evidence" />}
                  {(attachment.fileUrl || attachment.dataUrl) && <a className="pm-icon-btn" href={attachment.fileUrl || attachment.dataUrl} download={attachment.name} aria-label={`Download ${attachment.name}`}><Download size={14} /></a>}
                  <button type="button" className="pm-icon-btn danger" onClick={() => { if (window.confirm(`Remove ${attachment.name}?`)) onDeleteAttachment(attachment.id) }} aria-label={`Remove ${attachment.name}`}><Trash2 size={14} /></button>
                </article>
              )
            }) : <EmptyState title="No task files" body="Photos, files, and completion evidence will appear here." />}
          </div>
        </div>
      </div>
    </section>
  )
}

export function ProjectResourcesTab({ state }: { state: ProjectManagementState }) {
  if (!state.members.length) return <section className="pm-card"><SectionTitle title="Team Workload" /><EmptyState title="No team members found" body="Employees or account users will appear here when connected." /></section>
  return <section className="pm-card"><SectionTitle title="Team Workload" action={`${state.members.length} ${state.members.length === 1 ? 'member' : 'members'}`} /><div className="pm-table-wrap"><table className="pm-table"><thead><tr>{['Team Member', 'Role', 'Assigned Projects', 'Workload', 'Availability'].map(head => <th key={head}>{head}</th>)}</tr></thead><tbody>{workloadByMember(state).map(item => { const assignedProjects = state.projects.filter(project => project.managerId === item.member.id || project.memberIds.includes(item.member.id)); return <tr key={item.member.id}><td><span className="pm-workload-member"><Avatar member={item.member} /><strong>{item.member.name}</strong></span></td><td>{item.member.role}</td><td>{assignedProjects.map(project => project.name).join(', ') || '-'}</td><td><span className="pm-workload-cell"><Progress value={item.workload} /><b>{Math.round(item.workload)}%</b></span></td><td>{item.member.availability}%</td></tr> })}</tbody></table></div></section>
}

export function BudgetTab({ state, budget }: { state: ProjectManagementState; budget: ReturnType<typeof budgetSummary> }) {
  const money = (value: number) => formatCurrency(value, 'PHP')
  const overBudget = budget.remaining < 0
  const used = budget.spent + budget.committed
  const utilization = percentOf(used, budget.total)

  const breakdown = state.projects.reduce(
    (acc, project) => ({
      direct: acc.direct + (project.budgetBreakdown?.direct || 0),
      indirect: acc.indirect + (project.budgetBreakdown?.indirect || 0),
      contingency: acc.contingency + (project.budgetBreakdown?.contingency || 0),
      other: acc.other + (project.budgetBreakdown?.other || 0),
    }),
    { direct: 0, indirect: 0, contingency: 0, other: 0 },
  )
  const categories = [
    { label: 'Direct cost', amount: breakdown.direct },
    { label: 'Indirect cost', amount: breakdown.indirect },
    { label: 'Contingency', amount: breakdown.contingency },
    { label: 'Other', amount: breakdown.other },
  ].filter(row => row.amount > 0)
  const allocated = categories.reduce((sum, row) => sum + row.amount, 0)
  const unallocated = Math.max(budget.total - allocated, 0)
  const estimateRows = categories.length
    ? (unallocated > 0 ? [...categories, { label: 'Unallocated', amount: unallocated }] : categories)
    : [{ label: 'Total budget', amount: budget.total }]
  const estimatedTotal = estimateRows.reduce((sum, row) => sum + row.amount, 0) || budget.total
  const rows = estimateRows.map(row => {
    const share = estimatedTotal > 0 ? row.amount / estimatedTotal : 0
    const actual = used * share
    return { label: row.label, estimated: row.amount, actual, remaining: row.amount - actual }
  })

  const tiles = [
    { label: 'Total Budget', value: budget.total, hint: 'Approved project budget', negative: false },
    { label: 'Spent', value: budget.spent, hint: `${percentOf(budget.spent, budget.total)}% of budget`, negative: false },
    { label: 'Committed', value: budget.committed, hint: `${percentOf(budget.committed, budget.total)}% of budget`, negative: false },
    { label: 'Remaining', value: budget.remaining, hint: overBudget ? 'Over budget' : `${percentOf(budget.remaining, budget.total)}% available`, negative: overBudget },
  ]

  return (
    <div className="pm-budget-page">
      <section className="pm-budget-tiles">
        {tiles.map(tile => (
          <article key={tile.label} className="pm-budget-tile">
            <small>{tile.label}</small>
            <strong className={tile.negative ? 'negative' : undefined}>{formatMoney(tile.value)}</strong>
            <span>{tile.hint}</span>
          </article>
        ))}
      </section>

      <section className="pm-card pm-budget-summary-card">
        <SectionTitle title="Cost Summary" action={`${utilization}% utilized`} />
        <div className="pm-budget-bar" role="img" aria-label={`${utilization}% of budget used`}>
          <span className="is-spent" style={{ width: `${percentOf(budget.spent, budget.total)}%` }} />
          <span className="is-committed" style={{ width: `${percentOf(budget.committed, budget.total)}%` }} />
        </div>
        <div className="pm-budget-bar-legend">
          <span><i className="is-spent" /> Spent {formatMoney(budget.spent)}</span>
          <span><i className="is-committed" /> Committed {formatMoney(budget.committed)}</span>
          <span><i className="is-remaining" /> Remaining {formatMoney(Math.max(budget.remaining, 0))}</span>
        </div>

        <div className="pm-table-wrap">
          <table className="pm-table pm-budget-table">
            <thead>
              <tr>
                <th>Cost Category</th>
                <th className="pm-num">Estimated</th>
                <th className="pm-num">Actual / Committed</th>
                <th className="pm-num">Remaining</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(row => (
                <tr key={row.label}>
                  <td><strong>{row.label}</strong></td>
                  <td className="pm-num">{money(row.estimated)}</td>
                  <td className="pm-num">{money(row.actual)}</td>
                  <td className={row.remaining < 0 ? 'pm-num negative' : 'pm-num'}>{money(row.remaining)}</td>
                </tr>
              ))}
              <tr className="pm-budget-subtotal">
                <td>Subtotal</td>
                <td className="pm-num">{money(estimatedTotal)}</td>
                <td className="pm-num">{money(used)}</td>
                <td className={budget.remaining < 0 ? 'pm-num negative' : 'pm-num'}>{money(estimatedTotal - used)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="pm-budget-totals">
          <div><span>Project Budget</span><strong>{money(budget.total)}</strong></div>
          <div><span>Total Spent</span><strong>{money(budget.spent)}</strong></div>
          <div><span>Total Committed</span><strong>{money(budget.committed)}</strong></div>
          <div className="pm-budget-grand"><span>Remaining Amount</span><strong className={overBudget ? 'negative' : undefined}>{money(budget.remaining)}</strong></div>
        </div>
      </section>
    </div>
  )
}

export function DocumentsTab({ state }: { state: ProjectManagementState }) {
  if (!state.documents.length) return <section className="pm-card"><SectionTitle title="Documents" /><EmptyState title="No documents uploaded" body="Project files and document versions will appear here." /></section>
  return <section className="pm-card"><SectionTitle title="Documents" /><div className="pm-table-wrap"><table className="pm-table"><thead><tr>{['Files', 'Folders', 'File Type', 'Uploaded By', 'Last Updated', 'Actions'].map(head => <th key={head}>{head}</th>)}</tr></thead><tbody>{state.documents.map(doc => { const owner = state.members.find(member => member.id === doc.ownerId); return <tr key={doc.id}><td><FileText size={15} /> <strong>{doc.name}</strong><small>{doc.size} - {doc.version}</small></td><td>{doc.folder}</td><td><Pill value={doc.type} /></td><td>{owner?.name || '-'}</td><td>{formatDate(doc.updatedAt)}</td><td><button type="button" className="pm-icon-btn" aria-label={`Open document actions for ${doc.name}`}><MoreHorizontal size={16} /></button></td></tr> })}</tbody></table></div></section>
}

function projectDetailDraft(project: ProjectRecord) {
  return {
    name: project.name,
    code: project.code || projectDisplayCode(project),
    clientId: project.clientId,
    projectType: project.projectType || project.department,
    contractType: project.contractType || '',
    description: project.description,
    status: project.status,
    health: project.health,
    priority: project.priority,
    progress: String(project.progress),
    budget: String(project.budget),
    spent: String(project.spent),
    committed: String(project.committed),
    startDate: project.startDate,
    dueDate: project.dueDate,
    managerId: project.managerId,
    memberIds: project.memberIds,
    tags: project.tags.join(', '),
    department: project.department,
    address: project.location?.address || '',
    city: project.location?.city || '',
    province: project.location?.province || '',
    postalCode: project.location?.postalCode || '',
    directCost: project.budgetBreakdown?.direct === undefined ? '' : String(project.budgetBreakdown.direct),
    indirectCost: project.budgetBreakdown?.indirect === undefined ? '' : String(project.budgetBreakdown.indirect),
    contingencyCost: project.budgetBreakdown?.contingency === undefined ? '' : String(project.budgetBreakdown.contingency),
    otherCost: project.budgetBreakdown?.other === undefined ? '' : String(project.budgetBreakdown.other),
    allowTaskCreation: project.settings?.allowTaskCreation ?? true,
    enableBudgetTracking: project.settings?.enableBudgetTracking ?? true,
    enableTimeTracking: project.settings?.enableTimeTracking ?? true,
    enableDocumentManagement: project.settings?.enableDocumentManagement ?? true,
    opportunityKey: opportunityKey(project.opportunitySource, project.opportunityId),
    thumbnailDataUrl: project.thumbnailDataUrl || '',
    thumbnailAssetId: project.thumbnailAssetId || '',
    thumbnailName: '',
  }
}

function projectDisplayCode(project: ProjectRecord) {
  const compact = project.id.replace(/^prj-/i, '').replace(/[^a-z0-9]/gi, '').toUpperCase()
  return `PRJ-${compact || project.name.replace(/[^a-z0-9]+/gi, '').slice(0, 6).toUpperCase() || 'PROJECT'}`
}

function projectStatusLabel(status: ProjectStatus) {
  return status === 'Active' ? 'In Progress' : status
}

function projectHealthLabel(project: ProjectRecord) {
  if (project.health === 'Good') return 'On Track'
  return project.health
}

function percentOf(value: number, total: number) {
  if (!total || total <= 0) return 0
  return Math.max(0, Math.min(100, Math.round((value / total) * 100)))
}

function formatActivityDate(value: string) {
  const date = new Date(value)
  if (!Number.isFinite(date.getTime())) return value
  return date.toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })
}

function ProjectDetailStat({ title, value, sub, icon: Icon, tone = '#3fcf54' }: { title: string; value: string; sub?: string; icon: LucideIcon; tone?: string }) {
  return (
    <article className="pm-detail-stat">
      <div className="pm-detail-stat-head"><span>{title}</span><i style={{ color: tone }}><Icon size={16} /></i></div>
      <strong>{value}</strong>
      {sub && <small>{sub}</small>}
    </article>
  )
}

function ProjectDetailValue({ label, value }: { label: string; value: React.ReactNode }) {
  return <p className="pm-detail-value"><span>{label}</span><strong>{value}</strong></p>
}

function ProjectDetailBar({ label, value, max, tone = '#3fcf54' }: { label: string; value: number; max: number; tone?: string }) {
  return (
    <div className="pm-detail-budget-bar">
      <span>{label}</span>
      <i><b style={{ width: `${percentOf(value, max)}%`, background: tone }} /></i>
      <strong>{formatMoney(value)}</strong>
    </div>
  )
}

function ProjectBudgetOverview({ budget }: { budget: ReturnType<typeof budgetSummary> }) {
  const total = Math.max(budget.total, 0)
  const spent = Math.max(budget.spent, 0)
  const committed = Math.max(budget.committed, 0)
  const remaining = Math.max(budget.remaining, 0)
  const spentDeg = total ? (spent / total) * 360 : 0
  const committedDeg = total ? (committed / total) * 360 : 0
  const remainingDeg = total ? (remaining / total) * 360 : 0
  const donutStyle = {
    background: `conic-gradient(#3fcf54 0deg ${spentDeg}deg, #3b82f6 ${spentDeg}deg ${spentDeg + committedDeg}deg, #facc15 ${spentDeg + committedDeg}deg ${spentDeg + committedDeg + remainingDeg}deg, #e5e7eb ${spentDeg + committedDeg + remainingDeg}deg 360deg)`,
  }
  const rows = [
    { label: 'Spent', value: spent, color: '#3fcf54' },
    { label: 'Committed', value: committed, color: '#3b82f6' },
    { label: 'Remaining', value: remaining, color: '#facc15' },
  ]

  return (
    <section className="pm-detail-panel pm-detail-budget-overview">
      <div className="pm-detail-panel-head"><h3>Budget Overview</h3><button type="button">View full report</button></div>
      <div className="pm-detail-budget-content">
        <div className="pm-detail-budget-main">
          <div className="pm-detail-donut" style={donutStyle}>
            <div><strong>{formatMoney(total)}</strong><span>Total Budget</span></div>
          </div>
          <div className="pm-detail-budget-legend">
            {rows.map(row => (
              <p key={row.label}><i style={{ background: row.color }} /><span>{row.label}</span><strong>{formatMoney(row.value)} ({percentOf(row.value, total)}%)</strong></p>
            ))}
          </div>
        </div>
        <div className="pm-detail-budget-bars">
          <h4>Budget vs Actual</h4>
          <ProjectDetailBar label="Total Budget" value={total} max={total} tone="#d4d4d8" />
          <ProjectDetailBar label="Actual Spent" value={spent} max={total} tone="#3fcf54" />
          <ProjectDetailBar label="Remaining" value={remaining} max={total} tone="#d4d4d8" />
        </div>
      </div>
    </section>
  )
}

function ProjectTimelinePreview({ project, milestones }: { project: ProjectRecord; milestones: ProjectMilestone[] }) {
  const sorted = [...milestones].sort((a, b) => new Date(`${a.dueDate}T00:00:00`).getTime() - new Date(`${b.dueDate}T00:00:00`).getTime())
  const items = [
    { id: `${project.id}-start`, title: 'Project Start', date: project.startDate, status: 'Done' as MilestoneStatus },
    ...sorted,
    { id: `${project.id}-due`, title: 'Project Due', date: project.dueDate, status: project.status === 'Completed' ? 'Done' as MilestoneStatus : 'Pending' as MilestoneStatus },
  ]

  return (
    <section className="pm-detail-panel pm-detail-timeline-card">
      <div className="pm-detail-panel-head"><h3>Project Timeline</h3><button type="button">View full schedule</button></div>
      <div className="pm-detail-timeline-list">
        {items.slice(0, 6).map(item => (
          <article key={item.id} className={`state-${item.status.toLowerCase().replaceAll(' ', '-')}`}>
            <i />
            <div><strong>{item.title}</strong><span>{formatDate('dueDate' in item ? item.dueDate : item.date)}</span></div>
            <em>{item.status === 'Done' ? 'Completed' : item.status === 'In Progress' ? 'In Progress' : 'Upcoming'}</em>
          </article>
        ))}
      </div>
    </section>
  )
}

function ProjectPhotoGrid({ project, attachments, onViewAll }: { project: ProjectRecord; attachments: ProjectManagementState['taskAttachments']; onViewAll: () => void }) {
  const thumbnailSource = useProjectThumbnailSource(project)
  const photos = [
    ...(thumbnailSource ? [{ id: `${project.id}-thumbnail`, name: `${project.name} thumbnail`, dataUrl: thumbnailSource }] : []),
    ...attachments
      .filter(attachment => attachment.mimeType.startsWith('image/') && (attachment.fileUrl || attachment.dataUrl))
      .map(attachment => ({ id: attachment.id, name: attachment.name, dataUrl: attachment.fileUrl || attachment.dataUrl || '' })),
  ].slice(0, 6)
  return (
    <section className="pm-detail-panel pm-detail-photos">
      <div className="pm-detail-panel-head"><h3>Project Photos</h3><button type="button" onClick={onViewAll}>View all</button></div>
      {photos.length ? (
        <div className="pm-detail-photo-grid">
          {photos.map(photo => (
            <span key={photo.id} className="pm-detail-photo-tile" style={{ backgroundImage: `url(${photo.dataUrl})` }} aria-label={photo.name} />
          ))}
        </div>
      ) : (
        <EmptyState title="No project photos" body="Upload a project thumbnail or attach image evidence to tasks." />
      )}
    </section>
  )
}

function ProjectFilesTab({ state }: { state: ProjectManagementState }) {
  const attachments = state.taskAttachments
  if (!state.documents.length && !attachments.length) {
    return <section className="pm-card"><SectionTitle title="Files" /><EmptyState title="No files uploaded" body="Project documents and task attachments will appear here." /></section>
  }
  return (
    <section className="pm-card">
      <SectionTitle title="Files" />
      <div className="pm-table-wrap">
        <table className="pm-table">
          <thead><tr>{['File', 'Source', 'File Type', 'Uploaded By', 'Last Updated', 'Actions'].map(head => <th key={head}>{head}</th>)}</tr></thead>
          <tbody>
            {state.documents.map(doc => {
              const owner = state.members.find(member => member.id === doc.ownerId)
              return (
                <tr key={doc.id}>
                  <td><FileText size={15} /> <strong>{doc.name}</strong><small>{doc.size} - {doc.version}</small></td>
                  <td>{doc.folder}</td>
                  <td><Pill value={doc.type} /></td>
                  <td>{owner?.name || '-'}</td>
                  <td>{formatDate(doc.updatedAt)}</td>
                  <td><button type="button" className="pm-icon-btn" aria-label={`Open document actions for ${doc.name}`}><MoreHorizontal size={16} /></button></td>
                </tr>
              )
            })}
            {attachments.map(attachment => {
              const owner = state.members.find(member => member.id === attachment.ownerId)
              const task = state.tasks.find(item => item.id === attachment.taskId)
              const Icon = attachment.mimeType.startsWith('image/') ? Camera : attachment.evidence ? FileCheck2 : FileText
              return (
                <tr key={attachment.id}>
                  <td><Icon size={15} /> <strong>{attachment.name}</strong><small>{attachment.size}{attachment.evidence ? ' - Evidence' : ''}</small></td>
                  <td>{task?.title || 'Task attachment'}</td>
                  <td><Pill value={attachment.fileType || 'File'} /></td>
                  <td>{owner?.name || '-'}</td>
                  <td>{formatDate(attachment.uploadedAt.slice(0, 10))}</td>
                  <td>{attachment.fileUrl || attachment.dataUrl ? <a className="pm-icon-btn" href={attachment.fileUrl || attachment.dataUrl} download={attachment.name} aria-label={`Download ${attachment.name}`}><Download size={15} /></a> : <button type="button" className="pm-icon-btn" aria-label={`Open file actions for ${attachment.name}`}><MoreHorizontal size={16} /></button>}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </section>
  )
}

function ProjectTeamPreview({ members }: { members: ProjectManagementState['members'] }) {
  return (
    <section className="pm-detail-panel pm-detail-team-card">
      <div className="pm-detail-panel-head"><h3>Team Members</h3><button type="button">View all</button></div>
      <div className="pm-detail-team-list">
        {members.length ? members.slice(0, 5).map(member => (
          <article key={member.id}>
            <Avatar member={member} />
            <div><strong>{member.name}</strong><span>{member.role}</span></div>
            <button type="button" aria-label={`Email ${member.name}`}><Mail size={15} /></button>
            <button type="button" aria-label={`Call ${member.name}`}><Phone size={15} /></button>
          </article>
        )) : <EmptyState title="No team members" body="Assign team members in Settings." />}
      </div>
    </section>
  )
}

function ProjectActivityPreview({ state, activities }: { state: ProjectManagementState; activities: ProjectManagementState['activities'] }) {
  return (
    <section className="pm-detail-panel pm-detail-activity-card">
      <div className="pm-detail-panel-head"><h3>Recent Activity</h3><button type="button">View all</button></div>
      <div className="pm-detail-activity-list">
        {activities.length ? activities.slice(0, 5).map(activity => {
          const actor = state.members.find(member => member.id === activity.actorId)
          return (
            <article key={activity.id}>
              <span><FileText size={16} /></span>
              <div><strong>{activity.action}</strong><small>{actor?.name || 'WiseFlow'} - {formatActivityDate(activity.createdAt)}</small></div>
            </article>
          )
        }) : <EmptyState title="No activity yet" body="Project updates will appear here." />}
      </div>
    </section>
  )
}

export function ProjectDetails({
  state,
  opportunities,
  project,
  active,
  onTab,
  onClose,
  onAddTask,
  onUpdate,
  onOpenTask,
  onEditTask,
  onArchiveTask,
  onDeleteTask,
  onUpdateTaskStatus,
  onQuickAddTask,
  onDragTask,
  onDropTask,
  onArchive,
  onRestore,
  onDelete,
  onAddNote,
  onCreateMilestone,
  onUpdateMilestone,
  onUpdateMilestoneStatus,
  onDeleteMilestone,
}: {
  state: ProjectManagementState
  opportunities: ProjectSalesOpportunity[]
  project: ProjectRecord
  active: string
  onTab: (tab: string) => void
  onClose: () => void
  onAddTask: (projectId: string) => void
  onUpdate: (projectId: string, patch: ProjectUpdateDraft, action?: string) => void
  onOpenTask: (taskId: string) => void
  onEditTask: (task: ProjectTask) => void
  onArchiveTask: (taskId: string) => void
  onDeleteTask: (taskId: string) => void
  onUpdateTaskStatus: (taskId: string, status: TaskStatus) => void
  onQuickAddTask?: (projectId: string, status: TaskStatus, title: string) => void
  onDragTask: (taskId: string) => void
  onDropTask: (status: TaskStatus) => void
  onArchive: (projectId: string) => void
  onRestore: (projectId: string) => void
  onDelete: (projectId: string) => void
  onAddNote: (projectId: string, note: string) => void
  onCreateMilestone: (draft: MilestoneDraft) => void
  onUpdateMilestone: (milestoneId: string, patch: MilestoneUpdateDraft) => void
  onUpdateMilestoneStatus: (milestoneId: string, status: MilestoneStatus) => void
  onDeleteMilestone: (milestoneId: string) => void
}) {
  const tasks = state.tasks.filter(task => task.projectId === project.id && !task.archivedAt)
  const taskIds = new Set(tasks.map(task => task.id))
  const activities = state.activities.filter(a => a.projectId === project.id)
  const milestones = state.milestones.filter(milestone => milestone.projectId === project.id)
  const documents = state.documents.filter(document => document.projectId === project.id)
  const timeLogs = state.timeLogs.filter(log => log.projectId === project.id && taskIds.has(log.taskId))
  const taskComments = state.taskComments.filter(comment => taskIds.has(comment.taskId))
  const taskChecklists = state.taskChecklists.filter(item => taskIds.has(item.taskId))
  const taskAttachments = state.taskAttachments.filter(attachment => taskIds.has(attachment.taskId))
  const projectState = { ...state, projects: [project], tasks, milestones, documents, timeLogs, taskComments, taskChecklists, taskAttachments, activities }
  const clientName = projectClientName(project, state.clients)
  const manager = state.members.find(item => item.id === project.managerId)
  const linkedOpportunity = findOpportunityByKey(opportunities, opportunityKey(project.opportunitySource, project.opportunityId))
  const budget = { total: project.budget, spent: project.spent, committed: project.committed, remaining: project.budget - project.spent - project.committed }
  const [draft, setDraft] = useState(() => projectDetailDraft(project))
  const [noteDraft, setNoteDraft] = useState('')
  const [savedAt, setSavedAt] = useState<number | null>(null)
  const [projectLinkCopiedAt, setProjectLinkCopiedAt] = useState<number | null>(null)
  const [projectActionMenuOpen, setProjectActionMenuOpen] = useState(false)
  const projectActionMenuRef = useRef<HTMLDivElement | null>(null)
  const existingThumbnailSource = useProjectThumbnailSource(project)
  const draftThumbnailSource = draft.thumbnailDataUrl || existingThumbnailSource
  const teamMemberIds = new Set(draft.memberIds)
  const draftOpportunity = findOpportunityByKey(opportunities, draft.opportunityKey)
  const draftClient = draft.clientId ? resolveProjectClient({ ...project, clientId: draft.clientId }, state.clients) : undefined
  const draftClientId = draftClient?.id || state.clients[0]?.id || 'client-local'

  const departmentOptions = Array.from(new Set([...projectDepartmentOptions, project.department, draft.department].filter(Boolean)))
  const detailProjectTypeOptions = Array.from(new Set([...projectTypeOptions, ...state.projects.map(item => item.projectType || item.department), draft.projectType].filter(Boolean)))
  const detailContractTypeOptions = Array.from(new Set([...contractTypeOptions, ...state.projects.map(item => item.contractType || ''), draft.contractType].filter(Boolean)))
  const workflowSettings = [
    { key: 'allowTaskCreation' as const, title: 'Allow task creation', body: 'Team members can add and manage tasks under this project.' },
    { key: 'enableBudgetTracking' as const, title: 'Enable budget tracking', body: 'Show budget, spent, committed, and remaining cost controls.' },
    { key: 'enableTimeTracking' as const, title: 'Enable time tracking', body: 'Allow logged hours and labor tracking against project tasks.' },
    { key: 'enableDocumentManagement' as const, title: 'Enable document management', body: 'Allow files, task evidence, and project documents to be attached.' },
  ]
  const completedTasks = tasks.filter(task => task.status === 'Done').length
  const remainingTasks = Math.max(tasks.length - completedTasks, 0)
  const remainingBudget = Math.max(budget.remaining, 0)
  const spentPercent = percentOf(project.spent, project.budget)
  const teamMembers = Array.from(new Set([project.managerId, ...project.memberIds]))
    .map(memberId => state.members.find(member => member.id === memberId))
    .filter((member): member is ProjectManagementState['members'][number] => Boolean(member))
  const latestUpdate = project.updatedAt || activities[0]?.createdAt || documents[0]?.updatedAt || project.startDate
  const projectLocation = [project.location?.address, project.location?.city, project.location?.province].filter(Boolean).join(', ') || 'No location assigned'
  const selectedDetailTab = active === 'Details' ? 'Settings'
    : active === 'Planning' ? 'Schedule'
      : active === 'Activity Logs' ? 'Reports'
        : active
  const projectLinkCopied = Boolean(projectLinkCopiedAt)

  useEffect(() => {
    if (!projectActionMenuOpen) return
    const closeOnOutsideTap = (event: PointerEvent) => {
      const target = event.target as Node | null
      if (target && projectActionMenuRef.current?.contains(target)) return
      setProjectActionMenuOpen(false)
    }
    document.addEventListener('pointerdown', closeOnOutsideTap)
    return () => document.removeEventListener('pointerdown', closeOnOutsideTap)
  }, [projectActionMenuOpen])

  const buildProjectLink = () => {
    if (typeof window === 'undefined') {
      return `/project-management/projects?project=${encodeURIComponent(project.id)}${selectedDetailTab === 'Overview' ? '' : `&detail=${encodeURIComponent(selectedDetailTab)}`}`
    }
    const url = new URL(window.location.href)
    url.searchParams.set('project', project.id)
    if (selectedDetailTab === 'Overview') url.searchParams.delete('detail')
    else url.searchParams.set('detail', selectedDetailTab)
    url.hash = ''
    return url.toString()
  }

  const copyProjectLink = async () => {
    const href = buildProjectLink()
    try {
      await navigator.clipboard.writeText(href)
      setProjectLinkCopiedAt(Date.now())
      window.setTimeout(() => setProjectLinkCopiedAt(null), 1600)
    } catch {
      window.prompt('Project link', href)
    }
  }

  const runProjectAction = (action: () => void) => {
    setProjectActionMenuOpen(false)
    action()
  }

  const archiveProject = () => runProjectAction(() => {
    if (!project.archivedAt && window.confirm(`Archive ${project.name}?`)) onArchive(project.id)
  })

  const restoreProject = () => runProjectAction(() => {
    if (project.archivedAt && window.confirm(`Restore ${project.name} to active projects?`)) onRestore(project.id)
  })

  const deleteProject = () => runProjectAction(() => {
    if (window.confirm(`Delete ${project.name} and all related records?`)) onDelete(project.id)
  })

  const applyDetailOpportunity = (key: string) => {
    const opportunity = findOpportunityByKey(opportunities, key)
    setDraft(prev => {
      if (!opportunity) return { ...prev, opportunityKey: '' }
      const clientId = resolveOpportunityClientId(opportunity, state.clients) || prev.clientId
      return {
        ...prev,
        opportunityKey: key,
        clientId,
        budget: Number(prev.budget) > 0 ? prev.budget : String(opportunity.value || 0),
      }
    })
  }

  const attachDetailProjectThumbnail = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    const thumbnail = await prepareProjectThumbnail(file)
    setDraft(prev => ({
      ...prev,
      thumbnailDataUrl: thumbnail.dataUrl,
      thumbnailAssetId: thumbnail.assetId,
      thumbnailName: thumbnail.name,
    }))
    event.target.value = ''
  }

  const dropDetailProjectThumbnail = async (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault()
    const file = event.dataTransfer.files?.[0]
    if (!file) return
    const thumbnail = await prepareProjectThumbnail(file)
    setDraft(prev => ({
      ...prev,
      thumbnailDataUrl: thumbnail.dataUrl,
      thumbnailAssetId: thumbnail.assetId,
      thumbnailName: thumbnail.name,
    }))
  }

  const saveDetails = (event: FormEvent) => {
    event.preventDefault()
    const managerId = draft.managerId || state.members[0]?.id || ''
    const memberIds = Array.from(new Set([managerId, ...draft.memberIds].filter(Boolean)))
    const opportunityLink = parseOpportunityKey(draft.opportunityKey)
    onUpdate(project.id, {
      name: draft.name.trim() || project.name,
      clientId: draftClientId,
      description: draft.description,
      status: draft.status,
      health: draft.health,
      priority: draft.priority,
      code: draft.code.trim() || project.code,
      projectType: draft.projectType,
      contractType: draft.contractType,
      progress: Number(draft.progress) || 0,
      budget: Number(draft.budget) || 0,
      spent: Number(draft.spent) || 0,
      committed: Number(draft.committed) || 0,
      startDate: draft.startDate,
      dueDate: draft.dueDate,
      managerId,
      memberIds,
      tags: draft.tags.split(',').map(tag => tag.trim()).filter(Boolean),
      department: draft.department,
      location: {
        address: draft.address,
        city: draft.city,
        province: draft.province,
        postalCode: draft.postalCode,
      },
      budgetBreakdown: {
        direct: numericDraftValue(draft.directCost),
        indirect: numericDraftValue(draft.indirectCost),
        contingency: numericDraftValue(draft.contingencyCost),
        other: numericDraftValue(draft.otherCost),
      },
      settings: {
        allowTaskCreation: draft.allowTaskCreation,
        enableBudgetTracking: draft.enableBudgetTracking,
        enableTimeTracking: draft.enableTimeTracking,
        enableDocumentManagement: draft.enableDocumentManagement,
      },
      thumbnailDataUrl: draft.thumbnailDataUrl || undefined,
      thumbnailAssetId: draft.thumbnailAssetId || undefined,
      opportunityId: opportunityLink.opportunityId,
      opportunitySource: opportunityLink.opportunitySource,
    }, 'Updated project profile, assignments, budget, and opportunity link')
    setSavedAt(Date.now())
  }

  useEffect(() => {
    if (!savedAt) return
    const timer = window.setTimeout(() => setSavedAt(null), 2600)
    return () => window.clearTimeout(timer)
  }, [savedAt])

  const toggleMember = (memberId: string) => {
    setDraft(prev => {
      const next = new Set(prev.memberIds)
      if (next.has(memberId)) next.delete(memberId)
      else next.add(memberId)
      return { ...prev, memberIds: Array.from(next) }
    })
  }

  const addNote = (event: FormEvent) => {
    event.preventDefault()
    if (!noteDraft.trim()) return
    onAddNote(project.id, noteDraft)
    setNoteDraft('')
  }

  const reportLines = () => [
    `${project.name} Project Report`,
    `Generated: ${new Date().toLocaleString()}`,
    '',
    `Status: ${project.status}`,
    `Health: ${project.health}`,
    `Priority: ${project.priority}`,
    `Progress: ${Math.round(project.progress)}%`,
    `Client: ${clientName}`,
    `Manager: ${manager?.name || 'Unassigned'}`,
    `Schedule: ${formatDate(project.startDate)} to ${formatDate(project.dueDate)}`,
    `Budget: ${formatMoney(project.budget)}`,
    `Spent: ${formatMoney(project.spent)}`,
    `Committed: ${formatMoney(project.committed)}`,
    `Remaining: ${formatMoney(remainingBudget)}`,
    '',
    `Tasks: ${completedTasks} complete / ${tasks.length} total`,
    ...tasks.map(task => `- ${task.title}: ${task.status}, due ${formatDate(task.dueDate)}, ${Math.round(task.progress)}%`),
    '',
    `Milestones: ${milestones.length}`,
    ...milestones.map(milestone => `- ${milestone.title}: ${milestone.status}, due ${formatDate(milestone.dueDate)}`),
    '',
    `Documents: ${documents.length}`,
    ...documents.map(document => `- ${document.name} (${document.type}, ${document.version})`),
    '',
    `Activity: ${activities.length}`,
    ...activities.slice(0, 25).map(item => `- ${formatDate(item.createdAt.slice(0, 10))}: ${item.action}`),
  ]

  const exportReport = () => {
    const blob = new Blob([reportLines().join('\n')], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${projectDisplayCode(project).replace(/[^a-z0-9-]+/gi, '-')}-project-report.txt`
    link.click()
    URL.revokeObjectURL(url)
  }

  const printReport = () => {
    const printable = window.open('', '_blank', 'noopener,noreferrer')
    const escape: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }
    const body = reportLines().map(line => line ? `<p>${line.replace(/[&<>"']/g, char => escape[char] || char)}</p>` : '<br />').join('')
    if (!printable) {
      window.print()
      return
    }
    const safeTitle = project.name.replace(/[&<>"']/g, char => escape[char] || char)
    printable.document.write(`<!doctype html><html><head><title>${safeTitle} Project Report</title><style>body{font-family:Arial,sans-serif;margin:32px;color:#111}p{margin:0 0 7px;line-height:1.35}p:first-child{font-size:24px;font-weight:700;margin-bottom:12px}</style></head><body>${body}</body></html>`)
    printable.document.close()
    window.setTimeout(() => {
      printable.focus()
      printable.print()
    }, 50)
  }

  return (
    <section className="pm-detail">
      <div className="pm-detail-crumbs" aria-label="Project breadcrumbs">
        <Home size={15} />
        <button type="button" onClick={onClose}>Project Mgmt</button>
        <ChevronRight size={13} />
        <button type="button" onClick={onClose}>Projects</button>
        <ChevronRight size={13} />
        <span>{project.name}</span>
      </div>

      <header className="pm-detail-hero-new">
        <ProjectThumbnail project={project} className="pm-project-thumb-hero" />
        <div className="pm-detail-hero-copy">
          <div className="pm-detail-hero-meta">
            <ProjectStatusBadge status={project.status} />
          </div>
          <h2>{project.name}<Star size={17} /></h2>
          <p>{project.tags[0] || project.department || 'Construction Project'}</p>
          <span><MapPin size={15} /> {projectLocation}</span>
        </div>
        <div className="pm-detail-hero-actions">
          <div className="pm-detail-hero-menu" ref={projectActionMenuRef}>
            <button
              type="button"
              className="pm-detail-more-button"
              onClick={() => setProjectActionMenuOpen(open => !open)}
              aria-haspopup="menu"
              aria-expanded={projectActionMenuOpen}
              aria-label={`Open project actions for ${project.name}`}
            >
              <MoreHorizontal size={18} />
            </button>
            {projectActionMenuOpen && (
              <div className="pm-project-action-menu" role="menu" aria-label={`Project actions for ${project.name}`}>
                <button type="button" role="menuitem" onClick={() => runProjectAction(() => onAddTask(project.id))}><Plus size={14} /> New task</button>
                <button type="button" role="menuitem" onClick={() => runProjectAction(() => onTab('Settings'))}><Pencil size={14} /> Edit project</button>
                <button type="button" role="menuitem" onClick={() => runProjectAction(() => onTab('Reports'))}><Printer size={14} /> Reports</button>
                {project.archivedAt
                  ? <button type="button" role="menuitem" onClick={restoreProject}><RotateCcw size={14} /> Restore</button>
                  : <button type="button" role="menuitem" onClick={archiveProject}><Archive size={14} /> Archive</button>}
                <button type="button" role="menuitem" className="danger" onClick={deleteProject}><Trash2 size={14} /> Delete</button>
              </div>
            )}
          </div>
          <button type="button" onClick={() => { void copyProjectLink() }} aria-label={projectLinkCopied ? 'Project link copied' : 'Copy project link'}><Copy size={16} /> {projectLinkCopied ? 'Copied' : 'Copy project link'}</button>
        </div>
      </header>

      <TabBar tabs={detailTabs} active={selectedDetailTab} onChange={onTab} />
      {selectedDetailTab === 'Overview' && (
        <div className="pm-detail-dashboard">
          <section className="pm-detail-stats">
            <ProjectDetailStat title="Overall Progress" value={`${Math.round(project.progress)}%`} sub={projectHealthLabel(project)} icon={CheckCircle2} />
            <ProjectDetailStat title="Budget" value={formatMoney(project.budget)} sub={`Spent: ${formatMoney(project.spent)} (${spentPercent}%)`} icon={WalletCards} />
            <ProjectDetailStat title="Timeline" value={formatDate(project.startDate)} sub={`Due ${formatDate(project.dueDate)}`} icon={CalendarDays} tone="#60a5fa" />
            <ProjectDetailStat title="Tasks" value={`${completedTasks} / ${tasks.length}`} sub={`${remainingTasks} tasks remaining`} icon={ListChecks} tone="#8b5cf6" />
          </section>

          <div className="pm-detail-main-grid">
            <div className="pm-detail-left">
              <ProjectBudgetOverview budget={{ ...budget, remaining: remainingBudget }} />

              <div className="pm-detail-lower-grid">
                <ProjectTimelinePreview project={project} milestones={milestones} />
                <ProjectPhotoGrid project={project} attachments={taskAttachments} onViewAll={() => onTab('Files')} />
                <ProjectTeamPreview members={teamMembers} />
              </div>
            </div>

            <aside className="pm-detail-right">
              <section className="pm-detail-panel pm-detail-info-card">
                <h3>Project Details</h3>
                <ProjectDetailValue label="Project Code" value={projectDisplayCode(project)} />
                <ProjectDetailValue label="Client" value={clientName} />
                <ProjectDetailValue label="Project Manager" value={<><Avatar member={manager} /> {manager?.name || 'Unassigned'}</>} />
                <ProjectDetailValue label="Department" value={project.department || 'Unassigned'} />
                <ProjectDetailValue label="Status" value={<span className="pm-detail-dot-text"><i />{projectStatusLabel(project.status)}</span>} />
                <ProjectDetailValue label="Priority" value={project.priority} />
                <ProjectDetailValue label="Created" value={formatDate(project.startDate)} />
                <ProjectDetailValue label="Last Updated" value={formatDate(latestUpdate.slice(0, 10))} />
              </section>

              <section className="pm-detail-panel pm-detail-description-card">
                <h3>Description</h3>
                <p>{project.description || 'Add project scope, delivery requirements, and notes in Settings.'}</p>
                <button type="button" onClick={() => onTab('Settings')}>View more</button>
              </section>

              <ProjectActivityPreview state={state} activities={activities} />
            </aside>
          </div>
        </div>
      )}
      {selectedDetailTab === 'Settings' && (
        <form className="pm-settings-page" onSubmit={saveDetails}>
          <header className="pm-settings-header">
            <div>
              <span>Project Settings</span>
              <h2>{project.name}</h2>
              <p>Update the project profile, thumbnail, team access, budget controls, and workflow preferences.</p>
            </div>
            <div className="pm-settings-actions">
              {savedAt ? <span className="pm-settings-saved" role="status"><CheckCircle2 size={15} /> Saved</span> : null}
              <button type="button" className="pm-control" onClick={() => setDraft(projectDetailDraft(project))}>Reset</button>
              <button type="submit" className="pm-primary"><FileCheck2 size={15} /> Save Changes</button>
            </div>
          </header>

          <div className="pm-settings-layout">
            <main className="pm-settings-main">
              <section className="pm-settings-card">
                <div className="pm-settings-section-head">
                  <div><h3>Identity</h3><p>Core project information used across project lists, reports, and task workflows.</p></div>
                  <span>{draft.status}</span>
                </div>
                <div className="pm-settings-field-grid">
                  <Field label="Project name *"><input value={draft.name} onChange={event => setDraft(prev => ({ ...prev, name: event.target.value }))} required /></Field>
                  <Field label="Project code"><input value={draft.code} onChange={event => setDraft(prev => ({ ...prev, code: event.target.value }))} placeholder={projectDisplayCode(project)} /></Field>
                  <Field label="Sales opportunity">
                    <select value={draft.opportunityKey} onChange={event => applyDetailOpportunity(event.target.value)}>
                      <option value="">No linked opportunity</option>
                      {draft.opportunityKey && !draftOpportunity && <option value={draft.opportunityKey}>Linked opportunity not found</option>}
                      {opportunities.map(opportunity => <option key={opportunityKey(opportunity.source, opportunity.id)} value={opportunityKey(opportunity.source, opportunity.id)}>{opportunityLabel(opportunity)}</option>)}
                    </select>
                  </Field>
                  <Field label="Client"><select value={draftClientId} onChange={event => setDraft(prev => ({ ...prev, clientId: event.target.value }))}>{!state.clients.length && <option value="client-local">Internal / Unassigned</option>}{state.clients.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></Field>
                  <Field label="Project type"><select value={draft.projectType} onChange={event => setDraft(prev => ({ ...prev, projectType: event.target.value, department: event.target.value || prev.department }))}>{detailProjectTypeOptions.map(type => <option key={type} value={type}>{type}</option>)}</select></Field>
                  <Field label="Contract type"><select value={draft.contractType} onChange={event => setDraft(prev => ({ ...prev, contractType: event.target.value }))}><option value="">Select contract type</option>{detailContractTypeOptions.map(type => <option key={type} value={type}>{type}</option>)}</select></Field>
                  <Field label="Department"><select value={draft.department} onChange={event => setDraft(prev => ({ ...prev, department: event.target.value }))}>{departmentOptions.map(department => <option key={department} value={department}>{department}</option>)}</select></Field>
                  <Field label="Project manager"><select value={draft.managerId} onChange={event => setDraft(prev => ({ ...prev, managerId: event.target.value }))}>{!state.members.length && <option value="">Unassigned</option>}{state.members.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></Field>
                  <Field label="Status"><select value={draft.status} onChange={event => setDraft(prev => ({ ...prev, status: event.target.value as ProjectStatus }))}>{projectStatusOptions.map(status => <option key={status} value={status}>{status}</option>)}</select></Field>
                  <Field label="Health"><select value={draft.health} onChange={event => setDraft(prev => ({ ...prev, health: event.target.value as ProjectHealth }))}>{healthOptions.map(health => <option key={health} value={health}>{health}</option>)}</select></Field>
                  <Field label="Priority"><select value={draft.priority} onChange={event => setDraft(prev => ({ ...prev, priority: event.target.value as TaskPriority }))}>{priorityOptions.filter(option => option !== 'All').map(priority => <option key={priority} value={priority}>{priority}</option>)}</select></Field>
                  <Field label="Progress %"><input type="number" min="0" max="100" value={draft.progress} onChange={event => setDraft(prev => ({ ...prev, progress: event.target.value }))} /></Field>
                </div>
              </section>

              <section className="pm-settings-card">
                <div className="pm-settings-section-head">
                  <div><h3>Schedule, Location & Budget</h3><p>Dates, delivery location, and cost controls shown throughout the project dashboard.</p></div>
                </div>
                <div className="pm-settings-field-grid">
                  <Field label="Start date"><input type="date" value={draft.startDate} onChange={event => setDraft(prev => ({ ...prev, startDate: event.target.value }))} /></Field>
                  <Field label="Due date"><input type="date" value={draft.dueDate} onChange={event => setDraft(prev => ({ ...prev, dueDate: event.target.value }))} /></Field>
                  <Field label="Budget"><input type="number" min="0" value={draft.budget} onChange={event => setDraft(prev => ({ ...prev, budget: event.target.value }))} /></Field>
                  <Field label="Spent"><input type="number" min="0" value={draft.spent} onChange={event => setDraft(prev => ({ ...prev, spent: event.target.value }))} /></Field>
                  <Field label="Committed"><input type="number" min="0" value={draft.committed} onChange={event => setDraft(prev => ({ ...prev, committed: event.target.value }))} /></Field>
                  <Field label="Direct cost"><input type="number" min="0" value={draft.directCost} onChange={event => setDraft(prev => ({ ...prev, directCost: event.target.value }))} /></Field>
                  <Field label="Indirect cost"><input type="number" min="0" value={draft.indirectCost} onChange={event => setDraft(prev => ({ ...prev, indirectCost: event.target.value }))} /></Field>
                  <Field label="Contingency"><input type="number" min="0" value={draft.contingencyCost} onChange={event => setDraft(prev => ({ ...prev, contingencyCost: event.target.value }))} /></Field>
                  <Field label="Other cost"><input type="number" min="0" value={draft.otherCost} onChange={event => setDraft(prev => ({ ...prev, otherCost: event.target.value }))} /></Field>
                  <Field label="Address" className="pm-settings-span-2"><input value={draft.address} onChange={event => setDraft(prev => ({ ...prev, address: event.target.value }))} placeholder="Project address" /></Field>
                  <Field label="City / Municipality"><input value={draft.city} onChange={event => setDraft(prev => ({ ...prev, city: event.target.value }))} /></Field>
                  <Field label="Province"><select value={draft.province} onChange={event => setDraft(prev => ({ ...prev, province: event.target.value }))}><option value="">Select province</option>{provinceOptions.map(province => <option key={province} value={province}>{province}</option>)}</select></Field>
                  <Field label="Zip / Postal code"><input value={draft.postalCode} onChange={event => setDraft(prev => ({ ...prev, postalCode: event.target.value }))} /></Field>
                  <Field label="Tags" className="pm-settings-span-2"><input value={draft.tags} onChange={event => setDraft(prev => ({ ...prev, tags: event.target.value }))} placeholder="construction, phase 1, priority" /></Field>
                  <label className="pm-field pm-settings-span-2"><span>Description</span><textarea value={draft.description} onChange={event => setDraft(prev => ({ ...prev, description: event.target.value }))} rows={5} /></label>
                </div>
              </section>

              <section className="pm-settings-card">
                <div className="pm-settings-section-head">
                  <div><h3>Team Members</h3><p>Choose who has project visibility and task assignment access.</p></div>
                  <span>{draft.memberIds.length} assigned</span>
                </div>
                <div className="pm-settings-team-list">
                  {state.members.length ? state.members.map(member => (
                    <label key={member.id} className="pm-settings-team-option">
                      <input type="checkbox" checked={teamMemberIds.has(member.id)} onChange={() => toggleMember(member.id)} />
                      <Avatar member={member} />
                      <span><strong>{member.name}</strong><small>{member.role} - {member.department}</small></span>
                    </label>
                  )) : <EmptyState title="No team members" body="Employees will appear here when connected to HR." />}
                </div>
              </section>
            </main>

            <aside className="pm-settings-side">
              <section className="pm-settings-card pm-settings-photo-card">
                <div className="pm-settings-section-head">
                  <div><h3>Thumbnail</h3><p>This image appears on the project list, detail header, and photo overview.</p></div>
                </div>
                <label className={draftThumbnailSource ? 'pm-settings-photo-drop has-image' : 'pm-settings-photo-drop'} htmlFor={`pm-detail-thumbnail-${project.id}`} onDragOver={event => event.preventDefault()} onDrop={dropDetailProjectThumbnail}>
                  {draftThumbnailSource ? (
                    <span style={{ backgroundImage: `url(${draftThumbnailSource})` }} aria-label={`${project.name} thumbnail preview`} />
                  ) : (
                    <i><Camera size={26} /></i>
                  )}
                  <b><Camera size={15} /> {draftThumbnailSource ? 'Edit photo' : 'Upload photo'}</b>
                </label>
                <input id={`pm-detail-thumbnail-${project.id}`} className="pm-create-file-input" type="file" accept="image/png,image/jpeg,image/webp" onChange={attachDetailProjectThumbnail} />
                <p>{draft.thumbnailName || 'Upload or drag a JPG, PNG, or WebP image, then save changes.'}</p>
              </section>

              <section className="pm-settings-card">
                <div className="pm-settings-section-head">
                  <div><h3>Workflow Settings</h3><p>Turn project modules on or off for this workspace.</p></div>
                </div>
                <div className="pm-settings-toggle-list">
                  {workflowSettings.map(item => (
                    <label key={item.key} className="pm-settings-toggle">
                      <span><strong>{item.title}</strong><small>{item.body}</small></span>
                      <input type="checkbox" checked={draft[item.key]} onChange={event => setDraft(prev => ({ ...prev, [item.key]: event.target.checked }))} />
                    </label>
                  ))}
                </div>
              </section>

              <section className="pm-settings-card pm-settings-danger-card">
                <div className="pm-settings-section-head">
                  <div><h3>Project Controls</h3><p>Archive hides this project from active lists. Delete permanently removes related records.</p></div>
                </div>
                <div className="pm-settings-danger-actions">
                  {project.archivedAt ? (
                    <button type="button" className="pm-control" onClick={() => { if (window.confirm(`Restore ${project.name} to active projects?`)) onRestore(project.id) }}>Restore</button>
                  ) : (
                    <button type="button" className="pm-control" onClick={() => { if (window.confirm(`Archive ${project.name}?`)) onArchive(project.id) }}>Archive</button>
                  )}
                  <button type="button" className="pm-control danger" onClick={() => { if (window.confirm(`Delete ${project.name} and all related records?`)) onDelete(project.id) }}>Delete</button>
                </div>
              </section>
            </aside>
          </div>
        </form>
      )}
      {selectedDetailTab === 'Tasks' && (
        <TasksTab state={projectState} onAddTask={() => onAddTask(project.id)} onOpenTask={onOpenTask} onEditTask={onEditTask} onArchiveTask={onArchiveTask} onDeleteTask={onDeleteTask} onUpdateTaskStatus={onUpdateTaskStatus} />
      )}
      {selectedDetailTab === 'Kanban' && (
        <KanbanTab state={projectState} onDrag={onDragTask} onDrop={onDropTask} onOpenTask={onOpenTask} onEditTask={onEditTask} onArchiveTask={onArchiveTask} onDeleteTask={onDeleteTask} onQuickAddTask={(status, title) => onQuickAddTask?.(project.id, status, title)} />
      )}
      {selectedDetailTab === 'Schedule' && (
        <PlanningTab
          state={projectState}
          project={project}
          onCreateMilestone={onCreateMilestone}
          onUpdateMilestone={onUpdateMilestone}
          onUpdateMilestoneStatus={onUpdateMilestoneStatus}
          onDeleteMilestone={onDeleteMilestone}
        />
      )}
      {selectedDetailTab === 'Files' && <ProjectFilesTab state={projectState} />}
      {selectedDetailTab === 'Budget' && <BudgetTab state={{ ...state, projects: [project] }} budget={budget} />}
      {selectedDetailTab === 'Team' && <ProjectResourcesTab state={{ ...state, projects: [project], members: teamMembers }} />}
      {selectedDetailTab === 'Reports' && (
        <section className="pm-card pm-detail-reports">
          <SectionTitle
            title="Reports"
            action={<span className="pm-report-actions"><button type="button" onClick={exportReport}><Download size={14} /> Export</button><button type="button" onClick={printReport}><Printer size={14} /> Print</button></span>}
          />
          <form className="pm-note-form" onSubmit={addNote}>
            <input value={noteDraft} onChange={event => setNoteDraft(event.target.value)} placeholder="Add a project note..." />
            <button type="submit" className="pm-control">Add Note</button>
          </form>
          {activities.length ? <ActivityList state={state} activities={activities} /> : <EmptyState title="No activity yet" body="Project changes and notes will appear here." />}
        </section>
      )}
    </section>
  )
}

function defaultMilestoneDraft(project: ProjectRecord) {
  return {
    projectId: project.id,
    title: '',
    phase: 'Planning',
    baselineDate: project.dueDate,
    dueDate: project.dueDate,
    priority: 'Medium' as TaskPriority,
    status: 'Pending' as MilestoneStatus,
  }
}

function milestoneDraftFromRecord(milestone: ProjectMilestone) {
  return {
    projectId: milestone.projectId,
    title: milestone.title,
    phase: milestone.phase || 'Planning',
    baselineDate: milestone.baselineDate || milestone.dueDate,
    dueDate: milestone.dueDate,
    priority: milestone.priority,
    status: milestone.status,
  }
}

function dayDiff(from: string, to: string) {
  const start = new Date(`${from}T00:00:00`).getTime()
  const end = new Date(`${to}T00:00:00`).getTime()
  if (!Number.isFinite(start) || !Number.isFinite(end)) return 0
  return Math.round((end - start) / 86400000)
}

function milestoneSignal(milestone: ProjectMilestone) {
  const baseline = milestone.baselineDate || milestone.dueDate
  const drift = dayDiff(baseline, milestone.dueDate)
  const overdue = milestone.status !== 'Done' && new Date(`${milestone.dueDate}T23:59:59`).getTime() < Date.now()
  if (milestone.status === 'Delayed' || overdue) return { label: overdue ? 'Overdue' : 'Delayed', tone: 'danger', drift }
  if (milestone.priority === 'Critical') return { label: 'Critical', tone: 'danger', drift }
  if (drift > 0) return { label: `${drift}d slip`, tone: 'warning', drift }
  if (milestone.status === 'Done') return { label: 'Complete', tone: 'good', drift }
  return { label: 'On track', tone: 'good', drift }
}

function PlanningTab({
  state,
  project,
  onCreateMilestone,
  onUpdateMilestone,
  onUpdateMilestoneStatus,
  onDeleteMilestone,
}: {
  state: ProjectManagementState
  project: ProjectRecord
  onCreateMilestone: (draft: MilestoneDraft) => void
  onUpdateMilestone: (milestoneId: string, patch: MilestoneUpdateDraft) => void
  onUpdateMilestoneStatus: (milestoneId: string, status: MilestoneStatus) => void
  onDeleteMilestone: (milestoneId: string) => void
}) {
  const [draft, setDraft] = useState(() => defaultMilestoneDraft(project))
  const [editingId, setEditingId] = useState<string | null>(null)
  const milestones = [...state.milestones].sort((a, b) => new Date(`${a.dueDate}T00:00:00`).getTime() - new Date(`${b.dueDate}T00:00:00`).getTime())
  const phases = Array.from(new Set([...phaseOptions, ...milestones.map(milestone => milestone.phase || 'Planning'), draft.phase].filter(Boolean)))
  const blockedTasks = state.tasks.filter(task => task.dependencies.length > 0 || task.status === 'Blocked')
  const delayedMilestones = milestones.filter(milestone => ['Delayed', 'Pending', 'In Progress'].includes(milestone.status) && milestoneSignal(milestone).tone === 'danger')

  const resetDraft = () => {
    setDraft(defaultMilestoneDraft(project))
    setEditingId(null)
  }

  const submitMilestone = (event: FormEvent) => {
    event.preventDefault()
    const nextDraft: MilestoneDraft = {
      ...draft,
      title: draft.title.trim() || 'Untitled milestone',
      phase: draft.phase.trim() || 'Planning',
      baselineDate: draft.baselineDate || draft.dueDate,
    }
    if (editingId) onUpdateMilestone(editingId, nextDraft)
    else onCreateMilestone(nextDraft)
    resetDraft()
  }

  const startEdit = (milestone: ProjectMilestone) => {
    setEditingId(milestone.id)
    setDraft(milestoneDraftFromRecord(milestone))
  }

  return (
    <section className="pm-planning-grid">
      <form className="pm-card pm-planning-form" onSubmit={submitMilestone}>
        <div className="pm-section-bar"><h2>{editingId ? 'Edit Milestone' : 'Create Milestone'}</h2><span className="pm-section-action">{project.name}</span></div>
        <div className="pm-planning-form-grid">
          <Field label="Milestone *"><input value={draft.title} onChange={event => setDraft(prev => ({ ...prev, title: event.target.value }))} placeholder="e.g. Structural inspection sign-off" required /></Field>
          <Field label="Phase"><select value={draft.phase} onChange={event => setDraft(prev => ({ ...prev, phase: event.target.value }))}>{phases.map(phase => <option key={phase} value={phase}>{phase}</option>)}</select></Field>
          <Field label="Baseline date"><input type="date" value={draft.baselineDate} onChange={event => setDraft(prev => ({ ...prev, baselineDate: event.target.value }))} /></Field>
          <Field label="Current due date"><input type="date" value={draft.dueDate} onChange={event => setDraft(prev => ({ ...prev, dueDate: event.target.value }))} /></Field>
          <Field label="Priority"><select value={draft.priority} onChange={event => setDraft(prev => ({ ...prev, priority: event.target.value as TaskPriority }))}>{priorityOptions.filter(option => option !== 'All').map(priority => <option key={priority} value={priority}>{priority}</option>)}</select></Field>
          <Field label="Status"><select value={draft.status} onChange={event => setDraft(prev => ({ ...prev, status: event.target.value as MilestoneStatus }))}>{milestoneStatusOptions.map(status => <option key={status} value={status}>{status}</option>)}</select></Field>
        </div>
        <div className="pm-form-actions"><button type="button" className="pm-control" onClick={resetDraft}>{editingId ? 'Cancel Edit' : 'Clear'}</button><button type="submit" className="pm-primary">{editingId ? 'Save Milestone' : 'Add Milestone'}</button></div>
      </form>

      <aside className="pm-card pm-planning-health">
        <SectionTitle title="Planning Health" action={`${milestones.length} milestones`} />
        <div className="pm-planning-stats">
          <span className={milestones.some(item => item.status === 'Done') ? 'is-good' : undefined}><strong>{milestones.filter(item => item.status === 'Done').length}</strong><small>Completed</small></span>
          <span className={delayedMilestones.length ? 'is-warn' : undefined}><strong>{delayedMilestones.length}</strong><small>Delayed / critical</small></span>
          <span className={blockedTasks.length ? 'is-danger' : undefined}><strong>{blockedTasks.length}</strong><small>Blocked dependencies</small></span>
        </div>
        {delayedMilestones.length || blockedTasks.length ? (
          <div className="pm-planning-risks">
            {delayedMilestones.slice(0, 4).map(milestone => <p key={milestone.id}><Pill value={milestoneSignal(milestone).label} /> {milestone.title}</p>)}
            {blockedTasks.slice(0, 3).map(task => <p key={task.id}><Pill value="Blocked" /> {task.title}</p>)}
          </div>
        ) : <EmptyState title="No planning risks" body="Milestone slippage and task blockers will appear here." />}
      </aside>

      <div className="pm-card pm-phase-board">
        <SectionTitle title="Project Phases" action={`${phases.length}`} />
        <div className="pm-phase-lanes">
          {phases.map(phase => {
            const phaseMilestones = milestones.filter(milestone => (milestone.phase || 'Planning') === phase)
            return (
              <section className="pm-phase-lane" key={phase}>
                <div className="pm-phase-lane-head"><strong>{phase}</strong><span>{phaseMilestones.length}</span></div>
                {phaseMilestones.length ? phaseMilestones.map(milestone => {
                  const signal = milestoneSignal(milestone)
                  return (
                    <article className="pm-milestone-card" key={milestone.id}>
                      <div>
                        <strong>{milestone.title}</strong>
                        <Pill value={signal.label} />
                      </div>
                      <small>Baseline {formatDate(milestone.baselineDate || milestone.dueDate)} - Due {formatDate(milestone.dueDate)}</small>
                      <div className="pm-milestone-meta">
                        <Pill value={milestone.priority} />
                        <select value={milestone.status} onChange={event => onUpdateMilestoneStatus(milestone.id, event.target.value as MilestoneStatus)} aria-label={`Status for ${milestone.title}`}>
                          {milestoneStatusOptions.map(status => <option key={status} value={status}>{status}</option>)}
                        </select>
                      </div>
                      <footer>
                        <button type="button" onClick={() => startEdit(milestone)}>Edit</button>
                        <button type="button" onClick={() => { if (window.confirm(`Delete milestone ${milestone.title}?`)) onDeleteMilestone(milestone.id) }}>Delete</button>
                      </footer>
                    </article>
                  )
                }) : <p className="pm-phase-empty">No milestones in this phase.</p>}
              </section>
            )
          })}
        </div>
      </div>
    </section>
  )
}

function ActivityList({ state, activities }: { state: ProjectManagementState; activities: ProjectManagementState['activities'] }) {
  return <div className="pm-activity-list">{activities.map(activity => {
    const actor = state.members.find(member => member.id === activity.actorId)
    return <article key={activity.id}><span>{initials(actor?.name || 'WF')}</span><div><strong>{activity.action}</strong><small>{actor?.name || 'WiseFlow'} - {new Date(activity.createdAt).toLocaleString('en-US', { month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit' })}</small></div></article>
  })}</div>
}

function SectionTitle({ title, action }: { title: string; action?: ReactNode }) { return <div className="pm-section-bar"><h2>{title}</h2>{action && <span className="pm-section-action">{action}</span>}</div> }
function Pill({ value }: { value: string }) { return <span className={`pm-pill tone-${value.toLowerCase().replaceAll(' ', '-')}`}>{value}</span> }
function Avatar({ member }: { member?: { name: string; avatarColor: string } }) { return <span className="pm-avatar">{initials(member?.name || 'NA')}</span> }
function Progress({ value }: { value: number }) { return <span className="pm-progress"><i style={{ width: `${Math.max(0, Math.min(value, 100))}%` }} /></span> }

function Donut({ data, center, sub, valueFormatter = value => String(value) }: { data: Array<{ label: string; value: number; color: string }>; center: string; sub: string; valueFormatter?: (value: number) => string }) {
  if (!data.some(item => item.value > 0)) return <EmptyState title="No status budget data" body="Add project budgets and their status breakdown will appear here." />
  const total = Math.max(data.reduce((s, d) => s + d.value, 0), 1)
  const gradient = data.reduce<{ cursor: number; stops: string[] }>((acc, item) => {
    const start = acc.cursor
    const end = start + (item.value / total) * 100
    return { cursor: end, stops: [...acc.stops, `${item.color} ${start}% ${end}%`] }
  }, { cursor: 0, stops: [] }).stops.join(', ')
  return <div className="pm-donut-wrap"><div className="pm-donut" style={{ background: `conic-gradient(${gradient})` }}><span><strong>{center}</strong><small>{sub}</small></span></div><div className="pm-legend">{data.map(item => <p key={item.label}><i style={{ background: item.color }} />{item.label}<strong>{Math.round((item.value / total) * 100)}% ({valueFormatter(item.value)})</strong></p>)}</div></div>
}

function LineChart({ data }: { data: ReturnType<typeof monthlyStatusTrend> }) {
  if (!data.length) return <EmptyState title="No status trend yet" body="Project trend analytics will appear once real project records exist." />
  const series = [
    { key: 'completed', label: 'Completed', color: colors.green },
    { key: 'inProgress', label: 'Active / In Progress', color: colors.blue },
    { key: 'onHold', label: 'On Hold', color: colors.orange },
    { key: 'planning', label: 'Planning', color: colors.purple },
  ] as const
  const max = Math.max(...data.flatMap(row => series.map(item => Number(row[item.key]))), 1)
  const points = (key: typeof series[number]['key']) => data.map((row, index) => ({
    x: (index / Math.max(data.length - 1, 1)) * 620 + 10,
    y: 230 - (Number(row[key]) / max) * 190,
  }))
  return <div className="pm-line"><svg viewBox="0 0 640 260" preserveAspectRatio="none">{[0, 1, 2, 3].map(i => <line key={i} x1="0" x2="640" y1={40 + i * 55} y2={40 + i * 55} stroke="#e8edf4" />)}{series.map(item => { const itemPoints = points(item.key); return <g key={item.key}><polyline fill="none" stroke={item.color} strokeWidth="3" points={itemPoints.map(point => `${point.x},${point.y}`).join(' ')} />{itemPoints.map((point, index) => <circle key={`${item.key}-${index}`} cx={point.x} cy={point.y} r="4" fill={item.color} />)}</g> })}</svg><div className="pm-line-legend">{series.map(item => <span key={item.key}><i style={{ background: item.color }} />{item.label}</span>)}</div><div className="pm-line-axis">{data.map(row => <span key={row.label}>{row.label}</span>)}</div></div>
}

function BudgetUtilization({ budget }: { budget: ReturnType<typeof budgetSummary> }) {
  const used = budget.spent + budget.committed
  const utilization = budget.total ? Math.min(100, Math.max(0, (used / budget.total) * 100)) : 0
  const spentPercent = budget.total ? Math.min(100, Math.max(0, (budget.spent / budget.total) * 100)) : 0
  const committedPercent = budget.total ? Math.min(100 - spentPercent, Math.max(0, (budget.committed / budget.total) * 100)) : 0
  return (
    <div className="pm-budget-utilization">
      <div className="pm-budget-util-metrics">
        <span><small>Spent</small><strong>{formatMoney(budget.spent)}</strong></span>
        <span><small>Committed</small><strong>{formatMoney(budget.committed)}</strong></span>
        <span><small>Utilized</small><strong>{Math.round(utilization)}%</strong></span>
      </div>
      <div className="pm-budget-stack" aria-label={`Budget utilization ${Math.round(utilization)} percent`}>
        <span className="is-spent" style={{ width: `${spentPercent}%` }} />
        <span className="is-committed" style={{ width: `${committedPercent}%` }} />
      </div>
      <div className="pm-budget-util-legend">
        <span><i className="is-spent" /> Spent</span>
        <span><i className="is-committed" /> Committed</span>
        <span><i className="is-available" /> Available</span>
      </div>
    </div>
  )
}
function EmptyState({ title, body }: { title: string; body: string }) {
  return <div className="pm-empty"><span className="pm-empty-icon"><BriefcaseBusiness size={22} /></span><strong>{title}</strong><p>{body}</p></div>
}


export function ArchivedTab(props: Omit<Parameters<typeof ProjectsTab>[0], 'initialDirectoryTab'>) {
  return <ProjectsTab {...props} initialDirectoryTab="Archived" />
}
