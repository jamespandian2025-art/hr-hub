'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  BadgeDollarSign,
  Boxes,
  Building2,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  FolderKanban,
  HandCoins,
  LayoutDashboard,
  PackageSearch,
  Settings,
  ShoppingCart,
  UsersRound,
} from 'lucide-react'

const font = "'DM Sans', sans-serif"
const displayFont = "'Outfit', 'DM Sans', sans-serif"

type NavItem = {
  label: string
  href: string
  icon: React.ComponentType<{ size?: number }>
  match?: string[]
}

type NavGroup = {
  section: string
  items: NavItem[]
}

const navGroups: NavGroup[] = [
  {
    section: 'CORE',
    items: [
      { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
      { label: 'Client database', href: '/client-database', icon: UsersRound, match: ['/people/clients'] },
      { label: 'Sales', href: '/sales', icon: BadgeDollarSign, match: ['/opportunities'] },
      { label: 'Project mgmt', href: '/project-management', icon: FolderKanban, match: ['/projects'] },
    ],
  },
  {
    section: 'FINANCE & PEOPLE',
    items: [
      { label: 'Financial', href: '/financial', icon: HandCoins, match: ['/financials'] },
      { label: 'HR', href: '/hr', icon: Building2, match: ['/people/teams', '/people/contacts'] },
    ],
  },
  {
    section: 'SUPPLY CHAIN',
    items: [
      { label: 'Procurement', href: '/procurement', icon: ShoppingCart, match: ['/resources/pricebook'] },
      { label: 'Supplier database', href: '/supplier-database', icon: PackageSearch, match: ['/resources/suppliers', '/people/vendors'] },
      { label: 'Warehouse', href: '/warehouse-inventory', icon: Boxes, match: ['/resources/inventory'] },
    ],
  },
  {
    section: 'PRODUCTIVITY',
    items: [
      { label: 'Workflows', href: '/tasks', icon: ClipboardList },
      { label: 'Settings', href: '/settings', icon: Settings },
    ],
  },
]

export default function Sidebar({ collapsed, onToggle }: { collapsed: boolean; onToggle: () => void }) {
  const pathname = usePathname()

  return (
    <aside
      style={{
        width: '100%',
        minHeight: '100vh',
        height: '100vh',
        background: '#191414',
        padding: collapsed ? '20px 0' : '20px 16px',
        fontFamily: font,
        overflowY: 'auto',
        overflowX: 'hidden',
        transition: 'padding 0.22s ease',
      }}
    >
      {/* Logo row + toggle button */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: collapsed ? 'center' : 'space-between',
          padding: collapsed ? '0 0 22px' : '0 2px 22px',
          gap: 8,
          flexDirection: collapsed ? 'column' : 'row',
        }}
      >
        <Link href="/dashboard" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
          <div
            style={{
              width: 36,
              height: 36,
              flexShrink: 0,
              background: '#1db954',
              borderRadius: 10,
              boxShadow: '0 10px 20px rgba(29,185,84,0.22)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#191414',
              fontSize: 17,
              fontWeight: 700,
              fontFamily: font,
            }}
          >
            W
          </div>
          {!collapsed && (
            <span
              style={{
                fontFamily: displayFont,
                fontSize: 18,
                fontWeight: 800,
                color: '#1db954',
                letterSpacing: '-0.4px',
                whiteSpace: 'nowrap',
              }}
            >
              WiseFlow
            </span>
          )}
        </Link>

        {/* Collapse / expand toggle */}
        <button
          onClick={onToggle}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          style={{
            flexShrink: 0,
            width: 24,
            height: 24,
            borderRadius: '50%',
            border: '1px solid #333',
            background: '#242424',
            color: '#b3b3b3',
            display: 'grid',
            placeItems: 'center',
            cursor: 'pointer',
            padding: 0,
          }}
        >
          {collapsed ? <ChevronRight size={13} /> : <ChevronLeft size={13} />}
        </button>
      </div>

      {/* Nav groups */}
      {navGroups.map((group, groupIndex) => (
        <div key={`${group.section}-${groupIndex}`} style={{ marginBottom: 18 }}>
          {/* Section label — hidden when collapsed */}
          {!collapsed && group.section && (
            <div
              style={{
                fontFamily: font,
                fontSize: 11,
                letterSpacing: '1px',
                textTransform: 'uppercase',
                color: '#b3b3b3',
                padding: '0 16px 7px',
                fontWeight: 600,
                whiteSpace: 'nowrap',
              }}
            >
              {group.section}
            </div>
          )}

          {group.items.map(item => {
            const Icon = item.icon
            const isActive =
              pathname === item.href ||
              pathname.startsWith(`${item.href}/`) ||
              Boolean(item.match?.some(path => pathname === path || pathname.startsWith(`${path}/`)))

            return (
              <Link
                key={item.href}
                href={item.href}
                style={{ textDecoration: 'none' }}
                title={collapsed ? item.label : undefined}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: collapsed ? 'center' : 'flex-start',
                    gap: collapsed ? 0 : 12,
                    padding: collapsed ? '10px 0' : '10px 17px',
                    margin: collapsed ? '0 8px 3px' : '0 0 3px',
                    cursor: 'pointer',
                    borderRadius: collapsed ? 8 : 0,
                    background: isActive ? '#282828' : 'transparent',
                    color: isActive ? '#ffffff' : '#f5f5f5',
                    fontWeight: isActive ? 700 : 500,
                    fontSize: 14,
                    fontFamily: font,
                    boxShadow: isActive && !collapsed ? 'inset 3px 0 0 #1db954' : isActive && collapsed ? '0 0 0 1.5px #1db954' : 'none',
                  }}
                >
                  <span
                    style={{
                      width: 18,
                      display: 'inline-flex',
                      justifyContent: 'center',
                      flexShrink: 0,
                      color: isActive ? '#1db954' : '#e7e7e7',
                    }}
                  >
                    <Icon size={17} />
                  </span>
                  {!collapsed && item.label}
                </div>
              </Link>
            )
          })}

          {groupIndex < navGroups.length - 1 && (
            <div
              style={{
                height: 1,
                background: 'rgba(179,179,179,.18)',
                margin: collapsed ? '14px 8px 0' : '14px 0 0',
              }}
            />
          )}
        </div>
      ))}
    </aside>
  )
}
