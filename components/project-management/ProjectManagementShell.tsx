'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { ArrowLeft, Bell, ChevronDown, ChevronRight, FolderKanban, HelpCircle, Home, Menu, Settings, X } from 'lucide-react'
import { getProjectManagementRouteMeta, projectManagementNavItems } from './projectManagementNav'

export default function ProjectManagementShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const activeView = searchParams.get('view') || 'overview'
  const legacyHref = activeView === 'overview' ? '/project-management' : `/project-management/${activeView}`
  const routeMeta = getProjectManagementRouteMeta(pathname)
  const legacyMeta = pathname === '/project-management'
    ? projectManagementNavItems.find(item => item.href === legacyHref)
    : undefined
  const activeMeta = legacyMeta || routeMeta
  const activeHref = activeMeta.href
  const breadcrumbLabel = activeMeta.label === 'Overview' ? 'Project Management' : activeMeta.label
  const [mobileOpen, setMobileOpen] = useState(false)
  const displayName = 'Reymark'

  const displayInitial = (displayName.trim().charAt(0) || 'R').toUpperCase()

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMobileOpen(false)
    }
    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [])

  const isActive = (href: string) => {
    return href === activeHref
  }

  return (
    <div className="project-workspace-shell">
      <style>{projectManagementShellCss}</style>
      <button
        type="button"
        aria-label="Close project management navigation"
        className={mobileOpen ? 'project-workspace-backdrop is-open' : 'project-workspace-backdrop'}
        onClick={() => setMobileOpen(false)}
      />

      <aside className={mobileOpen ? 'project-workspace-sidebar is-open' : 'project-workspace-sidebar'}>
        <div className="project-workspace-brand">
          <span className="project-workspace-mark"><FolderKanban size={20} /></span>
          <span>
            <strong>Project Management</strong>
            <small>Delivery workspace</small>
          </span>
          <button type="button" className="project-workspace-close" aria-label="Close project management navigation" onClick={() => setMobileOpen(false)}>
            <X size={17} />
          </button>
        </div>

        <Link href="/dashboard" className="project-workspace-back-link" onClick={() => setMobileOpen(false)}>
          <ArrowLeft size={15} />
          Back to WiseFlow
        </Link>

        <div className="project-workspace-nav-label">Workspace</div>
        <nav className="project-workspace-nav" aria-label="Project management workspace navigation">
          {projectManagementNavItems.map(item => {
            const Icon = item.icon
            const active = isActive(item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                className={active ? 'project-workspace-nav-row active' : 'project-workspace-nav-row'}
                onClick={() => setMobileOpen(false)}
              >
                <Icon size={16} />
                <span>{item.label}</span>
              </Link>
            )
          })}
        </nav>
      </aside>

      <div className="project-workspace-main">
        <header className="project-workspace-topbar">
          <div className="project-workspace-breadcrumb">
            <button type="button" className="project-workspace-menu" aria-label="Open project management navigation" onClick={() => setMobileOpen(true)}>
              <Menu size={19} />
            </button>
            <Home size={13} />
            <ChevronRight size={12} />
            <span>{breadcrumbLabel}</span>
          </div>
          <div className="project-workspace-actions">
            <button type="button" className="project-workspace-action project-workspace-action-badge" aria-label="Notifications">
              <Bell size={17} />
              <span>2</span>
            </button>
            <button type="button" className="project-workspace-action" aria-label="Help">
              <HelpCircle size={17} />
            </button>
            <Link href="/settings" className="project-workspace-action" aria-label="Settings">
              <Settings size={17} />
            </Link>
            <button type="button" className="project-workspace-user" aria-label="Open user menu">
              <span>{displayInitial}</span>
              <strong>{displayName}</strong>
              <ChevronDown size={14} />
            </button>
          </div>
        </header>
        <main className="project-workspace-content">{children}</main>
      </div>
    </div>
  )
}

const projectManagementShellCss = `
.project-workspace-shell {
  min-height: 100vh;
  height: 100dvh;
  overflow: hidden;
  display: grid;
  grid-template-columns: 264px minmax(0, 1fr);
  background: #f8fafc;
  color: #0f172a;
  font-family: var(--font-body);
}
.project-workspace-shell * { box-sizing: border-box; }
.project-workspace-sidebar {
  height: 100dvh;
  min-height: 0;
  background: #050505;
  color: #e5e7eb;
  padding: 18px 12px;
  display: flex;
  flex-direction: column;
  gap: 14px;
  overflow: hidden;
}
.project-workspace-brand {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 0 6px 4px;
}
.project-workspace-mark {
  width: 36px;
  height: 36px;
  border-radius: 9px;
  display: grid;
  place-items: center;
  background: #16a34a;
  color: #fff;
  flex: 0 0 auto;
}
.project-workspace-brand strong {
  display: block;
  color: #f8fafc;
  font-size: 15px;
  line-height: 1;
  font-weight: 800;
}
.project-workspace-brand small {
  display: block;
  color: #000000;
  font-size: 12px;
  margin-top: 5px;
  font-weight: 650;
}
.project-workspace-close {
  display: none;
  margin-left: auto;
  width: 34px;
  height: 34px;
  border: 1px solid rgba(148, 163, 184, .22);
  border-radius: 8px;
  background: transparent;
  color: #e2e8f0;
  place-items: center;
}
.project-workspace-back-link {
  min-height: 38px;
  border: 1px solid rgba(148, 163, 184, .22);
  border-radius: 8px;
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 0 10px;
  color: #e2e8f0;
  text-decoration: none;
  font-size: 13px;
  font-weight: 850;
  background: rgba(255,255,255,.03);
}
.project-workspace-nav-label {
  color: #000000;
  font-size: 10px;
  font-weight: 900;
  letter-spacing: .8px;
  text-transform: uppercase;
  padding: 0 10px;
}
.project-workspace-nav {
  display: grid;
  gap: 4px;
  overflow-y: auto;
  min-height: 0;
  padding-right: 2px;
}
.project-workspace-nav-row {
  min-height: 38px;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 0 10px;
  border-radius: 8px;
  color: #000000;
  text-decoration: none;
  font-size: 13px;
  font-weight: 800;
}
.project-workspace-nav-row svg {
  color: #000000;
  flex: 0 0 auto;
}
.project-workspace-nav-row:hover {
  background: rgba(255,255,255,.06);
  color: #f8fafc;
}
.project-workspace-nav-row.active {
  background: #dcfce7;
  color: #052e16;
}
.project-workspace-nav-row.active svg {
  color: #16a34a;
}
.project-workspace-main {
  min-width: 0;
  height: 100dvh;
  display: grid;
  grid-template-rows: 74px minmax(0, 1fr);
  overflow: hidden;
}
.project-workspace-topbar {
  position: sticky;
  top: 0;
  z-index: 40;
  border-bottom: 1px solid #e8edf4;
  background: rgba(255,255,255,.95);
  backdrop-filter: blur(16px);
  display: grid;
  grid-template-columns: minmax(220px, 1fr) max-content;
  align-items: center;
  gap: 18px;
  padding: 0 28px;
}
.project-workspace-title-block {
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 12px;
}
.project-workspace-title-block strong {
  display: block;
  color: #0f172a;
  font-size: 15px;
  font-weight: 950;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.project-workspace-title-block small {
  display: block;
  color: #000000;
  font-size: 12px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.project-workspace-menu,
.project-workspace-alert {
  width: 40px;
  height: 40px;
  border-radius: 8px;
  border: 1px solid #e5e7eb;
  background: #fff;
  color: #0f172a;
  display: grid;
  place-items: center;
  cursor: pointer;
}
.project-workspace-menu { display: none; }
.project-workspace-active-icon {
  width: 38px;
  height: 38px;
  border-radius: 10px;
  background: #ecfdf5;
  color: #16a34a;
  display: grid;
  place-items: center;
  flex: 0 0 auto;
}
.project-workspace-search {
  height: 40px;
  width: 100%;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #fff;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 0 14px;
  color: #000000;
}
.project-workspace-search input {
  min-width: 0;
  flex: 1;
  border: 0;
  outline: 0;
  background: transparent;
  color: #0f172a;
  font: inherit;
  font-size: 13px;
}
.project-workspace-content {
  min-width: 0;
  min-height: 0;
  overflow: auto;
  background: #f8fafc;
  padding: 24px;
}
.project-workspace-content .pm-shell {
  min-height: 100%;
}
.project-workspace-backdrop {
  display: none;
}
@media (max-width: 1120px) {
  .project-workspace-shell {
    grid-template-columns: 82px minmax(0, 1fr);
  }
  .project-workspace-sidebar {
    padding: 18px 8px;
  }
  .project-workspace-brand { justify-content: center; padding: 0 0 4px; }
  .project-workspace-brand span:last-child,
  .project-workspace-back-link,
  .project-workspace-nav-label,
  .project-workspace-nav-row span {
    display: none;
  }
  .project-workspace-nav-row {
    justify-content: center;
    padding: 0;
  }
}
@media (max-width: 820px) {
  .project-workspace-shell {
    display: block;
    height: auto;
    min-height: 100vh;
    overflow: visible;
  }
  .project-workspace-sidebar {
    position: fixed;
    inset: 0 auto 0 0;
    width: min(86vw, 300px);
    z-index: 1000;
    transform: translateX(-105%);
    transition: transform 180ms ease;
    padding: 18px 12px;
  }
  .project-workspace-sidebar.is-open {
    transform: translateX(0);
  }
  .project-workspace-brand { justify-content: flex-start; padding: 0 6px 4px; }
  .project-workspace-brand span:last-child,
  .project-workspace-back-link,
  .project-workspace-nav-label,
  .project-workspace-nav-row span {
    display: block;
  }
  .project-workspace-nav-row {
    justify-content: flex-start;
    padding: 0 10px;
  }
  .project-workspace-close {
    display: grid;
  }
  .project-workspace-backdrop {
    display: block;
    position: fixed;
    inset: 0;
    z-index: 990;
    border: 0;
    background: rgba(15, 23, 42, .42);
    opacity: 0;
    pointer-events: none;
    transition: opacity 180ms ease;
  }
  .project-workspace-backdrop.is-open {
    opacity: 1;
    pointer-events: auto;
  }
  .project-workspace-main {
    height: auto;
    min-height: 100vh;
    overflow: visible;
    display: block;
  }
  .project-workspace-content {
    overflow: visible;
    padding: 16px;
  }
  .project-workspace-topbar {
    grid-template-columns: 1fr;
    height: auto;
    min-height: 72px;
    padding: 10px 14px;
  }
  .project-workspace-menu {
    display: grid;
  }
  .project-workspace-alert {
    display: none;
  }
}

.project-workspace-shell {
  --pm-background: #050505;
  --pm-sidebar: #030303;
  --pm-card: #0b0b0b;
  --pm-card-hover: #111111;
  --pm-border: #262626;
  --pm-border-soft: #1a1a1a;
  --pm-foreground: #fafafa;
  --pm-muted: #000000;
  --pm-placeholder: #000000;
  --pm-input: #0f0f0f;
  grid-template-columns: 240px minmax(0, 1fr);
  background: var(--pm-background);
  color: var(--pm-foreground);
  font-family: var(--font-geist-sans), "Geist Sans", sans-serif;
}
.project-workspace-sidebar {
  background: var(--pm-sidebar);
  color: var(--pm-foreground);
  border-right: 1px solid var(--pm-border);
  padding: 20px 16px;
}
.project-workspace-brand {
  padding: 0 0 8px;
}
.project-workspace-mark,
.project-workspace-active-icon {
  background: var(--pm-card-hover);
  border: 1px solid var(--pm-border-soft);
  color: var(--pm-foreground);
}
.project-workspace-brand strong,
.project-workspace-title-block strong {
  color: var(--pm-foreground);
  font-size: 14px;
  font-weight: 600;
}
.project-workspace-brand small,
.project-workspace-title-block small {
  color: var(--pm-muted);
  font-size: 12px;
  font-weight: 400;
}
.project-workspace-back-link {
  min-height: 40px;
  border-color: var(--pm-border);
  border-radius: 8px;
  background: var(--pm-card);
  color: var(--pm-foreground);
  font-size: 13px;
  font-weight: 500;
}
.project-workspace-back-link:hover {
  background: var(--pm-card-hover);
  transform: none;
}
.project-workspace-nav-label {
  color: var(--pm-muted);
  font-size: 11px;
  font-weight: 500;
  letter-spacing: .08em;
}
.project-workspace-nav-row {
  min-height: 40px;
  border-radius: 8px;
  color: var(--pm-muted) !important;
  font-size: 14px !important;
  font-weight: 500 !important;
}
.project-workspace-nav-row svg {
  color: currentColor;
}
.project-workspace-nav-row:hover,
.project-workspace-nav-row.active {
  background: #18181b !important;
  color: var(--pm-foreground) !important;
}
.project-workspace-nav-row.active svg {
  color: var(--pm-foreground) !important;
}
.project-workspace-main {
  grid-template-rows: 74px minmax(0, 1fr);
  background: var(--pm-background);
}
.project-workspace-topbar {
  border-bottom: 1px solid var(--pm-border);
  background: var(--pm-background) !important;
  backdrop-filter: none;
  grid-template-columns: minmax(220px, 1fr) minmax(280px, 520px) 44px;
  padding: 0 28px;
}
.project-workspace-menu,
.project-workspace-alert,
.project-workspace-close {
  border-color: var(--pm-border);
  background: var(--pm-card);
  color: var(--pm-foreground);
}
.project-workspace-menu:hover,
.project-workspace-alert:hover,
.project-workspace-close:hover {
  background: var(--pm-card-hover);
  transform: none;
}
.project-workspace-search {
  height: 44px;
  border: 1px solid var(--pm-border);
  border-radius: 8px;
  background: var(--pm-input);
  color: var(--pm-muted);
}
.project-workspace-search input {
  color: var(--pm-foreground);
  font-size: 14px;
}
.project-workspace-search input::placeholder {
  color: var(--pm-placeholder);
}
.project-workspace-search:focus-within {
  border-color: var(--pm-foreground);
  box-shadow: 0 0 0 3px rgba(255,255,255,.12);
}
.project-workspace-content {
  background: var(--pm-background);
  padding: 24px 32px 32px;
}
@media (max-width: 1120px) {
  .project-workspace-shell {
    grid-template-columns: 82px minmax(0, 1fr);
  }
}
@media (max-width: 820px) {
  .project-workspace-sidebar {
    width: min(86vw, 300px);
  }
  .project-workspace-topbar {
    grid-template-columns: 1fr;
    padding: 10px 16px;
  }
  .project-workspace-content {
    padding: 16px;
  }
}

body .project-workspace-shell .project-workspace-main {
  grid-template-rows: 56px minmax(0, 1fr);
}
body .project-workspace-shell .project-workspace-topbar {
  height: 56px;
  min-height: 56px;
  display: grid;
  grid-template-columns: minmax(180px, 1fr) minmax(240px, auto);
  align-items: center;
  gap: 12px;
  padding: 0 16px;
  border-bottom: 1px solid var(--pm-border);
  background: var(--pm-background) !important;
}
body .project-workspace-shell .project-workspace-breadcrumb {
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 6px;
  color: var(--pm-muted);
  font-size: 13px;
  font-weight: 400;
}
body .project-workspace-shell .project-workspace-breadcrumb span {
  min-width: 0;
  overflow: hidden;
  color: var(--pm-foreground);
  font-weight: 500;
  text-overflow: ellipsis;
  white-space: nowrap;
}
body .project-workspace-shell .project-workspace-breadcrumb svg {
  flex: 0 0 auto;
  color: var(--pm-muted);
}
body .project-workspace-shell .project-workspace-search {
  justify-self: center;
  width: min(100%, 520px);
  height: 34px;
  border-radius: 8px;
  padding: 0 12px;
}
body .project-workspace-shell .project-workspace-search input {
  font-size: 13px;
}
body .project-workspace-shell .project-workspace-search kbd {
  flex: 0 0 auto;
  display: inline-flex;
  align-items: center;
  min-height: 20px;
  padding: 1px 6px;
  border: 1px solid var(--pm-border);
  border-radius: 5px;
  background: var(--pm-card);
  color: var(--pm-muted);
  font-family: var(--font-geist-sans), "Geist Sans", sans-serif;
  font-size: 11px;
  font-weight: 500;
}
body .project-workspace-shell .project-workspace-actions {
  min-width: 0;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 4px;
}
html[data-theme='dark'] body .project-workspace-shell .project-workspace-action,
html[data-theme='dark'] body .project-workspace-shell .project-workspace-user,
body .project-workspace-shell .project-workspace-action,
body .project-workspace-shell .project-workspace-user {
  height: 34px;
  border: 0 !important;
  border-radius: 8px;
  background: transparent !important;
  color: var(--pm-foreground) !important;
  display: inline-grid;
  place-items: center;
  text-decoration: none;
  box-shadow: none !important;
  cursor: pointer;
  transform: none !important;
}
body .project-workspace-shell .project-workspace-action {
  position: relative;
  width: 34px;
  flex: 0 0 34px;
}
body .project-workspace-shell .project-workspace-action:hover,
body .project-workspace-shell .project-workspace-user:hover {
  background: var(--pm-card-hover) !important;
}
body .project-workspace-shell .project-workspace-action-badge span {
  position: absolute;
  top: 3px;
  right: 3px;
  min-width: 16px;
  height: 16px;
  border-radius: 999px;
  display: grid;
  place-items: center;
  padding: 0 4px;
  background: #ef4444;
  color: #ffffff;
  font-size: 10px;
  font-weight: 700;
  line-height: 1;
}
body .project-workspace-shell .project-workspace-user {
  grid-auto-flow: column;
  grid-auto-columns: max-content;
  gap: 8px;
  min-width: 0;
  max-width: 168px;
  padding: 0 10px 0 5px;
  border: 1px solid var(--pm-border) !important;
  background: var(--pm-card) !important;
}
body .project-workspace-shell .project-workspace-user > span {
  width: 24px;
  height: 24px;
  border: 1px solid var(--pm-border-soft);
  border-radius: 999px;
  display: grid;
  place-items: center;
  background: var(--pm-card-hover);
  color: var(--pm-foreground);
  font-size: 12px;
  font-weight: 600;
}
body .project-workspace-shell .project-workspace-user strong {
  min-width: 0;
  overflow: hidden;
  color: var(--pm-foreground);
  font-size: 13px;
  font-weight: 600;
  text-overflow: ellipsis;
  white-space: nowrap;
}
body .project-workspace-shell .project-workspace-content {
  padding-top: 24px;
}
html[data-theme='light'] body .project-workspace-shell {
  --pm-background: #ffffff;
  --pm-sidebar: #ffffff;
  --pm-card: #ffffff;
  --pm-card-hover: #f4f4f5;
  --pm-border: #e5e7eb;
  --pm-border-soft: #eef2f7;
  --pm-foreground: #000000;
  --pm-muted: #000000;
  --pm-placeholder: #000000;
  --pm-input: #ffffff;
  background: var(--pm-background);
  color: var(--pm-foreground);
}
html[data-theme='light'] body .project-workspace-sidebar,
html[data-theme='light'] body .project-workspace-main,
html[data-theme='light'] body .project-workspace-content {
  background: var(--pm-background);
  color: var(--pm-foreground);
}
html[data-theme='light'] body .project-workspace-sidebar {
  border-color: var(--pm-border);
}
html[data-theme='light'] body .project-workspace-mark {
  background: #09090b;
  border-color: #09090b;
  color: #ffffff;
}
html[data-theme='light'] body .project-workspace-brand strong,
html[data-theme='light'] body .project-workspace-title-block strong {
  color: var(--pm-foreground);
}
html[data-theme='light'] body .project-workspace-brand small,
html[data-theme='light'] body .project-workspace-title-block small,
html[data-theme='light'] body .project-workspace-nav-label {
  color: var(--pm-muted);
}
html[data-theme='light'] body .project-workspace-back-link {
  background: var(--pm-card);
  border-color: var(--pm-border);
  color: var(--pm-foreground);
}
html[data-theme='light'] body .project-workspace-back-link:hover,
html[data-theme='light'] body .project-workspace-nav-row:hover,
html[data-theme='light'] body .project-workspace-nav-row.active {
  background: var(--pm-card-hover) !important;
  color: var(--pm-foreground) !important;
}
html[data-theme='light'] body .project-workspace-nav-row {
  color: var(--pm-muted) !important;
}
html[data-theme='light'] body .project-workspace-nav-row.active {
  box-shadow: inset 2px 0 0 var(--pm-foreground);
}
html[data-theme='light'] body .project-workspace-search {
  border-color: #d4d4d8;
  background: var(--pm-input);
  color: var(--pm-muted);
}
html[data-theme='light'] body .project-workspace-search input {
  color: var(--pm-foreground);
}
html[data-theme='light'] body .project-workspace-search input::placeholder {
  color: var(--pm-placeholder);
}
html[data-theme='light'] body .project-workspace-search:focus-within {
  border-color: var(--pm-foreground);
  box-shadow: 0 0 0 3px rgba(9,9,11,.08);
}
html[data-theme='light'] body .project-workspace-search kbd {
  background: #fafafa;
  border-color: #d4d4d8;
  color: #374151;
}
@media (max-width: 820px) {
  body .project-workspace-shell .project-workspace-topbar {
    height: auto;
    min-height: 56px;
    grid-template-columns: 1fr auto;
    padding: 10px 16px;
  }
  body .project-workspace-shell .project-workspace-search {
    grid-column: 1 / -1;
    order: 3;
    width: 100%;
  }
  body .project-workspace-shell .project-workspace-actions {
    justify-content: flex-end;
  }
  body .project-workspace-shell .project-workspace-user strong,
  body .project-workspace-shell .project-workspace-user svg {
    display: none;
  }
  body .project-workspace-shell .project-workspace-user {
    width: 34px;
    padding: 0;
  }
}
@media (max-width: 1180px) {
  body .project-workspace-shell .project-workspace-topbar {
    grid-template-columns: minmax(160px, 1fr) auto;
  }
  body .project-workspace-shell .project-workspace-content {
    padding-left: 20px;
    padding-right: 20px;
  }
}
@media (max-width: 940px) {
  body .project-workspace-shell .project-workspace-topbar {
    height: auto;
    min-height: 56px;
    grid-template-columns: minmax(0, 1fr) auto;
    padding: 10px 16px;
  }
  body .project-workspace-shell .project-workspace-search {
    grid-column: 1 / -1;
    order: 3;
    width: 100%;
  }
  body .project-workspace-shell .project-workspace-actions {
    justify-content: flex-end;
  }
}
`
