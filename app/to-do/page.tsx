'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  ChevronDown,
  ChevronRight,
  ClipboardList,
  Search,
} from 'lucide-react'

const font = "'DM Sans', sans-serif"
const displayFont = "'Outfit', 'DM Sans', sans-serif"
const tasksStorageKey = 'flowsys-assigned-tasks'
const projectsStorageKey = 'flowsys-projects'
const accountStorageKey = 'flowsys-account'

type TaskStatus = 'Open' | 'In Progress' | 'Completed'

interface AssignedTask {
  id: number
  projectId: number
  title: string
  description: string
  assignee: string
  assignees?: string[]
  dueDate: string
  status: TaskStatus
  source: 'Change Order' | 'Manual'
  createdAt: string
  stageId?: string
}

interface WorkflowStage {
  id: string
  name: string
  type: 'normal' | 'done' | 'failed'
}

interface ProjectRecord {
  id: number
  name: string
  department?: string
  stages?: WorkflowStage[]
}

interface AccountRecord {
  fullName?: string
  name?: string
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

function taskAssigneeNames(task: AssignedTask) {
  return Array.from(new Set([...(task.assignees || []), task.assignee].filter(Boolean)))
}

function formatDeadline(date: string) {
  if (!date) return '-'
  const parsed = new Date(`${date}T19:28:00`)
  return `19:28 ${String(parsed.getDate()).padStart(2, '0')}-${String(parsed.getMonth() + 1).padStart(2, '0')}-${parsed.getFullYear()}`
}

function stageName(task: AssignedTask, project?: ProjectRecord) {
  const stage = project?.stages?.find(item => item.id === task.stageId)
  return stage?.name || (task.status === 'Completed' ? 'Done' : task.status === 'In Progress' ? 'Active' : 'Open')
}

export default function ToDoPage() {
  const [tasks, setTasks] = useState<AssignedTask[]>([])
  const [projects, setProjects] = useState<ProjectRecord[]>([])
  const [account, setAccount] = useState<AccountRecord>({})
  const [search, setSearch] = useState('')
  const [tab, setTab] = useState<'assigned' | 'created' | 'following' | 'team'>('assigned')
  const [status, setStatus] = useState<'All' | TaskStatus | 'Failed' | 'Overdue'>('All')
  const [actionsOpen, setActionsOpen] = useState(false)

  useEffect(() => {
    setTasks(loadStored<AssignedTask[]>(tasksStorageKey, []))
    setProjects(loadStored<ProjectRecord[]>(projectsStorageKey, []))
    setAccount(loadStored<AccountRecord>(accountStorageKey, {}))
  }, [])

  useEffect(() => {
    window.localStorage.setItem(tasksStorageKey, JSON.stringify(tasks))
  }, [tasks])

  const currentUser = account.fullName || account.name || 'James Pandian'
  const projectById = useMemo(() => new Map(projects.map(project => [project.id, project])), [projects])
  const today = new Date()
  const todayTime = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime()

  const pageTasks = tasks.filter(task => {
    const assignees = taskAssigneeNames(task)
    if (tab === 'assigned') return assignees.includes(currentUser) || task.assignee === currentUser || !currentUser
    if (tab === 'created') return task.assignee === currentUser
    if (tab === 'following') return assignees.includes(currentUser)
    return true
  }).filter(task => {
    const term = search.trim().toLowerCase()
    if (!term) return true
    const project = projectById.get(task.projectId)
    return [task.title, task.description, task.assignee, project?.name].filter(Boolean).join(' ').toLowerCase().includes(term)
  }).filter(task => {
    if (status === 'All') return true
    if (status === 'Failed') {
      const project = projectById.get(task.projectId)
      return project?.stages?.find(stage => stage.id === task.stageId)?.type === 'failed'
    }
    if (status === 'Overdue') return Boolean(task.dueDate) && new Date(`${task.dueDate}T00:00:00`).getTime() < todayTime && task.status !== 'Completed'
    return task.status === status
  })

  const addJob = () => {
    const title = window.prompt('Job title')
    if (!title?.trim()) return
    const nextTask: AssignedTask = {
      id: tasks.reduce((max, task) => Math.max(max, task.id), 0) + 1,
      projectId: projects[0]?.id || 0,
      title: title.trim(),
      description: '',
      assignee: currentUser,
      assignees: [currentUser],
      dueDate: new Date().toISOString().slice(0, 10),
      status: 'Open',
      source: 'Manual',
      createdAt: new Date().toISOString(),
    }
    setTasks(previous => [...previous, nextTask])
    setActionsOpen(false)
  }

  const exportJobs = () => {
    const rows = pageTasks.map(task => {
      const project = projectById.get(task.projectId)
      return [task.title, project?.name || '', task.assignee, task.status, formatDeadline(task.dueDate)]
    })
    const csv = [['Title', 'Workflow', 'Assignee', 'Status', 'Deadline'], ...rows].map(row => row.map(cell => JSON.stringify(cell)).join(',')).join('\n')
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
    const link = document.createElement('a')
    link.href = url
    link.download = 'to-do-jobs.csv'
    link.click()
    URL.revokeObjectURL(url)
    setActionsOpen(false)
  }

  const toggleDone = (id: number) => {
    setTasks(previous => previous.map(task => task.id === id ? { ...task, status: task.status === 'Completed' ? 'Open' : 'Completed' } : task))
  }

  return (
    <main className="my-jobs-simple-view" style={{ minHeight: 'calc(100vh - 42px)', background: '#fff', color: '#111', fontFamily: font, overflowX: 'auto' }}>
      <div style={{ minWidth: 1060 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', padding: '18px 20px 0', borderBottom: '1px solid #d8d8d8' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
            <ClipboardList size={22} color="#777" style={{ marginTop: 1 }} />
            <div>
              <div style={{ margin: 0, color: '#111', fontSize: 25, fontWeight: 900, lineHeight: 1, fontFamily: displayFont }}>List of jobs</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 24, marginTop: 16 }}>
                {[
                  ['assigned', 'ASSIGNED TO ME'],
                  ['created', 'CREATED BY ME'],
                  ['following', 'FOLLOWING'],
                  ['team', 'JOBS OF MY TEAM'],
                ].map(([key, label]) => {
                  const active = tab === key
                  return (
                    <button key={key} onClick={() => setTab(key as typeof tab)} style={{ height: 30, border: 'none', borderBottom: active ? '1px solid #111' : '1px solid transparent', background: 'transparent', color: active ? '#111' : '#a0a0a0', fontSize: 12, fontWeight: 800, cursor: 'pointer', padding: 0 }}>
                      {label}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12, position: 'relative' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, width: 150, height: 32, border: '1px solid #d6d6d6', background: '#fff', padding: '0 10px' }}>
              <input value={search} onChange={event => setSearch(event.target.value)} placeholder="Search jobs" style={{ flex: 1, minHeight: 0, border: 'none', outline: 'none', background: 'transparent', color: '#333', fontSize: 13 }} />
              <Search size={15} color="#777" />
            </label>
            <button style={simpleButtonStyle}>Filter <ChevronRight size={14} /></button>
            <button onClick={() => setActionsOpen(previous => !previous)} style={simpleButtonStyle}>Actions <ChevronDown size={14} /></button>
            {actionsOpen && (
              <div style={{ position: 'absolute', top: 38, right: 0, width: 190, background: '#fff', border: '1px solid #d8d8d8', boxShadow: '0 10px 24px rgba(0,0,0,.12)', padding: '7px 0', zIndex: 20 }}>
                <button onClick={addJob} style={actionItemStyle}>Create job</button>
                <button onClick={exportJobs} style={actionItemStyle}>Export jobs</button>
              </div>
            )}
          </div>
        </div>

        <div style={{ height: 46, background: '#f4f4f4', borderBottom: '1px solid #d8d8d8', display: 'flex', alignItems: 'center', padding: '0 18px' }}>
          <span style={{ color: '#8b8b8b', fontSize: 16 }}>List of jobs</span>
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 26 }}>
            {[
              ['ALL', 'All'],
              ['DONE', 'Completed'],
              ['ACTIVE', 'In Progress'],
              ['FAILED', 'Failed'],
              ['OVERDUE', 'Overdue'],
            ].map(([label, value]) => {
              const active = status === value
              return (
                <button key={label} onClick={() => setStatus(value as typeof status)} style={{ border: 'none', background: 'transparent', color: active ? '#1db954' : '#8a8a8a', fontSize: 12, fontWeight: 800, cursor: 'pointer' }}>
                  {label}
                </button>
              )
            })}
          </div>
        </div>

        <div>
          {pageTasks.length === 0 ? (
            <div style={{ padding: 36, color: '#999', fontSize: 14 }}>No jobs found.</div>
          ) : pageTasks.map(task => {
            const project = projectById.get(task.projectId)
            const assignees = taskAssigneeNames(task)
            const primaryAssignee = assignees[0] || currentUser
            return (
              <div key={task.id} style={{ width: '100%', minHeight: 66, borderBottom: '1px solid #e1e1e1', background: '#fff', color: '#111', display: 'grid', gridTemplateColumns: '42px minmax(360px, 1fr) 86px 200px 150px 170px', alignItems: 'center', gap: 12, padding: '10px 18px', boxSizing: 'border-box' }}>
                <button onClick={() => toggleDone(task.id)} title="Toggle done" style={{ width: 19, height: 15, border: '1px solid #9a9a9a', borderRadius: 4, background: task.status === 'Completed' ? '#1db954' : '#fff', cursor: 'pointer' }} />
                <span style={{ minWidth: 0 }}>
                  <span style={{ display: 'block', color: '#111', fontSize: 15, fontWeight: 900, marginBottom: 5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{task.title}</span>
                  <span style={{ display: 'block', color: '#56616a', fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    &raquo; {project?.name || 'NO WORKFLOW'} · {task.description || 'No description'} — created by {task.assignee || currentUser} at {task.createdAt ? new Date(task.createdAt).toLocaleDateString('en-GB').replace(/\//g, '-') : ''}
                  </span>
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  {[0, 1, 2].map(index => <span key={index} style={{ width: 16, height: 16, borderRadius: '50%', background: '#4ebe3c', border: '1px solid #2c9824' }} />)}
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                  <Avatar name={primaryAssignee} />
                  <span style={{ minWidth: 0 }}>
                    <span style={{ display: 'block', color: '#111', fontSize: 13, fontWeight: 800, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{primaryAssignee}</span>
                    <span style={{ display: 'block', color: '#777', fontSize: 12, marginTop: 2 }}>@{primaryAssignee.split(' ')[0]?.toLowerCase()} · CEO</span>
                  </span>
                </span>
                <span style={{ display: 'grid', gap: 4 }}>
                  <span style={{ color: '#9ba3aa', fontSize: 11, fontWeight: 800 }}>STAGE:</span>
                  <span style={{ color: '#111', fontSize: 13, fontWeight: 800, textTransform: 'uppercase' }}>{stageName(task, project)}</span>
                </span>
                <span style={{ display: 'grid', gap: 4 }}>
                  <span style={{ color: '#9ba3aa', fontSize: 11, fontWeight: 800 }}>DEADLINE:</span>
                  <span style={{ color: '#111', fontSize: 13, fontWeight: 800 }}>{formatDeadline(task.dueDate)}</span>
                </span>
              </div>
            )
          })}
        </div>

        <div style={{ height: 58, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 36, color: '#7c8791', fontSize: 14 }}>
          <ChevronRight size={17} style={{ transform: 'rotate(180deg)' }} />
          <span>Page 1</span>
          <ChevronRight size={17} />
        </div>
      </div>
    </main>
  )
}

function Avatar({ name }: { name: string }) {
  return (
    <span style={{ width: 40, height: 40, borderRadius: '50%', background: '#1db954', color: '#191414', display: 'inline-grid', placeItems: 'center', fontSize: 15, fontWeight: 900, flexShrink: 0 }}>
      {(name || '?').charAt(0).toUpperCase()}
    </span>
  )
}

const simpleButtonStyle = {
  height: 32,
  border: '1px solid #d6d6d6',
  borderRadius: 3,
  background: '#fff',
  color: '#111',
  padding: '0 13px',
  display: 'inline-flex',
  alignItems: 'center',
  gap: 7,
  fontSize: 13,
  fontWeight: 800,
  cursor: 'pointer',
}

const actionItemStyle = {
  width: '100%',
  border: 'none',
  background: '#fff',
  color: '#111',
  display: 'block',
  padding: '9px 13px',
  textAlign: 'left' as const,
  fontSize: 13,
  fontWeight: 700,
  cursor: 'pointer',
}
