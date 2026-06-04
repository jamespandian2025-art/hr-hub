'use client'

import { useMemo, useState } from 'react'
import type { ComponentType, FormEvent, ReactNode } from 'react'
import {
  BadgeCheck,
  BadgeDollarSign,
  Bell,
  BookOpen,
  BookOpenCheck,
  Bot,
  Building2,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ClipboardCheck,
  ClipboardList,
  DatabaseZap,
  FileText,
  Folder,
  FolderKanban,
  Grid3X3,
  HandCoins,
  KeyRound,
  LayoutDashboard,
  Mail,
  MapPin,
  MoreHorizontal,
  Plus,
  Search,
  Settings,
  ShieldCheck,
  SlidersHorizontal,
  ShoppingCart,
  UserPlus,
  UserRound,
  UsersRound,
  Warehouse,
  WalletCards,
} from 'lucide-react'
import type { AccountApplication, AccountMutationAction, AccountPerson, AccountView, AccountWorkspace } from '@/lib/account/types'
import { withCsrfHeaders } from '@/lib/security/csrfClient'

export type { AccountView }

type UserRow = {
  id: string
  name: string
  role: string
  username: string
  email: string
  phone: string
  manager: string
  office: string
  joined: string
  joinedAt: string
  color: string
  status: string
  owner?: boolean
  online?: boolean
}

type AccountPageContentProps = {
  view: AccountView
  initialWorkspace: AccountWorkspace
}

type Notify = (message: string) => void

type SetupEmailDelivery = {
  sent?: boolean
  provider?: string
  setupUrl?: string
  warning?: string
}

const sectionMeta: Record<AccountView, { title: string; subtitle?: string; icon: ComponentType<{ size?: number }> }> = {
  'my-account': { title: 'My account', subtitle: 'Personal profile, preferences, and account identity', icon: UserRound },
  'account-security': { title: 'Account security', subtitle: 'Security overview, sessions, and trusted devices', icon: ShieldCheck },
  applications: { title: 'Applications', subtitle: 'Subscribed apps and account-level app access', icon: Grid3X3 },
  users: { title: 'Company users', subtitle: 'Active people with access to this company', icon: UsersRound },
  guests: { title: 'Guest accounts', subtitle: 'External collaborators and temporary access', icon: UsersRound },
  'user-groups': { title: 'User groups', subtitle: 'Teams, membership groups, and shared permissions', icon: UsersRound },
  'general-info': { title: 'Company information', subtitle: 'Company information, overview and preferences', icon: Building2 },
  offices: { title: 'Offices', subtitle: 'Company locations and office assignments', icon: Building2 },
  'admin-roles': { title: 'Admin roles', subtitle: 'Role assignments and administrative permissions', icon: ShieldCheck },
  customizations: { title: 'Customizations', subtitle: 'Branding, modules, fields, and account experience', icon: SlidersHorizontal },
  'system-settings': { title: 'System settings', subtitle: 'Default system preferences and controls', icon: Settings },
}

const iconMap: Record<string, ComponentType<{ size?: number }>> = {
  'badge-dollar': BadgeDollarSign,
  'book-open-check': BookOpenCheck,
  'book-open': BookOpen,
  'calendar': CalendarDays,
  'check-circle': CheckCircle2,
  'clipboard-check': ClipboardCheck,
  'clipboard-list': ClipboardList,
  'database-zap': DatabaseZap,
  'file-text': FileText,
  'folder': Folder,
  'folder-kanban': FolderKanban,
  'hand-coins': HandCoins,
  'layout-dashboard': LayoutDashboard,
  'shopping-cart': ShoppingCart,
  'wallet-cards': WalletCards,
  'warehouse': Warehouse,
  'building': Building2,
  'bell': Bell,
  'badge-check': BadgeCheck,
  'user': UserRound,
  'settings': Settings,
  'mail': Mail,
  'users': UsersRound,
  'shield': ShieldCheck,
  'bot': Bot,
}

const avatarPalette = ['#0f7f86', '#7357d8', '#2f855a', '#b7791f', '#2563eb', '#be185d', '#64748b']
const accountWorkspaceUpdatedEvent = 'wiseflow:account-workspace-updated'

function announceWorkspaceUpdate(workspace: AccountWorkspace) {
  window.dispatchEvent(new CustomEvent(accountWorkspaceUpdatedEvent, {
    detail: {
      viewerName: workspace.viewer.name,
      companyName: workspace.company.name,
    },
  }))
}

function stableColor(seed: string) {
  const total = seed.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0)
  return avatarPalette[total % avatarPalette.length]
}

function toUserRows(people: AccountPerson[]): UserRow[] {
  return people.map((person, index) => ({
    id: String(index + 1).padStart(2, '0'),
    name: person.name,
    role: person.role,
    username: person.username,
    email: person.email,
    phone: person.phone || 'Not provided',
    manager: person.manager || 'Unassigned',
    office: person.office || 'Unassigned',
    joined: formatShortDate(person.joinedAt),
    joinedAt: person.joinedAt,
    color: stableColor(person.id || person.email || person.name),
    status: person.status,
    owner: person.owner,
    online: person.online,
  }))
}

function formatShortDate(value: string) {
  const date = value.includes('T') ? new Date(value) : new Date(`${value}T00:00:00`)
  if (Number.isNaN(date.getTime())) return value
  return `${String(date.getDate()).padStart(2, '0')}-${String(date.getMonth() + 1).padStart(2, '0')}-${date.getFullYear()}`
}

function timeValue(value: string) {
  const date = value.includes('T') ? new Date(value) : new Date(`${value}T00:00:00`)
  return Number.isNaN(date.getTime()) ? 0 : date.getTime()
}

function companyPath(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '').slice(0, 28) || 'company'
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map(part => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || 'LC'
}

export default function AccountPageContent({ view, initialWorkspace }: AccountPageContentProps) {
  const [workspace, setWorkspace] = useState(initialWorkspace)
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')
  const [busyAction, setBusyAction] = useState<AccountMutationAction | ''>('')

  const mutate = async (action: AccountMutationAction, data: Record<string, unknown> = {}) => {
    setBusyAction(action)
    setError('')
    setNotice('')
    try {
      const response = await fetch(`/api/account/workspace?companyId=${encodeURIComponent(workspace.company.id)}`, {
        method: 'POST',
        headers: withCsrfHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ action, data }),
      })
      const payload = await response.json().catch(() => null) as { ok?: boolean; workspace?: AccountWorkspace; error?: string; emailDelivery?: SetupEmailDelivery } | null
      if (!response.ok || !payload?.ok || !payload.workspace) {
        throw new Error(payload?.error || 'Could not save account changes.')
      }
      setWorkspace(payload.workspace)
      announceWorkspaceUpdate(payload.workspace)
      if (action === 'create-user') {
        const delivery = payload.emailDelivery
        if (delivery?.sent) {
          setNotice('User created and setup email sent.')
        } else if (delivery?.warning) {
          setNotice(`User created. ${delivery.warning}`)
        } else {
          setNotice('User created.')
        }
      } else {
        setNotice('Changes saved.')
      }
      return payload.workspace
    } catch (saveError) {
      const message = saveError instanceof Error ? saveError.message : 'Could not save account changes.'
      setError(message)
      throw saveError
    } finally {
      setBusyAction('')
    }
  }

  const notify: Notify = message => {
    setError('')
    setNotice(message)
  }

  const users = useMemo(() => toUserRows(workspace.users), [workspace.users])
  const guests = useMemo(() => toUserRows(workspace.guests), [workspace.guests])
  const companyName = workspace.company.name
  const activeUser = workspace.viewer.name
  const email = workspace.viewer.email

  return (
    <div className="account-page">
      <style>{accountPagesCss}</style>
      {(notice || error) && <div className={error ? 'account-toast error' : 'account-toast'}>{error || notice}</div>}
      {view === 'general-info' && <GeneralInfo workspace={workspace} mutate={mutate} busy={busyAction === 'update-company'} notify={notify} />}
      {view === 'account-security' && <AccountSecurity workspace={workspace} mutate={mutate} activeUser={activeUser} notify={notify} />}
      {view === 'users' && <UsersPage users={users} mutate={mutate} canManage={workspace.viewer.canManageAccount} busy={busyAction === 'create-user'} notify={notify} />}
      {view === 'guests' && <GuestsPage users={guests} mutate={mutate} canManage={workspace.viewer.canManageAccount} busy={busyAction === 'create-guest'} notify={notify} />}
      {view === 'user-groups' && <UserGroupsPage workspace={workspace} users={users} mutate={mutate} canManage={workspace.viewer.canManageAccount} notify={notify} />}
      {view === 'applications' && <ApplicationsPage workspace={workspace} mutate={mutate} canManage={workspace.viewer.canManageAccount} notify={notify} />}
      {view === 'my-account' && <MyAccountPage workspace={workspace} mutate={mutate} activeUser={activeUser} email={email} companyName={companyName} busy={busyAction === 'update-profile'} />}
      {view === 'offices' && <OfficesPage workspace={workspace} mutate={mutate} canManage={workspace.viewer.canManageAccount} busy={busyAction === 'create-office'} notify={notify} />}
      {view === 'admin-roles' && <AdminRolesPage workspace={workspace} users={users} mutate={mutate} canManage={workspace.viewer.canManageAccount} busy={busyAction === 'create-role'} notify={notify} />}
      {view === 'customizations' && <CustomizationsPage workspace={workspace} mutate={mutate} busy={busyAction === 'update-customizations'} notify={notify} />}
      {view === 'system-settings' && <SystemSettingsPage workspace={workspace} mutate={mutate} busy={busyAction === 'update-system-settings'} />}
    </div>
  )
}

function PageHeader({
  view,
  title,
  subtitle,
  children,
  tabs,
  activeTab,
  onTabChange,
}: {
  view: AccountView
  title?: string
  subtitle?: string
  children?: ReactNode
  tabs?: string[]
  activeTab?: string
  onTabChange?: (tab: string) => void
}) {
  const meta = sectionMeta[view]
  const Icon = meta.icon
  return (
    <header className="account-page-header">
      <div className="account-title-row">
        <span className="account-title-icon"><Icon size={25} /></span>
        <span>
          <h1>{title || meta.title}</h1>
          {(subtitle || meta.subtitle) && <p>{subtitle || meta.subtitle}</p>}
        </span>
      </div>
      {children && <div className="account-header-actions">{children}</div>}
      {tabs && (
        <nav className="account-section-tabs" aria-label={`${title || meta.title} tabs`}>
          {tabs.map((tab, index) => (
            <button
              key={tab}
              type="button"
              className={(activeTab ? activeTab === tab : index === 0) ? 'active' : undefined}
              onClick={() => onTabChange?.(tab)}
            >
              {tab}
            </button>
          ))}
        </nav>
      )}
    </header>
  )
}

function HeaderButton({
  children,
  primary = false,
  disabled = false,
  onClick,
  buttonType = 'button',
}: {
  children: ReactNode
  primary?: boolean
  disabled?: boolean
  onClick?: () => void
  buttonType?: 'button' | 'submit'
}) {
  return <button type={buttonType} disabled={disabled} onClick={onClick} className={primary ? 'account-button primary' : 'account-button'}>{children}</button>
}

function GeneralInfo({
  workspace,
  mutate,
  busy,
  notify,
}: {
  workspace: AccountWorkspace
  mutate: (action: AccountMutationAction, data?: Record<string, unknown>) => Promise<AccountWorkspace>
  busy: boolean
  notify: Notify
}) {
  const company = workspace.company
  const [form, setForm] = useState({
    name: company.name,
    type: company.type,
    introduction: company.introduction,
    address: company.address,
    phone: company.phone,
    website: company.website,
    userLimit: String(company.userLimit),
    timezone: company.settings.timezone,
    language: company.settings.language,
    dateFormat: company.settings.dateFormat,
  })
  const slug = company.path || companyPath(company.name)
  const createdAt = formatShortDate(company.createdAt)
  const updateField = (field: keyof typeof form, value: string) => setForm(current => ({ ...current, [field]: value }))
  const save = async () => {
    await mutate('update-company', { ...form, userLimit: Number(form.userLimit) })
  }

  return (
    <>
      <PageHeader view="general-info" title={company.name} subtitle="Company information, overview and preferences">
        <HeaderButton primary disabled={busy || !workspace.viewer.canManageAccount} onClick={save}>{busy ? 'Saving...' : 'Save changes'}</HeaderButton>
      </PageHeader>

      <div className="account-centered">
        <section className="account-card company-card">
          <CardHeader title="Company information" />
          <div className="account-info-grid">
            <InfoBlock label="Company name" value={<input className="account-input" value={form.name} onChange={event => updateField('name', event.target.value)} disabled={!workspace.viewer.canManageAccount} />} strong />
            <InfoBlock label="Company path" value={<><span className="green-text">{slug}</span> - https://{slug}.rework.com</>} />
            <InfoBlock label="Company status" value={<><span className="status-dot" /> {company.status}</>} />
            <InfoBlock label="Company introduction" value={<input className="account-input" value={form.introduction} placeholder="Not specified" onChange={event => updateField('introduction', event.target.value)} disabled={!workspace.viewer.canManageAccount} />} />
            <InfoBlock label="User limit" value={<input className="account-input" type="number" min="1" value={form.userLimit} onChange={event => updateField('userLimit', event.target.value)} disabled={!workspace.viewer.canManageAccount} />} />
            <InfoBlock label="Subscribed apps" value={`${workspace.applications.filter(app => app.enabled).length} apps`} />
          </div>
          <div className="account-info-grid separated">
            <InfoBlock label="Address" value={<input className="account-input" value={form.address} placeholder="Not specified" onChange={event => updateField('address', event.target.value)} disabled={!workspace.viewer.canManageAccount} />} />
            <InfoBlock label="Phone number" value={<input className="account-input" value={form.phone} placeholder="Not specified" onChange={event => updateField('phone', event.target.value)} disabled={!workspace.viewer.canManageAccount} />} />
            <InfoBlock label="Website" value={<input className="account-input" value={form.website} placeholder="Not specified" onChange={event => updateField('website', event.target.value)} disabled={!workspace.viewer.canManageAccount} />} />
            <InfoBlock label="Created date" value={createdAt} />
            <InfoBlock label="Default language" value={<input className="account-input" value={form.language} onChange={event => updateField('language', event.target.value)} disabled={!workspace.viewer.canManageAccount} />} />
            <InfoBlock label="Default timezone" value={<input className="account-input" value={form.timezone} onChange={event => updateField('timezone', event.target.value)} disabled={!workspace.viewer.canManageAccount} />} />
          </div>
        </section>

        <div className="account-two-col">
          <section className="account-card">
            <CardHeader title="System security" />
            <ActionList rows={[
              ['Config white-list IP ranges', 'Config system-wide IP ranges', KeyRound],
              ['Config SAML single sign-on', 'Config credentials for system-wide SAML SSO', ShieldCheck],
              ['Config account data privacy', "How users' emails, phones and addresses are shared internally", ShieldCheck],
              ['System security center', '', ShieldCheck],
            ]} onSelect={title => notify(`${title} is managed from Account security and system settings.`)} />
          </section>

          <section className="account-card">
            <CardHeader title="Security tools and logs" />
            <ActionList rows={[
              ['System audit logs', "View and search system's audit logs", FileText],
              ['System login logs', 'View and search login logs', ShieldCheck],
              ['Password enhancement tool', 'Detect weak passwords and other password tools', KeyRound],
              ['Temporary account lock', '', UserRound],
            ]} onSelect={title => notify(`${title} is connected to the account audit and security workflow.`)} />
          </section>
        </div>

        <section className="account-card">
          <CardHeader title="Subscribed applications" />
          <ApplicationsGrid apps={workspace.applications} compact />
        </section>

        <section className="account-card small-section">
          <CardHeader title="System owners" />
          {workspace.users.filter(user => user.owner).length ? (
            <AvatarStack users={toUserRows(workspace.users.filter(user => user.owner))} />
          ) : (
            <div className="empty-line"><UsersRound size={15} /> No assigned owners</div>
          )}
        </section>

        <section className="account-card small-section">
          <CardHeader title="System preferences" />
          <div className="settings-grid">
            <SettingTile icon={MapPin} title="Locale" detail={`${workspace.systemSettings.language} / ${workspace.systemSettings.timezone}`} />
            <SettingTile icon={ShieldCheck} title="Security" detail={workspace.systemSettings.requireTwoFactor ? 'Two-factor required' : 'Two-factor optional'} />
          </div>
        </section>
      </div>
    </>
  )
}

function AccountSecurity({
  workspace,
  mutate,
  activeUser,
  notify,
}: {
  workspace: AccountWorkspace
  mutate: (action: AccountMutationAction, data?: Record<string, unknown>) => Promise<AccountWorkspace>
  activeUser: string
  notify: Notify
}) {
  const twoFactorEnabled = workspace.security.twoFactorEnabled
  const [tab, setTab] = useState('Security Overview')
  return (
    <>
      <PageHeader view="account-security" tabs={['Security Overview', 'Login Sessions', 'Devices']} activeTab={tab} onTabChange={setTab}>
        <HeaderButton onClick={() => void mutate('set-two-factor', { enabled: !twoFactorEnabled })}>
          {twoFactorEnabled ? 'Disable 2FA' : 'Enable 2FA'}
        </HeaderButton>
      </PageHeader>
      <div className="account-centered">
        {tab === 'Security Overview' && (
          <section className="account-card security-card">
            <CardHeader title="Two-factor authentication" />
            <div className="two-factor-panel">
              <span className="shield-alert"><ShieldCheck size={27} /></span>
              <div>
                <h2>Two-factor authentication is currently {twoFactorEnabled ? 'enabled' : 'disabled'}</h2>
                <p>{twoFactorEnabled ? 'Extra verification is required for this account.' : 'Enable it to improve account protection.'}</p>
                <p className="danger-copy">Two-factor authentication adds an extra layer of security during login and is stored as an account security setting.</p>
                <div className="inline-actions">
                  <HeaderButton primary onClick={() => void mutate('set-two-factor', { enabled: !twoFactorEnabled })}>{twoFactorEnabled ? 'Deactivate' : 'Activate now'}</HeaderButton>
                  <HeaderButton onClick={() => notify('Two-factor authentication requires a second verification step after password login.')}>
                    <HelpIcon /> Learn about two-factor authentication
                  </HeaderButton>
                </div>
              </div>
            </div>
          </section>
        )}

        {tab === 'Login Sessions' && (
          <section className="account-card">
            <CardHeader title="Login activities" />
            <LoginSessionsTable workspace={workspace} mutate={mutate} activeUser={activeUser} />
          </section>
        )}

        {tab === 'Devices' && (
          <section className="account-card">
            <CardHeader title="Trusted devices" />
            {workspace.security.sessions.length ? (
              <div className="settings-grid">
                {workspace.security.sessions.map(session => (
                  <SettingTile
                    key={session.id}
                    icon={ShieldCheck}
                    title={session.device}
                    detail={`${session.status} session via ${session.method} from ${session.ip || 'unknown IP'}.`}
                  />
                ))}
              </div>
            ) : (
              <div className="empty-state"><ShieldCheck size={34} /> No trusted devices recorded</div>
            )}
          </section>
        )}
      </div>
    </>
  )
}

function filterPeopleRows(rows: UserRow[], query: string, tab: string) {
  const needle = query.trim().toLowerCase()
  return rows.filter(row => {
    const matchesQuery = !needle || [row.name, row.role, row.username, row.email, row.office].some(value => value.toLowerCase().includes(needle))
    const matchesTab =
      tab === 'Active' ? row.status === 'Active'
        : tab === 'Owners' ? row.owner
          : tab === 'Account Admins' ? /admin|owner/i.test(row.role)
            : tab === 'Online' ? row.online
              : tab === 'Pending' ? row.status === 'Pending'
              : tab === 'Deactivated' ? row.status === 'Deactivated'
                : true
    return matchesQuery && matchesTab
  })
}

function CreatePersonPanel({
  mode,
  mutate,
  busy,
  onDone,
}: {
  mode: 'member' | 'guest'
  mutate: (action: AccountMutationAction, data?: Record<string, unknown>) => Promise<AccountWorkspace>
  busy: boolean
  onDone: () => void
}) {
  const [form, setForm] = useState({ name: '', email: '', role: mode === 'guest' ? 'Guest' : 'Member', phone: '', office: '' })
  const updateField = (field: keyof typeof form, value: string) => setForm(current => ({ ...current, [field]: value }))
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    await mutate(mode === 'guest' ? 'create-guest' : 'create-user', form)
    setForm({ name: '', email: '', role: mode === 'guest' ? 'Guest' : 'Member', phone: '', office: '' })
    onDone()
  }

  return (
    <form className="account-inline-form" onSubmit={submit}>
      <input className="account-input" required placeholder="Full name" value={form.name} onChange={event => updateField('name', event.target.value)} />
      <input className="account-input" required type="email" placeholder="Email address" value={form.email} onChange={event => updateField('email', event.target.value)} />
      <input className="account-input" placeholder="Role" value={form.role} onChange={event => updateField('role', event.target.value)} />
      <input className="account-input" placeholder="Phone" value={form.phone} onChange={event => updateField('phone', event.target.value)} />
      <input className="account-input" placeholder="Office" value={form.office} onChange={event => updateField('office', event.target.value)} />
      <HeaderButton primary buttonType="submit" disabled={busy}>{busy ? 'Creating...' : mode === 'guest' ? 'Create guest' : 'Create & send setup email'}</HeaderButton>
    </form>
  )
}

function UsersPage({
  users,
  mutate,
  canManage,
  busy,
  notify,
}: {
  users: UserRow[]
  mutate: (action: AccountMutationAction, data?: Record<string, unknown>) => Promise<AccountWorkspace>
  canManage: boolean
  busy: boolean
  notify: Notify
}) {
  const [query, setQuery] = useState('')
  const [tab, setTab] = useState('Active')
  const [creating, setCreating] = useState(false)
  const [sortNewest, setSortNewest] = useState(true)
  const [selected, setSelected] = useState<string[]>([])
  const [bulkOpen, setBulkOpen] = useState(false)
  const visibleUsers = useMemo(() => {
    const filtered = filterPeopleRows(users, query, tab)
    return [...filtered].sort((a, b) => sortNewest ? timeValue(b.joinedAt) - timeValue(a.joinedAt) : timeValue(a.joinedAt) - timeValue(b.joinedAt))
  }, [users, query, tab, sortNewest])
  const visibleIds = visibleUsers.map(user => user.email)
  const allVisibleSelected = Boolean(visibleIds.length) && visibleIds.every(id => selected.includes(id))
  const toggleAllVisible = () => setSelected(current => allVisibleSelected ? current.filter(id => !visibleIds.includes(id)) : Array.from(new Set([...current, ...visibleIds])))
  const toggleSelected = (id: string) => setSelected(current => current.includes(id) ? current.filter(item => item !== id) : [...current, id])

  return (
    <>
      <PageHeader view="users" tabs={['Active', 'Pending', 'Owners', 'Account Admins', 'Online', 'Deactivated']} activeTab={tab} onTabChange={setTab}>
        <label className="account-filter"><input placeholder="Filter users" aria-label="Filter users" value={query} onChange={event => setQuery(event.target.value)} /><Search size={15} /></label>
        <HeaderButton onClick={() => setSortNewest(current => !current)}><SlidersHorizontal size={14} /> Sort: {sortNewest ? 'Latest' : 'Oldest'} <ChevronDown size={14} /></HeaderButton>
        <HeaderButton onClick={() => {
          setBulkOpen(current => !current)
          notify(selected.length ? `${selected.length} user${selected.length === 1 ? '' : 's'} selected.` : 'Select one or more users to run bulk actions.')
        }}>Action <ChevronDown size={14} /></HeaderButton>
        <HeaderButton primary disabled={!canManage} onClick={() => setCreating(current => !current)}>{creating ? 'Close' : 'Create'}</HeaderButton>
      </PageHeader>
      {bulkOpen && (
        <InlinePanel>
          <strong>{selected.length ? `${selected.length} selected` : 'No users selected'}</strong>
          <button type="button" onClick={toggleAllVisible}>{allVisibleSelected ? 'Clear visible users' : 'Select visible users'}</button>
          <button type="button" onClick={() => notify(selected.length ? 'Selected users are ready for a permission review.' : 'Select users before starting a permission review.')}>Review permissions</button>
          <button type="button" onClick={() => setSelected([])}>Clear selection</button>
        </InlinePanel>
      )}
      {creating && <div className="account-centered"><section className="account-card"><CardHeader title="Create user" /><CreatePersonPanel mode="member" mutate={mutate} busy={busy} onDone={() => {
        setCreating(false)
        setTab('Pending')
      }} /></section></div>}
      {visibleUsers.length ? <UsersTable users={visibleUsers} selectedIds={selected} allVisibleSelected={allVisibleSelected} onToggleAll={toggleAllVisible} onToggleUser={toggleSelected} onRowAction={user => notify(`Opened actions for ${user.name}.`)} /> : <EmptyAccountTable headers={['#', 'Full name', 'Username', 'Contact information', 'Direct managers', 'Office', 'Joined']} />}
    </>
  )
}

function GuestsPage({
  users,
  mutate,
  canManage,
  busy,
  notify,
}: {
  users: UserRow[]
  mutate: (action: AccountMutationAction, data?: Record<string, unknown>) => Promise<AccountWorkspace>
  canManage: boolean
  busy: boolean
  notify: Notify
}) {
  const [query, setQuery] = useState('')
  const [tab, setTab] = useState('Active')
  const [creating, setCreating] = useState(false)
  const [selected, setSelected] = useState<string[]>([])
  const [bulkOpen, setBulkOpen] = useState(false)
  const visibleUsers = useMemo(() => filterPeopleRows(users, query, tab), [users, query, tab])
  const visibleIds = visibleUsers.map(user => user.email)
  const allVisibleSelected = Boolean(visibleIds.length) && visibleIds.every(id => selected.includes(id))
  const toggleAllVisible = () => setSelected(current => allVisibleSelected ? current.filter(id => !visibleIds.includes(id)) : Array.from(new Set([...current, ...visibleIds])))
  const toggleSelected = (id: string) => setSelected(current => current.includes(id) ? current.filter(item => item !== id) : [...current, id])

  return (
    <>
      <PageHeader view="guests" tabs={['Active', 'Pending', 'Online', 'Deactivated']} activeTab={tab} onTabChange={setTab}>
        <label className="account-filter"><input placeholder="Filter users" aria-label="Filter guest users" value={query} onChange={event => setQuery(event.target.value)} /><Search size={15} /></label>
        <HeaderButton onClick={() => {
          setBulkOpen(current => !current)
          notify(selected.length ? `${selected.length} guest${selected.length === 1 ? '' : 's'} selected.` : 'Select one or more guests to run bulk actions.')
        }}>Action <ChevronDown size={14} /></HeaderButton>
        <HeaderButton primary disabled={!canManage} onClick={() => setCreating(current => !current)}>{creating ? 'Close' : 'Create'}</HeaderButton>
      </PageHeader>
      {bulkOpen && (
        <InlinePanel>
          <strong>{selected.length ? `${selected.length} selected` : 'No guests selected'}</strong>
          <button type="button" onClick={toggleAllVisible}>{allVisibleSelected ? 'Clear visible guests' : 'Select visible guests'}</button>
          <button type="button" onClick={() => notify(selected.length ? 'Selected guest access is ready for review.' : 'Select guests before reviewing access.')}>Review access</button>
          <button type="button" onClick={() => setSelected([])}>Clear selection</button>
        </InlinePanel>
      )}
      {creating && <div className="account-centered"><section className="account-card"><CardHeader title="Create guest" /><CreatePersonPanel mode="guest" mutate={mutate} busy={busy} onDone={() => {
        setCreating(false)
        setTab('Pending')
      }} /></section></div>}
      {visibleUsers.length ? <UsersTable users={visibleUsers} selectedIds={selected} allVisibleSelected={allVisibleSelected} onToggleAll={toggleAllVisible} onToggleUser={toggleSelected} onRowAction={user => notify(`Opened actions for ${user.name}.`)} /> : <EmptyAccountTable headers={['#', 'Full name', 'Username', 'Contact information', 'Direct managers', 'Office', 'Joined']} />}
    </>
  )
}

function UserGroupsPage({
  workspace,
  users,
  mutate,
  canManage,
  notify,
}: {
  workspace: AccountWorkspace
  users: UserRow[]
  mutate: (action: AccountMutationAction, data?: Record<string, unknown>) => Promise<AccountWorkspace>
  canManage: boolean
  notify: Notify
}) {
  const [query, setQuery] = useState('')
  const [tab, setTab] = useState('Active')
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState({ name: '', description: '' })
  const visibleGroups = workspace.groups.filter(group => {
    const matchesQuery = !query || [group.name, group.description].some(value => value.toLowerCase().includes(query.toLowerCase()))
    const matchesTab = tab === 'Active' ? group.status === 'Active' : tab === 'Disabled' ? group.status === 'Deactivated' : true
    return matchesQuery && matchesTab
  })
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    await mutate('create-group', { ...form, memberIds: workspace.users.map(user => user.id) })
    setForm({ name: '', description: '' })
    setCreating(false)
  }

  return (
    <>
      <PageHeader view="user-groups" tabs={['Active', 'Joined', 'Disabled']} activeTab={tab} onTabChange={setTab}>
        <label className="account-filter"><input placeholder="Quick filter" aria-label="Quick filter groups" value={query} onChange={event => setQuery(event.target.value)} /><Search size={15} /></label>
        <HeaderButton primary disabled={!canManage} onClick={() => setCreating(current => !current)}>{creating ? 'Close' : 'Create group'}</HeaderButton>
      </PageHeader>
      {creating && (
        <div className="account-centered">
          <section className="account-card">
            <CardHeader title="Create group" />
            <form className="account-inline-form" onSubmit={submit}>
              <input className="account-input" required placeholder="Group name" value={form.name} onChange={event => setForm(current => ({ ...current, name: event.target.value }))} />
              <input className="account-input" placeholder="Description" value={form.description} onChange={event => setForm(current => ({ ...current, description: event.target.value }))} />
              <HeaderButton primary buttonType="submit">Create group</HeaderButton>
            </form>
          </section>
        </div>
      )}
      <div className="account-table-wrap full">
        <table className="account-table groups-table">
          <thead>
          <tr>
            <th>Group name</th>
            <th>Group members</th>
            <th>Group owners</th>
            <th>Created at</th>
            <th>Created by</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {visibleGroups.map(group => {
            const groupUsers = users.filter(user => group.memberIds.includes(workspace.users.find(raw => raw.email === user.email)?.id || ''))
            return (
              <tr key={group.id}>
                <td data-label="Group name"><GroupName name={group.name} description={group.description} users={group.memberIds.length} /></td>
                <td data-label="Group members"><span className="green-text">{group.memberIds.length} members</span></td>
                <td data-label="Group owners"><AvatarStack users={groupUsers.length ? groupUsers : users.filter(user => user.owner)} /></td>
                <td data-label="Created at"><strong>{formatShortDate(group.createdAt)}</strong><small>{new Date(group.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</small></td>
                <td data-label="Created by"><Avatar name={workspace.viewer.name} color={stableColor(workspace.viewer.id)} /></td>
                <td data-label="Actions"><RowActionButton label={`Manage ${group.name}`} onClick={() => notify(`Opened actions for ${group.name}.`)} /></td>
              </tr>
            )
          })}
            {!visibleGroups.length && (
              <tr><td colSpan={6}><div className="empty-state"><UsersRound size={34} /> No groups found</div></td></tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  )
}

function ApplicationsPage({
  workspace,
  mutate,
  canManage,
  notify,
}: {
  workspace: AccountWorkspace
  mutate: (action: AccountMutationAction, data?: Record<string, unknown>) => Promise<AccountWorkspace>
  canManage: boolean
  notify: Notify
}) {
  const [showSubscriptions, setShowSubscriptions] = useState(false)
  const [showCatalog, setShowCatalog] = useState(false)
  return (
    <>
      <PageHeader view="applications">
        <HeaderButton onClick={() => setShowSubscriptions(current => !current)}>Manage subscriptions</HeaderButton>
        <HeaderButton primary disabled={!canManage} onClick={() => {
          setShowCatalog(current => !current)
          notify('Application catalog opened.')
        }}><Plus size={14} /> Add app</HeaderButton>
      </PageHeader>
      <div className="account-centered">
        {showSubscriptions && (
          <section className="account-card">
            <CardHeader title="Subscription summary" />
            <div className="settings-grid">
              <SettingTile icon={WalletCards} title="Subscribed applications" detail={`${workspace.applications.length} apps are in the account catalog.`} />
              <SettingTile icon={CheckCircle2} title="Enabled applications" detail={`${workspace.applications.filter(app => app.enabled).length} apps are currently enabled.`} />
              <SettingTile icon={ShieldCheck} title="Restricted applications" detail={`${workspace.applications.filter(app => app.restricted).length} apps require explicit access.`} />
            </div>
          </section>
        )}
        {showCatalog && (
          <section className="account-card">
            <CardHeader title="Application catalog" />
            <ActionList
              rows={workspace.applications.map(app => [app.name, `${app.plan} plan, ${app.enabled ? 'enabled' : 'disabled'}`, iconMap[app.icon] || Grid3X3] as [string, string, ComponentType<{ size?: number }>])}
              onSelect={title => notify(`${title} is already available in this account catalog.`)}
            />
          </section>
        )}
        <section className="account-card">
          <CardHeader title={`${workspace.company.name} subscribed applications`} />
          <ApplicationsGrid apps={workspace.applications} canManage={canManage} mutate={mutate} />
        </section>
        <section className="account-card">
          <CardHeader title="Application access defaults" />
          <div className="settings-grid">
            <SettingTile icon={UsersRound} title="Default app visibility" detail={`${workspace.applications.filter(app => app.visibleByDefault).length} apps are visible for new users.`} />
            <SettingTile icon={ShieldCheck} title="Restricted apps" detail={`${workspace.applications.filter(app => app.restricted).length} apps require assigned access.`} />
            <SettingTile icon={Bell} title="Enabled apps" detail={`${workspace.applications.filter(app => app.enabled).length} apps are enabled for the workspace.`} />
          </div>
        </section>
      </div>
    </>
  )
}

function MyAccountPage({
  workspace,
  mutate,
  activeUser,
  email,
  companyName,
  busy,
}: {
  workspace: AccountWorkspace
  mutate: (action: AccountMutationAction, data?: Record<string, unknown>) => Promise<AccountWorkspace>
  activeUser: string
  email: string
  companyName: string
  busy: boolean
}) {
  const currentUser = workspace.users.find(user => user.id === workspace.viewer.id || user.email === workspace.viewer.email)
  const [form, setForm] = useState({
    name: activeUser,
    email,
    phone: currentUser?.phone || '',
    office: currentUser?.office || '',
  })
  const updateField = (field: keyof typeof form, value: string) => setForm(current => ({ ...current, [field]: value }))

  return (
    <>
      <PageHeader view="my-account">
        <HeaderButton primary disabled={busy} onClick={() => mutate('update-profile', form)}>{busy ? 'Saving...' : 'Save changes'}</HeaderButton>
      </PageHeader>
      <div className="account-centered">
        <section className="account-card profile-card">
          <span className="large-avatar">{initials(form.name).slice(0, 1)}</span>
          <div>
            <h2>{form.name}</h2>
            <p>{companyName}</p>
            <div className="profile-facts">
              <InfoBlock label="Name" value={<input className="account-input" value={form.name} onChange={event => updateField('name', event.target.value)} />} />
              <InfoBlock label="Email" value={<input className="account-input" type="email" value={form.email} onChange={event => updateField('email', event.target.value)} />} />
              <InfoBlock label="Phone" value={<input className="account-input" value={form.phone} placeholder="Not provided" onChange={event => updateField('phone', event.target.value)} />} />
              <InfoBlock label="Office" value={<input className="account-input" value={form.office} placeholder="Unassigned" onChange={event => updateField('office', event.target.value)} />} />
              <InfoBlock label="Role" value={workspace.viewer.role} />
              <InfoBlock label="Timezone" value={workspace.systemSettings.timezone} />
            </div>
          </div>
        </section>
        <section className="account-card">
          <CardHeader title="Personal settings" />
          <div className="settings-grid">
            <SettingTile icon={UserRound} title="Profile information" detail="Name, contact information, and account identity." />
            <SettingTile icon={Bell} title="Notification preferences" detail="Email, desktop, and product notification defaults." />
            <SettingTile icon={KeyRound} title="Password and login" detail="Password reset, login alerts, and trusted devices." />
          </div>
        </section>
      </div>
    </>
  )
}

function OfficesPage({
  workspace,
  mutate,
  canManage,
  busy,
  notify,
}: {
  workspace: AccountWorkspace
  mutate: (action: AccountMutationAction, data?: Record<string, unknown>) => Promise<AccountWorkspace>
  canManage: boolean
  busy: boolean
  notify: Notify
}) {
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState({ name: '', detail: '', location: '' })
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    await mutate('create-office', form)
    setForm({ name: '', detail: '', location: '' })
    setCreating(false)
  }

  return (
    <>
      <PageHeader view="offices">
        <HeaderButton primary disabled={!canManage} onClick={() => setCreating(current => !current)}><Plus size={14} /> {creating ? 'Close' : 'Create office'}</HeaderButton>
      </PageHeader>
      <div className="account-centered">
        {creating && (
          <section className="account-card">
            <CardHeader title="Create office" />
            <form className="account-inline-form" onSubmit={submit}>
              <input className="account-input" required placeholder="Office name" value={form.name} onChange={event => setForm(current => ({ ...current, name: event.target.value }))} />
              <input className="account-input" placeholder="Purpose" value={form.detail} onChange={event => setForm(current => ({ ...current, detail: event.target.value }))} />
              <input className="account-input" placeholder="Location" value={form.location} onChange={event => setForm(current => ({ ...current, location: event.target.value }))} />
              <HeaderButton primary buttonType="submit" disabled={busy}>{busy ? 'Creating...' : 'Create office'}</HeaderButton>
            </form>
          </section>
        )}
        <section className="account-card">
          <CardHeader title="Office directory" />
          {workspace.offices.length ? (
            <div className="office-list">
              {workspace.offices.map(office => (
                <OfficeRow
                  key={office.id}
                  title={office.name}
                  detail={office.detail || office.status}
                  location={office.location || 'Not specified'}
                  people={`${office.userIds.length} users`}
                  onAction={() => notify(`Opened actions for ${office.name}.`)}
                />
              ))}
            </div>
          ) : (
            <div className="empty-state"><Building2 size={34} /> No offices found</div>
          )}
        </section>
      </div>
    </>
  )
}

function AdminRolesPage({
  workspace,
  users,
  mutate,
  canManage,
  busy,
  notify,
}: {
  workspace: AccountWorkspace
  users: UserRow[]
  mutate: (action: AccountMutationAction, data?: Record<string, unknown>) => Promise<AccountWorkspace>
  canManage: boolean
  busy: boolean
  notify: Notify
}) {
  const [creating, setCreating] = useState(false)
  const [showAudit, setShowAudit] = useState(false)
  const [form, setForm] = useState({ name: '', description: '', permissions: 'settings,members' })
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    await mutate('create-role', {
      ...form,
      permissions: form.permissions.split(',').map(permission => permission.trim()).filter(Boolean),
    })
    setForm({ name: '', description: '', permissions: 'settings,members' })
    setCreating(false)
  }

  return (
    <>
      <PageHeader view="admin-roles">
        <HeaderButton onClick={() => setShowAudit(current => !current)}>Audit role changes</HeaderButton>
        <HeaderButton primary disabled={!canManage} onClick={() => setCreating(current => !current)}><UserPlus size={14} /> {creating ? 'Close' : 'Create role'}</HeaderButton>
      </PageHeader>
      <div className="account-centered">
        {showAudit && (
          <section className="account-card">
            <CardHeader title="Role audit overview" />
            <div className="settings-grid">
              <SettingTile icon={ShieldCheck} title="Roles tracked" detail={`${workspace.adminRoles.length} administrative roles are audited.`} />
              <SettingTile icon={UsersRound} title="Administrators" detail={`${users.filter(user => /admin|owner/i.test(user.role)).length} users currently match admin-level roles.`} />
              <SettingTile icon={FileText} title="Audit destination" detail="Role changes are written through the account workspace audit flow." />
            </div>
          </section>
        )}
        {creating && (
          <section className="account-card">
            <CardHeader title="Create admin role" />
            <form className="account-inline-form" onSubmit={submit}>
              <input className="account-input" required placeholder="Role name" value={form.name} onChange={event => setForm(current => ({ ...current, name: event.target.value }))} />
              <input className="account-input" placeholder="Description" value={form.description} onChange={event => setForm(current => ({ ...current, description: event.target.value }))} />
              <input className="account-input" placeholder="Permissions, comma-separated" value={form.permissions} onChange={event => setForm(current => ({ ...current, permissions: event.target.value }))} />
              <HeaderButton primary buttonType="submit" disabled={busy}>{busy ? 'Creating...' : 'Create role'}</HeaderButton>
            </form>
          </section>
        )}
        <section className="account-card">
          <CardHeader title="Administrative roles" />
          <div className="role-grid">
            {workspace.adminRoles.map(role => (
              <div key={role.id} className="role-card">
                <span><ShieldCheck size={18} /></span>
                <strong>{role.name}</strong>
                <p>{role.description}</p>
                <small>{role.userIds.length || users.filter(user => role.name === 'System owner' && user.owner).length} assigned</small>
                <button type="button" className="role-action" onClick={() => notify(`Opened actions for ${role.name}.`)}>Manage role</button>
              </div>
            ))}
          </div>
        </section>
      </div>
    </>
  )
}

function CustomizationsPage({
  workspace,
  mutate,
  busy,
  notify,
}: {
  workspace: AccountWorkspace
  mutate: (action: AccountMutationAction, data?: Record<string, unknown>) => Promise<AccountWorkspace>
  busy: boolean
  notify: Notify
}) {
  const [form, setForm] = useState({
    brandColor: workspace.customizations.brandColor,
    logoUrl: workspace.customizations.logoUrl,
    profileFields: workspace.customizations.profileFields.join(', '),
  })
  const save = () => mutate('update-customizations', {
    brandColor: form.brandColor,
    logoUrl: form.logoUrl,
    profileFields: form.profileFields.split(',').map(field => field.trim()).filter(Boolean),
    moduleVisibility: workspace.customizations.moduleVisibility,
  })

  return (
    <>
      <PageHeader view="customizations">
        <HeaderButton primary disabled={busy} onClick={save}>{busy ? 'Saving...' : 'Save customizations'}</HeaderButton>
      </PageHeader>
      <div className="account-centered">
        <section className="account-card">
          <CardHeader title="Branding" />
          <div className="profile-facts">
            <InfoBlock label="Brand color" value={<input className="account-input" value={form.brandColor} onChange={event => setForm(current => ({ ...current, brandColor: event.target.value }))} />} />
            <InfoBlock label="Logo URL" value={<input className="account-input" value={form.logoUrl} placeholder="Not configured" onChange={event => setForm(current => ({ ...current, logoUrl: event.target.value }))} />} />
            <InfoBlock label="Profile fields" value={<input className="account-input" value={form.profileFields} onChange={event => setForm(current => ({ ...current, profileFields: event.target.value }))} />} />
          </div>
        </section>
        <section className="account-card">
          <CardHeader title="Customization areas" />
          <ActionList rows={[
            ['Branding', 'Logo, colors, company labels, and identity settings', BadgeCheck],
            ['Fields and layouts', 'Account fields, user profile sections, and table defaults', SlidersHorizontal],
            ['Automation templates', 'Reusable account workflows and approval defaults', ClipboardList],
            ['Module visibility', 'Choose which applications appear for users and guests', Grid3X3],
          ]} onSelect={title => notify(`${title} customization controls are available in this account workspace.`)} />
        </section>
      </div>
    </>
  )
}

function SystemSettingsPage({
  workspace,
  mutate,
  busy,
}: {
  workspace: AccountWorkspace
  mutate: (action: AccountMutationAction, data?: Record<string, unknown>) => Promise<AccountWorkspace>
  busy: boolean
}) {
  const [form, setForm] = useState({
    timezone: workspace.systemSettings.timezone,
    language: workspace.systemSettings.language,
    dateFormat: workspace.systemSettings.dateFormat,
    sessionTimeoutMinutes: String(workspace.systemSettings.sessionTimeoutMinutes),
    passwordMinLength: String(workspace.systemSettings.passwordMinLength),
    requireTwoFactor: workspace.systemSettings.requireTwoFactor,
    invitationExpiryDays: String(workspace.systemSettings.invitationExpiryDays),
    guestAccessEnabled: workspace.systemSettings.guestAccessEnabled,
    emailSender: workspace.systemSettings.emailSender,
  })
  const updateField = (field: keyof typeof form, value: string | boolean) => setForm(current => ({ ...current, [field]: value }))
  const save = () => mutate('update-system-settings', {
    ...form,
    sessionTimeoutMinutes: Number(form.sessionTimeoutMinutes),
    passwordMinLength: Number(form.passwordMinLength),
    invitationExpiryDays: Number(form.invitationExpiryDays),
  })

  return (
    <>
      <PageHeader view="system-settings">
        <HeaderButton primary disabled={busy} onClick={save}>{busy ? 'Saving...' : 'Save settings'}</HeaderButton>
      </PageHeader>
      <div className="account-centered">
        <section className="account-card">
          <CardHeader title="System controls" />
          <div className="profile-facts">
            <InfoBlock label="Timezone" value={<input className="account-input" value={form.timezone} onChange={event => updateField('timezone', event.target.value)} />} />
            <InfoBlock label="Language" value={<input className="account-input" value={form.language} onChange={event => updateField('language', event.target.value)} />} />
            <InfoBlock label="Date format" value={<input className="account-input" value={form.dateFormat} onChange={event => updateField('dateFormat', event.target.value)} />} />
            <InfoBlock label="Session timeout minutes" value={<input className="account-input" type="number" min="15" value={form.sessionTimeoutMinutes} onChange={event => updateField('sessionTimeoutMinutes', event.target.value)} />} />
            <InfoBlock label="Password minimum length" value={<input className="account-input" type="number" min="8" value={form.passwordMinLength} onChange={event => updateField('passwordMinLength', event.target.value)} />} />
            <InfoBlock label="Invitation expiry days" value={<input className="account-input" type="number" min="1" value={form.invitationExpiryDays} onChange={event => updateField('invitationExpiryDays', event.target.value)} />} />
            <InfoBlock label="Email sender" value={<input className="account-input" value={form.emailSender} onChange={event => updateField('emailSender', event.target.value)} />} />
            <InfoBlock label="Require 2FA" value={<label className="account-check"><input type="checkbox" checked={form.requireTwoFactor} onChange={event => updateField('requireTwoFactor', event.target.checked)} /> Enabled</label>} />
            <InfoBlock label="Guest access" value={<label className="account-check"><input type="checkbox" checked={form.guestAccessEnabled} onChange={event => updateField('guestAccessEnabled', event.target.checked)} /> Enabled</label>} />
          </div>
        </section>
        <section className="account-card">
          <CardHeader title="System defaults" />
          <div className="settings-grid">
            <SettingTile icon={MapPin} title="Regional settings" detail={`${form.language}, ${form.timezone}, ${form.dateFormat}`} />
            <SettingTile icon={ShieldCheck} title="Security policy" detail={`${form.passwordMinLength} character passwords, ${form.sessionTimeoutMinutes} minute sessions.`} />
            <SettingTile icon={UsersRound} title="User lifecycle" detail={`${form.invitationExpiryDays} day invitations, guest access ${form.guestAccessEnabled ? 'enabled' : 'disabled'}.`} />
            <SettingTile icon={Mail} title="Email delivery" detail={form.emailSender || 'Sender identity not configured.'} />
          </div>
        </section>
      </div>
    </>
  )
}

function LoginSessionsTable({
  workspace,
  mutate,
  activeUser,
}: {
  workspace: AccountWorkspace
  mutate: (action: AccountMutationAction, data?: Record<string, unknown>) => Promise<AccountWorkspace>
  activeUser: string
}) {
  return (
    <div className="account-table-wrap">
      <table className="account-table security-table">
        <thead>
          <tr>
            <th>User</th>
            <th>Device & IP address</th>
            <th>Login</th>
            <th>Status</th>
            <th>Date</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {workspace.security.sessions.map(row => (
            <tr key={row.id}>
              <td data-label="User"><UserIdentity name={activeUser} role={workspace.viewer.role} color={stableColor(workspace.viewer.id)} /></td>
              <td data-label="Device & IP address"><span className="cell-strong">{row.device}</span><small>{row.ip || 'IP not recorded'}</small></td>
              <td data-label="Login"><span className="cell-strong">{row.method}</span><small>{row.id}</small></td>
              <td data-label="Status"><span className="active-pill">{row.status}</span></td>
              <td data-label="Date"><span>{formatShortDate(row.createdAt)}</span><small>{new Date(row.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</small></td>
              <td data-label="Action"><button type="button" className="logout-button" disabled={row.status === 'Revoked'} onClick={() => void mutate('revoke-session', { sessionId: row.id })}>Logout</button></td>
            </tr>
          ))}
          {!workspace.security.sessions.length && (
            <tr><td colSpan={6}><div className="empty-state"><ShieldCheck size={34} /> No login sessions recorded</div></td></tr>
          )}
        </tbody>
      </table>
    </div>
  )
}

function InlinePanel({ children }: { children: ReactNode }) {
  return <div className="account-inline-panel">{children}</div>
}

function RowActionButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button type="button" className="row-action-button" aria-label={label} onClick={onClick}>
      <MoreHorizontal size={16} />
    </button>
  )
}

function CardHeader({ title, action, onAction }: { title: string; action?: string; onAction?: () => void }) {
  return (
    <div className="card-header">
      <h2>{title}</h2>
      {action && <button type="button" onClick={onAction}>{action} <ChevronDown size={13} /></button>}
    </div>
  )
}

function InfoBlock({ label, value, strong = false }: { label: string; value: ReactNode; strong?: boolean }) {
  return (
    <div className="info-block">
      <span>{label}</span>
      <strong className={strong ? 'is-strong' : undefined}>{value}</strong>
    </div>
  )
}

function ActionList({ rows, onSelect }: { rows: Array<[string, string, ComponentType<{ size?: number }>]>, onSelect?: (title: string) => void }) {
  return (
    <div className="action-list">
      {rows.map(([title, detail, Icon]) => (
        <button key={title} type="button" className="action-row" onClick={() => onSelect?.(title)}>
          <Icon size={17} />
          <span>
            <strong>{title}</strong>
            {detail && <small>{detail}</small>}
          </span>
          <ChevronRight size={18} />
        </button>
      ))}
    </div>
  )
}

function ApplicationsGrid({
  apps,
  compact = false,
  canManage = false,
  mutate,
}: {
  apps: AccountApplication[]
  compact?: boolean
  canManage?: boolean
  mutate?: (action: AccountMutationAction, data?: Record<string, unknown>) => Promise<AccountWorkspace>
}) {
  return (
    <div className={compact ? 'apps-grid compact' : 'apps-grid'}>
      {apps.map(app => {
        const Icon = iconMap[app.icon] || Grid3X3
        return (
          <div key={app.id} className={`app-tile${app.enabled ? '' : ' disabled'}`}>
            <span className="app-crown">{app.plan}</span>
            <Icon size={27} />
            <strong>{app.name}</strong>
            <small>{app.detail}</small>
            {!compact && (
              <span className="app-toggles">
                <label><input type="checkbox" checked={app.enabled} disabled={!canManage || !mutate} onChange={event => mutate?.('update-application', { id: app.id, enabled: event.target.checked, restricted: app.restricted, visibleByDefault: app.visibleByDefault })} /> Enabled</label>
                <label><input type="checkbox" checked={app.restricted} disabled={!canManage || !mutate} onChange={event => mutate?.('update-application', { id: app.id, enabled: app.enabled, restricted: event.target.checked, visibleByDefault: app.visibleByDefault })} /> Restricted</label>
              </span>
            )}
          </div>
        )
      })}
    </div>
  )
}

function UsersTable({
  users,
  selectedIds = [],
  allVisibleSelected = false,
  onToggleAll,
  onToggleUser,
  onRowAction,
}: {
  users: UserRow[]
  selectedIds?: string[]
  allVisibleSelected?: boolean
  onToggleAll?: () => void
  onToggleUser?: (id: string) => void
  onRowAction?: (user: UserRow) => void
}) {
  return (
    <div className="account-table-wrap full">
      <table className="account-table users-table">
        <thead>
          <tr>
            <th>
              <label className="row-check">
                <input type="checkbox" checked={allVisibleSelected} onChange={() => onToggleAll?.()} />
                <span>#</span>
              </label>
            </th>
            <th>Full name</th>
            <th>Access</th>
            <th>Username</th>
            <th>Contact information</th>
            <th>Direct managers</th>
            <th>Office</th>
            <th>Joined</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {users.map(user => (
            <tr key={`${user.id}-${user.email}`}>
              <td data-label="#">
                <label className="row-check">
                  <input type="checkbox" checked={selectedIds.includes(user.email)} onChange={() => onToggleUser?.(user.email)} />
                  <span>{user.id}</span>
                </label>
              </td>
              <td data-label="Full name"><UserIdentity name={user.name} role={user.role} color={user.color} online={user.online} /></td>
              <td data-label="Access" className="muted-icon">{user.owner ? <span className="owner-mark">OWN</span> : null}{user.status === 'Pending' ? <span className="pending-mark">PENDING</span> : null}<ShieldCheck size={16} /></td>
              <td data-label="Username"><span className="cell-strong">@ {user.username}</span></td>
              <td data-label="Contact information"><span className="cell-line"><Mail size={14} /> {user.email}</span><small>{user.phone}</small></td>
              <td data-label="Direct managers"><span className="cell-link">{user.manager}</span></td>
              <td data-label="Office"><span className="cell-link">{user.office}</span></td>
              <td data-label="Joined"><strong>{user.joined}</strong></td>
              <td data-label="Actions"><RowActionButton label={`Open actions for ${user.name}`} onClick={() => onRowAction?.(user)} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function EmptyAccountTable({ headers }: { headers: string[] }) {
  return (
    <div className="account-table-wrap full empty-table-wrap">
      <table className="account-table">
        <thead>
          <tr>{headers.map(header => <th key={header}>{header}</th>)}</tr>
        </thead>
        <tbody>
          <tr><td colSpan={headers.length}><div className="empty-state"><UsersRound size={34} /> No records found</div></td></tr>
        </tbody>
      </table>
    </div>
  )
}

function UserIdentity({ name, role, color, online = false }: { name: string; role: string; color: string; online?: boolean }) {
  return (
    <span className="user-identity">
      <span className="avatar-wrap">
        <Avatar name={name} color={color} />
        {online && <span className="online-dot" />}
      </span>
      <span>
        <strong>{name}</strong>
        <small>{role}</small>
      </span>
    </span>
  )
}

function Avatar({ name, color }: { name: string; color: string }) {
  return <span className="avatar" style={{ background: color }}>{initials(name)}</span>
}

function AvatarStack({ users }: { users: UserRow[] }) {
  return (
    <span className="avatar-stack">
      {users.slice(0, 7).map(user => <Avatar key={user.id} name={user.name} color={user.color} />)}
    </span>
  )
}

function GroupName({ name, description, users }: { name: string; description: string; users: number }) {
  return (
    <span className="group-name-cell">
      <span>{initials(name)}</span>
      <span>
        <strong>{name}</strong>
        <small>{users} members&nbsp;&nbsp; {description || 'No description'}</small>
      </span>
    </span>
  )
}

function SettingTile({ icon: Icon, title, detail }: { icon: ComponentType<{ size?: number }>; title: string; detail: string }) {
  return (
    <div className="setting-tile">
      <span><Icon size={18} /></span>
      <strong>{title}</strong>
      <p>{detail}</p>
    </div>
  )
}

function OfficeRow({ title, detail, location, people, onAction }: { title: string; detail: string; location: string; people: string; onAction: () => void }) {
  return (
    <div className="office-row">
      <span><Building2 size={18} /></span>
      <div>
        <strong>{title}</strong>
        <small>{detail}</small>
      </div>
      <span>{location}</span>
      <span>{people}</span>
      <RowActionButton label={`Open actions for ${title}`} onClick={onAction} />
    </div>
  )
}

function HelpIcon() {
  return <span className="help-icon">?</span>
}

const accountPagesCss = `
.account-page {
  min-height: 100%;
  background: #f3f4f6;
  color: #050505;
}

.account-page-header {
  min-height: 72px;
  position: sticky;
  top: 0;
  z-index: 20;
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: 14px;
  padding: 0 28px;
  border-bottom: 1px solid #dfe2e5;
  background: #ffffff;
}

.account-title-row {
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 14px;
}

.account-title-icon {
  width: 30px;
  color: #81858b;
  display: grid;
  place-items: center;
  flex: 0 0 auto;
}

.account-title-row h1 {
  margin: 0;
  color: #050505 !important;
  font-size: 23px !important;
  line-height: 1.1 !important;
  font-weight: 850 !important;
}

.account-title-row p {
  margin: 6px 0 0;
  color: #8b8f96;
  font-size: 13px;
  font-weight: 550;
}

.account-header-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 10px;
  min-width: 0;
}

.account-section-tabs {
  grid-column: 1 / -1;
  height: 36px;
  display: flex;
  align-items: end;
  gap: 26px;
  margin-left: 45px;
  overflow-x: auto;
}

.account-section-tabs button {
  min-height: 36px !important;
  border: 0;
  border-bottom: 2px solid transparent;
  border-radius: 0 !important;
  background: transparent;
  color: #a0a4aa;
  padding: 0 0 10px;
  font-size: 12px;
  font-weight: 850;
  text-transform: uppercase;
  white-space: nowrap;
  cursor: pointer;
}

.account-section-tabs button.active {
  color: #050505;
  border-bottom-color: #050505;
}

.account-button {
  min-height: 34px !important;
  border: 1px solid #cfd4da;
  border-radius: 3px !important;
  background: #ffffff;
  color: #050505;
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 0 12px;
  font-size: 12px;
  font-weight: 850;
  cursor: pointer;
  white-space: nowrap;
}

.account-button.primary {
  border-color: #0f7f86;
  background: #0f7f86;
  color: #ffffff;
}

.account-button:disabled,
.account-input:disabled,
.logout-button:disabled {
  opacity: .55;
  cursor: not-allowed;
}

.account-toast {
  position: sticky;
  top: 72px;
  z-index: 30;
  margin: 10px auto 0;
  width: min(970px, calc(100% - 44px));
  border: 1px solid #b7ebc6;
  border-radius: 4px;
  background: #ecfdf3;
  color: #166534;
  padding: 10px 12px;
  font-size: 13px;
  font-weight: 750;
}

.account-toast.error {
  border-color: #fecaca;
  background: #fef2f2;
  color: #991b1b;
}

.account-inline-panel {
  width: min(970px, calc(100% - 44px));
  min-height: 48px;
  margin: 12px auto 0;
  border: 1px solid #d8dadd;
  border-radius: 4px;
  background: #ffffff;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  box-shadow: 0 1px 2px rgba(15,23,42,.04);
}

.account-inline-panel strong {
  color: #050505;
  font-size: 13px;
  font-weight: 850;
}

.account-inline-panel button,
.row-action-button,
.role-action {
  min-height: 30px !important;
  border: 1px solid #d5d9de;
  border-radius: 3px !important;
  background: #ffffff;
  color: #050505;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  padding: 0 10px;
  font-size: 12px;
  font-weight: 800;
  cursor: pointer;
}

.row-action-button {
  width: 30px;
  padding: 0;
}

.account-input {
  width: 100%;
  min-height: 34px;
  border: 1px solid #d5d9de;
  border-radius: 3px;
  background: #ffffff;
  color: #050505;
  padding: 0 10px;
  font-size: 13px;
  font-weight: 650;
}

.account-check {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: #050505;
  font-size: 13px;
  font-weight: 750;
}

.account-inline-form {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(170px, 1fr));
  gap: 10px;
  align-items: center;
}

.account-filter {
  height: 36px;
  min-width: 190px;
  border: 1px solid #d5d9de;
  border-radius: 3px;
  background: #ffffff;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 10px;
  color: #7b8087;
}

.account-filter input {
  width: 100%;
  height: 100%;
  min-height: 0;
  border: 0;
  outline: 0;
  background: transparent;
  color: #050505;
  font-size: 13px;
}

.account-centered {
  width: min(970px, calc(100% - 44px));
  margin: 22px auto 40px;
  display: grid;
  gap: 14px;
}

.account-card {
  border: 1px solid #e1e4e8;
  border-radius: 4px;
  background: #ffffff;
  box-shadow: 0 1px 2px rgba(15,23,42,.04);
  padding: 26px 30px;
}

.company-card {
  padding-bottom: 30px;
}

.small-section {
  min-height: 88px;
}

.card-header {
  min-height: 28px;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 18px;
}

.card-header h2 {
  margin: 0;
  color: #050505 !important;
  font-size: 18px !important;
  line-height: 1.25 !important;
  font-weight: 750 !important;
}

.card-header button {
  min-height: 28px !important;
  border: 0;
  background: transparent;
  color: #050505;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 12px;
  font-weight: 850;
  cursor: pointer;
}

.account-info-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 17px 80px;
}

.account-info-grid.separated {
  margin-top: 26px;
  padding-top: 18px;
  border-top: 1px solid #e7e9ec;
}

.info-block {
  min-width: 0;
  display: grid;
  gap: 4px;
  align-content: start;
}

.info-block span {
  color: #8b8f96;
  font-size: 10px;
  font-weight: 850;
  text-transform: uppercase;
}

.info-block strong {
  min-width: 0;
  color: #050505;
  font-size: 12px;
  font-weight: 650;
  overflow-wrap: anywhere;
}

.info-block strong.is-strong {
  font-weight: 850;
}

.green-text {
  color: #12a500 !important;
  font-weight: 850;
}

.status-dot,
.online-dot {
  width: 9px;
  height: 9px;
  border-radius: 50%;
  background: #20c45a;
  display: inline-block;
}

.status-dot {
  margin-right: 6px;
}

.account-two-col {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
}

.account-two-col .account-card {
  padding: 22px 30px 20px;
}

.action-list {
  display: grid;
}

.action-row {
  min-height: 72px !important;
  width: 100%;
  border: 0;
  border-top: 1px solid #eceef1;
  border-radius: 0 !important;
  background: #ffffff;
  color: #050505;
  display: grid;
  grid-template-columns: 22px minmax(0, 1fr) 20px;
  align-items: center;
  gap: 12px;
  text-align: left;
  cursor: pointer;
}

.action-row:first-child {
  border-top: 0;
}

.action-row > svg:first-child {
  color: #050505;
}

.action-row strong,
.action-row small {
  display: block;
  min-width: 0;
}

.action-row strong {
  color: #050505;
  font-size: 13px;
  font-weight: 800;
}

.action-row small {
  margin-top: 4px;
  color: #8b8f96;
  font-size: 12px;
}

.apps-grid {
  display: grid;
  grid-template-columns: repeat(5, minmax(96px, 1fr));
  gap: 26px 34px;
}

.apps-grid.compact {
  gap: 25px 30px;
}

.app-tile {
  position: relative;
  min-height: 82px;
  display: grid;
  justify-items: center;
  align-content: start;
  gap: 6px;
  text-align: center;
  color: #087f8b;
}

.app-tile svg {
  color: #087f8b;
}

.app-tile strong {
  color: #050505;
  font-size: 13px;
  font-weight: 850;
  line-height: 1.15;
}

.app-tile small {
  color: #8b8f96;
  font-size: 11px;
  line-height: 1.25;
}

.app-tile.disabled {
  opacity: .56;
}

.app-toggles {
  display: grid;
  gap: 5px;
  color: #5f6670;
  font-size: 11px;
  font-weight: 750;
}

.app-toggles label {
  display: inline-flex;
  justify-content: center;
  gap: 5px;
}

.app-crown {
  position: absolute;
  top: -6px;
  right: 9px;
  color: #aeb3ba;
  font-size: 9px;
  font-weight: 850;
}

.empty-line {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: #8b8f96;
  font-size: 12px;
}

.two-factor-panel {
  border-radius: 4px;
  background: #fae9e3;
  display: grid;
  grid-template-columns: 46px minmax(0, 1fr);
  gap: 22px;
  padding: 40px 60px;
}

.shield-alert {
  width: 46px;
  height: 46px;
  border-radius: 50%;
  background: #fb6338;
  color: #ffffff;
  display: grid;
  place-items: center;
}

.two-factor-panel h2 {
  margin: 0;
  color: #050505 !important;
  font-size: 18px !important;
  line-height: 1.25 !important;
  font-weight: 850 !important;
}

.two-factor-panel p {
  margin: 6px 0 0;
  color: #777b82;
  font-size: 13px;
  line-height: 1.45;
}

.two-factor-panel .danger-copy {
  max-width: 670px;
  margin-top: 16px;
  color: #cf2e2e;
  font-size: 14px;
}

.inline-actions {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  margin-top: 20px;
}

.help-icon {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  border: 1px solid #8b8f96;
  color: #8b8f96;
  display: inline-grid;
  place-items: center;
  font-size: 11px;
  font-weight: 850;
}

.account-table-wrap {
  width: 100%;
  overflow-x: auto;
}

.account-table-wrap.full {
  min-height: calc(100vh - 116px);
  background: #f3f4f6;
}

.account-table {
  width: 100%;
  min-width: 880px;
  border-collapse: collapse;
  background: #ffffff;
}

.account-table th {
  height: 46px;
  background: #f3f4f6;
  border-bottom: 1px solid #dfe2e5;
  color: #0daf00;
  font-size: 11px;
  font-weight: 850;
  text-align: left;
  text-transform: uppercase;
  white-space: nowrap;
  padding: 0 20px;
}

.account-table td {
  height: 64px;
  border-bottom: 1px solid #dfe2e5;
  border-right: 1px solid #e3e5e8;
  color: #050505;
  font-size: 13px;
  padding: 9px 20px;
  vertical-align: middle;
}

.account-table td:last-child,
.account-table th:last-child {
  border-right: 0;
}

.account-table small {
  display: block;
  margin-top: 3px;
  color: #7f848b;
  font-size: 12px;
  line-height: 1.25;
}

.account-table a,
.cell-link {
  color: #00788a;
  text-decoration: none;
  font-weight: 650;
}

.row-check {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: #050505;
  font-size: 12px;
  font-weight: 850;
  white-space: nowrap;
}

.users-table {
  min-width: 1180px;
}

.security-table {
  min-width: 820px;
}

.security-table th {
  background: #ffffff;
  color: #7f848b;
}

.cell-strong {
  display: block;
  color: #050505;
  font-weight: 800;
}

.cell-line {
  display: flex;
  align-items: center;
  gap: 7px;
  max-width: 210px;
  color: #050505;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.active-pill {
  min-width: 88px;
  height: 32px;
  border-radius: 999px;
  background: #00b765;
  color: #ffffff;
  display: inline-grid;
  place-items: center;
  font-size: 12px;
  font-weight: 850;
  text-transform: uppercase;
}

.logout-button {
  min-height: 30px !important;
  border: 1px solid #d5d9de;
  border-radius: 3px !important;
  background: #ffffff;
  color: #050505;
  padding: 0 14px;
  font-size: 12px;
  font-weight: 800;
  cursor: pointer;
}

.user-identity {
  min-width: 220px;
  display: flex;
  align-items: center;
  gap: 12px;
}

.user-identity > span:last-child {
  min-width: 0;
}

.user-identity strong,
.user-identity small {
  display: block;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.user-identity strong {
  color: #050505;
  font-size: 14px;
  font-weight: 850;
}

.user-identity small {
  margin-top: 4px;
  color: #7f848b;
  font-size: 12px;
}

.avatar-wrap {
  position: relative;
  flex: 0 0 auto;
}

.avatar {
  width: 34px;
  height: 34px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  color: #ffffff;
  font-size: 12px;
  font-weight: 850;
}

.online-dot {
  position: absolute;
  right: -2px;
  bottom: -2px;
  border: 2px solid #ffffff;
}

.owner-mark {
  color: #dfb100;
  margin-right: 8px;
  font-size: 10px;
  font-weight: 850;
}

.pending-mark {
  color: #b45309;
  margin-right: 8px;
  font-size: 10px;
  font-weight: 850;
}

.muted-icon {
  color: #9aa0a8;
}

.groups-table {
  min-width: 1060px;
}

.group-name-cell {
  display: flex;
  align-items: center;
  gap: 14px;
}

.group-name-cell > span:first-child {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: #0f8f7f;
  color: #ffffff;
  display: grid;
  place-items: center;
  font-size: 12px;
  font-weight: 850;
}

.group-name-cell strong,
.group-name-cell small {
  display: block;
}

.group-name-cell strong {
  color: #050505;
  font-size: 14px;
  font-weight: 850;
}

.avatar-stack {
  display: flex;
  align-items: center;
}

.avatar-stack .avatar {
  width: 28px;
  height: 28px;
  margin-left: -7px;
  border: 2px solid #ffffff;
  font-size: 10px;
}

.avatar-stack .avatar:first-child {
  margin-left: 0;
}

.empty-table-wrap {
  display: grid;
  grid-template-rows: auto 1fr;
}

.empty-state {
  min-height: 360px;
  display: grid;
  place-items: center;
  align-content: center;
  gap: 10px;
  color: #9aa0a8;
  font-weight: 750;
}

.profile-card {
  display: grid;
  grid-template-columns: 92px minmax(0, 1fr);
  gap: 24px;
  align-items: start;
}

.large-avatar {
  width: 86px;
  height: 86px;
  border-radius: 50%;
  background: #a594f9;
  color: #ffffff;
  display: grid;
  place-items: center;
  font-size: 32px;
  font-weight: 850;
}

.profile-card h2 {
  margin: 0;
  color: #050505 !important;
  font-size: 22px !important;
  line-height: 1.2 !important;
  font-weight: 850 !important;
}

.profile-card p {
  margin: 5px 0 18px;
  color: #7f848b;
  font-size: 13px;
}

.profile-facts {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
}

.settings-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(210px, 1fr));
  gap: 12px;
}

.setting-tile,
.role-card {
  border: 1px solid #e5e8ec;
  border-radius: 4px;
  background: #ffffff;
  padding: 16px;
}

.setting-tile span,
.role-card > span {
  width: 34px;
  height: 34px;
  border-radius: 4px;
  background: #e7f6f7;
  color: #0f7f86;
  display: grid;
  place-items: center;
  margin-bottom: 12px;
}

.setting-tile strong,
.role-card strong {
  display: block;
  color: #050505;
  font-size: 14px;
  font-weight: 850;
}

.setting-tile p,
.role-card p {
  margin: 7px 0 0;
  color: #6d737b;
  font-size: 12px;
  line-height: 1.45;
}

.office-list {
  display: grid;
  gap: 9px;
}

.office-row {
  min-height: 58px;
  display: grid;
  grid-template-columns: 34px minmax(0, 1fr) 160px 130px 24px;
  align-items: center;
  gap: 12px;
  border: 1px solid #e5e8ec;
  border-radius: 4px;
  padding: 10px 14px;
  color: #050505;
}

.office-row > span:first-child {
  width: 34px;
  height: 34px;
  border-radius: 4px;
  background: #eef9f1;
  color: #0f7f86;
  display: grid;
  place-items: center;
}

.office-row strong,
.office-row small {
  display: block;
}

.office-row small {
  color: #7f848b;
  font-size: 12px;
}

.role-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.role-card small {
  display: block;
  margin-top: 14px;
  color: #0f7f86;
  font-size: 12px;
  font-weight: 850;
}

.role-action {
  margin-top: 12px;
}

@media (max-width: 1024px) {
  .account-page-header {
    position: sticky;
    top: 48px;
    min-height: 0;
    grid-template-columns: 1fr;
    gap: 12px;
    padding: 14px 14px 11px;
    box-shadow: 0 8px 24px rgba(15,23,42,.06);
  }

  .account-header-actions {
    width: 100%;
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(142px, 1fr));
    justify-content: stretch;
    gap: 8px;
  }

  .account-section-tabs {
    width: 100%;
    height: auto;
    margin-left: 0;
    gap: 18px;
    padding-bottom: 1px;
    align-items: center;
    scrollbar-width: none;
  }

  .account-section-tabs::-webkit-scrollbar {
    display: none;
  }

  .account-section-tabs button {
    min-height: 38px !important;
    padding: 0 0 9px;
  }

  .account-filter {
    grid-column: 1 / -1;
    width: 100%;
    min-width: 0;
    height: 42px;
  }

  .account-button,
  .account-input,
  .logout-button {
    min-height: 42px !important;
  }

  .account-button {
    width: 100%;
    justify-content: center;
    padding: 0 12px;
    white-space: normal;
    line-height: 1.2;
  }

  .account-centered {
    box-sizing: border-box;
    width: 100%;
    margin: 12px auto calc(88px + env(safe-area-inset-bottom));
    padding: 0 12px;
  }

  .account-inline-panel {
    box-sizing: border-box;
    width: calc(100% - 24px);
    min-height: 0;
    align-items: stretch;
    flex-wrap: wrap;
  }

  .account-inline-panel button {
    min-height: 40px !important;
  }

  .account-inline-form {
    grid-template-columns: repeat(auto-fit, minmax(210px, 1fr));
    align-items: stretch;
  }

  .account-card {
    padding: 18px 14px;
  }

  .account-info-grid,
  .account-two-col,
  .profile-facts,
  .role-grid {
    grid-template-columns: 1fr;
  }

  .apps-grid {
    grid-template-columns: repeat(auto-fit, minmax(132px, 1fr));
    gap: 12px;
  }

  .apps-grid.compact {
    gap: 12px;
  }

  .app-tile {
    min-height: 138px;
    border: 1px solid #e5e8ec;
    border-radius: 4px;
    background: #ffffff;
    justify-items: start;
    align-content: center;
    padding: 16px 12px 14px;
    text-align: left;
  }

  .app-tile strong,
  .app-tile small {
    width: 100%;
  }

  .app-toggles {
    width: 100%;
    justify-items: start;
  }

  .app-toggles label {
    justify-content: flex-start;
  }

  .app-crown {
    top: 9px;
    right: 10px;
  }

  .two-factor-panel {
    grid-template-columns: 1fr;
    padding: 24px 18px;
  }

  .office-row {
    grid-template-columns: 34px minmax(0, 1fr) 40px;
  }

  .office-row > span:nth-of-type(2),
  .office-row > span:nth-of-type(3) {
    display: none;
  }

  .row-action-button,
  .role-action {
    min-height: 40px !important;
  }

  .row-action-button {
    width: 40px;
  }

  .account-table-wrap {
    overflow: visible;
  }

  .account-table-wrap.full {
    min-height: auto;
    padding: 0 12px calc(92px + env(safe-area-inset-bottom));
  }

  .account-table,
  .users-table,
  .groups-table,
  .security-table {
    min-width: 0;
    border-collapse: separate;
    border-spacing: 0 10px;
    background: transparent;
  }

  .account-table thead {
    display: none;
  }

  .account-table tbody {
    display: block;
  }

  .account-table tr {
    display: block;
    border: 1px solid #e1e4e8;
    border-radius: 6px;
    background: #ffffff;
    box-shadow: 0 1px 2px rgba(15,23,42,.04);
    overflow: hidden;
  }

  .account-table td {
    width: 100%;
    height: auto;
    min-height: 48px;
    border-right: 0;
    border-bottom: 1px solid #eceef1;
    padding: 10px 12px;
  }

  .account-table td:last-child {
    border-bottom: 0;
  }

  .account-table td[data-label] {
    display: grid;
    grid-template-columns: minmax(104px, 34%) minmax(0, 1fr);
    align-items: center;
    gap: 12px;
  }

  .account-table td[data-label]::before {
    content: attr(data-label);
    color: #858b93;
    font-size: 10px;
    font-weight: 850;
    letter-spacing: 0;
    line-height: 1.2;
    text-transform: uppercase;
  }

  .account-table td[data-label="Actions"],
  .account-table td[data-label="Action"] {
    grid-template-columns: 1fr;
    justify-items: end;
  }

  .account-table td[data-label="Actions"]::before,
  .account-table td[data-label="Action"]::before {
    display: none;
  }

  .empty-table-wrap .account-table {
    border-spacing: 0;
  }

  .empty-table-wrap .account-table tr {
    border: 0;
    border-radius: 0;
    background: transparent;
    box-shadow: none;
  }

  .empty-table-wrap .account-table td {
    border-bottom: 0;
    padding: 0;
  }

  .empty-state {
    min-height: 230px;
    padding: 22px 12px;
    text-align: center;
  }

  .user-identity {
    min-width: 0;
  }

  .cell-line {
    max-width: 100%;
    white-space: normal;
    overflow: visible;
    text-overflow: clip;
  }

  .avatar-stack {
    flex-wrap: wrap;
    row-gap: 4px;
  }

  .group-name-cell {
    min-width: 0;
  }

  .group-name-cell > span:last-child {
    min-width: 0;
  }

  .group-name-cell small {
    overflow-wrap: anywhere;
  }
}

@media (max-width: 540px) {
  .account-title-row {
    align-items: flex-start;
  }

  .account-title-row h1 {
    font-size: 20px !important;
  }

  .account-filter {
    width: 100%;
  }

  .profile-card {
    grid-template-columns: 1fr;
  }

  .account-title-row {
    gap: 10px;
  }

  .account-title-icon {
    width: 24px;
  }

  .account-title-row p {
    font-size: 12px;
  }

  .account-card {
    padding: 16px 12px;
  }

  .card-header {
    gap: 10px;
    flex-wrap: wrap;
  }

  .card-header h2 {
    font-size: 16px !important;
  }

  .settings-grid,
  .account-inline-form {
    grid-template-columns: 1fr;
  }

  .apps-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .app-tile {
    min-height: 132px;
    padding: 14px 10px 12px;
  }

  .account-table td[data-label] {
    grid-template-columns: 1fr;
    gap: 5px;
    align-items: start;
  }

  .account-table td[data-label]::before {
    font-size: 9px;
  }

  .active-pill {
    min-width: 0;
    width: max-content;
    padding: 0 12px;
  }
}
`
