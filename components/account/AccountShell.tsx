'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import {
  Bell,
  Building2,
  ChevronDown,
  Grid3X3,
  HelpCircle,
  Menu,
  MoreHorizontal,
  Search,
  Settings,
  ShieldCheck,
  UserRound,
  UsersRound,
  X,
} from 'lucide-react'

const teal = '#0f7f86'

const sidebarSections = [
  {
    items: [
      { label: 'My account', href: '/account/my-account', icon: UserRound },
      { label: 'Account security', href: '/account/account-security', icon: ShieldCheck },
      { label: 'Applications', href: '/account/applications', icon: Grid3X3 },
    ],
  },
  {
    label: 'Users and groups',
    items: [
      { label: 'Users', href: '/account/users', icon: UsersRound },
      { label: 'Guests', href: '/account/guests', icon: UsersRound },
      { label: 'User groups', href: '/account/user-groups', icon: UsersRound },
    ],
  },
  {
    label: 'Company',
    items: [
      { label: 'General info', href: '/account/general-info', icon: Building2 },
      { label: 'Offices', href: '/account/offices', icon: Building2 },
      { label: 'Admin roles', href: '/account/admin-roles', icon: UsersRound },
      { label: 'Customizations', href: '/account/customizations', icon: Settings },
      { label: 'System settings', href: '/account/system-settings', icon: Settings },
    ],
  },
]

const topTabs = [
  { label: 'Accounts & Settings', href: '/account/general-info' },
  { label: 'System Securities', href: '/account/account-security' },
  { label: 'APIs & Integrations', href: '/account/applications' },
  { label: 'Subscription Plans', href: '/account/applications' },
]

const mobileNavItems = [
  { label: 'Profile', href: '/account/my-account', icon: UserRound },
  { label: 'Security', href: '/account/account-security', icon: ShieldCheck },
  { label: 'Apps', href: '/account/applications', icon: Grid3X3 },
  { label: 'Users', href: '/account/users', icon: UsersRound },
  { label: 'Settings', href: '/account/system-settings', icon: Settings },
]

const searchableItems = sidebarSections.flatMap(section => section.items)
const accountWorkspaceUpdatedEvent = 'wiseflow:account-workspace-updated'

type AccountShellProfileUpdate = {
  viewerName?: string
  companyName?: string
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map(part => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || 'RR'
}

function isActive(pathname: string, href: string) {
  if (href === '/account/general-info') return pathname === '/account' || pathname === href
  return pathname === href || pathname.startsWith(`${href}/`)
}

export default function AccountShell({
  children,
  viewerName,
  companyName,
}: {
  children: React.ReactNode
  viewerName: string
  companyName: string
}) {
  const pathname = usePathname()
  const router = useRouter()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [activePanel, setActivePanel] = useState<'help' | 'notices' | 'launcher' | 'more' | ''>('')
  const [shellMessage, setShellMessage] = useState('')
  const [profile, setProfile] = useState({ viewerName, companyName })

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setSidebarOpen(false)
        setActivePanel('')
        setSearchQuery('')
      }
    }
    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [])

  useEffect(() => {
    setProfile({ viewerName, companyName })
  }, [viewerName, companyName])

  useEffect(() => {
    const syncAccountProfile = (event: Event) => {
      const detail = (event as CustomEvent<AccountShellProfileUpdate>).detail || {}
      setProfile(current => ({
        viewerName: detail.viewerName || current.viewerName,
        companyName: detail.companyName || current.companyName,
      }))
    }

    window.addEventListener(accountWorkspaceUpdatedEvent, syncAccountProfile)
    return () => window.removeEventListener(accountWorkspaceUpdatedEvent, syncAccountProfile)
  }, [])

  const displayName = profile.viewerName || 'Account user'
  const displayCompanyName = profile.companyName || 'WiseFlow Company'
  const searchResults = useMemo(() => {
    const needle = searchQuery.trim().toLowerCase()
    if (!needle) return []
    return searchableItems.filter(item => item.label.toLowerCase().includes(needle)).slice(0, 6)
  }, [searchQuery])

  const openPanel = (panel: typeof activePanel, message: string) => {
    setSearchQuery('')
    setActivePanel(current => current === panel ? '' : panel)
    setShellMessage(message)
  }

  const navigateTo = (href: string, message?: string) => {
    setSidebarOpen(false)
    setActivePanel('')
    setSearchQuery('')
    if (message) setShellMessage(message)
    router.push(href)
  }

  return (
    <div className="account-workspace-shell">
      <style>{accountShellCss}</style>
      {shellMessage && (
        <button type="button" className="account-shell-message" onClick={() => setShellMessage('')} aria-label="Dismiss account message">
          {shellMessage}
        </button>
      )}

      <header className="account-topbar">
        <div className="account-topbar-left">
          <button type="button" className="account-topbar-icon" aria-label="Open account navigation" aria-expanded={sidebarOpen} onClick={() => setSidebarOpen(true)}>
            <Menu size={17} />
          </button>
          <Link href="/account" className="account-product-pill">
            <span>Account</span>
          </Link>
          <div className="account-search-wrap">
            <label className="account-top-search">
              <Search size={15} />
              <input
                aria-label="Search accounts"
                placeholder="Search accounts"
                value={searchQuery}
                onChange={event => {
                  setSearchQuery(event.target.value)
                  setActivePanel('')
                }}
                onKeyDown={event => {
                  if (event.key === 'Enter' && searchResults[0]) navigateTo(searchResults[0].href, `Opened ${searchResults[0].label}.`)
                }}
              />
            </label>
            {searchQuery && (
              <div className="account-search-popover" role="listbox" aria-label="Account search results">
                {searchResults.length ? searchResults.map(item => (
                  <button key={item.href} type="button" onClick={() => navigateTo(item.href, `Opened ${item.label}.`)}>
                    <item.icon size={14} />
                    <span>{item.label}</span>
                  </button>
                )) : (
                  <span>No account pages found</span>
                )}
              </div>
            )}
          </div>
        </div>

        <nav className="account-top-tabs" aria-label="Account workspace categories">
          {topTabs.map(tab => (
            <button
              key={tab.label}
              type="button"
              className={
                (tab.label === 'Accounts & Settings' && !pathname.includes('/account-security') && !pathname.includes('/account/applications')) ||
                (tab.label === 'System Securities' && pathname.includes('/account/account-security')) ||
                (tab.label === 'APIs & Integrations' && pathname.includes('/account/applications'))
                  ? 'active'
                  : undefined
              }
              onClick={() => navigateTo(tab.href, tab.label === 'Subscription Plans' ? 'Subscription plan controls are shown in Applications.' : `Opened ${tab.label}.`)}
            >
              {tab.label}
            </button>
          ))}
        </nav>

        <div className="account-top-actions">
          <button type="button" aria-label="Help" aria-expanded={activePanel === 'help'} onClick={() => openPanel('help', 'Account help is open.')}>
            <HelpCircle size={15} />
          </button>
          <button type="button" aria-label="System notices" aria-expanded={activePanel === 'notices'} onClick={() => openPanel('notices', 'System notices are open.')}>
            <Bell size={15} />
          </button>
          <span className="account-user-avatar">{initials(displayName).slice(0, 1)}</span>
          <strong>{displayName.split(' ')[0] || 'User'}</strong>
        </div>
      </header>

      {activePanel && (
        <div className="account-shell-panel" role="dialog" aria-label="Account quick panel">
          {activePanel === 'help' && (
            <>
              <strong>Account help</strong>
              <button type="button" onClick={() => navigateTo('/account/account-security', 'Opened security help context.')}>Security and login help</button>
              <button type="button" onClick={() => navigateTo('/account/users', 'Opened user management help context.')}>User management help</button>
            </>
          )}
          {activePanel === 'notices' && (
            <>
              <strong>System notices</strong>
              <span>No unread account notices.</span>
              <button type="button" onClick={() => navigateTo('/account/system-settings', 'Opened system settings.')}>Review settings</button>
            </>
          )}
          {activePanel === 'launcher' && (
            <>
              <strong>Account launcher</strong>
              {searchableItems.slice(0, 6).map(item => (
                <button key={item.href} type="button" onClick={() => navigateTo(item.href, `Opened ${item.label}.`)}>
                  <item.icon size={14} />
                  {item.label}
                </button>
              ))}
            </>
          )}
          {activePanel === 'more' && (
            <>
              <strong>Quick actions</strong>
              <button type="button" onClick={() => navigateTo('/account/my-account', 'Opened your account profile.')}>My profile</button>
              <button type="button" onClick={() => navigateTo('/account/general-info', 'Opened company information.')}>Company profile</button>
              <button type="button" onClick={() => navigateTo('/account/system-settings', 'Opened system settings.')}>System settings</button>
            </>
          )}
        </div>
      )}

      <button
        type="button"
        className={`account-mobile-backdrop${sidebarOpen ? ' is-open' : ''}`}
        aria-label="Close account navigation"
        onClick={() => setSidebarOpen(false)}
      />

      <div className="account-body">
        <aside className={`account-sidepanel${sidebarOpen ? ' is-open' : ''}`}>
          <div className="account-side-profile">
            <span className="account-profile-avatar">{initials(displayName).slice(0, 1)}</span>
            <span className="account-profile-copy">
              <strong>{displayName}</strong>
              <small>{displayCompanyName}</small>
            </span>
            <button type="button" className="account-side-close" aria-label="Close account navigation" onClick={() => setSidebarOpen(false)}>
              <X size={16} />
            </button>
          </div>

          <nav className="account-side-nav" aria-label="Account navigation">
            {sidebarSections.map((section, index) => (
              <div key={section.label || `top-${index}`} className="account-nav-section">
                {section.label && (
                  <div className="account-nav-label">
                    <span>{section.label === 'Company' ? displayCompanyName : section.label}</span>
                    <ChevronDown size={13} />
                  </div>
                )}
                {section.items.map(item => {
                  const Icon = item.icon
                  const active = isActive(pathname, item.href)
                  return (
                    <Link key={item.href} href={item.href} className={`account-nav-row${active ? ' active' : ''}`} onClick={() => setSidebarOpen(false)}>
                      <Icon size={15} />
                      <span>{item.label}</span>
                    </Link>
                  )
                })}
              </div>
            ))}
          </nav>

          <div className="account-side-footer">
            <button type="button" aria-label="App launcher" aria-expanded={activePanel === 'launcher'} onClick={() => openPanel('launcher', 'Account launcher is open.')}><Grid3X3 size={15} /></button>
            <button type="button" onClick={() => openPanel('help', 'Support options are open.')}><HelpCircle size={15} /> Support chat</button>
            <button type="button" aria-label="More" aria-expanded={activePanel === 'more'} onClick={() => openPanel('more', 'Quick account actions are open.')}><MoreHorizontal size={16} /></button>
          </div>
        </aside>

        <main className="account-workspace-content">{children}</main>
      </div>

      <nav className="account-mobile-tabbar" aria-label="Account mobile navigation">
        {mobileNavItems.map(item => {
          const Icon = item.icon
          const active = isActive(pathname, item.href)
          return (
            <Link key={item.href} href={item.href} className={active ? 'active' : undefined} onClick={() => {
              setSidebarOpen(false)
              setActivePanel('')
              setSearchQuery('')
            }}>
              <Icon size={18} />
              <span>{item.label}</span>
            </Link>
          )
        })}
      </nav>
    </div>
  )
}

const accountShellCss = `
.account-workspace-shell {
  min-height: 100vh;
  height: 100dvh;
  overflow: hidden;
  background: #f3f4f6;
  color: #050505;
  font-family: var(--font-body);
}

.account-shell-message {
  position: fixed;
  z-index: 170;
  top: 50px;
  right: 12px;
  max-width: min(360px, calc(100vw - 24px));
  border: 1px solid #b7ebc6;
  border-radius: 4px;
  background: #ecfdf3;
  color: #166534;
  padding: 10px 12px;
  text-align: left;
  font-size: 13px;
  font-weight: 750;
  box-shadow: 0 12px 34px rgba(15,23,42,.14);
  cursor: pointer;
}

.account-shell-panel,
.account-search-popover {
  z-index: 160;
  border: 1px solid #d8dadd;
  border-radius: 4px;
  background: #ffffff;
  color: #050505;
  box-shadow: 0 18px 50px rgba(15,23,42,.18);
}

.account-shell-panel {
  position: fixed;
  top: 46px;
  right: 8px;
  width: min(280px, calc(100vw - 16px));
  padding: 10px;
  display: grid;
  gap: 6px;
}

.account-shell-panel strong {
  padding: 6px 8px;
  font-size: 12px;
  font-weight: 850;
}

.account-shell-panel span {
  padding: 6px 8px;
  color: #6d737b;
  font-size: 12px;
}

.account-shell-panel button,
.account-search-popover button {
  min-height: 34px !important;
  border: 0;
  border-radius: 3px;
  background: transparent;
  color: #30343a;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 9px;
  text-align: left;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
}

.account-shell-panel button:hover,
.account-search-popover button:hover {
  background: #f1f3f5;
  color: #050505;
}

.account-topbar {
  height: 42px;
  display: grid;
  grid-template-columns: minmax(300px, 1fr) auto minmax(250px, 1fr);
  align-items: center;
  gap: 14px;
  padding: 0 8px;
  background: ${teal};
  color: #ffffff;
}

.account-topbar-left,
.account-top-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.account-search-wrap {
  position: relative;
}

.account-top-actions {
  justify-content: flex-end;
}

.account-topbar button,
.account-product-pill {
  min-height: 30px !important;
}

.account-topbar-icon,
.account-top-actions button {
  width: 30px;
  height: 30px;
  border: 0;
  border-radius: 3px;
  background: rgba(255,255,255,.12);
  color: #e8fbfd;
  display: grid;
  place-items: center;
  cursor: pointer;
}

.account-product-pill {
  border-radius: 3px;
  background: rgba(255,255,255,.12);
  color: #ffffff;
  text-decoration: none;
  padding: 0 11px;
  display: inline-flex;
  align-items: center;
  font-size: 13px;
  font-weight: 850;
}

.account-top-search {
  width: min(220px, 35vw);
  height: 30px;
  border-radius: 3px;
  background: rgba(255,255,255,.16);
  color: rgba(255,255,255,.74);
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 10px;
}

.account-top-search input {
  min-height: 0;
  height: 100%;
  width: 100%;
  border: 0;
  outline: 0;
  background: transparent;
  color: #ffffff;
  font-size: 13px;
}

.account-top-search input::placeholder {
  color: rgba(255,255,255,.68);
  opacity: 1;
}

.account-search-popover {
  position: absolute;
  top: 38px;
  left: 0;
  width: 260px;
  padding: 7px;
  display: grid;
  gap: 3px;
}

.account-search-popover span {
  padding: 9px;
  color: #6d737b;
  font-size: 12px;
}

.account-top-tabs {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
}

.account-top-tabs button {
  height: 32px;
  border: 0;
  border-radius: 3px;
  background: transparent;
  color: rgba(255,255,255,.72);
  padding: 0 15px;
  font-size: 12px;
  font-weight: 850;
  text-transform: uppercase;
  white-space: nowrap;
  cursor: pointer;
}

.account-top-tabs button.active {
  background: rgba(255,255,255,.12);
  color: #ffffff;
}

.account-user-avatar {
  width: 26px;
  height: 26px;
  border-radius: 50%;
  background: #a594f9;
  color: #ffffff;
  display: grid;
  place-items: center;
  font-weight: 850;
  font-size: 12px;
}

.account-top-actions strong {
  font-size: 12px;
  font-weight: 850;
  white-space: nowrap;
}

.account-body {
  height: calc(100dvh - 42px);
  display: grid;
  grid-template-columns: 220px minmax(0, 1fr);
  min-width: 0;
}

.account-sidepanel {
  min-height: 0;
  height: 100%;
  display: flex;
  flex-direction: column;
  background: #f7f7f8;
  border-right: 1px solid #d8dadd;
  color: #30343a;
}

.account-side-profile {
  min-height: 82px;
  display: grid;
  grid-template-columns: 42px minmax(0, 1fr) 26px;
  align-items: center;
  gap: 9px;
  padding: 13px 11px;
}

.account-profile-avatar {
  width: 42px;
  height: 42px;
  border-radius: 50%;
  background: #a594f9;
  color: #ffffff;
  display: grid;
  place-items: center;
  font-weight: 850;
  font-size: 16px;
}

.account-profile-copy {
  min-width: 0;
}

.account-profile-copy strong,
.account-profile-copy small {
  display: block;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.account-profile-copy strong {
  color: #050505;
  font-size: 14px;
  font-weight: 850;
  line-height: 1.15;
}

.account-profile-copy small {
  margin-top: 4px;
  color: #8b8f96;
  font-size: 12px;
}

.account-side-close {
  display: none;
  width: 28px;
  height: 28px;
  border: 1px solid #d8dadd;
  border-radius: 4px;
  background: #ffffff;
  color: #2d3137;
  cursor: pointer;
}

.account-side-nav {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  display: grid;
  align-content: start;
  gap: 16px;
  padding: 0 9px 16px;
}

.account-nav-section {
  display: grid;
  gap: 5px;
}

.account-nav-label {
  min-height: 24px;
  padding: 0 6px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  color: #8b8f96;
  font-size: 10px;
  font-weight: 850;
  text-transform: uppercase;
}

.account-nav-label span {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.account-nav-row {
  min-height: 36px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 0 10px;
  color: #444a51;
  text-decoration: none;
  font-size: 13px;
  font-weight: 650;
}

.account-nav-row svg {
  color: #696f77;
  flex: 0 0 auto;
}

.account-nav-row span {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.account-nav-row:hover {
  background: #eeeeef;
  color: #050505;
}

.account-nav-row.active {
  background: ${teal};
  color: #ffffff;
  font-weight: 850;
}

.account-nav-row.active svg {
  color: #ffffff;
}

.account-side-footer {
  height: 39px;
  border-top: 1px solid #d8dadd;
  display: grid;
  grid-template-columns: 34px minmax(0, 1fr) 34px;
}

.account-side-footer button {
  border: 0;
  border-right: 1px solid #d8dadd;
  border-radius: 0 !important;
  background: transparent;
  color: #8b8f96;
  min-height: 39px !important;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  font-size: 12px;
  cursor: pointer;
  white-space: nowrap;
  overflow: hidden;
}

.account-side-footer button:last-child {
  border-right: 0;
}

.account-workspace-content {
  min-width: 0;
  min-height: 0;
  overflow: auto;
  background: #f3f4f6;
}

.account-mobile-backdrop {
  display: none;
}

.account-mobile-tabbar {
  display: none;
}

@media (max-width: 1080px) {
  .account-topbar {
    grid-template-columns: minmax(260px, 1fr) minmax(0, auto);
  }

  .account-top-tabs {
    display: none;
  }
}

@media (max-width: 1024px) {
  .account-workspace-shell {
    height: auto;
    overflow: visible;
  }

  .account-topbar {
    position: sticky;
    top: 0;
    z-index: 100;
    grid-template-columns: minmax(0, 1fr);
    height: auto;
    min-height: 48px;
    padding: 6px 8px;
  }

  .account-topbar-left {
    width: 100%;
  }

  .account-search-wrap {
    min-width: 0;
    flex: 1;
  }

  .account-top-search {
    flex: 1;
    width: auto;
    height: 36px;
  }

  .account-topbar button,
  .account-product-pill {
    min-height: 36px !important;
  }

  .account-topbar-icon {
    width: 36px;
    height: 36px;
  }

  .account-top-actions {
    display: none;
  }

  .account-body {
    display: block;
    height: auto;
    min-height: calc(100vh - 48px);
  }

  .account-sidepanel {
    position: fixed;
    z-index: 130;
    inset: 0 auto 0 0;
    width: min(88vw, 320px);
    height: 100dvh;
    transform: translateX(-105%);
    transition: transform 180ms ease;
    box-shadow: 18px 0 60px rgba(15,23,42,.22);
  }

  .account-sidepanel.is-open {
    transform: translateX(0);
  }

  .account-side-close {
    display: grid;
    place-items: center;
  }

  .account-mobile-backdrop {
    position: fixed;
    inset: 0;
    z-index: 120;
    border: 0;
    background: rgba(15,23,42,.44);
    opacity: 0;
    pointer-events: none;
    transition: opacity 180ms ease;
    display: block;
  }

  .account-mobile-backdrop.is-open {
    opacity: 1;
    pointer-events: auto;
  }

  .account-workspace-content {
    min-height: calc(100vh - 48px);
    overflow: visible;
    padding-bottom: calc(72px + env(safe-area-inset-bottom));
  }

  .account-shell-message {
    top: 58px;
    left: 8px;
    right: 8px;
    max-width: none;
  }

  .account-shell-panel {
    top: 58px;
    left: 8px;
    right: 8px;
    width: auto;
    max-height: min(420px, calc(100dvh - 118px));
    overflow-y: auto;
  }

  .account-search-popover {
    width: min(320px, calc(100vw - 16px));
  }

  .account-mobile-tabbar {
    position: fixed;
    z-index: 110;
    left: 0;
    right: 0;
    bottom: 0;
    min-height: calc(58px + env(safe-area-inset-bottom));
    border-top: 1px solid #d8dadd;
    background: #ffffff;
    display: grid;
    grid-template-columns: repeat(5, minmax(0, 1fr));
    gap: 2px;
    padding: 5px 4px calc(5px + env(safe-area-inset-bottom));
    box-shadow: 0 -10px 28px rgba(15,23,42,.1);
  }

  .account-mobile-tabbar a {
    min-width: 0;
    min-height: 48px;
    border-radius: 4px;
    color: #606773;
    display: grid;
    place-items: center;
    align-content: center;
    gap: 2px;
    text-decoration: none;
    font-size: 10px;
    font-weight: 850;
  }

  .account-mobile-tabbar a.active {
    background: #e7f6f7;
    color: ${teal};
  }

  .account-mobile-tabbar svg {
    color: currentColor;
  }

  .account-mobile-tabbar span {
    min-width: 0;
    max-width: 100%;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}

@media (max-width: 460px) {
  .account-product-pill {
    display: none;
  }
}
`
