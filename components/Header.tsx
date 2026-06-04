'use client'

import { type KeyboardEvent, useEffect, useMemo, useRef, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { logoutUser } from '@/lib/auth/logout'
import { withCsrfHeaders } from '@/lib/security/csrfClient'
import { type GlobalSearchResult, searchGlobalRecords } from '@/lib/search/globalSearch'
import {
  type CompanyRecord,
  type CompanyRole,
  companyChangeEvent,
  createCompany as createTenantCompany,
  ensureDefaultCompany,
  getActiveCompany,
  inviteCompanyMember,
  loadAccessibleCompanies,
  removeCompanyMember,
  rolePermissions,
  setActiveCompanyId,
  updateCompanySettings,
} from '@/lib/tenant/company'
import {
  BadgeDollarSign,
  Bell,
  Bot,
  Boxes,
  Building2,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  HelpCircle,
  Home,
  CircleGauge,
  ClipboardCheck,
  ClipboardList,
  FileText,
  FolderKanban,
  HandCoins,
  LayoutDashboard,
  LogOut,
  Mail,
  Menu,
  MessageCircle,
  PackageSearch,
  Plus,
  Search,
  Settings,
  ShoppingCart,
  SlidersHorizontal,
  Trash2,
  UsersRound,
  X,
} from 'lucide-react'

type HeaderProps = {
  onMenuClick?: () => void
  compactWorkspace?: boolean
}

type Panel = 'company' | 'invitations' | 'settings' | 'companySettings' | 'preferences' | 'logout' | null
type ReminderFilter = 'all' | 'important' | 'today' | 'late'

const inviteRoleOptions: CompanyRole[] = [
  'Member',
  'Employee',
  'Team Manager',
  'Project Manager',
  'HR',
  'Finance',
  'Sales',
  'Warehouse',
  'Procurement',
  'Support',
  'Client',
  'Admin',
]

interface AccountState {
  company: string
  companyId?: string
  email: string
  fullName?: string
  name?: string
  role?: string
  theme: string
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
  channel: 'Email' | 'SMS' | 'In-App'
  recipientRole: 'Admin' | 'Project Manager' | 'Finance' | 'HR' | 'Employee'
  subject: string
  message: string
  relatedType: string
  relatedId: number | string
  status: 'Queued'
  target?: string
  createdAt: string
}

interface LoanRequestNotification {
  id: string
  employeeName?: string
  employeeCode?: string
  requestType: string
  customLoanType?: string
  amount: number
  status: string
  approvalStep: string
  financeApprovalStatus?: string
  hrApprovalStatus?: string
  createdAt: string
}

interface AllowanceRequestNotification {
  id: string
  employeeName: string
  employeeCode?: string
  type: 'Fuel' | 'Meal'
  amount: number
  status: string
  date: string
  purpose?: string
  reason?: string
  createdAt: string
}

interface LeaveRequestNotification {
  id: string
  employeeId?: string
  employeeName?: string
  leaveType: string
  days: number
  status: string
  approvalStep?: string
  hrApprovalStatus?: string
  createdAt: string
  updatedAt?: string
}

type HeaderNotificationItem = {
  id: number | string
  title: string
  lines: string[]
  time: string
  date: string
  age: string
  target: string
  mentioned?: boolean
  priority?: boolean
  type?: string
  detail?: string
  tone?: string
  sortTime?: string
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
const changeOrdersKey = 'flowsys-change-orders'
const projectsKey = 'flowsys-projects'
const tasksKey = 'flowsys-assigned-tasks'
const outboundNotificationsKey = 'flowsys-outbound-notifications'
const leaveRequestsKey = 'flowsys-hr-leave-requests'
const loanRequestsKey = 'flowsys-hr-loan-requests'
const allowanceRequestsKey = 'flowsys-hr-allowance-requests'
const readNotificationsKey = 'wiseflow-read-notifications'
const initialAccount: AccountState = {
  company: 'WiseFlow Company',
  email: '',
  theme: 'Bright',
  density: 'Comfortable',
  emailNotifications: true,
  desktopNotifications: false,
  invitations: [],
}

function normalizeThemePreference(preference?: string) {
  const normalized = preference?.toLowerCase() ?? ''
  if (normalized === 'system' || normalized.includes('system')) return 'System'
  return normalized === 'dark' || normalized.includes('dark') ? 'Dark' : 'Bright'
}

function normalizeNotificationStatus(value?: string) {
  const clean = String(value || 'Pending').trim()
  return clean ? clean.charAt(0).toUpperCase() + clean.slice(1).toLowerCase() : 'Pending'
}

function notificationTone(status: string) {
  switch (status.toLowerCase()) {
    case 'approved': return '#34a853'
    case 'rejected': return '#ea4335'
    case 'cancelled': return '#64748b'
    case 'canceled': return '#64748b'
    default: return '#1a73e8'
  }
}

const loadAccount = () => {
  if (typeof window === 'undefined') return initialAccount

  try {
    const stored = window.localStorage.getItem(storageKey)
    if (!stored) return initialAccount
    const parsed = JSON.parse(stored) as Partial<AccountState>
    return { ...initialAccount, ...parsed, theme: normalizeThemePreference(parsed.theme) } as AccountState
  } catch {
    return initialAccount
  }
}

// -- Route ? page title + icon ----------------------------------------------
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
  { match: '/hr/overview',         label: 'HR Hub',           icon: Building2       },
  { match: '/hr/employees',        label: 'HR Hub',           icon: Building2       },
  { match: '/hr/teams',            label: 'HR Hub',           icon: Building2       },
  { match: '/hr/attendance',       label: 'HR Hub',           icon: Building2       },
  { match: '/hr/leave-requests',   label: 'HR Hub',           icon: Building2       },
  { match: '/hr/approvals',        label: 'HR Hub',           icon: Building2       },
  { match: '/hr/payroll',          label: 'HR Hub',           icon: Building2       },
  { match: '/hr/documents',        label: 'HR Hub',           icon: Building2       },
  { match: '/hr/performance',      label: 'HR Hub',           icon: Building2       },
  { match: '/hr/reports',          label: 'HR Hub',           icon: Building2       },
  { match: '/hr/settings',         label: 'HR Hub',           icon: Building2       },
  { match: '/hr',                  label: 'HR Hub',           icon: Building2       },
  { match: '/people/teams',        label: 'HR Hub',           icon: Building2       },
  { match: '/procurement',        label: 'Procurement',      icon: ShoppingCart    },
  { match: '/resources/pricebook', label: 'Pricebook',        icon: ShoppingCart    },
  { match: '/supplier-database',  label: 'Supplier Database',icon: PackageSearch   },
  { match: '/resources/suppliers',label: 'Supplier Database',icon: PackageSearch   },
  { match: '/warehouse',          label: 'Warehouse',        icon: Boxes           },
  { match: '/warehouse-inventory',label: 'Warehouse',        icon: Boxes           },
  { match: '/resources/inventory',label: 'Warehouse',        icon: Boxes           },
  { match: '/resources',          label: 'Docs',             icon: FileText        },
  { match: '/chat',               label: 'Messages',         icon: MessageCircle   },
  { match: '/client-portal',      label: 'Webforms',         icon: ClipboardCheck  },
  { match: '/workflows',          label: 'Workflows',        icon: ClipboardList   },
  { match: '/account',            label: 'Account',          icon: Settings        },
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
  const [globalSearchOpen, setGlobalSearchOpen] = useState(false)
  const [searchVersion, setSearchVersion] = useState(0)
  const [open, setOpen] = useState(false)
  const [panel, setPanel] = useState<Panel>(null)
  const [account, setAccount] = useState<AccountState>(initialAccount)
  const [changeOrders, setChangeOrders] = useState<ChangeOrder[]>([])
  const [projects, setProjects] = useState<ProjectRecord[]>([])
  const [tasks, setTasks] = useState<ReminderTask[]>([])
  const [outboundNotifications, setOutboundNotifications] = useState<OutboundNotification[]>([])
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequestNotification[]>([])
  const [loanRequests, setLoanRequests] = useState<LoanRequestNotification[]>([])
  const [allowanceRequests, setAllowanceRequests] = useState<AllowanceRequestNotification[]>([])
  const [readNotificationIds, setReadNotificationIds] = useState<string[]>([])
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const [helpOpen, setHelpOpen] = useState(false)
  const [remindersOpen, setRemindersOpen] = useState(false)
  const [createReminderOpen, setCreateReminderOpen] = useState(false)
  const [workflowSettingsOpen, setWorkflowSettingsOpen] = useState(false)
  const [, setCreateMenuOpen] = useState(false)
  const [roleSearch, setRoleSearch] = useState('')
  const [operationRoles, setOperationRoles] = useState<string[]>([])
  const [reminderWeekStart, setReminderWeekStart] = useState(() => startOfWeek(new Date()))
  const [reminderFilter, setReminderFilter] = useState<ReminderFilter>('all')
  const [reminderDraft, setReminderDraft] = useState<ReminderDraft>(() => ({
    title: '',
    content: '',
    date: new Date().toISOString().slice(0, 10),
    time: '20:00',
    url: '',
    sticky: false,
    markedDone: false,
  }))
  const [, setToolsOpen] = useState(false)
  const [companyName, setCompanyName] = useState('')
  const [companyType, setCompanyType] = useState('Operating Company')
  const [companies, setCompanies] = useState<CompanyRecord[]>([])
  const [activeCompany, setActiveCompany] = useState<CompanyRecord | null>(null)
  const [companySettingsDraft, setCompanySettingsDraft] = useState({
    name: '',
    type: '',
    currency: 'USD',
    timezone: 'UTC',
    fiscalYearStart: 'January',
  })
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<CompanyRole>('Member')
  const [inviteSending, setInviteSending] = useState(false)
  const [notice, setNotice] = useState('')
  const [nowMs] = useState(() => Date.now())
  const ref = useRef<HTMLDivElement>(null)
  const searchRef = useRef<HTMLDivElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)
  // Guards the save-effect from firing on the initial render before localStorage is loaded
  const accountSaveReady = useRef(false)
  const globalSearchIndexToken = `${activeCompany?.id || ''}:${searchVersion}`
  const globalSearchResults = useMemo(
    () => {
      void globalSearchIndexToken
      return searchGlobalRecords(globalSearch, 10)
    },
    [globalSearch, globalSearchIndexToken],
  )

  // Load stored account after mount to avoid SSR/client hydration mismatch
  useEffect(() => {
    const id = window.setTimeout(() => {
      const loadedAccount = loadAccount()
      const selectedCompany = ensureDefaultCompany(loadedAccount)
      const allCompanies = loadAccessibleCompanies(loadedAccount)
      accountSaveReady.current = true
      setAccount({ ...loadedAccount, company: selectedCompany.name, companyId: selectedCompany.id } as AccountState)
      setCompanies(allCompanies)
      setActiveCompany(selectedCompany)
      setCompanySettingsDraft({
        name: selectedCompany.name,
        type: selectedCompany.type,
        currency: selectedCompany.settings.currency,
        timezone: selectedCompany.settings.timezone,
        fiscalYearStart: selectedCompany.settings.fiscalYearStart,
      })
    }, 0)
    return () => window.clearTimeout(id)
  }, [])

  useEffect(() => {
    const refreshCompanies = () => {
      const loadedAccount = loadAccount()
      const selectedCompany = getActiveCompany() || ensureDefaultCompany(loadedAccount)
      const allCompanies = loadAccessibleCompanies(loadedAccount)
      setCompanies(allCompanies)
      setActiveCompany(selectedCompany)
      setAccount({ ...loadedAccount, company: selectedCompany.name, companyId: selectedCompany.id } as AccountState)
      setCompanySettingsDraft({
        name: selectedCompany.name,
        type: selectedCompany.type,
        currency: selectedCompany.settings.currency,
        timezone: selectedCompany.settings.timezone,
        fiscalYearStart: selectedCompany.settings.fiscalYearStart,
      })
    }

    window.addEventListener(companyChangeEvent, refreshCompanies)
    window.addEventListener('storage', refreshCompanies)
    return () => {
      window.removeEventListener(companyChangeEvent, refreshCompanies)
      window.removeEventListener('storage', refreshCompanies)
    }
  }, [])

  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      const target = event.target as Node
      if (ref.current && !ref.current.contains(target) && !searchRef.current?.contains(target)) {
        setOpen(false)
        setNotificationsOpen(false)
        setHelpOpen(false)
        setRemindersOpen(false)
        setToolsOpen(false)
        setCreateMenuOpen(false)
        setGlobalSearchOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  useEffect(() => {
    const bumpSearchIndex = () => setSearchVersion(version => version + 1)
    window.addEventListener(companyChangeEvent, bumpSearchIndex)
    window.addEventListener('storage', bumpSearchIndex)
    window.addEventListener('wiseflow-project-management-refresh', bumpSearchIndex)
    window.addEventListener('wiseflow:warehouse-data-changed', bumpSearchIndex)
    return () => {
      window.removeEventListener(companyChangeEvent, bumpSearchIndex)
      window.removeEventListener('storage', bumpSearchIndex)
      window.removeEventListener('wiseflow-project-management-refresh', bumpSearchIndex)
      window.removeEventListener('wiseflow:warehouse-data-changed', bumpSearchIndex)
    }
  }, [])

  useEffect(() => {
    const focusGlobalSearch = (event: globalThis.KeyboardEvent) => {
      if (!(event.ctrlKey || event.metaKey) || event.key.toLowerCase() !== 'k') return
      event.preventDefault()
      searchInputRef.current?.focus()
      setGlobalSearchOpen(true)
    }

    window.addEventListener('keydown', focusGlobalSearch)
    return () => window.removeEventListener('keydown', focusGlobalSearch)
  }, [])

  useEffect(() => {
    const loadNotifications = () => {
      try {
        setChangeOrders(JSON.parse(window.localStorage.getItem(changeOrdersKey) || '[]') as ChangeOrder[])
        setProjects(JSON.parse(window.localStorage.getItem(projectsKey) || '[]') as ProjectRecord[])
        setTasks(JSON.parse(window.localStorage.getItem(tasksKey) || '[]') as ReminderTask[])
        setOutboundNotifications(JSON.parse(window.localStorage.getItem(outboundNotificationsKey) || '[]') as OutboundNotification[])
        setLeaveRequests(JSON.parse(window.localStorage.getItem(leaveRequestsKey) || '[]') as LeaveRequestNotification[])
        setLoanRequests(JSON.parse(window.localStorage.getItem(loanRequestsKey) || '[]') as LoanRequestNotification[])
        setAllowanceRequests(JSON.parse(window.localStorage.getItem(allowanceRequestsKey) || '[]') as AllowanceRequestNotification[])
        setReadNotificationIds(JSON.parse(window.localStorage.getItem(readNotificationsKey) || '[]') as string[])
      } catch {
        setChangeOrders([])
        setProjects([])
        setTasks([])
        setOutboundNotifications([])
        setLeaveRequests([])
        setLoanRequests([])
        setAllowanceRequests([])
        setReadNotificationIds([])
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
    // Save only after the persisted account has been loaded. React Strict Mode
    // runs effects twice in development, so a single "skip first run" guard can
    // still write the default account over the real session.
    if (!accountSaveReady.current) return
    window.localStorage.setItem(storageKey, JSON.stringify(account))
  }, [account])

  const openPanel = (nextPanel: Panel) => {
    setPanel(nextPanel)
    setOpen(false)
    setToolsOpen(false)
    setNotice('')
    if (nextPanel === 'company') {
      setCompanyName('')
      setCompanyType('Operating Company')
    }
    if (nextPanel === 'companySettings' && activeCompany) {
      setCompanySettingsDraft({
        name: activeCompany.name,
        type: activeCompany.type,
        currency: activeCompany.settings.currency,
        timezone: activeCompany.settings.timezone,
        fiscalYearStart: activeCompany.settings.fiscalYearStart,
      })
    }
  }

  const createCompany = () => {
    const trimmed = companyName.trim()
    if (!trimmed) return
    const company = createTenantCompany(trimmed, { type: companyType.trim() || 'Operating Company' })
    setCompanies(loadAccessibleCompanies())
    setActiveCompany(company)
    setAccount(previous => ({ ...previous, company: company.name, companyId: company.id } as AccountState))
    setCompanyName('')
    setCompanyType('Operating Company')
    setNotice('Company created and selected.')
  }

  const switchCompany = (companyId: string) => {
    const company = setActiveCompanyId(companyId)
    if (!company) {
      setNotice('You do not have access to that company workspace.')
      return
    }
    setActiveCompany(company)
    setCompanies(loadAccessibleCompanies())
    setAccount(previous => ({ ...previous, company: company.name, companyId: company.id } as AccountState))
    setNotice(`Switched to ${company.name}.`)
  }

  const saveCompanySettings = () => {
    if (!activeCompany) return
    const company = updateCompanySettings(activeCompany.id, companySettingsDraft)
    if (!company) return
    setActiveCompany(company)
    setCompanies(loadAccessibleCompanies())
    setAccount(previous => ({ ...previous, company: company.name, companyId: company.id } as AccountState))
    setNotice('Company settings saved.')
  }

  const logout = async () => {
    await logoutUser()
    setPanel(null)
    setOpen(false)
    router.replace('/login')
  }

  const sendInvite = async () => {
    const trimmed = inviteEmail.trim()
    if (!trimmed) return
    setInviteSending(true)
    setNotice('')

    try {
      const response = await fetch('/api/auth/invitations', {
        method: 'POST',
        headers: withCsrfHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({
          email: trimmed,
          role: inviteRole,
          invitedBy: account.fullName || account.name || account.email || 'HR HUB Admin',
        }),
      })
      const result = await response.json() as { ok?: boolean; error?: string; emailSent?: boolean; acceptUrl?: string; warning?: string }

      if (!result.ok) {
        setNotice(result.error || 'Invitation could not be sent.')
        return
      }

      if (activeCompany) {
        inviteCompanyMember(activeCompany.id, trimmed, inviteRole)
        setActiveCompany(ensureDefaultCompany(account))
        setCompanies(loadAccessibleCompanies())
      }
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
      const inviteLink = result.acceptUrl || `${window.location.origin}/signup?invite=${encodeURIComponent(trimmed.toLowerCase())}`
      setNotice(result.emailSent
        ? `Invitation email sent to ${trimmed}.`
        : `${result.warning || 'Invitation saved locally.'} Share this signup link: ${inviteLink}`)
    } catch {
      setNotice('Invitation could not be sent. Check your email provider settings and try again.')
    } finally {
      setInviteSending(false)
    }
  }

  const removeInvite = (id: number) => {
    setAccount(previous => ({ ...previous, invitations: previous.invitations.filter(invitation => invitation.id !== id) }))
  }

  const removeTenantInvite = (memberId: string) => {
    if (!activeCompany) return
    removeCompanyMember(activeCompany.id, memberId)
    setActiveCompany(ensureDefaultCompany(account))
    setCompanies(loadAccessibleCompanies())
  }

  const latestRequests = [...changeOrders].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 8)
  const projectName = (id: number) => projects.find(project => project.id === id)?.name || `Project #${id}`
  const displayName = account.fullName || account.name || 'Reymark'
  const profileMenuCompanies = useMemo(() => {
    if (activeCompany) return [activeCompany]
    return companies.slice(0, 1)
  }, [activeCompany, companies])
  const role = account.role || 'Admin'
  const financeLoanNotifications = loanRequests.filter(request =>
    request.status === 'Pending' && request.financeApprovalStatus !== 'Approved'
  )
  const financeAllowanceNotifications = allowanceRequests.filter(request =>
    request.status === 'Pending' || request.status === 'Manager Approved'
  )
  const isFinanceWorkspace = role === 'Finance' || pathname.startsWith('/financials') || pathname.startsWith('/accounting')
  const financeOutboundNotifications = outboundNotifications.filter(item =>
    isFinanceWorkspace &&
    item.recipientRole === 'Finance'
  )
  const generalOutboundNotifications = outboundNotifications.filter(item =>
    item.recipientRole !== 'Finance' || !isFinanceWorkspace
  )
  const leaveRequestNotificationItems: HeaderNotificationItem[] = leaveRequests
    .filter(request => String(request.status || '').toLowerCase() !== 'draft')
    .map(request => {
      const status = normalizeNotificationStatus(request.status)
      const statusAction = status.toLowerCase() === 'pending' ? 'requested' : status.toLowerCase()
      const eventTime = request.updatedAt || request.createdAt || new Date().toISOString()
      const days = Number(request.days || 0)
      const dayLabel = `${days || 1} day${Number(days || 1) === 1 ? '' : 's'}`
      return {
        id: `leave-${request.id}`,
        title: `${request.employeeName || 'Employee'} ${statusAction} ${request.leaveType || 'Leave'}`,
        lines: [`${dayLabel} - ${status}`],
        time: new Date(eventTime).toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' }),
        date: new Date(eventTime).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: '2-digit', year: 'numeric' }),
        age: `${Math.max(0, Math.floor((nowMs - new Date(eventTime).getTime()) / 86400000))} days ago`,
        mentioned: true,
        priority: status === 'Pending',
        target: '/hr/approvals',
        type: 'Leave Request',
        detail: `${dayLabel} - ${status}`,
        tone: notificationTone(status),
        sortTime: eventTime,
      }
    })
  const requestNotificationItems: HeaderNotificationItem[] = [
    ...generalOutboundNotifications.map(item => ({
      id: `outbound-${item.id}`,
      title: `[${item.relatedType?.toUpperCase() || 'NOTICE'}] ${item.subject}`,
      lines: [
        item.message,
        item.relatedType || 'Workspace notification',
        'Open the related workspace to review.',
      ],
      time: new Date(item.createdAt).toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' }),
      date: new Date(item.createdAt).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: '2-digit', year: 'numeric' }),
      age: `${Math.max(0, Math.floor((nowMs - new Date(item.createdAt).getTime()) / 86400000))} days ago`,
      mentioned: item.relatedType === 'Chat',
      priority: item.relatedType === 'Workflow',
      target: item.target || (item.relatedType === 'Chat' ? '/chat' : '/workflows/my-jobs'),
      type: item.relatedType || 'Notification',
      detail: item.message,
      tone: item.relatedType === 'Workflow' ? '#159aa6' : '#64748b',
      sortTime: item.createdAt,
    })),
    ...financeOutboundNotifications.map(item => ({
      id: `finance-outbound-${item.id}`,
      title: `[FINANCE] ${item.subject}`,
      lines: [
        item.message,
        item.relatedType,
        'Open Finance workspace to review required action.',
      ],
      time: new Date(item.createdAt).toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' }),
      date: new Date(item.createdAt).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: '2-digit', year: 'numeric' }),
      age: `${Math.max(0, Math.floor((nowMs - new Date(item.createdAt).getTime()) / 86400000))} days ago`,
      mentioned: true,
      priority: true,
      target: item.target || '/financials/loan-management',
      type: 'Finance',
      detail: item.message,
      tone: '#159aa6',
      sortTime: item.createdAt,
    })),
    ...(isFinanceWorkspace ? financeLoanNotifications.map(request => ({
      id: `loan-finance-${request.id}`,
      title: `[FINANCE] ${request.employeeName || 'Employee'} requested ${request.customLoanType || request.requestType}`,
      lines: [
        `Amount: PHP ${Number(request.amount || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        'Finance approval is required before payroll deduction.',
        request.employeeCode || 'Loan / cash advance request',
      ],
      time: new Date(request.createdAt).toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' }),
      date: new Date(request.createdAt).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: '2-digit', year: 'numeric' }),
      age: `${Math.max(0, Math.floor((nowMs - new Date(request.createdAt).getTime()) / 86400000))} days ago`,
      mentioned: true,
      priority: true,
      target: '/accounting/payroll-finance',
      type: 'Loan Request',
      detail: `Amount: PHP ${Number(request.amount || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      tone: '#159aa6',
      sortTime: request.createdAt,
    })) : []),
    ...(isFinanceWorkspace ? financeAllowanceNotifications.map(request => ({
      id: `allowance-finance-${request.id}`,
      title: `[FINANCE] ${request.employeeName} filed ${request.type} allowance`,
      lines: [
        `Amount: PHP ${Number(request.amount || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        request.purpose || request.reason || 'Allowance request needs review.',
        request.employeeCode || request.date,
      ],
      time: new Date(request.createdAt).toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' }),
      date: new Date(request.createdAt).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: '2-digit', year: 'numeric' }),
      age: `${Math.max(0, Math.floor((nowMs - new Date(request.createdAt).getTime()) / 86400000))} days ago`,
      mentioned: true,
      priority: true,
      target: '/accounting/payroll-finance',
      type: 'Allowance',
      detail: `Amount: PHP ${Number(request.amount || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      tone: '#34a853',
      sortTime: request.createdAt,
    })) : []),
  ]
  const changeOrderNotificationItems: HeaderNotificationItem[] = latestRequests.map((order, index) => ({
      id: order.id,
      title: `[${projectName(order.projectId)}] ${order.requestedBy || order.clientName} requested ${order.title}`,
      lines: [
        `${order.description || order.title}`,
        `${order.clientName} · ${order.status}`,
        `${order.files?.length || 0} photo${(order.files?.length || 0) === 1 ? '' : 's'} · ${outboundNotifications.filter(item => item.relatedId === order.id).length} alerts queued`,
      ],
      time: new Date(order.createdAt).toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' }),
      date: new Date(order.createdAt).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: '2-digit', year: 'numeric' }),
      age: `${Math.max(0, Math.floor((nowMs - new Date(order.createdAt).getTime()) / 86400000))} days ago`,
      mentioned: index === 0,
      priority: order.status === 'Requested',
      target: '/projects',
      type: 'Change Order',
      detail: order.description || order.title,
      tone: order.status === 'Requested' ? '#159aa6' : '#64748b',
      sortTime: order.createdAt,
    }))
  const actualNotificationItems = [...leaveRequestNotificationItems, ...requestNotificationItems, ...changeOrderNotificationItems]
    .sort((a, b) => new Date(b.sortTime || b.date).getTime() - new Date(a.sortTime || a.date).getTime())
    .slice(0, 12)
  const unreadNotificationItems = actualNotificationItems.filter(item => !readNotificationIds.includes(String(item.id)))
  const notificationItems = actualNotificationItems.length
    ? unreadNotificationItems
    : [
      { id: 1, title: '[WORKFLOWS] Welcome to WiseFlow notifications', lines: ['Workflow updates, stage changes, and tagged notes will appear here.', 'Click any notification to open its related work.', 'Use filters above to narrow the list.'], time: '10:19', date: 'Monday, Dec 15, 2025', age: 'today', mentioned: true, priority: false, target: '/workflows/my-jobs', type: 'Workflows', detail: 'Workflow updates, stage changes, and tagged notes will appear here.', tone: '#159aa6', sortTime: '2025-12-15T10:19:00' },
    ]
  const notificationBadgeCount = unreadNotificationItems.length
  const reminderTasks = tasks.filter(task => task.dueDate && task.status !== 'Completed' && !task.markedDone)
  const todayReminderTasks = reminderTasks.filter(task => isSameDate(new Date(`${task.dueDate}T00:00:00`), new Date()))
  const lateReminderTasks = reminderTasks.filter(task => new Date(`${task.dueDate}T00:00:00`) < startOfDay(new Date()))
  const importantReminders = reminderTasks.filter(task => task.stickyReminder || todayReminderTasks.includes(task) || lateReminderTasks.includes(task))
  const shownReminderTasks = reminderFilter === 'important'
    ? importantReminders
    : reminderFilter === 'today'
      ? todayReminderTasks
      : reminderFilter === 'late'
        ? lateReminderTasks
        : reminderTasks
  const reminderBadgeCount = importantReminders.length
  const weekDays = Array.from({ length: 7 }, (_, index) => addDays(reminderWeekStart, index))

  const dispatchWorkspaceAction = (name: string, detail?: unknown) => {
    window.dispatchEvent(new CustomEvent(name, { detail }))
  }

  const handleGlobalSearchChange = (value: string) => {
    setGlobalSearch(value)
    setGlobalSearchOpen(Boolean(value.trim()))
    dispatchWorkspaceAction('flowsys-workspace-general-search', { value })
  }

  const openGlobalSearchResult = (result: GlobalSearchResult) => {
    setGlobalSearch('')
    setGlobalSearchOpen(false)
    router.push(result.href)
  }

  const handleGlobalSearchKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Escape') {
      setGlobalSearchOpen(false)
      return
    }
    if (event.key !== 'Enter' || !globalSearchResults[0]) return
    event.preventDefault()
    openGlobalSearchResult(globalSearchResults[0])
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

  const openReminderCenter = () => {
    setRemindersOpen(true)
    setNotificationsOpen(false)
    setHelpOpen(false)
    setOpen(false)
    setToolsOpen(false)
    setCreateMenuOpen(false)
  }

  const markNotificationsRead = () => {
    if (!actualNotificationItems.length) {
      setNotificationsOpen(false)
      return
    }
    const nextIds = Array.from(new Set([...readNotificationIds, ...actualNotificationItems.map(item => String(item.id))]))
    setReadNotificationIds(nextIds)
    window.localStorage.setItem(readNotificationsKey, JSON.stringify(nextIds))
    window.dispatchEvent(new Event('storage'))
    setNotificationsOpen(false)
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
      else router.push(`/workflows/my-jobs?task=${encodeURIComponent(target)}`)
      return
    }
    router.push(`/workflows/my-jobs?task=${task.id}`)
  }

  const pageMeta = getPageMeta(pathname)
  const PageIcon = pageMeta.icon

  // Compute initials from display name
  const initials = displayName.split(' ').filter(Boolean).map((w: string) => w[0]).slice(0, 2).join('').toUpperCase()
  const isApplicationsHeader = false
  const compactHeaderColors = {
    background: isApplicationsHeader ? '#000' : 'var(--background)',
    border: isApplicationsHeader ? '#242424' : 'var(--border)',
    text: isApplicationsHeader ? '#fff' : 'var(--foreground)',
    muted: isApplicationsHeader ? '#8f8f8f' : 'var(--muted-foreground)',
    searchBg: isApplicationsHeader ? '#0c0c0c' : 'var(--card)',
    searchBorder: isApplicationsHeader ? '#2f2f2f' : 'var(--border)',
    fieldText: isApplicationsHeader ? '#fff' : 'var(--foreground)',
    buttonBg: isApplicationsHeader ? '#050505' : 'var(--card)',
  }
  const compactSearchPlaceholder = pathname === '/project-management/tasks' || pathname.startsWith('/project-management/tasks/')
    ? 'Global search across WiseFlow...'
    : pathname === '/project-management' || pathname.startsWith('/project-management/') || pathname === '/projects'
    ? 'Global search across WiseFlow...'
    : 'Search jobs, tasks, clients, invoices...'

  if (compactWorkspace) {
    return (
      <div
        ref={ref}
        className="app-header"
        style={{
          height: 48,
          background: compactHeaderColors.background,
          borderBottom: `1px solid ${compactHeaderColors.border}`,
          display: 'grid',
          gridTemplateColumns: isApplicationsHeader ? 'minmax(360px, 520px) minmax(0, 1fr)' : 'max-content minmax(320px, 1fr) minmax(240px, auto)',
          alignItems: 'center',
          gap: isApplicationsHeader ? 12 : 16,
          padding: '0 20px',
          position: 'sticky',
          top: 0,
          zIndex: 95,
          boxShadow: isApplicationsHeader ? 'none' : '0 1px 3px rgba(0,0,0,0.05)',
          fontFamily: "var(--font-body)",
        }}
      >
        {/* -- Left: mobile menu + breadcrumb -- */}
        <div className="header-left-area" style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0, width: 'fit-content', maxWidth: '100%' }}>
          <button
            className="header-mobile-menu"
            onClick={onMenuClick}
            aria-label="Open navigation"
            style={{ width: 34, height: 34, border: 'none', background: 'transparent', borderRadius: 8, display: 'none', placeItems: 'center', cursor: 'pointer', color: compactHeaderColors.text, flexShrink: 0 }}
          >
            <Menu size={18} />
          </button>
          <div className="header-mobile-brand">
            <span>W</span>
            <strong>WiseFlow</strong>
          </div>
          <div className="header-breadcrumb" style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, minWidth: 0, width: 'fit-content', maxWidth: 260 }}>
            <Home size={13} color={compactHeaderColors.muted} style={{ flexShrink: 0 }} />
            <ChevronRight size={11} color={isApplicationsHeader ? '#5f5f5f' : '#d1d5db'} style={{ flexShrink: 0 }} />
            <span style={{ color: compactHeaderColors.text, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{pageMeta.label}</span>
          </div>
        </div>

        {/* -- Center: search -- */}
        <div ref={searchRef} className="header-search-shell" style={{ position: 'relative', maxWidth: 520, margin: '0 auto', width: '100%', minWidth: 0 }}>
          <label
            className="header-search"
            style={{ display: 'flex', alignItems: 'center', gap: 9, height: 34, borderRadius: 8, background: compactHeaderColors.searchBg, border: `1px solid ${compactHeaderColors.searchBorder}`, padding: '0 12px', cursor: 'text', transition: 'border-color 0.15s, box-shadow 0.15s', width: '100%' }}
            onFocus={e => { (e.currentTarget as HTMLLabelElement).style.borderColor = isApplicationsHeader ? '#5f5f5f' : '#1A73E8'; (e.currentTarget as HTMLLabelElement).style.boxShadow = isApplicationsHeader ? 'none' : '0 0 0 2px rgba(26,115,232,0.12)' }}
            onBlur={e => { (e.currentTarget as HTMLLabelElement).style.borderColor = compactHeaderColors.searchBorder; (e.currentTarget as HTMLLabelElement).style.boxShadow = 'none' }}
          >
            <Search size={14} color={compactHeaderColors.muted} style={{ flexShrink: 0 }} />
            <input
              ref={searchInputRef}
              className="workspace-general-search-input"
              value={globalSearch}
              onFocus={() => setGlobalSearchOpen(true)}
              onChange={event => handleGlobalSearchChange(event.target.value)}
              onKeyDown={handleGlobalSearchKeyDown}
              placeholder={compactSearchPlaceholder}
              style={{ flex: 1, minWidth: 0, border: 'none', outline: 'none', background: 'transparent', color: compactHeaderColors.fieldText, fontSize: 13 }}
            />
            {globalSearch ? (
              <button type="button" onMouseDown={event => event.preventDefault()} onClick={() => handleGlobalSearchChange('')} aria-label="Clear search" style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: compactHeaderColors.muted, display: 'grid', placeItems: 'center', padding: 0 }}>
                <X size={13} />
              </button>
            ) : null}
            <kbd className="header-search-kbd" style={{ flexShrink: 0, display: 'inline-flex', alignItems: 'center', gap: 2, background: isApplicationsHeader ? '#050505' : '#f3f4f6', border: `1px solid ${compactHeaderColors.searchBorder}`, borderRadius: 5, padding: '1px 6px', fontSize: 11, color: isApplicationsHeader ? '#c8c8c8' : '#000000', fontFamily: "var(--font-body)", letterSpacing: '0.01em' }}>Ctrl K</kbd>
          </label>
          <GlobalSearchPanel
            open={globalSearchOpen}
            query={globalSearch}
            results={globalSearchResults}
            dark={true}
            onOpen={openGlobalSearchResult}
          />
        </div>

        {/* -- Right: actions -- */}
        <div className="header-actions-area" style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 4, minWidth: 0 }}>
          {/* Bell */}
          <button
            onClick={() => { setNotificationsOpen(!notificationsOpen); setRemindersOpen(false); setHelpOpen(false); setOpen(false) }}
            aria-label="Notifications"
            style={{ position: 'relative', width: 34, height: 34, border: 'none', background: 'transparent', borderRadius: 8, display: 'grid', placeItems: 'center', cursor: 'pointer', color: compactHeaderColors.text }}
          >
            <Bell size={17} />
            {notificationBadgeCount > 0 && (
              <span style={{ position: 'absolute', top: 4, right: 4, minWidth: 16, height: 16, borderRadius: 999, background: '#ef4444', color: '#fff', fontSize: 10, fontWeight: 700, display: 'grid', placeItems: 'center', padding: '0 4px', lineHeight: 1 }}>
                {notificationBadgeCount}
              </span>
            )}
          </button>

          <button
            onClick={openReminderCenter}
            aria-label="Open reminders"
            aria-expanded={remindersOpen}
            title="Reminders"
            style={{ position: 'relative', width: 34, height: 34, border: 'none', background: 'transparent', borderRadius: 8, display: 'grid', placeItems: 'center', cursor: 'pointer', color: compactHeaderColors.text }}
          >
            <CalendarDays size={17} />
            {reminderBadgeCount > 0 && (
              <span style={{ position: 'absolute', top: 4, right: 4, minWidth: 16, height: 16, borderRadius: 999, background: '#ef4444', color: '#fff', fontSize: 10, fontWeight: 700, display: 'grid', placeItems: 'center', padding: '0 4px', lineHeight: 1 }}>
                {reminderBadgeCount}
              </span>
            )}
          </button>

          {/* Help — hidden on mobile */}
          <button
            className="header-help-btn"
            title="Help"
            aria-label="Open help menu"
            aria-expanded={helpOpen}
            onClick={() => { setHelpOpen(open => !open); setNotificationsOpen(false); setOpen(false); setToolsOpen(false); setCreateMenuOpen(false) }}
            style={{ width: 34, height: 34, border: 'none', background: 'transparent', borderRadius: 8, display: 'grid', placeItems: 'center', cursor: 'pointer', color: compactHeaderColors.text }}
          >
            <HelpCircle size={17} />
          </button>

          {helpOpen && (
            <div className="header-help-menu" role="menu" aria-label="Help menu" style={{ position: 'absolute', top: 52, right: 88, width: 260, background: '#fff', border: '1px solid #eef2f7', borderRadius: 12, boxShadow: '0 24px 70px rgba(15,23,42,0.18)', padding: 10, zIndex: 105, display: 'grid', gap: 6 }}>
              <div style={{ padding: '8px 10px 6px' }}>
                <strong style={{ display: 'block', fontSize: 13, color: '#111827' }}>Help & support</strong>
                <span style={{ display: 'block', marginTop: 3, fontSize: 12, color: '#000000', lineHeight: 1.35 }}>Open guidance for your workspace.</span>
              </div>
              {[
                { label: 'Open dashboard guide', href: '/dashboard' },
                { label: 'Workspace settings', href: '/settings' },
                { label: 'Design system', href: '/design-system' },
              ].map(item => (
                <button key={item.label} type="button" role="menuitem" onClick={() => { setHelpOpen(false); router.push(item.href) }} style={{ border: 0, background: 'transparent', color: '#111827', borderRadius: 8, padding: '9px 10px', textAlign: 'left', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                  {item.label}
                </button>
              ))}
            </div>
          )}

          {/* Settings — hidden on small mobile */}
          <button
            className="header-settings-btn"
            onClick={() => router.push('/settings')}
            title="Settings"
            style={{ width: 34, height: 34, border: 'none', background: 'transparent', borderRadius: 8, display: 'grid', placeItems: 'center', cursor: 'pointer', color: compactHeaderColors.text }}
          >
            <Settings size={17} />
          </button>

          {/* Avatar + name */}
          <button
            className="header-user-button"
            onClick={() => setOpen(!open)}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 7, border: `1px solid ${compactHeaderColors.searchBorder}`, background: compactHeaderColors.buttonBg, borderRadius: 8, padding: '5px 10px 5px 5px', cursor: 'pointer', marginLeft: 2 }}
          >
            <span style={{ width: 28, height: 28, borderRadius: '50%', background: '#1A73E8', color: '#fff', display: 'grid', placeItems: 'center', fontSize: 11, fontWeight: 700, flexShrink: 0 }}>
              {initials}
            </span>
            <span className="header-username" style={{ fontSize: 13, fontWeight: 500, color: compactHeaderColors.fieldText, whiteSpace: 'nowrap', maxWidth: 130, overflow: 'hidden', textOverflow: 'ellipsis' }}>{displayName}</span>
            <ChevronDown size={13} color={compactHeaderColors.muted} />
          </button>

          {notificationsOpen && (
            <NotificationPanel
              items={notificationItems}
              allCount={notificationItems.length}
              onMarkAllRead={markNotificationsRead}
              onClose={() => setNotificationsOpen(false)}
              onOpen={target => { setNotificationsOpen(false); router.push(target) }}
            />
          )}

          {open && (
            <div className="profile-menu" style={{ position: 'absolute', top: 52, right: 8, width: 380, background: '#fff', border: '1px solid #d7d7d7', borderRadius: 4, boxShadow: '0 24px 80px rgba(0,0,0,0.18)', overflow: 'hidden', zIndex: 100, color: '#111827' }}>
              <div style={{ padding: '24px 26px 18px', textAlign: 'center', borderBottom: '1px solid #e8e8e8' }}>
                <span style={{ width: 44, height: 44, borderRadius: 14, background: '#1769aa', color: '#fff', display: 'grid', placeItems: 'center', fontSize: 17, fontWeight: 900, margin: '0 auto 12px' }}>{initials}</span>
                <div style={{ fontSize: 16, fontWeight: 800, color: '#111' }}>{displayName}</div>
                <div style={{ fontSize: 12, color: '#000000', marginTop: 4 }}>{account.email}</div>
                <div style={{ fontSize: 11, color: '#000000', marginTop: 8 }}>Standard account in <strong style={{ color: '#111827' }}>{activeCompany?.name || account.company}</strong></div>
              </div>
              <div style={{ padding: '14px 26px', display: 'grid', gap: 0, borderBottom: '1px solid #e8e8e8' }}>
                <div style={{ ...tinyLabelStyle, marginBottom: 8 }}>Choose an account</div>
                {profileMenuCompanies.map(company => (
                  <button key={company.id} onClick={() => switchCompany(company.id)} style={{ border: 0, borderTop: '1px solid #e8e8e8', background: '#fff', color: '#111827', minHeight: 76, padding: '12px 0', display: 'grid', gridTemplateColumns: '40px minmax(0, 1fr) auto', alignItems: 'center', gap: 12, cursor: 'pointer', textAlign: 'left' }}>
                    <span style={{ width: 34, height: 34, borderRadius: '50%', background: activeCompany?.id === company.id ? '#1a73e8' : '#eef0ff', color: activeCompany?.id === company.id ? '#fff' : '#6b6eea', display: 'grid', placeItems: 'center', fontSize: 12, fontWeight: 900 }}>{company.name.slice(0, 2).toUpperCase()}</span>
                    <span style={{ minWidth: 0 }}>
                      <span style={{ display: 'block', fontSize: 13, fontWeight: 800, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{company.name}</span>
                      <span style={{ display: 'block', fontSize: 12, color: '#000000', marginTop: 3 }}>{company.type}</span>
                    </span>
                    <span style={{ color: '#16a34a', fontSize: 12, fontWeight: 800 }}>Active</span>
                  </button>
                ))}
              </div>
              {[
                { label: 'Create Company', icon: Plus, panel: 'company' as Panel },
                { label: 'Company Settings', icon: Building2, panel: 'companySettings' as Panel },
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
                    {([
                      ['important', 'IMPORTANT', importantReminders.length],
                      ['today', 'TODAY', todayReminderTasks.length],
                      ['late', 'LATE', lateReminderTasks.length],
                    ] as Array<[ReminderFilter, string, number]>).map(([key, label, count]) => {
                      const active = reminderFilter === key
                      return (
                        <button key={key} onClick={() => setReminderFilter(key)} style={{ border: 'none', borderBottom: active ? '2px solid #168c96' : '2px solid transparent', background: 'transparent', color: active ? '#168c96' : '#888', fontSize: 11, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9, cursor: 'pointer' }}>
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
                    {panel === 'companySettings' && 'Company Settings'}
                    {panel === 'invitations' && 'Invitations'}
                    {panel === 'settings' && 'Account settings'}
                    {panel === 'preferences' && 'Preferences'}
                    {panel === 'logout' && 'Logout'}
                  </div>
                  <div style={{ fontSize: 12, color: '#000000', marginTop: 3 }}>{account.email}</div>
                </div>
                <button onClick={() => setPanel(null)} style={modalIconButtonStyle}><X size={18} /></button>
              </div>
              <div style={{ padding: 20 }}>
                {notice && <div style={noticeStyle}><Check size={16} /> {notice}</div>}
                {panel === 'company' && (
                  <div style={{ display: 'grid', gap: 14 }}>
                    <label style={fieldGroupStyle}><span style={labelStyle}>New company name</span><input value={companyName} onChange={event => setCompanyName(event.target.value)} placeholder="Example: New Construction Company" style={fieldStyle} /></label>
                    <label style={fieldGroupStyle}><span style={labelStyle}>Company type</span><input value={companyType} onChange={event => setCompanyType(event.target.value)} placeholder="Operating Company" style={fieldStyle} /></label>
                    <div style={infoCardStyle}><div style={tinyLabelStyle}>Current company</div><div style={{ fontSize: 15, color: '#111827', fontWeight: 600 }}>{activeCompany?.name || account.company}</div></div>
                    <div style={{ display: 'grid', gap: 8 }}>
                      {companies.map(company => (
                        <button key={company.id} onClick={() => switchCompany(company.id)} style={{ ...secondaryButtonStyle, justifyContent: 'space-between', display: 'flex' }}>
                          <span>{company.name}</span>
                          {activeCompany?.id === company.id ? <Check size={15} /> : <ChevronRight size={15} />}
                        </button>
                      ))}
                    </div>
                    <button onClick={createCompany} disabled={!companyName.trim()} style={{ ...primaryButtonStyle, opacity: companyName.trim() ? 1 : 0.45 }}>Create and switch</button>
                  </div>
                )}
                {panel === 'invitations' && (
                  <div style={{ display: 'grid', gap: 14 }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 150px auto', gap: 10, alignItems: 'end' }}>
                      <label style={fieldGroupStyle}><span style={labelStyle}>Email</span><input value={inviteEmail} onChange={event => setInviteEmail(event.target.value)} placeholder="teammate@example.com" style={fieldStyle} /></label>
                      <label style={fieldGroupStyle}><span style={labelStyle}>Role</span><select value={inviteRole} onChange={event => setInviteRole(event.target.value as CompanyRole)} style={fieldStyle}>{inviteRoleOptions.map(option => <option key={option}>{option}</option>)}</select></label>
                      <button onClick={sendInvite} disabled={!inviteEmail.trim() || inviteSending} style={{ ...primaryButtonStyle, height: 40, opacity: inviteEmail.trim() && !inviteSending ? 1 : 0.45 }}>{inviteSending ? 'Sending...' : 'Invite'}</button>
                    </div>
                    <div style={infoCardStyle}><div style={tinyLabelStyle}>Permissions for {inviteRole}</div><div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>{rolePermissions(inviteRole).map(permission => <span key={permission} style={permissionPillStyle}>{permission}</span>)}</div></div>
                    {(activeCompany?.members || []).filter(member => member.status === 'Pending').map(member => (
                      <div key={member.id} style={inviteRowStyle}>
                        <div>
                          <div style={{ fontSize: 13, color: '#111827', fontWeight: 600 }}>{member.email}</div>
                          <div style={{ fontSize: 12, color: '#000000', marginTop: 3 }}>{member.role}</div>
                        </div>
                        <span style={{ fontSize: 11, color: '#d97706', background: '#fef3c7', borderRadius: 20, padding: '4px 9px', fontWeight: 600 }}>{member.status}</span>
                        <button onClick={() => removeTenantInvite(member.id)} style={dangerIconButtonStyle}><Trash2 size={15} /></button>
                      </div>
                    ))}
                  </div>
                )}
                {panel === 'companySettings' && (
                  <div style={{ display: 'grid', gap: 14 }}>
                    <label style={fieldGroupStyle}><span style={labelStyle}>Company name</span><input value={companySettingsDraft.name} onChange={event => setCompanySettingsDraft(previous => ({ ...previous, name: event.target.value }))} style={fieldStyle} /></label>
                    <label style={fieldGroupStyle}><span style={labelStyle}>Company type</span><input value={companySettingsDraft.type} onChange={event => setCompanySettingsDraft(previous => ({ ...previous, type: event.target.value }))} style={fieldStyle} /></label>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                      <label style={fieldGroupStyle}><span style={labelStyle}>Currency</span><select value={companySettingsDraft.currency} onChange={event => setCompanySettingsDraft(previous => ({ ...previous, currency: event.target.value }))} style={fieldStyle}><option>USD</option><option>PHP</option><option>EUR</option><option>GBP</option></select></label>
                      <label style={fieldGroupStyle}><span style={labelStyle}>Fiscal year starts</span><select value={companySettingsDraft.fiscalYearStart} onChange={event => setCompanySettingsDraft(previous => ({ ...previous, fiscalYearStart: event.target.value }))} style={fieldStyle}><option>January</option><option>April</option><option>July</option><option>October</option></select></label>
                    </div>
                    <label style={fieldGroupStyle}><span style={labelStyle}>Timezone</span><input value={companySettingsDraft.timezone} onChange={event => setCompanySettingsDraft(previous => ({ ...previous, timezone: event.target.value }))} style={fieldStyle} /></label>
                    <div style={infoCardStyle}>
                      <div style={tinyLabelStyle}>Members and permissions</div>
                      <div style={{ display: 'grid', gap: 8, marginTop: 10 }}>
                        {(activeCompany?.members || []).map(member => (
                          <div key={member.id} style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto', gap: 10, alignItems: 'center' }}>
                            <div style={{ minWidth: 0 }}>
                              <div style={{ fontSize: 13, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{member.name || member.email}</div>
                              <div style={{ fontSize: 11, color: '#000000' }}>{member.role} · {member.permissions.join(', ')}</div>
                            </div>
                            <span style={permissionPillStyle}>{member.status}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <button onClick={saveCompanySettings} style={primaryButtonStyle}>Save company settings</button>
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
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}><button onClick={() => setPanel(null)} style={secondaryButtonStyle}>Cancel</button><button onClick={logout} style={{ ...primaryButtonStyle, background: '#dc2626' }}>Logout</button></div>
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

      {/* -- Centred search bar -- */}
      {!compactWorkspace && (
        <div ref={searchRef} style={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)', width: 360, zIndex: 85 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#f3f4f6', border: '1px solid #e5e7eb', borderRadius: 999, padding: '7px 16px', width: '100%', cursor: 'text', transition: 'border-color 0.15s, box-shadow 0.15s' }}
            onFocus={e => { (e.currentTarget as HTMLLabelElement).style.borderColor = '#22c55e'; (e.currentTarget as HTMLLabelElement).style.boxShadow = '0 0 0 3px rgba(34,197,94,0.12)' }}
            onBlur={e => { (e.currentTarget as HTMLLabelElement).style.borderColor = '#e5e7eb'; (e.currentTarget as HTMLLabelElement).style.boxShadow = 'none' }}
          >
            <Search size={14} color="#000000" style={{ flexShrink: 0 }} />
            <input
              ref={searchInputRef}
              value={globalSearch}
              onFocus={() => setGlobalSearchOpen(true)}
              onChange={event => handleGlobalSearchChange(event.target.value)}
              onKeyDown={handleGlobalSearchKeyDown}
              placeholder="Search records"
              style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', color: '#111827', fontSize: 13, fontFamily: 'inherit' }}
            />
            {globalSearch && (
              <button type="button" onMouseDown={event => event.preventDefault()} onClick={() => handleGlobalSearchChange('')} aria-label="Clear search" style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#000000', display: 'grid', placeItems: 'center', padding: 0 }}>
                <X size={13} />
              </button>
            )}
          </label>
          <GlobalSearchPanel
            open={globalSearchOpen}
            query={globalSearch}
            results={globalSearchResults}
            dark={false}
            onOpen={openGlobalSearchResult}
          />
        </div>
      )}

      <div ref={ref} style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 12, pointerEvents: 'auto' }}>
        <button
          onClick={() => { setNotificationsOpen(!notificationsOpen); setRemindersOpen(false); setOpen(false) }}
          aria-label="Open notifications"
          style={notificationButtonStyle}
        >
          <Bell size={18} />
          {notificationBadgeCount > 0 && <span style={notificationBadgeStyle}>{notificationBadgeCount}</span>}
        </button>

        {notificationsOpen && (
          <NotificationPanel
            items={notificationItems}
            allCount={notificationItems.length}
            onMarkAllRead={markNotificationsRead}
            onClose={() => setNotificationsOpen(false)}
            onOpen={target => { setNotificationsOpen(false); router.push(target) }}
          />
        )}

        <button onClick={() => setOpen(!open)} style={{ width: 38, height: 38, borderRadius: '50%', border: '1px solid #e5e7eb', background: 'linear-gradient(135deg,#f8fafc,#e2e8f0)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: 13, fontWeight: 600, color: '#111827', boxShadow: '0 10px 24px rgba(15,23,42,0.08)' }}>
          LW
        </button>

        {open && (
          <div className="profile-menu" style={{ position: 'absolute', top: 50, right: 0, width: 380, background: '#fff', border: '1px solid #d7d7d7', borderRadius: 4, boxShadow: '0 24px 80px rgba(0,0,0,0.18)', overflow: 'hidden', zIndex: 80, color: '#111827' }}>
            <div style={{ padding: '24px 26px 18px', textAlign: 'center', borderBottom: '1px solid #e8e8e8' }}>
              <span style={{ width: 44, height: 44, borderRadius: 14, background: '#1769aa', color: '#fff', display: 'grid', placeItems: 'center', fontSize: 17, fontWeight: 900, margin: '0 auto 12px' }}>{initials}</span>
              <div style={{ fontSize: 16, fontWeight: 800, color: '#111' }}>{displayName}</div>
              <div style={{ fontSize: 12, color: '#000000', marginTop: 4 }}>{account.email}</div>
              <div style={{ fontSize: 11, color: '#000000', marginTop: 8 }}>Standard account in <strong style={{ color: '#111827' }}>{activeCompany?.name || account.company}</strong></div>
            </div>
            <div style={{ padding: '14px 26px', display: 'grid', gap: 0, borderBottom: '1px solid #e8e8e8' }}>
              <div style={{ ...tinyLabelStyle, marginBottom: 8 }}>Choose an account</div>
              {profileMenuCompanies.map(company => (
                <button key={company.id} onClick={() => switchCompany(company.id)} style={{ border: 0, borderTop: '1px solid #e8e8e8', background: '#fff', color: '#111827', minHeight: 76, padding: '12px 0', display: 'grid', gridTemplateColumns: '40px minmax(0, 1fr) auto', alignItems: 'center', gap: 12, cursor: 'pointer', textAlign: 'left' }}>
                  <span style={{ width: 34, height: 34, borderRadius: '50%', background: activeCompany?.id === company.id ? '#1a73e8' : '#eef0ff', color: activeCompany?.id === company.id ? '#fff' : '#6b6eea', display: 'grid', placeItems: 'center', fontSize: 12, fontWeight: 900 }}>{company.name.slice(0, 2).toUpperCase()}</span>
                  <span style={{ minWidth: 0 }}>
                    <span style={{ display: 'block', fontSize: 13, fontWeight: 800, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{company.name}</span>
                    <span style={{ display: 'block', fontSize: 12, color: '#000000', marginTop: 3 }}>{company.type}</span>
                  </span>
                  <span style={{ color: '#16a34a', fontSize: 12, fontWeight: 800 }}>Active</span>
                </button>
              ))}
            </div>

            {[
              { label: 'Create Company', icon: Plus, panel: 'company' as Panel },
              { label: 'Company Settings', icon: Building2, panel: 'companySettings' as Panel },
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
                  {panel === 'companySettings' && 'Company Settings'}
                  {panel === 'invitations' && 'Invitations'}
                  {panel === 'settings' && 'Account settings'}
                  {panel === 'preferences' && 'Preferences'}
                  {panel === 'logout' && 'Logout'}
                </div>
                <div style={{ fontSize: 12, color: '#000000', marginTop: 3 }}>{account.email}</div>
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
                  <label style={fieldGroupStyle}>
                    <span style={labelStyle}>Company type</span>
                    <input value={companyType} onChange={event => setCompanyType(event.target.value)} placeholder="Operating Company" style={fieldStyle} />
                  </label>
                  <div style={infoCardStyle}>
                    <div style={tinyLabelStyle}>Current company</div>
                    <div style={{ fontSize: 15, color: '#111827', fontWeight: 600 }}>{activeCompany?.name || account.company}</div>
                  </div>
                  <div style={{ display: 'grid', gap: 8 }}>
                    {companies.map(company => (
                      <button key={company.id} onClick={() => switchCompany(company.id)} style={{ ...secondaryButtonStyle, justifyContent: 'space-between', display: 'flex' }}>
                        <span>{company.name}</span>
                        {activeCompany?.id === company.id ? <Check size={15} /> : <ChevronRight size={15} />}
                      </button>
                    ))}
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
                      <select value={inviteRole} onChange={event => setInviteRole(event.target.value as CompanyRole)} style={fieldStyle}>
                        {inviteRoleOptions.map(option => <option key={option}>{option}</option>)}
                      </select>
                    </label>
                    <button onClick={sendInvite} disabled={!inviteEmail.trim() || inviteSending} style={{ ...primaryButtonStyle, height: 40, opacity: inviteEmail.trim() && !inviteSending ? 1 : 0.45 }}>{inviteSending ? 'Sending...' : 'Invite'}</button>
                  </div>
                  <div style={infoCardStyle}><div style={tinyLabelStyle}>Permissions for {inviteRole}</div><div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>{rolePermissions(inviteRole).map(permission => <span key={permission} style={permissionPillStyle}>{permission}</span>)}</div></div>
                  {(activeCompany?.members || []).filter(member => member.status === 'Pending').length === 0 && account.invitations.length === 0 ? (
                    <div style={{ padding: 24, textAlign: 'center', color: '#000000', border: '1px dashed #e5e7eb', borderRadius: 12 }}>No invitations yet.</div>
                  ) : null}
                  {(activeCompany?.members || []).filter(member => member.status === 'Pending').map(member => (
                    <div key={member.id} style={inviteRowStyle}>
                      <div>
                        <div style={{ fontSize: 13, color: '#111827', fontWeight: 600 }}>{member.email}</div>
                        <div style={{ fontSize: 12, color: '#000000', marginTop: 3 }}>{member.role}</div>
                      </div>
                      <span style={{ fontSize: 11, color: '#d97706', background: '#fef3c7', borderRadius: 20, padding: '4px 9px', fontWeight: 600 }}>{member.status}</span>
                      <button onClick={() => removeTenantInvite(member.id)} style={dangerIconButtonStyle}><Trash2 size={15} /></button>
                    </div>
                  ))}
                  {account.invitations.map(invitation => (
                    <div key={invitation.id} style={inviteRowStyle}>
                      <div>
                        <div style={{ fontSize: 13, color: '#111827', fontWeight: 600 }}>{invitation.email}</div>
                        <div style={{ fontSize: 12, color: '#000000', marginTop: 3 }}>{invitation.role}</div>
                      </div>
                      <span style={{ fontSize: 11, color: '#d97706', background: '#fef3c7', borderRadius: 20, padding: '4px 9px', fontWeight: 600 }}>{invitation.status}</span>
                      <button onClick={() => removeInvite(invitation.id)} style={dangerIconButtonStyle}><Trash2 size={15} /></button>
                    </div>
                  ))}
                </div>
              )}

              {panel === 'companySettings' && (
                <div style={{ display: 'grid', gap: 14 }}>
                  <label style={fieldGroupStyle}><span style={labelStyle}>Company name</span><input value={companySettingsDraft.name} onChange={event => setCompanySettingsDraft(previous => ({ ...previous, name: event.target.value }))} style={fieldStyle} /></label>
                  <label style={fieldGroupStyle}><span style={labelStyle}>Company type</span><input value={companySettingsDraft.type} onChange={event => setCompanySettingsDraft(previous => ({ ...previous, type: event.target.value }))} style={fieldStyle} /></label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    <label style={fieldGroupStyle}><span style={labelStyle}>Currency</span><select value={companySettingsDraft.currency} onChange={event => setCompanySettingsDraft(previous => ({ ...previous, currency: event.target.value }))} style={fieldStyle}><option>USD</option><option>PHP</option><option>EUR</option><option>GBP</option></select></label>
                    <label style={fieldGroupStyle}><span style={labelStyle}>Fiscal year starts</span><select value={companySettingsDraft.fiscalYearStart} onChange={event => setCompanySettingsDraft(previous => ({ ...previous, fiscalYearStart: event.target.value }))} style={fieldStyle}><option>January</option><option>April</option><option>July</option><option>October</option></select></label>
                  </div>
                  <label style={fieldGroupStyle}><span style={labelStyle}>Timezone</span><input value={companySettingsDraft.timezone} onChange={event => setCompanySettingsDraft(previous => ({ ...previous, timezone: event.target.value }))} style={fieldStyle} /></label>
                  <div style={infoCardStyle}>
                    <div style={tinyLabelStyle}>Members and permissions</div>
                    <div style={{ display: 'grid', gap: 8, marginTop: 10 }}>
                      {(activeCompany?.members || []).map(member => (
                        <div key={member.id} style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto', gap: 10, alignItems: 'center' }}>
                          <div style={{ minWidth: 0 }}>
                            <div style={{ fontSize: 13, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{member.name || member.email}</div>
                            <div style={{ fontSize: 11, color: '#000000' }}>{member.role} · {member.permissions.join(', ')}</div>
                          </div>
                          <span style={permissionPillStyle}>{member.status}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <button onClick={saveCompanySettings} style={primaryButtonStyle}>Save company settings</button>
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
                    <button onClick={logout} style={{ ...primaryButtonStyle, background: '#dc2626' }}>Logout</button>
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

function GlobalSearchPanel({
  open,
  query,
  results,
  dark,
  onOpen,
}: {
  open: boolean
  query: string
  results: GlobalSearchResult[]
  dark: boolean
  onOpen: (result: GlobalSearchResult) => void
}) {
  if (!open) return null

  const trimmed = query.trim()
  const colors = dark
    ? {
        bg: '#ffffff',
        border: '#d4d4d4',
        text: '#000000',
        muted: '#000000',
        item: '#ffffff',
        hover: '#f3f4f6',
        badge: '#f3f4f6',
      }
    : {
        bg: '#fff',
        border: '#e5e7eb',
        text: '#000000',
        muted: '#000000',
        item: '#fff',
        hover: '#f9fafb',
        badge: '#f3f4f6',
      }

  return (
    <div
      role="listbox"
      aria-label="Global search results"
      onMouseDown={event => event.preventDefault()}
      style={{
        position: 'absolute',
        top: 'calc(100% + 8px)',
        left: 0,
        right: 0,
        minWidth: 360,
        maxWidth: 'min(560px, calc(100vw - 32px))',
        background: colors.bg,
        border: `1px solid ${colors.border}`,
        borderRadius: 12,
        boxShadow: dark ? '0 22px 70px rgba(0,0,0,.54)' : '0 22px 70px rgba(15,23,42,.2)',
        padding: 8,
        zIndex: 180,
        color: colors.text,
      }}
    >
      {trimmed.length < 2 ? (
        <div style={{ padding: '12px 12px', color: colors.muted, fontSize: 13 }}>Type at least 2 characters to search real records.</div>
      ) : results.length === 0 ? (
        <div style={{ padding: '12px 12px', color: colors.muted, fontSize: 13 }}>No matching records found.</div>
      ) : (
        <div style={{ display: 'grid', gap: 4, maxHeight: 380, overflowY: 'auto' }}>
          {results.map(result => (
            <button
              key={result.id}
              type="button"
              role="option"
              aria-selected={false}
              onClick={() => onOpen(result)}
              style={{
                border: 'none',
                background: colors.item,
                color: colors.text,
                borderRadius: 8,
                padding: '10px 11px',
                cursor: 'pointer',
                display: 'grid',
                gridTemplateColumns: 'minmax(0, 1fr) auto',
                alignItems: 'center',
                gap: 12,
                textAlign: 'left',
              }}
              onMouseEnter={event => { event.currentTarget.style.background = colors.hover }}
              onMouseLeave={event => { event.currentTarget.style.background = colors.item }}
            >
              <span style={{ minWidth: 0 }}>
                <span style={{ display: 'block', fontSize: 13, fontWeight: 800, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{result.title}</span>
                <span style={{ display: 'block', marginTop: 3, fontSize: 12, color: colors.muted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {result.subtitle || result.href}
                </span>
              </span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
                <span style={{ maxWidth: 118, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', border: `1px solid ${colors.border}`, background: colors.badge, color: colors.muted, borderRadius: 999, padding: '4px 8px', fontSize: 11, fontWeight: 700 }}>
                  {result.module}
                </span>
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function notificationMeta(item: HeaderNotificationItem) {
  const bracket = item.title.match(/^\[([^\]]+)\]\s*/)
  const type = item.type || bracket?.[1] || 'Notification'
  const parsed = new Date(item.sortTime || item.date)
  const date = Number.isNaN(parsed.getTime())
    ? item.date
    : parsed.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  return `${type.toUpperCase()} · ${date.toUpperCase()}`
}

function notificationTitle(item: HeaderNotificationItem) {
  const bracket = item.title.match(/^\[([^\]]+)\]\s*/)
  if (!bracket || !item.type || bracket[1].toLowerCase() !== item.type.toLowerCase()) return item.title
  return item.title.replace(/^\[[^\]]+\]\s*/, '')
}

function NotificationPanel({
  items,
  allCount,
  onMarkAllRead,
  onClose,
  onOpen,
}: {
  items: HeaderNotificationItem[]
  allCount: number
  onMarkAllRead: () => void
  onClose: () => void
  onOpen: (target: string) => void
}) {
  return (
    <div className="notifications-panel" style={{ position: 'absolute', top: 42, right: 128, width: 380, maxWidth: 'calc(100vw - 24px)', background: '#fff', color: '#202124', border: '1px solid #dadce0', borderRadius: 18, boxShadow: '0 12px 34px rgba(60,64,67,.24), 0 3px 10px rgba(60,64,67,.12)', zIndex: 145, overflow: 'hidden' }}>
      <div style={{ padding: '16px 18px 12px', borderBottom: '1px solid #f1f3f4', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <div>
          <h2 style={{ margin: 0, color: '#202124', fontSize: 18, fontWeight: 900, letterSpacing: 0, lineHeight: 1.2 }}>Notifications</h2>
          <span style={{ display: 'block', marginTop: 4, color: '#5f6368', fontSize: 12 }}>{allCount ? `${allCount} update${allCount === 1 ? '' : 's'} waiting` : 'You are all caught up'}</span>
        </div>
        <button type="button" onClick={onMarkAllRead} style={{ border: 'none', background: 'transparent', color: '#111', cursor: 'pointer', fontSize: 12, fontWeight: 800, padding: '6px 8px', borderRadius: 999 }}>
          Done
        </button>
      </div>

      <div style={{ maxHeight: 390, overflowY: 'auto', background: '#fff' }}>
        {items.length === 0 ? (
          <div style={{ minHeight: 150, display: 'grid', placeItems: 'center', textAlign: 'center', gap: 7, color: '#5f6368', padding: 24, fontSize: 12 }}>
            <Bell size={20} />
            <strong style={{ color: '#202124', fontSize: 13 }}>No unread notifications</strong>
            <span>New admin approvals, workflow, and business updates will appear here.</span>
          </div>
        ) : items.slice(0, 8).map(item => (
          <button key={item.id} type="button" onClick={() => onOpen(item.target)} style={{ width: '100%', border: 0, borderBottom: '1px solid #f1f3f4', background: '#fff', color: '#202124', display: 'grid', gridTemplateColumns: '10px minmax(0, 1fr)', gap: 12, textAlign: 'left', padding: '16px 18px', cursor: 'pointer' }}>
            <span style={{ width: 8, height: 8, borderRadius: 999, marginTop: 8, background: item.tone || '#159aa6' }} />
            <span style={{ minWidth: 0 }}>
              <span style={{ display: 'block', color: '#5f6368', fontSize: 11, fontWeight: 800, marginBottom: 4, textTransform: 'uppercase', letterSpacing: .3 }}>{notificationMeta(item)}</span>
              <span style={{ display: 'block', color: '#202124', fontSize: 14, fontWeight: 900, lineHeight: 1.25, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{notificationTitle(item)}</span>
              <span style={{ display: 'block', color: '#5f6368', fontSize: 12.5, lineHeight: 1.35, marginTop: 5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.detail || item.lines[0] || item.age}</span>
            </span>
          </button>
        ))}
      </div>

      <button type="button" onClick={onClose} style={{ width: '100%', minHeight: 46, border: 'none', borderTop: '1px solid #f1f3f4', background: '#f8f9fa', color: '#111', fontSize: 13, fontWeight: 900, cursor: 'pointer' }}>
        View all admin notifications
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
const tinyLabelStyle = { fontSize: 12, color: '#000000', fontWeight: 600, marginBottom: 6 }
const fieldStyle = { width: '100%', border: '1px solid #e5e7eb', borderRadius: 9, padding: '10px 12px', fontSize: 13, color: '#111827', outline: 'none', background: '#fff' }
const primaryButtonStyle = { border: 'none', borderRadius: 9, background: '#111827', color: '#fff', padding: '10px 14px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }
const secondaryButtonStyle = { border: '1px solid #e5e7eb', borderRadius: 9, background: '#fff', color: '#374151', padding: '10px 14px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }
const modalIconButtonStyle = { width: 34, height: 34, border: '1px solid #e5e7eb', borderRadius: 9, background: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }
const dangerIconButtonStyle = { width: 32, height: 32, border: 'none', borderRadius: 8, background: '#fff1f2', color: '#e11d48', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }
const checkRowStyle = { display: 'flex', alignItems: 'center', gap: 10, fontSize: 14, color: '#374151', fontWeight: 600 }
const noticeStyle = { marginBottom: 14, padding: '10px 12px', borderRadius: 10, background: '#ecfdf5', color: '#047857', fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }
const infoCardStyle = { border: '1px solid #e5e7eb', borderRadius: 12, padding: 14 }
const inviteRowStyle = { display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto auto', gap: 10, alignItems: 'center', border: '1px solid #f3f4f6', borderRadius: 12, padding: 12 }
const permissionPillStyle = { display: 'inline-flex', alignItems: 'center', borderRadius: 999, background: '#ecfdf5', color: '#047857', padding: '4px 8px', fontSize: 11, fontWeight: 700 }
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
const reminderSwitchKnobStyle = (_active: boolean) => {
  void _active
  return {
  width: 12,
  height: 12,
  borderRadius: '50%',
  background: '#fff',
  display: 'block',
  }
}
