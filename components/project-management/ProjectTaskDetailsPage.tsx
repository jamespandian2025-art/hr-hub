'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ChangeEvent, FormEvent, useMemo, useState } from 'react'
import {
  Activity as ActivityIcon,
  ArrowLeft,
  BriefcaseBusiness,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Download,
  FileArchive,
  FileSpreadsheet,
  FileText,
  Folder,
  Info,
  ListChecks,
  MessageSquare,
  MoreVertical,
  Paperclip,
  Pencil,
  Plus,
  Send,
  Share2,
  X,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { formatDate, initials } from '@/lib/project-management/metrics'
import { uploadFileObject } from '@/lib/uploads/client'
import type {
  ProjectActivity,
  ProjectManagementState,
  ProjectMember,
  ProjectTask,
  ProjectTaskAttachment,
  ProjectTaskChecklistItem,
  ProjectTaskComment,
  ProjectTimeLog,
  TaskPriority,
  TaskStatus,
} from '@/lib/project-management/types'
import { useProjectManagement } from './useProjectManagement'

const taskTabs = ['Overview', 'Subtasks', 'Updates', 'Files', 'Time Log', 'Activity'] as const
type TaskDetailTab = typeof taskTabs[number]
const taskStatuses: TaskStatus[] = ['To Do', 'In Progress', 'Review', 'Done', 'Blocked']
const taskPriorities: TaskPriority[] = ['Low', 'Medium', 'High', 'Critical']

function formatCurrency(value: number, currency = 'PHP') {
  const safeCurrency = currency || 'PHP'
  const locale = safeCurrency === 'PHP' ? 'en-PH' : 'en-US'
  try {
    return new Intl.NumberFormat(locale, { style: 'currency', currency: safeCurrency, maximumFractionDigits: 0 }).format(value || 0)
  } catch {
    return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', maximumFractionDigits: 0 }).format(value || 0)
  }
}

function formatTaskCode(id: string) {
  return id.toUpperCase()
}

function formatCompactDate(value?: string) {
  if (!value) return '-'
  const date = new Date(value.includes('T') ? value : `${value}T00:00:00`)
  return Number.isNaN(date.getTime()) ? '-' : date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function formatDateTime(value?: string) {
  if (!value) return '-'
  const date = new Date(value.includes('T') ? value : `${value}T00:00:00`)
  if (Number.isNaN(date.getTime())) return '-'
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    + ' at '
    + date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
}

function formatHours(value: number) {
  const safe = Math.max(0, value || 0)
  const hours = Math.floor(safe)
  const minutes = Math.round((safe - hours) * 60)
  if (!minutes) return `${hours}h`
  return `${hours}h ${minutes}m`
}

const richDescriptionTags = new Set(['b', 'strong', 'i', 'em', 'u', 'ul', 'ol', 'li', 'p', 'br', 'h2', 'h3', 'blockquote', 'pre', 'code', 'div'])

function escapeDescriptionText(value: string) {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;')
}

function descriptionHasHtml(value: string) {
  return /<\/?[a-z][\s\S]*>/i.test(value)
}

function descriptionInlineMarkup(value: string) {
  return escapeDescriptionText(value)
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[^*])\*([^*\n]+)\*/g, '$1<em>$2</em>')
    .replace(/&lt;u&gt;([\s\S]*?)&lt;\/u&gt;/gi, '<u>$1</u>')
}

function plainDescriptionToHtml(value: string) {
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
      html.push(`<li>${descriptionInlineMarkup(listMatch[1])}</li>`)
      return
    }
    if (listOpen) {
      html.push('</ul>')
      listOpen = false
    }
    if (!trimmed) html.push('<p><br></p>')
    else if (trimmed.startsWith('### ')) html.push(`<h3>${descriptionInlineMarkup(trimmed.slice(4))}</h3>`)
    else if (trimmed.startsWith('## ')) html.push(`<h2>${descriptionInlineMarkup(trimmed.slice(3))}</h2>`)
    else if (trimmed.startsWith('> ')) html.push(`<blockquote>${descriptionInlineMarkup(trimmed.slice(2))}</blockquote>`)
    else html.push(`<p>${descriptionInlineMarkup(trimmed)}</p>`)
  })
  if (listOpen) html.push('</ul>')
  return html.join('')
}

function sanitizeRichDescription(value: string) {
  const source = descriptionHasHtml(value) ? value : plainDescriptionToHtml(value)
  return source
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<\/?([a-z0-9]+)(?:\s[^>]*)?>/gi, (match, tagName: string) => {
      const tag = tagName.toLowerCase()
      if (!richDescriptionTags.has(tag)) return ''
      if (tag === 'br') return '<br>'
      return match.startsWith('</') ? `</${tag}>` : `<${tag}>`
    })
}

function RichDescription({ value }: { value: string }) {
  const text = sanitizeRichDescription(value)
    .replace(/<br>/gi, '\n')
    .replace(/<\/(p|h2|h3|blockquote|li)>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
  if (!text) return <p>No description has been added for this task yet.</p>
  return <div className="pmtd-rich-description">{text}</div>
}

function dateInputValue(value?: string) {
  if (!value) return ''
  const date = new Date(value.includes('T') ? value : `${value}T00:00:00`)
  if (Number.isNaN(date.getTime())) return ''
  return date.toISOString().slice(0, 10)
}

function fileKind(name: string, mimeType: string) {
  const lower = name.toLowerCase()
  if (mimeType.includes('spreadsheet') || lower.match(/\.(xls|xlsx|csv)$/)) return 'XLSX'
  if (mimeType.includes('pdf') || lower.endsWith('.pdf')) return 'PDF'
  if (mimeType.startsWith('image/') || lower.match(/\.(png|jpe?g|gif|webp)$/)) return 'Image'
  return 'File'
}

function fileIcon(attachment: ProjectTaskAttachment) {
  const kind = fileKind(attachment.name, attachment.mimeType)
  if (kind === 'XLSX') return FileSpreadsheet
  if (kind === 'PDF') return FileArchive
  if (kind === 'Image') return FileText
  return Paperclip
}

async function uploadProjectAttachment(file: File) {
  try {
    return await uploadFileObject(file, 'project-attachments')
  } catch {
    return undefined
  }
}

function formatFileSize(bytes: number) {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 KB'
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function resolveTaskStartDate(task: ProjectTask, state: ProjectManagementState) {
  const project = state.projects.find(item => item.id === task.projectId)
  const relatedDates = [
    project?.startDate,
    ...state.taskChecklists.filter(item => item.taskId === task.id).map(item => item.createdAt),
    ...state.taskComments.filter(item => item.taskId === task.id).map(item => item.createdAt),
    ...state.taskAttachments.filter(item => item.taskId === task.id).map(item => item.uploadedAt),
    ...state.timeLogs.filter(item => item.taskId === task.id).map(item => item.date),
    task.updatedAt,
    task.dueDate,
  ].filter((value): value is string => Boolean(value))

  return relatedDates.sort((a, b) => new Date(a).getTime() - new Date(b).getTime())[0] || task.dueDate
}

function latestTaskUpdate(task: ProjectTask, comments: ProjectTaskComment[], attachments: ProjectTaskAttachment[], checklist: ProjectTaskChecklistItem[]) {
  const items = [
    { date: task.updatedAt || task.dueDate, actorId: task.assigneeId },
    ...comments.map(comment => ({ date: comment.createdAt, actorId: comment.actorId })),
    ...attachments.map(attachment => ({ date: attachment.uploadedAt, actorId: attachment.ownerId })),
    ...checklist.map(item => ({ date: item.completedAt || item.createdAt, actorId: task.assigneeId })),
  ].filter(item => Boolean(item.date))
  return items.sort((a, b) => new Date(b.date || '').getTime() - new Date(a.date || '').getTime())[0]
}

function Avatar({ member, label }: { member?: ProjectMember; label?: string }) {
  return <span className="pmtd-avatar" style={{ background: member?.avatarColor || undefined }}>{initials(member?.name || label || 'NA')}</span>
}

function StatusBadge({ status }: { status: TaskStatus }) {
  return <span className={`pmtd-chip state-${status.toLowerCase().replaceAll(' ', '-')}`}><i />{status}</span>
}

function ProgressBar({ value }: { value: number }) {
  return <span className="pmtd-progress"><i style={{ width: `${Math.max(0, Math.min(value || 0, 100))}%` }} /></span>
}

type ActivityItem = {
  id: string
  title: string
  detail: string
  date: string
  actor?: ProjectMember
}

function buildActivity(
  state: ProjectManagementState,
  task: ProjectTask,
  comments: ProjectTaskComment[],
  attachments: ProjectTaskAttachment[],
  checklist: ProjectTaskChecklistItem[],
  timeLogs: ProjectTimeLog[],
  projectActivities: ProjectActivity[],
) {
  const assignee = state.members.find(member => member.id === task.assigneeId)
  const items: ActivityItem[] = [
    ...comments.map(comment => ({
      id: comment.id,
      title: 'Comment added',
      detail: comment.body,
      date: comment.createdAt,
      actor: state.members.find(member => member.id === comment.actorId),
    })),
    ...attachments.map(attachment => ({
      id: attachment.id,
      title: attachment.evidence ? 'Evidence attached' : 'File attached',
      detail: attachment.name,
      date: attachment.uploadedAt,
      actor: state.members.find(member => member.id === attachment.ownerId),
    })),
    ...checklist.map(item => ({
      id: item.id,
      title: item.done ? 'Subtask completed' : 'Subtask added',
      detail: item.title,
      date: item.completedAt || item.createdAt,
      actor: assignee,
    })),
    ...timeLogs.map(log => ({
      id: log.id,
      title: 'Time logged',
      detail: `${formatHours(log.hours)}${log.billable ? ' billable' : ''}`,
      date: log.date,
      actor: state.members.find(member => member.id === log.employeeId),
    })),
    ...projectActivities
      .filter(activity => activity.action.toLowerCase().includes(task.title.toLowerCase()))
      .map(activity => ({
        id: activity.id,
        title: 'Project activity',
        detail: activity.action,
        date: activity.createdAt,
        actor: state.members.find(member => member.id === activity.actorId),
      })),
  ]
  return items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
}

export default function ProjectTaskDetailsPage({ taskId }: { taskId: string }) {
  const router = useRouter()
  const store = useProjectManagement()
  const { state } = store
  const [activeTab, setActiveTab] = useState<TaskDetailTab>('Overview')
  const [descriptionOpen, setDescriptionOpen] = useState(false)
  const [descriptionDraft, setDescriptionDraft] = useState('')
  const [commentDraft, setCommentDraft] = useState('')
  const [subtaskDraft, setSubtaskDraft] = useState('')
  const [currency] = useState('PHP')

  const task = useMemo(() => {
    const normalized = taskId.toLowerCase()
    return state.tasks.find(item => item.id.toLowerCase() === normalized || formatTaskCode(item.id).toLowerCase() === normalized) || null
  }, [state.tasks, taskId])

  const activeTasks = useMemo(() => state.tasks.filter(item => !item.archivedAt), [state.tasks])
  const taskIndex = task ? activeTasks.findIndex(item => item.id === task.id) : -1
  const previousTask = taskIndex > 0 ? activeTasks[taskIndex - 1] : activeTasks.at(-1)
  const nextTask = taskIndex >= 0 && taskIndex < activeTasks.length - 1 ? activeTasks[taskIndex + 1] : activeTasks[0]

  if (!task) {
    return (
      <main className="pmtd-shell">
        <style>{taskDetailsCss}</style>
        <section className="pmtd-empty">
          <BriefcaseBusiness size={34} />
          <h1>Task not found</h1>
          <p>The task may have been archived, deleted, or belongs to another company workspace.</p>
          <Link href="/project-management/projects"><ArrowLeft size={15} /> Back to projects</Link>
        </section>
      </main>
    )
  }

  const project = state.projects.find(item => item.id === task.projectId)
  const projectTasksHref = project
    ? `/project-management/projects?project=${encodeURIComponent(project.id)}&detail=Tasks`
    : '/project-management/projects'
  const assignee = state.members.find(member => member.id === task.assigneeId)
  const comments = state.taskComments.filter(comment => comment.taskId === task.id)
  const attachments = state.taskAttachments.filter(attachment => attachment.taskId === task.id)
  const checklist = state.taskChecklists.filter(item => item.taskId === task.id)
  const timeLogs = state.timeLogs.filter(log => log.taskId === task.id)
  const completedSubtasks = checklist.filter(item => item.done).length
  const loggedHours = timeLogs.reduce((sum, log) => sum + log.hours, 0)
  const estimatedHours = task.progress > 0 && loggedHours > 0 ? loggedHours / (task.progress / 100) : 0
  const projectSpent = (project?.spent || 0) + (project?.committed || 0)
  const budgetPercent = project?.budget ? Math.round((projectSpent / project.budget) * 100) : 0
  const projectRemaining = Math.max((project?.budget || 0) - projectSpent, 0)
  const taskStartDate = resolveTaskStartDate(task, state)
  const latestUpdate = latestTaskUpdate(task, comments, attachments, checklist)
  const latestActor = state.members.find(member => member.id === latestUpdate?.actorId) || assignee
  const createdDate = taskStartDate
  const createdActor = assignee
  const activity = buildActivity(state, task, comments, attachments, checklist, timeLogs, state.activities)

  const openDescriptionEditor = () => {
    setDescriptionDraft(task.description)
    setDescriptionOpen(true)
  }

  const saveDescription = (event: FormEvent) => {
    event.preventDefault()
    store.updateTask(task.id, { description: descriptionDraft })
    setDescriptionOpen(false)
  }

  const addComment = (event: FormEvent) => {
    event.preventDefault()
    if (!commentDraft.trim()) return
    store.addTaskComment(task.id, commentDraft)
    setCommentDraft('')
  }

  const addSubtask = (event: FormEvent) => {
    event.preventDefault()
    if (!subtaskDraft.trim()) return
    store.addTaskChecklistItem({ taskId: task.id, title: subtaskDraft })
    setSubtaskDraft('')
  }

  const attachFiles = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || [])
    if (!files.length) return
    const drafts = await Promise.all(files.map(async file => {
      const uploaded = await uploadProjectAttachment(file)
      return {
        taskId: task.id,
        name: file.name,
        fileType: fileKind(file.name, file.type),
        mimeType: file.type || 'application/octet-stream',
        size: formatFileSize(file.size),
        evidence: true,
        dataUrl: uploaded?.url,
        fileUrl: uploaded?.url,
        objectKey: uploaded?.objectKey,
        storageProvider: uploaded?.storageProvider,
      }
    }))
    store.addTaskAttachments(drafts)
    event.target.value = ''
  }

  const goToTask = (target?: ProjectTask) => {
    if (!target) return
    router.push(`/project-management/tasks/${encodeURIComponent(target.id)}`)
  }

  const shareTask = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href)
    } catch {
      window.prompt('Task link', window.location.href)
    }
  }

  const renderSubtasks = () => (
    <section className="pmtd-panel pmtd-subtasks">
      <div className="pmtd-section-title">
        <h2>Subtasks</h2>
        <span>{completedSubtasks} / {checklist.length} completed</span>
        <ProgressBar value={checklist.length ? Math.round((completedSubtasks / checklist.length) * 100) : 0} />
      </div>
      <form className="pmtd-inline-form" onSubmit={addSubtask}>
        <input value={subtaskDraft} onChange={event => setSubtaskDraft(event.target.value)} placeholder="Add a subtask..." />
        <button type="submit"><Plus size={14} /> Add Subtask</button>
      </form>
      <div className="pmtd-subtask-list">
        {checklist.length ? checklist.map(item => (
          <label key={item.id}>
            <input type="checkbox" checked={item.done} onChange={event => store.updateTaskChecklistItem(item.id, { done: event.target.checked })} />
            <span>{item.title}</span>
            <small>{formatCompactDate(item.completedAt || item.createdAt)}</small>
            <button type="button" onClick={() => store.deleteTaskChecklistItem(item.id)} aria-label={`Delete ${item.title}`}><X size={13} /></button>
          </label>
        )) : <EmptyBlock icon={ListChecks} title="No subtasks yet" body="Break this task into smaller checklist items." />}
      </div>
    </section>
  )

  const renderComments = () => (
    <section className="pmtd-panel pmtd-comments">
      <div className="pmtd-section-title pmtd-section-title-action">
        <h2>Comments</h2>
        <span>{comments.length}</span>
      </div>
      <div className="pmtd-comment-list">
        {comments.length ? comments.map(comment => {
          const actor = state.members.find(member => member.id === comment.actorId)
          return (
            <article key={comment.id}>
              <Avatar member={actor} />
              <div>
                <header><strong>{actor?.name || 'WiseFlow'}</strong><small>{formatDateTime(comment.createdAt)}</small></header>
                <p>{comment.body}</p>
              </div>
            </article>
          )
        }) : <EmptyBlock icon={MessageSquare} title="No comments yet" body="Task updates and discussion will appear here." />}
      </div>
      <form className="pmtd-comment-form" onSubmit={addComment}>
        <Avatar member={assignee} label="R" />
        <input value={commentDraft} onChange={event => setCommentDraft(event.target.value)} placeholder="Write a comment..." />
        <button type="submit" aria-label="Send comment"><Send size={16} /></button>
      </form>
    </section>
  )

  const renderFiles = () => (
    <section className="pmtd-panel pmtd-files">
      <div className="pmtd-section-title pmtd-section-title-action">
        <h2>Files & Evidence</h2>
        <span>{attachments.length}</span>
        <label className="pmtd-attach-button"><Paperclip size={14} /> Attach Files<input type="file" multiple accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.csv,.txt" onChange={attachFiles} /></label>
      </div>
      <div className="pmtd-file-list">
        {attachments.length ? attachments.map(attachment => {
          const owner = state.members.find(member => member.id === attachment.ownerId)
          const Icon = fileIcon(attachment)
          const fileUrl = attachment.fileUrl || attachment.dataUrl
          return (
            <article key={attachment.id}>
              <span className={`pmtd-file-icon file-${fileKind(attachment.name, attachment.mimeType).toLowerCase()}`}><Icon size={17} /></span>
              <div>
                <strong>{attachment.name}</strong>
                <small>{fileKind(attachment.name, attachment.mimeType)} - {attachment.size}</small>
              </div>
              <small>{formatCompactDate(attachment.uploadedAt)}<br />{owner?.name || 'WiseFlow'}</small>
              {fileUrl ? <a href={fileUrl} download={attachment.name} aria-label={`Download ${attachment.name}`}><Download size={16} /></a> : <button type="button" aria-label={`File ${attachment.name}`}><Download size={16} /></button>}
              <button type="button" onClick={() => store.deleteTaskAttachment(attachment.id)} aria-label={`Remove ${attachment.name}`}><MoreVertical size={16} /></button>
            </article>
          )
        }) : <EmptyBlock icon={Paperclip} title="No files attached" body="Attach files or completion evidence for this task." />}
      </div>
    </section>
  )

  const renderTimeLog = () => (
    <section className="pmtd-panel">
      <div className="pmtd-section-title">
        <h2>Time Log</h2>
        <span>{formatHours(loggedHours)} logged</span>
      </div>
      <div className="pmtd-time-list">
        {timeLogs.length ? timeLogs.map(log => {
          const member = state.members.find(item => item.id === log.employeeId)
          return (
            <article key={log.id}>
              <Avatar member={member} />
              <div><strong>{member?.name || 'Unassigned'}</strong><small>{formatDate(log.date)} - {log.billable ? 'Billable' : 'Non-billable'}</small></div>
              <span>{formatHours(log.hours)}</span>
            </article>
          )
        }) : <EmptyBlock icon={Clock3} title="No time logged" body="Time entries connected to this task will appear here." />}
      </div>
    </section>
  )

  const renderActivity = () => (
    <section className="pmtd-panel">
      <div className="pmtd-section-title">
        <h2>Activity</h2>
        <span>{activity.length}</span>
      </div>
      <div className="pmtd-activity-list">
        {activity.length ? activity.map(item => (
          <article key={item.id}>
            <Avatar member={item.actor} />
            <div><strong>{item.title}</strong><p>{item.detail}</p><small>{formatDateTime(item.date)}</small></div>
          </article>
        )) : <EmptyBlock icon={ActivityIcon} title="No task activity" body="Changes, comments, files, and time logs will appear here." />}
      </div>
    </section>
  )

  const mainContent = activeTab === 'Overview' ? (
    <>
      <section className="pmtd-panel pmtd-description">
        <div className="pmtd-section-title pmtd-section-title-action">
          <h2>Description</h2>
          <button type="button" onClick={openDescriptionEditor}><Pencil size={14} /> Edit</button>
        </div>
        {descriptionOpen ? (
          <form className="pmtd-description-form" onSubmit={saveDescription}>
            <textarea value={descriptionDraft} onChange={event => setDescriptionDraft(event.target.value)} rows={5} />
            <div><button type="button" onClick={() => setDescriptionOpen(false)}>Cancel</button><button type="submit">Save</button></div>
          </form>
        ) : <RichDescription value={task.description} />}
      </section>
      {renderSubtasks()}
      <div className="pmtd-bottom-grid">
        {renderComments()}
        {renderFiles()}
      </div>
    </>
  ) : activeTab === 'Subtasks' ? renderSubtasks()
    : activeTab === 'Updates' ? renderComments()
      : activeTab === 'Files' ? renderFiles()
        : activeTab === 'Time Log' ? renderTimeLog()
          : renderActivity()

  return (
    <main className="pmtd-shell">
      <style>{taskDetailsCss}</style>
      <div className="pmtd-main">
        <section className="pmtd-content">
          <div className="pmtd-local-crumbs">
            <Link href="/project-management"><Folder size={14} /> Project Mgmt</Link>
            <ChevronRight size={13} />
            <Link href={projectTasksHref}>Tasks</Link>
            <ChevronRight size={13} />
            <span>{formatTaskCode(task.id)}</span>
          </div>

          <div className="pmtd-back-row">
            <Link href={projectTasksHref}><ArrowLeft size={15} /> Back to tasks</Link>
          </div>

          <header className="pmtd-hero">
            <div className="pmtd-markers">
              <span>{formatTaskCode(task.id)}</span>
              <StatusBadge status={task.status} />
            </div>
            <h1>{task.title}</h1>
            <Link className="pmtd-project-ref" href={`/project-management/projects`}><Folder size={16} /> {project?.name || 'No linked project'}</Link>
          </header>

          <nav className="pmtd-tabs" aria-label="Task detail sections">
            {taskTabs.map(tab => <button key={tab} type="button" className={activeTab === tab ? 'active' : undefined} onClick={() => setActiveTab(tab)}>{tab}</button>)}
          </nav>

          {mainContent}
        </section>

        <aside className="pmtd-side">
          <div className="pmtd-actions">
            <div>
              <button type="button" onClick={() => goToTask(previousTask)} aria-label="Previous task"><ChevronLeft size={16} /></button>
              <button type="button" onClick={() => goToTask(nextTask)} aria-label="Next task"><ChevronRight size={16} /></button>
            </div>
            <button type="button" onClick={shareTask}><Share2 size={15} /> Share</button>
            <button type="button" onClick={openDescriptionEditor}>Edit Task <ChevronDown size={14} /></button>
          </div>

          <section className="pmtd-side-panel">
            <label className="pmtd-field pmtd-field-full">
              <span>Assignee</span>
              <select value={task.assigneeId} onChange={event => store.updateTask(task.id, { assigneeId: event.target.value })}>
                {state.members.map(member => <option key={member.id} value={member.id}>{member.name}</option>)}
              </select>
            </label>

            <div className="pmtd-side-grid">
              <label className="pmtd-field">
                <span>Status</span>
                <select value={task.status} onChange={event => store.updateTaskStatus(task.id, event.target.value as TaskStatus)}>
                  {taskStatuses.map(status => <option key={status} value={status}>{status}</option>)}
                </select>
              </label>
              <label className="pmtd-field">
                <span>Priority</span>
                <select value={task.priority} onChange={event => store.updateTask(task.id, { priority: event.target.value as TaskPriority })}>
                  {taskPriorities.map(priority => <option key={priority} value={priority}>{priority}</option>)}
                </select>
              </label>
            </div>

            <div className="pmtd-side-grid">
              <label className="pmtd-field">
                <span>Start date</span>
                <input type="date" value={dateInputValue(taskStartDate)} disabled />
              </label>
              <label className="pmtd-field">
                <span>Due date</span>
                <input type="date" value={dateInputValue(task.dueDate)} onChange={event => store.updateTask(task.id, { dueDate: event.target.value })} />
              </label>
            </div>

            <section className="pmtd-metric">
              <header><span>Progress</span><strong>{Math.round(task.progress)}%</strong></header>
              <input type="range" min="0" max="100" value={Math.round(task.progress)} onChange={event => store.updateTask(task.id, { progress: Number(event.target.value) })} />
            </section>

            <section className="pmtd-metric pmtd-budget">
              <header><span>Budget <Info size={13} /></span></header>
              <div>
                <strong>{formatCurrency(project?.budget || 0, currency)}</strong>
                <strong>{formatCurrency(projectSpent, currency)}</strong>
                <small>Planned</small>
                <small>Spent</small>
              </div>
              <ProgressBar value={budgetPercent} />
              <p><strong>{formatCurrency(projectRemaining, currency)}</strong><span>Remaining</span><em>{budgetPercent}%</em></p>
            </section>

            <section className="pmtd-metric pmtd-time-summary">
              <header><span>Time estimate</span></header>
              <div><strong>{estimatedHours ? formatHours(estimatedHours) : '-'}</strong><strong>{formatHours(loggedHours)}</strong><small>Estimated</small><small>Logged</small></div>
            </section>

            <section className="pmtd-tags">
              <span>Tags</span>
              <div>
                {task.labels.length ? task.labels.map(label => <em key={label}>{label}</em>) : <em>Untagged</em>}
                <button type="button" aria-label="Tags are edited from the task form"><Plus size={13} /></button>
              </div>
            </section>

            <section className="pmtd-audit">
              <span><small>Created</small><strong>{formatDateTime(createdDate)}</strong><em><Avatar member={createdActor} /> by {createdActor?.name || 'Unassigned'}</em></span>
              <span><small>Last updated</small><strong>{formatDateTime(latestUpdate?.date)}</strong><em><Avatar member={latestActor} /> by {latestActor?.name || 'WiseFlow'}</em></span>
            </section>
          </section>
        </aside>
      </div>
    </main>
  )
}

function EmptyBlock({ title, body, icon: Icon = BriefcaseBusiness }: { title: string; body: string; icon?: LucideIcon }) {
  return <div className="pmtd-empty-block"><Icon size={20} /><strong>{title}</strong><p>{body}</p></div>
}

const taskDetailsCss = `
.pmtd-shell {
  --pmtd-bg: #050505;
  --pmtd-card: #080808;
  --pmtd-card-soft: #101010;
  --pmtd-border: #262626;
  --pmtd-border-soft: #1a1a1a;
  --pmtd-fg: #fafafa;
  --pmtd-muted: #a1a1aa;
  --pmtd-soft: #71717a;
  min-height: calc(100vh - 48px);
  background: var(--pmtd-bg);
  color: var(--pmtd-fg);
  padding: 24px 24px 34px;
  font-family: var(--font-geist-sans), "Geist Sans", sans-serif;
}
html[data-theme='light'] body .app-shell .main-content .pmtd-shell,
html[data-theme='light'] .pmtd-shell {
  --pmtd-bg: #ffffff;
  --pmtd-card: #ffffff;
  --pmtd-card-soft: #f4f4f5;
  --pmtd-border: #e5e7eb;
  --pmtd-border-soft: #eef2f7;
  --pmtd-fg: #09090b;
  --pmtd-muted: #4b5563;
  --pmtd-soft: #6b7280;
}
.pmtd-main {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(330px, 420px);
  gap: 28px;
  align-items: start;
  max-width: var(--wf-content-max, 1440px);
  margin: 0 auto;
}
.pmtd-content,
.pmtd-side {
  min-width: 0;
}
.pmtd-local-crumbs,
.pmtd-local-crumbs a,
.pmtd-back-row a,
.pmtd-hero a,
.pmtd-actions,
.pmtd-markers,
.pmtd-section-title,
.pmtd-section-title-action,
.pmtd-subtask-list label,
.pmtd-comment-form,
.pmtd-file-list article,
.pmtd-time-list article,
.pmtd-activity-list article,
.pmtd-audit em {
  display: flex;
  align-items: center;
}
.pmtd-local-crumbs {
  gap: 8px;
  color: var(--pmtd-soft);
  font-size: 13px;
  margin-bottom: 28px;
}
.pmtd-local-crumbs a {
  gap: 7px;
  color: var(--pmtd-muted);
  text-decoration: none;
}
.pmtd-back-row {
  margin-bottom: 16px;
}
.pmtd-back-row a,
.pmtd-actions button,
.pmtd-section-title-action button,
.pmtd-inline-form button,
.pmtd-comment-form button,
.pmtd-description-form button,
.pmtd-attach-button,
.pmtd-file-list a,
.pmtd-file-list button {
  border: 1px solid var(--pmtd-border);
  border-radius: 8px;
  background: var(--pmtd-card);
  color: var(--pmtd-fg);
  min-height: 38px;
  padding: 0 12px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  font: inherit;
  font-size: 13px;
  font-weight: 650;
  text-decoration: none;
  cursor: pointer;
}
.pmtd-hero {
  margin-bottom: 22px;
}
.pmtd-markers {
  gap: 8px;
  margin-bottom: 10px;
}
.pmtd-markers > span:first-child,
.pmtd-chip {
  min-height: 24px;
  border-radius: 7px;
  background: var(--pmtd-card-soft);
  border: 1px solid var(--pmtd-border-soft);
  padding: 0 10px;
  color: var(--pmtd-fg);
  font-size: 12px;
  font-weight: 650;
}
.pmtd-chip {
  display: inline-flex;
  align-items: center;
  gap: 7px;
}
.pmtd-chip i {
  width: 7px;
  height: 7px;
  border-radius: 999px;
  background: currentColor;
}
.pmtd-chip.state-to-do i { color: #2f80ed; }
.pmtd-chip.state-in-progress i,
.pmtd-chip.state-review i { color: #f59e0b; }
.pmtd-chip.state-done i { color: #22c55e; }
.pmtd-chip.state-blocked i { color: #ef4444; }
.pmtd-hero h1 {
  max-width: 760px;
  margin: 0 0 12px;
  font-size: clamp(30px, 3.1vw, 42px);
  line-height: 1.05;
  letter-spacing: 0;
  font-weight: 700;
}
.pmtd-hero a {
  gap: 9px;
  color: var(--pmtd-muted);
  text-decoration: none;
  font-size: 14px;
}
.pmtd-hero a.pmtd-project-ref:hover,
.pmtd-hero a.pmtd-project-ref:focus-visible,
html[data-theme='dark'] body .app-shell .main-content .pmtd-hero a.pmtd-project-ref:hover,
html[data-theme='dark'] body .app-shell .main-content .pmtd-hero a.pmtd-project-ref:focus-visible {
  background: transparent !important;
  background-color: transparent !important;
  background-image: none !important;
  box-shadow: none !important;
}
.pmtd-tabs {
  min-height: 48px;
  border-bottom: 1px solid var(--pmtd-border);
  display: flex;
  align-items: flex-end;
  gap: 30px;
  margin-bottom: 18px;
  overflow-x: auto;
}
.pmtd-tabs button {
  min-height: 48px;
  border: 0 !important;
  border-bottom: 2px solid transparent !important;
  border-radius: 0 !important;
  background: transparent !important;
  background-color: transparent !important;
  box-shadow: none !important;
  color: var(--pmtd-muted) !important;
  padding: 0 0 12px;
  font: inherit;
  font-size: 14px;
  font-weight: 500;
  white-space: nowrap;
  cursor: pointer;
  transform: none !important;
}
.pmtd-tabs button.active,
.pmtd-tabs button:hover,
.pmtd-tabs button:focus-visible {
  color: var(--pmtd-fg) !important;
  border-bottom-color: var(--pmtd-fg) !important;
  background: transparent !important;
  background-color: transparent !important;
  outline: none;
}
html[data-theme='dark'] body .app-shell .main-content .pmtd-tabs.pmtd-tabs button,
html[data-theme='dark'] body .app-shell .main-content .pmtd-tabs.pmtd-tabs button:hover,
html[data-theme='dark'] body .app-shell .main-content .pmtd-tabs.pmtd-tabs button:focus-visible {
  border: 0 !important;
  border-bottom: 2px solid transparent !important;
  border-radius: 0 !important;
  background: transparent !important;
  background-color: transparent !important;
  box-shadow: none !important;
  color: var(--pmtd-muted) !important;
}
html[data-theme='dark'] body .app-shell .main-content .pmtd-tabs.pmtd-tabs button.active,
html[data-theme='dark'] body .app-shell .main-content .pmtd-tabs.pmtd-tabs button.active:hover,
html[data-theme='dark'] body .app-shell .main-content .pmtd-tabs.pmtd-tabs button.active:focus-visible {
  color: var(--pmtd-fg) !important;
  border-bottom-color: var(--pmtd-fg) !important;
}
.pmtd-panel,
.pmtd-side-panel {
  border: 1px solid var(--pmtd-border);
  border-radius: 8px;
  background: var(--pmtd-card);
}
.pmtd-section-title,
.pmtd-section-title-action {
  background: transparent !important;
}
html[data-theme='dark'] body .app-shell .main-content .pmtd-panel.pmtd-panel:hover,
html[data-theme='dark'] body .app-shell .main-content .pmtd-side-panel.pmtd-side-panel:hover {
  background: var(--pmtd-card) !important;
}
html[data-theme='dark'] body .app-shell .main-content .pmtd-section-title.pmtd-section-title:hover,
html[data-theme='dark'] body .app-shell .main-content .pmtd-section-title-action.pmtd-section-title-action:hover {
  background: transparent !important;
}
html[data-theme='dark'] body .app-shell .main-content .pmtd-shell [class*='head']:hover,
html[data-theme='dark'] body .app-shell .main-content .pmtd-shell [class*='row']:hover,
html[data-theme='dark'] body .app-shell .main-content .pmtd-shell [class*='list']:hover,
html[data-theme='dark'] body .app-shell .main-content .pmtd-shell [class*='grid']:hover {
  background: transparent !important;
}
html[data-theme='dark'] body .app-shell .main-content .pmtd-panel.pmtd-panel,
html[data-theme='dark'] body .app-shell .main-content .pmtd-panel.pmtd-panel:hover {
  background: var(--pmtd-card) !important;
}
html[data-theme='dark'] body .app-shell .main-content .pmtd-panel.pmtd-panel > *:hover,
html[data-theme='dark'] body .app-shell .main-content .pmtd-panel.pmtd-panel .pmtd-section-title:hover,
html[data-theme='dark'] body .app-shell .main-content .pmtd-panel.pmtd-panel .pmtd-section-title-action:hover {
  background: transparent !important;
  background-color: transparent !important;
  background-image: none !important;
}
.pmtd-panel > *,
.pmtd-side-panel > * {
  background-color: transparent !important;
}
.pmtd-panel {
  padding: 18px;
  margin-bottom: 18px;
}
.pmtd-section-title {
  gap: 12px;
  margin-bottom: 14px;
}
.pmtd-section-title h2 {
  margin: 0;
  font-size: 17px;
  line-height: 1.2;
}
.pmtd-section-title span {
  color: var(--pmtd-muted);
  font-size: 13px;
}
.pmtd-section-title .pmtd-progress {
  max-width: 260px;
  flex: 1;
}
.pmtd-section-title-action {
  justify-content: space-between;
}
.pmtd-description p,
.pmtd-empty-block p,
.pmtd-comment-list p,
.pmtd-activity-list p {
  margin: 0;
  color: var(--pmtd-muted);
  font-size: 14px;
  line-height: 1.55;
}
.pmtd-rich-description {
  color: var(--pmtd-muted);
  font-size: 14px;
  line-height: 1.55;
  white-space: pre-wrap;
}
.pmtd-rich-description p,
.pmtd-rich-description h2,
.pmtd-rich-description h3,
.pmtd-rich-description blockquote,
.pmtd-rich-description ul,
.pmtd-rich-description ol {
  margin: 0 0 10px;
}
.pmtd-rich-description h2 {
  color: var(--pmtd-fg);
  font-size: 19px;
}
.pmtd-rich-description h3 {
  color: var(--pmtd-fg);
  font-size: 16px;
}
.pmtd-rich-description blockquote {
  border-left: 3px solid var(--pmtd-border);
  padding-left: 10px;
  color: var(--pmtd-muted);
}
.pmtd-rich-description ul,
.pmtd-rich-description ol {
  padding-left: 20px;
}
.pmtd-rich-description pre {
  margin: 0 0 10px;
  border-radius: 8px;
  background: var(--pmtd-card-soft);
  padding: 10px 12px;
  overflow: auto;
}
.pmtd-description-form {
  display: grid;
  gap: 12px;
}
.pmtd-description-form textarea,
.pmtd-inline-form input,
.pmtd-comment-form input,
.pmtd-field input,
.pmtd-field select {
  border: 1px solid var(--pmtd-border);
  border-radius: 8px;
  background: var(--pmtd-card-soft);
  color: var(--pmtd-fg);
  font: inherit;
}
.pmtd-description-form textarea {
  padding: 12px;
  resize: vertical;
}
.pmtd-description-form div {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}
.pmtd-inline-form {
  display: grid;
  grid-template-columns: minmax(0, 1fr) max-content;
  gap: 10px;
  margin-bottom: 14px;
}
.pmtd-inline-form input,
.pmtd-comment-form input {
  min-width: 0;
  height: 38px;
  padding: 0 12px;
}
.pmtd-subtask-list {
  display: grid;
  gap: 6px;
}
.pmtd-subtask-list label {
  gap: 12px;
  min-height: 36px;
  color: var(--pmtd-fg);
  font-size: 14px;
}
.pmtd-subtask-list input {
  width: 18px;
  height: 18px;
}
.pmtd-subtask-list span {
  min-width: 0;
  flex: 1;
  overflow-wrap: anywhere;
}
.pmtd-subtask-list label:has(input:checked) span {
  color: var(--pmtd-muted);
  text-decoration: line-through;
}
.pmtd-subtask-list small {
  color: var(--pmtd-muted);
  font-size: 13px;
}
.pmtd-subtask-list label > button {
  width: 26px;
  height: 26px;
  border: 1px solid var(--pmtd-border);
  border-radius: 7px;
  background: transparent;
  color: var(--pmtd-muted);
  display: grid;
  place-items: center;
  cursor: pointer;
}
.pmtd-bottom-grid {
  display: grid;
  grid-template-columns: minmax(0, .94fr) minmax(0, 1fr);
  gap: 18px;
}
.pmtd-comment-list,
.pmtd-file-list,
.pmtd-time-list,
.pmtd-activity-list {
  display: grid;
  gap: 14px;
}
.pmtd-comment-list article,
.pmtd-time-list article,
.pmtd-activity-list article {
  align-items: flex-start;
  gap: 12px;
}
.pmtd-comment-list header {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
  margin-bottom: 5px;
}
.pmtd-comment-list strong,
.pmtd-time-list strong,
.pmtd-activity-list strong,
.pmtd-file-list strong {
  font-size: 14px;
}
.pmtd-comment-list small,
.pmtd-time-list small,
.pmtd-activity-list small,
.pmtd-file-list small {
  color: var(--pmtd-muted);
  font-size: 12px;
}
.pmtd-comment-form {
  gap: 10px;
  margin-top: 16px;
}
.pmtd-comment-form input {
  flex: 1;
}
.pmtd-comment-form button {
  width: 38px;
  padding: 0;
}
.pmtd-attach-button {
  position: relative;
  overflow: hidden;
}
.pmtd-attach-button input {
  position: absolute;
  inset: 0;
  opacity: 0;
  cursor: pointer;
}
.pmtd-file-list article {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) max-content auto auto;
  gap: 12px;
  min-height: 46px;
}
.pmtd-file-list article > div {
  min-width: 0;
  display: grid;
  gap: 3px;
}
.pmtd-file-list strong {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.pmtd-file-list a,
.pmtd-file-list button {
  width: 34px;
  min-height: 34px;
  padding: 0;
}
.pmtd-file-icon {
  width: 32px;
  height: 32px;
  border-radius: 7px;
  display: grid;
  place-items: center;
  background: var(--pmtd-card-soft);
  color: var(--pmtd-fg);
}
.pmtd-file-icon.file-xlsx { background: #15803d; }
.pmtd-file-icon.file-pdf { background: #ef4444; }
.pmtd-file-icon.file-image { background: #ca8a04; }
.pmtd-progress {
  height: 8px;
  border-radius: 999px;
  background: var(--pmtd-border);
  display: block;
  overflow: hidden;
}
.pmtd-progress i {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: var(--pmtd-fg);
}
.pmtd-side {
  position: sticky;
  top: 72px;
  align-self: start;
}
.pmtd-actions {
  justify-content: flex-end;
  gap: 8px;
  margin-bottom: 10px;
}
.pmtd-actions > div {
  display: inline-flex;
  border: 1px solid var(--pmtd-border);
  border-radius: 8px;
  overflow: hidden;
}
.pmtd-actions > div button {
  border: 0;
  border-radius: 0;
  width: 36px;
  padding: 0;
}
.pmtd-actions button {
  min-height: 32px;
  padding: 0 10px;
  font-size: 12px;
}
.pmtd-actions > button:last-child {
  background: var(--pmtd-fg);
  color: var(--pmtd-bg);
  border-color: var(--pmtd-fg);
}
.pmtd-side-panel {
  padding: 12px;
  display: grid;
  gap: 10px;
}
.pmtd-side-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
  padding-top: 8px;
  border-top: 1px solid var(--pmtd-border-soft);
}
.pmtd-field {
  min-width: 0;
  display: grid;
  gap: 5px;
}
.pmtd-field-full {
  padding-bottom: 4px;
}
.pmtd-field span,
.pmtd-metric header span,
.pmtd-tags > span,
.pmtd-audit small {
  color: var(--pmtd-muted);
  font-size: 12px;
  font-weight: 650;
}
.pmtd-field input,
.pmtd-field select {
  min-width: 0;
  height: 32px;
  padding: 0 9px;
  font-size: 13px;
}
.pmtd-field input:disabled {
  color: var(--pmtd-muted);
}
.pmtd-metric {
  display: grid;
  gap: 6px;
  padding-top: 8px;
  border-top: 1px solid var(--pmtd-border-soft);
}
.pmtd-metric header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}
.pmtd-metric input[type="range"] {
  width: 100%;
  accent-color: var(--pmtd-fg);
}
.pmtd-budget > div,
.pmtd-time-summary > div,
.pmtd-audit {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 3px 12px;
}
.pmtd-budget > div strong,
.pmtd-time-summary strong {
  font-size: 15px;
}
.pmtd-budget p {
  position: relative;
  display: grid;
  gap: 2px;
  margin: 0;
  color: #22c55e;
}
.pmtd-budget p span {
  color: var(--pmtd-muted);
  font-size: 12px;
}
.pmtd-budget p em {
  position: absolute;
  right: 0;
  top: 0;
  color: var(--pmtd-fg);
  font-style: normal;
}
.pmtd-tags {
  display: grid;
  gap: 6px;
  padding-top: 8px;
  border-top: 1px solid var(--pmtd-border-soft);
}
.pmtd-tags div {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.pmtd-tags em,
.pmtd-tags button {
  min-height: 22px;
  border: 1px solid rgba(139,92,246,.34);
  border-radius: 999px;
  background: rgba(139,92,246,.22);
  color: #d8b4fe;
  padding: 0 7px;
  display: inline-flex;
  align-items: center;
  font-style: normal;
  font-size: 11px;
  font-weight: 650;
}
.pmtd-tags button {
  width: 24px;
  padding: 0;
  justify-content: center;
  border-color: var(--pmtd-border);
  background: var(--pmtd-card-soft);
  color: var(--pmtd-fg);
}
.pmtd-audit {
  padding-top: 8px;
  border-top: 1px solid var(--pmtd-border-soft);
}
.pmtd-audit span {
  display: grid;
  gap: 3px;
  min-width: 0;
}
.pmtd-audit strong {
  font-size: 11.5px;
  line-height: 1.25;
}
.pmtd-audit em {
  gap: 5px;
  color: var(--pmtd-muted);
  font-style: normal;
  font-size: 11px;
}
.pmtd-avatar {
  width: 30px;
  height: 30px;
  border-radius: 999px;
  border: 1px solid var(--pmtd-border);
  background: #8b5cf6;
  color: #fff;
  display: inline-grid;
  place-items: center;
  flex: 0 0 auto;
  font-size: 12px;
  font-weight: 800;
}
.pmtd-side-panel .pmtd-avatar {
  width: 24px;
  height: 24px;
  font-size: 10px;
}
.pmtd-empty,
.pmtd-empty-block {
  min-height: 220px;
  border: 1px dashed var(--pmtd-border);
  border-radius: 8px;
  display: grid;
  place-items: center;
  align-content: center;
  gap: 10px;
  text-align: center;
  color: var(--pmtd-muted);
}
.pmtd-empty h1 {
  margin: 0;
  color: var(--pmtd-fg);
}
.pmtd-empty a {
  color: var(--pmtd-fg);
  display: inline-flex;
  align-items: center;
  gap: 8px;
  text-decoration: none;
}
.pmtd-empty-block {
  min-height: 130px;
  padding: 18px;
}
.pmtd-empty-block strong {
  color: var(--pmtd-fg);
}
@media (max-width: 1180px) {
  .pmtd-main {
    grid-template-columns: 1fr;
  }
  .pmtd-side {
    position: static;
  }
}
@media (max-width: 760px) {
  .pmtd-shell {
    padding: 16px 12px 24px;
  }
  .pmtd-bottom-grid,
  .pmtd-side-grid,
  .pmtd-budget > div,
  .pmtd-time-summary > div,
  .pmtd-audit,
  .pmtd-inline-form,
  .pmtd-file-list article {
    grid-template-columns: 1fr;
  }
  .pmtd-actions {
    justify-content: stretch;
    flex-wrap: wrap;
  }
  .pmtd-actions > button {
    flex: 1;
  }
}
`
