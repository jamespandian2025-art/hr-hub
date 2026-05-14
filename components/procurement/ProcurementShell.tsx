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
    <div style={{ minHeight: '100vh', background: '#f8fafc', display: 'grid', gridTemplateColumns: '244px minmax(0, 1fr)', fontFamily: font, color: '#0f172a' }}>
      <aside style={{ minHeight: '100vh', position: 'sticky', top: 0, alignSelf: 'start', background: 'linear-gradient(180deg, #07111f 0%, #0b1725 100%)', color: '#fff', padding: '18px 14px', display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#fff', padding: '0 6px 4px' }}>
          <span style={{ width: 36, height: 36, borderRadius: 999, background: '#22c55e', color: '#052e16', display: 'grid', placeItems: 'center', fontWeight: 900, fontSize: 14 }}>PR</span>
          <span>
            <span style={{ display: 'block', fontSize: 18, fontWeight: 900, lineHeight: 1 }}>Procurement</span>
            <span style={{ display: 'block', fontSize: 11, color: '#94a3b8', marginTop: 3 }}>Supply workspace</span>
          </span>
        </div>

        <Link href="/dashboard" style={{ minHeight: 38, border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.04)', color: '#e2e8f0', borderRadius: 10, padding: '0 12px', display: 'flex', alignItems: 'center', gap: 9, fontSize: 13, fontWeight: 750, textDecoration: 'none' }}>
          <ArrowLeft size={15} />
          Back to WiseFlow
        </Link>

        <nav style={{ display: 'grid', gap: 4, alignContent: 'start', flex: 1, overflowY: 'auto', paddingRight: 2 }}>
          <div style={{ display: 'grid', gap: 4, alignContent: 'start' }}>
            <div style={{ fontSize: 10, letterSpacing: '0.14em', color: '#94a3b8', fontWeight: 800, padding: '0 6px 5px', textTransform: 'uppercase' }}>Workspace</div>
            {procurementNavItems.map(item => {
              const Icon = item.icon
              const active = isActive(item.href)
              return (
                <Link key={item.href} href={item.href} style={{ textDecoration: 'none' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, minHeight: 38, padding: '7px 10px', borderRadius: 8, background: active ? 'rgba(34,197,94,0.18)' : 'transparent', color: active ? '#fff' : '#cbd5e1', boxShadow: active ? 'inset 3px 0 0 #22c55e' : 'none', fontSize: 13, fontWeight: active ? 850 : 650 }}>
                    <Icon size={16} color={active ? '#22c55e' : '#cbd5e1'} />
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
