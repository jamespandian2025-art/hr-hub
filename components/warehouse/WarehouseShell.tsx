'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ArrowLeft, Bell, Menu, Search, Warehouse, X } from 'lucide-react'
import CompanySwitcher from '@/components/CompanySwitcher'
import { getWarehouseRouteMeta, warehouseNavItems } from './warehouseNav'

export default function WarehouseShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const activeMeta = getWarehouseRouteMeta(pathname)
  const ActiveIcon = activeMeta.icon
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    const close = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMobileOpen(false)
    }
    window.addEventListener('keydown', close)
    return () => window.removeEventListener('keydown', close)
  }, [])

  const nav = (
    <>
      <div className="warehouse-brand">
        <span className="warehouse-brand-mark"><Warehouse size={20} /></span>
        <span>
          <strong>Warehouse</strong>
          <small>Inventory workspace</small>
        </span>
        <button type="button" className="warehouse-close" aria-label="Close warehouse navigation" onClick={() => setMobileOpen(false)}>
          <X size={17} />
        </button>
      </div>

      <Link href="/dashboard" className="warehouse-back-link" onClick={() => setMobileOpen(false)}>
        <ArrowLeft size={15} />
        Back to WiseFlow
      </Link>

      <div className="warehouse-nav-label">Workspace</div>
      <nav className="warehouse-nav" aria-label="Warehouse workspace navigation">
        {warehouseNavItems.filter(item => !item.hidden).map(item => {
          const Icon = item.icon
          const active = pathname === item.href || pathname.startsWith(item.href + '/')
          return (
            <Link key={item.href} href={item.href} className={active ? 'warehouse-nav-row active' : 'warehouse-nav-row'} onClick={() => setMobileOpen(false)}>
              <Icon size={16} />
              <span>{item.label}</span>
            </Link>
          )
        })}
      </nav>
    </>
  )

  return (
    <div className="warehouse-shell">
      <style>{warehouseShellCss}</style>
      <button
        type="button"
        aria-label="Close warehouse navigation"
        className={mobileOpen ? 'warehouse-backdrop is-open' : 'warehouse-backdrop'}
        onClick={() => setMobileOpen(false)}
      />
      <aside className={mobileOpen ? 'warehouse-sidebar is-open' : 'warehouse-sidebar'}>{nav}</aside>

      <div className="warehouse-main">
        <header className="warehouse-topbar">
          <div className="warehouse-title-block">
            <button type="button" className="warehouse-menu" aria-label="Open warehouse navigation" onClick={() => setMobileOpen(true)}>
              <Menu size={19} />
            </button>
            <span className="warehouse-active-icon"><ActiveIcon size={18} /></span>
            <span>
              <strong>{activeMeta.label}</strong>
              <small>{activeMeta.description}</small>
            </span>
          </div>
          <label className="warehouse-search">
            <Search size={16} />
            <input aria-label="Search warehouse" placeholder="Search warehouse records..." />
          </label>
          <CompanySwitcher className="warehouse-company-switcher" />
          <button type="button" className="warehouse-alert" aria-label="Warehouse alerts">
            <Bell size={18} />
            <span>8</span>
          </button>
        </header>
        <main className="warehouse-content">{children}</main>
      </div>
    </div>
  )
}

const warehouseShellCss = `
.warehouse-shell {
  min-height: 100vh;
  height: 100dvh;
  overflow: hidden;
  display: grid;
  grid-template-columns: 252px minmax(0, 1fr);
  background: #f3f4f6;
  color: #0f172a;
  font-family: var(--font-body);
}
.warehouse-shell * { box-sizing: border-box; }
.warehouse-sidebar {
  height: 100dvh;
  min-height: 0;
  background: #ffffff;
  color: #0f172a;
  border-right: 1px solid #e5e7eb;
  padding: 18px 12px;
  display: flex;
  flex-direction: column;
  gap: 14px;
  overflow: hidden;
}
.warehouse-brand {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 0 6px 4px;
}
.warehouse-brand-mark {
  width: 36px;
  height: 36px;
  border-radius: 9px;
  display: grid;
  place-items: center;
  background: #10b981;
  color: #fff;
  flex: 0 0 auto;
}
.warehouse-brand strong {
  display: block;
  color: #0f172a;
  font-size: 16px;
  line-height: 1;
}
.warehouse-brand small {
  display: block;
  color: #000000;
  font-size: 12px;
  margin-top: 5px;
  font-weight: 650;
}
.warehouse-close {
  display: none;
  margin-left: auto;
  width: 34px;
  height: 34px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: transparent;
  color: #000000;
  place-items: center;
}
.warehouse-back-link {
  min-height: 38px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 0 10px;
  color: #0f172a;
  text-decoration: none;
  font-size: 13px;
  font-weight: 850;
  background: #f8fafc;
}
.warehouse-back-link:hover {
  background: #f1f5f9;
}
.warehouse-nav-label {
  color: #000000;
  font-size: 10px;
  font-weight: 900;
  letter-spacing: .8px;
  text-transform: uppercase;
  padding: 0 10px;
}
.warehouse-nav {
  display: grid;
  gap: 4px;
  overflow-y: auto;
  min-height: 0;
  padding-right: 2px;
}
.warehouse-nav-row {
  min-height: 38px;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 0 10px;
  border-radius: 8px;
  color: #334155;
  text-decoration: none;
  font-size: 13px;
  font-weight: 700;
}
.warehouse-nav-row svg {
  color: #000000;
  flex: 0 0 auto;
}
.warehouse-nav-row:hover {
  background: #f1f5f9;
  color: #0f172a;
}
.warehouse-nav-row:hover svg {
  color: #334155;
}
.warehouse-nav-row.active {
  background: #ecfdf5;
  color: #065f46;
}
.warehouse-nav-row.active svg {
  color: #10b981;
}
.warehouse-main {
  min-width: 0;
  height: 100dvh;
  display: grid;
  grid-template-rows: 74px minmax(0, 1fr);
  overflow: hidden;
}
.warehouse-topbar {
  position: sticky;
  top: 0;
  z-index: 40;
  border-bottom: 1px solid #e8edf4;
  background: rgba(255,255,255,.95);
  backdrop-filter: blur(16px);
  display: grid;
  grid-template-columns: minmax(220px, auto) minmax(260px, 560px) minmax(190px, max-content) max-content;
  align-items: center;
  gap: 18px;
  padding: 0 28px;
}
.warehouse-title-block {
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 12px;
}
.warehouse-title-block strong {
  display: block;
  color: #0f172a;
  font-size: 15px;
  font-weight: 950;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.warehouse-title-block small {
  display: block;
  color: #000000;
  font-size: 12px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.warehouse-menu,
.warehouse-alert {
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
.warehouse-menu { display: none; }
.warehouse-alert {
  position: relative;
}
.warehouse-alert span {
  position: absolute;
  top: -5px;
  right: -5px;
  min-width: 18px;
  height: 18px;
  border-radius: 999px;
  background: #ef4444;
  color: #fff;
  border: 2px solid #fff;
  font-size: 10px;
  font-weight: 950;
  display: grid;
  place-items: center;
}
.warehouse-active-icon {
  width: 38px;
  height: 38px;
  border-radius: 10px;
  background: #ecfdf5;
  color: #10b981;
  display: grid;
  place-items: center;
  flex: 0 0 auto;
}
.warehouse-search {
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
.warehouse-search input {
  min-width: 0;
  flex: 1;
  border: 0;
  outline: 0;
  background: transparent;
  color: #0f172a;
  font: inherit;
  font-size: 13px;
}
.warehouse-content {
  min-width: 0;
  min-height: 0;
  overflow: auto;
  background: #f3f4f6;
  padding-inline: max(0px, calc((100% - var(--wf-content-max)) / 2));
}
.warehouse-backdrop {
  display: none;
}
@media (max-width: 1100px) {
  .warehouse-shell {
    grid-template-columns: 82px minmax(0, 1fr);
  }
  .warehouse-sidebar {
    padding: 18px 8px;
  }
  .warehouse-brand { justify-content: center; padding: 0 0 4px; }
  .warehouse-brand span:last-child,
  .warehouse-back-link,
  .warehouse-nav-label,
  .warehouse-nav-row span {
    display: none;
  }
  .warehouse-nav-row {
    justify-content: center;
    padding: 0;
  }
}
@media (max-width: 820px) {
  .warehouse-shell {
    display: block;
    height: auto;
    min-height: 100vh;
    overflow: visible;
  }
  .warehouse-sidebar {
    position: fixed;
    inset: 0 auto 0 0;
    width: min(86vw, 300px);
    z-index: 1000;
    transform: translateX(-105%);
    transition: transform 180ms ease;
    padding: 18px 12px;
  }
  .warehouse-sidebar.is-open {
    transform: translateX(0);
  }
  .warehouse-brand { justify-content: flex-start; padding: 0 6px 4px; }
  .warehouse-brand span:last-child,
  .warehouse-back-link,
  .warehouse-nav-label,
  .warehouse-nav-row span {
    display: block;
  }
  .warehouse-nav-row {
    justify-content: flex-start;
    padding: 0 10px;
  }
  .warehouse-close {
    display: grid;
  }
  .warehouse-backdrop {
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
  .warehouse-backdrop.is-open {
    opacity: 1;
    pointer-events: auto;
  }
  .warehouse-main {
    height: auto;
    min-height: 100vh;
    overflow: visible;
    display: block;
  }
  .warehouse-content {
    overflow: visible;
  }
  .warehouse-topbar {
    grid-template-columns: 1fr;
    height: auto;
    min-height: 72px;
    padding: 10px 14px;
  }
  .warehouse-menu {
    display: grid;
  }
  .warehouse-alert {
    display: none;
  }
}
`
