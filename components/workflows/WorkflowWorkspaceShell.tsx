'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  ArrowLeft,
  Bell,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ClipboardList,
  FileClock,
  FileText,
  HelpCircle,
  LayoutDashboard,
  Menu,
  Plus,
  Search,
  Settings,
  Sun,
  Workflow,
} from 'lucide-react'
import CompanySwitcher from '@/components/CompanySwitcher'

const workflowNavGroups = [
  {
    label: 'Jobs',
    items: [
      { label: 'My Jobs', href: '/workflows/my-jobs', icon: ClipboardList, badge: '12' },
      { label: 'My To-dos', href: '/workflows/my-to-dos', icon: CheckCircle2, badge: '4' },
      { label: 'Draft Jobs', href: '/workflows/draft-jobs', icon: FileClock, badge: '2' },
    ],
  },
  {
    label: 'Workflows',
    items: [
      { label: 'My Workflows', href: '/workflows/my-workflows', icon: Workflow, badge: '6' },
      { label: 'All Workflows', href: '/workflows/all-workflows', icon: LayoutDashboard },
      { label: 'Create Workflow', href: '/workflows/create', icon: Plus },
    ],
  },
  {
    label: 'Insights',
    items: [
      { label: 'Reports', href: '/workflows/reports', icon: FileText },
      { label: 'Workspace Settings', href: '/settings', icon: Settings },
    ],
  },
]

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`)
}

function pageTitle(pathname: string) {
  if (pathname.startsWith('/workflows/my-jobs')) return 'My Jobs'
  if (pathname.startsWith('/workflows/my-to-dos')) return 'My To-dos'
  if (pathname.startsWith('/workflows/create')) return 'Create Workflow'
  if (pathname.startsWith('/workflows/all-workflows')) return 'All Workflows'
  if (pathname.startsWith('/workflows/draft-jobs')) return 'Draft Jobs'
  if (pathname.startsWith('/workflows/reports')) return 'Reports'
  if (/^\/workflows\/[^/]+\/add-job/.test(pathname)) return 'Add Job'
  if (/^\/workflows\/[^/]+\/jobs\//.test(pathname)) return 'Job Details'
  if (/^\/workflows\/[^/]+/.test(pathname)) return 'Workflow Details'
  return 'My Workflows'
}

export default function WorkflowWorkspaceShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const title = pageTitle(pathname)

  return (
    <div className="workflow-workspace">
      <style>{workflowWorkspaceCss}</style>
      <aside className="workflow-sidebar">
        <div className="workflow-brand">
          <Link href="/dashboard" className="workflow-logo"><span>W</span><strong>WiseFlow</strong></Link>
          <button type="button" aria-label="Collapse workflow navigation"><ChevronLeft size={18} /></button>
        </div>

        <div className="workflow-workspace-card">
          <span><Workflow size={19} /></span>
          <div>
            <strong>Workflows</strong>
            <small>Productivity workspace</small>
          </div>
        </div>

        <Link href="/dashboard" className="workflow-back-link">
          <ArrowLeft size={15} />
          Back to WiseFlow
        </Link>

        <nav className="workflow-nav" aria-label="Workflow workspace navigation">
          {workflowNavGroups.map(group => (
            <section key={group.label}>
              <p>{group.label}</p>
              {group.items.map(item => {
                const Icon = item.icon
                return (
                  <Link href={item.href} key={item.href} className={isActive(pathname, item.href) ? 'active' : ''}>
                    <Icon size={17} />
                    <span>{item.label}</span>
                    {'badge' in item && item.badge && <b>{item.badge}</b>}
                  </Link>
                )
              })}
            </section>
          ))}
        </nav>

        <div className="workflow-profile">
          <span>JP</span>
          <div><strong>James Pandian</strong><small>CEO</small></div>
          <ChevronDown size={16} />
        </div>
      </aside>

      <div className="workflow-main">
        <header className="workflow-topbar">
          <div className="workflow-title">
            <button type="button" aria-label="Open workflow navigation"><Menu size={18} /></button>
            <Workflow size={18} />
            <strong>{title}</strong>
          </div>
          <label className="workflow-search">
            <Search size={16} />
            <input placeholder="Search jobs, workflows, tasks..." />
            <kbd>⌘ K</kbd>
          </label>
          <div className="workflow-actions">
            <CompanySwitcher compact />
            <button type="button" aria-label="Notifications"><Bell size={18} /><span /></button>
            <button type="button" aria-label="Help"><HelpCircle size={18} /></button>
            <button type="button" aria-label="Appearance"><Sun size={18} /></button>
            <span className="workflow-user">JP</span>
            <ChevronDown size={16} />
          </div>
        </header>
        <main className="workflow-content">{children}</main>
      </div>
    </div>
  )
}

const workflowWorkspaceCss = `
.workflow-workspace {
  min-height: 100vh;
  display: grid;
  grid-template-columns: 252px minmax(0, 1fr);
  background: #fbfbfc;
  color: #111827;
  font-family: var(--font-body);
}
.workflow-workspace * { box-sizing: border-box; }
.workflow-sidebar {
  position: sticky;
  top: 0;
  height: 100vh;
  background: #0d1723;
  color: #e5edf6;
  border-right: 1px solid #132233;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
}
.workflow-brand {
  min-height: 68px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 18px;
}
.workflow-logo {
  display: inline-flex;
  align-items: center;
  gap: 12px;
  text-decoration: none;
  color: #20d071;
}
.workflow-logo span {
  width: 34px;
  height: 34px;
  border-radius: 8px;
  display: grid;
  place-items: center;
  background: #20d071;
  color: #062012;
  font-weight: 900;
}
.workflow-logo strong {
  font-size: 18px;
  letter-spacing: 0;
}
.workflow-brand button {
  border: 0;
  background: transparent;
  color: #98a7ba;
  display: grid;
  place-items: center;
  cursor: pointer;
}
.workflow-workspace-card {
  margin: 0 12px 10px;
  min-height: 58px;
  border: 1px solid rgba(255,255,255,.1);
  background: rgba(255,255,255,.04);
  border-radius: 10px;
  padding: 10px 12px;
  display: flex;
  align-items: center;
  gap: 11px;
}
.workflow-workspace-card > span {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  background: #0f9f5f;
  color: #fff;
  display: grid;
  place-items: center;
  flex: 0 0 auto;
}
.workflow-workspace-card div {
  min-width: 0;
  display: grid;
  gap: 3px;
}
.workflow-workspace-card strong {
  color: #fff;
  font-size: 14px;
  font-weight: 900;
}
.workflow-workspace-card small {
  color: #93a4b7;
  font-size: 12px;
  font-weight: 650;
}
.workflow-back-link {
  margin: 0 12px 16px;
  min-height: 38px;
  border: 1px solid rgba(255,255,255,.12);
  background: rgba(255,255,255,.035);
  color: #dbe5ef;
  border-radius: 9px;
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 0 12px;
  text-decoration: none;
  font-size: 13px;
  font-weight: 850;
}
.workflow-back-link:hover {
  background: rgba(255,255,255,.08);
  color: #fff;
}
.workflow-nav {
  padding: 0 12px 18px;
  display: grid;
  gap: 12px;
}
.workflow-nav section {
  border-bottom: 1px solid rgba(148,163,184,.12);
  padding-bottom: 12px;
}
.workflow-nav section:last-child { border-bottom: 0; }
.workflow-nav p {
  margin: 8px 8px 8px;
  color: #8b98aa;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: .09em;
  text-transform: uppercase;
}
.workflow-nav a,
.workflow-parent {
  min-height: 38px;
  display: flex;
  align-items: center;
  gap: 11px;
  padding: 0 10px;
  border-radius: 6px;
  color: #dbe5ef;
  text-decoration: none;
  font-size: 14px;
  font-weight: 750;
}
.workflow-nav a:hover { background: rgba(255,255,255,.06); }
.workflow-nav a.active,
.workflow-parent.active {
  background: #0f9f5f;
  color: #fff;
}
.workflow-nav a b {
  margin-left: auto;
  min-width: 20px;
  height: 20px;
  border-radius: 6px;
  background: rgba(148,163,184,.16);
  color: #c9d4e2;
  display: grid;
  place-items: center;
  font-size: 11px;
}
.workflow-nav a.active b {
  background: rgba(255,255,255,.18);
  color: #fff;
}
.workflow-profile {
  margin-top: auto;
  min-height: 72px;
  border-top: 1px solid rgba(148,163,184,.12);
  padding: 12px 18px;
  display: flex;
  align-items: center;
  gap: 10px;
}
.workflow-profile > span,
.workflow-user {
  width: 34px;
  height: 34px;
  border-radius: 999px;
  background: #0f9f5f;
  color: #fff;
  display: grid;
  place-items: center;
  font-size: 13px;
  font-weight: 900;
}
.workflow-profile div {
  min-width: 0;
  display: grid;
  gap: 2px;
  flex: 1;
}
.workflow-profile strong {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 13px;
}
.workflow-profile small {
  color: #9ca8b8;
  font-size: 11px;
}
.workflow-main {
  min-width: 0;
  min-height: 100vh;
  background: #fbfbfc;
}
.workflow-topbar {
  height: 66px;
  border-bottom: 1px solid #e5e7eb;
  background: rgba(255,255,255,.94);
  display: grid;
  grid-template-columns: minmax(180px, 280px) minmax(320px, 560px) minmax(220px, 1fr);
  align-items: center;
  gap: 18px;
  padding: 0 28px;
  position: sticky;
  top: 0;
  z-index: 40;
}
.workflow-title {
  display: flex;
  align-items: center;
  gap: 10px;
  color: #111827;
}
.workflow-title button {
  border: 0;
  background: transparent;
  display: none;
  place-items: center;
  cursor: pointer;
}
.workflow-title svg {
  color: #0f9f5f;
}
.workflow-title strong {
  font-size: 14px;
  font-weight: 900;
}
.workflow-search {
  height: 42px;
  border: 1px solid #dfe3ea;
  border-radius: 6px;
  background: #fff;
  color: #8a95a3;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 0 13px;
}
.workflow-search input {
  min-width: 0;
  width: 100%;
  border: 0;
  outline: 0;
  background: transparent;
  color: #111827;
  font: inherit;
  font-size: 13px;
}
.workflow-search kbd {
  border: 1px solid #e0e4eb;
  background: #f6f7f9;
  border-radius: 5px;
  color: #9aa3af;
  font-size: 11px;
  padding: 1px 6px;
}
.workflow-actions {
  justify-self: end;
  display: flex;
  align-items: center;
  gap: 14px;
  color: #4b5563;
}
.workflow-actions button {
  position: relative;
  width: 32px;
  height: 32px;
  border: 0;
  background: transparent;
  color: inherit;
  display: grid;
  place-items: center;
  cursor: pointer;
}
.workflow-actions button span {
  position: absolute;
  top: 5px;
  right: 6px;
  width: 8px;
  height: 8px;
  border-radius: 999px;
  background: #ef4444;
  border: 2px solid #fff;
}
.workflow-content {
  min-width: 0;
  padding-inline: max(0px, calc((100% - var(--wf-content-max)) / 2));
}
@media (max-width: 1024px) {
  .workflow-workspace {
    grid-template-columns: 1fr;
  }
  .workflow-sidebar {
    display: none;
  }
  .workflow-topbar {
    grid-template-columns: 1fr;
    height: auto;
    padding: 12px 16px;
  }
  .workflow-title button {
    display: grid;
  }
  .workflow-actions {
    justify-self: start;
  }
}
`
