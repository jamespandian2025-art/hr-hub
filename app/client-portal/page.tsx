'use client'

import { useMemo, useState } from 'react'
import { CalendarDays, Check, FileText, FolderKanban, Image as ImageIcon, LayoutDashboard, ListPlus, LogOut, MessageSquare, Settings, ShieldCheck, WalletCards, Wrench, X } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { logoutUser } from '@/lib/auth/logout'
import { companyScopedKey, getActiveCompany } from '@/lib/tenant/company'

const font = "var(--font-body)"
const projectsKey = 'flowsys-projects'
const progressKey = 'flowsys-project-progress'
const attachmentsKey = 'flowsys-project-attachments'
const changeOrdersKey = 'flowsys-change-orders'
const outboundNotificationsKey = 'flowsys-outbound-notifications'
const accountKey = 'flowsys-account'

type ProjectStatus = 'Pending' | 'Ongoing' | 'Completed' | 'With issue'

interface Project {
  id: string | number
  name: string
  client: string
  location: string
  projectCost: number
  startDate: string
  endDate: string
  status: ProjectStatus
  materialCost: number
  laborCost: number
  overheadProfit: number
  generalExpense: number
  paidAmount: number
  unpaidAmount: number
  notes: string
}

interface ProjectProgressUpdate {
  id: number
  projectId: string | number
  phase: string
  title: string
  remarks: string
  updateDate: string
  author: string
  notifyClient: boolean
  files: string[]
  createdAt: string
}

interface ProjectAttachment {
  id: number
  projectId: string | number
  name: string
  size: number
  addedAt: string
}

interface AccountState {
  company?: string
  email?: string
  fullName?: string
  role?: string
}

type ChangeOrderStatus = 'Requested' | 'Priced' | 'Approved' | 'Rejected'

interface ChangeOrder {
  id: number
  projectId: string | number
  clientName: string
  title: string
  description: string
  requestedBy: string
  status: ChangeOrderStatus
  priceImpact: number
  timelineImpact: number
  files: string[]
  createdAt: string
  decidedAt?: string
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

const loadStored = <T,>(key: string, fallback: T[]): T[] => {
  if (typeof window === 'undefined') return fallback

  try {
    const activeCompany = getActiveCompany()
    const scopedKey = companyScopedKey(key, activeCompany?.id)
    const rows = [window.localStorage.getItem(scopedKey), scopedKey === key ? null : window.localStorage.getItem(key)]
      .flatMap(stored => {
        if (!stored) return []
        const parsed = JSON.parse(stored) as unknown
        return Array.isArray(parsed) ? parsed as T[] : []
      })
    return rows.length ? uniqueRows(rows) : fallback
  } catch {
    return fallback
  }
}

const uniqueRows = <T,>(rows: T[]) => {
  const seen = new Set<string>()
  return rows.filter((row, index) => {
    const id = typeof row === 'object' && row && 'id' in row ? String((row as { id?: unknown }).id) : String(index)
    if (seen.has(id)) return false
    seen.add(id)
    return true
  })
}

const recordKey = (value: string | number | null | undefined) => String(value ?? '')
const money = (value: number) => `PHP ${Number(value || 0).toLocaleString('en-PH')}.00`
const shortMoney = (value: number) => `PHP ${Number(value || 0).toLocaleString('en-PH')}`
const duration = (project: Project) => `${project.startDate || '-'} - ${project.endDate || '-'}`
const fileSize = (size: number) => (size >= 1024 * 1024 ? `${(size / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(size / 1024))} KB`)
const statusStyle: Record<ProjectStatus, { bg: string; color: string; border: string }> = {
  Ongoing: { bg: '#fff7ed', color: '#c2410c', border: '#fed7aa' },
  Pending: { bg: '#eff6ff', color: '#1d4ed8', border: '#bfdbfe' },
  Completed: { bg: '#ecfdf5', color: '#047857', border: '#a7f3d0' },
  'With issue': { bg: '#fef2f2', color: '#b91c1c', border: '#fecaca' },
}

export default function ClientPortalPage() {
  const router = useRouter()
  const [projects] = useState<Project[]>(() => loadStored<Project>(projectsKey, []))
  const [progress] = useState<ProjectProgressUpdate[]>(() => loadStored<ProjectProgressUpdate>(progressKey, []))
  const [attachments] = useState<ProjectAttachment[]>(() => loadStored<ProjectAttachment>(attachmentsKey, []))
  const [changeOrders, setChangeOrders] = useState<ChangeOrder[]>(() => loadStored<ChangeOrder>(changeOrdersKey, []))
  const [account, setAccount] = useState<AccountState>(() => {
    if (typeof window === 'undefined') return {}
    try {
      const stored = window.localStorage.getItem(accountKey)
      return stored ? (JSON.parse(stored) as AccountState) : {}
    } catch {
      return {}
    }
  })
  const [accountOpen, setAccountOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [profileName, setProfileName] = useState(() => account.fullName || account.company || 'Client User')
  const [profileEmail, setProfileEmail] = useState(() => account.email || 'client@example.com')
  const [notice, setNotice] = useState('')
  const [activeSection, setActiveSection] = useState('Dashboard')
  const [changeTitle, setChangeTitle] = useState('')
  const [changeDescription, setChangeDescription] = useState('')
  const [changeFiles, setChangeFiles] = useState<string[]>([])
  const clients = useMemo(() => Array.from(new Set(projects.map(project => project.client).filter(Boolean))), [projects])
  const [client, setClient] = useState(() => clients[0] || 'All clients')
  const clientProjects = projects.filter(project => client === 'All clients' || project.client === client)
  const [selectedProjectId, setSelectedProjectId] = useState<string | number | null>(() => clientProjects[0]?.id || null)
  const selectedProject = clientProjects.find(project => recordKey(project.id) === recordKey(selectedProjectId)) || clientProjects[0]
  const projectUpdates = selectedProject
    ? progress
        .filter(update => recordKey(update.projectId) === recordKey(selectedProject.id) && update.notifyClient)
        .sort((a, b) => new Date(b.updateDate || b.createdAt).getTime() - new Date(a.updateDate || a.createdAt).getTime())
    : []
  const projectAttachments = selectedProject ? attachments.filter(attachment => recordKey(attachment.projectId) === recordKey(selectedProject.id)) : []
  const expenses = selectedProject ? selectedProject.materialCost + selectedProject.laborCost + selectedProject.overheadProfit + selectedProject.generalExpense : 0
  const completion = selectedProject?.status === 'Completed' ? 100 : selectedProject?.status === 'Ongoing' ? 55 : selectedProject?.status === 'With issue' ? 40 : 10
  const gallery = projectUpdates.flatMap(update => update.files.map(file => ({ file, phase: update.phase, date: update.updateDate }))).slice(0, 8)
  const paidPercent = selectedProject?.projectCost ? Math.min(100, Math.round((selectedProject.paidAmount / selectedProject.projectCost) * 100)) : 0
  const projectChangeOrders = selectedProject ? changeOrders.filter(order => recordKey(order.projectId) === recordKey(selectedProject.id)) : []

  const changeClient = (nextClient: string) => {
    setClient(nextClient)
    const nextProjects = projects.filter(project => nextClient === 'All clients' || project.client === nextClient)
    setSelectedProjectId(nextProjects[0]?.id || null)
  }

  const saveAccount = () => {
    const nextAccount = {
      ...account,
      fullName: profileName.trim() || 'Client User',
      company: profileName.trim() || account.company || 'Client User',
      email: profileEmail.trim() || account.email || 'client@example.com',
      role: 'Client',
    }
    setAccount(nextAccount)
    window.localStorage.setItem(accountKey, JSON.stringify(nextAccount))
    setNotice('Account settings saved.')
  }

  const logout = async () => {
    await logoutUser()
    router.replace('/login')
  }

  const requestChangeOrder = () => {
    if (!selectedProject || !changeTitle.trim()) return
    const createdAt = new Date().toISOString()
    const nextOrder: ChangeOrder = {
      id: changeOrders.reduce((max, order) => Math.max(max, order.id), 0) + 1,
      projectId: selectedProject.id,
      clientName: selectedProject.client,
      title: changeTitle.trim(),
      description: changeDescription.trim(),
      requestedBy: account.fullName || account.company || selectedProject.client || 'Client',
      status: 'Requested',
      priceImpact: 0,
      timelineImpact: 0,
      files: changeFiles,
      createdAt,
    }
    const nextOrders = [nextOrder, ...changeOrders]
    setChangeOrders(nextOrders)
    window.localStorage.setItem(changeOrdersKey, JSON.stringify(nextOrders))

    const existingNotifications = loadStored<OutboundNotification>(outboundNotificationsKey, [])
    const nextNotificationId = existingNotifications.reduce((max, item) => Math.max(max, item.id), 0) + 1
    const notificationMessage = `${nextOrder.requestedBy} requested "${nextOrder.title}" for ${selectedProject.name}. Review the change order, add pricing, and approve or reject.`
    const nextNotifications: OutboundNotification[] = [
      {
        id: nextNotificationId,
        channel: 'Email',
        recipientRole: 'Admin',
        subject: `New client change request: ${nextOrder.title}`,
        message: notificationMessage,
        relatedType: 'Change Order',
        relatedId: nextOrder.id,
        status: 'Queued',
        createdAt,
      },
      {
        id: nextNotificationId + 1,
        channel: 'SMS',
        recipientRole: 'Project Manager',
        subject: 'New client change request',
        message: notificationMessage,
        relatedType: 'Change Order',
        relatedId: nextOrder.id,
        status: 'Queued',
        createdAt,
      },
    ]
    window.localStorage.setItem(outboundNotificationsKey, JSON.stringify([...nextNotifications, ...existingNotifications]))

    setChangeTitle('')
    setChangeDescription('')
    setChangeFiles([])
    setActiveSection('Change Orders')
  }

  return (
    <div style={{ ...clientAppStyle, fontFamily: font }}>
      <aside style={clientSidebarStyle}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 30 }}>
            <div style={brandMarkStyle}>W</div>
            <div>
              <div style={{ fontSize: 17, color: '#111827', fontWeight: 600 }}>WiseFlow</div>
              <div style={{ fontSize: 12, color: '#000000', fontWeight: 600 }}>Client Portal</div>
            </div>
          </div>
          <div style={{ display: 'grid', gap: 6 }}>
            {[
              ['Dashboard', LayoutDashboard],
              ['Projects', FolderKanban],
              ['Change Orders', ListPlus],
              ['Progress', Check],
              ['Gallery', ImageIcon],
              ['Documents', FileText],
              ['Messages', MessageSquare],
              ['Appointments', CalendarDays],
              ['Support', Wrench],
            ].map(([label, Icon]) => (
              <button key={label as string} onClick={() => setActiveSection(label as string)} style={clientNavButtonStyle(activeSection === label)}>
                <Icon size={17} />
                {label as string}
              </button>
            ))}
          </div>
        </div>
        <div style={sidebarProfileStyle}>
          <div style={miniAvatarStyle}>{(account.fullName || account.company || 'Client').charAt(0).toUpperCase()}</div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 13, color: '#111827', fontWeight: 950, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{account.fullName || account.company || 'Client User'}</div>
            <div style={{ fontSize: 11, color: '#000000', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{account.email || 'client@example.com'}</div>
          </div>
        </div>
      </aside>

      <main style={{ minWidth: 0 }}>
        <header style={topBarStyle}>
          <div>
            <div style={{ fontSize: 24, color: '#111827', fontWeight: 950 }}>{activeSection}</div>
            <div style={{ fontSize: 13, color: '#000000', fontWeight: 600, marginTop: 4 }}>A private view of your active project updates.</div>
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', position: 'relative' }}>
            <select value={client} onChange={event => changeClient(event.target.value)} style={selectStyle}>
              <option>All clients</option>
              {clients.map(clientName => <option key={clientName}>{clientName}</option>)}
            </select>
            {clientProjects.length > 0 && (
              <select value={selectedProject?.id || ''} onChange={event => setSelectedProjectId(event.target.value)} style={selectStyle}>
                {clientProjects.map(project => <option key={project.id} value={project.id}>{project.name}</option>)}
              </select>
            )}
            <button onClick={() => setAccountOpen(!accountOpen)} style={avatarButtonStyle}>
              {(account.fullName || account.company || 'Client').charAt(0).toUpperCase()}
            </button>
            {accountOpen && (
              <div style={accountMenuStyle}>
                <div style={{ padding: 18, textAlign: 'center', borderBottom: '1px solid #f1f5f9' }}>
                  <div style={{ fontSize: 15, color: '#111827', fontWeight: 950 }}>{account.fullName || account.company || 'Client User'}</div>
                  <div style={{ fontSize: 12, color: '#000000', fontWeight: 600, marginTop: 4 }}>{account.email || 'client@example.com'}</div>
                </div>
                <button onClick={() => { setSettingsOpen(true); setAccountOpen(false); setNotice('') }} style={menuButtonStyle}><Settings size={16} /> Account settings</button>
                <button onClick={logout} style={{ ...menuButtonStyle, color: '#dc2626', borderTop: '1px solid #f1f5f9' }}><LogOut size={16} /> Logout</button>
              </div>
            )}
          </div>
        </header>

      {settingsOpen && (
        <div style={modalBackdropStyle}>
          <div style={modalStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', padding: '18px 20px', borderBottom: '1px solid #f1f5f9' }}>
              <div>
                <div style={{ fontSize: 18, color: '#111827', fontWeight: 950 }}>Account settings</div>
                <div style={{ fontSize: 12, color: '#000000', fontWeight: 600, marginTop: 3 }}>Manage your client profile details.</div>
              </div>
              <button onClick={() => setSettingsOpen(false)} style={iconButtonStyle}><X size={18} /></button>
            </div>
            <div style={{ padding: 20, display: 'grid', gap: 14 }}>
              {notice && <div style={noticeStyle}><Check size={16} /> {notice}</div>}
              <label style={fieldGroupStyle}>
                <span style={labelStyle}>Display name</span>
                <input value={profileName} onChange={event => setProfileName(event.target.value)} style={inputStyle} />
              </label>
              <label style={fieldGroupStyle}>
                <span style={labelStyle}>Email address</span>
                <input value={profileEmail} onChange={event => setProfileEmail(event.target.value)} type="email" style={inputStyle} />
              </label>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 4 }}>
                <button onClick={() => setSettingsOpen(false)} style={secondaryButtonStyle}>Close</button>
                <button onClick={saveAccount} style={primaryButtonStyle}>Save settings</button>
              </div>
            </div>
          </div>
        </div>
      )}
      {!selectedProject ? (
        <section style={emptyPanelStyle}>
          <div style={emptyIconStyle}><ShieldCheck size={34} /></div>
          <h1 style={{ fontSize: 24, color: '#111827', fontWeight: 600, margin: '14px 0 8px' }}>No project assigned yet</h1>
          <p style={{ fontSize: 14, color: '#000000', lineHeight: 1.7, maxWidth: 520, margin: '0 auto' }}>
            Once your project is created and shared, this dashboard will show your timeline, progress updates, photos, documents, and payment status.
          </p>
        </section>
      ) : (
        <div style={{ display: 'grid', gap: 20 }}>
          {activeSection === 'Projects' && (
            <section style={panelStyle}>
              <SectionHeader title="Your Projects" subtitle="Projects assigned to your client account" />
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 14, marginTop: 18 }}>
                {clientProjects.map(project => {
                  const isSelected = selectedProject?.id === project.id
                  const projectExpenses = project.materialCost + project.laborCost + project.overheadProfit + project.generalExpense
                  const projectCompletion = project.status === 'Completed' ? 100 : project.status === 'Ongoing' ? 55 : project.status === 'With issue' ? 40 : 10
                  return (
                    <button key={project.id} onClick={() => { setSelectedProjectId(project.id); setActiveSection('Dashboard') }} style={projectCardStyle(isSelected)}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'flex-start' }}>
                        <div style={{ textAlign: 'left' }}>
                          <div style={{ fontSize: 15, color: '#111827', fontWeight: 950, marginBottom: 5 }}>{project.name}</div>
                          <div style={{ fontSize: 12, color: '#000000', fontWeight: 600 }}>{project.location}</div>
                        </div>
                        <span style={{ ...statusPillStyle, background: statusStyle[project.status].bg, color: statusStyle[project.status].color, borderColor: statusStyle[project.status].border }}>{project.status}</span>
                      </div>
                      <div style={{ display: 'grid', gap: 8, marginTop: 18 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#000000', fontWeight: 600 }}>
                          <span>Completion</span>
                          <span>{projectCompletion}%</span>
                        </div>
                        <div style={{ height: 7, borderRadius: 99, background: '#e5e7eb', overflow: 'hidden' }}>
                          <div style={{ width: `${projectCompletion}%`, height: '100%', background: '#10b981', borderRadius: 99 }} />
                        </div>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 18 }}>
                        <div style={miniStatStyle}>
                          <span>Cost</span>
                          <strong>{shortMoney(project.projectCost)}</strong>
                        </div>
                        <div style={miniStatStyle}>
                          <span>Actual</span>
                          <strong>{shortMoney(projectExpenses)}</strong>
                        </div>
                      </div>
                    </button>
                  )
                })}
              </div>
            </section>
          )}

          {activeSection === 'Change Orders' && (
            <section style={panelStyle}>
              <SectionHeader title="Change Orders / Add-ons" subtitle="Request upgrades, modifications, or extra work for this project" />
              <div style={{ display: 'grid', gridTemplateColumns: 'minmax(280px, .72fr) minmax(360px, 1fr)', gap: 18, alignItems: 'start', marginTop: 18 }}>
                <div style={{ border: '1px solid #e5e7eb', borderRadius: 16, padding: 16, display: 'grid', gap: 12 }}>
                  <label style={fieldGroupStyle}>
                    <span style={labelStyle}>Request title</span>
                    <input value={changeTitle} onChange={event => setChangeTitle(event.target.value)} style={inputStyle} placeholder="Example: Upgrade bathroom tiles" />
                  </label>
                  <label style={fieldGroupStyle}>
                    <span style={labelStyle}>Details</span>
                    <textarea value={changeDescription} onChange={event => setChangeDescription(event.target.value)} style={{ ...inputStyle, resize: 'vertical', minHeight: 110 }} placeholder="Describe the change, preferred material, location, or reason." />
                  </label>
                  <label style={fieldGroupStyle}>
                    <span style={labelStyle}>Reference photos</span>
                    <input type="file" multiple accept="image/*" onChange={event => setChangeFiles(Array.from(event.target.files || []).map(file => file.name))} style={inputStyle} />
                    <span style={{ fontSize: 12, color: '#000000', lineHeight: 1.5 }}>
                      Add photos, screenshots, or inspiration images for the team to review.
                    </span>
                  </label>
                  {changeFiles.length > 0 && (
                    <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
                      {changeFiles.map(file => <span key={file} style={filePillStyle}>{file}</span>)}
                    </div>
                  )}
                  <button onClick={requestChangeOrder} disabled={!changeTitle.trim()} style={{ ...primaryButtonStyle, justifyContent: 'center', opacity: changeTitle.trim() ? 1 : .45 }}>
                    Submit Request
                  </button>
                </div>
                <div style={{ display: 'grid', gap: 12 }}>
                  {projectChangeOrders.length === 0 ? <EmptyState text="No change order requests yet." /> : projectChangeOrders.map(order => (
                    <div key={order.id} style={changeOrderCardStyle}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                        <div>
                          <div style={{ fontSize: 15, color: '#111827', fontWeight: 950 }}>{order.title}</div>
                          <div style={{ fontSize: 12, color: '#000000', fontWeight: 600, marginTop: 4 }}>{new Date(order.createdAt).toLocaleDateString('en-PH')}</div>
                        </div>
                        <span style={changeStatusStyle(order.status)}>{order.status}</span>
                      </div>
                      {order.description && <div style={{ fontSize: 13, color: '#000000', lineHeight: 1.65, marginTop: 10 }}>{order.description}</div>}
                      {order.files?.length > 0 && (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: 8, marginTop: 12 }}>
                          {order.files.map(file => (
                            <div key={file} style={attachmentPreviewStyle}>
                              <ImageIcon size={18} />
                              <span>{file}</span>
                            </div>
                          ))}
                        </div>
                      )}
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 12 }}>
                        <div style={miniStatStyle}><span>Price impact</span><strong>{money(order.priceImpact)}</strong></div>
                        <div style={miniStatStyle}><span>Timeline impact</span><strong>{order.timelineImpact} day{order.timelineImpact === 1 ? '' : 's'}</strong></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          )}

          {activeSection !== 'Projects' && activeSection !== 'Change Orders' && (
          <>
          <section style={heroStyle}>
            <div>
              <span style={{ ...statusPillStyle, background: statusStyle[selectedProject.status].bg, color: statusStyle[selectedProject.status].color, borderColor: statusStyle[selectedProject.status].border }}>
                {selectedProject.status.toUpperCase()}
              </span>
              <h1 style={{ fontSize: 34, color: '#111827', lineHeight: 1.12, fontWeight: 950, margin: '16px 0 8px' }}>{selectedProject.name}</h1>
              <div style={{ fontSize: 14, color: '#000000', fontWeight: 600 }}>{selectedProject.location} - {duration(selectedProject)}</div>
              <div style={heroActionsStyle}>
                <button style={primaryButtonStyle}><MessageSquare size={16} /> Message project team</button>
                <button style={secondaryButtonStyle}><CalendarDays size={16} /> Request site visit</button>
              </div>
            </div>

            <div style={completionCardStyle}>
              <div style={{ width: 132, height: 132, borderRadius: '50%', background: `conic-gradient(#10b981 0 ${completion}%, #e5e7eb ${completion}% 100%)`, display: 'grid', placeItems: 'center', margin: '0 auto 16px' }}>
                <div style={{ width: 94, height: 94, borderRadius: '50%', background: '#fff', display: 'grid', placeItems: 'center', textAlign: 'center' }}>
                  <div>
                    <div style={{ fontSize: 11, color: '#000000', fontWeight: 600, textTransform: 'uppercase' }}>Complete</div>
                    <div style={{ fontSize: 26, color: '#111827', fontWeight: 950 }}>{completion}%</div>
                  </div>
                </div>
              </div>
              <div style={{ fontSize: 13, color: '#000000', fontWeight: 600, textAlign: 'center' }}>
                Latest shared updates: {projectUpdates.length}
              </div>
            </div>
          </section>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 14 }}>
            <MetricCard icon={<WalletCards size={18} />} label="Project Cost" value={shortMoney(selectedProject.projectCost)} tone="#2563eb" bg="#eff6ff" />
            <MetricCard icon={<ShieldCheck size={18} />} label="Paid" value={`${paidPercent}%`} sub={money(selectedProject.paidAmount)} tone="#059669" bg="#ecfdf5" />
            <MetricCard icon={<FileText size={18} />} label="Documents" value={String(projectAttachments.length)} tone="#7c3aed" bg="#f5f3ff" />
            <MetricCard icon={<ImageIcon size={18} />} label="Gallery Items" value={String(gallery.length)} tone="#ea580c" bg="#fff7ed" />
            <MetricCard icon={<ListPlus size={18} />} label="Change Orders" value={String(projectChangeOrders.length)} tone="#9333ea" bg="#faf5ff" />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(380px, 1.22fr) minmax(300px, 0.78fr)', gap: 20, alignItems: 'start' }}>
            <section style={panelStyle}>
              <SectionHeader title="Progress Timeline" subtitle="Updates shared by your project team" />
              <div style={{ display: 'grid', gap: 14, marginTop: 18 }}>
                {projectUpdates.length === 0 ? (
                  <EmptyState text="No client-visible progress updates yet." />
                ) : projectUpdates.map((update, index) => (
                  <div key={update.id} style={{ display: 'grid', gridTemplateColumns: '28px minmax(0, 1fr)', gap: 14 }}>
                    <div style={{ display: 'grid', justifyItems: 'center' }}>
                      <span style={{ width: 12, height: 12, borderRadius: '50%', background: index === 0 ? '#10b981' : '#cbd5e1', marginTop: 5 }} />
                      {index < projectUpdates.length - 1 && <span style={{ width: 2, minHeight: 96, background: '#e5e7eb', marginTop: 6 }} />}
                    </div>
                    <article style={timelineCardStyle}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 8 }}>
                        <span style={phasePillStyle}>{update.phase}</span>
                        <span style={{ fontSize: 12, color: '#000000', fontWeight: 600 }}>{update.updateDate}</span>
                      </div>
                      <div style={{ fontSize: 15, color: '#111827', fontWeight: 600 }}>{update.title}</div>
                      <div style={{ fontSize: 13, color: '#000000', lineHeight: 1.65, marginTop: 7 }}>{update.remarks || 'Photo/video update posted by the project team.'}</div>
                      {update.files.length > 0 && <div style={{ fontSize: 12, color: '#6c63ff', fontWeight: 600, marginTop: 10 }}>{update.files.length} attached gallery item{update.files.length === 1 ? '' : 's'}</div>}
                    </article>
                  </div>
                ))}
              </div>
            </section>

            <div style={{ display: 'grid', gap: 20 }}>
              <section style={panelStyle}>
                <SectionHeader title="Payment Summary" subtitle="Visible payment status" />
                <div style={{ display: 'grid', gap: 12, marginTop: 18 }}>
                  <MoneyRow label="Project cost" value={selectedProject.projectCost} strong />
                  <MoneyRow label="Current actual cost" value={expenses} />
                  <MoneyRow label="Paid amount" value={selectedProject.paidAmount} />
                  <MoneyRow label="Unpaid amount" value={selectedProject.unpaidAmount} danger={selectedProject.unpaidAmount > 0} />
                </div>
                <div style={{ height: 8, borderRadius: 99, background: '#e5e7eb', overflow: 'hidden', marginTop: 18 }}>
                  <div style={{ height: '100%', width: `${paidPercent}%`, background: '#10b981', borderRadius: 99 }} />
                </div>
              </section>

              <section style={panelStyle}>
                <SectionHeader title="Your Project Team" subtitle="Who to contact" />
                <div style={{ display: 'grid', gap: 10, marginTop: 16 }}>
                  {['Project Manager', 'Site Engineer', 'Support'].map((role, index) => (
                    <div key={role} style={teamRowStyle}>
                      <span style={{ ...avatarStyle, background: ['#6c63ff', '#10b981', '#f59e0b'][index] }}>{role.charAt(0)}</span>
                      <div>
                        <div style={{ fontSize: 13, color: '#111827', fontWeight: 600 }}>{role}</div>
                        <div style={{ fontSize: 12, color: '#000000', fontWeight: 600 }}>Livewise Team</div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(420px, 1fr) minmax(300px, 0.52fr)', gap: 20 }}>
            <section style={panelStyle}>
              <SectionHeader title="Site Gallery" subtitle="Photos and videos shared from progress updates" />
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12, marginTop: 18 }}>
                {gallery.length === 0 ? <EmptyState text="No photos or videos posted yet." /> : gallery.map(item => (
                  <div key={`${item.file}-${item.date}`} style={galleryCardStyle}>
                    <div style={{ height: 96, borderRadius: 12, background: 'linear-gradient(135deg,#dbeafe,#f8fafc)', display: 'grid', placeItems: 'center', color: '#000000' }}>
                      <ImageIcon size={28} />
                    </div>
                    <div style={{ fontSize: 12, color: '#111827', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.file}</div>
                    <div style={{ fontSize: 11, color: '#000000', fontWeight: 600 }}>{item.phase} - {item.date}</div>
                  </div>
                ))}
              </div>
            </section>

            <section style={panelStyle}>
              <SectionHeader title="Document Vault" subtitle="Shared files and project documents" />
              <div style={{ display: 'grid', gap: 10, marginTop: 16 }}>
                {projectAttachments.length === 0 ? <EmptyState text="No project documents uploaded yet." /> : projectAttachments.slice(0, 7).map(file => (
                  <div key={file.id} style={documentRowStyle}>
                    <FileText size={17} color="#6c63ff" />
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 13, color: '#111827', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{file.name}</div>
                      <div style={{ fontSize: 12, color: '#000000', fontWeight: 600, marginTop: 3 }}>{fileSize(file.size)} - {file.addedAt.slice(0, 10)}</div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>
          </>
          )}
        </div>
      )}
      </main>
    </div>
  )
}

function SectionHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div>
      <div style={{ fontSize: 16, color: '#111827', fontWeight: 950 }}>{title}</div>
      <div style={{ fontSize: 13, color: '#000000', fontWeight: 600, marginTop: 4 }}>{subtitle}</div>
    </div>
  )
}

function MetricCard({ icon, label, value, sub, tone, bg }: { icon: React.ReactNode; label: string; value: string; sub?: string; tone: string; bg: string }) {
  return (
    <section style={{ ...panelStyle, padding: 18, minHeight: 126 }}>
      <div style={{ width: 34, height: 34, borderRadius: 10, background: bg, color: tone, display: 'grid', placeItems: 'center', marginBottom: 14 }}>{icon}</div>
      <div style={{ fontSize: 12, color: '#000000', fontWeight: 600, textTransform: 'uppercase' }}>{label}</div>
      <div style={{ fontSize: 22, color: tone, fontWeight: 950, marginTop: 5 }}>{value}</div>
      {sub && <div style={{ fontSize: 12, color: '#000000', fontWeight: 600, marginTop: 3 }}>{sub}</div>}
    </section>
  )
}

function MoneyRow({ label, value, strong, danger }: { label: string; value: number; strong?: boolean; danger?: boolean }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, borderBottom: '1px solid #f1f5f9', paddingBottom: 10 }}>
      <span style={{ fontSize: 13, color: '#000000', fontWeight: strong ? 900 : 800 }}>{label}</span>
      <strong style={{ fontSize: 13, color: danger ? '#dc2626' : '#111827', fontWeight: 950 }}>{money(value)}</strong>
    </div>
  )
}

function EmptyState({ text }: { text: string }) {
  return <div style={emptyStyle}>{text}</div>
}

const clientAppStyle = { display: 'grid', gridTemplateColumns: '260px minmax(0, 1fr)', gap: 28, alignItems: 'start' }
const clientSidebarStyle = { position: 'sticky' as const, top: 28, minHeight: 'calc(100vh - 56px)', background: 'rgba(255,255,255,.92)', border: '1px solid #e5e7eb', borderRadius: 22, padding: 18, display: 'flex', flexDirection: 'column' as const, justifyContent: 'space-between', boxShadow: '0 18px 48px rgba(15,23,42,.06)' }
const clientNavButtonStyle = (active: boolean) => ({
  width: '100%',
  border: 'none',
  borderRadius: 13,
  background: active ? '#f5f4ff' : 'transparent',
  color: active ? '#6c63ff' : '#000000',
  padding: '12px 13px',
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  fontSize: 14,
  fontWeight: 600,
  cursor: 'pointer',
  textAlign: 'left' as const,
})
const projectCardStyle = (active: boolean) => ({
  border: `1px solid ${active ? '#6c63ff' : '#e5e7eb'}`,
  borderRadius: 18,
  background: active ? '#f8f7ff' : '#fff',
  padding: 18,
  cursor: 'pointer',
  display: 'grid',
  gap: 0,
  boxShadow: active ? '0 18px 40px rgba(108,99,255,.12)' : '0 10px 26px rgba(15,23,42,.04)',
  textAlign: 'left' as const,
})
const changeOrderCardStyle = {
  border: '1px solid #e5e7eb',
  borderRadius: 16,
  background: '#fff',
  padding: 16,
  boxShadow: '0 10px 26px rgba(15,23,42,.04)',
}
const filePillStyle = { fontSize: 11, color: '#374151', fontWeight: 850, background: '#f8fafc', border: '1px solid #e5e7eb', borderRadius: 999, padding: '5px 8px' }
const attachmentPreviewStyle = {
  minHeight: 76,
  border: '1px solid #e5e7eb',
  borderRadius: 12,
  background: '#f8fafc',
  color: '#000000',
  padding: 10,
  display: 'grid',
  gap: 6,
  alignContent: 'center',
  justifyItems: 'center',
  fontSize: 11,
  fontWeight: 850,
  textAlign: 'center' as const,
  overflow: 'hidden',
}
const changeStatusStyle = (status: ChangeOrderStatus) => ({
  display: 'inline-flex',
  width: 'fit-content',
  borderRadius: 999,
  padding: '5px 10px',
  fontSize: 11,
  fontWeight: 950,
  color: status === 'Approved' ? '#047857' : status === 'Rejected' ? '#b91c1c' : status === 'Priced' ? '#6d28d9' : '#c2410c',
  background: status === 'Approved' ? '#d1fae5' : status === 'Rejected' ? '#fee2e2' : status === 'Priced' ? '#ede9fe' : '#ffedd5',
})
const miniStatStyle = {
  border: '1px solid #f1f5f9',
  borderRadius: 12,
  padding: 10,
  display: 'grid',
  gap: 4,
  color: '#000000',
  fontSize: 11,
  fontWeight: 600,
}
const sidebarProfileStyle = { marginTop: 28, borderTop: '1px solid #f1f5f9', paddingTop: 16, display: 'grid', gridTemplateColumns: '38px minmax(0,1fr)', gap: 10, alignItems: 'center' }
const miniAvatarStyle = { width: 38, height: 38, borderRadius: '50%', background: '#111827', color: '#fff', display: 'grid', placeItems: 'center', fontSize: 13, fontWeight: 950 }
const topBarStyle = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 18, marginBottom: 26, flexWrap: 'wrap' as const }
const brandMarkStyle = { width: 42, height: 42, borderRadius: '50%', background: '#22c55e', color: '#191414', display: 'grid', placeItems: 'center', fontSize: 18, fontWeight: 700, boxShadow: '0 12px 28px rgba(34,197,94,.2)' }
const selectStyle = { minWidth: 210, border: '1px solid #dbe3ee', borderRadius: 12, background: '#fff', color: '#111827', padding: '11px 13px', fontSize: 13, fontWeight: 850, outline: 'none' }
const heroStyle = { display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 220px', gap: 24, alignItems: 'center', background: '#fff', border: '1px solid #dbe3ee', borderRadius: 24, padding: 30, boxShadow: '0 24px 70px rgba(15,23,42,.08)' }
const statusPillStyle = { display: 'inline-flex', border: '1px solid', borderRadius: 999, padding: '6px 11px', fontSize: 11, fontWeight: 950 }
const heroActionsStyle = { display: 'flex', gap: 10, marginTop: 22, flexWrap: 'wrap' as const }
const primaryButtonStyle = { border: 'none', borderRadius: 12, background: '#111827', color: '#fff', padding: '12px 15px', fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 8 }
const secondaryButtonStyle = { border: '1px solid #dbe3ee', borderRadius: 12, background: '#fff', color: '#111827', padding: '12px 15px', fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 8 }
const avatarButtonStyle = { width: 42, height: 42, borderRadius: '50%', border: '1px solid #dbe3ee', background: '#fff', color: '#111827', fontSize: 13, fontWeight: 950, cursor: 'pointer', boxShadow: '0 10px 22px rgba(15,23,42,.08)' }
const accountMenuStyle = { position: 'absolute' as const, right: 0, top: 52, width: 270, background: '#fff', border: '1px solid #e5e7eb', borderRadius: 16, boxShadow: '0 24px 70px rgba(15,23,42,.16)', overflow: 'hidden', zIndex: 50 }
const menuButtonStyle = { width: '100%', border: 'none', background: '#fff', color: '#111827', padding: '13px 16px', fontSize: 14, fontWeight: 850, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10, textAlign: 'left' as const }
const modalBackdropStyle = { position: 'fixed' as const, inset: 0, background: 'rgba(15,23,42,.42)', zIndex: 100, display: 'grid', placeItems: 'center', padding: 20 }
const modalStyle = { width: 'min(480px, 100%)', background: '#fff', border: '1px solid #e5e7eb', borderRadius: 18, boxShadow: '0 28px 80px rgba(15,23,42,.24)', overflow: 'hidden' }
const iconButtonStyle = { width: 36, height: 36, borderRadius: 10, border: '1px solid #e5e7eb', background: '#fff', color: '#111827', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }
const fieldGroupStyle = { display: 'grid', gap: 7 }
const labelStyle = { fontSize: 12, color: '#374151', fontWeight: 600 }
const inputStyle = { width: '100%', border: '1px solid #dbe3ee', borderRadius: 10, background: '#fff', color: '#111827', padding: '11px 12px', fontSize: 13, outline: 'none' }
const noticeStyle = { display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', borderRadius: 10, background: '#ecfdf5', color: '#047857', fontSize: 13, fontWeight: 850 }
const completionCardStyle = { background: 'rgba(255,255,255,.82)', border: '1px solid #e5e7eb', borderRadius: 20, padding: 20 }
const panelStyle = { background: '#fff', border: '1px solid #e5e7eb', borderRadius: 18, padding: 22, boxShadow: '0 16px 42px rgba(15,23,42,.045)' }
const timelineCardStyle = { border: '1px solid #e5e7eb', borderRadius: 16, background: '#fff', padding: 16 }
const phasePillStyle = { display: 'inline-flex', width: 'fit-content', fontSize: 11, color: '#047857', fontWeight: 950, background: '#d1fae5', borderRadius: 999, padding: '5px 9px' }
const teamRowStyle = { display: 'flex', alignItems: 'center', gap: 11, border: '1px solid #f1f5f9', borderRadius: 14, padding: 12 }
const avatarStyle = { width: 34, height: 34, borderRadius: '50%', color: '#fff', display: 'grid', placeItems: 'center', fontSize: 13, fontWeight: 950, flex: '0 0 auto' }
const galleryCardStyle = { border: '1px solid #e5e7eb', borderRadius: 16, background: '#fff', padding: 10, display: 'grid', gap: 8, minWidth: 0 }
const documentRowStyle = { display: 'grid', gridTemplateColumns: '24px minmax(0,1fr)', gap: 10, alignItems: 'center', border: '1px solid #f1f5f9', borderRadius: 14, padding: 12 }
const emptyPanelStyle = { ...panelStyle, minHeight: 420, display: 'grid', placeItems: 'center', textAlign: 'center' as const }
const emptyIconStyle = { width: 72, height: 72, borderRadius: 22, background: '#effff4', color: '#22c55e', display: 'grid', placeItems: 'center', margin: '0 auto' }
const emptyStyle = { border: '1px dashed #cbd5e1', borderRadius: 14, padding: 22, color: '#000000', fontSize: 13, fontWeight: 750, textAlign: 'center' as const }
