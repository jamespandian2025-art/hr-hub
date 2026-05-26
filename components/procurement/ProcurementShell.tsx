'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import {
  ArrowLeft,
  Menu,
  Search,
  X,
} from 'lucide-react'
import CompanySwitcher from '@/components/CompanySwitcher'
import { getProcurementRouteMeta, procurementWorkspaceMenu } from '@/config/procurement-menu'

const font = 'var(--font-body)'

const sidebarColors = {
  bg: '#030303',
  surface: '#1f1f1f',
  surfaceHover: '#151515',
  border: '#242424',
  text: 'rgb(237, 237, 237)',
  muted: '#a1a1a1',
  faint: '#737373',
  icon: '#a1a1a1',
  activeBg: '#dcfce7',
  activeText: '#052e16',
  activeIcon: '#16a34a',
}

export default function ProcurementShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const activeMeta = getProcurementRouteMeta(pathname)
  const ActiveIcon = activeMeta.icon
  const [sidebarOpen, setSidebarOpen] = useState(false)

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setSidebarOpen(false)
    }
    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [])

  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`)

  return (
    <div className="procurement-workspace-shell" style={{ fontFamily: font }}>
      <style>{procurementShellCss}</style>
      <button
        type="button"
        className={`procurement-mobile-backdrop${sidebarOpen ? ' is-open' : ''}`}
        aria-label="Close procurement navigation"
        onClick={() => setSidebarOpen(false)}
      />

      <aside className={`procurement-sidepanel${sidebarOpen ? ' is-open' : ''}`} style={{ background: '#000000' }}>
        <div className="procurement-sidebar-card" style={{ background: sidebarColors.bg, color: sidebarColors.text, borderColor: sidebarColors.border }}>
          <div className="procurement-sidebar-brand">
            <span className="procurement-sidebar-logo">P</span>
            <span className="procurement-sidebar-copy">
              <span>Procurement</span>
              <small>Supply chain workspace</small>
            </span>
            <button type="button" className="procurement-sidebar-close" aria-label="Close procurement navigation" onClick={() => setSidebarOpen(false)}>
              <X size={17} />
            </button>
          </div>

          <Link href="/dashboard" className="procurement-back-link" onClick={() => setSidebarOpen(false)}>
            <ArrowLeft size={15} />
            Back to WiseFlow
          </Link>

          <nav className="procurement-sidebar-nav" aria-label="Procurement workspace navigation">
            <div className="procurement-sidebar-label">Workspace</div>
            {procurementWorkspaceMenu.map(item => {
              const Icon = item.icon
              const active = isActive(item.href)
              return (
                <Link key={item.href} href={item.href} className={`procurement-nav-row${active ? ' active' : ''}`} onClick={() => setSidebarOpen(false)}>
                  <Icon size={16} />
                  <span>{item.label}</span>
                </Link>
              )
            })}
          </nav>
        </div>
      </aside>

      <div className="procurement-content-column">
        <header className="procurement-header">
          <div className="procurement-header-title">
            <button type="button" aria-label="Open procurement navigation" aria-expanded={sidebarOpen} className="procurement-icon-button" onClick={() => setSidebarOpen(true)}>
              <Menu size={19} />
            </button>
            <span className="procurement-active-icon"><ActiveIcon size={18} /></span>
            <span className="procurement-active-copy">
              <span>{activeMeta.label}</span>
              <small>{activeMeta.description}</small>
            </span>
          </div>

          <label className="procurement-search">
            <Search size={17} color="#64748b" />
            <input placeholder="Search procurement records..." aria-label="Search procurement records" />
          </label>

          <CompanySwitcher className="procurement-company-switcher" />
        </header>

        <main>{children}</main>
      </div>
    </div>
  )
}

const procurementShellCss = `
.procurement-workspace-shell {
  min-height: 100vh;
  height: 100dvh;
  overflow: hidden;
  background: #f7f9fc;
  color: #0f172a;
  display: grid;
  grid-template-columns: 260px minmax(0, 1fr);
}
.procurement-sidepanel {
  min-height: 100dvh;
  height: 100dvh;
  position: sticky;
  top: 0;
  align-self: start;
  padding: 0;
  overflow: hidden;
  background: #000000 !important;
}
.procurement-sidebar-card {
  height: 100dvh;
  border-radius: 0;
  background: ${sidebarColors.bg} !important;
  color: ${sidebarColors.text} !important;
  border: 0 !important;
  display: flex;
  flex-direction: column;
  padding: 18px 14px;
  box-shadow: none;
  overflow: hidden;
}
.procurement-sidebar-brand {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 0 6px 16px;
}
.procurement-sidebar-logo {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  background: ${sidebarColors.text};
  color: ${sidebarColors.bg};
  display: grid;
  place-items: center;
  font-weight: 850;
  font-size: 16px;
  flex: 0 0 auto;
}
.procurement-sidebar-copy {
  min-width: 0;
  flex: 1;
}
.procurement-sidebar-copy > span {
  display: block;
  font-size: 16px;
  font-weight: 700;
  line-height: 1;
  color: ${sidebarColors.text};
}
.procurement-sidebar-copy small {
  display: block;
  font-size: 12px;
  color: ${sidebarColors.muted};
  margin-top: 5px;
  font-weight: 550;
}
.procurement-sidebar-close {
  display: none;
  width: 34px;
  height: 34px;
  border: 1px solid ${sidebarColors.border};
  border-radius: 10px;
  background: transparent;
  color: ${sidebarColors.text};
  place-items: center;
  cursor: pointer;
}
.procurement-back-link {
  min-height: 38px;
  margin: 0 0 14px;
  padding: 0 10px;
  display: flex;
  align-items: center;
  gap: 10px;
  border: 1px solid ${sidebarColors.border};
  border-radius: 8px;
  background: #0b0b0b;
  color: ${sidebarColors.text};
  font-size: 13px;
  font-weight: 850;
  line-height: 20px;
  text-decoration: none;
  transition: background 150ms ease, transform 150ms ease;
}
.procurement-back-link svg {
  color: ${sidebarColors.text};
}
.procurement-back-link:hover {
  background: ${sidebarColors.surfaceHover};
  transform: translateY(-1px);
}
.procurement-sidebar-nav {
  display: grid;
  gap: 4px;
  align-content: start;
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding-right: 2px;
}
.procurement-sidebar-nav::-webkit-scrollbar {
  width: 6px;
}
.procurement-sidebar-nav::-webkit-scrollbar-thumb {
  background: #2a2a2a;
  border-radius: 999px;
}
.procurement-sidebar-label {
  font-size: 10px;
  letter-spacing: 1px;
  color: ${sidebarColors.faint};
  font-weight: 800;
  padding: 0 10px 6px;
  text-transform: uppercase;
  white-space: nowrap;
}
.procurement-nav-row {
  min-height: 38px;
  padding: 0 10px;
  display: flex;
  align-items: center;
  gap: 10px;
  border-radius: 8px;
  background: transparent;
  color: ${sidebarColors.muted};
  font-size: 13px;
  font-weight: 800;
  line-height: 1.2;
  text-decoration: none;
  transition: background 150ms ease, color 150ms ease, transform 150ms ease;
}
.procurement-nav-row svg {
  color: ${sidebarColors.icon};
  flex: 0 0 auto;
  transition: color 150ms ease;
}
.procurement-nav-row span {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.procurement-nav-row:hover {
  background: ${sidebarColors.surfaceHover};
  color: ${sidebarColors.text};
  transform: translateX(2px);
}
.procurement-nav-row:hover svg {
  color: ${sidebarColors.text};
}
.procurement-nav-row.active {
  background: ${sidebarColors.activeBg};
  color: ${sidebarColors.activeText};
  font-weight: 900;
}
.procurement-nav-row.active svg {
  color: ${sidebarColors.activeIcon};
}
.procurement-content-column {
  min-width: 0;
  height: 100dvh;
  overflow-y: auto;
  padding-inline: max(0px, calc((100% - var(--wf-content-max)) / 2));
}
.procurement-header {
  height: 74px;
  position: sticky;
  top: 0;
  z-index: 30;
  background: rgba(255,255,255,0.94);
  backdrop-filter: blur(16px);
  border-bottom: 1px solid #e5e7eb;
  display: grid;
  grid-template-columns: minmax(220px, auto) minmax(260px, 560px) minmax(190px, max-content);
  align-items: center;
  gap: 28px;
  padding: 0 28px;
}
.procurement-header-title {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
}
.procurement-icon-button {
  width: 38px;
  height: 38px;
  border-radius: 10px;
  border: 1px solid #e8edf4;
  background: #fff;
  color: #0f172a;
  display: grid;
  place-items: center;
  cursor: pointer;
}
.procurement-active-icon {
  width: 38px;
  height: 38px;
  border-radius: 11px;
  background: #ecfdf3;
  color: #16a34a;
  display: grid;
  place-items: center;
  flex: 0 0 auto;
}
.procurement-active-copy {
  min-width: 0;
}
.procurement-active-copy > span {
  display: block;
  font-size: 15px;
  font-weight: 900;
  color: #0f172a;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.procurement-active-copy small {
  display: block;
  font-size: 12px;
  color: #64748b;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.procurement-search {
  height: 40px;
  width: 100%;
  justify-self: center;
  border-radius: 8px;
  background: #fff;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 0 14px;
  border: 1px solid #e8edf4;
  box-shadow: 0 1px 2px rgba(15,23,42,0.03);
}
.procurement-search input {
  flex: 1;
  min-width: 0;
  border: 0;
  outline: 0;
  background: transparent;
  font-size: 13px;
  color: #0f172a;
}
.procurement-mobile-backdrop {
  display: none;
}
@media (max-width: 1180px) {
  .procurement-workspace-shell {
    grid-template-columns: 84px minmax(0, 1fr);
  }
  .procurement-sidepanel {
    padding: 0;
  }
  .procurement-sidebar-card {
    padding: 18px 8px;
  }
  .procurement-sidebar-copy,
  .procurement-back-link,
  .procurement-sidebar-label,
  .procurement-nav-row span {
    display: none;
  }
  .procurement-sidebar-brand {
    justify-content: center;
    padding: 0 0 16px;
  }
  .procurement-nav-row {
    justify-content: center;
    padding: 0;
  }
}
@media (max-width: 900px) {
  .procurement-workspace-shell {
    display: block;
    height: auto;
    min-height: 100vh;
    overflow: visible;
  }
  .procurement-sidepanel {
    position: fixed;
    inset: 0 auto 0 0;
    z-index: 120;
    width: min(86vw, 300px);
    padding: 0;
    transform: translateX(-105%);
    transition: transform 180ms ease;
  }
  .procurement-sidepanel.is-open {
    transform: translateX(0);
  }
  .procurement-sidebar-card {
    height: 100dvh;
    padding: 20px 14px;
  }
  .procurement-sidebar-copy,
  .procurement-back-link,
  .procurement-sidebar-label,
  .procurement-nav-row span {
    display: block;
  }
  .procurement-nav-row {
    justify-content: flex-start;
    padding: 0 10px;
  }
  .procurement-sidebar-brand {
    justify-content: flex-start;
    padding: 0 6px 16px;
  }
  .procurement-sidebar-close {
    display: grid;
  }
  .procurement-mobile-backdrop {
    position: fixed;
    inset: 0;
    z-index: 110;
    border: 0;
    background: rgba(15, 23, 42, .46);
    opacity: 0;
    pointer-events: none;
    transition: opacity 180ms ease;
    display: block;
  }
  .procurement-mobile-backdrop.is-open {
    opacity: 1;
    pointer-events: auto;
  }
  .procurement-content-column {
    height: auto;
    min-height: 100vh;
    overflow: visible;
  }
  .procurement-header {
    grid-template-columns: 1fr;
    height: auto;
    min-height: 72px;
    padding: 10px 14px;
  }
  .procurement-search {
    grid-column: auto;
    justify-self: stretch;
  }
}
@media (max-width: 520px) {
  .procurement-active-icon,
  .procurement-active-copy small {
    display: none;
  }
}
`
