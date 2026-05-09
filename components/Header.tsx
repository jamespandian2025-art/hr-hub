'use client'

import { useEffect, useRef, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import {
  BadgeDollarSign,
  BarChart3,
  Bell,
  BookOpen,
  Bot,
  Boxes,
  Building2,
  CalendarCheck,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CircleGauge,
  ClipboardCheck,
  ClipboardList,
  FileSignature,
  FileText,
  FolderKanban,
  HandCoins,
  LayoutDashboard,
  LogOut,
  Mail,
  MailCheck,
  Menu,
  MessageCircle,
  Moon,
  PackageSearch,
  Plus,
  Search,
  Settings,
  ShoppingCart,
  SlidersHorizontal,
  Sun,
  Trash2,
  UserCircle,
  UsersRound,
  Warehouse,
  X,
} from 'lucide-react'

type HeaderProps = {
  onMenuClick?: () => void
  compactWorkspace?: boolean
}

type Panel = 'company' | 'invitations' | 'settings' | 'preferences' | 'logout' | null

interface AccountState {
  company: string
  email: string
  fullName?: string
  name?: string
  theme: 'System' | 'Light' | 'Dark'
  density: 'Comfortable' | 'Compact'
  emailNotifications: boolean
  desktopNotifications: boolean
  invitations: { id: number; email: string; role: string; status: 'Pending' | 'Accepted' }[]
}

type ChangeOrderStatus = 'Requested' | 'Priced' | 'Approved' | 'Rejected'

interface ChangeOrder {
  id: number
  projectId: number
  clientName: string
  title: string
  description: string
  requestedBy: string
  status: ChangeOrderStatus
  priceImpact: number
  timelineImpact: number
  files?: string[]
  createdAt: string
  decidedAt?: string
}

interface ProjectRecord {
  id: number
  name: string
}

interface OutboundNotification {
  id: number
  channel: 'Email' | 'SMS'
  recipientRole: 'Admin' | 'Project Manager'
  subject: string
  message: string
  relatedType: 'Change Order'
  relatedId: number
  status: 'Queued'
  createdAt: string
}

interface ReminderTask {
  id: number
  projectId: number
  title: string
  description?: string
  assignee: string
  dueDate: string
  reminderTime?: string
  reminderUrl?: string
  reminderKind?: 'job' | 'manual'
  stickyReminder?: boolean
  markedDone?: boolean
  status: 'Open' | 'In Progress' | 'Completed'
  source: 'Change Order' | 'Manual'
  createdAt: string
}

interface ReminderDraft {
  title: string
  content: string
  date: string
  time: string
  url: string
  sticky: boolean
  markedDone: boolean
}

const storageKey = 'flowsys-account'
const sessionKey = 'flowsys-auth-session'
const changeOrdersKey = 'flowsys-change-orders'
const projectsKey = 'flowsys-projects'
const tasksKey = 'flowsys-assigned-tasks'
const outboundNotificationsKey = 'flowsys-outbound-notifications'
const initialAccount: AccountState = {
  company: 'Livewise Construction',
  email: 'livewiseofficial@gmail.com',
  theme: 'Light',
  density: 'Comfortable',
  emailNotifications: true,
  desktopNotifications: false,
  invitations: [{ id: 1, email: 'projectmanager@example.com', role: 'Project Manager', status: 'Pending' }],
}

const loadAccount = () => {
  if (typeof window === 'undefined') return initialAccount

  try {
    const stored = window.localStorage.getItem(storageKey)
    return stored ? ({ ...initialAccount, ...JSON.parse(stored) } as AccountState) : initialAccount
  } catch {
    return initialAccount
  }
}

// ── Route → page title + icon ──────────────────────────────────────────────
const PAGE_META: { match: string; label: string; icon: React.ComponentType<{ size?: number }> }[] = [
  { match: '/dashboard',          label: 'Dashboard',        icon: LayoutDashboard },
  { match: '/client-database',    label: 'Client Database',  icon: UsersRound      },
  { match: '/people/clients',     label: 'Client Database',  icon: UsersRound      },
  { match: '/people/contacts',    label: 'HR',               icon: Building2       },
  { match: '/people/vendors',     label: 'Supplier Database',icon: PackageSearch   },
  { match: '/sales',              label: 'Sales',            icon: BadgeDollarSign  },
  { match: '/opportunities',      label: 'Sales',            icon: BadgeDollarSign  },
  { match: '/project-management', label: 'Project Mgmt',     icon: FolderKanban    },
  { match: '/projects',           label: 'Project Mgmt',     icon: FolderKanban    },
  { match: '/financial',          label: 'Financial',        icon: HandCoins       },
  { match: '/financials',         label: 'Financial',        icon: HandCoins       },
  { match: '/hr',                 label: 'HR',               icon: Building2       },
  { match: '/people/teams',       label: 'HR',               icon: Building2       },
  { match: '/procurement',        label: 'Procurement',      icon: ShoppingCart    },
  { match: '/resources/pricebook', label: 'Procurement',      icon: ShoppingCart    },
  { match: '/supplier-database',  label: 'Supplier Database',icon: PackageSearch   },
  { match: '/resources/suppliers',label: 'Supplier Database',icon: PackageSearch   },
  { match: '/warehouse-inventory',label: 'Warehouse',        icon: Boxes           },
  { match: '/resources/inventory',label: 'Warehouse',        icon: Boxes           },
  { match: '/resources',          label: 'Docs',             icon: FileText        },
  { match: '/chat',               label: 'Messages',         icon: MessageCircle   },
  { match: '/client-portal',      label: 'Webforms',         icon: ClipboardCheck  },
  { match: '/tasks',              label: 'Workflows',        icon: ClipboardList   },
  { match: '/to-do',              label: 'Workflows',        icon: ClipboardList   },
  { match: '/settings',           label: 'Settings',         icon: Settings        },
]

function getPageMeta(pathname: string) {
  // Longest match wins
  const sorted = [...PAGE_META].sort((a, b) => b.match.length - a.match.length)
  return sorted.find(p => pathname === p.match || pathname.startsWith(p.match + '/'))
    ?? { label: 'WiseFlow', icon: LayoutDashboard }
}

export default function Header({ onMenuClick, compactWorkspace = false }: HeaderProps) {
  const router = useRouter()
  const pathname = usePathname()
  const [globalSearch, setGlobalSearch] = useState('')
  const [open, setOpen] = useState(false)
  const [panel, setPanel] = useState<Panel>(null)
  const [account, setAccount] = useState<AccountState>(loadAccount)
  const [changeOrders, setChangeOrders] = useState<ChangeOrder[]>([])
  const [projects, setProjects] = useState<ProjectRecord[]>([])
  const [tasks, setTasks] = useState<ReminderTask[]>([])
  const [outboundNotifications, setOutboundNotifications] = useState<OutboundNotification[]>([])
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const [notificationFilter, setNotificationFilter] = useState<'all' | 'mentioned' | 'priority'>('all')
  const [remindersOpen, setRemindersOpen] = useState(false)
  const [createReminderOpen, setCreateReminderOpen] = useState(false)
  const [workflowSettingsOpen, setWorkflowSettingsOpen] = useState(false)
  const [createMenuOpen, setCreateMenuOpen] = useState(false)
  const [roleSearch, setRoleSearch] = useState('')
  const [operationRoles, setOperationRoles] = useState<string[]>([])
  const [reminderWeekStart, setReminderWeekStart] = useState(() => startOfWeek(new Date()))
  const [reminderFilter, setReminderFilter] = useState<'all' | 'important'>('all')
  const [reminderDraft, setReminderDraft] = useState<ReminderDraft>(() => ({
    title: '',
    content: '',
    date: new Date().toISOString().slice(0, 10),
    time: '20:00',
    url: '',
    sticky: false,
    markedDone: false,
  }))
  const [toolsOpen, setToolsOpen] = useState(false)
  const [toolsSearch, setToolsSearch] = useState('')
  const [companyName, setCompanyName] = useState('')
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState('Member')
  const [notice, setNotice] = useState('')
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false)
        setNotificationsOpen(false)
        setRemindersOpen(false)
        setToolsOpen(false)
        setCreateMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  useEffect(() => {
    const loadNotifications = () => {
      try {
        setChangeOrders(JSON.parse(window.localStorage.getItem(changeOrdersKey) || '[]') as ChangeOrder[])
        setProjects(JSON.parse(window.localStorage.getItem(projectsKey) || '[]') as ProjectRecord[])
        setTasks(JSON.parse(window.localStorage.getItem(tasksKey) || '[]') as ReminderTask[])
        setOutboundNotifications(JSON.parse(window.localStorage.getItem(outboundNotificationsKey) || '[]') as OutboundNotification[])
      } catch {
        setChangeOrders([])
        setProjects([])
        setTasks([])
        setOutboundNotifications([])
      }
    }

    loadNotifications()
    window.addEventListener('storage', loadNotifications)
    window.addEventListener('focus', loadNotifications)
    const timer = window.setInterval(loadNotifications, 2000)
    return () => {
      window.removeEventListener('storage', loadNotifications)
      window.removeEventListener('focus', loadNotifications)
      window.clearInterval(timer)
    }
  }, [])

  useEffect(() => {
    window.localStorage.setItem(storageKey, JSON.stringify(account))
    const preference = account.theme || 'System'
    const theme = preference === 'System'
      ? window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
      : preference.toLowerCase()
    document.documentElement.dataset.theme = theme
    document.documentElement.dataset.themePreference = preference
    window.dispatchEvent(new Event('flowsys-theme-change'))
  }, [account])

  const openPanel = (nextPanel: Panel) => {
    setPanel(nextPanel)
    setOpen(false)
    setToolsOpen(false)
    setNotice('')
    if (nextPanel === 'company') setCompanyName('')
  }

  const createCompany = () => {
    const trimmed = companyName.trim()
    if (!trimmed) return
    setAccount(previous => ({ ...previous, company: trimmed }))
    setCompanyName('')
    setNotice('Company created and selected.')
  }

  const sendInvite = () => {
    const trimmed = inviteEmail.trim()
    if (!trimmed) return
    setAccount(previous => ({
      ...previous,
      invitations: [
        ...previous.invitations,
        {
          id: previous.invitations.reduce((max, invitation) => Math.max(max, invitation.id), 0) + 1,
          email: trimmed,
          role: inviteRole,
          status: 'Pending',
        },
      ],
    }))
    setInviteEmail('')
    setNotice('Invitation added.')
  }

  const removeInvite = (id: number) => {
    setAccount(previous => ({ ...previous, invitations: previous.invitations.filter(invitation => invitation.id !== id) }))
  }

  const isDarkTheme = account.theme === 'Dark'
  const toggleTheme = () => {
    setAccount(previous => ({ ...previous, theme: previous.theme === 'Dark' ? 'Light' : 'Dark' }))
  }
  const actionableRequests = changeOrders.filter(order => order.status === 'Requested' || order.status === 'Priced')
  const latestRequests = [...changeOrders].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 8)
  const projectName = (id: number) => projects.find(project => project.id === id)?.name || `Project #${id}`
  const displayName = account.fullName || account.name || 'Reymark'
  const notificationItems = latestRequests.length
    ? latestRequests.map((order, index) => ({
      id: order.id,
      title: `[${projectName(order.projectId)}] ${order.requestedBy || order.clientName} requested ${order.title}`,
      lines: [
        `${order.description || order.title}`,
        `${order.clientName} · ${order.status}`,
        `${order.files?.length || 0} photo${(order.files?.length || 0) === 1 ? '' : 's'} · ${outboundNotifications.filter(item => item.relatedId === order.id).length} alerts queued`,
      ],
      time: new Date(order.createdAt).toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' }),
      date: new Date(order.createdAt).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: '2-digit', year: 'numeric' }),
      age: `${Math.max(0, Math.floor((Date.now() - new Date(order.createdAt).getTime()) / 86400000))} days ago`,
      mentioned: index === 0,
      priority: order.status === 'Requested',
      target: '/projects',
    }))
    : [
      { id: 1, title: '[WORKFLOWS] Welcome to WiseFlow notifications', lines: ['Workflow updates, stage changes, and tagged notes will appear here.', 'Click any notification to open its related work.', 'Use filters above to narrow the list.'], time: '10:19', date: 'Monday, Dec 15, 2025', age: 'today', mentioned: true, priority: false, target: '/tasks' },
    ]
  const filteredNotifications = notificationItems.filter(item =>
    notificationFilter === 'all' ? true : notificationFilter === 'mentioned' ? item.mentioned : item.priority
  )
  const reminderTasks = tasks.filter(task => task.dueDate && task.status !== 'Completed' && !task.markedDone)
  const importantReminders = reminderTasks.filter(task => task.stickyReminder || isSameDate(new Date(`${task.dueDate}T00:00:00`), new Date()) || new Date(`${task.dueDate}T00:00:00`) < startOfDay(new Date()))
  const shownReminderTasks = reminderFilter === 'important' ? importantReminders : reminderTasks
  const weekDays = Array.from({ length: 7 }, (_, index) => addDays(reminderWeekStart, index))
  const weekEnd = addDays(reminderWeekStart, 6)

  const dispatchWorkspaceAction = (name: string, detail?: unknown) => {
    window.dispatchEvent(new CustomEvent(name, { detail }))
  }

  const openCreateReminder = () => {
    setReminderDraft({
      title: '',
      content: '',
      date: new Date().toISOString().slice(0, 10),
      time: '20:00',
      url: '',
      sticky: false,
      markedDone: false,
    })
    setCreateReminderOpen(true)
  }

  const createReminder = () => {
    const title = reminderDraft.title.trim()
    if (!title || !reminderDraft.date) return
    const linkedJob = findLinkedReminderTask(tasks, reminderDraft.url)
    const nextTasks: ReminderTask[] = [
      ...tasks,
      {
        id: tasks.reduce((max, task) => Math.max(max, task.id), 0) + 1,
        projectId: linkedJob?.projectId || projects[0]?.id || 0,
        title,
        description: reminderDraft.content.trim(),
        assignee: displayName,
        dueDate: reminderDraft.date,
        reminderTime: reminderDraft.time,
        reminderUrl: reminderDraft.url.trim(),
        reminderKind: linkedJob ? 'job' : 'manual',
        stickyReminder: reminderDraft.sticky,
        markedDone: reminderDraft.markedDone,
        status: reminderDraft.markedDone ? 'Completed' : 'Open',
        source: 'Manual',
        createdAt: new Date().toISOString(),
      },
    ]
    setTasks(nextTasks)
    window.localStorage.setItem(tasksKey, JSON.stringify(nextTasks))
    window.dispatchEvent(new Event('storage'))
    setCreateReminderOpen(false)
  }

  const openReminderTarget = (task: ReminderTask) => {
    setRemindersOpen(false)
    if (task.reminderUrl?.trim()) {
      const target = task.reminderUrl.trim()
      if (target.startsWith('/')) router.push(target)
      else if (/^https?:\/\//i.test(target)) window.open(target, '_blank', 'noopener,noreferrer')
      else router.push(`/tasks?task=${encodeURIComponent(target)}`)
      return
    }
    router.push(`/tasks?task=${task.id}`)
  }

  const navigateTool = (href: string, viewMode?: string) => {
    setToolsOpen(false)
    router.push(href)
    if (viewMode) window.setTimeout(() => dispatchWorkspaceAction('flowsys-workspace-view', { mode: viewMode }), 0)
  }

  const toolSections = [
    {
      label: 'Work Operations',
      items: [
        { label: 'Requests', detail: 'Client and change requests', icon: CheckCircle2, action: () => navigateTool('/projects') },
        { label: 'Workflows', detail: 'Jobs and workflow stages', icon: ClipboardList, action: () => navigateTool('/tasks', 'Workflows') },
        { label: 'Expenses', detail: 'Financial records', icon: HandCoins, action: () => navigateTool('/financial') },
        { label: 'Projects', detail: 'Project management', icon: FolderKanban, action: () => navigateTool('/project-management') },
        { label: 'Bookings', detail: 'Schedules and reminders', icon: CalendarCheck, action: () => navigateTool('/tasks', 'Reminders') },
        { label: 'Offices', detail: 'Teams and locations', icon: Building2, action: () => navigateTool('/settings') },
      ],
    },
    {
      label: 'Unified Communications',
      items: [
        { label: 'Messages', detail: 'Team chat', icon: MessageCircle, action: () => navigateTool('/chat') },
        { label: 'Townhall', detail: 'Company updates', icon: Building2, action: () => navigateTool('/dashboard') },
        { label: 'Meetings', detail: 'Meeting tasks', icon: CalendarCheck, action: () => navigateTool('/to-do') },
        { label: 'Work Rules', detail: 'Operating guidelines', icon: BookOpen, action: () => navigateTool('/settings') },
      ],
    },
    {
      label: 'Core Utility Services',
      items: [
        { label: 'Docs', detail: 'Project documents', icon: FileText, action: () => navigateTool('/resources') },
        { label: 'E-Sign', detail: 'Approval documents', icon: FileSignature, action: () => navigateTool('/projects') },
        { label: 'Automations', detail: 'Workflow automations', icon: Bot, action: () => navigateTool('/tasks', 'Workflows') },
        { label: 'Webforms', detail: 'Client forms', icon: ClipboardCheck, action: () => navigateTool('/client-portal') },
        { label: 'Todos', detail: 'My to-dos', icon: CheckCircle2, action: () => navigateTool('/to-do') },
        { label: 'Mails', detail: 'Outbound alerts', icon: MailCheck, action: () => navigateTool('/settings') },
      ],
    },
    {
      label: 'Core Apps',
      items: [
        { label: 'Dashboard', detail: 'Business overview', icon: LayoutDashboard, action: () => navigateTool('/dashboard') },
        { label: 'Client database', detail: 'Clients and contacts', icon: UsersRound, action: () => navigateTool('/client-database') },
        { label: 'Sales', detail: 'Opportunities', icon: BadgeDollarSign, action: () => navigateTool('/sales') },
        { label: 'Procurement', detail: 'Purchasing', icon: ShoppingCart, action: () => navigateTool('/procurement') },
        { label: 'Supplier database', detail: 'Vendor list', icon: PackageSearch, action: () => navigateTool('/supplier-database') },
        { label: 'Warehouse', detail: 'Inventory', icon: Warehouse, action: () => navigateTool('/warehouse-inventory') },
      ],
    },
  ]

  const searchedToolSections = toolSections
    .map(section => ({
      ...section,
      items: section.items.filter(item => [item.label, item.detail].join(' ').toLowerCase().includes(toolsSearch.trim().toLowerCase())),
    }))
    .filter(section => section.items.length > 0)

  const pageMeta = getPageMeta(pathname)
  const PageIcon = pageMeta.icon
  const isTasksPage = pathname === '/tasks' || pathname.startsWith('/tasks/')

  if (compactWorkspace) {
    const CWPageIcon = pageMeta.icon
    return (
      <div
        ref={ref}
        className="app-header workspace-topbar"
        style={{ height: 42, background: '#0f3d2a', color: '#e6fbfd', display: 'grid', gridTemplateColumns: 'minmax(320px, 1fr) minmax(260px, 360px) minmax(320px, 1fr)', alignItems: 'center', gap: 12, padding: '0 8px', position: 'sticky', top: 0, zIndex: 95, boxShadow: '0 1px 0 rgba(255,255,255,.08) inset', fontFamily: 'inherit' }}
      >
        {/* ── Left: menu + dynamic page label + contextual icons ── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
          <button onClick={() => { setToolsOpen(prev => !prev); setOpen(false); setNotificationsOpen(false) }} aria-label="Open tools menu" style={workspaceIconButtonStyle}>
            <Menu size={16} />
          </button>

          {/* Dynamic page name pill */}
          <button
            style={{ ...workspacePillButtonStyle, fontWeight: 800, display: 'inline-flex', alignItems: 'center', gap: 6 }}
            onClick={() => {}}
          >
            <CWPageIcon size={14} />
            {pageMeta.label}
          </button>

          {/* Workflows-page shortcuts */}
          {isTasksPage && <>
            <button onClick={() => { router.push('/tasks'); dispatchWorkspaceAction('flowsys-workspace-view', { mode: 'Board' }) }} title="Board" style={workspaceCountButtonStyle}>
              <ClipboardList size={15} />
            </button>
            <button onClick={() => { window.sessionStorage.setItem('flowsys-workspace-pending-view', 'SystemReport'); router.push('/tasks'); window.setTimeout(() => dispatchWorkspaceAction('flowsys-workspace-view', { mode: 'SystemReport' }), 120) }} title="System report" style={workspaceIconButtonStyle}>
              <BarChart3 size={15} />
            </button>
            <button onClick={() => setWorkflowSettingsOpen(true)} title="Settings" style={workspaceIconButtonStyle}>
              <Settings size={15} />
            </button>
          </>}

          {/* Create button — always visible */}
          <div
            onMouseEnter={() => setCreateMenuOpen(true)}
            onMouseLeave={() => setCreateMenuOpen(false)}
            style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', height: 42 }}
          >
            <button onClick={() => setCreateMenuOpen(prev => !prev)} title="Create" style={workspaceIconButtonStyle}>
              <Plus size={16} />
            </button>
            {createMenuOpen && (
              <div style={{ position: 'absolute', top: 34, left: 0, width: 262, background: '#fff', color: '#333', borderRadius: 3, boxShadow: '0 8px 24px rgba(0,0,0,.2)', padding: '9px 0', zIndex: 150 }}>
                <button onClick={() => { setCreateMenuOpen(false); router.push('/tasks'); window.setTimeout(() => dispatchWorkspaceAction('flowsys-workspace-create-workflow'), 120) }} style={createMenuItemStyle}>Create new workflow service</button>
                <button onClick={() => { setCreateMenuOpen(false); dispatchWorkspaceAction('flowsys-workspace-create-job') }} style={createMenuItemStyle}>Create new job</button>
                <button onClick={() => { setCreateMenuOpen(false); router.push('/tasks'); window.setTimeout(() => dispatchWorkspaceAction('flowsys-workspace-create-group'), 120) }} style={createMenuItemStyle}>Create new service group</button>
              </div>
            )}
          </div>
        </div>

        {toolsOpen && (
          <div style={{ position: 'absolute', top: 42, left: 0, width: 500, maxWidth: 'calc(100vw - 16px)', height: 'calc(100vh - 42px)', background: '#fff', borderRight: '1px solid #dfe5e8', boxShadow: '18px 0 45px rgba(0,0,0,.16)', zIndex: 120, display: 'grid', gridTemplateColumns: '58px minmax(0, 1fr)', color: '#333' }}>
            <div style={{ borderRight: '1px solid #e6ecef', background: '#fbfbfb', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '16px 10px', gap: 16 }}>
              <button onClick={() => navigateTool('/dashboard')} title="Livewise" style={{ width: 36, height: 36, border: 'none', borderRadius: 3, background: '#0f8f65', color: '#fff', fontSize: 14, fontWeight: 900, cursor: 'pointer' }}>LC</button>
              <button onClick={() => openPanel('company')} title="Create company" style={launcherRailButtonStyle}><Plus size={18} /></button>
              <div style={{ flex: 1 }} />
              <button onClick={() => navigateTool('/settings')} title="Settings" style={launcherRailButtonStyle}><Settings size={18} /></button>
              <button onClick={() => openPanel('logout')} title="Logout" style={launcherRailButtonStyle}><LogOut size={18} /></button>
            </div>

            <div style={{ padding: '16px 22px 28px', overflowY: 'auto' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                <span style={{ width: 38, height: 38, borderRadius: '50%', background: '#8b83e6', color: '#fff', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
                  <UserCircle size={24} />
                </span>
                <div style={{ minWidth: 0 }}>
                  <div style={{ color: '#333', fontSize: 15, fontWeight: 800, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{displayName}</div>
                  <div style={{ color: '#777', fontSize: 13, marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{account.company}</div>
                </div>
              </div>

              <label style={{ display: 'flex', alignItems: 'center', gap: 8, height: 36, background: '#f2f2f2', borderRadius: 3, padding: '0 12px', marginBottom: 28 }}>
                <input value={toolsSearch} onChange={event => setToolsSearch(event.target.value)} placeholder="Quick filter apps" style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', color: '#333', fontSize: 14 }} />
                <Search size={16} color="#999" />
              </label>

              <button onClick={() => openPanel('settings')} style={{ ...launcherToolButtonStyle, marginBottom: 24 }}>
                <Settings size={26} color="#888" />
                <span style={{ minWidth: 0 }}>
                  <span style={launcherToolTitleStyle}>Settings</span>
                  <span style={launcherToolDetailStyle}>CRM Centralized Settings</span>
                </span>
              </button>

              {searchedToolSections.map(section => (
                <div key={section.label} style={{ marginBottom: 28 }}>
                  <div style={{ color: '#9a9a9a', fontSize: 10, fontWeight: 800, textTransform: 'uppercase', margin: '0 0 10px 8px' }}>{section.label}</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', columnGap: 26, rowGap: 8 }}>
                    {section.items.map(item => {
                      const Icon = item.icon
                      return (
                        <button key={item.label} onClick={item.action} style={launcherToolButtonStyle}>
                          <Icon size={18} color="#858585" />
                          <span style={{ minWidth: 0 }}>
                            <span style={launcherToolTitleStyle}>{item.label}</span>
                            <span style={launcherToolDetailStyle}>{item.detail}</span>
                          </span>
                        </button>
                      )
                    })}
                  </div>
                </div>
              ))}

              {searchedToolSections.length === 0 && (
                <div style={{ color: '#999', fontSize: 13, padding: '20px 8px' }}>No tools match that search.</div>
              )}
            </div>
          </div>
        )}

        <label style={{ display: 'flex', alignItems: 'center', gap: 9, height: 28, borderRadius: 4, background: '#fff', padding: '0 12px', minWidth: 0 }}>
          <Search size={15} color="#111" />
          <input
            className="workspace-general-search-input"
            onChange={event => dispatchWorkspaceAction('flowsys-workspace-general-search', { value: event.target.value })}
            placeholder="Search"
            style={{ flex: 1, minWidth: 0, border: 'none', outline: 'none', background: 'transparent', color: '#111', fontSize: 13, fontWeight: 700 }}
          />
        </label>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8, minWidth: 0 }}>
          <button title="Reminders" onClick={() => { setRemindersOpen(true); setNotificationsOpen(false); setOpen(false); setToolsOpen(false) }} style={workspaceIconButtonStyle}>
            <CircleGauge size={15} />
          </button>
          <button
            onClick={() => { setNotificationsOpen(!notificationsOpen); setOpen(false) }}
            aria-label="Open notifications"
            style={{ ...workspaceIconButtonStyle, position: 'relative' }}
          >
            <Bell size={15} />
            {actionableRequests.length > 0 && <span style={workspaceNotificationBadgeStyle}>{actionableRequests.length}</span>}
          </button>
          <button onClick={toggleTheme} title={isDarkTheme ? 'Switch to light theme' : 'Switch to dark theme'} style={workspaceIconButtonStyle}>
            {isDarkTheme ? <Moon size={15} /> : <Sun size={15} />}
          </button>
          <button onClick={() => setOpen(!open)} style={{ border: 'none', background: 'transparent', color: '#f7ffff', display: 'inline-flex', alignItems: 'center', cursor: 'pointer', padding: 0 }}>
            <span style={{ width: 32, height: 32, borderRadius: '50%', background: '#8b83e6', color: '#fff', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
              <UserCircle size={20} />
            </span>
          </button>

          {notificationsOpen && (
            <NotificationPanel
              items={filteredNotifications}
              allCount={notificationItems.length}
              mentionedCount={notificationItems.filter(item => item.mentioned).length}
              priorityCount={notificationItems.filter(item => item.priority).length}
              filter={notificationFilter}
              onFilter={setNotificationFilter}
              onClose={() => setNotificationsOpen(false)}
              onOpen={target => { setNotificationsOpen(false); router.push(target) }}
            />
          )}

          {open && (
            <div className="profile-menu" style={{ position: 'absolute', top: 42, right: 8, width: 280, background: '#fff', border: '1px solid #eef2f7', borderRadius: 12, boxShadow: '0 24px 70px rgba(15,23,42,0.22)', overflow: 'hidden', zIndex: 100, color: '#111827' }}>
              <div style={{ padding: 20, textAlign: 'center' }}>
                <div style={{ fontWeight: 600 }}>{account.company}</div>
                <div style={{ fontSize: 12, color: '#6b7280' }}>{account.email}</div>
              </div>
              {[
                { label: 'Create Company', icon: Plus, panel: 'company' as Panel },
                { label: 'Invitations', icon: Mail, panel: 'invitations' as Panel },
                { label: 'Account settings', icon: Settings, panel: 'settings' as Panel },
                { label: 'Preferences', icon: SlidersHorizontal, panel: 'preferences' as Panel },
              ].map(item => {
                const Icon = item.icon
                return <button key={item.label} onClick={() => openPanel(item.panel)} style={menuButtonStyle}><Icon size={16} />{item.label}</button>
              })}
              <button onClick={() => openPanel('logout')} style={{ ...menuButtonStyle, color: 'red', borderTop: '1px solid #eee' }}><LogOut size={16} />Logout</button>
            </div>
          )}

          {remindersOpen && (
            <div style={{ position: 'fixed', inset: 0, zIndex: 130, background: 'rgba(0,0,0,.46)', backdropFilter: 'blur(3px)', padding: 16, color: '#222' }}>
              <div style={{ width: '100%', height: 'calc(100vh - 32px)', background: '#fff', borderRadius: 4, overflow: 'hidden', boxShadow: '0 18px 70px rgba(0,0,0,.35)', display: 'grid', gridTemplateColumns: '380px minmax(0, 1fr)' }}>
                <aside style={{ borderRight: '1px solid #d8d8d8', background: '#f5f5f5', display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                  <div style={{ height: 50, borderBottom: '1px solid #d8d8d8', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr' }}>
                    {[
                      ['important', 'IMPORTANT', importantReminders.length],
                      ['all', 'TODAY', reminderTasks.filter(task => isSameDate(new Date(`${task.dueDate}T00:00:00`), new Date())).length],
                      ['late', 'LATE', reminderTasks.filter(task => new Date(`${task.dueDate}T00:00:00`) < startOfDay(new Date())).length],
                    ].map(([key, label, count]) => {
                      const active = reminderFilter === key || (key === 'late' && false)
                      return (
                        <button key={String(key)} onClick={() => setReminderFilter(key === 'important' ? 'important' : 'all')} style={{ border: 'none', borderBottom: active ? '2px solid #168c96' : '2px solid transparent', background: 'transparent', color: active ? '#168c96' : '#888', fontSize: 11, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9, cursor: 'pointer' }}>
                          <span style={{ width: 18, height: 18, borderRadius: '50%', background: active ? '#168c96' : '#999', color: '#fff', display: 'grid', placeItems: 'center', fontSize: 10 }}>{count as number}</span>
                          {label}
                        </button>
                      )
                    })}
                  </div>

                  <div style={{ padding: '18px 14px', flex: 1, overflowY: 'auto' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#111', fontWeight: 800 }}>
                        <ChevronRight size={14} style={{ transform: 'rotate(90deg)' }} /> Upcoming
                      </div>
                      <span style={{ minWidth: 18, height: 20, border: '1px solid #f0c7c7', borderRadius: 4, color: '#d96363', display: 'grid', placeItems: 'center', fontSize: 12, background: '#fff' }}>{shownReminderTasks.length}</span>
                    </div>
                    {shownReminderTasks.length === 0 ? (
                      <div style={{ padding: 20, color: '#888', fontSize: 13, textAlign: 'center' }}>No reminders yet.</div>
                    ) : shownReminderTasks.map(task => (
                      <button key={task.id} onClick={() => openReminderTarget(task)} style={{ width: '100%', border: 'none', borderRadius: 3, background: '#fff', boxShadow: '0 1px 4px rgba(0,0,0,.12)', padding: '12px 14px', display: 'grid', gridTemplateColumns: '14px minmax(0, 1fr) 18px', alignItems: 'center', gap: 10, textAlign: 'left', marginBottom: 8, cursor: 'pointer' }}>
                        <span style={{ width: 13, height: 13, borderRadius: task.reminderKind === 'manual' ? 2 : '50%', background: task.reminderKind === 'manual' ? '#bbb' : '#2c9bab' }} />
                        <span style={{ minWidth: 0 }}>
                          <span style={{ display: 'block', color: '#222', fontSize: 14, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{task.title}{task.reminderKind === 'job' ? ` - ${projectName(task.projectId)}` : ''}</span>
                          <span style={{ display: 'block', color: '#777', fontSize: 12, marginTop: 3 }}>{formatReminderTime(task)}</span>
                        </span>
                        <CircleGauge size={16} color="#27a9cb" />
                      </button>
                    ))}
                  </div>

                  <div style={{ padding: 15 }}>
                    <button onClick={openCreateReminder} style={{ width: '100%', height: 33, border: '1px solid #ccefd9', borderRadius: 3, background: '#e3f8eb', color: '#00a848', fontSize: 12, fontWeight: 800, cursor: 'pointer' }}>
                      + CREATE REMINDER
                    </button>
                  </div>
                </aside>

                <section style={{ minWidth: 0, display: 'flex', flexDirection: 'column', background: '#fff' }}>
                  <div style={{ height: 50, borderBottom: '1px solid #d8d8d8', display: 'flex', alignItems: 'center', gap: 16, padding: '0 24px' }}>
                    <CalendarDays size={21} color="#999" />
                    <strong style={{ fontSize: 20, color: '#111', fontWeight: 500 }}>{displayName}</strong>
                    <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 14 }}>
                      <div style={{ display: 'flex', border: '1px solid #d6d6d6', borderRadius: 2, overflow: 'hidden' }}>
                        <button onClick={() => setReminderFilter('all')} style={{ border: 'none', background: reminderFilter === 'all' ? '#fff' : '#f5f5f5', color: '#168c96', padding: '8px 20px', fontWeight: 700, cursor: 'pointer' }}>Everything</button>
                        <button onClick={() => setReminderFilter('important')} style={{ border: 'none', borderLeft: '1px solid #d6d6d6', background: reminderFilter === 'important' ? '#fff' : '#f5f5f5', color: '#999', padding: '8px 20px', cursor: 'pointer' }}>Only important</button>
                      </div>
                      <button onClick={() => setReminderWeekStart(addDays(reminderWeekStart, -7))} style={reminderHeaderButtonStyle}><ChevronLeft size={18} /></button>
                      <span style={{ fontSize: 13, fontWeight: 700, color: '#222' }}>Week of&nbsp; {formatCompactDate(reminderWeekStart)}</span>
                      <button onClick={() => setReminderWeekStart(addDays(reminderWeekStart, 7))} style={reminderHeaderButtonStyle}><ChevronRight size={18} /></button>
                      <button onClick={() => setReminderWeekStart(startOfWeek(new Date()))} style={{ ...reminderHeaderButtonStyle, width: 'auto', padding: '0 16px', fontWeight: 700 }}>Today</button>
                      <span style={{ width: 1, height: 28, background: '#ddd' }} />
                      <button onClick={() => setRemindersOpen(false)} style={{ ...reminderHeaderButtonStyle, width: 'auto', padding: '0 14px', gap: 6, display: 'inline-flex', alignItems: 'center', fontWeight: 700 }}><X size={15} /> CLOSE</button>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(120px, 1fr))', height: 72, borderBottom: '1px solid #ddd' }}>
                    {weekDays.map(day => {
                      const today = isSameDate(day, new Date())
                      return (
                        <div key={day.toISOString()} style={{ borderRight: '1px solid #e4e4e4', textAlign: 'center', paddingTop: 12, color: today ? '#168c96' : '#999', borderBottom: today ? '2px solid #168c96' : 'none' }}>
                          <div style={{ fontSize: 13, fontWeight: 800 }}>{day.toLocaleDateString('en-US', { weekday: 'long' }).toUpperCase()}</div>
                          <div style={{ fontSize: 24, color: today ? '#168c96' : '#444', lineHeight: 1.1 }}>{String(day.getDate()).padStart(2, '0')}</div>
                        </div>
                      )
                    })}
                  </div>

                  <div style={{ flex: 1, display: 'grid', gridTemplateColumns: 'repeat(7, minmax(120px, 1fr))', minHeight: 0 }}>
                    {weekDays.map(day => (
                      <div key={day.toISOString()} style={{ borderRight: '1px solid #e4e4e4', position: 'relative', padding: '48vh 6px 8px' }}>
                        {shownReminderTasks.filter(task => isSameDate(new Date(`${task.dueDate}T00:00:00`), day)).map(task => (
                          <button key={task.id} onClick={() => openReminderTarget(task)} style={{ width: '100%', minHeight: 48, border: '1px solid transparent', background: task.reminderKind === 'manual' ? '#f4f4f4' : '#e5f2f5', color: task.reminderKind === 'manual' ? '#333' : '#168c96', textAlign: 'left', padding: '8px 10px', cursor: 'pointer', display: 'grid', gridTemplateColumns: '12px minmax(0, 1fr)', gap: 8, alignItems: 'start' }}>
                            <span style={{ width: 10, height: 10, borderRadius: task.reminderKind === 'manual' ? 2 : '50%', background: task.reminderKind === 'manual' ? '#bdbdbd' : '#ff946c', marginTop: 3 }} />
                            <span style={{ minWidth: 0 }}>
                              <span style={{ display: 'block', fontSize: 12, fontWeight: 800, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{task.title}{task.reminderKind === 'job' ? ` - ${projectName(task.projectId)}` : ''}</span>
                              <span style={{ display: 'block', color: task.reminderKind === 'manual' ? '#777' : '#ff5b2f', fontSize: 11, marginTop: 4 }}>{task.reminderTime || '19:28'}</span>
                            </span>
                          </button>
                        ))}
                      </div>
                    ))}
                  </div>
                </section>
              </div>

              {createReminderOpen && (
                <div style={{ position: 'fixed', inset: 0, zIndex: 150, background: 'rgba(0,0,0,.46)', display: 'grid', placeItems: 'center', color: '#111' }}>
                  <div onClick={event => event.stopPropagation()} style={{ width: 494, background: '#fff', borderRadius: 2, boxShadow: '0 24px 80px rgba(0,0,0,.4)', overflow: 'hidden' }}>
                    <div style={{ height: 56, borderBottom: '1px solid #e0e0e0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 18px' }}>
                      <h2 style={{ margin: 0, color: '#111', fontSize: 16, fontWeight: 900, letterSpacing: 0 }}>CREATE A NEW REMINDER</h2>
                      <button onClick={() => setCreateReminderOpen(false)} style={{ border: 'none', background: 'transparent', color: '#999', cursor: 'pointer', display: 'grid', placeItems: 'center' }}>
                        <X size={20} />
                      </button>
                    </div>
                    <div style={{ padding: '18px 20px 20px', display: 'grid', gap: 15 }}>
                      <label style={reminderFieldGroupStyle}>
                        <span style={reminderFieldLabelStyle}>Reminder title <strong style={{ color: '#111' }}>*</strong></span>
                        <input autoFocus value={reminderDraft.title} onChange={event => setReminderDraft(prev => ({ ...prev, title: event.target.value }))} placeholder="Reminder title *" style={reminderTextInputStyle} />
                      </label>
                      <label style={reminderFieldGroupStyle}>
                        <span style={reminderFieldLabelStyle}>Reminder content (optional)</span>
                        <input value={reminderDraft.content} onChange={event => setReminderDraft(prev => ({ ...prev, content: event.target.value }))} placeholder="Reminder content (optional)" style={reminderTextInputStyle} />
                      </label>
                      <div style={reminderFieldGroupStyle}>
                        <span style={reminderFieldLabelStyle}>Reminder time</span>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 180px', border: '1px solid #cfcfcf', height: 33 }}>
                          <label style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '0 12px', borderRight: '1px solid #e0e0e0', color: '#777' }}>
                            <CalendarDays size={15} color="#999" />
                            <input type="date" value={reminderDraft.date} onChange={event => setReminderDraft(prev => ({ ...prev, date: event.target.value }))} style={{ border: 'none', outline: 'none', background: 'transparent', color: '#555', width: '100%' }} />
                          </label>
                          <label style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '0 12px', color: '#777' }}>
                            <CircleGauge size={15} color="#999" />
                            <input type="time" value={reminderDraft.time} onChange={event => setReminderDraft(prev => ({ ...prev, time: event.target.value }))} style={{ border: 'none', outline: 'none', background: 'transparent', color: '#555', width: '100%' }} />
                          </label>
                        </div>
                      </div>
                      <label style={reminderFieldGroupStyle}>
                        <span style={reminderFieldLabelStyle}>Linked to (URL)</span>
                        <input value={reminderDraft.url} onChange={event => setReminderDraft(prev => ({ ...prev, url: event.target.value }))} placeholder="Linked to (URL)" style={reminderTextInputStyle} />
                      </label>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 22, paddingTop: 2 }}>
                        <label style={reminderSwitchRowStyle}>
                          <button type="button" onClick={() => setReminderDraft(prev => ({ ...prev, sticky: !prev.sticky }))} style={reminderSwitchStyle(reminderDraft.sticky)}><span style={reminderSwitchKnobStyle(reminderDraft.sticky)} /></button>
                          Sticky reminder
                        </label>
                        <label style={reminderSwitchRowStyle}>
                          <button type="button" onClick={() => setReminderDraft(prev => ({ ...prev, markedDone: !prev.markedDone }))} style={reminderSwitchStyle(reminderDraft.markedDone)}><span style={reminderSwitchKnobStyle(reminderDraft.markedDone)} /></button>
                          Marked done
                        </label>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 12 }}>
                        <button onClick={() => setCreateReminderOpen(false)} style={{ height: 38, border: 'none', borderRadius: 3, background: '#f0f0f0', color: '#888', fontSize: 14, fontWeight: 800, cursor: 'pointer' }}>Cancel</button>
                        <button onClick={createReminder} disabled={!reminderDraft.title.trim() || !reminderDraft.date} style={{ height: 38, border: 'none', borderRadius: 3, background: reminderDraft.title.trim() && reminderDraft.date ? '#18b400' : '#9ccc91', color: '#fff', fontSize: 14, fontWeight: 900, cursor: reminderDraft.title.trim() && reminderDraft.date ? 'pointer' : 'not-allowed' }}>Create</button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {workflowSettingsOpen && (
            <div style={{ position: 'fixed', inset: 0, zIndex: 140, background: 'rgba(0,0,0,.52)', display: 'grid', placeItems: 'center', color: '#111' }}>
              <div style={{ width: 'min(1160px, calc(100vw - 60px))', height: 'min(800px, calc(100vh - 70px))', background: '#fff', borderRadius: 4, boxShadow: '0 24px 80px rgba(0,0,0,.35)', display: 'grid', gridTemplateRows: '50px minmax(0, 1fr)', overflow: 'hidden' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '0 18px', borderBottom: '1px solid #e0e0e0' }}>
                  <Settings size={18} color="#111" />
                  <strong style={{ fontSize: 19, color: '#111' }}>Settings</strong>
                  <button onClick={() => setWorkflowSettingsOpen(false)} style={{ marginLeft: 'auto', border: 'none', background: 'transparent', color: '#111', cursor: 'pointer', display: 'grid', placeItems: 'center' }}>
                    <X size={18} />
                  </button>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '250px minmax(0, 1fr)', minHeight: 0 }}>
                  <aside style={{ background: '#f7f7f7', borderRight: '1px solid #ddd', padding: '18px 10px' }}>
                    {[
                      ['System configuration', null],
                      ['Services', CircleGauge],
                      ['General settings', Settings],
                      ['Service groups', FolderKanban],
                      ['Quick create', null],
                      ['Create service', Plus],
                      ['Create group', ClipboardList],
                      ['Operations', null],
                      ['Operation roles', CheckCircle2],
                      ['System webhook', null],
                      ['Webhook traces', Bot],
                    ].map(([label, Icon]) => Icon ? (
                      <button key={String(label)} style={{ width: '100%', border: 'none', borderRadius: 3, background: label === 'Operation roles' ? '#e8e8e8' : 'transparent', color: label === 'Operation roles' ? '#111' : '#666', display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', fontSize: 14, fontWeight: label === 'Operation roles' ? 800 : 500, cursor: 'pointer', textAlign: 'left' }}>
                        {(() => { const LocalIcon = Icon as typeof Settings; return <LocalIcon size={15} /> })()}
                        {String(label)}
                      </button>
                    ) : (
                      <div key={String(label)} style={{ color: '#111', fontSize: 15, fontWeight: 900, margin: '14px 10px 8px' }}>{String(label)}</div>
                    ))}
                  </aside>
                  <section style={{ minWidth: 0, background: '#fff', display: 'flex', flexDirection: 'column' }}>
                    <div style={{ height: 56, borderBottom: '1px solid #eee', display: 'flex', alignItems: 'center', gap: 12, padding: '0 20px' }}>
                      <CheckCircle2 size={25} color="#999" />
                      <strong style={{ color: '#111', fontSize: 20 }}>Operation roles</strong>
                      <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 12 }}>
                        <label style={{ height: 33, width: 150, border: '1px solid #d8d8d8', borderRadius: 3, display: 'flex', alignItems: 'center', gap: 8, padding: '0 10px' }}>
                          <input value={roleSearch} onChange={event => setRoleSearch(event.target.value)} placeholder="Quick filter roles" style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', color: '#333', fontSize: 13 }} />
                          <Search size={14} color="#888" />
                        </label>
                        <button onClick={() => { const name = window.prompt('Role name'); if (name?.trim()) setOperationRoles(prev => [...prev, name.trim()]) }} style={{ height: 33, border: 'none', borderRadius: 3, background: '#168c96', color: '#fff', padding: '0 13px', fontWeight: 800, cursor: 'pointer' }}>Add role</button>
                      </div>
                    </div>
                    <div style={{ flex: 1, display: 'grid', placeItems: 'center', color: '#999' }}>
                      {operationRoles.filter(role => role.toLowerCase().includes(roleSearch.toLowerCase())).length === 0 ? (
                        <div style={{ textAlign: 'center' }}>
                          <ClipboardList size={42} color="#999" />
                          <div style={{ color: '#111', fontSize: 20, fontWeight: 900, marginTop: 20 }}>No roles available</div>
                          <div style={{ color: '#aaa', fontSize: 12, marginTop: 10 }}>No roles found. Click on <strong>Add role</strong> to add a new role</div>
                        </div>
                      ) : (
                        <div style={{ width: 'min(520px, 80%)', display: 'grid', gap: 8 }}>
                          {operationRoles.filter(role => role.toLowerCase().includes(roleSearch.toLowerCase())).map(role => (
                            <div key={role} style={{ border: '1px solid #eee', borderRadius: 4, padding: '12px 14px', color: '#111', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                              <span>{role}</span>
                              <button onClick={() => setOperationRoles(prev => prev.filter(item => item !== role))} style={{ border: 'none', background: 'transparent', color: '#999', cursor: 'pointer' }}><X size={14} /></button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </section>
                </div>
              </div>
            </div>
          )}
        </div>

        {panel && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.38)', zIndex: 110, display: 'grid', placeItems: 'center', padding: 20 }}>
            <div style={{ width: 'min(520px, 100%)', background: '#fff', borderRadius: 16, boxShadow: '0 24px 70px rgba(15,23,42,0.24)', overflow: 'hidden', color: '#111827' }}>
              <div style={{ padding: '18px 20px', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
                <div>
                  <div style={{ fontSize: 18, fontWeight: 600, color: '#111827' }}>
                    {panel === 'company' && 'Create Company'}
                    {panel === 'invitations' && 'Invitations'}
                    {panel === 'settings' && 'Account settings'}
                    {panel === 'preferences' && 'Preferences'}
                    {panel === 'logout' && 'Logout'}
                  </div>
                  <div style={{ fontSize: 12, color: '#6b7280', marginTop: 3 }}>{account.email}</div>
                </div>
                <button onClick={() => setPanel(null)} style={modalIconButtonStyle}><X size={18} /></button>
              </div>
              <div style={{ padding: 20 }}>
                {notice && <div style={noticeStyle}><Check size={16} /> {notice}</div>}
                {panel === 'company' && (
                  <div style={{ display: 'grid', gap: 14 }}>
                    <label style={fieldGroupStyle}><span style={labelStyle}>New company name</span><input value={companyName} onChange={event => setCompanyName(event.target.value)} placeholder="Example: New Construction Company" style={fieldStyle} /></label>
                    <div style={infoCardStyle}><div style={tinyLabelStyle}>Current company</div><div style={{ fontSize: 15, color: '#111827', fontWeight: 600 }}>{account.company}</div></div>
                    <button onClick={createCompany} disabled={!companyName.trim()} style={{ ...primaryButtonStyle, opacity: companyName.trim() ? 1 : 0.45 }}>Create and switch</button>
                  </div>
                )}
                {panel === 'invitations' && (
                  <div style={{ display: 'grid', gap: 14 }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 150px auto', gap: 10, alignItems: 'end' }}>
                      <label style={fieldGroupStyle}><span style={labelStyle}>Email</span><input value={inviteEmail} onChange={event => setInviteEmail(event.target.value)} placeholder="teammate@example.com" style={fieldStyle} /></label>
                      <label style={fieldGroupStyle}><span style={labelStyle}>Role</span><select value={inviteRole} onChange={event => setInviteRole(event.target.value)} style={fieldStyle}><option>Member</option><option>Project Manager</option><option>Finance</option><option>Admin</option></select></label>
                      <button onClick={sendInvite} disabled={!inviteEmail.trim()} style={{ ...primaryButtonStyle, height: 40, opacity: inviteEmail.trim() ? 1 : 0.45 }}>Invite</button>
                    </div>
                  </div>
                )}
                {panel === 'settings' && (
                  <div style={{ display: 'grid', gap: 14 }}>
                    <label style={fieldGroupStyle}><span style={labelStyle}>Company / display name</span><input value={account.company} onChange={event => setAccount(previous => ({ ...previous, company: event.target.value }))} style={fieldStyle} /></label>
                    <label style={fieldGroupStyle}><span style={labelStyle}>Account email</span><input value={account.email} onChange={event => setAccount(previous => ({ ...previous, email: event.target.value }))} style={fieldStyle} /></label>
                    <button onClick={() => setNotice('Account settings saved.')} style={primaryButtonStyle}>Save settings</button>
                  </div>
                )}
                {panel === 'preferences' && (
                  <div style={{ display: 'grid', gap: 14 }}>
                    <label style={fieldGroupStyle}><span style={labelStyle}>Layout density</span><select value={account.density} onChange={event => setAccount(previous => ({ ...previous, density: event.target.value as AccountState['density'] }))} style={fieldStyle}><option>Comfortable</option><option>Compact</option></select></label>
                    <label style={checkRowStyle}><input type="checkbox" checked={account.emailNotifications} onChange={event => setAccount(previous => ({ ...previous, emailNotifications: event.target.checked }))} /> Email notifications</label>
                    <label style={checkRowStyle}><input type="checkbox" checked={account.desktopNotifications} onChange={event => setAccount(previous => ({ ...previous, desktopNotifications: event.target.checked }))} /> Desktop notifications</label>
                  </div>
                )}
                {panel === 'logout' && (
                  <div>
                    <div style={{ fontSize: 14, color: '#374151', lineHeight: 1.6, marginBottom: 18 }}>Are you sure you want to logout of {account.company}?</div>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}><button onClick={() => setPanel(null)} style={secondaryButtonStyle}>Cancel</button><button onClick={() => { window.localStorage.removeItem(sessionKey); setPanel(null); router.push('/login') }} style={{ ...primaryButtonStyle, background: '#dc2626' }}>Logout</button></div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className={compactWorkspace ? 'app-header workspace-floating-header' : 'app-header'} style={{ height: compactWorkspace ? 0 : '66px', borderBottom: compactWorkspace ? 'none' : '1px solid rgba(226,232,240,0.92)', background: compactWorkspace ? 'transparent' : 'rgba(255,255,255,0.9)', display: 'flex', justifyContent: compactWorkspace ? 'flex-end' : 'space-between', alignItems: 'center', padding: compactWorkspace ? '0 22px 0 0' : '0 22px', position: compactWorkspace ? 'absolute' : 'sticky', top: compactWorkspace ? 12 : 0, right: 0, left: compactWorkspace ? 'auto' : 0, zIndex: 80, pointerEvents: compactWorkspace ? 'none' : 'auto' }}>
      {!compactWorkspace && <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <button className="mobile-menu-button" onClick={onMenuClick} aria-label="Open navigation" style={{ width: 38, height: 38, borderRadius: 10, border: '1px solid #e5e7eb', background: '#fff', color: '#111827', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 8px 18px rgba(15,23,42,0.06)' }}>
          <Menu size={19} />
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontWeight: 700, color: '#111827', letterSpacing: '-0.2px', fontSize: 15 }}>
          <PageIcon size={17} />
          {pageMeta.label}
        </div>
      </div>}

      {/* ── Centred search bar ── */}
      {!compactWorkspace && (
        <label style={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)', display: 'flex', alignItems: 'center', gap: 8, background: '#f3f4f6', border: '1px solid #e5e7eb', borderRadius: 999, padding: '7px 16px', width: 320, cursor: 'text', transition: 'border-color 0.15s, box-shadow 0.15s' }}
          onFocus={e => { (e.currentTarget as HTMLLabelElement).style.borderColor = '#1db954'; (e.currentTarget as HTMLLabelElement).style.boxShadow = '0 0 0 3px rgba(29,185,84,0.12)' }}
          onBlur={e => { (e.currentTarget as HTMLLabelElement).style.borderColor = '#e5e7eb'; (e.currentTarget as HTMLLabelElement).style.boxShadow = 'none' }}
        >
          <Search size={14} color="#9ca3af" style={{ flexShrink: 0 }} />
          <input
            value={globalSearch}
            onChange={e => setGlobalSearch(e.target.value)}
            placeholder="Search"
            style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', color: '#111827', fontSize: 13, fontFamily: 'inherit' }}
          />
          {globalSearch && (
            <button onClick={() => setGlobalSearch('')} style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#9ca3af', display: 'grid', placeItems: 'center', padding: 0 }}>
              <X size={13} />
            </button>
          )}
        </label>
      )}

      <div ref={ref} style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 12, pointerEvents: 'auto' }}>
        <button
          onClick={() => { setNotificationsOpen(!notificationsOpen); setOpen(false) }}
          aria-label="Open notifications"
          style={notificationButtonStyle}
        >
          <Bell size={18} />
          {actionableRequests.length > 0 && <span style={notificationBadgeStyle}>{actionableRequests.length}</span>}
        </button>

        <button
          onClick={toggleTheme}
          aria-label={isDarkTheme ? 'Switch to light theme' : 'Switch to dark theme'}
          title={isDarkTheme ? 'Switch to light theme' : 'Switch to dark theme'}
          style={themeToggleStyle(isDarkTheme)}
        >
          <span style={themeKnobStyle(isDarkTheme)}>
            {isDarkTheme ? <Moon size={14} /> : <Sun size={14} />}
          </span>
        </button>

        {notificationsOpen && (
          <NotificationPanel
            items={filteredNotifications}
            allCount={notificationItems.length}
            mentionedCount={notificationItems.filter(item => item.mentioned).length}
            priorityCount={notificationItems.filter(item => item.priority).length}
            filter={notificationFilter}
            onFilter={setNotificationFilter}
            onClose={() => setNotificationsOpen(false)}
            onOpen={target => { setNotificationsOpen(false); router.push(target) }}
          />
        )}

        <button onClick={() => setOpen(!open)} style={{ width: 38, height: 38, borderRadius: '50%', border: '1px solid #e5e7eb', background: 'linear-gradient(135deg,#f8fafc,#e2e8f0)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: 13, fontWeight: 600, color: '#111827', boxShadow: '0 10px 24px rgba(15,23,42,0.08)' }}>
          LW
        </button>

        {open && (
          <div className="profile-menu" style={{ position: 'absolute', top: 50, right: 0, width: 280, background: '#fff', border: '1px solid #eef2f7', borderRadius: 16, boxShadow: '0 24px 70px rgba(15,23,42,0.16)', overflow: 'hidden', zIndex: 80 }}>
            <div style={{ padding: 20, textAlign: 'center' }}>
              <div style={{ fontWeight: 600 }}>{account.company}</div>
              <div style={{ fontSize: 12, color: '#6b7280' }}>{account.email}</div>
            </div>

            {[
              { label: 'Create Company', icon: Plus, panel: 'company' as Panel },
              { label: 'Invitations', icon: Mail, panel: 'invitations' as Panel },
              { label: 'Account settings', icon: Settings, panel: 'settings' as Panel },
              { label: 'Preferences', icon: SlidersHorizontal, panel: 'preferences' as Panel },
            ].map(item => {
              const Icon = item.icon
              return (
                <button key={item.label} onClick={() => openPanel(item.panel)} style={menuButtonStyle}>
                  <Icon size={16} />
                  {item.label}
                </button>
              )
            })}

            <button onClick={() => openPanel('logout')} style={{ ...menuButtonStyle, color: 'red', borderTop: '1px solid #eee' }}>
              <LogOut size={16} />
              Logout
            </button>
          </div>
        )}
      </div>

      {panel && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.38)', zIndex: 100, display: 'grid', placeItems: 'center', padding: 20 }}>
          <div style={{ width: 'min(520px, 100%)', background: '#fff', borderRadius: 16, boxShadow: '0 24px 70px rgba(15,23,42,0.24)', overflow: 'hidden' }}>
            <div style={{ padding: '18px 20px', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
              <div>
                <div style={{ fontSize: 18, fontWeight: 600, color: '#111827' }}>
                  {panel === 'company' && 'Create Company'}
                  {panel === 'invitations' && 'Invitations'}
                  {panel === 'settings' && 'Account settings'}
                  {panel === 'preferences' && 'Preferences'}
                  {panel === 'logout' && 'Logout'}
                </div>
                <div style={{ fontSize: 12, color: '#6b7280', marginTop: 3 }}>{account.email}</div>
              </div>
              <button onClick={() => setPanel(null)} style={modalIconButtonStyle}><X size={18} /></button>
            </div>

            <div style={{ padding: 20 }}>
              {notice && <div style={noticeStyle}><Check size={16} /> {notice}</div>}

              {panel === 'company' && (
                <div style={{ display: 'grid', gap: 14 }}>
                  <label style={fieldGroupStyle}>
                    <span style={labelStyle}>New company name</span>
                    <input value={companyName} onChange={event => setCompanyName(event.target.value)} placeholder="Example: New Construction Company" style={fieldStyle} />
                  </label>
                  <div style={infoCardStyle}>
                    <div style={tinyLabelStyle}>Current company</div>
                    <div style={{ fontSize: 15, color: '#111827', fontWeight: 600 }}>{account.company}</div>
                  </div>
                  <button onClick={createCompany} disabled={!companyName.trim()} style={{ ...primaryButtonStyle, opacity: companyName.trim() ? 1 : 0.45 }}>Create and switch</button>
                </div>
              )}

              {panel === 'invitations' && (
                <div style={{ display: 'grid', gap: 14 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 150px auto', gap: 10, alignItems: 'end' }}>
                    <label style={fieldGroupStyle}>
                      <span style={labelStyle}>Email</span>
                      <input value={inviteEmail} onChange={event => setInviteEmail(event.target.value)} placeholder="teammate@example.com" style={fieldStyle} />
                    </label>
                    <label style={fieldGroupStyle}>
                      <span style={labelStyle}>Role</span>
                      <select value={inviteRole} onChange={event => setInviteRole(event.target.value)} style={fieldStyle}>
                        <option>Member</option>
                        <option>Project Manager</option>
                        <option>Finance</option>
                        <option>Admin</option>
                      </select>
                    </label>
                    <button onClick={sendInvite} disabled={!inviteEmail.trim()} style={{ ...primaryButtonStyle, height: 40, opacity: inviteEmail.trim() ? 1 : 0.45 }}>Invite</button>
                  </div>
                  {account.invitations.length === 0 ? (
                    <div style={{ padding: 24, textAlign: 'center', color: '#9ca3af', border: '1px dashed #e5e7eb', borderRadius: 12 }}>No invitations yet.</div>
                  ) : account.invitations.map(invitation => (
                    <div key={invitation.id} style={inviteRowStyle}>
                      <div>
                        <div style={{ fontSize: 13, color: '#111827', fontWeight: 600 }}>{invitation.email}</div>
                        <div style={{ fontSize: 12, color: '#6b7280', marginTop: 3 }}>{invitation.role}</div>
                      </div>
                      <span style={{ fontSize: 11, color: '#d97706', background: '#fef3c7', borderRadius: 20, padding: '4px 9px', fontWeight: 600 }}>{invitation.status}</span>
                      <button onClick={() => removeInvite(invitation.id)} style={dangerIconButtonStyle}><Trash2 size={15} /></button>
                    </div>
                  ))}
                </div>
              )}

              {panel === 'settings' && (
                <div style={{ display: 'grid', gap: 14 }}>
                  <label style={fieldGroupStyle}>
                    <span style={labelStyle}>Company / display name</span>
                    <input value={account.company} onChange={event => setAccount(previous => ({ ...previous, company: event.target.value }))} style={fieldStyle} />
                  </label>
                  <label style={fieldGroupStyle}>
                    <span style={labelStyle}>Account email</span>
                    <input value={account.email} onChange={event => setAccount(previous => ({ ...previous, email: event.target.value }))} style={fieldStyle} />
                  </label>
                  <button onClick={() => setNotice('Account settings saved.')} style={primaryButtonStyle}>Save settings</button>
                </div>
              )}

              {panel === 'preferences' && (
                <div style={{ display: 'grid', gap: 14 }}>
                  <label style={fieldGroupStyle}>
                    <span style={labelStyle}>Layout density</span>
                    <select value={account.density} onChange={event => setAccount(previous => ({ ...previous, density: event.target.value as AccountState['density'] }))} style={fieldStyle}>
                      <option>Comfortable</option>
                      <option>Compact</option>
                    </select>
                  </label>
                  <label style={checkRowStyle}><input type="checkbox" checked={account.emailNotifications} onChange={event => setAccount(previous => ({ ...previous, emailNotifications: event.target.checked }))} /> Email notifications</label>
                  <label style={checkRowStyle}><input type="checkbox" checked={account.desktopNotifications} onChange={event => setAccount(previous => ({ ...previous, desktopNotifications: event.target.checked }))} /> Desktop notifications</label>
                </div>
              )}

              {panel === 'logout' && (
                <div>
                  <div style={{ fontSize: 14, color: '#374151', lineHeight: 1.6, marginBottom: 18 }}>Are you sure you want to logout of {account.company}?</div>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                    <button onClick={() => setPanel(null)} style={secondaryButtonStyle}>Cancel</button>
                    <button onClick={() => { window.localStorage.removeItem(sessionKey); setPanel(null); router.push('/login') }} style={{ ...primaryButtonStyle, background: '#dc2626' }}>Logout</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function NotificationPanel({
  items,
  allCount,
  mentionedCount,
  priorityCount,
  filter,
  onFilter,
  onClose,
  onOpen,
}: {
  items: Array<{ id: number; title: string; lines: string[]; time: string; date: string; age: string; target: string }>
  allCount: number
  mentionedCount: number
  priorityCount: number
  filter: 'all' | 'mentioned' | 'priority'
  onFilter: (filter: 'all' | 'mentioned' | 'priority') => void
  onClose: () => void
  onOpen: (target: string) => void
}) {
  return (
    <div style={{ position: 'absolute', top: 36, right: 32, width: 630, maxWidth: 'calc(100vw - 24px)', height: 'min(835px, calc(100vh - 54px))', background: '#fff', color: '#111', border: '1px solid #e1e1e1', boxShadow: '0 22px 70px rgba(0,0,0,.28)', zIndex: 145, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{ padding: '14px 18px 0', background: '#fff' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <h2 style={{ margin: 0, color: '#111', fontSize: 22, fontWeight: 900, letterSpacing: 0 }}>Notifications</h2>
          <button onClick={onClose} style={{ border: 'none', background: 'transparent', color: '#666', fontSize: 13, cursor: 'pointer' }}>Mark all as read</button>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 22, borderBottom: '1px solid #ddd' }}>
          {[
            ['all', 'All', allCount],
            ['mentioned', 'Mentioned', mentionedCount],
            ['priority', 'Priority', priorityCount],
          ].map(([key, label, count]) => {
            const active = filter === key
            return (
              <button key={String(key)} onClick={() => onFilter(key as 'all' | 'mentioned' | 'priority')} style={{ height: 39, border: 'none', borderBottom: active ? '2px solid #159aa6' : '2px solid transparent', background: 'transparent', color: active ? '#159aa6' : '#888', fontSize: 14, fontWeight: active ? 800 : 600, display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                {label}
                <span style={{ minWidth: 18, height: 18, borderRadius: 4, background: active ? '#159aa6' : '#e5e5e5', color: active ? '#fff' : '#777', display: 'grid', placeItems: 'center', fontSize: 11, fontWeight: 800 }}>{count as number}</span>
              </button>
            )
          })}
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 18, color: '#888', fontSize: 13 }}>
            <button style={notificationFilterButtonStyle}><SlidersHorizontal size={13} /> Filter apps</button>
            <button style={notificationFilterButtonStyle}><SlidersHorizontal size={13} /> All</button>
          </div>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', background: '#fff' }}>
        {items.length > 0 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '13px 14px 8px', color: '#111', fontSize: 14, fontWeight: 800 }}>
            <span>{items[0].date}</span>
            <span style={{ color: '#999', fontSize: 13, fontWeight: 500 }}>{items[0].age}</span>
          </div>
        )}
        {items.map(item => (
          <button key={item.id} onClick={() => onOpen(item.target)} style={{ width: '100%', border: 'none', borderTop: '1px solid #ffffff', borderBottom: '1px solid #e8f4e8', background: '#f2fff0', color: '#111', display: 'grid', gridTemplateColumns: '44px minmax(0, 1fr) 14px', gap: 12, padding: '14px 14px 12px', textAlign: 'left', cursor: 'pointer' }}>
            <span style={{ width: 38, height: 38, borderRadius: '50%', background: '#d9eadc', color: '#0f3d2a', display: 'grid', placeItems: 'center', fontSize: 13, fontWeight: 900, overflow: 'hidden' }}>
              {item.title.charAt(1)?.toUpperCase() || 'N'}
            </span>
            <span style={{ minWidth: 0 }}>
              <span style={{ display: 'block', fontSize: 16, fontWeight: 600, color: '#111', lineHeight: 1.25, marginBottom: 6 }}>{item.title}</span>
              {item.lines.map((line, index) => (
                <span key={index} style={{ display: 'grid', gridTemplateColumns: '12px minmax(0, 1fr) 42px', gap: 6, color: '#4c4c4c', fontSize: 12, lineHeight: 1.45 }}>
                  <span style={{ color: '#aaa' }}>=</span>
                  <span style={{ overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{line}</span>
                  <span style={{ color: '#444', textAlign: 'right' }}>{item.time}</span>
                </span>
              ))}
              <span style={{ display: 'block', color: '#888', fontSize: 12, marginTop: 5 }}>{item.time} {item.date.replace(/^[^,]+,\s*/, '')}</span>
            </span>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#159aa6', marginTop: 4 }} />
          </button>
        ))}
      </div>

      <button onClick={onClose} style={{ height: 46, border: 'none', borderTop: '1px solid #e5e5e5', background: '#f6f6f6', color: '#555', fontSize: 14, cursor: 'pointer' }}>
        View more notifications
      </button>
    </div>
  )
}

const menuButtonStyle = {
  width: '100%',
  border: 'none',
  background: '#fff',
  padding: '12px 16px',
  display: 'flex',
  gap: 10,
  alignItems: 'center',
  cursor: 'pointer',
  fontSize: 15,
  color: '#111827',
  textAlign: 'left' as const,
}

const fieldGroupStyle = { display: 'grid', gap: 7 }
const labelStyle = { fontSize: 12, color: '#374151', fontWeight: 600 }
const tinyLabelStyle = { fontSize: 12, color: '#6b7280', fontWeight: 600, marginBottom: 6 }
const fieldStyle = { width: '100%', border: '1px solid #e5e7eb', borderRadius: 9, padding: '10px 12px', fontSize: 13, color: '#111827', outline: 'none', background: '#fff' }
const primaryButtonStyle = { border: 'none', borderRadius: 9, background: '#111827', color: '#fff', padding: '10px 14px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }
const secondaryButtonStyle = { border: '1px solid #e5e7eb', borderRadius: 9, background: '#fff', color: '#374151', padding: '10px 14px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }
const modalIconButtonStyle = { width: 34, height: 34, border: '1px solid #e5e7eb', borderRadius: 9, background: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }
const dangerIconButtonStyle = { width: 32, height: 32, border: 'none', borderRadius: 8, background: '#fff1f2', color: '#e11d48', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }
const checkRowStyle = { display: 'flex', alignItems: 'center', gap: 10, fontSize: 14, color: '#374151', fontWeight: 600 }
const noticeStyle = { marginBottom: 14, padding: '10px 12px', borderRadius: 10, background: '#ecfdf5', color: '#047857', fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }
const infoCardStyle = { border: '1px solid #e5e7eb', borderRadius: 12, padding: 14 }
const inviteRowStyle = { display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto auto', gap: 10, alignItems: 'center', border: '1px solid #f3f4f6', borderRadius: 12, padding: 12 }
const notificationButtonStyle = {
  width: 38,
  height: 38,
  borderRadius: 11,
  border: '1px solid #e5e7eb',
  background: '#fff',
  color: '#111827',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer',
  position: 'relative' as const,
  boxShadow: '0 8px 18px rgba(15,23,42,0.06)',
}
const notificationBadgeStyle = {
  position: 'absolute' as const,
  top: -6,
  right: -6,
  minWidth: 19,
  height: 19,
  borderRadius: 999,
  background: '#ef4444',
  color: '#fff',
  border: '2px solid #fff',
  display: 'grid',
  placeItems: 'center',
  fontSize: 10,
  fontWeight: 600,
  padding: '0 4px',
}
const notificationMenuStyle = {
  position: 'absolute' as const,
  top: 50,
  right: 88,
  width: 380,
  background: '#fff',
  border: '1px solid #e5e7eb',
  borderRadius: 16,
  boxShadow: '0 24px 70px rgba(15,23,42,0.16)',
  overflow: 'hidden',
  zIndex: 85,
}
const notificationItemStyle = {
  padding: '14px 16px',
  borderBottom: '1px solid #f1f5f9',
  background: '#fff',
}
const notificationFooterStyle = {
  width: '100%',
  border: 'none',
  background: '#f8fafc',
  color: '#111827',
  padding: '13px 16px',
  fontSize: 13,
  fontWeight: 600,
  cursor: 'pointer',
}
const notificationFilterButtonStyle = {
  border: 'none',
  background: 'transparent',
  color: '#777',
  display: 'inline-flex',
  alignItems: 'center',
  gap: 7,
  fontSize: 13,
  cursor: 'pointer',
}
const requestStatusStyle = (status: ChangeOrderStatus) => ({
  borderRadius: 999,
  padding: '4px 8px',
  fontSize: 10,
  fontWeight: 600,
  color: status === 'Approved' ? '#047857' : status === 'Rejected' ? '#b91c1c' : status === 'Priced' ? '#6d28d9' : '#c2410c',
  background: status === 'Approved' ? '#d1fae5' : status === 'Rejected' ? '#fee2e2' : status === 'Priced' ? '#ede9fe' : '#ffedd5',
  whiteSpace: 'nowrap' as const,
})

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

function startOfWeek(date: Date) {
  const day = date.getDay()
  const mondayOffset = day === 0 ? -6 : 1 - day
  return startOfDay(addDays(date, mondayOffset))
}

function addDays(date: Date, days: number) {
  const next = new Date(date)
  next.setDate(next.getDate() + days)
  return next
}

function isSameDate(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

function formatCompactDate(date: Date) {
  return `${String(date.getDate()).padStart(2, '0')}-${String(date.getMonth() + 1).padStart(2, '0')}-${date.getFullYear()}`
}

function formatReminderTime(task: ReminderTask) {
  const parsed = new Date(`${task.dueDate}T${task.reminderTime || '19:28'}:00`)
  return `${task.reminderTime || '19:28'} ${String(parsed.getDate()).padStart(2, '0')}-${String(parsed.getMonth() + 1).padStart(2, '0')}-${parsed.getFullYear()}`
}

function findLinkedReminderTask(tasks: ReminderTask[], value: string) {
  const trimmed = value.trim()
  if (!trimmed) return undefined
  const idMatch = trimmed.match(/(?:task=|tasks\/|#)(\d+)/i) || trimmed.match(/^(\d+)$/)
  const linkedId = idMatch ? Number(idMatch[1]) : NaN
  if (Number.isFinite(linkedId)) return tasks.find(task => task.id === linkedId)
  const lowered = trimmed.toLowerCase()
  return tasks.find(task => task.title.toLowerCase() === lowered)
}

const reminderHeaderButtonStyle = {
  height: 30,
  width: 34,
  border: '1px solid #d6d6d6',
  borderRadius: 2,
  background: '#fff',
  color: '#333',
  display: 'inline-grid',
  placeItems: 'center',
  cursor: 'pointer',
  fontSize: 12,
}
const reminderFieldGroupStyle = { display: 'grid', gap: 8 }
const reminderFieldLabelStyle = { color: '#111', fontSize: 13, fontWeight: 500 }
const reminderTextInputStyle = { width: '100%', height: 33, border: '1px solid #cfcfcf', borderRadius: 0, background: '#fff', color: '#333', outline: 'none', padding: '0 8px', fontSize: 14 }
const reminderSwitchRowStyle = { display: 'flex', alignItems: 'center', gap: 10, color: '#111', fontSize: 13 }
const reminderSwitchStyle = (active: boolean) => ({
  width: 32,
  height: 16,
  border: 'none',
  borderRadius: 999,
  background: active ? '#18b400' : '#cfcfcf',
  padding: 2,
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: active ? 'flex-end' : 'flex-start',
})
const reminderSwitchKnobStyle = (_active: boolean) => ({
  width: 12,
  height: 12,
  borderRadius: '50%',
  background: '#fff',
  display: 'block',
})
const workspaceIconButtonStyle = {
  width: 26,
  height: 26,
  border: 'none',
  borderRadius: 3,
  background: 'transparent',
  color: '#d8f6f8',
  display: 'inline-grid',
  placeItems: 'center',
  cursor: 'pointer',
  padding: 0,
}
const workspacePillButtonStyle = {
  height: 28,
  border: 'none',
  borderRadius: 3,
  background: 'rgba(255,255,255,.12)',
  color: '#f7ffff',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '0 10px',
  cursor: 'pointer',
  fontSize: 13,
}
const workspaceCountButtonStyle = {
  ...workspacePillButtonStyle,
  width: 34,
  padding: 0,
  fontWeight: 800,
  fontVariantNumeric: 'tabular-nums' as const,
}
const workspaceNotificationBadgeStyle = {
  position: 'absolute' as const,
  top: -5,
  right: -4,
  minWidth: 18,
  height: 18,
  borderRadius: 3,
  background: '#d73535',
  color: '#fff',
  display: 'grid',
  placeItems: 'center',
  fontSize: 10,
  fontWeight: 800,
  padding: '0 4px',
}
const launcherRailButtonStyle = {
  width: 34,
  height: 34,
  border: 'none',
  borderRadius: '50%',
  background: '#f0f0f0',
  color: '#555',
  display: 'grid',
  placeItems: 'center',
  cursor: 'pointer',
}
const launcherToolButtonStyle = {
  width: '100%',
  minHeight: 42,
  border: 'none',
  borderRadius: 5,
  background: 'transparent',
  color: '#444',
  display: 'flex',
  alignItems: 'center',
  gap: 12,
  padding: '7px 8px',
  textAlign: 'left' as const,
  cursor: 'pointer',
}
const launcherToolTitleStyle = {
  display: 'block',
  color: '#4c4c4c',
  fontSize: 14,
  fontWeight: 600,
  whiteSpace: 'nowrap' as const,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
}
const launcherToolDetailStyle = {
  display: 'block',
  color: '#9a9a9a',
  fontSize: 12,
  marginTop: 2,
  whiteSpace: 'nowrap' as const,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
}
const createMenuItemStyle = {
  width: '100%',
  border: 'none',
  background: 'transparent',
  color: '#333',
  display: 'block',
  padding: '10px 20px',
  textAlign: 'left' as const,
  cursor: 'pointer',
  fontSize: 13,
  fontWeight: 500,
}
const themeToggleStyle = (isDark: boolean) => ({
  width: 58,
  height: 32,
  borderRadius: 999,
  border: `2px solid ${isDark ? '#e5e7eb' : '#111827'}`,
  background: isDark ? '#2b2f36' : '#fff',
  padding: 3,
  display: 'flex',
  alignItems: 'center',
  justifyContent: isDark ? 'flex-end' : 'flex-start',
  cursor: 'pointer',
  boxShadow: isDark ? 'inset 0 0 0 1px rgba(255,255,255,.08), 0 8px 18px rgba(0,0,0,.18)' : '0 8px 18px rgba(15,23,42,0.08)',
})
const themeKnobStyle = (isDark: boolean) => ({
  width: 22,
  height: 22,
  borderRadius: '50%',
  background: isDark ? '#fff' : '#020617',
  color: isDark ? '#111827' : '#fff',
  display: 'grid',
  placeItems: 'center',
  transition: 'transform .18s ease, background-color .18s ease, color .18s ease',
})
