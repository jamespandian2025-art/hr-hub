'use client'

import Link from 'next/link'
import { notFound } from 'next/navigation'
import {
  ArrowDownLeft,
  ArrowUpRight,
  Banknote,
  CheckCircle2,
  Download,
  Filter,
  MoreHorizontal,
  Plus,
  Search,
} from 'lucide-react'
import { accountingNavItems } from '@/components/accounting/AccountingShell'

const font = 'var(--font-body)'

const sectionData: Record<string, {
  title: string
  description: string
  primary: string
  stats: [string, string, string][]
  columns: string[]
  rows: string[][]
}> = {
  accounting: {
    title: 'Accounting',
    description: 'Post journal entries, monitor account activity, and keep the books balanced.',
    primary: 'Journal entry',
    stats: [['Posted Debits', '$48,250.75', 'Balanced ledger'], ['Posted Credits', '$48,250.75', '0 difference'], ['Draft Entries', '6', '2 need review']],
    columns: ['Entry No', 'Title', 'Reference', 'Date', 'Debit', 'Credit', 'Status'],
    rows: [
      ['JE-00031', 'Payroll accrual - May', 'PAY-0524', 'May 31, 2024', '$25,000.00', '$25,000.00', 'Posted'],
      ['JE-00030', 'Office rent allocation', 'LEASE-84', 'May 30, 2024', '$3,200.00', '$3,200.00', 'Posted'],
      ['JE-00029', 'Software subscription', 'ADBE-778', 'May 28, 2024', '$239.88', '$239.88', 'Draft'],
    ],
  },
  invoices: {
    title: 'Invoices',
    description: 'Create invoices, track payment status, and follow up on overdue balances.',
    primary: 'Invoice',
    stats: [['Outstanding', '$32,650.00', '12 invoices'], ['Overdue', '$10,600.00', '3 invoices'], ['Collected', '$92,780.00', 'This month']],
    columns: ['Invoice', 'Client', 'Issue Date', 'Due Date', 'Amount', 'Status'],
    rows: [
      ['INV-1007', 'Acme Corporation', 'May 31, 2024', 'Jun 14, 2024', '$7,500.00', 'Paid'],
      ['INV-1006', 'Globex Corporation', 'May 29, 2024', 'Jun 12, 2024', '$12,000.00', 'Paid'],
      ['INV-1003', 'Delta Co.', 'May 10, 2024', 'May 24, 2024', '$3,750.00', 'Overdue'],
    ],
  },
  bills: {
    title: 'Bills',
    description: 'Manage vendor bills, approvals, due dates, and upcoming cash requirements.',
    primary: 'Bill',
    stats: [['Bills to Pay', '$18,540.00', '8 bills'], ['Due This Week', '$1,570.00', '2 vendors'], ['Paid Bills', '$21,400.00', 'This month']],
    columns: ['Bill', 'Vendor', 'Bill Date', 'Due Date', 'Amount', 'Status'],
    rows: [
      ['BILL-2001', 'AWS', 'May 26, 2024', 'Jun 5, 2024', '$1,250.00', 'Open'],
      ['BILL-2002', 'Office Supplies Co.', 'May 25, 2024', 'Jun 7, 2024', '$320.00', 'Open'],
      ['BILL-1998', 'Green Tower', 'May 1, 2024', 'May 5, 2024', '$3,200.00', 'Paid'],
    ],
  },
  expenses: {
    title: 'Expenses',
    description: 'Capture business expenses, categorize spend, and prepare reimbursements.',
    primary: 'Expense',
    stats: [['Total Expenses', '$77,180.50', 'May 2024'], ['Pending Review', '$4,980.00', '7 claims'], ['Policy Flags', '2', 'Needs review']],
    columns: ['Expense', 'Merchant', 'Date', 'Category', 'Amount', 'Status'],
    rows: [
      ['EXP-4109', 'Adobe', 'May 28, 2024', 'Software & Subscriptions', '$239.88', 'Approved'],
      ['EXP-4108', 'Delta Airlines', 'May 26, 2024', 'Travel & Meals', '$640.00', 'Review'],
      ['EXP-4107', 'Office Depot', 'May 24, 2024', 'Office Supplies', '$320.00', 'Approved'],
    ],
  },
  banking: {
    title: 'Banking',
    description: 'Connect accounts, reconcile transactions, and monitor bank balances.',
    primary: 'Bank account',
    stats: [['Cash Balance', '$48,250.75', '3 accounts'], ['Unmatched', '14', 'Transactions'], ['Reconciled', '92%', 'This month']],
    columns: ['Account', 'Bank', 'Last Sync', 'Balance', 'Reconciled', 'Status'],
    rows: [
      ['Checking', 'Chase Business', '2 hrs ago', '$28,350.20', '96%', 'Connected'],
      ['Operating', 'Wells Fargo', '2 hrs ago', '$14,250.55', '91%', 'Connected'],
      ['Payments', 'PayPal Business', '5 hrs ago', '$5,650.00', '83%', 'Connected'],
    ],
  },
  transactions: {
    title: 'Transactions',
    description: 'Review every cash movement across income, expenses, and transfers.',
    primary: 'Transaction',
    stats: [['Transactions', '20', 'This month'], ['Income', '$125,430.00', '18.6% up'], ['Expenses', '$77,180.50', '6.4% down']],
    columns: ['Date', 'Description', 'Category', 'Type', 'Amount', 'Status'],
    rows: [
      ['May 31, 2024', 'Invoice #INV-1007', 'Consulting Income', 'Income', '$7,500.00', 'Paid'],
      ['May 30, 2024', 'Office Rent - May 2024', 'Rent & Utilities', 'Expense', '$3,200.00', 'Paid'],
      ['May 27, 2024', 'Transfer to Savings', 'Transfer', 'Transfer', '$3,000.00', 'Completed'],
    ],
  },
  budgeting: {
    title: 'Budgeting',
    description: 'Plan budgets, compare actuals, and track variance by category.',
    primary: 'Budget',
    stats: [['Budget Used', '64%', 'May forecast'], ['Variance', '$8,420.00', 'Under plan'], ['Forecast Profit', '$51,900.00', 'End of month']],
    columns: ['Budget', 'Owner', 'Planned', 'Actual', 'Variance', 'Status'],
    rows: [
      ['Operations', 'Finance Team', '$42,000.00', '$36,400.00', '$5,600.00', 'On Track'],
      ['Marketing', 'Growth Team', '$12,000.00', '$14,200.00', '-$2,200.00', 'Over'],
      ['Software', 'IT Team', '$8,500.00', '$6,100.00', '$2,400.00', 'On Track'],
    ],
  },
  'payroll-finance': {
    title: 'Payroll Finance',
    description: 'Monitor payroll costs, liabilities, deductions, and payment readiness.',
    primary: 'Payroll run',
    stats: [['Payroll Total', '$25,000.00', 'May 2024'], ['Deductions', '$3,480.00', 'Posted'], ['Ready to Pay', '42', 'Employees']],
    columns: ['Run', 'Period', 'Gross Pay', 'Deductions', 'Net Pay', 'Status'],
    rows: [
      ['PAY-0524', 'May 1 - May 31', '$25,000.00', '$3,480.00', '$21,520.00', 'Approved'],
      ['PAY-0424', 'Apr 1 - Apr 30', '$24,200.00', '$3,310.00', '$20,890.00', 'Paid'],
      ['PAY-0324', 'Mar 1 - Mar 31', '$23,800.00', '$3,120.00', '$20,680.00', 'Paid'],
    ],
  },
  'tax-compliance': {
    title: 'Tax & Compliance',
    description: 'Track tax obligations, filing deadlines, and supporting documents.',
    primary: 'Compliance task',
    stats: [['Upcoming Filings', '4', 'Next 30 days'], ['Tax Accrual', '$9,840.00', 'Estimated'], ['Completed', '18', 'This quarter']],
    columns: ['Obligation', 'Agency', 'Period', 'Due Date', 'Amount', 'Status'],
    rows: [
      ['VAT Filing', 'BIR', 'May 2024', 'Jun 20, 2024', '$4,200.00', 'Preparing'],
      ['Withholding Tax', 'BIR', 'May 2024', 'Jun 10, 2024', '$1,180.00', 'Open'],
      ['Payroll Tax', 'Local', 'May 2024', 'Jun 12, 2024', '$4,460.00', 'Open'],
    ],
  },
  reports: {
    title: 'Reports',
    description: 'Generate financial statements, management packs, and board-ready exports.',
    primary: 'Report',
    stats: [['Net Profit', '$48,249.50', 'May 2024'], ['Gross Margin', '38.5%', 'Current'], ['Reports Ready', '9', 'Templates']],
    columns: ['Report', 'Period', 'Owner', 'Last Run', 'Format', 'Status'],
    rows: [
      ['Profit & Loss', 'May 2024', 'Finance', 'Today', 'PDF/XLSX', 'Ready'],
      ['Balance Sheet', 'May 2024', 'Finance', 'Today', 'PDF/XLSX', 'Ready'],
      ['Cash Flow Statement', 'May 2024', 'Finance', 'Yesterday', 'PDF/XLSX', 'Ready'],
    ],
  },
  'audit-logs': {
    title: 'Audit Logs',
    description: 'Review posting history, permissioned actions, and sensitive account changes.',
    primary: 'Audit export',
    stats: [['Events', '142', 'This month'], ['High Risk', '3', 'Needs review'], ['Resolved', '97%', 'Controls']],
    columns: ['Event', 'User', 'Area', 'Time', 'Reference', 'Status'],
    rows: [
      ['Journal posted', 'Maria Finance', 'Accounting', 'Today 9:21 AM', 'JE-00031', 'Verified'],
      ['Bank connection refreshed', 'John User', 'Banking', 'Today 8:44 AM', 'Chase', 'Verified'],
      ['Invoice edited', 'Maria Finance', 'Invoices', 'Yesterday 4:12 PM', 'INV-1003', 'Review'],
    ],
  },
}

export default function AccountingSectionPage({ params }: { params: { section: string } }) {
  const data = sectionData[params.section]
  const navMeta = accountingNavItems.find(item => item.href.endsWith(`/${params.section}`))
  if (!data || !navMeta) notFound()
  const Icon = navMeta.icon

  return (
    <div style={{ padding: '28px 28px 42px', fontFamily: font }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 18, marginBottom: 22 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <span style={{ width: 42, height: 42, borderRadius: 10, background: '#ecfdf3', color: '#16a34a', display: 'grid', placeItems: 'center' }}><Icon size={21} /></span>
          <div>
            <div style={{ display: 'flex', gap: 8, color: '#64748b', fontSize: 12, fontWeight: 800, marginBottom: 6 }}>
              <Link href="/accounting" style={{ color: '#64748b', textDecoration: 'none' }}>Accounting</Link>
              <span>/</span>
              <span style={{ color: '#0f172a' }}>{data.title}</span>
            </div>
            <h1 style={{ margin: 0, fontSize: 28, lineHeight: 1.12, color: '#0f172a' }}>{data.title}</h1>
            <p style={{ margin: '8px 0 0', color: '#64748b', fontSize: 14 }}>{data.description}</p>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button type="button" style={toolbarButtonStyle}><Download size={15} /> Export</button>
          <button type="button" style={toolbarButtonStyle}><Filter size={15} /> Filters</button>
          <button type="button" style={primaryButtonStyle}><Plus size={15} /> New {data.primary}</button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(180px, 1fr))', gap: 14, marginBottom: 16 }}>
        {data.stats.map((stat, index) => (
          <div key={stat[0]} style={cardStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
              <div>
                <div style={{ color: '#64748b', fontSize: 12, fontWeight: 850 }}>{stat[0]}</div>
                <div style={{ marginTop: 8, color: '#0f172a', fontSize: 25, fontWeight: 950 }}>{stat[1]}</div>
                <div style={{ marginTop: 8, color: index === 2 ? '#2563eb' : '#16a34a', fontSize: 12, fontWeight: 850 }}>{stat[2]}</div>
              </div>
              <span style={{ width: 38, height: 38, borderRadius: 9, background: index === 1 ? '#eff6ff' : '#ecfdf3', color: index === 1 ? '#2563eb' : '#16a34a', display: 'grid', placeItems: 'center' }}>
                {index === 1 ? <ArrowDownLeft size={18} /> : <ArrowUpRight size={18} />}
              </span>
            </div>
          </div>
        ))}
      </div>

      <section style={cardStyle}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 14 }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 16, fontWeight: 950, color: '#0f172a' }}>{data.title} Register</h2>
            <p style={{ margin: '5px 0 0', color: '#64748b', fontSize: 12.5 }}>Live workspace records, not screenshot content.</p>
          </div>
          <label style={{ width: 320, height: 38, borderRadius: 8, background: '#f8fafc', display: 'flex', alignItems: 'center', gap: 10, padding: '0 12px', border: '1px solid #e8edf4' }}>
            <Search size={15} color="#64748b" />
            <input placeholder={`Search ${data.title.toLowerCase()}...`} style={{ flex: 1, border: 0, outline: 0, background: 'transparent', fontSize: 12.5 }} />
          </label>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', minWidth: 820, borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f8fafc' }}>
                {data.columns.map(column => <th key={column} style={thStyle}>{column}</th>)}
                <th style={thStyle}></th>
              </tr>
            </thead>
            <tbody>
              {data.rows.map(row => (
                <tr key={row.join('-')} style={{ borderTop: '1px solid #eef2f7' }}>
                  {row.map((cell, index) => (
                    <td key={`${cell}-${index}`} style={index === row.length - 1 ? tdStatusStyle : index === 0 ? tdStrongStyle : tdStyle}>
                      {index === row.length - 1 ? <StatusPill value={cell} /> : cell}
                    </td>
                  ))}
                  <td style={tdStyle}><button type="button" aria-label={`Actions for ${row[0]}`} style={moreButtonStyle}><MoreHorizontal size={16} /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 16 }}>
        <div style={cardStyle}>
          <h2 style={{ margin: 0, fontSize: 16, fontWeight: 950 }}>Workflow Health</h2>
          <div style={{ display: 'grid', gap: 12, marginTop: 16 }}>
            {['Approvals are current', 'Bank activity synced', 'Reports ready for review'].map(item => (
              <div key={item} style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#334155', fontSize: 13, fontWeight: 850 }}>
                <CheckCircle2 size={16} color="#16a34a" />
                {item}
              </div>
            ))}
          </div>
        </div>
        <div style={cardStyle}>
          <h2 style={{ margin: 0, fontSize: 16, fontWeight: 950 }}>Cash Impact</h2>
          <div style={{ marginTop: 16, height: 120, display: 'flex', alignItems: 'end', gap: 10 }}>
            {[55, 72, 48, 86, 64, 92, 70, 78].map((height, index) => (
              <span key={index} style={{ flex: 1, height: `${height}%`, background: index % 2 ? '#bfdbfe' : '#bbf7d0', borderRadius: '6px 6px 0 0' }} />
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}

function StatusPill({ value }: { value: string }) {
  const warning = ['Overdue', 'Review', 'Over', 'Preparing', 'Open'].includes(value)
  return <span style={{ display: 'inline-flex', minHeight: 24, alignItems: 'center', borderRadius: 999, padding: '0 9px', background: warning ? '#fef2f2' : '#dcfce7', color: warning ? '#dc2626' : '#15803d', fontSize: 11.5, fontWeight: 900 }}>{value}</span>
}

const cardStyle: React.CSSProperties = { background: '#fff', border: '1px solid #e8edf4', borderRadius: 8, padding: 18, boxShadow: '0 1px 2px rgba(15,23,42,0.03)' }
const toolbarButtonStyle: React.CSSProperties = { minHeight: 38, borderRadius: 8, border: '1px solid #e8edf4', background: '#fff', color: '#0f172a', display: 'flex', alignItems: 'center', gap: 8, padding: '0 12px', fontSize: 12.5, fontWeight: 850, cursor: 'pointer' }
const primaryButtonStyle: React.CSSProperties = { ...toolbarButtonStyle, border: '1px solid #16a34a', background: '#16a34a', color: '#fff', fontWeight: 950 }
const thStyle: React.CSSProperties = { textAlign: 'left', padding: '12px 14px', color: '#64748b', fontSize: 11, textTransform: 'uppercase', fontWeight: 900 }
const tdStyle: React.CSSProperties = { padding: '14px', fontSize: 13, color: '#334155', verticalAlign: 'middle' }
const tdStrongStyle: React.CSSProperties = { ...tdStyle, color: '#0f172a', fontWeight: 950 }
const tdStatusStyle: React.CSSProperties = { ...tdStyle, fontWeight: 900 }
const moreButtonStyle: React.CSSProperties = { width: 32, height: 30, borderRadius: 7, border: '1px solid #eef2f7', background: '#fff', color: '#475569', display: 'grid', placeItems: 'center', cursor: 'pointer' }
