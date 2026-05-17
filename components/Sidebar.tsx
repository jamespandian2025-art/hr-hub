'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  BadgeDollarSign,
  BookOpen,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  FolderKanban,
  HandCoins,
  LayoutDashboard,
  Settings,
  ShoppingCart,
  UsersRound,
  Warehouse,
} from 'lucide-react'

const font = "var(--font-body)"
const displayFont = "var(--font-body)"
const sidebarColors = {
  bg: '#000000',
  surface: '#1f1f1f',
  surfaceHover: '#1a1a1a',
  border: '#242424',
  text: 'rgb(237, 237, 237)',
  muted: '#a1a1a1',
  faint: '#737373',
  icon: '#a1a1a1',
  activeRing: 'transparent',
}

type NavSubItem = {
  label: string
  href: string
  match?: string[]
  badge?: 'tasks' | 'todos' | 'workflows' | 'drafts'
  newTab?: boolean
}

type NavParentItem = {
  label: string
  href?: string
  icon: React.ComponentType<{ size?: number; color?: string }>
  match?: string[]
  newTab?: boolean
  children?: NavSubItem[]
}

type NavSection = {
  section: string
  items: NavParentItem[]
}

type BadgeCounts = { tasks: number; todos: number; workflows: number; drafts: number }

const navSections: NavSection[] = [
  {
    section: 'CORE',
    items: [
      { label: 'Dashboard',       href: '/dashboard',          icon: LayoutDashboard },
      { label: 'Client Database', href: '/client-database',    icon: UsersRound,      match: ['/people/clients'] },
      { label: 'Sales',           href: '/sales',              icon: BadgeDollarSign, match: ['/opportunities'] },
      { label: 'Project Mgmt',    href: '/project-management', icon: FolderKanban,    match: ['/projects'] },
    ],
  },
  {
    section: 'FINANCE & PEOPLE',
    items: [
      {
        label: 'Financials',
        href: '/accounting',
        icon: HandCoins,
        match: ['/accounting', '/financial', '/financials'],
        newTab: true,
      },
      {
        label: 'HR Hub',
        href: '/hr/overview',
        icon: UsersRound,
        match: ['/hr'],
        newTab: true,
      },
    ],
  },
  {
    section: 'SUPPLY CHAIN',
    items: [
      {
        label: 'Procurement',
        href: '/procurement',
        icon: ShoppingCart,
        newTab: true,
        match: ['/procurement'],
      },
      {
        label: 'Supplier Database',
        href: '/supplier-database',
        icon: UsersRound,
        match: ['/supplier-database', '/resources/suppliers', '/people/vendors'],
      },
      {
        label: 'Warehouse',
        icon: Warehouse,
        match: ['/warehouse-inventory', '/resources/inventory'],
        children: [
          { label: 'Overview',        href: '/resources/inventory' },
          { label: 'Inventory',       href: '/resources/inventory' },
          { label: 'Stock Movements', href: '/warehouse/stock-movements' },
          { label: 'Receiving Logs',  href: '/warehouse/receiving-logs' },
          { label: 'Transfers',       href: '/warehouse/transfers' },
          { label: 'Adjustments',     href: '/warehouse/adjustments' },
          { label: 'Locations',       href: '/warehouse/locations' },
          { label: 'Low Stock',       href: '/warehouse/low-stock' },
        ],
      },
    ],
  },
  {
    section: 'PRODUCTIVITY',
    items: [
      {
        label: 'Workflows',
        icon: ClipboardList,
        match: ['/tasks', '/to-do'],
        children: [
          { label: 'My Tasks',      href: '/tasks',                  badge: 'tasks' },
          { label: 'My To-dos',     href: '/to-do',                  badge: 'todos' },
          { label: 'My Workflows',  href: '/workflows/my-workflows', badge: 'workflows' },
          { label: 'All Workflows', href: '/workflows/all-workflows' },
          { label: 'Draft Jobs',    href: '/workflows/draft-jobs',   badge: 'drafts' },
          { label: 'Reports',       href: '/workflows/reports' },
        ],
      },
    ],
  },
  {
    section: 'SETTINGS',
    items: [
      { label: 'Settings',       href: '/settings',       icon: Settings },
      { label: 'Design System',  href: '/design-system',  icon: BookOpen },
    ],
  },
]

function BadgePill({ count }: { count: number }) {
  if (!count) return null
  return (
    <span
      style={{
        marginLeft: 'auto',
        flexShrink: 0,
        background: 'rgba(34,197,94,0.15)',
        color: '#22c55e',
        fontSize: 10,
        fontWeight: 700,
        lineHeight: 1,
        padding: '2px 6px',
        borderRadius: 99,
        minWidth: 18,
        textAlign: 'center',
      }}
    >
      {count > 99 ? '99+' : count}
    </span>
  )
}

function isItemActive(item: NavParentItem, pathname: string): boolean {
  return (
    (item.href !== undefined &&
      (pathname === item.href || pathname.startsWith(item.href + '/'))) ||
    Boolean(item.match?.some(m => pathname === m || pathname.startsWith(m + '/')))
  )
}

function isGroupActive(item: NavParentItem, pathname: string): boolean {
  if (item.href && (pathname === item.href || pathname.startsWith(item.href + '/'))) return true
  if (!item.children) return false
  return item.children.some(
    child =>
      pathname === child.href ||
      (child.href !== undefined && pathname.startsWith(child.href + '/')) ||
      Boolean(child.match?.some(m => pathname === m || pathname.startsWith(m + '/')))
  )
}

function isSubItemActive(child: NavSubItem, pathname: string): boolean {
  return (
    pathname === child.href ||
    (child.href !== undefined && pathname.startsWith(child.href + '/')) ||
    Boolean(child.match?.some(m => pathname === m || pathname.startsWith(m + '/')))
  )
}

function shouldAutoExpand(item: NavParentItem, path: string): boolean {
  return Boolean(
    (item.href && (path === item.href || path.startsWith(item.href + '/'))) ||
    item.children?.some(
      child =>
        path === child.href ||
        path.startsWith((child.href ?? '') + '/') ||
        child.match?.some(m => path === m || path.startsWith(m + '/'))
    )
  )
}

export default function Sidebar({ collapsed, onToggle }: { collapsed: boolean; onToggle: () => void }) {
  const pathname = usePathname()
  const router = useRouter()

  const [expanded, setExpanded] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {}
    for (const sec of navSections)
      for (const item of sec.items)
        if (item.children) init[item.label] = shouldAutoExpand(item, pathname)
    return init
  })

  const [badgeCounts, setBadgeCounts] = useState<BadgeCounts>({
    tasks: 0, todos: 0, workflows: 0, drafts: 0,
  })

  const [hoveredItem, setHoveredItem] = useState<string | null>(null)

  useEffect(() => {
    const id = window.setTimeout(() => {
      setExpanded(prev => {
        const next = { ...prev }
        for (const sec of navSections)
          for (const item of sec.items)
            if (item.children && shouldAutoExpand(item, pathname)) next[item.label] = true
        return next
      })
    }, 0)
    return () => window.clearTimeout(id)
  }, [pathname])

  useEffect(() => {
    function load() {
      try {
        const raw = window.localStorage.getItem('flowsys-assigned-tasks')
        const all: Array<{ status?: string }> = raw ? JSON.parse(raw) : []
        setBadgeCounts({
          tasks: all.filter(t => t.status !== 'Completed').length,
          todos: all.filter(t => t.status === 'Open').length,
          workflows: 0,
          drafts: 0,
        })
      } catch {
        setBadgeCounts({ tasks: 0, todos: 0, workflows: 0, drafts: 0 })
      }
    }
    load()
    window.addEventListener('focus', load)
    window.addEventListener('storage', load)
    return () => {
      window.removeEventListener('focus', load)
      window.removeEventListener('storage', load)
    }
  }, [])

  function toggleExpanded(key: string) {
    setExpanded(prev => ({ ...prev, [key]: !prev[key] }))
  }

  return (
    <aside
      style={{
        width: '100%',
        minHeight: '100vh',
        height: '100vh',
        background: sidebarColors.bg,
        padding: collapsed ? '20px 0' : '20px 0',
        fontFamily: font,
        overflowY: 'auto',
        overflowX: 'hidden',
        transition: 'padding 0.22s ease',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Logo row + toggle button */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: collapsed ? 'center' : 'space-between',
          padding: collapsed ? '0 0 24px' : '0 14px 24px',
          gap: 8,
        }}
      >
        <Link href="/dashboard" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
          <div
            style={{
              width: 34,
              height: 34,
              flexShrink: 0,
              background: sidebarColors.text,
              borderRadius: 9,
              boxShadow: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: sidebarColors.bg,
              fontSize: 16,
              fontWeight: 800,
              fontFamily: displayFont,
            }}
          >
            W
          </div>
          {!collapsed && (
            <span
              style={{
                fontFamily: displayFont,
                fontSize: 17,
                fontWeight: 800,
                color: sidebarColors.text,
                letterSpacing: 0,
                whiteSpace: 'nowrap',
              }}
            >
              WiseFlow
            </span>
          )}
        </Link>

        {!collapsed && (
          <button
            onClick={onToggle}
            title="Collapse sidebar"
            style={{
              flexShrink: 0,
              width: 22,
              height: 22,
              borderRadius: '50%',
              border: `1px solid ${sidebarColors.border}`,
              background: 'transparent',
              color: sidebarColors.muted,
              display: 'grid',
              placeItems: 'center',
              cursor: 'pointer',
              padding: 0,
              transition: 'background 150ms ease, color 150ms ease',
            }}
          >
            <ChevronLeft size={12} />
          </button>
        )}

        {collapsed && (
          <button
            onClick={onToggle}
            title="Expand sidebar"
            style={{
              width: 22,
              height: 22,
              borderRadius: '50%',
              border: `1px solid ${sidebarColors.border}`,
              background: 'transparent',
              color: sidebarColors.muted,
              display: 'grid',
              placeItems: 'center',
              cursor: 'pointer',
              padding: 0,
              marginTop: 4,
            }}
          >
            <ChevronRight size={12} />
          </button>
        )}
      </div>

      {/* Nav sections */}
      <div style={{ flex: 1 }}>
        {navSections.map((section, sectionIndex) => (
          <div key={section.section} style={{ marginBottom: 6 }}>
            {/* Section label */}
            {!collapsed && (
              <div
                style={{
                  fontFamily: font,
                  fontSize: 10,
                  letterSpacing: '1px',
                  textTransform: 'uppercase',
                  color: sidebarColors.faint,
                  padding: '0 22px 5px',
                  fontWeight: 600,
                  whiteSpace: 'nowrap',
                  marginTop: sectionIndex === 0 ? 0 : 10,
                }}
              >
                {section.section}
              </div>
            )}

            {collapsed && sectionIndex > 0 && (
              <div
                style={{
                  height: 1,
                  background: sidebarColors.border,
                  margin: '10px 10px 10px',
                }}
              />
            )}

            {section.items.map(item => {
              const Icon = item.icon
              const hasChildren = Boolean(item.children?.length)
              const isOpen = expanded[item.label] ?? false
              const groupActive = hasChildren ? isGroupActive(item, pathname) : isItemActive(item, pathname)
              const hoverKey = `parent-${item.label}`
              const isHovered = hoveredItem === hoverKey

              /* â”€â”€â”€ Expandable parent row â”€â”€â”€ */
              if (hasChildren) {
                return (
                  <div key={item.label}>
                    <button
                      className={`main-sidebar-row${groupActive ? ' is-active' : ''}${isHovered ? ' is-hovered' : ''}`}
                      onClick={() => {
                        if (item.href) {
                          if (item.newTab) window.open(item.href, '_blank', 'noopener,noreferrer')
                          else router.push(item.href)
                          setExpanded(prev => ({ ...prev, [item.label]: true }))
                        } else if (collapsed) {
                          router.push(item.children![0].href)
                        } else {
                          toggleExpanded(item.label)
                        }
                      }}
                      title={collapsed ? item.label : undefined}
                      onMouseEnter={() => setHoveredItem(hoverKey)}
                      onMouseLeave={() => setHoveredItem(null)}
                      style={{
                        width: 'calc(100% - 16px)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: collapsed ? 'center' : 'flex-start',
                        gap: collapsed ? 0 : 10,
                        padding: collapsed ? '9px 0' : '8px 10px',
                        margin: '0 8px 2px',
                        cursor: 'pointer',
                        borderRadius: 0,
                        background: groupActive
                          ? sidebarColors.surface
                          : isHovered
                          ? sidebarColors.surfaceHover
                          : 'transparent',
                        boxShadow: 'none',
                        color: groupActive || isHovered ? sidebarColors.text : sidebarColors.muted,
                        fontWeight: groupActive ? 600 : 500,
                        fontSize: 14,
                        fontFamily: font,
                        border: 'none',
                        transition: 'background 150ms ease, color 150ms ease',
                        textAlign: 'left',
                        position: 'relative',
                      }}
                    >
                      {/* Badge dot (collapsed only) */}
                      {collapsed && item.children?.some(c => c.badge && badgeCounts[c.badge] > 0) && (
                        <span
                          style={{
                            position: 'absolute',
                            top: 6,
                            right: 6,
                            width: 6,
                            height: 6,
                            background: sidebarColors.text,
                            borderRadius: '50%',
                            boxShadow: '0 0 6px rgba(34,197,94,0.6)',
                          }}
                        />
                      )}

                      <span
                        style={{
                          width: 18,
                          display: 'inline-flex',
                          justifyContent: 'center',
                          flexShrink: 0,
                          color: groupActive || isHovered ? sidebarColors.text : sidebarColors.icon,
                        }}
                      >
                        <Icon size={16} />
                      </span>

                      {!collapsed && (
                        <>
                          <span style={{ flex: 1, whiteSpace: 'nowrap' }}>{item.label}</span>
                          <span
                            style={{
                              display: 'inline-flex',
                              color: sidebarColors.faint,
                              transition: 'transform 200ms ease',
                              transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                              flexShrink: 0,
                            }}
                          >
                            <ChevronDown size={13} />
                          </span>
                        </>
                      )}
                    </button>

                    {/* Submenu */}
                    {!collapsed && (
                      <div
                        style={{
                          overflow: 'hidden',
                          maxHeight: isOpen ? '600px' : '0px',
                          transition: 'max-height 200ms ease',
                        }}
                      >
                        <div
                          style={{
                            position: 'relative',
                            paddingLeft: 28,
                            paddingTop: 2,
                            paddingBottom: 4,
                            paddingRight: 8,
                          }}
                        >
                          {/* Connector line */}
                          <div
                            style={{
                              position: 'absolute',
                              left: 24,
                              top: 4,
                              bottom: 8,
                              width: 1,
                              background: sidebarColors.border,
                              borderRadius: 1,
                            }}
                          />

                          {item.children!.map(child => {
                            const childActive = isSubItemActive(child, pathname)
                            const childHoverKey = `child-${child.href}`
                            const childHovered = hoveredItem === childHoverKey
                            const badgeCount = child.badge ? badgeCounts[child.badge] : 0

                            return (
                              <Link
                                key={child.href + (child.label)}
                                href={child.href}
                                target={child.newTab ? '_blank' : undefined}
                                rel={child.newTab ? 'noopener noreferrer' : undefined}
                                style={{ textDecoration: 'none' }}
                              >
                                <div
                                  className={`main-sidebar-subrow${childActive ? ' is-active' : ''}${childHovered ? ' is-hovered' : ''}`}
                                  onMouseEnter={() => setHoveredItem(childHoverKey)}
                                  onMouseLeave={() => setHoveredItem(null)}
                                  style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 8,
                                    padding: '6px 10px 6px 12px',
                                    margin: '0 0 1px',
                                    borderRadius: 0,
                                    background: childActive
                                      ? sidebarColors.surface
                                      : childHovered
                                      ? sidebarColors.surfaceHover
                                      : 'transparent',
                                    boxShadow: 'none',
                                    color: childActive || childHovered ? sidebarColors.text : sidebarColors.muted,
                                    fontWeight: childActive ? 500 : 400,
                                    fontSize: 14,
                                    fontFamily: font,
                                    cursor: 'pointer',
                                    transition: 'background 150ms ease, color 150ms ease',
                                    whiteSpace: 'nowrap',
                                  }}
                                >
                                  <span style={{ flex: 1 }}>{child.label}</span>
                                  {badgeCount > 0 && <BadgePill count={badgeCount} />}
                                </div>
                              </Link>
                            )
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )
              }

              /* â”€â”€â”€ Direct link row â”€â”€â”€ */
              return (
                <Link
                  key={item.href}
                  href={item.href!}
                  target={item.newTab ? '_blank' : undefined}
                  rel={item.newTab ? 'noopener noreferrer' : undefined}
                  style={{ textDecoration: 'none' }}
                  title={collapsed ? item.label : undefined}
                >
                  <div
                    className={`main-sidebar-row${groupActive ? ' is-active' : ''}${isHovered ? ' is-hovered' : ''}`}
                    onMouseEnter={() => setHoveredItem(hoverKey)}
                    onMouseLeave={() => setHoveredItem(null)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: collapsed ? 'center' : 'flex-start',
                      gap: collapsed ? 0 : 10,
                      padding: collapsed ? '9px 0' : '8px 10px',
                      margin: collapsed ? '0 8px 2px' : '0 8px 2px',
                      cursor: 'pointer',
                      borderRadius: 0,
                      background: groupActive
                        ? sidebarColors.surface
                        : isHovered
                        ? sidebarColors.surfaceHover
                        : 'transparent',
                      boxShadow: 'none',
                      color: groupActive || isHovered ? sidebarColors.text : sidebarColors.muted,
                      fontWeight: groupActive ? 600 : 500,
                      fontSize: 14,
                      fontFamily: font,
                      transition: 'background 150ms ease, color 150ms ease',
                    }}
                  >
                    <span
                      style={{
                        width: 18,
                        display: 'inline-flex',
                        justifyContent: 'center',
                        flexShrink: 0,
                        color: groupActive || isHovered ? sidebarColors.text : sidebarColors.icon,
                      }}
                    >
                      <Icon size={16} />
                    </span>
                    {!collapsed && (
                      <span style={{ whiteSpace: 'nowrap' }}>{item.label}</span>
                    )}
                  </div>
                </Link>
              )
            })}

            {/* Section divider */}
            {!collapsed && sectionIndex < navSections.length - 1 && (
              <div
                style={{
                  height: 1,
                  background: sidebarColors.border,
                  margin: '10px 16px 0',
                }}
              />
            )}
          </div>
        ))}
      </div>
    </aside>
  )
}
