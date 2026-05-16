'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  ArrowLeft,
  Bell,
  ChevronDown,
  CircleHelp,
  FileText,
  Grid3X3,
  Menu,
  Plus,
  ReceiptText,
  Search,
  ShoppingCart,
  Truck,
} from 'lucide-react'

const font = "var(--font-body)"

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

const procurementNavItems = [
  { label: 'Overview', href: '/procurement', icon: ShoppingCart, description: 'Purchasing snapshot and activity' },
  { label: 'Pricebook', href: '/procurement/pricebook', icon: ReceiptText, description: 'Items, catalog, and pricing' },
  { label: 'Purchase Requests', href: '/procurement/purchase-requests', icon: FileText, description: 'Requests waiting for review' },
  { label: 'Purchase Orders', href: '/procurement/purchase-orders', icon: FileText, description: 'Orders and supplier commitments' },
  { label: 'RFQs', href: '/procurement/rfqs', icon: ReceiptText, description: 'Quotations and supplier bids' },
  { label: 'Receiving', href: '/procurement/receiving', icon: Truck, description: 'Deliveries and received items' },
]

export default function ProcurementShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const activeMeta = procurementNavItems.find(item => pathname === item.href || pathname.startsWith(item.href + '/')) || procurementNavItems[0]
  const ActiveIcon = activeMeta.icon

  const isActive = (href: string) => {
    if (pathname === href) return true
    return pathname.startsWith(href + '/')
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', display: 'grid', gridTemplateColumns: '252px minmax(0, 1fr)', fontFamily: font, color: '#0f172a' }}>
      <style>{procurementShellCss}</style>
      <aside className="procurement-sidepanel" style={{ minHeight: '100vh', height: '100vh', position: 'sticky', top: 0, alignSelf: 'start', background: sidebarColors.bg, color: sidebarColors.text, padding: '20px 0', display: 'flex', flexDirection: 'column', overflowY: 'auto', overflowX: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: sidebarColors.text, padding: '0 14px 24px' }}>
          <span style={{ width: 34, height: 34, borderRadius: 9, background: sidebarColors.text, color: sidebarColors.bg, display: 'grid', placeItems: 'center', fontWeight: 800, fontSize: 16 }}>P</span>
          <span>
            <span style={{ display: 'block', fontSize: 17, fontWeight: 800, lineHeight: 1, color: sidebarColors.text, letterSpacing: 0 }}>Procurement</span>
            <span style={{ display: 'block', fontSize: 12, color: sidebarColors.muted, marginTop: 4, fontWeight: 500 }}>Supply workspace</span>
          </span>
        </div>

        <Link href="/dashboard" className="procurement-back-link">
          <ArrowLeft size={15} />
          Back to WiseFlow
        </Link>

        <nav style={{ display: 'grid', gap: 3, alignContent: 'start', flex: 1, overflowY: 'auto' }} aria-label="Procurement workspace navigation">
          <div style={{ display: 'grid', gap: 3, alignContent: 'start' }}>
            <div style={{ fontSize: 10, letterSpacing: '1px', color: sidebarColors.faint, fontWeight: 600, padding: '0 22px 5px', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>Workspace</div>
            {procurementNavItems.map(item => {
              const Icon = item.icon
              const active = isActive(item.href)
              return (
                <Link key={item.href} href={item.href} style={{ textDecoration: 'none' }}>
                  <div className={`procurement-nav-row${active ? ' active' : ''}`}>
                    <span style={{ width: 18, display: 'inline-flex', justifyContent: 'center', flexShrink: 0 }}>
                      <Icon size={16} />
                    </span>
                    <span style={{ flex: 1 }}>{item.label}</span>
                  </div>
                </Link>
              )
            })}
          </div>
        </nav>
      </aside>

      <div style={{ minWidth: 0 }}>
        <header style={{ height: 74, position: 'sticky', top: 0, zIndex: 30, background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(16px)', borderBottom: '1px solid #e5e7eb', display: 'grid', gridTemplateColumns: 'auto minmax(280px, 560px) auto', alignItems: 'center', gap: 18, padding: '0 28px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
            <button aria-label="Menu" style={iconButtonStyle}><Menu size={19} /></button>
            <span style={{ width: 36, height: 36, borderRadius: 999, background: '#dcfce7', color: '#16a34a', display: 'grid', placeItems: 'center', flexShrink: 0 }}><ActiveIcon size={18} /></span>
            <span style={{ minWidth: 0 }}>
              <span style={{ display: 'block', fontSize: 15, fontWeight: 900, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{activeMeta.label}</span>
              <span style={{ display: 'block', fontSize: 12, color: '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{activeMeta.description}</span>
            </span>
          </div>
          <label style={{ height: 40, borderRadius: 999, background: '#f1f5f9', display: 'flex', alignItems: 'center', gap: 10, padding: '0 16px', border: '1px solid #eef2f7' }}>
            <Search size={17} color="#64748b" />
            <input placeholder="Search anything (Ctrl K)" style={{ flex: 1, border: 0, outline: 0, background: 'transparent', fontSize: 13, color: '#0f172a' }} />
          </label>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 12 }}>
            <button aria-label="Create" style={roundButtonStyle}><Plus size={18} /></button>
            <button aria-label="Notifications" style={{ ...roundButtonStyle, position: 'relative' }}>
              <Bell size={18} />
              <span style={{ position: 'absolute', top: 8, right: 8, width: 8, height: 8, borderRadius: 99, background: '#22c55e', border: '2px solid #fff' }} />
            </button>
            <button aria-label="Help" style={roundButtonStyle}><CircleHelp size={18} /></button>
            <button aria-label="Apps" style={roundButtonStyle}><Grid3X3 size={18} /></button>
            <button style={{ border: 0, background: 'transparent', display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', padding: 0 }}>
              <span style={{ width: 36, height: 36, borderRadius: 999, background: '#f3e8ff', color: '#7c3aed', display: 'grid', placeItems: 'center', fontSize: 13, fontWeight: 800 }}>JU</span>
              <ChevronDown size={14} color="#64748b" />
            </button>
          </div>
        </header>
        <main>{children}</main>
      </div>
    </div>
  )
}

const iconButtonStyle: React.CSSProperties = {
  width: 38,
  height: 38,
  borderRadius: 10,
  border: '1px solid transparent',
  background: 'transparent',
  color: '#334155',
  display: 'grid',
  placeItems: 'center',
  cursor: 'pointer',
}

const roundButtonStyle: React.CSSProperties = {
  width: 38,
  height: 38,
  borderRadius: 999,
  border: '1px solid #eef2f7',
  background: '#fff',
  color: '#0f172a',
  display: 'grid',
  placeItems: 'center',
  cursor: 'pointer',
}

const procurementShellCss = `
.procurement-sidepanel {
  background: #000000 !important;
  color: rgb(237, 237, 237) !important;
  border-right: 1px solid #242424;
}
.procurement-sidepanel * {
  border-color: #242424;
}
.procurement-sidepanel a {
  color: inherit;
}
.procurement-back-link {
  min-height: 36px;
  margin: 0 8px 14px;
  padding: 0 10px;
  display: flex;
  align-items: center;
  gap: 10px;
  border: 0;
  border-radius: 0;
  background: transparent;
  color: ${sidebarColors.muted};
  font-size: 14px;
  font-weight: 500;
  line-height: 20px;
  text-decoration: none;
  transition: background 150ms ease, color 150ms ease, box-shadow 150ms ease;
}
.procurement-back-link svg {
  color: ${sidebarColors.icon};
  transition: color 150ms ease;
}
.procurement-back-link:hover {
  background: ${sidebarColors.surfaceHover};
  color: ${sidebarColors.text};
}
.procurement-back-link:hover svg {
  color: ${sidebarColors.text};
}
.procurement-nav-row {
  min-height: 36px;
  margin: 0 8px 2px;
  padding: 8px 10px;
  display: flex;
  align-items: center;
  gap: 10px;
  border-radius: 0;
  background: transparent;
  color: ${sidebarColors.muted};
  font-size: 14px;
  font-weight: 500;
  line-height: 20px;
  transition: background 150ms ease, color 150ms ease, box-shadow 150ms ease;
}
.procurement-nav-row svg {
  color: ${sidebarColors.icon};
  transition: color 150ms ease;
}
.procurement-nav-row:hover {
  background: ${sidebarColors.surfaceHover};
  color: ${sidebarColors.text};
}
.procurement-nav-row:hover svg {
  color: ${sidebarColors.text};
}
.procurement-nav-row.active {
  background: ${sidebarColors.surface};
  color: ${sidebarColors.text};
  box-shadow: none;
  font-weight: 600;
}
.procurement-nav-row.active svg {
  color: ${sidebarColors.text};
}
@media (max-width: 900px) {
  .procurement-sidepanel {
    position: relative !important;
    height: auto !important;
    min-height: auto !important;
  }
}
`
