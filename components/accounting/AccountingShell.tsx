'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  ArrowLeft,
  BadgeDollarSign,
  Banknote,
  Bell,
  BookOpenCheck,
  CalendarDays,
  ChevronDown,
  ClipboardList,
  FileBarChart,
  FileClock,
  FileText,
  Landmark,
  LayoutDashboard,
  Menu,
  PieChart,
  Plus,
  ReceiptText,
  Search,
  ShieldCheck,
  WalletCards,
} from 'lucide-react'

const font = 'var(--font-body)'

export const accountingNavItems = [
  { label: 'Overview', href: '/accounting', icon: LayoutDashboard, description: 'Cash, profit, receivables, and payables' },
  { label: 'Accounting', href: '/accounting/accounting', icon: BookOpenCheck, description: 'Journal entries and chart activity' },
  { label: 'Invoices', href: '/accounting/invoices', icon: FileText, description: 'Client invoices and collections' },
  { label: 'Bills', href: '/accounting/bills', icon: ReceiptText, description: 'Vendor bills and payables' },
  { label: 'Expenses', href: '/accounting/expenses', icon: WalletCards, description: 'Expense capture and approvals' },
  { label: 'Banking', href: '/accounting/banking', icon: Landmark, description: 'Bank accounts and reconciliation' },
  { label: 'Transactions', href: '/accounting/transactions', icon: Banknote, description: 'Income, expense, and transfer ledger' },
  { label: 'Budgeting', href: '/accounting/budgeting', icon: PieChart, description: 'Budgets, forecasts, and variance' },
  { label: 'Payroll Finance', href: '/accounting/payroll-finance', icon: BadgeDollarSign, description: 'Payroll accruals and disbursements' },
  { label: 'Tax & Compliance', href: '/accounting/tax-compliance', icon: ShieldCheck, description: 'Tax calendars and filings' },
  { label: 'Reports', href: '/accounting/reports', icon: FileBarChart, description: 'Financial statements and analytics' },
  { label: 'Audit Logs', href: '/accounting/audit-logs', icon: FileClock, description: 'Controls and accounting history' },
]

export function getAccountingRouteMeta(pathname: string) {
  return accountingNavItems.find(item => pathname === item.href || pathname.startsWith(item.href + '/')) || accountingNavItems[0]
}

export default function AccountingShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const activeMeta = getAccountingRouteMeta(pathname)
  const ActiveIcon = activeMeta.icon

  return (
    <div style={{ minHeight: '100vh', background: '#f7f9fc', display: 'grid', gridTemplateColumns: '250px minmax(0, 1fr)', fontFamily: font, color: '#111827' }}>
      <aside style={{ minHeight: '100vh', position: 'sticky', top: 0, alignSelf: 'start', background: 'linear-gradient(180deg, #061321 0%, #07111f 100%)', color: '#fff', padding: '18px 14px', display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '0 6px 4px' }}>
          <span style={{ width: 36, height: 36, borderRadius: 10, background: '#22c55e', color: '#052e16', display: 'grid', placeItems: 'center', fontWeight: 950, fontSize: 16 }}>W</span>
          <span>
            <span style={{ display: 'block', fontSize: 18, fontWeight: 900, lineHeight: 1 }}>Accounting</span>
            <span style={{ display: 'block', fontSize: 11, color: '#8ea3bb', marginTop: 3 }}>Finance workspace</span>
          </span>
        </div>

        <Link href="/dashboard" style={backLinkStyle}>
          <ArrowLeft size={15} />
          Back to WiseFlow
        </Link>

        <nav style={{ display: 'grid', gap: 4, alignContent: 'start', flex: 1, overflowY: 'auto', paddingRight: 2 }} aria-label="Accounting workspace navigation">
          <div style={{ fontSize: 10, color: '#8ea3bb', fontWeight: 800, padding: '0 6px 5px', textTransform: 'uppercase' }}>Workspace</div>
          {accountingNavItems.map(item => {
            const Icon = item.icon
            const active = pathname === item.href || pathname.startsWith(item.href + '/')
            return (
              <Link key={item.href} href={item.href} style={{ textDecoration: 'none' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, minHeight: 35, padding: '7px 10px', borderRadius: 8, background: active ? 'rgba(34,197,94,0.16)' : 'transparent', color: active ? '#fff' : '#cbd5e1', boxShadow: active ? 'inset 3px 0 0 #22c55e' : 'none', fontSize: 12.5, fontWeight: active ? 850 : 650 }}>
                  <Icon size={15} color={active ? '#22c55e' : '#cbd5e1'} />
                  <span style={{ flex: 1 }}>{item.label}</span>
                </div>
              </Link>
            )
          })}
        </nav>
      </aside>

      <div style={{ minWidth: 0 }}>
        <header style={{ height: 76, position: 'sticky', top: 0, zIndex: 30, background: 'rgba(255,255,255,0.94)', backdropFilter: 'blur(16px)', borderBottom: '1px solid #e8edf4', display: 'grid', gridTemplateColumns: 'auto minmax(280px, 520px) auto', alignItems: 'center', gap: 18, padding: '0 28px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
            <button type="button" aria-label="Menu" style={iconButtonStyle}><Menu size={19} /></button>
            <span style={{ width: 38, height: 38, borderRadius: 11, background: '#ecfdf3', color: '#16a34a', display: 'grid', placeItems: 'center', flexShrink: 0 }}><ActiveIcon size={19} /></span>
            <span style={{ minWidth: 0 }}>
              <span style={{ display: 'block', fontSize: 15, fontWeight: 900, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{activeMeta.label}</span>
              <span style={{ display: 'block', fontSize: 12, color: '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{activeMeta.description}</span>
            </span>
          </div>
          <label style={{ height: 40, borderRadius: 8, background: '#fff', display: 'flex', alignItems: 'center', gap: 10, padding: '0 14px', border: '1px solid #e8edf4', boxShadow: '0 1px 2px rgba(15,23,42,0.03)' }}>
            <Search size={16} color="#64748b" />
            <input placeholder="Search transactions, invoices, bills..." style={{ flex: 1, border: 0, outline: 0, background: 'transparent', fontSize: 13, color: '#0f172a' }} />
          </label>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 10 }}>
            <button type="button" style={dateButtonStyle}><CalendarDays size={15} /> May 1 - May 31, 2024</button>
            <button type="button" aria-label="Notifications" style={{ ...roundButtonStyle, position: 'relative' }}>
              <Bell size={18} />
              <span style={{ position: 'absolute', top: 6, right: 6, minWidth: 16, height: 16, borderRadius: 999, background: '#ef4444', color: '#fff', fontSize: 10, fontWeight: 900, display: 'grid', placeItems: 'center', border: '2px solid #fff' }}>3</span>
            </button>
            <button type="button" style={primaryButtonStyle}><Plus size={16} /> New <ChevronDown size={13} /></button>
          </div>
        </header>
        <main>{children}</main>
      </div>
    </div>
  )
}

const backLinkStyle: React.CSSProperties = {
  minHeight: 38,
  border: '1px solid rgba(255,255,255,0.12)',
  background: 'rgba(255,255,255,0.04)',
  color: '#e2e8f0',
  borderRadius: 10,
  padding: '0 12px',
  display: 'flex',
  alignItems: 'center',
  gap: 9,
  fontSize: 13,
  fontWeight: 750,
  textDecoration: 'none',
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
  borderRadius: 10,
  border: '1px solid #e8edf4',
  background: '#fff',
  color: '#0f172a',
  display: 'grid',
  placeItems: 'center',
  cursor: 'pointer',
}

const dateButtonStyle: React.CSSProperties = {
  minHeight: 38,
  borderRadius: 8,
  border: '1px solid #e8edf4',
  background: '#fff',
  color: '#0f172a',
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  padding: '0 12px',
  fontSize: 12.5,
  fontWeight: 800,
  cursor: 'pointer',
}

const primaryButtonStyle: React.CSSProperties = {
  minHeight: 38,
  borderRadius: 8,
  border: '1px solid #16a34a',
  background: '#16a34a',
  color: '#fff',
  display: 'flex',
  alignItems: 'center',
  gap: 7,
  padding: '0 13px',
  fontSize: 12.5,
  fontWeight: 900,
  cursor: 'pointer',
}
