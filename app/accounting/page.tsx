'use client'

import Link from 'next/link'
import {
  ArrowDownLeft,
  ArrowUpRight,
  Banknote,
  Building2,
  FileText,
  Landmark,
  MoreHorizontal,
  PieChart,
  ReceiptText,
  WalletCards,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

const font = 'var(--font-body)'

const metrics = [
  { title: 'Total Cash Balance', value: '$48,250.75', delta: '12.5% vs last month', up: true, icon: WalletCards, tone: '#16a34a' },
  { title: 'Total Income', value: '$125,430.00', delta: '18.6% vs last month', up: true, icon: ArrowUpRight, tone: '#2563eb' },
  { title: 'Total Expenses', value: '$77,180.50', delta: '6.4% vs last month', up: false, icon: ArrowDownLeft, tone: '#ef4444' },
  { title: 'Net Profit', value: '$48,249.50', delta: '26.3% vs last month', up: true, icon: Banknote, tone: '#7c3aed' },
  { title: 'Outstanding Receivables', value: '$32,650.00', delta: '12 invoices', icon: FileText, tone: '#f59e0b' },
  { title: 'Outstanding Payables', value: '$18,540.00', delta: '8 bills', icon: ReceiptText, tone: '#f59e0b' },
]

const transactions = [
  ['May 31, 2024', 'Invoice #INV-1007', 'Acme Corporation', 'Consulting Income', 'Income', '$7,500.00', 'Paid'],
  ['May 30, 2024', 'Office Rent - May 2024', 'Green Tower, New York', 'Rent & Utilities', 'Expense', '$3,200.00', 'Paid'],
  ['May 30, 2024', 'Salaries - May 2024', 'Monthly Payroll', 'Salaries & Wages', 'Expense', '$25,000.00', 'Paid'],
  ['May 29, 2024', 'Invoice #INV-1006', 'Globex Corporation', 'Consulting Income', 'Income', '$12,000.00', 'Paid'],
  ['May 28, 2024', 'Adobe Creative Cloud', 'Subscription - May 2024', 'Software & Subscriptions', 'Expense', '$239.88', 'Paid'],
  ['May 27, 2024', 'Transfer to Savings', 'Internal Transfer', 'Transfer', 'Transfer', '$3,000.00', 'Completed'],
]

const banks = [
  ['Chase Business Checking', '•••• 1234', '$28,350.20', '#2563eb'],
  ['Wells Fargo Business', '•••• 5678', '$14,250.55', '#dc2626'],
  ['PayPal Business', '•••• 9012', '$5,650.00', '#0ea5e9'],
]

const expenseSegments = [
  ['Salaries & Wages', '40.2%', '#2563eb'],
  ['Rent & Utilities', '18.7%', '#4f46e5'],
  ['Software & Subscriptions', '12.4%', '#14b8a6'],
  ['Marketing & Sales', '9.3%', '#f59e0b'],
  ['Travel & Meals', '7.6%', '#fb923c'],
  ['Other Expenses', '11.8%', '#9ca3af'],
]

const quickActions: Array<{ title: string; body: string; icon: LucideIcon; href: string }> = [
  { title: 'Create Invoice', body: 'Bill your clients', icon: FileText, href: '/accounting/invoices' },
  { title: 'Record Expense', body: 'Add new expense', icon: WalletCards, href: '/accounting/expenses' },
  { title: 'Create Bill', body: 'Add vendor bill', icon: ReceiptText, href: '/accounting/bills' },
  { title: 'Bank Reconciliation', body: 'Reconcile accounts', icon: Landmark, href: '/accounting/banking' },
  { title: 'Chart of Accounts', body: 'Manage accounts', icon: PieChart, href: '/accounting/accounting' },
  { title: 'Financial Reports', body: 'View reports', icon: FileText, href: '/accounting/reports' },
]

export default function AccountingOverviewPage() {
  return (
    <div style={{ padding: '28px 28px 42px', fontFamily: font }}>
      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(6, minmax(150px, 1fr))', gap: 14, marginBottom: 16 }}>
        {metrics.map(metric => {
          const Icon = metric.icon
          return (
            <div key={metric.title} style={cardStyle}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ width: 44, height: 44, borderRadius: 8, background: `${metric.tone}12`, color: metric.tone, display: 'grid', placeItems: 'center' }}><Icon size={21} /></span>
                <div style={{ minWidth: 0 }}>
                  <div style={eyebrowStyle}>{metric.title}</div>
                  <div style={{ marginTop: 8, fontSize: 22, fontWeight: 950, color: '#111827', whiteSpace: 'nowrap' }}>{metric.value}</div>
                  <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 5, color: metric.up === false ? '#ef4444' : '#16a34a', fontSize: 11.5, fontWeight: 850 }}>
                    {metric.up === false ? <ArrowDownLeft size={13} /> : metric.up ? <ArrowUpRight size={13} /> : null}
                    {metric.delta}
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </section>

      <section style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.25fr) minmax(360px, .75fr) 380px', gap: 16 }}>
        <Panel title="Cash Flow Overview" action="This Month">
          <div style={{ height: 248, display: 'grid', gridTemplateRows: 'auto 1fr', gap: 16 }}>
            <div style={{ display: 'flex', gap: 18, color: '#475569', fontSize: 12, fontWeight: 800 }}>
              <Legend color="#16a34a" label="Cash Inflow" />
              <Legend color="#ef4444" label="Cash Outflow" />
              <Legend color="#2563eb" label="Net Cash Flow" />
            </div>
            <div style={{ position: 'relative', borderBottom: '1px solid #e5e7eb', borderLeft: '1px solid #e5e7eb', overflow: 'hidden' }}>
              {[0, 1, 2, 3].map(row => <span key={row} style={{ position: 'absolute', left: 0, right: 0, top: `${row * 25}%`, borderTop: '1px solid #eef2f7' }} />)}
              <svg viewBox="0 0 700 210" preserveAspectRatio="none" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
                <polyline points="0,148 70,100 140,78 210,90 280,70 350,42 420,62 490,78 560,48 630,56 700,38" fill="none" stroke="#16a34a" strokeWidth="3" />
                <polyline points="0,172 70,142 140,126 210,120 280,112 350,98 420,130 490,112 560,88 630,80 700,96" fill="none" stroke="#ef4444" strokeWidth="3" />
                <polyline points="0,196 70,170 140,148 210,148 280,138 350,118 420,146 490,130 560,104 630,114 700,96" fill="none" stroke="#2563eb" strokeWidth="3" />
              </svg>
            </div>
          </div>
        </Panel>

        <Panel title="Expense Breakdown" action="This Month">
          <div style={{ display: 'grid', gridTemplateColumns: '170px 1fr', gap: 18, alignItems: 'center', minHeight: 248 }}>
            <div style={{ width: 156, height: 156, borderRadius: '50%', background: 'conic-gradient(#2563eb 0 40%, #4f46e5 40% 59%, #14b8a6 59% 71%, #f59e0b 71% 80%, #fb923c 80% 88%, #9ca3af 88% 100%)', display: 'grid', placeItems: 'center' }}>
              <div style={{ width: 92, height: 92, borderRadius: '50%', background: '#fff', display: 'grid', placeItems: 'center', textAlign: 'center' }}>
                <strong style={{ fontSize: 18 }}>$77,180.50</strong>
                <span style={{ fontSize: 11, color: '#64748b', fontWeight: 800 }}>Total Expenses</span>
              </div>
            </div>
            <div style={{ display: 'grid', gap: 12 }}>
              {expenseSegments.map(([label, value, color]) => <Legend key={label} color={color} label={label} value={value} />)}
            </div>
          </div>
        </Panel>

        <div style={{ display: 'grid', gap: 16 }}>
          <Panel title="Bank Accounts" link="/accounting/banking">
            <div style={{ display: 'grid' }}>
              {banks.map(bank => (
                <div key={bank[0]} style={{ display: 'grid', gridTemplateColumns: '42px 1fr auto', gap: 12, alignItems: 'center', padding: '14px 0', borderBottom: '1px solid #eef2f7' }}>
                  <span style={{ width: 38, height: 38, borderRadius: 8, background: bank[3], color: '#fff', display: 'grid', placeItems: 'center' }}><Building2 size={18} /></span>
                  <span>
                    <strong style={{ display: 'block', fontSize: 13.5 }}>{bank[0]}</strong>
                    <small style={{ color: '#64748b', fontWeight: 800 }}>{bank[1]}</small>
                  </span>
                  <strong style={{ fontSize: 13.5 }}>{bank[2]}</strong>
                </div>
              ))}
              <Link href="/accounting/banking" style={{ textDecoration: 'none', color: '#2563eb', fontWeight: 900, fontSize: 13, textAlign: 'center', padding: '14px 0 0' }}>+ Add Bank Account</Link>
            </div>
          </Panel>
          <Panel title="Overdue Invoices" link="/accounting/invoices">
            <MiniRows rows={[['Beta LLC', 'INV-1001', '$4,250.00'], ['John Smith', 'INV-1002', '$2,600.00'], ['Delta Co.', 'INV-1003', '$3,750.00']]} total="$10,600.00" />
          </Panel>
          <Panel title="Bills to Pay" link="/accounting/bills">
            <MiniRows rows={[['AWS', 'BILL-2001', '$1,250.00'], ['Office Supplies Co.', 'BILL-2002', '$320.00'], ['Internet Provider', 'BILL-2003', '$120.00']]} total="$1,690.00" />
          </Panel>
        </div>
      </section>

      <section style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 380px', gap: 16, marginTop: 16 }}>
        <Panel title="Recent Transactions" link="/accounting/transactions">
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {['Date', 'Description', 'Category', 'Type', 'Amount', 'Status', ''].map(header => <th key={header} style={thStyle}>{header}</th>)}
              </tr>
            </thead>
            <tbody>
              {transactions.map(row => (
                <tr key={`${row[0]}-${row[1]}`} style={{ borderTop: '1px solid #eef2f7' }}>
                  <td style={tdMutedStyle}>{row[0]}</td>
                  <td style={tdStyle}><strong>{row[1]}</strong><small style={{ display: 'block', color: '#64748b', marginTop: 3 }}>{row[2]}</small></td>
                  <td style={tdStyle}><span style={pillStyle}>{row[3]}</span></td>
                  <td style={{ ...tdStyle, color: row[4] === 'Expense' ? '#ef4444' : row[4] === 'Income' ? '#16a34a' : '#2563eb', fontWeight: 900 }}>{row[4]}</td>
                  <td style={{ ...tdStyle, color: row[4] === 'Expense' ? '#ef4444' : '#111827', fontWeight: 950 }}>{row[5]}</td>
                  <td style={tdStyle}><span style={{ ...pillStyle, background: row[6] === 'Paid' ? '#dcfce7' : '#dbeafe', color: row[6] === 'Paid' ? '#15803d' : '#2563eb' }}>{row[6]}</span></td>
                  <td style={tdStyle}><button type="button" aria-label={`Actions for ${row[1]}`} style={moreButtonStyle}><MoreHorizontal size={16} /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>

        <Panel title="Quick Actions">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {quickActions.map(({ title, body, icon: Icon, href }) => (
              <Link key={title} href={href} style={{ minHeight: 76, border: '1px solid #eef2f7', borderRadius: 8, textDecoration: 'none', color: '#111827', display: 'flex', alignItems: 'center', gap: 12, padding: 12 }}>
                <span style={{ width: 36, height: 36, borderRadius: 8, background: '#ecfdf3', color: '#16a34a', display: 'grid', placeItems: 'center' }}><Icon size={17} /></span>
                <span><strong style={{ display: 'block', fontSize: 13 }}>{title}</strong><small style={{ display: 'block', color: '#64748b', marginTop: 3 }}>{body}</small></span>
              </Link>
            ))}
          </div>
        </Panel>
      </section>
    </div>
  )
}

function Panel({ title, children, action, link }: { title: string; children: React.ReactNode; action?: string; link?: string }) {
  return (
    <section style={cardStyle}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 14 }}>
        <h2 style={{ margin: 0, fontSize: 15, fontWeight: 950, color: '#111827' }}>{title}</h2>
        {link ? <Link href={link} style={{ color: '#2563eb', textDecoration: 'none', fontSize: 12, fontWeight: 900 }}>View All</Link> : action ? <button type="button" style={smallButtonStyle}>{action}</button> : null}
      </div>
      {children}
    </section>
  )
}

function Legend({ color, label, value }: { color: string; label: string; value?: string }) {
  return <span style={{ display: 'flex', alignItems: 'center', gap: 9, minWidth: 0 }}><span style={{ width: 8, height: 8, borderRadius: 999, background: color }} /><span style={{ flex: 1, fontSize: 12, fontWeight: 800, color: '#334155' }}>{label}</span>{value && <strong style={{ fontSize: 12 }}>{value}</strong>}</span>
}

function MiniRows({ rows, total }: { rows: string[][]; total: string }) {
  return (
    <div style={{ display: 'grid', gap: 12 }}>
      {rows.map(row => <div key={row[1]} style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: 12, fontSize: 12.5 }}><span>{row[0]}</span><span style={{ color: '#64748b', fontWeight: 800 }}>{row[1]}</span><strong style={{ color: '#ef4444' }}>{row[2]}</strong></div>)}
      <div style={{ borderTop: '1px solid #eef2f7', paddingTop: 12, display: 'flex', justifyContent: 'space-between', fontSize: 12.5 }}><strong>Total</strong><strong style={{ color: '#ef4444' }}>{total}</strong></div>
    </div>
  )
}

const cardStyle: React.CSSProperties = { background: '#fff', border: '1px solid #e8edf4', borderRadius: 8, padding: 18, boxShadow: '0 1px 2px rgba(15,23,42,0.03)' }
const eyebrowStyle: React.CSSProperties = { fontSize: 12, fontWeight: 850, color: '#475569' }
const smallButtonStyle: React.CSSProperties = { border: '1px solid #e8edf4', background: '#fff', borderRadius: 6, minHeight: 30, padding: '0 10px', color: '#334155', fontSize: 12, fontWeight: 850 }
const thStyle: React.CSSProperties = { textAlign: 'left', padding: '10px 12px', color: '#64748b', fontSize: 11, textTransform: 'uppercase', fontWeight: 900 }
const tdStyle: React.CSSProperties = { padding: '12px', fontSize: 12.5, color: '#111827', verticalAlign: 'middle' }
const tdMutedStyle: React.CSSProperties = { ...tdStyle, color: '#64748b', fontWeight: 750 }
const pillStyle: React.CSSProperties = { display: 'inline-flex', alignItems: 'center', minHeight: 22, borderRadius: 6, background: '#eef2ff', color: '#4f46e5', padding: '0 8px', fontSize: 11.5, fontWeight: 850 }
const moreButtonStyle: React.CSSProperties = { width: 32, height: 30, borderRadius: 7, border: '1px solid #eef2f7', background: '#fff', color: '#475569', display: 'grid', placeItems: 'center', cursor: 'pointer' }
